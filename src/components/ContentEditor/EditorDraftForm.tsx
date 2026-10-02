"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import {
  loadEditorDraft,
  saveEditorDraft,
} from "@/app/actions/editorDrafts";
import {
  restoreEditorForm,
  serializeEditorForm,
} from "@/lib/editorDraftForm";
import type { EditorDraftType } from "@/lib/editorDraftTypes";

const SAVE_AFTER_IDLE_MS = 5_000;
const subscribeToTemporaryDraftId = () => () => {};
const getServerTemporaryDraftId = () => null;
const temporaryDraftIds = new Map<string, number>();

function getOrCreateTemporaryDraftId(
  draftScope: string,
  type: EditorDraftType,
): number {
  const storageKey = `editor-draft-id:${type}:${draftScope}`;
  const cachedId = temporaryDraftIds.get(storageKey);
  if (cachedId !== undefined) return cachedId;

  try {
    const storedId = Number(window.sessionStorage.getItem(storageKey));
    if (
      Number.isSafeInteger(storedId) &&
      storedId < 0 &&
      storedId >= -2_147_483_647
    ) {
      temporaryDraftIds.set(storageKey, storedId);
      return storedId;
    }
  } catch {
    // Ohne sessionStorage bleibt die Sicherung bis zum Schließen des Modals
    // aktiv; lediglich der Bezeichner lässt sich dann nicht wiederverwenden.
  }

  let id = -(Math.floor(Math.random() * 2_147_483_647) + 1);
  try {
    const random = new Uint32Array(1);
    window.crypto.getRandomValues(random);
    id = -((random[0] % 2_147_483_647) + 1);
  } catch {
    // Die ID dient nur als persönlicher Entwurfsschlüssel, nicht als Geheimnis.
  }
  temporaryDraftIds.set(storageKey, id);
  try {
    window.sessionStorage.setItem(storageKey, String(id));
  } catch {
    // Die zufällige ID ist weiterhin für die laufende Modal-Sitzung gültig.
  }
  return id;
}

export interface EditorDraftTarget {
  type: EditorDraftType;
  contentId: number;
}

interface EditorDraftFormProps extends ComponentPropsWithoutRef<"form"> {
  draftScope: string;
  editorDraft?: EditorDraftTarget;
  newDraftType?: EditorDraftType;
  children: ReactNode;
}

type SaveResult = Awaited<ReturnType<typeof saveEditorDraft>>;

export default function EditorDraftForm({
  draftScope,
  editorDraft,
  newDraftType,
  children,
  className,
  ...formProps
}: EditorDraftFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const getTemporaryDraftId = useCallback(
    () =>
      newDraftType
        ? getOrCreateTemporaryDraftId(draftScope, newDraftType)
        : null,
    [draftScope, newDraftType],
  );
  const generatedDraftId = useSyncExternalStore(
    subscribeToTemporaryDraftId,
    getTemporaryDraftId,
    getServerTemporaryDraftId,
  );
  const editorDraftType = editorDraft?.type ?? newDraftType;
  const editorDraftId = editorDraft?.contentId ?? generatedDraftId;
  const draftKey =
    editorDraftType !== undefined && editorDraftId != null
      ? `${editorDraftType}:${editorDraftId}`
      : null;
  const [readyDraftKey, setReadyDraftKey] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const draftEnabled = editorDraft !== undefined || newDraftType !== undefined;
  const ready =
    !draftEnabled || (draftKey !== null && readyDraftKey === draftKey);
  const visibleSaveMessage = draftEnabled
    ? ready
      ? saveMessage
      : "Entwurf wird geladen …"
    : "";

  useEffect(() => {
    if (!editorDraftType || editorDraftId == null) return;
    const form = formRef.current;
    if (!form) return;

    let active = true;
    let loaded = false;
    let restoring = false;
    let dirty = false;
    let conflicted = false;
    let submitting = false;
    let revision: number | null = null;
    let changeVersion = 0;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let maxTimer: ReturnType<typeof setTimeout> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let savePromise: Promise<boolean> | null = null;
    let bypassNextSubmit = false;

    const clearTimers = () => {
      if (idleTimer) clearTimeout(idleTimer);
      if (maxTimer) clearTimeout(maxTimer);
      if (retryTimer) clearTimeout(retryTimer);
      idleTimer = null;
      maxTimer = null;
      retryTimer = null;
    };

    const setMessage = (message: string) => {
      if (active) setSaveMessage(message);
    };

    const saveNow = (): Promise<boolean> => {
      clearTimers();
      if (conflicted) return Promise.resolve(false);
      if (savePromise) return savePromise;
      if (!dirty) return Promise.resolve(true);

      const version = changeVersion;
      const fields = serializeEditorForm(form);
      setMessage("Speichere Entwurf …");
      savePromise = saveEditorDraft(
        editorDraftType,
        editorDraftId,
        revision,
        fields,
      )
        .then((result: SaveResult) => {
          if (!active) return false;
          if (!result.ok) {
            conflicted = true;
            setMessage(
              "Der Entwurf wurde in einem anderen Editor geändert. Bitte lade die Seite neu.",
            );
            return false;
          }
          revision = result.revision;
          if (changeVersion === version) {
            dirty = false;
            setMessage("Entwurf gespeichert.");
          } else {
            setMessage("Änderungen ausstehend …");
          }
          return true;
        })
        .catch(() => {
          if (!active) return false;
          setMessage("Entwurf konnte nicht gespeichert werden. Neuer Versuch folgt …");
          retryTimer = setTimeout(() => {
            retryTimer = null;
            void saveNow();
          }, SAVE_AFTER_IDLE_MS);
          return false;
        })
        .finally(() => {
          savePromise = null;
          if (active && dirty && !conflicted && !retryTimer && !idleTimer && !maxTimer) {
            scheduleSave();
          }
        });
      return savePromise;
    };

    const scheduleSave = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        idleTimer = null;
        void saveNow();
      }, SAVE_AFTER_IDLE_MS);
      if (!maxTimer) {
        maxTimer = setTimeout(() => {
          maxTimer = null;
          void saveNow();
        }, SAVE_AFTER_IDLE_MS);
      }
    };

    const onEdit = () => {
      if (!active || !loaded || restoring || conflicted) return;
      if (submitting) submitting = false;
      dirty = true;
      changeVersion += 1;
      setMessage("Änderungen ausstehend …");
      scheduleSave();
    };

    const onSubmit = (event: Event) => {
      if (bypassNextSubmit) {
        bypassNextSubmit = false;
        return;
      }
      if (!dirty && !savePromise) return;
      event.preventDefault();
      const submitter = (event as SubmitEvent).submitter;
      void (async () => {
        let autosaved = true;
        while (dirty || savePromise) {
          const saved = await saveNow();
          if (!saved) {
            autosaved = false;
            break;
          }
          if (!dirty && !savePromise) break;
        }
        if (!active) return;
        // A failed autosave must not prevent the user's explicit save. Stop
        // retries before submitting so a late draft write cannot recreate a
        // draft after the content action has removed it.
        submitting = true;
        clearTimers();
        if (!autosaved) {
          setMessage(
            "Zwischenstand nicht bestätigt. Der normale Speichervorgang wird ausgeführt …",
          );
        }
        bypassNextSubmit = true;
        if (
          submitter instanceof HTMLButtonElement ||
          submitter instanceof HTMLInputElement
        ) {
          queueMicrotask(() => {
            bypassNextSubmit = false;
          });
          form.requestSubmit(submitter);
        } else {
          queueMicrotask(() => {
            bypassNextSubmit = false;
          });
          form.requestSubmit();
        }
      })();
    };

    form.addEventListener("input", onEdit);
    form.addEventListener("change", onEdit);
    form.addEventListener("submit", onSubmit);

    void loadEditorDraft(editorDraftType, editorDraftId)
      .then(async (draft) => {
        if (!active) return;
        if (draft) {
          revision = draft.revision;
          restoring = true;
          restoreEditorForm(form, draft.fields);
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
          if (!active) return;
          restoreEditorForm(form, draft.fields);
          restoring = false;
          setMessage("Gespeicherter Entwurf wiederhergestellt.");
        } else {
          setMessage("Automatische Sicherung aktiv.");
        }
        if (active) {
          loaded = true;
          setReadyDraftKey(`${editorDraftType}:${editorDraftId}`);
        }
      })
      .catch(() => {
        if (!active) return;
        loaded = true;
        setReadyDraftKey(`${editorDraftType}:${editorDraftId}`);
        setMessage(
          "Entwurf konnte nicht geladen werden. Die automatische Sicherung ist derzeit nicht verfügbar.",
        );
      });

    return () => {
      active = false;
      clearTimers();
      form.removeEventListener("input", onEdit);
      form.removeEventListener("change", onEdit);
      form.removeEventListener("submit", onSubmit);
    };
  }, [draftScope, editorDraftId, editorDraftType]);

  return (
    <form
      {...formProps}
      ref={formRef}
      className={className}
      data-editor-draft-scope={draftScope}
      aria-busy={!ready}
    >
      {newDraftType && editorDraftId != null && (
        <input type="hidden" name="editorDraftId" value={editorDraftId} />
      )}
      <fieldset
        disabled={!ready}
        className="m-0 flex min-w-0 flex-col gap-[16px] border-0 p-0"
      >
        {children}
        {draftEnabled && (
          <p role="status" aria-live="polite" className="lcars-text text-[13px] opacity-80">
            {visibleSaveMessage}
          </p>
        )}
      </fieldset>
    </form>
  );
}
