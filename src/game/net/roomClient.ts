import {
  ClientToServerMessage,
  GamePayload,
  RoomPlayer,
  ServerToClientMessage,
} from "../../types/multiplayer";
import { getServerUrl } from "../core/config";

// =========================
// Room client (singleton)
// =========================
// Thin wrapper around a WebSocket connection to the relay server. Handles
// the connection-management protocol (create/join/leave/lock/relay) and
// exposes event setters the UI and host/guest layers subscribe to.

type RoomHandler = (code: string, players: RoomPlayer[]) => void;
type RelayHandler = (from: number, payload: GamePayload) => void;
type ErrorHandler = (message: string) => void;
type HostLeftHandler = () => void;
type ReadyHandler = () => void;

class RoomClient {
  private static instance: RoomClient;
  private ws: WebSocket | null = null;
  private code: string | null = null;
  private slot: number | null = null;
  private name: string = "";

  private onReady: ReadyHandler | null = null;
  private onRoom: RoomHandler | null = null;
  private onRelay: RelayHandler | null = null;
  private onError: ErrorHandler | null = null;
  private onHostLeft: HostLeftHandler | null = null;

  private constructor() {}

  public static getInstance(): RoomClient {
    if (!RoomClient.instance) {
      RoomClient.instance = new RoomClient();
    }
    return RoomClient.instance;
  }

  // =========================
  // Event setters
  // =========================
  public setOnReady(handler: ReadyHandler | null) {
    this.onReady = handler;
  }
  public setOnRoom(handler: RoomHandler | null) {
    this.onRoom = handler;
  }
  public setOnRelay(handler: RelayHandler | null) {
    this.onRelay = handler;
  }
  public setOnError(handler: ErrorHandler | null) {
    this.onError = handler;
  }
  public setOnHostLeft(handler: HostLeftHandler | null) {
    this.onHostLeft = handler;
  }

  // =========================
  // Connection
  // =========================
  private connectPromise: Promise<void> | null = null;

  /** Open a WebSocket to the relay server. Resolves once connected. */
  public connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }
    // Reuse an in-flight connection attempt instead of opening a second
    // socket that would leak the first (its onclose would also clobber
    // this.ws while the new socket is live).
    if (this.connectPromise) {
      return this.connectPromise;
    }

    const connectAttempt = new Promise<void>((resolve, reject) => {
      const url = getServerUrl();
      const ws = new WebSocket(url);
      this.ws = ws;

      ws.onopen = () => {
        this.onReady?.();
        resolve();
      };
      ws.onerror = () => {
        reject(new Error("Could not connect to the relay server"));
      };
      ws.onclose = () => {
        this.ws = null;
      };
      ws.onmessage = (event) => this.handleMessage(event.data);
    }).finally(() => {
      this.connectPromise = null;
    });

    this.connectPromise = connectAttempt;
    return connectAttempt;
  }

  private handleMessage(raw: string) {
    let msg: ServerToClientMessage;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    switch (msg.t) {
      case "created":
        this.code = msg.code;
        this.slot = msg.slot;
        this.onRoom?.(msg.code, [
          { slot: msg.slot, name: this.name, isHost: true },
        ]);
        break;
      case "joined":
        this.code = msg.code;
        this.slot = msg.slot;
        break;
      case "room":
        this.onRoom?.(msg.code, msg.players);
        break;
      case "error":
        this.onError?.(msg.message);
        break;
      case "hostLeft":
        this.onHostLeft?.();
        this.reset();
        break;
      case "relay":
        this.onRelay?.(msg.from, msg.payload);
        break;
    }
  }

  // =========================
  // Outgoing messages
  // =========================
  private send(msg: ClientToServerMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  public createRoom(name: string) {
    this.name = name;
    this.send({ t: "create", name });
  }

  public joinRoom(code: string, name: string) {
    this.name = name;
    this.send({ t: "join", code, name });
  }

  public leaveRoom() {
    this.send({ t: "leave" });
    this.reset();
  }

  public lockRoom() {
    this.send({ t: "lock" });
  }

  /** Send a game payload to the host (guest -> host). */
  public sendToHost(payload: GamePayload) {
    this.send({ t: "relay", to: "host", payload });
  }

  /** Send a game payload to all guests (host -> guests). */
  public sendToGuests(payload: GamePayload) {
    this.send({ t: "relay", to: "guests", payload });
  }

  // =========================
  // Accessors
  // =========================
  public getRoomCode(): string | null {
    return this.code;
  }
  public getSlot(): number | null {
    return this.slot;
  }
  public getName(): string {
    return this.name;
  }

  /** Close the connection and clear local state. */
  public reset() {
    this.code = null;
    this.slot = null;
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }
}

export const roomClient = RoomClient.getInstance();
