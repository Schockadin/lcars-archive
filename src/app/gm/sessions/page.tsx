import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireGM } from "@/lib/dal";
import { listGameSessions, listActiveCharactersForAp } from "@/lib/gameSessions";
import { getAdvancementRules } from "@/lib/advancementSettings";
import SessionManager from "./SessionManager";

export const metadata: Metadata = {
  title: "Sessions",
  robots: { index: false, follow: false },
};

// Sessions eintragen und die AP dafür gutschreiben. Die Vorbelegung der
// Session-AP kommt aus dem konfigurierbaren Regelwerk (/gm/ap).
export default async function GmSessionsPage() {
  await requireGM();

  const [sessions, characters, rules] = await Promise.all([
    listGameSessions(),
    listActiveCharactersForAp(),
    getAdvancementRules(),
  ]);

  // Serverseitig gebildet, damit Formular-Vorbelegung und Server-Render
  // dasselbe Datum zeigen. Europe/Berlin statt UTC: auf Netlify läuft die
  // Laufzeit in UTC, spätabends wäre das sonst schon der Folgetag.
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
  }).format(new Date());

  return (
    <>
      <PageMeta title="Sessions" section="users" />
      <article className="mb-[10px] pr-[var(--lcars-elbow-size)]">
        <p className="lcars-eyebrow">Zugriff · Spielleitung</p>
        <h1>Sessions</h1>

        <div className="lcars-text flex flex-col gap-[16px]">
          <p className="text-lcars-ink-dim text-[13px]">
            Eine eingetragene Session schreibt allen ausgewählten Charakteren
            die Session-AP und die Bonus-AP gut. Vorausgewählt sind alle
            aktiven Charaktere mit verknüpftem Konto — wer gefehlt hat, wird
            einfach abgewählt.
          </p>
          <SessionManager
            sessions={sessions}
            characters={characters}
            defaultSessionAp={rules.apPerSession}
            today={today}
          />
        </div>
      </article>
    </>
  );
}
