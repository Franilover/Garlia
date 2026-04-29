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
import { Package, X, Loader2, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { normalize } from "@/components/templates/EstudioTemplates";
import { INPUT_CLS } from "./types";

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
      {/* Buscador */}
      <div className="relative" ref={ref}>
        <input
          value={input}
          onChange={e => { setInput(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar ítem para añadir…"
          className={INPUT_CLS + " pr-8"}
        />
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary/30 hover:text-primary transition-colors"
        >
          <ChevronDown size={13} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>

        {open && filtrados.length === 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white-custom border border-primary/15 rounded-xl shadow-xl px-3 py-3">
            <p className="text-[9px] text-primary/25 text-center italic">
              {items.length === 0
                ? "No hay ítems en la base de datos"
                : asignadosIds.size >= items.length
                  ? "Todos los ítems ya están añadidos"
                  : "Sin resultados"}
            </p>
          </div>
        )}

        {open && filtrados.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white-custom border border-primary/15 rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
            {filtrados.map(item => (
              <button
                key={item.id}
                onMouseDown={() => { add(item); setInput(""); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-primary/8 transition-colors"
              >
                <div className="shrink-0 w-6 h-6 rounded-md overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
                  {item.imagen_url
                    ? <img src={item.imagen_url} alt={item.nombre} className="w-full h-full object-cover" />
                    : <Package size={10} className="text-primary/20" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-primary/70 truncate">{item.nombre}</p>
                  {item.categoria && <p className="text-[9px] text-primary/35 truncate">{item.categoria}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lista asignada */}
      {drops.length > 0 ? (
        <div className="space-y-1">
          {drops.map(drop => (
            <div
              key={drop.id}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl group border border-primary/10 bg-primary/3"
            >
              <div className="shrink-0 w-6 h-6 rounded-md overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
                {drop.item?.imagen_url
                  ? <img src={drop.item.imagen_url} alt={drop.item.nombre} className="w-full h-full object-cover" />
                  : <Package size={10} className="text-primary/20" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-primary/70 truncate">{drop.item?.nombre ?? "—"}</p>
                {drop.item?.categoria && <p className="text-[9px] text-primary/35 truncate">{drop.item.categoria}</p>}
              </div>
              <button
                onClick={() => remove(drop.id)}
                className="shrink-0 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 text-primary/25 hover:text-red-400 hover:bg-red-400/10 transition-all"
              >
                <X size={9} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[9px] text-primary/20 italic text-center py-2">Sin drops configurados</p>
      )}
    </div>
  );
}