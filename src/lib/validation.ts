// Zentrale Längenbegrenzung für Freitext-Titel (Missionen, Mission-Logs,
// Dialoge) — ein einzelner überlanger Titel würde sonst Listen-/Karten-
// Layouts sprengen (mission-akte-title, DataRow-Label, …), die von einer
// halbwegs kompakten Überschrift ausgehen.
export const MAX_TITLE_LENGTH = 150;
