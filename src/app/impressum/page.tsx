// src/app/impressum/page.tsx
import { Metadata } from "next";
import LegalPageLayout from "@/components/lcars/LegalPageLayout";

export const metadata: Metadata = {
  title: "Impressum — NEO ARCHIVE",
  robots: { index: false }, // Impressum muss nicht indexiert werden
};

export default function ImpressumPage() {
  return (
    <LegalPageLayout eyebrow="§ 5 TMG" title="Impressum">
      <h2>Angaben gemäß § 5 TMG</h2>
      <address>
        Dominic Zander
        <br />
        Nordsternstr. 6a
        <br />
        45329 Essen
        <br />
        Deutschland
      </address>

      <h2>Kontakt</h2>
      <p>
        E-Mail:{" "}
        <a href="mailto:wowschockadin@gmail.com">wowschockadin@gmail.com</a>
      </p>

      <h2>Hinweis zum Inhalt</h2>
      <p>
        Diese Website ist eine private, nicht-kommerzielle Fansite zur
        Dokumentation einer laufenden Pen-&-Paper-Rollenspielkampagne. Sämtliche
        Inhalte sind fiktional. Star-Trek-Begriffe und das LCARS-Design sind
        Marken von CBS Studios Inc. / Paramount Global. Diese Seite steht in
        keiner Verbindung zu diesen Unternehmen.
      </p>

      <h2>Haftung für Inhalte</h2>
      <p>
        Als Diensteanbieter bin ich gemäß § 7 Abs. 1 TMG für eigene Inhalte nach
        den allgemeinen Gesetzen verantwortlich. Eine Pflicht zur Überwachung
        fremder Informationen besteht nicht (§§ 8–10 TMG).
      </p>

      <h2>Urheberrecht</h2>
      <p>
        Die durch den Seitenbetreiber erstellten Inhalte und Werke unterliegen
        dem deutschen Urheberrecht. Vervielfältigung, Bearbeitung, Verbreitung
        oder Verwertung außerhalb der Grenzen des Urheberrechts bedürfen der
        schriftlichen Zustimmung.
      </p>
    </LegalPageLayout>
  );
}
