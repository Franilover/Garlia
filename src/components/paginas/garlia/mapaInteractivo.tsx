"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import {
  MotionDiv, MotionButton,
} from "@/components/ui/Motion";
import {
  X, MapPin, Loader2, ChevronRight, ArrowLeft, House,
  Save, Edit3, ImagePlus, Move, CheckCircle2, AlertCircle, UserX, ZoomIn, ZoomOut, User,
  BookOpen, BookMarked,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { useIsAdmin } from "@/hooks/auth/useIsAdmin";
import { ModalDetalle } from "@/components/paginas/garlia/personal/PersonalComponents";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { db } from "@/lib/api/client/db";

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
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-5 py-3 shadow-lg text-[10px] font-bold uppercase tracking-widest"
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
  librosReino, capitulosReino,
}: any) {
  const router = useRouter();
  if (editMode) {
    return (
      <div className="flex flex-col gap-4 flex-grow">
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
        <div className="flex flex-col gap-1 flex-grow">
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
          <div className="flex items-center justify-between px-3 py-2.5 border"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)", background: "color-mix(in srgb, var(--bg-main) 60%, transparent)" }}>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}>Visibilidad en el mapa</p>
              <p className="text-[9px] mt-0.5" style={{ color: "color-mix(in srgb, var(--foreground) 35%, transparent)" }}>
                {reinoSeleccionado.oculto ? "Este reino no aparece para usuarios" : "Este reino es visible en el mapa"}
              </p>
            </div>
            <button
              onClick={() => setReinoSeleccionado((r: any) => ({ ...r, oculto: !r.oculto }))}
              className={`relative w-10 h-5 rounded-full transition-all border ${reinoSeleccionado.oculto ? "bg-orange-400/20 border-orange-400/40" : "bg-amber-400/15 border-amber-400/20"}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all shadow-sm ${reinoSeleccionado.oculto ? "left-5 bg-orange-400" : "left-0.5 bg-amber-400/50"}`} />
            </button>
          </div>
        )}
        {puntoSeleccionado && (
          <div className="flex items-center justify-between px-3 py-2.5 border"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)", background: "color-mix(in srgb, var(--bg-main) 60%, transparent)" }}>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}>Visibilidad en el mapa</p>
              <p className="text-[9px] mt-0.5" style={{ color: "color-mix(in srgb, var(--foreground) 35%, transparent)" }}>
                {puntoSeleccionado.oculto ? "Este punto no aparece para usuarios" : "Este punto es visible en el mapa"}
              </p>
            </div>
            <button
              onClick={() => {
                const nuevoOculto = !puntoSeleccionado.oculto;
                setPuntoSeleccionado((p: any) => ({ ...p, oculto: nuevoOculto }));
                setDetallesReino((prev: any[]) => prev.map(p => p.id === puntoSeleccionado.id ? { ...p, oculto: nuevoOculto } : p));
                setModifiedDetalles((prev: Set<string>) => new Set(prev).add(puntoSeleccionado.id));
              }}
              className={`relative w-10 h-5 rounded-full transition-all border ${puntoSeleccionado.oculto ? "bg-orange-400/20 border-orange-400/40" : "bg-amber-400/15 border-amber-400/20"}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all shadow-sm ${puntoSeleccionado.oculto ? "left-5 bg-orange-400" : "left-0.5 bg-amber-400/50"}`} />
            </button>
          </div>
        )}
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
                ? <><Loader2 size={12} className="animate-spin" /> Subiendo...</>
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
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
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

      <div className="space-y-6 flex-grow overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-accent/20">
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
        {!puntoSeleccionado && librosReino && librosReino.length > 0 && (
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
        {!puntoSeleccionado && capitulosReino && capitulosReino.length > 0 && (
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
}

function CanvasMap({ imageSrc, markers, hiddenMarkers, editMode, onMarkerClick, onMapClick, selectedMarkerId, tipo, onOpenPanel }: CanvasMapProps & { onOpenPanel?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
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
  // Theme CSS vars read at draw time
  const cssColorsRef = useRef({ primary: "#6b4423", accent: "#c08040", bg: "#f0e6d0", fg: "#2a1304", bgMenu: "#3d2010", pinFill: "#6b4423", parchBg: "#3d2010", parchText: "#2a1304" });
  // Fog cache — rebuilt only when markers/size change, not every frame
  const fogCacheRef = useRef<{ canvas: OffscreenCanvas; deep: OffscreenCanvas; iw: number; ih: number; bg: string } | null>(null);

  useEffect(() => {
    const read = () => {
      const s = getComputedStyle(document.documentElement);
      const get = (v: string) => s.getPropertyValue(v).trim();
      cssColorsRef.current = {
        primary:   get("--primary")    || "#6b4423",
        accent:    get("--accent")     || "#c08040",
        bg:        get("--bg-main")    || "#f0e6d0",
        fg:        get("--foreground") || "#2a1304",
        bgMenu:    get("--bg-menu")    || "#3d2010",
        // pin body = primary, ring/dot use accent, label uses bg-menu + foreground
        pinFill:   get("--primary")    || "#6b4423",
        parchBg:   get("--bg-menu")    || "#3d2010",
        parchText: get("--foreground") || "#2a1304",
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
    setImgLoaded(false);
    imgRef.current = null;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
    img.onload = () => {
      imgRef.current = img;
      centerImage();
      setImgLoaded(true);
    };
    img.onerror = () => {
      setTimeout(() => {
        const retry = new Image();
        retry.crossOrigin = "anonymous";
        retry.src = imageSrc + (imageSrc.includes("?") ? "&" : "?") + "_r=" + Date.now();
        retry.onload = () => { imgRef.current = retry; centerImage(); setImgLoaded(true); };
      }, 800);
    };
  }, [imageSrc, centerImage]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const resize = () => {
      const prevW = canvas.width;
      const prevH = canvas.height;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      if (imgRef.current && (prevW !== canvas.width || prevH !== canvas.height)) {
        centerImage();
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
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
      const { primary, accent, bg, fg, pinFill, parchBg, parchText } = cssColorsRef.current;

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const { x: cx, y: cy, scale } = camRef.current;
      const img = imgRef.current;

      if (img && imgLoaded) {
        const iw = img.width * scale;
        const ih = img.height * scale;

        ctx.save();
        ctx.translate(cx, cy);

        // ── Draw base map ──────────────────────────────────────────────────
        ctx.drawImage(img, 0, 0, iw, ih);

        // Subtle aged overlay
        ctx.fillStyle = "rgba(80, 40, 10, 0.06)";
        ctx.fillRect(0, 0, iw, ih);

        // ── FOG OF WAR — cached, rebuilt only when markers/bg changes ─────
        if (tipo === "global" && !editMode && hiddenMarkers.length > 0) {
          const cache = fogCacheRef.current;
          const FOG_W = Math.min(img.width, 1200);
          const FOG_H = Math.round(FOG_W * (img.height / img.width));

          const needsRebuild =
            !cache ||
            cache.iw !== FOG_W ||
            cache.ih !== FOG_H ||
            cache.bg !== bg;

          if (needsRebuild) {
            const maxDim = Math.max(FOG_W, FOG_H);
            // Clear zone around the marker center (fully revealed)
            const clearRadius = maxDim * 0.10;
            // Soft fade zone — where fog transitions to clear
            const fadeRadius  = maxDim * 0.22;

            // ── Layer 1: main opaque fog with reveal holes ────────────────
            const fogCanvas = new OffscreenCanvas(FOG_W, FOG_H);
            const fogCtx = fogCanvas.getContext("2d")!;

            // Start fully opaque — parse bg hex to get an rgb version
            // bg is a hex like "#1a1a2e"; use it with full opacity
            fogCtx.fillStyle = bg;
            fogCtx.globalAlpha = 0.92;
            fogCtx.fillRect(0, 0, FOG_W, FOG_H);
            fogCtx.globalAlpha = 1;

            // Punch holes around each visible marker with a smooth gradient
            fogCtx.globalCompositeOperation = "destination-out";
            for (const m of markers) {
              const mx = (m.coord_x / 100) * FOG_W;
              const my = (m.coord_y / 100) * FOG_H;
              const grad = fogCtx.createRadialGradient(mx, my, clearRadius * 0.2, mx, my, fadeRadius);
              grad.addColorStop(0,    "rgba(0,0,0,1)");   // fully clear at center
              grad.addColorStop(0.45, "rgba(0,0,0,0.98)"); // still very clear
              grad.addColorStop(0.72, "rgba(0,0,0,0.7)");  // starting to fog
              grad.addColorStop(0.88, "rgba(0,0,0,0.25)"); // mostly fogged
              grad.addColorStop(1,    "rgba(0,0,0,0)");    // full fog
              fogCtx.fillStyle = grad;
              fogCtx.beginPath();
              fogCtx.arc(mx, my, fadeRadius, 0, Math.PI * 2);
              fogCtx.fill();
            }
            fogCtx.globalCompositeOperation = "source-over";

            // ── Layer 2: semi-transparent overlay for depth ───────────────
            // Adds a slight extra tint on top of the fogged zones so they
            // feel heavier / more "sealed" without being pitch black.
            const deepCanvas = new OffscreenCanvas(FOG_W, FOG_H);
            const deepCtx = deepCanvas.getContext("2d")!;
            deepCtx.fillStyle = bg;
            deepCtx.globalAlpha = 0.45;
            deepCtx.fillRect(0, 0, FOG_W, FOG_H);
            deepCtx.globalAlpha = 1;
            deepCtx.globalCompositeOperation = "destination-out";
            for (const m of markers) {
              const mx = (m.coord_x / 100) * FOG_W;
              const my = (m.coord_y / 100) * FOG_H;
              // Slightly larger clear radius so the deep layer fully reveals the center
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

            fogCacheRef.current = { canvas: fogCanvas, deep: deepCanvas, iw: FOG_W, ih: FOG_H, bg };
          }

          // Stamp cached fog layers
          const fc = fogCacheRef.current!;
          ctx.drawImage(fc.canvas, 0, 0, iw, ih);
          ctx.drawImage(fc.deep,   0, 0, iw, ih);

          // ── Animated wisps — only in fogged regions ───────────────────
          // We clip wisps away from marker centers so they never cover revealed areas
          const fogTime = t * 0.00025;
          const maxDim = Math.max(iw, ih);
          const clearR = maxDim * 0.10;

          ctx.save();
          // Build a clipping region that excludes the revealed zones
          ctx.beginPath();
          ctx.rect(0, 0, iw, ih);
          for (const m of markers) {
            const mx = (m.coord_x / 100) * iw;
            const my = (m.coord_y / 100) * ih;
            // Clip out a circle around each marker center (anticlockwise = subtract)
            ctx.arc(mx, my, clearR * 1.8, 0, Math.PI * 2, true);
          }
          ctx.clip("evenodd");

          // Fewer wisps on mobile to save GPU
          const wispCount = isMobileDevice ? 2 : 5;
          ctx.globalAlpha = 0.07;
          for (let i = 0; i < wispCount; i++) {
            const wx = ((Math.sin(fogTime * (0.6 + i * 0.25) + i * 1.3) + 1) / 2) * iw;
            const wy = ((Math.cos(fogTime * (0.45 + i * 0.18) + i * 1.0) + 1) / 2) * ih;
            const wr = iw * (0.06 + i * 0.025);
            const wg = ctx.createRadialGradient(wx, wy, 0, wx, wy, wr);
            wg.addColorStop(0, "rgba(210,200,190,0.55)");
            wg.addColorStop(1, "rgba(210,200,190,0)");
            ctx.fillStyle = wg;
            ctx.beginPath();
            ctx.arc(wx, wy, wr, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          ctx.restore();
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
          // Colors driven by CSS theme vars
          const pinBody    = isSelected ? parchBg  : parchBg;
          const pinBorder  = isSelected ? primary  : `${parchBg}cc`;
          const pinRing    = isSelected ? `${accent}99` : `${primary}66`;
          const pinDot     = isSelected ? accent   : accent;

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
              ? `rgba(160,120,60,${0.18 * (1 - pulse)})`
              : `rgba(100,75,40,${0.12 * (1 - pulse)})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }

          if (editMode) {
            ctx.beginPath();
            ctx.arc(headR, -tailH * 0.4 - headR, 3, 0, Math.PI * 2);
            ctx.fillStyle = accent;
            ctx.fill();
            if (m.oculto) {
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

          // Background from theme
          ctx.fillStyle = isSelected
            ? `${parchBg}f0`
            : `${parchBg}d8`;
          ctx.beginPath();
          ctx.rect(-lw / 2, labelY, lw, lh);
          ctx.fill();

          // Border from primary
          ctx.strokeStyle = isSelected
            ? `${primary}88`
            : `${primary}44`;
          ctx.lineWidth = 0.6;
          ctx.stroke();

          // Text from foreground
          ctx.fillStyle = isSelected ? fg : `${parchText}ee`;
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

      } else {
        const gr = ctx.createLinearGradient(0, 0, canvas.width, 0);
        const off = ((t * 0.001) % 1);
        const { primary, accent } = cssColorsRef.current;
        gr.addColorStop(Math.max(0, off - 0.1), `${primary}1a`);
        gr.addColorStop(off, `${accent}20`);
        gr.addColorStop(Math.min(1, off + 0.1), `${primary}1a`);
        ctx.fillStyle = gr;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // ── Edge vignette — subtle fade at canvas borders ─────────────────
      // Rebuild only when canvas size or bg color changes
      const { bg: bgNow } = cssColorsRef.current;
      if (
        !vignetteCanvas ||
        vignetteW !== canvas.width ||
        vignetteH !== canvas.height ||
        vignetteBg !== bgNow
      ) {
        vignetteW = canvas.width;
        vignetteH = canvas.height;
        vignetteBg = bgNow;
        vignetteCanvas = new OffscreenCanvas(vignetteW, vignetteH);
        const vc = vignetteCanvas.getContext("2d")!;
        // Smaller fade zones — 18% of each dimension instead of 45%
        const eT = vignetteH * 0.18;
        const eS = vignetteW * 0.18;

        const topFog = vc.createLinearGradient(0, 0, 0, eT);
        topFog.addColorStop(0,   `${bgNow}cc`);
        topFog.addColorStop(0.4, `${bgNow}55`);
        topFog.addColorStop(1,   `${bgNow}00`);
        vc.fillStyle = topFog;
        vc.fillRect(0, 0, vignetteW, eT);

        const botFog = vc.createLinearGradient(0, vignetteH - eT, 0, vignetteH);
        botFog.addColorStop(0,   `${bgNow}00`);
        botFog.addColorStop(0.6, `${bgNow}55`);
        botFog.addColorStop(1,   `${bgNow}cc`);
        vc.fillStyle = botFog;
        vc.fillRect(0, vignetteH - eT, vignetteW, eT);

        const leftFog = vc.createLinearGradient(0, 0, eS, 0);
        leftFog.addColorStop(0,   `${bgNow}cc`);
        leftFog.addColorStop(0.4, `${bgNow}44`);
        leftFog.addColorStop(1,   `${bgNow}00`);
        vc.fillStyle = leftFog;
        vc.fillRect(0, 0, eS, vignetteH);

        const rightFog = vc.createLinearGradient(vignetteW - eS, 0, vignetteW, 0);
        rightFog.addColorStop(0,   `${bgNow}00`);
        rightFog.addColorStop(0.6, `${bgNow}44`);
        rightFog.addColorStop(1,   `${bgNow}cc`);
        vc.fillStyle = rightFog;
        vc.fillRect(vignetteW - eS, 0, eS, vignetteH);
      }
      ctx.drawImage(vignetteCanvas, 0, 0);

      animFrameRef.current = requestAnimationFrame(draw);
    };
    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [imgLoaded, markers, hiddenMarkers, editMode, selectedMarkerId, tipo]);

  // Invalidate fog cache when markers or edit mode changes
  useEffect(() => { fogCacheRef.current = null; }, [markers, editMode, tipo]);

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
        className={`w-full h-full block ${editMode ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"}`}
        style={{ touchAction: "none" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      />
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
  const [modalEntidad, setModalEntidad] = useState<EntidadModal | null>(null);
  // Books & chapters
  const [librosReino, setLibrosReino] = useState<any[]>([]);
  const [capitulosReino, setCapitulosReino] = useState<any[]>([]);

  const imgInputRef = useRef<HTMLInputElement>(null);
  const showToast = (message: string, type: ToastType) => setToast({ message, type });

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Solo descubrimientos — reinos ya lo maneja useSupabaseData
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("descubrimientos_personajes")
        .select("personaje_id")
        .eq("perfil_id", user.id)
        .then(({ data }) => {
          if (data) setPersonajesDesbloqueados(new Set(data.map((r: any) => r.personaje_id)));
        });
    });
  }, []);

  const handleReinoClick = async (reino: any) => {
    if (editMode) { setReinoSeleccionado(reino); setPanelOpen(true); return; }

    // Abrir el panel inmediatamente sin esperar las queries
    setReinoSeleccionado(reino);
    setPuntoSeleccionado(null);
    setVistaActual("reino");
    setPanelOpen(true);
    setPersonajesReino([]);
    setLibrosReino([]);
    setCapitulosReino([]);

    // Mostrar detalles desde Dexie si ya los tenemos cacheados
    try {
      if (db) {
        const cached = await db.reino_detalles
          .where("reino_id").equals(reino.id)
          .toArray();
        if (cached.length > 0) {
          setDetallesReino(cached.filter((d: any) => !d.deleted));
        } else {
          setDetallesReino([]);
        }
      }
    } catch {
      setDetallesReino([]);
    }

    // Fetch en background — la UI ya está abierta
    const [detallesRes, personajesRes, librosRes, capitulosRes] = await Promise.all([
      supabase.from("reino_detalles").select("*").eq("reino_id", reino.id),
      supabase.from("personajes").select("id, nombre, img_url, especie, reino, sobre").eq("reino", reino.nombre),
      supabase.from("libros").select("id, titulo, portada_url, estado").eq("reino_id", reino.id).eq("visibilidad", "publico"),
      supabase.from("capitulos")
        .select("id, titulo_capitulo, orden, libro_id, libros(titulo)")
        .eq("reino_id", reino.id)
        .eq("visibilidad", "publico")
        .order("orden", { ascending: true }),
    ]);

    if (!detallesRes.error && detallesRes.data) {
      setDetallesReino(detallesRes.data);
      // Guardar en Dexie para próxima visita
      try {
        if (db) await db.reino_detalles.bulkPut(detallesRes.data);
      } catch {}
    }

    if (!personajesRes.error) setPersonajesReino(personajesRes.data ?? []);
    if (!librosRes.error) setLibrosReino(librosRes.data ?? []);
    if (!capitulosRes.error) {
      setCapitulosReino(
        (capitulosRes.data ?? []).map((c: any) => ({
          ...c,
          libro_titulo: c.libros?.titulo ?? null,
        }))
      );
    }
  };

  const handlePersonajeClick = (p: any) => {
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
          supabase.from("reino_detalles").update({
            nombre: p.nombre, descripcion: p.descripcion,
            coord_x: p.coord_x, coord_y: p.coord_y, oculto: p.oculto ?? false,
          }).eq("id", p.id)
        ));
        setModifiedDetalles(new Set());
      } else if (reinoSeleccionado && vistaActual === "global") {
        const { error } = await supabase.from("reinos").update({
          nombre: reinoSeleccionado.nombre, descripcion: reinoSeleccionado.descripcion,
          coord_x: reinoSeleccionado.coord_x, coord_y: reinoSeleccionado.coord_y,
          oculto: reinoSeleccionado.oculto ?? false,
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
    setModifiedDetalles(new Set());
    setEditMode(false);
    setPanelOpen(false);
  };

  // Visible markers (shown to users) vs hidden (fog-covered, shown only to admin)
  const visibleMarkers = vistaActual === "global"
    ? reinos.filter(r => !r.oculto)
    : detallesReino.filter(p => !p.oculto);

  const hiddenMarkers = vistaActual === "global"
    ? reinos.filter(r => r.oculto)
    : detallesReino.filter(p => p.oculto);

  // What the canvas actually draws: all if admin in edit mode, otherwise only visible
  const currentMarkers = editMode ? [...visibleMarkers, ...hiddenMarkers] : visibleMarkers;

  const currentImage = vistaActual === "reino" && reinoSeleccionado?.mapa_url
    ? reinoSeleccionado.mapa_url
    : "/dibujos/reinos/mapa.png";

  const panelProps = {
    editMode, reinoSeleccionado, puntoSeleccionado,
    setPuntoSeleccionado, setDetallesReino, setModifiedDetalles,
    setReinoSeleccionado, personajesReino, personajesDesbloqueados,
    handlePersonajeClick, modifiedDetalles, isSaving, handleSaveChanges,
    isUploadingImg, handleImageUpload, imgInputRef,
    librosReino, capitulosReino,
  };

  if (loading) return (
    <div className="fixed inset-0 md:left-[68px] flex flex-col items-center justify-center" style={{ background: "var(--bg-main)" }}>
      <div className="relative">
        <div className="w-8 h-8 border" style={{ borderColor: "color-mix(in srgb, var(--accent) 25%, transparent)", animation: "spin 3s linear infinite", borderRadius: "50%" }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "color-mix(in srgb, var(--accent) 50%, transparent)" }} />
        </div>
      </div>
      <span className="text-[9px] font-medium uppercase tracking-[0.35em] mt-5" style={{ color: "color-mix(in srgb, var(--accent) 35%, transparent)", fontFamily: "'Cinzel', serif" }}>
        Desplegando Cartografía...
      </span>
    </div>
  );

  return (
    <div className="fixed inset-0 flex overflow-hidden md:left-[68px]" style={{ background: "var(--bg-main)" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&display=swap');`}</style>

      {modalEntidad && (
        <ModalDetalle entidad={modalEntidad} onClose={() => setModalEntidad(null)} />
      )}

      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {/* ── MAP AREA ── */}
      <div className={`relative flex-1 transition-all duration-500 pb-14 md:pb-0 ${panelOpen && !isMobile ? "" : "w-full"}`}>

        {isAdmin && (
          <div className="absolute top-4 right-4 z-[70] flex gap-2">
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
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
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
            className="relative overflow-hidden flex-shrink-0"
            style={{
              background: "var(--white-custom)",
              borderLeft: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
              boxShadow: "-20px 0 60px rgba(0,0,0,0.4)",
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent) 50%, transparent), transparent)" }} />
            <button
              onClick={() => setPanelOpen(false)}
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
            className="fixed left-0 right-0 z-[999] overflow-hidden"
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
              <div className="w-10 h-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
            </div>
            <button
              onClick={() => setPanelOpen(false)}
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