import { EditProvider } from "@/context/EditProvider";
import React from "react";

export default function ArchiveEntryLayout({
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
