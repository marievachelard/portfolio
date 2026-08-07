# About Lab — "Spec Sheet" About page

## Purpose

Try an alternative art direction for the About section — a visible technical-drawing grid ("spec sheet") — without touching the current site. Built as a full clone of the existing single-page experience on a new route, so the Home → About transition (cube flight, shutters) stays exactly as it is today. Only the About section's *opened* content is redesigned.

This is an experiment (`about-lab` branch, `/about-lab` route), not a replacement. It may be discarded, or later merged back into the main About section once the layout is validated.

## Non-goals

- No change to `LiquidColumns.tsx`, `blobRenderer.ts`, `blobShader.ts`, the Home page, or any other existing route or file.
- No new copy: the About prose stays the existing placeholder (`ABOUT_PLACEHOLDER`), acknowledged as provisional.
- Hero and the Experience / Projects / Contact columns keep their current content and layout on `/about-lab` — grid lines and the new About layout apply to the About section only. (The cube's dock corner is a page-wide exception — see "Cube dock corner" below.)

## Approach

### File / route strategy

- New branch `about-lab` off `main`.
- Duplicate `src/components/LiquidColumns.tsx` → `src/components/SpecSheetColumns.tsx`. This copy owns all the existing state machine (scroll, column open/close, cube dock/return, shutters) unchanged.
- New route `src/app/about-lab/page.tsx` renders `<SpecSheetColumns />`.
- Only the JSX block that renders the opened About section (currently `LiquidColumns.tsx` lines ~1075–1156) is rewritten inside the copy. Every other section (Hero, Experience, Projects, Contact) and every shared helper (`leading`, `BLOCK_H`, `ABOUT_BLOCK_H`, `PROSE`, `mark`, the cube's dock/hover wiring) stays as-is, since the copy still needs them for its unchanged sections.
- The portrait image (`@/images/about/marie-vachelard.jpg`) and the shader (`@/lib/blobShader.ts`) are imported, not duplicated — neither needs to change.
- `src/lib/blobRenderer.ts` is **also duplicated**, to `src/lib/specSheetBlobRenderer.ts`, imported by `SpecSheetColumns.tsx` in place of the original. This was not anticipated when the non-goals above were first written: the cube's docked screen position is computed inside `blobRenderer.ts`'s own animation loop, from `dockGeometry(cssW, cssH)`, which always parks the cube at a fixed inset from the *top-left* corner — there is no seam to override this from the page, short of editing that function. Cloning the file keeps `blobRenderer.ts` (and the current site) untouched, and the only change inside the clone is `dockGeometry`'s `x`, from `inset` to `cssW - inset`, so the cube parks top-right instead of top-left.

### Grid ("spec sheet") system

Derived from the wireframe: a frame of thin margin/gutter lines around three main content tracks.

- Columns, left to right: thin left margin — content — thin gutter — content — thin gutter — content — thin right margin. This maps onto the layout already used for the current About block (`grid-cols-1 sm:grid-cols-[1fr_auto] xl:grid-cols-[1fr_auto_1fr]`) — the grid lines are drawn to align with those same column boundaries, not a separate grid.
- Rows, top to bottom: thin top margin — title row (`About` + `[ HI, I'M MARIE ]`) — thin rule — content row (prose / image / prose) — legend row (GPS coordinates) — thin bottom margin.
- Rendered as a new `SpecSheetGrid` presentational component: absolutely-positioned `1px solid` rules (light grey, on-brand with the mono/bracket style already used for links) drawn behind the About content, sized to the same container so the lines land exactly between cells. Grid lines are a graphic element of this section only — not a layout aid, not present elsewhere on the page.

### About content, mapped to the grid

- Title row: `About` at the current large title size, with `[ HI, I'M MARIE ]` (the existing `PHRASE.About` string, re-cased in the mono style) set beside it on the same baseline, matching the wireframe.
- Left and right content columns: `ABOUT_PLACEHOLDER[0]` and `ABOUT_PLACEHOLDER[1]`, unchanged, in the existing prose styling.
- Center column: the existing portrait (`marie-vachelard.jpg`) enlarged to fill the whole center cell (rather than the current small `26vw` square), with a diagonal-hachure overlay pattern per the wireframe's placeholder-image treatment.
- Legend row: the existing GPS coordinate mark (`N 43.60079° / E 1.35044°`), same link/mark styling, centered under the middle column — same position it holds today.
- Top-right cell: the cube, now docked top-right instead of top-left (see "Cube dock corner" below). It keeps its current behavior otherwise — crystallized, hover tumble.

### Cube dock corner

`dockGeometry`'s inset is symmetric (same distance from the edge, just measured from a different corner), so the top-right dock position lands inside the wireframe's top-right cell without further per-cell positioning math. Two changes, confined to the clone:

- `specSheetBlobRenderer.ts`: `dockGeometry` returns `{ x: cssW - inset, y: inset, unit, reach }` instead of `{ x: inset, y: inset, unit, reach }`. Everything reading `dock.x` downstream (the `[ CLOSE ]` label's `left: dock.x`) already treats it as an absolute page coordinate, not an offset, so no other position math changes.
- `SpecSheetColumns.tsx`: the cube's click/hover hit-area (`className="absolute left-0 top-0 h-40 w-40"` in the original) moves to `right-0` so it still overlaps the cube.

Because the renderer draws one cube for the whole page, not one per section, this dock corner applies everywhere on `/about-lab` — not just while About is open. Experience / Projects / Contact keep their current content and layout (per the non-goals above), but on this route the cube they share will also park top-right rather than top-left. This is a deliberate, accepted side effect of reusing the real interactive cube rather than a static placeholder.

### What doesn't change

Hero, and the Experience / Projects / Contact sections, keep their current content and layout on `/about-lab` — same code, no grid lines, no new copy. The cube's dock corner is the one page-wide visual change (see above); everything else that differs is confined to the About section's opened-content block.

## Testing / verification

The project has no automated test suite (no Jest/Vitest/Playwright configured) — verification is type-checking, linting, and a manual/browser visual check.

- `node_modules/.bin/next build` and `node_modules/.bin/eslint .` must pass with no new errors (pnpm is not on PATH in this environment; call the binaries directly).
- Visual check in the browser at `/about-lab`: Home → click About → confirm the cube flight / shutters transition is untouched (aside from now flying to the top-right corner instead of top-left), then confirm the opened layout matches the wireframe (grid lines, title row, three content cells, cube in its cell, coordinates in the legend row).
- Resize check at the breakpoints the current About block already cares about (`sm`, `xl`) to confirm the grid lines still land on the column boundaries as the layout collapses to one/two columns on narrow windows.
- Confirm Experience / Projects / Contact and Home have the same content and layout as `main` on this route (cube now docks top-right there too, per "Cube dock corner" above).
