"use client";

/**
 * BloqueDones.tsx
 * ─────────────────────────────────────────────────────────────────────
 * Dones del personaje, filtrados por especie y variante.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Sparkles, Plus, X, Search, Loader2, Bug,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import type { Don } from "./EditorHechizos";

const COLOR_DON = "oklch(0.72 0.15 55)";

// ─── Compatibilidad especie + variante ───────────────────────────────────────
function esCompatible(
  item: { criatura_id?: string | null; criatura?: { nombre: string } | null; variante_id?: string | null },
  especie: string | null | undefined,
  varianteId: string | null | undefined,
): boolean {
  // Universal: sin criatura asignada → disponible para todos
  if (!item.criatura_id) return true;
  // Requiere especie: si el personaje no tiene especie no puede tenerlo
  if (!especie?.trim()) return false;
  const criNombre = (item.criatura?.nombre ?? "").toLowerCase().trim();
  const esp       = especie.toLowerCase().trim();
  const especieMatch = esp.includes(criNombre) || criNombre.includes(esp);
  if (!especieMatch) return false;
  // Si el don requiere variante específica, el personaje debe tener esa variante
  if (item.variante_id) return item.variante_id === varianteId;
  // Sin variante requerida → disponible para toda la especie
  return true;
}

// ─── Hook: catálogo dones ───────────────────────────────────────────────────────
function useCatalogoDones() {
  const [dones, setDones] = useState<Don[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("dones")
      .select("*, criatura:criaturas!criatura_id(id, nombre, imagen_url), variante:criatura_variantes!variante_id(id, tipo)")
      .order("nombre")
      .then(({ data }) => { setDones(data ?? []); setLoading(false); });
  }, []);

  return { dones, loading };
}

// ─── Hook: dones del personaje ──────────────────────────────────────────────────
function usePersonajeDones(personajeId: string) {
  const [ids, setIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("personaje_dones")
      .select("don_id")
      .eq("personaje_id", personajeId);
    setIds((data ?? []).map((r: any) => r.don_id));
  }, [personajeId]);

  useEffect(() => { load(); }, [load]);

  const add = async (donId: string) => {
    await supabase.from("personaje_dones").insert({ personaje_id: personajeId, don_id: donId });
    setIds(prev => [...prev, donId]);
  };

  const remove = async (donId: string) => {
    await supabase.from("personaje_dones")
      .delete()
      .eq("personaje_id", personajeId)
      .eq("don_id", donId);
    setIds(prev => prev.filter(id => id !== donId));
  };

  return { ids, add, remove };
}

// ─── BloqueDones ────────────────────────────────────────────────────────────────
export function BloqueDones({
  personajeId,
  especie,
  varianteId,
}: {
  personajeId: string;
  especie?: string | null;
  varianteId?: string | null;
}) {
  const { dones, loading } = useCatalogoDones();
  const { ids: donIds, add: addDon, remove: removeDon } = usePersonajeDones(personajeId);

  const [showPicker, setShowPicker] = useState(false);
  const [search,     setSearch]     = useState("");

  const noEspecie = !especie?.trim();

  const donesCompatibles = useMemo(() => dones.filter(d => esCompatible(d, especie, varianteId)), [dones, especie, varianteId]);
  const donesAsignados = donesCompatibles.filter(d => donIds.includes(d.id));
  const donesDisponibles = donesCompatibles.filter(d => !donIds.includes(d.id));

  const filteredPicker = useMemo(
    () => donesDisponibles.filter(d =>
      d.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (d.criatura?.nombre ?? "").toLowerCase().includes(search.toLowerCase())
    ),
    [donesDisponibles, search]
  );

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 size={16} className="animate-spin text-primary/20" />
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">

      {/* Aviso sin especie */}
      {noEspecie && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold"
          style={{
            background: `color-mix(in srgb, ${COLOR_DON} 8%, transparent)`,
            border:     `1px solid color-mix(in srgb, ${COLOR_DON} 20%, transparent)`,
            color:      `color-mix(in srgb, ${COLOR_DON} 65%, transparent)`,
          }}
        >
          <Bug size={10} />
          Asigná una especie para ver dones disponibles
        </div>
      )}

      {/* Aviso sin variante cuando hay dones que la requieren */}
      {!noEspecie && !varianteId && dones.some(d => d.criatura_id && d.variante_id) && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold"
          style={{
            background: `color-mix(in srgb, ${COLOR_DON} 5%, transparent)`,
            border:     `1px solid color-mix(in srgb, ${COLOR_DON} 12%, transparent)`,
            color:      `color-mix(in srgb, ${COLOR_DON} 50%, transparent)`,
          }}
        >
          <Bug size={10} />
          Algunos dones requieren una variante específica
        </div>
      )}

      {/* Cabecera + botón añadir */}
      <div className="flex items-center gap-2">
        <Sparkles size={10} style={{ color: COLOR_DON }} />
        <span
          className="text-[9px] font-black uppercase tracking-[0.25em] flex-1"
          style={{ color: `color-mix(in srgb, ${COLOR_DON} 65%, transparent)` }}
        >
          Dones
        </span>
        {donesAsignados.length > 0 && (
          <span
            className="px-1.5 py-0.5 rounded-full text-[8px] font-black"
            style={{ background: `color-mix(in srgb, ${COLOR_DON} 12%, transparent)`, color: COLOR_DON }}
          >
            {donesAsignados.length}
          </span>
        )}
        {!noEspecie && (
          <button
            onClick={() => setShowPicker(o => !o)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all"
            style={showPicker ? {
              background:  `color-mix(in srgb, ${COLOR_DON} 12%, transparent)`,
              borderColor: `color-mix(in srgb, ${COLOR_DON} 25%, transparent)`,
              color:        COLOR_DON,
            } : {
              background:  "transparent",
              borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
              color:       "color-mix(in srgb, var(--primary) 35%, transparent)",
            }}
          >
            <Plus size={8} /> Añadir
          </button>
        )}
      </div>

      {/* Picker */}
      {showPicker && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{
            borderColor: `color-mix(in srgb, ${COLOR_DON} 20%, transparent)`,
            background:  `color-mix(in srgb, ${COLOR_DON} 3%, transparent)`,
          }}
        >
          <div className="p-2 border-b" style={{ borderColor: `color-mix(in srgb, ${COLOR_DON} 12%, transparent)` }}>
            <div className="relative">
              <Search size={9} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary/25" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar dones compatibles…"
                className="w-full bg-primary/5 border border-primary/10 rounded-lg pl-7 pr-2 py-1.5 text-[10px] outline-none focus:border-primary/20 text-primary placeholder:text-primary/25"
              />
            </div>
          </div>
          <div className="max-h-44 overflow-y-auto p-1.5 space-y-0.5">
            {filteredPicker.length === 0 ? (
              <p className="text-[9px] text-primary/25 text-center py-4 italic">
                {search
                  ? "Sin resultados"
                  : donesDisponibles.length === 0
                    ? "Todos los dones compatibles ya están asignados"
                    : "Sin dones disponibles para esta especie"}
              </p>
            ) : filteredPicker.map(d => (
              <button
                key={d.id}
                onClick={() => { addDon(d.id); setSearch(""); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-primary/8 transition-colors"
              >
                <div className="shrink-0 w-5 h-5 rounded overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
                  {d.criatura?.imagen_url
                    ? <img src={d.criatura.imagen_url} alt="" className="w-full h-full object-cover" />
                    : <Sparkles size={9} style={{ color: COLOR_DON }} />}
                </div>
                <span className="flex-1 text-[11px] font-bold text-primary/80 truncate">{d.nombre}</span>
                {d.criatura ? (
                  <span
                    className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-black"
                    style={{ background: `color-mix(in srgb, ${COLOR_DON} 10%, transparent)`, color: COLOR_DON }}
                  >
                    <Bug size={7} /> {d.criatura.nombre}{d.variante ? ` · ${d.variante.tipo}` : ""}
                  </span>
                ) : (
                  <span className="shrink-0 text-[8px] text-primary/20 italic">universal</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lista asignados */}
      {donesAsignados.length === 0 && !showPicker ? (
        <p className="text-[10px] text-primary/25 italic text-center py-4">
          {noEspecie ? "Asigná especie para ver dones" : "Sin dones asignados aún"}
        </p>
      ) : (
        <div className="space-y-1.5">
          {donesAsignados.map(h => (
            <div
              key={d.id}
              className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl group"
              style={{
                border:     `1px solid color-mix(in srgb, ${COLOR_DON} 15%, transparent)`,
                background: `color-mix(in srgb, ${COLOR_DON} 4%, transparent)`,
              }}
            >
              <div className="shrink-0 w-5 h-5 rounded overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center mt-0.5">
                {h.criatura?.imagen_url
                  ? <img src={h.criatura.imagen_url} alt="" className="w-full h-full object-cover" />
                  : <Sparkles size={9} style={{ color: COLOR_DON }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-primary/80">{h.nombre}</p>
                {h.criatura ? (
                  <span
                    className="inline-flex items-center gap-0.5 mt-0.5 px-1.5 py-0.5 rounded text-[8px] font-black"
                    style={{ background: `color-mix(in srgb, ${COLOR_DON} 10%, transparent)`, color: COLOR_DON }}
                  >
                    <Bug size={7} /> {d.criatura.nombre}{d.variante ? ` · ${d.variante.tipo}` : ""}
                  </span>
                ) : (
                  <span className="text-[8px] text-primary/20 italic">universal</span>
                )}
                {h.explicacion && (
                  <p className="text-[10px] text-primary/35 mt-1 leading-relaxed line-clamp-2 italic">
                    {h.explicacion.replace(/[#*`_~\[\]]/g, "").trim()}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeDon(h.id)}
                className="shrink-0 w-5 h-5 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 text-primary/30 hover:text-red-400 hover:bg-red-400/10 transition-all"
              >
                <X size={9} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}