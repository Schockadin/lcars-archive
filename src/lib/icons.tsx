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
export function BanIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="8" />
      <path d="M6.5 6.5l11 11" />
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
export function KeyIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="8" cy="15" r="4.5" />
      <path d="M11.2 11.8 20 3" />
      <path d="M15.5 7.5 18 10" />
      <path d="M18 4.5 20.5 7" />
    </svg>
  );
}
export function LogOutIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
      <path d="M15 8l4 4-4 4" />
      <path d="M19 12H9" />
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
      <path d="M12 3c3 1.5 5 4.5 5 8 0 2.4-1 4.3-2 5.5H9c-1-1.2-2-3.1-2-5.5 0-3.5 2-6.5 5-8Z" />
      <circle cx="12" cy="10" r="1.8" />
      <path d="M9 16.5 6.5 20M15 16.5 17.5 20" />
    </svg>
  );
}
export function ArchiveNavIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
      <path d="M10 12h4" />
    </svg>
  );
}
export function TimelineNavIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M5 4v16" />
      <circle cx="5" cy="8" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="5" cy="16" r="1.6" fill="currentColor" stroke="none" />
      <path d="M8 8h11M8 16h11" />
    </svg>
  );
}
