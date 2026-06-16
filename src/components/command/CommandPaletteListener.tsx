"use client";

import { useEffect } from "react";
import { useCommandPalette } from "./useCommandPalette";

/**
 * Componente ultra-liviano que solo registra el listener Ctrl+K.
 * No tiene dependencias de auth, theme, dexie ni supabase.
 * Se monta inmediatamente en el cliente sin riesgo de crash.
 */
export function CommandPaletteListener() {
  const { setOpen } = useCommandPalette();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev: boolean) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [setOpen]);

  return null; // no renderiza nada
}
