"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { rutinasQueries, ejerciciosQueries } from "@/lib/api/queries/personal/ejercicios";
import {
  Dumbbell, Play, Check, X, Plus, ChevronDown,
  Flame, Star, List, Loader2, Clock, AlertCircle,
  ChevronRight, Info, History, Calendar, Target,
  LayoutDashboard, TrendingUp, Award
} from "lucide-react";

// --- INTERFACES ---

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

// --- CONSTANTES ---

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
    icon: <Flame size={16} />,
    objetivo: "Tonificación y Estética",
    color: "text-orange-500"
  },
  {
    tipo: "Movilidad",
    subtitulo: "Postural",
    icon: <Target size={16} />,
    objetivo: "Apertura y Cintura",
    color: "text-blue-500"
  }
];

// --- HELPERS ---

const beep = (freq = 880, dur = 0.15) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur);
  } catch (e) {
    console.warn("Audio Context no disponible");
  }
};

const parseTiempo = (reps: string) => {
  const match = reps.match(/(\d+)/);
  return match ? parseInt(match[0]) : null;
};

// --- COMPONENTE: EJECUTAR RUTINA (EL MODO ENTRENAMIENTO) ---

const EjecutarRutina = ({ rutina, onCerrar }: { rutina: Rutina; onCerrar: () => void }) => {
  const [ejercicioIdx, setEjercicioIdx] = useState(0);
  const [serieActual, setSerieActual] = useState(1);
  const [fase, setFase] = useState<"ejercicio" | "descanso" | "fin">("ejercicio");
  const [segundos, setSegundos] = useState(0);
  const [corriendo, setCorriendo] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const ejercicio = rutina.ejercicios[ejercicioIdx];
  const repsLower = ejercicio?.reps.toLowerCase() || "";
  const esTiempo = repsLower.includes("s") || repsLower.includes("seg");
  const esUnilateral = repsLower.includes("lado") || repsLower.includes("+");

  const completarSerie = () => {
    beep(880, 0.1);
    const esUltimaSerie = serieActual === ejercicio.series;
    const esUltimoEjercicio = ejercicioIdx === rutina.ejercicios.length - 1;

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

  useEffect(() => {
    if (fase === "fin") return;
    if (fase === "descanso") {
      setSegundos(ejercicio.descanso);
      setCorriendo(true);
    } else if (fase === "ejercicio" && esTiempo) {
      setSegundos(parseTiempo(ejercicio.reps) || 0);
      setCorriendo(true);
    } else {
      setCorriendo(false);
    }
  }, [fase, ejercicioIdx, serieActual]);

  useEffect(() => {
    if (!corriendo) return;
    intervalRef.current = setInterval(() => {
      setSegundos(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          if (fase === "descanso") {
            beep(1046, 0.3);
            setFase("ejercicio");
          } else {
            completarSerie();
          }
          return 0;
        }
        // Pitido de aviso a mitad de tiempo para Franilover (cambio de lado)
        const tiempoTotal = parseTiempo(ejercicio.reps) || 0;
        if (fase === "ejercicio" && esUnilateral && prev === Math.floor(tiempoTotal / 2) + 1) {
          beep(440, 0.5);
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [corriendo, fase]);

  if (fase === "fin") {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-primary p-6">
        <Star size={80} className="text-white mb-6 animate-bounce" fill="white" />
        <h2 className="text-6xl font-black text-white italic text-center mb-4 tracking-tighter uppercase leading-none">¡Brutal!</h2>
        <p className="text-white/40 font-black uppercase tracking-[0.3em] mb-12 italic">Misión cumplida</p>
        <button onClick={onCerrar} className="bg-white text-primary font-black uppercase tracking-widest px-14 py-6 rounded-[32px] shadow-2xl active:scale-95 transition-transform">Finalizar Sesión</button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex flex-col bg-primary overflow-hidden">
      {/* Header Entrenamiento */}
      <div className="flex items-center justify-between px-8 py-10 shrink-0">
        <div className="min-w-0">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 italic block mb-2 underline decoration-accent/30 underline-offset-4">Franilover Training</span>
          <h2 className="text-2xl font-black text-white italic truncate uppercase tracking-tighter">{rutina.nombre}</h2>
        </div>
        <button onClick={onCerrar} className="w-14 h-14 rounded-[22px] bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-transform"><X size={24} className="text-white" /></button>
      </div>

      {/* Barra de Progreso Superior */}
      <div className="px-8 mb-10 shrink-0">
        <div className="flex gap-2.5 h-2 bg-white/5 rounded-full overflow-hidden">
          {rutina.ejercicios.map((_, i) => (
            <div key={i} className={cn("h-full transition-all duration-700 ease-in-out", i < ejercicioIdx ? "bg-white w-full" : i === ejercicioIdx ? "bg-white/60 w-full" : "bg-white/5 w-full")} />
          ))}
        </div>
      </div>

      {/* Contenido Central: Ejercicio y Cronómetro */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-44 text-center">
        <AnimatePresence mode="wait">
          <motion.div key={`${ejercicioIdx}-${fase}`} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="w-full">
            <span className="text-[12px] font-black uppercase tracking-[0.6em] text-white/20 mb-6 block">{fase === "descanso" ? "Próximo Movimiento" : ejercicio.musculo}</span>
            <h1 className="text-5xl sm:text-7xl font-black text-white italic tracking-tighter leading-[0.85] mb-12 uppercase">{fase === "descanso" ? "Descansa" : ejercicio.nombre}</h1>
            
            {esUnilateral && fase === "ejercicio" && (
                <div className="flex items-center justify-center gap-3 mb-10 text-accent/60 bg-accent/5 py-2 px-6 rounded-full border border-accent/10 w-fit mx-auto">
                    <History size={16} className="animate-spin-slow" />
                    <span className="text-[11px] font-black uppercase tracking-widest">Cambio de lado a mitad de tiempo</span>
                </div>
            )}

            <div className="relative inline-flex flex-col items-center">
               {(esTiempo || fase === "descanso") ? (
                   <div className="flex flex-col items-center">
                       <span className="text-[180px] font-black text-white tabular-nums tracking-tighter leading-none">{segundos}</span>
                       <span className="text-[14px] font-black text-white/20 uppercase tracking-[0.8em] -mt-6">segundos</span>
                   </div>
               ) : (
                   <div className="flex gap-20 items-end justify-center">
                       <div className="text-center">
                           <span className="text-[11px] font-black text-white/30 uppercase block mb-3 tracking-widest">Sets</span>
                           <span className="text-9xl font-black text-white italic leading-none">{ejercicio.series}</span>
                       </div>
                       <div className="text-center">
                           <span className="text-[11px] font-black text-white/30 uppercase block mb-3 tracking-widest">Reps</span>
                           <span className="text-9xl font-black text-white italic leading-none">{ejercicio.reps}</span>
                       </div>
                   </div>
               )}
            </div>

            {ejercicio.notas && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-16 bg-white/5 border border-white/5 p-6 rounded-[32px] max-w-lg mx-auto">
                <p className="text-sm font-bold text-white/40 italic leading-relaxed">"{ejercicio.notas}"</p>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Botón de Acción FIJO (STAY AT BOTTOM) */}
      <div className="absolute bottom-0 left-0 right-0 p-10 bg-gradient-to-t from-primary via-primary/95 to-transparent shrink-0">
        <button 
          onClick={fase === "descanso" ? () => { clearInterval(intervalRef.current!); setFase("ejercicio"); } : completarSerie}
          className="w-full bg-white text-primary font-black uppercase tracking-[0.25em] py-8 rounded-[40px] shadow-[0_25px_60px_rgba(0,0,0,0.4)] flex items-center justify-center gap-5 active:scale-[0.97] transition-all duration-300"
        >
          {fase === "descanso" ? (
            <><Clock size={28} strokeWidth={3} /> Saltar Descanso</>
          ) : (
            <><Check size={28} strokeWidth={3} /> {serieActual === ejercicio.series ? "Siguiente Ejercicio" : `Serie ${serieActual} Completa`}</>
          )}
        </button>
      </div>
    </motion.div>
  );
};

// --- COMPONENTE: TARJETA DE RUTINA ---

const CardRutina = ({ rutina, onIniciar, onEliminar, expandida, onToggle }: any) => {
  const totalSeries = rutina.ejercicios.reduce((a: any, e: any) => a + e.series, 0);
  
  return (
    <motion.div layout className={cn("bg-white border border-primary/5 rounded-[44px] overflow-hidden transition-all duration-500", expandida ? "shadow-2xl ring-1 ring-primary/10" : "shadow-sm hover:shadow-md")}>
      <div className="p-10 cursor-pointer" onClick={onToggle}>
        <div className="flex justify-between items-start mb-8">
            <span className={cn("text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-2xl border-2", TAG_COLORES[rutina.tag] || "bg-primary/5 text-primary border-primary/10")}>{rutina.tag}</span>
            <motion.div animate={{ rotate: expandida ? 180 : 0 }} className="text-primary/10"><ChevronDown size={28} /></motion.div>
        </div>
        
        <h3 className="text-4xl font-black text-primary italic tracking-tighter mb-3 uppercase leading-none">{rutina.nombre}</h3>
        <p className="text-base font-bold text-primary/30 uppercase tracking-tight mb-10 leading-relaxed line-clamp-2 italic">"{rutina.descripcion}"</p>
        
        <div className="flex items-center gap-8 pt-8 border-t border-primary/5">
            <div className="flex items-center gap-3"><List size={18} className="text-primary/20"/><span className="text-[12px] font-black text-primary/40 uppercase">{rutina.ejercicios.length} ejercicios</span></div>
            <div className="flex items-center gap-3"><Flame size={18} className="text-primary/20"/><span className="text-[12px] font-black text-primary/40 uppercase">{totalSeries} series</span></div>
            <div className="ml-auto flex items-center gap-4">
                <button onClick={(e) => { e.stopPropagation(); onEliminar(); }} className="w-14 h-14 flex items-center justify-center text-accent/30 hover:text-accent hover:bg-accent/5 rounded-[22px] transition-all"><X size={24}/></button>
                <button onClick={(e) => { e.stopPropagation(); onIniciar(); }} className="bg-primary text-white px-10 py-5 rounded-[26px] font-black text-[12px] uppercase tracking-[0.2em] flex items-center gap-4 shadow-2xl shadow-primary/30 active:scale-95 transition-transform"><Play size={16} fill="white"/> Iniciar</button>
            </div>
        </div>
      </div>

      <AnimatePresence>
        {expandida && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-primary/[0.02] border-t border-primary/5 p-10 space-y-4">
            {rutina.ejercicios.map((ej: any, i: number) => (
              <div key={ej.id} className="group flex items-center gap-6 p-6 bg-white rounded-[32px] border border-primary/5 hover:border-primary/20 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-[12px] font-black text-primary/20 group-hover:bg-primary group-hover:text-white transition-all">{i+1}</div>
                <div className="flex-1">
                  <p className="text-base font-black text-primary uppercase tracking-tight">{ej.nombre}</p>
                  <p className="text-[11px] font-bold text-primary/30 uppercase tracking-widest">{ej.musculo}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-primary block uppercase">{ej.series} x {ej.reps}</span>
                  <span className="text-[10px] font-bold text-primary/20 block uppercase italic">{ej.descanso}s descanso</span>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// --- COMPONENTE: FORMULARIO NUEVA RUTINA (ESTRUCTURA ORIGINAL) ---

const FormNuevaRutina = ({ onGuardar, onCancelar, guardando }: any) => {
    const [nombre, setNombre] = useState("");
    const [descripcion, setDescripcion] = useState("");
    const [tag, setTag] = useState("Fuerza");
    const [ejercicios, setEjercicios] = useState<any[]>([]);
    const [nuevoEj, setNuevoEj] = useState({ nombre: "", series: "3", reps: "10", descanso: "60", musculo: "General", notas: "" });

    const handleAdd = () => {
        if(!nuevoEj.nombre) return;
        setEjercicios([...ejercicios, { ...nuevoEj, id: crypto.randomUUID(), series: parseInt(nuevoEj.series), descanso: parseInt(nuevoEj.descanso) }]);
        setNuevoEj({ nombre: "", series: "3", reps: "10", descanso: "60", musculo: "General", notas: "" });
    };

    return (
        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="bg-white border-2 border-primary/5 rounded-[60px] p-14 shadow-2xl mb-16 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 text-primary/5"><Dumbbell size={120} /></div>
            <h3 className="text-4xl font-black text-primary italic mb-12 uppercase tracking-tighter underline decoration-accent/30 decoration-8 underline-offset-[12px]">Crear Nueva Rutina</h3>
            
            <div className="grid gap-8 mb-14">
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-widest text-primary/20 ml-6">Título de la Rutina</label>
                  <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="EJ: PIERNAS DE ACERO" className="w-full p-7 bg-primary/5 rounded-[32px] outline-none font-black text-primary placeholder:text-primary/10 focus:ring-4 ring-primary/10 transition-all uppercase" />
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-widest text-primary/20 ml-6">Descripción / Mantra</label>
                  <input value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="¿Qué vamos a lograr hoy?" className="w-full p-7 bg-primary/5 rounded-[32px] outline-none font-bold text-primary placeholder:text-primary/10" />
                </div>
                <div className="flex flex-wrap gap-3">
                    {TAGS.filter(t => t !== "Todas").map(t => (
                        <button key={t} onClick={() => setTag(t)} className={cn("px-8 py-4 rounded-[22px] text-[12px] font-black uppercase border-2 transition-all", tag === t ? "bg-primary text-white border-primary shadow-xl" : "text-primary/30 border-primary/5 hover:border-primary/20")}>{t}</button>
                    ))}
                </div>
            </div>

            <div className="bg-primary/5 p-10 rounded-[50px] mb-14 border border-primary/5">
                <h4 className="text-[12px] font-black text-primary uppercase tracking-[0.4em] mb-8 text-center italic">Añadir Ejercicio</h4>
                <div className="space-y-5">
                  <input value={nuevoEj.nombre} onChange={e => setNuevoEj({...nuevoEj, nombre: e.target.value})} placeholder="Nombre del movimiento..." className="w-full p-6 bg-white rounded-[24px] outline-none text-base font-black text-primary" />
                  <div className="grid grid-cols-2 gap-5">
                      <input type="number" value={nuevoEj.series} onChange={e => setNuevoEj({...nuevoEj, series: e.target.value})} placeholder="Sets" className="p-5 bg-white rounded-[24px] text-base font-black" />
                      <input value={nuevoEj.reps} onChange={e => setNuevoEj({...nuevoEj, reps: e.target.value})} placeholder="Reps (ej: 60s)" className="p-5 bg-white rounded-[24px] text-base font-black" />
                  </div>
                  <input value={nuevoEj.notas} onChange={e => setNuevoEj({...nuevoEj, notas: e.target.value})} placeholder="Notas técnicas..." className="w-full p-5 bg-white rounded-[24px] text-sm font-bold text-primary/40 italic" />
                  <button onClick={handleAdd} className="w-full py-6 bg-primary text-white rounded-[24px] font-black text-[12px] uppercase tracking-widest shadow-2xl shadow-primary/20">+ Insertar en Lista</button>
                </div>
            </div>

            <div className="space-y-4 mb-16">
                {ejercicios.map((e, i) => (
                    <div key={e.id} className="flex justify-between items-center p-6 bg-primary/5 rounded-[32px] border border-primary/5 shadow-sm">
                        <div className="flex items-center gap-5">
                          <span className="text-[12px] font-black text-primary/20 italic">{i + 1}</span>
                          <span className="text-sm font-black text-primary uppercase">{e.nombre} ({e.series}x{e.reps})</span>
                        </div>
                        <button onClick={() => setEjercicios(ejercicios.filter(item => item.id !== e.id))} className="w-10 h-10 flex items-center justify-center text-accent/30 hover:text-accent transition-colors"><X size={20}/></button>
                    </div>
                ))}
            </div>

            <div className="flex gap-6">
                <button onClick={onCancelar} className="flex-1 py-7 font-black text-[12px] uppercase text-primary/20 hover:text-primary transition-all tracking-widest">Cancelar Registro</button>
                <button onClick={() => onGuardar({ nombre, descripcion, tag }, ejercicios)} disabled={guardando || !nombre || ejercicios.length === 0} className="flex-[2] py-7 bg-primary text-white rounded-[32px] font-black text-[12px] uppercase tracking-[0.25em] flex items-center justify-center gap-4 shadow-2xl shadow-primary/40 disabled:opacity-30">
                    {guardando ? <Loader2 size={24} className="animate-spin"/> : <><Check size={24}/> Guardar Rutina</>}
                </button>
            </div>
        </motion.div>
    );
};

// --- PÁGINA PRINCIPAL (FULL CODE) ---

export const PaginaEjercicios = () => {
  const [rutinas, setRutinas] = useState<Rutina[]>([]);
  const [cargando, setCargando] = useState(true);
  const [rutinaActiva, setRutinaActiva] = useState<Rutina | null>(null);
  const [expandida, setExpandida] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [filtroTag, setFiltroTag] = useState("Todas");

  const cargarDatos = async () => {
    try {
      const data = await rutinasQueries.getAll();
      setRutinas(data);
    } catch (err) { 
      console.error("Error al cargar datos:", err); 
    } finally { 
      setCargando(false); 
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const handleEliminar = async (id: string) => {
    if (!confirm("¿Eliminar rutina permanentemente?")) return;
    try {
      setRutinas(prev => prev.filter(r => r.id !== id));
      await rutinasQueries.delete(id);
    } catch (err) { 
      cargarDatos(); 
    }
  };

  const handleGuardar = async (datos: any, ejercicios: any[]) => {
    setGuardando(true);
    try {
      const nueva = await rutinasQueries.add(datos);
      await ejerciciosQueries.reemplazar(nueva.id, ejercicios.map((e, i) => ({ ...e, orden: i })));
      await cargarDatos();
      setCreando(false);
    } catch (err) { 
      console.error("Error al guardar:", err); 
    } finally { 
      setGuardando(false); 
    }
  };

  const rutinasFiltradas = useMemo(() => {
    if (filtroTag === "Todas") return rutinas;
    return rutinas.filter(r => r.tag === filtroTag);
  }, [rutinas, filtroTag]);

  if (cargando) return (
    <div className="flex h-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-6">
        <Loader2 className="animate-spin text-primary" size={60} strokeWidth={3} />
        <span className="text-[11px] font-black uppercase tracking-[0.8em] text-primary/20 italic">Franilover Sincronizando</span>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-10 space-y-16 pb-48">
      <AnimatePresence>
        {rutinaActiva && <EjecutarRutina rutina={rutinaActiva} onCerrar={() => setRutinaActiva(null)} />}
      </AnimatePresence>

      {/* App Header & Filtros */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12">
        <div>
            <span className="text-[13px] font-black text-primary/20 uppercase tracking-[0.7em] block mb-4 italic">Performance Collective</span>
            <h1 className="text-7xl font-black text-primary italic tracking-tighter uppercase leading-[0.8] mb-4 underline decoration-accent decoration-wavy decoration-2 underline-offset-8">Mis Rutinas</h1>
        </div>
        
        <div className="flex flex-wrap items-center gap-6">
            <div className="flex bg-primary/5 p-2 rounded-[30px] border border-primary/5">
                {TAGS.map(t => (
                    <button 
                      key={t} 
                      onClick={() => setFiltroTag(t)} 
                      className={cn(
                        "px-8 py-4 rounded-[22px] text-[11px] font-black uppercase tracking-widest transition-all", 
                        filtroTag === t ? "bg-white text-primary shadow-2xl scale-105" : "text-primary/30 hover:text-primary/60"
                      )}
                    >
                      {t}
                    </button>
                ))}
            </div>
            <button onClick={() => setCreando(true)} className="bg-primary text-white w-20 h-20 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all shrink-0"><Plus size={40} strokeWidth={3} /></button>
        </div>
      </div>

      {/* Plan Diario (Full Recovered) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {PLAN_DIARIO.map((plan, i) => (
          <div key={i} className="bg-primary/5 p-10 rounded-[56px] border border-primary/5 flex items-center justify-between group hover:bg-primary transition-all duration-500 overflow-hidden relative">
            <div className="absolute -right-4 -bottom-4 text-primary/5 group-hover:text-white/5 transition-colors"><TrendingUp size={140} /></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 text-primary group-hover:text-white/60 mb-3 transition-colors">
                {plan.icon}
                <span className="text-[11px] font-black uppercase tracking-[0.4em] italic">{plan.subtitulo}</span>
              </div>
              <h4 className="text-4xl font-black text-primary group-hover:text-white italic uppercase tracking-tighter transition-colors">{plan.tipo}</h4>
              <p className="text-[12px] font-bold text-primary/40 group-hover:text-white/40 uppercase mt-2 tracking-widest italic">{plan.objetivo}</p>
            </div>
            <div className="w-16 h-16 rounded-full border-8 border-primary/10 border-t-accent group-hover:border-white/10 group-hover:border-t-white animate-spin-slow transition-all relative z-10" />
          </div>
        ))}
      </div>

      <AnimatePresence>
        {creando && <FormNuevaRutina onGuardar={handleGuardar} onCancelar={() => setCreando(false)} guardando={guardando} />}
      </AnimatePresence>

      {/* Grid de Rutinas */}
      <div className="grid gap-12">
        {rutinasFiltradas.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {rutinasFiltradas.map(rutina => (
              <motion.div key={rutina.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                <CardRutina rutina={rutina} onIniciar={() => setRutinaActiva(rutina)} onEliminar={() => handleEliminar(rutina.id)} expandida={expandida === rutina.id} onToggle={() => setExpandida(expandida === rutina.id ? null : rutina.id)} />
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <div className="text-center py-40 border-8 border-dashed border-primary/5 rounded-[80px]">
              <Dumbbell size={80} className="text-primary/5 mx-auto mb-8" />
              <p className="text-2xl font-black text-primary/10 uppercase italic tracking-[0.2em]">No se encontraron rutinas</p>
          </div>
        )}
      </div>

      {/* Stats Quick Footer */}
      <div className="grid grid-cols-3 gap-6 pt-20">
          <div className="text-center p-8 bg-primary/3 rounded-[40px] border border-primary/5">
              <span className="text-[11px] font-black text-primary/20 uppercase block mb-2">Completadas</span>
              <span className="text-4xl font-black text-primary italic leading-none tracking-tighter">04</span>
          </div>
          <div className="text-center p-8 bg-primary/3 rounded-[40px] border border-primary/5">
              <span className="text-[11px] font-black text-primary/20 uppercase block mb-2">Días Streak</span>
              <span className="text-4xl font-black text-primary italic leading-none tracking-tighter text-accent">12</span>
          </div>
          <div className="text-center p-8 bg-primary/3 rounded-[40px] border border-primary/5">
              <span className="text-[11px] font-black text-primary/20 uppercase block mb-2">Puntos</span>
              <span className="text-4xl font-black text-primary italic leading-none tracking-tighter">1.2k</span>
          </div>
      </div>

      <div className="pt-24 flex flex-col items-center gap-8">
        <div className="w-32 h-2 bg-primary/5 rounded-full" />
        <div className="flex items-center gap-10">
          <Award size={20} className="text-primary/20" />
          <p className="text-[12px] font-black text-primary/20 uppercase tracking-[1em] italic">Franilover Elite Training</p>
          <Award size={20} className="text-primary/20" />
        </div>
      </div>
    </div>
  );
};