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
    </div>
  );
}
