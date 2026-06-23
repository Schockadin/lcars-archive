import { LcarsHeaderBar } from ".";

export default function Header() {
  return (
    <header
      style={{
        width: "100%",
        height:
          "calc(var(--lcars-header-h) + 5px + calc(2 * var(--lcars-bar-h)))",
      }}
    >
      {/* Header Content */}
      <div className="lcars-header-content">
        <div className="flex flex-col justify-center items-end pl-[10px] pt-[10px] h-full text-right pr-[10px]">
          <div className="lcars-eyebrow">
            INITIALISIERUNG // DATENBANKZUGRIFF AUTORISIERT
          </div>
          <div className="lcars-header-title uppercase">Neo Archiv</div>
        </div>
      </div>
      <LcarsHeaderBar />
    </header>
  );
}
