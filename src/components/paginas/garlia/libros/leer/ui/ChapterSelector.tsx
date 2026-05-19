"use client";
import { MotionDiv, MotionMain, MotionH1, MotionH2, MotionButton, MotionLi, MotionSpan, MotionP, MotionSection, MotionArticle, MotionImg } from "@/components/ui/Motion";
import React, { useState, useEffect, useRef } from "react";
import { BookOpen, ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { CapituloLista } from "../type";

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

  const capActual = lista.find(c => c.id === capIdActual);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)} className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-btn)] border border-primary/15 bg-primary/5 hover:bg-primary/10 transition-all text-primary text-[10px] font-black uppercase tracking-widest">
        <BookOpen size={13} /> Cap. {capActual?.orden ?? "—"} <ChevronDown size={12} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <MotionDiv initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.15 }} className="absolute left-0 top-full mt-2 w-64 bg-white-custom border border-primary/10 rounded-[var(--radius-btn)] shadow-2xl z-50 overflow-hidden">
            <div className="max-h-72 overflow-y-auto">
              {lista.map(cap => {
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
