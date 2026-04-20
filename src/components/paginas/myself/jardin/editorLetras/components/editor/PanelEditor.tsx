"use client";

import React, { useState, useCallback } from "react";
import {
  Music, Info, Film, Loader2, RefreshCw, FileText,
  Eye, EyeOff, Columns2, Plus, Check, X, Layers,
} from "lucide-react";
import { User, Mic2, PenLine, Globe } from "lucide-react";
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
        <BannerOffline color="amber" mensaje="Sin conexión — los cambios se sincronizan al reconectar" />
      )}

      {/* Header del editor */}
      <div className="shrink-0 px-8 pt-7 pb-5 border-b border-primary/10 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl font-black uppercase italic tracking-tight text-primary leading-none truncate">
              {cancion.titulo}
            </h1>
            <div className="flex flex-wrap gap-4 mt-2 text-[10px] font-black uppercase text-primary/40 tracking-widest items-center">
              {cancion.personaje  && <span className="flex items-center gap-1"><User   size={12} strokeWidth={3} /> {cancion.personaje}</span>}
              {cancion.cantante   && <span className="flex items-center gap-1"><Mic2   size={12} strokeWidth={3} /> {cancion.cantante}</span>}
              {cancion.compositor && <span className="flex items-center gap-1"><PenLine size={12} strokeWidth={3} /> {cancion.compositor}</span>}
              {cancion.idioma     && <span className="flex items-center gap-1"><Globe  size={12} strokeWidth={3} /> {cancion.idioma}</span>}
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

        {/* Tabs + controles de idioma */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 p-1 bg-primary/5 rounded-xl border border-primary/10">
            {([
              { id: "letras", label: "Letras",   icon: <Music size={10} /> },
              { id: "info",   label: "Info",     icon: <Info  size={10} /> },
              { id: "guion",  label: "Guion MV", icon: <Film  size={10} /> },
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

      {/* Contenido de la tab activa */}
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
