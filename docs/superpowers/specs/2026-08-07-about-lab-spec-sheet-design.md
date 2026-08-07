# About Lab — "Spec Sheet" About page

## Purpose

Try an alternative art direction for the About section — a visible technical-drawing grid ("spec sheet") — without touching the current site. Built as a full clone of the existing single-page experience on a new route, so the Home → About transition (cube flight, shutters) stays exactly as it is today. Only the About section's *opened* content is redesigned.

This is an experiment (`about-lab` branch, `/about-lab` route), not a replacement. It may be discarded, or later merged back into the main About section once the layout is validated.

## Non-goals

- No change to `LiquidColumns.tsx`, the Home page, or any other route.
- No change to `blobRenderer.ts` / `blobShader.ts` (the cube's rendering logic).
- No new copy: the About prose stays the existing placeholder (`ABOUT_PLACEHOLDER`), acknowledged as provisional.
- Hero and the Experience / Projects / Contact columns are visually unchanged on `/about-lab` — grid lines and the new layout apply to the About section only.

## Approach

### File / route strategy

- New branch `about-lab` off `main`.
- Duplicate `src/components/LiquidColumns.tsx` → `src/components/SpecSheetColumns.tsx`. This copy owns all the existing state machine (scroll, column open/close, cube dock/return, shutters) unchanged.
- New route `src/app/about-lab/page.tsx` renders `<SpecSheetColumns />`.
- Only the JSX block that renders the opened About section (currently `LiquidColumns.tsx` lines ~1075–1156) is rewritten inside the copy. Every other section (Hero, Experience, Projects, Contact) and every shared helper (`leading`, `BLOCK_H`, `ABOUT_BLOCK_H`, `PROSE`, `mark`, the cube's dock/hover wiring) stays as-is, since the copy still needs them for its unchanged sections.
- Shared source files are imported, not duplicated: the portrait image (`@/images/about/marie-vachelard.jpg`), `createBlobRenderer`/`BlobRenderer` from `@/lib/blobRenderer`, and the shader from `@/lib/blobShader`.

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
- Top-right cell: the cube, moved from its current fixed-pixel dock position to sit inside this grid cell. It keeps its current behavior — docked, crystallized, hover tumble — nothing changes in `blobRenderer`/`blobShader`; only the CSS position/anchor changes so it lands in the cell instead of a fixed corner offset.

### What doesn't change

Hero, and the Experience / Projects / Contact sections, render identically to the current site on `/about-lab` — same code, same styling, no grid lines. Only the About section's opened-content block differs.

## Testing / verification

- Visual check in the browser at `/about-lab`: Home → click About → confirm the cube flight / shutters transition is untouched, then confirm the opened layout matches the wireframe (grid lines, title row, three content cells, cube in its cell, coordinates in the legend row).
- Resize check at the breakpoints the current About block already cares about (`sm`, `xl`) to confirm the grid lines still land on the column boundaries as the layout collapses to one/two columns on narrow windows.
- Confirm Experience / Projects / Contact and Home are pixel-identical to `main` on this route (no regression from the duplication).
