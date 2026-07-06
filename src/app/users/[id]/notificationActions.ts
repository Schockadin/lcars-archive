"use server";

import { getCurrentUser } from "@/lib/dal";
import { updateNotificationPreferences } from "@/lib/users";

export interface NotificationSettingsState {
  error?: string;
  success?: boolean;
}

// Ignoriert bewusst jede :id aus der URL — geändert wird ausschließlich der
// zur aktuellen Session gehörende User, exakt wie updateSettings in
// ./settingsActions.ts. Nicht angehakte native Checkboxen fehlen einfach
// in FormData — formData.has(...) ist der Boolean, kein Hidden-Input-Trick
// nötig.
export async function updateNotificationSettingsAction(
  _state: NotificationSettingsState,
  formData: FormData,
): Promise<NotificationSettingsState> {
  const currentUser = await getCurrentUser();

  await updateNotificationPreferences(currentUser.id, {
    emailEnabled: formData.has("emailEnabled"),
    pushEnabled: formData.has("pushEnabled"),
  });

  return { success: true };
}
