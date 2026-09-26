import { GAME_CONFIG } from "@/game/core/config";
import { GameStats, PlayerStats } from "../../game/hooks/tracker";
import { GameState } from "../../types/game";
import { Button, Dot, Heading, Hint, Panel, Screen, Section, StatRow } from "../ui";

export interface EndScreenProps {
  gameState: GameState;
  winner?: PlayerStats;
  players?: PlayerStats[];
  timeLeft?: number;
  gameStats: GameStats;
  onReturnToMenu: () => void;
  onPlayAgain?: () => void;
  onReturnToLobby?: () => void;
  returnToLobbyEnabled?: boolean;
}

export function EndScreen({
  gameState,
  winner,
  players,
  gameStats,
  onReturnToMenu,
  onPlayAgain,
  onReturnToLobby,
  returnToLobbyEnabled = false,
}: EndScreenProps) {
  const isWin = gameState === GameState.WIN;

  // Format time as minutes:seconds
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Limit timePlayed maximum to configured timeLimit
  const timePlayed = Math.min(
    gameStats.timeElapsedMs,
    GAME_CONFIG.timeLimit * 1000
  );

  const winnerName =
    winner?.name ||
    `${winner?.isPlayer ? "Player" : "Computer"} ${winner?.id?.split("-")[1] || ""}`;

  // Spectators get every player's card — lay them out two-up so a full
  // lobby doesn't stretch the panel off-screen. Regular players only ever
  // see their own single card.
  const multiPlayerStats = (players?.length ?? 0) > 1;
  // Spectator game-over: compact 2-up cards so mobile fits without the
  // Screen wrapper shrinking the whole panel down to fit.
  const spectatorLayout = multiPlayerStats && !isWin;

  return (
    <Screen>
      <Panel width={multiPlayerStats ? 780 : 640}>
        <Heading
          title={isWin ? "VICTORY!" : "GAME OVER"}
          tone={isWin ? "green" : "red"}
        />

        {winner && (
          <div className="flex items-center justify-center gap-3 mb-6 -mt-2">
            <Dot color={winner.color || "#4A90E2"} />
            <span className="text-xl font-bold">{winnerName} Wins!</span>
          </div>
        )}

        {/* Game stats on the left, player cards on the right — keeps the
            panel landscape instead of one tall column. */}
        <div
          className={
            multiPlayerStats
              ? "grid grid-cols-1 sm:grid-cols-[2fr_3fr] gap-4 mb-6 items-start"
              : "grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 items-start"
          }
        >
          <Section title="Game Statistics">
            <div className={spectatorLayout ? "grid grid-cols-2 sm:block gap-x-4" : "contents"}>
              <StatRow label="Time Played" value={formatTime(timePlayed)} />
              <StatRow label="Bombs Placed" value={gameStats.totalBombsPlaced} />
              <StatRow label="Blocks Destroyed" value={gameStats.totalBlocksDestroyed} />
              <StatRow label="Total Kills" value={gameStats.totalKills} />
            </div>
          </Section>

          <div
            className={
              multiPlayerStats
                ? "grid grid-cols-2 gap-4"
                : "flex flex-col gap-4"
            }
          >
            {players?.map((player) => (
              <Section key={player.id} title={`${player.name} Stats`} dotColor={player.color}>
                <StatRow label="Score" value={player.score} />
                <StatRow label="Lives Left" value={player.lives} />
                <div className={spectatorLayout ? "hidden sm:contents" : "contents"}>
                  <StatRow label="Bombs Placed" value={player.bombsPlaced} />
                  <StatRow label="Blocks Destroyed" value={player.blocksDestroyed} />
                </div>
                <StatRow label="Kills" value={player.kills} />
              </Section>
            ))}
          </div>
        </div>

        <div className="flex gap-4 justify-center flex-wrap">
          {onPlayAgain && (
            <Button variant="green" onClick={onPlayAgain}>
              Play Again
            </Button>
          )}
          {onReturnToLobby && (
            <Button
              variant="green"
              disabled={!returnToLobbyEnabled}
              onClick={onReturnToLobby}
            >
              Return to Lobby
            </Button>
          )}
          <Button variant="neutral" onClick={onReturnToMenu}>
            Main Menu
          </Button>
        </div>
        {onReturnToLobby && !returnToLobbyEnabled && (
          <Hint className="mt-3">
            Waiting for the host to return to the lobby…
          </Hint>
        )}
      </Panel>
    </Screen>
  );
}
