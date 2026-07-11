"use client";
import { useMemo, useState } from "react";
import { Character } from "@/types/character";
import {
  LcarsDataRow,
  LcarsToc,
  LcarsReadingModeToggle,
  type TocHeading,
} from "@/components/lcars";
import Link from "next/link";
import CharacterPortrait from "./CharacterPortrait";
import CharacterBioEditor from "./CharacterBioEditor";
import { Viewer } from "@/lib/visibility";
import ActionsMenu from "@/components/ActionsMenu";

// ── Bio-HTML: h3 mit Anker-IDs versehen + Überschriften für das TOC sammeln ──
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildBioToc(html: string): { html: string; headings: TocHeading[] } {
  const headings: TocHeading[] = [];
  const used = new Set<string>();

  const out = html.replace(
    /<h3\b([^>]*)>([\s\S]*?)<\/h3>/gi,
    (match, attrs: string, inner: string) => {
      const text = inner.replace(/<[^>]*>/g, "").trim();

      // bestehende id übernehmen, sonst aus dem Text ableiten
      const existing = attrs.match(/\bid=["']([^"']+)["']/);
      let id = existing?.[1] ?? `bio-${slugify(text) || "abschnitt"}`;
      if (!existing) {
        let unique = id;
        let i = 2;
        while (used.has(unique)) unique = `${id}-${i++}`;
        id = unique;
      }
      used.add(id);
      headings.push({ id, text });

      return existing ? match : `<h3${attrs} id="${id}">${inner}</h3>`;
    },
  );

  return { html: out, headings };
}

function makeRng(seed: number) {
  let s = (seed || 1) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
function digits(rng: () => number, n: number): string {
  let out = "";
  for (let i = 0; i < n; i++) out += Math.floor(rng() * 10);
  return out;
}
function group(rng: () => number, a: number, b: number): string {
  return `${digits(rng, a)}-${digits(rng, b)}`;
}

function FileField({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="char-file-field">
      <span className="char-file-field-label">{label}:</span>
      <span className="char-file-field-value">{value}</span>
    </div>
  );
}

const STATUS_CONFIG = {
  active: {
    label: "Aktiv",
    color: "var(--lcars-blue)",
    bg: "rgba(154,154,255,.15)",
  },
  retired: {
    label: "Inaktiv",
    color: "var(--lcars-amber)",
    bg: "rgba(255,154,0,.15)",
  },
  deceased: {
    label: "Verstorben",
    color: "var(--lcars-red)",
    bg: "rgba(205,102,102,.15)",
  },
} as const;

function StatusBadge({ status }: { status: Character["status"] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-0.5
                 text-[12px] uppercase tracking-[.2em]"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: cfg.color }}
        aria-hidden="true"
      />
      {cfg.label}
    </span>
  );
}

const PILL_COLORS = [
  "var(--lcars-blue)",
  "var(--lcars-purple)",
  "var(--lcars-amber)",
  "var(--lcars-red)",
];
const BAR_SEGMENTS: { flex: number; color: string }[] = [
  { flex: 2, color: "var(--lcars-orange)" },
  { flex: 3, color: "var(--lcars-purple)" },
  { flex: 1, color: "var(--lcars-blue)" },
  { flex: 4, color: "var(--lcars-amber)" },
  { flex: 1, color: "var(--lcars-red)" },
];

export default function CharacterHero({
  character,
  logCount = 0,
  conversationCount = 0,
  viewer,
  owners,
  sourceMarkdown,
}: {
  character: Character;
  logCount?: number;
  conversationCount?: number;
  viewer: Viewer | null;
  owners: { id: number; name: string }[];
  // Nur gesetzt, wenn viewer === Owner (player_id) — siehe page.tsx.
  sourceMarkdown: string | null;
}) {
  const { metadata } = character;
  const [editMode, setEditMode] = useState(false);

  // Deko-Codes deterministisch aus der Charakter-ID ableiten
  const rng = makeRng(character.id * 2654435761);
  const fileNo = `${digits(rng, 4)}-${String.fromCharCode(
    65 + Math.floor(rng() * 6),
  )}`;

  // Format: NEO-01/[character.id]
  const recordId = `NEO-01/${character.id}`;
  const pills = PILL_COLORS.map((color) => ({ color, code: group(rng, 4, 3) }));
  const matrix = Array.from({ length: 15 }, () => digits(rng, 10));

  const factions = metadata.affiliation?.factions ?? [];
  const ships = metadata.affiliation?.ships ?? [];

  // Bio aufbereiten: Anker-IDs setzen + Sprungpunkte fürs TOC sammeln.
  // Memoisiert auf character.bio: ohne useMemo entstünde bei jedem Render
  // (z.B. editMode-Toggle) ein neues headings-Array, an dessen Referenz
  // LcarsToc's Scrollspy-Effect hängt — IntersectionObserver würde dadurch
  // unnötig ab-/wieder aufgebaut.
  const bio = useMemo(
    () => (character.bio ? buildBioToc(character.bio) : null),
    [character.bio],
  );

  return (
    <div className="mb-[12px] mr-[var(--lcars-elbow-size)]">
      <section className="char-file">
        {/* ── Kopfzeile: Akten-Code + Code-Pills ── */}
        <header className="char-file-head">
          <Link href="/characters" className="lcars-back-link">
            ‹ Charaktere
          </Link>
          <h2 className="char-file-fileno">Personalakte · {fileNo}</h2>
          <div className="char-file-pills">
            {pills.map((p) => (
              <span
                key={p.code}
                className="char-file-pill"
                style={{ backgroundColor: p.color }}
              >
                {p.code}
              </span>
            ))}
          </div>
        </header>

        {/* ── dekorative Zahlenmatrix ── */}
        <div className="char-file-matrix" aria-hidden="true">
          {matrix.map((n, i) => (
            <span key={i}>{n}</span>
          ))}
        </div>

        {/* ── farbiger Trennbalken ── */}
        <div className="char-file-bar" aria-hidden="true">
          {BAR_SEGMENTS.map((seg, i) => (
            <span
              key={i}
              style={{ flex: seg.flex, backgroundColor: seg.color }}
            />
          ))}
        </div>

        {/* ── Hauptraster ── */}
        <div className="char-file-grid">
          {/* Portrait + Datenfelder */}
          <div className="char-file-colmid">
            <CharacterPortrait
              portrait={character.portrait}
              name={character.name}
            />

            {/* Schnellzugriffe direkt unter dem Bild: Logs + Gespräche des
                Charakters, jeweils mit Anzahl. Gespräche verlinkt auf die
                nach diesem Teilnehmer gefilterte Dialog-Liste im Archiv. */}
            <div className="char-file-links">
              <LcarsDataRow
                value={logCount}
                label="Logs"
                href={`/characters/${character.slug}/logs`}
                color="var(--lcars-blue)"
              />
              <LcarsDataRow
                value={conversationCount}
                label="Gespräche"
                href={`/archive?cat=dialogue&participant=${character.slug}`}
                color="var(--lcars-purple)"
              />
            </div>

            <div className="char-file-data">
              <FileField label="Akten-ID" value={recordId} />
              {metadata.rank && (
                <FileField label="Rang" value={metadata.rank} />
              )}
              {metadata.species.length > 0 && (
                <FileField
                  label="Spezies"
                  value={metadata.species.join(" / ")}
                />
              )}
              {metadata.homeworld && (
                <FileField label="Heimatwelt" value={metadata.homeworld} />
              )}
              {metadata.age != null && (
                <FileField label="Alter" value={metadata.age} />
              )}
              {factions.length > 0 && (
                <FileField label="Fraktion" value={factions.join(", ")} />
              )}
              {ships.length > 0 && (
                <FileField label="Schiff" value={ships.join(", ")} />
              )}
              {/* ToDo: Divisions => Array mit join(", ") */}
              {/* {division != null && (
                <FileField label="Abteilung" value={division} />
              )} */}
            </div>

            <div className="mt-3">
              <StatusBadge status={character.status} />
            </div>

            {/* Inhaltsverzeichnis der Biografie (sticky, Scrollspy) */}
            {bio && (
              <LcarsToc
                headings={bio.headings}
                className="char-file-toc"
                ariaLabel="Biografie-Index"
              />
            )}
          </div>

          {/* Name + Biografie */}
          <div className="char-file-colend">
            <div className="flex justify-between">
              <LcarsReadingModeToggle />
              <h1 className="char-file-name">{character.name}</h1>
            </div>

            <ActionsMenu
              viewer={viewer}
              owners={owners}
              content={character}
              contentType="character"
              followType="character"
              playerId={character.player_id}
              onEdit={() => setEditMode(true)}
            />

            {sourceMarkdown != null ? (
              <CharacterBioEditor
                bioHtml={bio?.html ?? null}
                sourceMarkdown={sourceMarkdown}
                role={viewer?.role}
                character={character}
                editMode={editMode}
                onEditModeChange={setEditMode}
              />
            ) : bio ? (
              <div
                className="char-file-bio lcars-text"
                dangerouslySetInnerHTML={{ __html: bio.html }}
              />
            ) : (
              <p className="lcars-empty-state">
                Keine biografischen Daten im Archiv hinterlegt.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
