// =========================
// Bomb Blast Arena multiplayer relay server
// =========================
// Game-agnostic WebSocket relay. Knows only about rooms, 4-letter codes,
// up to 4 slots per room, and forwarding messages between host and guests.
// The actual game protocol (start/snapshot/blast/input) lives entirely in
// the browser clients; this server never inspects game payloads.
//
// Run with: yarn ws  (defaults to port 3001, override with WS_PORT env)

const { WebSocketServer } = require("ws");

const WS_PORT = parseInt(process.env.WS_PORT || "3001", 10);
const MAX_PLAYERS_PER_ROOM = 4;
const CODE_LENGTH = 4;
// Alphabet without ambiguous characters (no I, O, 0, 1).
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const HEARTBEAT_INTERVAL_MS = 30000;

// =========================
// Room model
// =========================
/**
 * @typedef {{ slot: number, name: string, ws: import("ws").WebSocket, isHost: boolean }} Player
 * @typedef {{ code: string, players: Player[], locked: boolean }} Room
 */

/** @type {Map<string, Room>} */
const roomsByCode = new Map();
/** @type {Map<import("ws").WebSocket, { room: Room, player: Player}>} */
const sessions = new Map();

// =========================
// Helpers
// =========================
function generateCode() {
  // Retry until we find an unused code. Collision odds are negligible at
  // this scale (26^4 = ~457k codes), but the loop keeps it correct.
  let code;
  do {
    code = "";
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
  } while (roomsByCode.has(code));
  return code;
}

function send(ws, message) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function broadcastRoom(room) {
  const players = room.players.map((p) => ({
    slot: p.slot,
    name: p.name,
    isHost: p.isHost,
  }));
  for (const p of room.players) {
    send(p.ws, { t: "room", code: room.code, players });
  }
}

function findRoomByCode(code) {
  return roomsByCode.get((code || "").toUpperCase());
}

function leaveRoom(session) {
  if (!session) return;
  const { room, player } = session;
  const wasHost = player.isHost;

  // Remove the player from the room.
  room.players = room.players.filter((p) => p !== player);

  // Notify remaining players of the new roster. If the host left, close the
  // room and tell guests to return to the lobby.
  if (wasHost) {
    for (const p of room.players) {
      send(p.ws, { t: "hostLeft" });
      sessions.delete(p.ws);
    }
    roomsByCode.delete(room.code);
  } else if (room.players.length > 0) {
    broadcastRoom(room);
  } else {
    roomsByCode.delete(room.code);
  }
}

// =========================
// Message handlers
// =========================
function handleMessage(session, data) {
  const { room, player } = session;
  let msg;
  try {
    msg = JSON.parse(data.toString());
  } catch {
    return;
  }

  switch (msg.t) {
    case "leave": {
      leaveRoom(session);
      sessions.delete(player.ws);
      break;
    }
    case "lock": {
      if (!player.isHost) return;
      room.locked = true;
      break;
    }
    case "relay": {
      // Forward to a target audience. Only the host may broadcast to guests;
      // guests can only address the host. This keeps the host authoritative.
      if (msg.to === "guests" && player.isHost) {
        for (const p of room.players) {
          if (!p.isHost) send(p.ws, { t: "relay", from: player.slot, payload: msg.payload });
        }
      } else if (msg.to === "host") {
        const host = room.players.find((p) => p.isHost);
        if (host) send(host.ws, { t: "relay", from: player.slot, payload: msg.payload });
      }
      break;
    }
    default:
      break;
  }
}

// =========================
// Connection lifecycle
// =========================
const wss = new WebSocketServer({ port: WS_PORT });

wss.on("connection", (ws) => {
  // First message must be `create` or `join`. Subsequent messages are handled
  // by handleMessage once the session is established.
  let registered = false;

  ws.on("message", (data) => {
    if (!registered) {
      let msg;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        ws.close();
        return;
      }
      registered = true;

      if (msg.t === "create") {
        const code = generateCode();
        /** @type {Room} */
        const room = { code, players: [], locked: false };
        const player = { slot: 0, name: msg.name || "Host", ws, isHost: true };
        room.players.push(player);
        roomsByCode.set(code, room);
        sessions.set(ws, { room, player });
        send(ws, { t: "created", code, slot: 0 });
        broadcastRoom(room);
      } else if (msg.t === "join") {
        const room = findRoomByCode(msg.code);
        if (!room) {
          send(ws, { t: "error", message: "Room not found" });
          ws.close();
          return;
        }
        if (room.locked) {
          send(ws, { t: "error", message: "Game already started" });
          ws.close();
          return;
        }
        if (room.players.length >= MAX_PLAYERS_PER_ROOM) {
          send(ws, { t: "error", message: "Room is full" });
          ws.close();
          return;
        }
        // Assign the smallest free slot. Using players.length would collide
        // after a mid-lobby leave (e.g. slots [0,2] → next join gets 2 again).
        const usedSlots = new Set(room.players.map((p) => p.slot));
        let slot = 0;
        while (usedSlots.has(slot)) slot++;
        const player = { slot, name: msg.name || `Player ${slot + 1}`, ws, isHost: false };
        room.players.push(player);
        sessions.set(ws, { room, player });
        send(ws, { t: "joined", code: room.code, slot });
        broadcastRoom(room);
      } else {
        send(ws, { t: "error", message: "Expected create or join first" });
        ws.close();
      }
      return;
    }

    const session = sessions.get(ws);
    if (!session) return;
    handleMessage(session, data);
  });

  ws.on("close", () => {
    const session = sessions.get(ws);
    if (session) {
      leaveRoom(session);
      sessions.delete(ws);
    }
  });

  ws.on("error", () => {
    // swallow; close handler will clean up
  });
});

// =========================
// Heartbeat: drop dead connections
// =========================
setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.readyState === ws.OPEN) {
      ws.ping();
    }
  }
}, HEARTBEAT_INTERVAL_MS);

console.log(`Bomb Blast Arena relay server listening on ws://localhost:${WS_PORT}`);
