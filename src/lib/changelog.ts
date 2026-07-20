// Statische Daten für die öffentliche Changelog-Seite (/changelog) — ein
// Eintrag pro Major.Minor-Version (siehe src/lib/version.ts), nicht pro
// Commit/Sub-Version. Jeder Eintrag wird bei jedem neuen Pull Request von
// Hand ergänzt, siehe AGENTS.md ("Der öffentliche Changelog"). items ist
// eine Liste kurzer, endnutzer-gerichteter Stichpunkte (ein Punkt pro
// changelog-würdigem Commit dieser Version), keine zusammenhängende Prosa.
export interface ChangelogEntry {
  version: string;
  title: string;
  items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.0",
    title: "Datenbank als neue Datenquelle, automatisches Vault-Backup",
    items: [
      "Spieler:innen können ihre Einsatzberichte (Mission-Logs) erstmals direkt über ein Formular in der Web-App anlegen, statt sie manuell als Markdown-Datei einzureichen.",
      "Die Datenbank ist jetzt die alleinige Quelle für alle Inhalte: Missionen und Logs werden direkt in der App erstellt und bearbeitet, während das Vault-Archiv nur noch als automatisch erzeugte Sicherungskopie dient – inklusive eines wöchentlichen automatischen Backup-Laufs und eines Admin-Knopfs zum manuellen Anstoßen.",
      "Geschützte Bereiche zeigen bei fehlender Berechtigung jetzt eine eigene Hinweisseite statt eines stillen Redirects.",
      "Wer sein Passwort vergessen hat, kann es über „Passwort vergessen“ selbst zurücksetzen.",
      "Die Datenschutzerklärung wurde um die neuen Mail- und Backup-Verarbeitungen ergänzt.",
    ],
  },
  {
    version: "1.1",
    title: "User-Backup, lokale Fonts, Akkordeon-DataRows, Mission-Delete",
    items: [
      "Das Adminpanel bekommt eine Sicherungsfunktion für alle Nutzerkonten (Export und Import als Datei).",
      "Schriftarten werden jetzt lokal statt von einem externen Anbieter geladen – ein Pluspunkt für den Datenschutz.",
      "Auf dem Dashboard lassen sich lange Listen jetzt platzsparend als Akkordeons auf- und zuklappen.",
      "Admins beziehungsweise Spielleitung können fehlerhaft angelegte Missionen wieder löschen.",
      "Die neue Gast-Rolle darf zwar weiterhin stöbern, bookmarken und Inhalte abonnieren, aber keine eigenen Inhalte mehr anlegen oder einen Charakter zugewiesen bekommen.",
      "Neue Missionslogs, Gespräche und Missionen übernehmen automatisch deutsche Anführungszeichen und schlagen ein sinnvolles Datum vor.",
      "Admins können außerdem ganze Gespräche löschen, samt Infomail an die Beteiligten.",
      "Eine eigene Such-Seite samt Such-Kachel in der Navigation macht das gezielte Suchen leichter.",
      "Mehrere hartnäckige Darstellungsfehler auf schmalen Bildschirmen sind behoben.",
    ],
  },
  {
    version: "1.2",
    title: "User-Bereich refactored + Mobile-Breiten-Fixes",
    items: [
      "Der Typ-Filter (Charaktere, Missionen, Logs, Archiv) auf der Suche ist jetzt ein übersichtliches Button-Raster, Filter ohne Treffer sind deaktiviert, und eingeloggte Nutzer:innen bekommen einen zusätzlichen „Gespeichert“-Filter für ihre Lesezeichen.",
      "Ein Klick auf einen Volltext-Treffer in Logs oder Archiv-Einträgen springt jetzt direkt zur passenden Textstelle und hebt sie hervor.",
      "Ein hartnäckiger Layout-Fehler ist endgültig behoben, der auf schmalen Handy-Displays Missionslog-Zeilen und lange Charakternamen falsch darstellen ließ.",
    ],
  },
  {
    version: "1.3",
    title:
      "Admin-Content-Tools: Autolinking, Wikilinks entfernen, Text formatieren",
    items: [
      "Admins bekommen drei neue Werkzeuge für Missions-, Log-, Archiv- und Charakterseiten: automatisches Verlinken erkannter Charaktere, Missionen und Archiv-Einträge im Text, das rückstandslose Entfernen solcher Verlinkungen und eine automatische Korrektur von Anführungszeichen und Apostrophen auf deutsche Typografie – alle drei mit Vorschau vor dem endgültigen Übernehmen.",
      "Aus Sicherheitsgründen können Admins ab sofort keinen Passwort-Reset mehr für fremde Konten auslösen, auch nicht für andere Admins; das bleibt Nutzer:innen über „Passwort vergessen“ für ihr eigenes Konto vorbehalten.",
      "Das Dashboard zeigt jetzt eine „Neu“/„Aktualisiert“-Übersicht der seit dem letzten Besuch veränderten Inhalte.",
      "Jede eingeloggte Person darf nun auch eigene Archiv-Einträge anlegen und bearbeiten – vorher ging das nur bei Missionen und Logs.",
      "Alle Inhaltsformulare bekommen außerdem einen Zeitleisten-Marker-Button für Spielleitung und Admins sowie eine Auto-Verlinken-Option zum Ankreuzen.",
      "Charakterportraits laden jetzt effizienter.",
      "Mehrere Layout-Überlappungen auf schmalen Displays wurden behoben.",
    ],
  },
  {
    version: "1.8",
    title: "Charaktere, Markdown-Editor, Tutorial & Dialog-Fixes",
    items: [
      "Nutzer:innen können jetzt eigene Charaktere anlegen und bearbeiten, inklusive einer wieder direkt auf der Seite editierbaren Biografie.",
      "Alle Inhalts-Formulare bekommen einen richtigen Markdown-Editor mit Formatierungs-Symbolleiste und einem Hover-Spickzettel für die wichtigsten Auszeichnungen.",
      "Eine neue Tutorial-Seite erklärt alle Funktionen für Besucher:innen, Spieler:innen und Spielleitung.",
      "Bei Gesprächen sind mehrere Mail-Benachrichtigungsfehler behoben: Antworten kamen bisher nicht zuverlässig bei allen Empfänger:innen an, der Beginn eines Gesprächs löste gar keine Mail aus, und beim Beenden wurden teils die falschen Personen benachrichtigt.",
      "Manuell eingetippte Wikilinks funktionieren jetzt immer als echte Links, auch ohne das Auto-Verlinken-Häkchen zu setzen.",
      "Das Profil zeigt jetzt einen gemeinsamen, farbcodierten News-Feed (neu, bearbeitet, gelöscht) statt getrennter Listen.",
      "Mobile Geräte bekommen eine Pull-to-Refresh-Geste.",
      "Die Navigation wurde neu geordnet: „Home“ wird zum echten Dashboard, Profil und Einstellungen sind zusammengelegt.",
    ],
  },
  {
    version: "1.9",
    title: "Home als Dashboard, Profil und Settings zusammengeführt",
    items: [
      "Das Dashboard zieht endgültig auf die eigentliche Startseite um: Eingeloggte Nutzer:innen sehen dort jetzt direkt ihre persönliche Übersicht mit Neuigkeiten, offenen Gesprächen, Lesezeichen und Abos, während anonyme Besucher:innen weiterhin die gewohnte Landingpage sehen – die alte Adresse bleibt als Weiterleitung für bestehende Lesezeichen erhalten.",
      "Profil und Einstellungen sind endgültig zu einer einzigen Seite zusammengeführt.",
      "Für Admins gibt es eine neue Sammel-Aktion, um alle Missionen ohne zugewiesene Spielleitung auf einen Schlag einer Person zuzuweisen, statt sie einzeln zu bearbeiten.",
      "Das App-Icon wurde für Android als „maskable Icon“ nachgerüstet, damit es auf dem Homescreen nicht unschön beschnitten wird.",
      "Ein Layout-Fehler im Archiv-Browser mit unpassendem Versatz am linken Rand ist behoben.",
      "Die News-Sektion lässt sich jetzt ein- und ausklappen.",
      "Die Pull-to-Refresh-Geste auf Mobilgeräten reagiert jetzt etwas weniger empfindlich.",
    ],
  },
  {
    version: "1.10",
    title: "QoL-Bugfixes und PgBouncer-Anbindung",
    items: [
      "Unter der Haube sorgt eine neue Datenbank-Verbindungsanbindung (PgBouncer) für zuverlässigere Verbindungen, ohne dass Nutzer:innen davon direkt etwas mitbekommen.",
      "Ein CSS-Fehler ist behoben, der app-weit an vielen Stellen Abstände durcheinanderbrachte und unter anderem den Abmelden-Button in der falschen Farbe zeigte.",
      "Bearbeitungsformulare für Missionen, Logs, Archiv-Einträge und Charaktere sind vereinheitlicht und bekommen eine neue, aufklappbare „Metadaten“-Sektion, in der bisher nicht editierbare Felder wie Alter, Fraktionen, Schiffe, Teaser-Texte oder Tags jetzt direkt bearbeitet werden können.",
      "Ein Fehler, bei dem das Verlassen des Bearbeitungsmodus einer Seite den Bearbeitungsmodus fälschlich auf die nächste geöffnete Seite übertrug, ist behoben.",
      "Schalter, etwa für die Sortierung, sind durch eine neu gestaltete, sanft gleitende Variante ersetzt, die auch bei mehrzeiligen Filtern sauber funktioniert.",
      "Neu angelegte Inhalte führen nach dem Speichern direkt wieder zur Startseite zurück.",
    ],
  },
  {
    version: "1.11",
    title:
      "Follows, Admin/User-Trennung, Missions-Teilnehmer & Benachrichtigungen",
    items: [
      "Eine neue Follow-Verwaltung zeigt alle abonnierten Inhalte an einem Ort, Charaktere und User lassen sich jetzt ebenfalls abonnieren.",
      "Abonnenten bekommen eine Mail/Push-Benachrichtigung mit Vorschau, sobald sich etwas am abonnierten Inhalt tut — etwa ein neuer Logbucheintrag oder eine neue Mission-Teilnahme.",
      "Missionen können jetzt teilnehmende Charaktere per Mehrfachauswahl zugewiesen bekommen, inklusive automatischer Benachrichtigung der beteiligten Spieler und ihrer Abonnenten.",
      "Die Nutzerverwaltung wurde neu aufgeteilt in eine schlanke Administration (/admin), das eigene Profil (/user, ganz ohne User-ID in der URL) und eine neue öffentliche Nutzerübersicht (/users).",
      "Die frühere GitHub-Vault-Anbindung wurde vollständig durch ein waschechtes Datenbank-Backup ersetzt.",
      "Auf der Mission-Seite gibt es jetzt einen „Neues Log“-Button für Teilnehmer.",
      "Inhalte lassen sich über einen neuen Teilen-Button mit Link-Kopieren verschicken.",
      "Dieses Changelog hier ist ebenfalls neu.",
      "Die „Neu“/„Aktualisiert“-Übersicht auf dem Dashboard bezieht sich jetzt korrekt auf den letzten Dashboard-Besuch statt auf den letzten Login.",
      "Admins sehen in der Nutzerverwaltung zusätzlich, wann eine Person zuletzt überhaupt eine Seite aufgerufen hat.",
      "Admins können sich jetzt außerdem per Checkbox-Auswahl über jedes neu angelegte oder bearbeitete Charakter/Missionen/Mission-Logs/Archiv-Einträge benachrichtigen lassen, unabhängig von eigenen Abos.",
      "Auf den Inhalts-Detailseiten können Admins nun auch die Sichtbarkeit (Privat/GM/Öffentlich) direkt umstellen, nicht mehr nur der Owner selbst.",
      "Eine neue Inhaltsübersicht listet alle Inhalte über alle User hinweg, filter-/gruppierbar nach Owner und Kategorie, samt Mass-Edit-Owner-Zuordnung per Checkbox-Auswahl.",
      "Die Buttons in offenen Gesprächen (Beenden/Löschen) sind außerdem zu platzsparenden Icon-Buttons geworden.",
      "Behoben: der mobile Lesemodus blendete die Sidebar nicht mehr aus.",
      "Behoben: der Bearbeiten-Button auf der Mission-Log-Seite tat nichts.",
      "Ein ernsterer Fehler ist ebenfalls behoben: seit den letzten Änderungen konnten einzelne Seitenaufrufe (u.a. das Passwort-Setzen über den Mail-Link) auf unbestimmte Zeit hängen bleiben, weil ein Hintergrund-Datenbankschreibvorgang die einzige Datenbankverbindung einer Serverinstanz blockieren konnte.",
      "Umschalter (z.B. bei Sortierung/Filtern) zeigen die aktive Option jetzt direkt eingefärbt statt über einen gleitenden Balken.",
      "Die Vorschau beim Entfernen von Wikilinks fasst gleiche Verlinkungen jetzt gebündelt mit Anzahl zusammen (wie beim Autolinking).",
      "Die Typografie-Korrektur-Funktion wurde komplett entfernt.",
      "Nachrichten in Gesprächen erscheinen jetzt chronologisch (älteste zuerst) statt umgekehrt.",
    ],
  },
  {
    version: "1.12",
    title: "Sortier-/filterbare Nutzerübersicht & mobile Darstellungsfixes",
    items: [
      "Die Nutzerübersicht (/users) zeigt alle User jetzt in einer nach Name oder Rolle sortier- und filterbaren Tabelle statt einer schlichten Liste.",
      "Einzelne User lassen sich dort wie andere Inhalte mit einem Lesezeichen versehen — der dort wenig sinnvolle Teilen-Button ist verschwunden, auf der einzelnen Profilseite wandert der Folgen-Button dafür sichtbar nach oben rechts.",
      "Mehrere Darstellungsfehler auf schmalen Bildschirmen sind behoben: der Typ-Filter auf der Such-Seite hatte teils einen sichtbaren Versatz im farbigen Hintergrund, mehrere Umschalter (z.B. Datum/Autor auf Missions- und Charakterseiten) hatten eine unschöne Lücke zwischen der aktiven Einfärbung und der Trennlinie, der Navigationstext im eingeloggten Header-Menü skalierte nicht mehr mit der Fensterbreite, und mehrere Buttons/Formulare (Profil, Suche, „Meine Inhalte“) sprengten auf dem Handy noch die Zeile statt sich sauber untereinander anzuordnen.",
      "Bearbeiten/Löschen einzelner Nachrichten in offenen Gesprächen sind jetzt platzsparende Icon-Buttons (wie das Beenden eines Follows).",
      "Ein nicht funktionierender Bearbeiten-Button auf abgeschlossenen Gesprächsseiten im Archiv wurde entfernt.",
      "Der Button zum Zuordnen owner-loser Missionen im Adminbereich heißt jetzt schlicht „Zuordnen“ statt einer redundanten, längeren Beschriftung.",
      "Sicherheitsfix: ein deaktiviertes Konto wird jetzt sofort ausgeloggt, statt erst nach Ablauf der Sitzung (bis zu 30 Tage) tatsächlich gesperrt zu sein.",
      "Sicherheitsfix: eine Passwortänderung meldet jetzt auch alle anderen angemeldeten Geräte/Browser ab statt nur das aktuelle.",
    ],
  },
  {
    version: "1.13",
    title:
      "Login-Sicherheit: Brute-Force-Sperre, Admin-Audit-Log, Sitzungen abmelden",
    items: [
      "Zu viele fehlgeschlagene Anmeldeversuche in kurzer Zeit sperren jetzt vorübergehend, unabhängig davon, ob die eingegebene Adresse überhaupt existiert, und die Login-Fehlermeldung verrät nicht mehr, ob eine E-Mail-Adresse registriert ist.",
      "„Passwort vergessen“ kann nicht mehr beliebig oft hintereinander eine Mail an die betroffene Person und alle Admins auslösen.",
      "Ein neues Audit-Log im Adminbereich zeigt, wer wann welche Useraccount-Aktion (Anlegen, Rolle ändern, (De-)Aktivieren, Löschen, Passwort-Reset auslösen) durchgeführt hat.",
      "Im eigenen Profil gibt es außerdem einen neuen „Auf allen anderen Geräten abmelden“-Knopf, mit dem sich bei Verdacht auf ein fremdes angemeldetes Gerät alle anderen Sitzungen sofort beenden lassen, ohne dafür das eigene Passwort ändern zu müssen.",
      "Admins können jetzt außerdem jeden anderen Useraccount direkt aus der Nutzerverwaltung heraus auf allen Geräten abmelden, etwa bei einem Verdacht auf einen kompromittierten oder unbeaufsichtigten Account.",
    ],
  },
  {
    version: "1.14",
    title: "Admin-Bereich neu strukturiert: eigene Unterseiten für User, DB, Scripts",
    items: [
      "Der Adminbereich war bisher eine einzige lange Seite – jetzt führt ein Dropdown-Menü über „Admin“ im Header zu eigenen Unterseiten für User, Charaktere, DB, Scripts, Inhalte und Audit-Log.",
      "Die Nutzerübersicht zeigt jetzt eine durchsuchbare, sortier- und filterbare Tabelle inklusive der Zeitpunkte des letzten Logins und Seitenaufrufs, die eigentliche Kontoverwaltung findet sich gebündelt auf der Detailseite eines Users.",
      "Neu auf der DB-Seite: Admins können sich Datenbank-Tabellen jetzt direkt und rein lesend ansehen (inklusive Sortierung, Filtern und einem freien SQL-Abfragefeld), ohne dafür erst ein Backup exportieren zu müssen.",
      "Das Audit-Log zeigt zusätzlich, welche Inhalte in den letzten drei Tagen hinzugefügt, bearbeitet oder gelöscht wurden.",
      "Wer eine Mission oder einen Archiv-Eintrag abonniert hat, bekommt jetzt außerdem eine Benachrichtigung, wenn genau dieser Inhalt bearbeitet wird – bisher gab es das nur bei abonnierten Charakteren.",
    ],
  },
  {
    version: "1.15",
    title:
      "Rollen-Hochstufung behoben, Markdown-Import für Admins, Dialoge überarbeitet",
    items: [
      "Ein hartnäckiger Fehler ist behoben: bei jeder technischen Datenbank-Aktualisierung wurde die Rolle bestehender Spielleitungs-Accounts automatisch auf Administration hochgestuft, statt unverändert zu bleiben.",
      "Die im Header angezeigten Anmeldedaten können jetzt nicht mehr über einen Zwischenspeicher an die falsche Person ausgeliefert werden.",
      "Unter „Import“ (Adminbereich) lassen sich Markdown-Dateien im gewohnten Vault-Format hochladen — Archiv-Einträge, Missionen, Charaktere und Missionslogs entstehen daraus nach individueller, durchblätterbarer Vorschau mit vollständig editierbaren Feldern (inklusive aller Metadaten wie Attribute, Verweise und Eigentümer).",
      "Nur noch die Administration darf fremde Nachrichten in jedem Gespräch bearbeiten/löschen und dessen Besitzer:in ändern, auch in bereits abgeschlossenen Gesprächen — nicht mehr die Spielleitung.",
      "Wer mit mehreren eigenen Charakteren an einem Gespräch teilnimmt, kann nicht mehr zweimal hintereinander mit demselben Charakter antworten.",
      "Abgeschlossene Gespräche zeigen standardmäßig einen zusammenhängenden, automatisch generierten Lesetext statt einzelner Nachrichtenkarten, per Umschalter aber weiterhin auch als Kartenansicht anzeigbar.",
      "Gespräche können jetzt schon bei der Erstellung (per Mehrfachauswahl) oder jederzeit danach mehr als zwei Teilnehmende haben — sobald mehr als zwei mitspielen, muss man sich das Antwortrecht erst für zwei Stunden reservieren, mit Sperr-Anzeige und optionaler Mail/Push-Benachrichtigung, sobald die Sperre endet.",
      "Offene Gespräche aktualisieren sich automatisch (neue Nachrichten, Antwortrecht) ohne manuelles Neuladen, inklusive sofortiger Aktualisierung nach dem eigenen Senden oder Reservieren.",
      "Das manuelle DB-Backup (Export wie Import) fragt jetzt, ob lokal oder direkt im Cloud-Speicher gesichert bzw. von dort eingespielt werden soll; das separate User-Backup im Adminbereich bietet denselben Cloud-Weg.",
      "Auf Charakter-, Missions-, Missionslog-, Archiv-Eintrag- und Gesprächsseiten gibt es jetzt einen erweiterten „Teilen“-Knopf (Link kopieren, WhatsApp, Markdown- oder PDF-Download) — bei noch offenen, laufenden Gesprächen bleibt er ausgeblendet, da sich deren Inhalt noch ändert.",
      "Die Darstellung auf schmalen Bildschirmen wurde an vielen Stellen aufgeräumt: Editor-Buttons sind jetzt kompakte Icon-Buttons statt teils abgeschnittener Textknöpfe, mehrere lange Beschriftungen wurden gekürzt, und Buttons passen sich generell besser an die verfügbare Breite an.",
      "Die meisten Seiten nutzen jetzt die volle verfügbare Bildschirmbreite statt einer festen, eher schmalen Höchstbreite.",
      "Unerwartete Serverfehler zeigen jetzt eine gestaltete LCARS-Fehlerseite statt einer nackten Absturzmeldung: alle Besucher sehen eine freundliche Meldung mit Referenzcode, die Administration sieht zusätzlich die genaue Fehlermeldung samt Stacktrace, und jeder Serverfehler wird dauerhaft protokolliert und ist im Adminbereich unter „Fehler-Log“ einsehbar.",
      "Behoben: Zeitstempel im Adminbereich (z. B. beim Bearbeiten eines Users) zeigten bisher die falsche Zeitzone statt der mitteleuropäischen Zeit.",
      "Alle Markdown-Editor-Felder haben jetzt eine Rechtschreibprüfung des Browsers, die sich im Profil unter „Editor“ bei Bedarf abschalten lässt.",
      "Gelöschte Inhalte (Charaktere, Missionen, Missionslogs, Archiv-Einträge, Gespräche) landen jetzt zunächst im neuen Papierkorb (Adminbereich) statt sofort unwiderruflich gelöscht zu werden — sie verschwinden dabei sofort aus Suche, Timeline und allen Übersichten, lassen sich dort aber 7 Tage lang wiederherstellen; außerdem können Admins jetzt auch Charaktere und Archiv-Einträge direkt löschen.",
      "Charaktere, Missionen, Missionslogs und Archiv-Einträge können jetzt außerdem mehrere Bilder haben — ein neuer Bilder-Knopf auf der jeweiligen Detailseite lädt sie hoch und zeigt sie als Galerie an; Admins können im Adminbereich alle hochgeladenen Bilder an einem Ort durchsuchen und einzeln löschen.",
      "Bei Charakteren lässt sich eines der hochgeladenen Bilder jetzt direkt als Profilbild festlegen, ein Klick auf das Portrait öffnet ein durchblätterbares Karussell mit allen hochgeladenen Bildern.",
      "Bei Missionen, Missionslogs und Archiv-Einträgen lässt sich ein bereits hochgeladenes Bild direkt aus der Formatierungsleiste des Markdown-Editors in den Text einfügen, ein Klick darauf öffnet ebenfalls die Vollbild-Ansicht mit Karussell.",
      "Beim Anlegen und Bearbeiten von Charakteren, Missionen, Missionslogs und Archiv-Einträgen lässt sich der Inhalt jetzt zunächst als Entwurf speichern — er bleibt bis zur Veröffentlichung für niemanden außer der eigenen Person sichtbar (Ausnahme: Missionen sehen alle aus der Spielleitung), erscheint aber bereits deutlich markiert unter „Meine Inhalte“.",
      "„Meine Inhalte“ zeigt eigene Entwürfe jetzt gesammelt oben in einer eigenen Übersicht, Sichtbarkeit/Bearbeiten/Löschen stehen bei jedem Eintrag als kompakte Symbol-Knöpfe nebeneinander, und eigene Charaktere, Gespräche und Missionen lassen sich jetzt genau wie Einsatzberichte und Archiv-Einträge direkt dort löschen.",
      "Im Adminbereich zeigen jetzt auch das Audit-Log und das Fehler-Log dasselbe Zeilendetails-Fenster wie die DB-Tabellenansicht, inklusive eines Knopfs, der den gesamten Zeileninhalt in die Zwischenablage kopiert.",
      "Behoben: Das Bearbeiten eines eigenen Einsatzberichts schlug mit einem Serverfehler fehl.",
      "In offenen Gesprächen erscheint die eigene gesendete Nachricht bzw. eine gerade reservierte Antwortrecht-Sperre jetzt sofort, statt bis zu 8 Sekunden auf die automatische Aktualisierung zu warten.",
      "Die Spielleitung bekommt jetzt ein eigenes „Leitung“-Dropdown im Header (analog zum Admin-Menü) mit drei Übersichten: alle Missionen mit Bearbeiten/Löschen/Besitzer:in-Zuordnung direkt in der Liste, die bestehende Charakter-Zuweisung sowie alle aktuell offenen Gespräche — auch ohne eigene Teilnahme, mit lesendem Zugriff auf das jeweilige Gespräch.",
      "Über jedes neu begonnene Gespräch wird jetzt außerdem jeder aktive GM-Account automatisch per Mail/Push informiert, unabhängig davon, ob er selbst daran teilnimmt.",
      "Die Vollbild-Anzeige von Bildern (Charakter-Portrait-Karussell und eingebettete Bilder in Texten) hat jetzt Symbol- statt Textknöpfe zum Schließen und Durchblättern.",
      "Behoben: Der Klick auf „Home“ in der Navigation führte gelegentlich zu einem kurzen Fehler und einer sichtbaren Vollseiten-Neuladung statt einer nahtlosen Navigation.",
      "Die beiden Admin/Spielleitungs-Werkzeuge auf Inhaltsseiten zum automatischen Verlinken bzw. Entfernen von Verlinkungen sind jetzt ein einzelner Knopf mit kleinem Umschalter (Standard: Verlinken hinzufügen) statt zweier getrennter Knöpfe.",
      "Das „Admin“-Menü im Header zeigt Charaktere, Missionen und Gespräche nicht mehr an — diese drei bleiben dem „Leitung“-Menü der Spielleitung vorbehalten.",
    ],
  },
];
