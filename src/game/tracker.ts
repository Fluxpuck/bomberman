import { PLAYER_CONFIG, BOMB_CONFIG, SCORE_CONFIG } from "./config";
import { Character, Player, Computer } from "./player";
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

  get position(): Position {
    return this._character.position;
  }

  get gridPosition(): GridPosition {
    return this._character.gridPosition;
  }

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

  get bombsAvailable(): number {
    return this._character.inventory;
  }

  get bombRange(): number {
    return this._character.bombRange;
  }

  get activeBombs(): number {
    return this._activeBombs;
  }

  incrementActiveBombs(): void {
    this._activeBombs++;
    this._bombsPlaced++;
  }

  decrementActiveBombs(): void {
    this._activeBombs = Math.max(0, this._activeBombs - 1);
  }

  canPlaceBomb(): boolean {
    return this._activeBombs < this._character.inventory;
  }

  // Inventory management

  addBomb(): void {
    this._character.addBomb();
  }

  increaseBombRange(): void {
    this._character.increaseBombRange();
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
  private _pauseTime: number = 0;
  private _pausedDuration: number = 0;
  private _isRunning: boolean = false;
  private _isPaused: boolean = false;

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
    this._pausedDuration = 0;
    this._isRunning = true;
    this._isPaused = false;
  }

  pauseGame(): void {
    if (this._isRunning && !this._isPaused) {
      this._pauseTime = Date.now();
      this._isPaused = true;
    }
  }

  resumeGame(): void {
    if (this._isPaused) {
      // Add the paused time to the total paused duration
      this._pausedDuration += (Date.now() - this._pauseTime);
      this._isPaused = false;
    }
  }

  stopGame(): void {
    this._isRunning = false;
    this._isPaused = false;
  }

  get isRunning(): boolean {
    return this._isRunning;
  }

  get isPaused(): boolean {
    return this._isPaused;
  }

  get timeElapsedMs(): number {
    if (!this._isRunning) return 0;
    if (this._isPaused) {
      // If paused, return time elapsed up to the pause point
      return this._pauseTime - this._startTime - this._pausedDuration;
    }
    // If running, return current time minus start time minus any paused duration
    return Date.now() - this._startTime - this._pausedDuration;
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
    this._pauseTime = 0;
    this._pausedDuration = 0;
    this._isRunning = false;
    this._isPaused = false;
  }
}

// Export singleton instance
export const tracker = GameTracker.getInstance();
