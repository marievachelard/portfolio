"use client";

import { useEffect, useRef } from "react";

// The spark used to be a native CSS `cursor` image (see globals.css history) — cheap
// and never late, but a still image can't spin. Turning it needs a real element
// under our own transform, so this follows the pointer by hand instead: one listener,
// one direct style write per move, no React re-render on the hot path.
const SIZE = 14;
const HALF = SIZE / 2;

export default function CustomCursor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fine-pointer devices only — touch has no hovering cursor to replace, and
    // leaving `<html>`'s cursor untouched there means nothing goes invisible.
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const el = ref.current;
    if (!el) return;

    const move = (e: PointerEvent) => {
      el.style.transform = `translate3d(${e.clientX - HALF}px, ${e.clientY - HALF}px, 0)`;
      el.style.opacity = "1";
    };

    // `mouseout` with a null `relatedTarget` is the cross-browser signal that the
    // pointer left the viewport entirely (through an edge, onto the address bar, onto
    // another display) rather than moving onto another element — a plain `mouseleave`
    // on `document` misses some of those. `pointermove` already brings it back the
    // moment the pointer re-enters and moves, so nothing extra is needed for that half.
    const leave = (e: MouseEvent) => {
      if (e.relatedTarget === null) el.style.opacity = "0";
    };

    document.documentElement.style.cursor = "none";
    window.addEventListener("pointermove", move);
    document.addEventListener("mouseout", leave);

    return () => {
      document.documentElement.style.cursor = "";
      window.removeEventListener("pointermove", move);
      document.removeEventListener("mouseout", leave);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: SIZE,
        height: SIZE,
        // Hidden until the first move — otherwise it flashes at the top-left corner
        // (translate3d's resting value) before the pointer has been seen once.
        opacity: 0,
        pointerEvents: "none",
        zIndex: 2147483647,
        willChange: "transform",
      }}
    >
      <svg
        className="cursor-spark"
        width={SIZE}
        height={SIZE}
        viewBox="0 0 75.56 75.76"
      >
        <polygon
          points="75.56 46.08 75.56 29.67 48.07 29.94 63.51 6.77 51.5 0 37.75 23.79 24.27 .02 12.25 6.79 27.42 29.94 0 29.67 0 46.08 27.46 45.55 12.23 68.79 24.27 75.75 37.75 51.69 51.49 75.76 63.54 68.81 48.03 45.55 75.56 46.08"
          fill="var(--foreground)"
        />
      </svg>
    </div>
  );
}
