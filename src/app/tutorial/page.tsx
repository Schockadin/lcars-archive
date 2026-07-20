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
      <article className="mb-[10px] pr-[var(--lcars-elbow-size)] tutorial-content">
        <p className="lcars-eyebrow">Anleitung</p>
        <h1>Tutorial</h1>
        <p className="lcars-text">
          Dieses Archiv dokumentiert eine laufende Pen-&-Paper-Kampagne —
          Charaktere, Missionen, Einsatzberichte und Archiv-Einträge, die sich
          mit jeder Session weiterentwickeln. Diese Seite erklärt alle
          Funktionen: was du auch ohne Konto sehen kannst, was du mit einem
          eigenen Konto selbst anlegen darfst, und was Spielleitung (GM) und
          Administration zusätzlich können. Klicke einen Abschnitt an, um ihn
          auf-/zuzuklappen.
        </p>

        <div className="flex flex-col gap-[10px] mt-[16px]">
          <LcarsDataRow
            value={1}
            label="Für Besucher"
            color="var(--lcars-blue)"
          >
            <div className="lcars-text flex flex-col gap-[12px]">
              <p>
                Ohne Konto lässt sich der Großteil des Archivs lesen:{" "}
                <strong>Charaktere</strong> (Personalakten mit Biografie),{" "}
                <strong>Missionen</strong> (mit ihren Einsatzberichten), das
                kategorisierte <strong>Archiv</strong> (Personen, Orte,
                Fraktionen, Spezies, Objekte, Ereignisse, Theorien, NPCs,
                abgeschlossene Gespräche und Sonstiges), die{" "}
                <strong>Timeline</strong> (chronologische Übersicht aller
                Ereignisse) sowie die <strong>Suche</strong> (Volltextsuche über
                alle diese Inhalte).
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
            label="Konto & Rollen"
            color="var(--lcars-purple)"
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
                  Einsatzberichte, Gespräche und Archiv-Einträge an und
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
                  Archiv-Einträge anzulegen.
                </li>
              </ul>
            </div>
          </LcarsDataRow>

          <LcarsDataRow
            value={3}
            label="Eigene Inhalte"
            color="var(--lcars-amber)"
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
                  <strong>Archiv-Eintrag</strong> — darf jede:r anlegen, ganz
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
                Eigene Entwürfe (siehe unten) erscheinen in „Meine Inhalte“
                gesammelt ganz oben in einer eigenen Übersicht, unabhängig vom
                Kategorie-Filter.
              </p>
              <p>
                Beim Anlegen oder Bearbeiten eines Charakters, einer Mission,
                eines Einsatzberichts oder eines Archiv-Eintrags kannst du das
                Formular statt zu veröffentlichen auch erst als{" "}
                <strong>Entwurf</strong> speichern (Checkbox unter dem Textfeld)
                — der Text ist dann nicht mehr Pflicht. Ein Entwurf bleibt
                unabhängig von seiner Sichtbarkeitsstufe für niemanden außer dir
                sichtbar, nicht einmal für Spielleitung oder Administration
                (Ausnahme: Missionen sehen alle aus der Spielleitung, da sie
                kein Einzel-Owner-Modell haben), erscheint aber bereits unter
                „Meine Inhalte“, dort deutlich markiert.
              </p>
              <p>
                Mission-Synopsen, Archiv-Einträge und Charakter-Biografien
                lassen sich zusätzlich{" "}
                <strong>direkt auf ihrer Detailseite</strong> bearbeiten
                („Bearbeiten“-Knopf über dem Text) — ohne Umweg über ein
                separates Formular.
              </p>
              <p>
                Ein <strong>Gespräch</strong> startest du mit deinem Charakter
                und dem Charakter einer oder mehrerer anderer Personen
                (Mehrfachauswahl); es beginnt <strong>offen</strong> — nur
                Teilnehmende können antworten. Der Owner (wer das Gespräch
                begonnen hat) kann auch danach jederzeit weitere Personen direkt
                hinzufügen (samt Info-Mail an sie). Wer mit mehreren eigenen
                Charakteren teilnimmt, kann nicht zweimal hintereinander mit
                demselben Charakter antworten — dazwischen muss ein anderer
                Charakter am Zug gewesen sein. Sobald ein Gespräch mehr als zwei
                Teilnehmende hat, muss man sich das Antwortrecht zusätzlich erst
                per Button für zwei Stunden reservieren, bevor man schreiben
                kann — solange jemand anderes reserviert hat, seht ihr, wer
                gerade dran ist und könnt euch optional per Mail/Push
                benachrichtigen lassen, sobald die Sperre wieder endet (oder
                wenn die reservierende Person selbst antwortet, endet sie
                vorzeitig). Ein offenes Gespräch aktualisiert sich dabei
                automatisch — neue Nachrichten und Änderungen am Antwortrecht
                erscheinen von selbst, ohne dass du die Seite neu laden musst.
                Sobald eine teilnehmende Person es abschließt, wird es{" "}
                <strong>unwiderruflich geschlossen</strong> und taucht danach
                als gewöhnlicher Archiv-Eintrag in der Kategorie „Gespräche“ auf
                — standardmäßig als zusammenhängender Lesetext, per Umschalter
                oben auf der Seite aber auch wie ein offenes Gespräch mit
                einzelnen Nachrichtenkarten anzeigbar. Diese Einstellung gilt
                für alle abgeschlossenen Gespräche, die du dir ansiehst.
              </p>
            </div>
          </LcarsDataRow>

          <LcarsDataRow
            value={4}
            label="Merken & Abonnieren"
            color="var(--lcars-blue)"
          >
            <div className="lcars-text flex flex-col gap-[12px]">
              <p>
                Auf Charakter-, Missions- und Archiv-Seiten findest du zwei
                Knöpfe: <strong>„Merken“</strong> speichert den Eintrag für dich
                selbst (Filter „Gespeichert“ auf der Suchseite) — ohne jede
                Benachrichtigung. <strong>„Abonnieren“</strong> meldet dich für
                Update-Benachrichtigungen zu genau diesem Eintrag an — du
                bekommst eine Nachricht, sobald der Charakter, die Mission oder
                der Archiv-Eintrag bearbeitet wird (z.B. wenn ein abonniertes
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
                Eingeloggt zeigt dir die <strong>Startseite</strong> dein
                persönliches Dashboard: offene Gespräche in einer eigenen
                Sektion sowie einen farbcodierten <strong>News-Feed</strong> mit
                neu erstellten (grün), bearbeiteten (blau) und gelöschten (rot)
                Inhalten — plus deine Lesezeichen und Abos.
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

          <LcarsDataRow value={5} label="Markdown" color="var(--lcars-amber)">
            <div className="lcars-text flex flex-col gap-[12px]">
              <p>
                Alle längeren Texte (Biografien, Synopsen, Einsatzberichte,
                Archiv-Einträge, Gesprächsnachrichten) werden in{" "}
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
                den Abschnitt für Spielleitung/Admins) — der markierte Zeitpunkt
                taucht danach auf der Timeline-Seite auf.
              </p>
            </div>
          </LcarsDataRow>

          <LcarsDataRow value={6} label="Verlinkung" color="var(--lcars-blue)">
            <div className="lcars-text flex flex-col gap-[12px]">
              <p>
                Um im Fließtext auf einen Charakter, eine Mission oder einen
                Archiv-Eintrag zu verweisen, schreibst du seinen Namen in
                doppelte eckige Klammern: <code>[[Name]]</code>. Willst du einen
                abweichenden Anzeigetext, trennst du ihn mit einem senkrechten
                Strich ab: <code>[[Name|Anzeigetext]]</code>. Das Archiv löst
                das automatisch zum passenden Link auf, sobald das Ziel
                existiert.
              </p>
              <p>
                Wer sich das Tippen der Klammern sparen will, aktiviert beim
                Speichern das Kästchen <strong>„Automatisch verlinken“</strong>{" "}
                unter dem Textfeld: Es durchsucht deinen Text nach bekannten
                Charakter-Namen (inkl. Aliasen), Missions- und
                Archiv-Eintrag-Titeln und verlinkt <strong>jede</strong>{" "}
                Erwähnung automatisch. Codeblöcke, Inline-Code, Bilder und
                bereits vorhandene Links bleiben dabei unangetastet, und dein
                eigener Eintrag verlinkt sich nie selbst.
              </p>
              <p>
                Spielleitung/Admin haben zusätzlich ein eigenständiges
                Autolinking-Werkzeug direkt auf jeder Detailseite (im
                „Admin-Aktionen“-Bereich), das denselben Mechanismus auf bereits
                gespeicherte Inhalte anwendet, plus ein Werkzeug, um Wikilinks
                wieder zu entfernen (macht Autolinking-Ergebnisse rückgängig)
                und eines, das gerade Anführungszeichen/Apostrophe zu
                typografisch korrekten Zeichen vereinheitlicht.
              </p>
            </div>
          </LcarsDataRow>

          <LcarsDataRow
            value={7}
            label="Spielleitung & Admins"
            color="var(--lcars-purple)"
          >
            <div className="lcars-text flex flex-col gap-[12px]">
              <p>Zusätzlich zu allem oben Genannten kann die Spielleitung:</p>
              <ul className="list-disc pl-[20px] flex flex-col gap-[4px]">
                <li>
                  Missionen anlegen, bearbeiten und Einsatzberichte dazu
                  einsehen.
                </li>
                <li>
                  Über das eigene <strong>„Leitung“</strong>-Menü im Header
                  (analog zum Admin-Menü) auf drei Übersichten zugreifen:
                  unter <strong>„Missionen“</strong> alle Missionen mit
                  Bearbeiten-, Löschen- und Besitzer:in-Zuordnung pro Zeile
                  statt einzeln über die jeweilige Detailseite; unter{" "}
                  <strong>„Charaktere“</strong> Charaktere Spieler:innen
                  zuweisen (Gast-Accounts ausgenommen); unter{" "}
                  <strong>„Gespräche“</strong> alle aktuell offenen Gespräche
                  einsehen, auch ohne eigene Teilnahme — ein Klick öffnet das
                  Gespräch lesend, ohne Antwortformular. Über jedes neu
                  begonnene Gespräch wird die Spielleitung außerdem automatisch
                  per Mail/Push informiert, unabhängig von eigener Teilnahme.
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
                  ) über den Kalender-Knopf in der Textwerkzeugleiste einfügen
                  und die komplette Timeline aus den aktuellen Datenbank-
                  Inhalten neu erzeugen lassen.
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
                  die Detailseite eines Users dessen Rolle ändern, das Konto
                  (de)aktivieren oder löschen, einen Passwort-Reset auslösen
                  oder es auf allen Geräten abmelden.
                </li>
                <li>
                  Unter <strong>„Scripts“</strong> alle Missionen ohne
                  Besitzer:in auf einen Schlag einer Spielleitung zuordnen,
                  sowie Cache/Timeline neu aufbauen.
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
                </li>
                <li>
                  Unter <strong>„Import“</strong> eine oder mehrere
                  Markdown-Dateien im Vault-Frontmatter-Format hochladen, um
                  daraus neue Archiv-Einträge, Missionen, Charaktere oder
                  Missionslogs anzulegen. Jede Datei lässt sich einzeln
                  durchblättern, vor dem Anlegen noch bearbeiten und muss danach
                  einzeln bestätigt werden.
                </li>
                <li>
                  In jedem Gespräch als Moderation jede Nachricht bearbeiten
                  oder löschen (auch fremde und auch in bereits abgeschlossenen
                  Gesprächen) sowie dessen Besitzer:in ändern — beides
                  ausschließlich der Administration vorbehalten, nicht der
                  Spielleitung.
                </li>
              </ul>
              <p>
                Administration sieht außerdem als einzige Rolle ausnahmslos alle
                Inhalte, auch private.
              </p>
            </div>
          </LcarsDataRow>

          <LcarsDataRow
            value={8}
            label="App installieren"
            color="var(--lcars-amber)"
          >
            <div className="lcars-text flex flex-col gap-[12px]">
              <p>
                Das Archiv lässt sich als eigenständige App auf dein Gerät
                installieren (Icon auf dem Home-Bildschirm, eigenes Fenster ohne
                Browser-Leiste) — unter „App installieren“ in deinem Profil oder
                direkt hier:
              </p>
              <InstallPwaPrompt />
              <p>
                Wichtig zu wissen: Die installierte App speichert Inhalte{" "}
                <strong>nicht</strong> für den Offline-Zugriff — du brauchst
                weiterhin eine Internetverbindung. Der einzige Zweck der
                App-Installation ist ein bequemerer Zugriff (eigenes Icon, kein
                Adressleisten-Umweg) sowie die Grundlage für{" "}
                <strong>Push-Benachrichtigungen</strong>, die du wie oben
                beschrieben in deinem Profil ein-/ausschaltest.
              </p>
            </div>
          </LcarsDataRow>
        </div>
      </article>
    </>
  );
}
