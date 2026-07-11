import Link from "next/link";

export function HeaderBar() {
  return (
    <div className="flex flex-col bg-[var(--lcars-bg)] gap-[5px]">
      <div className="lcars-elbow-bar gap-[5px]">
        <div className="w-[35%] h-lcars-bar bg-[var(--lcars-blue)]" />
        <div className="w-[5%] h-lcars-bar bg-[var(--lcars-amber)]" />
        <div className="w-[20%] h-lcars-bar bg-[var(--lcars-purple)]" />
        <div className="w-[35%] h-lcars-bar bg-[var(--lcars-purple)]" />
        <div className="w-[5%] h-lcars-bar bg-[var(--lcars-red)]" />
      </div>
      <div className="lcars-elbow-bar gap-[5px]">
        <div className="w-[35%] h-lcars-bar bg-[var(--lcars-red)]" />
        <div className="w-[5%] h-lcars-bar bg-[var(--lcars-orange)]" />
        <div className="w-[20%] h-[10px] bg-[var(--lcars-amber)]" />
        <div className="w-[35%] h-lcars-bar bg-[var(--lcars-purple)]" />
        <div className="w-[5%] h-lcars-bar bg-[var(--lcars-orange)]" />
      </div>
    </div>
  );
}

export function FooterBar({ appVersion }: { appVersion: string | null }) {
  return (
    <div className="lcars-elbow-bar gap-[5px]">
      <div className="w-[25%] h-lcars-bar bg-[var(--lcars-purple)]" />
      <div className="w-[15%] h-lcars-bar bg-[var(--lcars-blue)]" />
      <div className="w-[30%] h-lcars-bar bg-[var(--lcars-red)] flex items-center justify-end px-[10px]">
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
