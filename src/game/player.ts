import { Direction, GridPosition, Position } from "../types/game";
import { PLAYER_CONFIG, BOMB_CONFIG, GRID_PATTERN } from "./core/config";
import { playSound } from "./hooks/sound";

// =========================
// Base Character Class
// =========================
export abstract class Character {
  // Damage cooldown tracking
  private _damageCooldownEndTime: number = 0;
  private static readonly DAMAGE_COOLDOWN_MS: number = 500;
  // Damage animation tracking
  private _damageAnimationEndTime: number = 0;
  private static readonly DAMAGE_ANIMATION_MS: number = 250;

  constructor(
    public id: string,
    public color: string,
    public position: Position,
    public gridPosition: GridPosition,
    public lives: number,
    public inventory: number = PLAYER_CONFIG.defaultInventory,
    public bombRange: number = BOMB_CONFIG.blastRadius
  ) {}

  public move(direction: Direction): void {
    const movements = {
      [Direction.UP]: { row: -1, col: 0 },
      [Direction.DOWN]: { row: 1, col: 0 },
      [Direction.LEFT]: { row: 0, col: -1 },
      [Direction.RIGHT]: { row: 0, col: 1 },
    };

    const movement = movements[direction];

    // Update grid position
    this.gridPosition.row += movement.row;
    this.gridPosition.col += movement.col;

    // Update pixel position based on grid position using cell size
    this.position.x = this.gridPosition.col * GRID_PATTERN.cellSize;
    this.position.y = this.gridPosition.row * GRID_PATTERN.cellSize;
  }

  public takeDamage(): void {
    this.lives = Math.max(0, this.lives - 1);
    this.startDamageAnimation();

    // Play the grunt sound when hit
    playSound("soundFX", "grunt", 0.7);
  }

  private startDamageAnimation(): void {
    this._damageAnimationEndTime = Date.now() + Character.DAMAGE_ANIMATION_MS;
  }

  public isShowingDamageAnimation(): boolean {
    return Date.now() < this._damageAnimationEndTime;
  }

  public isAlive(): boolean {
    return this.lives > 0;
  }

  public setImmune(): void {
    this._damageCooldownEndTime = Date.now() + Character.DAMAGE_COOLDOWN_MS;
  }

  public isImmune(): boolean {
    return Date.now() < this._damageCooldownEndTime;
  }

  public addBomb(): void {
    this.inventory = Math.min(this.inventory + 1, BOMB_CONFIG.maxBombs);
  }

  public increaseBombRange(): void {
    this.bombRange = Math.min(this.bombRange + 1, BOMB_CONFIG.maxBlastRadius);
  }

  public canPlaceBomb(): boolean {
    return this.inventory > 0;
  }
}

// =========================
// Player Class
// =========================
export class Player extends Character {
  constructor(
    id: string,
    color: string,
    position: Position,
    gridPosition: GridPosition,
    lives: number,
    inventory?: number,
    bombRange?: number
  ) {
    super(id, color, position, gridPosition, lives, inventory, bombRange);
  }
}

type ObjectiveType =
  | "destroy-barrel"
  | "kill-player"
  | "collect-powerup"
  | "free-roaming";
interface Objective {
  type: ObjectiveType;
  position: GridPosition;
}

// =========================
// Computer Class
// =========================
export class Computer extends Character {
  private objective: Objective | null = null;
  private currentPosition: GridPosition | null = null;

  private lastBombPlaced: GridPosition | null = null;

  private moveDelay: number = 500;
  private lastMoved: number = 0;

  constructor(
    id: string,
    color: string,
    position: Position,
    gridPosition: GridPosition,
    lives: number,
    inventory?: number,
    bombRange?: number
  ) {
    super(id, color, position, gridPosition, lives, inventory, bombRange);
  }

  public updateCurrentPosition(): void {
    this.currentPosition = this.gridPosition;
  }

  public setObjective(type: ObjectiveType, position?: GridPosition): void {
    this.objective = {
      type,
      position: position ?? this.gridPosition,
    };
  }

  public clearObjective(): void {
    this.objective = null;
  }

  public canMove(currentTime: number): boolean {
    return currentTime - this.lastMoved >= this.moveDelay;
  }

  public canPlaceBomb(): boolean {
    return this.inventory > 0;
  }

  public updateLastBombPlaced(): void {
    this.lastBombPlaced = { ...this.gridPosition };
  }

  private calculateDistance(posA: GridPosition, posB: GridPosition): number {
    return Math.abs(posA.row - posB.row) + Math.abs(posA.col - posB.col);
  }

  private findNearestPosition(positions: GridPosition[]): GridPosition | null {
    if (positions.length === 0) return null;

    let nearestPos = positions[0];
    let minDistance = this.calculateDistance(this.gridPosition, positions[0]);

    for (let i = 1; i < positions.length; i++) {
      const distance = this.calculateDistance(this.gridPosition, positions[i]);
      if (distance < minDistance) {
        minDistance = distance;
        nearestPos = positions[i];
      }
    }

    return nearestPos;
  }

  private findNearestCharacter(characters: Character[]): Character | null {
    if (characters.length === 0) return null;

    let nearestChar = characters[0];
    let minDistance = this.calculateDistance(
      this.gridPosition,
      characters[0].gridPosition
    );

    for (let i = 1; i < characters.length; i++) {
      const distance = this.calculateDistance(
        this.gridPosition,
        characters[i].gridPosition
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestChar = characters[i];
      }
    }

    return nearestChar;
  }

  public isInDanger(
    activeBombs: GridPosition[],
    blastRadius: number = 3
  ): boolean {
    if (!this.currentPosition) return false;

    for (const bombPos of activeBombs) {
      // Check if in same row or column as a bomb
      if (
        (this.currentPosition.row === bombPos.row &&
          Math.abs(this.currentPosition.col - bombPos.col) <= blastRadius) ||
        (this.currentPosition.col === bombPos.col &&
          Math.abs(this.currentPosition.row - bombPos.row) <= blastRadius)
      ) {
        return true;
      }
    }

    return false;
  }

  public findSafePath(
    activeBombs: GridPosition[],
    grid: number[][],
    blastRadius: number = 3
  ): Direction | null {
    if (!this.currentPosition) return null;

    // Define possible directions to move
    const directions = [
      Direction.UP,
      Direction.RIGHT,
      Direction.DOWN,
      Direction.LEFT,
    ];

    // Shuffle directions for more natural movement
    const shuffledDirections = [...directions].sort(() => Math.random() - 0.5);

    // Check each direction for safety
    for (const direction of shuffledDirections) {
      const movements = {
        [Direction.UP]: { row: -1, col: 0 },
        [Direction.DOWN]: { row: 1, col: 0 },
        [Direction.LEFT]: { row: 0, col: -1 },
        [Direction.RIGHT]: { row: 0, col: 1 },
      };

      const movement = movements[direction];
      const newRow = this.currentPosition.row + movement.row;
      const newCol = this.currentPosition.col + movement.col;

      // Check if new position is within grid bounds
      if (
        newRow < 0 ||
        newRow >= grid.length ||
        newCol < 0 ||
        newCol >= grid[0].length
      ) {
        continue;
      }

      // Check if new position is walkable
      if (grid[newRow][newCol] !== 0) {
        continue;
      }

      // Check if new position is safe from bombs
      let isSafe = true;
      for (const bombPos of activeBombs) {
        if (
          (newRow === bombPos.row &&
            Math.abs(newCol - bombPos.col) <= blastRadius) ||
          (newCol === bombPos.col &&
            Math.abs(newRow - bombPos.row) <= blastRadius)
        ) {
          isSafe = false;
          break;
        }
      }

      if (isSafe) {
        return direction;
      }
    }

    return null;
  }

  public evaluateObjective(
    players: Character[],
    powerups: GridPosition[],
    barrels: GridPosition[]
  ): void {
    // Priority 1: Destroy barrels if nearby
    if (barrels.length > 0) {
      const nearestBarrel = this.findNearestPosition(barrels);
      if (
        nearestBarrel &&
        this.calculateDistance(this.gridPosition, nearestBarrel) < 3
      ) {
        this.setObjective("destroy-barrel", nearestBarrel);
        return;
      }
    }

    // Priority 2: Collect powerups if nearby
    if (powerups.length > 0) {
      const nearestPowerup = this.findNearestPosition(powerups);
      if (
        nearestPowerup &&
        this.calculateDistance(this.gridPosition, nearestPowerup) < 5
      ) {
        this.setObjective("collect-powerup", nearestPowerup);
        return;
      }
    }

    // Priority 3: Target other players if they're close
    const otherPlayers = players.filter((p) => p.id !== this.id && p.isAlive());
    if (otherPlayers.length > 0) {
      const nearestPlayer = this.findNearestCharacter(otherPlayers);
      if (
        nearestPlayer &&
        this.calculateDistance(this.gridPosition, nearestPlayer.gridPosition) <
          6
      ) {
        this.setObjective("kill-player", nearestPlayer.gridPosition);
        return;
      }
    }

    // Default: Free roaming
    this.setObjective("free-roaming");
  }

  public shouldPlaceBomb(grid: number[][]): boolean {
    if (!this.objective || !this.currentPosition || !this.canPlaceBomb()) {
      return false;
    }

    // Don't place a bomb if we just placed one here
    if (
      this.lastBombPlaced &&
      this.lastBombPlaced.row === this.currentPosition.row &&
      this.lastBombPlaced.col === this.currentPosition.col
    ) {
      return false;
    }

    switch (this.objective.type) {
      case "destroy-barrel":
        // Place bomb if next to a barrel
        return this.isAdjacentToBarrel(grid);

      case "kill-player":
        // Place bomb if in the same row or column as another player
        return this.isAlignedWithPlayer();

      case "free-roaming":
        // Randomly place bombs while roaming (10% chance)
        return Math.random() < 0.1;

      default:
        return false;
    }
  }

  private isAdjacentToBarrel(grid: number[][]): boolean {
    if (!this.currentPosition) return false;

    const { row, col } = this.currentPosition;
    const directions = [
      { row: -1, col: 0 }, // Up
      { row: 1, col: 0 }, // Down
      { row: 0, col: -1 }, // Left
      { row: 0, col: 1 }, // Right
    ];

    for (const dir of directions) {
      const newRow = row + dir.row;
      const newCol = col + dir.col;

      // Check if position is within grid bounds
      if (
        newRow >= 0 &&
        newRow < grid.length &&
        newCol >= 0 &&
        newCol < grid[0].length
      ) {
        // Check if position has a barrel (assuming 2 represents barrels)
        if (grid[newRow][newCol] === 2) {
          return true;
        }
      }
    }

    return false;
  }

  private isAlignedWithPlayer(): boolean {
    // This would require access to other players' positions
    // For now, we'll return a random chance to simulate this behavior
    return Math.random() < 0.3;
  }
}

// =========================
// Character Manager (Singleton)
// =========================
class CharacterManager {
  private static instance: CharacterManager;
  private characters: Map<string, Character> = new Map();

  private constructor() {}

  public static getInstance(): CharacterManager {
    if (!CharacterManager.instance) {
      CharacterManager.instance = new CharacterManager();
    }
    return CharacterManager.instance;
  }

  public register(character: Character): void {
    this.characters.set(character.id, character);
  }

  public remove(id: string): boolean {
    return this.characters.delete(id);
  }

  public get(id: string): Character | undefined {
    return this.characters.get(id);
  }

  public getAll(): ReadonlyArray<Character> {
    return Array.from(this.characters.values());
  }

  public getPlayers(): Player[] {
    return Array.from(this.characters.values()).filter(
      (char): char is Player => char instanceof Player
    );
  }

  public getComputers(): Computer[] {
    return Array.from(this.characters.values()).filter(
      (char): char is Computer => char instanceof Computer
    );
  }

  public getAlive(): Character[] {
    return this.getAll().filter((char) => char.isAlive());
  }

  public getPosition(id: string): GridPosition | null {
    return this.characters.get(id)?.gridPosition ?? null;
  }

  public getLives(id: string): number {
    return this.characters.get(id)?.lives ?? 0;
  }

  public isAlive(id: string): boolean {
    return this.characters.get(id)?.isAlive() ?? false;
  }

  public clear(): void {
    this.characters.clear();
  }

  public checkCollision(
    gridPos: GridPosition,
    excludeId?: string
  ): Character | null {
    for (const char of this.characters.values()) {
      if (excludeId && char.id === excludeId) continue;
      if (
        char.gridPosition.row === gridPos.row &&
        char.gridPosition.col === gridPos.col
      ) {
        return char;
      }
    }
    return null;
  }
}

// =========================
// Exported Manager Instance
// =========================
export const characterManager = CharacterManager.getInstance();

// =========================
// Convenience Functions (for backward compatibility)
// =========================
export function registerPlayer(character: Character): void {
  characterManager.register(character);
}

export function removePlayer(id: string): boolean {
  return characterManager.remove(id);
}

export function getPlayer(id: string): Character | undefined {
  return characterManager.get(id);
}

export function listPlayers(): ReadonlyArray<Character> {
  return characterManager.getAll();
}

export function getPosition(id: string): GridPosition | null {
  return characterManager.getPosition(id);
}

export function getLives(id: string): number {
  return characterManager.getLives(id);
}

export function isAlive(id: string): boolean {
  return characterManager.isAlive(id);
}
