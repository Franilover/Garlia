"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Layers,
  Check,
  X,
  Pencil,
  Save,
  Shuffle,
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

// ── Sub-componentes ───────────────────────────────────────────────────────────

function MazoCard({
  mazo,
  cantidadCartas,
  onSelect,
  onDelete,
}: {
  mazo: Mazo;
  cantidadCartas: number;
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
      whileHover={{ y: -2, boxShadow: "0 8px 24px color-mix(in srgb, var(--primary) 10%, transparent)" }}
    >
      {/* Color stripe */}
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

      <div className="flex items-center gap-2 mt-4">
        <Layers size={12} style={{ color: mazo.color ?? "var(--primary)" }} />
        <span className="text-micro font-black uppercase tracking-widest" style={{ color: mazo.color ?? "var(--primary)" }}>
          {cantidadCartas} carta{cantidadCartas !== 1 ? "s" : ""}
        </span>
      </div>
    </motion.div>
  );
}

function FlashCard({
  carta,
  total,
  index,
  onNext,
  onPrev,
  onShuffle,
}: {
  carta: Carta;
  total: number;
  index: number;
  onNext: () => void;
  onPrev: () => void;
  onShuffle: () => void;
}) {
  const [flipped, setFlipped] = useState(false);

  // Reset flip on card change
  useEffect(() => {
    setFlipped(false);
  }, [carta.id]);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto">
      {/* Progreso */}
      <div className="flex items-center gap-3 w-full">
        <span className="text-micro font-black uppercase tracking-widest text-primary/40">
          {index + 1} / {total}
        </span>
        <div className="flex-1 h-1 rounded-full" style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${((index + 1) / total) * 100}%`,
              background: "var(--primary)",
            }}
          />
        </div>
        <button
          className="text-primary/30 hover:text-primary transition-colors"
          onClick={onShuffle}
          title="Barajar"
        >
          <Shuffle size={14} />
        </button>
      </div>

      {/* Carta */}
      <div
        className="w-full cursor-pointer select-none"
        style={{ perspective: "1000px" }}
        onClick={() => setFlipped((f) => !f)}
      >
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.45, type: "spring", stiffness: 260, damping: 28 }}
          style={{ transformStyle: "preserve-3d", position: "relative", minHeight: 220 }}
        >
          {/* Frente */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center p-8 rounded-[var(--radius-card)] border"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              background: "var(--white-custom)",
              borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
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
              <p className="text-micro text-primary/40 mt-4 text-center italic">
                {carta.contexto}
              </p>
            )}
            <p className="text-micro text-primary/20 mt-6 uppercase tracking-widest">
              Toca para ver la definición
            </p>
          </div>

          {/* Reverso */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center p-8 rounded-[var(--radius-card)] border"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              background: "color-mix(in srgb, var(--primary) 6%, var(--white-custom))",
              borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <p className="text-micro font-black uppercase tracking-widest text-primary/30 mb-4">
              Definición
            </p>
            <p className="text-lg font-bold text-primary text-center leading-snug">
              {carta.reverso}
            </p>
            {carta.etiquetas?.length ? (
              <div className="flex flex-wrap gap-1.5 mt-4 justify-center">
                {carta.etiquetas.map((e) => (
                  <span
                    key={e}
                    className="text-micro font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                    style={{
                      background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                      color: "var(--primary)",
                    }}
                  >
                    {e}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </motion.div>
      </div>

      {/* Controles */}
      <div className="flex items-center gap-4">
        <button
          className="flex items-center justify-center w-10 h-10 rounded-full transition-all border"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
            color: index === 0 ? "color-mix(in srgb, var(--primary) 20%, transparent)" : "var(--primary)",
          }}
          disabled={index === 0}
          onClick={onPrev}
        >
          <ChevronLeft size={18} />
        </button>
        <button
          className="flex items-center justify-center px-5 py-2.5 rounded-[var(--radius-btn)] font-black text-micro uppercase tracking-widest transition-all"
          style={{
            background: "color-mix(in srgb, var(--primary) 8%, transparent)",
            color: "var(--primary)",
          }}
          onClick={() => setFlipped((f) => !f)}
        >
          <RotateCcw size={13} className="mr-2" />
          {flipped ? "Ver frente" : "Ver reverso"}
        </button>
        <button
          className="flex items-center justify-center w-10 h-10 rounded-full transition-all border"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
            color: index === total - 1 ? "color-mix(in srgb, var(--primary) 20%, transparent)" : "var(--primary)",
          }}
          disabled={index === total - 1}
          onClick={onNext}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function FlashCardsPage() {
  const { user } = useAuth() as { user: any };

  const [mazos, setMazos] = useState<Mazo[]>([]);
  const [cartas, setCartas] = useState<Record<string, Carta[]>>({});
  const [mazoActivo, setMazoActivo] = useState<Mazo | null>(null);
  const [cartasActivas, setCartasActivas] = useState<Carta[]>([]);
  const [indice, setIndice] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modal nuevo mazo
  const [showNuevoMazo, setShowNuevoMazo] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoDescripcion, setNuevoDescripcion] = useState("");
  const [nuevoColor, setNuevoColor] = useState(COLORES[0]);
  const [savingMazo, setSavingMazo] = useState(false);

  // Modal nueva carta
  const [showNuevaCarta, setShowNuevaCarta] = useState(false);
  const [nuevaFrente, setNuevaFrente] = useState("");
  const [nuevaReverso, setNuevaReverso] = useState("");
  const [nuevaContexto, setNuevaContexto] = useState("");
  const [savingCarta, setSavingCarta] = useState(false);

  // ── Carga de mazos ──────────────────────────────────────────────────────────

  const cargarMazos = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("flashcard_mazos")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setMazos(data as Mazo[]);
    setLoading(false);
  }, []);

  const cargarCartas = useCallback(async (mazoId: string) => {
    const { data } = await supabase
      .from("flashcard_cartas")
      .select("*")
      .eq("mazo_id", mazoId)
      .order("created_at", { ascending: true });
    if (data) {
      setCartas((prev) => ({ ...prev, [mazoId]: data as Carta[] }));
      return data as Carta[];
    }
    return [];
  }, []);

  useEffect(() => {
    cargarMazos();
  }, [cargarMazos]);

  // ── Seleccionar mazo ────────────────────────────────────────────────────────

  const seleccionarMazo = async (mazo: Mazo) => {
    setMazoActivo(mazo);
    setIndice(0);
    const cs = cartas[mazo.id] ?? (await cargarCartas(mazo.id));
    setCartasActivas(cs);
  };

  // ── Crear mazo ──────────────────────────────────────────────────────────────

  const crearMazo = async () => {
    if (!nuevoNombre.trim()) return;
    setSavingMazo(true);
    const { data } = await supabase
      .from("flashcard_mazos")
      .insert({
        nombre: nuevoNombre.trim(),
        descripcion: nuevoDescripcion.trim() || null,
        color: nuevoColor,
        user_id: user?.id,
      })
      .select()
      .single();
    if (data) {
      setMazos((prev) => [data as Mazo, ...prev]);
    }
    setNuevoNombre("");
    setNuevoDescripcion("");
    setNuevoColor(COLORES[0]);
    setShowNuevoMazo(false);
    setSavingMazo(false);
  };

  // ── Eliminar mazo ───────────────────────────────────────────────────────────

  const eliminarMazo = async (id: string) => {
    await supabase.from("flashcard_mazos").delete().eq("id", id);
    setMazos((prev) => prev.filter((m) => m.id !== id));
    if (mazoActivo?.id === id) {
      setMazoActivo(null);
      setCartasActivas([]);
    }
  };

  // ── Crear carta ─────────────────────────────────────────────────────────────

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
      const nuevas = [...cartasActivas, data as Carta];
      setCartasActivas(nuevas);
      setCartas((prev) => ({ ...prev, [mazoActivo.id]: nuevas }));
    }
    setNuevaFrente("");
    setNuevaReverso("");
    setNuevaContexto("");
    setShowNuevaCarta(false);
    setSavingCarta(false);
  };

  // ── Shuffle ─────────────────────────────────────────────────────────────────

  const barajar = () => {
    setCartasActivas((prev) => shuffle(prev));
    setIndice(0);
  };

  // ── Render: sin mazo seleccionado (lista de mazos) ──────────────────────────

  if (!mazoActivo) {
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
                Repasa tus palabras nuevas
              </p>
            </div>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-btn)] font-black text-micro uppercase tracking-widest transition-all"
              style={{
                background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                color: "var(--primary)",
              }}
              onClick={() => setShowNuevoMazo(true)}
            >
              <Plus size={13} />
              Nuevo mazo
            </button>
          </div>

          {/* Grid de mazos */}
          {loading ? (
            <div className="flex items-center justify-center py-20 text-primary/20 font-black uppercase tracking-widest text-micro">
              Cargando…
            </div>
          ) : mazos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <BookOpen size={32} style={{ color: "color-mix(in srgb, var(--primary) 20%, transparent)" }} />
              <p className="text-micro font-black uppercase tracking-widest text-primary/30">
                No hay mazos aún. ¡Crea el primero!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {mazos.map((m) => (
                  <MazoCard
                    key={m.id}
                    mazo={m}
                    cantidadCartas={cartas[m.id]?.length ?? 0}
                    onSelect={() => seleccionarMazo(m)}
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
                style={{ background: "color-mix(in srgb, var(--primary) 20%, transparent)", backdropFilter: "blur(6px)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowNuevoMazo(false)}
              />
              <motion.div
                className="relative z-10 w-full max-w-sm rounded-[var(--radius-card)] p-7 border"
                style={{
                  background: "var(--white-custom)",
                  borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
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
                    className="w-full px-3 py-2 rounded-[var(--radius-btn)] border font-bold text-sm bg-transparent text-primary placeholder-primary/30 outline-none focus:border-primary/40 transition-colors"
                    style={{ borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)" }}
                    placeholder="Nombre del mazo"
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && crearMazo()}
                    autoFocus
                  />
                  <textarea
                    className="w-full px-3 py-2 rounded-[var(--radius-btn)] border font-bold text-sm bg-transparent text-primary placeholder-primary/30 outline-none focus:border-primary/40 transition-colors resize-none"
                    style={{ borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)" }}
                    placeholder="Descripción (opcional)"
                    rows={2}
                    value={nuevoDescripcion}
                    onChange={(e) => setNuevoDescripcion(e.target.value)}
                  />

                  {/* Color picker */}
                  <div>
                    <p className="text-micro font-black uppercase tracking-widest text-primary/40 mb-2">Color</p>
                    <div className="flex gap-2 flex-wrap">
                      {COLORES.map((c) => (
                        <button
                          key={c}
                          className="w-7 h-7 rounded-full transition-all border-2"
                          style={{
                            background: c,
                            borderColor: nuevoColor === c ? "var(--primary)" : "transparent",
                            transform: nuevoColor === c ? "scale(1.15)" : "scale(1)",
                          }}
                          onClick={() => setNuevoColor(c)}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <button
                    className="flex-1 px-4 py-2 rounded-[var(--radius-btn)] font-black text-micro uppercase tracking-widest transition-all border"
                    style={{
                      borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
                      color: "color-mix(in srgb, var(--primary) 50%, transparent)",
                    }}
                    onClick={() => setShowNuevoMazo(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    className="flex-1 px-4 py-2 rounded-[var(--radius-btn)] font-black text-micro uppercase tracking-widest transition-all"
                    style={{
                      background: nuevoNombre.trim() ? "var(--primary)" : "color-mix(in srgb, var(--primary) 20%, transparent)",
                      color: nuevoNombre.trim() ? "var(--btn-text)" : "color-mix(in srgb, var(--primary) 40%, transparent)",
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

  // ── Render: mazo seleccionado (estudiar) ────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
      <div className="flex-1 p-6 md:p-8 max-w-2xl mx-auto w-full flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            className="flex items-center gap-2 font-black text-micro uppercase tracking-widest italic transition-colors group"
            style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
            onClick={() => { setMazoActivo(null); setIndice(0); }}
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
            Mazos
          </button>
          <div className="text-right">
            <p className="font-black text-sm uppercase tracking-widest text-primary">
              {mazoActivo.nombre}
            </p>
            {mazoActivo.descripcion && (
              <p className="text-micro text-primary/40">{mazoActivo.descripcion}</p>
            )}
          </div>
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

        {/* Contenido */}
        {cartasActivas.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 py-20">
            <Layers size={32} style={{ color: "color-mix(in srgb, var(--primary) 20%, transparent)" }} />
            <p className="text-micro font-black uppercase tracking-widest text-primary/30 text-center">
              Este mazo no tiene cartas.
              <br />
              ¡Agrega la primera!
            </p>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-btn)] font-black text-micro uppercase tracking-widest transition-all"
              style={{
                background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                color: "var(--primary)",
              }}
              onClick={() => setShowNuevaCarta(true)}
            >
              <Plus size={13} />
              Nueva carta
            </button>
          </div>
        ) : (
          <FlashCard
            carta={cartasActivas[indice]}
            total={cartasActivas.length}
            index={indice}
            onNext={() => setIndice((i) => Math.min(i + 1, cartasActivas.length - 1))}
            onPrev={() => setIndice((i) => Math.max(i - 1, 0))}
            onShuffle={barajar}
          />
        )}
      </div>

      {/* Modal nueva carta */}
      <AnimatePresence>
        {showNuevaCarta && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              className="absolute inset-0"
              style={{ background: "color-mix(in srgb, var(--primary) 20%, transparent)", backdropFilter: "blur(6px)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNuevaCarta(false)}
            />
            <motion.div
              className="relative z-10 w-full max-w-sm rounded-[var(--radius-card)] p-7 border"
              style={{
                background: "var(--white-custom)",
                borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
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
                  className="w-full px-3 py-2 rounded-[var(--radius-btn)] border font-bold text-sm bg-transparent text-primary placeholder-primary/30 outline-none focus:border-primary/40 transition-colors"
                  style={{ borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)" }}
                  placeholder="Frente (palabra)"
                  value={nuevaFrente}
                  onChange={(e) => setNuevaFrente(e.target.value)}
                  autoFocus
                />
                <textarea
                  className="w-full px-3 py-2 rounded-[var(--radius-btn)] border font-bold text-sm bg-transparent text-primary placeholder-primary/30 outline-none focus:border-primary/40 transition-colors resize-none"
                  style={{ borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)" }}
                  placeholder="Reverso (definición)"
                  rows={3}
                  value={nuevaReverso}
                  onChange={(e) => setNuevaReverso(e.target.value)}
                />
                <input
                  className="w-full px-3 py-2 rounded-[var(--radius-btn)] border font-bold text-sm bg-transparent text-primary placeholder-primary/30 outline-none focus:border-primary/40 transition-colors"
                  style={{ borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)" }}
                  placeholder="Contexto (libro / fuente)"
                  value={nuevaContexto}
                  onChange={(e) => setNuevaContexto(e.target.value)}
                />
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  className="flex-1 px-4 py-2 rounded-[var(--radius-btn)] font-black text-micro uppercase tracking-widest transition-all border"
                  style={{
                    borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
                    color: "color-mix(in srgb, var(--primary) 50%, transparent)",
                  }}
                  onClick={() => setShowNuevaCarta(false)}
                >
                  Cancelar
                </button>
                <button
                  className="flex-1 px-4 py-2 rounded-[var(--radius-btn)] font-black text-micro uppercase tracking-widest transition-all"
                  style={{
                    background: (nuevaFrente.trim() && nuevaReverso.trim()) ? "var(--primary)" : "color-mix(in srgb, var(--primary) 20%, transparent)",
                    color: (nuevaFrente.trim() && nuevaReverso.trim()) ? "var(--btn-text)" : "color-mix(in srgb, var(--primary) 40%, transparent)",
                  }}
                  disabled={!nuevaFrente.trim() || !nuevaReverso.trim() || savingCarta}
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
