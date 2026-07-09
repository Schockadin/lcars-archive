import { EditProvider } from "@/context/EditProvider";

export default function MissionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <EditProvider>
      <div>{children}</div>
    </EditProvider>
  );
}
