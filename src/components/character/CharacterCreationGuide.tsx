import {
  ApFigure,
  CatalogFigure,
  PortraitFigure,
  SheetFigure,
  StatsFigure,
  StepsFigure,
} from "./CharacterCreationFigures";
import GuideSection, { GuideBody } from "@/components/help/GuideSection";

// Der Charakter-Erschaffungsprozess, an einer Stelle beschrieben und an vier
// Stellen gezeigt: als eigener Abschnitt der Anleitung (/tutorial, Anker
// „charaktererschaffung", siehe src/lib/tutorialSections.ts) UND als Fenster
// über der eigenen Charakterliste (/user/characters), im Anlege-Assistenten
// (/user/characters/new) und auf der eigenen Charakterseite — also überall
// dort, wo man gerade an einer Figur arbeitet und nachschlagen will, ohne die
// halb ausgefüllte Seite zu verlassen (siehe help/HelpButton.tsx).
//
// Bewusst reines JSX ohne Hooks, Server-Importe und "use client": so lässt
// sich dieselbe Datei von der server-gerenderten Anleitung UND aus dem
// Client-Fenster heraus einbinden, statt den Text zweimal zu pflegen — zwei
// Kopien liefen unweigerlich auseinander.
//
// Gegliedert in acht benannte Abschnitte statt einer Absatzfolge: Der Text
// ist lang, und wer ihn MITTEN im Anlegen aufschlägt, sucht eine bestimmte
// Stelle („Wie war das mit den Talenten?") statt ihn von vorn zu lesen. Die
// Überschriften sind die Sprungmarken dafür; jeder Abschnitt trägt ein
// kleines Schema seiner Maske (siehe CharacterCreationFigures.tsx). Abschnitt
// und Rahmen kommen aus help/GuideSection.tsx — dieselben wie in den übrigen
// Bereichs-Anleitungen.
//
// Die Überschrift des Ganzen setzt die jeweilige Umgebung (Akkordeon-Zeile
// bzw. Fenster-Kopf), hier stehen nur die Abschnitte.

export default function CharacterCreationGuide() {
  return (
    <GuideBody>
      <GuideSection title="Die vier Schritte" figure={<StepsFigure />}>
        <p>
          <strong>Einen neuen Charakter</strong> legst du in vier Schritten an:
          zuerst die <strong>Stammdaten</strong> (Name, Rang, Spezies und was
          sonst zur Akte gehört), dann die <strong>Werte</strong>, dann die{" "}
          <strong>Biografie</strong> und zuletzt eine <strong>Vorschau</strong>{" "}
          des fertigen Charakterbogens. Über die Schaltflächen ganz oben
          springst du jederzeit zwischen den Schritten hin und her; was du schon
          eingetragen hast, bleibt dabei stehen. Gespeichert wird alles erst mit{" "}
          <strong>„Fertig“</strong> — brichst du vorher ab, ist nichts angelegt.
        </p>
      </GuideSection>

      <GuideSection
        title="Das Portrait und sein Ausschnitt"
        figure={<PortraitFigure />}
      >
        <p>
          Das <strong>Portrait</strong> lädst du beim Anlegen in den Stammdaten
          und später im eigenen <strong>Profilbild-Panel</strong> als
          <strong> Bilddatei</strong> hoch — eine Bild-Adresse kannst du nicht
          mehr angeben: ein Bild auf einem fremden Server verschwindet, sobald
          dort jemand aufräumt, und lässt sich hier nicht zuschneiden. Passt das
          Bild nicht ins hochkant stehende Bildfeld des Bogens, wähl den
          Ausschnitt selbst: <strong>„Ausschnitt wählen“</strong> öffnet ein
          Fenster, das den Bildkasten samt seiner Schräge zeigt — ziehen
          verschiebt das Bild, der Regler vergrößert es bis zum Vierfachen.{" "}
          <strong>„Übernehmen“</strong> merkt den Ausschnitt vor; gespeichert
          wird er mit dem Formular. Gespeichert wird dabei{" "}
          <em>dein Originalbild</em> — der Ausschnitt ist nur die Angabe,
          welcher Teil davon im Bildkasten erscheint (Bildschirm wie PDF). Du
          kannst ihn also jederzeit neu wählen, ohne dass das Bild bei jedem Mal
          schlechter wird, und wo das ganze Bild hingehört — im Karussell auf
          deiner Charakterseite — steht es unbeschnitten. Ohne eigenen
          Ausschnitt zeigt der Bogen die Bildmitte. Früher eingetragene Adressen
          holt die Administration einmalig ins Archiv, sodass am Ende jedes
          Portrait dem Archiv selbst gehört — dein Bogen sieht danach aus wie
          vorher, nur hängt er nicht mehr an einem fremden Server.
        </p>
      </GuideSection>

      <GuideSection title="Werte eintragen" figure={<StatsFigure />}>
        <p>
          Im Schritt <strong>Werte</strong> trägst du die sechs Attribute und
          sechs Disziplinen in Zahlenkästen ein; daneben läuft mit, was deine
          Verteilung kostet und wie viel Budget übrig ist. Dazu kommen die
          Personalakte (Pronomen, Rolle, Zuweisung, Herkunft, Erziehung,
          Laufbahn, Erfahrung, Merkmale), Schutz, Entschlossenheit, Ansehen und
          der Stress-Bonus. Die Listen — Werte, Schwerpunkte, Talente, Angriffe,
          Ausrüstung, Hobbys, Karriere-Ereignisse — füllst du über{" "}
          <strong>„Hinzufügen“</strong>; jeder Eintrag hat ein rotes Minus zum
          Entfernen. Talente <em>und Schwerpunkte</em> kommen aus ihrem Katalog
          (siehe unten). Bei Werten, Schwerpunkten und Talenten steht dabei, wie
          viele der freien Plätze aus der Ersterschaffung du schon vergeben
          hast. Spezies-Fähigkeiten und Sonderregeln bleiben Textfelder — dort
          stehen meist ganze Regelsätze. Leere Felder gelten als „nicht
          angegeben“; der maximale Stress ist kein Eingabefeld, sondern ergibt
          sich aus Fitness und dem Bonus aus Talenten.
        </p>
        <p>
          Für die Zahlen gelten die <strong>Regeln der Runde</strong>: Attribute
          liegen zwischen 7 und 12, davon darf höchstens eines auf 12 und zwei
          dürfen auf 11 stehen; Disziplinen liegen zwischen 1 und 5, höchstens
          eine auf 5 und zwei auf 4. Verstöße markiert das Formular sofort und
          verhindert das Speichern. Der maximale <strong>Stress</strong> ist
          kein Eingabefeld: er ergibt sich aus deiner Fitness plus dem Bonus,
          den Talente darauf geben (z.B. „Resolut: +3 max. Stress“) — diesen
          Bonus trägst du einmal ein, den Rest rechnet die Seite.
        </p>
        <p>
          Wichtig beim Abschließen: festgeschrieben wird der{" "}
          <strong>gespeicherte</strong> Stand. Trage deshalb erst alle Attribute
          und Disziplinen ein und speichere unten — solange noch ein Feld leer
          ist oder das Budget überzogen ist, bleibt der Knopf gesperrt. Sonst
          stünde dein Bogen dauerhaft mit Lücken da: nach dem Abschließen lassen
          sich die Felder nur noch über AP steigern, und ein leeres Feld hat
          keinen Wert, den man steigern könnte.
        </p>
      </GuideSection>

      <GuideSection title="Erfahrungspunkte (AP)" figure={<ApFigure />}>
        <p>
          <strong>Erfahrungspunkte (AP)</strong>: Für die Ersterschaffung hast
          du je 320 AP für Attribute und Disziplinen (statt der 56 bzw. 16
          Verteilpunkte) sowie 4 Werte, 4 Talente und 6 Schwerpunkte frei — die
          Werte trägst du dabei direkt ein, der Bogen zeigt dir laufend an, was
          deine Verteilung kostet und wie viel Budget übrig ist. Bist du
          zufrieden, schließt du die Erschaffung ab. Danach sind Attribute,
          Disziplinen, Talente und Schwerpunkte gesperrt und wachsen nur noch
          über AP: <strong>Attribut steigern</strong> kostet (neuer Wert − 7) ×
          10 AP, <strong>Disziplin steigern</strong> (neuer Wert) × 10 AP, ein{" "}
          <strong>Talent</strong> oder <strong>Schwerpunkt</strong> je 20 AP. AP
          bekommst du von der Spielleitung: je 1 AP für eine gespielte Session
          und ein geschriebenes Logbuch, dazu etwas für abgeschlossene Missionen
          und Story-Arcs. Auf dem Bogen siehst du dein Konto und die Kosten
          jeder möglichen Steigerung direkt am jeweiligen Wert. Alle genannten
          Zahlen sind die Voreinstellung — die Spielleitung kann das Regelwerk
          anpassen, der Bogen rechnet dann mit ihren Werten.
        </p>
        <p>
          Der Bogen rechnet dabei <strong>live</strong> mit: Während du in der
          Erschaffung Attribute und Disziplinen einträgst, siehst du sofort, was
          deine Verteilung kostet, wie viel Budget noch übrig ist und mit wie
          vielen AP du nach dem Abschließen startest. Denn was du nicht
          verbrauchst, ist nicht verloren — bis zu 10 übrige AP (von der
          Spielleitung einstellbar) werden dir beim Abschließen gutgeschrieben.
          Nach der Erschaffung zeigt dir jeder Steigern-Knopf, wie viele AP dir
          danach bleiben.
        </p>
      </GuideSection>

      <GuideSection title="Talente" figure={<CatalogFigure />}>
        <p>
          <strong>Talente</strong> tippst du nicht ab, sondern wählst sie aus
          einem Katalog. Ein Klick auf „Talent wählen“ öffnet ein Fenster mit{" "}
          <strong>Suchfeld</strong> (Name, Voraussetzung oder Regeltext) und
          Kategorie-Filter; ein Klick auf ein Talent klappt seine{" "}
          <strong>Beschreibung</strong> auf. Angezeigt werden dabei nur Talente,
          deren <strong>Voraussetzungen du erfüllst</strong> — gemessen an
          deinen aktuellen Attributen, Disziplinen, deiner Spezies und den
          Talenten, die du schon hast. Voraussetzungen, die sich nicht
          automatisch prüfen lassen (Merkmale, Rollen oder „nach Entscheidung
          der Spielleitung“), blenden nichts aus; über den Schalter „Nur
          erfüllbare“ siehst du bei Bedarf auch den Rest. Was schon auf deinem
          Bogen steht, taucht gar nicht erst auf. Ein Klick auf{" "}
          <strong>„Übernehmen“</strong> setzt das Talent direkt — beim Steigern
          werden die AP dabei gleich abgebucht (der Betrag steht auf dem Knopf).
        </p>
        <p>
          Die Talent-Liste auf dem Bogen ist deshalb kein Textfeld mehr: Talente
          kommen ausschließlich aus dem Katalog, und jeder Eintrag hat ein
          kleines rotes Minus zum Entfernen. Während der Erschaffung zählt der
          Bogen mit, wie viele deiner <strong>vier freien Talente</strong> du
          schon vergeben hast; ist das Kontingent voll, kommen weitere erst nach
          dem Abschließen der Erschaffung über AP hinzu. Danach ist die Liste
          schreibgeschützt — Talente ändern sich dann nur noch über den grünen
          Plus-Knopf direkt an der Talent-Liste.
        </p>
        <p>
          Beim Übernehmen kannst du einem Talent einen{" "}
          <strong>eigenen Namen</strong> geben — auf dem Bogen steht dann
          „Eigener Name (Originalname)“. Der Originalname bleibt so erhalten:
          dasselbe Talent lässt sich nicht versehentlich ein zweites Mal kaufen,
          und Voraussetzungen anderer Talente erkennen es weiterhin. Fehlt ein
          Talent im Katalog — etwa eines, das ihr im Spiel vereinbart habt —
          nimmt die Spielleitung es unter „Talente“ auf; frei eintippen lässt es
          sich bewusst nicht mehr, sonst ließen sich Voraussetzungen und
          Regeltexte nicht mehr zuordnen. Für die Spielleitung heißt das beim
          Anlegen: der Katalogname darf keine Klammern enthalten — die sind für
          den eigenen Namen reserviert. Die Voraussetzung („Conn 2+“ und
          dergleichen) gehört ins eigene Feld, der Bogen setzt sie selbst in
          Klammern dahinter.
        </p>
      </GuideSection>

      <GuideSection title="Schwerpunkte">
        <p>
          <strong>Schwerpunkte</strong> (Focuses) wählst du genauso aus einem
          Katalog — 170 Einträge aus dem Regelwerk, nach Disziplin gegliedert.
          Das Fenster hat ein Suchfeld und einen Disziplin-Filter; was schon auf
          deinem Bogen steht, taucht nicht mehr auf. Sechs Schwerpunkte führt
          das Regelwerk in <em>zwei</em> Disziplinen („Astrophysics“ bei
          Steuerung und Wissenschaft, „Survival“ bei Steuerung und Sicherheit,
          …); auf dem Bogen sind das derselbe Eintrag, die Liste zeigt sie
          deshalb als eine Zeile mit beiden Disziplinen daneben. Anders als bei
          Talenten gibt es keinen eigenen Namen: auf dem Bogen steht der
          Katalogname. Fehlt ein Schwerpunkt, nimmt ihn die Spielleitung unter
          „Schwerpunkte“ auf.
        </p>
      </GuideSection>

      <GuideSection title="Nach dem Abschließen" figure={<SheetFigure />}>
        <p>
          <strong>Deine Charakterseite</strong> zeigt danach Profilbild,
          Personalakte, Werte, Biografie und Versionen als zunächst offene
          Klapp-Panels untereinander. Ein Klick auf die Titelzeile klappt einen
          Bereich ein oder wieder auf. Bei Personalakte und Biografie öffnet der
          <strong>Stift</strong> das Formular an Ort und Stelle; die Werte
          steigerst du mit AP (siehe unten). Ganz oben öffnet
          <strong> „Charakterbogen“</strong> die Vorschau: Blatt 1 der
          Personalbogen mit Stammdaten und Werten, Blatt 2 der Spickzettel mit
          deinen Talenten, Blatt 3 die Regeln (Momentum, Bedrohung,
          Entschlossenheit und die eigenen Regeln der Runde), Blatt 4 die
          Biografie im selben Look. Dort stehen auch die Knöpfe zum{" "}
          <strong>Drucken</strong> und zum <strong>Speichern als PDF</strong> —
          die PDF-Datei enthält dieselben Blätter. Weil die Regeln für alle am
          Tisch gelten und an keinem Charakter hängen, stehen sie auf einem
          eigenen Blatt: so lässt sich genau dieses eine ausdrucken und in die
          Mitte legen. Rang und Spezies stehen auf dem Bogen, kommen aber aus
          den Stammdaten; im Kasten „Species &amp; Traits“ steht die Spezies
          vorne, deine weiteren Merkmale trägst du dahinter ein. In „Meine
          Inhalte“ tauchen Charaktere nicht auf — der Charakter-Filter für
          Einsatzberichte und Gespräche bleibt dort aber erhalten.
        </p>
        <p>
          Ganz unten am Bogen findest du einen <strong>Spickzettel</strong>:
          alle Talente deines Charakters mit ihrem vollen Regeltext — und
          darunter die wichtigsten Regeln für den Spieltisch: wofür du{" "}
          <strong>Momentum</strong> ausgibst und aufhebst, was die Spielleitung
          mit <strong>Bedrohung</strong> anstellt und wie{" "}
          <strong>Entschlossenheit</strong> funktioniert. Auf Deutsch, mit den
          englischen Begriffen daneben, damit am Tisch beides passt. Ganz unten
          stehen die <strong>eigenen Regeln der Runde</strong>, sofern die
          Spielleitung welche hinterlegt hat. Der Spickzettel steckt auch im
          PDF.
        </p>
      </GuideSection>

      <GuideSection title="Wenn die Erschaffung wieder geöffnet wird">
        <p>
          Hat die Spielleitung deine{" "}
          <strong>Erschaffung wieder geöffnet</strong>, sind Attribute,
          Disziplinen, Talente und Schwerpunkte erneut frei editierbar. Die
          Steigerungen, die du seit dem Abschluss gekauft hattest, sind dabei
          zurückgenommen und die AP wieder gutgeschrieben. Der Bogen weist dich
          auf die vorgemerkten Steigerungen hin. Verplane sie nicht neu: Beim
          Abschließen werden genau diese Steigerungen automatisch wieder
          angewandt und die AP erneut abgebucht.
        </p>
      </GuideSection>
    </GuideBody>
  );
}
