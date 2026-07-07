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
import React from "react";

import { EntityCard } from "./EntityCard";
import type { SectionKey } from "../store/useMundoNavigationStore";

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
}: {
  label: string;
  onClick: () => void;
  onCreate?: () => void;
  creating?: boolean;
  variant?: "reino" | "ciudad";
  maxWidthPx?: number;
}) {
  const chipStyles =
    variant === "reino"
      ? "bg-primary/10 hover:bg-primary/20 text-primary border border-primary/15"
      : "bg-accent/10 hover:bg-accent/20 text-accent border border-accent/15";

  return (
    <div className="flex items-center gap-1.5 max-w-full">
      <button
        type="button"
        onClick={onClick}
        title={label}
        style={maxWidthPx ? { maxWidth: maxWidthPx } : undefined}
        className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide transition-colors truncate ${chipStyles}`}
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
  const reinosConCiudades = reinosOrdenados.filter(
    (r) => ciudadesDe(r.id).length > 0 || personajesSinCiudadDeReino(r.nombre).length > 0
  );
  const reinosVacios = reinosOrdenados.filter(
    (r) => ciudadesDe(r.id).length === 0 && personajesSinCiudadDeReino(r.nombre).length === 0
  );

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
        <div className="flex flex-wrap items-start gap-6">
          {reinosConCiudades.map((reino) => (
            <div
              key={reino.id}
              className="w-fit max-w-full p-4 rounded-xl bg-primary/[0.03] border border-primary/10"
            >
              <NodoTitulo
                label={reino.nombre}
                onClick={() => onOpen("reinos", reino.id)}
                onCreate={
                  onCreateCiudad ? () => onCreateCiudad(reino.id) : undefined
                }
              />
              <div className="mt-3 flex flex-wrap gap-6">
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

          {reinosVacios.length > 0 &&
            reinosVacios.map((reino) => (
              <NodoTitulo
                key={reino.id}
                label={reino.nombre}
                onClick={() => onOpen("reinos", reino.id)}
                onCreate={
                  onCreateCiudad ? () => onCreateCiudad(reino.id) : undefined
                }
              />
            ))}
        </div>

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
