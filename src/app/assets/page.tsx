import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import {
  Bomb,
  Bomber,
  Powerup,
  Tile,
  type BomberState,
  type Facing,
  type PowerupKind,
  type TileKind,
} from "../../components/sprites";
import { DownloadPng } from "./downloadButton";
import { FitWidth } from "./fitWidth";

export const metadata: Metadata = {
  title: "Bomb Blast Arena — asset kit",
  robots: { index: false },
};

// Font variables (--font-bungee / --font-space / --font-mono) come from the
// vendored next/font/local fonts in the root layout.
const BUNGEE = "var(--font-bungee), 'Bungee', sans-serif";
const MONO = "var(--font-mono), 'JetBrains Mono', monospace";
const SPACE = "var(--font-space), 'Space Grotesk', Helvetica, sans-serif";
const PIXEL = "'Courier New', Courier, monospace";

type Palette = { accent: string; dark: string; light: string };
const BLUE: Palette = { accent: "#60a5fa", dark: "#1e3a8a", light: "#cfe8ff" };
const RED: Palette = { accent: "#ef4444", dark: "#991b1b", light: "#ffd3cf" };
const PURPLE: Palette = { accent: "#a78bfa", dark: "#5b21b6", light: "#ecd4ff" };
const GREEN: Palette = { accent: "#4ade80", dark: "#166534", light: "#d8ffe6" };

const iconGround = "linear-gradient(160deg,#ffce3d 0%,#ff9a2b 100%)";
const label: CSSProperties = {
  fontFamily: MONO,
  fontSize: 12,
  letterSpacing: ".14em",
  color: "#7f9bc4",
};
const caption: CSSProperties = { fontFamily: MONO, fontSize: 11, color: "#7f9bc4" };

type Asset = { id: string; name: string; label: string };

function Block({
  title,
  assets,
  children,
}: {
  title: string;
  assets?: Asset[];
  children: ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={label}>{title}</div>
        {assets?.map((a) => (
          <DownloadPng key={a.id} targetId={a.id} name={a.name} label={a.label} />
        ))}
      </div>
      {children}
    </div>
  );
}

function Abs({ style, children }: { style: CSSProperties; children: ReactNode }) {
  return <div style={{ position: "absolute", ...style }}>{children}</div>;
}

function Guy({
  p,
  scale,
  state = "idle",
  facing = "down",
}: {
  p: Palette;
  scale: number;
  state?: BomberState;
  facing?: Facing;
}) {
  return <Bomber accent={p.accent} dark={p.dark} light={p.light} scale={scale} state={state} facing={facing} />;
}

/** Icon-sized bomb clipped inside a rounded ground. */
function BombIcon({
  id,
  size,
  radius,
  offset,
  scale,
  background,
}: {
  id?: string;
  size: number;
  radius: number;
  offset: [number, number];
  scale: number;
  background: string;
}) {
  return (
    <div
      id={id}
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: radius,
        overflow: "hidden",
        background,
        flex: "0 0 auto",
      }}
    >
      <Abs style={{ left: offset[0], top: offset[1] }}>
        <Bomb state="placed" scale={scale} />
      </Abs>
    </div>
  );
}

/* Banner board: 5 x 4 tiles. Strings are tile kinds; objects overlay a sprite on a floor tile. */
type Overlay =
  | { floor: true; bomber: { p: Palette; state: BomberState; facing: Facing } }
  | { floor: true; powerup: PowerupKind }
  | { floor: true; blast: true };
type Cell = TileKind | Overlay;

const BANNER_CELLS: Cell[] = [
  "wall", "crate", "floor", "barrel", "wall",
  { floor: true, bomber: { p: BLUE, state: "walk", facing: "right" } }, "floor", { floor: true, powerup: "extraBomb" }, "floor", { floor: true, bomber: { p: RED, state: "idle", facing: "left" } },
  "crate", "floor", { floor: true, blast: true }, "floor", "crate",
  "wall", { floor: true, powerup: "increaseRange" }, "floor", { floor: true, bomber: { p: PURPLE, state: "idle", facing: "down" } }, "wall",
];

function BannerCell({ cell }: { cell: Cell }) {
  const S = 0.766;
  if (typeof cell === "string") {
    return <div><Tile kind={cell} scale={S} /></div>;
  }
  return (
    <div style={{ position: "relative", zIndex: "blast" in cell ? 4 : undefined }}>
      <Tile kind="floor" scale={S} />
      <Abs style={{ left: 0, top: 0 }}>
        {"bomber" in cell ? (
          <Guy p={cell.bomber.p} scale={S} state={cell.bomber.state} facing={cell.bomber.facing} />
        ) : "powerup" in cell ? (
          <Powerup kind={cell.powerup} scale={0.72} />
        ) : (
          <Bomb state="explode" range={2} scale={S} />
        )}
      </Abs>
    </div>
  );
}

const TITLE_TILES: TileKind[] = [
  "crate", "wall", "floor", "barrel", "floor", "crate", "floor", "wall",
  "floor", "crate", "floor", "barrel", "floor", "wall", "floor", "crate",
];

const MODE_BUTTONS = [
  { text: "2 Players", bg: "#60a5fa", border: "#1e3a8a", color: "#fff" },
  { text: "3 Players", bg: "#f59e0b", border: "#b45309", color: "#fff" },
  { text: "4 Players", bg: "#ef4444", border: "#991b1b", color: "#fff" },
];

const modeButton: CSSProperties = {
  padding: "16px 0",
  borderRadius: 12,
  fontFamily: PIXEL,
  fontWeight: 700,
  fontSize: 30,
  letterSpacing: ".05em",
  textAlign: "center",
};

export default function MarketingAssets() {
  return (
    <div className="fixed inset-0 overflow-auto bg-[#070d18]">
      <section
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 38,
          padding: 48,
          width: "100%",
          fontFamily: SPACE,
          color: "#e8f0fb",
          background: "radial-gradient(120% 80% at 50% 0%,#16294a 0%,#070d18 72%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 12,
              letterSpacing: ".18em",
              color: "#0a1120",
              background: "#ffce3d",
              padding: "4px 9px",
              borderRadius: 5,
              fontWeight: 700,
            }}
          >
            4a
          </span>
          <h1 style={{ margin: 0, fontSize: 34, fontWeight: 700, letterSpacing: "-.01em" }}>
            Bomb Blast Arena — asset kit
          </h1>
          <p style={{ margin: 0, fontFamily: MONO, fontSize: 13, color: "#7f9bc4" }}>
            artboards at export size · built from the game&apos;s own sprites · click a ↓ button to download a PNG
          </p>
        </div>

        {/* 01 LOGO */}
        <Block
          title="01 · LOGO LOCKUP"
          assets={[
            { id: "asset-logo-dark", name: "bomb-blast-arena-logo-dark", label: "dark 760×300" },
            { id: "asset-logo-light", name: "bomb-blast-arena-logo-light", label: "light card" },
            { id: "asset-logo-line", name: "bomb-blast-arena-logo-line", label: "one-line" },
          ]}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start" }}>
            <FitWidth w={760} h={300}>
              <div
                id="asset-logo-dark"
                style={{
                  width: 760,
                  height: 300,
                boxSizing: "border-box",
                flex: "0 0 auto",
                position: "relative",
                overflow: "hidden",
                borderRadius: 14,
                background: "#0a1120",
                border: "1px solid rgba(124,196,255,.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: 520,
                  height: 520,
                  transform: "translate(-50%,-50%)",
                  borderRadius: "50%",
                  background: "radial-gradient(circle,rgba(255,154,43,.22) 0%,rgba(255,154,43,0) 62%)",
                }}
              />
              <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 22 }}>
                <div style={{ position: "relative", width: 96, height: 96, flex: "0 0 auto" }}>
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: 24,
                      background: "linear-gradient(160deg,#233a63 0%,#0e1a2f 100%)",
                      border: "3px solid #ffce3d",
                      boxSizing: "border-box",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      width: 96,
                      height: 96,
                      overflow: "hidden",
                      borderRadius: 24,
                    }}
                  >
                    <Abs style={{ left: -14, top: -8 }}>
                      <Bomb state="placed" scale={0.95} />
                    </Abs>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div
                    style={{
                      fontFamily: BUNGEE,
                      fontSize: 50,
                      lineHeight: 0.92,
                      color: "#ffce3d",
                      letterSpacing: ".005em",
                      textShadow: "0 4px 0 #a8410c,0 0 26px rgba(255,154,43,.5)",
                    }}
                  >
                    BOMB
                    <br />
                    BLAST
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ height: 3, width: 34, background: "#5fd7f2", borderRadius: 2 }} />
                    <div style={{ fontFamily: BUNGEE, fontSize: 24, color: "#5fd7f2", letterSpacing: ".22em" }}>
                      ARENA
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </FitWidth>

            <FitWidth w={360} h={300}>
            <div style={{ width: 360, height: 300, flex: "0 0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                id="asset-logo-light"
                style={{
                  flex: 1,
                  borderRadius: 14,
                  background: "#f2ede3",
                  border: "1px solid rgba(0,0,0,.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: 58,
                    height: 58,
                    overflow: "hidden",
                    borderRadius: 15,
                    background: "#0a1120",
                  }}
                >
                  <Abs style={{ left: -9, top: -5 }}>
                    <Bomb state="placed" scale={0.58} />
                  </Abs>
                </div>
                <div style={{ fontFamily: BUNGEE, fontSize: 26, lineHeight: 0.9, color: "#14203a" }}>
                  BOMB
                  <br />
                  BLAST<span style={{ color: "#a8410c" }}> ARENA</span>
                </div>
              </div>
              <div
                id="asset-logo-line"
                style={{
                  flex: 1,
                  borderRadius: 14,
                  background: "#0a1120",
                  border: "1px solid rgba(255,255,255,.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div style={{ fontFamily: BUNGEE, fontSize: 19, color: "#f5f1e6", letterSpacing: ".06em" }}>
                  BOMB BLAST <span style={{ color: "#ffce3d" }}>ARENA</span>
                </div>
              </div>
              <div style={caption}>light ground · single-line horizontal</div>
              </div>
            </FitWidth>
          </div>
        </Block>

        {/* 02 BANNER */}
        <Block
          title="02 · SOCIAL BANNER · 1280×640"
          assets={[{ id: "asset-banner", name: "bomb-blast-arena-banner-1280x640", label: "1280×640" }]}
        >
          <FitWidth w={1280} h={640}>
          <div
            id="asset-banner"
            style={{
              width: 1280,
              height: 640,
              flex: "0 0 auto",
              position: "relative",
              overflow: "hidden",
              borderRadius: 16,
              background: "linear-gradient(165deg,#1b2f55 0%,#0a1120 58%,#1a1120 100%)",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "repeating-linear-gradient(90deg,rgba(124,196,255,.07) 0 1px,rgba(0,0,0,0) 1px 64px),repeating-linear-gradient(0deg,rgba(124,196,255,.07) 0 1px,rgba(0,0,0,0) 1px 64px)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: -120,
                top: -160,
                width: 760,
                height: 760,
                borderRadius: "50%",
                background: "radial-gradient(circle,rgba(255,154,43,.2) 0%,rgba(255,154,43,0) 64%)",
              }}
            />

            <div
              style={{
                position: "absolute",
                left: 72,
                top: 104,
                display: "flex",
                flexDirection: "column",
                gap: 26,
                width: 620,
              }}
            >
              <div
                style={{
                  fontFamily: BUNGEE,
                  fontSize: 96,
                  lineHeight: 0.86,
                  color: "#ffce3d",
                  textShadow: "0 6px 0 #a8410c,0 0 44px rgba(255,154,43,.45)",
                }}
              >
                BOMB
                <br />
                BLAST
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ height: 5, width: 54, background: "#5fd7f2", borderRadius: 3 }} />
                <div style={{ fontFamily: BUNGEE, fontSize: 44, color: "#5fd7f2", letterSpacing: ".2em" }}>ARENA</div>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 25,
                  lineHeight: 1.35,
                  color: "#d7e4f7",
                  maxWidth: "22ch",
                  textWrap: "pretty",
                }}
              >
                Outlast three bots — or four friends — in a grid that keeps blowing up.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#0a1120",
                    background: "#ffce3d",
                    padding: "10px 16px",
                    borderRadius: 8,
                  }}
                >
                  ONLINE MULTIPLAYER
                </span>
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#5fd7f2",
                    border: "2px solid rgba(95,215,242,.55)",
                    padding: "8px 16px",
                    borderRadius: 8,
                  }}
                >
                  NPC OPPONENTS
                </span>
              </div>
            </div>

            <div
              style={{
                position: "absolute",
                right: 44,
                top: 70,
                display: "grid",
                gridTemplateColumns: "repeat(5,92px)",
                gridAutoRows: 92,
                gap: 4,
                background: "#2f3440",
                padding: 10,
                borderRadius: 14,
                transform: "rotate(-6deg)",
                boxShadow: "0 34px 70px rgba(0,0,0,.55)",
              }}
            >
              {BANNER_CELLS.map((cell, i) => (
                <BannerCell key={i} cell={cell} />
              ))}
            </div>
          </div>
          </FitWidth>
        </Block>

        {/* 03 TITLE SCREEN */}
        <Block
          title="03 · TITLE / BACK SCREEN · 1920×1080 · over the game's own background.jpg"
          assets={[{ id: "asset-title", name: "bomb-blast-arena-title-1920x1080", label: "1920×1080" }]}
        >
          <FitWidth w={1920} h={1080}>
          <div
            id="asset-title"
            style={{
              width: 1920,
              height: 1080,
              flex: "0 0 auto",
              position: "relative",
              overflow: "hidden",
              borderRadius: 18,
              background: "#0b1526",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: "url(/image/background.jpg)",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(70% 55% at 50% 30%,rgba(11,21,38,.35) 0%,rgba(11,21,38,.78) 68%,rgba(7,13,24,.92) 100%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "repeating-linear-gradient(0deg,rgba(0,0,0,.18) 0 2px,rgba(0,0,0,0) 2px 5px)",
                opacity: 0.45,
              }}
            />

            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: 340,
                display: "grid",
                gridTemplateColumns: "repeat(16,120px)",
                gridAutoRows: 120,
                gap: 4,
                opacity: 0.82,
              }}
            >
              {TITLE_TILES.map((kind, i) => (
                <div key={i}>
                  <Tile kind={kind} scale={1} />
                </div>
              ))}
            </div>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: 340,
                background: "linear-gradient(180deg,#0a1120 0%,rgba(10,17,32,.6) 42%,rgba(10,17,32,.18) 100%)",
              }}
            />

            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 60,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 26,
              }}
            >
              <div
                style={{
                  fontFamily: BUNGEE,
                  fontSize: 158,
                  lineHeight: 0.82,
                  color: "#ffce3d",
                  textAlign: "center",
                  textShadow: "0 10px 0 #a8410c,0 0 90px rgba(255,154,43,.5)",
                }}
              >
                BOMB BLAST
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
                <div style={{ height: 7, width: 150, background: "#5fd7f2", borderRadius: 4 }} />
                <div style={{ fontFamily: BUNGEE, fontSize: 76, color: "#5fd7f2", letterSpacing: ".26em" }}>ARENA</div>
                <div style={{ height: 7, width: 150, background: "#5fd7f2", borderRadius: 4 }} />
              </div>
              <p style={{ margin: 0, fontSize: 30, color: "#dbe7f7", letterSpacing: ".02em" }}>
                Select game mode to start playing.
              </p>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  alignItems: "center",
                  marginTop: 4,
                  width: 760,
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, width: "100%" }}>
                  {MODE_BUTTONS.map((b) => (
                    <div
                      key={b.text}
                      style={{
                        ...modeButton,
                        background: b.bg,
                        border: `4px solid ${b.border}`,
                        color: b.color,
                      }}
                    >
                      {b.text}
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    ...modeButton,
                    width: "100%",
                    background: "#a78bfa",
                    border: "4px solid #5b21b6",
                    color: "#fff",
                  }}
                >
                  Multiplayer (Online)
                </div>
                <div
                  style={{
                    fontFamily: PIXEL,
                    fontWeight: 700,
                    fontSize: 21,
                    color: "#a8bcd8",
                    letterSpacing: ".04em",
                    marginTop: 2,
                    whiteSpace: "nowrap",
                    textAlign: "center",
                  }}
                >
                  Controls: WASD keys to move, Space to place bombs
                </div>
              </div>
            </div>

            <Abs style={{ left: 130, bottom: 150, zIndex: 3 }}>
              <Guy p={BLUE} scale={2.2} state="idle" facing="right" />
            </Abs>
            <Abs style={{ left: 400, bottom: 96, zIndex: 3 }}>
              <Guy p={RED} scale={1.8} state="walk" facing="right" />
            </Abs>
            <Abs style={{ right: 150, bottom: 150, zIndex: 3 }}>
              <Guy p={PURPLE} scale={2.2} state="win" facing="down" />
            </Abs>
            <Abs style={{ right: 452, bottom: 96, zIndex: 3 }}>
              <Guy p={GREEN} scale={1.8} state="idle" facing="left" />
            </Abs>
            <Abs style={{ left: "50%", bottom: 110, transform: "translateX(-50%)", zIndex: 2 }}>
              <Bomb state="ticking" scale={1.5} />
            </Abs>
          </div>
          </FitWidth>
        </Block>

        {/* 04 ICONS + CAPSULE */}
        <Block
          title="04 · APP ICON · 180 / 96 / 48 / 32 (scales cleanly to 512 / 128 / 32 / 16)"
          assets={[
            { id: "asset-icon-180", name: "bomb-blast-arena-icon-180", label: "icon 180" },
            { id: "asset-icon-96", name: "bomb-blast-arena-icon-96", label: "96" },
            { id: "asset-icon-48", name: "bomb-blast-arena-icon-48", label: "48" },
            { id: "asset-icon-32", name: "bomb-blast-arena-icon-32", label: "32" },
            { id: "asset-capsule", name: "bomb-blast-arena-capsule-460x215", label: "capsule 460×215" },
          ]}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 22, alignItems: "flex-end" }}>
            <BombIcon id="asset-icon-180" size={180} radius={38} offset={[24, 22]} scale={1.12} background={iconGround} />
            <BombIcon id="asset-icon-96" size={96} radius={20} offset={[13, 12]} scale={0.6} background={iconGround} />
            <BombIcon id="asset-icon-48" size={48} radius={10} offset={[6, 6]} scale={0.3} background={iconGround} />
            <BombIcon id="asset-icon-32" size={32} radius={7} offset={[4, 4]} scale={0.2} background="#ff9a2b" />

            <FitWidth w={460} h={215}>
            <div
              id="asset-capsule"
              style={{
                width: 460,
                height: 215,
                boxSizing: "border-box",
                flex: "0 0 auto",
                position: "relative",
                overflow: "hidden",
                borderRadius: 12,
                background: "linear-gradient(150deg,#1b2f55 0%,#0a1120 70%)",
                display: "flex",
                alignItems: "center",
                padding: "0 30px",
                gap: 22,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  right: -40,
                  top: -40,
                  width: 300,
                  height: 300,
                  borderRadius: "50%",
                  background: "radial-gradient(circle,rgba(255,154,43,.28) 0%,rgba(255,154,43,0) 62%)",
                }}
              />
              <div
                style={{
                  position: "relative",
                  zIndex: 2,
                  fontFamily: BUNGEE,
                  fontSize: 42,
                  lineHeight: 0.86,
                  color: "#ffce3d",
                  textShadow: "0 4px 0 #a8410c",
                }}
              >
                BOMB
                <br />
                BLAST
                <br />
                <span style={{ fontSize: 24, color: "#5fd7f2", letterSpacing: ".2em" }}>ARENA</span>
              </div>
              <div style={{ position: "relative", zIndex: 2, marginLeft: "auto" }}>
                <Guy p={BLUE} scale={1.25} state="idle" facing="left" />
              </div>
            </div>
            </FitWidth>
            <div style={caption}>icon drops the wordmark; store capsule keeps it · 460×215</div>
          </div>
        </Block>
      </section>
    </div>
  );
}
