// src/app/impressum/page.tsx
import { Metadata } from "next";
import ImpressumContent from "./ImpressumContent";

export const metadata: Metadata = {
  title: "Impressum",
  robots: { index: false },
};

export default function ImpressumPage() {
  return <ImpressumContent />;
}
