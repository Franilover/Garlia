"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star, Palette, Camera } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { MenuCard } from "@/shared/templates/MenuCard";

export default function PersonalMenuPage() {
  const [notifications, setNotifications] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchNotifs = async () => {
      const { data } = await supabase
        .from("wiki_notifications")
        .select("page_name, has_new_content")
        .in("page_name", ["sobre-mi", "dibujos", "fotos"]);
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

        <motion.div 
          initial={{ opacity: 0, y: -30 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="text-center mb-16 md:mb-24"
        >
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black uppercase tracking-tighter text-primary italic">
            Personal
          </h1>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 lg:gap-10">
          <MenuCard 
            href="/personal/sobre-mi" 
            title="Sobre Mí" 
            icon={<Star />} 
            delay={0.1} 
            hasNewContent={notifications["sobre-mi"]} 
            onClick={() => handleVisit("sobre-mi")} 
          />
          <MenuCard 
            href="/personal/dibujos" 
            title="Dibujos" 
            icon={<Palette />} /* Icono de Paleta actualizado */
            delay={0.2} 
            hasNewContent={notifications["dibujos"]} 
            onClick={() => handleVisit("dibujos")} 
          />
          <MenuCard 
            href="/personal/fotos" 
            title="Fotos" 
            icon={<Camera />} 
            delay={0.3} 
            hasNewContent={notifications["fotos"]} 
            onClick={() => handleVisit("fotos")} 
          />
        </div>
      </div>
    </div>
  );
}