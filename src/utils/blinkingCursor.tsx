"use client";

import { useEffect, useState } from "react";

export default function BlinkingCursor() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setVisible((v) => !v), 500);
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
