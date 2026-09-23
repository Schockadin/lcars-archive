# 🖖 Neo Archive — LCARS Archive

Eine webbasierte Kampagnen-Datenbank für eine Sci-Fi-Rollenspielrunde, gestaltet im
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
  Besucher:innen der geschützten Bereiche (`/user`, `/admin`, `/gm`) **vor**
  dem Rendern auf `/login` — eine schnelle, **optimistische** Vorfilterung, die
  nur die Signatur/Ablauf des Session-Cookies prüft (kein DB-Zugriff, gemäß
  Next.js-Empfehlung). Die **verbindliche** Zugriffskontrolle (Rollen/Rechte,
  `is_active`, `session_version`) bleibt in der Data Access Layer
  (`src/lib/dal.ts`) und in jeder Seite/Server-Action (Defense in Depth). Die
  reine Krypto-/Token-Logik teilen sich Proxy und Session-Verwaltung über
  `src/lib/sessionToken.ts`.
- **Versionshistorie** — beim Bearbeiten von Charakteren, Missionen, Logbüchern
  und Datenbank-Einträgen wird vor jedem Überschreiben der bisherige Text in
  `content_revisions` abgelegt (Titel + `source_md`, die jüngsten
  `REVISION_KEEP` je Inhalt). Der Bereich „Versionen“ auf der jeweiligen
  Bearbeiten-Seite zeigt sie mit Datum, bearbeitender Person und Vorschau und
  holt eine Fassung per Server Action zurück (`src/lib/contentRevisions.ts`,
  `src/app/actions/revisions.ts`, `src/app/_shared/RevisionsPanel.tsx`).
  Wiederhergestellt wird nur der Fließtext; der ersetzte Stand landet selbst
  wieder in der Historie. Ein Speichern ohne Textänderung legt keine Fassung an.
- **Markdown in allen Freitextfeldern** — der `MarkdownEditor` (Toolbar +
  Rohtext/Vorschau) steht nicht nur an den Content-Formularen, sondern auch an
  Notizen, eigenen Regeln, Talent- und Schwerpunkt-Beschreibungen,
  Session-Notizen, der Notiz eines angekündigten Spieltermins, der
  Beschreibung eines von Hand eingetragenen Chronologie-Ereignisses und den
  Gesprächs-Formularen; sein `rows`-Prop setzt die
  Höhe in Zeilen statt in Pixeln (Notizen und Regeln: 10). Die zugehörigen
  Datenzugriffe liefern neben dem Rohtext ein gerendertes `*Html`-Feld
  (`listNotes`, `listCampaignRules`, `listTalents`, `listFocuses`,
  `listGameSessions`, `listUpcomingSessions`; in der Chronologie trägt nur das
  von Hand eingetragene Ereignis ein `detailHtml` — die übrigen
  Beschreibungen sind generierte Sätze) — das Formular arbeitet auf dem Rohtext, die Anzeige auf
  dem HTML. Im PDF gibt es kein HTML, dort zerlegt `toPdfBlocks` denselben
  Rohtext (wie beim Biografie-Blatt). Die Kataloge sind gecacht, das Rendern
  passiert also einmal je Cache-Generation.
  **Bewusst ohne Markdown** bleiben drei Stellen, an denen der Text eine
  andere Bedeutung hat: die Listenfelder des Charakterbogens (`TEXTAREA_LISTS`
  — eine Zeile je Eintrag), die Feldwerte in `RowDetailModal`/
  `DbTableExplorer` (rohe Spaltenwerte) und die Zusammenfassung im
  Markdown-Import (reiner Text).
- **Notizen & Kommentare** — an Charakteren, Missionen, Logbüchern und
  Datenbank-Einträgen können eingeloggte Personen Notizen hinterlegen: mit
  Sichtbarkeit `private` (nur der Autor, auch für die Moderation unsichtbar)
  oder `group` (alle Angemeldeten, als Diskussion am Eintrag). Beides liegt in
  einer Tabelle `content_notes`, verknüpft über `(content_type, content_slug)`
  wie `content_follows`; Datenzugriff in `src/lib/contentNotes.ts`, das
  Client-Panel in `src/app/_shared/NotesPanel.tsx`. Gruppen-Notizen darf
  zusätzlich `content.moderate` löschen, private nie; beim endgültigen Löschen
  eines Inhalts räumt `purgeContent.ts` sie mit ab.
- **„Meine Inhalte" als eine Liste** (`/user/content`) — Abschnittsüberschrift
  je Kategorie, Schiene, Karte: derselbe Aufbau wie Chronologie und Datenbank
  (`ChronoRow`/`ChronoCard`), statt fünf einzeln aufklappbarer `LcarsDataRow`s.
  Vorgabe ist die Sortierung nach Kategorie (Berichte → Gespräche →
  Datenbank-Einträge → Missionen), alternativ alphabetisch über alles; Entwürfe
  stehen in ihrer Kategorie, tragen die Entwurfs-Farbe und lassen sich über den
  Kategorie-Filter „Nur Entwürfe" zusammen ansehen (vorher eine sechste
  Klappe darüber). Die Anlegen-Knöpfe darüber öffnen ihr Formular in einem
  Fenster (`NewContentButtons.tsx`), statt auf eine eigene Seite zu führen.
- **Eigene Inhalte** — eingeloggte User legen eigene Charaktere, Einsatzberichte,
  Datenbank-Einträge und Gespräche zwischen Charakteren an — jeweils als
  **Entwurf** oder **veröffentlicht** (umstellbar direkt in der Liste) — und
  einem persönlichen Dashboard (farbcodierter News-Feed,
  offene Gespräche, Lesezeichen/Abos). Gespräche können bereits bei der
  Erstellung mehr als einen Gesprächspartner haben (Mehrfachauswahl) und
  jederzeit auch danach um weitere Teilnehmende erweitert werden
  (Direkt-Hinzufügen durch den Owner samt Info-Mail); haben mehr als zwei
  Teilnehmende, muss man sich das Antwortrecht
  erst per Button für zwei Stunden reservieren, mit Sperr-Anzeige und
  optionaler Mail/Push-Benachrichtigung, sobald die Sperre wieder endet.
  **Die Suche kennt dieselbe Schranke:** Nachrichten eines LAUFENDEN Gesprächs
  liefert `searchFull` nur an Beteiligte und an `gm.access`
  (`openDialogueVisibleSql` in `src/lib/search.ts`, Teilnehmer-Regel wie
  `participantSpeakerRows` in `dialoguesCore.ts`). Ohne diese Bedingung gab
  die ohne Anmeldung erreichbare Volltextsuche den Wortlaut laufender
  Gespräche samt Sprecher und Sprungmarke an jede Person heraus, die danach
  suchte — die Abfrage der EINTRÄGE schloss offene Gespräche seit jeher aus,
  für die Nachrichten war es übersehen worden. Abgeschlossene Gespräche sind
  gewöhnliche Einträge und bleiben für alle auffindbar. Dieselbe Regel gilt im
  RAG-Index (`embeddingSync.ts` nimmt nur `dialogue_open = FALSE`) und in der
  Chronologie (`timeline.ts`).
  Offene Gespräche aktualisieren sich dabei automatisch per Polling (alle
  8 Sekunden, pausiert bei nicht sichtbarem Tab) — neue Nachrichten und
  Sperr-Status-Änderungen erscheinen ohne manuelles Neuladen der Seite. Jede
  Nachrichtenkarte eines **laufenden** Gesprächs trägt neben dem Sprechernamen
  ihren Zeitstempel (`formatDateTimeShort`, fest auf `Europe/Berlin` — Server-
  Render und Hydration liefern denselben String); abgeschlossene Gespräche
  bleiben ohne, dort ist der Verlauf ein zusammenhängender Lesetext. Das
  **Antwortfeld klebt am unteren Rand** der Inhaltsfläche
  (`.dialogue-reply-dock`, `position: sticky` — gescrollt wird
  `.lcars-main-content`, nicht das Fenster, deshalb kein `fixed`). Kleben kann
  es nur, solange sein umschließender Block im Bild ist: `.dialogue-play`
  umfasst deshalb Verlauf UND Feld. Den Sprung ans Verlaufsende beim Öffnen
  macht darum `DialogueLiveView` statt wie früher `DialogueThread` — er muss
  die Höhe des Felds als `scroll-margin-bottom` freihalten, sonst läge die
  letzte Nachricht ausgerechnet danach darunter. Die **Checkbox „Feld
  angeheftet"** im Kasten schaltet das Kleben ab
  (`.dialogue-reply-dock--loose`); die Wahl liegt im `localStorage`
  (`src/lib/replyDockPreference.ts`), nicht am Konto — sie gilt dem Layout
  des jeweiligen Geräts, und eine Spalte in `users` verlangte eine Migration
  gegen dieselbe Datenbank, an der auch die Deploy-Preview hängt. Der Haken
  trägt `data-no-draft`, sonst schriebe ihn die Entwurfs-Sicherung mit.
- **Gespräche mit NPCs** — Gesprächspartner kann auch ein **NPC** sein. Ein NPC
  ist **kein Charakter**, sondern ein **Datenbank-Eintrag der Kategorie `npc`**
  (`archive_entries.category = 'npc'`, siehe `getNpcOptions`). Wer im Gespräch
  spricht, hält deshalb überall ein `DialogueSpeaker`
  (`src/lib/dialogueSpeaker.ts`) fest: `{ kind: "character" | "npc", id }`, in
  Formularen als Schlüssel `c12`/`n7` kodiert, damit die IDs beider Quellen
  nicht kollidieren. `dialogue_messages` hat entsprechend zwei
  Sprecher-Spalten (`character_id` **oder** `npc_entry_id`, beide nullable).
  Für einen NPC schreibt in genau diesem Gespräch ein Konto, das NPCs spielen
  darf (`canPlayNpcs` = `gm.access` **oder** `admin.access` — in kleinen Runden
  ist das dasselbe Konto); wer das ist, hält die Tabelle
  `dialogue_npc_speakers` fest (Gespräch + NPC-Eintrag → Konto). Beim Anlegen
  wählt die Spieler:in die Spielleitung aus, sofern es mehr als eine gibt —
  bei genau einer entfällt die Wahl, und wer NPCs selbst spielt, wird ohne
  Rückfrage ihr Sprecher. Umgekehrt kann die Spielleitung ein Gespräch **aus
  Sicht eines NPC** beginnen (der NPC steht dann in „Dein Charakter") und
  spielt ihn selbst. Für alles Weitere — Antworten, Auswahl beim Antworten,
  Abschließen, Export, Benachrichtigungen, „Deine Gespräche" — zählt ein so
  zugeordneter NPC wie ein eigener Charakter: `getDialogueParticipantCharacters`
  und `getDialogueParticipant` liefern ihn mit, aber nur in dem Gespräch, für
  das die Zuordnung gilt. In `metadata.participants` steht er als
  `kind: "archive"` und verlinkt damit nach `/archive/<slug>` statt
  `/characters/<slug>`. Welche NPCs jemand angeboten bekommt, entscheidet die
  normale Sichtbarkeitsregel (`canView` mit dem `owner_user_id` des Eintrags):
  veröffentlichte alle, Entwürfe nur die eigene Person bzw. `content.view_all`.
  Auch **nachträglich** lassen sich NPCs in ein laufendes Gespräch holen, und
  zwar von jedem Owner — nicht nur von der Spielleitung (bis v1.37 war das der
  Fall; wer später einen NPC brauchte, musste das Gespräch neu beginnen). Die
  Sprecher-Frage läuft dabei wie beim Anlegen: Wer NPCs selbst spielt, wird ihr
  Sprecher; alle anderen benennen ein Spielleitungs-Konto, und steht für dieses
  Gespräch schon eines fest (`getDialogueNpcSpeakerUserId`), bleibt es dabei —
  ein Gespräch hat immer höchstens EIN NPC-sprechendes Konto. Die Wahl aus dem
  Formular wird nie blind übernommen, sondern gegen `listGmUsers` geprüft.
- **NPCs anlegen** — unter „Meine Inhalte" gibt es für **jedes eingeloggte
  Konto** den Knopf **„Neuer NPC"** (`/user/archive/new?category=npc`). Das ist
  das normale Datenbank-Formular mit vorgewählter Kategorie „NPC"; der Eintrag
  lässt sich danach wie jeder andere Datenbank-Eintrag bearbeiten. An keine
  Rolle geknüpft, genau wie das Formular selbst (`requireOwnUser`, keine
  Kategorie-Prüfung in `contentAction.ts`) — ein NPC ist kein eigener Inhalt,
  sondern Kampagnen-Inventar. Wer einen NPC im Gespräch **spielen** darf, ist
  davon unabhängig und richtet sich weiterhin nach `canPlayNpcs`.
  Der Knopf **„Neuer Charakter"** steht dort nicht mehr: eigene Charaktere
  haben mit `/user/characters` ihren eigenen Bereich, und dort legt man sie an.
- **Eigene Charaktere & Charakterwerte** — den Punkt „Charaktere"
  (`/user/characters`) im Profil-Menü bekommt, wer dort etwas zu tun hat: wer
  mindestens einen verknüpften Charakter hat **oder** das Recht
  `content.create` besitzt (bei der Rolle „Spieler" der Normalfall). Dahinter
  die Übersicht aller eigenen Charaktere (inkl. Entwürfe) mit Veröffentlichen,
  Öffnen, Löschen und dem Anlegen weiterer.

  Das zweite Kriterium kam mit v1.38.5 dazu und schließt eine Sackgasse: Der
  Punkt hing allein an „hat schon eine Akte", und seit „Neuer Charakter" aus
  „Meine Inhalte" nach `/user/characters` ausgezogen ist, führte für eine
  Spieler-Rolle **ohne** Akte kein Menüweg mehr zum Anlege-Assistenten — nur
  noch die Einstiegs-Liste auf `/willkommen` bzw. dem Dashboard und der Knopf
  auf der öffentlichen Charakterliste. Geprüft wird wie überall das Recht,
  nicht die Primärrolle; serverseitig maßgeblich bleibt
  `createCharacterWizardAction`.
- **Anlegen als Assistent** (`/user/characters/new`) — vier Schritte:
  Stammdaten, Werte, Biografie, Vorschau. Alle vier liegen in **einem**
  Formular und bleiben im DOM (nur ausgeblendet): das Blättern verliert keine
  Eingabe, und am Ende schickt ein einziger Submit alles zusammen ab
  (`createCharacterWizardAction` legt Akte und Werte in derselben `INSERT`).
  Vor „Fertig" ist nichts gespeichert — ein abgebrochener Assistent
  hinterlässt keinen halben Charakter. Pflichtfelder tragen bewusst **kein**
  `required`: ein verstecktes Pflichtfeld kann der Browser nicht anspringen und
  bricht das Abschicken wortlos ab; geprüft wird beim Blättern und verbindlich
  in der Action.
- **Werte-Editor aus normalen Bedienelementen**
  (`_shared/CharacterValuesEditor.tsx`) — Attribute und Disziplinen als
  Zahlenkästen mit laufender Budget-Anzeige, Talente über den Katalog, alles
  Weitere als gepflegte Listen. Kontrolliert: der Wertestand liegt beim
  Aufrufer, damit Budget-Anzeige, Vorschau und das abschickende Formular
  denselben Stand sehen. Abgeschickt wird er als **ein** JSON-Feld
  (`statsJson`) statt als vierzig Einzelfelder; `parseStatsPayload`
  (`src/lib/characterStatsPayload.ts`) normalisiert ihn und meldet dabei jede
  Zahl außerhalb ihres Bereichs mit Feldnamen, statt sie stillschweigend zu
  verwerfen. Gepflegt werden: Personalakte (Pronomen, Rolle, Zuweisung,
  Herkunft, Erziehung, Laufbahn, Erfahrung, Merkmale), sechs Attribute und
  sechs Disziplinen, Protection/Determination/Reputation/Stress-Bonus sowie die
  Listenfelder (Werte, Schwerpunkte, Talente, Spezies-Fähigkeiten,
  Sonderregeln, Angriffe, Ausrüstung, Hobbys, Karriere-Ereignisse).
- **Die eigene Charakterseite** (`/user/characters/[id]`) — Stammdaten, Werte
  und Biografie als **Panels untereinander** statt getrennter Seiten mit
  Umschalter. Stammdaten und Biografie haben je einen Stift-Knopf und werden an
  Ort und Stelle bearbeitet; jedes Panel speichert nur seinen Teil
  (`_shared/panelActions.ts`) und übernimmt den Rest aus dem gespeicherten
  Stand — `updateOwnCharacterContent` schreibt die Akte immer vollständig, ein
  weggelassenes Feld würde sonst geleert. Die alten Adressen
  `/user/characters/[id]/stats` und `.../edit` leiten auf diese Seite um.
- **Der Bogen ist Vorschau, kein Formular** — der Knopf „Charakterbogen" über
  den Panels öffnet ihn als **vier Blätter**
  (`src/components/character/CharacterSheetPreview.tsx`): das gedruckte
  „Personnel File" als 816×1056-Blatt
  (`public/character-sheet/personnel-file.svg`, Maße in
  `personnelFileLayout.ts`, Optik in
  `src/styles/lcars-components/personnel-file.css`; jedes Maß ein Vielfaches
  von `--pf-unit` = 1px der Vorlage, sodass der Bogen in einer schmaleren
  Spalte als Ganzes schrumpft statt umzubrechen), dahinter der Spickzettel
  (Talente), das Regelblatt und die Biografie im selben Papier-Look. Im Fenster stehen
  „Drucken" (Browser-Druck, das Druck-CSS blendet alles außer den Blättern aus
  und beginnt jedes auf einer neuen Seite) und „Speichern" (derselbe
  PDF-Export, damit die Datei unabhängig vom Browser gleich aussieht).
- Für die Zahlenwerte gelten die Regeln der Runde: Attribute 7–12 mit höchstens
  einem Wert auf 12 und zwei auf 11, Disziplinen 1–5 mit höchstens einem auf 5
  und zwei auf 4 (zentral in `src/lib/characterStats.ts`, im Editor als
  Live-Hinweis, verbindlich in der Server-Action; die gemeinsamen Prüfungen
  beider Wege stehen DB-frei in `src/lib/characterStatsRules.ts`). Der maximale
  Stress ist kein Eingabefeld, sondern ergibt sich aus Fitness + Bonus aus
  Talenten (der Bonus wird gepflegt, da er sich aus dem Freitext der Talente
  nicht verlässlich ableiten lässt). Gespeichert werden die Werte als
  `characters.metadata.stats` (jsonb, keine eigene Tabelle) — Name, Rang und
  Spezies bleiben Teil der Akte selbst. Charaktere erscheinen deshalb nicht
  mehr in „Meine Inhalte" (`/user/content`); der Charakter-Filter für
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
  Transaktion. Festgeschrieben wird dabei ausschließlich der **gespeicherte**
  Stand: `lockOwnCharacterCreation` lehnt ein überzogenes Budget
  (`CreationOverBudgetError`) und einen noch lückenhaften Bogen
  (`CreationIncompleteError`, siehe `hasCompleteCreationValues`) ab. Ohne
  diese beiden Prüfungen hinterließe ein direkt abgeschickter POST einen
  dauerhaft überzogenen bzw. leeren Bogen — nach dem Festschreiben sind die
  Felder schreibgeschützt, und `checkAdvancement` steigert keinen leeren Wert.
  **Zurücksetzen:** Die Spielleitung kann eine abgeschlossene Erschaffung unter
  `/gm/characters` wieder öffnen (`reopenCharacterCreation`, Recht
  `characters.assign`). Dabei werden alle Steigerungen seit dem Festschreiben
  zurückgenommen — die reine Logik dazu liegt in `src/lib/creationReset.ts`:
  `revertAdvancements` läuft das Journal rückwärts (neueste Buchung zuerst) und
  liest aus dem Klartext jeder Buchung („Control 9 → 10", Talent-/
  Schwerpunktname) Ziel und Vorzustand zurück. Die Werte fallen damit auf den
  Stand der Erschaffung, die ausgegebenen AP werden gutgeschrieben und der
  damals übertragene Erschaffungsrest zurückgebucht (Buchungsgrund `reset`).
  Verloren geht dabei nichts: Was zurückgenommen wurde, steht als
  `metadata.stats.pendingAdvancements` am Charakter und wird vom erneuten
  `lockOwnCharacterCreation` über `reapplyAdvancements` automatisch wieder
  angewandt — in der ursprünglichen Reihenfolge, aber mit den dann geltenden
  Regeln und derselben Prüfung wie beim Steigern; was nicht mehr passt, wird in
  der Rückmeldung mit Grund genannt. Rücknahme, Notiz und Gegenbuchungen laufen
  wie das Festschreiben in EINER Transaktion.
- **Eigene Regeln der Runde** — Hausregeln (Name, Regeltext, `sort_order`)
  liegen in `campaign_rules`, gepflegt unter `/gm/rules`, und erscheinen auf
  dem Spickzettel jedes Charakterbogens hinter den Kernregeln — in der
  Bildschirm-Vorschau wie im PDF. Anders als Talente und Schwerpunkte hängen
  sie an keinem Charakter, deshalb ist auch jede Regel löschbar: sie steht auf
  keinem Bogen als Eintrag. Validierung und Sortierung liegen in
  `src/lib/campaignRuleTypes.ts` (ohne `server-only`, damit die Vorschau sie
  nutzen kann), der DB-Zugriff mit eigenem Cache-Tag in
  `src/lib/campaignRules.ts`.
- **„Wer kennt wen"** — auf jeder Personalakte steht unter dem Inhalt, mit
  wem die Figur zu tun hat (`getRelationsOf` in `src/lib/relations.ts`,
  angezeigt von `src/app/_shared/RelationsSection.tsx`). Drei Quellen:
  gemeinsame Missionen, gemeinsame Gespräche und **Verlinkungen** — die
  `[[Wikilinks]]` im `source_md` von Charakteren und NPC-Einträgen sowie die
  Verweisfelder eines NPC-Eintrags auf Charaktere (`metadata.characters`),
  gerichtet erfasst, aber für die Beziehung in beide Richtungen gezählt
  (`loadLinks`/`collectLinkEdges`). Gelesen wird nur `source_md`, nie
  `bio`/`content`: dort stehen die Links schon aufgelöst als HTML. Zu jeder
  Verbindung steht, woraus sie stammt — eine bloße Namensliste ohne
  Begründung wäre schwer einzuordnen.

  Bis v1.37 stand daneben ein **Beziehungsgraph** der ganzen Kampagne unter
  `/characters/beziehungen` (Kreis-Layout als Inline-SVG, im Browser
  filterbar). Er ist mit v1.38 ersatzlos entfallen: Bei der Figurenzahl
  dieser Runde war das Bild vor allem voll, und was darin zu erkennen war,
  stand ohnehin genauer in „Wer kennt wen". Eine tragfähigere Darstellung
  kann später an seine Stelle treten. Mit ihm entfiel auch die Abfrage der
  `archive_links` zwischen zwei NPC-Einträgen in `loadLinks`: sie speiste
  ausschließlich den Graphen — `getRelationsOf` behält nur Paare, an denen
  die betrachtete Figur hängt, und ein NPC-NPC-Paar konnte darin nie
  auftauchen.
- **Schwerpunkt-Katalog** — Focuses liegen wie die Talente in einer eigenen
  Tabelle (`focuses`: Name, Disziplin, optionale Erläuterung, `is_custom`),
  gepflegt unter `/gm/focuses`. `UNIQUE (name, discipline)` statt nur über den
  Namen: sechs Schwerpunkte führt der Regeltext in ZWEI Disziplinen
  (`Astrophysics` bei Conn und Science, `Survival` bei Conn und Security, …).
  Auf dem Bogen steht nur der Name — dort sind das dieselben, und alles, was
  „schon eingetragen" prüft, vergleicht deshalb über den Namen (`focusKey` in
  `src/lib/focusCatalog.ts`); die Auswahlliste fasst sie zu einer Zeile mit
  beiden Disziplinen zusammen. Startdaten: `scripts/seed/focuses.json` (170
  Einträge aus dem Regeltext), eingespielt mit `npm run db:seed-focuses`
  (idempotent). Auf dem Charakterbogen ersetzt `FocusPicker.tsx` (dasselbe
  Modal-Muster wie der `TalentPicker`, mit Suche und Disziplin-Filter) das
  freie Tippen — in der Ersterschaffung wie beim Steigern mit AP. Serverseitig
  prüfen `checkFocusesFromCatalog` (Speichern) und `advanceCharacterAction`
  (Steigern), dass ein Eintrag aus dem Katalog stammt; bereits gespeicherte
  Alt-Einträge aus der Freitext-Zeit bleiben erlaubt, und ein LEERER Katalog
  (Seed noch nicht gelaufen) hebt die Prüfung auf, statt jedes Speichern zu
  blockieren.
- **Talent-Katalog** — die Talente der Runde liegen in der Tabelle `talents`
  (Name eindeutig, Kategorie, Voraussetzung, Regeltext). Klammern sind im
  Namen nicht erlaubt: auf dem Bogen steht ein umbenanntes Talent als
  `Neuer Name (Originalname)` (siehe `formatTalentEntry`/`parseTalentEntry`),
  ein Katalogname mit Klammern wäre davon nicht zu unterscheiden und danach
  nicht mehr auswählbar — die Voraussetzung gehört ins eigene Feld. Startdaten:
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
  Ein **Spickzettel** listet die Talente des Charakters mit vollem
  Regeltext. Die **Kernregeln** für den Spieltisch — Momentum, Bedrohung und
  Entschlossenheit, übersetzt aus dem Regeltext der Runde — stehen auf einem
  **eigenen Blatt** dahinter, zusammen mit den **eigenen Regeln der Runde**
  aus `campaign_rules` (siehe oben; gibt es keine, fällt der Abschnitt weg).
  Getrennt, weil sie Verschiedenes sind: die Talente gehören diesem
  Charakter, die Regeln gelten für alle am Tisch — als eigenes Blatt lässt
  sich der Regelteil einmal ausdrucken und in die Mitte legen. Die Kernregeln
  liegen als Daten in `src/lib/coreRules.ts` statt als fertiges Markup, weil
  dieselbe Liste zweimal gerendert wird: in der Bildschirm-Vorschau und im
  PDF (`@react-pdf` kennt kein `<p>`, ein gemeinsames Markup ist also nicht
  möglich). Sie hängen an keinem Charakter und stehen deshalb nicht in der
  Datenbank.
- **Charakter-Ansichten mit Umschalter** — `/user/characters/[id]` leitet auf
  den Bogen weiter; ein Umschalter im gemeinsamen Layout
  (`[characterId]/layout.tsx` + `CharacterTabs.tsx`) wechselt zwischen
  Charakterbogen (`/stats`) und Stammdaten der Akte (`/edit`).
- **Vollbild und Stammdaten auf dem Bogen** — ein Icon-Knopf über dem Blatt
  zeigt den Bogen im Vollbild (`.pf-page--expanded`: `position: fixed` statt
  Portal oder Fullscreen-API, damit das Element im umgebenden `<form>` bleibt
  und die Felder weiter mitgespeichert werden; Escape schließt). Rang und
  Spezies kommen aus der Akte: der Rang steht schreibgeschützt in seinem
  Kasten, die Spezies teilt sich den Kasten „Species & Traits" mit dem
  Merkmals-Feld (`.pf-combo`).
- **Ein Bogen, zwei Wege** — `/user/characters/[id]` öffnet die Blätter
  als Overlay, `/characters/[slug]/sheet` (Lese-Ansicht für Owner und
  Spielleitung) zeigt dieselben Blätter als Seite; beide bieten Drucken
  und denselben PDF-Download. Vorher stand auf der Seite nur Blatt 1, während
  der Knopf daneben alle drei herunterlud. Das Druck-CSS greift für beide
  (`.pf-preview-overlay` und `.pf-preview-page`).
- **PDF-Export des Bogens** — `/api/export/character-sheet?characterId=…`
  liefert dieselben vier Blätter wie die Vorschau: den ausgefüllten Bogen, den
  Spickzettel (Talente), das Regelblatt und die Biografie. Für die
  Textblätter gibt es keine HTML-Fassung (`@react-pdf` kennt kein HTML); `src/lib/pdf/markdownBlocks.ts`
  zerlegt den Markdown-Quelltext deshalb in Überschriften, Absätze,
  Aufzählungen und Zitate und führt Inline-Auszeichnungen auf ihren Text
  zurück — für ein Textblatt genügt das, eine zweite Markdown-Pipeline im
  PDF-Pfad wäre mehr Maschinerie als der Zweck trägt. Wie der Content-Export
  mit `@react-pdf/renderer`
  (reines Node, kein Chromium — läuft auf Netlify Functions). Der Bogen ist
  816×1056 CSS-Pixel = 8,5×11 Zoll = das PDF-Format „Letter", die Maße aus
  `personnelFileLayout.ts` gelten deshalb unverändert mit Faktor 0,75 (px→pt).
  Die Grafik liegt als eingebettetes PNG bei (`personnelFileArt.ts`, aus dem
  SVG erzeugt), damit der Export weder Datei- noch Netzzugriff braucht.
- **Listen im Werte-Editor** — dasselbe Muster für alle: Einträge als Zeilen
  mit rotem Minus, „Hinzufügen" öffnet ein Fenster mit freiem Eingabefeld
  (`EntryAddModal.tsx`), Talente stattdessen den Katalog (`TalentPicker.tsx`).
  Spezies-Fähigkeiten und Sonderregeln bleiben bewusst Fließtext-Felder, dort
  stehen ganze Regelsätze statt Aufzählungen. Werte und Schwerpunkte zeigen ihr
  Freikontingent
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
  - `/gm/campaign` — Ingame-Jahr, AP-Vergabe, Missionsabschluss und
    Missions-Übersicht an einem Ort (`/gm/missions` bleibt als Direktlink auf
    die Einzelansicht erhalten).
  - `/gm/characters` — die Charakter-Verwaltung: Zuordnung der Figuren zu
    Konten und der Erschaffungs-Status samt „Erschaffung wieder öffnen“
    (siehe oben). Eigener Menüpunkt; die Zuordnung stand übergangsweise
    zusätzlich auf der Kampagnen-Seite und ist dort entfallen.
  - `/gm/dialogues` — alle offenen Gespräche, unabhängig von eigener
    Teilnahme; darunter `[slug]/edit` für die Metadaten (`dialogues.moderate`).
  - `/gm/gruppe` — das **Gruppenblatt**: alle aktiven, nicht als Entwurf
    markierten Charaktere mit Spieler:in in einer Tabelle — die sechs
    Attribute, die sechs Disziplinen sowie Schutz, Stress-Maximum und
    Entschlossenheit nebeneinander, darunter je Figur Talente, Schwerpunkte
    und Werte. Die Werte kommen aus derselben Quelle wie der Charakterbogen
    (`metadata->stats` über `parseCharacterStats`, Stress über
    `computeStress`), es gibt also keine zweite Rechenlogik
    (`src/lib/partySheet.ts`). Die Namensspalte bleibt beim seitlichen
    Scrollen stehen; ein **Klick auf den Namen** öffnet den vollständigen
    Charakterbogen im Fenster (dasselbe `CharacterSheetPreviewOverlay` wie
    unter „Meine Charaktere", samt Drucken und PDF — die Export-Route lässt
    `gm.access` ohnehin an jeden Bogen). Talent-Katalog und Hausregeln lädt die
    Seite einmal für alle Bögen, nicht je Zeile. Die Seite nutzt die **volle
    Breite** statt der 1100px-Spalte: bei fünfzehn Wertespalten ist jeder
    Deckel ein Scrollbalken.
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
    Logbuchs oder seiner ganzen Mission). Ein Logbuch hängt an genau EINER
    Session; zieht `setSessionLogbooks` eines aus einer anderen herüber, wird
    auch deren Gutschrift nachgezogen — Lösen, Zuordnen und Buchen laufen
    dafür in einer Transaktion. Eine eingetragene Session lässt sich
    **vollständig korrigieren** (Datum, Titel, AP-Beträge, Notizen,
    Teilnehmende): `updateGameSession` schreibt dabei die `session`- und
    `bonus`-Buchungen der Session neu statt sie fortzuschreiben und zieht die
    Logbuch-AP nach — alles in einer Transaktion, damit Session und Konten
    nie auseinanderlaufen. Bereits ausgegebene AP holt das nicht zurück, ein
    Konto kann dadurch rechnerisch ins Minus laufen.
  - **Missionsabschluss** (auf `/gm/campaign`) — AP für einen Missionsabschluss
    gibt es ausschließlich über die Missionsauswahl: die gewählte Mission wird
    dabei auf `completed` gesetzt und die Buchungen tragen
    `character_ap_entries.mission_id`. Vorbelegt ist der Betrag mit der Regel
    **„AP pro beendeter Mission"** (`apPerMission`, Standard 5) aus dem
    Regelwerk unter `/gm/ap`; im Einzelfall bleibt er überschreibbar. Der Grund „Mission" ist deshalb aus der
    freien Buchung entfernt (die Server-Action weist ihn ab).
  - `/gm/ap` — Kontostände aller Charaktere, das Gesamtjournal aller Buchungen
    (nach Charakter und Grund filterbar, serverseitig auf die letzten 500
    begrenzt) und der Editor des AP-Regelwerks.
  - `/gm/talents` — Talent-Katalog durchsuchen, filtern und bearbeiten sowie
    eigene Talente ergänzen. Löschbar sind nur selbst ergänzte Talente, damit
    keine Einträge unter bereits gepflegten Charakterbögen verschwinden.
  - `/gm/focuses` — dasselbe für den Schwerpunkt-Katalog (Suche,
    Disziplin-Filter, bearbeiten, ergänzen; löschbar nur selbst ergänzte).
  - `/gm/rules` — eigene Regeln der Runde für den Spickzettel (Name,
    Regeltext, Reihenfolge). Hier ist jede Regel löschbar.
- **Session-Planer** — die Spielleitung kündigt Termine an (`/gm/sessions`,
  Knopf „Termin ankündigen" über der Terminliste, Formular im Fenster), alle
  Angemeldeten sehen sie auf der Startseite und sagen zu oder ab. Der Zeitpunkt
  ist **ein** `datetime-local`-Feld (Datum und Uhrzeit gehören zusammen), und
  zu jedem Termin gehört eine **Besetzung** (`planned_session_characters`, alle
  aktiven Figuren vorausgewählt). Ist der Abend gespielt, macht der Knopf
  **„Session eintragen"** am Termin daraus in einem Schritt die Nachbuchung:
  ein Fenster fragt AP-Beträge, Notizen und die letzte Korrektur der Besetzung
  ab, legt die `game_sessions`-Zeile samt Gutschriften an und hängt sie über
  `planned_sessions.game_session_id` an den Termin. Der Termin bleibt stehen —
  er trägt die Zusagen —, verschwindet aber von der Startseite; wird die
  Session zurückgenommen, steht er per `ON DELETE SET NULL` wieder als offen
  da. Von Hand nachtragen lässt sich weiterhin alles, was ohne Ankündigung
  gespielt wurde: „Session nachtragen" darunter, zugeklappt.

  Zwei eigene Tabellen (`planned_sessions`,
  `planned_session_rsvps`): `game_sessions` ist die **Nachbuchung** einer
  gespielten Session mitsamt AP — ein Termin hat weder AP noch Gutschriften,
  und eine gespielte Session braucht keine Zusagen mehr. Wer nicht geantwortet
  hat, hat **keine Zeile**; „noch offen" ist damit die Abwesenheit einer
  Antwort und kein Wert, der gepflegt werden müsste. Auf der Startseite steht
  seit v1.38 nur noch, was **in der Zukunft liegt** (`listUpcomingSessions`:
  `scheduled_at > NOW()`); bis dahin galt eine Nachlauffrist von sechs
  Stunden, damit ein Abend nicht mitten im Spielen aus der Liste fällt — das
  Dashboard zeigte dadurch aber stundenlang einen längst begonnenen Abend samt
  Zusage-Knöpfen. Die Spielleitung sieht die vergangenen weiterhin über
  `listAllPlannedSessions` unter `/gm/sessions`. Eine zweite Antwort ersetzt
  die erste; eine verschobene Uhrzeit lässt die Zusagen stehen.

  Ein **neu angekündigter** Termin erreicht die Spielenden seiner eingeplanten
  Figuren per **Mail/Push** (`notifyPlannedSessionPlayers` in
  `src/app/actions/plannedSessions.ts`, Empfänger aus
  `getPlannedSessionPlayers`) — vorher stand er nur auf dem Dashboard und wurde
  entsprechend übersehen. Kein Opt-in nötig (wie bei einer neuen Mission mit
  eigener Figur), die globalen Schalter für Mail und Push gelten weiter. Je
  Person genau eine Nachricht, auch bei zwei eingeplanten Figuren; die
  ankündigende Person selbst bekommt keine. Nur für Termine in der Zukunft
  (`isUpcoming` in `plannedSessionFormat.ts`, rein und getestet): ein
  nachträglich festgehaltener Abend ist keine Ankündigung. Der Versand läuft
  sequentiell (Rate-Limit bei Resend) und lässt den Termin stehen, wenn eine
  Mail scheitert — der Fehler landet im Fehlerprotokoll, und die Rückmeldung im
  Formular nennt, wie viele Personen **tatsächlich** erreicht wurden. Die Zusage-Action prüft ihr
  Recht (`users.browse`, „Nicht-Gast") über **`checkPermission`**, nicht über
  `requireNonGuest`: das harte Gate ruft `forbidden()` auf, und ein
  Auth-Interrupt in einer über `useActionState` aufgerufenen Action wird zu
  einer **403-Antwort**, mit der der Client nichts anfangen kann („An
  unexpected response was received from the server"). Wem das Recht fehlt —
  in einer über `/admin/permissions` angepassten Rechte-Tabelle schnell
  passiert —, der bekommt jetzt einen Satz am Knopf; im Dashboard werden ihm
  die Knöpfe gar nicht erst angeboten.

  Bleibt es trotz gesetztem Recht bei einem **403**, kommt er nicht aus der
  App. Genau das war der Fall: In der Netlify-Umgebung scheiterte **allein**
  die Zu-/Absage reproduzierbar mit einem 403 auf dem POST — jede andere
  Aktion (auf `/gm`, `/user`, den Inhaltsseiten) lief unverändert, und lokal
  war es weder im Dev-Server noch gegen einen Produktions-Build nachzustellen.
  Das Verbindende: es war die **einzige** Server Action, die von der Route
  `"/"` aus aufgerufen wurde.

  Seit v1.29.52 geht sie deshalb über eine gewöhnliche Route
  (`src/app/api/rsvp/route.ts`) — dieselbe Ausnahme wie `/api/news/seen` und
  die Export-Routen, hier weil sie die Action-Zustellung an `"/"` samt der
  Prüfungen, die Next daran knüpft, vollständig umgeht. Die
  Berechtigungsprüfung (`checkPermission("users.browse")`) und die
  Fehlerbehandlung sind dieselben wie zuvor in der Action; die Knöpfe melden
  sofort (eigener Zustand) und holen die Zahlen per `router.refresh()` nach.
  `serverActions.allowedOrigins` in `next.config.ts` bleibt trotzdem gesetzt:
  hinter einem Proxy können `Origin` und `X-Forwarded-Host` auseinanderlaufen,
  und dann antwortete Next für *jede* Action mit 403 — das ist unabhängig von
  diesem Fall die richtige Einstellung.
- **Konfigurierbares Dashboard** — jede Person stellt unter `/user` (Klappe
  „Startseite", Anker `#dashboard`) selbst ein, welche Abschnitte auf `"/"`
  erscheinen: Erste Schritte, Spielabende, To Dos, offene Gespräche, die
  Anlege-Knöpfe samt Import, die eigenen Entwürfe, die eigenen Charaktere,
  Versionen, News und Lesezeichen. Das
  Zahnrad neben der Dashboard-Überschrift springt direkt dorthin — es trägt
  `ProfileNavIcon`, dasselbe Symbol, mit dem das minimalistische Interface auf
  dem Telefon zum Profil führt: ein Weg, ein Zeichen.
  Die Sektionen samt Vorgabe stehen einmal in
  [`src/lib/dashboardSections.ts`](src/lib/dashboardSections.ts); gespeichert
  wird in `users.dashboard_prefs` (JSONB) **nur, was von der Vorgabe
  abweicht**. Das ist kein Geiz, sondern der Punkt: Eine neue Sektion bekommt
  so ihre Code-Vorgabe, ohne dass ein Bestandskonto angefasst werden müsste,
  und eine später geänderte Vorgabe erreicht auch die, die einmal auf
  „Speichern" gedrückt haben. Die eigenen Charaktere sind zusätzlich **einzeln**
  wählbar (gespeichert als Liste der ausgeblendeten ids — andersherum müsste
  jede neu angelegte Figur erst freigeschaltet werden).
  Abgewählt heißt auch **nicht geladen**: `Dashboard.tsx` fragt nur noch ab,
  was jemand tatsächlich sieht — vorher liefen bei jedem Aufruf sechs Abfragen
  parallel, egal wie viel davon gelesen wurde, und `"/"` ist die meistbesuchte
  Seite der Anwendung.
- **Aufklappbare Abschnitte, die sich erinnern** — Startseite und Profil
  tragen keine DataRow-Akkordeons mehr (die breiten, farbigen LCARS-Balken mit
  der Zahl links), sondern die schlanke Klappe aus
  [`src/components/lcars/CollapsiblePanel.tsx`](src/components/lcars/CollapsiblePanel.tsx):
  je Abschnitt zuklappbar, und der Zustand wird **je Gerät** gemerkt
  (`localStorage`, siehe [`src/lib/panelState.ts`](src/lib/panelState.ts)).
  Die Vorgabe unterscheidet sich nach Seite: Die **Startseite** steht offen
  (man überfliegt sie), das **Profil** zugeklappt (man schlägt dort nach —
  ausgeklappt wäre es meterlang). Der Grund für den Umbau:
  Die DataRow ist als Navigationszeile gedacht; eine Seite aus zehn davon
  liest sich wie ein Inhaltsverzeichnis, nicht wie ein Arbeitsplatz. Die Zahl
  steht als Kurzinfo rechts weiter da — ein zugeklappter Abschnitt soll nicht
  verschweigen, wie viel in ihm steckt.
  Gemerkt wird wie bei den Sektionen selbst nur die **Abweichung**: Wer nichts
  anfasst, hat keinen Eintrag, und eine später geänderte Vorgabe erreicht ihn.
  Gerät statt Konto ist Absicht (gleiche Überlegung wie beim angehefteten
  Antwortfeld): Am Telefon will man die lange News-Liste vielleicht zu haben,
  am großen Schirm nicht.
  Ein **Anker schlägt den gemerkten Zustand** — und zwar auch einer, der auf
  etwas *innerhalb* des Abschnitts zeigt: `/user#password` liegt in „Settings",
  und ein geschlossenes `<details>` versteckt seinen Inhalt, der Browser
  spränge sonst nirgendwohin. Ohne diese Regel wäre der Link „Jetzt festlegen"
  vom Dashboard tot, sobald das Profil per Vorgabe zugeklappt ist.
  `SettingsPanel` bleibt daneben bestehen: Es merkt sich nichts und ist dafür
  server-renderbar. Seine Kopfzeile kennt drei Fassungen: nebeneinander
  (Titel mit Erklärung links, Kurzinfo rechts), dauerhaft gestapelt
  (`stacked` — in sehr breiten Panels stand die Kurzinfo sonst hunderte Pixel
  vom Titel entfernt), und **ab v1.50 unterhalb von 641px ebenfalls
  gestapelt** (`.lcars-details-summary--stack-sm`): Auf dem Telefon teilten
  sich Erklärung und Kurzinfo eine Zeile, in der für beide zu wenig Platz war
  — „Antonio · JetBrains Mono" drängte „Beschriftungs- und Datenschrift
  getrennt wählbar" daneben auf ein paar Zeichen zusammen. Der Chevron sitzt
  dafür in derselben Zeile wie der Titel statt daneben, sonst stünde das
  Dreieck beim Umbruch allein über der Überschrift.
- **Anlegen ohne Umweg** — der Abschnitt „Neue Inhalte" steht auf **beiden**
  Seiten: unter `/user/content` mit allen Knöpfen, auf dem Dashboard mit den
  im Profil eingeschalteten. Er ist **eine** Komponente
  ([`NewContentPanel.tsx`](src/app/user/content/NewContentPanel.tsx)), und
  welche Knöpfe dastehen, entscheidet **eine** Funktion
  ([`newContentForms.ts`](src/app/user/content/newContentForms.ts)) — aus der
  sich auch die Zahl in der Kopfzeile speist. Sie liegt in einem eigenen Modul
  ohne `"use client"` und ohne `"server-only"`, weil beide Seiten sie
  brauchen: die Knopfleiste im Browser, der Abschnitt drumherum auf dem
  Server. Läge die Zählung doppelt vor, liefe sie irgendwann auseinander — und
  dann stünde eine Überschrift über einer leeren Zeile.
  Dazu kommt **„Import"** (`/user/import`) — als Link statt Fenster: Der
  Import blättert durch mehrere Dateien und bestätigt jede einzeln, dafür ist
  ein Fenster zu klein (dieselbe Überlegung wie beim Charakter-Assistenten).
  Der Knopf hängt an keinem Recht mehr, weil die Seite dahinter je Inhaltsart
  gatet (siehe **Markdown-Import für alle** unten).
  Die Leiste selbst bricht in drei Stufen um (`.lcars-btn-row` in
  `controls.css`): schmal einer pro Zeile, ab 640px zwei, ab 1024px alle
  nebeneinander. Als Klasse statt Utility-Kette, weil der Outline-Knopf ein
  `min-width: 180px` mitbringt, das der breiten Stufe im Weg steht —
  `.lcars-btn-row > *` schlägt es über die Spezifität, ein Utility täte das
  nur bei passender Stylesheet-Reihenfolge. In der breiten Stufe `flex: 1 1
  auto`, **nicht** `1 1 0`: Gleiche Spalten sähen ruhiger aus, schnitten aber
  lange Beschriftungen ab (nachgemessen mit der echten Schrift: sechs Knöpfe
  brauchen 1046px in der 1100px-Spalte, gleich verteilt bekäme jeder nur
  173px, „Neuer Datenbank-Eintrag" allein will 252px) — und wegen
  `justify-content: flex-end` verschwände dabei der Wortanfang.
  Der Ladeweg (Auswahllisten, Vorbelegungen, Berechtigungen) lebt ebenfalls
  nur einmal, in
  [`newContentData.ts`](src/app/user/content/newContentData.ts). Geladen wird
  nur, was der jeweilige Knopf zeigt: Eintrag und NPC sind dasselbe Formular
  mit vorgewählter Kategorie und brauchen gar keine Vorarbeit — wer nur sie
  zeigt, löst keine einzige zusätzliche Abfrage aus.
- **Entwürfe** — ein eigener Abschnitt auf der Startseite und über der Liste
  unter „Meine Inhalte" ([`DraftsSection.tsx`](src/app/DraftsSection.tsx),
  Daten aus [`src/lib/drafts.ts`](src/lib/drafts.ts)). Ein Entwurf ist für
  niemanden außer seinem Besitzer sichtbar, nicht einmal für die
  Spielleitung — ohne eine Stelle, die ihn nennt, bleibt er liegen.
  Maßgeblich ist der **Besitz** (`owner_user_id`), nicht die Beteiligung:
  `getDialoguesForUser` sucht über die eigenen Figuren und fände damit auch
  fremde Gesprächs-Entwürfe, veröffentlichen darf sie aber nur ihr Besitzer
  (`setDialogueDraft`). Deshalb eine eigene Abfrage statt einer Ableitung aus
  den Listen von „Meine Inhalte" — und eine einzige über `UNION ALL` statt
  drei: Der Abschnitt steht auf der meistbesuchten Seite der Anwendung.
  Charaktere fehlen darin bewusst, wie schon in der Liste unter „Meine
  Inhalte" — sie haben mit `/user/characters` ihren eigenen Bereich.
  Jeder Entwurf trägt dieselbe Aktionszeile wie die Liste darunter
  ([`ContentActionRow`](src/app/user/content/ContentActionRow.tsx):
  Zustands-Schalter, Stift, Mülleimer) — bei einer **Mission** ohne den
  Schalter, denn `setContentStateAction` kennt sie nicht (kein
  Einzel-Owner-Modell, siehe `VisibilityContentType`). Die große Aktenkarte
  führt auf die kanonische **Leseseite** des Entwurfs; nur der ausdrückliche
  Stift führt direkt in den Editor (`href` und `editHref` sind deshalb zwei
  getrennte Werte). Für Missionslogs liefert die UNION dazu auch den Slug der
  zugehörigen Mission, offene Gespräche führen unmittelbar in ihre
  Spielansicht. Beide Wege aus der
  Liste hinaus, veröffentlichen und löschen, laufen über **einen**
  `useOptimistic`-Reducer: Was kein offener Entwurf mehr ist, verschwindet
  sofort, und React holt es bei einer fehlgeschlagenen Action von selbst
  zurück. Dafür revalidieren beide Actions seit v1.50 auch `"/"` — ohne das
  fiele die optimistische Entfernung auf der Startseite am Ende der
  Transition wieder zurück. `ContentStateSelect` meldet das Veröffentlichen
  über ein optionales `onPublished`, das **innerhalb** derselben Transition
  läuft wie der Action-Aufruf (sonst gäbe es den automatischen Rücklauf
  nicht). Die Zeile ist wie in der Charakter-Übersicht auf **900px**
  gedeckelt (`OwnCharacterList`): Darüber zerreißt das Paar aus Akte und
  Aktionen optisch — die Akte wächst weiter, die Knöpfe bleiben rechts
  stehen. Ohne Aktionszeile war das hier kein Thema.
- **Die Startseite aktualisiert sich selbst** — alle 10 Sekunden ein
  `router.refresh()`
  ([`DashboardAutoRefresh.tsx`](src/app/DashboardAutoRefresh.tsx)). Sie zeigt
  lauter Dinge, die sich woanders ändern (Zu-/Absagen zum Spielabend, neue
  Nachrichten in offenen Gesprächen, News, eigene Entwürfe), und bis v1.49 sah
  man das erst beim nächsten Aufruf. `router.refresh()` statt eines eigenen
  Poll-Endpunkts wie in `DialogueLiveView`: Für ein Dutzend unabhängiger
  Abschnitte gibt es keinen gemeinsamen Snapshot, und der Refresh ist
  **weich** — die bestehende Oberfläche bleibt stehen, bis die neuen Daten da
  sind, kein Flackern und kein verlorener Client-Zustand (aufgeklappte
  Abschnitte, ein offenes Anlege-Fenster samt getippter Felder).
  **Pausiert bei unsichtbarem Tab** und holt beim Zurückkehren sofort frische
  Daten — dasselbe Muster wie der Dialog-Poll, hier aber nicht nur Kosmetik:
  Ein Refresh rendert die meistbesuchte Seite der Anwendung vollständig neu,
  und ein vergessener Hintergrund-Tab liefe sonst tagelang im
  Zehn-Sekunden-Takt gegen die Datenbank. Wer wenig anzeigt, zahlt auch wenig:
  Was im Profil abgeschaltet ist, wird auch beim Refresh nicht geladen.
- **Markdown-Import für alle** — der Upload fertiger `.md`-Dateien war bis
  v1.49 admin-only (`/admin/import`, beide Actions `requireAdmin()`). Er steht
  jetzt auch der normalen Nutzerschaft offen (`/user/import`); Oberfläche und
  Actions liegen deshalb gemeinsam unter
  [`src/app/_shared/import/`](src/app/_shared/import), `/admin/import` ist nur
  noch eine zweite Seite darauf.
  Entscheidend ist dabei **eine** Regel: Der Import darf nirgends mehr
  erlauben als das normale Anlege-Formular derselben Inhaltsart. Die Matrix
  dazu steht in [`src/lib/importAccess.ts`](src/lib/importAccess.ts) —
  Datenbank-Eintrag: eingeloggt (wie `archiveEntryAction`), Charakter und
  Missionslog: `content.create` (wie Assistent bzw. Logbuch-Formular),
  Mission: `missions.manage` (wie `/user/missions/new`). `admin.access` deckt
  alle vier ab, weil das admin-Preset weder `content.create` noch
  `missions.manage` enthält und `/admin/import` sonst auf den
  Datenbank-Eintrag zusammengeschrumpft wäre.
  Dazu kommen zwei Korrekturen in
  [`actions.ts`](src/app/_shared/import/actions.ts), ohne die die Öffnung ein
  Loch gewesen wäre: `commit*` übernimmt das `*Edits`-Objekt **vollständig**,
  also auch den Eigentümer und beim Logbuch die Autoren-Figur (siehe
  Kopfkommentar in `markdownImport.ts`). Für alle außer der Administration
  wird deshalb `ownerSlug` auf den Aufrufer **erzwungen** (das Formularfeld
  entfällt dort ganz), und `authorSlug` muss eine **eigene, veröffentlichte**
  Figur sein (`ownsCharacterSlug`) — dieselbe Grenze, die das normale
  Logbuch-Formular über seine Auswahlliste zieht. Beide Actions antworten bei
  fehlender Berechtigung mit einer Meldung statt `forbidden()`: Sie werden
  programmatisch aufgerufen, wo ein Auth-Interrupt beim Client nur als
  nichtssagender Fehler ankäme (gleiche Überlegung wie bei `checkPermission`
  in `dal.ts`).
- **Offen für dich** — der Dashboard-Abschnitt mit dem, was diese Person
  schuldet (`src/lib/pendingActions.ts`): Missionen, an denen eine eigene
  Figur teilnimmt und zu denen **kein eigenes Logbuch** existiert; Gespräche,
  in denen man beteiligt ist und die **letzte Nachricht von jemand anderem**
  stammt; eigene **Entwürfe**, die länger als `DRAFT_STALE_DAYS` (7) liegen.
  Ältestes zuerst. Bewusst **ohne eigene Tabelle**: eine Aufgabe ist immer
  eine Ableitung aus dem Bestand, kein Zustand, der gepflegt werden müsste —
  ein geschriebenes Logbuch lässt die Zeile von selbst verschwinden. Steht vor
  den Neuigkeiten: die zeigen, was andere getan haben.
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
- **Eingaben überleben den Reload** — jede Eingabe in jedem Formular der App
  wird für die Browser-Sitzung gesichert (`sessionStorage`) und beim nächsten
  Aufbau derselben Seite wieder eingesetzt: Neuladen, versehentliches Zurück
  oder ein Fehlerbildschirm kosten keinen getippten Text mehr. Die Regeln
  (welches Feld, welcher Schlüssel, welcher Wert) liegen React-frei und
  unit-testbar in `src/lib/inputDraft.ts`, die Verdrahtung mit dem Dokument in
  `src/components/lcars/InputDraftKeeper.tsx` — eine einzige Stelle im
  Root-Layout statt einer Änderung an ~80 Formularen: die Sicherung hängt per
  Event-Delegation an `document` und findet neue Felder (Fenster, Akkordeons,
  nachgeladene Bereiche) über einen `MutationObserver`. Der Schlüssel eines
  Feldes besteht aus Seitenpfad, Formular (`id`/`name`/Position) und Feld
  (`name`/`id`/Position), Kästchen zusätzlich mit ihrem `value`. Die gemeinsam
  gebauten Content-Editoren kapseln das in `SessionDraftForm`: Dessen
  verpflichtender `draftScope` setzt einen stabilen `data-draft-scope` aus
  Inhaltsart und ID (z. B. `archive-entry:42`). Zwei Einträge mit denselben
  Feldnamen teilen dadurch nie einen Schlüssel. Beim
  clientseitigen Next-Routenwechsel sperrt eine im Layout-Effect aktualisierte
  Pfad-Ref außerdem Observer und Timer der alten Seite, bevor sie das neue DOM
  sehen können. Die Position
  ist dabei nur INNERHALB eines Formulars der Ausweg — dort steht die
  Felderliste fest; ein Feld ganz ohne Formular und ohne `name`/`id` bleibt
  außen vor (`hasStableKey`). Sonst zeigt derselbe Schlüssel nach dem
  nächsten Filtern oder Sortieren auf ein anderes Feld, und das Einsetzen
  löst ein echtes `change`-Ereignis aus: Genau so veröffentlichte der
  Entwurf/Veröffentlicht-Schalter unter „Meine Inhalte" (ein namenloses
  Auswahlfeld je Zeile) fremde Entwürfe, bis v1.43 ihn zu Knöpfen machte.
  Lieber kein gesicherter Entwurf als ein Wert im falschen Feld. Nicht
  gesichert werden Passwörter, Einmalcodes und Zahlungsdaten
  (`autocomplete`-Kennung bzw. `type`) sowie alles unterhalb von
  `data-no-draft` — das trägt u.a. `PasswordInput` (ihr Feld wechselt beim
  Anzeigen auf `type="text"`), die globale Kopfzeilen-Suche und
  `AdminSelectField` (ein Befehlsfeld, das bei jeder Änderung schreibt, ist
  kein Entwurf). Ein
  zurückgesetztes Formular (`reset`) verliert seinen Stand — sofort, nicht im
  nächsten Tick, damit ein Formular, das sich per neuem `key` neu aufbaut
  (Notiz-Editor), nicht doch wieder mit dem eben abgeschickten Text gefüllt
  wird; `NotesPanel` löst dafür nach dem Speichern ein echtes `reset()` aus,
  wie `DialogueReplyForm` es tut. Vor dem
  Verlassen der Seite (`pagehide`) wird der DOM-Stand der **bereits
  gesicherten** Felder nachgeführt (`withKnownDraftValue`) — damit ein von
  React nach erfolgreicher Server-Action geleertes Formular nicht mit altem
  Text wieder aufersteht, ein nur geöffnetes Bearbeiten-Formular aber auch
  nicht seine serverseitigen Vorgabewerte sichert und sie später über
  inzwischen geänderte Inhalte legt. Beim An- UND
  Abmelden wird der gesamte Entwurfs-Speicher verworfen
  (`clearAllInputDrafts()` in `HeaderUserNav`/`LoginForm`, an derselben Stelle
  wie das Leeren des Offline-Seiten-Caches): Auf einem geteilten Gerät soll
  die nächste Person weder fremde Zwischenstände vorfinden noch eigene
  hinterlassen. **Ersetzt der Server den Text absichtlich**, ist der
  gesicherte Stand überholt und wird verworfen
  (`dropInputDraftsForPage()`, seit v1.45): Genau das passiert beim
  **Wiederherstellen einer früheren Fassung** (`RevisionsPanel`) — ohne das
  legte die Sicherung den ersetzten Text beim nächsten Aufbau wieder über den
  wiederhergestellten, und ein anschließendes Speichern schrieb ihn sogar
  zurück in die Datenbank. Bewusst als **Ereignis** an `document` und nicht
  als Aufruf von `clearDraftRecord()`: Die Sicherung hält denselben Stand
  zusätzlich im Arbeitsspeicher (`recordRef`) und schreibt ihn beim
  `pagehide` zurück — ein Löschen an ihr vorbei wäre beim nächsten
  Seitenwechsel wieder erledigt. Das Panel lädt danach die Seite neu, denn
  das Textfeld des Editors ist unkontrolliert (`defaultValue`): Hat jemand
  darin getippt, gilt es dem Browser als „dirty" und übernimmt einen neuen
  Vorgabewert nicht mehr — das `revalidatePath` der Action erneuert die
  Seite, nicht aber den Text im Feld. Der `MutationObserver` läuft nur an, wenn eine Änderung
  wirklich ein Element hinzugefügt hat, und der Wiederherstellungs-Durchgang
  bricht sofort ab, solange es für die Seite nichts Gesichertes gibt — auf
  Seiten mit Live-Aktualisierung (Gesprächs-Poll, Toasts) kostet er damit
  praktisch nichts.

  **Einmal einsetzen genügt nicht**, sobald ein Feld einen vom Server
  gerenderten Vorgabewert trägt — also bei jedem Bearbeiten-Formular und jedem
  `MarkdownEditor`. React hydriert die Seite nach dem Einsetzen und schreibt
  dabei den Vorgabewert zurück; der Entwurf war gesichert, aber sofort wieder
  überschrieben (genau der Fehler, den die erste Fassung in allen Editoren
  hatte). Deshalb wird der Stand nach dem Aufbau **angeheftet**: Durchgänge
  alle 150 ms für 1,5 s (`PIN_WINDOW_MS`), die ein Feld nachziehen, solange
  niemand es anfasst — die erste Eingabe von Hand beendet das Anheften für
  dieses Feld, danach gilt wieder „einmal einsetzen, dann in Ruhe lassen".
  Dieselbe Phase läuft für nachgeladene Bereiche, die erst beim Eintreffen
  hydrieren. Und was **vor** dem ersten Durchgang schon im Feld stand (wer
  schneller tippt, als die Seite fertig wird), erkennt die Sicherung am
  Abweichen vom Vorgabewert (`isFieldAtDefault`) und übernimmt es, statt es
  zu überschreiben.
- **Öffentliches Changelog** — die Seite `/changelog` listet je Version die
  end-nutzerrelevanten Neuerungen (gepflegt in `src/lib/changelog.ts`). Jeder
  Stichpunkt trägt eine **Kategorie** (`src/lib/changelogCategories.ts`);
  danach lässt sich an beiden Anzeigestellen — der Liste unter `/changelog`
  und der Box „Neue Funktionen" auf dem Dashboard — filtern und sortieren.
  Beide rendern dieselbe Bedienleiste (`ChangelogControls.tsx`) und teilen
  sich die Rechnung (`useChangelogView.ts`): ein Auswahlfeld für die
  Kategorie (eine auf einmal, „Alle Kategorien" führt zurück) und der
  Sortier-Umschalter. Gefiltert werden die Stichpunkte, nicht die Versionen,
  und eine Version ohne Rest fällt weg.
  Zusätzlich legt die Administration unter `/admin/changelog` je **Rolle**
  fest, welche Kategorien in der Dashboard-Box nicht erscheinen
  (`campaign_settings.changelog_hidden_categories`). Das greift auf dem
  Server, nicht im Browser: was für diese Person nicht gedacht ist, wird gar
  nicht erst ausgeliefert. Wer mehrere Rollen hat, sieht eine Kategorie,
  sobald **eine** seiner Rollen sie zeigt — Sichtbarkeit gewinnt, wie bei den
  Rechten. Die öffentliche Liste unter `/changelog` bleibt davon unberührt.
- **Teilen & Export** — der „Teilen“-Knopf auf Charakter-, Missions-,
  Missionslog-, Datenbank-Eintrag- und Gesprächsseiten bietet neben Link
  kopieren/WhatsApp auch den Download des Inhalts als Markdown-Datei (mit
  YAML-Frontmatter) oder als PDF (serverseitig erzeugt, ohne Chromium/
  Puppeteer — läuft dadurch auf Netlify Functions). Berücksichtigt dieselbe
  Sichtbarkeits-/Teilnehmer-Prüfung wie die jeweilige Detailseite selbst. Bei
  abgeschlossenen Gesprächen (`/characters/dialogues/<slug>`) steht der Knopf
  unter dem Verlauf, neben den Moderations-Schaltflächen; Export-Typ ist
  `archive_entry` (ein Gespräch IST ein Datenbank-Eintrag der Kategorie
  `dialogue`). Fehlt einem Gespräch das `source_md` — offene Gespräche haben
  noch keins, alte abgeschlossene mitunter auch nicht —, baut
  `loadExportableContent` den Verlauf live aus `dialogue_messages`
  (`buildDialogueFlowingText`), statt eine leere Datei auszuliefern. Das
  PDF trägt seit v1.35 die Aufmachung von Charakterbogen und Missionsakte
  (`ContentPdfDocument.tsx`): blauer Rahmen, Kopfzeile aus Wortmarke und
  Titelreiter, Datenblock mit deutschen Beschriftungen und der Text über
  `toPdfBlocks` statt roher Markdown-Zeichen. Farben und Textauszeichnung
  kommen wie dort aus `src/lib/pdf/sheetTheme.tsx`.
- **Vorschaubilder in den Übersichten** — Charakterliste, Chronologie und
  Datenbank zeigen links in der Karte (`ChronoCard`) ein Thumbnail des
  Eintrags: bei einer Figur ihr Portrait, sonst das zuerst hochgeladene Bild
  (`content_images`). Ohne Bild wird nichts gerendert — kein Platzhalter. Die
  Listen holen die Bild-Id in ihrer bestehenden Abfrage mit (`LEFT JOIN
  LATERAL`), die Chronologie über eine Abfrage für alle vier Inhaltsarten
  (`getFirstContentImageIdsBySlug`); ausgeliefert werden die Bytes wie überall
  über `/api/content-images/<id>` (`contentImageSrc`).
- **Chronologie (`/chronologie`)** — die Kampagne als Zeitstrahl nach ihrer
  eigenen Zeitrechnung (In-Story-Datum), nicht nach Bearbeitungszeit. Sie ist
  zugleich die **Missions-Übersicht**: in der Vorgabe (`TIMELINE_SCOPES`,
  Umfang `missions`) zeigt sie genau die **Missionsstarts**, je einer führt auf
  seine Missionsseite; der Umfang „Alle Ereignisse" schaltet den vollen
  Zeitstrahl frei. Die frühere eigene Route `/missions` war dieselbe Liste
  derselben Missionen nach demselben Datum; sie ist entfallen. Auch die
  Missionsseiten liegen jetzt unter der Chronologie
  (`/chronologie/mission/[missionSlug]`, das Logbuch eine Ebene tiefer) —
  alle Adressen kommen aus `src/lib/contentRoutes.ts`, `/missions` und
  `/missions/…` leiten dauerhaft dorthin um (`next.config.ts`). In demselben
  Modul liegen inzwischen **alle** Inhalts-Adressen — Charaktere (samt
  `/logs` und `/sheet`), Datenbank-Einträge, offene Gespräche und die
  Bearbeitungsseiten im eigenen Bereich: sie standen an rund siebzig Stellen
  von Hand zusammengesetzt, und nach dem Missions-Umzug ging in derselben
  Zeile der Missions-Link über einen Helfer und der Archiv-Link weiter per
  Zeichenkette. Nicht erreichbar bleiben zwei SQL-Stellen
  (`adminContent.ts`, `contentImages.ts`), die die Adresse in einer
  UNION-Abfrage über alle Inhaltsarten zusammensetzen — der Kopfkommentar von
  `contentRoutes.ts` nennt sie.
  Einträge ohne Datum gehen nicht verloren: abgeschlossene Gespräche und
  Logbücher ohne gepflegtes In-Story-Datum stehen in der Gruppe „Ohne Datum"
  am Ende (`sortEvents`). Ein **laufendes** Gespräch (`dialogue_open`) bleibt
  dagegen draußen — es ist kein abgeschlossenes Ereignis, und seine Karte
  führte auf eine Seite, die alle außer den Beteiligten weiterleitet (dieselbe
  Bedingung wie in `getAllArchivePaths`).
  Jede Ereignisart hat zusätzlich eine eigene Adresse
  (`/chronologie/[kategorie]`, z.B. `/chronologie/conflict`); die Auswahl im
  Filterfeld schreibt sie per `history.replaceState` in die Adresszeile, ohne
  den Zeitstrahl neu zu laden (per `pushState`, siehe oben). `/chronologie/mission` ist dafür eine eigene
  Seite, weil ein statisches Segment in Next das gleichnamige dynamische
  schlägt — es ist zugleich das Präfix der Missionsseiten. Ein unbekanntes
  Segment ist eine 404 (`isTimelineCategory`), keine leere Liste.
  Der Umfang **„Missionen"** zeigt je Einsatz EINE Karte mit dem ganzen
  **Zeitraum** (Beginn–Abschluss, `missionEndDates`); die Ereignisart
  **„Mission"** — im Filter und unter `/chronologie/mission` — zeigt Beginn
  und Abschluss dagegen als eigene Marker. Vorher hießen beide fast gleich
  und zeigten Verschiedenes.
  Die **Ereigniskarte** (`.timeline-card`) trägt die Farbe ihrer Ereignisart
  als ganze Fläche mit dunkler Schrift (`--lcars-ink-dark`, das Token für
  „Text auf Akzentflächen" — es bleibt in beiden Helligkeitsmodi dunkel;
  `--lcars-bg` wäre im Hellmodus hell und auf der Pastellfläche unlesbar).
  Aufbau: Art-Etikett und verlinkter Titel in einer Zeile, ggf. das
  Herkunfts-Etikett daneben, darunter nur das Datum — Ereignisart und Quelle
  standen dort doppelt —, dann Teaser und Beteiligte als `<details>`-Felder
  (Teaser offen, Beteiligte zu). Die Auswahl einer Ereignisart schreibt die
  Adresse per `history.pushState` und legt damit einen echten
  Verlaufseintrag an; ein `popstate`-Horcher liest sie beim Zurück/Vorwärts
  zurück. Die Karte ist bewusst kein Link als Ganzes:
  ein Knopf in einem Link ist weder gültiges HTML noch tastaturbedienbar,
  verlinkt ist der Titel.
  Filter und Sortierung richten sich nach dem Umfang: Ereignisart und
  Beteiligte werden aus den Ereignissen **im Umfang** gebildet, ein
  Umfangwechsel setzt sie zurück. **Entwürfe erscheinen nirgends** — auch
  nicht ihrem Owner (die Missions-Übersicht zeigte sie noch nie, und ein
  Zeitstrahl, der für eine Person Ereignisse enthält, die für alle anderen
  nicht existieren, erzählt eine andere Kampagne als die am Tisch).
  Die Ereignisse kommen aus drei Quellen und werden in `src/lib/timeline.ts`
  zusammengetragen:
  1. **Gepflegte Angaben** der Inhalte (Missionsbeginn/-ende, `log_date` eines
     Logbuchs, `metadata.logDate` eines Gesprächs, `metadata.dateOfBirth` einer
     Figur, ein Datums-Attribut eines Datenbank-Eintrags).
  2. **Marken im Fließtext** — `<!-- timeline: JJJJ-MM-TT | Titel | Kategorie -->`,
     gesetzt über den Kalender-Knopf im MarkdownEditor (`TimelineMarkerButton`).
     Er steht in der Werkzeugleiste der Textfelder der vier Inhaltsarten, die
     überhaupt in der Chronologie stehen — Charakter, Mission, Logbuch und
     Datenbank-Eintrag (`MarkdownEditor`-Prop `timelineMarker`, gesetzt von
     `ContentEditor`, `CharacterWizard` und `CharacterBioPanel`). Textfelder
     daneben (Notizen, Regeln, Talente, Gespräche, Import-Vorschau) lassen ihn
     weg: deren Text kommt nicht in die Chronologie, eine Marke darin bliebe
     wirkungslos. Der Knopf öffnet ein Fenster (`ModalOverlay`) mit Datum,
     Ereignisart und Titel; die **Ereignisart ist ein Auswahlfeld über
     `EVENT_CATEGORIES`** — dieselbe Quelle, aus der die Chronologie ihre
     Farben, Beschriftungen und Filter zieht und aus der auch „Ereignis
     eintragen" wählen lässt. Eingefügt wird an der Cursor-Stelle, auf eigener
     Zeile (`insertAtCursor` in `src/lib/textareaEdit.ts`).
     Marken erzeugen im gerenderten Text eine unsichtbare Sprungmarke
     `#timeline-N` (`remarkTimelineAnchors` in `src/lib/markdown.ts`); die Karte
     verlinkt genau dorthin. Die Zählung folgt der Dokumentreihenfolge ALLER
     Marken — auch ungültiger —, sonst zeigten die Links hinter einer kaputten
     Marke auf die falsche Stelle.
  3. **Abgeleitete Ereignisse** aus dem Sprachmodell (siehe unten).
  (1) und (2) entstehen beim Lesen und werden **nicht** gespeichert: eine
  gespeicherte Kopie liefe bei jeder Bearbeitung auseinander und die
  Sichtbarkeit müsste doppelt gepflegt werden. Fünf Abfragen für die ganze
  Seite, ungecacht (der Inhalt hängt am Betrachter, wie bei der Missionsakte).
  Umfang, Sortierrichtung, Suche, Ereignisart, Beteiligte und Jahr laufen als
  reine Funktionen in `src/lib/timelineTypes.ts` und sind
  dort einzeln getestet. `normalizeCategory` führt dabei **`person` und
  `character`** zusammen: die gepflegte Art heißt `character` (Beschriftung
  „Person"), aus Markern und aus dem Sprachmodell kam mitunter `person` — das
  fiel als unbekannter Wert auf „Sonstiges" zurück und stand als zweite,
  gleichbedeutende Art in Auswahl und Jahresleiste. Normalisiert wird beim
  Lesen (Anzeige, Filter, Auswahl) **und** beim Schreiben (Marker, Modell,
  Formular); bestehende Zeilen zieht die Migration nach.
- **Ereignisse von Hand eintragen** — der Knopf „Ereignis eintragen" über dem
  Zeitstrahl (`ManualEventForm`, für alle mit `content.create`) öffnet ein
  Fenster (`ModalOverlay`) und legt eine
  Begebenheit an, die zu **keinem Inhalt** gehört: der Vertrag, der
  unterzeichnet wird, der Regierungswechsel. Bis v1.29.42 verlangte
  `timeline_events` eine Quelle — ein solcher Meilenstein hatte damit kein
  Zuhause, außer man legte eigens einen Datenbank-Eintrag dafür an.
  `source_type`/`source_slug` sind jetzt nullable, `origin` unterscheidet
  `inferred` (vom Modell) von `manual` (von Hand). Die Karte trägt das
  Etikett „von Hand eingetragen" und ist **nicht verlinkt** (`href` null) —
  es gibt nichts, worauf sie zeigen könnte. Keine Sichtbarkeitsprüfung: ohne
  Quelle gibt es nichts zu verbergen. Entfernen darf, wer sie eingetragen hat,
  und die Moderation; die Liste unter `/gm/chronologie` zeigt beide Herkünfte.
  **Beteiligte** lassen sich dabei mitgeben (`timeline_event_characters`):
  angeboten wird das **ganze Ensemble** — auch zurückgezogene Figuren und
  NPCs, denn ein historisches Ereignis betrifft oft gerade die, die nicht
  mehr im Dienst sind —, **ohne Vorauswahl**, Entwürfe ausgenommen. Die
  übrigen Ereignisse ziehen ihre Beteiligten aus ihrer Quelle
  (Missionsbesetzung, Logbuch-Autor:in, Gesprächsteilnehmer); ein freies
  Ereignis hat keine, also braucht es die eigene Zuordnung.
  Das Datumsfeld ist ein echter Datumswähler und mit dem **jüngsten Ereignis**
  der Chronologie vorbelegt (`latestEventDate`): was neu dazukommt, schließt
  fast immer an das an, was zuletzt geschah — sonst suchte man das Jahrhundert
  bei jedem Eintrag von Hand.
- **Ereignisse ableiten (`/gm/chronologie`)** — die Spielleitung lässt je Inhalt
  das Sprachmodell die Begebenheiten nennen, die im Text stecken, aber in keinem
  Feld stehen („drei Tage später …"). Verwendet dieselbe Retrieval-Pipeline wie
  der Datenbank-Assistent (Zusammenhang aus dem Archiv, gleicher RBAC-Filter)
  plus einen nicht-streamenden Aufruf (`completeText` in `src/lib/rag.ts`). Die
  Antwort eines Modells ist Text, keine Datenstruktur: `parseInferredEvents`
  schneidet das JSON-Array heraus und prüft jedes Feld einzeln (13 Tests).
  Übernommene Ereignisse landen in `timeline_events` (die Tabelle hält
  ausschließlich abgeleitete Ereignisse), sind in der Ansicht als „aus dem Text
  abgeleitet" gekennzeichnet und hängen in ihrer Sichtbarkeit am Quell-Inhalt.
  Bewusst nicht automatisch beim Speichern: ein Durchlauf kostet einen
  Modellaufruf und gehört gelesen, bevor er in der Chronologie aller steht.
- **Erste Schritte (`/willkommen`)** — Einstiegsseite für neue Konten: was das
  Archiv ist, plus eine Liste der ersten Schritte (Passwort, Charakter,
  Erschaffung, Logbuch) mit Link in den jeweiligen Ablauf. Bewusst
  OHNE eigene Fortschritts-Tabelle: jeder Schritt wird an den vorhandenen Daten
  abgelesen (`src/lib/onboardingSteps.ts` als reine, testbare Funktion,
  `src/lib/onboarding.ts` holt die Tatsachen). Dieselbe Liste lässt sich auf dem
  Dashboard einblenden (`OnboardingSection`, per Vorgabe aus — siehe
  „Konfigurierbares Dashboard") und verschwindet dort, sobald alles erledigt
  ist; `/willkommen` bleibt als Übersicht erreichbar. „Ein Gespräch beginnen"
  stand bis v1.48 als fünfter Schritt dabei und ist entfallen: Er hängt anders
  als die übrigen nicht am eigenen Konto allein, sondern an einem Gegenüber,
  das mitspielen muss — ein Einstieg sollte sich allein erledigen lassen.
- **Gesagtes ist auffindbar** — die Volltextsuche kennt seit v1.29.41 einen
  fünften Treffertyp: einzelne **Gesprächs-Nachrichten**
  (`dialogue_messages.search_vector`, eigener GIN-Index). Vorher fand die
  Suche nur den Eintrag drumherum, dessen Text bei Gesprächen meist leer ist —
  was am Tisch gesagt wurde, war damit unauffindbar. Je Gespräch erscheint
  höchstens eine Nachricht (`DISTINCT ON`, beste zuerst), sonst füllte ein
  langer Dialog die ganze Liste; der Treffer nennt Sprecher und Gespräch und
  springt per Text-Fragment an die Stelle. Die Sichtbarkeit hängt am
  zugehörigen Eintrag (eine Nachricht erbt sie), gelöschte Nachrichten sind
  draußen. **Kein** `title_vector`: eine Nachricht hat keinen Titel und taucht
  deshalb nicht im Titel-Dropdown des Headers auf, nur in der Volltextsuche.
- **Missionsakte als PDF** — `/api/export/mission-book/[missionSlug]` (Knopf
  auf der Mission-Detailseite, nur für Angemeldete) packt **eine** Mission in
  eine Datei: Titelblatt mit Zeitraum, Status und Beteiligten, ein
  **Inhaltsverzeichnis**, danach die Beschreibung und jedes Logbuch auf einer
  eigenen Seite, chronologisch. In der Akte stehen nur **veröffentlichte**
  Logbücher (`src/lib/missionBook.ts`), und eine Entwurfs-Mission liefert
  dieselbe 404 wie ihre Seite. Layout: `src/lib/pdf/MissionBookPdfDocument.tsx` —
  dieselbe Aufmachung wie der Charakterbogen (blauer Rahmen, Kopfzeile aus
  Kampagne und Titelreiter, formatierter Markdown-Text), Farben und die
  Auszeichnung der Textstücke gemeinsam in `src/lib/pdf/sheetTheme.tsx`.
  Lesezeichen je Logbuch, Seitenzahlen in der Fußzeile; die Einträge des
  Inhaltsverzeichnisses sind PDF-interne Sprungziele (`<Link src="#…">` auf
  ein `id` am Titel) — **ohne Seitenzahlen**, weil erst beim Setzen feststeht,
  wie viele Seiten ein Bericht braucht. Vorgänger war ein
  Kampagnenband über alle Missionen auf der Übersicht — gebraucht wird beim
  Spielen die Akte der Mission, die gerade auf dem Tisch liegt.
- **Markdown-Editor** — Formatierungs-Toolbar, Rohtext/Vorschau-Umschalter und
  automatische bzw. manuelle Verlinkung (`[[Wikilinks]]`) zwischen Inhalten.
- **Verweise in doppelten Klammern** — `[[Ziel]]`, `[[Ziel|Anzeigetext]]`
  bzw. `[[Ziel#Abschnitt]]` im Fließtext. `markdownToHtml` rendert sie
  zunächst als `<a href="wikilink://Ziel#anker">`; aufgelöst wird erst danach,
  wenn feststeht, was es überhaupt gibt. Gesucht wird nach **Titel/Name**, dann nach **Slug**
  (`[[t-mok]]`), dann nach **Zweitname/Alias**; was nirgends passt, wird als
  „Kein Eintrag gefunden" markiert statt als toter Link stehen zu bleiben,
  und gelöschte Inhalte zählen nicht mit (ihre Detailseiten laden nur mit
  `deleted_at IS NULL`) — weder beim Auflösen noch als **Autolink-Ziel**
  (`getAutolinkTargets`), sonst setzte ein Durchlauf einen Link auf eine
  Seite, die es nicht mehr gibt. Zwei Auflöser in `src/lib/autolink.ts` teilen sich
  diese Mechanik: `resolveAllWikilinks` (ganze DB, inkl. Entwürfe) hängt an
  jedem Speicher-Pfad, `resolvePublicWikilinks` (nur die öffentlichen Ziele
  aus `getAutolinkTargets`) an der Editor-Vorschau, die ohne Anmeldung
  aufrufbar ist und deshalb keine Entwurfstitel verraten darf.
  **Auch beim Autolinking**: `renderAutolinkedHtml` löst erst die vom
  Durchlauf selbst erzeugten Marken auf (aus dessen `matches`, ohne weitere
  Abfrage) und danach alles Übrige. Bis v1.44 fehlte der zweite Schritt —
  ein von Hand getipptes `[[Ziel]]` blieb mit gesetztem Haken „Automatisch
  verlinken" ein toter Link, weil es für `applyAutolinks` zu den geschützten
  Bereichen zählt und deshalb nie in `matches` steht. Nur scheinbar ging es
  gut, wenn derselbe Name woanders im Text unverklammert vorkam.
  **Nachträglich verlinken** lässt sich ein gespeicherter Inhalt über
  `ContentLinkToolButton` (Vorschau → Bestätigen, derselbe Knopf schaltet
  danach auf „Verlinkung entfernen"). Wer das darf, entscheidet
  `mayUseContentTools` (`src/app/actions/contentTools.ts`) **am konkreten
  Inhalt**: der Owner auf seinem eigenen immer — er darf den Text ohnehin
  bearbeiten —, `content.autolink_tools` zusätzlich auf fremden. Bis v1.45
  verlangten alle fünf Aktionen ausnahmslos das Recht, das nur die Rolle `gm`
  trägt; auf den eigenen Inhalten sah es deshalb niemand sonst. Der Knopf
  steht auf der Detailseite (`ActionsMenu.tsx`, gleiche Bedingung) und in der
  Liste unter „Meine Inhalte"; dort mit `detectMode={false}`, sonst liefe pro
  Zeile eine eigene Abfrage über den ganzen Text, nur um den Anfangsmodus zu
  setzen.
  **Der Abschnitt** (`[[Ziel#Frühe Jahre]]`) wird zum Sprungziel auf der
  Ziel-Seite. Die Überschrift wird dafür mit `headingAnchor` (`src/lib/
  markdown.ts`) in einen Anker übersetzt — bewusst mit **`github-slugger`**,
  also genau der Funktion, aus der `rehypeSlug` in derselben Pipeline die
  `id` der Überschrift bildet, und nicht mit `slugifyBase` aus `lib/slug.ts`
  (das zusätzlich Diakritika auflöst und aus „Frühe Jahre" `fruhe-jahre`
  statt `frühe-jahre` machen würde — der Link zeigte dann neben das Ziel).
  `markdown.test.ts` prüft beide Wege gegeneinander, statt die
  Übereinstimmung nur zu behaupten. Ziel und Anker sind im `wikilink://`-Pfad
  einzeln URL-kodiert; ein `#` im Text steht deshalb als `%23` und das erste
  rohe `#` trennt die beiden Teile (`splitWikilinkTarget`).
- **Bilder-Galerie** — Charaktere, Missionen, Missionslogs und Datenbank-Einträge
  (nicht Gespräche) können mehrere Bilder haben (JPEG/PNG/WebP/GIF, max. 5 MB
  pro Datei); Hochladen/Löschen ist auf dieselbe Person beschränkt, die den
  Inhalt auch sonst bearbeiten darf. Speicherung im selben R2-Bucket wie die
  DB-Backups (eigener Präfix, keine zusätzliche Konfiguration nötig). Bei
  Charakteren lässt sich eines der hochgeladenen Bilder als Profilbild
  festlegen; ein Klick aufs Portrait öffnet ein Karussell über alle
  hochgeladenen Bilder statt nur des einzelnen Portraits. Bei Missionen,
  Missionslogs und Datenbank-Einträgen lässt sich außerdem ein bereits
  hochgeladenes Bild direkt aus der Formatierungsleiste des Markdown-Editors
  in den Text einfügen. Admins sehen unter `/admin/content/images`
  ("Bilder") zusätzlich alle hochgeladenen Bilder über alle Inhalte hinweg
  mit Vorschau und können sie dort einzeln endgültig löschen, auch verwaiste
  Bilder, deren zugehöriger Inhalt bereits gelöscht wurde.
- **Entwürfe** — Charaktere, Missionen, Missionslogs und Datenbank-Einträge lassen
  sich beim Anlegen/Bearbeiten statt zu veröffentlichen erst als Entwurf
  speichern (Text-Pflichtfeld entfällt dann) — und ihn später direkt in der
  Liste veröffentlichen, ohne ihn erneut zu öffnen — dort steht dafür ein
  Schalter aus zwei Knöpfen (`LcarsSwitch`, seit v1.43; als Auswahlfeld
  wechselte er bei jedem Pfeiltasten-Druck des noch fokussierten Feldes zur
  nächsten Option und schrieb sie sofort weg). Ein Entwurf ist für
  niemanden außer der eigenen Person sichtbar, auch nicht für die
  Spielleitung (Ausnahmen: Missionen, die jede Spielleitung sieht, da
  Missionen kein Einzel-Owner-Modell haben, und `content.view_all` für die
  Administration), und erscheint bis zur Veröffentlichung nur unter „Meine
  Inhalte“ bzw. im Abschnitt „Entwürfe“ (dort und auf der Startseite, jeweils
  mit derselben Aktionszeile). **Entwurf oder veröffentlicht ist der einzige
  Sichtbarkeits-Schalter** — die früheren drei Stufen `private`/`gm`/`public`
  sind mit v1.34 entfallen (siehe `scripts/migrate-pr71.sql`).
- **Wörtliche Rede in der Charakter-Farbe** — im Fließtext abgeschlossener
  Gespräche färbt
  [`colorizeDirectSpeech`](src/lib/characterColor.ts) alles zwischen „ und “
  in der Farbe des Sprechers, die Anführungszeichen eingeschlossen. Sie läuft
  über die **Zeichen** statt über einen Regex, weil eine Rede sich über
  mehrere Absätze erstrecken darf: Ein einzelnes `<span>` von „ bis “
  überspannte dann eine Blockgrenze, und der Browser schließt so etwas still
  am `</p>` — gefärbt war nur der erste Absatz. Stattdessen bekommt **jeder
  Block seinen eigenen span**, während der Zustand „Rede läuft" über die
  Grenze hinweg erhalten bleibt. Die Blockliste folgt der Allowlist, durch die
  der Text kommt (`defaultSchema` von rehype-sanitize). Tags werden dabei
  übersprungen statt mitgelesen — ein „ in einem Attributwert ist kein
  Redeanfang.
- **PWA mit Push-Benachrichtigungen und Offline-Betrieb** — installierbar auf
  Mobilgeräten (inkl. maskable Icon), Web-Push für neue Dialog-Nachrichten und
  abonnierte Inhalte. Ein Service Worker macht bereits besuchte Seiten offline
  abrufbar und zeigt sonst eine eigene Offline-Ausweichseite (`/offline`);
  Anmeldung, neue Inhalte und Änderungen brauchen weiterhin eine Verbindung.
- **Sprecherfarben in Gesprächen** — jeder Charakter hat eine eigene Farbe
  (`characters.character_color`, im Profil wählbar), die seine Nachrichten-Karten
  und im Fließtext-Modus seine wörtliche Rede einfärbt. **NPCs bekommen
  einheitlich ein helles Grau** (`NPC_COLOR` in `src/lib/characterColor.ts`) —
  so trennt die Farbe auf einen Blick, wer von einer Spielerin/einem Spieler
  geführt wird und wer Kampagnen-Inventar ist.
- **Wählbare LCARS-Farbschemata** — angemeldete User wählen im Profil unter
  „Darstellung“ ein Theme für die gesamte Oberfläche (Standard plus die echten
  LCARS-Paletten Classic, Science, Nebula, Red Alert, Nemesis) und können jede
  einzelne Akzentfarbe individuell überschreiben. Die Wahl gilt pro Konto, wird
  ohne Flackern schon beim Seitenaufbau angewendet (Pre-Paint-Cookie) und bleibt
  geräteübergreifend erhalten. Die Farbe des eigentlichen Fließtexts bleibt dabei
  bewusst konstant (feste `--lcars-ink-*`-Tokens), damit der Text in jedem Theme
  gut lesbar bleibt.
- **Wählbare Schriften** — angemeldete User stellen im Profil unter
  „Darstellung → Schriften“ getrennt ein, in welcher Schrift Überschriften und
  Fließtext (Vorgabe Antonio) und in welcher Daten und Code gesetzt werden
  (Vorgabe Share Tech Mono). Als Alternativen stehen gängige Bildschirmschriften
  bereit (Inter, Roboto, Open Sans bzw. JetBrains Mono, Roboto Mono, Source Code
  Pro), alle über `next/font` selbst ausgeliefert — keine Laufzeit-Anfrage an
  Google. Rein CSS-basiert wie die übrigen Darstellungs-Achsen
  (`html[data-font-sans]`/`[data-font-mono]` hängen `--lcars-font-sans`/`-mono`
  um, Pre-Paint-Cookies `neo_font_sans`/`neo_font_mono`, Registry in
  `src/lib/fonts.ts`). Wer eine andere Textschrift als Antonio wählt, bekommt
  normale Groß-/Kleinschreibung statt LCARS-Versalien — die Farben und Formen
  bleiben.
- **Abschaltbares LCARS-Design (minimalistisches UI)** — wer es lieber schlicht
  mag, deaktiviert im Profil unter „Darstellung → Oberfläche“ das LCARS-Design
  und bekommt stattdessen ein schlankes, minimalistisches Interface: System-
  schrift, keine dekorativen Elbows/Balken/Versalien, kein Header — die gesamte
  Navigation liegt links in der Sidebar (auf dem Handy als reine Symbole). Es
  Hell oder dunkel ist davon **unabhängig** (eigene Achse `data-mode`, siehe
  `src/lib/colorMode.ts`) — jede Kombination ist möglich. Rein CSS-basiert
  (gemeinsamer Selektor `html[data-ui^="minimal"]`, Pre-Paint-Cookie `neo_ui`),
  die eigentliche Zugriffskontrolle bleibt unberührt.
- **Tutorial-Seite** — erklärt alle Funktionen für Besucher, User und
  Spielleitung. Die Abschnitte und ihre Anker-ids liegen zentral in
  `src/lib/tutorialSections.ts`, damit Changelog-Deep-Links nicht ins Leere
  zeigen (ein Test prüft, dass jede id als `htmlId` auf der Seite steht).
  Erreichbar ist sie über den Menüpunkt **„Hilfe"** (Fragezeichen) der
  UserNav — im Header (LCARS) wie in der Sidebar (minimalistisches UI), und
  nur für Angemeldete. Im Footer steht sie seit v1.39 nicht mehr.
- **Kontexthilfe: ein Fragezeichen auf jeder Seite**
  (`src/components/help/`) — wer ohne Konto liest, käme über den Menüpunkt
  gar nicht an eine Erklärung; und wer mitten in einem Formular steckt, will
  die Seite nicht verlassen, um nachzuschlagen. Deshalb trägt jede
  Bereichsseite oben rechts einen **Icon-Knopf mit Fragezeichen**
  (`HelpButton`), der die Anleitung zu genau diesem Bereich als Fenster
  (`ModalOverlay`) öffnet — mit `width={1040}` und `tall` deutlich größer als
  ein Formular-Overlay (`tall` hebt die Höhe von 85vh auf 92vh): Es ist zum
  **Lesen** da, und bei 760px stünde der Text in einer schmalen Säule ohne
  Platz für die Schemata. Unten im Fenster führt ein Link auf denselben
  Abschnitt der Anleitung.

  Den Inhalt bekommt der Knopf als `children` von der jeweiligen Seite
  gereicht (fast immer eine Server-Komponente), statt ihn selbst zu
  importieren: So bleiben die Anleitungstexte server-gerendert und wandern
  nicht in das Browser-Bündel jeder Seite, auf der ein Hilfe-Knopf steht. Für
  die drei Seiten, deren Kopfzeile in einer Client-Komponente steckt
  (Charakterliste, Chronologie, Landingpage), wird der fertige Knopf als Prop
  durchgereicht — derselbe Mechanismus. Die Kopfzeile baut `HelpHeading`
  (Augenbraue, `h1`, Knopf); es setzt selbst auf `HelpTitleRow` auf, das
  Seiten mit eigener Überschrift (eigene `h1`-Klasse wie
  `lcars-data-row-heading`, Augenbraue unter dem Titel, Titel aus den Daten)
  direkt verwenden. Der Knopf hat bewusst keine Klassen-Prop: Er sitzt überall
  in derselben Zeile.

  Die Texte liegen als **wiederverwendbare Bausteine** in
  `src/components/help/guides/` — reines JSX ohne Hooks und ohne
  `"use client"`, damit dieselbe Datei aus dem Client-Fenster UND aus der
  server-gerenderten Anleitung eingebunden werden kann. Denn jeder Baustein
  steht an zwei Stellen: im Fenster seiner Seite und gesammelt in einem
  Abschnitt von `/tutorial` (`seiten-im-ueberblick`, `mein-bereich`,
  `spielleitung-admins`). Zwei Fassungen desselben Textes liefen unweigerlich
  auseinander. Abgedeckt sind die zehn Bereiche des Leitungs-Menüs, „Meine
  Inhalte" und das Profil sowie die fünf öffentlichen Seiten des Hauptmenüs.

  Jeder Abschnitt (`GuideSection`, `<h3>`) trägt ein kleines **Schema** seiner
  Maske (`src/components/help/figures/`) — Inline-SVG statt Screenshot: Die
  Farben kommen aus den Theme-Tokens (`var(--lcars-…)`), die Bilder machen
  also Farbschema und Hellmodus mit, veralten nicht mit der ersten
  Layout-Änderung und bringen keine Binärdateien ins Repo. Ab 900px steht das
  Schema neben seinem Text, darunter fällt es darunter. Rahmen, Farben und
  Bausteine teilen sich alle Schemata in `help/GuideFigure.tsx`.

  Die **Charaktererschaffung** ist der älteste und längste dieser Bausteine
  (`src/components/character/CharacterCreationGuide.tsx`, acht Abschnitte).
  Ihr Knopf steht auf **allen drei** Seiten, an denen man an einer Figur
  arbeitet: `/user/characters`, `/user/characters/new` und
  `/user/characters/[characterId]` — nachschlagen soll nirgends heißen, die
  halb ausgefüllte Seite zu verlassen. Er trug bis v1.39 die Aufschrift
  „Erschaffung erklärt" und ist seitdem dasselbe Fragezeichen wie überall
  sonst.
- **Markdown-Vault als Ursprungsimport** — Inhalte lassen sich initial aus
  `.md`-Dateien mit YAML-Frontmatter (Obsidian-kompatibel) importieren; neue Inhalte
  entstehen danach direkt in der App (Datenbank als alleinige Source of Truth).
  Admins können im selben Frontmatter-Format zusätzlich einzelne oder mehrere
  `.md`-Dateien direkt im Adminbereich hochladen — Datenbank-Einträge, Missionen,
  Charaktere und Missionslogs —, ohne dafür das CLI-Ingest-Skript zu brauchen.
  Jede Datei wird zunächst nur geparst und als durchblätterbare Vorschau
  angezeigt (Datei 1 von N mit Vor-/Zurück-Navigation), in der sich alle
  Felder inklusive Text noch bearbeiten lassen, bevor sie einzeln bestätigt
  wird.
- **DB-Backup** — der komplette Datenbankinhalt (seit Dateiformat 2 inklusive
  AP-Konto, Talenten, Schwerpunkten, Hausregeln, Sessions, Notizen, Fassungen,
  Bildern und Rollen) lässt sich im Admin-Panel als
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
  standardmäßig vorausgewählt — und ändern sich Name/Titel oder Aliase eines
  Inhalts, zieht `src/lib/autolinkSync.ts` die Verlinkungen aller anderen
  Inhalte per `after()` im Hintergrund nach: neue Schreibweisen werden
  verlinkt, bestehende `[[Wikilinks]]` auf den alten Namen umgeschrieben) und „Gespräche-Fließtext erzeugen" (Backfill für
  vor Einführung des Features abgeschlossene Dialoge). Wer `dialogues.moderate`
  hat (per Default Admins), darf als Moderation jede Nachricht in jedem Gespräch
  bearbeiten oder löschen, auch fremde und auch in bereits abgeschlossenen
  Gesprächen, dessen Metadaten (Titel/Datum/Schauplatz/Ort/Tags — nicht den
  Verlauf) direkt auf der Gesprächsseite bearbeiten, sowie jederzeit den Besitzer
  eines Gesprächs neu zuordnen. Eine weitere Unterseite, das Fehler-Log, listet
  alle unerwarteten Serverfehler (Zeitpunkt, Route, Meldung, Build, Digest); zusätzlich
  erhält die Administration jeden Morgen um 6 Uhr (Berliner Zeit) automatisch eine
  Mail mit allen Fehler- und Audit-Log-Einträgen der letzten 24 Stunden.
  Die Spielleitung hat ein eigenes „Leitung“-Dropdown im Header, das getrennt
  neben dem Admin-Menü steht (wer beide Rollen hat, sieht beide Menüs
  nebeneinander), wie dieses **nach Aufgabe gegliedert** ist (Kampagne ·
  Charaktere · Regelwerk · Inhalte) und in den Bereich `/gm` führt: Kampagnen-Seite (Ingame-Jahr,
  Charakter-Zuweisung, Missions-Übersicht mit Bearbeiten/Löschen/Besitzer:in-
  Zuordnung), Sessions, AP, Talente sowie alle aktuell offenen Gespräche — auch
  ohne eigene Teilnahme, verlinkt auf die read-only-Ansicht des jeweiligen
  Gesprächs. Über jedes neu
  begonnene Gespräch wird jeder aktive GM-Account zusätzlich automatisch per
  Mail/Push informiert.
- **Menü für angemeldete Konten** (`HeaderUserNav.tsx`) — vier Pills:
  **Profil** (Aufklapp-Menü mit „Charaktere" — nur mit eigenen Figuren —,
  „Meine Inhalte" und „Einstellungen"), **Leitung**, **Admin** und
  **Logout**. Alle drei Menüs teilen sich dieselbe Dropdown-Komponente
  (`NavDropdown`), die Einträge werden nach Rechten gefiltert und nach
  Gruppen überschrieben. Der Logout steht im LCARS-Header immer allein in
  der zweiten Reihe (`grid-column: 1` auf `.lcars-usernav-form` — die erste
  Spalte der laufenden Reihe ist belegt, also rutscht er in die nächste,
  egal wie viele Pills davor stehen); im minimalistischen UI ist die Nav
  eine Spalte, dort spielt es keine Rolle. Bis v1.29.47 standen Charaktere,
  Inhalte und Profil als drei einzelne Pills daneben — zusammen mit den
  Staff-Menüs und dem Logout sprengte das die Zeile, und drei der sechs
  Pills führten in denselben Bereich (`/user`).
- **Custom-404/500-Seiten** — unerwartete Serverfehler zeigen eine
  LCARS-gestaltete 500-Seite statt der Next.js-Standardfehlerseite; alle
  Besucher sehen eine freundliche Meldung mit Referenz-Code, eingeloggte
  Admins zusätzlich die volle Fehlermeldung inkl. Stacktrace. Jeder
  Serverfehler (auch bereits im Code abgefangene) wird dauerhaft über
  `src/instrumentation.ts` bzw. `logCaughtError()` in der Tabelle
  `error_logs` protokolliert und ist im Adminbereich unter „Fehler-Log“
  einsehbar. Jeder Eintrag trägt dabei die **Herkunft des werfenden Codes**
  (`app_version`, `deploy_context`, `commit_ref` — zusammengestellt in
  `src/lib/deployInfo.ts` aus `APP_VERSION` und Netlifys Build-Variablen, die
  `next.config.ts` per `env` zur Build-Zeit einsetzt). Ohne sie ist einem
  Eintrag nicht anzusehen, welcher Build ihn geworfen hat: Netlify hält jeden
  früheren Deploy unter seinem Permalink und jede Deploy-Preview dauerhaft
  erreichbar, und diese alten Lambdas sprechen mit derselben Live-Datenbank —
  ein Aufruf von außen lässt dort Code laufen, der beliebig alt sein kann
  (genau so entstanden nach v1.34.3 „column \"visibility\" does not exist"-
  Einträge auf `/`: aus Builds, die noch auf die inzwischen entfernte Spalte
  filterten). Ausgenommen sind die Render-Fehler, die React selbst wieder
  auffängt (PPR-Resume, siehe `src/lib/recoverableRenderErrors.ts`): Sie
  sind kein Absturz — die Antwort geht raus, React rendert den betroffenen
  Teil nur im Browser — und würden das Protokoll sonst zudecken.
- **Datenbank-Assistent (RAG)** — ein KI-Assistent (unter `/rag` sowie unterhalb der
  Volltextsuche auf `/search`) beantwortet Fragen zum Kampagneninhalt in
  natürlicher Sprache. Die Frage wird per OpenAI-Embedding vektorisiert, **hybrid**
  (semantische Vektorsuche + lexikalische Keyword-/Trigramm-Suche) gegen die
  vektorisierten Inhalte (`content_embeddings`, pgvector) gematcht, und Cloudflare
  Workers AI formuliert daraus streamend eine Antwort mit Quellen-Angabe —
  gefiltert nach den Leserechten des Betrachters (Entwürfe fließen nur ein,
  wenn erlaubt). Details siehe „Datenbank-Assistent (RAG)" unter Deployment.
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
| Schriften  | Antonio & Share Tech Mono, alternativ wählbar (`next/font`)         |
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

# Verschlüsselung zur Datenbank: Ohne DB_SSL entscheidet das sslmode der
# DATABASE_URL. Steht die Datenbank NICHT im selben privaten Netz wie die
# App, gehört `?sslmode=require` an die URL (oder DB_SSL="require") — sonst
# laufen auch die Passwort-Hashes im Klartext über die Leitung.
# DB_SSL="require"

# Pfad zum Markdown-Vault (für die Ingestion)
VAULT_PATH="/pfad/zum/vault"

# Cache-Revalidation nach dem Ingest (siehe Hinweis unten)
SITE_URL="http://localhost:3000"
REVALIDATE_SECRET="ein-langes-zufaelliges-secret"

# Datenbank-Assistent (RAG) — optional; fehlen die Schlüssel, ist /rag deaktiviert
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

Die Datenbank braucht dafür die Extensions **`pg_trgm`** (Volltextsuche) und
**`vector`** (pgvector, Grundlage des Datenbank-Assistenten): ohne pgvector
scheitert die Anlage von `content_embeddings`, und alles, was Inhalte
endgültig löscht, läuft danach in eine fehlende Tabelle. Auf verwalteten
Diensten (Railway, Neon, Supabase) sind beide vorhanden und müssen nur
aktiviert werden; lokal genügt unter Debian/Ubuntu
`apt-get install postgresql-16-pgvector`.

**Für die DB-Integrationstests** (`npm run test:integration`) gilt dasselbe —
sie laufen gegen eine eigene, leere Datenbank mit demselben Schema. In CI
übernimmt das der Service-Container `pgvector/pgvector:pg16` (siehe
`.github/workflows/ci.yml`); das Schema wird dort direkt mit `psql` eingespielt,
nicht über `npm run db:setup` — das Skript fragt interaktiv nach der
Schema-Datei und würde in einem Runner hängen.

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

**Welche Tabellen wo auftauchen**, steht als eine Liste in
[`src/lib/dbTables.ts`](src/lib/dbTables.ts). Daraus leiten sich beide Seiten
ab:

- **Tabellenbrowser** (`VIEWABLE_TABLES`): jede Tabelle des Schemas außer den
  reinen Geheimnis-Tabellen (`password_setup_tokens`). Die vier
  Inhaltstabellen sieht jeder mit `sql_read`, alles andere verlangt
  zusätzlich `db_view_system_tables`; `users` steht ohne `password_hash` da
  und ist wie die übrigen Auth-Tabellen gegen Schreibzugriff gesperrt
  (`PROTECTED_WRITE_TABLES` in [`src/lib/dbInspect.ts`](src/lib/dbInspect.ts)).
- **DB-Backup** (`BACKUP_TABLES` und `BACKUP_EXCLUDED_TABLES`): Seit
  **Dateiformat 2** stehen dort alle Inhalts- und Kampagnentabellen. Draußen
  bleiben nur `users` (eigenes Backup, siehe unten), die Betriebsdaten
  (Sperren, Protokolle, gelesene Neuigkeiten) und die Einbettungen, die
  ohnehin neu entstehen — jede mit Begründung in der zweiten Liste.

  Bis Format 1 war die Auswahl eng, weil der Restore jede genannte Tabelle
  leerte und eine ältere Datei die neu aufgenommene nicht kannte. Seit
  Format 2 fasst der Restore **nur an, was die Datei mitbringt**, und die
  Sorge entfällt. Was er nicht verhindern kann, ist `TRUNCATE … CASCADE`:
  Wer `characters` wiederherstellt, leert alles, was per Fremdschlüssel daran
  hängt. Genau daran krankte die enge Auswahl — `character_ap_entries`,
  `game_session_characters`, `planned_session_characters` und
  `timeline_event_characters` wurden beim Restore mit geleert und mangels
  Daten in der Datei **nie wieder gefüllt**: Das AP-Konto einer Runde war
  nach einem Restore weg. Beim Einspielen einer Datei im alten Zuschnitt
  nennt die Zusammenfassung deshalb die fehlenden Tabellen
  (`RestoreDbSummary.missingTables`), und das Admin-Panel zeigt sie an.

Vier Wächter halten die Listen aktuell:

1. `src/lib/dbTables.test.ts` gleicht sie mit `scripts/schema.sql` ab — eine
   neue Tabelle oder Spalte, die dort fehlt, macht den Test rot.
2. Derselbe Test verlangt, dass **jede** Tabelle in genau einer der beiden
   Backup-Listen steht: sichern oder mit Grund auslassen, eine dritte
   Möglichkeit gibt es nicht.
3. `tests/integration/dbBackup.test.ts` und der nächtliche Lauf
   (`scripts/backup-db.ts`) stellen dieselbe Frage an die **laufende**
   Datenbank. Eine Tabelle, die jemand direkt an der produktiven Datenbank
   anlegt, sieht kein Parser — der Backup-Lauf meldet sie, nachdem das
   Backup des Tages sicher im Bucket liegt.
4. `dbTables.test.ts` liest zusätzlich die Fremdschlüssel aus
   `scripts/schema.sql` und prüft, dass in `BACKUP_TABLES` jede Tabelle hinter
   ihren Zielen steht. Der Restore fügt in Listenreihenfolge ein; ein Kind vor
   seinem Elternteil lässt sein `INSERT` an der Fremdschlüssel-Prüfung
   scheitern und rollt die gesamte Wiederherstellung zurück.

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
| `npm run db:archive`        | Importiert nur die Datenbank-Einträge                                                                                                               |
| `npm run db:revalidate`     | Invalidiert nur die Caches (siehe `SITE_URL`)                                                                                                    |
| `npm run db:seed-talents`   | Spielt den Talent-Katalog aus `scripts/seed/talents.json` ein (idempotent)                                                                        |
| `npm run db:seed-focuses`   | Spielt den Schwerpunkt-Katalog aus `scripts/seed/focuses.json` ein (idempotent)                                                                   |
| `npm run embed:all`         | Baut den Vektor-Index des Datenbank-Assistenten für alle Inhalte (neu) auf — Backfill, idempotent (siehe „Datenbank-Assistent (RAG)")                  |
| `npm run db:reset`          | Setzt die Datenbank zurück                                                                                                                       |
| `npm run db:backup`         | Exportiert die komplette DB als JSON nach Cloudflare R2 (siehe „Tägliches DB-Backup")                                                            |
| `npm run db:backup:cleanup` | Löscht R2-Backups, die älter als 30 Tage sind                                                                                                    |
| `npm run db:purge-deleted`  | Entfernt weich gelöschte Inhalte endgültig, deren `deleted_at` älter als 7 Tage ist                                                              |
| `npm run test`              | Führt die Unit-Tests aus (`src/**/*.test.ts`)                                                                                                    |
| `npm run test:e2e`          | Führt die Playwright-E2E-Tests aus (öffentliche Seiten, Offline-PWA, Zugangs-Gates der kontogebundenen Routen, Komponenten-Galerie inkl. Charakter-Assistent, Bogen-Ansicht, Chronologie, Einstiegs-Liste und aufklappbaren Abschnitten sowie Layout-/Schrift-Regressionen an beiden Viewports) |
| `npm run test:integration`  | Führt die DB-Integrationstests aus (`tests/integration/`, braucht eine erreichbare Postgres-Instanz **mit pgvector**, siehe unten)               |

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
│       ├── archive.ts        # Datenbank-Einträge + Querverweise
│       └── shared.ts         # Markdown→HTML, Validierung
└── src/
    ├── app/                  # Next.js App Router (Seiten & API-Routes)
    │   ├── page.tsx           # "/" — Landingpage (anonym) / Dashboard (eingeloggt)
    │   ├── Dashboard.tsx       # Persönliches Dashboard: je Person konfigurierbar (dashboardSections.ts)
    │   ├── characters/        # Charakterübersicht, -detailseiten & abgeschlossene Gespräche (dialogues/[slug])
    │   ├── missions/
    │   ├── archive/
    │   ├── dialogues/         # Spielansicht OFFENER Gespräche (Formular, Abschluss); abgeschlossene → /characters/dialogues/[slug]
    │   ├── rag/               # Datenbank-Assistent (RAG-Chat)
    │   ├── search/            # Volltextsuche + eingebetteter Datenbank-Assistent
    │   ├── tutorial/          # Anleitung für Besucher/User/Spielleitung
    │   ├── login/, activate/, forgot-password/
    │   ├── _shared/           # Von mehreren Bereichen genutzte Panels/Actions
    │   │   └── import/         #   Markdown-Upload: Panel + Actions (von /admin/import UND /user/import)
    │   ├── user/              # Eigenes Profil, Settings, eigene Inhalte anlegen/verwalten
    │   │   ├── characters/     #   Eigene Charaktere: Übersicht, anlegen, bearbeiten, Werte ([id]/stats)
    │   │   └── import/         #   Markdown-Upload für alle (je Inhaltsart gegatet, siehe importAccess.ts)
    │   ├── admin/             # Admin-Bereich (staff-baseline, feiner je Unterseite):
    │   │   ├── users/          #   Nutzerverwaltung (Tabelle + Detailseite [id]/edit/)
    │   │   ├── permissions/    #   Rollen-Editor: Rollen anlegen/bearbeiten + zuweisen
    │   │   ├── campaign/       #   Kampagne: Ingame-Jahr, Charakter-Zuweisung, Missionen
    │   │   ├── characters/     #   Charakter-Zuweisung
    │   │   ├── dialogues/      #   Alle offenen Gespräche, auch ohne eigene Teilnahme
    │   │   ├── db/             #   DB-Backup, Tabellenbrowser, freies SQL-Abfragefeld
    │   │   ├── scripts/        #   Bulk-Autolinking, Gespräche-Fließtext, Cache-Rebuild, u.a.
    │   │   ├── audit-log/      #   Sicherheits-Audit-Log + Content-Aktivitätsfeed
    │   │   ├── error-log/      #   Protokollierte Serverfehler (Zeitpunkt, Route, Meldung, Build)
    │   │   ├── content/        #   Owner-/Sichtbarkeits-Übersteuerung fremder Inhalte
    │   │   └── import/         #   Markdown-Datei-Upload → neue Einträge (mit Vorschau), Eigentümer frei wählbar
    │   ├── api/               # /api/characters, /api/health …
    │   ├── error.tsx           # Custom 500-Seite (Server Components/Route Handlers)
    │   ├── global-error.tsx    # Custom 500-Seite bei Fehlern im Root-Layout selbst
    │   ├── manifest.ts        # PWA-Manifest (Icons, inkl. maskable)
    │   ├── robots.ts
    │   └── sitemap.ts
    ├── components/lcars/      # LCARS-UI-Komponenten
    ├── components/help/       # Fragezeichen-Knopf, Fenster & Bereichs-Anleitungen
    ├── context/              # React-Context (Neo)
    ├── hooks/                # useNeo, usePageMeta …
    ├── lib/                  # DB-Zugriff & Datenabfragen
    ├── styles/               # CSS jenseits von Tailwind (siehe unten)
    │   ├── tokens.css         # Design-Tokens (:root + @theme) inkl. Responsive-Overrides
    │   ├── lcars-themes.css   # Nutzer-Farbthemes (html[data-theme="…"])
    │   ├── minimal-ui.css     # Minimalistisches UI (html[data-ui="minimal"])
    │   ├── color-mode.css     # Hell/Dunkel (html[data-mode="light"])
    │   ├── fonts.css          # Schriftwahl (html[data-font-sans]/[data-font-mono])
    │   ├── lcars-components.css  # Sammel-Import der Domänen-Dateien
    │   └── lcars-components/  # Je Domäne eine Datei (header, archive, shared, …)
    ├── types/                # TypeScript-Typen
    └── utils/                # Stardate, Datumsformatierung …

### Komponenten

**„Nach oben"** (`ScrollTopButton`) steht als letztes Kind der Scrollfläche in
`MainContent` und damit auf jeder Seite: unten rechts, sichtbar erst ab
120 gescrollten Pixeln. Gescrollt wird `.lcars-main-content` und nicht das
Fenster, deshalb hängt der Zuhörer an diesem Element (gefunden per `closest`
vom eigenen Kasten aus) und der Kasten ist `sticky` statt `fixed`. Der Kasten
bleibt auch unsichtbar im Baum — er ist der Anker für genau dieses `closest` —,
ist 0 Pixel hoch und lässt Klicks durch; der Knopf darin sitzt absolut
positioniert darüber. Wer Bewegung reduziert haben will, bekommt den Sprung
ohne Animation. Nach dem Klick wandert der Fokus auf `#lcars-main` — dasselbe
Ziel wie die Sprungmarke „Zum Inhalt springen": Der Knopf verschwindet oben
angekommen, und mit ihm ginge der Fokus sonst an den Seitenkörper verloren.
Auf Papier (`@media print`) ist er ausgeblendet.

Die Aktionen einer Inhaltsseite (Owner, Sichtbarkeit, Folgen/Merken, Teilen,
Bilder, Bearbeiten, Löschen) stehen in `ContentActionsPanel` — einem
zugeklappten `<details>` am **Fuß** des Inhalts. Vorher saßen sie zwischen
Titel und Text: gelesen wird häufiger als verwaltet. Der Lesemodus-Schalter
bleibt oben, er gehört zum Lesen. Nicht angemeldete Besucher sehen kein Feld,
sondern nur die Bilder-Galerie.

Den Kopf einer Inhaltsseite — Titel plus beschriftete Metazeilen — stellt
`ContentDetailHeader`. Missions-Zusammenfassung, Logbuch-Seite und
Gesprächsseite teilen ihn sich; Verweise darin (Teilnehmer, Ort, Autor) sind
`ContentChip`s, deren Farbe aus `CONTENT_TYPE_COLOR` bzw. dem Missionsstatus
kommt. Die Missionsseite trug bis dahin als einzige Inhaltsseite noch einen
eigenen Kopf.

Ebenso die Listen: Chronologie, Datenbank und seit dem Redesign auch die
Logbuch-Übersicht einer Mission (`MissionLogOverview`) bauen auf denselben
Bausteinen `ChronoRow` (Datumsspalte · Schiene mit Punkt · Karte) und
`ChronoCard`. Die Missionsseite war zuvor eine Master-Detail-Ansicht mit einer
schmalen, mitscrollenden Log-Schiene daneben — der einzigen Übersicht der App
außerhalb dieses Systems. Die Zeile `LcarsLogEntry` gibt es weiterhin, sie
trägt jetzt nur noch die Charakter-Log-Liste.

Wiederkehrende UI-Muster leben als geteilte Bausteine statt als Kopie je
Seite: `LcarsAkteCard` (Karte mit farbiger Schiene, Titel, Meta-Zeile — die
Listen in Datenbank, Missionen, Suche, Profil, „Meine Inhalte“, Follows und
GM-/Admin-Übersichten), `FormPrimitives` (`FormField`, `SaveFooter`,
`SubmitButton`, Fehler-/Erfolgs-Toast), `ChoiceCardGroup` für die
Darstellungsoptionen, `ContentStateSwitch` für Owner- und Moderationsansichten,
`SessionDraftForm` als sichere Formulargrenze, `ConfirmSubmitIconButton` und
`DangerZoneButton` für bestätigungspflichtige Aktionen, `BackupPanel`
(Export/Import für DB- und User-Backup) sowie `BatchScriptPanel` (die
blockweise laufenden Admin-Skripte mit Fortschrittsbalken). Inhaltslabels,
-farben und Owner-Fähigkeit kommen gemeinsam aus `contentTypeFormat.ts`;
kanonische Lese- und Bearbeitungsadressen aus `contentRoutes.ts`.

Verhalten, das mehrere Komponenten teilen, steckt in Hooks: `useOverlayDismiss`
(Escape schließt, Hintergrund-Scroll gesperrt, optional Pfeiltasten fürs
Karussell — genutzt von allen Modals, Lightboxen und der Vollbild-Ansicht des
Charakterbogens) und `useReturnFocus` (Tastatur-Fokus zurück zum auslösenden
Element).

### Stylesheets

Gestaltet wird primär mit Tailwind-Utilities direkt im JSX; eigenes CSS gibt es
nur für das, was Tailwind nicht abbilden kann (komplexe Selektoren,
Container-Query-Einheiten, Keyframes, `:root`-Overrides, Pseudo-Elemente).
Dieses CSS liegt nach Domäne getrennt in `src/styles/lcars-components/`, damit
eine Regel und ihre Responsive-Overrides beieinander stehen; domänenübergreifend
Geteiltes (Overlays, Popover, Leerzustände, Skeletons, Toasts …) steht in
`shared.css`, das bewusst zuletzt importiert wird.

Reihenfolge und Cascade-Tier sind in `src/app/globals.css` kommentiert und nicht
beliebig: Tokens, Themes, minimales UI und Lesemodus müssen **unlayered**
bleiben, die Komponenten-Dateien laufen als `layer(components)` — Tailwind v4
lässt layered CSS immer gegen unlayered verlieren, unabhängig von Spezifität.

Wiederkehrende Werte stehen als Token in `tokens.css` statt als Literal in den
Regeln — neben Farben und Maßen auch die Flächen-Effekte `--lcars-scrim`,
`--lcars-shadow-float`, `--lcars-shadow-drop` und `--lcars-hover-tint`
(Letzteres aus `--lcars-secondary` abgeleitet und damit themefest).
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
- **`owner`** (optional) verweist per User-Slug auf den Owner des Inhalts — er
  entscheidet, wer einen Entwurf sieht und wer ihn veröffentlichen darf.
  Unbekannte/fehlende Werte brechen den Import nicht ab, der Inhalt bleibt dann
  ownerlos. Bei Mission-Logs fällt der Owner ohne `owner`-Feld automatisch auf
  den Spieler des `author`-Charakters zurück. Bei **Charakteren** landet `owner`
  in `characters.player_id` — der Web-Upload
  ([`commitCharacterMarkdown`](src/lib/markdownImport.ts)) setzt die Spalte
  seit v1.49; das CLI-Ingest (`scripts/ingest/characters.ts`) tut es weiterhin
  nicht, dort bleibt `player` im `metadata` nur ein Anzeigename. Eine Figur
  ohne `player_id` gehört niemandem: Sie steht in keiner Auswahlliste
  (`getCharactersForParticipantPicker` joint darüber) und ist für niemanden zu
  bearbeiten.
- Alles nach `<!-- private -->` wird beim Import abgeschnitten.

Datenbank-Einträge (`type: archive`) liegen im Ordner `Archiv/`, organisiert nach
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
related_missions: [erster-kontakt] # Slug → /chronologie/mission/…
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
  …) enthalten Ziel-`slugs`. Verweise auf andere Datenbank-Einträge landen in
  `archive_links` (Detailseite: „Verweise“ + Rückverweise „Erwähnt in“);
  Verweise auf Charaktere bzw. Missionen werden als verlinkte Chips angezeigt.

---

## 🚢 Deployment

Das Projekt ist für **Netlify** vorkonfiguriert (`@netlify/plugin-nextjs`).
`DATABASE_URL` als Environment-Variable im Netlify-Dashboard hinterlegen; die Ingestion
(`db:setup` / `db:ingest`) wird gegen die produktive Datenbank ausgeführt.

Der Produktionsbuild auf Netlify und der Playwright-Webserver verwenden
explizit Webpack (`next build --webpack` bzw. `next dev --webpack`). Damit
umgehen sie den sporadischen Turbopack-Resolverfehler von `next/font/google`;
der normale lokale Entwicklungsserver bleibt beim Next.js-Standard Turbopack.
Die globale Instrumentation trennt ihren DB-Logger zusätzlich über
`instrumentation.node.ts` vom Edge-Bundle, damit `postgres` und seine
Node-Built-ins dort nicht aufgelöst werden.

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
(Charaktere/Missionen/Missionslogs/Datenbank-Einträge/Dialoge, siehe „Soft-Delete
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
| `R2_ASSET_BUCKET_NAME`                      | Name des **öffentlichen** Asset-Buckets für hochgeladene Assets — Content-Bilder (`content-images/...`), Charakter-Portraits (`character-portraits/...`). Muss in Cloudflare als öffentlicher Bucket eingerichtet sein (eigene Domain oder r2.dev-URL). Für den App-Betrieb (Netlify) und die Migration nötig, **nicht** für den Backup-Cronjob. |
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

Charaktere, Missionen, Missionslogs, Datenbank-Einträge und Dialoge werden beim
Löschen nicht mehr sofort aus der Datenbank entfernt, sondern nur mit einem
`deleted_at`-Zeitstempel markiert (siehe `scripts/schema.sql`). Für alle
außer Admins verschwinden sie damit sofort aus Suche und allen
Übersichten — Admins sehen sie weiterhin im Papierkorb unter
`/admin/content/trash` (Adminbereich → "Papierkorb") und können sie dort
wiederherstellen oder sofort endgültig löschen. Ohne manuelles Eingreifen
entfernt der tägliche Cronjob (`scripts/purge-soft-deleted.ts`, siehe oben)
weich gelöschte Inhalte automatisch nach 7 Tagen.

### Bilder für Inhalte

Charaktere, Missionen, Missionslogs und Datenbank-Einträge (nicht Gespräche —
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
(bei Charakteren/Missionslogs nur der Owner, bei Missionen/Datenbank-Einträgen
zusätzlich jeder Admin). Hochgeladen wird **Datei für Datei** (eine Server
Action je Bild) und große Bilder werden vorher im Browser verkleinert
(`src/lib/imageUpload.ts`, längste Kante 2000 px): ein Formular mit mehreren
Originalen riss sonst das Payload-Limit der Plattform (Netlify/Lambda: 6 MB) —
die Anfrage wurde abgewiesen, bevor der Code sie sah, und die Galerie blieb
mangels `catch` bei „Wird hochgeladen…" stehen. Jeder Fehlschlag wird jetzt
angezeigt statt verschluckt. Die vorhandenen Galerie-Bilder werden weiterhin über
die sichtbarkeitsgeprüfte Route `/api/content-images/[id]` ausgeliefert (die
jetzt aus dem Asset-Bucket liest); neu am Asset-Bucket hängende Assets
(hochgeladenes Charakter-Portrait bei der Anlage) nutzen die
direkte öffentliche URL (`R2_ASSET_PUBLIC_BASE_URL`). Bei Charakteren lässt
sich eines der hochgeladenen Bilder als Profilbild festlegen
(`characters.portrait`); das Portrait öffnet per Klick ein Karussell über
alle hochgeladenen Bilder. Ein Portrait kommt ausschließlich als **hochgeladene Datei**: das frühere
Feld „oder Bild-Adresse" ist weg, und `readCharacterHead` liest gar kein
Adressfeld mehr aus dem Formular, sondern bekommt den bisherigen Stand vom
Aufrufer gereicht — eine fremde Adresse kann damit auch aus einem von Hand
gebauten Request nicht mehr gesetzt werden. Die beiden verbliebenen Wege, auf
denen eine Adresse hereinkommt (Vault-Ingest und der Markdown-Import im
Adminbereich), **laden das Bild beim Import einmal herunter und legen es als
eigenen Upload ab** statt die Adresse zu speichern (`src/lib/portraitImport.ts`);
klappt das nicht, entsteht der Eintrag ohne Portrait und der Lauf sagt es.
Bestandsdaten zieht `npm run assets:import-portrait-links` nach: es überführt
jede noch gespeicherte fremde Adresse und jede eingebettete `data:`-URL aus
`characters.portrait` und `metadata.portraitSource` in einen Upload
(idempotent, `--dry-run` zeigt vorab, was käme; eigene Uploads und die
`/api/content-images/…`-Pfade bleiben unberührt, siehe
`src/lib/portraitSource.ts`). Weil dieser Import serverseitig eine fremde
Adresse abruft, prüft er jedes Ziel — auch über Umleitungen hinweg — gegen
Schema und interne Adressbereiche, damit er nicht zum Werkzeug für Anfragen
ins eigene Netz wird (SSRF), und deckelt Größe und Wartezeit. Beim Anlegen und Bearbeiten der Stammdaten lässt
sich der **Bildausschnitt** selbst wählen (`PortraitPicker.tsx`,
Rechenweg in `src/lib/portraitCrop.ts`): ziehen verschiebt, ein Regler
vergrößert bis 4×, der Rahmen zeigt den hochkant stehenden Bildkasten des
Bogens samt Schräge. Hochgeladen wird seit v1.29.57 das **Original**;
der Ausschnitt ist eine **Anweisung** darauf (`metadata.portraitCrop`: Zoom +
Mittelpunkt) und wird erst beim Anzeigen angewandt — am Bildschirm per CSS
(`previewStyle`), im PDF über dieselbe Rechnung (`pdfCropBox`, `overflow:
hidden` am `<View>` plus `objectFit`/`objectPosition` am `<Image>`), in den
Karten der Übersichten ebenso. Vorher buk der Browser den Ausschnitt auf einer
Leinwand ein und lud das Ergebnis hoch: in `characters.portrait` lag damit
eine verlustbehaftete Kopie, jedes Nachjustieren schrieb eine weitere in den
Bucket, und ein Bild von einem fremden Server ließ sich wegen der
„verunreinigten" Leinwand gar nicht zuschneiden. Für den Altbestand bleibt
`metadata.portraitSource` die Quelle: dort steht das Original, auf das der
gespeicherte Ausschnitt passt — `resolvePortraitView()` nimmt es, wo es eines
gibt, sonst das Portrait selbst. Bei Missionen, Missionslogs und
Datenbank-Einträgen lässt sich stattdessen ein bereits hochgeladenes Bild direkt
aus der Markdown-Editor-Toolbar heraus als `![Bild](...)` in den Text
einfügen. Wird der zugehörige Inhalt endgültig gelöscht (Papierkorb-Purge
oder Admin-Direktlöschung), räumt `purgeContentImagesFor()`
(`src/lib/purgeContent.ts`) automatisch auch dessen Bilder samt R2-Objekten
mit auf — bleibt das aus (z. B. bei einem Fehler), tauchen verwaiste Bilder
weiterhin in der Admin-Übersicht `/admin/content/images` (Adminbereich →
"Bilder") auf, die alle hochgeladenen Bilder über alle Inhalte hinweg mit
Vorschau zeigt und pro Bild einen Admin-Löschen-Button unabhängig vom
jeweiligen Owner bietet.

### Charakterbogen auf der Charakterseite

Das Hochladen von PDF-Charakterbögen gibt es nicht mehr (Tabelle
`character_sheets` und die Route `/api/character-sheets/<id>` sind mit v1.27.23
entfallen). An seine Stelle tritt der in der Datenbank gepflegte Bogen selbst: auf der
Charakterseite führt der Knopf **„Charakterbogen"** auf
`/characters/<slug>/sheet` — dieselbe Vorlage wie die Vorschau auf der eigenen
Charakterseite, als reine Ansicht
(`src/components/character/PersonnelFileView.tsx`, Maße aus
`src/lib/personnelFileLayout.ts`). Sichtbar ist die Seite für die
Spieler:in/den Spieler des Charakters (`player_id`) und für die Spielleitung
(`gm.access`); für alle anderen gibt es sie nicht (`notFound()` statt 403, damit
nicht durchscheint, dass es sie gäbe). Gepflegt werden die Werte
ausschließlich vom Owner auf seiner eigenen Charakterseite
(`/user/characters/<id>`, Panel „Werte"). Der PDF-Export
`/api/export/character-sheet?characterId=…` folgt derselben Regel: owner-
gescopte Abfrage, für `gm.access` zusätzlich jeder Charakter.

Beim Ausrollen: **vor** `scripts/migrate-pr62.sql` einmal
`npx tsx --conditions=react-server scripts/purge-character-sheet-uploads.ts`
laufen lassen — das Skript löscht die bereits hochgeladenen PDFs im
Asset-Bucket, deren `r2_key` die anschließend gelöschte Tabelle hält.

### Datenbank-Assistent (RAG)

Der Datenbank-Assistent (`/rag` sowie eingebettet unter der Volltextsuche auf
`/search`) beantwortet Fragen zum Kampagneninhalt auf Basis des vorhandenen
Datenbestands — ein klassisches **RAG** (Retrieval-Augmented Generation):

1. **Embeddings & Index.** Jeder Inhalt (Charaktere, Missionen, Mission-Logs,
   Datenbank-Einträge und abgeschlossene Gespräche) wird typabhängig in Chunks
   zerlegt (`src/lib/embeddings.ts`), per **OpenAI** `text-embedding-3-small`
   (volle 1536 Dimensionen) eingebettet und in der Tabelle
   **`content_embeddings`** (Extension **pgvector**) abgelegt. RBAC-Felder
   (`owner_id`/`is_draft`/`is_active`) sind auf der Embedding-Zeile
   **denormalisiert**, damit die Suche ohne Join filtern kann (gleiche Logik wie
   `canView()`). Die Vektoren werden als `'[…]'::vector`-Literal inline gecastet
   (kein pgvector-npm-Paket, `prepare:false`-kompatibel).
2. **Aktualisierung.** Content-Mutationen (Anlegen/Bearbeiten/Veröffentlichen/
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

**Kosten:** Initial-Embedding der kleinen Fan-Datenbank < 0,10 $; Workers AI läuft
für das erwartete Fragevolumen voraussichtlich im Free Tier.

**Ratelimit:** Acht Fragen pro Minute und Konto, gezählt in der Tabelle
`rag_requests` ([`src/lib/ragLimiter.ts`](src/lib/ragLimiter.ts)) — dasselbe
Muster wie `login_attempts`/`password_reset_requests`, inklusive
`pg_advisory_xact_lock` gegen gleichzeitige Anfragen. Bewusst in der
Datenbank statt im Prozessspeicher: Auf serverless bekommt jede
Funktionsinstanz ihren eigenen Speicher, ein prozess-lokaler Zähler skaliert
also mit der Instanzzahl mit, statt zu bremsen — und am anderen Ende hängt
ein abrechnender Anbieter. Alte Zeilen räumt der Schreibpfad selbst nach 24
Stunden ab.

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

**Achtung bei additiven Spalten:** Wird eine Spalte hinzugefügt, die die App
anschließend liest (z.B. `users.font_sans`/`font_mono` in `USER_COLUMNS`), muss
die Migration laufen, **bevor** der Stand ausgeliefert wird — auch für die
Deploy-Preview, die an derselben Datenbank hängt. Sonst scheitert jede Abfrage,
die einen User lädt, und die Seiten antworten mit 500. Dasselbe gilt für eine
neue **Tabelle**, die die App liest: `scripts/migrate-pr67.sql` legt
`rag_requests` an (das Ratelimit des Datenbank-Assistenten, siehe
[`src/lib/ragLimiter.ts`](src/lib/ragLimiter.ts)) — fehlt sie, antwortet
`/api/rag` mit 500, sobald jemand eine Frage stellt:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/migrate-pr67.sql
```

Ebenso `scripts/migrate-pr87.sql`: Es ergänzt `users` um `dashboard_prefs`
(was das Dashboard je Person zeigt, siehe
[`src/lib/dashboardSections.ts`](src/lib/dashboardSections.ts)). Die Spalte
steht in `USER_COLUMNS` und wird damit bei **jedem** Laden eines Users
mitgelesen — fehlt sie, scheitern Dashboard und Profil mit
`column "dashboard_prefs" does not exist`:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/migrate-pr87.sql
```

Ebenso `scripts/migrate-pr78.sql`: Es ergänzt `error_logs` um die drei
Herkunfts-Spalten (`app_version`, `deploy_context`, `commit_ref`, siehe
[`src/lib/deployInfo.ts`](src/lib/deployInfo.ts)). Fehlt die Migration, gibt es
zwar keine 500er — das Schreiben ins Fehler-Log ist in `try/catch` gekapselt —
aber das Protokoll bliebe still leer:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/migrate-pr78.sql
```

Ebenso `scripts/migrate-pr70.sql`: Es erweitert die Prüfbedingung von
`character_ap_entries.reason` um den Buchungsgrund `reset` (Zurücksetzen einer
abgeschlossenen Erschaffung, siehe oben). Fehlt die Migration, scheitert das
Zurücksetzen mit einer verletzten Check-Constraint:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/migrate-pr70.sql
```

Nach `scripts/migrate-pr62.sql` einmalig `npm run db:seed-talents` ausführen —
das füllt den neuen Talent-Katalog; ein zweiter Lauf ändert nichts und
überschreibt keine Anpassungen der Spielleitung.

`scripts/migrate-pr62.sql` ist selbst wiederholbar. Die eine Ausnahme ist
`dialogue_npc_speakers`: die Tabelle wird verworfen und neu angelegt, aber nur
solange sie noch die Form einer früheren Fassung desselben PR hat (erkennbar
an der Spalte `character_id`). Sie ist die einzige Stelle, an der steht, wer
in einem laufenden Gespräch für einen NPC schreiben darf — ein
bedingungsloses `DROP` würde dieses Recht bei jedem erneuten Lauf löschen.

---

## 📄 Lizenz

Privates Projekt. _Star Trek_ und _LCARS_ sind Marken von CBS Studios Inc.
Dieses Fan-Projekt steht in keiner Verbindung zu den Rechteinhabern.

---

<p align="center"><em>„Live long and prosper.“ 🖖</em></p>
