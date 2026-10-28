export const BASE_MODULE_ID = "sta2e.core";
export const BASE_MODULE_VERSION = "1.0.0";

export const BASE_CHARACTER = {
  name: "",
  species: "",
  profession: "",
  concept: "",
  upbringing: "",
  career: "",
  rank: "",
  creationMethod: "points",
  attributes: {
    control: 7,
    daring: 7,
    fitness: 7,
    insight: 7,
    presence: 7,
    reason: 7,
  },
  disciplines: {
    command: 1,
    conn: 1,
    engineering: 1,
    security: 1,
    science: 1,
    medicine: 1,
  },
  values: [],
  talents: [],
  focuses: [],
  notes: "",
};

export function newCharacter() {
  return structuredClone(BASE_CHARACTER);
}

export function validateModulePack(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Das Modul muss ein JSON-Objekt sein.");
  }
  const manifest = value.manifest;
  if (!manifest || manifest.schemaVersion !== 1) {
    throw new Error("Unbekannte Modul-Schemaversion.");
  }
  if (!/^[a-z0-9][a-z0-9._-]{2,79}$/.test(manifest.id ?? "")) {
    throw new Error("Die Modul-ID muss 3 bis 80 Kleinbuchstaben, Ziffern oder ._- enthalten.");
  }
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(manifest.version ?? "")) {
    throw new Error("Die Modulversion muss dem Format x.y.z entsprechen.");
  }
  if (typeof manifest.title !== "string" || !manifest.title.trim() || manifest.title.length > 120) {
    throw new Error("Bitte gib dem Modul einen Titel (max. 120 Zeichen).");
  }
  const serialized = JSON.stringify(value);
  if (serialized.length > 1_000_000) throw new Error("Das Modul ist größer als 1 MB.");
  const visit = (item) => {
    if (Array.isArray(item)) return item.forEach(visit);
    if (!item || typeof item !== "object") return;
    for (const [key, child] of Object.entries(item)) {
      if (/^(?:code|script|javascript|executable)$/i.test(key) || /^on[a-z]+$/i.test(key)) {
        throw new Error("Module dürfen keine ausführbaren Felder enthalten.");
      }
      visit(child);
    }
  };
  visit(value);
  for (const listName of ["attributes", "disciplines", "species", "professions", "classes"]) {
    if (value[listName] !== undefined && (!Array.isArray(value[listName]) || value[listName].length > 300)) {
      throw new Error(`Ungültige Liste „${listName}“.`);
    }
    if (Array.isArray(value[listName]) && value[listName].some((item) => {
      if (typeof item === "string") return item.length > 120;
      if (!item || typeof item !== "object" || Array.isArray(item)) return true;
      return typeof item.id !== "string" || !/^[a-z0-9][a-z0-9._-]{0,79}$/i.test(item.id) ||
        [item.label, item.name].some((label) => label !== undefined && (typeof label !== "string" || label.length > 120));
    })) throw new Error(`Ungültiger Eintrag in „${listName}“.`);
  }
  if (value.characterFields !== undefined) {
    if (!Array.isArray(value.characterFields) || value.characterFields.length > 100) throw new Error("Ungültige Zusatzfelder.");
    for (const field of value.characterFields) {
      if (!field || typeof field !== "object" || Array.isArray(field) || !/^[a-z0-9][a-z0-9._-]{0,79}$/i.test(field.id || "") ||
        typeof field.label !== "string" || field.label.length > 120 || !["text", "number", "multiline", "select"].includes(field.type)) {
        throw new Error("Ungültiges Zusatzfeld im Modul.");
      }
      if (field.type === "select" && (!Array.isArray(field.options) || field.options.length > 100 || field.options.some((option) => {
        if (typeof option === "string") return option.length > 120;
        return !option || typeof option !== "object" || Array.isArray(option) ||
          typeof option.value !== "string" || option.value.length > 120 ||
          typeof option.label !== "string" || option.label.length > 120;
      }))) {
        throw new Error("Ungültige Auswahloptionen im Modul.");
      }
    }
  }
  const methods = value.creationRules?.methods;
  if (methods !== undefined && (!Array.isArray(methods) || methods.some((method) => !["points", "ap"].includes(method)))) {
    throw new Error("creationRules.methods unterstützt nur points und ap.");
  }
  for (const ruleset of [value.creationRules?.points, value.creationRules?.ap]) {
    if (ruleset === undefined) continue;
    if (!ruleset || typeof ruleset !== "object" || Array.isArray(ruleset)) throw new Error("Ungültige Erschaffungsregeln.");
    for (const amount of Object.values(ruleset)) {
      if (!Number.isInteger(amount) || amount < 0 || amount > 100_000) throw new Error("Regelbudgets müssen ganze Zahlen zwischen 0 und 100.000 sein.");
    }
  }
  const freeCounts = value.creationRules?.freeCounts;
  if (freeCounts !== undefined) {
    if (!freeCounts || typeof freeCounts !== "object" || Array.isArray(freeCounts) || Object.values(freeCounts).some((amount) => !Number.isInteger(amount) || amount < 0 || amount > 100)) {
      throw new Error("Freikontingente müssen ganze Zahlen zwischen 0 und 100 sein.");
    }
  }
  const limits = value.creationRules?.limits;
  if (limits !== undefined) {
    if (!limits || typeof limits !== "object" || Array.isArray(limits)) throw new Error("Ungültige Wertebereiche.");
    for (const limit of Object.values(limits)) {
      if (!limit || typeof limit !== "object" || Array.isArray(limit) || Object.values(limit).some((amount) => !Number.isInteger(amount) || amount < 0 || amount > 15)) {
        throw new Error("Wertebereiche müssen ganze Zahlen zwischen 0 und 15 enthalten.");
      }
    }
  }
  return value;
}

export function displayLabel(item) {
  return item?.label || item?.name || item?.id || "";
}

export function formatModuleKey(pack) {
  return `${pack.manifest.id}@${pack.manifest.version}`;
}

export function calculateCreationBudget(data, method, rules = {}) {
  const pointMode = method === "points";
  const budgetRules = rules[pointMode ? "points" : "ap"] || {};
  const attributes = Object.values(data.attributes || {}).map((value) => Number(value) || 0);
  const disciplines = Object.values(data.disciplines || {}).map((value) => Number(value) || 0);
  let attributeCost = attributes.reduce((sum, value) => sum + value, 0);
  let disciplineCost = disciplines.reduce((sum, value) => sum + value, 0);
  if (!pointMode) {
    const apPerStep = Number(budgetRules.apPerStep ?? 10);
    const attributeMinimum = Number(rules.limits?.attributes?.minimum ?? 7);
    const disciplineMinimum = Number(rules.limits?.disciplines?.minimum ?? 1);
    attributeCost = attributes.reduce((sum, value) => {
      for (let next = attributeMinimum + 1; next <= value; next++) sum += (next - attributeMinimum) * apPerStep;
      return sum;
    }, 0);
    disciplineCost = disciplines.reduce((sum, value) => {
      for (let next = disciplineMinimum + 1; next <= value; next++) sum += next * apPerStep;
      return sum;
    }, 0);
  }
  const attributeBudget = Number(budgetRules.attributeBudget ?? (pointMode ? 56 : 320));
  const disciplineBudget = Number(budgetRules.disciplineBudget ?? (pointMode ? 16 : 320));
  const attributeRemaining = attributeBudget - attributeCost;
  const disciplineRemaining = disciplineBudget - disciplineCost;
  const violations = [];
  for (const [key, values, label] of [
    ["attributes", attributes, "Attribute"],
    ["disciplines", disciplines, "Disziplinen"],
  ]) {
    const limit = rules.limits?.[key];
    if (!limit) continue;
    if (values.some((value) => value < limit.minimum || value > limit.maximum)) violations.push(`${label}: Werte müssen zwischen ${limit.minimum} und ${limit.maximum} liegen.`);
    if (values.filter((value) => value === limit.maximum).length > limit.maximumAtMaximum) violations.push(`${label}: höchstens ${limit.maximumAtMaximum} Wert(e) auf ${limit.maximum}.`);
    if (values.filter((value) => value === limit.maximum - 1).length > limit.maximumAtSecond) violations.push(`${label}: höchstens ${limit.maximumAtSecond} Wert(e) auf ${limit.maximum - 1}.`);
  }
  if (attributeRemaining < 0 || disciplineRemaining < 0) violations.push("Das Erschaffungsbudget ist überschritten.");
  const freeCounts = rules.freeCounts || {};
  for (const [key, label] of [["values", "Werte"], ["talents", "Talente"], ["focuses", "Schwerpunkte"]]) {
    const budget = freeCounts[key];
    const count = Array.isArray(data[key]) ? data[key].length : 0;
    if (Number.isInteger(budget) && count > budget) violations.push(`${label}: ${count} eingetragen, ${budget} frei.`);
  }
  return { attributeCost, attributeBudget, attributeRemaining, disciplineCost, disciplineBudget, disciplineRemaining, violations };
}
