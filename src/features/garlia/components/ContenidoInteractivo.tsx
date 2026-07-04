"use client";
import { motion } from "framer-motion";
import React, { useState, useEffect, useRef, useCallback } from "react";

import type {
  Segment} from "@/features/editorGarlia/components/editorCapitulos/snippets/type";
import {
  parseContenido,
  parseSections,
} from "@/features/editorGarlia/components/editorCapitulos/snippets/type";

import {
  CitaVisual,
  ImgInline,
  FloatWord,
  SoundInline,
  DropWord,
  ChoiceButton,
  UseWord,
  UseWordPortal,
} from "./SegmentRenderers";

/* ─────────────────────────────────────────────
   Markdown inline — bold, italic, code, etc.
   ───────────────────────────────────────────── */
function applyInlineMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/~~(.+?)~~/g, "<del>$1</del>")
    .replace(/==(.+?)==/g, '<mark class="md-mark">$1</mark>');
}

/* Renderiza texto respetando saltos de línea simples como párrafos */
function TextoMarkdown({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const paragraphs = value.split("\n");
  return (
    <>
      {paragraphs.map((para, pi) => {
        if (para.trim() === "") {
          return (
            <p key={pi} aria-hidden style={{ margin: 0, minHeight: "1em" }} />
          );
        }
        return (
          <p
            dangerouslySetInnerHTML={{ __html: applyInlineMarkdown(para) }}
            key={pi}
            className={className}
            style={{ margin: "0 0 0.6em 0" }}
          />
        );
      })}
    </>
  );
}

/* ─────────────────────────────────────────────
   Drop cap animado
   ───────────────────────────────────────────── */
function AnimatedDropCap({ char, rest }: { char: string; rest: string }) {
  return (
    <>
      <motion.span
        animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
        className="float-left font-black text-primary leading-none mr-3"
        initial={{ opacity: 0, filter: "blur(8px)", scale: 1.15 }}
        style={{
          fontFamily: "var(--font-literata), Georgia, serif",
          fontSize: "clamp(2.8rem, 7vw, 3.6rem)",
          marginTop: "0.12em",
          lineHeight: 0.85,
        }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      >
        {char}
      </motion.span>
      <motion.span
        animate={{ opacity: 1 }}
        initial={{ opacity: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
      >
        <TextoMarkdown value={rest} />
      </motion.span>
    </>
  );
}

/* ─────────────────────────────────────────────
   GateBlock
   ───────────────────────────────────────────── */
function GateBlock({
  itemId,
  tieneSegs,
  noTieneSegs,
  onNavigate,
}: {
  itemId: string;
  tieneSegs: Segment[];
  noTieneSegs: Segment[];
  onNavigate: (id: string) => void;
}) {
  const [tiene, setTiene] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { supabase } = await import("@/lib/api/client/supabase");
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from("descubrimientos_items")
        .select("id")
        .eq("item_id", itemId)
        .eq("perfil_id", user.id)
        .maybeSingle();
      if (!cancelled) setTiene(!!data);
    })();
    return () => {
      cancelled = true;
    };
  }, [itemId]);

  if (tiene === null) return null;

  const segs = tiene ? tieneSegs : noTieneSegs;
  return <RenderSegmentos segs={segs} onNavigate={onNavigate} />;
}

/* ─────────────────────────────────────────────
   Separador visual entre secciones
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
   RenderSegmentos
   ───────────────────────────────────────────── */
export function RenderSegmentos({
  segs,
  onNavigate,
  isFirst = false,
  esExtra = false,
}: {
  segs: Segment[];
  onNavigate: (id: string) => void;
  isFirst?: boolean;
  esExtra?: boolean;
}) {
  return (
    <>
      {segs.map((seg, i) => {
        const isFirstText =
          isFirst && !esExtra && i === 0 && seg.type === "text";

        if (seg.type === "text") {
          if (isFirstText && seg.value.length > 0) {
            const firstChar = seg.value.charAt(0);
            // Si el siguiente char es \n, lo saltamos para no romper el primer párrafo
            const afterFirst = seg.value.slice(1);
            const restText = afterFirst.startsWith("\n")
              ? afterFirst.slice(1)
              : afterFirst;
            return (
              <span key={i}>
                <AnimatedDropCap char={firstChar} rest={restText} />
              </span>
            );
          }
          return <TextoMarkdown key={i} value={seg.value} />;
        }

        if (seg.type === "cita")
          return <CitaVisual key={i} content={seg.content} />;
        if (seg.type === "img")
          return <ImgInline key={i} caption={seg.caption} url={seg.url} />;
        if (seg.type === "float")
          return (
            <FloatWord
              key={i}
              caption={seg.caption}
              url={seg.url}
              word={seg.word}
            />
          );
        if (seg.type === "sound")
          return <SoundInline key={i} url={seg.url} volume={seg.volume} />;
        if (seg.type === "drop")
          return (
            <DropWord
              key={i}
              entidadId={seg.entidadId}
              entidadNombre={seg.entidadNombre}
              tipo={seg.entidadTipo}
              word={seg.word}
            />
          );
        if (seg.type === "choice")
          return (
            <ChoiceButton
              key={i}
              label={seg.label}
              onSelect={() => onNavigate(seg.target)}
            />
          );
        if (seg.type === "use")
          return (
            <UseWord
              key={i}
              itemId={seg.itemId}
              targetFail={seg.targetFail}
              targetSuccess={seg.targetSuccess}
              word={seg.word}
              onNavigate={onNavigate}
            />
          );
        if (seg.type === "gate")
          return (
            <GateBlock
              key={i}
              itemId={seg.itemId}
              noTieneSegs={seg.noTieneSegs}
              tieneSegs={seg.tieneSegs}
              onNavigate={onNavigate}
            />
          );

        return null;
      })}
    </>
  );
}

/* ─────────────────────────────────────────────
   Sección revelada con animación
   ───────────────────────────────────────────── */
function RevealedSection({
  id,
  segs,
  onNavigate,
}: {
  id: string;
  segs: Segment[];
  onNavigate: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(
      () => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      50,
    );
  }, []);

  return (
    <motion.div
      key={id}
      ref={ref}
      animate={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: 20 }}
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
  texto: string;
  onNavigate: (capId: string) => void;
  esExtra?: boolean;
}) {
  const allSegs = parseContenido(texto);
  const sectionMap = parseSections(allSegs);

  const [revealed, setRevealed] = useState<string[]>([]);

  useEffect(() => {
    setRevealed([]);
  }, [texto]);

  const handleNavigate = useCallback(
    (target: string) => {
      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          target,
        );
      const isLocalSection = !isUUID && sectionMap[target] !== undefined;

      if (isLocalSection) {
        setRevealed((prev) =>
          prev.includes(target) ? prev : [...prev, target],
        );
      } else {
        onNavigate(target);
      }
    },
    [sectionMap, onNavigate],
  );

  return (
    <div
      className="text-primary-dark/90 lector-texto"
      style={{
        fontSize: "clamp(1rem, 2.5vw, 1.125rem)",
        lineHeight: 1.85,
        letterSpacing: "0.01em",
        fontFeatureSettings: '"kern" 1, "liga" 1, "onum" 1',
      }}
    >
      <UseWordPortal />

      <RenderSegmentos
        isFirst
        esExtra={esExtra}
        segs={sectionMap[""]}
        onNavigate={handleNavigate}
      />

      {revealed.map((id) => (
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
