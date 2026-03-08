"use client";


import React, { useState, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";

// ─── TIPOS ────────────────────────────────────────────────────────────────────
export interface Panel {
  id: string;
  label: string;
  icon?: LucideIcon;
  content: ReactNode;
}

export interface PanelSliderProps {
  panels: Panel[];
  title?: string;
  defaultPanel?: number;
  showArrows?: boolean;
  showDots?: boolean;
  contentClassName?: string;
}

// ─── HELPERS DE ESTILO (100% CSS vars, tema-aware) ───────────────────────────
const navStyle: React.CSSProperties = {
  background: "color-mix(in srgb, var(--white-custom) 85%, transparent)",
  borderBottom: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
};

const pillsWrapperStyle: React.CSSProperties = {
  background: "color-mix(in srgb, var(--primary) 7%, transparent)",
  borderRadius: "1rem",
  padding: "4px",
  display: "flex",
  alignItems: "center",
  gap: "2px",
};

const activePillStyle: React.CSSProperties = {
  background: "var(--primary)",
  color: "var(--btn-text)",
  boxShadow: "0 4px 14px color-mix(in srgb, var(--primary) 25%, transparent)",
  borderRadius: "0.75rem",
  padding: "6px 20px",
  fontSize: "10px",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  transition: "all 0.2s ease",
  cursor: "pointer",
  border: "none",
};

const inactivePillStyle: React.CSSProperties = {
  background: "transparent",
  color: "color-mix(in srgb, var(--primary) 45%, transparent)",
  borderRadius: "0.75rem",
  padding: "6px 20px",
  fontSize: "10px",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  transition: "all 0.2s ease",
  cursor: "pointer",
  border: "none",
};

const arrowStyle: React.CSSProperties = {
  padding: "6px",
  borderRadius: "0.75rem",
  color: "color-mix(in srgb, var(--primary) 35%, transparent)",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  transition: "all 0.15s ease",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

// ─── COMPONENTE ───────────────────────────────────────────────────────────────
export function PanelSlider({
  panels,
  title,
  defaultPanel = 0,
  showArrows = true,
  showDots = true,
  contentClassName = "",
}: PanelSliderProps) {
  const [active, setActive] = useState(defaultPanel);
  const [direction, setDirection] = useState(0);
  const [hoveredPill, setHoveredPill] = useState<number | null>(null);
  const [hoveredArrow, setHoveredArrow] = useState<"left" | "right" | null>(null);

  const goTo = useCallback((idx: number) => {
    if (idx === active || idx < 0 || idx >= panels.length) return;
    setDirection(idx > active ? 1 : -1);
    setActive(idx);
  }, [active, panels.length]);

  const variants = {
    enter:  (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
    center:              () => ({ x: 0, opacity: 1 }),
    exit:   (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  return (
    <div style={{ height: "100vh", width: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>

      {/* ── NAV ── */}
      <nav style={{ ...navStyle, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 32px", zIndex: 50 }}>

        {/* Título opcional */}
        <span style={{
          fontWeight: 900,
          fontStyle: "italic",
          fontSize: "13px",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "color-mix(in srgb, var(--primary) 45%, transparent)",
          userSelect: "none",
          minWidth: "80px",
        }}>
          {title ?? ""}
        </span>

        {/* Pills */}
        <div style={pillsWrapperStyle}>
          {panels.map((p, i) => {
            const Icon = p.icon;
            const isActive = active === i;
            const isHovered = hoveredPill === i;
            return (
              <button
                key={p.id}
                onClick={() => goTo(i)}
                style={isActive ? activePillStyle : {
                  ...inactivePillStyle,
                  ...(isHovered ? {
                    color: "var(--primary)",
                    background: "var(--white-custom)",
                  } : {}),
                }}
                onMouseEnter={() => setHoveredPill(i)}
                onMouseLeave={() => setHoveredPill(null)}
              >
                {Icon && <Icon size={11} />}
                <span className="hidden sm:inline">{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* Flechas + dots */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: "80px", justifyContent: "flex-end" }}>

          {showArrows && (
            <button
              onClick={() => goTo(active - 1)}
              disabled={active === 0}
              style={{
                ...arrowStyle,
                opacity: active === 0 ? 0.2 : 1,
                cursor: active === 0 ? "not-allowed" : "pointer",
                ...(hoveredArrow === "left" && active > 0 ? {
                  color: "var(--primary)",
                  background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                } : {}),
              }}
              onMouseEnter={() => setHoveredArrow("left")}
              onMouseLeave={() => setHoveredArrow(null)}
            >
              <ChevronLeft size={16} />
            </button>
          )}

          {showDots && (
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              {panels.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  style={{
                    borderRadius: "9999px",
                    height: "6px",
                    width: active === i ? "20px" : "6px",
                    background: active === i
                      ? "var(--primary)"
                      : "color-mix(in srgb, var(--primary) 25%, transparent)",
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.25s ease",
                    padding: 0,
                  }}
                />
              ))}
            </div>
          )}

          {showArrows && (
            <button
              onClick={() => goTo(active + 1)}
              disabled={active === panels.length - 1}
              style={{
                ...arrowStyle,
                opacity: active === panels.length - 1 ? 0.2 : 1,
                cursor: active === panels.length - 1 ? "not-allowed" : "pointer",
                ...(hoveredArrow === "right" && active < panels.length - 1 ? {
                  color: "var(--primary)",
                  background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                } : {}),
              }}
              onMouseEnter={() => setHoveredArrow("right")}
              onMouseLeave={() => setHoveredArrow(null)}
            >
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </nav>

      {/* ── CONTENIDO ── */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={active}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 280, damping: 32 }}
            style={{ position: "absolute", inset: 0, overflowY: "auto" }}
            className={contentClassName}
          >
            {panels[active]?.content}
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}

export default PanelSlider;
export { default as Secciones } from "@/shared/layout/Secciones"; 