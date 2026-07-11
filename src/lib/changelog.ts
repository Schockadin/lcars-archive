// Statische Daten für die öffentliche Changelog-Seite (/changelog) — ein
// Eintrag pro Major.Minor-Version (siehe src/lib/version.ts), nicht pro
// Commit/Sub-Version. Jeder Eintrag wird bei jedem neuen Pull Request von
// Hand ergänzt, siehe AGENTS.md ("Der öffentliche Changelog").
export interface ChangelogEntry {
  version: string;
  title: string;
  summary: string;
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.0",
    title: "Datenbank als neue Datenquelle, automatisches Vault-Backup",
    summary:
      "Mit dieser Ära hält die Versionsnummer erstmals offiziell Einzug in die App – und mit ihr eine ganze Reihe von Grundlagenarbeiten. Zunächst konnten Spieler:innen ihre Einsatzberichte (Mission-Logs) erstmals direkt über ein Formular in der Web-App anlegen, statt sie manuell als Markdown-Datei einzureichen. Kurz darauf wurde die Datenbank zur alleinigen Quelle für alle Inhalte erklärt: Missionen und Logs werden seither direkt in der App erstellt und bearbeitet, während das Vault-Archiv nur noch als automatisch erzeugte Sicherungskopie dient – inklusive eines wöchentlichen automatischen Backup-Laufs und eines Admin-Knopfs zum manuellen Anstoßen. Geschützte Bereiche zeigen bei fehlender Berechtigung jetzt eine eigene Hinweisseite statt eines stillen Redirects, und wer sein Passwort vergessen hat, kann es über „Passwort vergessen“ selbst zurücksetzen. Die Datenschutzerklärung wurde entsprechend um die neuen Mail- und Backup-Verarbeitungen ergänzt.",
  },
  {
    version: "1.1",
    title: "User-Backup, lokale Fonts, Akkordeon-DataRows, Mission-Delete",
    summary:
      "Das Adminpanel bekommt eine Sicherungsfunktion für alle Nutzerkonten (Export und Import als Datei), und Schriftarten werden jetzt lokal statt von einem externen Anbieter geladen – ein Pluspunkt für den Datenschutz. Auf dem Dashboard lassen sich lange Listen jetzt platzsparend als Akkordeons auf- und zuklappen, und Admins beziehungsweise Spielleitung können fehlerhaft angelegte Missionen wieder löschen. Die neue Gast-Rolle darf zwar weiterhin stöbern, bookmarken und Inhalte abonnieren, aber keine eigenen Inhalte mehr anlegen oder einen Charakter zugewiesen bekommen. Neue Missionslogs, Gespräche und Missionen übernehmen automatisch deutsche Anführungszeichen und schlagen ein sinnvolles Datum vor; Admins können außerdem ganze Gespräche löschen, samt Infomail an die Beteiligten. Eine eigene Such-Seite samt Such-Kachel in der Navigation macht das gezielte Suchen leichter, und mehrere hartnäckige Darstellungsfehler auf schmalen Bildschirmen sind behoben.",
  },
  {
    version: "1.2",
    title: "User-Bereich refactored + Mobile-Breiten-Fixes",
    summary:
      "Diese Ära ist größtenteils technisches Aufräumen unter der Haube, bringt aber auch spürbare Verbesserungen für die Suche: Der Typ-Filter (Charaktere, Missionen, Logs, Archiv) ist jetzt ein übersichtliches Button-Raster, Filter ohne Treffer sind deaktiviert, und eingeloggte Nutzer:innen bekommen einen zusätzlichen „Gespeichert“-Filter für ihre Lesezeichen. Ein Klick auf einen Volltext-Treffer in Logs oder Archiv-Einträgen springt jetzt direkt zur passenden Textstelle und hebt sie hervor. Außerdem wurde ein hartnäckiger Layout-Fehler endgültig behoben, der auf schmalen Handy-Displays Missionslog-Zeilen und lange Charakternamen falsch darstellen ließ – nach mehreren vorherigen Teil-Fixes wurde diesmal die eigentliche Ursache im Grundlayout gefunden.",
  },
  {
    version: "1.3",
    title: "Admin-Content-Tools: Autolinking, Wikilinks entfernen, Text formatieren",
    summary:
      "Admins bekommen drei neue Werkzeuge für Missions-, Log-, Archiv- und Charakterseiten: automatisches Verlinken erkannter Charaktere, Missionen und Archiv-Einträge im Text, das rückstandslose Entfernen solcher Verlinkungen und eine automatische Korrektur von Anführungszeichen und Apostrophen auf deutsche Typografie – alle drei mit Vorschau vor dem endgültigen Übernehmen. Aus Sicherheitsgründen können Admins ab sofort keinen Passwort-Reset mehr für fremde Konten auslösen, auch nicht für andere Admins; das bleibt Nutzer:innen über „Passwort vergessen“ für ihr eigenes Konto vorbehalten. Das Dashboard zeigt jetzt eine „Neu“/„Aktualisiert“-Übersicht der seit dem letzten Besuch veränderten Inhalte, und jede eingeloggte Person darf nun auch eigene Archiv-Einträge anlegen und bearbeiten – vorher ging das nur bei Missionen und Logs. Alle Inhaltsformulare bekommen außerdem einen Zeitleisten-Marker-Button für Spielleitung und Admins sowie eine Auto-Verlinken-Option zum Ankreuzen. Charakterportraits laden jetzt effizienter, und mehrere Layout-Überlappungen auf schmalen Displays wurden behoben.",
  },
  {
    version: "1.8",
    title: "Charaktere, Markdown-Editor, Tutorial & Dialog-Fixes",
    summary:
      "Nutzer:innen können jetzt eigene Charaktere anlegen und bearbeiten, inklusive einer wieder direkt auf der Seite editierbaren Biografie. Alle Inhalts-Formulare bekommen einen richtigen Markdown-Editor mit Formatierungs-Symbolleiste und einem Hover-Spickzettel für die wichtigsten Auszeichnungen – dazu kommt eine neue Tutorial-Seite mit eigenen Anleitungen für Besucher:innen, Spieler:innen und Spielleitung. Bei Gesprächen sind mehrere Mail-Benachrichtigungsfehler behoben: Antworten kamen bisher nicht zuverlässig bei allen Empfänger:innen an, der Beginn eines Gesprächs löste gar keine Mail aus, und beim Beenden wurden teils die falschen Personen benachrichtigt. Manuell eingetippte Wikilinks funktionieren jetzt immer als echte Links, auch ohne das Auto-Verlinken-Häkchen zu setzen. Das Profil zeigt außerdem einen gemeinsamen, farbcodierten News-Feed (neu, bearbeitet, gelöscht) statt getrennter Listen, mobile Geräte bekommen eine Pull-to-Refresh-Geste, und die Navigation wird neu geordnet: „Home“ wird zum echten Dashboard, Profil und Einstellungen sind zusammengelegt.",
  },
  {
    version: "1.9",
    title: "Home als Dashboard, Profil und Settings zusammengeführt",
    summary:
      "Das Dashboard zieht endgültig auf die eigentliche Startseite um: Eingeloggte Nutzer:innen sehen dort jetzt direkt ihre persönliche Übersicht mit Neuigkeiten, offenen Gesprächen, Lesezeichen und Abos, während anonyme Besucher:innen weiterhin die gewohnte Landingpage sehen – die alte Adresse bleibt als Weiterleitung für bestehende Lesezeichen erhalten. Profil und Einstellungen sind endgültig zu einer einzigen Seite zusammengeführt. Für Admins gibt es eine neue Sammel-Aktion, um alle Missionen ohne zugewiesene Spielleitung auf einen Schlag einer Person zuzuweisen, statt sie einzeln zu bearbeiten. Das App-Icon wurde für Android als „maskable Icon“ nachgerüstet, damit es auf dem Homescreen nicht unschön beschnitten wird. Ein Layout-Fehler im Archiv-Browser mit unpassendem Versatz am linken Rand ist behoben, die News-Sektion lässt sich jetzt ein- und ausklappen, und die Pull-to-Refresh-Geste auf Mobilgeräten reagiert nun etwas weniger empfindlich.",
  },
  {
    version: "1.10",
    title: "QoL-Bugfixes und PgBouncer-Anbindung",
    summary:
      "Unter der Haube sorgt eine neue Datenbank-Verbindungsanbindung (PgBouncer) für zuverlässigere Verbindungen, ohne dass Nutzer:innen davon direkt etwas mitbekommen. Deutlich sichtbarer ist ein behobener CSS-Fehler, der app-weit an vielen Stellen Abstände durcheinanderbrachte und unter anderem den Abmelden-Button in der falschen Farbe zeigte. Bearbeitungsformulare für Missionen, Logs, Archiv-Einträge und Charaktere sind vereinheitlicht und bekommen eine neue, aufklappbare „Metadaten“-Sektion, in der bisher nicht editierbare Felder wie Alter, Fraktionen, Schiffe, Teaser-Texte oder Tags jetzt direkt bearbeitet werden können. Ein Fehler, bei dem das Verlassen des Bearbeitungsmodus einer Seite den Bearbeitungsmodus fälschlich auf die nächste geöffnete Seite übertrug, ist behoben. Schalter, etwa für die Sortierung, sind durch eine neu gestaltete, sanft gleitende Variante ersetzt, die auch bei mehrzeiligen Filtern sauber funktioniert, und neu angelegte Inhalte führen nach dem Speichern direkt wieder zur Startseite zurück.",
  },
  {
    version: "1.11",
    title: "Follows, Admin/User-Trennung, Missions-Teilnehmer & Benachrichtigungen",
    summary:
      "Eine neue Follow-Verwaltung zeigt alle abonnierten Inhalte an einem Ort, Charaktere und User lassen sich jetzt abonnieren, und Abonnenten bekommen eine Mail/Push-Benachrichtigung mit Vorschau, sobald sich etwas am abonnierten Inhalt tut — etwa ein neuer Logbucheintrag oder eine neue Mission-Teilnahme. Missionen können jetzt teilnehmende Charaktere per Mehrfachauswahl zugewiesen bekommen, inklusive automatischer Benachrichtigung der beteiligten Spieler und ihrer Abonnenten. Die Nutzerverwaltung wurde neu aufgeteilt in eine schlanke Administration (/admin), das eigene Profil (/user, ganz ohne User-ID in der URL) und eine neue öffentliche Nutzerübersicht (/users). Die frühere GitHub-Vault-Anbindung wurde vollständig durch ein waschechtes Datenbank-Backup ersetzt. Auf der Mission-Seite gibt es jetzt einen „Neues Log“-Button für Teilnehmer, Inhalte lassen sich über einen neuen Teilen-Button mit Link-Kopieren verschicken, und dieses Changelog hier ist ebenfalls neu. Die „Neu“/„Aktualisiert“-Übersicht auf dem Dashboard bezieht sich jetzt korrekt auf den letzten Dashboard-Besuch statt auf den letzten Login, und Admins sehen in der Nutzerverwaltung zusätzlich, wann eine Person zuletzt überhaupt eine Seite aufgerufen hat. Admins können sich jetzt außerdem per Checkbox-Auswahl über jedes neu angelegte oder bearbeitete Charakter/Missionen/Mission-Logs/Archiv-Einträge benachrichtigen lassen, unabhängig von eigenen Abos. Auf den Inhalts-Detailseiten können Admins nun auch die Sichtbarkeit (Privat/GM/Öffentlich) direkt umstellen, nicht mehr nur der Owner selbst, und eine neue Inhaltsübersicht listet alle Inhalte über alle User hinweg, filter-/gruppierbar nach Owner und Kategorie, samt Mass-Edit-Owner-Zuordnung per Checkbox-Auswahl. Die Buttons in offenen Gesprächen (Beenden/Löschen) sind außerdem zu platzsparenden Icon-Buttons geworden.",
  },
];
