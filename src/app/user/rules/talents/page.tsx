import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { requireNonGuest } from "@/lib/dal";
import { listTalents } from "@/lib/talents";
import { talentCategoryLabel } from "@/lib/talentCatalog";
import RulesCatalog from "../RulesCatalog";
export const metadata: Metadata = { title: "Talente", robots: { index: false, follow: false } };
export default async function UserTalentCatalogPage() { await requireNonGuest(); const talents = await listTalents(); return <><PageMeta title="Talente" section="users" /><article className="mb-[10px] lcars-wide-column"><p className="lcars-eyebrow">Zugriff · Spielende</p><h1>Talente</h1><div className="lcars-text"><RulesCatalog groupLabel="Kategorie" entries={talents.map((talent) => ({ id: talent.id, name: talent.name, group: talentCategoryLabel(talent.category), detail: talent.requirement, html: talent.descriptionHtml }))} /></div></article></>; }
