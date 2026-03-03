"use client";
import React from "react";
import { UtensilsCrossed, Carrot, Dumbbell, CookingPot } from "lucide-react";
import { motion } from "framer-motion";
import { MenuCard } from "@/shared/templates/MenuCard";

export default function CocinaMenuPage() {
  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center p-4 md:p-10 py-24">
      <div className="max-w-7xl w-full">

        {/* Título */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16 md:mb-24"
        >
          <div className="inline-flex p-4 bg-primary/5 text-primary rounded-[25px] mb-6">
            <CookingPot size={40} />
          </div>
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black uppercase tracking-tighter text-primary italic">
            Cocina
          </h1>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 lg:gap-10">
          <MenuCard href="/personal/cocina/recetas"      title="Recetas"      icon={<UtensilsCrossed />} delay={0.1} />
          <MenuCard href="/personal/cocina/ingredientes" title="Ingredientes" icon={<Carrot />}          delay={0.2} />
          <MenuCard href="/personal/cocina/ejercicios"   title="Ejercicios"   icon={<Dumbbell />}        delay={0.3} />
        </div>
      </div>
    </div>
  );
}