import { GAME_CONFIG, GRID_PATTERN, PLAYER_CONFIG } from "./config";
import { grid, isWalkable, getCellAt, gridRows, gridCols } from "./grid";
import { Character, Player, Computer, characterManager } from "./player";
import { tracker } from "./tracker";
import { armDynamite } from "./animations";
import { checkPowerupPickup } from "./powerup";
import { playSound } from "./sound";
import { Direction, GridPosition, Position, GameState } from "../types/game";

// =========================
// Engine State
// =========================
let gameState: GameState = GameState.START;
let desiredPlayersCount = 1;
let lastUpdateTime = 0;
let animationFrameId: number | null = null;

// Track active blast cells
interface BlastCell {
  position: GridPosition;
  endTime: number;
  ownerId: string;
}
const activeBlastCells: BlastCell[] = [];
const BLAST_DURATION_MS = 350;

// Game event callbacks
let onPlayerDead: (() => void) | null = null;
let onTimeOver: (() => void) | null = null;
let onWin: ((winnerId: string) => void) | null = null;
let onBombExplode: ((cells: GridPosition[], playerId: string) => void) | null =
  null;

// =========================
// Input State
// =========================
const keyState: Record<string, boolean> = {};
const keyProcessed: Record<string, boolean> = {};

const lastBombTimeByPlayer: Record<string, number> = {};
const BOMB_COOLDOWN_MS = 250;

// =========================
// Helper Functions
// =========================

/**
 * Convert a grid position to pixel position
 */
function gridToPixel(gridPos: GridPosition): Position {
  return {
    x: gridPos.col * GRID_PATTERN.cellSize,
    y: gridPos.row * GRID_PATTERN.cellSize,
  };
}

/**
 * Check if a position is inside the grid boundaries
 */
function isInsideGrid(row: number, col: number): boolean {
  return row >= 0 && row < gridRows && col >= 0 && col < gridCols;
}

/**
 * Find a safe spawn position in a corner
 */
function getCornerSpawn(corner: "tl" | "tr" | "bl" | "br"): GridPosition {
  const positions: Record<string, GridPosition> = {
    tl: { row: 1, col: 1 },
    tr: { row: 1, col: gridCols - 2 },
    bl: { row: gridRows - 2, col: 1 },
    br: { row: gridRows - 2, col: gridCols - 2 },
  };

  const basePos = positions[corner];

  // Check if the position is walkable, if not find a nearby position
  if (isWalkable(basePos.row, basePos.col)) {
    return basePos;
  }

  // Try adjacent cells in a spiral pattern
  const directions = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0], // Right, Down, Left, Up
    [1, 1],
    [1, -1],
    [-1, -1],
    [-1, 1], // Diagonals
  ];

  for (let radius = 1; radius <= 3; radius++) {
    for (const [dr, dc] of directions) {
      const row = basePos.row + dr * radius;
      const col = basePos.col + dc * radius;

      if (isInsideGrid(row, col) && isWalkable(row, col)) {
        return { row, col };
      }
    }
  }

  // Fallback to the base position even if not walkable
  return basePos;
}

/**
 * Check if a player can move in a direction
 */
function canMove(character: Character, direction: Direction): boolean {
  const { row, col } = character.gridPosition;
  let targetRow = row;
  let targetCol = col;

  switch (direction) {
    case Direction.UP:
      targetRow--;
      break;
    case Direction.DOWN:
      targetRow++;
      break;
    case Direction.LEFT:
      targetCol--;
      break;
    case Direction.RIGHT:
      targetCol++;
      break;
  }

  // Check grid boundaries and walkable cells
  if (
    !isInsideGrid(targetRow, targetCol) ||
    !isWalkable(targetRow, targetCol)
  ) {
    return false;
  }

  return true;
}

// =========================
// Player Movement
// =========================

/**
 * Move a character in a direction if possible
 */
function moveCharacter(character: Character, direction: Direction): boolean {
  if (!canMove(character, direction)) {
    return false;
  }

  // Update grid position
  const { row, col } = character.gridPosition;
  let newRow = row;
  let newCol = col;

  switch (direction) {
    case Direction.UP:
      newRow--;
      break;
    case Direction.DOWN:
      newRow++;
      break;
    case Direction.LEFT:
      newCol--;
      break;
    case Direction.RIGHT:
      newCol++;
      break;
  }

  // Update character position
  character.gridPosition = { row: newRow, col: newCol };
  character.position = gridToPixel(character.gridPosition);

  // Check if the character moved into a blast cell
  checkBlastCellDamage(character);

  // Check if the character moved onto a powerup
  checkPowerupPickup(character);

  return true;
}

/**
 * Place a bomb at a character's position
 */
function placeBomb(character: Character): boolean {
  const now = Date.now();
  const lastTime = lastBombTimeByPlayer[character.id] || 0;

  // Check if enough time has passed since this player's last bomb placement
  if (now - lastTime < BOMB_COOLDOWN_MS) {
    return false;
  }

  const playerTracker = tracker.getPlayer(character.id);
  if (!playerTracker) {
    return false;
  }

  // Check if player has reached their bomb limit
  // The limit is determined by the character's inventory (bombsAvailable)
  if (playerTracker.activeBombs >= playerTracker.bombsAvailable) {
    return false;
  }

  // Increment active bombs counter
  playerTracker.incrementActiveBombs();
  lastBombTimeByPlayer[character.id] = now;

  // Play bomb placement sound
  playSound("soundFX", "dropping-bomb", 0.5);

  // Place the bomb on the grid
  armDynamite(grid, character.gridPosition, {
    bombRange: playerTracker.bombRange,
    ownerId: character.id,
    onDetonate: (cells, duration) => {
      // Apply damage to characters in explosion area
      tracker.applyExplosionDamage(cells, character.id);

      // Add cells to active blast cells list
      const blastEndTime = Date.now() + BLAST_DURATION_MS;
      cells.forEach((cell) => {
        activeBlastCells.push({
          position: { row: cell.row, col: cell.col },
          endTime: blastEndTime,
          ownerId: character.id,
        });
      });

      // Trigger bomb explode callback
      if (onBombExplode) {
        onBombExplode(cells, character.id);
      }

      // Check win conditions
      checkWinConditions();
    },
    onExplode: () => {
      // Release the bomb from active count when explosion finishes
      if (playerTracker) {
        playerTracker.decrementActiveBombs();
      }
    },
  });

  return true;
}

// =========================
// Input Handling
// =========================

/**
 * Handle keyboard input for player movement
 */
function handlePlayerInput() {
  const humanPlayers = characterManager.getPlayers();
  if (humanPlayers.length === 0) return;

  // Get the first human player
  const player = humanPlayers[0];
  if (!player.isAlive()) return;

  // Handle movement - one cell per key press
  const moveKeys = [
    { keys: ["ArrowUp", "w", "W"], direction: Direction.UP },
    { keys: ["ArrowDown", "s", "S"], direction: Direction.DOWN },
    { keys: ["ArrowLeft", "a", "A"], direction: Direction.LEFT },
    { keys: ["ArrowRight", "d", "D"], direction: Direction.RIGHT },
  ];

  // Process each movement direction
  for (const { keys, direction } of moveKeys) {
    // Check if any key for this direction is pressed
    const isKeyPressed = keys.some((key) => keyState[key]);

    // Check if all keys for this direction were previously released
    const allKeysWereReleased = keys.every((key) => !keyProcessed[key]);

    // Move only on initial key press (not on hold)
    if (isKeyPressed && allKeysWereReleased) {
      moveCharacter(player, direction);

      // Mark all keys for this direction as processed
      keys.forEach((key) => {
        keyProcessed[key] = true;
      });
    }

    // Reset processed state when keys are released
    if (!isKeyPressed) {
      keys.forEach((key) => {
        keyProcessed[key] = false;
      });
    }
  }

  // Handle bomb placement - also on initial press only
  if (keyState[" "] && !keyProcessed[" "]) {
    placeBomb(player);
    keyProcessed[" "] = true;
  } else if (!keyState[" "]) {
    keyProcessed[" "] = false;
  }
}

/**
 * Set up keyboard event listeners
 */
function setupInputListeners() {
  if (typeof window === "undefined") return;

  const handleKeyDown = (e: KeyboardEvent) => {
    // Prevent default behavior for arrow keys and space to avoid page scrolling
    if (
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)
    ) {
      e.preventDefault();
    }
    keyState[e.key] = true;
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    keyState[e.key] = false;
  };

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
  };
}

// =========================
// Computer AI
// =========================

// Store computer movement state outside the function for persistence
const computerLastMoveTime: Record<string, number> = {};
const computerMoveDelay: Record<string, number> = {};

/**
 * Update computer player AI
 */
function updateComputerPlayers(deltaTime: number) {
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

// =========================
// Game Loop
// =========================

/**
 * Check if a character is in a blast cell and apply damage if needed
 */
function checkBlastCellDamage(character: Character): void {
  // Skip if character is not alive
  if (!character.isAlive()) return;

  // Skip if character is immune
  if (character.isImmune()) return;

  // Check if character is in any active blast cell
  const currentTime = Date.now();
  const characterPos = character.gridPosition;

  for (let i = 0; i < activeBlastCells.length; i++) {
    const blastCell = activeBlastCells[i];

    // Skip expired blast cells
    if (currentTime > blastCell.endTime) continue;

    // Check if character is in this blast cell
    if (
      characterPos.row === blastCell.position.row &&
      characterPos.col === blastCell.position.col
    ) {
      // Get player tracker
      const playerTracker = tracker.getPlayer(character.id);
      if (playerTracker) {
        // Apply damage
        playerTracker.decrementLife();

        // Character's takeDamage method will start the damage animation
        character.takeDamage();

        // Set player immune after taking damage
        character.setImmune();

        // If this killed the player and it wasn't self-damage, credit the kill
        if (!character.isAlive() && character.id !== blastCell.ownerId) {
          const sourcePlayer = tracker.getPlayer(blastCell.ownerId);
          if (sourcePlayer) {
            sourcePlayer.incrementKills();
          }
        }

        // Check win conditions
        checkWinConditions();
      }

      // Only take damage once per update, even if in multiple blast cells
      break;
    }
  }
}

/**
 * Clean up expired blast cells
 */
function cleanupBlastCells(): void {
  const currentTime = Date.now();
  let i = 0;

  // Remove expired blast cells
  while (i < activeBlastCells.length) {
    if (currentTime > activeBlastCells[i].endTime) {
      // Remove this blast cell
      activeBlastCells.splice(i, 1);
    } else {
      i++;
    }
  }
}

/**
 * Main game update function
 */
function update() {
  if (gameState !== GameState.PLAYING) return;

  const currentTime = Date.now();
  const deltaTime = currentTime - lastUpdateTime;
  lastUpdateTime = currentTime;

  // Clean up expired blast cells
  cleanupBlastCells();

  // Handle player input
  handlePlayerInput();

  // Update computer players
  updateComputerPlayers(deltaTime);

  // Check time limit
  if (GAME_CONFIG.timeLimit > 0) {
    const elapsedSeconds = tracker.timeElapsedMs / 1000;
    if (elapsedSeconds >= GAME_CONFIG.timeLimit) {
      handleTimeOver();
    }
  }

  // Request next frame
  animationFrameId = requestAnimationFrame(update);
}

// =========================
// Win Conditions
// =========================

/**
 * Check if the game has been won
 */
function checkWinConditions() {
  const alivePlayers = characterManager
    .getAll()
    .filter((char) => char.isAlive());

  // In multiplayer, last player standing wins
  if (desiredPlayersCount > 1 && alivePlayers.length === 1) {
    handleWin(alivePlayers[0].id);
    return;
  }

  // In singleplayer, player death is game over
  const humanPlayers = characterManager.getPlayers();
  if (
    desiredPlayersCount === 1 &&
    humanPlayers.length > 0 &&
    !humanPlayers[0].isAlive()
  ) {
    handlePlayerDeath();
  }
}

/**
 * Handle player death
 */
function handlePlayerDeath() {
  if (gameState !== GameState.PLAYING) return;

  gameState = GameState.GAME_OVER;
  if (onPlayerDead) {
    onPlayerDead();
  }
}

/**
 * Handle time over
 */
function handleTimeOver() {
  if (gameState !== GameState.PLAYING) return;

  gameState = GameState.GAME_OVER;
  if (onTimeOver) {
    onTimeOver();
  }
}

/**
 * Handle win condition
 */
function handleWin(winnerId: string) {
  if (gameState !== GameState.PLAYING) return;

  gameState = GameState.WIN;
  if (onWin) {
    onWin(winnerId);
  }
}

// =========================
// Game Lifecycle
// =========================

/**
 * Start the game engine
 */
export function startEngine() {
  // Reset game state
  gameState = GameState.PLAYING;
  lastUpdateTime = Date.now();

  // Start tracking game time
  tracker.startGame();

  // Set up input handlers
  const removeListeners = setupInputListeners();

  // Start game loop
  animationFrameId = requestAnimationFrame(update);

  return () => {
    if (removeListeners) removeListeners();
    stopEngine();
  };
}

/**
 * Stop the game engine
 */
export function stopEngine() {
  // Stop game loop
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  // Stop tracking game time
  tracker.stopGame();

  // Reset key states
  Object.keys(keyState).forEach((key) => {
    keyState[key] = false;
    keyProcessed[key] = false; // Also reset processed state
  });

  gameState = GameState.START;
}

/**
 * Reset the game engine
 */
export function resetEngine() {
  // Stop the engine first
  stopEngine();

  // Clear all characters
  characterManager.clear();

  // Reset tracker
  tracker.reset();

  // Reset input state
  Object.keys(keyState).forEach((key) => {
    keyState[key] = false;
    keyProcessed[key] = false;
  });

  // Clear all active blast cells
  activeBlastCells.length = 0;

  // Reset game state
  gameState = GameState.START;
}

/**
 * Set the desired number of players
 */
export function setDesiredPlayersCount(count: number) {
  desiredPlayersCount = Math.max(1, Math.min(4, count));
}

/**
 * Set callback for player death
 */
export function setOnPlayerDead(callback: (() => void) | null) {
  onPlayerDead = callback;
}

/**
 * Set callback for time over
 */
export function setOnTimeOver(callback: (() => void) | null) {
  onTimeOver = callback;
}

/**
 * Set callback for win condition
 */
export function setOnWin(callback: ((winnerId: string) => void) | null) {
  onWin = callback;
}

/**
 * Set callback for bomb explosion
 */
export function setOnBombExplode(
  callback: ((cells: GridPosition[], playerId: string) => void) | null
) {
  onBombExplode = callback;
}

/**
 * Initialize players for the game
 */
export function initializePlayers() {
  // Clear existing characters
  characterManager.clear();

  // Create human player at top-left corner
  const playerSpawn = getCornerSpawn("tl");
  const player = new Player(
    "player-1",
    "#4A90E2", // Blue
    gridToPixel(playerSpawn),
    playerSpawn,
    PLAYER_CONFIG.defaultLives
  );
  characterManager.register(player);
  tracker.registerPlayer(player);

  // Create computer players based on desired count
  if (desiredPlayersCount >= 2) {
    const computerSpawn = getCornerSpawn("tr");
    const computer1 = new Computer(
      "computer-1",
      "#E74C3C", // Red
      gridToPixel(computerSpawn),
      computerSpawn,
      PLAYER_CONFIG.defaultLives
    );
    characterManager.register(computer1);
    tracker.registerPlayer(computer1);
  }

  if (desiredPlayersCount >= 3) {
    const computerSpawn = getCornerSpawn("bl");
    const computer2 = new Computer(
      "computer-2",
      "#F39C12", // Orange
      gridToPixel(computerSpawn),
      computerSpawn,
      PLAYER_CONFIG.defaultLives
    );
    characterManager.register(computer2);
    tracker.registerPlayer(computer2);
  }

  if (desiredPlayersCount >= 4) {
    const computerSpawn = getCornerSpawn("br");
    const computer3 = new Computer(
      "computer-3",
      "#9B59B6", // Purple
      gridToPixel(computerSpawn),
      computerSpawn,
      PLAYER_CONFIG.defaultLives
    );
    characterManager.register(computer3);
    tracker.registerPlayer(computer3);
  }
}

// =========================
// Public API
// =========================

/**
 * Get the current game state
 */
export function getGameState(): GameState {
  return gameState;
}

/**
 * Get the desired number of players
 */
export function getDesiredPlayersCount(): number {
  return desiredPlayersCount;
}
