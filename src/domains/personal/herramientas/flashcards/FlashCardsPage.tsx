"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Layers,
  Shuffle,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  AlertCircle,
} from "lucide-react";

import { supabase } from "@/infra/supabase/supabase";
import { useAuth } from "@/providers/AuthProvider";

// ── Types ─────────────────────────────────────────────────────────────────────

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
  // SRS
  srs_intervalo: number;
  srs_facilidad: number;
  srs_repeticiones: number;
  srs_proxima_vez: string | null; // ISO date "YYYY-MM-DD"
  srs_ultima_vez: string | null;
}

type CalidadRespuesta = 0 | 1 | 2 | 3; // 0=Muy difícil 1=Difícil 2=Normal 3=Fácil

// ── SRS (SM-2 simplificado) ───────────────────────────────────────────────────

/**
 * Algoritmo SM-2 adaptado.
 * calidad: 0=muy difícil 1=difícil 2=bien 3=fácil
 * Devuelve los campos SRS actualizados.
 */
function calcularSRS(carta: Carta, calidad: CalidadRespuesta) {
  let { srs_intervalo, srs_facilidad, srs_repeticiones } = carta;

  if (calidad <= 1) {
    // Respuesta incorrecta / muy difícil → resetear
    srs_repeticiones = 0;
    srs_intervalo = calidad === 0 ? 1 : 3; // muy difícil→mañana, difícil→3 días
  } else {
    // Respuesta correcta
    if (srs_repeticiones === 0) {
      srs_intervalo = 1;
    } else if (srs_repeticiones === 1) {
      srs_intervalo = 4;
    } else {
      srs_intervalo = Math.round(srs_intervalo * srs_facilidad);
    }
    srs_repeticiones += 1;
  }

  // Actualizar factor de facilidad
  // EF' = EF + (0.1 - (3 - q) * (0.08 + (3 - q) * 0.02))
  const q = calidad;
  srs_facilidad = Math.max(
    1.3,
    srs_facilidad + 0.1 - (3 - q) * (0.08 + (3 - q) * 0.02),
  );

  // Próxima fecha
  const hoy = new Date();
  hoy.setDate(hoy.getDate() + srs_intervalo);
  const srs_proxima_vez = hoy.toISOString().split("T")[0];
  const srs_ultima_vez = new Date().toISOString();

  return {
    srs_intervalo,
    srs_facilidad: parseFloat(srs_facilidad.toFixed(2)),
    srs_repeticiones,
    srs_proxima_vez,
    srs_ultima_vez,
  };
}

/** Cartas que deben estudiarse hoy (proxima_vez <= hoy o null) */
function cartasDueHoy(cartas: Carta[]): Carta[] {
  const hoy = new Date().toISOString().split("T")[0];
  return cartas.filter(
    (c) => c.srs_proxima_vez === null || c.srs_proxima_vez <= hoy,
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const COLORES = [
  "var(--primary)",
  "#7c6af2",
  "#3b9eff",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function diasHasta(fecha: string | null): string {
  if (!fecha) return "Nueva";
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const target = new Date(fecha + "T00:00:00");
  const diff = Math.round(
    (target.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff <= 0) return "Hoy";
  if (diff === 1) return "Mañana";
  return `En ${diff} días`;
}

// ── Botones de calidad ────────────────────────────────────────────────────────

const CALIDADES: {
  label: string;
  sub: string;
  value: CalidadRespuesta;
  color: string;
  bg: string;
}[] = [
  {
    label: "Muy difícil",
    sub: "Mañana",
    value: 0,
    color: "#ef4444",
    bg: "rgba(239,68,68,0.1)",
  },
  {
    label: "Difícil",
    sub: "3 días",
    value: 1,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
  },
  {
    label: "Normal",
    sub: "×EF",
    value: 2,
    color: "#3b9eff",
    bg: "rgba(59,158,255,0.1)",
  },
  {
    label: "Fácil",
    sub: "+bonus",
    value: 3,
    color: "#22c55e",
    bg: "rgba(34,197,94,0.1)",
  },
];

// ── MazoCard ──────────────────────────────────────────────────────────────────

function MazoCard({
  mazo,
  total,
  pendientes,
  onSelect,
  onDelete,
}: {
  mazo: Mazo;
  total: number;
  pendientes: number;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative group cursor-pointer rounded-[var(--radius-card)] p-5 border transition-all duration-200"
      style={{
        background: "var(--white-custom)",
        borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
        boxShadow: "var(--shadow-card)",
      }}
      onClick={onSelect}
      whileHover={{
        y: -2,
        boxShadow:
          "0 8px 24px color-mix(in srgb, var(--primary) 10%, transparent)",
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-[var(--radius-card)]"
        style={{ background: mazo.color ?? "var(--primary)" }}
      />

      <div className="flex items-start justify-between mt-1">
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-sm uppercase tracking-widest text-primary truncate">
            {mazo.nombre}
          </h3>
          {mazo.descripcion && (
            <p className="text-micro text-primary/50 mt-1 line-clamp-2">
              {mazo.descripcion}
            </p>
          )}
        </div>
        <button
          className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 text-primary/30 hover:text-red-400"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          <Layers size={12} style={{ color: mazo.color ?? "var(--primary)" }} />
          <span
            className="text-micro font-black uppercase tracking-widest"
            style={{ color: mazo.color ?? "var(--primary)" }}
          >
            {total} carta{total !== 1 ? "s" : ""}
          </span>
        </div>
        {pendientes > 0 && (
          <span
            className="flex items-center gap-1 text-micro font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}
          >
            <Flame size={10} />
            {pendientes} hoy
          </span>
        )}
        {pendientes === 0 && total > 0 && (
          <span
            className="flex items-center gap-1 text-micro font-black uppercase tracking-widest"
            style={{ color: "#22c55e" }}
          >
            <CheckCircle2 size={11} />
            Al día
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ── FlashCard con SRS ─────────────────────────────────────────────────────────

function FlashCard({
  carta,
  total,
  estudiadas,
  onCalificar,
  onSaltar,
}: {
  carta: Carta;
  total: number;
  estudiadas: number;
  onCalificar: (calidad: CalidadRespuesta) => void;
  onSaltar: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const [saliendo, setSaliendo] = useState<CalidadRespuesta | null>(null);

  useEffect(() => {
    setFlipped(false);
    setSaliendo(null);
  }, [carta.id]);

  const handleCalificar = (calidad: CalidadRespuesta) => {
    setSaliendo(calidad);
    setTimeout(() => onCalificar(calidad), 280);
  };

  // Vista previa de intervalos al hacer hover en los botones
  const previewIntervalo = (calidad: CalidadRespuesta): string => {
    const r = calcularSRS(carta, calidad);
    if (r.srs_intervalo === 1) return "mañana";
    return `${r.srs_intervalo} días`;
  };

  return (
    <motion.div
      key={carta.id}
      initial={{ opacity: 0, x: 40 }}
      animate={{
        opacity: saliendo !== null ? 0 : 1,
        x: saliendo !== null ? -40 : 0,
        scale: saliendo !== null ? 0.96 : 1,
      }}
      transition={{ duration: 0.24 }}
      className="flex flex-col items-center gap-5 w-full max-w-lg mx-auto"
    >
      {/* Progreso */}
      <div className="flex items-center gap-3 w-full">
        <span className="text-micro font-black uppercase tracking-widest text-primary/40">
          {estudiadas}/{total}
        </span>
        <div
          className="flex-1 h-1 rounded-full"
          style={{
            background:
              "color-mix(in srgb, var(--primary) 10%, transparent)",
          }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: "var(--primary)" }}
            animate={{ width: `${(estudiadas / total) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <button
          className="text-primary/30 hover:text-primary transition-colors"
          onClick={onSaltar}
          title="Saltar"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Badge estado */}
      <div className="flex items-center gap-2">
        {carta.srs_proxima_vez === null ? (
          <span
            className="text-micro font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{ background: "rgba(59,158,255,0.1)", color: "#3b9eff" }}
          >
            Nueva
          </span>
        ) : (
          <span
            className="flex items-center gap-1 text-micro font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{
              background: "rgba(245,158,11,0.1)",
              color: "#f59e0b",
            }}
          >
            <RotateCcw size={10} />
            Repaso · {carta.srs_repeticiones} repeticion
            {carta.srs_repeticiones !== 1 ? "es" : ""}
          </span>
        )}
        {carta.etiquetas?.map((e) => (
          <span
            key={e}
            className="text-micro font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{
              background: "color-mix(in srgb, var(--primary) 8%, transparent)",
              color: "color-mix(in srgb, var(--primary) 60%, transparent)",
            }}
          >
            {e}
          </span>
        ))}
      </div>

      {/* Carta flip */}
      <div
        className="w-full cursor-pointer select-none"
        style={{ perspective: "1000px" }}
        onClick={() => setFlipped((f) => !f)}
      >
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{
            duration: 0.42,
            type: "spring",
            stiffness: 280,
            damping: 28,
          }}
          style={{
            transformStyle: "preserve-3d",
            position: "relative",
            minHeight: 210,
          }}
        >
          {/* Frente */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center p-8 rounded-[var(--radius-card)] border"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              background: "var(--white-custom)",
              borderColor:
                "color-mix(in srgb, var(--primary) 12%, transparent)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <p className="text-micro font-black uppercase tracking-widest text-primary/30 mb-4">
              Palabra
            </p>
            <p className="text-2xl font-black text-primary text-center leading-tight">
              {carta.frente}
            </p>
            {carta.contexto && (
              <p className="text-micro text-primary/40 mt-3 text-center italic">
                — {carta.contexto}
              </p>
            )}
            {!flipped && (
              <p className="text-micro text-primary/20 mt-6 uppercase tracking-widest">
                Toca para ver la definición
              </p>
            )}
          </div>

          {/* Reverso */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center p-8 rounded-[var(--radius-card)] border"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              background:
                "color-mix(in srgb, var(--primary) 5%, var(--white-custom))",
              borderColor:
                "color-mix(in srgb, var(--primary) 18%, transparent)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <p className="text-micro font-black uppercase tracking-widest text-primary/30 mb-4">
              Definición
            </p>
            <p className="text-lg font-bold text-primary text-center leading-snug">
              {carta.reverso}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Botones de calidad — aparecen tras dar vuelta */}
      <AnimatePresence>
        {flipped && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18 }}
            className="w-full"
          >
            <p className="text-micro font-black uppercase tracking-widest text-primary/30 text-center mb-3">
              ¿Qué tan fácil fue?
            </p>
            <div className="grid grid-cols-4 gap-2">
              {CALIDADES.map((c) => (
                <button
                  key={c.value}
                  className="flex flex-col items-center gap-1 px-2 py-3 rounded-[var(--radius-btn)] transition-all font-black text-micro uppercase tracking-widest border"
                  style={{
                    background: c.bg,
                    color: c.color,
                    borderColor: c.color + "33",
                  }}
                  title={`Próxima vez: ${previewIntervalo(c.value)}`}
                  onClick={() => handleCalificar(c.value)}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform =
                      "scale(1.04)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                  }}
                >
                  <span>{c.label}</span>
                  <span
                    className="font-bold normal-case tracking-normal"
                    style={{ fontSize: "10px", opacity: 0.7 }}
                  >
                    {previewIntervalo(c.value)}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint antes de dar vuelta */}
      {!flipped && (
        <button
          className="text-micro font-black uppercase tracking-widest transition-colors"
          style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
          onClick={() => setFlipped(true)}
        >
          Ver definición →
        </button>
      )}
    </motion.div>
  );
}

// ── Pantalla de sesión completada ─────────────────────────────────────────────

function SesionCompletada({
  total,
  resultados,
  onVolver,
  onReintentar,
}: {
  total: number;
  resultados: { calidad: CalidadRespuesta; frente: string }[];
  onVolver: () => void;
  onReintentar: () => void;
}) {
  const conteo = CALIDADES.map((c) => ({
    ...c,
    n: resultados.filter((r) => r.calidad === c.value).length,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-6 max-w-md mx-auto py-8"
    >
      <div className="flex flex-col items-center gap-2">
        <CheckCircle2
          size={40}
          style={{ color: "#22c55e" }}
        />
        <h2 className="font-black text-lg uppercase tracking-widest italic text-primary">
          ¡Sesión completa!
        </h2>
        <p className="text-micro text-primary/40 font-bold uppercase tracking-widest">
          {total} carta{total !== 1 ? "s" : ""} estudiada{total !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Resumen */}
      <div
        className="w-full rounded-[var(--radius-card)] p-5 border"
        style={{
          background: "var(--white-custom)",
          borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
        }}
      >
        <p className="text-micro font-black uppercase tracking-widest text-primary/40 mb-4">
          Resultados
        </p>
        <div className="grid grid-cols-4 gap-3">
          {conteo.map((c) => (
            <div key={c.value} className="flex flex-col items-center gap-1">
              <span
                className="text-2xl font-black"
                style={{ color: c.color }}
              >
                {c.n}
              </span>
              <span
                className="text-micro font-black uppercase tracking-widest text-center"
                style={{ color: c.color, opacity: 0.7 }}
              >
                {c.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 w-full">
        <button
          className="flex-1 px-4 py-2.5 rounded-[var(--radius-btn)] font-black text-micro uppercase tracking-widest transition-all border"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
            color: "color-mix(in srgb, var(--primary) 60%, transparent)",
          }}
          onClick={onVolver}
        >
          Volver
        </button>
        <button
          className="flex-1 px-4 py-2.5 rounded-[var(--radius-btn)] font-black text-micro uppercase tracking-widest transition-all"
          style={{
            background: "color-mix(in srgb, var(--primary) 10%, transparent)",
            color: "var(--primary)",
          }}
          onClick={onReintentar}
        >
          <Shuffle size={12} className="inline mr-1.5" />
          Volver a estudiar
        </button>
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
  const [cola, setCola] = useState<Carta[]>([]); // cartas en orden de estudio
  const [indice, setIndice] = useState(0);
  const [resultados, setResultados] = useState<
    { calidad: CalidadRespuesta; frente: string }[]
  >([]);
  const [vista, setVista] = useState<Vista>("mazos");
  const [loading, setLoading] = useState(true);
  const [modoTodas, setModoTodas] = useState(false); // estudiar todas vs solo las de hoy

  // Modal nuevo mazo
  const [showNuevoMazo, setShowNuevoMazo] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoDesc, setNuevoDesc] = useState("");
  const [nuevoColor, setNuevoColor] = useState(COLORES[0]);
  const [savingMazo, setSavingMazo] = useState(false);

  // Modal nueva carta
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

  const cargarCartas = useCallback(
    async (mazoId: string): Promise<Carta[]> => {
      const { data } = await supabase
        .from("flashcard_cartas")
        .select("*")
        .eq("mazo_id", mazoId)
        .order("created_at", { ascending: true });
      if (data) {
        const cs = data as Carta[];
        setCartas((prev) => ({ ...prev, [mazoId]: cs }));
        return cs;
      }
      return [];
    },
    [],
  );

  useEffect(() => {
    cargarMazos();
  }, [cargarMazos]);

  // ── Pendientes por mazo ───────────────────────────────────────────────────

  const pendientesPorMazo = useMemo(() => {
    const map: Record<string, number> = {};
    for (const [id, cs] of Object.entries(cartas)) {
      map[id] = cartasDueHoy(cs).length;
    }
    return map;
  }, [cartas]);

  // Precarga los conteos al ver la lista de mazos
  useEffect(() => {
    if (vista === "mazos") {
      mazos.forEach((m) => {
        if (!cartas[m.id]) cargarCartas(m.id);
      });
    }
  }, [vista, mazos, cartas, cargarCartas]);

  // ── Iniciar sesión de estudio ─────────────────────────────────────────────

  const iniciarEstudio = async (mazo: Mazo, todasLasCartas = false) => {
    setMazoActivo(mazo);
    const cs = cartas[mazo.id] ?? (await cargarCartas(mazo.id));
    const base = todasLasCartas ? cs : cartasDueHoy(cs);
    setCola(shuffle(base));
    setIndice(0);
    setResultados([]);
    setModoTodas(todasLasCartas);
    setVista("estudio");
  };

  // ── Calificar carta ───────────────────────────────────────────────────────

  const calificarCarta = async (calidad: CalidadRespuesta) => {
    const carta = cola[indice];
    const upd = calcularSRS(carta, calidad);

    // Guardar en Supabase
    await supabase
      .from("flashcard_cartas")
      .update(upd)
      .eq("id", carta.id);

    // Actualizar local
    const cartaActualizada = { ...carta, ...upd };
    setCartas((prev) => ({
      ...prev,
      [mazoActivo!.id]: (prev[mazoActivo!.id] ?? []).map((c) =>
        c.id === carta.id ? cartaActualizada : c,
      ),
    }));

    setResultados((prev) => [
      ...prev,
      { calidad, frente: carta.frente },
    ]);

    if (indice + 1 >= cola.length) {
      setVista("completada");
    } else {
      setIndice((i) => i + 1);
    }
  };

  // ── Crear mazo ────────────────────────────────────────────────────────────

  const crearMazo = async () => {
    if (!nuevoNombre.trim()) return;
    setSavingMazo(true);
    const { data } = await supabase
      .from("flashcard_mazos")
      .insert({
        nombre: nuevoNombre.trim(),
        descripcion: nuevoDesc.trim() || null,
        color: nuevoColor,
        user_id: user?.id,
      })
      .select()
      .single();
    if (data) setMazos((prev) => [data as Mazo, ...prev]);
    setNuevoNombre("");
    setNuevoDesc("");
    setNuevoColor(COLORES[0]);
    setShowNuevoMazo(false);
    setSavingMazo(false);
  };

  const eliminarMazo = async (id: string) => {
    await supabase.from("flashcard_mazos").delete().eq("id", id);
    setMazos((prev) => prev.filter((m) => m.id !== id));
  };

  // ── Crear carta ───────────────────────────────────────────────────────────

  const crearCarta = async () => {
    if (!mazoActivo || !nuevaFrente.trim() || !nuevaReverso.trim()) return;
    setSavingCarta(true);
    const { data } = await supabase
      .from("flashcard_cartas")
      .insert({
        mazo_id: mazoActivo.id,
        frente: nuevaFrente.trim(),
        reverso: nuevaReverso.trim(),
        contexto: nuevaContexto.trim() || null,
        user_id: user?.id,
      })
      .select()
      .single();
    if (data) {
      const nueva = data as Carta;
      setCartas((prev) => ({
        ...prev,
        [mazoActivo.id]: [...(prev[mazoActivo.id] ?? []), nueva],
      }));
    }
    setNuevaFrente("");
    setNuevaReverso("");
    setNuevaContexto("");
    setShowNuevaCarta(false);
    setSavingCarta(false);
  };

  // ── Vista: Mazos ──────────────────────────────────────────────────────────

  if (vista === "mazos") {
    return (
      <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
        <div className="flex-1 p-6 md:p-8 max-w-4xl mx-auto w-full">
          {/* Header */}
          <div className="flex items-end justify-between mb-8">
            <div>
              <h1 className="font-black text-xl uppercase tracking-widest italic text-primary">
                FlashCards
              </h1>
              <p className="text-micro text-primary/40 mt-1 font-bold uppercase tracking-widest">
                Sistema de repetición espaciada
              </p>
            </div>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-btn)] font-black text-micro uppercase tracking-widest transition-all"
              style={{
                background:
                  "color-mix(in srgb, var(--primary) 10%, transparent)",
                color: "var(--primary)",
              }}
              onClick={() => setShowNuevoMazo(true)}
            >
              <Plus size={13} />
              Nuevo mazo
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-primary/20 font-black uppercase tracking-widest text-micro">
              Cargando…
            </div>
          ) : mazos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <BookOpen
                size={32}
                style={{
                  color:
                    "color-mix(in srgb, var(--primary) 20%, transparent)",
                }}
              />
              <p className="text-micro font-black uppercase tracking-widest text-primary/30">
                No hay mazos. ¡Crea el primero!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {mazos.map((m) => (
                  <MazoCard
                    key={m.id}
                    mazo={m}
                    total={cartas[m.id]?.length ?? 0}
                    pendientes={pendientesPorMazo[m.id] ?? 0}
                    onSelect={() => iniciarEstudio(m)}
                    onDelete={() => eliminarMazo(m.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Modal nuevo mazo */}
        <AnimatePresence>
          {showNuevoMazo && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
              <motion.div
                className="absolute inset-0"
                style={{
                  background:
                    "color-mix(in srgb, var(--primary) 20%, transparent)",
                  backdropFilter: "blur(6px)",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowNuevoMazo(false)}
              />
              <motion.div
                className="relative z-10 w-full max-w-sm rounded-[var(--radius-card)] p-7 border"
                style={{
                  background: "var(--white-custom)",
                  borderColor:
                    "color-mix(in srgb, var(--primary) 12%, transparent)",
                  boxShadow: "var(--shadow-card)",
                }}
                initial={{ scale: 0.93, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.93, opacity: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              >
                <h3 className="font-black uppercase tracking-widest text-micro text-primary mb-5 text-center">
                  Nuevo mazo
                </h3>
                <div className="flex flex-col gap-3">
                  <input
                    className="w-full px-3 py-2 rounded-[var(--radius-btn)] border font-bold text-sm bg-transparent text-primary placeholder-primary/30 outline-none transition-colors"
                    style={{
                      borderColor:
                        "color-mix(in srgb, var(--primary) 15%, transparent)",
                    }}
                    placeholder="Nombre del mazo"
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && crearMazo()}
                    autoFocus
                  />
                  <textarea
                    className="w-full px-3 py-2 rounded-[var(--radius-btn)] border font-bold text-sm bg-transparent text-primary placeholder-primary/30 outline-none transition-colors resize-none"
                    style={{
                      borderColor:
                        "color-mix(in srgb, var(--primary) 15%, transparent)",
                    }}
                    placeholder="Descripción (opcional)"
                    rows={2}
                    value={nuevoDesc}
                    onChange={(e) => setNuevoDesc(e.target.value)}
                  />
                  <div>
                    <p className="text-micro font-black uppercase tracking-widest text-primary/40 mb-2">
                      Color
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {COLORES.map((c) => (
                        <button
                          key={c}
                          className="w-7 h-7 rounded-full transition-all border-2"
                          style={{
                            background: c,
                            borderColor:
                              nuevoColor === c
                                ? "var(--primary)"
                                : "transparent",
                            transform:
                              nuevoColor === c ? "scale(1.15)" : "scale(1)",
                          }}
                          onClick={() => setNuevoColor(c)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <button
                    className="flex-1 px-4 py-2 rounded-[var(--radius-btn)] font-black text-micro uppercase tracking-widest border"
                    style={{
                      borderColor:
                        "color-mix(in srgb, var(--primary) 15%, transparent)",
                      color:
                        "color-mix(in srgb, var(--primary) 50%, transparent)",
                    }}
                    onClick={() => setShowNuevoMazo(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    className="flex-1 px-4 py-2 rounded-[var(--radius-btn)] font-black text-micro uppercase tracking-widest transition-all"
                    style={{
                      background: nuevoNombre.trim()
                        ? "var(--primary)"
                        : "color-mix(in srgb, var(--primary) 20%, transparent)",
                      color: nuevoNombre.trim()
                        ? "var(--btn-text)"
                        : "color-mix(in srgb, var(--primary) 40%, transparent)",
                    }}
                    disabled={!nuevoNombre.trim() || savingMazo}
                    onClick={crearMazo}
                  >
                    {savingMazo ? "Guardando…" : "Crear"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Vista: Completada ─────────────────────────────────────────────────────

  if (vista === "completada") {
    return (
      <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
        <div className="flex-1 p-6 md:p-8 max-w-2xl mx-auto w-full">
          {/* Back */}
          <button
            className="flex items-center gap-2 font-black text-micro uppercase tracking-widest italic transition-colors group mb-8"
            style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
            onClick={() => setVista("mazos")}
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
            Mazos
          </button>

          <SesionCompletada
            total={resultados.length}
            resultados={resultados}
            onVolver={() => setVista("mazos")}
            onReintentar={() => mazoActivo && iniciarEstudio(mazoActivo, modoTodas)}
          />
        </div>
      </div>
    );
  }

  // ── Vista: Estudio ────────────────────────────────────────────────────────

  const cartaActual = cola[indice];
  const totalEnCola = cola.length;
  const todasDone = cartasDueHoy(cartas[mazoActivo?.id ?? ""] ?? []).length;

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
      <div className="flex-1 p-6 md:p-8 max-w-2xl mx-auto w-full flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            className="flex items-center gap-2 font-black text-micro uppercase tracking-widest italic transition-colors group"
            style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
            onClick={() => setVista("mazos")}
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
            Mazos
          </button>

          <div className="text-center">
            <p className="font-black text-sm uppercase tracking-widest text-primary">
              {mazoActivo?.nombre}
            </p>
            <p className="text-micro text-primary/40">
              {modoTodas ? "Todas las cartas" : "Repaso de hoy"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!modoTodas && todasDone === 0 && (
              <button
                className="text-micro font-black uppercase tracking-widest px-3 py-1.5 rounded-[var(--radius-btn)] transition-all"
                style={{
                  background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                  color: "color-mix(in srgb, var(--primary) 50%, transparent)",
                }}
                onClick={() => mazoActivo && iniciarEstudio(mazoActivo, true)}
              >
                Ver todas
              </button>
            )}
            <button
              className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-btn)] font-black text-micro uppercase tracking-widest transition-all"
              style={{
                background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                color: "var(--primary)",
              }}
              onClick={() => setShowNuevaCarta(true)}
            >
              <Plus size={12} />
              Carta
            </button>
          </div>
        </div>

        {/* Sin cartas */}
        {totalEnCola === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center flex-1 gap-4 py-20"
          >
            <CheckCircle2
              size={36}
              style={{ color: "#22c55e" }}
            />
            <p className="font-black text-sm uppercase tracking-widest text-primary">
              ¡Al día!
            </p>
            <p className="text-micro text-primary/40 font-bold uppercase tracking-widest text-center">
              No tienes cartas pendientes para hoy.
            </p>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-btn)] font-black text-micro uppercase tracking-widest transition-all"
              style={{
                background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                color: "var(--primary)",
              }}
              onClick={() => mazoActivo && iniciarEstudio(mazoActivo, true)}
            >
              <Shuffle size={12} />
              Estudiar todas de todas formas
            </button>
          </motion.div>
        ) : (
          cartaActual && (
            <FlashCard
              key={cartaActual.id}
              carta={cartaActual}
              total={totalEnCola}
              estudiadas={indice}
              onCalificar={calificarCarta}
              onSaltar={() => {
                if (indice + 1 >= cola.length) setVista("completada");
                else setIndice((i) => i + 1);
              }}
            />
          )
        )}
      </div>

      {/* Modal nueva carta */}
      <AnimatePresence>
        {showNuevaCarta && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              className="absolute inset-0"
              style={{
                background:
                  "color-mix(in srgb, var(--primary) 20%, transparent)",
                backdropFilter: "blur(6px)",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNuevaCarta(false)}
            />
            <motion.div
              className="relative z-10 w-full max-w-sm rounded-[var(--radius-card)] p-7 border"
              style={{
                background: "var(--white-custom)",
                borderColor:
                  "color-mix(in srgb, var(--primary) 12%, transparent)",
                boxShadow: "var(--shadow-card)",
              }}
              initial={{ scale: 0.93, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            >
              <h3 className="font-black uppercase tracking-widest text-micro text-primary mb-5 text-center">
                Nueva carta
              </h3>
              <div className="flex flex-col gap-3">
                <input
                  className="w-full px-3 py-2 rounded-[var(--radius-btn)] border font-bold text-sm bg-transparent text-primary placeholder-primary/30 outline-none transition-colors"
                  style={{
                    borderColor:
                      "color-mix(in srgb, var(--primary) 15%, transparent)",
                  }}
                  placeholder="Frente (palabra)"
                  value={nuevaFrente}
                  onChange={(e) => setNuevaFrente(e.target.value)}
                  autoFocus
                />
                <textarea
                  className="w-full px-3 py-2 rounded-[var(--radius-btn)] border font-bold text-sm bg-transparent text-primary placeholder-primary/30 outline-none transition-colors resize-none"
                  style={{
                    borderColor:
                      "color-mix(in srgb, var(--primary) 15%, transparent)",
                  }}
                  placeholder="Reverso (definición)"
                  rows={3}
                  value={nuevaReverso}
                  onChange={(e) => setNuevaReverso(e.target.value)}
                />
                <input
                  className="w-full px-3 py-2 rounded-[var(--radius-btn)] border font-bold text-sm bg-transparent text-primary placeholder-primary/30 outline-none transition-colors"
                  style={{
                    borderColor:
                      "color-mix(in srgb, var(--primary) 15%, transparent)",
                  }}
                  placeholder="Libro / fuente (opcional)"
                  value={nuevaContexto}
                  onChange={(e) => setNuevaContexto(e.target.value)}
                />
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  className="flex-1 px-4 py-2 rounded-[var(--radius-btn)] font-black text-micro uppercase tracking-widest border"
                  style={{
                    borderColor:
                      "color-mix(in srgb, var(--primary) 15%, transparent)",
                    color:
                      "color-mix(in srgb, var(--primary) 50%, transparent)",
                  }}
                  onClick={() => setShowNuevaCarta(false)}
                >
                  Cancelar
                </button>
                <button
                  className="flex-1 px-4 py-2 rounded-[var(--radius-btn)] font-black text-micro uppercase tracking-widest transition-all"
                  style={{
                    background:
                      nuevaFrente.trim() && nuevaReverso.trim()
                        ? "var(--primary)"
                        : "color-mix(in srgb, var(--primary) 20%, transparent)",
                    color:
                      nuevaFrente.trim() && nuevaReverso.trim()
                        ? "var(--btn-text)"
                        : "color-mix(in srgb, var(--primary) 40%, transparent)",
                  }}
                  disabled={
                    !nuevaFrente.trim() || !nuevaReverso.trim() || savingCarta
                  }
                  onClick={crearCarta}
                >
                  {savingCarta ? "Guardando…" : "Crear"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
