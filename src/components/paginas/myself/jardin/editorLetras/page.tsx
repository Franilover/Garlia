"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Music, Plus, SlidersHorizontal, ChevronDown, BookOpen, Loader2 } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import EstudioLayout from "@/components/layout/EstudioLayout";
import { EmptyEstudio } from "@/components/templates/EstudioTemplates";
import { useLastOpenedId } from "@/hooks/useEditorShared";
import { normalize, unique } from "@/components/templates/EstudioTemplates";

import { useCanciones } from "./hooks/useCanciones";
import { ESTADOS, ESTADO_COLOR, FILTROS_VACIOS } from "./constants";
import { SidebarItem } from "./components/sidebar/SidebarItem";
import { PanelFiltros } from "./components/sidebar/PanelFiltros";
import { PanelEditor } from "./components/editor/PanelEditor";
import { ModalNuevaCancion } from "./components/modals/ModalNuevaCancion";
import { ModalEditarCancion } from "./components/modals/ModalEditarCancion";

import type { Cancion, Filtros } from "./types";

export default function EstudioLetras() {
  const { canciones, setCanciones, loading: loadingLista, isOffline: listaOffline, refetch } = useCanciones();
  const [lastId, setLastId] = useLastOpenedId("estudio-letras-last-id");
  const [selectedId, _setSelectedId] = useState<string | null>(lastId);

  const setSelectedId = (id: string | null) => {
    _setSelectedId(id);
    setLastId(id);
  };

  const [busqueda,        setBusqueda]        = useState("");
  const [filtros,         setFiltros]         = useState<Filtros>(FILTROS_VACIOS);
  const [showFiltros,     setShowFiltros]     = useState(false);
  const [sidebarOpen,     setSidebarOpen]     = useState(true);
  const [showNueva,       setShowNueva]       = useState(false);
  const [editandoCancion, setEditandoCancion] = useState<Cancion | null>(null);

  const opciones = useMemo(() => ({
    idiomas:      unique(canciones.map(c => c.idioma     || "")),
    cantantes:    unique(canciones.map(c => c.cantante   || "")),
    compositores: unique(canciones.map(c => c.compositor || "")),
    personajes:   unique(canciones.map(c => { const p = c.personaje; return (Array.isArray(p) ? p[0]?.nombre : p?.nombre) || ""; })),
  }), [canciones]);

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

  const handleToggleVisible = useCallback((id: string, visible: boolean) => {
    setCanciones(prev => prev.map(c => c.id === id ? { ...c, visible } : c));
  }, [setCanciones]);

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
                onToggleVisible={handleToggleVisible}
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
            onToggleVisible={handleToggleVisible}
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
          <EmptyEstudio
            icono={<BookOpen size={52} strokeWidth={1} />}
            titulo="Estudio de Letras"
            subtitulo="Selecciona una canción o crea una nueva"
          />
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