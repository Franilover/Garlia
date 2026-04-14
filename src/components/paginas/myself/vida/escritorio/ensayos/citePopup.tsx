"use client";
import React from "react";
import { MotionDiv } from '@/components/ui/Motion';
import { ZoteroSource } from "@/components/paginas/myself/vida/escritorio/ensayos/page";

interface CitePopupProps {
  sources:     ZoteroSource[];
  query:       string;
  position:    { top: number; left: number };
  onSelect:    (source: ZoteroSource) => void;
  onClose:     () => void;
  activeIndex: number;
}

export function CitePopup({ sources, query, position, onSelect, onClose, activeIndex }: CitePopupProps) {
  const filtered = sources
    .filter(s =>
      !query ||
      s.citekey?.toLowerCase().includes(query.toLowerCase()) ||
      s.title.toLowerCase().includes(query.toLowerCase()) ||
      s.author.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 8);

  if (filtered.length === 0) return null;

  return (
    <MotionDiv
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.97 }}
      transition={{ duration: 0.12 }}
      className="absolute z-50 flex flex-col overflow-hidden"
      style={{
        top: position.top,
        left: position.left,
        minWidth: 280,
        maxWidth: 360,
        background: "var(--white-custom)",
        border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
        borderRadius: "var(--radius-card)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
      }}
    >
      <div className="px-3 py-1.5 border-b"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
        <p className="font-mono text-[8px] uppercase tracking-[0.25em]"
          style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
          Citar fuente · {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>
      {filtered.map((src, i) => {
        const isActive = i === activeIndex;
        const key = src.citekey || `${src.author}-${src.year}-${i}`;
        return (
          <button
            key={key}
            onMouseDown={(e) => { e.preventDefault(); onSelect(src); }}
            className="flex flex-col px-3 py-2.5 text-left transition-all w-full"
            style={{
              background: isActive ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent",
              borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
            }}
          >
            <span className="text-[11px] font-medium truncate" style={{ color: "var(--primary)" }}>
              {src.title}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-[9px]" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
                {src.author}{src.year ? ` · ${src.year}` : ""}
              </span>
              {src.citekey && (
                <span className="font-mono text-[9px] px-1.5 py-0.5"
                  style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)", borderRadius: 4 }}>
                  @{src.citekey}
                </span>
              )}
            </div>
          </button>
        );
      })}
      <div className="px-3 py-1.5 border-t"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 6%, transparent)" }}>
        <p className="font-mono text-[8px]" style={{ color: "color-mix(in srgb, var(--primary) 20%, transparent)" }}>
          ↑↓ navegar · Enter seleccionar · Esc cerrar
        </p>
      </div>
    </MotionDiv>
  );
}