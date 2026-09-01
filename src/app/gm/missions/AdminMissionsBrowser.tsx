"use client";
import { useMemo, useOptimistic, useState } from "react";
import Link from "next/link";
import OwnerSelect from "@/components/OwnerSelect";
import DeleteOwnContentButton from "@/app/user/content/DeleteOwnContentButton";
import { PencilIcon } from "@/lib/icons";
import { STATUS_CONFIG } from "@/lib/missionFormat";
import type { GmMissionOverviewItem } from "@/lib/missions";

// GM-Missionsübersicht (/gm/missions) — Edit/Löschen/Owner-Zuweisung pro
// Zeile in einer durchsuchbaren Liste, analog zu AdminContentBrowser.tsx
// (/admin/content), aber GM-zugänglich (nicht nur Admin) und auf Missionen
// beschränkt. Kein Sichtbarkeits-Feld (siehe page.tsx-Kommentar). Löschen
// nutzt dieselbe Action wie "Meine Inhalte" (deleteOwnContentAction "mission"
// erlaubt bereits jede Spielleitung), Owner-Zuweisung dieselbe Komponente
// wie auf den Detailseiten (setOwnerAction erlaubt "mission" jetzt ebenfalls
// für GM, siehe src/app/actions/owner.ts).
export default function AdminMissionsBrowser({
  missions,
  users,
}: {
  missions: GmMissionOverviewItem[];
  users: { id: number; name: string }[];
}) {
  const [search, setSearch] = useState("");
  const [optimisticMissions, removeOptimisticMission] = useOptimistic(
    missions,
    (state, id: number) => state.filter((m) => m.id !== id),
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return optimisticMissions;
    return optimisticMissions.filter((m) => m.title.toLowerCase().includes(q));
  }, [optimisticMissions, search]);

  if (missions.length === 0) {
    return <p className="lcars-empty-state">Noch keine Missionen vorhanden.</p>;
  }

  return (
    <div className="flex flex-col gap-[16px]">
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Nach Titel filtern…"
        aria-label="Missionen filtern"
        className="lcars-input rounded-full w-full max-w-[500px] ml-auto text-[13px]"
      />

      {filtered.length === 0 ? (
        <p className="lcars-empty-state">Keine Missionen für diese Suche.</p>
      ) : (
        <div className="flex flex-col gap-[6px]">
          {filtered.map((mission) => (
            <div
              key={mission.id}
              className="flex flex-wrap items-center gap-[8px]"
            >
              <Link
                href={`/missions/${mission.slug}`}
                className="mission-akte flex-1 min-w-[240px]"
                style={
                  {
                    "--mission-color": STATUS_CONFIG[mission.status].color,
                  } as React.CSSProperties
                }
              >
                <span className="mission-akte-rail" />
                <span className="mission-akte-body text-left">
                  <span className="mission-akte-title block">
                    {mission.title}
                    {mission.isDraft && (
                      <span className="text-lcars-primary"> · Entwurf</span>
                    )}
                  </span>
                  <span className="mission-akte-meta">
                    <span>
                      <b>Status</b> {STATUS_CONFIG[mission.status].label}
                    </span>
                  </span>
                </span>
              </Link>
              <OwnerSelect
                contentType="mission"
                id={mission.id}
                initialOwnerId={mission.ownerId}
                users={users}
              />
              <Link
                href={`/user/missions/${mission.id}/edit`}
                className="lcars-icon-btn"
                aria-label="Bearbeiten"
                title="Bearbeiten"
              >
                <PencilIcon />
              </Link>
              <DeleteOwnContentButton
                contentType="mission"
                id={mission.id}
                onOptimisticDelete={() => removeOptimisticMission(mission.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
