import { Direction } from "../../types/game";

export type BomberState = "idle" | "walk" | "hurt" | "win";

const INK = "#101a2b";

function box(styles: Partial<CSSStyleDeclaration>): Partial<CSSStyleDeclaration> {
  return Object.assign({ position: "absolute", boxSizing: "border-box" }, styles);
}

let keyframesInjected = false;
function ensureKeyframes(): void {
  if (keyframesInjected || typeof document === "undefined") return;
  keyframesInjected = true;
  const style = document.createElement("style");
  style.textContent = `
@keyframes bomberBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes bomberStep{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-3px) rotate(2deg)}}
@keyframes bomberGlow{0%,100%{opacity:.55}50%{opacity:1}}
`;
  document.head.appendChild(style);
}

/**
 * Creates a Bomberman-style character element, scaled from the source 120px
 * design box down to the live cell size.
 */
export function createBomberVisual(
  accent: string,
  dark: string,
  light: string,
  state: BomberState,
  facing: Direction,
  cellSizePx: number
): HTMLDivElement {
  ensureKeyframes();

  const scale = cellSizePx / 120;
  const walking = state === "walk";
  const hurt = state === "hurt";
  const win = state === "win";

  const dx = facing === Direction.LEFT ? -4 : facing === Direction.RIGHT ? 4 : 0;
  const dy = facing === Direction.UP ? -4 : facing === Direction.DOWN ? 2 : 0;

  const anim = walking
    ? "bomberStep .42s ease-in-out infinite"
    : hurt
    ? "none"
    : "bomberBob 2.4s ease-in-out infinite";

  const mount = document.createElement("div");
  Object.assign(mount.style, {
    position: "relative",
    width: `${120 * scale}px`,
    height: `${120 * scale}px`,
    flex: "0 0 auto",
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

  const stage = document.createElement("div");
  Object.assign(stage.style, {
    position: "absolute",
    left: "0",
    top: "0",
    width: "120px",
    height: "120px",
    transform: hurt ? "rotate(-8deg)" : "none",
    animation: anim,
  });
  scaler.appendChild(stage);

  const shadow = document.createElement("div");
  Object.assign(shadow.style, box({ left: "22px", top: "101px", width: "76px", height: "13px", borderRadius: "50%", background: "rgba(5,10,20,.42)" }));
  stage.appendChild(shadow);

  const cape = document.createElement("div");
  Object.assign(cape.style, box({ left: "10px", top: "50px", width: "100px", height: "50px", borderRadius: "50px 50px 16px 16px", background: dark, opacity: ".95" }));
  stage.appendChild(cape);

  const footL = document.createElement("div");
  Object.assign(footL.style, box({ left: "24px", top: walking ? "88px" : "92px", width: "28px", height: "16px", borderRadius: "9px 9px 7px 7px", background: INK }));
  stage.appendChild(footL);

  const footR = document.createElement("div");
  Object.assign(footR.style, box({ left: "68px", top: walking ? "94px" : "92px", width: "28px", height: "16px", borderRadius: "9px 9px 7px 7px", background: INK }));
  stage.appendChild(footR);

  const body = document.createElement("div");
  Object.assign(
    body.style,
    box({
      left: "20px",
      top: "52px",
      width: "80px",
      height: "48px",
      borderRadius: "26px 26px 20px 20px",
      background: accent,
      boxShadow: "inset 0 7px 0 rgba(255,255,255,.22), inset 0 -9px 0 rgba(0,0,0,.2)",
    })
  );
  stage.appendChild(body);

  const belly = document.createElement("div");
  Object.assign(belly.style, box({ left: "40px", top: "62px", width: "40px", height: "32px", borderRadius: "20px 20px 14px 14px", background: light, opacity: ".9" }));
  stage.appendChild(belly);

  const core = document.createElement("div");
  Object.assign(
    core.style,
    box({
      left: "52px",
      top: "70px",
      width: "16px",
      height: "16px",
      borderRadius: "50%",
      background: accent,
      border: `2px solid ${INK}`,
      boxShadow: `0 0 12px ${accent}`,
      animation: "bomberGlow 2.2s ease-in-out infinite",
    })
  );
  stage.appendChild(core);

  const armL = document.createElement("div");
  Object.assign(
    armL.style,
    box({ left: "8px", top: win ? "40px" : "60px", width: "20px", height: "24px", borderRadius: "10px", background: dark, transform: win ? "rotate(-25deg)" : "none" })
  );
  stage.appendChild(armL);

  const armR = document.createElement("div");
  Object.assign(
    armR.style,
    box({ left: "92px", top: win ? "40px" : "60px", width: "20px", height: "24px", borderRadius: "10px", background: dark, transform: win ? "rotate(25deg)" : "none" })
  );
  stage.appendChild(armR);

  const helmet = document.createElement("div");
  Object.assign(
    helmet.style,
    box({
      left: "14px",
      top: "10px",
      width: "92px",
      height: "60px",
      borderRadius: "46px 46px 26px 26px",
      background: accent,
      boxShadow: "inset 0 8px 0 rgba(255,255,255,.28), inset 0 -10px 0 rgba(0,0,0,.18)",
    })
  );
  stage.appendChild(helmet);

  const crest = document.createElement("div");
  Object.assign(crest.style, box({ left: "50px", top: "10px", width: "20px", height: "24px", borderRadius: "10px 10px 3px 3px", background: light }));
  stage.appendChild(crest);

  const antenna = document.createElement("div");
  Object.assign(antenna.style, box({ left: "58px", top: "-8px", width: "4px", height: "20px", borderRadius: "2px", background: INK }));
  stage.appendChild(antenna);

  const bulb = document.createElement("div");
  Object.assign(bulb.style, box({ left: "51px", top: "-19px", width: "18px", height: "18px", borderRadius: "50%", background: light, border: `2px solid ${INK}`, boxShadow: `0 0 14px ${accent}` }));
  stage.appendChild(bulb);

  const visor = document.createElement("div");
  Object.assign(
    visor.style,
    box({
      left: "22px",
      top: "30px",
      width: "76px",
      height: "26px",
      borderRadius: "13px",
      background: INK,
      boxShadow: "inset 0 3px 0 rgba(255,255,255,.12), 0 2px 0 rgba(0,0,0,.25)",
    })
  );
  stage.appendChild(visor);

  const eye = (side: "l" | "r") => {
    const baseL = 34 + dx;
    const baseR = 62 + dx;
    const left = side === "l" ? baseL : baseR;
    const h = hurt ? 4 : win ? 6 : 13;
    return box({
      left: `${left}px`,
      top: `${36 + dy + (hurt ? 5 : win ? 4 : 0)}px`,
      width: "14px",
      height: `${h}px`,
      borderRadius: hurt || win ? "3px" : "7px 7px 6px 6px",
      background: "#f4f9ff",
      boxShadow: "0 0 8px rgba(255,255,255,.55)",
    });
  };

  const eyeL = document.createElement("div");
  Object.assign(eyeL.style, eye("l"));
  stage.appendChild(eyeL);

  const eyeR = document.createElement("div");
  Object.assign(eyeR.style, eye("r"));
  stage.appendChild(eyeR);

  const vent = document.createElement("div");
  Object.assign(vent.style, box({ left: "48px", top: "58px", width: "24px", height: "6px", borderRadius: "3px", background: INK, opacity: ".8" }));
  stage.appendChild(vent);

  return mount;
}
