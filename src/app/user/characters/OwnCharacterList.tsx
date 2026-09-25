"use client";
import { useOptimistic } from "react";
import { LcarsAkteCard } from "@/components/lcars";
import type { Character } from "@/types/character";
import ContentStateSelect from "../content/ContentStateSelect";
import DeleteOwnContentButton from "../content/DeleteOwnContentButton";
import ContentActionRow from "../content/ContentActionRow";
import { CHARACTER_STATUS_LABEL } from "@/lib/characterFormat";
import { characterEditHref } from "@/lib/contentRoutes";
import Link from "next/link";

const STATUS_LABELS = CHARACTER_STATUS_LABEL;

// Nur die Felder, die die Liste wirklich anzeigt — der volle Character-
// Datensatz (bio als gerendertes HTML, source_md, frontmatter) würde sonst
// zusätzlich im RSC-Payload des Browsers landen (gleiche Überlegung wie bei
// CharacterListItem in src/lib/characters.ts).
export interface OwnCharacterItem {
  id: number;
  name: string;
  rank: string | null;
  status: Character["status"];
  isDraft: boolean;
  // Ob unter metadata.stats bereits Werte gepflegt sind (siehe
  // isCharacterStatsEmpty) — serverseitig ermittelt, damit die Liste die
  // rohen Werte nicht mitschleppen muss.
  hasStats: boolean;
  // Umgewandelte Figuren stehen separat in der Liste, damit ihr Owner den
  // NPC-Link öffnen oder die Umwandlung wieder rückgängig machen kann.
  npcSlug?: string | null;
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

  // Volle Breite der Spalte, aber gedeckelt: über ~900px zerreißt die Zeile
  // aus Akte und Aktionen optisch (die Akte wächst, die Knöpfe bleiben
  // rechts stehen).
  return (
    <div className="flex w-full max-w-[900px] flex-col gap-[6px]">
      {optimisticCharacters.map((c) => (
        <div
          key={c.id}
          className="flex flex-col sm:flex-row sm:items-center gap-[8px]"
        >
          {c.npcSlug ? (
            <>
              <LcarsAkteCard
                href={characterEditHref(c.id)}
                color="var(--lcars-tertiary)"
                className="flex-1"
                title={c.name}
                meta={
                  <>
                    <span>
                      <b>Typ</b> Umgewandelter NPC
                    </span>
                    <span>
                      <b>Status</b> {STATUS_LABELS[c.status]}
                    </span>
                  </>
                }
              />
              <Link
                href={`/archive/${c.npcSlug}`}
                className="lcars-pill-btn--outline"
              >
                NPC ansehen
              </Link>
            </>
          ) : (
            <>
              <LcarsAkteCard
                href={characterEditHref(c.id)}
                color={
                  c.isDraft ? "var(--lcars-quinary)" : "var(--lcars-primary)"
                }
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
                state={
                  <ContentStateSelect
                    contentType="character"
                    id={c.id}
                    isDraft={c.isDraft}
                  />
                }
                // Kein zusätzlicher „Öffnen"-Knopf mehr: Stammdaten, Werte und
                // Biografie liegen als Panels auf EINER Seite, der Stift führte
                // also ohnehin an dieselbe Adresse. Die doppelte Pille war mit
                // 180px zudem der Grund, warum die Aktionszeile auf einem
                // Telefon (410px) über den Rand hinauslief.
                editHref={characterEditHref(c.id)}
                editLabel="Öffnen und bearbeiten"
                deleteButton={
                  <DeleteOwnContentButton
                    contentType="character"
                    id={c.id}
                    onOptimisticDelete={() => removeOptimisticCharacter(c.id)}
                  />
                }
              />
            </>
          )}
        </div>
      ))}
    </div>
  );
}
