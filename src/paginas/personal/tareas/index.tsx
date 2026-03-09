"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { tareasQueries } from "@/lib/api/queries/personal/tareas";
import { eventosQueries } from "@/lib/api/queries/personal/eventos";
import { db } from "@/lib/api/client/db";
import { enqueueOperation } from "@/hooks/data/useOfflineSync";
import { Calendar as CalendarIcon, Clock } from "lucide-react";

import { RelojDigital } from "./RelojDigital";
import { ListaTareas } from "./ListaTareas";
import { VistaMes } from "./VistaMes";
import { VistaSemanal } from "./VistaSemanal";
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

  const [diaSeleccionado, setDiaSeleccionado] = useState(new Date().getDate());
  const [nuevoEvento, setNuevoEvento] = useState("");
  const [tipoEvento, setTipoEvento] = useState("Plan");

  // ── HANDLERS TAREAS ──────────────────────────────────────────────────────────
  const handleAddTarea = async () => {
    if (!nuevaTarea.trim() || isAddingTarea) return;
    setIsAddingTarea(true);
    try {
      if (navigator.onLine) {
        const creada = await tareasQueries.add(nuevaTarea);
        if (creada) {
          await db.tareas.put({ ...creada, status: "synced" });
          setTareas([creada, ...tareas]);
          setNuevaTarea("");
        }
      } else {
        // Offline — crear localmente con ID temporal
        const tempId = `temp_${Date.now()}`;
        const tarea = {
          id: tempId,
          titulo: nuevaTarea,
          categoria: "general",
          username: "franilover",
          completada: false,
          created_at: new Date().toISOString(),
          status: "pending" as const,
        };
        await db.tareas.put(tarea);
        await enqueueOperation("tareas", "upsert", tempId, tarea);
        setTareas([tarea, ...tareas]);
        setNuevaTarea("");
      }
    } catch (err) { console.error(err); } finally { setIsAddingTarea(false); }
  };

  const handleToggle = async (id: string, completada: boolean) => {
    // Actualizar UI y Dexie inmediatamente
    const nuevaCompletada = !completada;
    setTareas(tareas.map((t: any) => t.id == id ? { ...t, completada: nuevaCompletada } : t));
    await db.tareas.update(id, { completada: nuevaCompletada, status: "pending" });

    if (navigator.onLine) {
      try {
        await tareasQueries.updateStatus(id, nuevaCompletada);
        await db.tareas.update(id, { status: "synced" });
      } catch (err) {
        // Si falla, encolar para sync posterior
        await enqueueOperation("tareas", "update", id, { completada: nuevaCompletada });
      }
    } else {
      await enqueueOperation("tareas", "update", id, { completada: nuevaCompletada });
    }
  };

  const handleDelete = async (id: string) => {
    // Actualizar UI y Dexie inmediatamente
    setTareas(tareas.filter((t: any) => t.id != id));
    await db.tareas.delete(id);

    if (navigator.onLine) {
      try {
        await tareasQueries.delete(id);
      } catch (err) {
        await enqueueOperation("tareas", "delete", id);
      }
    } else {
      await enqueueOperation("tareas", "delete", id);
    }
  };

  // ── HANDLERS EVENTOS ─────────────────────────────────────────────────────────
  const handleAddEventoMes = async () => {
    if (!nuevoEvento.trim() || isAddingEvento) return;
    setIsAddingEvento(true);
    const now = new Date();
    const fechaISO = new Date(now.getFullYear(), now.getMonth(), diaSeleccionado).toISOString();
    try {
      if (navigator.onLine) {
        const creado = await eventosQueries.add({ titulo: nuevoEvento, tipo: tipoEvento, fecha: fechaISO });
        if (creado) {
          await db.eventos.put({ ...creado, status: "synced" });
          setEventos([...eventos, creado]);
          setNuevoEvento("");
        }
      } else {
        const tempId = `temp_${Date.now()}`;
        const evento = {
          id: tempId,
          titulo: nuevoEvento,
          tipo: tipoEvento,
          fecha: fechaISO,
          username: "Franilover",
          status: "pending" as const,
        };
        await db.eventos.put(evento);
        await enqueueOperation("eventos", "upsert", tempId, evento);
        setEventos([...eventos, evento]);
        setNuevoEvento("");
      }
    } catch (err) { console.error(err); } finally { setIsAddingEvento(false); }
  };

  const handleAddEventoSemanal = async (fechaISO: string, titulo: string, tipo: string) => {
    setIsAddingEvento(true);
    try {
      if (navigator.onLine) {
        const creado = await eventosQueries.add({ titulo, tipo, fecha: fechaISO });
        if (creado) {
          await db.eventos.put({ ...creado, status: "synced" });
          setEventos((prev: any[]) => [...prev, creado]);
        }
      } else {
        const tempId = `temp_${Date.now()}`;
        const evento = {
          id: tempId, titulo, tipo, fecha: fechaISO,
          username: "Franilover",
          status: "pending" as const,
        };
        await db.eventos.put(evento);
        await enqueueOperation("eventos", "upsert", tempId, evento);
        setEventos((prev: any[]) => [...prev, evento]);
      }
    } catch (err) { console.error(err); } finally { setIsAddingEvento(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

      {/* COLUMNA IZQUIERDA: RELOJ Y TAREAS */}
      <section className="lg:col-span-5">
        <RelojDigital horario={horarioRaw || []} />

        <ListaTareas
          tareas={tareas}
          nuevaTarea={nuevaTarea}
          setNuevaTarea={setNuevaTarea}
          isAddingTarea={isAddingTarea}
          onAdd={handleAddTarea}
          onToggle={handleToggle}
          onDelete={handleDelete}
        />
      </section>

      {/* COLUMNA DERECHA: CALENDARIO */}
      <section className="lg:col-span-7 flex flex-col gap-4">

        {/* Toggle Mes / Semana */}
        <div className="flex items-center gap-1 bg-white border border-primary/10 rounded-2xl p-1 self-end shadow-sm">
          <button
            onClick={() => setModoCalendario("mes")}
            className={cn(
              "flex items-center gap-2 text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all",
              modoCalendario === "mes" ? "bg-primary text-white shadow-md shadow-primary/20" : "text-primary/40 hover:text-primary"
            )}
          >
            <CalendarIcon size={12} /> Mes
          </button>
          <button
            onClick={() => setModoCalendario("semana")}
            className={cn(
              "flex items-center gap-2 text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all",
              modoCalendario === "semana" ? "bg-primary text-white shadow-md shadow-primary/20" : "text-primary/40 hover:text-primary"
            )}
          >
            <Clock size={12} /> Semana
          </button>
        </div>

        {/* Vista activa */}
        <AnimatePresence mode="wait">
          {modoCalendario === "mes" ? (
            <motion.div key="mes" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <VistaMes
                eventos={eventos}
                capitulosRaw={capitulosRaw as any[] || []}
                diaSeleccionado={diaSeleccionado}
                setDiaSeleccionado={setDiaSeleccionado}
                nuevoEvento={nuevoEvento}
                setNuevoEvento={setNuevoEvento}
                tipoEvento={tipoEvento}
                setTipoEvento={setTipoEvento}
                isAddingEvento={isAddingEvento}
                handleAddEvento={handleAddEventoMes}
              />
            </motion.div>
          ) : (
            <motion.div key="semana" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <VistaSemanal
                eventos={eventos}
                capitulosRaw={capitulosRaw as any[] || []}
                isAddingEvento={isAddingEvento}
                onAddEvento={handleAddEventoSemanal}
              />
            </motion.div>
          )}
        </AnimatePresence>

      </section>
    </div>
  );
};