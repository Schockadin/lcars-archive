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
import TalentCheatSheet from "./TalentCheatSheet";

// Zahlenwerte als Eingabe-Strings: ein leeres Feld bedeutet „nicht gepflegt",
// nicht 0.
function toInputs<K extends string>(
  fields: readonly { key: K }[],
  values: Record<K, number | null>,
): NumberInputs {
  return Object.fromEntries(
    fields.map((field) => [field.key, values[field.key]?.toString() ?? ""]),
  );
}

// Klammer um AP-Bereich und Werte-Formular. Sie hält als einzige den State der
// Attribut- und Disziplin-Eingaben — nur so kann der AP-Bereich LIVE mitrechnen,
// während unten im Formular getippt wird (Erschaffungsbudget, Rest-AP). Lägen
// die Eingaben wie vorher im Formular, sähe der AP-Bereich immer nur den
// zuletzt gespeicherten Stand.
export default function CharacterSheet({
  userId,
  characterId,
  characterName,
  rank,
  portrait,
  species,
  stats,
  account,
  rules,
  talents,
}: {
  userId: number;
  characterId: number;
  characterName: string;
  rank: string | null;
  portrait: string | null;
  species: string | null;
  stats: CharacterStats;
  account: ApAccount;
  rules: AdvancementRules;
  talents: Talent[];
}) {
  const [attributes, setAttributes] = useState<NumberInputs>(() =>
    toInputs(ATTRIBUTE_FIELDS, stats.attributes),
  );
  // Die Talente liegen aus demselben Grund hier: der Spickzettel am Fuß des
  // Bogens und die Auswahl (Dubletten, Voraussetzungen anderer Talente) sollen
  // sofort mitziehen, wenn oben eines hinzukommt oder entfernt wird.
  const [talentEntries, setTalentEntries] = useState<string[]>(stats.talents);

  const [departments, setDepartments] = useState<NumberInputs>(() =>
    toInputs(DEPARTMENT_FIELDS, stats.departments),
  );

  // Nach einer Steigerung (AP-Bereich) oder dem Speichern liefert der Server
  // neue Werte — der lokale State muss dann nachziehen, sonst zeigte der Bogen
  // weiter den Stand von vor der Buchung (die Komponente bleibt dabei
  // montiert, React behielte ihren State also). Anpassung WÄHREND des Renders
  // statt in einem Effect, siehe React-Doku „Adjusting state when a prop
  // changes" — ein setState im Effect-Body löste einen zusätzlichen Render aus.
  const serverSnapshot = JSON.stringify([
    stats.attributes,
    stats.departments,
    stats.talents,
  ]);
  const [previousSnapshot, setPreviousSnapshot] = useState(serverSnapshot);
  if (serverSnapshot !== previousSnapshot) {
    setPreviousSnapshot(serverSnapshot);
    setAttributes(toInputs(ATTRIBUTE_FIELDS, stats.attributes));
    setDepartments(toInputs(DEPARTMENT_FIELDS, stats.departments));
    setTalentEntries(stats.talents);
  }

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
    talents: talentEntries,
  });

  return (
    <>
      <AdvancementPanel
        characterId={characterId}
        stats={liveStats}
        account={account}
        rules={rules}
        talents={talents}
        species={species}
      />

      <CharacterStatsForm
        userId={userId}
        characterId={characterId}
        characterName={characterName}
        rank={rank}
        portrait={portrait}
        stats={liveStats}
        talents={talents}
        species={species}
        creationFreeTalents={rules.creationFreeTalents}
        creationFreeValues={rules.creationFreeValues}
        creationFreeFocuses={rules.creationFreeFocuses}
        talentEntries={talentEntries}
        setTalentEntries={setTalentEntries}
        attributes={attributes}
        setAttributes={setAttributes}
        departments={departments}
        setDepartments={setDepartments}
      />

      {/* Ganz unten, nach dem Bogen: der Regeltext der eigenen Talente. */}
      <TalentCheatSheet entries={talentEntries} talents={talents} />
    </>
  );
}
