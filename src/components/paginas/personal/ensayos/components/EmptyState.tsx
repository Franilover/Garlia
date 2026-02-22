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
                 border-2 border-dashed border-[#4a3d50]/15 rounded-4xl text-center gap-4
                 bg-white/40"
    >
      <div className="w-16 h-16 rounded-2xl bg-[#4a3d50]/5 border border-[#4a3d50]/10
                      flex items-center justify-center text-[#4a3d50]/30">
        <PenTool size={26} />
      </div>
      <div>
        <p className="font-serif italic text-[#4a3d50]/50 text-xl">Selecciona una nota</p>
        <p className="font-mono text-[10px] text-[#4a3d50]/30 uppercase tracking-widest mt-1.5">
          o crea una nueva con el botón +
        </p>
      </div>
    </motion.div>
  );
}

export default EmptyState;