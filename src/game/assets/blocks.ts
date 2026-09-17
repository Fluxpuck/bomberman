export type TileKind = "floor" | "wall" | "crate" | "barrel";

const WOOD = "#a9622c";
const WOOD_DEEP = "#6b3714";
const WOOD_LIGHT = "#c98249";
const STEEL_TOP = "#7d8ea6";
const STEEL = "#5a6b82";
const STEEL_DEEP = "#33405433";

function box(styles: Partial<CSSStyleDeclaration>): Partial<CSSStyleDeclaration> {
  return Object.assign({ position: "absolute", boxSizing: "border-box" }, styles);
}

const OFF: Partial<CSSStyleDeclaration> = { display: "none" };

function baseStyle(kind: TileKind): Partial<CSSStyleDeclaration> {
  switch (kind) {
    case "floor":
      return {
        background: "#e9e5dd",
        boxShadow: "inset 0 -6px 0 rgba(0,0,0,.09), inset 0 0 0 3px rgba(0,0,0,.07)",
        borderRadius: "6px",
      };
    case "wall":
      return {
        background: STEEL,
        boxShadow: "inset 0 -12px 0 rgba(0,0,0,.28)",
        borderRadius: "10px",
      };
    case "crate":
      return { background: WOOD_DEEP, borderRadius: "12px" };
    case "barrel":
      return { background: "#3a2410", borderRadius: "16px" };
  }
}

function bevelStyle(kind: TileKind): Partial<CSSStyleDeclaration> {
  switch (kind) {
    case "wall":
      return box({
        left: "10px",
        top: "10px",
        width: "100px",
        height: "72px",
        borderRadius: "8px",
        background: STEEL_TOP,
        boxShadow: `inset 0 5px 0 rgba(255,255,255,.28), inset 0 -6px 0 ${STEEL_DEEP}`,
      });
    case "crate":
      return box({
        left: "10px",
        top: "10px",
        width: "100px",
        height: "94px",
        borderRadius: "9px",
        background: WOOD,
        boxShadow: "inset 0 6px 0 rgba(255,255,255,.2), inset 0 -8px 0 rgba(0,0,0,.24)",
      });
    case "barrel":
      return box({
        left: "18px",
        top: "8px",
        width: "84px",
        height: "104px",
        borderRadius: "26px / 34px",
        background: WOOD,
        boxShadow: "inset -10px 0 0 rgba(0,0,0,.18), inset 10px 0 0 rgba(255,255,255,.14)",
      });
    default:
      return OFF;
  }
}

function rivetStyle(kind: TileKind, x: number, y: number): Partial<CSSStyleDeclaration> {
  if (kind !== "wall") return OFF;
  return box({
    left: `${x}px`,
    top: `${y}px`,
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    background: "#2a3444",
    boxShadow: "inset 0 2px 0 rgba(255,255,255,.35)",
  });
}

/**
 * Rescales a tile visual built by createTileVisual to a new cell size,
 * without rebuilding its child structure. Used on viewport resize.
 */
export function rescaleTileVisual(mount: HTMLDivElement, cellSizePx: number): void {
  const scale = cellSizePx / 120;
  const scaler = mount.firstElementChild as HTMLDivElement | null;
  mount.style.width = `${120 * scale}px`;
  mount.style.height = `${120 * scale}px`;
  if (scaler) {
    scaler.style.transform = `scale(${scale})`;
  }
}

/**
 * Builds a tile's visual (floor/wall/crate/barrel), scaled from the source
 * 120px design box down to the live cell size.
 */
export function createTileVisual(kind: TileKind, cellSizePx: number): HTMLDivElement {
  const scale = cellSizePx / 120;

  const mount = document.createElement("div");
  Object.assign(mount.style, {
    position: "absolute",
    left: "0",
    top: "0",
    width: `${120 * scale}px`,
    height: `${120 * scale}px`,
  });

  const scaler = document.createElement("div");
  Object.assign(scaler.style, {
    position: "absolute",
    left: "0",
    top: "0",
    width: "120px",
    height: "120px",
    transform: `scale(${scale})`,
    transformOrigin: "top left",
  });
  mount.appendChild(scaler);

  const base = document.createElement("div");
  Object.assign(base.style, box({ left: "2px", top: "2px", width: "116px", height: "116px" }));
  Object.assign(base.style, baseStyle(kind));
  scaler.appendChild(base);

  const bevel = document.createElement("div");
  Object.assign(bevel.style, bevelStyle(kind));
  scaler.appendChild(bevel);

  const face = document.createElement("div");
  Object.assign(
    face.style,
    kind === "floor"
      ? box({ left: "22px", top: "22px", width: "76px", height: "76px", borderRadius: "4px", background: "#ddd7cb", opacity: ".7" })
      : OFF
  );
  scaler.appendChild(face);

  const plankA = document.createElement("div");
  Object.assign(
    plankA.style,
    kind === "crate"
      ? box({ left: "10px", top: "42px", width: "100px", height: "5px", background: WOOD_DEEP, opacity: ".55" })
      : OFF
  );
  scaler.appendChild(plankA);

  const plankB = document.createElement("div");
  Object.assign(
    plankB.style,
    kind === "crate"
      ? box({ left: "10px", top: "72px", width: "100px", height: "5px", background: WOOD_DEEP, opacity: ".55" })
      : OFF
  );
  scaler.appendChild(plankB);

  const braceA = document.createElement("div");
  Object.assign(
    braceA.style,
    kind === "crate"
      ? box({ left: "18px", top: "50px", width: "86px", height: "9px", borderRadius: "5px", background: WOOD_LIGHT, transform: "rotate(36deg)" })
      : OFF
  );
  scaler.appendChild(braceA);

  const braceB = document.createElement("div");
  Object.assign(
    braceB.style,
    kind === "crate"
      ? box({ left: "18px", top: "50px", width: "86px", height: "9px", borderRadius: "5px", background: WOOD_LIGHT, transform: "rotate(-36deg)" })
      : OFF
  );
  scaler.appendChild(braceB);

  const hoopA = document.createElement("div");
  Object.assign(
    hoopA.style,
    kind === "barrel"
      ? box({ left: "14px", top: "36px", width: "92px", height: "12px", borderRadius: "6px", background: "#8f8f99", boxShadow: "inset 0 3px 0 rgba(255,255,255,.35)" })
      : OFF
  );
  scaler.appendChild(hoopA);

  const hoopB = document.createElement("div");
  Object.assign(
    hoopB.style,
    kind === "barrel"
      ? box({ left: "14px", top: "74px", width: "92px", height: "12px", borderRadius: "6px", background: "#8f8f99", boxShadow: "inset 0 3px 0 rgba(255,255,255,.35)" })
      : OFF
  );
  scaler.appendChild(hoopB);

  const lid = document.createElement("div");
  Object.assign(
    lid.style,
    kind === "barrel"
      ? box({ left: "30px", top: "10px", width: "60px", height: "18px", borderRadius: "50%", background: WOOD_LIGHT, boxShadow: "inset 0 3px 0 rgba(255,255,255,.3)" })
      : OFF
  );
  scaler.appendChild(lid);

  const rivetA = document.createElement("div");
  Object.assign(rivetA.style, rivetStyle(kind, 16, 16));
  scaler.appendChild(rivetA);

  const rivetB = document.createElement("div");
  Object.assign(rivetB.style, rivetStyle(kind, 92, 16));
  scaler.appendChild(rivetB);

  const rivetC = document.createElement("div");
  Object.assign(rivetC.style, rivetStyle(kind, 16, 90));
  scaler.appendChild(rivetC);

  const rivetD = document.createElement("div");
  Object.assign(rivetD.style, rivetStyle(kind, 92, 90));
  scaler.appendChild(rivetD);

  const speck = document.createElement("div");
  Object.assign(
    speck.style,
    kind === "floor"
      ? box({ left: "54px", top: "54px", width: "10px", height: "10px", borderRadius: "50%", background: "#c9c2b4" })
      : OFF
  );
  scaler.appendChild(speck);

  return mount;
}
