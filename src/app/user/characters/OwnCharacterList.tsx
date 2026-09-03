"use client";
import { useOptimistic } from "react";
import Link from "next/link";
import { LcarsAkteCard } from "@/components/lcars";
import type { Character } from "@/types/character";
import VisibilitySelect from "../content/VisibilitySelect";
import DeleteOwnContentButton from "../content/DeleteOwnContentButton";
import ContentActionRow from "../content/ContentActionRow";

const STATUS_LABELS: Record<Character["status"], string> = {
  active: "Aktiv",
  retired: "Ehemalig",
  deceased: "Verstorben",
};

// Nur die Felder, die die Liste wirklich anzeigt — der volle Character-
// Datensatz (bio als gerendertes HTML, source_md, frontmatter) würde sonst
// zusätzlich im RSC-Payload des Browsers landen (gleiche Überlegung wie bei
// CharacterListItem in src/lib/characters.ts).
export interface OwnCharacterItem {
  id: number;
  slug: string;
  name: string;
  rank: string | null;
  status: Character["status"];
  visibility: Character["visibility"];
  isDraft: boolean;
  // Ob unter metadata.stats bereits Werte gepflegt sind (siehe
  // isCharacterStatsEmpty) — serverseitig ermittelt, damit die Liste die
  // rohen Werte nicht mitschleppen muss.
  hasStats: boolean;
}

// Liste der eigenen Charaktere auf /user/characters — dieselbe Aktionszeile
// wie in "Meine Inhalte" (Sichtbarkeit/Bearbeiten/Löschen), ergänzt um den
// Sprung zu den Charakterwerten. Entwürfe stehen hier mit in der Liste
// (gekennzeichnet), da /user/content Charaktere nicht mehr führt.
export default function OwnCharacterList({
  characters,
}: {
  characters: OwnCharacterItem[];
}) {
  // Entfernt den Eintrag sofort aus der Liste und holt ihn bei einem
  // Fehlschlag automatisch zurück, sobald die Transition endet — gleiches
  // Muster wie in UserContentBrowser.tsx.
  const [optimisticCharacters, removeOptimisticCharacter] = useOptimistic(
    characters,
    (state, id: number) => state.filter((c) => c.id !== id),
  );

  if (optimisticCharacters.length === 0) {
    return (
      <p className="lcars-empty-state">
        Mit deinem Konto ist noch kein Charakter verknüpft.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-[6px]">
      {optimisticCharacters.map((c) => (
        <div
          key={c.id}
          className="flex flex-col sm:flex-row sm:items-center gap-[8px]"
        >
          <LcarsAkteCard
            href={`/characters/${c.slug}`}
            color={c.isDraft ? "var(--lcars-quinary)" : "var(--lcars-primary)"}
            className="flex-1"
            title={c.name}
            meta={
              <>
                <span>
                  <b>Status</b> {STATUS_LABELS[c.status]}
                </span>
                {c.rank && (
                  <span>
                    <b>Rang</b> {c.rank}
                  </span>
                )}
                <span>
                  <b>Werte</b> {c.hasStats ? "gepflegt" : "nicht gepflegt"}
                </span>
                {c.isDraft && (
                  <span>
                    <b>Typ</b> Entwurf
                  </span>
                )}
              </>
            }
          />
          <ContentActionRow
            visibility={
              <VisibilitySelect
                contentType="character"
                id={c.id}
                initialValue={c.visibility}
              />
            }
            extraAction={
              <Link
                href={`/user/characters/${c.id}`}
                className="lcars-pill-btn--outline"
                title="Charakterbogen, Werte und Stammdaten"
              >
                Öffnen
              </Link>
            }
            // Stammdaten, Werte und Biografie liegen als Panels auf EINER
            // Seite — der frühere eigene /edit-Weg entfällt.
            editHref={`/user/characters/${c.id}`}
            deleteButton={
              <DeleteOwnContentButton
                contentType="character"
                id={c.id}
                onOptimisticDelete={() => removeOptimisticCharacter(c.id)}
              />
            }
          />
        </div>
      ))}
    </div>
  );
}
