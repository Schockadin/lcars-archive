// src/app/forbidden.tsx
import { LcarsMenuItem } from "@/components/lcars";

// Wird von forbidden() (next/navigation) gerendert — ausgelöst von den
// Zugriffs-Guards in src/lib/dal.ts, src/app/user/[id]/dal.ts und
// src/app/admin/[id]/dal.ts, wenn ein
// angemeldeter User eine geschützte Route ohne die nötige Rolle/Identität
// aufruft (anders als eine fehlende Session, die weiterhin auf /login
// umleitet). Benötigt experimental.authInterrupts in next.config.ts.
export default function Forbidden() {
  return (
    <div className="flex flex-col items-center justify-center gap-[16px] pt-[80px] px-8 text-center">
      {/* Fehlercode – groß und in LCARS-Amber, wie not-found.tsx */}
      <div
        className="font-lcars-mono uppercase tracking-widest text-lcars-amber"
        style={{
          fontSize: "clamp(64px, 12vw, 160px)",
          lineHeight: 1,
          fontWeight: 700,
        }}
      >
        403
      </div>

      {/* Statuszeile wie ein LCARS-Systemmeldung */}
      <div className="uppercase tracking-[0.2em] text-sm text-lcars-text-data">
        FEHLER // ZUGRIFF VERWEIGERT
      </div>

      {/* Trennbalken im LCARS-Stil */}
      <div className="flex gap-[4px] w-full max-w-[400px] h-[8px]">
        <div className="flex-1 bg-lcars-purple" />
        <div className="w-[32px] bg-lcars-amber" />
        <div className="flex-1 bg-lcars-blue" />
      </div>

      {/* Kurze Erklärung */}
      <p
        className="max-w-[var(--lcars-content-w)] leading-relaxed text-lcars-text"
        style={{ fontSize: "16px" }}
      >
        Du hast keine Berechtigung, auf diesen Bereich des Neo-Archivs
        zuzugreifen.
      </p>

      {/* Zurück-Link als LCARS-Pill */}
      <LcarsMenuItem
        href="/"
        id="zurück"
        type="pill"
        style={{
          height: "40px",
          width: "200px",
          justifyContent: "center",
          alignItems: "center",
          padding: "0",
        }}
      />
    </div>
  );
}
