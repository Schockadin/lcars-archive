import { LcarsFooterBar } from ".";

export default function Footer({ appVersion }: { appVersion: string | null }) {
  return (
    <footer className="h-lcars-bar w-full sticky top-[100%]">
      <LcarsFooterBar appVersion={appVersion} />
    </footer>
  );
}
