"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Star, X, Loader2, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { normalize } from "@/components/templates/EstudioTemplates";
import { INPUT_CLS } from "./types";
import type { Don } from "./EditorHechizos";

const COLOR = "oklch(0.72 0.15 55)";

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
  const [items, setItems] = useState<Don[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase
      .from("dones")
      .select("*, criatura:criaturas!criatura_id(id, nombre, imagen_url), variante:criatura_variantes!variante_id(id, tipo)")
      .order("nombre")
      .then(({ data }) => { setItems(data ?? []); setLoading(false); });
  }, []);
  return { items, loading };
}

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
    // Primero eliminar el anterior si existe
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

export function BloqueDones({ personajeId, especie, varianteId }: {
  personajeId: string; especie?: string | null; varianteId?: string | null;
}) {
  const { items, loading: loadingCatalogo } = useCatalogo();
  const { donId, loading: loadingAsignado, assign, clear } = useAsignado(personajeId);
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const noEspecie = !especie?.trim();

  const compatibles = useMemo(
    () => items.filter(h => esCompatible(h, especie, varianteId)),
    [items, especie, varianteId]
  );

  const donActual = compatibles.find(h => h.id === donId) ?? null;

  const disponibles = compatibles.filter(h => h.id !== donId);
  const filtrados = useMemo(
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

  if (loadingCatalogo || loadingAsignado) {
    return (
      <div className="flex items-center gap-2 py-1">
        <Loader2 size={11} className="animate-spin text-primary/20" />
        <span className="text-[10px] text-primary/25 italic">Cargando…</span>
      </div>
    );
  }

  // ── Si hay don asignado: vista minimalista de solo lectura + botón quitar ──
  if (donActual) {
    return (
      <div
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border w-fit"
        style={{
          borderColor: `color-mix(in srgb, ${COLOR} 20%, transparent)`,
          background: `color-mix(in srgb, ${COLOR} 5%, transparent)`,
        }}
      >
        <Star size={10} style={{ color: COLOR }} className="shrink-0" />
        <span
          className="text-[11px] font-bold"
          style={{ color: `color-mix(in srgb, ${COLOR} 80%, var(--primary))` }}
        >
          {donActual.nombre}
        </span>
        <button
          onClick={clear}
          className="w-4 h-4 rounded flex items-center justify-center transition-colors text-primary/20 hover:text-red-400"
          title="Quitar don"
        >
          <X size={9} />
        </button>
      </div>
    );
  }

  // ── Sin don: selector ───────────────────────────────────────────────────────
  return (
    <div className="relative" ref={ref}>
      <input
        value={input}
        onChange={e => { setInput(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        disabled={noEspecie}
        placeholder={noEspecie ? "Asigná una especie primero…" : "Buscar don compatible…"}
        className={INPUT_CLS + " pr-8 disabled:opacity-40 disabled:cursor-not-allowed text-xs"}
      />
      <button
        type="button"
        onClick={() => !noEspecie && setOpen(o => !o)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary/30 hover:text-primary transition-colors"
      >
        <ChevronDown size={13} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && disponibles.length === 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white-custom border border-primary/15 rounded-xl shadow-xl px-3 py-3">
          <p className="text-[9px] text-primary/25 text-center italic">Sin dones compatibles disponibles</p>
        </div>
      )}

      {open && filtrados.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white-custom border border-primary/15 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
          {filtrados.map(h => (
            <button
              key={h.id}
              onMouseDown={() => { assign(h.id); setInput(""); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-primary/8 transition-colors"
            >
              <div className="shrink-0 w-5 h-5 rounded overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
                {h.criatura?.imagen_url
                  ? <img src={h.criatura.imagen_url} alt="" className="w-full h-full object-cover" />
                  : <Star size={9} style={{ color: COLOR }} />}
              </div>
              <span className="flex-1 text-xs font-medium text-primary/70 truncate">{h.nombre}</span>
              {h.criatura
                ? (
                  <span
                    className="shrink-0 text-[8px] font-black px-1.5 py-0.5 rounded"
                    style={{ background: `color-mix(in srgb, ${COLOR} 10%, transparent)`, color: COLOR }}
                  >
                    {h.criatura.nombre}{h.variante ? ` · ${h.variante.tipo}` : ""}
                  </span>
                )
                : <span className="shrink-0 text-[8px] text-primary/20 italic">universal</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}