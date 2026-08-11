// src/app/datenschutz/page.tsx
import { Metadata } from "next";
import DSGVOClient from "./DSGVOClient";

export const metadata: Metadata = {
  title: "Datenschutz",
  robots: { index: false },
};

// „Stand"-Jahr der Erklärung: zur Build-/Deploy-Zeit ausgewertet (Modul-Scope,
// nicht während des Renderns) und als Prop weitergereicht. Unter
// cacheComponents darf ein Client Component `new Date()` nicht ohne
// Suspense-Grenze im Render aufrufen (dynamische „aktuelle Zeit") — der
// as-of-Marker soll ohnehin den Deploy-Zeitpunkt widerspiegeln, kein
// laufzeit-frisches Datum.
const CURRENT_YEAR = new Date().getFullYear();

export default function DatenschutzPage() {
  return <DSGVOClient year={CURRENT_YEAR} />;
}
