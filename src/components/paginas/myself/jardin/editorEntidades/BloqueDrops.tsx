"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Package, X, Loader2, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { normalize } from "@/components/templates/EstudioTemplates";
import { INPUT_CLS } from "./types";

// ─── Types ─────────────────────────────────────────────────────────────────────
type ItemCatalogo = {
  id: string;
  nombre: string;
  imagen_url?: string | null;
  categoria?: string | null;
};

// ─── Hook: catálogo de items ───────────────────────────────────────────────────
function useItemsCatalogo() {
  const [items,   setItems]   = useState<ItemCatalogo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("items")
      .select("id, nombre, imagen_url, categoria")
      .order("nombre")
      .then(({ data }) => {
        setItems(data ?? []);
        setLoading(false);
      });
  }, []);

  return { items, loading };
}

// ─── Hook: drops asignados a criatura (y opcionalmente variante) ───────────────
function useDrops(criaturaId: string, varianteId: string | null) {
  const [itemIds, setItemIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    let query = supabase
      .from("criatura_drops")
      .select("item_id")
      .eq("criatura_id", criaturaId);

    if (varianteId) {
      query = query.eq("variante_id", varianteId);
    } else {
      query = query.is("variante_id", null);
    }

    const { data } = await query;
    setItemIds((data ?? []).map((r: any) => r.item_id));
  }, [criaturaId, varianteId]);

  useEffect(() => { load(); }, [load]);

  const add = async (itemId: string) => {
    await supabase.from("criatura_drops").insert({
      criatura_id: criaturaId,
      variante_id: varianteId ?? null,
      item_id: itemId,
    });
    setItemIds(prev => [...prev, itemId]);
  };

  const remove = async (itemId: string) => {
    let query = supabase
      .from("criatura_drops")
      .delete()
      .eq("criatura_id", criaturaId)
      .eq("item_id", itemId);

    if (varianteId) {
      query = query.eq("variante_id", varianteId);
    } else {
      query = query.is("variante_id", null);
    }

    await query;
    setItemIds(prev => prev.filter(id => id !== itemId));
  };

  return { itemIds, add, remove };
}

// ─── Componente principal ──────────────────────────────────────────────────────
export function BloqueDrops({
  criaturaId,
  varianteId = null,
}: {
  criaturaId: string;
  varianteId?: string | null;
}) {
  const { items, loading } = useItemsCatalogo();
  const { itemIds, add, remove } = useDrops(criaturaId, varianteId);
  const [input, setInput] = useState("");
  const [open,  setOpen]  = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const asignados   = items.filter(i => itemIds.includes(i.id));
  const disponibles = items.filter(i => !itemIds.includes(i.id));

  const filtrados = useMemo(
    () => disponibles.filter(i => normalize(i.nombre).includes(normalize(input))),
    [disponibles, input]
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (loading) return (
    <div className="flex justify-center py-4">
      <Loader2 size={14} className="animate-spin text-primary/20" />
    </div>
  );

  return (
    <div className="space-y-2">
      {/* Selector */}
      <div className="relative" ref={ref}>
        <input
          value={input}
          onChange={e => { setInput(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar item…"
          className={INPUT_CLS + " pr-8"}
        />
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary/30 hover:text-primary transition-colors"
        >
          <ChevronDown size={13} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>

        {open && disponibles.length === 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white-custom border border-primary/15 rounded-xl shadow-xl px-3 py-3">
            <p className="text-[9px] text-primary/25 text-center italic">
              Todos los items ya están asignados
            </p>
          </div>
        )}

        {open && filtrados.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white-custom border border-primary/15 rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
            {filtrados.map(item => (
              <button
                key={item.id}
                onMouseDown={() => { add(item.id); setInput(""); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-primary/8 transition-colors"
              >
                <div className="shrink-0 w-6 h-6 rounded-lg overflow-hidden bg-primary/8 border border-primary/10 flex items-center justify-center">
                  {item.imagen_url
                    ? <img src={item.imagen_url} alt={item.nombre} className="w-full h-full object-cover" />
                    : <Package size={9} className="text-primary/30" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-primary/70 truncate">{item.nombre}</p>
                  {item.categoria && (
                    <p className="text-[9px] text-primary/30 truncate">{item.categoria}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lista de drops asignados */}
      {asignados.length > 0 && (
        <div className="space-y-1">
          {asignados.map(item => (
            <div
              key={item.id}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl group border border-primary/10 bg-primary/3"
            >
              <div className="shrink-0 w-6 h-6 rounded-lg overflow-hidden bg-primary/8 border border-primary/10 flex items-center justify-center">
                {item.imagen_url
                  ? <img src={item.imagen_url} alt={item.nombre} className="w-full h-full object-cover" />
                  : <Package size={9} className="text-primary/30" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-primary/70 truncate">{item.nombre}</p>
                {item.categoria && (
                  <p className="text-[9px] text-primary/30 truncate">{item.categoria}</p>
                )}
              </div>
              <button
                onClick={() => remove(item.id)}
                className="shrink-0 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 text-primary/25 hover:text-red-400 hover:bg-red-400/10 transition-all"
              >
                <X size={9} />
              </button>
            </div>
          ))}
        </div>
      )}

      {asignados.length === 0 && (
        <p className="text-[10px] text-primary/20 italic text-center py-2">
          Sin drops asignados
        </p>
      )}
    </div>
  );
}
