"use client";
import { useMemo, useState } from "react";
import { formatDateTime } from "@/utils/formateISODate";
import {
  AP_REASONS,
  AP_REASON_LABELS,
  type ApLedgerEntry,
} from "@/lib/characterAp";

// Gesamtjournal aller AP-Bewegungen, nach Charakter und Grund filterbar. Die
// Filterung läuft im Client — die Liste ist serverseitig bereits begrenzt
// (AP_LEDGER_LIMIT), ein Roundtrip je Filterwechsel wäre unnötig.
export default function ApLedgerTable({
  entries,
  limit,
}: {
  entries: ApLedgerEntry[];
  limit: number;
}) {
  const [characterId, setCharacterId] = useState("");
  const [reason, setReason] = useState("");

  const characters = useMemo(() => {
    const map = new Map<number, string>();
    for (const entry of entries) map.set(entry.characterId, entry.characterName);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "de"));
  }, [entries]);

  const visible = entries.filter(
    (entry) =>
      (!characterId || String(entry.characterId) === characterId) &&
      (!reason || entry.reason === reason),
  );

  if (entries.length === 0) {
    return <p className="lcars-empty-state">Noch keine AP-Buchungen.</p>;
  }

  return (
    <div className="flex flex-col gap-[10px]">
      <div className="flex flex-wrap items-end gap-[8px]">
        <label className="flex flex-col gap-[4px]">
          <span className="lcars-eyebrow">Charakter</span>
          <select
            value={characterId}
            onChange={(e) => setCharacterId(e.target.value)}
            className="lcars-input rounded-full"
          >
            <option value="">Alle</option>
            {characters.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-[4px]">
          <span className="lcars-eyebrow">Grund</span>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="lcars-input rounded-full"
          >
            <option value="">Alle</option>
            {AP_REASONS.map((key) => (
              <option key={key} value={key}>
                {AP_REASON_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
        <span className="lcars-eyebrow">
          {visible.length} von {entries.length}
        </span>
      </div>

      {entries.length >= limit && (
        <p className="text-lcars-ink-dim text-[12px]">
          Es werden die letzten {limit} Buchungen angezeigt. Ältere stehen
          weiterhin auf dem jeweiligen Charakterbogen.
        </p>
      )}

      {visible.length === 0 ? (
        <p className="lcars-empty-state">Keine Buchung passt zum Filter.</p>
      ) : (
        <div className="flex flex-col gap-[4px]">
          {visible.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-wrap items-baseline gap-[8px] border-b border-[var(--lcars-ink-dim)]/20 pb-[4px]"
            >
              <span className="lcars-eyebrow w-[190px]">
                {formatDateTime(entry.createdAt)}
              </span>
              <span className="min-w-[140px] flex-1">{entry.characterName}</span>
              <span className="stat-ap-amount w-[70px] text-right">
                {entry.amount > 0 ? "+" : ""}
                {entry.amount} AP
              </span>
              <span className="w-[170px] text-lcars-ink-dim text-[13px]">
                {AP_REASON_LABELS[entry.reason]}
              </span>
              <span className="flex-1 min-w-[140px] text-lcars-ink-dim text-[13px]">
                {entry.note ?? ""}
              </span>
              <span className="text-lcars-ink-dim text-[12px]">
                {entry.createdByName ?? "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
