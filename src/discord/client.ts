// =========================
// Discord Embedded App SDK client
// =========================
// Lazily initializes the SDK only when the game is running inside Discord's
// Activity iframe (detected via the `frame_id` query param Discord injects
// into the iframe URL). Handles OAuth authorization. The multiplayer relay
// is not routed through here — roomClient dials the proxied /ws path on the
// activity origin directly (see relayWsUrl in net/roomClient.ts).
//
// The SDK is imported dynamically so it never loads — and the handshake never
// runs — in a plain browser tab. Every export is safe to call anywhere.

import type { DiscordSDK } from "@discord/embedded-app-sdk";
import { DISCORD_CONFIG, getDiscordClientId } from "../game/core/config";

let sdk: DiscordSDK | null = null;
let initPromise: Promise<DiscordSDK | null> | null = null;
// Room code delivered by an ACTIVITY_JOIN dispatch (Discord's "Join" button
// on a friend's presence) — consumed the same way as a shareLink custom_id.
let activityJoinRoomCode: string | null = null;
// The authenticated user's Discord display name — pre-fills the lobby
// nickname and enables one-click room joins.
let discordUserName: string | null = null;
let onActivityJoinRoom: ((code: string) => void) | null = null;

/** True when the page is loaded inside Discord's Activity iframe. */
export function isDiscordActivity(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("frame_id");
}

/** The initialized SDK instance, or null outside Discord / before init. */
export function getDiscordSdk(): DiscordSDK | null {
  return sdk;
}

/** Extract the room code from a `room:<CODE>` value, or null. */
function parseRoomCode(value: string | null): string | null {
  if (!value) return null;
  const prefix = DISCORD_CONFIG.roomCodePrefix;
  return value.startsWith(prefix) ? value.slice(prefix.length) : null;
}

/**
 * The room code Discord launched us into, if any — from a shareLink
 * invite's `custom_id` or an ACTIVITY_JOIN join secret (both `room:<CODE>`).
 */
export function getLaunchRoomCode(): string | null {
  return parseRoomCode(sdk?.customId ?? null) ?? activityJoinRoomCode;
}

/** The authenticated user's Discord display name, or null before auth. */
export function getDiscordUserName(): string | null {
  return discordUserName;
}

/**
 * Register a handler fired when Discord dispatches ACTIVITY_JOIN — i.e.
 * this client entered the Activity via the "Join" button on a presence.
 */
export function setOnActivityJoinRoom(
  handler: ((code: string) => void) | null
): void {
  onActivityJoinRoom = handler;
}

/**
 * Initialize the SDK and authenticate the user. Resolves to the SDK when
 * running inside Discord, or null otherwise. Presence is best-effort — a
 * failed init must never break the game, so failures resolve to null.
 */
export function initDiscordClient(): Promise<DiscordSDK | null> {
  if (sdk) return Promise.resolve(sdk);
  if (initPromise) return initPromise;
  if (!isDiscordActivity()) return Promise.resolve(null);

  const clientId = getDiscordClientId();
  if (!clientId) {
    console.warn(
      "[discord] NEXT_PUBLIC_DISCORD_CLIENT_ID is not set — Discord features disabled"
    );
    return Promise.resolve(null);
  }

  initPromise = (async () => {
    const { DiscordSDK: SDK } = await import("@discord/embedded-app-sdk");

    const instance = new SDK(clientId);
    await instance.ready();

    // Joins via the "Join" button on a friend's presence arrive as an
    // ACTIVITY_JOIN dispatch carrying the host's join secret (room:<CODE>).
    // Subscribe right after ready so the dispatch can't slip past during
    // OAuth; a failed subscription must not take down the whole init.
    instance
      .subscribe("ACTIVITY_JOIN", ({ secret }) => {
        const code = parseRoomCode(secret);
        if (!code) return;
        activityJoinRoomCode = code;
        onActivityJoinRoom?.(code);
      })
      .catch(() => {});

    const { code } = await instance.commands.authorize({
      client_id: clientId,
      response_type: "code",
      state: "",
      prompt: "none",
      // OAuthScopes isn't exported from the package's public types; the
      // config values are literals within that union, so narrow here.
      scope: DISCORD_CONFIG.oauthScopes as Array<
        "identify" | "rpc.activities.write"
      >,
    });

    const response = await fetch("/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (!response.ok) throw new Error("Token exchange failed");
    const { access_token } = await response.json();

    const { user } = await instance.commands.authenticate({ access_token });
    discordUserName = user.global_name ?? user.username;

    sdk = instance;
    return sdk;
  })().catch((error) => {
    // The SDK stays null and every Discord feature silently dies without
    // this — surface the real failure (bad client id, token-exchange 500,
    // rejected authorize) in the activity console.
    console.error("[discord] init failed:", error);
    initPromise = null;
    return null;
  });

  return initPromise;
}
