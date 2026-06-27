"use client";
import { useEffect } from "react";
import { useNeo } from "@/hooks/useNeo";

// Registriert für einen Pfad-Slug das echte Label (Mission-/Log-Titel),
// das die Breadcrumbs statt der Slug-Ableitung anzeigen. Räumt beim
// Unmount wieder auf.
export default function CrumbLabel({
  slug,
  label,
}: {
  slug: string;
  label: string;
}) {
  const { setCrumbLabel, clearCrumbLabel } = useNeo();

  useEffect(() => {
    setCrumbLabel(slug, label);
    return () => clearCrumbLabel(slug);
  }, [slug, label, setCrumbLabel, clearCrumbLabel]);

  return null;
}
