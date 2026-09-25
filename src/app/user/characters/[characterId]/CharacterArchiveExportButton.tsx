"use client";
import { useState } from "react";
import ModalOverlay from "@/components/ModalOverlay";
import { DownloadIcon, FileTextIcon } from "@/lib/icons";
import type { CharacterDocument } from "@/lib/characterDocumentTypes";
import { characterDocumentDisplayName } from "@/lib/characterDocumentNames";
import type { CharacterArchiveMissionOption } from "@/lib/characterArchiveTypes";
import { fmtDate } from "@/lib/missionFormat";

function downloadName(response: Response): string {
  const header = response.headers.get("content-disposition") ?? "";
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header)?.[1];
  if (encoded) return decodeURIComponent(encoded);
  return /filename="([^"]+)"/i.exec(header)?.[1] ?? "charakterarchiv.pdf";
}

export default function CharacterArchiveExportButton({
  characterId,
  characterName,
  documents,
  missions,
}: {
  characterId: number;
  characterName: string;
  documents: CharacterDocument[];
  missions: CharacterArchiveMissionOption[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedMissions, setSelectedMissions] = useState<Set<string>>(
    new Set(),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/export/character-archive", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      if (!response.ok) {
        setError((await response.text()) || "Der Export ist fehlgeschlagen.");
        return;
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = downloadName(response);
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Der Export ist fehlgeschlagen.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="lcars-pill-btn--outline inline-flex items-center gap-[8px] self-start"
      >
        <DownloadIcon /> Charakter exportieren
      </button>

      {open && (
        <ModalOverlay
          title={`${characterName} als PDF exportieren`}
          onClose={() => setOpen(false)}
          width={760}
          tall
        >
          <form onSubmit={submit} className="flex flex-col gap-[16px]">
            <input type="hidden" name="characterId" value={characterId} />
            <p className="text-lcars-ink-dim text-[13px]">
              Charakterdaten und eigene Logbücher sind vorausgewählt. Eine ganze
              Mission enthält ihre Beschreibung und alle veröffentlichten
              Logbücher; dadurch abgedeckte Einzel-Logs werden nicht doppelt
              exportiert.
            </p>

            <fieldset className="flex flex-col gap-[7px]">
              <legend className="lcars-eyebrow mb-[6px]">Charakterdaten</legend>
              <label className="flex items-start gap-[8px]">
                <input
                  type="checkbox"
                  name="includeCharacter"
                  value="1"
                  defaultChecked
                />
                <span>Personalakte, Werte, Talente, Regeln und Biografie</span>
              </label>
            </fieldset>

            <fieldset className="flex flex-col gap-[7px]">
              <legend className="lcars-eyebrow mb-[6px]">
                Zusätzliche Dokumente ({documents.length})
              </legend>
              {documents.length === 0 ? (
                <p className="text-lcars-ink-dim text-[12px]">
                  Keine Dokumente hinterlegt.
                </p>
              ) : (
                documents.map((document) => (
                  <label
                    key={document.id}
                    className="flex items-start gap-[8px]"
                  >
                    <input
                      type="checkbox"
                      name="documentIds"
                      value={document.id}
                      aria-label={document.fileName}
                    />
                    <span title={document.fileName}>
                      {characterDocumentDisplayName(document.fileName)}
                    </span>
                  </label>
                ))
              )}
            </fieldset>

            <fieldset className="flex flex-col gap-[10px]">
              <legend className="lcars-eyebrow mb-[6px]">
                Missionen und Logbücher
              </legend>
              {missions.length === 0 ? (
                <p className="text-lcars-ink-dim text-[12px]">
                  Dieser Charakter hat noch keine Logbücher verfasst.
                </p>
              ) : (
                missions.map((mission) => {
                  const wholeMission = selectedMissions.has(mission.slug);
                  return (
                    <div
                      key={mission.slug}
                      className="border-b border-lcars-border pb-[9px]"
                    >
                      <label className="flex items-start gap-[8px] font-semibold text-lcars-ink-data">
                        <input
                          type="checkbox"
                          name="missionSlugs"
                          value={mission.slug}
                          checked={wholeMission}
                          disabled={!mission.canExportWholeMission}
                          onChange={(event) => {
                            setSelectedMissions((current) => {
                              const next = new Set(current);
                              if (event.target.checked) next.add(mission.slug);
                              else next.delete(mission.slug);
                              return next;
                            });
                          }}
                        />
                        <span>
                          Ganze Mission: {mission.title}
                          {!mission.canExportWholeMission
                            ? " · Missionsentwurf"
                            : ""}
                        </span>
                      </label>
                      <div className="ml-[24px] mt-[6px] flex flex-col gap-[5px]">
                        {mission.logs.map((log) => (
                          <label
                            key={log.id}
                            className="flex items-start gap-[8px] text-[13px]"
                          >
                            <input
                              type="checkbox"
                              name="logIds"
                              value={log.id}
                              defaultChecked
                              disabled={wholeMission}
                            />
                            <span>
                              {log.title}
                              {log.logDate ? ` · ${fmtDate(log.logDate)}` : ""}
                              {log.isDraft ? " · Entwurf" : ""}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </fieldset>

            {error && (
              <p className="text-lcars-red text-[13px]" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="lcars-pill-btn--outline inline-flex items-center gap-[8px] self-start disabled:opacity-50"
            >
              <FileTextIcon />{" "}
              {pending ? "PDF wird erstellt…" : "Auswahl als PDF herunterladen"}
            </button>
          </form>
        </ModalOverlay>
      )}
    </>
  );
}
