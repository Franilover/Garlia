"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Dumbbell,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Plus,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  Timer,
  Flame,
  Zap,
  Star,
  List,
  LayoutGrid,
} from "lucide-react";

// ─── TIPOS ────────────────────────────────────────────────────────────────────
interface Ejercicio {
  id: string;
  nombre: string;
  series: number;
  reps: string;       // "12" | "12-15" | "30s" etc.
  descanso: number;   // segundos
  musculo: string;
  notas?: string;
}

interface Rutina {
  id: string;
  nombre: string;
  descripcion: string;
  tag: string;        // "Fuerza" | "Cardio" | "Flexibilidad" etc.
  ejercicios: Ejercicio[];
}

// ─── DATOS DE EJEMPLO ─────────────────────────────────────────────────────────
const RUTINAS_INICIALES: Rutina[] = [
  {
    id: "1",
    nombre: "Full Body A",
    descripcion: "Rutina de cuerpo completo enfocada en fuerza",
    tag: "Fuerza",
    ejercicios: [
      { id: "e1", nombre: "Sentadilla", series: 4, reps: "10-12", descanso: 90, musculo: "Piernas" },
      { id: "e2", nombre: "Press Banca", series: 4, reps: "8-10", descanso: 90, musculo: "Pecho" },
      { id: "e3", nombre: "Peso Muerto", series: 3, reps: "8", descanso: 120, musculo: "Espalda" },
      { id: "e4", nombre: "Dominadas", series: 3, reps: "Al fallo", descanso: 60, musculo: "Espalda" },
      { id: "e5", nombre: "Press Militar", series: 3, reps: "10", descanso: 75, musculo: "Hombros" },
    ],
  },
  {
    id: "2",
    nombre: "Cardio HIIT",
    descripcion: "Intervalos de alta intensidad para quemar grasa",
    tag: "Cardio",
    ejercicios: [
      { id: "e6", nombre: "Burpees", series: 4, reps: "30s", descanso: 30, musculo: "Completo" },
      { id: "e7", nombre: "Mountain Climbers", series: 4, reps: "40s", descanso: 20, musculo: "Core" },
      { id: "e8", nombre: "Jump Squats", series: 4, reps: "20", descanso: 30, musculo: "Piernas" },
      { id: "e9", nombre: "High Knees", series: 4, reps: "30s", descanso: 20, musculo: "Cardio" },
    ],
  },
  {
    id: "3",
    nombre: "Core & Flex",
    descripcion: "Fortalecer el core y mejorar la flexibilidad",
    tag: "Flexibilidad",
    ejercicios: [
      { id: "e10", nombre: "Plancha", series: 3, reps: "45s", descanso: 30, musculo: "Core" },
      { id: "e11", nombre: "Crunch Bicicleta", series: 3, reps: "20", descanso: 30, musculo: "Core" },
      { id: "e12", nombre: "Leg Raises", series: 3, reps: "15", descanso: 30, musculo: "Core" },
      { id: "e13", nombre: "Estiramiento Isquios", series: 2, reps: "60s", descanso: 15, musculo: "Piernas", notas: "Cada lado" },
    ],
  },
];

const TAGS = ["Todas", "Fuerza", "Cardio", "Flexibilidad", "Movilidad"];
const TAG_COLORES: Record<string, string> = {
  "Fuerza":       "bg-primary/10 text-primary border-primary/20",
  "Cardio":       "bg-red-50 text-red-600 border-red-100",
  "Flexibilidad": "bg-emerald-50 text-emerald-700 border-emerald-100",
  "Movilidad":    "bg-amber-50 text-amber-700 border-amber-100",
};

// ─── MODAL: EJECUTAR RUTINA ───────────────────────────────────────────────────
const EjecutarRutina = ({
  rutina,
  onCerrar,
}: {
  rutina: Rutina;
  onCerrar: () => void;
}) => {
  const [ejercicioIdx, setEjercicioIdx] = useState(0);
  const [serieActual, setSerieActual] = useState(1);
  const [fase, setFase] = useState<"ejercicio" | "descanso" | "fin">("ejercicio");
  const [segundos, setSegundos] = useState(0);
  const [corriendo, setCorriendo] = useState(false);
  const [completados, setCompletados] = useState<string[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const ejercicio = rutina.ejercicios[ejercicioIdx];
  const esUltimoEjercicio = ejercicioIdx === rutina.ejercicios.length - 1;
  const esUltimaSerie = serieActual === ejercicio?.series;

  // Sonido
  const beep = (freq = 880, dur = 0.15) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq; osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + dur);
    } catch {}
  };

  // Timer de descanso
  useEffect(() => {
    if (fase !== "descanso") return;
    setSegundos(ejercicio.descanso);
    setCorriendo(true);
  }, [fase, ejercicioIdx, serieActual]);

  useEffect(() => {
    if (!corriendo || fase !== "descanso") return;
    intervalRef.current = setInterval(() => {
      setSegundos(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setCorriendo(false);
          beep(1046, 0.3);
          setFase("ejercicio");
          return 0;
        }
        if (prev <= 4) beep(660, 0.08);
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [corriendo, fase]);

  const completarSerie = () => {
    beep(880, 0.1);
    const key = `${ejercicioIdx}-${serieActual}`;
    setCompletados(p => [...p, key]);

    if (esUltimaSerie && esUltimoEjercicio) {
      setFase("fin");
    } else if (esUltimaSerie) {
      setEjercicioIdx(i => i + 1);
      setSerieActual(1);
      setFase("descanso");
    } else {
      setSerieActual(s => s + 1);
      setFase("descanso");
    }
  };

  const pct = fase === "descanso" ? segundos / ejercicio.descanso : 1;
  const r = 54;
  const circ = 2 * Math.PI * r;

  // FIN
  if (fase === "fin") {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center"
        style={{ backgroundColor: "hsl(var(--primary))" }}
      >
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}
          className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-2">
            <Star size={40} className="text-white" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 italic">Completado</span>
          <h2 className="text-5xl font-black text-white italic tracking-tighter text-center">{rutina.nombre}</h2>
          <p className="text-white/40 text-sm font-bold uppercase tracking-widest">
            {rutina.ejercicios.length} ejercicios · {rutina.ejercicios.reduce((a, e) => a + e.series, 0)} series
          </p>
          <button onClick={onCerrar}
            className="mt-8 bg-white text-primary font-black uppercase tracking-widest px-10 py-4 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-2xl text-sm">
            Terminar
          </button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: "hsl(var(--primary))" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <div>
          <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30 italic">Rutina</span>
          <h2 className="text-lg font-black text-white italic tracking-tight">{rutina.nombre}</h2>
        </div>
        <button onClick={onCerrar} className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
          <X size={18} className="text-white/60" />
        </button>
      </div>

      {/* Barra progreso ejercicios */}
      <div className="px-6 mb-6">
        <div className="flex gap-1.5">
          {rutina.ejercicios.map((_, i) => (
            <div key={i} className={cn("h-1 flex-1 rounded-full transition-all duration-500",
              i < ejercicioIdx ? "bg-white" : i === ejercicioIdx ? "bg-white/60" : "bg-white/15")} />
          ))}
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">
            Ejercicio {ejercicioIdx + 1} de {rutina.ejercicios.length}
          </span>
          <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">
            Serie {serieActual} de {ejercicio.series}
          </span>
        </div>
      </div>

      {/* Contenido central */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">

        <AnimatePresence mode="wait">
          <motion.div key={ejercicioIdx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }} className="flex flex-col items-center gap-3 text-center">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 italic">{ejercicio.musculo}</span>
            <h1 className="text-4xl sm:text-6xl font-black text-white italic tracking-tighter leading-none">
              {ejercicio.nombre}
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex flex-col items-center">
                <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Series</span>
                <span className="text-2xl font-black text-white tabular-nums">{ejercicio.series}</span>
              </div>
              <div className="w-px h-8 bg-white/15" />
              <div className="flex flex-col items-center">
                <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Reps</span>
                <span className="text-2xl font-black text-white">{ejercicio.reps}</span>
              </div>
              <div className="w-px h-8 bg-white/15" />
              <div className="flex flex-col items-center">
                <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Descanso</span>
                <span className="text-2xl font-black text-white tabular-nums">{ejercicio.descanso}s</span>
              </div>
            </div>
            {ejercicio.notas && (
              <span className="text-[10px] font-bold text-white/30 italic mt-1">* {ejercicio.notas}</span>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Estado: descanso o ejercicio */}
        {fase === "descanso" ? (
          <div className="flex flex-col items-center gap-4">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40">Descansando</span>
            <div className="relative w-36 h-36">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={r} fill="none" stroke="white" strokeWidth="5" opacity="0.1" />
                <motion.circle cx="60" cy="60" r={r} fill="none" stroke="white" strokeWidth="5"
                  strokeLinecap="round" strokeDasharray={circ}
                  strokeDashoffset={circ * (1 - pct)}
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-white tabular-nums tracking-tighter">{segundos}</span>
                <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">seg</span>
              </div>
            </div>
            <button onClick={() => { clearInterval(intervalRef.current!); setCorriendo(false); setFase("ejercicio"); }}
              className="text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white border border-white/15 hover:border-white/40 px-4 py-2 rounded-xl transition-all">
              Saltar descanso
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {/* Series completadas */}
            <div className="flex gap-2">
              {Array.from({ length: ejercicio.series }).map((_, i) => {
                const done = completados.includes(`${ejercicioIdx}-${i + 1}`) || i < serieActual - 1;
                const actual = i === serieActual - 1;
                return (
                  <div key={i} className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs transition-all",
                    done ? "bg-white text-primary" :
                    actual ? "bg-white/20 text-white border-2 border-white/40" :
                    "bg-white/8 text-white/20 border border-white/10"
                  )}>
                    {done ? <Check size={14} /> : i + 1}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Botón acción */}
      {fase === "ejercicio" && (
        <div className="px-6 pb-10">
          <button onClick={completarSerie}
            className="w-full bg-white text-primary font-black uppercase tracking-widest py-5 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl text-sm flex items-center justify-center gap-3">
            <Check size={20} />
            {esUltimaSerie && esUltimoEjercicio ? "Finalizar rutina" : `Serie ${serieActual} completada`}
          </button>
        </div>
      )}
    </motion.div>
  );
};

// ─── CARD RUTINA ──────────────────────────────────────────────────────────────
const CardRutina = ({
  rutina,
  onIniciar,
  expandida,
  onToggle,
}: {
  rutina: Rutina;
  onIniciar: () => void;
  expandida: boolean;
  onToggle: () => void;
}) => {
  const totalSeries = rutina.ejercicios.reduce((a, e) => a + e.series, 0);
  const tagColor = TAG_COLORES[rutina.tag] ?? "bg-primary/10 text-primary border-primary/20";

  return (
    <div className={cn(
      "bg-white border border-primary/10 rounded-[28px] overflow-hidden shadow-lg shadow-primary/5 transition-all",
      expandida && "shadow-xl shadow-primary/10"
    )}>
      {/* Header */}
      <div className="p-5 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={cn("text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border", tagColor)}>
                {rutina.tag}
              </span>
            </div>
            <h3 className="text-lg font-black text-primary italic tracking-tight leading-none mb-1">{rutina.nombre}</h3>
            <p className="text-[10px] font-bold text-primary/40 uppercase tracking-wide">{rutina.descripcion}</p>
          </div>
          <motion.div animate={{ rotate: expandida ? 180 : 0 }} transition={{ duration: 0.25 }}>
            <ChevronDown size={18} className="text-primary/30 shrink-0 mt-1" />
          </motion.div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-primary/5">
          <div className="flex items-center gap-1.5">
            <Dumbbell size={12} className="text-primary/30" />
            <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">
              {rutina.ejercicios.length} ejercicios
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Flame size={12} className="text-primary/30" />
            <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">
              {totalSeries} series
            </span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onIniciar(); }}
            className="ml-auto flex items-center gap-2 bg-primary text-white text-[9px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md shadow-primary/25"
          >
            <Play size={11} fill="white" />
            Iniciar
          </button>
        </div>
      </div>

      {/* Lista de ejercicios expandida */}
      <AnimatePresence>
        {expandida && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-primary/5">
              <div className="pt-4 space-y-2">
                {rutina.ejercicios.map((ej, i) => (
                  <motion.div key={ej.id}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 p-3 bg-primary/3 rounded-2xl border border-primary/5"
                  >
                    <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-[8px] font-black text-primary">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-primary uppercase tracking-tight truncate">{ej.nombre}</p>
                      <p className="text-[8px] font-bold text-primary/35 uppercase tracking-widest">{ej.musculo}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[9px] font-black text-primary/50">{ej.series}×{ej.reps}</span>
                      <span className="text-[8px] font-bold text-primary/25 border border-primary/10 px-1.5 py-0.5 rounded-md">{ej.descanso}s</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── PANEL NUEVO EJERCICIO (dentro de nueva rutina) ───────────────────────────
const FormNuevaRutina = ({
  onGuardar,
  onCancelar,
}: {
  onGuardar: (rutina: Rutina) => void;
  onCancelar: () => void;
}) => {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tag, setTag] = useState("Fuerza");
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [nuevoEj, setNuevoEj] = useState({ nombre: "", series: "3", reps: "10", descanso: "60", musculo: "" });

  const addEjercicio = () => {
    if (!nuevoEj.nombre.trim()) return;
    setEjercicios(p => [...p, {
      id: Date.now().toString(),
      nombre: nuevoEj.nombre,
      series: parseInt(nuevoEj.series) || 3,
      reps: nuevoEj.reps || "10",
      descanso: parseInt(nuevoEj.descanso) || 60,
      musculo: nuevoEj.musculo || "General",
    }]);
    setNuevoEj({ nombre: "", series: "3", reps: "10", descanso: "60", musculo: "" });
  };

  const guardar = () => {
    if (!nombre.trim() || ejercicios.length === 0) return;
    onGuardar({
      id: Date.now().toString(),
      nombre, descripcion, tag, ejercicios,
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-primary/10 rounded-[28px] p-6 shadow-xl shadow-primary/5">
      <div className="flex items-center gap-3 mb-6">
        <Plus size={18} className="text-primary" />
        <h3 className="text-[12px] font-black uppercase tracking-widest text-primary/60">Nueva Rutina</h3>
      </div>

      <div className="space-y-3 mb-6">
        <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre de la rutina..."
          className="w-full bg-primary/5 border-2 border-transparent focus:border-primary/15 focus:bg-white rounded-2xl py-3 px-5 text-sm font-bold text-primary outline-none placeholder:text-primary/25 transition-all" />
        <input value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Descripción..."
          className="w-full bg-primary/5 border-2 border-transparent focus:border-primary/15 focus:bg-white rounded-2xl py-3 px-5 text-sm font-bold text-primary outline-none placeholder:text-primary/25 transition-all" />
        <div className="flex gap-2 flex-wrap">
          {TAGS.filter(t => t !== "Todas").map(t => (
            <button key={t} onClick={() => setTag(t)}
              className={cn("text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border transition-all",
                tag === t ? "bg-primary text-white border-primary" : "border-primary/15 text-primary/40 hover:text-primary hover:border-primary/30"
              )}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Ejercicios añadidos */}
      {ejercicios.length > 0 && (
        <div className="space-y-2 mb-4">
          {ejercicios.map((ej, i) => (
            <div key={ej.id} className="flex items-center gap-3 p-3 bg-primary/4 rounded-2xl">
              <span className="text-[8px] font-black text-primary/30 w-4">{i + 1}</span>
              <span className="text-[11px] font-black text-primary flex-1 truncate">{ej.nombre}</span>
              <span className="text-[9px] text-primary/40 font-bold">{ej.series}×{ej.reps}</span>
              <button onClick={() => setEjercicios(p => p.filter(e => e.id !== ej.id))}
                className="text-red-300 hover:text-red-500 transition-colors">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Añadir ejercicio */}
      <div className="bg-primary/4 rounded-2xl p-4 mb-6 border border-primary/8">
        <p className="text-[9px] font-black uppercase tracking-widest text-primary/30 mb-3">Añadir ejercicio</p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input value={nuevoEj.nombre} onChange={e => setNuevoEj(p => ({ ...p, nombre: e.target.value }))}
            placeholder="Nombre..." onKeyDown={e => e.key === "Enter" && addEjercicio()}
            className="col-span-2 bg-white border border-primary/10 rounded-xl px-3 py-2 text-xs font-bold text-primary outline-none focus:border-primary/30 placeholder:text-primary/20" />
          <input value={nuevoEj.musculo} onChange={e => setNuevoEj(p => ({ ...p, musculo: e.target.value }))}
            placeholder="Músculo..." className="bg-white border border-primary/10 rounded-xl px-3 py-2 text-xs font-bold text-primary outline-none focus:border-primary/30 placeholder:text-primary/20" />
          <input value={nuevoEj.series} onChange={e => setNuevoEj(p => ({ ...p, series: e.target.value }))}
            placeholder="Series" type="number" className="bg-white border border-primary/10 rounded-xl px-3 py-2 text-xs font-bold text-primary outline-none focus:border-primary/30 placeholder:text-primary/20" />
          <input value={nuevoEj.reps} onChange={e => setNuevoEj(p => ({ ...p, reps: e.target.value }))}
            placeholder="Reps (ej: 12 o 30s)" className="bg-white border border-primary/10 rounded-xl px-3 py-2 text-xs font-bold text-primary outline-none focus:border-primary/30 placeholder:text-primary/20" />
          <input value={nuevoEj.descanso} onChange={e => setNuevoEj(p => ({ ...p, descanso: e.target.value }))}
            placeholder="Descanso (seg)" type="number" className="bg-white border border-primary/10 rounded-xl px-3 py-2 text-xs font-bold text-primary outline-none focus:border-primary/30 placeholder:text-primary/20" />
        </div>
        <button onClick={addEjercicio} disabled={!nuevoEj.nombre.trim()}
          className="w-full bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest py-2 rounded-xl hover:bg-primary hover:text-white transition-all disabled:opacity-30">
          + Añadir ejercicio
        </button>
      </div>

      <div className="flex gap-3">
        <button onClick={onCancelar}
          className="flex-1 border border-primary/15 text-primary/40 text-[9px] font-black uppercase tracking-widest py-3 rounded-xl hover:text-primary hover:border-primary/30 transition-all">
          Cancelar
        </button>
        <button onClick={guardar} disabled={!nombre.trim() || ejercicios.length === 0}
          className="flex-1 bg-primary text-white text-[9px] font-black uppercase tracking-widest py-3 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md shadow-primary/25 disabled:opacity-40">
          Guardar rutina
        </button>
      </div>
    </motion.div>
  );
};

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export const PaginaEjercicios = () => {
  const [rutinas, setRutinas] = useState<Rutina[]>(RUTINAS_INICIALES);
  const [rutinaActiva, setRutinaActiva] = useState<Rutina | null>(null);
  const [expandida, setExpandida] = useState<string | null>(null);
  const [filtroTag, setFiltroTag] = useState("Todas");
  const [creando, setCreando] = useState(false);

  const rutinasFiltradas = useMemo(() =>
    filtroTag === "Todas" ? rutinas : rutinas.filter(r => r.tag === filtroTag),
    [rutinas, filtroTag]
  );

  const totalEjercicios = rutinas.reduce((a, r) => a + r.ejercicios.length, 0);
  const totalSeries = rutinas.reduce((a, r) => a + r.ejercicios.reduce((b, e) => b + e.series, 0), 0);

  return (
    <>
      {/* MODAL EJECUTAR */}
      <AnimatePresence>
        {rutinaActiva && (
          <EjecutarRutina
            rutina={rutinaActiva}
            onCerrar={() => setRutinaActiva(null)}
          />
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto space-y-8">

        {/* STATS HEADER */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Rutinas", valor: rutinas.length, icon: <List size={16} /> },
            { label: "Ejercicios", valor: totalEjercicios, icon: <Dumbbell size={16} /> },
            { label: "Series totales", valor: totalSeries, icon: <Flame size={16} /> },
          ].map(({ label, valor, icon }) => (
            <div key={label} className="bg-white border border-primary/10 rounded-[24px] p-5 shadow-lg shadow-primary/5 flex flex-col gap-2">
              <div className="text-primary/30">{icon}</div>
              <span className="text-2xl font-black text-primary italic tracking-tighter">{valor}</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-primary/30">{label}</span>
            </div>
          ))}
        </div>

        {/* FILTROS + NUEVA RUTINA */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white border border-primary/10 rounded-2xl p-1.5 flex-wrap shadow-sm">
            {TAGS.map(t => (
              <button key={t} onClick={() => setFiltroTag(t)}
                className={cn(
                  "text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all",
                  filtroTag === t ? "bg-primary text-white shadow-md shadow-primary/20" : "text-primary/35 hover:text-primary"
                )}>
                {t}
              </button>
            ))}
          </div>
          <button onClick={() => setCreando(true)}
            className="ml-auto flex items-center gap-2 bg-primary text-white text-[9px] font-black uppercase tracking-widest px-5 py-3 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md shadow-primary/25 shrink-0">
            <Plus size={14} /> Nueva rutina
          </button>
        </div>

        {/* FORM NUEVA RUTINA */}
        <AnimatePresence>
          {creando && (
            <FormNuevaRutina
              onGuardar={(r) => { setRutinas(p => [r, ...p]); setCreando(false); }}
              onCancelar={() => setCreando(false)}
            />
          )}
        </AnimatePresence>

        {/* LISTA RUTINAS */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {rutinasFiltradas.map((rutina) => (
              <motion.div key={rutina.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
              >
                <CardRutina
                  rutina={rutina}
                  onIniciar={() => setRutinaActiva(rutina)}
                  expandida={expandida === rutina.id}
                  onToggle={() => setExpandida(expandida === rutina.id ? null : rutina.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {rutinasFiltradas.length === 0 && (
            <div className="text-center py-16">
              <Dumbbell size={32} className="text-primary/15 mx-auto mb-3" />
              <p className="text-[10px] font-black uppercase tracking-widest text-primary/20 italic">
                No hay rutinas para este filtro
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};