"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  createBlobRenderer,
  dockGeometry,
  type BlobRenderer,
} from "@/lib/blobRenderer";
// Static import, so Next reads the dimensions at build time and generates the blur
// placeholder itself. Every photograph here is Marie's own, so there is no attribution
// to carry in the filename — they are named for what is in them. One per entry, in the
// order the entries come. All six are 3:4 upright out of a phone, which is also the
// frame they are shown in, so each one is shown whole.
import market from "@/images/experience/busan-market-street.jpg";
import poolside from "@/images/experience/rooftop-pool-palms.jpg";
import stage from "@/images/experience/open-air-stage.jpg";
import dome from "@/images/experience/toulouse-garonne-dome.jpg";
import portrait from "@/images/about/marie-vachelard.jpg";
import { SpecSheetGrid } from "@/components/SpecSheetGrid";
import { ABOUT_GRID_LAYOUT } from "@/lib/aboutGridLayout";
import shopfront from "@/images/projects/shop-window-paintings.jpg";
import ridge from "@/images/projects/mountain-ridge-hiker.jpg";

const COLUMNS = ["About", "Experience", "Projects", "Contact"];

/** Sections whose open layout is the ruled "spec sheet" grid, with a cube that flies
    to and fills an image cell — About's portrait, Experience's and Projects' current
    photograph. Contact has no image and keeps the plain title-container layout, its
    cube shrinking to a parked dot instead. */
const GRID_SECTIONS = new Set(["About", "Experience", "Projects"]);

/** How long the shutters take to clear the frame before the cube is released. */
const SHUTTER_MS = 650;

/** How long after the cube is set flying to its dock it takes to actually arrive
    there — the ease it flies on covers most of the distance in about this long. */
const ARRIVE_MS = 650;

/** Every section but About: how long the cube takes to shrink into its dock
    point once parked, and to grow back out of it when the [ X ] hands back to
    it. A scale, not a fade — the cube visibly collapses to the point the [ X ]
    then occupies. About has no such shrink any more — see FILL_MS. */
const SHRINK_MS = 450;

/** Every section but About: the [ X ]'s own fade, run only once the cube has
    finished shrinking away — and, on the way back, only before the cube starts
    growing again. The two are sequential, not a crossfade, so one is always
    fully gone before the other appears. About's own [ X ] instead runs on the
    content's own clock — see aboutContentInAt/OutAt below. */
const CROSS_FADE_MS = 320;

/** About only: how long, once the cube has arrived at the portrait cell as a
    small cube, it takes to un-crystallise and grow to fill that cell — and,
    on the way back, how long it takes the [ X ]'s click to be followed by the
    portrait's own click-preamble finishing (see requestClose). Reuses
    ARRIVE_MS's own rate of settling (0.0009, the same one `dockFillWidth`
    grows on) rather than inventing a new one. */
const FILL_MS = ARRIVE_MS;

/** About only: how long the portrait itself takes to fade out once the [ X ]
    is clicked — the first beat of closing, before the cube re-crystallises
    from the liquid that fade-out reveals. */
const IMAGE_FADE_MS = 320;

/** When the About grid's own lines start sliding into place — the moment the
    cube sets off for its dock, not the title's schedule the grid's content
    still runs on. Named for readability at the call site; the value really is
    just SHUTTER_MS. */
const GRID_LINES_AT = SHUTTER_MS;

/** Must match .type-in/.type-out's own animation-duration in globals.css — how
    long one letter takes to fade in or out. Needed here too: the About grid's
    content now has to start and finish on exactly the title+aside's own clock,
    which means knowing how long that last letter takes to finish appearing. */
const TYPE_LETTER_MS = 80;

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
  image: typeof market;
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
 * lines end at 594px whatever the height of the window, and the row of links under them
 * ends at 638 — below that much viewport it is clipped, and the page does not scroll, so
 * what does not fit is lost rather than reachable. An eighth line costs another 26px of
 * that headroom, and it is now a link rather than the tail of a sentence that goes over
 * the edge first.
 *
 * Each entry links to the company it names. One mark, not the projects' two: there is no
 * repository behind a job.
 */
const EXPERIENCE: Entry[] = [
  {
    title: "Pictarine",
    /** Digits and an en dash, tabular so a column of them lines up. */
    dates: "2022 – Present",
    summary:
      "I joined as the first data person and I'm still here, building the data function from the ground up. The strategy, the BI platform, the engineering standards, the team of six: all of it started as a blank page. My job today is less about writing queries than about creating the conditions for six people to write better ones. I lead the Data pole as an Engineering Manager, which means owning both the technical direction and the humans behind it.",
    image: market,
    /** Describes the frame, since nothing in the text does it. */
    imageAlt:
      "Une rue de marché à Busan, un couple qui s'éloigne bras dessus bras dessous sous les câbles",
    links: [{ label: "Visit", href: "https://pictarine.com/en" }],
  },
  {
    title: "Capgemini",
    dates: "2018 – 2022",
    summary:
      "Four years, five countries, and a lot of very different projects. I worked on-site in Hamburg, Madrid, Cadiz, Singapore and Paris, on everything from aircraft quality control at Airbus to unsupervised learning on cybersecurity threats. Some missions I led solo, others with a team, always with a client in the room and a business question behind the model. It taught me to land somewhere new, understand the domain fast, and ship something people actually use.",
    image: poolside,
    imageAlt:
      "Une piscine sur un toit au petit matin, palmiers et ville dans la brume",
    links: [{ label: "Visit", href: "https://www.capgemini.com/" }],
  },
  {
    title: "Deezer",
    dates: "2017 – 2018",
    summary:
      "This is where I learned that a number is worthless until someone can act on it. I supported Deezer's international growth, working directly with Country Directors on marketing strategy and partnerships. My job was less about building models than about making sure the right people trusted the right numbers at the right moment. I got very good at translating between analytics and marketing.",
    image: stage,
    imageAlt:
      "Un concert en plein air au soleil couchant, le groupe en bleu et la foule de dos",
    links: [{ label: "Visit", href: "https://www.deezer.com/en/" }],
  },
  {
    title: "Airbus",
    dates: "2016 – 2017",
    summary:
      "My first job, and I got to ask a genuinely hard question: how confident should you actually be in a 20-year market share forecast? I rebuilt Airbus' Global Delivery Forecast tool by adding Monte Carlo simulations on top of a deterministic model, to quantify where the uncertainty really came from. Non-linear regression, random forests, time series, and an R Shiny app so the whole strategy team could use it without reading a line of code.",
    image: dome,
    imageAlt:
      "La Garonne à Toulouse au petit matin, le dôme de la Grave reflété dans l'eau",
    links: [{ label: "Visit", href: "https://www.airbus.com/en" }],
  },
];

/**
 * Projects, newest first like the experiences. Everything an experience has, plus the
 * two places a project can be gone to: the thing itself, and the repository it was
 * built in.
 *
 * The summaries are shorter than an experience's, and by five lines rather than seven —
 * a project spends the other two lines on its own row of links. Five lines is about
 * 350 characters at this measure.
 */
const PROJECTS: Entry[] = [
  {
    title: "Hackaviz Toulouse",
    dates: "2026",
    summary:
      "Four of us turned the Hackaviz brief — public spending and well-being — into a scrolling story: two women born the same year, one Greek, one Portuguese, whose governments answered the 2008 crisis in opposite ways. It was also the first thing any of us built with Claude Code.",
    image: shopfront,
    imageAlt:
      "Une vitrine de librairie couverte d'affiches d'exposition, deux petites toiles peintes à la main posées sur le rebord",
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
    image: ridge,
    imageAlt:
      "Un randonneur seul sur une crête rocheuse, la main en visière, les montagnes dans la brume",
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
 * The sections whose aside is simply a phrase, by name. The ones that are a list get a
 * counter there instead, worked out from the list itself; a section named here has no list
 * and says something in the same place.
 *
 * Strings rather than JSX text, so the apostrophes stay plain ones — an entity in the
 * middle of a greeting is a thing to avoid.
 */
const PHRASE: Record<string, string> = {
  About: "[ Hi, I'm Marie ]",
  Contact: "[ Let's talk ]",
};

/**
 * Contact: a line saying how to reach her, and the three places to do it from.
 *
 * The three are the same marks the projects and the jobs link out with — one row, one set
 * of type, the same spread under the pointer. Nothing here is a form or a button, because
 * nothing else on this page is either.
 *
 * The address is behind [ Email ] rather than spelled out. That is the one thing this
 * arrangement costs: it can be clicked but not read, so anyone who would rather copy it
 * than open a mail client has to open one first. Worth revisiting if that turns out to
 * matter more than the row staying three even marks.
 */
const CONTACT = {
  prose:
    "Email is the surest way to reach me, and I answer. Happy to talk data teams, side projects, or where to run in Toulouse.",
  links: [
    { label: "Email", href: "mailto:marie.vachelard-pro@proton.me" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/marie-vachelard/" },
    { label: "GitHub", href: "https://github.com/marievachelard" },
  ],
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
 * Where the counter turns, as how far the arriving picture still has to travel before
 * it is home — in gaps, so 0.1 is a tenth of the way short of it: around fifty
 * pixels on a laptop, early enough that the change has begun as the picture comes to
 * rest rather than after it. It is what the number rolls on, and what decides which
 * picture is the one carrying the alt text.
 *
 * The wording no longer waits for it. That used to be the whole text column: it ignored
 * the scroll, and when this fired it played out and back on a clock of its own. The
 * wording is read off the position now, the same way the pictures are and over the same
 * half a gap, so it leaves and returns at whatever speed the hand is moving. What it
 * does not share with them is the depth — see `.entry-fade` in the stylesheet.
 */
const HANDOVER = 0.1;

/**
 * Opening a section, counted from the click. The title is struck out a letter at a
 * time from TYPE_START, and everything that belongs under it waits for the last
 * letter plus a beat before rising into place. So the length of the sequence follows
 * the length of the word — see `typedAt` below.
 *
 * About overrides this with its own start (see `titleStartAt`): its title has the
 * grid's lines to wait for, which the other sections have nothing equivalent to,
 * so this stays their own fixed beat after the shutters clear.
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

const TITLE_LINE = 60;

/** Contact's own reserved content height — the same figure Experience and Projects
    used to share with it before they moved into the grid, kept here since Contact
    still uses the plain title-container layout the figure was sized for. */
const BLOCK_H = 278;

/**
 * What to tell the browser about the width of a photograph in its grid cell. The cell
 * is roughly half the content width between the margins (a `1fr` track alongside
 * prose's own `1fr`), so this is an approximation rather than a figure read off the
 * grid's own numbers — good enough for the browser's own picking between the
 * photographs' existing responsive breakpoints, not a layout-affecting value itself.
 */
const IMAGE_SIZES = "45vw";

/**
 * How far the foot of the page sits above the bottom edge. It is the columns' own
 * `pb-12`, which is where the four section titles rest when nothing is open — so a mark
 * placed on this line lands where those words were, rather than at some distance of its
 * own choosing.
 */
// FOOT and the About block's own height calc (ABOUT_BLOCK_H) are gone: the unified
// SpecSheetGrid now sizes the legend row from its own row tracks (marginBottom,
// the `1fr` content row) rather than a calc() derived from these constants.

/**
 * The line above a summary: an entry's name and its dates, sharing one line rather than
 * stacking on two — the dates trail the title as a bracketed mark, `items-baseline` so
 * the smaller mono type sits on the title's own baseline rather than floating above it.
 *
 * About has neither and passes null, which renders it empty and hidden. That is the
 * whole mechanism behind the two sections lining up, and it is deliberately not a
 * measured offset: the space above the prose is held by the same element carrying the
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
  <h2
    className={`flex items-baseline gap-2 whitespace-nowrap text-lg font-medium tracking-tight text-neutral-900 sm:text-2xl${
      item ? "" : " invisible"
    }`}
  >
    <span>{item ? item.title : NBSP}</span>
    <span className="font-mono text-[10px] tracking-[0.2em] tabular-nums text-neutral-400 sm:text-xs">
      {item ? `[ ${item.dates} ]` : NBSP}
    </span>
  </h2>
);

/** The prose itself, one measure and one set of type wherever it appears. */
const PROSE = "text-sm leading-relaxed text-neutral-600 sm:text-base";

/**
 * A link, as this page draws one: a bracketed mark in the mono the dates and the counter
 * and [ CLOSE ] are set in, whose letters spread apart when it is pointed at. Both the
 * projects' links and About's coordinates are this, so they are one function — the effect
 * cannot drift between them.
 *
 * The label appears twice, which is not a mistake: the hidden copy is what holds the box
 * open at the spread width so a growing mark moves nothing beside it. The mechanism is
 * `.mark` in globals.css, and both copies must carry the same text for it to measure
 * right.
 *
 * `pointer-events`, because every one of these sits inside an overlay that has none — it
 * is laid over the grid, which is what listens for the click that opens a column. And
 * `tabIndex`, because that overlay goes aria-hidden while a section closes, and a
 * focusable node inside a hidden subtree is a fault rather than a nicety.
 *
 * A mailto is the one kind that does not open a tab. It hands the reader to their mail
 * client instead of to a page, and `_blank` on that leaves an empty tab sitting behind
 * once the handoff has happened. Read off the href rather than passed in, since it is a
 * property of the destination and not a decision any call site should have to make.
 */
const mark = ({
  href,
  label,
  settled,
  centred,
}: {
  href: string;
  label: string;
  settled: boolean;
  /** Placed on the middle of the page rather than flush to its left margin. */
  centred?: boolean;
}) => {
  const opensAPage = !href.startsWith("mailto:");
  return (
  <a
    key={href}
    href={href}
    target={opensAPage ? "_blank" : undefined}
    rel={opensAPage ? "noreferrer" : undefined}
    tabIndex={settled ? undefined : -1}
    className={`mark${
      centred ? " mark-mid" : ""
    } pointer-events-auto font-mono text-[10px] tracking-[0.2em] text-neutral-400 transition-colors duration-200 hover:text-neutral-900 sm:text-xs`}
  >
    <span aria-hidden className="mark-sizer">
      [ {label} ]
    </span>
    <span className="mark-label">[ {label} ]</span>
  </a>
  );
};

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
  // Every section but About: the cube has actually landed at its dock — as
  // opposed to `docked`, which flips the moment it sets off flying there. Once
  // true, the cube shrinks into the dock point; closing runs this back to false
  // first so the cube grows back before it sets off home. About never sets this
  // — it grows in place instead (see `dockFillWidth`/`dockFillHeight` on the
  // renderer target), so its own dock is never small enough to need a shrink.
  const [parked, setParked] = useState(false);
  // Every section but About: the [ X ] itself, shown only once the cube has
  // finished shrinking away — see SHRINK_MS/CROSS_FADE_MS above for why this
  // trails `parked` rather than mirroring it. About's own [ X ] instead runs on
  // the content's own clock (aboutContentInAt/OutAt), not this.
  const [crossVisible, setCrossVisible] = useState(false);
  const arriveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const crossTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Grid sections only: the image's own opacity — see its prop comment on
  // SpecSheetGrid for why it has to be independent of the content fade.
  // Starts true so a first open has something to fade nothing away from.
  const [imageVisible, setImageVisible] = useState(true);
  // Grid sections only: the open section's image cell, one ref per breakpoint
  // variant (only one is ever actually laid out, per SpecSheetGrid's own
  // `hidden` classes) — read for its centre (the cube's new dock point) and
  // its size (what the cube grows to fill once there). Shared by all three
  // grid sections, since only one is ever open at a time.
  const imageCellSm = useRef<HTMLDivElement | null>(null);
  const imageCellXl = useRef<HTMLDivElement | null>(null);
  // Where the cube parks, read from the renderer's own reckoning so the label beside
  // it cannot drift off it on a short window.
  const [dock, setDock] = useState(() => dockGeometry(1440, 900));
  // The title-relative point every section's dock used to be, and Contact's
  // still is — a grid section's own [ X ] stays here too even though the cube
  // itself now docks on the image cell instead (`dock` above).
  const [titleDock, setTitleDock] = useState({ x: 0, y: 0 });
  // Which experience is settled on, and how far the counter's strips have been wound
  // to say so. The position of the photographs is not state: it changes every frame,
  // and re-rendering the page at that rate to move two pictures would be absurd.
  const [entry, setEntry] = useState(() => ({ index: 0, reel: reelStart(0) }));
  // Which entry the wording is on. It trails nothing and waits for nothing: it is the
  // entry the strip is nearest, and it changes at the midpoint of a crossing — see
  // `paint` below for why that is the one place it can.
  const [textIndex, setTextIndex] = useState(0);
  const mainRef = useRef<HTMLElement>(null);
  // Was the dev panel's own tunable state (localStorage-backed sliders) while the
  // panel existed; now just the values it settled on, driving the About spec-sheet
  // grid as fixed constants.
  const layoutValues = ABOUT_GRID_LAYOUT;

  // Whichever of the two image cell refs is actually laid out right now — the
  // other's box is zeroed by its own `hidden` class rather than unmounted, so
  // "has a width" is what tells them apart, not which one is set.
  const getImageCellRect = () => {
    const xl = imageCellXl.current;
    if (xl && xl.getBoundingClientRect().width > 0) return xl.getBoundingClientRect();
    const sm = imageCellSm.current;
    if (sm && sm.getBoundingClientRect().width > 0) return sm.getBoundingClientRect();
    return null;
  };

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
      // The wording, which takes no threshold at all: it is on whichever entry is
      // nearest, so it changes at the midpoint of a crossing. That is the one place it
      // can change without being seen doing it — half a gap out is exactly where the
      // fade has taken it to nothing, and it is the same half a gap on either side of
      // the swap, so nothing jumps across it. A threshold like HANDOVER would put the
      // change somewhere the wording is legible again.
      //
      // Called every frame and almost always a no-op: React drops a set to the value
      // already held, so this costs a render once per crossing, not once per frame.
      setTextIndex(nearest);
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
      const base = dockGeometry(window.innerWidth, window.innerHeight);
      const isGridOpen =
        openedRef.current !== null && GRID_SECTIONS.has(COLUMNS[openedRef.current]);
      // Overrides dockGeometry's own corner-based x/y: the cube's centre lines up
      // with the title's own vertical centre (same titleSpace box the title itself
      // is now centred in — see the titleSpace comment above), and its right edge
      // is floored to the outer margin line rather than a fixed corner inset, so it
      // never overhangs past it however wide that margin is set.
      //
      // Computed unconditionally, grid sections included: the [ X ] stays here
      // (top right, by the title) regardless of where the cube itself docks —
      // see `titleDock` below.
      const dvTitleSpace =
        layoutValues.titleTop + TITLE_LINE - layoutValues.marginTop - 1;
      const titleDockX = window.innerWidth - layoutValues.marginRight - base.reach;
      const titleDockY = layoutValues.marginTop + 1 + dvTitleSpace / 2;
      // A grid section's cube docks on its image cell's own centre instead —
      // measured from the DOM rather than derived, since this renderer has no
      // way to know the grid's own layout. Falls back to the title point if
      // the cell cannot be measured yet (the section just opened and
      // SpecSheetGrid has not laid out on this frame).
      const cell = isGridOpen ? getImageCellRect() : null;
      const dockX = cell ? cell.left + cell.width / 2 : titleDockX;
      const dockY = cell ? cell.top + cell.height / 2 : titleDockY;
      const next = { ...base, x: dockX, y: dockY };
      setDock((was) =>
        was.x === next.x && was.y === next.y && was.reach === next.reach
          ? was
          : next,
      );
      setTitleDock((was) =>
        was.x === titleDockX && was.y === titleDockY
          ? was
          : { x: titleDockX, y: titleDockY },
      );
      if (renderer.current) {
        renderer.current.target.dockX = dockX;
        renderer.current.target.dockY = dockY;
      }
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

  // Hoisted above `close` (which reads aboutLinesOutAt below) rather than left
  // grouped with the rest of the About timing further down — that grouping would
  // otherwise put `label` and this "close" half of the timing after the function
  // that reads them.
  const label = opened === null ? "" : COLUMNS[opened];
  /** When the title starts unwinding on close. A grid section starts the instant
      `close` is called — which requestClose now times to the cube setting off
      growing, not to it finishing — the same way the title started typing the
      instant the cube set off shrinking, not once it had finished. Contact
      keeps the fixed UNTYPE_START beat, since requestClose still waits for its
      grow to finish first. */
  const titleUnwindStartAt = GRID_SECTIONS.has(label) ? 0 : UNTYPE_START;
  /**
   * The content fade points at the same clock the title's own per-letter unwind
   * does (titleUnwindStartAt/UNTYPE_STEP instead of TYPE_START/TYPE_STEP's), so
   * the two leave as one movement here too — the same way they arrived together.
   */
  const aboutContentOutAt = titleUnwindStartAt;
  const aboutContentOutDuration =
    Math.max(0, label.length - 1) * UNTYPE_STEP + TYPE_LETTER_MS;
  /** The grid's lines wait for the content to finish leaving before they do —
      the cube itself already re-crystallised back in requestClose's preamble,
      before `close` (and `closing`) even started, so there is nothing left of
      its own for them to wait on this time. First to arrive, last to leave. */
  const aboutLinesOutAt = aboutContentOutAt + aboutContentOutDuration;

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
    if (arriveTimer.current) clearTimeout(arriveTimer.current);
    if (crossTimer.current) clearTimeout(crossTimer.current);
    // The cube has to be the thing flying home, not the [ X ] — so if it had
    // already parked and shrunk away (Contact only), this puts it back at
    // full size before the flight starts. Harmless for a grid section, which
    // never sets `parked` in the first place.
    setParked(false);
    setCrossVisible(false);
    setClosing(true);

    const letters = COLUMNS[opened].length;
    const isGrid = GRID_SECTIONS.has(COLUMNS[opened]);
    const wordsGone = UNTYPE_START + (letters - 1) * UNTYPE_STEP + CUBE_GAP;
    // A grid section's own re-crystallising already happened in requestClose's
    // preamble, before this even ran — so by now the cube is just sitting
    // there, a cube, at whatever size its image cell was. All that is left to
    // wait on is the content finishing its own exit (aboutLinesOutAt) plus the
    // grid's lines sliding back out behind it (ARRIVE_MS, the span they took
    // coming in) — the cube's own trip home, `returning`, shrinks it back to
    // its column's size as it flies, exactly as it already does for every
    // section.
    const flightDelay = isGrid ? aboutLinesOutAt + ARRIVE_MS : wordsGone;

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
        // Stale otherwise for whichever section opens next — a fill target only
        // About ever sets, but nothing else ever clears.
        rr.target.dockFillWidth = null;
        rr.target.dockFillHeight = null;
        openedRef.current = null;
        // A click without an intervening move must not reopen the column it just left.
        hovered.current = -1;
      }, SHUTTER_MS);
    }, flightDelay);
  };

  // What the [ X ] and Escape actually call.
  //
  // A grid section: a preamble, not a mirror of arriving — the image fades out
  // first (revealing the liquid it was sitting over), then the cube
  // re-crystallises on top of that liquid, and only once both have had time to
  // read does the standard close sequence below begin. Everything after that
  // preamble (title/content leaving, the grid's lines, the flight home) really
  // is the same sequence Contact runs, just entered from a cube that is
  // already sitting there rather than one still mid-shrink.
  //
  // Contact: the reverse of arriving, beat for beat — the [ X ] fades out
  // first, then the cube grows back from the dock point it shrank into.
  // Caught before it has even parked (mid-flight in, or mid-shrink before the
  // [ X ] itself has shown), there is nothing on screen to wait out, so this
  // skips straight to close().
  const requestClose = () => {
    if (opened === null || closing) return;
    if (arriveTimer.current) clearTimeout(arriveTimer.current);
    if (crossTimer.current) clearTimeout(crossTimer.current);
    if (stageTimer.current) clearTimeout(stageTimer.current);

    if (GRID_SECTIONS.has(COLUMNS[opened])) {
      setImageVisible(false);
      stageTimer.current = setTimeout(() => {
        const r = renderer.current;
        if (r) {
          // Clearing the fill target here, the same moment it re-crystallises,
          // is what shrinks it back to the small docked-cube size rather than
          // re-crystallising at the full size it was just filling the cell at
          // — `eased.unit` eases toward `dock.unit` once dockFillWidth is gone,
          // the same smooth shrink SHRINK_MS used to be a CSS transition for.
          r.target.dockFillWidth = null;
          r.target.dockFillHeight = null;
          r.target.crystal = true;
          r.wake();
        }
        stageTimer.current = setTimeout(close, FILL_MS);
      }, IMAGE_FADE_MS);
      return;
    }

    if (!parked) {
      close();
      return;
    }

    const wasShown = crossVisible;
    setCrossVisible(false);
    stageTimer.current = setTimeout(() => {
      setParked(false);
      stageTimer.current = setTimeout(close, SHRINK_MS);
    }, wasShown ? CROSS_FADE_MS : 0);
  };

  useEffect(() => {
    if (opened === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        requestClose();
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [opened, closing, parked, crossVisible]);

  useEffect(() => {
    return () => {
      if (stageTimer.current) clearTimeout(stageTimer.current);
      if (arriveTimer.current) clearTimeout(arriveTimer.current);
      if (crossTimer.current) clearTimeout(crossTimer.current);
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
    const isGrid = GRID_SECTIONS.has(COLUMNS[hovered.current]);
    setOpened(hovered.current);
    // A section always opens on its first entry, and on it already: the counter mounts
    // with its strips already wound to it and nothing to transition from. It simply
    // appears with the title it sits on, like the rest of the block — the turn-over is
    // for a change of entry, and arriving is not one.
    setEntry({ index: 0, reel: reelStart(0) });
    setTextIndex(0);
    at.current = 0;
    want.current = 0;
    // In case a previous visit left it hidden from the close preamble below.
    if (isGrid) setImageVisible(true);
    r.wake();
    if (stageTimer.current) clearTimeout(stageTimer.current);
    stageTimer.current = setTimeout(() => {
      // The image cell has been mounted (by SpecSheetGrid, rendered the
      // instant `opened` was set above) for the whole SHUTTER_MS the shutters
      // just took to clear — plenty of time for it to have laid out, so the
      // flight about to start already has the right target instead of
      // snapping to it mid-flight.
      if (isGrid) remeasure.current?.();
      if (renderer.current) renderer.current.target.docked = true;
      if (arriveTimer.current) clearTimeout(arriveTimer.current);
      arriveTimer.current = setTimeout(() => {
        const rr = renderer.current;
        if (isGrid) {
          // Arrived as a small cube at the image cell's centre; now it
          // un-crystallises and grows to fill that cell, in place — see
          // dockFillWidth/Height's own comment on the renderer target for why
          // this isn't just `active` pointed at the cell instead.
          const cell = getImageCellRect();
          if (rr && cell) {
            rr.target.dockFillWidth = cell.width;
            rr.target.dockFillHeight = cell.height;
          }
          if (rr) {
            rr.target.crystal = false;
            rr.wake();
          }
        } else {
          setParked(true);
          if (crossTimer.current) clearTimeout(crossTimer.current);
          crossTimer.current = setTimeout(() => setCrossVisible(true), SHRINK_MS);
        }
      }, ARRIVE_MS);
    }, SHUTTER_MS);
  };

  // The section is open and staying open: the cube is parked in the corner, so the
  // title and the way back out belong on screen. False the instant it sets off home.
  const settled = opened !== null && !closing;
  /** When the title's first letter starts typing. A grid section waits for the
      cube to have arrived at its image cell (SHUTTER_MS + ARRIVE_MS) *and*
      finished growing to fill it (FILL_MS) — the image itself fades in on
      this same beat, over the liquid that fill just finished revealing.
      Contact has no cell to wait on, so it keeps the fixed TYPE_START beat. */
  const titleStartAt =
    GRID_SECTIONS.has(label) ? SHUTTER_MS + ARRIVE_MS + FILL_MS : TYPE_START;
  /** When the last letter of the title has landed, and when the rest follows it. */
  const typedAt = titleStartAt + Math.max(0, label.length - 1) * TYPE_STEP;
  const restAt = typedAt + REST_GAP;
  /** How long the About grid's content fade has to run so that it starts the
      instant the title's first letter does (titleStartAt) and finishes the instant
      the title's last letter — and its aside, which lands on the same beat — are
      fully in. Depends on the label's own length, same as typedAt does. */
  const aboutContentInDuration = typedAt + TYPE_LETTER_MS - titleStartAt;
  // The same figure SpecSheetGrid computes for its own "titleSpace" track — the
  // reserved row between the margin line and the first rule under the title. Centring
  // the title in exactly this height, rather than pinning it to a top offset, is what
  // `titleTop` actually moves: not the title's own position, but how much of this
  // row is above it versus below.
  const titleSpace =
    layoutValues.titleTop + TITLE_LINE - layoutValues.marginTop - 1;

  /** The aside on the title's own baseline. A list says which entry of how many; About
      introduces the person whose page this is, and Contact invites the reason for being
      there. Different sentences, but the same mark in the same place — so they are one
      element with one set of type, and a section named nowhere simply has none. */
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
    ) : (
      (PHRASE[COLUMNS[opened]] ?? null)
    );

  /** The strip of photographs, laid out from `--p`. The alt text belongs to the picture
      that is actually being shown, so only that one carries it. */
  const strip = (items: Entry[]) =>
    items.map((item, i) => (
      <div key={i} className="frame-layer" style={{ "--i": i } as React.CSSProperties}>
        <Image
          src={item.image}
          alt={i === entry.index ? item.imageAlt : ""}
          fill
          sizes={IMAGE_SIZES}
          placeholder="blur"
          className="object-cover"
        />
      </div>
    ));

  /**
   * The entry the words are on.
   *
   * Clamped rather than indexed straight. `textIndex` outlives the section that set it —
   * it is reset in `open()`, batched with `opened`, so no render should ever see it point
   * past the shorter list — but the lists are no longer the same length, and the cost of
   * being wrong about that is reading `.summary` off nothing.
   */
  const shown = entries?.[Math.min(textIndex, entries.length - 1)];

  /** Wraps one row of an Experience/Projects entry block (subtitle, body, or
      links) in the same two mechanisms every such row needs: the outer leaves
      and arrives with the section (`arrive`/`depart`), the inner fades on the
      scroll position between entries (`entry-fade`, off `textIndex`/`--ti`).
      They cannot share an element with each other — a CSS animation with
      fill-mode `both` holds its last frame and would win over the inline
      opacity the exit needs — so each of the three rows gets its own copy. */
  const entryBlock = (content: React.ReactNode) => (
    <div
      className={closing ? "depart" : "arrive"}
      style={{ animationDelay: closing ? "0ms" : `${restAt}ms` }}
    >
      <article
        className="entry-fade"
        style={{ "--ti": textIndex } as React.CSSProperties}
      >
        {content}
      </article>
    </div>
  );

  const isGrid = GRID_SECTIONS.has(label);
  /** A grid section's [ X ] runs on the exact same clock prose1/prose2/legend
      do (see SpecSheetGrid's own content-fade-in/out) — a `mark`, so it needs
      its own copy of that treatment rather than reusing content-fade-in/out's
      className, since it isn't one of SpecSheetGrid's children. Contact keeps
      the crossVisible/CROSS_FADE_MS opacity it always has, since it has no
      content clock to share. */
  const crossClassName = `${
    isGrid ? (closing ? "content-fade-out " : "content-fade-in ") : ""
  }mark pointer-events-auto absolute font-mono text-[10px] tracking-[0.2em] text-neutral-400 transition-colors duration-200 hover:text-neutral-900 sm:text-xs`;
  const crossStyle: React.CSSProperties = isGrid
    ? {
        // The title-relative point, not `dock` — the cube itself now docks on
        // the image cell, but the [ X ] stays where every section's used to
        // sit, top right by the title.
        left: titleDock.x,
        top: titleDock.y,
        transform: "translate(-50%, -50%)",
        animationDelay: `${closing ? aboutContentOutAt : titleStartAt}ms`,
        animationDuration: `${
          closing ? aboutContentOutDuration : aboutContentInDuration
        }ms`,
        pointerEvents: settled ? "auto" : "none",
      }
    : {
        left: dock.x,
        top: dock.y,
        transform: "translate(-50%, -50%)",
        opacity: crossVisible ? 1 : 0,
        transition: `opacity ${CROSS_FADE_MS}ms linear, color 200ms linear`,
        pointerEvents: crossVisible ? "auto" : "none",
      };
  const crossTabIndex = isGrid
    ? settled
      ? undefined
      : -1
    : crossVisible
      ? undefined
      : -1;

  return (
    <main
      ref={mainRef}
      className="relative h-dvh w-full overflow-hidden bg-white"
    >
      {/* Every section but About: shrinks into the dock point once the cube has
          actually parked, the [ X ] taking its place there — and grows back out
          of that same point once `requestClose` needs it full size again to fly
          home. Scaled about `dock.x`/`dock.y` rather than faded, so the cube
          visibly collapses to the spot the [ X ] then occupies instead of just
          vanishing in place. About never sets `parked`, so this stays at
          `scale(1)` for it the whole time the canvas is doing something else
          entirely (growing in place to fill the portrait cell — see `open`). */}
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{
          transformOrigin: `${dock.x}px ${dock.y}px`,
          // A literal 0 is a singular matrix — animating away from it has a stall
          // baked into Chrome's own matrix interpolation, so growing back out never
          // matched the smooth shrink that got it there. 0.0001 is invisible but
          // keeps the matrix invertible, which is all the transition needs.
          transform: parked ? "scale(0.0001)" : "scale(1)",
          transition: `transform ${SHRINK_MS}ms cubic-bezier(0.65, 0, 0.35, 1)`,
        }}
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
                <h2 className="text-4xl font-medium tracking-tight text-neutral-900 sm:text-6xl">
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
      {/* About, "spec sheet" layout: one unified CSS grid (SpecSheetGrid) owns
          every margin, rule, and content cell — see
          docs/superpowers/specs/2026-08-07-about-lab-unified-grid-design.md. Mounted
          as a sibling of the title container below (not nested inside it): it is
          `position: absolute; inset: 0`, sized against `<main>`, and the title
          container's own box has no fixed height for it to size against instead. */}
      {opened !== null && COLUMNS[opened] === "About" && (
        <SpecSheetGrid
          columns={3}
          closing={closing}
          linesInAt={GRID_LINES_AT}
          linesOutAt={aboutLinesOutAt}
          contentInAt={titleStartAt}
          contentInDuration={aboutContentInDuration}
          contentOutAt={aboutContentOutAt}
          contentOutDuration={aboutContentOutDuration}
          imageVisible={imageVisible}
          imageFadeMs={IMAGE_FADE_MS}
          imageCellRefSm={(el) => {
            imageCellSm.current = el;
          }}
          imageCellRefXl={(el) => {
            imageCellXl.current = el;
          }}
          values={layoutValues}
          prose1={
            <>
              {leading(null)}
              <p className={`mt-8 sm:mt-10 ${PROSE}`}>{ABOUT_PLACEHOLDER[0]}</p>
            </>
          }
          image={
            <Image
              src={portrait}
              alt="Portrait de Marie Vachelard, en noir et blanc"
              fill
              sizes="33vw"
              placeholder="blur"
              className="object-cover"
            />
          }
          prose2={
            <>
              {leading(null)}
              <p className={`mt-8 sm:mt-10 ${PROSE}`}>{ABOUT_PLACEHOLDER[1]}</p>
            </>
          }
          legend={mark({
            href: "https://www.toulouse-tourisme.com/",
            label: "N 43.60079° / E 1.35044°",
            settled,
            centred: true,
          })}
        />
      )}

      {/* Experience/Projects, the same "spec sheet" grid as About but in its
          2-column mode: one prose column and an image cell that keeps the
          width a third column would otherwise take at `xl`. The image cell
          hosts the same drag/scroll photo strip as before (`strip(entries)`),
          now filling the cell edge-to-edge (`object-cover`) instead of a fixed
          3:4 frame — the cube's fill-in-place treatment only reads right
          against a cell it actually fills. Mounted as a sibling of the title
          container for the same reason About's grid is. */}
      {entries && shown && (
        <SpecSheetGrid
          columns={2}
          closing={closing}
          linesInAt={GRID_LINES_AT}
          linesOutAt={aboutLinesOutAt}
          contentInAt={titleStartAt}
          contentInDuration={aboutContentInDuration}
          contentOutAt={aboutContentOutAt}
          contentOutDuration={aboutContentOutDuration}
          imageVisible={imageVisible}
          imageFadeMs={IMAGE_FADE_MS}
          imageCellRefSm={(el) => {
            imageCellSm.current = el;
          }}
          imageCellRefXl={(el) => {
            imageCellXl.current = el;
          }}
          values={layoutValues}
          // subtitle/body/links are three separate grid rows now (see
          // SpecSheetGrid's own prop comments), so each needs its own copy of
          // the same two wrappers every entry block used to share: the outer
          // one leaves/arrives with the section, the inner one fades on the
          // scroll position — see the equivalent comment this replaced for why
          // they cannot share an element with each other, and now cannot
          // share one with their neighbouring row either.
          subtitle={entryBlock(leading(shown))}
          body={entryBlock(<p className={PROSE}>{shown.summary}</p>)}
          links={
            shown.links &&
            entryBlock(
              <p className="flex gap-6">
                {shown.links.map((link) => mark({ ...link, settled }))}
              </p>,
            )
          }
          image={strip(entries)}
          legend={null}
        />
      )}

      {/* The title container's left/right come from the layout values
          (marginLeft/marginRight) rather than static classes, applied at every width.
          Its own top is pinned right after the top margin line (marginTop + 1) rather
          than at titleTop directly — the title row just inside it (below) is what
          titleTop positions, by centring within titleSpace. */}
      <div
        aria-hidden={!settled}
        className="pointer-events-none absolute"
        style={{
          left: layoutValues.marginLeft,
          right: layoutValues.marginRight,
          top: layoutValues.marginTop + 1,
        }}
      >
        {/* Width 100%, an 8px inline padding, and vertical centring in titleSpace —
            the same treatment the prose columns got, applied to the title row below.
            A separate wrapper from that row itself: the row's own flex (items-baseline)
            aligns the h1 and the aside on one baseline, which `alignItems: center`
            here must not override — the two flex containers do different jobs. */}
        <div
          style={{
            width: "100%",
            height: titleSpace,
            padding: "0 8px",
            display: "flex",
            alignItems: "center",
          }}
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
                      ? `${titleUnwindStartAt + (label.length - 1 - i) * UNTYPE_STEP}ms`
                      : `${titleStartAt + i * TYPE_STEP}ms`,
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
        </div>

        {/* Contact: a line of prose and the three ways to reach her.

            The same reserved height as the grid sections' own prose1 used to share
            (`BLOCK_H`, `mt-12 sm:mt-16`) — Contact never moved into the grid, so it
            keeps the layout that figure was sized for — and the same empty name and
            dates reserved above the prose that a grid section's leading(shown) has a
            real one for. That is what puts this section's first line on the line the
            other three start on, so nothing shifts vertically as you move between
            them. It is the only reason `leading(null)` is here: there is no name and
            no date to show, only a height to hold.

            48 characters, the measure an Experience summary reads at — Contact never
            had a photograph to keep a long line clear of, so it never needed the
            `44vw` clamp Experience/Projects' own prose used to carry either.

            The row of marks is the projects' row: same `mt-8`, same `gap-6`, same type. */}
        {opened !== null && COLUMNS[opened] === "Contact" && (
          <div className="mt-12 sm:mt-16" style={{ minHeight: BLOCK_H }}>
            <div
              className={closing ? "depart" : "arrive"}
              style={{ animationDelay: closing ? "0ms" : `${restAt}ms` }}
            >
              {leading(null)}
              <p className={`mt-8 max-w-[48ch] sm:mt-10 ${PROSE}`}>
                {CONTACT.prose}
              </p>
              <p className="mt-8 flex gap-6">
                {CONTACT.links.map((link) => mark({ ...link, settled }))}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* The way back out, plus Escape. `dock.x`/`dock.y` rather than a fixed
          inset, so it follows the cube's own dock position (see
          blobRenderer's dockGeometry) instead of drifting off it —
          for About that dock is now the portrait cell's own centre, so this
          sits over the portrait rather than beside the title.

          About runs it on the content's own clock (see crossClassName/Style
          above); every other section keeps its own crossVisible-driven fade,
          timed off the cube instead.

          The same bracketed mark every other link on the page is, so the letters
          spread apart at rest and close up under the pointer like [ Visit ] does —
          `mark` itself isn't reused because this is an action, not a destination. */}
      <button
        type="button"
        onClick={requestClose}
        aria-label="Close"
        tabIndex={crossTabIndex}
        className={crossClassName}
        style={crossStyle}
      >
        <span aria-hidden className="mark-sizer">
          [ X ]
        </span>
        <span className="mark-label">[ X ]</span>
      </button>
    </main>
  );
}
