import { GAME_CONFIG } from "../../game/core/config";

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
    <div className="fixed top-[7.5rem] sm:top-4 left-1/2 transform -translate-x-1/2 portrait:top-auto portrait:bottom-2 portrait:left-2 portrait:-translate-x-0 bg-gray-900/80 border border-gray-700 rounded-lg p-2 sm:p-3 z-50 min-w-[120px] sm:min-w-[160px] portrait:min-w-0 portrait:p-1.5 text-center">
      {/* Time Display (label and bar hidden in portrait — time only) */}
      <div className="mb-1 sm:mb-2 portrait:mb-0">
        <div className="text-[10px] sm:text-xs text-gray-400 mb-0.5 sm:mb-1 portrait:hidden">TIME REMAINING</div>
        <div className="text-lg sm:text-xl font-bold text-white">{formattedTime}</div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden portrait:hidden">
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
