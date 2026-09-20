import { PlayerStats } from "../../game/hooks/tracker";

type CornerPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

interface PlayerHUDProps {
  player: PlayerStats;
  corner: CornerPosition;
}

export function PlayerHUD({ player, corner }: PlayerHUDProps) {
  // Determine position classes based on corner (tighter on small screens).
  // In portrait orientation the parent grid lays these out statically, so
  // the offsets are inert there.
  const getPositionClasses = (): string => {
    switch (corner) {
      case "top-left":
        return "top-2 left-2 sm:top-4 sm:left-4";
      case "top-right":
        return "top-2 right-2 sm:top-4 sm:right-4";
      case "bottom-left":
        return "bottom-2 left-2 sm:bottom-4 sm:left-4";
      case "bottom-right":
        return "bottom-2 right-2 sm:bottom-4 sm:right-4";
    }
  };

  // Get player type label
  const playerTypeLabel = player.isPlayer ? "Player" : "Computer";
  const playerNumber = player.id.split("-")[1] || "";
  const displayName = player.name || `${playerTypeLabel} ${playerNumber}`;

  // Get player status
  const isAlive = player.isAlive;

  return (
    <div
      className={`fixed portrait:static bg-gray-900/80 border-2 rounded-lg overflow-hidden z-40 w-32 sm:w-48 portrait:w-full ${getPositionClasses()}`}
      style={{
        borderColor: player.color,
      }}
    >
      {/* Header bar with player color */}
      <div className="h-1.5" style={{ backgroundColor: player.color }} />

      {/* Player info */}
      <div className="p-2 sm:p-3 portrait:p-2">
        {/* Player name */}
        <div className="flex justify-between items-center sm:mb-2 portrait:mb-0">
          <div className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: player.color }}
            />
            <span className="font- text-white">
              {displayName}
            </span>
            {player.latencyMs !== null && (
              <span className="text-[10px] text-gray-400">
                {player.latencyMs} ms
              </span>
            )}
          </div>
        </div>

        {/* Player stats (hidden on small screens and in portrait to keep
            HUDs compact) */}
        {isAlive ? (
          <div className="hidden sm:block portrait:hidden space-y-1 text-sm">
            {/* Score */}
            <div className="flex justify-between">
              <span className="text-gray-400">Score</span>
              <span className="font-extrabold text-white">{player.score}</span>
            </div>

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

  // Landscape/desktop: `contents` keeps each HUD fixed in its corner.
  // Portrait: the wrapper becomes a 2-column grid pinned to the top.
  return (
    <div className="contents portrait:fixed portrait:inset-x-0 portrait:top-0 portrait:grid portrait:grid-cols-2 portrait:gap-1.5 portrait:p-2 portrait:z-40">
      {players.slice(0, 4).map((player, index) => (
        <PlayerHUD
          key={player.id}
          player={player}
          corner={cornerPositions[index]}
        />
      ))}
    </div>
  );
}
