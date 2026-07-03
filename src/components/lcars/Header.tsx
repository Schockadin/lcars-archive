import { LcarsHeaderBar } from ".";
import HeaderContent from "./HeaderContent";

export default function Header() {
  return (
    <header
      style={{
        width: "100%",
        height:
          "calc(var(--lcars-header-h) + 5px + calc(2 * var(--lcars-bar-h)))",
      }}
    >
      <HeaderContent />
      <LcarsHeaderBar />
    </header>
  );
}
