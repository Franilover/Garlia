"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/index";
import {
  Plus, Check, X, Loader2, Pencil as PencilIcon,
  Guitar, Palette, BookOpen, PenLine, Brain, Dumbbell, Gamepad2,
  Theater, Camera, Music, ChefHat, Leaf, Puzzle, Target, Pencil,
  Clapperboard, Mic, PersonStanding, Mountain, Music2,
  type LucideIcon,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Hobby {
  id: string;
  nombre: string;
  icon: string;
  color: number;
  freq_dia: number;
  freq_sem: number;
  nota?: string;
  orden: number;
}

interface Registro {
  id: string;
  hobby_id: string;
  semana: string;
  dias: boolean[];
}

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

// ─── Utils ────────────────────────────────────────────────────────────────────

function getSemanaKey(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
  );
  return `${now.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function getTodayIdx(): number {
  return (new Date().getDay() + 6) % 7;
}

// ─── Queries Supabase ─────────────────────────────────────────────────────────

async function getSupabase() {
  const { supabase } = await import("@/lib/api/client/supabase");
  return supabase;
}

const hobbysQueries = {
  async getAll(): Promise<Hobby[]> {
    const sb = await getSupabase();
    const { data, error } = await sb.from("hobbys").select("*").order("orden", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
  async add(hobby: Omit<Hobby, "id">): Promise<Hobby> {
    const sb = await getSupabase();
    const { data: { user } } = await sb.auth.getUser();
    const { data, error } = await sb.from("hobbys").insert({ ...hobby, user_id: user?.id }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, datos: Partial<Omit<Hobby, "id">>): Promise<Hobby> {
    const sb = await getSupabase();
    const { data, error } = await sb.from("hobbys").update(datos).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  async delete(id: string): Promise<void> {
    const sb = await getSupabase();
    const { error } = await sb.from("hobbys").delete().eq("id", id);
    if (error) throw error;
  },
};

const registrosQueries = {
  async getBySemana(semana: string): Promise<Registro[]> {
    const sb = await getSupabase();
    const { data, error } = await sb.from("hobbys_registros").select("*").eq("semana", semana);
    if (error) throw error;
    return data ?? [];
  },
  async upsert(hobbyId: string, semana: string, dias: boolean[]): Promise<void> {
    const sb = await getSupabase();
    const { data: { user } } = await sb.auth.getUser();
    const { error } = await sb.from("hobbys_registros").upsert(
      { hobby_id: hobbyId, semana, dias, user_id: user?.id },
      { onConflict: "hobby_id,semana" }
    );
    if (error) throw error;
  },
};

// ─── Estilos compartidos ──────────────────────────────────────────────────────

const inputCls =
  "w-full bg-primary/5 border-[length:var(--border-width)] border-transparent focus:border-primary/15 focus:bg-white-custom rounded-[var(--radius-btn)] py-2 px-3 text-sm font-bold text-primary outline-none placeholder:text-primary/25 transition-all";

const selectCls =
  "w-full bg-primary/5 border-[length:var(--border-width)] border-transparent focus:border-primary/15 rounded-[var(--radius-btn)] py-2 px-3 text-sm font-bold text-primary outline-none appearance-none cursor-pointer";

// ─── Selector de icono compartido ─────────────────────────────────────────────

const IconSelector = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div className="flex flex-wrap gap-1">
    {HOBBY_ICONS.map(({ name, component: Icon, label }) => (
      <button
        key={name}
        type="button"
        title={label}
        onClick={() => onChange(name)}
        className={cn(
          "w-8 h-8 rounded-[var(--radius-btn)] flex items-center justify-center transition-all border-[length:var(--border-width)]",
          value === name
            ? "bg-primary text-btn-text border-primary"
            : "bg-primary/5 text-primary/50 border-transparent hover:bg-primary/10 hover:text-primary/70"
        )}
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
    onGuardar({ nombre: nombre.trim(), icon, color: 0, freq_dia: freqDia, freq_sem: freqSem, nota: nota.trim(), orden });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="bg-white-custom border-[length:var(--border-width)] border-primary/10 rounded-[var(--radius-card)] p-4 shadow-lg shadow-primary/5 mb-3 space-y-3"
    >
      <p className="text-[9px] font-black uppercase tracking-widest text-primary/40">Nuevo hobby</p>

      <input
        value={nombre}
        onChange={e => setNombre(e.target.value)}
        placeholder="Nombre del hobby..."
        className={inputCls}
        onKeyDown={e => e.key === "Enter" && handleGuardar()}
        autoFocus
      />

      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-primary/30 mb-1.5">Icono</p>
        <IconSelector value={icon} onChange={setIcon} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select value={freqDia} onChange={e => setFreqDia(parseInt(e.target.value))} className={selectCls}>
          {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}x al día</option>)}
        </select>
        <select value={freqSem} onChange={e => setFreqSem(parseInt(e.target.value))} className={selectCls}>
          {[1, 2, 3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{n}d / sem</option>)}
        </select>
      </div>

      <input value={nota} onChange={e => setNota(e.target.value)} placeholder="Nota opcional..." className={inputCls} />

      <div className="flex gap-2">
        <button onClick={onCancelar} className="flex-1 py-2 rounded-[var(--radius-btn)] border-[length:var(--border-width)] border-primary/15 text-xs font-black text-primary/60 hover:bg-primary/4 transition-all">
          Cancelar
        </button>
        <button
          onClick={handleGuardar}
          disabled={!nombre.trim() || guardando}
          className="flex-1 py-2 rounded-[var(--radius-btn)] bg-primary text-btn-text text-xs font-black hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5"
        >
          {guardando ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
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
    onGuardar({ nombre: nombre.trim(), icon, freq_dia: freqDia, freq_sem: freqSem, nota: nota.trim() });
  };

  return (
    <div className="px-3 pb-3 border-t border-primary/5 pt-3 space-y-2.5">
      <p className="text-[9px] font-black uppercase tracking-widest text-primary/40">Editar hobby</p>
      <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre..." className={inputCls} onKeyDown={e => e.key === "Enter" && handleGuardar()} autoFocus />
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-primary/30 mb-1.5">Icono</p>
        <IconSelector value={icon} onChange={setIcon} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select value={freqDia} onChange={e => setFreqDia(parseInt(e.target.value))} className={selectCls}>
          {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}x al día</option>)}
        </select>
        <select value={freqSem} onChange={e => setFreqSem(parseInt(e.target.value))} className={selectCls}>
          {[1, 2, 3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{n}d / sem</option>)}
        </select>
      </div>
      <input value={nota} onChange={e => setNota(e.target.value)} placeholder="Nota opcional..." className={inputCls} />
      <div className="flex gap-2">
        <button onClick={onCancelar} className="flex-1 py-1.5 rounded-[var(--radius-btn)] border-[length:var(--border-width)] border-primary/15 text-xs font-black text-primary/60 hover:bg-primary/4 transition-all">Cancelar</button>
        <button onClick={handleGuardar} disabled={!nombre.trim() || guardando} className="flex-1 py-1.5 rounded-[var(--radius-btn)] bg-primary text-btn-text text-xs font-black hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5">
          {guardando ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
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
        <FormEditarHobby hobby={hobby} onGuardar={handleEditar} onCancelar={() => setEditando(false)} guardando={guardando} />
      ) : (
        <div className="p-3">
          {/* Fila principal */}
          <div className="flex items-center gap-2.5 mb-2.5">
            {/* Icono */}
            <div className={cn(
              "w-8 h-8 rounded-[var(--radius-btn)] flex items-center justify-center shrink-0 transition-colors",
              completado ? "bg-primary/15 text-primary/80" : "bg-primary/8 text-primary/50"
            )}>
              <HobbyIcon name={hobby.icon} size={15} />
            </div>

            {/* Nombre + meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-black text-primary tracking-tight truncate leading-none">{hobby.nombre}</span>
                {completado && <Check size={10} className="text-primary/50 shrink-0" />}
              </div>
              <span className="text-[10px] font-bold text-primary/35 leading-none mt-0.5 block">
                {hobby.freq_dia > 1 ? `${hobby.freq_dia}x · ` : ""}{hobby.freq_sem}d/sem{hobby.nota ? ` · ${hobby.nota}` : ""}
              </span>
            </div>

            {/* Contador + acciones */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] font-black tabular-nums text-primary/50">{hechos}/{hobby.freq_sem}</span>
              <button
                onClick={() => setEditando(true)}
                className="w-6 h-6 flex items-center justify-center rounded text-primary/25 hover:text-primary/60 hover:bg-primary/8 transition-all opacity-0 group-hover:opacity-100"
                title="Editar"
              >
                <PencilIcon size={11} />
              </button>
              <button
                onClick={() => onEliminar(hobby.id)}
                className="w-6 h-6 flex items-center justify-center rounded text-primary/25 hover:text-accent hover:bg-accent/8 transition-all opacity-0 group-hover:opacity-100"
                title="Eliminar"
              >
                <X size={11} />
              </button>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="h-0.5 bg-primary/8 rounded-full overflow-hidden mb-2">
            <div className="h-full rounded-full transition-all duration-500 bg-primary/35" style={{ width: `${pct}%` }} />
          </div>

          {/* Días */}
          <div className="flex gap-1">
            {DIAS.map((d, i) => {
              const done = dias[i];
              const isToday = i === today;
              return (
                <button
                  key={d}
                  onClick={() => onToggleDia(hobby.id, i)}
                  title={`${DIAS_FULL[i]}${done ? " · hecho" : ""}`}
                  className={cn(
                    "flex-1 h-6 rounded text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center border-[length:var(--border-width)]",
                    done
                      ? "bg-primary text-btn-text border-primary"
                      : isToday
                      ? "bg-primary/8 text-primary border-primary/25"
                      : "bg-primary/3 text-primary/30 border-primary/6 hover:bg-primary/8 hover:text-primary/60"
                  )}
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
  const [hobbys, setHobbys]       = useState<Hobby[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [cargando, setCargando]   = useState(true);
  const [creando, setCreando]     = useState(false);
  const [guardando, setGuardando] = useState(false);

  const semana = useMemo(() => getSemanaKey(), []);
  const today  = getTodayIdx();

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [h, r] = await Promise.all([hobbysQueries.getAll(), registrosQueries.getBySemana(semana)]);
      setHobbys(h);
      setRegistros(r);
    } catch (err) {
      console.error("[PaginaHobbys] cargar:", err);
    } finally {
      setCargando(false);
    }
  }, [semana]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleGuardar = async (datos: Omit<Hobby, "id">) => {
    setGuardando(true);
    try {
      const nuevo = await hobbysQueries.add(datos);
      setHobbys(prev => [...prev, nuevo]);
      setCreando(false);
    } catch (err) {
      console.error("[PaginaHobbys] guardar:", err);
    } finally {
      setGuardando(false);
    }
  };

  const handleEditar = async (id: string, datos: Partial<Omit<Hobby, "id">>) => {
    try {
      const updated = await hobbysQueries.update(id, datos);
      setHobbys(prev => prev.map(h => h.id === id ? updated : h));
    } catch (err) {
      console.error("[PaginaHobbys] editar:", err);
      cargar();
    }
  };

  const handleEliminar = async (id: string) => {
    setHobbys(prev => prev.filter(h => h.id !== id));
    try {
      await hobbysQueries.delete(id);
    } catch (err) {
      console.error("[PaginaHobbys] eliminar:", err);
      cargar();
    }
  };

  const handleToggleDia = async (hobbyId: string, diaIdx: number) => {
    setRegistros(prev => {
      const existing = prev.find(r => r.hobby_id === hobbyId && r.semana === semana);
      if (existing) {
        return prev.map(r =>
          r.hobby_id === hobbyId && r.semana === semana
            ? { ...r, dias: r.dias.map((v, i) => (i === diaIdx ? !v : v)) }
            : r
        );
      }
      const diasNuevos = Array(7).fill(false) as boolean[];
      diasNuevos[diaIdx] = true;
      return [...prev, { id: "tmp", hobby_id: hobbyId, semana, dias: diasNuevos }];
    });

    try {
      const current = registros.find(r => r.hobby_id === hobbyId && r.semana === semana);
      const diasActuales = current?.dias ?? Array(7).fill(false);
      const nuevosDias = diasActuales.map((v, i) => (i === diaIdx ? !v : v));
      await registrosQueries.upsert(hobbyId, semana, nuevosDias);
    } catch (err) {
      console.error("[PaginaHobbys] toggle día:", err);
      cargar();
    }
  };

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
              <span className="text-[9px] font-black uppercase tracking-widest text-primary/35">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-primary/30">{semana}</span>
        <button
          onClick={() => setCreando(v => !v)}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text px-3 py-1.5 rounded-[var(--radius-btn)] hover:opacity-90 transition-opacity"
        >
          {creando ? <X size={11} /> : <Plus size={11} />}
          {creando ? "Cancelar" : "Añadir"}
        </button>
      </div>

      {/* Formulario */}
      <AnimatePresence>
        {creando && (
          <FormNuevoHobby
            onGuardar={handleGuardar}
            onCancelar={() => setCreando(false)}
            guardando={guardando}
            orden={hobbys.length}
          />
        )}
      </AnimatePresence>

      {/* Lista */}
      {cargando ? (
        <div className="flex items-center justify-center py-10 gap-2 text-primary/40">
          <Loader2 size={14} className="animate-spin" />
          <span className="text-xs font-bold">Cargando…</span>
        </div>
      ) : hobbys.length === 0 && !creando ? (
        <div className="text-center py-12">
          <Music size={28} className="mx-auto mb-2 text-primary/20" />
          <p className="text-xs font-black text-primary/40 uppercase tracking-widest">Aún no tienes hobbys</p>
          <p className="text-[11px] text-primary/25 font-bold mt-1">Añade uno para empezar a trackear</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <AnimatePresence mode="popLayout">
            {hobbys.map(h => (
              <motion.div
                key={h.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
              >
                <CardHobby
                  hobby={h}
                  registro={registros.find(r => r.hobby_id === h.id && r.semana === semana)}
                  onToggleDia={handleToggleDia}
                  onEliminar={handleEliminar}
                  onEditar={handleEditar}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};