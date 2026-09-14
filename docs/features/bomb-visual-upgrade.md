# Bomb visual upgrade

Part of [character-designs-overview.md](./character-designs-overview.md) — read that first
for shared scale/dataset mechanics.

Source component: `Bomb.dc.html`, props `state: "placed" | "ticking" | "explode"`,
`range: int` (1-5, default 2), `flame: color` (default `#ff9a2b`), `scale: float`.

Moderate risk: the explosion visual is a structural change from today's per-cell puff to
a single bomb-centered graphic with arms that overlap neighboring cells.

## Current state (files, exact locations)

- `src/game/assets/dynamite.ts:6-109` — `createDynamite()`: builds `<div class="dynamite">`
  (orange stick `#c2410c`, rounded ends) + fuse (amber div above) + inner `burnContainer` >
  `burnIndicator` animated `height:0%→100%` over `BOMB_CONFIG.fuseDuration` ms (lines 70-74)
  — this is the current "ticking countdown" visual. Separate pulsing `fuseGlow` div
  animates opacity/scale in a loop at the fuse tip (lines 77-104).
- `src/game/animations.ts:15` — `bombTimers: Map<string, number>` keyed by
  `bomb-${row}-${col}`, the only state tracking (no bomb "state enum" exists; state is
  implicit via dataset flags + timers).
- `src/game/animations.ts:95-306` — `armDynamite()`: placement (appends dynamite el,
  sets `cell.dataset.bomb="1"` + `dataset.solid="1"`, `setTimeout` for
  `fuseMs ?? BOMB_CONFIG.fuseDuration`), then on timeout:
  - Removes dynamite visual, clears solid/bomb flags.
  - Computes `affected: GridPosition[]` (lines 135-302): starts at center, walks outward
    in 4 directions (`dirs`, lines 155-160) for `outward = range - 1` steps
    (`range = opts.bombRange ?? BOMB_CONFIG.blastRadius`, clamped to
    `BOMB_CONFIG.maxBlastRadius`) — **range is total reach including center tile**
    (comment at lines 152-153). Stops early at grid edge or solid/wall cell; barrels/crates
    are included then destroyed, walls stop propagation (lines 169-181).
  - Per affected cell: destroys barrel/crate (removes child, clears flags, awards score,
    chance-spawns powerup per `POWERUP_CONFIG.dropChance`, lines 257-282), chain-detonates
    any bomb found (recursive `armDynamite` with `fuseMs:0`, lines 214-254), appends a
    `createExplosion()` puff.
- `src/game/animations.ts:57-72` — `createExplosion()`: per-cell `<div>` with
  `radial-gradient` (yellow→orange→red→transparent), `borderRadius:6px`.
- `src/game/animations.ts:77-87` — `animateExplosion()`: scale/opacity keyframe
  (`0.6→1→1.05→1→0`, fade in/out) over `BOMB_CONFIG.explodeDuration` (750ms default), then
  `setTimeout` removes the puff.
- `src/game/engine.ts:171-241` — `placeBomb()`: gameplay entry point calling `armDynamite`,
  wires `onDetonate`/`onExplode` into `tracker.applyExplosionDamage` and
  inventory/active-bomb-count bookkeeping (logic, not visuals — unaffected by this upgrade).
- `src/game/core/config.ts:20-28` — `BOMB_CONFIG`: `fuseDuration:1000`,
  `explodeDuration:750`, `blastRadius:2` default, `maxBlastRadius:6`, `bombs`/`maxBombs`/
  `cooldown`.
- Per-bomb range override: `playerTracker.bombRange` (`src/game/hooks/tracker.ts:104-106`,
  sourced from `Character.bombRange` in `src/game/player.ts`, increased via power-ups).

## Design spec (from `Bomb.dc.html`, 120px box per tile, unscaled values)

Colors: `ink #131c2b`, `hot` = `flame` prop (default `#ff9a2b`), `hotPale #ffe9a8`.

`reach = range * 120` — arms are computed directly in px against the 120px tile unit,
matching the game's own per-tile outward walk almost exactly (game's `range` already
means "tiles reached from center," same semantics as the design's `range` prop — confirm
exact off-by-one alignment against the "range = total reach including center" comment in
`animations.ts:152-153` before wiring up, since the design's `reach = range*120` measures
from the bomb's own tile center outward, which should match if `range` is used identically
in both places).

Structure — `mount` > `scaler` > `shock`, `armH`, `armV`, `armHInner`, `armVInner`,
`flash`, `flashCore`, `shadow`, `ticker` (contains `ball`, `shine`, `band`, `cap`, `fuse`,
`spark`).

**Non-blast children (state `placed` / `ticking`):**
- `shadow`: `left:22 top:96 w:76 h:14`, ellipse, `background:rgba(5,10,20,.35)` — hidden
  when `state==="explode"`.
- `ticker` wraps the bomb-ball graphic, `display:none` when exploding,
  `transformOrigin:60px 100px`,
  `animation: bombTick .7s ease-in-out infinite` only when `state==="ticking"`
  (`0%/100% scale(1)` → `50% scale(1.12)`) — `placed` state has no animation (static).
- `ball`: `left:22 top:34 w:76 h:72`, circle, `background:ink`,
  `boxShadow: inset -8px -10px 0 rgba(255,255,255,.1), inset 8px 10px 0 rgba(0,0,0,.35)`.
- `shine`: `left:38 top:48 w:18 h:13`, ellipse, `background:#8fa6c9`, `opacity:.8`.
- `band`: `left:22 top:72 w:76 h:10`, `background:#25334a`, `opacity:.75`.
- `cap`: `left:50 top:24 w:20 h:16`, `borderRadius:5px`, `background:#4a5b75`.
- `fuse`: `left:66 top:8 w:7 h:22`, `borderRadius:4px`, `background:#c9a06a`,
  `transform:rotate(24deg)`.
- `spark`: `left:70 top:-4 w:20 h:20`, circle, `background:hotPale`,
  `boxShadow: 0 0 18px hot, 0 0 6px #fff`,
  `animation: bombSpark .5s ease-in-out infinite`
  (`0%/100% opacity:.5 scale(.75) rotate(0)` → `50% opacity:1 scale(1.3) rotate(25deg)`).

**Blast children (state `explode` only, all `display:none` otherwise):**
- `shock`: `left:-10 top:-10 w:140 h:140`, circle outline, `border:6px solid hotPale`,
  `filter:blur(1.5px)`, `animation: bombShock 1.1s ease-out infinite`
  (`0% opacity:.7 scale(.6)` → `100% opacity:0 scale(1.5)`) — expanding ring at the bomb's
  own tile.
- `armH`: horizontal beam, `left: 60-reach`, `top:20`, `w: reach*2`, `h:80`,
  `borderRadius:40px`,
  `background: linear-gradient(90deg, hot00 0%, hotCC 9%, hot 32%, hot 68%, hotCC 91%, hot00 100%)`
  (fades to transparent at both ends), `filter:blur(2px)`,
  `animation: blastFlicker .28s ease-in-out infinite` (`opacity 1↔.78`).
- `armV`: same but vertical (`left:20 top:60-reach w:80 h:reach*2`, gradient direction 180deg).
- `armHInner` / `armVInner`: narrower, pale-core overlay on top of `armH`/`armV`
  (`w/h: reach*2-28`, offset `+14px`), gradient using `hotPale` instead of `hot`,
  `filter:blur(1px)` — this is what gives the "pale core inside a hot outline" look called
  out in the source design doc's copy (`Character Designs.dc.html`).
- `flash`: `left:-14 top:-14 w:148 h:148`, circle,
  `background: radial-gradient(circle, hotPale 0%, hotPaleD9 34%, hot8c 58%, hot00 78%)`
  — soft glow centered on the bomb's own tile.
- `flashCore`: `left:26 top:26 w:68 h:68`, circle,
  `background: radial-gradient(circle, #fffdf2 0%, #fffdf2 46%, hotPale00 100%)` — bright
  white-hot center.

**Key structural point:** the arms (`armH`/`armV`/inner variants) are drawn from ONE
component instance at the bomb's cell, sized to span `reach*2` px in each direction — they
are not per-cell puffs. Per the source design doc's own copy: *"Blast arms are drawn from
the bomb's own tile and scale with `range`, so one component covers every upgrade level —
pale core inside a hot outline keeps it legible over both floor and crates."*

## Implementation plan

1. New `createBombVisual(state: BombState, range: number, flame: string, scale: number): HTMLDivElement`
   in `src/game/assets/dynamite.ts` (or rename file — no longer just "dynamite," covers all
   3 states). Introduce the `BombState` type (`"placed" | "ticking" | "explode"`) since none
   exists today.
2. Register `@keyframes bombTick / bombSpark / bombShock / blastFlicker` once globally.
3. **Placed/ticking**: straightforward swap — replace `createDynamite()`'s custom fuse-burn
   `burnIndicator` height animation with the design's `bombTick` pulse-scale approach on the
   whole `ticker`. Simpler than current implementation (no manual Web Animations API keyframe
   needed for the tick — CSS `@keyframes` handles it). Keep using `BOMB_CONFIG.fuseDuration`
   to size/time the ticking state's duration before transitioning to explode.
4. **Explode — structural change:**
   - Stop building a `createExplosion()` puff per affected cell. Instead: when
     `armDynamite()`'s timeout fires, swap the bomb's own element to `state="explode"` in
     place (same cell it was placed in), sized/positioned to overlay `reach*2` px in each
     direction — this requires the element (or a new wrapper) to be appended somewhere that
     allows overflow beyond its own grid cell (likely `#game-grid` directly, absolutely
     positioned via `row*cellSize`/`col*cellSize` computed from the bomb's grid position,
     rather than as a child of the single cell div it started in — grid cells in
     `buildGrid()`, `src/game/grid.ts:181-202`, are laid out via CSS Grid, which does not
     allow a child to visually overflow into sibling cells the way absolute positioning
     against the grid container does).
   - `reach = range * cellSize` (design's `range * 120` scaled to actual `cellSize`).
   - Existing outward-walk logic in `armDynamite()` (lines 135-302) that computes
     `affected` cells for gameplay purposes (barrel/crate destruction, chain detonation,
     damage) stays unchanged — it's independent of the visual. Only the *rendering* of the
     blast changes from N puffs to 1 arm-graphic. Verify visually that the arm's `reach`
     length lines up with the same cells `affected` computes as hit (should match exactly
     if `range` means the same thing in both places — flagged above).
   - Timing: `animation: blastFlicker .28s` loops for the visual's lifetime; total duration
     still governed by `BOMB_CONFIG.explodeDuration` (750ms) — keep the existing
     `setTimeout`-based removal, just removing the new arm-graphic element instead of N puffs.
5. Chain-detonation (recursive `armDynamite` with `fuseMs:0`, lines 214-254) — unaffected
   by visual change, but verify two overlapping arm-graphics (from two chained bombs) don't
   visually stack in a broken way; likely fine since both are additive glows.
