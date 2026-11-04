import type { RuleModuleDefinition } from "@/lib/ruleModuleTypes";
import type { RuleModuleCharacterData } from "@/types/characterStats";

const EMPTY_MODULE_DATA: RuleModuleCharacterData = {
  resources: {},
  selectedTalents: [],
  selectedStatuses: [],
  selectedCollectionEntries: {},
  prestigeClass: null,
  prestigeAbilities: [],
};

function formatCollectionValue(value: string | number | boolean | undefined) {
  if (value === true) return "Ja";
  if (value === false) return "Nein";
  return value === undefined || value === "" ? "—" : String(value);
}

/** Module-specific character tab used before a database character id exists. */
export default function CharacterModuleCreationReference({
  definition,
  saved = EMPTY_MODULE_DATA,
  onChange,
}: {
  definition: RuleModuleDefinition;
  saved?: RuleModuleCharacterData;
  onChange: (value: RuleModuleCharacterData) => void;
}) {
  function patch(next: Partial<RuleModuleCharacterData>) {
    onChange({ ...saved, ...next });
  }

  function toggleList(key: "selectedTalents" | "selectedStatuses", id: string, checked: boolean) {
    const current = saved[key];
    patch({
      [key]: checked
        ? [...current.filter((entry) => entry !== id), id]
        : current.filter((entry) => entry !== id),
    });
  }

  return (
    <div className="flex flex-col gap-[12px]">
      <header>
        <p className="lcars-eyebrow">Regelmodul</p>
        <h2 className="text-lg font-bold">{definition.name}</h2>
        {definition.summary && <p className="lcars-text">{definition.summary}</p>}
      </header>

      {definition.resources.filter((resource) => !(definition.id === "technomage" && resource.id === "power-points")).length > 0 && (
        <section className="flex flex-col gap-[8px]">
          <h3 className="font-bold">Modul-Ressourcen</h3>
          <div className="grid gap-[10px] sm:grid-cols-2">
            {definition.resources
              .filter((resource) => !(definition.id === "technomage" && resource.id === "power-points"))
              .map((resource) => (
                <label key={resource.id} className="flex flex-col gap-[4px] text-sm">
                  {resource.name} ({resource.abbreviation}) · {resource.maximum}
                  <input
                    className="lcars-input w-full"
                    type="number"
                    min={0}
                    max={999999}
                    value={saved.resources[resource.id] ?? 0}
                    onChange={(event) => patch({
                      resources: {
                        ...saved.resources,
                        [resource.id]: Math.max(0, Number(event.currentTarget.value) || 0),
                      },
                    })}
                  />
                </label>
              ))}
          </div>
        </section>
      )}

      {definition.statuses.length > 0 && (
        <section className="flex flex-col gap-[6px]">
          <h3 className="font-bold">Modul-Status</h3>
          <div className="flex flex-wrap gap-[10px]">
            {definition.statuses.map((status) => (
              <label key={status.id} className="flex items-center gap-[6px] text-sm">
                <input
                  type="checkbox"
                  checked={saved.selectedStatuses.includes(status.id)}
                  onChange={(event) => toggleList("selectedStatuses", status.id, event.currentTarget.checked)}
                />
                {status.label}
              </label>
            ))}
          </div>
        </section>
      )}

      {definition.collections.map((collection) => {
        const selected = saved.selectedCollectionEntries[collection.id] ?? [];
        return (
          <section key={collection.id} className="flex flex-col gap-[8px] rounded-[10px] border border-current/20 p-[10px]">
            <div>
              <h3 className="font-bold">{collection.title}</h3>
              {collection.description && <p className="text-sm opacity-75">{collection.description}</p>}
            </div>
            {collection.entries.length > 0 ? (
              <div className="grid gap-[8px] md:grid-cols-2">
                {collection.entries.map((entry) => (
                  <label key={entry.id} className="flex gap-[8px] rounded border border-current/15 p-[8px] text-sm">
                    <input
                      type="checkbox"
                      checked={selected.includes(entry.id)}
                      onChange={(event) => patch({
                        selectedCollectionEntries: {
                          ...saved.selectedCollectionEntries,
                          [collection.id]: event.currentTarget.checked
                            ? [...selected.filter((id) => id !== entry.id), entry.id]
                            : selected.filter((id) => id !== entry.id),
                        },
                      })}
                    />
                    <span className="min-w-0">
                      <strong>{entry.name}</strong>
                      {collection.fields.length > 0 && (
                        <span className="mt-[3px] block text-xs opacity-75">
                          {collection.fields.map((field) => (
                            <span key={field.id} className="mr-[10px]">
                              {field.label}: {formatCollectionValue(entry.values[field.id])}
                            </span>
                          ))}
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm opacity-75">Für diesen Bereich wurden noch keine Einträge angelegt.</p>
            )}
          </section>
        );
      })}

      {definition.talents.length > 0 && (
        <details className="rounded-[10px] border border-current/20 p-[10px]">
          <summary className="cursor-pointer font-bold">Modul-Talente ({saved.selectedTalents.length} dokumentiert)</summary>
          <p className="my-[8px] text-xs opacity-75">
            Hier kannst du bereits erworbene Modul-Talente festhalten. Die Auswahl vergibt keine Talentwahl.
          </p>
          <div className="grid gap-[8px] md:grid-cols-2">
            {definition.talents.map((item) => (
              <label key={item.id} className="flex gap-[8px] rounded border border-current/15 p-[8px] text-sm">
                {item.repeatable ? (
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={saved.selectedTalents.filter((id) => id === item.id).length}
                    aria-label={item.name + " Anzahl"}
                    className="lcars-input w-[72px] self-start"
                    onChange={(event) => {
                      const count = Math.max(0, Math.min(20, Number(event.currentTarget.value) || 0));
                      const other = saved.selectedTalents.filter((id) => id !== item.id);
                      patch({ selectedTalents: [...other, ...Array.from({ length: count }, () => item.id)] });
                    }}
                  />
                ) : (
                  <input
                    type="checkbox"
                    checked={saved.selectedTalents.includes(item.id)}
                    onChange={(event) => toggleList("selectedTalents", item.id, event.currentTarget.checked)}
                  />
                )}
                <span><strong>{item.name}</strong><span className="block text-xs opacity-70">{item.category} · {item.requirements}</span><span className="mt-[3px] block">{item.description}</span></span>
              </label>
            ))}
          </div>
        </details>
      )}

      {definition.prestigeClasses.length > 0 && (
        <section className="flex flex-col gap-[8px] rounded-[10px] border border-current/20 p-[10px]">
          <h3 className="font-bold">Prestige-Pfad</h3>
          <label className="flex flex-col gap-[4px] text-sm">
            Zugehörigkeit
            <select
              className="lcars-input w-full"
              value={saved.prestigeClass ?? ""}
              onChange={(event) => patch({
                prestigeClass: event.currentTarget.value || null,
                prestigeAbilities: [],
              })}
            >
              <option value="">Kein Prestige-Pfad</option>
              {definition.prestigeClasses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          {saved.prestigeClass && (
            <>
              {definition.prestigeClasses.find((item) => item.id === saved.prestigeClass)?.description && (
                <p className="text-sm">{definition.prestigeClasses.find((item) => item.id === saved.prestigeClass)?.description}</p>
              )}
              <p className="text-xs opacity-75">Pfadfähigkeiten werden nach dem Anlegen entsprechend den AP freigeschaltet.</p>
            </>
          )}
        </section>
      )}

      {definition.id === "technomage" && (
        <p className="rounded-[10px] border border-current/20 p-[10px] text-sm">
          Schulen, Spells und Power Points richtest du nach dem Anlegen im Technomage-Tab ein.
        </p>
      )}

      {definition.rules.length > 0 && (
        <details className="rounded-[10px] border border-current/20 p-[10px]">
          <summary className="cursor-pointer font-bold">Regeln des Moduls ({definition.rules.length})</summary>
          <div className="mt-[8px] flex flex-col gap-[10px]">
            {definition.rules.map((rule) => <article key={rule.id}><h3 className="font-bold">{rule.title}</h3><p className="text-sm">{rule.body}</p></article>)}
          </div>
        </details>
      )}

      {!definition.resources.length && !definition.statuses.length && !definition.collections.length && !definition.talents.length && !definition.prestigeClasses.length && definition.id !== "technomage" && (
        <p className="text-sm opacity-75">Dieses Modul ergänzt Regeln, aber keine eigenen Charakterwerte.</p>
      )}
    </div>
  );
}
