import GuideSection, { GuideBody } from "../GuideSection";
import {
  ApLedgerFigure,
  CampaignFigure,
  CatalogEditorFigure,
  GmCharactersFigure,
  GmDialoguesFigure,
  PartySheetFigure,
  SessionsFigure,
  TimelineCsvImportFigure,
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
          Die Kampagnen-Seite bündelt, was die Runde als Ganzes betrifft. Im
          eingeklappten Bereich steht das <strong>Ingame-Jahr</strong> — das Jahr, in dem die
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
          Die <strong>AP-Vergabe, AP-Konten und der Buchungsverlauf</strong>
          liegen zusammen im Menüpunkt „AP“.
        </p>
        <p>
          AP für einen <strong>Missionsabschluss</strong> werden ebenfalls unter
          „AP“ vergeben. Dabei wird die Mission ausgewählt und zugleich auf
          „abgeschlossen“ gesetzt.
        </p>
        <p>
          Die <strong>Missionsübersicht</strong> liegt im Leitungs-Menü unter
          „Missionen“. Dort verwaltest du Missionen und ihre Inhalte.
        </p>
      </GuideSection>

      <GuideSection title="Kampagne · Steigerungsregeln">
        <p>
          Im eingeklappten Bereich <strong>„Steigerungsregeln“</strong> legst du
          Kosten, Erschaffungsbudgets und AP-Vorgaben fest. Spielende können
          die aktuellen Werte unter <strong>„Regeln“ → „Steigerungsregeln“</strong>
          {" "}nachlesen.
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
          Oben auf der Seite <strong>„Sessions“</strong> planst du den nächsten
          Spielabend an: Zeitpunkt, Mission, Ort und wer mitspielt — alle
          aktiven Figuren sind vorausgewählt. Der Termin erscheint danach auf
          der Startseite aller Beteiligten, die dort zu- oder absagen können.
        </p>
        <p>
          Liegt er in der Zukunft, geht die Ankündigung zusätzlich als{" "}
          <strong>Mail und Push</strong> an die Spielenden der eingeplanten
          Figuren — mit Zeitpunkt und Ort. Abonnieren muss dafür
          niemand etwas; die Rückmeldung im Formular nennt, wie viele Personen
          tatsächlich erreicht wurden.
        </p>
        <p>
          Offene Termine stehen hier oberhalb der gespielten Sessions. Du kannst
          sie bearbeiten, löschen oder nach dem Spiel direkt eintragen; neue
          Termine legst du ebenfalls hier an.
        </p>
      </GuideSection>

      <GuideSection title="Sessions · Eintragen und buchen">
        <p>
          Ist der Abend gespielt, macht <strong>„Session eintragen“</strong> am
          Termin daraus in einem Schritt die Nachbuchung: ein Fenster fragt
          Session-AP, Bonus-AP und Zusammenfassungsblöcke ab, übernimmt Datum
          und Besetzung und bucht die AP. Danach erscheint die gespielte Session
          unter „Sessions“ und der Termin verschwindet aus den offenen Terminen.
        </p>
        <p>
          Ohne vorherigen Termin geht es genauso von Hand:{" "}
          <strong>„Session nachtragen“</strong> fragt Datum, Mission, Session-AP,
          Bonus-AP und Zusammenfassungsblöcke ab und schreibt allen Beteiligten
          die AP in einem Rutsch gut. Vorausgewählt sind alle aktiven Charaktere mit verknüpftem
          Konto — wer gefehlt hat, wird einfach abgewählt. Eine versehentlich
          eingetragene Session lässt sich zurücknehmen; die Gutschriften werden
          dann mit storniert.
        </p>
        <p>
          Die Vorbelegung der Session-AP kommt aus dem Regelwerk unter{" "}
          <strong>„Kampagne“ → „Steigerungsregeln“</strong>.
        </p>
        <p>
          Die Karten der gespielten Sessions sind nach Mission gruppiert und
          nach Mission, Datum oder Zusammenfassung durchsuchbar. Ein Klick
          öffnet die Detailseite mit AP, Teilnehmenden und Log-Einträgen.
          Über den Stift bearbeitest du die Session und ihre Log-Einträge; einzelne
          Log-Einträge lassen sich im Formular entfernen. Die Missionschronik zeigt
          sie mit ihrem Ingame-Datum als Titel und Sprungmarke.
        </p>
        <p>
          Jede Session gehört zu einer Mission und erhält ihren Titel samt
          fortlaufender Nummer automatisch. Beim Eintragen kannst du mehrere
          Log-Einträge erfassen: jeder besteht aus Ingame-Datum und Text. Ein
          Notizfeld gibt es nicht mehr. Aus den gespeicherten Einträgen baut
          sich die Missions-Synopsis automatisch auf; du pflegst sie nicht
          zusätzlich von Hand.
        </p>
        <p>
          In der Missionschronik stehen diese GM-Log-Einträge gemeinsam mit den
          Spieler-Logbüchern, nach Ingame-Datum sortiert. Das Inhaltsverzeichnis
          springt zu beiden Arten von Einträgen und zur Synopsis am Ende. Die
          Session-Panels sind einzeln aufklappbar; + und − öffnen oder schließen
          alle zusammen. Die PDF-Missionsakte enthält dieselbe Chronik.
        </p>
        <p>
          Auch die Missionsverwaltung zeigt die zugehörigen Sessions als Karten.
          Von dort öffnest du dieselbe Session-Detailseite zum Bearbeiten.
        </p>
      </GuideSection>
    </GuideBody>
  );
}

// ── Missionen (Leitung) ──────────────────────────────────────────────
export function GmMissionsOverviewGuide() {
  return (
    <GuideBody>
      <GuideSection title="Missionen verwalten" figure={<SessionsFigure />}>
        <p>
          Die Übersicht enthält laufende, abgeschlossene und geplante Missionen.
          Über die Sortierung und Gruppierung kannst du sie nach Datum oder
          Status ordnen; die Suche grenzt die Karten ein. Das Plus legt eine
          Mission an. Ein Klick auf eine Karte öffnet ihre Verwaltungsseite.
        </p>
        <p>
          Die Karte öffnet die Leitungsverwaltung mit Session-Karten und
          Missionseditor. Dort führt „Mission ansehen“ in die öffentliche
          Chronik.
        </p>
      </GuideSection>
    </GuideBody>
  );
}

export function GmMissionDetailGuide() {
  return (
    <GuideBody>
      <GuideSection title="Mission verwalten">
        <p>
          Oben führen die Session-Karten zu den Spielterminen dieser Mission.
          Auf der Detailseite einer Session kannst du Datum, AP, Teilnehmende
          und Log-Einträge anpassen. Der Missionseditor am Ende dieser Seite
          pflegt Beschreibung, Zeitraum, Status und Besetzung.
        </p>
        <p>
          „Mission ansehen“ öffnet die Missionschronik. Dort erscheinen die
          Spieler-Logbücher und die datierten Log-Einträge der Spielleitung
          gemeinsam nach Ingame-Datum. Das Inhaltsverzeichnis springt zu jedem
          Eintrag; die vollständige Synopsis steht am Ende.
        </p>
      </GuideSection>
    </GuideBody>
  );
}

export function GmSessionDetailGuide() {
  return (
    <GuideBody>
      <GuideSection title="Session bearbeiten">
        <p>
          Die Detailseite hält Spieltermin, zugehörige Mission, AP und
          Teilnehmende zusammen. Über den Stift kannst du die Session und ihre
          Log-Einträge bearbeiten; einzelne Einträge lassen sich dort entfernen.
          Gelöscht wird die Session über den Papierkorb. Dabei werden auch ihre
          AP-Buchungen zurückgenommen.
        </p>
        <p>
          Ein Log-Eintrag ist ein datierter Abschnitt für die Missionschronik.
          Seine Nummer läuft über alle Sessions der Mission weiter. Die
          Missionschronik sortiert diese Einträge zusammen mit den Spieler-
          Logbüchern nach Ingame-Datum.
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
          Oben vergibst du AP oder schließt eine Mission mit einer Gutschrift
          ab. Danach folgen die <strong>Kontostände</strong> aller Figuren:
          erhalten, ausgegeben, verfügbar. Darunter steht das gesamte{" "}
          <strong>Buchungsjournal</strong> — jede Gutschrift und jede Ausgabe
          mit Datum und Grund, nach Charakter und Grund filterbar.
          Sammelgutschriften für gespielte Abende entstehen bei der
          Session-Erfassung.
        </p>
      </GuideSection>

      <GuideSection title="AP · Vorgaben aus dem Regelwerk">
        <p>
          Unter <strong>„Kampagne“ → „Steigerungsregeln“</strong> stellst du ein, womit alle
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

// ── Chronologie (Leitung) ────────────────────────────────────────────
export function GmTimelineGuide() {
  return (
    <GuideBody>
      <GuideSection
        title="Chronologie · Ereignisse importieren"
        figure={<TimelineCsvImportFigure />}
      >
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
      <GmMissionsOverviewGuide />
      <GmMissionDetailGuide />
      <GmSessionsGuide />
      <GmSessionDetailGuide />
      <GmCharactersGuide />
      <GmPartySheetGuide />
      <GmApGuide />
      <GmTalentsGuide />
      <GmFocusesGuide />
      <GmTimelineGuide />
      <GmDialoguesGuide />
    </GuideBody>
  );
}
