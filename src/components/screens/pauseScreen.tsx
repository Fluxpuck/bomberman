import React, { useState } from "react";

interface PauseScreenProps {
  onReturnToMenu: () => void;
  onResume: () => void;
}

export function PauseScreen({ onReturnToMenu, onResume }: PauseScreenProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-gray-900/90 border border-gray-700 rounded-xl p-8 w-[400px] min-w-[400px] max-w-[400px] shadow-2xl">
        {/* Game Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">PAUSED</h1>
          <p className="text-gray-400">Game is currently paused</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={onResume}
            className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
          >
            Resume Game
          </button>

          <button
            onClick={onReturnToMenu}
            className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
          >
            Main Menu
          </button>
        </div>

        {/* Game Controls */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>Controls: WASD keys to move, Space to place bombs, ESC to pause/resume</p>
        </div>
      </div>
    </div>
  );
}
