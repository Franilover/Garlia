"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Grid3x3,
  Columns,
  LayoutGrid,
  Plus,
  Bookmark,
  BookOpen,
  Loader2,
} from "lucide-react";

// ─── TIPOS ────────────────────────────────────────────────────────────────────
type VistaOpcion = 1 | 2 | 3 | 4 | 5 | 7;

interface Evento {
  id: string;
  titulo: string;
  tipo: string;
  fecha?: string;
  esCapitulo?: boolean;
}

interface CalendarioSemanalProps {
  eventos: Evento[];
  capitulosRaw?: any[];
  onAddEvento?: (fecha: string, titulo: string, tipo: string) => Promise<void>;
  isAddingEvento?: boolean;
}

// ─── CONSTANTES ───────────────────────────────────────────────────────────────
const DIAS_SEMANA_CORTO = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DIAS_SEMANA_LETRA = ["D", "L", "M", "X", "J", "V", "S"];
const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

// Opciones de vista con sus iconos y etiquetas
const VISTAS: { valor: VistaOpcion; label: string; short: string }[] = [
  { valor: 1,  label: "Día",      short: "1D" },
  { valor: 2,  label: "2 Días",   short: "2D" },
  { valor: 3,  label: "3 Días",   short: "3D" },
  { valor: 4,  label: "4 Días",   short: "4D" },
  { valor: 5,  label: "Semana L", short: "5D" },
  { valor: 7,  label: "Semana",   short: "7D" },
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

// ─── SUB-COMPONENTE: BADGE DE EVENTO ──────────────────────────────────────────
const EventoBadge = ({ item, compact = false }: { item: Evento; compact?: boolean }) => {
  const colores: Record<string, string> = {
    "Plan":               "bg-primary/10 text-primary border-primary/15",
    "Lanzamiento Libro":  "bg-amber-50 text-amber-700 border-amber-200",
    "Reunión":            "bg-blue-50 text-blue-700 border-blue-200",
    "Personal":           "bg-emerald-50 text-emerald-700 border-emerald-200",
    "default":            "bg-primary/8 text-primary/70 border-primary/10",
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
      <span className="font-black uppercase tracking-tight truncate">
        {item.titulo}
      </span>
    </motion.div>
  );
};

// ─── SUB-COMPONENTE: COLUMNA DÍA ──────────────────────────────────────────────
const ColumniaDia = ({
  fecha,
  eventos,
  esHoy,
  seleccionado,
  onClick,
  compact,
}: {
  fecha: Date;
  eventos: Evento[];
  esHoy: boolean;
  seleccionado: boolean;
  onClick: () => void;
  compact: boolean;
}) => {
  const diaSemana = DIAS_SEMANA_CORTO[fecha.getDay()];
  const dia = fecha.getDate();

  return (
    <div
      className={cn(
        "flex flex-col min-h-55 rounded-2xl border transition-all cursor-pointer group",
        seleccionado
          ? "bg-primary/5 border-primary/30 shadow-md shadow-primary/10"
          : "bg-white border-primary/8 hover:border-primary/20 hover:shadow-sm",
        esHoy && !seleccionado && "border-primary/20 bg-primary/3"
      )}
      onClick={onClick}
    >
      {/* Header del día */}
      <div className={cn(
        "flex flex-col items-center py-3 border-b gap-0.5 transition-colors",
        seleccionado ? "border-primary/15" : "border-primary/5"
      )}>
        <span className={cn(
          "text-[8px] font-black uppercase tracking-widest transition-colors",
          esHoy ? "text-primary" : "text-primary/30"
        )}>
          {compact ? DIAS_SEMANA_LETRA[fecha.getDay()] : diaSemana}
        </span>
        <div className={cn(
          "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
          esHoy
            ? "bg-primary text-white shadow-md shadow-primary/30"
            : seleccionado
            ? "bg-primary/15 text-primary"
            : "text-primary/50 group-hover:bg-primary/8"
        )}>
          <span className="text-sm font-black">{dia}</span>
        </div>
      </div>

      {/* Eventos del día */}
      <div className="flex flex-col gap-1 p-2 flex-1 overflow-y-auto">
        {eventos.length === 0 && (
          <p className="text-[8px] text-primary/15 font-bold italic text-center mt-4">—</p>
        )}
        {eventos.map((ev) => (
          <EventoBadge key={ev.id} item={ev} compact={compact} />
        ))}
      </div>
    </div>
  );
};

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export const CalendarioSemanal = ({
  eventos = [],
  capitulosRaw = [],
  onAddEvento,
  isAddingEvento = false,
}: CalendarioSemanalProps) => {
  const [vista, setVista] = useState<VistaOpcion>(7);
  const [fechaBase, setFechaBase] = useState<Date>(() => {
    // Empieza en lunes de la semana actual
    const hoy = new Date();
    const d = new Date(hoy);
    const dia = d.getDay();
    const diff = dia === 0 ? -6 : 1 - dia;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date>(new Date());
  const [nuevoEvento, setNuevoEvento] = useState("");
  const [tipoEvento, setTipoEvento] = useState("Plan");

  const hoy = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Días a mostrar en la vista actual
  const diasVista = useMemo(() => {
    return Array.from({ length: vista }, (_, i) => addDays(fechaBase, i));
  }, [fechaBase, vista]);

  // Rango de texto del header
  const rangoTexto = useMemo(() => {
    if (diasVista.length === 1) {
      const d = diasVista[0];
      return `${d.getDate()} de ${MESES[d.getMonth()]} ${d.getFullYear()}`;
    }
    const ini = diasVista[0];
    const fin = diasVista[diasVista.length - 1];
    if (ini.getMonth() === fin.getMonth()) {
      return `${ini.getDate()}–${fin.getDate()} de ${MESES[ini.getMonth()]} ${ini.getFullYear()}`;
    }
    return `${ini.getDate()} ${MESES[ini.getMonth()].slice(0, 3)} – ${fin.getDate()} ${MESES[fin.getMonth()].slice(0, 3)} ${fin.getFullYear()}`;
  }, [diasVista]);

  // Navegar
  const navegar = (dir: 1 | -1) => {
    setFechaBase(prev => addDays(prev, dir * vista));
  };

  const irAHoy = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    // Si vista 7 y comenzamos en lunes
    if (vista === 7 || vista === 5) {
      const dia = d.getDay();
      const diff = dia === 0 ? -6 : 1 - dia;
      d.setDate(d.getDate() + diff);
    }
    setFechaBase(d);
    setDiaSeleccionado(new Date());
  };

  // Obtener eventos del día
  const eventosDelDia = useCallback((fecha: Date): Evento[] => {
    const evs = eventos
      .filter(e => e.fecha && isSameDay(toUTCDate(e.fecha), fecha))
      .map(e => ({ ...e, esCapitulo: false }));

    const caps = capitulosRaw
      .filter(c => isSameDay(toUTCDate(c.fecha_publicacion), fecha))
      .map(c => ({
        id: c.id,
        titulo: c.titulo_capitulo,
        tipo: "Lanzamiento Libro",
        esCapitulo: true,
      }));

    return [...evs, ...caps];
  }, [eventos, capitulosRaw]);

  // Eventos del día seleccionado (para el panel inferior)
  const eventosDiaSeleccionado = useMemo(
    () => eventosDelDia(diaSeleccionado),
    [eventosDelDia, diaSeleccionado]
  );

  const handleAdd = async () => {
    if (!nuevoEvento.trim() || !onAddEvento) return;
    await onAddEvento(diaSeleccionado.toISOString(), nuevoEvento, tipoEvento);
    setNuevoEvento("");
  };

  // ¿Cuántas columnas mostrar? En móvil siempre 1, en desktop según vista
  const compact = vista >= 5;

  return (
    <div className="bg-white border border-primary/10 rounded-[40px] p-6 shadow-xl shadow-primary/5 flex flex-col gap-6">

      {/* ── BARRA SUPERIOR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">

        {/* Navegación + Rango */}
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={irAHoy}
            className="text-[9px] font-black uppercase tracking-widest border border-primary/20 text-primary px-3 py-1.5 rounded-xl hover:bg-primary hover:text-white transition-all"
          >
            Hoy
          </button>
          <button
            onClick={() => navegar(-1)}
            className="p-1.5 hover:bg-primary/8 rounded-xl text-primary/40 hover:text-primary transition-all"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => navegar(1)}
            className="p-1.5 hover:bg-primary/8 rounded-xl text-primary/40 hover:text-primary transition-all"
          >
            <ChevronRight size={18} />
          </button>
          <span className="text-[11px] font-black uppercase tracking-wider text-primary/70 ml-1">
            {rangoTexto}
          </span>
        </div>

        {/* Selector de Vista */}
        <div className="flex items-center gap-1 bg-primary/5 rounded-2xl p-1">
          {VISTAS.map((v) => (
            <button
              key={v.valor}
              onClick={() => setVista(v.valor)}
              className={cn(
                "text-[9px] font-black uppercase tracking-wide px-3 py-1.5 rounded-xl transition-all",
                vista === v.valor
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "text-primary/40 hover:text-primary hover:bg-white"
              )}
            >
              <span className="hidden sm:inline">{v.label}</span>
              <span className="sm:hidden">{v.short}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── GRID DE DÍAS ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${vista}-${fechaBase.toISOString()}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
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

      {/* ── PANEL: DÍA SELECCIONADO ── */}
      <div className="bg-primary/4 rounded-3xl p-5 border border-primary/8">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={14} className="text-primary/40" />
          <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">
            {diaSeleccionado.getDate()} de {MESES[diaSeleccionado.getMonth()]} · {DIAS_SEMANA_CORTO[diaSeleccionado.getDay()]}
          </span>
        </div>

        {/* Agregar evento */}
        {onAddEvento && (
          <div className="flex gap-2 mb-4">
            <select
              value={tipoEvento}
              onChange={e => setTipoEvento(e.target.value)}
              className="bg-white border border-primary/10 rounded-xl px-3 py-2 text-[10px] font-black text-primary outline-none focus:border-primary/30 cursor-pointer"
            >
              {["Plan", "Reunión", "Personal"].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input
              type="text"
              value={nuevoEvento}
              onChange={e => setNuevoEvento(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              placeholder='"Nuevo evento..."'
              className="flex-1 bg-white border border-primary/10 rounded-xl px-4 py-2 text-[10px] font-bold text-primary placeholder:text-primary/25 outline-none focus:border-primary/30"
            />
            <button
              onClick={handleAdd}
              disabled={isAddingEvento || !nuevoEvento.trim()}
              className="bg-primary text-white px-4 py-2 rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
            >
              {isAddingEvento
                ? <Loader2 className="animate-spin" size={14} />
                : <Plus size={14} />
              }
            </button>
          </div>
        )}

        {/* Lista eventos del día seleccionado */}
        <div className="space-y-2">
          {eventosDiaSeleccionado.length === 0 ? (
            <p className="text-[9px] font-bold text-primary/20 italic px-1">
              "Sin eventos para este día."
            </p>
          ) : (
            eventosDiaSeleccionado.map(ev => (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-2xl border",
                  ev.esCapitulo
                    ? "bg-amber-50 border-amber-100"
                    : "bg-white border-primary/8 shadow-sm"
                )}
              >
                <div className="w-8 h-8 bg-primary/8 rounded-xl flex items-center justify-center shrink-0">
                  {ev.esCapitulo
                    ? <BookOpen size={14} className="text-amber-600" />
                    : <Bookmark size={14} className="text-primary/50" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-primary uppercase italic truncate">
                    "{ev.titulo}"
                  </p>
                  <p className="text-[8px] font-bold text-primary/35 uppercase tracking-tight">
                    {ev.tipo}
                  </p>
                </div>
                {ev.esCapitulo && (
                  <span className="text-[7px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-full uppercase tracking-tight shrink-0">
                    Capítulo
                  </span>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};