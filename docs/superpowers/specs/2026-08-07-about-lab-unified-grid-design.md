# About Lab Unified Spec-Sheet Grid

## Purpose

`SpecSheetGrid.tsx` (the ruled frame) and the About-specific block in `SpecSheetColumns.tsx` (the three-column content) currently describe the same lines twice, from two different coordinate systems, kept in sync only by comments and convention. That drift already produced two real bugs this session: a double-rule mismatch the final review caught (content had its own `border-r` *and* the grid had its own separate divider, landing a few pixels apart) and a silently-dead `mt-15` class. This spec replaces both files' worth of line-drawing with one CSS Grid that is the single source of every margin, gutter, and rule — there is no longer a second place a line's position could be described.

This also becomes the integration point for the dev panel (`docs/superpowers/specs/2026-08-07-about-lab-dev-panel-design.md`): instead of ten scattered inline-style call sites, the panel's values become the grid's own track sizes in one place.

## Non-goals

- The title ("About" + `[ Hi, I'm Marie ]`) is **not** moved into the new grid as a literal grid item. It keeps its current per-letter type-in/type-out animation, rendered by the shared title container in `SpecSheetColumns.tsx` that every section (Experience, Projects, Contact) also uses — duplicating that animation code into a second component to make the title a "true" grid item would cost more (a second copy of intricate timing logic to keep in sync) than it buys. The new grid still owns *where the lines around the title sit*; it does not own the title's own rendering. See "Title row" below for how the two stay aligned without duplicating the title's code.
- Hero and Experience/Projects/Contact are untouched, as throughout this branch. This spec only replaces how the About-open state draws its lines and lays out its own content (prose, portrait, legend).
- No change to the doubled-rule motif (two close lines under the title, two close lines flanking the portrait column on each side) — explicitly kept per this session's direction, modelled as an extra empty track between two line-tracks rather than removed.
- No change to any pixel value currently in place (margins, gaps, prose width, etc.) — this is a restructuring of *how* those values draw lines, not a re-tuning of what they are. The dev panel's whole point is re-tuning them afterward, with the drift risk designed out.

## Approach

### Every line is its own empty grid track

No `gap` + background trick. Each line — margin boundary, column divider, the extra rule under the title — is a **dedicated grid track** (1px thick) in `grid-template-columns`/`grid-template-rows`, with nothing placed in it except a small `aria-hidden` marker `<div>` carrying `background: var(--rule)`, spanning the full opposite axis (`gridRow: "1 / -1"` for a column-track line, `gridColumn: "1 / -1"` for a row-track line). Content tracks (margins, prose, the image, the legend, and the empty spacer tracks that create breathing room around a doubled line) carry no marker and stay transparent. Nothing is ever drawn by giving a *content* cell its own border — that ambiguity (which side "owns" the line?) is exactly what produced this session's double-rule bug, and the fix is that it is structurally impossible to repeat: a line only ever comes from a dedicated track's marker div.

### Column tracks (three-column / `xl` width)

```
[marginLeft] [lineL] [prose1] [lineA1] [gapA] [lineA2] [image] [lineB1] [gapB] [lineB2] [prose2] [lineR] [marginRight]
```

`lineL`/`lineR` are single lines (the outer margin verticals). `lineA1`+`gapA`+`lineA2` are the doubled pair flanking the portrait's left edge; `lineB1`+`gapB`+`lineB2` the doubled pair on its right. `gapA`/`gapB` are the "close but not touching" spacer tracks — currently 20px total (±10px each side, per the existing `imageFlankGap` value), unchanged.

At `sm` (two-column: prose1 + image, no `prose2`/`lineB*`): `[marginLeft] [lineL] [prose1] [lineA1] [gapA] [lineA2] [image] [marginRight]` — no trailing divider past the image, matching today's behavior (the portrait is the last column there).

Below `sm` (one column): `[marginLeft] [prose1] [marginRight]` — no dividers at all, matching today.

### Row tracks

```
[marginTop] [lineTop] [titleSpace] [lineT1] [gapT] [lineT2] [content] [lineC] [legend] [lineBottom] [marginBottom]
```

`titleSpace` is an empty track — no marker, no content placed in it — sized to exactly the vertical span the title container's own `top-36`/`sm:top-48` plus its line-height (`TITLE_LINE`, already a constant in `SpecSheetColumns.tsx`) occupies, so `lineT1` (the rule "under the title") lands just past the title's own last line without this grid rendering the title itself. `lineT1`+`gapT`+`lineT2` are the doubled title/content pair; `content` is `1fr` and holds the three column tracks above; `legend` is `auto`-sized to the coordinates text.

Because `marginTop` and `titleSpace` are both empty, un-marked tracks, the title (rendered by the pre-existing shared container, positioned exactly as it is today) visually sits inside the space these two tracks reserve — it is not a grid item, but the grid still accounts for every pixel of vertical space around it, so `lineT1`'s position is read off the same `TITLE_TOP`/`TITLE_LINE` constants the title container itself uses, not a second hand-picked number.

### Content placement

Inside this one grid, `prose1`, `image`, `prose2`, and `legend` are real grid items (`gridColumn`/`gridRow`), replacing the current `flex flex-col` + CSS-grid-for-two-columns-only hybrid. The portrait keeps filling its cell via the grid's own default stretch (no `self-start`, no fixed aspect ratio — unchanged behavior, just now the *cell itself* is an explicit track rather than an auto-sized `1fr` column in a smaller, separate grid).

### File structure

- `src/components/SpecSheetGrid.tsx` and the About-specific JSX block in `src/components/SpecSheetColumns.tsx` are both deleted.
- New file: `src/components/SpecSheetAboutGrid.tsx` — owns the whole grid: track sizing (computed from the values below), every line's marker div, and the four content items (prose1, image, prose2, legend). Mounted by `SpecSheetColumns.tsx` in the same place `<SpecSheetGrid />` used to be, still gated on `opened !== null && COLUMNS[opened] === "About"`, still receiving `closing`/`restAt` for the same `arrive`/`depart` choreography (applied to the grid's own outer wrapper, exactly as today).
- The ten dev-panel values keep their meaning but four of them (`titleToRule1`, `rule1ToRule2`, the doubled-rule spacer, `imageFlankGap`) now map onto row/column track sizes on this one grid instead of ten independent inline styles; `SpecSheetDevPanel`'s design (sliders, localStorage, copy-JSON) is unchanged, only what it's wired to changes. `MEASURE_END` and the Experience/Projects photo-strip inset remain outside this component, coupled to the shared title container's margin as before (unaffected by this restructuring).

### Testing / verification

Same as every prior change here: `eslint`, `next build`, and a manual browser check — this time specifically re-verifying every line this branch has tuned by hand still renders in the same place at the same three breakpoints (base, `sm`, `xl`), that the doubled pairs are still two lines with a visible gap (not touching, not drifted apart), and that opening/closing About still animates the same way. Since this replaces two files' rendering logic wholesale, the bar is "pixel-identical to the screenshots already taken this session," not just "builds."
