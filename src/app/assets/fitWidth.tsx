"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Scales a fixed-size artboard down (never up) to fit the available width.
 * The transform lives on a wrapper, so the artboard node keeps its native
 * pixel size for PNG export.
 */
export function FitWidth({
  w,
  h,
  children,
}: {
  w: number;
  h: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / w));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [w]);

  return (
    <div
      ref={ref}
      style={{
        width: "100%",
        maxWidth: w,
        height: h * scale,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: w,
          height: h,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}
