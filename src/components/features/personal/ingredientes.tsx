"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { Ingrediente } from "@/lib/types/cocina";
import {
  Search,
  Plus,
  Flame,
  Zap,
  ChevronLeft,
  Filter
} from "lucide-react";
import Link from "next/link";

// Definimos las categorías disponibles para los filtros
const CATEGORIAS = ["Todos", "Proteínas", "Carbohidratos", "Grasas", "Frutas", "Verduras", "Lácteos", "Cereales", "Otros"];

export const IngredientesPage = () => {
  const [filter, setFilter] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos"); // Nuevo estado para el filtro
  const { data: ingredientes, loading } = useSupabaseData<Ingrediente>("ingredientes");

  // Lógica de filtrado actualizada
  const filteredItems = ingredientes.filter((item) => {
    const matchesSearch = item.nombre.toLowerCase().includes(filter.toLowerCase()) ||
                          item.categoria.toLowerCase().includes(filter.toLowerCase());
    
    const matchesCategory = selectedCategory === "Todos" || 
                            item.categoria === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-bg-main pb-24">
      {/* --- CABECERA --- */}
      <header className="pt-10 pb-6 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2 text-primary/40 mb-2">
              <Link href="/wiki/cocina" className="hover:text-primary transition-colors flex items-center gap-1 text-[10px] font-black uppercase tracking-widest">
                <ChevronLeft size={14} /> "Cocina"
              </Link>
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-primary italic">
              "MI"<span className="text-primary/20">"DESPENSA"</span>
            </h1>
          </motion.div>

          {/* Buscador Estilizado */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30" size={16} />
            <input 
              type="text"
              placeholder='"BUSCAR INGREDIENTE..."'
              className="w-full bg-white border-2 border-primary/5 rounded-2xl py-3 pl-12 pr-4 text-[10px] font-bold uppercase tracking-widest focus:border-primary/20 transition-all outline-none"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </div>

        {/* --- NUEVA SECCIÓN: FILTROS DE CATEGORÍA --- */}
        <div className="mt-8 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex items-center gap-2 min-w-max">
            <div className="pr-2 text-primary/20">
                <Filter size={14} />
            </div>
            {CATEGORIAS.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className="relative px-4 py-2 rounded-full transition-all group"
              >
                {selectedCategory === cat && (
                  <motion.div
                    layoutId="activeFilter"
                    className="absolute inset-0 bg-primary rounded-full shadow-lg shadow-primary/20"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className={`relative z-10 text-[9px] font-black uppercase tracking-widest transition-colors ${
                  selectedCategory === cat ? "text-white" : "text-primary/40 group-hover:text-primary"
                }`}>
                  "{cat}"
                </span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* --- LISTADO --- */}
      <main className="px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card para añadir nuevo */}
          <motion.button 
            whileHover={{ scale: 1.01 }}
            className="border-2 border-dashed border-primary/10 rounded-[35px] flex flex-col items-center justify-center p-8 bg-white/40 hover:bg-white transition-all group min-h-[160px]"
          >
            <div className="p-3 bg-primary text-white rounded-full shadow-lg shadow-primary/20">
              <Plus size={20} />
            </div>
            <span className="text-[9px] font-black uppercase mt-3 text-primary/40 tracking-widest">"Nuevo Insumo"</span>
          </motion.button>

          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="h-[160px] rounded-[35px] bg-primary/5 animate-pulse border border-primary/10" />
            ))
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item, index) => (
                <IngredientCard key={item.id} item={item} index={index} />
              ))}
            </AnimatePresence>
          )}
        </div>
      </main>
    </div>
  );
};

/* --- CARD DE INGREDIENTE --- */
const IngredientCard = ({ item, index }: { item: Ingrediente; index: number }) => {
  
  // Color dinámico según categoría para el badge
  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      "Proteínas": "bg-red-500/10 text-red-600",
      "Frutas": "bg-orange-500/10 text-orange-600",
      "Lácteos": "bg-blue-500/10 text-blue-600",
      "Cereales": "bg-amber-500/10 text-amber-600",
    };
    return colors[cat] || "bg-primary/5 text-primary/40";
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.03 }}
      className="bg-white border border-primary/5 rounded-[35px] p-5 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group"
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-tighter ${getCategoryColor(item.categoria)}`}>
          {item.categoria}
        </div>
        <div className="text-[10px] font-black text-primary/20">
          ${item.precio}
        </div>
      </div>

      <h3 className="text-sm font-black uppercase text-primary mb-1 tracking-tight italic">
        "{item.nombre}"
      </h3>
      <p className="text-[9px] font-bold text-primary/30 uppercase mb-5 tracking-widest">
        {item.porcion_texto}
      </p>

      {/* Grid de Macros */}
      <div className="grid grid-cols-3 gap-1.5 border-t border-primary/5 pt-4">
        <div className="text-center">
          <span className="block text-[7px] font-black text-primary/20 uppercase">"Prot"</span>
          <span className="text-[11px] font-black text-primary">{item.proteinas}g</span>
        </div>
        <div className="text-center">
          <span className="block text-[7px] font-black text-primary/20 uppercase">"Carb"</span>
          <span className="text-[11px] font-black text-primary">{item.carbohidratos}g</span>
        </div>
        <div className="text-center">
          <span className="block text-[7px] font-black text-primary/20 uppercase">"Gras"</span>
          <span className="text-[11px] font-black text-primary">{item.grasas}g</span>
        </div>
      </div>

      {/* Kcal Badge */}
      <div className="mt-4 flex items-center justify-center gap-1.5 py-2 bg-primary text-white rounded-2xl shadow-lg shadow-primary/10">
        <Zap size={10} className="fill-current" />
        <span className="text-[9px] font-black tracking-widest uppercase">{item.kcal} Kcal</span>
      </div>
    </motion.div>
  );
};

export default IngredientesPage;