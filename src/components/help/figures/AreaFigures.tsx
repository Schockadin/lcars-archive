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

// Die Schemata zu den Anleitungen des Profil-Menüs und der öffentlichen
// Seiten (siehe guides/UserGuides.tsx und guides/PublicGuides.tsx). Baukasten,
// Farben und Begründung: ../GuideFigure.tsx.

// ── Meine Inhalte ────────────────────────────────────────────────────
// Oben die Knöpfe für Neues, darunter die Filterleiste und die eigenen
// Einträge mit ihrem Status.
export function MyContentFigure() {
  return (
    <GuideFigure
      label="Drei Knöpfe für neue Inhalte, darunter eine Filterleiste und drei eigene Einträge mit Status-Marke."
      caption="Neues anlegen, filtern — und den Status umstellen"
    >
      {[0, 1, 2].map((i) => (
        <Pill key={i} x={10 + i * 62} y={10} w={56} h={13} fill={PRIMARY} />
      ))}
      <Box x={10} y={31} w={104} h={12} />
      <Box x={120} y={31} w={70} h={12} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <Line x={10} y={54 + i * 18} w={76} opacity={0.75} />
          <Pill
            x={100}
            y={51 + i * 18}
            w={44}
            h={10}
            fill={i === 0 ? SENARY : BORDER}
          />
          <circle
            cx={162}
            cy={56 + i * 18}
            r={5}
            fill={SECONDARY}
            opacity={0.7}
          />
          <circle
            cx={180}
            cy={56 + i * 18}
            r={5}
            fill={QUINARY}
            opacity={0.7}
          />
        </g>
      ))}
    </GuideFigure>
  );
}

// ── Profil ───────────────────────────────────────────────────────────
// Drei Akkordeon-Zeilen untereinander, die mittlere offen.
export function ProfileFigure() {
  return (
    <GuideFigure
      label="Drei aufklappbare Zeilen untereinander; die mittlere ist geöffnet und zeigt Formularfelder mit einem Speichern-Knopf."
      caption="Drei Klappen: Farben, Darstellung, Settings"
    >
      <Box x={10} y={10} w={180} h={16} />
      <Line x={18} y={16} w={58} opacity={0.8} />

      <Box x={10} y={32} w={180} h={54} stroke={TERTIARY} />
      <Line x={18} y={38} w={48} fill={TERTIARY} opacity={0.9} />
      {[0, 1].map((i) => (
        <g key={i}>
          <Line x={18} y={52 + i * 14} w={40} opacity={0.5} />
          <Box x={70} y={48 + i * 14} w={64} h={11} />
        </g>
      ))}
      <Pill x={144} y={68} w={40} h={11} fill={PRIMARY} />

      <Box x={10} y={92} w={180} h={14} />
      <Line x={18} y={97} w={52} opacity={0.8} />
    </GuideFigure>
  );
}

// ── Startseite ───────────────────────────────────────────────────────
// Die Landingpage: Begrüßung, Trennlinie und die Datenzeilen der Statistik.
export function HomeFigure() {
  return (
    <GuideFigure
      label="Eine Begrüßungszeile über einer Trennlinie, darunter eine Überschrift, zwei Textzeilen und vier Datenzeilen mit Zahlen."
      caption="Startseite — Begrüßung, Text und die Zahlen des Archivs"
    >
      <Line x={10} y={10} w={120} h={3} fill={QUATERNARY} opacity={0.9} />
      <rect x={10} y={18} width={180} height={3} rx={1.5} fill={PRIMARY} />
      <Line x={10} y={28} w={86} h={6} fill={PRIMARY} opacity={0.85} />
      <Line x={10} y={42} w={170} h={3} />
      <Line x={10} y={49} w={150} h={3} />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <Pill
            x={10}
            y={62 + i * 12}
            w={26}
            h={9}
            fill={TERTIARY}
            opacity={0.8}
          />
          <Line x={42} y={65 + i * 12} w={96} h={3} opacity={0.55} />
          <Line
            x={162}
            y={65 + i * 12}
            w={24}
            h={3}
            fill={SENARY}
            opacity={0.9}
          />
        </g>
      ))}
    </GuideFigure>
  );
}

// ── Charakterliste ───────────────────────────────────────────────────
// Die Kacheln mit Vorschaubild, gruppiert unter einer Gruppenüberschrift.
export function CharacterListFigure() {
  return (
    <GuideFigure
      label="Eine Filterleiste, darunter eine Gruppenüberschrift und vier Karten mit je einem kleinen Vorschaubild und zwei Textzeilen."
      caption="Charaktere — nach Status oder Generation gruppiert"
    >
      <Box x={10} y={8} w={96} h={12} />
      <Pill x={112} y={8} w={36} h={12} fill={BORDER} />
      <Pill x={154} y={8} w={36} h={12} fill={SECONDARY} opacity={0.7} />
      <Line x={10} y={28} w={54} fill={TERTIARY} opacity={0.9} />
      {[0, 1].map((row) =>
        [0, 1].map((col) => (
          <g key={`${row}-${col}`}>
            <Box x={10 + col * 94} y={38 + row * 32} w={88} h={26} />
            <rect
              x={14 + col * 94}
              y={42 + row * 32}
              width={18}
              height={18}
              rx={3}
              fill={SECONDARY}
              opacity={0.6}
            />
            <Line
              x={38 + col * 94}
              y={46 + row * 32}
              w={52}
              h={3}
              opacity={0.8}
            />
            <Line
              x={38 + col * 94}
              y={54 + row * 32}
              w={36}
              h={3}
              opacity={0.45}
            />
          </g>
        )),
      )}
    </GuideFigure>
  );
}

// ── Chronologie ──────────────────────────────────────────────────────
// Der Zeitstrahl: eine senkrechte Linie, daran datierte Ereignisse.
export function ChronologyFigure() {
  return (
    <GuideFigure
      label="Eine Filterleiste über einem senkrechten Zeitstrahl, an dem vier datierte Ereignisse hängen."
      caption="Chronologie — ein Strahl, nach Art filterbar"
    >
      <Pill x={10} y={8} w={30} h={11} fill={PRIMARY} />
      {[0, 1, 2, 3].map((i) => (
        <Pill
          key={i}
          x={46 + i * 38}
          y={8}
          w={34}
          h={11}
          fill={[SECONDARY, TERTIARY, QUATERNARY, BORDER][i]}
          opacity={0.75}
        />
      ))}
      <rect x={26} y={28} width={2} height={76} fill={BORDER} />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <circle
            cx={27}
            cy={36 + i * 20}
            r={5}
            fill={[SECONDARY, TERTIARY, QUATERNARY, SENARY][i]}
          />
          <Line x={40} y={30 + i * 20} w={34} h={3} opacity={0.8} />
          <Line x={40} y={38 + i * 20} w={120} h={3} opacity={0.45} />
        </g>
      ))}
    </GuideFigure>
  );
}

// ── Datenbank ────────────────────────────────────────────────────────
// Die Kategorie-Pillen über der Liste der Einträge.
export function DatabaseFigure() {
  return (
    <GuideFigure
      label="Zwei Reihen Kategorie-Knöpfe über einer Liste von Einträgen mit kleinem Vorschaubild."
      caption="Datenbank — erst die Kategorie, dann der Eintrag"
    >
      {[0, 1].map((row) =>
        [0, 1, 2, 3].map((col) => (
          <Pill
            key={`${row}-${col}`}
            x={10 + col * 46}
            y={8 + row * 16}
            w={42}
            h={12}
            fill={
              row === 0 && col === 0
                ? PRIMARY
                : [SECONDARY, TERTIARY, QUATERNARY, SENARY][col]
            }
            opacity={row === 0 && col === 0 ? 1 : 0.65}
          />
        )),
      )}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect
            x={10}
            y={48 + i * 20}
            width={16}
            height={16}
            rx={3}
            fill={SECONDARY}
            opacity={0.55}
          />
          <Line x={32} y={51 + i * 20} w={64} h={3} opacity={0.8} />
          <Line x={32} y={59 + i * 20} w={140} h={3} opacity={0.4} />
        </g>
      ))}
    </GuideFigure>
  );
}

// ── Suche ────────────────────────────────────────────────────────────
// Oben das Suchfeld mit seinen Treffern, unten der Assistent.
export function SearchFigure() {
  return (
    <GuideFigure
      label="Ein breites Suchfeld mit Knopf, darunter drei Treffer mit Art-Marke und ganz unten ein Eingabefeld für den Assistenten."
      caption="Volltextsuche oben, der Assistent darunter"
    >
      <Box x={10} y={10} w={136} h={15} />
      <Pill x={152} y={11} w={38} h={13} fill={PRIMARY} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <Pill
            x={10}
            y={33 + i * 18}
            w={28}
            h={9}
            fill={TERTIARY}
            opacity={0.75}
          />
          <Line x={44} y={35 + i * 18} w={62} h={3} opacity={0.85} />
          <Line x={44} y={42 + i * 18} w={140} h={3} opacity={0.4} />
        </g>
      ))}
      <rect x={10} y={88} width={180} height={1} fill={BORDER} />
      <Box x={10} y={93} w={136} h={13} stroke={QUATERNARY} />
      <Pill x={152} y={94} w={38} h={11} fill={QUATERNARY} opacity={0.8} />
    </GuideFigure>
  );
}
