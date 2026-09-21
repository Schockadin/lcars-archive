"use server";
import { verifySession } from "@/lib/dal";
import { getUserById, updateDashboardPrefs } from "@/lib/users";
import { getCharactersForUser } from "@/lib/characters";
import {
  buildDashboardPrefs,
  DASHBOARD_SECTIONS,
  sanitizeDashboardPrefs,
  type DashboardPrefs,
} from "@/lib/dashboardSections";

export interface DashboardSettingsState {
  error?: string;
  success?: boolean;
  // Der bestätigte Stand — das Formular zeigt nach dem Speichern ihn statt
  // der Ausgangswerte (siehe DashboardSettingsForm).
  prefs?: DashboardPrefs;
}

// Speichert, was das Dashboard des eingeloggten Users zeigt (siehe
// src/lib/dashboardSections.ts).
//
// Angehakt wird hier "erscheint", nicht "erscheint nicht": Das Formular
// schickt die eingeschalteten Sektionen als `sections` und die gezeigten
// Charaktere als `characters`. Welche Punkte das Formular überhaupt KANNTE,
// steht daneben in `knownSections`/`knownCharacters` — und das ist kein
// Beiwerk:
//
//   - Ohne sie ließe sich „alles abgewählt" nicht von „Formular kennt den
//     Punkt gar nicht" unterscheiden; ein Häkchen wegzunehmen hätte keine
//     Wirkung.
//   - Und ein Charakter, der erst nach dem Öffnen dieses Formulars entstanden
//     ist (anderer Tab), stünde sonst als „nicht angehakt" da und wäre still
//     ausgeblendet, obwohl ihn niemand abgewählt hat. Was das Formular nicht
//     kannte, behält deshalb seinen bisherigen Stand.
export async function updateDashboardSettingsAction(
  _state: DashboardSettingsState,
  formData: FormData,
): Promise<DashboardSettingsState> {
  const session = await verifySession();

  const enabledSections = formData.getAll("sections").map((v) => String(v));
  const knownSections = formData.getAll("knownSections").map((v) => String(v));
  const sichtbar = new Set(formData.getAll("characters").map((v) => Number(v)));
  const bekannt = new Set(
    formData.getAll("knownCharacters").map((v) => Number(v)),
  );

  // Die eigenen Charaktere frisch aus der Datenbank statt aus dem Formular:
  // Eine id, die dem Konto nicht gehört, hätte in dessen Vorlieben nichts
  // verloren.
  const [eigene, user] = await Promise.all([
    getCharactersForUser(session.userId),
    getUserById(session.userId),
  ]);
  const bisher = sanitizeDashboardPrefs(user?.dashboard_prefs);

  const hiddenCharacters = eigene
    .filter((c) =>
      bekannt.has(c.id)
        ? !sichtbar.has(c.id)
        : bisher.hiddenCharacters.includes(c.id),
    )
    .map((c) => c.id);

  const prefs = buildDashboardPrefs({
    enabledSections,
    // Kennt das Formular gar keine Sektion (kaputter Request), gilt keine als
    // abgewählt — sonst stünde das Dashboard nach einem Fehlklick leer da.
    knownSections:
      knownSections.length > 0
        ? knownSections
        : DASHBOARD_SECTIONS.map((s) => s.id),
    hiddenCharacters,
  });

  await updateDashboardPrefs(session.userId, prefs);
  return { success: true, prefs };
}
