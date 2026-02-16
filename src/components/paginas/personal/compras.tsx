"use client";
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { Precio, Ingrediente } from "@/lib/types/cocina";
import { 
  Search, Plus, ChevronLeft, X, Loader2, Save, 
  DollarSign, Calendar, Tag, Trash2 
} from "lucide-react";
import Link from "next/link";

const ComprasPage = () => {
  const [filter, setFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Cargamos los precios y los ingredientes para el selector
  const { data: precios, loading, mutate, addRow, deleteRow } = useSupabaseData<Precio>("precios");
  const { data: ingredientes } = useSupabaseData<Ingrediente>("ingredientes");

  const [formData, setFormData] = useState({
    ingrediente_id: "",
    monto_pagado: 0,
  });

  const filteredItems = useMemo(() => {
    return (precios || []).filter((p) => {
      const nombre = p.ingredientes?.nombre.toLowerCase() || "";
      return nombre.includes(filter.toLowerCase());
    });
  }, [precios, filter]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ingrediente_id) return;
    setIsSaving(true);
    
    const { error } = await addRow(formData);
    
    if (!error) {
      setIsModalOpen(false);
      setFormData({ ingrediente_id: "", monto_pagado: 0 });
      mutate();
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Borrar este registro de compra?") && deleteRow) {
      await deleteRow(id);
      mutate();
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
              HISTORIAL <span className="text-primary/20">COMPRAS</span>
            </h1>
          </motion.div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30" size={16} />
            <input 
              placeholder="BUSCAR PRODUCTO..." 
              className="w-full bg-white border-2 border-primary/5 rounded-2xl py-3 pl-12 text-[10px] font-bold uppercase text-primary outline-none"
              value={filter} onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </div>
      </header>

      <main className="px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.button 
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
            onClick={() => setIsModalOpen(true)}
            className="border-2 border-dashed border-primary/10 rounded-[35px] flex flex-col items-center justify-center p-8 bg-white/40 hover:bg-white transition-all group min-h-40"
          >
            <div className="p-3 bg-primary text-white rounded-full shadow-lg group-hover:scale-110 transition-transform"><Plus size={20} /></div>
            <span className="text-[9px] font-black uppercase mt-3 text-primary/40 tracking-widest">Nuevo Gasto</span>
          </motion.button>

          <AnimatePresence mode="popLayout">
            {loading ? (
               <div key="loader" className="col-span-full flex justify-center py-20"><Loader2 className="animate-spin text-primary/20" size={40}/></div>
            ) : (
              filteredItems.map((compra) => (
                <motion.div 
                  key={compra.id} 
                  layout 
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white border border-primary/5 rounded-[35px] p-6 shadow-sm hover:shadow-xl transition-all group relative"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-primary/5 rounded-xl text-primary/40 group-hover:text-primary transition-colors">
                      <Tag size={16}/>
                    </div>
                    <button onClick={() => handleDelete(compra.id)} className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-600 transition-all">
                      <Trash2 size={14}/>
                    </button>
                  </div>

                  <h3 className="text-sm font-black uppercase italic tracking-tight mb-1">
                    {compra.ingredientes?.nombre || "Producto eliminado"}
                  </h3>
                  
                  <div className="flex items-center gap-2 text-[10px] font-black text-primary/20 uppercase tracking-widest mb-6">
                    <Calendar size={12}/>
                    {compra.created_at ? new Date(compra.created_at).toLocaleDateString() : "S/F"}
                  </div>

                  <div className="bg-primary text-white rounded-[20px] p-4 flex items-center justify-between shadow-lg shadow-primary/10">
                    <span className="text-[9px] font-black uppercase tracking-widest">Monto</span>
                    <div className="flex items-center gap-0.5">
                      <DollarSign size={14} className="opacity-50"/>
                      <span className="text-lg font-black italic">{compra.monto_pagado}</span>
                    </div>
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-primary/30 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[45px] p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black italic uppercase text-primary">NUEVO <span className="text-primary/20">GASTO</span></h2>
                <button onClick={() => setIsModalOpen(false)} className="text-primary/20 hover:text-primary"><X size={24}/></button>
              </div>
              
              <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-primary/30 ml-4">Seleccionar Insumo</label>
                  <select 
                    required 
                    className="w-full bg-primary/5 border-none rounded-2xl py-4 px-6 text-xs font-bold text-primary outline-none focus:ring-2 ring-primary/20 appearance-none"
                    value={formData.ingrediente_id}
                    onChange={(e) => setFormData({...formData, ingrediente_id: e.target.value})}
                  >
                    <option value="">Elegir de la despensa...</option>
                    {ingredientes?.map(ing => (
                      <option key={ing.id} value={ing.id}>{ing.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-primary/30 ml-4">Precio Pagado ($)</label>
                  <div className="relative">
                    <DollarSign size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-primary/20" />
                    <input 
                      type="number" required
                      className="w-full bg-primary/5 border-none rounded-2xl py-4 pl-12 pr-6 text-sm font-black text-primary outline-none focus:ring-2 ring-primary/20" 
                      value={formData.monto_pagado} 
                      onChange={(e) => setFormData({...formData, monto_pagado: Number(e.target.value)})} 
                    />
                  </div>
                </div>

                <button disabled={isSaving} type="submit" className="w-full bg-primary text-white py-5 rounded-[25px] font-black uppercase text-[11px] tracking-[0.3em] flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-95">
                  {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} GUARDAR REGISTRO
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ComprasPage;