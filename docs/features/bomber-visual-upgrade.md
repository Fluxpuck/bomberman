# Bomber (character) visual upgrade

Part of [character-designs-overview.md](./character-designs-overview.md) — read that first
for shared scale/dataset mechanics.

Source component: `Bomber.dc.html`, props `accent/dark/light: color` (per-player triad,
default `#4aa3ff`/`#1d5fa8`/`#bfe0ff`), `state: "idle" | "walk" | "hurt" | "win"`,
`facing: "down" | "up" | "left" | "right"`, `scale: float`.

Highest risk / most work of the four upgrades — requires new state plumbing on
`Character` that doesn't exist today (`facing`, `walking`, `winning`). Do this last.

## Current state (files, exact locations)

- `src/game/assets/character.ts:19-47` — `createCharacter()`: builds `<div>` styled as a
  circle (`borderRadius:50%`, `backgroundColor:"#4A90E2"` hardcoded, `border:2px solid #000`),
  then `createFacialFeatures()` appends eyes/mouth based on an `expression` param.
- `src/game/assets/character.ts:6-13` — `FacialExpression` type: `"normal" | "happy" |
  "sad" | "angry" | "surprised" | "damaged" | "victorious"` — fully implemented for all 7,
  but **dead**: `character.ts:20` defaults `expression = "surprised"` and nothing ever
  overrides it. This whole system is being replaced by the new `state`/`facing` model, not
  extended — safe to delete once the new visual lands.
- `src/app/game.tsx:46-51` — `requestAnimationFrame` loop calling `renderCharacters()`
  every frame.
- `src/app/game.tsx:61-102` — `renderCharacters()`: removes all previous
  `[data-character]` elements (full re-render each frame), iterates
  `characterManager.getAll()` (`src/game/player.ts`), skips `!char.isAlive()`, calls
  `createCharacter()` with **no arguments** (always default expression), overrides
  `backgroundColor` inline (`char.color`, or hardcoded `#e74c3c` red if
  `char.isShowingDamageAnimation()`, line 83), positions absolutely via `char.position.x/y`
  + centering offset using `cellSize - 8` as size (lines 75-89), adds `boxShadow` glow only
  during damage animation, `transition:"all 0.5s ease"` for movement (removed during damage
  flash so the red flash is instant).
- `src/game/player.ts:16-24` — `Character` base class constructor: `color: string` is the
  only per-player accent stored today.
- `src/game/player.ts:26-43` — `Character.move()`: updates `position` (px) and
  `gridPosition` ({row,col}) given a `Direction`. **`Direction` is a transient function
  parameter only — never stored on the object.** No `facing` field exists anywhere.
- `src/game/player.ts:45-51` — `takeDamage()`: sets the damage-flash window.
- `src/game/player.ts:57-59` — `isShowingDamageAnimation(): boolean`, true for
  `DAMAGE_ANIMATION_MS` (line 14, `250`ms) after `takeDamage()`.
- `src/game/player.ts:61-63` — `isAlive(): boolean` (`lives > 0`) — controls whether
  rendered at all; dead characters are just removed, no death animation/sprite today.
- `src/types/game.ts:1-9` — `position: {x,y}` (px), `gridPosition: {row,col}`.
- `src/types/game.ts:11-16` — `Direction` enum: `UP | DOWN | LEFT | RIGHT`.
- `src/game/engine.ts:687-742` — `initializePlayers()`: assigns the 4 hardcoded colors —
  Player-1 `#4A90E2` blue, Computer-1 `#E74C3C` red, Computer-2 `#F39C12` orange,
  Computer-3 `#9B59B6` purple (lines 695, 709, 722, 735). This is the palette source to
  replace with accent/dark/light triads.
- `src/game/engine.ts:113-166` — movement dispatch using `Direction` for math only.
- Grep confirms: **zero matches** for `facing`/`lastDirection`/`orientation` anywhere in
  `src/` — no existing hook point for sprite orientation. **No round-win detection point
  identified yet** — needs its own investigation pass before the `win` state can be wired
  up (see open item below).

## Design spec (from `Bomber.dc.html`, 120px box, unscaled values)

Colors: `ink #101a2b` (fixed, not themeable); `accent`/`dark`/`light` per player, e.g.
Player 1 azure `#4aa3ff`/`#12457f`/`#cfe8ff`, Computer 1 ember `#ff5f5f`/`#a62a2a`/`#ffd3cf`,
Computer 2 amber `#f5a623`/`#a96a06`/`#ffe6b8`, Computer 3 violet `#b45ddb`/`#6f2f96`/`#ecd4ff`
(these four exact triads are shown in the source design doc's "Bomber squad" section and
are a natural default palette to port into `initializePlayers()`).

`dx`/`dy` offset the visor/eyes based on `facing`: `dx = -4` (left) / `4` (right) / `0`
(up/down); `dy = -4` (up) / `2` (down) / `0` (left/right) — this shifts the eye positions
to imply head-turn without a separate sprite per direction.

Booleans derived from `state`: `walking = state==="walk"`, `hurt = state==="hurt"`,
`win = state==="win"`.

`anim` (applied to the whole `stage`): `walking → "bomberStep .42s ease-in-out infinite"`
(step-bob + slight rotate, `0%/100% translateY(0) rotate(-2deg)` → `50% translateY(-3px)
rotate(2deg)`), `hurt → "none"` (static, since `stage.transform` itself is set to
`rotate(-8deg)` for a hurt tilt — see below), else (`idle`/`win`) →
`"bomberBob 2.4s ease-in-out infinite"` (gentle up/down float,
`0%/100% translateY(0)` → `50% translateY(-5px)`).

Structure — `mount` > `scaler` > `stage` (animated + rotated if hurt) containing, in paint
order: `shadow`, `cape`, `footL`, `footR`, `body`, `belly`, `core`, `armL`, `armR`,
`helmet`, `crest`, `antenna`, `bulb`, `visor`, `eyeL`, `eyeR`, `vent`.

- `stage`: `transform: hurt ? "rotate(-8deg)" : "none"`, `animation: anim` (above).
- `shadow`: `left:22 top:101 w:76 h:13`, ellipse, `background:rgba(5,10,20,.42)`.
- `cape`: `left:10 top:50 w:100 h:50`, `borderRadius:50px 50px 16px 16px`,
  `background:dark`, `opacity:.95`.
- `footL`: `left:24`, `top: walking ? 88 : 92`, `w:28 h:16`,
  `borderRadius:9px 9px 7px 7px`, `background:ink`.
- `footR`: `left:68`, `top: walking ? 94 : 92` (offset from footL by 6px when walking —
  this is what produces the alternating-step look), same size/color as footL.
- `body`: `left:20 top:52 w:80 h:48`, `borderRadius:26px 26px 20px 20px`,
  `background:accent`,
  `boxShadow: inset 0 7px 0 rgba(255,255,255,.22), inset 0 -9px 0 rgba(0,0,0,.2)`.
- `belly`: `left:40 top:62 w:40 h:32`, `borderRadius:20px 20px 14px 14px`,
  `background:light`, `opacity:.9`.
- `core`: `left:52 top:70 w:16 h:16`, circle, `background:accent`, `border:2px solid ink`,
  `boxShadow:0 0 12px accent`, `animation: bomberGlow 2.2s ease-in-out infinite`
  (`opacity .55↔1`).
- `armL`: `left:8`, `top: win ? 40 : 60`, `w:20 h:24`, `borderRadius:10px`,
  `background:dark`, `transform: win ? "rotate(-25deg)" : "none"` (arms raised on win).
- `armR`: mirror (`left:92`, `rotate(25deg)` when win).
- `helmet`: `left:14 top:10 w:92 h:60`, `borderRadius:46px 46px 26px 26px`,
  `background:accent`,
  `boxShadow: inset 0 8px 0 rgba(255,255,255,.28), inset 0 -10px 0 rgba(0,0,0,.18)`.
- `crest`: `left:50 top:10 w:20 h:24`, `borderRadius:10px 10px 3px 3px`,
  `background:light`.
- `antenna`: `left:58 top:-8 w:4 h:20`, `borderRadius:2px`, `background:ink`.
- `bulb`: `left:51 top:-19 w:18 h:18`, circle, `background:light`, `border:2px solid ink`,
  `boxShadow:0 0 14px accent`.
- `visor`: `left:22 top:30 w:76 h:26`, `borderRadius:13px`, `background:ink`,
  `boxShadow: inset 0 3px 0 rgba(255,255,255,.12), 0 2px 0 rgba(0,0,0,.25)`.
- `eyeL`/`eyeR` (via `eye(side)` helper): `left: (side==="l" ? 34 : 62) + dx`,
  `top: 36 + dy + (hurt?5:win?4:0)`, `w:14`,
  `h: hurt?4 : win?6 : 13` (squint when hurt, slight squint when win, wide otherwise),
  `borderRadius: (hurt||win) ? "3px" : "7px 7px 6px 6px"`, `background:#f4f9ff`,
  `boxShadow:0 0 8px rgba(255,255,255,.55)`.
- `vent`: `left:48 top:58 w:24 h:6`, `borderRadius:3px`, `background:ink`, `opacity:.8`.

## Implementation plan

1. **Add state fields to `Character`** (`src/game/player.ts`):
   - `facing: Direction` (default e.g. `DOWN`) — set in `move()` (lines 26-43) alongside
     the existing position/gridPosition update, using the `Direction` passed in.
   - `walking: boolean` (default `false`) — set `true` at the start of `move()`, cleared
     via `setTimeout` matching the movement transition duration (currently `0.5s` in
     `game.tsx:89` — pull this into a shared constant so both places agree, rather than
     duplicating the magic number).
   - `winning: boolean` (default `false`) — setter TBD, see open item below.
   - Keep `isShowingDamageAnimation()` as-is; it maps directly to `hurt`.
2. **Replace `createCharacter()`** (`src/game/assets/character.ts`) with
   `createBomberVisual(accent: string, dark: string, light: string, state: BomberState,
   facing: Direction, scale: number): HTMLDivElement`. Introduce `BomberState = "idle" |
   "walk" | "hurt" | "win"`. Port the style-object logic above 1:1, including the
   `dx`/`dy` facing offset math and the `eye()` helper. Delete the now-superseded
   `FacialExpression` type and `createFacialFeatures()`.
3. **State derivation order** when calling the new builder from `renderCharacters()`:
   `hurt` (damage animation active) takes priority over `winning`, which takes priority
   over `walking`, else `idle`. Confirm this priority makes sense once `winning` is wired
   up — a character shouldn't play a walk-bob while a win animation is meant to be showing,
   for instance.
4. **Rewrite `renderCharacters()`** (`src/app/game.tsx:61-102`) to compute
   `state = char.isShowingDamageAnimation() ? "hurt" : char.winning ? "win" : char.walking
   ? "walk" : "idle"` and pass `state`, `char.facing`, and accent/dark/light (see below)
   into the new builder, replacing the old no-arg `createCharacter()` call and the manual
   `backgroundColor`/`boxShadow` overrides (the new builder handles all of that internally
   via the style-object children).
5. **Per-player palette**: replace the 4 single hex colors in `initializePlayers()`
   (`src/game/engine.ts:693-741`) with accent/dark/light triples. Store all three on
   `Character` (extend the constructor signature, `src/game/player.ts:16-24`) instead of
   just `color`. Suggested defaults: the four triads shown in the design doc's "Bomber
   squad" section, quoted above.
6. Register `@keyframes bomberBob / bomberStep / bomberGlow` once globally.
7. Register `@keyframes` for `stage`'s `rotate(-8deg)` hurt-tilt — note this is a static
   `transform`, not a keyframe animation, so no new `@keyframes` block needed for it, just
   applied inline like the design does.
8. Sizing: replace `cellSize - 8` (`game.tsx:75-89`) with the new `mount`-based sizing —
   `scale = cellSize / 120` fed into the builder, same pattern as tiles/bomb/powerup.

## Open items — need answers before this doc's plan can be finished

- **Round-win detection**: no code path was found during initial research that marks a
  round/game as won by a specific character. Needs its own investigation pass (grep for
  win-condition logic, likely in `src/game/engine.ts` or a screens/ component driving the
  end-of-round UI) to find where to set `Character.winning = true`. Until this is found,
  the `win` state cannot be wired up end-to-end — `idle`/`walk`/`hurt` can ship
  independently first.
- **Death animation**: out of scope for this design (source `.dc.html` has no "dead"
  state), current behavior (character element just disappears via the `isAlive()` filter
  in `renderCharacters()`) is unchanged by this upgrade.
