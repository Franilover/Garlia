"use client";
import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { Receta, NuevaReceta, IngredienteReceta } from "@/lib/types/personal/receta";
import { Ingrediente } from "@/lib/types/personal/ingrediente";
import { recetasQueries } from "@/lib/api/queries/personal/cocina/recetas";
import {
  Utensils, Clock, ChevronRight, Search, ChefHat, Flame,
  Plus, X, ArrowLeft, Trash2, Activity, Loader2, Save, ChevronLeft, Minus, Carrot,
  ShoppingCart, Tag, Dumbbell, Wheat, Droplets,
} from "lucide-react";
import { IngredientesPage } from "@/paginas/personal/salud/ingredientes";
import { useCarrito } from "@/hooks/features/useCarritoStore";


const CATEGORIAS = [
  { label: "General",    emoji: "🍽️" },
  { label: "Desayunos",  emoji: "🥞" },
  { label: "Almuerzos",  emoji: "🥗" },
  { label: "Cenas",      emoji: "🌙" },
  { label: "Postres",    emoji: "🍮" },
  { label: "Snacks",     emoji: "🍿" },
];

const DIFICULTADES = ["Fácil", "Media", "Difícil"];

const INITIAL_FORM = {
  nombre: "",
  categoria: "General" as "General" | "Postres" | "Almuerzos" | "Desayunos",
  tiempo: "20 min",
  dificultad: "Fácil",
  ingredientes: [] as IngredienteReceta[],
  instrucciones: [] as string[],
  descripcion: "",
};


function parseIngredientes(raw: any): IngredienteReceta[] {
  try {
    if (Array.isArray(raw)) return raw as IngredienteReceta[];
    if (typeof raw === "string") return JSON.parse(raw);
    if (raw && typeof raw === "object") return [raw] as IngredienteReceta[];
  } catch {}
  return [];
}

function calcTotales(list: IngredienteReceta[]) {
  return list.reduce(
    (acc, ing) => ({
      kcal:      acc.kcal      + (parseFloat(String(ing.kcal      || 0)) || 0),
      proteinas: acc.proteinas + (parseFloat(String(ing.proteinas  || 0)) || 0),
      carbos:    acc.carbos    + (parseFloat(String(ing.carbohidratos || 0)) || 0),
      grasas:    acc.grasas    + (parseFloat(String(ing.grasas     || 0)) || 0),
    }),
    { kcal: 0, proteinas: 0, carbos: 0, grasas: 0 }
  );
}


function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/40">{children}</p>
  );
}

function FieldInput({
  label, type = "text", value, onChange, placeholder, required,
}: {
  label: string; type?: string; value: string | number;
  onChange: (v: string) => void; placeholder?: string; required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[9px] font-black uppercase tracking-widest text-primary/40 pl-1">
        {label}{required && <span className="text-accent ml-0.5">*</span>}
      </label>
      <input
        required={required}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-brand text-[11px] font-bold"
      />
    </div>
  );
}

function MacroBadge({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-2">
      <span className="text-[8px] font-black uppercase tracking-widest text-primary/40">{label}</span>
      <span className="text-[13px] font-black leading-none text-primary">
        {value.toFixed(1)}<span className="text-[9px] font-semibold text-primary/30 ml-0.5">{unit}</span>
      </span>
    </div>
  );
}


function RecetaDetalle({ receta }: { receta: Receta }) {
  const ingredientesList = parseIngredientes(receta.ingredientes);
  const totales = calcTotales(ingredientesList);

  return (
    <div className="min-h-screen bg-bg-main pb-28 text-foreground">
      <header className="sticky top-0 z-10 bg-bg-main/90 backdrop-blur-xl border-b border-primary/10">
        <div className="max-w-4xl mx-auto px-5 py-4">
          <Link
            href="/personal/cocina/recetas"
            className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-primary/40 hover:text-primary transition-colors"
          >
            <ChevronLeft size={12} /> Recetas
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 pt-6 space-y-5">
        {/* imagen */}
        <div className="card-main overflow-hidden p-0 rounded-3xl">
          <div className="h-56 bg-primary/5 relative">
            {receta.imagen_url ? (
              <img src={receta.imagen_url} className="w-full h-full object-cover" alt={receta.nombre} />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Flame size={64} className="text-primary/10" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            <span className="absolute top-4 left-4 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-bg-menu text-white">
              {CATEGORIAS.find(c => c.label === receta.categoria)?.emoji ?? "🍽️"} {receta.categoria}
            </span>
          </div>
          <div className="p-6">
            <h1 className="text-2xl font-black uppercase tracking-tighter italic text-primary leading-tight">
              {receta.nombre}
            </h1>
            {receta.descripcion && (
              <p className="text-[11px] text-primary/50 mt-1">{receta.descripcion}</p>
            )}
            <div className="flex items-center gap-5 mt-4 pt-4 border-t border-primary/8">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary/50">
                <Clock size={13} className="text-primary/30" /> {receta.tiempo}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary/50">
                <ChefHat size={13} className="text-primary/30" /> {receta.dificultad}
              </div>
              <div className="ml-auto flex items-center gap-1.5 rounded-2xl bg-accent/20 border border-accent/25 px-3 py-1.5">
                <Flame size={11} className="text-accent fill-accent/60 shrink-0" />
                <span className="text-[10px] font-black tracking-widest uppercase text-primary/70">
                  {totales.kcal.toFixed(0)} kcal
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* macros totales */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Proteínas", value: totales.proteinas, unit: "g" },
            { label: "Carbos",    value: totales.carbos,    unit: "g" },
            { label: "Grasas",    value: totales.grasas,    unit: "g" },
          ].map(m => (
            <div key={m.label} className="card-main text-center py-4">
              <p className="text-[8px] font-black uppercase tracking-widest text-primary/30 mb-1">{m.label}</p>
              <p className="text-xl font-black text-primary italic">
                {m.value.toFixed(1)}<span className="text-sm font-bold text-primary/30">{m.unit}</span>
              </p>
            </div>
          ))}
        </div>

        {/* ingredientes + pasos */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card-main space-y-3">
            <SectionTitle>Ingredientes</SectionTitle>
            <ul className="space-y-2">
              {ingredientesList.map((ing, i) => (
                <li key={i} className="flex items-center justify-between py-2 border-b border-primary/8 last:border-0">
                  <span className="text-[11px] font-bold text-primary uppercase">{ing.nombre}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-black text-primary/25 uppercase">
                      P {parseFloat(String(ing.proteinas || 0)).toFixed(1)}g
                    </span>
                    <span className="text-[10px] font-black text-primary/50">{ing.cantidad}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="card-main space-y-3">
            <SectionTitle>Preparación</SectionTitle>
            <div className="space-y-3">
              {receta.instrucciones?.map((paso, i) => (
                <div key={i} className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-bg-menu text-white text-[8px] font-black flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-[11px] font-bold leading-relaxed text-primary/70 uppercase">{paso}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


function RecipeCard({
  receta,
  index,
  inCart,
  onToggleCart,
}: {
  receta: Receta;
  index: number;
  inCart: boolean;
  onToggleCart: (receta: Receta) => void;
}) {
  const catEmoji = CATEGORIAS.find(c => c.label === receta.categoria)?.emoji ?? "🍽️";
  const ingredientesList = parseIngredientes(receta.ingredientes);
  const totales = calcTotales(ingredientesList);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0, transition: { delay: index * 0.03 } }}
      layout
      className="card-main overflow-hidden p-0 hover:shadow-lg hover:-translate-y-0.5 transition-all group flex flex-col"
    >
      {/* imagen */}
      <div className="h-44 bg-primary/5 relative overflow-hidden">
        {receta.imagen_url ? (
          <img
            src={receta.imagen_url}
            alt={receta.nombre}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Flame size={40} className="text-primary/15" />
          </div>
        )}
        <span className="absolute top-3 left-3 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-bg-menu text-white">
          {catEmoji} {receta.categoria}
        </span>
        {/* kcal badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-xl px-2 py-1">
          <Flame size={9} className="text-amber-300 fill-amber-300/60" />
          <span className="text-[8px] font-black text-white tracking-widest">{totales.kcal.toFixed(0)}</span>
        </div>
      </div>

      {/* info */}
      <div className="p-5 space-y-3 flex flex-col flex-1">
        <h3 className="text-[13px] font-black uppercase italic tracking-tight text-primary leading-tight">
          {receta.nombre}
        </h3>

        <div className="flex items-center gap-3 text-[9px] font-bold text-primary/35 uppercase">
          <span className="flex items-center gap-1"><Clock size={11} />{receta.tiempo}</span>
          <span className="flex items-center gap-1"><ChefHat size={11} />{receta.dificultad}</span>
        </div>

        {/* macros rápidos */}
        <div className="grid grid-cols-3 gap-1">
          {[
            { label: "Prot", value: totales.proteinas, unit: "g" },
            { label: "Carb", value: totales.carbos,    unit: "g" },
            { label: "Gras", value: totales.grasas,    unit: "g" },
          ].map(m => (
            <div key={m.label} className="bg-bg-main rounded-xl py-1.5 text-center border border-primary/8">
              <p className="text-[7px] font-black uppercase tracking-widest text-primary/30">{m.label}</p>
              <p className="text-[10px] font-black text-primary">
                {m.value.toFixed(0)}<span className="text-[7px] text-primary/25">{m.unit}</span>
              </p>
            </div>
          ))}
        </div>

        <div className="flex-1" />

        {/* acciones */}
        <div className="flex gap-2">
          <Link
            href={`/personal/cocina/recetas/${receta.id}`}
            className="flex items-center justify-between flex-1 px-4 py-2.5 bg-bg-menu text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:opacity-80 transition-all"
          >
            Ver receta <ChevronRight size={13} />
          </Link>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onToggleCart(receta)}
            className={`w-10 h-10 flex items-center justify-center rounded-2xl border transition-all shrink-0 ${
              inCart
                ? "bg-accent/20 border-accent/30 text-accent"
                : "bg-bg-main border-primary/15 text-primary/35 hover:border-primary/30 hover:text-primary"
            }`}
          >
            <ShoppingCart size={14} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}


interface PendingIng {
  base: Ingrediente;
  qty: number;
}

function ModalAddReceta({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [isSaving, setIsSaving]     = useState(false);
  const [searchIng, setSearchIng]   = useState("");
  const [nuevoPaso, setNuevoPaso]   = useState("");
  const [formData, setFormData]     = useState(INITIAL_FORM);
  const [pendingIng, setPendingIng] = useState<PendingIng | null>(null);

  const { data: dbIngredientes } = useSupabaseData<Ingrediente>("ingredientes");

  const filteredDbIngredientes = useMemo(() => {
    if (!searchIng.trim()) return [];
    return dbIngredientes
      .filter(i =>
        i.nombre.toLowerCase().includes(searchIng.toLowerCase()) &&
        !formData.ingredientes.find(s => s.nombre === i.nombre)
      )
      .slice(0, 6);
  }, [searchIng, dbIngredientes, formData.ingredientes]);

  const selectIngrediente = (ing: Ingrediente) => {
    setPendingIng({ base: ing, qty: 1 });
    setSearchIng("");
  };

  const confirmIngrediente = () => {
    if (!pendingIng) return;
    const { base, qty } = pendingIng;
    const mult = (v: number) => Math.round(parseFloat(String(v || 0)) * qty * 10) / 10;
    setFormData(p => ({
      ...p,
      ingredientes: [...p.ingredientes, {
        nombre:        base.nombre,
        cantidad:      `${qty} × ${base.porcion_texto}`,
        kcal:          mult(base.kcal),
        proteinas:     mult(base.proteinas),
        carbohidratos: mult(base.carbohidratos),
        grasas:        mult(base.grasas),
      }],
    }));
    setPendingIng(null);
  };

  const removeIngrediente = (idx: number) =>
    setFormData(p => ({ ...p, ingredientes: p.ingredientes.filter((_, i) => i !== idx) }));

  const addPaso = () => {
    if (!nuevoPaso.trim()) return;
    setFormData(p => ({ ...p, instrucciones: [...p.instrucciones, nuevoPaso.trim()] }));
    setNuevoPaso("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.ingredientes.length === 0) {
      alert("Añade al menos un ingrediente de la despensa");
      return;
    }
    setIsSaving(true);
    try {
      await recetasQueries.create({
        nombre:        formData.nombre,
        categoria:     formData.categoria,
        tiempo:        formData.tiempo,
        dificultad:    formData.dificultad,
        ingredientes:  formData.ingredientes as any,
        instrucciones: formData.instrucciones,
        descripcion:   formData.descripcion || "",
      } as NuevaReceta);
      onSuccess();
    } catch (err) {
      alert(`Error: ${err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const totalesPreview = calcTotales(formData.ingredientes);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
      />
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
        className="relative w-full sm:max-w-2xl rounded-t-[40px] sm:rounded-[40px] p-7 overflow-y-auto max-h-[92vh] bg-white-custom shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="sm:hidden w-10 h-1 bg-primary/15 rounded-full mx-auto mb-6" />

        <div className="flex items-center justify-between mb-7">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-primary">
            Nueva <span className="text-primary/20">Receta</span>
          </h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary/8 text-primary/40 hover:bg-primary/15 hover:text-primary transition-all">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-7">

          {/* INFO BÁSICA */}
          <section className="space-y-4">
            <SectionTitle>Información básica</SectionTitle>
            <FieldInput label="Nombre del plato" required value={formData.nombre} onChange={v => setFormData(p => ({ ...p, nombre: v }))} placeholder="Tortilla, Ensalada…" />
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-primary/40 pl-1">Categoría</label>
                <select
                  value={formData.categoria}
                  onChange={e => setFormData(p => ({ ...p, categoria: e.target.value as any }))}
                  className="input-brand text-[11px] font-bold appearance-none"
                >
                  {CATEGORIAS.map(c => <option key={c.label} value={c.label}>{c.emoji} {c.label}</option>)}
                </select>
              </div>
              <FieldInput label="Tiempo" value={formData.tiempo} onChange={v => setFormData(p => ({ ...p, tiempo: v }))} placeholder="20 min" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-primary/40 pl-1">Dificultad</label>
              <div className="flex gap-2">
                {DIFICULTADES.map(d => (
                  <button
                    key={d} type="button"
                    onClick={() => setFormData(p => ({ ...p, dificultad: d }))}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wide border transition-all ${
                      formData.dificultad === d
                        ? "bg-bg-menu text-white border-bg-menu"
                        : "bg-bg-main border-primary/15 text-primary/40 hover:border-primary/30"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* INGREDIENTES */}
          <section className="space-y-4">
            <SectionTitle>Ingredientes de la despensa</SectionTitle>

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary/30" size={14} />
              <input
                type="text"
                placeholder="Buscar en mi despensa..."
                value={searchIng}
                onChange={e => setSearchIng(e.target.value)}
                className="input-brand pl-10 text-[11px]"
              />
              <AnimatePresence>
                {filteredDbIngredientes.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    className="absolute top-full left-0 w-full bg-white-custom border border-primary/10 rounded-2xl mt-1.5 shadow-xl z-50 overflow-hidden"
                  >
                    {filteredDbIngredientes.map(ing => (
                      <button
                        key={ing.id} type="button"
                        onClick={() => selectIngrediente(ing)}
                        className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-bg-main transition-colors border-b border-primary/5 last:border-0"
                      >
                        <span className="text-[11px] font-bold uppercase text-primary">{ing.nombre}</span>
                        <span className="text-[9px] font-black text-primary/30 flex items-center gap-1">
                          {ing.proteinas}g P <Plus size={11} className="text-primary/40" />
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {pendingIng && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div className="bg-accent/10 border border-accent/25 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase text-primary">{pendingIng.base.nombre}</span>
                      <span className="text-[9px] font-bold text-primary/40">{pendingIng.base.porcion_texto} / unidad</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-black uppercase tracking-widest text-primary/40 shrink-0">Cantidad</span>
                      <button type="button"
                        onClick={() => setPendingIng(p => p && p.qty > 0.5 ? { ...p, qty: Math.round((p.qty - 0.5) * 10) / 10 } : p)}
                        className="w-7 h-7 flex items-center justify-center bg-white-custom rounded-lg border border-primary/10 text-primary/30 hover:text-primary transition-all shrink-0"
                      >
                        <Minus size={12} />
                      </button>
                      <input
                        type="number" min="0.5" step="0.5"
                        value={pendingIng.qty}
                        onChange={e => setPendingIng(p => p ? { ...p, qty: Math.max(0.1, Number(e.target.value)) } : p)}
                        className="w-16 text-center bg-white-custom border border-primary/10 rounded-lg py-1.5 text-[12px] font-black text-primary outline-none"
                      />
                      <button type="button"
                        onClick={() => setPendingIng(p => p ? { ...p, qty: Math.round((p.qty + 0.5) * 10) / 10 } : p)}
                        className="w-7 h-7 flex items-center justify-center bg-white-custom rounded-lg border border-primary/10 text-primary/30 hover:text-primary transition-all shrink-0"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: "Kcal", value: pendingIng.base.kcal * pendingIng.qty,          unit: ""  },
                        { label: "Prot", value: pendingIng.base.proteinas * pendingIng.qty,      unit: "g" },
                        { label: "Carb", value: pendingIng.base.carbohidratos * pendingIng.qty,  unit: "g" },
                        { label: "Gras", value: pendingIng.base.grasas * pendingIng.qty,         unit: "g" },
                      ].map(m => (
                        <div key={m.label} className="bg-white-custom border border-primary/8 rounded-xl py-1.5 text-center">
                          <p className="text-[7px] font-black uppercase tracking-widest text-primary/30">{m.label}</p>
                          <p className="text-[11px] font-black text-primary">
                            {m.value.toFixed(0)}<span className="text-[8px] text-primary/25">{m.unit}</span>
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button type="button" onClick={() => setPendingIng(null)}
                        className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide border border-primary/15 text-primary/40 hover:border-primary/30 hover:text-primary transition-all"
                      >
                        Cancelar
                      </button>
                      <button type="button" onClick={confirmIngrediente}
                        className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide bg-bg-menu text-white hover:opacity-80 transition-all"
                      >
                        ✓ Añadir
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {formData.ingredientes.length > 0 && (
              <div className="space-y-2">
                {formData.ingredientes.map((ing, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-bg-main border border-primary/8 rounded-2xl px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-black uppercase text-primary">{ing.nombre}</span>
                      <span className="text-[9px] text-primary/35 ml-2">{ing.cantidad}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[9px] font-black text-primary/25">{ing.kcal.toFixed(0)} kcal</span>
                      <span className="text-[9px] font-black text-primary/25">{ing.proteinas.toFixed(1)}g P</span>
                      <button type="button" onClick={() => removeIngrediente(idx)}
                        className="p-1 text-primary/20 hover:text-red-400 transition-colors ml-1"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="grid grid-cols-4 gap-2 mt-1">
                  {[
                    { label: "Kcal", value: totalesPreview.kcal,     unit: ""  },
                    { label: "Prot", value: totalesPreview.proteinas, unit: "g" },
                    { label: "Carb", value: totalesPreview.carbos,    unit: "g" },
                    { label: "Gras", value: totalesPreview.grasas,    unit: "g" },
                  ].map(m => (
                    <div key={m.label} className="bg-accent/10 border border-accent/20 rounded-xl py-2 text-center">
                      <p className="text-[7px] font-black uppercase tracking-widest text-primary/30">{m.label}</p>
                      <p className="text-[12px] font-black text-primary">
                        {m.value.toFixed(0)}<span className="text-[8px] text-primary/30">{m.unit}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* PASOS */}
          <section className="space-y-4">
            <SectionTitle>Pasos de preparación</SectionTitle>
            <div className="flex gap-2">
              <input
                className="input-brand flex-1 text-[11px]"
                value={nuevoPaso}
                onChange={e => setNuevoPaso(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addPaso(); }}}
                placeholder="Describe un paso…"
              />
              <button type="button" onClick={addPaso}
                className="w-10 h-10 flex items-center justify-center bg-bg-menu text-white rounded-xl hover:opacity-80 transition-all shrink-0"
              >
                <Plus size={16} />
              </button>
            </div>
            {formData.instrucciones.length > 0 && (
              <div className="space-y-2">
                {formData.instrucciones.map((paso, idx) => (
                  <div key={idx} className="flex items-start gap-3 bg-bg-main border border-primary/8 rounded-2xl px-4 py-3">
                    <span className="w-5 h-5 rounded-full bg-bg-menu text-white text-[8px] font-black flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-[11px] font-bold text-primary/70 uppercase flex-1 leading-relaxed">{paso}</span>
                    <button type="button"
                      onClick={() => setFormData(p => ({ ...p, instrucciones: p.instrucciones.filter((_, i) => i !== idx) }))}
                      className="text-primary/20 hover:text-red-400 transition-colors shrink-0"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <button
            disabled={isSaving || !formData.nombre.trim()}
            type="submit"
            className="btn-brand w-full py-4 text-[11px] tracking-[0.25em]"
          >
            {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            Guardar receta
          </button>
        </form>
      </motion.div>
    </div>
  );
}


interface RecetasPageProps {
  selectedRecipeId?: string;
}

const RecetasPage = ({ selectedRecipeId }: RecetasPageProps) => {
  const [filter, setFilter]               = useState("");
  const [catFilter, setCatFilter]         = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [showIngredientes, setShowIngredientes] = useState(false);

  const { data: recipes, loading } = useSupabaseData<Receta>("recetas");
  const { addItem, removeItem: removeCarritoItem, isInCart, totalItems, items: carritoItems, refetch: refetchCarrito } = useCarrito();

  const { data: todosIngredientes } = useSupabaseData<Ingrediente>("ingredientes");

  const toggleCartReceta = async (receta: Receta) => {
    const ingredientesList = parseIngredientes(receta.ingredientes);

    const yaEnCarrito = carritoItems.some(i => i.lugar_compra === receta.nombre);

    if (yaEnCarrito) {
      const idsAEliminar = carritoItems
        .filter(i => i.lugar_compra === receta.nombre)
        .map(i => i.id);
      await Promise.all(idsAEliminar.map(id => removeCarritoItem(id)));
    } else {
      await Promise.all(
        ingredientesList.map(ing => {
          
          const ingReal = todosIngredientes.find(
            i => i.nombre.toLowerCase() === ing.nombre.toLowerCase()
          );
          if (!ingReal) return Promise.resolve(); 
          return addItem(ingReal, {
            cantidad:      ing.cantidad || "1 porción",
            origenReceta:  receta.nombre, 
          });
        })
      );
    }
  };

  const inCartReceta = (id: string | number) => {
    const receta = recipes.find(r => r.id === id);
    if (!receta) return false;
    return carritoItems.some(i => i.lugar_compra === receta.nombre);
  };

  if (selectedRecipeId) {
    const receta = recipes.find(r => String(r.id) === selectedRecipeId);
    if (loading) return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <Loader2 className="animate-spin text-primary/30" size={36} />
      </div>
    );
    if (!receta) return (
      <div className="min-h-screen bg-bg-main flex flex-col items-center justify-center gap-3">
        <Utensils className="text-primary/15" size={48} />
        <p className="text-[11px] font-black uppercase tracking-widest text-primary/30">Receta no encontrada</p>
        <Link href="/personal/cocina/recetas" className="text-[10px] font-black text-accent hover:text-primary transition-colors uppercase tracking-wide">
          Volver a recetas
        </Link>
      </div>
    );
    return <RecetaDetalle receta={receta} />;
  }

  const filteredRecipes = recipes.filter(r => {
    const matchesSearch =
      !filter ||
      r.nombre.toLowerCase().includes(filter.toLowerCase()) ||
      r.categoria.toLowerCase().includes(filter.toLowerCase());
    const matchesCat = !catFilter || r.categoria === catFilter;
    return matchesSearch && matchesCat;
  });

  const catCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    recipes.forEach(r => { counts[r.categoria] = (counts[r.categoria] || 0) + 1; });
    return counts;
  }, [recipes]);

  return (
    <div className="min-h-screen bg-bg-main pb-28 text-foreground">

      {/* HEADER */}
      <header className="sticky top-0 z-10 bg-bg-main/90 backdrop-blur-xl border-b border-primary/10">
        <div className="max-w-7xl mx-auto px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black uppercase tracking-tighter italic leading-none text-primary">
              Mis <span className="text-primary/20">Recetas</span>
            </h1>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary/30" size={14} />
            <input
              placeholder="Buscar..."
              className="input-brand pl-10 pr-9 text-[11px] py-2.5"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
            {filter && (
              <button onClick={() => setFilter("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/30 hover:text-primary transition-colors">
                <X size={12} />
              </button>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-2">
            {/* Botón compras */}
            <Link
              href="/personal/salud/compras"
              className="relative flex items-center gap-2 text-[11px] py-2.5 px-5 tracking-widest font-black uppercase rounded-2xl border border-primary/20 text-primary/50 hover:border-primary/40 hover:text-primary transition-all bg-white-custom"
            >
              <ShoppingCart size={14} />
              Compras
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-accent text-white text-[8px] font-black rounded-full px-1">
                  {totalItems}
                </span>
              )}
            </Link>

            {/* Botón Ingredientes */}
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setShowIngredientes(true)}
              className="flex items-center gap-2 text-[11px] py-2.5 px-5 tracking-widest font-black uppercase rounded-2xl border border-primary/20 text-primary/50 hover:border-primary/40 hover:text-primary transition-all bg-white-custom"
            >
              <Carrot size={14} /> Ingredientes
            </motion.button>

            {/* Botón Añadir */}
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setIsModalOpen(true)}
              className="btn-brand flex text-[11px] py-2.5 px-5 tracking-widest"
            >
              <Plus size={14} /> Añadir
            </motion.button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 pt-5 space-y-5">

        {/* chips categoría */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setCatFilter(null)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all border ${
              catFilter === null
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-white-custom border-primary/15 text-primary/50 hover:border-primary/30 hover:text-primary"
            }`}
          >
            Todas
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${catFilter === null ? "bg-white/20" : "bg-primary/5 text-primary/40"}`}>
              {recipes.length}
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
                <span>{emoji}</span> {label}
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${active ? "bg-white/20" : "bg-primary/5 text-primary/40"}`}>
                  {count}
                </span>
              </button>
            );
          })}

          {catFilter && (
            <button
              onClick={() => setCatFilter(null)}
              className="flex items-center gap-1 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wide text-primary/40 hover:text-primary border border-dashed border-primary/20 hover:border-primary/40 transition-all"
            >
              <X size={10} /> Limpiar
            </button>
          )}
        </div>

        {/* grid */}
        {loading ? (
          <div className="flex justify-center py-32">
            <Loader2 className="animate-spin text-primary/30" size={36} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {/* botón añadir */}
            <motion.button
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              onClick={() => setIsModalOpen(true)}
              className="border-2 border-dashed border-primary/15 rounded-3xl flex flex-col items-center justify-center p-8 bg-white-custom hover:bg-primary/5 transition-all group min-h-[220px]"
            >
              <div className="w-10 h-10 flex items-center justify-center bg-primary text-white rounded-2xl shadow-lg group-hover:scale-110 transition-transform">
                <Plus size={18} />
              </div>
              <span className="text-[9px] font-black uppercase mt-3 text-primary/35 tracking-widest group-hover:text-primary transition-colors">
                Nueva receta
              </span>
            </motion.button>

            <AnimatePresence mode="popLayout">
              {filteredRecipes.length === 0 && !loading ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="col-span-full flex flex-col items-center justify-center py-24 gap-2"
                >
                  <Utensils className="text-primary/15" size={48} />
                  <p className="text-[11px] font-black uppercase tracking-widest text-primary/25">
                    {filter || catFilter ? "Sin resultados" : "Sin recetas aún"}
                  </p>
                </motion.div>
              ) : (
                filteredRecipes.map((receta, i) => (
                  <RecipeCard
                    key={receta.id ?? i}
                    receta={receta}
                    index={i}
                    inCart={inCartReceta(receta.id)}
                    onToggleCart={toggleCartReceta}
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* FAB móvil */}
      <div className="sm:hidden fixed bottom-6 right-6 z-20 flex flex-col items-end gap-3">
        <Link
          href="/personal/salud/compras"
          className="relative w-12 h-12 rounded-2xl flex items-center justify-center bg-white-custom border border-primary/20 text-primary/50 shadow-lg"
        >
          <ShoppingCart size={18} />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center bg-accent text-white text-[8px] font-black rounded-full">
              {totalItems}
            </span>
          )}
        </Link>
        <motion.button
          whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
          onClick={() => setShowIngredientes(true)}
          className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white-custom border border-primary/20 text-primary/50 shadow-lg"
        >
          <Carrot size={18} />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
          onClick={() => setIsModalOpen(true)}
          className="w-14 h-14 rounded-2xl btn-brand shadow-2xl"
        >
          <Plus size={22} />
        </motion.button>
      </div>

      {/* modal nueva receta */}
      <AnimatePresence>
        {isModalOpen && (
          <ModalAddReceta
            onClose={() => setIsModalOpen(false)}
            onSuccess={() => setIsModalOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* DRAWER INGREDIENTES */}
      <AnimatePresence>
        {showIngredientes && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIngredientes(false)}
              className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
              className="fixed right-0 top-0 z-50 h-full w-full max-w-4xl bg-bg-main shadow-2xl overflow-y-auto"
            >
              <button
                onClick={() => setShowIngredientes(false)}
                className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-xl bg-primary/8 text-primary/40 hover:bg-primary/15 hover:text-primary transition-all"
              >
                <X size={16} />
              </button>
              <IngredientesPage />
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};

export default RecetasPage;