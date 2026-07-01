import { LcarsHeaderBar } from ".";
import HeaderSearch from "./HeaderSearch";

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
        <div className="lcars-header-top">
          <div className="lcars-header-title uppercase">Neo Archiv</div>
        </div>
        <HeaderSearch />
      </div>
      <LcarsHeaderBar />
    </header>
  );
}
