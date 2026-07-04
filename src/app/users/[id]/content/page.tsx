import type { Metadata } from "next";
import Link from "next/link";
import PageMeta from "@/components/PageMeta";
import { LcarsDataRow } from "@/components/lcars";
import { requireOwnCharacters } from "../dal";
import { getLogsForUser } from "@/lib/characters";
import { getDialoguesForUser } from "@/lib/dialogues";
import UserContentBrowser from "./UserContentBrowser";
import VisibilitySelect from "./VisibilitySelect";

export const metadata: Metadata = {
  title: "Meine Inhalte",
  robots: { index: false, follow: false },
};

export default async function UserContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, characters } = await requireOwnCharacters(id);

  const [logs, dialogues] = await Promise.all([
    getLogsForUser(user.id),
    getDialoguesForUser(user.id, "all"),
  ]);

  return (
    <>
      <PageMeta title="Meine Inhalte" section="users" />
      <article className="mb-[10px] max-w-[600px] pr-[var(--lcars-elbow-size)]">
        <h1>Meine Inhalte</h1>
        <p className="lcars-text text-[13px] opacity-80">
          Sichtbarkeit je Eintrag: Privat (nur du) · GM (du + Spielleitung) ·
          Öffentlich (alle).
        </p>

        <div className="lcars-text flex flex-col gap-[16px]">
          <section className="flex flex-col gap-[8px]">
            <LcarsDataRow
              value={characters.length}
              label="Charaktere"
              color="var(--lcars-amber)"
              className="lcars-data-row--full"
            />

            {characters.length === 0 ? (
              <p className="lcars-empty-state">
                Dir ist noch kein Charakter zugeordnet.
              </p>
            ) : (
              <div className="flex flex-col gap-[6px]">
                {characters.map((c) => (
                  <div key={c.id} className="flex items-center gap-[8px]">
                    <Link
                      href={`/characters/${c.slug}`}
                      className="mission-akte flex-1"
                      style={
                        {
                          "--mission-color": "var(--lcars-amber)",
                        } as React.CSSProperties
                      }
                    >
                      <span className="mission-akte-rail" />
                      <span className="mission-akte-body text-left">
                        <span className="mission-akte-title block">
                          {c.name}
                        </span>
                      </span>
                    </Link>
                    <VisibilitySelect
                      contentType="character"
                      id={c.id}
                      initialValue={c.visibility}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          <UserContentBrowser
            characters={characters}
            logs={logs}
            dialogues={dialogues}
            ownUserId={user.id}
          />
        </div>
      </article>
    </>
  );
}
