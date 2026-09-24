import GuideSection, { GuideBody } from "../GuideSection";
import {
  CharacterListFigure,
  ChronologyFigure,
  DatabaseFigure,
  HomeFigure,
  SearchFigure,
} from "../figures/AreaFigures";

// Die Anleitungen zu den fünf öffentlichen Seiten des Hauptmenüs — Start,
// Charaktere, Chronologie, Datenbank und Suche.
//
// Warum eigene, kurze Texte statt eines Verweises auf die Anleitung: Der
// Menüpunkt „Hilfe" (siehe HeaderUserNav.tsx) steht nur angemeldeten Personen
// zur Verfügung. Wer ohne Konto liest, käme sonst an keine Erklärung — und
// braucht ohnehin eine andere als die Spielleitung: was auf DIESER Seite zu
// sehen ist und wie man sie bedient, nicht was man alles anlegen kann.
//
// Deshalb sind sie bewusst knapp gehalten: ein bis zwei Abschnitte je Seite,
// mit einem Schema daneben. Alles Weitere steht in der Anleitung (/tutorial),
// auf die jedes Fenster unten verlinkt.

// ── Startseite ───────────────────────────────────────────────────────
export function HomeGuide() {
  return (
    <GuideBody>
      <GuideSection title="Die Startseite" figure={<HomeFigure />}>
        <p>
          Dieses Terminal dokumentiert eine laufende{" "}
          <strong>Pen-&-Paper-Kampagne</strong>: Charaktere, Missionen,
          Einsatzberichte und Datenbank-Einträge, die sich mit jeder Session
          weiterentwickeln. Die Startseite zeigt, wie viel davon inzwischen
          zusammengekommen ist — je Inhaltsart eine Datenzeile mit ihrer Zahl.
        </p>
        <p>
          Links im Menü stehen die vier Wege hinein: <strong>Charaktere</strong>{" "}
          (das Ensemble), <strong>Chronologie</strong> (alles nach der Zeit der
          Kampagne), <strong>Datenbank</strong> (das Nachschlagewerk) und die{" "}
          <strong>Suche</strong>. Jede dieser Seiten hat oben rechts dasselbe
          Fragezeichen wie diese hier und erklärt sich damit selbst.
        </p>
      </GuideSection>

      <GuideSection title="Mit und ohne Konto">
        <p>
          <strong>Ohne Konto</strong> lässt sich der Großteil des Archivs lesen
          — alles, was veröffentlicht ist. Ein <strong>Entwurf</strong>{" "}
          existiert nur für die Person, die ihn schreibt.
        </p>
        <p>
          Ein Konto kannst du dir nicht selbst anlegen: Zugänge vergibt
          ausschließlich die Spielleitung per Einladung. Angemeldet zeigt diese
          Seite statt der Zahlen dein <strong>Dashboard</strong> — Neues seit
          deinem letzten Besuch, offene Gespräche, anstehende Termine und deine
          Lesezeichen.
        </p>
      </GuideSection>
    </GuideBody>
  );
}

// ── Charaktere ───────────────────────────────────────────────────────
export function PublicCharactersGuide() {
  return (
    <GuideBody>
      <GuideSection title="Die Charakterliste" figure={<CharacterListFigure />}>
        <p>
          Das <strong>Ensemble der Kampagne</strong>: alle Figuren, gruppiert
          entweder <strong>nach Status</strong> (aktiv, zurückgezogen, …) oder{" "}
          <strong>nach Generation</strong> — der Umschalter oben wechselt
          zwischen beiden. Das Filterfeld daneben grenzt über{" "}
          <strong>Name und Rang</strong> ein. Eine Figur kann in mehreren
          Generationen auftauchen und steht dann in jeder.
        </p>
        <p>
          Links in jeder Karte steht das <strong>Portrait</strong>, sofern eines
          hinterlegt ist; Figuren ohne Bild bleiben schlicht ohne Platzhalter.
        </p>
      </GuideSection>

      <GuideSection title="Die Personalakte">
        <p>
          Ein Klick öffnet die <strong>Personalakte</strong>: links das Portrait
          mit den Stammdaten (Akten-ID, Rang, Spezies, Alter …), rechts die{" "}
          <strong>Biografie</strong> mit ihrem Inhaltsverzeichnis. Unter dem
          Bild führen zwei Zeilen mit Anzahl direkt zu den{" "}
          <strong>Logbüchern</strong> und <strong>Gesprächen</strong> dieser
          Figur — beide in der Chronologie, auf sie gefiltert.
        </p>
        <p>
          Weiter unten steht <strong>„Wer kennt wen“</strong>: mit welchen
          Figuren und NPCs diese Person zu tun hat, abgeleitet aus gemeinsamen
          Missionen, Gesprächen und Erwähnungen. Darunter{" "}
          <strong>„Erwähnt in“</strong> — alle Einträge, die auf sie verweisen.
        </p>
        <p>
          Den <strong>Charakterbogen</strong> mit den Werten gibt es nur für die
          Spielerin oder den Spieler der Figur und für die Spielleitung; für
          alle anderen existiert er nicht. Die Akte selbst steht allen offen.
        </p>
      </GuideSection>
    </GuideBody>
  );
}

// ── Chronologie ──────────────────────────────────────────────────────
export function PublicChronologyGuide() {
  return (
    <GuideBody>
      <GuideSection title="Der Zeitstrahl" figure={<ChronologyFigure />}>
        <p>
          Die Chronologie zeigt dieselben Inhalte wie der Rest des Archivs, aber
          nach der <strong>Zeit der Kampagne</strong> statt nach dem
          Bearbeitungsdatum: ein Strahl von der ältesten bis zur jüngsten
          bekannten Begebenheit.
        </p>
        <p>
          Ganz links im Umschalter steht <strong>„Missionen“</strong> — dann
          zeigt der Strahl je Einsatz einen Eintrag mit seinem ganzen Zeitraum,
          und ein Klick führt auf die Missionsseite mit ihren Einsatzberichten.
          Daneben führen <strong>Events</strong>, <strong>Gespräche</strong> und{" "}
          <strong>Logbücher</strong> direkt in ihre jeweilige Liste;{" "}
          <strong>Alles</strong> verbindet den gesamten Zeitstrahl.
        </p>
        <p>
          Eigene Ereignisse zeigen auf der Karte einen kurzen Teaser. Ein Klick
          auf ihren Titel öffnet die Detailansicht mit Volltext und Bildern.
        </p>
      </GuideSection>

      <GuideSection title="Filtern und verlinken">
        <p>
          Geordnet wird immer nach <strong>Datum</strong> — der Knopf dreht die
          Richtung um. Jeder Bereich lässt sich nach Suchbegriff,{" "}
          <strong>beteiligter Person</strong> und Jahr filtern; bei{" "}
          <strong>Events</strong> kommt die <strong>Ereignisart</strong> hinzu.
          Wechselst du den Umschalter, setzen sich die übrigen Filter zurück.
          Einträge ohne In-Story-Datum stehen unter{" "}
          <strong>„Ohne Datum“</strong> am Ende.
        </p>
        <p>
          Jede Ereignisart hat eine <strong>eigene Adresse</strong> (etwa{" "}
          <code>/chronologie/conflict</code>, die Missionen unter{" "}
          <code>/chronologie/mission</code>) — diese Links kannst du weitergeben
          oder als Lesezeichen ablegen, sie öffnen die Chronologie mit genau
          dieser Auswahl.
        </p>
      </GuideSection>
    </GuideBody>
  );
}

// ── Datenbank ────────────────────────────────────────────────────────
export function PublicDatabaseGuide() {
  return (
    <GuideBody>
      <GuideSection title="Die Datenbank" figure={<DatabaseFigure />}>
        <p>
          Das Nachschlagewerk der Kampagne:{" "}
          <strong>
            Personen, Orte, Fraktionen, Spezies, Objekte, Ereignisse, Theorien,
            NPCs
          </strong>{" "}
          und Sonstiges. Die Einträge stehen alphabetisch untereinander, mit
          einer Überschrift je Anfangsbuchstabe; links in der Zeile steht das
          zuerst hochgeladene Bild, sofern eines hinterlegt ist.
        </p>
        <p>
          Oben grenzt das Auswahlfeld auf eine <strong>Kategorie</strong> ein,
          das Filterfeld sucht im <strong>Titel</strong>, und der Knopf daneben
          dreht die alphabetische Reihenfolge um. Gefiltert wird dabei im
          Browser, ohne neue Anfrage — die Adresse ändert sich nicht. Wer einen
          Link auf eine Kategorie weitergeben will, hängt sie an:{" "}
          <code>/archive?cat=person</code> öffnet die Datenbank gleich mit
          dieser Auswahl.
        </p>
      </GuideSection>

      <GuideSection title="Im Eintrag">
        <p>
          Im Eintrag selbst sind Begriffe, zu denen es einen anderen Eintrag
          gibt, <strong>automatisch verlinkt</strong> — so hangelt man sich
          durch die Welt, ohne zur Liste zurückzugehen. Am Fuß jedes Textes
          steht das aufklappbare Feld{" "}
          <strong>„Aktionen &amp; Verwaltung“</strong> mit allem, was du mit dem
          Eintrag tun darfst: merken, abonnieren, teilen — und angemeldet und
          berechtigt auch bearbeiten.
        </p>
      </GuideSection>
    </GuideBody>
  );
}

// ── Suche ────────────────────────────────────────────────────────────
export function PublicSearchGuide() {
  return (
    <GuideBody>
      <GuideSection title="Die Suche" figure={<SearchFigure />}>
        <p>
          Die <strong>Volltextsuche</strong> geht über alle Inhalte, die du
          lesen darfst: Charaktere, Missionen, Einsatzberichte,
          Datenbank-Einträge und abgeschlossene Gespräche. Ab zwei Zeichen wird
          gesucht; die Trefferliste lässt sich danach nach <strong>Art</strong>{" "}
          eingrenzen.
        </p>
        <p>
          Ohne Konto steht dasselbe Feld zusätzlich oben im Kopf jeder Seite —
          dort mit einer Vorschau schon während des Tippens. Die Suchseite
          selbst arbeitet ohne Vorschau, dafür steht der Suchbegriff in der
          Adresse und lässt sich weitergeben.
        </p>
      </GuideSection>

      <GuideSection title="Der Datenbank-Assistent">
        <p>
          Unter den Treffern steht für Berechtigte der{" "}
          <strong>Datenbank-Assistent</strong>: Statt nach Stichworten zu
          suchen, stellst du ihm eine Frage in ganzen Sätzen — er sucht die
          passenden Stellen im Kampagnen-Datenbestand zusammen und antwortet mit
          Quellenangabe. Er erfindet nichts dazu: Was im Archiv nicht steht,
          kann er nicht beantworten.
        </p>
      </GuideSection>
    </GuideBody>
  );
}

// Alle öffentlichen Seiten am Stück — so stehen sie im Abschnitt „Die Seiten
// im Überblick" der Anleitung (/tutorial).
export default function PublicAreaGuides() {
  return (
    <GuideBody>
      <HomeGuide />
      <PublicCharactersGuide />
      <PublicChronologyGuide />
      <PublicDatabaseGuide />
      <PublicSearchGuide />
    </GuideBody>
  );
}
