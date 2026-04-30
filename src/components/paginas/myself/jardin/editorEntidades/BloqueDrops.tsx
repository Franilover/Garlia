"use client";

/**
 * BloqueDrops
 * -----------
 * Gestiona los ítems que dropea una criatura (o una de sus variantes).
 *
 * Tabla esperada en Supabase:
 *
 *   create table criatura_drops (
 *     id           uuid primary key default gen_random_uuid(),
 *     criatura_id  uuid not null references criaturas(id) on delete cascade,
 *     variante_id  uuid references criatura_variantes(id) on delete cascade,
 *     item_id      uuid not null references items(id) on delete cascade,
 *     created_at   timestamptz default now(),
 *     unique (criatura_id, variante_id, item_id)
 *   );
 *
 * variante_id = NULL  → drop de la criatura base
 * variante_id = <id>  → drop exclusivo de esa variante
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Package, X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { normalize } from "@/components/templates/EstudioTemplates";

// ─── Tipos locales ────────────────────────────────────────────────────────────

type ItemCatalogo = {
  id: string;
  nombre: string;
  imagen_url?: string | null;
  categoria?: string | null;
};

type Drop = {
  id: string;
  item_id: string;
  item: ItemCatalogo;
};

// ─── Hook: catálogo completo de ítems ─────────────────────────────────────────

function useItemsCatalogo() {
  const [items,   setItems]   = useState<ItemCatalogo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("items")
      .select("id, nombre, imagen_url, categoria")
      .order("nombre")
      .then(({ data }) => { setItems(data ?? []); setLoading(false); });
  }, []);

  return { items, loading };
}

// ─── Hook: drops de esta criatura / variante ──────────────────────────────────

function useDrops(criaturaId: string, varianteId: string | null | undefined) {
  const [drops,   setDrops]   = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("criatura_drops")
      .select("id, item_id, items(id, nombre, imagen_url, categoria)")
      .eq("criatura_id", criaturaId);

    q = varianteId ? q.eq("variante_id", varianteId) : q.is("variante_id", null);

    const { data } = await q.order("created_at");
    setDrops(
      (data ?? []).map((r: any) => ({
        id:      r.id,
        item_id: r.item_id,
        item:    Array.isArray(r.items) ? r.items[0] : r.items,
      }))
    );
    setLoading(false);
  }, [criaturaId, varianteId]);

  useEffect(() => { load(); }, [load]);

  const add = async (item: ItemCatalogo) => {
    const payload: Record<string, unknown> = { criatura_id: criaturaId, item_id: item.id };
    if (varianteId) payload.variante_id = varianteId;

    const { data, error } = await supabase
      .from("criatura_drops")
      .insert([payload])
      .select("id, item_id, items(id, nombre, imagen_url, categoria)")
      .single();

    if (!error && data) {
      setDrops(prev => [
        ...prev,
        { id: data.id, item_id: data.item_id, item: Array.isArray(data.items) ? data.items[0] : data.items },
      ]);
    }
  };

  const remove = async (dropId: string) => {
    await supabase.from("criatura_drops").delete().eq("id", dropId);
    setDrops(prev => prev.filter(d => d.id !== dropId));
  };

  return { drops, loading, add, remove };
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function BloqueDrops({
  criaturaId,
  varianteId,
}: {
  criaturaId: string;
  varianteId?: string | null;
}) {
  const { items, loading: loadingItems } = useItemsCatalogo();
  const { drops, loading: loadingDrops, add, remove } = useDrops(criaturaId, varianteId);

  const [input, setInput] = useState("");
  const [open,  setOpen]  = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const asignadosIds = useMemo(() => new Set(drops.map(d => d.item_id)), [drops]);

  const filtrados = useMemo(() => {
    const norm = normalize(input);
    return items.filter(i => !asignadosIds.has(i.id) && normalize(i.nombre).includes(norm));
  }, [items, asignadosIds, input]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  if (loadingItems || loadingDrops) {
    return (
      <div className="flex items-center gap-2 py-2">
        <Loader2 size={13} className="animate-spin text-primary/20" />
        <span className="text-[10px] text-primary/25 italic">Cargando…</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">

      {/* Chips de drops asignados */}
      <div className="flex flex-wrap gap-1.5">
        {drops.map(drop => (
          <div
            key={drop.id}
            className="group flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-lg border transition-all"
            style={{
              border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
              background: "color-mix(in srgb, var(--primary) 4%, transparent)",
            }}
          >
            <div className="shrink-0 w-5 h-5 rounded-md overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
              {drop.item?.imagen_url
                ? <img src={drop.item.imagen_url} alt={drop.item.nombre} className="w-full h-full object-cover" />
                : <Package size={8} className="text-primary/20" />}
            </div>
            <span className="text-[10px] font-bold text-primary/60 tracking-wide leading-none">
              {drop.item?.nombre ?? "—"}
            </span>
            <button
              onClick={() => remove(drop.id)}
              className="shrink-0 opacity-0 group-hover:opacity-100 text-primary/25 hover:text-red-400 transition-all ml-0.5"
            >
              <X size={8} />
            </button>
          </div>
        ))}

        {/* Buscador inline como chip */}
        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-1 pl-2 pr-2.5 py-1 rounded-lg border border-dashed transition-all text-[10px] font-bold uppercase tracking-widest"
            style={{
              border: "1px dashed color-mix(in srgb, var(--primary) 20%, transparent)",
              color: "color-mix(in srgb, var(--primary) 35%, transparent)",
            }}
          >
            <Package size={8} />
            {drops.length === 0 ? "Añadir drop" : "+"}
          </button>

          {open && (
            <div className="absolute z-50 top-full left-0 mt-1 w-56 bg-white-custom border border-primary/15 rounded-xl shadow-xl overflow-hidden"
              style={{ background: "var(--bg-main, white)" }}>
              <div className="p-2 border-b border-primary/8">
                <input
                  autoFocus
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Buscar ítem…"
                  className="w-full bg-transparent text-[11px] font-medium text-primary outline-none placeholder:text-primary/25"
                />
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filtrados.length === 0 ? (
                  <p className="text-[9px] text-primary/25 text-center italic py-3">
                    {items.length === 0 ? "Sin ítems" : asignadosIds.size >= items.length ? "Todos añadidos" : "Sin resultados"}
                  </p>
                ) : (
                  filtrados.map(item => (
                    <button
                      key={item.id}
                      onMouseDown={() => { add(item); setInput(""); setOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-primary/8 transition-colors"
                    >
                      <div className="shrink-0 w-5 h-5 rounded-md overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
                        {item.imagen_url
                          ? <img src={item.imagen_url} alt={item.nombre} className="w-full h-full object-cover" />
                          : <Package size={9} className="text-primary/20" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-primary/70 truncate">{item.nombre}</p>
                        {item.categoria && <p className="text-[9px] text-primary/35 truncate">{item.categoria}</p>}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}