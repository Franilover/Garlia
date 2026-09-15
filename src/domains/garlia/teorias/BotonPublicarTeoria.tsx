"use client";
import { BookMarked } from "lucide-react";
import React from "react";

import { Btn } from "@/ui/Buttons";
import { useAuth } from "@/providers/AuthProvider";

interface Props {
  onClick: () => void;
  /** "sm" para meterlo en una fila de acciones ya apretada. */
  size?: "sm" | "md";
}

/**
 * Botón "Publicar teoría" de la página pública de Biblioteca > Teorías.
 * Mismo componente/variante que BotonPublicarDescubrimiento (Btn outline +
 * ícono de libro), pero abre el modal de publicación en vez de hacer un
 * toggle — acá no hay entidad existente que marcar como pública, se crea
 * contenido nuevo. Solo se muestra si hay usuario logueado (visitantes no
 * pueden publicar, según RLS de teorias_insert_propio).
 */
export function BotonPublicarTeoria({ onClick, size = "sm" }: Props) {
  const { user } = useAuth() as { user: { id: string } | null };

  if (!user) return null;

  return (
    <Btn
      icon={<BookMarked size={14} />}
      size={size}
      variant="outline"
      onClick={onClick}
    >
      Publicar teoría
    </Btn>
  );
}
