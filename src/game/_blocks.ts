import { cellSize } from "./_grid";

/**
 * Creates a solid block element sized to fit within a cell
 */
export function createSolidBlock(): HTMLDivElement {
  const el =
    typeof document !== "undefined"
      ? document.createElement("div")
      : ({} as HTMLDivElement);
  if (typeof document !== "undefined") {
    Object.assign(el.style, {
      width: "100%",
      height: "100%",
      backgroundColor: "#444",
      border: "1px solid #333",
    });
  }
  return el;
}

/**
 * Creates a barrel block element sized to fit within a cell
 */
export function createBarrelBlock(): HTMLDivElement {
  const el =
    typeof document !== "undefined"
      ? document.createElement("div")
      : ({} as HTMLDivElement);

  if (typeof document !== "undefined") {
    // Create container with positioning
    Object.assign(el.style, {
      position: "relative",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: `${cellSize - 6}px`,
      height: `${cellSize - 6}px`,
      backgroundColor: "#8B4513", // Saddle brown - wood color
      borderRadius: "15%",
      border: "2px solid #5D2906", // Darker brown border
      boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    });

    // Add barrel rings (top and bottom)
    const addBarrelRing = (position: "top" | "bottom") => {
      const ring = document.createElement("div");
      Object.assign(ring.style, {
        height: "4px",
        width: "100%",
        backgroundColor: "#5D2906", // Dark brown
        position: "absolute",
        left: 0,
        [position]: 0,
      });
      el.appendChild(ring);
    };

    // Add middle ring
    const middleRing = document.createElement("div");
    Object.assign(middleRing.style, {
      height: "4px",
      width: "100%",
      backgroundColor: "#5D2906", // Dark brown
      position: "absolute",
      left: 0,
      top: "calc(50% - 2px)",
    });
    el.appendChild(middleRing);

    // Add top and bottom rings
    addBarrelRing("top");
    addBarrelRing("bottom");

    // Add vertical wood grain lines
    for (let i = 1; i <= 3; i++) {
      const grainLine = document.createElement("div");
      Object.assign(grainLine.style, {
        width: "2px",
        height: "100%",
        backgroundColor: "rgba(93, 41, 6, 0.3)", // Semi-transparent dark brown
        position: "absolute",
        top: 0,
        left: `${i * 25}%`,
      });
      el.appendChild(grainLine);
    }
  }

  return el;
}
