// const BARS = [
//   { height: 100, color: 'var(--lcars-amber)' },
//   { height: 80, color: 'var(--lcars-purple-dim)' },
//   { height: 120, color: 'var(--lcars-blue)' },
//   { height: 10, color: 'var(--lcars-border)' },
//   { height: 150, color: 'var(--lcars-purple)' },
//   { height: 75, color: 'var(--lcars-amber)' },
//   { height: 125, color: 'var(--lcars-purple-dim)' },
//   { height: 10, color: 'var(--lcars-border)' },
//   { height: 80, color: 'var(--lcars-blue)' },
//   { height: 220, color: 'var(--lcars-purple)' },
// ];

const BARS = [
  { fraction: 0.1, color: 'var(--lcars-red)' },
  { fraction: 0.2, color: 'var(--lcars-purple-dim)' },
  { fraction: 0.15, color: 'var(--lcars-blue)' },
  { fraction: 0.05, color: 'var(--lcars-purple)' },
  { fraction: 0.2, color: 'var(--lcars-amber)' },
  { fraction: 0.1, color: 'var(--lcars-purple-dim)' },
  { fraction: 0.05, color: 'var(--lcars-blue)' },
  { fraction: 0.15, color: 'var(--lcars-purple)' },
]

export default function LcarsSidebar() {
  return (
    <aside className="flex flex-col items-center">
      {BARS.map((bar, i) => (
        <div
          key={i}
          style={{
            width: 'var(--lcars-bar-width)',
            background: bar.color,
            height: `calc(${bar.fraction * 100}%`
          }}
        />
      ))}
    </aside>
  );
}   