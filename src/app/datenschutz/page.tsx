// src/app/datenschutz/page.tsx
import { Metadata } from "next";
import DSGVOClient from "./DSGVOClient";

export const metadata: Metadata = {
  title: "Datenschutz",
  robots: { index: false },
};

export default function DatenschutzPage() {
  return <DSGVOClient />;
}
