// src/app/characters/[slug]/CharacterHero.tsx
import { Character } from "@/types/character";

// ── Datums-Formatter ──────────────────────────────────────────────────────
function formatDate(value: string | Date | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

// ── Interne DataLine ──────────────────────────────────────────────────────
function DataLine({
  label,
  value,
  blue = false,
}: {
  label: string;
  value: string | number;
  blue?: boolean;
}) {
  return (
    <div className="flex items-center gap-0">
      {/* Label — rechtsbündig, feste Breite → alle Separatoren fluchten */}
      <span
        className="shrink-0 w-[90px] text-right pr-2 text-[11px] uppercase tracking-[.15em]"
        style={{ color: "var(--lcars-text-dim)" }}
      >
        {label}
      </span>

      {/* Separator */}
      <span
        className="shrink-0 w-[10px] h-[18px] mr-2"
        style={{ backgroundColor: "var(--lcars-orange)" }}
        aria-hidden="true"
      />

      {/* Wert */}
      <span
        className="min-w-0 truncate text-[14px] tracking-[.05em]"
        style={{
          color: blue ? "var(--lcars-text-data)" : "var(--lcars-text-contrast)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────
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
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-0.5
                 text-[11px] uppercase tracking-[.2em]"
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

// ── Hauptkomponente ───────────────────────────────────────────────────────
export default function CharacterHero({ character }: { character: Character }) {
  const { metadata } = character;
  const hasFactions =
    metadata.affiliation &&
    (metadata.affiliation.factions.length > 0 ||
      metadata.affiliation.ships.length > 0);

  return (
    <div className="mb-6">
      {/* Hero-Block: auf Mobile gestapelt, ab sm nebeneinander */}
      <div className="character-data">
        {/* ── Portrait ── */}
        <div
          className="w-full sm:w-[180px] sm:shrink-0
                        self-center sm:self-auto
                        max-w-[200px] sm:max-w-none"
        >
          <div
            className="relative w-full overflow-hidden character-portrait"
            style={{
              aspectRatio: "3 / 4",
              backgroundColor: "var(--lcars-surface)",
            }}
          >
            {character.portrait ? (
              <img
                src={character.portrait}
                alt={`Portrait von ${character.name}`}
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div
                className="w-full h-full flex flex-col items-center justify-center gap-2"
                style={{ color: "var(--lcars-text-dim)" }}
              >
                <svg
                  width="56"
                  height="68"
                  viewBox="0 0 56 68"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="28"
                    cy="20"
                    r="16"
                    fill="currentColor"
                    opacity="0.3"
                  />
                  <path
                    d="M0 68 C0 44 56 44 56 68Z"
                    fill="currentColor"
                    opacity="0.3"
                  />
                </svg>
                <span className="text-[10px] uppercase tracking-[.3em] opacity-50">
                  Kein Bild
                </span>
              </div>
            )}

            {/* Eck-Akzent */}
            <span
              className="absolute bottom-0 right-0 w-0 h-0"
              style={{
                borderStyle: "solid",
                borderWidth: "0 0 18px 18px",
                borderColor: `transparent transparent var(--lcars-amber) transparent`,
              }}
              aria-hidden="true"
            />
          </div>
        </div>

        {/* ── Infopanel ── */}
        <div className="flex flex-col min-w-0 flex-1 gap-0">
          {/* Name */}
          <h1
            className="font-bold uppercase leading-none mb-1"
            style={{
              fontSize: "clamp(22px, 4vw, 38px)",
              color: "var(--lcars-amber)",
              letterSpacing: ".12em",
            }}
          >
            {character.name}
          </h1>

          {/* Rang */}
          {metadata.rank && (
            <p
              className="text-[14px] font-semibold uppercase tracking-[.2em] mb-2.5"
              style={{ color: "var(--lcars-purple)" }}
            >
              {metadata.rank}
            </p>
          )}

          {/* Trennlinie mit Farbakzent */}
          <div
            className="relative h-[3px] rounded-full mb-3 overflow-hidden"
            style={{ backgroundColor: "var(--lcars-border)" }}
          >
            <div
              className="absolute inset-y-0 left-0 w-[45%] rounded-full"
              style={{ backgroundColor: "var(--lcars-orange)" }}
            />
          </div>

          {/* Datenzeilen */}
          <div className="flex flex-col gap-[5px] mb-3">
            {metadata.species.length > 0 && (
              <DataLine label="Spezies" value={metadata.species.join(" / ")} />
            )}
            {metadata.homeworld && (
              <DataLine label="Heimatwelt" value={metadata.homeworld} />
            )}
            {metadata.age != null && (
              <DataLine label="Alter" value={metadata.age} />
            )}
            {character.joined_at && (
              <DataLine
                label="Beitritt"
                value={formatDate(character.joined_at) ?? ""}
                blue
              />
            )}
            {character.left_at && (
              <DataLine
                label="Abgang"
                value={formatDate(character.left_at) ?? ""}
                blue
              />
            )}
          </div>

          {/* Status */}
          <div className="mb-4">
            <StatusBadge status={character.status} />
          </div>

          {/* Fraktionen & Schiffe */}
          {hasFactions && (
            <div className="flex flex-wrap gap-1.5 mt-auto">
              {metadata.affiliation!.factions.map((f) => (
                <span
                  key={f}
                  className="text-[11px] uppercase tracking-[.12em] px-2.5 py-1 border-l-[3px]"
                  style={{
                    color: "var(--lcars-blue)",
                    backgroundColor: "var(--lcars-surface)",
                    borderLeftColor: "var(--lcars-blue)",
                  }}
                >
                  {f}
                </span>
              ))}
              {metadata.affiliation!.ships.map((s) => (
                <span
                  key={s}
                  className="text-[11px] uppercase tracking-[.12em] px-2.5 py-1 border-l-[3px]"
                  style={{
                    color: "var(--lcars-purple)",
                    backgroundColor: "var(--lcars-surface)",
                    borderLeftColor: "var(--lcars-purple)",
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Scan-Deko unter dem Hero */}
      <div className="flex gap-[5px] mt-4" aria-hidden="true">
        <span
          className="h-[3px] rounded-sm flex-[2]"
          style={{ backgroundColor: "var(--lcars-orange)" }}
        />
        <span
          className="h-[3px] rounded-sm flex-[3]"
          style={{ backgroundColor: "var(--lcars-purple)" }}
        />
        <span
          className="h-[3px] rounded-sm flex-[1]"
          style={{ backgroundColor: "var(--lcars-blue)" }}
        />
        <span
          className="h-[3px] rounded-sm flex-[4]"
          style={{ backgroundColor: "var(--lcars-amber)" }}
        />
        <span
          className="h-[3px] rounded-sm flex-[1]"
          style={{ backgroundColor: "var(--lcars-border)" }}
        />
        <span
          className="h-[3px] rounded-sm flex-[1]"
          style={{ backgroundColor: "var(--lcars-border)" }}
        />
      </div>
    </div>
  );
}
