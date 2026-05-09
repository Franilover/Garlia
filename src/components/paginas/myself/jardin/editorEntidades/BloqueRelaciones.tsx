"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Users, Plus, X, Loader2, UserCircle2, ChevronDown, Link2 } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface Relacion {
  id: string;
  personaje_id: string;
  personaje_rel_id: string;
  tipo: string;
  nota?: string | null;
  // solo display, no se persisten
  rel_nombre?: string;
  rel_img_url?: string | null;
}

// ─── Color estable por string (hash simple) ───────────────────────────────────

function colorParaTipo(tipo: string): string {
  let hash = 0;
  for (let i = 0; i < tipo.length; i++) hash = tipo.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `oklch(65% 0.14 ${hue})`;
}

// ─── Helpers Dexie ────────────────────────────────────────────────────────────

async function dexiePutRelacion(row: Omit<Relacion, "rel_nombre" | "rel_img_url">): Promise<void> {
  try { if (db) await (db as any).relaciones?.put(row); } catch {}
}
async function dexieDelRelacion(id: string): Promise<void> {
  try { if (db) await (db as any).relaciones?.delete(id); } catch {}
}

// ─── Hook: tipos ya usados en toda la tabla ───────────────────────────────────

function useTiposExistentes() {
  const [tipos, setTipos] = useState<string[]>([]);

  useEffect(() => {
    // Desde Dexie primero
    (async () => {
      try {
        if (db) {
          const all: any[] = await (db as any).relaciones?.toArray() ?? [];
          const set = [...new Set<string>(all.map((r: any) => r.tipo).filter(Boolean))].sort();
          if (set.length) setTipos(set);
        }
      } catch {}
    })();

    // Luego desde Supabase
    if (!navigator.onLine) return;
    supabase
      .from("relaciones")
      .select("tipo")
      .then(({ data }) => {
        if (!data) return;
        const set = [...new Set<string>(data.map((r: any) => r.tipo).filter(Boolean))].sort();
        setTipos(set);
      });
  }, []);

  return tipos;
}

// ─── Input de tipo con autocomplete ──────────────────────────────────────────

function InputTipo({
  value,
  onChange,
  sugerencias,
}: {
  value: string;
  onChange: (v: string) => void;
  sugerencias: string[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtradas = sugerencias.filter(s =>
    s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase()
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Ej: Amigo, Padre, Rival…"
        className={`w-full bg-transparent text-[11px] font-bold text-primary outline-none placeholder:text-primary/20 border rounded-lg px-3 py-1.5 transition-all ${open ? "border-primary/30" : "border-primary/10"}`}
      />

      {open && filtradas.length > 0 && (
        <div
          className="absolute z-[80] top-full left-0 mt-1 w-full rounded-xl shadow-xl overflow-hidden bg-bg-main border border-primary/15"
        >
          {filtradas.map(s => {
            const color = colorParaTipo(s);
            return (
              <button
                key={s}
                onMouseDown={e => { e.preventDefault(); onChange(s); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-primary/6 transition-colors text-left"
              >
                <span className="shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                <span className="text-[11px] font-bold text-primary/70">{s}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Selector de personaje ────────────────────────────────────────────────────

interface PersonajeMin { id: string; nombre: string; img_url?: string | null; }

function SelectorPersonaje({
  excludeId,
  onSelect,
  onClose,
}: {
  excludeId: string;
  onSelect: (p: PersonajeMin) => void;
  onClose: () => void;
}) {
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState<PersonajeMin[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    try {
      let sb = supabase
        .from("personajes")
        .select("id, nombre, img_url")
        .neq("id", excludeId)
        .order("nombre")
        .limit(20);
      if (q.trim()) sb = sb.ilike("nombre", `%${q.trim()}%`);
      const { data } = await sb;
      setResults((data ?? []) as PersonajeMin[]);
    } catch { setResults([]); }
    setLoading(false);
  }, [excludeId]);

  useEffect(() => {
    const t = setTimeout(() => search(query), 250);
    return () => clearTimeout(t);
  }, [query, search]);

  useEffect(() => { search(""); }, [search]);

  return (
    <div
      className="absolute z-[70] top-full left-0 mt-1 w-full rounded-xl shadow-2xl overflow-hidden bg-bg-main border border-primary/15"
      style={{ maxHeight: 240 }}
    >
      <div className="p-2 border-b border-primary/10">
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar personaje…"
          className="w-full bg-transparent text-[11px] font-bold text-primary outline-none placeholder:text-primary/25 px-1"
        />
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: 188 }}>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 size={14} className="animate-spin text-primary/20" />
          </div>
        ) : results.length === 0 ? (
          <p className="text-[9px] text-primary/25 text-center py-4 font-bold uppercase tracking-widest italic">Sin resultados</p>
        ) : results.map(p => (
          <button
            key={p.id}
            onClick={() => { onSelect(p); onClose(); }}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-primary/6 transition-colors text-left"
          >
            <div className="shrink-0 w-6 h-6 rounded-md overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
              {p.img_url
                ? <img src={p.img_url} alt={p.nombre} className="w-full h-full object-cover" />
                : <UserCircle2 size={10} className="text-primary/20" />}
            </div>
            <span className="text-[11px] font-bold text-primary/80 truncate">{p.nombre}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Formulario nueva relación ────────────────────────────────────────────────

function FormNuevaRelacion({
  personajeId,
  tiposExistentes,
  onAdded,
  onCancel,
}: {
  personajeId: string;
  tiposExistentes: string[];
  onAdded: (r: Relacion) => void;
  onCancel: () => void;
}) {
  const [tipo,         setTipo]         = useState("");
  const [personajeSel, setPersonajeSel] = useState<PersonajeMin | null>(null);
  const [nota,         setNota]         = useState("");
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");

  const guardar = async () => {
    if (!personajeSel) { setError("Selecciona un personaje"); return; }
    if (!tipo.trim())  { setError("Escribe el tipo de relación"); return; }
    setError("");
    setSaving(true);
    try {
      const row = {
        personaje_id:     personajeId,
        personaje_rel_id: personajeSel.id,
        tipo:             tipo.trim(),
        nota:             nota.trim() || null,
      };
      const { data, error: err } = await supabase
        .from("relaciones")
        .insert(row)
        .select("id, personaje_id, personaje_rel_id, tipo, nota")
        .single();
      if (err) throw err;
      const nueva: Relacion = {
        ...(data as any),
        rel_nombre:  personajeSel.nombre,
        rel_img_url: personajeSel.img_url,
      };
      void dexiePutRelacion({
        id: nueva.id,
        personaje_id: nueva.personaje_id,
        personaje_rel_id: nueva.personaje_rel_id,
        tipo: nueva.tipo,
        nota: nueva.nota,
      });
      onAdded(nueva);
    } catch { setError("Error al guardar, intenta de nuevo"); }
    setSaving(false);
  };

  return (
    <div
      className="rounded-xl p-3 space-y-2.5 bg-primary/[0.03] border border-primary/10"
    >
      {/* Tipo libre con autocomplete */}
      <div className="space-y-1">
        <label className="text-[8px] font-black uppercase tracking-[0.3em] text-primary/30">Tipo de relación</label>
        <InputTipo value={tipo} onChange={setTipo} sugerencias={tiposExistentes} />
        {/* Chips rápidos si hay pocos tipos */}
        {tiposExistentes.length > 0 && tiposExistentes.length <= 12 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {tiposExistentes.map(s => (
              <button
                key={s}
                onMouseDown={e => { e.preventDefault(); setTipo(s); }}
                style={tipo === s ? {
                  background:  `color-mix(in srgb, ${colorParaTipo(s)} 15%, transparent)`,
                  borderColor: `color-mix(in srgb, ${colorParaTipo(s)} 40%, transparent)`,
                  color:        colorParaTipo(s),
                } : undefined}
                className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border transition-all ${tipo === s ? "" : "border-primary/10 text-primary/30"}`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selector personaje */}
      <div className="space-y-1">
        <label className="text-[8px] font-black uppercase tracking-[0.3em] text-primary/30">Personaje</label>
        <div className="relative">
          <button
            onClick={() => setSelectorOpen(o => !o)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all bg-primary/[0.02] ${selectorOpen ? "border-primary/30" : "border-primary/10"}`}
          >
            {personajeSel ? (
              <>
                <div className="shrink-0 w-5 h-5 rounded-md overflow-hidden border border-primary/10 bg-primary/5">
                  {personajeSel.img_url
                    ? <img src={personajeSel.img_url} alt="" className="w-full h-full object-cover" />
                    : <UserCircle2 size={10} className="text-primary/20 m-auto" />}
                </div>
                <span className="flex-1 text-[11px] font-bold text-primary/80 truncate">{personajeSel.nombre}</span>
              </>
            ) : (
              <span className="flex-1 text-[10px] font-bold text-primary/25 italic">Seleccionar personaje…</span>
            )}
            <ChevronDown size={10} className={`text-primary/25 transition-transform ${selectorOpen ? "rotate-180" : ""}`} />
          </button>
          {selectorOpen && (
            <SelectorPersonaje
              excludeId={personajeId}
              onSelect={setPersonajeSel}
              onClose={() => setSelectorOpen(false)}
            />
          )}
        </div>
      </div>

      {/* Nota */}
      <div className="space-y-1">
        <label className="text-[8px] font-black uppercase tracking-[0.3em] text-primary/30">Nota (opcional)</label>
        <input
          value={nota}
          onChange={e => setNota(e.target.value)}
          placeholder="Ej: se separaron en la guerra…"
          className="w-full bg-transparent text-[10px] font-medium text-primary outline-none placeholder:text-primary/20 border border-primary/10 rounded-lg px-3 py-1.5 transition-all"
        />
      </div>

      {error && <p className="text-[9px] font-bold text-red-400">{error}</p>}

      <div className="flex items-center justify-end gap-2 pt-0.5">
        <button
          onClick={onCancel}
          className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all text-primary/40 border-primary/10 hover:text-primary hover:border-primary/25"
        >
          Cancelar
        </button>
        <button
          onClick={guardar}
          disabled={saving}
          className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-primary text-btn-text shadow-md shadow-primary/20 disabled:opacity-40 hover:bg-primary/90 transition-all flex items-center gap-1"
        >
          {saving ? <Loader2 size={9} className="animate-spin" /> : <Plus size={9} />}
          Añadir
        </button>
      </div>
    </div>
  );
}

// ─── Fila de relación ─────────────────────────────────────────────────────────

function FilaRelacion({ rel, onDelete }: { rel: Relacion; onDelete: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false);
  const color = colorParaTipo(rel.tipo);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.from("relaciones").delete().eq("id", rel.id);
      if (error) throw error;
      void dexieDelRelacion(rel.id);
      onDelete(rel.id);
    } catch { setDeleting(false); }
  };

  return (
    <div
      className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all border border-transparent hover:border-primary/10 hover:bg-primary/[0.03]"
    >
      <div className="shrink-0 w-8 h-8 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
        {rel.rel_img_url
          ? <img src={rel.rel_img_url} alt={rel.rel_nombre} className="w-full h-full object-cover" />
          : <UserCircle2 size={13} className="text-primary/20" />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-primary/80 truncate">{rel.rel_nombre ?? "—"}</p>
        {rel.nota && (
          <p className="text-[9px] text-primary/35 truncate italic">{rel.nota}</p>
        )}
      </div>

      <span
        className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest"
        style={{
          background: `color-mix(in srgb, ${color} 12%, transparent)`,
          color,
          border:     `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
        }}
      >
        <Link2 size={7} />
        {rel.tipo}
      </span>

      <button
        onClick={handleDelete}
        disabled={deleting}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-md flex items-center justify-center text-red-400/40 hover:text-red-400 hover:bg-red-500/8 border border-transparent hover:border-red-500/15"
      >
        {deleting ? <Loader2 size={10} className="animate-spin" /> : <X size={10} />}
      </button>
    </div>
  );
}

// ─── BloqueRelaciones ─────────────────────────────────────────────────────────

export function BloqueRelaciones({ personajeId }: { personajeId: string }) {
  const [relaciones,  setRelaciones]  = useState<Relacion[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [formVisible, setFormVisible] = useState(false);
  const tiposExistentes = useTiposExistentes();

  const cargar = useCallback(async () => {
    setLoading(true);

    // 1. Dexie primero
    try {
      if (db) {
        const local: any[] = await (db as any).relaciones
          ?.where("personaje_id").equals(personajeId).toArray() ?? [];
        if (local.length) {
          const ids = local.map((r: any) => r.personaje_rel_id);
          const pjs: any[] = await (db as any).personajes
            ?.where("id").anyOf(ids).toArray() ?? [];
          const pjMap = Object.fromEntries(pjs.map((p: any) => [p.id, p]));
          setRelaciones(local.map((r: any) => ({
            ...r,
            rel_nombre:  pjMap[r.personaje_rel_id]?.nombre  ?? "—",
            rel_img_url: pjMap[r.personaje_rel_id]?.img_url ?? null,
          })));
        }
      }
    } catch {}

    if (!navigator.onLine) { setLoading(false); return; }

    // 2. Supabase
    try {
      const { data, error } = await supabase
        .from("relaciones")
        .select(`
          id, personaje_id, personaje_rel_id, tipo, nota,
          personaje_rel:personajes!relaciones_personaje_rel_id_fkey(nombre, img_url)
        `)
        .eq("personaje_id", personajeId)
        .order("tipo");

      if (error) throw error;

      const enriquecidas: Relacion[] = (data as any[]).map(r => ({
        id:               r.id,
        personaje_id:     r.personaje_id,
        personaje_rel_id: r.personaje_rel_id,
        tipo:             r.tipo,
        nota:             r.nota,
        rel_nombre:       r.personaje_rel?.nombre  ?? "—",
        rel_img_url:      r.personaje_rel?.img_url ?? null,
      }));

      setRelaciones(enriquecidas);

      try {
        if (db) await (db as any).relaciones?.bulkPut(
          enriquecidas.map(({ rel_nombre: _n, rel_img_url: _i, ...rest }) => rest)
        );
      } catch {}
    } catch {}

    setLoading(false);
  }, [personajeId]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleAdded   = (r: Relacion) => { setRelaciones(prev => [...prev, r]); setFormVisible(false); };
  const handleDeleted = (id: string)  => setRelaciones(prev => prev.filter(r => r.id !== id));

  const tiposConData = [...new Set(relaciones.map(r => r.tipo))].sort();
  const porTipo = (t: string) => relaciones.filter(r => r.tipo === t);

  return (
    <div
      className="rounded-xl overflow-hidden border border-primary/10"
    >
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-primary/[0.06] bg-primary/[0.03]"
      >
        <div className="flex items-center gap-2">
          <Users size={10} className="text-primary/40" />
          <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">Relaciones</span>
          {!loading && relaciones.length > 0 && (
            <span
              className="text-[8px] font-black text-primary/30 px-1.5 py-0.5 rounded-full bg-primary/10"
            >
              {relaciones.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setFormVisible(v => !v)}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${formVisible ? "bg-primary/10 border-primary/25 text-primary" : "border-primary/10 text-primary/35"}`}
        >
          {formVisible ? <X size={9} /> : <Plus size={9} />}
          {formVisible ? "Cerrar" : "Añadir"}
        </button>
      </div>

      <div className="p-2 space-y-2">
        {formVisible && (
          <FormNuevaRelacion
            personajeId={personajeId}
            tiposExistentes={tiposExistentes}
            onAdded={handleAdded}
            onCancel={() => setFormVisible(false)}
          />
        )}

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 size={14} className="animate-spin text-primary/20" />
          </div>
        ) : relaciones.length === 0 ? (
          <p className="text-[9px] font-bold text-primary/20 uppercase tracking-widest text-center italic py-6">
            Sin relaciones registradas
          </p>
        ) : (
          <div className="space-y-2">
            {tiposConData.map(tipo => {
              const color = colorParaTipo(tipo);
              return (
                <div key={tipo}>
                  <div className="flex items-center gap-1.5 px-1 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                    <span
                      className="text-[8px] font-black uppercase tracking-[0.25em]"
                      style={{ color: `color-mix(in srgb, ${color} 80%, var(--primary))` }}
                    >
                      {tipo}
                    </span>
                    <div className="flex-1 h-px" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }} />
                  </div>
                  {porTipo(tipo).map(rel => (
                    <FilaRelacion key={rel.id} rel={rel} onDelete={handleDeleted} />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}