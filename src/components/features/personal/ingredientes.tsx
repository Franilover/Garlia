"use client";
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { Ingrediente } from "@/lib/types/cocina";
import { supabase } from "@/lib/supabase";
import {
  Search,
  Plus,
  Zap,
  ChevronLeft,
  Filter,
  X,
  Loader2,
  Save
} from "lucide-react";
import Link from "next/link";

export const IngredientesPage = () => {
  const [filter, setFilter] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Estado para el nuevo ingrediente
  const [formData, setFormData] = useState({
    nombre: "",
    categoria: "Verduras",
    precio: 0,
    kcal: 0,
    proteinas: 0,
    carbohidratos: 0,
    grasas: 0,
    porcion_texto: "100g"
  });

  const { data: ingredientes, loading, mutate } = useSupabaseData<Ingrediente>("ingredientes");

  // CATEGORÍAS DINÁMICAS
  const categoriasDinamicas = useMemo(() => {
    const base = ["Todos"];
    if (!ingredientes) return base;
    const catsEnData = Array.from(new Set(ingredientes.map(i => i.categoria)));
    return [...base, ...catsEnData.filter(c => c && c.trim() !== "")];
  }, [ingredientes]);

  // LÓGICA DE FILTRADO
  const filteredItems = useMemo(() => {
    if (!ingredientes) return [];
    return ingredientes.filter((item) => {
      const nombreMatches = item.nombre.toLowerCase().includes(filter.toLowerCase());
      const categoriaMatches = item.categoria.toLowerCase().includes(filter.toLowerCase());
      const matchesSearch = nombreMatches || categoriaMatches;
      const matchesCategory = selectedCategory === "Todos" || item.categoria === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [ingredientes, filter, selectedCategory]);

  // FUNCIÓN PARA GUARDAR EN SUPABASE
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("ingredientes")
        .insert([formData]);

      if (error) throw error;

      // Resetear y cerrar
      setFormData({
        nombre: "",
        categoria: "Verduras",
        precio: 0,
        kcal: 0,
        proteinas: 0,
        carbohidratos: 0,
        grasas: 0,
        porcion_texto: "100g"
      });
      setIsModalOpen(false);
      mutate(); // Recarga los datos de la lista
    } catch (error) {
      console.error("Error guardando ingrediente:", error);
      alert("Error al guardar el ingrediente");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-main pb-24">
      {/* --- CABECERA --- */}
      <header className="pt-10 pb-6 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 text-primary/40 mb-2">
              <Link href="/wiki/cocina" className="hover:text-primary transition-colors flex items-center gap-1 text-[10px] font-black uppercase tracking-widest">
                <ChevronLeft size={14} /> Cocina
              </Link>
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-primary italic">
              MI <span className="text-primary/20">DESPENSA</span>
            </h1>
          </motion.div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30" size={16} />
            <input 
              type="text"
              placeholder="BUSCAR INGREDIENTE..."
              className="w-full bg-white border-2 border-primary/5 rounded-2xl py-3 pl-12 pr-4 text-[10px] font-bold uppercase tracking-widest focus:border-primary/20 transition-all outline-none"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-8 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex items-center gap-2 min-w-max">
            <div className="pr-2 text-primary/20"><Filter size={14} /></div>
            {categoriasDinamicas.map((cat) => (
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
                  {cat}
                </span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* --- LISTADO --- */}
      <main className="px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <motion.button 
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsModalOpen(true)}
            className="border-2 border-dashed border-primary/10 rounded-[35px] flex flex-col items-center justify-center p-8 bg-white/40 hover:bg-white transition-all group min-h-[160px]"
          >
            <div className="p-3 bg-primary text-white rounded-full shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
              <Plus size={20} />
            </div>
            <span className="text-[9px] font-black uppercase mt-3 text-primary/40 tracking-widest">Nuevo Insumo</span>
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

      {/* --- MODAL FORMULARIO --- */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !isSaving && setIsModalOpen(false)}
              className="absolute inset-0 bg-primary/30 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              className="relative bg-white w-full max-w-lg rounded-[45px] p-8 shadow-2xl border border-primary/5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black italic uppercase text-primary">Añadir <span className="text-primary/20">Insumo</span></h2>
                <button onClick={() => setIsModalOpen(false)} className="text-primary/20 hover:text-primary transition-colors"><X size={24}/></button>
              </div>
              
              <form onSubmit={handleSave} className="space-y-5">
                {/* Nombre e Insumo */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/30 ml-4">Nombre del Ingrediente</label>
                  <input 
                    required
                    className="w-full bg-primary/5 border-none rounded-2xl py-4 px-6 text-xs font-bold uppercase tracking-widest focus:ring-2 ring-primary/20 outline-none"
                    placeholder="Ejem: Lentejas Rojas"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/30 ml-4">Categoría</label>
                    <select 
                      className="w-full bg-primary/5 border-none rounded-2xl py-4 px-6 text-[10px] font-black uppercase tracking-widest outline-none appearance-none"
                      value={formData.categoria}
                      onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                    >
                      <option value="Verduras">Verduras</option>
                      <option value="Proteínas">Proteínas</option>
                      <option value="Cereales">Cereales</option>
                      <option value="Frutas">Frutas</option>
                      <option value="Lácteos">Lácteos</option>
                      <option value="Superfoods">Superfoods</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/30 ml-4">Precio ($)</label>
                    <input 
                      type="number"
                      className="w-full bg-primary/5 border-none rounded-2xl py-4 px-6 text-xs font-bold outline-none"
                      value={formData.precio}
                      onChange={(e) => setFormData({...formData, precio: Number(e.target.value)})}
                    />
                  </div>
                </div>

                {/* Macros Grid */}
                <div className="bg-primary/5 rounded-[30px] p-6 grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[7px] font-black uppercase text-primary/40 tracking-widest">Calorías (kcal)</label>
                    <input type="number" className="w-full bg-white rounded-xl py-2 px-4 text-xs font-bold" value={formData.kcal} onChange={(e) => setFormData({...formData, kcal: Number(e.target.value)})}/>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[7px] font-black uppercase text-primary/40 tracking-widest">Proteínas (g)</label>
                    <input type="number" className="w-full bg-white rounded-xl py-2 px-4 text-xs font-bold" value={formData.proteinas} onChange={(e) => setFormData({...formData, proteinas: Number(e.target.value)})}/>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[7px] font-black uppercase text-primary/40 tracking-widest">Carbos (g)</label>
                    <input type="number" className="w-full bg-white rounded-xl py-2 px-4 text-xs font-bold" value={formData.carbohidratos} onChange={(e) => setFormData({...formData, carbohidratos: Number(e.target.value)})}/>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[7px] font-black uppercase text-primary/40 tracking-widest">Grasas (g)</label>
                    <input type="number" className="w-full bg-white rounded-xl py-2 px-4 text-xs font-bold" value={formData.grasas} onChange={(e) => setFormData({...formData, grasas: Number(e.target.value)})}/>
                  </div>
                </div>

                <button 
                  disabled={isSaving}
                  type="submit"
                  className="w-full bg-primary text-white py-5 rounded-[25px] font-black uppercase text-[11px] tracking-[0.3em] shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                  {isSaving ? "Guardando..." : "Registrar Insumo"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* --- CARD DE INGREDIENTE --- */
const IngredientCard = ({ item, index }: { item: Ingrediente; index: number }) => {
  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      "Proteínas": "bg-red-500/10 text-red-600",
      "Frutas": "bg-orange-500/10 text-orange-600",
      "Lácteos": "bg-blue-500/10 text-blue-600",
      "Cereales": "bg-amber-500/10 text-amber-600",
      "Verduras": "bg-green-500/10 text-green-600",
      "Superfoods": "bg-teal-500/10 text-teal-600",
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
        {item.nombre}
      </h3>
      <p className="text-[9px] font-bold text-primary/30 uppercase mb-5 tracking-widest">
        {item.porcion_texto}
      </p>

      <div className="grid grid-cols-3 gap-1.5 border-t border-primary/5 pt-4">
        <div className="text-center">
          <span className="block text-[7px] font-black text-primary/20 uppercase">Prot</span>
          <span className="text-[11px] font-black text-primary">{item.proteinas}g</span>
        </div>
        <div className="text-center">
          <span className="block text-[7px] font-black text-primary/20 uppercase">Carb</span>
          <span className="text-[11px] font-black text-primary">{item.carbohidratos}g</span>
        </div>
        <div className="text-center">
          <span className="block text-[7px] font-black text-primary/20 uppercase">Gras</span>
          <span className="text-[11px] font-black text-primary">{item.grasas}g</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-1.5 py-2 bg-primary text-white rounded-2xl shadow-lg shadow-primary/10">
        <Zap size={10} className="fill-current" />
        <span className="text-[9px] font-black tracking-widest uppercase">{item.kcal} Kcal</span>
      </div>
    </motion.div>
  );
};

export default IngredientesPage;