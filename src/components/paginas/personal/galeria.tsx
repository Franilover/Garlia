"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/api/client/supabase";
import SimpleImagePicker from "@/components/forms/SimpleImagePicker";
import { useAuth } from "@/providers/AuthProvider";
import {
  Plus, X, Save, Loader2, Pencil, Trash2, Move,
  ZoomIn, ZoomOut, AlignCenter, ChevronUp, ChevronDown,
  Check, Palette, ImageIcon, Type,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface GaleriaItem {
  id: number;
  titulo: string | null;
  descripcion: string | null;
  url_imagen: string;
  bg_color: string;
  img_x: number;       // % horizontal (0–100)
  img_y: number;       // % vertical   (0–100)
  img_scale: number;   // multiplicador (0.3–2)
  img_width: number;   // % del ancho del contenedor (20–100)
  orden: number;
  creado_en: string;
}

type DraftLayout = Pick<GaleriaItem, "img_x" | "img_y" | "img_scale" | "img_width" | "bg_color">;

// ─── Paleta de colores de fondo ───────────────────────────────────────────────

const BG_PRESETS = [
  { label: "Blanco",       value: "#ffffff" },
  { label: "Negro",        value: "#0a0a0a" },
  { label: "Crema",        value: "#f5efe6" },
  { label: "Gris cálido",  value: "#e8e4df" },
  { label: "Gris frío",    value: "#e0e4e8" },
  { label: "Carbón",       value: "#1a1a1a" },
  { label: "Sepia",        value: "#d9c9b0" },
  { label: "Rosa polvoso", value: "#f0ddd8" },
  { label: "Sage",         value: "#d4ddd0" },
  { label: "Azul noche",   value: "#0d1117" },
  { label: "Pergamino",    value: "#ede0c8" },
  { label: "Pizarra",      value: "#2d3748" },
];

// ─── Utilidades ──────────────────────────────────────────────────────────────

function isLight(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

// ─── Hook de datos ────────────────────────────────────────────────────────────

function useGaleria() {
  const [items,   setItems]   = useState<GaleriaItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("galeria")
      .select("*")
      .order("orden", { ascending: true })
      .order("creado_en", { ascending: false });
    if (!error && data) setItems(data as GaleriaItem[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { items, setItems, loading, reload: load };
}

// ─── Panel de edición de canvas ──────────────────────────────────────────────

function CanvasEditor({
  item,
  draft,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  item: GaleriaItem;
  draft: DraftLayout;
  onChange: (d: Partial<DraftLayout>) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const light = isLight(draft.bg_color);
  const textColor = light ? "#1a1a1a" : "#f5f5f5";

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="absolute top-4 right-4 z-20 w-64 rounded-2xl shadow-2xl overflow-hidden"
      style={{ background: "var(--white-custom)", border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)" }}
    >
      <div className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/50 flex items-center gap-1.5">
          <Pencil size={10} /> Editor
        </span>
        <button onClick={onCancel} className="text-primary/30 hover:text-primary transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="p-4 space-y-5">

        {/* Color de fondo */}
        <div className="space-y-2">
          <label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/40 flex items-center gap-1.5">
            <Palette size={9} /> Fondo
          </label>
          <div className="grid grid-cols-6 gap-1.5">
            {BG_PRESETS.map(p => (
              <button
                key={p.value}
                title={p.label}
                onClick={() => onChange({ bg_color: p.value })}
                className="w-8 h-8 rounded-lg transition-all hover:scale-110"
                style={{
                  backgroundColor: p.value,
                  border: draft.bg_color === p.value
                    ? "2px solid var(--primary)"
                    : "2px solid color-mix(in srgb, var(--primary) 15%, transparent)",
                  transform: draft.bg_color === p.value ? "scale(1.15)" : undefined,
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-primary/30">Hex</label>
            <input
              type="text"
              value={draft.bg_color}
              onChange={e => e.target.value.match(/^#[0-9a-fA-F]{0,6}$/) && onChange({ bg_color: e.target.value })}
              className="flex-1 text-[10px] font-mono bg-bg-main border border-primary/15 rounded-lg px-2 py-1 text-primary outline-none focus:border-primary/40"
            />
            <input
              type="color"
              value={draft.bg_color}
              onChange={e => onChange({ bg_color: e.target.value })}
              className="w-7 h-7 rounded-lg border border-primary/15 cursor-pointer bg-transparent"
            />
          </div>
        </div>

        {/* Posición X */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/40 flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Move size={9} /> Posición horizontal</span>
            <span className="font-mono text-primary/60">{draft.img_x}%</span>
          </label>
          <input
            type="range" min={0} max={100} value={draft.img_x}
            onChange={e => onChange({ img_x: +e.target.value })}
            className="w-full h-1.5 rounded-full cursor-pointer"
            style={{ accentColor: "var(--primary)" }}
          />
        </div>

        {/* Posición Y */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/40 flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Move size={9} /> Posición vertical</span>
            <span className="font-mono text-primary/60">{draft.img_y}%</span>
          </label>
          <input
            type="range" min={0} max={100} value={draft.img_y}
            onChange={e => onChange({ img_y: +e.target.value })}
            className="w-full h-1.5 rounded-full cursor-pointer"
            style={{ accentColor: "var(--primary)" }}
          />
        </div>

        {/* Ancho */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/40 flex items-center justify-between">
            <span className="flex items-center gap-1.5"><AlignCenter size={9} /> Ancho</span>
            <span className="font-mono text-primary/60">{draft.img_width}%</span>
          </label>
          <input
            type="range" min={15} max={100} value={draft.img_width}
            onChange={e => onChange({ img_width: +e.target.value })}
            className="w-full h-1.5 rounded-full cursor-pointer"
            style={{ accentColor: "var(--primary)" }}
          />
        </div>

        {/* Escala */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/40 flex items-center justify-between">
            <span className="flex items-center gap-1.5"><ZoomIn size={9} /> Escala</span>
            <span className="font-mono text-primary/60">{draft.img_scale.toFixed(2)}×</span>
          </label>
          <input
            type="range" min={30} max={200} value={Math.round(draft.img_scale * 100)}
            onChange={e => onChange({ img_scale: +e.target.value / 100 })}
            className="w-full h-1.5 rounded-full cursor-pointer"
            style={{ accentColor: "var(--primary)" }}
          />
          <div className="flex gap-1.5">
            {[0.5, 0.75, 1, 1.25, 1.5].map(v => (
              <button
                key={v}
                onClick={() => onChange({ img_scale: v })}
                className="flex-1 py-1 rounded-lg text-[8px] font-black uppercase tracking-wide border transition-all"
                style={{
                  background: draft.img_scale === v ? "var(--primary)" : "transparent",
                  color: draft.img_scale === v ? "var(--btn-text)" : "color-mix(in srgb, var(--primary) 40%, transparent)",
                  borderColor: draft.img_scale === v ? "var(--primary)" : "color-mix(in srgb, var(--primary) 15%, transparent)",
                }}
              >
                {v}×
              </button>
            ))}
          </div>
        </div>

        {/* Guardar */}
        <button
          onClick={onSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
          style={{ background: "var(--primary)", color: "var(--btn-text)" }}
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Editor de texto inline ──────────────────────────────────────────────────

function TextEditor({
  item,
  onSave,
  onCancel,
}: {
  item: GaleriaItem;
  onSave: (titulo: string, descripcion: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [titulo,      setTitulo]      = useState(item.titulo || "");
  const [descripcion, setDescripcion] = useState(item.descripcion || "");
  const [saving,      setSaving]      = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(titulo, descripcion);
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="mt-6 space-y-3 p-4 rounded-2xl"
      style={{
        background: "color-mix(in srgb, var(--primary) 4%, var(--white-custom))",
        border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
      }}
    >
      <p className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/40 flex items-center gap-1.5">
        <Type size={9} /> Editar texto
      </p>
      <input
        value={titulo}
        onChange={e => setTitulo(e.target.value)}
        placeholder="Título de la obra…"
        className="w-full bg-bg-main border border-primary/15 rounded-xl px-4 py-2.5 text-sm font-black text-primary outline-none focus:border-primary/40 transition-colors placeholder:text-primary/20 uppercase tracking-wide"
      />
      <textarea
        value={descripcion}
        onChange={e => setDescripcion(e.target.value)}
        placeholder="Descripción, fecha, contexto…"
        rows={4}
        className="w-full bg-bg-main border border-primary/15 rounded-xl px-4 py-2.5 text-sm text-primary outline-none focus:border-primary/40 transition-colors resize-none leading-relaxed placeholder:text-primary/20 font-light"
      />
      <div className="flex gap-2">
        <button
          onClick={handleSave} disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
          style={{ background: "var(--primary)", color: "var(--btn-text)" }}
        >
          {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
          {saving ? "Guardando…" : "Guardar"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest text-primary/40 hover:text-primary transition-all"
          style={{ borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)" }}
        >
          Cancelar
        </button>
      </div>
    </motion.div>
  );
}

// ─── Sección individual ───────────────────────────────────────────────────────

function GaleriaSection({
  item,
  isAdmin,
  isFirst,
  isLast,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  item: GaleriaItem;
  isAdmin: boolean;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (id: number, updates: Partial<GaleriaItem>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [editingCanvas, setEditingCanvas] = useState(false);
  const [editingText,   setEditingText]   = useState(false);
  const [savingLayout,  setSavingLayout]  = useState(false);
  const [draft, setDraft] = useState<DraftLayout>({
    img_x:     item.img_x,
    img_y:     item.img_y,
    img_scale: item.img_scale,
    img_width: item.img_width,
    bg_color:  item.bg_color,
  });

  const light    = isLight(item.bg_color);
  const textOnBg = light ? "rgba(0,0,0,0.75)" : "rgba(255,255,255,0.75)";
  const textOnBgStrong = light ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.92)";

  const handleSaveLayout = async () => {
    setSavingLayout(true);
    await onUpdate(item.id, draft);
    setSavingLayout(false);
    setEditingCanvas(false);
  };

  const handleSaveText = async (titulo: string, descripcion: string) => {
    await onUpdate(item.id, { titulo, descripcion });
    setEditingText(false);
  };

  const imgStyle: React.CSSProperties = {
    position:  "absolute",
    left:      `${draft.img_x}%`,
    top:       `${draft.img_y}%`,
    transform: `translate(-50%, -50%) scale(${draft.img_scale})`,
    width:     `${draft.img_width}%`,
    maxWidth:  "none",
    objectFit: "contain",
    transformOrigin: "center center",
    transition: editingCanvas ? "none" : "all 0.4s ease",
    userSelect: "none",
    pointerEvents: editingCanvas ? "none" : "auto",
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="w-full"
    >
      {/* Área de imagen — canvas */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          backgroundColor: item.bg_color,
          minHeight: "70vh",
          aspectRatio: "auto",
        }}
      >
        {/* Imagen posicionada */}
        <div className="relative w-full" style={{ minHeight: "70vh" }}>
          <img
            src={item.url_imagen}
            alt={item.titulo || "Obra"}
            style={imgStyle}
            draggable={false}
          />
        </div>

        {/* Editor de canvas (modo admin) */}
        <AnimatePresence>
          {editingCanvas && (
            <CanvasEditor
              item={item}
              draft={draft}
              onChange={d => setDraft(prev => ({ ...prev, ...d }))}
              onSave={handleSaveLayout}
              onCancel={() => { setDraft({ img_x: item.img_x, img_y: item.img_y, img_scale: item.img_scale, img_width: item.img_width, bg_color: item.bg_color }); setEditingCanvas(false); }}
              saving={savingLayout}
            />
          )}
        </AnimatePresence>

        {/* Barra de controles admin */}
        {isAdmin && !editingCanvas && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
            <button
              onClick={onMoveUp} disabled={isFirst}
              className="w-7 h-7 flex items-center justify-center rounded-lg backdrop-blur-sm transition-all disabled:opacity-30"
              style={{ background: "color-mix(in srgb, var(--primary) 80%, transparent)", color: "var(--btn-text)" }}
            >
              <ChevronUp size={13} />
            </button>
            <button
              onClick={onMoveDown} disabled={isLast}
              className="w-7 h-7 flex items-center justify-center rounded-lg backdrop-blur-sm transition-all disabled:opacity-30"
              style={{ background: "color-mix(in srgb, var(--primary) 80%, transparent)", color: "var(--btn-text)" }}
            >
              <ChevronDown size={13} />
            </button>
            <button
              onClick={() => setEditingCanvas(true)}
              className="flex items-center gap-1.5 px-3 h-7 rounded-lg backdrop-blur-sm text-[9px] font-black uppercase tracking-widest transition-all"
              style={{ background: "color-mix(in srgb, var(--primary) 80%, transparent)", color: "var(--btn-text)" }}
            >
              <Pencil size={10} /> Canvas
            </button>
            <button
              onClick={async () => {
                if (confirm("¿Eliminar esta obra?")) await onDelete(item.id);
              }}
              className="w-7 h-7 flex items-center justify-center rounded-lg backdrop-blur-sm transition-all hover:bg-red-500"
              style={{ background: "color-mix(in srgb, var(--primary) 80%, transparent)", color: "var(--btn-text)" }}
            >
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </div>

      {/* Área de texto */}
      <div
        className="max-w-3xl mx-auto px-6 md:px-0 py-10 md:py-14"
      >
        {/* Título */}
        {item.titulo && (
          <h2
            className="font-black italic uppercase leading-tight mb-4"
            style={{
              color: "var(--primary)",
              fontSize: "clamp(1.8rem, 5vw, 3.5rem)",
              letterSpacing: "-0.025em",
            }}
          >
            {item.titulo}
          </h2>
        )}

        {/* Descripción */}
        {item.descripcion && (
          <p
            className="text-base md:text-lg font-light leading-relaxed"
            style={{ color: "var(--foreground)", opacity: 0.7, maxWidth: "55ch" }}
          >
            {item.descripcion}
          </p>
        )}

        {/* Sin texto — placeholder para admin */}
        {isAdmin && !item.titulo && !item.descripcion && (
          <p className="text-[10px] font-black uppercase tracking-widest text-primary/20 italic">
            Sin título ni descripción — añade texto con el botón de abajo
          </p>
        )}

        {/* Botón editar texto (admin) */}
        {isAdmin && !editingText && (
          <button
            onClick={() => setEditingText(true)}
            className="mt-6 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-primary/30 hover:text-primary transition-colors"
          >
            <Type size={10} /> {item.titulo || item.descripcion ? "Editar texto" : "Añadir texto"}
          </button>
        )}

        {/* Editor de texto */}
        <AnimatePresence>
          {editingText && (
            <TextEditor
              item={item}
              onSave={handleSaveText}
              onCancel={() => setEditingText(false)}
            />
          )}
        </AnimatePresence>

        {/* Separador */}
        <div
          className="mt-12 md:mt-16 h-px w-24"
          style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
        />
      </div>
    </motion.article>
  );
}

// ─── Modal para añadir nueva obra ─────────────────────────────────────────────

function AddModal({
  onClose,
  onSuccess,
  nextOrden,
}: {
  onClose: () => void;
  onSuccess: () => void;
  nextOrden: number;
}) {
  const [step,        setStep]        = useState<"pick" | "meta">("pick");
  const [url,         setUrl]         = useState("");
  const [titulo,      setTitulo]      = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [saving,      setSaving]      = useState(false);

  const handlePick = (selectedUrl: string) => { setUrl(selectedUrl); setStep("meta"); };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("galeria").insert([{
      url_imagen:  url,
      titulo:      titulo.trim() || null,
      descripcion: descripcion.trim() || null,
      bg_color:    "#ffffff",
      img_x:       50,
      img_y:       50,
      img_scale:   1,
      img_width:   60,
      orden:       nextOrden,
    }]);
    setSaving(false);
    if (!error) { onSuccess(); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6">
      <div className="absolute inset-0 bg-primary/30 backdrop-blur-md" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-lg rounded-[var(--radius-card)] overflow-hidden shadow-2xl"
        style={{ background: "var(--white-custom)", border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)" }}
      >
        <div className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 flex items-center gap-2">
            <ImageIcon size={11} /> Nueva Obra
          </h3>
          <button onClick={onClose} className="text-primary/30 hover:text-primary transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-6">
          {step === "pick" ? (
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary/30 text-center pb-2">
                Selecciona la imagen
              </p>
              <SimpleImagePicker onSelect={handlePick} onClose={onClose} />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview */}
              <div
                className="w-full rounded-xl overflow-hidden flex items-center justify-center"
                style={{ aspectRatio: "16/9", background: "#f0f0f0", border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)" }}
              >
                <img src={url} alt="preview" className="max-w-full max-h-full object-contain" />
              </div>

              <input
                autoFocus
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                placeholder="Título de la obra…"
                className="w-full bg-bg-main border border-primary/15 rounded-xl px-4 py-2.5 text-sm font-black uppercase tracking-wide text-primary outline-none focus:border-primary/40 transition-colors placeholder:text-primary/20"
              />
              <textarea
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                placeholder="Descripción opcional…"
                rows={3}
                className="w-full bg-bg-main border border-primary/15 rounded-xl px-4 py-2.5 text-sm font-light text-primary outline-none focus:border-primary/40 transition-colors resize-none leading-relaxed placeholder:text-primary/20"
              />

              <p className="text-[9px] text-primary/30 font-black uppercase tracking-widest">
                Puedes ajustar la posición y fondo después desde el editor de canvas
              </p>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setStep("pick")}
                  className="px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest text-primary/40 hover:text-primary transition-all"
                  style={{ borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)" }}
                >
                  Atrás
                </button>
                <button
                  onClick={handleSave} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  style={{ background: "var(--primary)", color: "var(--btn-text)" }}
                >
                  {saving ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                  {saving ? "Guardando…" : "Añadir a la galería"}
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
  const { user } = useAuth() as { user: any };
  const isAdmin = !!user;

  const { items, setItems, loading, reload } = useGaleria();
  const [showAdd, setShowAdd] = useState(false);

  const handleUpdate = useCallback(async (id: number, updates: Partial<GaleriaItem>) => {
    const { error } = await supabase.from("galeria").update(updates).eq("id", id);
    if (!error) {
      setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    }
  }, [setItems]);

  const handleDelete = useCallback(async (id: number) => {
    const { error } = await supabase.from("galeria").delete().eq("id", id);
    if (!error) setItems(prev => prev.filter(item => item.id !== id));
  }, [setItems]);

  const handleMove = useCallback(async (index: number, dir: "up" | "down") => {
    const arr  = [...items];
    const swap = dir === "up" ? index - 1 : index + 1;
    if (swap < 0 || swap >= arr.length) return;
    [arr[index], arr[swap]] = [arr[swap], arr[index]];
    const reordered = arr.map((item, i) => ({ ...item, orden: i }));
    setItems(reordered);
    // Actualizar en supabase
    await Promise.all(reordered.map(item =>
      supabase.from("galeria").update({ orden: item.orden }).eq("id", item.id)
    ));
  }, [items, setItems]);

  return (
    <div className="w-full bg-bg-main min-h-screen">

      {/* Header */}
      <header className="max-w-3xl mx-auto px-6 pt-20 md:pt-32 pb-16 md:pb-24">
        <div className="overflow-hidden mb-6">
          <motion.h1
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="font-black italic uppercase leading-[0.85]"
            style={{
              color: "var(--primary)",
              fontSize: "clamp(3rem, 11vw, 8rem)",
              letterSpacing: "-0.03em",
            }}
          >
            Galería
          </motion.h1>
        </div>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.9, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="h-[2px] w-28 origin-left rounded-full"
          style={{ background: "color-mix(in srgb, var(--primary) 22%, transparent)" }}
        />

        {/* Botón añadir — solo admin */}
        {isAdmin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8"
          >
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-dashed transition-all hover:opacity-80"
              style={{
                borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)",
                color: "color-mix(in srgb, var(--primary) 60%, transparent)",
              }}
            >
              <Plus size={12} /> Añadir obra
            </button>
          </motion.div>
        )}
      </header>

      {/* Contenido */}
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
              <GaleriaSection
                key={item.id}
                item={item}
                isAdmin={isAdmin}
                isFirst={i === 0}
                isLast={i === items.length - 1}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onMoveUp={() => handleMove(i, "up")}
                onMoveDown={() => handleMove(i, "down")}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer decorativo */}
      <footer className="max-w-3xl mx-auto px-6 py-24">
        <div className="flex items-center gap-6">
          <div className="h-px flex-1" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
          <span className="text-[20px]" style={{ color: "var(--primary)", opacity: 0.12 }}>⚝</span>
          <div className="h-px flex-1" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
        </div>
      </footer>

      {/* Modal añadir */}
      <AnimatePresence>
        {showAdd && (
          <AddModal
            onClose={() => setShowAdd(false)}
            onSuccess={reload}
            nextOrden={items.length}
          />
        )}
      </AnimatePresence>
    </div>
  );
}