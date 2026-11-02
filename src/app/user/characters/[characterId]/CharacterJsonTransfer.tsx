"use client";

import { useActionState, useState } from "react";
import { FormError, FormSuccess } from "@/app/_shared/FormPrimitives";
import { MAX_CHARACTER_JSON_BYTES } from "@/lib/characterJson";
import { DownloadIcon, UploadIcon } from "@/lib/icons";
import {
  importCharacterJsonAction,
  type CharacterJsonActionState,
} from "./characterJsonActions";

const initialState: CharacterJsonActionState = {};

export default function CharacterJsonTransfer({
  characterId,
  userId,
  characterName,
}: {
  characterId: number;
  userId: number;
  characterName: string;
}) {
  const [state, action, pending] = useActionState(
    importCharacterJsonAction,
    initialState,
  );
  const [json, setJson] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);

  async function readFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setJson("");
    setFileName("");
    setFileError(null);
    if (!file) return;
    if (file.size > MAX_CHARACTER_JSON_BYTES) {
      setFileError("Die JSON-Datei darf höchstens 900 KB groß sein.");
      return;
    }
    try {
      setJson(await file.text());
      setFileName(file.name);
    } catch {
      setFileError("Die Datei konnte nicht gelesen werden.");
    }
  }

  return (
    <section className="flex flex-col gap-[10px] rounded-[10px] border border-current/20 p-[12px]">
      <h2 className="font-bold">Charakterdaten als JSON</h2>
      <p className="text-sm opacity-75">
        Personalakte, Biografie, Charakterwerte und Modulwerte lassen sich
        sichern und in diese Figur importieren. AP-Buchungen, Portraitdatei
        und Anhänge werden separat verwaltet.
      </p>
      <a
        className="lcars-pill-btn--outline inline-flex items-center gap-[8px] self-start"
        href={`/api/export/character-json?characterId=${characterId}`}
        download
      >
        <DownloadIcon /> JSON herunterladen
      </a>
      <form
        action={action}
        className="flex flex-col items-start gap-[8px]"
        onSubmit={(event) => {
          if (!window.confirm(`Die importierten Daten ersetzen Personalakte, Biografie, Werte und Modulwerte von „${characterName}“. Fortfahren?`)) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="characterId" value={characterId} />
        <input type="hidden" name="characterJson" value={json} />
        <label className="flex flex-col gap-[5px] text-sm">
          JSON-Datei auswählen
          <input
            type="file"
            accept=".json,application/json"
            onChange={readFile}
            aria-label="JSON-Datei auswählen"
          />
        </label>
        {fileName && <span className="text-xs opacity-75">Ausgewählt: {fileName}</span>}
        {fileError && <p className="text-lcars-red text-sm" role="alert">{fileError}</p>}
        <button
          type="submit"
          disabled={!json || pending}
          className="lcars-pill-btn--outline inline-flex items-center gap-[8px] disabled:opacity-50"
        >
          <UploadIcon /> {pending ? "Import läuft…" : "JSON importieren"}
        </button>
        <FormError message={state.error} />
        {state.success && <FormSuccess>{state.success}</FormSuccess>}
      </form>
    </section>
  );
}
