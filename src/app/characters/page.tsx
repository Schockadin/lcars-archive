import { Suspense } from "react";
import Link from "next/link";
import { getCharacterListItems } from "@/lib/characters";
import PageMeta from "@/components/PageMeta";
import { getViewer, viewerHasPermission } from "@/lib/visibility";
import CharacterPage from "./CharacterPage";
import HelpButton from "@/components/help/HelpButton";
import { HelpTitleRow } from "@/components/help/HelpHeading";
import { PublicCharactersGuide } from "@/components/help/guides/PublicGuides";
import PageSkeleton from "@/app/_shared/PageSkeleton";
import { LcarsSkeleton } from "@/components/lcars";
import { PlusIcon } from "@/lib/icons";

export const metadata = { title: { default: "Charaktere" } };

export default function CharakterePage() {
  return (
    <>
      <PageMeta title="Charaktere" section="characters" />
      <div className="lcars-wide-column">
        <div className="mb-[16px]">
          <HelpTitleRow
            help={
              <HelpButton title="Charaktere" tutorial="seiten-im-ueberblick">
                <PublicCharactersGuide />
              </HelpButton>
            }
          >
            <h1 className="lcars-data-row-heading">Charaktere</h1>
          </HelpTitleRow>
          <p className="lcars-eyebrow">Das Ensemble der Kampagne</p>
        </div>
        <div className="lcars-toolbar">
          <Suspense
            fallback={
              <LcarsSkeleton className="h-[34px] w-[40px] rounded-[100vmax]" />
            }
          >
            <CharacterCreateAction />
          </Suspense>
        </div>
        <Suspense fallback={<PageSkeleton rows={5} />}>
          <CharacterList />
        </Suspense>
      </div>
    </>
  );
}

async function CharacterList() {
  const characters = await getCharacterListItems();
  return <CharacterPage characters={characters} showHeading={false} />;
}

async function CharacterCreateAction() {
  const viewer = await getViewer();
  if (!viewer || !viewerHasPermission(viewer, "content.create")) return null;
  return (
    <Link
      href="/user/characters/new"
      className="lcars-icon-btn self-start"
      aria-label="Charakter anlegen"
      title="Charakter anlegen"
    >
      <PlusIcon />
    </Link>
  );
}
