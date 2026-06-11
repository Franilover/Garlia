"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { List, X, ChevronRight as ChevronR, BookOpen, ChevronDown, Check } from "lucide-react";
import { MotionDiv } from "@/components/ui/Motion";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { BtnIcon } from "@/components/ui";
import { CapituloLista, CapituloScrollItem } from "@/features/myself/garlia/editorCapitulos/snippets/type";

/* ─────────────────────────────────────────────
   Skeleton de carga
   ───────────────────────────────────────────── */
export function LectorSkeleton() {
  return (
    <div className="min-h-screen bg-bg-main pb-24 animate-pulse">
      <div className="sticky top-0 z-50 bg-bg-main/80 backdrop-blur-md border-b border-primary/5 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div className="w-6 h-6 rounded-[var(--radius-input)] bg-primary/10" />
          <div className="flex flex-col items-center gap-2">
            <div className="h-2 w-24 rounded-full bg-primary/10" />
            <div className="h-6 w-32 rounded-[var(--radius-btn)] bg-primary/10" />
          </div>
          <div className="w-6 h-6 rounded-[var(--radius-input)] bg-primary/10" />
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-6 py-12 md:py-20">
        <div className="space-y-4">
          {[100, 85, 95, 70, 90, 60, 80, 75].map((w, i) => (
            <div key={i} className="h-4 rounded-full bg-primary/8" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Progress bar de lectura — barra finísima al top
   ───────────────────────────────────────────── */
export function ReadingProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setProgress(Math.min(pct, 100));
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] h-[2px] pointer-events-none"
      style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}
    >
      <div
        className="h-full transition-[width] duration-75 ease-out"
        style={{
          width: `${progress}%`,
          background: "linear-gradient(to right, var(--accent), var(--primary))",
          boxShadow: "0 0 8px color-mix(in srgb, var(--accent) 60%, transparent)",
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Vignette — sombra perimetral tipo pergamino
   ───────────────────────────────────────────── */
export function Vignette() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[45]"
      style={{
        background: `radial-gradient(ellipse at center, transparent 50%, var(--bg-main) 100%)`,
        opacity: 0.55,
      }}
    />
  );
}

/* ─────────────────────────────────────────────
   Ornamento de número de capítulo
   ───────────────────────────────────────────── */
const ROMAN = [
  "", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
  "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX",
  "XXI", "XXII", "XXIII", "XXIV", "XXV", "XXX", "XL", "L", "LX", "LXX", "LXXX", "XC", "C",
];

function toRoman(n: number): string {
  if (n >= 1 && n <= ROMAN.length - 1) return ROMAN[n];
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];
  let result = "";
  let num = n;
  for (let i = 0; i < vals.length; i++) {
    while (num >= vals[i]) { result += syms[i]; num -= vals[i]; }
  }
  return result;
}

export function CapituloHeader({ orden, titulo }: { orden: number; titulo?: string }) {
  const roman = toRoman(orden);

  return (
    <header className="mb-14 mt-4 relative select-none">
      {/* Número romano enorme como watermark */}
      <div
        className="absolute -top-6 left-1/2 -translate-x-1/2 font-serif font-black pointer-events-none leading-none"
        style={{
          fontSize: "clamp(5rem, 20vw, 9rem)",
          color: "color-mix(in srgb, var(--primary) 5%, transparent)",
          letterSpacing: "-0.04em",
          userSelect: "none",
        }}
        aria-hidden
      >
        {roman}
      </div>

      {/* Línea superior con rombo */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, transparent, color-mix(in srgb, var(--primary) 25%, transparent))" }} />
        <span className="text-[8px] font-black uppercase tracking-[0.4em]" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
          ◆
        </span>
        <div className="flex-1 h-px" style={{ background: "linear-gradient(to left, transparent, color-mix(in srgb, var(--primary) 25%, transparent))" }} />
      </div>

      {/* Etiqueta "Capítulo N" */}
      <p
        className="text-center font-black uppercase mb-3"
        style={{
          fontSize: "0.6rem",
          letterSpacing: "0.5em",
          color: "color-mix(in srgb, var(--primary) 40%, transparent)",
        }}
      >
        Capítulo {roman}
      </p>

      {/* Título principal */}
      {titulo && (
        <h1
          className="text-center font-serif italic leading-tight"
          style={{
            fontSize: "clamp(1.4rem, 4vw, 2rem)",
            color: "var(--primary)",
            letterSpacing: "-0.02em",
          }}
        >
          {titulo}
        </h1>
      )}

      {/* Ornamento inferior */}
      <div className="flex items-center justify-center gap-2 mt-6">
        <div className="h-px w-12" style={{ background: "color-mix(in srgb, var(--primary) 20%, transparent)" }} />
        <span className="font-serif text-sm" style={{ color: "color-mix(in srgb, var(--accent) 70%, transparent)" }}>❧</span>
        <div className="h-px w-12" style={{ background: "color-mix(in srgb, var(--primary) 20%, transparent)" }} />
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────
   Separador ornamentado al final de cada capítulo
   Las líneas "se dibujan" desde el centro hacia afuera
   cuando el elemento entra en viewport
   ───────────────────────────────────────────── */
export function FinCapituloSeparador({ cap, onVisible, ocultar = false }: {
  cap: CapituloScrollItem;
  onVisible: () => void;
  ocultar?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const firedRef = useRef(false);
  const onVisibleRef = useRef(onVisible);
  const [visible, setVisible] = useState(false);

  // Mantener ref actualizada sincrónicamente para que el observer llame siempre
  // a la versión más reciente sin recrear el observer.
  onVisibleRef.current = onVisible;

  // Reset si cambia el capítulo (el mismo componente puede reutilizarse en modo extra)
  const capIdRef = useRef(cap.id);
  if (capIdRef.current !== cap.id) {
    capIdRef.current = cap.id;
    firedRef.current = false;
    // No resetear `visible` aquí — está en render, se maneja en el efecto de abajo
  }

  useEffect(() => {
    // Resetear animación si el cap cambió (modo extra)
    setVisible(false);
    firedRef.current = false;
  }, [cap.id]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let observer: IntersectionObserver | null = null;

    const montar = () => {
      const scrollContainer = document.getElementById("lector-scroll-container");
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisible(true);
            if (!firedRef.current) {
              firedRef.current = true;
              onVisibleRef.current();
            }
          }
        },
        {
          root: scrollContainer ?? null,
          threshold: 0.1,
          rootMargin: "0px 0px -20px 0px",
        }
      );
      observer.observe(el);
    };

    // Si el container aún no está en el DOM, esperar un tick antes de montar
    if (document.getElementById("lector-scroll-container")) {
      montar();
    } else {
      const t = setTimeout(montar, 100);
      return () => { clearTimeout(t); observer?.disconnect(); };
    }

    return () => observer?.disconnect();
  }, [cap.id]); // se recrea si cambia el cap (modo extra)

  return (
    <div ref={ref} className="mt-20 mb-4 flex flex-col items-center gap-3" style={{ minHeight: "20px", visibility: ocultar ? "hidden" : undefined, height: ocultar ? 0 : undefined, marginTop: ocultar ? 0 : undefined, overflow: ocultar ? "hidden" : undefined }}>
      <div className="flex items-center gap-4 w-full max-w-xs">
        <motion.div
          className="flex-1 h-px"
          style={{ background: "linear-gradient(to right, transparent, color-mix(in srgb, var(--primary) 20%, transparent))" }}
          initial={{ scaleX: 0, originX: 0 }}
          animate={visible ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
        />
        <motion.span
          className="font-serif text-sm select-none"
          style={{ color: "color-mix(in srgb, var(--accent) 70%, transparent)" }}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={visible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.35 }}
        >
          ❧
        </motion.span>
        <motion.div
          className="flex-1 h-px"
          style={{ background: "linear-gradient(to left, transparent, color-mix(in srgb, var(--primary) 20%, transparent))" }}
          initial={{ scaleX: 0, originX: 1 }}
          animate={visible ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Panel lateral de índice de capítulos
   ───────────────────────────────────────────── */
export function IndexPanel({ open, onClose, lista, capIdActual, libroTitulo, onSelect }: {
  open: boolean;
  onClose: () => void;
  lista: CapituloLista[];
  capIdActual: string;
  libroTitulo?: string;
  onSelect: (id: string) => void;
}) {
  const capActualRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => capActualRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }), 120);
  }, [open]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[60] bg-primary-dark/30 backdrop-blur-sm" />
          <MotionDiv initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 32, stiffness: 320 }} className="fixed right-0 top-0 bottom-0 z-[61] w-full max-w-sm bg-bg-main shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-primary/8 shrink-0">
              <div>
                {libroTitulo && <p className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35 italic mb-0.5">{libroTitulo}</p>}
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2"><List size={13} /> Índice</h3>
              </div>
              <BtnIcon variant="ghost" onClick={onClose} className="border-none text-primary/40"><X size={15} /></BtnIcon>
            </div>
            <div className="flex-1 overflow-y-auto py-3 px-3">
              {lista.map((cap) => {
                const esActual = cap.id === capIdActual;
                return (
                  <button key={cap.id} ref={esActual ? capActualRef : undefined} onClick={() => { onSelect(cap.id); onClose(); }}
                    className={cn("w-full flex items-center gap-4 px-4 py-3.5 rounded-[var(--radius-btn)] text-left transition-all mb-1", esActual ? "bg-primary text-white" : "hover:bg-primary/6 text-primary-dark")}
                  >
                    <span className={cn("text-[10px] font-black w-6 shrink-0 text-center tabular-nums", esActual ? "text-white/60" : "text-primary/40")}>{cap.orden}</span>
                    <div className="flex-1 min-w-0">
                      <span className={cn("block text-[12px] font-bold leading-snug uppercase tracking-tight truncate", esActual ? "text-white" : "text-primary-dark")}>
                        {cap.titulo_capitulo || `Capítulo ${cap.orden}`}
                      </span>
                    </div>
                    {esActual ? <span className="w-1.5 h-1.5 rounded-full bg-white-custom/60 shrink-0" /> : <ChevronR size={13} className="text-primary/20 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </MotionDiv>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────
   Selector de capítulo compacto (dropdown en header)
   ───────────────────────────────────────────── */
export function ChapterSelector({ lista, capIdActual, onSelect }: {
  lista: CapituloLista[];
  capIdActual: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const capActual = lista.find((c) => c.id === capIdActual);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-btn)] border border-primary/15 bg-primary/5 hover:bg-primary/10 transition-all text-primary text-[10px] font-black uppercase tracking-widest">
        <BookOpen size={13} /> Cap. {capActual?.orden ?? "—"} <ChevronDown size={12} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <MotionDiv initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.15 }} className="absolute left-0 top-full mt-2 w-64 bg-white-custom border border-primary/10 rounded-[var(--radius-btn)] shadow-2xl z-50 overflow-hidden">
            <div className="max-h-72 overflow-y-auto">
              {lista.map((cap) => {
                const esActual = cap.id === capIdActual;
                return (
                  <button key={cap.id} onClick={() => { onSelect(cap.id); setOpen(false); }}
                    className={cn("w-full flex items-center gap-3 px-4 py-3 text-left transition-all", esActual ? "bg-primary/8 text-primary" : "hover:bg-primary/5 text-primary-dark/80")}
                  >
                    <span className="text-[10px] font-black text-primary/40 w-6 shrink-0">{cap.orden}</span>
                    <span className="text-xs font-semibold truncate flex-1">{cap.titulo_capitulo ?? `Capítulo ${cap.orden}`}</span>
                    {esActual && <Check size={12} className="text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}