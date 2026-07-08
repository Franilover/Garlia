"use client";

/**
 * GeografiaJerarquica
 * ───────────────────────────────────────────────────────────────────────────
 * Vista de "Entidades" agrupada por jerarquía real del mundo:
 *
 *   [Reino 1]
 *   [Ciudad 1]                         [Ciudad 2]
 *   [Personaje 1] [Personaje 2]        [Personaje 1] [Personaje 2]
 *
 *   [Reino 2]
 *   ...
 *
 * Cada nodo (reino / ciudad) se muestra como un botón tipo "chip" temático
 * (sin corchetes) y al hacer click abre su editor completo
 * (openEntity("reinos", id) / openEntity("ciudades", id)), que ya trae
 * adentro sus propias ciudades / personajes. Los personajes sí usan la
 * tarjeta normal (imagen + nombre) porque son la hoja del árbol.
 *
 * Relaciones usadas:
 *  - Ciudad.reino_id   → agrupa ciudades bajo su reino (obligatorio: toda
 *    ciudad pertenece a un único reino)
 *  - Personaje.ciudad_id → agrupa personajes bajo su ciudad
 *  - Personaje.reino (nombre) → si un personaje no tiene ciudad pero sí
 *    reino, se muestra dentro de ese reino bajo un slot "Sin Ciudad"
 * Las ciudades (y el slot "Sin Ciudad") de un reino se muestran en fila y
 * hacen wrap horizontal cuando no caben; los títulos largos se truncan para
 * no sobreponerse a los nodos vecinos. Solo caen en el bloque final global
 * "Sin ciudad" los personajes sin ciudad_id y sin reino válido asociado.
 */

import { Plus, Users } from "lucide-react";
import React, { useLayoutEffect, useRef, useState } from "react";

import { EntityCard } from "./EntityCard";
import type { SectionKey } from "../../hooks/mundo/useMundoNavigationStore";

interface Reino {
  id: string;
  nombre: string;
}
interface Ciudad {
  id: string;
  nombre: string;
  reino_id?: string | null;
}
interface Personaje {
  id: string;
  nombre: string;
  img_url?: string | null;
  ciudad_id?: string | null;
  reino?: string | null;
}

interface Props {
  reinos: Reino[];
  ciudades: Ciudad[];
  personajes: Personaje[];
  loading?: boolean;
  onOpen: (section: SectionKey, id: string) => void;
  onCreateReino?: () => void;
  onCreateCiudad?: (reinoId: string | null) => void;
  onCreatePersonaje?: (ciudadId: string | null) => void;
  creatingReino?: boolean;
}

function NodoTitulo({
  label,
  onClick,
  onCreate,
  creating,
  variant = "reino",
  maxWidthPx,
  fill,
}: {
  label: string;
  onClick: () => void;
  onCreate?: () => void;
  creating?: boolean;
  variant?: "reino" | "ciudad";
  maxWidthPx?: number;
  /** Si es true, el chip ocupa el 100% del ancho de su contenedor (uso en grid dinámico) */
  fill?: boolean;
}) {
  const chipStyles =
    variant === "reino"
      ? "bg-primary/10 hover:bg-primary/20 text-primary border border-primary/15"
      : "bg-accent/10 hover:bg-accent/20 text-accent border border-accent/15";

  return (
    <div className={`flex items-center gap-1.5 max-w-full ${fill ? "w-full" : ""}`}>
      <button
        type="button"
        onClick={onClick}
        title={label}
        style={maxWidthPx ? { maxWidth: maxWidthPx } : undefined}
        className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide transition-colors truncate ${chipStyles} ${
          fill ? "flex-1 min-w-0 text-center" : ""
        }`}
      >
        {label}
      </button>
      {onCreate && (
        <button
          type="button"
          onClick={onCreate}
          disabled={creating}
          title="Añadir"
          className="p-1 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-50 shrink-0"
        >
          <Plus size={11} className="text-primary/60" />
        </button>
      )}
    </div>
  );
}

export function GeografiaJerarquica({
  reinos,
  ciudades,
  personajes,
  loading,
  onOpen,
  onCreateReino,
  onCreateCiudad,
  onCreatePersonaje,
  creatingReino,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setContainerWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (loading && reinos.length === 0) {
    return (
      <div className="py-6 text-xs text-primary/30 text-center">Cargando…</div>
    );
  }

  const ciudadesDe = (reinoId: string) =>
    ciudades
      .filter((c) => c.reino_id === reinoId)
      .sort((a, b) => personajesDe(b.id).length - personajesDe(a.id).length);
  const personajesDe = (ciudadId: string) =>
    personajes.filter((p) => p.ciudad_id === ciudadId);

  // Personajes sin ciudad_id, pero con un reino asignado directamente
  // (por nombre) se agrupan dentro de ese reino, bajo un slot "Sin Ciudad".
  const personajesSinCiudadDeReino = (reinoNombre: string) =>
    personajes.filter((p) => !p.ciudad_id && p.reino === reinoNombre);

  // Solo quedan huérfanos globales los que no tienen ni ciudad ni un reino
  // válido asociado.
  const personajesSinCiudad = personajes.filter(
    (p) => !p.ciudad_id && !reinos.some((r) => r.nombre === p.reino)
  );

  const reinosOrdenados = [...reinos].sort(
    (a, b) =>
      ciudadesDe(b.id).length +
      personajesSinCiudadDeReino(b.nombre).length -
      (ciudadesDe(a.id).length + personajesSinCiudadDeReino(a.nombre).length)
  );
  const reinosConCiudadesBase = reinosOrdenados.filter(
    (r) => ciudadesDe(r.id).length > 0 || personajesSinCiudadDeReino(r.nombre).length > 0
  );
  const reinosVacios = reinosOrdenados.filter(
    (r) => ciudadesDe(r.id).length === 0 && personajesSinCiudadDeReino(r.nombre).length === 0
  );

  // ── Estimación de ancho de cada card de reino ─────────────────────────────
  // Replica el cálculo de ancho de renderColumna (itemSize=52, gap=4, hasta
  // 6 columnas por ciudad) para poder anticipar cuánto ocupará cada card
  // sin necesidad de medir el DOM.
  const itemSize = 52;
  const gapPx = 4;
  const anchoCiudad = (habitantesCount: number) => {
    if (habitantesCount === 0) return 90; // chip "Sin personajes"
    const cols = Math.min(Math.max(habitantesCount, 1), 6);
    return Math.max(cols * itemSize + (cols - 1) * gapPx, 90);
  };
  const anchoReino = (reino: Reino) => {
    const anchosCiudades = ciudadesDe(reino.id).map((c) =>
      anchoCiudad(personajesDe(c.id).length),
    );
    const sinCiudadCount = personajesSinCiudadDeReino(reino.nombre).length;
    if (sinCiudadCount > 0) anchosCiudades.push(anchoCiudad(sinCiudadCount));
    // Las ciudades hacen wrap interno (flex-wrap gap-6=24px) hasta un máximo
    // razonable de fila; estimamos con un límite de ~3 ciudades por fila
    // interna para acotar el ancho de cards con muchísimas ciudades.
    const gapInterno = 24;
    const porFila = Math.min(anchosCiudades.length, 3) || 1;
    const filaMasAncha = anchosCiudades
      .slice(0, porFila)
      .reduce((sum, w) => sum + w, 0) + gapInterno * (porFila - 1);
    return Math.max(filaMasAncha + 32, 140); // + padding de la card (p-4 ambos lados)
  };

  // ── Reordenamiento tipo First-Fit Decreasing ──────────────────────────────
  // Reordena los reinos (ya vienen de mayor a menor contenido) simulando
  // filas de un ancho de referencia: si el próximo reino en orden no entra
  // en la fila actual, busca más adelante en la lista el primero que SÍ
  // quepa (en vez de forzar un salto de línea con hueco vacío a la derecha).
  // Con esto, un reino angosto que iba a caer varias posiciones después
  // puede "subir" a rellenar el espacio sobrante de la fila de arriba.
  const ANCHO_REFERENCIA = containerWidth || 1100; // fallback antes de medir
  const GAP = 24;
  function reordenarSinHuecos(items: Reino[]): Reino[] {
    const pendientes = [...items];
    const resultado: Reino[] = [];
    while (pendientes.length > 0) {
      let anchoFila = 0;
      let primero = true;
      // Llena la fila actual: en cada paso, toma el primer pendiente que
      // quepa en el espacio restante (best-fit por orden de aparición).
      // Si ninguno cabe, fuerza el primero de la lista (evita loop infinito
      // con un solo reino gigante) y cierra la fila.
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const espacioRestante = ANCHO_REFERENCIA - anchoFila - (primero ? 0 : GAP);
        const idx = pendientes.findIndex((r) => anchoReino(r) <= espacioRestante);
        if (idx === -1) {
          if (primero) {
            // El primer reino de la fila ya excede el ancho de referencia
            // (card gigante): la toma igual, ocupa toda la fila.
            const [r] = pendientes.splice(0, 1);
            resultado.push(r);
            anchoFila = ANCHO_REFERENCIA + 1;
            primero = false;
            continue;
          }
          break; // fila llena, pasa a la siguiente
        }
        const [r] = pendientes.splice(idx, 1);
        resultado.push(r);
        anchoFila += anchoReino(r) + (primero ? 0 : GAP);
        primero = false;
      }
    }
    return resultado;
  }
  const reinosConCiudades = reordenarSinHuecos(reinosConCiudadesBase);

  const renderColumna = ({
    key,
    nombre,
    habitantes,
    onClick,
    onCreate,
  }: {
    key: string;
    nombre: string;
    habitantes: Personaje[];
    onClick: () => void;
    onCreate?: () => void;
  }) => {
    const vacia = habitantes.length === 0;
    // Más personajes → más columnas → la columna ocupa más ancho horizontal.
    const cols = Math.min(Math.max(habitantes.length, 1), 6);
    const itemSize = 52;
    const gapPx = 4;
    const anchoPx = Math.max(cols * itemSize + (cols - 1) * gapPx, 90);

    return (
      <div
        key={key}
        className={vacia ? "w-fit shrink-0" : "shrink-0"}
        style={vacia ? undefined : { width: anchoPx }}
      >
        <NodoTitulo
          label={nombre}
          variant="ciudad"
          maxWidthPx={vacia ? 140 : anchoPx}
          onClick={onClick}
          onCreate={onCreate}
        />
        {vacia ? (
          <div className="mt-1.5 text-micro text-primary/25">
            Sin personajes
          </div>
        ) : (
          <div
            className="mt-2 grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${cols}, ${itemSize}px)`,
            }}
          >
            {habitantes.map((p) => (
              <EntityCard
                key={p.id}
                nombre={p.nombre}
                imageUrl={p.img_url}
                Icon={Users}
                onClick={() => onOpen("personajes", p.id)}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderCiudad = (ciudad: Ciudad) =>
    renderColumna({
      key: ciudad.id,
      nombre: ciudad.nombre,
      habitantes: personajesDe(ciudad.id),
      onClick: () => onOpen("ciudades", ciudad.id),
      onCreate: onCreatePersonaje
        ? () => onCreatePersonaje!(ciudad.id)
        : undefined,
    });

  const renderSinCiudadDeReino = (reino: Reino) =>
    renderColumna({
      key: `sin-ciudad-${reino.id}`,
      nombre: "Sin Ciudad",
      habitantes: personajesSinCiudadDeReino(reino.nombre),
      onClick: () => {},
      onCreate: onCreatePersonaje
        ? () => onCreatePersonaje!(null)
        : undefined,
    });

  return (
    <div className="mb-8 last:mb-0">
      <div className="flex items-center gap-2 mb-4 px-1">
        <h2 className="text-micro font-black uppercase tracking-[0.25em] text-primary/50">
          Entidades
        </h2>
        <span className="text-micro text-primary/25 tabular-nums">
          {reinos.length}
        </span>
        <div className="flex-1" />
        {onCreateReino && (
          <button
            type="button"
            onClick={onCreateReino}
            disabled={creatingReino}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-micro font-bold uppercase tracking-wide text-primary disabled:opacity-50"
          >
            <Plus size={11} />
            Añadir reino
          </button>
        )}
      </div>

      <div className="flex flex-col gap-8">
        <div ref={containerRef} className="flex flex-wrap items-start gap-6">
          {reinosConCiudades.map((reino) => (
            <div
              key={reino.id}
              className="w-fit max-w-full rounded-xl border border-primary/10 bg-primary/[0.03] overflow-hidden"
            >
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-2 bg-primary/10 border-b border-primary/10">
                <span />
                <button
                  type="button"
                  onClick={() => onOpen("reinos", reino.id)}
                  title={reino.nombre}
                  className="justify-self-center max-w-[280px] truncate text-xs font-black uppercase tracking-[0.15em] text-primary hover:text-accent transition-colors"
                >
                  {reino.nombre}
                </button>
                <div className="justify-self-end">
                  {onCreateCiudad && (
                    <button
                      type="button"
                      onClick={() => onCreateCiudad(reino.id)}
                      title="Añadir ciudad"
                      className="p-1 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                    >
                      <Plus size={11} className="text-primary/60" />
                    </button>
                  )}
                </div>
              </div>
              <div className="p-4 flex flex-wrap gap-6">
                {[
                  ...ciudadesDe(reino.id).map((c) => ({
                    tipo: "ciudad" as const,
                    ciudad: c,
                    count: personajesDe(c.id).length,
                  })),
                  ...(personajesSinCiudadDeReino(reino.nombre).length > 0
                    ? [
                        {
                          tipo: "sinCiudad" as const,
                          ciudad: null,
                          count: personajesSinCiudadDeReino(reino.nombre)
                            .length,
                        },
                      ]
                    : []),
                ]
                  .sort((a, b) => b.count - a.count)
                  .map((item) =>
                    item.tipo === "ciudad"
                      ? renderCiudad(item.ciudad)
                      : renderSinCiudadDeReino(reino)
                  )}
              </div>
            </div>
          ))}
        </div>

        {reinosVacios.length > 0 && (
          <div>
            <p className="mb-2 px-1 text-micro font-bold uppercase tracking-widest text-primary/25">
              Sin ciudades asignadas
            </p>
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              }}
            >
              {reinosVacios.map((reino) => (
                <NodoTitulo
                  key={reino.id}
                  fill
                  label={reino.nombre}
                  onClick={() => onOpen("reinos", reino.id)}
                  onCreate={
                    onCreateCiudad ? () => onCreateCiudad(reino.id) : undefined
                  }
                />
              ))}
            </div>
          </div>
        )}
        {personajesSinCiudad.length > 0 && (
          <div>
            <NodoTitulo
              label="Sin ciudad"
              variant="ciudad"
              onClick={() => {}}
              onCreate={
                onCreatePersonaje ? () => onCreatePersonaje(null) : undefined
              }
            />
            <div
              className="mt-2 grid gap-1"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(52px, 1fr))",
              }}
            >
              {personajesSinCiudad.map((p) => (
                <EntityCard
                  key={p.id}
                  nombre={p.nombre}
                  imageUrl={p.img_url}
                  Icon={Users}
                  onClick={() => onOpen("personajes", p.id)}
                />
              ))}
            </div>
          </div>
        )}

        {reinosConCiudades.length === 0 &&
          reinosVacios.length === 0 &&
          personajesSinCiudad.length === 0 && (
            <div className="py-6 text-xs text-primary/25 text-center">
              Sin reinos todavía
            </div>
          )}
      </div>
    </div>
  );
}
