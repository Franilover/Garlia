"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Heart, Users, Sword, Crown, Baby, Star, Plus, X, Loader2,
  UserCircle2, ChevronDown, Link2,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type TipoRelacion =
  | "padre" | "madre" | "hijo" | "hija"
  | "hermano" | "hermana"
  | "amigo" | "enemigo" | "aliado"
  | "amante" | "pareja" | "esposo" | "esposa"
  | "mentor" | "aprendiz"
  | "rival" | "desconocido" | "otro";

export interface Relacion {
  id: string;
  personaje_id: string;          // el personaje "origen"
  personaje_rel_id: string;      // el personaje "destino"
  tipo: TipoRelacion;
  nota?: string | null;
  // campos join (no se persisten, solo se usan para display)
  rel_nombre?: string;
  rel_img_url?: string | null;
}

// ─── Catálogo de tipos ────────────────────────────────────────────────────────

interface CatRelacion {
  tipo: TipoRelacion;
  label: string;
  Icon: React.ElementType;
  color: string; // CSS color hint para el badge
}

const TIPOS_RELACION: CatRelacion[] = [
  { tipo: "padre",      label: "Padre",      Icon: Crown,   color: "oklch(70% 0.12 50)" },
  { tipo: "madre",      label: "Madre",      Icon: Crown,   color: "oklch(70% 0.12 320)" },
  { tipo: "hijo",       label: "Hijo",       Icon: Baby,    color: "oklch(65% 0.14 200)" },
  { tipo: "hija",       label: "Hija",       Icon: Baby,    color: "oklch(65% 0.14 270)" },
  { tipo: "hermano",    label: "Hermano",    Icon: Users,   color: "oklch(65% 0.1 150)" },
  { tipo: "hermana",    label: "Hermana",    Icon: Users,   color: "oklch(65% 0.1 190)" },
  { tipo: "amigo",      label: "Amigo/a",    Icon: Star,    color: "oklch(72% 0.15 95)" },
  { tipo: "amante",     label: "Amante",     Icon: Heart,   color: "oklch(65% 0.2 10)" },
  { tipo: "pareja",     label: "Pareja",     Icon: Heart,   color: "oklch(65% 0.18 350)" },
  { tipo: "esposo",     label: "Esposo",     Icon: Heart,   color: "oklch(65% 0.15 340)" },
  { tipo: "esposa",     label: "Esposa",     Icon: Heart,   color: "oklch(65% 0.15 330)" },
  { tipo: "aliado",     label: "Aliado/a",   Icon: Link2,   color: "oklch(68% 0.12 170)" },
  { tipo: "enemigo",    label: "Enemigo/a",  Icon: Sword,   color: "oklch(60% 0.2 25)" },
  { tipo: "rival",      label: "Rival",      Icon: Sword,   color: "oklch(60% 0.15 40)" },
  { tipo: "mentor",     label: "Mentor/a",   Icon: Star,    color: "oklch(68% 0.14 230)" },
  { tipo: "aprendiz",   label: "Aprendiz",   Icon: Star,    color: "oklch(68% 0.12 250)" },
  { tipo: "desconocido",label: "Desconocido",Icon: UserCircle2, color: "oklch(55% 0.04 240)" },
  { tipo: "otro",       label: "Otro",       Icon: Link2,   color: "oklch(55% 0.04 240)" },
];

const catPorTipo = Object.fromEntries(TIPOS_RELACION.map(c => [c.tipo, c])) as Record<TipoRelacion, CatRelacion>;

// ─── Helpers Dexie ────────────────────────────────────────────────────────────

async function dexiePutRelacion(row: Relacion): Promise<void> {
  try { if (db) await (db as any).relaciones_personaje?.put(row); } catch {}
}
async function dexieDelRelacion(id: string): Promise<void> {
  try { if (db) await (db as any).relaciones_personaje?.delete(id); } catch {}
}

// ─── Selector de personaje (búsqueda simple) ──────────────────────────────────

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
  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState<PersonajeMin[]>([]);
  const [loading,  setLoading]  = useState(false);

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
      className="absolute z-[70] top-full left-0 mt-1 w-full rounded-xl shadow-2xl overflow-hidden"
      style={{
        background: "var(--bg-main)",
        border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
        maxHeight: 240,
      }}
    >
      <div className="p-2 border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
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

// ─── Formulario para añadir una relación ──────────────────────────────────────

function FormNuevaRelacion({
  personajeId,
  onAdded,
  onCancel,
}: {
  personajeId: string;
  onAdded: (r: Relacion) => void;
  onCancel: () => void;
}) {
  const [tipo,          setTipo]          = useState<TipoRelacion>("amigo");
  const [personajeSel,  setPersonajeSel]  = useState<PersonajeMin | null>(null);
  const [nota,          setNota]          = useState("");
  const [selectorOpen,  setSelectorOpen]  = useState(false);
  const [saving,        setSaving]        = useState(false);

  const guardar = async () => {
    if (!personajeSel) return;
    setSaving(true);
    try {
      const row = {
        personaje_id:     personajeId,
        personaje_rel_id: personajeSel.id,
        tipo,
        nota:             nota.trim() || null,
      };
      const { data, error } = await supabase
        .from("relaciones_personaje")
        .insert(row)
        .select("id, personaje_id, personaje_rel_id, tipo, nota")
        .single();
      if (error) throw error;
      const nueva: Relacion = {
        ...(data as any),
        rel_nombre:  personajeSel.nombre,
        rel_img_url: personajeSel.img_url,
      };
      void dexiePutRelacion(nueva);
      onAdded(nueva);
    } catch { /* TODO: toast */ }
    setSaving(false);
  };

  return (
    <div
      className="rounded-xl p-3 space-y-2.5"
      style={{
        background: "color-mix(in srgb, var(--primary) 3%, transparent)",
        border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
      }}
    >
      {/* Selector de tipo */}
      <div className="space-y-1">
        <label className="text-[8px] font-black uppercase tracking-[0.3em] text-primary/30">Tipo de relación</label>
        <div className="flex flex-wrap gap-1">
          {TIPOS_RELACION.map(c => (
            <button
              key={c.tipo}
              onClick={() => setTipo(c.tipo)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border transition-all"
              style={tipo === c.tipo ? {
                background:  `color-mix(in srgb, ${c.color} 15%, transparent)`,
                borderColor: `color-mix(in srgb, ${c.color} 40%, transparent)`,
                color:        c.color,
              } : {
                borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
                color:       "color-mix(in srgb, var(--primary) 30%, transparent)",
              }}
            >
              <c.Icon size={8} />
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Selector de personaje */}
      <div className="space-y-1">
        <label className="text-[8px] font-black uppercase tracking-[0.3em] text-primary/30">Personaje</label>
        <div className="relative">
          <button
            onClick={() => setSelectorOpen(o => !o)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all"
            style={{
              borderColor: selectorOpen
                ? "color-mix(in srgb, var(--primary) 30%, transparent)"
                : "color-mix(in srgb, var(--primary) 12%, transparent)",
              background: "color-mix(in srgb, var(--primary) 2%, transparent)",
            }}
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

      {/* Nota opcional */}
      <div className="space-y-1">
        <label className="text-[8px] font-black uppercase tracking-[0.3em] text-primary/30">Nota (opcional)</label>
        <input
          value={nota}
          onChange={e => setNota(e.target.value)}
          placeholder="Ej: se separaron en la guerra…"
          className="w-full bg-transparent text-[10px] font-medium text-primary outline-none placeholder:text-primary/20 border rounded-lg px-3 py-1.5 transition-all"
          style={{ borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
        />
      </div>

      {/* Botones */}
      <div className="flex items-center justify-end gap-2 pt-0.5">
        <button
          onClick={onCancel}
          className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all text-primary/40 border-primary/10 hover:text-primary hover:border-primary/25"
        >
          Cancelar
        </button>
        <button
          onClick={guardar}
          disabled={!personajeSel || saving}
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
  const cat = catPorTipo[rel.tipo] ?? catPorTipo["otro"];

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await supabase.from("relaciones_personaje").delete().eq("id", rel.id);
      void dexieDelRelacion(rel.id);
      onDelete(rel.id);
    } catch { setDeleting(false); }
  };

  return (
    <div
      className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all"
      style={{ border: "1px solid transparent" }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "color-mix(in srgb, var(--primary) 8%, transparent)";
        (e.currentTarget as HTMLDivElement).style.background  = "color-mix(in srgb, var(--primary) 3%, transparent)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "transparent";
        (e.currentTarget as HTMLDivElement).style.background  = "transparent";
      }}
    >
      {/* Avatar del personaje relacionado */}
      <div className="shrink-0 w-8 h-8 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
        {rel.rel_img_url
          ? <img src={rel.rel_img_url} alt={rel.rel_nombre} className="w-full h-full object-cover" />
          : <UserCircle2 size={13} className="text-primary/20" />}
      </div>

      {/* Nombre + tipo */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-primary/80 truncate">{rel.rel_nombre ?? "—"}</p>
        {rel.nota && (
          <p className="text-[9px] text-primary/35 truncate italic">{rel.nota}</p>
        )}
      </div>

      {/* Badge tipo */}
      <span
        className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest"
        style={{
          background:  `color-mix(in srgb, ${cat.color} 12%, transparent)`,
          color:        cat.color,
          border:      `1px solid color-mix(in srgb, ${cat.color} 25%, transparent)`,
        }}
      >
        <cat.Icon size={8} />
        {cat.label}
      </span>

      {/* Botón borrar */}
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

// ─── BloqueRelaciones (componente principal exportado) ────────────────────────

export function BloqueRelaciones({ personajeId }: { personajeId: string }) {
  const [relaciones,   setRelaciones]   = useState<Relacion[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [formVisible,  setFormVisible]  = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      // Dexie primero
      if (db) {
        const local: any[] = await (db as any).relaciones_personaje
          ?.where("personaje_id").equals(personajeId).toArray() ?? [];
        if (local.length) {
          // Enriquecer con nombres desde cache personajes
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

    try {
      // Supabase con join a personajes (tabla destino)
      const { data } = await supabase
        .from("relaciones_personaje")
        .select(`
          id, personaje_id, personaje_rel_id, tipo, nota,
          personaje_rel:personajes!relaciones_personaje_personaje_rel_id_fkey(nombre, img_url)
        `)
        .eq("personaje_id", personajeId)
        .order("tipo");

      if (data) {
        const enriquecidas: Relacion[] = (data as any[]).map(r => ({
          id:               r.id,
          personaje_id:     r.personaje_id,
          personaje_rel_id: r.personaje_rel_id,
          tipo:             r.tipo as TipoRelacion,
          nota:             r.nota,
          rel_nombre:       r.personaje_rel?.nombre  ?? "—",
          rel_img_url:      r.personaje_rel?.img_url ?? null,
        }));
        setRelaciones(enriquecidas);
        // Sync Dexie
        try {
          if (db) await (db as any).relaciones_personaje?.bulkPut(
            enriquecidas.map(({ rel_nombre: _n, rel_img_url: _i, ...rest }) => rest)
          );
        } catch {}
      }
    } catch {}
    setLoading(false);
  }, [personajeId]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleAdded   = (r: Relacion)  => { setRelaciones(prev => [...prev, r]); setFormVisible(false); };
  const handleDeleted = (id: string)   => setRelaciones(prev => prev.filter(r => r.id !== id));

  // Agrupar por tipo para visualización ordenada
  const grupos = TIPOS_RELACION.reduce<Record<TipoRelacion, Relacion[]>>((acc, c) => {
    acc[c.tipo] = relaciones.filter(r => r.tipo === c.tipo);
    return acc;
  }, {} as any);

  const tiposConData = TIPOS_RELACION.filter(c => grupos[c.tipo].length > 0);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{
          borderColor: "color-mix(in srgb, var(--primary) 6%, transparent)",
          background:  "color-mix(in srgb, var(--primary) 3%, transparent)",
        }}
      >
        <div className="flex items-center gap-2">
          <Users size={10} className="text-primary/40" />
          <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">Relaciones</span>
          {!loading && relaciones.length > 0 && (
            <span
              className="text-[8px] font-black text-primary/30 px-1.5 py-0.5 rounded-full"
              style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
            >
              {relaciones.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setFormVisible(v => !v)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all"
          style={formVisible ? {
            background:  "color-mix(in srgb, var(--primary) 10%, transparent)",
            borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)",
            color:       "var(--primary)",
          } : {
            borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
            color:       "color-mix(in srgb, var(--primary) 35%, transparent)",
          }}
        >
          {formVisible ? <X size={9} /> : <Plus size={9} />}
          {formVisible ? "Cerrar" : "Añadir"}
        </button>
      </div>

      {/* Cuerpo */}
      <div className="p-2 space-y-2">
        {/* Formulario nueva relación */}
        {formVisible && (
          <FormNuevaRelacion
            personajeId={personajeId}
            onAdded={handleAdded}
            onCancel={() => setFormVisible(false)}
          />
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 size={14} className="animate-spin text-primary/20" />
          </div>
        ) : relaciones.length === 0 ? (
          <p className="text-[9px] font-bold text-primary/20 uppercase tracking-widest text-center italic py-6">
            Sin relaciones registradas
          </p>
        ) : (
          /* Relaciones agrupadas por tipo */
          <div className="space-y-2">
            {tiposConData.map(cat => (
              <div key={cat.tipo}>
                <div className="flex items-center gap-1.5 px-1 mb-1">
                  <cat.Icon size={8} style={{ color: cat.color }} />
                  <span
                    className="text-[8px] font-black uppercase tracking-[0.25em]"
                    style={{ color: `color-mix(in srgb, ${cat.color} 70%, var(--primary))` }}
                  >
                    {cat.label}
                  </span>
                  <div
                    className="flex-1 h-px"
                    style={{ background: `color-mix(in srgb, ${cat.color} 15%, transparent)` }}
                  />
                </div>
                {grupos[cat.tipo].map(rel => (
                  <FilaRelacion key={rel.id} rel={rel} onDelete={handleDeleted} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
