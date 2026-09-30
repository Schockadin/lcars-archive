"use client";

import { useState } from "react";

const DUMP_COMMAND = "npm run db:pg-dump";
const RESTORE_COMMAND =
  'npm run db:pg-restore -- "$env:USERPROFILE\\Documents\\Neo-Archiv-Backups\\neo-archiv-db-DATUM.dump"';

function CommandCopy({ label, command }: { label: string; command: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-[8px]">
      <code className="min-w-0 overflow-x-auto rounded-lcars bg-lcars-panel px-[10px] py-[7px] text-[12px]">
        {command}
      </code>
      <button
        type="button"
        onClick={copy}
        className="lcars-pill-btn--outline self-start disabled:opacity-50"
        aria-label={label + " kopieren"}
      >
        {copied ? "Kopiert" : "Befehl kopieren"}
      </button>
    </div>
  );
}

export default function PgDumpPanel() {
  return (
    <details className="mt-[18px] border-t border-lcars-border pt-[14px]">
      <summary className="cursor-pointer text-lcars-primary-ink">
        Vollständiges PostgreSQL-Backup (pg_dump)
      </summary>
      <div className="mt-[12px] flex flex-col gap-[12px] text-[13px] text-lcars-ink-dim">
        <p>
          Erstellt lokal einen vollständigen Dump dieser Datenbank im
          Custom-Format, einschließlich Schema, Daten und Userkonten.
          Clusterweite Rollen und Servereinstellungen sind nicht enthalten.
          Dafür werden die PostgreSQL-Client-Tools auf deinem Rechner verwendet;
          die Zugangsdaten bleiben in deiner lokalen <code>.env.local</code>.
          Die direkte Verbindung wird bevorzugt (
          <code>DIRECT_DATABASE_URL</code>), andernfalls{" "}
          <code>DATABASE_URL</code> verwendet. Stelle vor dem Start sicher, dass
          die URL auf die gewünschte Datenbank zeigt.
        </p>
        <div className="flex flex-col gap-[7px]">
          <p className="lcars-eyebrow">Dump lokal erstellen</p>
          <CommandCopy label="Dump-Befehl" command={DUMP_COMMAND} />
          <p>
            Ohne Pfad wird die Datei unter{" "}
            <code>Dokumente\Neo-Archiv-Backups</code> angelegt.
          </p>
        </div>
        <div className="flex flex-col gap-[7px]">
          <p className="lcars-eyebrow">Dump zurückspielen</p>
          <CommandCopy label="Restore-Befehl" command={RESTORE_COMMAND} />
          <p>
            Ersetze <code>DATUM</code> durch den Dateinamen. Vor dem Restore
            verlangt das Terminal eine ausdrückliche Bestätigung. Die
            Wiederherstellung ersetzt die Datenbankobjekte aus dem Dump,
            einschließlich der Userkonten; sie läuft atomar und wird bei einem
            Fehler zurückgerollt. Spiele nur Dumps aus vertrauenswürdiger
            Quelle ein.
          </p>
        </div>
        <p>
          Falls <code>pg_dump</code> oder <code>pg_restore</code> nicht gefunden
          wird, füge den PostgreSQL-Ordner <code>bin</code> zu <code>PATH</code>{" "}
          hinzu oder setze in PowerShell <code>$env:PG_BIN_DIR</code>, zum
          Beispiel auf <code>C:\Program Files\PostgreSQL\18\bin</code>.
        </p>
      </div>
    </details>
  );
}
