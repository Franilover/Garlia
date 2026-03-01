"use client";
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { Ingrediente } from "@/lib/types/personal/ingrediente";
import {
  Search, Plus, ChevronLeft, X, Loader2, Save,
  Package, PackageX, Minus, FlaskConical, Flame,
} from "lucide-react";
import Link from "next/link";

// ─── paleta 100% pastel ──────────────────────────────────────────────────────

const BG_PAGE    = "#e8e2f5";   // morado pastel visible
const BG_CARD    = "#dfd8f0";   // morado pastel más notorio para las cards
const BG_HEADER  = "#ede8f8";
const BORDER_CARD = "#cec5e5";

const CATEGORIA_PILL: Record<string, { bg: string; text: string; border: string }> = {
  "Proteínas":     { bg: "#fce8ea", text: "#c09098", border: "#f0c8cc" },
  "Carbohidratos": { bg: "#fdf0dc", text: "#c0a060", border: "#f0d898" },
  "Grasas":        { bg: "#fdfae0", text: "#b0a848", border: "#e8e098" },
  "Verduras":      { bg: "#e4f2ea", text: "#70a878", border: "#b8d8c0" },
  "Frutas":        { bg: "#fce8f2", text: "#c07898", border: "#f0c0d8" },
  "Lácteos":       { bg: "#e4eff8", text: "#6090b0", border: "#b0cce0" },
  "Superfoods":    { bg: "#ede8f8", text: "#9878c0", border: "#ccc0e0" },
  "Cereales":      { bg: "#fdeee0", text: "#b07848", border: "#f0ccaa" },
};

const CATEGORIA_DOT: Record<string, string> = {
  "Proteínas":     "#f0c0c8",
  "Carbohidratos": "#f5d880",
  "Grasas":        "#ece080",
  "Verduras":      "#a0d8a8",
  "Frutas":        "#f0b8d0",
  "Lácteos":       "#a8cce0",
  "Superfoods":    "#c8b8e0",
  "Cereales":      "#f0c898",
};

// Todos los colores de macros/micros: suaves, apagados, pasteles
const MC = {
  prot:  "#c8a8b8",
  carb:  "#c8b878",
  gras:  "#c0b860",
  fibra: "#98c0a0",
  sodio: "#90b0c8",
  agua:  "#88b8c8",
  text:  "#7868a0",
  muted: "#b8a8d0",
};

const CATEGORIAS = [
  "Proteínas", "Carbohidratos", "Grasas",
  "Verduras", "Frutas", "Lácteos", "Superfoods", "Cereales",
];

const INITIAL_FORM = {
  nombre: "", categoria: "Verduras", kcal: 0,
  proteinas: 0, carbohidratos: 0, grasas: 0,
  porcion_texto: "100g", stock_actual: 0,
  fibra: 0, sodio: 0, agua_ml: 0,
};

// ─── sub-components ──────────────────────────────────────────────────────────

function MacroBadge({ label, value, unit, color }: {
  label: string; value: number; unit: string; color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-2">
      <span className="text-[8px] font-black uppercase tracking-widest" style={{ color }}>
        {label}
      </span>
      <span className="text-[13px] font-black leading-none" style={{ color: MC.text }}>
        {value}
        <span className="text-[9px] font-semibold ml-0.5" style={{ color: MC.muted }}>{unit}</span>
      </span>
    </div>
  );
}

function FieldInput({
  label, type = "text", value, onChange, placeholder, required, min, step,
}: {
  label: string; type?: string; value: string | number;
  onChange: (v: string) => void; placeholder?: string;
  required?: boolean; min?: string; step?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[9px] font-black uppercase tracking-widest pl-1" style={{ color: "#a898c0" }}>
        {label}{required && <span className="ml-0.5" style={{ color: "#e0b0b8" }}>*</span>}
      </label>
      <input
        required={required}
        type={type}
        min={min}
        step={step}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl py-3.5 px-5 text-[11px] font-bold outline-none transition-all"
        style={{
          background: "#ede8f8",
          border: "1.5px solid #d8d0ec",
          color: "#7060a0",
        }}
      />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: "#b8a8d0" }}>
      {children}
    </p>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────

export const IngredientesPage = () => {
  const [filter, setFilter]           = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "in-stock" | "out-of-stock">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving]       = useState(false);
  const [formData, setFormData]       = useState(INITIAL_FORM);

  const { data: ingredientes, loading, refetch, addRow, updateRow } =
    useSupabaseData<Ingrediente>("ingredientes");

  const filteredItems = useMemo(() => {
    return (ingredientes || []).filter((item) => {
      const matchesSearch =
        item.nombre?.toLowerCase().includes(filter.toLowerCase()) ||
        item.categoria?.toLowerCase().includes(filter.toLowerCase());
      const hasStock = (item.stock_actual || 0) > 0;
      const matchesStock =
        stockFilter === "all" ? true :
        stockFilter === "in-stock" ? hasStock : !hasStock;
      return matchesSearch && matchesStock;
    });
  }, [ingredientes, filter, stockFilter]);

  const stats = useMemo(() => ({
    total:    (ingredientes || []).length,
    inStock:  (ingredientes || []).filter(i => (i.stock_actual || 0) > 0).length,
    outStock: (ingredientes || []).filter(i => (i.stock_actual || 0) === 0).length,
  }), [ingredientes]);

  const patch = (key: keyof typeof INITIAL_FORM) =>
    (v: string) => setFormData(p => ({ ...p, [key]: typeof INITIAL_FORM[key] === "number" ? Number(v) : v }));

  const handleUpdateStock = async (id: string, current: number, delta: number) => {
    const newStock = Math.max(0, current + delta);
    if (updateRow) {
      const result = await updateRow(id, { stock_actual: newStock });
      if (!result.error) refetch();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const result = await addRow(formData);
      if (result.error) {
        alert(`Error al guardar: ${result.error}`);
      } else {
        setIsModalOpen(false);
        setFormData(INITIAL_FORM);
        await refetch();
      }
    } catch (err) {
      alert(`Error inesperado: ${err}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen pb-28" style={{ background: BG_PAGE, color: MC.text }}>

      {/* ── HEADER ── */}
      <header
        className="sticky top-0 z-10 backdrop-blur-xl"
        style={{ background: `${BG_HEADER}f0`, borderBottom: "1px solid #d0c8e8" }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <Link
              href="/wiki/cocina"
              className="inline-flex items-center gap-1 mb-1 transition-opacity hover:opacity-60"
              style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.15em", color: "#b8a8d0" }}
            >
              <ChevronLeft size={12} /> Cocina
            </Link>
            <h1 className="text-2xl font-black uppercase tracking-tighter italic leading-none" style={{ color: "#8070b0" }}>
              Mi <span style={{ color: "#c8bce0" }}>Despensa</span>
            </h1>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2" size={14} style={{ color: "#c0b0d8" }} />
            <input
              placeholder="Buscar ingrediente..."
              className="w-full rounded-xl py-2.5 pl-10 pr-9 text-[11px] font-semibold outline-none transition-all"
              style={{ background: "#ece6f8", border: "1.5px solid #d0c8e8", color: "#7060a0" }}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            {filter && (
              <button
                onClick={() => setFilter("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-60"
                style={{ color: "#c0b0d8" }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsModalOpen(true)}
            className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest shrink-0 transition-opacity hover:opacity-80"
            style={{ background: "#c8b8e8", color: "#fff", boxShadow: "0 4px 16px #c8b8e838" }}
          >
            <Plus size={14} />
            Añadir
          </motion.button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-6 space-y-5">

        {/* ── FILTROS ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {([
              { label: "Todos",    value: stats.total,    key: "all"           as const },
              { label: "En stock", value: stats.inStock,  key: "in-stock"      as const },
              { label: "Agotado",  value: stats.outStock, key: "out-of-stock"  as const },
            ]).map(f => (
              <button
                key={f.key}
                onClick={() => setStockFilter(f.key)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                style={{
                  background: stockFilter === f.key ? "#d8d0f0" : "transparent",
                  border: `1.5px solid ${stockFilter === f.key ? "#c8bce0" : "transparent"}`,
                  color: stockFilter === f.key ? "#8070b0" : "#c0b0d8",
                }}
              >
                <span className="text-base font-black leading-none">{f.value}</span>
                {f.label}
              </button>
            ))}
          </div>
          {filter && (
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#c0b0d8" }}>
              {filteredItems.length} resultado{filteredItems.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* ── GRID ── */}
        {loading ? (
          <div className="flex justify-center py-32">
            <Loader2 className="animate-spin" size={36} style={{ color: "#c8b8e8" }} />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-32 space-y-2">
            <FlaskConical className="mx-auto" size={48} style={{ color: "#d8d0ee" }} />
            <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: "#c8bce0" }}>
              {filter ? "Sin resultados" : "Despensa vacía"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item, i) => {
                const hasStock = (item.stock_actual || 0) > 0;
                const pill = CATEGORIA_PILL[item.categoria] ?? { bg: "#ede8f8", text: "#9878c0", border: "#ccc0e0" };
                const dot  = CATEGORIA_DOT[item.categoria]  ?? "#c8b8e0";

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: i * 0.03 } }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="rounded-3xl p-5 flex flex-col gap-3 transition-all hover:-translate-y-0.5"
                    style={{
                      background: BG_CARD,
                      border: `1.5px solid ${BORDER_CARD}`,
                      boxShadow: "0 2px 16px #c0b0e020",
                    }}
                  >
                    {/* top */}
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                        style={{ background: pill.bg, color: pill.text, border: `1px solid ${pill.border}` }}
                      >
                        {item.categoria}
                      </span>
                      <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: dot }} />
                    </div>

                    {/* nombre */}
                    <div>
                      <h3 className="text-[13px] font-black uppercase italic tracking-tight leading-tight mb-0.5" style={{ color: "#6a58a0" }}>
                        {item.nombre}
                      </h3>
                      <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "#c0b0d8" }}>
                        por {item.porcion_texto}
                      </p>
                    </div>

                    {/* macros */}
                    <div
                      className="grid grid-cols-3 gap-1 rounded-2xl px-1"
                      style={{ background: "#e8e2f5", border: "1px solid #d8d0ec" }}
                    >
                      <MacroBadge label="Prot" value={item.proteinas}     unit="g" color={MC.prot} />
                      <MacroBadge label="Carb" value={item.carbohidratos} unit="g" color={MC.carb} />
                      <MacroBadge label="Gras" value={item.grasas}        unit="g" color={MC.gras} />
                    </div>

                    {/* micros */}
                    {(item.fibra > 0 || item.sodio > 0 || item.agua_ml > 0) && (
                      <div
                        className="grid grid-cols-3 gap-1 rounded-2xl px-1"
                        style={{ background: "#e4dff2", border: "1px solid #d4cce8" }}
                      >
                        {item.fibra   > 0 && <MacroBadge label="Fibra" value={item.fibra}   unit="g"  color={MC.fibra} />}
                        {item.sodio   > 0 && <MacroBadge label="Sodio" value={item.sodio}   unit="mg" color={MC.sodio} />}
                        {item.agua_ml > 0 && <MacroBadge label="Agua"  value={item.agua_ml} unit="ml" color={MC.agua}  />}
                      </div>
                    )}

                    {/* kcal */}
                    <div
                      className="flex items-center gap-1.5 rounded-2xl px-4 py-2.5"
                      style={{ background: "#d4ccea", border: "1px solid #c4bce0" }}
                    >
                      <Flame size={11} style={{ color: "#b0a0c8", fill: "#b0a0c8" }} className="shrink-0" />
                      <span className="text-[10px] font-black tracking-widest uppercase flex-1" style={{ color: "#8878b8" }}>
                        {item.kcal} kcal
                      </span>
                    </div>

                    {/* stock */}
                    <div
                      className="flex items-center justify-between rounded-2xl px-3 py-2.5"
                      style={{
                        background: hasStock ? "#dceee2" : "#f2e4e8",
                        border: `1px solid ${hasStock ? "#bcd8c4" : "#e4c4cc"}`,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {hasStock
                          ? <Package size={13} style={{ color: "#88b898" }} />
                          : <PackageX size={13} style={{ color: "#c898a0" }} />
                        }
                        <span
                          className="text-[10px] font-black uppercase"
                          style={{ color: hasStock ? "#689878" : "#a87888" }}
                        >
                          {hasStock ? `${item.stock_actual} uds.` : "Agotado"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleUpdateStock(item.id, item.stock_actual, -1)}
                          className="w-6 h-6 flex items-center justify-center rounded-lg transition-all hover:opacity-70"
                          style={{ background: "#ffffff70", border: "1px solid #d8d0ec", color: "#c0b0d8" }}
                        >
                          <Minus size={11} />
                        </button>
                        <button
                          onClick={() => handleUpdateStock(item.id, item.stock_actual, 1)}
                          className="w-6 h-6 flex items-center justify-center rounded-lg transition-all hover:opacity-70"
                          style={{ background: "#ffffff70", border: "1px solid #d8d0ec", color: "#c0b0d8" }}
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* ── FAB móvil ── */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setIsModalOpen(true)}
        className="sm:hidden fixed bottom-6 right-6 z-20 w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: "#c8b8e8", boxShadow: "0 8px 24px #c8b8e850", color: "#fff" }}
      >
        <Plus size={22} />
      </motion.button>

      {/* ── MODAL ── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 backdrop-blur-sm"
              style={{ background: "#8070a840" }}
            />
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="relative w-full sm:max-w-lg rounded-t-[40px] sm:rounded-[40px] p-7 overflow-y-auto max-h-[92vh]"
              style={{ background: "#f0ebfc", boxShadow: "0 -8px 48px #c0b0e040" }}
            >
              <div className="sm:hidden w-10 h-1 rounded-full mx-auto mb-6" style={{ background: "#d8d0ee" }} />

              <div className="flex items-center justify-between mb-7">
                <h2 className="text-2xl font-black italic uppercase tracking-tighter" style={{ color: "#8070b0" }}>
                  Nuevo <span style={{ color: "#c8bce0" }}>Insumo</span>
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:opacity-70"
                  style={{ background: "#ebe5f8", color: "#b0a0c8" }}
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-7">
                <section className="space-y-4">
                  <SectionTitle>Información básica</SectionTitle>
                  <FieldInput label="Nombre" required value={formData.nombre} onChange={patch("nombre")} placeholder="Tomate, Pollo, Arroz…" />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest pl-1" style={{ color: "#a898c0" }}>Categoría</label>
                      <select
                        value={formData.categoria}
                        onChange={(e) => setFormData(p => ({ ...p, categoria: e.target.value }))}
                        className="w-full rounded-2xl py-3.5 px-4 text-[11px] font-bold outline-none appearance-none transition-all"
                        style={{ background: "#ede8f8", border: "1.5px solid #d8d0ec", color: "#7060a0" }}
                      >
                        {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <FieldInput label="Porción" value={formData.porcion_texto} onChange={patch("porcion_texto")} placeholder="100g" />
                  </div>
                  <FieldInput label="Stock inicial" type="number" min="0" value={formData.stock_actual} onChange={patch("stock_actual")} />
                </section>

                <section className="space-y-4">
                  <SectionTitle>Macronutrientes · por porción</SectionTitle>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldInput label="Calorías (kcal)"  type="number" min="0" step="0.1" value={formData.kcal}          onChange={patch("kcal")} />
                    <FieldInput label="Proteínas (g)"    type="number" min="0" step="0.1" value={formData.proteinas}     onChange={patch("proteinas")} />
                    <FieldInput label="Carbohidratos (g)" type="number" min="0" step="0.1" value={formData.carbohidratos} onChange={patch("carbohidratos")} />
                    <FieldInput label="Grasas (g)"       type="number" min="0" step="0.1" value={formData.grasas}        onChange={patch("grasas")} />
                  </div>
                </section>

                <section className="space-y-4">
                  <SectionTitle>Micronutrientes · opcional</SectionTitle>
                  <div className="grid grid-cols-3 gap-3">
                    <FieldInput label="Fibra (g)"  type="number" min="0" step="0.1" value={formData.fibra}   onChange={patch("fibra")} />
                    <FieldInput label="Sodio (mg)" type="number" min="0" step="1"   value={formData.sodio}   onChange={patch("sodio")} />
                    <FieldInput label="Agua (ml)"  type="number" min="0" step="1"   value={formData.agua_ml} onChange={patch("agua_ml")} />
                  </div>
                </section>

                <button
                  disabled={isSaving || !formData.nombre.trim()}
                  type="submit"
                  className="w-full py-4 rounded-2xl font-black uppercase text-[11px] tracking-[0.25em] flex items-center justify-center gap-2.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-80"
                  style={{ background: "#c8b8e8", color: "#ffffff", boxShadow: "0 4px 16px #c8b8e840" }}
                >
                  {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  Registrar insumo
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};