"use client";
import { useState } from "react";
import {
  ATTRIBUTE_FIELDS,
  DEPARTMENT_FIELDS,
  parseCharacterStats,
} from "@/lib/characterStats";
import type { AdvancementRules } from "@/lib/advancement";
import type { ApAccount } from "@/lib/apReasons";
import type { Talent } from "@/lib/talentCatalog";
import type { CharacterStats } from "@/types/characterStats";
import CharacterStatsForm, { type NumberInputs } from "./CharacterStatsForm";
import AdvancementPanel from "./AdvancementPanel";

// Klammer um AP-Bereich und Werte-Formular. Sie hält als einzige den State der
// Attribut- und Disziplin-Eingaben — nur so kann der AP-Bereich LIVE mitrechnen,
// während unten im Formular getippt wird (Erschaffungsbudget, Rest-AP). Lägen
// die Eingaben wie vorher im Formular, sähe der AP-Bereich immer nur den
// zuletzt gespeicherten Stand.
export default function CharacterSheet({
  userId,
  characterId,
  characterName,
  portrait,
  stats,
  account,
  rules,
  talents,
}: {
  userId: number;
  characterId: number;
  characterName: string;
  portrait: string | null;
  stats: CharacterStats;
  account: ApAccount;
  rules: AdvancementRules;
  talents: Talent[];
}) {
  const [attributes, setAttributes] = useState<NumberInputs>(() =>
    Object.fromEntries(
      ATTRIBUTE_FIELDS.map((field) => [
        field.key,
        stats.attributes[field.key]?.toString() ?? "",
      ]),
    ),
  );
  const [departments, setDepartments] = useState<NumberInputs>(() =>
    Object.fromEntries(
      DEPARTMENT_FIELDS.map((field) => [
        field.key,
        stats.departments[field.key]?.toString() ?? "",
      ]),
    ),
  );

  // Der gespeicherte Stand mit den gerade eingetippten Zahlen. parseCharacterStats
  // normalisiert dabei wie überall sonst (leeres Feld → null, Unsinn → null), so
  // dass die Budget-Rechnung nie über einen halb getippten Wert stolpert.
  //
  // Nach dem Festschreiben sind beide Blöcke schreibgeschützt — live und
  // gespeichert sind dann zwangsläufig identisch, und die Steigern-Knöpfe
  // rechnen weiterhin gegen den echten Stand.
  const liveStats = parseCharacterStats({
    ...stats,
    attributes: { ...stats.attributes, ...attributes },
    departments: { ...stats.departments, ...departments },
  });

  return (
    <>
      <AdvancementPanel
        characterId={characterId}
        stats={liveStats}
        account={account}
        rules={rules}
        talents={talents}
      />

      <CharacterStatsForm
        userId={userId}
        characterId={characterId}
        characterName={characterName}
        portrait={portrait}
        stats={stats}
        talents={talents}
        attributes={attributes}
        setAttributes={setAttributes}
        departments={departments}
        setDepartments={setDepartments}
      />
    </>
  );
}
