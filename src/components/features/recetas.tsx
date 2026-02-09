"use client";
import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSupabaseData } from "@/hooks/useSupabaseData"; 
import { Receta } from "@/lib/types/recetas";
import { 
  Utensils, 
  Clock, 
  ChevronRight, 
  Search,
  ChefHat,
  Flame,
  Plus
} from "lucide-react";

const RecetasPage = () => {
  const [filter, setFilter] = useState("");

  // "Hook con el genérico <Receta> (asegúrate de haber guardado el hook con <T = any>)"
  const { data: recipes, loading, error } = useSupabaseData<Receta>("recetas");

  const filteredRecipes = recipes.filter((r) => 
    r.nombre.toLowerCase().includes(filter.toLowerCase()) ||
    r.categoria.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-bg-main pb-32">
      {/* --- HEADER --- */}
      <header className="pt-12 pb-8 px-6 max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, x: -20 }} 
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4 mb-4"
        >
          <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
            <Utensils size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-primary">
              "MIS"<span className="opacity-40">"RECETAS"</span>
            </h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary/40">
              "El grimorio culinario de Franilover"
            </p>
          </div>
        </motion.div>

        {/* --- BUSCADOR CORREGIDO --- */}
        <div className="relative mt-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30" size={18} />
          <input 
            type="text"
            placeholder='"BUSCAR RECETA..."'
            className="w-full bg-white border border-primary/10 rounded-2xl py-4 pl-12 pr-4 text-[11px] font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/5 transition-all"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </header>

      {/* --- CONTENIDO --- */}
      <main className="px-6 max-w-7xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-20">
            <ChefHat size={40} className="animate-bounce" />
            <p className="text-[10px] font-black uppercase mt-4">"Cocinando contenido..."</p>
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-400 font-black uppercase text-[10px]">
            "Error: " {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredRecipes.map((receta, index) => (
                <RecipeCard key={receta.id || index} receta={receta} index={index} />
              ))}
            </AnimatePresence>

            {/* "Botón Nueva Receta" */}
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="border-2 border-dashed border-primary/10 rounded-[40px] flex flex-col items-center justify-center p-10 min-h-[200px] hover:bg-primary/5 transition-colors group"
            >
              <div className="p-4 bg-primary/5 text-primary/20 group-hover:text-primary/40 rounded-full transition-colors">
                <Plus size={32} />
              </div>
              <span className="text-[10px] font-black uppercase mt-4 text-primary/30">"Nueva Receta"</span>
            </motion.button>
          </div>
        )}
      </main>
    </div>
  );
};

const RecipeCard = ({ receta, index }: { receta: Receta; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
    layout
    className="bg-white border border-primary/5 rounded-[40px] overflow-hidden shadow-sm hover:shadow-xl transition-all group"
  >
    <div className="h-48 bg-primary/5 relative overflow-hidden">
      {receta.imagen_url ? (
        <img 
          src={receta.imagen_url} 
          alt={receta.nombre} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-primary/10">
          <Flame size={48} />
        </div>
      )}
      <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[9px] font-black uppercase text-primary">
        {receta.categoria}
      </div>
    </div>

    <div className="p-6">
      <h3 className="text-lg font-black uppercase tracking-tight text-primary mb-2">
        "{receta.nombre}"
      </h3>
      
      <div className="flex items-center gap-4 text-primary/40 mb-6">
        <div className="flex items-center gap-1 text-[10px] font-bold">
          <Clock size={12} /> {receta.tiempo}
        </div>
        <div className="flex items-center gap-1 text-[10px] font-bold">
          <ChefHat size={12} /> {receta.dificultad}
        </div>
      </div>

      <Link 
        href={`/wiki/recetas/${receta.id}`}
        className="flex items-center justify-between w-full p-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest group-hover:bg-primary/90 transition-colors"
      >
        "Ver Preparación"
        <ChevronRight size={14} />
      </Link>
    </div>
  </motion.div>
);

export default RecetasPage;