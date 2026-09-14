# Tiles visual upgrade

Part of [character-designs-overview.md](./character-designs-overview.md) — read that first
for shared scale/dataset mechanics.

Source component: `Tile.dc.html` (project "Lo-fi Bomberman characters"), prop
`kind: "floor" | "wall" | "crate" | "barrel"`, `scale: float`.

## Decision (confirmed)

Breakables split into **two distinct types**: `crate` and `barrel`. Today's game has a
single breakable type (`grid.ts`'s local `CellType` union includes only `"barrel"`, and
`createBarrelBlock()` in `src/game/assets/blocks.ts:25-96` is the only breakable visual).
This is a logic change, not just a visual swap — `CellType` gains a `"crate"` member,
generation must decide which of the two to place, and every place that currently checks
`cellData.type === "barrel"` or `dataset.barrel` needs to also handle `crate`.

## Current state (files, exact locations)

- `src/game/grid.ts:8` — local `type CellType = "empty" | "border" | "solid" | "barrel"`
  (the one that actually drives rendering — the exported enum in `src/types/game.ts:18-22`
  is dead, do not use it).
- `src/game/grid.ts:93-117` — `generateGridLayout()`: classifies every cell as
  `border` (edge), `solid` (checkerboard interior pattern via `isSolidPatternCell`,
  lines 41-46), `barrel` (random placement gated by `coverage`, avoiding borders/solids/
  spawn corners — `shouldPlaceBarrel`, lines 76-84), else `empty` (floor).
- `src/game/grid.ts:143-176` — `createCellElement(cellData)`: builds the outer cell div
  (`background: "#fff"`, `border: "1px solid #333"`, sized `cellSize × cellSize`), then
  dispatches on `cellData.type`:
  - `"border"` / `"solid"` → `createSolidBlock()`, sets `dataset.solid = "1"`.
  - `"barrel"` → `createBarrelBlock()`, sets `dataset.solid = "1"` AND `dataset.barrel = "1"`.
  - `"empty"` → no child appended.
- `src/game/grid.ts:181-202` — `buildGrid(layout)`: wraps cells in `#game-grid` using CSS
  Grid (`gridTemplateColumns/Rows: repeat(N, ${cellSize}px)`).
- `src/game/grid.ts:254-275` — `updateGridLayout()`: responsive resize, recomputes shrunk
  `cellSize` (min 8px) and rewrites every child's width/height + grid template. New tile
  visuals must re-derive `scale = cellSize/120` here too.
- `src/game/assets/blocks.ts:6-20` — `createSolidBlock()`: flat `<div>`, fills cell,
  `backgroundColor: "#444"`, `border: "1px solid #333"`. No texture.
- `src/game/assets/blocks.ts:25-96` — `createBarrelBlock()`: centered div sized
  `cellSize - 6`, `backgroundColor: "#8B4513"`, `borderRadius: "15%"`,
  `border: "2px solid #5D2906"`, plus 3 horizontal ring divs + 3 vertical wood-grain
  line divs.
- `src/game/core/config.ts:5-13` — `GRID_PATTERN`: `gridRows: 13`, `gridCols: 15`,
  `cellSize: 50`, `coverage: 0.8` (breakable density), `cornerSafeSize: 2`,
  `rowOffset/colOffset: 1`.

## Design spec (from `Tile.dc.html`, 120px box, unscaled values)

Shared base colors: `wood #a9622c`, `woodDeep #6b3714`, `woodLight #c98249`,
`steelTop #7d8ea6`, `steel #5a6b82`, `steelDeep rgba(51,64,84,0.2)` (`#33405433`).

Structure — one `mount` > `scaler` (scale transform, origin top-left) > absolutely
positioned children: `base`, `bevel`, `face`, `plankA/B`, `braceA/B`, `hoopA/B`, `lid`,
`rivetA-D`, `speck`. Each child is `display:none` (`off`) unless relevant to the current
`kind`.

**floor**
- `base`: `background:#e9e5dd`, `boxShadow: inset 0 -6px 0 rgba(0,0,0,.09), inset 0 0 0 3px rgba(0,0,0,.07)`, `borderRadius:6px`.
- `face`: centered 76×76 inset square, `background:#ddd7cb`, `opacity:.7`.
- `speck`: 10×10 circle at `left:54px top:54px`, `background:#c9c2b4`.
- All wall/crate/barrel-only children `off`.

**wall**
- `base`: `background:steel`, `boxShadow: inset 0 -12px 0 rgba(0,0,0,.28)`, `borderRadius:10px`.
- `bevel`: `left:10 top:10 w:100 h:72`, `borderRadius:8px`, `background:steelTop`,
  `boxShadow: inset 0 5px 0 rgba(255,255,255,.28), inset 0 -6px 0 steelDeep`.
- `rivetA-D`: 12×12 circles at corners `(16,16) (92,16) (16,90) (92,90)`,
  `background:#2a3444`, `boxShadow: inset 0 2px 0 rgba(255,255,255,.35)` — **rivets only
  render for `kind==="wall"`** (the `rivet()` helper returns `off` for every other kind).

**crate**
- `base`: `background:woodDeep`, `borderRadius:12px`.
- `bevel`: `left:10 top:10 w:100 h:94`, `borderRadius:9px`, `background:wood`,
  `boxShadow: inset 0 6px 0 rgba(255,255,255,.2), inset 0 -8px 0 rgba(0,0,0,.24)`.
- `plankA`: `left:10 top:42 w:100 h:5`, `background:woodDeep`, `opacity:.55`.
- `plankB`: `left:10 top:72 w:100 h:5`, `background:woodDeep`, `opacity:.55`.
- `braceA`: `left:18 top:50 w:86 h:9`, `borderRadius:5px`, `background:woodLight`,
  `transform:rotate(36deg)`.
- `braceB`: same but `rotate(-36deg)` — the two braces form an X.

**barrel**
- `base`: `background:#3a2410`, `borderRadius:16px`.
- `bevel`: `left:18 top:8 w:84 h:104`, `borderRadius:26px/34px` (elliptical — barrel
  silhouette), `background:wood`,
  `boxShadow: inset -10px 0 0 rgba(0,0,0,.18), inset 10px 0 0 rgba(255,255,255,.14)`.
- `hoopA`: `left:14 top:36 w:92 h:12`, `borderRadius:6px`, `background:#8f8f99`,
  `boxShadow: inset 0 3px 0 rgba(255,255,255,.35)`.
- `hoopB`: same at `top:74`.
- `lid`: `left:30 top:10 w:60 h:18`, `borderRadius:50%`, `background:woodLight`,
  `boxShadow: inset 0 3px 0 rgba(255,255,255,.3)`.

## Implementation plan

1. **Add `crate` to the `CellType` union** in `src/game/grid.ts:8`:
   `"empty" | "border" | "solid" | "barrel" | "crate"`.
2. **Update `generateGridLayout()` / `shouldPlaceBarrel`** (`src/game/grid.ts:76-117`) to
   pick between `barrel` and `crate` for each breakable slot. Decide the split ratio (e.g.
   50/50 random, or a config knob in `GRID_PATTERN`) — not specified by the design, pick
   something reasonable (suggest a new `GRID_PATTERN.crateRatio` or reuse `coverage`
   50/50 via a second random check) and note the choice in code.
3. **Rewrite `createCellElement()`** (`src/game/grid.ts:143-176`) dispatch: `"crate"` case
   appends a new crate visual, sets `dataset.solid="1"` + `dataset.barrel="1"` (keep the
   `barrel` dataset flag shared across both crate and barrel — nothing downstream needs to
   distinguish them, per current pickup/destruction logic, which only checks
   `dataset.barrel` generically; confirm this against `src/game/animations.ts:169-181,257-282`
   before assuming — if any code path needs to distinguish crate vs barrel specifically,
   add a separate `dataset.crate` flag instead of overloading `dataset.barrel`).
4. **New builder functions** in `src/game/assets/blocks.ts`, replacing
   `createSolidBlock()`/`createBarrelBlock()`:
   - `createTileVisual(kind: TileKind, cellSize: number): HTMLDivElement` — single entry
     point handling `floor | wall | crate | barrel`, porting the style-object logic above.
   - Internally build the `mount`/`scaler`/children structure with `scale = cellSize/120`.
   - Floor: also wire into `createCellElement()`'s `"empty"` branch (currently appends
     nothing) so plain floor tiles get the new subtle inset/speck styling instead of bare
     `background:#fff`.
5. **Wire `updateGridLayout()`** (`src/game/grid.ts:254-275`) to recompute `scale` and
   re-apply the `scaler` transform on every resize, alongside its existing width/height
   rewrites.
6. Preserve `dataset.solid` on wall/crate/barrel exactly as today; floor gets no dataset
   change.
