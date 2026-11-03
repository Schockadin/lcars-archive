/**
 * Auswahlkataloge für STA-2e-Charaktere.
 *
 * Die Species-Abilities stammen aus „Neo 5 Trek - Species.docx.pdf“; Einträge,
 * die in der Quelle noch Platzhalter sind, werden hier bewusst nicht erfunden.
 * Rollenboni folgen dem STA-2e-Grundregelwerk.
 */

export interface SpeciesAbilityOption {
  id: string;
  name: string;
  description: string;
}

export interface SpeciesOption {
  id: string;
  name: string;
  label: string;
  aliases?: string[];
  abilities: SpeciesAbilityOption[];
}

export interface RoleOption {
  id: string;
  name: string;
  label: string;
  description: string;
  aliases?: string[];
}

export const SPECIES_OPTIONS: SpeciesOption[] = [
  { id: "human", name: "Human", label: "Mensch (Human)", aliases: ["Mensch", "Menschen"], abilities: [
    { id: "faith-of-the-heart", name: "Faith of the Heart", description: "Wenn du mit einem deiner Werte Entschlossenheit ausgibst oder erhältst, kommt zusätzlich 1 Momentum in den Gruppenpool." },
  ] },
  { id: "andorian", name: "Andorian", label: "Andorianer (Andorian)", aliases: ["Andorianer", "Andorianerin"], abilities: [
    { id: "intense", name: "Intense", description: "Bei einem erfolgreichen Task mit für Bedrohung gekauften d20 erhältst du je gekauftem Würfel 1 Bonus-Momentum. Es kann nicht gespeichert werden." },
  ] },
  { id: "aenar", name: "Aenar", label: "Aenar", abilities: [
    { id: "telepathic", name: "Telepathic", description: "Du kannst nahe Gedanken wahrnehmen und lesen. Das Lesen ohne Erlaubnis ist tabu; Details regelt das Telepathy-Talent." },
  ] },
  { id: "vulcan", name: "Vulcan", label: "Vulkanier (Vulcan)", aliases: ["Vulkanier", "Vulkanierin"], abilities: [
    { id: "mental-discipline", name: "Mental Discipline", description: "Maximaler Stress basiert auf Kontrolle statt Fitness. Du kannst 2 Stress erleiden, um ein Merkmal zu vermeiden, das einen emotionalen Zustand darstellt. Bei Fatigue steigt die Potenz solcher Merkmale um 1." },
  ] },
  { id: "tellarite", name: "Tellarite", label: "Tellarit (Tellarite)", aliases: ["Tellariter", "Tellariterin"], abilities: [
    { id: "sturdy", name: "Sturdy", description: "Du erhältst +1 Schutz ausschließlich gegen Betäubungsangriffe. Bei einer Komplikation durch körperliche Behinderung, Betäubung, Benommenheit oder Desorientierung kannst du 1 Stress erleiden, um sie samt zugehörigem Merkmal zu ignorieren." },
  ] },
  { id: "bajoran", name: "Bajoran", label: "Bajoraner (Bajoran)", aliases: ["Bajoranerin"], abilities: [
    { id: "will-of-the-prophets", name: "The Will of the Prophets", description: "Einmal pro Abenteuer erhältst du 1 Entschlossenheit, wenn die Spielleitung auf einmal mindestens 3 Bedrohung ausgibt." },
  ] },
  { id: "barzan", name: "Barzan", label: "Barzan", abilities: [] },
  { id: "betazoid", name: "Betazoid", label: "Betazoid", abilities: [
    { id: "telepathic", name: "Telepathic", description: "Du kannst nahe Gedanken und Emotionen wahrnehmen. Deine Ausprägung ist Empathie oder Telepathie; Teil-Betazoiden haben üblicherweise Empathie." },
  ] },
  { id: "denobulan", name: "Denobulan", label: "Denobulaner (Denobulan)", aliases: ["Denobulanerin"], abilities: [
    { id: "breadth-of-study", name: "Breadth of Study", description: "Du wählst zwei zusätzliche Schwerpunkte." },
  ] },
  { id: "trill", name: "Trill", label: "Trill", abilities: [
    { id: "patient", name: "Patient", description: "Bei einem erfolgreichen Task mit durch Momentum gekauften d20 erhältst du je gekauftem Würfel 1 Bonus-Momentum. Es kann nicht gespeichert werden." },
  ] },
  { id: "cardassian", name: "Cardassian", label: "Cardassianer (Cardassian)", aliases: ["Cardassianerin"], abilities: [
    { id: "healthy-suspicions", name: "Healthy Suspicions", description: "Bei einer Interaktion mit einem NSC kannst du 1 Bedrohung ausgeben und die Spielleitung fragen, ob der NSC in einer Sache lügt. Die Ja/Nein-Antwort muss stimmen." },
  ] },
  { id: "centauri", name: "Centauri", label: "Centauri", abilities: [] },
  { id: "dilgar", name: "Dilgar", label: "Dilgar", abilities: [] },
  { id: "ferengi", name: "Ferengi", label: "Ferengi", abilities: [
    { id: "great-material-continuum", name: "The Great Material Continuum", description: "Einmal pro Sitzung reduzierst du beim Beschaffen zusätzlicher Ausrüstung deren Gelegenheitskosten um 1, mindestens auf 0." },
  ] },
  { id: "klingon", name: "Klingon", label: "Klingone (Klingon)", aliases: ["Klingonin"], abilities: [
    { id: "braklul", name: "Brak’Lul", description: "Du erhältst 1 Schutz zusätzlich zu Rüstung. Bei Erster Hilfe an dir darf ein anderer Charakter einen d20 neu würfeln." },
  ] },
  { id: "minbari", name: "Minbari", label: "Minbari", abilities: [] },
  { id: "moclan", name: "Moclan", label: "Moclaner (Moclan)", aliases: ["Moclanerin", "Moclans"], abilities: [
    { id: "unyielding-resilience", name: "Unyielding Resilience", description: "Bei einer Verletzung durch körperliche Gewalt, kinetischen Aufprall oder Energiewaffen kannst du sofort 1 Entschlossenheit ausgeben oder 2 Bedrohung hinzufügen. Dann ignorierst du die Verletzungsfolgen bis zum Szenenende." },
  ] },
  { id: "narn", name: "Narn", label: "Narn", abilities: [] },
  { id: "romulan", name: "Romulan", label: "Romulaner (Romulan)", aliases: ["Romulanerin"], abilities: [] },
  { id: "abbai", name: "Abbai", label: "Abbai", abilities: [] },
  { id: "brakiri", name: "Brakiri", label: "Brakiri", abilities: [] },
  { id: "drazi", name: "Drazi", label: "Drazi", abilities: [] },
  { id: "gaim", name: "Gaim", label: "Gaim", abilities: [] },
  { id: "hyach", name: "Hyach", label: "Hyach", abilities: [] },
  { id: "markab", name: "Markab", label: "Markab", abilities: [] },
  { id: "pakmara", name: "Pak’ma‘ra", label: "Pak’ma‘ra", aliases: ["Pak'ma'ra", "Pak'mara"], abilities: [] },
  { id: "vree", name: "Vree", label: "Vree", aliases: ["Ventari"], abilities: [] },
];

export const ROLE_OPTIONS: RoleOption[] = [
  { id: "commanding-officer", name: "Commanding Officer", label: "Kommandierender Offizier (Commanding Officer)", description: "Du kannst Entschlossenheit ausgeben, damit eine erreichbare Person, mit der du kommunizieren kannst, 1 Entschlossenheit erhält. Das muss nicht an einen Wert gebunden sein.", aliases: ["Captain", "Kapitän", "Captain/Commanding Officer"] },
  { id: "executive-officer", name: "Executive Officer", label: "Erster Offizier (Executive Officer)", description: "Wenn ein verbündeter Charakter in Kommunikation mit dir Entschlossenheit ausgibt, kannst du 3 Momentum ausgeben, damit die Person den Punkt zurückerhält.", aliases: ["XO", "First Officer", "Erster Offizier"] },
  { id: "operations-manager", name: "Operations Manager", label: "Operationsleitung (Operations Manager)", description: "Wenn du ein Merkmal für Ausrüstung oder deren Modifikation erschaffst, kann eine anwesende Person bei einem davon profitierenden Task einen d20 neu würfeln.", aliases: ["Operations Officer", "Operations Manager"] },
  { id: "chief-engineer", name: "Chief Engineer", label: "Chefingenieur (Chief Engineer)", description: "Gelegenheitskosten für Technikteams sinken um 1. Bei Reparaturtasks am Schiff oder beim Überschreiten seiner normalen Leistungsgrenzen kannst du 1 Momentum ausgeben, um einen d20 neu zu würfeln.", aliases: ["Chief Engineering Officer"] },
  { id: "chief-of-security", name: "Chief of Security", label: "Sicherheitschef (Chief of Security)", description: "Gelegenheitskosten für Waffen und Sicherheitsteams sinken um 1. Nach einem erfolgreichen persönlichen Angriff kannst du 1 Momentum ausgeben, um den nächsten Angriff des Gegners um 1 Schwierigkeit zu erhöhen.", aliases: ["Security Chief", "Chief Security Officer"] },
  { id: "chief-tactical-officer", name: "Chief Tactical Officer", label: "Taktischer Offizier (Chief Tactical Officer)", description: "Bei einem erfolgreichen Angriff mit Schiffswaffen kannst du 1 statt 2 Momentum ausgeben, um den Schadenswert des Waffensystems zu erhöhen.", aliases: ["Tactical Officer", "Armory Officer", "Weapons Officer"] },
  { id: "flight-controller", name: "Flight Controller", label: "Flugkontrolle (Flight Controller)", description: "Bei Technikaufgaben zu Flug oder Antrieb darfst du Conn statt Technik verwenden. Bei einem erfolgreichen Conn-Task zum Steuern eines Raumschiffs erhältst du 1 nicht speicherbares Bonus-Momentum.", aliases: ["Helmsman", "Steuermann", "Pilot"] },
  { id: "navigator", name: "Navigator", label: "Navigator (Navigator)", description: "Bei Science-Tasks zu Astrophysik oder Sternennavigation darfst du Conn statt Science verwenden. Beim Manövrieren durch schwieriges oder gefährliches Terrain kannst du 1 Momentum ausgeben, um eine Komplikation zu ignorieren.", aliases: ["Astrometrics Officer", "Stellar Cartographer"] },
  { id: "science-officer", name: "Science Officer", label: "Wissenschaftsoffizier (Science Officer)", description: "Bei einem erfolgreichen Task mit Assistenz durch Schiffssensoren oder Computer, oder mit Tricorder bzw. anderem Sensorgerät, darfst du eine zusätzliche Frage wie bei Momentum für Informationen stellen.", aliases: ["Chief Science Officer"] },
  { id: "chief-medical-officer", name: "Chief Medical Officer", label: "Leitender medizinischer Offizier (Chief Medical Officer)", description: "Gelegenheitskosten für medizinische Ausrüstung und medizinische Teams sinken um 1. Bei einem Medicine-Task mit Assistenz erhältst du 1 nicht speicherbares Bonus-Momentum.", aliases: ["CMO"] },
  { id: "ships-doctor", name: "Ship’s Doctor", label: "Schiffsarzt (Ship’s Doctor)", description: "Du erhältst zwei zusätzliche medizinische Schwerpunkte. Dein Schiff kann Crew Support nicht einsetzen, um medizinisches Unterstützungspersonal einzuführen.", aliases: ["Ship's Doctor", "Station's Doctor", "Ships Doctor"] },
  { id: "ships-counselor", name: "Ship’s Counselor", label: "Schiffsberater (Ship’s Counselor)", description: "Bei Assistenz für eine Person mit einem Merkmal zu einem negativen Gefühlszustand darfst du den Assistenzwürfel neu würfeln. Einmal pro Mission kannst du nach einer Werte-Herausforderung eine Überarbeitung des Werts samt 1 Entschlossenheit ermöglichen.", aliases: ["Ship's Counselor", "Station's Counselor", "Ships Counselor"] },
  { id: "communications-officer", name: "Communications Officer", label: "Kommunikationsoffizier (Communications Officer)", description: "Wenn ein Task durch die Computer oder Kommunikationssysteme des Schiffs unterstützt wird, zählt der Schiffswürfel als eine 1 (zwei Erfolge), statt ihn zu würfeln.", aliases: ["Comm-Officer", "Comm Officer", "Comms Officer", "Communications"] },
  { id: "bodyguard", name: "Bodyguard", label: "Leibwache (Bodyguard)", description: "Wähle eine zu schützende Person. Befindest du dich mit ihr in derselben Zone, kannst du bei einem Angriff auf sie 1 Momentum ausgeben, um das Ziel zu werden; die Schwierigkeit des Angriffs steigt um 1." },
  { id: "expert", name: "Expert", label: "Fachperson (Expert)", description: "Du erhältst einen zusätzlichen Wert. Wähle außerdem einen Schwerpunkt als Fachgebiet; bei einem erfolgreichen Task, auf den er zutrifft, erhältst du 1 nicht speicherbares Bonus-Momentum." },
  { id: "intelligence-agent", name: "Intelligence Agent", label: "Nachrichtendienst (Intelligence Agent)", description: "Einmal pro Abenteuer erschaffst du ohne Task oder Ressourcenkosten ein Merkmal, das Informationen, Sachmittel oder Zugang durch einen Kontakt bzw. deine Organisation darstellt." },
  { id: "merchant", name: "Merchant", label: "Händler (Merchant)", description: "Einmal pro Abenteuer kannst du für bis zu drei Ausrüstungsgegenstände anderer Spielercharaktere die Gelegenheitskosten ignorieren. Normalerweise unzugängliche Gegenstände sind möglich, kosten jeweils zusätzlich 1 Bedrohung." },
  { id: "political-liaison", name: "Political Liaison", label: "Politische Verbindung (Political Liaison)", description: "Du erhältst eine zusätzliche, nur für dich geltende Direktive, die die politische Haltung deiner Regierung abbildet. Die Spielleitung legt sie mit dir fest." },
  { id: "translator", name: "Translator", label: "Übersetzer (Translator)", description: "Für 2 Momentum kannst du sofort ein Grundverständnis einer unbekannten Sprache gewinnen. Gespräche darin sind möglich, aber ihre Komplikationsspanne steigt auf 18–20, bis du sie weiter studierst." },
];

function normalized(value: string): string {
  return value.toLowerCase().replace(/[’‘']/g, "").replace(/[^a-z0-9]/g, "");
}

export function findSpeciesOption(value: string): SpeciesOption | undefined {
  const candidate = normalized(value);
  return SPECIES_OPTIONS.find((species) =>
    [species.name, species.label, ...(species.aliases ?? [])].some(
      (name) => normalized(name) === candidate,
    ),
  );
}

export function getSpeciesLabel(value: string): string {
  return findSpeciesOption(value)?.label ?? value;
}

export function getSpeciesListLabel(value: string | null | undefined): string {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map(getSpeciesLabel)
    .join(", ");
}

export interface SpeciesAbilityChoice extends SpeciesAbilityOption {
  speciesName: string;
  value: string;
}

export function getSpeciesAbilityChoices(speciesNames: string[]): SpeciesAbilityChoice[] {
  const selected = new Set(speciesNames.map(normalized));
  return SPECIES_OPTIONS
    .filter((species) => [species.name, species.label, ...(species.aliases ?? [])].some((name) => selected.has(normalized(name))))
    .flatMap((species) => species.abilities.map((ability) => ({
      ...ability,
      speciesName: species.name,
      value: `${species.name} — ${ability.name}`,
    })));
}

export function findRoleOption(value: string | null | undefined): RoleOption | undefined {
  if (!value) return undefined;
  const candidate = normalized(value);
  return ROLE_OPTIONS.find((role) =>
    [role.name, role.label, ...(role.aliases ?? [])].some(
      (name) => normalized(name) === candidate,
    ),
  );
}

export function getRoleLabel(value: string | null | undefined): string {
  return findRoleOption(value)?.label ?? value ?? "";
}

/** Remove old hand-entered role lines now supplied by the role catalog. */
export function getAdditionalRoleBonusNotes(
  role: string | null | undefined,
  additionalRules: string[] = [],
): string[] {
  const option = findRoleOption(role);
  if (!option) return additionalRules.map((entry) => entry.trim()).filter(Boolean);

  const knownRoleNames = new Set(
    [option.name, ...(option.aliases ?? [])].map(normalized),
  );
  return additionalRules
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry) => {
      const prefix = entry.match(/^\s*([^:：]+)\s*:/u)?.[1];
      return !prefix || !knownRoleNames.has(normalized(prefix));
    });
}

export function getRoleBonusEntries(
  role: string | null | undefined,
  additionalRules: string[] = [],
): string[] {
  const option = findRoleOption(role);
  const bonus = option ? `${option.name}: ${option.description}` : null;
  return [...(bonus ? [bonus] : []), ...getAdditionalRoleBonusNotes(role, additionalRules)];
}
