"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { rutinasQueries, ejerciciosQueries } from "@/lib/api/queries/personal/ejercicios";
import {
  Dumbbell, Play, Check, X, Plus, ChevronDown,
  Flame, Star, List, Loader2,
} from "lucide-react";

interface Ejercicio {
  id: string;
  nombre: string;
  series: number;
  reps: string;
  descanso: number;
  musculo: string;
  notas?: string;
  orden?: number;
}

interface Rutina {
  id: string;
  nombre: string;
  descripcion: string;
  tag: string;
  ejercicios: Ejercicio[];
}

const TAGS = ["Todas", "Fuerza", "Cardio", "Flexibilidad", "Movilidad"];
const TAG_COLORES: Record<string, string> = {
  "Fuerza":       "bg-primary/10 text-primary border-primary/20",
  "Cardio":       "bg-accent/20 text-accent border-accent/30",
  "Flexibilidad": "bg-primary/15 text-primary border-primary/25",
  "Movilidad":    "bg-accent/10 text-primary border-accent/20",
};

const PLAN_DIARIO = [
  {
    tipo: "Fuerza",
    subtitulo: "Calistenia",
    icon: "💪",
    frecuencia: "3× semana",
    duracion: "40 – 50 min",
    color: "bg-primary/10 text-primary border-primary/20",
  },
  {
    tipo: "Cardio",
    subtitulo: "Caminata o Baile",
    icon: "🕺",
    frecuencia: "2× semana",
    duracion: "20 – 30 min",
    color: "bg-accent/20 text-primary border-accent/30",
  },
  {
    tipo: "Flexibilidad",
    subtitulo: "Yoga",
    icon: "🧘",
    frecuencia: "Diario",
    duracion: "10 – 15 min",
    color: "bg-primary/5 text-primary border-primary/10",
  },
  {
    tipo: "Movilidad",
    subtitulo: "Movilidad articular",
    icon: "🎯",
    frecuencia: "Diario",
    duracion: "5 min",
    color: "bg-accent/10 text-primary border-accent/20",
  },
];

const PlanDiario = () => (
  <div className="bg-white-custom border border-primary/10 rounded-[28px] p-6 shadow-lg shadow-primary/5">
    <div className="flex items-center gap-3 mb-5">
      <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-base">📅</div>
      <div>
        <span className="text-[8px] font-black uppercase tracking-[0.3em] text-primary/30 italic block">Plan personalizado</span>
        <h3 className="text-sm font-black text-primary italic tracking-tight leading-none">Tu rutina ideal</h3>
      </div>
    </div>
    <div className="space-y-2">
      {PLAN_DIARIO.map(({ tipo, subtitulo, icon, frecuencia, duracion, color }) => (
        <div key={tipo} className={`rounded-2xl border p-3.5 ${color} flex items-center gap-3`}>
          <span className="text-xl shrink-0">{icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[11px] font-black uppercase tracking-widest">{tipo}</span>
            </div>
            <span className="text-[8px] font-bold opacity-50">{subtitulo}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="bg-white-custom/70 rounded-lg px-2 py-1 text-center">
              <span className="text-[10px] font-black block leading-none">{frecuencia}</span>
            </div>
            <div className="bg-white-custom/70 rounded-lg px-2 py-1 text-center">
              <span className="text-[10px] font-black block leading-none">{duracion}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);
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

const EjecutarRutina = ({ rutina, onCerrar }: { rutina: Rutina; onCerrar: () => void }) => {
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

  useEffect(() => {
    if (fase !== "descanso") return;
    setSegundos(ejercicio.descanso);
    setCorriendo(true);
  }, [fase, ejercicioIdx, serieActual]);

  useEffect(() => {
    if (!corriendo || fase !== "descanso") return;
    intervalRef.current = setInterval(() => {
      setSegundos(prev => {
        if (prev <= 1) { clearInterval(intervalRef.current!); setCorriendo(false); beep(1046, 0.3); setFase("ejercicio"); return 0; }
        if (prev <= 4) beep(660, 0.08);
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [corriendo, fase]);

  const completarSerie = () => {
    beep(880, 0.1);
    setCompletados(p => [...p, `${ejercicioIdx}-${serieActual}`]);
    if (esUltimaSerie && esUltimoEjercicio) { setFase("fin"); }
    else if (esUltimaSerie) { setEjercicioIdx(i => i + 1); setSerieActual(1); setFase("descanso"); }
    else { setSerieActual(s => s + 1); setFase("descanso"); }
  };

  const r = 54; const circ = 2 * Math.PI * r;
  const pct = fase === "descanso" ? segundos / ejercicio.descanso : 1;

  if (fase === "fin") return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-primary">
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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-primary">
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <div>
          <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30 italic">Rutina</span>
          <h2 className="text-lg font-black text-white italic tracking-tight">{rutina.nombre}</h2>
        </div>
        <button onClick={onCerrar} className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
          <X size={18} className="text-white/60" />
        </button>
      </div>

      <div className="px-6 mb-6">
        <div className="flex gap-1.5">
          {rutina.ejercicios.map((_, i) => (
            <div key={i} className={cn("h-1 flex-1 rounded-full transition-all duration-500",
              i < ejercicioIdx ? "bg-white" : i === ejercicioIdx ? "bg-white/60" : "bg-white/15")} />
          ))}
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Ejercicio {ejercicioIdx + 1} de {rutina.ejercicios.length}</span>
          <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Serie {serieActual} de {ejercicio.series}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        <AnimatePresence mode="wait">
          <motion.div key={ejercicioIdx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }} className="flex flex-col items-center gap-3 text-center">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 italic">{ejercicio.musculo}</span>
            <h1 className="text-4xl sm:text-6xl font-black text-white italic tracking-tighter leading-none">{ejercicio.nombre}</h1>
            <div className="flex items-center gap-4 mt-2">
              {([["Series", String(ejercicio.series)], ["Reps", ejercicio.reps], ["Descanso", `${ejercicio.descanso}s`]] as [string, string][]).map(([label, val], i, arr) => (
                <React.Fragment key={label}>
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] font-black uppercase tracking-widest text-white/30">{label}</span>
                    <span className="text-2xl font-black text-white tabular-nums">{val}</span>
                  </div>
                  {i < arr.length - 1 && <div className="w-px h-8 bg-white/15" />}
                </React.Fragment>
              ))}
            </div>
            {ejercicio.notas && <span className="text-[10px] font-bold text-white/30 italic mt-1">* {ejercicio.notas}</span>}
          </motion.div>
        </AnimatePresence>

        {fase === "descanso" ? (
          <div className="flex flex-col items-center gap-4">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40">Descansando</span>
            <div className="relative w-36 h-36">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={r} fill="none" stroke="white" strokeWidth="5" opacity="0.1" />
                <motion.circle cx="60" cy="60" r={r} fill="none" stroke="white" strokeWidth="5"
                  strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
                  style={{ transition: "stroke-dashoffset 1s linear" }} />
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
          <div className="flex gap-2">
            {Array.from({ length: ejercicio.series }).map((_, i) => {
              const done = completados.includes(`${ejercicioIdx}-${i + 1}`) || i < serieActual - 1;
              const actual = i === serieActual - 1;
              return (
                <div key={i} className={cn("w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs transition-all",
                  done ? "bg-white text-primary" : actual ? "bg-white/20 text-white border-2 border-white/40" : "bg-white/8 text-white/20 border border-white/10")}>
                  {done ? <Check size={14} /> : i + 1}
                </div>
              );
            })}
          </div>
        )}
      </div>

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

const CardRutina = ({ rutina, onIniciar, onEliminar, expandida, onToggle }: {
  rutina: Rutina; onIniciar: () => void; onEliminar: () => void; expandida: boolean; onToggle: () => void;
}) => {
  const totalSeries = rutina.ejercicios.reduce((a, e) => a + e.series, 0);
  const tagColor = TAG_COLORES[rutina.tag] ?? "bg-primary/10 text-primary border-primary/20";

  return (
    <div className={cn("bg-white-custom border border-primary/10 rounded-[28px] overflow-hidden shadow-lg shadow-primary/5 transition-all", expandida && "shadow-xl shadow-primary/10")}>
      <div className="p-5 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={cn("text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border", tagColor)}>{rutina.tag}</span>
            </div>
            <h3 className="text-lg font-black text-primary italic tracking-tight leading-none mb-1">{rutina.nombre}</h3>
            <p className="text-[10px] font-bold text-primary/40 uppercase tracking-wide">{rutina.descripcion}</p>
          </div>
          <motion.div animate={{ rotate: expandida ? 180 : 0 }} transition={{ duration: 0.25 }}>
            <ChevronDown size={18} className="text-primary/30 shrink-0 mt-1" />
          </motion.div>
        </div>
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-primary/5">
          <div className="flex items-center gap-1.5">
            <Dumbbell size={12} className="text-primary/30" />
            <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">{rutina.ejercicios.length} ejercicios</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Flame size={12} className="text-primary/30" />
            <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">{totalSeries} series</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={(e) => { e.stopPropagation(); onEliminar(); }}
              className="p-2 text-accent hover:text-primary hover:bg-accent/10 rounded-xl transition-all">
              <X size={14} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onIniciar(); }}
              className="flex items-center gap-2 bg-primary text-white text-[9px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md shadow-primary/25">
              <Play size={11} fill="white" /> Iniciar
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expandida && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <div className="px-5 pb-5 border-t border-primary/5">
              <div className="pt-4 space-y-2">
                {rutina.ejercicios.map((ej, i) => (
                  <motion.div key={ej.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 p-3 bg-primary/3 rounded-2xl border border-primary/5">
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

const FormNuevaRutina = ({ onGuardar, onCancelar, guardando }: {
  onGuardar: (datos: { nombre: string; descripcion: string; tag: string }, ejercicios: Omit<Ejercicio, "id">[]) => Promise<void>;
  onCancelar: () => void; guardando: boolean;
}) => {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tag, setTag] = useState("Fuerza");
  const [ejercicios, setEjercicios] = useState<Omit<Ejercicio, "id">[]>([]);
  const [nuevoEj, setNuevoEj] = useState({ nombre: "", series: "3", reps: "10", descanso: "60", musculo: "" });

  const addEjercicio = () => {
    if (!nuevoEj.nombre.trim()) return;
    setEjercicios(p => [...p, {
      nombre: nuevoEj.nombre, series: parseInt(nuevoEj.series) || 3,
      reps: nuevoEj.reps || "10", descanso: parseInt(nuevoEj.descanso) || 60,
      musculo: nuevoEj.musculo || "General", orden: p.length,
    }]);
    setNuevoEj({ nombre: "", series: "3", reps: "10", descanso: "60", musculo: "" });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white-custom border border-primary/10 rounded-[28px] p-6 shadow-xl shadow-primary/5">
      <div className="flex items-center gap-3 mb-6">
        <Plus size={18} className="text-primary" />
        <h3 className="text-[12px] font-black uppercase tracking-widest text-primary/60">Nueva Rutina</h3>
      </div>
      <div className="space-y-3 mb-6">
        <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre de la rutina..."
          className="w-full bg-primary/5 border-2 border-transparent focus:border-primary/15 focus:bg-white-custom rounded-2xl py-3 px-5 text-sm font-bold text-primary outline-none placeholder:text-primary/25 transition-all" />
        <input value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Descripción..."
          className="w-full bg-primary/5 border-2 border-transparent focus:border-primary/15 focus:bg-white-custom rounded-2xl py-3 px-5 text-sm font-bold text-primary outline-none placeholder:text-primary/25 transition-all" />
        <div className="flex gap-2 flex-wrap">
          {TAGS.filter(t => t !== "Todas").map(t => (
            <button key={t} onClick={() => setTag(t)}
              className={cn("text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border transition-all",
                tag === t ? "bg-primary text-white border-primary" : "border-primary/15 text-primary/40 hover:text-primary hover:border-primary/30")}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {ejercicios.length > 0 && (
        <div className="space-y-2 mb-4">
          {ejercicios.map((ej, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-primary/4 rounded-2xl">
              <span className="text-[8px] font-black text-primary/30 w-4">{i + 1}</span>
              <span className="text-[11px] font-black text-primary flex-1 truncate">{ej.nombre}</span>
              <span className="text-[9px] text-primary/40 font-bold">{ej.series}×{ej.reps}</span>
              <button onClick={() => setEjercicios(p => p.filter((_, j) => j !== i))} className="text-accent hover:text-primary transition-colors"><X size={14} /></button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-primary/4 rounded-2xl p-4 mb-6 border border-primary/8">
        <p className="text-[9px] font-black uppercase tracking-widest text-primary/30 mb-3">Añadir ejercicio</p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input value={nuevoEj.nombre} onChange={e => setNuevoEj(p => ({ ...p, nombre: e.target.value }))}
            placeholder="Nombre..." onKeyDown={e => e.key === "Enter" && addEjercicio()}
            className="col-span-2 bg-white-custom border border-primary/10 rounded-xl px-3 py-2 text-xs font-bold text-primary outline-none focus:border-primary/30 placeholder:text-primary/20" />
          <input value={nuevoEj.musculo} onChange={e => setNuevoEj(p => ({ ...p, musculo: e.target.value }))} placeholder="Músculo..."
            className="bg-white-custom border border-primary/10 rounded-xl px-3 py-2 text-xs font-bold text-primary outline-none focus:border-primary/30 placeholder:text-primary/20" />
          <input value={nuevoEj.series} onChange={e => setNuevoEj(p => ({ ...p, series: e.target.value }))} placeholder="Series" type="number"
            className="bg-white-custom border border-primary/10 rounded-xl px-3 py-2 text-xs font-bold text-primary outline-none focus:border-primary/30 placeholder:text-primary/20" />
          <input value={nuevoEj.reps} onChange={e => setNuevoEj(p => ({ ...p, reps: e.target.value }))} placeholder="Reps (ej: 12 o 30s)"
            className="bg-white-custom border border-primary/10 rounded-xl px-3 py-2 text-xs font-bold text-primary outline-none focus:border-primary/30 placeholder:text-primary/20" />
          <input value={nuevoEj.descanso} onChange={e => setNuevoEj(p => ({ ...p, descanso: e.target.value }))} placeholder="Descanso (seg)" type="number"
            className="bg-white-custom border border-primary/10 rounded-xl px-3 py-2 text-xs font-bold text-primary outline-none focus:border-primary/30 placeholder:text-primary/20" />
        </div>
        <button onClick={addEjercicio} disabled={!nuevoEj.nombre.trim()}
          className="w-full bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest py-2 rounded-xl hover:bg-primary hover:text-white transition-all disabled:opacity-30">
          + Añadir ejercicio
        </button>
      </div>

      <div className="flex gap-3">
        <button onClick={onCancelar} disabled={guardando}
          className="flex-1 border border-primary/15 text-primary/40 text-[9px] font-black uppercase tracking-widest py-3 rounded-xl hover:text-primary hover:border-primary/30 transition-all">
          Cancelar
        </button>
        <button onClick={() => onGuardar({ nombre, descripcion, tag }, ejercicios)}
          disabled={!nombre.trim() || ejercicios.length === 0 || guardando}
          className="flex-1 bg-primary text-white text-[9px] font-black uppercase tracking-widest py-3 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md shadow-primary/25 disabled:opacity-40 flex items-center justify-center gap-2">
          {guardando ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : "Guardar rutina"}
        </button>
      </div>
    </motion.div>
  );
};

export const PaginaEjercicios = () => {
  const [rutinas, setRutinas] = useState<Rutina[]>([]);
  const [cargando, setCargando] = useState(true);
  const [rutinaActiva, setRutinaActiva] = useState<Rutina | null>(null);
  const [expandida, setExpandida] = useState<string | null>(null);
  const [filtroTag, setFiltroTag] = useState("Todas");
  const [creando, setCreando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    rutinasQueries.getAll()
      .then(setRutinas)
      .catch(err => console.error("Error cargando rutinas:", err))
      .finally(() => setCargando(false));
  }, []);

  const rutinasFiltradas = useMemo(() =>
    filtroTag === "Todas" ? rutinas : rutinas.filter(r => r.tag === filtroTag),
    [rutinas, filtroTag]
  );

  const totalEjercicios = rutinas.reduce((a, r) => a + r.ejercicios.length, 0);
  const totalSeries = rutinas.reduce((a, r) => a + r.ejercicios.reduce((b, e) => b + e.series, 0), 0);

  const handleGuardar = async (
    datos: { nombre: string; descripcion: string; tag: string },
    ejercicios: Omit<Ejercicio, "id">[]
  ) => {
    if (!datos.nombre.trim() || ejercicios.length === 0) return;
    setGuardando(true);
    try {
      const rutinaCreada = await rutinasQueries.add(datos);
      await ejerciciosQueries.reemplazar(rutinaCreada.id, ejercicios.map((e, i) => ({ ...e, orden: i })));
      const data = await rutinasQueries.getAll();
      setRutinas(data);
      setCreando(false);
    } catch (err) { console.error(err); }
    finally { setGuardando(false); }
  };

  const handleEliminar = async (id: string) => {
    try {
      await rutinasQueries.delete(id);
      setRutinas(p => p.filter(r => r.id !== id));
    } catch (err) { console.error(err); }
  };

  return (
    <>
      <AnimatePresence>
        {rutinaActiva && <EjecutarRutina rutina={rutinaActiva} onCerrar={() => setRutinaActiva(null)} />}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto space-y-8">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Rutinas",        valor: rutinas.length,  icon: <List size={16} /> },
            { label: "Ejercicios",     valor: totalEjercicios, icon: <Dumbbell size={16} /> },
            { label: "Series totales", valor: totalSeries,     icon: <Flame size={16} /> },
          ].map(({ label, valor, icon }) => (
            <div key={label} className="bg-white-custom border border-primary/10 rounded-3xl p-5 shadow-lg shadow-primary/5 flex flex-col gap-2">
              <div className="text-primary/30">{icon}</div>
              <span className="text-2xl font-black text-primary italic tracking-tighter">{valor}</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-primary/30">{label}</span>
            </div>
          ))}
        </div>

        <PlanDiario />

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white-custom border border-primary/10 rounded-2xl p-1.5 flex-wrap shadow-sm">
            {TAGS.map(t => (
              <button key={t} onClick={() => setFiltroTag(t)}
                className={cn("text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all",
                  filtroTag === t ? "bg-primary text-white shadow-md shadow-primary/20" : "text-primary/35 hover:text-primary")}>
                {t}
              </button>
            ))}
          </div>
          <button onClick={() => setCreando(true)}
            className="ml-auto flex items-center gap-2 bg-primary text-white text-[9px] font-black uppercase tracking-widest px-5 py-3 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md shadow-primary/25 shrink-0">
            <Plus size={14} /> Nueva rutina
          </button>
        </div>

        <AnimatePresence>
          {creando && <FormNuevaRutina onGuardar={handleGuardar} onCancelar={() => setCreando(false)} guardando={guardando} />}
        </AnimatePresence>

        {cargando ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-primary/30" />
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {rutinasFiltradas.map(rutina => (
                <motion.div key={rutina.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}>
                  <CardRutina
                    rutina={rutina}
                    onIniciar={() => setRutinaActiva(rutina)}
                    onEliminar={() => handleEliminar(rutina.id)}
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
                  {filtroTag === "Todas" ? "Aún no tienes rutinas" : `No hay rutinas de ${filtroTag}`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};