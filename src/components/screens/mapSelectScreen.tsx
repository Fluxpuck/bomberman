import { GRID_PATTERN } from "../../game/core/config";
import { isInSpawnZone } from "../../game/grid";
import { MAP_PATTERNS, MapPattern } from "../../game/maps";

interface MapSelectScreenProps {
  onSelect: (mapId: string) => void;
  onBack: () => void;
}

const { gridRows, gridCols } = GRID_PATTERN;

const PREVIEW_CELL = {
  wall: "#475569",
  pillar: "#64748b",
  floor: "#111827",
  spawn: "#1e3a8a",
};

/**
 * Renders a miniature preview of a map pattern: border walls, pillar cells,
 * spawn-safe corners, and open floor. Breakables are skipped — they are
 * random per game anyway.
 */
function MapPreview({ pattern }: { pattern: MapPattern }) {
  const cells: string[] = [];
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const isBorder =
        row === 0 || row === gridRows - 1 || col === 0 || col === gridCols - 1;
      if (isBorder) {
        cells.push(PREVIEW_CELL.wall);
      } else if (pattern.isPillar(row, col)) {
        cells.push(PREVIEW_CELL.pillar);
      } else if (isInSpawnZone(row, col)) {
        cells.push(PREVIEW_CELL.spawn);
      } else {
        cells.push(PREVIEW_CELL.floor);
      }
    }
  }

  return (
    <div
      className="grid gap-0 rounded overflow-hidden"
      style={{
        gridTemplateColumns: `repeat(${gridCols}, 6px)`,
      }}
    >
      {cells.map((color, i) => (
        <div key={i} style={{ width: 6, height: 6, backgroundColor: color }} />
      ))}
    </div>
  );
}

export function MapSelectScreen({ onSelect, onBack }: MapSelectScreenProps) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 w-[440px] max-w-full shadow-2xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Select Map</h1>
          <p className="text-gray-400 text-sm">
            Breakable blocks are placed randomly each game
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {MAP_PATTERNS.map((pattern) => (
            <button
              key={pattern.id}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg p-3 flex flex-col items-center gap-2 transition-colors"
              onClick={() => onSelect(pattern.id)}
            >
              <MapPreview pattern={pattern} />
              <span className="text-white font-semibold text-sm">
                {pattern.name}
              </span>
            </button>
          ))}

          <button
            className="col-span-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 flex items-center justify-center gap-2 transition-colors"
            onClick={() => onSelect("random")}
          >
            <span className="text-lg font-bold text-gray-400">?</span>
            <span className="text-white font-semibold text-sm">
              Random Preset
            </span>
          </button>

          <button
            className="col-span-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 flex items-center justify-center gap-2 transition-colors"
            onClick={() => onSelect("generate")}
          >
            <span className="text-lg font-bold text-gray-400">⚄</span>
            <span className="text-white font-semibold text-sm">
              Generate Random Map
            </span>
          </button>
        </div>

        <div className="flex justify-center">
          <button
            onClick={onBack}
            className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
