import type { Metadata } from "next";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { userCan } from "@/lib/permissions";
import { getRoleMap } from "@/lib/roles";
import {
  parseCharacterStats,
  isCharacterStatsEmpty,
} from "@/lib/characterStats";
import { requireOwnCharacters } from "../dal";
import OwnCharacterList, { type OwnCharacterItem } from "./OwnCharacterList";

export const metadata: Metadata = {
  title: "Meine Charaktere",
  robots: { index: false, follow: false },
};

// Übersicht aller mit dem Konto verknüpften Charaktere — seit diese Kategorie
// aus "Meine Inhalte" (/user/content) herausgelöst wurde, ist das ihr
// alleiniger Ort. Von hier aus: Akte ansehen, Kopfdaten bearbeiten,
// Charakterwerte pflegen (siehe [characterId]/stats), Sichtbarkeit ändern,
// löschen und neue Charaktere anlegen.
export default async function UserCharactersPage() {
  const { user, characters } = await requireOwnCharacters();
  const roleMap = await getRoleMap();

  // Werte-Status serverseitig ermitteln, damit die rohen metadata.stats nicht
  // in den Client-Payload wandern (siehe OwnCharacterItem).
  const items: OwnCharacterItem[] = characters.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    rank: c.metadata.rank,
    status: c.status,
    visibility: c.visibility,
    isDraft: c.is_draft,
    hasStats: !isCharacterStatsEmpty(parseCharacterStats(c.metadata.stats)),
  }));

  return (
    <>
      <PageMeta title="Meine Charaktere" section="users" />
      {/* Zentrierte breite Spalte wie /missions, /search und „Meine Inhalte" —
          Überschrift und Inhalt teilen sie sich. */}
      <div className="lcars-wide-column">
        <h1>Meine Charaktere</h1>

        <article className="mb-[10px] gap-[20px] lcars-flex-switch">
          <section className="flex flex-col gap-[12px] justify-center items-end">
            <h2>Neuer Charakter</h2>
            <div className="lcars-btn-stack max-sm:w-full">
              {/* Gast-Accounts dürfen keine Charaktere anlegen — dieselbe
                  Prüfung wie in /user/content und (serverseitig maßgeblich) in
                  characters/_shared/contentAction.ts. */}
              {userCan(user, "content.create", roleMap) ? (
                <Link
                  href="/user/characters/new"
                  className="lcars-pill-btn max-sm:self-stretch"
                >
                  Neuer Charakter
                </Link>
              ) : (
                <p className="lcars-empty-state">
                  Gast-Accounts können keine Charaktere anlegen.
                </p>
              )}
            </div>
          </section>

          {/* Linksbündig: Überschrift und Liste sitzen am linken Rand ihrer
              Spalte statt rechts. */}
          <section className="flex w-full flex-col items-start gap-[12px]">
            <h2 className="self-start">Charaktere verwalten</h2>
            <div className="lcars-text w-full">
              <OwnCharacterList characters={items} />
            </div>
          </section>
        </article>
      </div>
    </>
  );
}
