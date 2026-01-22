import React from "react";
import { PlayerStats } from "../../game/hooks/tracker";

type CornerPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

interface PlayerHUDProps {
  player: PlayerStats;
  corner: CornerPosition;
}

export function PlayerHUD({ player, corner }: PlayerHUDProps) {
  // Determine position styles based on corner
  const getPositionStyles = (): React.CSSProperties => {
    switch (corner) {
      case "top-left":
        return { top: "1rem", left: "1rem" };
      case "top-right":
        return { top: "1rem", right: "1rem" };
      case "bottom-left":
        return { bottom: "1rem", left: "1rem" };
      case "bottom-right":
        return { bottom: "1rem", right: "1rem" };
    }
  };

  // Get player type label
  const playerTypeLabel = player.isPlayer ? "Player" : "Computer";
  const playerNumber = player.id.split("-")[1] || "";

  // Get player status
  const isAlive = player.isAlive;

  return (
    <div
      className="fixed bg-gray-900/80 border-2 rounded-lg overflow-hidden z-40 w-48"
      style={{
        ...getPositionStyles(),
        borderColor: player.color,
      }}
    >
      {/* Header bar with player color */}
      <div className="h-1.5" style={{ backgroundColor: player.color }} />

      {/* Player info */}
      <div className="p-3">
        {/* Player name and score */}
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: player.color }}
            />
            <span className="font- text-white">
              {playerTypeLabel} {playerNumber}
            </span>
          </div>
          <span className="text-xs text-gray-300">
            Score: <span className="font-extrabold">{player.score}</span>
          </span>
        </div>

        {/* Player stats */}
        {isAlive ? (
          <div className="space-y-1 text-sm">
            {/* Lives */}
            <div className="flex justify-between">
              <span className="text-gray-400">Lives</span>
              <div className="flex gap-1">
                {[...Array(player.lives)].map((_, i) => (
                  <div key={i} className="w-3 h-3 rounded-full bg-red-500" />
                ))}
              </div>
            </div>

            {/* Bombs */}
            <div className="flex justify-between">
              <span className="text-gray-400">Bombs</span>
              <div className="flex items-center gap-1">
                <span className="font-medium text-white">
                  {player.bombsAvailable - (player.activeBombs || 0)}
                </span>
                <span className="text-xs text-gray-400">
                  / {player.bombsAvailable}
                </span>
              </div>
            </div>

            {/* Range */}
            <div className="flex justify-between">
              <span className="text-gray-400">Range</span>
              <span className="font-medium text-white">{player.bombRange}</span>
            </div>

            {/* Kills (if any) */}
            {player.kills > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Kills</span>
                <span className="font-medium text-white">{player.kills}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-1">
            <span className="text-red-500 font-bold tracking-wider">
              ELIMINATED
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Component to display multiple player HUDs in the corners of the screen
 */
export function PlayersHUD({ players }: { players: PlayerStats[] }) {
  // Define corner positions based on player count
  const cornerPositions: CornerPosition[] = [
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right",
  ];

  return (
    <>
      {players.slice(0, 4).map((player, index) => (
        <PlayerHUD
          key={player.id}
          player={player}
          corner={cornerPositions[index]}
        />
      ))}
    </>
  );
}
