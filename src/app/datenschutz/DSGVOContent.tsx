// Server Component: die Seite ist reiner, statischer Rechtstext ohne jede
// Interaktivität. Früher "use client" allein wegen usePageMeta() — dadurch
// landete der komplette Textbaum zusätzlich im Client-Bundle. Den In-App-
// Titel/Nav-Highlight setzt jetzt der winzige <PageMeta>-Client-Shim.
import PageMeta from "@/components/PageMeta";
import LegalPageLayout from "@/components/lcars/LegalPageLayout";

export default function DSGVOContent({ year }: { year: number }) {
  const currentYear = year;

  return (
    <>
      <PageMeta title="Datenschutz" section="dsgvo" />
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
          E-Mail:{" "}
          <a href="mailto:kontakt@neo-archiv.de">kontakt@neo-archiv.de</a>
        </address>

        <h2>2. Erhobene Daten & Zweck</h2>
        <p>
          Diese Website betreibt kein Tracking und keine Analysetools mit
          personenbezogenen Daten. Für die Kampagnen-Teilnehmer:innen gibt es
          einen passwortgeschützten Login-Bereich (<code>/login</code>,{" "}
          <code>/user/…</code>). Dort werden E-Mail-Adresse, Name, Rolle(n)
          sowie ein Passwort-Hash gespeichert (Rechtsgrundlage: Art. 6 Abs. 1
          lit. b DSGVO — Erfüllung des Nutzungsverhältnisses der Kampagne). Zur
          Rechteverwaltung werden pro Konto zusätzlich die zugewiesenen Rollen
          sowie einzelne gezielt gewährte oder entzogene Rechte
          (Rechte-Ausnahmen) gespeichert; sie steuern ausschließlich, welche
          Funktionen der Kampagnen-Anwendung der Person zur Verfügung stehen
          (Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO — berechtigtes Interesse
          an einer geordneten Zugriffsverwaltung). Das Passwort selbst wird
          nicht im Klartext gespeichert, sondern nur als Hash. Zusätzlich werden
          pro Konto persönliche Anzeige-Einstellungen gespeichert (u. a. das
          gewählte Farbschema der Oberfläche samt individuell überschriebener
          Akzentfarben), damit sie geräteübergreifend erhalten bleiben — reine
          Komfort-Einstellungen ohne Rückschluss auf weitere personenbezogene
          Daten (Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO).
        </p>
        <p>
          Zum Festlegen eines ersten Passworts (Einladung durch die
          Spielleitung) sowie zum Zurücksetzen eines vergessenen Passworts (
          <code>/forgot-password</code>, oder ausgelöst durch die
          Administration) wird ein einmaliger, zeitlich befristeter Link per
          E-Mail verschickt. Der Link selbst wird nur als Hash gespeichert,
          verliert nach Benutzung oder nach 7 Tagen seine Gültigkeit
          (Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO). Fordert ein Account
          selbst einen Reset an, wird die Administration zusätzlich per E-Mail
          über die anfragende E-Mail-Adresse informiert (berechtigtes Interesse
          an der Erkennung missbräuchlicher Reset-Anfragen, Rechtsgrundlage:
          Art. 6 Abs. 1 lit. f DSGVO). Aus dieser Anfrage selbst lässt sich
          unabhängig von ihrem Ergebnis nicht ableiten, ob zu einer eingegebenen
          E-Mail-Adresse ein Konto existiert.
        </p>
        <p>
          Zum Schutz vor automatisierten Anmelde- bzw. Reset-Versuchen
          (Brute-Force) speichert die Anwendung selbst bei jedem Login-Versuch
          und jeder Anfrage über „Passwort vergessen“ zusätzlich E-Mail-Adresse,
          IP-Adresse und Zeitpunkt (Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO
          — berechtigtes Interesse an der Verhinderung automatisierter
          Angriffsversuche). Diese Einträge werden nach spätestens 24 Stunden
          automatisch gelöscht.
        </p>
        <p>
          Sicherheitsrelevante Aktionen der Administration auf Useraccounts
          (Anlegen, Rollen-/Profiländerung, (De-)Aktivierung, Löschung,
          Passwort-Reset auslösen, Abmelden auf allen Geräten) werden zusammen
          mit Zeitpunkt, ausführendem Account und IP-Adresse dauerhaft in einem
          nur für Administration einsehbaren Protokoll festgehalten
          (Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO — berechtigtes Interesse
          an der Nachvollziehbarkeit privilegierter Kontoaktionen, u. a. zur
          Aufklärung eines vermuteten kompromittierten Admin-Accounts).
        </p>
        <p>
          Tritt ein unerwarteter Serverfehler auf, werden Fehlermeldung,
          Stacktrace, betroffene Route und Zeitpunkt dauerhaft in einem nur für
          Administration einsehbaren Protokoll gespeichert (Rechtsgrundlage:
          Art. 6 Abs. 1 lit. f DSGVO — berechtigtes Interesse an der
          Fehlerdiagnose und einem sicheren Betrieb der Anwendung). Diese
          technischen Diagnosedaten können in Einzelfällen personenbezogene
          Daten enthalten, etwa eine E-Mail-Adresse in der Fehlermeldung eines
          fehlgeschlagenen Mail-Versands.
        </p>
        <p>
          Für die persönliche „News“-Übersicht auf dem Dashboard wird pro
          Login-Account gespeichert, welche Neuigkeiten bereits gesehen bzw.
          ausgeblendet wurden (Inhaltstyp, Kennung und Zeitpunkt), damit
          erledigte News nicht erneut angezeigt werden (Rechtsgrundlage: Art. 6
          Abs. 1 lit. b DSGVO — Bereitstellung dieser Komfortfunktion). Es
          werden dabei keine Inhalte, sondern nur Verweise auf bereits gesehene
          Einträge gespeichert.
        </p>
        <p>
          Wer im Login-Bereich Push-Benachrichtigungen aktiviert, erlaubt damit
          die Speicherung einer geräteseitigen Push-Subscription (eine vom
          Browser vergebene Endpoint-URL sowie kryptografische Schlüssel zur
          Verschlüsselung der Benachrichtigung) — keine Klartext-Inhalte,
          ausschließlich zur Zustellung von Benachrichtigungen genutzt
          (Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO — Einwilligung durch
          aktives Aktivieren). Die Subscription wird gelöscht, sobald sie in den
          Einstellungen deaktiviert wird, oder automatisch, sobald sie vom
          Browser für ungültig erklärt wird.
        </p>
        <p>
          Für den Offline-Betrieb der installierbaren App (PWA) legt ein{" "}
          <strong>Service Worker</strong> Kopien bereits aufgerufener Seiten
          sowie statischer Dateien (Programmcode, Schriften, Symbole) im lokalen
          Browser-Speicher (Cache Storage) des jeweiligen Geräts ab. Diese
          Kopien verbleiben ausschließlich auf dem Gerät, werden nicht an den
          Server oder Dritte übertragen und ermöglichen, dass bereits besuchte
          Seiten auch ohne Internetverbindung angezeigt werden (Rechtsgrundlage:
          Art. 6 Abs. 1 lit. b DSGVO — Bereitstellung der Anwendung, sowie lit.
          f — berechtigtes Interesse an schnellen Ladezeiten). Der Cache lässt
          sich jederzeit durch Leeren der Websitedaten im Browser bzw.
          Deinstallieren der App vollständig entfernen.
        </p>
        <p>
          Beim Aufruf der Website werden durch den Hosting-Anbieter
          <strong> Netlify, Inc.</strong> (512 2nd Street, Suite 200, San
          Francisco, CA 94107, USA) technisch bedingt folgende Daten im
          Server-Log erfasst:
        </p>
        <p>
          IP-Adresse, Datum und Uhrzeit der Anfrage, aufgerufene URL,
          übertragene Datenmenge, Browsertyp und Betriebssystem.
        </p>
        <p>
          Diese Daten sind für den Betrieb der Website technisch notwendig
          (Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO — berechtigtes Interesse
          an einem sicheren Betrieb). Netlify verarbeitet diese Daten als
          Auftragsverarbeiter gemäß Art. 28 DSGVO. Mehr Informationen:{" "}
          <a
            href="https://www.netlify.com/privacy/"
            target="_blank"
            rel="noreferrer"
          >
            netlify.com/privacy
          </a>
        </p>

        <h2>3. E-Mail-Versand</h2>
        <p>
          Aktivierungs-Links, Passwort-Reset-Links sowie Benachrichtigungen zu
          abonnierten Inhalten und Gesprächsnachrichten werden über den
          E-Mail-Dienstleister <strong>Resend</strong> (San Francisco, USA)
          verschickt. Dabei werden E-Mail-Adresse, Name und der jeweilige
          Mailinhalt (z. B. der Link oder der Titel des betroffenen Inhalts) an
          Resend übermittelt. Resend verarbeitet diese Daten als
          Auftragsverarbeiter gemäß Art. 28 DSGVO, ausschließlich zum Versand
          der jeweiligen E-Mail (Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO).
          Mehr Informationen:{" "}
          <a href="https://resend.com" target="_blank" rel="noreferrer">
            resend.com
          </a>
        </p>
        <p>
          Zusätzlich erhält die Administration einmal täglich eine
          Zusammenfassungs-Mail mit den Fehler- und Audit-Log-Einträgen der
          letzten 24 Stunden (siehe Abschnitt 2). Diese Mail geht ausschließlich
          an die Administrations-Accounts und dient dem sicheren Betrieb und der
          Nachvollziehbarkeit privilegierter Aktionen (Rechtsgrundlage: Art. 6
          Abs. 1 lit. f DSGVO); der Versand erfolgt ebenfalls über Resend.
        </p>

        <h2>4. KI-gestützter Archiv-Assistent</h2>
        <p>
          Angemeldete Nutzer:innen können über den Archiv-Assistenten (
          <code>/rag</code> bzw. unterhalb der Suche auf <code>/search</code>)
          Fragen zum Archivinhalt in natürlicher Sprache stellen. Zur
          Beantwortung werden die eingegebene <strong>Frage</strong> sowie – im
          Rahmen der Indexierung – die betroffenen{" "}
          <strong>Archivinhalte</strong> (Texte zu Charakteren, Missionen,
          Berichten, Archiv-Einträgen und abgeschlossenen Gesprächen) an zwei
          Auftragsverarbeiter in den USA übermittelt:
        </p>
        <p>
          <strong>OpenAI</strong> (OpenAI, L.L.C., San Francisco, USA) wandelt
          die Frage und die Inhaltstexte über die OpenAI-API in numerische
          Vektoren („Embeddings“) um, die die semantische Suche ermöglichen.
          Übermittelt wird der jeweilige Text; nach Angaben von OpenAI werden
          über die API gesendete Daten nicht zum Training der Modelle verwendet.
          Mehr Informationen:{" "}
          <a
            href="https://openai.com/policies/privacy-policy"
            target="_blank"
            rel="noreferrer"
          >
            openai.com/policies/privacy-policy
          </a>
        </p>
        <p>
          <strong>Cloudflare</strong> (Cloudflare, Inc., San Francisco, USA)
          erzeugt aus der Frage und den dazu passenden Inhaltsausschnitten über
          „Workers AI“ die formulierte Antwort. Übermittelt werden die Frage und
          die als Kontext genutzten Ausschnitte. Mehr Informationen:{" "}
          <a
            href="https://www.cloudflare.com/privacypolicy/"
            target="_blank"
            rel="noreferrer"
          >
            cloudflare.com/privacypolicy
          </a>
        </p>
        <p>
          Beide verarbeiten die Daten als Auftragsverarbeiter gemäß Art. 28
          DSGVO, ausschließlich zur Beantwortung der jeweiligen Anfrage
          (Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO — berechtigtes Interesse
          an einer komfortablen Recherche im eigenen Archiv). In den Kontext
          einer Antwort fließen nur Inhalte ein, die die fragende Person nach
          ihren Leserechten ohnehin einsehen darf. Der Assistent ist ein
          optionales Zusatzangebot für angemeldete Nutzer:innen; wer ihn nicht
          verwendet, löst keine solche Übermittlung aus.
        </p>

        <h2>5. Datenübertragung in Drittländer</h2>
        <p>
          Netlify, Resend, OpenAI und Cloudflare haben Serverstandorte in den
          USA. Die Übertragung erfolgt auf Basis des EU-US Data Privacy
          Framework (Angemessenheitsbeschluss der EU-Kommission vom Juli 2023)
          bzw., soweit ein Anbieter diesem nicht angeschlossen ist, auf Basis
          der EU-Standardvertragsklauseln.
        </p>

        <h2>6. Cookies</h2>
        <p>
          Diese Website setzt ausschließlich eigene, technisch notwendige
          Cookies und keine Cookies von Dritten:
        </p>
        <ul>
          <li>
            <code>neo_session</code> hält dich für 30 Tage angemeldet und ist
            notwendig, um den Login-Bereich (<code>/login</code>,{" "}
            <code>/user/…</code>) bereitzustellen — ohne dieses Cookie ist kein
            Login möglich. Es ist <code>HttpOnly</code> gesetzt (kein Zugriff
            durch JavaScript).
          </li>
          <li>
            <code>neo_theme</code> und <code>neo_theme_custom</code> speichern
            das von dir im Profil gewählte Farbschema der Oberfläche (Theme-Name
            bzw. deine individuell überschriebenen Akzentfarben), damit es ohne
            Flackern schon beim Seitenaufbau angewendet wird. Sie enthalten nur
            diese Anzeige-Einstellung, keine personenbezogenen Daten, und sind
            bewusst nicht <code>HttpOnly</code> (das Anzeige-Skript liest sie
            vor dem ersten Rendern aus). Sie werden nur gesetzt, wenn du
            angemeldet bist bzw. ein Theme wählst, und beim Abmelden wieder
            entfernt.
          </li>
          <li>
            <code>neo_ui</code> speichert, ob du im Profil das LCARS-Design
            zugunsten eines schlanken, minimalistischen Interfaces deaktiviert
            hast, damit diese Wahl ohne Flackern schon beim Seitenaufbau
            angewendet wird. Es enthält nur diese Anzeige-Einstellung, keine
            personenbezogenen Daten, ist aus demselben Grund nicht{" "}
            <code>HttpOnly</code>, wird nur bei der minimalistischen Ansicht
            gesetzt und beim Abmelden wieder entfernt.
          </li>
        </ul>
        <p>
          Da es sich ausschließlich um unbedingt erforderliche bzw. für die von
          dir ausdrücklich gewünschte Anzeige-Einstellung nötige Cookies
          handelt, ist gemäß § 25 Abs. 2 TTDSG keine Einwilligung erforderlich
          (Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO). Der Cookie-Hinweis beim
          ersten Besuch informiert lediglich darüber, ohne eine Wahlmöglichkeit
          anzubieten, da es keine optionalen Cookies (Tracking, Analyse,
          Marketing) gibt, die man ablehnen könnte.
        </p>
        <p>
          Netlify kann darüber hinaus technische Cookies für den sicheren
          Betrieb setzen (z. B. DDoS-Schutz).
        </p>

        {/* Abschnitt "Externe Schriftarten" entfernt: Antonio und Share Tech
          Mono werden über next/font/google eingebunden (siehe
          src/app/layout.tsx), das die Font-Dateien bereits zur Build-Zeit
          herunterlädt und selbst ausliefert — es gibt keine Laufzeit-Anfrage
          an Google-Server mehr und damit keine Übertragung der IP-Adresse. */}

        <h2>7. Deine Rechte</h2>
        <p>
          Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art.
          16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18),
          Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21 DSGVO).
          Beschwerden kannst du an die zuständige Aufsichtsbehörde richten:
          Landesbeauftragte für Datenschutz und Informationsfreiheit NRW,{" "}
          <a href="https://www.ldi.nrw.de" target="_blank" rel="noreferrer">
            ldi.nrw.de
          </a>
        </p>

        <h2>8. Aktualität</h2>
        <p>Stand: {currentYear}</p>
      </LegalPageLayout>
    </>
  );
}
