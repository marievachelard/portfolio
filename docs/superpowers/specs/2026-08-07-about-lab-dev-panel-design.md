# About Lab Dev Panel

## Purpose

The last several rounds of tuning the `/about-lab` "spec sheet" grid (margins, the doubled rules under the title, the thin gaps flanking the portrait) went through one chat round-trip per pixel value: a request, an edit, a rebuild, a screenshot, a commit. A dev panel puts those same values on sliders in the browser, so they can be found by dragging rather than by asking — and the values found there get copied back into the source as the values to commit, the same way manual edits are today.

This is a tool for finishing the `about-lab` design faster, not a new product surface. It ships on `/about-lab` only, is not linked from anywhere, and its own presence there is not itself a design decision — the About layout it edits is.

## Non-goals

- No auto-save into the source files. The panel is read-only with respect to disk: it displays the current knob values as text (JSON) to copy, and a human (or a later chat turn) transcribes them into `SpecSheetAboutGrid.tsx` (see the unified-grid spec). No server route, no file write, no risk of the browser silently rewriting source.
- No separate mobile-breakpoint sliders. Every knob is the page's `sm`-and-up (desktop) value; the panel does not model the below-`sm` fallback each knob currently also has (e.g. margins are `left-10 sm:left-20` today — the panel only exposes and edits the `sm:` figure). Re-deriving a mobile pairing for a changed knob happens by hand when the value is committed, same as every manual edit in this branch so far.
- No attempt to keep Experience/Projects/Contact's derived offsets (`MEASURE_END`, the photo strip's own right inset) in sync while the margin sliders move. Those three constants are coupled to the shared title container's inset today and already need a manual follow-up edit when that inset changes by hand (as happened when the margins were last enlarged) — the panel doesn't remove that step, it just doesn't try to automate it either.
- Not a general design-token system. The ten knobs below are the ones this session actively tuned by hand; the panel is not trying to expose every dimension in the file. Adding another knob later is a small, well-understood addition to the same pattern, not a redesign.

## Approach

### Where it lives

A new component, `src/components/SpecSheetDevPanel.tsx`, rendered by `SpecSheetColumns.tsx` unconditionally (it doesn't need `opened === "About"` — the knobs it edits only visibly matter while About is open, but the panel itself can stay mounted so its state doesn't reset when a section closes). It is a `"use client"` component like everything else on this page; nothing here needs a env-based gate — the route is already `noindex` and unlinked, and keeping the code simple (no dev/prod branch) matters more here than hiding a debug tool that only this one person will ever see.

### State shape

One `useState` object, `DevPanelValues`, seeded with the ten current values:

```ts
type DevPanelValues = {
  marginTop: number;      // px, sm:top-20      → 80
  marginBottom: number;   // px, sm:bottom-20   → 80
  marginLeft: number;     // px, sm:left-20     → 80
  marginRight: number;    // px, sm:right-20    → 80
  titleToRule1: number;   // px, sm:mt-3 on the About block wrapper → 12
  rule1ToRule2: number;   // px, sm:mt-[60px] on the second rule    → 60
  imageFlankGap: number;  // px, the ±10px offset in the 3 flanking-line divs → 10
  proseWidth: number;     // ch, max-w-[42ch] on both prose columns → 42
  columnGap: number;      // px, gap-10 on the content grid         → 40
  titleTop: number;       // px, sm:top-48 on the title container   → 192
};
```

`SpecSheetDevPanel` owns this state and persists it to `localStorage` (key `about-lab-dev-panel`) on every change, reading it back on mount — a refresh keeps whatever the sliders were last set to, falling back to the defaults above if nothing is stored yet or the stored JSON fails to parse.

### Threading values through

**Superseded by `docs/superpowers/specs/2026-08-07-about-lab-unified-grid-design.md`.** That spec replaces `SpecSheetGrid.tsx` and the About-specific block in `SpecSheetColumns.tsx` with one component, `SpecSheetAboutGrid.tsx`, that draws every line as its own dedicated grid track. The values below still mean the same things and still need to reach that one component — `SpecSheetColumns.tsx` owns the `DevPanelValues` state (`useState`, seeded and persisted as described above) and passes `{ values, onChange }` into `<SpecSheetDevPanel />`, and passes `values` itself into `<SpecSheetAboutGrid />` as a single prop — but instead of ten independent inline-style call sites, the values now compute one `gridTemplateColumns`/`gridTemplateRows` pair plus the four content items' placement inside that one grid. `SpecSheetDevPanel` remains a controlled panel (sliders plus the localStorage effect); it does not know or care that its consumer is now one grid rather than ten scattered styles.

Tailwind's build-time class scanner can't see a class name assembled from a runtime number, so every knob remains an inline `style` value rather than a dynamically-assembled class string — that constraint is unchanged, only the number of call sites it applies to (one grid template, not ten) is smaller now.

### The panel itself

Fixed-position (`fixed bottom-4 left-4` — clear of the cube's top-right dock and the title's top-left position), a small collapse toggle (`[ dev ]` in the page's own mono-mark style) that shows/hides the body, and inside: ten labeled rows, each a range input plus a synced number input (dragging and typing both work), grouped under three headers — "Margins", "Title & rules", "Content" — matching the categories already agreed. Below the rows, a "Copy values" button that writes the current `DevPanelValues` as formatted JSON into a read-only `<textarea>` (click-to-select-all, so copying is one click plus one keyboard shortcut) rather than trying to hit the clipboard API, which needs a permission prompt in some browsers and isn't worth the friction here.

The panel is inert with respect to the rest of the page's interaction model: it sits outside the `<canvas>`/grid/title stack, has its own `z-index` above them, and nothing it does touches `opened`, `closing`, or any of the cube's state.

### Testing / verification

Same as every other change on this branch — no test framework, so: `eslint`, `next build`, and a manual browser check confirming (a) each slider visibly moves its corresponding line/margin/text in real time, (b) reloading the page after moving sliders restores the last values (localStorage round-trip), (c) "Copy values" produces valid, complete JSON for all ten knobs, and (d) opening/closing the About section and switching to another section still behaves exactly as it did before this change — the panel is additive and should not be able to affect the cube, shutters, or any section other than by the ten values it now drives.
