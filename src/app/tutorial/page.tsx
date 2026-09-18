import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { LcarsDataRow } from "@/components/lcars";
import InstallPwaPrompt from "@/app/user/InstallPwaPrompt";
import CharacterCreationGuide from "@/components/character/CharacterCreationGuide";
import PublicAreaGuides from "@/components/help/guides/PublicGuides";
import UserAreaGuides from "@/components/help/guides/UserGuides";
import GmAreaGuides from "@/components/help/guides/GmGuides";

export const metadata: Metadata = {
  title: "Tutorial",
  robots: { index: false },
};

// Öffentliche, statische Tutorial-Seite — erklärt das Archiv für drei
// Zielgruppen (Besucher/User/Spielleitung), erreichbar über /tutorial direkt,
// den Menüpunkt „Hilfe" (Fragezeichen, angemeldet — siehe HeaderUserNav.tsx)
// und einen Verweis im Profil. Als DataRow-Akkordeons strukturiert (gleiches
// Muster wie "Meine Inhalte"/Admin-Panel) statt einer langen Textwüste — die
// breitesten Themen (Markdown/Verlinkung/PWA) stehen standardmäßig offen,
// rollenspezifische Abschnitte eingeklappt.
//
// Drei Abschnitte bestehen ganz aus Bausteinen, die auch anderswo stehen:
// „Die Seiten im Überblick", „Mein Bereich" und der Leitungs-Teil von
// „Spielleitung & Admins" zeigen dieselben Texte, die auf der jeweiligen
// Seite hinter dem Fragezeichen-Knopf aufgehen (siehe components/help/) —
// eine Fassung im Tutorial und eine im Fenster liefen unweigerlich
// auseinander.
export default function TutorialPage() {
  return (
    <>
      <PageMeta title="Tutorial" section="tutorial" />
      <article className="mb-[10px] lcars-wide-column tutorial-content">
        <p className="lcars-eyebrow">Anleitung</p>
        <h1>Tutorial</h1>
        <p className="lcars-text">
          Diese Datenbank dokumentiert eine laufende Pen-&-Paper-Kampagne —
          Charaktere, Missionen, Einsatzberichte und Datenbank-Einträge, die
          sich mit jeder Session weiterentwickeln. Diese Seite erklärt alle
          Funktionen: was du auch ohne Konto sehen kannst, was du mit einem
          eigenen Konto selbst anlegen darfst, und was Spielleitung (GM) und
          Administration zusätzlich können. Klicke einen Abschnitt an, um ihn
          auf-/zuzuklappen.
        </p>

        <div className="flex flex-col gap-[10px] mt-[16px]">
          <LcarsDataRow
            value={1}
            htmlId="erste-schritte"
            label="Erste Schritte"
          >
            <div className="lcars-text flex flex-col gap-[12px]">
              <p>
                Frisch dabei? Angemeldet führt dich <strong>/willkommen</strong>{" "}
                durch den Einstieg: was dieses Archiv ist und welche Schritte
                anstehen — Passwort festlegen, Charakter anlegen, Erschaffung
                abschließen, erstes Logbuch schreiben, ein Gespräch beginnen. Zu
                jedem offenen Schritt steht dort ein Link, der direkt in den
                passenden Ablauf führt.
              </p>
              <p>
                Der Fortschritt wird nirgends abgehakt, sondern an deinen Daten
                abgelesen: sobald ein Charakter existiert, gilt der Schritt als
                erledigt — und wenn du ihn wieder löschst, ist er es auch wieder
                nicht. Die Liste steht zusätzlich auf deinem{" "}
                <strong>Dashboard</strong> und verschwindet dort von selbst,
                sobald alles erledigt ist. Die Seite{" "}
                <strong>/willkommen</strong> bleibt danach als Übersicht
                erreichbar.
              </p>
              <p>
                Nichts davon ist Pflicht: Wer nur mitlesen möchte, braucht weder
                Charakter noch Logbuch.
              </p>
            </div>
          </LcarsDataRow>

          <LcarsDataRow value={2} htmlId="fuer-besucher" label="Für Besucher">
            <div className="lcars-text flex flex-col gap-[12px]">
              <p>
                Ohne Konto lässt sich der Großteil der Datenbank lesen:{" "}
                <strong>Charaktere</strong> (Personalakten mit Biografie,
                darunter auch die Übersicht abgeschlossener{" "}
                <strong>Gespräche</strong>), <strong>Missionen</strong> (mit
                ihren Einsatzberichten, erreichbar über die{" "}
                <strong>Chronologie</strong>), das kategorisierte{" "}
                <strong>Datenbank</strong> (Personen, Orte, Fraktionen, Spezies,
                Objekte, Ereignisse, Theorien, NPCs und Sonstiges) sowie die{" "}
                <strong>Suche</strong> (Volltextsuche über alle diese Inhalte,
                erreichbar über das Lupen-Symbol im Menü).
              </p>
              <p>
                Jeder Eintrag ist entweder <strong>veröffentlicht</strong> oder
                ein <strong>Entwurf</strong>. Veröffentlichtes kannst du lesen,
                auch ohne Konto; ein Entwurf existiert nur für die Person, die
                ihn schreibt. Die früheren drei Stufen „Öffentlich/GM/Privat“
                gibt es nicht mehr — was fertig ist, gehört allen, was noch
                nicht fertig ist, niemandem sonst.
              </p>
              <p>
                Ein eigenes Konto kannst du dir nicht selbst anlegen — Zugänge
                werden ausschließlich von der Spielleitung oder Administration
                per Einladung vergeben (siehe nächster Abschnitt).
              </p>
              <p>
                <strong>Bilder</strong> zu einem Eintrag lädst du über den
                Bilder-Knopf im Aktionen-Feld hoch (Charaktere, Missionen,
                Logbücher, Datenbank-Einträge). Mehrere auf einmal sind möglich;
                jedes Bild geht einzeln los, und sehr große werden vorher
                automatisch verkleinert, damit der Upload nicht am Größenlimit
                scheitert. Klappt eines nicht, steht der Grund direkt darunter.
              </p>
              <p>
                In den drei Übersichten — <strong>Charaktere</strong>,{" "}
                <strong>Chronologie</strong> und <strong>Datenbank</strong> —
                steht links in der Karte ein kleines{" "}
                <strong>Vorschaubild</strong>, sofern zum Eintrag eines
                hinterlegt ist: bei einer Figur ihr Portrait, sonst das zuerst
                hochgeladene Bild. Einträge ohne Bild bleiben schlicht ohne — es
                wird kein Platzhalter angezeigt.
              </p>
              <p>
                Kleiner Tipp am Rand: Auf schmalen Bildschirmen gibt es oben
                einen <strong>Lesemodus</strong>-Knopf, der die Navigation
                ausblendet und den Text breiter/größer darstellt.
              </p>
              <p>
                Auf jeder Personalakte steht unten{" "}
                <strong>„Wer kennt wen“</strong>: mit welchen Figuren und NPCs
                diese Person zu tun hat — abgeleitet aus gemeinsamen Missionen,
                gemeinsamen Gesprächen und den <strong>Verlinkungen</strong>{" "}
                zwischen Charakteren und NPCs. Verlinkst du in einer Biografie
                oder einem NPC-Eintrag eine andere Figur (siehe „Verlinkung“),
                entsteht daraus also eine Verbindung. Unter jedem Namen steht,
                woraus sie stammt, und ein Klick führt zur Figur.
              </p>
            </div>
          </LcarsDataRow>

          {/* Dieselben Texte, die auf den öffentlichen Seiten hinter dem
              Fragezeichen stehen (siehe help/guides/PublicGuides.tsx) — hier
              am Stück, damit man sie auch lesen kann, ohne jede Seite einmal
              aufzuschlagen. */}
          <LcarsDataRow
            value={3}
            htmlId="seiten-im-ueberblick"
            label="Die Seiten im Überblick"
          >
            <PublicAreaGuides />
          </LcarsDataRow>

          <LcarsDataRow value={4} htmlId="chronologie" label="Chronologie">
            <div className="lcars-text flex flex-col gap-[12px]">
              <p>
                <strong>Chronologie</strong> zeigt dieselben Inhalte wie der
                Rest des Archivs, aber nach der Zeit der Kampagne statt nach dem
                Bearbeitungsdatum: ein Zeitstrahl von der ältesten bis zur
                jüngsten bekannten Begebenheit. Was du dort siehst, richtet sich
                nach deinen Leserechten — ein Logbuch, das du nicht lesen
                darfst, taucht auch in der Chronologie nicht auf. Entwürfe
                erscheinen dort grundsätzlich nicht, auch nicht die eigenen.
              </p>
              <p>
                Sie ist zugleich die <strong>Missions-Übersicht</strong>: Ganz
                links im Umschalter steht <strong>„Missionen“</strong> — dann
                zeigt der Zeitstrahl je Einsatz genau einen Eintrag mit seinem
                ganzen <strong>Zeitraum</strong> (Beginn bis Abschluss), und ein
                Klick führt auf die Missionsseite mit ihren Einsatzberichten.
                Die Ereignisart <strong>„Mission“</strong>
                im Filter meint etwas anderes: dort sind Beginn und Abschluss
                zwei eigene Marken auf dem Strahl. Mit{" "}
                <strong>„Alle Ereignisse“</strong>
                kommen Logbücher, markierte Textstellen, Gespräche, Geburtstage
                und abgeleitete Begebenheiten dazu. Geordnet wird immer nach{" "}
                <strong>Datum</strong> — der Knopf dreht die Richtung um —,
                gefiltert nach Suchbegriff, <strong>Ereignisart</strong>,{" "}
                <strong>beteiligter Person</strong> und Jahr; wechselst du den
                Umschalter, setzen sich die übrigen Filter zurück. Einen eigenen
                Menüpunkt „Missionen“ gibt es deshalb nicht mehr — die alte
                Adresse führt hierher.
              </p>
              <p>
                Die <strong>Missionsseite</strong> selbst zeigt oben Status,
                Zeitraum und die beteiligten Figuren, darunter die{" "}
                <strong>Zusammenfassung</strong> des Einsatzes — sie lässt sich
                über die Zeile „Zusammenfassung“ ein- und ausklappen, wenn du
                gleich zu den Berichten willst. Darunter steht die{" "}
                <strong>Übersicht ihrer Logbücher</strong> — dieselbe Liste wie
                hier in der Chronologie, von Haus aus nach{" "}
                <strong>Autor</strong> gruppiert, auf Wunsch nach{" "}
                <strong>Datum</strong> geordnet. Ein Klick öffnet den
                Einsatzbericht; von dort führt der Link oben links zurück zur
                Mission.
              </p>
              <p>
                Einträge <strong>ohne Datum</strong> gehen dabei nicht verloren:
                abgeschlossene Gespräche und Logbücher, bei denen kein
                In-Story-Datum gepflegt ist, stehen unter{" "}
                <strong>„Ohne Datum“</strong> am Ende der Liste. Ein{" "}
                <em>laufendes</em> Gespräch steht noch nicht in der Chronologie
                — es ist ja nichts Abgeschlossenes; es findet sich auf deiner
                Startseite unter den offenen Gesprächen.
              </p>
              <p>
                Die Ereignisse kommen aus <strong>drei Quellen</strong>. Erstens
                aus dem, was ohnehin gepflegt ist: Beginn und Ende einer
                Mission, das Datum eines Logbuchs oder Gesprächs, das
                Geburtsdatum einer Figur. Zweitens aus{" "}
                <strong>Marken im Text</strong> — der{" "}
                <strong>Kalender-Knopf</strong> in der Werkzeugleiste über den
                Textfeldern von <strong>Charakteren</strong>,{" "}
                <strong>Missionen</strong>, <strong>Logbüchern</strong> und{" "}
                <strong>Datenbank-Einträgen</strong> öffnet ein Fenster: Datum,
                Ereignisart aus derselben Liste wie im Zeitstrahl und ein Titel
                — und setzt daraus an der Cursor-Stelle{" "}
                <code>
                  &lt;!-- timeline: JJJJ-MM-TT | Titel | Kategorie --&gt;
                </code>
                . Die Marke ist im gerenderten Text unsichtbar, erzeugt dort
                aber eine Sprungmarke: die Karte in der Chronologie führt genau
                an diese Stelle im Bericht.
              </p>
              <p>
                Was zur Kampagne gehört, aber in keinem Eintrag steht, trägst du{" "}
                <strong>von Hand</strong> ein: Über dem Zeitstrahl steht der
                Knopf <strong>„Ereignis eintragen“</strong> und öffnet ein
                Fenster — Datum, Titel, Ereignisart, auf Wunsch ein, zwei Sätze
                dazu. Das Datumsfeld steht schon auf dem jüngsten Ereignis der
                Chronologie — ist sie noch leer, bleibt das Feld leer, der Knopf
                steht aber auch dort schon bereit; meist musst du nur den Tag
                ändern. Die Beschreibung nimmt <strong>Markdown</strong> wie
                überall sonst, und du kannst <strong>Beteiligte</strong>{" "}
                auswählen — aus allen Figuren, auch den zurückgezogenen;
                vorausgewählt ist keine. Solche Ereignisse tragen den Hinweis{" "}
                <em>von Hand eingetragen</em>, sind nicht verlinkt (es gibt ja
                keinen Eintrag dahinter) und lassen sich von dir oder der
                Spielleitung wieder entfernen.
              </p>
              <p>
                Drittens kann die{" "}
                <strong>Spielleitung Ereignisse ableiten lassen</strong>: das
                Sprachmodell liest einen Bericht und nennt die Begebenheiten,
                die darin stecken, aber in keinem Feld stehen (&bdquo;drei Tage
                später …&ldquo;). Solche Einträge sind auf der Karte als{" "}
                <em>aus dem Text abgeleitet</em> gekennzeichnet — sie sind eine
                Lesehilfe, keine gepflegte Angabe. Was nicht stimmt, entfernt
                die Spielleitung unter &bdquo;Leitung → Chronologie&ldquo;.
              </p>
              <p>
                Jede <strong>Ereignisart hat eine eigene Adresse</strong>:
                Wählst du im Auswahlfeld etwa &bdquo;Konflikt&ldquo;, steht in
                der Adresszeile <code>/chronologie/conflict</code>; die
                Missionen liegen unter <code>/chronologie/mission</code>. Diese
                Adressen kannst du weitergeben oder als Lesezeichen ablegen —
                sie öffnen die Chronologie mit genau dieser Auswahl. &bdquo;Alle
                Arten&ldquo; führt zurück auf <code>/chronologie</code>.
              </p>
              <p>
                Auch die <strong>Missionsseiten</strong> liegen unter der
                Chronologie: <code>/chronologie/mission/&lt;Mission&gt;</code>,
                ein Einsatzbericht eine Ebene tiefer. Alte Lesezeichen auf{" "}
                <code>/missions/…</code> leiten dorthin weiter.
              </p>
            </div>
          </LcarsDataRow>

          <LcarsDataRow value={5} htmlId="konto-rollen" label="Konto & Rollen">
            <div className="lcars-text flex flex-col gap-[12px]">
              <p>
                Konten entstehen nur durch Einladung: Spielleitung oder
                Administration legen dein Konto mit E-Mail-Adresse und Rolle an,
                du bekommst daraufhin eine E-Mail mit einem Aktivierungslink,
                über den du dein Passwort festlegst. Ein Passwort vergessen?
                Über „Passwort vergessen“ auf der Login-Seite kannst du dir
                jederzeit selbst einen neuen Aktivierungslink zuschicken lassen.
                Der neue Link macht dabei einen eventuell noch offenen älteren
                ungültig — es funktioniert also immer nur der zuletzt
                angeforderte.
              </p>
              <p>
                Änderst du dein Passwort später im Profil, bleibst du auf dem
                Gerät angemeldet, an dem du gerade sitzt; alle anderen Geräte
                werden abgemeldet. Dasselbe erreichst du ohne Passwortwechsel
                über „Auf allen anderen Geräten abmelden“. Wird ein Konto von
                der Administration deaktiviert, greift das sofort und überall —
                auch dort, wo es noch angemeldet war.
              </p>
              <p>Es gibt fünf Rollen mit unterschiedlichen Rechten:</p>
              <ul className="list-disc pl-[20px] flex flex-col gap-[4px]">
                <li>
                  <strong>Administration</strong> — verwaltet Nutzerkonten
                  (anlegen, Rolle ändern, deaktivieren, löschen) und sieht
                  ausnahmslos alle Inhalte, auch private.
                </li>
                <li>
                  <strong>Spielleitung (GM)</strong> — verwaltet Missionen,
                  weist Charaktere Spieler:innen zu und nutzt die
                  Admin-Werkzeuge an Inhalten (siehe Abschnitt „Für Spielleitung
                  & Admins“), aber keine Nutzerverwaltung — fremde Entwürfe
                  bleiben ihr ebenfalls verborgen.
                </li>
                <li>
                  <strong>Spieler:in</strong> — legt eigene Charaktere,
                  Einsatzberichte, Gespräche und Datenbank-Einträge an und
                  entscheidet, wann sie veröffentlicht werden.
                </li>
                <li>
                  <strong>Betrachter:in</strong> — technisch identisch zu
                  Spieler:in, nur als Label für Accounts ohne aktive
                  Spielbeteiligung gedacht.
                </li>
                <li>
                  <strong>Gast</strong> — kann alles ansehen sowie merken/
                  abonnieren, aber keinen Charakter zugewiesen bekommen. Da
                  Einsatzberichte und Gespräche einen eigenen Charakter
                  voraussetzen, bleiben Gast-Accounts darauf beschränkt,
                  Datenbank-Einträge anzulegen.
                </li>
              </ul>
              <p>
                Die Rollen sind nur <strong>Vorlagen</strong>: Ein Konto kann{" "}
                <strong>mehrere Rollen</strong> gleichzeitig haben (die Rechte
                addieren sich), und die Administration kann darüber hinaus{" "}
                <strong>einzelne Rechte</strong> pro Person gezielt gewähren
                oder entziehen (im User-Editor unter „Individuelle Rechte“). So
                lässt sich z.B. jemandem nur das Verwalten von Missionen
                erlauben, ohne gleich die ganze Spielleitungs-Rolle zu vergeben.
              </p>
              <p>
                Über die Admin-Seite <strong>„Rollen“</strong> (Rollen &amp;
                Rechte) kann die Administration außerdem{" "}
                <strong>eigene Rollen</strong> anlegen, die Rechte jeder Rolle
                (auch der fünf System-Rollen) anpassen und Rollen dort direkt
                den Usern zuweisen. Die fünf System-Rollen bleiben dabei immer
                erhalten und können nicht gelöscht werden.
              </p>
            </div>
          </LcarsDataRow>

          <LcarsDataRow
            value={6}
            htmlId="eigene-inhalte"
            label="Eigene Inhalte"
          >
            <div className="lcars-text flex flex-col gap-[12px]">
              <p>
                Unter <strong>„Profil → Meine Inhalte“</strong> (Menü oben,
                sobald du eingeloggt bist — dort liegen auch{" "}
                <strong>„Charaktere“</strong> und{" "}
                <strong>„Einstellungen“</strong>) findest du zwei klar getrennte
                Bereiche: <strong>„Neue Inhalte“</strong> mit den
                Anlegen-Knöpfen — jeder öffnet sein Formular in einem Fenster
                über der Liste, sodass du beim Abbrechen wieder in deiner
                Übersicht stehst — und darunter die Liste alles dessen, was dir
                bereits gehört. Sie ist wie Chronologie und Datenbank gebaut:
                eine Überschrift je Kategorie, darunter die Einträge an der
                Schiene. Sortiert wird in der Vorgabe nach Kategorie,
                wahlweise alphabetisch über alles; Entwürfe stehen farblich
                markiert in ihrer Kategorie und lassen sich über den Filter{" "}
                <strong>„Nur Entwürfe“</strong> zusammen ansehen. Anlegen darfst
                du:
              </p>
              <ul className="list-disc pl-[20px] flex flex-col gap-[4px]">
                <li>
                  <strong>Datenbank-Eintrag</strong> — darf jede:r anlegen, ganz
                  ohne Voraussetzung.
                </li>
                <li>
                  <strong>Charakter</strong> — darf jede:r außer Gast-Accounts
                  anlegen; der Charakter wird sofort mit deinem Konto verknüpft.
                </li>
                <li>
                  <strong>Einsatzbericht</strong> und <strong>Gespräch</strong>{" "}
                  — setzen einen eigenen Charakter voraus (der Knopf erscheint
                  erst, sobald du einen hast).
                </li>
                <li>
                  <strong>Mission</strong> — bleibt Spielleitung/Admin
                  vorbehalten.
                </li>
              </ul>
              <p>
                Bei jedem eigenen Eintrag entscheidest du über den Schalter
                daneben, ob er ein <strong>Entwurf</strong> bleibt oder{" "}
                <strong>veröffentlicht</strong> ist — ein Druck auf die andere
                Hälfte stellt ihn um, jederzeit und ohne den Eintrag erst zu
                öffnen. Direkt daneben findest du zwei
                Symbol-Knöpfe zum{" "}
                <strong>Bearbeiten</strong> (Stift) und <strong>Löschen</strong>{" "}
                (Mülleimer) — Löschen steht bei allen fünf Inhaltstypen zur
                Verfügung, auch bei eigenen Charakteren, Missionen (nur
                Spielleitung) und Gesprächen (nur für die Person, die es
                begonnen hat).
              </p>
              <p>
                <strong>Deine Charaktere</strong> haben einen eigenen
                Menüpunkt: Unter <strong>„Profil“</strong> steht{" "}
                <strong>„Charaktere“</strong>, sobald du entweder einen
                Charakter verknüpft hast oder selbst welche anlegen darfst —
                als <strong>Spieler</strong> also von Anfang an, auch vor
                deiner ersten Figur. Dort stehen alle deine Charaktere (auch
                Entwürfe) mit Knöpfen zum Veröffentlichen, Öffnen und Löschen
                — und dort legst du neue an. Wie das Anlegen selbst abläuft, steht im nächsten
                Abschnitt <strong>„Charaktererschaffung“</strong> — dort
                gesammelt, weil es der längste Ablauf im ganzen Archiv ist.
                Denselben Text öffnet das{" "}
                <strong>Fragezeichen</strong> neben der Überschrift als Fenster
                — auf der Seite „Charaktere“, im Anlege-Assistenten und auf der
                Seite jedes deiner Charaktere. Du kannst also mitten im Ausfüllen
                nachschlagen, ohne die Seite zu verlassen.
              </p>
              <p>
                Eigene Entwürfe (siehe unten) erscheinen in „Meine Inhalte“
                gesammelt ganz oben in einer eigenen Übersicht, unabhängig vom
                Kategorie-Filter — Charakter-Entwürfe stattdessen in der
                Charakter-Übersicht, dort ebenfalls markiert.
              </p>
              <p>
                Beim Anlegen oder Bearbeiten eines Charakters, einer Mission,
                eines Einsatzberichts oder eines Datenbank-Eintrags kannst du
                das Formular statt zu veröffentlichen auch erst als{" "}
                <strong>Entwurf</strong> speichern (Checkbox unter dem Textfeld)
                — der Text ist dann nicht mehr Pflicht. Ein Entwurf bleibt für
                niemanden außer dir sichtbar, nicht einmal für die Spielleitung
                (Ausnahme: Missionen sehen alle aus der Spielleitung, da sie
                kein Einzel-Owner-Modell haben), erscheint aber bereits unter
                „Meine Inhalte“ bzw. „Charaktere“, dort deutlich markiert.
              </p>
              <p>
                <strong>Getipptes geht nicht verloren.</strong> Jede Eingabe in
                jedem Formular des Archivs — Titel, Fließtext, Auswahlfelder,
                Kästchen — wird automatisch für die laufende Browser-Sitzung
                gesichert. Lädst du die Seite neu, drückst versehentlich
                „Zurück“ oder läuft etwas schief, steht beim nächsten Aufruf
                derselben Seite wieder da, was du geschrieben hattest. Das
                passiert ohne Knopf und ohne Hinweis: Du tippst einfach weiter.
                Gesichert wird ausschließlich auf deinem Gerät und nur bis zum
                Schließen des Tabs; Passwortfelder bleiben grundsätzlich außen
                vor. Sobald ein Formular erfolgreich abgeschickt und geleert
                wurde, ist auch die Sicherung dazu weg — und beim An- oder
                Abmelden wird ohnehin alles davon verworfen.
              </p>
              <p>
                Auch auf der Leseseite eines Inhalts führt der{" "}
                <strong>Stift</strong> (im aufklappbaren Feld „Aktionen &amp;
                Verwaltung“ am Fuß des Textes) direkt in dessen Editor — und
                zwar in denselben, in dem auch Titel, Kategorie, Tags und
                Metadaten dranhängen. Früher öffnete er dort nur ein Feld für
                den Fließtext; wer den Titel ändern wollte, musste den Eintrag
                in „Meine Inhalte“ erst wiederfinden.
              </p>
              <p>
                <strong>Gespräche</strong> sind ein eigener Inhaltstyp mit ein
                paar Besonderheiten — sie haben weiter unten eine eigene
                Sektion.
              </p>
            </div>
          </LcarsDataRow>

          {/* Die beiden übrigen Punkte des Profil-Menüs — „Meine Inhalte"
              und „Einstellungen" — mit denselben Texten, die dort hinter dem
              Fragezeichen stehen (siehe help/guides/UserGuides.tsx). */}
          <LcarsDataRow
            value={7}
            htmlId="mein-bereich"
            label="Mein Bereich"
          >
            <UserAreaGuides />
          </LcarsDataRow>

          {/* Eigener Abschnitt statt eines Absatzes in „Eigene Inhalte": Die
              Erschaffung ist der längste Ablauf im Archiv, und ihr Text wird
              zusätzlich als Fenster auf /user/characters gezeigt — dafür
              braucht er eine eigene, wiederverwendbare Komponente und einen
              eigenen Anker (siehe CharacterCreationGuide.tsx). */}
          <LcarsDataRow
            value={8}
            htmlId="charaktererschaffung"
            label="Charaktererschaffung"
          >
            <CharacterCreationGuide />
          </LcarsDataRow>

          <LcarsDataRow value={9} htmlId="gespraeche" label="Gespräche">
            <div className="lcars-text flex flex-col gap-[12px]">
              <p>
                Ein <strong>Gespräch</strong> startest du mit deinem Charakter
                und dem Charakter einer oder mehrerer anderer Personen
                (Mehrfachauswahl); es beginnt <strong>offen</strong> — nur
                Teilnehmende können antworten. Der Owner (wer das Gespräch
                begonnen hat) kann auch danach jederzeit weitere Personen direkt
                hinzufügen (samt Info-Mail an sie) und ist die einzige Person,
                die das Gespräch löschen darf. Wer mit mehreren eigenen
                Charakteren teilnimmt, kann nicht zweimal hintereinander mit
                demselben Charakter antworten — dazwischen muss ein anderer
                Charakter am Zug gewesen sein.
              </p>
              <p>
                Als Gegenüber kannst du auch einen <strong>NPC</strong> wählen —
                also einen Datenbank-Eintrag der Kategorie „NPC“. Für ihn
                schreibt die Spielleitung; gibt es mehr als eine, wählst du beim
                Anlegen aus, wer den NPC übernimmt. Das gilt genauso{" "}
                <strong>nachträglich</strong>: Auch in ein Gespräch, das längst
                läuft, kannst du als Owner einen NPC noch dazuholen — über
                dieselbe Liste „Weitere Personen einladen“, in der auch die
                Charaktere stehen. Spielst du die NPCs nicht selbst, wirst du
                dabei wieder nach der Spielleitung gefragt; schreibt in diesem
                Gespräch schon jemand für NPCs, bleibt es bei ihr. Bisher ging
                das nur beim Anlegen — wer später einen NPC brauchte, musste das
                Gespräch neu beginnen. Umgekehrt kann die Spielleitung ein
                Gespräch aus Sicht eines NPC mit euren Charakteren beginnen. Danach läuft alles wie gewohnt: Der NPC
                steht der Spielleitung beim Antworten wie ein eigener Charakter
                zur Auswahl, und das Gespräch erscheint bei ihr unter „Deine
                Gespräche“. Neue NPCs legt ihr unter „Meine Inhalte“ über den
                Knopf „Neuer NPC“ an — das ist das normale Datenbank-Formular
                mit vorgewählter Kategorie „NPC“, und der Knopf steht jedem
                Konto offen. Wer einen NPC im Gespräch spricht, bleibt davon
                unberührt: das ist weiterhin die Spielleitung.
              </p>
              <p>
                Sobald ein Gespräch <strong>mehr als zwei Teilnehmende</strong>{" "}
                hat, muss man sich das Antwortrecht zusätzlich erst per Button
                für zwei Stunden reservieren, bevor man schreiben kann — solange
                jemand anderes reserviert hat, seht ihr, wer gerade dran ist,
                und könnt euch optional per Mail/Push benachrichtigen lassen,
                sobald die Sperre wieder endet (antwortet die reservierende
                Person selbst, endet sie vorzeitig). Ein offenes Gespräch
                aktualisiert sich dabei automatisch — neue Nachrichten und
                Änderungen am Antwortrecht erscheinen von selbst, ohne dass du
                die Seite neu laden musst. An jeder Nachrichtenkarte eines
                laufenden Gesprächs steht neben dem Namen der sprechenden
                Person, <strong>wann sie verschickt wurde</strong> (Datum und
                Uhrzeit) — so siehst du, ob zwischen zwei Beiträgen Minuten
                oder Tage lagen.
              </p>
              <p>
                Sobald eine teilnehmende Person es abschließt, wird es{" "}
                <strong>unwiderruflich geschlossen</strong> und taucht danach in
                der Gespräche-Übersicht bei den Charakteren auf — standardmäßig
                als zusammenhängender Lesetext, per Umschalter oben auf der
                Seite aber auch wie ein offenes Gespräch mit einzelnen
                Nachrichtenkarten anzeigbar. Diese Einstellung gilt für alle
                abgeschlossenen Gespräche, die du dir ansiehst. Im Lesetext wird
                die wörtliche Rede jedes Charakters in dessen{" "}
                <strong>Charakter-Farbe</strong> dargestellt, ebenso die
                Nachrichten-Karten in offenen wie geschlossenen Gesprächen —
                diese Farbe legst du im Profil unter „Charakter-Farben“ fest,
                für jeden deiner Charaktere einzeln (ohne eigene Wahl bekommt er
                automatisch eine der LCARS-Farben). NPCs sprechen einheitlich in
                einem hellen Grau — daran erkennst du auf einen Blick, wer von
                einer Spielerin/einem Spieler geführt wird.
              </p>
              <p>
                Ein abgeschlossenes Gespräch lässt sich <strong>teilen und
                exportieren</strong> wie jeder andere Inhalt: Der Teilen-Knopf
                unter dem Verlauf kopiert den Link, schickt ihn zu WhatsApp oder
                lädt das ganze Gespräch als <strong>Markdown-Datei</strong> oder
                als <strong>PDF</strong> herunter.
              </p>
              <p>
                <strong>Spielleitung:</strong> Über das „Leitung“-Menü im Header
                (Eintrag „Gespräche“) sieht die Spielleitung alle aktuell
                offenen Gespräche, auch ohne eigene Teilnahme — ein Klick öffnet
                das Gespräch lesend, ohne Antwortformular. Über jedes neu
                begonnene Gespräch wird die Spielleitung außerdem automatisch
                per Mail/Push informiert.
              </p>
              <p>
                <strong>Moderation (Administration):</strong> Wer das Recht zur
                Gesprächs-Moderation hat (standardmäßig die Administration),
                darf in jedem Gespräch jede Nachricht bearbeiten oder löschen
                (auch fremde und auch in bereits abgeschlossenen Gesprächen),
                dessen Besitzer:in ändern sowie die <strong>Metadaten</strong>{" "}
                (Titel, Datum, Schauplatz, Ort, Tags) über „Metadaten
                bearbeiten“ anpassen — auch bei abgeschlossenen Gesprächen; der
                eigentliche Gesprächsverlauf bleibt dabei unangetastet.
              </p>
            </div>
          </LcarsDataRow>

          <LcarsDataRow
            value={10}
            htmlId="merken-abonnieren"
            label="Merken & Abonnieren"
          >
            <div className="lcars-text flex flex-col gap-[12px]">
              <p>
                Auf Charakter-, Missions- und Datenbank-Seiten findest du zwei
                Knöpfe: <strong>„Merken“</strong> speichert den Eintrag für dich
                selbst (Filter „Gespeichert“ auf der Suchseite) — ohne jede
                Benachrichtigung. <strong>„Abonnieren“</strong> meldet dich für
                Update-Benachrichtigungen zu genau diesem Eintrag an — du
                bekommst eine Nachricht, sobald der Charakter, die Mission oder
                der Datenbank-Eintrag bearbeitet wird (z.B. wenn ein abonniertes
                Gespräch abgeschlossen wird).
              </p>
              <p>
                Daneben findest du auf denselben Seiten (zusätzlich auch bei
                Missionslogs und bereits abgeschlossenen Gesprächen) einen{" "}
                <strong>„Teilen“</strong>-Knopf: Link kopieren, per WhatsApp
                teilen, oder den Inhalt als Markdown-Datei (mit Frontmatter)
                bzw. als PDF herunterladen. Das PDF ist aufgemacht wie
                Charakterbogen und Missionsakte — derselbe blaue Rahmen,
                dieselbe Kopfzeile, ein beschrifteter Datenblock (Status,
                Zeitraum, Beteiligte …) und darunter der Text mit
                Überschriften, Aufzählungen, Zitaten sowie Fett und Kursiv.
                Bei noch offenen, laufenden Gesprächen fehlt der Knopf
                bewusst, da sich deren Inhalt noch ändert.
              </p>
              <p>
                Auf der <strong>Seite einer Mission</strong> steht angemeldet
                der Knopf <strong>„Missionsakte (PDF)“</strong>: er packt genau
                diese Mission in eine Datei — Titelblatt mit Zeitraum, Status
                und Beteiligten, ein <strong>Inhaltsverzeichnis</strong>
                (jeder Eintrag springt im PDF zu seinem Bericht), danach die
                Beschreibung und jedes Logbuch auf einer eigenen Seite,
                chronologisch. Aufgemacht ist die Akte wie der Charakterbogen:
                derselbe blaue Rahmen, dieselbe Kopfzeile, formatierter Text mit
                Überschriften, Aufzählungen und Zitaten. Die Akte enthält genau
                das, was du auch sonst lesen darfst; nicht öffentliche Logbücher
                stehen darin mit einem entsprechenden Hinweis.
              </p>
              <p>
                Auf der Seite deines eigenen Charakters (und für die
                Spielleitung auf jeder Charakterseite) steht außerdem der Knopf{" "}
                <strong>„Charakterbogen“</strong>: er zeigt dieselben Blätter
                wie unter „Meine Charaktere“ — Personalakte, Spickzettel, Regeln
                und Biografie — als reine Ansicht, mit Drucken und demselben
                PDF-Download. Gepflegt werden die Werte weiterhin nur von der
                Person, der der Charakter gehört.
              </p>
              <p>
                Kündigt die Spielleitung einen <strong>Spieltermin</strong> an,
                steht er oben auf der Startseite: Datum, Uhrzeit, Ort. Mit{" "}
                <strong>„Ich bin dabei“</strong> oder{" "}
                <strong>„Ich kann nicht“</strong> sagst du zu oder ab — du
                kannst es dir jederzeit anders überlegen, die neue Antwort
                ersetzt die alte. Wer zugesagt hat, steht am Termin.
              </p>
              <p>
                Ist einer deiner Charaktere für den Termin{" "}
                <strong>eingeplant</strong>, erfährst du davon außerdem per{" "}
                <strong>Mail und Push</strong>, sobald der Termin angekündigt
                wird — samt Zeitpunkt, Ort und der Notiz der Spielleitung. Dafür
                musst du nichts abonnieren; es gelten nur deine allgemeinen
                Schalter für Mail- und Push-Benachrichtigungen unter
                „Einstellungen“. Auch mit zwei eingeplanten Figuren bekommst du
                nur eine Nachricht.
              </p>
              <p>
                Auf der Startseite stehen ausschließlich Termine, die{" "}
                <strong>noch bevorstehen</strong>. Ein Abend, der bereits
                begonnen hat oder vorbei ist, verschwindet von dort — ebenso
                einer, den die Spielleitung als gespielte Session eingetragen
                hat. Die Spielleitung sieht auch die vergangenen Termine
                weiterhin in ihrer eigenen Übersicht.
              </p>
              <p>
                Eingeloggt zeigt dir die <strong>Startseite</strong> dein
                persönliches Dashboard: offene Gespräche in einer eigenen
                Sektion sowie einen farbcodierten <strong>News-Feed</strong> mit
                neu erstellten (grün), bearbeiteten (blau) und gelöschten (rot)
                Inhalten — plus deine Lesezeichen und Abos.
              </p>
              <p>
                Darüber steht der Bereich <strong>„Neue Funktionen“</strong>:
                die Neuerungen der letzten Versionen. Jede trägt eine{" "}
                <strong>Kategorie</strong> (etwa „Charaktere &amp; Regeln“ oder
                „Spielleitung“) — über das Auswahlfeld darüber schränkst du die
                Liste auf eine davon ein, und der Umschalter daneben sortiert
                wahlweise nach Version oder nach Kategorie. Dieselbe Bedienung
                findest du auf der vollständigen Liste unter{" "}
                <strong>/changelog</strong> (erreichbar über die Versionsnummer
                unten). Die Administration kann einzelne Kategorien für eine
                Rolle aus dem Dashboard ausblenden — unter /changelog steht
                immer alles. Versionen, die nur hinter den Kulissen aufräumen,
                bringen keine Stichpunkte mit: Im Dashboard erscheinen sie
                deshalb nicht, unter /changelog stehen sie mit einem
                entsprechenden Hinweis.
              </p>
              <p>
                Der News-Feed bleibt <strong>dauerhaft</strong> sichtbar (nicht
                nur bis zum nächsten Besuch): Jede News blendest du über das
                kleine <strong>×</strong> rechts einzeln aus — sie gilt damit
                als gelesen und kommt nicht wieder. Eine News verschwindet
                außerdem automatisch, sobald du den zugehörigen Inhalt aufrufst.
                Mit <strong>„Alles als gelesen markieren“</strong> räumst du den
                ganzen Feed auf einmal ab. Welche News-Arten überhaupt
                erscheinen (Neu, Editiert und/oder Gelöscht), legst du im{" "}
                <strong>Profil</strong> unter „News“ fest — standardmäßig nur
                „Neu“.
              </p>
              <p>
                Ob Benachrichtigungen dich tatsächlich erreichen, steuerst du in
                deinem <strong>Profil</strong> über zwei Hauptschalter: E-Mail-
                und Push-Benachrichtigungen. Für Push-Benachrichtigungen muss
                zusätzlich jedes Gerät einzeln zustimmen (Browser- Berechtigung)
                — der Hauptschalter bestimmt, ob der Server überhaupt versucht
                zu senden, die Geräte-Freigabe, ob genau dieses Gerät sie
                empfängt.
              </p>
            </div>
          </LcarsDataRow>

          <LcarsDataRow value={11} htmlId="notizen" label="Notizen">
            <div className="lcars-text flex flex-col gap-[12px]">
              <p>
                Unter Charakteren, Missionen, Logbüchern und Datenbank-Einträgen
                findest du eingeloggt den aufklappbaren Bereich{" "}
                <strong>„Notizen“</strong>. Beim Schreiben wählst du, wer die
                Notiz sieht: <strong>„Nur ich“</strong> legt einen persönlichen
                Merkzettel an, den niemand sonst zu Gesicht bekommt — auch die
                Spielleitung nicht. <strong>„Für die Runde“</strong> schreibt
                einen Kommentar, den alle angemeldeten Personen lesen können; so
                lässt sich direkt am Eintrag über ihn diskutieren.
              </p>
              <p>
                Der Bereich klappt auf und zu — genau wie{" "}
                <strong>„Erwähnt in“</strong> (wo der Eintrag überall verlinkt
                ist) und <strong>„Wer kennt wen“</strong> auf den
                Charakterseiten. In der Kopfzeile steht jeweils die Anzahl,
                sodass sich alles überfliegen lässt, ohne die Seite länger zu
                machen.
              </p>
              <p>
                Deine eigenen Notizen kannst du jederzeit wieder löschen.
                Kommentare für die Runde darf zusätzlich die Inhalts-Moderation
                entfernen — private Notizen bleiben davon unberührt. Wird ein
                Inhalt endgültig gelöscht, verschwinden seine Notizen mit ihm.
              </p>
            </div>
          </LcarsDataRow>

          <LcarsDataRow value={12} htmlId="versionen" label="Versionen">
            <div className="lcars-text flex flex-col gap-[12px]">
              <p>
                Beim Bearbeiten eines Charakters, einer Mission, eines Logbuchs
                oder eines Datenbank-Eintrags findest du unter dem Formular den
                Bereich <strong>„Versionen“</strong>: Dort stehen die letzten
                zwanzig Fassungen des Textes mit Datum, bearbeitender Person,
                Länge und einer Vorschau. Ein Klick auf{" "}
                <strong>„Wiederherstellen“</strong> holt die gewählte Fassung
                zurück.
              </p>
              <p>
                Zurückgeholt wird dabei nur der <strong>Fließtext</strong> —
                Titel, Stammdaten und der Veröffentlichungs-Zustand bleiben
                unverändert. Der
                Stand, den du gerade ersetzt, geht nicht verloren: Er wandert
                selbst als neue Fassung in die Historie, du kannst ein
                Wiederherstellen also wieder rückgängig machen. Eine neue
                Fassung entsteht nur, wenn sich der Text wirklich geändert hat.
              </p>
            </div>
          </LcarsDataRow>

          <LcarsDataRow
            value={13}
            htmlId="datenbank-assistent"
            label="Datenbank-Assistent"
          >
            <div className="lcars-text flex flex-col gap-[12px]">
              <p>
                Angemeldete Nutzer:innen finden über das Lupen-Symbol im Menü
                die <strong>Suche</strong> — und darunter den{" "}
                <strong>Datenbank-Assistenten</strong> (auch direkt unter{" "}
                <code>/rag</code>). Statt nach Stichworten zu suchen, kannst du
                ihm ganz normale Fragen zum Kampagneninhalt stellen, z. B.{" "}
                <em>„Was wissen wir über die Tholianer?“</em> oder{" "}
                <em>
                  „Wer war an der Mission am Cardassianischen Grenzraum
                  beteiligt?“
                </em>
              </p>
              <p>
                Der Assistent durchsucht dafür den Datenbestand (Charaktere,
                Missionen, Einsatzberichte, Datenbank-Einträge und
                abgeschlossene Gespräche), formuliert eine zusammenhängende
                Antwort und zeigt darunter die <strong>Quellen</strong> an, auf
                die er sich stützt — ein Klick führt direkt zum jeweiligen
                Eintrag. Die Antwort erscheint Wort für Wort im Stream.
              </p>
              <p>
                Zwei Dinge sind wichtig: Der Assistent antwortet nur aus der
                vorhandenen Datenbank — findet er nichts Passendes, sagt er das,
                statt sich etwas auszudenken. Und er berücksichtigt nur Inhalte,
                die <strong>du ohnehin sehen darfst</strong>: private oder
                GM-Einträge fließen nur ein, wenn du sie auch sonst einsehen
                könntest.
              </p>
            </div>
          </LcarsDataRow>

          <LcarsDataRow value={14} htmlId="markdown" label="Markdown">
            <div className="lcars-text flex flex-col gap-[12px]">
              <p>
                Alle längeren Texte (Biografien, Synopsen, Einsatzberichte,
                Datenbank-Einträge, Gesprächsnachrichten) werden in{" "}
                <strong>Markdown</strong> geschrieben — einer einfachen
                Auszeichnungssprache aus reinem Text. Über jedem Textfeld
                findest du eine Werkzeugleiste, die die Syntax für dich einfügt,
                sowie einen <strong>Rohtext/Vorschau</strong>-Umschalter, der
                zeigt, wie der Text am Ende aussieht. Neben jedem Hinweis
                „Unterstützt Markdown-Formatierung“ zeigt ein Fahren mit der
                Maus über das Wort „Markdown“ zusätzlich dieses Cheatsheet an.
              </p>
              <div className="overflow-x-auto">
                <table className="tutorial-table">
                  <thead>
                    <tr>
                      <th>Eingabe</th>
                      <th>Ergebnis</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <code># Titel</code>
                      </td>
                      <td>
                        Überschrift (mehr <code>#</code> = kleinere Ebene)
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <code>**fett**</code>
                      </td>
                      <td>Fett</td>
                    </tr>
                    <tr>
                      <td>
                        <code>*kursiv*</code>
                      </td>
                      <td>Kursiv</td>
                    </tr>
                    <tr>
                      <td>
                        <code>~~text~~</code>
                      </td>
                      <td>Durchgestrichen</td>
                    </tr>
                    <tr>
                      <td>
                        <code>[Text](https://…)</code>
                      </td>
                      <td>Link</td>
                    </tr>
                    <tr>
                      <td>
                        <code>- Eintrag</code>
                      </td>
                      <td>Aufzählung</td>
                    </tr>
                    <tr>
                      <td>
                        <code>1. Eintrag</code>
                      </td>
                      <td>Nummerierte Liste</td>
                    </tr>
                    <tr>
                      <td>
                        <code>&gt; Zitat</code>
                      </td>
                      <td>Zitat</td>
                    </tr>
                    <tr>
                      <td>
                        <code>`Code`</code>
                      </td>
                      <td>Inline-Code</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                Für Spielleitung/Admin gibt es in derselben Werkzeugleiste
                zusätzlich einen Kalender-Knopf, der an der Cursor-Position
                einen Zeitleisten-Marker einfügt (siehe „Verlinkung“ unten und
                den Abschnitt für Spielleitung/Admins) — er hält den zugehörigen
                In-Story-Zeitpunkt des Ereignisses in der Chronik der Datenbank
                fest.
              </p>
              <p>
                Die <strong>Werkzeugleiste</strong> (Fett, Kursiv, Überschrift,
                Link, Listen, Zitat, Code) und der Umschalter{" "}
                <strong>Rohtext/Vorschau</strong> stehen nicht nur an den großen
                Inhaltsformularen, sondern auch an den kleineren Textfeldern:{" "}
                <strong>Notizen</strong> und Kommentare, eigenen{" "}
                <strong>Regeln</strong>, Talent- und Schwerpunkt-Beschreibungen,{" "}
                <strong>Session-Notizen</strong> sowie Antworten und Nachrichten
                in Gesprächen. Überall dort wird der Text beim Anzeigen auch als
                Markdown dargestellt — im PDF-Spickzettel werden Auszeichnungen
                auf ihren Text zurückgeführt, Listen bleiben Listen.
              </p>
              <p>
                Nicht als Markdown gedacht sind drei Stellen, an denen der Text
                eine andere Bedeutung hat: die <strong>Listenfelder</strong> des
                Charakterbogens („Spezies-Fähigkeit“, „Sonderregeln“ — dort ist
                jede Zeile ein eigener Eintrag), die Feldwerte im{" "}
                <strong>Datenbank-Bereich</strong> der Administration (dort
                steht der rohe Wert der Spalte) und die Zusammenfassung beim{" "}
                <strong>Markdown-Import</strong> (sie wird als reiner Text
                weiterverwendet).
              </p>
            </div>
          </LcarsDataRow>

          <LcarsDataRow value={15} htmlId="verlinkung" label="Verlinkung">
            <div className="lcars-text flex flex-col gap-[12px]">
              <p>
                Um im Fließtext auf einen Charakter, eine Mission oder einen
                Datenbank-Eintrag zu verweisen, schreibst du seinen Namen in
                doppelte eckige Klammern: <code>[[Name]]</code>. Willst du einen
                abweichenden Anzeigetext, trennst du ihn mit einem senkrechten
                Strich ab: <code>[[Name|Anzeigetext]]</code>. Die Datenbank löst
                das automatisch zum passenden Link auf, sobald das Ziel
                existiert.
              </p>
              <p>
                Wer sich das Tippen der Klammern sparen will, nutzt beim
                Speichern das Kästchen <strong>„Automatisch verlinken“</strong>{" "}
                unter dem Textfeld: Es durchsucht deinen Text nach bekannten
                Charakter-Namen, Missions-Titeln und Datenbank-Eintrag-Titeln
                — bei Charakteren und Datenbank-Einträgen zusätzlich unter ihren{" "}
                <strong>Aliasen</strong> — und verlinkt <strong>jede</strong>{" "}
                Erwähnung automatisch. Bei <strong>neuen</strong> Inhalten ist
                dieses Kästchen bereits vorausgewählt; beim Bearbeiten
                bestehender Inhalte ist es standardmäßig aus. Codeblöcke,
                Inline-Code, Bilder und bereits vorhandene Links bleiben dabei
                unangetastet, und dein eigener Eintrag verlinkt sich nie selbst.
              </p>
              <p>
                Bekommt ein Inhalt später einen <strong>anderen Namen</strong>{" "}
                oder einen <strong>neuen Alias</strong>, musst du die alten
                Texte nicht noch einmal durchgehen: Im Hintergrund prüfen alle
                anderen Inhalte, ob die neue Schreibweise bei ihnen im Text
                vorkommt, und verlinken sie. Verweise, die noch auf den alten
                Namen zeigen, werden dabei auf den neuen umgeschrieben — im Text
                steht weiterhin das Wort, das dort stand. Nachverlinkt werden
                nur die <strong>neuen</strong> Schreibweisen; alles andere
                bleibt, wie du es geschrieben hast.
              </p>
              <p>
                Spielleitung/Admin haben zusätzlich ein eigenständiges
                Autolinking-Werkzeug direkt auf jeder Detailseite (im
                „Admin-Aktionen“-Bereich), das denselben Mechanismus auf bereits
                gespeicherte Inhalte anwendet, plus ein Werkzeug, um Wikilinks
                wieder zu entfernen (macht Autolinking-Ergebnisse rückgängig)
                und eines, das gerade Anführungszeichen/Apostrophe zu
                typografisch korrekten Zeichen vereinheitlicht. Für alle Inhalte
                auf einmal gibt es unter „Scripts“ im Adminbereich den Knopf{" "}
                <strong>„Alle Inhalte verlinken“</strong> (siehe Abschnitt für
                Spielleitung &amp; Admins).
              </p>
            </div>
          </LcarsDataRow>

          <LcarsDataRow
            value={16}
            htmlId="spielleitung-admins"
            label="Spielleitung & Admins"
          >
            <div className="lcars-text flex flex-col gap-[12px]">
              <p>
                Zusätzlich zu allem oben Genannten hat die Spielleitung ein
                eigenes <strong>„Leitung“</strong>-Menü. Es steht getrennt
                neben dem Admin-Menü — wer beide Rollen hat, sieht beide
                nebeneinander — und ist nach Aufgaben gegliedert: Kampagne,
                Charaktere, Regelwerk, Inhalte. Jeder seiner zehn Bereiche ist
                hier erklärt; denselben Text öffnet auf der jeweiligen Seite
                das <strong>Fragezeichen</strong> neben der Überschrift.
              </p>
              <GmAreaGuides />
              <p>Unabhängig vom Menü kann die Spielleitung außerdem:</p>
              <ul className="list-disc pl-[20px] flex flex-col gap-[4px]">
                <li>
                  Missionen anlegen, bearbeiten und Einsatzberichte dazu
                  einsehen.
                </li>
                <li>
                  Über die „Admin-Aktionen“ jeder Detailseite Autolinking,
                  Wikilinks-Entfernen und Text-Formatieren auch auf fremde,
                  bereits gespeicherte Inhalte anwenden.
                </li>
              </ul>
              <p>
                Administration hat zusätzlich einen eigenen Bereich, erreichbar
                über das <strong>„Admin“</strong>-Menü im Header:
              </p>
              <ul className="list-disc pl-[20px] flex flex-col gap-[4px]">
                <li>
                  Unter <strong>„User“</strong> Nutzerkonten anlegen und in
                  einer durchsuchbaren, sortierbaren Übersicht einsehen; über
                  die Detailseite eines Users dessen Rolle(n) und Einzelrechte
                  ändern, das Konto (de)aktivieren oder löschen, einen
                  Passwort-Reset auslösen oder es auf allen Geräten abmelden.
                </li>
                <li>
                  Unter <strong>„Rollen“</strong> eigene Rollen anlegen und
                  bearbeiten, die Rechte jeder Rolle (auch der System-Rollen)
                  anpassen und Rollen direkt den Usern zuweisen.
                </li>
                <li>
                  Unter <strong>„Scripts“</strong> alle Missionen ohne
                  Besitzer:in auf einen Schlag einer Spielleitung zuordnen, den
                  Cache neu aufbauen, mit{" "}
                  <strong>„Alle Inhalte verlinken“</strong> das Autolinking auf
                  einen Rutsch über alle bestehenden Inhalte laufen lassen sowie
                  mit <strong>„Typografie korrigieren“</strong> gerade
                  Anführungszeichen in allen Inhalten in deutsche („…“)
                  umwandeln (alles blockweise mit Fortschrittsbalken).
                </li>
                <li>
                  Unter <strong>„Audit-Log“</strong> nachvollziehen, wer wann
                  welche sicherheitsrelevante Kontoaktion durchgeführt hat,
                  sowie eine separate Übersicht aller in den letzten drei Tagen
                  neu angelegten, bearbeiteten oder gelöschten Inhalte.
                </li>
                <li>
                  Unter <strong>„Fehler-Log“</strong> alle unerwarteten
                  Serverfehler einsehen (Zeitpunkt, Route, Meldung samt
                  Stacktrace). Tritt ein solcher Fehler auf, sehen alle Besucher
                  eine LCARS-Fehlerseite mit Referenzcode, Administration
                  zusätzlich die volle Fehlermeldung direkt auf dieser Seite.
                  Zusätzlich erhält die Administration jeden Morgen um 6 Uhr
                  (Berliner Zeit) automatisch eine Mail mit allen Fehler- und
                  Audit-Log-Einträgen der letzten 24 Stunden.
                </li>
                <li>
                  Unter <strong>„Import“</strong> eine oder mehrere
                  Markdown-Dateien im Vault-Frontmatter-Format hochladen, um
                  daraus neue Datenbank-Einträge, Missionen, Charaktere oder
                  Missionslogs anzulegen. Jede Datei lässt sich einzeln
                  durchblättern, vor dem Anlegen noch bearbeiten und muss danach
                  einzeln bestätigt werden.
                </li>
              </ul>
              <p>
                Administration sieht außerdem als einzige Rolle ausnahmslos alle
                Inhalte, auch private. Die Moderation von Gesprächen (fremde
                Nachrichten/Metadaten/Besitzer:in) ist in der eigenen
                Gespräche-Sektion oben beschrieben.
              </p>
            </div>
          </LcarsDataRow>

          <LcarsDataRow
            value={17}
            htmlId="app-installieren"
            label="App installieren"
          >
            <div className="lcars-text flex flex-col gap-[12px]">
              <p>
                Die Datenbank lässt sich als eigenständige App auf dein Gerät
                installieren (Icon auf dem Home-Bildschirm, eigenes Fenster ohne
                Browser-Leiste) — unter „App installieren“ in deinem Profil oder
                direkt hier:
              </p>
              <InstallPwaPrompt />
              <p>
                Die installierte App funktioniert eingeschränkt auch{" "}
                <strong>offline</strong>: Bereits besuchte Seiten bleiben ohne
                Internetverbindung abrufbar, und statt einer Browser-Fehlerseite
                erscheint ein eigener Offline-Hinweis mit „Erneut
                versuchen“-Knopf. Sobald du wieder online bist, lädt die App
                automatisch die aktuellen Daten nach.{" "}
                <strong>
                  Neue Inhalte, die Anmeldung und das Speichern von Änderungen
                </strong>{" "}
                brauchen weiterhin eine Verbindung. Darüber hinaus bietet die
                Installation einen bequemeren Zugriff (eigenes Icon, kein
                Adressleisten-Umweg) und die Grundlage für{" "}
                <strong>Push-Benachrichtigungen</strong>, die du wie oben
                beschrieben in deinem Profil ein-/ausschaltest.
              </p>
            </div>
          </LcarsDataRow>

          <LcarsDataRow value={18} htmlId="farbschema" label="Farbschema">
            <div className="lcars-text flex flex-col gap-[12px]">
              <p>
                Die Farbgebung der gesamten Oberfläche kannst du in deinem{" "}
                <strong>Profil</strong> unter <strong>„Darstellung“</strong>{" "}
                wählen. Neben dem <strong>Standard</strong> stehen mehrere echte
                LCARS-Farbschemata bereit (Classic, Science, Nebula, Red Alert,
                Nemesis). Die Auswahl gilt nur für dich, wird sofort als
                Vorschau angewendet und bleibt nach dem{" "}
                <strong>Speichern</strong> auf allen deinen Geräten erhalten.
              </p>
              <p>
                Die Farbauswahl ist in aufklappbare Bereiche gegliedert. Unter{" "}
                <strong>„Hintergrund &amp; Flächen“</strong> stellst du den
                Seitenhintergrund, die Flächen (Panels und Karten — im
                minimalistischen Interface auch die Seitenleiste) und die Rahmen
                ein. Unter <strong>„Schriftfarben“</strong> lässt sich{" "}
                <em>jede Textrolle einzeln</em> festlegen: Fließtext, Lesetext,
                Nebentext, Links &amp; Daten, Kontrasttext und die Beschriftung
                auf farbigen Flächen. Ohne eigene Wahl gilt jeweils der Standard
                des Hell/Dunkel-Modus.
              </p>
              <p>
                Im Bereich <strong>„Akzentfarben“</strong> überschreibst du jede
                einzelne Farbe des Basis-Schemas. Mit{" "}
                <strong>„Zurücksetzen“</strong> (pro Farbe) oder{" "}
                <strong>„Alle zurücksetzen“</strong> kehrst du jederzeit zu den
                Vorgaben zurück. Nicht vergessen, anschließend zu speichern.
              </p>
              <p>
                Ob die Oberfläche <strong>hell</strong> oder{" "}
                <strong>dunkel</strong> erscheint, stellst du unter{" "}
                <strong>„Hell/Dunkel“</strong> ein — <em>unabhängig</em> davon,
                ob du LCARS oder das minimalistische Interface nutzt. Jede
                Kombination ist möglich (LCARS hell, minimal dunkel, …).
              </p>
              <p>
                Unter <strong>„Schriften“</strong> wählst du, in welcher Schrift
                das Archiv gesetzt wird — getrennt für{" "}
                <strong>Überschriften und Fließtext</strong> (Vorgabe:{" "}
                <em>Antonio</em>, die schmalen LCARS-Versalien) und für{" "}
                <strong>Daten und Code</strong> (Vorgabe:{" "}
                <em>Share Tech Mono</em>, die Mono-Zeilen der Karten und
                Aktenfelder). Als Alternativen stehen gängige, gut lesbare
                Schriften bereit; jede Karte zeigt ein Beispiel in der Schrift
                selbst. Wählst du eine andere Textschrift als Antonio, werden
                Überschriften und Beschriftungen normal geschrieben statt
                durchgehend groß — die Farben und Formen von LCARS bleiben. Alle
                Schriften liefert das Archiv selbst aus; es geht keine Anfrage
                an fremde Server. Die Wahl gilt nur für dich, erscheint sofort
                als Vorschau und bleibt nach dem <strong>Speichern</strong>{" "}
                erhalten.
              </p>
              <p>
                Wenn du es lieber schlicht magst, kannst du unter{" "}
                <strong>„Oberfläche“</strong> das LCARS-Design ganz abschalten
                und stattdessen ein <strong>minimalistisches Interface</strong>{" "}
                wählen: schlichte Systemschrift, keine dekorativen Balken und
                Rundungen, und die gesamte Navigation kompakt in der linken
                Seitenleiste (auf dem Handy platzsparend als Symbole). Auch
                diese Wahl gilt nur für dich, wird sofort als Vorschau
                angewendet und bleibt nach dem Speichern erhalten.
              </p>
            </div>
          </LcarsDataRow>
        </div>
      </article>
    </>
  );
}
