"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Segment, SectionMap, parseContenido, parseSections } from "../snippets/type";
import {
  CitaVisual, ImgInline, FloatWord, SoundInline,
  DropWord, ChoiceButton, UseWord, UseWordPortal,
} from "./SegmentRenderers";
import { renderMarkdown } from "@/components/forms/MarkdownEditor";

/* ─────────────────────────────────────────────
   Drop cap animado — la primera letra "aparece
   como tinta empapando el papel"
   ───────────────────────────────────────────── */
function AnimatedDropCap({ char, rest }: { char: string; rest: string }) {
  return (
    <span>
      <motion.span
        className="float-left font-black text-primary leading-none mr-3"
        style={{
          fontFamily: "var(--font-literata), Georgia, serif",
          fontSize: "clamp(4.5rem, 12vw, 6rem)",
          marginTop: "0.18em",
          lineHeight: 0.82,
        }}
        initial={{ opacity: 0, filter: "blur(8px)", scale: 1.15 }}
        animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      >
        {char}
      </motion.span>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
      >
        {rest}
      </motion.span>
    </span>
  );
}

/* ─────────────────────────────────────────────
   Texto con markdown inline.
   Usamos dangerouslySetInnerHTML con el HTML
   que devuelve renderMarkdown, pero dentro de
   un <span> para no romper el flujo de texto.
   ───────────────────────────────────────────── */
function TextoMarkdown({ value, className }: { value: string; className?: string }) {
  const html = renderMarkdown(value);
  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/* ─────────────────────────────────────────────
   GateBlock — consulta el inventario del lector
   y renderiza inline los segs correctos.
   Es transparente: el lector ve el texto sin
   saber que hay una bifurcación.
   ───────────────────────────────────────────── */
function GateBlock({
  itemId,
  tieneSegs,
  noTieneSegs,
  onNavigate,
}: {
  itemId:      string;
  tieneSegs:   Segment[];
  noTieneSegs: Segment[];
  onNavigate:  (id: string) => void;
}) {
  const [tiene, setTiene] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { supabase } = await import("@/lib/api/client/supabase");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from("descubrimientos_items")
        .select("id")
        .eq("item_id", itemId)
        .eq("perfil_id", user.id)
        .maybeSingle();
      if (!cancelled) setTiene(!!data);
    })();
    return () => { cancelled = true; };
  }, [itemId]);

  // Mientras carga, no renderizamos nada para evitar flash
  if (tiene === null) return null;

  const segs = tiene ? tieneSegs : noTieneSegs;
  return (
    <RenderSegmentos segs={segs} onNavigate={onNavigate} />
  );
}

/* ─────────────────────────────────────────────
   Separador visual entre secciones reveladas
   ───────────────────────────────────────────── */
function SectionDivider({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 my-8">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      {label && (
        <span className="text-[9px] font-black uppercase tracking-widest text-primary/20 italic">
          {label}
        </span>
      )}
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
    </div>
  );
}

/* ─────────────────────────────────────────────
   RenderSegmentos — renderiza una lista de
   segmentos. Ahora:
   - "text" pasa por renderMarkdown (negritas,
     cursivas, etc.)
   - "gate" usa GateBlock transparente
   - "choice" desaparece al elegir (marca como
     usado via onReveal)
   ───────────────────────────────────────────── */
export function RenderSegmentos({
  segs,
  onNavigate,
  isFirst    = false,
  esExtra    = false,
}: {
  segs:        Segment[];
  onNavigate:  (id: string) => void;
  isFirst?:    boolean;
  esExtra?:    boolean;
}) {
  return (
    <>
      {segs.map((seg, i) => {
        const isFirstText = isFirst && !esExtra && i === 0 && seg.type === "text";

        if (seg.type === "text") {
          if (isFirstText && seg.value.length > 0) {
            const firstChar = seg.value.charAt(0);
            const restText  = seg.value.slice(1);
            return (
              <span key={i}>
                <AnimatedDropCap char={firstChar} rest={restText} />
              </span>
            );
          }
          // Texto normal con soporte markdown
          return <TextoMarkdown key={i} value={seg.value} />;
        }

        if (seg.type === "cita")   return <CitaVisual  key={i} content={seg.content} />;
        if (seg.type === "img")    return <ImgInline   key={i} url={seg.url} caption={seg.caption} />;
        if (seg.type === "float")  return <FloatWord   key={i} word={seg.word} url={seg.url} caption={seg.caption} />;
        if (seg.type === "sound")  return <SoundInline key={i} url={seg.url} volume={seg.volume} />;
        if (seg.type === "drop")   return (
          <DropWord key={i} word={seg.word} tipo={seg.entidadTipo}
            entidadId={seg.entidadId} entidadNombre={seg.entidadNombre} />
        );
        if (seg.type === "choice") return (
          <ChoiceButton key={i} label={seg.label} onSelect={() => onNavigate(seg.target)} />
        );
        if (seg.type === "use")    return (
          <UseWord key={i} word={seg.word} itemId={seg.itemId}
            targetSuccess={seg.targetSuccess} targetFail={seg.targetFail} onNavigate={onNavigate} />
        );
        if (seg.type === "gate")   return (
          <GateBlock key={i} itemId={seg.itemId}
            tieneSegs={seg.tieneSegs} noTieneSegs={seg.noTieneSegs} onNavigate={onNavigate} />
        );

        return null;
      })}
    </>
  );
}

/* ─────────────────────────────────────────────
   Bloque de sección revelada con animación de
   entrada. Una vez revelada no desaparece —
   el texto se acumula como en un libro real.
   ───────────────────────────────────────────── */
function RevealedSection({
  id,
  segs,
  onNavigate,
}: {
  id:         string;
  segs:       Segment[];
  onNavigate: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll suave al aparecer
    setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }, []);

  return (
    <motion.div
      ref={ref}
      key={id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <SectionDivider label={id} />
      <RenderSegmentos segs={segs} onNavigate={onNavigate} />
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Componente principal
   ───────────────────────────────────────────── */
export function ContenidoInteractivo({
  texto,
  onNavigate,
  esExtra = false,
}: {
  texto:      string;
  onNavigate: (capId: string) => void;
  esExtra?:   boolean;
}) {
  const allSegs    = parseContenido(texto);
  const sectionMap = parseSections(allSegs);

  // Set ordenado de secciones reveladas (en orden de revelación)
  const [revealed, setRevealed] = useState<string[]>([]);

  // Reset al cambiar el capítulo
  useEffect(() => { setRevealed([]); }, [texto]);

  const handleNavigate = useCallback((target: string) => {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target);
    const isLocalSection = !isUUID && sectionMap[target] !== undefined;

    if (isLocalSection) {
      // Acumular — si ya está revelada no la duplicamos
      setRevealed(prev => prev.includes(target) ? prev : [...prev, target]);
    } else {
      onNavigate(target);
    }
  }, [sectionMap, onNavigate]);

  return (
    <div
      className="text-primary-dark/90 lector-texto"
      style={{
        fontSize:           "clamp(1rem, 2.5vw, 1.125rem)",
        lineHeight:         1.85,
        letterSpacing:      "0.01em",
        fontFeatureSettings: '"kern" 1, "liga" 1, "onum" 1',
      }}
    >
      {/* Bug 6 fix: UseWordPortal montado UNA vez — evita N ToastContainer/ConfirmModal
          cuando hay múltiples segmentos "use" en el mismo capítulo */}
      <UseWordPortal />

      {/* Contenido raíz — siempre visible */}
      <RenderSegmentos
        segs={sectionMap[""]}
        onNavigate={handleNavigate}
        isFirst
        esExtra={esExtra}
      />

      {/* Secciones reveladas — se acumulan debajo en orden de elección */}
      {revealed.map(id => (
        <RevealedSection
          key={id}
          id={id}
          segs={sectionMap[id] ?? []}
          onNavigate={handleNavigate}
        />
      ))}
    </div>
  );
}