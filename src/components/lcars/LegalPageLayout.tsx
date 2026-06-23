import type { ReactNode } from "react";

export default function LegalPageLayout({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="pr-[var(--lcars-elbow-size)] max-w-[800px]">
      <p className="lcars-eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <div className="lcars-legal-body">{children}</div>
    </article>
  );
}
