"use client";
import { MotionDiv, MotionMain, MotionH1, MotionH2, MotionButton, MotionLi, MotionSpan, MotionP, MotionSection, MotionArticle } from "@/components/ui/Motion";
import React, { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import type { Receta, Ingrediente, Inserts } from "@/lib/types/queries";
type NuevaReceta = Inserts<'recetas'>;
type IngredienteReceta = {
  nombre: string;
  cantidad: string;
  kcal?: number;
  proteinas?: number;
  carbohidratos?: number;
  grasas?: number;
};
import { recetasQueries } from "@/lib/api/queries/personal/cocina/recetas";
import { Btn, BtnIcon, Loading } from "@/components/ui";
import { useToast } from "@/hooks/ui/useToast";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { SectionTitle, FieldInput } from "@/components/paginas/myself/ensayosensayos/personal/ui/SaludUi";
import {
  Utensils, Clock, ChevronRight, Search, ChefHat, Flame,
  Plus, X, ChevronLeft, Minus, Carrot, Save, Activity,
  Dumbbell, Wheat, Droplets,
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIAS = [
  { label: "General",   emoji: "🍽️" },
  { label: "Desayunos", emoji: "🥞" },
  { label: "Almuerzos", emoji: "🥗" },
  { label: "Cenas",     emoji: "🌙" },
  { label: "Postres",   emoji: "🍮" },
  { label: "Snacks",    emoji: "🍿" },
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseIngredientes(raw: any): IngredienteReceta[] {
  try {
    if (Array.isArray(raw)) return raw as IngredienteReceta[];
    if (typeof raw === "string") return JSON.parse(raw);
    if (raw && typeof raw === "object") return [raw] as IngredienteReceta[];
  } catch {}
  return [];
}

function parseInstrucciones(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as string[];
  try {
    if (typeof raw === "string") return JSON.parse(raw);
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

// ─── MacroBar — compact inline macro display ──────────────────────────────────

function MacroBar({ kcal, proteinas, carbos, grasas }: { kcal: number; proteinas: number; carbos: number; grasas: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 text-[9px] font-black text-primary/40">
        <Flame size={9} className="text-accent" />
        <span>{kcal.toFixed(0)}</span>
      </div>
      <span className="text-primary/10">·</span>
      <div className="flex items-center gap-1 text-[9px] font-black text-primary/35">
        <span className="text-primary/25">P</span>{proteinas.toFixed(0)}g
      </div>
      <div className="flex items-center gap-1 text-[9px] font-black text-primary/35">
        <span className="text-primary/25">C</span>{carbos.toFixed(0)}g
      </div>
      <div className="flex items-center gap-1 text-[9px] font-black text-primary/35">
        <span className="text-primary/25">G</span>{grasas.toFixed(0)}g
      </div>
    </div>
  );
}

// ─── MacroGrid — grid of 4 macro chips ───────────────────────────────────────

function MacroGrid({ kcal, proteinas, carbos, grasas }: { kcal: number; proteinas: number; carbos: number; grasas: number }) {
  const items = [
    { label: "Kcal", value: kcal,      unit: "",  icon: <Flame size={10} className="text-accent" /> },
    { label: "Prot", value: proteinas, unit: "g", icon: <Dumbbell size={10} className="text-blue-400" /> },
    { label: "Carb", value: carbos,    unit: "g", icon: <Wheat size={10} className="text-amber-400" /> },
    { label: "Gras", value: grasas,    unit: "g", icon: <Droplets size={10} className="text-emerald-400" /> },
  ];
  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map(m => (
        <div key={m.label} className="bg-bg-main border border-primary/8 rounded-(--radius-btn) py-2 text-center">
          <div className="flex justify-center mb-0.5">{m.icon}</div>
          <p className="text-[7px] font-black uppercase tracking-widest text-primary/25">{m.label}</p>
          <p className="text-[11px] font-black text-primary">
            {m.value.toFixed(0)}<span className="text-[8px] text-primary/25">{m.unit}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── RecetaDrawer — floating side panel ──────────────────────────────────────

function RecetaDrawer({ receta, onClose }: { receta: Receta; onClose: () => void }) {
  const ingredientesList  = parseIngredientes(receta.ingredientes);
  const instruccionesList = parseInstrucciones(receta.instrucciones);
  const totales = calcTotales(ingredientesList);
  const catEmoji = CATEGORIAS.find(c => c.label === receta.categoria)?.emoji ?? "🍽️";

  return (
    <>
      {/* Backdrop */}
      <MotionDiv
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm"
      />

      {/* Drawer panel — slides from right on desktop, from bottom on mobile */}
      <MotionDiv
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 38 }}
        className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[420px] bg-white-custom shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden w-10 h-1 bg-primary/15 rounded-full mx-auto mt-3 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-primary/8 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-bg-menu text-menu-text">
              {catEmoji} {receta.categoria}
            </span>
          </div>
          <BtnIcon variant="ghost" onClick={onClose} className="border-none bg-primary/8 text-primary/40">
            <X size={16} />
          </BtnIcon>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

          {/* Hero */}
          <div>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-primary leading-tight">
              {receta.nombre}
            </h2>
            {receta.descripcion && (
              <p className="text-[11px] text-primary/45 mt-1.5 leading-relaxed">{receta.descripcion}</p>
            )}
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-primary/8">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary/45">
                <Clock size={12} className="text-primary/25" /> {receta.tiempo}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary/45">
                <ChefHat size={12} className="text-primary/25" /> {receta.dificultad}
              </div>
            </div>
          </div>

          {/* Macros */}
          <MacroGrid kcal={totales.kcal} proteinas={totales.proteinas} carbos={totales.carbos} grasas={totales.grasas} />

          {/* Ingredientes */}
          <div className="card-main p-4 space-y-2">
            <SectionTitle>Ingredientes</SectionTitle>
            <ul className="divide-y divide-primary/6">
              {ingredientesList.map((ing, i) => (
                <li key={i} className="flex items-center justify-between py-2.5 gap-3">
                  <span className="text-[11px] font-bold text-primary uppercase leading-tight flex-1 min-w-0 truncate">
                    {ing.nombre}
                  </span>
                  <div className="flex items-center gap-2 shrink-0 text-right">
                    <span className="text-[9px] font-black text-primary/30">{ing.cantidad}</span>
                    <span className="text-[8px] font-black text-primary/20">
                      {parseFloat(String(ing.proteinas || 0)).toFixed(1)}g P
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Preparación */}
          {instruccionesList.length > 0 && (
            <div className="card-main p-4 space-y-3">
              <SectionTitle>Preparación</SectionTitle>
              <ol className="space-y-3">
                {instruccionesList.map((paso, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-bg-menu text-menu-text text-[8px] font-black flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-[11px] font-bold leading-relaxed text-primary/65 uppercase">{paso}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </MotionDiv>
    </>
  );
}

// ─── RecipeCard — compact row-style card ─────────────────────────────────────

function RecipeCard({ receta, index, onSelect }: { receta: Receta; index: number; onSelect: () => void }) {
  const catEmoji = CATEGORIAS.find(c => c.label === receta.categoria)?.emoji ?? "🍽️";
  const ingredientesList = parseIngredientes(receta.ingredientes);
  const totales = calcTotales(ingredientesList);
  const ingCount = ingredientesList.length;

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0, transition: { delay: index * 0.025 } }}
      layout
      className="card-main p-4 hover:shadow-md hover:-translate-y-0.5 transition-all group"
    >
      {/* Top row: name + category badge */}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-[13px] font-black uppercase italic tracking-tight text-primary leading-tight truncate">
            {receta.nombre}
          </h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[9px] font-black text-primary/30 flex items-center gap-1">
              <Clock size={9} />{receta.tiempo}
            </span>
            <span className="text-[9px] font-black text-primary/30 flex items-center gap-1">
              <ChefHat size={9} />{receta.dificultad}
            </span>
            <span className="text-[9px] font-black text-primary/25">
              {ingCount} ing.
            </span>
          </div>
        </div>
        <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-bg-menu text-menu-text shrink-0 whitespace-nowrap">
          {catEmoji} {receta.categoria}
        </span>
      </div>

      {/* Macro bar */}
      <div className="flex items-center justify-between">
        <MacroBar kcal={totales.kcal} proteinas={totales.proteinas} carbos={totales.carbos} grasas={totales.grasas} />
        <button
          onClick={onSelect}
          className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-primary/40 hover:text-primary transition-colors group-hover:gap-1.5"
        >
          Ver <ChevronRight size={11} />
        </button>
      </div>
    </MotionDiv>
  );
}

// ─── PendingIng ───────────────────────────────────────────────────────────────

interface PendingIng {
  base: Ingrediente;
  qty: number;
}

// ─── ModalAddReceta ───────────────────────────────────────────────────────────

function ModalAddReceta({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [isSaving, setIsSaving]     = useState(false);
  const [searchIng, setSearchIng]   = useState("");
  const [nuevoPaso, setNuevoPaso]   = useState("");
  const [formData, setFormData]     = useState(INITIAL_FORM);
  const [pendingIng, setPendingIng] = useState<PendingIng | null>(null);
  const { toasts, toast, dismiss }  = useToast();

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
      toast.warning("Añade al menos un ingrediente de la despensa");
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
      toast.error(`Error: ${err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const totalesPreview = calcTotales(formData.ingredientes);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 pb-16 sm:pb-6">
        <MotionDiv
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        />
        <MotionDiv
          initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 36 }}
          className="relative w-full sm:max-w-2xl rounded-t-[40px] sm:rounded-(--radius-card) p-6 overflow-y-auto max-h-[92vh] bg-white-custom shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="sm:hidden w-10 h-1 bg-primary/15 rounded-full mx-auto mb-5" />

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-primary">
              Nueva <span className="text-primary/20">Receta</span>
            </h2>
            <BtnIcon variant="ghost" onClick={onClose} className="border-none bg-primary/8 text-primary/40">
              <X size={16} />
            </BtnIcon>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Información básica */}
            <section className="space-y-3">
              <SectionTitle>Información básica</SectionTitle>
              <FieldInput
                label="Nombre del plato" required
                value={formData.nombre}
                onChange={v => setFormData(p => ({ ...p, nombre: v }))}
                placeholder="Tortilla, Ensalada…"
              />

              {/* Categoría + Tiempo en la misma fila */}
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
                <FieldInput
                  label="Tiempo"
                  value={formData.tiempo}
                  onChange={v => setFormData(p => ({ ...p, tiempo: v }))}
                  placeholder="20 min"
                />
              </div>

              {/* Dificultad */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-primary/40 pl-1">Dificultad</label>
                <div className="flex gap-2">
                  {DIFICULTADES.map(d => (
                    <button
                      key={d} type="button"
                      onClick={() => setFormData(p => ({ ...p, dificultad: d }))}
                      className={`flex-1 py-2 rounded-(--radius-btn) text-[10px] font-black uppercase tracking-wide border transition-all ${
                        formData.dificultad === d
                          ? "bg-bg-menu text-menu-text border-bg-menu"
                          : "bg-bg-main border-primary/15 text-primary/40 hover:border-primary/30"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Ingredientes */}
            <section className="space-y-3">
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
                    <MotionDiv
                      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                      className="absolute top-full left-0 w-full bg-white-custom border border-primary/10 rounded-(--radius-btn) mt-1.5 shadow-xl z-50 overflow-hidden"
                    >
                      {filteredDbIngredientes.map(ing => (
                        <button
                          key={ing.id} type="button"
                          onClick={() => selectIngrediente(ing)}
                          className="w-full px-4 py-2.5 text-left flex items-center justify-between hover:bg-bg-main transition-colors border-b border-primary/5 last:border-0"
                        >
                          <span className="text-[11px] font-bold uppercase text-primary">{ing.nombre}</span>
                          <span className="text-[9px] font-black text-primary/30 flex items-center gap-1">
                            {ing.proteinas}g P <Plus size={10} className="text-primary/40" />
                          </span>
                        </button>
                      ))}
                    </MotionDiv>
                  )}
                </AnimatePresence>
              </div>

              {/* Pending ingredient confirmation */}
              <AnimatePresence>
                {pendingIng && (
                  <MotionDiv
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-accent/10 border border-accent/25 rounded-(--radius-btn) p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase text-primary">{pendingIng.base.nombre}</span>
                        <span className="text-[9px] font-bold text-primary/40">{pendingIng.base.porcion_texto} / unidad</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary/40 shrink-0">Cantidad</span>
                        <button type="button"
                          onClick={() => setPendingIng(p => p && p.qty > 0.5 ? { ...p, qty: Math.round((p.qty - 0.5) * 10) / 10 } : p)}
                          className="w-7 h-7 flex items-center justify-center bg-white-custom rounded-(--radius-btn) border border-primary/10 text-primary/30 hover:text-primary transition-all shrink-0"
                        >
                          <Minus size={12} />
                        </button>
                        <input
                          type="number" min="0.5" step="0.5"
                          value={pendingIng.qty}
                          onChange={e => setPendingIng(p => p ? { ...p, qty: Math.max(0.1, Number(e.target.value)) } : p)}
                          className="w-16 text-center bg-white-custom border border-primary/10 rounded-(--radius-btn) py-1.5 text-[12px] font-black text-primary outline-none"
                        />
                        <button type="button"
                          onClick={() => setPendingIng(p => p ? { ...p, qty: Math.round((p.qty + 0.5) * 10) / 10 } : p)}
                          className="w-7 h-7 flex items-center justify-center bg-white-custom rounded-(--radius-btn) border border-primary/10 text-primary/30 hover:text-primary transition-all shrink-0"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      {/* Macros preview of pending ingredient */}
                      <MacroGrid
                        kcal={pendingIng.base.kcal * pendingIng.qty}
                        proteinas={pendingIng.base.proteinas * pendingIng.qty}
                        carbos={pendingIng.base.carbohidratos * pendingIng.qty}
                        grasas={pendingIng.base.grasas * pendingIng.qty}
                      />

                      <div className="flex gap-2 pt-1">
                        <Btn type="button" variant="ghost" onClick={() => setPendingIng(null)} className="flex-1">Cancelar</Btn>
                        <Btn type="button" onClick={confirmIngrediente} className="flex-1">✓ Añadir</Btn>
                      </div>
                    </div>
                  </MotionDiv>
                )}
              </AnimatePresence>

              {/* Ingredient list */}
              {formData.ingredientes.length > 0 && (
                <div className="space-y-1.5">
                  {formData.ingredientes.map((ing, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-bg-main border border-primary/8 rounded-(--radius-btn) px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-black uppercase text-primary">{ing.nombre}</span>
                        <span className="text-[9px] text-primary/30 ml-2">{ing.cantidad}</span>
                      </div>
                      <MacroBar
                        kcal={ing.kcal}
                        proteinas={ing.proteinas}
                        carbos={parseFloat(String(ing.carbohidratos || 0))}
                        grasas={ing.grasas}
                      />
                      <button type="button" onClick={() => removeIngrediente(idx)}
                        className="p-1 text-primary/20 hover:text-red-400 transition-colors ml-1 shrink-0"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}

                  {/* Totals row */}
                  <div className="pt-1">
                    <MacroGrid
                      kcal={totalesPreview.kcal}
                      proteinas={totalesPreview.proteinas}
                      carbos={totalesPreview.carbos}
                      grasas={totalesPreview.grasas}
                    />
                  </div>
                </div>
              )}
            </section>

            {/* Pasos */}
            <section className="space-y-3">
              <SectionTitle>Pasos de preparación</SectionTitle>
              <div className="flex gap-2">
                <input
                  className="input-brand flex-1 text-[11px]"
                  value={nuevoPaso}
                  onChange={e => setNuevoPaso(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addPaso(); }}}
                  placeholder="Describe un paso…"
                />
                <BtnIcon type="button" onClick={addPaso} className="shrink-0 w-10 h-10"><Plus size={16} /></BtnIcon>
              </div>
              {formData.instrucciones.length > 0 && (
                <div className="space-y-1.5">
                  {formData.instrucciones.map((paso, idx) => (
                    <div key={idx} className="flex items-start gap-3 bg-bg-main border border-primary/8 rounded-(--radius-btn) px-4 py-2.5">
                      <span className="w-5 h-5 rounded-full bg-bg-menu text-menu-text text-[8px] font-black flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="text-[11px] font-bold text-primary/65 uppercase flex-1 leading-relaxed">{paso}</span>
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

            <Btn type="submit" loading={isSaving} disabled={!formData.nombre.trim()} icon={<Save size={16} />} fullWidth size="lg">
              Guardar receta
            </Btn>
          </form>
        </MotionDiv>
      </div>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}

// ─── RecetasPage ──────────────────────────────────────────────────────────────

const RecetasPage = () => {
  const [filter, setFilter]               = useState("");
  const [catFilter, setCatFilter]         = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [selectedReceta, setSelectedReceta] = useState<Receta | null>(null);

  const { data: recipes, loading } = useSupabaseData<Receta>("recetas");

  // ── List view ────────────────────────────────────────────────────────────────
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

      {/* Header */}
      <header className="sticky top-0 z-10 bg-bg-main/90 backdrop-blur-xl border-b border-primary/10">
        <div className="max-w-7xl mx-auto px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <Link
              href="/personal/cocina"
              className="inline-flex items-center gap-1 mb-0.5 text-[9px] font-black uppercase tracking-widest text-primary/40 hover:text-primary transition-colors"
            >
              <ChevronLeft size={12} /> Cocina
            </Link>
            <h1 className="text-xl font-black uppercase tracking-tighter italic leading-none text-primary">
              Mis <span className="text-primary/20">Recetas</span>
            </h1>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary/30" size={13} />
            <input
              placeholder="Buscar..."
              className="input-brand pl-9 pr-8 text-[11px] py-2"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
            {filter && (
              <button onClick={() => setFilter("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/30 hover:text-primary transition-colors">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Actions (desktop) */}
          <div className="hidden sm:flex items-center gap-2">
            <Link
              href="/personal/salud/ingredientes"
              className="flex items-center gap-2 text-[11px] py-2 px-4 tracking-widest font-black uppercase rounded-(--radius-btn) border border-primary/20 text-primary/50 hover:border-primary/40 hover:text-primary transition-all bg-white-custom"
            >
              <Carrot size={13} /> Ingredientes
            </Link>
            <Btn onClick={() => setIsModalOpen(true)} icon={<Plus size={14} />} size="md">Añadir</Btn>
          </div>
        </div>

        {/* Category filters — sub-row */}
        <div className="max-w-7xl mx-auto px-5 pb-3 flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setCatFilter(null)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-(--radius-btn) text-[9px] font-black uppercase tracking-wide transition-all border ${
              catFilter === null
                ? "bg-primary text-btn-text border-primary"
                : "bg-white-custom border-primary/15 text-primary/50 hover:border-primary/30"
            }`}
          >
            Todas
            <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black ${catFilter === null ? "bg-btn-text/20" : "bg-primary/5 text-primary/35"}`}>
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
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-(--radius-btn) text-[9px] font-black uppercase tracking-wide transition-all border ${
                  active
                    ? "bg-bg-menu text-menu-text border-bg-menu"
                    : "bg-white-custom border-primary/15 text-primary/50 hover:border-primary/30"
                }`}
              >
                <span>{emoji}</span> {label}
                <span className={`text-[8px] px-1 py-0.5 rounded-full font-black ${active ? "bg-btn-text/20" : "bg-primary/5 text-primary/35"}`}>
                  {count}
                </span>
              </button>
            );
          })}

          {catFilter && (
            <button
              onClick={() => setCatFilter(null)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-(--radius-btn) text-[9px] font-black uppercase tracking-wide text-primary/40 hover:text-primary border border-dashed border-primary/20 hover:border-primary/40 transition-all"
            >
              <X size={10} /> Limpiar
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 pt-4">
        {loading ? (
          <Loading fullScreen={false} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {/* Add new — compact card */}
            <MotionButton
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              onClick={() => setIsModalOpen(true)}
              className="border-(length:--border-width) border-dashed border-primary/15 rounded-(--radius-card) flex items-center justify-center gap-3 p-4 bg-white-custom hover:bg-primary/5 transition-all group min-h-[72px]"
            >
              <div className="w-8 h-8 flex items-center justify-center bg-primary text-btn-text rounded-(--radius-btn) shadow group-hover:scale-110 transition-transform">
                <Plus size={15} />
              </div>
              <span className="text-[9px] font-black uppercase text-primary/30 tracking-widest group-hover:text-primary transition-colors">
                Nueva receta
              </span>
            </MotionButton>

            <AnimatePresence mode="popLayout">
              {filteredRecipes.length === 0 && !loading ? (
                <MotionDiv
                  key="empty"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="col-span-full flex flex-col items-center justify-center py-16 gap-2"
                >
                  <Utensils className="text-primary/15" size={40} />
                  <p className="text-[11px] font-black uppercase tracking-widest text-primary/25">
                    {filter || catFilter ? "Sin resultados" : "Sin recetas aún"}
                  </p>
                </MotionDiv>
              ) : (
                filteredRecipes.map((receta, i) => (
                  <RecipeCard key={receta.id ?? i} receta={receta} index={i} onSelect={() => setSelectedReceta(receta)} />
                ))
              )}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* FAB (mobile) */}
      <div className="sm:hidden fixed bottom-24 right-6 z-20 flex flex-col items-end gap-3">
        <Link
          href="/personal/salud/ingredientes"
          className="w-12 h-12 rounded-(--radius-btn) flex items-center justify-center bg-white-custom border border-primary/20 text-primary/50 shadow-lg"
        >
          <Carrot size={18} />
        </Link>
        <MotionButton
          whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
          onClick={() => setIsModalOpen(true)}
          className="w-14 h-14 rounded-(--radius-btn) btn-brand shadow-2xl"
        >
          <Plus size={22} />
        </MotionButton>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <ModalAddReceta
            onClose={() => setIsModalOpen(false)}
            onSuccess={() => setIsModalOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Receta Drawer */}
      <AnimatePresence>
        {selectedReceta && (
          <RecetaDrawer
            receta={selectedReceta}
            onClose={() => setSelectedReceta(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default RecetasPage;