"use client";
import { LcarsDataRow } from "@/components/lcars";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function Page() {
  usePageMeta("Home", "home");
  return <LcarsDataRow label="Test" color="var(--lcars-amber)" value={4} />;
}
