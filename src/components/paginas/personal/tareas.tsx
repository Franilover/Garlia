"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { tareasQueries } from "@/lib/api/queries/personal/tareas";
import { eventosQueries } from "@/lib/api/queries/personal/eventos";
import {
  CheckSquare,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  BookOpen,
  Clock,
  Calendar,
} from "lucide-react";

// ─── TIPOS ────────────────────────────────────────────────────────────────────
type VistaOpcion = 1 | 2 | 3 | 4 | 5 | 7;
type ModoCalendario = "mes" | "semana";

interface Evento {
  id: string;
  titulo: string;
  tipo: string;
  fecha?: string;
  esCapitulo?: boolean;
}

// ─── CONSTANTES ───────────────────────────────────────────────────────────────
const DIAS_SEMANA_CORTO = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DIAS_SEMANA_LETRA = ["D", "L", "M", "X", "J", "V", "S"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const VISTAS: { valor: VistaOpcion; label: string; short: string }[] = [
  { valor: 1, label: "Día",      short: "1D" },
  { valor: 2, label: "2 Días",   short: "2D" },
  { valor: 3, label: "3 Días",   short: "3D" },
  { valor: 4, label: "4 Días",   short: "4D" },
  { valor: 5, label: "Semana L", short: "5D" },
  { valor: 7, label: "Semana",   short: "7D" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const addDays = (date: Date, n: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};
const isSameDay = (a: Date, b: Date) =>
  a.getUTCFullYear() === b.getUTCFullYear() &&
  a.getUTCMonth() === b.getUTCMonth() &&
  a.getUTCDate() === b.getUTCDate();
const toUTCDate = (str: string) => {
  const d = new Date(str);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

// ─── RELOJ DIGITAL ────────────────────────────────────────────────────────────
const RelojDigital = ({ horario }: { horario: any[] }) => {
  const [hora, setHora] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setHora(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatoHora = hora.toLocaleTimeString("es-CL", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });

  const actividadActual = useMemo(() => {
    if (!horario || horario.length === 0) return null;
    const diaActual = hora.getDay();
    const ahoraStr = hora.toLocaleTimeString("es-CL", { hour12: false });
    return horario.find((item) =>
      item.dias_semana?.includes(diaActual) &&
      ahoraStr >= item.hora_inicio &&
      ahoraStr <= item.hora_fin
    );
  }, [hora, horario]);

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 bg-primary text-white px-6 py-5 rounded-[30px] shadow-lg shadow-primary/20 mb-6 border border-white/10">
      <div className="flex items-center gap-4">
        <Clock size={24} className="animate-pulse text-white/80" />
        <div className="flex flex-col">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-50 italic">Tiempo Real</span>
          <span className="text-3xl font-black tracking-tighter tabular-nums italic">{formatoHora}</span>
        </div>
      </div>
      <div className="hidden sm:block h-10 w-[1px] bg-white/20 mx-2" />
      <div className="flex flex-col items-center sm:items-start">
        <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-50 italic">Actividad Programada</span>
        <span className="text-sm font-black uppercase tracking-tight italic text-white/90">
          {actividadActual ? actividadActual.actividad : "Tiempo Libre"}
        </span>
      </div>
    </div>
  );
};

// ─── BADGE EVENTO ─────────────────────────────────────────────────────────────
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
        "rounded-xl border px-2 py-1 flex items-center gap-1.5 cursor-default select-none",
        color,
        compact ? "text-[9px]" : "text-[10px]"
      )}
    >
      {item.esCapitulo && <BookOpen size={9} className="shrink-0" />}
      <span className="font-black uppercase tracking-tight truncate">{item.titulo}</span>
    </motion.div>
  );
};

// ─── COLUMNA DÍA (vista semanal) ──────────────────────────────────────────────
const ColumniaDia = ({
  fecha, eventos, esHoy, seleccionado, onClick, compact,
}: {
  fecha: Date; eventos: Evento[]; esHoy: boolean;
  seleccionado: boolean; onClick: () => void; compact: boolean;
}) => (
  <div
    onClick={onClick}
    className={cn(
      "flex flex-col min-h-55 rounded-2xl border transition-all cursor-pointer group",
      seleccionado
        ? "bg-primary/5 border-primary/30 shadow-md shadow-primary/10"
        : "bg-white border-primary/8 hover:border-primary/20 hover:shadow-sm",
      esHoy && !seleccionado && "border-primary/20 bg-primary/3"
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
        "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
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

// ─── VISTA MES (original) ─────────────────────────────────────────────────────
const VistaMes = ({
  eventos, capitulosRaw, diaSeleccionado, setDiaSeleccionado,
  nuevoEvento, setNuevoEvento, tipoEvento, setTipoEvento,
  isAddingEvento, handleAddEvento,
}: {
  eventos: any[]; capitulosRaw: any[];
  diaSeleccionado: number; setDiaSeleccionado: (d: number) => void;
  nuevoEvento: string; setNuevoEvento: (v: string) => void;
  tipoEvento: string; setTipoEvento: (v: string) => void;
  isAddingEvento: boolean; handleAddEvento: () => void;
}) => {
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
    <div className="bg-white border border-primary/10 rounded-[40px] p-8 shadow-xl shadow-primary/5 h-full">
      <div className="flex items-center justify-between mb-10 px-2">
        <div className="flex items-center gap-3">
          <CalendarIcon className="text-primary" size={20} />
          <h2 className="text-[12px] font-black uppercase tracking-widest text-primary/60">Calendario</h2>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => cambiarMes(-1)} className="p-2 hover:bg-primary/5 rounded-xl text-primary/40"><ChevronLeft size={20} /></button>
          <span className="text-[11px] font-black uppercase tracking-widest text-primary min-w-[140px] text-center">
            {MESES[mesActual]} {añoActual}
          </span>
          <button onClick={() => cambiarMes(1)} className="p-2 hover:bg-primary/5 rounded-xl text-primary/40"><ChevronRight size={20} /></button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-3 mb-8">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(d => (
          <div key={d} className="text-center text-[9px] font-black uppercase text-primary/20 mb-2">{d}</div>
        ))}
        {Array.from({ length: primerDiaSemana }).map((_, i) => <div key={`empty-${i}`} className="aspect-square" />)}
        {Array.from({ length: diasEnMes }).map((_, i) => {
          const dia = i + 1;
          const estaSeleccionado = dia === diaSeleccionado;
          const tieneAlgo = tieneAlgoElDia(dia);
          return (
            <motion.div key={dia} onClick={() => setDiaSeleccionado(dia)} whileHover={{ scale: 1.05 }}
              className={cn(
                "aspect-square rounded-2xl border flex flex-col items-center justify-center relative transition-all cursor-pointer",
                estaSeleccionado
                  ? "bg-primary text-white border-primary shadow-lg shadow-primary/30"
                  : "bg-primary/5 border-transparent text-primary/60 hover:bg-white hover:border-primary/20"
              )}>
              <span className="text-sm font-black">{dia}</span>
              {tieneAlgo && (
                <div className={cn("absolute bottom-2 w-1.5 h-1.5 rounded-full", estaSeleccionado ? "bg-white" : "bg-primary")} />
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="bg-primary/5 rounded-3xl p-4 mb-6 border border-primary/5">
        <div className="flex items-center gap-3 mb-3">
          <Bookmark size={16} className="text-primary/40" />
          <span className="text-[10px] font-black uppercase tracking-widest text-primary/40">
            Nuevo evento para el día {diaSeleccionado}
          </span>
        </div>
        <div className="flex gap-2">
          <input type="text" value={nuevoEvento}
            onChange={(e) => setNuevoEvento(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddEvento()}
            placeholder='"Nombre del evento..."'
            className="flex-1 bg-white rounded-xl px-4 py-2 text-xs text-primary font-bold outline-none border border-primary/10 focus:border-primary/30"
          />
          <button onClick={handleAddEvento} disabled={isAddingEvento || !nuevoEvento.trim()}
            className="bg-primary text-white px-4 py-2 rounded-xl hover:scale-105 transition-all disabled:opacity-50">
            {isAddingEvento ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
          </button>
        </div>
      </div>

      <div className="pt-6 border-t border-primary/5">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-primary/30 mb-4 px-2">
          Planes para el {diaSeleccionado}
        </h3>
        <div className="space-y-3">
          {itemsCombinadosDelDia.length > 0 ? (
            itemsCombinadosDelDia.map((item: any) => (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={item.id}
                className={cn("flex items-center gap-4 p-4 rounded-3xl border transition-all",
                  item.esCapitulo ? "bg-primary/10 border-primary/10" : "bg-primary/5 border-transparent")}>
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  {item.esCapitulo
                    ? <BookOpen size={18} className="text-primary" />
                    : <span className="text-[14px] font-black text-primary">{diaSeleccionado}</span>
                  }
                </div>
                <div>
                  <p className="text-[11px] font-black text-primary uppercase italic">"{item.titulo}"</p>
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

// ─── VISTA SEMANAL ────────────────────────────────────────────────────────────
const VistaSemanal = ({
  eventos, capitulosRaw, isAddingEvento, onAddEvento,
}: {
  eventos: any[]; capitulosRaw: any[];
  isAddingEvento: boolean;
  onAddEvento: (fecha: string, titulo: string, tipo: string) => Promise<void>;
}) => {
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
    <div className="bg-white border border-primary/10 rounded-[40px] p-6 shadow-xl shadow-primary/5 flex flex-col gap-6 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <button onClick={irAHoy} className="text-[9px] font-black uppercase tracking-widest border border-primary/20 text-primary px-3 py-1.5 rounded-xl hover:bg-primary hover:text-white transition-all">
            Hoy
          </button>
          <button onClick={() => navegar(-1)} className="p-1.5 hover:bg-primary/8 rounded-xl text-primary/40 hover:text-primary transition-all">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => navegar(1)} className="p-1.5 hover:bg-primary/8 rounded-xl text-primary/40 hover:text-primary transition-all">
            <ChevronRight size={18} />
          </button>
          <span className="text-[11px] font-black uppercase tracking-wider text-primary/70 ml-1">{rangoTexto}</span>
        </div>
        <div className="flex items-center gap-1 bg-primary/5 rounded-2xl p-1">
          {VISTAS.map((v) => (
            <button key={v.valor} onClick={() => setVista(v.valor)}
              className={cn(
                "text-[9px] font-black uppercase tracking-wide px-3 py-1.5 rounded-xl transition-all",
                vista === v.valor ? "bg-primary text-white shadow-md shadow-primary/20" : "text-primary/40 hover:text-primary hover:bg-white"
              )}>
              <span className="hidden sm:inline">{v.label}</span>
              <span className="sm:hidden">{v.short}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${vista}-${fechaBase.toISOString()}`}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${Math.min(vista, 7)}, minmax(0, 1fr))` }}
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

      <div className="bg-primary/4 rounded-3xl p-5 border border-primary/8">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={14} className="text-primary/40" />
          <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">
            {diaSeleccionado.getDate()} de {MESES[diaSeleccionado.getMonth()]} · {DIAS_SEMANA_CORTO[diaSeleccionado.getDay()]}
          </span>
        </div>
        <div className="flex gap-2 mb-4">
          <select value={tipoEvento} onChange={e => setTipoEvento(e.target.value)}
            className="bg-white border border-primary/10 rounded-xl px-3 py-2 text-[10px] font-black text-primary outline-none focus:border-primary/30 cursor-pointer">
            {["Plan", "Reunión", "Personal"].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input type="text" value={nuevoEvento} onChange={e => setNuevoEvento(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder='"Nuevo evento..."'
            className="flex-1 bg-white border border-primary/10 rounded-xl px-4 py-2 text-[10px] font-bold text-primary placeholder:text-primary/25 outline-none focus:border-primary/30"
          />
          <button onClick={handleAdd} disabled={isAddingEvento || !nuevoEvento.trim()}
            className="bg-primary text-white px-4 py-2 rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-40">
            {isAddingEvento ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
          </button>
        </div>
        <div className="space-y-2">
          {eventosDiaSeleccionado.length === 0 ? (
            <p className="text-[9px] font-bold text-primary/20 italic px-1">"Sin eventos para este día."</p>
          ) : eventosDiaSeleccionado.map(ev => (
            <motion.div key={ev.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              className={cn("flex items-center gap-3 p-3 rounded-2xl border",
                ev.esCapitulo ? "bg-amber-50 border-amber-100" : "bg-white border-primary/8 shadow-sm")}>
              <div className="w-8 h-8 bg-primary/8 rounded-xl flex items-center justify-center shrink-0">
                {ev.esCapitulo ? <BookOpen size={14} className="text-amber-600" /> : <Bookmark size={14} className="text-primary/50" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-primary uppercase italic truncate">"{ev.titulo}"</p>
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

// ─── COMPONENTE PRINCIPAL EXPORTADO ──────────────────────────────────────────
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

  // Estado para vista mes
  const [diaSeleccionado, setDiaSeleccionado] = useState(new Date().getDate());
  const [nuevoEvento, setNuevoEvento] = useState("");
  const [tipoEvento, setTipoEvento] = useState("Plan");

  const handleAddTarea = async () => {
    if (!nuevaTarea.trim() || isAddingTarea) return;
    setIsAddingTarea(true);
    try {
      const creada = await tareasQueries.add(nuevaTarea);
      if (creada) { setTareas([creada, ...tareas]); setNuevaTarea(""); }
    } catch (err) { console.error(err); } finally { setIsAddingTarea(false); }
  };

  const handleToggle = async (id: string, completada: boolean) => {
    try {
      await tareasQueries.updateStatus(id, !completada);
      setTareas(tareas.map((t: any) => t.id === id ? { ...t, completada: !completada } : t));
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    try {
      await tareasQueries.delete(id);
      setTareas(tareas.filter((t: any) => t.id !== id));
    } catch (err) { console.error(err); }
  };

  const handleAddEventoMes = async () => {
    if (!nuevoEvento.trim() || isAddingEvento) return;
    setIsAddingEvento(true);
    const now = new Date();
    const fechaISO = new Date(now.getFullYear(), now.getMonth(), diaSeleccionado).toISOString();
    try {
      const creado = await eventosQueries.add({ titulo: nuevoEvento, tipo: tipoEvento, fecha: fechaISO });
      if (creado) { setEventos([...eventos, creado]); setNuevoEvento(""); }
    } catch (err) { console.error(err); } finally { setIsAddingEvento(false); }
  };

  const handleAddEventoSemanal = async (fechaISO: string, titulo: string, tipo: string) => {
    setIsAddingEvento(true);
    try {
      const creado = await eventosQueries.add({ titulo, tipo, fecha: fechaISO });
      if (creado) setEventos((prev: any[]) => [...prev, creado]);
    } catch (err) { console.error(err); } finally { setIsAddingEvento(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

      {/* COLUMNA IZQUIERDA: RELOJ Y TAREAS */}
      <section className="lg:col-span-5">
        <RelojDigital horario={horarioRaw || []} />

        <div className="bg-white border border-primary/10 rounded-[40px] p-6 shadow-xl shadow-primary/5 min-h-[520px] flex flex-col">
          <div className="flex items-center gap-3 mb-8 px-2">
            <CheckSquare className="text-primary" size={20} />
            <h2 className="text-[12px] font-black uppercase tracking-widest text-primary/60">Lista de Pendientes</h2>
          </div>

          <div className="relative mb-8">
            <input type="text" value={nuevaTarea}
              onChange={(e) => setNuevaTarea(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTarea()}
              placeholder='"Añadir una tarea..."'
              className="w-full bg-primary/5 border-2 border-transparent focus:border-primary/10 focus:bg-white rounded-2xl py-4 px-6 text-sm text-primary transition-all outline-none font-bold placeholder:text-primary/30"
            />
            <button onClick={handleAddTarea} disabled={isAddingTarea || !nuevaTarea.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-white p-2.5 rounded-xl hover:scale-105 active:scale-95 transition-all">
              {isAddingTarea ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
            </button>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
            <AnimatePresence mode="popLayout">
              {tareas.map((t: any) => (
                <motion.div key={t.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                  className={cn("flex items-center justify-between p-4 rounded-2xl border transition-all group",
                    t.completada ? "bg-primary/5 border-transparent opacity-60" : "bg-white border-primary/10 shadow-sm")}>
                  <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => handleToggle(t.id, t.completada)}>
                    <div className={cn("w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                      t.completada ? "bg-primary border-primary" : "border-primary/20 group-hover:border-primary/40")}>
                      {t.completada && <Plus size={14} className="text-white rotate-45" strokeWidth={4} />}
                    </div>
                    <span className={cn("text-sm font-bold text-primary", t.completada && "line-through text-primary/40")}>
                      "{t.titulo}"
                    </span>
                  </div>
                  <button onClick={() => handleDelete(t.id)} className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:bg-red-50 rounded-lg transition-all">
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
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