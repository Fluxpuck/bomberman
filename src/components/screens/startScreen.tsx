import React, { useState } from "react";

type GameMode = "solo" | "2 players" | "3 players" | "4 players";

interface StartScreenProps {
  onStart: (mode: GameMode) => void;
}

export function StartScreen({ onStart }: StartScreenProps) {
  const [selectedMode, setSelectedMode] = useState<GameMode>("solo");

  // Game mode options
  const gameModes: GameMode[] = ["solo", "2 players", "3 players", "4 players"];

  // Colors for each mode button
  const modeColors = {
    solo: { bg: "#4ade80", border: "#166534", text: "#0a0a0a" },
    "2 players": { bg: "#60a5fa", border: "#1e3a8a", text: "#ffffff" },
    "3 players": { bg: "#f59e0b", border: "#b45309", text: "#ffffff" },
    "4 players": { bg: "#ef4444", border: "#991b1b", text: "#ffffff" },
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 w-[400px] min-w-[400px] max-w-[400px] shadow-2xl">
        {/* Game Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">BOMBERMAN</h1>
          <p className="text-gray-400">Select game mode to start playing</p>
        </div>

        {/* Game Mode Selection */}
        <div className="mb-8">
          <div className="grid grid-cols-2 gap-2">
            {gameModes.map((mode) => {
              return (
                <button
                  key={mode}
                  className={`py-3 px-4 rounded-lg font-bold text-center transition-all`}
                  style={{
                    backgroundColor: modeColors[mode].bg,
                    borderColor: modeColors[mode].border,
                    color: modeColors[mode].text,
                    border: `2px solid ${modeColors[mode].border}`,
                  }}
                  onClick={() => onStart(mode)}
                >
                  <span className="block w-full text-center">
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Game Controls */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>Controls: WASD keys to move, Space to place bombs</p>
        </div>
      </div>
    </div>
  );
}
