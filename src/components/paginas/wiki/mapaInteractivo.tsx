"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import {
  MotionDiv, MotionButton,
} from "@/components/ui/Motion";
import {
  X, MapPin, Loader2, ChevronRight, ArrowLeft, House,
  Save, Edit3, ImagePlus, Move, CheckCircle2, AlertCircle, UserX, ZoomIn, ZoomOut, User,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { useIsAdmin } from "@/hooks/auth/useIsAdmin";
import { ModalDetalle } from "@/components/paginas/wiki/personal/PersonalComponents";

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
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-5 py-3 shadow-xl text-[11px] font-black uppercase tracking-wide"
      style={{
        clipPath: "polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)",
        background: type === "success" ? "rgba(5,150,105,0.95)" : "rgba(185,28,28,0.95)",
        color: "var(--btn-text, #fff)",
        border: `1px solid ${type === "success" ? "rgba(52,211,153,0.4)" : "rgba(248,113,113,0.4)"}`,
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
}: any) {
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
            className="input-brand font-black uppercase text-xl outline-none px-4 py-3"
            style={{ clipPath: "polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)" }}
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
          style={{ clipPath: "polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)" }}
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
        <h2 className="font-black text-3xl uppercase tracking-[0.12em] leading-none text-center"
          style={{ fontFamily: "'Cinzel', serif", color: "var(--foreground)", textShadow: "0 0 30px color-mix(in srgb, var(--accent) 30%, transparent)" }}>
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
          {/* Corner decorations */}
          <div className="absolute top-0 left-0 w-3 h-3 border-t border-l" style={{ borderColor: "color-mix(in srgb, var(--accent) 50%, transparent)" }} />
          <div className="absolute top-0 right-0 w-3 h-3 border-t border-r" style={{ borderColor: "color-mix(in srgb, var(--accent) 50%, transparent)" }} />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l" style={{ borderColor: "color-mix(in srgb, var(--accent) 50%, transparent)" }} />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r" style={{ borderColor: "color-mix(in srgb, var(--accent) 50%, transparent)" }} />
          <p className="text-sm italic leading-relaxed" style={{ color: "color-mix(in srgb, var(--foreground) 70%, transparent)" }}>
            &ldquo;{puntoSeleccionado ? puntoSeleccionado.descripcion : reinoSeleccionado.descripcion}&rdquo;
          </p>
        </div>

        {/* Characters list */}
        {!puntoSeleccionado && personajesReino.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1" style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)" }} />
              <span className="text-[8px] font-black uppercase tracking-[0.3em]" style={{ color: "color-mix(in srgb, var(--accent) 60%, transparent)" }}>Habitantes conocidos</span>
              <div className="h-px flex-1" style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)" }} />
            </div>
            <div className="flex flex-col gap-2">
              {personajesReino.map((p: any) => {
                const desbloqueado = personajesDesbloqueados.has(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={desbloqueado ? () => handlePersonajeClick(p) : undefined}
                    className="flex items-center gap-3 p-2.5 w-full text-left transition-all group"
                    style={{
                      background: desbloqueado
                        ? "color-mix(in srgb, var(--primary) 15%, transparent)"
                        : "color-mix(in srgb, var(--bg-main) 50%, transparent)",
                      border: `1px solid ${desbloqueado ? "color-mix(in srgb, var(--accent) 20%, transparent)" : "color-mix(in srgb, var(--accent) 7%, transparent)"}`,
                      opacity: desbloqueado ? 1 : 0.5,
                      cursor: desbloqueado ? "pointer" : "default",
                    }}
                  >
                    <div
                      className="shrink-0 w-9 h-9 overflow-hidden flex items-center justify-center border"
                      style={{
                        borderColor: desbloqueado ? "color-mix(in srgb, var(--accent) 25%, transparent)" : "color-mix(in srgb, var(--accent) 8%, transparent)",
                        background: "color-mix(in srgb, var(--bg-main) 80%, transparent)",
                        filter: desbloqueado ? "none" : "grayscale(100%) blur(2px)",
                      }}
                    >
                      {desbloqueado && p.img_url
                        ? <img src={p.img_url} alt={p.nombre} className="w-full h-full object-cover" />
                        : <UserX size={14} style={{ color: "color-mix(in srgb, var(--accent) 30%, transparent)" }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black uppercase leading-tight"
                        style={{
                          color: desbloqueado ? "var(--foreground)" : "color-mix(in srgb, var(--accent) 30%, transparent)",
                          textDecoration: desbloqueado ? "none" : "line-through",
                          textDecorationColor: "color-mix(in srgb, var(--accent) 30%, transparent)",
                        }}>
                        {desbloqueado ? p.nombre : "???"}
                      </p>
                      {p.especie && (
                        <p className="text-[9px] font-medium mt-0.5" style={{ color: "color-mix(in srgb, var(--accent) 55%, transparent)" }}>
                          {desbloqueado ? p.especie : "Desconocido"}
                        </p>
                      )}
                    </div>
                    {desbloqueado ? (
                      <span className="shrink-0 text-[7px] font-black uppercase px-1.5 py-0.5 tracking-wide flex items-center gap-1"
                        style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)" }}>
                        Ver <ChevronRight size={8} />
                      </span>
                    ) : (
                      <span className="shrink-0 text-[7px] font-black uppercase px-1.5 py-0.5 tracking-wide"
                        style={{ background: "color-mix(in srgb, var(--accent) 4%, transparent)", color: "color-mix(in srgb, var(--accent) 25%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 8%, transparent)" }}>
                        ???
                      </span>
                    )}
                  </button>
                );
              })}
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
  editMode: boolean;
  onMarkerClick: (marker: any) => void;
  onMapClick: (x: number, y: number) => void;
  selectedMarkerId?: string | null;
  tipo: "global" | "reino";
}

function CanvasMap({ imageSrc, markers, editMode, onMarkerClick, onMapClick, selectedMarkerId, tipo, onOpenPanel }: CanvasMapProps & { onOpenPanel?: () => void }) {
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
  const cssColorsRef = useRef({ primary: "#888", accent: "#aaa", bg: "#0a0806", fg: "#fff" });

  // Read CSS vars once mounted and on theme change
  useEffect(() => {
    const read = () => {
      const s = getComputedStyle(document.documentElement);
      cssColorsRef.current = {
        primary: s.getPropertyValue("--primary").trim() || "#888",
        accent: s.getPropertyValue("--accent").trim() || "#aaa",
        bg: s.getPropertyValue("--bg-main").trim() || "#0a0806",
        fg: s.getPropertyValue("--foreground").trim() || "#fff",
      };
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    return () => obs.disconnect();
  }, []);

  // Helper: fit image to canvas
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

  // Load image
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
      // Retry once after 800ms in case of transient CDN/network error
      setTimeout(() => {
        const retry = new Image();
        retry.crossOrigin = "anonymous";
        retry.src = imageSrc + (imageSrc.includes("?") ? "&" : "?") + "_r=" + Date.now();
        retry.onload = () => { imgRef.current = retry; centerImage(); setImgLoaded(true); };
      }, 800);
    };
  }, [imageSrc, centerImage]);

  // Resize canvas — re-center image on each resize
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const resize = () => {
      const prevW = canvas.width;
      const prevH = canvas.height;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      // Re-center only if image is loaded and canvas actually changed size
      if (imgRef.current && (prevW !== canvas.width || prevH !== canvas.height)) {
        centerImage();
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, [centerImage]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = (t: number) => {
      pulseRef.current = t;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const { primary, accent, bg } = cssColorsRef.current;

      // Background
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const { x: cx, y: cy, scale } = camRef.current;
      const img = imgRef.current;

      if (img && imgLoaded) {
        const iw = img.width * scale;
        const ih = img.height * scale;

        // Vignette / fog border before drawing map
        ctx.save();
        ctx.translate(cx, cy);

        // Draw map image
        ctx.drawImage(img, 0, 0, iw, ih);

        // Subtle overlay for aged look
        ctx.fillStyle = "rgba(80, 40, 10, 0.06)";
        ctx.fillRect(0, 0, iw, ih);

        // Vignette over the map
        const vgr = ctx.createRadialGradient(iw / 2, ih / 2, ih * 0.3, iw / 2, ih / 2, Math.max(iw, ih) * 0.72);
        vgr.addColorStop(0, "rgba(0,0,0,0)");
        vgr.addColorStop(1, `${bg}aa`);
        ctx.fillStyle = vgr;
        ctx.fillRect(0, 0, iw, ih);

        ctx.restore();

        // Draw markers
        for (const m of markers) {
          const mx = cx + (m.coord_x / 100) * iw;
          const my = cy + (m.coord_y / 100) * ih;
          const isSelected = m.id === selectedMarkerId;
          const pulse = (Math.sin(t * 0.002 + m.coord_x) + 1) / 2;

          ctx.save();
          ctx.translate(mx, my);

          // Outer pulse ring
          const ringR = 14 + pulse * 8;
          ctx.beginPath();
          ctx.arc(0, 0, ringR, 0, Math.PI * 2);
          ctx.strokeStyle = isSelected
            ? `${accent}${Math.round(0.5 * (1 - pulse) * 255).toString(16).padStart(2, "0")}`
            : `${primary}${Math.round(0.35 * (1 - pulse) * 255).toString(16).padStart(2, "0")}`;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Inner glow
          const grd = ctx.createRadialGradient(0, 0, 2, 0, 0, 10);
          if (isSelected) {
            grd.addColorStop(0, `${accent}e6`);
            grd.addColorStop(1, `${accent}00`);
          } else {
            grd.addColorStop(0, `${primary}99`);
            grd.addColorStop(1, `${primary}00`);
          }
          ctx.beginPath();
          ctx.arc(0, 0, 10, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();

          // Diamond marker shape
          ctx.save();
          ctx.rotate(Math.PI / 4);
          const d = isSelected ? 6 : 5;
          ctx.fillStyle = isSelected ? accent : primary;
          ctx.shadowColor = isSelected ? `${accent}cc` : `${primary}66`;
          ctx.shadowBlur = isSelected ? 12 : 6;
          ctx.fillRect(-d, -d, d * 2, d * 2);
          // Inner diamond highlight
          ctx.fillStyle = isSelected ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)";
          ctx.shadowBlur = 0;
          const di = d * 0.45;
          ctx.fillRect(-di, -di, di * 2, di * 2);
          ctx.restore();

          // Edit mode indicator
          if (editMode) {
            ctx.beginPath();
            ctx.arc(6, -6, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = accent;
            ctx.fill();
            if (m.oculto) {
              ctx.beginPath();
              ctx.arc(-6, 6, 3.5, 0, Math.PI * 2);
              ctx.fillStyle = "#f97316";
              ctx.fill();
            }
          }

          // Label
          ctx.font = `bold ${scale > 0.7 ? 10 : 9}px 'Cinzel', serif`;
          ctx.textAlign = "center";
          const label = m.nombre;
          const metrics = ctx.measureText(label);
          const lw = metrics.width + 12;
          const lh = 14;
          const ly = -20;

          // Label bg
          ctx.fillStyle = `${bg}d4`;
          ctx.beginPath();
          ctx.rect(-lw / 2, ly - lh / 2, lw, lh);
          ctx.fill();

          // Label border
          ctx.strokeStyle = isSelected ? `${accent}80` : `${primary}59`;
          ctx.lineWidth = 0.75;
          ctx.stroke();

          // Label text
          ctx.fillStyle = isSelected ? accent : primary;
          ctx.fillText(label, 0, ly + 4);

          ctx.restore();
        }
      } else {
        // Loading shimmer using theme accent
        const gr = ctx.createLinearGradient(0, 0, canvas.width, 0);
        const off = ((t * 0.001) % 1);
        gr.addColorStop(Math.max(0, off - 0.1), `${primary}1a`);
        gr.addColorStop(off, `${accent}20`);
        gr.addColorStop(Math.min(1, off + 0.1), `${primary}1a`);
        ctx.fillStyle = gr;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Outer canvas vignette
      const outerVg = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.height * 0.25,
        canvas.width / 2, canvas.height / 2, canvas.height * 0.75
      );
      outerVg.addColorStop(0, "rgba(0,0,0,0)");
      outerVg.addColorStop(1, `${bg}b3`);
      ctx.fillStyle = outerVg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [imgLoaded, markers, editMode, selectedMarkerId]);

  // Hit test markers
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

  // Convert canvas coords to map %
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

  // Zoom helper
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

  // Mouse events
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

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDragging.current = false;
      dragStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        camX: camRef.current.x,
        camY: camRef.current.y,
      };
      lastPinchDist.current = null;
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
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
      const rect = canvasRef.current!.getBoundingClientRect();
      zoom(dist / lastPinchDist.current, pivotX - rect.left, pivotY - rect.top);
      lastPinchDist.current = dist;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging.current && e.changedTouches.length === 1) {
      const t = e.changedTouches[0];
      const hit = hitTest(t.clientX, t.clientY);
      if (hit) onMarkerClick(hit);
    }
    isDragging.current = false;
    lastPinchDist.current = null;
  };

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className={`w-full h-full block ${editMode ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      {/* Zoom controls + mobile panel button */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-1.5 z-10">
        {[
          { icon: <ZoomIn size={14} />, fn: () => zoom(1.25) },
          { icon: <ZoomOut size={14} />, fn: () => zoom(0.8) },
        ].map((btn, i) => (
          <button key={i} onClick={btn.fn}
            className="w-9 h-9 flex items-center justify-center transition-colors border"
            style={{
              background: "color-mix(in srgb, var(--bg-menu) 90%, transparent)",
              borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)",
              color: "var(--accent)",
              clipPath: "polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%)",
            }}>
            {btn.icon}
          </button>
        ))}
        {/* Mobile-only: open details panel button */}
        {onOpenPanel && (
          <button
            onClick={onOpenPanel}
            className="w-9 h-9 flex items-center justify-center transition-all border md:hidden"
            style={{
              background: "color-mix(in srgb, var(--primary) 85%, transparent)",
              borderColor: "color-mix(in srgb, var(--accent) 40%, transparent)",
              color: "var(--btn-text, #fff)",
              clipPath: "polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%)",
              boxShadow: "0 0 12px color-mix(in srgb, var(--accent) 25%, transparent)",
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
  const [reinos, setReinos] = useState<any[]>([]);
  const [detallesReino, setDetallesReino] = useState<any[]>([]);
  const [vistaActual, setVistaActual] = useState<"global" | "reino">("global");
  const [reinoSeleccionado, setReinoSeleccionado] = useState<any>(null);
  const [puntoSeleccionado, setPuntoSeleccionado] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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
  const imgInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: ToastType) => setToast({ message, type });

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    supabase.from("reinos").select("*").then(({ data, error }) => {
      if (!error && data) setReinos(data);
      setLoading(false);
    });
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("descubrimientos_personajes").select("personaje_id").eq("perfil_id", user.id).then(({ data }) => {
        if (data) setPersonajesDesbloqueados(new Set(data.map((r: any) => r.personaje_id)));
      });
    });
  }, []);

  const handleReinoClick = async (reino: any) => {
    if (editMode) { setReinoSeleccionado(reino); setPanelOpen(true); return; }
    setReinoSeleccionado(reino);
    setPersonajesReino([]);
    setPuntoSeleccionado(null);
    const [detallesRes, personajesRes] = await Promise.all([
      supabase.from("reino_detalles").select("*").eq("reino_id", reino.id),
      supabase.from("personajes").select("id, nombre, img_url, especie, reino, sobre").eq("reino", reino.nombre),
    ]);
    if (!detallesRes.error) setDetallesReino(detallesRes.data ?? []);
    if (!personajesRes.error) setPersonajesReino(personajesRes.data ?? []);
    setVistaActual("reino");
    setPanelOpen(true);
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
    setModifiedDetalles(new Set());
    setEditMode(false);
    setPanelOpen(false);
  };

  const currentMarkers = vistaActual === "global"
    ? reinos.filter(r => editMode || !r.oculto)
    : detallesReino.filter(p => editMode || !p.oculto);

  const currentImage = vistaActual === "reino" && reinoSeleccionado?.mapa_url
    ? reinoSeleccionado.mapa_url
    : "/dibujos/reinos/mapa.png";

  const panelProps = {
    editMode, reinoSeleccionado, puntoSeleccionado,
    setPuntoSeleccionado, setDetallesReino, setModifiedDetalles,
    setReinoSeleccionado, personajesReino, personajesDesbloqueados,
    handlePersonajeClick, modifiedDetalles, isSaving, handleSaveChanges,
    isUploadingImg, handleImageUpload, imgInputRef,
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20" style={{ background: "var(--bg-main)", minHeight: "100dvh" }}>
      <div className="relative">
        <div className="w-8 h-8 rotate-45 animate-spin border" style={{ borderColor: "color-mix(in srgb, var(--accent) 40%, transparent)" }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 rotate-45" style={{ background: "color-mix(in srgb, var(--accent) 60%, transparent)" }} />
        </div>
      </div>
      <span className="text-[9px] font-black uppercase tracking-[0.3em] mt-4" style={{ color: "color-mix(in srgb, var(--accent) 40%, transparent)" }}>
        Desplegando Cartografía...
      </span>
    </div>
  );

  return (
    <div className="relative w-full flex" style={{ minHeight: "100dvh", background: "var(--bg-main)" }}>
      {/* Google Font: Cinzel for map labels */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&display=swap');`}</style>

      {/* Modal */}
      {modalEntidad && (
        <ModalDetalle entidad={modalEntidad} onClose={() => setModalEntidad(null)} />
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {/* ── MAP AREA ── */}
      <div className={`relative flex-1 transition-all duration-500 ${panelOpen && !isMobile ? "" : "w-full"}`}
        style={{ minHeight: "100dvh" }}>

        {/* Admin toolbar */}
        {isAdmin && (
          <div className="absolute top-4 right-4 z-[70] flex gap-2">
            <button
              onClick={() => setEditMode(!editMode)}
              className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase transition-all border"
              style={{
                background: editMode ? "rgba(220,38,38,0.9)" : "color-mix(in srgb, var(--bg-menu) 90%, transparent)",
                borderColor: editMode ? "#dc2626" : "color-mix(in srgb, var(--primary) 30%, transparent)",
                color: editMode ? "var(--btn-text, #fff)" : "var(--accent)",
                clipPath: "polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)",
              }}
            >
              {editMode ? <X size={14} /> : <Edit3 size={14} />}
              {editMode ? "Cancelar" : "Editar Mapa"}
            </button>
            {editMode && (
              <button onClick={handleSaveChanges} disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase disabled:opacity-50 transition-all"
                style={{
                  background: "rgba(5,150,105,0.9)",
                  color: "#fff",
                  clipPath: "polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)",
                }}>
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Guardar
              </button>
            )}
          </div>
        )}

        {/* Edit mode hint */}
        <AnimatePresence>
          {editMode && (reinoSeleccionado || puntoSeleccionado) && (
            <MotionDiv initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 text-[10px] font-black uppercase px-4 py-2 shadow-lg flex items-center gap-2"
              style={{
                background: "var(--accent)",
                color: "var(--bg-main)",
                clipPath: "polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)",
              }}>
              <Move size={12} /> Clickeá para mover el marcador
              {modifiedDetalles.size > 1 && (
                <span className="px-1.5 py-0.5 text-[9px]" style={{ background: "color-mix(in srgb, var(--bg-main) 20%, transparent)" }}>{modifiedDetalles.size} pendientes</span>
              )}
            </MotionDiv>
          )}
        </AnimatePresence>

        {/* Back button */}
        <AnimatePresence>
          {vistaActual === "reino" && (
            <MotionButton initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              onClick={volverAlGlobal}
              className="absolute top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase transition-colors"
              style={{
                background: "color-mix(in srgb, var(--bg-menu) 90%, transparent)",
                border: "1px solid color-mix(in srgb, var(--primary) 30%, transparent)",
                color: "var(--accent)",
                clipPath: "polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)",
              }}>
              <ArrowLeft size={14} /> Volver
            </MotionButton>
          )}
        </AnimatePresence>

        {/* CANVAS MAP */}
        <CanvasMap
          imageSrc={currentImage}
          markers={currentMarkers}
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
            {/* Decorative top border */}
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent) 50%, transparent), transparent)" }} />

            {/* Close panel btn */}
            <button
              onClick={() => setPanelOpen(false)}
              className="absolute top-4 right-4 z-10 w-7 h-7 flex items-center justify-center transition-colors border"
              style={{
                background: "color-mix(in srgb, var(--bg-main) 80%, transparent)",
                borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)",
                color: "color-mix(in srgb, var(--foreground) 50%, transparent)",
                clipPath: "polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%)",
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
            className="fixed bottom-0 left-0 right-0 z-50 overflow-hidden"
            style={{
              background: "var(--white-custom)",
              borderTop: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
              maxHeight: "65dvh",
              boxShadow: "0 -20px 60px rgba(0,0,0,0.5)",
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent) 60%, transparent), transparent)" }} />
            {/* Drag handle */}
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