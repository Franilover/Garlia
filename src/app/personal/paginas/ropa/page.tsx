"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trash2, Save, Layers, X,
  CheckCircle2, Loader2, Shirt
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";

// --- TIPOS ---
type Categoria = "Superior" | "Inferior" | "Calzado" | "Accesorios";

interface Prenda {
  id: string;
  nombre: string;
  categoria: Categoria;
  imagen_url: string; 
}

export default function ArmarioCanvasPage() {
  // 1. Cargamos ropa (usa ropaQueries.getAll internamente)
  const { 
    data: prendas = [], 
    loading: loadingRopa 
  } = useSupabaseData<Prenda>("ropa", {
    order: { campo: "created_at", asc: false }
  });

  // 2. Cargamos outfits (usa ropaQueries.getAll internamente)
  const { 
    data: outfitsGuardados = [], 
    loading: loadingOutfits,
    addRow, 
    deleteRow,
    refetch: refetchOutfits 
  } = useSupabaseData("ropa_outfits", {
    order: { campo: "created_at", asc: false }
  });

  const [selectedPrendas, setSelectedPrendas] = useState<Prenda[]>([]);
  const [nombreOutfit, setNombreOutfit] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const togglePrendaEnCanvas = (prenda: Prenda) => {
    if (selectedPrendas.find(p => p.id === prenda.id)) {
      setSelectedPrendas(selectedPrendas.filter(p => p.id !== prenda.id));
    } else {
      setSelectedPrendas([...selectedPrendas, prenda]);
    }
  };

  const guardarOutfit = async () => {
    if (selectedPrendas.length === 0 || !nombreOutfit) return;
    setIsSaving(true);
    
    // IMPORTANTE: addRow usará ropaQueries.create e inyectará tu user_id automáticamente
    const { error } = await addRow({
      nombre: nombreOutfit,
      prendas: selectedPrendas, // Se guarda como JSONB en la tabla
    });

    if (!error) {
      setSelectedPrendas([]);
      setNombreOutfit("");
      await refetchOutfits(); 
    }
    setIsSaving(false);
  };

  const borrarOutfit = async (id: string) => {
    // deleteRow usará ropaQueries.delete y filtrará por tu user_id
    await deleteRow(id);
  };

  if (loadingRopa || loadingOutfits) return (
    <div className="h-screen flex items-center justify-center bg-bg-main">
      <Loader2 className="animate-spin text-primary/20" size={40} />
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-bg-main">
      
      {/* --- SECCIÓN IZQUIERDA: GALERÍA DE ROPA --- */}
      <main className="w-full md:w-2/3 p-6 md:p-10 overflow-y-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-black uppercase tracking-tighter text-primary italic">
            Armario <span className="text-primary/10 italic">Real</span>
          </h1>
          <p className="text-primary/40 text-[10px] font-black uppercase tracking-widest mt-2">
            Prendas disponibles: {prendas.length}
          </p>
        </header>

        {prendas.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-primary/5 rounded-4xl">
            <Shirt className="text-primary/10 mb-4" size={48} />
            <p className="text-[10px] font-black uppercase text-primary/20">La tabla "ropa" no devuelve datos para Franilover</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {prendas.map((prenda: Prenda) => {
              const estaSeleccionada = selectedPrendas.find(p => p.id === prenda.id);
              return (
                <motion.button
                  key={prenda.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => togglePrendaEnCanvas(prenda)}
                  className={cn(
                    "relative aspect-3/4 rounded-3xl border-2 transition-all overflow-hidden bg-white",
                    estaSeleccionada ? "border-primary shadow-xl" : "border-primary/5 hover:border-primary/20"
                  )}
                >
                  <div className="absolute inset-0 bg-primary/5 flex items-center justify-center">
                    {prenda.imagen_url ? (
                      <img
                        src={prenda.imagen_url}
                        alt={prenda.nombre}
                        className={cn(
                          "w-full h-full object-cover transition-transform duration-500",
                          estaSeleccionada ? "opacity-40 scale-110" : "opacity-100"
                        )}
                      />
                    ) : (
                      <Shirt className="text-primary/10" size={32} />
                    )}
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-4 bg-linear-to-t from-black/80 to-transparent">
                    <p className="text-[9px] font-black text-white uppercase truncate">{prenda.nombre}</p>
                    <p className="text-[7px] font-bold text-white/40 uppercase tracking-widest">{prenda.categoria}</p>
                  </div>

                  {estaSeleccionada && (
                    <div className="absolute top-3 right-3 bg-primary text-white p-1.5 rounded-full shadow-lg">
                      <CheckCircle2 size={12} />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </main>

      {/* --- SECCIÓN DERECHA: CONSTRUCTOR --- */}
      <aside className="w-full md:w-1/3 bg-white border-l border-primary/10 p-6 md:p-8 flex flex-col gap-6 sticky top-0 h-screen overflow-y-auto shadow-2xl">
        <div className="flex items-center gap-2 text-primary border-b border-primary/5 pb-4">
          <Layers size={18} />
          <h2 className="text-xs font-black uppercase tracking-widest">Constructor</h2>
        </div>

        <div className="grow flex flex-col gap-3 min-h-40 p-4 bg-primary/5 rounded-4xl border-2 border-dashed border-primary/10">
          <AnimatePresence mode="popLayout">
            {selectedPrendas.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center opacity-20 py-10 px-4">
                <p className="text-[9px] font-black uppercase leading-relaxed tracking-widest">Selecciona ropa para crear el conjunto</p>
              </div>
            ) : (
              selectedPrendas.map((p) => (
                <motion.div 
                  key={p.id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-primary/5"
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-slate-50">
                    <img src={p.imagen_url} className="w-full h-full object-cover" />
                  </div>
                  <span className="grow text-[9px] font-black uppercase text-primary truncate">{p.nombre}</span>
                  <button onClick={() => togglePrendaEnCanvas(p)} className="p-2 text-primary/20 hover:text-red-500 transition-colors">
                    <X size={14} />
                  </button>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {selectedPrendas.length > 0 && (
          <div className="flex flex-col gap-3">
            <input 
              type="text" placeholder="NOMBRE DEL LOOK..." value={nombreOutfit}
              onChange={(e) => setNombreOutfit(e.target.value.toUpperCase())}
              className="bg-primary/5 border-none rounded-2xl p-4 text-[10px] font-black text-primary outline-none"
            />
            <button 
              onClick={guardarOutfit} disabled={!nombreOutfit || isSaving}
              className="w-full bg-primary text-white p-4 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-30"
            >
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} 
              Guardar Look
            </button>
          </div>
        )}

        <div className="mt-4 border-t border-primary/5 pt-6">
          <h3 className="text-[8px] font-black text-primary/30 uppercase tracking-[0.3em] mb-4">Colección Guardada</h3>
          <div className="space-y-3">
            {outfitsGuardados.map((o: any) => (
              <div key={o.id} className="group p-4 bg-white border border-primary/5 rounded-3xl hover:border-primary/20 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[9px] font-black uppercase text-primary">{o.nombre}</p>
                  <button onClick={() => borrarOutfit(o.id)} className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-all">
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="flex -space-x-2">
                  {Array.isArray(o.prendas) && o.prendas.map((pr: any, i: number) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-slate-100 shadow-sm">
                      <img src={pr.imagen_url} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}