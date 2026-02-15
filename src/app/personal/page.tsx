"use client";
import React from "react";
import { motion } from "framer-motion";
import { Smile, ImageIcon, Camera, ArrowRight, UserCircle } from "lucide-react";
import Link from "next/link";

export default function PersonalMenuPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-main via-bg-main to-primary/5 flex items-center justify-center p-6 py-20 relative overflow-hidden">
      
      {/* Patrón decorativo de fondo */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary rounded-full blur-3xl" />
      </div>

      <div className="max-w-5xl w-full relative z-10">
        
        {/* --- HEADER MEJORADO --- */}
        <motion.div 
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-20"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex p-5 bg-gradient-to-br from-primary/10 to-primary/5 text-primary rounded-3xl mb-8 shadow-lg"
          >
            <UserCircle size={48} className="animate-pulse" />
          </motion.div>
          
          <h1 className="text-6xl md:text-7xl font-black uppercase tracking-tighter text-primary italic mb-4 drop-shadow-sm">
            Personal
          </h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-primary/50 font-medium tracking-wide"
          >
            Mi espacio creativo y personal
          </motion.p>
        </motion.div>

        {/* --- GRID DE 2 COLUMNAS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          
          {/* COLUMNA IZQUIERDA */}
          <div className="space-y-6">
            <MenuCard 
              href="/personal/paginas/sobre-mi"
              title="Sobre Mí"
              description="Conoce más sobre mí"
              icon={<Smile size={42} />}
              delay={0.1}
              featured={true}
            />
            <MenuCard 
              href="/personal/paginas/dibujos"
              title="Dibujos"
              description="Mi galería de arte"
              icon={<ImageIcon size={42} />}
              delay={0.2}
            />
          </div>

          {/* COLUMNA DERECHA */}
          <div className="space-y-6">
            <MenuCard 
              href="/personal/paginas/fotos"
              title="Fotos"
              description="Momentos capturados"
              icon={<Camera size={42} />}
              delay={0.3}
            />
          </div>
        </div>

        {/* --- FOOTER MEJORADO --- */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-20 flex flex-col items-center gap-8"
        >
          {/* Botón volver mejorado */}
          <Link 
            href="/" 
            className="group inline-flex items-center gap-2 px-6 py-3 text-xs font-black uppercase tracking-widest text-primary/40 hover:text-primary transition-all duration-300 border-2 border-primary/10 hover:border-primary rounded-full hover:shadow-lg hover:scale-105"
          >
            <ArrowRight size={16} className="rotate-180 transition-transform group-hover:-translate-x-1" />
            Volver al Inicio
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

/* --- COMPONENTE MEJORADO: CARD DE MENÚ --- */
const MenuCard = ({ href, title, description, icon, delay, featured = false }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, type: "spring", stiffness: 100 }}
  >
    <Link href={href} className="group block relative">
      <div className={`
        bg-white/80 backdrop-blur-sm border-2 border-primary/10 rounded-3xl p-8 h-full 
        transition-all duration-500 
        group-hover:border-primary group-hover:bg-white
        group-hover:shadow-[0_25px_60px_rgba(0,0,0,0.08)] 
        group-hover:-translate-y-2 group-hover:scale-[1.02]
        ${featured ? 'border-primary/20' : ''}
      `}>
        
        {/* Badge "Featured" opcional */}
        {featured && (
          <div className="absolute top-4 right-4 bg-primary text-white text-[9px] font-black uppercase px-3 py-1 rounded-full tracking-wider">
            Destacado
          </div>
        )}
        
        {/* Icono con animación */}
        <motion.div 
          className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/5 text-primary rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:bg-primary group-hover:text-white group-hover:shadow-lg group-hover:scale-110"
          whileHover={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 0.5 }}
        >
          {icon}
        </motion.div>
        
        {/* Título y descripción */}
        <div className="space-y-2 mb-4">
          <h2 className="text-3xl font-black uppercase tracking-tighter text-primary flex items-center gap-3 group-hover:gap-4 transition-all">
            {title}
            <ArrowRight 
              className="opacity-0 -translate-x-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" 
              size={24} 
              strokeWidth={3}
            />
          </h2>
          
          <p className="text-sm font-medium text-primary/60 group-hover:text-primary/80 transition-colors">
            {description}
          </p>
        </div>

        {/* Letra decorativa de fondo mejorada */}
        <div className="absolute bottom-6 right-8 text-primary/[0.03] font-black text-7xl select-none group-hover:text-primary/[0.08] transition-all duration-500 group-hover:scale-110">
          {title[0]}
        </div>

        {/* Borde brillante animado */}
        <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-transparent via-primary/5 to-transparent blur-xl" />
        </div>
      </div>
    </Link>
  </motion.div>
);