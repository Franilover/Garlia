"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Bug, X, Loader2, ChevronDown, GitBranch, Percent } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { normalize } from "@/components/templates/EstudioTemplates";
import { INPUT_CLS } from "./types";

// ─── Types ─────────────────────────────────────────────────────────────────────
type CriaturaCatalogo = {
  id: string;
  nombre: string;
  imagen_url?: string | null;
};

type VarianteCatalogo = {
  id: string;
  tipo: string;
  criatura_id: string;
};

type FuenteRow = {
  id: string;          // PK de criatura_drops
  criatura_id: string;
  criatura_nombre: string;
  criatura_imagen?: string | null;
  variante_id?: string | null;
  variante_tipo?: string | null;
  probabilidad?: number | null;
};

// ─── Hook: catálogo de criaturas y variantes ───────────────────────────────────
function useCatalogoCriaturas() {
  const [criaturas, setCriaturas] = useState<CriaturaCatalogo[]>([]);
  const [variantes, setVariantes] = useState<VarianteCatalogo[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("criaturas").select("id, nombre, imagen_url").order("nombre"),
      supabase.from("criatura_variantes").select("id, tipo, criatura_id").order("tipo"),
    ]).then(([cRes, vRes]) => {
      setCriaturas(cRes.data ?? []);
      setVariantes(vRes.data ?? []);
      setLoading(false);
    });
  }, []);

  return { criaturas, variantes, loading };
}

// ─── Hook: fuentes de drops para un item ─────────────────────────────────────
function useFuentes(itemId: string) {
  const [fuentes, setFuentes] = useState<FuenteRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("criatura_drops")
      .select("id, criatura_id, variante_id, probabilidad, criaturas(nombre, imagen_url), criatura_variantes(tipo)")
      .eq("item_id", itemId)
      .order("probabilidad", { ascending: false });

    setFuentes((data ?? []).map((r: any) => ({
      id:              r.id,
      criatura_id:     r.criatura_id,
      criatura_nombre: r.criaturas?.nombre    ?? "",
      criatura_imagen: r.criaturas?.imagen_url ?? null,
      variante_id:     r.variante_id           ?? null,
      variante_tipo:   r.criatura_variantes?.tipo ?? null,
      probabilidad:    r.probabilidad          ?? null,
    })));
    setLoading(false);
  }, [itemId]);

  useEffect(() => { load(); }, [load]);

  const add = async (criaturaId: string, varianteId?: string | null, probabilidad?: number | null) => {
    const { data, error } = await supabase
      .from("criatura_drops")
      .insert({
        item_id:      itemId,
        criatura_id:  criaturaId,
        variante_id:  varianteId ?? null,
        probabilidad: probabilidad ?? null,
      })
      .select("id, criatura_id, variante_id, probabilidad, criaturas(nombre, imagen_url), criatura_variantes(tipo)")
      .single();

    if (!error && data) {
      setFuentes(prev => [...prev, {
        id:              data.id,
        criatura_id:     data.criatura_id,
        criatura_nombre: (data.criaturas as any)?.nombre    ?? "",
        criatura_imagen: (data.criaturas as any)?.imagen_url ?? null,
        variante_id:     data.variante_id                   ?? null,
        variante_tipo:   (data.criatura_variantes as any)?.tipo ?? null,
        probabilidad:    data.probabilidad ?? null,
      }]);
    }
  };

  const remove = async (dropId: string) => {
    await supabase.from("criatura_drops").delete().eq("id", dropId);
    setFuentes(prev => prev.filter(f => f.id !== dropId));
  };

  const updateProb = async (dropId: string, probabilidad: number | null) => {
    await supabase.from("criatura_drops").update({ probabilidad }).eq("id", dropId);
    setFuentes(prev => prev.map(f => f.id === dropId ? { ...f, probabilidad } : f));
  };

  return { fuentes, loading, add, remove, updateProb };
}

// ─── FuenteRow component ──────────────────────────────────────────────────────
function FuenteItem({ fuente, onRemove, onUpdateProb }: {
  fuente: FuenteRow;
  onRemove: () => void;
  onUpdateProb: (v: number | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val,     setVal]     = useState(fuente.probabilidad != null ? String(fuente.probabilidad) : "");

  const commit = () => {
    const n = parseFloat(val);
    onUpdateProb(isNaN(n) ? null : Math.min(100, Math.max(0, n)));
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl group border border-primary/10 bg-primary/3">
      {/* Imagen criatura */}
      <div className="shrink-0 w-7 h-7 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
        {fuente.criatura_imagen
          ? <img src={fuente.criatura_imagen} alt={fuente.criatura_nombre} className="w-full h-full object-cover" />
          : <Bug size={10} className="text-primary/25" />}
      </div>

      {/* Nombre + variante */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-primary/70 truncate">{fuente.criatura_nombre}</p>
        {fuente.variante_tipo && (
          <p className="text-[9px] text-primary/35 truncate flex items-center gap-1">
            <GitBranch size={8} /> {fuente.variante_tipo}
          </p>
        )}
      </div>

      {/* Probabilidad */}
      {editing ? (
        <div className="flex items-center gap-1 shrink-0">
          <input
            autoFocus
            value={val}
            onChange={e => setVal(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
            className="w-14 bg-input-bg border border-primary/25 rounded-lg px-2 py-1 text-[11px] font-bold text-primary outline-none text-right"
            placeholder="0-100"
          />
          <span className="text-[9px] text-primary/30">%</span>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-primary/40 hover:text-primary hover:bg-primary/8 transition-all"
          title="Editar probabilidad"
        >
          {fuente.probabilidad != null ? (
            <><Percent size={8} />{fuente.probabilidad}%</>
          ) : (
            <span className="italic text-primary/20">—%</span>
          )}
        </button>
      )}

      {/* Quitar */}
      <button
        onClick={onRemove}
        className="shrink-0 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 text-primary/25 hover:text-red-400 hover:bg-red-400/10 transition-all"
      >
        <X size={9} />
      </button>
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────
export function BloqueDropsFuente({ itemId }: { itemId: string }) {
  const { criaturas, variantes, loading: loadingCat } = useCatalogoCriaturas();
  const { fuentes, loading, add, remove, updateProb }  = useFuentes(itemId);

  const [input,            setInput]            = useState("");
  const [open,             setOpen]             = useState(false);
  const [selectedCriatura, setSelectedCriatura] = useState<CriaturaCatalogo | null>(null);
  const [selectedVariante, setSelectedVariante] = useState<string>(""); // "" = base
  const ref = useRef<HTMLDivElement>(null);

  // Variantes de la criatura elegida
  const variantesDeSeleccion = useMemo(
    () => selectedCriatura ? variantes.filter(v => v.criatura_id === selectedCriatura.id) : [],
    [selectedCriatura, variantes]
  );

  // IDs ya asignados (criatura_id + variante_id)
  const asignadosSet = useMemo(
    () => new Set(fuentes.map(f => `${f.criatura_id}:${f.variante_id ?? ""}`)),
    [fuentes]
  );

  const filtrados = useMemo(() => {
    const q = normalize(input);
    return criaturas.filter(c => normalize(c.nombre).includes(q));
  }, [criaturas, input]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSelectedCriatura(null);
        setSelectedVariante("");
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const confirmAdd = () => {
    if (!selectedCriatura) return;
    const varId = selectedVariante || null;
    const key = `${selectedCriatura.id}:${varId ?? ""}`;
    if (asignadosSet.has(key)) return;
    add(selectedCriatura.id, varId, null);
    setSelectedCriatura(null);
    setSelectedVariante("");
    setInput("");
    setOpen(false);
  };

  if (loading || loadingCat) return (
    <div className="flex justify-center py-4">
      <Loader2 size={14} className="animate-spin text-primary/20" />
    </div>
  );

  return (
    <div className="space-y-2">
      {/* Buscador */}
      <div className="relative" ref={ref}>
        <input
          value={selectedCriatura ? selectedCriatura.nombre : input}
          onChange={e => { setInput(e.target.value); setSelectedCriatura(null); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Añadir criatura fuente…"
          className={INPUT_CLS + " pr-8"}
        />
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary/30 hover:text-primary transition-colors"
        >
          <ChevronDown size={13} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>

        {/* Dropdown: lista criaturas */}
        {open && !selectedCriatura && filtrados.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white-custom border border-primary/15 rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
            {filtrados.map(c => (
              <button
                key={c.id}
                onMouseDown={() => {
                  setSelectedCriatura(c);
                  setInput(c.nombre);
                  const varOpts = variantes.filter(v => v.criatura_id === c.id);
                  // Si no hay variantes, añadir directo
                  if (varOpts.length === 0) {
                    const key = `${c.id}:`;
                    if (!asignadosSet.has(key)) add(c.id, null, null);
                    setSelectedCriatura(null);
                    setInput("");
                    setOpen(false);
                  }
                  // Si hay variantes, mostrar selector
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-primary/8 transition-colors"
              >
                <div className="shrink-0 w-6 h-6 rounded-md overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
                  {c.imagen_url
                    ? <img src={c.imagen_url} alt={c.nombre} className="w-full h-full object-cover" />
                    : <Bug size={9} className="text-primary/20" />}
                </div>
                <span className="flex-1 text-xs font-medium text-primary/70 truncate">{c.nombre}</span>
                {variantes.filter(v => v.criatura_id === c.id).length > 0 && (
                  <GitBranch size={9} className="text-primary/20 shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Dropdown: selector variante */}
        {open && selectedCriatura && variantesDeSeleccion.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white-custom border border-primary/15 rounded-xl shadow-xl overflow-hidden">
            <p className="text-[9px] font-black uppercase tracking-widest text-primary/30 px-3 py-2 border-b border-primary/8">
              Elegir variante de {selectedCriatura.nombre}
            </p>
            {/* Opción base */}
            {!asignadosSet.has(`${selectedCriatura.id}:`) && (
              <button
                onMouseDown={() => { add(selectedCriatura.id, null, null); setSelectedCriatura(null); setInput(""); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-primary/8 transition-colors"
              >
                <Bug size={9} className="text-primary/30" />
                <span className="text-xs font-medium text-primary/60 italic">Base (sin variante)</span>
              </button>
            )}
            {variantesDeSeleccion.map(v => {
              const key = `${selectedCriatura.id}:${v.id}`;
              if (asignadosSet.has(key)) return null;
              return (
                <button
                  key={v.id}
                  onMouseDown={() => { add(selectedCriatura.id, v.id, null); setSelectedCriatura(null); setInput(""); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-primary/8 transition-colors"
                >
                  <GitBranch size={9} className="text-primary/30" />
                  <span className="text-xs font-medium text-primary/70">{v.tipo}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Lista de fuentes */}
      {fuentes.length > 0 && (
        <div className="space-y-1">
          {fuentes.map(f => (
            <FuenteItem
              key={f.id}
              fuente={f}
              onRemove={() => remove(f.id)}
              onUpdateProb={v => updateProb(f.id, v)}
            />
          ))}
        </div>
      )}

      {fuentes.length === 0 && (
        <p className="text-[9px] text-primary/20 text-center italic py-2">
          Ninguna criatura asignada como fuente
        </p>
      )}
    </div>
  );
}
