"use client";
import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChefHat, Utensils, ArrowRight, CookingPot } from "lucide-react";

export default function CocinaMenuPage() {
  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        
        {/* --- TÍTULO DE LA SECCIÓN --- */}
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

        {/* --- BOTONES DE SELECCIÓN --- */}
        <div className="grid md:grid-cols-2 gap-8">
          
          {/* Opción: RECETAS */}
          <MenuCard 
            href="/personal/paginas/cocina/recetas"
            title="Recetas"
             icon={<ChefHat size={42} />}
            delay={0.1}
          />

          {/* Opción: INGREDIENTES */}
          <MenuCard 
            href="/personal/paginas/cocina/ingredientes"
            title="Ingredientes"
            icon={<Utensils size={42} />}
            delay={0.2}
          />

        </div>

        {/* --- BOTÓN VOLVER --- */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-16 text-center"
        >
          <Link 
            href="/personal/paginas" 
            className="text-[10px] font-black uppercase tracking-widest text-primary/30 hover:text-primary transition-colors border-b border-transparent hover:border-primary"
          >
            Volver al Wiki Principal
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

/* --- COMPONENTE INTERNO: CARD DE MENÚ --- */
const MenuCard = ({ href, title, icon, delay }: any) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay }}
  >
    <Link href={href} className="group block relative">
      <div className="bg-white border-2 border-primary/5 rounded-[40px] p-10 h-full transition-all duration-500 group-hover:border-primary group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] group-hover:-translate-y-2">
        
        {/* Icono con círculo flotante */}
        <div className="w-20 h-20 bg-primary/5 text-primary rounded-[30px] flex items-center justify-center mb-8 transition-colors group-hover:bg-primary group-hover:text-white">
          {icon}
        </div>
        
        <h2 className="text-3xl font-black uppercase tracking-tighter text-primary mb-4 flex items-center gap-3">
          {title}
          <ArrowRight className="opacity-0 -translate-x-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" size={24} />
        </h2>
        {/* Decoración fondo */}
        <div className="absolute bottom-6 right-8 text-primary/5 font-black text-6xl select-none group-hover:text-primary/10 transition-colors">
          {title[0]}
        </div>
      </div>
    </Link>
  </motion.div>
);