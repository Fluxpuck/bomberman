import { Direction, GridPosition, Position } from "../types/game";
import {
  PLAYER_CONFIG,
  BOMB_CONFIG,
  GRID_PATTERN,
  CHARACTER_CONFIG,
} from "./core/config";
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
  // Walking animation tracking (true for the duration of a move's transition)
  private _walkingEndTime: number = 0;

  // Last direction moved, used to orient the character's sprite
  public facing: Direction = Direction.DOWN;
  // Set true when this character has won the round
  public winning: boolean = false;

  constructor(
    public id: string,
    public color: string,
    public darkColor: string,
    public lightColor: string,
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

    // Track facing and walking animation state
    this.facing = direction;
    this._walkingEndTime = Date.now() + CHARACTER_CONFIG.moveTransitionMs;
  }

  public isWalking(): boolean {
    return Date.now() < this._walkingEndTime;
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
    darkColor: string,
    lightColor: string,
    position: Position,
    gridPosition: GridPosition,
    lives: number,
    inventory?: number,
    bombRange?: number
  ) {
    super(
      id,
      color,
      darkColor,
      lightColor,
      position,
      gridPosition,
      lives,
      inventory,
      bombRange
    );
  }
}

// =========================
// Computer Class
// =========================
// AI decision-making lives entirely in ai.ts, working directly against the
// live DOM grid/dataset flags — this class only carries identity/stats,
// same as Player.
export class Computer extends Character {
  constructor(
    id: string,
    color: string,
    darkColor: string,
    lightColor: string,
    position: Position,
    gridPosition: GridPosition,
    lives: number,
    inventory?: number,
    bombRange?: number
  ) {
    super(
      id,
      color,
      darkColor,
      lightColor,
      position,
      gridPosition,
      lives,
      inventory,
      bombRange
    );
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
