# AGENT.md

Guidance for AI coding agents working in this repository.

## Project Overview

**lo-fi-bomberman** is a browser-based Bomberman game built with Next.js 14 (App Router), TypeScript, and Tailwind CSS. It supports 1-4 players (1 human + up to 3 AI opponents) with bomb placement, destructible barrels, power-ups, and a timed game mode.

The game loop and rendering are **imperative DOM manipulation** driven by `requestAnimationFrame`, not React state. React is used only for the surrounding UI (screens, HUDs, audio controls). The game grid is a real DOM element built with `document.createElement`.

## Commands

Dependencies must be installed first (`yarn install`) — `node_modules` is gitignored. The project requires Node.js 26 and Yarn 4.

- `yarn dev` — start the Next.js dev server (visit `http://localhost:3000`)
- `yarn build` — production build
- `yarn start` — run the production build
- `yarn lint` — run ESLint (`next/core-web-vitals`)

There is **no test framework** configured. There are no unit/integration/e2e tests.

## Tech Stack

- **Next.js 14.2.5** (App Router) + **React 18** + **TypeScript 5.5** (strict mode)
- **Tailwind CSS 3.4** for UI styling; game elements use inline styles
- Path alias: `@/*` maps to `./src/*` (see `tsconfig.json`)
- ESLint config: `next/core-web-vitals` (see `.eslintrc.json`)

## Architecture

### Directory layout

```
src/
  app/                 Next.js App Router (page, layout, game canvas)
  components/          React UI components
    screens/           Start, Pause, End screens + HUDs
    AudioController.tsx
  game/                Vanilla TS game engine (no React)
    core/              Config constants (config.ts); other files are empty stubs
    assets/            DOM element factories (blocks, character, dynamite, powerups)
    hooks/             tracker.ts (stats), sound.ts (audio); other files are empty stubs
    engine.ts          Game loop, input handling, lifecycle, win conditions
    grid.ts            Grid generation + DOM building + walkability
    player.ts          Character/Player/Computer classes + CharacterManager singleton
    ai.ts              AI movement logic
    animations.ts      Bomb fuse, explosions, chain reactions, barrel destruction
    powerup.ts         Power-up pickup detection
    bombs.ts           Unused interface (legacy)
  hooks/               React hooks (useAudio.ts)
  types/               Shared types (game.ts, assets.d.ts)
public/                Static assets (images, music, soundFX)
```

### Key modules

| Module | Responsibility |
| --- | --- |
| `src/game/engine.ts` | Main `requestAnimationFrame` loop, keyboard input, movement, bomb placement, blast-cell damage, win conditions, game lifecycle (`startEngine`/`stopEngine`/`pauseGame`/`resumeGame`) |
| `src/game/grid.ts` | Generates the grid layout (borders, checkerboard solids, random barrels, corner spawn zones), builds the DOM grid, exposes `isWalkable`/`getCellAt`/`resetGrid`/`updateGridLayout` |
| `src/game/player.ts` | `Character` base class (lives, damage cooldown, immunity, inventory, bomb range), `Player` and `Computer` subclasses, `CharacterManager` singleton |
| `src/game/ai.ts` | `updateComputerPlayers` — simple random-movement AI with random bomb placement |
| `src/game/animations.ts` | `armDynamite` — bomb fuse timer, explosion propagation, barrel destruction, chain reactions, power-up drops |
| `src/game/powerup.ts` | `checkPowerupPickup` — detects and applies power-ups when a character steps on them |
| `src/game/core/config.ts` | All tunable constants: `GAME_CONFIG`, `GRID_PATTERN`, `PLAYER_CONFIG`, `BOMB_CONFIG`, `SCORE_CONFIG`, `POWERUP_CONFIG` |
| `src/game/hooks/tracker.ts` | `GameTracker` + `PlayerTracker` singletons — stats, scores, kills, time tracking, explosion damage application |
| `src/game/hooks/sound.ts` | `playSound`/`stopSound` — cached `HTMLAudioElement` playback from `public/soundFX/` |
| `src/types/game.ts` | Shared types: `Position`, `GridPosition`, `Direction`, `CellType`, `GameState`, `GameMode`, `Player`, `Bomb`, `Explosion`, `GameConfig` |
| `src/app/page.tsx` | Root page — manages `GameState` (START/PLAYING/PAUSED/GAME_OVER/WIN), wires engine callbacks, renders screens |
| `src/app/game.tsx` | Mounts the grid DOM into React, runs the character render loop |

### Singletons

Two singletons manage global game state (both use the private-constructor + `getInstance()` pattern):

- `characterManager` (`src/game/player.ts`) — registry of all `Character` instances
- `tracker` (`src/game/hooks/tracker.ts`) — per-player stats and game-wide tracking

### Game state flow

`GameState` enum (`src/types/game.ts`): `START` → `PLAYING` → `PAUSED` ↔ `PLAYING` → `GAME_OVER` | `WIN` → `START`

The engine exposes callback setters (`setOnPlayerDead`, `setOnTimeOver`, `setOnWin`) that the React layer wires up in `page.tsx`.

### Rendering model

The grid is a single `HTMLDivElement` (`id="game-grid"`) built once in `grid.ts` and mounted into React via a ref in `game.tsx`. Characters are re-created and re-appended every animation frame in `renderCharacters()`. Cell walkability is tracked via `dataset.solid`, `dataset.barrel`, `dataset.bomb`, and `dataset.powerup` attributes on each cell.

## Conventions

### Code style

- **TypeScript strict mode** is on — avoid `any` except where the codebase already uses it (e.g. `dataset` casts).
- **Named exports** for game modules; **default exports** only for Next.js pages/layouts and the `Game` component.
- **Section comments** with `// =========================` dividers are used throughout game modules — follow this pattern when adding to those files.
- **JSDoc comments** on exported functions describe purpose and params.
- **SSR guards**: game modules that touch the DOM guard with `typeof document !== "undefined"` or `typeof window === "undefined"`. Always add these guards in new game-side code.
- **Styling**: React components use Tailwind classes; imperative DOM elements use `Object.assign(el.style, {...})` with inline styles.
- **Config**: all tunable values live in `src/game/core/config.ts` as named constant objects. Do not hardcode magic numbers — add them to the relevant config object.
- **No tests**: there is no test runner. Verify changes by running `yarn dev` and playing the game, plus `yarn lint`.

### Commit style

Conventional commits are used: `feat:`, `fix:`, `refactor:`, `chore:`. Examples from history:

```
feat: add game pause functionality with ESC key and pause screen UI
refactor: reorganized code into hooks, core, assets, screens, etc.
fix: cap displayed time played to game time limit in end screen stats
```

### Imports

- Use the `@/` alias for cross-directory imports (e.g. `@/types/game`, `@/game/core/config`) — though many existing files use relative paths; match the surrounding file's choice.
- Group imports: external → internal aliases → relative.

## Known issues / caveats

- **Empty stub files**: `src/game/core/{engine,grid,animations}.ts` and `src/game/hooks/{bombs,players,powerups}.ts` are empty leftovers from a refactor. The real implementations live in `src/game/{engine,grid,animations}.ts` and `src/game/hooks/{tracker,sound}.ts`. Do not add code to the empty stubs without clarifying intent.
- **`src/game/bombs.ts`** contains an unused `activeBomb` interface (legacy).
- **AI is minimal**: `src/game/ai.ts` implements random movement + random bombs. The `Computer` class in `player.ts` has more sophisticated methods (`evaluateObjective`, `findSafePath`, `shouldPlaceBomb`) that are **not wired into the active loop**. `tasks.md` describes a planned but unimplemented advanced AI system.
- **`page.tsx`** has a stray `console.log("gameState", gameState)` on line 93.

## Controls

- Move: `WASD` or Arrow Keys
- Bomb: `Spacebar`
- Pause/Resume: `Escape`
