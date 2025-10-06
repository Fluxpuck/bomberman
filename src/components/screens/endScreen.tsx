import React from "react";
import { GameStats, PlayerStats } from "../../game/_tracker";
import { GameState } from "../../types/game";

export interface EndScreenProps {
  gameState: GameState;
  winner?: PlayerStats;
  timeLeft?: number;
  gameStats: GameStats;
  onReturnToMenu: () => void;
  onPlayAgain?: () => void;
}

export function EndScreen({
  gameState,
  winner,
  timeLeft = 0,
  gameStats,
  onReturnToMenu,
  onPlayAgain,
}: EndScreenProps) {
  const isGameOver = gameState === GameState.GAME_OVER;
  const isWin = gameState === GameState.WIN;

  // Format time as minutes:seconds
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 w-96 max-w-full shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          {isGameOver && (
            <h1 className="text-3xl font-bold text-red-500 mb-2">Game Over</h1>
          )}
          {isWin && winner && (
            <>
              <h1 className="text-3xl font-bold text-green-500 mb-2">
                Victory!
              </h1>
              <div className="flex items-center justify-center gap-3 mb-4">
                <div
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: winner.color }}
                />
                <span className="text-xl font-semibold text-white">
                  {winner.isPlayer ? "Player" : "Computer"}{" "}
                  {winner.id.split("-")[1]} Wins!
                </span>
              </div>
            </>
          )}
        </div>

        {/* Game Stats */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-300 mb-3 border-b border-gray-700 pb-2">
            Game Statistics
          </h2>

          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <div className="text-gray-400">Time Played</div>
            <div className="text-right font-medium text-white">
              {formatTime(gameStats.timeElapsedMs)}
            </div>

            {timeLeft > 0 && (
              <>
                <div className="text-gray-400">Time Left</div>
                <div className="text-right font-medium text-white">
                  {formatTime(timeLeft)}
                </div>
              </>
            )}

            <div className="text-gray-400">Bombs Placed</div>
            <div className="text-right font-medium text-white">
              {gameStats.totalBombsPlaced}
            </div>

            <div className="text-gray-400">Blocks Destroyed</div>
            <div className="text-right font-medium text-white">
              {gameStats.totalBlocksDestroyed}
            </div>

            <div className="text-gray-400">Total Kills</div>
            <div className="text-right font-medium text-white">
              {gameStats.totalKills}
            </div>
          </div>
        </div>

        {/* Winner Stats (if applicable) */}
        {winner && (
          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-gray-300 mb-3 border-b border-gray-700 pb-2 flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: winner.color }}
              />
              <span>{winner.isPlayer ? "Player" : "Computer"} Stats</span>
            </h2>

            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <div className="text-gray-400">Score</div>
              <div className="text-right font-medium text-white">
                {winner.score}
              </div>

              <div className="text-gray-400">Lives Left</div>
              <div className="text-right font-medium text-white">
                {winner.lives}
              </div>

              <div className="text-gray-400">Bombs Placed</div>
              <div className="text-right font-medium text-white">
                {winner.bombsPlaced}
              </div>

              <div className="text-gray-400">Blocks Destroyed</div>
              <div className="text-right font-medium text-white">
                {winner.blocksDestroyed}
              </div>

              <div className="text-gray-400">Kills</div>
              <div className="text-right font-medium text-white">
                {winner.kills}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          {onPlayAgain && (
            <button
              onClick={onPlayAgain}
              className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
            >
              Play Again
            </button>
          )}

          <button
            onClick={onReturnToMenu}
            className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
