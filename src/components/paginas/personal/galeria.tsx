"use client";
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/api/client/supabase";
import SimpleImagePicker from "@/components/forms/SimpleImagePicker";
import { useAuth } from "@/providers/AuthProvider";
import {
  Plus, X, Save, Loader2, Pencil, Trash2,
  ChevronUp, ChevronDown, ImageIcon, Type,
  AlignLeft, AlignRight, AlignCenterHorizontal,
  RotateCcw, Image as ImageLucide,
} from "lucide-react";

// ─── SQL para ejecutar en Supabase ────────────────────────────────────────────
// alter table galeria
//   add column if not exists text_position text    default 'bottom',
//   add column if not exists text_x        numeric default 50,
//   add column if not exists text_y        numeric default 85,
//   add column if not exists text_size     integer default 2,
//   add column if not exists text_bg_color text    default 'transparent',
//   add column if not exists text_color    text    default '#1a1a1a',
//   add column if not exists img_col_width integer default 55,
//   add column if not exists text_width    integer default 40;

// ─── SISTEMA DE COORDENADAS ───────────────────────────────────────────────────
// Usamos un canvas con aspect-ratio fijo (16:9).
// Tanto el editor como la vista pública usan este mismo ratio.
// Así, img_x=50 img_y=50 siempre es el centro exacto, en cualquier pantalla.
// La imagen se posiciona con % dentro de este contenedor de ratio fijo.
const CANVAS_RATIO = 9 / 16; // paddingBottom = 56.25% → contenedor 16:9

// ─── Tipos ────────────────────────────────────────────────────────────────────

type TextPosition = "bottom" | "left" | "right" | "overlay";

interface GaleriaItem {
  id:            number;
  titulo:        string | null;
  descripcion:   string | null;
  url_imagen:    string;
  bg_color:      string;
  img_x:         number;
  img_y:         number;
  img_scale:     number;
  img_width:     number;
  img_col_width: number;   // % del ancho total que ocupa la columna imagen (solo left/right, 20–80)
  text_position: TextPosition;
  text_x:        number;
  text_y:        number;
  text_width:    number;   // % del ancho del canvas que ocupa el bloque de texto overlay (10–90)
  text_size:     number;
  text_bg_color: string;
  text_color:    string;
  orden:         number;
  creado_en:     string;
}

type Draft = Omit<GaleriaItem, "id" | "titulo" | "descripcion" | "orden" | "creado_en" | "url_imagen">;

const TEXT_SIZES: Record<number, {
  label:    string;
  titleCls: string;   // para texto FUERA del canvas (bottom/left/right)
  descCls:  string;
  titleCqw: string;   // para texto superpuesto (overlay) — proporcional al canvas
  descCqw:  string;
}> = {
  1: { label: "XS", titleCls: "text-lg",  descCls: "text-xs",   titleCqw: "2.5cqw", descCqw: "1.4cqw" },
  2: { label: "S",  titleCls: "text-2xl", descCls: "text-sm",   titleCqw: "3.8cqw", descCqw: "2cqw"   },
  3: { label: "M",  titleCls: "text-4xl", descCls: "text-base", titleCqw: "5.5cqw", descCqw: "2.8cqw" },
  4: { label: "L",  titleCls: "text-6xl", descCls: "text-lg",   titleCqw: "8cqw",   descCqw: "4cqw"   },
  5: { label: "XL", titleCls: "text-8xl", descCls: "text-xl",   titleCqw: "12cqw",  descCqw: "5.5cqw" },
};

function draftFromItem(item: GaleriaItem): Draft {
  return {
    bg_color:      item.bg_color      ?? "#111111",
    img_x:         item.img_x         ?? 50,
    img_y:         item.img_y         ?? 50,
    img_scale:     item.img_scale     ?? 1,
    img_width:     item.img_width     ?? 60,
    img_col_width: item.img_col_width ?? 55,
    text_position: item.text_position ?? "bottom",
    text_x:        item.text_x        ?? 50,
    text_y:        item.text_y        ?? 85,
    text_width:    item.text_width    ?? 40,
    text_size:     item.text_size     ?? 2,
    text_bg_color: item.text_bg_color ?? "transparent",
    text_color:    item.text_color    ?? "#1a1a1a",
  };
}

// ─── Hook de datos ────────────────────────────────────────────────────────────

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

// ─── Canvas con ratio fijo ────────────────────────────────────────────────────
// Contenedor que siempre mantiene 16:9. El inner es absolute y ocupa todo.
// CRÍTICO: tanto el editor como la vista pública usan este mismo componente
// para garantizar que los % son idénticos en ambos contextos.

function FixedCanvas({
  bg, children, className = "", style = {},
}: {
  bg: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`relative w-full overflow-hidden ${className}`}
      style={{
        paddingBottom: `${CANVAS_RATIO * 100}%`,
        backgroundColor: bg,
        containerType: "inline-size",
        ...style,
      }}
    >
      <div className="absolute inset-0">
        {children}
      </div>
    </div>
  );
}

// ─── ColorRow ─────────────────────────────────────────────────────────────────

function ColorRow({
  label, value, onChange, allowTransparent = false,
}: {
  label: string; value: string; onChange: (v: string) => void; allowTransparent?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-black uppercase tracking-widest text-primary/40 w-14 shrink-0">{label}</span>
      <input type="color"
        value={value === "transparent" ? "#000000" : value}
        onChange={e => onChange(e.target.value)}
        className="w-8 h-8 rounded-lg border border-primary/20 cursor-pointer p-0.5 bg-transparent shrink-0" />
      <input type="text" value={value}
        onChange={e => {
          const v = e.target.value;
          if (v === "transparent" || /^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
        }}
        className="flex-1 text-[10px] font-mono bg-bg-main border border-primary/15 rounded-lg px-2 py-1.5 text-primary outline-none focus:border-primary/40 min-w-0" />
      {allowTransparent && (
        <button onClick={() => onChange("transparent")} title="Sin fondo"
          className="text-[9px] font-black px-2 py-1.5 rounded-lg border transition-all shrink-0"
          style={{
            borderColor: value === "transparent" ? "var(--primary)" : "color-mix(in srgb, var(--primary) 15%, transparent)",
            color:       value === "transparent" ? "var(--primary)" : "color-mix(in srgb, var(--primary) 30%, transparent)",
            background:  value === "transparent" ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent",
          }}>∅</button>
      )}
    </div>
  );
}

// ─── Slider compacto ──────────────────────────────────────────────────────────

function Slider({
  label, value, min, max, step = 1, unit = "%",
  onChange, display,
}: {
  label: string; value: number; min: number; max: number;
  step?: number; unit?: string; onChange: (v: number) => void;
  display?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-black uppercase text-primary/40 w-14 shrink-0">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)}
        className="flex-1 h-1.5 rounded-full cursor-pointer" style={{ accentColor: "var(--primary)" }} />
      <span className="text-[9px] font-mono text-primary/50 w-14 text-right shrink-0">
        {display ?? `${value}${unit}`}
      </span>
    </div>
  );
}

// ─── CanvasEditorModal ────────────────────────────────────────────────────────

function CanvasEditorModal({
  item, onSave, onCancel,
}: {
  item:     GaleriaItem;
  onSave:   (d: Draft & { titulo: string; descripcion: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft,       setDraft]       = useState<Draft>(draftFromItem(item));
  const [titulo,      setTitulo]      = useState(item.titulo      ?? "");
  const [descripcion, setDescripcion] = useState(item.descripcion ?? "");
  const [saving,      setSaving]      = useState(false);
  const [tab,         setTab]         = useState<"img" | "txt">("img");
  const [isDirty,     setIsDirty]     = useState(false);

  const set = useCallback((patch: Partial<Draft>) => {
    setDraft(prev => ({ ...prev, ...patch }));
    setIsDirty(true);
  }, []);

  const sz        = TEXT_SIZES[draft.text_size] ?? TEXT_SIZES[2];
  const isOverlay = draft.text_position === "overlay";

  // Clamp antes de enviar — evita 400 por valores fuera de rango o tipos inesperados
  const toSave = (): Draft => ({
    ...draft,
    img_x:         Math.round(Math.max(0, Math.min(100, draft.img_x))    * 10) / 10,
    img_y:         Math.round(Math.max(0, Math.min(100, draft.img_y))    * 10) / 10,
    img_width:     Math.round(Math.max(5, Math.min(100, draft.img_width))),
    img_scale:     Math.round(Math.max(0.1, Math.min(3, draft.img_scale)) * 100) / 100,
    img_col_width: Math.round(Math.max(20, Math.min(80, draft.img_col_width))),
    text_x:        Math.round(Math.max(0, Math.min(100, draft.text_x))   * 10) / 10,
    text_y:        Math.round(Math.max(0, Math.min(100, draft.text_y))   * 10) / 10,
    text_width:    Math.round(Math.max(10, Math.min(90, draft.text_width))),
    text_size:     Math.max(1, Math.min(5, draft.text_size)),
  });

  const handleSave = async () => {
    setSaving(true);
    await onSave({ ...toSave(), titulo, descripcion });
    setSaving(false);
    setIsDirty(false);
  };

  const handleCancel = () => {
    if (isDirty && !confirm("¿Descartar los cambios sin guardar?")) return;
    onCancel();
  };

  const TABS = [
    { id: "img" as const, label: "Imagen", Icon: ImageLucide },
    { id: "txt" as const, label: "Texto",  Icon: Type        },
  ];

  return (
    <div className="fixed inset-0 z-[300] flex flex-col md:flex-row" style={{ background: "#0a0a0a" }}>

      {/* ── PREVIEW (solo visual) ─────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 overflow-hidden">
        <div className="relative w-full" style={{ maxWidth: `calc((100vh - 120px) / ${CANVAS_RATIO})` }}>
          <FixedCanvasInner
            ref={null as any}
            bg={draft.bg_color}
            style={{ borderRadius: 4, boxShadow: "0 0 0 1px rgba(255,255,255,0.1), 0 24px 80px rgba(0,0,0,0.6)" }}
          >
            {/* Imagen — preview en tiempo real */}
            <img
              src={item.url_imagen}
              alt={titulo || "Obra"}
              draggable={false}
              style={{
                position: "absolute",
                left: `${draft.img_x}%`, top: `${draft.img_y}%`,
                transform: `translate(-50%,-50%) scale(${draft.img_scale})`,
                width: `${draft.img_width}%`, maxWidth: "none",
                objectFit: "contain", transformOrigin: "center",
                userSelect: "none", pointerEvents: "none",
              }}
            />

            {/* Texto superpuesto — preview */}
            {isOverlay && (titulo || descripcion) && (
              <div
                className="absolute z-20 pointer-events-none overflow-hidden"
                style={{
                  left:      `${draft.text_x}%`,
                  top:       `${draft.text_y}%`,
                  transform: "translate(-50%,-50%)",
                  width:     `${draft.text_width}%`,   /* ancho fijo — no cambia con la posición */
                  background: draft.text_bg_color === "transparent" ? "transparent" : draft.text_bg_color,
                  padding:    draft.text_bg_color !== "transparent" ? "10px 18px" : "0",
                  borderRadius: 6,
                  outline:    "1px dashed rgba(255,255,255,0.3)",
                  boxSizing:  "border-box",
                }}
              >
                {titulo && (
                  <h2 className="font-black italic uppercase leading-tight"
                    style={{ color: draft.text_color, letterSpacing: "-0.025em", fontSize: sz.titleCqw, lineHeight: 1.1 }}>
                    {titulo}
                  </h2>
                )}
                {descripcion && (
                  <p className="font-light leading-relaxed"
                    style={{ color: draft.text_color, opacity: 0.85, fontSize: sz.descCqw, marginTop: "0.5em" }}>
                    {descripcion}
                  </p>
                )}
              </div>
            )}

            {/* Badge de posición texto no-overlay */}
            {!isOverlay && (titulo || descripcion) && (
              <div className="absolute bottom-3 left-3 pointer-events-none">
                <div className="px-2.5 py-1 rounded text-white text-[9px] font-black uppercase tracking-widest"
                  style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
                  Texto: {draft.text_position}
                </div>
              </div>
            )}

            {/* Badge cambios sin guardar */}
            {isDirty && (
              <div className="absolute top-2 right-2 pointer-events-none">
                <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded"
                  style={{ background: "rgba(255,180,0,0.9)", color: "#000" }}>
                  Sin guardar
                </span>
              </div>
            )}
          </FixedCanvasInner>
        </div>
      </div>

      {/* ── PANEL DERECHO ─────────────────────────────────────────────────── */}
      <div className="w-full md:w-80 flex flex-col overflow-hidden shrink-0"
        style={{ background: "var(--white-custom)", borderLeft: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)" }}>

        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between shrink-0"
          style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}>
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary/50 flex items-center gap-1.5">
            <Pencil size={10} /> Editor
          </span>
          <button onClick={handleCancel} className="text-primary/30 hover:text-primary transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 px-3 pt-3 shrink-0">
          {TABS.map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                style={{
                  background: active ? "var(--primary)" : "color-mix(in srgb, var(--primary) 6%, transparent)",
                  color: active ? "var(--btn-text)" : "color-mix(in srgb, var(--primary) 45%, transparent)",
                }}>
                <t.Icon size={11} /> {t.label}
              </button>
            );
          })}
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

          {/* ── TAB IMAGEN ── */}
          {tab === "img" && (
            <>
              <section className="space-y-2">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/40">Fondo de sección</p>
                <ColorRow label="Color" value={draft.bg_color} onChange={v => set({ bg_color: v })} />
              </section>

              <hr style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />

              <section className="space-y-2.5">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/40">Posición imagen</p>
                <Slider label="Horizontal" value={draft.img_x} min={0} max={100} step={0.5}
                  onChange={v => set({ img_x: v })} />
                <Slider label="Vertical"   value={draft.img_y} min={0} max={100} step={0.5}
                  onChange={v => set({ img_y: v })} />
              </section>

              <hr style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />

              <section className="space-y-2.5">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/40">Tamaño imagen</p>
                <Slider label="Ancho" value={draft.img_width} min={10} max={100}
                  onChange={v => set({ img_width: v })} />
                <Slider label="Escala" value={Math.round(draft.img_scale * 100)} min={20} max={300}
                  onChange={v => set({ img_scale: v / 100 })}
                  display={`${draft.img_scale.toFixed(2)}×`} unit="%" />
                <button onClick={() => set({ img_x: 50, img_y: 50, img_scale: 1, img_width: 60 })}
                  className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-primary/25 hover:text-primary transition-colors">
                  <RotateCcw size={9} /> Centrar y resetear
                </button>
              </section>
            </>
          )}

          {/* ── TAB TEXTO ── */}
          {tab === "txt" && (
            <>
              <section className="space-y-2">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/40">Contenido</p>
                <input value={titulo} onChange={e => { setTitulo(e.target.value); setIsDirty(true); }}
                  placeholder="Título…"
                  className="w-full bg-bg-main border border-primary/15 rounded-xl px-3 py-2.5 text-sm font-black uppercase tracking-wide text-primary outline-none focus:border-primary/40 transition-colors placeholder:text-primary/20" />
                <textarea value={descripcion} onChange={e => { setDescripcion(e.target.value); setIsDirty(true); }}
                  placeholder="Descripción…" rows={3}
                  className="w-full bg-bg-main border border-primary/15 rounded-xl px-3 py-2.5 text-sm font-light text-primary outline-none focus:border-primary/40 transition-colors resize-none leading-relaxed placeholder:text-primary/20" />
              </section>

              <hr style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />

              <section className="space-y-2">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/40">Posición del texto</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {([
                    { value: "bottom",  Icon: AlignCenterHorizontal, label: "Abajo"       },
                    { value: "left",    Icon: AlignLeft,              label: "Izquierda"   },
                    { value: "right",   Icon: AlignRight,             label: "Derecha"     },
                    { value: "overlay", Icon: Type,    label: "Superpuesto" },
                  ] as { value: TextPosition; Icon: React.ElementType; label: string }[]).map(opt => {
                    const active = draft.text_position === opt.value;
                    return (
                      <button key={opt.value} onClick={() => set({ text_position: opt.value })}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[9px] font-black uppercase tracking-wide transition-all"
                        style={{
                          background:  active ? "var(--primary)" : "transparent",
                          color:       active ? "var(--btn-text)" : "color-mix(in srgb, var(--primary) 45%, transparent)",
                          borderColor: active ? "var(--primary)" : "color-mix(in srgb, var(--primary) 15%, transparent)",
                        }}>
                        <opt.Icon size={12} /> {opt.label}
                      </button>
                    );
                  })}
                </div>

                {/* Posición y tamaño — solo en overlay */}
                {isOverlay && (
                  <div className="space-y-2 pt-1">
                    <p className="text-[8px] text-primary/30 font-black uppercase tracking-widest">
                      Posición y tamaño del bloque
                    </p>
                    <Slider label="Horizontal" value={draft.text_x} min={0} max={100} step={0.5}
                      onChange={v => set({ text_x: v })} />
                    <Slider label="Vertical"   value={draft.text_y} min={0} max={100} step={0.5}
                      onChange={v => set({ text_y: v })} />
                    <Slider label="Ancho"      value={draft.text_width} min={10} max={90}
                      onChange={v => set({ text_width: v })} />
                  </div>
                )}

                {/* Ancho de columnas — solo en left/right */}
                {(draft.text_position === "left" || draft.text_position === "right") && (
                  <div className="space-y-2 pt-1">
                    <p className="text-[8px] text-primary/30 font-black uppercase tracking-widest">
                      Ancho relativo de columnas
                    </p>
                    <Slider
                      label="Imagen"
                      value={draft.img_col_width}
                      min={20} max={80}
                      onChange={v => set({ img_col_width: v })}
                    />
                    <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest"
                      style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                      <span>Imagen: {draft.img_col_width}%</span>
                      <span>Texto: {100 - draft.img_col_width}%</span>
                    </div>
                  </div>
                )}
              </section>

              <hr style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />

              <section className="space-y-2.5">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/40">Colores del texto</p>
                <ColorRow label="Texto" value={draft.text_color}    onChange={v => set({ text_color: v })} />
                <ColorRow label="Fondo" value={draft.text_bg_color} onChange={v => set({ text_bg_color: v })} allowTransparent />
              </section>

              <hr style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />

              <section className="space-y-2">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/40">Tamaño del texto</p>
                <div className="flex gap-1.5">
                  {([1,2,3,4,5] as const).map(s => (
                    <button key={s} onClick={() => set({ text_size: s })}
                      className="flex-1 py-2 rounded-xl border text-[9px] font-black uppercase tracking-wide transition-all"
                      style={{
                        background:  draft.text_size === s ? "var(--primary)" : "transparent",
                        color:       draft.text_size === s ? "var(--btn-text)" : "color-mix(in srgb, var(--primary) 40%, transparent)",
                        borderColor: draft.text_size === s ? "var(--primary)" : "color-mix(in srgb, var(--primary) 15%, transparent)",
                      }}>
                      {TEXT_SIZES[s].label}
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>

        {/* Footer — ÚNICO lugar donde se llama a Supabase */}
        <div className="px-4 py-4 space-y-2 shrink-0"
          style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}>
          {isDirty && (
            <p className="text-[8px] font-black uppercase tracking-widest text-amber-500 text-center pb-1">
              Cambios pendientes de guardar
            </p>
          )}
          <button onClick={handleSave} disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            style={{ background: "var(--primary)", color: "var(--btn-text)", opacity: saving ? 0.7 : 1 }}>
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
          <button onClick={handleCancel}
            className="w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-primary/35 hover:text-primary transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── FixedCanvas con forwardRef ──────────────────────────────────────────────

const FixedCanvasInner = React.forwardRef<HTMLDivElement, {
  bg: string; children: React.ReactNode; className?: string; style?: React.CSSProperties;
}>(({ bg, children, className = "", style = {} }, ref) => (
  <div
    ref={ref}
    className={`relative w-full overflow-hidden ${className}`}
    style={{
      paddingBottom: `${CANVAS_RATIO * 100}%`,
      backgroundColor: bg,
      containerType: "inline-size",
      ...style,
    }}
  >
    <div className="absolute inset-0">{children}</div>
  </div>
));
FixedCanvasInner.displayName = "FixedCanvas";

// Reemplazamos FixedCanvas con la versión con forwardRef
// (La declaración simple de arriba queda obsoleta — la usamos solo para la vista pública)

// ─── TextBlock (vista pública) ────────────────────────────────────────────────

function TextBlock({ item, side = false }: { item: GaleriaItem; side?: boolean }) {
  if (!item.titulo && !item.descripcion) return null;
  const sz    = TEXT_SIZES[item.text_size ?? 2];
  const hasBg = item.text_bg_color && item.text_bg_color !== "transparent";
  return (
    <div className={side
      ? "flex flex-col justify-center py-12 px-10"
      : "max-w-3xl mx-auto px-6 md:px-0 py-10 md:py-14"}>
      <div style={{
        display: "inline-block",
        background: hasBg ? item.text_bg_color : "transparent",
        padding: hasBg ? "16px 24px" : "0",
        borderRadius: hasBg ? 8 : 0,
      }}>
        {item.titulo && (
          <h2 className={`font-black italic uppercase leading-tight ${sz.titleCls}`}
            style={{ color: item.text_color ?? "var(--primary)", letterSpacing: "-0.025em" }}>
            {item.titulo}
          </h2>
        )}
        {item.descripcion && (
          <p className={`font-light leading-relaxed mt-2 ${sz.descCls}`}
            style={{ color: item.text_color ?? "var(--foreground)", opacity: 0.85 }}>
            {item.descripcion}
          </p>
        )}
      </div>
      {!side && (
        <div className="mt-12 h-px w-24"
          style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }} />
      )}
    </div>
  );
}

// ─── GaleriaSection ───────────────────────────────────────────────────────────

function GaleriaSection({
  item, isAdmin, isFirst, isLast,
  onUpdate, onDelete, onMoveUp, onMoveDown,
}: {
  item:       GaleriaItem;
  isAdmin:    boolean;
  isFirst:    boolean;
  isLast:     boolean;
  onUpdate:   (id: number, u: Partial<GaleriaItem>) => Promise<void>;
  onDelete:   (id: number) => Promise<void>;
  onMoveUp:   () => void;
  onMoveDown: () => void;
}) {
  const [editing, setEditing] = useState(false);

  // handleSave es la ÚNICA función que llama a Supabase (via onUpdate)
  // Se ejecuta solo cuando el usuario pulsa "Guardar cambios" en el editor
  const handleSave = async (data: Draft & { titulo: string; descripcion: string }) => {
    const { titulo, descripcion, ...layout } = data;
    await onUpdate(item.id, { titulo, descripcion, ...layout });
    setEditing(false);
  };

  const pos    = item.text_position ?? "bottom";
  const isSide = pos === "left" || pos === "right";
  const sz     = TEXT_SIZES[item.text_size ?? 2];

  // Estilo de imagen para la vista pública (usa los valores guardados en DB)
  const imgStyle: React.CSSProperties = {
    position: "absolute",
    left: `${item.img_x ?? 50}%`, top: `${item.img_y ?? 50}%`,
    transform: `translate(-50%,-50%) scale(${item.img_scale ?? 1})`,
    width: `${item.img_width ?? 60}%`, maxWidth: "none",
    objectFit: "contain", transformOrigin: "center",
    userSelect: "none", pointerEvents: "none",
    transition: "all 0.4s ease",
  };

  const AdminBar = () => !isAdmin ? null : (
    <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
      <button onClick={onMoveUp} disabled={isFirst}
        className="w-7 h-7 flex items-center justify-center rounded-lg transition-all disabled:opacity-30 hover:bg-white/20"
        style={{ background: "rgba(0,0,0,0.5)", color: "white", backdropFilter: "blur(4px)" }}>
        <ChevronUp size={13} />
      </button>
      <button onClick={onMoveDown} disabled={isLast}
        className="w-7 h-7 flex items-center justify-center rounded-lg transition-all disabled:opacity-30 hover:bg-white/20"
        style={{ background: "rgba(0,0,0,0.5)", color: "white", backdropFilter: "blur(4px)" }}>
        <ChevronDown size={13} />
      </button>
      <button onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 px-3 h-7 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all hover:bg-white/20"
        style={{ background: "rgba(0,0,0,0.5)", color: "white", backdropFilter: "blur(4px)" }}>
        <Pencil size={10} /> Editar
      </button>
      <button onClick={async () => { if (confirm("¿Eliminar esta obra?")) await onDelete(item.id); }}
        className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:bg-red-600"
        style={{ background: "rgba(0,0,0,0.5)", color: "white", backdropFilter: "blur(4px)" }}>
        <Trash2 size={11} />
      </button>
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {editing && (
          <motion.div key="editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }} className="fixed inset-0 z-[300]">
            <CanvasEditorModal item={item} onSave={handleSave} onCancel={() => setEditing(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.article
        initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="w-full"
      >
        {isSide ? (
          // ── Layout lateral — img_col_width controla el ancho de la columna imagen ──
          <div className={`flex flex-col md:flex-row items-stretch ${pos === "right" ? "md:flex-row-reverse" : ""}`}>
            {/* Inyectamos el ancho exacto para desktop via style tag — en mobile siempre es 100% */}
            <style>{`@media(min-width:768px){.gc-img-${item.id}{width:${item.img_col_width ?? 55}%}}`}</style>

            {/* Columna imagen */}
            <div className={`gc-img-${item.id} flex-none w-full`}>
              <FixedCanvas bg={item.bg_color}>
                <img src={item.url_imagen} alt={item.titulo || "Obra"} style={imgStyle} draggable={false} />
                <AdminBar />
              </FixedCanvas>
            </div>
            {/* Columna texto: misma altura gracias a items-stretch + self-stretch */}
            <div
              className="flex-1 self-stretch flex flex-col justify-center border-t md:border-t-0"
              style={{
                borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
                [pos === "right" ? "borderRight" : "borderLeft"]: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
              } as any}
            >
              <TextBlock item={item} side />
              <div className="px-10 pb-10">
                <div className="h-px w-16" style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }} />
              </div>
            </div>
          </div>
        ) : pos === "overlay" ? (
          // ── Layout overlay — texto con cqw para ser proporcional al canvas ──
          <FixedCanvas bg={item.bg_color}>
            <img src={item.url_imagen} alt={item.titulo || "Obra"} style={imgStyle} draggable={false} />
            {(item.titulo || item.descripcion) && (
              <div className="absolute z-10 overflow-hidden"
                style={{
                  left:      `${item.text_x ?? 50}%`,
                  top:       `${item.text_y ?? 85}%`,
                  transform: "translate(-50%,-50%)",
                  width:     `${item.text_width ?? 40}%`,   /* ancho fijo — nunca cambia con la posición */
                  background: item.text_bg_color === "transparent" ? "transparent" : item.text_bg_color,
                  padding:    item.text_bg_color !== "transparent" ? "10px 18px" : "0",
                  borderRadius: 6,
                  boxSizing: "border-box",
                }}>
                {item.titulo && (
                  <h2
                    className="font-black italic uppercase leading-tight"
                    style={{ color: item.text_color ?? "white", letterSpacing: "-0.025em", fontSize: sz.titleCqw, lineHeight: 1.1 }}
                  >
                    {item.titulo}
                  </h2>
                )}
                {item.descripcion && (
                  <p
                    className="font-light leading-relaxed"
                    style={{ color: item.text_color ?? "white", opacity: 0.85, fontSize: sz.descCqw, marginTop: "0.5em" }}
                  >
                    {item.descripcion}
                  </p>
                )}
              </div>
            )}
            <AdminBar />
          </FixedCanvas>
        ) : (
          // ── Layout bottom (default) ──
          <>
            <FixedCanvas bg={item.bg_color}>
              <img src={item.url_imagen} alt={item.titulo || "Obra"} style={imgStyle} draggable={false} />
              <AdminBar />
            </FixedCanvas>
            <TextBlock item={item} />
          </>
        )}
      </motion.article>
    </>
  );
}

// ─── AddModal ─────────────────────────────────────────────────────────────────

function AddModal({ onClose, onSuccess, nextOrden }: {
  onClose: () => void; onSuccess: () => void; nextOrden: number;
}) {
  const [step, setStep]               = useState<"pick" | "meta">("pick");
  const [url, setUrl]                 = useState("");
  const [titulo, setTitulo]           = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [saving, setSaving]           = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("galeria").insert([{
      url_imagen:    url,
      titulo:        titulo.trim()      || null,
      descripcion:   descripcion.trim() || null,
      bg_color:      "#111111",
      img_x: 50, img_y: 50, img_scale: 1, img_width: 60, img_col_width: 55,
      text_position: "bottom",
      text_x: 50, text_y: 85, text_width: 40, text_size: 2,
      text_bg_color: "transparent", text_color: "#ffffff",
      orden: nextOrden,
    }]);
    setSaving(false);
    if (!error) { onSuccess(); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-primary/30 backdrop-blur-md" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-[var(--radius-card)] overflow-hidden shadow-2xl"
        style={{ background: "var(--white-custom)", border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)" }}>
        <div className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 flex items-center gap-2">
            <ImageIcon size={11} /> Nueva Obra
          </h3>
          <button onClick={onClose} className="text-primary/30 hover:text-primary transition-colors"><X size={16} /></button>
        </div>
        <div className="p-6">
          {step === "pick" ? (
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary/30 text-center pb-2">
                Selecciona la imagen
              </p>
              <SimpleImagePicker onSelect={u => { setUrl(u); setStep("meta"); }} onClose={onClose} />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-full rounded-xl overflow-hidden flex items-center justify-center"
                style={{ aspectRatio: "16/9", background: "#111", border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)" }}>
                <img src={url} alt="preview" className="max-w-full max-h-full object-contain" />
              </div>
              <input autoFocus value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Título…"
                className="w-full bg-bg-main border border-primary/15 rounded-xl px-4 py-2.5 text-sm font-black uppercase tracking-wide text-primary outline-none focus:border-primary/40 transition-colors placeholder:text-primary/20" />
              <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)}
                placeholder="Descripción opcional…" rows={3}
                className="w-full bg-bg-main border border-primary/15 rounded-xl px-4 py-2.5 text-sm font-light text-primary outline-none focus:border-primary/40 transition-colors resize-none leading-relaxed placeholder:text-primary/20" />
              <p className="text-[9px] text-primary/25 font-black uppercase tracking-widest">
                Posición, colores y texto se ajustan desde el editor
              </p>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setStep("pick")}
                  className="px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest text-primary/40 hover:text-primary transition-all"
                  style={{ borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)" }}>Atrás</button>
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

// ─── Página principal ─────────────────────────────────────────────────────────

export default function GaleriaPage() {
  const { user }  = useAuth() as { user: any };
  const isAdmin   = !!user;
  const { items, setItems, loading, reload } = useGaleria();
  const [showAdd, setShowAdd] = useState(false);

  const handleUpdate = useCallback(async (id: number, updates: Partial<GaleriaItem>) => {
    // Esta función SOLO se llama desde GaleriaSection.handleSave,
    // que SOLO se llama desde el botón "Guardar cambios" del editor.
    // NUNCA se llama durante el drag.
    const { error } = await supabase.from("galeria").update(updates).eq("id", id);
    if (!error) setItems(prev => prev.map(it => it.id === id ? { ...it, ...updates } : it));
  }, [setItems]);

  const handleDelete = useCallback(async (id: number) => {
    const { error } = await supabase.from("galeria").delete().eq("id", id);
    if (!error) setItems(prev => prev.filter(it => it.id !== id));
  }, [setItems]);

  const handleMove = useCallback(async (index: number, dir: "up" | "down") => {
    const arr  = [...items];
    const swap = dir === "up" ? index - 1 : index + 1;
    if (swap < 0 || swap >= arr.length) return;
    [arr[index], arr[swap]] = [arr[swap], arr[index]];
    const reordered = arr.map((it, i) => ({ ...it, orden: i }));
    setItems(reordered);
    await Promise.all(reordered.map(it =>
      supabase.from("galeria").update({ orden: it.orden }).eq("id", it.id)
    ));
  }, [items, setItems]);

  return (
    <div className="w-full bg-bg-main min-h-screen">
      <header className="max-w-3xl mx-auto px-6 pt-20 md:pt-32 pb-16 md:pb-24">
        <div className="overflow-hidden mb-6">
          <motion.h1 initial={{ y: "110%" }} animate={{ y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="font-black italic uppercase leading-[0.85]"
            style={{ color: "var(--primary)", fontSize: "clamp(3rem, 11vw, 8rem)", letterSpacing: "-0.03em" }}>
            Galería
          </motion.h1>
        </div>
        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ duration: 0.9, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="h-[2px] w-28 origin-left rounded-full"
          style={{ background: "color-mix(in srgb, var(--primary) 22%, transparent)" }} />
        {isAdmin && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-8">
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-dashed transition-all hover:opacity-80"
              style={{ borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)", color: "color-mix(in srgb, var(--primary) 60%, transparent)" }}>
              <Plus size={12} /> Añadir obra
            </button>
          </motion.div>
        )}
      </header>

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
          <div>
            {items.map((item, i) => (
              <GaleriaSection key={item.id} item={item} isAdmin={isAdmin}
                isFirst={i === 0} isLast={i === items.length - 1}
                onUpdate={handleUpdate} onDelete={handleDelete}
                onMoveUp={() => handleMove(i, "up")} onMoveDown={() => handleMove(i, "down")} />
            ))}
          </div>
        )}
      </main>

      <footer className="max-w-3xl mx-auto px-6 py-24">
        <div className="flex items-center gap-6">
          <div className="h-px flex-1" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
          <span className="text-[20px]" style={{ color: "var(--primary)", opacity: 0.12 }}>⚝</span>
          <div className="h-px flex-1" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
        </div>
      </footer>

      <AnimatePresence>
        {showAdd && <AddModal onClose={() => setShowAdd(false)} onSuccess={reload} nextOrden={items.length} />}
      </AnimatePresence>
    </div>
  );
}