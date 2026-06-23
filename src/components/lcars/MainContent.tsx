export default function MainContent({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="lcars-main-content pt-[50px] flex-1 overflow-y-auto min-h-0 lcars-scroll">
      <main className="flex-1 w-full flex flex-col">
        <div className="w-full">{children}</div>
      </main>
    </div>
  );
}
