import { BOMB_CONFIG } from "./config";

/**
 * Creates a dynamite element sized to fit within a cell
 */
export function createDynamite(): HTMLDivElement {
  // Create the dynamite element
  const bomb = document.createElement("div");
  bomb.classList.add("dynamite");
  Object.assign(bomb.style, {
    width: "35%",
    height: "70%",
    margin: "15% 32.5%",
    background: "#c2410c",
    border: "2px solid #7c2d12",
    borderRadius: "20% / 10%",
    position: "relative",
    boxSizing: "border-box",
    marginTop: "10px",
  });

  // Create a container for the burn indicator that will be contained
  const burnContainer = document.createElement("div");
  Object.assign(burnContainer.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    overflow: "hidden",
    borderRadius: "18% / 9%",
    zIndex: "1",
  });
  bomb.appendChild(burnContainer);

  // Create the fuse element
  const fuse = document.createElement("div");
  Object.assign(fuse.style, {
    position: "absolute",
    top: "-8px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "4px",
    height: "8px",
    background: "#f59e0b",
    border: "1px solid #78350f",
    borderRadius: "1px",
    boxSizing: "border-box",
    zIndex: "10",
  });
  bomb.appendChild(fuse);

  // Create the burn indicator that will animate upward
  const burnIndicator = document.createElement("div");
  Object.assign(burnIndicator.style, {
    position: "absolute",
    bottom: "0",
    left: "0",
    width: "100%",
    height: "0%",
    background: "#9a3412",
    zIndex: "1",
  });
  burnContainer.appendChild(burnIndicator);

  // Start the animation
  const fuseDuration = BOMB_CONFIG.fuseDuration || 500;

  // Create the animation for the burn indicator
  burnIndicator.animate([{ height: "0%" }, { height: "100%" }], {
    duration: fuseDuration,
    fill: "forwards",
    easing: "ease-in",
  });

  // Add a pulsing glow to the fuse
  const fuseGlow = document.createElement("div");
  Object.assign(fuseGlow.style, {
    position: "absolute",
    top: "0",
    left: "50%",
    transform: "translateX(-50%)",
    width: "6px",
    height: "6px",
    background: "#fef08a", // Yellow glow
    borderRadius: "50%",
    boxShadow: "0 0 6px 4px rgba(254, 240, 138, 0.9)", // Stronger glow
    zIndex: "11", // Even higher z-index than the fuse
  });
  fuse.appendChild(fuseGlow);

  // Animate the fuse glow
  fuseGlow.animate(
    [
      { opacity: 0.7, transform: "translateX(-50%) scale(0.8)" },
      { opacity: 1, transform: "translateX(-50%) scale(1.2)" },
      { opacity: 0.7, transform: "translateX(-50%) scale(0.8)" },
    ],
    {
      duration: 500,
      iterations: Math.ceil(fuseDuration / 500),
      easing: "ease-in-out",
    }
  );

  // Tag for identification
  (bomb.dataset as any).role = "bomb";
  return bomb;
}
