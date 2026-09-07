// Die Typen der geplanten Spieltermine, getrennt vom Datenzugriff
// (plannedSessions.ts trägt "server-only"): die Zusage-Knöpfe sind eine
// Client-Komponente und brauchen dieselben Typen. Gleiches Muster wie
// timelineTypes.ts/timeline.ts.

export type RsvpResponse = "yes" | "no";

export interface PlannedSessionRsvp {
  userId: number;
  userName: string;
  response: RsvpResponse;
  note: string;
}

export interface PlannedSession {
  id: number;
  scheduledAt: string;
  title: string;
  location: string;
  notes: string;
  createdByName: string | null;
  // Die eingeplanten Figuren — beim Nachtragen der gespielten Session sind
  // genau sie vorausgewählt.
  characterIds: number[];
  // Die gespielte Session, zu der dieser Termin geworden ist (null = steht
  // noch aus). Erledigte Termine fallen von der Startseite weg.
  gameSessionId: number | null;
  rsvps: PlannedSessionRsvp[];
}
