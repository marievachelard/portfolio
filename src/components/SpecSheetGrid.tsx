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
