"use client";
import { MotionDiv } from "@/components/ui/Motion";
import React, { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { tareasQueries } from "@/lib/api/queries/personal/tareas";
import { eventosQueries } from "@/lib/api/queries/personal/eventos";
import { enqueueOperation, dexiePut, dexieUpdate, dexieDelete } from "@/hooks/data/useOfflineSync";
import { Calendar as CalendarIcon, Clock } from "lucide-react";

import { RelojDigital } from "./relojDigital";
import { ListaTareas } from "./listaTareas";
import { VistaMes } from "./vistaMes";
import { VistaSemanal } from "./vistaSemanal";
import { USERNAME } from "@/lib/config/constants";
import type { ModoCalendario } from "./types";

export const GestionPersonal = () => {
  const { data: tareas, setData: setTareas } = useSupabaseData<any>("tareas");
  const { data: eventos, setData: setEventos } = useSupabaseData<any>("eventos");
  const { data: capitulosRaw } = useSupabaseData<any>("capitulos", {
    select: "id, titulo_capitulo, fecha_publicacion, libro_id",
  });
  const { data: horarioRaw } = useSupabaseData<any>("horario");

  const [nuevaTarea, setNuevaTarea] = useState("");
  const [isAddingTarea, setIsAddingTarea] = useState(false);
  const [isAddingEvento, setIsAddingEvento] = useState(false);
  const [modoCalendario, setModoCalendario] = useState<ModoCalendario>("mes");

  /* ── Tareas ── */
  const handleAddTarea = async () => {
    if (!nuevaTarea.trim() || isAddingTarea) return;
    setIsAddingTarea(true);
    try {
      if (navigator.onLine) {
        const creada = await tareasQueries.add(nuevaTarea);
        if (creada) { setTareas([creada, ...tareas]); setNuevaTarea(""); dexiePut("tareas", { ...creada, status: "synced" }); }
      } else {
        const tempId = `temp_${Date.now()}`;
        const tarea = { id: tempId, titulo: nuevaTarea, categoria: "general", username: USERNAME, completada: false, created_at: new Date().toISOString(), status: "pending" as const };
        await dexiePut("tareas", tarea); await enqueueOperation("tareas", "upsert", tempId, tarea);
        setTareas([tarea, ...tareas]); setNuevaTarea("");
      }
    } catch (err) { console.error(err); } finally { setIsAddingTarea(false); }
  };

  const handleToggle = async (id: string, completada: boolean) => {
    setTareas(tareas.map((t: any) => t.id === id ? { ...t, completada: !completada } : t));
    try {
      if (navigator.onLine) { await tareasQueries.updateStatus(id, !completada); dexieUpdate("tareas", id, { completada: !completada, status: "synced" }); }
      else { await dexieUpdate("tareas", id, { completada: !completada, status: "pending" }); await enqueueOperation("tareas", "update", id, { completada: !completada }); }
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    setTareas(tareas.filter((t: any) => t.id !== id));
    try {
      if (navigator.onLine) { await tareasQueries.delete(id); dexieDelete("tareas", id); }
      else { await dexieDelete("tareas", id); await enqueueOperation("tareas", "delete", id); }
    } catch (err) { console.error(err); }
  };

  /* ── Eventos (interfaz unificada: fechaISO + titulo + tipo) ── */
  const handleAddEvento = async (fechaISO: string, titulo: string, tipo: string) => {
    if (!titulo.trim() || isAddingEvento) return;
    setIsAddingEvento(true);
    try {
      if (navigator.onLine) {
        const creado = await eventosQueries.add({ titulo, tipo, fecha: fechaISO });
        if (creado) { setEventos((prev: any[]) => [...prev, creado]); dexiePut("eventos", { ...creado, status: "synced" }); }
      } else {
        const tempId = `temp_${Date.now()}`;
        const evento = { id: tempId, titulo, tipo, fecha: fechaISO, username: USERNAME, status: "pending" as const };
        await dexiePut("eventos", evento); await enqueueOperation("eventos", "upsert", tempId, evento);
        setEventos((prev: any[]) => [...prev, evento]);
      }
    } catch (err) { console.error(err); } finally { setIsAddingEvento(false); }
  };

  /* ── Render ── */
  return (
    <div className="
      h-[calc(100vh-var(--navbar-height,80px))]
      flex gap-3 pb-3 overflow-hidden
      flex-col lg:flex-row
    ">
      <div className="
        flex-1 min-w-0
        flex flex-col lg:flex-row
        bg-background
        border border-primary/10
        rounded-[var(--radius-card)]
        shadow-xl shadow-primary/5
        overflow-hidden
      ">

        {/* ── Col izquierda: Calendario ── */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">

          {/* Switcher modo */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-primary/8 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-foreground/30">
              Calendario
            </span>
            <div className="flex items-center gap-0.5 bg-primary/5 dark:bg-primary/10 rounded-[var(--radius-btn)] p-0.5">
              <button
                onClick={() => setModoCalendario("mes")}
                className={cn(
                  "flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-[var(--radius-btn)] transition-all",
                  modoCalendario === "mes"
                    ? "bg-primary text-white shadow-sm"
                    : "text-foreground/35 hover:text-primary"
                )}
              >
                <CalendarIcon size={9} /> Mes
              </button>
              <button
                onClick={() => setModoCalendario("semana")}
                className={cn(
                  "flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-[var(--radius-btn)] transition-all",
                  modoCalendario === "semana"
                    ? "bg-primary text-white shadow-sm"
                    : "text-foreground/35 hover:text-primary"
                )}
              >
                <Clock size={9} /> Semana
              </button>
            </div>
          </div>

          {/* Vista activa */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <AnimatePresence mode="wait">
              {modoCalendario === "mes" ? (
                <MotionDiv
                  key="mes"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16 }}
                  className="h-full"
                >
                  <VistaMes
                    eventos={eventos}
                    capitulosRaw={capitulosRaw as any[] || []}
                    isAddingEvento={isAddingEvento}
                    onAddEvento={handleAddEvento}
                  />
                </MotionDiv>
              ) : (
                <MotionDiv
                  key="semana"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16 }}
                  className="h-full p-4"
                >
                  <VistaSemanal
                    eventos={eventos}
                    capitulosRaw={capitulosRaw as any[] || []}
                    isAddingEvento={isAddingEvento}
                    onAddEvento={handleAddEvento}
                  />
                </MotionDiv>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Divisores */}
        <div className="hidden lg:block w-px bg-primary/8 shrink-0" />
        <div className="lg:hidden h-px bg-primary/8 shrink-0" />

        {/* ── Col derecha: Reloj + Tareas ── */}
        <div className="w-full lg:w-[22%] shrink-0 flex flex-col overflow-hidden">
          <RelojDigital horario={horarioRaw || []} tareas={tareas || []} />
          <div className="h-px bg-primary/8 shrink-0" />
          <div className="flex-1 min-h-0 overflow-hidden">
            <ListaTareas
              tareas={tareas}
              nuevaTarea={nuevaTarea}
              setNuevaTarea={setNuevaTarea}
              isAddingTarea={isAddingTarea}
              onAdd={handleAddTarea}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          </div>
        </div>
      </div>
    </div>
  );
};