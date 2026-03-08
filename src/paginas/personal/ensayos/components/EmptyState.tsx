"use client";
import React from "react";
import { PenTool, Plus } from "lucide-react";
import { motion } from "framer-motion";

interface EmptyStateProps {
  onCrearEnsayo?: () => void;
}

export function EmptyState({ onCrearEnsayo }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center min-h-[70vh] text-center gap-5"
      style={{
        border: "2px dashed color-mix(in srgb, var(--primary) 15%, transparent)",
        borderRadius: "var(--radius-card)",
        background: "color-mix(in srgb, var(--white-custom) 40%, transparent)",
      }}
    >
      <div className="w-16 h-16 flex items-center justify-center"
        style={{
          borderRadius: "var(--radius-btn)",
          background: "color-mix(in srgb, var(--primary) 5%, transparent)",
          border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
          color: "color-mix(in srgb, var(--primary) 30%, transparent)",
        }}
      >
        <PenTool size={26} />
      </div>
      <div>
        <p className="font-serif italic text-xl"
          style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}
        >
          Selecciona una nota
        </p>
        <p className="font-mono text-[10px] uppercase tracking-widest mt-1.5"
          style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
        >
          o crea una nueva
        </p>
      </div>
      {onCrearEnsayo && (
        <button
          onClick={onCrearEnsayo}
          className="flex items-center gap-2 px-5 py-2.5 text-[10px] font-mono uppercase tracking-wide transition-all"
          style={{
            background: "var(--primary)",
            color: "var(--btn-text)",
            borderRadius: "var(--radius-btn)",
          }}
        >
          <Plus size={13} /> Nueva nota
        </button>
      )}
    </motion.div>
  );
}

export default EmptyState;