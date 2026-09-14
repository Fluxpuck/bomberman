# Power-up visual upgrade

Part of [character-designs-overview.md](./character-designs-overview.md) — read that first
for shared scale/dataset mechanics.

Source component: `Powerup.dc.html`, props `kind: "extraBomb" | "increaseRange"`,
`accent: color` (defaults `#38d6c4` teal for extraBomb, `#ff8a3d` ember for increaseRange),
`scale: float`.

Lowest-risk of the four upgrades — same two kinds, no new game state needed, purely
cosmetic swap.

## Current state (files, exact locations)

- `src/game/assets/powerups.ts:2` — `type PowerupType = "extraBomb" | "increaseRange"`
  (exact and only enum, unchanged by this upgrade).
- `src/game/assets/powerups.ts:7-63` — `createPowerUp(type)`: circle div, `60%` of cell,
  centered via `margin:20%`, colors `extraBomb → bg:#3b82f6 border:#1d4ed8`,
  `increaseRange → bg:#ef4444 border:#b91c1c`, `opacity:.8`, `mixBlendMode:multiply`,
  `boxShadow:0 0 4px 1px <border>`, centered text label child (`"+"` / `"R+"`,
  lines 51-58). Tags `dataset.powerup = type` and `dataset.solid = "0"`.
- `src/game/animations.ts:257-282` — spawns a powerup on barrel/crate destruction,
  gated by `POWERUP_CONFIG.dropChance` (`src/game/core/config.ts:37`, default `0.2`).
  Visuals not involved here, only placement.
- `src/game/powerup.ts:12-53` — `checkPowerupPickup()`: runs every player move, checks
  current cell's children for `dataset.powerup`, applies effect
  (`playerTracker.addBomb()` / `.increaseBombRange()`), removes element. No animation
  today (`createPowerupCollectionEffect` at `powerup.ts:60-68` is an empty stub — out of
  scope for this doc, but a natural place to add a pickup burst later).
- No idle/bob animation exists today (static styling only, unlike bombs/explosions which
  already use `.animate()`).

## Design spec (from `Powerup.dc.html`, 120px box, unscaled values)

Colors: `ink #0d1626`; for `extraBomb`: `accent(default) #38d6c4`, `deep #0f6a63`,
`pale #c9fff8`; for `increaseRange`: `accent(default) #ff8a3d`, `deep #a8410c`,
`pale #ffe0c2`.

Structure — `mount` > `scaler` > `halo` (outside `stage`) + `stage` (animated bob) >
`plate`, `plateTop`, then kind-specific children.

- `halo`: `left:6 top:6 w:108 h:108`, `borderRadius:28px`,
  `background: radial-gradient(circle at 50% 50%, accent 0%, rgba(0,0,0,0) 68%)`,
  `animation: puPulse 2s ease-in-out infinite` (`0%/100% opacity:.35 scale:.92` →
  `50% opacity:.75 scale:1.06`).
- `stage`: `animation: puHover 2.2s ease-in-out infinite`
  (`0%/100% translateY(0)` → `50% translateY(-6px)`).
- `plate`: `left:14 top:14 w:92 h:92`, `borderRadius:24px`, `background:accent`,
  `border:4px solid ink`, `boxShadow: inset 0 -10px 0 rgba(0,0,0,.22)`.
- `plateTop`: `left:24 top:22 w:72 h:22`, `borderRadius:14px`,
  `background:rgba(255,255,255,.26)` (glossy highlight strip).

**extraBomb** (`kind==="extraBomb"`):
- `bomb`: `left:36 top:40 w:48 h:48`, circle, `background:ink`,
  `boxShadow: inset -6px -8px 0 rgba(255,255,255,.1)`.
- `bombShine`: `left:46 top:48 w:13 h:10`, circle, `background:pale`, `opacity:.85`.
- `fuse`: `left:66 top:28 w:6 h:18`, `borderRadius:3px`, `background:deep`,
  `transform:rotate(22deg)`.
- `spark`: `left:70 top:20 w:16 h:16`, circle, `background:#fff3c4`,
  `boxShadow:0 0 14px #ffce3d`, `animation: puSpark 1s ease-in-out infinite`
  (`0%/100% opacity:.5 scale:.8` → `50% opacity:1 scale:1.25`).
- `barH`, `barV`, `tipL/R/U/D`, `core` all `off`.

**increaseRange** (else branch):
- `bomb`, `bombShine`, `fuse`, `spark` all `off`.
- `barH`: `left:24 top:52 w:72 h:16`, `borderRadius:8px`, `background:pale` (horizontal
  bar of a "+" cross).
- `barV`: `left:52 top:24 w:16 h:72`, `borderRadius:8px`, `background:pale` (vertical bar).
- `tipL/R/U/D`: 20×20 `background:pale` squares rotated 45° at
  `(16,50) (84,50) (50,16) (50,84)` respectively — diamond arrowheads at each end of the
  cross, pointing outward (matches the "four-way blast cross" framing from the source
  design doc's copy).
- `core`: `left:48 top:48 w:24 h:24`, circle, `background:ink`,
  `boxShadow:0 0 12px rgba(0,0,0,.4)` (center hub of the cross).

## Implementation plan

1. New `createPowerUpVisual(kind: PowerupType, scale: number): HTMLDivElement` in
   `src/game/assets/powerups.ts`, replacing `createPowerUp()`. Port the style-object logic
   above 1:1 (`mount`/`scaler`/`halo`/`stage`/children).
2. Register the three new `@keyframes` (`puHover`, `puPulse`, `puSpark`) once, globally —
   e.g. injected into a `<style>` tag on first call, or added to a project-wide stylesheet
   if one exists (check `src/app/*.css`). Do not re-inject per instance.
3. Keep `dataset.powerup = type` and `dataset.solid = "0"` exactly as today — pickup logic
   in `src/game/powerup.ts` depends on `dataset.powerup` and must not change.
4. Text labels (`"+"` / `"R+"`) from the old design are superseded by the new iconography
   (bomb-with-spark vs. cross-with-arrowheads) — drop the old label child div entirely,
   the new visual is self-explanatory without text.
5. `scale = cellSize / 120`, recomputed on resize same as tiles (hook into
   `updateGridLayout()` in `src/game/grid.ts` if powerup elements are re-styled on resize
   the same way cell children are — confirm whether powerups currently participate in that
   resize pass; if not, they'll need to start, since the old 60%-of-cell sizing was
   naturally responsive and the new fixed-120px-scaled approach is not).
