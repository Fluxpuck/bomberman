"use client";

import { useEffect, useRef, useState } from "react";
import { BomberState, createBomberVisual } from "../game/assets/character";
import { GRID_PATTERN } from "../game/core/config";
import { grid, updateGridLayout } from "../game/grid";
import { characterManager } from "../game/player";

// Colors swapped in briefly, in place of a character's own palette, while
// blinking to signal a hit.
const HIT_FLASH = { accent: "#e74c3c", dark: "#922b21", light: "#f5b7b1" };
// Blue blink shown when a shield absorbs a hit — no life was lost.
const SHIELD_FLASH = { accent: "#5aa0ff", dark: "#1d4f9c", light: "#d6e8ff" };

// Live character wrapper elements keyed by character id. The wrapper owns
// position; its child is the bomber visual, rebuilt only when the visual
// inputs (state/facing/palette/cell size) change. Rebuilding every frame
// would churn DOM for no benefit.
interface CharacterElement {
  el: HTMLDivElement;
  visualKey: string;
}
const charElements = new Map<string, CharacterElement>();

function visualKeyFor(
  state: BomberState,
  facing: string,
  accent: string,
  dark: string,
  light: string,
  cellSizePx: number
): string {
  return [state, facing, accent, dark, light, cellSizePx].join("|");
}

export default function Game() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize game
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Mark as initialized
    setIsInitialized(true);
  }, []);

  // Mount grid to DOM
  useEffect(() => {
    if (!gameContainerRef.current || !isInitialized) return;

    // Clear container and append grid
    gameContainerRef.current.innerHTML = "";
    gameContainerRef.current.appendChild(grid);

    // Render characters
    renderCharacters();

    // Update layout for responsive sizing
    updateGridLayout();

    // Handle window resize
    const handleResize = () => {
      updateGridLayout();
    };

    // Set up animation frame for character rendering
    let animationId: number;
    const updateCharacters = () => {
      renderCharacters();
      animationId = requestAnimationFrame(updateCharacters);
    };
    animationId = requestAnimationFrame(updateCharacters);

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
    };
  }, [isInitialized]);

  // Render characters on the grid, reusing elements across frames
  const renderCharacters = () => {
    // Use the actual rendered cell size, not the design size. updateGridLayout
    // may shrink cells to fit the viewport; character positions (stored in
    // design-pixel coordinates) must be scaled to match.
    const firstCell = grid.firstElementChild as HTMLElement | null;
    const actualCellSize = firstCell?.offsetWidth || GRID_PATTERN.cellSize;
    const positionScale = actualCellSize / GRID_PATTERN.cellSize;

    const presentIds = new Set<string>();
    const characters = characterManager.getAll();

    characters.forEach((char) => {
      if (!char.isAlive()) return;
      presentIds.add(char.id);

      const isShowingDamage = char.isShowingDamageAnimation();
      const state: BomberState = isShowingDamage
        ? "hurt"
        : char.winning
        ? "win"
        : char.isWalking()
        ? "walk"
        : "idle";

      // Blink for the whole immunity window after a hit, so it stays clear
      // the character can't be hit again yet. Red when a life was lost,
      // blue when a shield absorbed the hit instead.
      const blinkPhase = Math.floor(Date.now() / 100) % 2 === 0;
      const shieldBlockOn = char.isShowingShieldBlock() && blinkPhase;
      const blinkOn = char.isImmune() && blinkPhase;
      const accent = shieldBlockOn
        ? SHIELD_FLASH.accent
        : blinkOn
        ? HIT_FLASH.accent
        : char.color;
      const dark = shieldBlockOn
        ? SHIELD_FLASH.dark
        : blinkOn
        ? HIT_FLASH.dark
        : char.darkColor;
      const light = shieldBlockOn
        ? SHIELD_FLASH.light
        : blinkOn
        ? HIT_FLASH.light
        : char.lightColor;

      const visualKey = visualKeyFor(
        state,
        char.facing,
        accent,
        dark,
        light,
        actualCellSize
      );

      let entry = charElements.get(char.id);
      if (!entry) {
        const el = document.createElement("div");
        el.dataset.character = char.id;
        el.style.position = "absolute";
        el.style.zIndex = "10";
        grid.appendChild(el);
        entry = { el, visualKey: "" };
        charElements.set(char.id, entry);
      }

      // The element survives grid rebuilds in the map but may be detached;
      // re-append if the grid was reset underneath it.
      if (entry.el.parentElement !== grid) {
        grid.appendChild(entry.el);
      }

      // Rebuild the visual subtree only when its inputs changed
      if (entry.visualKey !== visualKey) {
        entry.el.replaceChildren(
          createBomberVisual(accent, dark, light, state, char.facing, actualCellSize)
        );
        entry.visualKey = visualKey;
      }

      // No position transition: sprites snap to their tile so a bomb always
      // lands on the tile the character is visibly standing on. A gliding
      // sprite made bombs appear to drop on the wrong tile.
      entry.el.style.left = `${char.position.x * positionScale}px`;
      entry.el.style.top = `${char.position.y * positionScale}px`;

      // Outline shielded characters so the power-up is visible in play.
      // Blink the ring while the shield is about to expire.
      const hasShield = char.hasShieldActive();
      const shieldVisible = hasShield && (!char.isShieldExpiring() || blinkPhase);
      entry.el.style.boxShadow = shieldVisible
        ? "0 0 0 3px rgba(90, 160, 255, 0.8)"
        : "";
      entry.el.style.borderRadius = hasShield ? "50%" : "";
    });

    // Remove elements for characters that died or left the roster
    for (const [id, entry] of charElements) {
      if (!presentIds.has(id)) {
        entry.el.remove();
        charElements.delete(id);
      }
    }
  };

  return (
    <div className="relative flex justify-center items-center">
      {/* Game Container */}
      <div
        ref={gameContainerRef}
        className="bg-gray-800 p-2 rounded-lg shadow-2xl"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      />
    </div>
  );
}
