"use client";

/**
 * GeometriasPage.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Sub-sección "Física → Geometrías" (pedido 2026-09-09): hace visible el
 * catálogo físico global que hoy solo se veía indirectamente al abrir una
 * Estructura — Formas / Variables / Leyes, cada una en su columna con el
 * mismo título clicable (Añadir/Editar → renombrar/borrar) que ya usan
 * Compuestos/Estructuras/Materiales/Elementos (ver
 * _shared/CabeceraSeccionConMenu.tsx).
 *
 * Dónde cuelga esto en el menú: este archivo es autocontenido (fetch propio,
 * sin depender de la navegación de nivel superior), porque esa navegación
 * (el sidebar/tabs "Física / Elementos / Runas / ...") vive fuera de
 * domains/garlia/ en un layout compartido que no está en este paquete. Para
 * agregarlo como hijo de "Física" en tu sidebar real, el patrón mínimo es
 * agregar una entrada de sub-tab que renderice <GeometriasPage /> — mismo
 * lugar de donde hoy se renderiza <FisicaPage />.
 *
 * Formas/Variables/Leyes son catálogos "canónicos" (poblados por
 * documentación/migración del sistema físico). 2026-09-09: se agregó
 * "Añadir" al título de Formas (crearForma en useGeometriaCatalogo.ts,
 * mismo patrón que crearEstructura/crearMaterial) para poder crear Formas
 * nuevas a mano desde el panel admin — Variables y Leyes siguen siendo
 * solo renombrar/borrar, sin insert propio todavía.
 */

import { Loader2 } from "lucide-react";
import React, { useState } from "react";

import { supabase } from "@/infra/supabase/supabase";
import { FilaAsimetrica } from "@/domains/garlia/_shared/FilaAsimetrica";

import {
  useFormasGeometricas,
  useGeometriaVariables,
  useLeyesGeometricas,
} from "@/domains/garlia/elementos/useGeometriaCatalogo";
import {
  CONFIG_FORMAS_GEOMETRICAS,
  CONFIG_GEOMETRIA_VARIABLES,
  CONFIG_LEYES_GEOMETRICAS,
} from "@/domains/garlia/elementos/types";

/** Exportado para reusar como `contenido` del cuarto grid "Geometrías" en
 *  Química (ver ElementosPage.tsx) — mismo listado, sin repetir el fila
 *  Formas/Variables/Leyes completa dentro de una celda.
 *
 * Mismo diseño pill que CompuestoCasilla/MaterialPill/ChipGrupoEstructuras
 * (chip compacto rounded-full, px-2.5 py-1, text-micro font-bold
 * tracking-wide) en vez de filas de texto — para que las 4 celdas del grid
 * de Química se vean consistentes entre sí. Sin estado seleccionado (acá
 * no abre un panel de detalle, es solo el catálogo de Formas). */
export function ListaFormas() {
  const { items, loading } = useFormasGeometricas();
  if (loading) {
    return (
      <div className="flex items-center gap-1.5 p-3 text-micro text-primary/40">
        <Loader2 className="h-3 w-3 animate-spin" /> Cargando…
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-1 p-2">
      {items.map((f) => (
        <button
          key={f.id}
          type="button"
          title={f.descripcion ?? f.nombre}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-micro font-bold tracking-wide transition-colors truncate max-w-full hover:bg-primary/10 text-primary/70 border border-primary/15"
        >
          <span className="truncate">{f.nombre}</span>
        </button>
      ))}
    </div>
  );
}

function ListaVariables() {
  const { items, loading } = useGeometriaVariables();
  if (loading) {
    return (
      <div className="flex items-center gap-1.5 p-3 text-micro text-primary/40">
        <Loader2 className="h-3 w-3 animate-spin" /> Cargando…
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1 p-2">
      {items.map((v) => (
        <div key={v.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-primary/5">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-xs font-bold text-primary/75">{v.nombre}</span>
            <span className="text-micro text-primary/40">{v.tipo}</span>
          </div>
          {v.unidad && (
            <span className="shrink-0 text-micro font-mono text-primary/40">{v.unidad}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function ListaLeyes() {
  const { items, loading } = useLeyesGeometricas();
  const { items: formas } = useFormasGeometricas();
  if (loading) {
    return (
      <div className="flex items-center gap-1.5 p-3 text-micro text-primary/40">
        <Loader2 className="h-3 w-3 animate-spin" /> Cargando…
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1 p-2">
      {items.map((l) => {
        const forma = formas.find((f) => f.id === l.forma_id);
        return (
          <div key={l.id} className="flex flex-col gap-0.5 px-2 py-1.5 rounded-md hover:bg-primary/5">
            <span className="text-xs font-bold text-primary/75">{forma?.nombre ?? "—"}</span>
            <span className="text-micro font-mono text-primary/50">{l.formula_simbolica}</span>
          </div>
        );
      })}
    </div>
  );
}

export function GeometriasPage() {
  const {
    items: formas,
    crearForma,
    renombrarForma,
    eliminarForma,
  } = useFormasGeometricas();
  const { items: variables } = useGeometriaVariables();
  const { items: leyes } = useLeyesGeometricas();
  const [creandoForma, setCreandoForma] = useState(false);

  async function handleCrearForma() {
    setCreandoForma(true);
    try {
      await crearForma();
    } finally {
      setCreandoForma(false);
    }
  }

  // Variables y Leyes siguen siendo 100% solo-lectura desde acá (sin
  // renombrarForma/eliminarForma propio en el hook todavía) — mismo patrón
  // genérico de antes solo para esas dos.
  async function renombrarFila(tabla: string, id: string, nuevoNombre: string) {
    const { error } = await supabase.from(tabla).update({ nombre: nuevoNombre }).eq("id", id);
    if (error) console.error(`[GeometriasPage] error renombrando en ${tabla}:`, error);
  }

  async function eliminarFila(tabla: string, id: string) {
    const { error } = await supabase.from(tabla).delete().eq("id", id);
    if (error) console.error(`[GeometriasPage] error eliminando en ${tabla}:`, error);
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
      <FilaAsimetrica
        bloques={[
          {
            key: "formas",
            titulo: "Formas",
            total: formas.length,
            items: formas,
            onAñadir: handleCrearForma,
            añadiendo: creandoForma,
            onRenombrar: renombrarForma,
            onEliminar: eliminarForma,
            contenido: <ListaFormas />,
          },
          {
            key: "variables",
            titulo: "Variables",
            total: variables.length,
            items: variables,
            onRenombrar: (id, nuevoNombre) =>
              renombrarFila(CONFIG_GEOMETRIA_VARIABLES.tabla, id, nuevoNombre),
            onEliminar: (id) => eliminarFila(CONFIG_GEOMETRIA_VARIABLES.tabla, id),
            contenido: <ListaVariables />,
          },
          {
            key: "leyes",
            titulo: "Leyes",
            total: leyes.length,
            // Las Leyes no tienen campo "nombre" propio (se identifican por
            // su Forma + fórmula) — sin onRenombrar, el título solo permite
            // borrar desde el modal "Editar".
            items: leyes.map((l) => ({ id: l.id, nombre: l.formula_simbolica })),
            onEliminar: (id) => eliminarFila(CONFIG_LEYES_GEOMETRICAS.tabla, id),
            contenido: <ListaLeyes />,
          },
        ]}
      />
    </div>
  );
}

export default GeometriasPage;
