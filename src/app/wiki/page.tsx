"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  Users, 
  Sword, 
  BookText, 
  Dog, 
  Compass, 
  Music 
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { MenuCard } from "@/shared/templates/MenuCard";

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
        <motion.div 
          initial={{ opacity: 0, y: -30 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="text-center mb-16 md:mb-24"
        >
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black uppercase tracking-tighter text-primary italic">
            Wiki
          </h1>
        </motion.div>

        <div className="grid grid-cols-3 gap-4 md:gap-8 lg:gap-10">
          <MenuCard 
            href="/wiki/personajes" 
            title="Personajes" 
            icon={<Users />} 
            delay={0.1} 
            hasNewContent={notifications['personajes']} 
            onClick={() => handleVisit('personajes')} 
          />
          <MenuCard 
            href="/wiki/criaturas" 
            title="Criaturas" 
            icon={<Dog />} 
            delay={0.4} 
            hasNewContent={notifications['criaturas']} 
            onClick={() => handleVisit('criaturas')} 
          />
          <MenuCard 
            href="/wiki/items" 
            title="Items" 
            icon={<Sword />} 
            delay={0.2} 
            hasNewContent={notifications['items']} 
            onClick={() => handleVisit('items')} 
          />
          <MenuCard 
            href="/wiki/mapa" 
            title="Mapa" 
            icon={<Compass />} 
            delay={0.5} 
            hasNewContent={notifications['mapa']} 
            onClick={() => handleVisit('mapa')} 
          />
          <MenuCard 
            href="/wiki/libros" 
            title="Libros" 
            icon={<BookText />} 
            delay={0.3} 
            hasNewContent={notifications['libros']} 
            onClick={() => handleVisit('libros')} 
          />
          <MenuCard 
            href="/wiki/canciones" 
            title="Canciones" 
            icon={<Music />} 
            delay={0.6} 
            hasNewContent={notifications['canciones']} 
            onClick={() => handleVisit('canciones')} 
          />
        </div>
      </div>
    </div>
  );
}