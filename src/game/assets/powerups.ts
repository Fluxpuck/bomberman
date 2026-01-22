// Types of powerups
export type PowerupType = "extraBomb" | "increaseRange";

/**
 * Creates a power-up element
 */
export function createPowerUp(type: PowerupType): HTMLDivElement {
  const el = document.createElement("div");

  const colors = {
    extraBomb: { bg: "#3b82f6", border: "#1d4ed8" },
    increaseRange: { bg: "#ef4444", border: "#b91c1c" },
  };

  Object.assign(el.style, {
    width: "60%",
    height: "60%",
    margin: "20%",
    background: colors[type].bg,
    border: `2px solid ${colors[type].border}`,
    borderRadius: "50%",
    position: "absolute",
    top: "0",
    left: "0",
    boxSizing: "border-box",
    opacity: "0.8",
    zIndex: "5",
    pointerEvents: "auto",
    mixBlendMode: "multiply",
    boxShadow: `0 0 4px 1px ${colors[type].border}`,
  });

  // Tag for identification
  el.dataset.powerup = type;
  // Mark as non-solid
  el.dataset.solid = "0";

  // Add a label
  const label = document.createElement("div");
  Object.assign(label.style, {
    position: "absolute",
    inset: "0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: "bold",
    color: "#fff",
  });

  switch (type) {
    case "extraBomb":
      label.textContent = "+";
      break;
    case "increaseRange":
      label.textContent = "R+";
      break;
  }

  el.appendChild(label);

  return el;
}
