"use client";
import { MotionDiv, MotionButton } from "@/components/ui/Motion";
import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, BookOpen, Plus } from "lucide-react";
import { BtnIcon } from "@/components/ui";
import { MESES, TIPOS_EVENTO } from "./types";

interface Props {
  eventos: any[];
  capitulosRaw: any[];
  isAddingEvento: boolean;
  onAddEvento: (fechaISO: string, titulo: string, tipo: string) => Promise<void>;
}

export const VistaMes = ({ eventos, capitulosRaw, isAddingEvento, onAddEvento }: Props) => {
  const [fechaViz, setFechaViz] = useState(new Date());
  // Estado local del día seleccionado (dentro del mes visualizado)
  const [diaSeleccionado, setDiaSeleccionado] = useState(new Date().getDate());
  const [nuevoEvento, setNuevoEvento] = useState("");
  const [tipoEvento, setTipoEvento] = useState("Plan");

  const { diasEnMes, primerDia, mesActual, añoActual } = useMemo(() => {
    const año = fechaViz.getFullYear();
    const mes = fechaViz.getMonth();
    const dias = new Date(año, mes + 1, 0).getDate();
    let pd = new Date(año, mes, 1).getDay();
    pd = pd === 0 ? 6 : pd - 1;
    return { diasEnMes: dias, primerDia: pd, mesActual: mes, añoActual: año };
  }, [fechaViz]);

  const cambiarMes = (offset: number) => {
    setFechaViz(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    setDiaSeleccionado(1);
  };

  // Crea el evento con el mes y año que el usuario está viendo, no el mes actual del sistema
  const handleAdd = async () => {
    if (!nuevoEvento.trim()) return;
    const fechaISO = new Date(añoActual, mesActual, diaSeleccionado, 12, 0, 0).toISOString();
    await onAddEvento(fechaISO, nuevoEvento, tipoEvento);
    setNuevoEvento("");
  };

  const tieneAlgo = (dia: number) =>
    eventos.some((e: any) => {
      const d = new Date(e.fecha);
      return d.getUTCDate() === dia && d.getUTCMonth() === mesActual && d.getUTCFullYear() === añoActual;
    }) ||
    capitulosRaw.some((c: any) => {
      const d = new Date(c.fecha_publicacion);
      return d.getUTCDate() === dia && d.getUTCMonth() === mesActual && d.getUTCFullYear() === añoActual;
    });

  const itemsDia = useMemo(() => {
    const evs = eventos
      .filter((e: any) => {
        const d = new Date(e.fecha);
        return d.getUTCDate() === diaSeleccionado && d.getUTCMonth() === mesActual && d.getUTCFullYear() === añoActual;
      })
      .map(e => ({ ...e, esCapitulo: false }));
    const caps = capitulosRaw
      .filter((c: any) => {
        const d = new Date(c.fecha_publicacion);
        return d.getUTCDate() === diaSeleccionado && d.getUTCMonth() === mesActual && d.getUTCFullYear() === añoActual;
      })
      .map(c => ({ id: c.id, titulo: c.titulo_capitulo, tipo: "Lanzamiento Libro", esCapitulo: true }));
    return [...evs, ...caps];
  }, [eventos, capitulosRaw, diaSeleccionado, mesActual, añoActual]);

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Nav mes */}
      <div className="flex items-center justify-center gap-4 px-5 py-2 border-b border-primary/8 shrink-0">
        <button
          onClick={() => cambiarMes(-1)}
          className="p-1 text-primary/40 hover:text-primary transition-colors"
        >
          <ChevronLeft size={13} />
        </button>
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary min-w-[9rem] text-center">
          {MESES[mesActual]} {añoActual}
        </span>
        <button
          onClick={() => cambiarMes(1)}
          className="p-1 text-primary/40 hover:text-primary transition-colors"
        >
          <ChevronRight size={13} />
        </button>
      </div>

      {/* Cuerpo con scroll */}
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto px-4 py-3 gap-2">

        {/* Cabecera días semana */}
        <div className="grid grid-cols-7 shrink-0">
          {["L","M","X","J","V","S","D"].map(d => (
            <div key={d} className="text-center text-[7px] font-black uppercase text-primary/30 dark:text-primary/50 pb-1">{d}</div>
          ))}
        </div>

        {/* Grilla días — h-9 fijo, equilibrio entre compacto y legible */}
        <div className="grid grid-cols-7 gap-1 shrink-0">
          {Array.from({ length: primerDia }).map((_, i) => (
            <div key={`e-${i}`} className="h-9" />
          ))}
          {Array.from({ length: diasEnMes }).map((_, i) => {
            const dia = i + 1;
            const sel = dia === diaSeleccionado;
            const hoy =
              dia === new Date().getDate() &&
              mesActual === new Date().getMonth() &&
              añoActual === new Date().getFullYear();

            return (
              <MotionButton
                key={dia}
                onClick={() => setDiaSeleccionado(dia)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                className={cn(
                  "h-9 w-full rounded-[var(--radius-btn)] flex flex-col items-center justify-center relative",
                  "text-[11px] font-black transition-all",
                  sel
                    ? "bg-primary text-white shadow-sm shadow-primary/20"
                    : hoy
                      ? "bg-primary/10 text-primary dark:bg-primary/20"
                      : "text-foreground/65 hover:bg-primary/7 dark:text-foreground/75"
                )}
              >
                {dia}
                {tieneAlgo(dia) && (
                  <span className={cn(
                    "absolute bottom-[2px] w-[3px] h-[3px] rounded-full",
                    sel ? "bg-white/60" : "bg-primary/50"
                  )} />
                )}
              </MotionButton>
            );
          })}
        </div>

        {/* Panel día seleccionado */}
        <div className="flex flex-col gap-2 border-t border-primary/8 pt-2.5 mt-0.5">

          <span className="text-[8px] font-black uppercase tracking-widest text-primary/40 shrink-0">
            {diaSeleccionado} {MESES[mesActual].slice(0, 3)} {añoActual}
          </span>

          {/* Formulario */}
          <div className="flex gap-1.5 shrink-0">
            <select
              value={tipoEvento}
              onChange={e => setTipoEvento(e.target.value)}
              className="bg-primary/8 dark:bg-primary/15 border border-transparent rounded-[var(--radius-btn)] px-2 py-1.5 text-[9px] font-black text-primary outline-none focus:border-primary/20 cursor-pointer"
            >
              {TIPOS_EVENTO.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input
              type="text"
              value={nuevoEvento}
              onChange={e => setNuevoEvento(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              placeholder="Añadir evento..."
              className="flex-1 bg-primary/5 dark:bg-primary/10 rounded-[var(--radius-btn)] px-3 py-1.5 text-[11px] text-foreground font-semibold outline-none border border-transparent focus:border-primary/20 focus:bg-background transition-all min-w-0 placeholder:text-foreground/25"
            />
            <BtnIcon
              loading={isAddingEvento}
              disabled={!nuevoEvento.trim()}
              onClick={handleAdd}
              className="rounded-[var(--radius-btn)] w-8 h-8 shrink-0"
            >
              <Plus size={12} />
            </BtnIcon>
          </div>

          {/* Lista de eventos */}
          <div className="flex flex-col gap-1.5">
            {itemsDia.length === 0 ? (
              <p className="text-[9px] font-medium text-foreground/20 italic pt-0.5">Sin eventos.</p>
            ) : itemsDia.map((item: any) => (
              <MotionDiv
                key={item.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-[var(--radius-btn)] border shrink-0",
                  item.esCapitulo
                    ? "bg-amber-500/10 border-amber-500/20 dark:bg-amber-500/15 dark:border-amber-500/30"
                    : "bg-primary/5 dark:bg-primary/10 border-primary/10"
                )}
              >
                <div className="w-5 h-5 bg-background rounded flex items-center justify-center shadow-sm shrink-0 border border-primary/8">
                  {item.esCapitulo
                    ? <BookOpen size={10} className="text-amber-500" />
                    : <span className="text-[8px] font-black text-primary">{diaSeleccionado}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-foreground/90 truncate">{item.titulo}</p>
                  <p className="text-[7px] font-semibold text-primary/40 uppercase tracking-wide">{item.tipo}</p>
                </div>
                {item.esCapitulo && (
                  <span className="text-[6px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded-full uppercase shrink-0">
                    Cap.
                  </span>
                )}
              </MotionDiv>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};