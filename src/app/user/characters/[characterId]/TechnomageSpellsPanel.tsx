"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FormError } from "@/app/_shared/FormPrimitives";
import LearnedSpellsSection from "@/app/user/characters/[characterId]/LearnedSpellsSection";
import { useToast } from "@/components/toast/ToastProvider";
import {
  TECHNOMAGE_SPELLS,
  TECHNOMAGE_SCHOOLS,
  getTechnomageSchool,
  getTechnomageSpell,
  spellPrerequisiteGroups,
  technomageSchoolLabel,
  technomageSpellDetails,
  technomageSpellExplanation,
  technomageSpellFluff,
  type TechnomageSpell,
} from "@/lib/technomageSpellCatalog";
import {
  effectiveTechnomagePowerPoints,
  getSpellPurchaseSlotCost,
  spellTreeDepth,
  technomageApForLevel,
  technomageKnownSpellLimit,
  technomageLevelFromAp,
  technomagePowerPointMaximum,
} from "@/lib/technomageSpellRules";
import type {
  CharacterStats,
  TechnomageSchool,
} from "@/types/characterStats";
import {
  buyTechnomageSpellAction,
  configureTechnomageSchoolsAction,
  updateTechnomagePowerPointsAction,
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
  const details = technomageSpellDetails(spell, primarySchool, weakSchools);

  return (
    <div
      id={"spell-tip-" + spell.id}
      role="tooltip"
      className="pointer-events-none absolute left-0 top-full z-30 mt-[6px] w-[min(360px,85vw)] rounded-[8px] border border-current/40 bg-black p-[12px] text-left text-xs leading-relaxed text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
    >
      <p className="mb-[8px] font-bold text-lcars-senary-ink">{spell.name}</p>
      {details.fields.length > 0 && (
        <dl className="mb-[8px] grid grid-cols-[auto_1fr] gap-x-[8px] gap-y-[3px]">
          {details.fields.map(({ label, value }) => (
            <div key={label} className="contents">
              <dt className="font-bold">{label}:</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="mb-[8px]">
        <strong className="block text-lcars-senary-ink">Spell-Beschreibung</strong>
        {details.mechanics}
      </p>
      <p className="mb-[8px]">
        <strong className="block text-lcars-senary-ink">Fluff</strong>
        {details.fluff}
      </p>
      {details.requirements &&
        requirementGroups.some((group) => group.length > 0) && (
          <p>
            <strong className="block text-lcars-senary-ink">
              Spell-Voraussetzungen, automatisch gelernt
            </strong>
            <span className="mt-[4px] block opacity-80">
              {requirementGroups
                .map((group) => group.map((entry) => entry.name).join(" oder "))
                .join("; ")}
            </span>
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
  availableSlots,
  reachableOnly,
}: {
  schoolId: TechnomageSchool;
  knownSpellIds: readonly string[];
  primarySchool: TechnomageSchool | null;
  weakSchools: readonly TechnomageSchool[];
  pending: boolean;
  searchQuery: string;
  availableSlots: number;
  reachableOnly: boolean;
}) {
  const spells = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return TECHNOMAGE_SPELLS.filter((spell) => spell.school === schoolId)
      .map((spell) => ({
        spell,
        slotCost: getSpellPurchaseSlotCost({
          spellId: spell.id,
          knownSpellIds,
          primarySchool,
          weakSchools,
        }),
      }))
      .filter(({ spell, slotCost }) => {
        if (
          reachableOnly &&
          (knownSpellIds.includes(spell.id) ||
            slotCost === null ||
            slotCost > availableSlots)
        ) {
          return false;
        }
        if (!query) return true;
        return [
          spell.name,
          spell.requirements,
          spell.elementalCategory ?? "",
          technomageSpellFluff(spell),
          technomageSpellExplanation(spell, primarySchool, weakSchools),
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(query);
      })
      .sort(
        (a, b) =>
          spellTreeDepth(a.spell.id, schoolId) -
            spellTreeDepth(b.spell.id, schoolId) ||
          a.spell.name.localeCompare(b.spell.name),
      );
  }, [
    schoolId,
    searchQuery,
    primarySchool,
    weakSchools,
    knownSpellIds,
    availableSlots,
    reachableOnly,
  ]);
  const known = new Set(knownSpellIds);

  return (
    <ol className="ml-[8px] flex flex-col gap-[10px] border-l-2 border-current/25 pl-[14px]">
      {spells.length === 0 && (
        <li className="list-none py-[8px] text-sm opacity-75" role="status">
          Keine passenden Spells in dieser Schule.
        </li>
      )}
      {spells.map(({ spell, slotCost }) => {
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
                    : "Stufe " +
                      (spellTreeDepth(spell.id, schoolId) + 1)}
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
                ) : slotCost === null ? (
                  <span>Nicht erreichbar</span>
                ) : (
                  <span>
                    {slotCost} {slotCost === 1 ? "Spellplatz" : "Spellplätze"}
                    {slotCost > 1 ? " inkl. Voraussetzungen" : ""}
                  </span>
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

function PowerPointTracker({
  userId,
  characterId,
  stats,
  earnedAp,
}: {
  userId: number;
  characterId: number;
  stats: CharacterStats;
  earnedAp: number;
}) {
  const [state, action, pending] = useActionState(
    updateTechnomagePowerPointsAction,
    initialActionState,
  );
  useActionFeedback(state);

  const level = technomageLevelFromAp(earnedAp);
  const maximum = technomagePowerPointMaximum(
    level,
    stats.attributes.fitness,
    stats.attributes.insight,
  );
  const current = effectiveTechnomagePowerPoints(
    stats.technomage.powerPointsCurrent,
    stats.technomage.powerPointsMaximumAtLastUpdate,
    maximum,
  );

  return (
    <div className="flex flex-col gap-[8px] rounded-[10px] border border-current/25 p-[12px]">
      <div className="flex flex-wrap items-baseline justify-between gap-[8px]">
        <div>
          <h3 className="font-bold">Power Points</h3>
          <p className="text-xs opacity-75">
            Maximum: 10 + 1d6 + Fitness-Mod. + Insight-Mod.; je weitere Stufe
            1d4 + Insight-Mod., auf Stufe 5/10/15/20 zusätzlich +3.
            Modifikator = Attributwert − 7.
          </p>
        </div>
        <p className="rounded-full border border-current/50 px-[12px] py-[6px] font-bold" role="status">
          {current} / {maximum} PP
        </p>
      </div>

      <form action={action} className="grid gap-[10px] sm:grid-cols-2">
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="characterId" value={characterId} />
        <input type="hidden" name="operation" value="spend" />
        <label className="flex flex-col gap-[4px] text-sm">
          PP ausgeben (Casting-/Maintenance-Kosten laut Spell)
          <input
            className="lcars-input w-full"
            type="number"
            name="amount"
            min={1}
            max={current}
            defaultValue={1}
            required
          />
        </label>
        <button
          type="submit"
          disabled={pending || current < 1}
          className="lcars-pill-btn--outline self-end disabled:opacity-50"
        >
          PP ausgeben
        </button>
      </form>

      <form action={action} className="grid gap-[10px] sm:grid-cols-4">
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="characterId" value={characterId} />
        <input type="hidden" name="operation" value="recover" />
        <label className="flex flex-col gap-[4px] text-sm">
          Aktivität
          <select className="lcars-input w-full" name="activity" defaultValue="meditation">
            <option value="meditation">Ruhige Meditation / Schlaf · 10 Min. je PP</option>
            <option value="light">Leichte Aktivität · 30 Min. je PP</option>
            <option value="strenuous">Anstrengung · 60 Min. je PP</option>
          </select>
        </label>
        <label className="flex flex-col gap-[4px] text-sm">
          Dauer (Minuten)
          <input
            className="lcars-input w-full"
            type="number"
            name="durationMinutes"
            min={1}
            max={10080}
            defaultValue={10}
            required
          />
        </label>
        <label className="flex flex-col gap-[4px] text-sm">
          Aufrechterhaltene Spells
          <input
            className="lcars-input w-full"
            type="number"
            name="maintainedSpellCount"
            min={0}
            max={stats.technomage.spells.length}
            defaultValue={0}
            required
          />
        </label>
        <button
          type="submit"
          disabled={pending || current >= maximum}
          className="lcars-pill-btn--outline self-end disabled:opacity-50"
        >
          PP regenerieren
        </button>
      </form>
      <p className="text-xs opacity-70">
        Je aufrechterhaltenem Spell verlängert sich das Regenerationsintervall
        um ein Basisintervall. Angefangene Intervalle bleiben als anteiliger
        Fortschritt erhalten. Schlafen während aufrechterhaltener Spells
        erfordert im Fact Book das Talent „Sleep Concentration“.
      </p>
      <FormError message={state.error} />
      {state.success && (
        <p className="text-sm text-lcars-senary-ink" role="status">
          {state.success}
        </p>
      )}
    </div>
  );
}

export default function TechnomageSpellsPanel({
  userId,
  characterId,
  stats,
  earnedAp,
}: {
  userId: number;
  characterId: number;
  stats: CharacterStats;
  earnedAp: number;
}) {
  const [schoolIndex, setSchoolIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [reachableOnly, setReachableOnly] = useState(false);
  const [state, action, pending] = useActionState(
    buyTechnomageSpellAction,
    initialActionState,
  );
  useActionFeedback(state);

  const technomage = stats.technomage;
  const level = technomageLevelFromAp(earnedAp);
  const total = technomageKnownSpellLimit(level, stats.attributes.reason);
  const learnedCount = new Set(technomage.spells).size;
  const available = Math.max(0, total - learnedCount);
  const nextLevelAp = technomageApForLevel(level + 1);
  const activeSchool = TECHNOMAGE_SCHOOLS[schoolIndex];
  const configured = Boolean(
    technomage.primarySchool && technomage.weakSchools.length === 3,
  );

  return (
    <section
      aria-labelledby="technomage-spells-title"
      className="flex flex-col gap-[12px] rounded-[12px] border border-current/30 p-[12px]"
    >
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-[8px] rounded-[8px] bg-black/90 px-[10px] py-[8px]">
        <div>
          <h2 id="technomage-spells-title" className="text-lg font-bold">
            Spells
          </h2>
          <p className="text-xs opacity-75">
            Techno-Mage-Stufe {level} · {earnedAp} AP vergeben
            {nextLevelAp === null
              ? " · höchste Stufe"
              : ` · Stufe ${level + 1} ab ${nextLevelAp} AP`}
          </p>
        </div>
        <p
          className="rounded-full border border-current/50 px-[12px] py-[6px] font-bold"
          role="status"
          aria-live="polite"
        >
          Bekannte Spells: {learnedCount} / {total} · noch {available} lernbar
        </p>
      </div>

      <p className="text-xs opacity-75">
        Das Fact Book kennt keine Spellgrade oder täglichen Slots. Die AP-Stufen
        folgen den d20-XP-Schwellen (150 XP je AP); 40 AP ergeben Stufe 4.
        Würfelwerte für Spell- und PP-Zuwachs werden als Erwartungswert
        berechnet und kumuliert gerundet. STA-2e-Modifikatoren sind jeweils
        Attributwert − 7; Reason bestimmt die Spell-Kapazität, Fitness und
        Insight das PP-Maximum.
        Bekannte Spells können mit ausreichenden PP gewirkt werden; ihre
        individuellen Casting- und Maintenance-Kosten werden bei der PP-Ausgabe
        manuell gebucht.
      </p>

      <PowerPointTracker
        userId={userId}
        characterId={characterId}
        stats={stats}
        earnedAp={earnedAp}
      />

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
              className="w-full rounded-[8px] border border-current/30 bg-black/20 px-[10px] py-[8px] placeholder:opacity-60"
            />
          </label>
          <label className="flex items-center gap-[8px] text-sm">
            <input
              type="checkbox"
              checked={reachableOnly}
              onChange={(event) => setReachableOnly(event.target.checked)}
              className="accent-lcars-primary"
            />
            Nur mit den freien Spellplätzen erreichbare Spells
          </label>
          <p className="text-xs opacity-70">
            Die Kosten berücksichtigen Spells, die beim Kauf als Voraussetzung
            automatisch mitgelernt werden.
          </p>
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
              availableSlots={available}
              reachableOnly={reachableOnly}
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
      <LearnedSpellsSection
        learnedSpellIds={technomage.spells}
        primarySchool={technomage.primarySchool}
        weakSchools={technomage.weakSchools}
      />
    </section>
  );
}
