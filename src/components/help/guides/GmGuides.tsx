import GuideSection, { GuideBody } from "../GuideSection";
import {
  ApLedgerFigure,
  CampaignFigure,
  CampaignRulesFigure,
  CatalogEditorFigure,
  GmCharactersFigure,
  GmDialoguesFigure,
  PartySheetFigure,
  SessionsFigure,
} from "../figures/GmFigures";

// Die Anleitungen zu den zehn Bereichen des Leitungs-Menüs — je Bereich ein
// eigener Baustein, gebaut wie die Anleitung zur Charaktererschaffung
// (character/CharacterCreationGuide.tsx): benannte Abschnitte mit einem
// kleinen Schema daneben.
//
// Jeder Baustein steht an ZWEI Stellen:
//   • als Fenster hinter dem Fragezeichen-Knopf der jeweiligen Seite
//     (/gm/campaign, /gm/sessions, … — siehe help/HelpHeading.tsx), und
//   • gesammelt im Abschnitt „Spielleitung & Admins" der Anleitung
//     (/tutorial), wo vorher eine Aufzählung dieselben Dinge kürzer erzählte.
// Deshalb hier und nicht zweimal: Eine Liste im Tutorial und ein Fenstertext
// auf der Seite liefen unweigerlich auseinander.
//
// Reines JSX ohne Hooks und ohne "use client" — dieselbe Datei läuft
// server-gerendert im Tutorial und im Client-Fenster der Bereichsseite.

// ── Kampagne ─────────────────────────────────────────────────────────
export function GmCampaignGuide() {
  return (
    <GuideBody>
      <GuideSection title="Kampagne · Ingame-Jahr" figure={<CampaignFigure />}>
        <p>
          Die Kampagnen-Seite bündelt, was die Runde als Ganzes betrifft. Ganz
          oben steht das <strong>Ingame-Jahr</strong> — das Jahr, in dem die
          Kampagne gerade spielt. Es ist mehr als eine Anzeige: Trägt eine Figur
          ein <strong>Geburtsdatum</strong>, wird ihr Alter überall aus
          Ingame-Jahr minus Geburtsjahr gerechnet. Ohne Geburtsdatum gilt
          weiterhin das von Hand eingetragene Alter. Ein Jahreswechsel lässt
          also die ganze Besatzung altern, ohne dass jemand seinen Bogen
          anfassen muss.
        </p>
      </GuideSection>

      <GuideSection title="Kampagne · AP und Missionen">
        <p>
          Darunter liegt die <strong>AP-Vergabe</strong> für einzelne Figuren:
          je Charakter eine Zeile mit ihrem Kontostand, den{" "}
          <strong>Schnellknöpfen</strong> für eine Session und ein Logbuch
          (Beträge aus dem Regelwerk unter „AP“) und einer{" "}
          <strong>freien Buchung</strong> aus Betrag, Grund und Notiz. Für
          alles, was eine ganze Session betrifft, ist der Bereich{" "}
          <strong>„Sessions“</strong> der richtige Ort — hier geht es um die
          Einzelbuchung, die dazwischen anfällt.
        </p>
        <p>
          AP für einen <strong>Missionsabschluss</strong> gibt es nur über den
          Abschnitt „Mission abschließen“: Dort wird die Mission ausgewählt und
          die AP vergeben — und die Mission dabei zugleich auf „abgeschlossen“
          gesetzt. Beides in einem Schritt, damit keine abgeschlossene Mission
          ohne Gutschrift und keine Gutschrift ohne Abschluss entsteht.
        </p>
        <p>
          Ganz unten steht die <strong>Missionsverwaltung</strong>: alle
          Missionen mit Bearbeiten, Löschen und der Zuordnung einer
          Besitzerin/eines Besitzers pro Zeile. Sie löste den früheren Menüpunkt
          „Missionen“ ab; die Adresse <strong>/gm/missions</strong> bleibt als
          Direktlink erreichbar.
        </p>
      </GuideSection>
    </GuideBody>
  );
}

// ── Sessions ─────────────────────────────────────────────────────────
export function GmSessionsGuide() {
  return (
    <GuideBody>
      <GuideSection
        title="Sessions · Termine ankündigen"
        figure={<SessionsFigure />}
      >
        <p>
          Mit <strong>„Termin ankündigen“</strong> setzt du den nächsten
          Spielabend an: Zeitpunkt, Ort, eine Notiz und wer mitspielt — alle
          aktiven Figuren sind vorausgewählt. Der Termin erscheint danach auf
          der Startseite aller Beteiligten, die dort zu- oder absagen können.
        </p>
        <p>
          Liegt er in der Zukunft, geht die Ankündigung zusätzlich als{" "}
          <strong>Mail und Push</strong> an die Spielenden der eingeplanten
          Figuren — mit Zeitpunkt, Ort und deiner Notiz. Abonnieren muss dafür
          niemand etwas; die Rückmeldung im Formular nennt, wie viele Personen
          tatsächlich erreicht wurden.
        </p>
      </GuideSection>

      <GuideSection title="Sessions · Eintragen und buchen">
        <p>
          Ist der Abend gespielt, macht <strong>„Session eintragen“</strong> am
          Termin daraus in einem Schritt die Nachbuchung: ein Fenster fragt
          Session-AP, Bonus-AP und Notizen ab, übernimmt Datum, Titel und
          Besetzung und bucht die AP. Der Termin bleibt mit seinen Zusagen in
          der Liste stehen, verschwindet aber von der Startseite.
        </p>
        <p>
          Ohne vorherigen Termin geht es genauso von Hand:{" "}
          <strong>„Session nachtragen“</strong> fragt Datum, Titel, Session-AP,
          Bonus-AP und Notizen ab und schreibt allen Beteiligten die AP in einem
          Rutsch gut. Vorausgewählt sind alle aktiven Charaktere mit verknüpftem
          Konto — wer gefehlt hat, wird einfach abgewählt. Eine versehentlich
          eingetragene Session lässt sich zurücknehmen; die Gutschriften werden
          dann mit storniert.
        </p>
        <p>
          Einer eingetragenen Session lassen sich <strong>Logbücher</strong>{" "}
          zuordnen. Sobald mindestens eines daran hängt, bekommen alle
          Teilnehmenden automatisch die Logbuch-AP extra — einmal je Session,
          egal wie viele Logbücher geschrieben werden. Wird die Zuordnung gelöst
          oder das letzte Logbuch entfernt, verschwindet die Gutschrift ebenso
          automatisch; auch dann, wenn das Logbuch mit seiner ganzen Mission
          gelöscht oder einer anderen Session zugeordnet wird (ein Logbuch hängt
          immer an genau einer Session).
        </p>
        <p>
          Die Vorbelegung der Beträge kommt aus dem Regelwerk unter{" "}
          <strong>„AP“</strong> — dort stehen die AP je Session und je Logbuch.
        </p>
      </GuideSection>
    </GuideBody>
  );
}

// ── Charaktere (Leitung) ─────────────────────────────────────────────
export function GmCharactersGuide() {
  return (
    <GuideBody>
      <GuideSection
        title="Charaktere · Zuordnung"
        figure={<GmCharactersFigure />}
      >
        <p>
          Hier steht, <strong>wem eine Figur gehört</strong>: je Zeile die
          Figur, daneben das Konto, dem sie zugeordnet ist. Ohne Zuordnung
          gehört eine Akte niemandem — sie taucht dann weder im Profil einer
          Person auf noch in den Vorauswahlen für Session-AP. Gast-Accounts
          lassen sich bewusst nicht zuordnen.
        </p>
      </GuideSection>

      <GuideSection title="Charaktere · Erschaffung wieder öffnen">
        <p>
          Der zweite Block zeigt, <strong>wo die Erschaffung steht</strong> —
          und erlaubt, eine <strong>abgeschlossene wieder zu öffnen</strong>,
          etwa wenn sich die Runde nachträglich auf andere Startwerte einigt.
          Attribute, Disziplinen, Talente und Schwerpunkte sind danach wieder
          frei editierbar.
        </p>
        <p>
          Alle Steigerungen seit dem Abschluss werden dabei zurückgenommen: Die
          Werte fallen auf den Stand der Erschaffung, die ausgegebenen AP kommen
          aufs Konto zurück (und der damals gutgeschriebene Erschaffungsrest
          wieder herunter). Nichts davon geht verloren — was zurückgenommen
          wurde, steht als Notiz am Bogen und wird beim erneuten Abschließen
          automatisch wieder angewandt, soweit Regeln und AP es dann noch
          hergeben; was nicht mehr passt, wird beim Abschließen mit Grund
          genannt.
        </p>
      </GuideSection>
    </GuideBody>
  );
}

// ── Gruppenblatt ─────────────────────────────────────────────────────
export function GmPartySheetGuide() {
  return (
    <GuideBody>
      <GuideSection title="Gruppenblatt" figure={<PartySheetFigure />}>
        <p>
          Das Blatt für den Tisch:{" "}
          <strong>alle Charaktere der Runde nebeneinander</strong> — Attribute,
          Disziplinen, Schutz, Stress und Entschlossenheit in einer Tabelle,
          darunter je Figur ihre Talente, Schwerpunkte und Werte. Praktisch,
          wenn eine Probe angesagt wird und schnell klar sein muss, wer sie am
          besten schafft.
        </p>
        <p>
          Bewusst eine breite Tabelle statt Karten: Gefragt ist der Vergleich
          („wer hat die höchste Technik?“), und dafür müssen die Zahlen
          untereinander stehen. Auf schmalen Geräten scrollt sie deshalb
          waagerecht, statt umzubrechen.
        </p>
        <p>
          Ein Klick auf einen Namen öffnet den vollständigen{" "}
          <strong>Charakterbogen</strong> dieser Figur im Fenster — mit
          Spickzettel und allem, was auch die Spielerin oder der Spieler sieht.
          Ein Fenster und kein Link, damit die Tabelle beim Nachschlagen stehen
          bleibt; wer die Akte selbst will, nimmt <strong>„Zur Akte“</strong>{" "}
          darunter.
        </p>
      </GuideSection>
    </GuideBody>
  );
}

// ── AP ───────────────────────────────────────────────────────────────
export function GmApGuide() {
  return (
    <GuideBody>
      <GuideSection
        title="AP · Kontostände und Journal"
        figure={<ApLedgerFigure />}
      >
        <p>
          Oben stehen die <strong>Kontostände</strong> aller Figuren: erhalten,
          ausgegeben, verfügbar. Darunter das gesamte{" "}
          <strong>Buchungsjournal</strong> — jede Gutschrift und jede Ausgabe
          mit Datum und Grund, nach Charakter und Grund filterbar. Vergeben wird
          hier nichts: Einzelbuchungen laufen über <strong>„Kampagne“</strong>,
          Sammelgutschriften über <strong>„Sessions“</strong>. Dieser Bereich
          ist zum Nachvollziehen da — und fürs Regelwerk darunter.
        </p>
      </GuideSection>

      <GuideSection title="AP · Das Regelwerk">
        <p>
          Im <strong>AP-Regelwerk</strong> stellst du ein, womit alle
          Charakterbögen rechnen: die Kosten je Steigerungsschritt, die Kosten
          für Talente und Schwerpunkte, die Budgets und Freikontingente der
          Ersterschaffung, wie viele übrige AP beim Abschließen gutgeschrieben
          werden und die AP je Session und je Logbuch. Jeder Wert lässt sich
          jederzeit auf den Standard zurücksetzen.
        </p>
        <p>
          Änderungen wirken <strong>nach vorn</strong>: Bereits gebuchte AP
          bleiben unberührt, nur was künftig gesteigert wird, rechnet mit den
          neuen Zahlen. Die Bögen übernehmen die neuen Werte sofort — auch die
          Anzeige „was kostet die nächste Steigerung“.
        </p>
      </GuideSection>
    </GuideBody>
  );
}

// ── Talente ──────────────────────────────────────────────────────────
export function GmTalentsGuide() {
  return (
    <GuideBody>
      <GuideSection title="Talente" figure={<CatalogEditorFigure />}>
        <p>
          Hier pflegst du den <strong>Talent-Katalog</strong>, aus dem die
          Charakterbögen ihre Auswahlliste speisen: durchsuchen, nach Kategorie
          filtern, bestehende Talente bearbeiten und eigene ergänzen. Frei
          eintippen lässt sich ein Talent auf keinem Bogen mehr — was gespielt
          wird, muss deshalb hier stehen.
        </p>
        <p>
          Das Formular für einen <strong>neuen Eintrag</strong> steht ganz oben.
          Dabei gilt: Der <strong>Name darf keine Klammern enthalten</strong> —
          die sind für den eigenen Namen reserviert, den sich eine Figur beim
          Übernehmen geben darf („Eigener Name (Originalname)“). Die{" "}
          <strong>Voraussetzung</strong> („Conn 2+“ und dergleichen) gehört ins
          eigene Feld; der Bogen setzt sie selbst in Klammern dahinter und
          blendet damit Talente aus, deren Bedingungen eine Figur nicht erfüllt.
        </p>
        <p>
          <strong>Löschen</strong> lassen sich nur selbst ergänzte Talente —
          sonst verschwänden Einträge unter bereits gepflegten Bögen. Eine
          gerade gespeicherte Änderung steht beim Zurückkehren sofort in der
          Liste.
        </p>
      </GuideSection>
    </GuideBody>
  );
}

// ── Schwerpunkte ─────────────────────────────────────────────────────
export function GmFocusesGuide() {
  return (
    <GuideBody>
      <GuideSection title="Schwerpunkte" figure={<CatalogEditorFigure />}>
        <p>
          Das Gegenstück zum Talent-Katalog: der{" "}
          <strong>Schwerpunkt-Katalog</strong> (Focuses) mit den 170 Einträgen
          aus dem Regelwerk, nach Disziplin gegliedert, durchsuchbar und
          filterbar.
        </p>
        <p>
          Ein neuer Schwerpunkt — das Formular dafür steht ganz oben — bekommt
          einen <strong>Namen</strong>, eine <strong>Disziplin</strong> und
          wahlweise eine Erläuterung. Derselbe Name darf in <em>zwei</em>{" "}
          Disziplinen stehen — auf dem Bogen ist es derselbe Schwerpunkt, die
          Liste zeigt ihn als eine Zeile mit beiden Disziplinen daneben. Anders
          als bei Talenten gibt es keinen eigenen Namen: Auf dem Bogen steht der
          Katalogname.
        </p>
        <p>
          Auch hier lassen sich nur <strong>selbst ergänzte</strong> Einträge
          wieder löschen.
        </p>
      </GuideSection>
    </GuideBody>
  );
}

// ── Eigene Regeln ────────────────────────────────────────────────────
export function GmRulesGuide() {
  return (
    <GuideBody>
      <GuideSection title="Eigene Regeln" figure={<CampaignRulesFigure />}>
        <p>
          Hier hinterlegst du die <strong>Hausregeln der Runde</strong>: Name,
          Regeltext und eine Zahl für die Reihenfolge. Sie erscheinen auf dem
          Spickzettel <em>jedes</em> Charakterbogens — auch im PDF — hinter den
          Regeln aus dem Regelwerk, und gelten dort für alle gleich.
        </p>
        <p>
          Anders als bei Talenten und Schwerpunkten lässt sich jede Regel wieder
          löschen: Sie steht auf keinem Bogen als Eintrag, sondern wird bei
          jeder Anzeige frisch dazugeholt. Eine gerade gespeicherte Änderung
          steht beim Zurückkehren sofort in der Liste.
        </p>
      </GuideSection>
    </GuideBody>
  );
}

// ── Chronologie (Leitung) ────────────────────────────────────────────
export function GmTimelineGuide() {
  return (
    <GuideBody>
      <GuideSection title="Chronologie · Ereignisse importieren">
        <p>
          Hier ergänzt du die öffentliche Chronologie gesammelt um{" "}
          <strong>eigene Ereignisse aus einer CSV-Datei</strong>. Lade zuerst
          die leere Musterdatei herunter: Sie enthält die richtige Kopfzeile und
          eine Kommentarzeile mit den wichtigsten Formatregeln.
        </p>
        <p>
          Die Spalten heißen <code>Datum;Titel;Teaser;Text;Charaktere</code>;
          mehrere Figuren in der letzten Spalte werden durch Kommas getrennt.
          Eigene Kommentarzeilen beginnen mit <code>#</code>. Die Datei wird
          erst vollständig geprüft und dann als Ganzes gespeichert — bei einem
          unbekannten oder mehrdeutigen Charakternamen wird nichts importiert.
        </p>
        <p>
          Darunter stehen alle frei eingetragenen oder importierten Ereignisse.
          Dort lassen sie sich wieder entfernen. Noch vorhandene Einträge aus
          der früheren automatischen Ableitung bleiben ebenfalls sichtbar und
          löschbar; neue Ableitungen gibt es nicht mehr.
        </p>
        <p>
          Von Hand gesetzte Marken im Text (
          <code>&lt;!-- timeline: JJJJ-MM-TT | Titel | Kategorie --&gt;</code>)
          sind der zweite Weg: Sie setzen eine unsichtbare Sprungmarke an genau
          der Textstelle. Einzufügen sind sie über den{" "}
          <strong>Kalender-Knopf</strong> der Werkzeugleiste — an den
          Textfeldern von Charakteren, Missionen, Logbüchern und
          Datenbank-Einträgen. Er öffnet ein Fenster mit Datum, Titel und der
          Ereignisart zur Auswahl; die Liste ist dieselbe wie im Zeitstrahl, ein
          Vertippen bei der Art ist damit ausgeschlossen.
        </p>
      </GuideSection>
    </GuideBody>
  );
}

// ── Gespräche (Leitung) ──────────────────────────────────────────────
export function GmDialoguesGuide() {
  return (
    <GuideBody>
      <GuideSection title="Gespräche" figure={<GmDialoguesFigure />}>
        <p>
          Die Übersicht <strong>aller offenen Gespräche</strong> — unabhängig
          davon, ob die Spielleitung selbst beteiligt ist. Je Karte stehen{" "}
          <strong>Titel</strong>, <strong>Teilnehmer</strong>,{" "}
          <strong>Owner</strong> und wann zuletzt geschrieben wurde; ein Klick
          führt ins Gespräch.
        </p>
        <p>
          Die Übersicht selbst greift nicht ein: Das Gespräch öffnet sich für
          Leitung und Administration <strong>ohne Antwortformular</strong>,
          solange sie nicht selbst teilnehmen. So lässt sich verfolgen, wo etwas
          hakt oder wo eine Antwort fehlt, ohne sich ungefragt einzumischen. Wer
          Gespräche moderieren darf, findet unter jeder Karte zusätzlich{" "}
          <strong>„Metadaten bearbeiten“</strong> — dort lassen sich Titel,
          Beteiligte und Besitzer:in korrigieren.
        </p>
      </GuideSection>
    </GuideBody>
  );
}

// Alle Leitungs-Bereiche am Stück — so stehen sie im Abschnitt
// „Spielleitung & Admins" der Anleitung (/tutorial). Die GuideBody-Rahmen der
// einzelnen Bausteine schachteln sich dabei ineinander; das ist nur eine
// weitere flex-Spalte und ändert am Abstand nichts.
export default function GmAreaGuides() {
  return (
    <GuideBody>
      <GmCampaignGuide />
      <GmSessionsGuide />
      <GmCharactersGuide />
      <GmPartySheetGuide />
      <GmApGuide />
      <GmTalentsGuide />
      <GmFocusesGuide />
      <GmRulesGuide />
      <GmTimelineGuide />
      <GmDialoguesGuide />
    </GuideBody>
  );
}
