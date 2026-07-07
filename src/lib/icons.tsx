export const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function BookmarkIcon() {
  return (
    <svg {...ICON_PROPS}>
      <g>
        <polygon points="20 22 12 16 4 22 4 2 20 2 20 22"></polygon>
        <line x1="12" y1="6" x2="12" y2="12"></line>
        <line x1="15" y1="9" x2="9" y2="9"></line>
      </g>
    </svg>
  );
}

export function UnbookmarkIcon() {
  return (
    <svg {...ICON_PROPS}>
      <g>
        <polygon points="20 22 12 16 4 22 4 2 20 2 20 22"></polygon>
        <line x1="15" y1="9" x2="9" y2="9"></line>
      </g>
    </svg>
  );
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
export function TrashIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M6 7h12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
    </svg>
  );
}
