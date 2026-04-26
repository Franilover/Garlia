"use client";

/**
 * BloqueHechizos.tsx
 * ─────────────────────────────────────────────────────────────────────
 * Hechizos del personaje. Don se maneja desde el tab Identidad.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Sparkles, Plus, X, Search, Loader2, Bug,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import type { Hechizo } from "./EditorHechizos";

const COLOR_HECHIZO = "oklch(0.65 0.18 290)";

// ─── Compatibilidad especie ───────────────────────────────────────────────────
function esCompatible(
  item: { criatura_id?: string | null; criatura?: { nombre: string } | null },
  especie: string | null | undefined,
): boolean {
  if (!item.criatura_id) return true;
  if (!especie?.trim())  return false;
  const criNombre = (item.criatura?.nombre ?? "").toLowerCase().trim();
  const esp       = especie.toLowerCase().trim();
  return esp.includes(criNombre) || criNombre.includes(esp);
}

// ─── Hook: catálogo hechizos ──────────────────────────────────────────────────
function useCatalogoHechizos() {
  const [hechizos, setHechizos] = useState<Hechizo[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    supabase
      .from("hechizos")
      .select("*, criatura:criaturas!criatura_id(id, nombre, imagen_url)")
      .order("nombre")
      .then(({ data }) => { setHechizos(data ?? []); setLoading(false); });
  }, []);

  return { hechizos, loading };
}

// ─── Hook: hechizos del personaje ─────────────────────────────────────────────
function usePersonajeHechizos(personajeId: string) {
  const [ids, setIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("personaje_hechizos")
      .select("hechizo_id")
      .eq("personaje_id", personajeId);
    setIds((data ?? []).map((r: any) => r.hechizo_id));
  }, [personajeId]);

  useEffect(() => { load(); }, [load]);

  const add = async (hechizoId: string) => {
    await supabase.from("personaje_hechizos").insert({ personaje_id: personajeId, hechizo_id: hechizoId });
    setIds(prev => [...prev, hechizoId]);
  };

  const remove = async (hechizoId: string) => {
    await supabase.from("personaje_hechizos")
      .delete()
      .eq("personaje_id", personajeId)
      .eq("hechizo_id", hechizoId);
    setIds(prev => prev.filter(id => id !== hechizoId));
  };

  return { ids, add, remove };
}

// ─── BloqueHechizos ───────────────────────────────────────────────────────────
export function BloqueHechizos({
  personajeId,
  especie,
}: {
  personajeId: string;
  especie?: string | null;
}) {
  const { hechizos, loading } = useCatalogoHechizos();
  const { ids: hechizoIds, add: addHechizo, remove: removeHechizo } = usePersonajeHechizos(personajeId);

  const [showPicker, setShowPicker] = useState(false);
  const [search,     setSearch]     = useState("");

  const noEspecie = !especie?.trim();

  const hechizosCompatibles = useMemo(() => hechizos.filter(h => esCompatible(h, especie)), [hechizos, especie]);
  const hechizosAsignados   = hechizosCompatibles.filter(h => hechizoIds.includes(h.id));
  const hechizosDisponibles = hechizosCompatibles.filter(h => !hechizoIds.includes(h.id));

  const filteredPicker = useMemo(
    () => hechizosDisponibles.filter(h =>
      h.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (h.criatura?.nombre ?? "").toLowerCase().includes(search.toLowerCase())
    ),
    [hechizosDisponibles, search]
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
            background: `color-mix(in srgb, ${COLOR_HECHIZO} 8%, transparent)`,
            border:     `1px solid color-mix(in srgb, ${COLOR_HECHIZO} 20%, transparent)`,
            color:      `color-mix(in srgb, ${COLOR_HECHIZO} 65%, transparent)`,
          }}
        >
          <Bug size={10} />
          Asigná una especie para ver hechizos disponibles
        </div>
      )}

      {/* Cabecera + botón añadir */}
      <div className="flex items-center gap-2">
        <Sparkles size={10} style={{ color: COLOR_HECHIZO }} />
        <span
          className="text-[9px] font-black uppercase tracking-[0.25em] flex-1"
          style={{ color: `color-mix(in srgb, ${COLOR_HECHIZO} 65%, transparent)` }}
        >
          Hechizos
        </span>
        {hechizosAsignados.length > 0 && (
          <span
            className="px-1.5 py-0.5 rounded-full text-[8px] font-black"
            style={{ background: `color-mix(in srgb, ${COLOR_HECHIZO} 12%, transparent)`, color: COLOR_HECHIZO }}
          >
            {hechizosAsignados.length}
          </span>
        )}
        {!noEspecie && (
          <button
            onClick={() => setShowPicker(o => !o)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all"
            style={showPicker ? {
              background:  `color-mix(in srgb, ${COLOR_HECHIZO} 12%, transparent)`,
              borderColor: `color-mix(in srgb, ${COLOR_HECHIZO} 25%, transparent)`,
              color:        COLOR_HECHIZO,
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
            borderColor: `color-mix(in srgb, ${COLOR_HECHIZO} 20%, transparent)`,
            background:  `color-mix(in srgb, ${COLOR_HECHIZO} 3%, transparent)`,
          }}
        >
          <div className="p-2 border-b" style={{ borderColor: `color-mix(in srgb, ${COLOR_HECHIZO} 12%, transparent)` }}>
            <div className="relative">
              <Search size={9} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary/25" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar hechizos compatibles…"
                className="w-full bg-primary/5 border border-primary/10 rounded-lg pl-7 pr-2 py-1.5 text-[10px] outline-none focus:border-primary/20 text-primary placeholder:text-primary/25"
              />
            </div>
          </div>
          <div className="max-h-44 overflow-y-auto p-1.5 space-y-0.5">
            {filteredPicker.length === 0 ? (
              <p className="text-[9px] text-primary/25 text-center py-4 italic">
                {search
                  ? "Sin resultados"
                  : hechizosDisponibles.length === 0
                    ? "Todos los hechizos compatibles ya están asignados"
                    : "Sin hechizos disponibles para esta especie"}
              </p>
            ) : filteredPicker.map(h => (
              <button
                key={h.id}
                onClick={() => { addHechizo(h.id); setSearch(""); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-primary/8 transition-colors"
              >
                <div className="shrink-0 w-5 h-5 rounded overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
                  {h.criatura?.imagen_url
                    ? <img src={h.criatura.imagen_url} alt="" className="w-full h-full object-cover" />
                    : <Sparkles size={9} style={{ color: COLOR_HECHIZO }} />}
                </div>
                <span className="flex-1 text-[11px] font-bold text-primary/80 truncate">✨ {h.nombre}</span>
                {h.criatura ? (
                  <span
                    className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-black"
                    style={{ background: `color-mix(in srgb, ${COLOR_HECHIZO} 10%, transparent)`, color: COLOR_HECHIZO }}
                  >
                    <Bug size={7} /> {h.criatura.nombre}
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
      {hechizosAsignados.length === 0 && !showPicker ? (
        <p className="text-[10px] text-primary/25 italic text-center py-4">
          {noEspecie ? "Asigná especie para ver hechizos" : "Sin hechizos asignados aún"}
        </p>
      ) : (
        <div className="space-y-1.5">
          {hechizosAsignados.map(h => (
            <div
              key={h.id}
              className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl group"
              style={{
                border:     `1px solid color-mix(in srgb, ${COLOR_HECHIZO} 15%, transparent)`,
                background: `color-mix(in srgb, ${COLOR_HECHIZO} 4%, transparent)`,
              }}
            >
              <div className="shrink-0 w-5 h-5 rounded overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center mt-0.5">
                {h.criatura?.imagen_url
                  ? <img src={h.criatura.imagen_url} alt="" className="w-full h-full object-cover" />
                  : <Sparkles size={9} style={{ color: COLOR_HECHIZO }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-primary/80">{h.nombre}</p>
                {h.criatura ? (
                  <span
                    className="inline-flex items-center gap-0.5 mt-0.5 px-1.5 py-0.5 rounded text-[8px] font-black"
                    style={{ background: `color-mix(in srgb, ${COLOR_HECHIZO} 10%, transparent)`, color: COLOR_HECHIZO }}
                  >
                    <Bug size={7} /> {h.criatura.nombre}
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
                onClick={() => removeHechizo(h.id)}
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