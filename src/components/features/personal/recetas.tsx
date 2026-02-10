"use client";
import React, { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSupabaseData } from "@/hooks/useSupabaseData"; 
import { Receta, NuevaReceta } from "@/lib/types/recetas";
import { Ingrediente } from "@/lib/types/cocina";
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
  ArrowLeft,
  Trash2
} from "lucide-react";

interface IngredienteReceta {
  nombre: string;
  cantidad: string;
  kcal?: number;
}

interface RecetasPageProps {
  selectedRecipeId?: string;
}

const RecetasPage = ({ selectedRecipeId }: RecetasPageProps) => {
  const [filter, setFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { data: recipes, loading, error, refetch } = useSupabaseData<Receta>("recetas");

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
               {receta.imagen_url && <img src={receta.imagen_url} className="w-full h-full object-cover" alt={receta.nombre} />}
               <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent" />
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

              <div className="grid md:grid-cols-2 gap-12 text-primary">
                <div>
                  <h3 className="font-black uppercase text-xs mb-4 tracking-widest text-primary/40 italic">"Ingredientes"</h3>
                  <ul className="space-y-2">
                    {(receta.ingredientes as unknown as IngredienteReceta[])?.map((ing, i) => (
                      <li key={i} className="text-[11px] font-bold uppercase border-b border-primary/10 pb-2 flex justify-between text-primary">
                        <span>{ing.nombre}</span>
                        <span className="opacity-60">{ing.cantidad}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-black uppercase text-xs mb-4 tracking-widest text-primary/40 italic">"Preparación"</h3>
                  <div className="space-y-4">
                    {receta.instrucciones?.map((paso, i) => (
                      <div key={i} className="flex gap-4">
                        <span className="text-[10px] font-black text-primary/30">{i + 1}</span>
                        <p className="text-[11px] font-bold leading-relaxed text-primary/80 uppercase">{paso}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            className="w-full bg-white border border-primary/20 rounded-2xl py-4 pl-12 pr-4 text-[11px] font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all shadow-sm text-primary"
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
            className="border-2 border-dashed border-primary/20 rounded-[40px] flex flex-col items-center justify-center p-10 min-h-62.5 bg-white hover:bg-primary/5 transition-colors group"
          >
            <div className="p-4 bg-primary text-white rounded-full shadow-lg shadow-primary/20">
              <Plus size={32} />
            </div>
            <span className="text-[10px] font-black uppercase mt-4 text-primary/40 tracking-widest group-hover:text-primary transition-colors">"Nueva Receta"</span>
          </motion.button>

          {loading ? (
            <>
              {[1, 2].map((n) => (
                <div key={n} className="min-h-62.5 rounded-[40px] bg-primary/5 animate-pulse border border-primary/10" />
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

/* --- MODAL CON COLORES DE ALTO CONTRASTE --- */
const ModalAddReceta = ({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [searchIng, setSearchIng] = useState("");
  const { data: dbIngredientes } = useSupabaseData<Ingrediente>("ingredientes");

  const [formData, setFormData] = useState<Omit<NuevaReceta, 'ingredientes'> & { ingredientes: IngredienteReceta[] }>({
    nombre: "",
    categoria: "General",
    tiempo: "20 min",
    dificultad: "Fácil",
    ingredientes: [],
    instrucciones: [],
    descripcion: ""
  });

  const [nuevoPaso, setNuevoPaso] = useState("");

  const filteredDbIngredientes = useMemo(() => {
    if (!searchIng) return [];
    return dbIngredientes.filter(i => 
      i.nombre.toLowerCase().includes(searchIng.toLowerCase()) &&
      !formData.ingredientes.find(selected => selected.nombre === i.nombre)
    ).slice(0, 5);
  }, [searchIng, dbIngredientes, formData.ingredientes]);

  const addIngrediente = (ing: Ingrediente) => {
    const cantidad = prompt(`"Cantidad para ${ing.nombre}:"`, "100g");
    if (cantidad) {
      setFormData({
        ...formData,
        ingredientes: [...formData.ingredientes, { nombre: ing.nombre, cantidad, kcal: ing.kcal }]
      });
      setSearchIng("");
    }
  };

  const removeIngrediente = (index: number) => {
    const newIngs = [...formData.ingredientes];
    newIngs.splice(index, 1);
    setFormData({ ...formData, ingredientes: newIngs });
  };

  const addPaso = () => {
    if (nuevoPaso.trim()) {
      setFormData({ ...formData, instrucciones: [...formData.instrucciones, nuevoPaso] });
      setNuevoPaso("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.ingredientes.length === 0) return alert('"Añade ingredientes de la despensa"');
    setLoading(true);
    try {
      const { error } = await recetasQueries.create(formData as unknown as NuevaReceta);
      if (error) throw error;
      onSuccess();
    } catch (err) {
      console.error('"Error:"', err);
      alert('"Error al guardar"');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[40px] shadow-2xl overflow-y-auto relative border border-primary/20 p-10"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-primary/40 hover:text-primary transition-colors">
          <X size={24} />
        </button>

        <form onSubmit={handleSubmit}>
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-8 text-primary italic">"Nueva"<span className="text-primary/30">"Receta"</span></h2>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-black uppercase opacity-60 ml-2 text-primary tracking-widest">"Nombre del plato"</label>
                <input required className="w-full bg-slate-50 border border-primary/10 rounded-2xl p-4 text-[11px] font-bold uppercase outline-none text-primary focus:border-primary/40 transition-colors" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase opacity-60 ml-2 text-primary tracking-widest">"Categoría"</label>
                <select className="w-full bg-slate-50 border border-primary/10 rounded-2xl p-4 text-[11px] font-bold uppercase outline-none text-primary cursor-pointer" value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value as any})}>
                  <option value="General">"General"</option>
                  <option value="Postres">"Postres"</option>
                  <option value="Almuerzos">"Almuerzos"</option>
                  <option value="Desayunos">"Desayunos"</option>
                </select>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-[30px] border border-primary/10">
              <h3 className="text-[10px] font-black uppercase text-primary mb-4 flex items-center gap-2">
                <Utensils size={14} /> "Ingredientes de tu Despensa"
              </h3>
              <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/40" size={14} />
                <input type="text" placeholder='"BUSCAR EN MI DESPENSA..."' className="w-full bg-white border border-primary/10 rounded-xl py-3 pl-10 pr-4 text-[10px] font-bold uppercase outline-none text-primary focus:border-primary/40 transition-colors" value={searchIng} onChange={(e) => setSearchIng(e.target.value)} />
                {filteredDbIngredientes.length > 0 && (
                  <div className="absolute top-full left-0 w-full bg-white shadow-2xl rounded-xl mt-2 border border-primary/10 z-20 overflow-hidden">
                    {filteredDbIngredientes.map(ing => (
                      <button key={ing.id} type="button" onClick={() => addIngrediente(ing)} className="w-full p-4 text-left text-[10px] font-bold uppercase hover:bg-primary hover:text-white flex justify-between items-center transition-all">
                        <span>{ing.nombre}</span>
                        <Plus size={12} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.ingredientes.map((ing, idx) => (
                  <div key={idx} className="bg-primary text-white px-3 py-2 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 shadow-md">
                    <span>{ing.nombre} ({ing.cantidad})</span>
                    <button type="button" onClick={() => removeIngrediente(idx)} className="hover:scale-110 transition-transform"><X size={12} /></button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[9px] font-black uppercase opacity-60 ml-2 text-primary tracking-widest">"Pasos de Preparación"</label>
              <div className="flex gap-2 mb-3">
                <input className="flex-1 bg-slate-50 border border-primary/10 rounded-2xl p-4 text-[11px] font-bold uppercase outline-none text-primary focus:border-primary/40" value={nuevoPaso} onChange={e => setNuevoPaso(e.target.value)} placeholder='"Añadir un paso..."' />
                <button type="button" onClick={addPaso} className="p-4 bg-primary text-white rounded-2xl hover:brightness-110 shadow-lg shadow-primary/20"><Plus size={20} /></button>
              </div>
              <div className="space-y-2">
                {formData.instrucciones.map((paso, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white border border-primary/10 p-4 rounded-xl shadow-sm">
                    <span className="text-[10px] font-bold uppercase text-primary leading-tight">{idx + 1}. {paso}</span>
                    <button type="button" onClick={() => {
                       const n = [...formData.instrucciones];
                       n.splice(idx, 1);
                       setFormData({...formData, instrucciones: n});
                    }} className="text-red-500 hover:scale-110 transition-transform"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button disabled={loading} type="submit" className="w-full mt-10 p-5 bg-primary text-white rounded-3xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-xl shadow-primary/30 transition-all disabled:opacity-50">
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
      <div className="absolute top-4 left-4 px-3 py-1 bg-white rounded-full text-[9px] font-black uppercase text-primary border border-primary/10 shadow-sm">
        {receta.categoria}
      </div>
    </div>
    <div className="p-6 text-center">
      <h3 className="text-lg font-black uppercase tracking-tight text-primary mb-2 italic">"{receta.nombre}"</h3>
      <div className="flex items-center justify-center gap-4 text-primary/40 mb-6">
        <div className="flex items-center gap-1 text-[10px] font-bold"><Clock size={12} /> {receta.tiempo}</div>
        <div className="flex items-center gap-1 text-[10px] font-bold text-primary/60"><ChefHat size={12} /> {receta.dificultad}</div>
      </div>
      <Link href={`/personal/cocina/recetas/${receta.id}`} className="flex items-center justify-between w-full p-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-primary/10">
        "Ver Preparación" <ChevronRight size={14} />
      </Link>
    </div>
  </motion.div>
);

export default RecetasPage;