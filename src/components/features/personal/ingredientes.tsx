"use client";
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { Ingrediente } from "@/lib/types/cocina";
import { Search, Plus, Zap, ChevronLeft, X, Loader2, Save, Package, PackageX, Minus } from "lucide-react";
import Link from "next/link";

export const IngredientesPage = () => {
  const [filter, setFilter] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "in-stock" | "out-of-stock">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre: "",
    categoria: "Verduras",
    kcal: 0,
    proteinas: 0,
    carbohidratos: 0,
    grasas: 0,
    porcion_texto: "100g",
    stock_actual: 0,
    fibra: 0,
    sodio: 0,
    agua_ml: 0
  });
  
  const { data: ingredientes, loading, mutate, addRow, updateRow } = useSupabaseData<Ingrediente>("ingredientes");
  
  const filteredItems = useMemo(() => {
    return (ingredientes || []).filter((item) => {
      const matchesSearch = 
        item.nombre?.toLowerCase().includes(filter.toLowerCase()) || 
        item.categoria?.toLowerCase().includes(filter.toLowerCase());
      
      const hasStock = (item.stock_actual || 0) > 0;
      const matchesStock = stockFilter === "all" ? true : stockFilter === "in-stock" ? hasStock : !hasStock;
      return matchesSearch && matchesStock;
    });
  }, [ingredientes, filter, stockFilter]);
  
  const handleUpdateStock = async (id: string, current: number, delta: number) => {
    const newStock = Math.max(0, current + delta);
    if (updateRow) {
      const result = await updateRow(id, { stock_actual: newStock });
      if (!result.error) {
        mutate();
      }
    }
  };
  
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const result = await addRow(formData);
      
      if (result.error) {
        console.error("❌ Error del servidor:", result.error);
        alert(`Error al guardar: ${result.error}`);
      } else {
        setIsModalOpen(false);
        setFormData({ 
          nombre: "", 
          categoria: "Verduras", 
          kcal: 0, 
          proteinas: 0, 
          carbohidratos: 0, 
          grasas: 0, 
          porcion_texto: "100g", 
          stock_actual: 0, 
          fibra: 0, 
          sodio: 0, 
          agua_ml: 0
        });
        await mutate();
      }
    } catch (err) {
      console.error("💥 Error inesperado:", err);
      alert(`Error inesperado: ${err}`);
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-bg-main pb-24 text-primary">
      <header className="pt-10 pb-6 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 text-primary/40 mb-2 font-black uppercase tracking-widest text-[10px]">
              <Link href="/wiki/cocina" className="flex items-center gap-1 hover:text-primary transition-colors">
                <ChevronLeft size={14} /> Cocina
              </Link>
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tighter italic">
              MI <span className="text-primary/20">DESPENSA</span>
            </h1>
          </motion.div>
          
          <div className="flex bg-white rounded-2xl p-1 border-2 border-primary/5 self-start md:self-auto">
            {(["all", "in-stock", "out-of-stock"] as const).map((f) => (
              <button 
                key={f}
                onClick={() => setStockFilter(f)}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${stockFilter === f ? "bg-primary text-white" : "text-primary/40"}`}
              >
                {f === "all" ? "Todos" : f === "in-stock" ? "Stock" : "Agotado"}
              </button>
            ))}
          </div>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30" size={16} />
            <input 
              placeholder="BUSCAR..." 
              className="w-full bg-white border-2 border-primary/5 rounded-2xl py-3 pl-12 text-[10px] font-bold uppercase text-primary outline-none"
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </div>
      </header>
      
      <main className="px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.button 
            whileHover={{ scale: 1.01 }} 
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsModalOpen(true)}
            className="border-2 border-dashed border-primary/10 rounded-[35px] flex flex-col items-center justify-center p-8 bg-white/40 hover:bg-white transition-all group min-h-40"
          >
            <div className="p-3 bg-primary text-white rounded-full shadow-lg group-hover:scale-110 transition-transform">
              <Plus size={20} />
            </div>
            <span className="text-[9px] font-black uppercase mt-3 text-primary/40 tracking-widest">
              Añadir Insumo
            </span>
          </motion.button>
          
          <AnimatePresence mode="popLayout">
            {loading ? (
              <div key="loader" className="col-span-full flex justify-center py-20">
                <Loader2 className="animate-spin text-primary/20" size={40}/>
              </div>
            ) : (
              filteredItems.map((item) => (
                <motion.div 
                  key={item.id} 
                  layout 
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white border border-primary/5 rounded-[35px] p-5 shadow-sm hover:shadow-xl transition-all relative overflow-hidden"
                >
                  <div className="flex justify-between mb-4">
                    <span className="text-[8px] font-black uppercase px-3 py-1 bg-primary/5 text-primary/60 rounded-full">
                      {item.categoria}
                    </span>
                    <div className="w-2 h-2 rounded-full bg-primary/10" />
                  </div>
                  
                  <h3 className="text-sm font-black uppercase mb-1 italic tracking-tight">
                    {item.nombre}
                  </h3>
                  <p className="text-[8px] font-bold text-primary/20 uppercase tracking-widest mb-3">
                    {item.porcion_texto}
                  </p>
                  
                  <div className={`mb-4 rounded-2xl p-3 flex items-center justify-between transition-colors ${item.stock_actual > 0 ? "bg-green-500/5" : "bg-red-500/5"}`}>
                    <div className="flex items-center gap-2">
                      {item.stock_actual > 0 ? (
                        <Package className="text-green-600" size={14}/>
                      ) : (
                        <PackageX className="text-red-600" size={14}/>
                      )}
                      <span className={`text-[10px] font-black uppercase ${item.stock_actual > 0 ? "text-green-700" : "text-red-700"}`}>
                        Stock: {item.stock_actual}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleUpdateStock(item.id, item.stock_actual, -1)} 
                        className="p-1.5 bg-white rounded-lg border border-primary/5 text-primary/40 hover:text-red-500 transition-colors"
                      >
                        <Minus size={12}/>
                      </button>
                      <button 
                        onClick={() => handleUpdateStock(item.id, item.stock_actual, 1)} 
                        className="p-1.5 bg-white rounded-lg border border-primary/5 text-primary/40 hover:text-green-500 transition-colors"
                      >
                        <Plus size={12}/>
                      </button>
                    </div>
                  </div>
                  
                  {/* MACRONUTRIENTES */}
                  <div className="grid grid-cols-3 gap-2 border-t border-primary/5 pt-4">
                    <div className="text-center">
                      <span className="block text-[7px] font-black text-primary/20 uppercase">Prot</span>
                      <span className="text-xs font-black">{item.proteinas}g</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-[7px] font-black text-primary/20 uppercase">Carb</span>
                      <span className="text-xs font-black">{item.carbohidratos}g</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-[7px] font-black text-primary/20 uppercase">Gras</span>
                      <span className="text-xs font-black">{item.grasas}g</span>
                    </div>
                  </div>
                  
                  {/* MICRONUTRIENTES - MISMO ESTILO */}
                  {(item.fibra > 0 || item.sodio > 0 || item.agua_ml > 0) && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div className="text-center">
                        <span className="block text-[7px] font-black text-primary/20 uppercase">Fibra</span>
                        <span className="text-xs font-black">{item.fibra || 0}g</span>
                      </div>
                      <div className="text-center">
                        <span className="block text-[7px] font-black text-primary/20 uppercase">Sodio</span>
                        <span className="text-xs font-black">{item.sodio || 0}mg</span>
                      </div>
                      <div className="text-center">
                        <span className="block text-[7px] font-black text-primary/20 uppercase">Agua</span>
                        <span className="text-xs font-black">{item.agua_ml || 0}ml</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4 flex items-center justify-center gap-2 py-2 bg-primary text-white rounded-2xl">
                    <Zap size={10} className="fill-current"/>
                    <span className="text-[9px] font-black tracking-widest uppercase">
                      {item.kcal} Kcal
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </main>
      
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsModalOpen(false)} 
              className="absolute inset-0 bg-primary/30 backdrop-blur-md" 
            />
            
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[45px] p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black italic uppercase">
                  NUEVO <span className="text-primary/20">INSUMO</span>
                </h2>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="text-primary/20 hover:text-primary"
                >
                  <X size={24}/>
                </button>
              </div>
              
              <form onSubmit={handleSave} className="space-y-6">
                {/* INFORMACIÓN BÁSICA */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase text-primary/40 tracking-widest">
                    Información Básica
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-primary/30 ml-4">
                        Nombre *
                      </label>
                      <input 
                        required 
                        className="w-full bg-primary/5 border-none rounded-2xl py-4 px-6 text-xs font-bold text-primary outline-none" 
                        value={formData.nombre} 
                        onChange={(e) => setFormData({...formData, nombre: e.target.value})} 
                        placeholder="Ej: Tomate, Pollo, Arroz..."
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-primary/30 ml-4">
                        Categoría
                      </label>
                      <select 
                        className="w-full bg-primary/5 border-none rounded-2xl py-4 px-6 text-xs font-bold text-primary outline-none appearance-none"
                        value={formData.categoria} 
                        onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                      >
                        <option value="Proteínas">Proteínas</option>
                        <option value="Carbohidratos">Carbohidratos</option>
                        <option value="Grasas">Grasas</option>
                        <option value="Verduras">Verduras</option>
                        <option value="Frutas">Frutas</option>
                        <option value="Lácteos">Lácteos</option>
                        <option value="Superfoods">Superfoods</option>
                        <option value="Cereales">Cereales</option>
                      </select>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-primary/30 ml-4">
                        Porción
                      </label>
                      <input 
                        type="text"
                        className="w-full bg-primary/5 border-none rounded-2xl py-4 px-6 text-xs font-bold text-primary outline-none" 
                        value={formData.porcion_texto} 
                        onChange={(e) => setFormData({...formData, porcion_texto: e.target.value})} 
                        placeholder="100g"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-primary/30 ml-4">
                        Stock Inicial
                      </label>
                      <input 
                        type="number" 
                        min="0"
                        className="w-full bg-primary/5 border-none rounded-2xl py-4 px-6 text-xs font-bold text-primary outline-none" 
                        value={formData.stock_actual} 
                        onChange={(e) => setFormData({...formData, stock_actual: Number(e.target.value)})} 
                      />
                    </div>
                  </div>
                </div>
                
                {/* MACRONUTRIENTES */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase text-primary/40 tracking-widest">
                    Macronutrientes (por porción)
                  </h3>
                  
                  <div className="bg-primary/5 rounded-[30px] p-6 grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[7px] font-black uppercase text-primary/30 ml-2">
                        Calorías (kcal)
                      </span>
                      <input 
                        type="number" 
                        min="0"
                        step="0.1"
                        className="w-full bg-white rounded-xl py-2 px-4 text-xs font-bold text-primary outline-none" 
                        value={formData.kcal} 
                        onChange={(e) => setFormData({...formData, kcal: Number(e.target.value)})}
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <span className="text-[7px] font-black uppercase text-primary/30 ml-2">
                        Proteínas (g)
                      </span>
                      <input 
                        type="number" 
                        min="0"
                        step="0.1"
                        className="w-full bg-white rounded-xl py-2 px-4 text-xs font-bold text-primary outline-none" 
                        value={formData.proteinas} 
                        onChange={(e) => setFormData({...formData, proteinas: Number(e.target.value)})}
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <span className="text-[7px] font-black uppercase text-primary/30 ml-2">
                        Carbohidratos (g)
                      </span>
                      <input 
                        type="number" 
                        min="0"
                        step="0.1"
                        className="w-full bg-white rounded-xl py-2 px-4 text-xs font-bold text-primary outline-none" 
                        value={formData.carbohidratos} 
                        onChange={(e) => setFormData({...formData, carbohidratos: Number(e.target.value)})}
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <span className="text-[7px] font-black uppercase text-primary/30 ml-2">
                        Grasas (g)
                      </span>
                      <input 
                        type="number" 
                        min="0"
                        step="0.1"
                        className="w-full bg-white rounded-xl py-2 px-4 text-xs font-bold text-primary outline-none" 
                        value={formData.grasas} 
                        onChange={(e) => setFormData({...formData, grasas: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                </div>
                
                {/* MICRONUTRIENTES */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase text-primary/40 tracking-widest">
                    Micronutrientes (opcional)
                  </h3>
                  
                  <div className="bg-primary/5 rounded-[30px] p-6 grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <span className="text-[7px] font-black uppercase text-primary/30 ml-2">
                        Fibra (g)
                      </span>
                      <input 
                        type="number" 
                        min="0"
                        step="0.1"
                        className="w-full bg-white rounded-xl py-2 px-4 text-xs font-bold text-primary outline-none" 
                        value={formData.fibra} 
                        onChange={(e) => setFormData({...formData, fibra: Number(e.target.value)})}
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <span className="text-[7px] font-black uppercase text-primary/30 ml-2">
                        Sodio (mg)
                      </span>
                      <input 
                        type="number" 
                        min="0"
                        step="1"
                        className="w-full bg-white rounded-xl py-2 px-4 text-xs font-bold text-primary outline-none" 
                        value={formData.sodio} 
                        onChange={(e) => setFormData({...formData, sodio: Number(e.target.value)})}
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <span className="text-[7px] font-black uppercase text-primary/30 ml-2">
                        Agua (ml)
                      </span>
                      <input 
                        type="number" 
                        min="0"
                        step="1"
                        className="w-full bg-white rounded-xl py-2 px-4 text-xs font-bold text-primary outline-none" 
                        value={formData.agua_ml} 
                        onChange={(e) => setFormData({...formData, agua_ml: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                </div>
                
                <button 
                  disabled={isSaving} 
                  type="submit" 
                  className="w-full bg-primary text-white py-5 rounded-[25px] font-black uppercase text-[11px] tracking-[0.3em] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                >
                  {isSaving ? (
                    <Loader2 className="animate-spin" size={18}/>
                  ) : (
                    <Save size={18}/>
                  )}
                  REGISTRAR INSUMO
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};