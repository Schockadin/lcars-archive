import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { LcarsDataRow } from "@/components/lcars";
import InstallPwaPrompt from "@/app/user/InstallPwaPrompt";

export const metadata: Metadata = {
  title: "Tutorial",
  robots: { index: false },
};

// Öffentliche, statische Tutorial-Seite — erklärt das Archiv für drei
// Zielgruppen (Besucher/User/Spielleitung), erreichbar über /tutorial
// direkt, den Footer-Link (siehe ElbowBar.tsx) und einen Verweis im Profil
// (siehe users/[id]/page.tsx). Als DataRow-Akkordeons strukturiert (gleiches Muster
// wie "Meine Inhalte"/Admin-Panel) statt einer langen Textwüste — die
// breitesten Themen (Markdown/Verlinkung/PWA) stehen standardmäßig offen,
// rollenspezifische Abschnitte eingeklappt.
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
            htmlId="fuer-besucher"
            label="Für Besucher"
          >
            <div className="lcars-text flex flex-col gap-[12px]">
              <p>
                Ohne Konto lässt sich der Großteil der Datenbank lesen:{" "}
                <strong>Charaktere</strong> (Personalakten mit Biografie,
                darunter auch die Übersicht abgeschlossener{" "}
                <strong>Gespräche</strong>), <strong>Missionen</strong> (mit
                ihren Einsatzberichten), das kategorisierte{" "}
                <strong>Datenbank</strong> (Personen, Orte, Fraktionen, Spezies,
                Objekte, Ereignisse, Theorien, NPCs und Sonstiges) sowie die{" "}
                <strong>Suche</strong> (Volltextsuche über alle diese Inhalte,
                erreichbar über das Lupen-Symbol im Menü).
              </p>
              <p>
                Manche Inhalte sind nicht öffentlich: Jeder Eintrag hat eine
                Sichtbarkeitsstufe — <strong>Öffentlich</strong> (alle),{" "}
                <strong>GM</strong> (nur Spielleitung + der/die Ersteller:in)
                oder <strong>Privat</strong> (nur der/die Ersteller:in).
                Nicht-öffentliche Inhalte sind für dich als Besucher:in einfach
                nicht vorhanden.
              </p>
              <p>
                Ein eigenes Konto kannst du dir nicht selbst anlegen — Zugänge
                werden ausschließlich von der Spielleitung oder Administration
                per Einladung vergeben (siehe nächster Abschnitt).
              </p>
              <p>
                Kleiner Tipp am Rand: Auf schmalen Bildschirmen gibt es oben
                einen <strong>Lesemodus</strong>-Knopf, der die Navigation
                ausblendet und den Text breiter/größer darstellt.
              </p>
            </div>
          </LcarsDataRow>

          <LcarsDataRow
            value={2}
            htmlId="konto-rollen"
            label="Konto & Rollen"
          >
            <div className="lcars-text flex flex-col gap-[12px]">
              <p>
                Konten entstehen nur durch Einladung: Spielleitung oder
                Administration legen dein Konto mit E-Mail-Adresse und Rolle an,
                du bekommst daraufhin eine E-Mail mit einem Aktivierungslink,
                über den du dein Passwort festlegst. Ein Passwort vergessen?
                Über „Passwort vergessen“ auf der Login-Seite kannst du dir
                jederzeit selbst einen neuen Aktivierungslink zuschicken lassen.
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
                  & Admins“), aber keine Nutzerverwaltung — private Inhalte
                  anderer bleiben ihr ebenfalls verborgen.
                </li>
                <li>
                  <strong>Spieler:in</strong> — legt eigene Charaktere,
                  Einsatzberichte, Gespräche und Datenbank-Einträge an und
                  verwaltet deren Sichtbarkeit.
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
            value={3}
            htmlId="eigene-inhalte"
            label="Eigene Inhalte"
          >
            <div className="lcars-text flex flex-col gap-[12px]">
              <p>
                Unter <strong>„Inhalte“</strong> (Menü oben, sobald du
                eingeloggt bist) findest du zwei klar getrennte Bereiche:{" "}
                <strong>„Neue Inhalte“</strong> mit den Anlegen-Knöpfen und{" "}
                <strong>„Inhalte verwalten“</strong>, wo alles auftaucht, was
                dir bereits gehört:
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
                Bei jedem eigenen Eintrag legst du die Sichtbarkeit fest:{" "}
                <strong>Privat</strong> (nur du), <strong>GM</strong> (du +
                Spielleitung) oder <strong>Öffentlich</strong> (alle) — änderbar
                jederzeit über das Dropdown neben dem Eintrag in „Meine
                Inhalte“. Direkt daneben findest du zwei Symbol-Knöpfe zum{" "}
                <strong>Bearbeiten</strong> (Stift) und <strong>Löschen</strong>{" "}
                (Mülleimer) — Löschen steht bei allen fünf Inhaltstypen zur
                Verfügung, auch bei eigenen Charakteren, Missionen (nur
                Spielleitung) und Gesprächen (nur für die Person, die es
                begonnen hat).
              </p>
              <p>
                <strong>Deine Charaktere</strong> haben einen eigenen Menüpunkt:
                Sobald mindestens ein Charakter mit deinem Konto verknüpft ist,
                erscheint oben <strong>„Charaktere“</strong>. Dort stehen alle
                deine Charaktere (auch Entwürfe) mit Knöpfen für Sichtbarkeit,
                Öffnen und Löschen — und du kannst weitere anlegen.
              </p>
              <p>
                <strong>Einen neuen Charakter</strong> legst du in vier
                Schritten an: zuerst die <strong>Stammdaten</strong> (Name,
                Rang, Spezies und was sonst zur Akte gehört), dann die{" "}
                <strong>Werte</strong>, dann die <strong>Biografie</strong> und
                zuletzt eine <strong>Vorschau</strong> des fertigen
                Charakterbogens. Über die Schaltflächen ganz oben springst du
                jederzeit zwischen den Schritten hin und her; was du schon
                eingetragen hast, bleibt dabei stehen. Gespeichert wird alles
                erst mit <strong>„Fertig“</strong> — brichst du vorher ab, ist
                nichts angelegt.
              </p>
              <p>
                Im Schritt <strong>Werte</strong> trägst du die sechs Attribute
                und sechs Disziplinen in Zahlenkästen ein; daneben läuft mit,
                was deine Verteilung kostet und wie viel Budget übrig ist. Dazu
                kommen die Personalakte (Pronomen, Rolle, Zuweisung, Herkunft,
                Erziehung, Laufbahn, Erfahrung, Merkmale), Schutz,
                Entschlossenheit, Ansehen und der Stress-Bonus. Die Listen —
                Werte, Schwerpunkte, Talente, Angriffe, Ausrüstung, Hobbys,
                Karriere-Ereignisse — füllst du über{" "}
                <strong>„Hinzufügen“</strong>; jeder Eintrag hat ein rotes Minus
                zum Entfernen. Talente kommen aus dem Katalog (siehe unten). Bei
                Werten, Schwerpunkten und Talenten steht dabei, wie viele der
                freien Plätze aus der Ersterschaffung du schon vergeben hast.
                Spezies-Fähigkeiten und Sonderregeln bleiben Textfelder — dort
                stehen meist ganze Regelsätze. Leere Felder gelten als „nicht
                angegeben“; der maximale Stress ist kein Eingabefeld, sondern
                ergibt sich aus Fitness und dem Bonus aus Talenten.
              </p>
              <p>
                <strong>Deine Charakterseite</strong> zeigt danach Stammdaten,
                Werte und Biografie als drei Abschnitte untereinander. Bei
                Stammdaten und Biografie öffnet der <strong>Stift</strong> in
                der Titelzeile das Formular an Ort und Stelle; die Werte
                steigerst du mit AP (siehe unten). Ganz oben öffnet{" "}
                <strong>„Charakterbogen“</strong> die Vorschau: Blatt 1 der
                Personalbogen mit Stammdaten und Werten, Blatt 2 der
                Talent-Spickzettel, Blatt 3 die Biografie im selben Look. Dort
                stehen auch die Knöpfe zum <strong>Drucken</strong> und zum{" "}
                <strong>Speichern als PDF</strong> — die PDF-Datei enthält
                dieselben drei Blätter. Rang und Spezies stehen auf dem Bogen,
                kommen aber aus den Stammdaten; im Kasten „Species &amp; Traits“
                steht die Spezies vorne, deine weiteren Merkmale trägst du
                dahinter ein. In „Meine Inhalte“ tauchen Charaktere nicht auf —
                der Charakter-Filter für Einsatzberichte und Gespräche bleibt
                dort aber erhalten.
              </p>
              <p>
                <strong>Erfahrungspunkte (AP)</strong>: Für die Ersterschaffung
                hast du je 320 AP für Attribute und Disziplinen (statt der 56
                bzw. 16 Verteilpunkte) sowie 4 Werte, 4 Talente und 6
                Schwerpunkte frei — die Werte trägst du dabei direkt ein, der
                Bogen zeigt dir laufend an, was deine Verteilung kostet und wie
                viel Budget übrig ist. Bist du zufrieden, schließt du die
                Erschaffung ab. Danach sind Attribute, Disziplinen, Talente und
                Schwerpunkte gesperrt und wachsen nur noch über AP:{" "}
                <strong>Attribut steigern</strong> kostet (neuer Wert − 7) × 10
                AP, <strong>Disziplin steigern</strong> (neuer Wert) × 10 AP,
                ein <strong>Talent</strong> oder <strong>Schwerpunkt</strong> je
                20 AP. AP bekommst du von der Spielleitung: je 1 AP für eine
                gespielte Session und ein geschriebenes Logbuch, dazu etwas für
                abgeschlossene Missionen und Story-Arcs. Auf dem Bogen siehst du
                dein Konto, die Kosten jeder möglichen Steigerung und alle
                bisherigen Buchungen. Alle genannten Zahlen sind die
                Voreinstellung — die Spielleitung kann das Regelwerk anpassen,
                der Bogen rechnet dann mit ihren Werten.
              </p>
              <p>
                Der AP-Bereich rechnet dabei <strong>live</strong> mit: Während
                du in der Erschaffung Attribute und Disziplinen einträgst,
                siehst du sofort, was deine Verteilung kostet, wie viel Budget
                noch übrig ist und mit wie vielen AP du nach dem Abschließen
                startest. Denn was du nicht verbrauchst, ist nicht verloren —
                bis zu 10 übrige AP (von der Spielleitung einstellbar) werden
                dir beim Abschließen gutgeschrieben. Nach der Erschaffung zeigt
                dir jeder Steigern-Knopf, wie viele AP dir danach bleiben.
              </p>
              <p>
                Wichtig beim Abschließen: festgeschrieben wird der{" "}
                <strong>gespeicherte</strong> Stand. Trage deshalb erst alle
                Attribute und Disziplinen ein und speichere unten — solange noch
                ein Feld leer ist oder das Budget überzogen ist, bleibt der
                Knopf gesperrt. Sonst stünde dein Bogen dauerhaft mit Lücken da:
                nach dem Abschließen lassen sich die Felder nur noch über AP
                steigern, und ein leeres Feld hat keinen Wert, den man steigern
                könnte.
              </p>
              <p>
                <strong>Talente</strong> tippst du nicht ab, sondern wählst sie
                aus einem Katalog. Ein Klick auf „Talent wählen“ öffnet ein
                Fenster mit <strong>Suchfeld</strong> (Name, Voraussetzung oder
                Regeltext) und Kategorie-Filter; ein Klick auf ein Talent klappt
                seine <strong>Beschreibung</strong> auf. Angezeigt werden dabei
                nur Talente, deren <strong>Voraussetzungen du erfüllst</strong>{" "}
                — gemessen an deinen aktuellen Attributen, Disziplinen, deiner
                Spezies und den Talenten, die du schon hast. Voraussetzungen,
                die sich nicht automatisch prüfen lassen (Merkmale, Rollen oder
                „nach Entscheidung der Spielleitung“), blenden nichts aus; über
                den Schalter „Nur erfüllbare“ siehst du bei Bedarf auch den
                Rest. Was schon auf deinem Bogen steht, taucht gar nicht erst
                auf. Ein Klick auf <strong>„Übernehmen“</strong> setzt das
                Talent direkt — beim Steigern werden die AP dabei gleich
                abgebucht (der Betrag steht auf dem Knopf).
              </p>
              <p>
                Die Talent-Liste auf dem Bogen ist deshalb kein Textfeld mehr:
                Talente kommen ausschließlich aus dem Katalog, und jeder Eintrag
                hat ein kleines rotes Minus zum Entfernen. Während der
                Erschaffung zählt der Bogen mit, wie viele deiner{" "}
                <strong>vier freien Talente</strong> du schon vergeben hast; ist
                das Kontingent voll, kommen weitere erst nach dem Abschließen
                der Erschaffung über AP hinzu. Danach ist die Liste
                schreibgeschützt — Talente ändern sich dann nur noch über den
                AP-Bereich.
              </p>
              <p>
                Beim Übernehmen kannst du einem Talent einen{" "}
                <strong>eigenen Namen</strong> geben — auf dem Bogen steht dann
                „Eigener Name (Originalname)“. Der Originalname bleibt so
                erhalten: dasselbe Talent lässt sich nicht versehentlich ein
                zweites Mal kaufen, und Voraussetzungen anderer Talente erkennen
                es weiterhin. Fehlt ein Talent im Katalog — etwa eines, das ihr
                im Spiel vereinbart habt — nimmt die Spielleitung es unter
                „Talente“ auf; frei eintippen lässt es sich bewusst nicht mehr,
                sonst ließen sich Voraussetzungen und Regeltexte nicht mehr
                zuordnen. Für die Spielleitung heißt das beim Anlegen: der
                Katalogname darf keine Klammern enthalten — die sind für den
                eigenen Namen reserviert. Die Voraussetzung („Conn 2+“ und
                dergleichen) gehört ins eigene Feld, der Bogen setzt sie selbst
                in Klammern dahinter.
              </p>
              <p>
                Ganz unten am Bogen findest du einen{" "}
                <strong>Spickzettel</strong>: alle Talente deines Charakters mit
                ihrem vollen Regeltext, zum Nachschlagen am Spieltisch.
              </p>
              <p>
                Für die Zahlen gelten die <strong>Regeln der Runde</strong>:
                Attribute liegen zwischen 7 und 12, davon darf höchstens eines
                auf 12 und zwei dürfen auf 11 stehen; Disziplinen liegen
                zwischen 1 und 5, höchstens eine auf 5 und zwei auf 4. Verstöße
                markiert das Formular sofort und verhindert das Speichern. Der
                maximale <strong>Stress</strong> ist kein Eingabefeld: er ergibt
                sich aus deiner Fitness plus dem Bonus, den Talente darauf geben
                (z.B. „Resolut: +3 max. Stress“) — diesen Bonus trägst du einmal
                ein, den Rest rechnet die Seite.
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
                — der Text ist dann nicht mehr Pflicht. Ein Entwurf bleibt
                unabhängig von seiner Sichtbarkeitsstufe für niemanden außer dir
                sichtbar, nicht einmal für Spielleitung oder Administration
                (Ausnahme: Missionen sehen alle aus der Spielleitung, da sie
                kein Einzel-Owner-Modell haben), erscheint aber bereits unter
                „Meine Inhalte“ bzw. „Charaktere“, dort deutlich markiert.
              </p>
              <p>
                Mission-Synopsen, Datenbank-Einträge und Charakter-Biografien
                lassen sich zusätzlich{" "}
                <strong>direkt auf ihrer Detailseite</strong> bearbeiten
                („Bearbeiten“-Knopf über dem Text) — ohne Umweg über ein
                separates Formular.
              </p>
              <p>
                <strong>Gespräche</strong> sind ein eigener Inhaltstyp mit ein
                paar Besonderheiten — sie haben weiter unten eine eigene
                Sektion.
              </p>
            </div>
          </LcarsDataRow>

          <LcarsDataRow
            value={4}
            htmlId="gespraeche"
            label="Gespräche"
          >
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
                Anlegen aus, wer den NPC übernimmt. Umgekehrt kann die
                Spielleitung ein Gespräch aus Sicht eines NPC mit euren
                Charakteren beginnen. Danach läuft alles wie gewohnt: Der NPC
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
                die Seite neu laden musst.
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
            value={5}
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
                bzw. als PDF herunterladen. Bei noch offenen, laufenden
                Gesprächen fehlt er bewusst, da sich deren Inhalt noch ändert.
              </p>
              <p>
                Auf der Seite deines eigenen Charakters (und für die
                Spielleitung auf jeder Charakterseite) steht außerdem der Knopf{" "}
                <strong>„Charakterbogen“</strong>: er zeigt den gepflegten Bogen
                als reine Ansicht — mit Vollbild und demselben PDF-Download wie
                in deiner eigenen Charakterseite. Gepflegt werden die Werte
                weiterhin nur von der Person, der der Charakter gehört.
              </p>
              <p>
                Eingeloggt zeigt dir die <strong>Startseite</strong> dein
                persönliches Dashboard: offene Gespräche in einer eigenen
                Sektion sowie einen farbcodierten <strong>News-Feed</strong> mit
                neu erstellten (grün), bearbeiteten (blau) und gelöschten (rot)
                Inhalten — plus deine Lesezeichen und Abos.
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

          <LcarsDataRow
            value={6}
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

          <LcarsDataRow value={7} htmlId="markdown" label="Markdown">
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
            </div>
          </LcarsDataRow>

          <LcarsDataRow
            value={8}
            htmlId="verlinkung"
            label="Verlinkung"
          >
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
                Charakter-Namen (inkl. Aliasen), Missions- und
                Datenbank-Eintrag-Titeln und verlinkt <strong>jede</strong>{" "}
                Erwähnung automatisch. Bei <strong>neuen</strong> Inhalten ist
                dieses Kästchen bereits vorausgewählt; beim Bearbeiten
                bestehender Inhalte ist es standardmäßig aus. Codeblöcke,
                Inline-Code, Bilder und bereits vorhandene Links bleiben dabei
                unangetastet, und dein eigener Eintrag verlinkt sich nie selbst.
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
            value={9}
            htmlId="spielleitung-admins"
            label="Spielleitung & Admins"
          >
            <div className="lcars-text flex flex-col gap-[12px]">
              <p>Zusätzlich zu allem oben Genannten kann die Spielleitung:</p>
              <ul className="list-disc pl-[20px] flex flex-col gap-[4px]">
                <li>
                  Missionen anlegen, bearbeiten und Einsatzberichte dazu
                  einsehen.
                </li>
                <li>
                  Über das eigene <strong>„Leitung“</strong>-Menü im Header (es
                  steht getrennt neben dem Admin-Menü — wer beide Rollen hat,
                  sieht beide Menüs nebeneinander) unter{" "}
                  <strong>„Kampagne“</strong> an einer Stelle das aktuelle{" "}
                  <strong>Ingame-Jahr</strong> einstellen, Charaktere
                  Spieler:innen zuweisen (Gast-Accounts ausgenommen) und alle
                  Missionen mit Bearbeiten-, Löschen- und Besitzer:in-Zuordnung
                  pro Zeile verwalten. (Der ebenfalls dort liegende Eintrag{" "}
                  <strong>„Gespräche“</strong> ist in der eigenen
                  Gespräche-Sektion oben beschrieben.)
                </li>
                <li>
                  Unter <strong>„Sessions“</strong> gespielte Sessions eintragen
                  (Datum, Titel, Session-AP, Bonus-AP, Notizen) und damit allen
                  Beteiligten die AP in einem Rutsch gutschreiben. Vorausgewählt
                  sind alle aktiven Charaktere mit verknüpftem Konto — wer
                  gefehlt hat, wird einfach abgewählt. Eine versehentlich
                  eingetragene Session lässt sich zurücknehmen, die Gutschriften
                  werden dann mit storniert.
                </li>
                <li>
                  Einer eingetragenen Session <strong>Logbücher</strong>{" "}
                  zuordnen: Sobald mindestens eines daran hängt, bekommen alle
                  Teilnehmenden automatisch die Logbuch-AP extra — einmal je
                  Session, egal wie viele Logbücher geschrieben werden. Wird die
                  Zuordnung wieder gelöst oder das letzte Logbuch entfernt,
                  verschwindet die Gutschrift ebenso automatisch — auch dann,
                  wenn das Logbuch mit seiner ganzen Mission gelöscht oder einer
                  anderen Session zugeordnet wird (ein Logbuch hängt immer an
                  genau einer Session).
                </li>
                <li>
                  AP für einen <strong>Missionsabschluss</strong> gibt es nur
                  über den Abschnitt „Mission abschließen“ auf der
                  Kampagnen-Seite: Dort wird die Mission ausgewählt, die AP
                  vergeben — und die Mission dabei auf „abgeschlossen“ gesetzt.
                </li>
                <li>
                  Unter <strong>„AP“</strong> alle Kontostände und das gesamte
                  Buchungsjournal einsehen (nach Charakter und Grund filterbar)
                  sowie das <strong>AP-Regelwerk</strong> einstellen: Kosten je
                  Steigerungsschritt, Kosten für Talente und Schwerpunkte, die
                  Budgets und Freikontingente der Ersterschaffung und die AP je
                  Session und Logbuch — jederzeit auf die Standardwerte
                  zurücksetzbar. Bereits gebuchte AP bleiben unberührt; nur was
                  künftig gesteigert wird, rechnet mit den neuen Zahlen.
                </li>
                <li>
                  Unter <strong>„Talente“</strong> den Talent-Katalog pflegen,
                  aus dem die Charakterbögen ihre Auswahlliste speisen:
                  durchsuchen, filtern, bestehende Talente bearbeiten und eigene
                  ergänzen. Löschen lassen sich nur selbst ergänzte Talente —
                  sonst verschwänden Einträge unter bereits gepflegten Bögen.
                </li>
                <li>
                  Das <strong>Ingame-Jahr</strong> (unter „Kampagne“) bestimmt
                  das angezeigte <strong>Alter</strong> von Charakteren: Trägt
                  ein Charakter ein Geburtsdatum, wird sein Alter automatisch
                  aus Ingame-Jahr minus Geburtsjahr berechnet (sonst gilt das
                  manuell eingetragene Alter).
                </li>
                <li>
                  Über die „Admin-Aktionen“ jeder Detailseite Autolinking,
                  Wikilinks-Entfernen und Text-Formatieren auch auf fremde,
                  bereits gespeicherte Inhalte anwenden.
                </li>
                <li>
                  Zeitleisten-Marker (
                  <code>
                    &lt;!-- timeline: JJJJ-MM-TT | Titel | Kategorie --&gt;
                  </code>
                  ) über den Kalender-Knopf in der Textwerkzeugleiste einfügen.
                  Sie setzen eine unsichtbare Sprungmarke an der Textstelle und
                  halten die Datengrundlage für eine mögliche künftige
                  Zeitleisten-Funktion vor.
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
            value={10}
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

          <LcarsDataRow
            value={11}
            htmlId="farbschema"
            label="Farbschema"
          >
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
                Direkt darüber wählst du unter{" "}
                <strong>„Hintergrund &amp; Schrift“</strong> optional eine eigene
                Hintergrund- und Schriftfarbe für die gesamte Oberfläche. Ohne
                eigene Wahl gilt der Standard des jeweiligen Hell/Dunkel-Modus.
              </p>
              <p>
                Darunter kannst du unter <strong>„Feineinstellung“</strong> jede
                einzelne Akzentfarbe mit einer eigenen Farbe überschreiben. Mit{" "}
                <strong>„Zurücksetzen“</strong> (pro Farbe) oder{" "}
                <strong>„Alle zurücksetzen“</strong> kehrst du jederzeit zu den
                Farben des gewählten Schemas zurück. Nicht vergessen,
                anschließend zu speichern.
              </p>
              <p>
                Ob die Oberfläche <strong>hell</strong> oder{" "}
                <strong>dunkel</strong> erscheint, stellst du unter{" "}
                <strong>„Hell/Dunkel“</strong> ein — <em>unabhängig</em> davon,
                ob du LCARS oder das minimalistische Interface nutzt. Jede
                Kombination ist möglich (LCARS hell, minimal dunkel, …).
              </p>
              <p>
                Wenn du es lieber schlicht magst, kannst du unter{" "}
                <strong>„Oberfläche“</strong> das LCARS-Design ganz abschalten
                und stattdessen ein <strong>minimalistisches Interface</strong>{" "}
                wählen: schlichte Systemschrift, keine dekorativen Balken und
                Rundungen, und die gesamte Navigation kompakt in der linken
                Seitenleiste (auf dem Handy platzsparend als Symbole). Auch diese
                Wahl gilt nur für dich, wird sofort als Vorschau angewendet und
                bleibt nach dem Speichern erhalten.
              </p>
            </div>
          </LcarsDataRow>
        </div>
      </article>
    </>
  );
}
