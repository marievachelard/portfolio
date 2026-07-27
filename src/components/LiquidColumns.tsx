"use client";

import { useEffect, useRef, useState } from "react";
import { createBlobRenderer, type BlobRenderer } from "@/lib/blobRenderer";

const COLUMNS = ["About", "Experience", "Projects", "Contact"];

/** How long the shutters take to clear the frame before the cube is released. */
const SHUTTER_MS = 650;

export function LiquidColumns() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const renderer = useRef<BlobRenderer | null>(null);
  // Column geometry is cached and refreshed on resize — reading it back on every
  // pointermove would force a layout on each mouse event.
  const rects = useRef<DOMRect[]>([]);
  const hovered = useRef(-1);
  const [opened, setOpened] = useState<number | null>(null);
  const dockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const grid = gridRef.current;
    if (!canvas || !grid) return;

    try {
      renderer.current = createBlobRenderer(canvas);
    } catch (err) {
      // A shader or context failure must not take the page down with it: the
      // columns are the content, the blob is decoration.
      console.error(err);
      return;
    }
    if (!renderer.current) return;

    const measure = () => {
      rects.current = Array.from(grid.children).map((el) =>
        el.getBoundingClientRect(),
      );
    };
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(grid);

    return () => {
      ro.disconnect();
      renderer.current?.destroy();
      renderer.current = null;
    };
  }, []);

  const close = () => {
    const r = renderer.current;
    if (dockTimer.current) clearTimeout(dockTimer.current);
    dockTimer.current = null;
    setOpened(null);
    if (r) {
      r.target.docked = false;
      r.target.crystal = false;
      // Hand control back to whatever the pointer is over; a hover will re-assert
      // it on the next pointermove.
      r.target.active = false;
      hovered.current = -1;
      r.wake();
    }
  };

  useEffect(() => {
    if (opened === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [opened]);

  // Columns are measured before the shutters move, so their rects stay valid while
  // one is open; nothing repositions, they only translate out of frame.
  const track = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = renderer.current;
    if (!r || e.pointerType === "touch") return;
    r.target.pointerX = e.clientX;
    r.target.pointerY = e.clientY;
    if (opened !== null) return;

    const i = rects.current.findIndex(
      (rect) => e.clientX >= rect.left && e.clientX < rect.right,
    );
    if (i < 0) return;
    const rect = rects.current[i];

    // Leaving a column melts the crystal — the body that re-forms in the next one
    // is liquid again.
    if (i !== hovered.current) {
      hovered.current = i;
      r.target.crystal = false;
    }

    r.target.active = true;
    r.target.colCenterX = rect.left + rect.width / 2;
    r.target.colCenterY = rect.top + rect.height / 2;
    r.target.colWidth = rect.width;
    r.target.colHeight = rect.height;
    r.wake();
  };

  const release = () => {
    const r = renderer.current;
    if (!r || opened !== null) return;
    r.target.active = false;
    r.target.crystal = false;
    hovered.current = -1;
  };

  const open = () => {
    const r = renderer.current;
    if (!r || opened !== null || hovered.current < 0) return;
    // Staged: the cube crystallises in place while the shutters clear the frame,
    // and only once they are gone does it fly off to the corner. Doing both at
    // once reads as two unrelated things happening rather than one sequence.
    r.target.crystal = true;
    setOpened(hovered.current);
    r.wake();
    dockTimer.current = setTimeout(() => {
      if (renderer.current) renderer.current.target.docked = true;
    }, SHUTTER_MS);
  };

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-white">
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      <div
        ref={gridRef}
        onPointerMove={track}
        onPointerLeave={release}
        onClick={open}
        className="relative grid h-full grid-cols-4"
      >
        {COLUMNS.map((label, i) => {
          const out = opened !== null && opened !== i;
          return (
            <section
              key={label}
              className="relative flex h-full flex-col justify-end px-4 pb-8 sm:px-8 sm:pb-12"
              style={{
                // Shutters: columns left of the opened one exit left, those to its
                // right exit right, each a beat behind its neighbour.
                transform: out
                  ? `translateX(${i < (opened ?? 0) ? "-" : ""}100vw)`
                  : undefined,
                opacity: out ? 0 : 1,
                transitionProperty: "transform, opacity, border-color",
                transitionDuration: out ? "800ms, 800ms, 400ms" : "800ms, 500ms, 500ms",
                transitionTimingFunction: `cubic-bezier(0.72, 0, 0.18, 1), linear, linear`,
                transitionDelay: `${Math.abs(i - (opened ?? i)) * 45}ms`,
                borderLeft: i === 0 ? undefined : "1px solid",
                borderLeftColor: opened !== null ? "transparent" : "var(--rule)",
                pointerEvents: out ? "none" : undefined,
              }}
            >
              {/* Fades out the moment the column opens — the same words come back
                  as the page title once the cube has settled. */}
              <div
                className="transition-opacity duration-300"
                style={{ opacity: opened === i ? 0 : 1 }}
              >
                <span className="font-mono text-[10px] tracking-[0.2em] tabular-nums text-neutral-400 sm:text-xs">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h2 className="mt-2 text-sm font-medium tracking-tight text-neutral-900 sm:text-xl md:text-2xl">
                  {label}
                </h2>
              </div>
            </section>
          );
        })}
      </div>

      {/* The section name reappears as the page title, under the docked cube,
          timed to land just as the cube finishes its flight. */}
      <div
        aria-hidden={opened === null}
        className="pointer-events-none absolute left-5 top-36 sm:left-10 sm:top-48"
        style={{
          opacity: opened === null ? 0 : 1,
          transform: opened === null ? "translateY(14px)" : "translateY(0)",
          transition: "opacity 600ms, transform 600ms cubic-bezier(0.22, 1, 0.36, 1)",
          transitionDelay: opened === null ? "0ms" : `${SHUTTER_MS + 480}ms`,
        }}
      >
        <span className="font-mono text-[10px] tracking-[0.2em] tabular-nums text-neutral-400 sm:text-xs">
          {opened === null ? "" : String(opened + 1).padStart(2, "0")}
        </span>
        <h1 className="mt-3 text-4xl font-medium tracking-tight text-neutral-900 sm:text-6xl">
          {opened === null ? "" : COLUMNS[opened]}
        </h1>
      </div>

      {/* Sits over the docked cube: the way back out, plus Escape. */}
      <button
        type="button"
        onClick={close}
        aria-label="Close"
        className="group absolute left-0 top-0 flex h-40 w-40 cursor-pointer items-end justify-center pb-3 transition-opacity duration-500"
        style={{
          opacity: opened === null ? 0 : 1,
          pointerEvents: opened === null ? "none" : "auto",
          transitionDelay: opened === null ? "0ms" : `${SHUTTER_MS + 600}ms`,
        }}
      >
        <span className="font-mono text-[10px] tracking-[0.2em] text-neutral-400 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          CLOSE
        </span>
      </button>
    </main>
  );
}
