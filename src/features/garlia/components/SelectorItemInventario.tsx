"use client";

/**
 * SelectorItemInventario.tsx
 * ───────────────────────────
 * Selector para agregar objetos al inventario de una ficha D&D. En vez de
 * texto libre, elige de los items ya creados en Garlia: el vínculo queda
 * guardado (item_id), así que si luego editas el item original (nombre,
 * imagen, descripción) el inventario del jugador se actualiza solo, y el
 * DM puede verlo resuelto en Aventuras.
 */

import { Loader2, Package, Plus, Search } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

import { useItemsCatalogo } from "@/features/garlia/hooks/useFichasDnd";
import type { ItemMin } from "@/lib/utils/criaturaItemsCache";

export function SelectorItemInventario({
  onAgregar,
}: {
  onAgregar: (item: ItemMin) => void | Promise<void>;
}) {
  const { items, loading } = useItemsCatalogo();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [agregando, setAgregando] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const disponibles = items.filter((i) => i.nombre.toLowerCase().includes(search.toLowerCase()));

  const border = "1px solid color-mix(in srgb, var(--primary) 15%, transparent)";

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const elegir = async (item: ItemMin) => {
    setAgregando(item.id);
    try {
      await onAgregar(item);
      setOpen(false);
      setSearch("");
    } finally {
      setAgregando(null);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg text-xs font-bold transition-colors"
        style={{
          background: "color-mix(in srgb, var(--primary) 8%, transparent)",
          color: "var(--primary)",
        }}
      >
        <Plus size={14} />
        Añadir objeto de Garlia
      </button>

      {open && (
        <div
          className="absolute z-20 mt-1 w-full min-w-[260px] rounded-[var(--radius-btn)] overflow-hidden"
          style={{
            border,
            background: "var(--bg-main)",
            boxShadow: "0 8px 24px color-mix(in srgb, var(--primary) 10%, transparent)",
          }}
        >
          <div
            className="flex items-center gap-2 px-3 py-2"
            style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}
          >
            <Search size={11} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
            <input
              autoFocus
              className="flex-1 bg-transparent outline-none text-micro font-bold uppercase tracking-wide placeholder:normal-case placeholder:font-medium placeholder:tracking-normal"
              placeholder="Buscar item…"
              style={{ color: "var(--primary)", caretColor: "var(--primary)" }}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && (setOpen(false), setSearch(""))}
            />
          </div>

          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="flex items-center gap-2 px-4 py-3">
                <Loader2 className="animate-spin text-primary/30" size={12} />
                <span className="text-micro text-primary/30">Cargando…</span>
              </div>
            ) : items.length === 0 ? (
              <p className="text-micro text-primary/30 px-4 py-3 font-bold uppercase">
                Todavía no hay items creados en Garlia
              </p>
            ) : disponibles.length === 0 ? (
              <p className="text-micro text-primary/30 px-4 py-3 font-bold uppercase">
                Sin resultados para &quot;{search}&quot;
              </p>
            ) : (
              disponibles.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={agregando === item.id}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all hover:bg-primary/6 disabled:opacity-50"
                  style={{ color: "color-mix(in srgb, var(--primary) 60%, transparent)" }}
                  onMouseDown={() => elegir(item)}
                >
                  {item.imagen_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imagen_url} alt="" className="w-6 h-6 rounded object-cover shrink-0" />
                  ) : (
                    <span className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
                      <Package size={11} className="text-primary/30" />
                    </span>
                  )}
                  <span className="truncate flex-1 text-left">{item.nombre}</span>
                  {agregando === item.id && <Loader2 className="animate-spin" size={12} />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
