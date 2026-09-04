"use server";
import { revalidatePath } from "next/cache";
import { checkPermission } from "@/lib/dal";
import { changelogVersionExists } from "@/lib/changelog";
import { setFeaturedChangelogVersions } from "@/lib/changelogSettings";

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
