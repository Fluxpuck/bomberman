"use client";

import { useEffect, useState } from "react";
import { resetGrid } from "../game/_grid";
import {
  initializePlayers,
  startEngine,
  stopEngine,
  setOnPlayerDead,
  setOnTimeOver,
  getGameState,
} from "../game/_engine";
import { tracker } from "../game/_tracker";
import { GameHUD } from "../components/screens/gameHud";
import { StartScreen } from "../components/screens/startScreen";
import { EndScreen } from "../components/screens/endScreen";
import { GameState, GameMode } from "../types/game";

import { PlayersHUD } from "../components/screens/playerHud";
import { AudioController } from "../components/AudioController";
import Game from "./game";

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

  // Handle game start
  const handleGameStart = (mode: GameMode) => {
    setGameMode(mode);
    setGameState(GameState.PLAYING);
    setTimeElapsedMs(0);
    resetGrid();
    tracker.reset();
    tracker.startGame();
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

      {/* Game Content */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        {/* Audio Controller - Always visible */}
        <AudioController autoPlay={gameState === GameState.PLAYING} />

        {/* Game HUD - Only show during gameplay */}
        {gameState === GameState.PLAYING && (
          <>
            <GameHUD timeElapsedMs={timeElapsedMs} gameTimeLimit={300} />
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
            timeLeft={300000 - timeElapsedMs} // 5 minutes in ms
            gameStats={tracker.getGameStats()}
            onReturnToMenu={handleGameRestart}
            onPlayAgain={() => handleGameStart(gameMode)}
          />
        )}
      </div>
    </main>
  );
}
