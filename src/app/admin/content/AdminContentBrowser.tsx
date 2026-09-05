"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { LcarsAkteCard, LcarsDataRow } from "@/components/lcars";
import OwnerSelect from "@/components/OwnerSelect";
import DeleteContentButton from "@/components/DeleteContentButton";
import { PencilIcon } from "@/lib/icons";
import { bulkSetContentOwnerAction } from "../contentOwnerActions";
import type { AdminContentItem } from "@/lib/adminContent";
import type { OwnerContentType } from "@/app/actions/owner";
import {
  CONTENT_TYPE_COLOR,
  CONTENT_TYPE_LABEL_PLURAL,
} from "@/lib/contentTypeFormat";

type CategoryFilter = "all" | OwnerContentType;

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  all: "Alle Kategorien",
  ...CONTENT_TYPE_LABEL_PLURAL,
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
          title={
            filteredItems.length > 0 &&
            filteredItems.every((i) => selected.has(itemKey(i)))
              ? "Auswahl aufheben"
              : "Alle sichtbaren auswählen"
          }
        >
          {filteredItems.length > 0 &&
          filteredItems.every((i) => selected.has(itemKey(i)))
            ? "Auswahl aufheben"
            : "Alle auswählen"}
        </button>

        <select
          value={bulkOwnerId}
          onChange={(e) => setBulkOwnerId(e.target.value)}
          className="lcars-input rounded-full"
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
          title={`Owner für ${selected.size} Auswahl${selected.size === 1 ? "" : "en"} setzen`}
        >
          {pending ? "Wird zugeordnet…" : `Owner setzen (${selected.size})`}
        </button>

        {error && (
          <p className="text-lcars-quinary-ink" role="alert">
            {error}
          </p>
        )}
        {result !== null && (
          <p className="text-lcars-primary-ink">
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
            color={CONTENT_TYPE_COLOR[contentType]}
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
                    <div key={key} className="flex flex-col gap-[6px]">
                      {/* Zeile 1: Auswahl-Checkbox + Eintrag */}
                      <div className="flex items-center gap-[8px]">
                        <input
                          type="checkbox"
                          className="lcars-checkbox"
                          checked={selected.has(key)}
                          onChange={() => toggleSelected(key)}
                          aria-label={`${item.title} auswählen`}
                        />
                        <LcarsAkteCard
                          href={item.href}
                          color={CONTENT_TYPE_COLOR[contentType]}
                          className="flex-1"
                          title={item.title}
                          meta={
                            <>
                              <span>
                                <b>Owner</b>{" "}
                                {item.ownerName ?? "— kein Owner —"}
                              </span>
                            </>
                          }
                        />
                      </div>

                      {/* Zeile 2 (unter dem Eintrag): Owner-Wechsel-Select +
                          Bearbeiten/Löschen in einer Flex-Row. Bearbeiten führt
                          auf die Detailseite (dort läuft die Admin-Bearbeitung
                          über das ActionsMenu — die /user/…/edit-Routen sind
                          owner-scoped und daher für fremde Inhalte nicht
                          nutzbar). Löschen ist weich (Papierkorb) und lädt die
                          Übersicht danach neu. */}
                      <div className="flex flex-wrap items-center gap-[8px] pl-[28px]">
                        <OwnerSelect
                          contentType={item.contentType}
                          id={item.id}
                          initialOwnerId={item.ownerId}
                          users={users}
                        />
                        <Link
                          href={item.href}
                          className="lcars-icon-btn"
                          aria-label="Bearbeiten"
                          title="Bearbeiten"
                        >
                          <PencilIcon />
                        </Link>
                        <DeleteContentButton
                          contentType={item.contentType}
                          id={item.id}
                          redirectTo="/admin/content"
                        />
                      </div>
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
