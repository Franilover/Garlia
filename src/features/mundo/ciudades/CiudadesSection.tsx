"use client";

import { MapPinned, Plus, Search } from "lucide-react";
import React, { useMemo, useState } from "react";

import { useSupabaseData } from "@/hooks/data/useSupabaseData";

import { useMundoNavigation } from "../store/useMundoNavigationStore";
import { CiudadEditor } from "./CiudadEditor";

interface Ciudad {
  id: string;
  nombre: string;
  tipo?: string | null;
  reino_id?: string | null;
}

interface Props {
  selectedId: string | null;
  navKey: number;
}

export function CiudadesSection({ selectedId }: Props) {
  const { data: ciudades, loading, addRow } = useSupabaseData<Ciudad>("ciudades");
  const openEntity = useMundoNavigation((s) => s.openEntity);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ciudades;
    return ciudades.filter((c) => c.nombre?.toLowerCase().includes(q));
  }, [ciudades, query]);

  const selected = useMemo(
    () => ciudades.find((c) => c.id === selectedId) ?? null,
    [ciudades, selectedId],
  );

  const handleCreate = async () => {
    const { data } = await addRow({ nombre: "Nueva ciudad" });
    if (data?.id) openEntity("ciudades", data.id);
  };

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      <div className="w-64 shrink-0 border-r border-primary/10 flex flex-col min-h-0">
        <div className="p-2 flex items-center gap-2 border-b border-primary/10">
          <div className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-input-bg">
            <Search size={12} className="text-primary/30" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar ciudad…"
              className="flex-1 bg-transparent text-xs outline-none placeholder:text-primary/25"
            />
          </div>
          <button
            type="button"
            onClick={handleCreate}
            className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
            aria-label="Crear ciudad"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && ciudades.length === 0 ? (
            <div className="p-4 text-xs text-primary/30 text-center">Cargando…</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-xs text-primary/30 text-center">Sin resultados</div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => openEntity("ciudades", c.id)}
                className={[
                  "w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors",
                  c.id === selectedId
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-primary/70 hover:bg-primary/5",
                ].join(" ")}
              >
                <MapPinned size={12} className="shrink-0 opacity-50" />
                <span className="truncate">{c.nombre}</span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {selected ? (
          <CiudadEditor ciudad={selected} />
        ) : (
          <div className="h-full flex items-center justify-center text-primary/20 text-xs">
            Elegí una ciudad de la lista, o creá una nueva
          </div>
        )}
      </div>
    </div>
  );
}
