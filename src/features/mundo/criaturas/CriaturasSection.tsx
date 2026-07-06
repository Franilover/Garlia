"use client";

import { Bug, Plus, Search } from "lucide-react";
import React, { useMemo, useState } from "react";

import { useSupabaseData } from "@/hooks/data/useSupabaseData";

import { useMundoNavigation } from "../store/useMundoNavigationStore";
import { CriaturaEditor } from "./CriaturaEditor";

interface Criatura {
  id: string;
  nombre: string;
  imagen_url?: string;
  habitat?: string;
}

interface Props {
  selectedId: string | null;
  navKey: number;
}

export function CriaturasSection({ selectedId }: Props) {
  const { data: criaturas, loading, addRow } = useSupabaseData<Criatura>("criaturas");
  const openEntity = useMundoNavigation((s) => s.openEntity);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return criaturas;
    return criaturas.filter((c) => c.nombre?.toLowerCase().includes(q));
  }, [criaturas, query]);

  const selected = useMemo(
    () => criaturas.find((c) => c.id === selectedId) ?? null,
    [criaturas, selectedId],
  );

  const handleCreate = async () => {
    const { data } = await addRow({ nombre: "Nueva criatura" });
    if (data?.id) openEntity("criaturas", data.id);
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
              placeholder="Buscar criatura…"
              className="flex-1 bg-transparent text-xs outline-none placeholder:text-primary/25"
            />
          </div>
          <button
            type="button"
            onClick={handleCreate}
            className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
            aria-label="Crear criatura"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && criaturas.length === 0 ? (
            <div className="p-4 text-xs text-primary/30 text-center">Cargando…</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-xs text-primary/30 text-center">Sin resultados</div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => openEntity("criaturas", c.id)}
                className={[
                  "w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors",
                  c.id === selectedId
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-primary/70 hover:bg-primary/5",
                ].join(" ")}
              >
                <Bug size={12} className="shrink-0 opacity-50" />
                <span className="truncate">{c.nombre}</span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {selected ? (
          <CriaturaEditor criatura={selected} />
        ) : (
          <div className="h-full flex items-center justify-center text-primary/20 text-xs">
            Elegí una criatura de la lista, o creá una nueva
          </div>
        )}
      </div>
    </div>
  );
}
