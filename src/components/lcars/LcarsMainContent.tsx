export default function LcarsMainContent({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="lcars-main-content">
      <main className="flex-1 w-full flex flex-col">
        <div className="w-full">{children}</div>
      </main>
    </div>
  );
}
