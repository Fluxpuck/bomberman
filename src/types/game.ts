export interface Position {
  x: number;
  y: number;
}

export interface GridPosition {
  row: number;
  col: number;
}

export enum Direction {
  UP = "UP",
  DOWN = "DOWN",
  LEFT = "LEFT",
  RIGHT = "RIGHT",
}

export enum CellType {
  EMPTY = "EMPTY",
  WALL = "WALL",
  DESTRUCTIBLE = "DESTRUCTIBLE",
}

export enum GameState {
  START = "START",
  PLAYING = "PLAYING",
  PAUSED = "PAUSED",
  GAME_OVER = "GAME_OVER",
  WIN = "WIN",
}

export type GameMode = "solo" | "2 players" | "3 players" | "4 players";

export interface Player {
  position: Position;
  gridPosition: GridPosition;
  alive: boolean;
  speed: number;
}

export interface Bomb {
  id: string;
  position: Position;
  gridPosition: GridPosition;
  timer: number;
  explosionRadius: number;
  exploded: boolean;
}

export interface Explosion {
  id: string;
  cells: GridPosition[];
  timer: number;
}

export interface GameConfig {
  gridRows: number;
  gridCols: number;
  cellSize: number;
  bombTimer: number;
  explosionDuration: number;
  explosionRadius: number;
  playerSpeed: number;
}
