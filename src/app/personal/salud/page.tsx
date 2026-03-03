"use client";
import React from "react";
import { ChefHat, Utensils, CookingPot } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { MenuCard } from "@/shared/templates/MenuCard"; 

export default function CocinaMenuPage() {
  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">

        {/* Título */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex p-4 bg-primary/5 text-primary rounded-[25px] mb-6">
            <CookingPot size={40} />
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tighter text-primary italic">
            Cocina
          </h1>
        </motion.div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-8">
          <MenuCard href="/personal/salud/recetas"      title="Recetas"      icon={<ChefHat />}  delay={0.1} />
          <MenuCard href="/personal/salud/ingredientes" title="Ingredientes" icon={<Utensils />} delay={0.2} /> 
          <MenuCard href="/personal/salud/ejercicios" title="Ejercicios" icon={<Utensils />} delay={0.2} />
        
        </div>
      </div>
    </div>
  );
}