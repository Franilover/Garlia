"use client";
import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BtnIcon } from "@/components/ui";

export function FloatWord({ word, url, caption }: { word: string; url: string; caption?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleClick = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ x: rect.left + rect.width / 2, y: rect.top + window.scrollY });
    }
    setOpen(v => !v);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  return (
    <>
      <button ref={btnRef} onClick={handleClick} className="relative inline font-serif cursor-pointer group">
        <span style={{ backgroundImage: "linear-gradient(var(--accent), var(--accent))", backgroundRepeat: "no-repeat", backgroundSize: "100% 1px", backgroundPosition: "0 100%", paddingBottom: "1px" }}>{word}</span>
        <span className="absolute -top-1.5 -right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--accent)]/60 group-hover:bg-[var(--accent)] transition-colors" />
      </button>
      <AnimatePresence>
        {open && pos && (
          <>
            <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className="fixed inset-0 z-[55]" />
            <MotionDiv
              initial={{ opacity: 0, scale: 0.85, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.88, y: 8 }}
              transition={{ type: "spring", damping: 24, stiffness: 340 }}
              className="fixed z-[56] pointer-events-auto"
              style={{ left: Math.min(Math.max(pos.x - 160, 12), (typeof window !== "undefined" ? window.innerWidth : 800) - 332), top: Math.max(pos.y - 280 - window.scrollY, 12), width: 320 }}
            >
              <div className="rounded-[var(--radius-btn)] overflow-hidden shadow-2xl" style={{ boxShadow: "0 24px 64px rgba(44,38,46,0.22), 0 4px 16px rgba(44,38,46,0.12)" }}>
                <div className="relative">
                  <img src={url} alt={caption ?? word} className="w-full object-cover" style={{ maxHeight: 260 }} />
                  <BtnIcon onClick={() => setOpen(false)}><X size={13} /></BtnIcon>
                </div>
                {caption && <div className="bg-white-custom px-4 py-3"><p className="text-[10px] font-black uppercase tracking-widest text-primary/50 text-center">{caption}</p></div>}
              </div>
              <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-0 h-0" style={{ borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: caption ? "8px solid white" : "8px solid var(--foreground)" }} />
            </MotionDiv>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
