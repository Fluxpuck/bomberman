import {
  Direction,
  DIRECTION_DELTAS,
  GridPosition,
  Position,
} from "../../types/game";
import {
  BlastPayload,
  GameOverPayload,
  GamePayload,
  SnapshotPayload,
  StartPayload
} from "../../types/multiplayer";
import { BlastReach, createBlastVisual } from "../assets/dynamite";
import {
  BOMB_CONFIG,
  GRID_PATTERN,
  NET_CONFIG,
  PLAYER_CONFIG,
  PLAYER_PALETTE
} from "../core/config";
import {
  applyCellSnapshots,
  CORNER_ORDER,
  getCellAt,
  getCornerSpawn,
  grid,
  isWalkable,
  resetGrid
} from "../grid";
import { playSound } from "../hooks/sound";
import { PlayerStats, tracker } from "../hooks/tracker";
import { directionByKey, GAME_KEYS } from "../input";
import { characterManager, Player } from "../player";
import { roomClient } from "./roomClient";

// =========================
// Guest view
// =========================
// Guests don't run the game engine. They build a local copy of the grid from
// the host's start payload, create local Player instances so the renderer
// (game.tsx) works unchanged, and apply each incoming snapshot to mirror
// the host's authoritative state. Keyboard input is sent to the host.
// Spectators use the same view in spectator mode: identical rendering, but
// no keyboard listener and no input sent to the host.

let active = false;
let spectatorMode = false;
let myPlayerId: string | null = null;
let nextInputSequence = 0;
let pendingMoves: Array<{ sequence: number; direction: Direction }> = [];
let latestStats: PlayerStats[] = [];
let latestTimeElapsedMs = 0;
let latestGameOver: GameOverPayload | null = null;

// Held-key input state sent to the host. Shared by the keyboard listener and
// the touch-control senders below.
const guestInput = {
  up: false,
  down: false,
  left: false,
  right: false,
  bomb: false,
};

function sendGuestInput(move?: Direction): void {
  const sequence = ++nextInputSequence;
  roomClient.sendToHost({
    t: "input",
    sequence,
    up: guestInput.up,
    down: guestInput.down,
    left: guestInput.left,
    right: guestInput.right,
    bomb: guestInput.bomb,
    move,
  });
}

/** Queue one movement for the local guest (touch control tap/hold). */
export function sendGuestMove(direction: Direction): void {
  if (!active || spectatorMode) return;
  const sequence = nextInputSequence + 1;
  pendingMoves.push({ sequence, direction });
  predictMove(direction);
  sendGuestInput(direction);
}

/**
 * Send one bomb press to the host (touch control tap). The flag must return
 * to false afterwards or the host's edge-triggered placement never re-arms.
 */
export function sendGuestBomb(): void {
  if (!active || spectatorMode) return;
  guestInput.bomb = true;
  sendGuestInput();
  window.setTimeout(() => {
    guestInput.bomb = false;
    sendGuestInput();
  }, NET_CONFIG.inputIntervalMs + 30);
}

// Previous lives per character, used to detect damage for the grunt sound.
const previousLives: Map<string, number> = new Map();
// Previous bomb presence per cell index, used for the bomb-drop sound.
const previousBombByIndex: Map<number, boolean> = new Map();
// Previous powerup presence per cell index, used for the pickup sound.
const previousPowerupByIndex: Map<number, boolean> = new Map();
// Previous shield-block flag per character, used for the shield-break sound.
const previousShieldBlock: Map<string, boolean> = new Map();

// Keyboard listener cleanup.
let removeKeyboardListener: (() => void) | null = null;

function gridToPixel(pos: GridPosition): Position {
  return {
    x: pos.col * GRID_PATTERN.cellSize,
    y: pos.row * GRID_PATTERN.cellSize,
  };
}

/**
 * Build the local grid and create local Player instances for every human
 * roster entry, so game.tsx's render loop renders all characters. Called when
 * the guest receives the host's `start` payload. In spectator mode no input
 * is captured or sent — the view is watch-only.
 */
export function startGuestView(payload: StartPayload, spectator = false) {
  if (typeof document === "undefined") return;

  active = true;
  spectatorMode = spectator;
  latestGameOver = null;
  previousLives.clear();
  previousBombByIndex.clear();
  previousPowerupByIndex.clear();
  previousShieldBlock.clear();
  nextInputSequence = 0;
  pendingMoves = [];

  // Rebuild the grid to mirror the host's layout exactly.
  resetGrid(payload.cellTypes);

  // Create a Player instance for each human (local + remote) entry. Bots are
  // also created so they render; they have no local input.
  characterManager.clear();
  tracker.reset();

  payload.roster.forEach((entry, index) => {
    const spawn = getCornerSpawn(CORNER_ORDER[index] ?? "tl");
    const palette = PLAYER_PALETTE[index] ?? PLAYER_PALETTE[0];
    const player = new Player(
      entry.id,
      palette.accent,
      palette.dark,
      palette.light,
      gridToPixel(spawn),
      spawn,
      PLAYER_CONFIG.defaultLives, // corrected from snapshots
      undefined,
      undefined,
      entry.name
    );
    characterManager.register(player);
    tracker.registerPlayer(player);
    previousLives.set(entry.id, PLAYER_CONFIG.defaultLives);
  });

  // The guest's own character is the slot matching its connection slot.
  const mySlot = roomClient.getSlot();
  if (mySlot !== null) {
    const myEntry = payload.roster.find((e) => e.slot === mySlot);
    myPlayerId = myEntry?.id ?? null;
  }

  // Capture keyboard input and send it to the host. Spectators never send
  // input, so they get no listener at all.
  removeKeyboardListener = spectator ? null : setupKeyboardInput();
}

function predictMove(direction: Direction): void {
  if (!myPlayerId) return;
  const player = characterManager.get(myPlayerId);
  if (!player || !player.isAlive()) return;

  const delta = DIRECTION_DELTAS[direction];
  const targetRow = player.gridPosition.row + delta.row;
  const targetCol = player.gridPosition.col + delta.col;
  if (!isWalkable(targetRow, targetCol)) return;

  player.move(direction);
}

/**
 * Apply a full state snapshot from the host: update character positions,
 * lives, and visual flags; sync the grid cells; play diff-based sounds.
 */
export function applySnapshot(payload: SnapshotPayload) {
  if (!active) return;

  latestTimeElapsedMs = payload.timeElapsedMs;
  latestStats = payload.stats;

  // --- Characters ---
  for (const snap of payload.characters) {
    const char = characterManager.get(snap.id);
    if (!char) continue;

    // Position: update both grid and pixel coordinates.
    char.gridPosition.row = snap.row;
    char.gridPosition.col = snap.col;
    char.position = gridToPixel(snap);
    char.facing = snap.facing;
    char.winning = snap.winning;

    // Lives: play grunt sound when a character takes damage.
    const prevLives = previousLives.get(snap.id);
    if (prevLives !== undefined && snap.lives < prevLives) {
      playSound("soundFX", "grunt", 0.7);
    }
    previousLives.set(snap.id, snap.lives);
    char.lives = snap.lives;

    // Shield break: play the break sound on the rising edge of the flag.
    const wasShieldBlock = previousShieldBlock.get(snap.id) ?? false;
    if (snap.isShieldBlock && !wasShieldBlock) {
      playSound("soundFX", "shield-break", 0.6);
    }
    previousShieldBlock.set(snap.id, snap.isShieldBlock);

    // Mirror time-based visual flags from the host.
    char.syncTimedFlags({
      isImmune: snap.isImmune,
      isWalking: snap.isWalking,
      isHurt: snap.isHurt,
      hasShield: snap.hasShield,
      isShieldBlock: snap.isShieldBlock,
      isShieldExpiring: snap.isShieldExpiring,
    });

    if (snap.id === myPlayerId) {
      const acknowledgedSequence = snap.lastProcessedInputSequence ?? 0;
      pendingMoves = pendingMoves.filter(
        (move) => move.sequence > acknowledgedSequence
      );
      for (const move of pendingMoves) {
        predictMove(move.direction);
      }
    }
  }

  // --- Cells: bombs, powerups, destroyed barrels ---
  for (const cellSnap of payload.cells) {
    const wasBomb = previousBombByIndex.get(cellSnap.index) ?? false;
    if (cellSnap.bomb && !wasBomb) {
      playSound("soundFX", "dropping-bomb", 0.5);
    }
    previousBombByIndex.set(cellSnap.index, cellSnap.bomb);

    const wasPowerup = previousPowerupByIndex.get(cellSnap.index) ?? false;
    if (!cellSnap.powerup && wasPowerup) {
      // A powerup disappeared; if a player is on this cell, it was picked up.
      const row = Math.floor(cellSnap.index / GRID_PATTERN.gridCols);
      const col = cellSnap.index % GRID_PATTERN.gridCols;
      const onCell = characterManager.getAll().some(
        (c) => c.gridPosition.row === row && c.gridPosition.col === col
      );
      if (onCell) playSound("soundFX", "powerup-extraBomb", 0.6);
    }
    previousPowerupByIndex.set(cellSnap.index, !!cellSnap.powerup);
  }
  applyCellSnapshots(payload.cells);
}

/**
 * Render a blast visual + play the explosion sound. The host relays this
 * when a bomb detonates.
 */
export function applyBlast(payload: BlastPayload) {
  if (!active || typeof document === "undefined") return;
  if (payload.cells.length === 0) return;

  const center = payload.cells[0];
  const centerCell = getCellAt(center.row, center.col);
  if (!centerCell) return;

  playSound("soundFX", "explosion", 0.5);

  const blast = createBlastVisual(
    payload.reach as BlastReach,
    payload.cellSizePx
  );
  Object.assign(blast.style, {
    position: "absolute",
    left: `${centerCell.offsetLeft}px`,
    top: `${centerCell.offsetTop}px`,
    zIndex: "10",
  });
  grid.appendChild(blast);

  window.setTimeout(() => {
    if (blast.parentElement) blast.parentElement.removeChild(blast);
  }, BOMB_CONFIG.explodeDuration);
}

/**
 * Store the game-over payload so the guest's UI can show the end screen.
 */
export function applyGameOver(payload: GameOverPayload) {
  latestGameOver = payload;
}

/**
 * Route a relayed host payload to the right handler.
 */
export function handleHostPayload(payload: GamePayload) {
  switch (payload.t) {
    case "snapshot":
      applySnapshot(payload);
      break;
    case "blast":
      applyBlast(payload);
      break;
    case "gameOver":
      applyGameOver(payload);
      break;
    case "latencyPing":
      if (payload.slot === roomClient.getSlot()) {
        roomClient.sendToHost({ t: "latencyPong", id: payload.id });
      }
      break;
    case "start":
      // The guest receives start before snapshots; startGuestView is called
      // by the page layer which owns the roster, so this is a no-op here.
      break;
    default:
      break;
  }
}

// =========================
// Keyboard input -> host
// =========================
function setupKeyboardInput(): () => void {
  if (typeof window === "undefined") return () => {};

  const handleKeyDown = (e: KeyboardEvent) => {
    if (GAME_KEYS.includes(e.key)) {
      e.preventDefault();
    }
    const direction = directionByKey[e.key];
    if (direction !== undefined) {
      if (direction === Direction.UP) guestInput.up = true;
      else if (direction === Direction.DOWN) guestInput.down = true;
      else if (direction === Direction.LEFT) guestInput.left = true;
      else if (direction === Direction.RIGHT) guestInput.right = true;

      // Browser key-repeat must not create movement faster than physical
      // key presses. Each non-repeat keydown sends one discrete move.
      if (!e.repeat) {
        const sequence = nextInputSequence + 1;
        pendingMoves.push({ sequence, direction });
        predictMove(direction);
        sendGuestInput(direction);
      } else sendGuestInput();
    }
    if (e.key === " ") {
      guestInput.bomb = true;
      sendGuestInput();
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    const direction = directionByKey[e.key];
    if (direction !== undefined) {
      if (direction === Direction.UP) guestInput.up = false;
      else if (direction === Direction.DOWN) guestInput.down = false;
      else if (direction === Direction.LEFT) guestInput.left = false;
      else if (direction === Direction.RIGHT) guestInput.right = false;
      sendGuestInput();
    }
    if (e.key === " ") {
      guestInput.bomb = false;
      sendGuestInput();
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);

  // Keep held-key state authoritative even if one browser drops a keyboard
  // event during focus changes or backgrounding.
  const inputHeartbeatId = window.setInterval(
    sendGuestInput,
    NET_CONFIG.inputIntervalMs
  );

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
    window.clearInterval(inputHeartbeatId);
  };
}

// =========================
// Accessors
// =========================
export function getLatestStats(): PlayerStats[] {
  return latestStats;
}

export function getLatestTimeElapsedMs(): number {
  return latestTimeElapsedMs;
}

export function getLatestGameOver(): GameOverPayload | null {
  return latestGameOver;
}

export function getMyPlayerId(): string | null {
  return myPlayerId;
}

/**
 * Stop the guest view: remove the keyboard listener and clear local state.
 */
export function stopGuestView() {
  active = false;
  spectatorMode = false;
  if (removeKeyboardListener) {
    removeKeyboardListener();
    removeKeyboardListener = null;
  }
  myPlayerId = null;
  nextInputSequence = 0;
  pendingMoves = [];
  latestStats = [];
  latestTimeElapsedMs = 0;
  latestGameOver = null;
  previousLives.clear();
  previousBombByIndex.clear();
  previousPowerupByIndex.clear();
  previousShieldBlock.clear();
}
