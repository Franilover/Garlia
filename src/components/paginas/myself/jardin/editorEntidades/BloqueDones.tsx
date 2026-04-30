"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { X, Loader2, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { normalize } from "@/components/templates/EstudioTemplates";
import { INPUT_CLS } from "./types";

// ─── Types locales ─────────────────────────────────────────────────────────────
type DonCatalogo = {
  id: string;
  nombre: string;
};

type Asignacion = {
  don_id:          string;
  criatura_id:     string;
  variante_id:     string | null;
  criatura_nombre: string;
};

// ─── Hook: catálogo + asignaciones de criatura ────────────────────────────────
function useCatalogo() {
  const [dones,       setDones]       = useState<DonCatalogo[]>([]);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [loading, setLoading]          = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("dones").select("id, nombre").order("nombre"),
      supabase
        .from("don_criaturas")
        .select("don_id, criatura_id, variante_id, criatura:criaturas!criatura_id(nombre)"),
    ]).then(([dRes, aRes]) => {
      setDones(dRes.data ?? []);
      const rows = (aRes.data ?? []).map((r: any) => ({
        don_id:          r.don_id,
        criatura_id:     r.criatura_id,
        variante_id:     r.variante_id,
        criatura_nombre: (Array.isArray(r.criatura) ? r.criatura[0]?.nombre : r.criatura?.nombre) ?? "",
      }));
      setAsignaciones(rows);
      setLoading(false);
    });
  }, []);

  return { dones, asignaciones, loading };
}

// ─── Hook: don asignado al personaje (solo uno) ───────────────────────────────
function useAsignado(personajeId: string) {
  const [donId, setDonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("personaje_dones")
      .select("don_id")
      .eq("personaje_id", personajeId)
      .limit(1)
      .maybeSingle();
    setDonId(data?.don_id ?? null);
    setLoading(false);
  }, [personajeId]);

  useEffect(() => { load(); }, [load]);

  const assign = async (id: string) => {
    await supabase.from("personaje_dones").delete().eq("personaje_id", personajeId);
    await supabase.from("personaje_dones").insert({ personaje_id: personajeId, don_id: id });
    setDonId(id);
  };

  const clear = async () => {
    await supabase.from("personaje_dones").delete().eq("personaje_id", personajeId);
    setDonId(null);
  };

  return { donId, loading, assign, clear };
}

// ─── Lógica de compatibilidad ─────────────────────────────────────────────────
function esCompatible(
  don: DonCatalogo,
  asignaciones: Asignacion[],
  especie: string | null | undefined,
  varianteId: string | null | undefined,
): boolean {
  const propias = asignaciones.filter(a => a.don_id === don.id);
  if (propias.length === 0) return true;

  if (!especie?.trim()) return false;
  const esp = especie.toLowerCase().trim();

  return propias.some(a => {
    const criNombre = a.criatura_nombre.toLowerCase().trim();
    const nombreMatch = esp.includes(criNombre) || criNombre.includes(esp);
    if (!nombreMatch) return false;
    if (a.variante_id) return a.variante_id === varianteId;
    return true;
  });
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function BloqueDones({ personajeId, especie, varianteId }: {
  personajeId: string; especie?: string | null; varianteId?: string | null;
}) {
  const { dones, asignaciones, loading: loadingCatalogo } = useCatalogo();
  const { donId, loading: loadingAsignado, assign, clear } = useAsignado(personajeId);
  const [input, setInput] = useState("");
  const [open,  setOpen]  = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const noEspecie = !especie?.trim();

  const compatibles = useMemo(
    () => dones.filter(d => esCompatible(d, asignaciones, especie, varianteId)),
    [dones, asignaciones, especie, varianteId]
  );

  const donActual   = compatibles.find(d => d.id === donId) ?? null;
  const disponibles = compatibles.filter(d => d.id !== donId);

  const filtrados = useMemo(
    () => disponibles.filter(d => normalize(d.nombre).includes(normalize(input))),
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

  return (
    <div className="space-y-1.5" ref={ref}>
      <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">Don</label>
      <div className="relative">
        {/* Si hay don asignado mostramos su nombre en el input con X para quitar */}
        {donActual ? (
          <div className={INPUT_CLS + " pr-8 flex items-center"}>
            {loadingCatalogo || loadingAsignado
              ? <Loader2 size={10} className="animate-spin text-primary/20" />
              : <span className="flex-1 text-xs font-medium text-primary/70 truncate">{donActual.nombre}</span>
            }
            <button
              onClick={clear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary/30 hover:text-red-400 transition-colors"
              title="Quitar don"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <>
            <input
              value={input}
              onChange={e => { setInput(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              disabled={noEspecie || loadingCatalogo || loadingAsignado}
              placeholder={
                loadingCatalogo || loadingAsignado ? "Cargando…"
                : noEspecie ? "Sin especie…"
                : "Buscar don…"
              }
              className={INPUT_CLS + " pr-8 disabled:opacity-40 disabled:cursor-not-allowed"}
            />
            <button
              type="button"
              onClick={() => !noEspecie && setOpen(o => !o)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary/30 hover:text-primary transition-colors"
            >
              <ChevronDown size={13} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
            </button>

            {open && disponibles.length === 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white-custom border border-primary/15 rounded-xl shadow-xl px-3 py-2.5">
                <p className="text-[9px] text-primary/25 text-center italic">Sin dones compatibles</p>
              </div>
            )}

            {open && filtrados.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white-custom border border-primary/15 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                {filtrados.map(d => (
                  <button key={d.id}
                    onMouseDown={() => { assign(d.id); setInput(""); setOpen(false); }}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-primary/70 hover:bg-primary/8 hover:text-primary transition-colors">
                    {d.nombre}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}