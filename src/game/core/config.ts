export const GAME_CONFIG = {
  timeLimit: 180, // in seconds - 3 minutes
};

export const GRID_PATTERN = {
  gridRows: 13,
  gridCols: 15,
  cellSize: 50,
  coverage: 0.8,
  cornerSafeSize: 2,
  rowOffset: 1,
  colOffset: 1,
};

export const PLAYER_CONFIG = {
  defaultLives: 3,
  defaultInventory: 1,
  // Prevent delayed network bursts from creating an unbounded movement queue.
  maxQueuedMoves: 8,
};

// Color triplets (accent / dark / light) for the four corner slots, in
// spawn order: top-left, top-right, bottom-left, bottom-right.
export const PLAYER_PALETTE = [
  { accent: "#4aa3ff", dark: "#12457f", light: "#cfe8ff" }, // Azure
  { accent: "#ff5f5f", dark: "#a62a2a", light: "#ffd3cf" }, // Ember
  { accent: "#f5a623", dark: "#a96a06", light: "#ffe6b8" }, // Amber
  { accent: "#b45ddb", dark: "#6f2f96", light: "#ecd4ff" }, // Violet
];

// =========================
// Network (online multiplayer)
// =========================
// The relay server URL clients connect to. Override for production hosting
// via the NEXT_PUBLIC_WS_URL env var (Next.js only exposes NEXT_PUBLIC_* to
// the browser bundle).
export const NET_CONFIG = {
  defaultServerUrl: "ws://localhost:3001",
  // How often the host broadcasts a full state snapshot to guests.
  snapshotIntervalMs: 50,
  // Repeat guest input while keys are held. This recovers from missed
  // keyup/keydown events and keeps input state fresh across the socket.
  inputIntervalMs: 50,
  // Online host simulation cadence. setInterval is less aggressively paused
  // than requestAnimationFrame when a host window is backgrounded.
  simulationIntervalMs: 16,
};

export function getServerUrl(): string {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  return NET_CONFIG.defaultServerUrl;
}

export const CHARACTER_CONFIG = {
  // How long a character keeps playing the "walk" sprite animation after a
  // move (isWalking window). There is no position transition — sprites snap
  // to their tile instantly.
  walkAnimMs: 300,
};

export const BOMB_CONFIG = {
  fuseDuration: 1250,
  explodeDuration: 350,
  blastRadius: 1,
  maxBlastRadius: 6,
  maxBombs: 5,
  // Minimum delay between a player's consecutive bomb placements.
  cooldownMs: 350,
};

export const SCORE_CONFIG = {
  pointsPerBarrel: 100,
  eliminationPoints: 1000,
};

export const POWERUP_CONFIG = {
  dropChance: 0.2,
};
