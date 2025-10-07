import { Direction, GridPosition, Position } from "../types/game";
import { PLAYER_CONFIG, BOMB_CONFIG } from "./config";

// =========================
// Base Character Class
// =========================
export abstract class Character {
  // Damage cooldown tracking
  private _damageCooldownEndTime: number = 0;
  private static readonly DAMAGE_COOLDOWN_MS: number = 500; // How long a player is immune after taking damage
  
  // Damage animation tracking
  private _damageAnimationEndTime: number = 0;
  private static readonly DAMAGE_ANIMATION_MS: number = 250; // Shorter duration for a more subtle effect

  constructor(
    public id: string,
    public color: string,
    public position: Position,
    public gridPosition: GridPosition,
    public lives: number,
    public inventory: number = PLAYER_CONFIG.defaultInventory,
    public bombRange: number = BOMB_CONFIG.bombRange
  ) {}

  public move(direction: Direction): void {
    const movements = {
      [Direction.UP]: { y: -1, row: -1, x: 0, col: 0 },
      [Direction.DOWN]: { y: 1, row: 1, x: 0, col: 0 },
      [Direction.LEFT]: { x: -1, col: -1, y: 0, row: 0 },
      [Direction.RIGHT]: { x: 1, col: 1, y: 0, row: 0 },
    };

    const movement = movements[direction];
    this.position.x += movement.x;
    this.position.y += movement.y;
    this.gridPosition.col += movement.col;
    this.gridPosition.row += movement.row;
  }

  public takeDamage(): void {
    this.lives = Math.max(0, this.lives - 1);
    this.startDamageAnimation();
  }
  
  /**
   * Start the damage animation
   */
  private startDamageAnimation(): void {
    this._damageAnimationEndTime = Date.now() + Character.DAMAGE_ANIMATION_MS;
  }
  
  /**
   * Check if the character is currently showing damage animation
   */
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

  /**
   * Increase the maximum number of bombs that can be placed at once
   */
  public addBomb(): void {
    // Increase max bomb capacity
    this.inventory = Math.min(this.inventory + 1, BOMB_CONFIG.maxBombs || 5);
  }

  /**
   * Check if the character can place a bomb
   * Note: This doesn't actually use up a bomb - it just checks if it's possible
   */
  public canPlaceBomb(): boolean {
    // We don't decrement inventory here anymore
    // The tracker will handle active bomb counting
    return this.inventory > 0;
  }

  public increaseBombRange(amount: number = 1): void {
    this.bombRange += amount;
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

// =========================
// Computer Class
// =========================
export class Computer extends Character {
  private targetPosition: GridPosition | null = null;
  private moveDelay: number = 500; // ms between moves
  private lastMoveTime: number = 0;

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

  public setTarget(target: GridPosition): void {
    this.targetPosition = target;
  }

  public clearTarget(): void {
    this.targetPosition = null;
  }

  public canMove(currentTime: number): boolean {
    return currentTime - this.lastMoveTime >= this.moveDelay;
  }

  public updateLastMoveTime(time: number): void {
    this.lastMoveTime = time;
  }

  // Hook for AI decision-making
  public decideNextMove(): Direction | null {
    // This will be implemented with your AI logic
    return null;
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
