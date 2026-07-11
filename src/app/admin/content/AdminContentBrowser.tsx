"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { LcarsDataRow } from "@/components/lcars";
import OwnerSelect from "@/components/OwnerSelect";
import { bulkSetContentOwnerAction } from "../contentOwnerActions";
import type { AdminContentItem } from "@/lib/adminContent";
import type { OwnerContentType } from "@/app/actions/owner";

type CategoryFilter = "all" | OwnerContentType;

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  all: "Alle Kategorien",
  character: "Charaktere",
  mission: "Missionen",
  mission_log: "Mission-Logs",
  archive_entry: "Archiv-Einträge",
};

const CATEGORY_COLORS: Record<OwnerContentType, string> = {
  character: "var(--lcars-amber)",
  mission: "var(--lcars-green)",
  mission_log: "var(--lcars-blue)",
  archive_entry: "var(--lcars-purple)",
};

const NO_OWNER = "__none__";

function itemKey(item: { contentType: OwnerContentType; id: number }): string {
  return `${item.contentType}:${item.id}`;
}

// Admin-weite Inhaltsübersicht (alle User, alle vier Inhaltstypen) — anders
// als UserContentBrowser.tsx (nur eigene Inhalte, per-Owner Visibility) liegt
// der Fokus hier auf Owner-Zuordnung: Filter nach Owner/Kategorie, pro Zeile
// OwnerSelect (dieselbe Komponente wie auf den Detailseiten), zusätzlich eine
// Checkbox-Mehrfachauswahl für Mass-Edit (bulkSetContentOwnerAction) — z.B.
// um mehrere per Vault-Ingest ownerlos entstandene Inhalte auf einen Schlag
// zuzuordnen, ohne jede Zeile einzeln umzustellen.
export default function AdminContentBrowser({
  items,
  users,
}: {
  items: AdminContentItem[];
  users: { id: number; name: string }[];
}) {
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOwnerId, setBulkOwnerId] = useState<string>("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<number | null>(null);

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (categoryFilter !== "all" && item.contentType !== categoryFilter) {
          return false;
        }
        if (ownerFilter === "all") return true;
        if (ownerFilter === NO_OWNER) return item.ownerId == null;
        return item.ownerId === Number(ownerFilter);
      }),
    [items, categoryFilter, ownerFilter],
  );

  const groups = useMemo(() => {
    const byType: Record<OwnerContentType, AdminContentItem[]> = {
      character: [],
      mission: [],
      mission_log: [],
      archive_entry: [],
    };
    for (const item of filteredItems) {
      byType[item.contentType].push(item);
    }
    return byType;
  }, [filteredItems]);

  function toggleSelected(key: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function toggleSelectAllVisible() {
    const visibleKeys = filteredItems.map(itemKey);
    const allSelected = visibleKeys.every((k) => selected.has(k));
    setSelected(allSelected ? new Set() : new Set(visibleKeys));
  }

  async function handleBulkAssign() {
    if (selected.size === 0) return;
    setPending(true);
    setError(null);
    setResult(null);

    const ownerId = bulkOwnerId === "" ? null : Number(bulkOwnerId);
    const targets = Array.from(selected).map((key) => {
      const [contentType, id] = key.split(":");
      return { contentType: contentType as OwnerContentType, id: Number(id) };
    });

    const res = await bulkSetContentOwnerAction(targets, ownerId);
    setPending(false);

    if (res.error) {
      setError(res.error);
      return;
    }
    setResult(res.count ?? 0);
    setSelected(new Set());
  }

  if (items.length === 0) {
    return <p className="lcars-empty-state">Noch keine Inhalte vorhanden.</p>;
  }

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px]">
        <select
          className="lcars-input rounded-full text-right"
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          aria-label="Nach Owner filtern"
        >
          <option value="all">Alle User</option>
          <option value={NO_OWNER}>— Ohne Owner —</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>

        <select
          className="lcars-input rounded-full text-right"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
          aria-label="Nach Kategorie filtern"
        >
          {(Object.keys(CATEGORY_LABELS) as CategoryFilter[]).map((key) => (
            <option key={key} value={key}>
              {CATEGORY_LABELS[key]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-[8px]">
        <button
          type="button"
          onClick={toggleSelectAllVisible}
          className="lcars-pill-btn--outline"
          disabled={filteredItems.length === 0}
        >
          {filteredItems.length > 0 &&
          filteredItems.every((i) => selected.has(itemKey(i)))
            ? "Auswahl aufheben"
            : "Alle sichtbaren auswählen"}
        </button>

        <select
          value={bulkOwnerId}
          onChange={(e) => setBulkOwnerId(e.target.value)}
          className="lcars-input"
          disabled={pending}
          aria-label="Owner für Mass-Edit"
        >
          <option value="">— kein Owner —</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleBulkAssign}
          disabled={pending || selected.size === 0}
          className="lcars-pill-btn--outline disabled:opacity-50"
        >
          {pending
            ? "Wird zugeordnet…"
            : `Owner für ${selected.size} Auswahl${selected.size === 1 ? "" : "en"} setzen`}
        </button>

        {error && (
          <p className="text-lcars-red" role="alert">
            {error}
          </p>
        )}
        {result !== null && (
          <p className="text-lcars-amber">
            {result === 0
              ? "Keine Inhalte zugeordnet."
              : `${result} ${result === 1 ? "Inhalt" : "Inhalte"} zugeordnet.`}
          </p>
        )}
      </div>

      {(Object.keys(groups) as OwnerContentType[]).map((contentType) => {
        if (categoryFilter !== "all" && categoryFilter !== contentType) {
          return null;
        }
        const groupItems = groups[contentType];
        return (
          <LcarsDataRow
            key={contentType}
            value={groupItems.length}
            label={CATEGORY_LABELS[contentType]}
            color={CATEGORY_COLORS[contentType]}
          >
            {groupItems.length === 0 ? (
              <p className="lcars-empty-state">
                Keine Inhalte für diese Auswahl.
              </p>
            ) : (
              <div className="flex flex-col gap-[6px]">
                {groupItems.map((item) => {
                  const key = itemKey(item);
                  return (
                    <div key={key} className="flex items-center gap-[8px]">
                      <input
                        type="checkbox"
                        className="lcars-checkbox"
                        checked={selected.has(key)}
                        onChange={() => toggleSelected(key)}
                        aria-label={`${item.title} auswählen`}
                      />
                      <Link
                        href={item.href}
                        className="mission-akte flex-1"
                        style={
                          {
                            "--mission-color": CATEGORY_COLORS[contentType],
                          } as React.CSSProperties
                        }
                      >
                        <span className="mission-akte-rail" />
                        <span className="mission-akte-body text-left">
                          <span className="mission-akte-title block">
                            {item.title}
                          </span>
                          <span className="mission-akte-meta">
                            <span>
                              <b>Owner</b> {item.ownerName ?? "— kein Owner —"}
                            </span>
                          </span>
                        </span>
                      </Link>
                      <OwnerSelect
                        contentType={item.contentType}
                        id={item.id}
                        initialOwnerId={item.ownerId}
                        users={users}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </LcarsDataRow>
        );
      })}
    </div>
  );
}
