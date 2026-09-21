# Bomb Blast Arena 💣

A fun project and modern take on a classic grid-based bomber game with NPC opponents and online multiplayer.

## Quick Start

Requirements: Node.js 26 and Yarn 4.

```bash
git clone https://github.com/Fluxpuck/bomberman.git
cd bomberman
yarn install
yarn dev
```

Visit `http://localhost:3000` and start playing!

## Online Multiplayer

Online multiplayer uses a separate WebSocket relay server. Start it in a
second terminal:

```bash
yarn ws
```

This runs the relay on `ws://localhost:3001` (override with `WS_PORT` env var).
For production hosting, point clients at your server with the
`NEXT_PUBLIC_WS_URL` environment variable (e.g. `wss://your-host:3001`).

To play online:

1. Click **Multiplayer (Online)** on the start screen.
2. Enter a nickname and **Create Room** — you'll get a 4-letter code.
3. Share the code. Other players enter it and click **Join**.
4. The host can optionally fill empty slots with bots, then clicks
   **Start Game**.

The host's browser runs the game engine and streams authoritative state to
guests; guests send their keyboard input back to the host. Online host
simulation uses a timer loop and guests resend held input periodically, but
browsers can still heavily throttle fully backgrounded tabs. Keep the host
window running for reliable matches. A future server-authoritative simulation
would remove this browser limitation. Pause is disabled in online games.

## How to Play

**Controls**

- Move: `WASD` or `Arrow Keys`
- Bomb: `Spacebar`

**Power-ups**

- Extra bombs
- Increased blast range

**Objective**: Outlast up to 3 AI opponents by strategically placing bombs and destroying obstacles.

## Built With

- Next.js 16+ with Turbopack
- TypeScript
- Tailwind CSS

## License

MIT - Use freely and have fun!
