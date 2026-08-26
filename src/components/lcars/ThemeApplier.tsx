"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  DEFAULT_THEME_ID,
  THEME_COOKIE_NAME,
  THEME_CUSTOM_COOKIE_NAME,
  THEME_TOKENS,
  decodeThemeOverrides,
} from "@/lib/themes";
import { UI_MODE_COOKIE_NAME, UI_MODE_MINIMAL } from "@/lib/uiMode";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(
    new RegExp("(?:^|; )" + name + "=([^;]+)"),
  );
  return m ? decodeURIComponent(m[1]) : null;
}

// Wendet Farbtheme + Individualisierung aus den Cookies auf <html> an — dieselbe
// Logik wie das Pre-Paint-Init-Skript in src/app/layout.tsx, nur clientseitig
// bei jedem Routenwechsel. Nötig, weil das Init-Skript nur bei einem echten
// Full-Load läuft: nach dem Login (Soft-Navigation via redirect()) und nach dem
// Logout greift sonst kein Theme, bis manuell neu geladen wird.
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
  for (const { id } of THEME_TOKENS) {
    const hex = overrides[id];
    if (hex) {
      root.style.setProperty(`--lcars-${id}`, hex);
      root.style.setProperty(`--color-lcars-${id}`, hex);
    } else {
      root.style.removeProperty(`--lcars-${id}`);
      root.style.removeProperty(`--color-lcars-${id}`);
    }
  }

  // UI-Modus (LCARS vs. minimal) analog zum Farbtheme aus dem Cookie ziehen.
  if (readCookie(UI_MODE_COOKIE_NAME) === UI_MODE_MINIMAL) {
    root.setAttribute("data-ui", UI_MODE_MINIMAL);
  } else {
    root.removeAttribute("data-ui");
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
