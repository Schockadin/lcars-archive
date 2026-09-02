"use client";
import { useActionState, useMemo, useState } from "react";
import { FormError, FormSuccess } from "@/app/_shared/FormPrimitives";
import { confirmSubmit } from "@/lib/confirmSubmit";
import {
  TALENT_CATEGORIES,
  TALENT_CATEGORY_LABELS,
  talentCategoryLabel,
  type Talent,
} from "@/lib/talentCatalog";
import {
  createTalentAction,
  updateTalentAction,
  deleteTalentAction,
  type TalentFormState,
} from "./actions";

const initialState: TalentFormState = {};

// Gemeinsame Felder von Anlegen und Bearbeiten — sonst wären beide Formulare
// bis auf die Action wortgleich.
function TalentFields({
  idPrefix,
  talent,
}: {
  idPrefix: string;
  talent?: Talent;
}) {
  return (
    <>
      <div className="flex flex-wrap gap-[8px]">
        <label className="flex flex-col gap-[4px] flex-1 min-w-[200px]">
          <span className="lcars-eyebrow">Name</span>
          <input
            id={`${idPrefix}-name`}
            name="name"
            type="text"
            required
            defaultValue={talent?.name ?? ""}
            className="lcars-input rounded-full w-full"
          />
        </label>
        <label className="flex flex-col gap-[4px]">
          <span className="lcars-eyebrow">Kategorie</span>
          <select
            id={`${idPrefix}-category`}
            name="category"
            defaultValue={talent?.category ?? "general"}
            className="lcars-input rounded-full"
          >
            {TALENT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {TALENT_CATEGORY_LABELS[category].label} (
                {TALENT_CATEGORY_LABELS[category].original})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-[4px] flex-1 min-w-[180px]">
          <span className="lcars-eyebrow">Voraussetzung (optional)</span>
          <input
            id={`${idPrefix}-requirement`}
            name="requirement"
            type="text"
            placeholder="z.B. Kommando 3+"
            defaultValue={talent?.requirement ?? ""}
            className="lcars-input rounded-full w-full"
          />
        </label>
      </div>
      <label className="flex flex-col gap-[4px]">
        <span className="lcars-eyebrow">Beschreibung</span>
        <textarea
          id={`${idPrefix}-description`}
          name="description"
          required
          rows={5}
          defaultValue={talent?.description ?? ""}
          className="lcars-input w-full"
        />
      </label>
    </>
  );
}

function NewTalentForm() {
  const [state, formAction, pending] = useActionState(
    createTalentAction,
    initialState,
  );
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-[8px]">
      <button
        type="button"
        className="lcars-pill-btn--outline self-start"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Abbrechen" : "Neues Talent"}
      </button>

      {open && (
        // key auf dem Erfolgstext: nach dem Anlegen sollen die Felder wieder
        // leer sein — ein neuer key wirft das Formular samt defaultValues neu.
        <form
          key={state.success ?? "new"}
          action={formAction}
          className="flex flex-col gap-[8px]"
        >
          <TalentFields idPrefix="new-talent" />
          <button
            type="submit"
            disabled={pending}
            className="lcars-pill-btn--outline self-start disabled:opacity-50"
          >
            Anlegen
          </button>
        </form>
      )}

      <FormError message={state.error} />
      {state.success && <FormSuccess>{state.success}</FormSuccess>}
    </div>
  );
}

function TalentRow({ talent }: { talent: Talent }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateTalentAction,
    initialState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteTalentAction,
    initialState,
  );

  return (
    <div className="flex flex-col gap-[6px] border-b border-[var(--lcars-ink-dim)]/30 pb-[8px]">
      <button
        type="button"
        className="flex flex-wrap items-baseline gap-[8px] text-left"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex-1 min-w-[180px]">{talent.name}</span>
        <span className="lcars-eyebrow">{talentCategoryLabel(talent.category)}</span>
        {talent.requirement && (
          <span className="text-lcars-ink-dim text-[13px]">
            {talent.requirement}
          </span>
        )}
        {talent.isCustom && <span className="lcars-eyebrow">eigen</span>}
      </button>

      {!open && (
        <p className="text-lcars-ink-dim text-[13px] line-clamp-2">
          {talent.description}
        </p>
      )}

      {open && (
        <>
          <form action={formAction} className="flex flex-col gap-[8px]">
            <input type="hidden" name="id" value={talent.id} />
            <TalentFields idPrefix={`talent-${talent.id}`} talent={talent} />
            <div className="flex flex-wrap gap-[8px]">
              <button
                type="submit"
                disabled={pending}
                className="lcars-pill-btn--outline disabled:opacity-50"
              >
                Speichern
              </button>
            </div>
          </form>

          {/* Löschen nur bei selbst ergänzten Talenten — importierte stehen
              möglicherweise schon auf Charakterbögen (siehe actions.ts). */}
          {talent.isCustom && (
            <form action={deleteAction}>
              <input type="hidden" name="id" value={talent.id} />
              <button
                type="submit"
                disabled={deletePending}
                onClick={confirmSubmit(
                  `„${talent.name}“ wirklich löschen? Auf Charakterbögen bleibt der Eintrag dann als reiner Text stehen.`,
                )}
                className="lcars-pill-btn--outline disabled:opacity-50"
              >
                Löschen
              </button>
            </form>
          )}
        </>
      )}

      <FormError message={state.error ?? deleteState.error} />
      {(state.success ?? deleteState.success) && (
        <FormSuccess>{state.success ?? deleteState.success}</FormSuccess>
      )}
    </div>
  );
}

// Talent-Verwaltung der Spielleitung: Katalog filtern, bestehende Talente
// aufklappen und bearbeiten, neue ergänzen. Die Filterung läuft rein im
// Client — der Katalog ist mit gut 150 Einträgen klein genug, um ihn komplett
// auszuliefern (er landet ohnehin als Auswahlliste auf jedem Charakterbogen).
export default function TalentEditor({ talents }: { talents: Talent[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return talents.filter((talent) => {
      if (category && talent.category !== category) return false;
      if (!needle) return true;
      return (
        talent.name.toLowerCase().includes(needle) ||
        (talent.requirement ?? "").toLowerCase().includes(needle) ||
        talent.description.toLowerCase().includes(needle)
      );
    });
  }, [talents, query, category]);

  return (
    <div className="flex flex-col gap-[16px]">
      <NewTalentForm />

      <div className="flex flex-wrap items-end gap-[8px]">
        <label className="flex flex-col gap-[4px] flex-1 min-w-[180px]">
          <span className="lcars-eyebrow">Suche</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, Voraussetzung, Text"
            className="lcars-input rounded-full w-full"
          />
        </label>
        <label className="flex flex-col gap-[4px]">
          <span className="lcars-eyebrow">Kategorie</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="lcars-input rounded-full"
          >
            <option value="">Alle</option>
            {TALENT_CATEGORIES.map((key) => (
              <option key={key} value={key}>
                {TALENT_CATEGORY_LABELS[key].label}
              </option>
            ))}
          </select>
        </label>
        <span className="lcars-eyebrow">
          {visible.length} von {talents.length}
        </span>
      </div>

      {visible.length === 0 ? (
        <p className="lcars-empty-state">Keine Talente gefunden.</p>
      ) : (
        <div className="flex flex-col gap-[8px]">
          {visible.map((talent) => (
            <TalentRow key={talent.id} talent={talent} />
          ))}
        </div>
      )}
    </div>
  );
}
