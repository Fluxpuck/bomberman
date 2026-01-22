"use client";

import { useEffect, useRef, useState } from "react";
import { grid, updateGridLayout } from "../game/grid";
import { Player, characterManager } from "../game/player";
import { GRID_PATTERN } from "../game/core/config";
import { GameMode } from "../types/game";
import { createCharacter } from "../game/assets/character";

interface GameProps {
  mode: GameMode;
}

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

      // Create character element using the character.ts module
      const charElement = createCharacter();
      charElement.dataset.character = char.id;

      const cellSize = GRID_PATTERN.cellSize;

      // Check if character is showing damage animation
      const isShowingDamage = char.isShowingDamageAnimation();

      // Apply character styling and positioning
      const charSize = cellSize - 8;
      Object.assign(charElement.style, {
        backgroundColor: isShowingDamage ? "#e74c3c" : char.color,
        left: `${char.position.x + (cellSize - charSize) / 2}px`,
        top: `${char.position.y + (cellSize - charSize) / 2}px`,
        transition: isShowingDamage ? "none" : "all 0.5s ease",
        boxShadow: isShowingDamage ? "0 0 6px 3px rgba(231, 76, 60, 0.5)" : "",
        zIndex: "10",
      });

      // // Add character type indicator
      // const label = document.createElement("div");
      // label.textContent = char instanceof Player ? "P" : "C";
      // label.style.fontSize = "14px";
      // label.style.fontWeight = "bold";
      // label.style.color = "#fff";
      // label.style.zIndex = "11";
      // charElement.appendChild(label);

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
