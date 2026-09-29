"use client";
import { useMemo, useState } from "react";
export interface CatalogEntry { id: number; name: string; group: string; detail?: string | null; html?: string | null; }
export default function RulesCatalog({ entries, groupLabel }: { entries: CatalogEntry[]; groupLabel: string }) {
  const [query, setQuery] = useState(""); const [group, setGroup] = useState("");
  const groups = [...new Set(entries.map((entry) => entry.group))];
  const filtered = useMemo(() => entries.filter((entry) => {
    if (group && entry.group !== group) return false;
    const search = query.trim().toLocaleLowerCase("de");
    return !search || [entry.name, entry.group, entry.detail, entry.html].some((value) => value?.toLocaleLowerCase("de").includes(search));
  }), [entries, group, query]);
  return <div className="flex flex-col gap-[12px]"><div className="flex flex-wrap gap-[8px]"><label className="flex min-w-[220px] flex-1 flex-col gap-[4px]"><span className="lcars-eyebrow">Suchen</span><input className="lcars-input rounded-full" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name oder Beschreibung" /></label><label className="flex min-w-[180px] flex-1 flex-col gap-[4px]"><span className="lcars-eyebrow">{groupLabel}</span><select className="lcars-input rounded-full" value={group} onChange={(event) => setGroup(event.target.value)}><option value="">Alle</option>{groups.map((item) => <option key={item}>{item}</option>)}</select></label></div>{filtered.length === 0 ? <p className="lcars-empty-state">Keine passenden Einträge.</p> : <ul className="flex flex-col gap-[8px]">{filtered.map((entry) => <li key={entry.id} className="rounded-lg border border-[var(--lcars-ink-dim)]/25 p-[12px]"><div className="flex flex-wrap items-baseline justify-between gap-[8px]"><h2 className="font-semibold">{entry.name}</h2><span className="lcars-eyebrow">{entry.group}</span></div>{entry.detail && <p className="mt-[4px] text-lcars-ink-dim text-[13px]">{entry.detail}</p>}{entry.html && <div className="mission-body mt-[6px]" dangerouslySetInnerHTML={{ __html: entry.html }} />}</li>)}</ul>}</div>;
}
