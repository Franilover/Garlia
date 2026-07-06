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
        ([tipo, cfg]) => (
          <EntityCardGrid
            key={tipo}
            title={cfg.labelPlural}
            Icon={cfg.Icon}
            loading={!loadedGrupos}
            items={(gruposPorTipo[tipo] ?? []).map((g) => ({ id: g.id, nombre: g.nombre }))}
            onItemClick={(id) => openEntity("grupos", id)}
            onCreate={async () => {
              const nuevo = await crearGrupo(tipo);
              if (nuevo) openEntity("grupos", nuevo.id);
            }}
          />
        ),
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
