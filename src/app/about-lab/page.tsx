import type { Metadata } from "next";
import { SpecSheetColumns } from "@/components/SpecSheetColumns";

// Experimental route: never indexed, so it can be tried without inheriting
// the root layout's crawlable/indexable metadata.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AboutLab() {
  return <SpecSheetColumns />;
}
