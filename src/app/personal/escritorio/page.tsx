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
      <nav className="shrink-0 flex items-center justify-between px-8 py-4 border-b border-primary/8 bg-white/90 backdrop-blur-md z-50">

        {/* Título */}
        <span className="font-black italic text-primary/50 text-sm uppercase tracking-tight select-none">
          Dashboard
        </span>

        {/* Pills */}
        <div className="flex items-center gap-1 bg-primary/5 rounded-2xl p-1">
          {PANELS_SIMPLE.map((p, i) => {
            const Icon = p.icon;
            return (
              <button
                key={p.id}
                onClick={() => irA(i)}
                className={cn(
                  "flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                  panelActivo === i
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "text-primary/40 hover:text-primary hover:bg-white"
                )}
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
            className="p-1.5 rounded-xl hover:bg-primary/8 text-primary/30 hover:text-primary transition-all disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex gap-1.5 items-center">
            {PANELS_SIMPLE.map((_, i) => (
              <button
                key={i}
                onClick={() => irA(i)}
                className={cn(
                  "rounded-full transition-all",
                  panelActivo === i
                    ? "w-5 h-1.5 bg-primary"
                    : "w-1.5 h-1.5 bg-primary/20 hover:bg-primary/40"
                )}
              />
            ))}
          </div>

          <button
            onClick={() => irA(panelActivo + 1)}
            disabled={panelActivo === PANELS_SIMPLE.length - 1}
            className="p-1.5 rounded-xl hover:bg-primary/8 text-primary/30 hover:text-primary transition-all disabled:opacity-20 disabled:cursor-not-allowed"
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