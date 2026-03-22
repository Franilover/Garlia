"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Compass, BookText, Music } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { MenuCard } from "@/components/templates/MenuCard";

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
    <div
      className="flex flex-col justify-center md:justify-start p-4 md:p-8 gap-6 md:gap-8"
      style={{
        height: 'calc(100svh - 64px)',
      }}
    >
      {}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center shrink-0 md:pt-10"
      >
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter text-primary italic">
          Jardin
        </h1>
      </motion.div>

      {}
      <div className="hidden md:grid grid-cols-2 gap-4 lg:gap-6 flex-1 min-h-0">
        <MenuCard href="/wiki/enciclopedia" title="Información" icon={<BookOpen />} delay={0.4} hasNewContent={notifications['enciclopedia']} onClick={() => handleVisit('enciclopedia')} />
        <MenuCard href="/wiki/mapa"         title="Mapa"        icon={<Compass />}  delay={0.1} hasNewContent={notifications['mapa']}         onClick={() => handleVisit('mapa')} />
        <MenuCard href="/wiki/libros"       title="Libros"      icon={<BookText />} delay={0.2} hasNewContent={notifications['libros']}       onClick={() => handleVisit('libros')} />
        <MenuCard href="/wiki/canciones"    title="Canciones"   icon={<Music />}    delay={0.3} hasNewContent={notifications['canciones']}    onClick={() => handleVisit('canciones')} />
      </div>

      {}
      <div className="flex flex-col gap-3 shrink-0 md:hidden">
        <MenuCard href="/wiki/enciclopedia" title="Información" icon={<BookOpen />} delay={0.4} hasNewContent={notifications['enciclopedia']} onClick={() => handleVisit('enciclopedia')} horizontal />
        <MenuCard href="/wiki/mapa"         title="Mapa"        icon={<Compass />}  delay={0.1} hasNewContent={notifications['mapa']}         onClick={() => handleVisit('mapa')} horizontal />
        <MenuCard href="/wiki/libros"       title="Libros"      icon={<BookText />} delay={0.2} hasNewContent={notifications['libros']}       onClick={() => handleVisit('libros')} horizontal />
        <MenuCard href="/wiki/canciones"    title="Canciones"   icon={<Music />}    delay={0.3} hasNewContent={notifications['canciones']}    onClick={() => handleVisit('canciones')} horizontal />
      </div>
    </div>
  );
}