"use server";
import { revalidatePath } from "next/cache";
import { checkPermission } from "@/lib/dal";
import { changelogVersionExists } from "@/lib/changelog";
import { isChangelogCategory } from "@/lib/changelogCategories";
import {
  setFeaturedChangelogVersions,
  setHiddenChangelogCategories,
  type HiddenChangelogCategories,
} from "@/lib/changelogSettings";

export interface ChangelogVisibilityState {
  error?: string;
  success?: boolean;
}

// Speichert die vom Admin gewählten Changelog-Versionen, deren Neuerungen auf
// dem Dashboard in der „Neue Funktionen"-Box erscheinen. Übernommen werden nur
// existierende (und entdoppelte) Versionen — ein leeres Array ist gültig und
// bedeutet bewusst „nichts anzeigen" (die Box verschwindet dann).
export async function saveChangelogVisibilityAction(
  _state: ChangelogVisibilityState,
  formData: FormData,
): Promise<ChangelogVisibilityState> {
  const check = await checkPermission("admin.access");
  if ("error" in check) return { error: check.error };

  const selected = Array.from(
    new Set(
      formData
        .getAll("versions")
        .map(String)
        .filter((version) => changelogVersionExists(version)),
    ),
  );

  await setFeaturedChangelogVersions(selected);

  // Das Dashboard rendert die Box (ChangelogSection); /admin/changelog zeigt
  // die bestätigte Auswahl.
  revalidatePath("/");
  revalidatePath("/admin/changelog");

  return { success: true };
}


// Speichert, welche Kategorien je Rolle NICHT in der „Neue Funktionen"-Box
// erscheinen. Die Checkboxen heißen „hidden:<rolle>" und tragen die
// Kategorie als Wert — so kommt die ganze Matrix in einem Formular an, ohne
// dass die Action die Rollenliste kennen muss.
//
// Übernommen werden nur bekannte Kategorien (isChangelogCategory); die
// Rollen-Schlüssel kommen aus dem Formular und werden nicht gegen die
// Rollentabelle geprüft: ein Eintrag für eine gelöschte Rolle blendet
// niemandem etwas aus und verschwindet beim nächsten Speichern von selbst.
export async function saveChangelogCategoryVisibilityAction(
  _state: ChangelogVisibilityState,
  formData: FormData,
): Promise<ChangelogVisibilityState> {
  const check = await checkPermission("admin.access");
  if ("error" in check) return { error: check.error };

  const hidden: HiddenChangelogCategories = {};
  for (const [field, value] of formData.entries()) {
    if (!field.startsWith("hidden:")) continue;
    const role = field.slice("hidden:".length);
    const category = String(value);
    if (!role || !isChangelogCategory(category)) continue;
    const list = hidden[role] ?? [];
    if (!list.includes(category)) list.push(category);
    hidden[role] = list;
  }

  await setHiddenChangelogCategories(hidden);

  revalidatePath("/");
  revalidatePath("/admin/changelog");

  return { success: true };
}
