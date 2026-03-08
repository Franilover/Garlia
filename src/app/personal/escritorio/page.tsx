"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { CheckSquare, Calendar, FileText, ChevronLeft, ChevronRight } from "lucide-react";

import { GestionPersonal } from "@/paginas/personal/tareas";
import EnsayosView from "@/paginas/personal/ensayos";

const PANELS = [
  { id: "personal",    label: "Personal",   icon: CheckSquare },
  { id: "calendario",  label: "Calendario", icon: Calendar    },
  { id: "ensayos",     label: "Ensayos",    icon: FileText    },
];

// GestionPersonal ya tiene reloj+tareas+calendario juntos.
// Si quieres separarlos en dos paneles distintos, tendrías que refactorizar
// GestionPersonal para exportar sus partes por separado.
// Por ahora: panel 0 = GestionPersonal completo, panel 1 = Ensayos.

const PANELS_SIMPLE = [
  { id: "agenda",   label: "Agenda",   icon: Calendar    },
  { id: "ensayos",  label: "Ensayos",  icon: FileText    },
];

export default function DashboardPage() {
  const [panelActivo, setPanelActivo] = useState(0);
  const [direction, setDirection] = useState(0);

  const irA = (idx: number) => {
    if (idx === panelActivo) return;
    setDirection(idx > panelActivo ? 1 : -1);
    setPanelActivo(idx);
  };

  const variants = {
    enter:  (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0   }),
    center:              ()  => ({ x: 0,                          opacity: 1   }),
    exit:   (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0   }),
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col">

      {/* ── NAV ── */}
      <nav
        className="shrink-0 flex items-center justify-between px-8 py-4 border-b z-50 backdrop-blur-md"
        style={{
          background: "color-mix(in srgb, var(--white-custom) 85%, transparent)",
          borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
        }}
      >

        {/* Título */}
        <span
          className="font-black italic text-sm uppercase tracking-tight select-none"
          style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}
        >
          Dashboard
        </span>

        {/* Pills */}
        <div
          className="flex items-center gap-1 rounded-2xl p-1"
          style={{ background: "color-mix(in srgb, var(--primary) 7%, transparent)" }}
        >
          {PANELS_SIMPLE.map((p, i) => {
            const Icon = p.icon;
            const isActive = panelActivo === i;
            return (
              <button
                key={p.id}
                onClick={() => irA(i)}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                style={isActive ? {
                  background: "var(--primary)",
                  color: "var(--btn-text)",
                  boxShadow: "0 4px 12px color-mix(in srgb, var(--primary) 20%, transparent)",
                } : {
                  color: "color-mix(in srgb, var(--primary) 45%, transparent)",
                }}
                onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.color = "var(--primary)"; (e.currentTarget as HTMLElement).style.background = "var(--white-custom)"; } }}
                onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--primary) 45%, transparent)"; (e.currentTarget as HTMLElement).style.background = "transparent"; } }}
              >
                <Icon size={12} />
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Flechas + dots */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => irA(panelActivo - 1)}
            disabled={panelActivo === 0}
            className="p-1.5 rounded-xl transition-all disabled:opacity-20 disabled:cursor-not-allowed"
            style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--primary)"; (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 8%, transparent)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--primary) 35%, transparent)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex gap-1.5 items-center">
            {PANELS_SIMPLE.map((_, i) => (
              <button
                key={i}
                onClick={() => irA(i)}
                className="rounded-full transition-all"
                style={{
                  width: panelActivo === i ? "20px" : "6px",
                  height: "6px",
                  background: panelActivo === i
                    ? "var(--primary)"
                    : "color-mix(in srgb, var(--primary) 25%, transparent)",
                }}
              />
            ))}
          </div>

          <button
            onClick={() => irA(panelActivo + 1)}
            disabled={panelActivo === PANELS_SIMPLE.length - 1}
            className="p-1.5 rounded-xl transition-all disabled:opacity-20 disabled:cursor-not-allowed"
            style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--primary)"; (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 8%, transparent)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--primary) 35%, transparent)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </nav>

      {/* ── PANELES ── */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={panelActivo}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 280, damping: 32 }}
            className="absolute inset-0 overflow-y-auto"
          >

            {panelActivo === 0 && (
              <main className="max-w-7xl mx-auto p-4 md:p-8 mt-6 pb-32">
                <GestionPersonal />
              </main>
            )}

            {panelActivo === 1 && (
              <EnsayosView />
            )}

          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}