"use client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import React from "react";

import { EmptyState, PageHeader } from "@/ui";

import { getSeccionBiblioteca } from "./secciones";

interface Props {
  /** Slug de la sección, tal cual está en SECCIONES_BIBLIOTECA. */
  slug: string;
  /** Contenido real de la sección. Si no viene, se muestra el placeholder. */
  children?: React.ReactNode;
}

/**
 * Plantilla común de las páginas de la Biblioteca.
 *
 * Por ahora es sólo el cascarón: header + estado vacío. Cuando cada sección
 * tenga su data pública, se le pasa como `children` y el placeholder
 * desaparece solo.
 *
 * Todo lo que se renderice acá adentro tiene que venir ya filtrado por el
 * flag de "público" — esta plantilla NO consulta nada del panel admin.
 */
export default function PaginaBibliotecaPlantilla({ slug, children }: Props) {
  const seccion = getSeccionBiblioteca(slug);

  if (!seccion) {
    return (
      <div className="p-6 md:p-10">
        <EmptyState label="Sección no encontrada" />
      </div>
    );
  }

  const { titulo, descripcion, icon: Icon } = seccion;

  return (
    <div className="p-6 md:p-10 pb-24 md:pb-10 max-w-5xl mx-auto">
      <Link
        className="inline-flex items-center gap-2 mb-6 text-micro font-black uppercase tracking-widest italic transition-colors"
        href="/garlia/biblioteca"
        style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
      >
        <ArrowLeft size={14} />
        Biblioteca
      </Link>

      <PageHeader
        icon={<Icon size={26} />}
        subtitle={descripcion}
        title={titulo}
      />

      {children ?? (
        <EmptyState
          icon={<Icon size={40} />}
          label="Todavía no hay nada publicado acá"
        />
      )}
    </div>
  );
}
