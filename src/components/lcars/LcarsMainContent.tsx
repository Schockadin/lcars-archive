import LcarsSidebar from "./LcarsSidebar";

export default function LcarsMainContent({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="lcars-main-content">
      <LcarsSidebar />
      <main className="flex-1 min-w-0 flex flex-col">
        <div className="h-[20px] w-auto sticky top-[0px] ml-[-64px]">
          <div className="lcars-elbow-bar">
            <div className="w-[35%] h-[20px] bg-[var(--lcars-red)] mr-[5px]" />
            <div className="w-[5%] h-[20px] bg-[var(--lcars-orange)] mr-[5px]" />
            <div className="w-[20%] h-[10px] bg-[var(--lcars-amber)] mr-[5px]" />
            <div className="w-[35%] h-[20px] bg-[var(--lcars-purple)] mr-[5px]" />
            <div className="w-[5%] h-[20px] bg-[var(--lcars-orange)]" />
          </div>
        </div>
        <div className="lcars-page-content">{children}</div>
      </main>
    </div>
  );
}
