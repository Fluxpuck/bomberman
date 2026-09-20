"use client";

import { useRef, useState } from "react";
import { Direction } from "../types/game";

interface TouchControlsProps {
  onMove: (direction: Direction) => void;
  onBomb: () => void;
}

// Repeat cadence while a direction button is held down.
const MOVE_REPEAT_MS = 160;

const isTouchDevice = (): boolean => {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
};

const padButton =
  "w-12 h-12 rounded-lg bg-gray-700/70 active:bg-gray-500/70 text-white text-xl font-bold flex items-center justify-center select-none touch-none";

/**
 * On-screen d-pad + bomb button for touch devices. Each tap queues one move
 * (same as a key press); holding a direction repeats it. Rendered only when
 * the device reports touch support.
 */
export function TouchControls({ onMove, onBomb }: TouchControlsProps) {
  const [touchCapable] = useState(isTouchDevice);
  const repeatRef = useRef<number | null>(null);

  if (!touchCapable) return null;

  const startMove = (direction: Direction) => {
    onMove(direction);
    stopMove();
    repeatRef.current = window.setInterval(
      () => onMove(direction),
      MOVE_REPEAT_MS
    );
  };

  const stopMove = () => {
    if (repeatRef.current !== null) {
      window.clearInterval(repeatRef.current);
      repeatRef.current = null;
    }
  };

  const dirButton = (direction: Direction, label: string) => (
    <button
      type="button"
      className={padButton}
      onPointerDown={(e) => {
        e.preventDefault();
        startMove(direction);
      }}
      onPointerUp={stopMove}
      onPointerLeave={stopMove}
      onPointerCancel={stopMove}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-x-0 bottom-24 z-50 pointer-events-none">
      <div className="flex justify-between items-center px-4">
        {/* D-pad */}
        <div className="grid grid-cols-3 gap-1 pointer-events-auto">
          <div />
          {dirButton(Direction.UP, "▲")}
          <div />
          {dirButton(Direction.LEFT, "◀")}
          <div />
          {dirButton(Direction.RIGHT, "▶")}
          <div />
          {dirButton(Direction.DOWN, "▼")}
          <div />
        </div>

        {/* Bomb button */}
        <button
          type="button"
          className="w-16 h-16 rounded-full bg-gray-700/70 active:bg-gray-500/70 text-white text-2xl font-bold flex items-center justify-center select-none touch-none pointer-events-auto"
          onPointerDown={(e) => {
            e.preventDefault();
            onBomb();
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          💣
        </button>
      </div>
    </div>
  );
}
