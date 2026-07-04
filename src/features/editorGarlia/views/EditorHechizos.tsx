"use client";

/**
 * EditorHechizos.tsx
 * ────────────────────
 * View del editor de hechizos/dones/runas. Orquesta:
 *   - Lista/selección de entidades mágicas (useEntidadesMagicas)
 *   - Carga de grupos de criaturas (useGruposCriaturas)
 *   - Creación de nuevas entidades
 *   - Delegación del formulario a FormularioMagico
 *
 * No contiene lógica de fetching de items individuales ni
 * helpers de Dexie — todo eso vive en hooks/ y lib/.
 *
 * Ruta destino:
 *   src/features/editorGarlia/views/EditorHechizos.tsx
 */

import { Loader2, Plus } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

import { FormularioMagico } from "@/features/editorGarlia/components/Magia/FormularioMagico";
import { CONFIG, type EntidadMagica, type Modo } from "@/features/editorGarlia/components/Magia/types";
import { useEntidadesMagicas } from "@/features/editorGarlia/hooks/misc/useEntidadesMagicas";
import { useGruposCriaturas } from "@/features/editorGarlia/hooks/grupos/useGruposCriaturas";
import { supabase } from "@/lib/api/client/supabase";

export function EditorHechizos({
  modo,
  initialSelectedId,
  onSelectedIdChange,
  onItemSaved,
  onItemDeleted,
}: {
  modo: Modo;
  initialSelectedId?: string;
  onSelectedIdChange?: (id: string | null) => void;
  onItemSaved?: (item: EntidadMagica) => void;
  onItemDeleted?: (id: string) => void;
}) {
  const cfg = CONFIG[modo];
  const { items, setItems, loading } = useEntidadesMagicas(modo);
  const { grupos, loading: loadingGrupos } = useGruposCriaturas();
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId ?? null,
  );
  const [creating, setCreating] = useState(false);

  // Sincronizar cuando llega un id desde afuera (buscador global)
  useEffect(() => {
    if (initialSelectedId && initialSelectedId !== selectedId) {
      setSelectedId(initialSelectedId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSelectedId]);

  const selected = items.find((i) => i.id === selectedId) ?? null;

  // Si hay selectedId pero el item no está en la lista aún, lo buscamos en Supabase.
  // Usamos ref para no repetir el fetch ante re-renders.
  const fetchedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedId) return;
    if (items.find((i) => i.id === selectedId)) return;
    if (fetchedRef.current === selectedId) return;
    fetchedRef.current = selectedId;

    const tabla = CONFIG[modo].tabla;
    const selectFields =
      modo === "runas"
        ? "id, nombre, explicacion, imagen_url"
        : "id, nombre, explicacion, grupo_ids, imagen_url";

    supabase
      .from(tabla)
      .select(selectFields)
      .eq("id", selectedId)
      .single()
      .then(({ data }) => {
        if (data) {
          const item = data as unknown as EntidadMagica;
          setItems((prev) =>
            prev.some((i) => i.id === item.id)
              ? prev.map((i) => (i.id === item.id ? item : i))
              : [item, ...prev],
          );
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const insertPayload =
        modo === "runas"
          ? { nombre: `Nueva ${cfg.labelSing}` }
          : { nombre: `Nuevo ${cfg.labelSing}`, grupo_ids: [] };
      const selectFields =
        modo === "runas"
          ? "id, nombre, explicacion, imagen_url"
          : "id, nombre, explicacion, grupo_ids";

      const { data, error } = await supabase
        .from(cfg.tabla)
        .insert([insertPayload])
        .select(selectFields)
        .single();
      if (error) throw error;
      setItems((prev) => [data as unknown as EntidadMagica, ...prev]);
      setSelectedId((data as any).id);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {selected ? (
          <FormularioMagico
            key={selected.id}
            grupos={grupos}
            item={selected}
            loadingGrupos={loadingGrupos}
            modo={modo}
            onDeleted={(id) => {
              setItems((prev) => prev.filter((i) => i.id !== id));
              setSelectedId(null);
              onSelectedIdChange?.(null);
              onItemDeleted?.(id);
            }}
            onSaved={(updated) => {
              setItems((prev) =>
                prev.map((i) => (i.id === updated.id ? updated : i)),
              );
              onItemSaved?.(updated);
            }}
          />
        ) : loading && selectedId ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="animate-spin text-primary/20" size={20} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 select-none">
            <cfg.Icon
              size={40}
              strokeWidth={1}
              style={{ color: cfg.color, opacity: 0.2 }}
            />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/25">
              {cfg.label}
            </p>
            <p className="text-[10px] text-primary/20 tracking-widest">
              Seleccioná un {cfg.labelSing.toLowerCase()} o creá uno nuevo
            </p>
            <button
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-primary/15 text-primary/40 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all mt-2"
              disabled={creating}
              onClick={handleCreate}
            >
              {creating ? (
                <Loader2 className="animate-spin" size={10} />
              ) : (
                <Plus size={10} />
              )}
              Nuevo {cfg.labelSing}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
