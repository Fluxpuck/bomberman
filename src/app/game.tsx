"use client";

import { useEffect, useRef, useState } from "react";
import { grid, updateGridLayout } from "../game/_grid";
import { Player, characterManager } from "../game/_player";
import { GRID_PATTERN } from "../game/config";
import { GameMode } from "../types/game";

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

      const charElement = document.createElement("div");
      charElement.dataset.character = char.id;

      const cellSize = GRID_PATTERN.cellSize;
      const charSize = cellSize - 8; // Slightly smaller than cell for better visibility

      // Create darker shade of player color for border
      const darkenColor = (color: string): string => {
        // For hex colors
        if (color.startsWith("#")) {
          const r = parseInt(color.slice(1, 3), 16);
          const g = parseInt(color.slice(3, 5), 16);
          const b = parseInt(color.slice(5, 7), 16);

          const darkenFactor = 0.6; // Make it 40% darker
          const dr = Math.floor(r * darkenFactor);
          const dg = Math.floor(g * darkenFactor);
          const db = Math.floor(b * darkenFactor);

          return `#${dr.toString(16).padStart(2, "0")}${dg
            .toString(16)
            .padStart(2, "0")}${db.toString(16).padStart(2, "0")}`;
        }
        // For rgb colors
        else if (color.startsWith("rgb")) {
          return color.replace("rgb", "rgba").replace(")", ", 0.7)");
        }
        // Fallback
        return "#333";
      };

      const borderColor = darkenColor(char.color);

      Object.assign(charElement.style, {
        position: "absolute",
        width: `${charSize}px`,
        height: `${charSize}px`,
        backgroundColor: char.color,
        borderRadius: "15%",
        border: `3px solid ${borderColor}`,
        boxShadow: `0 2px 4px ${borderColor}`,
        left: `${char.position.x + (cellSize - charSize) / 2}px`,
        top: `${char.position.y + (cellSize - charSize) / 2}px`,
        transition: "all 0.5s ease",
        zIndex: "10",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "14px",
        fontWeight: "bold",
        color: "#fff",
      });

      // Add character label
      const label = char instanceof Player ? "P" : "C";
      charElement.textContent = label;

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
