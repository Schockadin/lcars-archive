// src/app/datenschutz/page.tsx
import { Metadata } from "next";
import LegalPageLayout from "@/components/lcars/LegalPageLayout";

export const metadata: Metadata = {
  title: "Datenschutz — LCARS NEO ARCHIVE",
  robots: { index: false },
};

export default function DatenschutzPage() {
  const currentYear = new Date().getFullYear();

  return (
    <LegalPageLayout eyebrow="Art. 13 DSGVO" title="Datenschutzerklärung">
      <h2>1. Verantwortlicher</h2>
      <address>
        Dominic [Nachname]
        <br />
        [Straße & Hausnummer]
        <br />
        [PLZ] Essen
        <br />
        E-Mail:{" "}
        <a href="mailto:wowschockadin@gmail.com">wowschockadin@gmail.com</a>
      </address>

      <h2>2. Erhobene Daten & Zweck</h2>
      <p>
        Diese Website erhebt keine personenbezogenen Daten durch eigene
        Mechanismen (kein Tracking, keine Cookies, keine Analysetools, keine
        Nutzerkonten).
      </p>
      <p>
        Beim Aufruf der Website werden durch den Hosting-Anbieter
        <strong> Netlify, Inc.</strong> (512 2nd Street, Suite 200, San
        Francisco, CA 94107, USA) technisch bedingt folgende Daten im Server-Log
        erfasst:
      </p>
      <p>
        IP-Adresse, Datum und Uhrzeit der Anfrage, aufgerufene URL, übertragene
        Datenmenge, Browsertyp und Betriebssystem.
      </p>
      <p>
        Diese Daten sind für den Betrieb der Website technisch notwendig
        (Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO — berechtigtes Interesse an
        einem sicheren Betrieb). Netlify verarbeitet diese Daten als
        Auftragsverarbeiter gemäß Art. 28 DSGVO. Mehr Informationen:{" "}
        <a
          href="https://www.netlify.com/privacy/"
          target="_blank"
          rel="noreferrer"
        >
          netlify.com/privacy
        </a>
      </p>

      <h2>3. Datenübertragung in Drittländer</h2>
      <p>
        Netlify hat Serverstandorte in den USA. Die Übertragung erfolgt auf
        Basis des EU-US Data Privacy Framework (Angemessenheitsbeschluss der
        EU-Kommission vom Juli 2023).
      </p>

      <h2>4. Keine Cookies</h2>
      <p>
        Diese Website setzt keine eigenen Cookies. Netlify kann technische
        Cookies für den sicheren Betrieb (z. B. DDoS-Schutz) setzen.
      </p>

      <h2>5. Externe Schriftarten</h2>
      <p>
        Die Schriftarten Antonio und Share Tech Mono werden über
        <strong> Google Fonts</strong> eingebunden. Dabei wird deine IP-Adresse
        an Google-Server übertragen. Rechtsgrundlage: Art. 6 Abs. 1 lit. f
        DSGVO. Datenschutzerklärung von Google:{" "}
        <a
          href="https://policies.google.com/privacy"
          target="_blank"
          rel="noreferrer"
        >
          policies.google.com/privacy
        </a>
      </p>
      <p>
        <em>
          Alternativ: Falls du die Schriften lokal hostest (self-hosted fonts),
          entfällt dieser Abschnitt vollständig.
        </em>
      </p>

      <h2>6. Deine Rechte</h2>
      <p>
        Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16),
        Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18),
        Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21 DSGVO).
        Beschwerden kannst du an die zuständige Aufsichtsbehörde richten:
        Landesbeauftragte für Datenschutz und Informationsfreiheit NRW,{" "}
        <a href="https://www.ldi.nrw.de" target="_blank" rel="noreferrer">
          ldi.nrw.de
        </a>
      </p>

      <h2>7. Aktualität</h2>
      <p>Stand: {currentYear}</p>
    </LegalPageLayout>
  );
}
