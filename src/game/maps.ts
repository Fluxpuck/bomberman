import { GENERATED_MAP, GRID_PATTERN } from "./core/config";

/**
 * A named map layout: `isPillar` decides which inner cells are
 * indestructible blocks (the border ring is always solid, set by the
 * generator), and `coverage` is the probability that each remaining cell
 * gets a breakable block. Corner spawn zones are always kept clear.
 */
export interface MapPattern {
  id: string;
  name: string;
  isPillar: (row: number, col: number) => boolean;
  coverage: number;
}

const { rowOffset, colOffset, gridRows, gridCols, cornerSafeSize } =
  GRID_PATTERN;

/**
 * Check if a position is in a corner spawn-safe zone
 */
export function isInSpawnZone(row: number, col: number): boolean {
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

export const MAP_PATTERNS: MapPattern[] = [
  {
    id: "classic",
    name: "Classic",
    coverage: GRID_PATTERN.coverage,
    isPillar: (row, col) =>
      (row + rowOffset) % 2 === 1 && (col + colOffset) % 2 === 1,
  },
  {
    id: "pillars",
    name: "Pillars",
    coverage: 0.75,
    isPillar: (row, col) => row % 3 === 2 && col % 3 === 2,
  },
  {
    id: "corridors",
    name: "Corridors",
    coverage: 0.8,
    // Horizontal wall bands with periodic gaps so lanes stay connected.
    isPillar: (row, col) => row % 3 === 0 && col % 3 !== 0,
  },
  {
    id: "arena",
    name: "Arena",
    coverage: 0.7,
    isPillar: () => false,
  },
];

// The map selection made on the map-select screen. "random" resolves to a
// random pattern on every grid generation, so replays keep changing.
export type MapSelection = string;

let currentMapId: MapSelection = "classic";

export function setMapPattern(id: MapSelection): void {
  currentMapId = id;
}

export function getActiveMapPattern(): MapPattern {
  if (currentMapId === "random") {
    return MAP_PATTERNS[Math.floor(Math.random() * MAP_PATTERNS.length)];
  }
  if (currentMapId === "generate") {
    return generateMapPattern();
  }
  return MAP_PATTERNS.find((p) => p.id === currentMapId) ?? MAP_PATTERNS[0];
}

// =========================
// Random map generation
// =========================

const SPAWN_CORNERS: ReadonlyArray<readonly [number, number]> = [
  [1, 1],
  [1, gridCols - 2],
  [gridRows - 2, 1],
  [gridRows - 2, gridCols - 2],
];

/**
 * BFS over interior non-pillar cells from the top-left spawn corner. Returns
 * true when all four spawn corners stay mutually reachable. Breakables count
 * as passable — players can bomb through them — so only pillars can seal off
 * a region permanently.
 */
function spawnZonesConnected(pillars: Set<number>): boolean {
  const [startRow, startCol] = SPAWN_CORNERS[0];
  const visited = new Set<number>([startRow * gridCols + startCol]);
  const queue: Array<readonly [number, number]> = [[startRow, startCol]];

  while (queue.length > 0) {
    const [row, col] = queue.shift()!;
    for (const [dr, dc] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ] as const) {
      const nextRow = row + dr;
      const nextCol = col + dc;
      const isInterior =
        nextRow >= 1 &&
        nextRow <= gridRows - 2 &&
        nextCol >= 1 &&
        nextCol <= gridCols - 2;
      if (!isInterior) continue;

      const index = nextRow * gridCols + nextCol;
      if (pillars.has(index) || visited.has(index)) continue;
      visited.add(index);
      queue.push([nextRow, nextCol]);
    }
  }

  return SPAWN_CORNERS.every(([row, col]) =>
    visited.has(row * gridCols + col)
  );
}

/**
 * Build a fresh pattern with randomly placed pillars and a rolled breakable
 * coverage. Retries until the spawn zones stay connected; falls back to no
 * pillars if no connected layout is found within the attempt budget.
 */
export function generateMapPattern(): MapPattern {
  const coverage =
    GENERATED_MAP.coverageMin +
    Math.random() * (GENERATED_MAP.coverageMax - GENERATED_MAP.coverageMin);

  for (let attempt = 0; attempt < GENERATED_MAP.maxAttempts; attempt++) {
    const pillars = new Set<number>();
    for (let row = 1; row < gridRows - 1; row++) {
      for (let col = 1; col < gridCols - 1; col++) {
        if (isInSpawnZone(row, col)) continue;
        if (Math.random() < GENERATED_MAP.pillarChance) {
          pillars.add(row * gridCols + col);
        }
      }
    }

    if (spawnZonesConnected(pillars)) {
      return {
        id: "generated",
        name: "Generated",
        isPillar: (row, col) => pillars.has(row * gridCols + col),
        coverage,
      };
    }
  }

  return {
    id: "generated",
    name: "Generated",
    isPillar: () => false,
    coverage,
  };
}
