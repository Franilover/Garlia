"use client";

import { Package } from "lucide-react";
import React, { useMemo, useState } from "react";

import { useSupabaseData } from "@/hooks/data/useSupabaseData";

import { useMundoNavigation } from "../store/useMundoNavigationStore";
import { SectionListHeader } from "../shared/SectionListHeader";
import { ItemEditor } from "./ItemEditor";

interface Item {
  id: string;
  nombre: string;
  imagen_url?: string;
  categoria?: string;
}

interface Props {
  selectedId: string | null;
  navKey: number;
}

export function ItemsSection({ selectedId }: Props) {
  const { data: items, loading, addRow } = useSupabaseData<Item>("items");
  const openEntity = useMundoNavigation((s) => s.openEntity);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.nombre?.toLowerCase().includes(q));
  }, [items, query]);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  const handleCreate = async () => {
    const { data } = await addRow({ nombre: "Nuevo objeto" });
    if (data?.id) openEntity("items", data.id);
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
          activeSection="items"
          query={query}
          onQueryChange={setQuery}
          onCreate={handleCreate}
          placeholder="Buscar objeto…"
          createLabel="Crear objeto"
        />

        <div className="flex-1 overflow-y-auto">
          {loading && items.length === 0 ? (
            <div className="p-4 text-xs text-primary/30 text-center">Cargando…</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-xs text-primary/30 text-center">Sin resultados</div>
          ) : (
            filtered.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => openEntity("items", i.id)}
                className={[
                  "w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors",
                  i.id === selectedId
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-primary/70 hover:bg-primary/5",
                ].join(" ")}
              >
                <Package size={12} className="shrink-0 opacity-50" />
                <span className="truncate">{i.nombre}</span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {selected ? (
          <ItemEditor item={selected} />
        ) : (
          <div className="h-full flex items-center justify-center text-primary/20 text-xs">
            Elegí un objeto de la lista, o creá uno nuevo
          </div>
        )}
      </div>
    </div>
  );
}
