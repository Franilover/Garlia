"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Music, Info, Film, Loader2, RefreshCw, FileText,
  Eye, EyeOff, Columns2, Plus, Check, X, Layers,
  MoreHorizontal, ChevronDown, Edit3,
} from "lucide-react";
import { User, Mic2, PenLine, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BannerOffline } from "@/components/templates/EstudioTemplates";
import { useCancionEditor } from "../../hooks/useCancionEditor";
import { secUpdate, secCreate, secDelete, secReorder } from "../../lib/seccionesDb";
import { IDIOMAS, ESTADO_COLOR } from "../../constants";
import { IdiomaTab } from "./IdiomaTab";
import { SeccionEditor } from "./SeccionEditor";
import { ModalLectorLetras } from "../modals/ModalLectorLetras";
import { PanelLinks } from "../panels/PanelLinks";
import { PanelInfo } from "../panels/PanelInfo";
import { PanelGuionMV } from "../panels/PanelGuionMV";
import type { Seccion, IdiomaKey, EditorTab } from "../../types";

export const PanelEditor = ({ cancionId }: { cancionId: string }) => {
  const { cancion, setCancion, loading, isOffline: editorOffline, reload } = useCancionEditor(cancionId);
  const [idiomaA,       setIdiomaA]       = useState<IdiomaKey>("es");
  const [idiomaB,       setIdiomaB]       = useState<IdiomaKey>("en");
  const SPLIT_BP = 768;
  const [splitMode, setSplitMode] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= SPLIT_BP
  );
  useEffect(() => {
    const onResize = () => {
      const wide = window.innerWidth >= SPLIT_BP;
      setSplitMode(wide);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const [addingOpen,    setAddingOpen]    = useState(false);
  const [addingName,    setAddingName]    = useState("");
  const [showLector,    setShowLector]    = useState(false);
  const [activeTab,     setActiveTab]     = useState<EditorTab>("letras");
  const [viewMode,      setViewMode]      = useState<"edit" | "preview">("edit");
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [headerExpanded,    setHeaderExpanded]     = useState(false);

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
      letra_es:     sec.letra_es || "",
      letra_en:     sec.letra_en,
      letra_jp:     sec.letra_jp,
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

  const TABS = [
    { id: "letras", label: "Letras", icon: <Music size={10} /> },
    { id: "info",   label: "Info",   icon: <Info  size={10} /> },
    { id: "guion",  label: "Guion",  icon: <Film  size={10} /> },
  ] as { id: EditorTab; label: string; icon: React.ReactNode }[];

  if (loading) return (
    <div className="flex-1 flex items-center justify-center text-primary/30">
      <Loader2 className="animate-spin" size={28} />
    </div>
  );
  if (!cancion) return null;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Modal lector / karaoke */}
      {showLector && (
        <ModalLectorLetras
          isOpen={showLector}
          onClose={() => setShowLector(false)}
          secciones={secciones}
          cancionTitulo={cancion.titulo}
          cancionId={cancionId}
          duracion={cancion.duracion_segundos}
          onSeccionTimingsChange={(seccionId, col, timings) => {
            const idiomaKey   = col.replace("timings_", "") as IdiomaKey;
            const timingField = `timings_${idiomaKey}` as keyof Seccion;
            const timingsNum  = Object.fromEntries(Object.entries(timings).map(([k, v]) => [k, v]));
            setCancion(prev => prev ? {
              ...prev,
              secciones: prev.secciones?.map(s =>
                s.id === seccionId ? { ...s, [timingField]: timingsNum } : s
              ),
            } : prev);
          }}
        />
      )}

      {editorOffline && (
        <BannerOffline color="amber" mensaje="Sin conexión — los cambios se sincranizan al reconectar" />
      )}

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-primary/10">

        {/* ── FILA 1: Título + metadatos + acciones ─────────────────── */}
        <div className="px-4 sm:px-8 pt-4 sm:pt-5 pb-2 flex items-center gap-2 min-w-0">

          {/* Bloque título — tap para expandir en mobile */}
          <button
            onClick={() => setHeaderExpanded(v => !v)}
            className="sm:cursor-default flex-1 min-w-0 text-left flex items-baseline gap-2.5"
          >
            <h1 className="text-lg sm:text-xl font-black uppercase italic tracking-tight text-primary leading-none truncate shrink-0 max-w-[55%] sm:max-w-none">
              {cancion.titulo}
            </h1>
            {/* Pills de estado siempre inline con el título */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${ESTADO_COLOR[cancion.estado]}`}>
                {cancion.estado}
              </span>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                cancion.visible
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : "bg-primary/10 text-primary/40 border-primary/20"
              }`}>
                {cancion.visible ? <Eye size={8} /> : <EyeOff size={8} />}
                {cancion.visible ? "Vis" : "Oculta"}
              </span>
            </div>
            <ChevronDown
              size={10}
              className={`sm:hidden text-primary/25 transition-transform duration-200 ml-auto ${headerExpanded ? "rotate-180" : ""}`}
            />
          </button>

          {/* Metadatos desktop — inline junto al título */}
          <div className="hidden sm:flex items-center gap-3 text-[9px] font-black uppercase text-primary/35 tracking-widest shrink-0">
            {cancion.personaje  && <span className="flex items-center gap-1"><User    size={10} strokeWidth={3} /> {Array.isArray(cancion.personaje) ? cancion.personaje.map((p: { nombre: string }) => p.nombre).join(", ") : (cancion.personaje as { nombre: string }).nombre}</span>}
            {cancion.cantante   && <span className="flex items-center gap-1"><Mic2    size={10} strokeWidth={3} /> {cancion.cantante}</span>}
            {cancion.compositor && <span className="flex items-center gap-1"><PenLine size={10} strokeWidth={3} /> {cancion.compositor}</span>}
            {cancion.idioma     && <span className="flex items-center gap-1"><Globe   size={10} strokeWidth={3} /> {cancion.idioma}</span>}
          </div>

          {/* Acciones desktop */}
          <div className="hidden sm:flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => setShowLector(true)}
              title="Modo karaoke / lectura"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-emerald-500/10 text-primary/30 hover:text-emerald-400 transition-all text-[9px] font-black uppercase tracking-widest"
            >
              <FileText size={12} /> Karaoke
            </button>
            <button
              onClick={reload as any}
              title="Recargar"
              className="p-1.5 rounded-lg hover:bg-primary/10 text-primary/20 hover:text-primary transition-all"
            >
              <RefreshCw size={11} />
            </button>
          </div>

          {/* Acciones mobile — overflow menu */}
          <div className="sm:hidden shrink-0 relative">
            <button
              onClick={() => setMobileActionsOpen(o => !o)}
              className="p-2 rounded-lg hover:bg-primary/8 text-primary/30 hover:text-primary transition-all"
            >
              <MoreHorizontal size={15} />
            </button>
            <AnimatePresence>
              {mobileActionsOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40"
                    onClick={() => setMobileActionsOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-9 z-50 min-w-[160px] bg-bg-main border border-primary/15 rounded-xl shadow-xl py-1 overflow-hidden"
                  >
                    <button
                      onClick={() => { setShowLector(true); setMobileActionsOpen(false); }}
                      className="w-full text-left px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-primary/60 hover:bg-primary/8 hover:text-primary transition-all flex items-center gap-2"
                    >
                      <FileText size={11} /> Karaoke
                    </button>
                    <button
                      onClick={() => { (reload as any)(); setMobileActionsOpen(false); }}
                      className="w-full text-left px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-primary/60 hover:bg-primary/8 hover:text-primary transition-all flex items-center gap-2"
                    >
                      <RefreshCw size={11} /> Recargar
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Metadatos expandibles en mobile */}
        <AnimatePresence initial={false}>
          {headerExpanded && (
            <motion.div
              key="mobile-details"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="sm:hidden overflow-hidden"
            >
              <div className="flex flex-wrap gap-3 px-4 pt-0.5 pb-2 text-[10px] font-black uppercase text-primary/40 tracking-widest">
                {cancion.personaje  && <span className="flex items-center gap-1"><User    size={11} strokeWidth={3} /> {Array.isArray(cancion.personaje) ? cancion.personaje.map((p: { nombre: string }) => p.nombre).join(", ") : (cancion.personaje as { nombre: string }).nombre}</span>}
                {cancion.cantante   && <span className="flex items-center gap-1"><Mic2    size={11} strokeWidth={3} /> {cancion.cantante}</span>}
                {cancion.compositor && <span className="flex items-center gap-1"><PenLine size={11} strokeWidth={3} /> {cancion.compositor}</span>}
                {cancion.idioma     && <span className="flex items-center gap-1"><Globe   size={11} strokeWidth={3} /> {cancion.idioma}</span>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── FILA 2: Tabs + controles de idioma + progreso ─────────── */}
        <div className="px-4 sm:px-8 pb-3 space-y-2 sm:space-y-0">

          {/* Desktop: todo en una sola línea */}
          <div className="hidden sm:flex items-center gap-2">

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-primary/5 rounded-xl border border-primary/10 shrink-0">
              {TABS.map(tab => (
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

            {/* Separador */}
            {activeTab === "letras" && (
              <div className="w-px h-5 bg-primary/10 shrink-0" />
            )}

            {/* Controles de idioma — solo en tab letras */}
            {activeTab === "letras" && (
              <>
                <IdiomaTab value={idiomaA} onChange={changeIdiomaA} exclude={splitMode ? idiomaB : undefined} />

                {/* Botón split */}
                <button
                  onClick={() => setSplitMode(m => !m)}
                  title="Vista dividida"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shrink-0 ${
                    splitMode
                      ? "bg-primary text-bg-main border-primary shadow-md shadow-primary/20"
                      : "border-primary/20 text-primary/40 hover:text-primary hover:border-primary/30"
                  }`}
                >
                  <Columns2 size={12} />
                  {splitMode ? "÷" : "Split"}
                </button>

                {/* Botón toggle editar / preview global */}
                <button
                  onClick={() => setViewMode(v => v === "edit" ? "preview" : "edit")}
                  title={viewMode === "edit" ? "Ver preview" : "Editar"}
                  className="p-1.5 rounded-xl border border-primary/20 text-primary/40 hover:text-primary hover:border-primary/30 transition-all shrink-0"
                >
                  {viewMode === "edit" ? <Eye size={12} /> : <Edit3 size={12} />}
                </button>

                {/* Idioma B — solo en split */}
                {splitMode && (
                  <>
                    <div className="w-px h-5 bg-primary/10 shrink-0" />
                    <IdiomaTab value={idiomaB} onChange={changeIdiomaB} exclude={idiomaA} />
                  </>
                )}
              </>
            )}

            {/* Progreso — empuja al final */}
            {activeTab === "letras" && (
              <div className="ml-auto flex items-center gap-2 text-[9px] font-black uppercase text-primary/30 tracking-widest shrink-0">
                <span>{conLetra}/{secciones.length}</span>
                <div className="w-16 h-1 rounded-full bg-primary/10 overflow-hidden">
                  <div className="h-full rounded-full bg-primary/50 transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                <span>{pct}%</span>
              </div>
            )}
          </div>

          {/* Mobile: tabs en su propia línea */}
          <div className="sm:hidden">
            <div className="flex items-center gap-2">
              <div className="flex gap-1 p-1 bg-primary/5 rounded-xl border border-primary/10 flex-1">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      activeTab === tab.id
                        ? "bg-primary text-bg-main shadow-md shadow-primary/20"
                        : "text-primary/40 hover:text-primary"
                    }`}
                  >
                    {tab.icon} {tab.label}
                    {tab.id === "guion" && (cancion.guion_mv?.length ?? 0) > 0 && (
                      <span className={`rounded-full w-3.5 h-3.5 text-[7px] flex items-center justify-center ${
                        activeTab === "guion" ? "bg-bg-main/30 text-bg-main" : "bg-primary/15 text-primary/70"
                      }`}>
                        {cancion.guion_mv!.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Progreso compacto mobile */}
              {activeTab === "letras" && (
                <span className="text-[9px] font-black text-primary/30 tracking-widest shrink-0">{pct}%</span>
              )}
            </div>

            {/* Controles idioma mobile — una sola fila siempre visible */}
            {activeTab === "letras" && (
              <div className="mt-2 flex items-center gap-1.5 flex-nowrap overflow-x-auto no-scrollbar">
                <IdiomaTab value={idiomaA} onChange={changeIdiomaA} exclude={splitMode ? idiomaB : undefined} />

                {/* Botón split — solo ícono */}
                <button
                  onClick={() => setSplitMode(m => !m)}
                  title="Vista dividida"
                  className={`p-2 rounded-xl border transition-all shrink-0 ${
                    splitMode
                      ? "bg-primary text-bg-main border-primary shadow-md shadow-primary/20"
                      : "border-primary/20 text-primary/30 hover:text-primary hover:border-primary/30"
                  }`}
                >
                  <Columns2 size={13} />
                </button>

                {splitMode && (
                  <>
                    <div className="w-px h-4 bg-primary/15 shrink-0" />
                    <IdiomaTab value={idiomaB} onChange={changeIdiomaB} exclude={idiomaA} />
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Labels de split (desktop) — integradas ahora como subtítulo sutil */}
        {activeTab === "letras" && splitMode && (
          <div className="hidden sm:flex gap-3 text-[8px] font-black uppercase tracking-[0.3em] text-primary/20 px-8 pb-2.5 -mt-1">
            <span className="flex-1 text-center">{IDIOMAS.find(i => i.id === idiomaA)?.nombre}</span>
            <span className="w-px" />
            <span className="flex-1 text-center">{IDIOMAS.find(i => i.id === idiomaB)?.nombre}</span>
          </div>
        )}
      </div>

      {/* ── CONTENIDO ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* Tab: Letras */}
        {activeTab === "letras" && (
          <div className="px-4 sm:px-8 py-4 sm:py-5 space-y-4">
            {secciones.length > 0 && (
              <div className="border border-primary/10 rounded-xl bg-bg-main/50 overflow-hidden">
                {secciones.map((sec, i) => (
                  <React.Fragment key={sec.id}>
                    <SeccionEditor
                      sec={sec}
                      idiomaA={idiomaA}
                      idiomaB={idiomaB}
                      splitMode={splitMode}
                      viewMode={viewMode}
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