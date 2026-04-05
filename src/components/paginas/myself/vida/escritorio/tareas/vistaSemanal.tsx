"use client";
import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Calendar, BookOpen, Bookmark, Plus } from "lucide-react";
import { BtnIcon } from "@/components/ui";
import {
  VistaOpcion, Evento, EventoBadge,
  DIAS_SEMANA_CORTO, DIAS_SEMANA_LETRA, MESES, VISTAS, TIPOS_EVENTO,
  addDays, isSameDay, toUTCDate,
} from "./types";

// ── Columna día (en la vista de semana) ─────────────────────────────────────

const ColumniaDia = ({
  fecha, eventos, esHoy, seleccionado, onClick, compact,
}: {
  fecha: Date; eventos: Evento[]; esHoy: boolean;
  seleccionado: boolean; onClick: () => void; compact: boolean;
}) => (
  <div
    onClick={onClick}
    className={cn(
      "flex flex-col min-h-0 flex-1 rounded-[var(--radius-btn)] border transition-all cursor-pointer group",
      seleccionado
        ? "bg-primary/5 border-primary/30 shadow-md shadow-primary/10"
        : "bg-white-custom border-primary/10 hover:border-primary/25 hover:shadow-sm",
      esHoy && !seleccionado && "border-primary/25 bg-primary/5"
    )}
  >
    {/* Cabecera día */}
    <div className={cn(
      "flex flex-col items-center py-2 border-b gap-0.5 transition-colors shrink-0",
      seleccionado ? "border-primary/15" : "border-primary/5"
    )}>
      <span className={cn(
        "text-[7px] font-black uppercase tracking-widest transition-colors",
        esHoy ? "text-primary" : "text-primary/30"
      )}>
        {compact ? DIAS_SEMANA_LETRA[fecha.getDay()] : DIAS_SEMANA_CORTO[fecha.getDay()]}
      </span>
      <div className={cn(
        "w-7 h-7 rounded-[var(--radius-btn)] flex items-center justify-center transition-all",
        esHoy
          ? "bg-primary text-white shadow-md shadow-primary/30"
          : seleccionado
          ? "bg-primary/15 text-primary"
          : "text-primary/50 group-hover:bg-primary/8"
      )}>
        <span className="text-xs font-black">{fecha.getDate()}</span>
      </div>
    </div>

    {/* Eventos del día */}
    <div className="flex flex-col gap-1 p-1.5 flex-1 overflow-y-auto min-h-0">
      {eventos.length === 0 && (
        <p className="text-[7px] text-primary/15 font-bold italic text-center mt-3">—</p>
      )}
      {eventos.map((ev) => <EventoBadge key={ev.id} item={ev} compact={compact} />)}
    </div>
  </div>
);

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  eventos: any[];
  capitulosRaw: any[];
  isAddingEvento: boolean;
  onAddEvento: (fecha: string, titulo: string, tipo: string) => Promise<void>;
}

// En móvil, las vistas de 5 y 7 días quedan muy apretadas.
// Limitamos el selector a 1/3/5 días en pantallas pequeñas vía JS (según viewport).
const VISTAS_MOVIL: VistaOpcion[] = [1, 3, 5];

export const VistaSemanal = ({ eventos, capitulosRaw, isAddingEvento, onAddEvento }: Props) => {
  const [vista, setVista] = useState<VistaOpcion>(7);
  const [fechaBase, setFechaBase] = useState<Date>(() => {
    const hoy = new Date();
    const dia = hoy.getDay();
    const diff = dia === 0 ? -6 : 1 - dia;
    hoy.setDate(hoy.getDate() + diff);
    hoy.setHours(0, 0, 0, 0);
    return hoy;
  });
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date>(new Date());
  const [nuevoEvento, setNuevoEvento] = useState("");
  const [tipoEvento, setTipoEvento] = useState("Plan");

  const hoy = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);

  const diasVista = useMemo(() =>
    Array.from({ length: vista }, (_, i) => addDays(fechaBase, i)),
    [fechaBase, vista]
  );

  const rangoTexto = useMemo(() => {
    if (diasVista.length === 1) {
      const d = diasVista[0];
      return `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
    }
    const ini = diasVista[0];
    const fin = diasVista[diasVista.length - 1];
    if (ini.getMonth() === fin.getMonth())
      return `${ini.getDate()}–${fin.getDate()} ${MESES[ini.getMonth()].slice(0, 3)} ${ini.getFullYear()}`;
    return `${ini.getDate()} ${MESES[ini.getMonth()].slice(0, 3)} – ${fin.getDate()} ${MESES[fin.getMonth()].slice(0, 3)} ${fin.getFullYear()}`;
  }, [diasVista]);

  const navegar = (dir: 1 | -1) => setFechaBase(prev => addDays(prev, dir * vista));

  const irAHoy = () => {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    if (vista === 7 || vista === 5) {
      const dia = d.getDay();
      d.setDate(d.getDate() + (dia === 0 ? -6 : 1 - dia));
    }
    setFechaBase(d);
    setDiaSeleccionado(new Date());
  };

  const eventosDelDia = useCallback((fecha: Date): Evento[] => {
    const evs = eventos
      .filter(e => e.fecha && isSameDay(toUTCDate(e.fecha), fecha))
      .map(e => ({ ...e, esCapitulo: false }));
    const caps = capitulosRaw
      .filter(c => isSameDay(toUTCDate(c.fecha_publicacion), fecha))
      .map(c => ({ id: c.id, titulo: c.titulo_capitulo, tipo: "Lanzamiento Libro", esCapitulo: true }));
    return [...evs, ...caps];
  }, [eventos, capitulosRaw]);

  const eventosDiaSeleccionado = useMemo(
    () => eventosDelDia(diaSeleccionado),
    [eventosDelDia, diaSeleccionado]
  );

  const handleAdd = async () => {
    if (!nuevoEvento.trim()) return;
    await onAddEvento(diaSeleccionado.toISOString(), nuevoEvento, tipoEvento);
    setNuevoEvento("");
  };

  const compact = vista >= 5;

  return (
    <div className="bg-white-custom border border-primary/10 rounded-[var(--radius-card)] p-4 shadow-xl shadow-primary/5 flex flex-col gap-3 lg:flex-1 lg:overflow-hidden">

      {/* ── Barra superior ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 shrink-0">
        {/* Navegación + rango */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={irAHoy}
            className="text-[9px] font-black uppercase tracking-widest border border-primary/20 text-primary px-3 py-1.5 rounded-[var(--radius-btn)] hover:bg-primary hover:text-white transition-all shrink-0"
          >
            Hoy
          </button>
          <button
            onClick={() => navegar(-1)}
            className="p-1.5 hover:bg-primary/8 rounded-[var(--radius-btn)] text-primary/40 hover:text-primary transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => navegar(1)}
            className="p-1.5 hover:bg-primary/8 rounded-[var(--radius-btn)] text-primary/40 hover:text-primary transition-all"
          >
            <ChevronRight size={16} />
          </button>
          <span className="text-[10px] font-black uppercase tracking-wider text-primary/70 flex-1 truncate">
            {rangoTexto}
          </span>
        </div>

        {/* Selector de vista — en móvil muestra versión corta */}
        <div className="flex items-center gap-1 bg-primary/5 rounded-[var(--radius-btn)] p-1 self-start">
          {VISTAS.map((v) => (
            <button
              key={v.valor}
              onClick={() => setVista(v.valor)}
              className={cn(
                "text-[8px] font-black uppercase tracking-wide px-2 py-1.5 rounded-[var(--radius-btn)] transition-all",
                vista === v.valor
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "text-primary/40 hover:text-primary hover:bg-white-custom"
              )}
            >
              <span className="hidden sm:inline">{v.label}</span>
              <span className="sm:hidden">{v.short}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Grid de columnas por día ─────────────────────────────────────── */}
      {/*
        En móvil: si hay 5 o 7 días, las columnas quedan muy estrechas.
        Usamos overflow-x-auto como escape hatch para no cortar el contenido.
        En lg: el flex-1 + min-h-0 maneja el scroll vertical interno.
      */}
      <div className="flex-1 lg:min-h-0 min-h-[220px] overflow-x-auto lg:overflow-x-visible">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${vista}-${fechaBase.toISOString()}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="h-full"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(vista, 7)}, minmax(${compact ? "5rem" : "7rem"}, 1fr))`,
              gap: "0.375rem",
              // En mobile hace scroll horizontal si las cols no caben
              minWidth: compact ? `${vista * 5}rem` : `${vista * 7}rem`,
            }}
          >
            {diasVista.map((fecha) => (
              <ColumniaDia
                key={fecha.toISOString()}
                fecha={fecha}
                eventos={eventosDelDia(fecha)}
                esHoy={isSameDay(fecha, hoy)}
                seleccionado={isSameDay(fecha, diaSeleccionado)}
                onClick={() => setDiaSeleccionado(fecha)}
                compact={compact}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Panel inferior: añadir + lista del día seleccionado ─────────── */}
      <div className="bg-primary/5 rounded-[var(--radius-btn)] p-3 border border-primary/10 shrink-0">
        {/* Cabecera fecha */}
        <div className="flex items-center gap-2 mb-2">
          <Calendar size={12} className="text-primary/40" />
          <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">
            {diaSeleccionado.getDate()} de {MESES[diaSeleccionado.getMonth()]} · {DIAS_SEMANA_CORTO[diaSeleccionado.getDay()]}
          </span>
        </div>

        {/* Input nuevo evento — stack en móvil */}
        <div className="flex flex-col sm:flex-row gap-2 mb-2">
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
              onChange={e => setNuevoEvento(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              placeholder="Nuevo evento..."
              className="flex-1 bg-white-custom border border-primary/10 rounded-[var(--radius-btn)] px-4 py-2 text-[10px] font-bold text-primary placeholder:text-primary/25 outline-none focus:border-primary/30 min-w-0"
            />
            <BtnIcon
              loading={isAddingEvento}
              disabled={!nuevoEvento.trim()}
              onClick={handleAdd}
              className="rounded-[var(--radius-btn)] w-10 h-10 shrink-0"
            >
              <Plus size={14} />
            </BtnIcon>
          </div>
        </div>

        {/* Eventos del día — scroll limitado */}
        <div className="space-y-1.5 max-h-32 overflow-y-auto">
          {eventosDiaSeleccionado.length === 0 ? (
            <p className="text-[9px] font-bold text-primary/20 italic px-1">Sin eventos para este día.</p>
          ) : eventosDiaSeleccionado.map(ev => (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "flex items-center gap-3 p-2.5 rounded-[var(--radius-btn)] border",
                ev.esCapitulo
                  ? "bg-amber-500/10 border-amber-500/20"
                  : "bg-white-custom border-primary/10 shadow-sm"
              )}
            >
              <div className="w-7 h-7 bg-primary/8 rounded-[var(--radius-btn)] flex items-center justify-center shrink-0">
                {ev.esCapitulo
                  ? <BookOpen size={12} className="text-amber-600" />
                  : <Bookmark size={12} className="text-primary/50" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black text-foreground uppercase italic truncate">"{ev.titulo}"</p>
                <p className="text-[7px] font-bold text-primary/35 uppercase tracking-tight">{ev.tipo}</p>
              </div>
              {ev.esCapitulo && (
                <span className="text-[7px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded-full uppercase shrink-0">Cap.</span>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};