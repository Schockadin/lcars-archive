import ElbowBar from "./ElbowBar";

export default function Header() {
  return (
    <header className="w-full h-[var(--lcars-header-h)] sticky top-[0px]">
      {/* Header Content */}
      <div className="lcars-header-content">
        <div className="flex flex-col justify-center items-end pl-[10px] pt-[10px] h-full text-right pr-[10px]">
          <div className="lcars-eyebrow">
            INITIALISIERUNG // DATENBANKZUGRIFF AUTORISIERT
          </div>
          <div className="lcars-header-title uppercase mb-[4px]">
            Neo Archiv
          </div>
        </div>
      </div>
      <ElbowBar />
    </header>
  );
}
