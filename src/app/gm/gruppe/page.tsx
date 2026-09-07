import type { Metadata } from "next";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { requireGM } from "@/lib/dal";
import { getPartySheet } from "@/lib/partySheet";
import {
  ATTRIBUTE_FIELDS,
  DEPARTMENT_FIELDS,
} from "@/lib/characterStats";
import { characterHref } from "@/lib/contentRoutes";

export const metadata: Metadata = {
  title: "Gruppenblatt",
  robots: { index: false, follow: false },
};

// Die Werte aller Spielercharaktere nebeneinander — die Tabelle, die man am
// Tisch braucht, wenn eine Probe angesagt wird.
//
// Bewusst eine breite Tabelle statt Karten: gefragt ist der Vergleich („wer
// hat die höchste Technik?"), und dafür müssen die Zahlen untereinander
// stehen. Auf schmalen Geräten scrollt sie waagerecht, statt umzubrechen —
// eine umgebrochene Wertetabelle ist keine mehr.
export default async function GmPartySheetPage() {
  await requireGM();
  const party = await getPartySheet();

  return (
    <>
      <PageMeta title="Gruppenblatt" section="users" />
      <article className="mb-[10px] lcars-wide-column">
        <p className="lcars-eyebrow">Zugriff · Spielleitung</p>
        <h1>Gruppenblatt</h1>

        <div className="lcars-text flex flex-col gap-[16px]">
          <p className="text-lcars-ink-dim text-[13px]">
            Die Werte aller aktiven, zugewiesenen Charaktere nebeneinander.
            Talente und Schwerpunkte stehen mit Namen; den vollen Regeltext
            zeigt der jeweilige Charakterbogen.
          </p>

          {party.length === 0 ? (
            <p className="lcars-empty-state">
              Kein aktiver Charakter mit verknüpftem Konto.
            </p>
          ) : (
            <div className="party-sheet-scroll">
              <table className="party-sheet">
                <thead>
                  <tr>
                    <th scope="col">Charakter</th>
                    {ATTRIBUTE_FIELDS.map((f) => (
                      <th scope="col" key={f.key} title={f.original}>
                        {f.label}
                      </th>
                    ))}
                    {DEPARTMENT_FIELDS.map((f) => (
                      <th scope="col" key={f.key} title={f.original}>
                        {f.label}
                      </th>
                    ))}
                    <th scope="col" title="Protection">
                      Schutz
                    </th>
                    <th scope="col" title="Max. Stress">
                      Stress
                    </th>
                    <th scope="col" title="Determination">
                      Entschl.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {party.map((member) => (
                    <tr key={member.id}>
                      <th scope="row">
                        <Link href={characterHref(member.slug)}>
                          {member.name}
                        </Link>
                        <span className="party-sheet-player">
                          {member.rank ? `${member.rank} · ` : ""}
                          {member.playerName}
                        </span>
                      </th>
                      {ATTRIBUTE_FIELDS.map((f) => (
                        <td key={f.key}>{member.stats.attributes[f.key] ?? "–"}</td>
                      ))}
                      {DEPARTMENT_FIELDS.map((f) => (
                        <td key={f.key}>
                          {member.stats.departments[f.key] ?? "–"}
                        </td>
                      ))}
                      <td>{member.stats.resistance ?? "–"}</td>
                      <td>{member.maxStress ?? "–"}</td>
                      <td>{member.stats.determination ?? "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Talente, Schwerpunkte und Werte passen nicht in dieselbe
              Tabelle — sie sind Listen, keine Zahlen, und stünden dort als
              Textwüste zwischen den Spalten. */}
          {party.map((member) => (
            <section key={member.id} className="party-sheet-lists">
              <h2>{member.name}</h2>
              <p>
                <b>Talente</b>{" "}
                {member.talents.length > 0 ? member.talents.join(" · ") : "–"}
              </p>
              <p>
                <b>Schwerpunkte</b>{" "}
                {member.focuses.length > 0 ? member.focuses.join(" · ") : "–"}
              </p>
              <p>
                <b>Werte</b>{" "}
                {member.values.length > 0 ? member.values.join(" · ") : "–"}
              </p>
            </section>
          ))}
        </div>
      </article>
    </>
  );
}
