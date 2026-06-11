interface LcarsFooterProps {
  statusLeft?: string;
  statusRight?: string;
}

export default function LcarsFooter({
  statusLeft = 'BETRIEB NOMINAL',
  statusRight,
}: LcarsFooterProps) {
  return (
    <footer
      className="flex items-stretch w-full flex-shrink-0"
      style={{ height: 'var(--lcars-footer-h)' }}
    >
      {/* Elbow unten links */}
      <div
        className="lcars-elbow-bl bg-lcars-purple-dim flex-shrink-0"
        style={{ width: 'var(--lcars-elbow-size)' }}
      />

      {/* Status-Leiste */}
      <div
        className="flex-1 flex items-center justify-between px-4 border-t-2 border-lcars-purple"
        style={{ background: 'var(--lcars-bg)' }}
      >
        <span className="lcars-data text-xs">{statusLeft}</span>
        {statusRight && (
          <span className="lcars-data text-xs">{statusRight}</span>
        )}
      </div>

      {/* Elbow unten rechts */}
      <div
        className="lcars-elbow-br bg-lcars-purple flex-shrink-0"
        style={{ width: 'var(--lcars-bar-width)' }}
      />
    </footer>
  );
}