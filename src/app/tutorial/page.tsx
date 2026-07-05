import type { Metadata } from "next";
import PageMeta from "@/components/PageMeta";
import { LcarsDataRow } from "@/components/lcars";
import InstallPwaPrompt from "@/app/users/[id]/InstallPwaPrompt";

export const metadata: Metadata = {
  title: "Tutorial",
  robots: { index: false },
};

// Öffentliche, statische Tutorial-Seite — erklärt das Archiv für drei
// Zielgruppen (Besucher/User/Spielleitung), erreichbar über /tutorial
// direkt, den Footer-Link (siehe ElbowBar.tsx) und einen Verweis in den
// User-Einstellungen. Als DataRow-Akkordeons strukturiert (gleiches Muster
// wie "Meine Inhalte"/Admin-Panel) statt einer langen Textwüste — die
// breitesten Themen (Markdown/Verlinkung/PWA) stehen standardmäßig offen,
// rollenspezifische Abschnitte eingeklappt.
export default function TutorialPage() {
  return (
    <>
      <PageMeta title="Tutorial" section="tutorial" />
      <article className="mb-[10px] max-w-[800px] pr-[var(--lcars-elbow-size)] tutorial-content">
        <p className="lcars-eyebrow">Anleitung</p>
        <h1>Tutorial</h1>
        <p className="lcars-text">
          Dieses Archiv dokumentiert eine laufende Pen-&-Paper-Kampagne —
          Charaktere, Missionen, Einsatzberichte und Archiv-Einträge, die
          sich mit jeder Session weiterentwickeln. Diese Seite erklärt alle
          Funktionen: was du auch ohne Konto sehen kannst, was du mit einem
          eigenen Konto selbst anlegen darfst, und was Spielleitung (GM) und
          Administration zusätzlich können. Klicke einen Abschnitt an, um ihn
          auf-/zuzuklappen.
        </p>

        <div className="flex flex-col gap-[10px] mt-[16px]">
          <LcarsDataRow value={1} label="Für Besucher (ohne Konto)" color="var(--lcars-blue)" defaultOpen>
            <div className="lcars-text flex flex-col gap-[12px]">
              <p>
                Ohne Konto lässt sich der Großteil des Archivs lesen:{" "}
                <strong>Charaktere</strong> (Personalakten mit Biografie),{" "}
                <strong>Missionen</strong> (mit ihren Einsatzberichten),
                das kategorisierte <strong>Archiv</strong> (Personen, Orte,
                Fraktionen, Spezies, Objekte, Ereignisse, Theorien, NPCs,
                abgeschlossene Gespräche und Sonstiges), die{" "}
                <strong>Timeline</strong> (chronologische Übersicht aller
                Ereignisse) sowie die <strong>Suche</strong> (Volltextsuche
                über alle diese Inhalte).
              </p>
              <p>
                Manche Inhalte sind nicht öffentlich: Jeder Eintrag hat eine
                Sichtbarkeitsstufe — <strong>Öffentlich</strong> (alle),{" "}
                <strong>GM</strong> (nur Spielleitung + der/die Ersteller:in)
                oder <strong>Privat</strong> (nur der/die Ersteller:in).
                Nicht-öffentliche Inhalte sind für dich als Besucher:in
                einfach nicht vorhanden.
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

          <LcarsDataRow value={2} label="Konto, Rollen & Berechtigungen" color="var(--lcars-purple)">
            <div className="lcars-text flex flex-col gap-[12px]">
              <p>
                Konten entstehen nur durch Einladung: Spielleitung oder
                Administration legen dein Konto mit E-Mail-Adresse und Rolle
                an, du bekommst daraufhin eine E-Mail mit einem
                Aktivierungslink, über den du dein Passwort festlegst. Ein
                Passwort vergessen? Über „Passwort vergessen“ auf der
                Login-Seite kannst du dir jederzeit selbst einen neuen
                Aktivierungslink zuschicken lassen.
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
                  Admin-Werkzeuge an Inhalten (siehe Abschnitt „Für
                  Spielleitung & Admins“), aber keine Nutzerverwaltung —
                  private Inhalte anderer bleiben ihr ebenfalls verborgen.
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

          <LcarsDataRow value={3} label="Eigene Inhalte: Anlegen, Bearbeiten & Sichtbarkeit" color="var(--lcars-amber)">
            <div className="lcars-text flex flex-col gap-[12px]">
              <p>
                Unter <strong>„Meine Inhalte“</strong> (verlinkt aus deinem
                Dashboard) siehst du alles, was dir gehört, und findest die
                Anlegen-Knöpfe:
              </p>
              <ul className="list-disc pl-[20px] flex flex-col gap-[4px]">
                <li>
                  <strong>Archiv-Eintrag</strong> — darf jede:r anlegen, ganz
                  ohne Voraussetzung.
                </li>
                <li>
                  <strong>Charakter</strong> — darf jede:r außer Gast-Accounts
                  anlegen; der Charakter wird sofort mit deinem Konto
                  verknüpft.
                </li>
                <li>
                  <strong>Einsatzbericht</strong> und{" "}
                  <strong>Gespräch</strong> — setzen einen eigenen Charakter
                  voraus (der Knopf erscheint erst, sobald du einen hast).
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
                Inhalte“.
              </p>
              <p>
                Mission-Synopsen, Archiv-Einträge und Charakter-Biografien
                lassen sich zusätzlich <strong>direkt auf ihrer Detailseite</strong>{" "}
                bearbeiten („Bearbeiten“-Knopf über dem Text) — ohne Umweg
                über ein separates Formular.
              </p>
              <p>
                Ein <strong>Gespräch</strong> startest du mit deinem
                Charakter und dem Charakter einer anderen Person; es beginnt{" "}
                <strong>offen</strong> — nur ihr beide (oder Spielleitung/
                Admin) könnt antworten. Sobald eine Seite es abschließt, wird
                es <strong>unwiderruflich geschlossen</strong> und taucht
                danach als gewöhnlicher Archiv-Eintrag in der Kategorie
                „Gespräche“ auf.
              </p>
            </div>
          </LcarsDataRow>

          <LcarsDataRow value={4} label="Merken, Abonnieren & Benachrichtigungen" color="var(--lcars-blue)">
            <div className="lcars-text flex flex-col gap-[12px]">
              <p>
                Auf Charakter-, Missions- und Archiv-Seiten findest du zwei
                Knöpfe: <strong>„Merken“</strong> speichert den Eintrag für
                dich selbst (Filter „Gespeichert“ auf der Suchseite) — ohne
                jede Benachrichtigung. <strong>„Abonnieren“</strong> meldet
                dich für Update-Benachrichtigungen zu genau diesem Eintrag an
                (z.B. wenn ein abonniertes Gespräch abgeschlossen wird).
              </p>
              <p>
                Ob Benachrichtigungen dich tatsächlich erreichen, steuerst du
                in den <strong>Einstellungen</strong> über zwei Hauptschalter:
                E-Mail- und Push-Benachrichtigungen. Für Push-Benachrichtigungen
                muss zusätzlich jedes Gerät einzeln zustimmen (Browser-
                Berechtigung) — der Hauptschalter bestimmt, ob der Server
                überhaupt versucht zu senden, die Geräte-Freigabe, ob genau
                dieses Gerät sie empfängt.
              </p>
            </div>
          </LcarsDataRow>

          <LcarsDataRow value={5} label="Markdown-Formatierung" color="var(--lcars-amber)" defaultOpen>
            <div className="lcars-text flex flex-col gap-[12px]">
              <p>
                Alle längeren Texte (Biografien, Synopsen, Einsatzberichte,
                Archiv-Einträge, Gesprächsnachrichten) werden in{" "}
                <strong>Markdown</strong> geschrieben — einer einfachen
                Auszeichnungssprache aus reinem Text. Über jedem Textfeld
                findest du eine Werkzeugleiste, die die Syntax für dich
                einfügt, sowie einen <strong>Rohtext/Vorschau</strong>-Umschalter,
                der zeigt, wie der Text am Ende aussieht. Neben jedem Hinweis
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
                      <td><code># Titel</code></td>
                      <td>Überschrift (mehr <code>#</code> = kleinere Ebene)</td>
                    </tr>
                    <tr>
                      <td><code>**fett**</code></td>
                      <td>Fett</td>
                    </tr>
                    <tr>
                      <td><code>*kursiv*</code></td>
                      <td>Kursiv</td>
                    </tr>
                    <tr>
                      <td><code>~~text~~</code></td>
                      <td>Durchgestrichen</td>
                    </tr>
                    <tr>
                      <td><code>[Text](https://…)</code></td>
                      <td>Link</td>
                    </tr>
                    <tr>
                      <td><code>- Eintrag</code></td>
                      <td>Aufzählung</td>
                    </tr>
                    <tr>
                      <td><code>1. Eintrag</code></td>
                      <td>Nummerierte Liste</td>
                    </tr>
                    <tr>
                      <td><code>&gt; Zitat</code></td>
                      <td>Zitat</td>
                    </tr>
                    <tr>
                      <td><code>`Code`</code></td>
                      <td>Inline-Code</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                Für Spielleitung/Admin gibt es in derselben Werkzeugleiste
                zusätzlich einen Kalender-Knopf, der an der Cursor-Position
                einen Zeitleisten-Marker einfügt (siehe „Verlinkung“ unten und
                den Abschnitt für Spielleitung/Admins) — der markierte
                Zeitpunkt taucht danach auf der Timeline-Seite auf.
              </p>
            </div>
          </LcarsDataRow>

          <LcarsDataRow value={6} label="Verlinkung: Wikilinks & Automatisches Verlinken" color="var(--lcars-blue)" defaultOpen>
            <div className="lcars-text flex flex-col gap-[12px]">
              <p>
                Um im Fließtext auf einen Charakter, eine Mission oder einen
                Archiv-Eintrag zu verweisen, schreibst du seinen Namen in
                doppelte eckige Klammern: <code>[[Name]]</code>. Willst du
                einen abweichenden Anzeigetext, trennst du ihn mit einem
                senkrechten Strich ab: <code>[[Name|Anzeigetext]]</code>. Das
                Archiv löst das automatisch zum passenden Link auf, sobald das
                Ziel existiert.
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
                „Admin-Aktionen“-Bereich), das denselben Mechanismus auf
                bereits gespeicherte Inhalte anwendet, plus ein Werkzeug, um
                Wikilinks wieder zu entfernen (macht Autolinking-Ergebnisse
                rückgängig) und eines, das gerade Anführungszeichen/Apostrophe
                zu typografisch korrekten Zeichen vereinheitlicht.
              </p>
            </div>
          </LcarsDataRow>

          <LcarsDataRow value={7} label="Für Spielleitung (GM) & Admins" color="var(--lcars-purple)">
            <div className="lcars-text flex flex-col gap-[12px]">
              <p>
                Zusätzlich zu allem oben Genannten kann die Spielleitung:
              </p>
              <ul className="list-disc pl-[20px] flex flex-col gap-[4px]">
                <li>Missionen anlegen, bearbeiten und Einsatzberichte dazu einsehen.</li>
                <li>
                  Charaktere Spieler:innen zuweisen (Nutzerverwaltung unter{" "}
                  <code>/users</code>) — Gast-Accounts ausgenommen.
                </li>
                <li>
                  Über die „Admin-Aktionen“ jeder Detailseite Autolinking,
                  Wikilinks-Entfernen und Text-Formatieren auch auf fremde,
                  bereits gespeicherte Inhalte anwenden.
                </li>
                <li>
                  Zeitleisten-Marker (<code>&lt;!-- timeline: JJJJ-MM-TT | Titel | Kategorie --&gt;</code>)
                  über den Kalender-Knopf in der Textwerkzeugleiste einfügen
                  und die komplette Timeline aus den aktuellen Datenbank-
                  Inhalten neu erzeugen lassen.
                </li>
              </ul>
              <p>
                Administration kann zusätzlich Nutzerkonten anlegen, Rollen
                ändern, deaktivieren oder löschen — und sieht als einzige
                Rolle ausnahmslos alle Inhalte, auch private.
              </p>
            </div>
          </LcarsDataRow>

          <LcarsDataRow value={8} label="Als App installieren (PWA)" color="var(--lcars-amber)" defaultOpen>
            <div className="lcars-text flex flex-col gap-[12px]">
              <p>
                Das Archiv lässt sich als eigenständige App auf dein Gerät
                installieren (Icon auf dem Home-Bildschirm, eigenes Fenster
                ohne Browser-Leiste) — unter „App installieren“ in den
                Einstellungen oder direkt hier:
              </p>
              <InstallPwaPrompt />
              <p>
                Wichtig zu wissen: Die installierte App speichert Inhalte{" "}
                <strong>nicht</strong> für den Offline-Zugriff — du brauchst
                weiterhin eine Internetverbindung. Der einzige Zweck der
                App-Installation ist ein bequemerer Zugriff (eigenes Icon,
                kein Adressleisten-Umweg) sowie die Grundlage für{" "}
                <strong>Push-Benachrichtigungen</strong>, die du wie oben
                beschrieben in den Einstellungen ein-/ausschaltest.
              </p>
            </div>
          </LcarsDataRow>
        </div>
      </article>
    </>
  );
}
