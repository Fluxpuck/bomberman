import { Direction, GridPosition } from "../types/game";
import { Character, Computer } from "./player";
import { characterManager } from "./player";
import { canMove, moveCharacter, placeBomb } from "./engine";

// Store computer movement state
const computerLastMoveTime: Record<string, number> = {};
const computerMoveDelay: Record<string, number> = {};

/**
 * Update computer player AI
 */
export function updateComputerPlayers(deltaTime: number): void {
  const computers = characterManager.getComputers();
  const currentTime = Date.now();

  for (const computer of computers) {
    if (!computer.isAlive()) continue;

    // Initialize tracking for this computer if needed
    if (!computerLastMoveTime[computer.id]) {
      computerLastMoveTime[computer.id] = 0;
      // Random move delay between 500-1500ms for more natural movement
      computerMoveDelay[computer.id] = 500 + Math.random() * 1000;
    }

    // Check if it's time to move
    if (
      currentTime - computerLastMoveTime[computer.id] >
      computerMoveDelay[computer.id]
    ) {
      // Simple random movement AI
      const directions = [
        Direction.UP,
        Direction.DOWN,
        Direction.LEFT,
        Direction.RIGHT,
      ];

      // Try to find a valid move direction
      const shuffledDirections = [...directions].sort(
        () => Math.random() - 0.5
      );

      for (const direction of shuffledDirections) {
        if (canMove(computer, direction)) {
          moveCharacter(computer, direction);
          computerLastMoveTime[computer.id] = currentTime;
          // Set a new random delay for next move
          computerMoveDelay[computer.id] = 500 + Math.random() * 1000;
          break;
        }
      }

      // Random bomb placement (10% chance when moving)
      if (Math.random() < 0.1) {
        placeBomb(computer);
      }
    }
  }
}

/**
 * Reset AI state by clearing all AI tracking data
 */
export function resetAIState(): void {
  Object.keys(computerLastMoveTime).forEach((key) => {
    delete computerLastMoveTime[key];
  });

  Object.keys(computerMoveDelay).forEach((key) => {
    delete computerMoveDelay[key];
  });
}
