"use client";
import React, { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, ChevronLeft, Trash2, X,
  Flame, Loader2, PackageCheck, Utensils, Carrot,
  Tag, MapPin, Plus, Check,
} from "lucide-react";
import { useCarrito } from "@/hooks/features/useCarritoStore";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { Ingrediente } from "@/lib/types/personal/ingrediente";
import { CarritoProvider } from "@/hooks/features/useCarritoStore";


function MacroChip({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="bg-bg-main rounded-xl py-1.5 text-center border border-primary/8 flex-1">
      <p className="text-[7px] font-black uppercase tracking-widest text-primary/25">{label}</p>
      <p className="text-[10px] font-black text-primary leading-tight">
        {value.toFixed(0)}<span className="text-[7px] text-primary/25">{unit}</span>
      </p>
    </div>
  );
}


function ComprasInner() {
  const { items, loading, removeItem, clearAll, totalItems } = useCarrito();
  const [confirmClear, setConfirmClear]   = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const totales = useMemo(() => items.reduce(
    (acc, i) => ({
      kcal:          acc.kcal          + i.kcal,
      proteinas:     acc.proteinas     + i.proteinas,
      carbohidratos: acc.carbohidratos + i.carbohidratos,
      grasas:        acc.grasas        + i.grasas,
      precio:        acc.precio        + (i.precio_pagado ?? 0),
    }),
    { kcal: 0, proteinas: 0, carbohidratos: 0, grasas: 0, precio: 0 }
  ), [items]);

  return (
    <div className="min-h-screen bg-bg-main pb-28 text-foreground">

      {/* HEADER */}
      <header className="sticky top-0 z-10 bg-bg-main/90 backdrop-blur-xl border-b border-primary/10">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <Link
              href="/personal/salud"
              className="inline-flex items-center gap-1 mb-1 text-[9px] font-black uppercase tracking-widest text-primary/40 hover:text-primary transition-colors"
            >
              <ChevronLeft size={12} /> Salud
            </Link>
            <h1 className="text-2xl font-black uppercase tracking-tighter italic leading-none text-primary">
              Lista de <span className="text-primary/20">Compras</span>
            </h1>
          </div>

          {items.length > 0 && (
            <AnimatePresence mode="wait">
              {confirmClear ? (
                <motion.div key="confirm" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5">
                  <span className="text-[9px] font-black uppercase text-red-400">¿Vaciar todo?</span>
                  <button onClick={async () => { await clearAll(); setConfirmClear(false); }} className="px-2.5 py-1.5 rounded-xl bg-red-100 text-red-500 text-[9px] font-black uppercase hover:bg-red-200 transition-all">Sí</button>
                  <button onClick={() => setConfirmClear(false)} className="px-2.5 py-1.5 rounded-xl bg-primary/8 text-primary/40 text-[9px] font-black uppercase hover:bg-primary/15 transition-all">No</button>
                </motion.div>
              ) : (
                <motion.button key="clear" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setConfirmClear(true)}
                  className="hidden sm:flex items-center gap-2 text-[10px] py-2 px-4 tracking-widest font-black uppercase rounded-2xl border border-primary/20 text-primary/40 hover:border-red-200 hover:text-red-400 transition-all bg-white-custom"
                >
                  <Trash2 size={13} /> Vaciar lista
                </motion.button>
              )}
            </AnimatePresence>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 pt-5 space-y-5">

        {/* ─── vacío ─── */}
        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <div className="w-16 h-16 rounded-3xl bg-primary/5 flex items-center justify-center">
              <ShoppingCart size={28} className="text-primary/20" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-[12px] font-black uppercase tracking-widest text-primary/30">Lista vacía</p>
              <p className="text-[10px] text-primary/25 font-bold">Añade ingredientes o recetas desde sus páginas</p>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <Link href="/personal/salud/ingredientes" className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-primary/20 text-primary/50 hover:border-primary/40 hover:text-primary transition-all text-[10px] font-black uppercase tracking-widest bg-white-custom">
                <Carrot size={13} /> Ingredientes
              </Link>
              <Link href="/personal/cocina/recetas" className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-primary/20 text-primary/50 hover:border-primary/40 hover:text-primary transition-all text-[10px] font-black uppercase tracking-widest bg-white-custom">
                <Utensils size={13} /> Recetas
              </Link>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-32">
            <Loader2 className="animate-spin text-primary/30" size={36} />
          </div>
        )}

        {!loading && items.length > 0 && (
          <>
            {/* ─── resumen nutricional ─── */}
            <div className="card-main p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/40">Resumen nutricional</p>
                <div className="flex items-center gap-1.5 rounded-xl bg-accent/15 border border-accent/25 px-3 py-1.5">
                  <Flame size={10} className="text-accent fill-accent/60 shrink-0" />
                  <span className="text-[10px] font-black tracking-widest uppercase text-primary/70">
                    {totales.kcal.toFixed(0)} kcal
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Proteínas", value: totales.proteinas,     unit: "g" },
                  { label: "Carbos",    value: totales.carbohidratos,  unit: "g" },
                  { label: "Grasas",    value: totales.grasas,         unit: "g" },
                ].map(m => (
                  <div key={m.label} className="bg-bg-main rounded-2xl py-3 text-center border border-primary/8">
                    <p className="text-[8px] font-black uppercase tracking-widest text-primary/30">{m.label}</p>
                    <p className="text-lg font-black text-primary italic">
                      {m.value.toFixed(1)}<span className="text-[10px] font-bold text-primary/30">{m.unit}</span>
                    </p>
                  </div>
                ))}
              </div>

              {totales.precio > 0 && (
                <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-accent/10 border border-accent/20">
                  <div className="flex items-center gap-2">
                    <Tag size={12} className="text-accent/60" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary/50">Total estimado</span>
                  </div>
                  <span className="text-xl font-black italic text-primary">${totales.precio.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* ─── grid de items ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <AnimatePresence mode="popLayout">
                {items.map((item, i) => {
                  const isConfirm = confirmDelete === item.id;
                  
                  const origenEsReceta = item.lugar_compra && !item.lugar_compra.startsWith("$");

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0, transition: { delay: i * 0.02 } }}
                      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.15 } }}
                      className="card-main p-4 space-y-3"
                    >
                      {/* top: origen badge + eliminar */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-bg-menu text-white flex items-center gap-1">
                          {origenEsReceta
                            ? <><Utensils size={9} /> {item.lugar_compra}</>
                            : <><Carrot size={9} /> Despensa</>
                          }
                        </span>

                        <AnimatePresence mode="wait">
                          {isConfirm ? (
                            <motion.div key="confirm" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-1">
                              <span className="text-[8px] font-black uppercase text-red-400">¿Quitar?</span>
                              <button onClick={() => removeItem(item.id).then(() => setConfirmDelete(null))} className="px-2 py-1 rounded-lg bg-red-100 text-red-500 text-[8px] font-black uppercase hover:bg-red-200 transition-all">Sí</button>
                              <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 rounded-lg bg-primary/8 text-primary/40 text-[8px] font-black uppercase hover:bg-primary/15 transition-all">No</button>
                            </motion.div>
                          ) : (
                            <motion.button key="trash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                              onClick={() => setConfirmDelete(item.id)}
                              className="p-1.5 rounded-lg text-primary/20 hover:text-red-400 hover:bg-red-50 transition-all"
                            >
                              <Trash2 size={13} />
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* nombre + cantidad */}
                      <div>
                        <h3 className="text-[13px] font-black uppercase italic tracking-tight text-primary leading-tight">
                          {item.nombre}
                        </h3>
                        {item.cantidad_comprada && (
                          <p className="text-[9px] font-bold text-primary/30 uppercase">{item.cantidad_comprada}</p>
                        )}
                      </div>

                      {/* macros */}
                      <div className="flex gap-1">
                        <MacroChip label="Prot" value={item.proteinas}     unit="g" />
                        <MacroChip label="Carb" value={item.carbohidratos} unit="g" />
                        <MacroChip label="Gras" value={item.grasas}        unit="g" />
                      </div>

                      {/* kcal + precio */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 flex-1 rounded-xl bg-accent/15 border border-accent/20 px-3 py-2">
                          <Flame size={10} className="text-accent fill-accent/60 shrink-0" />
                          <span className="text-[10px] font-black text-primary/70">{item.kcal.toFixed(0)} kcal</span>
                        </div>
                        {(item.precio_pagado ?? 0) > 0 && (
                          <div className="flex items-center gap-1.5 rounded-xl bg-primary/5 border border-primary/10 px-3 py-2">
                            <Tag size={10} className="text-primary/30 shrink-0" />
                            <span className="text-[10px] font-black text-primary">${item.precio_pagado!.toFixed(2)}</span>
                          </div>
                        )}
                      </div>

                      {/* lugar de compra (si tiene) */}
                      {item.lugar_compra && !origenEsReceta && (
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-primary/35 uppercase">
                          <MapPin size={10} className="text-primary/25 shrink-0" />
                          {item.lugar_compra}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </>
        )}
      </main>
    </div>
  );
}


export default function ComprasPage() {
  const { data: ingredientes, loading: loadingIngredientes } = useSupabaseData<Ingrediente>("ingredientes");

  if (loadingIngredientes) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <Loader2 className="animate-spin text-primary/30" size={36} />
      </div>
    );
  }

  return (
    <CarritoProvider ingredientes={ingredientes}>
      <ComprasInner />
    </CarritoProvider>
  );
}