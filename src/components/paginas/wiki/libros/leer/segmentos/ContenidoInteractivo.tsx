"use client";
import { MotionDiv, MotionMain, MotionH1, MotionH2, MotionButton, MotionLi, MotionSpan, MotionP, MotionSection, MotionArticle, MotionImg } from "@/components/ui/Motion";
import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { DropWord } from "@/components/ui/DropWord";
import { Segment, SectionMap, parseContenido, parseSections } from "../type";
import { CitaVisual }   from "./CitaVisual";
import { ImgInline }    from "./ImgInline";
import { FloatWord }    from "./FloatWord";
import { SoundInline }  from "./SoundInline";
import { ChoiceButton, UseWord } from "./Interactivos";

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
   Renderizado de segmentos con drop cap en el
   primer párrafo
   ───────────────────────────────────────────── */
export function RenderSegmentos({ segs, onNavigate, isFirst = false }: {
  segs: Segment[];
  onNavigate: (id: string) => void;
  isFirst?: boolean;
}) {
  return (
    <>
      {segs.map((seg, i) => {
        const isFirstText = isFirst && i === 0 && seg.type === "text";

        if (seg.type === "text") {
          if (isFirstText && seg.value.length > 0) {
            // Separar primera letra del resto
            const firstChar = seg.value.charAt(0);
            const restText  = seg.value.slice(1);
            return (
              <span key={i} className="whitespace-pre-line">
                <AnimatedDropCap char={firstChar} rest={restText} />
              </span>
            );
          }
          return <span key={i} className="whitespace-pre-line">{seg.value}</span>;
        }

        if (seg.type === "cita")   return <CitaVisual key={i} content={seg.content} />;
        if (seg.type === "img")    return <ImgInline key={i} url={seg.url} caption={seg.caption} />;
        if (seg.type === "float")  return <FloatWord key={i} word={seg.word} url={seg.url} caption={seg.caption} />;
        if (seg.type === "sound")  return <SoundInline key={i} url={seg.url} volume={seg.volume} />;
        if (seg.type === "drop")   return <DropWord key={i} word={seg.word} tipo={seg.entidadTipo} entidadId={seg.entidadId} entidadNombre={seg.entidadNombre} />;
        if (seg.type === "choice") return <ChoiceButton key={i} label={seg.label} onSelect={() => onNavigate(seg.target)} />;
        if (seg.type === "use")    return <UseWord key={i} word={seg.word} itemId={seg.itemId} targetSuccess={seg.targetSuccess} targetFail={seg.targetFail} onNavigate={onNavigate} />;
        return null;
      })}
    </>
  );
}

/* ─────────────────────────────────────────────
   Componente principal
   ───────────────────────────────────────────── */
export function ContenidoInteractivo({ texto, onNavigate }: {
  texto: string;
  onNavigate: (capId: string) => void;
}) {
  const allSegs     = parseContenido(texto);
  const sectionMap  = parseSections(allSegs);
  const hasSections = Object.keys(sectionMap).length > 1;

  const [history, setHistory] = useState<string[]>([""]);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setHistory([""]); }, [texto]);

  const handleNavigate = (target: string) => {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target);
    const isLocalSection = hasSections && !isUUID && sectionMap[target] !== undefined;
    if (isLocalSection) {
      setHistory(prev => [...prev, target]);
      setTimeout(() => sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } else {
      onNavigate(target);
    }
  };

  const handleBack  = () => setHistory(prev => prev.length > 1 ? prev.slice(0, -1) : prev);
  const currentId   = history[history.length - 1];
  const currentSegs = sectionMap[currentId] ?? sectionMap[""] ?? [];
  const canGoBack   = history.length > 1;

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
      <RenderSegmentos segs={sectionMap[""]} onNavigate={handleNavigate} isFirst />

      <AnimatePresence mode="wait">
        {currentId !== "" && (
          <MotionDiv
            key={currentId} ref={sectionRef}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="mt-2"
          >
            <div className="flex items-center gap-3 my-8">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
              <div className="flex items-center gap-2">
                {canGoBack && (
                  <button onClick={handleBack} className="text-[9px] font-black uppercase tracking-widest text-primary/30 hover:text-primary transition-colors flex items-center gap-1">
                    <ChevronLeft size={10} /> volver
                  </button>
                )}
                <span className="text-[9px] font-black uppercase tracking-widest text-primary/20 italic">
                  {history.filter(h => h !== "").join(" › ")}
                </span>
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            </div>
            <RenderSegmentos segs={currentSegs} onNavigate={handleNavigate} />
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}