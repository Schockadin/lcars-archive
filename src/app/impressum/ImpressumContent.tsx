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
          Star Trek Adventures: Modiphius Entertainment Ltd.
          <br />
          Diese Seite steht in keiner Verbindung zu diesen Unternehmen.
        </p>

        <h2>Haftung für Inhalte</h2>
        <p>
          Als Diensteanbieter bin ich gemäß § 7 Abs. 1 TMG für eigene Inhalte
          nach den allgemeinen Gesetzen verantwortlich. Eine Pflicht zur
          Überwachung fremder Informationen besteht nicht (§§ 8–10 TMG).
        </p>
        <p>
          Beim Bearbeiten einer bestehenden Mission, eines Logbuchs oder
          Datenbank-Eintrags sichert der Editor Änderungen automatisch als
          privaten Zwischenstand in der Datenbank. Erst das ausdrückliche
          Speichern übernimmt sie in den Inhalt. Zwischenstände werden nach dem
          Speichern entfernt und laufen nach 30 Tagen ab. Die Einzelheiten
          stehen in der Datenschutzerklärung.
        </p>
        <p>
          Live-Aktualisierungen verwenden den externen Dienst Ably Realtime.
          Welche Verbindungsdaten dabei verarbeitet und welche Inhalte nicht
          übertragen werden, steht in der{" "}
          <a href="/datenschutz">Datenschutzerklärung</a>.
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
          etwa Charakterbiografien, Einsatzberichten, Session-Zusammenfassungen,
          Gesprächen, freien Chronologie-Ereignissen, Datenbank-Einträgen und
          zusätzlich zu einer Figur hinterlegten Dokumenten – liegen bei den
          jeweiligen Autor*innen. Das gilt auch für die aus den datierten
          Session-Zusammenfassungen automatisch zusammengestellte
          Missions-Synopsis: Einträge mit gleichem Ingame-Datum stehen dort
          unter einer gemeinsamen Datumsüberschrift. In der Missionschronik
          lassen sich die Session-Zusammenfassungen als „Log-Einträge“ anzeigen
          und nach Datum sortieren. Die optionale Sammelverlinkung ergänzt auf
          Wunsch der angemeldeten Person Verweise auf bekannte Einträge; sie
          ändert nichts an der Autorenschaft oder den Rechten am Text.
          Der Seitenbetreiber stellt lediglich die Plattform zur gemeinsamen
          Dokumentation der Kampagne bereit und beansprucht keine darüber
          hinausgehenden Rechte an diesen nutzergenerierten Beiträgen. Die Owner
          eines Charakters verwalten die angehängten Dokumente; die Spielleitung
          kann Dateien veröffentlichter Charaktere ansehen und herunterladen.
        </p>
        <p>
          Der Charakterbogen bildet den Personnel-File-Bogen aus{" "}
          <em>Star Trek Adventures</em> (2. Edition) nach; die Vorlagengrafik
          sowie die Namen, Kategorien, Voraussetzungen und Regeltexte der
          Talente stammen aus diesem Regelwerk. Die Rechte daran liegen bei
          Modiphius Entertainment Ltd. bzw. den jeweiligen Rechteinhabern. Sie
          werden hier ausschließlich für den privaten Spielbetrieb dieser
          Kampagne verwendet, nicht öffentlich zugänglich gemacht und nicht
          kommerziell verwertet.
        </p>
      </LegalPageLayout>
    </>
  );
}
