"use client";
import { useState } from "react";
import { notFound } from "next/navigation";
import {
  LcarsSwitch,
  LcarsSortSwitch,
  LcarsDataRow,
  type SortDir,
} from "@/components/lcars";

// Nur für lokale Playwright-E2E-Läufe (next dev) — testet Layout-Details
// (Switch-Trenner/-Hintergrund, DataRow-Pillen-Breiten), die jsdom
// grundsätzlich nicht prüfen kann, weil dort kein echtes Boxmodell berechnet
// wird. In echten Deployments nicht buildbar/erreichbar.
if (process.env.NODE_ENV === "production") notFound();

export default function DevGalleryPage() {
  const [twoOption, setTwoOption] = useState<"a" | "b">("a");
  const [fiveOption, setFiveOption] = useState<"1" | "2" | "3" | "4" | "5">(
    "1",
  );
  const [sortKey, setSortKey] = useState<"name">("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  return (
    <article className="mb-[10px] max-w-[var(--lcars-content-w)] pr-[var(--lcars-elbow-size)]">
      <h1>Dev Gallery</h1>

      <section id="switch-two" className="flex flex-col gap-[8px] mb-[24px]">
        <h2 className="lcars-text">Switch (2 Optionen)</h2>
        <LcarsSwitch
          options={[
            { key: "a", label: "Option A" },
            { key: "b", label: "Option B" },
          ]}
          active={twoOption}
          onChange={setTwoOption}
        />
      </section>

      <section id="switch-five" className="flex flex-col gap-[8px] mb-[24px]">
        <h2 className="lcars-text">Switch (5 Optionen, ungerade Anzahl)</h2>
        <LcarsSwitch
          options={[
            { key: "1", label: "1" },
            { key: "2", label: "2" },
            { key: "3", label: "3" },
            { key: "4", label: "4" },
            { key: "5", label: "5" },
          ]}
          active={fiveOption}
          onChange={setFiveOption}
        />
      </section>

      <section className="flex flex-col gap-[8px] mb-[24px]">
        <h2 className="lcars-text">SortSwitch</h2>
        <LcarsSortSwitch
          options={[{ key: "name", label: "Name" }]}
          sortKey={sortKey}
          sortDir={sortDir}
          onChange={(key, dir) => {
            setSortKey(key);
            setSortDir(dir);
          }}
        />
      </section>

      <section className="flex flex-col gap-[10px]">
        <h2 className="lcars-text">DataRow</h2>
        <LcarsDataRow value="01" label="Erste Zeile" />
        <LcarsDataRow value="02" label="Zweite Zeile" href="/dev-gallery" />
      </section>
    </article>
  );
}
