// src/app/impressum/page.tsx
import { Metadata } from "next";
import ImpressumClient from "./ImpressumClient";

export const metadata: Metadata = {
  title: "Impressum",
  robots: { index: false },
};

export default function ImpressumPage() {
  return <ImpressumClient />;
}
