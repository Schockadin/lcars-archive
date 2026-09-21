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
          Zu- und Absage, deine <strong>offenen Gespräche</strong>, die
          Anlegen-Knöpfe (<strong>Missionslog</strong>,{" "}
          <strong>Gespräch</strong>, <strong>Datenbank-Eintrag</strong>,{" "}
          <strong>NPC</strong> — dieselben Fenster wie unter „Meine Inhalte“),
          deine <strong>Charaktere</strong> mit einem Stift zum Bearbeiten und
          die <strong>News</strong> — was andere zuletzt angelegt, geändert
          oder gelöscht haben.
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
          Spielleitung vorbehalten.
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

// ── Profil & Einstellungen ───────────────────────────────────────────
export function UserProfileGuide() {
  return (
    <GuideBody>
      <GuideSection
        title="Profil · Die drei Klappen"
        figure={<ProfileFigure />}
      >
        <p>
          Dein Profil ist in aufklappbare Zeilen gegliedert:{" "}
          <strong>Charakterfarben</strong> (nur, wenn dir eine Figur gehört),{" "}
          <strong>Darstellung</strong> und <strong>Settings</strong>. Jede
          Klappe enthält eigene Formulare mit eigenem „Speichern“ — was du
          änderst, gilt nur für dich und bleibt bei jedem Login erhalten.
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

      <GuideSection title="Profil · Settings">
        <p>
          Unter <strong>Settings</strong> liegt der Rest deines Kontos: Name und
          E-Mail, das <strong>Passwort</strong>, die <strong>Follows</strong>{" "}
          (alle abonnierten Missionen, Datenbank-Einträge und Charaktere an
          einem Ort), die <strong>Sitzungen</strong> — ein Knopf meldet alle
          anderen Geräte ab, ohne dass du dein Passwort ändern musst —, die{" "}
          <strong>Benachrichtigungen</strong> (E-Mail und Push, einzeln nach
          Inhaltsart), die <strong>News</strong> auf deiner Startseite, die{" "}
          <strong>Rechtschreibprüfung</strong> im Editor und die{" "}
          <strong>Installation als App</strong> auf deinem Gerät.
        </p>
      </GuideSection>
    </GuideBody>
  );
}

// Beide Bereiche am Stück — so stehen sie im Abschnitt „Mein Bereich" der
// Anleitung (/tutorial).
export default function UserAreaGuides() {
  return (
    <GuideBody>
      <DashboardGuide />
      <MyContentGuide />
      <UserProfileGuide />
    </GuideBody>
  );
}
