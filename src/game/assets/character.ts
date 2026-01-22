import { cellSize } from "../grid";

/**
 * Character facial expression types
 */
export type FacialExpression =
  | "normal"
  | "happy"
  | "sad"
  | "angry"
  | "surprised"
  | "damaged"
  | "victorious";

/**
 * Creates a Bomberman-style player character element sized to fit within a cell
 * @param expression - Optional facial expression to display (defaults to "normal")
 */
export function createCharacter(
  expression: FacialExpression = "surprised"
): HTMLDivElement {
  const el =
    typeof document !== "undefined"
      ? document.createElement("div")
      : ({} as HTMLDivElement);

  if (typeof document !== "undefined") {
    // Create container with absolute positioning
    Object.assign(el.style, {
      position: "absolute",
      width: `${cellSize - 8}px`,
      height: `${cellSize - 8}px`,
      backgroundColor: "#4A90E2", // Blue body
      borderRadius: "50%",
      border: "2px solid #000000",
      boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    });

    // Create facial features based on expression
    createFacialFeatures(el, expression);
  }

  return el;
}

/**
 * Creates facial features for a character based on the specified expression
 *
 * @param container - The container element to add facial features to
 * @param expression - The facial expression to create
 */
function createFacialFeatures(
  container: HTMLDivElement,
  expression: FacialExpression
): void {
  // Base eye properties
  const baseEyeProps = {
    position: "absolute",
    width: "4px",
    height: "6px",
    backgroundColor: "#000000",
    borderRadius: "50%",
    top: "35%",
  };

  // Base mouth properties
  const baseMouthProps = {
    position: "absolute",
    width: "12px",
    height: "6px",
    border: "2px solid #000000",
    left: "50%",
    transform: "translateX(-50%)",
  };

  // Create eyes and mouth based on expression
  switch (expression) {
    case "happy":
      // Open eyes
      createEyes(container, {
        ...baseEyeProps,
        height: "6px",
        borderRadius: "50%",
      });
      // Big Smile
      createMouth(container, {
        ...baseMouthProps,
        width: "18px",
        height: "8px",
        borderTop: "none",
        borderRadius: "0 0 16px 16px",
        bottom: "20%",
      });
      break;

    case "sad":
      // Sad eyes (droopy)
      createEyes(
        container,
        {
          ...baseEyeProps,
          transform: "rotate(55deg)",
        },
        {
          ...baseEyeProps,
          transform: "rotate(-55deg)",
        }
      );

      // Sad mouth (frown)
      createMouth(container, {
        ...baseMouthProps,
        width: "14px",
        height: "5px",
        borderBottom: "none",
        borderRadius: "14px 14px 0 0",
        bottom: "24%",
      });
      break;

    case "angry":
      // Angry eyes (angled inward)
      createEyes(
        container,
        {
          ...baseEyeProps,
          transform: "rotate(-30deg)",
          top: "30%",
          left: "10%",
        },
        {
          ...baseEyeProps,
          transform: "rotate(30deg)",
          top: "30%",
          right: "10%",
        }
      );

      // Angry mouth (tight frown)
      createMouth(container, {
        ...baseMouthProps,
        width: "10px",
        height: "4px",
        borderBottom: "none",
        borderRadius: "10px 10px 0 0",
        bottom: "30%",
      });
      break;

    case "surprised":
      // Surprised eyes (wide open)
      createEyes(container, {
        ...baseEyeProps,
        width: "6px",
        height: "6px",
        borderRadius: "50%",
      });

      // Surprised mouth (small O)
      createMouth(container, {
        ...baseMouthProps,
        width: "8px",
        height: "8px",
        border: "2px solid #000000",
        borderRadius: "50%",
        bottom: "24%",
      });
      break;

    case "damaged":
      // Damaged eyes (X eyes)
      createXEyes(container);

      // Damaged mouth (zigzag)
      createMouth(container, {
        ...baseMouthProps,
        width: "14px",
        height: "4px",
        border: "none",
        borderBottom: "2px solid #000000",
        borderRadius: "0",
        bottom: "22%",
      });
      break;

    case "victorious":
      // Victorious eyes (happy arches)
      createEyes(container, {
        ...baseEyeProps,
        height: "4px",
        borderTop: "2px solid #000000",
        borderLeft: "2px solid #000000",
        borderRight: "2px solid #000000",
        borderBottom: "none",
        backgroundColor: "transparent",
        borderRadius: "50% 50% 0 0",
      });

      // Victorious mouth (wide grin)
      createMouth(container, {
        ...baseMouthProps,
        width: "18px",
        height: "10px",
        borderTop: "none",
        borderRadius: "0 0 18px 18px",
        bottom: "22%",
      });
      break;

    case "normal":
    default:
      // Normal eyes
      createEyes(container, baseEyeProps);

      // Normal mouth
      createMouth(container, {
        ...baseMouthProps,
        borderTop: "none",
        borderRadius: "0 0 12px 12px",
        bottom: "24%",
      });
      break;
  }
}

/**
 * Helper function to create a pair of eyes
 *
 * @param container - The container element to add eyes to
 * @param leftEyeProps - Style properties for the left eye
 * @param rightEyeProps - Optional style properties for the right eye (defaults to left eye props)
 */
function createEyes(
  container: HTMLDivElement,
  leftEyeProps: Record<string, any>,
  rightEyeProps?: Record<string, any>
): void {
  // Left eye
  const leftEye = document.createElement("div");
  Object.assign(leftEye.style, {
    ...leftEyeProps,
    left: "34%",
  });
  container.appendChild(leftEye);

  // Right eye
  const rightEye = document.createElement("div");
  Object.assign(rightEye.style, {
    ...(rightEyeProps || leftEyeProps),
    left: undefined,
    right: "35%",
  });
  container.appendChild(rightEye);
}

/**
 * Helper function to create X eyes (for damaged expression)
 *
 * @param container - The container element to add X eyes to
 */
function createXEyes(container: HTMLDivElement): void {
  // Create X eyes using lines
  for (const side of ["left", "right"]) {
    const eyeContainer = document.createElement("div");
    Object.assign(eyeContainer.style, {
      position: "absolute",
      width: "6px",
      height: "6px",
      top: "35%",
      [side]: side === "left" ? "34%" : "35%",
    });

    // Create X lines
    const line1 = document.createElement("div");
    Object.assign(line1.style, {
      position: "absolute",
      width: "100%",
      height: "2px",
      backgroundColor: "#000000",
      top: "50%",
      transform: "translateY(-50%) rotate(45deg)",
    });

    const line2 = document.createElement("div");
    Object.assign(line2.style, {
      position: "absolute",
      width: "100%",
      height: "2px",
      backgroundColor: "#000000",
      top: "50%",
      transform: "translateY(-50%) rotate(-45deg)",
    });

    eyeContainer.appendChild(line1);
    eyeContainer.appendChild(line2);
    container.appendChild(eyeContainer);
  }
}

/**
 * Helper function to create a mouth
 *
 * @param container - The container element to add the mouth to
 * @param mouthProps - Style properties for the mouth
 */
function createMouth(
  container: HTMLDivElement,
  mouthProps: Record<string, any>
): void {
  const mouth = document.createElement("div");
  Object.assign(mouth.style, mouthProps);
  container.appendChild(mouth);
}
