"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSupabaseData } from "@/hooks/useSupabaseData"; 
import { tareasQueries } from "@/lib/api/queries/tareas";
import { eventosQueries } from "@/lib/api/queries/eventos";
import { 
  CheckSquare, 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Clock, 
  Loader2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

export const GestionPersonal = () => {
  // 1. Datos en tiempo real con caché
  const { 
    data: tareas, 
    loading: tLoading, 
    setData: setTareas 
  } = useSupabaseData<any>("tareas");

  const { 
    data: eventos, 
    loading: eLoading 
  } = useSupabaseData<any>("eventos");

  const [nuevaTarea, setNuevaTarea] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // --- LÓGICA DE TAREAS ---
  const handleAddTarea = async () => {
    if (!nuevaTarea.trim() || isAdding) return;
    setIsAdding(true);
    try {
      const creada = await tareasQueries.add(nuevaTarea);
      setTareas([creada, ...tareas]);
      setNuevaTarea("");
    } catch (err) {
      console.error("Error al añadir tarea:", err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggle = async (id: string, completada: boolean) => {
    try {
      await tareasQueries.updateStatus(id, !completada);
      setTareas(tareas.map((t: any) => t.id === id ? { ...t, completada: !completada } : t));
    } catch (err) {
      console.error("Error al actualizar:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await tareasQueries.delete(id);
      setTareas(tareas.filter((t: any) => t.id !== id));
    } catch (err) {
      console.error("Error al borrar:", err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      {/* --- COLUMNA IZQUIERDA: TAREAS --- */}
      <section className="lg:col-span-5">
        <div className="bg-white border border-primary/10 rounded-[40px] p-6 shadow-xl shadow-primary/5 min-h-[500px] flex flex-col">
          <div className="flex items-center gap-3 mb-8 px-2">
            <CheckSquare className="text-primary" size={20} />
            <h2 className="text-[12px] font-black uppercase tracking-widest text-primary/60">Lista de Pendientes</h2>
          </div>

          {/* Input */}
          <div className="relative mb-8">
            <input 
              type="text" 
              value={nuevaTarea}
              onChange={(e) => setNuevaTarea(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTarea()}
              placeholder="¿Qué hay que hacer?"
              className="w-full bg-primary/5 border-2 border-transparent focus:border-primary/10 focus:bg-white rounded-2xl py-4 px-6 text-sm transition-all outline-none font-bold"
            />
            <button 
              onClick={handleAddTarea}
              disabled={isAdding}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-white p-2.5 rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              {isAdding ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
            </button>
          </div>

          {/* Lista */}
          <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
            <AnimatePresence mode="popLayout">
              {tLoading ? (
                <div className="flex justify-center py-10 opacity-20"><Loader2 className="animate-spin" /></div>
              ) : (
                tareas.map((t: any) => (
                  <motion.div 
                    key={t.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-2xl border transition-all group",
                      t.completada ? "bg-primary/5 border-transparent opacity-60" : "bg-white border-primary/10 shadow-sm"
                    )}
                  >
                    <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => handleToggle(t.id, t.completada)}>
                      <div className={cn(
                        "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                        t.completada ? "bg-primary border-primary" : "border-primary/20 group-hover:border-primary/40"
                      )}>
                        {t.completada && <Plus size={14} className="text-white rotate-45" strokeWidth={4} />}
                      </div>
                      <span className={cn("text-sm font-bold", t.completada && "line-through text-primary/40")}>
                        {t.titulo}
                      </span>
                    </div>
                    <button onClick={() => handleDelete(t.id)} className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:bg-red-50 rounded-lg transition-all">
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* --- COLUMNA DERECHA: CALENDARIO --- */}
      <section className="lg:col-span-7">
        <div className="bg-white border border-primary/10 rounded-[40px] p-8 shadow-xl shadow-primary/5 h-full">
          <div className="flex items-center justify-between mb-10 px-2">
            <div className="flex items-center gap-3">
              <CalendarIcon className="text-primary" size={20} />
              <h2 className="text-[12px] font-black uppercase tracking-widest text-primary/60">Calendario de Eventos</h2>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-primary/5 rounded-xl text-primary/40 hover:text-primary transition-colors">
                <ChevronLeft size={20} />
              </button>
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Febrero 2026</span>
              <button className="p-2 hover:bg-primary/5 rounded-xl text-primary/40 hover:text-primary transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Grid del Calendario */}
          <div className="grid grid-cols-7 gap-3 mb-8">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(d => (
              <div key={d} className="text-center text-[9px] font-black uppercase text-primary/20 tracking-widest mb-2">{d}</div>
            ))}
            {Array.from({ length: 28 }).map((_, i) => {
              const dia = i + 1;
              const esHoy = dia === 9; // Hardcoded para hoy según la fecha actual
              const tieneEvento = eventos.some((e: any) => new Date(e.fecha).getDate() + 1 === dia);

              return (
                <motion.div 
                  key={i}
                  whileHover={{ scale: 1.05 }}
                  className={cn(
                    "aspect-square rounded-2xl border flex flex-col items-center justify-center relative transition-all cursor-pointer group",
                    esHoy ? "bg-primary text-white border-primary shadow-lg shadow-primary/30" : 
                    "bg-primary/5 border-transparent text-primary/60 hover:border-primary/20 hover:bg-white"
                  )}
                >
                  <span className="text-sm font-black">{dia}</span>
                  {tieneEvento && (
                    <div className={cn(
                      "absolute bottom-2 w-1.5 h-1.5 rounded-full",
                      esHoy ? "bg-white" : "bg-primary"
                    )} />
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Lista de eventos del mes */}
          <div className="space-y-4 pt-6 border-t border-primary/5">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-primary/30 px-2">Próximos Eventos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {eLoading ? (
                <div className="col-span-2 flex justify-center py-4 opacity-20"><Loader2 className="animate-spin" /></div>
              ) : (
                eventos.map((e: any) => (
                  <div key={e.id} className="flex items-center gap-4 p-4 bg-primary/5 rounded-3xl border border-transparent hover:border-primary/10 transition-all">
                    <div className="w-10 h-10 bg-white rounded-xl flex flex-col items-center justify-center shadow-sm">
                       <span className="text-[14px] font-black text-primary">{new Date(e.fecha).getDate() + 1}</span>
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-primary uppercase leading-none">{e.titulo}</p>
                      <p className="text-[9px] font-bold text-primary/40 uppercase mt-1">{e.tipo}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};