"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { LcarsDataRow, LcarsAccordion } from "@/components/lcars";
import type { UserContentLog } from "@/lib/characters";
import type { DialogueSummary } from "@/lib/dialoguesCore";
import { AUTHOR_COLORS, fmtDate, sessionLabel } from "@/lib/missionFormat";
import type { Character } from "@/types/character";

type TypeFilter = "all" | "log" | "dialogue";

interface CharacterGroup {
  slug: string;
  name: string;
  color: string;
  logs: UserContentLog[];
  dialogues: DialogueSummary[];
}

// "Meine Inhalte": gruppiert Einsatzberichte & Gespräche nach eigenem
// Charakter, darunter nach Typ. Jede Typ-Gruppe ist ein Akkordeon (Einträge
// standardmäßig eingeklappt), zusätzlich filterbar nach Typ und Charakter.
export default function UserContentBrowser({
  characters,
  logs,
  dialogues,
}: {
  characters: Character[];
  logs: UserContentLog[];
  dialogues: DialogueSummary[];
}) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [characterFilter, setCharacterFilter] = useState<string | null>(null);

  const groups = useMemo(() => {
    const order = characters.map((c) => c.slug);
    const map = new Map<string, CharacterGroup>();

    const ensure = (slug: string, name: string): CharacterGroup => {
      let group = map.get(slug);
      if (!group) {
        group = {
          slug,
          name,
          color: AUTHOR_COLORS[map.size % AUTHOR_COLORS.length],
          logs: [],
          dialogues: [],
        };
        map.set(slug, group);
      }
      return group;
    };

    for (const log of logs) {
      ensure(log.character_slug, log.character_name).logs.push(log);
    }
    for (const d of dialogues) {
      ensure(d.characterSlug, d.characterName).dialogues.push(d);
    }

    return [...map.values()].sort((a, b) => {
      const diff = order.indexOf(a.slug) - order.indexOf(b.slug);
      return diff !== 0 ? diff : a.name.localeCompare(b.name, "de");
    });
  }, [characters, logs, dialogues]);

  const visibleGroups = useMemo(
    () =>
      groups
        .filter((g) => !characterFilter || g.slug === characterFilter)
        .map((g) => ({
          ...g,
          logs: typeFilter === "dialogue" ? [] : g.logs,
          dialogues: typeFilter === "log" ? [] : g.dialogues,
        }))
        .filter((g) => g.logs.length > 0 || g.dialogues.length > 0),
    [groups, characterFilter, typeFilter],
  );

  const totalLogs = logs.length;
  const totalDialogues = dialogues.length;

  if (totalLogs === 0 && totalDialogues === 0) {
    return <p className="lcars-empty-state">Noch keine Inhalte vorhanden.</p>;
  }

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="mission-toolbar">
        <div className="mission-sort">
          <TypeButton
            active={typeFilter === "all"}
            onClick={() => setTypeFilter("all")}
          >
            Alle ({totalLogs + totalDialogues})
          </TypeButton>
          <TypeButton
            active={typeFilter === "log"}
            onClick={() => setTypeFilter("log")}
          >
            Einsatzberichte ({totalLogs})
          </TypeButton>
          <TypeButton
            active={typeFilter === "dialogue"}
            onClick={() => setTypeFilter("dialogue")}
          >
            Gespräche ({totalDialogues})
          </TypeButton>
        </div>

        {groups.length > 1 && (
          <select
            className="mission-author-filter"
            value={characterFilter ?? ""}
            onChange={(e) => setCharacterFilter(e.target.value || null)}
            aria-label="Nach Charakter filtern"
          >
            <option value="">Alle Charaktere</option>
            {groups.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {visibleGroups.length === 0 ? (
        <p className="lcars-empty-state">Keine Einträge für diese Auswahl.</p>
      ) : (
        visibleGroups.map((group) => (
          <section key={group.slug} className="flex flex-col gap-[8px]">
            <LcarsDataRow
              value={group.logs.length + group.dialogues.length}
              label={group.name}
              href={`/characters/${group.slug}`}
              color={group.color}
              className="lcars-data-row--full"
            />

            <div className="flex flex-col gap-[8px] pl-[16px]">
              {group.logs.length > 0 && (
                <LcarsAccordion
                  value={group.logs.length}
                  label="Einsatzberichte"
                  color="var(--lcars-blue)"
                >
                  <div className="flex flex-col gap-[6px]">
                    {group.logs.map((log) => (
                      <Link
                        key={log.id}
                        href={`/missions/${log.mission_slug}/${log.slug}`}
                        className="mission-akte"
                        style={
                          {
                            "--mission-color": "var(--lcars-blue)",
                          } as React.CSSProperties
                        }
                      >
                        <span className="mission-akte-rail" />
                        <span className="mission-akte-body text-left">
                          <span className="mission-akte-title block">
                            {log.title}
                          </span>
                          <span className="mission-akte-meta">
                            <span>
                              <b>Session</b> {sessionLabel(log.session_nr)}
                            </span>
                            <span>
                              <b>Datum</b> {fmtDate(log.log_date)}
                            </span>
                            <span>
                              <b>Mission</b> {log.mission_title}
                            </span>
                          </span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </LcarsAccordion>
              )}

              {group.dialogues.length > 0 && (
                <LcarsAccordion
                  value={group.dialogues.length}
                  label="Gespräche"
                  color="var(--lcars-text-data)"
                >
                  <div className="flex flex-col gap-[6px]">
                    {group.dialogues.map((d) => (
                      <Link
                        key={d.slug}
                        href={
                          d.open ? `/dialogues/${d.slug}` : `/archive/${d.slug}`
                        }
                        className="mission-akte"
                        style={
                          {
                            "--mission-color": d.open
                              ? "var(--lcars-green)"
                              : "var(--lcars-red)",
                          } as React.CSSProperties
                        }
                      >
                        <span className="mission-akte-rail" />
                        <span className="mission-akte-body text-left">
                          <span className="mission-akte-title block">
                            {d.title}
                          </span>
                          <span className="mission-akte-meta">
                            <span>
                              <b>Gesprächspartner</b> {d.partnerName}
                            </span>
                            <span>
                              <b>Status</b>{" "}
                              {d.open ? "Offen" : "Abgeschlossen"}
                            </span>
                          </span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </LcarsAccordion>
              )}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function TypeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      className="lcars-switch flex-1"
      style={{
        backgroundColor: active ? "var(--lcars-amber)" : "var(--lcars-surface)",
        color: active ? "var(--lcars-bg)" : "var(--lcars-text-data)",
        borderColor: active ? "var(--lcars-amber)" : "var(--lcars-text-data)",
      }}
    >
      {children}
    </div>
  );
}
