import {
  GuideFigure,
  Line,
  PRIMARY,
  SECONDARY,
  TERTIARY,
  SENARY,
  BORDER,
} from "@/components/help/GuideFigure";

// Kleine Schema-Bilder für die Anleitung zur Charaktererschaffung (siehe
// CharacterCreationGuide.tsx). Sie zeigen den AUFBAU der jeweiligen Maske —
// vier Schritt-Knöpfe, ein Bildkasten mit seiner Schräge, Zahlenfelder mit
// Budget-Leiste —, nicht ihren Inhalt.
//
// Rahmen, Farben und die „Textzeile" kommen aus dem gemeinsamen Baukasten
// (help/GuideFigure.tsx), den sich diese Bilder mit den Schemata der übrigen
// Bereichs-Anleitungen teilen — dort steht auch, warum es Inline-SVG und
// keine Screenshots sind.

// ── Die vier Schritte ────────────────────────────────────────────────
// Vier Reiter nebeneinander, der erste aktiv — darunter die Felder des
// gerade offenen Schritts und der „Fertig"-Knopf.
export function StepsFigure() {
  return (
    <GuideFigure
      label="Vier Schritt-Knöpfe nebeneinander, der erste hervorgehoben, darunter Eingabefelder und der Knopf „Fertig“."
      caption="Die vier Schritte — oben umschalten, unten „Fertig“"
    >
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={10 + i * 46}
          y={12}
          width={40}
          height={14}
          rx={7}
          fill={i === 0 ? PRIMARY : BORDER}
        />
      ))}
      <Line x={10} y={40} w={84} />
      <rect x={10} y={48} width={180} height={12} rx={6} fill={BORDER} />
      <Line x={10} y={68} w={60} />
      <rect x={10} y={76} width={180} height={12} rx={6} fill={BORDER} />
      <rect x={140} y={94} width={50} height={10} rx={5} fill={SENARY} />
    </GuideFigure>
  );
}

// ── Portrait & Ausschnitt ────────────────────────────────────────────
// Der hochkant stehende Bildkasten mit der abgeschrägten Ecke, daneben der
// Regler, mit dem sich das Bild vergrößern lässt.
export function PortraitFigure() {
  return (
    <GuideFigure
      label="Ein hochkant stehender Bildkasten mit abgeschrägter Ecke, daneben ein Schieberegler zum Vergrößern."
      caption="„Ausschnitt wählen“ — ziehen verschiebt, der Regler zoomt"
    >
      {/* Der Bildkasten des Bogens: oben rechts abgeschrägt, wie auf dem
          Personalbogen (siehe personnel-file.css). */}
      <path
        d="M20 16 h44 l12 12 v66 h-56 z"
        fill="none"
        stroke={TERTIARY}
        strokeWidth={2}
      />
      <circle cx={48} cy={48} r={11} fill={SECONDARY} opacity={0.75} />
      <path d="M26 88 l18 -22 l14 16 l10 -10 l8 16 z" fill={SECONDARY} opacity={0.55} />
      {/* Regler daneben */}
      <rect x={96} y={52} width={84} height={4} rx={2} fill={BORDER} />
      <circle cx={130} cy={54} r={7} fill={PRIMARY} />
      <Line x={96} y={34} w={54} />
      <rect x={96} y={76} width={40} height={11} rx={5.5} fill={SENARY} />
      <rect x={142} y={76} width={38} height={11} rx={5.5} fill={BORDER} />
    </GuideFigure>
  );
}

// ── Werte ────────────────────────────────────────────────────────────
// Sechs Zahlenkästen und daneben die Budget-Leiste, die beim Tippen
// mitläuft.
export function StatsFigure() {
  return (
    <GuideFigure
      label="Ein Raster aus sechs Zahlenfeldern, daneben eine mitlaufende Budget-Leiste."
      caption="Attribute und Disziplinen — das Budget rechnet mit"
    >
      {[0, 1, 2].map((col) =>
        [0, 1].map((row) => (
          <g key={`${col}-${row}`}>
            <rect
              x={12 + col * 40}
              y={16 + row * 30}
              width={34}
              height={22}
              rx={4}
              fill="none"
              stroke={BORDER}
              strokeWidth={1.5}
            />
            <Line x={18 + col * 40} y={25 + row * 30} w={14} opacity={0.7} />
          </g>
        )),
      )}
      {/* Budget-Leiste rechts */}
      <Line x={140} y={18} w={46} />
      <rect x={140} y={26} width={48} height={8} rx={4} fill={BORDER} />
      <rect x={140} y={26} width={32} height={8} rx={4} fill={SENARY} />
      <Line x={140} y={44} w={34} />
      <rect x={140} y={52} width={48} height={8} rx={4} fill={BORDER} />
      <rect x={140} y={52} width={40} height={8} rx={4} fill={PRIMARY} />
      {/* Fußzeile: Speichern + Abschließen */}
      <rect x={12} y={90} width={46} height={11} rx={5.5} fill={BORDER} />
      <rect x={64} y={90} width={60} height={11} rx={5.5} fill={SENARY} />
    </GuideFigure>
  );
}

// ── Talent- und Schwerpunkt-Katalog ──────────────────────────────────
// Das Auswahlfenster: Suchfeld, Filter, darunter die Treffer mit dem
// Übernehmen-Knopf samt AP-Preis.
export function CatalogFigure() {
  return (
    <GuideFigure
      label="Ein Auswahlfenster mit Suchfeld, Filter und einer Trefferliste; am ersten Treffer ein Übernehmen-Knopf."
      caption="Talente und Schwerpunkte kommen aus dem Katalog"
    >
      <rect x={10} y={12} width={116} height={13} rx={6.5} fill={BORDER} />
      <rect x={132} y={12} width={58} height={13} rx={6.5} fill={SECONDARY} opacity={0.6} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect
            x={10}
            y={34 + i * 24}
            width={180}
            height={18}
            rx={4}
            fill={i === 0 ? BORDER : "none"}
            stroke={BORDER}
            strokeWidth={1}
          />
          <Line x={18} y={41 + i * 24} w={i === 0 ? 62 : 74} opacity={0.75} />
          {i === 0 && (
            <rect x={140} y={38 + i * 24} width={42} height={10} rx={5} fill={PRIMARY} />
          )}
        </g>
      ))}
    </GuideFigure>
  );
}

// ── AP-Konto ─────────────────────────────────────────────────────────
// Der Kontostand oben, darunter die Steigern-Zeilen mit ihrem Preis.
export function ApFigure() {
  return (
    <GuideFigure
      label="Ein AP-Kontostand, darunter Zeilen mit je einem Steigern-Knopf und seinem Preis."
      caption="Nach dem Abschließen wächst alles über AP"
    >
      <rect x={10} y={12} width={180} height={22} rx={5} fill={BORDER} />
      <Line x={18} y={19} w={54} opacity={0.8} />
      <rect x={150} y={17} width={32} height={12} rx={6} fill={SENARY} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <Line x={10} y={48 + i * 20} w={86} />
          <rect x={112} y={44 + i * 20} width={34} height={12} rx={6} fill={BORDER} />
          <rect x={152} y={44 + i * 20} width={38} height={12} rx={6} fill={PRIMARY} />
        </g>
      ))}
    </GuideFigure>
  );
}

// ── Charakterbogen ───────────────────────────────────────────────────
// Die vier Blätter der Vorschau nebeneinander, darunter Drucken/Speichern.
export function SheetFigure() {
  return (
    <GuideFigure
      label="Vier Blätter nebeneinander als Vorschau, darunter die Knöpfe zum Drucken und Speichern."
      caption="Der fertige Bogen: vier Blätter, drucken oder als PDF"
    >
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect
            x={10 + i * 47}
            y={12}
            width={38}
            height={62}
            rx={3}
            fill="none"
            stroke={i === 0 ? TERTIARY : BORDER}
            strokeWidth={1.5}
          />
          <Line x={15 + i * 47} y={20} w={22} h={3} opacity={0.8} />
          <Line x={15 + i * 47} y={28} w={28} h={3} />
          <Line x={15 + i * 47} y={35} w={24} h={3} />
          <Line x={15 + i * 47} y={42} w={28} h={3} />
        </g>
      ))}
      <rect x={10} y={86} width={54} height={12} rx={6} fill={BORDER} />
      <rect x={70} y={86} width={62} height={12} rx={6} fill={PRIMARY} />
    </GuideFigure>
  );
}
