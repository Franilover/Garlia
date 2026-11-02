"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, RotateCcw, ChevronRight, BookOpen,
  Layers, Shuffle, CheckCircle2, Flame, Brain, Sparkles,
  ArrowLeft, X, Clock,
} from "lucide-react";

import { supabase } from "@/infra/supabase/supabase";
import { useAuth } from "@/providers/AuthProvider";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Mazo {
  id: string;
  nombre: string;
  descripcion: string | null;
  color: string | null;
  created_at: string;
}

interface Carta {
  id: string;
  mazo_id: string;
  frente: string;
  reverso: string;
  contexto: string | null;
  etiquetas: string[] | null;
  srs_intervalo: number;
  srs_lapso_minutos: number | null;
  srs_facilidad: number;
  srs_repeticiones: number;
  srs_proxima_vez: string | null;   // fecha YYYY-MM-DD (intervalos ≥1 día)
  srs_proxima_ts: string | null;    // timestamp ISO (intervalos intra-día)
  srs_ultima_vez: string | null;
}

type CalidadRespuesta = 0 | 1 | 2 | 3;

// ── SRS SM-2 con soporte intra-día ─────────────────────────────────────────────
// calidad 0 (Muy difícil) → 10 minutos
// calidad 1 (Difícil)     → 1 día
// calidad 2 (Normal)      → intervalo × EF (exponencial)
// calidad 3 (Fácil)       → intervalo × EF + bonus

const MINUTOS_MUY_DIFICIL = 10;

function calcularSRS(carta: Carta, calidad: CalidadRespuesta) {
  let { srs_intervalo, srs_facilidad, srs_repeticiones } = carta;

  let srs_lapso_minutos: number | null = null;
  let srs_proxima_vez: string | null = null;
  let srs_proxima_ts: string | null = null;

  if (calidad === 0) {
    // Muy difícil → 10 minutos, reinicia racha
    srs_repeticiones = 0;
    srs_intervalo = 0;
    srs_lapso_minutos = MINUTOS_MUY_DIFICIL;
    const ts = new Date();
    ts.setMinutes(ts.getMinutes() + MINUTOS_MUY_DIFICIL);
    srs_proxima_ts = ts.toISOString();
  } else if (calidad === 1) {
    // Difícil → mañana, reinicia racha
    srs_repeticiones = 0;
    srs_intervalo = 1;
    srs_lapso_minutos = null;
    const d = new Date();
    d.setDate(d.getDate() + 1);
    srs_proxima_vez = d.toISOString().split("T")[0];
  } else {
    // Normal o Fácil → SM-2 clásico
    if (srs_repeticiones === 0) srs_intervalo = 1;
    else if (srs_repeticiones === 1) srs_intervalo = 4;
    else srs_intervalo = Math.round(srs_intervalo * srs_facilidad);

    if (calidad === 3) srs_intervalo = Math.round(srs_intervalo * 1.3);

    srs_repeticiones += 1;
    srs_lapso_minutos = null;
    const d = new Date();
    d.setDate(d.getDate() + srs_intervalo);
    srs_proxima_vez = d.toISOString().split("T")[0];
  }

  const q = calidad === 0 ? 1 : calidad; // para EF no castigamos doblemente
  srs_facilidad = Math.max(
    1.3,
    srs_facilidad + 0.1 - (3 - q) * (0.08 + (3 - q) * 0.02),
  );

  return {
    srs_intervalo,
    srs_lapso_minutos,
    srs_facilidad: parseFloat(srs_facilidad.toFixed(2)),
    srs_repeticiones,
    srs_proxima_vez,
    srs_proxima_ts,
    srs_ultima_vez: new Date().toISOString(),
  };
}

function esDue(carta: Carta): boolean {
  if (!carta.srs_proxima_vez && !carta.srs_proxima_ts) return true; // nueva
  const ahora = new Date();
  if (carta.srs_proxima_ts) return new Date(carta.srs_proxima_ts) <= ahora;
  const hoy = ahora.toISOString().split("T")[0];
  return (carta.srs_proxima_vez ?? "") <= hoy;
}

function cartasDue(cartas: Carta[]): Carta[] {
  return cartas.filter(esDue);
}

function previewIntervalo(carta: Carta, calidad: CalidadRespuesta): string {
  if (calidad === 0) return `${MINUTOS_MUY_DIFICIL} min`;
  const r = calcularSRS(carta, calidad);
  if (r.srs_intervalo === 0 && r.srs_lapso_minutos)
    return `${r.srs_lapso_minutos} min`;
  if (r.srs_intervalo === 1) return "mañana";
  return `${r.srs_intervalo}d`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const COLORES_MAZO = [
  "var(--primary)",
  "color-mix(in srgb, var(--primary) 70%, #7c6af2)",
  "color-mix(in srgb, var(--primary) 50%, #3b9eff)",
  "color-mix(in srgb, var(--primary) 40%, #22c55e)",
  "color-mix(in srgb, var(--primary) 30%, #f59e0b)",
  "color-mix(in srgb, var(--primary) 20%, #ef4444)",
  "color-mix(in srgb, var(--primary) 60%, #ec4899)",
];

const SRS_COLORS = {
  muydificil: {
    label: "Muy difícil", value: 0 as CalidadRespuesta,
    fg: "oklch(55% 0.22 25)", bg: "oklch(55% 0.22 25 / 0.1)",
    border: "oklch(55% 0.22 25 / 0.25)",
  },
  dificil: {
    label: "Difícil", value: 1 as CalidadRespuesta,
    fg: "oklch(72% 0.19 80)", bg: "oklch(72% 0.19 80 / 0.1)",
    border: "oklch(72% 0.19 80 / 0.25)",
  },
  normal: {
    label: "Normal", value: 2 as CalidadRespuesta,
    fg: "oklch(62% 0.18 240)", bg: "oklch(62% 0.18 240 / 0.1)",
    border: "oklch(62% 0.18 240 / 0.25)",
  },
  facil: {
    label: "Fácil", value: 3 as CalidadRespuesta,
    fg: "oklch(62% 0.2 145)", bg: "oklch(62% 0.2 145 / 0.1)",
    border: "oklch(62% 0.2 145 / 0.25)",
  },
} as const;

const CALIDADES = Object.values(SRS_COLORS);

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Componentes base ─────────────────────────────────────────────────────────

type FieldProps = { label?: string } & (
  | ({ as?: "input" } & React.InputHTMLAttributes<HTMLInputElement>)
  | ({ as: "textarea" } & React.TextareaHTMLAttributes<HTMLTextAreaElement>)
);

function Field({ label, as, ...rest }: FieldProps & { as?: "input" | "textarea" }) {
  const cls =
    "w-full px-4 py-2.5 rounded-[var(--radius-btn)] border font-semibold text-sm bg-transparent text-primary placeholder-primary/25 outline-none transition-all focus:border-primary/40";
  const style = {
    borderColor: "color-mix(in srgb, var(--primary) 14%, transparent)",
    ...(rest.style ?? {}),
  };
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <span className="text-[10px] font-black uppercase tracking-[0.12em] text-primary/40 pl-0.5">
          {label}
        </span>
      )}
      {as === "textarea" ? (
        <textarea className={cls} style={style}
          {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)} />
      ) : (
        <input className={cls} style={style}
          {...(rest as React.InputHTMLAttributes<HTMLInputElement>)} />
      )}
    </div>
  );
}

function Modal({ open, onClose, children, width = "max-w-sm" }: {
  open: boolean; onClose: () => void; children: React.ReactNode; width?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div className="absolute inset-0"
            style={{ background: "color-mix(in srgb, var(--primary) 18%, transparent)", backdropFilter: "blur(8px)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} />
          <motion.div className={`relative z-10 w-full ${width} rounded-[var(--radius-card)] border`}
            style={{ background: "var(--white-custom)", borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)", boxShadow: "0 24px 64px color-mix(in srgb, var(--primary) 14%, transparent)" }}
            initial={{ scale: 0.92, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}>
            <button className="absolute top-4 right-4 text-primary/25 hover:text-primary/60 transition-colors" onClick={onClose}>
              <X size={15} />
            </button>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function BackBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="flex items-center gap-1.5 font-black text-[10px] uppercase tracking-widest transition-colors group"
      style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
      onClick={onClick}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--primary)"}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--primary) 35%, transparent)"}>
      <ArrowLeft size={12} className="group-hover:-translate-x-0.5 transition-transform" />
      {label}
    </button>
  );
}

// ── MazoCard ──────────────────────────────────────────────────────────────────

function MazoCard({ mazo, total, pendientes, onSelect, onDelete }: {
  mazo: Mazo; total: number; pendientes: number;
  onSelect: () => void; onDelete: () => void;
}) {
  const accent = mazo.color ?? "var(--primary)";
  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative group cursor-pointer rounded-[var(--radius-card)] border overflow-hidden transition-all duration-200"
      style={{ background: "var(--white-custom)", borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)", boxShadow: "var(--shadow-card)" }}
      onClick={onSelect} whileHover={{ y: -3 }}>
      <div className="h-1 w-full" style={{ background: accent }} />
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 mb-1">
              <Layers size={12} style={{ color: accent, flexShrink: 0 }} />
              <h3 className="font-black text-xs uppercase tracking-widest truncate" style={{ color: accent }}>
                {mazo.nombre}
              </h3>
            </div>
            {mazo.descripcion && (
              <p className="text-xs text-primary/40 font-medium line-clamp-2 mt-1 leading-relaxed">
                {mazo.descripcion}
              </p>
            )}
          </div>
          <button className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5"
            style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}
            onClick={e => { e.stopPropagation(); onDelete(); }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "oklch(55% 0.22 25)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--primary) 25%, transparent)"}>
            <Trash2 size={13} />
          </button>
        </div>
        <div className="flex items-center justify-between mt-5 pt-4"
          style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 7%, transparent)" }}>
          <span className="text-[10px] font-black uppercase tracking-widest text-primary/40">
            {total} carta{total !== 1 ? "s" : ""}
          </span>
          {pendientes > 0 ? (
            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{ background: "oklch(55% 0.22 25 / 0.1)", color: "oklch(55% 0.22 25)" }}>
              <Flame size={9} />{pendientes} hoy
            </span>
          ) : total > 0 ? (
            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest"
              style={{ color: "oklch(62% 0.2 145)" }}>
              <CheckCircle2 size={11} />Al día
            </span>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

// ── FlashCard ─────────────────────────────────────────────────────────────────

function FlashCard({ carta, total, estudiadas, onCalificar, onSaltar }: {
  carta: Carta; total: number; estudiadas: number;
  onCalificar: (c: CalidadRespuesta) => void; onSaltar: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const [saliendo, setSaliendo] = useState<CalidadRespuesta | null>(null);

  useEffect(() => { setFlipped(false); setSaliendo(null); }, [carta.id]);

  const handleCalificar = (calidad: CalidadRespuesta) => {
    setSaliendo(calidad);
    setTimeout(() => onCalificar(calidad), 280);
  };

  const esIntraDia = carta.srs_lapso_minutos !== null && carta.srs_lapso_minutos !== undefined;

  return (
    <motion.div key={carta.id}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: saliendo !== null ? 0 : 1, x: saliendo !== null ? -40 : 0, scale: saliendo !== null ? 0.97 : 1 }}
      transition={{ duration: 0.22 }}
      className="flex flex-col gap-6 w-full">

      {/* Progreso */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-black uppercase tracking-widest text-primary/30 tabular-nums w-12">
          {estudiadas}/{total}
        </span>
        <div className="flex-1 h-0.5 rounded-full overflow-hidden"
          style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
          <motion.div className="h-full rounded-full" style={{ background: "var(--primary)" }}
            animate={{ width: `${(estudiadas / total) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }} />
        </div>
        <button className="text-primary/25 hover:text-primary/60 transition-colors" onClick={onSaltar}>
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {!carta.srs_proxima_vez && !carta.srs_proxima_ts ? (
          <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
            style={{ background: "oklch(62% 0.18 240 / 0.1)", color: "oklch(62% 0.18 240)" }}>
            Nueva
          </span>
        ) : esIntraDia ? (
          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
            style={{ background: "oklch(55% 0.22 25 / 0.1)", color: "oklch(55% 0.22 25)" }}>
            <Clock size={9} />Repaso rápido
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
            style={{ background: "oklch(72% 0.19 80 / 0.1)", color: "oklch(72% 0.19 80)" }}>
            <RotateCcw size={9} />Repaso {carta.srs_repeticiones}×
          </span>
        )}
        {carta.etiquetas?.map(e => (
          <span key={e} className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
            style={{ background: "color-mix(in srgb, var(--primary) 7%, transparent)", color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}>
            {e}
          </span>
        ))}
      </div>

      {/* Carta flip */}
      <div className="w-full cursor-pointer select-none" style={{ perspective: "1200px" }}
        onClick={() => setFlipped(f => !f)}>
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.44, type: "spring", stiffness: 260, damping: 26 }}
          style={{ transformStyle: "preserve-3d", position: "relative", minHeight: 240 }}>
          {/* Frente */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-10 rounded-[var(--radius-card)] border"
            style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", background: "var(--white-custom)", borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)", boxShadow: "0 4px 32px color-mix(in srgb, var(--primary) 8%, transparent)" }}>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-primary/25 mb-5">Palabra</p>
            <p className="text-3xl font-black text-primary text-center leading-tight">{carta.frente}</p>
            {carta.contexto && (
              <p className="text-xs text-primary/35 mt-4 text-center italic font-medium">— {carta.contexto}</p>
            )}
            {!flipped && (
              <p className="text-[10px] text-primary/20 mt-8 uppercase tracking-widest font-bold">
                Toca para ver la definición
              </p>
            )}
          </div>
          {/* Reverso */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-10 rounded-[var(--radius-card)] border"
            style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)", background: "color-mix(in srgb, var(--primary) 4%, var(--white-custom))", borderColor: "color-mix(in srgb, var(--primary) 16%, transparent)", boxShadow: "0 4px 32px color-mix(in srgb, var(--primary) 10%, transparent)" }}>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-primary/25 mb-5">Definición</p>
            <p className="text-xl font-bold text-primary text-center leading-relaxed max-w-prose">{carta.reverso}</p>
          </div>
        </motion.div>
      </div>

      {/* Botones SRS */}
      <AnimatePresence>
        {flipped && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.16 }}
            className="flex flex-col gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-primary/25 text-center">
              ¿Qué tan fácil fue?
            </p>
            <div className="grid grid-cols-4 gap-2">
              {CALIDADES.map(c => (
                <button key={c.value}
                  className="flex flex-col items-center gap-1.5 px-2 py-3.5 rounded-[var(--radius-btn)] border transition-all font-black uppercase tracking-widest"
                  style={{ background: c.bg, color: c.fg, borderColor: c.border, fontSize: "10px" }}
                  title={`Próxima: ${previewIntervalo(carta, c.value)}`}
                  onClick={() => handleCalificar(c.value)}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${c.bg}`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  }}>
                  <span>{c.label}</span>
                  <span style={{ opacity: 0.65, fontSize: "9px", fontWeight: 700, letterSpacing: "0.04em" }}>
                    {previewIntervalo(carta, c.value)}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!flipped && (
        <button className="text-[10px] font-black uppercase tracking-[0.12em] text-primary/25 hover:text-primary/50 transition-colors text-center"
          onClick={() => setFlipped(true)}>
          Ver definición →
        </button>
      )}
    </motion.div>
  );
}

// ── Sesión completada ─────────────────────────────────────────────────────────

function SesionCompletada({ total, resultados, onVolver, onReintentar }: {
  total: number; resultados: { calidad: CalidadRespuesta; frente: string }[];
  onVolver: () => void; onReintentar: () => void;
}) {
  const conteo = CALIDADES.map(c => ({ ...c, n: resultados.filter(r => r.calidad === c.value).length }));
  const porcentajeBien = Math.round((resultados.filter(r => r.calidad >= 2).length / total) * 100);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-8 w-full max-w-lg mx-auto py-6">
      <div className="flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: "oklch(62% 0.2 145 / 0.12)" }}>
          <CheckCircle2 size={28} style={{ color: "oklch(62% 0.2 145)" }} />
        </div>
        <h2 className="font-black text-xl uppercase tracking-widest italic text-primary">¡Sesión completa!</h2>
        <p className="text-xs text-primary/40 font-bold uppercase tracking-widest">
          {total} carta{total !== 1 ? "s" : ""} · {porcentajeBien}% bien
        </p>
      </div>
      <div className="w-full rounded-[var(--radius-card)] p-6 border"
        style={{ background: "var(--white-custom)", borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
        <p className="text-[10px] font-black uppercase tracking-widest text-primary/30 mb-5 text-center">Distribución</p>
        <div className="grid grid-cols-4 gap-4">
          {conteo.map(c => (
            <div key={c.value} className="flex flex-col items-center gap-2">
              <div className="w-full rounded-lg flex items-center justify-center py-3" style={{ background: c.bg }}>
                <span className="text-2xl font-black" style={{ color: c.fg }}>{c.n}</span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-center leading-tight"
                style={{ color: c.fg, opacity: 0.8 }}>{c.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-3 w-full">
        <button className="flex-1 px-4 py-2.5 rounded-[var(--radius-btn)] font-black text-[10px] uppercase tracking-widest border transition-all"
          style={{ borderColor: "color-mix(in srgb, var(--primary) 14%, transparent)", color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}
          onClick={onVolver}>Volver a mazos</button>
        <button className="flex-1 px-4 py-2.5 rounded-[var(--radius-btn)] font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
          style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: "var(--primary)" }}
          onClick={onReintentar}><Shuffle size={11} />Repetir sesión</button>
      </div>
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

type Vista = "mazos" | "estudio" | "completada";

export default function FlashCardsPage() {
  const { user } = useAuth() as { user: any };

  const [mazos, setMazos] = useState<Mazo[]>([]);
  const [cartas, setCartas] = useState<Record<string, Carta[]>>({});
  const [mazoActivo, setMazoActivo] = useState<Mazo | null>(null);
  const [cola, setCola] = useState<Carta[]>([]);
  const [indice, setIndice] = useState(0);
  const [resultados, setResultados] = useState<{ calidad: CalidadRespuesta; frente: string }[]>([]);
  const [vista, setVista] = useState<Vista>("mazos");
  const [loading, setLoading] = useState(true);
  const [modoTodas, setModoTodas] = useState(false);

  const [showNuevoMazo, setShowNuevoMazo] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoDesc, setNuevoDesc] = useState("");
  const [nuevoColor, setNuevoColor] = useState(COLORES_MAZO[0]);
  const [savingMazo, setSavingMazo] = useState(false);

  const [showNuevaCarta, setShowNuevaCarta] = useState(false);
  const [nuevaFrente, setNuevaFrente] = useState("");
  const [nuevaReverso, setNuevaReverso] = useState("");
  const [nuevaContexto, setNuevaContexto] = useState("");
  const [savingCarta, setSavingCarta] = useState(false);

  // ── Carga ─────────────────────────────────────────────────────────────────

  const cargarMazos = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("flashcard_mazos")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setMazos(data as Mazo[]);
    setLoading(false);
  }, []);

  const cargarCartas = useCallback(async (mazoId: string): Promise<Carta[]> => {
    const { data } = await supabase
      .from("flashcard_cartas")
      .select("*")
      .eq("mazo_id", mazoId)
      .order("created_at", { ascending: true });
    if (data) {
      const cs = data as Carta[];
      setCartas(prev => ({ ...prev, [mazoId]: cs }));
      return cs;
    }
    return [];
  }, []);

  useEffect(() => { cargarMazos(); }, [cargarMazos]);

  useEffect(() => {
    if (vista === "mazos") mazos.forEach(m => { if (!cartas[m.id]) cargarCartas(m.id); });
  }, [vista, mazos, cartas, cargarCartas]);

  const pendientesPorMazo = useMemo(() => {
    const map: Record<string, number> = {};
    for (const [id, cs] of Object.entries(cartas)) map[id] = cartasDue(cs).length;
    return map;
  }, [cartas]);

  // ── Estudio ───────────────────────────────────────────────────────────────

  const iniciarEstudio = async (mazo: Mazo, todasLasCartas = false) => {
    setMazoActivo(mazo);
    const cs = cartas[mazo.id] ?? (await cargarCartas(mazo.id));
    const base = todasLasCartas ? cs : cartasDue(cs);
    setCola(shuffle(base));
    setIndice(0);
    setResultados([]);
    setModoTodas(todasLasCartas);
    setVista("estudio");
  };

  const calificarCarta = async (calidad: CalidadRespuesta) => {
    const carta = cola[indice];
    const upd = calcularSRS(carta, calidad);
    await supabase.from("flashcard_cartas").update(upd).eq("id", carta.id);
    setCartas(prev => ({
      ...prev,
      [mazoActivo!.id]: (prev[mazoActivo!.id] ?? []).map(c =>
        c.id === carta.id ? { ...c, ...upd } : c
      ),
    }));
    setResultados(prev => [...prev, { calidad, frente: carta.frente }]);
    if (indice + 1 >= cola.length) setVista("completada");
    else setIndice(i => i + 1);
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const crearMazo = async () => {
    if (!nuevoNombre.trim()) return;
    setSavingMazo(true);
    const { data } = await supabase
      .from("flashcard_mazos")
      .insert({ nombre: nuevoNombre.trim(), descripcion: nuevoDesc.trim() || null, color: nuevoColor, user_id: user?.id })
      .select().single();
    if (data) setMazos(prev => [data as Mazo, ...prev]);
    setNuevoNombre(""); setNuevoDesc(""); setNuevoColor(COLORES_MAZO[0]);
    setShowNuevoMazo(false); setSavingMazo(false);
  };

  const eliminarMazo = async (id: string) => {
    await supabase.from("flashcard_mazos").delete().eq("id", id);
    setMazos(prev => prev.filter(m => m.id !== id));
  };

  const crearCarta = async () => {
    if (!mazoActivo || !nuevaFrente.trim() || !nuevaReverso.trim()) return;
    setSavingCarta(true);
    const { data } = await supabase
      .from("flashcard_cartas")
      .insert({ mazo_id: mazoActivo.id, frente: nuevaFrente.trim(), reverso: nuevaReverso.trim(), contexto: nuevaContexto.trim() || null, user_id: user?.id })
      .select().single();
    if (data) setCartas(prev => ({ ...prev, [mazoActivo.id]: [...(prev[mazoActivo.id] ?? []), data as Carta] }));
    setNuevaFrente(""); setNuevaReverso(""); setNuevaContexto("");
    setShowNuevaCarta(false); setSavingCarta(false);
  };

  // ── Vista: Mazos ──────────────────────────────────────────────────────────

  if (vista === "mazos") {
    const totalPend = Object.values(pendientesPorMazo).reduce((a, b) => a + b, 0);
    const totalCartas = Object.values(cartas).reduce((a, b) => a + b.length, 0);

    return (
      <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
        <div className="flex-1 p-6 md:p-10 w-full max-w-6xl mx-auto">

          {/* Header */}
          <div className="flex items-end justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
                <Brain size={17} style={{ color: "var(--primary)" }} />
              </div>
              <div>
                <h1 className="font-black text-base uppercase tracking-widest italic text-primary leading-none">FlashCards</h1>
                <p className="text-[10px] text-primary/35 font-bold uppercase tracking-widest mt-0.5">Repetición espaciada · SM-2</p>
              </div>
            </div>
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-btn)] font-black text-[10px] uppercase tracking-widest transition-all"
              style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: "var(--primary)" }}
              onClick={() => setShowNuevoMazo(true)}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 18%, transparent)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 10%, transparent)"}>
              <Plus size={12} />Nuevo mazo
            </button>
          </div>

          {/* Banner global */}
          {!loading && mazos.length > 0 && (
            totalPend > 0 ? (
              <div className="flex items-center gap-3 px-5 py-3.5 rounded-[var(--radius-btn)] mb-8 w-fit"
                style={{ background: "oklch(55% 0.22 25 / 0.08)", border: "1px solid oklch(55% 0.22 25 / 0.2)" }}>
                <Flame size={14} style={{ color: "oklch(55% 0.22 25)" }} />
                <span className="text-xs font-black uppercase tracking-widest" style={{ color: "oklch(55% 0.22 25)" }}>
                  {totalPend} carta{totalPend !== 1 ? "s" : ""} pendiente{totalPend !== 1 ? "s" : ""} hoy
                </span>
                <span className="text-[10px] text-primary/25 font-bold uppercase tracking-widest">de {totalCartas}</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-5 py-3.5 rounded-[var(--radius-btn)] mb-8 w-fit"
                style={{ background: "oklch(62% 0.2 145 / 0.08)", border: "1px solid oklch(62% 0.2 145 / 0.2)" }}>
                <Sparkles size={14} style={{ color: "oklch(62% 0.2 145)" }} />
                <span className="text-xs font-black uppercase tracking-widest" style={{ color: "oklch(62% 0.2 145)" }}>
                  ¡Al día con todos los mazos!
                </span>
              </div>
            )
          )}

          {/* Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-24 text-primary/20 font-black uppercase tracking-widest text-[10px]">
              Cargando mazos…
            </div>
          ) : mazos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <BookOpen size={28} style={{ color: "color-mix(in srgb, var(--primary) 18%, transparent)" }} />
              <p className="text-[10px] font-black uppercase tracking-widest text-primary/25">No hay mazos. ¡Crea el primero!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <AnimatePresence>
                {mazos.map(m => (
                  <MazoCard key={m.id} mazo={m} total={cartas[m.id]?.length ?? 0}
                    pendientes={pendientesPorMazo[m.id] ?? 0}
                    onSelect={() => iniciarEstudio(m)} onDelete={() => eliminarMazo(m.id)} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Modal nuevo mazo */}
        <Modal open={showNuevoMazo} onClose={() => setShowNuevoMazo(false)}>
          <div className="p-7">
            <h3 className="font-black uppercase tracking-widest text-[10px] text-primary mb-6 text-center">Nuevo mazo</h3>
            <div className="flex flex-col gap-3">
              <Field label="Nombre" placeholder="ej. Palabras nuevas" value={nuevoNombre}
                onChange={(e: any) => setNuevoNombre(e.target.value)}
                onKeyDown={(e: any) => e.key === "Enter" && crearMazo()} autoFocus />
              <Field as="textarea" label="Descripción (opcional)" placeholder="ej. Vocabulario del libro X"
                rows={2} value={nuevoDesc} onChange={(e: any) => setNuevoDesc(e.target.value)} />
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-primary/40 mb-2.5 pl-0.5">Color</p>
                <div className="flex gap-2 flex-wrap">
                  {COLORES_MAZO.map(c => (
                    <button key={c} className="w-7 h-7 rounded-full transition-all border-2"
                      style={{ background: c, borderColor: nuevoColor === c ? "var(--primary)" : "transparent", transform: nuevoColor === c ? "scale(1.18)" : "scale(1)" }}
                      onClick={() => setNuevoColor(c)} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button className="flex-1 px-4 py-2.5 rounded-[var(--radius-btn)] font-black text-[10px] uppercase tracking-widest border transition-all"
                style={{ borderColor: "color-mix(in srgb, var(--primary) 13%, transparent)", color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}
                onClick={() => setShowNuevoMazo(false)}>Cancelar</button>
              <button className="flex-1 px-4 py-2.5 rounded-[var(--radius-btn)] font-black text-[10px] uppercase tracking-widest transition-all"
                style={{ background: nuevoNombre.trim() ? "var(--primary)" : "color-mix(in srgb, var(--primary) 14%, transparent)", color: nuevoNombre.trim() ? "var(--btn-text)" : "color-mix(in srgb, var(--primary) 35%, transparent)" }}
                disabled={!nuevoNombre.trim() || savingMazo} onClick={crearMazo}>
                {savingMazo ? "Guardando…" : "Crear mazo"}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // ── Vista: Completada ─────────────────────────────────────────────────────

  if (vista === "completada") {
    return (
      <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
        <div className="flex-1 p-6 md:p-10 max-w-2xl mx-auto w-full">
          <BackBtn label="Mazos" onClick={() => setVista("mazos")} />
          <div className="mt-8">
            <SesionCompletada total={resultados.length} resultados={resultados}
              onVolver={() => setVista("mazos")}
              onReintentar={() => mazoActivo && iniciarEstudio(mazoActivo, modoTodas)} />
          </div>
        </div>
      </div>
    );
  }

  // ── Vista: Estudio ────────────────────────────────────────────────────────

  const cartaActual = cola[indice];
  const totalEnCola = cola.length;

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
      <div className="flex-1 p-6 md:p-10 max-w-3xl mx-auto w-full flex flex-col gap-8">

        <div className="flex items-center justify-between">
          <BackBtn label="Mazos" onClick={() => setVista("mazos")} />
          <div className="flex flex-col items-center gap-0.5">
            <p className="font-black text-xs uppercase tracking-widest text-primary">{mazoActivo?.nombre}</p>
            <p className="text-[10px] text-primary/30 font-bold uppercase tracking-widest">
              {modoTodas ? "Todas las cartas" : "Repaso de hoy"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!modoTodas && (
              <button className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-[var(--radius-btn)] transition-all"
                style={{ background: "color-mix(in srgb, var(--primary) 7%, transparent)", color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}
                onClick={() => mazoActivo && iniciarEstudio(mazoActivo, true)}>
                Ver todas
              </button>
            )}
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-btn)] font-black text-[10px] uppercase tracking-widest transition-all"
              style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)", color: "var(--primary)" }}
              onClick={() => setShowNuevaCarta(true)}>
              <Plus size={11} />Carta
            </button>
          </div>
        </div>

        {totalEnCola === 0 ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center flex-1 gap-5 py-20">
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "oklch(62% 0.2 145 / 0.1)" }}>
              <CheckCircle2 size={26} style={{ color: "oklch(62% 0.2 145)" }} />
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="font-black text-sm uppercase tracking-widest text-primary">¡Al día!</p>
              <p className="text-[10px] text-primary/35 font-bold uppercase tracking-widest">No hay cartas pendientes para hoy.</p>
            </div>
            <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-[var(--radius-btn)] font-black text-[10px] uppercase tracking-widest transition-all"
              style={{ background: "color-mix(in srgb, var(--primary) 9%, transparent)", color: "var(--primary)" }}
              onClick={() => mazoActivo && iniciarEstudio(mazoActivo, true)}>
              <Shuffle size={11} />Estudiar todas de todas formas
            </button>
          </motion.div>
        ) : cartaActual ? (
          <FlashCard key={cartaActual.id} carta={cartaActual} total={totalEnCola} estudiadas={indice}
            onCalificar={calificarCarta}
            onSaltar={() => {
              if (indice + 1 >= cola.length) setVista("completada");
              else setIndice(i => i + 1);
            }} />
        ) : null}
      </div>

      {/* Modal nueva carta */}
      <Modal open={showNuevaCarta} onClose={() => setShowNuevaCarta(false)}>
        <div className="p-7">
          <h3 className="font-black uppercase tracking-widest text-[10px] text-primary mb-6 text-center">Nueva carta</h3>
          <div className="flex flex-col gap-3">
            <Field label="Palabra (frente)" placeholder="ej. Parsimonia" value={nuevaFrente}
              onChange={(e: any) => setNuevaFrente(e.target.value)} autoFocus />
            <Field as="textarea" label="Definición (reverso)" placeholder="ej. Moderación y economía en los gastos…"
              rows={3} value={nuevaReverso} onChange={(e: any) => setNuevaReverso(e.target.value)} />
            <Field label="Libro o fuente (opcional)" placeholder="ej. En Agosto Nos Vemos"
              value={nuevaContexto} onChange={(e: any) => setNuevaContexto(e.target.value)} />
          </div>
          <div className="flex gap-2 mt-6">
            <button className="flex-1 px-4 py-2.5 rounded-[var(--radius-btn)] font-black text-[10px] uppercase tracking-widest border transition-all"
              style={{ borderColor: "color-mix(in srgb, var(--primary) 13%, transparent)", color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}
              onClick={() => setShowNuevaCarta(false)}>Cancelar</button>
            <button className="flex-1 px-4 py-2.5 rounded-[var(--radius-btn)] font-black text-[10px] uppercase tracking-widest transition-all"
              style={{ background: nuevaFrente.trim() && nuevaReverso.trim() ? "var(--primary)" : "color-mix(in srgb, var(--primary) 14%, transparent)", color: nuevaFrente.trim() && nuevaReverso.trim() ? "var(--btn-text)" : "color-mix(in srgb, var(--primary) 35%, transparent)" }}
              disabled={!nuevaFrente.trim() || !nuevaReverso.trim() || savingCarta}
              onClick={crearCarta}>
              {savingCarta ? "Guardando…" : "Crear carta"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
