"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trash2, Save, X, Loader2, Shirt, ZoomIn, Plus, Image as ImageIcon, Pencil, SlidersHorizontal, Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import SimpleImagePicker from "@/components/forms/SimpleImagePicker";

// ─── TIPOS ───────────────────────────────────────────────────────────────────
type Categoria = "Superior" | "Inferior" | "Calzado" | "Accesorios" | "Outfit";
type Temporada = "Primavera" | "Verano" | "Otoño" | "Invierno";
type Vibra     = "Casual" | "Formal" | "Sport" | "Noche" | "Aesthetic";
type Color     = "Negro" | "Blanco" | "Gris" | "Rosa" | "Rojo" | "Azul" | "Verde" | "Beige" | "Marrón" | "Lila";

interface Prenda {
  id: string;
  nombre: string;
  categoria: Categoria;
  imagen_url: string;
  temporadas?: Temporada[];
  vibras?: Vibra[];
  colores?: Color[];
}

interface FormData {
  nombre: string;
  categoria: Categoria;
  imagen_url: string;
  temporadas: Temporada[];
  vibras: Vibra[];
  colores: Color[];
}

const CATEGORIAS: Categoria[]  = ["Superior", "Inferior", "Calzado", "Accesorios", "Outfit"];
const TEMPORADAS: Temporada[]  = ["Primavera", "Verano", "Otoño", "Invierno"];
const VIBRAS: Vibra[]          = ["Casual", "Formal", "Sport", "Noche", "Aesthetic"];
const COLORES: Color[]         = ["Negro", "Blanco", "Gris", "Rosa", "Rojo", "Azul", "Verde", "Beige", "Marrón", "Lila"];

const COLOR_DOT: Record<Color, string> = {
  Negro: "#1a1a1a", Blanco: "#f5f5f5", Gris: "#9ca3af", Rosa: "#f9a8d4",
  Rojo: "#ef4444", Azul: "#3b82f6", Verde: "#22c55e", Beige: "#d4b896",
  Marrón: "#92400e", Lila: "#c084fc",
};

const EMPTY_FORM: FormData = {
  nombre: "", categoria: "Superior", imagen_url: "",
  temporadas: [], vibras: [], colores: [],
};

// ─── Toggle helper ────────────────────────────────────────────────────────────
function toggleArr<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];
}

// ─── Chip multi-toggle ────────────────────────────────────────────────────────
function ChipGroup<T extends string>({
  options, selected, onToggle, colorDot,
}: {
  options: T[]; selected: T[]; onToggle: (v: T) => void; colorDot?: Record<T, string>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest transition-all border",
              active
                ? "bg-primary text-btn-text border-primary"
                : "bg-primary/5 text-muted-on-surface border-primary/10 hover:border-primary/30"
            )}
            style={{ borderRadius: "var(--radius-btn)" }}
          >
            {colorDot && (
              <span
                className="w-2 h-2 rounded-full shrink-0 border border-white/20"
                style={{ background: colorDot[opt] }}
              />
            )}
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ─── Formulario ───────────────────────────────────────────────────────────────
interface PrendaFormProps {
  initial: FormData;
  onSave: (data: FormData) => Promise<void>;
  onClose: () => void;
  saving: boolean;
  title: string;
  icon: React.ReactNode;
}

function PrendaForm({ initial, onSave, onClose, saving, title, icon }: PrendaFormProps) {
  const [form, setForm]         = useState<FormData>(initial);
  const [showPicker, setShowPicker] = useState(false);

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  return (
    <>
      <div className="flex items-center justify-between p-5 border-b border-primary/10">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-xs font-black uppercase tracking-widest text-on-surface">{title}</h3>
        </div>
        <button onClick={onClose} className="p-1.5 text-muted-on-surface hover:text-on-surface transition-colors" style={{ borderRadius: "9999px" }}>
          <X size={16} />
        </button>
      </div>

      <div className="p-5 flex flex-col gap-4 overflow-y-auto" style={{ maxHeight: "80vh" }}>
        {/* Imagen */}
        {!showPicker ? (
          <button
            onClick={() => setShowPicker(true)}
            className={cn(
              "relative w-full aspect-video border-2 border-dashed transition-all overflow-hidden group",
              form.imagen_url ? "border-primary/20" : "border-primary/10 hover:border-primary/30"
            )}
            style={{ borderRadius: "var(--radius-card)" }}
          >
            {form.imagen_url ? (
              <>
                <img src={form.imagen_url} className="w-full h-full object-cover" alt="preview" />
                <div className="absolute inset-0 bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <ImageIcon size={16} className="text-white" />
                  <span className="text-[10px] font-black uppercase text-white tracking-widest">Cambiar foto</span>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-primary/5">
                <ImageIcon size={28} className="text-primary/20" />
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-on-surface">Elegir foto</span>
              </div>
            )}
          </button>
        ) : (
          <div className="border border-primary/10 overflow-hidden" style={{ borderRadius: "var(--radius-card)" }}>
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-on-surface">Selecciona una foto</p>
              <button onClick={() => setShowPicker(false)} className="text-muted-on-surface hover:text-on-surface"><X size={14} /></button>
            </div>
            <div className="px-4 pb-4">
              <SimpleImagePicker
                onSelect={(url) => { set("imagen_url", url); setShowPicker(false); }}
                onClose={() => setShowPicker(false)}
              />
            </div>
          </div>
        )}

        {!showPicker && (
          <>
            {/* Nombre */}
            <input
              type="text"
              placeholder="NOMBRE..."
              value={form.nombre}
              onChange={(e) => set("nombre", e.target.value.toUpperCase())}
              className="input-brand text-[10px] font-black"
            />

            {/* Categoría */}
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-muted-on-surface mb-2">Categoría</p>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIAS.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => set("categoria", cat)}
                    className={cn(
                      "px-2.5 py-1 text-[8px] font-black uppercase tracking-widest transition-all border",
                      form.categoria === cat
                        ? "bg-primary text-btn-text border-primary"
                        : "bg-primary/5 text-muted-on-surface border-primary/10 hover:border-primary/30"
                    )}
                    style={{ borderRadius: "var(--radius-btn)" }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Temporada */}
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-muted-on-surface mb-2">Temporada</p>
              <ChipGroup options={TEMPORADAS} selected={form.temporadas} onToggle={(v) => set("temporadas", toggleArr(form.temporadas, v))} />
            </div>

            {/* Vibra */}
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-muted-on-surface mb-2">Vibra</p>
              <ChipGroup options={VIBRAS} selected={form.vibras} onToggle={(v) => set("vibras", toggleArr(form.vibras, v))} />
            </div>

            {/* Colores */}
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-muted-on-surface mb-2">Colores</p>
              <ChipGroup options={COLORES} selected={form.colores} onToggle={(v) => set("colores", toggleArr(form.colores, v))} colorDot={COLOR_DOT} />
            </div>

            <button
              onClick={() => onSave(form)}
              disabled={!form.nombre || !form.imagen_url || saving}
              className="btn-brand w-full text-[10px] uppercase tracking-widest"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Guardar
            </button>
          </>
        )}
      </div>
    </>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function ArmarioPage() {
  const { 
    data: prendas = [], 
    loading,
    addRow: addPrenda,
    updateRow: updatePrenda,
    deleteRow: deletePrenda,
    refetch: refetchPrendas,
  } = useSupabaseData<Prenda>("ropa", {
    order: { campo: "created_at", asc: false }
  });

  // modales
  const [lightbox, setLightbox]           = useState<Prenda | null>(null);
  const [showNueva, setShowNueva]         = useState(false);
  const [editando, setEditando]           = useState<Prenda | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Prenda | null>(null);
  const [savingPrenda, setSavingPrenda]   = useState(false);
  const [deletingId, setDeletingId]       = useState<string | null>(null);

  // filtros activos
  const [filtroCategoria, setFiltroCategoria] = useState<Categoria | null>(null);
  const [filtroTemporada, setFiltroTemporada] = useState<Temporada | null>(null);
  const [filtroVibra, setFiltroVibra]         = useState<Vibra | null>(null);
  const [filtroColor, setFiltroColor]         = useState<Color | null>(null);
  const [showFiltros, setShowFiltros]         = useState(false);

  const hayFiltros = filtroCategoria || filtroTemporada || filtroVibra || filtroColor;

  const prendasFiltradas = useMemo(() => {
    return prendas.filter((p: Prenda) => {
      if (filtroCategoria && p.categoria !== filtroCategoria) return false;
      if (filtroTemporada && !p.temporadas?.includes(filtroTemporada)) return false;
      if (filtroVibra     && !p.vibras?.includes(filtroVibra))         return false;
      if (filtroColor     && !p.colores?.includes(filtroColor))        return false;
      return true;
    });
  }, [prendas, filtroCategoria, filtroTemporada, filtroVibra, filtroColor]);

  const limpiarFiltros = () => {
    setFiltroCategoria(null); setFiltroTemporada(null);
    setFiltroVibra(null); setFiltroColor(null);
  };

  // handlers
  const guardarNueva = async (data: FormData) => {
    setSavingPrenda(true);
    const { error } = await addPrenda(data);
    if (!error) { setShowNueva(false); await refetchPrendas(); }
    setSavingPrenda(false);
  };

  const guardarEdicion = async (data: FormData) => {
    if (!editando) return;
    setSavingPrenda(true);
    const { error } = await updatePrenda(editando.id, data);
    if (!error) { setEditando(null); await refetchPrendas(); }
    setSavingPrenda(false);
  };

  const confirmarBorrado = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    await deletePrenda(confirmDelete.id);
    setConfirmDelete(null);
    setDeletingId(null);
    await refetchPrendas();
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-bg-main">
      <Loader2 className="animate-spin text-primary/20" size={40} />
    </div>
  );

  // ─── Modal wrapper ────────────────────────────────────────────────────────
  const Modal = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 16 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className="modal-surface relative shadow-2xl w-full max-w-md overflow-hidden"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        {children}
      </motion.div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-bg-main">

      {/* ═══ MODAL: NUEVA ═══ */}
      <AnimatePresence>
        {showNueva && (
          <Modal onClose={() => setShowNueva(false)}>
            <PrendaForm title="Nueva Prenda" icon={<Plus size={16} className="text-primary" />}
              initial={EMPTY_FORM} onSave={guardarNueva} onClose={() => setShowNueva(false)} saving={savingPrenda} />
          </Modal>
        )}
      </AnimatePresence>

      {/* ═══ MODAL: EDITAR ═══ */}
      <AnimatePresence>
        {editando && (
          <Modal onClose={() => setEditando(null)}>
            <PrendaForm title="Editar Prenda" icon={<Pencil size={16} className="text-primary" />}
              initial={{
                nombre: editando.nombre, categoria: editando.categoria, imagen_url: editando.imagen_url,
                temporadas: editando.temporadas ?? [], vibras: editando.vibras ?? [], colores: editando.colores ?? [],
              }}
              onSave={guardarEdicion} onClose={() => setEditando(null)} saving={savingPrenda} />
          </Modal>
        )}
      </AnimatePresence>

      {/* ═══ MODAL: CONFIRMAR BORRADO ═══ */}
      <AnimatePresence>
        {confirmDelete && (
          <Modal onClose={() => setConfirmDelete(null)}>
            <div className="p-6 flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-full"><Trash2 size={18} className="text-red-400" /></div>
                <div>
                  <p className="text-xs font-black uppercase text-on-surface">¿Borrar?</p>
                  <p className="text-[9px] text-muted-on-surface mt-0.5 uppercase tracking-widest">{confirmDelete.nombre}</p>
                </div>
              </div>
              {confirmDelete.imagen_url && (
                <div className="w-full aspect-video overflow-hidden bg-primary/5 opacity-50" style={{ borderRadius: "var(--radius-btn)" }}>
                  <img src={confirmDelete.imagen_url} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-muted-on-surface hover:text-on-surface transition-colors border border-primary/10"
                  style={{ borderRadius: "var(--radius-btn)" }}>
                  Cancelar
                </button>
                <button onClick={confirmarBorrado} disabled={!!deletingId}
                  className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ borderRadius: "var(--radius-btn)" }}>
                  {deletingId ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Borrar
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ═══ LIGHTBOX ═══ */}
      <AnimatePresence>
        {lightbox && (
          <Modal onClose={() => setLightbox(null)}>
            {/* Acciones */}
            <div className="absolute top-4 left-4 z-10 flex gap-2">
              <button onClick={() => { setEditando(lightbox); setLightbox(null); }}
                className="modal-surface p-2 shadow-md text-muted-on-surface hover:text-primary transition-colors"
                style={{ borderRadius: "9999px" }}>
                <Pencil size={14} />
              </button>
              <button onClick={() => { setConfirmDelete(lightbox); setLightbox(null); }}
                className="modal-surface p-2 shadow-md text-muted-on-surface hover:text-red-500 transition-colors"
                style={{ borderRadius: "9999px" }}>
                <Trash2 size={14} />
              </button>
            </div>
            <button onClick={() => setLightbox(null)}
              className="absolute top-4 right-4 z-10 modal-surface p-2 shadow-md text-muted-on-surface hover:text-on-surface transition-colors"
              style={{ borderRadius: "9999px" }}>
              <X size={16} />
            </button>

            <div className="aspect-3/4 w-full bg-primary/5 overflow-hidden flex items-center justify-center">
              {lightbox.imagen_url
                ? <img src={lightbox.imagen_url} alt={lightbox.nombre} className="w-full h-full object-cover" />
                : <Shirt className="text-primary/20" size={64} />
              }
            </div>

            <div className="p-5 border-t border-primary/10">
              <p className="text-xs font-black uppercase text-on-surface">{lightbox.nombre}</p>
              <p className="text-[9px] text-muted-on-surface uppercase tracking-widest mt-0.5">{lightbox.categoria}</p>

              {/* Tags del lightbox */}
              <div className="flex flex-wrap gap-1 mt-3">
                {lightbox.temporadas?.map(t => (
                  <span key={t} className="px-2 py-0.5 text-[7px] font-black uppercase tracking-widest bg-primary/10 text-primary" style={{ borderRadius: "var(--radius-btn)" }}>{t}</span>
                ))}
                {lightbox.vibras?.map(v => (
                  <span key={v} className="px-2 py-0.5 text-[7px] font-black uppercase tracking-widest bg-accent/20 text-primary" style={{ borderRadius: "var(--radius-btn)" }}>{v}</span>
                ))}
                {lightbox.colores?.map(c => (
                  <span key={c} className="flex items-center gap-1 px-2 py-0.5 text-[7px] font-black uppercase tracking-widest bg-primary/5 text-muted-on-surface" style={{ borderRadius: "var(--radius-btn)" }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: COLOR_DOT[c] }} />{c}
                  </span>
                ))}
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ═══ HEADER + FILTROS ═══ */}
      <div className="sticky top-0 z-40 backdrop-blur-md" style={{ background: "color-mix(in srgb, var(--bg-main) 90%, transparent)", borderBottom: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter text-primary italic leading-none">
              Armario
            </h1>
            <p className="text-muted-on-surface text-[9px] font-black uppercase tracking-widest mt-0.5">
              {prendasFiltradas.length} {prendasFiltradas.length !== prendas.length ? `de ${prendas.length}` : ""} prendas
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Botón filtros */}
            <button
              onClick={() => setShowFiltros(!showFiltros)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-[9px] font-black uppercase tracking-widest transition-all border",
                showFiltros || hayFiltros
                  ? "bg-primary text-btn-text border-primary"
                  : "bg-primary/5 text-muted-on-surface border-primary/10 hover:border-primary/30"
              )}
              style={{ borderRadius: "var(--radius-btn)" }}
            >
              <SlidersHorizontal size={12} />
              Filtros
              {hayFiltros && (
                <span className="bg-btn-text/20 text-btn-text px-1 rounded-full text-[7px]">
                  {[filtroCategoria, filtroTemporada, filtroVibra, filtroColor].filter(Boolean).length}
                </span>
              )}
            </button>

            <button onClick={() => setShowNueva(true)} className="btn-brand flex items-center gap-2 text-[10px] uppercase tracking-widest">
              <Plus size={14} />
              <span className="hidden sm:inline">Nueva</span>
            </button>
          </div>
        </div>

        {/* Panel filtros expandible */}
        <AnimatePresence>
          {showFiltros && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-primary/8"
            >
              <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-4">

                {/* Categoría */}
                <div className="flex items-start gap-4 flex-wrap">
                  <p className="text-[8px] font-black uppercase tracking-widest text-muted-on-surface w-20 shrink-0 pt-1">Categoría</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIAS.map(cat => (
                      <button key={cat}
                        onClick={() => setFiltroCategoria(filtroCategoria === cat ? null : cat)}
                        className={cn(
                          "px-2.5 py-1 text-[8px] font-black uppercase tracking-widest transition-all border",
                          filtroCategoria === cat ? "bg-primary text-btn-text border-primary" : "bg-primary/5 text-muted-on-surface border-primary/10 hover:border-primary/30"
                        )}
                        style={{ borderRadius: "var(--radius-btn)" }}>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Temporada */}
                <div className="flex items-start gap-4 flex-wrap">
                  <p className="text-[8px] font-black uppercase tracking-widest text-muted-on-surface w-20 shrink-0 pt-1">Temporada</p>
                  <div className="flex flex-wrap gap-1.5">
                    {TEMPORADAS.map(t => (
                      <button key={t}
                        onClick={() => setFiltroTemporada(filtroTemporada === t ? null : t)}
                        className={cn(
                          "px-2.5 py-1 text-[8px] font-black uppercase tracking-widest transition-all border",
                          filtroTemporada === t ? "bg-primary text-btn-text border-primary" : "bg-primary/5 text-muted-on-surface border-primary/10 hover:border-primary/30"
                        )}
                        style={{ borderRadius: "var(--radius-btn)" }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vibra */}
                <div className="flex items-start gap-4 flex-wrap">
                  <p className="text-[8px] font-black uppercase tracking-widest text-muted-on-surface w-20 shrink-0 pt-1">Vibra</p>
                  <div className="flex flex-wrap gap-1.5">
                    {VIBRAS.map(v => (
                      <button key={v}
                        onClick={() => setFiltroVibra(filtroVibra === v ? null : v)}
                        className={cn(
                          "px-2.5 py-1 text-[8px] font-black uppercase tracking-widest transition-all border",
                          filtroVibra === v ? "bg-primary text-btn-text border-primary" : "bg-primary/5 text-muted-on-surface border-primary/10 hover:border-primary/30"
                        )}
                        style={{ borderRadius: "var(--radius-btn)" }}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color */}
                <div className="flex items-start gap-4 flex-wrap">
                  <p className="text-[8px] font-black uppercase tracking-widest text-muted-on-surface w-20 shrink-0 pt-1">Color</p>
                  <div className="flex flex-wrap gap-1.5">
                    {COLORES.map(c => (
                      <button key={c}
                        onClick={() => setFiltroColor(filtroColor === c ? null : c)}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest transition-all border",
                          filtroColor === c ? "bg-primary text-btn-text border-primary" : "bg-primary/5 text-muted-on-surface border-primary/10 hover:border-primary/30"
                        )}
                        style={{ borderRadius: "var(--radius-btn)" }}>
                        <span className="w-2 h-2 rounded-full shrink-0 border border-black/10" style={{ background: COLOR_DOT[c] }} />
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Limpiar */}
                {hayFiltros && (
                  <button onClick={limpiarFiltros} className="self-start text-[8px] font-black uppercase tracking-widest text-muted-on-surface hover:text-on-surface transition-colors underline underline-offset-2">
                    Limpiar filtros
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══ GALERÍA ═══ */}
      <main className="max-w-7xl mx-auto p-6 md:p-10">

        {/* Chips de filtros activos (resumen) */}
        {hayFiltros && (
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              filtroCategoria && { label: filtroCategoria, clear: () => setFiltroCategoria(null) },
              filtroTemporada && { label: filtroTemporada, clear: () => setFiltroTemporada(null) },
              filtroVibra     && { label: filtroVibra,     clear: () => setFiltroVibra(null) },
              filtroColor     && { label: filtroColor,     clear: () => setFiltroColor(null) },
            ].filter(Boolean).map((f: any, i) => (
              <button key={i} onClick={f.clear}
                className="flex items-center gap-1.5 px-3 py-1 bg-primary text-btn-text text-[8px] font-black uppercase tracking-widest"
                style={{ borderRadius: "var(--radius-btn)" }}>
                {f.label} <X size={10} />
              </button>
            ))}
          </div>
        )}

        {prendasFiltradas.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-primary/10"
            style={{ borderRadius: "var(--radius-card)" }}
          >
            {hayFiltros ? (
              <>
                <SlidersHorizontal className="text-primary/10 mb-4" size={40} />
                <p className="text-[10px] font-black uppercase text-muted-on-surface mb-3">Sin resultados</p>
                <button onClick={limpiarFiltros} className="btn-brand text-[9px]">Limpiar filtros</button>
              </>
            ) : (
              <>
                <Plus className="text-primary/20 mb-4" size={48} />
                <p className="text-[10px] font-black uppercase text-muted-on-surface">Añade tu primera prenda</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {prendasFiltradas.map((prenda: Prenda) => (
              <div key={prenda.id} className="relative group/card">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setLightbox(prenda)}
                  className="card-main w-full relative aspect-3/4 border-2 border-primary/10 hover:border-primary/30 overflow-hidden group p-0 transition-all"
                >
                  <div className="absolute inset-0 flex items-center justify-center bg-primary/5">
                    {prenda.imagen_url
                      ? <img src={prenda.imagen_url} alt={prenda.nombre} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      : <Shirt className="text-primary/10" size={32} />
                    }
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="modal-surface p-3 rounded-full shadow-lg">
                      <ZoomIn size={18} className="text-primary" />
                    </div>
                  </div>

                  {/* Tags de color como puntos */}
                  {prenda.colores && prenda.colores.length > 0 && (
                    <div className="absolute top-2 right-2 flex gap-0.5">
                      {prenda.colores.slice(0, 4).map(c => (
                        <span key={c} className="w-2.5 h-2.5 rounded-full border border-white/40 shadow" style={{ background: COLOR_DOT[c] }} />
                      ))}
                    </div>
                  )}

                  {/* Info */}
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-foreground/80 to-transparent">
                    <p className="text-[9px] font-black text-white uppercase truncate">{prenda.nombre}</p>
                    <p className="text-[7px] font-bold text-white/40 uppercase tracking-widest">{prenda.categoria}</p>
                    {/* Vibra chips */}
                    {prenda.vibras && prenda.vibras.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {prenda.vibras.slice(0, 2).map(v => (
                          <span key={v} className="px-1.5 py-0.5 text-[6px] font-black uppercase bg-white/15 text-white/70" style={{ borderRadius: "var(--radius-btn)" }}>{v}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.button>

                {/* Botones editar/borrar */}
                <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-all">
                  <button onClick={() => setEditando(prenda)}
                    className="modal-surface p-1.5 shadow-md text-muted-on-surface hover:text-primary transition-colors"
                    style={{ borderRadius: "var(--radius-btn)" }}>
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => setConfirmDelete(prenda)}
                    className="modal-surface p-1.5 shadow-md text-muted-on-surface hover:text-red-500 transition-colors"
                    style={{ borderRadius: "var(--radius-btn)" }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}

            {/* Tarjeta añadir */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowNueva(true)}
              className="relative aspect-3/4 border-2 border-dashed border-primary/10 hover:border-primary/30 transition-all flex flex-col items-center justify-center gap-3 text-muted-on-surface hover:text-primary"
              style={{ borderRadius: "var(--radius-card)" }}
            >
              <Plus size={24} className="opacity-30" />
              <p className="text-[9px] font-black uppercase tracking-widest opacity-30">Añadir</p>
            </motion.button>
          </div>
        )}
      </main>
    </div>
  );
}