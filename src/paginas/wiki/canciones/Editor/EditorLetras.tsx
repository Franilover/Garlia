"use client";

/**
 * LyricStudio — Editor privado de letras de canciones
 *
 * Layout: sidebar fija (búsqueda + filtros + lista) | panel principal (editor de secciones)
 * Ruta sugerida: /admin/lyric-studio  o  /estudio/letras
 */

import React, {
  useState, useEffect, useCallback, useRef, useReducer,
} from "react";
import {
  Search, X, ChevronDown, Plus, Trash2, Save, GripVertical,
  Check, Loader2, Eye, EyeOff, Music, RefreshCw, Pencil,
  ChevronUp, ArrowUpDown, BookOpen, Layers, SlidersHorizontal,
  CheckCircle2, Circle, AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
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

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

const IDIOMAS: { id: IdiomaKey; label: string; campo: keyof Seccion }[] = [
  { id: "es",     label: "ES",  campo: "letra_es" },
  { id: "en",     label: "EN",  campo: "letra_en" },
  { id: "jp",     label: "JP",  campo: "letra_jp" },
  { id: "romaji", label: "RO",  campo: "letra_romaji" },
];

const ESTADOS = ["BORRADOR", "EN PROCESO", "TERMINADA"] as const;

const ESTADO_COLOR: Record<string, string> = {
  TERMINADA:    "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "EN PROCESO": "bg-amber-500/20  text-amber-400  border-amber-500/30",
  BORRADOR:     "bg-primary/10    text-primary/50  border-primary/20",
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────────────────────────────────────

const uid = () => `tmp-${Math.random().toString(36).slice(2, 9)}`;

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK: lista de canciones (sin secciones, para el sidebar)
// ─────────────────────────────────────────────────────────────────────────────

function useCanciones() {
  const [canciones, setCanciones] = useState<Cancion[]>([]);
  const [loading, setLoading]     = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await cancionesQueries.getAll({ isAdmin: true });
      setCanciones(data as Cancion[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { canciones, loading, refetch: fetch };
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK: canción con secciones (para el panel)
// ─────────────────────────────────────────────────────────────────────────────

function useCancionEditor(id: string | null) {
  const [cancion,  setCancion]  = useState<Cancion | null>(null);
  const [loading,  setLoading]  = useState(false);

  const load = useCallback(async (cancionId: string) => {
    setLoading(true);
    try {
      const data = await cancionesQueries.getById(cancionId);
      setCancion(data as Cancion);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) load(id);
    else setCancion(null);
  }, [id, load]);

  return { cancion, setCancion, loading, reload: () => id && load(id) };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: SIDEBAR — item de canción
// ─────────────────────────────────────────────────────────────────────────────

const SidebarItem = ({
  cancion, selected, onClick,
}: { cancion: Cancion; selected: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-4 py-3 rounded-xl transition-all group border ${
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
// COMPONENTE: FILTROS SIDEBAR
// ─────────────────────────────────────────────────────────────────────────────

const FiltroEstado = ({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) => (
  <div className="flex gap-1 flex-wrap">
    {(["", ...ESTADOS] as const).map((e) => (
      <button
        key={e}
        onClick={() => onChange(e)}
        className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full border transition-all ${
          value === e
            ? "bg-primary text-bg-main border-primary"
            : "border-primary/20 text-primary/50 hover:border-primary/40"
        }`}
      >
        {e === "" ? "Todas" : e === "EN PROCESO" ? "WIP" : e}
      </button>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: EDITOR DE UNA SECCIÓN
// ─────────────────────────────────────────────────────────────────────────────

type SeccionEditorState = {
  dirty: boolean;
  saving: boolean;
  saved: boolean;
  error: string | null;
};

const SeccionEditor = ({
  sec,
  idiomaActivo,
  onSave,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  sec: Seccion;
  idiomaActivo: IdiomaKey;
  onSave: (id: string, updates: Partial<Seccion>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) => {
  const campo = IDIOMAS.find(i => i.id === idiomaActivo)!.campo;
  const [nombre, setNombre]   = useState(sec.nombre_seccion);
  const [texto, setTexto]     = useState((sec[campo] as string) || "");
  const [state, setState]     = useState<SeccionEditorState>({ dirty: false, saving: false, saved: false, error: null });
  const [expanded, setExpanded] = useState(true);
  const saveTimer = useRef<any>(null);

  // Sincronizar cuando cambia el idioma o la sección
  useEffect(() => {
    setTexto((sec[campo] as string) || "");
    setState(s => ({ ...s, dirty: false, saved: false }));
  }, [idiomaActivo, sec.id, campo]);

  const markDirty = (val: string) => {
    setTexto(val);
    setState(s => ({ ...s, dirty: true, saved: false }));
    // Auto-save a los 2s sin escribir
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => handleSave(val, nombre), 2000);
  };

  const handleSave = async (currentTexto = texto, currentNombre = nombre) => {
    clearTimeout(saveTimer.current);
    setState(s => ({ ...s, saving: true, error: null }));
    try {
      await onSave(sec.id, {
        nombre_seccion: currentNombre,
        [campo]: currentTexto,
      });
      setState({ dirty: false, saving: false, saved: true, error: null });
      setTimeout(() => setState(s => ({ ...s, saved: false })), 2000);
    } catch (e: any) {
      setState(s => ({ ...s, saving: false, error: e.message }));
    }
  };

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar sección "${nombre}"?`)) return;
    await onDelete(sec.id);
  };

  return (
    <div className={`border rounded-xl transition-all ${
      state.dirty ? "border-amber-500/40 bg-amber-500/5" : "border-primary/10 bg-bg-main/50"
    }`}>
      {/* HEADER SECCIÓN */}
      <div className="flex items-center gap-2 px-4 py-3">
        {/* Drag handle (decorativo) */}
        <GripVertical size={14} className="text-primary/20 shrink-0" />

        {/* Nombre */}
        <input
          value={nombre}
          onChange={e => { setNombre(e.target.value); setState(s => ({ ...s, dirty: true })); }}
          onBlur={() => state.dirty && handleSave()}
          className="flex-1 bg-transparent text-xs font-black uppercase text-primary outline-none tracking-widest placeholder:text-primary/20"
          placeholder="NOMBRE DE SECCIÓN..."
        />

        {/* Indicador estado */}
        <span className="shrink-0">
          {state.saving && <Loader2 size={13} className="animate-spin text-primary/40" />}
          {state.saved  && <CheckCircle2 size={13} className="text-emerald-400" />}
          {state.error  && <AlertCircle size={13} className="text-red-400" />}
        </span>

        {/* Acciones */}
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onMoveUp} disabled={isFirst} className="p-1 rounded-lg hover:bg-primary/10 text-primary/30 hover:text-primary disabled:opacity-20 transition-all">
            <ChevronUp size={13} />
          </button>
          <button onClick={onMoveDown} disabled={isLast} className="p-1 rounded-lg hover:bg-primary/10 text-primary/30 hover:text-primary disabled:opacity-20 transition-all">
            <ChevronDown size={13} />
          </button>
          <button
            onClick={() => handleSave()}
            disabled={!state.dirty || state.saving}
            className="p-1 rounded-lg hover:bg-primary/10 text-primary/30 hover:text-primary disabled:opacity-20 transition-all"
          >
            <Save size={13} />
          </button>
          <button onClick={handleDelete} className="p-1 rounded-lg hover:bg-red-500/10 text-primary/20 hover:text-red-400 transition-all">
            <Trash2 size={13} />
          </button>
          <button onClick={() => setExpanded(e => !e)} className="p-1 rounded-lg hover:bg-primary/10 text-primary/30 hover:text-primary transition-all">
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* TEXTAREA */}
      {expanded && (
        <div className="px-4 pb-4">
          <textarea
            value={texto}
            onChange={e => markDirty(e.target.value)}
            onKeyDown={e => {
              // Ctrl/Cmd+S para guardar manualmente
              if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                handleSave();
              }
            }}
            rows={Math.max(3, texto.split("\n").length + 1)}
            className="w-full bg-bg-main/60 border border-primary/10 rounded-xl px-4 py-3 text-sm text-primary font-mono resize-none outline-none focus:border-primary/30 transition-colors placeholder:text-primary/20 leading-relaxed"
            placeholder={`Letra en ${IDIOMAS.find(i => i.id === idiomaActivo)?.label}…`}
            spellCheck={false}
          />
          {state.error && (
            <p className="text-xs text-red-400 mt-1 ml-1">Error: {state.error}</p>
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: PANEL PRINCIPAL — editor de secciones de una canción
// ─────────────────────────────────────────────────────────────────────────────

const PanelEditor = ({
  cancionId,
}: { cancionId: string }) => {
  const { cancion, setCancion, loading, reload } = useCancionEditor(cancionId);
  const [idiomaActivo, setIdiomaActivo] = useState<IdiomaKey>("es");
  const [addingNombre, setAddingNombre] = useState("");
  const [addingOpen, setAddingOpen]     = useState(false);

  // ── CRUD secciones ──────────────────────────────────────────────────────────

  const handleSaveSeccion = async (id: string, updates: Partial<Seccion>) => {
    await cancionesQueries.secciones.update(id, updates as any);
    setCancion(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        secciones: prev.secciones?.map(s => s.id === id ? { ...s, ...updates } : s),
      };
    });
  };

  const handleDeleteSeccion = async (id: string) => {
    await cancionesQueries.secciones.delete(id);
    setCancion(prev => {
      if (!prev) return prev;
      return { ...prev, secciones: prev.secciones?.filter(s => s.id !== id) };
    });
  };

  const handleAddSeccion = async () => {
    if (!addingNombre.trim()) return;
    const secciones = cancion?.secciones || [];
    const nueva = await cancionesQueries.secciones.create({
      cancion_id: cancionId,
      nombre_seccion: addingNombre.trim().toUpperCase(),
      letra_es: "",
      orden: secciones.length,
    });
    setCancion(prev => {
      if (!prev) return prev;
      return { ...prev, secciones: [...(prev.secciones || []), nueva as Seccion] };
    });
    setAddingNombre("");
    setAddingOpen(false);
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const secciones = [...(cancion?.secciones || [])];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= secciones.length) return;
    [secciones[index], secciones[target]] = [secciones[target], secciones[index]];
    const reordenadas = secciones.map((s, i) => ({ ...s, orden: i }));
    setCancion(prev => prev ? { ...prev, secciones: reordenadas } : prev);
    await cancionesQueries.secciones.reorder(reordenadas.map(s => ({ id: s.id, orden: s.orden })));
  };

  // ── Conteo de progreso ──────────────────────────────────────────────────────

  const campo = IDIOMAS.find(i => i.id === idiomaActivo)!.campo;
  const secciones = cancion?.secciones || [];
  const conLetra = secciones.filter(s => !!(s[campo] as string)?.trim()).length;
  const pct = secciones.length ? Math.round((conLetra / secciones.length) * 100) : 0;

  // ── RENDER ──────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex-1 flex items-center justify-center text-primary/30">
      <Loader2 className="animate-spin" size={28} />
    </div>
  );

  if (!cancion) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-primary/30 select-none">
      <BookOpen size={48} strokeWidth={1} />
      <p className="text-sm font-black uppercase tracking-widest">Selecciona una canción</p>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* ── CABECERA DEL PANEL ── */}
      <div className="shrink-0 px-8 pt-8 pb-6 border-b border-primary/10 space-y-5">
        {/* Título + meta */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tight text-primary leading-none">
              {cancion.titulo}
            </h1>
            <div className="flex flex-wrap gap-3 mt-2 text-[10px] font-black uppercase text-primary/40 tracking-widest">
              {cancion.personaje  && <span>👤 {cancion.personaje}</span>}
              {cancion.cantante   && <span>🎤 {cancion.cantante}</span>}
              {cancion.compositor && <span>✏️ {cancion.compositor}</span>}
              {cancion.idioma     && <span>🌐 {cancion.idioma}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full border ${ESTADO_COLOR[cancion.estado]}`}>
              {cancion.estado}
            </span>
            <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full border ${
              cancion.visible
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : "bg-primary/10 text-primary/40 border-primary/20"
            }`}>
              {cancion.visible ? <Eye size={11} className="inline mr-1" /> : <EyeOff size={11} className="inline mr-1" />}
              {cancion.visible ? "Visible" : "Oculta"}
            </span>
            <button onClick={reload as any} className="p-2 rounded-lg hover:bg-primary/10 text-primary/30 hover:text-primary transition-all">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Selector de idioma + progreso */}
        <div className="flex items-center justify-between gap-4">
          {/* Pestañas idioma */}
          <div className="flex gap-1 p-1 bg-primary/5 rounded-xl border border-primary/10">
            {IDIOMAS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setIdiomaActivo(id)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  idiomaActivo === id
                    ? "bg-primary text-bg-main shadow-md shadow-primary/20"
                    : "text-primary/40 hover:text-primary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Barra de progreso */}
          <div className="flex items-center gap-3 text-[10px] font-black uppercase text-primary/40 tracking-widest">
            <span>{conLetra}/{secciones.length} secciones</span>
            <div className="w-24 h-1.5 rounded-full bg-primary/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span>{pct}%</span>
          </div>
        </div>
      </div>

      {/* ── LISTA DE SECCIONES ── */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-3">
        {secciones.map((sec, i) => (
          <SeccionEditor
            key={sec.id}
            sec={sec}
            idiomaActivo={idiomaActivo}
            onSave={handleSaveSeccion}
            onDelete={handleDeleteSeccion}
            onMoveUp={() => handleMove(i, "up")}
            onMoveDown={() => handleMove(i, "down")}
            isFirst={i === 0}
            isLast={i === secciones.length - 1}
          />
        ))}

        {secciones.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-primary/30">
            <Layers size={40} strokeWidth={1} />
            <p className="text-xs font-black uppercase tracking-widest">No hay secciones aún</p>
          </div>
        )}

        {/* ── AÑADIR SECCIÓN ── */}
        {addingOpen ? (
          <div className="flex gap-2 pt-2">
            <input
              autoFocus
              value={addingNombre}
              onChange={e => setAddingNombre(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") handleAddSeccion();
                if (e.key === "Escape") setAddingOpen(false);
              }}
              className="flex-1 bg-bg-main border border-primary/20 rounded-xl px-4 py-3 text-xs font-black uppercase text-primary outline-none focus:border-primary/50 tracking-widest placeholder:text-primary/20"
              placeholder="Ej: CORO, VERSO 1, PUENTE…"
            />
            <button
              onClick={handleAddSeccion}
              className="bg-primary text-bg-main px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
            >
              <Check size={15} />
            </button>
            <button
              onClick={() => setAddingOpen(false)}
              className="px-4 py-3 rounded-xl border border-primary/20 text-primary/40 hover:text-primary hover:border-primary/40 transition-all"
            >
              <X size={15} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-primary/20 text-[10px] font-black uppercase text-primary/30 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all tracking-widest"
          >
            <Plus size={14} /> Añadir Sección
          </button>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL — LyricStudio
// ─────────────────────────────────────────────────────────────────────────────

export default function LyricStudio() {
  const { canciones, loading: loadingLista, refetch } = useCanciones();
  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [busqueda,     setBusqueda]     = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroVisible,setFiltroVisible]= useState<"" | "true" | "false">("");
  const [showFiltros,  setShowFiltros]  = useState(false);

  // ── Filtrado local (instantáneo) ────────────────────────────────────────────

  const filtradas = canciones.filter(c => {
    const matchBusqueda = !busqueda ||
      normalize(c.titulo).includes(normalize(busqueda)) ||
      normalize(c.personaje || "").includes(normalize(busqueda)) ||
      normalize(c.cantante  || "").includes(normalize(busqueda));
    const matchEstado   = !filtroEstado   || c.estado === filtroEstado;
    const matchVisible  = !filtroVisible  || String(c.visible) === filtroVisible;
    return matchBusqueda && matchEstado && matchVisible;
  });

  // Agrupar por estado para la sidebar
  const grupos = ESTADOS.map(est => ({
    estado: est,
    items: filtradas.filter(c => c.estado === est),
  })).filter(g => g.items.length > 0);

  // Si la búsqueda es activa, mostrar lista plana
  const usarGrupos = !busqueda && !filtroEstado;

  // ── RENDER ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-bg-main overflow-hidden">
      {/* ══════════════════════════════ SIDEBAR ══════════════════════════════ */}
      <aside className="w-72 shrink-0 flex flex-col border-r border-primary/10 bg-bg-main">
        {/* Header sidebar */}
        <div className="px-5 pt-6 pb-4 border-b border-primary/10 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-primary/50 flex items-center gap-2">
              <Music size={12} /> Lyric Studio
            </h2>
            <button
              onClick={refetch}
              className="p-1.5 rounded-lg hover:bg-primary/10 text-primary/30 hover:text-primary transition-all"
            >
              <RefreshCw size={12} />
            </button>
          </div>

          {/* Buscador */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/30" />
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar canción…"
              className="w-full bg-primary/5 border border-primary/10 rounded-xl pl-9 pr-9 py-2.5 text-xs font-medium text-primary outline-none focus:border-primary/30 placeholder:text-primary/30 transition-colors"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/30 hover:text-primary"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Toggle filtros */}
          <button
            onClick={() => setShowFiltros(f => !f)}
            className={`mt-3 w-full flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
              filtroEstado || filtroVisible
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-primary/10 text-primary/30 hover:text-primary hover:border-primary/20"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <SlidersHorizontal size={11} /> Filtros
              {(filtroEstado || filtroVisible) && (
                <span className="ml-1 bg-primary text-bg-main rounded-full w-4 h-4 text-[8px] flex items-center justify-center">
                  {(filtroEstado ? 1 : 0) + (filtroVisible ? 1 : 0)}
                </span>
              )}
            </span>
            <ChevronDown size={11} className={`transition-transform ${showFiltros ? "rotate-180" : ""}`} />
          </button>

          {showFiltros && (
            <div className="mt-3 space-y-3 p-3 bg-primary/5 rounded-xl border border-primary/10">
              <div>
                <p className="text-[9px] font-black uppercase text-primary/30 tracking-widest mb-2">Estado</p>
                <FiltroEstado value={filtroEstado} onChange={setFiltroEstado} />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase text-primary/30 tracking-widest mb-2">Visibilidad</p>
                <div className="flex gap-1">
                  {([["", "Todas"], ["true", "Visible"], ["false", "Oculta"]] as const).map(([v, l]) => (
                    <button
                      key={v}
                      onClick={() => setFiltroVisible(v)}
                      className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full border transition-all ${
                        filtroVisible === v
                          ? "bg-primary text-bg-main border-primary"
                          : "border-primary/20 text-primary/40 hover:border-primary/40"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              {(filtroEstado || filtroVisible) && (
                <button
                  onClick={() => { setFiltroEstado(""); setFiltroVisible(""); }}
                  className="text-[9px] font-black uppercase text-red-400 hover:text-red-500 tracking-widest"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          )}
        </div>

        {/* Lista de canciones */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {loadingLista ? (
            <div className="flex items-center justify-center py-12 text-primary/30">
              <Loader2 className="animate-spin" size={20} />
            </div>
          ) : filtradas.length === 0 ? (
            <div className="text-center py-10 text-primary/30">
              <p className="text-xs font-black uppercase tracking-widest">Sin resultados</p>
            </div>
          ) : usarGrupos ? (
            // Vista agrupada por estado
            grupos.map(({ estado, items }) => (
              <div key={estado} className="mb-4">
                <p className={`text-[9px] font-black uppercase tracking-[0.3em] px-4 py-2 ${
                  ESTADO_COLOR[estado].split(" ")[1]
                }`}>
                  {estado} ({items.length})
                </p>
                {items.map(c => (
                  <SidebarItem
                    key={c.id}
                    cancion={c}
                    selected={selectedId === c.id}
                    onClick={() => setSelectedId(c.id)}
                  />
                ))}
              </div>
            ))
          ) : (
            // Vista plana (búsqueda activa o filtro aplicado)
            filtradas.map(c => (
              <SidebarItem
                key={c.id}
                cancion={c}
                selected={selectedId === c.id}
                onClick={() => setSelectedId(c.id)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-3 border-t border-primary/10 text-[9px] font-black uppercase text-primary/20 tracking-widest flex justify-between">
          <span>{canciones.length} canciones</span>
          <span>{filtradas.length} mostradas</span>
        </div>
      </aside>

      {/* ══════════════════════════════ PANEL ════════════════════════════════ */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0">
        {selectedId
          ? <PanelEditor key={selectedId} cancionId={selectedId} />
          : (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 text-primary/20 select-none">
              <div className="p-8 rounded-3xl border-2 border-dashed border-primary/10">
                <BookOpen size={56} strokeWidth={1} />
              </div>
              <div className="text-center">
                <p className="text-sm font-black uppercase tracking-[0.3em]">Lyric Studio</p>
                <p className="text-xs mt-1 tracking-widest">Selecciona una canción para editar sus secciones</p>
              </div>
            </div>
          )
        }
      </main>
    </div>
  );
}