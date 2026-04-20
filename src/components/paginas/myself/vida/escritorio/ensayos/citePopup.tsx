"use client";
import React from "react";
import { MotionDiv } from '@/components/ui/Motion';
import { ZoteroSource } from "@/components/paginas/myself/vida/escritorio/ensayos/page";
import { Book } from "lucide-react";

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
      initial={{ opacity: 0, y: 5, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 5, scale: 0.98 }}
      transition={{ duration: 0.1 }}
      className="flex flex-col overflow-hidden shadow-2xl"
      style={{
        minWidth: 280,
        maxWidth: 400,
        background: "var(--white-custom)",
        border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
        borderRadius: "var(--radius-card)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="px-3 py-2 border-b flex items-center gap-2" 
           style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
        <Book size={12} style={{ color: "var(--accent)" }} />
        <span className="font-mono text-[9px] uppercase tracking-widest opacity-50">
          Citar fuente de Zotero
        </span>
      </div>

      <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
        {filtered.map((src, i) => {
          const isActive = i === activeIndex;
          return (
            <button
              key={src.citekey || i}
              onMouseDown={(e) => {
                e.preventDefault(); 
                onSelect(src);
              }}
              className="flex flex-col px-4 py-3 text-left transition-colors w-full relative"
              style={{
                background: isActive ? "color-mix(in srgb, var(--primary) 5%, transparent)" : "transparent",
              }}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: "var(--accent)" }} />
              )}
              
              <span className="text-[11px] font-medium leading-tight mb-1" style={{ color: "var(--primary)" }}>
                {src.title}
              </span>
              
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] opacity-60" style={{ color: "var(--primary)" }}>
                  {src.author} {src.year ? `(${src.year})` : ""}
                </span>
                {src.citekey && (
                  <span className="font-mono text-[8px] px-1.5 py-0.5"
                    style={{ 
                      background: "color-mix(in srgb, var(--accent) 10%, transparent)", 
                      color: "var(--accent)", 
                      borderRadius: 4 
                    }}>
                    @{src.citekey}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="px-3 py-1.5 bg-neutral-50/50 border-t flex justify-between"
        style={{ 
          borderColor: "color-mix(in srgb, var(--primary) 6%, transparent)",
          background: "color-mix(in srgb, var(--primary) 2%, transparent)"
        }}>
        <p className="font-mono text-[8px] opacity-40 uppercase">
          ↑↓ para navegar · enter para insertar
        </p>
      </div>
    </MotionDiv>
  );
}