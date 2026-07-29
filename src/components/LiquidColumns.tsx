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
import portrait from "@/images/about/marie-vachelard.jpg";
// The projects' photographs are Marie's own, so there is no attribution to carry in
// the filename — they are named for what is in them.
import marathon from "@/images/projects/strava-paris-marathon.jpg";
import figurines from "@/images/projects/hackaviz-toulouse.jpg";

const COLUMNS = ["About", "Experience", "Projects", "Contact"];

/** How long the shutters take to clear the frame before the cube is released. */
const SHUTTER_MS = 650;

/**
 * One item of a list a section can be scrolled through. Two sections have such a list —
 * Experience and Projects — and they are the same thing to everything below: the same
 * drag, the same counter, the same strip of photographs, the same fade when the entry
 * changes. The only difference between them is the data.
 *
 * `links` is what a project has and a job does not, so it is optional rather than a
 * second shape: an entry without it simply renders no row of links.
 */
type Entry = {
  title: string;
  dates: string;
  summary: string;
  image: typeof clouds;
  imageAlt: string;
  links?: { label: string; href: string }[];
};

/**
 * Experience entries, newest first. Adding one is one more item here. All of it is
 * real now — titles, dates and summaries.
 *
 * The summaries run four to five hundred characters. That is past the five lines the
 * measure was first described for, but not past what it holds: 48ch is the width of
 * 48 zeroes, and this face averages narrower than that, so a line takes closer to
 * seventy characters. None of these exceeds seven lines.
 *
 * The ceiling is the window, not the measure. The vertical offsets are fixed, so seven
 * lines end at 594px whatever the height of the window, and below that much viewport
 * the text is clipped — the page does not scroll, so what does not fit is lost rather
 * than reachable. An eighth line costs another 26px of that headroom.
 */
const EXPERIENCE: Entry[] = [
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
      "My first job, and I got to ask a genuinely hard question: how confident should you actually be in a 20-year market share forecast? I rebuilt Airbus' Global Delivery Forecast tool by adding Monte Carlo simulations on top of a deterministic model, to quantify where the uncertainty really came from. Non-linear regression, random forests, time series, and an R Shiny app so the whole strategy team could use it without reading a line of code.",
    image: blooms,
    imageAlt: "Massif de fleurs saisi en filé, rouges et blancs sur vert",
  },
];

/**
 * Projects, newest first like the experiences. Everything an experience has, plus the
 * two places a project can be gone to: the thing itself, and the repository it was
 * built in.
 *
 * The summaries are shorter than an experience's, and by five lines rather than seven.
 * A project spends the other two lines on its row of links: BLOCK_H is shared with
 * Experience — it has to be, or the photograph would rest at a different height in each
 * section — and mt-8 plus a line of mono is 48px of the 182 that block reserves for
 * prose. Five lines is about 350 characters at this measure.
 */
const PROJECTS: Entry[] = [
  {
    title: "Hackaviz Toulouse",
    dates: "2026",
    summary:
      "Four of us turned the Hackaviz brief — public spending and well-being — into a scrolling story: two women born the same year, one Greek, one Portuguese, whose governments answered the 2008 crisis in opposite ways. It was also the first thing any of us built with Claude Code.",
    image: figurines,
    imageAlt:
      "Quatre figurines de bronze assises sur une poutre, une silhouette floue derrière",
    links: [
      { label: "Visit", href: "https://marievachelard.github.io/hackaviz_2026/" },
      { label: "GitHub", href: "https://github.com/marievachelard/hackaviz_2026" },
    ],
  },
  {
    title: "Strava Activity Tracker",
    dates: "2025",
    summary:
      "I wanted my own running data back out of Strava's app, so I built a Streamlit dashboard on top of its API: distance, pace, and the shape of a training block over time. It started as an excuse to learn the API properly and turned into the thing I actually open after a long run.",
    image: marathon,
    imageAlt:
      "Coureurs du marathon de Paris sur les pavés, l'Arc de Triomphe au fond",
    links: [
      { label: "Visit", href: "https://strava-activity-tracker.streamlit.app/" },
      {
        label: "GitHub",
        href: "https://github.com/marievachelard/strava_streamlit_app",
      },
    ],
  },
];

/**
 * The sections that are a list, by name. This is the whole of what makes Projects work:
 * the drag, the counter, the strip and the fade all ask this rather than naming a
 * section, so a section either has entries or it does not. Contact has none, About has
 * its own arrangement, and adding a third list is one more line here.
 */
const ENTRIES: Record<string, Entry[]> = {
  Experience: EXPERIENCE,
  Projects: PROJECTS,
};

/**
 * About's two blocks of prose. Placeholder, and written to say so: it is here to hold
 * the shape of the arrangement — two columns either side of the portrait — until there
 * are true words to put in it. Both run four to five lines at the measure below, which
 * is what the reserved height of a block is sized for; replacing them with anything
 * much longer will run the second half of each past the bottom of a short window.
 */
const ABOUT_PLACEHOLDER = [
  "Placeholder copy, standing in for the real words until they are written. It is here so the shape of the block can be judged — the measure, the leading, and the way two columns sit either side of a portrait — at the widths the page actually has to work at.",
  "The second block carries about the same weight, so the pair reads as one arrangement rather than as a column with an afterthought beside it. Nothing in the layout depends on the wording, only on there being four or five lines of it in each.",
];

/** Two digits, so a counter never changes width as it climbs. */
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The counter is one strip of digits per position, and what is rendered is how far
 * each strip has been wound — a single running figure, not a pair of ends. A
 * transition on that figure picks up from wherever the strip actually is, so an entry
 * that changes while the last roll is still running carries on from there instead of
 * snapping back to the digit it started from. Winding on rather than resetting is
 * also what takes 9 to 0 forwards instead of spinning back through eight digits.
 *
 * A strip is thirty cells of `n % 10`, so cell 10 is a zero: an entry's resting wind
 * is ten plus its digit, and every step after that keeps the same remainder.
 */
const reelStart = (index: number) =>
  pad(index + 1)
    .split("")
    .map((d) => 10 + Number(d));

const reelWind = (wound: number[], from: number, to: number) => {
  const next = pad(to + 1);
  const prev = pad(from + 1);
  const forward = to >= from;
  return wound.map((n, i) => {
    const d = Number(next[i]);
    const w = Number(prev[i]);
    return n + (forward ? (d - w + 10) % 10 : -((w - d + 10) % 10));
  });
};

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

/**
 * Closing, the same three beats backwards, counted from the click on the cube. The
 * block drops away first; the title starts unwinding from its last letter as that
 * clears, and the cube only sets off home once the words are gone.
 */
const UNTYPE_START = 380;
const UNTYPE_STEP = 40;
/** Beat between the last letter leaving and the cube moving. */
const CUBE_GAP = 120;

/**
 * Where the photograph rests, CSS px down the page: on the middle of the block of
 * words, rather than on the middle of the window as it was.
 *
 * Derived rather than measured, and the parts check out against the DOM: the title
 * sits at top-48, its 6xl line is 60 tall, and mt-16 separates it from the block —
 * which puts the block at 316 and its middle at 455.
 *
 * BLOCK_H is reserved on the block for a reason. Entries run six or seven lines, and
 * without a floor the middle of a six-line one sits 13px higher: the photograph's
 * resting place would move under it, and the whole strip would jump the moment the
 * wording changed.
 */
const TITLE_TOP = 192;
const TITLE_LINE = 60;
const BLOCK_GAP = 64;
const BLOCK_H = 278;
const IMAGE_REST_Y = TITLE_TOP + TITLE_LINE + BLOCK_GAP + BLOCK_H / 2;

/**
 * The two lines above a summary: an entry's name, and its dates.
 *
 * About has neither and passes null, which renders them empty and hidden. That is the
 * whole mechanism behind the two sections lining up, and it is deliberately not a
 * measured offset: the space above the prose is held by the same elements carrying the
 * same type, so the first line of an About block lands exactly where an Experience
 * summary lands — at every width, without either section knowing the other's figures,
 * and still true if the heading or the dates are ever restyled.
 *
 * `visibility: hidden` rather than a bare spacer: it keeps the line box, and it takes
 * the empty heading out of the accessibility tree, so nothing announces a nameless
 * entry with no dates.
 *
 * The stand-in has to be a non-breaking space. An ordinary one is collapsible, and a
 * block whose only content is collapsible whitespace has no line box at all — the
 * heading would measure zero and the alignment this exists for would be out by its
 * whole height.
 */
const NBSP = " ";

const leading = (item: { title: string; dates: string } | null) => (
  <>
    <h2
      className={`text-lg font-medium tracking-tight text-neutral-900 sm:text-2xl${
        item ? "" : " invisible"
      }`}
    >
      {item ? item.title : NBSP}
    </h2>
    <p
      className={`mt-2 font-mono text-[10px] tracking-[0.2em] tabular-nums text-neutral-400 sm:text-xs${
        item ? "" : " invisible"
      }`}
    >
      {item ? item.dates : NBSP}
    </p>
  </>
);

/** The prose itself, one measure and one set of type wherever it appears. */
const PROSE = "text-sm leading-relaxed text-neutral-600 sm:text-base";

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
  // Which experience is settled on, and how far the counter's strips have been wound
  // to say so. The position of the photographs is not state: it changes every frame,
  // and re-rendering the page at that rate to move two pictures would be absurd.
  const [entry, setEntry] = useState(() => ({ index: 0, reel: reelStart(0) }));
  // The wording trails the change by its own fade-out: it leaves on the old entry,
  // and only once it is gone does it swap and come back.
  const [textIndex, setTextIndex] = useState(0);
  const mainRef = useRef<HTMLElement>(null);

  /**
   * The open section's entries, or null if it has none. Everything that used to name
   * Experience asks this instead, which is what Projects rides in on.
   *
   * Referentially stable for a given `opened` — it is a lookup into a module constant,
   * not a fresh array — so it is safe as an effect dependency in place of `opened`.
   */
  const entries = opened === null ? null : (ENTRIES[COLUMNS[opened]] ?? null);

  /** Where the list actually is, and where the wheel has asked it to go. */
  const at = useRef(0);
  const want = useRef(0);
  const rafId = useRef(0);

  useEffect(() => {
    if (textIndex === entry.index) return;
    const t = setTimeout(() => setTextIndex(entry.index), TEXT_OUT_MS);
    return () => clearTimeout(t);
  }, [entry.index, textIndex]);

  // Wheel-dragged, not wheel-triggered. The deltas move a continuous position, the
  // position chases it with an ease, and everything is placed from it — so the
  // pictures follow the hand instead of playing a canned animation at it.
  //
  // Nothing rounds it, ever. The wheel is the only thing that moves the strip, and it
  // stops where the hand stopped — between two experiences if that is where the hand
  // left it. The ease is a lag on the hand, not a destination of its own: it only ever
  // closes the distance to where the wheel has already asked for.
  //
  // Anything that repositions the strip once the wheel has gone quiet has been tried
  // and is not wanted. A magnet reads as the photograph being taken out of your hands,
  // whichever entry it picks and however softly it moves — it is movement nobody asked
  // for, and this page is meant to feel dragged rather than operated.
  useEffect(() => {
    if (!entries) return;
    const last = entries.length - 1;
    let prev = 0;

    const paint = () => {
      const el = mainRef.current;
      if (!el) return;
      const p = at.current;
      el.style.setProperty("--p", p.toFixed(4));
      // Which entry the strip has settled on, read from where the pictures are and
      // from nothing else. A picture takes the text over once it is within HANDOVER
      // of home; anywhere between two of them the last one to arrive holds, which is
      // what keeps the wording from flickering across a crossing.
      //
      // Position alone is the point. This used to ask which way the wheel had last
      // turned and name the entry it was leaving, so the same strip position had two
      // answers over eight tenths of the gap — and a single stray tick, the kind a
      // trackpad emits at the tail of a fling, swapped the whole text column and
      // rolled the counter while the photographs stood still.
      const nearest = Math.min(last, Math.max(0, Math.round(p)));
      if (Math.abs(p - nearest) < HANDOVER) {
        setEntry((was) =>
          was.index === nearest
            ? was
            : { index: nearest, reel: reelWind(was.reel, was.index, nearest) },
        );
      }
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
      // The one thing that does land on a whole entry, because a key names one outright
      // rather than dragging towards it. The wheel never does this.
      //
      // The next whole entry that way from wherever the list happens to be sitting.
      // Rounding first, as this did, skips one from the far half of a gap: asked to
      // go down from 1.5 it rounded to 2 and then stepped to 3.
      const whole = step > 0 ? Math.floor(want.current) : Math.ceil(want.current);
      want.current = Math.min(last, Math.max(0, whole + step));
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
  }, [entries]);

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

  // open() run backwards, beat for beat. Flipping `closing` starts the words leaving —
  // the block drops, then the title unwinds from its last letter, both on delays in
  // CSS. The cube waits for that to finish before it sets off home, and only once it
  // is back in its column do the shutters return and it melt into it.
  //
  // Doing it all at once — which is what this used to do — throws the sequence away
  // and just snaps the page back.

  const close = () => {
    const r = renderer.current;
    if (!r || opened === null || closing) return;
    if (stageTimer.current) clearTimeout(stageTimer.current);
    // First off the stage, before the block even starts to drop. It has to be done
    // here: the hit area goes inert on the same frame, and pointerleave is not
    // reliably fired for a pointer left sitting on something that stopped listening —
    // so nothing else would ever clear it. It also unwinds the cube's tumble, which
    // has no business being held while the cube flies home.
    hoverCube(false);
    setClosing(true);

    const letters = COLUMNS[opened].length;
    const wordsGone = UNTYPE_START + (letters - 1) * UNTYPE_STEP + CUBE_GAP;

    stageTimer.current = setTimeout(() => {
      const rr0 = renderer.current;
      if (rr0) {
        rr0.target.docked = false;
        rr0.target.returning = true;
        rr0.wake();
      }
      stageTimer.current = setTimeout(() => {
        const rr = renderer.current;
        setOpened(null);
        setClosing(false);
        if (!rr) return;
        // Home: hand the body back to the grid and let the cube become liquid again,
        // filling the column it came from. `active` is deliberately left on — the
        // column is under the pointer's own section, so draining it here and
        // refilling it on the next mouse move would be a flicker for nothing.
        rr.target.returning = false;
        rr.target.crystal = false;
        openedRef.current = null;
        // A click without an intervening move must not reopen the column it just left.
        hovered.current = -1;
      }, SHUTTER_MS);
    }, wordsGone);
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
    // A section always opens on its first entry, and on it already: the counter mounts
    // with its strips already wound to it and nothing to transition from. It simply
    // appears with the title it sits on, like the rest of the block — the turn-over is
    // for a change of entry, and arriving is not one.
    setEntry({ index: 0, reel: reelStart(0) });
    setTextIndex(0);
    at.current = 0;
    want.current = 0;
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

  /** The aside on the title's own baseline. A list says which entry of how many;
      About introduces the person whose page this is. Two different sentences, but the
      same mark in the same place — so they are one element with one set of type, and a
      section without an aside simply has none. */
  const aside =
    opened === null ? null : entries ? (
      <>
        [{" "}
        {/* Turning over rather than fading: the number has its own way of
            changing, on the same window as the description so the two are one
            movement. The brackets and the total hold still.
            Each strip is placed by how far it has been wound, and a transition
            takes it there — so a position that does not change never moves, and
            one caught mid-roll by the next entry carries on from where it is.
            `tabular-nums` belongs here rather than on the aside itself: it is the
            digits that have to sit on a fixed pitch, and there are none in a word. */}
        <span className="tabular-nums">
          {entry.reel.map((n, i) => (
            <span key={i} className="reel-window">
              <span
                className="reel-cells"
                style={{ "--reel": n } as React.CSSProperties}
              >
                {Array.from({ length: 30 }, (_, c) => (
                  <span key={c}>{c % 10}</span>
                ))}
              </span>
            </span>
          ))}
        </span>{" "}
        / {pad(entries.length)} ]
      </>
    ) : COLUMNS[opened] === "About" ? (
      // A string rather than JSX text: the apostrophe stays a plain one that way,
      // without an entity in the middle of a greeting.
      "[ Hi, I'm Marie ]"
    ) : null;

  /** The strip of photographs, laid out from `--p`. The alt text belongs to the picture
      that is actually being shown, so only that one carries it. */
  const strip = (items: Entry[]) =>
    items.map((item, i) => (
      <div key={i} className="frame-layer" style={{ "--i": i } as React.CSSProperties}>
        <Image
          src={item.image}
          alt={i === entry.index ? item.imageAlt : ""}
          fill
          sizes="34vw"
          placeholder="blur"
          className="object-cover"
        />
      </div>
    ));

  /**
   * The entry the words are on, which trails the one the pictures are on by a fade.
   *
   * Clamped rather than indexed straight. `textIndex` outlives the section that set it —
   * it is reset in `open()`, batched with `opened`, so no render should ever see it point
   * past the shorter list — but the lists are no longer the same length, and the cost of
   * being wrong about that is reading `.summary` off nothing.
   */
  const shown = entries?.[Math.min(textIndex, entries.length - 1)];
  /** The wording has caught up with the change, so it belongs on screen. */
  const textSettled = textIndex === entry.index;

  return (
    <main
      ref={mainRef}
      className="relative h-dvh w-full overflow-hidden bg-white"
    >
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
      {/* The right edge is only here for About, whose second column and portrait need
          the width to be placed in. It is inert for the other sections: everything
          inside is left-aligned block flow, so a container that reaches further right
          moves nothing — and it has to be this container rather than one of its own,
          because sharing the parent is what makes the two sections' blocks start on the
          same line.

          The two insets are deliberately equal, which is what puts About's portrait on
          the centre of the page rather than merely between its neighbours: the middle
          column of a `1fr auto 1fr` grid is centred on its container, so the container
          has to be centred on the window for the two to be the same point. An earlier
          version carried the Experience photograph's `lg:right-40` here, and the
          portrait came out 60px left of centre because of it. */}
      <div
        aria-hidden={!settled}
        className="pointer-events-none absolute left-5 right-5 top-36 sm:left-10 sm:right-10 sm:top-48"
      >
        {/* Each letter owns both its arriving and its leaving, on its own delay —
            forwards from the first on the way in, backwards from the last on the way
            out. Animations rather than transitions, because these mount and unmount
            with the section and a transition has nothing to start from. */}
        <div className="flex items-baseline gap-3 sm:gap-4">
          <h1 className="text-4xl font-medium tracking-tight text-neutral-900 sm:text-6xl">
            {label.split("").map((letter, i) => (
              <span
                key={i}
                className={closing ? "type-out" : "type-in"}
                style={{
                  animationDelay: closing
                    ? `${UNTYPE_START + (label.length - 1 - i) * UNTYPE_STEP}ms`
                    : `${TYPE_START + i * TYPE_STEP}ms`,
                }}
              >
                {letter}
              </span>
            ))}
          </h1>
          {/* Sits on the title's own baseline, so it reads as an annotation to it
              rather than as a second line. */}
          {aside && (
            <span
              className={`${
                closing ? "type-out" : "type-in"
              } whitespace-nowrap font-mono text-[10px] tracking-[0.2em] text-neutral-400 sm:text-xs`}
              // Lands as the last letter does, and leaves before the first of them:
              // it annotates the line, so it comes and goes with the line rather than
              // with the block.
              style={{ animationDelay: closing ? "0ms" : `${typedAt}ms` }}
            >
              {aside}
            </span>
          )}
        </div>

        {/* Only the section that has entries gets them. Everything shares the
            title's left edge by sitting inside it, so nothing can drift out of
            alignment on its own. Each entry arrives a beat after the title, and
            its own three parts a beat after each other. */}
        {entries && shown && (
          // Two nested mechanisms, on purpose. The outer element owns the section
          // opening and closing; the inner one, re-keyed on the entry, owns the
          // change from one experience to the next. They cannot share an element: a
          // CSS animation with fill-mode `both` holds its last frame and would win
          // over the inline opacity the exit needs.
          // Three levels, one job each: leaving, arriving, and the scroll fade.
          // They cannot share an element — an animation holding its last frame
          // would win over the opacity the other two need.
          <div className="mt-12 sm:mt-16" style={{ minHeight: BLOCK_H }}>
            <div
              className={closing ? "depart" : "arrive"}
              style={{ animationDelay: closing ? "0ms" : `${restAt}ms` }}
            >
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
              {leading(shown)}
                {/* 48 characters, or whatever the window can spare — whichever is
                    smaller. That measure reads as a column of text rather than a
                    paragraph running the page width, and it is about where five
                    lines land; but it is a fixed width, so on a narrower window it
                    would keep growing into the image on the right. It has to give
                    way instead, or a long line lands under the photo. */}
              <p className={`mt-8 max-w-[min(48ch,44vw)] sm:mt-10 ${PROSE}`}>
                {shown.summary}
              </p>

              {/* Where a project can be gone to. Inside the article, so it fades with
                  the wording rather than on its own — which is also what hides the row
                  moving up or down a line when one entry's summary is shorter than the
                  next one's: the reflow happens at opacity 0.

                  The type is the dates' and the counter's and [ CLOSE ]'s, brackets and
                  all: this page annotates in mono at 10px, and a link is an annotation
                  here rather than a button.

                  pointer-events, because the whole block sits in a container that has
                  none — it is an overlay over the grid, which is what listens for the
                  click that opens a column. And tabIndex, because that same container
                  goes aria-hidden while the section closes, and a focusable node inside
                  a hidden subtree is a fault rather than a nicety. */}
              {shown.links && (
                <p className="mt-8 flex gap-6 font-mono text-[10px] tracking-[0.2em] text-neutral-400 sm:text-xs">
                  {shown.links.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      tabIndex={settled ? undefined : -1}
                      className="pointer-events-auto whitespace-nowrap transition-colors duration-200 hover:text-neutral-900"
                    >
                      [ {link.label} ↗ ]
                    </a>
                  ))}
                </p>
              )}
            </article>
            </div>
          </div>
        )}

        {/* About: two columns of prose with the portrait between them.

            The box is an Experience description block's box, and not by having been
            given the same numbers — it is the same parent, the same `mt-12 sm:mt-16`
            and the same reserved height, so the top of the two cannot drift apart. Each
            column then reserves the name and dates it does not have, which is what puts
            its first line of prose on the same line as an Experience summary rather than
            96px above it.

            The portrait is centred both ways. Across, it is the middle column of the
            grid on a container with equal insets, which puts it on the centre of the
            page. Down, it is centred in the reserved height rather than laid out with the
            prose, so it comes to rest on the same axis as the Experience photograph — the
            middle of the block, IMAGE_REST_Y — and the two images do not jump when the
            section changes. Squared off, since the source is square and cropping a face
            to a letterbox would be a worse picture.

            What shows narrows with the window, because the page is one viewport tall with
            the overflow clipped and there is nowhere to stack what does not fit: three
            columns from `xl`, the prose and the portrait from `sm` — which is the
            Experience arrangement — and the first column alone below that.

            `xl` and not `lg`, which was measured rather than guessed: two 42-character
            columns and the portrait need about 1280px between the insets. At 1024 they
            come out 239px wide, which turns four lines into eight and pushes the foot of
            the block past the height reserved for it. */}
        {opened !== null && COLUMNS[opened] === "About" && (
          <div className="mt-12 sm:mt-16" style={{ minHeight: BLOCK_H }}>
            <div
              className={closing ? "depart" : "arrive"}
              style={{ animationDelay: closing ? "0ms" : `${restAt}ms` }}
            >
              <div className="grid grid-cols-1 gap-10 sm:grid-cols-[1fr_auto] xl:grid-cols-[1fr_auto_1fr]">
                <div className="max-w-[42ch]">
                  {leading(null)}
                  <p className={`mt-8 sm:mt-10 ${PROSE}`}>{ABOUT_PLACEHOLDER[0]}</p>
                </div>

                {/* Capped at the height of the block it is centred in, and a share of
                    the window below that, so it gives way to the prose on a narrow
                    window the way the Experience photograph does. */}
                <div
                  className="hidden items-center justify-center sm:flex"
                  style={{ height: BLOCK_H }}
                >
                  <div
                    className="relative aspect-square"
                    style={{ width: `min(26vw, ${BLOCK_H}px)` }}
                  >
                    <Image
                      src={portrait}
                      alt="Portrait de Marie Vachelard, en noir et blanc"
                      fill
                      sizes="26vw"
                      placeholder="blur"
                      className="object-cover"
                    />
                  </div>
                </div>

                {/* Pushed to its own right edge rather than left in the middle of the
                    column, so the arrangement closes on the page's right margin and the
                    two blocks sit at equal distance from the portrait. It reaches
                    further right than the Experience photograph does, which is the cost
                    of a truly centred portrait: the margins have to match, and the
                    photograph's do not. */}
                <div className="ml-auto hidden max-w-[42ch] xl:block">
                  {leading(null)}
                  <p className={`mt-8 sm:mt-10 ${PROSE}`}>{ABOUT_PLACEHOLDER[1]}</p>
                </div>
              </div>
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
      {entries && (
        <div
          className="pointer-events-none absolute right-10 hidden -translate-y-1/2 sm:block lg:right-40"
          // Its resting height, and the same figure handed to the CSS: the spacing
          // between two photographs is worked out from it, since a strip that rests
          // off-centre has further to travel to clear the top of the window.
          style={{ top: IMAGE_REST_Y, "--rest": `${IMAGE_REST_Y}px` } as React.CSSProperties}
        >
          {/* Two things about this wrapper: the reveal owns `transform` for its rise,
              so the centring translate has to live on the parent rather than fight it
              here; and the frame is 1.85:1 while the source is 3:2, so `fill` plus
              object-cover crops the top and bottom instead of squashing. */}
          <div
            className={`${
              closing ? "depart" : "arrive"
            } relative aspect-[1.85/1] w-[34vw] max-w-[560px]`}
            style={{ animationDelay: closing ? "0ms" : `${restAt}ms` }}
          >
            {/* Every entry is laid out from the same position, a screen apart.
                Nothing is keyed or replayed: drag the position and the whole strip
                moves with it. The frame does not clip them — only the page does —
                so a picture is visible for the whole of its crossing. */}
            {strip(entries)}
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
        // No cursor-pointer: a hand here would swap the dot out for an arrow and read
        // as the custom cursor breaking. What this area is is announced by the cube
        // turning and by [ CLOSE ] appearing, which say more than a hand would.
        className="absolute left-0 top-0 h-40 w-40"
        style={{ pointerEvents: settled ? "auto" : "none" }}
      />

      {/* Named only while the pointer is on it. Placed off the cube's own parked
          geometry — centred on its middle, its baseline clearing how far the tilted
          corners actually reach — so it sits over the cube and not over the hit area,
          which is a square much larger than the cube itself.

          The floor on `top` is for very short or narrow windows, where the cube parks
          closer to the corner and there is barely room above it: without it the label
          would ride off the top of the page. It can end up grazing the cube there,
          which is the lesser problem.

          Marked aria-hidden: the button already carries the accessible name, and
          this would only say it twice. */}
      <span
        aria-hidden
        className="pointer-events-none absolute font-mono text-[10px] tracking-[0.2em] text-neutral-400 sm:text-xs"
        style={{
          left: dock.x,
          top: Math.max(20, dock.y - dock.reach - 12),
          transform: "translate(-50%, -100%)",
          opacity: cubeHovered ? 1 : 0,
          // Slower in than out on purpose: leaving, it has to be gone before the block
          // below has moved far, or it reads as lingering rather than as first out.
          transition: `opacity ${cubeHovered ? 260 : 160}ms linear`,
        }}
      >
        [ CLOSE ]
      </span>
    </main>
  );
}
