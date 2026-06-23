import Link from "next/link";

export function HeaderBar() {
  return (
    <div className="flex flex-col gap-[5px] bg-[var(--lcars-bg)]">
      <div className="lcars-elbow-bar">
        <div className="w-[35%] h-[var(--lcars-bar-h)] bg-[var(--lcars-blue)] mr-[5px]" />
        <div className="w-[5%] h-[var(--lcars-bar-h)] bg-[var(--lcars-amber)] mr-[5px]" />
        <div className="w-[20%] h-[var(--lcars-bar-h)] bg-[var(--lcars-purple)] mr-[5px]" />
        <div className="w-[35%] h-[var(--lcars-bar-h)] bg-[var(--lcars-purple)] mr-[5px]" />
        <div className="w-[5%] h-[var(--lcars-bar-h)] bg-[var(--lcars-red)]" />
      </div>
      <div className="lcars-elbow-bar">
        <div className="w-[35%] h-[var(--lcars-bar-h)] bg-[var(--lcars-red)] mr-[5px]" />
        <div className="w-[5%] h-[var(--lcars-bar-h)] bg-[var(--lcars-orange)] mr-[5px]" />
        <div className="w-[20%] h-[10px] bg-[var(--lcars-amber)] mr-[5px]" />
        <div className="w-[35%] h-[var(--lcars-bar-h)] bg-[var(--lcars-purple)] mr-[5px]" />
        <div className="w-[5%] h-[var(--lcars-bar-h)] bg-[var(--lcars-orange)]" />
      </div>
    </div>
  );
}

export function FooterBar() {
  return (
    <div className="lcars-elbow-bar">
      <div className="w-[25%] h-[var(--lcars-bar-h)] bg-[var(--lcars-purple)] mr-[5px]" />
      <div className="w-[15%] h-[var(--lcars-bar-h)] bg-[var(--lcars-blue)] mr-[5px]" />
      <div className="w-[5%] h-[var(--lcars-bar-h)] bg-[var(--lcars-orange)] mr-[5px]" />
      <div className="w-[35%] h-[var(--lcars-bar-h)] bg-[var(--lcars-red)] mr-[5px]" />
      <Link href="/impressum" className="lcars-footer-menu mr-[5px]">
        Impressum
      </Link>
      <Link href="/impressum" className="lcars-footer-menu">
        Datenschutz
      </Link>
    </div>
  );
}
