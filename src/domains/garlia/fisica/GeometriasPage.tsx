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
 * documentación/migración del sistema físico) — igual que Estructuras y
 * Materiales, el menú de título acá NO incluye "Añadir" por defecto: solo
 * renombrar/borrar. Si más adelante se quiere permitir crear formas nuevas
 * a mano, agregar el insert acá es directo (mismo patrón que
 * handleCreateCompuesto en ElementosPage.tsx).
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

function ListaFormas() {
  const { items, loading } = useFormasGeometricas();
  if (loading) {
    return (
      <div className="flex items-center gap-1.5 p-3 text-micro text-primary/40">
        <Loader2 className="h-3 w-3 animate-spin" /> Cargando…
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1 p-2">
      {items.map((f) => (
        <div key={f.id} className="flex flex-col gap-0.5 px-2 py-1.5 rounded-md hover:bg-primary/5">
          <span className="text-xs font-bold text-primary/75">{f.nombre}</span>
          {f.descripcion && (
            <span className="text-micro text-primary/40 leading-snug">{f.descripcion}</span>
          )}
          {f.parametros_requeridos.length > 0 && (
            <span className="text-micro text-primary/30">
              Parámetros: {f.parametros_requeridos.map((p) => p.clave).join(", ")}
            </span>
          )}
        </div>
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
  const { items: formas } = useFormasGeometricas();
  const { items: variables } = useGeometriaVariables();
  const { items: leyes } = useLeyesGeometricas();

  const [renombrando, setRenombrando] = useState(false);

  async function renombrarFila(tabla: string, id: string, nuevoNombre: string) {
    setRenombrando(true);
    try {
      const { error } = await supabase.from(tabla).update({ nombre: nuevoNombre }).eq("id", id);
      if (error) console.error(`[GeometriasPage] error renombrando en ${tabla}:`, error);
    } finally {
      setRenombrando(false);
    }
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
            añadiendo: renombrando,
            onRenombrar: (id, nuevoNombre) =>
              renombrarFila(CONFIG_FORMAS_GEOMETRICAS.tabla, id, nuevoNombre),
            onEliminar: (id) => eliminarFila(CONFIG_FORMAS_GEOMETRICAS.tabla, id),
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
