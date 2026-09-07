"use client";
import { useActionState, useState } from "react";
import { SaveFooter } from "@/app/_shared/FormPrimitives";
import {
  CHANGELOG_CATEGORIES,
  changelogCategoryColor,
} from "@/lib/changelogCategories";
import {
  saveChangelogCategoryVisibilityAction,
  type ChangelogVisibilityState,
} from "./actions";

const initialState: ChangelogVisibilityState = {};

export interface ChangelogRoleOption {
  key: string;
  label: string;
}

// Matrix Rolle × Kategorie: angehakt heißt AUSGEBLENDET — die Box zeigt für
// diese Rolle dann alles außer den angehakten Kategorien.
//
// Bewusst „ausblenden" statt „einblenden": neue Kategorien (und neue Rollen)
// sind damit von Haus aus sichtbar. Andersherum verschwänden Neuerungen
// stillschweigend, bis jemand daran denkt, sie freizuschalten.
//
// Ein Feld je Häkchen (name="hidden:<rolle>", value=<kategorie>), damit die
// Server-Action die ganze Matrix aus einem Formular lesen kann.
export default function ChangelogCategoryForm({
  roles,
  hiddenByRole,
}: {
  roles: ChangelogRoleOption[];
  hiddenByRole: Record<string, string[]>;
}) {
  const [state, formAction, pending] = useActionState(
    saveChangelogCategoryVisibilityAction,
    initialState,
  );

  const [hidden, setHidden] = useState<Record<string, Set<string>>>(() => {
    const initial: Record<string, Set<string>> = {};
    for (const role of roles) {
      initial[role.key] = new Set(hiddenByRole[role.key] ?? []);
    }
    return initial;
  });

  function toggle(roleKey: string, category: string) {
    setHidden((prev) => {
      const next = new Set(prev[roleKey] ?? []);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return { ...prev, [roleKey]: next };
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-[16px]">
      {roles.map((role) => {
        const hiddenHere = hidden[role.key] ?? new Set<string>();
        return (
          <div
            key={role.key}
            className="flex flex-col gap-[8px] rounded-[var(--lcars-radius-pill)] border border-lcars-border bg-lcars-surface px-[16px] py-[12px]"
          >
            <div className="flex flex-col">
              <span className="lcars-eyebrow text-lcars-ink-light">
                {role.label}
              </span>
              <span className="text-lcars-ink-dim text-[12px]">
                {hiddenHere.size === 0
                  ? "Sieht alle Kategorien."
                  : `${hiddenHere.size} von ${CHANGELOG_CATEGORIES.length} Kategorien ausgeblendet.`}
              </span>
            </div>

            <div className="flex flex-wrap gap-[8px]">
              {CHANGELOG_CATEGORIES.map((category) => {
                const isHidden = hiddenHere.has(category.id);
                return (
                  <label
                    key={category.id}
                    className="flex items-center gap-[6px] border px-[10px] py-[4px] text-[12px] cursor-pointer"
                    style={{
                      borderColor: changelogCategoryColor(category.id),
                      background: isHidden
                        ? "var(--lcars-hover-tint)"
                        : "transparent",
                    }}
                  >
                    <input
                      type="checkbox"
                      name={`hidden:${role.key}`}
                      value={category.id}
                      checked={isHidden}
                      onChange={() => toggle(role.key, category.id)}
                      className="accent-[var(--lcars-primary)]"
                    />
                    {category.label}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}

      <SaveFooter state={state} pending={pending} />
    </form>
  );
}
