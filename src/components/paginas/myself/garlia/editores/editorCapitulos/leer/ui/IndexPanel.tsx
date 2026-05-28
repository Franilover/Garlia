"use client";
import { MotionDiv, MotionMain, MotionH1, MotionH2, MotionButton, MotionLi, MotionSpan, MotionP, MotionSection, MotionArticle, MotionImg } from "@/components/ui/Motion";
import React, { useEffect, useRef } from "react";
import { List, X, ChevronRight as ChevronR } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { BtnIcon } from "@/components/ui";
import { CapituloLista } from "../../snippets/type";

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
