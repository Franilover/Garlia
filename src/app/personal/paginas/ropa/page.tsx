"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shirt, Plus, Trash2, Save, 
  Layers, ChevronRight, X,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- TIPOS ---
type Categoria = "Superior" | "Inferior" | "Calzado" | "Accesorios";

interface Prenda {
  id: string;
  nombre: string;
  categoria: Categoria;
  imagen?: string;
}

interface OutfitGuardado {
  id: string;
  nombre: string;
  prendas: Prenda[];
}

export default function ArmarioCanvasPage() {
  const [prendas] = useState<Prenda[]>([
    { id: "1", nombre: "Camiseta Oversize", categoria: "Superior" },
    { id: "2", nombre: "Pantalón Cargo", categoria: "Inferior" },
    { id: "3", nombre: "Jordan 1 Retro", categoria: "Calzado" },
    { id: "4", nombre: "Gorra Vintage", categoria: "Accesorios" },
    { id: "5", nombre: "Hoodie Negro", categoria: "Superior" },
  ]);

  const [selectedPrendas, setSelectedPrendas] = useState<Prenda[]>([]);
  const [outfitsGuardados, setOutfitsGuardados] = useState<OutfitGuardado[]>([]);
  const [nombreOutfit, setNombreOutfit] = useState("");

  // Agregar prenda al canvas (máximo una por categoría si quieres orden)
  const togglePrendaEnCanvas = (prenda: Prenda) => {
    if (selectedPrendas.find(p => p.id === prenda.id)) {
      setSelectedPrendas(selectedPrendas.filter(p => p.id !== prenda.id));
    } else {
      setSelectedPrendas([...selectedPrendas, prenda]);
    }
  };

  const guardarOutfit = () => {
    if (selectedPrendas.length > 0 && nombreOutfit) {
      const nuevo = {
        id: Date.now().toString(),
        nombre: nombreOutfit,
        prendas: [...selectedPrendas]
      };
      setOutfitsGuardados([nuevo, ...outfitsGuardados]);
      setSelectedPrendas([]);
      setNombreOutfit("");
    }
  };

  return (
    <div className="min-h-screen bg-bg-main flex flex-col md:flex-row">
      
      {/* --- LADO IZQUIERDO: INVENTARIO --- */}
      <div className="w-full md:w-2/3 p-8 overflow-y-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-black uppercase tracking-tighter text-primary italic">
            Mi Armario
          </h1>
          <p className="text-primary/40 text-[10px] font-black uppercase tracking-widest mt-2">
            Selecciona prendas para combinar
          </p>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {prendas.map((prenda) => {
            const estaSeleccionada = selectedPrendas.find(p => p.id === prenda.id);
            return (
              <motion.button
                key={prenda.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => togglePrendaEnCanvas(prenda)}
                className={cn(
                  "relative p-6 rounded-[30px] border-2 transition-all text-left",
                  estaSeleccionada 
                    ? "bg-primary border-primary shadow-lg shadow-primary/20" 
                    : "bg-white border-primary/5 hover:border-primary/20"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center mb-4",
                  estaSeleccionada ? "bg-white/20 text-white" : "bg-primary/5 text-primary"
                )}>
                  <Shirt size={20} />
                </div>
                <h4 className={cn("text-xs font-black uppercase tracking-tight", estaSeleccionada ? "text-white" : "text-primary")}>
                  {prenda.nombre}
                </h4>
                <p className={cn("text-[8px] font-bold uppercase", estaSeleccionada ? "text-white/50" : "text-primary/30")}>
                  {prenda.categoria}
                </p>
                {estaSeleccionada && (
                  <div className="absolute top-4 right-4 text-white">
                    <CheckCircle2 size={16} />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* --- LADO DERECHO: CONSTRUCTOR DE LOOKS --- */}
      <div className="w-full md:w-1/3 bg-white border-l border-primary/10 p-8 flex flex-col gap-6 shadow-[-20px_0_50px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-2 text-primary">
          <Layers size={20} />
          <h2 className="text-sm font-black uppercase tracking-widest">Constructor</h2>
        </div>

        <div className="flex-grow flex flex-col gap-3 min-h-[300px] p-4 bg-primary/5 rounded-[40px] border-2 border-dashed border-primary/10">
          <AnimatePresence mode="popLayout">
            {selectedPrendas.length === 0 ? (
              <div className="h-full flex flex-center items-center justify-center text-center opacity-20 p-10">
                <p className="text-[10px] font-black uppercase tracking-widest italic">Selecciona prendas para empezar el conjunto</p>
              </div>
            ) : (
              selectedPrendas.map((p) => (
                <motion.div 
                  key={p.id}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-primary/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center">
                      <ChevronRight size={14} />
                    </div>
                    <span className="text-[10px] font-black uppercase text-primary">{p.nombre}</span>
                  </div>
                  <button onClick={() => togglePrendaEnCanvas(p)} className="text-primary/20 hover:text-red-400 transition-colors">
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
              type="text"
              placeholder="NOMBRE DEL LOOK..."
              value={nombreOutfit}
              onChange={(e) => setNombreOutfit(e.target.value.toUpperCase())}
              className="bg-primary/5 border-none rounded-2xl p-4 text-[10px] font-black text-primary placeholder:text-primary/20 focus:ring-2 focus:ring-primary/20 outline-none"
            />
            <button 
              onClick={guardarOutfit}
              disabled={!nombreOutfit}
              className="w-full bg-primary text-white p-4 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:grayscale"
            >
              <Save size={16} /> Guardar Outfit
            </button>
          </div>
        )}

        {/* --- OUTFITS GUARDADOS --- */}
        <div className="mt-4 overflow-y-auto max-h-[300px]">
          <h3 className="text-[9px] font-black text-primary/30 uppercase tracking-[0.2em] mb-4">Looks Guardados</h3>
          <div className="flex flex-col gap-2">
            {outfitsGuardados.map(o => (
              <div key={o.id} className="group p-4 border border-primary/5 rounded-2xl flex items-center justify-between hover:bg-primary/5 transition-all">
                <div>
                  <p className="text-[10px] font-black uppercase text-primary">{o.nombre}</p>
                  <p className="text-[8px] font-bold text-primary/30 uppercase">{o.prendas.length} prendas</p>
                </div>
                <button 
                  onClick={() => setOutfitsGuardados(outfitsGuardados.filter(item => item.id !== o.id))}
                  className="opacity-0 group-hover:opacity-100 p-2 text-red-300 hover:text-red-500 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}