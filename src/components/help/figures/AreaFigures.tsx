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
// Die Werkzeugleiste (Anlegen-Knopf, Umschalter Status/Generation,
// Filterfeld), darunter die Gruppenüberschrift und die Karten an ihrer
// Schiene — wie in Chronologie und Datenbank.
export function CharacterListFigure() {
  return (
    <GuideFigure
      label="Eine Werkzeugleiste mit rundem Knopf, Umschalter und Filterfeld; darunter eine Gruppenüberschrift und drei Karten an einer senkrechten Schiene, jede mit kleinem Portrait."
      caption="Charaktere — nach Status oder Generation gruppiert"
    >
      <circle cx={16} cy={15} r={7} fill={PRIMARY} />
      <Pill x={28} y={9} w={40} h={12} fill={TERTIARY} opacity={0.85} />
      <Pill x={70} y={9} w={40} h={12} fill={BORDER} />
      <Box x={118} y={9} w={72} h={12} />

      <Line x={10} y={31} w={54} fill={TERTIARY} opacity={0.9} />
      <rect x={16} y={42} width={2} height={60} fill={BORDER} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <circle cx={17} cy={54 + i * 22} r={4} fill={SECONDARY} />
          <Box x={28} y={44 + i * 22} w={162} h={20} />
          <rect
            x={33}
            y={48 + i * 22}
            width={12}
            height={12}
            rx={2}
            fill={SECONDARY}
            opacity={0.6}
          />
          <Line x={51} y={50 + i * 22} w={60} h={3} opacity={0.8} />
          <Line x={51} y={57 + i * 22} w={40} h={3} opacity={0.45} />
        </g>
      ))}
    </GuideFigure>
  );
}

// ── Chronologie ──────────────────────────────────────────────────────
// Die Werkzeugleiste (Umfang, Sortierrichtung, Filterfeld, Ereignisart und
// Person), darunter der senkrechte Zeitstrahl mit seinen datierten
// Ereignissen.
export function ChronologyFigure() {
  return (
    <GuideFigure
      label="Eine Werkzeugleiste aus Auswahlfeldern, Sortierschalter und Filterfeld; darunter ein senkrechter Zeitstrahl, an dem drei datierte Ereignisse hängen."
      caption="Chronologie — ein Strahl, nach Art und Person filterbar"
    >
      <Box x={10} y={8} w={52} h={12} stroke={TERTIARY} />
      <Pill x={68} y={8} w={28} h={12} fill={BORDER} />
      <Box x={102} y={8} w={40} h={12} />
      <Box x={148} y={8} w={42} h={12} />
      <Box x={10} y={24} w={52} h={12} />

      <rect x={26} y={44} width={2} height={58} fill={BORDER} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <circle
            cx={27}
            cy={54 + i * 20}
            r={5}
            fill={[SECONDARY, TERTIARY, QUATERNARY][i]}
          />
          <Line x={40} y={48 + i * 20} w={34} h={3} opacity={0.8} />
          <Line x={40} y={56 + i * 20} w={120} h={3} opacity={0.45} />
        </g>
      ))}
    </GuideFigure>
  );
}

// ── Datenbank ────────────────────────────────────────────────────────
// Die Werkzeugleiste (Anlegen, Sortierung, Filterfeld, Kategorie-Auswahl),
// darunter die Einträge unter ihrem Anfangsbuchstaben.
export function DatabaseFigure() {
  return (
    <GuideFigure
      label="Eine Werkzeugleiste mit rundem Knopf, Sortierschalter, Filterfeld und Kategorie-Auswahl; darunter ein Anfangsbuchstabe und drei Einträge mit kleinem Vorschaubild."
      caption="Datenbank — alphabetisch, nach Kategorie eingrenzbar"
    >
      <circle cx={16} cy={15} r={7} fill={PRIMARY} />
      <Pill x={28} y={9} w={46} h={12} fill={BORDER} />
      <Box x={80} y={9} w={56} h={12} />
      <Box x={142} y={9} w={48} h={12} stroke={QUATERNARY} />

      {[0, 1].map((block) => (
        <g key={block}>
          <Line
            x={10}
            y={32 + block * 38}
            w={10}
            h={6}
            fill={TERTIARY}
            opacity={0.9}
          />
          {[0, 1].map((i) => (
            <g key={i}>
              <rect
                x={10}
                y={44 + block * 38 + i * 16}
                width={12}
                height={12}
                rx={2}
                fill={SECONDARY}
                opacity={0.55}
              />
              <Line
                x={28}
                y={46 + block * 38 + i * 16}
                w={62}
                h={3}
                opacity={0.8}
              />
              <Line
                x={28}
                y={53 + block * 38 + i * 16}
                w={150}
                h={3}
                opacity={0.4}
              />
            </g>
          ))}
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
