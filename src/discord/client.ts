// =========================
// Discord Embedded App SDK client
// =========================
// Lazily initializes the SDK only when the game is running inside Discord's
// Activity iframe (detected via the `frame_id` query param Discord injects
// into the iframe URL). Handles OAuth authorization and patches WebSocket so
// the multiplayer relay is routed through Discord's URL-mapping proxy.
//
// The SDK is imported dynamically so it never loads — and the handshake never
// runs — in a plain browser tab. Every export is safe to call anywhere.

import type { DiscordSDK } from "@discord/embedded-app-sdk";
import {
  DISCORD_CONFIG,
  getDiscordClientId,
  getServerUrl,
} from "../game/core/config";

let sdk: DiscordSDK | null = null;
let initPromise: Promise<DiscordSDK | null> | null = null;

/** True when the page is loaded inside Discord's Activity iframe. */
export function isDiscordActivity(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("frame_id");
}

/** The initialized SDK instance, or null outside Discord / before init. */
export function getDiscordSdk(): DiscordSDK | null {
  return sdk;
}

/**
 * The room code embedded in a shareLink invite, if this Activity was
 * launched from one (the invite carries `custom_id: "room:<CODE>"`).
 */
export function getLaunchRoomCode(): string | null {
  if (!sdk || !sdk.customId) return null;
  const prefix = DISCORD_CONFIG.roomCodePrefix;
  return sdk.customId.startsWith(prefix)
    ? sdk.customId.slice(prefix.length)
    : null;
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
  if (!clientId) return Promise.resolve(null);

  initPromise = (async () => {
    const { DiscordSDK: SDK, patchUrlMappings } = await import(
      "@discord/embedded-app-sdk"
    );

    const instance = new SDK(clientId);
    await instance.ready();

    // Route the relay WebSocket through Discord's URL-mapping proxy —
    // external connections from the iframe must go via /.proxy. The target
    // is a host (no scheme), matching the portal's /ws mapping.
    patchUrlMappings(
      [
        {
          prefix: DISCORD_CONFIG.wsProxyPrefix,
          target: new URL(getServerUrl()).host,
        },
      ],
      { patchWebSocket: true, patchFetch: false, patchXhr: false }
    );

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

    await instance.commands.authenticate({ access_token });

    sdk = instance;
    return sdk;
  })().catch(() => {
    initPromise = null;
    return null;
  });

  return initPromise;
}
