"use client";
import { useCallback, useState } from "react";
import { useOverlayDismiss } from "@/hooks/useOverlayDismiss";
import { ExpandIcon, XIcon } from "@/lib/icons";
import {
  ATTRIBUTE_FIELDS,
  DEPARTMENT_FIELDS,
  EXPERIENCE_OPTIONS,
  computeStress,
} from "@/lib/characterStats";
import type { CharacterStats } from "@/types/characterStats";
import {
  ATTRIBUTE_BOXES,
  DEPARTMENT_BOXES,
  DETERMINATION_POINTS,
  HEAD_BOXES,
  LIST_BOXES,
  PHOTO_BOX,
  RESISTANCE_BOX,
  STRESS_POINTS,
  STRESS_VALUE_BOX,
  boxStyle,
  pointStyle,
  type Box,
} from "@/lib/personnelFileLayout";

// Der Charakterbogen als reine ANSICHT — dieselbe Vorlage und dieselben
// Maße wie das Formular unter /user/characters/[id]/stats (siehe
// personnelFileLayout.ts, Optik personnel-file.css), nur ohne Eingabefelder:
// die Werte stehen als Text auf dem Blatt.
//
// Bewusst eine eigene Komponente statt eines readOnly-Schalters im Formular:
// das Formular führt State, Server-Action, Steigerungs-Fenster und
// Freikontingente mit sich — nichts davon gehört auf ein Blatt, das nur
// gelesen wird (und für Fremde wäre jedes davon toter, potenziell
// verwirrender Ballast im Client-Bundle).
//
// Gezeigt wird der Bogen auf /characters/[slug]/sheet: der eigenen
// Spielerin/dem eigenen Spieler und der Spielleitung.

function StaticField({
  box,
  value,
  label,
}: {
  box: Box;
  value: string;
  label: string;
}) {
  return (
    <div className="pf-static" style={boxStyle(box)} aria-label={label}>
      {value}
    </div>
  );
}

function StaticList({ box, entries }: { box: Box; entries: string[] }) {
  return (
    <div className="pf-list" style={boxStyle(box)}>
      {entries.map((entry, index) => (
        <div key={`${entry}-${index}`} className="pf-list-line">
          <span className="pf-list-text">{entry}</span>
        </div>
      ))}
    </div>
  );
}

export default function PersonnelFileView({
  characterName,
  rank,
  species,
  portrait,
  stats,
}: {
  characterName: string;
  rank: string | null;
  species: string | null;
  portrait: string | null;
  stats: CharacterStats;
}) {
  // Vollbild wie im Formular (siehe .pf-page--expanded): position:fixed,
  // Escape schließt, der Seitenhintergrund wird solange festgehalten.
  const [expanded, setExpanded] = useState(false);
  const closeExpanded = useCallback(() => setExpanded(false), []);
  useOverlayDismiss(closeExpanded, { active: expanded });

  const maxStress = computeStress(stats);
  const determination = stats.determination ?? 0;
  const experienceLabel =
    EXPERIENCE_OPTIONS.find((option) => option.value === stats.experience)
      ?.label ?? "";
  const traits = [species, stats.traits].filter(Boolean).join(" · ");

  return (
    <div className={expanded ? "pf-page pf-page--expanded" : "pf-page"}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="pf-expand-btn lcars-icon-btn"
        aria-label={expanded ? "Vollbild verlassen" : "Bogen im Vollbild"}
        title={expanded ? "Vollbild verlassen" : "Bogen im Vollbild"}
        aria-pressed={expanded}
      >
        {expanded ? <XIcon /> : <ExpandIcon />}
      </button>

      <div className="pf-sheet">
        {/* Der Bogen selbst als Grafik — reine Deko, alle Werte liegen
            darüber. Bewusst <img> statt inline-SVG: 400 KB Vektorgrafik
            würden sonst in jedem RSC-Payload mitfahren. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="pf-art"
          src="/character-sheet/personnel-file.svg"
          alt=""
          width={816}
          height={1056}
        />

        <div className="pf-form-layer">
          {portrait && (
            // Bewusst <img> statt next/image: die Portraits liegen im
            // öffentlichen Asset-Bucket unter beliebigen Hosts, für die
            // next/image eine Domain-Freigabe bräuchte.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="pf-photo"
              style={boxStyle(PHOTO_BOX)}
              src={portrait}
              alt={`Portrait von ${characterName}`}
            />
          )}

          {/* ── Kopfbereich ───────────────────────────────────────── */}
          <StaticField box={HEAD_BOXES.name} value={characterName} label="Name" />
          <StaticField
            box={HEAD_BOXES.pronouns}
            value={stats.pronouns ?? ""}
            label="Pronomen"
          />
          <StaticField box={HEAD_BOXES.rank} value={rank ?? ""} label="Rang" />
          <StaticField
            box={HEAD_BOXES.assignment}
            value={stats.assignment ?? ""}
            label="Zuweisung"
          />
          <StaticField
            box={HEAD_BOXES.characterRole}
            value={stats.characterRole ?? ""}
            label="Rolle"
          />
          <StaticField
            box={HEAD_BOXES.reputation}
            value={stats.reputation?.toString() ?? ""}
            label="Ansehen"
          />
          {/* „Species & Traits" ist auf dem Bogen EIN Kasten: die Spezies
              gehört zur Akte, die weiteren Merkmale zum Bogen. */}
          <StaticField
            box={HEAD_BOXES.traits}
            value={traits}
            label="Spezies und Merkmale"
          />
          <StaticField
            box={HEAD_BOXES.environment}
            value={stats.environment ?? ""}
            label="Herkunft"
          />
          <StaticField
            box={HEAD_BOXES.upbringing}
            value={stats.upbringing ?? ""}
            label="Erziehung"
          />
          <StaticField
            box={HEAD_BOXES.careerPath}
            value={stats.careerPath ?? ""}
            label="Laufbahn"
          />
          <StaticField
            box={HEAD_BOXES.experience}
            value={experienceLabel}
            label="Erfahrung"
          />
          {/* Der Bogen hat genau zwei Kästen für Karriere-Ereignisse. */}
          <StaticField
            box={HEAD_BOXES.careerEvent1}
            value={stats.careerEvents[0] ?? ""}
            label="Karriere-Ereignis 1"
          />
          <StaticField
            box={HEAD_BOXES.careerEvent2}
            value={stats.careerEvents[1] ?? ""}
            label="Karriere-Ereignis 2"
          />

          {/* ── Entschlossenheit, Schutz, Stress ──────────────────── */}
          {DETERMINATION_POINTS.map((point, index) => (
            <input
              key={index}
              type="checkbox"
              className="pf-check pf-check--determination"
              style={pointStyle(point)}
              checked={index < determination}
              disabled
              readOnly
              aria-label={`Entschlossenheit ${index + 1}`}
            />
          ))}

          <div
            className="pf-static pf-static--stat"
            style={boxStyle(RESISTANCE_BOX)}
            aria-label="Schutz (Protection)"
          >
            {stats.resistance?.toString() ?? ""}
          </div>

          <div
            className="pf-static pf-static--stat pf-static--stress"
            style={boxStyle(STRESS_VALUE_BOX)}
            aria-label="Maximaler Stress"
          >
            {maxStress ?? ""}
          </div>
          {STRESS_POINTS.map((point, index) => (
            <input
              key={index}
              type="checkbox"
              className={
                maxStress !== null && index < maxStress
                  ? "pf-check"
                  : "pf-check pf-check--out"
              }
              style={pointStyle(point)}
              checked={false}
              disabled
              readOnly
              aria-label={`Stress-Kästchen ${index + 1}`}
            />
          ))}

          {/* ── Attribute und Disziplinen ─────────────────────────── */}
          {ATTRIBUTE_FIELDS.map((field) => (
            <div
              key={field.key}
              className="pf-static pf-static--stat"
              style={boxStyle(ATTRIBUTE_BOXES[field.key])}
              aria-label={field.original ?? field.label}
            >
              {stats.attributes[field.key]?.toString() ?? ""}
            </div>
          ))}
          {DEPARTMENT_FIELDS.map((field) => (
            <div
              key={field.key}
              className="pf-static pf-static--stat"
              style={boxStyle(DEPARTMENT_BOXES[field.key])}
              aria-label={field.original ?? field.label}
            >
              {stats.departments[field.key]?.toString() ?? ""}
            </div>
          ))}

          {/* ── Listen ────────────────────────────────────────────── */}
          <StaticList box={LIST_BOXES.values} entries={stats.values} />
          <StaticList box={LIST_BOXES.focuses} entries={stats.focuses} />
          <StaticList box={LIST_BOXES.pastimes} entries={stats.pastimes} />
          <StaticList box={LIST_BOXES.attacks} entries={stats.attacks} />
          <StaticList box={LIST_BOXES.talents} entries={stats.talents} />
          <StaticList box={LIST_BOXES.equipment} entries={stats.equipment} />
          <StaticList
            box={LIST_BOXES.speciesAbilities}
            entries={stats.speciesAbilities}
          />
          <StaticList
            box={LIST_BOXES.specialRules}
            entries={stats.specialRules}
          />
        </div>
      </div>
    </div>
  );
}
