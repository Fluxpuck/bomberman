/**
 * Creates a dynamite element sized to fit within a cell
 */
export function createDynamite(): HTMLDivElement {
  // Create the dynamite element
  const el = document.createElement("div");
  Object.assign(el.style, {
    width: "70%",
    height: "70%",
    margin: "15%",
    background: "#c2410c", // orange
    border: "2px solid #7c2d12",
    borderRadius: "4px",
    position: "relative",
    boxSizing: "border-box",
  });

  // Create the fuse element
  const fuse = document.createElement("div");
  Object.assign(fuse.style, {
    position: "absolute",
    top: "-6px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "6px",
    height: "8px",
    background: "#f59e0b",
    border: "2px solid #78350f",
    borderRadius: "2px",
    boxSizing: "border-box",
  });
  el.appendChild(fuse);
  // Tag for identification
  (el.dataset as any).role = "bomb";
  return el;
}
