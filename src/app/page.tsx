"use client";
import { useState, useEffect } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";

// ─── Systemstatus-Daten (statisch, können später aus Vault kommen) ──────────
const SYSTEM_STATS = [
  { label: "AKTIVE LAUFZEIT", value: "15+", unit: "JAHRE" },
  { label: "SPIELSYSTEM", value: "STA 2e", unit: "" },
  { label: "STATUS", value: "AKTIV", unit: "" },
];

export default function Home() {
  usePageMeta("Home", "home");

  return (
    <main
      className="text-justify"
      style={{
        maxWidth: "100vw",
        minWidth: "50vw",
        width: "75%",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "40px",
          borderBottom: `1px solid var(--lcars-amber)`,
          paddingBottom: "16px",
          animationDelay: "0.2s",
        }}
      >
        {SYSTEM_STATS.map((stat) => (
          <StatBadge key={stat.label} {...stat} />
        ))}
      </div>

      {/* ── Begrüßungstext ── */}
      <div className="mt-[16px]">
        {/* Eyebrow */}
        <div
          style={{
            fontFamily: "'Antonio', 'Helvetica Neue', Arial, sans-serif",
            fontSize: "12px",
            letterSpacing: "0.3em",
            color: "var(--lcars-orange)",
            marginBottom: "12px",
          }}
        >
          INITIALISIERUNG // DATENBANKZUGRIFF AUTORISIERT
        </div>

        {/* Hauptüberschrift */}
        <h1
          style={{
            fontFamily: "'Antonio', 'Helvetica Neue', Arial, sans-serif",
            fontSize: "clamp(28px, 4vw, 48px)",
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "var(--lcars-amber)",
            lineHeight: 1.1,
            marginBottom: "20px",
          }}
        >
          WILLKOMMEN IM ARCHIV
          <BlinkCursor />
        </h1>

        {/* Trennlinie */}
        <div
          style={{
            width: "120px",
            height: "3px",
            background: "var(--lcars-blue)",
            borderRadius: "2px",
            marginBottom: "24px",
          }}
        />

        {/* Fließtext */}
        <div
          style={{
            fontFamily: "'Share Tech Mono', 'Courier New', monospace",
            fontSize: "15px",
            lineHeight: 1.85,
            color: "var(--lcars-text)",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          <p>
            Seit über fünfzehn Jahren wird die Welt von NeoVerse gespielt,
            beschrieben und erweitert. Was einmal als Abenteuer an einem Tisch
            begann, ist heute ein dichtes Geflecht aus Geschichte, Figuren und
            Orten — gewachsen durch jede Entscheidung, die an diesem Tisch
            getroffen wurde.
          </p>
          <p>
            Dieses Terminal ist das Gedächtnis dieser Welt. Es bewahrt, was
            erlebt wurde: die Sitzungsberichte, die Charakterbögen, die Orte und
            die Ereignisse, die NeoVerse zu dem gemacht haben, was es ist. Kein
            Roman, kein Regelwerk — sondern das Protokoll einer gemeinsamen
            Geschichte.
          </p>
          <p style={{ color: "var(--lcars-orange)", opacity: 0.7 }}>
            Zugriff über die Navigation. Neue Einträge erscheinen, sobald sie
            übertragen wurden. Das Archiv wächst mit.
          </p>
        </div>
      </div>
    </main>
  );
}
function StatBadge({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <span
        style={{
          fontFamily: "'Antonio', 'Helvetica Neue', Arial, sans-serif",
          fontSize: "12px",
          letterSpacing: "0.2em",
          color: "var(--lcars-orange)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "'Antonio', 'Helvetica Neue', Arial, sans-serif",
          fontSize: "22px",
          fontWeight: 700,
          color: "var(--lcars-amber)",
          lineHeight: 1,
          letterSpacing: "0.05em",
        }}
      >
        {value}
        {unit && (
          <span style={{ fontSize: "11px", marginLeft: "6px" }}>{unit}</span>
        )}
      </span>
    </div>
  );
}

function BlinkCursor() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setVisible((v) => !v), 250);
    return () => clearInterval(t);
  }, []);
  return (
    <span
      style={{
        display: "inline-block",
        width: "5px",
        height: "clamp(28px, 4vw, 48px)",
        background: visible ? "var(--lcars-amber)" : "transparent",
        verticalAlign: "text-bottom",
        marginLeft: "4px",
      }}
    />
  );
}
