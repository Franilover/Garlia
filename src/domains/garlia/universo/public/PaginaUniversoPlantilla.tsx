"use client";
import React from "react";

import { getSeccionUniverso } from "./secciones";
import { UniversoTabBar } from "./menuUniverso";

interface Props {
  /** Slug de la sección, tal cual está en SECCIONES_UNIVERSO. */
  slug: string;
  /** Contenido real de la sección. Si no viene, se muestra el placeholder. */
  children?: React.ReactNode;
  /**
   * Secciones como "Mapa" o "Cuenta" traen su propio layout de pantalla
   * completa (mapa interactivo, perfil de jugador) y no deben quedar
   * encajonadas en el padding/max-w del resto de las secciones. En ese
   * caso solo se dibuja la tab bar arriba y el contenido se renderiza
   * sin el wrapper con padding.
   */
  fullBleed?: boolean;
}

/**
 * Plantilla común de las páginas del Universo.
 *
 * Minimalista y a lo ancho: barra de tabs (íconos, sin texto) + contenido
 * abajo, sin hero ni card grande — mismo criterio de densidad que el resto
 * del escritorio (auditoría, tablas de datos). Usa todo el espacio
 * horizontal disponible en vez de acotar a un `max-w`.
 *
 * Por ahora es sólo el cascarón para las secciones de solo-contenido:
 * barra + placeholder chico. Cuando cada sección tenga su data pública,
 * se le pasa como `children` y el placeholder desaparece solo.
 *
 * Todo lo que se renderice acá adentro tiene que venir ya filtrado por el
 * flag de "público" — esta plantilla NO consulta nada del panel admin.
 */
export default function PaginaUniversoPlantilla({
  slug,
  children,
  fullBleed = false,
}: Props) {
  const seccion = getSeccionUniverso(slug);

  if (fullBleed) {
    return (
      <div className="flex flex-col h-full">
        <div
          className="flex items-center justify-between gap-3 px-3 md:px-4 py-2"
          style={{
            borderBottom:
              "var(--border-width) solid color-mix(in srgb, var(--primary) 10%, transparent)",
          }}
        >
          <UniversoTabBar />
        </div>
        <div className="flex-1 min-h-0">
          {!seccion ? (
            <p
              className="text-micro font-bold uppercase tracking-widest py-8 text-center"
              style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
            >
              Sección no encontrada
            </p>
          ) : (
            children
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-4 pb-20 md:pb-4">
      <div
        className="flex items-center justify-between gap-3 pb-3 mb-3"
        style={{
          borderBottom:
            "var(--border-width) solid color-mix(in srgb, var(--primary) 10%, transparent)",
        }}
      >
        <UniversoTabBar />
      </div>

      {!seccion ? (
        <p
          className="text-micro font-bold uppercase tracking-widest py-8 text-center"
          style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
        >
          Sección no encontrada
        </p>
      ) : (
        children ?? (
          <p
            className="text-micro font-bold uppercase tracking-widest py-10 text-center"
            style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}
          >
            Nada publicado todavía
          </p>
        )
      )}
    </div>
  );
}
