"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Sparkles, X, Loader2, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { normalize } from "@/components/templates/EstudioTemplates";
import { INPUT_CLS } from "./types";
import type { Hechizo } from "./EditorHechizos";

const COLOR = "oklch(0.65 0.18 290)";

function esCompatible(
  item: { criatura_id?: string | null; criatura?: { nombre: string } | null; variante_id?: string | null },
  especie: string | null | undefined,
  varianteId: string | null | undefined,
): boolean {
  if (!item.criatura_id) return true;
  if (!especie?.trim()) return false;
  const criNombre = (item.criatura?.nombre ?? "").toLowerCase().trim();
  const esp = especie.toLowerCase().trim();
  if (!esp.includes(criNombre) && !criNombre.includes(esp)) return false;
  if (item.variante_id) return item.variante_id === varianteId;
  return true;
}

function useCatalogo() {
  const [items, setItems] = useState<Hechizo[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase
      .from("hechizos")
      .select("*, criatura:criaturas!criatura_id(id, nombre, imagen_url), variante:criatura_variantes!variante_id(id, tipo)")
      .order("nombre")
      .then(({ data }) => { setItems(data ?? []); setLoading(false); });
  }, []);
  return { items, loading };
}

function useAsignados(personajeId: string) {
  const [ids, setIds] = useState<string[]>([]);
  const load = useCallback(async () => {
    const { data } = await supabase
      .from("personaje_hechizos")
      .select("hechizo_id")
      .eq("personaje_id", personajeId);
    setIds((data ?? []).map((r: any) => r.hechizo_id));
  }, [personajeId]);
  useEffect(() => { load(); }, [load]);

  const add = async (id: string) => {
    await supabase.from("personaje_hechizos").insert({ personaje_id: personajeId, hechizo_id: id });
    setIds(prev => [...prev, id]);
  };
  const remove = async (id: string) => {
    await supabase.from("personaje_hechizos").delete()
      .eq("personaje_id", personajeId).eq("hechizo_id", id);
    setIds(prev => prev.filter(x => x !== id));
  };
  return { ids, add, remove };
}

export function BloqueHechizos({ personajeId, especie, varianteId }: {
  personajeId: string; especie?: string | null; varianteId?: string | null;
}) {
  const { items, loading } = useCatalogo();
  const { ids, add, remove } = useAsignados(personajeId);
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const noEspecie = !especie?.trim();
  const compatibles = useMemo(() => items.filter(h => esCompatible(h, especie, varianteId)), [items, especie, varianteId]);
  const asignados   = compatibles.filter(h => ids.includes(h.id));
  const disponibles = compatibles.filter(h => !ids.includes(h.id));
  const filtrados   = useMemo(
    () => disponibles.filter(h =>
      normalize(h.nombre).includes(normalize(input)) ||
      normalize(h.criatura?.nombre ?? "").includes(normalize(input))
    ),
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

  if (loading) return <div className="flex justify-center py-4"><Loader2 size={14} className="animate-spin text-primary/20" /></div>;

  return (
    <div className="space-y-2">
      <div className="relative" ref={ref}>
        <input
          value={input}
          onChange={e => { setInput(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          disabled={noEspecie}
          placeholder={noEspecie ? "Asigná una especie primero…" : "Buscar hechizos compatibles…"}
          className={INPUT_CLS + " pr-8 disabled:opacity-40 disabled:cursor-not-allowed"}
        />
        <button type="button" onClick={() => !noEspecie && setOpen(o => !o)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary/30 hover:text-primary transition-colors">
          <ChevronDown size={13} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>

        {open && disponibles.length === 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white-custom border border-primary/15 rounded-xl shadow-xl px-3 py-3">
            <p className="text-[9px] text-primary/25 text-center italic">Todos los hechizos compatibles ya están asignados</p>
          </div>
        )}

        {open && filtrados.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white-custom border border-primary/15 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
            {filtrados.map(h => (
              <button key={h.id} onMouseDown={() => { add(h.id); setInput(""); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-primary/8 transition-colors">
                <div className="shrink-0 w-5 h-5 rounded overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
                  {h.criatura?.imagen_url
                    ? <img src={h.criatura.imagen_url} alt="" className="w-full h-full object-cover" />
                    : <Sparkles size={9} style={{ color: COLOR }} />}
                </div>
                <span className="flex-1 text-xs font-medium text-primary/70 truncate">{h.nombre}</span>
                {h.criatura
                  ? <span className="shrink-0 text-[8px] font-black px-1.5 py-0.5 rounded" style={{ background: `color-mix(in srgb, ${COLOR} 10%, transparent)`, color: COLOR }}>{h.criatura.nombre}{h.variante ? ` · ${h.variante.tipo}` : ""}</span>
                  : <span className="shrink-0 text-[8px] text-primary/20 italic">universal</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {asignados.length > 0 && (
        <div className="space-y-1">
          {asignados.map(h => (
            <div key={h.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl group"
              style={{ border: `1px solid color-mix(in srgb, ${COLOR} 12%, transparent)`, background: `color-mix(in srgb, ${COLOR} 3%, transparent)` }}>
              <div className="shrink-0 w-5 h-5 rounded overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
                {h.criatura?.imagen_url
                  ? <img src={h.criatura.imagen_url} alt="" className="w-full h-full object-cover" />
                  : <Sparkles size={9} style={{ color: COLOR }} />}
              </div>
              <span className="flex-1 text-xs font-medium text-primary/70 truncate">{h.nombre}</span>
              {h.criatura
                ? <span className="shrink-0 text-[8px] font-black px-1.5 py-0.5 rounded" style={{ background: `color-mix(in srgb, ${COLOR} 10%, transparent)`, color: COLOR }}>{h.criatura.nombre}{h.variante ? ` · ${h.variante.tipo}` : ""}</span>
                : <span className="shrink-0 text-[8px] text-primary/20 italic">universal</span>}
              <button onClick={() => remove(h.id)}
                className="shrink-0 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 text-primary/25 hover:text-red-400 hover:bg-red-400/10 transition-all">
                <X size={9} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}