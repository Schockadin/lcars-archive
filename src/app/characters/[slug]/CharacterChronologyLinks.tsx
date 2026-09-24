import { LcarsDataRow } from "@/components/lcars";
import { CONTENT_TYPE_COLOR } from "@/lib/contentTypeFormat";
import {
  characterEventsHref,
  characterLogsHref,
  characterMissionsHref,
  dialoguesHref,
} from "@/lib/contentRoutes";

export interface CharacterChronologyCounts {
  logs: number;
  dialogues: number;
  missions: number;
  events: number;
}

// Die vier Wege von der öffentlichen Personalakte in die Chronologie.
// Links und Zähler liegen als eigener Baustein zusammen, damit beim nächsten
// Chronologie-Bereich nicht wieder CharacterHero selbst wachsen muss.
export default function CharacterChronologyLinks({
  characterName,
  counts,
}: {
  characterName: string;
  counts: CharacterChronologyCounts;
}) {
  return (
    <div className="char-file-links">
      <LcarsDataRow
        value={counts.logs}
        label="Logs"
        href={characterLogsHref(characterName)}
        color={CONTENT_TYPE_COLOR.mission_log}
      />
      <LcarsDataRow
        value={counts.dialogues}
        label="Gespräche"
        href={dialoguesHref(characterName)}
        color={CONTENT_TYPE_COLOR.dialogue}
      />
      <LcarsDataRow
        value={counts.missions}
        label="Missionen"
        href={characterMissionsHref(characterName)}
        color={CONTENT_TYPE_COLOR.mission}
      />
      <LcarsDataRow
        value={counts.events}
        label="Events"
        href={characterEventsHref(characterName)}
        color="var(--lcars-quaternary)"
      />
    </div>
  );
}
