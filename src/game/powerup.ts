import { getCellAt } from "./grid";
import { Character } from "./player";
import { tracker } from "./tracker";
import { GridPosition } from "../types/game";
import { POWERUP_CONFIG } from "./config";
import { playSound } from "./sound";

// Types of powerups
export type PowerupType = "extraBomb" | "increaseRange";

/**
 * Creates a power-up element
 */
export function createPowerUp(type: PowerupType): HTMLDivElement {
  const el = document.createElement("div");

  const colors = {
    extraBomb: { bg: "#3b82f6", border: "#1d4ed8" },
    increaseRange: { bg: "#ef4444", border: "#b91c1c" },
  };

  Object.assign(el.style, {
    width: "60%",
    height: "60%",
    margin: "20%",
    background: colors[type].bg,
    border: `2px solid ${colors[type].border}`,
    borderRadius: "50%",
    position: "absolute",
    top: "0",
    left: "0",
    boxSizing: "border-box",
    opacity: "0.8",
    zIndex: "5",
    pointerEvents: "auto",
    mixBlendMode: "multiply",
  });

  // Tag for identification
  el.dataset.powerup = type;
  // Mark as non-solid so bombs can be placed on top and explosions can pass through
  el.dataset.solid = "0";

  // Add a label
  const label = document.createElement("div");
  Object.assign(label.style, {
    position: "absolute",
    inset: "0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: "bold",
    color: "#fff",
  });

  switch (type) {
    case "extraBomb":
      label.textContent = "+";
      break;
    case "increaseRange":
      label.textContent = "R+";
      break;
  }

  el.appendChild(label);

  return el;
}

/**
 * Check if a character is on a cell with a powerup and collect it
 * @param character The character to check for powerup collection
 */
export function checkPowerupPickup(character: Character): void {
  // Skip if character is not alive
  if (!character.isAlive()) return;

  // Get the cell at the character's position
  const cell = getCellAt(
    character.gridPosition.row,
    character.gridPosition.col
  );
  if (!cell) return;

  // Check if there's a powerup in this cell
  const powerupElements = Array.from(cell.children).filter((child) => {
    const element = child as HTMLElement;
    return element.dataset.powerup !== undefined;
  });

  if (powerupElements.length === 0) return;

  // Get the powerup element
  const powerupElement = powerupElements[0] as HTMLElement;
  const powerupType = powerupElement.dataset.powerup as PowerupType;

  // Get the player tracker
  const playerTracker = tracker.getPlayer(character.id);
  if (!playerTracker) return;

  // Handle extra bomb powerup
  if (powerupType === "extraBomb") {
    playerTracker.addBomb();
    playSound("powerup-extraBomb", 0.6);
  }

  // Handle increase range powerup
  else if (powerupType === "increaseRange") {
    playerTracker.increaseBombRange();
    playSound("powerup-increaseRange", 0.6);
  }

  // Remove the powerup from the cell
  cell.removeChild(powerupElement);
}

/**
 * Create a visual effect for powerup collection
 * @param position The grid position where the powerup was collected
 * @param type The type of powerup collected
 */
export function createPowerupCollectionEffect(
  position: GridPosition,
  type: PowerupType
): void {
  if (typeof document === "undefined") return;

  // Implementation for visual effects when collecting powerups
  // This could be expanded with animations, particles, etc.
}

/**
 * Check if a cell has a powerup
 * @param cell The cell element to check
 * @returns True if the cell has a powerup, false otherwise
 */
export function hasPowerup(cell: HTMLElement | null): boolean {
  if (!cell) return false;

  for (const child of Array.from(cell.children)) {
    const element = child as HTMLElement;
    if (element.dataset.powerup !== undefined) {
      return true;
    }
  }

  return false;
}
