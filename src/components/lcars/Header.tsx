import { LcarsHeaderBar } from ".";
import BreadcrumbNav from "./BreadCrumbNav";

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
        <div className="lcars-header-title uppercase">Neo Archiv</div>
        <BreadcrumbNav />
      </div>
      <LcarsHeaderBar />
    </header>
  );
}
