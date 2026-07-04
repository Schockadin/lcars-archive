"use client";
import { usePageMeta } from "@/hooks/usePageMeta";
import LegalPageLayout from "@/components/lcars/LegalPageLayout";

export default function DSGVOClient() {
  usePageMeta("Datenschutz", "dsgvo");
  const currentYear = new Date().getFullYear();

  return (
    <LegalPageLayout eyebrow="Art. 13 DSGVO" title="Datenschutzerklärung">
      <h2>1. Verantwortlicher</h2>
      <address>
        Dominic Zander
        <br />
        Nordsternstr. 6a
        <br />
        45329 Essen
        <br />
        Deutschland
        <br />
        E-Mail: <a href="mailto:kontakt@neo-archiv.de">kontakt@neo-archiv.de</a>
      </address>

      <h2>2. Erhobene Daten & Zweck</h2>
      <p>
        Diese Website betreibt kein Tracking und keine Analysetools mit
        personenbezogenen Daten. Für die Kampagnen-Teilnehmer:innen gibt es
        einen passwortgeschützten Login-Bereich (<code>/login</code>,{" "}
        <code>/users/…</code>). Dort werden E-Mail-Adresse, Name, Rolle sowie
        ein Passwort-Hash gespeichert (Rechtsgrundlage: Art. 6 Abs. 1 lit. b
        DSGVO — Erfüllung des Nutzungsverhältnisses der Kampagne). Das Passwort
        selbst wird nicht im Klartext gespeichert, sondern nur als Hash (siehe
        Abschnitt 4).
      </p>
      <p>
        Wer im Login-Bereich Push-Benachrichtigungen aktiviert, erlaubt damit
        die Speicherung einer geräteseitigen Push-Subscription (eine vom Browser
        vergebene Endpoint-URL sowie kryptografische Schlüssel zur
        Verschlüsselung der Benachrichtigung) — keine Klartext-Inhalte,
        ausschließlich zur Zustellung von Benachrichtigungen genutzt
        (Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO — Einwilligung durch
        aktives Aktivieren). Die Subscription wird gelöscht, sobald sie in den
        Einstellungen deaktiviert wird, oder automatisch, sobald sie vom Browser
        für ungültig erklärt wird.
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

      <h2>4. Cookies</h2>
      <p>
        Diese Website setzt ein einziges eigenes Cookie namens{" "}
        <code>neo_session</code>. Es hält dich für 30 Tage angemeldet und ist
        technisch notwendig, um den Login-Bereich (<code>/login</code>,{" "}
        <code>/users/…</code>) bereitzustellen — ohne dieses Cookie ist kein
        Login möglich. Es ist <code>HttpOnly</code> gesetzt (kein Zugriff durch
        JavaScript) und wird nicht an Dritte übertragen.
      </p>
      <p>
        Da es sich um ein unbedingt erforderliches Cookie handelt, ist gemäß §
        25 Abs. 2 Nr. 2 TTDSG keine Einwilligung erforderlich (Rechtsgrundlage:
        Art. 6 Abs. 1 lit. b DSGVO). Der Cookie-Hinweis beim ersten Besuch
        informiert lediglich darüber, ohne eine Wahlmöglichkeit anzubieten, da
        es keine optionalen Cookies (Tracking, Analyse, Marketing) gibt, die man
        ablehnen könnte.
      </p>
      <p>
        Netlify kann darüber hinaus technische Cookies für den sicheren Betrieb
        setzen (z. B. DDoS-Schutz).
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
