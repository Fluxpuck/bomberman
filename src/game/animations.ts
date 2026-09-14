import {
  BOMB_CONFIG,
  GRID_PATTERN,
  SCORE_CONFIG,
  POWERUP_CONFIG,
} from "./core/config";
import type { GridPosition } from "../types/game";
import {
  createBombVisual,
  createBlastVisual,
  BlastReach,
} from "./assets/dynamite";
import { createPowerUp, PowerupType } from "./assets/powerups";
import { hasPowerup } from "./powerup";
import { tracker } from "./hooks/tracker";
import { playSound } from "./hooks/sound";

// Track bomb timers to prevent double explosions
const bombTimers: Map<string, number> = new Map();

// Bombs that are armed but haven't exploded yet, keyed the same as
// bombTimers. Used by the AI to know what's about to blow up (and where)
// before it happens, so it can path away in time.
export interface PendingBomb {
  row: number;
  col: number;
  range: number;
  ownerId?: string;
  explodesAt: number;
}
const pendingBombs: Map<string, PendingBomb> = new Map();

export function getPendingBombs(): PendingBomb[] {
  return Array.from(pendingBombs.values());
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
  const powerup = !!cell && hasPowerup(cell);
  return { cell, exists, solid, barrel, powerup } as const;
}

/**
 * Walks outward from `at` in all 4 directions up to `range` tiles (range
 * counts the center tile itself, so `range - 1` tiles outward), stopping
 * early at grid edges or solid/wall cells exactly like a real explosion
 * does. Shared by the real explosion (armDynamite) and the AI's danger
 * prediction so the two can never disagree about what a bomb will hit.
 */
export function computeBlast(
  grid: HTMLElement,
  at: GridPosition,
  range: number
): { affected: GridPosition[]; reach: BlastReach } {
  const affected: GridPosition[] = [{ row: at.row, col: at.col }];
  const outward = Math.max(0, range - 1);
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

      // Add this cell to affected cells
      affected.push({ row: r, col: c });
      reach[name] = step;

      // Stop if we hit a solid wall or barrel, but continue through powerups
      // (we include the cell in the affected list for visual effects)
      if (flags.solid && !flags.powerup) {
        // If it's a barrel, we want to destroy it
        // If it's a solid wall, we want to stop the explosion
        break;
      }
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
 * Places a dynamite in a cell and explodes after fuse
 */
export function armDynamite(
  grid: HTMLElement,
  at: GridPosition,
  opts?: {
    fuseMs?: number;
    bombRange?: number; // override range with placing player's range
    ownerId?: string; // optional owner placing the bomb
    onDetonate?: (cells: GridPosition[], durationMs: number) => void; // Fired immediately when the explosion starts
    onExplode?: (cells: GridPosition[]) => void; // Fired after the explosion visuals finish (used for cooldown/inventory)
  }
) {
  // Get the cell at the given position
  const cell = getCell(grid, at.row, at.col);
  if (!cell) return;

  // Can't place inside walls/solids (allow placing on open tiles only)
  // Exception: allow placing on barrels (destructible blocks)
  const here = getCellFlags(grid, at.row, at.col);
  if (here.solid && !here.barrel) return;

  // Create the dynamite element
  const cellSizePx = cell.offsetWidth || GRID_PATTERN.cellSize;
  const dyn = createBombVisual(cellSizePx);
  cell.appendChild(dyn);

  // Mark as bomb and make the cell solid so it can't be walked through
  (cell.dataset as any).bomb = "1";
  cell.dataset.solid = "1";

  // Get the fuse duration
  const fuse = Math.max(0, opts?.fuseMs ?? BOMB_CONFIG.fuseDuration);

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
  // see it coming and path away in time.
  pendingBombs.set(bombId, {
    row: at.row,
    col: at.col,
    range,
    ownerId: opts?.ownerId,
    explodesAt: Date.now() + fuse,
  });

  // After the fuse expires, explode the dynamite
  const timerId = window.setTimeout(() => {
    // Remove this timer/pending-bomb entry from tracking once it executes
    bombTimers.delete(bombId);
    pendingBombs.delete(bombId);
    if (dyn.parentElement) dyn.parentElement.removeChild(dyn); // Remove dynamite visual

    // Clear bomb flag and restore walkability if there's no barrel
    delete (cell.dataset as any).bomb;
    if ((cell.dataset as any).barrel !== "1") {
      cell.dataset.solid = "0";
    }

    // Gather explosion cells (center + range in all directions), stopping
    // at walls/barrels exactly like the visual does (shared helper).
    const { affected, reach } = computeBlast(grid, at, range);

    // Notify detonation and apply damage timing now
    const duration = Math.max(100, BOMB_CONFIG.explodeDuration);
    opts?.onDetonate?.(affected, duration);
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
    // each arm clipped to the tiles actually reached in that direction
    // (see docs/features/bomb-visual-upgrade.md)
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
                bombRange: opts?.bombRange,
                ownerId: opts?.ownerId, // Attribute the chain reaction to the original bomb owner
                onDetonate: opts?.onDetonate,
                onExplode: opts?.onExplode,
              }
            );
          }, 10);
        }
      }

      // Handle barrels
      if ((target.dataset as any).barrel === "1") {
        if (target.firstElementChild) {
          target.removeChild(target.firstElementChild);
        }
        target.dataset.solid = "0";
        delete (target.dataset as any).barrel;
        // Attribute stats to owner if provided; default to p1 proxy otherwise
        if (opts?.ownerId) {
          const owner = tracker.getPlayer(opts.ownerId);
          if (owner) {
            owner.incrementBlocksDestroyed(1);
            owner.addScore(SCORE_CONFIG.pointsPerBarrel || 0);
          }
        }

        const dropChance = Math.max(
          0,
          Math.min(1, POWERUP_CONFIG.dropChance ?? 0)
        );
        if (Math.random() < dropChance) {
          const types = ["extraBomb", "increaseRange"] as PowerupType[];
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
  }, fuse);

  // Store the timer ID for potential cancellation
  bombTimers.set(bombId, timerId);
}
