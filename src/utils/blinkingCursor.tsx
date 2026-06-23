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
        width: "8px",
        height: "calc(var(--lcars-title-size) - 6px)",
        background: visible ? "var(--lcars-amber)" : "transparent",
        verticalAlign: "text-bottom",
        marginLeft: "4px",
        marginTop: "9px",
      }}
    />
  );
}
