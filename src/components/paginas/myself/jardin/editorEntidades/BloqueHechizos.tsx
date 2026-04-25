"use client";

/**
 * BloqueHechizos.tsx
 * ─────────────────────────────────────────────────────────────────────
 * Bloque de Magia para el tab de personaje.
 * Contiene:
 *  • Selector de Don (único por personaje)
 *  • Lista de Hechizos asignados al personaje + botón para añadir
 *
 * Props:
 *   personajeId — id del personaje activo
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Star, Sparkles, Plus, X, Search, Loader2, ChevronDown, Check,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import type { Hechizo, Don } from "./EditorHechizos";

// ─── Colores de acento ─────────────────────────────────────────────────────────
const COLOR_DON     = "oklch(0.7 0.16 55)";    // dorado
const COLOR_HECHIZO = "oklch(0.65 0.18 290)";  // violeta

// ─── Hook: cargar todos los hechizos / dones de la BD ─────────────────────────
function useCatalogoMagico() {
  const [hechizos, setHechizos] = useState<Hechizo[]>([]);
  const [dones,    setDones]    = useState<Don[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("hechizos").select("*").order("nombre"),
      supabase.from("dones")   .select("*").order("nombre"),
    ]).then(([h, d]) => {
      setHechizos(h.data ?? []);
      setDones(d.data ?? []);
      setLoading(false);
    });
  }, []);

  return { hechizos, dones, loading };
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

// ─── Hook: don del personaje ──────────────────────────────────────────────────
function usePersonajeDon(personajeId: string) {
  const [donId, setDonId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("personaje_dones")
      .select("don_id")
      .eq("personaje_id", personajeId)
      .limit(1)
      .maybeSingle();
    setDonId(data?.don_id ?? null);
  }, [personajeId]);

  useEffect(() => { load(); }, [load]);

  const set = async (newDonId: string | null) => {
    // Borramos el anterior (si existe) y ponemos el nuevo
    await supabase.from("personaje_dones").delete().eq("personaje_id", personajeId);
    if (newDonId) {
      await supabase.from("personaje_dones").insert({ personaje_id: personajeId, don_id: newDonId });
    }
    setDonId(newDonId);
  };

  return { donId, setDon: set };
}

// ─── Dropdown selector genérico ───────────────────────────────────────────────
function Dropdown({
  opciones,
  selectedId,
  onSelect,
  placeholder,
  color,
  Icon,
}: {
  opciones: { id: string; nombre: string; quien?: string }[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  placeholder: string;
  color: string;
  Icon: React.ElementType;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = opciones.find(o => o.id === selectedId);
  const filtered = useMemo(
    () => opciones.filter(o => o.nombre.toLowerCase().includes(search.toLowerCase())),
    [opciones, search]
  );

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all"
        style={selected ? {
          borderColor: `color-mix(in srgb, ${color} 25%, transparent)`,
          background:  `color-mix(in srgb, ${color} 6%, transparent)`,
        } : {
          borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
          background:  "color-mix(in srgb, var(--primary) 3%, transparent)",
        }}
      >
        <Icon size={12} style={{ color: selected ? color : "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
        <span className="flex-1 text-[11px] font-bold truncate" style={{ color: selected ? "var(--primary)" : "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
          {selected ? selected.nombre : placeholder}
        </span>
        {selected && (
          <button
            onClick={e => { e.stopPropagation(); onSelect(null); }}
            className="w-4 h-4 rounded flex items-center justify-center text-primary/30 hover:text-red-400 transition-colors"
          >
            <X size={9} />
          </button>
        )}
        <ChevronDown size={11} className="text-primary/30 transition-transform" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute z-50 top-full left-0 right-0 mt-1.5 rounded-xl border overflow-hidden shadow-xl"
            style={{
              background:   "var(--bg-main)",
              borderColor:  "color-mix(in srgb, var(--primary) 12%, transparent)",
            }}
          >
            {/* Search */}
            <div className="p-2 border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
              <div className="relative">
                <Search size={9} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary/25" />
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar…"
                  className="w-full bg-primary/5 border border-primary/10 rounded-lg pl-7 pr-2 py-1.5 text-[10px] outline-none focus:border-primary/25 text-primary placeholder:text-primary/25"
                />
              </div>
            </div>

            {/* Options */}
            <div className="max-h-48 overflow-y-auto p-1">
              {filtered.length === 0 ? (
                <p className="text-[9px] text-primary/25 text-center py-4 italic">Sin resultados</p>
              ) : (
                filtered.map(o => (
                  <button
                    key={o.id}
                    onMouseDown={() => { onSelect(o.id); setOpen(false); setSearch(""); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-primary/6 transition-colors"
                  >
                    {o.id === selectedId && <Check size={10} style={{ color }} />}
                    <span className="flex-1 text-[11px] font-medium text-primary/80 truncate">{o.nombre}</span>
                    {o.quien && (
                      <span
                        className="shrink-0 px-1.5 py-0.5 rounded text-[8px] font-black"
                        style={{ background: `color-mix(in srgb, ${color} 10%, transparent)`, color }}
                      >
                        {o.quien}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── BloqueHechizos (componente principal) ────────────────────────────────────
export function BloqueHechizos({ personajeId }: { personajeId: string }) {
  const { hechizos, dones, loading } = useCatalogoMagico();
  const { ids: hechizoIds, add: addHechizo, remove: removeHechizo } = usePersonajeHechizos(personajeId);
  const { donId, setDon } = usePersonajeDon(personajeId);

  const [showPicker, setShowPicker] = useState(false);
  const [search,     setSearch]     = useState("");

  // Hechizos ya asignados
  const hechizosAsignados = hechizos.filter(h => hechizoIds.includes(h.id));

  // Hechizos disponibles para añadir (los que NO tiene aún)
  const hechoizosDisponibles = hechizos.filter(h => !hechizoIds.includes(h.id));

  const filteredPicker = useMemo(
    () => hechoizosDisponibles.filter(h =>
      h.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (h.quien ?? "").toLowerCase().includes(search.toLowerCase())
    ),
    [hechoizosDisponibles, search]
  );

  const donActual = dones.find(d => d.id === donId) ?? null;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={18} className="animate-spin text-primary/20" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">

      {/* ── Don ────────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Star size={12} style={{ color: COLOR_DON }} />
          <label className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: `color-mix(in srgb, ${COLOR_DON} 70%, transparent)` }}>
            Don
          </label>
          {donActual?.quien && (
            <span
              className="px-2 py-0.5 rounded-full text-[8px] font-black"
              style={{ background: `color-mix(in srgb, ${COLOR_DON} 12%, transparent)`, color: COLOR_DON }}
            >
              {donActual.quien}
            </span>
          )}
        </div>

        <Dropdown
          opciones={dones}
          selectedId={donId}
          onSelect={setDon}
          placeholder="Sin don asignado…"
          color={COLOR_DON}
          Icon={Star}
        />

        {/* Preview explicación del don */}
        {donActual?.explicacion && (
          <p className="text-[10px] text-primary/40 italic leading-relaxed px-1 line-clamp-3">
            {donActual.explicacion.replace(/[#*`_~\[\]]/g, "").trim()}
          </p>
        )}
      </div>

      {/* ── Hechizos ───────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles size={12} style={{ color: COLOR_HECHIZO }} />
          <label className="text-[10px] font-black uppercase tracking-[0.25em] flex-1" style={{ color: `color-mix(in srgb, ${COLOR_HECHIZO} 70%, transparent)` }}>
            Hechizos
          </label>
          {hechizosAsignados.length > 0 && (
            <span
              className="px-2 py-0.5 rounded-full text-[8px] font-black"
              style={{ background: `color-mix(in srgb, ${COLOR_HECHIZO} 12%, transparent)`, color: COLOR_HECHIZO }}
            >
              {hechizosAsignados.length}
            </span>
          )}
          <button
            onClick={() => setShowPicker(o => !o)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all"
            style={showPicker ? {
              background:   `color-mix(in srgb, ${COLOR_HECHIZO} 12%, transparent)`,
              borderColor:  `color-mix(in srgb, ${COLOR_HECHIZO} 25%, transparent)`,
              color:         COLOR_HECHIZO,
            } : {
              background:   "transparent",
              borderColor:  "color-mix(in srgb, var(--primary) 12%, transparent)",
              color:         "color-mix(in srgb, var(--primary) 35%, transparent)",
            }}
          >
            <Plus size={9} /> Añadir
          </button>
        </div>

        {/* Picker de hechizos */}
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
                  placeholder="Buscar hechizos…"
                  className="w-full bg-primary/5 border border-primary/10 rounded-lg pl-7 pr-2 py-1.5 text-[10px] outline-none focus:border-primary/20 text-primary placeholder:text-primary/25"
                />
              </div>
            </div>
            <div className="max-h-44 overflow-y-auto p-1.5 space-y-0.5">
              {filteredPicker.length === 0 ? (
                <p className="text-[9px] text-primary/25 text-center py-4 italic">
                  {search ? "Sin resultados" : "Todos los hechizos ya están asignados"}
                </p>
              ) : (
                filteredPicker.map(h => (
                  <button
                    key={h.id}
                    onClick={() => { addHechizo(h.id); setSearch(""); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-primary/8 transition-colors"
                  >
                    <Plus size={9} style={{ color: COLOR_HECHIZO }} className="shrink-0" />
                    <span className="flex-1 text-[11px] font-bold text-primary/80 truncate">✨ {h.nombre}</span>
                    {h.quien && (
                      <span
                        className="shrink-0 px-1.5 py-0.5 rounded text-[8px] font-black"
                        style={{ background: `color-mix(in srgb, ${COLOR_HECHIZO} 10%, transparent)`, color: COLOR_HECHIZO }}
                      >
                        {h.quien}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Lista de hechizos asignados */}
        {hechizosAsignados.length === 0 && !showPicker ? (
          <p className="text-[10px] text-primary/25 italic text-center py-4">
            Sin hechizos asignados aún
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
                <Sparkles size={11} className="shrink-0 mt-0.5" style={{ color: COLOR_HECHIZO }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-primary/80">{h.nombre}</p>
                  {h.quien && (
                    <span
                      className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[8px] font-black"
                      style={{ background: `color-mix(in srgb, ${COLOR_HECHIZO} 10%, transparent)`, color: COLOR_HECHIZO }}
                    >
                      {h.quien}
                    </span>
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
    </div>
  );
}
