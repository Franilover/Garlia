"use client";
import { MotionDiv, MotionButton } from "@/components/ui/Motion";
import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, BookOpen, Plus } from "lucide-react";
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
    <div className="
      bg-white-custom border border-primary/10
      rounded-[var(--radius-card)] shadow-xl shadow-primary/5
      flex flex-col h-full overflow-hidden
    ">
      {/* ── Header: navegación de mes ── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-primary/6 shrink-0">
        <button
          onClick={() => cambiarMes(-1)}
          className="p-1.5 hover:bg-primary/6 rounded-[var(--radius-btn)] text-primary/35 hover:text-primary transition-all"
        >
          <ChevronLeft size={15} />
        </button>

        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">
          {MESES[mesActual]} {añoActual}
        </span>

        <button
          onClick={() => cambiarMes(1)}
          className="p-1.5 hover:bg-primary/6 rounded-[var(--radius-btn)] text-primary/35 hover:text-primary transition-all"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {/* ── Cuerpo: grilla + panel día ── */}
      <div className="flex flex-col flex-1 min-h-0 p-4 gap-4">

        {/* Días de la semana */}
        <div className="grid grid-cols-7 shrink-0">
          {["L", "M", "X", "J", "V", "S", "D"].map(d => (
            <div key={d} className="text-center text-[8px] font-black uppercase text-primary/20 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Grilla de días — ocupa espacio flexible */}
        <div className="grid grid-cols-7 gap-1 shrink-0">
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
              <MotionButton
                key={dia}
                onClick={() => setDiaSeleccionado(dia)}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                className={cn(
                  "aspect-square rounded-[var(--radius-btn)] border flex flex-col items-center justify-center relative transition-all text-[11px] font-black",
                  estaSeleccionado
                    ? "bg-primary text-btn-text border-primary shadow-lg shadow-primary/25"
                    : esHoy
                    ? "bg-primary/10 border-primary/25 text-primary"
                    : "bg-transparent border-transparent hover:bg-primary/5 hover:border-primary/10 text-foreground/70"
                )}
              >
                {dia}
                {tieneAlgo && (
                  <span className={cn(
                    "absolute bottom-[4px] w-1 h-1 rounded-full",
                    estaSeleccionado ? "bg-white/60" : "bg-primary/50"
                  )} />
                )}
              </MotionButton>
            );
          })}
        </div>

        {/* ── Panel del día seleccionado ── */}
        <div className="flex flex-col flex-1 min-h-0 border-t border-primary/6 pt-3 gap-3">

          {/* Header del día + form inline */}
          <div className="flex flex-col gap-2 shrink-0">
            <span className="text-[9px] font-black uppercase tracking-widest text-primary/35">
              {diaSeleccionado} de {MESES[mesActual]}
            </span>

            <div className="flex gap-2">
              <select
                value={tipoEvento}
                onChange={e => setTipoEvento(e.target.value)}
                className="bg-primary/5 border border-primary/8 rounded-[var(--radius-btn)] px-2 py-2 text-[9px] font-black text-primary outline-none focus:border-primary/25 cursor-pointer"
              >
                {TIPOS_EVENTO.map(t => <option key={t} value={t}>{t}</option>)}
              </select>

              <div className="flex gap-1.5 flex-1">
                <input
                  type="text"
                  value={nuevoEvento}
                  onChange={(e) => setNuevoEvento(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddEvento()}
                  placeholder="Añadir evento..."
                  className="
                    flex-1 bg-primary/4 rounded-[var(--radius-btn)] px-3 py-2
                    text-xs text-primary font-semibold outline-none
                    border border-transparent focus:border-primary/20 focus:bg-white-custom
                    min-w-0 transition-all placeholder:text-primary/20
                  "
                />
                <BtnIcon
                  loading={isAddingEvento}
                  disabled={!nuevoEvento.trim()}
                  onClick={handleAddEvento}
                  className="rounded-[var(--radius-btn)] w-9 h-9 shrink-0"
                >
                  <Plus size={14} />
                </BtnIcon>
              </div>
            </div>
          </div>

          {/* Eventos del día */}
          <div className="flex flex-col gap-1.5 overflow-y-auto flex-1 min-h-0">
            {itemsCombinadosDelDia.length === 0 ? (
              <p className="text-[10px] font-medium text-primary/20 italic pt-2">
                Sin eventos para este día.
              </p>
            ) : (
              itemsCombinadosDelDia.map((item: any) => (
                <MotionDiv
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={item.id}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-btn)] border shrink-0",
                    item.esCapitulo
                      ? "bg-amber-50 border-amber-200/60"
                      : "bg-primary/4 border-primary/8"
                  )}
                >
                  <div className="w-6 h-6 bg-white-custom rounded-[var(--radius-btn)] flex items-center justify-center shadow-sm shrink-0">
                    {item.esCapitulo
                      ? <BookOpen size={11} className="text-amber-600" />
                      : <span className="text-[9px] font-black text-primary">{diaSeleccionado}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-foreground truncate">{item.titulo}</p>
                    <p className="text-[8px] font-semibold text-primary/35 uppercase tracking-wide">{item.tipo}</p>
                  </div>
                  {item.esCapitulo && (
                    <span className="text-[7px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded-full uppercase shrink-0">
                      Cap.
                    </span>
                  )}
                </MotionDiv>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};