"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import {
  MotionDiv, MotionButton,
} from "@/components/ui/Motion";
import {
  X, ArrowLeft,
  Save, Edit3, ImagePlus, Move, CheckCircle2, AlertCircle, UserX, ZoomIn, ZoomOut, User,
  BookOpen, BookMarked, Bug, Package,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { useIsAdmin } from "@/hooks/auth/useIsAdmin";
import { ModalDetalle } from "@/components/paginas/garlia/PersonalComponents";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { db } from "@/lib/api/client/db";

// ─── Hourglass — reemplaza Loader2 en todos los indicadores de carga ──────────
function Hourglass({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size} height={size * 1.45}
      viewBox="0 0 22 32" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ animation: "hg-flip 2.4s ease-in-out infinite", transformOrigin: "center", flexShrink: 0 }}
    >
      <style>{`
        @keyframes hg-flip {
          0%,40%  { transform: rotate(0deg); }
          50%,90% { transform: rotate(180deg); }
          100%    { transform: rotate(180deg); }
        }
      `}</style>
      <rect x="1" y="0"  width="20" height="2.5" rx="0" fill="currentColor" opacity="0.7"/>
      <rect x="1" y="29.5" width="20" height="2.5" rx="0" fill="currentColor" opacity="0.7"/>
      <path d="M2 2.5 L11 16 L20 2.5 Z"  fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.6"/>
      <path d="M2 29.5 L11 16 L20 29.5 Z" fill="currentColor" fillOpacity="0.5" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.6"/>
    </svg>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
type EntidadModal =
  | { tipo: "personaje"; data: any }
  | { tipo: "criatura";  data: any }
  | { tipo: "item";      data: any }
  | { tipo: "item_inv";  data: any };
type ToastType = "success" | "error";

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: ToastType; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-300 flex items-center gap-3 px-5 py-3 shadow-lg text-[10px] font-bold uppercase tracking-widest"
      style={{
        background: type === "success" ? "rgba(5,150,105,0.92)" : "rgba(185,28,28,0.92)",
        color: "var(--btn-text, #fff)",
        border: `1px solid ${type === "success" ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`,
        borderRadius: "1px",
        letterSpacing: "0.15em",
      }}
    >
      {type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      {message}
    </MotionDiv>
  );
}

// ─── Panel Contenido ──────────────────────────────────────────────────────────
function PanelContenido({
  editMode, reinoSeleccionado, puntoSeleccionado,
  setPuntoSeleccionado, setDetallesReino, setModifiedDetalles,
  setReinoSeleccionado, personajesReino, personajesDesbloqueados,
  handlePersonajeClick, modifiedDetalles, isSaving, handleSaveChanges,
  isUploadingImg, handleImageUpload, imgInputRef,
  librosReino, capitulosReino, loadingLibros,
  personajesCiudad, criaturasCiudad, itemsCiudad, loadingCiudad,
}: any) {
  const router = useRouter();
  if (editMode) {
    return (
      <div className="flex flex-col gap-4 grow">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold uppercase tracking-widest ml-1" style={{ color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}>Nombre</label>
          <input
            type="text"
            value={puntoSeleccionado ? puntoSeleccionado.nombre : reinoSeleccionado.nombre}
            onChange={(e) => {
              if (puntoSeleccionado) {
                setPuntoSeleccionado({ ...puntoSeleccionado, nombre: e.target.value });
                setDetallesReino((prev: any[]) => prev.map(p => p.id === puntoSeleccionado.id ? { ...p, nombre: e.target.value } : p));
                setModifiedDetalles((prev: Set<string>) => new Set(prev).add(puntoSeleccionado.id));
              } else setReinoSeleccionado({ ...reinoSeleccionado, nombre: e.target.value });
            }}
            className="input-brand font-bold uppercase text-xl outline-none px-4 py-3"
            style={{ borderRadius: "1px", letterSpacing: "0.08em" }}
          />
        </div>
        <div className="flex flex-col gap-1 grow">
          <label className="text-[9px] font-bold uppercase tracking-widest ml-1" style={{ color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}>Descripción / Lore</label>
          <textarea
            value={puntoSeleccionado ? puntoSeleccionado.descripcion : reinoSeleccionado.descripcion}
            onChange={(e) => {
              if (puntoSeleccionado) {
                setPuntoSeleccionado({ ...puntoSeleccionado, descripcion: e.target.value });
                setDetallesReino((prev: any[]) => prev.map(p => p.id === puntoSeleccionado.id ? { ...p, descripcion: e.target.value } : p));
                setModifiedDetalles((prev: Set<string>) => new Set(prev).add(puntoSeleccionado.id));
              } else setReinoSeleccionado({ ...reinoSeleccionado, descripcion: e.target.value });
            }}
            className="input-brand text-sm italic leading-relaxed h-36 resize-none outline-none px-4 py-3"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold uppercase tracking-widest ml-1 flex items-center gap-1" style={{ color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}>
            <Move size={9} /> Coordenadas
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[["X", puntoSeleccionado ? puntoSeleccionado.coord_x : reinoSeleccionado.coord_x],
              ["Y", puntoSeleccionado ? puntoSeleccionado.coord_y : reinoSeleccionado.coord_y]].map(([label, val]) => (
              <div key={label} className="p-3 text-center border"
                style={{ background: "color-mix(in srgb, var(--bg-main) 70%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)" }}>
                <span className="block text-[8px] font-bold uppercase" style={{ color: "color-mix(in srgb, var(--foreground) 40%, transparent)" }}>{label}</span>
                <span className="text-sm font-black" style={{ color: "var(--accent)" }}>{val}</span>
              </div>
            ))}
          </div>
        </div>


        {!puntoSeleccionado && (
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold uppercase tracking-widest ml-1 flex items-center gap-1"
              style={{ color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}>
              <ImagePlus size={9} /> Imagen del Mapa
            </label>
            {reinoSeleccionado.mapa_url && (
              <div className="relative w-full h-20 overflow-hidden border mb-1"
                style={{ borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)" }}>
                <img src={reinoSeleccionado.mapa_url} alt="Mapa actual" className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
                  <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: "var(--accent)" }}>Imagen actual</span>
                </div>
              </div>
            )}
            <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            <button
              onClick={() => imgInputRef.current?.click()}
              disabled={isUploadingImg}
              className="w-full flex items-center justify-center gap-2 border border-dashed text-[10px] font-black uppercase py-3 transition-all disabled:opacity-50"
              style={{ borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)", color: "var(--accent)", background: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
            >
              {isUploadingImg
                ? <><Hourglass size={12} /> Subiendo...</>
                : <><ImagePlus size={12} /> {reinoSeleccionado.mapa_url ? "Cambiar imagen" : "Subir imagen"}</>}
            </button>
          </div>
        )}
        <button
          onClick={handleSaveChanges}
          disabled={isSaving}
          className="btn-brand w-full justify-center text-[11px] uppercase py-4 mt-auto disabled:opacity-50"
          style={{ letterSpacing: "0.12em" }}
        >
          {isSaving ? <Hourglass size={14} /> : <Save size={14} />}
          Guardar cambios
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Title with decorative line */}
      <div className="relative mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-px flex-1" style={{ background: `linear-gradient(to right, transparent, color-mix(in srgb, var(--accent) 40%, transparent))` }} />
          <div className="w-1.5 h-1.5 rotate-45" style={{ background: "var(--accent)" }} />
          <div className="h-px flex-1" style={{ background: `linear-gradient(to left, transparent, color-mix(in srgb, var(--accent) 40%, transparent))` }} />
        </div>
        <h2 className="font-bold text-2xl uppercase tracking-[0.18em] leading-none text-center"
          style={{ fontFamily: "'Cinzel', serif", color: "var(--foreground)" }}>
          {puntoSeleccionado ? puntoSeleccionado.nombre : reinoSeleccionado.nombre}
        </h2>
        <div className="flex items-center gap-3 mt-2">
          <div className="h-px flex-1" style={{ background: `linear-gradient(to right, transparent, color-mix(in srgb, var(--accent) 40%, transparent))` }} />
          <div className="w-1.5 h-1.5 rotate-45" style={{ background: "var(--accent)" }} />
          <div className="h-px flex-1" style={{ background: `linear-gradient(to left, transparent, color-mix(in srgb, var(--accent) 40%, transparent))` }} />
        </div>
      </div>

      <div className="space-y-6 grow overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-accent/20">
        {/* Lore text */}
        <div className="relative p-5 border"
          style={{ borderColor: "color-mix(in srgb, var(--accent) 15%, transparent)", background: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
          <div className="absolute top-0 left-0 w-3 h-3 border-t border-l" style={{ borderColor: "color-mix(in srgb, var(--accent) 50%, transparent)" }} />
          <div className="absolute top-0 right-0 w-3 h-3 border-t border-r" style={{ borderColor: "color-mix(in srgb, var(--accent) 50%, transparent)" }} />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l" style={{ borderColor: "color-mix(in srgb, var(--accent) 50%, transparent)" }} />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r" style={{ borderColor: "color-mix(in srgb, var(--accent) 50%, transparent)" }} />
          <p className="text-sm italic leading-relaxed" style={{ color: "color-mix(in srgb, var(--foreground) 70%, transparent)" }}>
            &ldquo;{puntoSeleccionado ? puntoSeleccionado.descripcion : reinoSeleccionado.descripcion}&rdquo;
          </p>
        </div>

        {/* ── Habitantes de la ciudad seleccionada ── */}
        {puntoSeleccionado && (
          loadingCiudad ? (
            <div className="flex justify-center py-6" style={{ color: "color-mix(in srgb, var(--accent) 50%, transparent)" }}>
              <Hourglass size={14} />
            </div>
          ) : (
            <>
              {/* Personajes */}
              {personajesCiudad.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1" style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)" }} />
                    <span className="text-[8px] font-black uppercase tracking-[0.3em]" style={{ color: "color-mix(in srgb, var(--accent) 60%, transparent)" }}>
                      <User size={8} className="inline mr-1" />Habitantes
                    </span>
                    <div className="h-px flex-1" style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)" }} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {personajesCiudad.map((p: any) => {
                      const desbloqueado = personajesDesbloqueados.has(p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={desbloqueado ? () => handlePersonajeClick(p) : undefined}
                          className="flex items-center gap-2 p-2 w-full text-left transition-all"
                          style={{
                            background: desbloqueado
                              ? "color-mix(in srgb, var(--primary) 15%, transparent)"
                              : "color-mix(in srgb, var(--bg-main) 50%, transparent)",
                            border: `1px solid ${desbloqueado ? "color-mix(in srgb, var(--accent) 20%, transparent)" : "color-mix(in srgb, var(--accent) 7%, transparent)"}`,
                            opacity: desbloqueado ? 1 : 0.5,
                            cursor: desbloqueado ? "pointer" : "default",
                          }}
                        >
                          <div className="shrink-0 w-9 h-9 overflow-hidden flex items-center justify-center border"
                            style={{
                              borderColor: desbloqueado ? "color-mix(in srgb, var(--accent) 25%, transparent)" : "color-mix(in srgb, var(--accent) 8%, transparent)",
                              background: "color-mix(in srgb, var(--bg-main) 80%, transparent)",
                              filter: desbloqueado ? "none" : "grayscale(100%) blur(2px)",
                              borderRadius: "1px",
                            }}>
                            {desbloqueado && p.img_url
                              ? <img src={p.img_url} alt={p.nombre} className="w-full h-full object-cover" />
                              : <UserX size={14} style={{ color: "color-mix(in srgb, var(--accent) 30%, transparent)" }} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-semibold uppercase leading-tight truncate"
                              style={{ color: desbloqueado ? "var(--foreground)" : "color-mix(in srgb, var(--accent) 30%, transparent)" }}>
                              {desbloqueado ? p.nombre : "???"}
                            </p>
                            {p.especie && (
                              <p className="text-[8px] mt-0.5 truncate" style={{ color: "color-mix(in srgb, var(--accent) 55%, transparent)" }}>
                                {desbloqueado ? p.especie : "Desconocido"}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Criaturas */}
              {criaturasCiudad.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1" style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)" }} />
                    <span className="text-[8px] font-black uppercase tracking-[0.3em]" style={{ color: "color-mix(in srgb, var(--accent) 60%, transparent)" }}>
                      <Bug size={8} className="inline mr-1" />Criaturas avistadas
                    </span>
                    <div className="h-px flex-1" style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)" }} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {criaturasCiudad.map((c: any) => (
                      <div key={c.id} className="flex items-center gap-2.5 px-3 py-2 border"
                        style={{
                          background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                          borderColor: "color-mix(in srgb, var(--accent) 12%, transparent)",
                          borderRadius: "1px",
                        }}>
                        <div className="shrink-0 w-8 h-8 overflow-hidden border"
                          style={{
                            borderColor: "color-mix(in srgb, var(--accent) 20%, transparent)",
                            background: "color-mix(in srgb, var(--bg-main) 80%, transparent)",
                            borderRadius: "1px",
                          }}>
                          {c.imagen_url
                            ? <img src={c.imagen_url} alt={c.nombre} className="w-full h-full object-cover" />
                            : <Bug size={14} className="m-auto mt-1" style={{ color: "color-mix(in srgb, var(--accent) 40%, transparent)" }} />}
                        </div>
                        <p className="text-[10px] font-semibold uppercase truncate" style={{ color: "var(--foreground)" }}>
                          {c.nombre}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Items */}
              {itemsCiudad.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1" style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)" }} />
                    <span className="text-[8px] font-black uppercase tracking-[0.3em]" style={{ color: "color-mix(in srgb, var(--accent) 60%, transparent)" }}>
                      <Package size={8} className="inline mr-1" />Objetos encontrables
                    </span>
                    <div className="h-px flex-1" style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)" }} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {itemsCiudad.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-2.5 px-3 py-2 border"
                        style={{
                          background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                          borderColor: "color-mix(in srgb, var(--accent) 12%, transparent)",
                          borderRadius: "1px",
                        }}>
                        <div className="shrink-0 w-8 h-8 overflow-hidden border"
                          style={{
                            borderColor: "color-mix(in srgb, var(--accent) 20%, transparent)",
                            background: "color-mix(in srgb, var(--bg-main) 80%, transparent)",
                            borderRadius: "1px",
                          }}>
                          {item.imagen_url
                            ? <img src={item.imagen_url} alt={item.nombre} className="w-full h-full object-cover" />
                            : <Package size={14} className="m-auto mt-1" style={{ color: "color-mix(in srgb, var(--accent) 40%, transparent)" }} />}
                        </div>
                        <p className="text-[10px] font-semibold uppercase truncate" style={{ color: "var(--foreground)" }}>
                          {item.nombre}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vacío */}
              {personajesCiudad.length === 0 && criaturasCiudad.length === 0 && itemsCiudad.length === 0 && (
                <p className="text-center text-[9px] font-black uppercase tracking-widest py-4"
                  style={{ color: "color-mix(in srgb, var(--accent) 25%, transparent)" }}>
                  Sin habitantes registrados
                </p>
              )}
            </>
          )
        )}

        {/* Characters grid — 2 per row, no "ver" button */}
        {!puntoSeleccionado && personajesReino.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1" style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)" }} />
              <span className="text-[8px] font-black uppercase tracking-[0.3em]" style={{ color: "color-mix(in srgb, var(--accent) 60%, transparent)" }}>Habitantes conocidos</span>
              <div className="h-px flex-1" style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)" }} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {personajesReino.map((p: any) => {
                const desbloqueado = personajesDesbloqueados.has(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={desbloqueado ? () => handlePersonajeClick(p) : undefined}
                    className="flex items-center gap-2 p-2 w-full text-left transition-all group"
                    style={{
                      background: desbloqueado
                        ? "color-mix(in srgb, var(--primary) 15%, transparent)"
                        : "color-mix(in srgb, var(--bg-main) 50%, transparent)",
                      border: `1px solid ${desbloqueado ? "color-mix(in srgb, var(--accent) 20%, transparent)" : "color-mix(in srgb, var(--accent) 7%, transparent)"}`,
                      opacity: desbloqueado ? 1 : 0.5,
                      cursor: desbloqueado ? "pointer" : "default",
                    }}
                  >
                    {/* Avatar — izquierda */}
                    <div
                      className="shrink-0 w-10 h-10 overflow-hidden flex items-center justify-center border"
                      style={{
                        borderColor: desbloqueado ? "color-mix(in srgb, var(--accent) 25%, transparent)" : "color-mix(in srgb, var(--accent) 8%, transparent)",
                        background: "color-mix(in srgb, var(--bg-main) 80%, transparent)",
                        filter: desbloqueado ? "none" : "grayscale(100%) blur(2px)",
                        borderRadius: "1px",
                      }}
                    >
                      {desbloqueado && p.img_url
                        ? <img src={p.img_url} alt={p.nombre} className="w-full h-full object-cover" />
                        : <UserX size={16} style={{ color: "color-mix(in srgb, var(--accent) 30%, transparent)" }} />}
                    </div>
                    {/* Nombre + especie — derecha */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold uppercase leading-tight truncate"
                        style={{
                          color: desbloqueado ? "var(--foreground)" : "color-mix(in srgb, var(--accent) 30%, transparent)",
                          textDecoration: desbloqueado ? "none" : "line-through",
                          textDecorationColor: "color-mix(in srgb, var(--accent) 30%, transparent)",
                        }}>
                        {desbloqueado ? p.nombre : "???"}
                      </p>
                      {p.especie && (
                        <p className="text-[9px] font-medium mt-0.5 truncate" style={{ color: "color-mix(in srgb, var(--accent) 55%, transparent)" }}>
                          {desbloqueado ? p.especie : "Desconocido"}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Books of this kingdom */}
        {!puntoSeleccionado && (
          loadingLibros ? (
            <div className="flex justify-center py-6" style={{ color: "color-mix(in srgb, var(--accent) 50%, transparent)" }}>
              <Hourglass size={14} />
            </div>
          ) : (
            <>
              {librosReino && librosReino.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1" style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)" }} />
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] flex items-center gap-1.5" style={{ color: "color-mix(in srgb, var(--accent) 60%, transparent)" }}>
                      <BookOpen size={9} /> Relatos de este reino
                    </span>
                    <div className="h-px flex-1" style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)" }} />
                  </div>
                  <div className="flex flex-col gap-2">
                    {librosReino.map((libro: any) => (
                      <button
                        key={libro.id}
                        onClick={() => router.push(`/garlia/libros/${libro.id}`)}
                        className="flex items-center gap-3 p-3 border w-full text-left transition-all hover:opacity-80 active:scale-[0.98]"
                        style={{
                          background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                          borderColor: "color-mix(in srgb, var(--accent) 15%, transparent)",
                          cursor: "pointer",
                        }}>
                        {libro.portada_url && (
                          <img src={libro.portada_url} alt={libro.titulo} className="w-10 h-12 object-cover shrink-0"
                            style={{ filter: "brightness(0.9)" }} />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold uppercase leading-tight truncate" style={{ color: "var(--foreground)" }}>
                            {libro.titulo}
                          </p>
                          {libro.estado && (
                            <p className="text-[8px] font-bold uppercase mt-0.5" style={{ color: "color-mix(in srgb, var(--accent) 60%, transparent)" }}>
                              {libro.estado}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chapters that take place in this kingdom */}
              {capitulosReino && capitulosReino.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1" style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)" }} />
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] flex items-center gap-1.5" style={{ color: "color-mix(in srgb, var(--accent) 60%, transparent)" }}>
                      <BookMarked size={9} /> One shots
                    </span>
                    <div className="h-px flex-1" style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)" }} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {capitulosReino.map((cap: any) => (
                      <button
                        key={cap.id}
                        onClick={() => router.push(`/garlia/libros/${cap.libro_id}/leer/${cap.id}`)}
                        className="flex items-center gap-2 px-3 py-2.5 border w-full text-left transition-all hover:opacity-80 active:scale-[0.98]"
                        style={{
                          background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                          borderColor: "color-mix(in srgb, var(--accent) 10%, transparent)",
                          cursor: "pointer",
                        }}>
                        <span className="text-[8px] font-black shrink-0 px-1.5 py-0.5"
                          style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }}>
                          {cap.orden}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-semibold uppercase truncate" style={{ color: "var(--foreground)" }}>
                            {cap.titulo_capitulo}
                          </p>
                          {cap.libro_titulo && (
                            <p className="text-[8px] mt-0.5 truncate" style={{ color: "color-mix(in srgb, var(--accent) 50%, transparent)" }}>
                              {cap.libro_titulo}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )
        )}
      </div>
    </>
  );
}

// ─── Canvas Map ───────────────────────────────────────────────────────────────
interface CanvasMapProps {
  imageSrc: string;
  markers: any[];
  hiddenMarkers: any[]; // markers that are hidden (fog covered)
  editMode: boolean;
  onMarkerClick: (marker: any) => void;
  onMapClick: (x: number, y: number) => void;
  selectedMarkerId?: string | null;
  tipo: "global" | "reino";
  isFirstOpen?: boolean; // true only the very first time the map opens in a session
  fondoColor?: string | null;      // color de fondo del mar (guardado en Supabase)
  eyedropperActive?: boolean;      // cuando está activo, el siguiente click samplea el color
  onEyedropperPick?: (color: string) => void; // devuelve el hex del pixel clickeado
}

function CanvasMap({ imageSrc, markers, hiddenMarkers, editMode, onMarkerClick, onMapClick, selectedMarkerId, tipo, onOpenPanel, isFirstOpen, fondoColor, eyedropperActive, onEyedropperPick }: CanvasMapProps & { onOpenPanel?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  // showCompass: true while compass should be displayed (first open only, ≥5s)
  const [showCompass, setShowCompass] = useState(true);
  // mapFading: subtle fade overlay when switching maps (non-first transitions)
  const [mapFading, setMapFading] = useState(false);
  const compassTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // hasShownCompass: consumed once — prevents re-showing compass on subsequent imageSrc changes
  const hasShownCompassRef = useRef(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const animFrameRef = useRef<number>(0);
  // Camera state
  const camRef = useRef({ x: 0, y: 0, scale: 1 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, camX: 0, camY: 0 });
  // Pinch
  const lastPinchDist = useRef<number | null>(null);
  // Pulse animation
  const pulseRef = useRef(0);
  const compassStartRef = useRef<number | null>(null); // timestamp when compass started spinning
  // Theme CSS vars read at draw time
  const cssColorsRef = useRef({ primary: "#6b4423", accent: "#c08040", bg: "#f0e6d0", fg: "#2a1304", bgMenu: "#3d2010", parchBg: "#3d2010", parchText: "#2a1304", whiteCustom: "#fdf6ee", isDark: false, labelBg: "#fdf6ee", labelText: "#2a1304" });
  // Fog cache — rebuilt only when markers/size change, not every frame
  const fogCacheRef = useRef<{ canvas: OffscreenCanvas; deep: OffscreenCanvas; iw: number; ih: number; bg: string } | null>(null);

  useEffect(() => {
    const read = () => {
      const s = getComputedStyle(document.documentElement);
      const get = (v: string) => s.getPropertyValue(v).trim();
      const bgMain = get("--bg-main") || "#f0e6d0";
      const wc = get("--white-custom") || "#fdf6ee";
      const fgColor = get("--foreground") || "#2a1304";
      const bgMenuColor = get("--bg-menu") || "#3d2010";
      // Detect dark theme by luminance of --bg-main
      const hexToLuma = (hex: string) => {
        const h = hex.replace("#", "");
        if (h.length < 6) return 0.5;
        const r = parseInt(h.slice(0,2),16)/255;
        const g = parseInt(h.slice(2,4),16)/255;
        const b = parseInt(h.slice(4,6),16)/255;
        return 0.2126*r + 0.7152*g + 0.0722*b;
      };
      const dark = hexToLuma(bgMain) < 0.35;
      // In light themes: label bg = white-custom (light), text = foreground (dark)
      // In dark themes:  label bg = bg-menu (dark), text = foreground (light)
      cssColorsRef.current = {
        primary:     get("--primary")      || "#6b4423",
        accent:      get("--accent")       || "#c08040",
        bg:          bgMain,
        fg:          fgColor,
        bgMenu:      bgMenuColor,
        parchBg:     bgMenuColor,
        parchText:   fgColor,
        whiteCustom: wc,
        isDark:      dark,
        labelBg:     dark ? bgMenuColor : wc,
        labelText:   fgColor,
      };
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    return () => obs.disconnect();
  }, []);

  const centerImage = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.95;
    camRef.current = {
      x: (canvas.width - img.width * scale) / 2,
      y: (canvas.height - img.height * scale) / 2,
      scale,
    };
  }, []);

  useEffect(() => {
    // Clear any pending compass timer
    if (compassTimerRef.current) clearTimeout(compassTimerRef.current);

    // shouldShowCompass: only true the very first time this component loads
    const shouldShowCompass = isFirstOpen && !hasShownCompassRef.current;

    if (shouldShowCompass) {
      // First open: show full compass animation — mark it as consumed immediately
      hasShownCompassRef.current = true;
      setShowCompass(true);
      setMapFading(false);
    } else {
      // Any subsequent image change: subtle fade overlay, no compass
      setShowCompass(false);
      if (hasShownCompassRef.current) {
        // Only fade if we've already shown the first load (not during initial mount)
        setMapFading(true);
        setTimeout(() => setMapFading(false), 600);
      }
    }

    setImgLoaded(false);
    compassStartRef.current = null;
    imgRef.current = null;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
    img.onload = () => {
      imgRef.current = img;
      centerImage();
      setImgLoaded(true);
      if (shouldShowCompass) {
        // Keep compass visible for at least 5 seconds after the image is ready
        compassTimerRef.current = setTimeout(() => setShowCompass(false), 5000);
      } else {
        setShowCompass(false);
      }
    };
    img.onerror = () => {
      setTimeout(() => {
        const retry = new Image();
        retry.crossOrigin = "anonymous";
        retry.src = imageSrc + (imageSrc.includes("?") ? "&" : "?") + "_r=" + Date.now();
        retry.onload = () => {
          imgRef.current = retry;
          centerImage();
          setImgLoaded(true);
          if (shouldShowCompass) {
            compassTimerRef.current = setTimeout(() => setShowCompass(false), 5000);
          } else {
            setShowCompass(false);
          }
        };
      }, 800);
    };
    return () => {
      if (compassTimerRef.current) clearTimeout(compassTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageSrc, centerImage, isFirstOpen]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const resize = () => {
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      // Si el tamaño no cambió, no tocar el canvas — evita parpadeo por limpieza
      if (canvas.width === newW && canvas.height === newH) return;
      // Debounce: durante la animación del panel el contenedor cambia frame a frame.
      // Esperamos a que se detenga antes de reasignar canvas.width (lo que lo borra).
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const finalW = container.clientWidth;
        const finalH = container.clientHeight;
        if (canvas.width === finalW && canvas.height === finalH) return;
        canvas.width  = finalW;
        canvas.height = finalH;
        if (imgRef.current) centerImage();
      }, 150); // 150ms — más que un frame, menos que la animación del panel (350ms)
    };

    // Primera llamada inmediata (sin debounce, el panel no está animando todavía)
    canvas.width  = container.clientWidth;
    canvas.height = container.clientHeight;
    if (imgRef.current) centerImage();

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => {
      ro.disconnect();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [centerImage]);

  // ── Render loop with fog effect ──────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Cap to ~30fps on mobile to avoid lag and battery drain
    const isMobileDevice = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    const FRAME_MS = isMobileDevice ? 34 : 16;
    let lastFrameTime = 0;

    // Cache vignette so it's not rebuilt every frame
    let vignetteCanvas: OffscreenCanvas | null = null;
    let vignetteW = 0;
    let vignetteH = 0;
    let vignetteBg = "";

    const draw = (t: number) => {
      // Throttle frame rate on mobile
      if (t - lastFrameTime < FRAME_MS) {
        animFrameRef.current = requestAnimationFrame(draw);
        return;
      }
      lastFrameTime = t;

      pulseRef.current = t;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const { primary, accent, bg, fg, parchBg, parchText, whiteCustom, isDark, labelBg, labelText } = cssColorsRef.current;

      ctx.fillStyle = fondoColor || bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const { x: cx, y: cy, scale } = camRef.current;
      const img = imgRef.current;

      if (img && imgLoaded && !showCompass) {
        const iw = img.width * scale;
        const ih = img.height * scale;

        ctx.save();
        ctx.translate(cx, cy);

        // ── Draw base map ──────────────────────────────────────────────────
        ctx.drawImage(img, 0, 0, iw, ih);

        // ── FOG OF WAR — cached, rebuilt only when markers/bg changes ─────
        if (tipo === "global" && !editMode && hiddenMarkers.length > 0) {
          const cache = fogCacheRef.current;
          const FOG_W = Math.min(img.width, 1200);
          const FOG_H = Math.round(FOG_W * (img.height / img.width));
          const fogBg = fondoColor || bg;

          const needsRebuild =
            !cache ||
            cache.iw !== FOG_W ||
            cache.ih !== FOG_H ||
            cache.bg !== fogBg;

          if (needsRebuild) {
            const maxDim = Math.max(FOG_W, FOG_H);
            const clearRadius = maxDim * 0.05;
            const fadeRadius  = maxDim * 0.12;

            // ── Layer 1: main opaque fog with reveal holes ────────────────
            const fogCanvas = new OffscreenCanvas(FOG_W, FOG_H);
            const fogCtx = fogCanvas.getContext("2d")!;

            fogCtx.fillStyle = fogBg;
            fogCtx.globalAlpha = 0.92;
            fogCtx.fillRect(0, 0, FOG_W, FOG_H);
            fogCtx.globalAlpha = 1;

            fogCtx.globalCompositeOperation = "destination-out";
            for (const m of markers) {
              const mx = (m.coord_x / 100) * FOG_W;
              const my = (m.coord_y / 100) * FOG_H;
              const grad = fogCtx.createRadialGradient(mx, my, clearRadius * 0.2, mx, my, fadeRadius);
              grad.addColorStop(0,    "rgba(0,0,0,1)");
              grad.addColorStop(0.45, "rgba(0,0,0,0.98)");
              grad.addColorStop(0.72, "rgba(0,0,0,0.7)");
              grad.addColorStop(0.88, "rgba(0,0,0,0.25)");
              grad.addColorStop(1,    "rgba(0,0,0,0)");
              fogCtx.fillStyle = grad;
              fogCtx.beginPath();
              fogCtx.arc(mx, my, fadeRadius, 0, Math.PI * 2);
              fogCtx.fill();
            }
            fogCtx.globalCompositeOperation = "source-over";

            // ── Layer 2: semi-transparent overlay for depth ───────────────
            const deepCanvas = new OffscreenCanvas(FOG_W, FOG_H);
            const deepCtx = deepCanvas.getContext("2d")!;
            deepCtx.fillStyle = fogBg;
            deepCtx.globalAlpha = 0.45;
            deepCtx.fillRect(0, 0, FOG_W, FOG_H);
            deepCtx.globalAlpha = 1;
            deepCtx.globalCompositeOperation = "destination-out";
            for (const m of markers) {
              const mx = (m.coord_x / 100) * FOG_W;
              const my = (m.coord_y / 100) * FOG_H;
              const grad2 = deepCtx.createRadialGradient(mx, my, clearRadius * 0.5, mx, my, fadeRadius * 0.7);
              grad2.addColorStop(0,   "rgba(0,0,0,1)");
              grad2.addColorStop(0.6, "rgba(0,0,0,0.85)");
              grad2.addColorStop(1,   "rgba(0,0,0,0)");
              deepCtx.fillStyle = grad2;
              deepCtx.beginPath();
              deepCtx.arc(mx, my, fadeRadius * 0.7, 0, Math.PI * 2);
              deepCtx.fill();
            }
            deepCtx.globalCompositeOperation = "source-over";

            fogCacheRef.current = { canvas: fogCanvas, deep: deepCanvas, iw: FOG_W, ih: FOG_H, bg: fogBg };
          }

          const fc = fogCacheRef.current!;
          ctx.drawImage(fc.canvas, 0, 0, iw, ih);
          ctx.drawImage(fc.deep,   0, 0, iw, ih);
        }

        // No internal map vignette — edge fog handles blending instead

        ctx.restore();

        // ── Draw visible markers ──────────────────────────────────────────
        for (const m of markers) {
          const mx = cx + (m.coord_x / 100) * (img.width * scale);
          const my = cy + (m.coord_y / 100) * (img.height * scale);
          const isSelected = m.id === selectedMarkerId;
          const pulse = (Math.sin(t * 0.002 + m.coord_x) + 1) / 2;

          ctx.save();
          ctx.translate(mx, my);

          // ── Antique map pin — teardrop with body ─────────────────────────
          // Pin body uses --white-custom, same as panel surfaces
          const pinBody   = whiteCustom;
          const pinBorder = isSelected ? primary : `${primary}88`;
          const pinRing   = isSelected ? `${accent}99` : `${primary}55`;
          const pinDot    = accent;

          // Pin dimensions
          const headR = isSelected ? 9 : 7;       // circle head radius
          const tailH = isSelected ? 14 : 11;     // tail length below head

          // Drop shadow (offset, no blur on canvas so fake with alpha)
          ctx.save();
          ctx.translate(1.5, 2);
          ctx.globalAlpha = 0.22;
          ctx.beginPath();
          ctx.arc(0, -tailH * 0.4, headR, 0, Math.PI * 2);
          ctx.fillStyle = "#000";
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(-headR * 0.4, -tailH * 0.15);
          ctx.quadraticCurveTo(0, tailH * 0.6, 0, tailH * 0.85);
          ctx.quadraticCurveTo(0, tailH * 0.6, headR * 0.4, -tailH * 0.15);
          ctx.fillStyle = "#000";
          ctx.fill();
          ctx.restore();
          ctx.globalAlpha = 1;

          // Tail (teardrop point, drawn first so head covers seam)
          ctx.beginPath();
          ctx.moveTo(-headR * 0.42, -tailH * 0.18);
          ctx.quadraticCurveTo(-headR * 0.15, tailH * 0.55, 0, tailH);
          ctx.quadraticCurveTo(headR * 0.15, tailH * 0.55, headR * 0.42, -tailH * 0.18);
          ctx.fillStyle = pinBody;
          ctx.fill();
          ctx.strokeStyle = pinBorder;
          ctx.lineWidth = isSelected ? 1.2 : 0.9;
          ctx.stroke();

          // Head circle (filled)
          ctx.beginPath();
          ctx.arc(0, -tailH * 0.4, headR, 0, Math.PI * 2);
          ctx.fillStyle = pinBody;
          ctx.fill();
          ctx.strokeStyle = pinBorder;
          ctx.lineWidth = isSelected ? 1.4 : 1.0;
          ctx.stroke();

          // Inner ring — lighter, gives depth
          ctx.beginPath();
          ctx.arc(0, -tailH * 0.4, headR * 0.52, 0, Math.PI * 2);
          ctx.strokeStyle = pinRing;
          ctx.lineWidth = isSelected ? 1.0 : 0.7;
          ctx.stroke();

          // Center dot
          ctx.beginPath();
          ctx.arc(0, -tailH * 0.4, isSelected ? 2.2 : 1.6, 0, Math.PI * 2);
          ctx.fillStyle = pinDot;
          ctx.fill();

          // Subtle pulsing outer ring (very faint, only visible)
          if (!editMode) {
            const haloR = headR + 3 + pulse * 3;
            ctx.beginPath();
            ctx.arc(0, -tailH * 0.4, haloR, 0, Math.PI * 2);
            ctx.strokeStyle = isSelected
              ? `${accent}${Math.round(0.22 * (1 - pulse) * 255).toString(16).padStart(2,"0")}`
              : `${primary}${Math.round(0.15 * (1 - pulse) * 255).toString(16).padStart(2,"0")}`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }

          if (editMode) {
            ctx.beginPath();
            ctx.arc(headR, -tailH * 0.4 - headR, 3, 0, Math.PI * 2);
            ctx.fillStyle = accent;
            ctx.fill();
            if (true) {
              ctx.beginPath();
              ctx.arc(-headR, -tailH * 0.4 - headR, 3, 0, Math.PI * 2);
              ctx.fillStyle = "#f97316";
              ctx.fill();
            }
          }

          // ── Label — themed background strip ──────────────────────────────
          const fontSize = scale > 0.7 ? 10 : 9;
          ctx.font = `${isSelected ? "600" : "500"} ${fontSize}px 'Cinzel', serif`;
          ctx.textAlign = "center";
          const label = m.nombre;
          const metrics = ctx.measureText(label);
          const lw = metrics.width + 12;
          const lh = fontSize + 6;
          const labelY = -(tailH * 0.4 + headR + lh + 5);

          // Background from theme — smart light/dark
          ctx.fillStyle = isSelected
            ? `${labelBg}f0`
            : `${labelBg}d8`;
          ctx.beginPath();
          ctx.rect(-lw / 2, labelY, lw, lh);
          ctx.fill();

          // Border from primary
          ctx.strokeStyle = isSelected
            ? `${primary}88`
            : `${primary}44`;
          ctx.lineWidth = 0.6;
          ctx.stroke();

          // Text — always contrasting with labelBg
          ctx.fillStyle = isSelected ? labelText : `${labelText}ee`;
          ctx.fillText(label, 0, labelY + lh - 4);

          ctx.restore();
        }

        // ── Draw hidden markers (admin only, faded) ───────────────────────
        if (editMode) {
          for (const m of hiddenMarkers) {
            const mx = cx + (m.coord_x / 100) * (img.width * scale);
            const my = cy + (m.coord_y / 100) * (img.height * scale);
            ctx.save();
            ctx.globalAlpha = 0.35;
            ctx.translate(mx, my);
            ctx.save();
            // Small teardrop, orange-tinted for hidden
            const hR = 5; const hT = 8;
            ctx.beginPath();
            ctx.moveTo(-hR * 0.4, -hT * 0.18);
            ctx.quadraticCurveTo(-hR * 0.1, hT * 0.5, 0, hT);
            ctx.quadraticCurveTo(hR * 0.1, hT * 0.5, hR * 0.4, -hT * 0.18);
            ctx.fillStyle = "rgba(180,90,20,0.7)";
            ctx.fill();
            ctx.beginPath();
            ctx.arc(0, -hT * 0.4, hR, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(180,90,20,0.7)";
            ctx.fill();
            ctx.strokeStyle = "rgba(120,55,10,0.6)";
            ctx.lineWidth = 0.8;
            ctx.stroke();
            ctx.restore();
            ctx.font = `bold 9px 'Cinzel', serif`;
            ctx.textAlign = "center";
            const label = m.nombre;
            const metrics = ctx.measureText(label);
            const lw = metrics.width + 12;
            ctx.fillStyle = `${bg}cc`;
            ctx.beginPath();
            ctx.rect(-lw / 2, -27, lw, 14);
            ctx.fill();
            ctx.fillStyle = "#f97316";
            ctx.fillText(label, 0, -17);
            ctx.restore();
          }
        }

      } else if (!img || !imgLoaded || showCompass) {
        // ── Antique compass rose — shown on first open for ≥5s, or while image loads ──
        const { accent, primary, isDark: _isDark } = cssColorsRef.current;
        const cx2 = canvas.width  / 2;
        const cy2 = canvas.height / 2;

        // Track when the compass first appeared
        if (compassStartRef.current === null) compassStartRef.current = t;
        const elapsed = t - compassStartRef.current;
        const SPIN_DURATION = 9000; // ms to complete the spin
        const progress = Math.min(elapsed / SPIN_DURATION, 1);
        // ease-out quint: very gradual deceleration
        const eased = 1 - Math.pow(1 - progress, 5);

        // Outer ring: 1 full rotation; inner rose: 1.5 rotations (opposite)
        const angleOuter =  eased * Math.PI * 2;
        const angleInner = -eased * Math.PI * 3;

        // Pulse fades in, then settles once stopped
        // When image is loaded but still in 5s hold window, fade the compass out
        // compassStartRef tracks when compass first appeared; 5s hold starts at load
        // We fade out in the last 1.2s of the 5s window via imgLoaded flag
        const basePulse = progress < 1
          ? 0.55 + 0.2 * Math.sin(t * 0.0018)
          : 0.65;
        const pulse = basePulse;

        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.translate(cx2, cy2);

        const R = Math.min(canvas.width, canvas.height) * 0.22; // overall scale

        // ── Outer ring with tick marks ──────────────────────────────────
        ctx.save();
        ctx.rotate(angleOuter);
        ctx.beginPath();
        ctx.arc(0, 0, R, 0, Math.PI * 2);
        ctx.strokeStyle = `${accent}55`;
        ctx.lineWidth = 0.8;
        ctx.setLineDash([4, 9]);
        ctx.stroke();
        ctx.setLineDash([]);
        // 16 tick marks
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          const long = i % 4 === 0;
          const r1 = long ? R * 0.84 : R * 0.9;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r1,          Math.sin(a) * r1);
          ctx.lineTo(Math.cos(a) * R,            Math.sin(a) * R);
          ctx.strokeStyle = long ? `${accent}77` : `${accent}40`;
          ctx.lineWidth   = long ? 1.2 : 0.6;
          ctx.stroke();
        }
        // Second inner ring
        ctx.beginPath();
        ctx.arc(0, 0, R * 0.72, 0, Math.PI * 2);
        ctx.strokeStyle = `${accent}30`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
        ctx.restore();

        // ── 8-pointed compass rose ────────────────────────────────────
        ctx.save();
        ctx.rotate(angleInner);
        const drawPoint = (len: number, width: number, alpha: number) => {
          ctx.beginPath();
          ctx.moveTo(0, -len);
          ctx.lineTo(-width, 0);
          ctx.lineTo(0, len * 0.18);
          ctx.lineTo(width, 0);
          ctx.closePath();
          ctx.fillStyle = accent + Math.round(alpha * 255).toString(16).padStart(2, "0");
          ctx.fill();
        };
        // 4 cardinal points
        for (let i = 0; i < 4; i++) {
          ctx.save();
          ctx.rotate((i / 4) * Math.PI * 2);
          drawPoint(R * 0.62, R * 0.07, i === 0 ? 0.85 : 0.45);
          ctx.restore();
        }
        // 4 diagonal points (smaller)
        for (let i = 0; i < 4; i++) {
          ctx.save();
          ctx.rotate((i / 4) * Math.PI * 2 + Math.PI / 4);
          drawPoint(R * 0.38, R * 0.045, 0.28);
          ctx.restore();
        }
        // Center jewel
        ctx.beginPath();
        ctx.arc(0, 0, R * 0.09, 0, Math.PI * 2);
        ctx.strokeStyle = `${accent}66`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, R * 0.045, 0, Math.PI * 2);
        ctx.fillStyle = `${accent}cc`;
        ctx.fill();
        ctx.restore();

        ctx.restore();
      }

      // ── Edge vignette — subtle fade at canvas borders ─────────────────
      // Rebuild only when canvas size or bg color changes
      const { bg: bgNow } = cssColorsRef.current;
      const vigBg = fondoColor || bgNow;
      if (
        !vignetteCanvas ||
        vignetteW !== canvas.width ||
        vignetteH !== canvas.height ||
        vignetteBg !== vigBg
      ) {
        vignetteW = canvas.width;
        vignetteH = canvas.height;
        vignetteBg = vigBg;
        vignetteCanvas = new OffscreenCanvas(vignetteW, vignetteH);
        const vc = vignetteCanvas.getContext("2d")!;
        // Smaller fade zones — 18% of each dimension instead of 45%
        const eT = vignetteH * 0.18;
        const eS = vignetteW * 0.18;

        const topFog = vc.createLinearGradient(0, 0, 0, eT);
        topFog.addColorStop(0,   `${vigBg}cc`);
        topFog.addColorStop(0.4, `${vigBg}55`);
        topFog.addColorStop(1,   `${vigBg}00`);
        vc.fillStyle = topFog;
        vc.fillRect(0, 0, vignetteW, eT);

        const botFog = vc.createLinearGradient(0, vignetteH - eT, 0, vignetteH);
        botFog.addColorStop(0,   `${vigBg}00`);
        botFog.addColorStop(0.6, `${vigBg}55`);
        botFog.addColorStop(1,   `${vigBg}cc`);
        vc.fillStyle = botFog;
        vc.fillRect(0, vignetteH - eT, vignetteW, eT);

        const leftFog = vc.createLinearGradient(0, 0, eS, 0);
        leftFog.addColorStop(0,   `${vigBg}cc`);
        leftFog.addColorStop(0.4, `${vigBg}44`);
        leftFog.addColorStop(1,   `${vigBg}00`);
        vc.fillStyle = leftFog;
        vc.fillRect(0, 0, eS, vignetteH);

        const rightFog = vc.createLinearGradient(vignetteW - eS, 0, vignetteW, 0);
        rightFog.addColorStop(0,   `${vigBg}00`);
        rightFog.addColorStop(0.6, `${vigBg}44`);
        rightFog.addColorStop(1,   `${vigBg}cc`);
        vc.fillStyle = rightFog;
        vc.fillRect(vignetteW - eS, 0, eS, vignetteH);
      }
      ctx.drawImage(vignetteCanvas, 0, 0);

      animFrameRef.current = requestAnimationFrame(draw);
    };
    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [imgLoaded, showCompass, markers, hiddenMarkers, editMode, selectedMarkerId, tipo, fondoColor]);

  // Invalidate fog cache when markers, edit mode, or fondoColor changes
  useEffect(() => { fogCacheRef.current = null; }, [markers, editMode, tipo, fondoColor]);

  const hitTest = useCallback((clientX: number, clientY: number): any | null => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return null;
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const { x: cx, y: cy, scale } = camRef.current;
    const iw = imgRef.current.width * scale;
    const ih = imgRef.current.height * scale;
    for (const m of [...markers].reverse()) {
      const mx = cx + (m.coord_x / 100) * iw;
      const my = cy + (m.coord_y / 100) * ih;
      const dist = Math.hypot(px - mx, py - my);
      if (dist < 16) return m;
    }
    return null;
  }, [markers]);

  const canvasToMapPct = useCallback((clientX: number, clientY: number): [number, number] => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return [0, 0];
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const { x: cx, y: cy, scale } = camRef.current;
    const iw = imgRef.current.width * scale;
    const ih = imgRef.current.height * scale;
    const x = parseFloat(((px - cx) / iw * 100).toFixed(2));
    const y = parseFloat(((py - cy) / ih * 100).toFixed(2));
    return [x, y];
  }, []);

  const zoom = useCallback((factor: number, pivotX?: number, pivotY?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const px = pivotX ?? canvas.width / 2;
    const py = pivotY ?? canvas.height / 2;
    const cam = camRef.current;
    const newScale = Math.min(8, Math.max(0.2, cam.scale * factor));
    const sf = newScale / cam.scale;
    cam.x = px - sf * (px - cam.x);
    cam.y = py - sf * (py - cam.y);
    cam.scale = newScale;
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDragging.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY, camX: camRef.current.x, camY: camRef.current.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (e.buttons !== 1) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.hypot(dx, dy) > 3) isDragging.current = true;
    if (isDragging.current) {
      camRef.current.x = dragStart.current.camX + dx;
      camRef.current.y = dragStart.current.camY + dy;
    }
  };
  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging.current) {
      // ── Eyedropper mode — sample pixel color from the map image ──────
      if (eyedropperActive && onEyedropperPick) {
        const canvas = canvasRef.current;
        const img = imgRef.current;
        if (canvas && img) {
          const rect = canvas.getBoundingClientRect();
          const px = e.clientX - rect.left;
          const py = e.clientY - rect.top;
          // Sample from the image at clicked position (account for camera transform)
          const { x: cx, y: cy, scale } = camRef.current;
          const imgX = Math.round((px - cx) / scale);
          const imgY = Math.round((py - cy) / scale);
          // Draw just the image to a tiny offscreen canvas to read pixel
          const tmp = new OffscreenCanvas(img.width, img.height);
          const tmpCtx = tmp.getContext("2d")!;
          tmpCtx.drawImage(img, 0, 0);
          const pixel = tmpCtx.getImageData(
            Math.max(0, Math.min(imgX, img.width - 1)),
            Math.max(0, Math.min(imgY, img.height - 1)),
            1, 1
          ).data;
          const hex = "#" + [pixel[0], pixel[1], pixel[2]].map(v => v.toString(16).padStart(2, "0")).join("");
          onEyedropperPick(hex);
        }
        return;
      }
      if (editMode) {
        const hit = hitTest(e.clientX, e.clientY);
        if (hit) { onMarkerClick(hit); return; }
        const [x, y] = canvasToMapPct(e.clientX, e.clientY);
        onMapClick(x, y);
      } else {
        const hit = hitTest(e.clientX, e.clientY);
        if (hit) onMarkerClick(hit);
      }
    }
    isDragging.current = false;
  };
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.9;
    const rect = canvasRef.current!.getBoundingClientRect();
    zoom(factor, e.clientX - rect.left, e.clientY - rect.top);
  };

  const touchStartHandler = useCallback((e: TouchEvent) => {
    if (e.touches.length === 1) {
      e.preventDefault();
      isDragging.current = false;
      dragStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        camX: camRef.current.x,
        camY: camRef.current.y,
      };
      lastPinchDist.current = null;
    } else if (e.touches.length === 2) {
      e.preventDefault();
      isDragging.current = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.hypot(dx, dy);
    }
  }, []);

  const touchMoveHandler = useCallback((e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - dragStart.current.x;
      const dy = e.touches[0].clientY - dragStart.current.y;
      if (Math.hypot(dx, dy) > 3) isDragging.current = true;
      if (isDragging.current) {
        camRef.current.x = dragStart.current.camX + dx;
        camRef.current.y = dragStart.current.camY + dy;
      }
    } else if (e.touches.length === 2 && lastPinchDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const pivotX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const pivotY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) zoom(dist / lastPinchDist.current, pivotX - rect.left, pivotY - rect.top);
      lastPinchDist.current = dist;
    }
  }, [zoom]);

  const touchEndHandler = useCallback((e: TouchEvent) => {
    if (e.touches.length === 1) {
      dragStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        camX: camRef.current.x,
        camY: camRef.current.y,
      };
      isDragging.current = false;
      lastPinchDist.current = null;
      return;
    }
    if (!isDragging.current && e.changedTouches.length === 1 && e.touches.length === 0) {
      const t = e.changedTouches[0];
      const hit = hitTest(t.clientX, t.clientY);
      if (hit) onMarkerClick(hit);
    }
    isDragging.current = false;
    lastPinchDist.current = null;
  }, [hitTest, onMarkerClick]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const opts = { passive: false };
    canvas.addEventListener("touchstart", touchStartHandler, opts);
    canvas.addEventListener("touchmove", touchMoveHandler, opts);
    canvas.addEventListener("touchend", touchEndHandler, opts);
    return () => {
      canvas.removeEventListener("touchstart", touchStartHandler);
      canvas.removeEventListener("touchmove", touchMoveHandler);
      canvas.removeEventListener("touchend", touchEndHandler);
    };
  }, [touchStartHandler, touchMoveHandler, touchEndHandler]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className={`w-full h-full block ${eyedropperActive ? "cursor-crosshair" : editMode ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"}`}
        style={{ touchAction: "none" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* ── Subtle map-switch fade overlay (non-first transitions) ── */}
      {mapFading && (
        <div
          className="absolute inset-0 pointer-events-none z-20"
          style={{
            background: fondoColor || "var(--bg-main)",
            animation: "mapFadeOut 0.6s ease-out forwards",
          }}
        />
      )}

      {/* ── Inline keyframes for fade overlay ── */}
      <style>{`
        @keyframes mapFadeOut {
          0%   { opacity: 0.55; }
          100% { opacity: 0; }
        }
      `}</style>

      <div className="absolute right-4 bottom-[calc(56px+1rem)] md:bottom-6 flex flex-col gap-1.5 z-10">
        {[
          { icon: <ZoomIn size={14} />, fn: () => zoom(1.25) },
          { icon: <ZoomOut size={14} />, fn: () => zoom(0.8) },
        ].map((btn, i) => (
          <button key={i} onClick={btn.fn}
            className="w-9 h-9 flex items-center justify-center transition-all border"
            style={{
              background: "color-mix(in srgb, var(--bg-menu) 88%, transparent)",
              borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)",
              color: "var(--accent)",
              borderRadius: "2px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
            }}>
            {btn.icon}
          </button>
        ))}
        {onOpenPanel && (
          <button
            onClick={onOpenPanel}
            className="w-9 h-9 flex items-center justify-center transition-all border md:hidden"
            style={{
              background: "color-mix(in srgb, var(--primary) 80%, transparent)",
              borderColor: "color-mix(in srgb, var(--accent) 35%, transparent)",
              color: "var(--btn-text, #fff)",
              borderRadius: "2px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
            }}>
            <User size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MapaInteractivo() {
  const isAdmin = useIsAdmin();

  // reinos con caché Dexie automático — instantáneo en visitas posteriores
  const { data: reinos, setData: setReinos, loading } = useSupabaseData<any>("reinos");

  // isFirstOpen: true only the very first time the map is visited in this session
  const [isFirstOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const seen = sessionStorage.getItem("garlia_map_seen");
    if (!seen) {
      sessionStorage.setItem("garlia_map_seen", "1");
      return true;
    }
    return false;
  });

  const [detallesReino, setDetallesReino] = useState<any[]>([]);
  const [vistaActual, setVistaActual] = useState<"global" | "reino">("global");
  const [reinoSeleccionado, setReinoSeleccionado] = useState<any>(null);
  const [puntoSeleccionado, setPuntoSeleccionado] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [modifiedDetalles, setModifiedDetalles] = useState<Set<string>>(new Set());
  const [isUploadingImg, setIsUploadingImg] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [personajesReino, setPersonajesReino] = useState<any[]>([]);
  const [personajesDesbloqueados, setPersonajesDesbloqueados] = useState<Set<string>>(new Set());
  const [reinosDesbloqueados, setReinosDesbloqueados] = useState<Set<string>>(new Set());
  const [ciudadesDesbloqueadas, setCiudadesDesbloqueadas] = useState<Set<string>>(new Set());
  const [modalEntidad, setModalEntidad] = useState<EntidadModal | null>(null);
  const [cancionesPersonaje, setCancionesPersonaje] = useState<any[]>([]);
  const [cargandoCanciones, setCargandoCanciones] = useState(false);
  // Books & chapters
  const [librosReino, setLibrosReino] = useState<any[]>([]);
  const [capitulosReino, setCapitulosReino] = useState<any[]>([]);
  const [loadingLibros, setLoadingLibros] = useState(false);
  // Habitantes de la ciudad seleccionada
  const [personajesCiudad, setPersonajesCiudad] = useState<any[]>([]);
  const [criaturasCiudad, setCriaturasCiudad] = useState<any[]>([]);
  const [itemsCiudad, setItemsCiudad] = useState<any[]>([]);
  const [loadingCiudad, setLoadingCiudad] = useState(false);

  const imgInputRef = useRef<HTMLInputElement>(null);
  const currentReinoIdRef = useRef<string | null>(null);
  const showToast = (message: string, type: ToastType) => setToast({ message, type });

  // ── Fondo color (color del mar) ──────────────────────────────────────────────
  const [fondoColor, setFondoColor] = useState<string | null>(null);
  const [eyedropperActive, setEyedropperActive] = useState(false);
  const fondoColorInputRef = useRef<HTMLInputElement>(null);

  // Cargar color de fondo desde Supabase al montar
  useEffect(() => {
    supabase.from("config_mapa").select("value").eq("key", "fondo_color").single()
      .then(({ data }) => { if (data?.value) setFondoColor(data.value); });
  }, []);

  const handleFondoColorChange = async (color: string) => {
    setFondoColor(color);
    setEyedropperActive(false);
    try {
      await supabase.from("config_mapa").upsert({ key: "fondo_color", value: color }, { onConflict: "key" });
      showToast("Color del mar guardado", "success");
    } catch {
      showToast("Error al guardar el color", "error");
    }
  };

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Descubrimientos — personajes, reinos y ciudades del perfil
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      Promise.all([
        supabase.from("descubrimientos_personajes").select("personaje_id").eq("perfil_id", user.id),
        supabase.from("descubrimientos_reinos").select("reino_id").eq("perfil_id", user.id),
        supabase.from("ciudades_desbloqueadas").select("ciudad_id").eq("user_id", user.id),
      ]).then(([pRes, rRes, lRes]) => {
        if (pRes.data) setPersonajesDesbloqueados(new Set(pRes.data.map((r: any) => r.personaje_id)));
        if (rRes.data) setReinosDesbloqueados(new Set(rRes.data.map((r: any) => r.reino_id)));
        if (lRes.data) setCiudadesDesbloqueadas(new Set(lRes.data.map((r: any) => r.ciudad_id)));
      });
    });
  }, []);

  // Cargar personajes, criaturas e items cuando se selecciona una ciudad
  useEffect(() => {
    if (!puntoSeleccionado) {
      setPersonajesCiudad([]);
      setCriaturasCiudad([]);
      setItemsCiudad([]);
      return;
    }
    const ciudadId = puntoSeleccionado.id;
    const currentId = ciudadId;
    setLoadingCiudad(true);

    const run = async () => {
      // 1. Dexie cache
      if (db) {
        try {
          const [cachedP, cachedC, cachedI] = await Promise.all([
            (db as any).personajes?.filter((p: any) => p.ciudad_id === ciudadId && !p.deleted).toArray().catch(() => []) ?? [],
            (db as any).criaturas?.filter((c: any) => c.ciudad_id === ciudadId && !c.deleted).toArray().catch(() => []) ?? [],
            (db as any).items?.filter((i: any) => i.ciudad_id === ciudadId && !i.deleted).toArray().catch(() => []) ?? [],
          ]);
          if (currentId !== ciudadId) return;
          if (cachedP.length) setPersonajesCiudad(cachedP);
          if (cachedC.length) setCriaturasCiudad(cachedC);
          if (cachedI.length) setItemsCiudad(cachedI);
          if (!navigator.onLine) { setLoadingCiudad(false); return; }
        } catch {}
      }

      // 2. Supabase
      const [pRes, cRes, iRes] = await Promise.all([
        supabase.from("personajes").select("id, nombre, img_url, especie").eq("ciudad_id", ciudadId).order("nombre"),
        supabase.from("criaturas").select("id, nombre, imagen_url").eq("ciudad_id", ciudadId).order("nombre"),
        supabase.from("items").select("id, nombre, imagen_url").eq("ciudad_id", ciudadId).order("nombre"),
      ]);
      if (currentId !== ciudadId) return;
      if (!pRes.error) setPersonajesCiudad(pRes.data ?? []);
      if (!cRes.error) setCriaturasCiudad(cRes.data ?? []);
      if (!iRes.error) setItemsCiudad(iRes.data ?? []);
      setLoadingCiudad(false);
    };
    run();
  }, [puntoSeleccionado?.id]);

  // Ref para detectar si el usuario cambió de reino antes de que lleguen los datos

  const handleReinoClick = async (reino: any) => {
    if (editMode) { setReinoSeleccionado(reino); setPanelOpen(true); return; }

    // Marcar qué reino estamos cargando — cualquier respuesta async va a chequear esto
    currentReinoIdRef.current = reino.id;

    // Limpiar todo inmediatamente para no mostrar datos del reino anterior
    setReinoSeleccionado(reino);
    setPuntoSeleccionado(null);
    setVistaActual("reino");
    setPanelOpen(true);
    setDetallesReino([]);
    setPersonajesReino([]);
    setLibrosReino([]);
    setCapitulosReino([]);
    setLoadingLibros(true);

    // Helper — solo aplica el set si el usuario no cambió de reino mientras esperábamos
    const apply = (fn: () => void) => {
      if (currentReinoIdRef.current === reino.id) fn();
    };

    // ── 1. Caché Dexie — mostrar lo que ya tenemos guardado ──────────────
    if (db) {
      try {
        const [cachedDetalles, cachedPersonajes, cachedLibros, cachedCaps] = await Promise.all([
          (db as any).ciudades.where("reino_id").equals(reino.id).toArray().catch(() => []) ?? [],
          db.personajes.filter((p: any) => p.reino === reino.nombre).toArray().catch(() => []),
          db.libros.filter((l: any) => l.reino_id === reino.id).toArray().catch(() => []),
          db.capitulos.filter((c: any) => Array.isArray(c.reinos_ids) && c.reinos_ids.includes(reino.id)).toArray().catch(() => []),
        ]);
        apply(() => {
          if (cachedDetalles.length > 0) setDetallesReino(cachedDetalles.filter((d: any) => !d.deleted));
          if (cachedPersonajes.length > 0) setPersonajesReino(cachedPersonajes);
          // libros y capítulos NO se aplican desde caché para evitar spoilers —
          // se esperan los datos frescos de Supabase antes de mostrarlos
        });
      } catch { /* caché falló — no importa, el fetch de abajo lo cubre */ }
    }

    // ── 2. Fetch Supabase — siempre pisa el caché con datos frescos ──────
    const [detallesRes, personajesRes, librosRes, capitulosRes] = await Promise.all([
      supabase.from("ciudades").select("*").eq("reino_id", reino.id),
      supabase.from("personajes").select("id, nombre, img_url, especie, reino, sobre").eq("reino", reino.nombre),
      supabase.from("libros").select("id, titulo, portada_url, estado").eq("reino_id", reino.id).eq("visibilidad", "publico"),
      supabase.from("capitulos")
        .select("id, titulo_capitulo, orden, libro_id, libros(titulo)")
        .contains("reinos_ids", [reino.id])
        .eq("visibilidad", "publico")
        .order("orden", { ascending: true }),
    ]);

    // Si el usuario ya clickeó otro reino, descartar todo
    if (currentReinoIdRef.current !== reino.id) return;

    // Aplicar resultados — siempre setear aunque sea array vacío, para no dejar datos stale
    if (!detallesRes.error) {
      setDetallesReino(detallesRes.data ?? []);
      try { if (db && detallesRes.data?.length) await (db as any).ciudades.bulkPut(detallesRes.data); } catch {}
    }

    if (!personajesRes.error) {
      setPersonajesReino(personajesRes.data ?? []);
      try { if (db && personajesRes.data?.length) await db.personajes.bulkPut(personajesRes.data); } catch {}
    }

    if (!librosRes.error) {
      setLibrosReino(librosRes.data ?? []);
      try { if (db && librosRes.data?.length) await db.libros.bulkPut(librosRes.data); } catch {}
    }

    if (!capitulosRes.error) {
      const caps = (capitulosRes.data ?? []).map((c: any) => ({
        ...c,
        libro_titulo: c.libros?.titulo ?? null,
      }));
      setCapitulosReino(caps);
      try { if (db && caps.length) await db.capitulos.bulkPut(caps); } catch {}
    }

    // Libros y capítulos ya están seteados — ocultar spinner
    if (currentReinoIdRef.current === reino.id) setLoadingLibros(false);
  };

  const handlePersonajeClick = async (p: any) => {
    setCancionesPersonaje([]);
    setModalEntidad({
      tipo: "personaje",
      data: {
        tipo: "personaje",
        entidad_id: p.id,
        nombre: p.nombre,
        imagen_url: p.img_url,
        descripcion: p.sobre,
        reino: p.reino,
        especie: p.especie,
        fecha_descubrimiento: "",
      },
    });
    if (!p.id) return;
    setCargandoCanciones(true);
    try {
      const { data, error } = await supabase
        .from("canciones")
        .select("id, titulo, portada_url, info_cancion, personaje_id")
        .eq("personaje_id", p.id)
        .eq("visible", true);
      if (!error && data) setCancionesPersonaje(data);
    } catch (err) {
      console.warn("[Mapa] Error cargando canciones:", err);
    } finally {
      setCargandoCanciones(false);
    }
  };

  const handleMapClick = (x: number, y: number) => {
    if (!editMode) return;
    if (puntoSeleccionado) {
      setPuntoSeleccionado({ ...puntoSeleccionado, coord_x: x, coord_y: y });
      setDetallesReino(prev => prev.map(p => p.id === puntoSeleccionado.id ? { ...p, coord_x: x, coord_y: y } : p));
      setModifiedDetalles(prev => new Set(prev).add(puntoSeleccionado.id));
    } else if (reinoSeleccionado && vistaActual === "global") {
      setReinoSeleccionado({ ...reinoSeleccionado, coord_x: x, coord_y: y });
      setReinos(prev => prev.map(r => r.id === reinoSeleccionado.id ? { ...r, coord_x: x, coord_y: y } : r));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !reinoSeleccionado) return;
    setIsUploadingImg(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `mapas/reino_${reinoSeleccionado.id}_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("wiki").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("wiki").getPublicUrl(path);
      const mapa_url = urlData.publicUrl;
      const { error: updateError } = await supabase.from("reinos").update({ mapa_url }).eq("id", reinoSeleccionado.id);
      if (updateError) throw updateError;
      setReinoSeleccionado({ ...reinoSeleccionado, mapa_url });
      setReinos(prev => prev.map(r => r.id === reinoSeleccionado.id ? { ...r, mapa_url } : r));
      showToast("Imagen actualizada", "success");
    } catch {
      showToast("Error al subir la imagen", "error");
    } finally {
      setIsUploadingImg(false);
      if (imgInputRef.current) imgInputRef.current.value = "";
    }
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      if (vistaActual === "reino" && modifiedDetalles.size > 0) {
        const toSave = detallesReino.filter(p => modifiedDetalles.has(p.id));
        await Promise.all(toSave.map(p =>
          supabase.from("ciudades").update({
            nombre: p.nombre, descripcion: p.descripcion,
            coord_x: p.coord_x, coord_y: p.coord_y,
          }).eq("id", p.id)
        ));
        setModifiedDetalles(new Set());
      } else if (reinoSeleccionado && vistaActual === "global") {
        const { error } = await supabase.from("reinos").update({
          nombre: reinoSeleccionado.nombre, descripcion: reinoSeleccionado.descripcion,
          coord_x: reinoSeleccionado.coord_x, coord_y: reinoSeleccionado.coord_y,
        }).eq("id", reinoSeleccionado.id);
        if (error) throw error;
        setReinos(prev => prev.map(r => r.id === reinoSeleccionado.id ? reinoSeleccionado : r));
      }
      showToast("Cambios guardados", "success");
      setEditMode(false);
    } catch {
      showToast("No se pudieron guardar los cambios", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const volverAlGlobal = () => {
    setVistaActual("global");
    setReinoSeleccionado(null);
    setPuntoSeleccionado(null);
    setDetallesReino([]);
    setPersonajesReino([]);
    setLibrosReino([]);
    setCapitulosReino([]);
    setLoadingLibros(false);
    setModifiedDetalles(new Set());
    setEditMode(false);
    setPanelOpen(false);
  };

  // Visible markers: admins ven todos los reinos; usuarios solo los que desbloquearon
  const visibleMarkers = vistaActual === "global"
    ? reinos.filter(r => isAdmin ? true : reinosDesbloqueados.has(r.id))
    : detallesReino.filter(l => isAdmin ? true : ciudadesDesbloqueadas.has(l.id));

  // hiddenMarkers: para usuarios son los marcadores no desbloqueados (se muestran en niebla)
  const hiddenMarkers = vistaActual === "global"
    ? (isAdmin ? [] : reinos.filter(r => !reinosDesbloqueados.has(r.id)))
    : (isAdmin ? [] : detallesReino.filter(l => !ciudadesDesbloqueadas.has(l.id)));

  const currentImage = vistaActual === "reino" && reinoSeleccionado?.mapa_url
    ? reinoSeleccionado.mapa_url
    : "/dibujos/reinos/mapa.png";

  const panelProps = {
    editMode, reinoSeleccionado, puntoSeleccionado,
    setPuntoSeleccionado, setDetallesReino, setModifiedDetalles,
    setReinoSeleccionado, personajesReino, personajesDesbloqueados,
    handlePersonajeClick, modifiedDetalles, isSaving, handleSaveChanges,
    isUploadingImg, handleImageUpload, imgInputRef,
    librosReino, capitulosReino, loadingLibros,
    personajesCiudad, criaturasCiudad, itemsCiudad, loadingCiudad,
  };

  // Solo bloquea la UI si no hay absolutamente ningún dato todavía (primera carga ever)
  if (loading && reinos.length === 0) return (
    <div className="fixed inset-0 md:left-[68px]" style={{ background: fondoColor || "var(--bg-main)" }} />
  );

  return (
    <div className="fixed inset-0 flex overflow-hidden md:left-[68px]" style={{ background: fondoColor || "var(--bg-main)", transition: "background 0.5s ease" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&display=swap');`}</style>

      {modalEntidad && (
        <ModalDetalle
          entidad={modalEntidad}
          onClose={() => { setModalEntidad(null); setCancionesPersonaje([]); }}
          canciones={cancionesPersonaje}
          cargandoCanciones={cargandoCanciones}
        />
      )}

      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {/* ── MAP AREA ── */}
      <div className={`relative flex-1 transition-all duration-500 pb-14 md:pb-0 ${panelOpen && !isMobile ? "" : "w-full"}`}>

        {isAdmin && (
          <div className="absolute z-70 flex gap-2"
            style={{ top: (!panelOpen && (reinoSeleccionado || puntoSeleccionado)) ? "3rem" : "1rem", right: "1rem", transition: "top 0.2s ease" }}>
            <button
              onClick={() => setEditMode(!editMode)}
              className="flex items-center gap-2 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest transition-all border"
              style={{
                background: editMode
                  ? "color-mix(in srgb, #c43030 85%, var(--bg-menu))"
                  : "color-mix(in srgb, var(--bg-menu) 88%, transparent)",
                borderColor: editMode
                  ? "color-mix(in srgb, #c43030 50%, transparent)"
                  : "color-mix(in srgb, var(--primary) 30%, transparent)",
                color: editMode ? "var(--btn-text, #fff)" : "var(--accent)",
                borderRadius: "2px",
                letterSpacing: "0.12em",
                boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
              }}
            >
              {editMode ? <X size={14} /> : <Edit3 size={14} />}
              {editMode ? "Cancelar" : "Editar Mapa"}
            </button>
            {editMode && (
              <button onClick={handleSaveChanges} disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest disabled:opacity-50 transition-all"
                style={{
                  background: "color-mix(in srgb, var(--accent) 70%, #1a5c30)",
                  color: "var(--btn-text, #fff)",
                  border: "1px solid color-mix(in srgb, var(--accent) 40%, #1a5c30)",
                  borderRadius: "2px",
                  letterSpacing: "0.12em",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                }}>
                {isSaving ? <Hourglass size={14} /> : <Save size={14} />}
                Guardar
              </button>
            )}
          </div>
        )}

        <AnimatePresence>
          {editMode && (reinoSeleccionado || puntoSeleccionado) && (
            <MotionDiv initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              className="absolute left-1/2 -translate-x-1/2 z-50 text-[10px] font-semibold uppercase px-4 py-2 shadow-md flex items-center gap-2 bottom-[calc(56px+1rem)] md:bottom-16"
              style={{
                background: "color-mix(in srgb, var(--bg-menu) 92%, transparent)",
                color: "var(--accent)",
                border: "1px solid color-mix(in srgb, var(--primary) 30%, transparent)",
                borderRadius: "2px",
                letterSpacing: "0.1em",
                boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
              }}>
              <Move size={12} /> Clickeá para mover el marcador
              {modifiedDetalles.size > 1 && (
                <span className="px-1.5 py-0.5 text-[9px]" style={{ background: "color-mix(in srgb, var(--bg-main) 20%, transparent)" }}>{modifiedDetalles.size} pendientes</span>
              )}
            </MotionDiv>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {vistaActual === "reino" && (
            <MotionButton initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              onClick={volverAlGlobal}
              className="absolute top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest transition-colors"
              style={{
                background: "color-mix(in srgb, var(--bg-menu) 88%, transparent)",
                border: "1px solid color-mix(in srgb, var(--primary) 30%, transparent)",
                color: "var(--accent)",
                borderRadius: "2px",
                letterSpacing: "0.12em",
                boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
              }}>
              <ArrowLeft size={14} /> Volver
            </MotionButton>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!panelOpen && (reinoSeleccionado || puntoSeleccionado) && (
            <MotionButton
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onClick={() => setPanelOpen(true)}
              className="absolute top-4 z-50 flex items-center gap-2.5 px-3 py-2 text-[10px] font-bold uppercase transition-all"
              style={{
                right: "1rem",
                background: "color-mix(in srgb, var(--bg-menu) 92%, transparent)",
                border: "1px solid color-mix(in srgb, var(--primary) 30%, transparent)",
                color: "var(--accent)",
                borderRadius: "2px",
                letterSpacing: "0.12em",
                boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
              }}
            >
              <BookOpen size={13} />
              <span className="max-w-[120px] truncate" style={{ fontFamily: "'Cinzel', serif" }}>
                {puntoSeleccionado?.nombre ?? reinoSeleccionado?.nombre}
              </span>
            </MotionButton>
          )}
        </AnimatePresence>

        {/* ── FONDO COLOR PICKER (edit mode only) ── */}
        {isAdmin && editMode && (
          <div
            className="absolute bottom-[calc(56px+0.75rem)] md:bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-2"
            style={{
              background: "color-mix(in srgb, var(--bg-menu) 94%, transparent)",
              border: "1px solid color-mix(in srgb, var(--primary) 30%, transparent)",
              borderRadius: "2px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
              backdropFilter: "blur(4px)",
            }}
          >
            {/* Label */}
            <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap" style={{ color: "var(--accent)", letterSpacing: "0.15em" }}>
              Color Mar
            </span>

            {/* Color swatch — opens native color picker */}
            <div className="relative">
              <button
                onClick={() => fondoColorInputRef.current?.click()}
                className="w-7 h-7 border-2 transition-all"
                title="Elegir color manual"
                style={{
                  background: fondoColor || "var(--bg-main)",
                  borderColor: "color-mix(in srgb, var(--accent) 50%, transparent)",
                  borderRadius: "1px",
                  boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.2)",
                }}
              />
              <input
                ref={fondoColorInputRef}
                type="color"
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                value={fondoColor || "#5a8fa8"}
                onChange={(e) => setFondoColor(e.target.value)}
                onBlur={(e) => handleFondoColorChange(e.target.value)}
              />
            </div>

            {/* Eyedropper button */}
            <button
              onClick={() => setEyedropperActive(v => !v)}
              title="Cuentagotas — click en el mapa para samplear"
              className="w-7 h-7 flex items-center justify-center border transition-all"
              style={{
                background: eyedropperActive
                  ? "color-mix(in srgb, var(--accent) 30%, transparent)"
                  : "color-mix(in srgb, var(--primary) 15%, transparent)",
                borderColor: eyedropperActive
                  ? "var(--accent)"
                  : "color-mix(in srgb, var(--primary) 30%, transparent)",
                color: eyedropperActive ? "var(--accent)" : "color-mix(in srgb, var(--foreground) 60%, transparent)",
                borderRadius: "1px",
              }}
            >
              {/* Eyedropper SVG icon */}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m2 22 1-1h3l9-9"/>
                <path d="M3 21v-3l9-9"/>
                <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8-1.6 1.6"/>
              </svg>
            </button>

            {/* Reset */}
            {fondoColor && (
              <button
                onClick={() => handleFondoColorChange("")}
                title="Resetear a color del tema"
                className="w-7 h-7 flex items-center justify-center border transition-all"
                style={{
                  background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                  borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)",
                  color: "color-mix(in srgb, var(--foreground) 45%, transparent)",
                  borderRadius: "1px",
                }}
              >
                <X size={10} />
              </button>
            )}

            {/* Eyedropper hint */}
            {eyedropperActive && (
              <span className="text-[9px] font-semibold uppercase animate-pulse whitespace-nowrap" style={{ color: "var(--accent)", letterSpacing: "0.1em" }}>
                Clickeá el mapa
              </span>
            )}
          </div>
        )}

        <CanvasMap
          imageSrc={currentImage}
          markers={editMode ? [...visibleMarkers, ...hiddenMarkers] : visibleMarkers}
          hiddenMarkers={hiddenMarkers}
          editMode={editMode}
          onMarkerClick={(m) => {
            if (vistaActual === "global") {
              handleReinoClick(m);
            } else {
              setPuntoSeleccionado(m);
              setPanelOpen(true);
            }
          }}
          onMapClick={handleMapClick}
          selectedMarkerId={puntoSeleccionado?.id ?? reinoSeleccionado?.id ?? null}
          tipo={vistaActual}
          isFirstOpen={isFirstOpen}
          fondoColor={fondoColor}
          eyedropperActive={eyedropperActive}
          onEyedropperPick={handleFondoColorChange}
          onOpenPanel={isMobile && (reinoSeleccionado || puntoSeleccionado) ? () => setPanelOpen(true) : undefined}
        />
      </div>

      {/* ── SIDE PANEL (desktop) ── */}
      <AnimatePresence>
        {!isMobile && panelOpen && (reinoSeleccionado || puntoSeleccionado) && (
          <MotionDiv
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 380, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="relative overflow-hidden shrink-0"
            style={{
              background: "var(--white-custom)",
              borderLeft: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
              boxShadow: "-20px 0 60px rgba(0,0,0,0.4)",
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent) 50%, transparent), transparent)" }} />
            <button
              onClick={() => { setPanelOpen(false); setPuntoSeleccionado(null); }}
              className="absolute top-4 right-4 z-10 w-7 h-7 flex items-center justify-center transition-colors border"
              style={{
                background: "color-mix(in srgb, var(--bg-main) 80%, transparent)",
                borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)",
                color: "color-mix(in srgb, var(--foreground) 50%, transparent)",
                borderRadius: "1px",
              }}
            >
              <X size={12} />
            </button>
            <div className="p-8 pt-10 flex flex-col gap-4 h-full overflow-y-auto">
              <PanelContenido {...panelProps} />
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* ── BOTTOM PANEL (mobile) ── */}
      <AnimatePresence>
        {isMobile && panelOpen && (reinoSeleccionado || puntoSeleccionado) && (
          <MotionDiv
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="fixed left-0 right-0 z-999 overflow-hidden"
            style={{
              bottom: "56px",
              background: "var(--white-custom)",
              borderTop: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
              maxHeight: "60dvh",
              boxShadow: "0 -20px 60px rgba(0,0,0,0.5)",
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent) 60%, transparent), transparent)" }} />
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-0.5" style={{ background: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
            </div>
            <button
              onClick={() => { setPanelOpen(false); setPuntoSeleccionado(null); }}
              className="absolute top-3 right-4 w-7 h-7 flex items-center justify-center transition-colors"
              style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}
            >
              <X size={14} />
            </button>
            <div className="px-6 pb-8 pt-2 overflow-y-auto flex flex-col gap-4" style={{ maxHeight: "calc(65dvh - 40px)" }}>
              <PanelContenido {...panelProps} />
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}