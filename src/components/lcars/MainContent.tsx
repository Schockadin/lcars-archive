export default function MainContent({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="lcars-main-content pt-[50px] flex-grow">
      <main className="flex-1 w-full flex flex-col">
        <div className="w-full">{children}</div>
      </main>
    </div>
  );
}
