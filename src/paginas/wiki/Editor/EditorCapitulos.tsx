"use client";

/**
 * ChapterStudio — Editor privado de capítulos
 * ─ Sidebar colapsable: libros → capítulos
 * ─ Editor de texto enriquecido (plain text / markdown-ish)
 * ─ Auto-save 2s + Ctrl/Cmd+S manual
 * ─ Offline completo: Dexie + enqueueOperation → sync automático al volver la red
 * ─ Conteo de palabras, caracteres, tiempo estimado de lectura
 * ─ Modo focus (oculta todo excepto el texto)
 */

import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from "react";
import {
  BookOpen, ChevronDown, ChevronRight, ChevronUp,
  Loader2, PanelLeftClose, PanelLeftOpen,
  Plus, RefreshCw, Save, Search, SlidersHorizontal,
  Trash2, WifiOff, X, Check, CheckCircle2, AlertCircle,
  Eye, EyeOff, Maximize2, Minimize2, Clock, Hash,
  AlignLeft, Edit3, Calendar, BookMarked, Pencil,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { librosQueries } from "@/lib/api/queries/wiki/libros";
import { db } from "@/lib/api/client/db";
import { enqueueOperation } from "@/hooks/data/useOfflineSync";

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

type Libro = {
  id: string;
  titulo: string;
  sinopsis?: string;
  portada_url?: string;
  estado?: string;
};

type Capitulo = {
  id: string;
  libro_id: string;
  titulo_capitulo: string;
  contenido: string;
  orden: number;
  fecha_publicacion: string;
  status?: "pending" | "synced";
  deleted?: boolean;
};

type SaveStatus = "idle" | "saving" | "saved" | "pending" | "error";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

const TABLA_CAPS = "capitulos";

const ESTADO_COLOR: Record<string, string> = {
  "EN PROCESO": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  FINALIZADO:   "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  BORRADOR:     "bg-primary/10 text-primary/40 border-primary/20",
  PAUSADO:      "bg-primary/10 text-primary/40 border-primary/20",
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────────────────────────────────────

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function readingTime(words: number) {
  const mins = Math.ceil(words / 200);
  return mins < 1 ? "<1 min" : `${mins} min`;
}

// ─────────────────────────────────────────────────────────────────────────────
// DEXIE HELPERS — capitulos
// ─────────────────────────────────────────────────────────────────────────────

async function dexieCapRead(libroId: string): Promise<Capitulo[]> {
  try {
    const table = (db as any)[TABLA_CAPS];
    if (!table) return [];
    const rows = (await table.toArray()) as Capitulo[];
    return rows
      .filter((r) => r.libro_id === libroId && !r.deleted)
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  } catch { return []; }
}

async function dexieCapGet(id: string): Promise<Capitulo | null> {
  try { return await (db as any)[TABLA_CAPS]?.get(id) ?? null; } catch { return null; }
}

async function dexieCapWrite(rows: Capitulo[]): Promise<void> {
  try {
    const table = (db as any)[TABLA_CAPS];
    if (!table || !rows.length) return;
    await table.bulkPut(rows);
  } catch (e) { console.warn("[Dexie] capitulos:", e); }
}

async function dexieLibrosRead(): Promise<Libro[]> {
  try {
    const table = (db as any)["libros"];
    if (!table) return [];
    const rows = await table.toArray();
    return rows.filter((r: any) => !r.deleted) as Libro[];
  } catch { return []; }
}

// ─────────────────────────────────────────────────────────────────────────────
// CRUD CAPÍTULOS — con soporte offline total
// ─────────────────────────────────────────────────────────────────────────────

async function capUpdateContenido(id: string, contenido: string): Promise<void> {
  const existing = await dexieCapGet(id);

  if (!navigator.onLine) {
    const row = { ...existing, id, contenido, status: "pending" as const };
    await dexieCapWrite([row]);
    await enqueueOperation(TABLA_CAPS, "update", id, { contenido });
    return;
  }

  try {
    const res = await librosQueries.updateContenido(id, contenido);
    if (res.error) throw res.error;
    if (existing) await dexieCapWrite([{ ...existing, contenido, status: "synced" }]);
  } catch {
    // Fallback offline
    const row = { ...existing, id, contenido, status: "pending" as const };
    await dexieCapWrite([row]);
    await enqueueOperation(TABLA_CAPS, "update", id, { contenido });
    throw new Error("offline");
  }
}

async function capUpdateTitulo(id: string, titulo: string): Promise<void> {
  const existing = await dexieCapGet(id);

  if (!navigator.onLine) {
    const row = { ...existing, id, titulo_capitulo: titulo, status: "pending" as const };
    await dexieCapWrite([row]);
    await enqueueOperation(TABLA_CAPS, "update", id, { titulo_capitulo: titulo });
    return;
  }

  try {
    const { error } = await supabase
      .from(TABLA_CAPS)
      .update({ titulo_capitulo: titulo.toUpperCase() })
      .eq("id", id);
    if (error) throw error;
    if (existing) await dexieCapWrite([{ ...existing, titulo_capitulo: titulo.toUpperCase(), status: "synced" }]);
  } catch {
    const row = { ...existing, id, titulo_capitulo: titulo, status: "pending" as const };
    await dexieCapWrite([row]);
    await enqueueOperation(TABLA_CAPS, "update", id, { titulo_capitulo: titulo.toUpperCase() });
    throw new Error("offline");
  }
}

async function capCreate(libroId: string, titulo: string, orden: number, fecha: string): Promise<Capitulo> {
  const base = {
    libro_id: libroId,
    titulo_capitulo: titulo.toUpperCase(),
    contenido: "",
    orden,
    fecha_publicacion: fecha,
  };

  if (!navigator.onLine) {
    const tmpId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const row = { ...base, id: tmpId, status: "pending" as const };
    await dexieCapWrite([row]);
    await enqueueOperation(TABLA_CAPS, "upsert", tmpId, row);
    return row;
  }

  try {
    const { data, error } = await supabase
      .from(TABLA_CAPS)
      .insert([base])
      .select()
      .single();
    if (error) throw error;
    await dexieCapWrite([{ ...data, status: "synced" }]);
    return data as Capitulo;
  } catch {
    const tmpId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const row = { ...base, id: tmpId, status: "pending" as const };
    await dexieCapWrite([row]);
    await enqueueOperation(TABLA_CAPS, "upsert", tmpId, row);
    return row;
  }
}

async function capDelete(id: string): Promise<void> {
  const existing = await dexieCapGet(id);

  if (!navigator.onLine) {
    if (existing) await dexieCapWrite([{ ...existing, deleted: true, status: "pending" }]);
    await enqueueOperation(TABLA_CAPS, "delete", id);
    return;
  }

  try {
    const { error } = await supabase.from(TABLA_CAPS).delete().eq("id", id);
    if (error) throw error;
    try { await (db as any)[TABLA_CAPS]?.delete(id); } catch {}
  } catch {
    if (existing) await dexieCapWrite([{ ...existing, deleted: true, status: "pending" }]);
    await enqueueOperation(TABLA_CAPS, "delete", id);
    throw new Error("offline");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK: libros
// ─────────────────────────────────────────────────────────────────────────────

function useLibros() {
  const [libros, setLibros]     = useState<Libro[]>([]);
  const [loading, setLoading]   = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    if (!navigator.onLine) {
      const local = await dexieLibrosRead();
      setLibros(local);
      setIsOffline(true);
      setLoading(false);
      return;
    }

    setIsOffline(false);
    try {
      const { data } = await librosQueries.getAll({ order: { campo: "created_at", asc: false } });
      const libros = (data || []) as Libro[];
      setLibros(libros);
      // Persistir en Dexie
      try {
        const table = (db as any)["libros"];
        if (table) await table.bulkPut(libros.map((l) => ({ ...l, status: "synced" })));
      } catch {}
    } catch {
      const local = await dexieLibrosRead();
      setLibros(local);
      setIsOffline(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const handleOnline = () => { setIsOffline(false); load(); };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [load]);

  return { libros, loading, isOffline, refetch: load };
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK: capítulos de un libro
// ─────────────────────────────────────────────────────────────────────────────

function useCapitulos(libroId: string | null) {
  const [capitulos, setCapitulos] = useState<Capitulo[]>([]);
  const [loading, setLoading]     = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async (id: string) => {
    setLoading(true);

    if (!navigator.onLine) {
      const local = await dexieCapRead(id);
      setCapitulos(local);
      setIsOffline(true);
      setLoading(false);
      return;
    }

    setIsOffline(false);
    try {
      const { data, error } = await supabase
        .from(TABLA_CAPS)
        .select("*")
        .eq("libro_id", id)
        .order("orden", { ascending: true });

      if (error) throw error;
      const caps = (data || []) as Capitulo[];
      setCapitulos(caps);
      await dexieCapWrite(caps.map((c) => ({ ...c, status: "synced" })));
    } catch {
      const local = await dexieCapRead(id);
      setCapitulos(local);
      setIsOffline(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (libroId) load(libroId);
    else setCapitulos([]);
  }, [libroId, load]);

  useEffect(() => {
    const handleOnline = () => { if (libroId) { setIsOffline(false); load(libroId); } };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [libroId, load]);

  return { capitulos, setCapitulos, loading, isOffline, reload: () => libroId && load(libroId) };
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK: capítulo completo para editar
// ─────────────────────────────────────────────────────────────────────────────

function useCapituloEditor(capId: string | null) {
  const [cap, setCap]         = useState<Capitulo | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async (id: string) => {
    setLoading(true);

    // Intentar Dexie primero para respuesta instantánea
    const local = await dexieCapGet(id);

    if (!navigator.onLine) {
      setCap(local);
      setIsOffline(true);
      setLoading(false);
      return;
    }

    setIsOffline(false);
    try {
      const { data, error } = await supabase
        .from(TABLA_CAPS)
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;

      // Si hay un pending local más reciente, usarlo
      if (local?.status === "pending" && local.contenido !== data.contenido) {
        setCap({ ...data, contenido: local.contenido, status: "pending" });
      } else {
        setCap(data as Capitulo);
        await dexieCapWrite([{ ...data, status: "synced" }]);
      }
    } catch {
      setCap(local);
      setIsOffline(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (capId) load(capId);
    else setCap(null);
  }, [capId, load]);

  useEffect(() => {
    const handleOnline = () => { if (capId) { setIsOffline(false); load(capId); } };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [capId, load]);

  return { cap, setCap, loading, isOffline, reload: () => capId && load(capId) };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: indicador de guardado
// ─────────────────────────────────────────────────────────────────────────────

const SaveIndicator = ({ status }: { status: SaveStatus }) => {
  const map: Record<SaveStatus, { label: string; icon: React.ReactNode; cls: string }> = {
    idle:    { label: "",                             icon: null,                                         cls: "" },
    saving:  { label: "Guardando…",                  icon: <Loader2 size={10} className="animate-spin"/>, cls: "text-primary/40" },
    saved:   { label: "Guardado",                    icon: <CheckCircle2 size={10}/>,                    cls: "text-emerald-400" },
    pending: { label: "Guardado sin conexión",        icon: <WifiOff size={10}/>,                         cls: "text-blue-400" },
    error:   { label: "Error al guardar",             icon: <AlertCircle size={10}/>,                     cls: "text-red-400" },
  };
  const { label, icon, cls } = map[status];
  if (!label) return null;
  return (
    <span className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest ${cls}`}>
      {icon}{label}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: stats de escritura
// ─────────────────────────────────────────────────────────────────────────────

const WritingStats = ({ texto }: { texto: string }) => {
  const words  = wordCount(texto);
  const chars  = texto.length;
  const rtime  = readingTime(words);

  return (
    <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-primary/25">
      <span className="flex items-center gap-1"><Hash size={9}/>{words.toLocaleString()} pal.</span>
      <span className="flex items-center gap-1"><AlignLeft size={9}/>{chars.toLocaleString()} car.</span>
      <span className="flex items-center gap-1"><Clock size={9}/>{rtime}</span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: sidebar item libro (expandible)
// ─────────────────────────────────────────────────────────────────────────────

const LibroItem = ({
  libro,
  selectedCapId,
  onSelectCap,
  expanded,
  onToggle,
}: {
  libro: Libro;
  selectedCapId: string | null;
  onSelectCap: (libroId: string, capId: string) => void;
  expanded: boolean;
  onToggle: () => void;
}) => {
  const { capitulos, loading } = useCapitulos(expanded ? libro.id : null);

  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-primary/5 transition-all group text-left"
      >
        <BookMarked size={12} className="text-primary/30 shrink-0" />
        <span className="flex-1 text-xs font-black uppercase italic tracking-tight text-primary leading-tight truncate">
          {libro.titulo}
        </span>
        {libro.estado && (
          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full border shrink-0 ${ESTADO_COLOR[libro.estado] || ESTADO_COLOR.BORRADOR}`}>
            {libro.estado === "EN PROCESO" ? "WIP" : libro.estado === "FINALIZADO" ? "✓" : "…"}
          </span>
        )}
        {expanded
          ? <ChevronDown size={11} className="text-primary/25 shrink-0"/>
          : <ChevronRight size={11} className="text-primary/25 shrink-0"/>
        }
      </button>

      {expanded && (
        <div className="ml-4 pl-3 border-l border-primary/10 mt-1 space-y-0.5">
          {loading ? (
            <div className="py-3 flex justify-center"><Loader2 size={14} className="animate-spin text-primary/20"/></div>
          ) : capitulos.length === 0 ? (
            <p className="text-[9px] text-primary/25 font-black uppercase tracking-widest px-2 py-2">Sin capítulos</p>
          ) : (
            capitulos.map(cap => (
              <button
                key={cap.id}
                onClick={() => onSelectCap(libro.id, cap.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-all border text-[11px] font-bold ${
                  selectedCapId === cap.id
                    ? "bg-primary text-bg-main border-primary shadow-md shadow-primary/15"
                    : "border-transparent hover:bg-primary/5 hover:border-primary/10 text-primary/70"
                }`}
              >
                <span className="flex items-center gap-2">
                  {cap.status === "pending" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"/>
                  )}
                  <span className="truncate">
                    {cap.orden}. {cap.titulo_capitulo}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: panel editor de capítulo
// ─────────────────────────────────────────────────────────────────────────────

const PanelEditor = ({
  capId,
  libroId,
  onCapitulosChange,
  focusMode,
  onToggleFocus,
}: {
  capId: string;
  libroId: string;
  onCapitulosChange: () => void;
  focusMode: boolean;
  onToggleFocus: () => void;
}) => {
  const { cap, setCap, loading, isOffline, reload } = useCapituloEditor(capId);
  const [contenido, setContenido]   = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titulo, setTitulo]         = useState("");
  const timer   = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sincronizar al cargar capítulo
  useEffect(() => {
    if (!cap) return;
    setContenido(cap.contenido || "");
    setTitulo(cap.titulo_capitulo || "");
    // Si hay pending local, marcar
    if (cap.status === "pending") setSaveStatus("pending");
    else setSaveStatus("idle");
  }, [cap?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, [contenido]);

  const doSave = useCallback(async (val: string) => {
    clearTimeout(timer.current);
    setSaveStatus("saving");
    try {
      await capUpdateContenido(capId, val);
      setCap(prev => prev ? { ...prev, contenido: val } : prev);
      setSaveStatus(navigator.onLine ? "saved" : "pending");
      if (navigator.onLine) setTimeout(() => setSaveStatus("idle"), 2500);
    } catch (e: any) {
      // capUpdateContenido ya guardó en Dexie
      setSaveStatus(e?.message === "offline" ? "pending" : "error");
    }
  }, [capId, setCap]);

  const onChange = (val: string) => {
    setContenido(val);
    setSaveStatus("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => doSave(val), 2000);
  };

  const handleSaveTitle = async () => {
    if (!titulo.trim()) return;
    try {
      await capUpdateTitulo(capId, titulo);
      setCap(prev => prev ? { ...prev, titulo_capitulo: titulo.toUpperCase() } : prev);
      onCapitulosChange();
    } catch {}
    setEditingTitle(false);
  };

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar permanentemente "${cap?.titulo_capitulo}"?`)) return;
    try {
      await capDelete(capId);
      onCapitulosChange();
    } catch {}
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center text-primary/30">
      <Loader2 className="animate-spin" size={28}/>
    </div>
  );

  if (!cap) return null;

  const words = wordCount(contenido);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

      {/* Banner offline */}
      {isOffline && (
        <div className="shrink-0 flex items-center gap-2 px-8 py-2.5 bg-blue-500/10 border-b border-blue-500/20 text-[10px] font-black uppercase tracking-widest text-blue-400">
          <WifiOff size={12}/>
          Sin conexión — los cambios se guardan localmente y se sincronizan al volver
        </div>
      )}

      {/* Pending banner */}
      {saveStatus === "pending" && !isOffline && (
        <div className="shrink-0 flex items-center gap-2 px-8 py-2 bg-blue-500/8 border-b border-blue-500/15 text-[9px] font-black uppercase tracking-widest text-blue-400/70">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"/>
          Cambios pendientes de sincronizar
        </div>
      )}

      {/* Cabecera */}
      {!focusMode && (
        <div className="shrink-0 px-8 pt-6 pb-4 border-b border-primary/8 space-y-3">
          {/* Título editable */}
          <div className="flex items-start gap-3">
            {editingTitle ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  autoFocus
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") handleSaveTitle();
                    if (e.key === "Escape") { setEditingTitle(false); setTitulo(cap.titulo_capitulo); }
                  }}
                  className="flex-1 bg-transparent text-2xl font-black uppercase italic tracking-tight text-primary outline-none border-b-2 border-primary/30 focus:border-primary pb-1"
                />
                <button onClick={handleSaveTitle} className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all"><Check size={14}/></button>
                <button onClick={() => { setEditingTitle(false); setTitulo(cap.titulo_capitulo); }} className="p-2 rounded-lg hover:bg-primary/5 text-primary/30 hover:text-primary transition-all"><X size={14}/></button>
              </div>
            ) : (
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <h1
                  className="flex-1 text-2xl font-black uppercase italic tracking-tight text-primary leading-tight cursor-pointer hover:text-primary/70 transition-colors"
                  onClick={() => setEditingTitle(true)}
                >
                  {cap.titulo_capitulo}
                </h1>
                <button onClick={() => setEditingTitle(true)} className="shrink-0 p-1.5 rounded-lg hover:bg-primary/8 text-primary/25 hover:text-primary transition-all mt-1">
                  <Pencil size={13}/>
                </button>
              </div>
            )}

            {/* Acciones top-right */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => doSave(contenido)}
                disabled={saveStatus === "saving"}
                className="p-2 rounded-lg hover:bg-primary/8 text-primary/30 hover:text-primary transition-all disabled:opacity-30"
                title="Guardar ahora (Ctrl+S)"
              >
                <Save size={14}/>
              </button>
              <button onClick={onToggleFocus} className="p-2 rounded-lg hover:bg-primary/8 text-primary/30 hover:text-primary transition-all" title="Modo focus">
                <Maximize2 size={14}/>
              </button>
              <button onClick={reload as any} className="p-2 rounded-lg hover:bg-primary/8 text-primary/30 hover:text-primary transition-all" title="Recargar">
                <RefreshCw size={13}/>
              </button>
              <button onClick={handleDelete} className="p-2 rounded-lg hover:bg-red-500/10 text-primary/20 hover:text-red-400 transition-all" title="Eliminar capítulo">
                <Trash2 size={13}/>
              </button>
            </div>
          </div>

          {/* Meta + stats */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 text-[9px] font-black uppercase text-primary/30 tracking-widest">
              <span className="flex items-center gap-1"><Hash size={9}/>{cap.orden}</span>
              <span className="flex items-center gap-1">
                <Calendar size={9}/>
                {new Date(cap.fecha_publicacion) > new Date() ? "Programado " : ""}
                {new Date(cap.fecha_publicacion).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <WritingStats texto={contenido}/>
              <SaveIndicator status={saveStatus}/>
            </div>
          </div>
        </div>
      )}

      {/* Focus mode top bar */}
      {focusMode && (
        <div className="shrink-0 flex items-center justify-between px-8 py-3 border-b border-primary/5">
          <span className="text-xs font-black uppercase italic tracking-tight text-primary/40 truncate max-w-xs">
            {cap.titulo_capitulo}
          </span>
          <div className="flex items-center gap-3">
            <WritingStats texto={contenido}/>
            <SaveIndicator status={saveStatus}/>
            <button onClick={onToggleFocus} className="p-1.5 rounded-lg hover:bg-primary/8 text-primary/25 hover:text-primary transition-all">
              <Minimize2 size={13}/>
            </button>
          </div>
        </div>
      )}

      {/* EDITOR */}
      <div className={`flex-1 overflow-y-auto ${focusMode ? "px-16 py-12 max-w-3xl mx-auto w-full" : "px-8 py-6"}`}>
        <textarea
          ref={textareaRef}
          value={contenido}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); doSave(contenido); }
          }}
          spellCheck
          className={`w-full bg-transparent outline-none resize-none text-primary leading-[1.9] placeholder:text-primary/15 font-serif transition-all ${
            focusMode
              ? "text-xl"
              : "text-base"
          }`}
          style={{ minHeight: "60vh" }}
          placeholder="Empieza a escribir…"
        />
      </div>

      {/* Footer con stats en modo normal */}
      {!focusMode && (
        <div className="shrink-0 px-8 py-3 border-t border-primary/5 flex items-center justify-between">
          <WritingStats texto={contenido}/>
          <div className="flex items-center gap-2 text-[9px] font-black uppercase text-primary/20 tracking-widest">
            <span>Ctrl+S para guardar</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MODAL: nuevo capítulo
// ─────────────────────────────────────────────────────────────────────────────

const ModalNuevoCapitulo = ({
  libroId,
  ordenSiguiente,
  onCreated,
  onClose,
}: {
  libroId: string;
  ordenSiguiente: number;
  onCreated: (cap: Capitulo) => void;
  onClose: () => void;
}) => {
  const [titulo, setTitulo]     = useState("");
  const [fecha, setFecha]       = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    setSaving(true);
    try {
      const nuevo = await capCreate(libroId, titulo, ordenSiguiente, fecha);
      onCreated(nuevo);
      onClose();
    } catch {}
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-bg-main border border-primary/15 rounded-2xl p-8 w-full max-w-sm shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 italic">Nuevo Capítulo</h3>
          <button onClick={onClose} className="text-primary/30 hover:text-primary"><X size={16}/></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase text-primary/30 tracking-widest">Título</label>
            <input
              autoFocus
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              className="w-full bg-primary/5 border border-primary/15 rounded-xl px-4 py-3 text-sm font-black uppercase text-primary outline-none focus:border-primary/40 transition-colors placeholder:text-primary/20"
              placeholder="NOMBRE DEL CAPÍTULO…"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase text-primary/30 tracking-widest">Fecha de publicación</label>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="w-full bg-primary/5 border border-primary/15 rounded-xl px-4 py-3 text-sm font-bold text-primary outline-none focus:border-primary/40 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={saving || !titulo.trim()}
            className="w-full bg-primary text-bg-main py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {saving ? <><Loader2 size={13} className="animate-spin"/>Creando…</> : <><Plus size={13}/>Crear Capítulo</>}
          </button>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL — ChapterStudio
// ─────────────────────────────────────────────────────────────────────────────

export default function ChapterStudio() {
  const { libros, loading: loadingLibros, isOffline: listaOffline, refetch } = useLibros();

  const [expandedLibros, setExpandedLibros] = useState<Set<string>>(new Set());
  const [selectedLibroId, setSelectedLibroId]   = useState<string | null>(null);
  const [selectedCapId,   setSelectedCapId]     = useState<string | null>(null);
  const [sidebarOpen,     setSidebarOpen]       = useState(true);
  const [focusMode,       setFocusMode]         = useState(false);
  const [busqueda,        setBusqueda]          = useState("");
  const [showNuevoCap,    setShowNuevoCap]      = useState(false);
  const [capRefreshKey,   setCapRefreshKey]     = useState(0); // para forzar reload de lista

  // Capítulos del libro activo (para saber el orden siguiente)
  const { capitulos, setCapitulos, reload: reloadCaps } = useCapitulos(selectedLibroId);

  // Filtrado de libros
  const librosFiltrados = useMemo(() =>
    libros.filter(l => !busqueda || normalize(l.titulo).includes(normalize(busqueda))),
    [libros, busqueda]
  );

  const toggleExpanded = (libroId: string) => {
    setExpandedLibros(prev => {
      const next = new Set(prev);
      if (next.has(libroId)) next.delete(libroId);
      else next.add(libroId);
      return next;
    });
  };

  const handleSelectCap = (libroId: string, capId: string) => {
    setSelectedLibroId(libroId);
    setSelectedCapId(capId);
    setFocusMode(false);
  };

  const handleCapCreated = (cap: Capitulo) => {
    setCapitulos(prev => [...prev, cap]);
    setSelectedCapId(cap.id);
    setCapRefreshKey(k => k + 1);
  };

  return (
    <div className="flex h-screen bg-bg-main overflow-hidden">

      {/* ════ SIDEBAR COLAPSADA ════ */}
      {!sidebarOpen && (
        <div className="shrink-0 w-10 flex flex-col items-center pt-6 gap-4 border-r border-primary/10 bg-bg-main">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-primary/10 text-primary/30 hover:text-primary transition-all"
            title="Abrir sidebar"
          >
            <PanelLeftOpen size={16}/>
          </button>
          <span
            className="text-[9px] font-black uppercase text-primary/15 tracking-[0.25em] select-none"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            Biblioteca
          </span>
        </div>
      )}

      {/* ════ SIDEBAR ABIERTA ════ */}
      {sidebarOpen && (
        <aside className="w-72 shrink-0 flex flex-col border-r border-primary/10 bg-bg-main">

          {/* Header */}
          <div className="px-5 pt-6 pb-4 border-b border-primary/10 shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-[0.3em] text-primary/50 flex items-center gap-2">
                <BookOpen size={12}/> Chapter Studio
              </h2>
              <div className="flex items-center gap-1">
                <button onClick={refetch} title="Recargar" className="p-1.5 rounded-lg hover:bg-primary/10 text-primary/30 hover:text-primary transition-all">
                  <RefreshCw size={12}/>
                </button>
                <button onClick={() => setSidebarOpen(false)} title="Cerrar sidebar" className="p-1.5 rounded-lg hover:bg-primary/10 text-primary/30 hover:text-primary transition-all">
                  <PanelLeftClose size={14}/>
                </button>
              </div>
            </div>

            {/* Buscador libros */}
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/30"/>
              <input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar libro…"
                className="w-full bg-primary/5 border border-primary/10 rounded-xl pl-9 pr-9 py-2.5 text-xs font-medium text-primary outline-none focus:border-primary/30 placeholder:text-primary/25 transition-colors"
              />
              {busqueda && (
                <button onClick={() => setBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/30 hover:text-primary">
                  <X size={12}/>
                </button>
              )}
            </div>

            {/* Botón nuevo capítulo (si hay libro seleccionado) */}
            {selectedLibroId && (
              <button
                onClick={() => setShowNuevoCap(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-primary/20 text-[10px] font-black uppercase text-primary/35 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all tracking-widest"
              >
                <Plus size={12}/> Nuevo Capítulo
              </button>
            )}
          </div>

          {/* Lista de libros */}
          <div className="flex-1 overflow-y-auto px-3 py-3">
            {loadingLibros ? (
              <div className="flex items-center justify-center py-12 text-primary/30">
                <Loader2 className="animate-spin" size={20}/>
              </div>
            ) : librosFiltrados.length === 0 ? (
              <div className="text-center py-10 text-primary/25">
                <p className="text-xs font-black uppercase tracking-widest">Sin resultados</p>
              </div>
            ) : (
              librosFiltrados.map(libro => (
                <LibroItem
                  key={libro.id + capRefreshKey}
                  libro={libro}
                  selectedCapId={selectedCapId}
                  onSelectCap={handleSelectCap}
                  expanded={expandedLibros.has(libro.id)}
                  onToggle={() => toggleExpanded(libro.id)}
                />
              ))
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 px-5 py-3 border-t border-primary/10 text-[9px] font-black uppercase tracking-widest flex justify-between items-center">
            {listaOffline
              ? <span className="flex items-center gap-1 text-blue-400"><WifiOff size={10}/> Offline</span>
              : <span className="text-primary/20">{libros.length} libros</span>
            }
            {selectedCapId && (
              <button
                onClick={() => setFocusMode(m => !m)}
                className="text-primary/25 hover:text-primary transition-colors"
                title="Modo focus"
              >
                {focusMode ? <Minimize2 size={11}/> : <Maximize2 size={11}/>}
              </button>
            )}
          </div>
        </aside>
      )}

      {/* ════ PANEL PRINCIPAL ════ */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0">
        {selectedCapId && selectedLibroId ? (
          <PanelEditor
            key={selectedCapId}
            capId={selectedCapId}
            libroId={selectedLibroId}
            onCapitulosChange={() => setCapRefreshKey(k => k + 1)}
            focusMode={focusMode}
            onToggleFocus={() => setFocusMode(m => !m)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 text-primary/20 select-none">
            <div className="p-8 rounded-3xl border-2 border-dashed border-primary/10">
              <BookOpen size={52} strokeWidth={1}/>
            </div>
            <div className="text-center">
              <p className="text-sm font-black uppercase tracking-[0.3em]">Chapter Studio</p>
              <p className="text-xs mt-1 tracking-widest opacity-60">Expande un libro y selecciona un capítulo</p>
            </div>
          </div>
        )}
      </main>

      {/* Modal nuevo capítulo */}
      {showNuevoCap && selectedLibroId && (
        <ModalNuevoCapitulo
          libroId={selectedLibroId}
          ordenSiguiente={capitulos.length + 1}
          onCreated={handleCapCreated}
          onClose={() => setShowNuevoCap(false)}
        />
      )}
    </div>
  );
}