import type { ReactNode } from "react";
import type { DevPanelValues } from "@/lib/specSheetDevPanelValues";

/**
 * Every rule on the About "spec sheet" is its own empty grid track — never a border on
 * a content cell, which is what let two separate systems draw the same boundary
 * slightly apart earlier in this branch. A track is either a line (1px, painted by a
 * small marker div) or content/space (no marker, just the size it's given).
 *
 * Row layout is one column-independent stack: margin, a rule, the space the title
 * (rendered elsewhere, by the shared title container in SpecSheetColumns.tsx) occupies,
 * the doubled title/content rule pair, the content row, a rule, the legend row, a rule,
 * margin. `TITLE_LINE_HEIGHT` must match TITLE_LINE in SpecSheetColumns.tsx — it is not
 * imported from there to keep this component independent of that file's internals.
 *
 * Breakpoints are Tailwind's own `sm` (640px) and `xl` (1280px), matching every other
 * responsive value already on this page.
 */
const TITLE_LINE_HEIGHT = 60;

export function SpecSheetAboutGrid({
  closing,
  linesInAt,
  linesOutAt,
  contentInAt,
  contentInDuration,
  contentOutAt,
  contentOutDuration,
  values,
  prose1,
  image,
  prose2,
  legend,
}: {
  closing: boolean;
  /** When the grid's own lines start sliding into place, ms after the section
      opens — driven by the cube setting off for its dock, not by the title. */
  linesInAt: number;
  /** When the lines start sliding back out on close — only once the title and
      content below have both finished leaving, since the lines were first to
      arrive and so are last to go. */
  linesOutAt: number;
  /** When the content (portrait, prose, legend) starts fading into the grid the
      lines already drew — the same instant the title starts typing, so the two
      run as one movement. */
  contentInAt: number;
  /** How long that fade runs — sized so it finishes exactly when the title (and
      its aside) finish, whatever the label's own length made that take. */
  contentInDuration: number;
  /** When the content starts fading back out on close — the same instant the
      title starts unwinding, mirroring how the two arrived together. */
  contentOutAt: number;
  /** How long that fade takes — sized so it finishes exactly when the title (and
      its aside) finish unwinding. */
  contentOutDuration: number;
  values: DevPanelValues;
  prose1: ReactNode;
  image: ReactNode;
  prose2: ReactNode;
  legend: ReactNode;
}) {
  const halfGap = values.columnGap / 2;
  const titleSpace = values.titleTop + TITLE_LINE_HEIGHT - values.marginTop - 1;

  const rows =
    `[r0] ${values.marginTop}px [r1] 1px [r2] ${titleSpace}px [r3] ${values.titleToRule1}px ` +
    `[r4] 1px [r5] ${values.rule1ToRule2}px [r6] 1px [r7] ${values.columnGap}px ` +
    `[r8] 1fr [r9] 1px [r10] ${values.columnGap}px [r11] auto [r12] 1px [r13] ${values.marginBottom}px [r14]`;

  const colsBase = `[b0] ${values.marginLeft}px [b1] 1px [b2] 1fr [b3] 1px [b4] ${values.marginRight}px [b5]`;

  const colsSm =
    `[b0] ${values.marginLeft}px [b1] 1px [b2] 1fr [b3] ${halfGap}px [b4] 1px ` +
    `[b5] ${values.imageFlankGap}px [b6] 1px [b7] ${halfGap}px [b8] 1fr [b9] 1px [b10] ${values.marginRight}px [b11]`;

  const colsXl =
    `[b0] ${values.marginLeft}px [b1] 1px [b2] 1fr [b3] ${halfGap}px [b4] 1px ` +
    `[b5] ${values.imageFlankGap}px [b6] 1px [b7] ${halfGap}px [b8] 1fr [b9] ${halfGap}px [b10] 1px ` +
    `[b11] ${values.imageFlankGap}px [b12] 1px [b13] ${halfGap}px [b14] 1fr [b15] 1px [b16] ${values.marginRight}px [b17]`;

  const RULE = { backgroundColor: "var(--rule)" };

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <style>{`
        .specsheet-about-grid { grid-template-columns: ${colsBase}; }
        @media (min-width: 640px) { .specsheet-about-grid { grid-template-columns: ${colsSm}; } }
        @media (min-width: 1280px) { .specsheet-about-grid { grid-template-columns: ${colsXl}; } }
      `}</style>

      {/* The lines alone — see grid-lines-in/out in globals.css for the shutters'
          own cut-and-crossfade curves this borrows. A separate grid rather than a
          wrapper around a subset of the content layer's children: wrapping them
          would pull them out from under the grid container that positions them by
          `gridColumn`/`gridRow`, so instead this is its own full grid, sharing
          `.specsheet-about-grid`'s column template so the two stay pixel-aligned
          without restating it.

          `linesOutAt` (not 0) on close: the lines were first to arrive, so they
          wait for the content layer below to finish leaving before they do — see
          `aboutLinesOutAt`'s comment in SpecSheetColumns.tsx. */}
      <div
        className={`${closing ? "grid-lines-out" : "grid-lines-in"} absolute inset-0`}
        style={{ animationDelay: `${closing ? linesOutAt : linesInAt}ms` }}
      >
        <div className="specsheet-about-grid grid h-full" style={{ gridTemplateRows: rows }}>
          {/* Horizontal rules, full width regardless of the column template above. */}
          <div style={{ ...RULE, gridRow: "r1 / r2", gridColumn: "1 / -1" }} />
          <div style={{ ...RULE, gridRow: "r4 / r5", gridColumn: "1 / -1" }} />
          <div style={{ ...RULE, gridRow: "r6 / r7", gridColumn: "1 / -1" }} />
          <div style={{ ...RULE, gridRow: "r9 / r10", gridColumn: "1 / -1" }} />
          <div style={{ ...RULE, gridRow: "r12 / r13", gridColumn: "1 / -1" }} />

          {/* Left outer margin vertical — b1/b2 names the same pair of lines in all
              three column templates, since every template starts the same way. */}
          <div style={{ ...RULE, gridColumn: "b1 / b2", gridRow: "1 / -1" }} />

          {/* The right margin line's own position is the one thing that genuinely
              differs by breakpoint (the base and sm templates end sooner than xl's),
              so it needs one variant per template, each hidden outside its own range. */}
          <div className="sm:hidden" style={{ ...RULE, gridColumn: "b3 / b4", gridRow: "1 / -1" }} />
          <div
            className="hidden sm:block xl:hidden"
            style={{ ...RULE, gridColumn: "b9 / b10", gridRow: "1 / -1" }}
          />
          <div className="hidden xl:block" style={{ ...RULE, gridColumn: "b15 / b16", gridRow: "1 / -1" }} />

          {/* Doubled pair flanking the portrait's left edge — visible from `sm`, where
              b4/b5 and b6/b7 both exist and mean the same thing in the sm and xl
              templates (they diverge only after the portrait). */}
          <div className="hidden sm:block" style={{ ...RULE, gridColumn: "b4 / b5", gridRow: "1 / -1" }} />
          <div className="hidden sm:block" style={{ ...RULE, gridColumn: "b6 / b7", gridRow: "1 / -1" }} />

          {/* Doubled pair flanking the portrait's right edge — only exists once the
              third column appears, at `xl`. */}
          <div className="hidden xl:block" style={{ ...RULE, gridColumn: "b10 / b11", gridRow: "1 / -1" }} />
          <div className="hidden xl:block" style={{ ...RULE, gridColumn: "b12 / b13", gridRow: "1 / -1" }} />
        </div>
      </div>

      {/* The content — a pure fade (content-fade-in/out), not the arrive/depart
          treatment's translateY: the lines already did the arriving, in from the
          left, so the content settling into the frame they drew has no direction
          of travel left to add.

          Delay and duration both come from the title's own clock, in each
          direction: this has to start and end exactly with the title+aside
          writing itself in or out, so `contentInDuration`/`contentOutDuration`
          override the class's own fixed duration (inline styles win over the
          shorthand `animation` a class sets, even though duration is normally
          the class's job — see SpecSheetColumns.tsx for where the numbers come
          from: `aboutContentInDuration` going in, `aboutContentOutDuration`
          coming out). */}
      <div
        className={`${closing ? "content-fade-out" : "content-fade-in"} absolute inset-0`}
        style={{
          animationDelay: `${closing ? contentOutAt : contentInAt}ms`,
          animationDuration: `${closing ? contentOutDuration : contentInDuration}ms`,
        }}
      >
        <div className="specsheet-about-grid grid h-full" style={{ gridTemplateRows: rows }}>
          {/* Each column reference is valid at every breakpoint it's actually shown
              at — prose1 and the portrait share the same b2/b3 and b8/b9 pair in the
              sm and xl templates; prose2 only exists once xl's template supplies
              b14/b15. */}
          <div style={{ gridColumn: "b2 / b3", gridRow: "r8 / r9", width: "100%", padding: "0 8px" }}>
            {prose1}
          </div>
          {/* The image spans into the padding tracks on every side it has one, touching
              the surrounding rules directly instead of stopping at the narrower content
              track — "fills the cell" means the area between the rules, not just the
              1fr track inside it. Two variants: two-column mode's image already touches
              the outer right margin line directly (no padding track past it, by design
              — see the doubled-pair comment above), so only its left side gains the
              extra span; three-column mode gains it on both sides. */}
          <div
            className="relative hidden sm:block xl:hidden"
            style={{ gridColumn: "b7 / b9", gridRow: "r7 / r10" }}
          >
            {image}
          </div>
          <div
            className="relative hidden xl:block"
            style={{ gridColumn: "b7 / b10", gridRow: "r7 / r10" }}
          >
            {image}
          </div>
          {/* b13 / b15, not b14 / b15: prose1 sits directly against its own nearest
              visible line (lineL, no padding track between them), so its 8px padding
              reads as "8px from the line." Prose2's nearest visible line (lineB2) has
              the halfGap padding track (b13/b14) between it and prose2's own b14/b15
              cell — left as b14/b15, the 8px padding would start counting from that
              invisible boundary, landing the text ~28px from the line instead of 8.
              Spanning from b13 folds the halfGap into this box so the padding is
              measured from the same place prose1's is: the visible line itself. */}
          <div
            className="hidden xl:block"
            style={{ gridColumn: "b13 / b15", gridRow: "r8 / r9", width: "100%", padding: "0 8px" }}
          >
            {prose2}
          </div>
          {/* Centred on both axes within its cell — full width, flexed rather than
              text-align, so the vertical centring (align-items) and the horizontal
              (justify-content) come from the same mechanism. Spans r10/r12, not just
              r11/r12 (the legend's own auto-height row): r10/r11 is the columnGap
              padding between the rule above (lineC, ending at r10) and this row, and
              leaving it out of the centred box is what put the text low, flush against
              its own row's bottom instead of centred in the visible gap between the
              two rules. */}
          <div
            style={{
              gridColumn: "1 / -1",
              gridRow: "r10 / r12",
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {legend}
          </div>
        </div>
      </div>
    </div>
  );
}
