import { fmtDate } from "@/lib/missionFormat";
import type { ArchiveParticipant, ArchiveLocationRef } from "@/types/archive";
import { archiveHref, characterHref } from "@/lib/contentRoutes";
import ContentDetailHeader, {
  ContentChip,
  ContentChipList,
  ContentMetaValue,
} from "./ContentDetailHeader";

// Dialog-Header: Titel, verlinkte Teilnehmer + Ort + Datum. Genutzt sowohl
// von /characters/dialogues/[slug] (abgeschlossene Gespräche) als auch
// /dialogues/[slug] (offene Gespräche) — identisches Markup für beide
// Zustände. Der Rahmen (Titel + beschriftete Metazeilen) steckt in
// ContentDetailHeader und wird mit der Missionsseite geteilt.
export default function DialogueHeader({
  title,
  participants,
  location,
  logDate,
}: {
  title: string;
  participants: ArchiveParticipant[];
  location: ArchiveLocationRef | null;
  logDate: string | null;
}) {
  return (
    <ContentDetailHeader
      title={title}
      rows={[
        participants.length > 0 && {
          label: "Teilnehmer",
          children: (
            <ContentChipList>
              {participants.map((p) =>
                p.kind === "unknown" ? (
                  // Kein eigener Eintrag → nur Name, kein Link.
                  <ContentChip
                    key={p.slug}
                    color="var(--lcars-ink-dim)"
                    title={p.name}
                  />
                ) : (
                  <ContentChip
                    key={p.slug}
                    href={
                      p.kind === "character"
                        ? characterHref(p.slug)
                        : archiveHref(p.slug)
                    }
                    color="var(--lcars-tertiary)"
                    title={p.name}
                  />
                ),
              )}
            </ContentChipList>
          ),
        },
        location && {
          label: "Ort",
          children: (
            <ContentChip
              href={archiveHref(location.slug)}
              color="var(--lcars-senary)"
              title={location.title}
            />
          ),
        },
        logDate && {
          label: "Datum",
          children: <ContentMetaValue>{fmtDate(logDate)}</ContentMetaValue>,
        },
      ]}
    />
  );
}
