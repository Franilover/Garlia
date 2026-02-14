"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Trash2, Save, 
  Layers, ChevronRight, X,
  CheckCircle2, Loader2, Shirt
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/api/supabase";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { SmartImage } from "@/components/shared/display/SmartImage";

// --- TIPOS ---
type Categoria = "Superior" | "Inferior" | "Calzado" | "Accesorios";

interface Prenda {
  id: string;
  nombre: string;
  categoria: Categoria;
  imagen_url: string;
}

interface OutfitGuardado {
  id: string;
  nombre: string;
  prendas: any; 
  created_at?: string;
}

export default function ArmarioCanvasPage() {
  // 1. CARGA DESDE LA TABLA 'ropa'
  const { data: prendas = [], loading } = useSupabaseData("ropa", {
    order: { campo: "created_at", asc: false }
  });

  // 2. CARGA DE LOOKS DESDE 'ropa_outfits'
  // Cambiamos 'refreshData' por 'refetch' que es lo que devuelve tu hook
  const { data: outfitsGuardados = [], refetch: refetchOutfits } = useSupabaseData("ropa_outfits", {
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

  // 3. GUARDADO REAL EN 'ropa_outfits'
  const guardarOutfit = async () => {
    if (selectedPrendas.length === 0 || !nombreOutfit) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("ropa_outfits")
        .insert([{
          nombre: nombreOutfit,
          prendas: selectedPrendas, 
        }]);

      if (error) throw error;

      setSelectedPrendas([]);
      setNombreOutfit("");
      // Usamos refetch() para actualizar la lista de outfits guardados
      await refetchOutfits(); 
    } catch (err) {
      console.error("Error guardando outfit:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const borrarOutfit = async (id: string) => {
    const { error } = await supabase.from("ropa_outfits").delete().eq("id", id);
    if (!error) await refetchOutfits();
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-bg-main">
      <Loader2 className="animate-spin text-primary/20" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-bg-main flex flex-col md:flex-row">
      
      {/* --- LADO IZQUIERDO: ROPA --- */}
      <div className="w-full md:w-2/3 p-8 overflow-y-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-black uppercase tracking-tighter text-primary italic">
            Armario <span className="text-primary/20">Real</span>
          </h1>
          <p className="text-primary/40 text-[10px] font-black uppercase tracking-widest mt-2">
            Tabla: ropa | Seleccionadas: {selectedPrendas.length}
          </p>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {prendas.map((prenda: Prenda) => {
            const estaSeleccionada = selectedPrendas.find(p => p.id === prenda.id);
            return (
              <motion.button
                key={prenda.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => togglePrendaEnCanvas(prenda)}
                className={cn(
                  "relative group aspect-3/4 rounded-4xl border-2 transition-all overflow-hidden bg-white",
                  estaSeleccionada ? "border-primary shadow-xl" : "border-primary/5"
                )}
              >
                <SmartImage
                  src={prenda.imagen_url}
                  alt={prenda.nombre}
                  className={cn(
                    "w-full h-full object-cover transition-transform duration-700 group-hover:scale-110",
                    estaSeleccionada ? "scale-105 opacity-50" : ""
                  )}
                />
                
                <div className="absolute inset-0 p-4 flex flex-col justify-end bg-linear-to-t from-black/80 via-black/20 to-transparent">
                  <span className="text-[10px] font-black uppercase text-white leading-tight">{prenda.nombre}</span>
                  <span className="text-[7px] font-bold text-white/50 uppercase tracking-widest">{prenda.categoria}</span>
                </div>

                {estaSeleccionada && (
                  <div className="absolute top-4 right-4 bg-primary text-white p-2 rounded-full">
                    <CheckCircle2 size={14} />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* --- LADO DERECHO: ROPA_OUTFITS --- */}
      <div className="w-full md:w-1/3 bg-white border-l border-primary/10 p-8 flex flex-col gap-6">
        <div className="flex items-center gap-2 text-primary">
          <Layers size={20} />
          <h2 className="text-sm font-black uppercase tracking-widest">Constructor de Looks</h2>
        </div>

        <div className="grow flex flex-col gap-3 min-h-62.5 p-4 bg-primary/5 rounded-[40px] border-2 border-dashed border-primary/10 overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {selectedPrendas.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center opacity-20 p-10">
                <p className="text-[10px] font-black uppercase tracking-widest italic">Toca tu ropa para combinar</p>
              </div>
            ) : (
              selectedPrendas.map((p) => (
                <motion.div 
                  key={p.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-primary/5"
                >
                  <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
                    <img src={p.imagen_url} className="w-full h-full object-cover" />
                  </div>
                  <div className="grow">
                    <span className="block text-[9px] font-black uppercase text-primary leading-none">{p.nombre}</span>
                  </div>
                  <button onClick={() => togglePrendaEnCanvas(p)} className="text-primary/20 hover:text-red-500 transition-colors">
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
              type="text" placeholder="NOMBRE DEL OUTFIT..." value={nombreOutfit}
              onChange={(e) => setNombreOutfit(e.target.value.toUpperCase())}
              className="bg-primary/5 border-none rounded-2xl p-4 text-[10px] font-black text-primary placeholder:text-primary/20 outline-none"
            />
            <button 
              onClick={guardarOutfit} disabled={!nombreOutfit || isSaving}
              className="w-full bg-primary text-white p-4 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-3 transition-all active:scale-95"
            >
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} 
              Guardar en ropa_outfits
            </button>
          </div>
        )}

        {/* --- HISTORIAL DE OUTFITS --- */}
        <div className="mt-4">
          <h3 className="text-[9px] font-black text-primary/30 uppercase tracking-[0.2em] mb-4 text-center">Colección Guardada</h3>
          <div className="space-y-3">
            {outfitsGuardados.map((o: any) => (
              <div key={o.id} className="group p-4 bg-white border border-primary/5 rounded-4xl hover:shadow-xl transition-all">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-black uppercase text-primary">{o.nombre}</p>
                  <button onClick={() => borrarOutfit(o.id)} className="opacity-0 group-hover:opacity-100 text-primary/20 hover:text-red-500 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex -space-x-3">
                  {Array.isArray(o.prendas) && o.prendas.map((pr: any, i: number) => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-slate-100 shadow-sm">
                      <img src={pr.imagen_url} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}