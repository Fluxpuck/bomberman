import { useState } from "react";
import { RoomPlayer } from "../../types/multiplayer";

interface LobbyScreenProps {
  roomCode: string | null;
  players: RoomPlayer[];
  isHost: boolean;
  myName: string;
  error: string | null;
  connecting: boolean;
  onCreate: (name: string) => void;
  onJoin: (code: string, name: string) => void;
  onLeave: () => void;
  onStart: (fillBots: boolean) => void;
  onBack: () => void;
}

export function LobbyScreen({
  roomCode,
  players,
  isHost,
  myName,
  error,
  connecting,
  onCreate,
  onJoin,
  onLeave,
  onStart,
  onBack,
}: LobbyScreenProps) {
  const [name, setName] = useState(myName);
  const [joinCode, setJoinCode] = useState("");
  const [fillBots, setFillBots] = useState(true);
  const [copied, setCopied] = useState(false);

  const inRoom = roomCode !== null;
  const participantCount = players.length;
  const canStart = isHost && participantCount >= 2;

  const handleCopyCode = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available; ignore silently.
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 w-[420px] max-w-full shadow-2xl">
        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-1">Multiplayer</h1>
          <p className="text-gray-400 text-sm">
            {inRoom ? "Room lobby" : "Create or join a room"}
          </p>
        </div>

        {/* Name input (only before joining a room) */}
        {!inRoom && (
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1">
              Your nickname
            </label>
            <input
              type="text"
              value={name}
              maxLength={16}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a nickname"
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-gray-500"
            />
          </div>
        )}

        {/* Create / Join (only before entering a room) */}
        {!inRoom && (
          <>
            <button
              disabled={!name.trim() || connecting}
              onClick={() => onCreate(name.trim())}
              className="w-full py-3 mb-3 rounded-lg font-bold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {connecting ? "Connecting…" : "Create Room"}
            </button>

            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                maxLength={4}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="CODE"
                className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white uppercase tracking-widest text-center text-lg focus:outline-none focus:border-gray-500"
              />
              <button
                disabled={!name.trim() || joinCode.length !== 4 || connecting}
                onClick={() => onJoin(joinCode, name.trim())}
                className="px-5 py-2 rounded-lg font-bold text-white bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Join
              </button>
            </div>
          </>
        )}

        {/* In-room view */}
        {inRoom && (
          <>
            {/* Room code display */}
            <div className="mb-6 text-center">
              <p className="text-gray-400 text-sm mb-1">Room Code</p>
              <button
                onClick={handleCopyCode}
                title="Click to copy"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 hover:border-violet-500 transition-colors group"
              >
                <span className="text-4xl font-bold text-white tracking-[0.3em]">
                  {roomCode}
                </span>
                <span className="text-xs text-gray-500 group-hover:text-violet-400">
                  {copied ? "Copied!" : "Copy"}
                </span>
              </button>
            </div>

            {/* Player list */}
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">
                Players ({participantCount}/4)
              </p>
              <div className="space-y-2">
                {players.map((p) => (
                  <div
                    key={p.slot}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-800 border border-gray-700"
                  >
                    <span className="text-white">
                      {p.name}
                      {p.isHost && (
                        <span className="ml-2 text-xs text-violet-400 font-semibold">
                          (host)
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-gray-500">
                      {p.isHost ? "Slot 1" : `Slot ${p.slot + 1}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Host controls */}
            {isHost ? (
              <div className="mb-4">
                <label className="flex items-center gap-2 text-sm text-gray-300 mb-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fillBots}
                    onChange={(e) => setFillBots(e.target.checked)}
                    className="w-4 h-4"
                  />
                  Fill empty slots with bots
                </label>
                <button
                  disabled={!canStart}
                  onClick={() => onStart(fillBots)}
                  className="w-full py-3 mb-2 rounded-lg font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {canStart
                    ? "Start Game"
                    : "Need at least 2 participants"}
                </button>
                <button
                  onClick={onLeave}
                  className="w-full py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
                >
                  Leave Room
                </button>
              </div>
            ) : (
              <div className="mb-4 text-center">
                <p className="text-gray-400 mb-3">Waiting for host to start…</p>
                <button
                  onClick={onLeave}
                  className="w-full py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
                >
                  Leave Room
                </button>
              </div>
            )}
          </>
        )}

        {/* Error message */}
        {error && (
          <p className="mt-3 text-center text-red-400 text-sm">{error}</p>
        )}

        {/* Back to menu */}
        <button
          onClick={onBack}
          className="mt-4 w-full text-center text-gray-500 hover:text-gray-300 text-sm"
        >
          ← Back to menu
        </button>
      </div>
    </div>
  );
}
