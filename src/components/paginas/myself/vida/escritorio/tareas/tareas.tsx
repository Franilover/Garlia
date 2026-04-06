"use client";
import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  const [diaSeleccionado, setDiaSeleccionado] = useState(new Date().getDate());
  const [nuevoEvento, setNuevoEvento] = useState("");
  const [tipoEvento, setTipoEvento] = useState("Plan");

  // ── CRUD tareas ─────────────────────────────────────────────────────────────

  const handleAddTarea = async () => {
    if (!nuevaTarea.trim() || isAddingTarea) return;
    setIsAddingTarea(true);
    try {
      if (navigator.onLine) {
        const creada = await tareasQueries.add(nuevaTarea);
        if (creada) {
          setTareas([creada, ...tareas]);
          setNuevaTarea("");
          dexiePut("tareas", { ...creada, status: "synced" });
        }
      } else {
        const tempId = `temp_${Date.now()}`;
        const tarea = {
          id: tempId, titulo: nuevaTarea, categoria: "general",
          username: USERNAME, completada: false,
          created_at: new Date().toISOString(), status: "pending" as const,
        };
        await dexiePut("tareas", tarea);
        await enqueueOperation("tareas", "upsert", tempId, tarea);
        setTareas([tarea, ...tareas]);
        setNuevaTarea("");
      }
    } catch (err) { console.error(err); } finally { setIsAddingTarea(false); }
  };

  const handleToggle = async (id: string, completada: boolean) => {
    setTareas(tareas.map((t: any) => t.id === id ? { ...t, completada: !completada } : t));
    try {
      if (navigator.onLine) {
        await tareasQueries.updateStatus(id, !completada);
        dexieUpdate("tareas", id, { completada: !completada, status: "synced" });
      } else {
        await dexieUpdate("tareas", id, { completada: !completada, status: "pending" });
        await enqueueOperation("tareas", "update", id, { completada: !completada });
      }
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    setTareas(tareas.filter((t: any) => t.id !== id));
    try {
      if (navigator.onLine) {
        await tareasQueries.delete(id);
        dexieDelete("tareas", id);
      } else {
        await dexieDelete("tareas", id);
        await enqueueOperation("tareas", "delete", id);
      }
    } catch (err) { console.error(err); }
  };

  // ── CRUD eventos ─────────────────────────────────────────────────────────────

  const handleAddEventoMes = async () => {
    if (!nuevoEvento.trim() || isAddingEvento) return;
    setIsAddingEvento(true);
    const now = new Date();
    const fechaISO = new Date(now.getFullYear(), now.getMonth(), diaSeleccionado).toISOString();
    try {
      if (navigator.onLine) {
        const creado = await eventosQueries.add({ titulo: nuevoEvento, tipo: tipoEvento, fecha: fechaISO });
        if (creado) {
          setEventos([...eventos, creado]);
          setNuevoEvento("");
          dexiePut("eventos", { ...creado, status: "synced" });
        }
      } else {
        const tempId = `temp_${Date.now()}`;
        const evento = {
          id: tempId, titulo: nuevoEvento, tipo: tipoEvento,
          fecha: fechaISO, username: USERNAME, status: "pending" as const,
        };
        await dexiePut("eventos", evento);
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
          setEventos((prev: any[]) => [...prev, creado]);
          dexiePut("eventos", { ...creado, status: "synced" });
        }
      } else {
        const tempId = `temp_${Date.now()}`;
        const evento = {
          id: tempId, titulo, tipo, fecha: fechaISO,
          username: USERNAME, status: "pending" as const,
        };
        await dexiePut("eventos", evento);
        await enqueueOperation("eventos", "upsert", tempId, evento);
        setEventos((prev: any[]) => [...prev, evento]);
      }
    } catch (err) { console.error(err); } finally { setIsAddingEvento(false); }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    /*
      Móvil  : columna única, scroll libre (no overflow-hidden)
      Desktop: dos columnas fijas a la altura de la pantalla, scroll interno
    */
    <div className="flex flex-col lg:grid lg:grid-cols-12 lg:h-[calc(100vh-var(--navbar-height,80px))] gap-4 pb-6 lg:pb-0 lg:overflow-hidden">

      {/* ── Columna izquierda: reloj + tareas ──────────────────────────────── */}
      <section className="lg:col-span-5 flex flex-col gap-4 lg:h-full lg:overflow-hidden">
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

      {/* ── Columna derecha: selector + calendario ─────────────────────────── */}
      <section className="lg:col-span-7 flex flex-col gap-3 lg:h-full lg:overflow-hidden">

        {/* Selector mes / semana — compacto en móvil */}
        <div className="flex items-center gap-1 bg-white-custom border border-primary/10 rounded-[var(--radius-btn)] p-1 self-start lg:self-end shadow-sm shrink-0">
          <button
            onClick={() => setModoCalendario("mes")}
            className={cn(
              "flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-[var(--radius-btn)] transition-all",
              modoCalendario === "mes"
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "text-primary/40 hover:text-primary"
            )}
          >
            <CalendarIcon size={11} /> Mes
          </button>
          <button
            onClick={() => setModoCalendario("semana")}
            className={cn(
              "flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-[var(--radius-btn)] transition-all",
              modoCalendario === "semana"
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "text-primary/40 hover:text-primary"
            )}
          >
            <Clock size={11} /> Semana
          </button>
        </div>

        {/* Vista activa — ocupa el espacio restante en desktop, altura auto en móvil */}
        <div className="flex-1 lg:min-h-0 flex flex-col">
          <AnimatePresence mode="wait">
            {modoCalendario === "mes" ? (
              <motion.div
                key="mes"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col min-h-0"
              >
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
              <motion.div
                key="semana"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col min-h-0"
              >
                <VistaSemanal
                  eventos={eventos}
                  capitulosRaw={capitulosRaw as any[] || []}
                  isAddingEvento={isAddingEvento}
                  onAddEvento={handleAddEventoSemanal}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
};