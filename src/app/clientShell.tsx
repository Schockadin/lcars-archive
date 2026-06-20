// ClientShell.tsx
"use client";

export default function ClientShell({
  statChips,
  children,
}: {
  statChips?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div>
      {statChips}
      {children}
    </div>
  );
}
