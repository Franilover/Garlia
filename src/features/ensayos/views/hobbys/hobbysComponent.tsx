"use client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Check, X, Loader2, Pencil as PencilIcon,
  Guitar, Palette, BookOpen, PenLine, Brain, Dumbbell, Gamepad2,
  Theater, Camera, Music, ChefHat, Leaf, Puzzle, Target, Pencil,
  Clapperboard, Mic, PersonStanding, Mountain, Music2,
  type LucideIcon,
} from "lucide-react";
import React, { useState, useMemo } from "react";

import { useHobbys, getTodayIdx, type Hobby, type Registro } from "@/features/ensayos/hooks/hobbys/useHobbys";
import { cn } from "@/lib/utils/index";


// ─── Constantes ───────────────────────────────────────────────────────────────

const DIAS = ["L", "M", "X", "J", "V", "S", "D"];
const DIAS_FULL = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const HOBBY_ICONS: { name: string; component: LucideIcon; label: string }[] = [
  { name: "Guitar",         component: Guitar,         label: "Guitarra"     },
  { name: "Palette",        component: Palette,        label: "Arte"         },
  { name: "BookOpen",       component: BookOpen,       label: "Lectura"      },
  { name: "PenLine",        component: PenLine,        label: "Escritura"    },
  { name: "Brain",          component: Brain,          label: "Meditación"   },
  { name: "Dumbbell",       component: Dumbbell,       label: "Ejercicio"    },
  { name: "Gamepad2",       component: Gamepad2,       label: "Videojuegos"  },
  { name: "Theater",        component: Theater,        label: "Teatro"       },
  { name: "Camera",         component: Camera,         label: "Fotografía"   },
  { name: "Music",          component: Music,          label: "Música"       },
  { name: "ChefHat",        component: ChefHat,        label: "Cocina"       },
  { name: "Leaf",           component: Leaf,           label: "Jardinería"   },
  { name: "Puzzle",         component: Puzzle,         label: "Puzzles"      },
  { name: "Target",         component: Target,         label: "Deporte"      },
  { name: "Pencil",         component: Pencil,         label: "Dibujo"       },
  { name: "Clapperboard",   component: Clapperboard,   label: "Cine"         },
  { name: "Mic",            component: Mic,            label: "Canto"        },
  { name: "PersonStanding", component: PersonStanding, label: "Yoga"         },
  { name: "Mountain",       component: Mountain,       label: "Senderismo"   },
  { name: "Music2",         component: Music2,         label: "Violín"       },
];

const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  HOBBY_ICONS.map(({ name, component }) => [name, component])
);

function HobbyIcon({ name, size = 16 }: { name: string; size?: number }) {
  const Icon = ICON_MAP[name] ?? Guitar;
  return <Icon size={size} />;
}

// ─── Estilos compartidos ──────────────────────────────────────────────────────

const inputCls =
  "w-full bg-primary/5 border-[length:var(--border-width)] border-transparent focus:border-primary/10 focus:bg-white-custom rounded-[var(--radius-btn)] py-2 px-3 text-sm font-bold text-primary outline-none placeholder:text-primary/20 transition-all";

const selectCls =
  "w-full bg-primary/5 border-[length:var(--border-width)] border-transparent focus:border-primary/10 rounded-[var(--radius-btn)] py-2 px-3 text-sm font-bold text-primary outline-none appearance-none cursor-pointer";

// ─── Selector de icono compartido ─────────────────────────────────────────────

const IconSelector = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div className="flex flex-wrap gap-1">
    {HOBBY_ICONS.map(({ name, component: Icon, label }) => (
      <button
        key={name}
        className={cn(
          "w-8 h-8 rounded-[var(--radius-btn)] flex items-center justify-center transition-all border-[length:var(--border-width)]",
          value === name
            ? "bg-primary text-btn-text border-primary"
            : "bg-primary/5 text-primary/70 border-transparent hover:bg-primary/10 hover:text-primary/70"
        )}
        title={label}
        type="button"
        onClick={() => onChange(name)}
      >
        <Icon size={14} />
      </button>
    ))}
  </div>
);

// ─── Form Nuevo Hobby ─────────────────────────────────────────────────────────

interface FormNuevoHobbyProps {
  onGuardar: (hobby: Omit<Hobby, "id">) => Promise<void>;
  onCancelar: () => void;
  guardando: boolean;
  orden: number;
}

const FormNuevoHobby = ({ onGuardar, onCancelar, guardando, orden }: FormNuevoHobbyProps) => {
  const [nombre, setNombre]   = useState("");
  const [icon, setIcon]       = useState("Guitar");
  const [freqDia, setFreqDia] = useState(1);
  const [freqSem, setFreqSem] = useState(3);
  const [nota, setNota]       = useState("");

  const handleGuardar = () => {
    if (!nombre.trim()) return;
    void onGuardar({ nombre: nombre.trim(), icon, color: 0, freq_dia: freqDia, freq_sem: freqSem, nota: nota.trim(), orden });
  };

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="bg-white-custom border-[length:var(--border-width)] border-primary/10 rounded-[var(--radius-card)] p-4 shadow-lg shadow-primary/5 mb-3 space-y-3"
      exit={{ opacity: 0, y: -6 }}
      initial={{ opacity: 0, y: -6 }}
    >
      <p className="text-3xs font-black uppercase tracking-widest text-primary/40">Nuevo hobby</p>

      <input
        autoFocus
        className={inputCls}
        placeholder="Nombre del hobby..."
        value={nombre}
        onChange={e => setNombre(e.target.value)}
        onKeyDown={e => e.key === "Enter" && handleGuardar()}
      />

      <div>
        <p className="text-3xs font-black uppercase tracking-widest text-primary/40 mb-1.5">Icono</p>
        <IconSelector value={icon} onChange={setIcon} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select className={selectCls} value={freqDia} onChange={e => setFreqDia(parseInt(e.target.value))}>
          {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}x al día</option>)}
        </select>
        <select className={selectCls} value={freqSem} onChange={e => setFreqSem(parseInt(e.target.value))}>
          {[1, 2, 3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{n}d / sem</option>)}
        </select>
      </div>

      <input className={inputCls} placeholder="Nota opcional..." value={nota} onChange={e => setNota(e.target.value)} />

      <div className="flex gap-2">
        <button className="flex-1 py-2 rounded-[var(--radius-btn)] border-[length:var(--border-width)] border-primary/10 text-xs font-black text-primary/70 hover:bg-primary/5 transition-all" onClick={onCancelar}>
          Cancelar
        </button>
        <button
          className="flex-1 py-2 rounded-[var(--radius-btn)] bg-primary text-btn-text text-xs font-black hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5"
          disabled={!nombre.trim() || guardando}
          onClick={handleGuardar}
        >
          {guardando ? <Loader2 className="animate-spin" size={12} /> : <Plus size={12} />}
          Guardar
        </button>
      </div>
    </motion.div>
  );
};

// ─── Form Editar Hobby ────────────────────────────────────────────────────────

interface FormEditarHobbyProps {
  hobby: Hobby;
  onGuardar: (datos: Partial<Omit<Hobby, "id">>) => Promise<void>;
  onCancelar: () => void;
  guardando: boolean;
}

const FormEditarHobby = ({ hobby, onGuardar, onCancelar, guardando }: FormEditarHobbyProps) => {
  const [nombre, setNombre]   = useState(hobby.nombre);
  const [icon, setIcon]       = useState(hobby.icon);
  const [freqDia, setFreqDia] = useState(hobby.freq_dia);
  const [freqSem, setFreqSem] = useState(hobby.freq_sem);
  const [nota, setNota]       = useState(hobby.nota ?? "");

  const handleGuardar = () => {
    if (!nombre.trim()) return;
    void onGuardar({ nombre: nombre.trim(), icon, freq_dia: freqDia, freq_sem: freqSem, nota: nota.trim() });
  };

  return (
    <div className="px-3 pb-3 border-t border-primary/5 pt-3 space-y-2.5">
      <p className="text-3xs font-black uppercase tracking-widest text-primary/40">Editar hobby</p>
      <input autoFocus className={inputCls} placeholder="Nombre..." value={nombre} onChange={e => setNombre(e.target.value)} onKeyDown={e => e.key === "Enter" && handleGuardar()} />
      <div>
        <p className="text-3xs font-black uppercase tracking-widest text-primary/40 mb-1.5">Icono</p>
        <IconSelector value={icon} onChange={setIcon} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select className={selectCls} value={freqDia} onChange={e => setFreqDia(parseInt(e.target.value))}>
          {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}x al día</option>)}
        </select>
        <select className={selectCls} value={freqSem} onChange={e => setFreqSem(parseInt(e.target.value))}>
          {[1, 2, 3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{n}d / sem</option>)}
        </select>
      </div>
      <input className={inputCls} placeholder="Nota opcional..." value={nota} onChange={e => setNota(e.target.value)} />
      <div className="flex gap-2">
        <button className="flex-1 py-1.5 rounded-[var(--radius-btn)] border-[length:var(--border-width)] border-primary/10 text-xs font-black text-primary/70 hover:bg-primary/5 transition-all" onClick={onCancelar}>Cancelar</button>
        <button className="flex-1 py-1.5 rounded-[var(--radius-btn)] bg-primary text-btn-text text-xs font-black hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5" disabled={!nombre.trim() || guardando} onClick={handleGuardar}>
          {guardando ? <Loader2 className="animate-spin" size={12} /> : <Check size={12} />}
          Guardar
        </button>
      </div>
    </div>
  );
};

// ─── Card de Hobby ─────────────────────────────────────────────────────────────

interface CardHobbyProps {
  hobby: Hobby;
  registro: Registro | undefined;
  onToggleDia: (hobbyId: string, diaIdx: number) => void;
  onEliminar: (id: string) => void;
  onEditar: (id: string, datos: Partial<Omit<Hobby, "id">>) => Promise<void>;
}

const CardHobby = ({ hobby, registro, onToggleDia, onEliminar, onEditar }: CardHobbyProps) => {
  const [editando, setEditando]   = useState(false);
  const [guardando, setGuardando] = useState(false);
  const dias = registro?.dias ?? Array(7).fill(false);
  const hechos = dias.filter(Boolean).length;
  const pct = Math.min(100, Math.round((hechos / hobby.freq_sem) * 100));
  const completado = hechos >= hobby.freq_sem;
  const today = getTodayIdx();

  const handleEditar = async (datos: Partial<Omit<Hobby, "id">>) => {
    setGuardando(true);
    try {
      await onEditar(hobby.id, datos);
      setEditando(false);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="bg-white-custom border-[length:var(--border-width)] border-primary/10 rounded-[var(--radius-card)] overflow-hidden group">
      {editando ? (
        <FormEditarHobby guardando={guardando} hobby={hobby} onCancelar={() => setEditando(false)} onGuardar={handleEditar} />
      ) : (
        <div className="p-3">
          {/* Fila principal */}
          <div className="flex items-center gap-2.5 mb-2.5">
            {/* Icono */}
            <div className={cn(
              "w-8 h-8 rounded-[var(--radius-btn)] flex items-center justify-center shrink-0 transition-colors",
              completado ? "bg-primary/20 text-primary/70" : "bg-primary/10 text-primary/70"
            )}>
              <HobbyIcon name={hobby.icon} size={15} />
            </div>

            {/* Nombre + meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-primary tracking-tight truncate leading-none">{hobby.nombre}</span>
                {completado && <Check className="text-primary/70 shrink-0" size={10} />}
              </div>
              <span className="text-2xs font-bold text-primary/40 leading-none mt-0.5 block">
                {hobby.freq_dia > 1 ? `${hobby.freq_dia}x · ` : ""}{hobby.freq_sem}d/sem{hobby.nota ? ` · ${hobby.nota}` : ""}
              </span>
            </div>

            {/* Contador + acciones */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-2xs font-black tabular-nums text-primary/70">{hechos}/{hobby.freq_sem}</span>
              <button
                className="w-6 h-6 flex items-center justify-center rounded text-primary/20 hover:text-primary/70 hover:bg-primary/10 transition-all opacity-0 group-hover:opacity-100"
                title="Editar"
                onClick={() => setEditando(true)}
              >
                <PencilIcon size={11} />
              </button>
              <button
                className="w-6 h-6 flex items-center justify-center rounded text-primary/20 hover:text-accent hover:bg-accent/10 transition-all opacity-0 group-hover:opacity-100"
                title="Eliminar"
                onClick={() => onEliminar(hobby.id)}
              >
                <X size={11} />
              </button>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="h-0.5 bg-primary/10 rounded-full overflow-hidden mb-2">
            <div className="h-full rounded-full transition-all duration-500 bg-primary/40" style={{ width: `${pct}%` }} />
          </div>

          {/* Días */}
          <div className="flex gap-1">
            {DIAS.map((d, i) => {
              const done = dias[i];
              const isToday = i === today;
              return (
                <button
                  key={d}
                  className={cn(
                    "flex-1 h-6 rounded text-3xs font-black uppercase tracking-widest transition-all flex items-center justify-center border-[length:var(--border-width)]",
                    done
                      ? "bg-primary text-btn-text border-primary"
                      : isToday
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "bg-primary/5 text-primary/40 border-primary/5 hover:bg-primary/10 hover:text-primary/70"
                  )}
                  title={`${DIAS_FULL[i]}${done ? " · hecho" : ""}`}
                  onClick={() => onToggleDia(hobby.id, i)}
                >
                  {done ? <Check size={8} /> : d}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

export const PaginaHobbys = () => {
  const {
    hobbys, registros, cargando, guardando, semana, today,
    crearHobby, editarHobby, eliminarHobby, toggleDia,
  } = useHobbys();

  const [creando, setCreando] = useState(false);

  const handleGuardar = async (datos: Omit<Hobby, "id">) => {
    const ok = await crearHobby(datos);
    if (ok) setCreando(false);
  };

  const handleEditar = editarHobby;
  const handleEliminar = eliminarHobby;
  const handleToggleDia = toggleDia;

  const stats = useMemo(() => {
    const totalHoy = hobbys.reduce((acc, h) => {
      const reg = registros.find(r => r.hobby_id === h.id && r.semana === semana);
      return acc + (reg?.dias[today] ? 1 : 0);
    }, 0);
    const totalHechosSem = hobbys.reduce((acc, h) => {
      const reg = registros.find(r => r.hobby_id === h.id && r.semana === semana);
      return acc + (reg?.dias.filter(Boolean).length ?? 0);
    }, 0);
    const totalObjSem = hobbys.reduce((acc, h) => acc + h.freq_sem, 0);
    const pctSem = totalObjSem > 0 ? Math.round((totalHechosSem / totalObjSem) * 100) : 0;
    return { totalHoy, pctSem };
  }, [hobbys, registros, semana, today]);

  return (
    <div className="w-full px-4 md:px-6 space-y-3">

      {/* Stats compactos */}
      {hobbys.length > 0 && (
        <div className="flex items-center gap-4 px-1">
          {[
            { label: "hobbys",  value: hobbys.length },
            { label: "hoy",     value: `${stats.totalHoy}/${hobbys.length}` },
            { label: "semana",  value: `${stats.pctSem}%` },
          ].map(s => (
            <div key={s.label} className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-primary tracking-tight leading-none">{s.value}</span>
              <span className="text-3xs font-black uppercase tracking-widest text-primary/40">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-2xs font-black uppercase tracking-widest text-primary/40">{semana}</span>
        <button
          className="flex items-center gap-1.5 text-2xs font-black uppercase tracking-widest bg-primary text-btn-text px-3 py-1.5 rounded-[var(--radius-btn)] hover:opacity-90 transition-opacity"
          onClick={() => setCreando(v => !v)}
        >
          {creando ? <X size={11} /> : <Plus size={11} />}
          {creando ? "Cancelar" : "Añadir"}
        </button>
      </div>

      {/* Formulario */}
      <AnimatePresence>
        {creando && (
          <FormNuevoHobby
            guardando={guardando}
            orden={hobbys.length}
            onCancelar={() => setCreando(false)}
            onGuardar={handleGuardar}
          />
        )}
      </AnimatePresence>

      {/* Lista */}
      {cargando ? (
        <div className="flex items-center justify-center py-10 gap-2 text-primary/40">
          <Loader2 className="animate-spin" size={14} />
          <span className="text-xs font-bold">Cargando…</span>
        </div>
      ) : hobbys.length === 0 && !creando ? (
        <div className="text-center py-12">
          <Music className="mx-auto mb-2 text-primary/20" size={28} />
          <p className="text-xs font-black text-primary/40 uppercase tracking-widest">Aún no tienes hobbys</p>
          <p className="text-2xs text-primary/20 font-bold mt-1">Añade uno para empezar a trackear</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <AnimatePresence mode="popLayout">
            {hobbys.map(h => (
              <motion.div
                key={h.id}
                layout
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                initial={{ opacity: 0, y: 8 }}
              >
                <CardHobby
                  hobby={h}
                  registro={registros.find(r => r.hobby_id === h.id && r.semana === semana)}
                  onEditar={handleEditar}
                  onEliminar={handleEliminar}
                  onToggleDia={handleToggleDia}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};