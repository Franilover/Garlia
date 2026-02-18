"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Footprints, Package, Map, BookOpen, Music, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/api/client/supabase";

export default function WikiMenuPage() {
  const [notifications, setNotifications] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchNotifs = async () => {
      const { data } = await supabase
        .from('wiki_notifications')
        .select('page_name, has_new_content');
      
      if (data) {
        const mapped = data.reduce((acc: any, curr) => {
          acc[curr.page_name] = curr.has_new_content;
          return acc;
        }, {});
        setNotifications(mapped);
      }
    };
    fetchNotifs();
  }, []);

  const handleVisit = async (pageName: string) => {
    if (!notifications[pageName]) return;
    await supabase
      .from('wiki_notifications')
      .update({ has_new_content: false })
      .eq('page_name', pageName);
    setNotifications(prev => ({ ...prev, [pageName]: false }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-main via-bg-main to-primary/5 flex items-center justify-center p-4 md:p-6 py-20 relative overflow-hidden">

      {/* Patrón decorativo de fondo */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "32px 32px" }}
      />

      <div className="max-w-7xl w-full relative z-10">

        {/* --- HEADER --- */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 md:mb-14"
        >
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-primary leading-none">
            Wiki
          </h1>
          <p className="text-sm md:text-base font-medium text-primary/50 mt-2">
            El universo y todo lo que habita en él
          </p>
        </motion.div>

        {/* --- GRID DE 2 COLUMNAS --- */}
        <div className="grid grid-cols-2 gap-4 md:gap-8 mb-12">
          
          {/* COLUMNA IZQUIERDA */}
          <div className="space-y-4 md:space-y-6">
            <MenuCard 
              href="/wiki/paginas/personajes" 
              title="Personajes" 
              description="Conoce a los habitantes de mi mundo"
              icon={<Users size={28} className="md:w-[42px] md:h-[42px]" />}
              delay={0.1}
              hasNewContent={notifications['personajes']}
              onClick={() => handleVisit('personajes')}
            />
            <MenuCard 
              href="/wiki/paginas/items" 
              title="Items" 
              description="Objetos místicos y artefactos raros"
              icon={<Package size={28} className="md:w-[38px] md:h-[38px]" />}
              delay={0.2}
              hasNewContent={notifications['items']}
              onClick={() => handleVisit('items')}
            />
            <MenuCard 
              href="/wiki/paginas/libros" 
              title="Libros" 
              description="Relatos sobre los martires de cada reino"
              icon={<BookOpen size={28} className="md:w-[38px] md:h-[38px]" />}
              delay={0.3}
              hasNewContent={notifications['libros']}
              onClick={() => handleVisit('libros')}
            />
          </div>

          {/* COLUMNA DERECHA */}
          <div className="space-y-4 md:space-y-6">
            <MenuCard 
              href="/wiki/paginas/criaturas" 
              title="Criaturas" 
              description="Bestias y entidades"
              icon={<Footprints size={28} className="md:w-[38px] md:h-[38px]" />}
              delay={0.15}
              hasNewContent={notifications['criaturas']}
              onClick={() => handleVisit('criaturas')}
            />
            <MenuCard 
              href="/wiki/paginas/mapa" 
              title="Mapa" 
              description="Reinos y territorios"
              icon={<Map size={28} className="md:w-[38px] md:h-[38px]" />}
              delay={0.25}
              hasNewContent={notifications['mapa']}
              onClick={() => handleVisit('mapa')}
            />
            <MenuCard 
              href="/wiki/paginas/canciones" 
              title="Canciones" 
              description="Reflexiones internas"
              icon={<Music size={28} className="md:w-[38px] md:h-[38px]" />}
              delay={0.35}
              hasNewContent={notifications['canciones']}
              onClick={() => handleVisit('canciones')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const MenuCard = ({ href, title, description, icon, delay, hasNewContent, onClick }: any) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay, type: "spring", stiffness: 100 }}
  >
    <Link href={href} className="group block relative" onClick={onClick}>
      <div className="bg-white/80 backdrop-blur-sm border-2 border-primary/10 rounded-2xl md:rounded-3xl p-4 md:p-8 h-full transition-all duration-500 group-hover:border-primary group-hover:bg-white group-hover:shadow-[0_25px_60px_rgba(0,0,0,0.08)] group-hover:-translate-y-2 group-hover:scale-[1.02]">
        
        {hasNewContent && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-3 right-3 md:top-6 md:right-6 w-3 h-3 md:w-4 md:h-4 bg-red-500 rounded-full shadow-lg z-20"
          >
            <span className="absolute inset-0 w-3 h-3 md:w-4 md:h-4 bg-red-500 rounded-full animate-ping opacity-75" />
          </motion.div>
        )}

        <div className="w-10 h-10 md:w-16 md:h-16 bg-gradient-to-br from-primary/10 to-primary/5 text-primary rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-6 transition-all duration-300 group-hover:bg-primary group-hover:text-white">
          {icon}
        </div>
        <h2 className="text-lg md:text-3xl font-black uppercase tracking-tighter text-primary flex items-center gap-1 md:gap-3">
          {title}
          <ArrowRight className="opacity-0 -translate-x-4 transition-all group-hover:opacity-100 group-hover:translate-x-0 hidden md:block" size={24} />
        </h2>
        <p className="text-xs md:text-sm font-medium text-primary/60 group-hover:text-primary/80 transition-colors mt-1 md:mt-2">
          {description}
        </p>
      </div>
    </Link>
  </motion.div>
);