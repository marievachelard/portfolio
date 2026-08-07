"use client";

import { useEffect, useState } from "react";
import type { DevPanelValues } from "@/lib/specSheetDevPanelValues";

const FIELDS: {
  key: keyof DevPanelValues;
  label: string;
  min: number;
  max: number;
  group: "Margins" | "Title & rules" | "Content";
}[] = [
  { key: "marginTop", label: "Margin top", min: 0, max: 200, group: "Margins" },
  { key: "marginBottom", label: "Margin bottom", min: 0, max: 200, group: "Margins" },
  { key: "marginLeft", label: "Margin left", min: 0, max: 200, group: "Margins" },
  { key: "marginRight", label: "Margin right", min: 0, max: 200, group: "Margins" },
  { key: "titleTop", label: "Title top", min: 0, max: 400, group: "Title & rules" },
  { key: "titleToRule1", label: "Title → rule 1", min: 0, max: 100, group: "Title & rules" },
  { key: "rule1ToRule2", label: "Rule 1 → rule 2", min: 0, max: 150, group: "Title & rules" },
  { key: "imageFlankGap", label: "Image flank gap", min: 0, max: 60, group: "Content" },
  { key: "columnGap", label: "Column gap", min: 0, max: 120, group: "Content" },
  { key: "proseWidth", label: "Prose width (ch)", min: 20, max: 70, group: "Content" },
];

const GROUPS = ["Margins", "Title & rules", "Content"] as const;

export function SpecSheetDevPanel({
  values,
  onChange,
}: {
  values: DevPanelValues;
  onChange: (values: DevPanelValues) => void;
}) {
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(id);
  }, [copied]);

  const set = (key: keyof DevPanelValues, value: number) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 font-mono text-[10px] tracking-[0.1em] text-neutral-600">
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        className="mark pointer-events-auto bg-white/90 px-2 py-1 text-neutral-500"
      >
        [ dev ]
      </button>

      {open && (
        <div className="pointer-events-auto mt-2 max-h-[70vh] w-72 overflow-y-auto rounded border border-neutral-200 bg-white/95 p-3 shadow-lg">
          {GROUPS.map((group) => (
            <div key={group} className="mb-4">
              <div className="mb-2 text-neutral-400">{group}</div>
              {FIELDS.filter((f) => f.group === group).map((field) => (
                <div key={field.key} className="mb-2">
                  <div className="mb-1 flex items-center justify-between text-neutral-600">
                    <span>{field.label}</span>
                    <input
                      type="number"
                      value={values[field.key]}
                      onChange={(e) => set(field.key, Number(e.target.value))}
                      className="w-14 border border-neutral-200 px-1 text-right"
                    />
                  </div>
                  <input
                    type="range"
                    min={field.min}
                    max={field.max}
                    value={values[field.key]}
                    onChange={(e) => set(field.key, Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              ))}
            </div>
          ))}

          <button
            type="button"
            onClick={() => {
              const text = JSON.stringify(values, null, 2);
              const el = document.createElement("textarea");
              el.value = text;
              el.readOnly = true;
              el.style.position = "fixed";
              el.style.top = "-1000px";
              document.body.appendChild(el);
              el.select();
              try {
                document.execCommand("copy");
                setCopied(true);
              } finally {
                document.body.removeChild(el);
              }
            }}
            className="mark w-full bg-neutral-900 px-2 py-2 text-center text-white"
          >
            {copied ? "[ copied ]" : "[ copy values ]"}
          </button>

          <textarea
            readOnly
            value={JSON.stringify(values, null, 2)}
            onClick={(e) => e.currentTarget.select()}
            className="mt-2 h-32 w-full resize-none border border-neutral-200 p-1 text-[9px]"
          />
        </div>
      )}
    </div>
  );
}
