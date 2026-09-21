import type { CSSProperties, ReactNode } from "react";

/**
 * Static React renderings of the game sprites (Bomb, Bomber, Powerup, Tile)
 * from the design project. Every sprite is authored in a 120px box and scaled
 * with a transform, so `scale` 1 = one 120px tile. Keyframes live in
 * the Tailwind config (animate-* utilities).
 */

const OFF: CSSProperties = { display: "none" };
const box = (o: CSSProperties): CSSProperties => ({
  position: "absolute",
  boxSizing: "border-box",
  ...o,
});

function Mount({ scale, children }: { scale: number; children: ReactNode }) {
  return (
    <div
      style={{
        position: "relative",
        width: 120 * scale,
        height: 120 * scale,
        flex: "0 0 auto",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 120,
          height: 120,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Bomb */

export type BombState = "placed" | "ticking" | "explode";

export function Bomb({
  state = "ticking",
  range = 2,
  flame = "#ff9a2b",
  scale = 1,
}: {
  state?: BombState;
  range?: number;
  flame?: string;
  scale?: number;
}) {
  const blast = state === "explode";
  const ink = "#131c2b";
  const hot = flame;
  const hotPale = "#ffe9a8";
  const reach = Math.max(1, range) * 120;

  const arm = (dir: "h" | "v", inner: boolean): CSSProperties => {
    if (!blast) return OFF;
    const angle = dir === "h" ? "90deg" : "180deg";
    const c = inner ? hotPale : hot;
    const stops = inner
      ? `${c}00 0%,${c}99 14%,${c} 40%,${c} 60%,${c}99 86%,${c}00 100%`
      : `${c}00 0%,${c}cc 9%,${c} 32%,${c} 68%,${c}cc 91%,${c}00 100%`;
    const len = inner ? reach * 2 - 28 : reach * 2;
    const start = inner ? 60 - reach + 14 : 60 - reach;
    const thick = inner ? 44 : 80;
    const cross = inner ? 38 : 20;
    return box({
      ...(dir === "h"
        ? { left: start, top: cross, width: len, height: thick }
        : { left: cross, top: start, width: thick, height: len }),
      borderRadius: inner ? 22 : 40,
      background: `linear-gradient(${angle},${stops})`,
      filter: inner ? "blur(1px)" : "blur(2px)",
    });
  };

  return (
    <Mount scale={scale}>
      <div
        className="animate-bomb-shock"
        style={
          blast
            ? box({
                left: -10,
                top: -10,
                width: 140,
                height: 140,
                borderRadius: "50%",
                border: `6px solid ${hotPale}`,
                filter: "blur(1.5px)",
              })
            : OFF
        }
      />
      <div className="animate-blast-flicker" style={arm("h", false)} />
      <div className="animate-blast-flicker" style={arm("v", false)} />
      <div style={arm("h", true)} />
      <div style={arm("v", true)} />
      <div
        style={
          blast
            ? box({
                left: -14,
                top: -14,
                width: 148,
                height: 148,
                borderRadius: "50%",
                background: `radial-gradient(circle,${hotPale} 0%,${hotPale}d9 34%,${hot}8c 58%,${hot}00 78%)`,
              })
            : OFF
        }
      />
      <div
        style={
          blast
            ? box({
                left: 26,
                top: 26,
                width: 68,
                height: 68,
                borderRadius: "50%",
                background: `radial-gradient(circle,#fffdf2 0%,#fffdf2 46%,${hotPale}00 100%)`,
              })
            : OFF
        }
      />
      <div
        style={
          blast
            ? OFF
            : box({
                left: 22,
                top: 96,
                width: 76,
                height: 14,
                borderRadius: "50%",
                background: "rgba(5,10,20,.35)",
              })
        }
      />
      <div
        className={state === "ticking" ? "animate-bomb-tick" : undefined}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 120,
          height: 120,
          display: blast ? "none" : "block",
          transformOrigin: "60px 100px",
        }}
      >
        <div
          style={box({
            left: 22,
            top: 34,
            width: 76,
            height: 72,
            borderRadius: "50%",
            background: ink,
            boxShadow:
              "inset -8px -10px 0 rgba(255,255,255,.1), inset 8px 10px 0 rgba(0,0,0,.35)",
          })}
        />
        <div
          style={box({
            left: 38,
            top: 48,
            width: 18,
            height: 13,
            borderRadius: "50%",
            background: "#8fa6c9",
            opacity: 0.8,
          })}
        />
        <div
          style={box({
            left: 22,
            top: 72,
            width: 76,
            height: 10,
            background: "#25334a",
            opacity: 0.75,
          })}
        />
        <div
          style={box({
            left: 50,
            top: 24,
            width: 20,
            height: 16,
            borderRadius: 5,
            background: "#4a5b75",
          })}
        />
        <div
          style={box({
            left: 66,
            top: 8,
            width: 7,
            height: 22,
            borderRadius: 4,
            background: "#c9a06a",
            transform: "rotate(24deg)",
          })}
        />
        <div
          className="animate-bomb-spark"
          style={box({
            left: 70,
            top: -4,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: hotPale,
            boxShadow: `0 0 18px ${hot}, 0 0 6px #fff`,
          })}
        />
      </div>
    </Mount>
  );
}

/* ---------------------------------------------------------------- Bomber */

export type BomberState = "idle" | "walk" | "hurt" | "win";
export type Facing = "down" | "up" | "left" | "right";

export function Bomber({
  accent = "#4aa3ff",
  dark = "#1d5fa8",
  light = "#bfe0ff",
  scale = 1,
  state = "idle",
  facing = "down",
}: {
  accent?: string;
  dark?: string;
  light?: string;
  scale?: number;
  state?: BomberState;
  facing?: Facing;
}) {
  const ink = "#101a2b";
  const walking = state === "walk";
  const hurt = state === "hurt";
  const win = state === "win";

  const dx = facing === "left" ? -4 : facing === "right" ? 4 : 0;
  const dy = facing === "up" ? -4 : facing === "down" ? 2 : 0;

  const anim = walking
    ? "animate-bomber-step"
    : hurt
      ? undefined
      : "animate-bomber-bob";

  const eye = (side: "l" | "r"): CSSProperties => ({
    position: "absolute",
    left: (side === "l" ? 34 : 62) + dx,
    top: 36 + dy + (hurt ? 5 : win ? 4 : 0),
    width: 14,
    height: hurt ? 4 : win ? 6 : 13,
    borderRadius: hurt || win ? 3 : "7px 7px 6px 6px",
    background: "#f4f9ff",
    boxShadow: "0 0 8px rgba(255,255,255,.55)",
  });

  const arm = (left: number, rot: number): CSSProperties => ({
    position: "absolute",
    left,
    top: win ? 40 : 60,
    width: 20,
    height: 24,
    borderRadius: 10,
    background: dark,
    transform: win ? `rotate(${rot}deg)` : "none",
  });

  const foot = (left: number, top: number): CSSProperties => ({
    position: "absolute",
    left,
    top,
    width: 28,
    height: 16,
    borderRadius: "9px 9px 7px 7px",
    background: ink,
  });

  return (
    <Mount scale={scale}>
      <div
        className={anim}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 120,
          height: 120,
          transform: hurt ? "rotate(-8deg)" : "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 22,
            top: 101,
            width: 76,
            height: 13,
            borderRadius: "50%",
            background: "rgba(5,10,20,.42)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 10,
            top: 50,
            width: 100,
            height: 50,
            borderRadius: "50px 50px 16px 16px",
            background: dark,
            opacity: 0.95,
          }}
        />
        <div style={foot(24, walking ? 88 : 92)} />
        <div style={foot(68, walking ? 94 : 92)} />
        <div
          style={{
            position: "absolute",
            left: 20,
            top: 52,
            width: 80,
            height: 48,
            borderRadius: "26px 26px 20px 20px",
            background: accent,
            boxShadow:
              "inset 0 7px 0 rgba(255,255,255,.22), inset 0 -9px 0 rgba(0,0,0,.2)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 40,
            top: 62,
            width: 40,
            height: 32,
            borderRadius: "20px 20px 14px 14px",
            background: light,
            opacity: 0.9,
          }}
        />
        <div
          className="animate-bomber-glow"
          style={{
            position: "absolute",
            left: 52,
            top: 70,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: accent,
            border: `2px solid ${ink}`,
            boxShadow: `0 0 12px ${accent}`,
          }}
        />
        <div style={arm(8, -25)} />
        <div style={arm(92, 25)} />
        <div
          style={{
            position: "absolute",
            left: 14,
            top: 10,
            width: 92,
            height: 60,
            borderRadius: "46px 46px 26px 26px",
            background: accent,
            boxShadow:
              "inset 0 8px 0 rgba(255,255,255,.28), inset 0 -10px 0 rgba(0,0,0,.18)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 50,
            top: 10,
            width: 20,
            height: 24,
            borderRadius: "10px 10px 3px 3px",
            background: light,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 58,
            top: -8,
            width: 4,
            height: 20,
            borderRadius: 2,
            background: ink,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 51,
            top: -19,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: light,
            border: `2px solid ${ink}`,
            boxShadow: `0 0 14px ${accent}`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 22,
            top: 30,
            width: 76,
            height: 26,
            borderRadius: 13,
            background: ink,
            boxShadow:
              "inset 0 3px 0 rgba(255,255,255,.12), 0 2px 0 rgba(0,0,0,.25)",
          }}
        />
        <div style={eye("l")} />
        <div style={eye("r")} />
        <div
          style={{
            position: "absolute",
            left: 48,
            top: 58,
            width: 24,
            height: 6,
            borderRadius: 3,
            background: ink,
            opacity: 0.8,
          }}
        />
      </div>
    </Mount>
  );
}

/* --------------------------------------------------------------- Powerup */

export type PowerupKind = "extraBomb" | "increaseRange";

export function Powerup({
  kind = "extraBomb",
  accent,
  scale = 1,
}: {
  kind?: PowerupKind;
  accent?: string;
  scale?: number;
}) {
  const bomb = kind === "extraBomb";
  const ink = "#0d1626";
  const color = accent ?? (bomb ? "#38d6c4" : "#ff8a3d");
  const deep = bomb ? "#0f6a63" : "#a8410c";
  const pale = bomb ? "#c9fff8" : "#ffe0c2";

  const tip = (left: number, top: number): CSSProperties =>
    bomb
      ? OFF
      : {
          position: "absolute",
          left,
          top,
          width: 20,
          height: 20,
          background: pale,
          borderRadius: 4,
          transform: "rotate(45deg)",
        };

  const bar = (o: CSSProperties): CSSProperties =>
    bomb
      ? OFF
      : { position: "absolute", borderRadius: 8, background: pale, ...o };

  return (
    <Mount scale={scale}>
      <div
        className="animate-pu-pulse"
        style={{
          position: "absolute",
          left: 6,
          top: 6,
          width: 108,
          height: 108,
          borderRadius: 28,
          background: `radial-gradient(circle at 50% 50%, ${color} 0%, rgba(0,0,0,0) 68%)`,
        }}
      />
      <div
        className="animate-pu-hover"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 120,
          height: 120,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 14,
            top: 14,
            width: 92,
            height: 92,
            borderRadius: 24,
            background: color,
            boxSizing: "border-box",
            border: `4px solid ${ink}`,
            boxShadow: "inset 0 -10px 0 rgba(0,0,0,.22)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 24,
            top: 22,
            width: 72,
            height: 22,
            borderRadius: 14,
            background: "rgba(255,255,255,.26)",
          }}
        />
        <div
          style={
            bomb
              ? {
                  position: "absolute",
                  left: 36,
                  top: 40,
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: ink,
                  boxShadow: "inset -6px -8px 0 rgba(255,255,255,.1)",
                }
              : OFF
          }
        />
        <div
          style={
            bomb
              ? {
                  position: "absolute",
                  left: 46,
                  top: 48,
                  width: 13,
                  height: 10,
                  borderRadius: "50%",
                  background: pale,
                  opacity: 0.85,
                }
              : OFF
          }
        />
        <div
          style={
            bomb
              ? {
                  position: "absolute",
                  left: 66,
                  top: 28,
                  width: 6,
                  height: 18,
                  borderRadius: 3,
                  background: deep,
                  transform: "rotate(22deg)",
                }
              : OFF
          }
        />
        <div
          className="animate-pu-spark"
          style={
            bomb
              ? {
                  position: "absolute",
                  left: 70,
                  top: 20,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "#fff3c4",
                  boxShadow: "0 0 14px #ffce3d",
                }
              : OFF
          }
        />
        <div style={bar({ left: 24, top: 52, width: 72, height: 16 })} />
        <div style={bar({ left: 52, top: 24, width: 16, height: 72 })} />
        <div style={tip(16, 50)} />
        <div style={tip(84, 50)} />
        <div style={tip(50, 16)} />
        <div style={tip(50, 84)} />
        <div
          style={
            bomb
              ? OFF
              : {
                  position: "absolute",
                  left: 48,
                  top: 48,
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: ink,
                  boxShadow: "0 0 12px rgba(0,0,0,.4)",
                }
          }
        />
      </div>
    </Mount>
  );
}

/* ------------------------------------------------------------------ Tile */

export type TileKind = "floor" | "wall" | "crate" | "barrel";

export function Tile({
  kind = "floor",
  scale = 1,
}: {
  kind?: TileKind;
  scale?: number;
}) {
  const wood = "#a9622c";
  const woodDeep = "#6b3714";
  const woodLight = "#c98249";
  const steelTop = "#7d8ea6";
  const steel = "#5a6b82";
  const steelDeep = "#33405433";

  const bases: Record<TileKind, CSSProperties> = {
    floor: {
      background: "#e9e5dd",
      boxShadow: "inset 0 -6px 0 rgba(0,0,0,.09), inset 0 0 0 3px rgba(0,0,0,.07)",
      borderRadius: 6,
    },
    wall: {
      background: steel,
      boxShadow: "inset 0 -12px 0 rgba(0,0,0,.28)",
      borderRadius: 10,
    },
    crate: { background: woodDeep, borderRadius: 12 },
    barrel: { background: "#3a2410", borderRadius: 16 },
  };

  const when = (cond: boolean, o: CSSProperties): CSSProperties =>
    cond ? box(o) : OFF;

  const rivet = (left: number, top: number): CSSProperties =>
    when(kind === "wall", {
      left,
      top,
      width: 12,
      height: 12,
      borderRadius: "50%",
      background: "#2a3444",
      boxShadow: "inset 0 2px 0 rgba(255,255,255,.35)",
    });

  const brace = (rot: number): CSSProperties =>
    when(kind === "crate", {
      left: 18,
      top: 50,
      width: 86,
      height: 9,
      borderRadius: 5,
      background: woodLight,
      transform: `rotate(${rot}deg)`,
    });

  const hoop = (top: number): CSSProperties =>
    when(kind === "barrel", {
      left: 14,
      top,
      width: 92,
      height: 12,
      borderRadius: 6,
      background: "#8f8f99",
      boxShadow: "inset 0 3px 0 rgba(255,255,255,.35)",
    });

  return (
    <Mount scale={scale}>
      <div
        style={box({ left: 2, top: 2, width: 116, height: 116, ...bases[kind] })}
      />
      <div
        style={
          kind === "wall"
            ? box({
                left: 10,
                top: 10,
                width: 100,
                height: 72,
                borderRadius: 8,
                background: steelTop,
                boxShadow: `inset 0 5px 0 rgba(255,255,255,.28), inset 0 -6px 0 ${steelDeep}`,
              })
            : kind === "crate"
              ? box({
                  left: 10,
                  top: 10,
                  width: 100,
                  height: 94,
                  borderRadius: 9,
                  background: wood,
                  boxShadow:
                    "inset 0 6px 0 rgba(255,255,255,.2), inset 0 -8px 0 rgba(0,0,0,.24)",
                })
              : kind === "barrel"
                ? box({
                    left: 18,
                    top: 8,
                    width: 84,
                    height: 104,
                    borderRadius: "26px / 34px",
                    background: wood,
                    boxShadow:
                      "inset -10px 0 0 rgba(0,0,0,.18), inset 10px 0 0 rgba(255,255,255,.14)",
                  })
                : OFF
        }
      />
      <div
        style={when(kind === "floor", {
          left: 22,
          top: 22,
          width: 76,
          height: 76,
          borderRadius: 4,
          background: "#ddd7cb",
          opacity: 0.7,
        })}
      />
      <div
        style={when(kind === "crate", {
          left: 10,
          top: 42,
          width: 100,
          height: 5,
          background: woodDeep,
          opacity: 0.55,
        })}
      />
      <div
        style={when(kind === "crate", {
          left: 10,
          top: 72,
          width: 100,
          height: 5,
          background: woodDeep,
          opacity: 0.55,
        })}
      />
      <div style={brace(36)} />
      <div style={brace(-36)} />
      <div style={hoop(36)} />
      <div style={hoop(74)} />
      <div
        style={when(kind === "barrel", {
          left: 30,
          top: 10,
          width: 60,
          height: 18,
          borderRadius: "50%",
          background: woodLight,
          boxShadow: "inset 0 3px 0 rgba(255,255,255,.3)",
        })}
      />
      <div style={rivet(16, 16)} />
      <div style={rivet(92, 16)} />
      <div style={rivet(16, 90)} />
      <div style={rivet(92, 90)} />
      <div
        style={when(kind === "floor", {
          left: 54,
          top: 54,
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: "#c9c2b4",
        })}
      />
    </Mount>
  );
}
