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
    await supabase.from('wiki_notifications').update({ has_new_content: false }).eq('page_name', pageName);
    setNotifications(prev => ({ ...prev, [pageName]: false }));
  };

  return (
    // ✅ Fondo plano usando variable CSS — sin degradado
    <div className="min-h-screen bg-bg-main flex items-center justify-center p-4 md:p-6 py-20">
      <div className="max-w-5xl w-full">

        {/* HEADER */}
        <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12 md:mb-20">
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex p-4 md:p-5 bg-primary/10 text-primary rounded-3xl mb-6 md:mb-8 shadow-lg"
          >
            <Sparkles size={40} className="animate-pulse md:w-12 md:h-12" />
          </motion.div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter text-primary italic mb-4">
            Garden of Sins
          </h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            className="text-primary/50 font-medium tracking-wide text-sm md:text-base"
          >
            Mi espacio creativo
          </motion.p>
        </motion.div>

        {/* GRID */}
        <div className="grid grid-cols-2 gap-4 md:gap-8 mb-12">
          <div className="space-y-4 md:space-y-6">
            <MenuCard href="/wiki/paginas/personajes" title="Personajes" description="Conoce a los habitantes de mi mundo" icon={<Users size={28} className="md:w-[42px] md:h-[42px]" />} delay={0.1} hasNewContent={notifications['personajes']} onClick={() => handleVisit('personajes')} />
            <MenuCard href="/wiki/paginas/items" title="Items" description="Objetos místicos y artefactos raros" icon={<Package size={28} className="md:w-[38px] md:h-[38px]" />} delay={0.2} hasNewContent={notifications['items']} onClick={() => handleVisit('items')} />
            <MenuCard href="/wiki/paginas/libros" title="Libros" description="Relatos sobre los martires de cada reino" icon={<BookOpen size={28} className="md:w-[38px] md:h-[38px]" />} delay={0.3} hasNewContent={notifications['libros']} onClick={() => handleVisit('libros')} />
          </div>
          <div className="space-y-4 md:space-y-6">
            <MenuCard href="/wiki/paginas/criaturas" title="Criaturas" description="Bestias y entidades" icon={<Footprints size={28} className="md:w-[38px] md:h-[38px]" />} delay={0.15} hasNewContent={notifications['criaturas']} onClick={() => handleVisit('criaturas')} />
            <MenuCard href="/wiki/paginas/mapa" title="Mapa" description="Reinos y territorios" icon={<Map size={28} className="md:w-[38px] md:h-[38px]" />} delay={0.25} hasNewContent={notifications['mapa']} onClick={() => handleVisit('mapa')} />
            <MenuCard href="/wiki/paginas/canciones" title="Canciones" description="Reflexiones internas" icon={<Music size={28} className="md:w-[38px] md:h-[38px]" />} delay={0.35} hasNewContent={notifications['canciones']} onClick={() => handleVisit('canciones')} />
          </div>
        </div>
      </div>
    </div>
  );
}

const MenuCard = ({ href, title, description, icon, delay, hasNewContent, onClick }: any) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, type: "spring", stiffness: 100 }}>
    <Link href={href} className="group block relative" onClick={onClick}>
      {/* ✅ bg-white-custom en vez de bg-white — usa la variable CSS que cambia con el modo oscuro */}
      <div className="bg-white-custom border-2 border-primary/10 rounded-2xl md:rounded-3xl p-4 md:p-8 h-full transition-all duration-500 group-hover:border-primary group-hover:shadow-[0_25px_60px_rgba(0,0,0,0.12)] group-hover:-translate-y-2 group-hover:scale-[1.02]">
        {hasNewContent && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-3 right-3 md:top-6 md:right-6 w-3 h-3 md:w-4 md:h-4 bg-red-500 rounded-full shadow-lg z-20">
            <span className="absolute inset-0 w-3 h-3 md:w-4 md:h-4 bg-red-500 rounded-full animate-ping opacity-75" />
          </motion.div>
        )}
        <motion.div
          className="w-10 h-10 md:w-16 md:h-16 bg-primary/10 text-primary rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-6 transition-all duration-300 group-hover:bg-primary group-hover:text-white"
          whileHover={{ rotate: [0, -10, 10, 0] }}
        >
          {icon}
        </motion.div>
        <div className="space-y-1 md:space-y-2 mb-4">
          <h2 className="text-lg md:text-3xl font-black uppercase tracking-tighter text-primary flex items-center gap-1 md:gap-3">
            {title}
            <ArrowRight className="opacity-0 -translate-x-4 transition-all group-hover:opacity-100 group-hover:translate-x-0 hidden md:block" size={24} />
          </h2>
        </div>
        <div className="absolute bottom-3 right-4 md:bottom-6 md:right-8 text-primary/[0.04] font-black text-4xl md:text-7xl select-none group-hover:text-primary/[0.1] transition-all">
          {title[0]}
        </div>
      </div>
    </Link>
  </motion.div>
);