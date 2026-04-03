"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Search, X, ChevronDown, Plus, Trash2, Save, GripVertical,
  Check, Loader2, Eye, EyeOff, Music, RefreshCw,
  ChevronUp, BookOpen, Layers, SlidersHorizontal,
  CheckCircle2, AlertCircle, PanelLeftClose, PanelLeftOpen,
  Columns2, WifiOff, MoreHorizontal, Pencil,
  Link2, FileText, ExternalLink, Copy, ZoomIn, ZoomOut,
  Play, Pause, Clock, SkipBack, Timer, Dot,
} from "lucide-react";
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
};

type IdiomaKey = "es" | "en" | "jp" | "romaji";

type Filtros = {
  estado: string;
  visible: "" | "true" | "false";
  idioma: string;
  cantante: string;
  compositor: string;
};

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
  estado: "", visible: "", idioma: "", cantante: "", compositor: "",
};

const TABLA_SEC = "secciones_cancion";

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
    } catch { setLoading(true); }

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

const Chip = ({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={`text-[9px] font-black uppercase px-2.5 py-1.5 rounded-full border transition-all whitespace-nowrap ${
      active
        ? "bg-primary text-bg-main border-primary"
        : "border-primary/20 text-primary/50 hover:border-primary/40 hover:text-primary"
    }`}
  >
    {children}
  </button>
);

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

      {}
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
    // Siempre guardar borrador local primero (seguro ante caída de red)
    draft.save(val);
    try {
      await onSave(sec.id, { [campo]: val });
      draft.clear(); // Limpiar borrador al guardar con éxito
      if (navigator.onLine) {
        setSt({ dirty: false, saving: false, saved: true, mode: "idle", msg: null });
        setTimeout(() => setSt(s => ({ ...s, saved: false })), 2000);
      } else {
        setSt({ dirty: false, saving: false, saved: false, mode: "pending", msg: "Guardado sin conexión" });
      }
    } catch (e: any) {
      // Guardar en Dexie offline queue ya fue hecho por secUpdate
      setSt(s => ({ ...s, saving: false, mode: "pending", msg: "Sin conexión — guardado localmente" }));
    }
  }, [sec.id, campo, onSave, draft]);

  const onChange = (val: string) => {
    setTexto(val);
    // Guardar borrador inmediatamente en cada cambio (sin esperar al debounce)
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

const SeccionEditor = ({
  sec, idiomaA, idiomaB, splitMode,
  onSaveField, onSaveNombre, onDelete, onMoveUp, onMoveDown,
  isFirst, isLast,
}: {
  sec: Seccion;
  idiomaA: IdiomaKey;
  idiomaB: IdiomaKey;
  splitMode: boolean;
  onSaveField: (id: string, updates: Partial<Seccion>) => Promise<void>;
  onSaveNombre: (id: string, nombre: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) => {
  const [nombre, setNombre]     = useState(sec.nombre_seccion);
  const [expanded, setExpanded] = useState(true);
  const { confirm, ConfirmModal } = useConfirm();

  return (
    <div className="border border-primary/10 rounded-xl bg-bg-main/50 hover:border-primary/20 transition-all">
      <div className="flex items-center gap-2 px-4 py-2.5">
        <GripVertical size={13} className="text-primary/15 shrink-0" />
        <input
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          onBlur={() => nombre !== sec.nombre_seccion && onSaveNombre(sec.id, nombre)}
          className="flex-1 bg-transparent text-[11px] font-black uppercase text-primary outline-none tracking-widest placeholder:text-primary/20 min-w-0"
          placeholder="NOMBRE DE SECCIÓN…"
        />
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={onMoveUp}   disabled={isFirst} className="p-1 rounded-lg hover:bg-primary/10 text-primary/25 hover:text-primary disabled:opacity-20 transition-all"><ChevronUp   size={12} /></button>
          <button onClick={onMoveDown} disabled={isLast}  className="p-1 rounded-lg hover:bg-primary/10 text-primary/25 hover:text-primary disabled:opacity-20 transition-all"><ChevronDown size={12} /></button>
          <button onClick={async () => {
            const ok = await confirm({ message: `¿Eliminar sección "${nombre}"?`, danger: true });
            if (ok) onDelete(sec.id);
          }} className="p-1 rounded-lg hover:bg-red-500/10 text-primary/20 hover:text-red-400 transition-all"><Trash2 size={12} /></button>
          <button onClick={() => setExpanded(e => !e)} className="p-1 rounded-lg hover:bg-primary/10 text-primary/25 hover:text-primary transition-all">
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>
      {expanded && (
        <div className={`px-4 pb-4 ${splitMode ? "flex gap-3" : ""}`}>
          <SeccionTextarea sec={sec} idioma={idiomaA} onSave={onSaveField} />
          {splitMode && (
            <>
              <div className="w-px bg-primary/10 shrink-0 self-stretch" />
              <SeccionTextarea sec={sec} idioma={idiomaB} onSave={onSaveField} />
            </>
          )}
        </div>
      )}
      <ConfirmModal />
    </div>
  );
};

const PanelFiltros = ({
  filtros, onChange, opciones,
}: {
  filtros: Filtros;
  onChange: (f: Filtros) => void;
  opciones: { idiomas: string[]; cantantes: string[]; compositores: string[] };
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
            <CampoInput label="Cantante" value={cantante} onChange={setCantante} placeholder="Cantante…" />
            <CampoInput label="Compositor" value={compositor} onChange={setCompositor} placeholder="Compositor…" />
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

  // Parsear mm:ss → segundos
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
          <CampoInput label="Cantante"   value={cantante}   onChange={setCantante}   placeholder="Cantante…" />
          <CampoInput label="Compositor" value={compositor} onChange={setCompositor} placeholder="Compositor…" />
        </div>
        <SelectIdioma value={idioma} onChange={setIdioma} />

        {/* Duración para karaoke */}
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

        {/* Estado */}
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

        {/* Visibilidad */}
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

// ─── Tipos y hook de vinculación por tiempo (Karaoke) ────────────────────────

type LineaConTiempo = {
  seccionId: string;
  lineaIdx:  number;
  texto:     string;
  tiempo:    number | null; // segundos desde inicio
};

type KaraokeTimings = Record<string, Record<number, number>>; // seccionId → lineaIdx → segundos

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

function useKaraoke(cancionId: string, idioma: IdiomaKey, secciones: Seccion[]) {
  const storageKey = `karaoke-${cancionId}-${idioma}`;

  // Inicializar desde secciones de Supabase (campo timings_<idioma>)
  const timingsFromSupabase = (): KaraokeTimings => {
    const col = `timings_${idioma}` as keyof Seccion;
    const result: KaraokeTimings = {};
    for (const sec of secciones) {
      const t = sec[col] as Record<string, number> | null | undefined;
      if (t && Object.keys(t).length > 0) {
        // Supabase guarda keys como strings, convertir a number
        result[sec.id] = Object.fromEntries(
          Object.entries(t).map(([k, v]) => [Number(k), v])
        );
      }
    }
    return result;
  };

  const [timings, setTimings] = useState<KaraokeTimings>(() => {
    // Priorizar Supabase, fallback a localStorage
    const fromSupa = timingsFromSupabase();
    if (Object.keys(fromSupa).length > 0) return fromSupa;
    try { return JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch { return {}; }
  });
  const [elapsed,  setElapsed]  = useState(0);
  const [playing,  setPlaying]  = useState(false);
  const [modoEdit, setModoEdit] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef    = useRef<number>(0);
  const baseRef     = useRef<number>(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Recargar cuando cambia idioma o canción
  useEffect(() => {
    const fromSupa = timingsFromSupabase();
    if (Object.keys(fromSupa).length > 0) {
      setTimings(fromSupa);
    } else {
      try { setTimings(JSON.parse(localStorage.getItem(storageKey) || "{}")); } catch { setTimings({}); }
    }
    setElapsed(0); setPlaying(false);
  }, [storageKey]); // eslint-disable-line

  // Tick
  useEffect(() => {
    if (playing) {
      startRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        setElapsed(baseRef.current + (Date.now() - startRef.current) / 1000);
      }, 50);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      baseRef.current = elapsed;
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing]); // eslint-disable-line

  // Guardar timings de una sección en Supabase (debounced 1s)
  const saveSeccionTimings = (seccionId: string, secTimings: Record<number, number>) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const col = `timings_${idioma}`;
      // Convertir keys number a string para JSONB
      const data = Object.fromEntries(
        Object.entries(secTimings).map(([k, v]) => [String(k), v])
      );
      await supabase.from("secciones_cancion").update({ [col]: data }).eq("id", seccionId);
    }, 1000);
  };

  const toggle = () => setPlaying(p => !p);
  const reset  = () => { setPlaying(false); baseRef.current = 0; setElapsed(0); };
  const seekTo = (s: number) => { baseRef.current = s; startRef.current = Date.now(); setElapsed(s); };

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
    // Limpiar en Supabase para todas las secciones
    const col = `timings_${idioma}`;
    for (const sec of secciones) {
      await supabase.from("secciones_cancion").update({ [col]: null }).eq("id", sec.id);
    }
  };

  const getTiempo = (seccionId: string, lineaIdx: number): number | null =>
    timings[seccionId]?.[lineaIdx] ?? null;

  // Índice de línea activa: la última con tiempo <= elapsed
  const getLineaActiva = (lineas: LineaConTiempo[]): number => {
    let activa = -1;
    for (let i = 0; i < lineas.length; i++) {
      const t = getTiempo(lineas[i].seccionId, lineas[i].lineaIdx);
      if (t !== null && t <= elapsed) activa = i;
    }
    return activa;
    return activa;
  };

  return { timings, elapsed, playing, modoEdit, setModoEdit, toggle, reset, seekTo, marcarLinea, borrarLinea, borrarTodo, getTiempo, getLineaActiva };
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 10);
  return `${m}:${ss.toString().padStart(2, "0")}.${ms}`;
}

// ─── Modal lector de letra (modo lectura limpia) ──────────────────────────────
const ModalLectorLetras = ({
  isOpen, onClose, secciones, cancionTitulo, cancionId, duracion,
}: {
  isOpen: boolean;
  onClose: () => void;
  secciones: Seccion[];
  cancionTitulo: string;
  cancionId: string;
  duracion?: number | null;
}) => {
  const [zoom,       setZoom]       = useState(0.6);
  const [idioma,     setIdioma]     = useState<IdiomaKey>("es");
  const [modoKaraoke, setModoKaraoke] = useState(false);
  const activaRef = useRef<HTMLDivElement>(null);

  const karaoke = useKaraoke(cancionId, idioma, secciones);
  const sliderMax = duracion ?? 600;

  const getLetra = (sec: Seccion, lang: IdiomaKey): string =>
    (lang === "es"     ? sec.letra_es
   : lang === "en"     ? sec.letra_en
   : lang === "jp"     ? sec.letra_jp
   : lang === "romaji" ? sec.letra_romaji
   : "") || "";

  const handleCopy = () => {
    const texto = secciones
      .map(s => { const l = getLetra(s, idioma); return l ? `${s.nombre_seccion}\n\n${l}` : ""; })
      .filter(Boolean).join("\n\n---\n\n");
    navigator.clipboard.writeText(texto);
  };

  // Líneas planas para el modo karaoke
  const lineas = useMemo(() => buildLineas(secciones, idioma), [secciones, idioma]);
  const lineaActiva = karaoke.getLineaActiva(lineas);

  // Auto-scroll a línea activa
  useEffect(() => {
    if (modoKaraoke && activaRef.current) {
      activaRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [lineaActiva, modoKaraoke]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 md:p-6">
      <div className="absolute inset-0 bg-primary/40 backdrop-blur-md" onClick={onClose} />
      <div className="bg-bg-main w-full max-w-5xl h-full md:h-[90vh] md:rounded-[var(--radius-card)] shadow-2xl relative z-10 border border-primary/10 flex flex-col">

        {/* Header */}
        <div className="px-6 py-3 bg-white-custom border-b border-primary/10 flex-shrink-0 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileText size={13} className="text-primary/50" />
            <span className="text-primary font-black uppercase text-[10px] tracking-[0.2em] italic truncate max-w-[200px]">
              {cancionTitulo}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Idioma */}
            <div className="flex gap-1 p-1 bg-primary/5 rounded-xl border border-primary/10">
              {IDIOMAS.map(({ id, label }) => (
                <button key={id} onClick={() => { setIdioma(id); karaoke.reset(); }}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                    idioma === id ? "bg-primary text-bg-main shadow-md" : "text-primary/40 hover:text-primary"
                  }`}
                >{label}</button>
              ))}
            </div>
            {/* Zoom (solo lectura normal) */}
            {!modoKaraoke && (
              <div className="flex items-center gap-1">
                <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} className="w-6 h-6 flex items-center justify-center bg-primary/5 rounded text-primary hover:bg-primary/10 font-bold text-sm">-</button>
                <span className="text-[9px] font-black text-primary/50 min-w-[36px] text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="w-6 h-6 flex items-center justify-center bg-primary/5 rounded text-primary hover:bg-primary/10 font-bold text-sm">+</button>
              </div>
            )}
            {/* Copiar */}
            <button onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-primary/15 text-primary/40 hover:text-primary hover:border-primary/30 transition-all"
            >
              <Copy size={11} /> Copiar
            </button>
            {/* Toggle modo karaoke */}
            <button
              onClick={() => { setModoKaraoke(m => !m); karaoke.reset(); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                modoKaraoke
                  ? "bg-primary text-bg-main border-primary"
                  : "border-primary/15 text-primary/40 hover:text-primary hover:border-primary/30"
              }`}
            >
              <Timer size={11} /> Karaoke
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary/30 hover:text-primary transition-all">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Barra de karaoke */}
        {modoKaraoke && (
          <div className="flex-shrink-0 border-b border-primary/10 bg-white-custom">
            {/* Controles principales */}
            <div className="px-6 py-3 flex items-center gap-3 flex-wrap">
              <button
                onClick={karaoke.toggle}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-bg-main text-[10px] font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all"
              >
                {karaoke.playing ? <Pause size={13} /> : <Play size={13} />}
                {karaoke.playing ? "Pausar" : "Play"}
              </button>
              <button
                onClick={karaoke.reset}
                className="p-2 rounded-xl border border-primary/15 text-primary/40 hover:text-primary hover:border-primary/30 transition-all"
                title="Reiniciar"
              >
                <SkipBack size={13} />
              </button>

              {/* Tiempo */}
              <span className="font-mono text-sm font-black text-primary tracking-widest min-w-[80px]">
                {fmtTime(karaoke.elapsed)}
              </span>

              {/* Barra de progreso manual */}
              <div className="flex-1 min-w-[80px]">
                <input
                  type="range"
                  min={0}
                  max={sliderMax}
                  step={0.1}
                  value={Math.min(karaoke.elapsed, sliderMax)}
                  onChange={e => karaoke.seekTo(parseFloat(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: "var(--primary)" }}
                />
              </div>

              <button
                onClick={() => karaoke.setModoEdit(m => !m)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                  karaoke.modoEdit
                    ? "bg-accent/20 border-accent text-accent" 
                    : "border-primary/15 text-primary/40 hover:text-primary hover:border-primary/30"
                }`}
              >
                <Clock size={11} /> {karaoke.modoEdit ? "Vinculando" : "Vincular"}
              </button>

              <button
                onClick={karaoke.borrarTodo}
                className="p-2 rounded-xl border border-primary/15 text-primary/30 hover:text-accent hover:border-accent/30 transition-all"
                title="Borrar todos los tiempos"
              >
                <Trash2 size={12} />
              </button>
            </div> 
            
            {karaoke.modoEdit && (
              <div className="px-6 pb-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-accent flex items-center gap-1.5">
                  <Dot size={12} className="animate-pulse" />
                  Haz clic en una línea para marcar su tiempo — o clic derecho para borrar
                </p>
              </div>
            )}
          </div>
        )}

        {/* Contenido */}
        <div className="flex-1 overflow-auto bg-bg-main">
          {modoKaraoke ? (
            /* ── Vista Karaoke ── */
            <div className="max-w-3xl mx-auto py-12 px-8 space-y-0">
              {secciones.map(sec => {
                const texto = getLetra(sec, idioma);
                if (!texto.trim()) return null;
                const lineasSec = texto.split("\n");
                return (
                  <div key={sec.id} className="mb-10">
                    {/* Nombre de sección */}
                    <div className="flex items-center gap-4 mb-4 opacity-30">
                      <div className="h-px flex-1 bg-primary" />
                      <span className="text-[9px] font-black uppercase tracking-[0.4em] text-primary">{sec.nombre_seccion}</span>
                      <div className="h-px flex-1 bg-primary" />
                    </div>

                    {lineasSec.map((linea, lineaIdx) => {
                      const tiempo = karaoke.getTiempo(sec.id, lineaIdx);
                      // Índice global de esta línea
                      const globalIdx = lineas.findIndex(l => l.seccionId === sec.id && l.lineaIdx === lineaIdx);
                      const isActiva = globalIdx === lineaActiva;
                      const isPasada = globalIdx < lineaActiva;

                      return (
                        <div
                          key={lineaIdx}
                          ref={isActiva ? activaRef : undefined}
                          onClick={() => {
                            if (!linea.trim()) return;
                            if (karaoke.modoEdit) {
                              karaoke.marcarLinea(sec.id, lineaIdx);
                            } else if (tiempo !== null) {
                              // Click en línea con tiempo → seek a ese punto
                              karaoke.seekTo(tiempo);
                            }
                          }}
                          onContextMenu={e => { e.preventDefault(); if (karaoke.modoEdit) karaoke.borrarLinea(sec.id, lineaIdx); }}
                          className={`group relative flex items-baseline gap-3 py-1.5 px-3 rounded-xl transition-all duration-300 ${
                            !linea.trim()
                              ? "h-3 pointer-events-none"
                              : karaoke.modoEdit
                                ? "cursor-pointer hover:bg-primary/10"
                                : tiempo !== null
                                  ? "cursor-pointer hover:bg-primary/8"
                                  : ""
                          }`}
                        >
                          {/* Tiempo asignado — cliclable fuera de modo edición */}
                          <span
                            className={`shrink-0 font-mono text-[9px] font-black tracking-widest transition-all min-w-[48px] ${
                              tiempo !== null
                                ? isActiva
                                  ? "text-primary"
                                  : isPasada
                                    ? "text-primary/25"
                                    : "text-primary/40"
                                : karaoke.modoEdit && linea.trim()
                                  ? "text-primary/20 group-hover:text-primary/50"
                                  : "text-transparent"
                            }`}
                          >
                            {tiempo !== null ? fmtTime(tiempo) : karaoke.modoEdit ? "──:──" : ""}
                          </span>

                          {/* Texto de la línea */}
                          <span className={`text-2xl md:text-3xl font-medium italic font-serif leading-relaxed transition-all duration-300 ${
                            !linea.trim()
                              ? ""
                              : isActiva
                                ? "text-primary scale-[1.03] origin-left font-bold"
                                : isPasada
                                  ? "text-primary/30"
                                  : "text-primary/60"
                          }`}>
                            {linea || " "}
                          </span>

                          {/* Indicador de línea activa */}
                          {isActiva && linea.trim() && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              <div className="h-40" />
            </div>
          ) : (
            /* ── Vista Lectura Normal ── */
            <div
              className="w-full h-fit p-8 md:p-20 origin-top transition-all duration-300"
              style={{ transform: `scale(${zoom})`, width: `${100 / zoom}%`, marginLeft: `${(100 - 100 / zoom) / 2}%` }}
            >
              {secciones.map(sec => {
                const texto = getLetra(sec, idioma);
                return texto ? (
                  <div key={sec.id} className="mb-20 last:mb-0 max-w-5xl mx-auto text-center">
                    <div className="mb-10 flex items-center justify-center gap-8 opacity-20">
                      <div className="h-px flex-1 max-w-[100px] bg-primary" />
                      <span className="text-sm font-black uppercase tracking-[0.5em] italic text-primary">{sec.nombre_seccion}</span>
                      <div className="h-px flex-1 max-w-[100px] bg-primary" />
                    </div>
                    <p className="text-[var(--foreground)] text-3xl md:text-5xl font-medium italic font-serif leading-[1.5] whitespace-pre-wrap">{texto}</p>
                  </div>
                ) : null;
              })}
              <div className="h-40" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Panel de links ───────────────────────────────────────────────────────────
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
          {/* Lista de links existentes */}
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

          {/* Formulario agregar/editar */}
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

const PanelEditor = ({ cancionId }: { cancionId: string }) => {
  const { cancion, setCancion, loading, isOffline: editorOffline, reload } = useCancionEditor(cancionId);
  const [idiomaA,    setIdiomaA]    = useState<IdiomaKey>("es");
  const [idiomaB,    setIdiomaB]    = useState<IdiomaKey>("en");
  const [splitMode,  setSplitMode]  = useState(false);
  const [addingOpen, setAddingOpen] = useState(false);
  const [addingName, setAddingName] = useState("");
  const [showLector, setShowLector] = useState(false);

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
        />
      )}

      {editorOffline && <BannerOffline color="amber" mensaje="Sin conexión — los cambios se sincronizan al reconectar" />}

      <div className="shrink-0 px-8 pt-7 pb-5 border-b border-primary/10 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl font-black uppercase italic tracking-tight text-primary leading-none truncate">
              {cancion.titulo}
            </h1>
            <div className="flex flex-wrap gap-3 mt-2 text-[10px] font-black uppercase text-primary/40 tracking-widest">
              {cancion.personaje  && <span>👤 {cancion.personaje}</span>}
              {cancion.cantante   && <span>🎤 {cancion.cantante}</span>}
              {cancion.compositor && <span>✏️ {cancion.compositor}</span>}
              {cancion.idioma     && <span>🌐 {cancion.idioma}</span>}
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

        <div className="flex items-center gap-3 flex-wrap">
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
        </div>

        {splitMode && (
          <div className="flex gap-3 text-[9px] font-black uppercase tracking-[0.25em] text-primary/30 px-1">
            <span className="flex-1 text-center">{IDIOMAS.find(i => i.id === idiomaA)?.nombre}</span>
            <span className="w-px" />
            <span className="flex-1 text-center">{IDIOMAS.find(i => i.id === idiomaB)?.nombre}</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-5 space-y-2.5">
        {secciones.map((sec, i) => (
          <SeccionEditor
            key={sec.id}
            sec={sec}
            idiomaA={idiomaA}
            idiomaB={idiomaB}
            splitMode={splitMode}
            onSaveField={handleSaveField}
            onSaveNombre={handleSaveNombre}
            onDelete={handleDelete}
            onMoveUp={() => handleMove(i, "up")}
            onMoveDown={() => handleMove(i, "down")}
            isFirst={i === 0}
            isLast={i === secciones.length - 1}
          />
        ))}

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
      </div>

      {/* Panel de links al fondo */}
      <PanelLinks
        cancionId={cancionId}
        links={cancion.links || []}
        onLinksChange={(newLinks) =>
          setCancion(prev => prev ? { ...prev, links: newLinks } : prev)
        }
      />
    </div>
  );
};

export default function EstudioLetras() {
  const { canciones, setCanciones, loading: loadingLista, isOffline: listaOffline, refetch } = useCanciones();
  const [lastId, setLastId] = useLastOpenedId("estudio-letras-last-id");
  const [selectedId, _setSelectedId] = useState<string | null>(lastId);

  // Wrapper: persistir al cambiar
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
      {/* Nueva canción + filtros van en headerExtra, la lista va acá */}
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