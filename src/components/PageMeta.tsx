"use client";
import { usePageMeta } from "@/hooks/usePageMeta";
import { NavKey } from "@/lib/nav";

// Kleiner Client-Helfer: setzt In-App-Titel + aktive Sektion (Nav-Highlight)
// aus einer Server-Komponente heraus.
export default function PageMeta({
  title,
  section,
}: {
  title: string;
  section: NavKey;
}) {
  usePageMeta(title, section);
  return null;
}
