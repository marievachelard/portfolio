"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  createBlobRenderer,
  dockGeometry,
  type BlobRenderer,
} from "@/lib/blobRenderer";
// Static import, so Next reads the dimensions at build time and generates the blur
// placeholder itself. The filename carries the Unsplash attribution — keep it.
import clouds from "@/images/experience/viktor-mogilat-jYbBn4m3sW0-unsplash.jpg";
import blooms from "@/images/experience/roma-kaiuk-KgEteyimvHs-unsplash.jpg";

const COLUMNS = ["About", "Experience", "Projects", "Contact"];

/** How long the shutters take to clear the frame before the cube is released. */
const SHUTTER_MS = 650;

/**
 * Experience entries, newest first. Adding one is one more item here. All of it is
 * real now — titles, dates and summaries.
 *
 * The summaries run four to five hundred characters. That is past the five lines the
 * measure was first described for, but not past what it holds: 48ch is the width of
 * 48 zeroes, and this face averages narrower than that, so a line takes closer to
 * seventy characters. These land in seven or eight lines and fit as they are.
 *
 * The ceiling is the window, not the measure. The page does not scroll and what does
 * not fit is clipped rather than reachable, so a summary much longer than these needs
 * the layout rethought rather than the measure nudged.
 */
const EXPERIENCE = [
  {
    title: "Pictarine",
    /** Digits and an en dash, tabular so a column of them lines up. */
    dates: "2022 – Present",
    summary:
      "I joined as the first data person and I'm still here, building the data function from the ground up. The strategy, the BI platform, the engineering standards, the team of six: all of it started as a blank page. My job today is less about writing queries than about creating the conditions for six people to write better ones. I lead the Data pole as an Engineering Manager, which means owning both the technical direction and the humans behind it.",
    image: clouds,
    /** Describes the frame, since nothing in the text does it. */
    imageAlt: "Ciel d'été, gros cumulus, grain de pellicule",
  },
  {
    title: "Capgemini",
    dates: "2018 – 2022",
    summary:
      "Four years, five countries, and a lot of very different projects. I worked on-site in Hamburg, Madrid, Cadiz, Singapore and Paris, on everything from aircraft quality control at Airbus to unsupervised learning on cybersecurity threats. Some missions I led solo, others with a team, always with a client in the room and a business question behind the model. It taught me to land somewhere new, understand the domain fast, and ship something people actually use.",
    image: blooms,
    imageAlt: "Massif de fleurs saisi en filé, rouges et blancs sur vert",
  },
  {
    title: "Deezer",
    dates: "2017 – 2018",
    summary:
      "This is where I learned that a number is worthless until someone can act on it. I supported Deezer's international growth, working directly with Country Directors on marketing strategy and partnerships. My job was less about building models than about making sure the right people trusted the right numbers at the right moment. I got very good at translating between analytics and marketing.",
    image: clouds,
    imageAlt: "Ciel d'été, gros cumulus, grain de pellicule",
  },
  {
    title: "Airbus",
    dates: "2016 – 2017",
    summary:
      "My first job, and I got to ask a genuinely hard question: how confident should you actually be in a 20-year market share forecast? I rebuilt Airbus' Global Delivery Forecast tool by adding Monte Carlo simulations on top of a deterministic model, to quantify where the uncertainty really came from. Non-linear regression, random forests, time series, and an R Shiny app so the whole strategy team could use it without reading a line of code. This is where I fell in love with statistics that have consequences.",
    image: blooms,
    imageAlt: "Massif de fleurs saisi en filé, rouges et blancs sur vert",
  },
];

/** Two digits, so a counter never changes width as it climbs. */
const pad = (n: number) => String(n).padStart(2, "0");

/** Wheel delta that amounts to one whole experience. */
const SCROLL_PER_ENTRY = 500;
/**
 * Fraction of the distance to the target still left after a second. The position
 * chases the wheel rather than matching it, which is where the smoothness comes
 * from; the same frame-rate-independent easing the renderer uses.
 */
const SCROLL_SMOOTH = 0.0009;
/**
 * Where the change fires, as how far the arriving picture still has to travel before
 * it is home — in gaps, so 0.1 is a tenth of the way short of it: around fifty
 * pixels on a laptop, early enough that the change has begun as the picture comes to
 * rest rather than after it.
 *
 * Everything in the text column ignores the scroll and waits for that. Then it plays
 * on its own clock: the wording out, swapped, and back, and the number turning over
 * its notch. A picture being dragged is one thing; the words naming it are another,
 * and following the hand made them feel tied to the wheel rather than to the
 * photograph.
 */
const HANDOVER = 0.1;
const TEXT_OUT_MS = 200;
const TEXT_IN_MS = 400;

/**
 * Opening a section, counted from the click. The title is struck out a letter at a
 * time from TYPE_START, and everything that belongs under it waits for the last
 * letter plus a beat before rising into place. So the length of the sequence follows
 * the length of the word — see `typedAt` below.
 */
const TYPE_START = SHUTTER_MS + 380;
const TYPE_STEP = 45;
const REST_GAP = 120;

/** Leaving, for the parts that are mounted only while a section is open. */
const exitFade = (closing: boolean) => ({
  opacity: closing ? 0 : 1,
  transition: "opacity 300ms linear",
});

export function LiquidColumns() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const renderer = useRef<BlobRenderer | null>(null);
  // Column geometry is cached and refreshed on resize — reading it back on every
  // pointermove would force a layout on each mouse event.
  const rects = useRef<DOMRect[]>([]);
  // Held so a pointermove that lands outside every cached rect can ask for a fresh
  // reading instead of giving up. A stale cache used to be silent and total: track()
  // returned before waking the renderer, so the blob could not be summoned at all
  // until the window was resized.
  const remeasure = useRef<(() => void) | null>(null);
  const hovered = useRef(-1);
  const [opened, setOpened] = useState<number | null>(null);
  // Same value as `opened`, kept for the pointer handlers to read. They can fire in
  // the same React batch as the click that opened a section, and would still see the
  // old `opened` through their closure — enough for a stray pointerleave to hand the
  // body back to the grid and drain the column out from under the cube.
  const openedRef = useRef<number | null>(null);
  // The section is open and the cube is on its way back to its column. The shutters
  // are still out at this point — they only come back once it has landed.
  const [closing, setClosing] = useState(false);
  const stageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cubeHovered, setCubeHovered] = useState(false);
  // Where the cube parks, read from the renderer's own reckoning so the label beside
  // it cannot drift off it on a short window.
  const [dock, setDock] = useState(() => dockGeometry(1440, 900));
  // Which experience is settled on, and which one it came from — the counter needs
  // the digit it is leaving to know where to start. The position itself is not state:
  // it changes every frame, and re-rendering the page at that rate to move two
  // pictures would be absurd.
  const [entry, setEntry] = useState({ index: 0, from: 0 });
  // The wording trails the change by its own fade-out: it leaves on the old entry,
  // and only once it is gone does it swap and come back.
  const [textIndex, setTextIndex] = useState(0);
  const mainRef = useRef<HTMLElement>(null);
  /** Where the list actually is, and where the wheel has asked it to go. */
  const at = useRef(0);
  const want = useRef(0);
  const rafId = useRef(0);
  /** Which way the list was last asked to go; the arriving picture depends on it. */
  const dir = useRef(1);

  useEffect(() => {
    if (textIndex === entry.index) return;
    const t = setTimeout(() => setTextIndex(entry.index), TEXT_OUT_MS);
    return () => clearTimeout(t);
  }, [entry.index, textIndex]);

  // Wheel-dragged, not wheel-triggered. The deltas move a continuous position, the
  // position chases it with an ease, and everything is placed from it — so the
  // pictures follow the hand instead of playing a canned animation at it.
  //
  // Nothing rounds it afterwards. Stopping between two experiences leaves it
  // between two: the ease is only there to smooth the hand, not to pull the list
  // anywhere it was not put.
  useEffect(() => {
    if (opened === null || COLUMNS[opened] !== "Experience") return;
    const last = EXPERIENCE.length - 1;
    let prev = 0;

    const paint = () => {
      const el = mainRef.current;
      if (!el) return;
      const p = at.current;
      el.style.setProperty("--p", p.toFixed(4));
      // Which picture is arriving depends on which way the list is going, and how
      // far it still has to travel is what the text answers to — not the distance
      // to the nearest entry, which would have it fading the moment anything moved.
      const forward = dir.current >= 0;
      const frac = p - Math.floor(p);
      // Sitting exactly on a whole number going backwards, the picture that would
      // arrive next is a full gap below, not none — without this the reckoning reads
      // it as already home and hands over to the wrong entry. Harmless while the
      // line sat at 0, wrong as soon as it does not.
      const arriving = forward ? 1 - frac : frac === 0 ? 1 : frac;
      // Which two entries this stretch is between. Clamped, so at either end of the
      // list the pair collapses and nothing changes hands.
      const leavingIdx = Math.min(
        last,
        Math.max(0, forward ? Math.floor(p) : Math.ceil(p)),
      );
      const towardIdx = Math.min(
        last,
        Math.max(0, leavingIdx + (forward ? 1 : -1)),
      );

      // Crossing the line is the whole trigger: nothing here is scrubbed. Whatever
      // the wheel is doing, the text column is either before this point or after it.
      const idx = arriving < HANDOVER ? towardIdx : leavingIdx;
      setEntry((was) =>
        was.index === idx ? was : { index: idx, from: was.index },
      );
    };

    const tick = (now: number) => {
      const dt = Math.min((now - (prev || now)) / 1000, 1 / 20);
      prev = now;
      at.current += (want.current - at.current) * (1 - SCROLL_SMOOTH ** dt);
      if (Math.abs(want.current - at.current) < 0.0004) {
        at.current = want.current;
        paint();
        rafId.current = 0;
        return;
      }
      paint();
      rafId.current = requestAnimationFrame(tick);
    };

    const run = () => {
      if (!rafId.current) {
        prev = 0;
        rafId.current = requestAnimationFrame(tick);
      }
    };

    const onWheel = (e: WheelEvent) => {
      // Clamped rather than wrapped: dragging a list has two ends, and being
      // thrown back to the start mid-gesture is not a thing a list does.
      if (e.deltaY !== 0) dir.current = Math.sign(e.deltaY);
      want.current = Math.min(
        last,
        Math.max(0, want.current + e.deltaY / SCROLL_PER_ENTRY),
      );
      run();
    };

    const onKey = (e: KeyboardEvent) => {
      const step =
        e.key === "ArrowRight" || e.key === "ArrowDown"
          ? 1
          : e.key === "ArrowLeft" || e.key === "ArrowUp"
            ? -1
            : 0;
      if (!step) return;
      dir.current = step;
      want.current = Math.min(last, Math.max(0, Math.round(want.current) + step));
      run();
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);
    paint();
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = 0;
    };
  }, [opened]);

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
      // Guarded: measure() also runs from a pointermove that missed, and that is no
      // place to be setting state on every event.
      const next = dockGeometry(window.innerWidth, window.innerHeight);
      setDock((was) => (was.x === next.x && was.reach === next.reach ? was : next));
    };
    remeasure.current = measure;
    measure();
    // Again after a frame: the first reading can land before layout has settled on
    // its final dvh, and a wrong one is not self-correcting.
    const settle = requestAnimationFrame(measure);

    const ro = new ResizeObserver(measure);
    ro.observe(grid);
    // The observer only fires when the grid's own box changes. A viewport change
    // that leaves it the same size still moves the columns.
    window.addEventListener("resize", measure);

    return () => {
      cancelAnimationFrame(settle);
      window.removeEventListener("resize", measure);
      ro.disconnect();
      remeasure.current = null;
      renderer.current?.destroy();
      renderer.current = null;
    };
  }, []);

  const hoverCube = (on: boolean) => {
    setCubeHovered(on);
    const r = renderer.current;
    if (!r) return;
    r.target.cubeHover = on;
    r.wake();
  };

  // open() run backwards, stage for stage. The cube leaves the corner and flies home
  // first, alone; only once it is back in its column do the shutters return and the
  // cube melt into it. Doing it all at once — which is what this used to do — throws
  // the whole sequence away and just snaps the page back.
  const close = () => {
    const r = renderer.current;
    if (!r || opened === null || closing) return;
    if (stageTimer.current) clearTimeout(stageTimer.current);
    setClosing(true);
    r.target.docked = false;
    r.target.returning = true;
    r.wake();

    stageTimer.current = setTimeout(() => {
      const rr = renderer.current;
      setOpened(null);
      setClosing(false);
      if (!rr) return;
      // Home: hand the body back to the grid and let the cube become liquid again,
      // filling the column it came from. `active` is deliberately left on — the
      // column is under the pointer's own section, so draining it here and refilling
      // it on the next mouse move would be a flicker for nothing.
      rr.target.returning = false;
      rr.target.crystal = false;
      // The pointer may well be sitting where the cube used to be; it is not on it
      // any more, and pointerleave does not fire for a thing that stopped existing.
      rr.target.cubeHover = false;
      setCubeHovered(false);
      openedRef.current = null;
      // A click without an intervening move must not reopen the column it just left.
      hovered.current = -1;
    }, SHUTTER_MS);
  };

  useEffect(() => {
    if (opened === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [opened, closing]);

  useEffect(() => {
    return () => {
      if (stageTimer.current) clearTimeout(stageTimer.current);
    };
  }, []);

  // Columns are measured before the shutters move, so their rects stay valid while
  // one is open; nothing repositions, they only translate out of frame.
  const track = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = renderer.current;
    if (!r || e.pointerType === "touch") return;
    r.target.pointerX = e.clientX;
    r.target.pointerY = e.clientY;
    if (openedRef.current !== null) return;

    const hit = (x: number) =>
      rects.current.findIndex((rect) => x >= rect.left && x < rect.right);
    let i = hit(e.clientX);
    if (i < 0) {
      // Nothing matched, so the cache is wrong rather than the pointer being
      // somewhere impossible — the grid covers the whole viewport. Read it again
      // rather than staying deaf until the next resize.
      remeasure.current?.();
      i = hit(e.clientX);
    }
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
    if (!r || openedRef.current !== null) return;
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
    openedRef.current = hovered.current;
    setOpened(hovered.current);
    // A section always opens on its first entry, and on it already: `from` matching
    // `index` leaves the counter nothing to roll. It simply appears with the title it
    // sits on, like the rest of the block — the turn-over is for a change of entry,
    // and arriving is not one.
    setEntry({ index: 0, from: 0 });
    setTextIndex(0);
    at.current = 0;
    want.current = 0;
    dir.current = 1;
    r.wake();
    if (stageTimer.current) clearTimeout(stageTimer.current);
    stageTimer.current = setTimeout(() => {
      if (renderer.current) renderer.current.target.docked = true;
    }, SHUTTER_MS);
  };

  // The section is open and staying open: the cube is parked in the corner, so the
  // title and the way back out belong on screen. False the instant it sets off home.
  const settled = opened !== null && !closing;
  const label = opened === null ? "" : COLUMNS[opened];
  /** When the last letter of the title has landed, and when the rest follows it. */
  const typedAt = TYPE_START + Math.max(0, label.length - 1) * TYPE_STEP;
  const restAt = typedAt + REST_GAP;

  const shown = EXPERIENCE[textIndex];
  /** The wording has caught up with the change, so it belongs on screen. */
  const textSettled = textIndex === entry.index;
  const digits = pad(entry.index + 1).split("");
  const leaving = pad(entry.from + 1).split("");
  const countDir = Math.sign(entry.index - entry.from);

  return (
    <main ref={mainRef} className="relative h-dvh w-full overflow-hidden bg-white">
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
                <h2 className="text-sm font-medium tracking-tight text-neutral-900 sm:text-xl md:text-2xl">
                  {label}
                </h2>
              </div>
            </section>
          );
        })}
      </div>

      {/* The section name reappears as the page title, under the docked cube,
          timed to land just as the cube finishes its flight. They were the last
          things to arrive on the way in, so they are the first to go on the way
          out — they leave with no delay, as the cube sets off home. */}
      <div
        aria-hidden={!settled}
        className="pointer-events-none absolute left-5 top-36 sm:left-10 sm:top-48"
      >
        {/* The wrapper only handles leaving. The letters handle arriving, one delay
            each — an animation on mount, which a transition could not do here. */}
        <div
          className="flex items-baseline gap-3 sm:gap-4"
          style={exitFade(closing)}
        >
          <h1 className="text-4xl font-medium tracking-tight text-neutral-900 sm:text-6xl">
            {label.split("").map((letter, i) => (
              <span
                key={i}
                className="type-in"
                style={{ animationDelay: `${TYPE_START + i * TYPE_STEP}ms` }}
              >
                {letter}
              </span>
            ))}
          </h1>
          {/* Sits on the title's own baseline, so it reads as an annotation to it
              rather than as a second line. */}
          {opened !== null && COLUMNS[opened] === "Experience" && (
            <span
              className="type-in font-mono text-[10px] tracking-[0.2em] tabular-nums text-neutral-400 sm:text-xs"
              // Lands as the last letter does: it annotates the line, so it belongs
              // to the line rather than to the block that rises after it.
              style={{ animationDelay: `${typedAt}ms` }}
            >
              [{" "}
              {/* Turning over rather than fading: the number has its own way of
                  changing, on the same window as the description so the two are one
                  movement. The brackets and the total hold still. */}
              {digits.map((d, i) => {
                const was = Number(leaving[i]);
                const step =
                  countDir >= 0
                    ? (Number(d) - was + 10) % 10
                    : -((was - Number(d) + 10) % 10);
                return (
                  <span key={i} className="reel-window">
                    <span
                      // Keyed on the digit, so the roll replays when this position
                      // changes and a position that does not change never moves.
                      key={d}
                      className="reel-cells reel-roll"
                      style={
                        {
                          "--reel-from": 10 + was,
                          "--reel-to": 10 + was + step,
                        } as React.CSSProperties
                      }
                    >
                      {Array.from({ length: 30 }, (_, n) => (
                        <span key={n}>{n % 10}</span>
                      ))}
                    </span>
                  </span>
                );
              })}{" "}
              / {pad(EXPERIENCE.length)} ]
            </span>
          )}
        </div>

        {/* Only the section that has entries gets them. Everything shares the
            title's left edge by sitting inside it, so nothing can drift out of
            alignment on its own. Each entry arrives a beat after the title, and
            its own three parts a beat after each other. */}
        {opened !== null && COLUMNS[opened] === "Experience" && (
          // Two nested mechanisms, on purpose. The outer element owns the section
          // opening and closing; the inner one, re-keyed on the entry, owns the
          // change from one experience to the next. They cannot share an element: a
          // CSS animation with fill-mode `both` holds its last frame and would win
          // over the inline opacity the exit needs.
          // Three levels, one job each: leaving, arriving, and the scroll fade.
          // They cannot share an element — an animation holding its last frame
          // would win over the opacity the other two need.
          <div className="mt-12 sm:mt-16" style={exitFade(closing)}>
            <div className="arrive" style={{ animationDelay: `${restAt}ms` }}>
            {/* Out quickly, back more slowly, and the wording only swaps once it has
                gone — so the old line and the new one are never both legible. */}
            <article
              style={{
                opacity: textSettled ? 1 : 0,
                transition: `opacity ${
                  textSettled ? TEXT_IN_MS : TEXT_OUT_MS
                }ms linear`,
              }}
            >
              <h2 className="text-lg font-medium tracking-tight text-neutral-900 sm:text-2xl">
                {shown.title}
              </h2>
              <p className="mt-2 font-mono text-[10px] tracking-[0.2em] tabular-nums text-neutral-400 sm:text-xs">
                {shown.dates}
              </p>
                {/* 48 characters, or whatever the window can spare — whichever is
                    smaller. That measure reads as a column of text rather than a
                    paragraph running the page width, and it is about where five
                    lines land; but it is a fixed width, so on a narrower window it
                    would keep growing into the image on the right. It has to give
                    way instead, or a long line lands under the photo. */}
              <p className="mt-8 max-w-[min(48ch,44vw)] text-sm leading-relaxed text-neutral-600 sm:mt-10 sm:text-base">
                {shown.summary}
              </p>
            </article>
            </div>
          </div>
        )}
      </div>

      {/* The entry's image, opposite its text: the left half reads, the right half
          looks. Vertically centred rather than pinned to the title, which keeps it
          from tipping the page top-heavy next to a short entry.

          Hidden below `sm`: at that width the image and a 48-character measure
          cannot share a line, and the page cannot scroll to stack them — it is one
          viewport tall with the overflow clipped.

          Pulled in from the right edge so it sits nearer the text than the frame,
          but only from `lg` up: at the narrow end of `sm` the measure and the image
          already almost touch, and moving it left there would land it on the words. */}
      {opened !== null && COLUMNS[opened] === "Experience" && (
        <div
          className="pointer-events-none absolute right-10 top-1/2 hidden -translate-y-1/2 sm:block lg:right-40"
          style={exitFade(closing)}
        >
          {/* Two things about this wrapper: the reveal owns `transform` for its rise,
              so the centring translate has to live on the parent rather than fight it
              here; and the frame is 1.85:1 while the source is 3:2, so `fill` plus
              object-cover crops the top and bottom instead of squashing. */}
          <div
            className="arrive relative aspect-[1.85/1] w-[34vw] max-w-[560px]"
            style={{ animationDelay: `${restAt}ms` }}
          >
            {/* Every entry is laid out from the same position, a screen apart.
                Nothing is keyed or replayed: drag the position and the whole strip
                moves with it. The frame does not clip them — only the page does —
                so a picture is visible for the whole of its crossing. */}
            {EXPERIENCE.map((item, i) => (
              <div
                key={i}
                className="frame-layer"
                style={{ "--i": i } as React.CSSProperties}
              >
                <Image
                  src={item.image}
                  alt={i === entry.index ? item.imageAlt : ""}
                  fill
                  sizes="34vw"
                  placeholder="blur"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* The docked cube is the way back out, plus Escape. Nothing is drawn here —
          the cube is its own affordance, this is only the hit area over it, live
          once it has landed so its flight cannot be cut short half way.
          It is also what tells the cube it is being looked at: the tumble is the only
          sign this area is live, since there is nothing here to highlight. */}
      <button
        type="button"
        onClick={close}
        onPointerEnter={() => hoverCube(true)}
        onPointerLeave={() => hoverCube(false)}
        aria-label="Close"
        className="absolute left-0 top-0 h-40 w-40 cursor-pointer"
        style={{ pointerEvents: settled ? "auto" : "none" }}
      />

      {/* Named only while the pointer is on it. Placed off the cube's own parked
          geometry — just past how far its tilted corners reach, centred on its
          middle — so it sits beside the cube and not beside the hit area, which is
          a square much larger than the cube itself.

          Marked aria-hidden: the button already carries the accessible name, and
          this would only say it twice. */}
      <span
        aria-hidden
        className="pointer-events-none absolute font-mono text-[10px] tracking-[0.2em] text-neutral-400 sm:text-xs"
        style={{
          left: dock.x + dock.reach + 16,
          top: dock.y,
          transform: "translateY(-50%)",
          opacity: cubeHovered ? 1 : 0,
          transition: "opacity 260ms linear",
        }}
      >
        [ CLOSE ]
      </span>

    </main>
  );
}
