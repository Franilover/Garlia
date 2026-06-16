"use client";

import { useEffect } from "react";
import { useCommandPalette } from "./useCommandPalette";

export function GlobalCommandPalette() {
  const { open, setOpen } = useCommandPalette();

  useEffect(() => {
    console.log("[GlobalCommandPalette] montado ✓");
  }, []);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={() => setOpen(false)}
    >
      <div style={{ background: "white", padding: 32, borderRadius: 12, color: "black" }}>
        <p style={{ fontWeight: "bold", fontSize: 18 }}>✅ La paleta funciona</p>
        <p style={{ marginTop: 8, opacity: 0.6 }}>Hacé click afuera para cerrar</p>
      </div>
    </div>
  );
}