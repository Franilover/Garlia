"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Smile, ImageIcon, Camera, ArrowRight, UserCircle } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/api/supabase"; // Importamos tu cliente corregido

export default function PersonalMenuPage() {
  const [notifications, setNotifications] = useState<Record<string, boolean>>({});

  // 1. Cargar estados de notificación desde Supabase
  useEffect(() => {
    const fetchNotifs = async () => {
      const { data, error } = await supabase
        .from("wiki_notifications")
        .select("page_name, has_new_content")
        .in("page_name", ["sobre-mi", "dibujos", "fotos"]); // Filtramos solo las de esta página
      
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

  // 2. Función para limpiar el punto al hacer clic
  const handleVisit = async (pageName: string) => {
    if (!notifications[pageName]) return;

    await supabase
      .from("wiki_notifications")
      .update({ has_new_content: false })
      .eq("page_name", pageName);

    setNotifications(prev => ({ ...prev, [pageName]: false }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-main via-bg-main to-primary/5 flex items-center justify-center p-6 py-20 relative overflow-hidden">
      
      {/* Patrón decorativo de fondo */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary rounded-full blur-3xl" />
      </div>

      <div className="max-w-5xl w-full relative z-10">
        
        {/* --- HEADER --- */}
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
              description="En caso de dudas :D"
              icon={<Smile size={42} />}
              delay={0.1}
              hasNewContent={notifications["sobre-mi"]}
              onClick={() => handleVisit("sobre-mi")}
            />
            <MenuCard 
              href="/personal/paginas/dibujos"
              title="Dibujos"
              description="Mi gran Atelier"
              icon={<ImageIcon size={42} />}
              delay={0.2}
              hasNewContent={notifications["dibujos"]}
              onClick={() => handleVisit("dibujos")}
            />
          </div>

          {/* COLUMNA DERECHA */}
          <div className="space-y-6">
            <MenuCard 
              href="/personal/paginas/fotos"
              title="Fotos"
              description="Recuerdos"
              icon={<Camera size={42} />}
              delay={0.3}
              hasNewContent={notifications["fotos"]}
              onClick={() => handleVisit("fotos")}
            />
          </div>
        </div>

        {/* --- FOOTER --- */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-20 flex flex-col items-center gap-8"
        >
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

/* --- COMPONENTE CARD --- */
const MenuCard = ({ href, title, description, icon, delay, hasNewContent, onClick }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
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
        
        <motion.div 
          className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/5 text-primary rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:bg-primary group-hover:text-white"
          whileHover={{ rotate: [0, -10, 10, 0] }}
        >
          {icon}
        </motion.div>
        
        <div className="space-y-2 mb-4">
          <h2 className="text-3xl font-black uppercase tracking-tighter text-primary flex items-center gap-3">
            {title}
            <ArrowRight className="opacity-0 -translate-x-4 transition-all group-hover:opacity-100 group-hover:translate-x-0" size={24} />
          </h2>
          <p className="text-sm font-medium text-primary/60 group-hover:text-primary/80 transition-colors">
            {description}
          </p>
        </div>

        <div className="absolute bottom-6 right-8 text-primary/[0.03] font-black text-7xl select-none group-hover:text-primary/[0.08] transition-all">
          {title[0]}
        </div>
      </div>
    </Link>
  </motion.div>
);