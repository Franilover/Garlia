"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Search, X, ChevronDown, Plus, Trash2, Save, GripVertical,
  Check, Loader2, Eye, EyeOff, Music, RefreshCw,
  ChevronUp, BookOpen, Layers, SlidersHorizontal,
  CheckCircle2, AlertCircle, PanelLeftClose, PanelLeftOpen,
  Columns2, WifiOff, MoreHorizontal, Pencil,
  Link2, FileText, ExternalLink, Copy, ZoomIn, ZoomOut,
  Play, Pause, Clock, SkipBack, Timer, Dot, Upload,
  Film, Info,
} from "lucide-react";
import { User, Mic2, PenLine, Globe } from 'lucide-react';
import { cancionesQueries } from "@/lib/api/queries/wiki/canciones";
import EstudioLayout from "@/components/layout/EstudioLayout";
import { BannerOffline, EmptyEstudio, ModalBase, CampoInput, BotonSubmit, normalize, unique } from "@/components/templates/EstudioTemplates";
import { db } from "@/lib/api/client/db";
import { enqueueOperation } from "@/hooks/data/useOfflineSync";
import { supabase } from "@/lib/api/client/supabase";
import {
  useLastOpenedId, useDraftRestore, DraftRestoreBanner,
  SelectPersonaje, SelectIdioma,
} from "@/hooks/useEditorShared";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { Chip } from "@/components/ui/Chip";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type EscenaMV = {
  id: string;
  timestamp_seg: number;
  descripcion: string;
  tipo: "escena" | "camara" | "efecto" | "transicion" | "personaje";
};

type Seccion = {
  id: string;
  cancion_id: string;
  nombre_seccion: string;
  letra_es: string;
  letra_en?: string;
  letra_jp?: string;
  letra_romaji?: string;
  orden: number;
  // Timings guardados en Supabase por idioma
  timings_es?:     Record<string, number> | null;
  timings_en?:     Record<string, number> | null;
  timings_jp?:     Record<string, number> | null;
  timings_romaji?: Record<string, number> | null;
};

type CancionLink = { titulo: string; url: string };

type Cancion = {
  id: string;
  titulo: string;
  personaje?: string;
  cantante?: string;
  compositor?: string;
  idioma?: string;
  estado: "BORRADOR" | "EN PROCESO" | "TERMINADA";
  visible: boolean;
  portada_url?: string;
  links?: CancionLink[];
  secciones?: Seccion[];
  duracion_segundos?: number | null;
  // Nuevos campos
  info_cancion?: string | null;
  guion_mv?: EscenaMV[] | null;
};

type IdiomaKey = "es" | "en" | "jp" | "romaji";

type Filtros = {
  estado: string;
  visible: "" | "true" | "false";
  idioma: string;
  cantante: string;
  compositor: string;
  personaje: string;
};

// ── Constantes ────────────────────────────────────────────────────────────────

const IDIOMAS: { id: IdiomaKey; label: string; nombre: string; campo: keyof Seccion }[] = [
  { id: "es",     label: "ES", nombre: "Español",  campo: "letra_es" },
  { id: "en",     label: "EN", nombre: "Inglés",   campo: "letra_en" },
  { id: "jp",     label: "JP", nombre: "Japonés",  campo: "letra_jp" },
  { id: "romaji", label: "RO", nombre: "Romaji",   campo: "letra_romaji" },
];

const ESTADOS = ["EN PROCESO", "BORRADOR", "TERMINADA"] as const;

const ESTADO_COLOR: Record<string, string> = {
  TERMINADA:    "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "EN PROCESO": "bg-amber-500/20  text-amber-400  border-amber-500/30",
  BORRADOR:     "bg-primary/10    text-primary/50  border-primary/20",
};

const FILTROS_VACIOS: Filtros = {
  estado: "", visible: "", idioma: "", cantante: "", compositor: "", personaje: "",
};

const TABLA_SEC = "secciones_cancion";

const TIPO_ESCENA_LABEL: Record<EscenaMV["tipo"], string> = {
  escena:     "Escena",
  camara:     "Cámara",
  efecto:     "Efecto",
  transicion: "Transición",
  personaje:  "Personaje",
};

const TIPO_ESCENA_COLOR: Record<EscenaMV["tipo"], string> = {
  escena:     "bg-violet-500/15 text-violet-400 border-violet-500/30",
  camara:     "bg-sky-500/15    text-sky-400    border-sky-500/30",
  efecto:     "bg-pink-500/15   text-pink-400   border-pink-500/30",
  transicion: "bg-amber-500/15  text-amber-400  border-amber-500/30",
  personaje:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

// ── Dexie helpers ─────────────────────────────────────────────────────────────

async function dexieSecRead(cancionId: string): Promise<Seccion[]> {
  try {
    const table = (db as any)[TABLA_SEC];
    if (!table) return [];
    const rows = (await table.toArray()) as Seccion[];
    return rows
      .filter((r: any) => r.cancion_id === cancionId && !r.deleted)
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  } catch { return []; }
}

async function dexieSecWrite(rows: any[]): Promise<void> {
  try {
    const table = (db as any)[TABLA_SEC];
    if (!table || rows.length === 0) return;
    await table.bulkPut(rows);
  } catch (e) { console.warn("[Dexie] secciones_cancion:", e); }
}

async function dexieSecDelete(id: string): Promise<void> {
  try {
    const table = (db as any)[TABLA_SEC];
    if (!table) return;
    await table.delete(id);
  } catch {}
}

async function dexieSecGet(id: string): Promise<any> {
  try { return await (db as any)[TABLA_SEC]?.get(id); } catch { return null; }
}

// ── useCanciones ──────────────────────────────────────────────────────────────

function useCanciones() {
  const [canciones,  setCanciones] = useState<Cancion[]>([]);
  const [loading,    setLoading]   = useState(true);
  const [isOffline,  setIsOffline] = useState(false);

  const readLocal = async (): Promise<Cancion[]> => {
    try {
      const table = (db as any)["canciones"];
      if (!table) return [];
      return (await table.toArray()).filter((r: any) => !r.deleted) as Cancion[];
    } catch { return []; }
  };

  const load = useCallback(async () => {
    const local = await readLocal();
    if (local.length > 0) {
      setCanciones(local);
      setLoading(false);
    }

    if (!navigator.onLine) {
      setIsOffline(true);
      setLoading(false);
      return;
    }
    setIsOffline(false);

    try {
      const fetchPromise = cancionesQueries.getAll({ isAdmin: true });
      const timeout = new Promise<"timeout">(r => setTimeout(() => r("timeout"), 5000));
      const result = await Promise.race([fetchPromise, timeout]);

      if (result === "timeout") {
        setIsOffline(local.length === 0);
        setLoading(false);
        return;
      }

      const data = result as Cancion[];
      setCanciones(data);
      try {
        const table = (db as any)["canciones"];
        if (table) await table.bulkPut(data.map(r => ({ ...r, status: "synced" })));
      } catch {}
    } catch {
      if (local.length === 0) setCanciones(await readLocal());
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

  return { canciones, setCanciones, loading, isOffline, refetch: load };
}

// ── useCancionEditor ──────────────────────────────────────────────────────────

function useCancionEditor(id: string | null) {
  const [cancion,   setCancion]  = useState<Cancion | null>(null);
  const [loading,   setLoading]  = useState(false);
  const [isOffline, setIsOffline]= useState(false);

  const load = useCallback(async (cancionId: string) => {
    try {
      const cTable = (db as any)["canciones"];
      const base   = cTable ? await cTable.get(cancionId) : null;
      const secs   = await dexieSecRead(cancionId);
      if (base) {
        setCancion({ ...base, secciones: secs });
        setLoading(false);
      } else {
        setLoading(true);
      }
    } catch {}

    if (!navigator.onLine) {
      setIsOffline(true);
      setLoading(false);
      return;
    }
    setIsOffline(false);

    try {
      const fetchPromise = cancionesQueries.getById(cancionId);
      const timeout = new Promise<"timeout">(r => setTimeout(() => r("timeout"), 5000));
      const result = await Promise.race([fetchPromise, timeout]);

      if (result === "timeout") {
        setIsOffline(true);
        setLoading(false);
        return;
      }

      const data = result as Cancion;
      setCancion(data);
      try {
        const cTable = (db as any)["canciones"];
        if (cTable) await cTable.put({ ...data, status: "synced" });
      } catch {}
      if (data?.secciones?.length) {
        await dexieSecWrite(data.secciones.map((s: Seccion) => ({ ...s, status: "synced" })));
      }
    } catch {
      try {
        const cTable = (db as any)["canciones"];
        const base   = cTable ? await cTable.get(cancionId) : null;
        const secs   = await dexieSecRead(cancionId);
        if (base) setCancion({ ...base, secciones: secs });
      } catch {}
      setIsOffline(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (id) load(id);
    else setCancion(null);
  }, [id, load]);

  useEffect(() => {
    const handleOnline = () => { if (id) { setIsOffline(false); load(id); } };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [id, load]);

  return { cancion, setCancion, loading, isOffline, reload: () => id && load(id) };
}

// ── CRUD de secciones ─────────────────────────────────────────────────────────

async function secUpdate(id: string, updates: Partial<Seccion>): Promise<void> {
  if (!navigator.onLine) {
    const existing = await dexieSecGet(id);
    const row = { ...existing, ...updates, id, status: "pending" };
    await dexieSecWrite([row]);
    await enqueueOperation(TABLA_SEC, "update", id, row);
    return;
  }
  try {
    const updated = await cancionesQueries.secciones.update(id, updates as any);
    await dexieSecWrite([{ ...updated, status: "synced" }]);
  } catch {
    const existing = await dexieSecGet(id);
    const row = { ...existing, ...updates, id, status: "pending" };
    await dexieSecWrite([row]);
    await enqueueOperation(TABLA_SEC, "update", id, row);
    throw new Error("Sin conexión — cambio guardado localmente");
  }
}

async function secCreate(datos: Omit<Seccion, "id">): Promise<Seccion> {
  if (!navigator.onLine) {
    const tmpId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const row = { ...datos, id: tmpId, status: "pending" };
    await dexieSecWrite([row]);
    await enqueueOperation(TABLA_SEC, "upsert", tmpId, row);
    return row as Seccion;
  }
  try {
    const nueva = await cancionesQueries.secciones.create(datos as any);
    await dexieSecWrite([{ ...nueva, status: "synced" }]);
    return nueva as Seccion;
  } catch {
    const tmpId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const row = { ...datos, id: tmpId, status: "pending" };
    await dexieSecWrite([row]);
    await enqueueOperation(TABLA_SEC, "upsert", tmpId, row);
    return row as Seccion;
  }
}

async function secDelete(id: string): Promise<void> {
  if (!navigator.onLine) {
    const existing = await dexieSecGet(id);
    if (existing) await dexieSecWrite([{ ...existing, deleted: true, status: "pending" }]);
    await enqueueOperation(TABLA_SEC, "delete", id);
    return;
  }
  try {
    await cancionesQueries.secciones.delete(id);
    await dexieSecDelete(id);
  } catch {
    const existing = await dexieSecGet(id);
    if (existing) await dexieSecWrite([{ ...existing, deleted: true, status: "pending" }]);
    await enqueueOperation(TABLA_SEC, "delete", id);
    throw new Error("Sin conexión — eliminación en cola");
  }
}

async function secReorder(secciones: { id: string; orden: number }[]): Promise<void> {
  if (!navigator.onLine) {
    for (const { id, orden } of secciones) {
      const existing = await dexieSecGet(id);
      if (existing) {
        await dexieSecWrite([{ ...existing, orden, status: "pending" }]);
        await enqueueOperation(TABLA_SEC, "update", id, { orden });
      }
    }
    return;
  }
  try {
    await cancionesQueries.secciones.reorder(secciones);
    for (const { id, orden } of secciones) {
      const existing = await dexieSecGet(id);
      if (existing) await dexieSecWrite([{ ...existing, orden, status: "synced" }]);
    }
  } catch {
    for (const { id, orden } of secciones) {
      const existing = await dexieSecGet(id);
      if (existing) {
        await dexieSecWrite([{ ...existing, orden, status: "pending" }]);
        await enqueueOperation(TABLA_SEC, "update", id, { orden });
      }
    }
  }
}

// ── Componentes pequeños ──────────────────────────────────────────────────────

const IdiomaTab = ({
  value, onChange, exclude,
}: { value: IdiomaKey; onChange: (v: IdiomaKey) => void; exclude?: IdiomaKey }) => (
  <div className="flex gap-1 p-1 bg-primary/5 rounded-xl border border-primary/10">
    {IDIOMAS.filter(i => i.id !== exclude).map(({ id, label }) => (
      <button
        key={id}
        onClick={() => onChange(id)}
        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
          value === id
            ? "bg-primary text-bg-main shadow-md shadow-primary/20"
            : "text-primary/40 hover:text-primary"
        }`}
      >
        {label}
      </button>
    ))}
  </div>
);

// ── SidebarItem ───────────────────────────────────────────────────────────────

const SidebarItem = ({
  cancion, selected, onClick, onEdit, onDelete,
}: {
  cancion: Cancion;
  selected: boolean;
  onClick: () => void;
  onEdit: (c: Cancion) => void;
  onDelete: (id: string) => void;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { confirm, ConfirmModal } = useConfirm();

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
    <div className="relative group/item">
      <button
        onClick={onClick}
        className={`w-full text-left px-4 py-3 rounded-xl transition-all border ${
          selected
            ? "bg-primary text-bg-main border-primary shadow-lg shadow-primary/20"
            : "border-transparent hover:bg-primary/5 hover:border-primary/10 text-primary"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <span className={`font-black text-sm uppercase italic tracking-tight leading-tight truncate flex-1 ${selected ? "text-bg-main" : ""}`}>
            {cancion.titulo}
          </span>
          <span className={`shrink-0 text-[9px] font-black uppercase px-2 py-1 rounded-full border ${
            selected ? "bg-bg-main/20 text-bg-main border-bg-main/30" : ESTADO_COLOR[cancion.estado]
          }`}>
            {cancion.estado === "EN PROCESO" ? "WIP" : cancion.estado === "TERMINADA" ? "✓" : "…"}
          </span>
        </div>
        {(cancion.personaje || cancion.cantante) && (
          <p className={`text-[10px] mt-1 truncate ${selected ? "text-bg-main/70" : "text-primary/40"}`}>
            {cancion.personaje || cancion.cantante}
          </p>
        )}
      </button>

      <div ref={menuRef} className="absolute top-2 right-2">
        <button
          onClick={e => { e.stopPropagation(); setMenuOpen(m => !m); }}
          className={`p-1 rounded-lg transition-all z-10 ${
            menuOpen
              ? "bg-primary/20 text-primary opacity-100"
              : selected
                ? "opacity-60 hover:opacity-100 text-bg-main hover:bg-bg-main/20"
                : "opacity-0 group-hover/item:opacity-100 text-primary/50 hover:bg-primary/10 hover:text-primary"
          }`}
        >
          <MoreHorizontal size={13} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-7 z-50 min-w-[160px] bg-bg-main border border-primary/15 rounded-xl shadow-xl shadow-primary/10 py-1 overflow-hidden">
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(false); onEdit(cancion); }}
              className="w-full text-left px-3 py-2 text-[10px] font-black uppercase tracking-widest text-primary/60 hover:bg-primary/8 hover:text-primary transition-all flex items-center gap-2"
            >
              <Pencil size={11} /> Editar canción
            </button>
            <div className="h-px bg-primary/8 mx-2 my-1" />
            <button
              onClick={async e => {
                e.stopPropagation();
                setMenuOpen(false);
                const ok = await confirm({ message: `¿Eliminar "${cancion.titulo}"?`, danger: true });
                if (ok) onDelete(cancion.id);
              }}
              className="w-full text-left px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-400/70 hover:bg-red-500/8 hover:text-red-400 transition-all flex items-center gap-2"
            >
              <Trash2 size={11} /> Eliminar
            </button>
          </div>
        )}
      </div>
      <ConfirmModal />
    </div>
  );
};

// ── SeccionTextarea ───────────────────────────────────────────────────────────

type ColState = {
  dirty:  boolean;
  saving: boolean;
  saved:  boolean;
  mode:   "idle" | "pending" | "error";
  msg:    string | null;
};

const IDLE_STATE: ColState = { dirty: false, saving: false, saved: false, mode: "idle", msg: null };

const SeccionTextarea = ({
  sec, idioma, onSave,
}: {
  sec: Seccion;
  idioma: IdiomaKey;
  onSave: (id: string, updates: Partial<Seccion>) => Promise<void>;
}) => {
  const campo = IDIOMAS.find(i => i.id === idioma)!.campo;
  const serverVal = (sec[campo] as string) || "";
  const [texto, setTexto] = useState(serverVal);
  const [st, setSt]       = useState<ColState>(IDLE_STATE);
  const timer             = useRef<any>(null);
  const draftKey          = `sec-draft-${sec.id}-${idioma}`;
  const draft             = useDraftRestore({ key: draftKey, serverValue: serverVal, enabled: !!sec.id });

  useEffect(() => {
    clearTimeout(timer.current);
    const loadLocal = async () => {
      try {
        const local = await dexieSecGet(sec.id);
        const localVal = local?.[campo] as string | undefined;
        const remoteVal = serverVal;
        if (local?.status === "pending" && localVal !== undefined && localVal !== remoteVal) {
          setTexto(localVal);
          setSt({ ...IDLE_STATE, dirty: true, mode: "pending", msg: "Pendiente de sincronizar" });
        } else {
          setTexto(remoteVal);
          setSt(IDLE_STATE);
        }
      } catch {
        setTexto(serverVal);
        setSt(IDLE_STATE);
      }
    };
    loadLocal();
  }, [idioma, sec.id]);

  const doSave = useCallback(async (val: string) => {
    clearTimeout(timer.current);
    setSt(s => ({ ...s, saving: true, msg: null }));
    draft.save(val);
    try {
      await onSave(sec.id, { [campo]: val });
      draft.clear();
      if (navigator.onLine) {
        setSt({ dirty: false, saving: false, saved: true, mode: "idle", msg: null });
        setTimeout(() => setSt(s => ({ ...s, saved: false })), 2000);
      } else {
        setSt({ dirty: false, saving: false, saved: false, mode: "pending", msg: "Guardado sin conexión" });
      }
    } catch (e: any) {
      setSt(s => ({ ...s, saving: false, mode: "pending", msg: "Sin conexión — guardado localmente" }));
    }
  }, [sec.id, campo, onSave, draft]);

  const onChange = (val: string) => {
    setTexto(val);
    draft.save(val);
    setSt(s => ({ ...s, dirty: true, saved: false, mode: s.mode === "error" ? "idle" : s.mode, msg: null }));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => doSave(val), 1500);
  };

  const rows = Math.max(3, texto.split("\n").length + 1);
  const borderClass =
    st.mode === "pending" ? "border-blue-500/40  focus:border-blue-500/60"  :
    st.mode === "error"   ? "border-red-500/40   focus:border-red-500/60"   :
    st.dirty              ? "border-amber-500/30 focus:border-amber-500/50" :
                            "border-primary/10   focus:border-primary/30";

  return (
    <div className="flex-1 min-w-0 space-y-1.5">
      <DraftRestoreBanner
        draft={draft}
        onRestore={(v) => { setTexto(v); draft.dismiss(); }}
        label="Borrador local disponible"
      />
      {st.mode === "pending" && !st.saving && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest text-blue-400">
          <WifiOff size={10} />
          Guardado sin conexión — se sincronizará al reconectar
        </div>
      )}
      <div className="relative">
        <textarea
          value={texto}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); doSave(texto); } }}
          rows={rows}
          spellCheck={false}
          className={`w-full bg-bg-main/60 border rounded-xl px-4 py-3 text-sm text-primary font-mono resize-none outline-none transition-colors placeholder:text-primary/20 leading-relaxed ${borderClass}`}
          placeholder={`Letra en ${IDIOMAS.find(i => i.id === idioma)?.nombre}…`}
        />
        <span className="absolute top-2 right-2 pointer-events-none flex flex-col items-end gap-1">
          {st.saving                          && <Loader2     size={11} className="animate-spin text-primary/30" />}
          {st.saved                           && <CheckCircle2 size={11} className="text-emerald-400" />}
          {st.mode === "pending" && !st.saving && <span className="w-2 h-2 rounded-full bg-blue-400" />}
          {st.mode === "error"                && <AlertCircle  size={11} className="text-red-400" />}
        </span>
      </div>
      {st.mode === "error" && st.msg && (
        <p className="text-[9px] font-black uppercase text-red-400/80 tracking-widest px-1">⚠ {st.msg}</p>
      )}
    </div>
  );
};

// ── SeccionEditor ─────────────────────────────────────────────────────────────

const SeccionEditor = ({
  sec, idiomaA, idiomaB, splitMode,
  onSaveField, onSaveNombre, onDelete, onDuplicate, onMoveUp, onMoveDown,
  isFirst, isLast,
}: {
  sec: Seccion;
  idiomaA: IdiomaKey;
  idiomaB: IdiomaKey;
  splitMode: boolean;
  onSaveField: (id: string, updates: Partial<Seccion>) => Promise<void>;
  onSaveNombre: (id: string, nombre: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onDuplicate: (sec: Seccion) => Promise<void>;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) => {
  const [nombre, setNombre] = useState(sec.nombre_seccion);
  const { confirm, ConfirmModal } = useConfirm();

  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-2">
        <GripVertical size={13} className="text-primary/15 shrink-0" />
        <input
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          onBlur={() => nombre !== sec.nombre_seccion && onSaveNombre(sec.id, nombre)}
          onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          className="flex-1 bg-transparent text-[11px] font-black uppercase text-primary outline-none tracking-widest placeholder:text-primary/20 min-w-0 hover:bg-primary/5 focus:bg-primary/8 rounded-lg px-2 py-0.5 -mx-2 transition-colors"
          placeholder="NOMBRE DE SECCIÓN…"
        />
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={onMoveUp}   disabled={isFirst} className="p-1 rounded-lg hover:bg-primary/10 text-primary/20 hover:text-primary disabled:opacity-20 transition-all"><ChevronUp   size={12} /></button>
          <button onClick={onMoveDown} disabled={isLast}  className="p-1 rounded-lg hover:bg-primary/10 text-primary/20 hover:text-primary disabled:opacity-20 transition-all"><ChevronDown size={12} /></button>
          <button
            onClick={() => onDuplicate(sec)}
            title="Duplicar sección"
            className="p-1 rounded-lg hover:bg-primary/10 text-primary/20 hover:text-primary transition-all"
          ><Copy size={12} /></button>
          <button onClick={async () => {
            const ok = await confirm({ message: `¿Eliminar sección "${nombre}"?`, danger: true });
            if (ok) onDelete(sec.id);
          }} className="p-1 rounded-lg hover:bg-red-500/10 text-primary/20 hover:text-red-400 transition-all"><Trash2 size={12} /></button>
        </div>
      </div>
      <div className={`px-4 pb-4 ${splitMode ? "flex gap-3" : ""}`}>
        <SeccionTextarea sec={sec} idioma={idiomaA} onSave={onSaveField} />
        {splitMode && (
          <>
            <div className="w-px bg-primary/10 shrink-0 self-stretch" />
            <SeccionTextarea sec={sec} idioma={idiomaB} onSave={onSaveField} />
          </>
        )}
      </div>
      <ConfirmModal />
    </div>
  );
};

// ── PanelFiltros ──────────────────────────────────────────────────────────────

const PanelFiltros = ({
  filtros, onChange, opciones,
}: {
  filtros: Filtros;
  onChange: (f: Filtros) => void;
  opciones: { idiomas: string[]; cantantes: string[]; compositores: string[]; personajes: string[] };
}) => {
  const toggle = (k: keyof Filtros, v: string) =>
    onChange({ ...filtros, [k]: (filtros[k] === v ? "" : v) as any });

  return (
    <div className="space-y-4 p-3 bg-primary/5 rounded-xl border border-primary/10">
      <div>
        <p className="text-[9px] font-black uppercase text-primary/30 tracking-widest mb-2">Estado</p>
        <div className="flex gap-1 flex-wrap">
          {ESTADOS.map(e => (
            <Chip key={e} active={filtros.estado === e} onClick={() => toggle("estado", e)}>
              {e === "EN PROCESO" ? "WIP" : e}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[9px] font-black uppercase text-primary/30 tracking-widest mb-2">Visibilidad</p>
        <div className="flex gap-1">
          <Chip active={filtros.visible === "true"}  onClick={() => toggle("visible", "true")}>Visible</Chip>
          <Chip active={filtros.visible === "false"} onClick={() => toggle("visible", "false")}>Oculta</Chip>
        </div>
      </div>
      {opciones.personajes.length > 0 && (
        <div>
          <p className="text-[9px] font-black uppercase text-primary/30 tracking-widest mb-2">Personaje</p>
          <div className="relative">
            <select
              value={filtros.personaje}
              onChange={e => onChange({ ...filtros, personaje: e.target.value })}
              className="w-full appearance-none bg-bg-main border border-primary/15 rounded-xl px-3 py-2 text-[10px] font-black uppercase text-primary outline-none focus:border-primary/40 transition-colors cursor-pointer pr-7"
            >
              <option value="">Todos</option>
              {opciones.personajes.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary/30 pointer-events-none" />
          </div>
        </div>
      )}
      {opciones.idiomas.length > 0 && (
        <div>
          <p className="text-[9px] font-black uppercase text-primary/30 tracking-widest mb-2">Idioma</p>
          <div className="flex gap-1 flex-wrap">
            {opciones.idiomas.map(id => (
              <Chip key={id} active={filtros.idioma === id} onClick={() => toggle("idioma", id)}>{id}</Chip>
            ))}
          </div>
        </div>
      )}
      {opciones.cantantes.length > 0 && (
        <div>
          <p className="text-[9px] font-black uppercase text-primary/30 tracking-widest mb-2">Cantante</p>
          <div className="relative">
            <select
              value={filtros.cantante}
              onChange={e => onChange({ ...filtros, cantante: e.target.value })}
              className="w-full appearance-none bg-bg-main border border-primary/15 rounded-xl px-3 py-2 text-[10px] font-black uppercase text-primary outline-none focus:border-primary/40 transition-colors cursor-pointer pr-7"
            >
              <option value="">Todos</option>
              {opciones.cantantes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary/30 pointer-events-none" />
          </div>
        </div>
      )}
      {opciones.compositores.length > 0 && (
        <div>
          <p className="text-[9px] font-black uppercase text-primary/30 tracking-widest mb-2">Compositor</p>
          <div className="relative">
            <select
              value={filtros.compositor}
              onChange={e => onChange({ ...filtros, compositor: e.target.value })}
              className="w-full appearance-none bg-bg-main border border-primary/15 rounded-xl px-3 py-2 text-[10px] font-black uppercase text-primary outline-none focus:border-primary/40 transition-colors cursor-pointer pr-7"
            >
              <option value="">Todos</option>
              {opciones.compositores.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary/30 pointer-events-none" />
          </div>
        </div>
      )}
      {Object.values(filtros).some(Boolean) && (
        <button
          onClick={() => onChange(FILTROS_VACIOS)}
          className="text-[9px] font-black uppercase text-red-400 hover:text-red-300 tracking-widest"
        >
          ✕ Limpiar filtros
        </button>
      )}
    </div>
  );
};

// ── InputConSugerencias ───────────────────────────────────────────────────────

function useValoresUnicos(tabla: string, columna: string) {
  const [valores, setValores] = useState<string[]>([]);
  useEffect(() => {
    supabase.from(tabla).select(columna).not(columna, "is", null)
      .then(({ data }) => {
        if (!data) return;
        const uniq = [...new Set(
          data.map((r: any) => r[columna]).filter(Boolean).map((v: string) => v.trim())
        )].sort() as string[];
        setValores(uniq);
      });
  }, [tabla, columna]);
  return valores;
}

const InputConSugerencias = ({
  label, value, onChange, placeholder, tabla, columna,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; tabla: string; columna: string;
}) => {
  const sugerencias = useValoresUnicos(tabla, columna);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtradas = useMemo(
    () => sugerencias.filter(s => s.toLowerCase().includes(value.toLowerCase().trim())),
    [sugerencias, value]
  );

  const esNuevo = value.trim() && !sugerencias.includes(value.trim());

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div className="space-y-1.5" ref={ref}>
      <label className="text-[9px] font-black uppercase text-primary/30 tracking-widest">{label}</label>
      <div className="relative">
        <input
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full bg-primary/5 border border-primary/15 rounded-xl px-4 py-2.5 text-sm font-medium text-primary outline-none focus:border-primary/40 transition-colors placeholder:text-primary/20"
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/20 hover:text-primary/60 transition-colors"
          >
            <X size={13} />
          </button>
        )}

        {open && (filtradas.length > 0 || esNuevo) && (
          <div
            className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-primary/15 shadow-xl overflow-hidden max-h-48 overflow-y-auto"
            style={{ background: "var(--white-custom)" }}
          >
            {filtradas.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => { onChange(s); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-xs font-medium hover:bg-primary/8 transition-colors flex items-center justify-between ${
                  value === s ? "text-primary" : "text-primary/70"
                }`}
              >
                <span>{s}</span>
                {value === s && <Check size={11} className="text-primary shrink-0" />}
              </button>
            ))}
            {esNuevo && (
              <>
                {filtradas.length > 0 && <div className="h-px bg-primary/8 mx-3" />}
                <button
                  type="button"
                  onClick={() => { onChange(value.trim()); setOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-xs font-medium hover:bg-primary/8 transition-colors flex items-center gap-2 text-primary/50"
                >
                  <Plus size={11} /> Usar «{value.trim()}»
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── ModalNuevaCancion ─────────────────────────────────────────────────────────

const ModalNuevaCancion = ({
  onCreated,
  onClose,
}: {
  onCreated: (c: Cancion) => void;
  onClose: () => void;
}) => {
  const [titulo,      setTitulo]      = useState("");
  const [personaje,   setPersonaje]   = useState("");
  const [cantante,    setCantante]    = useState("");
  const [compositor,  setCompositor]  = useState("");
  const [idioma,      setIdioma]      = useState("");
  const [estado,      setEstado]      = useState<Cancion["estado"]>("BORRADOR");
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    setSaving(true);
    setError("");
    try {
      const { data, error: err } = await supabase
        .from("canciones")
        .insert([{
          titulo: titulo.trim().toUpperCase(),
          personaje: personaje.trim() || null,
          cantante:  cantante.trim()  || null,
          compositor: compositor.trim() || null,
          idioma:    idioma.trim()    || null,
          estado,
          visible: false,
        }])
        .select()
        .single();
      if (err) throw err;
      onCreated(data as Cancion);
      onClose();
    } catch (e: any) {
      setError(e.message || "Error al crear la canción");
    }
    setSaving(false);
  };

  return (
    <ModalBase onClose={onClose}>
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 italic flex items-center gap-2">
            <Music size={12} /> Nueva Canción
          </h3>
          <button onClick={onClose} className="text-primary/30 hover:text-primary transition-colors"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <CampoInput label="Título *" value={titulo} onChange={setTitulo} placeholder="NOMBRE DE LA CANCIÓN…" autoFocus />
          <SelectPersonaje value={personaje} onChange={setPersonaje} />
          <div className="grid grid-cols-2 gap-3">
            <InputConSugerencias label="Cantante"   value={cantante}   onChange={setCantante}   placeholder="Cantante…"   tabla="canciones" columna="cantante" />
            <InputConSugerencias label="Compositor" value={compositor} onChange={setCompositor} placeholder="Compositor…" tabla="canciones" columna="compositor" />
          </div>
          <SelectIdioma value={idioma} onChange={setIdioma} />

          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase text-primary/30 tracking-widest">Estado</label>
            <div className="flex gap-2">
              {ESTADOS.map(e => (
                <button
                  key={e} type="button"
                  onClick={() => setEstado(e)}
                  className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                    estado === e ? "bg-primary text-bg-main border-primary" : "border-primary/15 text-primary/40 hover:border-primary/30"
                  }`}
                >
                  {e === "EN PROCESO" ? "WIP" : e}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-[9px] font-black uppercase text-red-400 tracking-widest">⚠ {error}</p>}

          <BotonSubmit loading={saving} disabled={!titulo.trim()} labelLoading={<><Loader2 size={13} className="animate-spin" />Creando…</>} labelNormal={<><Plus size={13} />Crear Canción</>} />
        </form>
    </ModalBase>
  );
};

const Campo = ({ label, value, onChange, placeholder, autoFocus }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean;
}) => (
  <div className="space-y-1.5">
    <label className="text-[9px] font-black uppercase text-primary/30 tracking-widest">{label}</label>
    <input
      autoFocus={autoFocus}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-primary/5 border border-primary/15 rounded-xl px-4 py-2.5 text-sm font-medium text-primary outline-none focus:border-primary/40 transition-colors placeholder:text-primary/20"
    />
  </div>
);

// ── ModalEditarCancion ────────────────────────────────────────────────────────

const ModalEditarCancion = ({
  cancion,
  onSaved,
  onClose,
}: {
  cancion: Cancion;
  onSaved: (c: Cancion) => void;
  onClose: () => void;
}) => {
  const [titulo,     setTitulo]     = useState(cancion.titulo);
  const [personaje,  setPersonaje]  = useState(cancion.personaje  || "");
  const [cantante,   setCantante]   = useState(cancion.cantante   || "");
  const [compositor, setCompositor] = useState(cancion.compositor || "");
  const [idioma,     setIdioma]     = useState(cancion.idioma     || "");
  const [estado,     setEstado]     = useState<Cancion["estado"]>(cancion.estado);
  const [visible,    setVisible]    = useState(cancion.visible);
  const [duracionStr, setDuracionStr] = useState(() => {
    const d = cancion.duracion_segundos;
    if (!d) return "";
    const m = Math.floor(d / 60);
    const s = d % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  });
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");

  const parseDuracion = (str: string): number | null => {
    if (!str.trim()) return null;
    const parts = str.split(":");
    if (parts.length === 2) {
      const m = parseInt(parts[0]);
      const s = parseInt(parts[1]);
      if (!isNaN(m) && !isNaN(s)) return m * 60 + s;
    }
    const plain = parseInt(str);
    return isNaN(plain) ? null : plain;
  };

  const handleSave = async () => {
    if (!titulo.trim()) return;
    setSaving(true);
    setError("");
    try {
      const updates: any = {
        titulo: titulo.trim().toUpperCase(),
        personaje:  personaje.trim()  || null,
        cantante:   cantante.trim()   || null,
        compositor: compositor.trim() || null,
        idioma:     idioma.trim()     || null,
        estado,
        visible,
        duracion_segundos: parseDuracion(duracionStr),
      };
      const { data, error: err } = await supabase
        .from("canciones")
        .update(updates)
        .eq("id", cancion.id)
        .select()
        .single();
      if (err) throw err;
      onSaved(data as Cancion);
      onClose();
    } catch (e: any) {
      setError(e.message || "Error al guardar");
    }
    setSaving(false);
  };

  return (
    <ModalBase onClose={onClose}>
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 italic flex items-center gap-2">
          <Pencil size={12} /> Editar Canción
        </h3>
        <button type="button" onClick={onClose} className="text-primary/30 hover:text-primary transition-colors"><X size={16} /></button>
      </div>

      <div className="space-y-4 mt-4">
        <CampoInput label="Título *" value={titulo} onChange={setTitulo} placeholder="NOMBRE DE LA CANCIÓN…" autoFocus />
        <SelectPersonaje value={personaje} onChange={setPersonaje} />
        <div className="grid grid-cols-2 gap-3">
          <InputConSugerencias label="Cantante"   value={cantante}   onChange={setCantante}   placeholder="Cantante…"   tabla="canciones" columna="cantante" />
          <InputConSugerencias label="Compositor" value={compositor} onChange={setCompositor} placeholder="Compositor…" tabla="canciones" columna="compositor" />
        </div>
        <SelectIdioma value={idioma} onChange={setIdioma} />

        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase text-primary/30 tracking-widest">Duración (mm:ss)</label>
          <input
            type="text"
            value={duracionStr}
            onChange={e => setDuracionStr(e.target.value)}
            placeholder="3:42"
            className="w-full bg-primary/5 border border-primary/15 rounded-xl px-3 py-2 text-[11px] font-bold text-primary outline-none focus:border-primary/30 transition-colors placeholder:text-primary/20"
          />
          <p className="text-[8px] text-primary/25 font-bold uppercase tracking-widest">
            Usado para el slider del karaoke · formato min:seg
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase text-primary/30 tracking-widest">Estado</label>
          <div className="flex gap-2">
            {ESTADOS.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => setEstado(e)}
                className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                  estado === e ? "bg-primary text-bg-main border-primary" : "border-primary/15 text-primary/40 hover:border-primary/30 hover:text-primary"
                }`}
              >
                {e === "EN PROCESO" ? "WIP" : e}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase text-primary/30 tracking-widest">Visibilidad</label>
          <button
            type="button"
            onClick={() => setVisible(v => !v)}
            className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border flex items-center justify-center gap-2 transition-all ${
              visible
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "border-primary/15 text-primary/40 hover:border-primary/30 hover:text-primary"
            }`}
          >
            {visible ? <><Eye size={12} /> Visible para lectores</> : <><EyeOff size={12} /> Oculta</>}
          </button>
        </div>

        {error && <p className="text-[9px] font-black uppercase text-red-400 tracking-widest">⚠ {error}</p>}

        <button
          type="button"
          disabled={saving || !titulo.trim()}
          onClick={handleSave}
          className="w-full bg-primary text-bg-main py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {saving
            ? <><Loader2 size={13} className="animate-spin" />Guardando…</>
            : <><Check size={13} />Guardar Cambios</>
          }
        </button>
      </div>
    </ModalBase>
  );
};

// ── Karaoke ───────────────────────────────────────────────────────────────────

type LineaConTiempo = {
  seccionId: string;
  lineaIdx:  number;
  texto:     string;
  tiempo:    number | null;
};

type KaraokeTimings = Record<string, Record<number, number>>;

function buildLineas(secciones: Seccion[], idioma: IdiomaKey): LineaConTiempo[] {
  const getLetra = (s: Seccion): string =>
    (idioma === "es" ? s.letra_es : idioma === "en" ? s.letra_en : idioma === "jp" ? s.letra_jp : s.letra_romaji) || "";

  const lineas: LineaConTiempo[] = [];
  for (const sec of secciones) {
    const texto = getLetra(sec);
    if (!texto.trim()) continue;
    texto.split("\n").forEach((linea, idx) => {
      lineas.push({ seccionId: sec.id, lineaIdx: idx, texto: linea, tiempo: null });
    });
  }
  return lineas;
}

function useKaraoke(
  cancionId: string,
  idioma: IdiomaKey,
  secciones: Seccion[],
  duracion?: number | null,
  onSeccionTimingsChange?: (seccionId: string, col: string, timings: Record<string, number>) => void,
) {
  const storageKey = `karaoke-${cancionId}-${idioma}`;

  const timingsFromSupabase = (): KaraokeTimings => {
    const col = `timings_${idioma}` as keyof Seccion;
    const result: KaraokeTimings = {};
    for (const sec of secciones) {
      const t = sec[col] as Record<string, number> | null | undefined;
      if (t && Object.keys(t).length > 0) {
        result[sec.id] = Object.fromEntries(
          Object.entries(t).map(([k, v]) => [Number(k), v])
        );
      }
    }
    return result;
  };

  const [timings, setTimings] = useState<KaraokeTimings>(() => {
    const fromSupa = timingsFromSupabase();
    if (Object.keys(fromSupa).length > 0) return fromSupa;
    try { return JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch { return {}; }
  });
  const [elapsed,  setElapsed]  = useState(0);
  const [playing,  setPlaying]  = useState(false);
  const [modoEdit, setModoEdit] = useState(false);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef     = useRef<number>(0);
  const baseRef      = useRef<number>(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fromSupa = timingsFromSupabase();
    if (Object.keys(fromSupa).length > 0) {
      setTimings(fromSupa);
    } else {
      try { setTimings(JSON.parse(localStorage.getItem(storageKey) || "{}")); } catch { setTimings({}); }
    }
    setElapsed(0); setPlaying(false);
  }, [storageKey]); // eslint-disable-line

  useEffect(() => {
    if (playing) {
      startRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        const next = baseRef.current + (Date.now() - startRef.current) / 1000;
        if (duracion && next >= duracion) {
          setElapsed(duracion);
          baseRef.current = duracion;
          setPlaying(false);
          return;
        }
        setElapsed(next);
      }, 50);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      baseRef.current = elapsed;
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, duracion]); // eslint-disable-line

  const saveSeccionTimings = (seccionId: string, secTimings: Record<number, number>) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const col = `timings_${idioma}`;
      const data = Object.fromEntries(
        Object.entries(secTimings).map(([k, v]) => [String(k), v])
      );
      await supabase.from("secciones_cancion").update({ [col]: data }).eq("id", seccionId);
      onSeccionTimingsChange?.(seccionId, col, data);
    }, 1000);
  };

  // Guardar inmediatamente sin debounce (usado al editar tiempo a mano)
  const saveSeccionTimingsNow = async (seccionId: string, secTimings: Record<number, number>) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const col = `timings_${idioma}`;
    const data = Object.fromEntries(
      Object.entries(secTimings).map(([k, v]) => [String(k), v])
    );
    await supabase.from("secciones_cancion").update({ [col]: data }).eq("id", seccionId);
    onSeccionTimingsChange?.(seccionId, col, data);
  };

  const toggle = () => setPlaying(p => !p);
  const reset  = () => { setPlaying(false); baseRef.current = 0; setElapsed(0); };
  const seekTo = (s: number) => {
    const clamped = duracion ? Math.min(s, duracion) : s;
    baseRef.current = clamped;
    startRef.current = Date.now();
    setElapsed(clamped);
  };

  const marcarLinea = (seccionId: string, lineaIdx: number) => {
    setTimings(prev => {
      const secTimings = { ...(prev[seccionId] || {}), [lineaIdx]: Math.round(elapsed * 10) / 10 };
      const next = { ...prev, [seccionId]: secTimings };
      localStorage.setItem(storageKey, JSON.stringify(next));
      saveSeccionTimings(seccionId, secTimings);
      return next;
    });
  };

  const borrarLinea = (seccionId: string, lineaIdx: number) => {
    setTimings(prev => {
      const next = { ...prev };
      if (next[seccionId]) {
        const sec = { ...next[seccionId] };
        delete sec[lineaIdx];
        next[seccionId] = sec;
        saveSeccionTimings(seccionId, sec);
      }
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  const borrarTodo = async () => {
    localStorage.removeItem(storageKey);
    setTimings({});
    const col = `timings_${idioma}`;
    for (const sec of secciones) {
      await supabase.from("secciones_cancion").update({ [col]: null }).eq("id", sec.id);
    }
  };

  const getTiempo = (seccionId: string, lineaIdx: number): number | null =>
    timings[seccionId]?.[lineaIdx] ?? null;

  // Establecer un tiempo concreto sin depender del elapsed actual
  const setTiempo = (seccionId: string, lineaIdx: number, seg: number) => {
    setTimings(prev => {
      const secTimings = { ...(prev[seccionId] || {}), [lineaIdx]: seg };
      const next = { ...prev, [seccionId]: secTimings };
      localStorage.setItem(storageKey, JSON.stringify(next));
      saveSeccionTimingsNow(seccionId, secTimings);
      return next;
    });
  };

  const getLineaActiva = (lineas: LineaConTiempo[]): number => {
    let activa = -1;
    for (let i = 0; i < lineas.length; i++) {
      const t = getTiempo(lineas[i].seccionId, lineas[i].lineaIdx);
      if (t !== null && t <= elapsed) activa = i;
    }
    return activa;
  };

  return { timings, elapsed, playing, modoEdit, setModoEdit, toggle, reset, seekTo, marcarLinea, borrarLinea, borrarTodo, getTiempo, setTiempo, getLineaActiva };
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 10);
  return `${m}:${ss.toString().padStart(2, "0")}.${ms}`;
}

function fmtTimeSeg(seg: number): string {
  const m = Math.floor(seg / 60);
  const s = Math.floor(seg % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function parseTimeSeg(str: string): number | null {
  const parts = str.trim().split(":");
  if (parts.length === 2) {
    const m = parseInt(parts[0]);
    const s = parseFloat(parts[1]);
    if (!isNaN(m) && !isNaN(s)) return m * 60 + s;
  }
  const plain = parseFloat(str);
  return isNaN(plain) ? null : plain;
}

// ── parseLrc ──────────────────────────────────────────────────────────────────

function parseLrc(texto: string, secciones: Seccion[], idioma: IdiomaKey): Record<string, Record<number, number>> {
  const result: Record<string, Record<number, number>> = {};
  const lines = texto.split("\n");
  const timedLines: { tiempo: number; texto: string }[] = [];

  for (const line of lines) {
    const match = line.match(/^\[(\d+):(\d+\.?\d*)\](.*)$/);
    if (match) {
      const min = parseInt(match[1]);
      const sec = parseFloat(match[2]);
      timedLines.push({ tiempo: min * 60 + sec, texto: match[3].trim() });
    }
  }

  const getLetraLocal = (sec: Seccion): string =>
    (idioma === "es" ? sec.letra_es : idioma === "en" ? sec.letra_en : idioma === "jp" ? sec.letra_jp : sec.letra_romaji) || "";

  let lrcIdx = 0;
  for (const sec of secciones) {
    const letra = getLetraLocal(sec);
    if (!letra.trim()) continue;
    const lineas = letra.split("\n");
    for (let li = 0; li < lineas.length; li++) {
      const linea = lineas[li].trim();
      if (!linea) continue;
      if (lrcIdx < timedLines.length) {
        if (!result[sec.id]) result[sec.id] = {};
        result[sec.id][li] = Math.round(timedLines[lrcIdx].tiempo * 10) / 10;
        lrcIdx++;
      }
    }
  }
  return result;
}

// ── ModalLectorLetras ─────────────────────────────────────────────────────────

const ModalLectorLetras = ({
  isOpen, onClose, secciones, cancionTitulo, cancionId, duracion, onSeccionTimingsChange,
}: {
  isOpen: boolean;
  onClose: () => void;
  secciones: Seccion[];
  cancionTitulo: string;
  cancionId: string;
  duracion?: number | null;
  onSeccionTimingsChange?: (seccionId: string, col: string, timings: Record<string, number>) => void;
}) => {
  const [idioma,      setIdioma]      = useState<IdiomaKey>("es");
  const [modoKaraoke, setModoKaraoke] = useState(true);
  const [zoom,        setZoom]        = useState(0.7);
  const [editandoTiempo, setEditandoTiempo] = useState<{ seccionId: string; lineaIdx: number } | null>(null);
  const [tiempoEditStr,  setTiempoEditStr]  = useState("");
  const activaRef   = useRef<HTMLDivElement>(null);
  const lrcInputRef = useRef<HTMLInputElement>(null);

  const karaoke   = useKaraoke(cancionId, idioma, secciones, duracion, onSeccionTimingsChange);
  const sliderMax = duracion ?? 600;

  const getLetra = (sec: Seccion, lang: IdiomaKey): string =>
    (lang === "es" ? sec.letra_es : lang === "en" ? sec.letra_en : lang === "jp" ? sec.letra_jp : sec.letra_romaji) || "";

  const handleCopy = () => {
    const texto = secciones
      .map(s => { const l = getLetra(s, idioma); return l ? `${s.nombre_seccion}\n\n${l}` : ""; })
      .filter(Boolean).join("\n\n---\n\n");
    navigator.clipboard.writeText(texto);
  };

  const lineas      = useMemo(() => buildLineas(secciones, idioma), [secciones, idioma]);
  const lineaActiva = karaoke.getLineaActiva(lineas);

  useEffect(() => {
    if (modoKaraoke && activaRef.current) {
      activaRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [lineaActiva, modoKaraoke]);

  const handleLrcImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const texto = await file.text();
    const parsed = parseLrc(texto, secciones, idioma);
    const col = `timings_${idioma}`;
    for (const [secId, timings] of Object.entries(parsed)) {
      const data = Object.fromEntries(Object.entries(timings).map(([k, v]) => [String(k), v]));
      await supabase.from("secciones_cancion").update({ [col]: data }).eq("id", secId);
      onSeccionTimingsChange?.(secId, col, data);
    }
    setIdioma(prev => { setTimeout(() => setIdioma(prev), 50); return prev === "es" ? "en" : "es"; });
    if (lrcInputRef.current) lrcInputRef.current.value = "";
  };

  const iniciarEdicion = (seccionId: string, lineaIdx: number) => {
    const t = karaoke.getTiempo(seccionId, lineaIdx);
    setEditandoTiempo({ seccionId, lineaIdx });
    setTiempoEditStr(t !== null ? fmtTime(t) : "");
  };

  const confirmarEdicion = () => {
    if (!editandoTiempo) return;
    const { seccionId, lineaIdx } = editandoTiempo;
    const str = tiempoEditStr.trim();
    let seg: number | null = null;
    const mmss = str.match(/^(\d+):(\d+\.?\d*)$/);
    if (mmss) { seg = parseInt(mmss[1]) * 60 + parseFloat(mmss[2]); }
    else { const plain = parseFloat(str); if (!isNaN(plain)) seg = plain; }

    if (seg !== null) {
      const roundedSeg = Math.round(seg * 10) / 10;
      // Actualizar state local + Supabase directamente (sin depender del elapsed actual)
      karaoke.setTiempo(seccionId, lineaIdx, roundedSeg);
    }
    setEditandoTiempo(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-primary/40 backdrop-blur-md" onClick={onClose} />

      <div className="bg-bg-main w-full max-w-4xl h-[100dvh] md:h-[92vh] md:rounded-[var(--radius-card)] shadow-2xl relative z-10 border border-primary/10 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-4 py-2.5 bg-white-custom border-b border-primary/10 flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-primary font-black uppercase text-[10px] tracking-[0.2em] italic truncate flex-1 min-w-0">
              {cancionTitulo}
            </span>

            <div className="flex gap-0.5 p-0.5 bg-primary/5 rounded-lg border border-primary/10">
              {IDIOMAS.map(({ id, label }) => (
                <button key={id} onClick={() => { setIdioma(id); karaoke.reset(); }}
                  className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${
                    idioma === id ? "bg-primary text-bg-main shadow" : "text-primary/40 hover:text-primary"
                  }`}
                >{label}</button>
              ))}
            </div>

            <div className="flex gap-0.5 p-0.5 bg-primary/5 rounded-lg border border-primary/10">
              <button
                onClick={() => setModoKaraoke(true)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${
                  modoKaraoke ? "bg-primary text-bg-main shadow" : "text-primary/40 hover:text-primary"
                }`}
              >
                <Timer size={10} /> Karaoke
              </button>
              <button
                onClick={() => setModoKaraoke(false)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${
                  !modoKaraoke ? "bg-primary text-bg-main shadow" : "text-primary/40 hover:text-primary"
                }`}
              >
                <FileText size={10} /> Letra
              </button>
            </div>

            {!modoKaraoke && (
              <div className="flex items-center gap-0.5">
                <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} className="w-6 h-6 flex items-center justify-center bg-primary/5 rounded text-primary hover:bg-primary/10 font-bold text-sm">-</button>
                <span className="text-[9px] font-black text-primary/50 w-8 text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(1.6, z + 0.1))} className="w-6 h-6 flex items-center justify-center bg-primary/5 rounded text-primary hover:bg-primary/10 font-bold text-sm">+</button>
              </div>
            )}

            <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary/30 hover:text-primary transition-all" title="Copiar letra">
              <Copy size={14} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary/30 hover:text-primary transition-all">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Controles karaoke */}
        {modoKaraoke && (
          <div className="flex-shrink-0 border-b border-primary/10 bg-white-custom/80 backdrop-blur-sm">
            <div className="px-4 py-2 flex items-center gap-2">
              <button
                onClick={karaoke.toggle}
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-bg-main hover:opacity-90 active:scale-95 transition-all shrink-0"
              >
                {karaoke.playing ? <Pause size={15} /> : <Play size={15} />}
              </button>

              <button onClick={karaoke.reset} className="p-2 rounded-xl border border-primary/15 text-primary/40 hover:text-primary hover:border-primary/30 transition-all shrink-0" title="Reiniciar">
                <SkipBack size={13} />
              </button>

              <span className="font-mono text-xs font-black text-primary tracking-widest shrink-0 min-w-[60px]">
                {fmtTime(karaoke.elapsed)}
              </span>

              <div className="flex-1 min-w-0">
                <input type="range" min={0} max={sliderMax} step={0.1}
                  value={Math.min(karaoke.elapsed, sliderMax)}
                  onChange={e => karaoke.seekTo(parseFloat(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: "var(--primary)" }}
                />
              </div>

              <button onClick={() => karaoke.setModoEdit(m => !m)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all shrink-0 ${
                  karaoke.modoEdit ? "bg-accent/20 border-accent text-accent" : "border-primary/15 text-primary/40 hover:text-primary hover:border-primary/30"
                }`}
              >
                <Clock size={10} /> {karaoke.modoEdit ? "Vinculando" : "Vincular"}
              </button>

              <button onClick={() => lrcInputRef.current?.click()}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-primary/15 text-primary/40 hover:text-primary hover:border-primary/30 transition-all shrink-0"
                title="Importar archivo .lrc"
              >
                <Upload size={10} /> .lrc
              </button>
              <input ref={lrcInputRef} type="file" accept=".lrc" className="hidden" onChange={handleLrcImport} />

              <button onClick={karaoke.borrarTodo} className="p-2 rounded-xl border border-primary/15 text-primary/30 hover:text-red-400 hover:border-red-300/30 transition-all shrink-0" title="Borrar todos los tiempos">
                <Trash2 size={12} />
              </button>
            </div>

            {karaoke.modoEdit && (
              <div className="px-4 pb-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-accent flex items-center gap-1.5">
                  <Dot size={12} className="animate-pulse" />
                  Clic = marcar tiempo · Clic der = borrar · Clic en tiempo = editar número
                </p>
              </div>
            )}
          </div>
        )}

        {/* Contenido */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-bg-main">

          {modoKaraoke ? (
            <div className="max-w-2xl mx-auto py-8 px-4 md:px-8">
              {secciones.map(sec => {
                const texto = getLetra(sec, idioma);
                if (!texto.trim()) return null;
                const lineasSec = texto.split("\n");
                return (
                  <div key={sec.id} className="mb-8">
                    <div className="flex items-center gap-3 mb-3 opacity-25">
                      <div className="h-px flex-1 bg-primary" />
                      <span className="text-[8px] font-black uppercase tracking-[0.4em] text-primary">{sec.nombre_seccion}</span>
                      <div className="h-px flex-1 bg-primary" />
                    </div>

                    {lineasSec.map((linea, lineaIdx) => {
                      const tiempo = karaoke.getTiempo(sec.id, lineaIdx);
                      const globalIdx = lineas.findIndex(l => l.seccionId === sec.id && l.lineaIdx === lineaIdx);
                      const isActiva  = globalIdx === lineaActiva;
                      const isPasada  = globalIdx < lineaActiva;
                      const esEditable = editandoTiempo?.seccionId === sec.id && editandoTiempo?.lineaIdx === lineaIdx;

                      if (!linea.trim()) return <div key={lineaIdx} className="h-2" />;

                      return (
                        <div
                          key={lineaIdx}
                          ref={isActiva ? activaRef : undefined}
                          onClick={() => {
                            if (karaoke.modoEdit) {
                              karaoke.marcarLinea(sec.id, lineaIdx);
                            } else if (tiempo !== null) {
                              karaoke.seekTo(tiempo);
                            }
                          }}
                          onContextMenu={e => { e.preventDefault(); if (karaoke.modoEdit) karaoke.borrarLinea(sec.id, lineaIdx); }}
                          className={`group relative flex items-center gap-2 py-1 px-2 rounded-lg transition-all duration-200 ${
                            isActiva
                              ? "bg-primary/8"
                              : karaoke.modoEdit || tiempo !== null
                                ? "cursor-pointer hover:bg-primary/5 active:bg-primary/10"
                                : ""
                          }`}
                        >
                          {isActiva && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-r-full" />
                          )}

                          <span className="shrink-0 min-w-[52px]">
                            {esEditable ? (
                              <input
                                autoFocus
                                value={tiempoEditStr}
                                onChange={e => setTiempoEditStr(e.target.value)}
                                onBlur={confirmarEdicion}
                                onKeyDown={e => {
                                  if (e.key === "Enter") confirmarEdicion();
                                  if (e.key === "Escape") setEditandoTiempo(null);
                                }}
                                onClick={e => e.stopPropagation()}
                                className="w-[52px] font-mono text-[10px] font-black text-primary bg-primary/10 border border-primary/30 rounded px-1 py-0.5 outline-none"
                                placeholder="0:00"
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  iniciarEdicion(sec.id, lineaIdx);
                                }}
                                className={`font-mono text-[10px] font-black tracking-widest transition-all rounded px-1 py-0.5 ${
                                  tiempo !== null
                                    ? isActiva
                                      ? "text-primary bg-primary/10"
                                      : isPasada
                                        ? "text-primary/20 hover:text-primary/50 hover:bg-primary/5"
                                        : "text-primary/35 hover:text-primary/60 hover:bg-primary/5"
                                    : karaoke.modoEdit
                                      ? "text-primary/15 group-hover:text-primary/35 group-hover:bg-primary/5"
                                      : "text-transparent"
                                }`}
                              >
                                {tiempo !== null ? fmtTime(tiempo) : "──:──"}
                              </button>
                            )}
                          </span>

                          <span className={`text-lg md:text-xl font-serif leading-relaxed transition-all duration-200 flex-1 min-w-0 ${
                            isActiva
                              ? "text-primary font-bold scale-[1.02] origin-left"
                              : isPasada
                                ? "text-primary/25"
                                : "text-primary/55"
                          }`}>
                            {linea}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              <div className="h-32" />
            </div>

          ) : (
            <div className="w-full overflow-x-hidden">
              <div
                className="origin-top transition-all duration-300 pb-16"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "top center",
                  paddingTop: "2rem",
                  paddingLeft: "1.5rem",
                  paddingRight: "1.5rem",
                  minHeight: `${100 / zoom}%`,
                }}
              >
                {secciones.map(sec => {
                  const texto = getLetra(sec, idioma);
                  return texto ? (
                    <div key={sec.id} className="mb-16 last:mb-0 max-w-2xl mx-auto text-center">
                      <div className="mb-8 flex items-center justify-center gap-6 opacity-20">
                        <div className="h-px w-12 bg-primary" />
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] italic text-primary">{sec.nombre_seccion}</span>
                        <div className="h-px w-12 bg-primary" />
                      </div>
                      <p className="text-foreground text-2xl md:text-4xl font-medium italic font-serif leading-[1.7] whitespace-pre-wrap break-words">
                        {texto}
                      </p>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── PanelLinks ────────────────────────────────────────────────────────────────

const PanelLinks = ({
  cancionId, links, onLinksChange,
}: {
  cancionId: string;
  links: CancionLink[];
  onLinksChange: (links: CancionLink[]) => void;
}) => {
  const [open,    setOpen]    = useState(false);
  const [titulo,  setTitulo]  = useState("");
  const [url,     setUrl]     = useState("");
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [saving,  setSaving]  = useState(false);
  const { confirm, ConfirmModal } = useConfirm();

  const saveLinks = async (newLinks: CancionLink[]) => {
    setSaving(true);
    try {
      const { error } = await supabase.from("canciones").update({ links: newLinks }).eq("id", cancionId);
      if (error) throw error;
      onLinksChange(newLinks);
    } catch (e) { console.error("Links:", e); }
    setSaving(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !url.trim()) return;
    const newLink = { titulo: titulo.trim(), url: url.trim() };
    const updated = [...links];
    if (editIdx !== null) updated[editIdx] = newLink;
    else updated.push(newLink);
    await saveLinks(updated);
    setTitulo(""); setUrl(""); setEditIdx(null);
  };

  const handleEdit = (i: number) => {
    setTitulo(links[i].titulo);
    setUrl(links[i].url);
    setEditIdx(i);
    setOpen(true);
  };

  const handleDelete = async (i: number) => {
    const ok = await confirm({ message: `¿Eliminar "${links[i].titulo}"?`, danger: true });
    if (!ok) return;
    await saveLinks(links.filter((_, idx) => idx !== i));
  };

  const handleCancel = () => {
    setTitulo(""); setUrl(""); setEditIdx(null);
  };

  return (
    <div className="border-t border-primary/8 px-8 py-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/40 hover:text-primary transition-colors w-full"
      >
        <Link2 size={12} />
        Enlaces
        {links.length > 0 && (
          <span className="bg-primary/10 text-primary/60 rounded-full px-2 py-0.5 text-[8px]">{links.length}</span>
        )}
        <ChevronDown size={11} className={`ml-auto transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {links.length > 0 && (
            <div className="space-y-1.5">
              {links.map((link, i) => (
                <div key={i} className="flex items-center gap-2 group">
                  <a
                    href={link.url} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center gap-1.5 text-[11px] font-bold text-primary/60 hover:text-primary transition-colors truncate min-w-0"
                  >
                    <ExternalLink size={10} className="shrink-0" />
                    <span className="truncate">{link.titulo}</span>
                  </a>
                  <button
                    onClick={() => handleEdit(i)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-primary/10 text-primary/30 hover:text-primary transition-all"
                  ><Pencil size={10} /></button>
                  <button
                    onClick={() => handleDelete(i)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-primary/20 hover:text-red-400 transition-all"
                  ><Trash2 size={10} /></button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-2 pt-1">
            <div className="flex gap-2">
              <input
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                placeholder="Título del enlace…"
                className="flex-1 bg-primary/5 border border-primary/15 rounded-xl px-3 py-2 text-[11px] font-medium text-primary outline-none focus:border-primary/40 transition-colors placeholder:text-primary/25"
              />
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://…"
                className="flex-1 bg-primary/5 border border-primary/15 rounded-xl px-3 py-2 text-[11px] font-medium text-primary outline-none focus:border-primary/40 transition-colors placeholder:text-primary/25"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!titulo.trim() || !url.trim() || saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-bg-main rounded-xl text-[9px] font-black uppercase tracking-widest disabled:opacity-40 hover:opacity-90 transition-all"
              >
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                {editIdx !== null ? "Guardar" : "Añadir"}
              </button>
              {editIdx !== null && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-3 py-2 rounded-xl border border-primary/15 text-[9px] font-black uppercase text-primary/40 hover:text-primary hover:border-primary/30 transition-all"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
      )}
      <ConfirmModal />
    </div>
  );
};

// ── PanelInfo ─────────────────────────────────────────────────────────────────

const PanelInfo = ({
  cancionId,
  infoInicial,
  onInfoChange,
}: {
  cancionId: string;
  infoInicial: string | null | undefined;
  onInfoChange: (v: string) => void;
}) => {
  const [texto,  setTexto]  = useState(infoInicial || "");
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [dirty,  setDirty]  = useState(false);
  const timer = useRef<any>(null);

  useEffect(() => {
    setTexto(infoInicial || "");
    setDirty(false);
    setSaved(false);
  }, [cancionId, infoInicial]);

  const doSave = useCallback(async (val: string) => {
    clearTimeout(timer.current);
    setSaving(true);
    try {
      const { error } = await supabase
        .from("canciones")
        .update({ info_cancion: val || null })
        .eq("id", cancionId);
      if (error) throw error;
      onInfoChange(val);
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("PanelInfo save:", e);
    }
    setSaving(false);
  }, [cancionId, onInfoChange]);

  const onChange = (val: string) => {
    setTexto(val);
    setDirty(true);
    setSaved(false);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => doSave(val), 1500);
  };

  const rows = Math.max(8, texto.split("\n").length + 2);

  return (
    <div className="px-8 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35 flex items-center gap-1.5">
            <Info size={10} /> Información de la Canción
          </p>
          <p className="text-[8px] text-primary/20 font-bold uppercase tracking-widest mt-0.5">
            Concepto, historia, referencias, notas de producción…
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest">
          {saving  && <Loader2 size={10} className="animate-spin text-primary/30" />}
          {saved   && <CheckCircle2 size={10} className="text-emerald-400" />}
          {dirty && !saving && !saved && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          )}
        </span>
      </div>

      <textarea
        value={texto}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); doSave(texto); } }}
        rows={rows}
        spellCheck
        placeholder={`Escribe todo lo que quieras recordar sobre esta canción:\n\n• De dónde surgió la idea\n• Qué emociones busca transmitir\n• Referencias visuales o musicales\n• Notas de producción\n• Historia detrás de la letra\n• Cualquier otra nota…`}
        className="w-full bg-bg-main/60 border border-primary/10 rounded-xl px-4 py-3 text-sm text-primary resize-none outline-none transition-colors placeholder:text-primary/15 leading-relaxed focus:border-primary/30"
      />

      <p className="text-[8px] text-primary/20 font-bold uppercase tracking-widest">
        Ctrl+S para guardar · se guarda solo al dejar de escribir
      </p>
    </div>
  );
};

// ── PanelGuionMV ──────────────────────────────────────────────────────────────

const PanelGuionMV = ({
  cancionId,
  secciones,
  idiomaActivo,
  guionInicial,
  onGuionChange,
}: {
  cancionId: string;
  secciones: Seccion[];
  idiomaActivo: IdiomaKey;
  guionInicial: EscenaMV[] | null | undefined;
  onGuionChange: (g: EscenaMV[]) => void;
}) => {
  const [guion,   setGuion]   = useState<EscenaMV[]>(guionInicial || []);
  const [saving,  setSaving]  = useState(false);
  const [editId,  setEditId]  = useState<string | null>(null);
  const [formTs,   setFormTs]   = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formTipo, setFormTipo] = useState<EscenaMV["tipo"]>("escena");
  const [formOpen, setFormOpen] = useState(false);
  const { confirm, ConfirmModal } = useConfirm();

  useEffect(() => {
    setGuion(guionInicial || []);
    setEditId(null);
    setFormOpen(false);
  }, [cancionId]);

  // Recoger todos los timestamps únicos del karaoke
  const timestampsDisponibles = useMemo((): number[] => {
    const timingKey = `timings_${idiomaActivo}` as keyof Seccion;
    const allTimes = new Set<number>();
    for (const sec of secciones) {
      const timings = sec[timingKey] as Record<string, number> | null | undefined;
      if (timings) {
        Object.values(timings).forEach(t => allTimes.add(Math.round(t * 10) / 10));
      }
    }
    return Array.from(allTimes).sort((a, b) => a - b);
  }, [secciones, idiomaActivo]);

  const saveGuion = useCallback(async (nuevoGuion: EscenaMV[]) => {
    setSaving(true);
    try {
      const sorted = [...nuevoGuion].sort((a, b) => a.timestamp_seg - b.timestamp_seg);
      const { error } = await supabase
        .from("canciones")
        .update({ guion_mv: sorted })
        .eq("id", cancionId);
      if (error) throw error;
      setGuion(sorted);
      onGuionChange(sorted);
    } catch (e) {
      console.error("PanelGuionMV save:", e);
    }
    setSaving(false);
  }, [cancionId, onGuionChange]);

  const handleSubmit = async () => {
    const tsRaw = parseTimeSeg(formTs);
    if (tsRaw === null || !formDesc.trim()) return;

    const nuevaEscena: EscenaMV = {
      id: editId || `mv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp_seg: tsRaw,
      descripcion: formDesc.trim(),
      tipo: formTipo,
    };

    const nuevoGuion = editId
      ? guion.map(e => e.id === editId ? nuevaEscena : e)
      : [...guion, nuevaEscena];

    await saveGuion(nuevoGuion);
    resetForm();
  };

  const handleEdit = (escena: EscenaMV) => {
    setEditId(escena.id);
    setFormTs(fmtTimeSeg(escena.timestamp_seg));
    setFormDesc(escena.descripcion);
    setFormTipo(escena.tipo);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ message: "¿Eliminar esta escena del guion?", danger: true });
    if (!ok) return;
    await saveGuion(guion.filter(e => e.id !== id));
  };

  const resetForm = () => {
    setEditId(null);
    setFormTs("");
    setFormDesc("");
    setFormTipo("escena");
    setFormOpen(false);
  };

  const handleTimestampClick = (ts: number) => {
    // Si ya existe escena para ese timestamp, editar la primera que coincida
    const existing = guion.find(e => Math.abs(e.timestamp_seg - ts) < 0.5);
    if (existing) {
      handleEdit(existing);
      return;
    }
    setFormTs(fmtTimeSeg(ts));
    setEditId(null);
    setFormOpen(true);
  };

  const guionOrdenado = [...guion].sort((a, b) => a.timestamp_seg - b.timestamp_seg);
  const tsConEscena = new Set(guion.map(e => Math.round(e.timestamp_seg)));

  return (
    <div className="px-8 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35 flex items-center gap-1.5">
            <Film size={10} /> Guion del MV
          </p>
          <p className="text-[8px] text-primary/20 font-bold uppercase tracking-widest mt-0.5">
            {guion.length > 0
              ? `${guion.length} escena${guion.length !== 1 ? "s" : ""} · vinculadas a timestamps del karaoke`
              : "Escenas del MV vinculadas a momentos de la canción"
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saving && <Loader2 size={12} className="animate-spin text-primary/30" />}
          <button
            onClick={() => { resetForm(); setFormOpen(true); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-bg-main rounded-xl text-[9px] font-black uppercase tracking-widest hover:opacity-90 transition-all"
          >
            <Plus size={11} /> Añadir escena
          </button>
        </div>
      </div>

      {/* Timestamps del karaoke disponibles */}
      {timestampsDisponibles.length > 0 && (
        <div className="space-y-2">
          <p className="text-[8px] font-black uppercase tracking-[0.3em] text-primary/25">
            Timestamps del karaoke — clic para añadir o editar escena
          </p>
          <div className="flex flex-wrap gap-1.5">
            {timestampsDisponibles.map(ts => {
              const tienEscena = tsConEscena.has(Math.round(ts));
              return (
                <button
                  key={ts}
                  onClick={() => handleTimestampClick(ts)}
                  className={`font-mono text-[10px] font-black px-2.5 py-1 rounded-lg border transition-all ${
                    tienEscena
                      ? "bg-primary/20 text-primary border-primary/40 hover:bg-primary/30"
                      : "bg-primary/5 text-primary/40 border-primary/15 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                  }`}
                >
                  {fmtTimeSeg(ts)}
                  {tienEscena && <span className="ml-1 text-[8px]">✦</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Estado vacío */}
      {timestampsDisponibles.length === 0 && guion.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12 text-primary/20 border border-dashed border-primary/10 rounded-xl">
          <Film size={36} strokeWidth={1} />
          <div className="text-center space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest">Sin escenas aún</p>
            <p className="text-[9px] font-bold uppercase tracking-widest opacity-60">
              Añade marcas de tiempo en el karaoke para usarlas como referencia,<br/>o crea escenas manualmente con cualquier momento de la canción.
            </p>
          </div>
        </div>
      )}

      {/* Formulario nueva/editar escena */}
      {formOpen && (
        <div className="border border-primary/15 rounded-xl bg-primary/3 p-4 space-y-3">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/40">
            {editId ? "Editar escena" : "Nueva escena"}
          </p>

          <div className="flex gap-3 items-end flex-wrap">
            {/* Timestamp */}
            <div className="space-y-1.5 w-28">
              <label className="text-[8px] font-black uppercase text-primary/30 tracking-widest">Tiempo</label>
              <div className="relative">
                <Clock size={10} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/30 pointer-events-none" />
                <input
                  value={formTs}
                  onChange={e => setFormTs(e.target.value)}
                  placeholder="1:12"
                  className="w-full bg-bg-main border border-primary/20 rounded-xl pl-8 pr-3 py-2.5 text-sm font-mono font-black text-primary outline-none focus:border-primary/40 transition-colors placeholder:text-primary/20"
                />
              </div>
            </div>

            {/* Tipo */}
            <div className="space-y-1.5 flex-1 min-w-0">
              <label className="text-[8px] font-black uppercase text-primary/30 tracking-widest">Tipo</label>
              <div className="flex gap-1 flex-wrap">
                {(Object.keys(TIPO_ESCENA_LABEL) as EscenaMV["tipo"][]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormTipo(t)}
                    className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                      formTipo === t
                        ? TIPO_ESCENA_COLOR[t]
                        : "border-primary/10 text-primary/30 hover:border-primary/25 hover:text-primary/60"
                    }`}
                  >
                    {TIPO_ESCENA_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <label className="text-[8px] font-black uppercase text-primary/30 tracking-widest">Descripción</label>
            <textarea
              value={formDesc}
              onChange={e => setFormDesc(e.target.value)}
              onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleSubmit(); }}
              rows={3}
              placeholder={
                formTipo === "escena"     ? "La cámara abre en un plano aéreo de la ciudad de noche…" :
                formTipo === "camara"     ? "Primer plano del personaje, zoom lento hacia sus ojos…" :
                formTipo === "efecto"     ? "Glitch visual, la imagen se fragmenta en píxeles…" :
                formTipo === "transicion" ? "Corte rápido al siguiente escenario, flash blanco…" :
                                           "El personaje aparece caminando hacia la cámara…"
              }
              className="w-full bg-bg-main border border-primary/15 rounded-xl px-4 py-3 text-sm text-primary resize-none outline-none transition-colors placeholder:text-primary/15 leading-relaxed focus:border-primary/30"
            />
          </div>

          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!formDesc.trim() || !formTs.trim() || parseTimeSeg(formTs) === null}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-bg-main rounded-xl text-[9px] font-black uppercase tracking-widest disabled:opacity-40 hover:opacity-90 transition-all"
            >
              {saving ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
              {editId ? "Guardar cambios" : "Añadir escena"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-2 rounded-xl border border-primary/15 text-[9px] font-black uppercase text-primary/40 hover:text-primary hover:border-primary/30 transition-all"
            >
              Cancelar
            </button>
            <p className="text-[8px] text-primary/20 font-bold uppercase tracking-widest">
              Ctrl+Enter para guardar
            </p>
          </div>
        </div>
      )}

      {/* Lista de escenas */}
      {guionOrdenado.length > 0 && (
        <div className="space-y-2">
          {guionOrdenado.map((escena) => (
            <div
              key={escena.id}
              className="group flex gap-3 items-start p-3 rounded-xl border border-primary/8 hover:border-primary/15 bg-bg-main/40 hover:bg-bg-main/60 transition-all"
            >
              {/* Timestamp + tipo */}
              <div className="shrink-0 flex flex-col items-center gap-1.5 pt-0.5 min-w-[52px]">
                <span className="font-mono text-sm font-black text-primary tabular-nums">
                  {fmtTimeSeg(escena.timestamp_seg)}
                </span>
                <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded-md border whitespace-nowrap ${TIPO_ESCENA_COLOR[escena.tipo]}`}>
                  {TIPO_ESCENA_LABEL[escena.tipo]}
                </span>
              </div>

              {/* Línea divisoria vertical */}
              <div className="w-px self-stretch bg-primary/8 shrink-0 mt-1" />

              {/* Descripción */}
              <p className="flex-1 text-sm text-primary/70 leading-relaxed whitespace-pre-wrap min-w-0">
                {escena.descripcion}
              </p>

              {/* Acciones */}
              <div className="shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button
                  onClick={() => handleEdit(escena)}
                  className="p-1.5 rounded-lg hover:bg-primary/10 text-primary/30 hover:text-primary transition-all"
                >
                  <Pencil size={11} />
                </button>
                <button
                  onClick={() => handleDelete(escena.id)}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-primary/20 hover:text-red-400 transition-all"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal />
    </div>
  );
};

// ── PanelEditor ───────────────────────────────────────────────────────────────

type EditorTab = "letras" | "info" | "guion";

const PanelEditor = ({ cancionId }: { cancionId: string }) => {
  const { cancion, setCancion, loading, isOffline: editorOffline, reload } = useCancionEditor(cancionId);
  const [idiomaA,    setIdiomaA]    = useState<IdiomaKey>("es");
  const [idiomaB,    setIdiomaB]    = useState<IdiomaKey>("en");
  const [splitMode,  setSplitMode]  = useState(false);
  const [addingOpen, setAddingOpen] = useState(false);
  const [addingName, setAddingName] = useState("");
  const [showLector, setShowLector] = useState(false);
  const [activeTab,  setActiveTab]  = useState<EditorTab>("letras");

  const handleSaveField = useCallback(async (id: string, updates: Partial<Seccion>) => {
    await secUpdate(id, updates);
    setCancion(prev => prev
      ? { ...prev, secciones: prev.secciones?.map(s => s.id === id ? { ...s, ...updates } : s) }
      : prev);
  }, [setCancion]);

  const handleSaveNombre = useCallback(async (id: string, nombre: string) => {
    await secUpdate(id, { nombre_seccion: nombre });
    setCancion(prev => prev
      ? { ...prev, secciones: prev.secciones?.map(s => s.id === id ? { ...s, nombre_seccion: nombre } : s) }
      : prev);
  }, [setCancion]);

  const handleDelete = useCallback(async (id: string) => {
    await secDelete(id);
    setCancion(prev => prev
      ? { ...prev, secciones: prev.secciones?.filter(s => s.id !== id) }
      : prev);
  }, [setCancion]);

  const handleAdd = async () => {
    if (!addingName.trim()) return;
    const secciones = cancion?.secciones || [];
    const nueva = await secCreate({
      cancion_id: cancionId,
      nombre_seccion: addingName.trim().toUpperCase(),
      letra_es: "",
      orden: secciones.length,
    });
    setCancion(prev => prev
      ? { ...prev, secciones: [...(prev.secciones || []), nueva] }
      : prev);
    setAddingName("");
    setAddingOpen(false);
  };

  const handleDuplicate = useCallback(async (sec: Seccion) => {
    const secciones = cancion?.secciones || [];
    const idx = secciones.findIndex(s => s.id === sec.id);
    const insertAt = idx + 1;
    const tmpSecs = [...secciones];
    const nueva = await secCreate({
      cancion_id: cancionId,
      nombre_seccion: sec.nombre_seccion + " (2)",
      letra_es: sec.letra_es || "",
      letra_en: sec.letra_en,
      letra_jp: sec.letra_jp,
      letra_romaji: sec.letra_romaji,
      orden: insertAt,
    });
    tmpSecs.splice(insertAt, 0, nueva);
    const reordenadas = tmpSecs.map((s, i) => ({ ...s, orden: i }));
    setCancion(prev => prev ? { ...prev, secciones: reordenadas } : prev);
    await secReorder(reordenadas.map(s => ({ id: s.id, orden: s.orden })));
  }, [cancion, cancionId, setCancion]);

  const handleMove = async (index: number, dir: "up" | "down") => {
    const secs = [...(cancion?.secciones || [])];
    const target = dir === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= secs.length) return;
    [secs[index], secs[target]] = [secs[target], secs[index]];
    const reordenadas = secs.map((s, i) => ({ ...s, orden: i }));
    setCancion(prev => prev ? { ...prev, secciones: reordenadas } : prev);
    await secReorder(reordenadas.map(s => ({ id: s.id, orden: s.orden })));
  };

  const changeIdiomaA = (v: IdiomaKey) => {
    setIdiomaA(v);
    if (splitMode && v === idiomaB) setIdiomaB(IDIOMAS.find(i => i.id !== v)!.id);
  };
  const changeIdiomaB = (v: IdiomaKey) => {
    setIdiomaB(v);
    if (v === idiomaA) setIdiomaA(IDIOMAS.find(i => i.id !== v)!.id);
  };

  const secciones = cancion?.secciones || [];
  const campoA    = IDIOMAS.find(i => i.id === idiomaA)!.campo;
  const conLetra  = secciones.filter(s => !!(s[campoA] as string)?.trim()).length;
  const pct       = secciones.length ? Math.round((conLetra / secciones.length) * 100) : 0;

  if (loading) return (
    <div className="flex-1 flex items-center justify-center text-primary/30">
      <Loader2 className="animate-spin" size={28} />
    </div>
  );
  if (!cancion) return null;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Modal lector */}
      {showLector && (
        <ModalLectorLetras
          isOpen={showLector}
          onClose={() => setShowLector(false)}
          secciones={secciones}
          cancionTitulo={cancion.titulo}
          cancionId={cancionId}
          duracion={cancion.duracion_segundos}
          onSeccionTimingsChange={(seccionId, col, timings) => {
            // col es "timings_es", "timings_en", etc.
            const idiomaKey = col.replace("timings_", "") as IdiomaKey;
            const timingField = `timings_${idiomaKey}` as keyof Seccion;
            // Convertir keys string → number para el state local
            const timingsNum = Object.fromEntries(
              Object.entries(timings).map(([k, v]) => [k, v])
            );
            setCancion(prev => prev ? {
              ...prev,
              secciones: prev.secciones?.map(s =>
                s.id === seccionId ? { ...s, [timingField]: timingsNum } : s
              ),
            } : prev);
          }}
        />
      )}

      {editorOffline && <BannerOffline color="amber" mensaje="Sin conexión — los cambios se sincronizan al reconectar" />}

      {/* ── Header de la canción ── */}
      <div className="shrink-0 px-8 pt-7 pb-5 border-b border-primary/10 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl font-black uppercase italic tracking-tight text-primary leading-none truncate">
              {cancion.titulo}
            </h1>
            <div className="flex flex-wrap gap-4 mt-2 text-[10px] font-black uppercase text-primary/40 tracking-widest items-center">
              {cancion.personaje && (
                <span className="flex items-center gap-1">
                  <User size={12} strokeWidth={3} /> {cancion.personaje}
                </span>
              )}
              {cancion.cantante && (
                <span className="flex items-center gap-1">
                  <Mic2 size={12} strokeWidth={3} /> {cancion.cantante}
                </span>
              )}
              {cancion.compositor && (
                <span className="flex items-center gap-1">
                  <PenLine size={12} strokeWidth={3} /> {cancion.compositor}
                </span>
              )}
              {cancion.idioma && (
                <span className="flex items-center gap-1">
                  <Globe size={12} strokeWidth={3} /> {cancion.idioma}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full border ${ESTADO_COLOR[cancion.estado]}`}>
              {cancion.estado}
            </span>
            <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full border flex items-center gap-1 ${
              cancion.visible
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : "bg-primary/10 text-primary/40 border-primary/20"
            }`}>
              {cancion.visible ? <Eye size={10} /> : <EyeOff size={10} />}
              {cancion.visible ? "Visible" : "Oculta"}
            </span>
            <button
              onClick={() => setShowLector(true)}
              title="Modo lectura"
              className="p-2 rounded-lg hover:bg-emerald-500/10 text-primary/30 hover:text-emerald-500 transition-all"
            >
              <FileText size={13} />
            </button>
            <button onClick={reload as any} className="p-2 rounded-lg hover:bg-primary/10 text-primary/30 hover:text-primary transition-all">
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* ── Tab bar principal ── */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 p-1 bg-primary/5 rounded-xl border border-primary/10">
            {([
              { id: "letras", label: "Letras",  icon: <Music  size={10} /> },
              { id: "info",   label: "Info",    icon: <Info   size={10} /> },
              { id: "guion",  label: "Guion MV",icon: <Film   size={10} /> },
            ] as { id: EditorTab; label: string; icon: React.ReactNode }[]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.id
                    ? "bg-primary text-bg-main shadow-md shadow-primary/20"
                    : "text-primary/40 hover:text-primary"
                }`}
              >
                {tab.icon} {tab.label}
                {/* Badge con conteo para guion */}
                {tab.id === "guion" && (cancion.guion_mv?.length ?? 0) > 0 && (
                  <span className={`rounded-full w-4 h-4 text-[8px] flex items-center justify-center ${
                    activeTab === "guion" ? "bg-bg-main/30 text-bg-main" : "bg-primary/15 text-primary/70"
                  }`}>
                    {cancion.guion_mv!.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Controles de idioma — solo en tab letras */}
          {activeTab === "letras" && (
            <>
              <IdiomaTab value={idiomaA} onChange={changeIdiomaA} exclude={splitMode ? idiomaB : undefined} />
              <button
                onClick={() => setSplitMode(m => !m)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                  splitMode
                    ? "bg-primary text-bg-main border-primary shadow-md shadow-primary/20"
                    : "border-primary/20 text-primary/40 hover:text-primary hover:border-primary/30"
                }`}
              >
                <Columns2 size={13} /> Vista dividida
              </button>
              {splitMode && (
                <IdiomaTab value={idiomaB} onChange={changeIdiomaB} exclude={idiomaA} />
              )}
              <div className="ml-auto flex items-center gap-2 text-[10px] font-black uppercase text-primary/35 tracking-widest">
                <span>{conLetra}/{secciones.length}</span>
                <div className="w-20 h-1.5 rounded-full bg-primary/10 overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                <span>{pct}%</span>
              </div>
            </>
          )}
        </div>

        {activeTab === "letras" && splitMode && (
          <div className="flex gap-3 text-[9px] font-black uppercase tracking-[0.25em] text-primary/30 px-1">
            <span className="flex-1 text-center">{IDIOMAS.find(i => i.id === idiomaA)?.nombre}</span>
            <span className="w-px" />
            <span className="flex-1 text-center">{IDIOMAS.find(i => i.id === idiomaB)?.nombre}</span>
          </div>
        )}
      </div>

      {/* ── Contenido por tab ── */}
      <div className="flex-1 overflow-y-auto">

        {/* Tab: Letras */}
        {activeTab === "letras" && (
          <div className="px-8 py-5 space-y-4">
            {secciones.length > 0 && (
              <div className="border border-primary/10 rounded-xl bg-bg-main/50 overflow-hidden">
                {secciones.map((sec, i) => (
                  <React.Fragment key={sec.id}>
                    {i > 0 && <div className="h-px bg-primary/8 mx-4" />}
                    <SeccionEditor
                      sec={sec}
                      idiomaA={idiomaA}
                      idiomaB={idiomaB}
                      splitMode={splitMode}
                      onSaveField={handleSaveField}
                      onSaveNombre={handleSaveNombre}
                      onDelete={handleDelete}
                      onDuplicate={handleDuplicate}
                      onMoveUp={() => handleMove(i, "up")}
                      onMoveDown={() => handleMove(i, "down")}
                      isFirst={i === 0}
                      isLast={i === secciones.length - 1}
                    />
                  </React.Fragment>
                ))}
              </div>
            )}

            {secciones.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16 text-primary/25">
                <Layers size={40} strokeWidth={1} />
                <p className="text-xs font-black uppercase tracking-widest">Sin secciones aún</p>
              </div>
            )}

            {addingOpen ? (
              <div className="flex gap-2 pt-1">
                <input
                  autoFocus
                  value={addingName}
                  onChange={e => setAddingName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAddingOpen(false); }}
                  className="flex-1 bg-bg-main border border-primary/20 rounded-xl px-4 py-3 text-xs font-black uppercase text-primary outline-none focus:border-primary/50 tracking-widest placeholder:text-primary/20"
                  placeholder="CORO, VERSO 1, PUENTE…"
                />
                <button onClick={handleAdd} className="bg-primary text-bg-main px-5 py-3 rounded-xl font-black hover:scale-105 active:scale-95 transition-all">
                  <Check size={15} />
                </button>
                <button onClick={() => setAddingOpen(false)} className="px-4 py-3 rounded-xl border border-primary/20 text-primary/40 hover:text-primary hover:border-primary/40 transition-all">
                  <X size={15} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-primary/15 text-[10px] font-black uppercase text-primary/25 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all tracking-widest"
              >
                <Plus size={13} /> Añadir Sección
              </button>
            )}

            {/* Panel de links al fondo */}
            <PanelLinks
              cancionId={cancionId}
              links={cancion.links || []}
              onLinksChange={(newLinks) =>
                setCancion(prev => prev ? { ...prev, links: newLinks } : prev)
              }
            />
          </div>
        )}

        {/* Tab: Info */}
        {activeTab === "info" && (
          <PanelInfo
            cancionId={cancionId}
            infoInicial={cancion.info_cancion}
            onInfoChange={(v) =>
              setCancion(prev => prev ? { ...prev, info_cancion: v } : prev)
            }
          />
        )}

        {/* Tab: Guion MV */}
        {activeTab === "guion" && (
          <PanelGuionMV
            cancionId={cancionId}
            secciones={secciones}
            idiomaActivo={idiomaA}
            guionInicial={cancion.guion_mv}
            onGuionChange={(g) =>
              setCancion(prev => prev ? { ...prev, guion_mv: g } : prev)
            }
          />
        )}
      </div>
    </div>
  );
};

// ── EstudioLetras (root) ──────────────────────────────────────────────────────

export default function EstudioLetras() {
  const { canciones, setCanciones, loading: loadingLista, isOffline: listaOffline, refetch } = useCanciones();
  const [lastId, setLastId] = useLastOpenedId("estudio-letras-last-id");
  const [selectedId, _setSelectedId] = useState<string | null>(lastId);

  const setSelectedId = (id: string | null) => {
    _setSelectedId(id);
    setLastId(id);
  };
  const [busqueda,         setBusqueda]         = useState("");
  const [filtros,          setFiltros]          = useState<Filtros>(FILTROS_VACIOS);
  const [showFiltros,      setShowFiltros]      = useState(false);
  const [sidebarOpen,      setSidebarOpen]      = useState(true);
  const [showNueva,        setShowNueva]        = useState(false);
  const [editandoCancion,  setEditandoCancion]  = useState<Cancion | null>(null);

  const opciones = useMemo(() => ({
    idiomas:      unique(canciones.map(c => c.idioma     || "")),
    cantantes:    unique(canciones.map(c => c.cantante   || "")),
    compositores: unique(canciones.map(c => c.compositor || "")),
    personajes:   unique(canciones.map(c => c.personaje  || "")),
  }), [canciones]);

  const filtradas = useMemo(() => canciones.filter(c => {
    if (busqueda) {
      const q = normalize(busqueda);
      if (
        !normalize(c.titulo).includes(q) &&
        !normalize(c.personaje  || "").includes(q) &&
        !normalize(c.cantante   || "").includes(q) &&
        !normalize(c.compositor || "").includes(q)
      ) return false;
    }
    if (filtros.estado     && c.estado      !== filtros.estado)        return false;
    if (filtros.visible    && String(c.visible) !== filtros.visible)   return false;
    if (filtros.idioma     && c.idioma      !== filtros.idioma)        return false;
    if (filtros.cantante   && c.cantante    !== filtros.cantante)      return false;
    if (filtros.compositor && c.compositor  !== filtros.compositor)    return false;
    if (filtros.personaje  && c.personaje   !== filtros.personaje)     return false;
    return true;
  }), [canciones, busqueda, filtros]);

  const usarGrupos = !busqueda && !filtros.estado;
  const grupos = useMemo(() =>
    ESTADOS.map(est => ({ estado: est, items: filtradas.filter(c => c.estado === est) }))
           .filter(g => g.items.length > 0),
    [filtradas]
  );

  const numFiltros = Object.values(filtros).filter(Boolean).length;

  const handleCancionCreada = (c: Cancion) => {
    setCanciones(prev => [c, ...prev]);
    setSelectedId(c.id);
  };

  const handleCancionEditada = (c: Cancion) => {
    setCanciones(prev => prev.map(x => x.id === c.id ? c : x));
  };

  const handleCancionEliminada = async (id: string) => {
    try {
      await supabase.from("canciones").delete().eq("id", id);
      setCanciones(prev => prev.filter(c => c.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (e) { console.error(e); }
  };

  const sidebarContent = (
    <div className="space-y-1">
      {loadingLista ? (
        <div className="flex items-center justify-center py-12 text-primary/30">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-10 text-primary/25">
          <p className="text-xs font-black uppercase tracking-widest">Sin resultados</p>
        </div>
      ) : usarGrupos ? (
        grupos.map(({ estado, items }) => (
          <div key={estado} className="mb-3">
            <p className={`text-[9px] font-black uppercase tracking-[0.3em] px-4 py-2 ${ESTADO_COLOR[estado].split(" ")[1]}`}>
              {estado} ({items.length})
            </p>
            {items.map(c => (
              <SidebarItem
                key={c.id}
                cancion={c}
                selected={selectedId === c.id}
                onClick={() => { setSelectedId(c.id); setSidebarOpen(false); }}
                onEdit={setEditandoCancion}
                onDelete={handleCancionEliminada}
              />
            ))}
          </div>
        ))
      ) : (
        filtradas.map(c => (
          <SidebarItem
            key={c.id}
            cancion={c}
            selected={selectedId === c.id}
            onClick={() => { setSelectedId(c.id); setSidebarOpen(false); }}
            onEdit={setEditandoCancion}
            onDelete={handleCancionEliminada}
          />
        ))
      )}
    </div>
  );

  const headerExtra = (
    <>
      <button
        onClick={() => setShowNueva(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-primary/20 text-[10px] font-black uppercase text-primary/35 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all tracking-widest"
      >
        <Plus size={12} /> Nueva Canción
      </button>
      <button
        onClick={() => setShowFiltros(f => !f)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
          numFiltros > 0
            ? "border-primary/30 bg-primary/10 text-primary"
            : "border-primary/10 text-primary/30 hover:text-primary hover:border-primary/20"
        }`}
      >
        <span className="flex items-center gap-1.5">
          <SlidersHorizontal size={11} /> Filtros
          {numFiltros > 0 && (
            <span className="bg-primary text-bg-main rounded-full w-4 h-4 text-[8px] flex items-center justify-center">
              {numFiltros}
            </span>
          )}
        </span>
        <ChevronDown size={11} className={`transition-transform duration-200 ${showFiltros ? "rotate-180" : ""}`} />
      </button>
      {showFiltros && (
        <PanelFiltros filtros={filtros} onChange={setFiltros} opciones={opciones} />
      )}
    </>
  );

  return (
    <>
      <EstudioLayout
        titulo="Canciones"
        icono={<Music size={12} />}
        colapsadoLabel="Canciones"
        onRefetch={refetch}
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        busquedaPlaceholder="Título, cantante, compositor…"
        headerExtra={headerExtra}
        sidebarContent={sidebarContent}
        isOffline={listaOffline}
        footerLeft={`${canciones.length} canciones`}
        footerRight={`${filtradas.length} mostradas`}
        sidebarOpen={sidebarOpen}
        onSidebarOpenChange={setSidebarOpen}
      >
        {selectedId ? (
          <PanelEditor key={selectedId} cancionId={selectedId} />
        ) : (
          <EmptyEstudio icono={<BookOpen size={52} strokeWidth={1}/>} titulo="Estudio de Letras" subtitulo="Selecciona una canción o crea una nueva" />
        )}
      </EstudioLayout>

      {showNueva && (
        <ModalNuevaCancion
          onCreated={handleCancionCreada}
          onClose={() => setShowNueva(false)}
        />
      )}
      {editandoCancion && (
        <ModalEditarCancion
          cancion={editandoCancion}
          onSaved={handleCancionEditada}
          onClose={() => setEditandoCancion(null)}
        />
      )}
    </>
  );
}