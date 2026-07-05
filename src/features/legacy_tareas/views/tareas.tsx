"use client";
import { AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import React, { useState } from "react";

import { MotionDiv } from "@/components/ui/Motion";
import { enqueueOperation, dexiePut, dexieUpdate, dexieDelete } from "@/hooks/data/useOfflineSync";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { eventosQueries } from "@/lib/api/queries/personal/eventos";
import { tareasQueries } from "@/lib/api/queries/personal/tareas";
import { cn } from "@/lib/utils/index";


import { ListaTareas } from "@/features/legacy_tareas/components/listaTareas";
import { RelojDigital } from "@/features/legacy_tareas/components/relojDigital";
import type { ModoCalendario } from "@/features/calendario/components/types";
import { VistaMes } from "@/features/calendario/components/vistaMes";
import { VistaSemanal } from "@/features/calendario/components/vistaSemanal";

const USERNAME = "franilover";

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
        const creada = await tareasQueries.create({ titulo: nuevaTarea, categoria: "general", username: USERNAME, completada: false });
        if (creada) { setTareas([creada, ...tareas]); setNuevaTarea(""); void dexiePut("tareas", { ...creada, status: "synced" }); }
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
      if (navigator.onLine) { await tareasQueries.toggleCompletada(id, completada); void dexieUpdate("tareas", id, { completada: !completada, status: "synced" }); }
      else { await dexieUpdate("tareas", id, { completada: !completada, status: "pending" }); await enqueueOperation("tareas", "update", id, { completada: !completada }); }
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    setTareas(tareas.filter((t: any) => t.id !== id));
    try {
      if (navigator.onLine) { await tareasQueries.delete(id); void dexieDelete("tareas", id); }
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
        if (creado) { setEventos((prev: any[]) => [...prev, creado]); void dexiePut("eventos", { ...creado, status: "synced" }); }
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
      h-full
      flex gap-3 pb-3 overflow-hidden
      flex-col lg:flex-row
    ">
      <div className="
        flex-1 min-w-0
        flex flex-col lg:flex-row
        bg-[var(--white-custom)]
        border border-primary/10
        rounded-[var(--radius-card)]
        shadow-xl shadow-primary/5
        overflow-hidden
      ">

        {/* ── Col izquierda: Calendario ── */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">

          {/* Switcher modo — solo desktop */}
          <div className="hidden lg:flex items-center justify-between px-5 py-3 border-b border-primary/8 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-on-card)]/30">
              Calendario
            </span>
            <div className="flex items-center gap-0.5 bg-primary/5 dark:bg-primary/10 rounded-[var(--radius-btn)] p-0.5">
              <button
                className={cn(
                  "flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-[var(--radius-btn)] transition-all",
                  modoCalendario === "mes"
                    ? "bg-primary text-[var(--btn-text)] shadow-sm"
                    : "text-[var(--text-on-card)]/35 hover:text-primary"
                )}
                onClick={() => setModoCalendario("mes")}
              >
                <CalendarIcon size={9} /> Mes
              </button>
              <button
                className={cn(
                  "flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-[var(--radius-btn)] transition-all",
                  modoCalendario === "semana"
                    ? "bg-primary text-[var(--btn-text)] shadow-sm"
                    : "text-[var(--text-on-card)]/35 hover:text-primary"
                )}
                onClick={() => setModoCalendario("semana")}
              >
                <Clock size={9} /> Semana
              </button>
            </div>
          </div>

          {/* Vista activa */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <AnimatePresence mode="wait">
              {/* Móvil: siempre VistaMes */}
              <MotionDiv
                key="mes-mobile"
                animate={{ opacity: 1 }}
                className="h-full lg:hidden"
                initial={{ opacity: 0 }}
              >
                <VistaMes
                  capitulosRaw={capitulosRaw as any[] || []}
                  eventos={eventos}
                  isAddingEvento={isAddingEvento}
                  onAddEvento={handleAddEvento}
                />
              </MotionDiv>
              {/* Desktop: según modoCalendario */}
              {modoCalendario === "mes" ? (
                <MotionDiv
                  key="mes"
                  animate={{ opacity: 1, y: 0 }}
                  className="hidden lg:block h-full"
                  exit={{ opacity: 0, y: -6 }}
                  initial={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.16 }}
                >
                  <VistaMes
                    capitulosRaw={capitulosRaw as any[] || []}
                    eventos={eventos}
                    isAddingEvento={isAddingEvento}
                    onAddEvento={handleAddEvento}
                  />
                </MotionDiv>
              ) : (
                <MotionDiv
                  key="semana"
                  animate={{ opacity: 1, y: 0 }}
                  className="hidden lg:block h-full p-4"
                  exit={{ opacity: 0, y: -6 }}
                  initial={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.16 }}
                >
                  <VistaSemanal
                    capitulosRaw={capitulosRaw as any[] || []}
                    eventos={eventos}
                    isAddingEvento={isAddingEvento}
                    onAddEvento={handleAddEvento}
                  />
                </MotionDiv>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Divisor solo desktop */}
        <div className="hidden lg:block w-px bg-primary/8 shrink-0" />

        {/* ── Col derecha: Reloj (solo desktop) + Tareas ── */}
        <div className="w-full lg:w-[22%] shrink-0 flex flex-col overflow-hidden">
          {/* Reloj: oculto en móvil */}
          <div className="hidden lg:block">
            <RelojDigital horario={horarioRaw || []} tareas={tareas || []} />
            <div className="h-px bg-primary/8" />
          </div>
          {/* Separador entre calendario y tareas solo en móvil */}
          <div className="h-px bg-primary/8 shrink-0 lg:hidden" />
          <div className="flex-1 min-h-0 overflow-hidden">
            <ListaTareas
              isAddingTarea={isAddingTarea}
              nuevaTarea={nuevaTarea}
              setNuevaTarea={setNuevaTarea}
              tareas={tareas}
              onAdd={handleAddTarea}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          </div>
        </div>
      </div>
    </div>
  );
};