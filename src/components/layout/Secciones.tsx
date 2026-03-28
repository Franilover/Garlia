"use client";

import React, { useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";

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
  storageKey?: string;
}

const navStyle: React.CSSProperties = {
  background: "color-mix(in srgb, var(--bg-main) 80%, transparent)",
  borderBottom: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
};

const pillsWrapperStyle: React.CSSProperties = {
  background: "color-mix(in srgb, var(--primary) 7%, transparent)",
  borderRadius: "var(--radius-card)",
  padding: "4px",
  border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
  display: "flex",
  alignItems: "center",
  gap: "2px",
};

const activePillStyle: React.CSSProperties = {
  background: "var(--primary)",
  color: "var(--btn-text)",
  boxShadow: "0 4px 14px color-mix(in srgb, var(--primary) 25%, transparent)",
  borderRadius: "var(--radius-btn)",
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
  borderRadius: "var(--radius-btn)",
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
  borderRadius: "var(--radius-btn)",
  color: "color-mix(in srgb, var(--primary) 35%, transparent)",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  transition: "all 0.15s ease",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

function readStoredIndex(key: string | undefined, fallback: number, max: number): number {
  if (!key || typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 && n < max ? n : fallback;
  } catch {
    return fallback;
  }
}

export function PanelSlider({
  panels,
  title,
  defaultPanel = 0,
  showArrows = false,
  showDots = false,
  contentClassName = "",
  storageKey,
}: PanelSliderProps) {
  const [active, setActive] = useState(() =>
    readStoredIndex(storageKey, defaultPanel, panels.length)
  );
  const [direction, setDirection] = useState(0);

  // Reaccionar a cambios en ?panel= desde el navbar (sin reload)
  const searchParams = useSearchParams();
  const panelParam = searchParams?.get("panel");
  useEffect(() => {
    if (!panelParam) return;
    const idx = panels.findIndex(p => p.id === panelParam);
    if (idx !== -1 && idx !== active) goTo(idx);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelParam]);
  const [hoveredPill, setHoveredPill] = useState<number | null>(null);
  const [hoveredArrow, setHoveredArrow] = useState<"left" | "right" | null>(null);

  const goTo = useCallback((idx: number) => {
    if (idx === active || idx < 0 || idx >= panels.length) return;
    setDirection(idx > active ? 1 : -1);
    setActive(idx);
    if (storageKey) {
      try { localStorage.setItem(storageKey, String(idx)); } catch {}
    }
  }, [active, panels.length, storageKey]);

  
  const wheelCooldown = useRef(false);
  const handleWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
    if (Math.abs(e.deltaX) < 30) return;
    if (wheelCooldown.current) return;
    wheelCooldown.current = true;
    setTimeout(() => { wheelCooldown.current = false; }, 600);
    if (e.deltaX > 0) goTo(active + 1);
    else              goTo(active - 1);
  };

  
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) goTo(active + 1);
      else        goTo(active - 1);
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const variants = {
    enter:  (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
    center:              () => ({ x: 0, opacity: 1 }),
    exit:   (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  return (
    
    
    <div style={{ width: "100%", display: "flex", flexDirection: "column" }} className="h-[calc(100svh-64px)] md:h-svh">

      {}
      <nav style={{ ...navStyle, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 32px", position: "relative", zIndex: 50 }}>

        {}
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
                  ...(isHovered ? { color: "var(--primary)", background: "var(--white-custom)" } : {}),
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

        {}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", position: "absolute", right: "32px", top: "50%", transform: "translateY(-50%)" }}>
          {showArrows && (
            <button
              onClick={() => goTo(active - 1)}
              disabled={active === 0}
              style={{
                ...arrowStyle,
                opacity: active === 0 ? 0.2 : 1,
                cursor: active === 0 ? "not-allowed" : "pointer",
                ...(hoveredArrow === "left" && active > 0 ? { color: "var(--primary)", background: "color-mix(in srgb, var(--primary) 8%, transparent)" } : {}),
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
                    background: active === i ? "var(--primary)" : "color-mix(in srgb, var(--primary) 25%, transparent)",
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
                ...(hoveredArrow === "right" && active < panels.length - 1 ? { color: "var(--primary)", background: "color-mix(in srgb, var(--primary) 8%, transparent)" } : {}),
              }}
              onMouseEnter={() => setHoveredArrow("right")}
              onMouseLeave={() => setHoveredArrow(null)}
            >
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </nav>

      {}
      <div
        style={{ flex: 1, position: "relative", overflow: "hidden" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
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
export { default as Secciones } from "@/components/layout/Secciones";