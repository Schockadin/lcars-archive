import GuideSection, { GuideBody } from "../GuideSection";
import { MyContentFigure, ProfileFigure } from "../figures/AreaFigures";

// Die Anleitungen zum eigenen Bereich: die angemeldete Startseite und die
// Punkte des Profil-Menüs — „Meine Inhalte" und „Einstellungen". Der dritte
// Punkt des Menüs, „Charaktere", hat seine eigene (viel längere) Anleitung:
// character/CharacterCreationGuide.tsx.
//
// Wie die Leitungs-Anleitungen (GmGuides.tsx) steht jeder Baustein an zwei
// Stellen: als Fenster hinter dem Fragezeichen der jeweiligen Seite und
// gesammelt im Abschnitt „Mein Bereich" der Anleitung (/tutorial).

// ── Startseite (Dashboard) ───────────────────────────────────────────
export function DashboardGuide() {
  return (
    <GuideBody>
      <GuideSection title="Startseite · Was hier steht">
        <p>
          Angemeldet zeigt die Startseite deinen eigenen Stand statt der
          öffentlichen Übersicht: die nächsten <strong>Spielabende</strong> samt
          Zu- und Absage, deine <strong>offenen Gespräche</strong>, den
          Abschnitt <strong>„Neues anlegen“</strong> (dieselben Knöpfe und
          Fenster wie unter „Meine Inhalte“), deine{" "}
          <strong>Charaktere</strong> mit einem Stift zum Bearbeiten und die{" "}
          <strong>News</strong> — was andere zuletzt angelegt, geändert oder
          gelöscht haben.
        </p>
        <p>
          Dazu kommen deine <strong>Entwürfe</strong> — alles, was du
          angefangen und noch nicht veröffentlicht hast, jeweils mit dem Weg
          zurück in den Editor. Ein Entwurf ist für niemanden außer dir
          sichtbar, nicht einmal für die Spielleitung; ohne eine Stelle, die
          ihn nennt, bleibt er leicht liegen.
        </p>
        <p>
          Dazu kommen drei Sektionen, die zunächst ausgeschaltet sind: die{" "}
          <strong>Erste-Schritte-Liste</strong>, deine{" "}
          <strong>To Dos</strong> (was von dir noch aussteht) und die{" "}
          <strong>Versionen</strong> — was sich zuletzt an der Datenbank selbst
          geändert hat.
        </p>
      </GuideSection>

      <GuideSection title="Startseite · Selbst zusammenstellen">
        <p>
          Über das <strong>Zahnrad</strong> neben der Überschrift kommst du
          direkt zu der Klappe im Profil, in der du jede dieser Sektionen
          einzeln an- und abschaltest. Bei den Charakteren entscheidest du
          zusätzlich je Figur, ob sie hier erscheint — wer viele Charaktere
          führt, hält so die Startseite kurz. Was du abschaltest, wird auch
          nicht mehr geladen; die Seite wird dadurch schneller.
        </p>
        <p>
          Die Einstellung gilt nur für dich und bleibt bei jedem Login
          erhalten. Eine Sektion, die nichts zu zeigen hat, bleibt ohnehin
          leer — eingeschaltet heißt „darf erscheinen“, nicht „erscheint
          immer“.
        </p>
        <p>
          Unabhängig davon lässt sich jeder Abschnitt <strong>zuklappen</strong>
          {" "}— ein Klick auf seine Überschrift. Wie du die Seite verlässt, so
          findest du sie wieder: Der Zustand wird auf dem jeweiligen Gerät
          gemerkt, am Telefon also getrennt vom Rechner. Die Zahl rechts in
          der Kopfzeile sagt dir auch zugeklappt, wie viel darin steckt.
        </p>
      </GuideSection>
    </GuideBody>
  );
}

// ── Meine Inhalte ────────────────────────────────────────────────────
export function MyContentGuide() {
  return (
    <GuideBody>
      <GuideSection
        title="Meine Inhalte · Neues anlegen"
        figure={<MyContentFigure />}
      >
        <p>
          Oben stehen die <strong>Anlegen-Knöpfe</strong>. Jeder öffnet sein
          Formular in einem Fenster über der Liste — brichst du ab, stehst du
          wieder in deiner Übersicht und hast nichts verloren. Welche Knöpfe du
          siehst, hängt davon ab, was du darfst:{" "}
          <strong>Datenbank-Eintrag</strong> darf jede:r anlegen,{" "}
          <strong>Charakter</strong> jede:r außer Gast-Accounts,{" "}
          <strong>Einsatzbericht</strong> und <strong>Gespräch</strong> setzen
          einen eigenen Charakter voraus, <strong>Mission</strong> bleibt der
          Spielleitung vorbehalten. Daneben steht{" "}
          <strong>„Import“</strong> — der einzige Knopf, der auf eine eigene
          Seite führt statt in ein Fenster: Der Import blättert durch mehrere
          Dateien und lässt jede einzeln bestätigen.
        </p>
        <p>
          Genau dieselbe Knopfleiste steht auf deiner <strong>Startseite</strong>
          {" "}— dort mit den Knöpfen, die du im Profil eingeschaltet hast.
        </p>
      </GuideSection>

      <GuideSection title="Meine Inhalte · Entwürfe">
        <p>
          Zwischen den Knöpfen und der Liste steht, was noch unfertig ist:
          deine <strong>Entwürfe</strong>, das zuletzt Bearbeitete oben, jeder
          mit dem Weg zurück in seinen Editor. Dieselbe Liste steht auf deiner
          Startseite. Maßgeblich ist, wem der Entwurf <em>gehört</em> — ein
          Gespräch, das jemand anderes begonnen hat und in dem deine Figur
          mitspielt, kann auch nur diese Person veröffentlichen.
        </p>
        <p>
          Rechts an jedem Entwurf steht dieselbe Knopfreihe wie in der Liste
          darunter: der Schalter{" "}
          <strong>Entwurf / Veröffentlicht</strong>, der{" "}
          <strong>Stift</strong> und der <strong>Mülleimer</strong>. Du kannst
          also aus dieser Übersicht heraus veröffentlichen, ohne den Eintrag
          erst zu öffnen — er verschwindet dann sofort aus der Liste, denn ein
          Entwurf ist er ja nicht mehr. Bei einer <strong>Mission</strong>
          {" "}fehlt der Schalter: Sie gehört keiner einzelnen Person, und die
          Spielleitung stellt ihren Zustand im Missionsformular ein.
        </p>
      </GuideSection>

      <GuideSection title="Meine Inhalte · Die eigene Liste">
        <p>
          Darunter steht alles, was dir gehört — gebaut wie Chronologie und
          Datenbank: eine Überschrift je Kategorie, darunter die Einträge an der
          Schiene. Sortiert wird in der Vorgabe nach Kategorie, wahlweise
          alphabetisch über alles. Über den Filter{" "}
          <strong>„Nur Entwürfe“</strong> siehst du alle unfertigen Einträge
          zusammen; ein Charakter-Filter grenzt Einsatzberichte und Gespräche
          auf eine deiner Figuren ein.
        </p>
        <p>
          Je Zeile entscheidest du über das Dropdown daneben, ob ein Eintrag{" "}
          <strong>Entwurf</strong> bleibt oder <strong>veröffentlicht</strong>{" "}
          ist — jederzeit umstellbar, ohne den Eintrag zu öffnen. Daneben liegen
          zwei Symbol-Knöpfe: der <strong>Stift</strong> führt in den
          vollständigen Editor (Titel, Kategorie, Tags und Metadaten inklusive),
          der <strong>Mülleimer</strong> löscht. Ein Entwurf ist für niemanden
          außer dir sichtbar, nicht einmal für die Spielleitung — Missionen
          ausgenommen, die kein Einzel-Owner-Modell haben.
        </p>
        <p>
          <strong>Charaktere</strong> stehen nicht in dieser Liste: Sie haben im
          Profil-Menü einen eigenen Punkt, samt eigener Anleitung zur
          Erschaffung.
        </p>
      </GuideSection>
    </GuideBody>
  );
}

// ── Import ───────────────────────────────────────────────────────────
export function ImportGuide() {
  return (
    <GuideBody>
      <GuideSection title="Import · Wofür">
        <p>
          Hast du einen Eintrag schon fertig als <strong>Markdown-Datei</strong>{" "}
          — aus deinen Notizen, einem Vault, einem anderen Werkzeug —, musst du
          ihn nicht abtippen: Der Import liest eine oder mehrere .md-Dateien
          ein und macht daraus neue Einträge. Erwartet wird das übliche{" "}
          <strong>Frontmatter</strong> (der Block zwischen den beiden{" "}
          <code>---</code>-Zeilen am Anfang) mit mindestens{" "}
          <code>type</code>, <code>slug</code> und Titel bzw. Name.
        </p>
      </GuideSection>

      <GuideSection title="Import · Was du hochladen darfst">
        <p>
          Die Auswahlliste oben zeigt nur die Arten, die du auch über das
          normale Formular anlegen dürftest:{" "}
          <strong>Datenbank-Eintrag</strong> jede:r,{" "}
          <strong>Charakter</strong> und <strong>Einsatzbericht</strong> jede:r
          außer Gast-Accounts, <strong>Mission</strong> nur die Spielleitung.
          Der Import ist der bequemere Weg zum selben Ziel, kein zweiter Weg an
          den Regeln vorbei.
        </p>
        <p>
          Zwei Dinge entscheidet deshalb nicht die Datei, sondern der Server:
          Was du hochlädst, <strong>gehört dir</strong> — ein{" "}
          <code>owner:</code> im Frontmatter wird überschrieben —, und ein{" "}
          <strong>Einsatzbericht</strong> lässt sich nur einer{" "}
          <strong>eigenen, veröffentlichten Figur</strong> zuschreiben.
        </p>
      </GuideSection>

      <GuideSection title="Import · Der Ablauf">
        <p>
          Nach dem Auswählen wird zunächst nur <em>gelesen</em>, noch nichts
          angelegt. Jede Datei erscheint als eigene, editierbare{" "}
          <strong>Vorschau</strong> (&bdquo;Datei 2 von 5&ldquo;, mit Pfeilen
          zum Blättern) — Titel, Slug, Tags und Text kannst du vorher noch
          ändern. Erst <strong>Bestätigen</strong> legt den Eintrag an,{" "}
          <strong>Verwerfen</strong> überspringt die Datei.
        </p>
        <p>
          Ein bereits vergebener <strong>Slug</strong> wird abgelehnt — es wird
          nie etwas überschrieben. Verweise auf andere Einträge werden nur
          gegen das aufgelöst, was es schon gibt: Lade Verweisziele zuerst
          hoch, wenn die Verlinkung gleich stehen soll.
        </p>
      </GuideSection>
    </GuideBody>
  );
}

// ── Profil & Einstellungen ───────────────────────────────────────────
export function UserProfileGuide() {
  return (
    <GuideBody>
      <GuideSection
        title="Profil · Die Klappen"
        figure={<ProfileFigure />}
      >
        <p>
          Dein Profil ist in aufklappbare Abschnitte gegliedert:{" "}
          <strong>Startseite</strong> (was dort erscheint),{" "}
          <strong>Charakterfarben</strong> (nur, wenn dir eine Figur gehört),{" "}
          <strong>Darstellung</strong>,{" "}
          <strong>Follows &amp; Benachrichtigungen</strong> und{" "}
          <strong>Settings</strong>. Jede Klappe enthält eigene Formulare mit
          eigenem „Speichern“ — was du änderst, gilt nur für dich und bleibt
          bei jedem Login erhalten.
        </p>
        <p>
          Anders als auf der Startseite stehen die Abschnitte hier{" "}
          <strong>zugeklappt</strong>: Das Profil ist eine Seite zum
          Nachschlagen, keine zum Überfliegen — ausgeklappt wäre sie meterlang.
          Was du aufklappst, bleibt für dieses Gerät aufgeklappt.
        </p>
        <p>
          Unter <strong>Charakterfarben</strong> bekommt jede deiner Figuren
          eine eigene Farbe. Sie färbt ihre wörtliche Rede im Fließtext-Modus
          abgeschlossener Gespräche und ihre Nachrichten-Karten in laufenden
          Gesprächen — bereits belegte Farben stehen nicht zur Auswahl.
        </p>
      </GuideSection>

      <GuideSection title="Profil · Darstellung">
        <p>
          Hier färbst du die Oberfläche nach deinem Geschmack: Basis-Schema,
          Hintergrund, Schriftfarben und Akzente lassen sich einzeln einstellen.
          Dazu kommen <strong>Hell/Dunkel</strong>, die{" "}
          <strong>Schriften</strong> (Beschriftungs- und Datenschrift getrennt
          wählbar) und die <strong>Oberfläche</strong>: volles LCARS-Design oder
          das schlanke, minimalistische Interface, bei dem alle Menüpunkte in
          der linken Leiste liegen.
        </p>
      </GuideSection>

      <GuideSection title="Profil · Follows & Benachrichtigungen">
        <p>
          Was dich erreicht und wem du folgst, steht zusammen in einer eigenen
          Klappe: die <strong>Follows</strong> (alle abonnierten Missionen,
          Datenbank-Einträge und Charaktere an einem Ort, samt der
          Möglichkeit, einzelne wieder zu beenden), die{" "}
          <strong>Benachrichtigungen</strong> (E-Mail und Push, einzeln nach
          Inhaltsart) und die <strong>News</strong>, also welche Meldungen auf
          deiner Startseite erscheinen — neu, bearbeitet, gelöscht.
        </p>
      </GuideSection>

      <GuideSection title="Profil · Settings">
        <p>
          Unter <strong>Settings</strong> liegt der Rest deines Kontos: Name und
          E-Mail, das <strong>Passwort</strong>, die <strong>Sitzungen</strong>{" "}
          — ein Knopf meldet alle anderen Geräte ab, ohne dass du dein Passwort
          ändern musst —, der Weg zur <strong>Anleitung</strong>, die{" "}
          <strong>Rechtschreibprüfung</strong> im Editor und die{" "}
          <strong>Installation als App</strong> auf deinem Gerät.
        </p>
      </GuideSection>
    </GuideBody>
  );
}

// Alle Bausteine am Stück — so stehen sie im Abschnitt „Mein Bereich" der
// Anleitung (/tutorial). Der Import steht zwischen „Meine Inhalte" und dem
// Profil, weil er von dort aus erreicht wird.
export default function UserAreaGuides() {
  return (
    <GuideBody>
      <DashboardGuide />
      <MyContentGuide />
      <ImportGuide />
      <UserProfileGuide />
    </GuideBody>
  );
}
