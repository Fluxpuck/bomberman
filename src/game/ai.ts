import { Direction, GridPosition } from "../types/game";
import { Computer, characterManager } from "./player";
import { moveCharacter, placeBomb, getDangerCells } from "./engine";
import { grid, getCellAt, gridRows, gridCols, isWalkable } from "./grid";
import { predictBlastCells } from "./animations";

// =========================
// Tuning
// =========================
const NORMAL_DELAY_RANGE: [number, number] = [300, 550];
const FLEE_DELAY_RANGE: [number, number] = [120, 200];
// Don't bother chasing an enemy that's farther than this many walkable
// steps away — keeps computers from beelining across the whole map the
// instant the round starts.
const MAX_CHASE_STEPS = 12;
// Small chance to drop a bomb while free-roaming with no better reason to.
const IDLE_BOMB_CHANCE = 0.04;
// How many recently-visited cells to remember, to discourage immediately
// backtracking and oscillating in place.
const RECENT_CELLS_MEMORY = 6;

const DIRECTION_DELTAS: Record<Direction, { row: number; col: number }> = {
  [Direction.UP]: { row: -1, col: 0 },
  [Direction.DOWN]: { row: 1, col: 0 },
  [Direction.LEFT]: { row: 0, col: -1 },
  [Direction.RIGHT]: { row: 0, col: 1 },
};
const ALL_DIRECTIONS = [
  Direction.UP,
  Direction.DOWN,
  Direction.LEFT,
  Direction.RIGHT,
];

function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

function randomBetween([min, max]: [number, number]): number {
  return min + Math.random() * (max - min);
}

// =========================
// Per-computer AI state
// =========================
interface ComputerAIState {
  lastMoveAt: number;
  nextDelayMs: number;
  recentCells: string[];
}
const aiState: Map<string, ComputerAIState> = new Map();

function getState(id: string): ComputerAIState {
  let state = aiState.get(id);
  if (!state) {
    state = {
      lastMoveAt: 0,
      nextDelayMs: randomBetween(NORMAL_DELAY_RANGE),
      recentCells: [],
    };
    aiState.set(id, state);
  }
  return state;
}

function recordVisited(state: ComputerAIState, pos: GridPosition): void {
  state.recentCells.push(cellKey(pos.row, pos.col));
  if (state.recentCells.length > RECENT_CELLS_MEMORY) {
    state.recentCells.shift();
  }
}

// =========================
// Grid perception (reads the live DOM grid directly)
// =========================
function findCellsWhere(
  predicate: (cell: HTMLDivElement, row: number, col: number) => boolean
): GridPosition[] {
  const found: GridPosition[] = [];
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const cell = getCellAt(row, col);
      if (cell && predicate(cell, row, col)) {
        found.push({ row, col });
      }
    }
  }
  return found;
}

function findBarrels(): GridPosition[] {
  return findCellsWhere((cell) => (cell.dataset as any).barrel === "1");
}

function findPowerups(): GridPosition[] {
  return findCellsWhere((cell) => cell.dataset.powerup !== undefined);
}

function isAdjacentToBarrel(pos: GridPosition): boolean {
  return ALL_DIRECTIONS.some((dir) => {
    const d = DIRECTION_DELTAS[dir];
    const cell = getCellAt(pos.row + d.row, pos.col + d.col);
    return !!cell && (cell.dataset as any).barrel === "1";
  });
}

// =========================
// Pathfinding (BFS over the live walkable grid)
// =========================
interface BfsOptions {
  avoid?: Set<string>;
  maxSteps?: number;
}

/**
 * Breadth-first search from `start` to the nearest cell satisfying `isGoal`.
 * Returns the step-by-step path (excluding the start cell itself), or null
 * if no reachable goal was found within maxSteps.
 *
 * The goal check runs BEFORE the walkability check on each candidate cell,
 * so a non-walkable cell (a barrel, another character's cell, an armed
 * bomb) can still be the destination — you just can't walk further through
 * it. This matters a lot here: barrels/enemies are exactly the kind of
 * target this AI needs to path adjacent to, and they're never walkable.
 */
function bfsPath(
  start: GridPosition,
  isGoal: (row: number, col: number) => boolean,
  opts: BfsOptions = {}
): GridPosition[] | null {
  const avoid = opts.avoid ?? new Set<string>();
  const maxSteps = opts.maxSteps ?? gridRows * gridCols;

  const visited = new Set<string>([cellKey(start.row, start.col)]);
  const queue: { pos: GridPosition; path: GridPosition[] }[] = [
    { pos: start, path: [] },
  ];

  while (queue.length > 0) {
    const { pos, path } = queue.shift()!;
    if (path.length >= maxSteps) continue;

    for (const dir of ALL_DIRECTIONS) {
      const d = DIRECTION_DELTAS[dir];
      const row = pos.row + d.row;
      const col = pos.col + d.col;
      const key = cellKey(row, col);

      if (visited.has(key)) continue;
      if (row < 0 || col < 0 || row >= gridRows || col >= gridCols) continue;
      if (avoid.has(key)) continue;

      const nextPath = [...path, { row, col }];
      if (isGoal(row, col)) return nextPath;

      // Not the goal — can only continue searching through it if walkable.
      if (!isWalkable(row, col)) continue;

      visited.add(key);
      queue.push({ pos: { row, col }, path: nextPath });
    }
  }

  return null;
}

/** BFS to whichever of `candidates` is reachable in the fewest steps. */
function bfsToNearest(
  start: GridPosition,
  candidates: GridPosition[],
  avoid: Set<string>,
  maxSteps?: number
): GridPosition[] | null {
  if (candidates.length === 0) return null;
  const goals = new Set(candidates.map((c) => cellKey(c.row, c.col)));
  return bfsPath(start, (row, col) => goals.has(cellKey(row, col)), {
    avoid,
    maxSteps,
  });
}

function directionTo(from: GridPosition, to: GridPosition): Direction | null {
  if (to.row < from.row) return Direction.UP;
  if (to.row > from.row) return Direction.DOWN;
  if (to.col < from.col) return Direction.LEFT;
  if (to.col > from.col) return Direction.RIGHT;
  return null;
}

// =========================
// Decision-making
// =========================

/**
 * Picks the next single step toward the most relevant objective: chase a
 * nearby enemy, otherwise clear the nearest barrel, otherwise grab the
 * nearest powerup. Returns null if nothing worthwhile is reachable (caller
 * falls back to free-roaming).
 */
function chooseObjectiveStep(
  computer: Computer,
  danger: Set<string>
): GridPosition | null {
  const pos = computer.gridPosition;

  const enemies = characterManager
    .getAll()
    .filter((c) => c.id !== computer.id && c.isAlive())
    .map((c) => c.gridPosition);
  const toEnemy = bfsToNearest(pos, enemies, danger, MAX_CHASE_STEPS);
  if (toEnemy && toEnemy.length > 0) return toEnemy[0];

  const toBarrel = bfsToNearest(pos, findBarrels(), danger);
  if (toBarrel && toBarrel.length > 0) return toBarrel[0];

  const toPowerup = bfsToNearest(pos, findPowerups(), danger);
  if (toPowerup && toPowerup.length > 0) return toPowerup[0];

  return null;
}

/** Free-roam fallback: a random safe walkable neighbor, biased against cells visited in the last few moves. */
function chooseRoamStep(
  computer: Computer,
  danger: Set<string>,
  state: ComputerAIState
): Direction | null {
  const pos = computer.gridPosition;
  const candidates = [...ALL_DIRECTIONS].sort(() => Math.random() - 0.5);

  let bestDir: Direction | null = null;
  let bestScore = -1;

  for (const dir of candidates) {
    const d = DIRECTION_DELTAS[dir];
    const row = pos.row + d.row;
    const col = pos.col + d.col;
    if (!isWalkable(row, col)) continue;
    if (danger.has(cellKey(row, col))) continue;

    const score = state.recentCells.includes(cellKey(row, col)) ? 0 : 1;
    if (score > bestScore) {
      bestScore = score;
      bestDir = dir;
    }
  }

  return bestDir;
}

/** Boxed in with no fully-safe path: pick whatever neighbor is least bad rather than freezing on top of a bomb. */
function chooseEmergencyStep(
  computer: Computer,
  danger: Set<string>
): Direction | null {
  const pos = computer.gridPosition;
  let bestDir: Direction | null = null;
  let bestScore = -1;

  for (const dir of ALL_DIRECTIONS) {
    const d = DIRECTION_DELTAS[dir];
    const row = pos.row + d.row;
    const col = pos.col + d.col;
    if (!isWalkable(row, col)) continue;

    const score = danger.has(cellKey(row, col)) ? 0 : 1;
    if (score > bestScore) {
      bestScore = score;
      bestDir = dir;
    }
  }

  return bestDir;
}

/**
 * Decides whether to place a bomb this tick: only if there's a good reason
 * (a barrel to crack open, or an enemy in the blast line) AND an escape
 * route exists afterward. This is the fix for the AI trapping and killing
 * itself with its own bombs.
 */
function maybePlaceBomb(computer: Computer, danger: Set<string>): void {
  const pos = computer.gridPosition;

  const hypotheticalBlast = predictBlastCells(grid, pos, computer.bombRange);
  const hypotheticalDanger = new Set(danger);
  for (const cell of hypotheticalBlast) {
    hypotheticalDanger.add(cellKey(cell.row, cell.col));
  }

  const wouldHitEnemy = characterManager
    .getAll()
    .some(
      (other) =>
        other.id !== computer.id &&
        other.isAlive() &&
        hypotheticalBlast.some(
          (c) =>
            c.row === other.gridPosition.row && c.col === other.gridPosition.col
        )
    );

  const wantsToBomb =
    isAdjacentToBarrel(pos) ||
    wouldHitEnemy ||
    Math.random() < IDLE_BOMB_CHANCE;

  if (!wantsToBomb) return;

  const escapeRoute = bfsPath(
    pos,
    (row, col) => isWalkable(row, col) && !hypotheticalDanger.has(cellKey(row, col)),
    { avoid: hypotheticalDanger, maxSteps: 6 }
  );
  if (!escapeRoute) return;

  placeBomb(computer);
}

function decideAndAct(
  computer: Computer,
  danger: Set<string>,
  now: number
): void {
  const state = getState(computer.id);
  const pos = computer.gridPosition;
  const inDanger = danger.has(cellKey(pos.row, pos.col));

  if (now - state.lastMoveAt < state.nextDelayMs) {
    // Still on cooldown for movement — bomb placement isn't gated by this,
    // since placeBomb() enforces its own cooldown/inventory limits.
    if (!inDanger) maybePlaceBomb(computer, danger);
    return;
  }

  if (inDanger) {
    const safePath = bfsPath(
      pos,
      (row, col) => isWalkable(row, col) && !danger.has(cellKey(row, col)),
      { avoid: danger }
    );
    const dir = safePath
      ? directionTo(pos, safePath[0])
      : chooseEmergencyStep(computer, danger);

    if (dir && moveCharacter(computer, dir)) {
      state.lastMoveAt = now;
      state.nextDelayMs = randomBetween(FLEE_DELAY_RANGE);
      recordVisited(state, computer.gridPosition);
    }
    return;
  }

  maybePlaceBomb(computer, danger);

  const objectiveStep = chooseObjectiveStep(computer, danger);
  const dir = objectiveStep
    ? directionTo(pos, objectiveStep)
    : chooseRoamStep(computer, danger, state);

  if (dir && moveCharacter(computer, dir)) {
    state.lastMoveAt = now;
    state.nextDelayMs = randomBetween(NORMAL_DELAY_RANGE);
    recordVisited(state, computer.gridPosition);
  }
}

// =========================
// Public API
// =========================

/**
 * Update computer player AI. Runs one decision per computer per call,
 * throttled per-computer (faster while fleeing danger).
 */
export function updateComputerPlayers(_deltaTime: number): void {
  const computers = characterManager.getComputers();
  if (computers.length === 0) return;

  const danger = getDangerCells();
  const now = Date.now();

  for (const computer of computers) {
    if (!computer.isAlive()) continue;
    decideAndAct(computer, danger, now);
  }
}

/**
 * Reset AI state by clearing all tracked per-computer data.
 */
export function resetAIState(): void {
  aiState.clear();
}
