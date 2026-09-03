"use client";
import PersonnelFileView from "./PersonnelFileView";
import {
  parseTalentEntry,
  talentCategoryLabel,
  type Talent,
} from "@/lib/talentCatalog";
import type { CharacterStats } from "@/types/characterStats";

// Der Charakterbogen als dreiblättrige Vorschau — dasselbe, was der
// PDF-Export erzeugt:
//   Blatt 1  das Personnel File mit Stammdaten und Werten
//   Blatt 2  der Talent-Spickzettel
//   Blatt 3  die Biografie im selben Papier-Look
//
// Reine Darstellung ohne eigenen Zustand: der Anlege-Assistent zeigt damit
// die noch nicht gespeicherten Eingaben, die Charakterseite den gespeicherten
// Stand. Beide Male dieselben Blätter.

export interface CharacterSheetPreviewInput {
  characterName: string;
  rank: string | null;
  species: string | null;
  portrait: string | null;
  stats: CharacterStats;
  // Bereits gerendertes, bereinigtes Biografie-HTML (markdownToHtml). Der
  // Assistent lässt es beim Wechsel auf die Vorschau erzeugen, die
  // Charakterseite reicht das gespeicherte HTML durch.
  bioHtml: string | null;
  talents: Talent[];
}

function TalentSheet({
  characterName,
  entries,
  talents,
}: {
  characterName: string;
  entries: string[];
  talents: Talent[];
}) {
  // Zuordnung über den Katalognamen (siehe parseTalentEntry) — ein
  // umbenanntes Talent findet seinen Regeltext also weiterhin.
  const byName = new Map(
    talents.map((talent) => [talent.name.toLowerCase(), talent]),
  );

  return (
    <div className="pf-doc">
      <h2 className="pf-doc-title">Talents</h2>
      <p className="pf-doc-subtitle">Spickzettel · {characterName}</p>

      {entries.length === 0 ? (
        <p className="pf-doc-empty">Noch keine Talente eingetragen.</p>
      ) : (
        entries.map((entry, index) => {
          const { name, original } = parseTalentEntry(entry);
          const talent = byName.get(original.toLowerCase());
          return (
            <div key={`${entry}-${index}`} className="pf-doc-entry">
              <div className="pf-doc-term">{name}</div>
              {talent && (
                <div className="pf-doc-meta">
                  {talentCategoryLabel(talent.category)}
                  {talent.requirement ? ` · ${talent.requirement}` : ""}
                </div>
              )}
              <p className="pf-doc-text">
                {talent
                  ? talent.description
                  : "Nicht im Katalog — kein Regeltext hinterlegt."}
              </p>
            </div>
          );
        })
      )}
    </div>
  );
}

function BioSheet({
  characterName,
  bioHtml,
}: {
  characterName: string;
  bioHtml: string | null;
}) {
  return (
    <div className="pf-doc">
      <h2 className="pf-doc-title">Biography</h2>
      <p className="pf-doc-subtitle">Biografie · {characterName}</p>

      {bioHtml ? (
        // Das HTML stammt aus markdownToHtml und ist dort bereits bereinigt
        // (rehype-sanitize) — dieselbe Quelle wie die Charakterseite.
        <div
          className="pf-doc-body"
          dangerouslySetInnerHTML={{ __html: bioHtml }}
        />
      ) : (
        <p className="pf-doc-empty">Noch keine Biografie geschrieben.</p>
      )}
    </div>
  );
}

export default function CharacterSheetPreview({
  input,
}: {
  input: CharacterSheetPreviewInput;
}) {
  return (
    <div className="pf-preview">
      <PersonnelFileView
        characterName={input.characterName}
        rank={input.rank}
        species={input.species}
        portrait={input.portrait}
        stats={input.stats}
        // Das umgebende Fenster bzw. der Assistent ist bereits die
        // Vollansicht — ein zweiter Vollbild-Knopf säße nur im Weg.
        expandable={false}
      />
      <TalentSheet
        characterName={input.characterName}
        entries={input.stats.talents}
        talents={input.talents}
      />
      <BioSheet characterName={input.characterName} bioHtml={input.bioHtml} />
    </div>
  );
}
