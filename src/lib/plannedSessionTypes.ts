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
  rsvps: PlannedSessionRsvp[];
}
