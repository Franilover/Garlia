"use client";
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSupabaseData } from "@/hooks/useSupabaseData"; 
import { tareasQueries } from "@/lib/api/queries/tareas";
import { 
  CheckSquare, 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Loader2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

export const GestionPersonal = () => {
  // 1. Datos de Supabase
  const { data: tareas, loading: tLoading, setData: setTareas } = useSupabaseData<any>("tareas");
  const { data: eventos, loading: eLoading } = useSupabaseData<any>("eventos");

  // 2. Estados de Tareas
  const [nuevaTarea, setNuevaTarea] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // 3. Estados de Navegación del Calendario
  const [fechaVisualizacion, setFechaVisualizacion] = useState(new Date(2026, 1, 1)); // Empezamos en Feb 2026
  const [diaSeleccionado, setDiaSeleccionado] = useState(new Date().getDate());

  const mesesNombres = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  // --- LÓGICA DINÁMICA DEL CALENDARIO ---
  const { diasEnMes, primerDiaSemana, mesActual, añoActual } = useMemo(() => {
    const año = fechaVisualizacion.getFullYear();
    const mes = fechaVisualizacion.getMonth();
    const dias = new Date(año, mes + 1, 0).getDate();
    let primerDia = new Date(año, mes, 1).getDay();
    // Ajuste para que Lunes sea 0
    primerDia = primerDia === 0 ? 6 : primerDia - 1; 

    return { diasEnMes: dias, primerDiaSemana: primerDia, mesActual: mes, añoActual: año };
  }, [fechaVisualizacion]);

  const cambiarMes = (offset: number) => {
    setFechaVisualizacion(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  // --- LÓGICA DE TAREAS (SUPABASE) ---
  const handleAddTarea = async () => {
    if (!nuevaTarea.trim() || isAdding) return;
    setIsAdding(true);
    try {
      const creada = await tareasQueries.add(nuevaTarea);
      if (creada) {
        setTareas([creada, ...tareas]);
        setNuevaTarea("");
      }
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

  // --- FILTRADO DE EVENTOS ---
  const eventosDelDia = useMemo(() => {
    return eventos.filter((e: any) => {
      const d = new Date(e.fecha);
      // Ajuste de zona horaria común en JS dates
      const diaE = d.getUTCDate();
      const mesE = d.getUTCMonth();
      const añoE = d.getUTCFullYear();
      
      return diaE === diaSeleccionado && mesE === mesActual && añoE === añoActual;
    });
  }, [eventos, diaSeleccionado, mesActual, añoActual]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      {/* SECCIÓN TAREAS */}
      <section className="lg:col-span-5">
        <div className="bg-white border border-primary/10 rounded-[40px] p-6 shadow-xl shadow-primary/5 min-h-[600px] flex flex-col">
          <div className="flex items-center gap-3 mb-8 px-2">
            <CheckSquare className="text-primary" size={20} />
            <h2 className="text-[12px] font-black uppercase tracking-widest text-primary/60">Lista de Pendientes</h2>
          </div>

          <div className="relative mb-8">
            <input 
              type="text" 
              value={nuevaTarea}
              onChange={(e) => setNuevaTarea(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTarea()}
              placeholder="¿Qué tienes que hacer?"
              className="w-full bg-primary/5 border-2 border-transparent focus:border-primary/10 focus:bg-white rounded-2xl py-4 px-6 text-sm transition-all outline-none font-bold"
            />
            <button 
              onClick={handleAddTarea}
              disabled={isAdding || !nuevaTarea.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-white p-2.5 rounded-xl hover:scale-105 active:scale-95 transition-all"
            >
              {isAdding ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
            </button>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[450px] pr-2 custom-scrollbar">
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

      {/* SECCIÓN CALENDARIO */}
      <section className="lg:col-span-7">
        <div className="bg-white border border-primary/10 rounded-[40px] p-8 shadow-xl shadow-primary/5 h-full">
          <div className="flex items-center justify-between mb-10 px-2">
            <div className="flex items-center gap-3">
              <CalendarIcon className="text-primary" size={20} />
              <h2 className="text-[12px] font-black uppercase tracking-widest text-primary/60">Calendario</h2>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => cambiarMes(-1)} className="p-2 hover:bg-primary/5 rounded-xl text-primary/40 transition-colors">
                <ChevronLeft size={20} />
              </button>
              <span className="text-[11px] font-black uppercase tracking-widest text-primary min-w-[140px] text-center">
                {mesesNombres[mesActual]} {añoActual}
              </span>
              <button onClick={() => cambiarMes(1)} className="p-2 hover:bg-primary/5 rounded-xl text-primary/40 transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-3 mb-8">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(d => (
              <div key={d} className="text-center text-[9px] font-black uppercase text-primary/20 mb-2">{d}</div>
            ))}
            
            {Array.from({ length: primerDiaSemana }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {Array.from({ length: diasEnMes }).map((_, i) => {
              const dia = i + 1;
              const estaSeleccionado = dia === diaSeleccionado;
              const tieneEvento = eventos.some((e: any) => {
                const d = new Date(e.fecha);
                return d.getUTCDate() === dia && d.getUTCMonth() === mesActual && d.getUTCFullYear() === añoActual;
              });

              return (
                <motion.div 
                  key={dia}
                  onClick={() => setDiaSeleccionado(dia)}
                  whileHover={{ scale: 1.05 }}
                  className={cn(
                    "aspect-square rounded-2xl border flex flex-col items-center justify-center relative transition-all cursor-pointer",
                    estaSeleccionado ? "bg-primary text-white border-primary shadow-lg shadow-primary/30" : 
                    "bg-primary/5 border-transparent text-primary/60 hover:bg-white hover:border-primary/20"
                  )}
                >
                  <span className="text-sm font-black">{dia}</span>
                  {tieneEvento && (
                    <div className={cn("absolute bottom-2 w-1.5 h-1.5 rounded-full", estaSeleccionado ? "bg-white" : "bg-primary")} />
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* DETALLE EVENTOS */}
          <div className="pt-6 border-t border-primary/5">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-primary/30 mb-4 px-2">
              Planes para el {diaSeleccionado} de {mesesNombres[mesActual]}
            </h3>
            <div className="space-y-3">
              {eLoading ? (
                <Loader2 className="animate-spin mx-auto opacity-20" />
              ) : eventosDelDia.length > 0 ? (
                eventosDelDia.map((e: any) => (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={e.id} 
                    className="flex items-center gap-4 p-4 bg-primary/5 rounded-3xl border border-transparent">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                       <span className="text-[14px] font-black text-primary">{diaSeleccionado}</span>
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-primary uppercase">{e.titulo}</p>
                      <p className="text-[9px] font-bold text-primary/40 uppercase">{e.tipo}</p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <p className="text-[10px] font-bold text-primary/20 italic px-2">No hay eventos para este día.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};