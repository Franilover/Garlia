"use client";
import React from "react";
import { motion } from "framer-motion";
import { 
  Users, Footprints, Package, Map, 
  BookOpen, Music, ArrowRight, Sparkles 
} from "lucide-react";
import Link from "next/link";

export default function WikiMenuPage() {
  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center p-6 py-20">
      <div className="max-w-6xl w-full">
        
        {/* --- TÍTULO DE LA SECCIÓN --- */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex p-4 bg-primary/5 text-primary rounded-[25px] mb-6">
            <Sparkles size={40} />
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tighter text-primary italic">
            Enciclopedia
          </h1>
        </motion.div>

        {/* --- GRID DE OPCIONES (6 CARDS) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MenuCard href="/wiki/paginas/personajes" title="Personajes" icon={<Users size={38} />} delay={0.1} />
          <MenuCard href="/wiki/paginas/criaturas" title="Criaturas" icon={<Footprints size={38} />} delay={0.15} />
          <MenuCard href="/wiki/paginas/items" title="Items" icon={<Package size={38} />} delay={0.2} />
          <MenuCard href="/wiki/paginas/mapa" title="Mapa" icon={<Map size={38} />} delay={0.25} />
          <MenuCard href="/wiki/paginas/libros" title="Libros" icon={<BookOpen size={38} />} delay={0.3} />
          <MenuCard href="/wiki/paginas/canciones" title="Canciones" icon={<Music size={38} />} delay={0.35} />
        </div>

        {/* --- BOTÓN VOLVER --- */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-16 text-center"
        >
          <Link 
            href="/" 
            className="text-[10px] font-black uppercase tracking-widest text-primary/30 hover:text-primary transition-colors border-b border-transparent hover:border-primary"
          >
            Volver al Inicio
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
      <div className="bg-white border-2 border-primary/5 rounded-[35px] p-8 h-full transition-all duration-500 group-hover:border-primary group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] group-hover:-translate-y-2">
        
        {/* Icono con fondo que cambia al hover */}
        <div className="w-14 h-14 bg-primary/5 text-primary rounded-[20px] flex items-center justify-center mb-6 transition-colors group-hover:bg-primary group-hover:text-white">
          {icon}
        </div>
        
        <h2 className="text-2xl font-black uppercase tracking-tighter text-primary mb-2 flex items-center gap-2">
          {title}
          <ArrowRight className="opacity-0 -translate-x-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" size={20} />
        </h2>

        {/* Letra decorativa de fondo */}
        <div className="absolute bottom-4 right-6 text-primary/5 font-black text-5xl select-none group-hover:text-primary/10 transition-colors">
          {title[0]}
        </div>
      </div>
    </Link>
  </motion.div>
);