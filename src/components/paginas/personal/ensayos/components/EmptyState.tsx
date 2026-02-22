"use client";
import React from "react";
import { PenTool } from "lucide-react";
import { motion } from "framer-motion";

export function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center min-h-[70vh]
                 border-2 border-dashed border-primary/15 rounded-4xl text-center gap-4
                 bg-primary/5"
    >
      <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/15
                      flex items-center justify-center text-primary/40">
        <PenTool size={26} />
      </div>
      <div>
        <p className="font-serif italic text-primary/60 text-xl">Selecciona una nota</p>
        <p className="font-mono text-[10px] text-primary/25 uppercase tracking-widest mt-1.5">
          o crea una nueva con el botón +
        </p>
      </div>
    </motion.div>
  );
}

export default EmptyState;