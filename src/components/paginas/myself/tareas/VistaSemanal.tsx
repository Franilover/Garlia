"use client";
import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Calendar, BookOpen, Bookmark, Plus } from "lucide-react";
import { BtnIcon } from "@/components/ui";
import { VistaOpcion, Evento, DIAS_SEMANA_CORTO, DIAS_SEMANA_LETRA, MESES, VISTAS, addDays, isSameDay, toUTCDate } from "./types";

const EventoBadge = ({ item, compact = false }: { item: Evento; compact?: boolean }) => {
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
    <div className={cn(
      "flex flex-col items-center py-3 border-b gap-0.5 transition-colors",
      seleccionado ? "border-primary/15" : "border-primary/5"
    )}>
      <span className={cn(
        "text-[8px] font-black uppercase tracking-widest transition-colors",
        esHoy ? "text-primary" : "text-primary/30"
      )}>
        {compact ? DIAS_SEMANA_LETRA[fecha.getDay()] : DIAS_SEMANA_CORTO[fecha.getDay()]}
      </span>
      <div className={cn(
        "w-8 h-8 rounded-[var(--radius-btn)] flex items-center justify-center transition-all",
        esHoy
          ? "bg-primary text-white shadow-md shadow-primary/30"
          : seleccionado
          ? "bg-primary/15 text-primary"
          : "text-primary/50 group-hover:bg-primary/8"
      )}>
        <span className="text-sm font-black">{fecha.getDate()}</span>
      </div>
    </div>
    <div className="flex flex-col gap-1 p-2 flex-1 overflow-y-auto">
      {eventos.length === 0 && (
        <p className="text-[8px] text-primary/15 font-bold italic text-center mt-4">—</p>
      )}
      {eventos.map((ev) => <EventoBadge key={ev.id} item={ev} compact={compact} />)}
    </div>
  </div>
);

interface Props {
  eventos: any[];
  capitulosRaw: any[];
  isAddingEvento: boolean;
  onAddEvento: (fecha: string, titulo: string, tipo: string) => Promise<void>;
}

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

  const hoy = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  const diasVista = useMemo(() =>
    Array.from({ length: vista }, (_, i) => addDays(fechaBase, i)),
    [fechaBase, vista]
  );

  const rangoTexto = useMemo(() => {
    if (diasVista.length === 1) {
      const d = diasVista[0];
      return `${d.getDate()} de ${MESES[d.getMonth()]} ${d.getFullYear()}`;
    }
    const ini = diasVista[0];
    const fin = diasVista[diasVista.length - 1];
    if (ini.getMonth() === fin.getMonth())
      return `${ini.getDate()}–${fin.getDate()} de ${MESES[ini.getMonth()]} ${ini.getFullYear()}`;
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
    <div className="bg-white-custom border border-primary/10 rounded-[var(--radius-card)] p-5 shadow-xl shadow-primary/5 flex flex-col gap-3 flex-1 overflow-hidden">
      {}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <button onClick={irAHoy} className="text-[9px] font-black uppercase tracking-widest border border-primary/20 text-primary px-3 py-1.5 rounded-[var(--radius-btn)] hover:bg-primary hover:text-white transition-all">
            Hoy
          </button>
          <button onClick={() => navegar(-1)} className="p-1.5 hover:bg-primary/8 rounded-[var(--radius-btn)] text-primary/40 hover:text-primary transition-all">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => navegar(1)} className="p-1.5 hover:bg-primary/8 rounded-[var(--radius-btn)] text-primary/40 hover:text-primary transition-all">
            <ChevronRight size={18} />
          </button>
          <span className="text-[11px] font-black uppercase tracking-wider text-primary/70 ml-1">{rangoTexto}</span>
        </div>
        <div className="flex items-center gap-1 bg-primary/5 rounded-[var(--radius-btn)] p-1">
          {VISTAS.map((v) => (
            <button
              key={v.valor}
              onClick={() => setVista(v.valor)}
              className={cn(
                "text-[9px] font-black uppercase tracking-wide px-3 py-1.5 rounded-[var(--radius-btn)] transition-all",
                vista === v.valor ? "bg-primary text-white shadow-md shadow-primary/20" : "text-primary/40 hover:text-primary hover:bg-white-custom"
              )}
            >
              <span className="hidden sm:inline">{v.label}</span>
              <span className="sm:hidden">{v.short}</span>
            </button>
          ))}
        </div>
      </div>

      {}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${vista}-${fechaBase.toISOString()}`}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
          className="flex gap-2 flex-1 min-h-0"
          style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(vista, 7)}, minmax(0, 1fr))` }}
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

      {}
      <div className="bg-primary/5 rounded-[var(--radius-btn)] p-3 border border-primary/10 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <Calendar size={14} className="text-primary/40" />
          <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">
            {diaSeleccionado.getDate()} de {MESES[diaSeleccionado.getMonth()]} · {DIAS_SEMANA_CORTO[diaSeleccionado.getDay()]}
          </span>
        </div>
        <div className="flex gap-2 mb-2">
          <select
            value={tipoEvento}
            onChange={e => setTipoEvento(e.target.value)}
            className="bg-white-custom border border-primary/10 rounded-[var(--radius-btn)] px-3 py-2 text-[10px] font-black text-primary outline-none focus:border-primary/30 cursor-pointer"
          >
            {["Plan", "Reunión", "Personal"].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            type="text"
            value={nuevoEvento}
            onChange={e => setNuevoEvento(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder='"Nuevo evento..."'
            className="flex-1 bg-white-custom border border-primary/10 rounded-[var(--radius-btn)] px-4 py-2 text-[10px] font-bold text-primary placeholder:text-primary/25 outline-none focus:border-primary/30"
          />
          <BtnIcon loading={isAddingEvento} disabled={!nuevoEvento.trim()} onClick={handleAdd} className="rounded-[var(--radius-btn)] w-10 h-10 shrink-0">
            <Plus size={14} />
          </BtnIcon>
        </div>

        {}
        <div className="space-y-1.5 max-h-24 overflow-y-auto">
          {eventosDiaSeleccionado.length === 0 ? (
            <p className="text-[9px] font-bold text-primary/20 italic px-1">"Sin eventos para este día."</p>
          ) : eventosDiaSeleccionado.map(ev => (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-[var(--radius-btn)] border",
                ev.esCapitulo ? "bg-amber-500/10 border-amber-500/20" : "bg-white-custom border-primary/10 shadow-sm"
              )}
            >
              <div className="w-8 h-8 bg-primary/8 rounded-[var(--radius-btn)] flex items-center justify-center shrink-0">
                {ev.esCapitulo
                  ? <BookOpen size={14} className="text-amber-600" />
                  : <Bookmark size={14} className="text-primary/50" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-foreground uppercase italic truncate">"{ev.titulo}"</p>
                <p className="text-[8px] font-bold text-primary/35 uppercase tracking-tight">{ev.tipo}</p>
              </div>
              {ev.esCapitulo && (
                <span className="text-[7px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-full uppercase tracking-tight shrink-0">Capítulo</span>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};