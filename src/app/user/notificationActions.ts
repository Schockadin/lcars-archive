"use server";

import { getCurrentUser } from "@/lib/dal";
import { updateNotificationPreferences } from "@/lib/users";

export interface NotificationSettingsState {
  error?: string;
  success?: boolean;
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  notifyContentTypes?: string[];
}

const ADMIN_NOTIFY_CONTENT_TYPES = [
  "character",
  "mission",
  "mission_log",
  "archive_entry",
];

// Ignoriert bewusst jede :id aus der URL — geändert wird ausschließlich der
// zur aktuellen Session gehörende User, exakt wie updateSettings in
// ./settingsActions.ts. Nicht angehakte native Checkboxen fehlen einfach
// in FormData — formData.has(...) ist der Boolean, kein Hidden-Input-Trick
// nötig. notifyContentTypes ist nur für Admins in der UI sichtbar (siehe
// NotificationSettingsForm.tsx) — bei anderen Rollen liefert formData.getAll
// einfach ein leeres Array, kein separater Rollen-Check hier nötig
// (gleiches Prinzip wie bei den anderen beiden Feldern).
export async function updateNotificationSettingsAction(
  _state: NotificationSettingsState,
  formData: FormData,
): Promise<NotificationSettingsState> {
  const currentUser = await getCurrentUser();

  const email: boolean = formData.has("emailEnabled");
  const push: boolean = formData.has("pushEnabled");
  const notifyContentTypes = formData
    .getAll("notifyContentTypes")
    .map(String)
    .filter((v) => ADMIN_NOTIFY_CONTENT_TYPES.includes(v));

  await updateNotificationPreferences(currentUser.id, {
    emailEnabled: email,
    pushEnabled: push,
    notifyContentTypes,
  });

  return {
    success: true,
    emailEnabled: email,
    pushEnabled: push,
    notifyContentTypes,
  };
}
