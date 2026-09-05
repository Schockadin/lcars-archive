"use client";
import type { ReactNode } from "react";
import PersonnelFileView from "./PersonnelFileView";
import {
  parseTalentEntry,
  talentCategoryLabel,
  type Talent,
} from "@/lib/talentCatalog";
import type { CharacterStats } from "@/types/characterStats";
import { CORE_RULES } from "@/lib/coreRules";
import type { CampaignRule } from "@/lib/campaignRuleTypes";

// Der Charakterbogen als dreiblättrige Vorschau — dasselbe, was der
// PDF-Export erzeugt:
//   Blatt 1  das Personnel File mit Stammdaten und Werten
//   Blatt 2  der Spickzettel: Talente des Charakters, die Kernregeln
//            (Momentum, Bedrohung, Entschlossenheit) und die eigenen Regeln
//            der Runde (/gm/rules)
//   Blatt 3  die Biografie im selben Papier-Look
//
// Reine Darstellung ohne eigenen Zustand: der Anlege-Assistent zeigt damit
// die noch nicht gespeicherten Eingaben, die Charakterseite den gespeicherten
// Stand. Beide Male dieselben Blätter.
//
// Blatt 2 und 3 tragen dieselbe Star-Trek-Adventures-Aufmachung wie Blatt 1
// (der gedruckte Bogen): der Rahmen, das „STAR TREK ADVENTURES"-Logo oben links
// und der farbige Titelreiter oben rechts (wie „PERSONNEL FILE" auf dem Bogen)
// stecken im gemeinsamen DocSheet-Gerüst (siehe .pf-doc* in personnel-file.css).

// Fußzeile wie auf dem gedruckten Bogen (Blatt 1) — dieselbe Markenzeile, damit
// die Zusatzblätter erkennbar zum selben Dokument gehören.
const SHEET_FOOTER =
  "TM & © 2024 CBS Studios Inc. STAR TREK and related marks and logos " +
  "are trademarks of CBS Studios, Inc. All Rights Reserved.";

// Gemeinsames Blatt-Gerüst für Spickzettel und Biografie: Papier-Look plus die
// STA-Chrome (Rahmen, Logo, Titelreiter, Fußzeile) des Hauptblatts.
function DocSheet({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="pf-doc">
      <div className="pf-doc-frame">
        <div className="pf-doc-masthead">
          <span className="pf-doc-wordmark">Star Trek Adventures</span>
          <span className="pf-doc-mast-rule" aria-hidden="true" />
          <span className="pf-doc-tab">{title}</span>
        </div>
        <p className="pf-doc-subtitle">{subtitle}</p>
        <div className="pf-doc-content">{children}</div>
        <p className="pf-doc-footer">{SHEET_FOOTER}</p>
      </div>
    </div>
  );
}

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
  // Hausregeln der Runde für den Spickzettel (gepflegt unter /gm/rules).
  // Leer = es gibt keine, dann fällt der Abschnitt weg.
  campaignRules: CampaignRule[];
}

function TalentSheet({
  characterName,
  entries,
  talents,
  campaignRules,
}: {
  characterName: string;
  entries: string[];
  talents: Talent[];
  campaignRules: CampaignRule[];
}) {
  // Zuordnung über den Katalognamen (siehe parseTalentEntry) — ein
  // umbenanntes Talent findet seinen Regeltext also weiterhin.
  const byName = new Map(
    talents.map((talent) => [talent.name.toLowerCase(), talent]),
  );

  return (
    <DocSheet title="Cheat Sheet" subtitle={`Spickzettel · ${characterName}`}>
      <h3 className="pf-doc-heading">
        Talente <span className="pf-doc-heading-original">Talents</span>
      </h3>
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
              {talent ? (
                // Regeltext als Markdown (siehe listTalents).
                <div
                  className="pf-doc-text"
                  dangerouslySetInnerHTML={{ __html: talent.descriptionHtml }}
                />
              ) : (
                <p className="pf-doc-text">
                  Nicht im Katalog — kein Regeltext hinterlegt.
                </p>
              )}
            </div>
          );
        })
      )}

      <CoreRulesSection />
      <CampaignRulesSection rules={campaignRules} />
    </DocSheet>
  );
}

// Momentum, Bedrohung und Entschlossenheit — dieselben Regeln, die man am
// Tisch dauernd nachschlägt, direkt hinter den Talenten. Sie hängen an keinem
// Charakter, stehen also auf jedem Spickzettel gleich (siehe coreRules.ts).
function CoreRulesSection() {
  return (
    <>
      {CORE_RULES.map((section) => (
        <div key={section.title}>
          <h3 className="pf-doc-heading">
            {section.title}{" "}
            <span className="pf-doc-heading-original">{section.original}</span>
          </h3>
          {section.intro && <p className="pf-doc-intro">{section.intro}</p>}
          {section.items.map((item) => (
            <div key={item.term} className="pf-doc-rule">
              <span className="pf-doc-rule-term">{item.term}</span>
              {item.cost && (
                <span className="pf-doc-rule-cost">{item.cost}</span>
              )}
              <p className="pf-doc-rule-text">{item.text}</p>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

// Die Hausregeln der Runde, hinter den Regeln aus dem Regelwerk. Gibt es
// keine, fällt der Abschnitt ganz weg — eine leere Überschrift auf dem
// gedruckten Bogen wäre nur Platzverschwendung.
function CampaignRulesSection({ rules }: { rules: CampaignRule[] }) {
  if (rules.length === 0) return null;
  return (
    <div>
      <h3 className="pf-doc-heading">
        Eigene Regeln{" "}
        <span className="pf-doc-heading-original">House Rules</span>
      </h3>
      {rules.map((rule) => (
        <div key={rule.id} className="pf-doc-rule">
          <span className="pf-doc-rule-term">{rule.name}</span>
          {/* Der Regeltext ist Markdown; das HTML kommt bereits bereinigt aus
              markdownToHtml (siehe listCampaignRules). */}
          <div
            className="pf-doc-rule-text"
            dangerouslySetInnerHTML={{ __html: rule.bodyHtml }}
          />
        </div>
      ))}
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
    <DocSheet title="Biography" subtitle={`Biografie · ${characterName}`}>
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
    </DocSheet>
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
        campaignRules={input.campaignRules}
      />
      <BioSheet characterName={input.characterName} bioHtml={input.bioHtml} />
    </div>
  );
}
