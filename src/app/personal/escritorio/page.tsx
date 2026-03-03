"use client";
import React from "react";
import { CheckSquare, ScrollText, Monitor } from "lucide-react";
import { motion } from "framer-motion";
import { MenuCard } from "@/shared/templates/MenuCard";

export default function EscritorioMenuPage() {
  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center p-4 md:p-10 py-24">
      <div className="max-w-7xl w-full">

        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16 md:mb-24"
        >
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black uppercase tracking-tighter text-primary italic">
            Escritorio
          </h1>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 lg:gap-10">
          <MenuCard href="/personal/tareas"  title="Tareas"  icon={<CheckSquare />} delay={0.1} />
          <MenuCard href="/personal/ensayos" title="Ensayos" icon={<ScrollText />}  delay={0.2} />
        </div>

      </div>
    </div>
  );
}