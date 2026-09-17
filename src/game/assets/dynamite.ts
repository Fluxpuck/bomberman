const INK = "#131c2b";
const HOT_PALE = "#ffe9a8";
const DEFAULT_FLAME = "#ff9a2b";

function box(styles: Partial<CSSStyleDeclaration>): Partial<CSSStyleDeclaration> {
  return Object.assign({ position: "absolute", boxSizing: "border-box" }, styles);
}

let keyframesInjected = false;
function ensureKeyframes(): void {
  if (keyframesInjected || typeof document === "undefined") return;
  keyframesInjected = true;
  const style = document.createElement("style");
  style.textContent = `
@keyframes bombTick{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}
@keyframes bombSpark{0%,100%{opacity:.5;transform:scale(.75) rotate(0deg)}50%{opacity:1;transform:scale(1.3) rotate(25deg)}}
@keyframes bombShock{0%{opacity:.7;transform:scale(.6)}100%{opacity:0;transform:scale(1.5)}}
@keyframes blastFlicker{0%,100%{opacity:1}50%{opacity:.78}}
`;
  document.head.appendChild(style);
}

/**
 * Creates the placed/ticking bomb visual for a cell. Kept tagged with the
 * "dynamite" class so armDynamite's chain-detonation lookup keeps finding it.
 */
export function createBombVisual(cellSizePx: number): HTMLDivElement {
  ensureKeyframes();

  const scale = cellSizePx / 120;

  const mount = document.createElement("div");
  mount.classList.add("dynamite");
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

  const shadow = document.createElement("div");
  Object.assign(shadow.style, box({ left: "22px", top: "96px", width: "76px", height: "14px", borderRadius: "50%", background: "rgba(5,10,20,.35)" }));
  scaler.appendChild(shadow);

  const ticker = document.createElement("div");
  Object.assign(ticker.style, {
    position: "absolute",
    left: "0",
    top: "0",
    width: "120px",
    height: "120px",
    transformOrigin: "60px 100px",
    animation: "bombTick .7s ease-in-out infinite",
  });
  scaler.appendChild(ticker);

  const ball = document.createElement("div");
  Object.assign(
    ball.style,
    box({
      left: "22px",
      top: "34px",
      width: "76px",
      height: "72px",
      borderRadius: "50%",
      background: INK,
      boxShadow: "inset -8px -10px 0 rgba(255,255,255,.1), inset 8px 10px 0 rgba(0,0,0,.35)",
    })
  );
  ticker.appendChild(ball);

  const shine = document.createElement("div");
  Object.assign(shine.style, box({ left: "38px", top: "48px", width: "18px", height: "13px", borderRadius: "50%", background: "#8fa6c9", opacity: ".8" }));
  ticker.appendChild(shine);

  const band = document.createElement("div");
  Object.assign(band.style, box({ left: "22px", top: "72px", width: "76px", height: "10px", background: "#25334a", opacity: ".75" }));
  ticker.appendChild(band);

  const cap = document.createElement("div");
  Object.assign(cap.style, box({ left: "50px", top: "24px", width: "20px", height: "16px", borderRadius: "5px", background: "#4a5b75" }));
  ticker.appendChild(cap);

  const fuse = document.createElement("div");
  Object.assign(fuse.style, box({ left: "66px", top: "8px", width: "7px", height: "22px", borderRadius: "4px", background: "#c9a06a", transform: "rotate(24deg)" }));
  ticker.appendChild(fuse);

  const spark = document.createElement("div");
  Object.assign(
    spark.style,
    box({
      left: "70px",
      top: "-4px",
      width: "20px",
      height: "20px",
      borderRadius: "50%",
      background: HOT_PALE,
      boxShadow: `0 0 18px ${DEFAULT_FLAME}, 0 0 6px #fff`,
      animation: "bombSpark .5s ease-in-out infinite",
    })
  );
  ticker.appendChild(spark);

  return mount;
}

export interface BlastReach {
  up: number;
  down: number;
  left: number;
  right: number;
}

/**
 * Creates the blast visual for an exploding bomb: one component anchored at
 * the bomb's own cell. Each direction's arm length is independent (in tiles)
 * so the graphic stops exactly where the gameplay blast actually stopped
 * (e.g. at an indestructible wall) instead of always drawing a fixed length.
 * Caller is responsible for positioning it (absolute, at the bomb's cell
 * top-left) and removing it after the explosion duration.
 */
export function createBlastVisual(
  reach: BlastReach,
  cellSizePx: number,
  flame: string = DEFAULT_FLAME
): HTMLDivElement {
  ensureKeyframes();

  const scale = cellSizePx / 120;
  const hot = flame;
  const hotPale = HOT_PALE;

  const mount = document.createElement("div");
  Object.assign(mount.style, {
    position: "relative",
    width: `${120 * scale}px`,
    height: `${120 * scale}px`,
    pointerEvents: "none",
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

  const shock = document.createElement("div");
  Object.assign(
    shock.style,
    box({
      left: "-10px",
      top: "-10px",
      width: "140px",
      height: "140px",
      borderRadius: "50%",
      border: `8px solid ${hotPale}`,
      filter: "blur(1.5px)",
      animation: "bombShock 1.1s ease-out infinite",
    })
  );
  scaler.appendChild(shock);

  // Build one arm per direction. Fire thickness stays narrow while its length
  // reaches the full distance covered by each affected tile.
  const addArm = (dir: "up" | "down" | "left" | "right", tiles: number) => {
    const len = Math.max(0, tiles) * 120;
    if (len <= 0) return;

    const horizontal = dir === "left" || dir === "right";
    const toward = { up: "top", down: "bottom", left: "left", right: "right" }[dir];

    const outer = document.createElement("div");
    Object.assign(
      outer.style,
      box(
        horizontal
          ? {
              left: dir === "right" ? "56px" : `${-len}px`,
              top: "14px",
              width: `${len + 64}px`,
              height: "92px",
              borderRadius: "46px",
              background: `linear-gradient(to ${toward},${hot} 0%,${hot} 82%,${hot}e6 100%)`,
              filter: "blur(2px)",
              animation: "blastFlicker .28s ease-in-out infinite",
            }
          : {
              left: "14px",
              top: dir === "down" ? "56px" : `${-len}px`,
              width: "92px",
              height: `${len + 64}px`,
              borderRadius: "46px",
              background: `linear-gradient(to ${toward},${hot} 0%,${hot} 82%,${hot}e6 100%)`,
              filter: "blur(2px)",
              animation: "blastFlicker .28s ease-in-out infinite",
            }
      )
    );
    scaler.appendChild(outer);

    const innerLen = Math.max(0, len - 6);
    if (innerLen <= 0) return;

    const inner = document.createElement("div");
    Object.assign(
      inner.style,
      box(
        horizontal
          ? {
              left: dir === "right" ? "60px" : `${60 - innerLen}px`,
              top: "34px",
              width: `${innerLen}px`,
              height: "52px",
              borderRadius: "26px",
              background: `linear-gradient(to ${toward},${hotPale} 0%,${hotPale} 72%,${hotPale}99 94%,${hotPale}00 100%)`,
              filter: "blur(1px)",
            }
          : {
              left: "34px",
              top: dir === "down" ? "60px" : `${60 - innerLen}px`,
              width: "52px",
              height: `${innerLen}px`,
              borderRadius: "26px",
              background: `linear-gradient(to ${toward},${hotPale} 0%,${hotPale} 72%,${hotPale}99 94%,${hotPale}00 100%)`,
              filter: "blur(1px)",
            }
      )
    );
    scaler.appendChild(inner);
  };

  addArm("up", reach.up);
  addArm("down", reach.down);
  addArm("left", reach.left);
  addArm("right", reach.right);

  const flash = document.createElement("div");
  Object.assign(
    flash.style,
    box({
      left: "-14px",
      top: "-14px",
      width: "148px",
      height: "148px",
      borderRadius: "50%",
      background: `radial-gradient(circle,${hotPale} 0%,${hotPale}d9 34%,${hot}8c 58%,${hot}00 78%)`,
    })
  );
  scaler.appendChild(flash);

  const flashCore = document.createElement("div");
  Object.assign(
    flashCore.style,
    box({
      left: "26px",
      top: "26px",
      width: "68px",
      height: "68px",
      borderRadius: "50%",
      background: `radial-gradient(circle,#fffdf2 0%,#fffdf2 46%,${hotPale}00 100%)`,
    })
  );
  scaler.appendChild(flashCore);

  return mount;
}
