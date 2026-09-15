"use client";
import { Plus } from "lucide-react";
import React from "react";

import { useAuth } from "@/providers/AuthProvider";

interface Props {
  onClick: () => void;
}

/**
 * Card "Añadir" de la grilla pública de Biblioteca > Teorías — mismo
 * diseño exacto que la card "Añadir" de DescubrimientosPage (cuadrado
 * dashed, + al centro, label abajo), pero visible para cualquier usuario
 * logueado (no solo admin), ya que acá cualquiera puede publicar según
 * RLS de teorias_insert_propio. Visitantes sin sesión no la ven.
 */
export function BotonPublicarTeoria({ onClick }: Props) {
  const { user } = useAuth() as { user: { id: string } | null };

  if (!user) return null;

  return (
    <button
      aria-label="Publicar teoría"
      type="button"
      className="relative flex flex-col items-center justify-center gap-1.5 p-2 aspect-square transition-colors"
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
