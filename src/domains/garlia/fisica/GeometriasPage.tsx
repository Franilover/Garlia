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
import React, { useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "@/infra/supabase/supabase";
import { FilaAsimetrica } from "@/domains/garlia/_shared/FilaAsimetrica";
import { TituloCategoria } from "@/domains/garlia/_shared/TituloCategoria";

import {
  useFormasGeometricas,
  useGeometriaVariables,
  useLeyesGeometricas,
} from "@/domains/garlia/elementos/useGeometriaCatalogo";
import {
  CONFIG_FORMAS_GEOMETRICAS,
  CONFIG_GEOMETRIA_VARIABLES,
  CONFIG_LEYES_GEOMETRICAS,
  type FormaGeometrica,
} from "@/domains/garlia/elementos/types";

/**
 * Cuenta cuántas columnas de `minColWidth`px (+ `gap`px entre ellas) caben en
 * el ancho actual del contenedor referenciado. Mismo helper que en
 * ProcesosPage.tsx/MaterialesPage.tsx — replicado acá para el mismo diseño.
 */
function useResponsiveColumnCount(
  ref: React.RefObject<HTMLElement | null>,
  minColWidth: number,
  gap: number,
): number {
  const [columnas, setColumnas] = useState(3);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const calcular = (ancho: number) => {
      const n = Math.max(1, Math.floor((ancho + gap) / (minColWidth + gap)));
      setColumnas(n);
    };

    calcular(el.getBoundingClientRect().width);

    const observer = new ResizeObserver((entries) => {
      const ancho = entries[0]?.contentRect.width;
      if (ancho != null) calcular(ancho);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, minColWidth, gap]);

  return columnas;
}

/**
 * Reparte una lista de secciones en `numColumnas` columnas con un algoritmo
 * greedy (cada sección va a la columna con menor "altura" acumulada) — evita
 * los huecos grandes que dejaría CSS columns/grid auto-fit con grupos de
 * tamaños dispares. Mismo helper que en ProcesosPage/MaterialesPage.
 */
function distribuirEnColumnas<T>(
  secciones: T[],
  numColumnas: number,
  getPeso: (s: T) => number,
): T[][] {
  const columnas: T[][] = Array.from({ length: numColumnas }, () => []);
  const alturas = new Array(numColumnas).fill(0);
  const OVERHEAD = 2;

  for (const seccion of secciones) {
    let colMenor = 0;
    for (let i = 1; i < numColumnas; i++) {
      if (alturas[i] < alturas[colMenor]) colMenor = i;
    }
    columnas[colMenor].push(seccion);
    alturas[colMenor] += getPeso(seccion) + OVERHEAD;
  }

  return columnas;
}

/** Casilla de una Forma en el grid tipo tabla periódica — mismo lenguaje
 *  visual que ProcesoCasilla/MaterialCasilla (tarjeta de grilla con bordes
 *  compartidos, sin fondo, sin rounded), en vez de la pill suelta que
 *  tenía antes. Forma no tiene un "símbolo" corto propio, así que el
 *  nombre ocupa el lugar central, igual que en ProcesoCasilla. */
function FormaCasilla({ forma }: { forma: FormaGeometrica }) {
  return (
    <button
      type="button"
      title={forma.descripcion ?? forma.nombre}
      className="group flex flex-col items-center justify-center gap-0.5 p-1.5 border-r border-b border-primary/10 transition-colors text-center hover:bg-primary/5"
    >
      <span className="text-sm font-black leading-tight text-primary/70 line-clamp-2">
        {forma.nombre}
      </span>
    </button>
  );
}

/** Exportado para reusar como `contenido` del cuarto grid "Geometrías" en
 *  Química (ver ElementosPage.tsx) — mismo listado, sin repetir el fila
 *  Formas/Variables/Leyes completa dentro de una celda.
 *
 * Mismo lenguaje visual que ProcesosPage/MaterialesPage: grid tipo
 * "biblioteca" con columnas responsivas tipo mampostería y casillas
 * estilo tabla periódica (en vez de las pills en flex-wrap que tenía
 * antes), para que Geometrías se vea consistente con esas secciones.
 * Formas no tiene un campo "categoría" propio para subdividir, así que
 * todo el catálogo va en un único grupo dentro del mismo layout. */
export function ListaFormas() {
  const { items, loading } = useFormasGeometricas();
  const mampContainerRef = useRef<HTMLDivElement>(null);
  const numColumnas = useResponsiveColumnCount(mampContainerRef, 260, 16);
  const grupoUnico = useMemo(
    () => (items.length > 0 ? [{ id: "__todas__", nombre: "Formas", items }] : []),
    [items],
  );
  const columnasDeGrupos = useMemo(
    () => distribuirEnColumnas(grupoUnico, numColumnas, (g) => g.items.length),
    [grupoUnico, numColumnas],
  );

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 p-3 text-micro text-primary/40">
        <Loader2 className="h-3 w-3 animate-spin" /> Cargando…
      </div>
    );
  }

  return (
    <div ref={mampContainerRef} className="flex w-full items-start gap-4">
      {columnasDeGrupos.map((columna, colIdx) => (
        <div key={colIdx} className="flex min-w-0 flex-1 flex-col">
          {columna.map((grupo) => (
            <div key={grupo.id} className="mb-4">
              <TituloCategoria titulo={grupo.nombre} total={grupo.items.length} />
              <div
                className="grid gap-0 border-t border-l border-primary/10"
                style={{ gridTemplateColumns: "repeat(auto-fill, minmax(68px, 1fr))" }}
              >
                {grupo.items.map((forma) => (
                  <FormaCasilla key={forma.id} forma={forma} />
                ))}
              </div>
            </div>
          ))}
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
