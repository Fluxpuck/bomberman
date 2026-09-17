// Smoke test for the relay server. Uses Node's built-in WebSocket (Node 22+).
// Run after starting the server: node server/ws-server.js

const WS_URL = "ws://localhost:3001";

/** Wrap a WebSocket with a message queue so no messages are lost. */
function queued(ws) {
  const queue = [];
  const waiters = [];
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data.toString());
    if (waiters.length > 0) {
      waiters.shift().resolve(msg);
    } else {
      queue.push(msg);
    }
  });
  return {
    recv(timeoutMs = 2000) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("recv timeout")), timeoutMs);
        if (queue.length > 0) {
          clearTimeout(timer);
          resolve(queue.shift());
        } else {
          waiters.push({ resolve: (m) => { clearTimeout(timer); resolve(m); } });
        }
      });
    },
  };
}

function send(ws, msg) {
  ws.send(JSON.stringify(msg));
}

async function run() {
  let failures = 0;
  const assert = (cond, msg) => {
    if (cond) {
      console.log("  ✓", msg);
    } else {
      console.error("  ✗", msg);
      failures++;
    }
  };

  // --- Create room ---
  const host = new WebSocket(WS_URL);
  await new Promise((r) => (host.onopen = r));
  const hostQ = queued(host);
  send(host, { t: "create", name: "Alice" });
  const created = await hostQ.recv();
  assert(created.t === "created", "host receives 'created'");
  assert(typeof created.code === "string" && created.code.length === 4, "code is 4 chars");
  assert(created.slot === 0, "host slot is 0");
  const code = created.code;
  console.log("  room code:", code);

  const hostRoom = await hostQ.recv();
  assert(hostRoom.t === "room" && hostRoom.players.length === 1, "host gets room with 1 player");

  // --- Join room ---
  const guest = new WebSocket(WS_URL);
  await new Promise((r) => (guest.onopen = r));
  const guestQ = queued(guest);
  send(guest, { t: "join", code, name: "Bob" });
  const joined = await guestQ.recv();
  assert(joined.t === "joined" && joined.slot === 1, "guest receives 'joined' with slot 1");

  // Both get a room update with 2 players.
  const guestRoom = await guestQ.recv();
  const hostRoom2 = await hostQ.recv();
  assert(guestRoom.t === "room" && guestRoom.players.length === 2, "guest sees 2 players");
  assert(hostRoom2.t === "room" && hostRoom2.players.length === 2, "host sees 2 players");

  // --- Relay: guest -> host (input) ---
  send(guest, { t: "relay", to: "host", payload: { t: "input", up: true } });
  const hostRelay = await hostQ.recv();
  assert(hostRelay.t === "relay" && hostRelay.from === 1 && hostRelay.payload.up === true, "host receives guest input relay");

  // --- Relay: host -> guests (snapshot) ---
  send(host, { t: "relay", to: "guests", payload: { t: "snapshot", characters: [] } });
  const guestRelay = await guestQ.recv();
  assert(guestRelay.t === "relay" && guestRelay.payload.t === "snapshot", "guest receives host snapshot relay");

  // --- Lock room: new joins rejected ---
  send(host, { t: "lock" });
  await new Promise((r) => setTimeout(r, 100));
  const lateJoiner = new WebSocket(WS_URL);
  await new Promise((r) => (lateJoiner.onopen = r));
  const lateQ = queued(lateJoiner);
  send(lateJoiner, { t: "join", code, name: "Carol" });
  const lateJoinResp = await lateQ.recv();
  assert(lateJoinResp.t === "error" && lateJoinResp.message.includes("started"), "locked room rejects new joins");
  lateJoiner.close();

  // --- Host leaves: guests get hostLeft ---
  host.close();
  const guestHostLeft = await guestQ.recv();
  assert(guestHostLeft.t === "hostLeft", "guest receives hostLeft when host disconnects");

  guest.close();

  console.log(failures === 0 ? "\nALL TESTS PASSED" : `\n${failures} TEST(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

run().catch((err) => {
  console.error("Smoke test error:", err);
  process.exit(1);
});
