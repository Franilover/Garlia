"use client";

/**
 * Estudio de Capítulos — editor con soporte offline
 * ─ Sidebar: libros expandibles → capítulos con menú 3 puntos
 * ─ Editar título y fecha de publicación directamente desde el panel
 * ─ Auto-guardado 2s + Ctrl/Cmd+S manual
 * ─ Offline: Dexie + enqueueOperation → sync automático al reconectar
 * ─ Contador de palabras, caracteres, tiempo de lectura estimado
 * ─ Modo foco (oculta todo excepto el texto)
 */

import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from "react";
import {
  BookOpen, ChevronDown, ChevronRight,
  Loader2, PanelLeftClose, PanelLeftOpen,
  Plus, RefreshCw, Save, Search,
  Trash2, WifiOff, X, Check, CheckCircle2, AlertCircle,
  Eye, EyeOff, Maximize2, Minimize2, Clock, Hash,
  AlignLeft, Calendar, BookMarked, Pencil, MoreHorizontal,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { librosQueries } from "@/lib/api/queries/wiki/libros";
import { db } from "@/lib/api/client/db";
import { enqueueOperation } from "@/hooks/data/useOfflineSync";
import EstudioLayout from "@/components/layout/EstudioLayout";
import { BannerOffline, EmptyEstudio, ModalBase, SaveIndicator, SaveStatus, CampoInput, BotonSubmit, normalize } from "@/components/templates/EstudioTemplates";

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

// normalize importado de EstudioTemplates

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function readingTime(words: number) {
  const mins = Math.ceil(words / 200);
  return mins < 1 ? "<1 min" : `${mins} min`;
}

function toDateInput(iso: string) {
  return iso ? iso.split("T")[0] : new Date().toISOString().split("T")[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// DEXIE HELPERS
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
// CRUD CAPÍTULOS
// ─────────────────────────────────────────────────────────────────────────────

async function capUpdateContenido(id: string, contenido: string): Promise<void> {
  const existing = await dexieCapGet(id);
  if (!navigator.onLine) {
    await dexieCapWrite([{ ...existing, id, contenido, status: "pending" } as Capitulo]);
    await enqueueOperation(TABLA_CAPS, "update", id, { contenido });
    return;
  }
  try {
    const res = await librosQueries.updateContenido(id, contenido);
    if (res.error) throw res.error;
    if (existing) await dexieCapWrite([{ ...existing, contenido, status: "synced" }]);
  } catch {
    await dexieCapWrite([{ ...existing, id, contenido, status: "pending" } as Capitulo]);
    await enqueueOperation(TABLA_CAPS, "update", id, { contenido });
    throw new Error("offline");
  }
}

async function capUpdateMeta(id: string, fields: Partial<Capitulo>): Promise<void> {
  const existing = await dexieCapGet(id);
  if (!navigator.onLine) {
    await dexieCapWrite([{ ...existing, id, ...fields, status: "pending" } as Capitulo]);
    await enqueueOperation(TABLA_CAPS, "update", id, fields);
    return;
  }
  try {
    const { error } = await supabase.from(TABLA_CAPS).update(fields).eq("id", id);
    if (error) throw error;
    if (existing) await dexieCapWrite([{ ...existing, ...fields, status: "synced" }]);
  } catch {
    await dexieCapWrite([{ ...existing, id, ...fields, status: "pending" } as Capitulo]);
    await enqueueOperation(TABLA_CAPS, "update", id, fields);
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
    const { data, error } = await supabase.from(TABLA_CAPS).insert([base]).select().single();
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
// HOOKS
// ─────────────────────────────────────────────────────────────────────────────

function useLibros() {
  const [libros, setLibros]       = useState<Libro[]>([]);
  const [loading, setLoading]     = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async () => {
    // Mostrar Dexie inmediatamente — sin spinner si ya hay datos
    const local = await dexieLibrosRead();
    if (local.length > 0) {
      setLibros(local);
      setLoading(false);
    }

    if (!navigator.onLine) {
      setIsOffline(true);
      setLoading(false);
      return;
    }
    setIsOffline(false);

    try {
      const fetchPromise = librosQueries.getAll({ order: { campo: "created_at", asc: false } });
      const timeout = new Promise<"timeout">(r => setTimeout(() => r("timeout"), 5000));
      const result = await Promise.race([fetchPromise, timeout]);

      if (result === "timeout") {
        setIsOffline(local.length === 0); // solo marcar offline si no había local
        setLoading(false);
        return;
      }

      const l = ((result as any)?.data || []) as Libro[];
      setLibros(l);
      try {
        const table = (db as any)["libros"];
        if (table) await table.bulkPut(l.map((x) => ({ ...x, status: "synced" })));
      } catch {}
    } catch {
      if (local.length === 0) setLibros(await dexieLibrosRead());
      setIsOffline(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const h = () => { setIsOffline(false); load(); };
    window.addEventListener("online", h);
    return () => window.removeEventListener("online", h);
  }, [load]);

  return { libros, loading, isOffline, refetch: load };
}

function useCapitulos(libroId: string | null) {
  const [capitulos, setCapitulos] = useState<Capitulo[]>([]);
  const [loading, setLoading]     = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async (id: string) => {
    // Mostrar local inmediatamente
    const local = await dexieCapRead(id);
    if (local.length > 0) {
      setCapitulos(local);
      setLoading(false);
    } else {
      setLoading(true);
    }

    if (!navigator.onLine) {
      setIsOffline(true);
      setLoading(false);
      return;
    }
    setIsOffline(false);

    try {
      const fetchPromise = supabase
        .from(TABLA_CAPS).select("*").eq("libro_id", id).order("orden", { ascending: true });
      const timeout = new Promise<"timeout">(r => setTimeout(() => r("timeout"), 5000));
      const result = await Promise.race([fetchPromise, timeout]);

      if (result === "timeout") {
        setIsOffline(local.length === 0);
        setLoading(false);
        return;
      }

      const { data, error } = result as any;
      if (error) throw error;
      const caps = (data || []) as Capitulo[];
      setCapitulos(caps);
      await dexieCapWrite(caps.map((c) => ({ ...c, status: "synced" })));
    } catch {
      if (local.length === 0) setCapitulos(await dexieCapRead(id));
      setIsOffline(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (libroId) load(libroId);
    else setCapitulos([]);
  }, [libroId, load]);

  useEffect(() => {
    const h = () => { if (libroId) { setIsOffline(false); load(libroId); } };
    window.addEventListener("online", h);
    return () => window.removeEventListener("online", h);
  }, [libroId, load]);

  return { capitulos, setCapitulos, loading, isOffline, reload: () => libroId && load(libroId) };
}

function useCapituloEditor(capId: string | null) {
  const [cap, setCap]             = useState<Capitulo | null>(null);
  const [loading, setLoading]     = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async (id: string) => {
    // Mostrar local inmediatamente — sin bloquear
    const local = await dexieCapGet(id);
    if (local) {
      setCap(local);
      setLoading(false);
    } else {
      setLoading(true);
    }

    if (!navigator.onLine) {
      setIsOffline(true);
      setLoading(false);
      return;
    }
    setIsOffline(false);

    try {
      const fetchPromise = supabase.from(TABLA_CAPS).select("*").eq("id", id).single();
      const timeout = new Promise<"timeout">(r => setTimeout(() => r("timeout"), 5000));
      const result = await Promise.race([fetchPromise, timeout]);

      if (result === "timeout") {
        setIsOffline(!local); // degradado solo si no había local
        setLoading(false);
        return;
      }

      const { data, error } = result as any;
      if (error) throw error;

      // Si hay cambios pendientes locales, preservarlos
      if (local?.status === "pending" && local.contenido !== data.contenido) {
        setCap({ ...data, contenido: local.contenido, status: "pending" });
      } else {
        setCap(data as Capitulo);
        await dexieCapWrite([{ ...data, status: "synced" }]);
      }
    } catch {
      if (!local) setCap(await dexieCapGet(id));
      setIsOffline(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (capId) load(capId);
    else setCap(null);
  }, [capId, load]);

  useEffect(() => {
    const h = () => { if (capId) { setIsOffline(false); load(capId); } };
    window.addEventListener("online", h);
    return () => window.removeEventListener("online", h);
  }, [capId, load]);

  return { cap, setCap, loading, isOffline, reload: () => capId && load(capId) };
}

// SaveIndicator importado de EstudioTemplates

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: estadísticas de escritura
// ─────────────────────────────────────────────────────────────────────────────

const EstadisticasEscritura = ({ texto }: { texto: string }) => {
  const palabras  = wordCount(texto);
  const caracteres = texto.length;
  const lectura   = readingTime(palabras);
  return (
    <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-primary/25">
      <span className="flex items-center gap-1"><Hash size={9}/>{palabras.toLocaleString()} pal.</span>
      <span className="flex items-center gap-1"><AlignLeft size={9}/>{caracteres.toLocaleString()} car.</span>
      <span className="flex items-center gap-1"><Clock size={9}/>{lectura}</span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: item de capítulo en sidebar con menú 3 puntos
// ─────────────────────────────────────────────────────────────────────────────

const CapituloItem = ({
  cap, selected, onClick, onEdit, onDelete,
}: {
  cap: Capitulo;
  selected: boolean;
  onClick: () => void;
  onEdit: (cap: Capitulo) => void;
  onDelete: (id: string) => void;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div className="relative group/cap">
      <button
        onClick={onClick}
        className={`w-full text-left px-3 py-2 rounded-lg transition-all border text-[11px] font-bold ${
          selected
            ? "bg-primary text-bg-main border-primary shadow-md shadow-primary/15"
            : "border-transparent hover:bg-primary/5 hover:border-primary/10 text-primary/70"
        }`}
      >
        <span className="flex items-center gap-2 pr-5">
          {cap.status === "pending" && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
          )}
          <span className="truncate">
            {cap.orden}. {cap.titulo_capitulo}
          </span>
        </span>
      </button>

      <div ref={menuRef} className="absolute top-1 right-1">
        <button
          onClick={e => { e.stopPropagation(); setMenuOpen(m => !m); }}
          className={`p-1 rounded transition-all ${
            menuOpen
              ? "bg-primary/20 text-primary opacity-100"
              : selected
                ? "opacity-50 hover:opacity-100 text-bg-main hover:bg-bg-main/20"
                : "opacity-0 group-hover/cap:opacity-100 text-primary/40 hover:bg-primary/10 hover:text-primary"
          }`}
        >
          <MoreHorizontal size={11} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-7 z-50 min-w-[150px] bg-bg-main border border-primary/15 rounded-xl shadow-xl py-1 overflow-hidden">
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(false); onEdit(cap); }}
              className="w-full text-left px-3 py-2 text-[10px] font-black uppercase tracking-widest text-primary/60 hover:bg-primary/8 hover:text-primary transition-all flex items-center gap-2"
            >
              <Pencil size={10} /> Editar
            </button>
            <div className="h-px bg-primary/8 mx-2 my-1" />
            <button
              onClick={e => {
                e.stopPropagation();
                setMenuOpen(false);
                if (confirm(`¿Eliminar "${cap.titulo_capitulo}"?`)) onDelete(cap.id);
              }}
              className="w-full text-left px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-400/70 hover:bg-red-500/8 hover:text-red-400 transition-all flex items-center gap-2"
            >
              <Trash2 size={10} /> Eliminar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: libro expandible en sidebar
// ─────────────────────────────────────────────────────────────────────────────

const LibroItem = ({
  libro, selectedCapId, onSelectCap, expanded, onToggle, onEditCap, onDeleteCap,
}: {
  libro: Libro;
  selectedCapId: string | null;
  onSelectCap: (libroId: string, capId: string) => void;
  expanded: boolean;
  onToggle: () => void;
  onEditCap: (cap: Capitulo) => void;
  onDeleteCap: (id: string, libroId: string) => void;
}) => {
  const { capitulos, loading } = useCapitulos(expanded ? libro.id : null);

  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-primary/5 transition-all text-left"
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
              <CapituloItem
                key={cap.id}
                cap={cap}
                selected={selectedCapId === cap.id}
                onClick={() => onSelectCap(libro.id, cap.id)}
                onEdit={onEditCap}
                onDelete={id => onDeleteCap(id, libro.id)}
              />
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
  capId, libroId, onCapitulosChange, focusMode, onToggleFocus,
}: {
  capId: string;
  libroId: string;
  onCapitulosChange: () => void;
  focusMode: boolean;
  onToggleFocus: () => void;
}) => {
  const { cap, setCap, loading, isOffline, reload } = useCapituloEditor(capId);
  const [contenido,     setContenido]     = useState("");
  const [saveStatus,    setSaveStatus]    = useState<SaveStatus>("idle");
  const [editingTitle,  setEditingTitle]  = useState(false);
  const [titulo,        setTitulo]        = useState("");
  const [editingFecha,  setEditingFecha]  = useState(false);
  const [fecha,         setFecha]         = useState("");
  const [savingMeta,    setSavingMeta]    = useState(false);
  const timer   = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!cap) return;
    setContenido(cap.contenido || "");
    setTitulo(cap.titulo_capitulo || "");
    setFecha(toDateInput(cap.fecha_publicacion));
    if (cap.status === "pending") setSaveStatus("pending");
    else setSaveStatus("idle");
  }, [cap?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setSavingMeta(true);
    try {
      await capUpdateMeta(capId, { titulo_capitulo: titulo.trim().toUpperCase() });
      setCap(prev => prev ? { ...prev, titulo_capitulo: titulo.trim().toUpperCase() } : prev);
      onCapitulosChange();
    } catch {}
    setEditingTitle(false);
    setSavingMeta(false);
  };

  const handleSaveFecha = async () => {
    if (!fecha) return;
    setSavingMeta(true);
    try {
      await capUpdateMeta(capId, { fecha_publicacion: fecha });
      setCap(prev => prev ? { ...prev, fecha_publicacion: fecha } : prev);
      onCapitulosChange();
    } catch {}
    setEditingFecha(false);
    setSavingMeta(false);
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

  const palabras = wordCount(contenido);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

      {isOffline && <BannerOffline color="blue" mensaje="Sin conexión — los cambios se guardan localmente" />}

      {saveStatus === "pending" && !isOffline && (
        <div className="shrink-0 flex items-center gap-2 px-8 py-2 bg-blue-500/8 border-b border-blue-500/15 text-[9px] font-black uppercase tracking-widest text-blue-400/70">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"/>
          Cambios pendientes de sincronizar
        </div>
      )}

      {/* Cabecera */}
      {!focusMode && (
        <div className="shrink-0 px-8 pt-6 pb-4 border-b border-primary/8 space-y-4">

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
                <button onClick={handleSaveTitle} disabled={savingMeta} className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all disabled:opacity-40">
                  {savingMeta ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>}
                </button>
                <button onClick={() => { setEditingTitle(false); setTitulo(cap.titulo_capitulo); }} className="p-2 rounded-lg hover:bg-primary/5 text-primary/30 hover:text-primary transition-all">
                  <X size={14}/>
                </button>
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

            {/* Acciones */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => doSave(contenido)}
                disabled={saveStatus === "saving"}
                className="p-2 rounded-lg hover:bg-primary/8 text-primary/30 hover:text-primary transition-all disabled:opacity-30"
                title="Guardar (Ctrl+S)"
              >
                <Save size={14}/>
              </button>
              <button onClick={onToggleFocus} className="p-2 rounded-lg hover:bg-primary/8 text-primary/30 hover:text-primary transition-all" title="Modo foco">
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

          {/* Meta: número orden + fecha editable + stats */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 text-[9px] font-black uppercase text-primary/30 tracking-widest flex-wrap">
              <span className="flex items-center gap-1">
                <Hash size={9}/> Cap. {cap.orden}
              </span>

              {/* Fecha editable */}
              {editingFecha ? (
                <span className="flex items-center gap-1.5">
                  <Calendar size={9}/>
                  <input
                    autoFocus
                    type="date"
                    value={fecha}
                    onChange={e => setFecha(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") handleSaveFecha();
                      if (e.key === "Escape") { setEditingFecha(false); setFecha(toDateInput(cap.fecha_publicacion)); }
                    }}
                    className="bg-primary/5 border border-primary/20 rounded-lg px-2 py-0.5 text-[9px] font-bold text-primary outline-none focus:border-primary/40 transition-colors"
                  />
                  <button onClick={handleSaveFecha} disabled={savingMeta} className="p-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-all disabled:opacity-40">
                    {savingMeta ? <Loader2 size={10} className="animate-spin"/> : <Check size={10}/>}
                  </button>
                  <button onClick={() => { setEditingFecha(false); setFecha(toDateInput(cap.fecha_publicacion)); }} className="p-1 rounded hover:bg-primary/5 text-primary/30 hover:text-primary transition-all">
                    <X size={10}/>
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setEditingFecha(true)}
                  className="flex items-center gap-1 hover:text-primary transition-colors group/fecha"
                  title="Editar fecha"
                >
                  <Calendar size={9}/>
                  {new Date(cap.fecha_publicacion) > new Date() ? "Programado · " : ""}
                  {new Date(cap.fecha_publicacion).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                  <Pencil size={8} className="opacity-0 group-hover/fecha:opacity-60 transition-opacity ml-0.5"/>
                </button>
              )}
            </div>

            <div className="flex items-center gap-4">
              <EstadisticasEscritura texto={contenido}/>
              <SaveIndicator status={saveStatus}/>
            </div>
          </div>
        </div>
      )}

      {/* Modo foco — barra mínima */}
      {focusMode && (
        <div className="shrink-0 flex items-center justify-between px-8 py-3 border-b border-primary/5">
          <span className="text-xs font-black uppercase italic tracking-tight text-primary/40 truncate max-w-xs">
            {cap.titulo_capitulo}
          </span>
          <div className="flex items-center gap-3">
            <EstadisticasEscritura texto={contenido}/>
            <SaveIndicator status={saveStatus}/>
            <button onClick={onToggleFocus} className="p-1.5 rounded-lg hover:bg-primary/8 text-primary/25 hover:text-primary transition-all">
              <Minimize2 size={13}/>
            </button>
          </div>
        </div>
      )}

      {/* Editor */}
      <div className={`flex-1 overflow-y-auto ${focusMode ? "px-16 py-12 max-w-3xl mx-auto w-full" : "px-8 py-6"}`}>
        <textarea
          ref={textareaRef}
          value={contenido}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); doSave(contenido); }
          }}
          spellCheck
          className={`w-full bg-transparent outline-none resize-none text-primary leading-[1.9] placeholder:text-primary/15 font-serif transition-all ${focusMode ? "text-xl" : "text-base"}`}
          style={{ minHeight: "60vh" }}
          placeholder="Empieza a escribir…"
        />
      </div>

      {/* Footer normal */}
      {!focusMode && (
        <div className="shrink-0 px-8 py-3 border-t border-primary/5 flex items-center justify-between">
          <EstadisticasEscritura texto={contenido}/>
          <span className="text-[9px] font-black uppercase text-primary/20 tracking-widest">Ctrl+S para guardar</span>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MODAL: editar metadatos de capítulo (título + fecha)
// ─────────────────────────────────────────────────────────────────────────────

const ModalEditarCapitulo = ({
  cap, onSaved, onClose,
}: {
  cap: Capitulo;
  onSaved: (c: Capitulo) => void;
  onClose: () => void;
}) => {
  const [titulo, setTitulo] = useState(cap.titulo_capitulo);
  const [fecha,  setFecha]  = useState(toDateInput(cap.fecha_publicacion));
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    setSaving(true);
    try {
      const fields = { titulo_capitulo: titulo.trim().toUpperCase(), fecha_publicacion: fecha };
      await capUpdateMeta(cap.id, fields);
      onSaved({ ...cap, ...fields });
      onClose();
    } catch {}
    setSaving(false);
  };

  return (
    <ModalBase onClose={onClose}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 italic flex items-center gap-2">
          <Pencil size={12}/> Editar Capítulo
        </h3>
        <button onClick={onClose} className="text-primary/30 hover:text-primary transition-colors"><X size={16}/></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <CampoInput label="Título" value={titulo} onChange={setTitulo} placeholder="NOMBRE DEL CAPÍTULO…" autoFocus />
        <CampoInput label="Fecha de publicación" value={fecha} onChange={setFecha} type="date" />
        <BotonSubmit
          loading={saving}
          disabled={!titulo.trim()}
          labelLoading={<><Loader2 size={13} className="animate-spin"/>Guardando…</>}
          labelNormal={<><Check size={13}/>Guardar Cambios</>}
        />
      </form>
    </ModalBase>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MODAL: nuevo capítulo
// ─────────────────────────────────────────────────────────────────────────────

const ModalNuevoCapitulo = ({
  libroId, ordenSiguiente, onCreated, onClose,
}: {
  libroId: string;
  ordenSiguiente: number;
  onCreated: (cap: Capitulo) => void;
  onClose: () => void;
}) => {
  const [titulo, setTitulo] = useState("");
  const [fecha,  setFecha]  = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

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
    <ModalBase onClose={onClose}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 italic">Nuevo Capítulo</h3>
        <button onClick={onClose} className="text-primary/30 hover:text-primary"><X size={16}/></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <CampoInput label="Título" value={titulo} onChange={setTitulo} placeholder="NOMBRE DEL CAPÍTULO…" autoFocus />
        <CampoInput label="Fecha de publicación" value={fecha} onChange={setFecha} type="date" />
        <BotonSubmit
          loading={saving}
          disabled={!titulo.trim()}
          labelLoading={<><Loader2 size={13} className="animate-spin"/>Creando…</>}
          labelNormal={<><Plus size={13}/>Crear Capítulo</>}
        />
      </form>
    </ModalBase>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL — Estudio de Capítulos
// ─────────────────────────────────────────────────────────────────────────────

export default function EstudioCapitulos() {
  const { libros, loading: loadingLibros, isOffline: listaOffline, refetch } = useLibros();

  const [expandedLibros, setExpandedLibros]     = useState<Set<string>>(new Set());
  const [selectedLibroId, setSelectedLibroId]   = useState<string | null>(null);
  const [selectedCapId,   setSelectedCapId]     = useState<string | null>(null);
  const [sidebarOpen,     setSidebarOpen]       = useState(true);
  const [focusMode,       setFocusMode]         = useState(false);
  const [busqueda,        setBusqueda]          = useState("");
  const [showNuevoCap,    setShowNuevoCap]      = useState(false);
  const [editandoCap,     setEditandoCap]       = useState<Capitulo | null>(null);
  const [capRefreshKey,   setCapRefreshKey]     = useState(0);

  const { capitulos, setCapitulos, reload: reloadCaps } = useCapitulos(selectedLibroId);

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

  const handleCapCreada = (cap: Capitulo) => {
    setCapitulos(prev => [...prev, cap]);
    setSelectedCapId(cap.id);
    setCapRefreshKey(k => k + 1);
  };

  const handleCapEditada = (cap: Capitulo) => {
    setCapitulos(prev => prev.map(c => c.id === cap.id ? cap : c));
    setCapRefreshKey(k => k + 1);
    setEditandoCap(null);
  };

  const handleCapEliminada = async (id: string, libroId: string) => {
    try {
      await capDelete(id);
      if (selectedCapId === id) setSelectedCapId(null);
      setCapRefreshKey(k => k + 1);
    } catch {}
  };

  return (
    <div className="flex h-screen bg-bg-main overflow-hidden">

      {/* ════ SIDEBAR COLAPSADA ════ */}
      {!sidebarOpen && (
        <div className="shrink-0 w-10 flex flex-col items-center pt-6 gap-4 border-r border-primary/10 bg-bg-main">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-primary/10 text-primary/30 hover:text-primary transition-all"
            title="Abrir panel"
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
                <BookOpen size={12}/> Estudio de Capítulos
              </h2>
              <div className="flex items-center gap-1">
                <button onClick={refetch} title="Recargar" className="p-1.5 rounded-lg hover:bg-primary/10 text-primary/30 hover:text-primary transition-all">
                  <RefreshCw size={12}/>
                </button>
                <button onClick={() => setSidebarOpen(false)} title="Cerrar panel" className="p-1.5 rounded-lg hover:bg-primary/10 text-primary/30 hover:text-primary transition-all">
                  <PanelLeftClose size={14}/>
                </button>
              </div>
            </div>

            {/* Buscador */}
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

            {/* Botón nuevo capítulo */}
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
                  onEditCap={setEditandoCap}
                  onDeleteCap={handleCapEliminada}
                />
              ))
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 px-5 py-3 border-t border-primary/10 text-[9px] font-black uppercase tracking-widest flex justify-between items-center">
            {listaOffline
              ? <span className="flex items-center gap-1 text-blue-400"><WifiOff size={10}/> Sin conexión</span>
              : <span className="text-primary/20">{libros.length} libros</span>
            }
            {selectedCapId && (
              <button
                onClick={() => setFocusMode(m => !m)}
                className="text-primary/25 hover:text-primary transition-colors"
                title="Modo foco"
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
          <EmptyEstudio icono={<BookOpen size={52} strokeWidth={1}/>} titulo="Estudio de Capítulos" subtitulo="Expande un libro y selecciona un capítulo" />
        )}
      </main>

      {/* Modales */}
      {showNuevoCap && selectedLibroId && (
        <ModalNuevoCapitulo
          libroId={selectedLibroId}
          ordenSiguiente={capitulos.length + 1}
          onCreated={handleCapCreada}
          onClose={() => setShowNuevoCap(false)}
        />
      )}

      {editandoCap && (
        <ModalEditarCapitulo
          cap={editandoCap}
          onSaved={handleCapEditada}
          onClose={() => setEditandoCap(null)}
        />
      )}
    </div>
  );
}