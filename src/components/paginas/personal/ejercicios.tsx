"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { rutinasQueries, ejerciciosQueries } from "@/lib/api/queries/personal/ejercicios";
import {
  Dumbbell, Play, Check, X, Plus, ChevronDown,
  Flame, Star, List, Loader2, Clock, AlertCircle,
  ChevronRight, Info, History
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

// --- CONSTANTES Y HELPERS ---

const TAGS = ["Todas", "Fuerza", "Cardio", "Flexibilidad", "Movilidad"];
const TAG_COLORES: Record<string, string> = {
  "Fuerza":       "bg-primary/10 text-primary border-primary/20",
  "Cardio":       "bg-accent/20 text-accent border-accent/30",
  "Flexibilidad": "bg-primary/15 text-primary border-primary/25",
  "Movilidad":    "bg-accent/10 text-primary border-accent/20",
};

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
    console.warn("Audio no soportado");
  }
};

const parseTiempo = (reps: string) => {
  const match = reps.match(/(\d+)/);
  return match ? parseInt(match[0]) : null;
};

// --- COMPONENTE: EJECUTAR RUTINA (MODO ENTRENAMIENTO) ---

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
        // Pitido de aviso a mitad de tiempo para ejercicios de Franilover por cada lado
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
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-primary p-6"
      >
        <div className="relative">
          <motion.div 
            animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }} 
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Star size={80} className="text-white mb-6" fill="white" />
          </motion.div>
        </div>
        <h2 className="text-5xl font-black text-white italic text-center mb-4 tracking-tighter">¡BRUTAL!</h2>
        <p className="text-white/60 font-bold uppercase tracking-widest mb-12">Rutina completada con éxito</p>
        <button 
          onClick={onCerrar} 
          className="bg-white text-primary font-black uppercase tracking-widest px-12 py-5 rounded-[24px] shadow-2xl active:scale-95 transition-transform"
        >
          Finalizar Sesión
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 z-[60] flex flex-col bg-primary overflow-hidden"
    >
      {/* Header Superior */}
      <div className="flex items-center justify-between px-6 py-8 shrink-0">
        <div className="min-w-0">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 italic block mb-1">Franilover Performance</span>
          <h2 className="text-xl font-black text-white italic truncate uppercase">{rutina.nombre}</h2>
        </div>
        <button 
          onClick={onCerrar} 
          className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center active:scale-90 transition-transform"
        >
          <X size={20} className="text-white" />
        </button>
      </div>

      {/* Barra de Progreso Visual */}
      <div className="px-6 mb-8 shrink-0">
        <div className="flex gap-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
          {rutina.ejercicios.map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "h-full transition-all duration-700 ease-out", 
                i < ejercicioIdx ? "bg-white w-full" : i === ejercicioIdx ? "bg-white/60 w-full" : "bg-white/5 w-full"
              )} 
            />
          ))}
        </div>
      </div>

      {/* Área Central: El Ejercicio */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-40">
        <AnimatePresence mode="wait">
          <motion.div 
            key={`${ejercicioIdx}-${fase}`} 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }} 
            className="w-full text-center"
          >
            <motion.span 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="text-[11px] font-black uppercase tracking-[0.5em] text-white/20 mb-4 block"
            >
              {fase === "descanso" ? "Siguiente Desafío" : ejercicio.musculo}
            </motion.span>
            
            <h1 className="text-5xl sm:text-7xl font-black text-white italic tracking-tighter leading-[0.9] mb-10 uppercase">
              {fase === "descanso" ? "Recupera" : ejercicio.nombre}
            </h1>
            
            {esUnilateral && fase === "ejercicio" && (
                <div className="flex items-center justify-center gap-2 mb-8 text-accent/80">
                    <History size={16} className="animate-spin-slow" />
                    <span className="text-[11px] font-black uppercase tracking-widest">Cambio de lado a mitad</span>
                </div>
            )}

            <div className="relative flex flex-col items-center">
               {(esTiempo || fase === "descanso") ? (
                   <div className="flex flex-col items-center">
                       <span className="text-[160px] font-black text-white tabular-nums tracking-tighter leading-none">
                         {segundos}
                       </span>
                       <span className="text-[12px] font-black text-white/20 uppercase tracking-[0.6em] -mt-4">
                         segundos restantes
                       </span>
                   </div>
               ) : (
                   <div className="flex gap-16 items-end">
                       <div className="text-center">
                           <span className="text-[10px] font-black text-white/30 uppercase block mb-2 tracking-widest">Sets</span>
                           <span className="text-8xl font-black text-white italic leading-none">{ejercicio.series}</span>
                       </div>
                       <div className="text-center">
                           <span className="text-[10px] font-black text-white/30 uppercase block mb-2 tracking-widest">Reps</span>
                           <span className="text-8xl font-black text-white italic leading-none">{ejercicio.reps}</span>
                       </div>
                   </div>
               )}
            </div>

            {ejercicio.notas && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="mt-12 inline-flex items-start gap-3 bg-white/5 p-4 rounded-2xl max-w-sm"
              >
                <Info size={16} className="text-white/20 shrink-0 mt-0.5" />
                <p className="text-sm font-bold text-white/40 italic text-left leading-relaxed">
                  {ejercicio.notas}
                </p>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Botón de Acción FIJO (Sticky Bottom) */}
      <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-primary via-primary/95 to-transparent shrink-0">
        <button 
          onClick={fase === "descanso" ? () => { clearInterval(intervalRef.current!); setFase("ejercicio"); } : completarSerie}
          className="w-full bg-white text-primary font-black uppercase tracking-[0.2em] py-7 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center justify-center gap-4 active:scale-[0.96] transition-all duration-200"
        >
          {fase === "descanso" ? (
            <><Clock size={24} strokeWidth={3} /> Saltar Descanso</>
          ) : (
            <><Check size={24} strokeWidth={3} /> {serieActual === ejercicio.series ? "Siguiente Ejercicio" : `Completar Serie ${serieActual}`}</>
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
    <motion.div 
      layout
      className={cn(
        "bg-white border border-primary/5 rounded-[40px] overflow-hidden transition-all duration-500", 
        expandida ? "shadow-2xl ring-1 ring-primary/10" : "shadow-sm hover:shadow-md"
      )}
    >
      <div className="p-8 cursor-pointer" onClick={onToggle}>
        <div className="flex justify-between items-start mb-6">
            <span className={cn("text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-2xl border", TAG_COLORES[rutina.tag] || "bg-primary/5 text-primary")}>
              {rutina.tag}
            </span>
            <motion.div animate={{ rotate: expandida ? 180 : 0 }} className="text-primary/10">
              <ChevronDown size={24} />
            </motion.div>
        </div>
        
        <h3 className="text-3xl font-black text-primary italic tracking-tighter mb-2 uppercase leading-none">{rutina.nombre}</h3>
        <p className="text-sm font-bold text-primary/30 uppercase tracking-tight mb-8 leading-relaxed line-clamp-2">{rutina.descripcion}</p>
        
        <div className="flex items-center gap-6 pt-6 border-t border-primary/5">
            <div className="flex items-center gap-2">
              <List size={16} className="text-primary/20"/>
              <span className="text-[11px] font-black text-primary/40 uppercase tracking-tighter">{rutina.ejercicios.length} ejercicios</span>
            </div>
            <div className="flex items-center gap-2">
              <Flame size={16} className="text-primary/20"/>
              <span className="text-[11px] font-black text-primary/40 uppercase tracking-tighter">{totalSeries} series totales</span>
            </div>
            
            <div className="ml-auto flex items-center gap-3">
                <button 
                  onClick={(e) => { e.stopPropagation(); onEliminar(); }} 
                  className="w-12 h-12 flex items-center justify-center text-accent/30 hover:text-accent hover:bg-accent/5 rounded-2xl transition-all"
                >
                  <X size={20}/>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onIniciar(); }} 
                  className="bg-primary text-white px-8 py-4 rounded-[20px] font-black text-[11px] uppercase tracking-[0.15em] flex items-center gap-3 shadow-xl shadow-primary/20 active:scale-95 transition-transform"
                >
                  <Play size={14} fill="white"/> Iniciar
                </button>
            </div>
        </div>
      </div>

      <AnimatePresence>
        {expandida && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: "auto", opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }} 
            className="bg-primary/[0.02] border-t border-primary/5"
          >
            <div className="p-8 space-y-3">
              {rutina.ejercicios.map((ej: any, i: number) => (
                <div key={ej.id} className="group flex items-center gap-5 p-5 bg-white rounded-3xl border border-primary/5 hover:border-primary/20 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-[11px] font-black text-primary/20 group-hover:bg-primary group-hover:text-white transition-colors">
                    {i+1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-primary uppercase tracking-tight">{ej.nombre}</p>
                    <p className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">{ej.musculo}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-black text-primary block uppercase">{ej.series} x {ej.reps}</span>
                    <span className="text-[9px] font-bold text-primary/20 block uppercase">{ej.descanso}s descanso</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// --- COMPONENTE: FORMULARIO NUEVA RUTINA ---

const FormNuevaRutina = ({ onGuardar, onCancelar, guardando }: any) => {
    const [nombre, setNombre] = useState("");
    const [descripcion, setDescripcion] = useState("");
    const [tag, setTag] = useState("Fuerza");
    const [ejercicios, setEjercicios] = useState<any[]>([]);
    
    // Estado para el ejercicio que se está editando/añadiendo
    const [nuevoEj, setNuevoEj] = useState({ 
      nombre: "", 
      series: "3", 
      reps: "10", 
      descanso: "60", 
      musculo: "General",
      notas: "" 
    });

    const handleAddEjercicio = () => {
        if(!nuevoEj.nombre) return;
        setEjercicios([...ejercicios, { 
          ...nuevoEj, 
          id: crypto.randomUUID(),
          series: parseInt(nuevoEj.series), 
          descanso: parseInt(nuevoEj.descanso) 
        }]);
        setNuevoEj({ nombre: "", series: "3", reps: "10", descanso: "60", musculo: "General", notas: "" });
    };

    return (
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white border-2 border-primary/5 rounded-[48px] p-10 shadow-2xl mb-12"
        >
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white">
                <Plus size={24} />
              </div>
              <h3 className="text-3xl font-black text-primary italic tracking-tighter uppercase">Crear Rutina</h3>
            </div>

            <div className="grid gap-6 mb-12">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary/30 ml-4">Información Básica</label>
                  <input 
                    value={nombre} 
                    onChange={e => setNombre(e.target.value)} 
                    placeholder="NOMBRE DE LA RUTINA" 
                    className="w-full p-6 bg-primary/5 rounded-[24px] outline-none font-black text-primary placeholder:text-primary/10 focus:ring-2 ring-primary/20 transition-all uppercase" 
                  />
                  <input 
                    value={descripcion} 
                    onChange={e => setDescripcion(e.target.value)} 
                    placeholder="¿Cuál es el objetivo de hoy?" 
                    className="w-full p-6 bg-primary/5 rounded-[24px] outline-none font-bold text-primary placeholder:text-primary/10" 
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary/30 ml-4">Categoría</label>
                  <div className="flex flex-wrap gap-2">
                      {TAGS.filter(t => t !== "Todas").map(t => (
                          <button 
                            key={t} 
                            onClick={() => setTag(t)} 
                            className={cn(
                              "px-6 py-3 rounded-2xl text-[11px] font-black uppercase transition-all border-2", 
                              tag === t ? "bg-primary text-white border-primary" : "bg-transparent text-primary/30 border-primary/5 hover:border-primary/10"
                            )}
                          >
                            {t}
                          </button>
                      ))}
                  </div>
                </div>
            </div>

            {/* Constructor de Ejercicios */}
            <div className="bg-primary/5 p-8 rounded-[40px] mb-10 border border-primary/5">
                <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] mb-6 text-center">Añadir Ejercicio</h4>
                <div className="space-y-4">
                  <input 
                    value={nuevoEj.nombre} 
                    onChange={e => setNuevoEj({...nuevoEj, nombre: e.target.value})} 
                    placeholder="Nombre del ejercicio..." 
                    className="w-full p-5 bg-white rounded-2xl outline-none text-sm font-black text-primary placeholder:text-primary/10" 
                  />
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-primary/30 uppercase ml-2">Series</label>
                        <input type="number" value={nuevoEj.series} onChange={e => setNuevoEj({...nuevoEj, series: e.target.value})} className="w-full p-4 bg-white rounded-2xl text-sm font-black text-primary" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-primary/30 uppercase ml-2">Reps / Tiempo</label>
                        <input value={nuevoEj.reps} onChange={e => setNuevoEj({...nuevoEj, reps: e.target.value})} placeholder="12 o 60s" className="w-full p-4 bg-white rounded-2xl text-sm font-black text-primary" />
                      </div>
                  </div>
                  <input 
                    value={nuevoEj.notas} 
                    onChange={e => setNuevoEj({...nuevoEj, notas: e.target.value})} 
                    placeholder="Notas o técnica (opcional)..." 
                    className="w-full p-5 bg-white rounded-2xl outline-none text-xs font-bold text-primary/50" 
                  />
                  <button 
                    onClick={handleAddEjercicio} 
                    className="w-full py-5 bg-primary text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-primary/10 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Insertar Ejercicio
                  </button>
                </div>
            </div>

            {/* Lista Temporal de Ejercicios */}
            <div className="space-y-3 mb-12">
                {ejercicios.map((e, i) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }} 
                      animate={{ opacity: 1, x: 0 }}
                      key={e.id} 
                      className="flex justify-between items-center p-5 bg-primary/5 rounded-3xl border border-primary/5"
                    >
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] font-black text-primary/20">{i + 1}</span>
                          <span className="text-xs font-black text-primary uppercase">{e.nombre}</span>
                        </div>
                        <div className="flex items-center gap-6">
                          <span className="text-[10px] font-black text-primary/40 uppercase">{e.series} x {e.reps}</span>
                          <button onClick={() => setEjercicios(ejercicios.filter(item => item.id !== e.id))} className="text-accent/40 hover:text-accent">
                            <X size={16}/>
                          </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="flex gap-4">
                <button onClick={onCancelar} className="flex-1 py-6 font-black text-[11px] uppercase text-primary/30 tracking-widest hover:text-primary transition-colors">Cancelar</button>
                <button 
                    onClick={() => onGuardar({ nombre, descripcion, tag }, ejercicios)} 
                    disabled={guardando || !nombre || ejercicios.length === 0}
                    className="flex-[2] py-6 bg-primary text-white rounded-[24px] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                    {guardando ? <Loader2 size={18} className="animate-spin"/> : <><Check size={18}/> Finalizar Rutina</>}
                </button>
            </div>
        </motion.div>
    );
};

// --- COMPONENTE PRINCIPAL: PÁGINA DE EJERCICIOS ---

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
      console.error("Error crítico al sincronizar:", err); 
    } finally { 
      setCargando(false); 
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const handleEliminar = async (id: string) => {
    if (!confirm("¿Deseas eliminar permanentemente esta rutina de Franilover?")) return;
    try {
      // Eliminación optimista
      setRutinas(prev => prev.filter(r => r.id !== id));
      await rutinasQueries.delete(id);
    } catch (err) { 
      console.error("Error al borrar:", err);
      cargarDatos(); // Revertir si falla
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
      console.error("Error al guardar rutina:", err); 
    } finally { 
      setGuardando(false); 
    }
  };

  const rutinasFiltradas = useMemo(() => {
    if (filtroTag === "Todas") return rutinas;
    return rutinas.filter(r => r.tag === filtroTag);
  }, [rutinas, filtroTag]);

  if (cargando) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="animate-spin text-primary mb-4 mx-auto" size={40}/>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-primary/20">Cargando Dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-12 pb-40 min-h-screen">
      <AnimatePresence>
        {rutinaActiva && (
          <EjecutarRutina 
            rutina={rutinaActiva} 
            onCerrar={() => setRutinaActiva(null)} 
          />
        )}
      </AnimatePresence>

      {/* Header de la App */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-8">
        <div>
            <span className="text-[11px] font-black text-primary/20 uppercase tracking-[0.5em] block mb-2">Entrenamiento Personalizado</span>
            <h1 className="text-6xl font-black text-primary italic tracking-tighter uppercase leading-none">Mis Rutinas</h1>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="flex bg-primary/5 p-1.5 rounded-[22px] overflow-x-auto no-scrollbar">
                {TAGS.map(t => (
                    <button 
                      key={t} 
                      onClick={() => setFiltroTag(t)}
                      className={cn(
                        "px-6 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                        filtroTag === t ? "bg-white text-primary shadow-sm" : "text-primary/30 hover:text-primary/60"
                      )}
                    >
                      {t}
                    </button>
                ))}
            </div>
            <button 
              onClick={() => setCreando(true)} 
              className="bg-primary text-white w-16 h-16 rounded-[24px] shadow-2xl shadow-primary/30 flex items-center justify-center active:scale-90 transition-transform shrink-0"
            >
              <Plus size={32} />
            </button>
        </div>
      </div>

      <AnimatePresence>
        {creando && (
          <FormNuevaRutina 
            onGuardar={handleGuardar} 
            onCancelar={() => setCreando(false)} 
            guardando={guardando} 
          />
        )}
      </AnimatePresence>

      {/* Grid de Rutinas */}
      <div className="grid gap-8">
        {rutinasFiltradas.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {rutinasFiltradas.map(rutina => (
              <motion.div
                key={rutina.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
              >
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
        ) : (
            <div className="text-center py-32 border-4 border-dashed border-primary/5 rounded-[60px]">
                <Dumbbell size={60} className="text-primary/5 mx-auto mb-6" />
                <h3 className="text-xl font-black text-primary/20 uppercase tracking-widest italic">No se encontraron rutinas</h3>
                <button onClick={() => setCreando(true)} className="mt-6 text-primary font-black text-[10px] uppercase tracking-widest underline decoration-2 underline-offset-4">Crear mi primera rutina ahora</button>
            </div>
        )}
      </div>

      {/* Footer / Stats Quick View */}
      <div className="pt-20 flex flex-col items-center gap-6">
        <div className="w-20 h-1.5 bg-primary/10 rounded-full" />
        <p className="text-[10px] font-black text-primary/15 uppercase tracking-[0.8em]">Franilover Collective © 2026</p>
      </div>
    </div>
  );
};