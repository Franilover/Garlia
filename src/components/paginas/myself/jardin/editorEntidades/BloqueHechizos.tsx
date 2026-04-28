"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Sparkles, X, Loader2, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { normalize } from "@/components/templates/EstudioTemplates";
import { INPUT_CLS } from "./types";

// ─── Types locales ─────────────────────────────────────────────────────────────
type HechizoCatalogo = {
  id: string;
  nombre: string;
};

// Una fila de hechizo_criaturas: qué criaturas/variantes pueden usar cada hechizo
type Asignacion = {
  hechizo_id: string;
  criatura_id: string;
  variante_id: string | null;
  criatura_nombre: string;
};

// ─── Hook: catálogo completo de hechizos + sus asignaciones de criatura ────────
function useCatalogo() {
  const [hechizos,    setHechizos]    = useState<HechizoCatalogo[]>([]);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [loading, setLoading]          = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("hechizos").select("id, nombre").order("nombre"),
      supabase
        .from("hechizo_criaturas")
        .select("hechizo_id, criatura_id, variante_id, criatura:criaturas!criatura_id(nombre)"),
    ]).then(([hRes, aRes]) => {
      setHechizos(hRes.data ?? []);
      const rows = (aRes.data ?? []).map((r: any) => ({
        hechizo_id:      r.hechizo_id,
        criatura_id:     r.criatura_id,
        variante_id:     r.variante_id,
        criatura_nombre: (Array.isArray(r.criatura) ? r.criatura[0]?.nombre : r.criatura?.nombre) ?? "",
      }));
      setAsignaciones(rows);
      setLoading(false);
    });
  }, []);

  return { hechizos, asignaciones, loading };
}

// ─── Hook: hechizos asignados al personaje ─────────────────────────────────────
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

// ─── Lógica de compatibilidad ──────────────────────────────────────────────────
// Un hechizo es compatible si:
//   - No tiene ninguna asignación en hechizo_criaturas (universal), O
//   - Tiene al menos una asignación cuya criatura_nombre coincida con la especie del personaje
//     Y (si esa asignación tiene variante_id) ese variante_id coincide con el varianteId del personaje
function esCompatible(
  hechizo: HechizoCatalogo,
  asignaciones: Asignacion[],
  especie: string | null | undefined,
  varianteId: string | null | undefined,
): boolean {
  const propias = asignaciones.filter(a => a.hechizo_id === hechizo.id);
  if (propias.length === 0) return true; // universal

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

// ─── Componente principal ──────────────────────────────────────────────────────
export function BloqueHechizos({ personajeId, especie, varianteId }: {
  personajeId: string; especie?: string | null; varianteId?: string | null;
}) {
  const { hechizos, asignaciones, loading } = useCatalogo();
  const { ids, add, remove } = useAsignados(personajeId);
  const [input, setInput] = useState("");
  const [open, setOpen]   = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const noEspecie = !especie?.trim();

  const compatibles = useMemo(
    () => hechizos.filter(h => esCompatible(h, asignaciones, especie, varianteId)),
    [hechizos, asignaciones, especie, varianteId]
  );

  const asignados   = compatibles.filter(h => ids.includes(h.id));
  const disponibles = compatibles.filter(h => !ids.includes(h.id));

  const filtrados = useMemo(
    () => disponibles.filter(h => normalize(h.nombre).includes(normalize(input))),
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
            <p className="text-[9px] text-primary/25 text-center italic">
              Todos los hechizos compatibles ya están asignados
            </p>
          </div>
        )}

        {open && filtrados.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white-custom border border-primary/15 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
            {filtrados.map(h => (
              <button key={h.id}
                onMouseDown={() => { add(h.id); setInput(""); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-primary/8 transition-colors">
                <Sparkles size={9} className="shrink-0 text-primary/35" />
                <span className="flex-1 text-xs font-medium text-primary/70 truncate">{h.nombre}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {asignados.length > 0 && (
        <div className="space-y-1">
          {asignados.map(h => (
            <div key={h.id}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl group border border-primary/10 bg-primary/3">
              <Sparkles size={9} className="shrink-0 text-primary/40" />
              <span className="flex-1 text-xs font-medium text-primary/70 truncate">{h.nombre}</span>
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