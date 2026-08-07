/**
 * The ruled frame the About section draws around itself once opened — the
 * "spec sheet" grid. Outer rectangle plus the vertical column dividers; the
 * horizontal title/content and content/legend rules are borders on the
 * content itself (see SpecSheetColumns.tsx), so every rule shares the same
 * width without this component having to know the content's exact height.
 *
 * `closing` and `restAt` give the frame the same open/close choreography as
 * everything else in the section — see the `arrive`/`depart` classes on the
 * title/content wrapper in SpecSheetColumns.tsx, which this mirrors, so the
 * frame appears and disappears on the same timed beats rather than snapping.
 */
export function SpecSheetGrid({
  closing,
  restAt,
}: {
  closing: boolean;
  restAt: number;
}) {
  return (
    <div
      aria-hidden
      className={`${closing ? "depart" : "arrive"} pointer-events-none absolute inset-0`}
      style={{
        border: "1px solid var(--rule)",
        animationDelay: closing ? "0ms" : `${restAt}ms`,
      }}
    >
      <div className="grid h-full grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        <div />
        <div className="hidden border-l sm:block" style={{ borderColor: "var(--rule)" }} />
        <div className="hidden border-l xl:block" style={{ borderColor: "var(--rule)" }} />
      </div>

      {/* A second, closely-spaced line either side of the column boundaries the
          portrait sits behind — the same doubled-rule motif as the pair above the
          title, just vertical. The column boundary is at 50% in two-column mode
          (`sm` to just under `xl`) and at 1/3 and 2/3 in three-column mode (`xl`
          and up), so each needs its own element rather than one continuous line:
          the offset from 50% flips to an offset from 1/3 once the third column
          appears. There is no "after the image" line below `xl` — the portrait
          is the last column there, with only the frame's own right margin past
          it, not a divider to double. */}
      <div
        className="absolute inset-y-0 hidden border-l sm:block xl:hidden"
        style={{ left: "calc(50% + 10px)", borderColor: "var(--rule)" }}
      />
      <div
        className="absolute inset-y-0 hidden border-l xl:block"
        style={{ left: "calc(33.333% + 10px)", borderColor: "var(--rule)" }}
      />
      <div
        className="absolute inset-y-0 hidden border-l xl:block"
        style={{ left: "calc(66.666% - 10px)", borderColor: "var(--rule)" }}
      />

      {/* Two more verticals, one on each side, sitting exactly where the content's
          own left/right inset falls — left-5/right-5 (sm:left-10/right-10) is the
          title container's own inset in SpecSheetColumns.tsx. These mark the margin
          between the page edge and the content, the way the wireframe's outer
          margin columns do, distinct from the frame's own edge-to-edge rectangle
          above and the column dividers between prose/portrait/prose. */}
      <div
        className="absolute inset-y-0 left-5 border-l sm:left-10"
        style={{ borderColor: "var(--rule)" }}
      />
      <div
        className="absolute inset-y-0 right-5 border-r sm:right-10"
        style={{ borderColor: "var(--rule)" }}
      />

      {/* Same idea, horizontally: one line just above the title, at the title
          container's own top inset (top-36/sm:top-48 in SpecSheetColumns.tsx),
          and one just below the coordinates, at the FOOT inset (48px, `bottom-12`
          here — the same figure as the page's own `pb-12`) the content block is
          sized to land its last line on. */}
      <div
        className="absolute inset-x-0 top-36 border-t sm:top-48"
        style={{ borderColor: "var(--rule)" }}
      />
      <div
        className="absolute inset-x-0 bottom-12 border-t"
        style={{ borderColor: "var(--rule)" }}
      />
    </div>
  );
}
