"use client";

/**
 * NotasSection
 * ───────────────────────────────────────────────────────────────────────────
 * En el código anterior, la UI de notas estaba escrita inline dentro de
 * EditorMundo.tsx (no existía un componente separado) y se activaba por un
 * hack de localStorage["estudio-notas-action"] + CustomEvent. Acá es una
 * sección normal: usa `useNotas()` directamente, sin side-channels.
 */

import { StickyNote, Trash2 } from "lucide-react";
import React, { useMemo, useState } from "react";

import { useNotas } from "../../editorGarlia/hooks/notas/useNotas";
import { SectionListHeader } from "../shared/SectionListHeader";

export function NotasSection() {
  const { notas, loading, crear, actualizar, eliminar } = useNotas();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notas;
    return notas.filter(
      (n) =>
        n.titulo?.toLowerCase().includes(q) ||
        n.contenido?.toLowerCase().includes(q),
    );
  }, [notas, query]);

  const selected = notas.find((n) => n.id === selectedId) ?? null;

  const handleCreate = async () => {
    const nueva = await crear("Nueva nota");
    if (nueva?.id) setSelectedId(nueva.id);
  };

  const handleDelete = async (id: string) => {
    await eliminar(id);
    if (selectedId === id) setSelectedId(null);
  };

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      <div
        className={[
          "w-64 shrink-0 border-r border-primary/10 flex flex-col min-h-0",
          selected ? "hidden" : "flex",
        ].join(" ")}
      >
        <SectionListHeader
          query={query}
          onQueryChange={setQuery}
          onCreate={handleCreate}
          placeholder="Buscar nota…"
          createLabel="Crear nota"
          hasSelection={!!selected}
        />

        <div className="flex-1 overflow-y-auto">
          {loading && notas.length === 0 ? (
            <div className="p-4 text-xs text-primary/30 text-center">Cargando…</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-xs text-primary/30 text-center">Sin notas</div>
          ) : (
            filtered.map((n) => (
              <div
                key={n.id}
                className={[
                  "group flex items-center gap-2 px-3 py-2 text-xs cursor-pointer transition-colors",
                  n.id === selectedId
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-primary/70 hover:bg-primary/5",
                ].join(" ")}
                onClick={() => setSelectedId(n.id)}
              >
                <StickyNote size={12} className="shrink-0 opacity-50" />
                <span className="flex-1 truncate">{n.titulo || "Sin título"}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleDelete(n.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 transition-opacity"
                  aria-label="Eliminar nota"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {selected ? (
          <div className="flex flex-col gap-3 max-w-2xl">
            <input
              value={selected.titulo ?? ""}
              onChange={(e) => actualizar({ ...selected, titulo: e.target.value })}
              placeholder="Título"
              className="bg-transparent text-lg font-black outline-none placeholder:text-primary/25"
            />
            <textarea
              value={selected.contenido ?? ""}
              onChange={(e) => actualizar({ ...selected, contenido: e.target.value })}
              placeholder="Escribí tu nota…"
              rows={16}
              className="w-full bg-transparent border border-primary/10 rounded-xl px-3 py-2.5 text-xs leading-relaxed outline-none focus:border-primary/25 resize-none placeholder:text-primary/20"
            />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-primary/20 text-xs">
            Elegí una nota de la lista, o creá una nueva
          </div>
        )}
      </div>
    </div>
  );
}
