import { GRID_PATTERN } from "./core/config";
import { createSolidBlock, createBarrelBlock } from "./assets/blocks";
import { GridPosition } from "../types/game";

// =========================
// Types
// =========================
type CellType = "empty" | "border" | "solid" | "barrel";

interface CellData {
  index: number;
  row: number;
  col: number;
  type: CellType;
}

interface GridLayout {
  cells: CellData[];
  spawnPositions: GridPosition[];
}

// =========================
// Constants
// =========================
const { gridRows, gridCols, cellSize, cornerSafeSize } = GRID_PATTERN;

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
 * Check if a position should have a solid block (checkerboard pattern)
 */
function isSolidPatternCell(row: number, col: number): boolean {
  const { rowOffset = 0, colOffset = 0 } = GRID_PATTERN;
  const rParity = (row + rowOffset) % 2;
  const cParity = (col + colOffset) % 2;
  return rParity === 1 && cParity === 1;
}

/**
 * Check if a position is in a corner spawn-safe zone
 */
function isInSpawnZone(row: number, col: number): boolean {
  const size = Math.max(0, Math.floor(cornerSafeSize ?? 0));
  if (size <= 0) return false;

  const minRow = 1;
  const minCol = 1;
  const maxRow = gridRows - 2;
  const maxCol = gridCols - 2;

  const inTopRows = row >= minRow && row < minRow + size;
  const inBottomRows = row > maxRow - size && row <= maxRow;
  const inLeftCols = col >= minCol && col < minCol + size;
  const inRightCols = col > maxCol - size && col <= maxCol;

  return (
    (inTopRows && inLeftCols) ||
    (inTopRows && inRightCols) ||
    (inBottomRows && inLeftCols) ||
    (inBottomRows && inRightCols)
  );
}

/**
 * Determine if a barrel should be placed (random based on coverage)
 */
function shouldPlaceBarrel(row: number, col: number): boolean {
  // Don't place barrels on borders, solid blocks, or spawn zones
  if (isBorderCell(row, col)) return false;
  if (isSolidPatternCell(row, col)) return false;
  if (isInSpawnZone(row, col)) return false;

  const coverage = Math.max(0, Math.min(1, GRID_PATTERN.coverage ?? 0));
  return Math.random() < coverage;
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

  for (let i = 0; i < totalCells; i++) {
    const row = Math.floor(i / gridCols);
    const col = i % gridCols;

    let type: CellType = "empty";

    if (isBorderCell(row, col)) {
      type = "border";
    } else if (isSolidPatternCell(row, col)) {
      type = "solid";
    } else if (shouldPlaceBarrel(row, col)) {
      type = "barrel";
    }

    cells.push({ index: i, row, col, type });
  }

  const spawnPositions = generateSpawnPositions();

  return { cells, spawnPositions };
}

/**
 * Generate spawn positions for up to 4 players (one in each corner)
 */
function generateSpawnPositions(): GridPosition[] {
  const spawns: GridPosition[] = [];

  // Top-left corner
  spawns.push({ row: 1, col: 1 });

  // Top-right corner
  spawns.push({ row: 1, col: gridCols - 2 });

  // Bottom-left corner
  spawns.push({ row: gridRows - 2, col: 1 });

  // Bottom-right corner
  spawns.push({ row: gridRows - 2, col: gridCols - 2 });

  return spawns;
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

  // Add blocks based on cell type
  switch (cellData.type) {
    case "border":
    case "solid":
      cell.appendChild(createSolidBlock());
      cell.dataset.solid = "1";
      break;
    case "barrel":
      cell.appendChild(createBarrelBlock());
      cell.dataset.solid = "1";
      cell.dataset.barrel = "1";
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

const grid: HTMLDivElement =
  typeof document !== "undefined"
    ? (() => {
        currentLayout = generateGridLayout();
        return buildGrid(currentLayout);
      })()
    : ({} as HTMLDivElement);

// =========================
// Public API
// =========================

/**
 * Reset the grid with a fresh layout
 */
export function resetGrid(): void {
  if (typeof document === "undefined") return;

  currentLayout = generateGridLayout();
  grid.innerHTML = "";

  currentLayout.cells.forEach((cellData) => {
    const cellElement = createCellElement(cellData);
    grid.appendChild(cellElement);
  });
}

/**
 * Get spawn positions for players
 */
export function getSpawnPositions(): GridPosition[] {
  return currentLayout?.spawnPositions ?? generateSpawnPositions();
}

/**
 * Get a specific spawn position by player index (0-3)
 */
export function getSpawnPosition(playerIndex: number): GridPosition | null {
  const spawns = getSpawnPositions();
  return spawns[playerIndex] ?? null;
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

  const maxCellW = Math.floor((viewWidth - padding * 2) / gridCols);
  const maxCellH = Math.floor((viewHeight - padding * 2) / gridRows);
  const cell = Math.max(8, Math.min(cellSize, maxCellW, maxCellH));

  grid.style.gridTemplateColumns = `repeat(${gridCols}, ${cell}px)`;
  grid.style.gridTemplateRows = `repeat(${gridRows}, ${cell}px)`;
  grid.style.width = `${gridCols * cell}px`;
  grid.style.height = `${gridRows * cell}px`;

  for (let i = 0; i < grid.children.length; i++) {
    const el = grid.children[i] as HTMLDivElement;
    el.style.width = `${cell}px`;
    el.style.height = `${cell}px`;
  }
}

/**
 * Get cell element at a specific grid position
 */
export function getCellAt(row: number, col: number): HTMLDivElement | null {
  if (typeof document === "undefined") return null;
  const index = row * gridCols + col;
  return grid.querySelector(`[data-index="${index}"]`) as HTMLDivElement | null;
}

/**
 * Check if a position is walkable (not solid)
 */
export function isWalkable(row: number, col: number): boolean {
  const cell = getCellAt(row, col);
  return cell?.dataset.solid !== "1";
}

export { grid, gridRows, gridCols, cellSize };
