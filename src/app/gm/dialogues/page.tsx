import type { Metadata } from "next";
import { userCan } from "@/lib/permissions";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { requireGM, getRoleMap } from "@/lib/dal";
import { getAllOpenDialoguesForGM } from "@/lib/dialogues";
import { formatDateTime } from "@/utils/formateISODate";

export const metadata: Metadata = {
  title: "Gespräche",
  robots: { index: false, follow: false },
};

// GM-oder-admin (wie /gm/characters, /gm/missions) — Übersicht ALLER
// offenen Dialoge, unabhängig von eigener Teilnahme (siehe
// getAllOpenDialoguesForGM in lib/dialoguesCore.ts). Neuer GM-Menüpunkt
// "Gespräche" (siehe HeaderUserNav.tsx). Rein lesend: verlinkt auf
// /dialogues/[slug], das Nicht-Teilnehmenden mit GM/Admin-Rolle bereits
// Lesezugriff ohne Antwortformular gewährt (siehe dort) — kein eigener
// read-only-Modus nötig.
export default async function AdminDialoguesPage() {
  const viewer = await requireGM();
  const roleMap = await getRoleMap();
  const canModerate = userCan(viewer, "dialogues.moderate", roleMap);

  const dialogues = await getAllOpenDialoguesForGM();

  return (
    <>
      <PageMeta title="Gespräche" section="users" />
      <article className="mb-[10px] pr-[var(--lcars-elbow-size)]">
        <p className="lcars-eyebrow">Zugriff · Spielleitung</p>
        <h1>Gespräche</h1>

        <div className="lcars-text flex flex-col gap-[16px]">
          <p className="text-lcars-ink-dim text-[13px]">
            Alle aktuell offenen Gespräche, unabhängig davon, ob du selbst
            daran teilnimmst. Ein Klick öffnet das Gespräch — ohne eigene
            Teilnahme rein lesend, ohne Antwortformular.
          </p>

          {dialogues.length === 0 ? (
            <p className="lcars-empty-state">Keine offenen Gespräche.</p>
          ) : (
            <div className="flex flex-col gap-[12px]">
              {dialogues.map((d) => (
                <div key={d.slug} className="flex flex-col gap-[4px]">
                  <Link
                    href={`/dialogues/${d.slug}`}
                    className="mission-akte"
                    style={
                      {
                        "--mission-color": "var(--lcars-senary)",
                      } as React.CSSProperties
                    }
                  >
                    <span className="mission-akte-rail" />
                    <span className="mission-akte-body text-left">
                      <span className="mission-akte-title block">
                        {d.title}
                      </span>
                      <span className="mission-akte-meta">
                        <span>
                          <b>Teilnehmer</b> {d.participantNames.join(", ")}
                        </span>
                        <span>
                          <b>Owner</b> {d.ownerName ?? "— kein Owner —"}
                        </span>
                        <span>
                          <b>Zuletzt aktiv</b> {formatDateTime(d.updatedAt)}
                        </span>
                      </span>
                    </span>
                  </Link>
                  {canModerate && (
                    <Link
                      href={`/gm/dialogues/${d.slug}/edit`}
                      className="text-lcars-primary underline text-[13px] self-start"
                    >
                      Metadaten bearbeiten
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </article>
    </>
  );
}
