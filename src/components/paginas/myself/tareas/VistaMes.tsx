"use client";
import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Bookmark, BookOpen, Plus } from "lucide-react";
import { BtnIcon } from "@/components/ui";
import { MESES } from "./types";

const EventoBadge = ({ item, compact = false }: { item: any; compact?: boolean }) => {
  const colores: Record<string, string> = {
    "Plan":              "bg-primary/10 text-primary border-primary/15",
    "Lanzamiento Libro": "bg-amber-50 text-amber-700 border-amber-200",
    "Reunión":           "bg-blue-50 text-blue-700 border-blue-200",
    "Personal":          "bg-emerald-50 text-emerald-700 border-emerald-200",
    "default":           "bg-primary/8 text-primary/70 border-primary/10",
  };
  const color = colores[item.tipo] ?? colores["default"];
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-[var(--radius-btn)] border px-2 py-1 flex items-center gap-1.5 cursor-default select-none",
        color,
        compact ? "text-[9px]" : "text-[10px]"
      )}
    >
      {item.esCapitulo && <BookOpen size={9} className="shrink-0" />}
      <span className="font-black uppercase tracking-tight truncate">{item.titulo}</span>
    </motion.div>
  );
};

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
    <div className="bg-white-custom border border-primary/10 rounded-[var(--radius-card)] p-5 shadow-xl shadow-primary/5 flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4 px-2 shrink-0">
        <div className="flex items-center gap-3">
          <CalendarIcon className="text-primary" size={20} />
          <h2 className="text-[12px] font-black uppercase tracking-widest text-primary/60">Calendario</h2>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => cambiarMes(-1)} className="p-2 hover:bg-primary/5 rounded-[var(--radius-btn)] text-primary/40">
            <ChevronLeft size={20} />
          </button>
          <span className="text-[11px] font-black uppercase tracking-widest text-primary min-w-35 text-center">
            {MESES[mesActual]} {añoActual}
          </span>
          <button onClick={() => cambiarMes(1)} className="p-2 hover:bg-primary/5 rounded-[var(--radius-btn)] text-primary/40">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-3 shrink-0">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(d => (
          <div key={d} className="text-center text-[8px] font-black uppercase text-primary/20 mb-1">{d}</div>
        ))}
        {Array.from({ length: primerDiaSemana }).map((_, i) => <div key={`empty-${i}`} className="aspect-square" />)}
        {Array.from({ length: diasEnMes }).map((_, i) => {
          const dia = i + 1;
          const estaSeleccionado = dia === diaSeleccionado;
          const tieneAlgo = tieneAlgoElDia(dia);
          return (
            <motion.div
              key={dia}
              onClick={() => setDiaSeleccionado(dia)}
              whileHover={{ scale: 1.05 }}
              className={cn(
                "aspect-square rounded-[var(--radius-btn)] border flex flex-col items-center justify-center relative transition-all cursor-pointer",
                estaSeleccionado
                  ? "bg-primary text-btn-text border-primary shadow-lg shadow-primary/30"
                  : "bg-primary/5 border-primary/5 hover:bg-white-custom hover:border-primary/20 text-foreground"
              )}
            >
              <span className="text-xs font-black">{dia}</span>
              {tieneAlgo && (
                <div className={cn("absolute bottom-2 w-1.5 h-1.5 rounded-full", estaSeleccionado ? "bg-white-custom" : "bg-primary")} />
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="bg-primary/5 rounded-[var(--radius-btn)] p-3 mb-3 border border-primary/10 shrink-0">
        <div className="flex items-center gap-3 mb-2">
          <Bookmark size={16} className="text-primary/40" />
          <span className="text-[10px] font-black uppercase tracking-widest text-primary/40">
            Nuevo evento para el día {diaSeleccionado}
          </span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={nuevoEvento}
            onChange={(e) => setNuevoEvento(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddEvento()}
            placeholder='"Nombre del evento..."'
            className="flex-1 bg-white-custom rounded-[var(--radius-btn)] px-4 py-2 text-xs text-primary font-bold outline-none border border-primary/10 focus:border-primary/30"
          />
          <BtnIcon loading={isAddingEvento} disabled={!nuevoEvento.trim()} onClick={handleAddEvento} className="rounded-[var(--radius-btn)] w-10 h-10 shrink-0">
            <Plus size={16} />
          </BtnIcon>
        </div>
      </div>

      <div className="pt-3 border-t border-primary/10 flex-1 overflow-y-auto min-h-0">
        <h3 className="text-[9px] font-black uppercase tracking-widest text-primary/30 mb-2 px-2">
          Planes para el {diaSeleccionado}
        </h3>
        <div className="space-y-3">
          {itemsCombinadosDelDia.length > 0 ? (
            itemsCombinadosDelDia.map((item: any) => (
              <motion.div
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={item.id}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-[var(--radius-card)] border transition-all",
                  item.esCapitulo ? "bg-primary/10 border-primary/20" : "bg-primary/5 border-primary/10"
                )}
              >
                <div className="w-10 h-10 bg-white-custom rounded-[var(--radius-btn)] flex items-center justify-center shadow-sm">
                  {item.esCapitulo
                    ? <BookOpen size={18} className="text-primary" />
                    : <span className="text-[14px] font-black text-primary">{diaSeleccionado}</span>
                  }
                </div>
                <div>
                  <p className="text-[11px] font-black text-foreground uppercase italic">"{item.titulo}"</p>
                  <p className="text-[9px] font-bold text-primary/40 uppercase tracking-tighter">"{item.tipo}"</p>
                </div>
                {item.esCapitulo && (
                  <div className="ml-auto">
                    <span className="text-[8px] font-black bg-primary text-white px-2 py-1 rounded-full uppercase tracking-tighter italic">Capítulo</span>
                  </div>
                )}
              </motion.div>
            ))
          ) : (
            <p className="text-[10px] font-bold text-primary/20 italic px-2">"No hay eventos para este día."</p>
          )}
        </div>
      </div>
    </div>
  );
};