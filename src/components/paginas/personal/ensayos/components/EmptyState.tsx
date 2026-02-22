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
                 border-2 border-dashed border-primary/10 rounded-[2rem] text-center gap-4"
    >
      <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center
                      justify-center text-primary/30">
        <PenTool size={28} />
      </div>
      <div>
        <p className="font-serif italic text-primary/50 text-xl">Selecciona una nota</p>
        <p className="font-mono text-[10px] text-primary/25 uppercase tracking-widest mt-1">
          o crea una nueva con el botón +
        </p>
      </div>
    </motion.div>
  );
}

export default EmptyState;