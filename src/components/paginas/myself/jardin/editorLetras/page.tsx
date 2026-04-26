"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Music, Plus, SlidersHorizontal, ChevronDown, BookOpen,
  Loader2, Eye, EyeOff, X, ArrowLeft,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { normalize, unique } from "@/components/templates/EstudioTemplates";
import { useLastOpenedId } from "@/hooks/useEditorShared";

import { useCanciones } from "./hooks/useCanciones";
import { ESTADOS, ESTADO_COLOR, FILTROS_VACIOS } from "./constants";
import { SidebarItem } from "./components/sidebar/SidebarItem";
import { PanelFiltros } from "./components/sidebar/PanelFiltros";
import { PanelEditor } from "./components/editor/PanelEditor";
import { ModalNuevaCancion } from "./components/modals/ModalNuevaCancion";
import { ModalEditarCancion } from "./components/modals/ModalEditarCancion";

import type { Cancion, Filtros } from "./types";

/* ─── Card de canción ─────────────────────────────────────────────────────── */
const CancionCard = ({
  cancion,
  onClick,
  onEdit,
  onDelete,
  onToggleVisible,
}: {
  cancion: Cancion;
  onClick: () => void;
  onEdit: (c: Cancion) => void;
  onDelete: (id: string) => void;
  onToggleVisible: (id: string, visible: boolean) => void;
}) => {
  // Reutilizamos SidebarItem pero en modo "card" — le damos selected=false siempre
  // y dejamos que maneje sus propios menús. La card envuelve al item con estilos de grid.
  return (
    <div
      className="bg-primary/[0.02] border border-primary/10 rounded-2xl overflow-hidden hover:border-primary/20 hover:bg-primary/5 transition-all group cursor-pointer"
      onClick={onClick}
    >
      {/* Cabecera de estado */}
      <div className={`h-1 w-full ${ESTADO_COLOR[cancion.estado].includes("text-yellow") ? "bg-yellow-400/40" : cancion.estado === "TERMINADA" ? "bg-green-400/40" : "bg-primary/10"}`} />

      <div className="p-4 relative">
        {/* Badge estado */}
        <span className={`inline-flex text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border mb-2 ${ESTADO_COLOR[cancion.estado]}`}>
          {cancion.estado === "EN PROCESO" ? "WIP" : cancion.estado === "TERMINADA" ? "Terminada" : "Pendiente"}
        </span>

        <h3 className="font-black text-sm uppercase italic tracking-tight leading-tight text-primary line-clamp-2 pr-8 mb-1">
          {cancion.titulo}
        </h3>

        {(() => {
          const p = cancion.personaje;
          const nombre = (Array.isArray(p) ? p[0]?.nombre : p?.nombre) || cancion.cantante;
          return nombre ? (
            <p className="text-[10px] text-primary/40 truncate">{nombre}</p>
          ) : null;
        })()}

        {cancion.idioma && (
          <p className="text-[9px] text-primary/25 uppercase tracking-widest mt-1">{cancion.idioma}</p>
        )}

        {/* Acciones — delegamos en SidebarItem sin su botón principal */}
        {/* Usamos los mismos handlers pero detenemos propagación en el área de acciones */}
        <div
          className="absolute top-3 right-3"
          onClick={e => e.stopPropagation()}
        >
          <CardActions
            cancion={cancion}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleVisible={onToggleVisible}
          />
        </div>
      </div>
    </div>
  );
};

/* ─── Acciones flotantes de la card ──────────────────────────────────────── */
import { useConfirm } from "@/components/ui/ConfirmModal";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

const CardActions = ({
  cancion, onEdit, onDelete, onToggleVisible,
}: {
  cancion: Cancion;
  onEdit: (c: Cancion) => void;
  onDelete: (id: string) => void;
  onToggleVisible: (id: string, visible: boolean) => void;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { confirm, ConfirmModal } = useConfirm();

  const handleToggleVisible = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (toggling) return;
    setToggling(true);
    const nuevoVisible = !cancion.visible;
    try {
      await supabase.from("canciones").update({ visible: nuevoVisible }).eq("id", cancion.id);
      onToggleVisible(cancion.id, nuevoVisible);
    } finally {
      setToggling(false);
    }
  };

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div className="flex items-center gap-1">
      {/* Visibilidad */}
      <button
        onClick={handleToggleVisible}
        title={cancion.visible ? "Ocultar" : "Mostrar"}
        className={`p-1.5 rounded-lg transition-all ${
          cancion.visible
            ? "opacity-0 group-hover:opacity-100 text-primary/40 hover:bg-primary/10 hover:text-primary"
            : "opacity-100 text-primary/30 hover:bg-primary/10 hover:text-primary"
        }`}
      >
        {toggling
          ? <Loader2 size={12} className="animate-spin" />
          : cancion.visible ? <Eye size={12} /> : <EyeOff size={12} />}
      </button>

      {/* Menú */}
      <div ref={menuRef} className="relative">
        <button
          onClick={e => { e.stopPropagation(); setMenuOpen(m => !m); }}
          className={`p-1.5 rounded-lg transition-all ${
            menuOpen
              ? "bg-primary/15 text-primary"
              : "opacity-0 group-hover:opacity-100 text-primary/40 hover:bg-primary/10 hover:text-primary"
          }`}
        >
          <MoreHorizontal size={12} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-8 z-50 min-w-[150px] bg-bg-main border border-primary/15 rounded-xl shadow-xl shadow-primary/10 py-1 overflow-hidden">
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(false); onEdit(cancion); }}
              className="w-full text-left px-3 py-2 text-[10px] font-black uppercase tracking-widest text-primary/60 hover:bg-primary/8 hover:text-primary transition-all flex items-center gap-2"
            >
              <Pencil size={11} /> Editar
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

/* ─── Vista principal ─────────────────────────────────────────────────────── */
export default function EstudioLetras() {
  const { canciones, setCanciones, loading: loadingLista, isOffline: listaOffline, refetch } = useCanciones();
  const [lastId, setLastId] = useLastOpenedId("estudio-letras-last-id");
  const [selectedId, _setSelectedId] = useState<string | null>(null); // null = vista lista

  const setSelectedId = (id: string | null) => {
    _setSelectedId(id);
    setLastId(id);
  };

  const [busqueda,        setBusqueda]        = useState("");
  const [filtros,         setFiltros]         = useState<Filtros>(FILTROS_VACIOS);
  const [showFiltros,     setShowFiltros]     = useState(false);
  const [showNueva,       setShowNueva]       = useState(false);
  const [editandoCancion, setEditandoCancion] = useState<Cancion | null>(null);

  const opciones = useMemo(() => ({
    idiomas:      unique(canciones.map(c => c.idioma     || "")),
    cantantes:    unique(canciones.map(c => c.cantante   || "")),
    compositores: unique(canciones.map(c => c.compositor || "")),
    personajes:   unique(canciones.map(c => { const p = c.personaje; return (Array.isArray(p) ? p[0]?.nombre : p?.nombre) || ""; })),
  }), [canciones]);

  const ORDEN_ESTADO: Record<string, number> = { TERMINADA: 0, "EN PROCESO": 1, PENDIENTE: 2 };

  const filtradas = useMemo(() => canciones.filter(c => {
    if (busqueda) {
      const q = normalize(busqueda);
      if (
        !normalize(c.titulo).includes(q) &&
        !normalize((Array.isArray(c.personaje) ? c.personaje[0]?.nombre : c.personaje?.nombre) || "").includes(q) &&
        !normalize(c.cantante   || "").includes(q) &&
        !normalize(c.compositor || "").includes(q)
      ) return false;
    }
    if (filtros.estado     && c.estado      !== filtros.estado)        return false;
    if (filtros.visible    && String(c.visible) !== filtros.visible)   return false;
    if (filtros.idioma     && c.idioma      !== filtros.idioma)        return false;
    if (filtros.cantante   && c.cantante    !== filtros.cantante)      return false;
    if (filtros.compositor && c.compositor  !== filtros.compositor)    return false;
    if (filtros.personaje  && ((Array.isArray(c.personaje) ? c.personaje[0]?.nombre : c.personaje?.nombre) !== filtros.personaje)) return false;
    return true;
  }).sort((a, b) => {
    const estadoA = ORDEN_ESTADO[a.estado] ?? 9;
    const estadoB = ORDEN_ESTADO[b.estado] ?? 9;
    if (estadoA !== estadoB) return estadoA - estadoB;
    // Dentro de TERMINADA: visibles primero
    if (a.estado === "TERMINADA") return (b.visible ? 1 : 0) - (a.visible ? 1 : 0);
    return 0;
  }), [canciones, busqueda, filtros]);

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

  const handleToggleVisible = useCallback((id: string, visible: boolean) => {
    setCanciones(prev => prev.map(c => c.id === id ? { ...c, visible } : c));
  }, [setCanciones]);

  /* ── Vista editor (canción seleccionada) ── */
  if (selectedId) {
    return (
      <>
        <div className="min-h-screen bg-bg-main flex flex-col">
          {/* Barra superior del editor */}
          <header className="sticky top-0 z-30 bg-bg-main border-b border-primary/10 px-6 py-3 flex items-center gap-3">
            <button
              onClick={() => setSelectedId(null)}
              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary/40 hover:text-primary transition-colors"
            >
              <ArrowLeft size={12} /> Canciones
            </button>
            <span className="text-primary/20">·</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary/60 truncate">
              {canciones.find(c => c.id === selectedId)?.titulo ?? ""}
            </span>
          </header>

          {/* Editor */}
          <div className="flex-1">
            <PanelEditor key={selectedId} cancionId={selectedId} />
          </div>
        </div>

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

  /* ── Vista lista ── */
  return (
    <>
      <div className="min-h-screen bg-bg-main">

        {/* ── Header ── */}
        <header className="sticky top-0 z-30 bg-bg-main border-b border-primary/10">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
            {/* Icono + título */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-primary/30"><Music size={14} /></span>
              <span className="text-[10px] font-black uppercase tracking-widest text-primary/50">
                Canciones
              </span>
            </div>

            <div className="flex-1 relative">
              <input
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por título, cantante, compositor…"
                className="w-full bg-primary/5 border border-primary/15 rounded-xl px-4 py-2.5 text-sm font-medium text-primary placeholder:text-primary/25 outline-none focus:border-primary/40 focus:bg-primary/8 transition-all"
              />
              {busqueda && (
                <button
                  onClick={() => setBusqueda("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/30 hover:text-primary"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filtros toggle */}
            <button
              onClick={() => setShowFiltros(f => !f)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shrink-0 ${
                numFiltros > 0
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-primary/15 text-primary/40 hover:text-primary hover:border-primary/25"
              }`}
            >
              <SlidersHorizontal size={11} />
              Filtros
              {numFiltros > 0 && (
                <span className="bg-primary text-bg-main rounded-full w-4 h-4 text-[8px] flex items-center justify-center">
                  {numFiltros}
                </span>
              )}
              <ChevronDown size={10} className={`transition-transform duration-200 ${showFiltros ? "rotate-180" : ""}`} />
            </button>

            {/* Nueva canción */}
            <button
              onClick={() => setShowNueva(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-bg-main hover:bg-primary/90 transition-all shrink-0"
            >
              <Plus size={11} /> Nueva
            </button>

            {/* Offline / refetch */}
            {listaOffline && (
              <button onClick={refetch} className="text-[9px] font-black uppercase text-red-400 tracking-widest shrink-0">
                Sin conexión · Reintentar
              </button>
            )}
          </div>

          {/* Panel de filtros desplegable */}
          {showFiltros && (
            <div className="border-t border-primary/8 bg-primary/[0.02]">
              <div className="max-w-6xl mx-auto px-6 py-4">
                <PanelFiltros filtros={filtros} onChange={setFiltros} opciones={opciones} />
              </div>
            </div>
          )}
        </header>

        {/* ── Cuerpo ── */}
        <main className="max-w-6xl mx-auto px-6 py-6">

          {/* Contador */}
          <div className="flex items-center justify-between mb-5">
            <p className="text-[9px] font-black uppercase tracking-widest text-primary/30">
              {filtradas.length} {filtradas.length === 1 ? "canción" : "canciones"}
              {busqueda || numFiltros > 0 ? ` · de ${canciones.length} totales` : ""}
            </p>
            {(busqueda || numFiltros > 0) && (
              <button
                onClick={() => { setBusqueda(""); setFiltros(FILTROS_VACIOS); }}
                className="text-[9px] font-black uppercase text-red-400/60 hover:text-red-400 tracking-widest"
              >
                ✕ Limpiar todo
              </button>
            )}
          </div>

          {loadingLista ? (
            <div className="flex items-center justify-center py-24 text-primary/30">
              <Loader2 className="animate-spin" size={22} />
            </div>
          ) : filtradas.length === 0 ? (
            <div className="text-center py-24 text-primary/25">
              <BookOpen size={40} strokeWidth={1} className="mx-auto mb-4 opacity-40" />
              <p className="text-xs font-black uppercase tracking-widest">Sin resultados</p>
              {(busqueda || numFiltros > 0) && (
                <button
                  onClick={() => { setBusqueda(""); setFiltros(FILTROS_VACIOS); }}
                  className="mt-3 text-[9px] font-black uppercase text-primary/40 hover:text-primary tracking-widest"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filtradas.map(c => (
                <CancionCard
                  key={c.id}
                  cancion={c}
                  onClick={() => setSelectedId(c.id)}
                  onEdit={setEditandoCancion}
                  onDelete={handleCancionEliminada}
                  onToggleVisible={handleToggleVisible}
                />
              ))}
            </div>
          )}
        </main>
      </div>

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