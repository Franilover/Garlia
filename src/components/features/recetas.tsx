"use client";
import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSupabaseData } from "@/hooks/useSupabaseData"; 
import { Receta, NuevaReceta } from "@/lib/types/recetas";
import { recetasQueries } from "@/lib/api/queries/recetas"; 
import { 
  Utensils, 
  Clock, 
  ChevronRight, 
  Search,
  ChefHat,
  Flame,
  Plus,
  X
} from "lucide-react";

const RecetasPage = () => {
  const [filter, setFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { data: recipes, loading, error, refetch } = useSupabaseData<Receta>("recetas");

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
          {/* Icono Principal Morado */}
          <div className="p-3 bg-violet-100 text-violet-600 rounded-2xl shadow-sm shadow-violet-100">
            <Utensils size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-primary">
              "MIS"<span className="text-violet-500 opacity-40">"RECETAS"</span>
            </h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-violet-400/60">
              "El grimorio culinario de Franilover"
            </p>
          </div>
        </motion.div>

        {/* Barra de búsqueda con foco violeta */}
        <div className="relative mt-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-300" size={18} />
          <input 
            type="text"
            placeholder='"BUSCAR RECETA..."'
            className="w-full bg-white border border-violet-100 rounded-2xl py-4 pl-12 pr-4 text-[11px] font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all shadow-sm shadow-violet-50/50"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </header>

      {/* --- GRID DE RECETAS --- */}
      <main className="px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Botón Nueva Receta: Estilo Violeta Minimalista */}
          <motion.button 
            onClick={() => setIsModalOpen(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="border-2 border-dashed border-violet-200 rounded-[40px] flex flex-col items-center justify-center p-10 min-h-[250px] bg-white/50 hover:bg-violet-50/50 transition-colors group"
          >
            <div className="p-4 bg-violet-100 text-violet-500 group-hover:text-violet-700 rounded-full transition-colors shadow-sm shadow-violet-100">
              <Plus size={32} />
            </div>
            <span className="text-[10px] font-black uppercase mt-4 text-violet-400 tracking-widest">"Nueva Receta"</span>
          </motion.button>

          {loading ? (
            <>
              {[1, 2].map((n) => (
                <div key={n} className="min-h-[250px] rounded-[40px] bg-violet-50/50 animate-pulse border border-violet-100/20 shadow-inner" />
              ))}
            </>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredRecipes.map((receta, index) => (
                <RecipeCard key={receta.id || index} receta={receta} index={index} />
              ))}
            </AnimatePresence>
          )}
        </div>
      </main>

      {/* --- MODAL FORMULARIO --- */}
      <AnimatePresence>
        {isModalOpen && (
          <ModalAddReceta 
            onClose={() => setIsModalOpen(false)} 
            onSuccess={() => {
              setIsModalOpen(false);
              refetch();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

/* --- COMPONENTE MODAL --- */
const ModalAddReceta = ({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<NuevaReceta>({
    nombre: "",
    categoria: "General",
    tiempo: "20 min",
    dificultad: "Fácil",
    ingredientes: [],
    instrucciones: [],
    descripcion: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await recetasQueries.create(formData);
      if (error) throw error;
      onSuccess();
    } catch (err) {
      console.error('"Error al guardar:"', err);
      alert('"No se pudo guardar la receta"');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-violet-950/30 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden relative border border-violet-100 shadow-violet-200/50"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-violet-300 hover:text-violet-600 transition-colors">
          <X size={24} />
        </button>

        <form onSubmit={handleSubmit} className="p-10">
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-8 text-primary italic">"Nueva"<span className="text-violet-500 opacity-60">"Receta"</span></h2>
          
          <div className="space-y-6">
            <div>
              <label className="text-[9px] font-black uppercase opacity-40 ml-2 text-violet-900 tracking-widest">"Nombre del plato"</label>
              <input 
                required
                className="w-full bg-violet-50/50 border-none rounded-2xl p-4 text-[11px] font-bold uppercase focus:ring-2 focus:ring-violet-500/10 transition-all outline-none text-primary"
                value={formData.nombre}
                onChange={e => setFormData({...formData, nombre: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-black uppercase opacity-40 ml-2 text-violet-900 tracking-widest">"Categoría"</label>
                <select 
                  className="w-full bg-violet-50/50 border-none rounded-2xl p-4 text-[11px] font-bold uppercase focus:ring-2 focus:ring-violet-500/10 outline-none cursor-pointer text-primary"
                  value={formData.categoria}
                  onChange={e => setFormData({...formData, categoria: e.target.value as any})}
                >
                  <option value="General">"General"</option>
                  <option value="Postres">"Postres"</option>
                  <option value="Almuerzos">"Almuerzos"</option>
                  <option value="Desayunos">"Desayunos"</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase opacity-40 ml-2 text-violet-900 tracking-widest">"Tiempo"</label>
                <input 
                  placeholder='"Ej: 30 min"'
                  className="w-full bg-violet-50/50 border-none rounded-2xl p-4 text-[11px] font-bold uppercase focus:ring-2 focus:ring-violet-500/10 outline-none text-primary"
                  value={formData.tiempo}
                  onChange={e => setFormData({...formData, tiempo: e.target.value})}
                />
              </div>
            </div>
          </div>

          <button 
            disabled={loading}
            type="submit"
            className="w-full mt-10 p-5 bg-violet-600 text-white rounded-3xl text-[10px] font-black uppercase tracking-widest hover:bg-violet-700 shadow-xl shadow-violet-200 transition-all disabled:opacity-50"
          >
            {loading ? '"Escribiendo en el grimorio..."' : '"Guardar Receta"'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

/* --- RECIPE CARD --- */
const RecipeCard = ({ receta, index }: { receta: Receta; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
    layout
    className="bg-white border border-violet-100 rounded-[40px] overflow-hidden shadow-sm hover:shadow-xl hover:shadow-violet-100 transition-all group"
  >
    <div className="h-48 bg-violet-50/50 relative overflow-hidden">
      {receta.imagen_url ? (
        <img src={receta.imagen_url} alt={receta.nombre} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-violet-200">
          <Flame size={48} />
        </div>
      )}
      <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[9px] font-black uppercase text-violet-600 border border-violet-100 shadow-sm">
        {receta.categoria}
      </div>
    </div>

    <div className="p-6 text-center">
      <h3 className="text-lg font-black uppercase tracking-tight text-primary mb-2 italic">"{receta.nombre}"</h3>
      <div className="flex items-center justify-center gap-4 text-violet-400/60 mb-6">
        <div className="flex items-center gap-1 text-[10px] font-bold"><Clock size={12} /> {receta.tiempo}</div>
        <div className="flex items-center gap-1 text-[10px] font-bold text-violet-500"><ChefHat size={12} /> {receta.dificultad}</div>
      </div>
      <Link href={`/wiki/recetas/${receta.id}`} className="flex items-center justify-between w-full p-4 bg-violet-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-violet-700 transition-colors shadow-lg shadow-violet-100">
        "Ver Preparación" <ChevronRight size={14} />
      </Link>
    </div>
  </motion.div>
);

export default RecetasPage;