"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Footprints, Package, Map, BookOpen, Music, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/api/supabase"; // Usando tu cliente configurado

export default function WikiMenuPage() {
  const [notifications, setNotifications] = useState<Record<string, boolean>>({});

  // 1. Cargar estados de notificación
  useEffect(() => {
    const fetchNotifs = async () => {
      const { data, error } = await supabase
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

  // 2. Función para limpiar el puntito al entrar
  const handleVisit = async (pageName: string) => {
    if (!notifications[pageName]) return; // Si no hay punto, no hacemos nada

    await supabase
      .from('wiki_notifications')
      .update({ has_new_content: false })
      .eq('page_name', pageName);

    setNotifications(prev => ({ ...prev, [pageName]: false }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-main via-bg-main to-primary/5 flex items-center justify-center p-6 py-20 relative overflow-hidden">
      <div className="max-w-7xl w-full relative z-10">
        
        {/* HEADER ... (igual a tu código) */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* COLUMNA IZQUIERDA */}
          <div className="space-y-6">
            <MenuCard 
              href="/wiki/paginas/personajes" 
              title="Personajes" 
              description="Conoce a los habitantes de mi mundo"
              icon={<Users size={42} />} 
              delay={0.1}
              hasNewContent={notifications['personajes']}
              onClick={() => handleVisit('personajes')}
            />
            <MenuCard 
              href="/wiki/paginas/items" 
              title="Items" 
              description="Objetos místicos y artefactos raros"
              icon={<Package size={38} />} 
              delay={0.2}
              hasNewContent={notifications['items']}
              onClick={() => handleVisit('items')}
            />
            <MenuCard 
              href="/wiki/paginas/libros" 
              title="Libros" 
              description="Relatos sobre los martires de cada reino"
              icon={<BookOpen size={38} />} 
              delay={0.3}
              hasNewContent={notifications['libros']}
              onClick={() => handleVisit('libros')}
            />
          </div>

          {/* COLUMNA DERECHA */}
          <div className="space-y-6">
            <MenuCard 
              href="/wiki/paginas/criaturas" 
              title="Criaturas" 
              description="Bestias y entidades"
              icon={<Footprints size={38} />} 
              delay={0.15}
              hasNewContent={notifications['criaturas']}
              onClick={() => handleVisit('criaturas')}
            />
            <MenuCard 
              href="/wiki/paginas/mapa" 
              title="Mapa" 
              description="Reinos y territorios"
              icon={<Map size={38} />} 
              delay={0.25}
              hasNewContent={notifications['mapa']}
              onClick={() => handleVisit('mapa')}
            />
            <MenuCard 
              href="/wiki/paginas/canciones" 
              title="Canciones" 
              description="Reflexiones internas"
              icon={<Music size={38} />} 
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
      <div className="bg-white/80 backdrop-blur-sm border-2 border-primary/10 rounded-3xl p-8 h-full transition-all duration-500 group-hover:border-primary group-hover:bg-white group-hover:shadow-[0_25px_60px_rgba(0,0,0,0.08)] group-hover:-translate-y-2 group-hover:scale-[1.02]">
        
        {hasNewContent && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-6 right-6 w-4 h-4 bg-red-500 rounded-full shadow-lg z-20"
          >
            <span className="absolute inset-0 w-4 h-4 bg-red-500 rounded-full animate-ping opacity-75" />
          </motion.div>
        )}
        
        {/* Resto del diseño de tu Card... */}
        <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/5 text-primary rounded-2xl flex items-center justify-center mb-6">
          {icon}
        </div>
        <h2 className="text-3xl font-black uppercase tracking-tighter text-primary">{title}</h2>
        <p className="text-sm font-medium text-primary/60">{description}</p>
      </div>
    </Link>
  </motion.div>
);