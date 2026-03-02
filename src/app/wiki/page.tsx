"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  Users, 
  Package, 
  BookOpen, 
  Footprints, 
  Map, 
  Music, 
  ArrowRight 
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/api/client/supabase";

export default function WikiMenuPage() {
  const [notifications, setNotifications] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchNotifs = async () => {
      const { data } = await supabase
        .from("wiki_notifications")
        .select("page_name, has_new_content")
        .in("page_name", ["personajes", "items", "libros", "criaturas", "mapa", "canciones"]);
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
    await supabase.from("wiki_notifications").update({ has_new_content: false }).eq("page_name", pageName);
    setNotifications(prev => ({ ...prev, [pageName]: false }));
  };

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center p-4 md:p-10 py-24">
      <div className="max-w-7xl w-full">

        {/* HEADER - Solo el título principal */}
        <motion.div 
          initial={{ opacity: 0, y: -30 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="text-center mb-16 md:mb-24"
        >
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black uppercase tracking-tighter text-primary italic">
            Wiki
          </h1>
        </motion.div>

        {/* GRID: 2 columnas móvil, 3 en escritorio */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 lg:gap-10">
          <MenuCard 
            href="/wiki/paginas/personajes" 
            title="Personajes" 
            icon={<Users size={32} className="md:w-[48px] md:h-[48px]" />} 
            delay={0.1} 
            hasNewContent={notifications['personajes']} 
            onClick={() => handleVisit('personajes')} 
          />
          <MenuCard 
            href="/wiki/paginas/items" 
            title="Items" 
            icon={<Package size={32} className="md:w-[42px] md:h-[42px]" />} 
            delay={0.2} 
            hasNewContent={notifications['items']} 
            onClick={() => handleVisit('items')} 
          />
          <MenuCard 
            href="/wiki/paginas/libros" 
            title="Libros" 
            icon={<BookOpen size={32} className="md:w-[42px] md:h-[42px]" />} 
            delay={0.3} 
            hasNewContent={notifications['libros']} 
            onClick={() => handleVisit('libros')} 
          />
          <MenuCard 
            href="/wiki/paginas/criaturas" 
            title="Criaturas" 
            icon={<Footprints size={32} className="md:w-[42px] md:h-[42px]" />} 
            delay={0.4} 
            hasNewContent={notifications['criaturas']} 
            onClick={() => handleVisit('criaturas')} 
          />
          <MenuCard 
            href="/wiki/paginas/mapa" 
            title="Mapa" 
            icon={<Map size={32} className="md:w-[42px] md:h-[42px]" />} 
            delay={0.5} 
            hasNewContent={notifications['mapa']} 
            onClick={() => handleVisit('mapa')} 
          />
          <MenuCard 
            href="/wiki/paginas/canciones" 
            title="Canciones" 
            icon={<Music size={32} className="md:w-[42px] md:h-[42px]" />} 
            delay={0.6} 
            hasNewContent={notifications['canciones']} 
            onClick={() => handleVisit('canciones')} 
          />
        </div>
      </div>
    </div>
  );
}

const MenuCard = ({ href, title, icon, delay, hasNewContent, onClick }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }} 
    animate={{ opacity: 1, y: 0 }} 
    transition={{ delay, type: "spring", stiffness: 100 }}
    className="h-full"
  >
    <Link href={href} className="group block relative h-full" onClick={onClick}>
      <div className="bg-white-custom border-2 border-primary/5 rounded-3xl p-6 md:p-12 h-full flex flex-col items-center justify-center text-center transition-all duration-500 group-hover:border-primary group-hover:shadow-[0_30px_70px_rgba(0,0,0,0.15)] group-hover:-translate-y-3">
        
        {hasNewContent && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-4 right-4 md:top-8 md:right-8 w-3 h-3 md:w-4 md:h-4 bg-red-500 rounded-full shadow-lg z-20">
            <span className="absolute inset-0 w-3 h-3 md:w-4 md:h-4 bg-red-500 rounded-full animate-ping opacity-75" />
          </motion.div>
        )}

        <motion.div
          className="w-16 h-16 md:w-24 md:h-24 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:bg-primary group-hover:text-white"
          whileHover={{ rotate: [0, -10, 10, 0] }}
        >
          {icon}
        </motion.div>
        
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-black uppercase tracking-tighter text-primary">
          {title}
        </h2>

        <div className="mt-4 opacity-0 transition-all duration-300 group-hover:opacity-100">
           <ArrowRight className="text-primary" size={28} />
        </div>
      </div>
    </Link>
  </motion.div>
);