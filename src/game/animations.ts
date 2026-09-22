import type { GridPosition } from "../types/game";
import {
    BlastReach,
    createBlastVisual,
    createBombVisual,
} from "./assets/dynamite";
import { createPowerUp, PowerupType } from "./assets/powerups";
import {
    BOMB_CONFIG,
    GRID_PATTERN,
    POWERUP_CONFIG
} from "./core/config";
import { playSound } from "./hooks/sound";
import { tracker } from "./hooks/tracker";
import { hasPowerup } from "./powerup";

// Track bomb timers to prevent double explosions
const bombTimers: Map<string, number> = new Map();

// Bombs that are armed but haven't exploded yet. Used by the AI to know
// what's about to blow up (and where) before it happens, so it can path
// away in time.
export interface PendingBomb {
  row: number;
  col: number;
  range: number;
  ownerId?: string;
  explodesAt: number;
}

// Options accepted by armDynamite. Shared by the initial placement and by
// chain reactions (which re-arm the chained bomb with its own callbacks).
export interface ArmDynamiteOpts {
  fuseMs?: number;
  bombRange?: number; // override range with placing player's range
  ownerId?: string; // optional owner placing the bomb
  // Fired immediately when the explosion starts. `ownerId` is the owner of
  // the bomb actually detonating — for chain reactions this differs from the
  // bomb that triggered the chain.
  onDetonate?: (
    cells: GridPosition[],
    durationMs: number,
    ownerId?: string
  ) => void;
  // Fired after the explosion visuals finish (used for cooldown/inventory)
  onExplode?: (cells: GridPosition[]) => void;
}

// Full internal bookkeeping for an armed bomb. Extends PendingBomb with the
// DOM + callback context needed to detonate, pause, resume, or cancel it.
interface BombState extends PendingBomb {
  grid: HTMLElement;
  at: GridPosition;
  cell: HTMLDivElement;
  dyn: HTMLElement;
  opts?: ArmDynamiteOpts;
  // Set while the game is paused: fuse time left when the timer was frozen.
  pausedRemainingMs?: number;
}

const pendingBombs: Map<string, BombState> = new Map();

// When true (game paused), newly armed bombs register as pending but get no
// live timer — resumeBombTimers schedules them. Covers chain reactions whose
// short re-arm delay fires while the game is paused.
let fusesPaused = false;

export function getPendingBombs(): PendingBomb[] {
  return Array.from(pendingBombs.values());
}

/**
 * Clear every active bomb-fuse timeout registered with `window.setTimeout`
 * in `armDynamite`. This must be called when the engine stops or resets so
 * that ticking bombs cannot fire their callbacks after the game has ended,
 * which would otherwise manipulate stale DOM and inflate stats/score.
 *
 * NOTE: `src/game/engine.ts` owns the stop/reset lifecycle (`stopEngine` /
 * `resetEngine` / `pauseGame`) and is responsible for calling this on stop
 * and reset. This module only exposes the function; it does not invoke it.
 */
export function clearActiveBombTimers(): void {
  if (typeof window === "undefined") return;
  for (const timerId of bombTimers.values()) {
    window.clearTimeout(timerId);
  }
  bombTimers.clear();
  pendingBombs.clear();
  fusesPaused = false;
}

/**
 * Freeze every ticking bomb fuse (game paused). The remaining fuse time is
 * stored on each pending bomb; bombs armed while paused get no live timer.
 */
export function pauseBombTimers(): void {
  if (typeof window === "undefined") return;
  fusesPaused = true;
  const now = Date.now();
  for (const [bombId, bomb] of pendingBombs) {
    if (bomb.pausedRemainingMs !== undefined) continue;
    const timerId = bombTimers.get(bombId);
    if (timerId !== undefined) {
      window.clearTimeout(timerId);
      bombTimers.delete(bombId);
    }
    bomb.pausedRemainingMs = Math.max(0, bomb.explodesAt - now);
  }
}

/**
 * Resume frozen bomb fuses (game resumed). Re-arms a live timer for each
 * pending bomb using its stored remaining fuse time.
 */
export function resumeBombTimers(): void {
  if (typeof window === "undefined") return;
  fusesPaused = false;
  const now = Date.now();
  for (const [bombId, bomb] of pendingBombs) {
    if (bomb.pausedRemainingMs === undefined) continue;
    const remainingMs = bomb.pausedRemainingMs;
    delete bomb.pausedRemainingMs;
    bomb.explodesAt = now + remainingMs;
    bombTimers.set(
      bombId,
      window.setTimeout(() => detonateBomb(bombId), remainingMs)
    );
  }
}

// =========================
// Grid helpers
// =========================
// Returns the index of a cell in the grid
function gridIndex(row: number, col: number): number {
  return row * GRID_PATTERN.gridCols + col;
}

// Get the cell at the given position
function getCell(
  grid: HTMLElement,
  row: number,
  col: number
): HTMLDivElement | null {
  if (
    row < 0 ||
    col < 0 ||
    row >= GRID_PATTERN.gridRows ||
    col >= GRID_PATTERN.gridCols
  )
    return null;
  return (grid.children[gridIndex(row, col)] as HTMLDivElement) ?? null;
}

// Get the cell flags at the given position
function getCellFlags(grid: HTMLElement, row: number, col: number) {
  const cell = getCell(grid, row, col);
  const exists = !!cell;
  const solid = !cell || cell.dataset.solid === "1";
  const barrel = !!cell && (cell.dataset as any).barrel === "1";
  const bomb = !!cell && (cell.dataset as any).bomb === "1";
  const powerup = !!cell && hasPowerup(cell);
  return { cell, exists, solid, barrel, bomb, powerup } as const;
}

/**
 * Walks outward from `at` in all 4 directions up to `range` tiles, stopping
 * early at grid edges or solid/wall cells exactly like a real explosion does.
 * The center cell is always included in the affected cells. Shared by the
 * real explosion (armDynamite) and the AI's danger prediction so the two can
 * never disagree about what a bomb will hit.
 */
export function computeBlast(
  grid: HTMLElement,
  at: GridPosition,
  range: number
): { affected: GridPosition[]; reach: BlastReach } {
  const affected: GridPosition[] = [{ row: at.row, col: at.col }];
  const outward = Math.max(0, range);
  const dirs: Array<[name: keyof BlastReach, dr: number, dc: number]> = [
    ["up", -1, 0],
    ["down", 1, 0],
    ["left", 0, -1],
    ["right", 0, 1],
  ];
  const reach: BlastReach = { up: 0, down: 0, left: 0, right: 0 };

  for (const [name, dr, dc] of dirs) {
    for (let step = 1; step <= outward; step++) {
      const r = at.row + dr * step;
      const c = at.col + dc * step;
      const flags = getCellFlags(grid, r, c);

      // Stop if we hit the edge of the grid
      if (!flags.exists) break;

      // Indestructible blocks stop the blast but are not part of its damage area.
      const isIndestructible =
        flags.solid && !flags.barrel && !flags.bomb && !flags.powerup;
      if (isIndestructible) break;

      // Open cells are traversable. Barrels and bombs are affected, then stop
      // propagation so the blast cannot pass through an occupied cell.
      affected.push({ row: r, col: c });
      reach[name] = step;
      if (flags.solid && (flags.barrel || flags.bomb)) break;
    }
  }

  return { affected, reach };
}

/**
 * Predicts which cells a pending (not-yet-exploded) bomb will hit, using
 * the exact same walking logic as a real explosion. Used by the AI for
 * danger-avoidance, not by any gameplay/visual code path.
 */
export function predictBlastCells(
  grid: HTMLElement,
  at: GridPosition,
  range: number
): GridPosition[] {
  return computeBlast(grid, at, range).affected;
}

// =========================
// Public API
// =========================
/**
 * Places a dynamite in a cell and explodes after fuse.
 * Returns false when the cell rejects the bomb (off-grid or already
 * solid — e.g. a bomb is already there) so callers don't count a
 * placement that never armed.
 */
export function armDynamite(
  grid: HTMLElement,
  at: GridPosition,
  opts?: ArmDynamiteOpts
): boolean {
  // Get the cell at the given position
  const cell = getCell(grid, at.row, at.col);
  if (!cell) return false;

  // Can't place inside walls/solids (allow placing on open tiles only)
  // Exception: allow placing on barrels (destructible blocks)
  const here = getCellFlags(grid, at.row, at.col);
  if (here.solid && !here.barrel) return false;

  // Get the fuse duration
  const fuse = Math.max(0, opts?.fuseMs ?? BOMB_CONFIG.fuseDuration);

  // Create the dynamite element (fuse visual burns down over the fuse time)
  const cellSizePx = cell.offsetWidth || GRID_PATTERN.cellSize;
  const dyn = createBombVisual(cellSizePx, fuse);
  cell.appendChild(dyn);

  // Mark as bomb and make the cell solid so it can't be walked through
  (cell.dataset as any).bomb = "1";
  cell.dataset.solid = "1";

  // Generate a unique ID for this bomb based on its position
  const bombId = `bomb-${at.row}-${at.col}`;

  // Clear any existing timer for this position
  if (bombTimers.has(bombId)) {
    window.clearTimeout(bombTimers.get(bombId));
  }

  const range = Math.min(
    Math.max(0, opts?.bombRange ?? BOMB_CONFIG.blastRadius ?? 0),
    Math.max(0, BOMB_CONFIG.maxBlastRadius ?? Number.POSITIVE_INFINITY)
  );

  // Track this bomb as pending (armed but not yet exploded) so the AI can
  // see it coming and path away in time. The full BombState keeps the
  // context needed to detonate, pause, or resume the bomb later.
  const bombState: BombState = {
    row: at.row,
    col: at.col,
    range,
    ownerId: opts?.ownerId,
    explodesAt: Date.now() + fuse,
    grid,
    at,
    cell,
    dyn,
    opts,
  };
  pendingBombs.set(bombId, bombState);

  // While the game is paused no live fuse runs; resumeBombTimers schedules
  // the remaining time on unpause.
  if (fusesPaused) {
    bombState.pausedRemainingMs = fuse;
    return true;
  }

  // After the fuse expires, explode the dynamite
  const timerId = window.setTimeout(() => detonateBomb(bombId), fuse);

  // Store the timer ID for potential cancellation
  bombTimers.set(bombId, timerId);
  return true;
}

/**
 * Explode an armed bomb: remove its visual, compute the blast, notify
 * callbacks, chain other bombs, and destroy barrels. Called by the fuse
 * timer (or by a chain reaction's immediate re-arm).
 */
function detonateBomb(bombId: string): void {
  const bomb = pendingBombs.get(bombId);
  if (!bomb) return;
  pendingBombs.delete(bombId);
  bombTimers.delete(bombId);

  const { grid, at, cell, dyn, range, opts } = bomb;

  if (dyn.parentElement) dyn.parentElement.removeChild(dyn); // Remove dynamite visual

  // Clear bomb flag and restore walkability if there's no barrel
  delete (cell.dataset as any).bomb;
  if ((cell.dataset as any).barrel !== "1") {
    cell.dataset.solid = "0";
  }

  // Gather explosion cells (center + range in all directions), stopping
  // at walls/barrels exactly like the visual does (shared helper).
  const { affected, reach } = computeBlast(grid, at, range);

  // Notify detonation and apply damage timing now. Pass the owner through so
  // chain reactions attribute damage to the bomb's own owner.
  const duration = Math.max(100, BOMB_CONFIG.explodeDuration);
  opts?.onDetonate?.(affected, duration, opts?.ownerId);
  // If no explicit handler was provided (e.g., NPC bombs), emit a global event
  if (!opts?.onDetonate) {
    try {
      const ev = new CustomEvent("bomb-detonate", {
        detail: { cells: affected, ownerId: opts?.ownerId },
      });
      grid.dispatchEvent(ev);
    } catch {}
  }

  // Play explosion sound
  playSound("soundFX", "explosion", 0.5);

  // Visual effect: single blast graphic anchored at the bomb's own cell,
  // each arm clipped to the tiles actually reached in that direction.
  const cellSizePx = cell.offsetWidth || GRID_PATTERN.cellSize;
  const blast = createBlastVisual(reach, cellSizePx);
  Object.assign(blast.style, {
    position: "absolute",
    left: `${cell.offsetLeft}px`,
    top: `${cell.offsetTop}px`,
    zIndex: "10",
  });
  grid.appendChild(blast);
  window.setTimeout(() => {
    if (blast.parentElement) blast.parentElement.removeChild(blast);
  }, duration);

  // Apply gameplay effects to affected cells (destroy barrels/crates, chain bombs)
  for (const gp of affected) {
    const target = getCell(grid, gp.row, gp.col);
    if (!target) continue;

    // Skip solid walls (but not barrels, bombs, or powerups)
    const isBarrel = (target.dataset as any).barrel === "1";
    const isBomb = (target.dataset as any).bomb === "1";
    const isSolid = target.dataset.solid === "1";
    const isPowerup = hasPowerup(target);

    // Only skip permanent solid walls - allow explosion to affect everything else
    if (isSolid && !isBarrel && !isBomb && !isPowerup) continue;

    // Chain reaction: If this cell has a bomb, detonate it immediately
    if (isBomb) {
      // Trigger immediate detonation by setting a very short timeout
      // We use a small delay (10ms) to avoid infinite recursion and allow the current explosion to finish processing
      const bombElement = Array.from(target.children).find((child) =>
        child.classList.contains("dynamite")
      );
      if (bombElement) {
        // Generate the bomb ID to cancel its timer
        const chainedBombId = `bomb-${gp.row}-${gp.col}`;

        // A chain-triggered bomb must explode with ITS OWN owner, range, and
        // callbacks (the values stored when it was placed), not the
        // triggering blast's. That way kills/score attribute to the player
        // who placed it and that player's active-bomb slot is released.
        const chainedBomb = pendingBombs.get(chainedBombId);
        const chainedOpts = chainedBomb?.opts;
        const chainedOwnerId = chainedBomb?.ownerId;
        const chainedRange = chainedBomb?.range;

        // Cancel the original timer for this bomb to prevent double explosion
        if (bombTimers.has(chainedBombId)) {
          window.clearTimeout(bombTimers.get(chainedBombId));
          bombTimers.delete(chainedBombId);
        }
        pendingBombs.delete(chainedBombId);

        // Remove the bomb element to prevent visual duplication
        target.removeChild(bombElement);

        // Clear bomb flag immediately
        delete (target.dataset as any).bomb;
        if ((target.dataset as any).barrel !== "1") {
          target.dataset.solid = "0";
        }

        // Trigger the chain reaction with a small delay
        window.setTimeout(() => {
          armDynamite(
            grid,
            { row: gp.row, col: gp.col },
            {
              fuseMs: 0, // Immediate detonation
              bombRange: chainedRange ?? opts?.bombRange,
              ownerId: chainedOwnerId ?? opts?.ownerId,
              onDetonate: chainedOpts?.onDetonate ?? opts?.onDetonate,
              onExplode: chainedOpts?.onExplode ?? opts?.onExplode,
            }
          );
        }, 10);
      }
    }

    // Power-ups caught in the blast are destroyed
    if (isPowerup) {
      for (const child of Array.from(target.children)) {
        const element = child as HTMLElement;
        if (element.dataset.powerup !== undefined) {
          target.removeChild(element);
        }
      }
    }

    // Handle barrels
    if ((target.dataset as any).barrel === "1") {
      if (target.firstElementChild) {
        target.removeChild(target.firstElementChild);
      }
      target.dataset.solid = "0";
      target.dataset.tile = "floor";
      delete (target.dataset as any).barrel;
      // Attribute stats to owner if provided; default to p1 proxy otherwise.
      // incrementBlocksDestroyed is the single authoritative scoring path: it
      // bumps the block counter AND awards SCORE_CONFIG.pointsPerBarrel, so no
      // separate addScore call is needed here (doing both double-counts).
      if (opts?.ownerId) {
        const owner = tracker.getPlayer(opts.ownerId);
        if (owner) {
          owner.incrementBlocksDestroyed(1);
        }
      }

      const dropChance = Math.max(
        0,
        Math.min(1, POWERUP_CONFIG.dropChance ?? 0)
      );
      if (Math.random() < dropChance) {
        const types = [
          "extraBomb",
          "increaseRange",
          "shield",
          "teleport",
        ] as PowerupType[];
        const t = types[Math.floor(Math.random() * types.length)];
        const cellSizePx = target.offsetWidth || GRID_PATTERN.cellSize;
        const pu = createPowerUp(t, cellSizePx);
        target.appendChild(pu);
      }
    }
  }

  window.setTimeout(() => {
    opts?.onExplode?.(affected);
  }, Math.max(0, BOMB_CONFIG.explodeDuration));
}
