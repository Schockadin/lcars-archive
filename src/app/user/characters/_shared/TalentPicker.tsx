"use client";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "@/lib/icons";
import { useReturnFocus } from "@/hooks/useReturnFocus";
import {
  TALENT_CATEGORIES,
  TALENT_CATEGORY_LABELS,
  talentCategoryLabel,
  formatTalentEntry,
  parseTalentEntry,
  type Talent,
} from "@/lib/talentCatalog";
import {
  checkTalentRequirement,
  type RequirementCheck,
} from "@/lib/talentRequirements";
import type { CharacterStats } from "@/types/characterStats";

// Talent-Auswahl aus dem Katalog (gepflegt unter /gm/talents). Genutzt vom
// Steigern-Panel und vom Werte-Formular des Charakterbogens — deshalb eine
// gemeinsame Komponente.
//
// Der ausgewählte Wert ist der Eintrag, wie er auf dem Bogen steht: entweder
// der Katalogname oder — nach einer Umbenennung — „Neuer Name (Originalname)".
// Der Originalname bleibt damit erhalten und Voraussetzungen anderer Talente
// erkennen ihn weiterhin (siehe talentCatalog.ts).
//
// Die Liste liegt in einem Modal-Overlay statt in einem <select>: 155 Talente
// mit Voraussetzung und Regeltext lassen sich in einem Auswahlfeld nicht
// sinnvoll durchsehen. Gleiches Overlay-Muster wie RowDetailModal.tsx
// (Portal, Escape schließt, Klick daneben schließt, Scroll-Sperre).

interface RatedTalent {
  talent: Talent;
  check: RequirementCheck;
}

function statusLabel(check: RequirementCheck): string | null {
  if (check.status === "met") return null;
  if (check.status === "unmet") {
    return `Nicht erfüllt: ${check.unmet.join(", ")}`;
  }
  return `Nicht automatisch prüfbar: ${check.unchecked.join(", ")}`;
}

export function TalentModal({
  talents,
  stats,
  species,
  taken,
  cost,
  affordable,
  onPick,
  onClose,
}: {
  talents: Talent[];
  stats: CharacterStats;
  species: string | null;
  taken: string[];
  // Was das Talent kostet (Steigern) — null während der Ersterschaffung, wo
  // Talente aus dem Freikontingent kommen.
  cost: number | null;
  // false = die Kosten sind nicht gedeckt; das Übernehmen ist dann gesperrt.
  affordable: boolean;
  onPick: (entry: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  // Standardmäßig nur Talente, deren Voraussetzungen der Charakter erfüllt.
  // Abschaltbar, weil die App nicht jede Voraussetzung entscheiden kann und
  // die Spielleitung im Zweifel etwas anderes erlaubt.
  const [onlyEligible, setOnlyEligible] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);
  const [customName, setCustomName] = useState("");

  useReturnFocus(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  // Bereits geführte Talente werden über ihren ORIGINALNAMEN erkannt — ein
  // umgetauftes Talent soll nicht ein zweites Mal wählbar sein.
  const takenOriginals = useMemo(
    () =>
      new Set(taken.map((entry) => parseTalentEntry(entry).original.toLowerCase())),
    [taken],
  );

  const rated: RatedTalent[] = useMemo(
    () =>
      talents.map((talent) => ({
        talent,
        check: checkTalentRequirement(talent.requirement, { stats, species }),
      })),
    [talents, stats, species],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rated.filter(({ talent, check }) => {
      if (takenOriginals.has(talent.name.toLowerCase())) return false;
      if (onlyEligible && check.status === "unmet") return false;
      if (category && talent.category !== category) return false;
      if (!needle) return true;
      return (
        talent.name.toLowerCase().includes(needle) ||
        (talent.requirement ?? "").toLowerCase().includes(needle) ||
        talent.description.toLowerCase().includes(needle)
      );
    });
  }, [rated, takenOriginals, onlyEligible, category, query]);

  const hiddenCount = rated.filter(
    ({ talent, check }) =>
      check.status === "unmet" && !takenOriginals.has(talent.name.toLowerCase()),
  ).length;

  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 p-[16px]"
      role="dialog"
      aria-modal="true"
      aria-label="Talent wählen"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-[760px] flex-col gap-[12px] overflow-hidden rounded-[8px] border border-lcars-border bg-lcars-surface p-[20px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-[16px]">
          <h2 className="text-lcars-primary">Talent wählen</h2>
          <button
            type="button"
            onClick={onClose}
            className="lcars-icon-btn"
            aria-label="Schließen"
          >
            <XIcon />
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-[8px]">
          <label className="flex flex-col gap-[4px] flex-1 min-w-[180px]">
            <span className="lcars-eyebrow">Suche</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, Voraussetzung, Text"
              className="lcars-input rounded-full w-full"
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-[4px]">
            <span className="lcars-eyebrow">Kategorie</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="lcars-input rounded-full"
            >
              <option value="">Alle</option>
              {TALENT_CATEGORIES.map((key) => (
                <option key={key} value={key}>
                  {TALENT_CATEGORY_LABELS[key].label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-[6px]">
            <input
              type="checkbox"
              checked={onlyEligible}
              onChange={(e) => setOnlyEligible(e.target.checked)}
            />
            <span className="text-[13px]">Nur erfüllbare</span>
          </label>
        </div>

        <p className="text-lcars-ink-dim text-[12px]">
          {visible.length} Talente
          {onlyEligible && hiddenCount > 0
            ? ` · ${hiddenCount} ausgeblendet, weil die Voraussetzungen (noch) nicht erfüllt sind`
            : ""}
        </p>

        <div className="flex flex-col gap-[4px] overflow-y-auto">
          {visible.length === 0 ? (
            <p className="lcars-empty-state">Kein Talent passt zur Suche.</p>
          ) : (
            visible.map(({ talent, check }) => {
              const isOpen = talent.id === openId;
              const note = statusLabel(check);
              return (
                <div
                  key={talent.id}
                  className="border-b border-[var(--lcars-ink-dim)]/30 pb-[6px]"
                >
                  {/* Ein Klick zeigt die Beschreibung — erst der zweite Schritt
                      („Übernehmen") setzt das Talent. */}
                  <button
                    type="button"
                    className="flex w-full flex-wrap items-baseline gap-[8px] text-left"
                    aria-expanded={isOpen}
                    onClick={() => {
                      setOpenId(isOpen ? null : talent.id);
                      setCustomName("");
                    }}
                  >
                    <span className="flex-1 min-w-[160px]">{talent.name}</span>
                    <span className="lcars-eyebrow">
                      {talentCategoryLabel(talent.category)}
                    </span>
                    {talent.requirement && (
                      <span className="text-lcars-ink-dim text-[12px]">
                        {talent.requirement}
                      </span>
                    )}
                  </button>

                  {isOpen && (
                    <div className="flex flex-col gap-[8px] pt-[6px]">
                      <p className="stat-talent-description">
                        {talent.description}
                      </p>
                      {note && (
                        <p className="text-lcars-ink-dim text-[12px]">{note}</p>
                      )}
                      {!affordable && (
                        <p className="text-lcars-ink-dim text-[12px]">
                          Dafür fehlen AP — {cost} AP nötig.
                        </p>
                      )}
                      <div className="flex flex-wrap items-end gap-[8px]">
                        <label className="flex flex-col gap-[4px] flex-1 min-w-[200px]">
                          <span className="lcars-eyebrow">
                            Eigener Name (optional)
                          </span>
                          <input
                            type="text"
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value)}
                            placeholder={talent.name}
                            className="lcars-input rounded-full w-full"
                          />
                        </label>
                        {/* Ein Klick übernimmt das Talent direkt — beim
                            Steigern samt Abbuchung, in der Erschaffung als
                            neuer Listeneintrag. Kein zweiter Schritt außerhalb
                            des Fensters. */}
                        <button
                          type="button"
                          disabled={!affordable}
                          onClick={() =>
                            onPick(formatTalentEntry(talent.name, customName))
                          }
                          className="lcars-pill-btn--outline disabled:opacity-50"
                        >
                          {cost === null
                            ? "Übernehmen"
                            : `Übernehmen · ${cost} AP`}
                        </button>
                      </div>
                      {customName.trim() && customName.trim() !== talent.name && (
                        <p className="text-lcars-ink-dim text-[12px]">
                          Auf dem Bogen steht dann:{" "}
                          {formatTalentEntry(talent.name, customName)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function TalentPicker({
  talents,
  stats,
  species = null,
  taken = [],
  cost = null,
  availableAp = null,
  disabled = false,
  buttonLabel = "Talent hinzufügen",
  onPick,
}: {
  talents: Talent[];
  // Die (live mitgeführten) Werte des Charakters — Grundlage der
  // Voraussetzungs-Prüfung.
  stats: CharacterStats;
  // Spezies der Akte, für Voraussetzungen wie „Vulcan".
  species?: string | null;
  // Einträge, die schon auf dem Bogen stehen — sie fehlen in der Auswahl.
  taken?: string[];
  // Kosten eines Talents (Steigern) bzw. null in der Ersterschaffung.
  cost?: number | null;
  // Verfügbare AP; zusammen mit cost sperrt das die Übernahme, wenn sie nicht
  // reichen. null = keine AP-Prüfung.
  availableAp?: number | null;
  disabled?: boolean;
  buttonLabel?: string;
  // Wird mit dem fertigen Eintrag aufgerufen (Katalogname oder „Neuer Name
  // (Originalname)"); das Fenster schließt sich dabei.
  onPick: (entry: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const affordable =
    cost === null || availableAp === null || availableAp >= cost;

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="lcars-pill-btn--outline self-start disabled:opacity-50"
      >
        {buttonLabel}
      </button>

      {open && (
        <TalentModal
          talents={talents}
          stats={stats}
          species={species}
          taken={taken}
          cost={cost}
          affordable={affordable}
          onPick={(entry) => {
            setOpen(false);
            onPick(entry);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
