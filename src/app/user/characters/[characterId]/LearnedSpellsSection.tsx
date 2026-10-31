import {
  getTechnomageSchool,
  getTechnomageSpell,
  groupTechnomageSpellVariants,
  technomageSpellDetails,
} from "@/lib/technomageSpellCatalog";
import type { TechnomageSchool } from "@/types/characterStats";

export default function LearnedSpellsSection({
  learnedSpellIds,
  primarySchool,
  weakSchools,
}: {
  learnedSpellIds: readonly string[];
  primarySchool: TechnomageSchool | null;
  weakSchools: readonly TechnomageSchool[];
}) {
  const learnedSpells = learnedSpellIds
    .map(getTechnomageSpell)
    .filter((spell) => spell !== undefined);
  const groups = groupTechnomageSpellVariants(learnedSpells);

  return (
    <section
      aria-labelledby="learned-spells-title"
      className="flex flex-col gap-[10px] rounded-[10px] border border-current/25 p-[12px]"
    >
      <h3 id="learned-spells-title" className="text-lg font-bold">
        Learned Spells // Gelernte Spells
      </h3>
      {groups.length === 0 ? (
        <p className="text-sm opacity-75">Noch keine Spells gelernt.</p>
      ) : (
        <div className="grid gap-[10px] md:grid-cols-2">
          {groups.map((group) => (
            <article
              key={group.key}
              aria-label={"Spell-Familie " + group.name}
              className="flex flex-col gap-[10px] rounded-[8px] border border-current/20 p-[10px]"
            >
              <h4 className="text-base font-bold text-lcars-senary-ink">
                {group.name}
              </h4>
              {group.spells.map((spell) => {
                const details = technomageSpellDetails(
                  spell,
                  primarySchool,
                  weakSchools,
                );
                const school = getTechnomageSchool(spell.school);

                return (
                  <section
                    key={spell.id}
                    aria-label={spell.name}
                    className="flex flex-col gap-[7px] border-t border-current/15 pt-[8px] first:border-0 first:pt-0"
                  >
                    {group.spells.length > 1 && (
                      <h5 className="font-bold">{spell.name}</h5>
                    )}
                    <p className="text-xs opacity-75">
                      {school ? school.label + " (" + school.original + ") · " : ""}
                      Fact Book, S. {spell.sourcePage}
                      {spell.elementalCategory
                        ? " · Elementarkategorie: " + spell.elementalCategory
                        : ""}
                    </p>
                    {details.fields.length > 0 && (
                      <dl className="grid grid-cols-[max-content_1fr] gap-x-[8px] gap-y-[3px] text-sm">
                        {details.fields.map(({ label, value }) => (
                          <div key={label} className="contents">
                            <dt className="font-bold">{label}:</dt>
                            <dd>{value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    <div>
                      <h6 className="text-sm font-bold">Spell-Beschreibung</h6>
                      <p className="text-sm">{details.mechanics}</p>
                    </div>
                    <div>
                      <h6 className="text-sm font-bold">Fluff</h6>
                      <p className="text-sm opacity-80">{details.fluff}</p>
                    </div>
                  </section>
                );
              })}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
