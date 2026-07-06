"use client";

/**
 * OrganizacionPage
 * ───────────────────────────────────────────────────────────────────────────
 * Combina Grupos + Notas en una sola página con grid de tarjetas.
 *
 * Grupos mantiene su lógica de tipos: GRUPO_TIPO_CONFIG define varios
 * bloques (uno por tipo de grupo — Personajes, Criaturas, Reinos, Magia,
 * Libros, etc.), cada uno con su propio grid y su propio botón "Añadir"
 * que crea directo un grupo de ese tipo (sin selector, porque el tipo ya
 * está implícito en el bloque al que pertenece).
 *
 * Notas es un bloque simple más, con imagen ausente (usa ícono).
 */

import { StickyNote } from "lucide-react";
import React, { useMemo } from "react";

import { EditorGrupo, GRUPO_TIPO_CONFIG, useGrupos, type GrupoTipo } from "@/features/editorGarlia/views/EditorGrupo";
import { useNotas } from "@/features/editorGarlia/hooks/notas/useNotas";
import { type Nota } from "@/features/editorGarlia/hooks/types";

import { EntityCardGrid } from "../shared/EntityCardGrid";
import { useMundoNavigation, type SectionKey } from "../store/useMundoNavigationStore";

interface Props {
  section: SectionKey;
  selectedId: string | null;
}

export function OrganizacionPage({ section, selectedId }: Props) {
  const { grupos, loaded: loadedGrupos, crearGrupo, actualizarGrupo, eliminarGrupo } = useGrupos();
  const { notas, loading: loadingNotas, crear: crearNota, actualizar: actualizarNota, eliminar: eliminarNota } =
    useNotas();
  const openEntity = useMundoNavigation((s) => s.openEntity);

  const gruposPorTipo = useMemo(() => {
    const map: Partial<Record<GrupoTipo, typeof grupos>> = {};
    for (const g of grupos) {
      if (!map[g.tipo]) map[g.tipo] = [];
      map[g.tipo]!.push(g);
    }
    return map;
  }, [grupos]);

  /** Dentro de cada tipo, agrupamos por subtipo (ej. "Familia", "Clan"…).
   *  Los grupos sin subtipo caen en un balde aparte al final. */
  const subtiposPorTipo = useMemo(() => {
    const map: Partial<Record<GrupoTipo, { subtipo: string | null; items: typeof grupos }[]>> = {};
    for (const [tipoStr, lista] of Object.entries(gruposPorTipo)) {
      const tipo = tipoStr as GrupoTipo;
      const porSubtipo = new Map<string, typeof grupos>();
      const sinSubtipo: typeof grupos = [];
      for (const g of lista ?? []) {
        if (g.subtipo && g.subtipo.trim()) {
          const key = g.subtipo.trim();
          if (!porSubtipo.has(key)) porSubtipo.set(key, []);
          porSubtipo.get(key)!.push(g);
        } else {
          sinSubtipo.push(g);
        }
      }
      const bloques: { subtipo: string | null; items: typeof grupos }[] = Array.from(porSubtipo.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([subtipo, items]) => ({ subtipo, items }));
      if (sinSubtipo.length) bloques.push({ subtipo: null, items: sinSubtipo });
      map[tipo] = bloques;
    }
    return map;
  }, [gruposPorTipo]);

  const selectedGrupo = useMemo(
    () => (section === "grupos" ? grupos.find((g) => g.id === selectedId) ?? null : null),
    [section, grupos, selectedId],
  );
  const selectedNota = useMemo(
    () => (section === "notas" ? notas.find((n) => n.id === selectedId) ?? null : null),
    [section, notas, selectedId],
  );

  if (selectedGrupo) {
    return (
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <EditorGrupo
          key={selectedGrupo.id}
          grupo={selectedGrupo}
          onDeleted={async (id) => {
            await eliminarGrupo(id);
          }}
          onSaved={async (updated) => {
            await actualizarGrupo(updated);
          }}
        />
      </div>
    );
  }

  if (selectedNota) {
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-4 gap-3">
        <input
          className="w-full bg-transparent text-lg font-black text-primary outline-none placeholder:text-primary/25"
          placeholder="Título de la nota…"
          value={selectedNota.titulo}
          onChange={(e) => actualizarNota({ ...selectedNota, titulo: e.target.value })}
        />
        <textarea
          className="flex-1 w-full bg-primary/[0.03] border border-primary/10 rounded-lg p-3 text-sm text-primary outline-none focus:border-primary/25 resize-none placeholder:text-primary/25"
          placeholder="Escribí acá…"
          value={selectedNota.contenido ?? ""}
          onChange={(e) => actualizarNota({ ...selectedNota, contenido: e.target.value })}
        />
        <button
          type="button"
          onClick={() => eliminarNota(selectedNota.id)}
          className="self-start text-micro font-bold uppercase tracking-widest text-red-400/60 hover:text-red-400 transition-colors"
        >
          Eliminar nota
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4">
      {(Object.entries(GRUPO_TIPO_CONFIG) as [GrupoTipo, (typeof GRUPO_TIPO_CONFIG)[GrupoTipo]][]).map(
        ([tipo, cfg]) => {
          const bloques = subtiposPorTipo[tipo] ?? [];
          if (!loadedGrupos && bloques.length === 0) {
            // Todavía cargando y no hay nada de este tipo en caché: mostramos
            // igual un bloque vacío con loading para que el layout no salte.
            return (
              <div key={tipo} className="mb-10 last:mb-0">
                <TipoHeader Icon={cfg.Icon} label={cfg.labelPlural} />
                <EntityCardGrid
                  title={cfg.labelPlural}
                  Icon={cfg.Icon}
                  loading
                  items={[]}
                  onItemClick={() => {}}
                  onCreate={async () => {
                    const nuevo = await crearGrupo(tipo);
                    if (nuevo) openEntity("grupos", nuevo.id);
                  }}
                />
              </div>
            );
          }
          if (bloques.length === 0) return null;

          // Layout de las tarjetas de subtipo dentro del tipo, igual criterio
          // que Entidades: 1 subtipo → ancho completo, 2 → mitad c/u, 3+ → tercio.
          const layout: "full" | "half" | "third" =
            bloques.length === 1 ? "full" : bloques.length === 2 ? "half" : "third";

          return (
            <div key={tipo} className="mb-10 last:mb-0">
              <TipoHeader Icon={cfg.Icon} label={cfg.labelPlural} />
              <div className="flex flex-col md:flex-row gap-6 flex-wrap">
                {bloques.map((bloque, i) => (
                  <div key={bloque.subtipo ?? `__sin-subtipo-${i}`} className="flex-1 min-w-[220px]">
                    <EntityCardGrid
                      title={bloque.subtipo ?? "Sin subtipo"}
                      Icon={cfg.Icon}
                      layout={layout}
                      loading={!loadedGrupos}
                      items={bloque.items.map((g) => ({ id: g.id, nombre: g.nombre }))}
                      onItemClick={(id) => openEntity("grupos", id)}
                      onCreate={async () => {
                        const nuevo = await crearGrupo(tipo);
                        if (nuevo) openEntity("grupos", nuevo.id);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        },
      )}
      <EntityCardGrid
        title="Notas"
        Icon={StickyNote}
        loading={loadingNotas}
        items={notas.map((n: Nota) => ({ id: n.id, nombre: n.titulo || "Sin título" }))}
        onItemClick={(id) => openEntity("notas", id)}
        onCreate={async () => {
          const nota = await crearNota("Nueva nota");
          if (nota) openEntity("notas", nota.id);
        }}
      />
    </div>
  );
}

function TipoHeader({ Icon, label }: { Icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 px-1">
      <Icon size={15} className="text-primary/60" />
      <h1 className="text-sm font-black uppercase tracking-[0.2em] text-primary/70">{label}</h1>
      <div className="flex-1 h-px bg-primary/10" />
    </div>
  );
}
