"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/api/client/supabase";
import SimpleImagePicker from "@/components/forms/SimpleImagePicker";
import { useAuth } from "@/providers/AuthProvider";
import { Plus, X, Loader2, Pencil, Trash2, ImageIcon, Save, Pipette } from "lucide-react";

interface GaleriaItem {
  id:           number;
  url_imagen:   string;
  bg_color:     string;
  aspect_ratio: "square" | "wide" | "portrait";
  orden:        number;
  creado_en:    string;
}

const CANVAS_RATIO = 9 / 16;

function paddingForRatio(ratio: "square" | "wide" | "portrait" | undefined) {
  if (ratio === "wide")     return `${CANVAS_RATIO * 100}%`;
  if (ratio === "portrait") return "125%"; 
  return "100%"; 
}

function useGaleria() {
  const [items,   setItems]   = useState<GaleriaItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("galeria").select("*")
      .order("orden", { ascending: true })
      .order("creado_en", { ascending: false });
    if (!error && data) setItems(data as GaleriaItem[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  return { items, setItems, loading, reload: load };
}

function ImageLightbox({ src, alt, bgColor, onClose }: {
  src: string; alt: string; bgColor: string; onClose: () => void;
}) {
  const imgRef    = useRef<HTMLImageElement>(null);
  const scaleRef  = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [visible,   setVisible]   = useState(false);

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const touchState = useRef({
    lastTap: 0, startDist: 0, startScale: 1,
    startX: 0, startY: 0, moved: false,
  });

  const applyTransform = useCallback((scale: number, x: number, y: number) => {
    scaleRef.current  = scale;
    offsetRef.current = { x, y };
    setTransform({ scale, x, y });
  }, []);

  const clampOffset = (scale: number, x: number, y: number) => {
    if (!imgRef.current) return { x, y };
    const el   = imgRef.current;
    const maxX = Math.max(0, (el.offsetWidth  * (scale - 1)) / 2);
    const maxY = Math.max(0, (el.offsetHeight * (scale - 1)) / 2);
    return { x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) };
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const ts = touchState.current;
    if (e.touches.length === 1) {
      const t = e.touches[0];
      ts.startX = t.clientX - offsetRef.current.x;
      ts.startY = t.clientY - offsetRef.current.y;
      ts.moved  = false;
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      ts.startDist  = Math.hypot(dx, dy);
      ts.startScale = scaleRef.current;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const ts = touchState.current;
    if (e.touches.length === 2) {
      const dx    = e.touches[0].clientX - e.touches[1].clientX;
      const dy    = e.touches[0].clientY - e.touches[1].clientY;
      const dist  = Math.hypot(dx, dy);
      const scale = Math.max(1, Math.min(5, ts.startScale * (dist / ts.startDist)));
      const clamped = clampOffset(scale, offsetRef.current.x, offsetRef.current.y);
      applyTransform(scale, clamped.x, clamped.y);
    } else if (e.touches.length === 1 && scaleRef.current > 1) {
      const t = e.touches[0];
      const x = t.clientX - ts.startX;
      const y = t.clientY - ts.startY;
      ts.moved = true;
      const clamped = clampOffset(scaleRef.current, x, y);
      applyTransform(scaleRef.current, clamped.x, clamped.y);
    }
  }, [applyTransform]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const ts  = touchState.current;
    const now = Date.now();
    if (e.changedTouches.length === 1 && !ts.moved) {
      if (now - ts.lastTap < 300) {
        if (scaleRef.current > 1) {
          applyTransform(1, 0, 0);
        } else {
          const t  = e.changedTouches[0];
          const el = imgRef.current;
          if (el) {
            const rect = el.getBoundingClientRect();
            const cx   = t.clientX - rect.left - rect.width  / 2;
            const cy   = t.clientY - rect.top  - rect.height / 2;
            const s    = 2.5;
            const clamped = clampOffset(s, -cx * (s - 1), -cy * (s - 1));
            applyTransform(s, clamped.x, clamped.y);
          }
        }
        ts.lastTap = 0;
        return;
      }
      ts.lastTap = now;
    }
    if (scaleRef.current <= 1) applyTransform(1, 0, 0);
  }, [applyTransform]);

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: bgColor, opacity: visible ? 1 : 0, transition: "opacity 0.2s ease" }}
      onClick={() => { if (!touchState.current.moved && scaleRef.current <= 1) onClose(); }}
    >
      <button
        onClick={e => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-full transition-all"
        style={{ background: "rgba(0,0,0,0.45)", color: "white", backdropFilter: "blur(6px)" }}
      >
        <X size={16} />
      </button>

      <img
        ref={imgRef}
        src={src}
        alt={alt}
        onClick={e => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        draggable={false}
        className="max-w-[92vw] max-h-[85vh] object-contain select-none"
        style={{
          filter: undefined,
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transition: transform.scale === 1 ? "transform 0.3s ease" : "none",
          transformOrigin: "center",
          touchAction: "none",
          cursor: transform.scale > 1 ? "grab" : "default",
          opacity: visible ? 1 : 0,
          transitionProperty: transform.scale === 1 ? "transform, opacity" : "opacity",
        }}
      />
    </div>
  );
}

function EditModal({ item, onSave, onClose }: {
  item:    GaleriaItem;
  onSave:  (updates: Partial<GaleriaItem>) => Promise<void>;
  onClose: () => void;
}) {
  const [bgColor,     setBgColor]     = useState(item.bg_color     ?? "#111111");
  const [aspectRatio, setAspectRatio] = useState<"square" | "wide" | "portrait">(item.aspect_ratio ?? "portrait");
  const [saving,      setSaving]      = useState(false);
  const [picking,     setPicking]     = useState(false);
  const [hoverColor,  setHoverColor]  = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgElRef  = useRef<HTMLImageElement>(null);

  const rgbToHex = (r: number, g: number, b: number) =>
    "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");

  const drawToCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = imgElRef.current;
    if (!canvas || !img) return;
    canvas.width  = img.naturalWidth  || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }, []);

  const getColorAt = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect   = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const scaleX  = canvas.width  / rect.width;
    const scaleY  = canvas.height / rect.height;
    const x = Math.floor((clientX - rect.left) * scaleX);
    const y = Math.floor((clientY - rect.top)  * scaleY);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
    return rgbToHex(r, g, b);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ bg_color: bgColor, aspect_ratio: aspectRatio });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-primary/30 backdrop-blur-md" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-[var(--radius-card)] overflow-hidden shadow-2xl"
        style={{ background: "var(--white-custom)", border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)" }}>

        <div className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}>
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary/50 flex items-center gap-1.5">
            <Pencil size={10} /> Editar obra
          </span>
          <button onClick={onClose} className="text-primary/30 hover:text-primary transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Preview con modo cuentagotas */}
        <div className="px-5 pt-4">
          <div
            className="relative w-full overflow-hidden rounded-xl"
            style={{
              paddingBottom: paddingForRatio(aspectRatio),
              backgroundColor: picking ? (hoverColor ?? bgColor) : bgColor,
              cursor: picking ? "crosshair" : "default",
            }}
            onMouseMove={e => { if (picking) setHoverColor(getColorAt(e)); }}
            onMouseLeave={() => { if (picking) setHoverColor(null); }}
            onClick={e => {
              if (!picking) return;
              const c = getColorAt(e);
              if (c) setBgColor(c);
              setPicking(false);
              setHoverColor(null);
            }}
            onTouchEnd={e => {
              if (!picking) return;
              e.preventDefault();
              const c = getColorAt(e as any);
              if (c) setBgColor(c);
              setPicking(false);
              setHoverColor(null);
            }}
          >
            <img
              ref={imgElRef}
              src={item.url_imagen}
              alt="preview"
              crossOrigin="anonymous"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              style={{ objectPosition: "50% 50%" }}
              onLoad={drawToCanvas}
            />
            <canvas ref={canvasRef} className="hidden" />

            {picking && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none"
                style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(1px)" }}>
                <Pipette size={22} color="white" />
                <span className="text-[9px] font-black uppercase tracking-widest text-white/80">
                  Toca un color
                </span>
                {hoverColor && (
                  <div className="flex items-center gap-2 mt-1 px-3 py-1.5 rounded-xl"
                    style={{ background: "rgba(0,0,0,0.5)" }}>
                    <div className="w-4 h-4 rounded-md border border-white/30"
                      style={{ backgroundColor: hoverColor }} />
                    <span className="text-[10px] font-mono text-white">{hoverColor}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* Color de fondo */}
          <div className="space-y-2">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/40">Color de fondo</p>

            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl border border-primary/20 shrink-0"
                style={{ backgroundColor: hoverColor ?? bgColor }} />
              <input
                type="text"
                value={bgColor}
                onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setBgColor(e.target.value); }}
                className="flex-1 text-[11px] font-mono bg-bg-main border border-primary/15 rounded-xl px-3 py-2.5 text-primary outline-none focus:border-primary/40"
                placeholder="#111111"
                maxLength={7}
              />
              <button
                type="button"
                title="Cuentagotas"
                onClick={() => { setPicking(p => !p); setHoverColor(null); drawToCanvas(); }}
                className="w-10 h-10 flex items-center justify-center rounded-xl border shrink-0 transition-all"
                style={{
                  background:   picking ? "var(--primary)" : "var(--bg-main)",
                  borderColor:  picking ? "var(--primary)" : "color-mix(in srgb, var(--primary) 20%, transparent)",
                  color:        picking ? "var(--btn-text)" : "color-mix(in srgb, var(--primary) 60%, transparent)",
                }}
              >
                <Pipette size={14} />
              </button>
            </div>

            {/* Paleta de colores comunes */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                "#111111","#ffffff","#f5f0eb","#1a1a2e","#0d1117",
                "#2d2d2d","#fdf6e3","#1e3a5f","#3b1f2b","#1b4332",
              ].map(c => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  onClick={() => setBgColor(c)}
                  className="w-7 h-7 rounded-lg border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: bgColor === c ? "var(--primary)" : "color-mix(in srgb, var(--primary) 15%, transparent)",
                    boxShadow: bgColor === c ? "0 0 0 1px var(--primary)" : undefined,
                  }}
                />
              ))}
            </div>
          </div>

          {}
          <div className="space-y-2">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/40">Formato</p>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                { value: "portrait", label: "4:5",         hint: "2 col · alto"  },
                { value: "square",   label: "1:1",         hint: "2 col · cuad"  },
                { value: "wide",     label: "16:9",        hint: "fila completa" },
              ] as { value: "square" | "wide" | "portrait"; label: string; hint: string }[]).map(opt => {
                const active = aspectRatio === opt.value;
                return (
                  <button key={opt.value} onClick={() => setAspectRatio(opt.value)}
                    className="flex flex-col items-center gap-0.5 px-2 py-2.5 rounded-xl border text-[9px] font-black uppercase tracking-wide transition-all"
                    style={{
                      background:  active ? "var(--primary)" : "transparent",
                      color:       active ? "var(--btn-text)" : "color-mix(in srgb, var(--primary) 45%, transparent)",
                      borderColor: active ? "var(--primary)" : "color-mix(in srgb, var(--primary) 15%, transparent)",
                    }}>
                    {opt.label}
                    <span className="text-[7px] font-normal normal-case opacity-70">{opt.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose}
            className="px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest text-primary/40 hover:text-primary transition-all"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)" }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            style={{ background: "var(--primary)", color: "var(--btn-text)" }}>
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddModal({ onClose, onSuccess, nextOrden }: {
  onClose: () => void; onSuccess: () => void; nextOrden: number;
}) {
  const [step,   setStep]   = useState<"pick" | "preview">("pick");
  const [url,    setUrl]    = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("galeria").insert([{
      url_imagen:   url,
      bg_color:     "#111111",
      aspect_ratio: "portrait",
      orden:        nextOrden,
    }]);
    setSaving(false);
    if (!error) { onSuccess(); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-primary/30 backdrop-blur-md" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-[var(--radius-card)] overflow-hidden shadow-2xl"
        style={{ background: "var(--white-custom)", border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)" }}>

        <div className="px-5 py-4 border-b flex items-center justify-between"
          style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 flex items-center gap-2">
            <ImageIcon size={11} /> Nueva Obra
          </h3>
          <button onClick={onClose} className="text-primary/30 hover:text-primary transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5">
          {step === "pick" ? (
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary/30 text-center pb-2">
                Selecciona la imagen
              </p>
              <SimpleImagePicker onSelect={u => { setUrl(u); setStep("preview"); }} onClose={onClose} />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-full rounded-xl overflow-hidden flex items-center justify-center"
                style={{ aspectRatio: "1/1", background: "#111", border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)" }}>
                <img src={url} alt="preview" className="max-w-full max-h-full object-contain" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep("pick")}
                  className="px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest text-primary/40 hover:text-primary transition-all"
                  style={{ borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)" }}>
                  Atrás
                </button>
                <button onClick={save} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  style={{ background: "var(--primary)", color: "var(--btn-text)" }}>
                  {saving ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                  {saving ? "Guardando…" : "Añadir"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GaleriaPage() {
  const { perfil } = useAuth() as any;
  const isAdmin    = perfil?.rol === "admin";
  const { items, setItems, loading, reload } = useGaleria();
  const [showAdd,  setShowAdd]  = useState(false);
  const [lightbox, setLightbox] = useState<GaleriaItem | null>(null);
  const [editing,  setEditing]  = useState<GaleriaItem | null>(null);

  const handleUpdate = useCallback(async (id: number, updates: Partial<GaleriaItem>) => {
    const { error } = await supabase.from("galeria").update(updates).eq("id", id);
    if (!error) setItems(prev => prev.map(it => it.id === id ? { ...it, ...updates } : it));
  }, [setItems]);

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm("¿Eliminar esta obra?")) return;
    const { error } = await supabase.from("galeria").delete().eq("id", id);
    if (!error) setItems(prev => prev.filter(it => it.id !== id));
  }, [setItems]);

  return (
    <div className="w-full bg-bg-main min-h-screen">
      {isAdmin && (
        <div className="flex justify-end px-3 pt-4 pb-2">
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-dashed transition-all hover:opacity-80"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)", color: "color-mix(in srgb, var(--primary) 60%, transparent)" }}>
            <Plus size={12} /> Añadir obra
          </button>
        </div>
      )}

      <main>
        {loading ? (
          <div className="flex items-center justify-center py-32 text-primary/30">
            <Loader2 className="animate-spin" size={28} />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-32 text-primary/20">
            <ImageIcon size={48} strokeWidth={1} />
            <p className="text-sm font-black uppercase tracking-widest">
              {isAdmin ? "Añade la primera obra" : "La galería está vacía"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-0.5 p-0.5">
            {items.map(item => {
              const isWide = (item.aspect_ratio ?? "portrait") === "wide";
              return (
                <div
                  key={item.id}
                  className="relative w-full overflow-hidden"
                  style={{
                    paddingBottom: paddingForRatio(item.aspect_ratio),
                    backgroundColor: item.bg_color,
                    gridColumn:      isWide ? "span 2" : undefined,
                  }}
                >
                  <img
                    src={item.url_imagen}
                    alt="Obra"
                    className="absolute inset-0 w-full h-full object-contain cursor-zoom-in"
                    style={{ objectPosition: "50% 50%" }}
                    draggable={false}
                    onClick={() => setLightbox(item)}
                  />

                  {isAdmin && (
                    <div className="absolute top-2 right-2 flex gap-1 z-10">
                      <button
                        onClick={() => setEditing(item)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:bg-white/20"
                        style={{ background: "rgba(0,0,0,0.5)", color: "white", backdropFilter: "blur(4px)" }}>
                        <Pencil size={11} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:bg-red-600"
                        style={{ background: "rgba(0,0,0,0.5)", color: "white", backdropFilter: "blur(4px)" }}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {lightbox && (
        <ImageLightbox
          src={lightbox.url_imagen}
          alt="Obra"
          bgColor={lightbox.bg_color}
          onClose={() => setLightbox(null)}
        />
      )}

      {editing && (
        <EditModal
          item={editing}
          onSave={updates => handleUpdate(editing.id, updates)}
          onClose={() => setEditing(null)}
        />
      )}

      <AnimatePresence>
        {showAdd && <AddModal onClose={() => setShowAdd(false)} onSuccess={reload} nextOrden={items.length ? Math.min(...items.map(i => i.orden)) - 1 : 0} />}
      </AnimatePresence>
    </div>
  );
}