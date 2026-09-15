import {
  GuideFigure,
  Line,
  Pill,
  Box,
  PRIMARY,
  SECONDARY,
  TERTIARY,
  QUATERNARY,
  QUINARY,
  SENARY,
  BORDER,
} from "../GuideFigure";

// Die Schemata zu den Anleitungen der Leitungs-Bereiche (siehe
// guides/GmGuides.tsx). Sie zeigen den AUFBAU der jeweiligen Seite — welche
// Blöcke übereinander liegen und wo der Knopf sitzt, der die Arbeit macht —,
// nicht ihren Inhalt. Baukasten, Farben und Begründung: ../GuideFigure.tsx.

// ── Kampagne ─────────────────────────────────────────────────────────
// Drei Blöcke untereinander: das Jahresfeld, die AP-Vergabe und die
// Missionsliste.
export function CampaignFigure() {
  return (
    <GuideFigure
      label="Ein Eingabefeld für das Jahr, darunter eine Auswahlzeile mit Knopf und darunter eine Liste von Missionen."
      caption="Kampagne — Jahr, AP-Vergabe und Missionen übereinander"
    >
      <Line x={10} y={10} w={40} />
      <Box x={10} y={17} w={54} h={14} />
      <Pill x={70} y={18} w={34} h={12} fill={SENARY} />

      <Line x={10} y={41} w={56} />
      <Box x={10} y={48} w={78} h={13} />
      <Box x={94} y={48} w={44} h={13} />
      <Pill x={144} y={49} w={46} h={11} fill={PRIMARY} />

      {[0, 1, 2].map((i) => (
        <g key={i}>
          <Line x={10} y={74 + i * 12} w={92} opacity={0.6} />
          <Pill x={116} y={71 + i * 12} w={30} h={9} fill={BORDER} />
          <Pill
            x={152}
            y={71 + i * 12}
            w={30}
            h={9}
            fill={QUINARY}
            opacity={0.7}
          />
        </g>
      ))}
    </GuideFigure>
  );
}

// ── Sessions ─────────────────────────────────────────────────────────
// Oben der angekündigte Termin mit seinen Zusagen, darunter die Nachbuchung.
export function SessionsFigure() {
  return (
    <GuideFigure
      label="Eine Terminkarte mit Datum, Zusage-Häkchen und dem Knopf „Session eintragen“, darunter zwei bereits eingetragene Sessions."
      caption="Erst der Termin, dann die Nachbuchung mit den AP"
    >
      <Box x={10} y={10} w={180} h={40} stroke={TERTIARY} />
      <Line x={18} y={17} w={52} opacity={0.8} />
      <Line x={18} y={26} w={86} />
      {[0, 1, 2, 3].map((i) => (
        <circle
          key={i}
          cx={22 + i * 12}
          cy={39}
          r={4}
          fill={i < 3 ? SENARY : "none"}
          stroke={BORDER}
          strokeWidth={1}
        />
      ))}
      <Pill x={122} y={33} w={60} h={12} fill={PRIMARY} />

      {[0, 1].map((i) => (
        <g key={i}>
          <Line x={10} y={62 + i * 20} w={34} opacity={0.8} />
          <Line x={52} y={62 + i * 20} w={70} opacity={0.55} />
          <Pill
            x={132}
            y={59 + i * 20}
            w={26}
            h={10}
            fill={SECONDARY}
            opacity={0.7}
          />
          <Pill x={164} y={59 + i * 20} w={26} h={10} fill={BORDER} />
        </g>
      ))}
    </GuideFigure>
  );
}

// ── Charaktere (Leitung) ─────────────────────────────────────────────
// Die Zuordnungstabelle: je Figur ein Auswahlfeld fürs Konto, darunter der
// Erschaffungs-Status mit dem Knopf zum Wiederöffnen.
export function GmCharactersFigure() {
  return (
    <GuideFigure
      label="Eine Tabelle mit Figurennamen und daneben je einem Auswahlfeld für das Konto; darunter eine Zeile mit Erschaffungs-Status und einem Knopf."
      caption="Zuordnung oben, Erschaffungs-Status unten"
    >
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <Line x={10} y={14 + i * 18} w={62} opacity={0.7} />
          <Box x={84} y={9 + i * 18} w={70} h={13} />
          <Line x={90} y={14 + i * 18} w={40} opacity={0.45} />
        </g>
      ))}
      <rect x={10} y={68} width={180} height={1} fill={BORDER} />
      {[0, 1].map((i) => (
        <g key={i}>
          <Line x={10} y={78 + i * 16} w={58} opacity={0.7} />
          <Pill
            x={78}
            y={75 + i * 16}
            w={46}
            h={10}
            fill={i === 0 ? SENARY : BORDER}
          />
          <Pill
            x={132}
            y={75 + i * 16}
            w={58}
            h={10}
            fill={QUINARY}
            opacity={0.75}
          />
        </g>
      ))}
    </GuideFigure>
  );
}

// ── Gruppenblatt ─────────────────────────────────────────────────────
// Die breite Wertetabelle: eine Kopfzeile, je Figur eine Zeile Zahlen.
export function PartySheetFigure() {
  return (
    <GuideFigure
      label="Eine breite Tabelle: oben die Spaltenköpfe, darunter je Figur eine Zeile mit Zahlen."
      caption="Alle Werte nebeneinander — der Blick für den Tisch"
    >
      <Line x={10} y={12} w={36} fill={TERTIARY} opacity={0.9} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Line
          key={i}
          x={56 + i * 24}
          y={12}
          w={16}
          fill={TERTIARY}
          opacity={0.9}
        />
      ))}
      <rect x={10} y={22} width={180} height={1} fill={BORDER} />
      {[0, 1, 2, 3].map((row) => (
        <g key={row}>
          <Line x={10} y={30 + row * 18} w={40} fill={PRIMARY} opacity={0.85} />
          {[0, 1, 2, 3, 4, 5].map((col) => (
            <Line
              key={col}
              x={56 + col * 24}
              y={30 + row * 18}
              w={12}
              opacity={0.55}
            />
          ))}
          <rect
            x={10}
            y={38 + row * 18}
            width={180}
            height={1}
            fill={BORDER}
            opacity={0.5}
          />
        </g>
      ))}
    </GuideFigure>
  );
}

// ── AP ───────────────────────────────────────────────────────────────
// Oben die Kontostände, darunter das Journal mit seinen Filtern.
export function ApLedgerFigure() {
  return (
    <GuideFigure
      label="Eine Liste von Kontoständen, darunter zwei Filterfelder und die Buchungszeilen des Journals."
      caption="Kontostände, Journal und das Regelwerk darunter"
    >
      {[0, 1].map((i) => (
        <g key={i}>
          <Line x={10} y={12 + i * 14} w={64} opacity={0.75} />
          <Line x={92} y={12 + i * 14} w={42} opacity={0.45} />
          <Pill x={150} y={9 + i * 14} w={40} h={10} fill={SENARY} />
        </g>
      ))}
      <rect x={10} y={42} width={180} height={1} fill={BORDER} />
      <Box x={10} y={48} w={68} h={12} />
      <Box x={84} y={48} w={52} h={12} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <Line x={10} y={70 + i * 13} w={30} opacity={0.5} />
          <Line x={48} y={70 + i * 13} w={54} opacity={0.65} />
          <Line x={110} y={70 + i * 13} w={40} opacity={0.4} />
          <Line
            x={162}
            y={70 + i * 13}
            w={24}
            fill={i === 2 ? QUINARY : PRIMARY}
            opacity={0.85}
          />
        </g>
      ))}
    </GuideFigure>
  );
}

// ── Talent-/Schwerpunkt-Katalog (Leitung) ────────────────────────────
// Ganz oben das Formular für einen neuen Eintrag (so steht es auf beiden
// Seiten), darunter Suchfeld und Filter über der Liste; jede Zeile mit Stift
// und Minus.
export function CatalogEditorFigure() {
  return (
    <GuideFigure
      label="Oben ein Formular für einen neuen Eintrag, darunter ein Suchfeld mit Filter über einer Liste; jede Zeile hat einen Stift und ein Minus."
      caption="Oben Neues ergänzen, darunter suchen und bearbeiten"
    >
      <Box x={10} y={9} w={110} h={13} stroke={TERTIARY} />
      <Pill x={128} y={10} w={62} h={11} fill={PRIMARY} />

      <Box x={10} y={32} w={112} h={12} />
      <Box x={128} y={32} w={62} h={12} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <Line x={10} y={57 + i * 16} w={88} opacity={0.7} />
          <circle
            cx={160}
            cy={59 + i * 16}
            r={5}
            fill={SECONDARY}
            opacity={0.7}
          />
          <circle
            cx={178}
            cy={59 + i * 16}
            r={5}
            fill={QUINARY}
            opacity={0.7}
          />
          <rect
            x={10}
            y={67 + i * 16}
            width={180}
            height={1}
            fill={BORDER}
            opacity={0.5}
          />
        </g>
      ))}
    </GuideFigure>
  );
}

// ── Eigene Regeln ────────────────────────────────────────────────────
// Karten mit Reihenfolge-Zahl, Name und Regeltext.
export function CampaignRulesFigure() {
  return (
    <GuideFigure
      label="Drei Karten mit je einer Reihenfolge-Zahl, einem Namen und zwei Zeilen Regeltext."
      caption="Eigene Regeln — Zahl bestimmt die Reihenfolge"
    >
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <Box x={10} y={10 + i * 33} w={180} h={28} />
          <circle
            cx={24}
            cy={24 + i * 33}
            r={7}
            fill={QUATERNARY}
            opacity={0.8}
          />
          <Line x={38} y={17 + i * 33} w={58} opacity={0.85} />
          <Line x={38} y={27 + i * 33} w={108} h={3} opacity={0.45} />
          <circle
            cx={178}
            cy={20 + i * 33}
            r={4.5}
            fill={QUINARY}
            opacity={0.7}
          />
        </g>
      ))}
    </GuideFigure>
  );
}

// ── Chronologie-Werkbank ─────────────────────────────────────────────
// Oben die Inhalte mit Filterfeld, je Zeile der Knopf, der den Durchlauf
// startet; DARUNTER — nicht daneben, so steht es auf der Seite — die
// abgeleiteten Ereignisse zum Prüfen.
export function TimelineWorkbenchFigure() {
  return (
    <GuideFigure
      label="Oben ein Filterfeld über einer Liste von Inhalten mit je einem Knopf, darunter der Abschnitt mit den abgeleiteten Ereignissen."
      caption="Oben ableiten, darunter das Ergebnis prüfen"
    >
      <Line x={10} y={9} w={52} fill={TERTIARY} opacity={0.9} />
      <Box x={10} y={17} w={180} h={11} />
      {[0, 1].map((i) => (
        <g key={i}>
          <Line x={10} y={36 + i * 16} w={72} opacity={0.7} />
          <Pill
            x={140}
            y={33 + i * 16}
            w={50}
            h={10}
            fill={i === 0 ? PRIMARY : BORDER}
          />
        </g>
      ))}
      <rect x={10} y={68} width={180} height={1} fill={BORDER} />
      <Line x={10} y={74} w={64} fill={TERTIARY} opacity={0.9} />
      {[0, 1].map((i) => (
        <g key={i}>
          <circle cx={14} cy={90 + i * 14} r={3.5} fill={TERTIARY} />
          <Line x={24} y={88 + i * 14} w={116} h={3} opacity={0.6} />
          <circle
            cx={182}
            cy={90 + i * 14}
            r={4.5}
            fill={QUINARY}
            opacity={0.7}
          />
        </g>
      ))}
    </GuideFigure>
  );
}

// ── Gespräche (Leitung) ──────────────────────────────────────────────
// Die Liste aller offenen Gespräche: Titel, Beteiligte, Owner und wann
// zuletzt geschrieben wurde.
export function GmDialoguesFigure() {
  return (
    <GuideFigure
      label="Eine Liste offener Gespräche: je Zeile Titel, Beteiligte und das Datum des letzten Beitrags."
      caption="Alle offenen Gespräche — auch die ohne eigene Beteiligung"
    >
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <Line x={10} y={14 + i * 24} w={78} opacity={0.85} />
          {[0, 1, 2].map((p) => (
            <circle
              key={p}
              cx={16 + p * 10}
              cy={28 + i * 24}
              r={4}
              fill={[SECONDARY, TERTIARY, QUATERNARY][p]}
              opacity={0.75}
            />
          ))}
          <Line x={56} y={26 + i * 24} w={44} h={3} opacity={0.4} />
          <Line x={150} y={14 + i * 24} w={40} h={3} opacity={0.5} />
          <Pill x={150} y={24 + i * 24} w={40} h={9} fill={BORDER} />
        </g>
      ))}
    </GuideFigure>
  );
}
