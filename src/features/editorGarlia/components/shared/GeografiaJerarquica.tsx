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
 * Cada nodo (reino / ciudad) se muestra SOLO como texto ([Nombre]) — sin
 * imagen ni tarjeta — y al hacer click abre su editor completo
 * (openEntity("reinos", id) / openEntity("ciudades", id)), que ya trae
 * adentro sus propias ciudades / personajes. Los personajes sí usan la
 * tarjeta normal (imagen + nombre) porque son la hoja del árbol.
 *
 * Relaciones usadas:
 *  - Ciudad.reino_id   → agrupa ciudades bajo su reino
 *  - Personaje.ciudad_id → agrupa personajes bajo su ciudad
 * Reinos sin ciudades, ciudades sin reino_id y personajes sin ciudad_id
 * caen en un bloque final "Sin reino".
 */

import { Plus, Users } from "lucide-react";
import React from "react";

import { EntityCard } from "./EntityCard";
import type { SectionKey } from "../hooks/mundo/useMundoNavigationStore";

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
}: {
  label: string;
  onClick: () => void;
  onCreate?: () => void;
  creating?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        className="text-sm font-black text-primary/85 hover:text-accent transition-colors"
      >
        [{label}]
      </button>
      {onCreate && (
        <button
          type="button"
          onClick={onCreate}
          disabled={creating}
          title="Añadir"
          className="p-0.5 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-50"
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
    return <div className="py-6 text-xs text-primary/30 text-center">Cargando…</div>;
  }

  const ciudadesDe = (reinoId: string) => ciudades.filter((c) => c.reino_id === reinoId);
  const personajesDe = (ciudadId: string) => personajes.filter((p) => p.ciudad_id === ciudadId);

  const ciudadesSinReino = ciudades.filter((c) => !c.reino_id);
  const personajesSinCiudad = personajes.filter((p) => !p.ciudad_id);

  const renderCiudad = (ciudad: Ciudad) => {
    const habitantes = personajesDe(ciudad.id);
    return (
      <div key={ciudad.id} className="flex-1 min-w-[180px]">
        <NodoTitulo
          label={ciudad.nombre}
          onClick={() => onOpen("ciudades", ciudad.id)}
          onCreate={onCreatePersonaje ? () => onCreatePersonaje(ciudad.id) : undefined}
        />
        {habitantes.length === 0 ? (
          <div className="mt-2 text-micro text-primary/25">Sin personajes</div>
        ) : (
          <div
            className="mt-2 grid gap-1.5"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(76px, 1fr))" }}
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

  return (
    <div className="mb-8 last:mb-0">
      <div className="flex items-center gap-2 mb-4 px-1">
        <h2 className="text-micro font-black uppercase tracking-[0.25em] text-primary/50">
          Entidades
        </h2>
        <span className="text-micro text-primary/25 tabular-nums">{reinos.length}</span>
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
        {reinos.map((reino) => (
          <div key={reino.id} className="pb-6 border-b border-primary/5 last:border-0">
            <NodoTitulo
              label={reino.nombre}
              onClick={() => onOpen("reinos", reino.id)}
              onCreate={onCreateCiudad ? () => onCreateCiudad(reino.id) : undefined}
            />
            <div className="mt-3 flex flex-wrap gap-6">
              {ciudadesDe(reino.id).length === 0 ? (
                <div className="text-micro text-primary/25">Sin ciudades</div>
              ) : (
                ciudadesDe(reino.id).map(renderCiudad)
              )}
            </div>
          </div>
        ))}

        {(ciudadesSinReino.length > 0 || personajesSinCiudad.length > 0) && (
          <div className="pb-2">
            <NodoTitulo
              label="Sin reino"
              onClick={() => {}}
              onCreate={onCreateCiudad ? () => onCreateCiudad(null) : undefined}
            />
            <div className="mt-3 flex flex-wrap gap-6">
              {ciudadesSinReino.map(renderCiudad)}
              {personajesSinCiudad.length > 0 && (
                <div className="flex-1 min-w-[180px]">
                  <NodoTitulo
                    label="Sin ciudad"
                    onClick={() => {}}
                    onCreate={onCreatePersonaje ? () => onCreatePersonaje(null) : undefined}
                  />
                  <div
                    className="mt-2 grid gap-1.5"
                    style={{ gridTemplateColumns: "repeat(auto-fill, minmax(76px, 1fr))" }}
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
            </div>
          </div>
        )}

        {reinos.length === 0 && ciudadesSinReino.length === 0 && personajesSinCiudad.length === 0 && (
          <div className="py-6 text-xs text-primary/25 text-center">Sin reinos todavía</div>
        )}
      </div>
    </div>
  );
}
