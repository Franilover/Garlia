"use client";

import { Map } from "lucide-react";
import React, { useMemo, useState } from "react";

import { useSupabaseData } from "@/hooks/data/useSupabaseData";

import { useMundoNavigation } from "../store/useMundoNavigationStore";
import { SectionListHeader } from "../shared/SectionListHeader";
import { ReinoEditor } from "./ReinoEditor";

interface Reino {
  id: string;
  nombre: string;
  oculto?: boolean;
}

interface Props {
  selectedId: string | null;
  navKey: number;
}

export function ReinosSection({ selectedId }: Props) {
  const { data: reinos, loading, addRow } = useSupabaseData<Reino>("reinos");
  const openEntity = useMundoNavigation((s) => s.openEntity);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return reinos;
    return reinos.filter((r) => r.nombre?.toLowerCase().includes(q));
  }, [reinos, query]);

  const selected = useMemo(
    () => reinos.find((r) => r.id === selectedId) ?? null,
    [reinos, selectedId],
  );

  const handleCreate = async () => {
    const { data } = await addRow({ nombre: "Nuevo reino" });
    if (data?.id) openEntity("reinos", data.id);
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
          placeholder="Buscar reino…"
          createLabel="Crear reino"
          hasSelection={!!selected}
        />

        <div className="flex-1 overflow-y-auto">
          {loading && reinos.length === 0 ? (
            <div className="p-4 text-xs text-primary/30 text-center">Cargando…</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-xs text-primary/30 text-center">Sin resultados</div>
          ) : (
            filtered.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => openEntity("reinos", r.id)}
                className={[
                  "w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors",
                  r.id === selectedId
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-primary/70 hover:bg-primary/5",
                ].join(" ")}
              >
                <Map size={12} className="shrink-0 opacity-50" />
                <span className="truncate">{r.nombre}</span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {selected ? (
          <ReinoEditor reino={selected} />
        ) : (
          <div className="h-full flex items-center justify-center text-primary/20 text-xs">
            Elegí un reino de la lista, o creá uno nuevo
          </div>
        )}
      </div>
    </div>
  );
}
