import { Direction } from "../types/game";

// =========================
// Keyboard input mapping
// =========================
// Shared by the engine (local player) and the guest net layer (remote
// player) so both interpret the same keys identically.

/** Keyboard key -> movement direction for both WASD and arrow keys. */
export const directionByKey: Record<string, Direction> = {
  ArrowUp: Direction.UP,
  w: Direction.UP,
  W: Direction.UP,
  ArrowDown: Direction.DOWN,
  s: Direction.DOWN,
  S: Direction.DOWN,
  ArrowLeft: Direction.LEFT,
  a: Direction.LEFT,
  A: Direction.LEFT,
  ArrowRight: Direction.RIGHT,
  d: Direction.RIGHT,
  D: Direction.RIGHT,
};

/** Keys that would scroll the page and must be preventDefault-ed. */
export const GAME_KEYS = [
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  " ",
];
