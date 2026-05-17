"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Users, Bug, Package, Sparkles, Star, ScrollText, Map,
  Plus, Trash2, Save, Search, X, ChevronLeft, ChevronRight,
  Loader2, Layers, UserCircle2, Swords, Wand2, Gem, Feather,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { type SaveStatus } from "./types";
import { SaveIndicator } from "./UIComponents";

// ─── Dexie helpers ────────────────────────────────────────────────────────────
async function dexiePut(tabla: string, row: any): Promise<void> {
  try { if (db) await (db as any)[tabla]?.put(row); } catch {}
}
async function dexieDel(tabla: string, id: string): Promise<void> {
  try { if (db) await (db as any)[tabla]?.delete(id); } catch {}
}
async function dexieReadAll<T>(tabla: string): Promise<T[]> {
  try {
    if (!db) return [];
    const t = (db as any)[tabla];
    if (!t) return [];
    return ((await t.toArray()) as any[]).filter((r: any) => !r.deleted) as T[];
  } catch { return []; }
}
async function dexieWriteAll(tabla: string, rows: any[]): Promise<void> {
  try {
    if (!db) return;
    const t = (db as any)[tabla];
    if (!t) return;
    if (rows.length > 0) await t.bulkPut(rows);
    const remoteIds = new Set(rows.map((r: any) => r.id));
    const local: any[] = await t.toArray();
    const toDelete = local.map((r: any) => r.id).filter((id: string) => !remoteIds.has(id));
    if (toDelete.length > 0) await t.bulkDelete(toDelete);
  } catch {}
}

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type GrupoTipo = "personajes" | "criaturas" | "items" | "reinos" | "hechizos" | "dones" | "runas";

export type Grupo = {
  id: string;
  nombre: string;
  tipo: GrupoTipo;
  descripcion?: string | null;
  miembro_ids: string[];
  created_at?: string;
};

type EntidadMin = {
  id: string;
  nombre: string;
  imagen_url?: string | null;
  img_url?: string | null;
  especie?: string;
  reino?: string;
  habitat?: string;
  categoria?: string;
};

// ─── Config de tipos de grupo ─────────────────────────────────────────────────
export const GRUPO_TIPO_CONFIG: Record<GrupoTipo, {
  label: string;
  labelPlural: string;
  Icon: React.ElementType;
  IconAlt: React.ElementType; // icono secundario para el selector de tipo
  color: string;
  tabla: string;
  ejemplo: string;
}> = {
  personajes: {
    label: "Personaje", labelPlural: "Personajes",
    Icon: Users, IconAlt: UserCircle2,
    color: "var(--primary)", tabla: "personajes",
    ejemplo: "Facción, clan, gremio…",
  },
  criaturas: {
    label: "Criatura", labelPlural: "Criaturas",
    Icon: Bug, IconAlt: Feather,
    color: "color-mix(in srgb, var(--primary) 70%, #4ade80)", tabla: "criaturas",
    ejemplo: "Manada, especie, orden…",
  },
  items: {
    label: "Objeto", labelPlural: "Objetos",
    Icon: Package, IconAlt: Swords,
    color: "color-mix(in srgb, var(--primary) 60%, #f59e0b)", tabla: "items",
    ejemplo: "Arsenal, colección, reliquias…",
  },
  reinos: {
    label: "Reino", labelPlural: "Reinos",
    Icon: Map, IconAlt: Map,
    color: "color-mix(in srgb, var(--primary) 60%, #60a5fa)", tabla: "reinos",
    ejemplo: "Alianza, confederación, imperio…",
  },
  hechizos: {
    label: "Hechizo", labelPlural: "Hechizos",
    Icon: Sparkles, IconAlt: Wand2,
    color: "var(--accent)", tabla: "hechizos",
    ejemplo: "Escuela, elemento, estilo…",
  },
  dones: {
    label: "Don", labelPlural: "Dones",
    Icon: Star, IconAlt: Gem,
    color: "color-mix(in srgb, var(--accent) 70%, var(--primary))", tabla: "dones",
    ejemplo: "Linaje, maldición, don ancestral…",
  },
  runas: {
    label: "Runa", labelPlural: "Runas",
    Icon: ScrollText, IconAlt: ScrollText,
    color: "var(--primary)", tabla: "runas",
    ejemplo: "Conjunto rúnico, tradición…",
  },
};

// ─── Hook: cargar entidades de una tabla ──────────────────────────────────────
function useEntidades(tabla: string) {
  const [entidades, setEntidades] = useState<EntidadMin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tabla) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      const local = await dexieReadAll<EntidadMin>(tabla);
      if (local.length && !cancelled) { setEntidades(local); setLoading(false); }
      if (!navigator.onLine) { if (!local.length) setLoading(false); return; }

      let result: EntidadMin[] = [];
      if (tabla === "personajes") {
        const { data } = await supabase.from("personajes").select("id, nombre, img_url, especie, reino").order("nombre");
        result = (data ?? []).map(r => ({ id: r.id, nombre: r.nombre, img_url: r.img_url ?? undefined, especie: r.especie ?? undefined, reino: r.reino ?? undefined }));
      } else if (tabla === "criaturas") {
        const { data } = await supabase.from("criaturas").select("id, nombre, imagen_url, habitat").order("nombre");
        result = (data ?? []).map(r => ({ id: r.id, nombre: r.nombre, imagen_url: r.imagen_url ?? undefined, habitat: r.habitat ?? undefined }));
      } else if (tabla === "items") {
        const { data } = await supabase.from("items").select("id, nombre, imagen_url, categoria").order("nombre");
        result = (data ?? []).map(r => ({ id: r.id, nombre: r.nombre, imagen_url: r.imagen_url ?? undefined, categoria: r.categoria ?? undefined }));
      } else if (tabla === "reinos") {
        const { data } = await supabase.from("reinos").select("id, nombre").order("nombre");
        result = (data ?? []).map((r: any) => ({ id: r.id, nombre: r.nombre }));
      } else {
        const { data } = await (supabase.from(tabla as any) as any).select("id, nombre, imagen_url").order("nombre");
        result = (data ?? []).map((r: any) => ({ id: r.id, nombre: r.nombre, imagen_url: r.imagen_url ?? undefined }));
      }

      if (cancelled) return;
      setEntidades(result); setLoading(false);
      await dexieWriteAll(tabla, result);
    };
    run(); return () => { cancelled = true; };
  }, [tabla]);

  return { entidades, loading };
}

// ─── Hook: grupos con Supabase + Dexie ───────────────────────────────────────
export function useGrupos() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const local = await dexieReadAll<Grupo>("grupos_mundo");
    if (local.length) { setGrupos(local); setLoaded(true); }

    if (!navigator.onLine) { if (!local.length) setLoaded(true); return; }

    const { data, error } = await supabase
      .from("grupos_mundo")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { if (!local.length) setLoaded(true); return; }

    const result = (data ?? []).map((r: any) => ({
      ...r,
      miembro_ids: r.miembro_ids ?? [],
    })) as Grupo[];

    setGrupos(result);
    setLoaded(true);
    await dexieWriteAll("grupos_mundo", result);
  }, []);

  useEffect(() => { load(); }, [load]);

  const crearGrupo = useCallback(async (tipo: GrupoTipo): Promise<Grupo | null> => {
    const cfg = GRUPO_TIPO_CONFIG[tipo];
    const optimista: Grupo = {
      id: crypto.randomUUID(),
      nombre: `Nuevo ${cfg.label.toLowerCase()}`,
      tipo,
      descripcion: null,
      miembro_ids: [],
      created_at: new Date().toISOString(),
    };

    setGrupos(prev => [optimista, ...prev]);
    void dexiePut("grupos_mundo", optimista);

    const { data, error } = await supabase
      .from("grupos_mundo")
      .insert([{ id: optimista.id, nombre: optimista.nombre, tipo, descripcion: null, miembro_ids: [] }])
      .select()
      .single();

    if (error || !data) return optimista;
    const real = { ...data, miembro_ids: data.miembro_ids ?? [] } as Grupo;
    setGrupos(prev => prev.map(g => g.id === optimista.id ? real : g));
    void dexiePut("grupos_mundo", real);
    return real;
  }, []);

  const actualizarGrupo = useCallback(async (updated: Grupo): Promise<void> => {
    setGrupos(prev => prev.map(g => g.id === updated.id ? updated : g));
    void dexiePut("grupos_mundo", updated);

    await supabase
      .from("grupos_mundo")
      .update({
        nombre: updated.nombre,
        tipo: updated.tipo,
        descripcion: updated.descripcion ?? null,
        miembro_ids: updated.miembro_ids,
      })
      .eq("id", updated.id);
  }, []);

  const eliminarGrupo = useCallback(async (id: string): Promise<void> => {
    setGrupos(prev => prev.filter(g => g.id !== id));
    void dexieDel("grupos_mundo", id);
    await supabase.from("grupos_mundo").delete().eq("id", id);
  }, []);

  return { grupos, loaded, crearGrupo, actualizarGrupo, eliminarGrupo };
}

// ─── Selector de miembros ──────────────────────────────────────────────────────
function SelectorMiembros({
  tipo,
  miembro_ids,
  onChange,
  onClickMiembro,
}: {
  tipo: GrupoTipo;
  miembro_ids: string[];
  onChange: (ids: string[]) => void;
  onClickMiembro?: (id: string, tabla: string) => void;
}) {
  const cfg = GRUPO_TIPO_CONFIG[tipo];
  const { entidades, loading } = useEntidades(cfg.tabla);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const miembros = useMemo(
    () => entidades.filter(e => miembro_ids.includes(e.id)),
    [entidades, miembro_ids]
  );

  const disponibles = useMemo(
    () => entidades.filter(e => {
      const noEsta = !miembro_ids.includes(e.id);
      const matchSearch = e.nombre.toLowerCase().includes(search.toLowerCase());
      return noEsta && matchSearch;
    }),
    [entidades, miembro_ids, search]
  );

  const toggle = (id: string) => {
    if (miembro_ids.includes(id)) {
      onChange(miembro_ids.filter(x => x !== id));
    } else {
      onChange([...miembro_ids, id]);
    }
  };

  const getImg = (e: EntidadMin) => tipo === "personajes" ? e.img_url : e.imagen_url;
  const getSubtitle = (e: EntidadMin) => {
    if (tipo === "personajes") return [e.especie, e.reino].filter(Boolean).join(" · ");
    if (tipo === "criaturas") return e.habitat;
    if (tipo === "items") return e.categoria;
    return undefined;
  };

  return (
    <div className="space-y-3">
      {miembros.length > 0 && (
        <div className="space-y-1">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">
            Miembros ({miembros.length})
          </p>
          <div className="space-y-0.5">
            {miembros.map(e => {
              const img = getImg(e);
              const sub = getSubtitle(e);
              return (
                <div key={e.id}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl border transition-all"
                  style={{ borderColor: `color-mix(in srgb, ${cfg.color} 15%, transparent)`, background: `color-mix(in srgb, ${cfg.color} 5%, transparent)` }}>
                  <div className="shrink-0 w-7 h-7 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
                    {img
                      ? <img src={img} alt={e.nombre} className="w-full h-full object-cover" />
                      : <cfg.Icon size={11} className="text-primary/25" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => onClickMiembro?.(e.id, cfg.tabla)}
                      className="text-left w-full group"
                    >
                      <p className="text-[11px] font-bold text-primary/85 truncate group-hover:text-primary transition-colors">
                        {e.nombre}
                      </p>
                      {sub && <p className="text-[9px] text-primary/35 truncate">{sub}</p>}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(e.id)}
                    className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-primary/25 hover:text-red-400 transition-colors"
                  >
                    <X size={9} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed text-[9px] font-black uppercase tracking-widest transition-all"
          style={{
            borderColor: `color-mix(in srgb, ${cfg.color} 25%, transparent)`,
            color: `color-mix(in srgb, ${cfg.color} 55%, transparent)`,
          }}
        >
          <Plus size={9} /> Agregar {cfg.label.toLowerCase()}
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute z-50 bottom-full left-0 right-0 mb-1.5 rounded-xl border shadow-xl overflow-hidden"
              style={{ background: "var(--bg-main)", borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
              <div className="p-2 border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                <div className="relative">
                  <Search size={9} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary/25" />
                  <input
                    autoFocus
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={`Buscar ${cfg.labelPlural.toLowerCase()}…`}
                    className="w-full bg-primary/5 border border-primary/10 rounded-lg pl-7 pr-2 py-1.5 text-[10px] outline-none focus:border-primary/25 text-primary placeholder:text-primary/25"
                  />
                </div>
              </div>
              <div className="max-h-52 overflow-y-auto p-1">
                {loading ? (
                  <div className="flex justify-center py-6"><Loader2 size={14} className="animate-spin text-primary/20" /></div>
                ) : disponibles.length === 0 ? (
                  <p className="text-[9px] text-primary/25 text-center py-4 italic">
                    {search ? "Sin resultados" : `Todos los ${cfg.labelPlural.toLowerCase()} ya están en el grupo`}
                  </p>
                ) : disponibles.map(e => {
                  const img = getImg(e);
                  const sub = getSubtitle(e);
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onMouseDown={() => { toggle(e.id); setSearch(""); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-primary/6 transition-colors"
                    >
                      <div className="shrink-0 w-6 h-6 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
                        {img ? <img src={img} alt={e.nombre} className="w-full h-full object-cover" /> : <cfg.Icon size={10} className="text-primary/20" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-primary/80 truncate">{e.nombre}</p>
                        {sub && <p className="text-[9px] text-primary/35 truncate">{sub}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Formulario de edición de un grupo ────────────────────────────────────────
function FormularioGrupo({
  grupo,
  onSaved,
  onDeleted,
  onClickMiembro,
}: {
  grupo: Grupo;
  onSaved: (g: Grupo) => void | Promise<void>;
  onDeleted: (id: string) => void | Promise<void>;
  onClickMiembro?: (id: string, tabla: string) => void;
}) {
  const [form, setForm] = useState<Grupo>(grupo);
  const { confirm, ConfirmModal } = useConfirm();
  const cfg = GRUPO_TIPO_CONFIG[form.tipo];

  useEffect(() => { setForm(grupo); }, [grupo.id]);

  const save = () => { onSaved(form); };

  const del = async () => {
    const ok = await confirm({ message: `¿Eliminar el grupo "${form.nombre}"?`, danger: true });
    if (!ok) return;
    onDeleted(form.id);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <ConfirmModal />

      {/* Header */}
      <div className="shrink-0 flex flex-col gap-2 px-4 py-3 border-b"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)", background: "color-mix(in srgb, var(--primary) 3%, transparent)" }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border"
            style={{
              background: `color-mix(in srgb, ${cfg.color} 12%, transparent)`,
              borderColor: `color-mix(in srgb, ${cfg.color} 25%, transparent)`,
            }}>
            <cfg.Icon size={15} style={{ color: cfg.color }} />
          </div>
          <input
            value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            placeholder="Nombre del grupo…"
            className="flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
          />
        </div>

        {/* Badge tipo */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest"
            style={{ background: `color-mix(in srgb, ${cfg.color} 10%, transparent)`, color: `color-mix(in srgb, ${cfg.color} 70%, transparent)`, border: `1px solid color-mix(in srgb, ${cfg.color} 20%, transparent)` }}>
            <cfg.Icon size={8} /> {cfg.labelPlural}
          </span>
          <span className="text-[9px] text-primary/25 italic">{cfg.ejemplo}</span>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-2">
          <button onClick={del}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-red-500/15 text-red-400/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all">
            <Trash2 size={10} />
          </button>
          <button onClick={save}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-md shadow-primary/20">
            <Save size={11} /> Guardar
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-5">
        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">Descripción</label>
          <textarea
            value={form.descripcion ?? ""}
            onChange={e => setForm(f => ({ ...f, descripcion: e.target.value || null }))}
            placeholder={`¿Qué es este grupo? ${cfg.ejemplo}`}
            rows={3}
            className="w-full bg-primary/4 border border-primary/10 rounded-xl px-3 py-2.5 text-[11px] text-primary outline-none focus:border-primary/25 resize-none placeholder:text-primary/25 leading-relaxed"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">
            {cfg.labelPlural} del grupo
          </label>
          <SelectorMiembros
            tipo={form.tipo}
            miembro_ids={form.miembro_ids}
            onChange={ids => setForm(f => ({ ...f, miembro_ids: ids }))}
            onClickMiembro={onClickMiembro}
          />
        </div>

        {form.miembro_ids.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-6 rounded-xl border border-dashed"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
            <cfg.Icon size={20} strokeWidth={1} style={{ color: `color-mix(in srgb, ${cfg.color} 30%, transparent)` }} />
            <p className="text-[9px] font-black uppercase tracking-widest text-primary/20">
              Sin miembros aún
            </p>
            <p className="text-[9px] text-primary/15 text-center">
              Usá el botón de arriba para agregar {cfg.labelPlural.toLowerCase()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Selector de tipo al crear un grupo ───────────────────────────────────────
function SelectorTipoGrupo({
  onSelect,
  onCancel,
}: {
  onSelect: (tipo: GrupoTipo) => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 p-6">
      <div className="text-center">
        <Layers size={28} strokeWidth={1} className="text-primary/20 mx-auto mb-2" />
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary/50">Tipo de grupo</p>
        <p className="text-[9px] text-primary/25 mt-0.5">¿De qué serán los miembros?</p>
      </div>

      <div className="w-full max-w-xs grid grid-cols-2 gap-2">
        {(Object.entries(GRUPO_TIPO_CONFIG) as [GrupoTipo, typeof GRUPO_TIPO_CONFIG[GrupoTipo]][]).map(([tipo, cfg]) => (
          <button
            key={tipo}
            onClick={() => onSelect(tipo)}
            className="flex flex-col items-center gap-2 p-3 rounded-xl border transition-all hover:scale-[1.02]"
            style={{
              borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
              background: "color-mix(in srgb, var(--primary) 3%, transparent)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = `color-mix(in srgb, ${cfg.color} 30%, transparent)`;
              (e.currentTarget as HTMLElement).style.background = `color-mix(in srgb, ${cfg.color} 8%, transparent)`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--primary) 12%, transparent)";
              (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 3%, transparent)";
            }}
          >
            {/* Lucide icon en lugar de emoji */}
            <cfg.IconAlt
              size={20}
              strokeWidth={1.5}
              style={{ color: `color-mix(in srgb, ${cfg.color} 70%, transparent)` }}
            />
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary/70">{cfg.labelPlural}</p>
              <p className="text-[8px] text-primary/30 mt-0.5">{cfg.ejemplo}</p>
            </div>
          </button>
        ))}
      </div>

      <button onClick={onCancel}
        className="text-[9px] font-black uppercase tracking-widest text-primary/25 hover:text-primary/50 transition-colors">
        Cancelar
      </button>
    </div>
  );
}

// ─── EditorGrupo — ventana completa ───────────────────────────────────────────
export function EditorGrupo({
  onClickMiembro,
  autoCrear = false,
}: {
  onClickMiembro?: (id: string, tabla: string) => void;
  autoCrear?: boolean;
}) {
  const { grupos, loaded, crearGrupo, actualizarGrupo, eliminarGrupo } = useGrupos();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [creando, setCreando] = useState(autoCrear);

  const selected = grupos.find(g => g.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return grupos.filter(g =>
      g.nombre.toLowerCase().includes(q) ||
      GRUPO_TIPO_CONFIG[g.tipo].labelPlural.toLowerCase().includes(q)
    );
  }, [grupos, search]);

  const gruposPorTipo = useMemo(() => {
    const map: Partial<Record<GrupoTipo, Grupo[]>> = {};
    for (const g of filtered) {
      if (!map[g.tipo]) map[g.tipo] = [];
      map[g.tipo]!.push(g);
    }
    return map;
  }, [filtered]);

  const handleCrear = async (tipo: GrupoTipo) => {
    const nuevo = await crearGrupo(tipo);
    if (nuevo) setSelectedId(nuevo.id);
    setCreando(false);
  };

  if (!loaded) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 size={18} className="animate-spin text-primary/20" />
      </div>
    );
  }

  return (
    // Ocupa todo el espacio disponible del contenedor padre
    <div className="w-full h-full flex min-h-0 overflow-hidden">

      {/* ── Sidebar / lista lateral ── */}
      <div
        className={`
          flex-col border-r min-h-0
          w-64 shrink-0
          ${selected || creando ? "hidden sm:flex" : "flex flex-1 sm:flex-none"}
        `}
        style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
      >
        {/* Header del sidebar */}
        <div
          className="shrink-0 flex items-center gap-2 px-4 py-3 border-b"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
            background: "color-mix(in srgb, var(--primary) 3%, transparent)",
          }}
        >
          <Layers size={13} className="text-primary/40 shrink-0" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-primary/50 flex-1">Grupos</span>
          <span className="text-[9px] text-primary/25 tabular-nums">{grupos.length}</span>
        </div>

        {/* Buscador + nuevo */}
        <div className="shrink-0 px-3 pt-3 pb-2 space-y-2">
          <div className="relative">
            <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary/25" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar grupos…"
              className="w-full bg-primary/4 border border-primary/10 rounded-lg pl-7 pr-6 py-1.5 text-[10px] font-medium outline-none focus:border-primary/25 text-primary placeholder:text-primary/25"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-primary/30 hover:text-primary"
              >
                <X size={9} />
              </button>
            )}
          </div>

          <button
            onClick={() => { setCreando(true); setSelectedId(null); }}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed text-[9px] font-black uppercase tracking-widest transition-all"
            style={{
              borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)",
              color: "color-mix(in srgb, var(--primary) 45%, transparent)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--primary) 35%, transparent)";
              (e.currentTarget as HTMLElement).style.color = "var(--primary)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--primary) 20%, transparent)";
              (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--primary) 45%, transparent)";
            }}
          >
            <Plus size={9} /> Nuevo grupo
          </button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto min-h-0 px-3 pb-3 space-y-3">
          {grupos.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Layers size={26} strokeWidth={1} className="text-primary/15" />
              <p className="text-[9px] font-black uppercase tracking-widest text-primary/20">Sin grupos aún</p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-[9px] text-primary/20 text-center py-8 italic">Sin resultados</p>
          ) : (
            (Object.entries(GRUPO_TIPO_CONFIG) as [GrupoTipo, typeof GRUPO_TIPO_CONFIG[GrupoTipo]][])
              .filter(([tipo]) => gruposPorTipo[tipo]?.length)
              .map(([tipo, cfg]) => (
                <div key={tipo}>
                  {/* Encabezado de tipo */}
                  <div className="flex items-center gap-1.5 px-1 py-1 mb-0.5">
                    <cfg.Icon
                      size={9}
                      style={{ color: `color-mix(in srgb, ${cfg.color} 50%, transparent)` }}
                    />
                    <span
                      className="text-[8px] font-black uppercase tracking-[0.3em]"
                      style={{ color: `color-mix(in srgb, ${cfg.color} 45%, transparent)` }}
                    >
                      {cfg.labelPlural}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    {gruposPorTipo[tipo]!.map(grupo => (
                      <button
                        key={grupo.id}
                        onClick={() => { setSelectedId(grupo.id); setCreando(false); }}
                        className={`w-full text-left px-2.5 py-2 rounded-xl transition-all border ${
                          selectedId === grupo.id
                            ? "border-primary/20 bg-primary/10"
                            : "border-transparent hover:bg-primary/6 hover:border-primary/10"
                        }`}
                      >
                        <p className={`text-[11px] font-bold truncate ${selectedId === grupo.id ? "text-primary" : "text-primary/70"}`}>
                          {grupo.nombre}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[8px] text-primary/30">{grupo.miembro_ids.length} miembros</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* ── Panel principal ── */}
      <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${selected || creando ? "flex" : "hidden sm:flex"}`}>

        {/* Botón volver — solo mobile */}
        {(selected || creando) && (
          <div
            className="sm:hidden shrink-0 px-3 py-2 border-b"
            style={{
              borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
              background: "color-mix(in srgb, var(--primary) 3%, transparent)",
            }}
          >
            <button
              onClick={() => { setSelectedId(null); setCreando(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-primary/15 text-primary/50 hover:text-primary transition-all"
            >
              <ChevronLeft size={12} /> Volver
            </button>
          </div>
        )}

        {creando ? (
          <SelectorTipoGrupo
            onSelect={handleCrear}
            onCancel={() => setCreando(false)}
          />
        ) : selected ? (
          <FormularioGrupo
            key={selected.id}
            grupo={selected}
            onSaved={async updated => { await actualizarGrupo(updated); }}
            onDeleted={async id => { await eliminarGrupo(id); setSelectedId(null); }}
            onClickMiembro={onClickMiembro}
          />
        ) : (
          /* Estado vacío — desktop */
          <div className="flex-1 flex flex-col items-center justify-center gap-3 select-none">
            <Layers size={36} strokeWidth={1} className="text-primary/15" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/25">Grupos</p>
            <p className="text-[10px] text-primary/20 tracking-widest text-center max-w-xs px-4">
              Agrupá personajes, criaturas, objetos o magia en facciones, manadas, colecciones y más
            </p>
          </div>
        )}
      </div>
    </div>
  );
}