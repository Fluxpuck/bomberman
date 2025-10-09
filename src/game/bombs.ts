import { GridPosition } from "@/types/game";

interface activeBomb {
    bombId: string,
    ownerId: string,
    gridPosition: GridPosition,
    placedAt: number,
    
    blastRadius: number,
    onDetonate?: (cells: GridPosition[], durationMs: number) => void;
    onExplode?: (cells: GridPosition[]) => void;
}