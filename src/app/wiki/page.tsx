"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Compass, BookText, Music } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { MenuCard } from "@/shared/templates/MenuCard";

export default function WikiMenuPage() {
  const [notifications, setNotifications] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchNotifs = async () => {
      const { data } = await supabase
        .from("wiki_notifications")
        .select("page_name, has_new_content")
        .in("page_name", ["enciclopedia", "mapa", "libros", "canciones"]);
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
            Jardin
          </h1>
        </motion.div>

        {/* Desktop: 2x2 + fila enciclopedia abajo */}
        <div className="hidden md:grid grid-cols-2 gap-8 lg:gap-10">
          <MenuCard href="/wiki/mapa"          title="Mapa"          icon={<Compass />}  delay={0.1} hasNewContent={notifications['mapa']}          onClick={() => handleVisit('mapa')}          />
          <MenuCard href="/wiki/libros"         title="Libros"        icon={<BookText />} delay={0.2} hasNewContent={notifications['libros']}        onClick={() => handleVisit('libros')}         />
          <MenuCard href="/wiki/canciones"      title="Canciones"     icon={<Music />}    delay={0.3} hasNewContent={notifications['canciones']}     onClick={() => handleVisit('canciones')}      />
          <MenuCard href="/wiki/enciclopedia"   title="Enciclopedia"  icon={<BookOpen />} delay={0.4} hasNewContent={notifications['enciclopedia']}  onClick={() => handleVisit('enciclopedia')}   />
        </div>

        {/* Mobile: todo horizontal */}
        <div className="flex flex-col gap-4 md:hidden">
          <MenuCard href="/wiki/mapa"         title="Mapa"         icon={<Compass />}  delay={0.1} hasNewContent={notifications['mapa']}         onClick={() => handleVisit('mapa')}         horizontal />
          <MenuCard href="/wiki/libros"        title="Libros"       icon={<BookText />} delay={0.2} hasNewContent={notifications['libros']}       onClick={() => handleVisit('libros')}        horizontal />
          <MenuCard href="/wiki/canciones"     title="Canciones"    icon={<Music />}    delay={0.3} hasNewContent={notifications['canciones']}    onClick={() => handleVisit('canciones')}     horizontal />
          <MenuCard href="/wiki/enciclopedia"  title="Enciclopedia" icon={<BookOpen />} delay={0.4} hasNewContent={notifications['enciclopedia']} onClick={() => handleVisit('enciclopedia')}  horizontal />
        </div>
      </div>
    </div>
  );
}