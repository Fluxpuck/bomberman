import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { GameMode } from "../../types/game";
import { Bomb, Bomber, Tile, type TileKind } from "../sprites";
import { Button, type ButtonVariant } from "../ui";

interface StartScreenProps {
  onStart: (mode: GameMode) => void;
  onMultiplayer: () => void;
}

const BUNGEE = "var(--font-bungee), 'Bungee', sans-serif";
const PIXEL = "'Courier New', Courier, monospace";

// Button colour per game mode
const modeVariant: Record<GameMode, ButtonVariant> = {
  solo: "green",
  "2 players": "blue",
  "3 players": "orange",
  "4 players": "red",
  online: "purple",
};

const gameModes: GameMode[] = ["solo", "2 players", "3 players", "4 players"];

const BLUE = { accent: "#60a5fa", dark: "#1e3a8a", light: "#cfe8ff" };
const RED = { accent: "#ef4444", dark: "#991b1b", light: "#ffd3cf" };
const PURPLE = { accent: "#a78bfa", dark: "#5b21b6", light: "#ecd4ff" };
const GREEN = { accent: "#4ade80", dark: "#166534", light: "#d8ffe6" };

// Decorative floor strip along the bottom edge; repeats to fill the width.
const TILE_PATTERN: TileKind[] = [
  "crate", "wall", "floor", "barrel", "floor", "crate", "floor", "wall",
  "floor", "crate", "floor", "barrel", "floor", "wall", "floor", "crate",
];
const TILE_ROWS = 3;

/**
 * Layout unit: 1 = the 1920x1080 design artboard. Bound by height, and by
 * width against the title lockup (~1300 design px wide) so it never overflows.
 */
function useUnit(): number | null {
  const [u, setU] = useState<number | null>(null);
  useEffect(() => {
    const update = () =>
      setU(Math.min(window.innerHeight / 1080, window.innerWidth / 1300));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return u;
}

function Abs({ style, children }: { style: CSSProperties; children: ReactNode }) {
  return <div style={{ position: "absolute", ...style }}>{children}</div>;
}

export function StartScreen({ onStart, onMultiplayer }: StartScreenProps) {
  const u = useUnit();

  // Measure before painting so the layout doesn't jump from a default size.
  if (u === null) return <div className="fixed inset-0 z-50" />;

  const wide = typeof window !== "undefined" && window.innerWidth >= 700;
  const tile = 120 * u;
  const tileGap = 4;
  const tileCols =
    Math.ceil((typeof window !== "undefined" ? window.innerWidth : 1920) / (tile + tileGap)) + 1;

  // Size the shared button to the layout unit (see .ui-btn in globals.css).
  const buttonSize = {
    "--bw": `${Math.max(2, 4 * u)}px`,
    "--depth": `${Math.max(3, 6 * u)}px`,
    "--btn-py": `${Math.max(8, 11 * u)}px`,
    "--btn-fs": `${Math.max(14, 22 * u)}px`,
    borderRadius: Math.max(8, 12 * u),
  } as CSSProperties;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Vignette + scanlines over the page background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(70% 55% at 50% 30%,rgba(11,21,38,.35) 0%,rgba(11,21,38,.78) 68%,rgba(7,13,24,.92) 100%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "repeating-linear-gradient(0deg,rgba(0,0,0,.18) 0 2px,rgba(0,0,0,0) 2px 5px)",
          opacity: 0.45,
        }}
      />

      {/* Decorative tiles, faded into the ground */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 pointer-events-none overflow-hidden" style={{ height: 340 * u }}>
        <div
          className="grid h-full overflow-hidden"
          style={{
            gridTemplateColumns: `repeat(${tileCols}, ${tile}px)`,
            gridAutoRows: tile,
            gap: tileGap,
            justifyContent: "center",
            alignContent: "end",
            opacity: 0.82,
          }}
        >
          {Array.from({ length: tileCols * TILE_ROWS }, (_, i) => {
            const row = Math.floor(i / tileCols);
            const col = i % tileCols;
            return (
              <Tile key={i} kind={TILE_PATTERN[(col + row * 5) % TILE_PATTERN.length]} scale={u} />
            );
          })}
        </div>
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg,#0a1120 0%,rgba(10,17,32,.6) 42%,rgba(10,17,32,.18) 100%)",
          }}
        />
      </div>

      {/* Title + menu */}
      <div
        className="absolute inset-x-0 flex flex-col items-center"
        style={{ top: 60 * u, gap: Math.max(10, 26 * u) }}
      >
        <h1
          className="text-center whitespace-nowrap"
          style={{
            fontFamily: BUNGEE,
            fontSize: 158 * u,
            lineHeight: 0.82,
            color: "#ffce3d",
            textShadow: `0 ${10 * u}px 0 #a8410c, 0 0 ${90 * u}px rgba(255,154,43,.5)`,
          }}
        >
          BOMB BLAST
        </h1>
        <div className="flex items-center" style={{ gap: 26 * u }}>
          <div style={{ height: Math.max(3, 7 * u), width: 150 * u, background: "#5fd7f2", borderRadius: 4 }} />
          <div
            style={{
              fontFamily: BUNGEE,
              fontSize: 76 * u,
              color: "#5fd7f2",
              letterSpacing: ".26em",
              marginRight: "-.26em",
            }}
          >
            ARENA
          </div>
          <div style={{ height: Math.max(3, 7 * u), width: 150 * u, background: "#5fd7f2", borderRadius: 4 }} />
        </div>
        <p
          className="text-center px-4"
          style={{ fontSize: Math.max(14, 26 * u), color: "#dbe7f7", letterSpacing: ".02em" }}
        >
          Select game mode to start playing.
        </p>

        <div
          className="flex flex-col items-center"
          style={{ gap: Math.max(8, 12 * u), marginTop: 4, width: "min(520px, 92vw)", maxWidth: 520 }}
        >
          <div
            className="grid grid-cols-2 w-full"
            style={{ gap: Math.max(8, 14 * u) }}
          >
            {gameModes.map((mode) => (
              <Button
                key={mode}
                variant={modeVariant[mode]}
                style={buttonSize}
                onClick={() => onStart(mode)}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Button>
            ))}
          </div>
          <Button block variant={modeVariant.online} style={buttonSize} onClick={onMultiplayer}>
            Multiplayer (Online)
          </Button>
          <p
            className="text-center px-2"
            style={{
              fontFamily: PIXEL,
              fontWeight: 700,
              fontSize: Math.max(12, 18 * u),
              color: "#a8bcd8",
              letterSpacing: ".04em",
              marginTop: 2,
            }}
          >
            Controls: WASD keys to move, Space to place bombs
          </p>
        </div>
      </div>

      {/* Cast, hidden on narrow screens where they would crowd the menu */}
      {wide && (
        <div aria-hidden className="pointer-events-none">
          <Abs style={{ left: 130 * u, bottom: 150 * u, zIndex: 3 }}>
            <Bomber {...BLUE} scale={2.2 * u} state="idle" facing="right" />
          </Abs>
          <Abs style={{ left: 400 * u, bottom: 96 * u, zIndex: 3 }}>
            <Bomber {...RED} scale={1.8 * u} state="walk" facing="right" />
          </Abs>
          <Abs style={{ right: 150 * u, bottom: 150 * u, zIndex: 3 }}>
            <Bomber {...PURPLE} scale={2.2 * u} state="win" facing="down" />
          </Abs>
          <Abs style={{ right: 452 * u, bottom: 96 * u, zIndex: 3 }}>
            <Bomber {...GREEN} scale={1.8 * u} state="idle" facing="left" />
          </Abs>
          <Abs style={{ left: "50%", bottom: 110 * u, transform: "translateX(-50%)", zIndex: 2 }}>
            <Bomb state="ticking" scale={1.5 * u} />
          </Abs>
        </div>
      )}
    </div>
  );
}
