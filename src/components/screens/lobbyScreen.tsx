import { useState } from "react";
import { getDiscordSdk, isDiscordActivity } from "../../discord/client";
import { DISCORD_CONFIG } from "../../game/core/config";
import { RoomPlayer } from "../../types/multiplayer";
import { Button, Heading, LinkButton, Panel, Screen } from "../ui";

interface LobbyScreenProps {
  roomCode: string | null;
  /** Pre-fills the join box — set when launched from a Discord invite. */
  initialJoinCode?: string;
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

// Slot colours match the in-game player colours.
const SLOT_COLORS = ["#60a5fa", "#ef4444", "#4ade80", "#a78bfa"];

export function LobbyScreen({
  roomCode,
  initialJoinCode = "",
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
  const [joinCode, setJoinCode] = useState(initialJoinCode);
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

  const handleShareInvite = async () => {
    const sdk = getDiscordSdk();
    if (!sdk || !roomCode) return;
    try {
      await sdk.commands.shareLink({
        message: DISCORD_CONFIG.shareMessage,
        custom_id: `${DISCORD_CONFIG.roomCodePrefix}${roomCode}`,
      });
    } catch {
      // Invite sharing is best-effort.
    }
  };

  return (
    <Screen>
      <Panel width={440}>
        <Heading
          title="MULTIPLAYER"
          subtitle={inRoom ? "Room lobby" : "Create or join a room"}
          tone="cyan"
        />

        {/* Create / Join (only before entering a room) */}
        {!inRoom && (
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="nickname" className="ui-label block mb-2">
                Your nickname
              </label>
              <input
                id="nickname"
                type="text"
                value={name}
                maxLength={16}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter a nickname"
                className="ui-input"
              />
            </div>

            <Button
              block
              variant="purple"
              size="lg"
              disabled={!name.trim() || connecting}
              onClick={() => onCreate(name.trim())}
            >
              {connecting ? "Connecting…" : "Create Room"}
            </Button>

            <div className="flex items-center gap-3">
              <span className="flex-1 h-px bg-[var(--ui-line)]" />
              <span className="ui-label">or join</span>
              <span className="flex-1 h-px bg-[var(--ui-line)]" />
            </div>

            <div className="flex gap-3 items-stretch">
              <input
                type="text"
                value={joinCode}
                maxLength={4}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="CODE"
                aria-label="Room code"
                className="ui-input flex-1 min-w-0 text-center text-xl uppercase tracking-[0.3em] font-bold"
              />
              <Button
                variant="green"
                disabled={!name.trim() || joinCode.length !== 4 || connecting}
                onClick={() => onJoin(joinCode, name.trim())}
              >
                Join
              </Button>
            </div>
          </div>
        )}

        {/* In-room view */}
        {inRoom && (
          <div className="flex flex-col gap-5">
            {/* Room code display */}
            <div className="text-center">
              <p className="ui-label mb-2">Room Code</p>
              <button
                type="button"
                onClick={handleCopyCode}
                title="Click to copy"
                className="ui-input inline-flex w-auto items-center gap-3 !px-5 !py-2 cursor-pointer hover:!border-[var(--ui-cyan)]"
              >
                <span className="text-4xl font-bold tracking-[0.3em] pl-[0.3em] text-[var(--ui-yellow)]">
                  {roomCode}
                </span>
                <span className="ui-label">{copied ? "Copied!" : "Copy"}</span>
              </button>
            </div>

            {/* Discord invite — only shown inside the Activity */}
            {isDiscordActivity() && (
              <Button block variant="discord" onClick={handleShareInvite}>
                Share invite on Discord
              </Button>
            )}

            {/* Player list */}
            <div>
              <p className="ui-label mb-2">Players ({participantCount}/4)</p>
              <div className="flex flex-col gap-2">
                {players.map((p) => (
                  <div
                    key={p.slot}
                    className="ui-section !p-0 flex items-center justify-between gap-3 px-3 py-2"
                    style={{ padding: "8px 12px" }}
                  >
                    <span className="flex items-center gap-2 font-bold">
                      <span
                        className="ui-dot"
                        style={{ backgroundColor: SLOT_COLORS[p.slot % SLOT_COLORS.length] }}
                      />
                      {p.name}
                      {p.isHost && (
                        <span className="ui-label !text-[var(--ui-yellow)]">Host</span>
                      )}
                    </span>
                    <span className="ui-label">Slot {p.slot + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Host controls */}
            {isHost ? (
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-3 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={fillBots}
                    onChange={(e) => setFillBots(e.target.checked)}
                    className="ui-checkbox"
                  />
                  Fill empty slots with bots
                </label>
                <Button
                  block
                  variant="green"
                  size="lg"
                  disabled={!canStart}
                  onClick={() => onStart(fillBots)}
                >
                  {canStart ? "Start Game" : "Need at least 2 participants"}
                </Button>
                <Button block variant="red" size="sm" onClick={onLeave}>
                  Leave Room
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 text-center">
                <p className="text-[var(--ui-muted)]">Waiting for host to start…</p>
                <Button block variant="red" size="sm" onClick={onLeave}>
                  Leave Room
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {error && <p className="ui-error mt-4">{error}</p>}

        {/* Back to menu */}
        <div className="mt-5 text-center">
          <LinkButton onClick={onBack}>← Back to menu</LinkButton>
        </div>
      </Panel>
    </Screen>
  );
}
