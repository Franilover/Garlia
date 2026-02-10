"use client";

import React, { useState, useMemo, useCallback } from "react";
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
  Loader2,
  ChevronLeft,
  ChevronRight,
  Bookmark
} from "lucide-react";

/* -------------------- TIPOS -------------------- */
type Tarea = {
  id: string;
  titulo: string;
  completada: boolean;
};

type Evento = {
  id: string;
  titulo: string;
  tipo: "Plan" | "Reunión" | "Recordatorio";
  fecha: string;
};

/* -------------------- COMPONENTE -------------------- */
export const GestionPersonal = () => {
  /* ---------- DATA ---------- */
  const { data: tareas, loading: tLoading, setData: setTareas } =
    useSupabaseData<Tarea>("tareas");

  const { data: eventos, loading: eLoading, setData: setEventos } =
    useSupabaseData<Evento>("eventos");

  /* ---------- ESTADOS TAREAS ---------- */
  const [nuevaTarea, setNuevaTarea] = useState("");
  const [isAddingTarea, setIsAddingTarea] = useState(false);

  /* ---------- ESTADOS EVENTOS ---------- */
  const [nuevoEvento, setNuevoEvento] = useState("");
  const [tipoEvento, setTipoEvento] =
    useState<Evento["tipo"]>("Plan");
  const [isAddingEvento, setIsAddingEvento] = useState(false);

  /* ---------- CALENDARIO ---------- */
  const [fechaVisualizacion, setFechaVisualizacion] = useState(
    new Date()
  );
  const [diaSeleccionado, setDiaSeleccionado] = useState(
    new Date().getDate()
  );

  const mesesNombres = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const { diasEnMes, primerDiaSemana, mesActual, añoActual } =
    useMemo(() => {
      const año = fechaVisualizacion.getFullYear();
      const mes = fechaVisualizacion.getMonth();
      const dias = new Date(año, mes + 1, 0).getDate();
      let primerDia = new Date(año, mes, 1).getDay();
      primerDia = primerDia === 0 ? 6 : primerDia - 1;
      return { diasEnMes: dias, primerDiaSemana: primerDia, mesActual: mes, añoActual: año };
    }, [fechaVisualizacion]);

  const cambiarMes = (offset: number) => {
    setFechaVisualizacion(
      prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1)
    );
    setDiaSeleccionado(1);
  };

  /* ---------- OPTIMIZACIÓN CALENDARIO ---------- */
  const diasConEventos = useMemo(() => {
    const set = new Set<number>();
    eventos.forEach(e => {
      const d = new Date(e.fecha);
      if (
        d.getMonth() === mesActual &&
        d.getFullYear() === añoActual
      ) {
        set.add(d.getDate());
      }
    });
    return set;
  }, [eventos, mesActual, añoActual]);

  const eventosDelDia = useMemo(() => {
    return eventos.filter(e => {
      const d = new Date(e.fecha);
      return (
        d.getDate() === diaSeleccionado &&
        d.getMonth() === mesActual &&
        d.getFullYear() === añoActual
      );
    });
  }, [eventos, diaSeleccionado, mesActual, añoActual]);

  /* ---------- TAREAS ---------- */
  const handleAddTarea = useCallback(async () => {
    if (!nuevaTarea.trim() || isAddingTarea) return;
    setIsAddingTarea(true);
    try {
      const creada = await tareasQueries.add(nuevaTarea);
      if (creada) {
        setTareas([creada, ...tareas]);
        setNuevaTarea("");
      }
    } finally {
      setIsAddingTarea(false);
    }
  }, [nuevaTarea, tareas, isAddingTarea, setTareas]);

  const handleToggle = useCallback(async (id: string, completada: boolean) => {
    await tareasQueries.updateStatus(id, !completada);
    setTareas(tareas.map(t =>
      t.id === id ? { ...t, completada: !completada } : t
    ));
  }, [tareas, setTareas]);

  const handleDelete = useCallback(async (id: string) => {
    await tareasQueries.delete(id);
    setTareas(tareas.filter(t => t.id !== id));
  }, [tareas, setTareas]);

  /* ---------- EVENTOS ---------- */
  const handleAddEvento = async () => {
    if (!nuevoEvento.trim() || isAddingEvento) return;
    setIsAddingEvento(true);

    const fechaISO = new Date(
      añoActual,
      mesActual,
      diaSeleccionado,
      12
    ).toISOString();

    try {
      const creado = await eventosQueries.add({
        titulo: nuevoEvento,
        tipo: tipoEvento,
        fecha: fechaISO
      });

      if (creado) {
        setEventos([...eventos, creado]);
        setNuevoEvento("");
      }
    } finally {
      setIsAddingEvento(false);
    }
  };

  /* ---------- UI ---------- */
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* ------------------ TAREAS ------------------ */}
      <section className="lg:col-span-5">
        <div className="bg-white rounded-[40px] p-6 shadow-xl min-h-[600px] flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <CheckSquare className="text-primary" size={18} />
            <h2 className="text-xs font-black uppercase text-primary/60">
              Lista de Pendientes
            </h2>
          </div>

          <div className="relative mb-6">
            <input
              value={nuevaTarea}
              onChange={e => setNuevaTarea(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddTarea()}
              placeholder="Añadir una tarea"
              className="w-full rounded-2xl py-4 px-6 text-sm font-bold bg-primary/5 outline-none"
            />
            <button
              onClick={handleAddTarea}
              disabled={!nuevaTarea.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-white p-2.5 rounded-xl"
            >
              {isAddingTarea ? <Loader2 className="animate-spin" /> : <Plus />}
            </button>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {tareas.length === 0 && (
              <p className="text-xs italic text-primary/30 text-center mt-10">
                🎉 No tienes tareas pendientes
              </p>
            )}

            <AnimatePresence>
              {tareas.map(t => (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-between items-center p-4 rounded-2xl bg-primary/5"
                >
                  <span
                    onClick={() => handleToggle(t.id, t.completada)}
                    className={cn(
                      "cursor-pointer font-bold",
                      t.completada && "line-through opacity-40"
                    )}
                  >
                    {t.titulo}
                  </span>
                  <button onClick={() => handleDelete(t.id)}>
                    <Trash2 size={16} className="text-red-400" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ------------------ CALENDARIO ------------------ */}
      <section className="lg:col-span-7">
        <div className="bg-white rounded-[40px] p-8 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <CalendarIcon className="text-primary" />
            <div className="flex items-center gap-4">
              <ChevronLeft onClick={() => cambiarMes(-1)} />
              <span className="text-xs font-black">
                {mesesNombres[mesActual]} {añoActual}
              </span>
              <ChevronRight onClick={() => cambiarMes(1)} />
            </div>
          </div>

          <div className="grid grid-cols-7 gap-3 mb-6">
            {Array.from({ length: primerDiaSemana }).map((_, i) => (
              <div key={i} />
            ))}

            {Array.from({ length: diasEnMes }).map((_, i) => {
              const dia = i + 1;
              return (
                <motion.div
                  key={dia}
                  onClick={() => setDiaSeleccionado(dia)}
                  whileHover={{ scale: 1.05 }}
                  className={cn(
                    "aspect-square rounded-2xl flex items-center justify-center cursor-pointer",
                    dia === diaSeleccionado
                      ? "bg-primary text-white"
                      : "bg-primary/5"
                  )}
                >
                  {dia}
                  {diasConEventos.has(dia) && (
                    <span className="absolute bottom-2 w-1.5 h-1.5 bg-primary rounded-full" />
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* NUEVO EVENTO */}
          <div className="bg-primary/5 p-4 rounded-3xl mb-6">
            <div className="flex gap-2">
              <input
                value={nuevoEvento}
                onChange={e => setNuevoEvento(e.target.value)}
                placeholder="Nuevo evento..."
                className="flex-1 px-4 py-2 rounded-xl text-xs font-bold"
              />
              <select
                value={tipoEvento}
                onChange={e => setTipoEvento(e.target.value as Evento["tipo"])}
                className="rounded-xl px-2 text-xs font-bold"
              >
                <option>Plan</option>
                <option>Reunión</option>
                <option>Recordatorio</option>
              </select>
              <button onClick={handleAddEvento} className="bg-primary text-white px-3 rounded-xl">
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* EVENTOS DEL DÍA */}
          <AnimatePresence mode="wait">
            <motion.div
              key={diaSeleccionado}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {eventosDelDia.length === 0 ? (
                <p className="text-xs italic text-primary/30">
                  No hay eventos para este día
                </p>
              ) : (
                eventosDelDia.map(e => (
                  <div key={e.id} className="p-4 bg-primary/5 rounded-2xl mb-2">
                    <p className="text-xs font-black">{e.titulo}</p>
                    <p className="text-[10px] uppercase opacity-40">{e.tipo}</p>
                  </div>
                ))
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
};
