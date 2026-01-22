import { getCellAt } from "./grid";
import { Character } from "./player";
import { tracker } from "./hooks/tracker";
import { GridPosition } from "../types/game";
import { playSound } from "./hooks/sound";
import { PowerupType } from "./assets/powerups";

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
    playSound("soundFX", "powerup-extraBomb", 0.6);
  }

  // Handle increase range powerup
  else if (powerupType === "increaseRange") {
    playerTracker.increaseBombRange();
    playSound("soundFX", "powerup-increaseRange", 0.6);
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
