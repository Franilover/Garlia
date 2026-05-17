"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Users, Plus, X, Loader2, UserCircle2, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";
import { GrafoRelaciones } from "./GrafoRelaciones";
import { enqueueOperation, isReallyOnline } from "@/hooks/data/useOfflineSync";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface Relacion {
  id: string;
  personaje_id: string;
  personaje_rel_id: string;
  tipo: string;
  nota?: string | null;
  rel_nombre?: string;
  rel_img_url?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

async function dexiePutRelacion(row: Omit<Relacion, "rel_nombre" | "rel_img_url">): Promise<void> {
  try { if (db) await (db as any).relaciones?.put(row); } catch {}
}
async function dexieDelRelacion(id: string): Promise<void> {
  try { if (db) await (db as any).relaciones?.delete(id); } catch {}
}

// ─── Hook: tipos existentes ───────────────────────────────────────────────────

function useTiposExistentes() {
  const [tipos, setTipos] = useState<string[]>([]);
  useEffect(() => {
    (async () => {
      try {
        if (db) {
          const all: any[] = await (db as any).relaciones?.toArray() ?? [];
          const set = [...new Set<string>(all.map((r: any) => r.tipo).filter(Boolean))].sort();
          if (set.length) setTipos(set);
        }
      } catch {}
    })();
    if (!navigator.onLine) return;
    supabase.from("relaciones").select("tipo").then(({ data }) => {
      if (!data) return;
      const set = [...new Set<string>(data.map((r: any) => r.tipo).filter(Boolean))].sort();
      setTipos(set);
    });
  }, []);
  return tipos;
}

// ─── Input tipo con autocomplete ──────────────────────────────────────────────

function InputTipo({ value, onChange, sugerencias }: {
  value: string; onChange: (v: string) => void; sugerencias: string[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const filtradas = sugerencias.filter(s =>
    s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase()
  );
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Tipo de relación…"
        className="w-full bg-primary/[0.03] text-[10px] font-bold text-primary outline-none placeholder:text-primary/20 border border-primary/10 focus:border-primary/25 rounded-md px-2.5 py-1.5 transition-all"
      />
      {open && filtradas.length > 0 && (
        <div className="absolute z-[80] top-full left-0 mt-1 w-full rounded-lg shadow-xl overflow-hidden bg-bg-main border border-primary/15">
          {filtradas.map(s => (
            <button key={s} onMouseDown={e => { e.preventDefault(); onChange(s); setOpen(false); }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-primary/6 transition-colors text-left">
              <span className="shrink-0 w-1 h-1 rounded-full bg-primary/30" />
              <span className="text-[10px] font-bold text-primary/70">{s}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Selector de personaje ────────────────────────────────────────────────────

interface PersonajeMin { id: string; nombre: string; img_url?: string | null; }

function SelectorPersonaje({ excludeId, onSelect, onClose }: {
  excludeId: string; onSelect: (p: PersonajeMin) => void; onClose: () => void;
}) {
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState<PersonajeMin[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    try {
      if (!navigator.onLine) {
        if (db) {
          const all: any[] = await (db as any).personajes?.toArray() ?? [];
          setResults(
            all
              .filter((p: any) => p.id !== excludeId && (!q.trim() || p.nombre?.toLowerCase().includes(q.trim().toLowerCase())))
              .sort((a: any, b: any) => a.nombre.localeCompare(b.nombre))
              .slice(0, 20) as PersonajeMin[]
          );
        }
        setLoading(false); return;
      }
      let sb = supabase.from("personajes").select("id, nombre, img_url").neq("id", excludeId).order("nombre").limit(20);
      if (q.trim()) sb = sb.ilike("nombre", `%${q.trim()}%`);
      const { data } = await sb;
      setResults((data ?? []) as PersonajeMin[]);
    } catch { setResults([]); }
    setLoading(false);
  }, [excludeId]);

  useEffect(() => { const t = setTimeout(() => search(query), 250); return () => clearTimeout(t); }, [query, search]);
  useEffect(() => { search(""); }, [search]);

  return (
    <div className="absolute z-[70] top-full left-0 mt-1 w-full rounded-lg shadow-2xl overflow-hidden bg-bg-main border border-primary/15" style={{ maxHeight: 200 }}>
      <div className="px-2.5 py-1.5 border-b border-primary/10">
        <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Buscar personaje…"
          className="w-full bg-transparent text-[10px] font-bold text-primary outline-none placeholder:text-primary/25" />
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: 158 }}>
        {loading ? (
          <div className="flex justify-center py-3"><Loader2 size={12} className="animate-spin text-primary/20" /></div>
        ) : results.length === 0 ? (
          <p className="text-[9px] text-primary/25 text-center py-3 font-bold uppercase tracking-widest italic">Sin resultados</p>
        ) : results.map(p => (
          <button key={p.id} onClick={() => { onSelect(p); onClose(); }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-primary/6 transition-colors text-left">
            <div className="shrink-0 w-5 h-5 rounded overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
              {p.img_url
                ? <img src={p.img_url} alt={p.nombre} className="w-full h-full object-cover" />
                : <UserCircle2 size={9} className="text-primary/20" />}
            </div>
            <span className="text-[10px] font-bold text-primary/80 truncate">{p.nombre}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Formulario inline compacto ───────────────────────────────────────────────

function FormNuevaRelacion({ personajeId, tiposExistentes, onAdded, onCancel }: {
  personajeId: string; tiposExistentes: string[];
  onAdded: (r: Relacion) => void; onCancel: () => void;
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
    setError(""); setSaving(true);

    const online = await isReallyOnline();
    const row = {
      personaje_id: personajeId, personaje_rel_id: personajeSel.id,
      tipo: tipo.trim(), nota: nota.trim() || null,
    };

    if (!online) {
      const id = generateUUID();
      const nueva: Relacion = { id, ...row, rel_nombre: personajeSel.nombre, rel_img_url: personajeSel.img_url ?? null };
      void dexiePutRelacion({ id, ...row });
      await enqueueOperation("relaciones", "upsert", id, { id, ...row });
      onAdded(nueva); setSaving(false); return;
    }

    try {
      const { data, error: err } = await supabase.from("relaciones").insert(row)
        .select("id, personaje_id, personaje_rel_id, tipo, nota").single();
      if (err) throw err;
      const nueva: Relacion = {
        ...(data as any),
        rel_nombre: personajeSel.nombre, rel_img_url: personajeSel.img_url ?? null,
      };
      void dexiePutRelacion({ id: nueva.id, personaje_id: nueva.personaje_id, personaje_rel_id: nueva.personaje_rel_id, tipo: nueva.tipo, nota: nueva.nota });
      onAdded(nueva);
    } catch { setError("Error al guardar"); }
    setSaving(false);
  };

  return (
    <div className="border border-primary/12 rounded-lg bg-primary/[0.025] p-2.5 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[7.5px] font-black uppercase tracking-[0.25em] text-primary/30">Tipo</label>
          <InputTipo value={tipo} onChange={setTipo} sugerencias={tiposExistentes} />
        </div>
        <div className="space-y-1">
          <label className="text-[7.5px] font-black uppercase tracking-[0.25em] text-primary/30">Personaje</label>
          <div className="relative">
            <button onClick={() => setSelectorOpen(o => !o)}
              className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-primary/10 bg-primary/[0.03] text-left hover:border-primary/25 transition-all">
              {personajeSel ? (
                <>
                  <div className="shrink-0 w-4 h-4 rounded overflow-hidden border border-primary/10 bg-primary/5">
                    {personajeSel.img_url
                      ? <img src={personajeSel.img_url} alt="" className="w-full h-full object-cover" />
                      : <UserCircle2 size={8} className="text-primary/20" />}
                  </div>
                  <span className="flex-1 text-[10px] font-bold text-primary/80 truncate">{personajeSel.nombre}</span>
                </>
              ) : (
                <span className="flex-1 text-[10px] font-bold text-primary/25 italic">Seleccionar…</span>
              )}
              <ChevronDown size={9} className={`text-primary/25 shrink-0 transition-transform ${selectorOpen ? "rotate-180" : ""}`} />
            </button>
            {selectorOpen && (
              <SelectorPersonaje excludeId={personajeId} onSelect={setPersonajeSel} onClose={() => setSelectorOpen(false)} />
            )}
          </div>
        </div>
      </div>

      {tiposExistentes.length > 0 && tiposExistentes.length <= 10 && (
        <div className="flex flex-wrap gap-1">
          {tiposExistentes.map(s => (
            <button key={s} onMouseDown={e => { e.preventDefault(); setTipo(s); }}
              className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border transition-all
                ${tipo === s
                  ? "bg-primary/10 border-primary/25 text-primary"
                  : "border-primary/8 text-primary/30 hover:border-primary/20 hover:text-primary/55"}`}>
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input value={nota} onChange={e => setNota(e.target.value)}
          placeholder="Nota opcional…"
          className="flex-1 bg-primary/[0.03] text-[10px] font-medium text-primary outline-none placeholder:text-primary/20 border border-primary/10 focus:border-primary/25 rounded-md px-2.5 py-1.5 transition-all min-w-0" />
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onCancel}
            className="px-2.5 py-1.5 rounded-md text-[8.5px] font-black uppercase tracking-widest border border-primary/10 text-primary/30 hover:text-primary/60 hover:border-primary/20 transition-all">
            ✕
          </button>
          <button onClick={guardar} disabled={saving}
            className="px-2.5 py-1.5 rounded-md text-[8.5px] font-black uppercase tracking-widest bg-primary text-btn-text disabled:opacity-40 hover:bg-primary/90 transition-all flex items-center gap-1">
            {saving ? <Loader2 size={8} className="animate-spin" /> : <Plus size={8} />}
            Añadir
          </button>
        </div>
      </div>

      {error && <p className="text-[8.5px] font-bold text-red-400">{error}</p>}
    </div>
  );
}

// ─── Fila de relación compacta ────────────────────────────────────────────────

function FilaRelacion({ rel, onDelete }: { rel: Relacion; onDelete: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    void dexieDelRelacion(rel.id);
    onDelete(rel.id);
    const online = await isReallyOnline();
    if (!online) { await enqueueOperation("relaciones", "delete", rel.id); return; }
    try {
      const { error } = await supabase.from("relaciones").delete().eq("id", rel.id);
      if (error) await enqueueOperation("relaciones", "delete", rel.id);
    } catch { await enqueueOperation("relaciones", "delete", rel.id); }
  };

  return (
    <div className="group flex items-center gap-1.5 py-[3px] rounded-md hover:bg-primary/[0.04] px-1 transition-all">
      <div className="shrink-0 w-[18px] h-[18px] rounded overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
        {rel.rel_img_url
          ? <img src={rel.rel_img_url} alt={rel.rel_nombre} className="w-full h-full object-cover" />
          : <UserCircle2 size={8} className="text-primary/20" />}
      </div>
      <span className="flex-1 text-[10px] font-bold text-primary/75 truncate leading-none min-w-0">
        {rel.rel_nombre ?? "—"}
      </span>
      <button onClick={handleDelete} disabled={deleting}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity w-4 h-4 rounded flex items-center justify-center text-primary/20 hover:text-red-400 hover:bg-red-500/8">
        {deleting ? <Loader2 size={8} className="animate-spin" /> : <X size={8} />}
      </button>
    </div>
  );
}

// ─── Columna por tipo ─────────────────────────────────────────────────────────

function ColumnaTipo({ tipo, relaciones, onDelete }: {
  tipo: string;
  relaciones: Relacion[];
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex-1 min-w-0 min-w-[90px]">
      {/* Cabecera del tipo */}
      <div className="flex items-center gap-1 mb-1 px-1">
        <span className="text-[7.5px] font-black uppercase tracking-[0.25em] text-primary/35 truncate leading-none">
          {tipo}
        </span>
        <span className="text-[7.5px] font-bold text-primary/20 shrink-0">{relaciones.length}</span>
      </div>
      {/* Filas */}
      <div className="space-y-0">
        {relaciones.map(rel => (
          <FilaRelacion key={rel.id} rel={rel} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

// ─── BloqueRelaciones ─────────────────────────────────────────────────────────

export function BloqueRelaciones({ personajeId, personajeNombre }: {
  personajeId: string; personajeNombre?: string;
}) {
  const [relaciones,  setRelaciones]  = useState<Relacion[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [formVisible, setFormVisible] = useState(false);
  const tiposExistentes = useTiposExistentes();

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      if (db) {
        const local: any[] = await (db as any).relaciones?.where("personaje_id").equals(personajeId).toArray() ?? [];
        if (local.length) {
          const ids = local.map((r: any) => r.personaje_rel_id);
          const pjs: any[] = await (db as any).personajes?.where("id").anyOf(ids).toArray() ?? [];
          const pjMap = Object.fromEntries(pjs.map((p: any) => [p.id, p]));
          setRelaciones(local.map((r: any) => ({
            ...r,
            rel_nombre:  pjMap[r.personaje_rel_id]?.nombre  ?? "—",
            rel_img_url: pjMap[r.personaje_rel_id]?.img_url ?? null,
          })));
          setLoading(false);
        }
      }
    } catch {}

    if (!navigator.onLine) { setLoading(false); return; }

    try {
      const { data, error } = await supabase
        .from("relaciones")
        .select(`id, personaje_id, personaje_rel_id, tipo, nota,
          personaje_rel:personajes!relaciones_personaje_rel_id_fkey(nombre, img_url)`)
        .eq("personaje_id", personajeId)
        .order("tipo");
      if (error) throw error;
      const enriquecidas: Relacion[] = (data as any[]).map(r => ({
        id: r.id, personaje_id: r.personaje_id, personaje_rel_id: r.personaje_rel_id,
        tipo: r.tipo, nota: r.nota,
        rel_nombre:  r.personaje_rel?.nombre  ?? "—",
        rel_img_url: r.personaje_rel?.img_url ?? null,
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
    <div className="rounded-xl overflow-hidden border border-primary/10">

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-[7px] border-b border-primary/[0.06] bg-primary/[0.025]">
        <div className="flex items-center gap-2">
          <Users size={9} className="text-primary/35" />
          <span className="text-[8.5px] font-black uppercase tracking-[0.25em] text-primary/35">Relaciones</span>
          {relaciones.length > 0 && (
            <span className="text-[8px] font-black text-primary/30 tabular-nums">{relaciones.length}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {!loading && relaciones.length > 0 && (
            <GrafoRelaciones personajeId={personajeId} personajeNombre={personajeNombre} />
          )}
          <button onClick={() => setFormVisible(v => !v)}
            className={`flex items-center gap-1 px-2 py-[5px] rounded-md text-[8px] font-black uppercase tracking-widest border transition-all
              ${formVisible
                ? "bg-primary/8 border-primary/20 text-primary"
                : "border-primary/8 text-primary/30 hover:text-primary/60 hover:border-primary/18"}`}>
            {formVisible ? <X size={8} /> : <Plus size={8} />}
            {formVisible ? "Cerrar" : "Añadir"}
          </button>
        </div>
      </div>

      {/* Cuerpo */}
      <div className="px-2 py-1.5 space-y-1.5">

        {formVisible && (
          <div className="pb-1">
            <FormNuevaRelacion
              personajeId={personajeId}
              tiposExistentes={tiposExistentes}
              onAdded={handleAdded}
              onCancel={() => setFormVisible(false)}
            />
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 size={12} className="animate-spin text-primary/20" />
          </div>

        ) : relaciones.length === 0 ? (
          <p className="text-[8.5px] font-bold text-primary/18 uppercase tracking-widest text-center py-3 italic">
            Sin relaciones
          </p>

        ) : (
          // ── Columnas horizontales por tipo ─────────────────────────────────
          // flex-wrap: si hay muchos tipos desbordan a la siguiente fila
          // cada columna toma el espacio mínimo necesario (min-w-[90px])
          // y se expande con flex-1
          <div className="flex flex-wrap gap-x-3 gap-y-2.5">
            {tiposConData.map(tipo => (
              <ColumnaTipo
                key={tipo}
                tipo={tipo}
                relaciones={porTipo(tipo)}
                onDelete={handleDeleted}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}