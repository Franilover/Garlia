"use client";

/**
 * LyricStudio v2
 * ─ Sidebar colapsable con búsqueda + filtros completos
 * ─ Vista simple (1 idioma) o vista dividida (2 idiomas en paralelo)
 * ─ Auto-save por sección, Ctrl+S manual
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Search, X, ChevronDown, Plus, Trash2, Save, GripVertical,
  Check, Loader2, Eye, EyeOff, Music, RefreshCw,
  ChevronUp, BookOpen, Layers, SlidersHorizontal,
  CheckCircle2, AlertCircle, PanelLeftClose, PanelLeftOpen,
  Columns2,
} from "lucide-react";
import { cancionesQueries } from "@/lib/api/queries/wiki/canciones";

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

type Seccion = {
  id: string;
  cancion_id: string;
  nombre_seccion: string;
  letra_es: string;
  letra_en?: string;
  letra_jp?: string;
  letra_romaji?: string;
  orden: number;
};

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
  secciones?: Seccion[];
};

type IdiomaKey = "es" | "en" | "jp" | "romaji";

type Filtros = {
  estado: string;
  visible: "" | "true" | "false";
  idioma: string;
  cantante: string;
  compositor: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

const IDIOMAS: { id: IdiomaKey; label: string; nombre: string; campo: keyof Seccion }[] = [
  { id: "es",     label: "ES", nombre: "Español",  campo: "letra_es" },
  { id: "en",     label: "EN", nombre: "Inglés",   campo: "letra_en" },
  { id: "jp",     label: "JP", nombre: "Japonés",  campo: "letra_jp" },
  { id: "romaji", label: "RO", nombre: "Romaji",   campo: "letra_romaji" },
];

const ESTADOS = ["BORRADOR", "EN PROCESO", "TERMINADA"] as const;

const ESTADO_COLOR: Record<string, string> = {
  TERMINADA:    "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "EN PROCESO": "bg-amber-500/20  text-amber-400  border-amber-500/30",
  BORRADOR:     "bg-primary/10    text-primary/50  border-primary/20",
};

const FILTROS_VACIOS: Filtros = {
  estado: "", visible: "", idioma: "", cantante: "", compositor: "",
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────────────────────────────────────

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function unique(arr: string[]): string[] {
  return Array.from(new Set(arr.filter(Boolean).map(s => s.trim()))).sort();
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK: lista de canciones
// ─────────────────────────────────────────────────────────────────────────────

function useCanciones() {
  const [canciones, setCanciones] = useState<Cancion[]>([]);
  const [loading, setLoading]     = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await cancionesQueries.getAll({ isAdmin: true });
      setCanciones(data as Cancion[]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  return { canciones, loading, refetch: load };
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK: canción con secciones
// ─────────────────────────────────────────────────────────────────────────────

function useCancionEditor(id: string | null) {
  const [cancion,  setCancion]  = useState<Cancion | null>(null);
  const [loading,  setLoading]  = useState(false);

  const load = useCallback(async (cancionId: string) => {
    setLoading(true);
    try {
      const data = await cancionesQueries.getById(cancionId);
      setCancion(data as Cancion);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (id) load(id);
    else setCancion(null);
  }, [id, load]);

  return { cancion, setCancion, loading, reload: () => id && load(id) };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: Chip
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: tabs de idioma
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: SIDEBAR item
// ─────────────────────────────────────────────────────────────────────────────

const SidebarItem = ({
  cancion, selected, onClick,
}: { cancion: Cancion; selected: boolean; onClick: () => void }) => (
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
);

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: textarea de una sección para un idioma
// ─────────────────────────────────────────────────────────────────────────────

type ColState = { dirty: boolean; saving: boolean; saved: boolean; error: string | null };

const SeccionTextarea = ({
  sec, idioma, onSave,
}: {
  sec: Seccion;
  idioma: IdiomaKey;
  onSave: (id: string, updates: Partial<Seccion>) => Promise<void>;
}) => {
  const campo = IDIOMAS.find(i => i.id === idioma)!.campo;
  const [texto, setTexto] = useState((sec[campo] as string) || "");
  const [st, setSt]       = useState<ColState>({ dirty: false, saving: false, saved: false, error: null });
  const timer             = useRef<any>(null);

  useEffect(() => {
    setTexto((sec[campo] as string) || "");
    setSt(s => ({ ...s, dirty: false, saved: false }));
  }, [idioma, sec.id, campo]);

  const doSave = useCallback(async (val: string) => {
    clearTimeout(timer.current);
    setSt(s => ({ ...s, saving: true, error: null }));
    try {
      await onSave(sec.id, { [campo]: val });
      setSt({ dirty: false, saving: false, saved: true, error: null });
      setTimeout(() => setSt(s => ({ ...s, saved: false })), 2000);
    } catch (e: any) {
      setSt(s => ({ ...s, saving: false, error: e.message }));
    }
  }, [sec.id, campo, onSave]);

  const onChange = (val: string) => {
    setTexto(val);
    setSt(s => ({ ...s, dirty: true, saved: false }));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => doSave(val), 2000);
  };

  const rows = Math.max(3, texto.split("\n").length + 1);

  return (
    <div className="relative flex-1 min-w-0">
      <textarea
        value={texto}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); doSave(texto); } }}
        rows={rows}
        spellCheck={false}
        className={`w-full bg-bg-main/60 border rounded-xl px-4 py-3 text-sm text-primary font-mono resize-none outline-none transition-colors placeholder:text-primary/20 leading-relaxed ${
          st.dirty ? "border-amber-500/40 focus:border-amber-500/60" : "border-primary/10 focus:border-primary/30"
        }`}
        placeholder={`Letra ${IDIOMAS.find(i => i.id === idioma)?.nombre}…`}
      />
      <span className="absolute top-2 right-2 pointer-events-none">
        {st.saving && <Loader2 size={11} className="animate-spin text-primary/30" />}
        {st.saved  && <CheckCircle2 size={11} className="text-emerald-400" />}
        {st.error  && <AlertCircle  size={11} className="text-red-400" />}
      </span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: editor de una sección
// ─────────────────────────────────────────────────────────────────────────────

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

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar sección "${nombre}"?`)) return;
    await onDelete(sec.id);
  };

  return (
    <div className="border border-primary/10 rounded-xl bg-bg-main/50 hover:border-primary/20 transition-all">
      {/* Header */}
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
          <button onClick={handleDelete} className="p-1 rounded-lg hover:bg-red-500/10 text-primary/20 hover:text-red-400 transition-all"><Trash2 size={12} /></button>
          <button onClick={() => setExpanded(e => !e)} className="p-1 rounded-lg hover:bg-primary/10 text-primary/25 hover:text-primary transition-all">
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {/* Body */}
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
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: panel de filtros
// ─────────────────────────────────────────────────────────────────────────────

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
      {/* Estado */}
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

      {/* Visibilidad */}
      <div>
        <p className="text-[9px] font-black uppercase text-primary/30 tracking-widest mb-2">Visibilidad</p>
        <div className="flex gap-1">
          <Chip active={filtros.visible === "true"}  onClick={() => toggle("visible", "true")}>Visible</Chip>
          <Chip active={filtros.visible === "false"} onClick={() => toggle("visible", "false")}>Oculta</Chip>
        </div>
      </div>

      {/* Idioma */}
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

      {/* Cantante */}
      {opciones.cantantes.length > 0 && (
        <div>
          <p className="text-[9px] font-black uppercase text-primary/30 tracking-widest mb-2">Cantante</p>
          <div className="flex gap-1 flex-wrap">
            {opciones.cantantes.map(c => (
              <Chip key={c} active={filtros.cantante === c} onClick={() => toggle("cantante", c)}>{c}</Chip>
            ))}
          </div>
        </div>
      )}

      {/* Compositor */}
      {opciones.compositores.length > 0 && (
        <div>
          <p className="text-[9px] font-black uppercase text-primary/30 tracking-widest mb-2">Compositor</p>
          <div className="flex gap-1 flex-wrap">
            {opciones.compositores.map(c => (
              <Chip key={c} active={filtros.compositor === c} onClick={() => toggle("compositor", c)}>{c}</Chip>
            ))}
          </div>
        </div>
      )}

      {/* Limpiar */}
      {Object.values(filtros).some(Boolean) && (
        <button
          onClick={() => onChange(FILTROS_VACIOS)}
          className="text-[9px] font-black uppercase text-red-400 hover:text-red-300 tracking-widest"
        >
          ✕ Limpiar todos los filtros
        </button>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: panel principal del editor
// ─────────────────────────────────────────────────────────────────────────────

const PanelEditor = ({ cancionId }: { cancionId: string }) => {
  const { cancion, setCancion, loading, reload } = useCancionEditor(cancionId);
  const [idiomaA,    setIdiomaA]    = useState<IdiomaKey>("es");
  const [idiomaB,    setIdiomaB]    = useState<IdiomaKey>("en");
  const [splitMode,  setSplitMode]  = useState(false);
  const [addingOpen, setAddingOpen] = useState(false);
  const [addingName, setAddingName] = useState("");

  // ── CRUD ────────────────────────────────────────────────────────────────────

  const handleSaveField = useCallback(async (id: string, updates: Partial<Seccion>) => {
    await cancionesQueries.secciones.update(id, updates as any);
    setCancion(prev => prev
      ? { ...prev, secciones: prev.secciones?.map(s => s.id === id ? { ...s, ...updates } : s) }
      : prev);
  }, [setCancion]);

  const handleSaveNombre = useCallback(async (id: string, nombre: string) => {
    await cancionesQueries.secciones.update(id, { nombre_seccion: nombre } as any);
    setCancion(prev => prev
      ? { ...prev, secciones: prev.secciones?.map(s => s.id === id ? { ...s, nombre_seccion: nombre } : s) }
      : prev);
  }, [setCancion]);

  const handleDelete = useCallback(async (id: string) => {
    await cancionesQueries.secciones.delete(id);
    setCancion(prev => prev
      ? { ...prev, secciones: prev.secciones?.filter(s => s.id !== id) }
      : prev);
  }, [setCancion]);

  const handleAdd = async () => {
    if (!addingName.trim()) return;
    const secciones = cancion?.secciones || [];
    const nueva = await cancionesQueries.secciones.create({
      cancion_id: cancionId,
      nombre_seccion: addingName.trim().toUpperCase(),
      letra_es: "",
      orden: secciones.length,
    });
    setCancion(prev => prev
      ? { ...prev, secciones: [...(prev.secciones || []), nueva as Seccion] }
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
    await cancionesQueries.secciones.reorder(reordenadas.map(s => ({ id: s.id, orden: s.orden })));
  };

  // Cambio de idioma con guard anti-colisión
  const changeIdiomaA = (v: IdiomaKey) => {
    setIdiomaA(v);
    if (splitMode && v === idiomaB) setIdiomaB(IDIOMAS.find(i => i.id !== v)!.id);
  };
  const changeIdiomaB = (v: IdiomaKey) => {
    setIdiomaB(v);
    if (v === idiomaA) setIdiomaA(IDIOMAS.find(i => i.id !== v)!.id);
  };

  // Progreso
  const secciones = cancion?.secciones || [];
  const campoA    = IDIOMAS.find(i => i.id === idiomaA)!.campo;
  const conLetra  = secciones.filter(s => !!(s[campoA] as string)?.trim()).length;
  const pct       = secciones.length ? Math.round((conLetra / secciones.length) * 100) : 0;

  // ── RENDER ──────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex-1 flex items-center justify-center text-primary/30">
      <Loader2 className="animate-spin" size={28} />
    </div>
  );
  if (!cancion) return null;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

      {/* Cabecera */}
      <div className="shrink-0 px-8 pt-7 pb-5 border-b border-primary/10 space-y-4">
        {/* Título + badges */}
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
            <button onClick={reload as any} className="p-2 rounded-lg hover:bg-primary/10 text-primary/30 hover:text-primary transition-all">
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* Controles idioma + split */}
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
            <Columns2 size={13} />
            Vista dividida
          </button>

          {splitMode && (
            <IdiomaTab value={idiomaB} onChange={changeIdiomaB} exclude={idiomaA} />
          )}

          {/* Progreso */}
          <div className="ml-auto flex items-center gap-2 text-[10px] font-black uppercase text-primary/35 tracking-widest">
            <span>{conLetra}/{secciones.length}</span>
            <div className="w-20 h-1.5 rounded-full bg-primary/10 overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <span>{pct}%</span>
          </div>
        </div>

        {/* Labels columnas split */}
        {splitMode && (
          <div className="flex gap-3 text-[9px] font-black uppercase tracking-[0.25em] text-primary/30 px-1">
            <span className="flex-1 text-center">{IDIOMAS.find(i => i.id === idiomaA)?.nombre}</span>
            <span className="w-px" />
            <span className="flex-1 text-center">{IDIOMAS.find(i => i.id === idiomaB)?.nombre}</span>
          </div>
        )}
      </div>

      {/* Secciones */}
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
            <p className="text-xs font-black uppercase tracking-widest">No hay secciones aún</p>
          </div>
        )}

        {/* Añadir sección */}
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
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function LyricStudio() {
  const { canciones, loading: loadingLista, refetch } = useCanciones();
  const [selectedId,  setSelectedId]  = useState<string | null>(null);
  const [busqueda,    setBusqueda]    = useState("");
  const [filtros,     setFiltros]     = useState<Filtros>(FILTROS_VACIOS);
  const [showFiltros, setShowFiltros] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Opciones dinámicas
  const opciones = useMemo(() => ({
    idiomas:      unique(canciones.map(c => c.idioma     || "")),
    cantantes:    unique(canciones.map(c => c.cantante   || "")),
    compositores: unique(canciones.map(c => c.compositor || "")),
  }), [canciones]);

  // Filtrado
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

  return (
    <div className="flex h-screen bg-bg-main overflow-hidden">

      {/* ════ SIDEBAR COLAPSADA (tab) ════ */}
      {!sidebarOpen && (
        <div className="shrink-0 w-10 flex flex-col items-center pt-6 gap-4 border-r border-primary/10 bg-bg-main">
          <button
            onClick={() => setSidebarOpen(true)}
            title="Abrir sidebar"
            className="p-2 rounded-xl hover:bg-primary/10 text-primary/30 hover:text-primary transition-all"
          >
            <PanelLeftOpen size={16} />
          </button>
          <span
            className="text-[9px] font-black uppercase text-primary/15 tracking-[0.25em] select-none"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            Canciones
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
                <Music size={12} /> Lyric Studio
              </h2>
              <div className="flex items-center gap-1">
                <button onClick={refetch} title="Recargar" className="p-1.5 rounded-lg hover:bg-primary/10 text-primary/30 hover:text-primary transition-all">
                  <RefreshCw size={12} />
                </button>
                <button onClick={() => setSidebarOpen(false)} title="Cerrar sidebar" className="p-1.5 rounded-lg hover:bg-primary/10 text-primary/30 hover:text-primary transition-all">
                  <PanelLeftClose size={14} />
                </button>
              </div>
            </div>

            {/* Buscador */}
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/30" />
              <input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Título, cantante, compositor…"
                className="w-full bg-primary/5 border border-primary/10 rounded-xl pl-9 pr-9 py-2.5 text-xs font-medium text-primary outline-none focus:border-primary/30 placeholder:text-primary/25 transition-colors"
              />
              {busqueda && (
                <button onClick={() => setBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/30 hover:text-primary">
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Toggle filtros */}
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
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
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
                    <SidebarItem key={c.id} cancion={c} selected={selectedId === c.id} onClick={() => setSelectedId(c.id)} />
                  ))}
                </div>
              ))
            ) : (
              filtradas.map(c => (
                <SidebarItem key={c.id} cancion={c} selected={selectedId === c.id} onClick={() => setSelectedId(c.id)} />
              ))
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 px-5 py-3 border-t border-primary/10 text-[9px] font-black uppercase text-primary/20 tracking-widest flex justify-between">
            <span>{canciones.length} canciones</span>
            <span>{filtradas.length} mostradas</span>
          </div>
        </aside>
      )}

      {/* ════ PANEL PRINCIPAL ════ */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0">
        {selectedId ? (
          <PanelEditor key={selectedId} cancionId={selectedId} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 text-primary/20 select-none">
            <div className="p-8 rounded-3xl border-2 border-dashed border-primary/10">
              <BookOpen size={52} strokeWidth={1} />
            </div>
            <div className="text-center">
              <p className="text-sm font-black uppercase tracking-[0.3em]">Lyric Studio</p>
              <p className="text-xs mt-1 tracking-widest opacity-60">Selecciona una canción del sidebar</p>
            </div>
          </div>
        )}
      </main>

    </div>
  );
}