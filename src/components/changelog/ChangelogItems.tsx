import Link from "next/link";
import {
  changelogItemCategory,
  changelogItemText,
  changelogItemTutorial,
  type ChangelogItem,
} from "@/lib/changelog";
import {
  changelogCategoryColor,
  changelogCategoryLabel,
} from "@/lib/changelogCategories";
import {
  tutorialSectionHref,
  tutorialSectionLabel,
} from "@/lib/tutorialSections";

// Die Stichpunkte einer Version: Text, Kategorie-Etikett und — falls es dazu
// einen Abschnitt gibt — der Link in die Anleitung.
//
// Reines Markup ohne eigenen Zustand, damit beide Anzeigestellen (die Liste
// unter /changelog und die Box „Neue Funktionen") wirklich dasselbe zeigen.
export default function ChangelogItems({
  items,
}: {
  items: (string | ChangelogItem)[];
}) {
  // Eine Version ohne Stichpunkte gibt es durchaus: In den Changelog kommen
  // nur neue Funktionen (siehe AGENTS.md), ein Pull Request kann aber auch
  // reine Wartung sein. Statt einer leeren Liste steht dann ein Satz da, der
  // das erklärt.
  if (items.length === 0) {
    return (
      <p className="lcars-text">
        Wartungs-Version ohne neue Funktionen — hinter den Kulissen aufgeräumt.
      </p>
    );
  }

  return (
    <ul className="flex list-disc flex-col gap-[4px] pl-[20px]">
      {items.map((item, index) => {
        const tutorial = changelogItemTutorial(item);
        const category = changelogItemCategory(item);
        return (
          <li key={index}>
            <span
              className="changelog-tag"
              style={
                {
                  "--changelog-color": changelogCategoryColor(category),
                } as React.CSSProperties
              }
            >
              {changelogCategoryLabel(category)}
            </span>{" "}
            {changelogItemText(item)}
            {tutorial && (
              <>
                {" "}
                <Link
                  href={tutorialSectionHref(tutorial)}
                  className="lcars-changelog-tutorial-link"
                >
                  Im Tutorial: {tutorialSectionLabel(tutorial)}
                </Link>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
