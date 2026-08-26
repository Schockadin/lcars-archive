import Link from "next/link";

export function HeaderBar() {
  return (
    // lcars-header-deco: rein dekorative Farbbalken — im minimalistischen UI
    // (data-ui="minimal") ausgeblendet (siehe src/styles/minimal-ui.css).
    <div className="lcars-header-deco flex flex-col bg-[var(--lcars-bg)] gap-[5px]">
      <div className="lcars-elbow-bar gap-[5px]">
        <div className="w-[35%] h-[var(--lcars-bar-h)] bg-[var(--lcars-tertiary)]" />
        <div className="w-[5%] h-[var(--lcars-bar-h)] bg-[var(--lcars-primary)]" />
        <div className="w-[20%] h-[var(--lcars-bar-h)] bg-[var(--lcars-secondary)]" />
        <div className="w-[35%] h-[var(--lcars-bar-h)] bg-[var(--lcars-secondary)]" />
        <div className="w-[5%] h-[var(--lcars-bar-h)] bg-[var(--lcars-quinary)]" />
      </div>
      <div className="lcars-elbow-bar gap-[5px]">
        <div className="w-[35%] h-[var(--lcars-bar-h)] bg-[var(--lcars-quinary)]" />
        <div className="w-[5%] h-[var(--lcars-bar-h)] bg-[var(--lcars-quaternary)]" />
        <div className="w-[20%] h-[10px] bg-[var(--lcars-primary)]" />
        <div className="w-[35%] h-[var(--lcars-bar-h)] bg-[var(--lcars-secondary)]" />
        <div className="w-[5%] h-[var(--lcars-bar-h)] bg-[var(--lcars-quaternary)]" />
      </div>
    </div>
  );
}

export function FooterBar({ appVersion }: { appVersion: string | null }) {
  return (
    // lcars-footer-bar: im minimalistischen UI zu einer schlichten Textzeile
    // umgestylt (siehe src/styles/minimal-ui.css); die reinen Farbblöcke
    // (lcars-deco-block) werden dort ausgeblendet, die Links bleiben.
    <div className="lcars-footer-bar lcars-elbow-bar gap-[5px]">
      <div className="lcars-deco-block w-[25%] h-[var(--lcars-bar-h)] bg-[var(--lcars-secondary)]" />
      <div className="lcars-deco-block w-[15%] h-[var(--lcars-bar-h)] bg-[var(--lcars-tertiary)]" />
      <div className="w-[30%] h-[var(--lcars-bar-h)] bg-[var(--lcars-quinary)] flex items-center justify-end px-[10px]">
        {appVersion && (
          <Link href="/changelog" className="lcars-footer-version">
            v{appVersion}
          </Link>
        )}
      </div>
      <Link href="/tutorial" className="lcars-footer-menu">
        Tutorial
      </Link>
      <Link href="/impressum" className="lcars-footer-menu">
        Impressum
      </Link>
      <Link href="/datenschutz" className="lcars-footer-menu">
        Datenschutz
      </Link>
    </div>
  );
}
