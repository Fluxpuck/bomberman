import { GameState, GridPosition } from "../../types/game";
import {
  BlastPayload,
  CharacterSnapshot,
  GameOverPayload,
  GamePayload,
  RosterEntry,
  SnapshotPayload,
  StartPayload,
} from "../../types/multiplayer";
import { NET_CONFIG } from "../core/config";
import { setOnBombExplode, setRemoteInput } from "../engine";
import { getCellSnapshots, getLayoutCellTypes } from "../grid";
import { tracker } from "../hooks/tracker";
import { characterManager } from "../player";
import { roomClient } from "./roomClient";

// =========================
// Host networking
// =========================
// The host runs the real game engine and streams authoritative state to
// guests. Guests send input back; the host applies it via setRemoteInput.

let snapshotIntervalId: number | null = null;
let latencyIntervalId: number | null = null;
let blastRelayActive = false;
let latencyPingId = 0;
const pendingLatencyPings = new Map<number, { id: number; sentAt: number }>();
const lastProcessedInputSequence = new Map<string, number>();

/** Map a roster slot number to the character id used by the engine. */
export function slotToPlayerId(slot: number, roster: RosterEntry[]): string | null {
  return roster.find((e) => e.slot === slot)?.id ?? null;
}

/**
 * Compute the per-direction reach of an explosion from its affected cells,
 * so guests can render the blast visual identically to the host. The center
 * cell is always cells[0]; each arm extends outward until the last cell in
 * that direction.
 */
function computeReachFromCells(cells: GridPosition[]): {
  up: number;
  down: number;
  left: number;
  right: number;
} {
  if (cells.length === 0) return { up: 0, down: 0, left: 0, right: 0 };
  const center = cells[0];
  let up = 0,
    down = 0,
    left = 0,
    right = 0;
  for (let i = 1; i < cells.length; i++) {
    const dr = cells[i].row - center.row;
    const dc = cells[i].col - center.col;
    if (dc === 0 && dr < 0) up = Math.max(up, -dr);
    else if (dc === 0 && dr > 0) down = Math.max(down, dr);
    else if (dr === 0 && dc < 0) left = Math.max(left, -dc);
    else if (dr === 0 && dc > 0) right = Math.max(right, dc);
  }
  return { up, down, left, right };
}

/** Build the character snapshots for the current frame. */
function buildCharacterSnapshots(): CharacterSnapshot[] {
  return characterManager.getAll().map((char) => ({
    id: char.id,
    row: char.gridPosition.row,
    col: char.gridPosition.col,
    facing: char.facing,
    lives: char.lives,
    winning: char.winning,
    isImmune: char.isImmune(),
    isWalking: char.isWalking(),
    isHurt: char.isShowingDamageAnimation(),
    hasShield: char.hasShieldActive(),
    isShieldBlock: char.isShowingShieldBlock(),
    isShieldExpiring: char.isShieldExpiring(),
    lastProcessedInputSequence: lastProcessedInputSequence.get(char.id) ?? 0,
  }));
}

/** Build and broadcast a full state snapshot to all guests. */
function broadcastSnapshot() {
  const payload: SnapshotPayload = {
    t: "snapshot",
    characters: buildCharacterSnapshots(),
    stats: tracker.getPlayers().map((p) => p.getStats()),
    cells: getCellSnapshots(),
    timeElapsedMs: tracker.timeElapsedMs,
  };
  roomClient.sendToGuests(payload);
}

/**
 * Begin hosting: relay blast events, broadcast snapshots on an interval, and
 * route incoming guest input to the engine. Must be called after the engine
 * has started and players are initialized.
 */
export function startHosting(roster: RosterEntry[]) {
  // Relay bomb explosions to guests for visuals + sound.
  blastRelayActive = true;
  setOnBombExplode((cells, _playerId) => {
    if (!blastRelayActive) return;
    const blast: BlastPayload = {
      t: "blast",
      cells: cells.map((c) => ({ row: c.row, col: c.col })),
      reach: computeReachFromCells(cells),
    };
    roomClient.sendToGuests(blast);
  });

  lastProcessedInputSequence.clear();
  pendingLatencyPings.clear();

  // Broadcast full state snapshots at a fixed interval.
  snapshotIntervalId = window.setInterval(
    () => broadcastSnapshot(),
    NET_CONFIG.snapshotIntervalMs
  );

  latencyIntervalId = window.setInterval(() => {
    const now = Date.now();
    for (const entry of roster) {
      if (entry.control !== "remote") continue;
      const id = ++latencyPingId;
      pendingLatencyPings.set(entry.slot, { id, sentAt: now });
      roomClient.sendToGuests({
        t: "latencyPing",
        id,
        slot: entry.slot,
      });
    }
  }, NET_CONFIG.latencyPingIntervalMs);
}

/**
 * Send the game-start payload so guests can build an identical grid and
 * create their local character instances.
 */
export function sendStart(roster: RosterEntry[]) {
  const payload: StartPayload = {
    t: "start",
    cellTypes: getLayoutCellTypes(),
    roster,
  };
  roomClient.sendToGuests(payload);
}

/**
 * Send the game-over payload so guests can show the end screen, including
 * the winner's stats when the game produced one.
 */
export function sendGameOver(state: GameState, winnerId?: string) {
  const winnerStats = winnerId
    ? tracker.getPlayer(winnerId)?.getStats()
    : undefined;

  const payload: GameOverPayload = {
    t: "gameOver",
    state: state === GameState.WIN ? "WIN" : "GAME_OVER",
    winner: winnerStats,
    gameStats: tracker.getGameStats(),
  };
  roomClient.sendToGuests(payload);
}

/**
 * Handle a relayed payload arriving from a guest. Only `input` messages are
 * expected from guests; they are routed to the engine via setRemoteInput.
 */
export function handleGuestPayload(fromSlot: number, payload: GamePayload, roster: RosterEntry[]) {
  if (payload.t === "latencyPong") {
    const pending = pendingLatencyPings.get(fromSlot);
    if (!pending || pending.id !== payload.id) return;

    pendingLatencyPings.delete(fromSlot);
    const playerId = slotToPlayerId(fromSlot, roster);
    const player = playerId ? characterManager.get(playerId) : undefined;
    if (player) player.latencyMs = Date.now() - pending.sentAt;
    return;
  }

  if (payload.t !== "input") return;
  const playerId = slotToPlayerId(fromSlot, roster);
  if (!playerId) return;
  lastProcessedInputSequence.set(playerId, payload.sequence);
  setRemoteInput(playerId, payload);
}

/**
 * Stop hosting: clear the snapshot interval and stop relaying blasts.
 */
export function stopHosting() {
  if (snapshotIntervalId !== null) {
    clearInterval(snapshotIntervalId);
    snapshotIntervalId = null;
  }
  if (latencyIntervalId !== null) {
    clearInterval(latencyIntervalId);
    latencyIntervalId = null;
  }
  pendingLatencyPings.clear();
  lastProcessedInputSequence.clear();
  blastRelayActive = false;
  setOnBombExplode(null);
}
