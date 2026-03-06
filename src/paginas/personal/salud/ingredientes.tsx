"use client";
import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { Ingrediente } from "@/lib/types/personal/ingrediente";
import {
  Search, Plus, ChevronLeft, X, Loader2, Save,
  Package, PackageX, Minus, FlaskConical, Flame, Trash2, Calculator, ShoppingCart,
} from "lucide-react";
import Link from "next/link";


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

const INITIAL_FORM = {
  nombre: "", categoria: "Verduras", kcal: 0,
  proteinas: 0, carbohidratos: 0, grasas: 0,
  porcion_texto: "100g", stock_actual: 0,
  fibra: 0, sodio: 0, agua_ml: 0,
  precio: 0,
};

function MacroBadge({ label, value, unit, scaled }: { label: string; value: number; unit: string; scaled?: number }) {
  const showing = scaled !== undefined ? scaled : value;
  const changed = scaled !== undefined && Math.abs(scaled - value) > 0.01;
  return (
    <div className="flex flex-col items-center gap-0.5 py-2">
      <span className="text-[8px] font-black uppercase tracking-widest text-primary/40">{label}</span>
      <span className={`text-[13px] font-black leading-none transition-colors ${changed ? "text-accent" : "text-primary"}`}>
        {showing}<span className="text-[9px] font-semibold text-primary/30 ml-0.5">{unit}</span>
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

export const IngredientesPage = () => {
  const [filter, setFilter]           = useState("");
  const [catFilter, setCatFilter]     = useState<string | null>(null);
  const [stockFilter, setStockFilter] = useState<"all" | "in-stock" | "out-of-stock">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving]       = useState(false);
  const [formData, setFormData]       = useState(INITIAL_FORM);

  const { data: ingredientes, loading: hookLoading, refetch, addRow, updateRow, deleteRow } =
    useSupabaseData<Ingrediente>("ingredientes");

  const [localItems, setLocalItems] = useState<Ingrediente[] | null>(() =>
    ingredientes?.length ? ingredientes : null
  );
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});
  const [qtyOpen, setQtyOpen] = useState<Record<string, boolean>>({});


  useEffect(() => {
    if (localItems === null && ingredientes?.length) {
      setLocalItems(ingredientes);
    }
  }, [ingredientes]); 

  const isLoading = localItems === null && hookLoading;
  const items = localItems ?? [];

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
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
  }, [items, filter, catFilter, stockFilter]);

  const catCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach(i => { counts[i.categoria] = (counts[i.categoria] || 0) + 1; });
    return counts;
  }, [items]);

  const stats = useMemo(() => ({
    total:    items.length,
    inStock:  items.filter(i => (i.stock_actual || 0) > 0).length,
    outStock: items.filter(i => (i.stock_actual || 0) === 0).length,
  }), [items]);

  const patch = (key: keyof typeof INITIAL_FORM) =>
    (v: string) => setFormData(p => ({ ...p, [key]: typeof INITIAL_FORM[key] === "number" ? Number(v) : v }));

  const handleUpdateStock = async (id: string, current: number, delta: number) => {
    const newStock = Math.max(0, current + delta);
    setLocalItems(prev =>
      (prev ?? []).map(item => item.id === id ? { ...item, stock_actual: newStock } : item)
    );
    if (updateRow) {
      const result = await updateRow(id, { stock_actual: newStock });
      if (result.error) {
        setLocalItems(prev =>
          (prev ?? []).map(item => item.id === id ? { ...item, stock_actual: current } : item)
        );
      }
    }
  };

  const handleDelete = async (id: string) => {
    setLocalItems(prev => (prev ?? []).filter(item => item.id !== id));
    setConfirmDelete(null);
    if (deleteRow) {
      const result = await deleteRow(id);
      if (result?.error) {
        setLocalItems(null);
        refetch();
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const result = await addRow(formData);
      if (result.error) {
        console.error("Error al guardar ingrediente:", result.error);
        const msg = typeof result.error === "string" ? result.error : (result.error as any)?.message ?? JSON.stringify(result.error);
        alert(`Error al guardar: ${msg}`);
      } else {
        setIsModalOpen(false);
        setFormData(INITIAL_FORM);
        if (result.data) {
          setLocalItems(prev => [...(prev ?? []), result.data as Ingrediente]);
        } else {
          setLocalItems(null);
          refetch();
        }
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

      <header className="sticky top-0 z-10 bg-bg-main/90 backdrop-blur-xl border-b border-primary/10">
        <div className="max-w-7xl mx-auto px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <Link
              href="/personal/salud/recetas"
              className="inline-flex items-center gap-1 mb-1 text-[9px] font-black uppercase tracking-widest text-primary/40 hover:text-primary transition-colors"
            >
              <ChevronLeft size={12} /> Cocina
            </Link>
            <h1 className="text-2xl font-black uppercase tracking-tighter italic leading-none text-primary">
              Mi <span className="text-primary/20">Despensa</span>
            </h1>
          </div>

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

          <div className="hidden sm:flex items-center gap-2">
            <Link
              href="/personal/salud/compras"
              className="flex items-center gap-2 text-[11px] py-2.5 px-5 tracking-widest font-black uppercase rounded-2xl border border-primary/20 text-primary/50 hover:border-primary/40 hover:text-primary transition-all bg-white-custom"
            >
              <ShoppingCart size={14} />
              Compras
            </Link>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsModalOpen(true)}
              className="btn-brand flex text-[11px] py-2.5 px-5 tracking-widest"
            >
              <Plus size={14} />
              Añadir
            </motion.button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 pt-5 space-y-5">

        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setCatFilter(null)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all border ${
                catFilter === null
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-white-custom border-primary/15 text-primary/50 hover:border-primary/30 hover:text-primary"
              }`}
            >
              Todos
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${catFilter === null ? "bg-white/20" : "bg-primary/5 text-primary/40"}`}>
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
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${active ? "bg-white/20" : "bg-primary/5 text-primary/40"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {([
              { label: "En stock",  key: "in-stock"     as const, value: stats.inStock,  dot: "bg-green-300" },
              { label: "Agotado",   key: "out-of-stock" as const, value: stats.outStock, dot: "bg-red-300"   },
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
                <span className={`w-1.5 h-1.5 rounded-full ${f.dot}`} />
                {f.label}
                <span className="font-black opacity-60">{f.value}</span>
              </button>
            ))}

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

        {isLoading ? (
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
                const hasStock   = (item.stock_actual || 0) > 0;
                const catEmoji   = CATEGORIAS.find(c => c.label === item.categoria)?.emoji ?? "🫙";
                const isConfirm  = confirmDelete === item.id;

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: i * 0.025 } }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                    className="card-main flex flex-col gap-3 hover:shadow-lg hover:-translate-y-0.5 transition-all relative"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-bg-menu text-white flex items-center gap-1 shrink-0">
                        <span>{catEmoji}</span>
                        {item.categoria}
                      </span>

                      <AnimatePresence mode="wait">
                        {isConfirm ? (
                          <motion.div
                            key="confirm"
                            initial={{ opacity: 0, x: 8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 8 }}
                            className="flex items-center gap-1"
                          >
                            <span className="text-[8px] font-black uppercase text-red-400 tracking-wide">¿Eliminar?</span>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="px-2 py-1 rounded-lg bg-red-100 text-red-500 text-[8px] font-black uppercase hover:bg-red-200 transition-all"
                            >
                              Sí
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="px-2 py-1 rounded-lg bg-primary/8 text-primary/40 text-[8px] font-black uppercase hover:bg-primary/15 transition-all"
                            >
                              No
                            </button>
                          </motion.div>
                        ) : (
                          <motion.button
                            key="trash"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setConfirmDelete(item.id)}
                            className="p-1.5 rounded-lg text-primary/20 hover:text-red-400 hover:bg-red-50 transition-all mt-0.5"
                          >
                            <Trash2 size={13} />
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-[13px] font-black uppercase italic tracking-tight leading-tight mb-0.5 text-primary">
                          {item.nombre}
                        </h3>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-primary/30">
                          por {item.porcion_texto}
                        </p>
                      </div>
                      <button
                        onClick={() => setQtyOpen(p => ({ ...p, [item.id]: !p[item.id] }))}
                        className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wide border transition-all ${
                          qtyOpen[item.id]
                            ? "bg-accent/25 border-accent/40 text-primary"
                            : "bg-bg-main border-primary/10 text-primary/35 hover:text-primary hover:border-primary/25"
                        }`}
                      >
                        <Calculator size={11} />
                        ×{qtyMap[item.id] ?? 1}
                      </button>
                    </div>

                    <AnimatePresence>
                      {qtyOpen[item.id] && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden"
                        >
                          <div className="flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-2xl px-3 py-2.5">
                            <span className="text-[9px] font-black uppercase tracking-widest text-primary/40 shrink-0">
                              Cantidad
                            </span>
                            <button
                              onClick={() => setQtyMap(p => ({ ...p, [item.id]: Math.max(0.5, (p[item.id] ?? 1) - 0.5) }))}
                              className="w-6 h-6 flex items-center justify-center bg-white-custom rounded-lg border border-primary/10 text-primary/30 hover:text-primary transition-all shrink-0"
                            >
                              <Minus size={10} />
                            </button>
                            <input
                              type="number"
                              min="0.1"
                              step="0.5"
                              value={qtyMap[item.id] ?? 1}
                              onChange={e => setQtyMap(p => ({ ...p, [item.id]: Math.max(0.1, Number(e.target.value)) }))}
                              className="w-14 text-center bg-white-custom border border-primary/10 rounded-lg py-1 text-[11px] font-black text-primary outline-none"
                            />
                            <button
                              onClick={() => setQtyMap(p => ({ ...p, [item.id]: (p[item.id] ?? 1) + 0.5 }))}
                              className="w-6 h-6 flex items-center justify-center bg-white-custom rounded-lg border border-primary/10 text-primary/30 hover:text-primary transition-all shrink-0"
                            >
                              <Plus size={10} />
                            </button>
                            <button
                              onClick={() => { setQtyMap(p => ({ ...p, [item.id]: 1 })); }}
                              className="ml-auto text-[8px] font-black uppercase text-primary/25 hover:text-primary transition-colors tracking-wide"
                            >
                              Reset
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {(() => {
                      const q = qtyMap[item.id] ?? 1;
                      const sc = (v: number) => q === 1 ? undefined : Math.round(v * q * 10) / 10;
                      return (
                        <>
                          <div className="grid grid-cols-3 gap-1 rounded-2xl bg-bg-main border border-primary/8 px-1">
                            <MacroBadge label="Prot" value={item.proteinas}     unit="g"  scaled={sc(item.proteinas)} />
                            <MacroBadge label="Carb" value={item.carbohidratos} unit="g"  scaled={sc(item.carbohidratos)} />
                            <MacroBadge label="Gras" value={item.grasas}        unit="g"  scaled={sc(item.grasas)} />
                          </div>

                          {(item.fibra > 0 || item.sodio > 0 || item.agua_ml > 0) && (
                            <div className="grid grid-cols-3 gap-1 rounded-2xl bg-bg-main border border-primary/8 px-1">
                              {item.fibra   > 0 && <MacroBadge label="Fibra" value={item.fibra}   unit="g"  scaled={sc(item.fibra)} />}
                              {item.sodio   > 0 && <MacroBadge label="Sodio" value={item.sodio}   unit="mg" scaled={sc(item.sodio)} />}
                              {item.agua_ml > 0 && <MacroBadge label="Agua"  value={item.agua_ml} unit="ml" scaled={sc(item.agua_ml)} />}
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 rounded-2xl bg-accent/20 border border-accent/25 px-4 py-2.5">
                            <Flame size={11} className="text-accent shrink-0 fill-accent/60" />
                            <span className={`text-[10px] font-black tracking-widest uppercase flex-1 transition-colors ${q !== 1 ? "text-accent" : "text-primary/70"}`}>
                              {q === 1 ? item.kcal : Math.round(item.kcal * q)} kcal
                              {q !== 1 && <span className="text-primary/30 font-semibold ml-1.5 normal-case tracking-normal text-[9px]">({item.kcal} c/u)</span>}
                            </span>
                          </div>
                        </>
                      );
                    })()}

                    <div className={`flex items-center justify-between rounded-2xl px-3 py-2.5 border ${
                      hasStock
                        ? "bg-green-50/50 border-green-100"
                        : "bg-red-50/50 border-red-100"
                    }`}>
                      <div className="flex items-center gap-2">
                        {hasStock
                          ? <Package size={13} className="text-green-400/80 shrink-0" />
                          : <PackageX size={13} className="text-red-300 shrink-0" />
                        }
                        <span className={`text-[10px] font-black uppercase ${hasStock ? "text-green-600/70" : "text-red-400/70"}`}>
                          {hasStock ? `${item.stock_actual} uds.` : "Agotado"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleUpdateStock(item.id, item.stock_actual, -1)}
                          className="w-6 h-6 flex items-center justify-center bg-white-custom rounded-lg border border-primary/10 text-primary/30 hover:text-red-300 hover:border-red-100 transition-all"
                        >
                          <Minus size={11} />
                        </button>
                        <button
                          onClick={() => handleUpdateStock(item.id, item.stock_actual, 1)}
                          className="w-6 h-6 flex items-center justify-center bg-white-custom rounded-lg border border-primary/10 text-primary/30 hover:text-green-400/80 hover:border-green-100 transition-all"
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

      <div className="sm:hidden fixed bottom-32 right-6 z-20 flex flex-col items-end gap-3">
        <Link
          href="/personal/salud/compras"
          className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white-custom border border-primary/20 text-primary/50 shadow-lg"
        >
          <ShoppingCart size={18} />
        </Link>
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => setIsModalOpen(true)}
          className="w-14 h-14 rounded-2xl btn-brand shadow-2xl"
        >
          <Plus size={22} />
        </motion.button>
      </div>

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
              className="relative w-full sm:max-w-lg rounded-t-[40px] sm:rounded-[40px] overflow-hidden bg-white-custom shadow-2xl max-h-[92vh] flex flex-col"
            >
              <div className="flex items-center justify-between px-7 pt-7 pb-4 shrink-0">
                <div>
                  <div className="sm:hidden w-10 h-1 bg-primary/15 rounded-full mb-4" />
                  <h2 className="text-2xl font-black italic uppercase tracking-tighter text-primary">
                    Nuevo <span className="text-primary/20">Insumo</span>
                  </h2>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="hidden sm:flex w-9 h-9 items-center justify-center rounded-xl bg-primary/8 text-primary/40 hover:bg-primary/15 hover:text-primary transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 px-7 pb-7">
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
                  <FieldInput label="Precio / porción ($)" type="number" min="0" step="0.01" value={formData.precio} onChange={patch("precio")} placeholder="0.00" />
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
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}