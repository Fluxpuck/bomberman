import { PowerupType } from "./assets/powerups";
import { GRID_PATTERN } from "./core/config";
import { getCellAt, gridCols, gridRows, isWalkable } from "./grid";
import { playSound } from "./hooks/sound";
import { tracker } from "./hooks/tracker";
import { Character, characterManager } from "./player";
import { GridPosition } from "../types/game";

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

  // Handle shield powerup
  else if (powerupType === "shield") {
    playerTracker.grantShield();
    playSound("soundFX", "powerup-shield", 0.6);
  }

  // Handle teleport powerup
  else if (powerupType === "teleport") {
    const destination = findRandomTeleportDestination(character);
    if (destination) {
      character.gridPosition.row = destination.row;
      character.gridPosition.col = destination.col;
      character.position.x = destination.col * GRID_PATTERN.cellSize;
      character.position.y = destination.row * GRID_PATTERN.cellSize;
    }
    playSound("soundFX", "powerup-shield", 0.6);
  }

  // Remove the powerup from the cell
  cell.removeChild(powerupElement);
}

/**
 * Choose a random walkable cell that is not occupied, bombed, or already
 * carrying a powerup.
 */
function findRandomTeleportDestination(character: Character): GridPosition | null {
  const openCells: GridPosition[] = [];
  const characters = characterManager
    .getAll()
    .filter((candidate) => candidate.id !== character.id && candidate.isAlive());

  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      if (row === character.gridPosition.row && col === character.gridPosition.col) {
        continue;
      }

      const cell = getCellAt(row, col);
      const isOccupied = characters.some(
        (candidate) =>
          candidate.gridPosition.row === row && candidate.gridPosition.col === col
      );
      const isAvailable =
        isWalkable(row, col) &&
        cell?.dataset.bomb !== "1" &&
        !cell?.querySelector("[data-powerup]") &&
        !isOccupied;

      if (isAvailable) openCells.push({ row, col });
    }
  }

  if (openCells.length === 0) return null;
  return openCells[Math.floor(Math.random() * openCells.length)];
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
