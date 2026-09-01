# 🖖 Neo Archive — LCARS Archive

Ein webbasiertes Kampagnen-Archiv für eine Sci-Fi-Rollenspielrunde, gestaltet im
Look-and-Feel des **LCARS**-Computerinterfaces (Library Computer Access/Retrieval System).
Charaktere, Missionen und Mission-Logs werden in einer PostgreSQL-Datenbank
gepflegt (alleinige Source of Truth) und als responsives Next.js-Frontend
ausgegeben. Ein Markdown-Vault (Obsidian-kompatibel) diente als
Ursprungsimport; ein vollständiges DB-Backup (Export/Restore als JSON,
Admin-Panel) sichert seither den laufenden Datenbestand — siehe
[`docs/content-creation-strategy.md`](docs/content-creation-strategy.md).

> Die Oberfläche ist durchgängig auf **Deutsch**.

---

## ✨ Features

- **LCARS-Oberfläche** — eigene UI-Komponenten (Sidebar, Header, Elbow-Bars, Data-Rows,
  blinkende Statuspunkte) im klassischen Star-Trek-Stil, inkl. Live-Stardate.
- **Charakter-Datenbank** — Profile mit Rang, Spezies, Heimatwelt, Zugehörigkeiten,
  Aliassen und Status (`active` / `retired` / `deceased`).
- **Missionen & Mission-Logs** — Logbucheinträge sind Charakteren und Missionen zugeordnet
  und chronologisch nach Session-Nummer sortiert.
- **Nutzerkonten & granulares Rechtesystem (RBAC)** — die Autorisierung läuft über
  einzelne Rechte (Funktionsbereiche wie `admin.access`, `gm.access`,
  `content.moderate`, `dialogues.moderate`, `campaign.manage`, …), nicht mehr über
  feste Rollen-Abfragen. Rollen bündeln solche Rechte und sind **DB-gestützt**: Neben
  den fünf System-Rollen (Administration/Spielleitung/Spieler:in/Beobachter:in/Gast)
  lassen sich unter `/admin/permissions` eigene Rollen anlegen, die Rechte jeder
  Rolle (auch der System-Rollen) bearbeiten und Rollen direkt Usern zuweisen. Ein
  Konto kann **mehrere Rollen gleichzeitig** haben (effektive Rechte = Vereinigung
  aller Rollen) und pro Person lassen sich einzelne Rechte zusätzlich gezielt
  **gewähren oder entziehen** (Overrides). Konten entstehen weiterhin nur per
  Einladung (Aktivierungsmail mit Passwort-Setup-Link).
- **Zentraler Zugriffsschutz (Proxy) + DAL als Source of Truth** — ein
  Next-16-Proxy (`src/proxy.ts`, ehem. Middleware) leitet nicht angemeldete
  Besucher:innen der geschützten Bereiche (`/user`, `/admin`, `/users`) **vor**
  dem Rendern auf `/login` — eine schnelle, **optimistische** Vorfilterung, die
  nur die Signatur/Ablauf des Session-Cookies prüft (kein DB-Zugriff, gemäß
  Next.js-Empfehlung). Die **verbindliche** Zugriffskontrolle (Rollen/Rechte,
  `is_active`, `session_version`) bleibt in der Data Access Layer
  (`src/lib/dal.ts`) und in jeder Seite/Server-Action (Defense in Depth). Die
  reine Krypto-/Token-Logik teilen sich Proxy und Session-Verwaltung über
  `src/lib/sessionToken.ts`.
- **Eigene Inhalte** — eingeloggte User legen eigene Charaktere, Einsatzberichte,
  Archiv-Einträge und Gespräche zwischen Charakteren an, mit Sichtbarkeitsstufen
  (privat/GM/öffentlich) und einem persönlichen Dashboard (farbcodierter News-Feed,
  offene Gespräche, Lesezeichen/Abos). Gespräche können bereits bei der
  Erstellung mehr als einen Gesprächspartner haben (Mehrfachauswahl) und
  jederzeit auch danach um weitere Teilnehmende erweitert werden
  (Direkt-Hinzufügen durch den Owner samt Info-Mail); haben mehr als zwei
  Teilnehmende, muss man sich das Antwortrecht
  erst per Button für zwei Stunden reservieren, mit Sperr-Anzeige und
  optionaler Mail/Push-Benachrichtigung, sobald die Sperre wieder endet.
  Offene Gespräche aktualisieren sich dabei automatisch per Polling (alle
  8 Sekunden, pausiert bei nicht sichtbarem Tab) — neue Nachrichten und
  Sperr-Status-Änderungen erscheinen ohne manuelles Neuladen der Seite.
- **Eigene Charaktere & Charakterwerte** — wer mindestens einen verknüpften
  Charakter hat, bekommt im Kopfmenü den Punkt „Charaktere" (`/user/characters`):
  Übersicht aller eigenen Charaktere (inkl. Entwürfe) mit Sichtbarkeit,
  Bearbeiten, Löschen und dem Anlegen weiterer Charaktere. Pro Charakter lassen
  sich dort unter „Werte" die Charakterwerte nach dem Bogen von Star Trek
  Adventures 2e pflegen — und zwar auf dem **Original-Bogen selbst**: die
  Seite zeigt das gedruckte „Personnel File" als 816×1056-Blatt
  (`public/character-sheet/personnel-file.svg`), darüber liegen die
  Eingabefelder exakt in ihren gedruckten Kästen. Die Maße stehen als Tabelle
  in `personnelFileLayout.ts`, die Optik in
  `src/styles/lcars-components/personnel-file.css`; jedes Maß ist ein
  Vielfaches von `--pf-unit` (= 1px der Vorlage), sodass der Bogen in einer
  schmaleren Spalte als Ganzes schrumpft statt umzubrechen. Gepflegt werden:
  Personalakte (Pronomen, Rolle, Zuweisung, Herkunft, Erziehung, Laufbahn,
  Erfahrung, Merkmale) samt Foto-Kasten (pflegt dasselbe Bild wie das
  Portrait der Akte, im Bildkasten oben links), sechs Attribute und sechs
  Disziplinen, Protection/Determination/Reputation sowie die Listenfelder
  (Werte, Schwerpunkte, Talente, Spezies-Fähigkeiten, Sonderregeln, Angriffe,
  Ausrüstung, Hobbys, Karriere-Ereignisse). Bild-Upload, Stress-Bonus und
  Speichern stehen unter dem Blatt — der Papierbogen hat dafür keine Felder. Für die Zahlenwerte gelten die
  Regeln der Runde: Attribute 7–12 mit höchstens einem Wert auf 12 und zwei auf
  11, Disziplinen 1–5 mit höchstens einem auf 5 und zwei auf 4 (zentral in
  `src/lib/characterStats.ts`, im Formular als Live-Hinweis, verbindlich in der
  Server-Action). Der maximale Stress ist kein Eingabefeld, sondern ergibt sich
  aus Fitness + Bonus aus Talenten (der Bonus wird gepflegt, da er sich aus dem
  Freitext der Talente nicht verlässlich ableiten lässt). Gespeichert werden sie als
  `characters.metadata.stats` (jsonb, keine eigene Tabelle) — Name, Rang und
  Spezies bleiben Teil der Akte selbst. Charaktere erscheinen deshalb nicht mehr
  in „Meine Inhalte" (`/user/content`); der Charakter-Filter für
  Einsatzberichte/Gespräche bleibt dort erhalten.
- **Erfahrungspunkte (AP)** — jeder Charakter hat ein AP-Konto als
  Buchungsjournal (`character_ap_entries`): die Spielleitung vergibt unter
  „Kampagne" AP (je 1 AP für gespielte Session und geschriebenes Logbuch, ein
  freier Betrag für Missions-/Story-Abschlüsse, dazu Korrekturen), die
  Spieler:innen geben sie auf ihrem Charakterbogen beim Steigern aus. Der
  Kontostand ist immer die Summe der Buchungen — kein separates Saldo-Feld, das
  auseinanderlaufen könnte. Das Regelwerk (Kosten, Budgets, Grenzen) liegt in
  `src/lib/advancement.ts`: Attribut steigern kostet (neuer Wert − 7) × 10 AP,
  Disziplin (neuer Wert) × 10 AP, ein Talent oder Schwerpunkt je 20 AP; für die
  Ersterschaffung stehen je 320 AP für Attribute und Disziplinen bereit (statt
  der 56 bzw. 16 Verteilpunkte) plus 4 Werte, 4 Talente und 6 Schwerpunkte
  frei. Solange die Erschaffung läuft, sind die Werte frei editierbar und
  laufen gegen die Budget-Anzeige; nach dem Festschreiben
  (`metadata.stats.creationLocked`) sind Attribute, Disziplinen, Talente und
  Schwerpunkte schreibgeschützt und nur noch über AP-Steigerungen erhöhbar —
  serverseitig erzwungen, nicht nur im Formular. Steigerung und Abbuchung
  laufen in einer Transaktion, damit nie das eine ohne das andere passiert.
  Alle Zahlen des Regelwerks sind Standardwerte: die Spielleitung stellt sie
  unter `/gm/ap` ein, gespeichert in `campaign_settings.advancement_rules`
  (`src/lib/advancementSettings.ts`); die Funktionen in `advancement.ts` nehmen
  den geltenden Satz als Argument entgegen. Der AP-Bereich des Charakterbogens
  rechnet **live** mit: der State der Attribut-/Disziplin-Eingaben liegt in der
  Klammer-Komponente `CharacterSheet.tsx`, sodass Budget, Rest und
  Übertrags-Vorschau schon beim Tippen mitlaufen; nach der Erschaffung zeigt
  jeder Steigern-Knopf, wie viele AP danach bleiben. Nicht verbrauchtes
  Erschaffungsbudget wird beim Festschreiben als AP gutgeschrieben, gedeckelt
  durch `creationCarryOverMax` (Standard 10) — Gutschrift und Sperre in einer
  Transaktion.
- **Talent-Katalog** — die Talente der Runde liegen in der Tabelle `talents`
  (Name eindeutig, Kategorie, Voraussetzung, Regeltext). Startdaten:
  `scripts/seed/talents.json`, eingespielt mit `npm run db:seed-talents`
  (idempotent). Auf dem Charakterbogen ersetzt eine nach Kategorien gruppierte
  Auswahlliste das freie Tippen — mit Voraussetzung und Regeltext des
  gewählten Talents (`src/app/user/characters/_shared/TalentPicker.tsx`). Die
  Auswahl liegt in einem
  **Modal-Overlay** (gleiches Muster wie `RowDetailModal`: Portal, Escape,
  Klick daneben, Scroll-Sperre) mit Volltextsuche, Kategorie-Filter und
  Klapp-Beschreibung je Talent. Angezeigt werden standardmäßig nur Talente,
  deren **Voraussetzungen erfüllt** sind: `src/lib/talentRequirements.ts`
  parst den Regeltext (`Control 9+`, `A and/und/&/, B`, `A or B`, Spezies,
  vorausgesetzte Talente) und wertet ihn gegen die live mitgeführten Werte
  und die Spezies der Akte aus. Was sich nicht entscheiden lässt (Merkmale,
  Rollen, „GM's discretion", noch ungepflegte Werte) gilt bewusst als
  *unbekannt* und bleibt sichtbar — ein Talent zu verstecken, dessen
  Voraussetzung die App nur nicht versteht, wäre der schlimmere Fehler; ein
  Schalter zeigt zusätzlich die nicht erfüllten. Talente lassen sich beim
  Übernehmen **umbenennen**: gespeichert und angezeigt wird dann
  `Neuer Name (Originalname)` (`formatTalentEntry`/`parseTalentEntry`), womit
  der Katalogname erhalten bleibt — Dublettenprüfung und
  Voraussetzungs-Abgleich arbeiten weiterhin mit ihm. Ein Klick auf
  „Übernehmen" im Fenster **setzt das Talent direkt**: in der Erschaffung als
  Listeneintrag, beim Steigern samt Abbuchung (die Action wird programmatisch
  mit einer `FormData` aufgerufen, es gibt kein zweites Formular daneben). Die
  Talent-Liste des Bogens ist deshalb **kein Freitextfeld** mehr, sondern eine
  Liste mit rotem Minus je Eintrag; abgesendet wird ein verstecktes Feld.
  Während der Erschaffung zählt sie gegen `creationFreeTalents` (Anzeige
  „x / 4"), danach ist sie schreibgeschützt. Beides ist serverseitig
  durchgesetzt (`statsAction.ts`, `advancementAction.ts`): ein Eintrag muss im
  Katalog stehen — bereits gespeicherte Alt-Einträge aus der Freitext-Zeit
  bleiben erlaubt, sonst ließe sich ein solcher Bogen nie wieder speichern.
  Ganz unten am Bogen listet ein **Spickzettel** (`TalentCheatSheet.tsx`) die
  Talente des Charakters mit vollem Regeltext. Dasselbe Listen-Muster (Einträge
  mit rotem Minus, „Hinzufügen" öffnet ein Fenster mit freiem Eingabefeld)
  nutzen über `EntryListField.tsx` auch Werte, Schwerpunkte, Angriffe,
  Ausrüstung, Karriere-Ereignisse und Hobbys; Spezies-Fähigkeiten und
  Sonderregeln bleiben bewusst Fließtext-Blöcke, dort stehen ganze Regelsätze
  statt Aufzählungen. Werte und Schwerpunkte zeigen dabei ihr Freikontingent
  aus der Ersterschaffung an — bei den Schwerpunkten als harte Grenze (sie
  kosten danach AP, serverseitig geprüft), bei den Werten nur als Orientierung,
  da sie sich später nicht kaufen lassen. Die reine Hälfte (Kategorien,
  Labels, Validierung) liegt in `src/lib/talentCatalog.ts`, der Datenzugriff in
  `src/lib/talents.ts`.
- **Spielleitungs-Bereich (`/gm`)** — eigener, über `requireGM` (`gm.access`)
  gegateter Bereich neben `/admin`, erreichbar über das Leitungs-Dropdown im
  Header. Er hält ALLE Werkzeuge der Spielleitung: die früher unter `/admin`
  liegenden Seiten `campaign`, `dialogues`, `characters` und `missions` sind
  hierher umgezogen, `/admin` ist dadurch reine Verwaltung (`requireStaff`
  verlangt dort kein `gm.access` mehr).
  - `/gm/campaign` — Ingame-Jahr, AP-Vergabe, Charakter-Zuweisung und
    Missions-Übersicht an einem Ort (`/gm/characters` und `/gm/missions`
    bleiben als Direktlinks auf die Einzelansichten erhalten).
  - `/gm/dialogues` — alle offenen Gespräche, unabhängig von eigener
    Teilnahme; darunter `[slug]/edit` für die Metadaten (`dialogues.moderate`).
  - `/gm/sessions` — gespielte Sessions eintragen (Datum, Titel, Session-AP,
    Bonus-AP, Notizen) und allen ausgewählten Charakteren in einem Rutsch
    gutschreiben. Vorausgewählt sind alle aktiven Charaktere mit verknüpftem
    Konto; Session, Teilnehmerliste (`game_session_characters`) und
    Gutschriften entstehen in einer Transaktion (`game_sessions` +
    `character_ap_entries.session_id`), das Zurücknehmen storniert sie per
    `ON DELETE CASCADE` mit. Einer Session lassen sich **Logbücher**
    zuordnen (`mission_logs.session_id`): ab dem ersten bucht
    `syncSessionLogbookAp` allen Teilnehmenden automatisch die Logbuch-AP —
    genau einmal je Session und Charakter, idempotent, und beim Wegfallen des
    letzten Logbuchs wieder zurück (auch beim Löschen/Wiederherstellen eines
    Logbuchs).
  - **Missionsabschluss** (auf `/gm/campaign`) — AP für einen Missionsabschluss
    gibt es ausschließlich über die Missionsauswahl: die gewählte Mission wird
    dabei auf `completed` gesetzt und die Buchungen tragen
    `character_ap_entries.mission_id`. Der Grund „Mission" ist deshalb aus der
    freien Buchung entfernt (die Server-Action weist ihn ab).
  - `/gm/ap` — Kontostände aller Charaktere, das Gesamtjournal aller Buchungen
    (nach Charakter und Grund filterbar, serverseitig auf die letzten 500
    begrenzt) und der Editor des AP-Regelwerks.
  - `/gm/talents` — Talent-Katalog durchsuchen, filtern und bearbeiten sowie
    eigene Talente ergänzen. Löschbar sind nur selbst ergänzte Talente, damit
    keine Einträge unter bereits gepflegten Charakterbögen verschwinden.
- **Persönliche News** — der News-Feed auf dem Dashboard bleibt persistent
  sichtbar (nicht mehr nur bis zum nächsten Besuch): jede Meldung lässt sich
  einzeln per X ausblenden (gilt danach als gelesen) und verschwindet automatisch,
  sobald der zugehörige Inhalt aufgerufen wird; ein Knopf markiert alle offenen
  News auf einmal als gelesen. Im Profil lässt sich einstellen, welche News-Arten
  (neu/bearbeitet/gelöscht) überhaupt angezeigt werden (Standard: nur neue).
  Persistenz über die Tabelle `news_seen`.
- **Kampagne & Ingame-Zeit** — die Spielleitung pflegt unter `/gm/campaign`
  („Kampagne", ersetzt das frühere reine „Missionen") an einem Ort das aktuelle
  Ingame-Jahr, die Charakter-Zuweisung und die Missions-Übersicht. Charaktere
  haben ein Geburtsdatum-Feld; ihr angezeigtes Alter wird daraus und dem aktuellen
  Ingame-Jahr automatisch berechnet (sonst manuelles Alter).
- **Öffentliches Changelog** — die Seite `/changelog` listet je Version die
  end-nutzerrelevanten Neuerungen (gepflegt in `src/lib/changelog.ts`).
- **Teilen & Export** — der „Teilen“-Knopf auf Charakter-, Missions-,
  Missionslog-, Archiv-Eintrag- und Gesprächsseiten bietet neben Link
  kopieren/WhatsApp auch den Download des Inhalts als Markdown-Datei (mit
  YAML-Frontmatter) oder als PDF (serverseitig erzeugt, ohne Chromium/
  Puppeteer — läuft dadurch auf Netlify Functions). Berücksichtigt dieselbe
  Sichtbarkeits-/Teilnehmer-Prüfung wie die jeweilige Detailseite selbst.
- **Markdown-Editor** — Formatierungs-Toolbar, Rohtext/Vorschau-Umschalter und
  automatische bzw. manuelle Verlinkung (`[[Wikilinks]]`) zwischen Inhalten.
- **Bilder-Galerie** — Charaktere, Missionen, Missionslogs und Archiv-Einträge
  (nicht Gespräche) können mehrere Bilder haben (JPEG/PNG/WebP/GIF, max. 5 MB
  pro Datei); Hochladen/Löschen ist auf dieselbe Person beschränkt, die den
  Inhalt auch sonst bearbeiten darf. Speicherung im selben R2-Bucket wie die
  DB-Backups (eigener Präfix, keine zusätzliche Konfiguration nötig). Bei
  Charakteren lässt sich eines der hochgeladenen Bilder als Profilbild
  festlegen; ein Klick aufs Portrait öffnet ein Karussell über alle
  hochgeladenen Bilder statt nur des einzelnen Portraits. Bei Missionen,
  Missionslogs und Archiv-Einträgen lässt sich außerdem ein bereits
  hochgeladenes Bild direkt aus der Formatierungsleiste des Markdown-Editors
  in den Text einfügen. Admins sehen unter `/admin/content/images`
  ("Bilder") zusätzlich alle hochgeladenen Bilder über alle Inhalte hinweg
  mit Vorschau und können sie dort einzeln endgültig löschen, auch verwaiste
  Bilder, deren zugehöriger Inhalt bereits gelöscht wurde.
- **Entwürfe** — Charaktere, Missionen, Missionslogs und Archiv-Einträge lassen
  sich beim Anlegen/Bearbeiten statt zu veröffentlichen erst als Entwurf
  speichern (Text-Pflichtfeld entfällt dann); ein Entwurf ist unabhängig von
  seiner Sichtbarkeitsstufe für niemanden außer der eigenen Person sichtbar,
  auch nicht für Spielleitung/Administration (Ausnahme: Missionen, die jede
  Spielleitung sehen kann, da Missionen kein Einzel-Owner-Modell haben), und
  erscheint bis zur Veröffentlichung nur unter „Meine Inhalte“.
- **PWA mit Push-Benachrichtigungen und Offline-Betrieb** — installierbar auf
  Mobilgeräten (inkl. maskable Icon), Web-Push für neue Dialog-Nachrichten und
  abonnierte Inhalte. Ein Service Worker macht bereits besuchte Seiten offline
  abrufbar und zeigt sonst eine eigene Offline-Ausweichseite (`/offline`);
  Anmeldung, neue Inhalte und Änderungen brauchen weiterhin eine Verbindung.
- **Wählbare LCARS-Farbschemata** — angemeldete User wählen im Profil unter
  „Darstellung“ ein Theme für die gesamte Oberfläche (Standard plus die echten
  LCARS-Paletten Classic, Science, Nebula, Red Alert, Nemesis) und können jede
  einzelne Akzentfarbe individuell überschreiben. Die Wahl gilt pro Konto, wird
  ohne Flackern schon beim Seitenaufbau angewendet (Pre-Paint-Cookie) und bleibt
  geräteübergreifend erhalten. Die Farbe des eigentlichen Fließtexts bleibt dabei
  bewusst konstant (feste `--lcars-ink-*`-Tokens), damit der Text in jedem Theme
  gut lesbar bleibt.
- **Abschaltbares LCARS-Design (minimalistisches UI)** — wer es lieber schlicht
  mag, deaktiviert im Profil unter „Darstellung → Oberfläche“ das LCARS-Design
  und bekommt stattdessen ein schlankes, minimalistisches Interface: System-
  schrift, keine dekorativen Elbows/Balken/Versalien, kein Header — die gesamte
  Navigation liegt links in der Sidebar (auf dem Handy als reine Symbole). Rein
  CSS-basiert (`html[data-ui="minimal"]`, Pre-Paint-Cookie `neo_ui`), die
  eigentliche Zugriffskontrolle bleibt unberührt.
- **Tutorial-Seite** — erklärt alle Funktionen für Besucher, User und Spielleitung.
- **Markdown-Vault als Ursprungsimport** — Inhalte lassen sich initial aus
  `.md`-Dateien mit YAML-Frontmatter (Obsidian-kompatibel) importieren; neue Inhalte
  entstehen danach direkt in der App (Datenbank als alleinige Source of Truth).
  Admins können im selben Frontmatter-Format zusätzlich einzelne oder mehrere
  `.md`-Dateien direkt im Adminbereich hochladen — Archiv-Einträge, Missionen,
  Charaktere und Missionslogs —, ohne dafür das CLI-Ingest-Skript zu brauchen.
  Jede Datei wird zunächst nur geparst und als durchblätterbare Vorschau
  angezeigt (Datei 1 von N mit Vor-/Zurück-Navigation), in der sich alle
  Felder inklusive Text noch bearbeiten lassen, bevor sie einzeln bestätigt
  wird.
- **DB-Backup** — der komplette Datenbankinhalt lässt sich im Admin-Panel als
  JSON-Datei herunterladen und bei Bedarf wieder vollständig einspielen; ein
  täglicher Cronjob sichert zusätzlich automatisch nach Cloudflare R2 und
  löscht dort Backups, die älter als 30 Tage sind. Manuelles Sichern/
  Einspielen ist außerdem direkt im selben R2-Bucket möglich (eigener Key
  pro Sicherung, fällt nicht unter die automatische Löschung). Das separate
  User-Backup (nur Useraccounts, per Upsert über die E-Mail-Adresse statt
  vollem Restore) bietet denselben R2-Cloud-Weg unter einem eigenen Präfix
  (`user-backups/`) im gleichen Bucket.
- **Admin-Bereich** — eigene Unterseiten für Nutzerverwaltung (durchsuchbare/
  sortierbare Tabelle, Detailseite pro User für Rollen/Einzelrechte/Aktivierung/
  Löschen/Passwort-Reset), den Rollen-Editor `/admin/permissions` (Rollen anlegen/
  bearbeiten, Rechte je Rolle setzen, Mitglieder zuweisen), Charakter-Zuweisung,
  Wartungs-Skripte sowie einen Datenbank-Tabellenbrowser inkl. freiem
  SQL-Abfragefeld (Syntaxhervorhebung via CodeMirror, on-demand geladen):
  SELECT läuft schreibgeschützt, INSERT/UPDATE/DELETE nur mit den jeweiligen
  DB-Rechten (`sql_read`/`sql_write`/`sql_delete`). Passwort-/Token-Spalten
  werden dabei nie ausgegeben und Auth-/Sicherheits-Tabellen (Konten, Rollen,
  Anmelde-Protokolle, Audit-Log) sind gegen Schreibzugriff gesperrt — über das
  freie Feld wie über den zeilenweisen Editor. Ein
  Audit-Log protokolliert sicherheitsrelevante Useraccount- sowie Rollen-/
  Rechteänderungen (inkl. IP-Adresse) sowie, separat, eine 3-Tage-Übersicht aller
  neu angelegten, bearbeiteten und gelöschten Inhalte. Zwei Wartungs-Skripte
  laufen blockweise mit Fortschrittsanzeige (jeweils ausblendbar): „Alle Inhalte
  verlinken" (Bulk-Autolinking; Autolinking ist bei neuen Inhalten außerdem
  standardmäßig vorausgewählt) und „Gespräche-Fließtext erzeugen" (Backfill für
  vor Einführung des Features abgeschlossene Dialoge). Wer `dialogues.moderate`
  hat (per Default Admins), darf als Moderation jede Nachricht in jedem Gespräch
  bearbeiten oder löschen, auch fremde und auch in bereits abgeschlossenen
  Gesprächen, dessen Metadaten (Titel/Datum/Schauplatz/Ort/Tags — nicht den
  Verlauf) direkt auf der Gesprächsseite bearbeiten, sowie jederzeit den Besitzer
  eines Gesprächs neu zuordnen. Eine weitere Unterseite, das Fehler-Log, listet
  alle unerwarteten Serverfehler (Zeitpunkt, Route, Meldung, Digest); zusätzlich
  erhält die Administration jeden Morgen um 6 Uhr (Berliner Zeit) automatisch eine
  Mail mit allen Fehler- und Audit-Log-Einträgen der letzten 24 Stunden.
  Die Spielleitung hat ein eigenes „Leitung“-Dropdown im Header, das getrennt
  neben dem Admin-Menü steht (wer beide Rollen hat, sieht beide Menüs
  nebeneinander) und in den Bereich `/gm` führt: Kampagnen-Seite (Ingame-Jahr,
  Charakter-Zuweisung, Missions-Übersicht mit Bearbeiten/Löschen/Besitzer:in-
  Zuordnung), Sessions, AP, Talente sowie alle aktuell offenen Gespräche — auch
  ohne eigene Teilnahme, verlinkt auf die read-only-Ansicht des jeweiligen
  Gesprächs. Über jedes neu
  begonnene Gespräch wird jeder aktive GM-Account zusätzlich automatisch per
  Mail/Push informiert.
- **Custom-404/500-Seiten** — unerwartete Serverfehler zeigen eine
  LCARS-gestaltete 500-Seite statt der Next.js-Standardfehlerseite; alle
  Besucher sehen eine freundliche Meldung mit Referenz-Code, eingeloggte
  Admins zusätzlich die volle Fehlermeldung inkl. Stacktrace. Jeder
  Serverfehler (auch bereits im Code abgefangene) wird dauerhaft über
  `src/instrumentation.ts` bzw. `logCaughtError()` in der Tabelle
  `error_logs` protokolliert und ist im Adminbereich unter „Fehler-Log“
  einsehbar.
- **Archiv-Assistent (RAG)** — ein KI-Assistent (unter `/rag` sowie unterhalb der
  Volltextsuche auf `/search`) beantwortet Fragen zum Kampagneninhalt in
  natürlicher Sprache. Die Frage wird per OpenAI-Embedding vektorisiert, **hybrid**
  (semantische Vektorsuche + lexikalische Keyword-/Trigramm-Suche) gegen die
  vektorisierten Inhalte (`content_embeddings`, pgvector) gematcht, und Cloudflare
  Workers AI formuliert daraus streamend eine Antwort mit Quellen-Angabe —
  gefiltert nach den Leserechten des Betrachters (private/GM-Inhalte fließen nur
  ein, wenn erlaubt). Details siehe „Archiv-Assistent (RAG)" unter Deployment.
- **Custom-Markdown-Pipeline** — `remark`/`rehype` wandeln Markdown in HTML um und rendern
  `h2`-Überschriften als LCARS-Data-Rows.
- **SEO-fertig** — `robots.ts`, `sitemap.ts`, dynamische Metadaten und 404-Seite.
- **Rechtskonform** — Impressum und Datenschutz (DSGVO) bereits angelegt.

---

## 🛠️ Tech-Stack

| Bereich    | Technologie                                                         |
| ---------- | ------------------------------------------------------------------- |
| Framework  | [Next.js 16](https://nextjs.org) (App Router)                       |
| UI         | [React 19](https://react.dev)                                       |
| Styling    | [Tailwind CSS v4](https://tailwindcss.com)                          |
| Datenbank  | PostgreSQL (via [`postgres`](https://github.com/porsager/postgres)) |
| Content    | Markdown + YAML-Frontmatter (`gray-matter`, `remark`, `rehype`)     |
| Schriften  | Antonio & Share Tech Mono (`next/font`)                             |
| Sprache    | TypeScript                                                          |
| Deployment | Netlify (`@netlify/plugin-nextjs`)                                  |

---

## 🚀 Schnellstart

### Voraussetzungen

- Node.js 20+
- Zugriff auf eine PostgreSQL-Datenbank
- Ein Markdown-Vault mit den Inhalten (Ordner `Charaktere/`, `Missionen/` …)

### 1. Abhängigkeiten installieren

```bash
npm install
```

### 2. Umgebungsvariablen anlegen

Lege eine Datei `.env.local` an (Vorlage: [`.env.example`](.env.example)):

```bash
# PostgreSQL-Verbindungsstring
DATABASE_URL="postgres://user:password@host:5432/datenbank"

# Pfad zum Markdown-Vault (für die Ingestion)
VAULT_PATH="/pfad/zum/vault"

# Cache-Revalidation nach dem Ingest (siehe Hinweis unten)
SITE_URL="http://localhost:3000"
REVALIDATE_SECRET="ein-langes-zufaelliges-secret"

# Archiv-Assistent (RAG) — optional; fehlen die Schlüssel, ist /rag deaktiviert
# (die App überspringt Embeddings still, wie bei RESEND/VAPID)
OPENAI_API_KEY=""           # Embeddings (text-embedding-3-small, 1536 Dim.)
# OPENAI_ADMIN_API_KEY=""   # optional: Admin-Key (sk-admin-…) für das
                            # OpenAI-Nutzungs-Panel unter /admin/rag (Costs-API);
                            # ohne ihn wird OPENAI_API_KEY versucht
CLOUDFLARE_AI_API_TOKEN=""  # Workers AI (Antwort-Generierung); Account-ID
                            # wird aus R2_ACCOUNT_ID wiederverwendet
# CLOUDFLARE_AI_MODEL=""    # optional: Modell überschreiben (Default:
                            # @cf/meta/llama-3.3-70b-instruct-fp8-fast)
```

> **Cache-Hinweis (wichtig für die lokale Entwicklung):** Die Datenabfragen
> nutzen `unstable_cache`. Ein Import (`db:ingest`) invalidiert die Caches nur,
> indem er nach Abschluss `POST /api/revalidate` auf den/die in `SITE_URL`
> hinterlegten Server schickt. `SITE_URL` darf eine **kommaseparierte Liste**
> sein — nimm `http://localhost:3000` mit auf, damit auch der laufende
> Dev-Server invalidiert wird, sonst zeigt er nach dem Import veraltete (oder
> leere) Daten:
>
> ```bash
> SITE_URL="https://neo-archiv.de, http://localhost:3000"
> ```
>
> `REVALIDATE_SECRET` muss auf jedem Ziel-Server identisch gesetzt sein, und der
> Dev-Server muss während des Imports laufen.

### 3. Datenbankschema anlegen

```bash
npm run db:setup
```

Liest `scripts/schema.sql` ein und erstellt alle Tabellen
(`characters`, `missions`, `mission_logs`, `archive_entries`, …).

### 4. Ersten Admin-User anlegen

```bash
npm run db:create-admin
```

Legt einen Admin-Account an, aber nur wenn `users` noch komplett leer ist —
Adresse/Name kommen aus `ADMIN_EMAIL`/`ADMIN_NAME` (siehe `.env.example`).
Ohne gesetztes `ADMIN_PASSWORD` wird eins generiert und einmalig in der
Konsole ausgegeben.

### 5. Inhalte importieren

```bash
npm run db:ingest
```

Liest die Markdown-Dateien aus `VAULT_PATH` ein und schreibt sie per Upsert in die Datenbank.

> **Nur neue Dateien:** `npm run db:ingest:new` verarbeitet ausschließlich
> Dateien, deren `slug` noch nicht in der Datenbank existiert — nützlich bei
> großen Vaults, um nicht bei jedem Lauf alles neu zu importieren. Sobald ein
> Slug einmal importiert wurde, fasst dieses Skript ihn nie wieder an, auch
> nicht nach Bearbeitungen der Quelldatei — dafür bleibt `npm run db:ingest`
> zuständig.

> **Sicherung des DB-Stands:** Neue/bearbeitete Inhalte entstehen über die
> Web-App direkt in der Datenbank, es gibt keine Rückrichtung DB → Vault mehr.
> Um den kompletten Datenbankinhalt zu sichern, im Admin-Panel (`/admin/db` →
> „DB-Backup“) auf „Backup herunterladen“ klicken; über „Backup einspielen“
> lässt sich eine solche Datei auch wieder vollständig zurückspielen — siehe
> `docs/content-creation-strategy.md`. Derselbe Bereich bietet außerdem einen
> Tabellenbrowser und ein freies SQL-Abfragefeld für einzelne Tabellen (SELECT
> schreibgeschützt, INSERT/UPDATE/DELETE nur mit den passenden DB-Rechten;
> Credential-Spalten und Auth-Tabellen sind geschützt), ohne dafür erst ein
> komplettes Backup exportieren zu müssen.

### 6. Entwicklungsserver starten

```bash
npm run dev
```

> **Hinweis:** `npm run dev` lädt immer `.env.dev` (nicht `.env.local`) —
> der lokale Entwicklungsserver läuft damit standardmäßig gegen die Dev-DB
> statt gegen die in `.env.local` hinterlegte Datenbank, um ein versehentliches
> Schreiben gegen Production beim Entwickeln auszuschließen. `.env.dev` muss
> dafür angelegt sein (siehe „Dev-/Preview-Umgebung" unter Deployment). Alle
> anderen Befehle (`db:ingest`, `db:setup`, …) nutzen weiterhin `.env.local`,
> sofern nicht explizit die `:dev`-Variante aufgerufen wird.

Anschließend die angezeigte Adresse im Browser öffnen.

---

## 📜 NPM-Skripte

| Skript                      | Beschreibung                                                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run dev`               | Startet den Entwicklungsserver (gegen `.env.dev`)                                                                                                |
| `npm run build`             | Erstellt den Produktions-Build                                                                                                                   |
| `npm run start`             | Startet den Produktionsserver                                                                                                                    |
| `npm run lint`              | Führt ESLint aus                                                                                                                                 |
| `npm run db:setup`          | Legt das Datenbankschema an (`scripts/schema.sql`)                                                                                               |
| `npm run db:create-admin`   | Legt einen Admin-User an, nur wenn `users` leer ist                                                                                              |
| `npm run db:ingest`         | Importiert den kompletten Markdown-Vault                                                                                                         |
| `npm run db:ingest:new`     | Importiert nur Dateien mit noch unbekanntem `slug`                                                                                               |
| `npm run db:characters`     | Importiert nur die Charaktere                                                                                                                    |
| `npm run db:missions`       | Importiert nur Missionen + Mission-Logs                                                                                                          |
| `npm run db:archive`        | Importiert nur die Archiv-Einträge                                                                                                               |
| `npm run db:revalidate`     | Invalidiert nur die Caches (siehe `SITE_URL`)                                                                                                    |
| `npm run db:seed-talents`   | Spielt den Talent-Katalog aus `scripts/seed/talents.json` ein (idempotent)                                                                        |
| `npm run embed:all`         | Baut den Vektor-Index des Archiv-Assistenten für alle Inhalte (neu) auf — Backfill, idempotent (siehe „Archiv-Assistent (RAG)")                  |
| `npm run db:reset`          | Setzt die Datenbank zurück                                                                                                                       |
| `npm run db:backup`         | Exportiert die komplette DB als JSON nach Cloudflare R2 (siehe „Tägliches DB-Backup")                                                            |
| `npm run db:backup:cleanup` | Löscht R2-Backups, die älter als 30 Tage sind                                                                                                    |
| `npm run db:purge-deleted`  | Entfernt weich gelöschte Inhalte endgültig, deren `deleted_at` älter als 7 Tage ist                                                              |
| `npm run test`              | Führt die Unit-Tests aus (`src/**/*.test.ts`)                                                                                                    |
| `npm run test:e2e`          | Führt die Playwright-E2E-Tests aus (öffentliche Seiten, Offline-PWA, Komponenten-Galerie sowie Layout-/Schrift-Regressionen an beiden Viewports) |
| `npm run test:integration`  | Führt die DB-Integrationstests aus (`tests/integration/`, braucht eine erreichbare Postgres-Instanz)                                             |

Jedes `db:*`-Ingest-/Setup-Skript gibt es zusätzlich als `:dev`-Variante
(z.B. `db:setup:dev`, `db:ingest:dev`, `db:reset:dev`) — identisch, nur mit
`--env-file=.env.dev` statt `.env.local`. Ausnahme: `db:backup`/
`db:backup:cleanup`/`db:purge-deleted` lesen `DATABASE_URL`/die
R2-Zugangsdaten direkt aus der Prozessumgebung (kein `--env-file`, siehe
GitHub-Actions-Secrets oben) und haben deshalb keine `:dev`-Variante. Siehe
„Dev-/Preview-Umgebung" unter Deployment.

---

## 📂 Projektstruktur

```
.
├── scripts/
│   ├── schema.sql            # PostgreSQL-Schema (idempotent, keine Datenänderung)
│   ├── migrate-pr<NN>.sql    # Pro Pull Request: Migration der Produktions-Daten
│   ├── setup-db.ts           # Schema anlegen
│   ├── reset-db.ts           # Datenbank zurücksetzen
│   ├── backup-db.ts          # Voll-Backup nach R2 (täglicher Cronjob)
│   ├── cleanup-db-backups.ts # Löscht R2-Backups älter als 30 Tage
│   ├── purge-soft-deleted.ts # Entfernt weich gelöschte Inhalte älter als 7 Tage endgültig
│   └── ingest/               # Markdown-Vault → Datenbank
│       ├── index.ts          # Einstiegspunkt der Ingestion
│       ├── characters.ts
│       ├── missions.ts
│       ├── missionLogs.ts
│       ├── archive.ts        # Archiv-Einträge + Querverweise
│       └── shared.ts         # Markdown→HTML, Validierung
└── src/
    ├── app/                  # Next.js App Router (Seiten & API-Routes)
    │   ├── page.tsx           # "/" — Landingpage (anonym) / Dashboard (eingeloggt)
    │   ├── Dashboard.tsx       # Persönliches Dashboard: News-Feed, offene Gespräche, Abos
    │   ├── characters/        # Charakterübersicht & -detailseiten
    │   ├── missions/
    │   ├── archive/
    │   ├── dialogues/         # Öffentliche Ansicht abgeschlossener Gespräche
    │   ├── rag/               # Archiv-Assistent (RAG-Chat)
    │   ├── search/            # Volltextsuche + eingebetteter Archiv-Assistent
    │   ├── tutorial/          # Anleitung für Besucher/User/Spielleitung
    │   ├── login/, activate/, forgot-password/
    │   ├── users/             # Öffentliche Nutzerübersicht + Profilseiten anderer User
    │   ├── user/              # Eigenes Profil, Settings, eigene Inhalte anlegen/verwalten
    │   │   └── characters/     #   Eigene Charaktere: Übersicht, anlegen, bearbeiten, Werte ([id]/stats)
    │   ├── admin/             # Admin-Bereich (staff-baseline, feiner je Unterseite):
    │   │   ├── users/          #   Nutzerverwaltung (Tabelle + Detailseite [id]/edit/)
    │   │   ├── permissions/    #   Rollen-Editor: Rollen anlegen/bearbeiten + zuweisen
    │   │   ├── campaign/       #   Kampagne: Ingame-Jahr, Charakter-Zuweisung, Missionen
    │   │   ├── characters/     #   Charakter-Zuweisung
    │   │   ├── dialogues/      #   Alle offenen Gespräche, auch ohne eigene Teilnahme
    │   │   ├── db/             #   DB-Backup, Tabellenbrowser, freies SQL-Abfragefeld
    │   │   ├── scripts/        #   Bulk-Autolinking, Gespräche-Fließtext, Cache-Rebuild, u.a.
    │   │   ├── audit-log/      #   Sicherheits-Audit-Log + Content-Aktivitätsfeed
    │   │   ├── error-log/      #   Protokollierte Serverfehler (Zeitpunkt, Route, Meldung)
    │   │   ├── content/        #   Owner-/Sichtbarkeits-Übersteuerung fremder Inhalte
    │   │   └── import/         #   Markdown-Datei-Upload → neue Einträge (mit Vorschau)
    │   ├── api/               # /api/characters, /api/health …
    │   ├── error.tsx           # Custom 500-Seite (Server Components/Route Handlers)
    │   ├── global-error.tsx    # Custom 500-Seite bei Fehlern im Root-Layout selbst
    │   ├── manifest.ts        # PWA-Manifest (Icons, inkl. maskable)
    │   ├── robots.ts
    │   └── sitemap.ts
    ├── components/lcars/      # LCARS-UI-Komponenten
    ├── context/              # React-Context (Neo)
    ├── hooks/                # useNeo, usePageMeta …
    ├── lib/                  # DB-Zugriff & Datenabfragen
    ├── types/                # TypeScript-Typen
    └── utils/                # Stardate, Datumsformatierung …
```

---

## 🗃️ Inhaltsmodell

Die Inhalte stammen aus Markdown-Dateien mit YAML-Frontmatter. Beispiel für einen Charakter:

```markdown
---
type: character
slug: jean-luc-picard
name: Jean-Luc Picard
status: active
rank: Captain
species: Mensch
homeworld: La Barre, Erde
affiliation:
  factions: [Föderation]
  ships: [USS Enterprise]
  division: Command
aliases: [Locutus]
---

## Biografie

Öffentlicher Inhalt …

<!-- private -->

Dieser Abschnitt ist nur für die GM-Sicht und wird nicht veröffentlicht.
```

- **`type`** steuert, in welche Tabelle ein Eintrag wandert (`character`,
  `mission`, `mission-log`, `archive-entry`).
- **`slug`** muss URL-sicher sein (`a–z`, `0–9`, `-`).
- **`owner`** (optional, außer bei Charakteren: dort steuert `player` dieselbe
  Zuordnung) verweist per User-Slug auf den Owner des Inhalts — Grundlage für
  das Sichtbarkeits-Flag (`private`/`gm`/`public`). Unbekannte/fehlende Werte
  brechen den Import nicht ab, der Inhalt bleibt dann ownerlos. Bei
  Mission-Logs fällt der Owner ohne `owner`-Feld automatisch auf den Spieler
  des `author`-Charakters zurück.
- Alles nach `<!-- private -->` wird beim Import abgeschnitten.

Archiv-Einträge (`type: archive`) liegen im Ordner `Archiv/`, organisiert nach
Kategorie-Unterordnern (`Dialoge/`, `Fraktionen/`, `Items/`, `Lore/`, `NPCs/`,
`Orte/`, `Schiffe/`, `Spezies/`):

```markdown
---
type: archive
slug: tanghal-iv
title: Tanghal IV
category: location # optional — sonst aus dem Ordner abgeleitet
teaser: Klasse-M-Planet im Epetra-Sektor.
location_type: planet
system: Epetra
controlled_by: sternenflotte # Slug → archive_links
related_factions: [epetraner]
related_characters: [lorzan-keen] # Slug → /characters/…
related_missions: [erster-kontakt] # Slug → /missions/…
tags: [planet, klasse-m]
---

Öffentlicher Inhalt …
```

- **`category`** ist einer der acht Werte (`person`, `location`, `item`,
  `faction`, `theory`, `event`, `species`, `other`). Fehlt das Feld (z.B. bei
  Orten/Schiffen), wird es aus dem Top-Level-Ordner abgeleitet.
- **`teaser`** dient als Kurzbeschreibung (Übersicht + Meta-Description).
- Typ-spezifische Skalar-Felder (`status`, `system`, `class`, …) erscheinen als
  Datenfelder auf der Detailseite.
- **Referenz-Felder** (`related_*`, `controlled_by`, `leader`, `participants`,
  …) enthalten Ziel-`slugs`. Verweise auf andere Archiv-Einträge landen in
  `archive_links` (Detailseite: „Verweise“ + Rückverweise „Erwähnt in“);
  Verweise auf Charaktere bzw. Missionen werden als verlinkte Chips angezeigt.

---

## 🚢 Deployment

Das Projekt ist für **Netlify** vorkonfiguriert (`@netlify/plugin-nextjs`).
`DATABASE_URL` als Environment-Variable im Netlify-Dashboard hinterlegen; die Ingestion
(`db:setup` / `db:ingest`) wird gegen die produktive Datenbank ausgeführt.

### Tägliches DB-Backup

`.github/workflows/daily-db-backup.yml` läuft täglich um 03:00 UTC (plus
manuell auslösbar über "Run workflow") und lädt einen vollständigen
DB-Export (`scripts/backup-db.ts`, dieselbe Export-Logik wie der
DB-Backup-Bereich im Adminpanel unter `/admin/db`) nach Cloudflare R2 hoch.
Im selben Lauf löscht anschließend `scripts/cleanup-db-backups.ts`
(`npm run db:backup:cleanup`) alle Backups, die älter als 30 Tage sind —
das Alter wird aus dem Datei-Key selbst gelesen (`db-backups/JJJJ-MM-TT.json`),
nicht aus S3s `LastModified`. Manuell im Adminpanel nach R2 gespeicherte
Backups bekommen einen davon unterscheidbaren Key
(`db-backups/manual-<Zeitstempel>.json`, siehe `buildManualDbBackupKey` in
`src/lib/r2Backup.ts`) und fallen deshalb bewusst NICHT unter dieses
automatische Aufräumen — sie bleiben bis zur manuellen Löschung erhalten.
Als dritter Schritt im selben Job entfernt `scripts/purge-soft-deleted.ts`
(`npm run db:purge-deleted`) anschließend alle weich gelöschten Inhalte
(Charaktere/Missionen/Missionslogs/Archiv-Einträge/Dialoge, siehe „Soft-Delete
für Inhalte" weiter unten), deren `deleted_at` mehr als 7 Tage zurückliegt,
endgültig aus der DB — bewusst NACH dem Backup-Upload, damit ein zu
purgender Inhalt notfalls noch aus dem frischen Backup wiederhergestellt
werden könnte. Dabei löscht `purgeContentImagesFor()` auch die zum Inhalt
gehörenden Bilder samt R2-Objekten mit (siehe „Bilder für Inhalte" weiter
unten) — der Purge-Schritt braucht deshalb zusätzlich zu `DATABASE_URL` auch
die vier `R2_*`-Secrets. Dafür müssen folgende Repository-Secrets gesetzt
sein (GitHub → Settings → Secrets and variables → Actions → "New repository
secret"):

| Secret                                      | Wert                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                              | Dieselbe produktive Connection-URL wie im Netlify-Dashboard — muss hier **zusätzlich** als GitHub-Secret hinterlegt werden, GitHub Actions liest Netlifys Environment-Variablen nicht automatisch mit. Nötig für den Backup- UND den Purge-Schritt, nicht für das R2-Cleanup.                                                                                                                |
| `R2_ACCOUNT_ID`                             | Cloudflare-Account-ID (Cloudflare-Dashboard → R2 → Account-Details). Nötig für den Backup- UND den Purge-Schritt (Bild-Cleanup), nicht für das R2-Cleanup.                                                                                                                                                                                                                                   |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2-API-Token mit Schreibrecht auf den Ziel-Bucket (R2 → "Manage API Tokens").                                                                                                                                                                                                                                                                                                                |
| `R2_BUCKET_NAME`                            | Name des **Backup**-Buckets für die Backup-Dateien (`db-backups/<Datum>.json`, ein Key pro Kalendertag). Hochgeladene Assets liegen seit dem Asset-Bucket-Release nicht mehr hier, sondern in `R2_ASSET_BUCKET_NAME` (siehe unten).                                                                                                                                                          |
| `R2_ASSET_BUCKET_NAME`                      | Name des **öffentlichen** Asset-Buckets für hochgeladene Assets — Content-Bilder (`content-images/...`), Charakter-Portraits (`character-portraits/...`) und Charakterbögen (`character-sheets/...`). Muss in Cloudflare als öffentlicher Bucket eingerichtet sein (eigene Domain oder r2.dev-URL). Für den App-Betrieb (Netlify) und die Migration nötig, **nicht** für den Backup-Cronjob. |
| `R2_ASSET_PUBLIC_BASE_URL`                  | Öffentliche Basis-URL des Asset-Buckets ohne Trailing-Slash (z.B. `https://assets.neo-archiv.de` oder die von Cloudflare vergebene `https://pub-….r2.dev`). Daraus baut die App die direkten Asset-Links.                                                                                                                                                                                    |

**Wichtig für das manuelle R2-Backup im Adminpanel** (`/admin/db` — "Im
R2-Bucket speichern" / "Aus R2-Bucket importieren", genauso für das
User-Backup unter demselben Adminbereich mit `user-backups/`-Präfix):
dieselben vier `R2_*`-Variablen müssen **zusätzlich** im Netlify-Dashboard
als Environment-Variablen hinterlegt werden. Die GitHub-Secrets oben gelten
nur für den Cronjob (GitHub Actions) — die deployte Next.js-App auf Netlify
liest sie separat aus ihrer eigenen Umgebung. Ohne diese Netlify-Variablen
zeigen die R2-Buttons im Adminpanel einen Fehler ("... ist nicht gesetzt"),
der lokale Download/Upload-Weg funktioniert davon unabhängig immer.

### Soft-Delete für Inhalte

Charaktere, Missionen, Missionslogs, Archiv-Einträge und Dialoge werden beim
Löschen nicht mehr sofort aus der Datenbank entfernt, sondern nur mit einem
`deleted_at`-Zeitstempel markiert (siehe `scripts/schema.sql`). Für alle
außer Admins verschwinden sie damit sofort aus Suche und allen
Übersichten — Admins sehen sie weiterhin im Papierkorb unter
`/admin/content/trash` (Adminbereich → "Papierkorb") und können sie dort
wiederherstellen oder sofort endgültig löschen. Ohne manuelles Eingreifen
entfernt der tägliche Cronjob (`scripts/purge-soft-deleted.ts`, siehe oben)
weich gelöschte Inhalte automatisch nach 7 Tagen.

### Bilder für Inhalte

Charaktere, Missionen, Missionslogs und Archiv-Einträge (nicht Gespräche —
siehe `src/lib/contentImages.ts`) können beliebig viele Bilder haben. Die
Bytes landen im **öffentlichen Asset-Bucket** (`R2_ASSET_BUCKET_NAME`, siehe
Backup-Abschnitt oben), unter dem eigenen Präfix
`content-images/<Typ>/<ID>/<UUID>.<Endung>` — getrennt vom Backup-Bucket,
damit hochgeladene Assets nicht mehr zwischen den Backups liegen. Bestehende
Bilder werden mit `npm run assets:migrate-content-images` einmalig aus dem
Backup- in den Asset-Bucket umgezogen (idempotent, `--dry-run` zeigt vorab,
was käme); bis dahin liest die App sie weiterhin per Fallback aus dem
Backup-Bucket. Erlaubt sind JPEG/PNG/WebP/GIF bis 5 MB pro Datei;
Hochladen/Löschen darf, wer den jeweiligen Inhalt auch sonst bearbeiten darf
(bei Charakteren/Missionslogs nur der Owner, bei Missionen/Archiv-Einträgen
zusätzlich jeder Admin). Die vorhandenen Galerie-Bilder werden weiterhin über
die sichtbarkeitsgeprüfte Route `/api/content-images/[id]` ausgeliefert (die
jetzt aus dem Asset-Bucket liest); neu am Asset-Bucket hängende Assets
(hochgeladenes Charakter-Portrait bei der Anlage, Charakterbögen) nutzen die
direkte öffentliche URL (`R2_ASSET_PUBLIC_BASE_URL`). Bei Charakteren lässt
sich eines der hochgeladenen Bilder als Profilbild festlegen
(`characters.portrait`); das Portrait öffnet per Klick ein Karussell über
alle hochgeladenen Bilder. Bei Missionen, Missionslogs und
Archiv-Einträgen lässt sich stattdessen ein bereits hochgeladenes Bild direkt
aus der Markdown-Editor-Toolbar heraus als `![Bild](...)` in den Text
einfügen. Wird der zugehörige Inhalt endgültig gelöscht (Papierkorb-Purge
oder Admin-Direktlöschung), räumt `purgeContentImagesFor()`
(`src/lib/purgeContent.ts`) automatisch auch dessen Bilder samt R2-Objekten
mit auf — bleibt das aus (z. B. bei einem Fehler), tauchen verwaiste Bilder
weiterhin in der Admin-Übersicht `/admin/content/images` (Adminbereich →
"Bilder") auf, die alle hochgeladenen Bilder über alle Inhalte hinweg mit
Vorschau zeigt und pro Bild einen Admin-Löschen-Button unabhängig vom
jeweiligen Owner bietet.

### Charakterbögen (PDFs)

Charaktere können zusätzlich beliebig viele **Charakterbögen** als PDF haben
(Tabelle `character_sheets`, siehe `src/lib/characterSheets.ts`). Die Bytes
liegen im Asset-Bucket unter dem Präfix
`character-sheets/<CharakterID>/<UUID>.pdf`; ausgeliefert werden sie – wie die
Galerie-Bilder – über eine **eigene Proxy-Route** `GET /api/character-sheets/<id>`
(nicht über die öffentliche Bucket-URL). Dadurch bleibt der Bucket privat (der
`r2_key` verlässt den Server nie), die Auslieferung hängt nicht an einer korrekt
konfigurierten öffentlichen Asset-Domain, und die Route prüft die Sichtbarkeit
serverseitig (`canView` **und** `canViewDraft` auf dem Charakter). Auf der
Charakterseite erscheinen die Bögen als Liste: ein Klick öffnet eine
**Vollbild-PDF-Vorschau** (Modal, eingebettetes `<iframe>` — dafür erlaubt die
CSP `frame-ancestors 'self'`), daneben gibt es einen **Herunterladen**-Knopf
(`?download=1`, `Content-Disposition: attachment`). Auch die Bogen-_Liste_
(Dateinamen/Größen) folgt der Charakter-Sichtbarkeit inkl. Entwurf-Gate
(`getCharacterSheetsAction` → `canView` + `canViewDraft`). Hochladen und Löschen
darf nur der Owner des Charakters (dieselbe Owner-only-Regel wie bei den
Charakter-Bildern, kein Admin-Bypass); erlaubt sind nur PDFs bis 20 MB. Wird der
Charakter endgültig gelöscht, entfernt `purgeCharacterSheetsFor()`
(`src/lib/purgeContent.ts`) die Bögen samt R2-Objekten, bevor der
`ON DELETE CASCADE` die DB-Zeilen wegräumt.

### Archiv-Assistent (RAG)

Der Archiv-Assistent (`/rag` sowie eingebettet unter der Volltextsuche auf
`/search`) beantwortet Fragen zum Kampagneninhalt auf Basis des vorhandenen
Datenbestands — ein klassisches **RAG** (Retrieval-Augmented Generation):

1. **Embeddings & Index.** Jeder Inhalt (Charaktere, Missionen, Mission-Logs,
   Archiv-Einträge und abgeschlossene Gespräche) wird typabhängig in Chunks
   zerlegt (`src/lib/embeddings.ts`), per **OpenAI** `text-embedding-3-small`
   (volle 1536 Dimensionen) eingebettet und in der Tabelle
   **`content_embeddings`** (Extension **pgvector**) abgelegt. RBAC-Felder
   (`visibility`/`owner_id`/`is_draft`/`is_active`) sind auf der Embedding-Zeile
   **denormalisiert**, damit die Suche ohne Join filtern kann (gleiche Logik wie
   `canView()`). Die Vektoren werden als `'[…]'::vector`-Literal inline gecastet
   (kein pgvector-npm-Paket, `prepare:false`-kompatibel).
2. **Aktualisierung.** Content-Mutationen (Anlegen/Bearbeiten/Sichtbarkeit/
   Owner/Soft-Delete/Restore) stoßen ein **Fire-and-forget**-Re-Embedding an
   (`src/lib/embeddingSync.ts`) — ohne `OPENAI_API_KEY` still übersprungen. Der
   endgültige Purge räumt `content_embeddings` mit ab.
3. **Retrieval.** Die Frage wird eingebettet und **hybrid** gesucht
   (`src/lib/rag.ts`): semantische Vektorsuche (Cosine-Distance `<=>`) **plus**
   lexikalische Keyword-/Trigramm-Suche (`ILIKE`/`similarity()`, pg_trgm) — beide
   mit demselben RBAC-Vorfilter, dedupliziert, Vektortreffer zuerst.
4. **Generierung.** Aus System-Prompt + Kontext-Chunks + Frage streamt
   **Cloudflare Workers AI** (Open-Weight-LLM, Default
   `@cf/meta/llama-3.3-70b-instruct-fp8-fast`) die Antwort per SSE an den Client
   (`src/app/api/rag/route.ts` → `src/app/rag/`), inklusive Quellen-Links.

**Einrichtung:**

- **Rechte:** Der Assistent ist an das Recht `rag.use` gebunden (standardmäßig
  bei allen eingeloggten Rollen außer Gast). Anonyme werden auf `/login`
  geleitet.
- **Env-Variablen:** `OPENAI_API_KEY` (Embeddings) und `CLOUDFLARE_AI_API_TOKEN`
  (Workers-AI-Token). Die Cloudflare-Account-ID wird aus dem bereits fürs R2
  gesetzten **`R2_ACCOUNT_ID`** gelesen (Fallback), `CLOUDFLARE_ACCOUNT_ID` ist
  optional. Optional `CLOUDFLARE_AI_MODEL` zum Modellwechsel. Fehlen die
  Schlüssel, meldet `/rag` „nicht konfiguriert".
- **Migration:** Einmalig `scripts/migrate-pr54.sql` gegen die Produktions-DB
  ausführen (aktiviert `CREATE EXTENSION vector`, legt `content_embeddings` an
  und zieht das Recht `rag.use` für die Bestands-Rollen nach). Beim Umstieg auf
  1536 Dimensionen zusätzlich `scripts/migrate-pr58.sql` ausführen (typisiert die
  `embedding`-Spalte um; verwirft die alten 512er-Vektoren) und anschließend neu
  backfillen.
- **Backfill:** Einmalig `npm run embed:all` (oder der Admin-Knopf
  „Embeddings" unter `/admin/rag`) baut den Index für alle Inhalte auf;
  idempotent und nach Inhalts-/Chunking-Änderungen wiederholbar. Unter
  `/admin/rag` zeigt außerdem ein Panel die aktuelle OpenAI-Nutzung (Kosten des
  laufenden Monats, best-effort das Restguthaben).

**Kosten:** Initial-Embedding des kleinen Fan-Archivs < 0,10 $; Workers AI läuft
für das erwartete Fragevolumen voraussichtlich im Free Tier.

### Dev-/Preview-Umgebung

Netlify Deploy-Previews (ein Build pro PR) laufen standardmäßig gegen
dieselbe `DATABASE_URL` wie Production — jede PR, die das Schema ändert,
riskiert damit entweder einen kaputten Preview-Build (Schema noch nicht
migriert) oder eine versehentliche Migration gegen Live-Daten. Der Code
selbst ist environment-agnostisch (`src/lib/db.ts` und alle
`scripts/ingest/*.ts` lesen nur `DATABASE_URL`/`DIRECT_DATABASE_URL` aus der
Umgebung, ohne jede Verzweigung) — eine zweite, isolierte DB einzurichten
ist deshalb reine Konfiguration, kein Code-Change.

**1. Zweite Postgres-Instanz anlegen.** Bei Railway: im Projekt ein
zweites **Environment** anlegen (z.B. `dev`, neben `production`) und dort
einen eigenen Postgres-Service erzeugen — Railways eingebautes Feature für
genau diesen Zweck, optional als Klon der aktuellen Produktionsdaten
startbar. Die **öffentliche** Connection-URL verwenden (nicht die interne
private-network-URL) — nur die ist von außerhalb Railways erreichbar, z.B.
von Netlifys Build-Runnern.

**2. Netlify auf zwei DBs aufteilen** (Netlify-Dashboard, nicht
`netlify.toml` — dort dürfen keine Secrets landen):

- Bestehende `DATABASE_URL` auf Scope **„Production"** einschränken
  (vermutlich aktuell „All contexts").
- Neue `DATABASE_URL` mit Scope **„Deploy previews"** hinzufügen, Wert =
  öffentliche Connection-URL der neuen Dev-DB aus Schritt 1.
  `DIRECT_DATABASE_URL` wird von Next.js selbst nicht gelesen (nur von den
  Ingest-Skripten, die nie auf Netlify laufen) — dort ist nichts zu tun.

**3. Lokal gegen die Dev-DB arbeiten.** `.env.dev` anlegen (Vorlage
[`.env.example`](.env.example)) mit der Connection-URL aus Schritt 1, dann
`npm run db:setup:dev` und `npm run db:ingest:dev` statt der `:local`-Pendants.
Vor einer Schema-ändernden PR erst `db:setup:dev` gegen die Dev-DB laufen
lassen, um die Migration risikofrei zu proben — der eigentliche
Migrationsschritt gegen Production bleibt weiterhin manuell (siehe oben).

> **Hinweis:** Deploy-Previews bauen bei jedem Push neu (Inhalte werden zur
> Build-Zeit statisch gerendert) — nach einem Ingest in die Dev-DB reicht ein
> neuer Push bzw. Re-Deploy, um aktualisierte Inhalte in der Preview zu sehen.
> Eine Revalidation-Verkabelung für die (pro PR wechselnde) Preview-URL ist
> dafür nicht nötig.

### Versionsnummer & DB-Migrationen

Die App zeigt im Footer eine feste Versionsnummer (`v<Major>.<Minor>.<Sub>`,
sichtbar in der roten Leiste neben „Impressum"/„Datenschutz") als
String-Konstante in [`src/lib/version.ts`](src/lib/version.ts). Das Schema:
die **Major**-Version wird nur von Hand erhöht; die **Minor**-Version steigt mit
jedem geöffneten Pull Request (Reset auf 0 bei neuer Major-Version); die
**Sub**-Version steigt mit jedem Commit im selben PR (Reset auf 0 bei neuem PR).
Passend dazu bekommt jede Version genau einen Eintrag im öffentlichen Changelog
([`src/lib/changelog.ts`](src/lib/changelog.ts) → `/changelog`).

**DB-Migrationen:** `scripts/schema.sql` bleibt idempotent und **datenfrei**
(nur `CREATE TABLE/INDEX IF NOT EXISTS` und additive `ALTER … IF NOT EXISTS`,
keine datenverändernden `UPDATE`s — ein solcher Schritt hat historisch einen
Rollen-Hochstufungs-Bug verursacht). Datenverändernde bzw. einmalige Schritte
(Backfills, Seeds, Constraint-Wechsel) liegen pro Pull Request in einer eigenen
`scripts/migrate-pr<NN>.sql`, die nach dem Merge einmalig gegen die Produktions-
DB ausgeführt wird.

Nach `scripts/migrate-pr62.sql` einmalig `npm run db:seed-talents` ausführen —
das füllt den neuen Talent-Katalog; ein zweiter Lauf ändert nichts und
überschreibt keine Anpassungen der Spielleitung.

---

## 📄 Lizenz

Privates Projekt. _Star Trek_ und _LCARS_ sind Marken von CBS Studios Inc.
Dieses Fan-Projekt steht in keiner Verbindung zu den Rechteinhabern.

---

<p align="center"><em>„Live long and prosper.“ 🖖</em></p>
