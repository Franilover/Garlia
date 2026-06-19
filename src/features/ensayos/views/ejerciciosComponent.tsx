"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Play, Check, X, Plus, ChevronDown } from "lucide-react";
import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";

import { Btn, BtnIcon, Badge, Loading, EmptyState } from "@/components/ui";
import { MotionDiv } from "@/components/ui/Motion";
import { rutinasQueries, ejerciciosQueries } from "@/lib/api/queries/personal/ejercicios";
import { cn } from "@/lib/utils/index";

interface Ejercicio {
  id: string; nombre: string; series: number; reps: string;
  descanso: number; musculo: string; notas?: string; orden?: number;
}
interface Rutina {
  id: string; nombre: string; descripcion: string; tag: string; ejercicios: Ejercicio[];
}

const TAGS = ["Todas", "Fuerza", "Cardio", "Flexibilidad", "Movilidad"];
const TAG_COLORES: Record<string, string> = {
  "Fuerza":       "bg-primary/10 text-primary border-primary/20",
  "Cardio":       "bg-accent/20 text-accent border-accent/30",
  "Flexibilidad": "bg-primary/15 text-primary border-primary/25",
  "Movilidad":    "bg-accent/10 text-primary border-accent/20",
};
const PLAN_DIARIO = [
  { tipo: "Fuerza",       subtitulo: "Calistenia",          frecuencia: "3× semana", duracion: "40 – 50 min", color: "bg-primary/10 text-primary border-primary/20" },
  { tipo: "Cardio",       subtitulo: "Caminata o Baile",    frecuencia: "2× semana", duracion: "20 – 30 min", color: "bg-accent/20 text-primary border-accent/30" },
  { tipo: "Flexibilidad", subtitulo: "Yoga",                frecuencia: "Diario",    duracion: "10 – 15 min", color: "bg-primary/5 text-primary border-primary/10" },
  { tipo: "Movilidad",    subtitulo: "Movilidad articular", frecuencia: "Diario",    duracion: "5 min",       color: "bg-accent/10 text-primary border-accent/20" },
];
const DIAS = ["L", "M", "X", "J", "V", "S", "D"];

const getSemanaKey = () => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, "0")}`;
};

const PlanDiario = () => {
  const [expandido, setExpandido] = useState<string | null>(null);
  const [registros, setRegistros] = useState<Record<string, boolean[]>>({});
  const semanaActual = getSemanaKey();

  useEffect(() => {
    const cargar = async () => {
      try {
        const { supabase } = await import("@/lib/api/client/supabase");
        const { data } = await supabase
          .from("plan_diario_registro")
          .select("tipo, dias")
          .eq("semana", semanaActual);
        if (data) {
          const map: Record<string, boolean[]> = {};
          data.forEach((row: { tipo: string; dias: boolean[] }) => { map[row.tipo] = row.dias; });
          setRegistros(map);
        }
      } catch {}
    };
    cargar();
  }, [semanaActual]);

  const toggleDia = async (tipo: string, diaIdx: number) => {
    const diasActuales = registros[tipo] ?? Array(7).fill(false);
    const nuevosDias = diasActuales.map((v: boolean, i: number) => i === diaIdx ? !v : v);
    setRegistros(prev => ({ ...prev, [tipo]: nuevosDias }));
    try {
      const { supabase } = await import("@/lib/api/client/supabase");
      await supabase
        .from("plan_diario_registro")
        .upsert({ semana: semanaActual, tipo, dias: nuevosDias }, { onConflict: "semana,tipo" });
    } catch {}
  };

  return (
    <div className="bg-white-custom border-[length:var(--border-width)] border-primary/10 rounded-[var(--radius-card)] p-6 shadow-lg shadow-primary/5">
      <div className="mb-5">
        <h3 className="text-base font-black text-primary tracking-tight">Plan semanal</h3>
        <span className="text-[10px] font-bold text-primary/40 uppercase tracking-widest">{semanaActual}</span>
      </div>
      <div className="space-y-2">
        {PLAN_DIARIO.map(({ tipo, subtitulo, frecuencia, duracion, color }) => {
          const abierto = expandido === tipo;
          const dias = registros[tipo] ?? Array(7).fill(false);
          const cumplidos = dias.filter(Boolean).length;
          return (
            <div key={tipo} className={`rounded-[var(--radius-btn)] border-[length:var(--border-width)] ${color} overflow-hidden`}>
              <div
                className="p-3.5 flex items-center gap-3 cursor-pointer select-none"
                onClick={() => setExpandido(abierto ? null : tipo)}
              >
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-black uppercase tracking-widest">{tipo}</span>
                  <span className="text-[8px] font-bold opacity-50 block">{subtitulo}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="bg-white-custom/70 rounded-[var(--radius-btn)] px-2 py-1">
                    <span className="text-[10px] font-black block leading-none">{frecuencia}</span>
                  </div>
                  <div className="bg-white-custom/70 rounded-[var(--radius-btn)] px-2 py-1">
                    <span className="text-[10px] font-black block leading-none">{duracion}</span>
                  </div>
                  {cumplidos > 0 && (
                    <div className="bg-white-custom/80 rounded-[var(--radius-btn)] px-2 py-1">
                      <span className="text-[10px] font-black block leading-none text-primary">{cumplidos}/7</span>
                    </div>
                  )}
                  <MotionDiv animate={{ rotate: abierto ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="opacity-50" size={14} />
                  </MotionDiv>
                </div>
              </div>
              <AnimatePresence>
                {abierto && (
                  <MotionDiv
                    animate={{ height: "auto", opacity: 1 }}
                    className="overflow-hidden"
                    exit={{ height: 0, opacity: 0 }}
                    initial={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="px-3.5 pb-3.5 pt-0 flex gap-1.5">
                      {DIAS.map((dia, i) => (
                        <button
                          key={dia}
                          className={cn(
                            "flex-1 py-2 rounded-[var(--radius-btn)] border-[length:var(--border-width)] text-[9px] font-black uppercase tracking-widest transition-all",
                            dias[i]
                              ? "bg-primary text-btn-text border-primary"
                              : "bg-white-custom/50 text-primary/40 border-primary/10 hover:bg-white-custom/80"
                          )}
                          onClick={() => toggleDia(tipo, i)}
                        >
                          {dias[i] ? <Check className="mx-auto" size={10} /> : dia}
                        </button>
                      ))}
                    </div>
                  </MotionDiv>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const beep = (freq = 880, dur = 0.15) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = freq; osc.type = "sine";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + dur);
  } catch {}
};

const EjecutarRutina = ({ rutina, onCerrar }: { rutina: Rutina; onCerrar: () => void }) => {
  const [ejercicioIdx, setEjercicioIdx] = useState(0);
  const [serieActual, setSerieActual]   = useState(1);
  const [fase, setFase]                 = useState<"ejercicio" | "descanso" | "fin">("ejercicio");
  const [segundos, setSegundos]         = useState(0);
  const [corriendo, setCorriendo]       = useState(false);
  const [completados, setCompletados]   = useState<string[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const ejercicio = (rutina.ejercicios ?? [])[ejercicioIdx];
  const esUltimoEjercicio = ejercicioIdx === (rutina.ejercicios ?? []).length - 1;
  const esUltimaSerie = serieActual === ejercicio?.series;

  useEffect(() => { if (fase !== "descanso") return; setSegundos(ejercicio.descanso); setCorriendo(true); }, [fase, ejercicioIdx, serieActual]);
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
    if (esUltimaSerie && esUltimoEjercicio) setFase("fin");
    else if (esUltimaSerie) { setEjercicioIdx(i => i + 1); setSerieActual(1); setFase("descanso"); }
    else { setSerieActual(s => s + 1); setFase("descanso"); }
  };

  const r = 54; const circ = 2 * Math.PI * r;
  const pct = fase === "descanso" ? segundos / ejercicio.descanso : 1;

  if (fase === "fin") return (
    <MotionDiv animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-primary" initial={{ opacity: 0 }}>
      <MotionDiv animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-4" initial={{ scale: 0.8, opacity: 0 }} transition={{ delay: 0.2 }}>
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[color-mix(in_srgb,var(--btn-text)_40%,transparent)] italic">Completado</span>
        <h2 className="text-5xl font-black text-btn-text italic tracking-tighter text-center">{rutina.nombre}</h2>
        <p className="text-[color-mix(in_srgb,var(--btn-text)_40%,transparent)] text-sm font-bold uppercase tracking-widest">
          {rutina.ejercicios.length} ejercicios · {(rutina.ejercicios ?? []).reduce((a, e) => a + e.series, 0)} series
        </p>
        <Btn className="mt-8 bg-white-custom text-primary hover:bg-white-custom/90 shadow-2xl" size="lg" onClick={onCerrar}>Terminar</Btn>
      </MotionDiv>
    </MotionDiv>
  );

  return (
    <MotionDiv animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex flex-col bg-primary" exit={{ opacity: 0 }} initial={{ opacity: 0 }}>
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <div>
          <span className="text-[8px] font-black uppercase tracking-[0.3em] text-[color-mix(in_srgb,var(--btn-text)_30%,transparent)] italic">Rutina</span>
          <h2 className="text-lg font-black text-btn-text italic tracking-tight">{rutina.nombre}</h2>
        </div>
        <BtnIcon className="bg-btn-text/10 hover:bg-btn-text/20 border-none" variant="ghost" onClick={onCerrar}>
          <X className="text-[color-mix(in_srgb,var(--btn-text)_60%,transparent)]" size={18} />
        </BtnIcon>
      </div>
      <div className="px-6 mb-6">
        <div className="flex gap-1.5">
          {(rutina.ejercicios ?? []).map((_, i) => (
            <div key={i} className={cn("h-1 flex-1 rounded-full transition-all duration-500", i < ejercicioIdx ? "bg-white-custom" : i === ejercicioIdx ? "bg-btn-text/60" : "bg-btn-text/15")} />
          ))}
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[8px] font-black text-[color-mix(in_srgb,var(--btn-text)_30%,transparent)] uppercase tracking-widest">Ejercicio {ejercicioIdx + 1} de {(rutina.ejercicios ?? []).length}</span>
          <span className="text-[8px] font-black text-[color-mix(in_srgb,var(--btn-text)_30%,transparent)] uppercase tracking-widest">Serie {serieActual} de {ejercicio.series}</span>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        <AnimatePresence mode="wait">
          <MotionDiv key={ejercicioIdx} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-3 text-center" exit={{ opacity: 0, y: -20 }} initial={{ opacity: 0, y: 20 }}>
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[color-mix(in_srgb,var(--btn-text)_30%,transparent)] italic">{ejercicio.musculo}</span>
            <h1 className="text-4xl sm:text-6xl font-black text-btn-text italic tracking-tighter leading-none">{ejercicio.nombre}</h1>
            <div className="flex items-center gap-4 mt-2">
              {([["Series", String(ejercicio.series)], ["Reps", ejercicio.reps], ["Descanso", `${ejercicio.descanso}s`]] as [string, string][]).map(([label, val], i, arr) => (
                <React.Fragment key={label}>
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] font-black uppercase tracking-widest text-[color-mix(in_srgb,var(--btn-text)_30%,transparent)]">{label}</span>
                    <span className="text-2xl font-black text-btn-text tabular-nums">{val}</span>
                  </div>
                  {i < arr.length - 1 && <div className="w-px h-8 bg-btn-text/15" />}
                </React.Fragment>
              ))}
            </div>
            {ejercicio.notas && <span className="text-[10px] font-bold text-[color-mix(in_srgb,var(--btn-text)_30%,transparent)] italic mt-1">* {ejercicio.notas}</span>}
          </MotionDiv>
        </AnimatePresence>
        {fase === "descanso" ? (
          <div className="flex flex-col items-center gap-4">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[color-mix(in_srgb,var(--btn-text)_40%,transparent)]">Descansando</span>
            <div className="relative w-36 h-36">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" fill="none" opacity="0.1" r={r} stroke="white" strokeWidth="5" />
                <motion.circle cx="60" cy="60" fill="none" r={r} stroke="white" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round" strokeWidth="5" style={{ transition: "stroke-dashoffset 1s linear" }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-btn-text tabular-nums tracking-tighter">{segundos}</span>
                <span className="text-[8px] font-black text-[color-mix(in_srgb,var(--btn-text)_40%,transparent)] uppercase tracking-widest">seg</span>
              </div>
            </div>
            <Btn className="border-[color-mix(in_srgb,var(--btn-text)_15%,transparent)] text-[color-mix(in_srgb,var(--btn-text)_40%,transparent)]" size="sm" variant="outline"
              onClick={() => { clearInterval(intervalRef.current!); setCorriendo(false); setFase("ejercicio"); }}>
              Saltar descanso
            </Btn>
          </div>
        ) : (
          <div className="flex gap-2">
            {Array.from({ length: ejercicio.series }).map((_, i) => {
              const done = completados.includes(`${ejercicioIdx}-${i + 1}`) || i < serieActual - 1;
              const actual = i === serieActual - 1;
              return (
                <div key={i} className={cn("w-9 h-9 rounded-[var(--radius-btn)] flex items-center justify-center font-black text-xs transition-all",
                  done ? "bg-white-custom text-primary" : actual ? "bg-btn-text/20 text-btn-text border-[length:var(--border-width)] border-[color-mix(in_srgb,var(--btn-text)_40%,transparent)]" : "bg-btn-text/8 text-[color-mix(in_srgb,var(--btn-text)_20%,transparent)] border border-[color-mix(in_srgb,var(--btn-text)_10%,transparent)]")}>
                  {done ? <Check size={14} /> : i + 1}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {fase === "ejercicio" && (
        <div className="px-6 pb-10">
          <Btn fullWidth className="bg-white-custom text-primary hover:bg-white-custom/90 shadow-2xl" icon={<Check size={20} />} size="lg" onClick={completarSerie}>
            {esUltimaSerie && esUltimoEjercicio ? "Finalizar rutina" : `Serie ${serieActual} completada`}
          </Btn>
        </div>
      )}
    </MotionDiv>
  );
};

const CardRutina = ({ rutina, onIniciar, onEliminar, expandida, onToggle }: {
  rutina: Rutina; onIniciar: () => void; onEliminar: () => void; expandida: boolean; onToggle: () => void;
}) => {
  const ejercicios  = rutina.ejercicios ?? [];
  const totalSeries = ejercicios.reduce((a, e) => a + e.series, 0);
  const tagColor = TAG_COLORES[rutina.tag] ?? "bg-primary/10 text-primary border-primary/20";
  return (
    <div className={cn("bg-white-custom border-[length:var(--border-width)] border-primary/10 rounded-[var(--radius-card)] overflow-hidden shadow-lg shadow-primary/5 transition-all", expandida && "shadow-xl shadow-primary/10")}>
      <div className="p-5 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={cn("text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-[var(--radius-btn)] border-[length:var(--border-width)]", tagColor)}>{rutina.tag}</span>
            </div>
            <h3 className="text-lg font-black text-primary italic tracking-tight leading-none mb-1">{rutina.nombre}</h3>
            <p className="text-[10px] font-bold text-primary/40 uppercase tracking-wide">{rutina.descripcion}</p>
          </div>
          <MotionDiv animate={{ rotate: expandida ? 180 : 0 }} transition={{ duration: 0.25 }}>
            <ChevronDown className="text-primary/30 shrink-0 mt-1" size={18} />
          </MotionDiv>
        </div>
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-primary/5">
          <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">{ejercicios.length} ejercicios</span>
          <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">{totalSeries} series</span>
          <div className="ml-auto flex items-center gap-2">
            <BtnIcon className="text-accent hover:text-primary hover:bg-accent/10 border-none" size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onEliminar(); }}><X size={14} /></BtnIcon>
            <Btn icon={<Play fill="white" size={11} />} size="sm" onClick={(e) => { e.stopPropagation(); onIniciar(); }}>Iniciar</Btn>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {expandida && (
          <MotionDiv animate={{ height: "auto", opacity: 1 }} className="overflow-hidden" exit={{ height: 0, opacity: 0 }} initial={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
            <div className="px-5 pb-5 border-t border-primary/5">
              <div className="pt-4 space-y-2">
                {ejercicios.map((ej, i) => (
                  <MotionDiv key={ej.id} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 p-3 bg-primary/3 rounded-[var(--radius-btn)] border-[length:var(--border-width)] border-primary/5" initial={{ opacity: 0, x: -8 }}
                    transition={{ delay: i * 0.04 }}>
                    <div className="w-6 h-6 rounded-[var(--radius-btn)] bg-primary/10 flex items-center justify-center shrink-0"><span className="text-[8px] font-black text-primary">{i + 1}</span></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-primary uppercase tracking-tight truncate">{ej.nombre}</p>
                      <p className="text-[8px] font-bold text-primary/35 uppercase tracking-widest">{ej.musculo}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[9px] font-black text-primary/50">{ej.series}×{ej.reps}</span>
                      <span className="text-[8px] font-bold text-primary/25 border-[length:var(--border-width)] border-primary/10 px-1.5 py-0.5 rounded-[var(--radius-btn)]">{ej.descanso}s</span>
                    </div>
                  </MotionDiv>
                ))}
              </div>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
};

const FormNuevaRutina = ({ onGuardar, onCancelar, guardando }: {
  onGuardar: (datos: { nombre: string; descripcion: string; tag: string }, ejercicios: Omit<Ejercicio, "id">[]) => Promise<void>;
  onCancelar: () => void; guardando: boolean;
}) => {
  const [nombre, setNombre]           = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tag, setTag]                 = useState("Fuerza");
  const [ejercicios, setEjercicios]   = useState<Omit<Ejercicio, "id">[]>([]);
  const [nuevoEj, setNuevoEj]         = useState({ nombre: "", series: "3", reps: "10", descanso: "60", musculo: "" });
  const inputCls = "bg-white-custom border-[length:var(--border-width)] border-primary/10 rounded-[var(--radius-btn)] px-3 py-2 text-xs font-bold text-primary outline-none focus:border-primary/30 placeholder:text-primary/20";

  const addEjercicio = () => {
    if (!nuevoEj.nombre.trim()) return;
    setEjercicios(p => [...p, { nombre: nuevoEj.nombre, series: parseInt(nuevoEj.series) || 3, reps: nuevoEj.reps || "10", descanso: parseInt(nuevoEj.descanso) || 60, musculo: nuevoEj.musculo || "General", orden: p.length }]);
    setNuevoEj({ nombre: "", series: "3", reps: "10", descanso: "60", musculo: "" });
  };

  return (
    <MotionDiv animate={{ opacity: 1, y: 0 }} className="bg-white-custom border-[length:var(--border-width)] border-primary/10 rounded-[var(--radius-card)] p-6 shadow-xl shadow-primary/5" initial={{ opacity: 0, y: 20 }}>
      <div className="flex items-center gap-3 mb-6"><Plus className="text-primary" size={18} /><h3 className="text-[12px] font-black uppercase tracking-widest text-primary/60">Nueva Rutina</h3></div>
      <div className="space-y-3 mb-6">
        <input className="w-full bg-primary/5 border-[length:var(--border-width)] border-transparent focus:border-primary/15 focus:bg-white-custom rounded-[var(--radius-btn)] py-3 px-5 text-sm font-bold text-primary outline-none placeholder:text-primary/25 transition-all" placeholder="Nombre de la rutina..." value={nombre} onChange={e => setNombre(e.target.value)} />
        <input className="w-full bg-primary/5 border-[length:var(--border-width)] border-transparent focus:border-primary/15 focus:bg-white-custom rounded-[var(--radius-btn)] py-3 px-5 text-sm font-bold text-primary outline-none placeholder:text-primary/25 transition-all" placeholder="Descripción..." value={descripcion} onChange={e => setDescripcion(e.target.value)} />
        <div className="flex gap-2 flex-wrap">
          {TAGS.filter(t => t !== "Todas").map(t => <Badge key={t} active={tag === t} onClick={() => setTag(t)}>{t}</Badge>)}
        </div>
      </div>
      {ejercicios.length > 0 && (
        <div className="space-y-2 mb-4">
          {ejercicios.map((ej, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-primary/4 rounded-[var(--radius-btn)]">
              <span className="text-[8px] font-black text-primary/30 w-4">{i + 1}</span>
              <span className="text-[11px] font-black text-primary flex-1 truncate">{ej.nombre}</span>
              <span className="text-[9px] text-primary/40 font-bold">{ej.series}×{ej.reps}</span>
              <BtnIcon className="text-accent hover:text-primary border-none w-6 h-6" size="sm" variant="ghost" onClick={() => setEjercicios(p => p.filter((_, j) => j !== i))}><X size={14} /></BtnIcon>
            </div>
          ))}
        </div>
      )}
      <div className="bg-primary/4 rounded-[var(--radius-btn)] p-4 mb-6 border-[length:var(--border-width)] border-primary/8">
        <p className="text-[9px] font-black uppercase tracking-widest text-primary/30 mb-3">Añadir ejercicio</p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input className={`col-span-2 ${inputCls}`} placeholder="Nombre..." value={nuevoEj.nombre} onChange={e => setNuevoEj(p => ({ ...p, nombre: e.target.value }))} onKeyDown={e => e.key === "Enter" && addEjercicio()} />
          <input className={inputCls} placeholder="Músculo..." value={nuevoEj.musculo} onChange={e => setNuevoEj(p => ({ ...p, musculo: e.target.value }))} />
          <input className={inputCls} placeholder="Series" type="number" value={nuevoEj.series} onChange={e => setNuevoEj(p => ({ ...p, series: e.target.value }))} />
          <input className={inputCls} placeholder="Reps (ej: 12 o 30s)" value={nuevoEj.reps} onChange={e => setNuevoEj(p => ({ ...p, reps: e.target.value }))} />
          <input className={inputCls} placeholder="Descanso (seg)" type="number" value={nuevoEj.descanso} onChange={e => setNuevoEj(p => ({ ...p, descanso: e.target.value }))} />
        </div>
        <Btn fullWidth disabled={!nuevoEj.nombre.trim()} size="sm" variant="ghost" onClick={addEjercicio}>+ Añadir ejercicio</Btn>
      </div>
      <div className="flex gap-3">
        <Btn className="flex-1" disabled={guardando} variant="outline" onClick={onCancelar}>Cancelar</Btn>
        <Btn className="flex-1" disabled={!nombre.trim() || ejercicios.length === 0 || guardando} loading={guardando} onClick={() => onGuardar({ nombre, descripcion, tag }, ejercicios)}>Guardar rutina</Btn>
      </div>
    </MotionDiv>
  );
};

export const PaginaEjercicios = () => {
  const [rutinas, setRutinas]   = useState<Rutina[]>([]);
  const [cargando, setCargando] = useState(true);

  const fetchRutinas = useCallback(async () => {
    setCargando(true);
    try {
      const { supabase } = await import("@/lib/api/client/supabase");
      const { data, error } = await supabase
        .from("rutinas")
        .select("*, ejercicios(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRutinas(
        (data ?? []).map((r: any) => ({
          ...r,
          ejercicios: (r.ejercicios ?? []).sort(
            (a: any, b: any) => (a.orden ?? 0) - (b.orden ?? 0)
          ),
        }))
      );
    } catch (err) {
      console.error("[PaginaEjercicios] fetch:", err);
      setRutinas([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { fetchRutinas(); }, [fetchRutinas]);

  const refetch = fetchRutinas;
  const [rutinaActiva, setRutinaActiva] = useState<Rutina | null>(null);
  const [expandida, setExpandida]       = useState<string | null>(null);
  const [filtroTag, setFiltroTag]       = useState("Todas");
  const [creando, setCreando]           = useState(false);
  const [guardando, setGuardando]       = useState(false);

  const rutinasFiltradas = useMemo(() => filtroTag === "Todas" ? rutinas : rutinas.filter(r => r.tag === filtroTag), [rutinas, filtroTag]);

  const handleGuardar = async (datos: { nombre: string; descripcion: string; tag: string }, ejercicios: Omit<Ejercicio, "id">[]) => {
    if (!datos.nombre.trim() || ejercicios.length === 0) return;
    setGuardando(true);
    try {
      const rutinaCreada = await rutinasQueries.add(datos);
      await ejerciciosQueries.reemplazar(rutinaCreada.id, ejercicios.map((e, i) => ({ ...e, orden: i })));
      refetch();
      setCreando(false);
    } catch (err) { console.error(err); }
    finally { setGuardando(false); }
  };

  const handleEliminar = async (id: string) => {
    try { await rutinasQueries.delete(id); refetch(); }
    catch (err) { console.error(err); }
  };

  return (
    <>
      <AnimatePresence>{rutinaActiva && <EjecutarRutina rutina={rutinaActiva} onCerrar={() => setRutinaActiva(null)} />}</AnimatePresence>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* Columna izquierda — Plan semanal (fija en desktop) */}
          <div className="w-full lg:flex-1 lg:sticky lg:top-6">
            <PlanDiario />
          </div>

          {/* Columna derecha — Rutinas */}
          <div className="flex-1 min-w-0 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-1.5 bg-white-custom border-[length:var(--border-width)] border-primary/10 rounded-[var(--radius-btn)] p-1.5 flex-wrap shadow-sm">
                {TAGS.map(t => <Badge key={t} active={filtroTag === t} onClick={() => setFiltroTag(t)}>{t}</Badge>)}
              </div>
              <Btn className="ml-auto shrink-0" icon={<Plus size={14} />} onClick={() => setCreando(true)}>Nueva rutina</Btn>
            </div>
            <AnimatePresence>{creando && <FormNuevaRutina guardando={guardando} onCancelar={() => setCreando(false)} onGuardar={handleGuardar} />}</AnimatePresence>
            {cargando ? <Loading fullScreen={false} text="Cargando rutinas..." /> : (
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {rutinasFiltradas.map(rutina => (
                    <MotionDiv key={rutina.id} layout animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} initial={{ opacity: 0, y: 12 }}>
                      <CardRutina expandida={expandida === rutina.id} rutina={rutina} onEliminar={() => handleEliminar(rutina.id)} onIniciar={() => setRutinaActiva(rutina)} onToggle={() => setExpandida(expandida === rutina.id ? null : rutina.id)} />
                    </MotionDiv>
                  ))}
                </AnimatePresence>
                {rutinasFiltradas.length === 0 && <EmptyState label={filtroTag === "Todas" ? "Aún no tienes rutinas" : `No hay rutinas de ${filtroTag}`} />}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
};