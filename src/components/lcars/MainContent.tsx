import HashScrollRestorer from "./HashScrollRestorer";
import PullToRefresh from "./PullToRefresh";

export default function MainContent({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="lcars-main-content flex-1 overflow-y-auto min-h-0 lcars-scroll py-[5px]">
      <PullToRefresh />
      <HashScrollRestorer />
      <main className="flex-1 w-full flex flex-col">
        <div className="w-full h-full">{children}</div>
      </main>
    </div>
  );
}
