import { Direction, GameState, GridPosition, Position } from "../types/game";
import { resetAIState, updateComputerPlayers } from "./ai";
import { armDynamite, getPendingBombs, predictBlastCells } from "./animations";
import { CHARACTER_CONFIG, GAME_CONFIG, GRID_PATTERN, PLAYER_CONFIG } from "./core/config";
import { grid, gridCols, gridRows, isWalkable } from "./grid";
import { playSound } from "./hooks/sound";
import { tracker } from "./hooks/tracker";
import { Character, Computer, Player, characterManager } from "./player";
import { checkPowerupPickup } from "./powerup";

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
  hitCharacterIds: Set<string>;
}
const activeBlastCells: BlastCell[] = [];

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
const directionByKey: Record<string, Direction> = {
  ArrowUp: Direction.UP,
  w: Direction.UP,
  W: Direction.UP,
  ArrowDown: Direction.DOWN,
  s: Direction.DOWN,
  S: Direction.DOWN,
  ArrowLeft: Direction.LEFT,
  a: Direction.LEFT,
  A: Direction.LEFT,
  ArrowRight: Direction.RIGHT,
  d: Direction.RIGHT,
  D: Direction.RIGHT,
};

const lastBombTimeByPlayer: Record<string, number> = {};
const BOMB_COOLDOWN_MS = 350;
let lastPlayerMoveAt = 0;

// =========================
// Helper Functions
// =========================

/**
 * Convert a grid position to pixel position
 */
export function gridToPixel(gridPos: GridPosition): Position {
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
export function canMove(character: Character, direction: Direction): boolean {
  const { row, col } = character.gridPosition;

  const movements = {
    [Direction.UP]: { row: -1, col: 0 },
    [Direction.DOWN]: { row: 1, col: 0 },
    [Direction.LEFT]: { row: 0, col: -1 },
    [Direction.RIGHT]: { row: 0, col: 1 },
  };

  const movement = movements[direction];
  const targetRow = row + movement.row;
  const targetCol = col + movement.col;

  // Check grid boundaries and walkable cells
  if (
    !isInsideGrid(targetRow, targetCol) ||
    !isWalkable(targetRow, targetCol)
  ) {
    return false;
  }

  return true;
}
// Player Movement
// =========================

/**
 * Move a character in a direction
 */
export function moveCharacter(
  character: Character,
  direction: Direction
): boolean {
  // Don't allow movement if game is paused
  if (gameState === GameState.PAUSED) {
    return false;
  }

  if (!canMove(character, direction)) {
    return false;
  }

  // Use the character's own move method to update positions
  character.move(direction);

  // Check if the character moved into a blast cell
  checkBlastCellDamage(character);

  // Check if the character moved onto a powerup
  checkPowerupPickup(character);

  return true;
}

/**
 * Place a bomb at a character's position
 */
export function placeBomb(character: Character): boolean {
  // Don't place bombs if game is paused
  if (gameState === GameState.PAUSED) {
    return false;
  }

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

  // Create a copy of the grid position to ensure the bomb stays where it was placed
  const bombPosition = { ...character.gridPosition };

  // Place the bomb on the grid
  armDynamite(grid, bombPosition, {
    bombRange: playerTracker.bombRange,
    ownerId: character.id,
    onDetonate: (cells, duration) => {
      // Add cells to active blast cells list before checking damage so the
      // detonation and movement paths use the same hit rules.
      const blastEndTime = Date.now() + duration;
      cells.forEach((cell) => {
        activeBlastCells.push({
          position: { row: cell.row, col: cell.col },
          endTime: blastEndTime,
          ownerId: character.id,
          hitCharacterIds: new Set<string>(),
        });
      });

      // Apply the initial hit through the same path used when entering a blast.
      for (const target of characterManager.getAll()) {
        checkBlastCellDamage(target);
      }

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

  // Move one cell per repeat interval while a direction key is held.
  const moveKeys = [
    { keys: ["ArrowUp", "w", "W"], direction: Direction.UP },
    { keys: ["ArrowDown", "s", "S"], direction: Direction.DOWN },
    { keys: ["ArrowLeft", "a", "A"], direction: Direction.LEFT },
    { keys: ["ArrowRight", "d", "D"], direction: Direction.RIGHT },
  ];
  const now = Date.now();
  const canRepeatMove =
    now - lastPlayerMoveAt >= CHARACTER_CONFIG.moveTransitionMs;

  if (canRepeatMove) {
    for (const { keys, direction } of moveKeys) {
      const isKeyPressed = keys.some((key) => keyState[key]);
      if (!isKeyPressed) continue;

      moveCharacter(player, direction);
      lastPlayerMoveAt = now;
      break;
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

    // Handle Escape key for pausing
    if (e.key === "Escape") {
      // Toggle between paused and playing states
      if (gameState === GameState.PLAYING) {
        pauseGame();
      } else if (gameState === GameState.PAUSED) {
        resumeGame();
      }
      return; // Don't track Escape in keyState
    }

    const direction = directionByKey[e.key];
    if (!e.repeat && direction !== undefined && gameState === GameState.PLAYING) {
      const player = characterManager.getPlayers()[0];
      if (player?.isAlive()) {
        moveCharacter(player, direction);
        lastPlayerMoveAt = Date.now();
      }
    }

    keyState[e.key] = true;
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.key !== "Escape") {
      // Don't track Escape in keyState
      keyState[e.key] = false;
    }
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

// AI logic moved to ai.ts

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
    if (blastCell.hitCharacterIds.has(character.id)) continue;

    // Check if character is in this blast cell
    if (
      characterPos.row === blastCell.position.row &&
      characterPos.col === blastCell.position.col
    ) {
      // Get player tracker
      const playerTracker = tracker.getPlayer(character.id);
      if (playerTracker) {
        blastCell.hitCharacterIds.add(character.id);

        // Apply one hit and start the immunity window.
        playerTracker.decrementLife();
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
 * Cells that are actively exploding right now (non-expired blast cells).
 * Keyed "row,col" for O(1) lookup. Used by the AI to know which cells are
 * truly impassable — cells a still-ticking bomb would hit remain walkable.
 */
export function getActiveBlastCells(): Set<string> {
  const active = new Set<string>();

  const currentTime = Date.now();
  for (const blastCell of activeBlastCells) {
    if (currentTime > blastCell.endTime) continue;
    active.add(`${blastCell.position.row},${blastCell.position.col}`);
  }

  return active;
}

/**
 * Cells that are either actively exploding right now, or about to be hit by
 * a bomb that's still ticking. Keyed "row,col" for O(1) lookup. Used by the
 * AI for danger-avoidance.
 */
export function getDangerCells(): Set<string> {
  const danger = getActiveBlastCells();

  for (const pending of getPendingBombs()) {
    const cells = predictBlastCells(
      grid,
      { row: pending.row, col: pending.col },
      pending.range
    );
    for (const cell of cells) {
      danger.add(`${cell.row},${cell.col}`);
    }
  }

  return danger;
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
  // Don't update if not in playing state
  if (gameState !== GameState.PLAYING) {
    // If we're paused, just request the next frame but don't update game state
    if (gameState === GameState.PAUSED) {
      animationFrameId = requestAnimationFrame(update);
    }
    return;
  }

  const currentTime = Date.now();
  const deltaTime = currentTime - lastUpdateTime;
  lastUpdateTime = currentTime;

  // Clean up expired blast cells
  cleanupBlastCells();

  // Handle player input
  handlePlayerInput();

  // Update computer players - only if game is not paused
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
  const winner = characterManager.get(winnerId);
  if (winner) {
    winner.winning = true;
  }
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
 * Pause the game engine
 */
export function pauseGame() {
  if (gameState !== GameState.PLAYING) return;

  // Stop game loop
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  // Pause tracking game time
  tracker.pauseGame();

  // Set game state to paused
  gameState = GameState.PAUSED;
}

/**
 * Resume the game engine
 */
export function resumeGame() {
  if (gameState !== GameState.PAUSED) return;

  // Resume tracking game time
  tracker.resumeGame();

  // Reset last update time
  lastUpdateTime = Date.now();

  // Restart game loop
  animationFrameId = requestAnimationFrame(update);

  // Set game state to playing
  gameState = GameState.PLAYING;
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

  // Reset AI state
  resetAIState();

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
    "#4aa3ff", // Azure
    "#12457f",
    "#cfe8ff",
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
      "#ff5f5f", // Ember
      "#a62a2a",
      "#ffd3cf",
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
      "#f5a623", // Amber
      "#a96a06",
      "#ffe6b8",
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
      "#b45ddb", // Violet
      "#6f2f96",
      "#ecd4ff",
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
