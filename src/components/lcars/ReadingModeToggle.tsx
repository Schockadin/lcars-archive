"use client";
import { useEffect } from "react";
import { useNeo } from "@/hooks/useNeo";

// Umschalter für den Lesemodus. Nur auf schmalen Displays sichtbar (CSS).
// Beim Verlassen der Seite (Unmount) wird der Lesemodus zurückgesetzt, damit
// man nicht ohne sichtbare Navigation „gefangen" bleibt.
export default function ReadingModeToggle() {
  const { readingMode, toggleReadingMode, setReadingMode } = useNeo();

  useEffect(() => {
    return () => setReadingMode(false);
  }, [setReadingMode]);

  return (
    <button
      type="button"
      onClick={toggleReadingMode}
      className="reading-mode-toggle"
      aria-pressed={readingMode}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M12 6c-2.5-1.6-5-1.6-7.5-1 0 0-.5.1-.5.7v11c0 .4.4.6.7.5 2.3-.5 4.6-.4 6.8 1 2.2-1.4 4.5-1.5 6.8-1 .3.1.7-.1.7-.5v-11c0-.6-.5-.7-.5-.7-2.5-.6-5-.6-7.5 1Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M12 6v12"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      {readingMode ? "Lesemodus beenden" : "Lesemodus"}
    </button>
  );
}
