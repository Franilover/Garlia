"use client";
import { Plus } from "lucide-react";
import React from "react";

import { useAuth } from "@/providers/AuthProvider";

interface Props {
  onClick: () => void;
}

/**
 * Card "Añadir" de la grilla pública de Universo > Libros — mismo patrón
 * visual que BotonPublicarTeoria, pero visible solo para admin (a
 * diferencia de Teorías, acá no cualquier usuario puede publicar un
 * libro de conocimiento).
 */
export function BotonAnadirLibro({ onClick }: Props) {
  const { isAdmin } = useAuth() as { isAdmin: boolean };

  if (!isAdmin) return null;

  return (
    <button
      aria-label="Añadir libro"
      type="button"
      className="relative flex flex-col items-center justify-center gap-1.5 p-3 min-h-[132px] transition-colors"
      style={{
        borderRadius: "var(--radius-btn)",
        border:
          "var(--border-width) dashed color-mix(in srgb, var(--primary) 20%, transparent)",
        background: "color-mix(in srgb, var(--primary) 3%, transparent)",
      }}
      onClick={onClick}
    >
      <Plus
        size={22}
        style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}
      />
      <span
        className="text-micro font-black uppercase tracking-tight"
        style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
      >
        Añadir
      </span>
    </button>
  );
}
