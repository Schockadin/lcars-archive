import CharacterTabs from "./CharacterTabs";

// Gemeinsamer Rahmen der beiden Charakter-Ansichten (/stats und /edit): der
// Umschalter steht über beiden, damit der Wechsel immer an derselben Stelle
// liegt. Die Berechtigung prüft weiterhin jede Seite selbst über ihre
// owner-gescopte Abfrage — hier wird nichts geladen.
export default function OwnCharacterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <CharacterTabs />
      {children}
    </div>
  );
}
