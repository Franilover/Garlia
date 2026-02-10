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
  X,
  ArrowLeft
} from "lucide-react";

// 1. Añadimos la interfaz de Props para que TypeScript no se queje
interface RecetasPageProps {
  selectedRecipeId?: string;
}

const RecetasPage = ({ selectedRecipeId }: RecetasPageProps) => {
  const [filter, setFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { data: recipes, loading, error, refetch } = useSupabaseData<Receta>("recetas");

  // 2. Lógica para mostrar el DETALLE de una receta
  if (selectedRecipeId) {
    const receta = recipes.find(r => String(r.id) === selectedRecipeId);

    if (loading) return <div className="p-20 text-center font-black uppercase text-primary animate-pulse">"Abriendo Grimorio..."</div>;
    
    if (!receta) return (
      <div className="p-20 text-center">
        <p className="font-black text-primary uppercase">"Receta no encontrada"</p>
        <Link href="/personal/cocina/recetas" className="text-[10px] text-primary/40 underline uppercase mt-4 block">"Volver a la biblioteca"</Link>
      </div>
    );

    return (
      <div className="min-h-screen bg-bg-main p-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/personal/cocina/recetas" className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-primary/40 hover:text-primary transition-colors mb-8">
            <ArrowLeft size={14} /> "Volver a Recetas"
          </Link>
          
          <div className="bg-white rounded-[40px] border border-primary/10 overflow-hidden shadow-2xl">
            <div className="h-64 bg-primary/5 relative">
               {receta.imagen_url && <img src={receta.imagen_url} className="w-full h-full object-cover" />}
               <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
            <div className="p-10">
              <span className="text-[10px] font-black uppercase text-primary/30 tracking-[0.2em]">{receta.categoria}</span>
              <h1 className="text-4xl font-black uppercase text-primary italic mt-2 mb-6 tracking-tighter">"{receta.nombre}"</h1>
              
              <div className="flex gap-8 mb-10 border-y border-primary/5 py-6">
                <div className="flex items-center gap-2">
                  <Clock className="text-primary/30" size={18} />
                  <span className="text-[11px] font-bold uppercase text-primary">{receta.tiempo}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ChefHat className="text-primary/30" size={18} />
                  <span className="text-[11px] font-bold uppercase text-primary">{receta.dificultad}</span>
                </div>
              </div>

              {/* Aquí puedes expandir con ingredientes e instrucciones de tu BD */}
              <div className="grid md:grid-cols-2 gap-12 text-primary">
                <div>
                  <h3 className="font-black uppercase text-xs mb-4 tracking-widest text-primary/40 italic">"Ingredientes"</h3>
                  <p className="text-sm leading-relaxed opacity-70">"Contenido en desarrollo..."</p>
                </div>
                <div>
                  <h3 className="font-black uppercase text-xs mb-4 tracking-widest text-primary/40 italic">"Preparación"</h3>
                  <p className="text-sm leading-relaxed opacity-70">"Contenido en desarrollo..."</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Lógica original de la LISTA (Se muestra si no hay selectedRecipeId)
  const filteredRecipes = recipes.filter((r) => 
    r.nombre.toLowerCase().includes(filter.toLowerCase()) ||
    r.categoria.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-bg-main pb-32">
      <header className="pt-12 pb-8 px-6 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-primary/10 text-primary rounded-2xl">
            <Utensils size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-primary">
              "MIS"<span className="text-primary/30">"RECETAS"</span>
            </h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary/40">"El grimorio culinario de Franilover"</p>
          </div>
        </motion.div>

        <div className="relative mt-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30" size={18} />
          <input 
            type="text"
            placeholder='"BUSCAR RECETA..."'
            className="w-full bg-white border border-primary/10 rounded-2xl py-4 pl-12 pr-4 text-[11px] font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </header>

      <main className="px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <motion.button 
            onClick={() => setIsModalOpen(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="border-2 border-dashed border-primary/10 rounded-[40px] flex flex-col items-center justify-center p-10 min-h-[250px] bg-white/50 hover:bg-primary/5 transition-colors group"
          >
            <div className="p-4 bg-primary text-white rounded-full shadow-lg shadow-primary/20">
              <Plus size={32} />
            </div>
            <span className="text-[10px] font-black uppercase mt-4 text-primary/40 tracking-widest group-hover:text-primary transition-colors">"Nueva Receta"</span>
          </motion.button>

          {loading ? (
            <>
              {[1, 2].map((n) => (
                <div key={n} className="min-h-[250px] rounded-[40px] bg-primary/5 animate-pulse border border-primary/10 shadow-inner" />
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

/* --- COMPONENTE MODAL (Sin cambios) --- */
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
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-primary/10 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden relative border border-primary/10"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-primary/30 hover:text-primary transition-colors">
          <X size={24} />
        </button>

        <form onSubmit={handleSubmit} className="p-10">
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-8 text-primary italic">"Nueva"<span className="text-primary/30">"Receta"</span></h2>
          <div className="space-y-6">
            <div>
              <label className="text-[9px] font-black uppercase opacity-40 ml-2 text-primary tracking-widest">"Nombre del plato"</label>
              <input 
                required
                className="w-full bg-primary/5 border-none rounded-2xl p-4 text-[11px] font-bold uppercase focus:ring-2 focus:ring-primary/10 transition-all outline-none text-primary"
                value={formData.nombre}
                onChange={e => setFormData({...formData, nombre: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-black uppercase opacity-40 ml-2 text-primary tracking-widest">"Categoría"</label>
                <select 
                  className="w-full bg-primary/5 border-none rounded-2xl p-4 text-[11px] font-bold uppercase focus:ring-2 focus:ring-primary/10 outline-none cursor-pointer text-primary"
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
                <label className="text-[9px] font-black uppercase opacity-40 ml-2 text-primary tracking-widest">"Tiempo"</label>
                <input 
                  placeholder='"Ej: 30 min"'
                  className="w-full bg-primary/5 border-none rounded-2xl p-4 text-[11px] font-bold uppercase focus:ring-2 focus:ring-primary/10 outline-none text-primary"
                  value={formData.tiempo}
                  onChange={e => setFormData({...formData, tiempo: e.target.value})}
                />
              </div>
            </div>
          </div>
          <button 
            disabled={loading}
            type="submit"
            className="w-full mt-10 p-5 bg-primary text-white rounded-3xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-xl shadow-primary/20 transition-all disabled:opacity-50"
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
    className="bg-white border border-primary/10 rounded-[40px] overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group"
  >
    <div className="h-48 bg-primary/5 relative overflow-hidden">
      {receta.imagen_url ? (
        <img src={receta.imagen_url} alt={receta.nombre} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-primary/20">
          <Flame size={48} />
        </div>
      )}
      <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[9px] font-black uppercase text-primary/60 border border-primary/5 shadow-sm">
        {receta.categoria}
      </div>
    </div>

    <div className="p-6 text-center">
      <h3 className="text-lg font-black uppercase tracking-tight text-primary mb-2 italic">"{receta.nombre}"</h3>
      <div className="flex items-center justify-center gap-4 text-primary/40 mb-6">
        <div className="flex items-center gap-1 text-[10px] font-bold"><Clock size={12} /> {receta.tiempo}</div>
        <div className="flex items-center gap-1 text-[10px] font-bold text-primary/60"><ChefHat size={12} /> {receta.dificultad}</div>
      </div>
      <Link href={`/personal/recetas/${receta.id}`} className="flex items-center justify-between w-full p-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-primary/10">
        "Ver Preparación" <ChevronRight size={14} />
      </Link>
    </div>
  </motion.div>
);

export default RecetasPage;