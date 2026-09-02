"use client";
import {
  parseTalentEntry,
  talentCategoryLabel,
  type Talent,
} from "@/lib/talentCatalog";

// Spickzettel am Fuß des Charakterbogens: die Talente DIESES Charakters mit
// ihrem vollen Regeltext. Sonst müsste man am Spieltisch für jede Regelfrage
// erst die Auswahl öffnen oder ins Regelwerk greifen.
//
// Zugeordnet wird über den Katalognamen (siehe parseTalentEntry) — ein
// umbenanntes Talent findet seinen Text also weiterhin. Steht ein Eintrag nicht
// im Katalog (Alt-Bestand aus der Freitext-Zeit), erscheint er trotzdem, nur
// ohne Beschreibung.
export default function TalentCheatSheet({
  entries,
  talents,
}: {
  entries: string[];
  talents: Talent[];
}) {
  if (entries.length === 0) return null;

  const byName = new Map(
    talents.map((talent) => [talent.name.toLowerCase(), talent]),
  );

  return (
    <section className="stat-sheet-section">
      <h2 className="stat-sheet-section-title">
        Talents <span className="stat-label-secondary">Spickzettel</span>
      </h2>
      <p className="stat-sheet-rule">
        Die Talente dieses Charakters mit ihrem Regeltext — zum Nachschlagen am
        Spieltisch.
      </p>

      <dl className="stat-cheat-list">
        {entries.map((entry, index) => {
          const { name, original } = parseTalentEntry(entry);
          const talent = byName.get(original.toLowerCase());
          return (
            <div key={`${entry}-${index}`} className="stat-cheat-item">
              <dt className="stat-cheat-term">
                <span className="stat-label-primary">{name}</span>
                {talent && (
                  <span className="stat-label-secondary">
                    {talentCategoryLabel(talent.category)}
                    {talent.requirement ? ` · ${talent.requirement}` : ""}
                  </span>
                )}
              </dt>
              <dd className="stat-cheat-text">
                {talent
                  ? talent.description
                  : "Nicht im Katalog — kein Regeltext hinterlegt."}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
