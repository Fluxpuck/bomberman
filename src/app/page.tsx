"use client";

import { useEffect, useState } from "react";
import { GameState, GameMode } from "../types/game";
import Game from "./game";
import { resetGrid } from "../game/grid";
import { tracker } from "../game/tracker";
import { GAME_CONFIG } from "../game/config";
import {
  initializePlayers,
  startEngine,
  stopEngine,
  setOnPlayerDead,
  setOnTimeOver,
  setOnWin,
  setDesiredPlayersCount,
} from "../game/engine";
import { StartScreen } from "../components/screens/startScreen";
import { EndScreen } from "../components/screens/endScreen";
import { GameHUD } from "../components/screens/gameHud";
import { PlayersHUD } from "../components/screens/playerHud";
import { AudioController } from "../components/AudioController";

export default function Home() {
  // Game state
  const [gameMode, setGameMode] = useState<GameMode>("solo");
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [timeElapsedMs, setTimeElapsedMs] = useState(0);
  const [winner, setWinner] = useState<any>(undefined);

  // Initialize game when mode changes
  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;

    // Initialize players based on game mode
    initializePlayers();

    // Set up event handlers
    setOnPlayerDead(() => {
      setGameState(GameState.GAME_OVER);
    });

    setOnTimeOver(() => {
      setGameState(GameState.GAME_OVER);
    });

    setOnWin((winnerId) => {
      // Get the full player stats object for the winner
      const winnerStats = tracker.getPlayer(winnerId)?.getStats();
      setWinner(winnerStats);
      setGameState(GameState.WIN);
    });

    // Start the game engine
    startEngine();

    // Update time elapsed
    const timeInterval = setInterval(() => {
      setTimeElapsedMs(tracker.timeElapsedMs);
    }, 100);

    // Clean up
    return () => {
      stopEngine();
      clearInterval(timeInterval);
    };
  }, [gameState, gameMode]);

  console.log("gameState", gameState);

  // Handle game start
  const handleGameStart = (mode: GameMode) => {
    setGameMode(mode);
    setGameState(GameState.PLAYING);
    setTimeElapsedMs(0);
    resetGrid();
    tracker.reset();
    tracker.startGame();

    // Set the desired player count based on the game mode
    switch (mode) {
      case "solo":
        setDesiredPlayersCount(1);
        break;
      case "2 players":
        setDesiredPlayersCount(2);
        break;
      case "3 players":
        setDesiredPlayersCount(3);
        break;
      case "4 players":
        setDesiredPlayersCount(4);
        break;
      default:
        setDesiredPlayersCount(1);
    }
  };

  // Handle game restart
  const handleGameRestart = () => {
    setGameState(GameState.START);
    setTimeElapsedMs(0);
    setWinner(undefined);
  };

  // Get player stats for HUD
  const getPlayerStats = () => {
    return tracker.getPlayers().map((player) => player.getStats());
  };

  return (
    <main className="min-h-screen flex items-center justify-center relative bg-gray-900 text-white overflow-hidden">
      {/* Background */}
      <div
        className="fixed inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/background.jpg)" }}
      />

      {/* Audio Controller - Always visible */}
      <AudioController autoPlay={true} />

      {/* Game Content */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        {/* Game HUD - Only show during gameplay */}
        {gameState === GameState.PLAYING && (
          <>
            <GameHUD
              timeElapsedMs={timeElapsedMs}
              gameTimeLimit={GAME_CONFIG.timeLimit}
            />
            <PlayersHUD players={getPlayerStats()} />
          </>
        )}

        {/* Game Screen */}
        {gameState === GameState.PLAYING && <Game mode={gameMode} />}

        {/* Start Screen */}
        {gameState === GameState.START && (
          <StartScreen onStart={handleGameStart} />
        )}

        {/* End Screen */}
        {(gameState === GameState.GAME_OVER || gameState === GameState.WIN) && (
          <EndScreen
            gameState={gameState}
            winner={winner}
            timeLeft={GAME_CONFIG.timeLimit * 1000 - timeElapsedMs}
            gameStats={tracker.getGameStats()}
            onReturnToMenu={handleGameRestart}
            onPlayAgain={() => handleGameStart(gameMode)}
          />
        )}
      </div>
    </main>
  );
}
