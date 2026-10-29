import { getServerModules, pullChanges, publishModule, pushMutations } from "./api.js";
import { BASE_CHARACTER, BASE_MODULE_ID, BASE_MODULE_VERSION, calculateCreationBudget, displayLabel, formatModuleKey, newCharacter, validateModulePack } from "./domain.js";
import { allCharacters, allModules, applyRemoteChange, applySyncResult, deleteModule, getCharacter, getOutbox, getSetting, markOutboxInflight, openStore, resetInflight, resolveConflict, saveCharacter, saveModule, setSetting } from "./storage.js";

const byId = (id) => document.getElementById(id);
const form = byId("character-form");
const toast = byId("toast");
const state = { selectedId: null, selectedCharacter: null, modules: [], serverModules: [], activeModules: [], canManageModules: false, canManageCharacters: false, canShareCampaign: false, currentUserId: null, syncing: false, toastTimer: null, installPrompt: null, catalogSelections: { talents: [], focuses: [] }, catalogType: null, catalogOpenId: null, spellSchool: "defence" };
const REMOVED_BUNDLED_MODULES_KEY = "removedBundledModules";
const embeddedModuleKeys = new Set();
const attributeFallback = ["control", "daring", "fitness", "insight", "presence", "reason"].map((id) => ({ id, label: id }));
const disciplineFallback = ["command", "conn", "engineering", "security", "science", "medicine"].map((id) => ({ id, label: id }));
const DISCIPLINE_LABELS = { command: ["Command", "Kommando"], conn: ["Conn", "Steuerung"], engineering: ["Engineering", "Technik"], security: ["Security", "Sicherheit"], science: ["Science", "Wissenschaft"], medicine: ["Medicine", "Medizin"] };
const ATTRIBUTE_LABELS = { control: ["Control", "Kontrolle"], daring: ["Daring", "Wagemut"], fitness: ["Fitness", "Fitness"], insight: ["Insight", "Einsicht"], presence: ["Presence", "Präsenz"], reason: ["Reason", "Verstand"] };
const TALENT_CATEGORIES = ["general", "species", "augment", "esoteric", "command", "conn", "engineering", "security", "science", "medicine"];
const TALENT_CATEGORY_LABELS = { general: "Allgemein", species: "Spezies & Kultur", augment: "Augment & Kybernetik", esoteric: "Esoterisch", command: "Kommando", conn: "Steuerung", engineering: "Technik", security: "Sicherheit", science: "Wissenschaft", medicine: "Medizin" };
const TALENT_CATEGORY_EN = { general: "General", species: "Species & Culture", augment: "Augment & Cybernetic", esoteric: "Esoteric", command: "Command", conn: "Conn", engineering: "Engineering", security: "Security", science: "Science", medicine: "Medicine" };
const TECHNOMAGE_SCHOOLS = [{ id: "defence", en: "Defence", de: "Abwehr" }, { id: "elements", en: "Elements", de: "Elemente" }, { id: "conjuration", en: "Conjuration", de: "Beschwörung" }, { id: "movement", en: "Movement", de: "Bewegung" }, { id: "healing", en: "Healing", de: "Heilung" }, { id: "enhancement", en: "Enhancement", de: "Verstärkung" }, { id: "creation", en: "Creation", de: "Erschaffung" }];
const DEFAULT_TECHNOMAGE_SLOT_RULES = { baseSlots: 5, reasonAttribute: "reason", reasonBaseline: 7, bonusBase: 2.5, talentBonusIds: ["talent.organells", "talent.chrysalis-technomage", "talent.ftl-attunement"], advancementApStep: 20, rounding: "ceil" };
const TECHNOMAGE_STATE_KEY = "sta2e.technomage.spell-state";

function setTheme(theme) {
  const value = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = value;
  try { localStorage.setItem("sta-char-editor-theme", value); } catch { /* Theme still applies for this session. */ }
  const toggle = byId("theme-toggle");
  toggle.textContent = value === "light" ? "Dark theme / Dunkles Thema" : "Light theme / Helles Thema";
  toggle.setAttribute("aria-pressed", String(value === "light"));
  document.querySelector("meta[name='theme-color']")?.setAttribute("content", value === "light" ? "#f3f6fa" : "#090d17");
}

function showToast(message, kind = "") {
  toast.textContent = message;
  toast.className = `toast visible ${kind}`;
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.remove("visible"), 3600);
}

function setConnection(text, tone = "") {
  const pill = byId("connection-status");
  pill.textContent = text;
  pill.className = `status-pill ${tone}`;
}

function activeModulePacks() {
  const activeKeys = new Set(state.activeModules.map((item) => `${item.moduleId}@${item.moduleVersion}`));
  const stored = localModulesForProfile().map((entry) => entry.pack);
  const active = stored.filter((pack) => activeKeys.has(formatModuleKey(pack)) && (pack.manifest.id !== BASE_MODULE_ID || pack.manifest.version === BASE_MODULE_VERSION));
  if (!active.some((pack) => pack.manifest.id === BASE_MODULE_ID)) {
    const base = stored.find((pack) => pack.manifest.id === BASE_MODULE_ID && pack.manifest.version === BASE_MODULE_VERSION) || stored.find((pack) => pack.manifest.id === BASE_MODULE_ID) || localModulesForProfile()[0]?.pack;
    if (base) active.unshift(base);
  }
  return active;
}

function allAvailablePacks() {
  const byKey = new Map(localModulesForProfile().map((entry) => [formatModuleKey(entry.pack), entry.pack]));
  for (const serverModule of state.serverModules) byKey.set(formatModuleKey(serverModule.pack), serverModule.pack);
  return [...byKey.values()];
}

function localModulesForProfile() {
  return state.modules.filter((entry) => entry.scope !== "private" || entry.ownerUserId == null || state.currentUserId == null || entry.ownerUserId === state.currentUserId);
}

function selectedModulePacks() {
  const versions = selectedModuleVersions();
  const packs = allAvailablePacks().filter((pack) => versions[pack.manifest.id] === pack.manifest.version);
  if (!packs.some((pack) => pack.manifest.id === BASE_MODULE_ID)) {
    const base = allAvailablePacks().find((pack) => pack.manifest.id === BASE_MODULE_ID);
    if (base) packs.unshift(base);
  }
  packs.sort((left, right) => left.manifest.id === BASE_MODULE_ID ? -1 : right.manifest.id === BASE_MODULE_ID ? 1 : 0);
  return packs;
}

function rulesFromModules(packs = selectedModulePacks()) {
  const merge = (target, source) => {
    const output = { ...target };
    for (const [key, value] of Object.entries(source || {})) {
      output[key] = value && typeof value === "object" && !Array.isArray(value)
        ? merge(output[key] && typeof output[key] === "object" ? output[key] : {}, value)
        : value;
    }
    return output;
  };
  return [...packs]
    .sort((left, right) => left.manifest.id === BASE_MODULE_ID ? -1 : right.manifest.id === BASE_MODULE_ID ? 1 : 0)
    .reduce((result, pack) => merge(result, pack.creationRules), {});
}

function fieldsFromModules(name, fallback) {
  const seen = new Set();
  const result = [];
  for (const pack of selectedModulePacks()) {
    for (const item of pack[name] || []) {
      if (!item?.id || seen.has(item.id)) continue;
      seen.add(item.id);
      result.push({ id: String(item.id), label: item.label || item.name || item.id, original: item.original || displayLabel(item) });
    }
  }
  return result.length ? result : fallback;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function belongsToActiveProfile(record) {
  if (!record) return false;
  if (record.visibility === "campaign") return state.currentUserId == null || state.canShareCampaign;
  if (record.ownerUserId == null || state.currentUserId == null) return true;
  return record.ownerUserId === state.currentUserId;
}

function showPanel(name) {
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.panel === name));
  document.querySelectorAll(".panel").forEach((panel) => panel.classList.toggle("active", panel.id === `panel-${name}`));
}

function numericInput(item, group, value, minimum, maximum) {
  const initial = Number.isInteger(value) ? value : minimum;
  const [english, german] = group === "attributes" ? (ATTRIBUTE_LABELS[item.id] || [item.original || item.label, item.label]) : (DISCIPLINE_LABELS[item.id] || [item.original || item.label, item.label]);
  return `<label class="numeric-field"><span><span class="label-primary">${escapeHtml(english)}</span><small class="label-secondary" data-stat-cost="${group}.${escapeHtml(item.id)}">${escapeHtml(german)}</small></span><input type="number" min="${minimum}" max="${maximum}" step="1" name="${group}.${escapeHtml(item.id)}" value="${initial}" inputmode="numeric" aria-label="${escapeHtml(english)} / ${escapeHtml(german)}" /></label>`;
}

function statApCost(group, value, minimum, apPerStep) {
  if (group === "attributes") return Math.max(0, (value - minimum) * (value - minimum + 1) / 2) * apPerStep;
  return Math.max(0, (value * (value + 1) - minimum * (minimum + 1)) / 2) * apPerStep;
}

function renderStatFields(data = BASE_CHARACTER) {
  const attributes = fieldsFromModules("attributes", attributeFallback);
  const disciplines = fieldsFromModules("disciplines", disciplineFallback);
  const rules = rulesFromModules();
  const attributeRule = rules.limits?.attributes || { minimum: 0, maximum: 15 };
  const disciplineRule = rules.limits?.disciplines || { minimum: 0, maximum: 15 };
  byId("attribute-fields").innerHTML = attributes.map((item) => numericInput(item, "attributes", data.attributes?.[item.id], attributeRule.minimum, attributeRule.maximum)).join("");
  byId("discipline-fields").innerHTML = disciplines.map((item) => numericInput(item, "disciplines", data.disciplines?.[item.id], disciplineRule.minimum, disciplineRule.maximum)).join("");
  updateTotals();
}

function updateTotals() {
  const totals = {};
  for (const group of ["attributes", "disciplines"]) {
    const total = [...form.querySelectorAll(`[name^="${group}."]`)].reduce((sum, input) => sum + (Number(input.value) || 0), 0);
    byId(group === "attributes" ? "attribute-total" : "discipline-total").textContent = String(total);
    totals[group] = total;
  }
  const versions = selectedModuleVersions();
  const packs = allAvailablePacks().filter((pack) => versions[pack.manifest.id] === pack.manifest.version);
  const rules = rulesFromModules(packs);
  const method = form.elements.namedItem("creationMethod")?.value || rules.defaultMethod || "points";
  const budget = calculateCreationBudget(readForm().data, method, rules);
  const pointBudget = method === "points";
  const apPerStep = Number(rules.ap?.apPerStep ?? 10);
  for (const input of form.querySelectorAll("input[name^='attributes.'], input[name^='disciplines.']")) {
    const [group, id] = input.name.split(".");
    const minimum = Number(rules.limits?.[group]?.minimum ?? (group === "attributes" ? 7 : 1));
    const node = form.querySelector(`[data-stat-cost="${group}.${id}"]`);
    if (node) node.textContent = pointBudget ? `${input.value} points / Punkte` : `${statApCost(group, Number(input.value) || minimum, minimum, apPerStep)} AP`;
  }
  byId("attribute-budget").textContent = pointBudget
    ? `${budget.attributeCost}/${budget.attributeBudget} Punkte · ${budget.attributeRemaining} übrig`
    : `AP ${budget.attributeCost}/${budget.attributeBudget} · ${budget.attributeRemaining} übrig`;
  byId("discipline-budget").textContent = pointBudget
    ? `${budget.disciplineCost}/${budget.disciplineBudget} Punkte · ${budget.disciplineRemaining} übrig`
    : `AP ${budget.disciplineCost}/${budget.disciplineBudget} · ${budget.disciplineRemaining} übrig`;
  byId("attribute-budget").classList.toggle("warning", budget.attributeRemaining < 0);
  byId("discipline-budget").classList.toggle("warning", budget.disciplineRemaining < 0);
  const summary = byId("rule-summary");
  summary.textContent = budget.violations.length
    ? budget.violations.join(" ")
    : `Erschaffungsregeln: ${pointBudget ? "Verteilungspunkte" : "AP-Budget"} eingehalten. Offene Budgetpunkte können als Entwurf gespeichert werden.`;
  summary.classList.toggle("warning", budget.violations.length > 0);
}

function roleCatalogPacks() {
  const visibility = form.elements.namedItem("visibility")?.value || "private";
  if (visibility !== "campaign") return allAvailablePacks();
  const versions = selectedModuleVersions();
  const campaigns = new Map();
  for (const entry of state.modules) {
    if (entry.scope === "campaign" && entry.active && versions[entry.pack.manifest.id] === entry.pack.manifest.version) {
      campaigns.set(formatModuleKey(entry.pack), entry.pack);
    }
  }
  for (const entry of state.serverModules) {
    if (entry.scope === "campaign" && entry.active && versions[entry.pack.manifest.id] === entry.pack.manifest.version) {
      campaigns.set(formatModuleKey(entry.pack), entry.pack);
    }
  }
  const base = allAvailablePacks().find((pack) => pack.manifest.id === BASE_MODULE_ID);
  if (base) campaigns.set(formatModuleKey(base), base);
  return [...campaigns.values()];
}

function setProfessionValue(profession = "") {
  const select = byId("profession-select");
  const customField = byId("custom-profession-field");
  const customInput = byId("custom-profession");
  const value = String(profession || "").trim();
  const option = [...select.options].find((item) => item.value && item.value !== "__custom__" && normalized(item.value) === normalized(value));
  if (option) {
    select.value = option.value;
    customInput.value = "";
    customField.classList.add("hidden");
  } else if (value) {
    select.value = "__custom__";
    customInput.value = value;
    customField.classList.remove("hidden");
  } else {
    select.value = "";
    customInput.value = "";
    customField.classList.add("hidden");
  }
}

function renderRoleOptions(currentProfession = "") {
  const roles = new Map();
  for (const pack of roleCatalogPacks()) {
    for (const item of [...(pack.professions || []), ...(pack.classes || [])]) {
      const english = String(displayLabel(item) || "").trim();
      const key = normalized(english);
      if (!key || roles.has(key)) continue;
      const german = [item.label, item.name, item.labelDe, item.nameDe].find((label) => label && normalized(label) !== key) || "";
      roles.set(key, { english, german, moduleId: pack.manifest.id, version: pack.manifest.version });
    }
  }
  const select = byId("profession-select");
  select.innerHTML = `<option value="">Choose a role / Rolle wählen</option>${[...roles.values()].map((role) => `<option value="${escapeHtml(role.english)}" data-module-id="${escapeHtml(role.moduleId)}" data-module-version="${escapeHtml(role.version)}">${escapeHtml(role.english)}${role.german ? ` / ${escapeHtml(role.german)}` : ""}</option>`).join("")}<option value="__custom__">Other role / Andere Rolle</option>`;
  setProfessionValue(currentProfession);
}

function renderDataLists(customFieldValues = {}, currentProfession = undefined) {
  const packs = selectedModulePacks();
  const species = packs.flatMap((pack) => pack.species || []);
  byId("species-options").innerHTML = [...new Set(species.map(displayLabel).filter(Boolean))].map((label) => `<option value="${escapeHtml(label)}"></option>`).join("");
  const savedProfession = currentProfession === undefined
    ? (byId("profession-select").value === "__custom__" ? byId("custom-profession").value : byId("profession-select").value)
    : currentProfession;
  renderRoleOptions(savedProfession);

  const rules = rulesFromModules(packs);
  const modes = new Set(["points", "ap"]);
  for (const pack of packs) {
    const declared = pack.creationRules?.methods;
    if (Array.isArray(declared)) {
      for (const mode of [...modes]) if (!declared.includes(mode)) modes.delete(mode);
    }
  }
  if (!modes.size) modes.add("points");
  const select = byId("creation-method");
  const current = select.value;
  select.innerHTML = [...modes].map((mode) => `<option value="${mode}">${mode === "ap" ? "Advancement Points (AP) / Abenteuerpunkte (AP)" : "Points / Punkte"}</option>`).join("");
  select.value = modes.has(current) ? current : (rules.defaultMethod || [...modes][0]);
  renderCustomFields(packs, customFieldValues);
  renderCatalogSelections();
  renderTechnomageSpells();
  updateTotals();
}

function catalogItems(type) {
  if (type === "focuses") {
    const grouped = new Map();
    for (const item of selectedModulePacks().flatMap((pack) => pack.focuses || [])) {
      const key = normalized(item.name);
      const entry = grouped.get(key) || { ...item, disciplines: [] };
      if (!entry.disciplines.includes(item.discipline)) entry.disciplines.push(item.discipline);
      grouped.set(key, entry);
    }
    return [...grouped.values()];
  }
  const seen = new Set();
  const merged = new Map();
  for (const item of selectedModulePacks().flatMap((pack) => pack[type] || [])) {
    const key = String(item.name || "").toLowerCase();
    if (key) merged.set(key, item);
  }
  return [...merged.values()];
}

function normalized(value) { return String(value || "").trim().toLowerCase().replace(/\s+/g, " "); }

const SELECTION_RULES = { Bold: "department", Cautious: "department", Collaboration: "department", "Augmented Ability": "attribute", "Dedicated Focus X": "focus" };
const DEPARTMENT_POOL = new Set(["bold", "cautious", "collaboration"]);

function parseTalentEntry(entry) {
  let text = String(entry || "").trim();
  const wrapped = text.match(/^(.*?) \((.*)\)$/);
  if (wrapped && wrapped[1] && (wrapped[2].includes(" (") || catalogItems("talents").some((item) => normalized(item.name) === normalized(wrapped[2])))) text = wrapped[2];
  const selected = text.match(/^(.+?) \(([^()]*)\)$/);
  if (selected && SELECTION_RULES[selected[1]]) return { original: selected[1], selection: selected[2], label: entry };
  return { original: text, selection: "", label: entry };
}

function talentSelectionKind(name) { return SELECTION_RULES[name] || null; }

function talentSelectionOptions(name, taken) {
  const kind = talentSelectionKind(name);
  if (!kind) return [];
  const options = kind === "department" ? Object.values(DISCIPLINE_LABELS).map(([english]) => english)
    : kind === "attribute" ? Object.values(ATTRIBUTE_LABELS).map(([english]) => english)
      : [...new Set(state.catalogSelections.focuses.map((focus) => focus.trim()).filter(Boolean))];
  const used = new Set(taken.flatMap((entry) => {
    const parsed = parseTalentEntry(entry);
    const sharesPool = kind === "department" && DEPARTMENT_POOL.has(parsed.original.toLowerCase());
    return parsed.selection && (sharesPool || normalized(parsed.original) === normalized(name)) ? [normalized(parsed.selection)] : [];
  }));
  return options.filter((option) => !used.has(normalized(option)));
}

function requirementStatus(requirement) {
  if (!requirement) return "met";
  const data = readForm().data;
  const branches = requirement.split(/\s+or\s+/i);
  const check = (clause) => {
    const anyDepartment = clause.trim().match(/^department\s+(\d+)\+?$/i);
    if (anyDepartment) return Object.values(data.disciplines).some((value) => Number(value) >= Number(anyDepartment[1])) ? "met" : "unmet";
    const numeric = clause.trim().match(/^([A-Za-z ]+?)\s+(\d+)\+?$/);
    if (numeric) {
      const key = Object.entries({ ...ATTRIBUTE_LABELS, ...DISCIPLINE_LABELS }).find(([, [en]]) => normalized(en) === normalized(numeric[1]))?.[0];
      const group = ATTRIBUTE_LABELS[key] ? data.attributes : data.disciplines;
      return key ? ((Number(group[key]) || 0) >= Number(numeric[2]) ? "met" : "unmet") : "unknown";
    }
    const speciesAliases = { aenar: "aenar", andorian: "andorian", andorianer: "andorian", andorianerin: "andorian", bajoran: "bajoran", bajoraner: "bajoran", bajoranerin: "bajoran", betazoid: "betazoid", betazoide: "betazoid", betazoidin: "betazoid", cardassian: "cardassian", cardassianer: "cardassian", kardassianer: "cardassian", denobulan: "denobulan", denobulaner: "denobulan", ferengi: "ferengi", human: "human", mensch: "human", menschin: "human", terraner: "human", klingon: "klingon", klingone: "klingon", klingonin: "klingon", orion: "orion", orioner: "orion", orionerin: "orion", orionin: "orion", romulan: "romulan", romulaner: "romulan", tellarite: "tellarite", tellarit: "tellarite", trill: "trill", vulcan: "vulcan", vulkanier: "vulcan", vulkanierin: "vulcan" };
    const findSpecies = (value) => normalized(value).split(/[^a-zäöüß]+/).map((word) => speciesAliases[word]).find(Boolean) || null;
    const wanted = findSpecies(clause);
    if (wanted) {
      const own = data.species ? findSpecies(data.species) : null;
      return !own ? "unknown" : own === wanted ? "met" : "unmet";
    }
    return data.talents.some((entry) => normalized(parseTalentEntry(entry).original) === normalized(clause)) ? "met" : "unknown";
  };
  const results = branches.map((branch) => branch.split(/\s*(?:,|&|\s+and\s+)\s*/i).map(check));
  if (results.some((conditions) => conditions.every((status) => status === "met"))) return "met";
  if (results.some((conditions) => conditions.every((status) => status !== "unmet"))) return "unknown";
  return "unmet";
}

function renderCatalogSelections() {
  for (const type of ["talents", "focuses"]) {
    const container = byId(type === "talents" ? "talent-selections" : "focus-selections");
    if (!container) continue;
    container.replaceChildren();
    const selected = state.catalogSelections[type] || [];
    if (!selected.length) {
      const empty = document.createElement("small");
      empty.className = "selection-empty";
      empty.textContent = type === "talents" ? "No talents selected / Noch keine Talente gewählt" : "No focuses selected / Noch keine Schwerpunkte gewählt";
      container.append(empty);
    }
    selected.forEach((entry, index) => {
      const chip = document.createElement("div");
      chip.className = "selection-chip";
      const label = document.createElement("span");
      label.textContent = entry;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.className = "selection-remove";
      remove.setAttribute("aria-label", `Remove ${entry} / ${entry} entfernen`);
      remove.addEventListener("click", () => {
        state.catalogSelections[type] = selected.filter((_, itemIndex) => itemIndex !== index);
        renderCatalogSelections();
        updateTotals();
        if (type === "talents") renderTechnomageSpells();
      });
      chip.append(label, remove);
      container.append(chip);
    });
  }
}

function openCatalog(type) {
  state.catalogType = type;
  state.catalogOpenId = null;
  const isTalent = type === "talents";
  byId("catalog-title").textContent = isTalent ? "Talents / Talente" : "Focuses / Schwerpunkte";
  byId("catalog-filter-label").innerHTML = isTalent ? "<span>Category</span><small>Kategorie</small>" : "<span>Discipline</span><small>Disziplin</small>";
  byId("eligibility-filter").classList.toggle("hidden", !isTalent);
  byId("only-eligible").checked = false;
  byId("catalog-search").value = "";
  const filter = byId("catalog-filter");
  const choices = isTalent ? [...new Set([...TALENT_CATEGORIES, ...catalogItems("talents").map((item) => item.category).filter(Boolean)])].map((key) => [key, `${TALENT_CATEGORY_EN[key] || key} / ${TALENT_CATEGORY_LABELS[key] || key}`]) : Object.entries(DISCIPLINE_LABELS).map(([key, [en, de]]) => [key, `${en} / ${de}`]);
  filter.innerHTML = `<option value="">All / Alle</option>${choices.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join("")}`;
  renderCatalogResults();
  byId("catalog-dialog").showModal();
  byId("catalog-search").focus();
}

function renderCatalogResults() {
  const type = state.catalogType;
  if (!type) return;
  const talent = type === "talents";
  const query = normalized(byId("catalog-search").value);
  const filter = byId("catalog-filter").value;
  const onlyEligible = byId("only-eligible").checked;
  const taken = state.catalogSelections.talents;
  const takenNames = new Set(taken.map((entry) => normalized(parseTalentEntry(entry).original)));
  const focusTaken = new Set(state.catalogSelections.focuses.map(normalized));
  const rows = catalogItems(type).filter((item) => {
    if (talent && filter && item.category !== filter) return false;
    if (!talent && filter && !(item.disciplines || [item.discipline]).includes(filter)) return false;
    if (talent) {
      const kind = talentSelectionKind(item.name);
      if (kind ? talentSelectionOptions(item.name, taken).length === 0 : takenNames.has(normalized(item.name))) return false;
      if (onlyEligible && requirementStatus(item.requirement) === "unmet") return false;
      return !query || `${item.name} ${item.requirement || ""} ${item.description || ""}`.toLowerCase().includes(query);
    }
    return !focusTaken.has(normalized(item.name)) && (!query || item.name.toLowerCase().includes(query));
  });
  byId("catalog-count").textContent = `${rows.length} ${talent ? "talents / Talente" : "focuses / Schwerpunkte"}`;
  byId("catalog-results").innerHTML = rows.map((item) => {
    const id = String(item.id);
    if (!talent) {
      const discipline = (item.disciplines || [item.discipline]).map((key) => DISCIPLINE_LABELS[key] || [key, key]);
      return `<article class="catalog-item"><div class="catalog-item-title"><strong>${escapeHtml(item.name)}</strong>${item.nameDe ? `<small>${escapeHtml(item.nameDe)}</small>` : ""}<small>${escapeHtml(discipline.map(([en, de]) => `${en} / ${de}`).join(" · "))}</small></div><button type="button" class="button button-quiet" data-add-catalog-id="${escapeHtml(id)}">Add / Hinzufügen</button></article>`;
    }
    const categoryDe = item.categoryDe || TALENT_CATEGORY_LABELS[item.category] || item.category;
    const categoryEn = TALENT_CATEGORY_EN[item.category] || item.category;
    const status = requirementStatus(item.requirement);
    const statusText = status === "met" ? "Eligible / Erfüllt" : status === "unmet" ? "Requirement not met / Voraussetzung nicht erfüllt" : "Requirement unclear / Voraussetzung nicht eindeutig";
    const opened = state.catalogOpenId === id;
    const options = talentSelectionOptions(item.name, taken);
    const kind = talentSelectionKind(item.name);
    const selectLabel = kind === "department" ? "Department / Disziplin" : kind === "attribute" ? "Attribute / Eigenschaft" : "Focus / Schwerpunkt";
    return `<article class="catalog-item ${opened ? "expanded" : ""}"><button type="button" class="catalog-item-heading" data-open-catalog-id="${escapeHtml(id)}"><span><strong>${escapeHtml(item.name)}</strong>${item.nameDe ? `<small>${escapeHtml(item.nameDe)}</small>` : ""}</span><small>${escapeHtml(categoryEn)} / ${escapeHtml(categoryDe)} · ${escapeHtml(statusText)}</small></button>${item.requirement ? `<p class="catalog-requirement"><b>Requirement / Voraussetzung:</b> ${escapeHtml(item.requirement)}</p>` : ""}${opened ? `<div class="catalog-details"><p>${escapeHtml(item.description || "")}</p><div class="catalog-pick-fields">${kind ? `<label class="field"><span><span>${selectLabel}</span><small>Auswahl</small></span><select data-selection-option><option value="">Choose / Bitte wählen</option>${options.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}${DISCIPLINE_LABELS[option.toLowerCase()] ? ` / ${escapeHtml(DISCIPLINE_LABELS[option.toLowerCase()][1])}` : ATTRIBUTE_LABELS[option.toLowerCase()] ? ` / ${escapeHtml(ATTRIBUTE_LABELS[option.toLowerCase()][1])}` : ""}</option>`).join("")}</select></label>` : ""}<label class="field"><span><span>Custom name (optional)</span><small>Eigener Name (optional)</small></span><input type="text" maxlength="120" data-custom-name placeholder="${escapeHtml(item.name)}" /></label><button type="button" class="button button-accent" data-add-catalog-id="${escapeHtml(id)}">Add talent / Talent übernehmen</button></div></div>` : ""}</article>`;
  }).join("") || `<p class="empty-note">No catalog entry matches / Kein Eintrag passt zur Suche.</p>`;
}

function formatTalentEntry(name, selection, customName) {
  const core = selection ? `${name} (${selection})` : name;
  return customName && customName.trim() && customName.trim() !== name ? `${customName.trim()} (${core})` : core;
}

function compareModuleVersions(left, right) {
  const parse = (version) => {
    const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(version || "");
    return match ? { core: match.slice(1, 4).map(Number), prerelease: match[4]?.split(".") || null } : null;
  };
  const a = parse(left);
  const b = parse(right);
  if (!a || !b) return 0;
  for (let index = 0; index < 3; index++) {
    if (a.core[index] !== b.core[index]) return a.core[index] > b.core[index] ? 1 : -1;
  }
  if (!a.prerelease || !b.prerelease) return a.prerelease ? -1 : b.prerelease ? 1 : 0;
  for (let index = 0; index < Math.max(a.prerelease.length, b.prerelease.length); index++) {
    const leftPart = a.prerelease[index];
    const rightPart = b.prerelease[index];
    if (leftPart === undefined || rightPart === undefined) return leftPart === undefined ? -1 : 1;
    if (leftPart === rightPart) continue;
    const leftNumber = /^\d+$/.test(leftPart);
    const rightNumber = /^\d+$/.test(rightPart);
    if (leftNumber && rightNumber) return Number(leftPart) > Number(rightPart) ? 1 : -1;
    if (leftNumber !== rightNumber) return leftNumber ? -1 : 1;
    return leftPart > rightPart ? 1 : -1;
  }
  return 0;
}

function setBilingualButton(button, english, german) {
  const primary = document.createElement("span");
  primary.textContent = english;
  const translation = document.createElement("small");
  translation.textContent = german;
  button.replaceChildren(primary, translation);
}

async function saveModuleLocally(pack, metadata) {
  const removedKeys = new Set(await getSetting(REMOVED_BUNDLED_MODULES_KEY) || []);
  removedKeys.delete(formatModuleKey(pack));
  await setSetting(REMOVED_BUNDLED_MODULES_KEY, [...removedKeys]);
  await saveModule(pack, metadata);
}

async function installServerModule(key) {
  try {
    if (!navigator.onLine) throw new Error("Offline: Für Modulupdates ist eine Verbindung erforderlich.");
    await loadServerModules();
    const entry = state.serverModules.find((item) => formatModuleKey(item.pack) === key);
    if (!entry) throw new Error("Diese Modulversion ist auf LCARS nicht mehr verfügbar.");
    const pack = validateModulePack(entry.pack);
    const previousVersions = localModulesForProfile()
      .filter((item) => item.pack.manifest.id === pack.manifest.id)
      .sort((left, right) => compareModuleVersions(left.pack.manifest.version, right.pack.manifest.version));
    const previous = previousVersions[previousVersions.length - 1];
    await saveModuleLocally(pack, { scope: entry.scope, active: entry.active, ownerUserId: entry.ownerUserId });
    await renderModules();
    const isUpdate = previous && compareModuleVersions(pack.manifest.version, previous.pack.manifest.version) > 0;
    showToast(isUpdate ? `${pack.manifest.title} v${pack.manifest.version} aktualisiert. Ältere Charaktere behalten ihre Modulversion.` : `Modul ${pack.manifest.title} lokal installiert.`);
  } catch (error) {
    showToast(error.status === 401 ? "Bitte melde dich bei LCARS an, um Module abzurufen." : error.message, "error");
  }
}

async function removeLocalModule(entry) {
  if (entry.pack.manifest.id === BASE_MODULE_ID) return;
  const version = entry.pack.manifest.version;
  const references = (await allCharacters()).filter((record) => !record.deleted && record.moduleVersions?.[entry.pack.manifest.id] === version);
  const characterLabel = references.length === 1 ? "gespeicherter Charakter" : "gespeicherte Charaktere";
  const impact = references.length
    ? `\n\n${references.length} ${characterLabel} verwenden genau diese Version. Ihre Daten und Versionsverweise bleiben erhalten; offline benötigen sie das Modul erneut.`
    : "";
  const message = `Die lokale Kopie von ${entry.pack.manifest.title} v${version} vom Gerät entfernen? Das Modul auf LCARS wird nicht gelöscht.${impact}`;
  if (!window.confirm(message)) return;
  await deleteModule(entry.key);
  if (embeddedModuleKeys.has(entry.key)) {
    const removedKeys = new Set(await getSetting(REMOVED_BUNDLED_MODULES_KEY) || []);
    removedKeys.add(entry.key);
    await setSetting(REMOVED_BUNDLED_MODULES_KEY, [...removedKeys]);
  }
  await renderModules();
  showToast(`Modul ${entry.pack.manifest.title} von diesem Gerät entfernt.`);
}

function technomageDataFromForm() {
  const known = state.technomageData || {};
  const primary = byId("primary-school")?.value || known.primarySchool || "";
  const weak = [...(byId("weak-schools")?.querySelectorAll("select") || [])].map((select) => select.value).filter(Boolean);
  const advancementAP = Number.parseInt(byId("technomage-advancement-ap")?.value ?? known.advancementAP ?? 0, 10);
  return {
    primarySchool: primary,
    weakSchools: weak.length ? weak : (known.weakSchools || []),
    advancementAP: Math.max(0, Math.min(100000, Number.isFinite(advancementAP) ? advancementAP : 0)),
    spells: known.spells || [],
  };
}

function calculateTechnomageSpellSlots(module, reason, selectedTalentEntries, advancementAP) {
  const declared = module.spellSlotRules;
  const rules = declared && Number.isInteger(declared.baseSlots) && Array.isArray(declared.talentBonusIds)
    ? declared
    : DEFAULT_TECHNOMAGE_SLOT_RULES;
  const reasonValue = Number.isFinite(Number(reason)) ? Number(reason) : rules.reasonBaseline;
  const bonusPerSource = Math.ceil(rules.bonusBase + (reasonValue - rules.reasonBaseline));
  const configuredTalentNames = new Set((module.talents || [])
    .filter((talent) => rules.talentBonusIds.includes(talent.id))
    .map((talent) => normalized(talent.name || talent.original || talent.label))
    .filter(Boolean));
  const selectedTalentNames = new Set((selectedTalentEntries || [])
    .map((entry) => normalized(parseTalentEntry(entry).original))
    .filter(Boolean));
  const talentCount = [...configuredTalentNames].filter((name) => selectedTalentNames.has(name)).length;
  const ap = Math.max(0, Number.parseInt(advancementAP, 10) || 0);
  const apSteps = Math.floor(ap / rules.advancementApStep);
  const total = Math.max(0, rules.baseSlots + (talentCount + apSteps) * bonusPerSource);
  return { total, baseSlots: rules.baseSlots, bonusPerSource, talentCount, apSteps };
}

function spellDepth(spellId, spellMap, visited = new Set()) {
  if (visited.has(spellId)) return 0;
  const spell = spellMap.get(spellId);
  if (!spell) return 0;
  const next = new Set(visited); next.add(spellId);
  const deps = (spell.prerequisiteGroups || [spell.prerequisites || []]).flat().map((id) => spellMap.get(id)).filter((item) => item?.school === spell.school);
  return deps.length ? 1 + Math.max(...deps.map((item) => spellDepth(item.id, spellMap, next))) : 0;
}

function spellPurchasePlan(spellId, spellMap, knownSpellIds) {
  const known = new Set(knownSpellIds);
  const planned = new Set(known);
  const addSpell = (id, visiting = new Set()) => {
    if (planned.has(id) || visiting.has(id)) return;
    const spell = spellMap.get(id);
    if (!spell) return;
    const next = new Set(visiting);
    next.add(id);
    for (const group of spell.prerequisiteGroups || (spell.prerequisites || []).map((dependency) => [dependency])) {
      if (group.some((dependency) => planned.has(dependency))) continue;
      const dependency = group.find((candidate) => spellMap.has(candidate));
      if (dependency) addSpell(dependency, next);
    }
    planned.add(id);
  };
  addSpell(spellId);
  const plannedSpellIds = [...planned];
  const addedSpellIds = plannedSpellIds.filter((id) => !known.has(id));
  const prerequisitesMet = addedSpellIds.every((id) => {
    const spell = spellMap.get(id);
    return (spell?.prerequisiteGroups || (spell?.prerequisites || []).map((dependency) => [dependency]))
      .every((group) => group.some((dependency) => planned.has(dependency)));
  });
  const target = spellMap.get(spellId);
  const chaosSpellsRequired = Number((target?.requirements || "").match(/at least\s+(\d+)\s+(?:other\s+)?chaos spells/i)?.[1] || 0);
  const chaosRequirementMet = chaosSpellsRequired <= plannedSpellIds.length - 1;
  return { plannedSpellIds, addedSpellIds, slotCost: addedSpellIds.length, prerequisitesMet, chaosSpellsRequired, chaosRequirementMet };
}
function renderTechnomageSpells() {
  const section = byId("technomage-spells");
  const packs = selectedModulePacks();
  const profession = normalized(readForm().data.profession);
  const module = packs.find((pack) => pack.spells?.length && pack.spellTrees?.length &&
    [...(pack.professions || []), ...(pack.classes || [])].some((item) => normalized(displayLabel(item)) === profession));
  if (!module) { section.classList.add("hidden"); return; }
  section.classList.remove("hidden");
  const spells = module.spells;
  const spellMap = new Map(spells.map((spell) => [spell.id, spell]));
  const tech = state.technomageData || { primarySchool: "", weakSchools: [], advancementAP: 0, spells: [] };
  const primary = byId("primary-school");
  primary.innerHTML = `<option value="">Choose / Bitte wählen</option>${module.spellTrees.map((tree) => `<option value="${escapeHtml(tree.id)}">${escapeHtml(tree.original || tree.label)} / ${escapeHtml(tree.label)}</option>`).join("")}`;
  primary.value = tech.primarySchool || "";
  const weakHost = byId("weak-schools");
  weakHost.innerHTML = [0, 1, 2].map((index) => `<label class="field"><span><span>Weak School ${index + 1}</span><small>Schwache Schule ${index + 1}</small></span><select data-weak-school><option value="">Choose / Bitte wählen</option>${module.spellTrees.map((tree) => `<option value="${escapeHtml(tree.id)}">${escapeHtml(tree.original || tree.label)} / ${escapeHtml(tree.label)}</option>`).join("")}</select></label>`).join("");
  const weakSelects = [...weakHost.querySelectorAll("select")];
  weakSelects.forEach((select, index) => {
    select.value = tech.weakSchools?.[index] || "";
    select.addEventListener("change", () => {
      const values = weakSelects.map((node) => node.value);
      if (values.filter(Boolean).length !== new Set(values.filter(Boolean)).size || values.includes(primary.value)) {
        select.value = ""; showToast("Primary and weak schools must be different / Schulen dürfen sich nicht überschneiden.", "error"); return;
      }
      state.technomageData = { ...state.technomageData, primarySchool: primary.value, weakSchools: values.filter(Boolean) };
      renderTechnomageSpells();
    });
  });
  primary.onchange = () => {
    if (weakSelects.some((select) => select.value === primary.value)) {
      showToast("Primary and weak schools must be different / Schulen dürfen sich nicht überschneiden.", "error"); primary.value = tech.primarySchool || ""; return;
    }
    state.technomageData = { ...state.technomageData, primarySchool: primary.value };
    renderTechnomageSpells();
  };
  const advancementInput = byId("technomage-advancement-ap");
  advancementInput.value = String(tech.advancementAP ?? 0);
  advancementInput.onchange = () => {
    const advancementAP = Math.max(0, Math.min(100000, Number.parseInt(advancementInput.value, 10) || 0));
    advancementInput.value = String(advancementAP);
    state.technomageData = { ...state.technomageData, advancementAP };
    renderTechnomageSpells();
  };
  const tabs = byId("spell-school-tabs");
  tabs.innerHTML = module.spellTrees.map((tree) => `<button type="button" class="spell-school-tab ${tree.id === state.spellSchool ? "active" : ""}" data-spell-school="${escapeHtml(tree.id)}"><span>${escapeHtml(tree.original || tree.label)}</span><small>${escapeHtml(tree.label)}</small></button>`).join("");
  const selectedTree = module.spellTrees.find((tree) => tree.id === state.spellSchool) || module.spellTrees[0];
  state.spellSchool = selectedTree.id;
  const known = new Set(tech.spells || []);
  const slotCalculation = calculateTechnomageSpellSlots(module, readForm().data.attributes[module.spellSlotRules?.reasonAttribute || "reason"], state.catalogSelections.talents, tech.advancementAP);
  const cap = slotCalculation.total;
  const usedText = known.size + " / " + cap + " spell slots used · " + (cap - known.size) + " free / " + known.size + " von " + cap + " Spellplätzen belegt · " + (cap - known.size) + " frei.";
  const formulaText = "Capacity / Kapazität: " + slotCalculation.baseSlots + " base / Basis + " + slotCalculation.talentCount + " talent(s) / Talent(e) × " + slotCalculation.bonusPerSource + " + " + slotCalculation.apSteps + " completed 20 AP step(s) / volle 20-AP-Schritte × " + slotCalculation.bonusPerSource + " = " + cap + ". Bonus rounded up per source / Bonus je Quelle aufgerundet.";
  byId("spell-slot-count").textContent = usedText + " " + formulaText;
  const search = normalized(byId("spell-search").value);
  const onlyReachable = byId("only-reachable-spells").checked;
  const orderedSpells = (selectedTree.spellIds || []).map((id) => spellMap.get(id)).filter(Boolean)
    .sort((a, b) => spellDepth(a.id, spellMap) - spellDepth(b.id, spellMap) || a.name.localeCompare(b.name));
  const rows = orderedSpells.map((spell) => {
    const plan = spellPurchasePlan(spell.id, spellMap, known);
    const learned = known.has(spell.id);
    const primarySchoolRequirement = /as a primary (?:aptitude|school)/i.test(spell.requirements || "")
      ? TECHNOMAGE_SCHOOLS.find((school) => (spell.requirements || "").toLowerCase().includes(school.en.toLowerCase()))?.id
      : null;
    const schoolsConfigured = Boolean(tech.primarySchool && (tech.weakSchools || []).length === 3);
    const schoolAllowed = !primarySchoolRequirement || tech.primarySchool === primarySchoolRequirement;
    const reachable = learned || (schoolsConfigured && schoolAllowed && plan.prerequisitesMet && plan.chaosRequirementMet && plan.plannedSpellIds.length <= cap);
    const queryText = normalized([spell.name, spell.requirements, spell.school, spell.elementalCategory, spell.effect].filter(Boolean).join(" "));
    return { spell, plan, learned, reachable, matches: !search || queryText.includes(search) };
  }).filter((entry) => entry.matches && (!onlyReachable || entry.reachable));
  const spellRowsHtml = rows.map(({ spell, plan, learned, reachable }) => {
    const prerequisiteText = (spell.prerequisiteGroups || [spell.prerequisites || []]).map((group) => group.map((id) => spellMap.get(id)?.name).filter(Boolean).join(" or ")).filter(Boolean).join(" + ");
    const slotCostText = learned
      ? "Spell slot cost / Spellslot-Kosten: 1 slot / Platz · already learned / bereits gelernt"
      : "Spell slot cost / Spellslot-Kosten: 1 slot / Platz · total to learn now incl. missing prerequisites / insgesamt inkl. fehlender Voraussetzungen: " + plan.slotCost;
    const disabled = !learned && !reachable;
    const tier = spellDepth(spell.id, spellMap) + 1;
    const buttonLabel = learned ? "Learned / Gelernt" : "Learn / Lernen";
    const buttonClass = learned ? "button-quiet" : "button-accent";
    return '<article class="spell-item ' + (learned ? "learned" : "") + '" style="margin-left:' + (spellDepth(spell.id, spellMap) * 12) + 'px"><div><strong>' + escapeHtml(spell.name) + '</strong><small>' + escapeHtml(selectedTree.original || selectedTree.label) + " · Tier " + tier + '</small><small>' + escapeHtml(slotCostText) + '</small>' + (prerequisiteText ? '<small>Prerequisite / Voraussetzung: ' + escapeHtml(prerequisiteText) + '</small>' : "") + '<small>' + escapeHtml(spell.requirements || "No listed requirements") + '</small></div><button type="button" class="button ' + buttonClass + '" data-spell-action="' + (learned ? "forget" : "learn") + '" data-spell-id="' + escapeHtml(spell.id) + '" ' + (disabled ? "disabled" : "") + '>' + buttonLabel + '</button></article>';
  }).join("");
  byId("spell-tree").innerHTML = spellRowsHtml || '<p class="empty-note">No spells match these filters / Keine Spells passen zu den Filtern.</p>';
  byId("spell-tree").querySelectorAll("[data-spell-action]").forEach((button) => button.addEventListener("click", () => {
    const id = button.dataset.spellId;
    const current = new Set(state.technomageData?.spells || []);
    if (button.dataset.spellAction === "forget") {
      const inUse = [...current].some((otherId) => (spellMap.get(otherId)?.prerequisiteGroups || []).some((group) => group.includes(id) && !group.some((option) => option !== id && current.has(option))));
      if (inUse) { showToast("A learned spell depends on this spell / Ein gelernter Spell benötigt diesen Spell.", "error"); return; }
      current.delete(id);
    } else {
      const plan = spellPurchasePlan(id, spellMap, current);
      if (!plan.prerequisitesMet) { showToast("A spell prerequisite is unavailable / Eine Spell-Voraussetzung ist nicht verfügbar.", "error"); return; }
      if (!plan.chaosRequirementMet) { showToast("This spell requires at least " + plan.chaosSpellsRequired + " already learned spells / Dieser Spell setzt mindestens " + plan.chaosSpellsRequired + " bereits gelernte Spells voraus.", "error"); return; }
      if (plan.plannedSpellIds.length > cap) { showToast("Not enough spell slots; " + (plan.plannedSpellIds.length - cap) + " more needed / Nicht genug Spellplätze; " + (plan.plannedSpellIds.length - cap) + " fehlen.", "error"); return; }
      state.technomageData = { ...state.technomageData, spells: plan.plannedSpellIds };
      renderTechnomageSpells();
      return;
    }
    state.technomageData = { ...state.technomageData, spells: [...current] };
    renderTechnomageSpells();
  }));
  tabs.querySelectorAll("[data-spell-school]").forEach((button) => button.addEventListener("click", () => { state.spellSchool = button.dataset.spellSchool; renderTechnomageSpells(); }));
}

function renderCustomFields(packs = selectedModulePacks(), savedValues = {}) {
  const container = byId("custom-fields");
  container.replaceChildren();
  const seen = new Set();
  for (const pack of packs) {
    for (const definition of pack.characterFields || []) {
      const key = `${pack.manifest.id}.${definition.id}`;
      if (seen.size >= 50) break;
      if (seen.has(key)) continue;
      seen.add(key);
      const label = document.createElement("label");
      label.className = definition.type === "multiline" ? "field field-wide" : "field";
      const caption = document.createElement("span");
      caption.innerHTML = `<span>${escapeHtml(definition.original || definition.label)}</span><small>${escapeHtml(definition.labelDe || definition.label || "")}</small>`;
      label.append(caption);
      let input;
      const savedValue = String(savedValues[key] ?? "");
      if (definition.type === "select") {
        input = document.createElement("select");
        const emptyOption = document.createElement("option");
        emptyOption.value = "";
        emptyOption.textContent = "Bitte wählen";
        input.append(emptyOption);
        for (const option of definition.options || []) {
          const normalized = typeof option === "string" ? { value: option, label: option } : option;
          const node = document.createElement("option");
          node.value = normalized.value;
          node.textContent = normalized.labelDe ? `${normalized.label} / ${normalized.labelDe}` : normalized.label;
          input.append(node);
        }
        if (savedValue && ![...input.options].some((option) => option.value === savedValue)) {
          const archived = document.createElement("option");
          archived.value = savedValue;
          archived.textContent = `${savedValue} (nicht mehr angeboten)`;
          input.append(archived);
        }
      } else {
        input = document.createElement(definition.type === "multiline" ? "textarea" : "input");
        if (definition.type !== "multiline") input.type = definition.type === "number" ? "number" : "text";
        if (definition.type === "multiline") { input.rows = 3; input.maxLength = 2000; }
        else if (definition.type === "text") input.maxLength = 240;
      }
      input.name = `customFields.${key}`;
      input.value = savedValue;
      input.autocomplete = "off";
      label.append(input);
      container.append(label);
    }
  }
  container.classList.toggle("hidden", seen.size === 0);
}

function selectedModuleVersions() {
  const checks = [...document.querySelectorAll("input[name='module-pin']:checked")];
  const result = {};
  const campaignPins = new Set(activeModulePacks().map(formatModuleKey));
  const campaignOnly = form.elements.namedItem("visibility").value === "campaign";
  for (const check of checks) {
    const key = `${check.dataset.moduleId}@${check.dataset.version}`;
    if (!campaignOnly || campaignPins.has(key) || check.dataset.missing === "true") result[check.dataset.moduleId] = check.dataset.version;
  }
  if (!result[BASE_MODULE_ID]) result[BASE_MODULE_ID] = BASE_MODULE_VERSION;
  return result;
}

function renderPins(selected = {}) {
  const campaignOnly = form.elements.namedItem("visibility").value === "campaign";
  const visible = new Map();
  for (const pack of activeModulePacks()) visible.set(formatModuleKey(pack), { pack, scope: "campaign" });
  for (const entry of localModulesForProfile()) {
    if (entry.pack.manifest.id === BASE_MODULE_ID && entry.pack.manifest.version !== BASE_MODULE_VERSION) continue;
    if (entry.scope === "private" || Object.entries(selected).some(([id, version]) => id === entry.pack.manifest.id && version === entry.pack.manifest.version)) {
      visible.set(formatModuleKey(entry.pack), { pack: entry.pack, scope: entry.scope });
    }
  }
  for (const entry of state.serverModules) {
    if (Object.entries(selected).some(([id, version]) => id === entry.pack.manifest.id && version === entry.pack.manifest.version)) {
      visible.set(formatModuleKey(entry.pack), { pack: entry.pack, scope: entry.scope, active: entry.active });
    }
  }
  for (const [moduleId, version] of Object.entries(selected)) {
    const key = `${moduleId}@${version}`;
    if (!visible.has(key)) {
      visible.set(key, {
        pack: { manifest: { id: moduleId, version, title: `Missing module / Fehlendes Modul: ${moduleId}` } },
        scope: "missing",
        missing: true,
      });
    }
  }
  if (!visible.size && state.modules[0]) visible.set(formatModuleKey(state.modules[0].pack), { pack: state.modules[0].pack, scope: "private" });
  byId("module-pins").innerHTML = [...visible.values()].map(({ pack, scope, missing }) => {
    const id = pack.manifest.id;
    const version = pack.manifest.version;
    const checked = selected[id] === version || (!Object.keys(selected).length && id === BASE_MODULE_ID);
    const active = state.activeModules.some((item) => item.moduleId === id && item.moduleVersion === version);
    return `<label class="pin-chip"><input type="checkbox" name="module-pin" data-module-id="${escapeHtml(id)}" data-version="${escapeHtml(version)}" data-missing="${missing ? "true" : "false"}" ${checked ? "checked" : ""} ${scope === "campaign" && !active && id !== BASE_MODULE_ID ? "disabled" : ""} ${campaignOnly && scope === "private" ? "disabled" : ""}/><span>${escapeHtml(pack.manifest.title)} <small>v${escapeHtml(version)}${missing ? " · not installed / nicht installiert" : active ? " · aktiv" : scope === "private" ? " · privat" : ""}</small></span></label>`;
  }).join("");
  updateTotals();
}

function readForm() {
  const data = new FormData(form);
  const attrs = {};
  const disciplines = {};
  for (const input of form.querySelectorAll("input[name^='attributes.']")) attrs[input.name.slice("attributes.".length)] = Math.max(0, Math.min(15, Number.parseInt(input.value, 10) || 0));
  for (const input of form.querySelectorAll("input[name^='disciplines.']")) disciplines[input.name.slice("disciplines.".length)] = Math.max(0, Math.min(15, Number.parseInt(input.value, 10) || 0));
  const lines = (value) => String(value || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean).slice(0, 100);
  const customFields = {
    ...(state.selectedCharacter?.data?.customFields || {}),
    ...Object.fromEntries([...form.querySelectorAll("[name^='customFields.']")]
      .map((field) => [field.name.slice("customFields.".length), String(field.value).trim().slice(0, 2000)])),
  };
  customFields[TECHNOMAGE_STATE_KEY] = JSON.stringify(technomageDataFromForm()).slice(0, 2000);
  return {
    visibility: data.get("visibility") === "campaign" ? "campaign" : "private",
    data: {
      name: String(data.get("name") || "").trim(),
      species: String(data.get("species") || "").trim(),
      profession: String(data.get("profession") === "__custom__" ? data.get("customProfession") : data.get("profession") || "").trim(),
      concept: String(data.get("concept") || "").trim(),
      upbringing: String(data.get("upbringing") || "").trim(),
      career: String(data.get("career") || "").trim(),
      rank: String(data.get("rank") || "").trim(),
      creationMethod: data.get("creationMethod") === "ap" ? "ap" : "points",
      attributes: attrs,
      disciplines,
      values: lines(data.get("values")),
      talents: [...state.catalogSelections.talents],
      focuses: [...state.catalogSelections.focuses],
      customFields,
      notes: String(data.get("notes") || "").trim(),
    },
    moduleVersions: selectedModuleVersions(),
  };
}

function fillForm(record) {
  const data = record?.data || newCharacter();
  state.catalogSelections = { talents: [...(data.talents || [])], focuses: [...(data.focuses || [])] };
  let savedTech = null;
  try { savedTech = JSON.parse(data.customFields?.[TECHNOMAGE_STATE_KEY] || "null"); } catch { savedTech = null; }
  state.technomageData = structuredClone(savedTech || { primarySchool: "", weakSchools: [], advancementAP: 0, spells: [] });
  const value = (name, fallback = "") => { const field = form.elements.namedItem(name); if (field) field.value = data[name] ?? fallback; };
  value("name");
  value("species");
  value("concept");
  value("upbringing");
  value("career");
  value("rank");
  value("creationMethod", "points");
  value("visibility", record?.visibility || "private");
  value("values", (data.values || []).join("\n"));
  value("notes");
  renderPins({ ...(record?.moduleVersions || {}), [BASE_MODULE_ID]: BASE_MODULE_VERSION });
  renderDataLists(record?.data?.customFields || {}, data.profession || "");
  renderStatFields(data);
  byId("editor-title").textContent = data.name || (record ? "Charakter bearbeiten" : "Neuer Charakter");
  byId("save-state").textContent = record?.conflict ? "Konflikt prüfen" : (record?.localRevision > record?.syncedLocalRevision ? "Nicht synchronisiert" : "Lokal gespeichert");
  const readOnly = Boolean(record?.visibility === "campaign" && record.ownerUserId && record.ownerUserId !== state.currentUserId && !state.canManageCharacters);
  form.querySelectorAll("input, select, textarea").forEach((field) => { field.disabled = readOnly; });
  form.querySelectorAll("button").forEach((button) => { button.disabled = readOnly; });
  state.readOnly = readOnly;
  byId("save-character").disabled = readOnly;
  form.querySelector(".form-footnote").textContent = readOnly
    ? "Dieser Kampagnencharakter ist schreibgeschützt. Besitzer oder Spielleitung können ihn bearbeiten."
    : "Privat gespeicherte Bögen gehören zu deinem LCARS-Konto. Kampagnenbögen kann die Spielleitung bearbeiten.";
  const campaignOption = form.elements.namedItem("visibility").querySelector("option[value='campaign']");
  campaignOption.disabled = !state.canShareCampaign && !record;
}

async function selectCharacter(id) {
  state.selectedId = id;
  state.selectedCharacter = id ? await getCharacter(id) : null;
  fillForm(state.selectedCharacter);
  await renderCharacters();
}

async function renderCharacters() {
  const all = await allCharacters();
  const query = byId("character-search").value.trim().toLocaleLowerCase("de");
  const visible = all.filter(belongsToActiveProfile);
  const records = visible.filter((item) => !item.deleted && (item.data?.name || "").toLocaleLowerCase("de").includes(query)).sort((a, b) => (a.data?.name || "").localeCompare(b.data?.name || "", "de"));
  byId("character-count").textContent = String(visible.filter((item) => !item.deleted).length);
  byId("empty-list").classList.toggle("hidden", records.length > 0);
  const list = byId("character-list");
  list.replaceChildren();
  for (const record of records) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `character-card${record.id === state.selectedId ? " selected" : ""}`;
    const name = document.createElement("strong");
    name.textContent = record.data?.name || "Unbenannter Charakter";
    const sub = document.createElement("span");
    sub.textContent = [record.data?.species, record.data?.rank].filter(Boolean).join(" · ") || "Noch ohne Spezies oder Rang";
    const mark = document.createElement("i");
    mark.className = `visibility-mark ${record.visibility === "campaign" ? "campaign" : "private"}`;
    mark.title = record.visibility === "campaign" ? "Kampagnenfreigabe" : "Privat";
    button.append(name, sub, mark);
    if (record.conflict) {
      const flag = document.createElement("em");
      flag.className = "conflict-flag";
      flag.textContent = "Konflikt";
      button.append(flag);
    }
    button.addEventListener("click", () => selectCharacter(record.id));
    list.append(button);
  }
  await renderConflicts(visible);
}

function showEditorNew() {
  state.selectedId = null;
  state.selectedCharacter = null;
  form.reset();
  byId("editor-title").textContent = "Neuer Charakter";
  byId("save-state").textContent = "Entwurf";
  const data = newCharacter();
  state.catalogSelections = { talents: [], focuses: [] };
  state.technomageData = { primarySchool: "", weakSchools: [], advancementAP: 0, spells: [] };
  const selected = Object.fromEntries(activeModulePacks().map((pack) => [pack.manifest.id, pack.manifest.version]));
  selected[BASE_MODULE_ID] = BASE_MODULE_VERSION;
  renderPins(selected);
  renderDataLists({}, data.profession);
  renderStatFields(data);
  void renderCharacters();
}

function formatStatSummary(data) {
  const attrs = Object.values(data?.attributes || {}).join(" / ") || "—";
  const disciplines = Object.values(data?.disciplines || {}).join(" / ") || "—";
  return `Attribute: ${attrs} · Disziplinen: ${disciplines}`;
}

async function renderConflicts(characters) {
  const conflicted = characters.filter((record) => record.conflict);
  byId("conflict-count").textContent = String(conflicted.length);
  byId("no-conflicts").classList.toggle("hidden", conflicted.length > 0);
  const list = byId("conflict-list");
  list.replaceChildren();
  for (const record of conflicted) {
    const remote = record.conflict;
    const card = document.createElement("article");
    card.className = "conflict-card";
    const heading = document.createElement("div");
    heading.className = "conflict-title";
    const title = document.createElement("h3");
    title.textContent = record.data?.name || "Charakter";
    const revision = document.createElement("span");
    revision.className = "status-pill conflict-pill";
    revision.textContent = `Lokal v${record.revision || 0} · Server v${remote.revision}`;
    heading.append(title, revision);
    const comparison = document.createElement("div");
    comparison.className = "conflict-comparison";
    const local = document.createElement("div");
    local.innerHTML = `<strong>Deine Fassung</strong><p>${escapeHtml(record.data?.species || "Spezies offen")} · ${escapeHtml(record.data?.profession || "Laufbahn offen")}</p><small>${escapeHtml(formatStatSummary(record.data))}</small>`;
    const server = document.createElement("div");
    server.innerHTML = `<strong>LCARS-Fassung</strong><p>${escapeHtml(remote.data?.name || "Charakter")} · ${escapeHtml(remote.data?.species || "Spezies offen")} · ${escapeHtml(remote.data?.profession || "Laufbahn offen")}</p><small>${escapeHtml(formatStatSummary(remote.data))}</small>`;
    comparison.append(local, server);
    const actions = document.createElement("div");
    actions.className = "conflict-actions";
    for (const [choice, label] of [["local", "Lokale Fassung behalten"], ["remote", "LCARS-Fassung übernehmen"], ["copy", "Beide als getrennte Charaktere behalten"]]) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = choice === "local" ? "button button-accent" : "button button-quiet";
      button.textContent = label;
      button.addEventListener("click", async () => {
        try {
          await resolveConflict(record.id, choice);
          await refresh();
          showToast(choice === "local" ? "Lokale Fassung wird erneut synchronisiert." : choice === "remote" ? "LCARS-Fassung übernommen." : "Lokale Kopie angelegt; LCARS-Fassung übernommen.");
          if (navigator.onLine) void syncNow();
        } catch (error) { showToast(error.message, "error"); }
      });
      actions.append(button);
    }
    card.append(heading, comparison, actions);
    list.append(card);
  }
}

async function renderModules() {
  const currentDraft = readForm();
  state.modules = await allModules();
  const list = byId("module-list");
  list.replaceChildren();
  const serverKeys = new Set(state.serverModules.map((item) => formatModuleKey(item.pack)));
  const entries = new Map();
  for (const entry of localModulesForProfile()) entries.set(entry.key, { ...entry, local: true });
  for (const item of state.serverModules) {
    const key = formatModuleKey(item.pack);
    if (!entries.has(key)) entries.set(key, { key, pack: item.pack, scope: item.scope, active: item.active, ownerUserId: item.ownerUserId, local: false });
    else entries.set(key, { ...entries.get(key), server: item, active: item.active });
  }
  byId("module-count").textContent = String(entries.size);
  byId("module-summary").textContent = `${state.activeModules.length || 1} aktive Kampagnenmodule`;

  for (const entry of entries.values()) {
    const pack = entry.pack;
    const card = document.createElement("article");
    card.className = "module-card";
    const content = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = pack.manifest.title;
    if (pack.manifest.titleDe) {
      const titleDe = document.createElement("small");
      titleDe.className = "module-title-translation";
      titleDe.textContent = pack.manifest.titleDe;
      title.append(titleDe);
    }
    const details = document.createElement("p");
    details.textContent = `${pack.manifest.id} · v${pack.manifest.version} · ${entry.scope === "campaign" ? "Kampagne" : "privat"}${entry.active ? " · aktiv" : ""}`;
    const description = document.createElement("small");
    description.textContent = pack.manifest.description || "Deklaratives Regelmodul";
    content.append(title, details, description);
    const actions = document.createElement("div");
    actions.className = "module-actions";
    const exportButton = document.createElement("button");
    exportButton.className = "button button-quiet";
    exportButton.type = "button";
    exportButton.textContent = "Exportieren";
    exportButton.addEventListener("click", () => downloadJson(pack, `${pack.manifest.id}-${pack.manifest.version}.json`));
    actions.append(exportButton);

    if (!entry.local) {
      const install = document.createElement("button");
      install.className = "button button-accent";
      install.type = "button";
      const installedVersions = localModulesForProfile()
        .filter((local) => local.pack.manifest.id === pack.manifest.id)
        .map((local) => local.pack.manifest.version);
      const installedVersion = installedVersions.sort(compareModuleVersions)[installedVersions.length - 1];
      const updateAvailable = installedVersion && compareModuleVersions(pack.manifest.version, installedVersion) > 0;
      setBilingualButton(install,
        updateAvailable ? `Update to v${pack.manifest.version}` : "Install on this device",
        updateAvailable ? `Auf v${pack.manifest.version} aktualisieren` : "Auf diesem Gerät installieren");
      install.addEventListener("click", () => void installServerModule(entry.key));
      actions.append(install);
    } else {
      if (!serverKeys.has(entry.key)) {
        const upload = document.createElement("button");
        upload.className = "button button-quiet";
        upload.type = "button";
        upload.textContent = "Auf LCARS speichern";
        upload.addEventListener("click", () => uploadModule(pack));
        actions.append(upload);
      }
      if (pack.manifest.id !== BASE_MODULE_ID) {
        const remove = document.createElement("button");
        remove.className = "button button-quiet";
        remove.type = "button";
        setBilingualButton(remove, "Remove from this device", "Von diesem Gerät entfernen");
        remove.addEventListener("click", () => void removeLocalModule(entry).catch((error) => showToast(error.message, "error")));
        actions.append(remove);
      }
    }
    card.append(content, actions);
    list.append(card);
  }
  if (!entries.size) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "Noch keine Module verfügbar.";
    list.append(empty);
  }
  byId("publish-scope").disabled = !navigator.onLine;
  byId("publish-activate").disabled = !state.canManageModules;
  renderPins(currentDraft.moduleVersions || {});
  renderDataLists(currentDraft.data.customFields, currentDraft.data.profession);
}

function downloadJson(value, filename) {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function uploadModule(pack) {
  const scope = byId("publish-scope").value;
  const activate = Boolean(byId("publish-activate").checked && scope === "campaign");
  try {
    const result = await publishModule(pack, scope, activate);
    await saveModuleLocally(result.module.pack, { scope: result.module.scope, active: result.module.active, ownerUserId: result.module.ownerUserId });
    await loadServerModules();
    await renderModules();
    showToast(activate ? "Modul veröffentlicht und als Kampagnenversion aktiviert." : "Modul auf LCARS gespeichert.");
  } catch (error) {
    showToast(error.status === 401 ? "Bitte melde dich bei LCARS an, um Module zu synchronisieren." : error.message, "error");
  }
}

async function loadServerModules() {
  if (!navigator.onLine) throw new Error("Offline: Modulupdates sind erst bei einer Verbindung verfügbar.");
  const result = await getServerModules();
  state.serverModules = result.modules || [];
  state.activeModules = result.activeModules || [];
  state.canManageModules = Boolean(result.canManageModules);
  state.canManageCharacters = Boolean(result.canManageCharacters);
  state.canShareCampaign = Boolean(result.canShareCampaign);
  state.currentUserId = result.userId ?? state.currentUserId;
  await setSetting("activeModules", state.activeModules);
  await setSetting("profileRights", {
    userId: state.currentUserId,
    canShareCampaign: state.canShareCampaign,
    canManageCharacters: state.canManageCharacters,
    canManageModules: state.canManageModules,
  });
}

async function refresh() {
  state.modules = await allModules();
  await renderCharacters();
  await renderModules();
  if (state.selectedId) {
    state.selectedCharacter = await getCharacter(state.selectedId);
    if (!belongsToActiveProfile(state.selectedCharacter)) {
      state.selectedId = null;
      state.selectedCharacter = null;
    }
    fillForm(state.selectedCharacter);
  }
}

async function applyServerIdentity(payload) {
  if (payload.userId == null) return;
  state.currentUserId = payload.userId;
  state.canShareCampaign = Boolean(payload.canShareCampaign);
  state.canManageCharacters = Boolean(payload.canManageCharacters);
  await setSetting("profileRights", {
    userId: state.currentUserId,
    canShareCampaign: state.canShareCampaign,
    canManageCharacters: state.canManageCharacters,
    canManageModules: state.canManageModules,
  });
}

async function syncNow() {
  if (state.syncing) return;
  if (!navigator.onLine) {
    setConnection("Offline", "offline");
    byId("sync-detail").textContent = "Änderungen warten auf Verbindung";
    return;
  }
  state.syncing = true;
  byId("sync-button").disabled = true;
  setConnection("Synchronisiere …", "busy");
  try {
    // Requests whose response was lost are safe to retry with their original opId.
    await resetInflight();

    const probe = await pullChanges(0);
    await applyServerIdentity(probe);
    const cursorKey = `syncCursor:${state.currentUserId ?? "local"}`;
    let cursor = Number(await getSetting(cursorKey) || 0);
    let firstPage = cursor === 0 ? probe : null;
    let more = true;
    let received = 0;
    while (more) {
      const page = firstPage || await pullChanges(cursor);
      firstPage = null;
      await applyServerIdentity(page);
      for (const remote of page.changes || []) {
        await applyRemoteChange(remote);
        received++;
      }
      cursor = Number(page.nextCursor || cursor);
      await setSetting(`syncCursor:${state.currentUserId ?? "local"}`, cursor);
      more = Boolean(page.hasMore);
    }

    const queued = (await getOutbox()).filter((item) => item.status === "pending").sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const batch = [];
    const seen = new Set();
    for (const item of queued) {
      if (seen.has(item.characterId)) continue;
      const character = await getCharacter(item.characterId);
      if (character?.ownerUserId != null && character.ownerUserId !== state.currentUserId) continue;
      if (character?.conflict) continue;
      seen.add(item.characterId);
      batch.push(item);
      if (batch.length >= 50) break;
    }
    if (batch.length) {
      await markOutboxInflight(batch.map((item) => item.opId));
      const payload = batch.map((item) => ({ opId: item.opId, characterId: item.characterId, ...item.mutation }));
      const pushed = await pushMutations(payload);
      for (let index = 0; index < batch.length; index++) {
        const result = (pushed.results || []).find((item) => item.opId === batch[index].opId);
        if (result) await applySyncResult(batch[index], result);
      }
      const followup = await pullChanges(cursor);
      for (const remote of followup.changes || []) {
        await applyRemoteChange(remote);
        received++;
      }
      cursor = Number(followup.nextCursor || cursor);
      await setSetting(`syncCursor:${state.currentUserId ?? "local"}`, cursor);
    }

    try {
      await loadServerModules();
    } catch (error) {
      if (error.status === 401) throw error;
      // Character sync succeeded; module browsing can be retried separately.
    }
    await refresh();
    const conflicts = (await allCharacters()).filter((record) => record.conflict).length;
    const outbox = await getOutbox();
    const remaining = outbox.filter((item) => item.status === "pending").length;
    const denied = outbox.filter((item) => item.status === "forbidden").length;
    setConnection(conflicts ? `${conflicts} Konflikt${conflicts === 1 ? "" : "e"}` : "Synchronisiert", conflicts ? "warning" : "online");
    byId("sync-detail").textContent = denied ? `${denied} Änderung${denied === 1 ? "" : "en"} ohne Schreibrecht` : remaining ? `${remaining} Änderung${remaining === 1 ? "" : "en"} warten` : `Stand aktuell${received ? ` · ${received} Änderungen empfangen` : ""}`;
    if (denied) showToast("Mindestens ein geteilter Charakter ist schreibgeschützt. Die lokale Fassung bleibt auf diesem Gerät erhalten.", "error");
    if (conflicts) showToast("Es gibt Änderungen, die du vergleichen musst.", "error");
    else if (batch.length || received) showToast("Charaktere wurden mit LCARS abgeglichen.");
  } catch (error) {
    setConnection(error.status === 401 ? "LCARS-Anmeldung nötig" : "Sync nicht möglich", "warning");
    byId("sync-detail").textContent = error.status === 401 ? "Zum Synchronisieren bei LCARS anmelden." : error.message;
    if (error.status === 401) showToast("Charaktere bleiben offline verfügbar. Melde dich bei LCARS an, um zu synchronisieren.", "error");
  } finally {
    state.syncing = false;
    byId("sync-button").disabled = false;
  }
}

function setUpdateAvailable(registration) {
  if (!registration.waiting || !navigator.serviceWorker.controller) return;
  byId("app-update-button").classList.remove("hidden");
  byId("app-update-button").onclick = () => registration.waiting?.postMessage("SKIP_WAITING");
}

async function registerPwa() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register("./sw.js", { scope: "./", updateViaCache: "none" });
    setUpdateAvailable(registration);
    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      worker?.addEventListener("statechange", () => setUpdateAvailable(registration));
    });
    if (navigator.onLine) await registration.update().catch(() => {});
    navigator.serviceWorker.addEventListener("controllerchange", () => location.reload());
  } catch {
    showToast("Offline-Cache konnte nicht eingerichtet werden. Bitte über HTTPS oder localhost öffnen.", "error");
  }
}

function bindEvents() {
  document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => showPanel(tab.dataset.panel)));
  byId("new-character").addEventListener("click", showEditorNew);
  byId("character-search").addEventListener("input", () => void renderCharacters());
  byId("sync-button").addEventListener("click", () => void syncNow());
  byId("theme-toggle").addEventListener("click", () => setTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light"));
  document.querySelectorAll("[data-catalog]").forEach((button) => button.addEventListener("click", () => openCatalog(button.dataset.catalog)));
  byId("catalog-close").addEventListener("click", () => byId("catalog-dialog").close());
  byId("catalog-search").addEventListener("input", renderCatalogResults);
  byId("catalog-filter").addEventListener("change", renderCatalogResults);
  byId("only-eligible").addEventListener("change", renderCatalogResults);
  byId("spell-search").addEventListener("input", renderTechnomageSpells);
  byId("only-reachable-spells").addEventListener("change", renderTechnomageSpells);
  byId("catalog-results").addEventListener("click", (event) => {
    if (state.readOnly) return;
    const open = event.target.closest("[data-open-catalog-id]");
    if (open) { state.catalogOpenId = state.catalogOpenId === open.dataset.openCatalogId ? null : open.dataset.openCatalogId; renderCatalogResults(); return; }
    const add = event.target.closest("[data-add-catalog-id]");
    if (!add) return;
    const item = catalogItems(state.catalogType).find((entry) => String(entry.id) === add.dataset.addCatalogId);
    if (!item) return;
    if (state.catalogType === "focuses") {
      if (!state.catalogSelections.focuses.some((name) => normalized(name) === normalized(item.name))) state.catalogSelections.focuses.push(item.name);
    } else {
      const card = add.closest(".catalog-item");
      const selection = card.querySelector("[data-selection-option]")?.value || "";
      const kind = talentSelectionKind(item.name);
      if (kind && !selection) { showToast("Choose the talent option first / Bitte zuerst die Talent-Auswahl festlegen.", "error"); return; }
      const customName = card.querySelector("[data-custom-name]")?.value || "";
      state.catalogSelections.talents.push(formatTalentEntry(item.name, selection, customName));
    }
    renderCatalogSelections();
    updateTotals();
    renderTechnomageSpells();
    renderCatalogResults();
  });
  byId("check-modules").addEventListener("click", async () => {
    try {
      await loadServerModules();
      await renderModules();
      showToast("Kampagnenmodule und verfügbare Updates geladen.");
    } catch (error) {
      showToast(error.status === 401 ? "Bitte melde dich bei LCARS an, um Module abzurufen." : error.message, "error");
    }
  });
  byId("import-module").addEventListener("click", () => byId("module-file").click());
  byId("module-file").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const pack = validateModulePack(JSON.parse(await file.text()));
      await saveModuleLocally(pack, { scope: "private", ownerUserId: state.currentUserId });
      await renderModules();
      showToast(`Modul ${pack.manifest.title} lokal installiert.`);
    } catch (error) { showToast(error.message || "Modul konnte nicht gelesen werden.", "error"); }
  });
  byId("character-form").addEventListener("input", (event) => {
    if (event.target.matches("input[type='number']")) updateTotals();
  });
  byId("character-form").addEventListener("change", (event) => {
    if (event.target.name === "creationMethod") updateTotals();
    if (event.target.name === "attributes.reason") renderTechnomageSpells();
    if (event.target.name === "profession") {
      const roleOption = event.target.selectedOptions[0];
      if (event.target.value === "__custom__") {
        byId("custom-profession-field").classList.remove("hidden");
        byId("custom-profession").focus();
        renderTechnomageSpells();
        return;
      }
      byId("custom-profession-field").classList.add("hidden");
      const current = readForm();
      const selected = { ...current.moduleVersions };
      if (roleOption?.dataset.moduleId && roleOption?.dataset.moduleVersion) {
        selected[roleOption.dataset.moduleId] = roleOption.dataset.moduleVersion;
      }
      renderPins(selected);
      renderDataLists(current.data.customFields, current.data.profession);
      renderStatFields(current.data);
    }
    if (event.target.name === "module-pin") {
      if (event.target.checked) {
        for (const other of form.querySelectorAll("input[name='module-pin']")) {
          if (other !== event.target && other.dataset.moduleId === event.target.dataset.moduleId) other.checked = false;
        }
      }
      const current = readForm();
      renderDataLists(current.data.customFields, current.data.profession);
      renderStatFields(current.data);
    }
    if (event.target.name === "visibility") {
      const current = readForm();
      const active = state.selectedCharacter?.moduleVersions || Object.fromEntries(activeModulePacks().map((pack) => [pack.manifest.id, pack.manifest.version]));
      renderPins(active);
      renderDataLists(current.data.customFields, current.data.profession);
      renderStatFields(current.data);
    }
  });
  byId("character-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = readForm();
    if (!values.data.name) { form.elements.namedItem("name").focus(); return; }
    try {
      const record = await saveCharacter(state.selectedCharacter, values, state.currentUserId);
      state.selectedId = record.id;
      state.selectedCharacter = record;
      await refresh();
      fillForm(record);
      showToast("Änderung lokal gespeichert.");
      if (navigator.onLine) void syncNow();
    } catch (error) { showToast(`Speichern fehlgeschlagen: ${error.message}`, "error"); }
  });
  window.addEventListener("online", () => { setConnection("Online", "online"); void syncNow(); });
  window.addEventListener("offline", () => { setConnection("Offline", "offline"); byId("sync-detail").textContent = "Änderungen warten auf Verbindung"; });
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.installPrompt = event;
    byId("install-button").classList.remove("hidden");
  });
  byId("install-button").addEventListener("click", async () => {
    if (!state.installPrompt) return;
    state.installPrompt.prompt();
    await state.installPrompt.userChoice;
    state.installPrompt = null;
    byId("install-button").classList.add("hidden");
  });
  window.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && navigator.onLine) void syncNow(); });
}

async function init() {
  let savedTheme = "dark";
  try { savedTheme = localStorage.getItem("sta-char-editor-theme") || "dark"; } catch { /* Theme storage is optional. */ }
  setTheme(savedTheme);
  bindEvents();
  await openStore();
  const profileRights = await getSetting("profileRights");
  if (profileRights) {
    state.currentUserId = profileRights.userId ?? null;
    state.canShareCampaign = Boolean(profileRights.canShareCampaign);
    state.canManageCharacters = Boolean(profileRights.canManageCharacters);
    state.canManageModules = Boolean(profileRights.canManageModules);
  }
  const base = JSON.parse(await (await fetch("./modules/base-sta2e.json")).text());
  validateModulePack(base);
  const technomage = validateModulePack(JSON.parse(await (await fetch("./modules/technomage.json")).text()));
  const defaultPacks = [
    { pack: base, metadata: { scope: "campaign", active: true } },
    { pack: technomage, metadata: { scope: "private", active: false } },
  ];
  embeddedModuleKeys.clear();
  for (const { pack } of defaultPacks) embeddedModuleKeys.add(formatModuleKey(pack));
  const removedDefaultKeys = new Set(await getSetting(REMOVED_BUNDLED_MODULES_KEY) || []);
  const installedKeys = new Set((await allModules()).map((entry) => entry.key));
  for (const { pack, metadata } of defaultPacks) {
    const key = formatModuleKey(pack);
    if (!installedKeys.has(key) && !removedDefaultKeys.has(key)) {
      await saveModule(pack, metadata);
      installedKeys.add(key);
    }
  }
  const cachedActive = await getSetting("activeModules");
  state.activeModules = cachedActive || [{ moduleId: BASE_MODULE_ID, moduleVersion: BASE_MODULE_VERSION }];
  if (navigator.onLine) {
    try { await loadServerModules(); } catch { /* Offline / unauthenticated use remains available. */ }
  }
  await refresh();
  if (navigator.onLine) void syncNow();
  else setConnection("Offline", "offline");
  await registerPwa();
}

init().catch((error) => {
  console.error(error);
  setConnection("Lokaler Speicher nicht verfügbar", "warning");
  showToast("Der lokale Speicher konnte nicht geöffnet werden. Bitte prüfe den privaten Browsermodus.", "error");
});
