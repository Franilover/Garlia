"use client";
import React from "react";
import { MotionDiv } from "@/components/ui/Motion";
import { ZoteroSource } from "@/components/paginas/myself/vida/escritorio/ensayos/page";

interface CitePopupProps {
  sources: ZoteroSource[];
  query: string;
  position: { top: number; left: number };
  onSelect: (source: ZoteroSource) => void;
  onClose: () => void;
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

  const monoStyle: React.CSSProperties = { fontFamily: "var(--font-mono)" };

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.98 }}
      transition={{ duration: 0.1 }}
      style={{
        minWidth: 300,
        maxWidth: 420,
        background: "#111",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", ...monoStyle, textTransform: "uppercase", letterSpacing: "0.15em" }}>
          @ zotero · {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Results */}
      <div style={{ maxHeight: 280, overflowY: "auto" }}>
        {filtered.map((src, i) => {
          const isActive = i === activeIndex;
          return (
            <button
              key={src.citekey || i}
              onMouseDown={e => { e.preventDefault(); onSelect(src); }}
              className="w-full text-left"
              style={{
                display: "block",
                padding: "8px 12px",
                background: isActive ? "rgba(255,255,255,0.06)" : "transparent",
                borderLeft: `2px solid ${isActive ? "rgba(255,150,50,0.7)" : "transparent"}`,
                border: "none",
                cursor: "pointer",
                transition: "background 0.08s",
              }}
            >
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", ...monoStyle, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {src.title}
              </p>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", ...monoStyle }}>
                  {src.author}{src.year ? ` · ${src.year}` : ""}
                </span>
                {src.citekey && (
                  <span
                    style={{
                      fontSize: 8,
                      padding: "1px 5px",
                      borderRadius: 3,
                      background: "rgba(255,150,50,0.1)",
                      border: "1px solid rgba(255,150,50,0.2)",
                      color: "rgba(255,150,50,0.7)",
                      ...monoStyle,
                    }}
                  >
                    @{src.citekey}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer hint */}
      <div
        className="px-3 py-1.5"
        style={{ borderTop: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.02)" }}
      >
        <span style={{ fontSize: 8, color: "rgba(255,255,255,0.15)", ...monoStyle }}>
          ↑↓ navegar · enter insertar · esc cancelar
        </span>
      </div>
    </MotionDiv>
  );
}