import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireNonGuest } from "@/lib/dal";
import { listFocuses } from "@/lib/focuses";
import { focusDisciplineLabel } from "@/lib/focusCatalog";
import RulesCatalog from "../RulesCatalog";
export const metadata: Metadata = { title: "Schwerpunkte", robots: { index: false, follow: false } };
export default async function UserFocusCatalogPage() { await requireNonGuest(); const focuses = await listFocuses(); return <><PageMeta title="Schwerpunkte" section="users" /><article className="mb-[10px] lcars-wide-column"><p className="lcars-eyebrow">Zugriff · Spielende</p><h1>Schwerpunkte</h1><div className="lcars-text"><RulesCatalog groupLabel="Department" entries={focuses.map((focus) => ({ id: focus.id, name: focus.name, group: focusDisciplineLabel(focus.discipline), html: focus.descriptionHtml }))} /></div></article></>; }
