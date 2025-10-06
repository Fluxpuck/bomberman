# Lo-Fi Bomberman

A retro-style Bomberman game built with Next.js, TypeScript, and Tailwind CSS, featuring lo-fi pixel-art aesthetics and classic gameplay mechanics.

## Features

- **Lo-Fi Aesthetic**: Muted, nostalgic color palette with pixel-art style graphics
- **Classic Gameplay**: Move around the grid, place bombs, and destroy walls
- **Chain Reactions**: Bombs can trigger other bombs for explosive combos
- **Smooth Controls**: Arrow keys or WASD for movement, spacebar for bombs
- **Win Condition**: Destroy all destructible walls to win
- **Game Over**: Don't get caught in your own explosions!

## Tech Stack

- **Next.js 14+**: React framework with App Router
- **TypeScript**: Type-safe code throughout
- **Tailwind CSS**: Utility-first styling
- **Canvas/DOM Rendering**: Smooth game rendering

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Navigate to the project directory:
```bash
cd final
```

2. Install dependencies:
```bash
npm install
```

### Running the Game

Start the development server:
```bash
npm run dev
```

Open your browser and navigate to:
```
http://localhost:3000
```

### Building for Production

Build the optimized production version:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

## How to Play

### Controls

- **Arrow Keys** or **WASD**: Move your character
- **Spacebar**: Place a bomb

### Objective

Destroy all destructible walls (yellow blocks) to win the game!

### Rules

1. Bombs explode after 3 seconds
2. Explosions travel in 4 directions (up, down, left, right)
3. Explosions destroy destructible walls
4. Explosions can trigger other bombs (chain reactions)
5. Don't get caught in an explosion or it's game over!
6. Permanent walls (brown blocks) cannot be destroyed

### Tips

- Plan your bomb placement carefully
- Use chain reactions to clear multiple walls
- Keep moving to avoid explosions
- Corner yourself at your own risk!

## Project Structure

```
final/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Main page
│   │   └── globals.css        # Global styles
│   ├── components/            # React components
│   │   ├── Game.tsx           # Main game component
│   │   ├── GameBoard.tsx      # Game board renderer
│   │   ├── StartScreen.tsx    # Start screen
│   │   ├── GameOverScreen.tsx # Game over screen
│   │   └── WinScreen.tsx      # Win screen
│   ├── game/                  # Game logic
│   │   ├── engine.ts          # Game engine
│   │   ├── collision.ts       # Collision detection
│   │   ├── grid.ts            # Grid generation
│   │   └── config.ts          # Game configuration
│   └── types/                 # TypeScript types
│       └── game.ts            # Game type definitions
├── public/                    # Static assets
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.js
```

## Game Architecture

### Game Engine (`src/game/engine.ts`)

The core game loop manages:
- Player movement and collision detection
- Bomb placement and timing
- Explosion mechanics and chain reactions
- Game state (start, playing, game over, win)
- Win/lose condition checking

### Collision System (`src/game/collision.ts`)

Handles:
- Grid-based position calculations
- Movement validation
- Explosion range calculation
- Player-explosion collision detection

### Grid System (`src/game/grid.ts`)

Generates the game board with:
- Permanent walls in a grid pattern
- Randomly placed destructible walls
- Safe starting area for the player

## Customization

You can modify game parameters in `src/game/config.ts`:

```typescript
export const GAME_CONFIG = {
  gridRows: 13,           // Number of rows
  gridCols: 15,           // Number of columns
  cellSize: 40,           // Size of each cell in pixels
  bombTimer: 3000,        // Bomb fuse time in milliseconds
  explosionDuration: 500, // Explosion display time
  explosionRadius: 2,     // Explosion range
  playerSpeed: 2.5,       // Player movement speed
};
```

## Color Palette

The lo-fi color scheme includes:
- `lofi-bg`: #e8d5b7 (Background)
- `lofi-dark`: #4a4238 (Dark elements)
- `lofi-accent`: #8b7355 (Accent color)
- `lofi-light`: #f5ebe0 (Light elements)
- `lofi-green`: #7a9b76 (Player)
- `lofi-red`: #b85c5c (Explosions)
- `lofi-blue`: #6b8cae (Player character)
- `lofi-yellow`: #d4a574 (Destructible walls)

## Browser Compatibility

Works on all modern browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT License - Feel free to use and modify!

## Credits

Built with ❤️ using Next.js, TypeScript, and Tailwind CSS.

Enjoy the game! 💣💥
