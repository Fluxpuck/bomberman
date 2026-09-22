"use client";

import { toPng } from "html-to-image";
import { useState } from "react";

/**
 * Renders the artboard element with the given DOM id to a PNG and triggers a
 * browser download. `name` becomes the filename (`<name>.png`); `label` is
 * the button text.
 */
export function DownloadPng({
  targetId,
  name,
  label,
}: {
  targetId: string;
  name: string;
  label: string;
}) {
  const [busy, setBusy] = useState(false);

  async function onDownload() {
    const node = document.getElementById(targetId);
    if (!node || busy) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(node, { pixelRatio: 1 });
      const link = document.createElement("a");
      link.download = `${name}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onDownload}
      disabled={busy}
      style={{
        fontFamily: "var(--font-mono), 'JetBrains Mono', monospace",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".12em",
        color: busy ? "#7f9bc4" : "#0a1120",
        background: busy ? "rgba(255,206,61,.25)" : "#ffce3d",
        border: "none",
        borderRadius: 6,
        padding: "6px 12px",
        cursor: busy ? "wait" : "pointer",
      }}
    >
      {busy ? "RENDERING…" : `↓ ${label}`}
    </button>
  );
}
