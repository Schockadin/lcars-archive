import type { Metadata } from "next";
import { userCan } from "@/lib/permissions";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { requireGM, getRoleMap } from "@/lib/dal";
import { getAllOpenDialoguesForGM } from "@/lib/dialogues";
import { formatDateTime } from "@/utils/formateISODate";
import { LcarsAkteCard } from "@/components/lcars";
import { PencilIcon } from "@/lib/icons";
import {
  dialogueHref,
} from "@/lib/contentRoutes";
import HelpHeading from "@/components/help/HelpHeading";
import { GmDialoguesGuide } from "@/components/help/guides/GmGuides";
import DialogueLastAuthorMeta from "@/components/DialogueLastAuthorMeta";

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
      <article className="mb-[10px] lcars-wide-column">
        <HelpHeading
          eyebrow="Zugriff · Spielleitung"
          title="Gespräche"
          helpTitle="Leitung · Gespräche"
          tutorial="spielleitung-admins"
        >
          <GmDialoguesGuide />
        </HelpHeading>

        <div className="lcars-text flex flex-col gap-[16px]">
          <p className="text-lcars-ink-dim text-[13px]">
            Alle aktuell offenen Gespräche, unabhängig davon, ob du selbst daran
            teilnimmst. Ein Klick öffnet das Gespräch — ohne eigene Teilnahme
            rein lesend, ohne Antwortformular.
          </p>

          {dialogues.length === 0 ? (
            <p className="lcars-empty-state">Keine offenen Gespräche.</p>
          ) : (
            <div className="flex flex-col gap-[12px]">
              {dialogues.map((d) => (
                <div key={d.slug} className="flex flex-col gap-[4px]">
                  <LcarsAkteCard
                    href={dialogueHref(d.slug)}
                    color="var(--lcars-senary)"
                    title={d.title}
                    meta={
                      <>
                        <span>
                          <b>Teilnehmer</b> {d.participantNames.join(", ")}
                        </span>
                        <DialogueLastAuthorMeta
                          characterName={d.lastMessageCharacterName}
                        />
                        <span>
                          <b>Owner</b> {d.ownerName ?? "— kein Owner —"}
                        </span>
                        <span>
                          <b>Zuletzt aktiv</b> {formatDateTime(d.updatedAt)}
                        </span>
                      </>
                    }
                  />
                  {canModerate && (
                    <Link
                      href={`/gm/dialogues/${d.slug}/edit`}
                      className="lcars-icon-btn self-start"
                      aria-label={`Metadaten von ${d.title} bearbeiten`}
                      title={`Metadaten von ${d.title} bearbeiten`}
                    >
                      <PencilIcon />
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
