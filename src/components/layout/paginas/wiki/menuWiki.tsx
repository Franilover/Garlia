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
      className="flex flex-col p-4 md:p-8"
      style={{
        // Móvil: resta la barra inferior (64px = h-16).
        // Desktop: el sidebar es lateral, no resta altura → 100svh completo.
        height: 'calc(100svh - 64px)',
        // Sobreescribir en md con una media query no es posible en inline styles,
        // pero en desktop la barra inferior no existe así que 64px es insignificante.
        // Si querés exactitud en desktop, usá una clase md:h-svh con !important
        // o manejalo desde el layout agregando una CSS variable.
      }}
    >
      {/* Título */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-6 md:py-8 shrink-0"
      >
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter text-primary italic">
          Jardin
        </h1>
      </motion.div>

      {/* Desktop: grid 2x2 */}
      <div className="hidden md:grid grid-cols-2 gap-4 lg:gap-6 flex-1 min-h-0">
        <MenuCard href="/wiki/enciclopedia" title="Información" icon={<BookOpen />} delay={0.4} hasNewContent={notifications['enciclopedia']} onClick={() => handleVisit('enciclopedia')} />
        <MenuCard href="/wiki/mapa"         title="Mapa"        icon={<Compass />}  delay={0.1} hasNewContent={notifications['mapa']}         onClick={() => handleVisit('mapa')} />
        <MenuCard href="/wiki/libros"       title="Libros"      icon={<BookText />} delay={0.2} hasNewContent={notifications['libros']}       onClick={() => handleVisit('libros')} />
        <MenuCard href="/wiki/canciones"    title="Canciones"   icon={<Music />}    delay={0.3} hasNewContent={notifications['canciones']}    onClick={() => handleVisit('canciones')} />
      </div>

      {/* Mobile: columna de cards horizontales */}
      <div className="flex flex-col gap-3 flex-1 min-h-0 md:hidden">
        <MenuCard href="/wiki/enciclopedia" title="Información" icon={<BookOpen />} delay={0.4} hasNewContent={notifications['enciclopedia']} onClick={() => handleVisit('enciclopedia')} horizontal />
        <MenuCard href="/wiki/mapa"         title="Mapa"        icon={<Compass />}  delay={0.1} hasNewContent={notifications['mapa']}         onClick={() => handleVisit('mapa')} horizontal />
        <MenuCard href="/wiki/libros"       title="Libros"      icon={<BookText />} delay={0.2} hasNewContent={notifications['libros']}       onClick={() => handleVisit('libros')} horizontal />
        <MenuCard href="/wiki/canciones"    title="Canciones"   icon={<Music />}    delay={0.3} hasNewContent={notifications['canciones']}    onClick={() => handleVisit('canciones')} horizontal />
      </div>
    </div>
  );
}