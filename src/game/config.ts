export const GAME_CONFIG = {
  timeLimit: 300, // in seconds - 5 minutes
};

export const GRID_PATTERN = {
  gridRows: 13,
  gridCols: 15,
  cellSize: 50,
  coverage: 0.8,
  cornerSafeSize: 2,
  rowOffset: 1,
  colOffset: 1,
};

export const PLAYER_CONFIG = {
  defaultLives: 3,
  defaultInventory: 1,
};

export const BOMB_CONFIG = {
  bombRange: 2,
  maxRange: 6,
  fuseDuration: 1000,
  explodeDuration: 750,
  blastRadius: 1,
  bombs: 1,
  maxBombs: 5,
  cooldown: 0,
};

export const SCORE_CONFIG = {
  pointsPerBarrel: 100,
  damagePoints: 500,
  eliminationPoints: 1000,
};

export const POWERUP_CONFIG = {
  dropChance: 0.2,
};
