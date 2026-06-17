"use client";

import { useEffect } from "react";
import { useCommandPalette } from "./useCommandPalette";

export function CommandPaletteListener() {
  const { setOpen } = useCommandPalette();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "ñ") {
        e.preventDefault();
        e.stopPropagation();
        setOpen((prev: boolean) => !prev);
      }
    };
    document.addEventListener("keydown", handler, true); // capture phase
    return () => document.removeEventListener("keydown", handler, true);
  }, [setOpen]);

  return null;
}