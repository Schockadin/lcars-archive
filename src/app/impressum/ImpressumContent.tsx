// Server Component: die Seite ist reiner, statischer Rechtstext ohne jede
// Interaktivität. Früher "use client" allein wegen usePageMeta() — dadurch
// landete der komplette Textbaum zusätzlich im Client-Bundle. Den In-App-
// Titel/Nav-Highlight setzt jetzt der winzige <PageMeta>-Client-Shim.
import PageMeta from "@/components/PageMeta";
import LegalPageLayout from "@/components/lcars/LegalPageLayout";

export default function ImpressumContent() {
  return (
    <>
      <PageMeta title="Impressum" section="impressum" />
      <LegalPageLayout eyebrow="§ 5 TMG" title="Impressum">
        <h2>Angaben gemäß § 5 TMG</h2>
        <address>
          Dominic Zander
          <br />
          Nordsternstr. 6a
          <br />
          45329 Essen
          <br />
          Deutschland
          <br />
          E-Mail:{" "}
          <a href="mailto:kontakt@neo-archiv.de">kontakt@neo-archiv.de</a>
        </address>

        <h2>Hinweis zum Inhalt</h2>
        <p>
          Diese Website ist eine private, nicht-kommerzielle Fansite zur
          Dokumentation einer laufenden Pen-&-Paper-Rollenspielkampagne, die
          Elemente mehrerer Science-Fiction-Franchises miteinander verbindet.
          Sämtliche Inhalte sind fiktional. Die verwendeten Begriffe, Namen und
          das LCARS-Design sind Marken bzw. urheberrechtlich geschützte Werke
          ihrer jeweiligen Rechteinhaber, u. a.:
          <br />
          Star Trek: CBS Studios Inc. / Paramount Global
          <br />
          Stargate: Metro-Goldwyn-Mayer Studios Inc. (MGM)
          <br />
          Perry Rhodan: Pabel-Moewig Verlag KG (Bauer Media Group)
          <br />
          Star Wars: Lucasfilm Ltd. LLC / The Walt Disney Company
          <br />
          Warhammer 40.000: Games Workshop Limited
          <br />
          Diese Seite steht in keiner Verbindung zu diesen Unternehmen.
        </p>

        <h2>Haftung für Inhalte</h2>
        <p>
          Als Diensteanbieter bin ich gemäß § 7 Abs. 1 TMG für eigene Inhalte
          nach den allgemeinen Gesetzen verantwortlich. Eine Pflicht zur
          Überwachung fremder Informationen besteht nicht (§§ 8–10 TMG).
        </p>

        <h2>Urheberrecht</h2>
        <p>
          Die durch den Seitenbetreiber erstellten Inhalte und Werke unterliegen
          dem deutschen Urheberrecht. Vervielfältigung, Bearbeitung, Verbreitung
          oder Verwertung außerhalb der Grenzen des Urheberrechts bedürfen der
          schriftlichen Zustimmung.
        </p>
        <p>
          Die Rechte an den von den Mitspielenden selbst verfassten Inhalten –
          etwa Charakterbiografien, Einsatzberichten, Gesprächen und
          Archiv-Einträgen – liegen bei den jeweiligen Autor*innen. Der
          Seitenbetreiber stellt lediglich die Plattform zur gemeinsamen
          Dokumentation der Kampagne bereit und beansprucht keine darüber
          hinausgehenden Rechte an diesen nutzergenerierten Beiträgen.
        </p>
      </LegalPageLayout>
    </>
  );
}
