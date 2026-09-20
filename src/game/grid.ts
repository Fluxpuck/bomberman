import { GridPosition } from "../types/game";
import { CellSnapshot } from "../types/multiplayer";
import { createTileVisual, rescaleTileVisual, TileKind } from "./assets/blocks";
import { createBombVisual } from "./assets/dynamite";
import { createPowerUp, PowerupType, rescalePowerUpVisual } from "./assets/powerups";
import { GRID_PATTERN, LAYOUT_CONFIG } from "./core/config";
import { getActiveMapPattern, isInSpawnZone, MapPattern } from "./maps";

// =========================
// Types
// =========================
type CellType = "empty" | "border" | "solid" | "crate" | "barrel";

interface CellData {
  index: number;
  row: number;
  col: number;
  type: CellType;
}

interface GridLayout {
  cells: CellData[];
}

/** Corner identifiers for the four spawn slots. */
export type CornerId = "tl" | "tr" | "bl" | "br";

/** Spawn corner assigned to each roster slot index (0-3). */
export const CORNER_ORDER: CornerId[] = ["tl", "tr", "bl", "br"];

/** Map an internal cell type to the tile kind used by visuals/snapshots. */
function cellTypeToTileKind(type: CellType): TileKind {
  switch (type) {
    case "border":
    case "solid":
      return "wall";
    case "crate":
      return "crate";
    case "barrel":
      return "barrel";
    case "empty":
    default:
      return "floor";
  }
}

// =========================
// Constants
// =========================
const { gridRows, gridCols, cellSize } = GRID_PATTERN;

// =========================
// Grid Analysis Functions
// =========================

/**
 * Check if a position is on the grid border
 */
function isBorderCell(row: number, col: number): boolean {
  return row === 0 || row === gridRows - 1 || col === 0 || col === gridCols - 1;
}

/**
 * Determine if a breakable block should be placed (random based on the
 * active map pattern's coverage)
 */
function shouldPlaceBreakable(
  row: number,
  col: number,
  pattern: MapPattern
): boolean {
  // Don't place breakables on borders, solid blocks, or spawn zones
  if (isBorderCell(row, col)) return false;
  if (pattern.isPillar(row, col)) return false;
  if (isInSpawnZone(row, col)) return false;

  const coverage = Math.max(0, Math.min(1, pattern.coverage ?? 0));
  return Math.random() < coverage;
}

/**
 * Pick which breakable visual to use for a placed breakable block (even split)
 */
function pickBreakableType(): "crate" | "barrel" {
  return Math.random() < 0.5 ? "crate" : "barrel";
}

// =========================
// Grid Generation Functions
// =========================

/**
 * Generate the complete grid layout
 */
function generateGridLayout(): GridLayout {
  const cells: CellData[] = [];
  const totalCells = gridRows * gridCols;
  const pattern = getActiveMapPattern();

  for (let i = 0; i < totalCells; i++) {
    const row = Math.floor(i / gridCols);
    const col = i % gridCols;

    let type: CellType = "empty";

    if (isBorderCell(row, col)) {
      type = "border";
    } else if (pattern.isPillar(row, col)) {
      type = "solid";
    } else if (shouldPlaceBreakable(row, col, pattern)) {
      type = pickBreakableType();
    }

    cells.push({ index: i, row, col, type });
  }

  return { cells };
}

/**
 * Find a safe spawn position in a corner. Prefers the corner cell; if it is
 * not walkable, spirals outward to the nearest walkable cell.
 */
export function getCornerSpawn(corner: CornerId): GridPosition {
  const positions: Record<CornerId, GridPosition> = {
    tl: { row: 1, col: 1 },
    tr: { row: 1, col: gridCols - 2 },
    bl: { row: gridRows - 2, col: 1 },
    br: { row: gridRows - 2, col: gridCols - 2 },
  };

  const basePos = positions[corner];

  if (isWalkable(basePos.row, basePos.col)) {
    return basePos;
  }

  // Try adjacent cells in a spiral pattern
  const directions = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0], // Right, Down, Left, Up
    [1, 1],
    [1, -1],
    [-1, -1],
    [-1, 1], // Diagonals
  ];

  for (let radius = 1; radius <= 3; radius++) {
    for (const [dr, dc] of directions) {
      const row = basePos.row + dr * radius;
      const col = basePos.col + dc * radius;

      // isWalkable returns false for out-of-bounds positions
      if (isWalkable(row, col)) {
        return { row, col };
      }
    }
  }

  // Fallback to the base position even if not walkable
  return basePos;
}

/**
 * Create a cell DOM element based on cell data
 */
function createCellElement(cellData: CellData): HTMLDivElement {
  const cell = document.createElement("div");

  Object.assign(cell.style, {
    width: `${cellSize}px`,
    height: `${cellSize}px`,
    boxSizing: "border-box",
    border: "1px solid #333",
    background: "#fff",
    position: "relative",
  });

  // Set data attributes
  cell.dataset.index = String(cellData.index);
  cell.dataset.row = String(cellData.row);
  cell.dataset.col = String(cellData.col);
  cell.dataset.solid = "0";
  cell.dataset.tile = cellTypeToTileKind(cellData.type);

  // Add blocks based on cell type
  switch (cellData.type) {
    case "border":
    case "solid":
      cell.appendChild(createTileVisual("wall", cellSize));
      cell.dataset.solid = "1";
      break;
    case "crate":
      cell.appendChild(createTileVisual("crate", cellSize));
      cell.dataset.solid = "1";
      cell.dataset.barrel = "1";
      break;
    case "barrel":
      cell.appendChild(createTileVisual("barrel", cellSize));
      cell.dataset.solid = "1";
      cell.dataset.barrel = "1";
      break;
    case "empty":
      cell.appendChild(createTileVisual("floor", cellSize));
      break;
  }

  return cell;
}

/**
 * Build the complete grid DOM structure
 */
function buildGrid(layout: GridLayout): HTMLDivElement {
  const gridElement = document.createElement("div");
  gridElement.id = "game-grid";

  Object.assign(gridElement.style, {
    display: "grid",
    gridTemplateColumns: `repeat(${gridCols}, ${cellSize}px)`,
    gridTemplateRows: `repeat(${gridRows}, ${cellSize}px)`,
    width: `${gridCols * cellSize}px`,
    height: `${gridRows * cellSize}px`,
    boxSizing: "content-box",
    position: "relative",
  });

  // Append all cells
  layout.cells.forEach((cellData) => {
    const cellElement = createCellElement(cellData);
    gridElement.appendChild(cellElement);
  });

  return gridElement;
}

// =========================
// Grid Instance
// =========================
let currentLayout: GridLayout | null = null;

/**
 * Cached cell elements in row-major order. Populated when the grid is (re)built
 * and kept in sync with the grid's children so `getCellAt` can index directly
 * instead of running a `querySelector` on every call.
 */
let cellCache: HTMLDivElement[] = [];

/** Refresh `cellCache` from the grid's current children. */
function refreshCellCache(): void {
  cellCache = Array.from(grid.children) as HTMLDivElement[];
}

const grid: HTMLDivElement =
  typeof document !== "undefined"
    ? (() => {
        currentLayout = generateGridLayout();
        const built = buildGrid(currentLayout);
        // The grid element is assigned to `grid` below; populate the cache from
        // the built element's children before the reference is returned.
        cellCache = Array.from(built.children) as HTMLDivElement[];
        return built;
      })()
    : ({} as HTMLDivElement);



// =========================
// Public API
// =========================

/**
 * Reset the grid with a fresh layout. When `cellTypes` is provided (online
 * guests), the grid is rebuilt to mirror the host's layout exactly instead of
 * generating a random one.
 */
export function resetGrid(cellTypes?: TileKind[]): void {
  if (typeof document === "undefined") return;

  if (cellTypes) {
    // Build a layout from the provided tile kinds (guest side).
    const cells: CellData[] = cellTypes.map((tile, index) => {
      const row = Math.floor(index / gridCols);
      const col = index % gridCols;
      const type = tileKindToCellType(tile);
      return { index, row, col, type };
    });
    currentLayout = { cells };
  } else {
    currentLayout = generateGridLayout();
  }

  grid.innerHTML = "";

  currentLayout.cells.forEach((cellData) => {
    const cellElement = createCellElement(cellData);
    grid.appendChild(cellElement);
  });

  refreshCellCache();
}

/** Inverse of cellTypeToTileKind, used to rebuild a layout from a snapshot. */
function tileKindToCellType(tile: TileKind): CellType {
  switch (tile) {
    case "wall":
      return "solid";
    case "crate":
      return "crate";
    case "barrel":
      return "barrel";
    case "floor":
    default:
      return "empty";
  }
}

/**
 * Return the tile kind of every cell in row-major order. The host sends this
 * once at game start so guests can rebuild an identical grid.
 */
export function getLayoutCellTypes(): TileKind[] {
  if (typeof document === "undefined") return [];
  // Iterate cellCache, not grid.children: character and blast elements are
  // also appended to the grid and are not cells.
  return cellCache.map((cell) => (cell.dataset.tile as TileKind) || "floor");
}

/**
 * Update grid layout for responsive sizing
 */
export function updateGridLayout(
  viewWidth: number = window.innerWidth,
  viewHeight: number = window.innerHeight,
  padding: number = 32
): void {
  if (typeof document === "undefined") return;

  // In portrait the player HUDs and touch controls take vertical space, so
  // the grid must shrink to fit between them.
  const isPortrait = window.matchMedia("(orientation: portrait)").matches;
  const reservedHeight = isPortrait
    ? LAYOUT_CONFIG.portraitTopChrome + LAYOUT_CONFIG.portraitBottomChrome
    : 0;

  const maxCellW = Math.floor((viewWidth - padding * 2) / gridCols);
  const maxCellH = Math.floor(
    (viewHeight - padding * 2 - reservedHeight) / gridRows
  );
  const cell = Math.max(8, Math.min(cellSize, maxCellW, maxCellH));

  grid.style.gridTemplateColumns = `repeat(${gridCols}, ${cell}px)`;
  grid.style.gridTemplateRows = `repeat(${gridRows}, ${cell}px)`;
  grid.style.width = `${gridCols * cell}px`;
  grid.style.height = `${gridRows * cell}px`;

  for (let i = 0; i < cellCache.length; i++) {
    const el = cellCache[i];
    el.style.width = `${cell}px`;
    el.style.height = `${cell}px`;

    const tileVisual = el.firstElementChild as HTMLDivElement | null;
    if (tileVisual) rescaleTileVisual(tileVisual, cell);

    for (const child of Array.from(el.children)) {
      const el2 = child as HTMLDivElement;
      if (el2.dataset.powerup !== undefined) rescalePowerUpVisual(el2, cell);
    }
  }
}

/**
 * Get cell element at a specific grid position
 */
export function getCellAt(row: number, col: number): HTMLDivElement | null {
  if (typeof document === "undefined") return null;
  // Bounds check: out-of-range indices would otherwise compute a valid-looking
  // positive index (e.g. row=-1, col=gridCols) and return the wrong cell.
  if (row < 0 || row >= gridRows || col < 0 || col >= gridCols) return null;
  const index = row * gridCols + col;
  return cellCache[index] ?? null;
}

/**
 * Check if a position is walkable (not solid)
 */
export function isWalkable(row: number, col: number): boolean {
  // Out-of-bounds positions are never walkable. Without this guard the
  // `getCellAt` null result makes `null?.dataset.solid !== "1"` evaluate to
  // true, treating OOB cells as walkable.
  if (row < 0 || row >= gridRows || col < 0 || col >= gridCols) return false;
  const cell = getCellAt(row, col);
  return cell?.dataset.solid !== "1";
}

// =========================
// Online multiplayer: snapshots
// =========================

/** Find the powerup element (if any) inside a cell. */
function findPowerupElement(cell: HTMLElement): HTMLDivElement | null {
  for (const child of Array.from(cell.children)) {
    const el = child as HTMLDivElement;
    if (el.dataset.powerup !== undefined) return el;
  }
  return null;
}

/** Find the bomb element (if any) inside a cell. */
function findBombElement(cell: HTMLElement): HTMLDivElement | null {
  for (const child of Array.from(cell.children)) {
    const el = child as HTMLDivElement;
    if (el.classList.contains("dynamite")) return el;
  }
  return null;
}

/**
 * Read the mutable state of every cell (tile kind, bomb, powerup) for a
 * network snapshot. Called by the host each tick.
 */
export function getCellSnapshots(): CellSnapshot[] {
  if (typeof document === "undefined") return [];
  const snapshots: CellSnapshot[] = [];
  // Iterate cellCache, not grid.children: character and blast elements are
  // also appended to the grid and must not leak into snapshots.
  for (const cell of cellCache) {
    const index = Number(cell.dataset.index);
    const tile = (cell.dataset.tile as TileKind) || "floor";
    const bomb = findBombElement(cell) !== null;
    const powerupEl = findPowerupElement(cell);
    const powerup = powerupEl
      ? (powerupEl.dataset.powerup as PowerupType)
      : null;
    snapshots.push({ index, tile, bomb, powerup });
  }
  return snapshots;
}

/**
 * Apply a set of cell snapshots to the local grid. Called by guests each
 * tick to mirror the host's grid. Rebuilds tile/bomb/powerup visuals only
 * when they actually change, to avoid flapping the DOM every frame.
 */
export function applyCellSnapshots(cells: CellSnapshot[]): void {
  if (typeof document === "undefined") return;
  const liveCellSize = cellCache[0]?.offsetWidth || cellSize;

  for (const snap of cells) {
    const cell = cellCache[snap.index];
    if (!cell) continue;

    // --- Tile kind changed (e.g. a barrel was destroyed) ---
    const currentTile = (cell.dataset.tile as TileKind) || "floor";
    if (currentTile !== snap.tile) {
      // Replace the tile visual (always the first child).
      const oldTile = cell.firstElementChild as HTMLDivElement | null;
      if (oldTile) cell.removeChild(oldTile);
      const newTile = createTileVisual(snap.tile, liveCellSize);
      cell.insertBefore(newTile, cell.firstChild);
      cell.dataset.tile = snap.tile;

      // Update solidity + barrel flag to match the new tile.
      const isSolid = snap.tile === "wall" || snap.tile === "crate" || snap.tile === "barrel";
      cell.dataset.solid = isSolid ? "1" : "0";
      if (snap.tile === "crate" || snap.tile === "barrel") {
        cell.dataset.barrel = "1";
      } else {
        delete (cell.dataset as any).barrel;
      }
    }

    // --- Bomb presence ---
    const bombEl = findBombElement(cell);
    if (snap.bomb && !bombEl) {
      const newBomb = createBombVisual(liveCellSize);
      cell.appendChild(newBomb);
      (cell.dataset as any).bomb = "1";
      cell.dataset.solid = "1";
    } else if (!snap.bomb && bombEl) {
      cell.removeChild(bombEl);
      delete (cell.dataset as any).bomb;
      // Restore walkability only if the tile itself isn't solid.
      const tile = (cell.dataset.tile as TileKind) || "floor";
      if (tile !== "wall" && tile !== "crate" && tile !== "barrel") {
        cell.dataset.solid = "0";
      }
    }

    // --- Powerup presence ---
    const powerupEl = findPowerupElement(cell);
    if (snap.powerup && !powerupEl) {
      const pu = createPowerUp(snap.powerup, liveCellSize);
      cell.appendChild(pu);
    } else if (!snap.powerup && powerupEl) {
      cell.removeChild(powerupEl);
    }
  }
}

export { cellSize, grid, gridCols, gridRows, isInSpawnZone };

