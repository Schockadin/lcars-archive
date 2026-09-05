export const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function BoldIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M7 4v16M7 4h5a3.5 3.5 0 0 1 0 7H7M7 11h6a3.5 3.5 0 0 1 0 7H7" />
    </svg>
  );
}
export function ItalicIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M10 4h6M8 20h6M14 4l-4 16" />
    </svg>
  );
}
export function HeadingIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M6 4v16M18 4v16M6 12h12" />
    </svg>
  );
}
export function LinkIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M11,14.52a5.72,5.72,0,0,1-.82-.67h0A5.72,5.72,0,0,1,9.48,13,5.67,5.67,0,0,1,9,12.12a5.63,5.63,0,0,1-.28-1,4.78,4.78,0,0,1-.1-1,4.85,4.85,0,0,1,.1-1,5,5,0,0,1,.76-1.87,5.22,5.22,0,0,1,.67-.82l.37-.37.37-.37.37-.37L11.63,5,12,4.61l.37-.37.37-.37.37-.37a4.72,4.72,0,0,1,.82-.67,5.27,5.27,0,0,1,.91-.48,5.42,5.42,0,0,1,1-.29,5.55,5.55,0,0,1,2,0,5.42,5.42,0,0,1,1,.29,5.27,5.27,0,0,1,.91.48,5.12,5.12,0,0,1,.82.67h0a5.12,5.12,0,0,1,.67.82,5.27,5.27,0,0,1,.48.91,5.42,5.42,0,0,1,.29,1,5.55,5.55,0,0,1,0,2,5.42,5.42,0,0,1-.29,1,5.27,5.27,0,0,1-.48.91,4.72,4.72,0,0,1-.67.82l-.37.37-.37.37-.37.37-.37.37"></path>
      <path d="M13,9.48a5.72,5.72,0,0,1,.82.67h0a5.72,5.72,0,0,1,.67.82,5,5,0,0,1,.76,1.88,4.78,4.78,0,0,1,.1,1,4.85,4.85,0,0,1-.1,1,5,5,0,0,1-.76,1.87,5.22,5.22,0,0,1-.67.82l-.37.37-.37.37-.37.37-.37.37-.37.37-.37.37-.37.37-.37.37a4.72,4.72,0,0,1-.82.67,5.27,5.27,0,0,1-.91.48,5.42,5.42,0,0,1-1,.29,5.55,5.55,0,0,1-2,0,5.42,5.42,0,0,1-1-.29,5.27,5.27,0,0,1-.91-.48,5.12,5.12,0,0,1-.82-.67h0a5.12,5.12,0,0,1-.67-.82,5.27,5.27,0,0,1-.48-.91,5.42,5.42,0,0,1-.29-1,5.55,5.55,0,0,1,0-2,5.42,5.42,0,0,1,.29-1,5.27,5.27,0,0,1,.48-.91,4.72,4.72,0,0,1,.67-.82l.37-.37.37-.37L4.61,12,5,11.63"></path>
    </svg>
  );
}
export function UnlinkIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M15,17h2A5,5,0,0,0,17,7H15"></path>
      <path d="M9,7H7A5,5,0,0,0,7,17H9"></path>
      <line x1="7" y1="12" x2="18" y2="12"></line>
    </svg>
  );
}

export function ListIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
export function OrderedListIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <text x="1.5" y="8.5" fontSize="7" fill="currentColor" stroke="none">
        1
      </text>
      <text x="1.5" y="14.5" fontSize="7" fill="currentColor" stroke="none">
        2
      </text>
      <text x="1.5" y="20.5" fontSize="7" fill="currentColor" stroke="none">
        3
      </text>
    </svg>
  );
}
export function QuoteIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M4 5v14M9 8h11M9 12h11M9 16h7" />
    </svg>
  );
}
export function CodeIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M8 6 2 12l6 6M16 6l6 6-6 6" />
    </svg>
  );
}

// Gemeinsame Grundform für Bookmark/Unbookmark — die beiden unterscheiden
// sich nur durch die vertikale Linie des Plus-Zeichens (Bookmark hinzufügen
// vs. bereits gesetzt/entfernen), sonst identisches Lesezeichen-Symbol.
function BookmarkGlyph({ plus }: { plus: boolean }) {
  return (
    <svg {...ICON_PROPS}>
      <g>
        <polygon points="20 22 12 16 4 22 4 2 20 2 20 22"></polygon>
        {plus && <line x1="12" y1="6" x2="12" y2="12"></line>}
        <line x1="15" y1="9" x2="9" y2="9"></line>
      </g>
    </svg>
  );
}

export function BookmarkIcon() {
  return <BookmarkGlyph plus />;
}

export function UnbookmarkIcon() {
  return <BookmarkGlyph plus={false} />;
}

export function SubscribeIcon() {
  return (
    <svg {...ICON_PROPS}>
      <g>
        <path d="M19,14l2,4H3l2-4V9.29A7.2,7.2,0,0,1,11.78,2,7,7,0,0,1,19,9Z"></path>
        <path d="M16,18a4,4,0,1,1-8,0"></path>
      </g>
    </svg>
  );
}

export function UnsubscribeIcon() {
  return (
    <svg {...ICON_PROPS}>
      <g>
        <path d="M18,18H3l.12-.25.13-.25.13-.25L3.5,17l.12-.25.13-.25.13-.25L4,16l.12-.25.13-.25.13-.25L4.5,15l.12-.25.13-.25.13-.25L5,14V9.29c0-.24,0-.47,0-.71s.06-.47.1-.7.1-.45.17-.67.14-.44.22-.66.18-.42.28-.62"></path>
        <path d="M8.51,3c.2-.11.39-.22.6-.32a5.93,5.93,0,0,1,.63-.26c.21-.08.43-.14.65-.2s.46-.1.69-.13.47-.05.7-.06.5,0,.74,0,.48,0,.71.09a5,5,0,0,1,.69.16,6.38,6.38,0,0,1,.66.22,6,6,0,0,1,.63.29,5.88,5.88,0,0,1,.6.35c.19.12.38.26.56.4s.35.29.51.45.32.33.47.5.28.36.41.54.25.39.36.59a5.12,5.12,0,0,1,.31.62c.09.21.17.43.24.65s.13.45.18.68a5.81,5.81,0,0,1,.11.71A5.85,5.85,0,0,1,19,9v4"></path>
        <path d="M16,18a4,4,0,1,1-8,0"></path>
        <line x1="2" y1="2" x2="22" y2="22"></line>
      </g>
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}
export function XIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
export function PencilIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M16.86 4.49a2.1 2.1 0 1 1 2.97 2.97L7.5 19.79l-4 1 1-4L16.86 4.49Z" />
    </svg>
  );
}
export function RestoreIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M4 4v5h5M4.6 15a8 8 0 1 0 1-9.4L4 9" />
    </svg>
  );
}
export function PlusIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
export function ShareIcon() {
  return (
    <svg {...ICON_PROPS} fill="currentColor" stroke="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.75 4.5H5.25V18.75H19.5V20.25H3.75V4.5ZM17.6515 8.25001L15.2196 5.81812L16.2803 4.75746L20.4851 8.96229L16.2803 13.1671L15.2196 12.1065L17.5761 9.75001L14.25 9.75C11.7647 9.75 9.75 11.7647 9.75 14.25V16.5H8.25V14.25C8.25 10.9363 10.9363 8.25 14.25 8.25L17.6515 8.25001Z"
      />
    </svg>
  );
}
// Kleines Minus im Kreis — Entfernen einer einzelnen Zeile (Talent-Liste des
// Charakterbogens). Bewusst kein Papierkorb: es wird kein Inhalt gelöscht,
// sondern nur ein Eintrag aus einer Liste genommen.
export function MinusCircleIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="8" />
      <path d="M8.5 12h7" />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M6 7h12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
    </svg>
  );
}

// Sortier-Pfeil (SortSwitch.tsx) — zeigt per Default aufsteigend (nach oben);
// für absteigend wird das SVG vom Aufrufer um 180° gedreht statt ein
// zweites Icon zu pflegen.
export function SortArrowIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  );
}

// Zurück/Weiter-Navigation (MarkdownImportPanel.tsx — Vorschau-Karussell).
export function ChevronLeftIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}
export function ChevronRightIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

// DB-Backup-Panel (lokaler Export/Import, siehe DbBackupPanel.tsx/UserBackupPanel.tsx).
export function DownloadIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M4 19h16" />
    </svg>
  );
}
// Drucker — „Drucken" im Vorschau-Fenster des Charakterbogens.
export function PrinterIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M7 9V3h10v6" />
      <path d="M5 9h14a2 2 0 0 1 2 2v5h-4" />
      <path d="M3 16v-5a2 2 0 0 1 2-2" />
      <path d="M7 14h10v7H7z" />
    </svg>
  );
}

// Blatt mit Zeilen — der Charakterbogen (Werte) auf der Charakterseite.
export function FileTextIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
      <path d="M9 12h6M9 16h6" />
    </svg>
  );
}
export function UploadIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M12 15V3M7 8l5-5 5 5" />
      <path d="M4 19h16" />
    </svg>
  );
}
export function CloudIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M7 18a4.5 4.5 0 0 1-.4-8.98A5.5 5.5 0 0 1 17.4 8.1 4 4 0 0 1 17 18H7Z" />
    </svg>
  );
}
export function ImageIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M21 16l-5.5-5.5a2 2 0 0 0-2.8 0L4 19" />
    </svg>
  );
}
export function PortraitIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <circle cx="12" cy="10" r="3" />
      <path d="M7 18c0-2.8 2.2-4.5 5-4.5s5 1.7 5 4.5" />
    </svg>
  );
}
export function CopyIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

// Charakterwerte (Schritt „Werte" des Anlege-Assistenten) — Balken
// unterschiedlicher Höhe, wie die Wertekästen von Attributen und
// Disziplinen.
export function StatsIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M5 20V11M12 20V4M19 20v-6" />
      <path d="M3 20h18" />
    </svg>
  );
}

// Passwort-Sichtbarkeits-Umschalter (PasswordInput.tsx).
export function EyeIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
export function EyeOffIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M10.6 6.2A9.9 9.9 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.6 3.4M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.9 9.9 0 0 0 4-.8" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

// Haupt-Navigation (SidebarMenu.tsx) — auf schmalen Screens wird der
// Menütext ausgeblendet, sodass sonst nur die kryptische Nummer (00–04)
// bliebe. Diese Icons machen die Ziele dort wiedererkennbar.
export function HomeNavIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 10v9h12v-9" />
      <path d="M10 19v-5h4v5" />
    </svg>
  );
}
export function CharactersNavIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M16 6a3 3 0 0 1 0 6" />
      <path d="M17.5 14c2.2.5 3.5 2.3 3.5 5" />
    </svg>
  );
}
export function MissionsNavIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M4 19.5V6a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 0 4 19.5Z" />
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    </svg>
  );
}
// Datenbank-Zylinder (Menüpunkt „Datenbank", früher „Archiv" mit Kisten-Icon).
// Bewusst in der Strichführung der übrigen Nav-Icons gezeichnet (24er-Raster,
// currentColor, siehe ICON_PROPS) statt ein fremdes SVG einzusetzen — so
// bleibt das Menü einheitlich und ohne Fremdlizenz im Repo.
export function DatabaseNavIcon() {
  return (
    <svg {...ICON_PROPS}>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
      <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
    </svg>
  );
}
// Lupe — Menü-Icon für die Suche (siehe MAIN_NAV/SidebarMenu.tsx).
export function SearchNavIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4.2-4.2" />
    </svg>
  );
}

// Zeitstrahl — Menü-Icon der Chronologie (siehe MAIN_NAV/SidebarMenu.tsx).
// Eine Linie mit drei Ereignispunkten: dasselbe Bild, das die Seite selbst
// zeichnet (Schiene mit Punkten, siehe timeline.css).
export function TimelineNavIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M4 12h16" />
      <circle cx="8" cy="12" r="2" />
      <circle cx="14" cy="12" r="2" />
      <path d="M8 12V6M14 12v6" />
    </svg>
  );
}

// --- Nav-Icons für die Header-Menüpunkte (im minimalistischen UI in der
// Sidebar; nur auf Mobile als reine Icons sichtbar, siehe minimal-ui.css). ---

export function ContentNavIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M5 4h9l5 5v11H5z" />
      <path d="M14 4v5h5" />
      <path d="M8 13h7" />
      <path d="M8 16h7" />
    </svg>
  );
}

export function ProfileNavIcon() {
  // Gefülltes Icon (currentColor) — bewusst NICHT ICON_PROPS (die erzwingen
  // fill:none + viewBox 24). Größe steuert das CSS (.lcars-menu-icon svg /
  // .lcars-usernav-icon svg).
  return (
    <svg viewBox="0 0 1920 1920" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="m1739.34 1293.414-105.827 180.818-240.225-80.188-24.509 22.25c-69.91 63.586-150.211 109.666-238.644 136.771l-32.076 9.94-49.468 244.065H835.584l-49.468-244.179-32.076-9.939c-88.432-27.105-168.734-73.185-238.644-136.771l-24.508-22.25-240.226 80.189-105.826-180.82 189.74-164.442-7.453-32.978c-10.39-45.742-15.586-91.483-15.586-135.869 0-44.386 5.195-90.127 15.586-135.868l7.454-32.979-189.741-164.442 105.826-180.819 240.226 80.075 24.508-22.25c69.91-63.585 150.212-109.665 238.644-136.884l32.076-9.826 49.468-244.066h213.007l49.468 244.18 32.076 9.825c88.433 27.219 168.734 73.186 238.644 136.885l24.509 22.25 240.225-80.189 105.826 180.819-189.74 164.442 7.453 32.98c10.39 45.74 15.586 91.481 15.586 135.867 0 44.386-5.195 90.127-15.586 135.869l-7.454 32.978 189.741 164.556Zm-53.76-333.403c0-41.788-3.84-84.48-11.634-127.284l210.184-182.062-199.454-340.856-265.186 88.433c-66.974-55.567-143.322-99.388-223.85-128.414L1140.977.01H743.198l-54.663 269.704c-81.431 29.139-156.424 72.282-223.963 128.414L199.5 309.809.045 650.665l210.07 182.062c-7.68 42.804-11.52 85.496-11.52 127.284 0 41.789 3.84 84.48 11.52 127.172L.046 1269.357 199.5 1610.214l265.186-88.546c66.974 55.68 143.323 99.388 223.85 128.527l54.663 269.816h397.779l54.663-269.703c81.318-29.252 156.424-72.283 223.85-128.527l265.186 88.546 199.454-340.857-210.184-182.174c7.793-42.805 11.633-85.496 11.633-127.285ZM942.075 564.706C724.1 564.706 546.782 742.024 546.782 960c0 217.976 177.318 395.294 395.294 395.294 217.977 0 395.294-177.318 395.294-395.294 0-217.976-177.317-395.294-395.294-395.294m0 677.647c-155.633 0-282.353-126.72-282.353-282.353s126.72-282.353 282.353-282.353S1224.43 804.367 1224.43 960s-126.72 282.353-282.353 282.353"
      />
    </svg>
  );
}

// Eigene Charaktere (/user/characters) — Personalakte statt Personengruppe:
// unterscheidet den User-Menüpunkt eindeutig vom allgemeinen „Charaktere"
// (CharactersNavIcon), das alle Charaktere des Archivs meint.
export function MyCharactersNavIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M9.5 3h5" />
      <circle cx="12" cy="10" r="2.4" />
      <path d="M8 17.5c0-2.2 1.8-3.4 4-3.4s4 1.2 4 3.4" />
    </svg>
  );
}

export function AdminNavIcon() {
  // Gefülltes Icon (currentColor) — siehe ProfileNavIcon.
  return (
    <svg viewBox="0 0 1920 1920" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="m773.596 1069.654 711.086 711.085c39.632 39.632 104.336 39.632 144.078 0l138.276-138.385c19.268-19.269 29.888-44.778 29.888-71.93 0-27.26-10.62-52.77-29.888-72.039l-698.714-698.714 11.495-32.625c63.5-178.675 18.284-380.45-115.284-514.018-123.715-123.605-305.126-171.01-471.648-128.313l272.281 272.282c32.516 32.406 50.362 75.652 50.362 121.744 0 45.982-17.846 89.227-50.362 121.744L654.48 751.17c-67.222 67.003-176.375 67.003-243.488 0L138.711 478.889c-42.589 166.522 4.707 347.934 128.313 471.648 123.714 123.715 306.22 172.325 476.027 127.218l30.545-8.101ZM1556.611 1920c-54.084 0-108.168-20.692-149.333-61.857L740.095 1190.96c-198.162 41.712-406.725-19.269-550.475-163.019C14.449 852.771-35.256 582.788 65.796 356.27l32.406-72.696 390.194 390.193c24.414 24.305 64.266 24.305 88.68 0l110.687-110.686c11.824-11.934 18.283-27.59 18.283-44.34 0-16.751-6.46-32.516-18.283-44.34L297.569 84.207 370.265 51.8C596.893-49.252 866.875.453 1041.937 175.515c155.026 155.136 212.833 385.157 151.851 594.815l650.651 650.651c39.961 39.852 61.967 92.95 61.967 149.443 0 56.383-22.006 109.482-61.967 149.334l-138.275 138.385c-41.275 41.165-95.36 61.857-149.553 61.857Z"
      />
    </svg>
  );
}

// Spielleitungs-Menü: Würfel mit drei Augen — das Werkzeug der Runde, klar
// unterscheidbar vom Schraubenschlüssel des Admin-Menüs.
export function GmNavIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
      <circle cx="8" cy="8" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="16" cy="16" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Vergrößern/Vollbild — vier nach außen zeigende Ecken (Charakterbogen).
export function ExpandIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M9 4H4v5M15 4h5v5M15 20h5v-5M9 20H4v-5" />
    </svg>
  );
}

export function LogoutNavIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M14 4h4v16h-4" />
      <path d="M10 8l-4 4 4 4" />
      <path d="M6 12h9" />
    </svg>
  );
}

export function LoginNavIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M10 4H6v16h4" />
      <path d="M14 8l4 4-4 4" />
      <path d="M18 12H9" />
    </svg>
  );
}
