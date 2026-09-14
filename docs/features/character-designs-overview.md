# Character Designs — visual upgrade overview

Source: Claude Design project "Lo-fi Bomberman characters" —
`https://claude.ai/design/p/06598dd0-fc45-4889-9861-842da8f7253d`

Four components pulled from that project: `Tile`, `Bomber`, `Bomb`, `Powerup`. All are
pure CSS/DOM (absolute-positioned `<div>`s in a 120px box, driven by a `scale` prop) —
same rendering style the game already uses (imperative `document.createElement("div")` +
`Object.assign(el.style, {...})`, no canvas, no React JSX for the board). No rendering-tech
migration needed — this is a like-for-like swap of the div-building functions.

Detail docs, one per entity:

- [tiles-visual-upgrade.md](./tiles-visual-upgrade.md)
- [bomber-visual-upgrade.md](./bomber-visual-upgrade.md)
- [bomb-visual-upgrade.md](./bomb-visual-upgrade.md)
- [powerup-visual-upgrade.md](./powerup-visual-upgrade.md)

## Shared mechanics across all four

**Scale.** Every design component is built on a 120×120px logical box, scaled via
`transform: scale(s)` with `transformOrigin: "top left"` on an absolutely-positioned
`scaler` div nested inside a `mount` div (`mount` reserves layout space at
`120*scale` px, `scaler` holds the actual 120px-authored content). The game's board
uses `GRID_PATTERN.cellSize` (`src/game/core/config.ts:8`, base `50`px, dynamically
shrunk at runtime down to a min of `8`px by `updateGridLayout()` in `src/game/grid.ts:254-275`
to fit the viewport on resize). Every new visual builder must compute
`scale = cellSize / 120` at build/update time and re-apply it whenever `updateGridLayout`
recomputes `cellSize` — the existing resize path already rewrites `width`/`height` on
every cell child, so the new builders' `mount` sizing needs to hook into that same path.

**Rendering tech match.** No changes needed to the overall approach:
`document.createElement("div")` + `Object.assign(style, {...})`, CSS `@keyframes` for
looping animations (bob, glow, pulse, tick, spark), Web Animations API only where the
game already uses it (bomb fuse burn, explosion). Design's `@keyframes` blocks (declared
per-component in a `<style>` in the `.dc.html` `<helmet>`) need to be added once to a
global stylesheet (or injected once via a `<style>` tag), not per-instance.

**Dataset attribute contracts — do not break these.** The game's movement, explosion
propagation, and pickup logic all read `dataset` attributes directly off DOM elements,
independent of visual styling:
- `cell.dataset.solid` — walkability, read by `isWalkable()` (`src/game/grid.ts:289-292`)
  and `getCellFlags()` (`src/game/animations.ts:42-49`).
- `cell.dataset.barrel` — breakable-block marker (see tiles doc for the crate/barrel split).
- `cell.dataset.bomb` — bomb-occupies-cell marker (`src/game/animations.ts`).
- `el.dataset.powerup` — powerup type marker, read by `hasPowerup()`/pickup logic
  (`src/game/powerup.ts`).

Every new builder function must keep setting these exactly as the current builders do —
only the visual children change, not the dataset contract.

## Known dead code — do not touch or rely on

Per repo state as of the "reorganized into hooks/core/assets/screens" refactor: `src/game/core/engine.ts`,
`src/game/core/grid.ts`, `src/game/core/animations.ts`, `src/game/hooks/bombs.ts`,
`src/game/hooks/players.ts`, `src/game/hooks/powerups.ts` are empty (0-byte) stubs, not
imported anywhere. The live files are the root `src/game/*.ts` ones referenced throughout
these docs (`src/game/engine.ts`, `src/game/grid.ts`, `src/game/player.ts`,
`src/game/animations.ts`, `src/game/powerup.ts`, `src/game/ai.ts`) plus
`src/game/core/config.ts` and `src/game/hooks/tracker.ts` / `src/game/hooks/sound.ts`,
which ARE wired up despite living in the new folders. Also dead: the exported
`CellType` enum in `src/types/game.ts:18-22` (`EMPTY | WALL | DESTRUCTIBLE`) — the grid
actually uses a local string-literal union `type CellType = "empty" | "border" | "solid" | "barrel"`
in `src/game/grid.ts:8`. And the `FacialExpression` system in
`src/game/assets/character.ts` (7 fully-implemented expressions) is never driven by real
state — `game.tsx` calls `createCharacter()` with no arguments, so it always renders the
default `"surprised"` expression. This whole system is being replaced (see bomber doc),
not extended.

## Suggested implementation order

1. **Tiles + Powerup** — no new game-state plumbing needed, pure visual swap, low risk.
2. **Bomb** — moderate: blast-arm visual is a structural change from today's per-cell puff.
3. **Bomber** — last: needs new `facing` / `walking` / `winning` state added to the
   `Character` class first, which nothing currently tracks.
