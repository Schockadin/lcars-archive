const BARS = [
  { height: 100, color: 'var(--lcars-purple)' },
  { height: 80, color: 'var(--lcars-purple-dim)' },
  { height: 120, color: 'var(--lcars-blue)' },
  { height: 10, color: 'var(--lcars-border)' },
  { height: 150, color: 'var(--lcars-purple)' },
  { height: 75, color: 'var(--lcars-amber)' },
  { height: 125, color: 'var(--lcars-purple-dim)' },
  { height: 10, color: 'var(--lcars-border)' },
  { height: 80, color: 'var(--lcars-blue)' },
  { height: 220, color: 'var(--lcars-purple)' },
];

interface LcarsSidebarProps {
  accentColor?: string;
}

export default function LcarsSidebar({ accentColor }: LcarsSidebarProps) {
  return (
    <aside
      className="flex flex-col items-center gap-1.5 py-3 flex-shrink-0"
      style={{
        width: 'var(--lcars-bar-width)',
        borderRight: `3px solid ${accentColor ?? 'var(--lcars-purple)'}`,
        background: 'var(--lcars-bg)',
      }}
    >
      {BARS.map((bar, i) => (
        <div
          key={i}
          className="rounded-md flex-shrink-0"
          style={{
            width: 30,
            height: bar.height,
            background: bar.color,
          }}
        />
      ))}
    </aside>
  );
}   