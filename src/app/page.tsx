"use client";

import { useEffect, useRef, useState } from "react";
import { AudioController } from "../components/AudioController";
import { EndScreen } from "../components/screens/endScreen";
import { GameHUD } from "../components/screens/gameHud";
import { LobbyScreen } from "../components/screens/lobbyScreen";
import { MapSelectScreen } from "../components/screens/mapSelectScreen";
import { PauseScreen } from "../components/screens/pauseScreen";
import { PlayersHUD } from "../components/screens/playerHud";
import { StartScreen } from "../components/screens/startScreen";
import { TouchControls } from "../components/touchControls";
import { GAME_CONFIG } from "../game/core/config";
import {
  eliminatePlayer,
  getGameState,
  getLocalPlayerId,
  initializePlayers,
  pauseGame,
  pressLocalBomb,
  queuePlayerMove,
  resumeGame,
  setDesiredPlayersCount,
  setOnPlayerDead,
  setOnTimeOver,
  setOnWin,
  setRoster,
  startEngine,
  stopEngine
} from "../game/engine";
import { resetGrid } from "../game/grid";
import { PlayerStats, tracker } from "../game/hooks/tracker";
import { setMapPattern } from "../game/maps";
import {
  getLatestGameOver,
  getLatestStats,
  getLatestTimeElapsedMs,
  getMyPlayerId,
  handleHostPayload,
  sendGuestBomb,
  sendGuestMove,
  startGuestView,
  stopGuestView
} from "../game/net/guest";
import {
  handleGuestPayload,
  sendGameOver,
  sendStart,
  startHosting,
  stopHosting,
} from "../game/net/host";
import { roomClient } from "../game/net/roomClient";
import { Direction, GameMode, GameState } from "../types/game";
import { GamePayload, RoomPlayer, RosterEntry } from "../types/multiplayer";
import Game from "./game";

export default function Home() {
  // Game state
  const [gameMode, setGameMode] = useState<GameMode>("solo");
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [timeElapsedMs, setTimeElapsedMs] = useState(0);
  const [winner, setWinner] = useState<PlayerStats | undefined>(undefined);

  // Lobby state
  const [lobbyState, setLobbyState] = useState<{
    code: string | null;
    players: RoomPlayer[];
    isHost: boolean;
    error: string | null;
    connecting: boolean;
    myName: string;
  }>({
    code: null,
    players: [],
    isHost: false,
    error: null,
    connecting: false,
    myName: "",
  });

  // True when this client is an online guest (joined someone else's room).
  const [isGuest, setIsGuest] = useState(false);

  // The host's roster, kept in a ref so the PLAYING effect and relay handler
  // can read it without re-subscribing.
  const rosterRef = useRef<RosterEntry[]>([]);

  // Pending start params held while the map-select screen is shown. The
  // online entry carries the host's "fill bots" choice; null = local game.
  const pendingModeRef = useRef<GameMode>("solo");
  const pendingOnlineFillBotsRef = useRef<boolean | null>(null);

  // =========================
  // Relay dispatch (kept in a ref so the roomClient callback always calls
  // the latest version with current isGuest/gameMode values, avoiding a
  // stale closure from the mount-time useEffect).
  // =========================
  const handleRelayRef = useRef<(from: number, payload: GamePayload) => void>(
    () => {}
  );

  const handleRelay = (from: number, payload: GamePayload) => {
    if (isGuest) {
      // Guest receives host payloads.
      if (payload.t === "start") {
        startGuestView(payload);
        setGameState(GameState.PLAYING);
      } else if (payload.t === "gameOver") {
        handleHostPayload(payload);
        setGameState(payload.state === "WIN" ? GameState.WIN : GameState.GAME_OVER);
      } else {
        handleHostPayload(payload);
      }
    } else {
      // Host receives guest input.
      handleGuestPayload(from, payload, rosterRef.current);
    }
  };
  handleRelayRef.current = handleRelay;

  // =========================
  // Room client event wiring
  // =========================
  useEffect(() => {
    roomClient.setOnRoom((code, players) => {
      // Mid-game guest disconnect (host only): eliminate the departed remote
      // player so they don't linger as a frozen character. rosterRef is only
      // populated on the host, so this block never runs on guests.
      if (
        getGameState() === GameState.PLAYING &&
        rosterRef.current.length > 0
      ) {
        const remainingSlots = new Set(players.map((p) => p.slot));
        rosterRef.current = rosterRef.current.filter((entry) => {
          const isDepartedRemote =
            entry.control === "remote" && !remainingSlots.has(entry.slot);
          if (isDepartedRemote) eliminatePlayer(entry.id);
          return !isDepartedRemote;
        });
      }

      const mySlot = roomClient.getSlot();
      const me = players.find((p) => p.slot === mySlot);
      setLobbyState((prev) => ({
        ...prev,
        code,
        players,
        isHost: me?.isHost ?? false,
        myName: me?.name ?? prev.myName,
        error: null,
        connecting: false,
      }));
    });

    roomClient.setOnError((message) => {
      setLobbyState((prev) => ({ ...prev, error: message, connecting: false }));
    });

    roomClient.setOnHostLeft(() => {
      // If we were mid-game, stop the guest view and return to the start.
      stopGuestView();
      setIsGuest(false);
      setGameState(GameState.START);
      setLobbyState((prev) => ({
        ...prev,
        code: null,
        players: [],
        isHost: false,
        error: "Host left the game",
        connecting: false,
      }));
    });

    roomClient.setOnRelay((from, payload) => {
      handleRelayRef.current(from, payload);
    });

    return () => {
      roomClient.setOnRoom(null);
      roomClient.setOnError(null);
      roomClient.setOnHostLeft(null);
      roomClient.setOnRelay(null);
    };
     
  }, []);

  // =========================
  // Escape key (pause) — disabled in online games
  // =========================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (gameMode === "online") return; // online games can't pause

      if (gameState === GameState.PLAYING) {
        pauseGame();
        setGameState(GameState.PAUSED);
      } else if (gameState === GameState.PAUSED) {
        resumeGame();
        setGameState(GameState.PLAYING);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState, gameMode]);

  // =========================
  // Game lifecycle (PLAYING effect)
  // =========================
  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;

    if (gameMode === "online" && isGuest) {
      // Guest: no engine to start. The guest view was already started by the
      // relay handler. Just poll the latest snapshot for the HUD/time.
      const timeInterval = setInterval(() => {
        setTimeElapsedMs(getLatestTimeElapsedMs());
      }, 100);

      return () => {
        clearInterval(timeInterval);
      };
    }

    // Host or solo/local: initialize players, start the engine, wire callbacks.
    initializePlayers();

    setOnPlayerDead((winnerId) => {
      setWinner(winnerId ? tracker.getPlayer(winnerId)?.getStats() : undefined);
      setGameState(GameState.GAME_OVER);
      if (gameMode === "online") {
        sendGameOver(getGameState(), winnerId);
      }
    });

    setOnTimeOver(() => {
      setGameState(GameState.GAME_OVER);
      if (gameMode === "online") {
        sendGameOver(getGameState());
      }
    });

    setOnWin((winnerId) => {
      const winnerStats = tracker.getPlayer(winnerId)?.getStats();
      setWinner(winnerStats);
      setGameState(GameState.WIN);
      if (gameMode === "online") {
        sendGameOver(getGameState(), winnerId);
      }
    });

    startEngine();

    // For online host: start relaying snapshots + blasts.
    if (gameMode === "online" && !isGuest) {
      startHosting(rosterRef.current);
    }

    const timeInterval = setInterval(() => {
      setTimeElapsedMs(tracker.timeElapsedMs);
    }, 100);

    return () => {
      stopEngine();
      if (gameMode === "online" && !isGuest) {
        stopHosting();
      }
      clearInterval(timeInterval);
    };
     
  }, [gameState, gameMode, isGuest]);

  // =========================
  // Start screen handlers (solo/local)
  // =========================
  const handleGameStart = (mode: GameMode) => {
    pendingModeRef.current = mode;
    pendingOnlineFillBotsRef.current = null;
    setGameState(GameState.MAP_SELECT);
  };

  // Actually launches a solo/local game once a map has been chosen.
  const startLocalGame = (mode: GameMode) => {
    setIsGuest(false);
    setGameMode(mode);
    setGameState(GameState.PLAYING);
    setTimeElapsedMs(0);
    setWinner(undefined);
    resetGrid();
    tracker.reset();
    tracker.startGame();

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

  // =========================
  // Lobby handlers
  // =========================
  const handleMultiplayer = () => {
    setGameState(GameState.LOBBY);
    setLobbyState({
      code: null,
      players: [],
      isHost: false,
      error: null,
      connecting: false,
      myName: "",
    });
    setIsGuest(false);
  };

  const handleCreateRoom = async (name: string) => {
    setLobbyState((prev) => ({ ...prev, connecting: true, error: null, myName: name }));
    try {
      await roomClient.connect();
      roomClient.createRoom(name);
    } catch {
      setLobbyState((prev) => ({
        ...prev,
        connecting: false,
        error: "Could not connect to the server",
      }));
    }
  };

  const handleJoinRoom = async (code: string, name: string) => {
    setLobbyState((prev) => ({ ...prev, connecting: true, error: null, myName: name }));
    setIsGuest(true);
    setGameMode("online");
    try {
      await roomClient.connect();
      roomClient.joinRoom(code, name);
    } catch {
      setLobbyState((prev) => ({
        ...prev,
        connecting: false,
        error: "Could not connect to the server",
      }));
      setIsGuest(false);
      setGameMode("solo");
    }
  };

  const handleLeaveRoom = () => {
    roomClient.leaveRoom();
    setIsGuest(false);
    setLobbyState({
      code: null,
      players: [],
      isHost: false,
      error: null,
      connecting: false,
      myName: "",
    });
  };

  const handleLobbyBack = () => {
    roomClient.reset();
    stopGuestView();
    setIsGuest(false);
    setGameState(GameState.START);
    setLobbyState({
      code: null,
      players: [],
      isHost: false,
      error: null,
      connecting: false,
      myName: "",
    });
  };

  // =========================
  // Host: start the online game
  // =========================
  const handleStartOnlineGame = (fillBots: boolean) => {
    pendingOnlineFillBotsRef.current = fillBots;
    setGameState(GameState.MAP_SELECT);
  };

  // Actually launches the online game once the host has chosen a map.
  const startOnlineGame = (fillBots: boolean) => {
    const mySlot = roomClient.getSlot();
    const roster: RosterEntry[] = lobbyState.players.map((p) => ({
      id: `player-${p.slot + 1}`,
      name: p.name,
      control: p.slot === mySlot ? "local" : "remote",
      slot: p.slot,
    }));

    // Fill remaining slots with bots if requested.
    if (fillBots) {
      let botIndex = 1;
      for (let slot = roster.length; slot < 4; slot++) {
        roster.push({
          id: `computer-${botIndex}`,
          name: `Computer ${botIndex}`,
          control: "computer",
          slot,
        });
        botIndex++;
      }
    }

    rosterRef.current = roster;

    // Lock the room so no one else can join mid-game.
    roomClient.lockRoom();

    // Reset the grid and tracker for a fresh round.
    resetGrid();
    tracker.reset();
    tracker.startGame();
    setRoster(roster);

    // Tell guests to build the grid + characters.
    sendStart(roster);

    // Switch to playing; the PLAYING effect initializes players + engine.
    setGameMode("online");
    setIsGuest(false);
    setWinner(undefined);
    setTimeElapsedMs(0);
    setGameState(GameState.PLAYING);
  };

  // =========================
  // Map select
  // =========================
  const handleMapSelect = (mapId: string) => {
    setMapPattern(mapId);
    const fillBots = pendingOnlineFillBotsRef.current;
    if (fillBots !== null) {
      startOnlineGame(fillBots);
    } else {
      startLocalGame(pendingModeRef.current);
    }
  };

  const handleMapSelectBack = () => {
    if (pendingOnlineFillBotsRef.current !== null) {
      pendingOnlineFillBotsRef.current = null;
      setGameState(GameState.LOBBY);
    } else {
      setGameState(GameState.START);
    }
  };

  // =========================
  // Restart / return to menu
  // =========================
  const handleGameRestart = () => {
    if (gameMode === "online") {
      // Leave the room and return to the start screen.
      roomClient.reset();
      stopGuestView();
      stopHosting();
      setIsGuest(false);
    }
    setGameState(GameState.START);
    setTimeElapsedMs(0);
    setWinner(undefined);
  };

  const handlePlayAgain = () => {
    if (gameMode === "online" && isGuest) return; // guests can't restart

    if (gameMode === "online" && !isGuest) {
      // Host restarts with the same roster.
      resetGrid();
      tracker.reset();
      tracker.startGame();
      setRoster(rosterRef.current);
      sendStart(rosterRef.current);
      setWinner(undefined);
      setTimeElapsedMs(0);
      setGameState(GameState.PLAYING);
      return;
    }

    // Solo/local: restart straight away with the same map selection — a
    // "random" pick re-rolls on this reset.
    startLocalGame(gameMode);
  };

  // =========================
  // HUD stats
  // =========================
  const getPlayerStats = () => {
    if (gameMode === "online" && isGuest) {
      return getLatestStats();
    }
    return tracker.getPlayers().map((player) => player.getStats());
  };

  // The end screen only shows the local player's own stats.
  const getOwnStats = (): PlayerStats[] => {
    const all = getPlayerStats();
    if (gameMode === "online" && isGuest) {
      const myId = getMyPlayerId();
      return all.filter((player) => player.id === myId);
    }
    if (gameMode === "online") {
      const myId = rosterRef.current.find(
        (entry) => entry.control === "local"
      )?.id;
      return all.filter((player) => player.id === myId);
    }
    return all.filter((player) => player.isPlayer);
  };

  // =========================
  // End screen winner/stats
  // =========================
  const getEndWinner = () => {
    if (gameMode === "online" && isGuest) {
      return getLatestGameOver()?.winner;
    }
    return winner;
  };

  const getEndGameStats = () => {
    if (gameMode === "online" && isGuest) {
      return getLatestGameOver()?.gameStats ?? tracker.getGameStats();
    }
    return tracker.getGameStats();
  };

  // Whether to show the "Play Again" button (host or solo/local only).
  const canPlayAgain = !(gameMode === "online" && isGuest);

  // =========================
  // Touch controls
  // =========================
  const handleTouchMove = (direction: Direction) => {
    if (gameMode === "online" && isGuest) {
      sendGuestMove(direction);
      return;
    }
    const playerId = getLocalPlayerId();
    if (playerId) queuePlayerMove(playerId, direction);
  };

  const handleTouchBomb = () => {
    if (gameMode === "online" && isGuest) {
      sendGuestBomb();
      return;
    }
    pressLocalBomb();
  };

  return (
    <main className="min-h-screen flex items-center justify-center relative bg-gray-900 text-white overflow-hidden">
      {/* Background */}
      <div
        className="fixed inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/image/background.jpg)" }}
      />

      {/* Audio Controller - Always visible */}
      <AudioController autoPlay={true} />

      {/* Game Content (padding reserves room for the HUD strip and touch
          controls in portrait orientation) */}
      <div className="relative z-10 w-full h-full flex items-center justify-center portrait:pt-28 portrait:pb-64">
        {/* Game HUD - Show during gameplay and when paused */}
        {(gameState === GameState.PLAYING ||
          gameState === GameState.PAUSED) && (
          <>
            <GameHUD
              timeElapsedMs={timeElapsedMs}
              gameTimeLimit={GAME_CONFIG.timeLimit}
            />
            <PlayersHUD players={getPlayerStats()} />
          </>
        )}

        {/* Game Screen - Show during gameplay and when paused */}
        {(gameState === GameState.PLAYING ||
          gameState === GameState.PAUSED) && <Game />}

        {/* Touch Controls - only rendered on touch-capable devices */}
        {gameState === GameState.PLAYING && (
          <TouchControls onMove={handleTouchMove} onBomb={handleTouchBomb} />
        )}

        {/* Start Screen */}
        {gameState === GameState.START && (
          <StartScreen onStart={handleGameStart} onMultiplayer={handleMultiplayer} />
        )}

        {/* Map Select Screen */}
        {gameState === GameState.MAP_SELECT && (
          <MapSelectScreen
            onSelect={handleMapSelect}
            onBack={handleMapSelectBack}
          />
        )}

        {/* Lobby Screen */}
        {gameState === GameState.LOBBY && (
          <LobbyScreen
            roomCode={lobbyState.code}
            players={lobbyState.players}
            isHost={lobbyState.isHost}
            myName={lobbyState.myName}
            error={lobbyState.error}
            connecting={lobbyState.connecting}
            onCreate={handleCreateRoom}
            onJoin={handleJoinRoom}
            onLeave={handleLeaveRoom}
            onStart={handleStartOnlineGame}
            onBack={handleLobbyBack}
          />
        )}

        {/* Pause Screen */}
        {gameState === GameState.PAUSED && (
          <PauseScreen
            onReturnToMenu={handleGameRestart}
            onResume={() => {
              resumeGame();
              setGameState(GameState.PLAYING);
            }}
          />
        )}

        {/* End Screen */}
        {(gameState === GameState.GAME_OVER || gameState === GameState.WIN) && (
          <EndScreen
            gameState={gameState}
            winner={getEndWinner()}
            players={getOwnStats()}
            timeLeft={GAME_CONFIG.timeLimit * 1000 - timeElapsedMs}
            gameStats={getEndGameStats()}
            onReturnToMenu={handleGameRestart}
            onPlayAgain={canPlayAgain ? handlePlayAgain : undefined}
          />
        )}
      </div>
    </main>
  );
}
