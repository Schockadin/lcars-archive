"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  DEFAULT_THEME_ID,
  THEME_COOKIE_NAME,
  THEME_CUSTOM_COOKIE_NAME,
  OVERRIDE_TOKEN_VARS,
  decodeThemeOverrides,
} from "@/lib/themes";
import {
  UI_MODE_COOKIE_NAME,
  UI_MODE_MINIMAL,
  UI_MODE_MINIMAL_LIGHT_LEGACY,
} from "@/lib/uiMode";
import { COLOR_MODE_COOKIE_NAME, COLOR_MODE_LIGHT } from "@/lib/colorMode";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[1]) : null;
}

// Wendet Farbtheme + Individualisierung + UI-Modus + Hell/Dunkel-Modus aus den
// Cookies auf <html> an — dieselbe Logik wie das Pre-Paint-Init-Skript in
// src/app/layout.tsx, nur clientseitig bei jedem Routenwechsel. Nötig, weil das
// Init-Skript nur bei einem echten Full-Load läuft: nach dem Login
// (Soft-Navigation via redirect()) und nach dem Logout greift sonst kein Theme,
// bis manuell neu geladen wird.
function applyThemeFromCookies() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  const theme = readCookie(THEME_COOKIE_NAME);
  if (theme && theme !== DEFAULT_THEME_ID) {
    root.setAttribute("data-theme", theme);
  } else {
    root.removeAttribute("data-theme");
  }

  const overrides = decodeThemeOverrides(readCookie(THEME_CUSTOM_COOKIE_NAME));
  for (const [id, suffixes] of Object.entries(OVERRIDE_TOKEN_VARS)) {
    const hex = overrides[id as keyof typeof overrides];
    for (const suffix of suffixes) {
      if (hex) {
        root.style.setProperty(`--lcars-${suffix}`, hex);
        root.style.setProperty(`--color-lcars-${suffix}`, hex);
      } else {
        root.style.removeProperty(`--lcars-${suffix}`);
        root.style.removeProperty(`--color-lcars-${suffix}`);
      }
    }
  }

  // UI-Modus (LCARS vs. minimalistisch) — Alt-Wert "minimal-light" zählt als
  // "minimal" (Helligkeit trägt jetzt data-mode).
  const uiMode = readCookie(UI_MODE_COOKIE_NAME);
  if (uiMode === UI_MODE_MINIMAL || uiMode === UI_MODE_MINIMAL_LIGHT_LEGACY) {
    root.setAttribute("data-ui", UI_MODE_MINIMAL);
  } else {
    root.removeAttribute("data-ui");
  }

  // Hell/Dunkel als eigene Achse; der Alt-Wert "minimal-light" impliziert hell,
  // bis das Login das neo_mode-Cookie nachzieht.
  const colorMode = readCookie(COLOR_MODE_COOKIE_NAME);
  if (
    colorMode === COLOR_MODE_LIGHT ||
    uiMode === UI_MODE_MINIMAL_LIGHT_LEGACY
  ) {
    root.setAttribute("data-mode", COLOR_MODE_LIGHT);
  } else {
    root.removeAttribute("data-mode");
  }
}

// Rendert nichts — hält nur das Theme über clientseitige Navigationen hinweg
// synchron mit den Cookies (Login/Logout/Reissue). Auf einem Full-Load hat das
// Init-Skript bereits denselben Stand gesetzt, der Effekt ist dann ein No-op.
export default function ThemeApplier() {
  const pathname = usePathname();
  useEffect(() => {
    applyThemeFromCookies();
  }, [pathname]);
  return null;
}
