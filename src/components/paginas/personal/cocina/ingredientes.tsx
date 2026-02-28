"use client";
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { Ingrediente } from "@/lib/types/personal/ingrediente";
import {
  Search, Plus, Zap, ChevronLeft, X, Loader2, Save,
  Package, PackageX, Minus, FlaskConical, Flame, Wheat, Droplets
} from "lucide-react";
import Link from "next/link";

// ─── helpers ────────────────────────────────────────────────────────────────

const CATEGORIAS = [
  "Proteínas", "Carbohidratos", "Grasas",
  "Verduras", "Frutas", "Lácteos", "Superfoods", "Cereales",
];

const CATEGORIA_COLORS: Record<string, string> = {
  "Proteínas":    "bg-rose-100    text-rose-500   border-rose-200",
  "Carbohidratos":"bg-amber-100   text-amber-500  border-amber-200",
  "Grasas":       "bg-yellow-100  text-yellow-600 border-yellow-200",
  "Verduras":     "bg-emerald-100 text-emerald-600 border-emerald-200",
  "Frutas":       "bg-pink-100    text-pink-500   border-pink-200",
  "Lácteos":      "bg-sky-100     text-sky-500    border-sky-200",
  "Superfoods":   "bg-violet-100  text-violet-500 border-violet-200",
  "Cereales":     "bg-orange-100  text-orange-500 border-orange-200",
};

const CATEGORIA_DOT: Record<string, string> = {
  "Proteínas":    "bg-rose-300",
  "Carbohidratos":"bg-amber-300",
  "Grasas":       "bg-yellow-300",
  "Verduras":     "bg-emerald-300",
  "Frutas":       "bg-pink-300",
  "Lácteos":      "bg-sky-300",
  "Superfoods":   "bg-violet-300",
  "Cereales":     "bg-orange-300",
};

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
    <div className="flex flex-col items-center gap-0.5">
      <span className={`text-[9px] font-black uppercase tracking-widest ${color}`}>{label}</span>
      <span className="text-sm font-black text-primary leading-none">
        {value}<span className="text-[9px] font-bold text-primary/30">{unit}</span>
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
      <label className="text-[9px] font-black uppercase tracking-widest text-primary/40 pl-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        required={required}
        type={type}
        min={min}
        step={step}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-primary/[0.04] hover:bg-primary/[0.07] focus:bg-white focus:ring-2 focus:ring-primary/10 border border-transparent focus:border-primary/10 rounded-2xl py-3.5 px-5 text-[11px] font-bold text-primary outline-none transition-all placeholder:text-primary/20"
      />
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

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
    <div className="min-h-screen bg-[#f0edf8] pb-28 text-primary">

      {/* ── HEADER ── */}
      <header className="bg-[#ece8f5]/90 backdrop-blur-xl border-b border-violet-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">

          {/* breadcrumb + title */}
          <div className="flex-1 min-w-0">
            <Link
              href="/wiki/cocina"
              className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-primary/30 hover:text-primary transition-colors mb-1"
            >
              <ChevronLeft size={12} /> Cocina
            </Link>
            <h1 className="text-2xl font-black uppercase tracking-tighter italic leading-none">
              Mi <span className="text-primary/15">Despensa</span>
            </h1>
          </div>

          {/* search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary/25" size={14} />
            <input
              placeholder="Buscar ingrediente..."
              className="w-full bg-primary/[0.04] border border-primary/5 rounded-xl py-2.5 pl-10 pr-4 text-[11px] font-bold text-primary outline-none focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-primary/25 placeholder:font-normal"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            {filter && (
              <button
                onClick={() => setFilter("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/25 hover:text-primary transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* add button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-violet-500 text-white px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-violet-200 hover:bg-violet-600 transition-colors shrink-0"
          >
            <Plus size={14} />
            Añadir
          </motion.button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-6 space-y-6">

        {/* ── STATS + FILTER BAR ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* stats pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { label: "Total",    value: stats.total,    active: stockFilter === "all",       key: "all"          as const, color: "text-primary/50" },
              { label: "En stock", value: stats.inStock,  active: stockFilter === "in-stock",  key: "in-stock"     as const, color: "text-green-600" },
              { label: "Agotado",  value: stats.outStock, active: stockFilter === "out-of-stock", key: "out-of-stock" as const, color: "text-red-500"   },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setStockFilter(f.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                  f.active
                    ? "bg-white border-primary/10 shadow-sm text-primary"
                    : "bg-transparent border-transparent text-primary/35 hover:text-primary/60"
                }`}
              >
                <span className={`text-base font-black leading-none ${f.active ? f.color : ""}`}>{f.value}</span>
                {f.label}
              </button>
            ))}
          </div>

          {/* result count */}
          {filter && (
            <span className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">
              {filteredItems.length} resultado{filteredItems.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* ── GRID ── */}
        {loading ? (
          <div className="flex justify-center py-32">
            <Loader2 className="animate-spin text-primary/20" size={36} />
          </div>
        ) : filteredItems.length === 0 && !loading ? (
          <div className="text-center py-32 space-y-2">
            <FlaskConical className="mx-auto text-primary/10" size={48} />
            <p className="text-[11px] font-black uppercase text-primary/20 tracking-widest">
              {filter ? "Sin resultados" : "Despensa vacía"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item, i) => {
                const hasStock = (item.stock_actual || 0) > 0;
                const catColor = CATEGORIA_COLORS[item.categoria] || "bg-primary/5 text-primary/40 border-primary/10";
                const dotColor = CATEGORIA_DOT[item.categoria]   || "bg-primary/20";

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: i * 0.03 } }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-[#ede8f7] border border-violet-200/60 rounded-3xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col gap-4 group"
                  >
                    {/* top row */}
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${catColor}`}>
                        {item.categoria}
                      </span>
                      <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${dotColor}`} />
                    </div>

                    {/* name + portion */}
                    <div>
                      <h3 className="text-[13px] font-black uppercase italic tracking-tight leading-tight mb-0.5">
                        {item.nombre}
                      </h3>
                      <p className="text-[9px] font-bold text-violet-400 uppercase tracking-widest">
                        por {item.porcion_texto}
                      </p>
                    </div>

                    {/* macros row */}
                    <div className="grid grid-cols-3 gap-2 py-3 bg-white/50 rounded-2xl px-2 border border-violet-100">
                      <MacroBadge label="Prot" value={item.proteinas}    unit="g"  color="text-rose-400"    />
                      <MacroBadge label="Carb" value={item.carbohidratos} unit="g" color="text-amber-400"  />
                      <MacroBadge label="Gras" value={item.grasas}        unit="g" color="text-yellow-500" />
                    </div>

                    {/* optional micros */}
                    {(item.fibra > 0 || item.sodio > 0 || item.agua_ml > 0) && (
                      <div className="grid grid-cols-3 gap-2 bg-white/30 rounded-2xl px-2 py-2 border border-violet-100">
                        {item.fibra   > 0 && <MacroBadge label="Fibra" value={item.fibra}   unit="g"  color="text-emerald-400"  />}
                        {item.sodio   > 0 && <MacroBadge label="Sodio" value={item.sodio}   unit="mg" color="text-sky-400"   />}
                        {item.agua_ml > 0 && <MacroBadge label="Agua"  value={item.agua_ml} unit="ml" color="text-cyan-400"   />}
                      </div>
                    )}

                    {/* kcal bar */}
                    <div className="flex items-center gap-1.5 bg-violet-500 text-white rounded-2xl px-4 py-2.5 shadow-sm shadow-violet-300">
                      <Flame size={11} className="fill-white/70 shrink-0" />
                      <span className="text-[10px] font-black tracking-widest uppercase flex-1">
                        {item.kcal} kcal
                      </span>
                    </div>

                    {/* stock control */}
                    <div className={`flex items-center justify-between rounded-2xl px-3 py-2.5 transition-colors border ${
                      hasStock ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"
                    }`}>
                      <div className="flex items-center gap-2">
                        {hasStock
                          ? <Package className="text-emerald-500 shrink-0" size={13} />
                          : <PackageX className="text-rose-400 shrink-0"  size={13} />
                        }
                        <span className={`text-[10px] font-black uppercase ${hasStock ? "text-emerald-700" : "text-rose-500"}`}>
                          {hasStock ? `${item.stock_actual} uds.` : "Agotado"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleUpdateStock(item.id, item.stock_actual, -1)}
                          className="w-6 h-6 flex items-center justify-center bg-white/80 rounded-lg border border-violet-100 text-violet-300 hover:text-rose-400 hover:border-rose-200 transition-all"
                        >
                          <Minus size={11} />
                        </button>
                        <button
                          onClick={() => handleUpdateStock(item.id, item.stock_actual, 1)}
                          className="w-6 h-6 flex items-center justify-center bg-white/80 rounded-lg border border-violet-100 text-violet-300 hover:text-emerald-500 hover:border-emerald-200 transition-all"
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

      {/* ── FLOATING ADD BUTTON (mobile) ── */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setIsModalOpen(true)}
        className="sm:hidden fixed bottom-6 right-6 z-20 w-14 h-14 bg-violet-500 text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-violet-300"
      >
        <Plus size={22} />
      </motion.button>

      {/* ── MODAL ── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
            {/* backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-primary/25 backdrop-blur-sm"
            />

            {/* sheet */}
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="relative bg-white w-full sm:max-w-lg rounded-t-[40px] sm:rounded-[40px] p-7 shadow-2xl overflow-y-auto max-h-[92vh]"
            >
              {/* handle (mobile) */}
              <div className="sm:hidden w-10 h-1 bg-primary/10 rounded-full mx-auto mb-6" />

              {/* header */}
              <div className="flex items-center justify-between mb-7">
                <h2 className="text-2xl font-black italic uppercase tracking-tighter">
                  Nuevo <span className="text-primary/15">Insumo</span>
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary/5 text-primary/30 hover:bg-primary/10 hover:text-primary transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-7">

                {/* INFO BÁSICA */}
                <section className="space-y-4">
                  <SectionTitle>Información básica</SectionTitle>
                  <FieldInput
                    label="Nombre"
                    required
                    value={formData.nombre}
                    onChange={patch("nombre")}
                    placeholder="Tomate, Pollo, Arroz…"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-primary/40 pl-1">Categoría</label>
                      <select
                        value={formData.categoria}
                        onChange={(e) => setFormData(p => ({ ...p, categoria: e.target.value }))}
                        className="w-full bg-primary/[0.04] hover:bg-primary/[0.07] border border-transparent rounded-2xl py-3.5 px-4 text-[11px] font-bold text-primary outline-none appearance-none transition-all"
                      >
                        {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <FieldInput
                      label="Porción"
                      value={formData.porcion_texto}
                      onChange={patch("porcion_texto")}
                      placeholder="100g"
                    />
                  </div>
                  <FieldInput
                    label="Stock inicial"
                    type="number" min="0"
                    value={formData.stock_actual}
                    onChange={patch("stock_actual")}
                  />
                </section>

                {/* MACRONUTRIENTES */}
                <section className="space-y-4">
                  <SectionTitle icon={<Flame size={11} />}>Macronutrientes · por porción</SectionTitle>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldInput label="Calorías (kcal)" type="number" min="0" step="0.1" value={formData.kcal}           onChange={patch("kcal")} />
                    <FieldInput label="Proteínas (g)"   type="number" min="0" step="0.1" value={formData.proteinas}      onChange={patch("proteinas")} />
                    <FieldInput label="Carbohidratos (g)" type="number" min="0" step="0.1" value={formData.carbohidratos} onChange={patch("carbohidratos")} />
                    <FieldInput label="Grasas (g)"       type="number" min="0" step="0.1" value={formData.grasas}        onChange={patch("grasas")} />
                  </div>
                </section>

                {/* MICRONUTRIENTES */}
                <section className="space-y-4">
                  <SectionTitle icon={<Droplets size={11} />}>Micronutrientes · opcional</SectionTitle>
                  <div className="grid grid-cols-3 gap-3">
                    <FieldInput label="Fibra (g)"  type="number" min="0" step="0.1" value={formData.fibra}   onChange={patch("fibra")} />
                    <FieldInput label="Sodio (mg)" type="number" min="0" step="1"   value={formData.sodio}   onChange={patch("sodio")} />
                    <FieldInput label="Agua (ml)"  type="number" min="0" step="1"   value={formData.agua_ml} onChange={patch("agua_ml")} />
                  </div>
                </section>

                {/* SUBMIT */}
                <button
                  disabled={isSaving || !formData.nombre.trim()}
                  type="submit"
                  className="w-full bg-violet-500 text-white py-4 rounded-2xl font-black uppercase text-[11px] tracking-[0.25em] flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-violet-600 transition-all shadow-lg shadow-violet-200"
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

// ── tiny helpers ──────────────────────────────────────────────────────────────

function SectionTitle({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      {icon && <span className="text-primary/25">{icon}</span>}
      <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/30">{children}</h3>
    </div>
  );
}