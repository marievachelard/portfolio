# About Lab "Spec Sheet" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/about-lab`, a full clone of the single-page site where only the opened About section gets a new "spec sheet" layout (visible ruled grid, enlarged hachured portrait, cube docked top-right), while Home and every other section behave exactly as they do today.

**Architecture:** Two files are duplicated verbatim first (`LiquidColumns.tsx` → `SpecSheetColumns.tsx`, `blobRenderer.ts` → `specSheetBlobRenderer.ts`) and mounted on a new route, so the baseline is byte-for-byte identical to the current site before any redesign starts. From there, `specSheetBlobRenderer.ts` gets one one-line change (dock corner), and `SpecSheetColumns.tsx` gets its cube hit-area moved and its About-block JSX replaced. A new `SpecSheetGrid` component draws the ruled frame, gated to render only while About is open. The title row (`About` + `[ Hi, I'm Marie ]`) already renders exactly as the wireframe wants — it is shared markup one level up from the About block, used by every section, and needs no task of its own.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind v4 (utility classes + the `--rule: #dedede` CSS variable already defined in `globals.css`), TypeScript, WebGL2 (existing shader, untouched).

## Global Constraints

- Do not modify `src/components/LiquidColumns.tsx`, `src/lib/blobRenderer.ts`, `src/lib/blobShader.ts`, or any existing route. Every change lives in new files.
- Reuse existing content verbatim: `PHRASE.About` (`"[ Hi, I'm Marie ]"`), `ABOUT_PLACEHOLDER[0]`/`[1]`, the portrait `@/images/about/marie-vachelard.jpg`, and the coordinate mark `"N 43.60079° / E 1.35044°"`. No new copy.
- Grid lines use `var(--rule)` (`#dedede`, already defined once in `src/app/globals.css:8`) — no new color token.
- No test framework exists in this project (no Jest/Vitest/Playwright — confirmed via `package.json`). Verification per task is: `node_modules/.bin/eslint .`, `node_modules/.bin/next build`, and a manual check in the browser. `pnpm`/`corepack` are not on PATH in this environment — call `node_modules/.bin/<tool>` directly, never bare `pnpm`/`next`/`eslint`.
- Dev server for manual checks: `node_modules/.bin/next dev` (default `http://localhost:3000`).

---

### Task 1: Clone the page verbatim onto `/about-lab`

**Files:**
- Create: `src/lib/specSheetBlobRenderer.ts` (verbatim copy of `src/lib/blobRenderer.ts`)
- Create: `src/components/SpecSheetColumns.tsx` (copy of `src/components/LiquidColumns.tsx`, renamed export, import path swapped)
- Create: `src/app/about-lab/page.tsx`

**Interfaces:**
- Produces: `export function SpecSheetColumns()` — a React component, same signature/behavior as `LiquidColumns()`, mounted by the new route.
- Produces: `specSheetBlobRenderer.ts` re-exports the same names as `blobRenderer.ts`: `createBlobRenderer`, `dockGeometry`, `type BlobRenderer`, `type BlobTarget`.

- [ ] **Step 1: Create the branch**

```bash
git checkout -b about-lab
```

- [ ] **Step 2: Copy the renderer verbatim**

```bash
cp src/lib/blobRenderer.ts src/lib/specSheetBlobRenderer.ts
```

No edits yet — this step only proves the duplication compiles cleanly before Task 2 touches it.

- [ ] **Step 3: Copy the page component and repoint its renderer import**

```bash
cp src/components/LiquidColumns.tsx src/components/SpecSheetColumns.tsx
```

In `src/components/SpecSheetColumns.tsx`, change the import (originally at line 5-9):

```ts
import {
  createBlobRenderer,
  dockGeometry,
  type BlobRenderer,
} from "@/lib/blobRenderer";
```

to:

```ts
import {
  createBlobRenderer,
  dockGeometry,
  type BlobRenderer,
} from "@/lib/specSheetBlobRenderer";
```

Then rename the exported function (originally at line 456):

```ts
export function LiquidColumns() {
```

to:

```ts
export function SpecSheetColumns() {
```

- [ ] **Step 4: Create the route**

Create `src/app/about-lab/page.tsx`:

```tsx
import { SpecSheetColumns } from "@/components/SpecSheetColumns";

export default function AboutLab() {
  return <SpecSheetColumns />;
}
```

- [ ] **Step 5: Verify the clone builds and behaves identically to Home**

```bash
node_modules/.bin/eslint src/lib/specSheetBlobRenderer.ts src/components/SpecSheetColumns.tsx src/app/about-lab/page.tsx
node_modules/.bin/next build
```

Expected: both commands exit 0, no new errors or warnings attributable to the new files.

Then run `node_modules/.bin/next dev`, open `http://localhost:3000/about-lab`, and confirm: the Hero and all four columns render exactly as on `http://localhost:3000/`, clicking About plays the same cube-flight/shutters sequence, docks in the top-left corner (unchanged at this point — Task 2 moves it), and shows the current small-portrait About layout unchanged. This is the baseline every later task's diff is judged against.

- [ ] **Step 6: Commit**

```bash
git add src/lib/specSheetBlobRenderer.ts src/components/SpecSheetColumns.tsx src/app/about-lab/page.tsx
git commit -m "Clone the site onto /about-lab as a baseline for the spec-sheet About redesign"
```

---

### Task 2: Dock the cube top-right

**Files:**
- Modify: `src/lib/specSheetBlobRenderer.ts`
- Modify: `src/components/SpecSheetColumns.tsx`

**Interfaces:**
- Consumes: `dockGeometry(cssW: number, cssH: number): { x: number; y: number; unit: number; reach: number }` from Task 1.
- Produces: same signature, `x` now measured from the right edge instead of the left. Every caller (`frame()` internally, and `SpecSheetColumns.tsx`'s `dock` state) keeps reading `dock.x`/`dock.y` as absolute page coordinates — no caller-side signature change.

- [ ] **Step 1: Change the dock corner in the cloned renderer**

In `src/lib/specSheetBlobRenderer.ts`, find `dockGeometry` (originally at line 111-119):

```ts
export function dockGeometry(cssW: number, cssH: number) {
  const unit = Math.min(DOCK_UNIT, cssW * 0.13);
  const reach = unit * CUBE_HALF * 1.45;
  const inset = Math.max(
    reach + 14,
    Math.min(DOCK_INSET, cssW * 0.16, cssH * 0.16),
  );
  return { x: inset, y: inset, unit, reach };
}
```

Change the return statement only:

```ts
export function dockGeometry(cssW: number, cssH: number) {
  const unit = Math.min(DOCK_UNIT, cssW * 0.13);
  const reach = unit * CUBE_HALF * 1.45;
  const inset = Math.max(
    reach + 14,
    Math.min(DOCK_INSET, cssW * 0.16, cssH * 0.16),
  );
  // Docks top-right on this page instead of top-left — everything else about
  // the geometry (unit, reach, vertical inset) is unchanged.
  return { x: cssW - inset, y: inset, unit, reach };
}
```

- [ ] **Step 2: Move the cube's hit area to the right edge**

In `src/components/SpecSheetColumns.tsx`, find the close/hover hit-area button (originally at line 1256-1267):

```tsx
<button
  type="button"
  onClick={close}
  onPointerEnter={() => hoverCube(true)}
  onPointerLeave={() => hoverCube(false)}
  aria-label="Close"
  className="absolute left-0 top-0 h-40 w-40"
  style={{ pointerEvents: settled ? "auto" : "none" }}
/>
```

Change `left-0` to `right-0`:

```tsx
<button
  type="button"
  onClick={close}
  onPointerEnter={() => hoverCube(true)}
  onPointerLeave={() => hoverCube(false)}
  aria-label="Close"
  className="absolute right-0 top-0 h-40 w-40"
  style={{ pointerEvents: settled ? "auto" : "none" }}
/>
```

- [ ] **Step 3: Verify**

```bash
node_modules/.bin/eslint src/lib/specSheetBlobRenderer.ts src/components/SpecSheetColumns.tsx
node_modules/.bin/next build
```

Then in the browser at `/about-lab`: open any section (About, Experience, Projects, or Contact) and confirm the cube flies to and parks in the top-right corner (not top-left), the `[ CLOSE ]` label still appears directly above it on hover, and clicking still closes the section. Confirm `/` (Home) is unaffected — the cube there still docks top-left.

- [ ] **Step 4: Commit**

```bash
git add src/lib/specSheetBlobRenderer.ts src/components/SpecSheetColumns.tsx
git commit -m "Dock the about-lab cube top-right instead of top-left"
```

---

### Task 3: Add the `SpecSheetGrid` ruled frame

**Files:**
- Create: `src/components/SpecSheetGrid.tsx`
- Modify: `src/components/SpecSheetColumns.tsx`

**Interfaces:**
- Produces: `export function SpecSheetGrid()` — a presentational component with no props, rendering an absolutely-positioned, `pointer-events-none`, `aria-hidden` ruled frame (outer rectangle plus vertical column dividers) sized to match the About content block's own insets. Task 4 relies on this for the vertical rules only — it separately adds the horizontal title/content and content/legend rules as borders directly on the content wrapper and legend paragraph, so every rule shares one exact width without the two components duplicating each other's insets.

- [ ] **Step 1: Create `SpecSheetGrid.tsx`**

```tsx
/**
 * The ruled frame the About section draws around itself once opened — the
 * "spec sheet" grid. Outer rectangle plus the vertical column dividers; the
 * horizontal title/content and content/legend rules are borders on the
 * content itself (see SpecSheetColumns.tsx), so every rule shares the same
 * width without this component having to know the content's exact height.
 */
export function SpecSheetGrid() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-5 right-5 top-24 bottom-6 sm:left-10 sm:right-10 sm:top-28 sm:bottom-8"
      style={{ border: "1px solid var(--rule)" }}
    >
      <div className="grid h-full grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        <div />
        <div className="hidden border-l sm:block" style={{ borderColor: "var(--rule)" }} />
        <div className="hidden border-l xl:block" style={{ borderColor: "var(--rule)" }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Mount it, gated to About only**

In `src/components/SpecSheetColumns.tsx`, add the import near the top (after the `portrait` import, originally line 19):

```ts
import { SpecSheetGrid } from "@/components/SpecSheetGrid";
```

Then find the closing tag of the title container (originally at line 1188):

```tsx
      </div>

      {/* The entry's image, opposite its text: ...
```

Insert the gated grid between them:

```tsx
      </div>

      {opened !== null && COLUMNS[opened] === "About" && <SpecSheetGrid />}

      {/* The entry's image, opposite its text: ...
```

- [ ] **Step 3: Verify**

```bash
node_modules/.bin/eslint src/components/SpecSheetGrid.tsx src/components/SpecSheetColumns.tsx
node_modules/.bin/next build
```

Then in the browser at `/about-lab`: open About and confirm a thin grey rectangle with 1-2 internal vertical dividers (depending on window width) appears around the content area; confirm it is absent on Hero and on Experience/Projects/Contact.

- [ ] **Step 4: Commit**

```bash
git add src/components/SpecSheetGrid.tsx src/components/SpecSheetColumns.tsx
git commit -m "Add the spec-sheet ruled frame, shown only while About is open"
```

---

### Task 4: Rewrite the About content block

**Files:**
- Modify: `src/components/SpecSheetColumns.tsx`

**Interfaces:**
- Consumes: `SpecSheetGrid` (Task 3), `leading`, `PROSE`, `ABOUT_PLACEHOLDER`, `mark`, `BLOCK_H`, `ABOUT_BLOCK_H`, `portrait`, `closing`, `restAt`, `settled` — all already defined earlier in this same file, unchanged.

- [ ] **Step 1: Replace the About block**

In `src/components/SpecSheetColumns.tsx`, find the whole About block (originally lines 1049-1156, from the `{/* About: two columns of prose...` comment through its closing `)}`):

```tsx
        {/* About: two columns of prose with the portrait between them.
            ...
        {opened !== null && COLUMNS[opened] === "About" && (
          <div className="mt-12 sm:mt-16" style={{ minHeight: BLOCK_H }}>
            <div
              className={`${closing ? "depart" : "arrive"} flex flex-col`}
              style={{
                animationDelay: closing ? "0ms" : `${restAt}ms`,
                minHeight: ABOUT_BLOCK_H,
              }}
            >
              <div className="grid grid-cols-1 gap-10 sm:grid-cols-[1fr_auto] xl:grid-cols-[1fr_auto_1fr]">
                <div className="max-w-[42ch]">
                  {leading(null)}
                  <p className={`mt-8 sm:mt-10 ${PROSE}`}>{ABOUT_PLACEHOLDER[0]}</p>
                </div>

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

                <div className="ml-auto hidden max-w-[42ch] xl:block">
                  {leading(null)}
                  <p className={`mt-8 sm:mt-10 ${PROSE}`}>{ABOUT_PLACEHOLDER[1]}</p>
                </div>
              </div>

              <p className="mt-auto pt-10 text-center">
                {mark({
                  href: "https://www.toulouse-tourisme.com/",
                  label: "N 43.60079° / E 1.35044°",
                  settled,
                  centred: true,
                })}
              </p>
            </div>
          </div>
        )}
```

with:

```tsx
        {/* About, "spec sheet" layout: three equal columns (prose, portrait,
            prose) inside a ruled frame (SpecSheetGrid, mounted just outside
            this title container). The horizontal rules — under the title,
            and above the coordinates — are borders on this block's own
            wrapper and on the legend paragraph, so they always span exactly
            the same width as the frame around them, whatever the content's
            height turns out to be. */}
        {opened !== null && COLUMNS[opened] === "About" && (
          <div className="mt-12 sm:mt-16" style={{ minHeight: BLOCK_H }}>
            <div
              className={`${closing ? "depart" : "arrive"} flex flex-col border-t`}
              style={{
                animationDelay: closing ? "0ms" : `${restAt}ms`,
                minHeight: ABOUT_BLOCK_H,
                borderColor: "var(--rule)",
              }}
            >
              <div className="grid grid-cols-1 gap-10 pt-10 sm:grid-cols-[1fr_1fr] xl:grid-cols-[1fr_1fr_1fr]">
                <div
                  className="max-w-[42ch] sm:border-r sm:pr-10"
                  style={{ borderColor: "var(--rule)" }}
                >
                  {leading(null)}
                  <p className={`mt-8 sm:mt-10 ${PROSE}`}>{ABOUT_PLACEHOLDER[0]}</p>
                </div>

                {/* Fills its column instead of sitting in a fixed small
                    square: this is the wireframe's centre block. The
                    diagonal hachure is drawn over the portrait rather than
                    replacing it — it reads as a placeholder-image treatment
                    even though the picture behind it is real. */}
                <div
                  className="relative hidden aspect-square self-start sm:block xl:border-r xl:pr-10"
                  style={{ borderColor: "var(--rule)", maxHeight: "min(55vh, 30vw)" }}
                >
                  <Image
                    src={portrait}
                    alt="Portrait de Marie Vachelard, en noir et blanc"
                    fill
                    sizes="33vw"
                    placeholder="blur"
                    className="object-cover"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(45deg, var(--rule) 0, var(--rule) 1px, transparent 1px, transparent 10px)",
                    }}
                  />
                </div>

                <div className="ml-auto hidden max-w-[42ch] xl:block">
                  {leading(null)}
                  <p className={`mt-8 sm:mt-10 ${PROSE}`}>{ABOUT_PLACEHOLDER[1]}</p>
                </div>
              </div>

              <p
                className="mt-auto border-t pt-10 text-center"
                style={{ borderColor: "var(--rule)" }}
              >
                {mark({
                  href: "https://www.toulouse-tourisme.com/",
                  label: "N 43.60079° / E 1.35044°",
                  settled,
                  centred: true,
                })}
              </p>
            </div>
          </div>
        )}
```

- [ ] **Step 2: Verify it builds**

```bash
node_modules/.bin/eslint src/components/SpecSheetColumns.tsx
node_modules/.bin/next build
```

- [ ] **Step 3: Visual check against the wireframe**

Run `node_modules/.bin/next dev`, open `http://localhost:3000/about-lab`, click About, and check at three widths (resize the window or use devtools device toolbar): a wide desktop size (≥1280px), a mid width (768-1024px), and a narrow one (<640px).

Confirm, at ≥1280px (three columns): the frame and its two internal vertical dividers are visible; a rule sits directly under the title/subtitle and another directly above the coordinates; the portrait fills the centre column with a visible diagonal hachure over it; both prose blocks sit either side of it; the layout resembles the wireframe's proportions (title top-left, cube top-right inside the frame, three roughly-equal columns below).

Confirm, between 640px and 1280px (two columns): only the left prose and the portrait show, one internal divider, second prose hidden — matching how the current site already collapses this width (this part is unchanged from the original About behavior, just resized).

Confirm, below 640px (one column): only the left prose shows, no dividers (the frame itself may also be tight — check it does not visually clip against the title or coordinates; if it does, note it, this is the kind of thing to fix by hand once seen live rather than something to predict on paper).

If the hachured portrait's `maxHeight: "min(55vh, 30vw)"` cap makes it look too small or too large at any of these widths, adjust the two numbers directly in the style and recheck — this value was chosen to keep the block from overflowing the one-viewport-tall page, not measured against a specific target size.

- [ ] **Step 4: Commit**

```bash
git add src/components/SpecSheetColumns.tsx
git commit -m "Redesign the about-lab About block as a three-column spec sheet"
```

---

### Task 5: Full-flow regression check and cleanup

**Files:** none (verification only, plus removing the port-forward/dev artifacts if any were left behind)

- [ ] **Step 1: Full lint and build**

```bash
node_modules/.bin/eslint .
node_modules/.bin/next build
```

Expected: clean exit on both, no errors or warnings anywhere in the repo (not just the new files) — confirms nothing on `main`'s side regressed.

- [ ] **Step 2: Side-by-side manual check**

With `node_modules/.bin/next dev` running, open `/` and `/about-lab` in two tabs.

- Home hero: identical between the two.
- Click Experience on both: identical entry list, photos, drag-scroll behaviour, and links — cube docks top-left on `/`, top-right on `/about-lab` (expected, see Task 2), everything else the same.
- Click Projects on both: same check.
- Click Contact on both: same check.
- Click About on `/`: unchanged, small-portrait two-column layout, cube top-left, no grid lines.
- Click About on `/about-lab`: the new spec-sheet layout from Task 4, cube top-right, grid lines visible.
- Press Escape and click the cube's hit area on both `/` and `/about-lab` to confirm closing still returns cleanly to the grid (words unwind, cube flies home, shutters return) in both.

- [ ] **Step 3: Confirm branch state**

```bash
git status
git log --oneline main..about-lab
```

Expected: working tree clean, and the log shows exactly the four commits from Tasks 1-4 (plus any fix-up commits from Task 4 Step 3 adjustments).

No commit in this task — it is verification only. If Step 2 surfaces a problem, fix it under whichever earlier task it belongs to and re-run that task's own verification before returning here.
