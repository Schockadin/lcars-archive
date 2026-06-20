export default function LcarsHeader() {
  return (
    <header
      className="w-full h-[var(--lcars-header-h)]"
      style={{
        position: "sticky",
        top: "0px",
        marginLeft: "calc(-1 * var(--lcars-elbow-size))",
        width: "calc(100% + var(--lcars-elbow-size))",
      }}
    >
      {/* Header Content */}
      <div className="flex flex-col h-full flex-1 min-w-0 bg-[var(--lcars-blue)]">
        <div className="lcars-header-content">
          <div className="flex flex-col justify-around items-end pl-[10px] pt-[10px] h-full">
            <div className="lcars-eyebrow">
              INITIALISIERUNG // DATENBANKZUGRIFF AUTORISIERT
            </div>
            <div className="lcars-header-title uppercase mb-[4px]">
              Neo Archiv
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
