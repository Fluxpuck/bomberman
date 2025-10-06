import React from "react";
import { GAME_CONFIG } from "../../game/config";

interface GameHUDProps {
  timeElapsedMs: number;
  gameTimeLimit?: number;
}

export function GameHUD({
  timeElapsedMs,
  gameTimeLimit = GAME_CONFIG.timeLimit,
}: GameHUDProps) {
  // Calculate time remaining in seconds
  const timeRemainingSeconds = Math.max(
    0,
    gameTimeLimit - Math.floor(timeElapsedMs / 1000)
  );

  // Format time as MM:SS
  const minutes = Math.floor(timeRemainingSeconds / 60);
  const seconds = timeRemainingSeconds % 60;
  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;

  // Calculate progress percentage for the time bar
  const progressPercentage = Math.max(
    0,
    Math.min(100, (timeRemainingSeconds / gameTimeLimit) * 100)
  );

  // Determine color based on time remaining
  const getTimeColor = () => {
    if (progressPercentage > 60) return "#4ade80"; // Green
    if (progressPercentage > 30) return "#facc15"; // Yellow
    return "#ef4444"; // Red
  };

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-gray-900/80 border border-gray-700 rounded-lg p-3 z-50 min-w-[160px] text-center">
      {/* Time Display */}
      <div className="mb-2">
        <div className="text-xs text-gray-400 mb-1">TIME REMAINING</div>
        <div className="text-xl font-bold text-white">{formattedTime}</div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-1000"
          style={{
            width: `${progressPercentage}%`,
            backgroundColor: getTimeColor(),
          }}
        />
      </div>
    </div>
  );
}
