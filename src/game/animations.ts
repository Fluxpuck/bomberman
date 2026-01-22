import {
  BOMB_CONFIG,
  GRID_PATTERN,
  SCORE_CONFIG,
  POWERUP_CONFIG,
} from "./core/config";
import type { GridPosition } from "../types/game";
import { createDynamite } from "./assets/dynamite";
import { createPowerUp, PowerupType } from "./assets/powerups";
import { hasPowerup } from "./powerup";
import { tracker } from "./hooks/tracker";
import { playSound } from "./hooks/sound";

// Track bomb timers to prevent double explosions
const bombTimers: Map<string, number> = new Map();

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

// =========================
// Effects
// =========================
/**
 * Creates an explosion puff with a quick scale/opacity animation
 */
export function createExplosion(): HTMLDivElement {
  const el = document.createElement("div");
  Object.assign(el.style, {
    width: "100%",
    height: "100%",
    background:
      "radial-gradient(circle, rgba(255,237,74,0.95) 0%, rgba(255,166,0,0.85) 55%, rgba(255,94,0,0.6) 75%, rgba(255,0,0,0.0) 100%)",
    borderRadius: "6px",
    position: "absolute",
    top: "0",
    left: "0",
    zIndex: "10",
    pointerEvents: "none",
  });
  return el;
}

/**
 * Animates an explosion puff with a quick scale/opacity animation
 */
function animateExplosion(el: HTMLElement, duration: number) {
  el.animate(
    [
      { transform: "scale(0.6)", opacity: 0.0 },
      { transform: "scale(1)", opacity: 1.0, offset: 0.25 },
      { transform: "scale(1.05)", opacity: 1.0, offset: 0.5 },
      { transform: "scale(1)", opacity: 0.0 },
    ],
    { duration, easing: "ease-out", fill: "both" }
  );
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
  const dyn = createDynamite();
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

  // After the fuse expires, explode the dynamite
  const timerId = window.setTimeout(() => {
    // Remove this timer from tracking once it executes
    bombTimers.delete(bombId);
    if (dyn.parentElement) dyn.parentElement.removeChild(dyn); // Remove dynamite visual

    // Clear bomb flag and restore walkability if there's no barrel
    delete (cell.dataset as any).bomb;
    if ((cell.dataset as any).barrel !== "1") {
      cell.dataset.solid = "0";
    }

    // Gather explosion cells (center + range in all directions)
    const affected: GridPosition[] = [{ row: at.row, col: at.col }];
    const range = Math.min(
      Math.max(0, opts?.bombRange ?? BOMB_CONFIG.blastRadius ?? 0),
      Math.max(0, BOMB_CONFIG.maxBlastRadius ?? Number.POSITIVE_INFINITY)
    );
    // Interpret range as total reach INCLUDING the center tile.
    // Therefore, outward tiles per direction = range - 1.
    const outward = Math.max(0, range - 1);
    const dirs: Array<[dr: number, dc: number]> = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];

    for (const [dr, dc] of dirs) {
      for (let step = 1; step <= outward; step++) {
        const r = at.row + dr * step;
        const c = at.col + dc * step;
        const flags = getCellFlags(grid, r, c);

        // Stop if we hit the edge of the grid
        if (!flags.exists) break;

        // Add this cell to affected cells
        affected.push({ row: r, col: c });

        // Stop if we hit a solid wall or barrel, but continue through powerups
        // (we include the cell in the affected list for visual effects)
        if (flags.solid && !flags.powerup) {
          // If it's a barrel, we want to destroy it
          // If it's a solid wall, we want to stop the explosion
          break;
        }
      }
    }

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

    // Visual effect: apply explosion puffs to affected cells, destroy barrels
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
          const pu = createPowerUp(t);
          target.appendChild(pu);
        }
      }

      // Create explosion effect
      const puff = createExplosion();

      // Add the explosion to the cell
      // The z-index will ensure it appears below powerups
      target.appendChild(puff);

      // Animate and clean up
      animateExplosion(puff, duration);
      window.setTimeout(() => {
        if (puff.parentElement) puff.parentElement.removeChild(puff);
      }, duration);
    }

    window.setTimeout(() => {
      opts?.onExplode?.(affected);
    }, Math.max(0, BOMB_CONFIG.explodeDuration));
  }, fuse);

  // Store the timer ID for potential cancellation
  bombTimers.set(bombId, timerId);
}
