"use client";

import { useEffect, useRef, useState } from "react";
import { BomberState, createBomberVisual } from "../game/assets/character";
import { CHARACTER_CONFIG, GRID_PATTERN } from "../game/core/config";
import { grid, updateGridLayout } from "../game/grid";
import { characterManager } from "../game/player";
import { GameMode } from "../types/game";

interface GameProps {
  mode: GameMode;
}

// Colors swapped in briefly, in place of a character's own palette, while
// blinking to signal a hit.
const HIT_FLASH = { accent: "#e74c3c", dark: "#922b21", light: "#f5b7b1" };

export default function Game({ mode }: GameProps) {
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

  // Render characters on the grid
  const renderCharacters = () => {
    // Remove existing character elements
    const existingChars = grid.querySelectorAll("[data-character]");
    existingChars.forEach((el) => el.remove());

    // Render each character
    const characters = characterManager.getAll();
    characters.forEach((char) => {
      if (!char.isAlive()) return;

      const cellSize = GRID_PATTERN.cellSize;
      const isShowingDamage = char.isShowingDamageAnimation();
      const state: BomberState = isShowingDamage
        ? "hurt"
        : char.winning
        ? "win"
        : char.isWalking()
        ? "walk"
        : "idle";

      // Blink red for the whole immunity window after a hit, so it stays
      // clear the character just lost a life and can't be hit again yet.
      const blinkOn =
        char.isImmune() && Math.floor(Date.now() / 100) % 2 === 0;

      // Create character element using the character.ts module
      const charElement = createBomberVisual(
        blinkOn ? HIT_FLASH.accent : char.color,
        blinkOn ? HIT_FLASH.dark : char.darkColor,
        blinkOn ? HIT_FLASH.light : char.lightColor,
        state,
        char.facing,
        cellSize
      );
      charElement.dataset.character = char.id;

      // Apply positioning
      Object.assign(charElement.style, {
        position: "absolute",
        left: `${char.position.x}px`,
        top: `${char.position.y}px`,
        transition: isShowingDamage
          ? "none"
          : `all ${CHARACTER_CONFIG.moveTransitionMs}ms ease-in-out`,
        zIndex: "10",
      });

      grid.appendChild(charElement);
    });
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
