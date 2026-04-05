"use client";
import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Bookmark, BookOpen, Plus } from "lucide-react";
import { BtnIcon } from "@/components/ui";
import { MESES, TIPOS_EVENTO, EventoBadge } from "./types";

interface Props {
  eventos: any[];
  capitulosRaw: any[];
  diaSeleccionado: number;
  setDiaSeleccionado: (d: number) => void;
  nuevoEvento: string;
  setNuevoEvento: (v: string) => void;
  tipoEvento: string;
  setTipoEvento: (v: string) => void;
  isAddingEvento: boolean;
  handleAddEvento: () => void;
}

export const VistaMes = ({
  eventos, capitulosRaw, diaSeleccionado, setDiaSeleccionado,
  nuevoEvento, setNuevoEvento, tipoEvento, setTipoEvento,
  isAddingEvento, handleAddEvento,
}: Props) => {
  const [fechaVisualizacion, setFechaVisualizacion] = useState(new Date());

  const { diasEnMes, primerDiaSemana, mesActual, añoActual } = useMemo(() => {
    const año = fechaVisualizacion.getFullYear();
    const mes = fechaVisualizacion.getMonth();
    const dias = new Date(año, mes + 1, 0).getDate();
    let primerDia = new Date(año, mes, 1).getDay();
    primerDia = primerDia === 0 ? 6 : primerDia - 1;
    return { diasEnMes: dias, primerDiaSemana: primerDia, mesActual: mes, añoActual: año };
  }, [fechaVisualizacion]);

  const cambiarMes = (offset: number) =>
    setFechaVisualizacion(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));

  const tieneAlgoElDia = (dia: number) => {
    const hayEvento = eventos.some((e: any) => {
      const d = new Date(e.fecha);
      return d.getUTCDate() === dia && d.getUTCMonth() === mesActual && d.getUTCFullYear() === añoActual;
    });
    const hayCap = capitulosRaw.some((c: any) => {
      const d = new Date(c.fecha_publicacion);
      return d.getUTCDate() === dia && d.getUTCMonth() === mesActual && d.getUTCFullYear() === añoActual;
    });
    return hayEvento || hayCap;
  };

  const itemsCombinadosDelDia = useMemo(() => {
    const evs = eventos.filter((e: any) => {
      const d = new Date(e.fecha);
      return d.getUTCDate() === diaSeleccionado && d.getUTCMonth() === mesActual && d.getUTCFullYear() === añoActual;
    }).map(e => ({ ...e, esCapitulo: false }));

    const caps = capitulosRaw.filter((c: any) => {
      const d = new Date(c.fecha_publicacion);
      return d.getUTCDate() === diaSeleccionado && d.getUTCMonth() === mesActual && d.getUTCFullYear() === añoActual;
    }).map(c => ({ id: c.id, titulo: c.titulo_capitulo, tipo: "Lanzamiento Libro", esCapitulo: true }));

    return [...evs, ...caps];
  }, [eventos, capitulosRaw, diaSeleccionado, mesActual, añoActual]);

  return (
    <div className="bg-white-custom border border-primary/10 rounded-[var(--radius-card)] p-4 shadow-xl shadow-primary/5 flex flex-col gap-3 lg:h-full lg:overflow-hidden">

      {/* ── Cabecera mes ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <CalendarIcon className="text-primary" size={16} />
          <h2 className="text-[11px] font-black uppercase tracking-widest text-primary/60">Calendario</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => cambiarMes(-1)}
            className="p-1.5 hover:bg-primary/5 rounded-[var(--radius-btn)] text-primary/40 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-[10px] font-black uppercase tracking-widest text-primary min-w-[9rem] text-center">
            {MESES[mesActual]} {añoActual}
          </span>
          <button
            onClick={() => cambiarMes(1)}
            className="p-1.5 hover:bg-primary/5 rounded-[var(--radius-btn)] text-primary/40 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── Grid del calendario ───────────────────────────────────────────── */}
      <div className="shrink-0">
        {/* Cabecera días */}
        <div className="grid grid-cols-7 mb-1">
          {["L", "M", "X", "J", "V", "S", "D"].map(d => (
            <div key={d} className="text-center text-[8px] font-black uppercase text-primary/25 py-1">{d}</div>
          ))}
        </div>

        {/* Celdas — usan padding-bottom: 100% para ser cuadradas sin fijar altura */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: primerDiaSemana }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          {Array.from({ length: diasEnMes }).map((_, i) => {
            const dia = i + 1;
            const estaSeleccionado = dia === diaSeleccionado;
            const tieneAlgo = tieneAlgoElDia(dia);
            const esHoy =
              dia === new Date().getDate() &&
              mesActual === new Date().getMonth() &&
              añoActual === new Date().getFullYear();

            return (
              <motion.button
                key={dia}
                onClick={() => setDiaSeleccionado(dia)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "aspect-square rounded-[var(--radius-btn)] border flex flex-col items-center justify-center relative transition-all text-xs font-black",
                  estaSeleccionado
                    ? "bg-primary text-btn-text border-primary shadow-lg shadow-primary/30"
                    : esHoy
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-primary/5 border-primary/5 hover:bg-white-custom hover:border-primary/20 text-foreground"
                )}
              >
                {dia}
                {tieneAlgo && (
                  <span
                    className={cn(
                      "absolute bottom-[3px] w-1 h-1 rounded-full",
                      estaSeleccionado ? "bg-btn-text/70" : "bg-primary"
                    )}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Añadir evento ─────────────────────────────────────────────────── */}
      <div className="bg-primary/5 rounded-[var(--radius-btn)] p-3 border border-primary/10 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <Bookmark size={12} className="text-primary/40" />
          <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">
            Día {diaSeleccionado}
          </span>
        </div>
        {/* En móvil: stack vertical; en sm+: fila */}
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={tipoEvento}
            onChange={e => setTipoEvento(e.target.value)}
            className="bg-white-custom border border-primary/10 rounded-[var(--radius-btn)] px-3 py-2 text-[10px] font-black text-primary outline-none focus:border-primary/30 cursor-pointer"
          >
            {TIPOS_EVENTO.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="flex gap-2 flex-1">
            <input
              type="text"
              value={nuevoEvento}
              onChange={(e) => setNuevoEvento(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddEvento()}
              placeholder="Nombre del evento..."
              className="flex-1 bg-white-custom rounded-[var(--radius-btn)] px-4 py-2 text-xs text-primary font-bold outline-none border border-primary/10 focus:border-primary/30 min-w-0"
            />
            <BtnIcon
              loading={isAddingEvento}
              disabled={!nuevoEvento.trim()}
              onClick={handleAddEvento}
              className="rounded-[var(--radius-btn)] w-10 h-10 shrink-0"
            >
              <Plus size={16} />
            </BtnIcon>
          </div>
        </div>
      </div>

      {/* ── Lista de eventos del día ──────────────────────────────────────── */}
      {/* flex-1 + min-h-0 en desktop para que ocupe el espacio restante y haga scroll */}
      <div className="flex flex-col min-h-0 lg:flex-1">
        <h3 className="text-[9px] font-black uppercase tracking-widest text-primary/30 px-1 mb-2 shrink-0">
          Eventos del día {diaSeleccionado}
        </h3>
        {/* El scroll va aquí, no en el padre */}
        <div className="flex flex-col gap-2 overflow-y-auto min-h-0 lg:flex-1">
          {itemsCombinadosDelDia.length > 0 ? (
            itemsCombinadosDelDia.map((item: any) => (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                key={item.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-[var(--radius-card)] border transition-all shrink-0",
                  item.esCapitulo
                    ? "bg-primary/10 border-primary/20"
                    : "bg-primary/5 border-primary/10"
                )}
              >
                <div className="w-8 h-8 bg-white-custom rounded-[var(--radius-btn)] flex items-center justify-center shadow-sm shrink-0">
                  {item.esCapitulo
                    ? <BookOpen size={14} className="text-primary" />
                    : <span className="text-[11px] font-black text-primary">{diaSeleccionado}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-foreground uppercase italic truncate">"{item.titulo}"</p>
                  <p className="text-[8px] font-bold text-primary/40 uppercase tracking-tight">"{item.tipo}"</p>
                </div>
                {item.esCapitulo && (
                  <span className="text-[7px] font-black bg-primary text-white px-2 py-0.5 rounded-full uppercase shrink-0">
                    Cap.
                  </span>
                )}
              </motion.div>
            ))
          ) : (
            <p className="text-[10px] font-bold text-primary/20 italic px-1">Sin eventos para este día.</p>
          )}
        </div>
      </div>
    </div>
  );
};