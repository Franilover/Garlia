"use client";

/**
 * BloqueHechizos.tsx
 * ─────────────────────────────────────────────────────────────────────
 * Bloque de Magia del tab de personaje.
 * • Filtra hechizos/dones según la especie del personaje (via criatura_id).
 * • Hechizos/dones sin criatura asignada son universales (siempre disponibles).
 * • Hechizos/dones con criatura asignada solo aparecen si el nombre de la
 *   criatura coincide (contains) con la especie del personaje.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Star, Sparkles, Plus, X, Search, Loader2, ChevronDown, Check, Bug,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import type { Hechizo, Don } from "./EditorHechizos";

const COLOR_DON     = "oklch(0.7 0.16 55)";
const COLOR_HECHIZO = "oklch(0.65 0.18 290)";

// ─── Compatibilidad especie ───────────────────────────────────────────────────
// Sin criatura → universal. Con criatura → solo si nombre contiene especie o viceversa.
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

// ─── Hook: catálogo con join a criaturas ──────────────────────────────────────
function useCatalogoMagico() {
  const [hechizos, setHechizos] = useState<Hechizo[]>([]);
  const [dones,    setDones]    = useState<Don[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("hechizos").select("*, criatura:criaturas!criatura_id(id, nombre, imagen_url)").order("nombre"),
      supabase.from("dones")   .select("*, criatura:criaturas!criatura_id(id, nombre, imagen_url)").order("nombre"),
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
    await supabase.from("personaje_dones").delete().eq("personaje_id", personajeId);
    if (newDonId) {
      await supabase.from("personaje_dones").insert({ personaje_id: personajeId, don_id: newDonId });
    }
    setDonId(newDonId);
  };

  return { donId, setDon: set };
}

// ─── Dropdown selector (con imagen criatura) ──────────────────────────────────
function Dropdown({
  opciones, selectedId, onSelect, placeholder, color, Icon,
}: {
  opciones: (Hechizo | Don)[];
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
    () => opciones.filter(o =>
      o.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (o.criatura?.nombre ?? "").toLowerCase().includes(search.toLowerCase())
    ),
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
        {/* Miniatura criatura o icono */}
        <div className="shrink-0 w-5 h-5 rounded overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
          {selected?.criatura?.imagen_url
            ? <img src={selected.criatura.imagen_url} alt="" className="w-full h-full object-cover" />
            : <Icon size={10} style={{ color: selected ? color : "color-mix(in srgb, var(--primary) 30%, transparent)" }} />}
        </div>

        <span
          className="flex-1 text-[11px] font-bold truncate"
          style={{ color: selected ? "var(--primary)" : "color-mix(in srgb, var(--primary) 35%, transparent)" }}
        >
          {selected ? selected.nombre : placeholder}
        </span>

        {/* Badge criatura */}
        {selected?.criatura && (
          <span
            className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-black"
            style={{ background: `color-mix(in srgb, ${color} 10%, transparent)`, color }}
          >
            <Bug size={7} /> {selected.criatura.nombre}
          </span>
        )}

        {selected && (
          <button
            onClick={e => { e.stopPropagation(); onSelect(null); }}
            className="w-4 h-4 rounded flex items-center justify-center text-primary/30 hover:text-red-400 transition-colors"
          >
            <X size={9} />
          </button>
        )}

        <ChevronDown
          size={11}
          className="text-primary/30 transition-transform shrink-0"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute z-50 top-full left-0 right-0 mt-1.5 rounded-xl border overflow-hidden shadow-xl"
            style={{
              background:  "var(--bg-main)",
              borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
            }}
          >
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

            <div className="max-h-48 overflow-y-auto p-1">
              {filtered.length === 0 ? (
                <p className="text-[9px] text-primary/25 text-center py-4 italic">Sin resultados</p>
              ) : filtered.map(o => (
                <button
                  key={o.id}
                  onMouseDown={() => { onSelect(o.id); setOpen(false); setSearch(""); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-primary/6 transition-colors"
                >
                  <div className="shrink-0 w-5 h-5 rounded overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
                    {o.criatura?.imagen_url
                      ? <img src={o.criatura.imagen_url} alt="" className="w-full h-full object-cover" />
                      : <Icon size={9} style={{ color }} />}
                  </div>
                  {o.id === selectedId && <Check size={10} style={{ color }} className="shrink-0" />}
                  <span className="flex-1 text-[11px] font-medium text-primary/80 truncate">{o.nombre}</span>
                  {o.criatura && (
                    <span
                      className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-black"
                      style={{ background: `color-mix(in srgb, ${color} 10%, transparent)`, color }}
                    >
                      <Bug size={7} /> {o.criatura.nombre}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── BloqueHechizos ───────────────────────────────────────────────────────────
export function BloqueHechizos({
  personajeId,
  especie,
}: {
  personajeId: string;
  especie?: string | null;
}) {
  const { hechizos, dones, loading } = useCatalogoMagico();
  const { ids: hechizoIds, add: addHechizo, remove: removeHechizo } = usePersonajeHechizos(personajeId);
  const { donId, setDon } = usePersonajeDon(personajeId);

  const [showPicker, setShowPicker] = useState(false);
  const [search,     setSearch]     = useState("");

  const noEspecie = !especie?.trim();

  // Filtrar por especie
  const donesCompatibles    = useMemo(() => dones.filter(d => esCompatible(d, especie)),    [dones, especie]);
  const hechizosCompatibles = useMemo(() => hechizos.filter(h => esCompatible(h, especie)), [hechizos, especie]);

  // Asignados (de compatibles)
  const hechizosAsignados = hechizosCompatibles.filter(h => hechizoIds.includes(h.id));

  // Disponibles para añadir
  const hechizosDisponibles = hechizosCompatibles.filter(h => !hechizoIds.includes(h.id));

  const filteredPicker = useMemo(
    () => hechizosDisponibles.filter(h =>
      h.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (h.criatura?.nombre ?? "").toLowerCase().includes(search.toLowerCase())
    ),
    [hechizosDisponibles, search]
  );

  const donActual = dones.find(d => d.id === donId) ?? null;
  const donCompatible = donActual ? esCompatible(donActual, especie) : true;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={18} className="animate-spin text-primary/20" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">

      {/* Aviso sin especie */}
      {noEspecie && (
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-bold"
          style={{
            background: "color-mix(in srgb, oklch(0.7 0.16 55) 8%, transparent)",
            border:     "1px solid color-mix(in srgb, oklch(0.7 0.16 55) 20%, transparent)",
            color:      "color-mix(in srgb, oklch(0.7 0.16 55) 70%, transparent)",
          }}
        >
          <Bug size={11} />
          Asigná una especie al personaje para ver hechizos y dones disponibles
        </div>
      )}

      {/* ── Don ────────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Star size={12} style={{ color: COLOR_DON }} />
          <label
            className="text-[10px] font-black uppercase tracking-[0.25em] flex-1"
            style={{ color: `color-mix(in srgb, ${COLOR_DON} 70%, transparent)` }}
          >
            Don
          </label>
          {donActual?.criatura && (
            <span
              className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[8px] font-black"
              style={{ background: `color-mix(in srgb, ${COLOR_DON} 12%, transparent)`, color: COLOR_DON }}
            >
              <Bug size={7} /> {donActual.criatura.nombre}
            </span>
          )}
        </div>

        <Dropdown
          opciones={donesCompatibles}
          selectedId={donId}
          onSelect={setDon}
          placeholder={noEspecie ? "Asigná especie primero…" : "Sin don asignado…"}
          color={COLOR_DON}
          Icon={Star}
        />

        {/* Warning si el don ya no es compatible tras cambio de especie */}
        {donActual && !donCompatible && (
          <p className="text-[9px] italic text-amber-400/70 px-1">
            ⚠️ Este don fue asignado antes de cambiar la especie y puede no ser compatible
          </p>
        )}

        {donActual?.explicacion && (
          <p className="text-[10px] text-primary/40 italic leading-relaxed px-1 line-clamp-3">
            {donActual.explicacion.replace(/[#*`_~\[\]]/g, "").trim()}
          </p>
        )}

        {!noEspecie && donesCompatibles.length === 0 && !donActual && (
          <p className="text-[9px] text-primary/25 italic px-1">
            No hay dones disponibles para esta especie
          </p>
        )}
      </div>

      {/* ── Hechizos ───────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles size={12} style={{ color: COLOR_HECHIZO }} />
          <label
            className="text-[10px] font-black uppercase tracking-[0.25em] flex-1"
            style={{ color: `color-mix(in srgb, ${COLOR_HECHIZO} 70%, transparent)` }}
          >
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
          {!noEspecie && (
            <button
              onClick={() => setShowPicker(o => !o)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all"
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
              <Plus size={9} /> Añadir
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
    </div>
  );
}
