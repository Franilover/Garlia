"use client";
import { BookMarked, BookX } from "lucide-react";
import React from "react";

import { Btn } from "@/ui/Buttons";

import { usePublicarDescubrimiento } from "./usePublicarDescubrimiento";
import type { TipoEntidadPublicable } from "./types";

interface Props {
  tipo: TipoEntidadPublicable;
  entidadId: string | null | undefined;
  /** "sm" para meterlo en una fila de acciones ya apretada (ej. header de editor). */
  size?: "sm" | "md";
}

/**
 * Botón de un solo toggle: agrega/quita la entidad de
 * `descubrimientos_publicos`. Pensado para pegar dentro de cada editor
 * admin (EditorCriatura, ElementoEditor, ItemEditor, MaterialesPage,
 * BiomaEditor, EcosistemaEditor, EditorReino...) — no hace nada si no hay
 * `entidadId` (entidad todavía sin guardar).
 */
export function BotonPublicarDescubrimiento({
  tipo,
  entidadId,
  size = "sm",
}: Props) {
  const { publico, loading, working, toggle } = usePublicarDescubrimiento(
    tipo,
    entidadId,
  );

  if (!entidadId) return null;

  return (
    <Btn
      disabled={loading}
      loading={working}
      size={size}
      variant={publico ? "ghost" : "outline"}
      icon={publico ? <BookX size={14} /> : <BookMarked size={14} />}
      onClick={toggle}
    >
      {publico ? "Quitar de Biblioteca" : "Publicar en Biblioteca"}
    </Btn>
  );
}
