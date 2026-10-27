"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FormError } from "@/app/_shared/FormPrimitives";
import { useToast } from "@/components/toast/ToastProvider";
import {
  TECHNOMAGE_SPELLS,
  TECHNOMAGE_SCHOOLS,
  getTechnomageSchool,
  getTechnomageSpell,
  spellPrerequisiteGroups,
  technomageSchoolLabel,
  technomageSpellExplanation,
  technomageSpellFluff,
  technomageSpellSlotTotal,
  type TechnomageSpell,
} from "@/lib/technomageSpellCatalog";
import {
  spellTreeDepth,
} from "@/lib/technomageSpellRules";
import type {
  CharacterStats,
  TechnomageSchool,
} from "@/types/characterStats";
import type { TechnomageSpellSlotRules } from "@/lib/technomageSpellSlotRules";
import {
  buyTechnomageSpellAction,
  configureTechnomageSchoolsAction,
  markTechnomageSlotMilestoneAction,
  type TechnomageActionState,
} from "../_shared/technomageActions";

const initialActionState: TechnomageActionState = {};

function useActionFeedback(state: TechnomageActionState) {
  const { showToast } = useToast();
  const router = useRouter();
  useEffect(() => {
    if (state.error) {
      showToast(state.error, { kind: "error" });
    } else if (state.success) {
      showToast(state.success, { kind: "success" });
      router.refresh();
    }
  }, [router, showToast, state]);
}

function SchoolSetup({
  userId,
  characterId,
}: {
  userId: number;
  characterId: number;
}) {
  const [state, action, pending] = useActionState(
    configureTechnomageSchoolsAction,
    initialActionState,
  );
  const [primary, setPrimary] = useState("");
  const [weak, setWeak] = useState(["", "", ""]);
  useActionFeedback(state);

  return (
    <form
      action={action}
      className="flex flex-col gap-[12px] rounded-[10px] border border-current/25 p-[12px]"
    >
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="characterId" value={characterId} />
      <div>
        <h3 className="font-bold">Schulen festlegen</h3>
        <p className="text-sm opacity-80">
          Wähle einmalig eine Primärschule und drei schwache Schulen. Die
          übrigen Schulen gelten als Standard.
        </p>
      </div>
      <label className="flex flex-col gap-[4px] text-sm">
        Primärschule
        <select
          name="primarySchool"
          value={primary}
          onChange={(event) => {
            const value = event.target.value;
            setPrimary(value);
            setWeak((current) =>
              current.map((school) => (school === value ? "" : school)),
            );
          }}
          required
          className="lcars-input w-full"
        >
          <option value="" disabled>
            Schule auswählen
          </option>
          {TECHNOMAGE_SCHOOLS.map((school) => (
            <option key={school.id} value={school.id}>
              {school.label} ({school.original})
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-[10px] sm:grid-cols-3">
        {weak.map((value, index) => (
          <label
            key={index}
            className="flex flex-col gap-[4px] text-sm"
          >
            Schwache Schule {index + 1}
            <select
              name="weakSchool"
              value={value}
              onChange={(event) =>
                setWeak((current) =>
                  current.map((school, position) =>
                    position === index ? event.target.value : school,
                  ),
                )
              }
              required
              className="lcars-input w-full"
            >
              <option value="" disabled>
                Schule auswählen
              </option>
              {TECHNOMAGE_SCHOOLS.map((school) => (
                <option
                  key={school.id}
                  value={school.id}
                  disabled={
                    school.id === primary ||
                    (weak.includes(school.id) && value !== school.id)
                  }
                >
                  {school.label} ({school.original})
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="lcars-pill-btn--outline self-start disabled:opacity-50"
      >
        {pending ? "Wird gespeichert…" : "Schulen speichern"}
      </button>
      <FormError message={state.error} />
    </form>
  );
}

function SpellTooltip({
  spellId,
  primarySchool,
  weakSchools,
}: {
  spellId: string;
  primarySchool: TechnomageSchool | null;
  weakSchools: readonly TechnomageSchool[];
}) {
  const spell = getTechnomageSpell(spellId);
  if (!spell) return null;
  const requirementGroups = spellPrerequisiteGroups(spell.id).map((group) =>
    group.map(getTechnomageSpell).filter((entry) => entry !== undefined),
  );

  return (
    <div
      id={"spell-tip-" + spell.id}
      role="tooltip"
      className="pointer-events-none absolute left-0 top-full z-30 mt-[6px] w-[min(360px,85vw)] rounded-[8px] border border-current/40 bg-black p-[12px] text-left text-xs leading-relaxed text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
    >
      <p className="mb-[8px]">
        <strong className="block text-lcars-senary-ink">Fluff</strong>
        {technomageSpellFluff(spell)}
      </p>
      <p className="mb-[8px]">
        <strong className="block text-lcars-senary-ink">Im Spiel · STA 2e</strong>
        {technomageSpellExplanation(spell, primarySchool, weakSchools)}
      </p>
      {spell.requirements.toLowerCase() !== "none" && (
        <p>
          <strong className="block text-lcars-senary-ink">
            Voraussetzungen aus dem Fact Book
          </strong>
          {spell.requirements}
          {requirementGroups.some((group) => group.length > 0) && (
            <span className="mt-[4px] block opacity-80">
              Spell-Voraussetzungen, automatisch gelernt:{" "}
              {requirementGroups
                .map((group) => group.map((entry) => entry.name).join(" oder "))
                .join("; ")}
            </span>
          )}
        </p>
      )}
      {spell.elementalCategory && (
        <p className="mt-[6px] opacity-80">
          Elementarkategorie: {spell.elementalCategory}
        </p>
      )}
      <p className="mt-[6px] opacity-60">
        Fact Book, S. {spell.sourcePage}
      </p>
    </div>
  );
}

function SpellTree({
  schoolId,
  knownSpellIds,
  primarySchool,
  weakSchools,
  pending,
  searchQuery,
}: {
  schoolId: TechnomageSchool;
  knownSpellIds: readonly string[];
  primarySchool: TechnomageSchool | null;
  weakSchools: readonly TechnomageSchool[];
  pending: boolean;
  searchQuery: string;
}) {
  const spells = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return TECHNOMAGE_SPELLS.filter((spell) => {
      if (spell.school !== schoolId) return false;
      if (!query) return true;
      const searchable = [
        spell.name,
        spell.requirements,
        spell.elementalCategory ?? "",
        technomageSpellFluff(spell),
        technomageSpellExplanation(spell, primarySchool, weakSchools),
      ]
        .join(" ")
        .toLocaleLowerCase();
      return searchable.includes(query);
    }).sort(
      (a, b) =>
        spellTreeDepth(a.id, schoolId) - spellTreeDepth(b.id, schoolId) ||
        a.name.localeCompare(b.name),
    );
  }, [schoolId, searchQuery, primarySchool, weakSchools]);
  const known = new Set(knownSpellIds);

  return (
    <ol className="ml-[8px] flex flex-col gap-[10px] border-l-2 border-current/25 pl-[14px]">
      {spells.length === 0 && (
        <li className="list-none py-[8px] text-sm opacity-75" role="status">
          Keine passenden Spells in dieser Schule.
        </li>
      )}
      {spells.map((spell) => {
        const learned = known.has(spell.id);
        const prerequisiteGroups = spellPrerequisiteGroups(spell.id);
        const prerequisiteIds = prerequisiteGroups.flat();
        const foreignDependencies = prerequisiteIds
          .map((id) => getTechnomageSpell(id))
          .filter(
            (entry): entry is TechnomageSpell =>
              entry !== undefined && entry.school !== schoolId,
          );
        const localRequirementGroups = prerequisiteGroups
          .map((group) =>
            group
              .map((id) => getTechnomageSpell(id))
              .filter(
                (entry): entry is TechnomageSpell =>
                  entry !== undefined && entry.school === schoolId,
              ),
          )
          .filter((group) => group.length > 0);
        return (
          <li key={spell.id} className="group relative">
            <span
              aria-hidden="true"
              className="absolute -left-[16px] top-[17px] h-[2px] w-[14px] bg-current/30"
            />
            <button
              type="submit"
              name="spellId"
              value={spell.id}
              disabled={learned || pending}
              aria-describedby={"spell-tip-" + spell.id}
              className={
                "flex w-full items-center justify-between gap-[8px] rounded-[8px] border p-[10px] text-left " +
                (learned
                  ? "border-lcars-senary-ink/70 bg-lcars-senary-ink/10"
                  : "border-current/25 hover:border-current/60") +
                " disabled:cursor-default"
              }
            >
              <span className="min-w-0">
                <strong className="block">{spell.name}</strong>
                <span className="block text-xs opacity-70">
                  {schoolId === "elements" && spell.elementalCategory
                    ? spell.elementalCategory
                    : "Stufe " + (spellTreeDepth(spell.id, schoolId) + 1)}
                </span>
                {localRequirementGroups.length > 0 && (
                  <span className="block text-[11px] opacity-70">
                    Voraussetzung:{" "}
                    {localRequirementGroups
                      .map((group) => group.map((entry) => entry.name).join(" oder "))
                      .join(" + ")}
                  </span>
                )}
              </span>
              <span className="flex shrink-0 items-center gap-[6px] text-xs">
                {foreignDependencies.length > 0 && (
                  <span
                    className="rounded border border-current/30 px-[5px] py-[2px]"
                    title={foreignDependencies
                      .map(
                        (entry) =>
                          entry.name + " · " + technomageSchoolLabel(entry.school),
                      )
                      .join(", ")}
                  >
                    ↗ {foreignDependencies.length} fremd
                  </span>
                )}
                {learned ? (
                  <span aria-label="Gelernt">✓ Gelernt</span>
                ) : (
                  <span>Lernen</span>
                )}
              </span>
            </button>
            <SpellTooltip
              spellId={spell.id}
              primarySchool={primarySchool}
              weakSchools={weakSchools}
            />
          </li>
        );
      })}
    </ol>
  );
}

export default function TechnomageSpellsPanel({
  userId,
  characterId,
  stats,
  earnedAp,
  slotRules,
}: {
  userId: number;
  characterId: number;
  stats: CharacterStats;
  earnedAp: number;
  slotRules: TechnomageSpellSlotRules;
}) {
  const [schoolIndex, setSchoolIndex] = useState(0);
  const [state, action, pending] = useActionState(
    buyTechnomageSpellAction,
    initialActionState,
  );
  const [milestoneState, milestoneAction, milestonePending] = useActionState(
    markTechnomageSlotMilestoneAction,
    initialActionState,
  );
  const [searchQuery, setSearchQuery] = useState("");
  useActionFeedback(state);
  useActionFeedback(milestoneState);

  const technomage = stats.technomage;
  const total = technomageSpellSlotTotal(
    technomage.slotProgress,
    stats.attributes.reason,
    earnedAp,
    slotRules,
  );
  const learnedCount = new Set(technomage.spells).size;
  const available = Math.max(0, total - learnedCount);
  const activeSchool = TECHNOMAGE_SCHOOLS[schoolIndex];
  const configured = Boolean(
    technomage.primarySchool && technomage.weakSchools.length === 3,
  );

  return (
    <section
      aria-labelledby="technomage-spells-title"
      className="flex flex-col gap-[12px] rounded-[12px] border border-current/30 p-[12px]"
    >
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-[8px] rounded-[8px] border border-lcars-primary/50 bg-lcars-surface px-[10px] py-[8px] text-lcars-text shadow-md">
        <div>
          <h2 id="technomage-spells-title" className="text-lg font-bold">
            Spells
          </h2>
          <p className="text-xs opacity-75">
            Jeder Spell belegt einen Platz. Erschaffung, Organellen,
            FTL-Attunement und je {slotRules.apThreshold} verdiente AP geben Slots; jede Stufe nutzt
            den damals gespeicherten Verstand-Wert.
          </p>
        </div>
        <p
          className="rounded-full border border-lcars-secondary/70 bg-lcars-secondary/15 px-[12px] py-[6px] font-bold"
          role="status"
          aria-live="polite"
        >
          Spellplätze: {available} / {total} frei
        </p>
      </div>

      <div className="grid gap-[8px] sm:grid-cols-2">
        {([
          {
            id: "organelles",
            label: "Organellen",
            reason: technomage.slotProgress.organellesReason,
          },
          {
            id: "ftlAttunement",
            label: "FTL-Attunement",
            reason: technomage.slotProgress.ftlAttunementReason,
          },
        ] as const).map((milestone) => (
          <div
            key={milestone.id}
            className="flex flex-wrap items-center justify-between gap-[8px] rounded-[8px] border border-lcars-border bg-lcars-surface px-[10px] py-[8px]"
          >
            <p className="text-sm">
              <strong>{milestone.label}</strong>
              {milestone.reason !== null
                ? " · erhalten · Verstand " + milestone.reason
                : " · noch nicht erfasst"}
            </p>
            {milestone.reason === null && (
              <form action={milestoneAction}>
                <input type="hidden" name="userId" value={userId} />
                <input type="hidden" name="characterId" value={characterId} />
                <button
                  type="submit"
                  name="milestone"
                  value={milestone.id}
                  disabled={milestonePending}
                  className="lcars-pill-btn--outline text-xs disabled:opacity-50"
                >
                  {milestonePending
                    ? "Speichert …"
                    : milestone.label + " erhalten markieren"}
                </button>
              </form>
            )}
          </div>
        ))}
      </div>
      <FormError message={milestoneState.error} />

      <div className="flex flex-wrap gap-[6px] text-xs">
        {TECHNOMAGE_SCHOOLS.map((school) => (
          <span
            key={school.id}
            className={
              "rounded-full border px-[8px] py-[4px] " +
              (school.id === technomage.primarySchool
                ? "border-lcars-senary-ink text-lcars-senary-ink"
                : technomage.weakSchools.includes(school.id)
                  ? "border-current/40 opacity-70"
                  : "border-current/20 opacity-80")
            }
          >
            {school.label}
            {school.id === technomage.primarySchool
              ? " · Primär"
              : technomage.weakSchools.includes(school.id)
                ? " · Schwach"
                : ""}
          </span>
        ))}
      </div>

      {!configured ? (
        <SchoolSetup userId={userId} characterId={characterId} />
      ) : (
        <>
          <p className="text-sm">
            Primär:{" "}
            {getTechnomageSchool(technomage.primarySchool)?.label ?? "—"} ·
            Schwach:{" "}
            {technomage.weakSchools
              .map((school) => getTechnomageSchool(school)?.label ?? school)
              .join(", ")}
          </p>
          <div
            className="flex items-center gap-[8px]"
            aria-label="Spell-Schulen"
          >
            <button
              type="button"
              aria-label="Vorherige Schule"
              onClick={() =>
                setSchoolIndex(
                  (current) =>
                    (current + TECHNOMAGE_SCHOOLS.length - 1) %
                    TECHNOMAGE_SCHOOLS.length,
                )
              }
              className="lcars-pill-btn--outline"
            >
              ‹
            </button>
            <div
              role="tablist"
              aria-label="Techno-Magie-Schulen"
              className="flex min-w-0 flex-1 gap-[6px] overflow-x-auto py-[2px]"
            >
              {TECHNOMAGE_SCHOOLS.map((school, index) => (
                <button
                  key={school.id}
                  type="button"
                  role="tab"
                  aria-selected={schoolIndex === index}
                  onClick={() => setSchoolIndex(index)}
                  className={
                    "whitespace-nowrap rounded-full border px-[10px] py-[6px] text-sm " +
                    (schoolIndex === index
                      ? "border-lcars-senary-ink bg-lcars-senary-ink/15"
                      : "border-current/25 opacity-75")
                  }
                >
                  {school.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-label="Nächste Schule"
              onClick={() =>
                setSchoolIndex(
                  (current) => (current + 1) % TECHNOMAGE_SCHOOLS.length,
                )
              }
              className="lcars-pill-btn--outline"
            >
              ›
            </button>
          </div>
          <p className="text-sm opacity-75">
            {activeSchool.label} · {activeSchool.original} ·{" "}
            {
              TECHNOMAGE_SPELLS.filter(
                (spell) => spell.school === activeSchool.id,
              ).length
            }{" "}
            Spells
          </p>
          <label className="flex flex-col gap-[4px] text-sm">
            Spell-Liste durchsuchen
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Name, Voraussetzung oder STA-Mechanik"
              className="w-full rounded-[8px] border border-lcars-border bg-lcars-surface px-[10px] py-[8px] text-lcars-text placeholder:opacity-60"
            />
          </label>
          <form action={action} className="flex flex-col gap-[10px]">
            <input type="hidden" name="userId" value={userId} />
            <input type="hidden" name="characterId" value={characterId} />
            <SpellTree
              schoolId={activeSchool.id}
              knownSpellIds={technomage.spells}
              primarySchool={technomage.primarySchool}
              weakSchools={technomage.weakSchools}
              pending={pending}
              searchQuery={searchQuery}
            />
            <FormError message={state.error} />
          </form>
          {state.success && (
            <p className="text-sm text-lcars-senary-ink" role="status">
              {state.success}
            </p>
          )}
        </>
      )}
    </section>
  );
}
