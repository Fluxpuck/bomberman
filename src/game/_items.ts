import { BOMB_CONFIG, SCORE_CONFIG, POWERUP_CONFIG } from "./config";
import { tracker } from "./_tracker";
import { GridPosition } from "../types/game";

// =========================
// Grid helpers
// =========================
// Returns the index of a cell in the grid
function gridIndex(row: number, col: number, gridCols: number): number {
  return row * gridCols + col;
}

// Get the cell at the given position
function getCell(
  grid: HTMLElement,
  row: number,
  col: number,
  gridRows: number,
  gridCols: number
): HTMLDivElement | null {
  if (row < 0 || col < 0 || row >= gridRows || col >= gridCols) return null;
  return (
    (grid.children[gridIndex(row, col, gridCols)] as HTMLDivElement) ?? null
  );
}

// Get the cell flags at the given position
function getCellFlags(
  grid: HTMLElement,
  row: number,
  col: number,
  gridRows: number,
  gridCols: number
) {
  const cell = getCell(grid, row, col, gridRows, gridCols);
  const exists = !!cell;
  const solid = !cell || cell.dataset.solid === "1";
  const barrel = !!cell && cell.dataset.barrel === "1";
  return { cell, exists, solid, barrel } as const;
}

// =========================
// Factories
// =========================
/**
 * Creates a dynamite element sized to fit within a cell
 */
export function createBomb(): HTMLDivElement {
  // Create the bomb element
  const el = document.createElement("div");
  Object.assign(el.style, {
    width: "70%",
    height: "70%",
    margin: "15%",
    background: "#c2410c", // orange
    border: "2px solid #7c2d12",
    borderRadius: "4px",
    position: "relative",
    boxSizing: "border-box",
  });

  // Create the fuse element
  const fuse = document.createElement("div");
  Object.assign(fuse.style, {
    position: "absolute",
    top: "-6px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "6px",
    height: "8px",
    background: "#f59e0b",
    border: "2px solid #78350f",
    borderRadius: "2px",
    boxSizing: "border-box",
  });
  el.appendChild(fuse);

  // Tag for identification
  el.dataset.role = "bomb";
  return el;
}

/**
 * Creates a powerup element
 */
export function createPowerUp(
  type: "extraBomb" | "increaseRange"
): HTMLDivElement {
  const el = document.createElement("div");

  const colors = {
    extraBomb: { bg: "#3b82f6", border: "#1d4ed8" },
    increaseRange: { bg: "#ef4444", border: "#b91c1c" },
  };

  Object.assign(el.style, {
    width: "60%",
    height: "60%",
    margin: "20%",
    background: colors[type].bg,
    border: `2px solid ${colors[type].border}`,
    borderRadius: "4px",
    position: "relative",
    boxSizing: "border-box",
    opacity: "0.8", // Make powerups semi-transparent
    zIndex: "5", // Ensure powerups appear above the grid but below characters
  });

  // Tag for identification
  el.dataset.powerup = type;
  // Mark as non-solid so bombs can be placed on top
  el.dataset.solid = "0";

  // Add a label
  const label = document.createElement("div");
  Object.assign(label.style, {
    position: "absolute",
    inset: "0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: "bold",
    color: "#fff",
  });

  switch (type) {
    case "extraBomb":
      label.textContent = "+";
      break;
    case "increaseRange":
      label.textContent = "R+";
      break;
  }

  el.appendChild(label);

  return el;
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
 * Places a bomb in a cell and explodes after fuse
 */
export function placeBomb(
  grid: HTMLElement,
  at: GridPosition,
  gridRows: number,
  gridCols: number,
  opts?: {
    fuseMs?: number;
    bombRange?: number; // override range with placing player's range
    ownerId?: string; // optional owner placing the bomb
    onDetonate?: (cells: GridPosition[], durationMs: number) => void; // Fired immediately when the explosion starts
    onExplode?: (cells: GridPosition[]) => void; // Fired after the explosion visuals finish (used for cooldown/inventory)
  }
) {
  if (typeof document === "undefined") return;

  // Get the cell at the given position
  const cell = getCell(grid, at.row, at.col, gridRows, gridCols);
  if (!cell) return;

  // Can't place inside walls/solids (allow placing on open tiles only)
  // Exception: allow placing on a power-up so players can bomb while standing on it
  const here = getCellFlags(grid, at.row, at.col, gridRows, gridCols);
  const hasPowerup = (() => {
    if (!here.cell) return false;
    for (const ch of Array.from(here.cell.children)) {
      const d = (ch as HTMLElement).dataset;
      if (d && d.powerup) return true;
    }
    return false;
  })();
  if (here.solid && !here.barrel && !hasPowerup) return;

  // Create the bomb element
  const bomb = createBomb();
  cell.appendChild(bomb);

  // Mark as bomb and make the cell solid so it can't be walked through
  cell.dataset.bomb = "1";
  cell.dataset.solid = "1";

  // Get the fuse duration
  const fuse = Math.max(0, opts?.fuseMs ?? BOMB_CONFIG.fuseDuration);

  // After the fuse expires, explode the bomb
  window.setTimeout(() => {
    if (bomb.parentElement) bomb.parentElement.removeChild(bomb); // Remove bomb visual

    // Clear bomb flag and restore walkability if there's no barrel
    delete cell.dataset.bomb;
    if (cell.dataset.barrel !== "1") {
      cell.dataset.solid = "0";
    }

    // Gather explosion cells (center + range in all directions)
    const affected: GridPosition[] = [{ row: at.row, col: at.col }];
    const range = Math.min(
      Math.max(0, opts?.bombRange ?? BOMB_CONFIG.bombRange ?? 0),
      Math.max(0, BOMB_CONFIG.maxRange ?? Number.POSITIVE_INFINITY)
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
        const flags = getCellFlags(grid, r, c, gridRows, gridCols);
        if (!flags.exists) break;
        if (flags.solid && !flags.barrel) break;
        affected.push({ row: r, col: c });
        if (flags.barrel) break;
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

    // Visual effect: apply explosion puffs to affected cells, destroy barrels
    for (const gp of affected) {
      const target = getCell(grid, gp.row, gp.col, gridRows, gridCols);
      if (!target) continue;

      if (target.dataset.barrel === "1") {
        if (target.firstElementChild) {
          target.removeChild(target.firstElementChild);
        }
        target.dataset.solid = "0";
        delete target.dataset.barrel;

        // Attribute stats to owner if provided; default to global tracker otherwise
        if (opts?.ownerId) {
          const owner = tracker.getPlayer(opts.ownerId);
          if (owner) {
            owner.incrementBlocksDestroyed(1);
            owner.addScore(SCORE_CONFIG.pointsPerBarrel || 0);
          } else {
            // Fallback to global tracker if player not found
            tracker.incrementBlocksDestroyed(1);
            tracker.addScore(SCORE_CONFIG.pointsPerBarrel || 0);
          }
        } else {
          tracker.incrementBlocksDestroyed(1);
          tracker.addScore(SCORE_CONFIG.pointsPerBarrel || 0);
        }

        const dropChance = Math.max(
          0,
          Math.min(1, POWERUP_CONFIG.dropChance ?? 0)
        );
        if (Math.random() < dropChance) {
          const types = ["extraBomb", "increaseRange"] as const;
          const t = types[Math.floor(Math.random() * types.length)];
          const pu = createPowerUp(t);
          target.appendChild(pu);
        }
      }

      const puff = createExplosion();
      target.appendChild(puff);
      animateExplosion(puff, duration);
      window.setTimeout(() => {
        if (puff.parentElement) puff.parentElement.removeChild(puff);
      }, duration);
    }

    window.setTimeout(() => {
      opts?.onExplode?.(affected);
    }, Math.max(0, BOMB_CONFIG.explodeDuration));
  }, fuse);
}
