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

// ─── RenderSegmentos ──────────────────────────────────────────────────────────

export function RenderSegmentos({ segs, onNavigate, isFirst = false }: {
  segs: Segment[];
  onNavigate: (id: string) => void;
  isFirst?: boolean;
}) {
  return (
    <>
      {segs.map((seg, i) => {
        const firstText = isFirst && i === 0;
        if (seg.type === "text")   return <span key={i} className={cn("whitespace-pre-line", firstText && "first-letter:text-7xl first-letter:font-black first-letter:text-primary first-letter:mr-4 first-letter:float-left first-letter:mt-3")}>{seg.value}</span>;
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

// ─── ContenidoInteractivo ─────────────────────────────────────────────────────

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

  const handleBack = () => setHistory(prev => prev.length > 1 ? prev.slice(0, -1) : prev);
  const currentId   = history[history.length - 1];
  const currentSegs = sectionMap[currentId] ?? sectionMap[""] ?? [];
  const canGoBack   = history.length > 1;

  return (
    <div className="text-lg md:text-xl leading-[2.2] text-primary-dark/90 font-serif">
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
