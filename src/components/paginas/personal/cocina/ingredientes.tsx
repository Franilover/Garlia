"use client";
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { Ingrediente } from "@/lib/types/personal/ingrediente";
import {
  Search, Plus, ChevronLeft, X, Loader2, Save,
  Package, PackageX, Minus, FlaskConical, Flame, SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";

// ─── categorías con emojis para navegación rápida ───────────────────────────

const CATEGORIAS = [
  { label: "Proteínas",     emoji: "🥩" },
  { label: "Carbohidratos", emoji: "🍞" },
  { label: "Grasas",        emoji: "🧈" },
  { label: "Verduras",      emoji: "🥦" },
  { label: "Frutas",        emoji: "🍓" },
  { label: "Lácteos",       emoji: "🥛" },
  { label: "Superfoods",    emoji: "✨" },
  { label: "Cereales",      emoji: "🌾" },
];

const CAT_LABELS = CATEGORIAS.map(c => c.label);

const INITIAL_FORM = {
  nombre: "", categoria: "Verduras", kcal: 0,
  proteinas: 0, carbohidratos: 0, grasas: 0,
  porcion_texto: "100g", stock_actual: 0,
  fibra: 0, sodio: 0, agua_ml: 0,
};

// ─── sub-components ──────────────────────────────────────────────────────────

function MacroBadge({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-2">
      <span className="text-[8px] font-black uppercase tracking-widest text-primary/40">{label}</span>
      <span className="text-[13px] font-black leading-none text-primary">
        {value}<span className="text-[9px] font-semibold text-primary/30 ml-0.5">{unit}</span>
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
        {label}{required && <span className="text-accent ml-0.5">*</span>}
      </label>
      <input
        required={required}
        type={type}
        min={min}
        step={step}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-brand text-[11px] font-bold"
      />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/40">{children}</p>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────

export const IngredientesPage = () => {
  const [filter, setFilter]           = useState("");
  const [catFilter, setCatFilter]     = useState<string | null>(null);
  const [stockFilter, setStockFilter] = useState<"all" | "in-stock" | "out-of-stock">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving]       = useState(false);
  const [formData, setFormData]       = useState(INITIAL_FORM);

  const { data: ingredientes, loading, refetch, addRow, updateRow } =
    useSupabaseData<Ingrediente>("ingredientes");

  const filteredItems = useMemo(() => {
    return (ingredientes || []).filter((item) => {
      const matchesSearch =
        !filter ||
        item.nombre?.toLowerCase().includes(filter.toLowerCase()) ||
        item.categoria?.toLowerCase().includes(filter.toLowerCase());
      const matchesCat   = !catFilter || item.categoria === catFilter;
      const hasStock     = (item.stock_actual || 0) > 0;
      const matchesStock =
        stockFilter === "all" ? true :
        stockFilter === "in-stock" ? hasStock : !hasStock;
      return matchesSearch && matchesCat && matchesStock;
    });
  }, [ingredientes, filter, catFilter, stockFilter]);

  // conteo por categoría para los chips
  const catCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (ingredientes || []).forEach(i => {
      counts[i.categoria] = (counts[i.categoria] || 0) + 1;
    });
    return counts;
  }, [ingredientes]);

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

  const activeFilters = [filter, catFilter, stockFilter !== "all"].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-bg-main pb-28 text-foreground">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-10 bg-bg-main/90 backdrop-blur-xl border-b border-primary/10">
        <div className="max-w-7xl mx-auto px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">

          <div className="flex-1 min-w-0">
            <Link
              href="/wiki/cocina"
              className="inline-flex items-center gap-1 mb-1 text-[9px] font-black uppercase tracking-widest text-primary/40 hover:text-primary transition-colors"
            >
              <ChevronLeft size={12} /> Cocina
            </Link>
            <h1 className="text-2xl font-black uppercase tracking-tighter italic leading-none text-primary">
              Mi <span className="text-primary/20">Despensa</span>
            </h1>
          </div>

          {/* search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary/30" size={14} />
            <input
              placeholder="Buscar..."
              className="input-brand pl-10 pr-9 text-[11px] py-2.5"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            {filter && (
              <button
                onClick={() => setFilter("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/30 hover:text-primary transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsModalOpen(true)}
            className="btn-brand hidden sm:flex text-[11px] py-2.5 px-5 tracking-widest"
          >
            <Plus size={14} />
            Añadir
          </motion.button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 pt-5 space-y-5">

        {/* ── CHIPS DE CATEGORÍA ── navegación rápida */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* chip "Todos" */}
            <button
              onClick={() => setCatFilter(null)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all border ${
                catFilter === null
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-white-custom border-primary/15 text-primary/50 hover:border-primary/30 hover:text-primary"
              }`}
            >
              Todos
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${catFilter === null ? "bg-white/20" : "bg-primary/8 text-primary/40"}`}>
                {stats.total}
              </span>
            </button>

            {CATEGORIAS.map(({ label, emoji }) => {
              const count = catCounts[label] || 0;
              if (count === 0) return null;
              const active = catFilter === label;
              return (
                <button
                  key={label}
                  onClick={() => setCatFilter(active ? null : label)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all border ${
                    active
                      ? "bg-bg-menu text-white border-bg-menu shadow-sm"
                      : "bg-white-custom border-primary/15 text-primary/50 hover:border-primary/30 hover:text-primary"
                  }`}
                >
                  <span>{emoji}</span>
                  {label}
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${active ? "bg-white/20" : "bg-primary/8 text-primary/40"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* filtros de stock */}
          <div className="flex items-center gap-2 flex-wrap">
            {([
              { label: "En stock",  key: "in-stock"      as const, value: stats.inStock  },
              { label: "Agotado",   key: "out-of-stock"  as const, value: stats.outStock },
            ]).map(f => (
              <button
                key={f.key}
                onClick={() => setStockFilter(stockFilter === f.key ? "all" : f.key)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wide transition-all border ${
                  stockFilter === f.key
                    ? "bg-accent/30 border-accent/50 text-primary"
                    : "bg-transparent border-primary/10 text-primary/35 hover:border-primary/25 hover:text-primary/60"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${f.key === "in-stock" ? "bg-green-400" : "bg-red-300"}`} />
                {f.label}
                <span className="font-black opacity-60">{f.value}</span>
              </button>
            ))}

            {/* limpiar filtros */}
            {activeFilters > 0 && (
              <button
                onClick={() => { setFilter(""); setCatFilter(null); setStockFilter("all"); }}
                className="flex items-center gap-1 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wide text-primary/40 hover:text-primary border border-dashed border-primary/20 hover:border-primary/40 transition-all"
              >
                <X size={10} />
                Limpiar ({activeFilters})
              </button>
            )}

            {(filter || catFilter || stockFilter !== "all") && (
              <span className="text-[9px] font-bold text-primary/30 uppercase tracking-widest ml-1">
                {filteredItems.length} resultado{filteredItems.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* ── GRID ── */}
        {loading ? (
          <div className="flex justify-center py-32">
            <Loader2 className="animate-spin text-primary/30" size={36} />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-32 space-y-2">
            <FlaskConical className="mx-auto text-primary/15" size={48} />
            <p className="text-[11px] font-black uppercase tracking-widest text-primary/25">
              {filter || catFilter ? "Sin resultados" : "Despensa vacía"}
            </p>
            {(filter || catFilter) && (
              <button
                onClick={() => { setFilter(""); setCatFilter(null); }}
                className="text-[10px] font-black text-accent hover:text-primary transition-colors uppercase tracking-wide"
              >
                Quitar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item, i) => {
                const hasStock = (item.stock_actual || 0) > 0;
                const catEmoji = CATEGORIAS.find(c => c.label === item.categoria)?.emoji ?? "🫙";

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: i * 0.025 } }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="card-main flex flex-col gap-3 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                  >
                    {/* top */}
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-bg-menu text-white flex items-center gap-1">
                        <span>{catEmoji}</span>
                        {item.categoria}
                      </span>
                      <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${hasStock ? "bg-green-300" : "bg-red-200"}`} />
                    </div>

                    {/* nombre */}
                    <div>
                      <h3 className="text-[13px] font-black uppercase italic tracking-tight leading-tight mb-0.5 text-primary">
                        {item.nombre}
                      </h3>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-primary/30">
                        por {item.porcion_texto}
                      </p>
                    </div>

                    {/* macros */}
                    <div className="grid grid-cols-3 gap-1 rounded-2xl bg-bg-main border border-primary/8 px-1">
                      <MacroBadge label="Prot" value={item.proteinas}     unit="g" />
                      <MacroBadge label="Carb" value={item.carbohidratos} unit="g" />
                      <MacroBadge label="Gras" value={item.grasas}        unit="g" />
                    </div>

                    {/* micros opcionales */}
                    {(item.fibra > 0 || item.sodio > 0 || item.agua_ml > 0) && (
                      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-bg-main border border-primary/8 px-1">
                        {item.fibra   > 0 && <MacroBadge label="Fibra" value={item.fibra}   unit="g"  />}
                        {item.sodio   > 0 && <MacroBadge label="Sodio" value={item.sodio}   unit="mg" />}
                        {item.agua_ml > 0 && <MacroBadge label="Agua"  value={item.agua_ml} unit="ml" />}
                      </div>
                    )}

                    {/* kcal */}
                    <div className="flex items-center gap-1.5 rounded-2xl bg-accent/20 border border-accent/25 px-4 py-2.5">
                      <Flame size={11} className="text-accent shrink-0 fill-accent/60" />
                      <span className="text-[10px] font-black tracking-widest uppercase flex-1 text-primary/70">
                        {item.kcal} kcal
                      </span>
                    </div>

                    {/* stock */}
                    <div className={`flex items-center justify-between rounded-2xl px-3 py-2.5 border ${
                      hasStock
                        ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/30"
                        : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/30"
                    }`}>
                      <div className="flex items-center gap-2">
                        {hasStock
                          ? <Package size={13} className="text-green-500 shrink-0" />
                          : <PackageX size={13} className="text-red-400 shrink-0" />
                        }
                        <span className={`text-[10px] font-black uppercase ${hasStock ? "text-green-700 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                          {hasStock ? `${item.stock_actual} uds.` : "Agotado"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleUpdateStock(item.id, item.stock_actual, -1)}
                          className="w-6 h-6 flex items-center justify-center bg-white-custom rounded-lg border border-primary/10 text-primary/30 hover:text-red-400 hover:border-red-200 transition-all"
                        >
                          <Minus size={11} />
                        </button>
                        <button
                          onClick={() => handleUpdateStock(item.id, item.stock_actual, 1)}
                          className="w-6 h-6 flex items-center justify-center bg-white-custom rounded-lg border border-primary/10 text-primary/30 hover:text-green-500 hover:border-green-200 transition-all"
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
        className="sm:hidden fixed bottom-6 right-6 z-20 w-14 h-14 rounded-2xl btn-brand shadow-2xl"
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
              className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="relative w-full sm:max-w-lg rounded-t-[40px] sm:rounded-[40px] p-7 overflow-y-auto max-h-[92vh] bg-white-custom shadow-2xl"
            >
              <div className="sm:hidden w-10 h-1 bg-primary/15 rounded-full mx-auto mb-6" />

              <div className="flex items-center justify-between mb-7">
                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-primary">
                  Nuevo <span className="text-primary/20">Insumo</span>
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary/8 text-primary/40 hover:bg-primary/15 hover:text-primary transition-all"
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
                      <label className="text-[9px] font-black uppercase tracking-widest text-primary/40 pl-1">Categoría</label>
                      <select
                        value={formData.categoria}
                        onChange={(e) => setFormData(p => ({ ...p, categoria: e.target.value }))}
                        className="input-brand text-[11px] font-bold appearance-none"
                      >
                        {CATEGORIAS.map(c => (
                          <option key={c.label} value={c.label}>{c.emoji} {c.label}</option>
                        ))}
                      </select>
                    </div>
                    <FieldInput label="Porción" value={formData.porcion_texto} onChange={patch("porcion_texto")} placeholder="100g" />
                  </div>
                  <FieldInput label="Stock inicial" type="number" min="0" value={formData.stock_actual} onChange={patch("stock_actual")} />
                </section>

                <section className="space-y-4">
                  <SectionTitle>Macronutrientes · por porción</SectionTitle>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldInput label="Calorías (kcal)"    type="number" min="0" step="0.1" value={formData.kcal}          onChange={patch("kcal")} />
                    <FieldInput label="Proteínas (g)"       type="number" min="0" step="0.1" value={formData.proteinas}     onChange={patch("proteinas")} />
                    <FieldInput label="Carbohidratos (g)"   type="number" min="0" step="0.1" value={formData.carbohidratos} onChange={patch("carbohidratos")} />
                    <FieldInput label="Grasas (g)"          type="number" min="0" step="0.1" value={formData.grasas}        onChange={patch("grasas")} />
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
                  className="btn-brand w-full py-4 text-[11px] tracking-[0.25em]"
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