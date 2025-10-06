import { PLAYER_CONFIG, BOMB_CONFIG, SCORE_CONFIG } from "./config";
import { Character, Player, Computer } from "./_player";
import { GridPosition, Position } from "../types/game";

// =========================
// Player Stats Interface
// =========================
export interface PlayerStats {
  id: string;
  lives: number;
  position: Position;
  gridPosition: GridPosition;
  bombsAvailable: number;
  bombRange: number;
  score: number;
  kills: number;
  blocksDestroyed: number;
  bombsPlaced: number;
  activeBombs: number;
  isAlive: boolean;
  isPlayer: boolean; // true for human player, false for computer
  color: string;
}

// =========================
// Game Stats Interface
// =========================
export interface GameStats {
  timeElapsedMs: number;
  totalBombsPlaced: number;
  totalBlocksDestroyed: number;
  totalKills: number;
  playerCount: number;
  activePlayers: number;
}

// =========================
// Player Tracker Class
// =========================
class PlayerTracker {
  private _bombsPlaced: number = 0;
  private _blocksDestroyed: number = 0;
  private _kills: number = 0;
  private _score: number = 0;
  private _activeBombs: number = 0;

  constructor(private _character: Character) {}

  // Character reference
  get character(): Character {
    return this._character;
  }

  // Basic properties
  get id(): string {
    return this._character.id;
  }

  get isPlayer(): boolean {
    return this._character instanceof Player;
  }

  get isComputer(): boolean {
    return this._character instanceof Computer;
  }

  get color(): string {
    return this._character.color;
  }

  // Position tracking
  get position(): Position {
    return this._character.position;
  }

  get gridPosition(): GridPosition {
    return this._character.gridPosition;
  }

  // Life tracking
  get lives(): number {
    return this._character.lives;
  }

  get isAlive(): boolean {
    return this._character.isAlive();
  }

  decrementLife(): number {
    this._character.takeDamage();
    return this._character.lives;
  }

  isImmune(): boolean {
    return this._character.isImmune();
  }

  setImmune(): void {
    this._character.setImmune();
  }

  /**
   * Get the maximum number of bombs this character can place at once
   */
  get bombsAvailable(): number {
    return this._character.inventory;
  }

  /**
   * Get the explosion range of this character's bombs
   */
  get bombRange(): number {
    return this._character.bombRange;
  }

  /**
   * Get the number of bombs this character currently has active on the grid
   */
  get activeBombs(): number {
    return this._activeBombs;
  }

  /**
   * Increment the active bombs counter and total bombs placed
   */
  incrementActiveBombs(): void {
    this._activeBombs++;
    this._bombsPlaced++;
  }

  /**
   * Decrement the active bombs counter when a bomb explodes
   */
  decrementActiveBombs(): void {
    this._activeBombs = Math.max(0, this._activeBombs - 1);
  }

  /**
   * Check if the character can place another bomb
   * This depends on how many bombs they can have active at once (inventory)
   * and how many they currently have active (activeBombs)
   */
  canPlaceBomb(): boolean {
    return this._activeBombs < this._character.inventory;
  }

  // Inventory management

  /**
   * Increase the maximum number of bombs the character can place at once
   */
  addBomb(): void {
    this._character.addBomb();
  }

  /**
   * Increase the bomb explosion range
   */
  increaseBombRange(amount: number = 1): void {
    this._character.increaseBombRange(amount);
  }

  // Stats tracking
  get bombsPlaced(): number {
    return this._bombsPlaced;
  }

  get blocksDestroyed(): number {
    return this._blocksDestroyed;
  }

  incrementBlocksDestroyed(amount: number = 1): void {
    this._blocksDestroyed += amount;
    this.addScore(SCORE_CONFIG.pointsPerBarrel * amount);
  }

  get kills(): number {
    return this._kills;
  }

  incrementKills(): void {
    this._kills++;
    this.addScore(SCORE_CONFIG.eliminationPoints);
  }

  // Score tracking
  get score(): number {
    return this._score;
  }

  addScore(points: number): void {
    this._score += points;
  }

  // Get complete stats
  getStats(): PlayerStats {
    return {
      id: this.id,
      lives: this.lives,
      position: this.position,
      gridPosition: this.gridPosition,
      bombsAvailable: this.bombsAvailable,
      bombRange: this.bombRange,
      score: this.score,
      kills: this.kills,
      blocksDestroyed: this.blocksDestroyed,
      bombsPlaced: this.bombsPlaced,
      activeBombs: this.activeBombs,
      isAlive: this.isAlive,
      isPlayer: this.isPlayer,
      color: this.color,
    };
  }
}

// =========================
// Game Tracker Class
// =========================
class GameTracker {
  private static instance: GameTracker;
  private _players: Map<string, PlayerTracker> = new Map();
  private _startTime: number = 0;
  private _isRunning: boolean = false;

  private constructor() {}

  public static getInstance(): GameTracker {
    if (!GameTracker.instance) {
      GameTracker.instance = new GameTracker();
    }
    return GameTracker.instance;
  }

  // Game lifecycle
  startGame(): void {
    this._startTime = Date.now();
    this._isRunning = true;
  }

  stopGame(): void {
    this._isRunning = false;
  }

  get isRunning(): boolean {
    return this._isRunning;
  }

  get timeElapsedMs(): number {
    if (!this._isRunning) return 0;
    return Date.now() - this._startTime;
  }

  // Player management
  registerPlayer(character: Character): void {
    if (!this._players.has(character.id)) {
      this._players.set(character.id, new PlayerTracker(character));
    }
  }

  unregisterPlayer(id: string): void {
    this._players.delete(id);
  }

  getPlayer(id: string): PlayerTracker | undefined {
    return this._players.get(id);
  }

  getPlayers(): PlayerTracker[] {
    return Array.from(this._players.values());
  }

  getHumanPlayers(): PlayerTracker[] {
    return this.getPlayers().filter((player) => player.isPlayer);
  }

  getComputerPlayers(): PlayerTracker[] {
    return this.getPlayers().filter((player) => player.isComputer);
  }

  getAlivePlayers(): PlayerTracker[] {
    return this.getPlayers().filter((player) => player.isAlive);
  }

  // Game-wide stats
  get totalBombsPlaced(): number {
    return this.getPlayers().reduce(
      (total, player) => total + player.bombsPlaced,
      0
    );
  }

  get totalBlocksDestroyed(): number {
    return this.getPlayers().reduce(
      (total, player) => total + player.blocksDestroyed,
      0
    );
  }

  get totalKills(): number {
    return this.getPlayers().reduce((total, player) => total + player.kills, 0);
  }

  // Bomb hit detection and damage application
  applyExplosionDamage(
    affectedCells: GridPosition[],
    sourcePlayerId: string
  ): void {
    // Find which players are in the explosion area
    for (const player of this.getPlayers()) {
      if (!player.isAlive) continue;
      if (player.isImmune()) continue;

      const isHit = affectedCells.some(
        (cell) =>
          cell.row === player.gridPosition.row &&
          cell.col === player.gridPosition.col
      );

      if (isHit) {
        // Apply damage to the hit player
        player.decrementLife();

        // Set player immune after taking damage
        player.setImmune();

        // If player died from this hit, credit the kill to the source player
        if (!player.isAlive && player.id !== sourcePlayerId) {
          const sourcePlayer = this.getPlayer(sourcePlayerId);
          if (sourcePlayer) {
            sourcePlayer.incrementKills();
          }
        }
      }
    }
  }

  // Block destruction tracking
  recordBlockDestruction(count: number, playerId: string): void {
    const player = this.getPlayer(playerId);
    if (player) {
      player.incrementBlocksDestroyed(count);
    }
  }

  // Get complete game stats
  getGameStats(): GameStats {
    return {
      timeElapsedMs: this.timeElapsedMs,
      totalBombsPlaced: this.totalBombsPlaced,
      totalBlocksDestroyed: this.totalBlocksDestroyed,
      totalKills: this.totalKills,
      playerCount: this._players.size,
      activePlayers: this.getAlivePlayers().length,
    };
  }

  // Reset the tracker for a new game
  reset(): void {
    this._players.clear();
    this._startTime = 0;
    this._isRunning = false;
  }

  // =========================
  // Backward Compatibility Methods
  // =========================

  // These methods are added for backward compatibility with existing code

  // Alias for totalBombsPlaced
  get globalDynamitesPlaced(): number {
    return this.totalBombsPlaced;
  }

  // Alias for totalBlocksDestroyed
  get globalBlocksDestroyed(): number {
    return this.totalBlocksDestroyed;
  }

  // Direct access to player 1's stats
  incrementBlocksDestroyed(count: number = 1): void {
    const player = this.getHumanPlayers()[0];
    if (player) {
      player.incrementBlocksDestroyed(count);
    }
  }

  // Direct access to player 1's score
  addScore(points: number): void {
    const player = this.getHumanPlayers()[0];
    if (player) {
      player.addScore(points);
    }
  }
}

// Export singleton instance
export const tracker = GameTracker.getInstance();
