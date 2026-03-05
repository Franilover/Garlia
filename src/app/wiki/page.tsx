"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Sword, BookText, Dog, Compass, Music } from "lucide-react";
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
            Jardin
          </h1>
        </motion.div>

        <div className="flex flex-col gap-4 md:gap-8 lg:gap-10">

          {/* Fila 1: Personajes + Criaturas */}
          <div className="grid grid-cols-2 gap-4 md:gap-8 lg:gap-10">
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
              delay={0.2}
              hasNewContent={notifications['criaturas']}
              onClick={() => handleVisit('criaturas')}
            />
          </div>

          {/* Fila 2: Items + Mapa */}
          <div className="grid grid-cols-2 gap-4 md:gap-8 lg:gap-10">
            <MenuCard
              href="/wiki/items"
              title="Items"
              icon={<Sword />}
              delay={0.3}
              hasNewContent={notifications['items']}
              onClick={() => handleVisit('items')}
            />
            <MenuCard
              href="/wiki/mapa"
              title="Mapa"
              icon={<Compass />}
              delay={0.4}
              hasNewContent={notifications['mapa']}
              onClick={() => handleVisit('mapa')}
            />
          </div>

          {/* Fila 3: Libros horizontal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
          >
            <a href="/wiki/libros" onClick={() => handleVisit('libros')} className="group block relative">
              <div className="bg-white-custom border-2 border-primary/5 rounded-3xl p-6 md:p-10 flex items-center gap-6 md:gap-10 transition-all duration-500 group-hover:border-primary group-hover:shadow-[0_30px_70px_rgba(0,0,0,0.15)] group-hover:-translate-y-3">
                {notifications['libros'] && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-4 right-4 md:top-8 md:right-8 w-3 h-3 md:w-4 md:h-4 bg-red-500 rounded-full shadow-lg z-20">
                    <span className="absolute inset-0 w-3 h-3 md:w-4 md:h-4 bg-red-500 rounded-full animate-ping opacity-75" />
                  </motion.div>
                )}
                <motion.div
                  className="w-16 h-16 md:w-24 md:h-24 shrink-0 bg-primary/10 text-primary rounded-3xl flex items-center justify-center transition-all duration-300 group-hover:bg-primary group-hover:text-white"
                  whileHover={{ rotate: [0, -10, 10, 0] }}
                >
                  <BookText size={32} className="md:w-[48px] md:h-[48px]" />
                </motion.div>
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-black uppercase tracking-tighter text-primary">
                  Libros
                </h2>
              </div>
            </a>
          </motion.div>

          {/* Fila 4: Canciones horizontal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, type: "spring", stiffness: 100 }}
          >
            <a href="/wiki/canciones" onClick={() => handleVisit('canciones')} className="group block relative">
              <div className="bg-white-custom border-2 border-primary/5 rounded-3xl p-6 md:p-10 flex items-center gap-6 md:gap-10 transition-all duration-500 group-hover:border-primary group-hover:shadow-[0_30px_70px_rgba(0,0,0,0.15)] group-hover:-translate-y-3">
                {notifications['canciones'] && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-4 right-4 md:top-8 md:right-8 w-3 h-3 md:w-4 md:h-4 bg-red-500 rounded-full shadow-lg z-20">
                    <span className="absolute inset-0 w-3 h-3 md:w-4 md:h-4 bg-red-500 rounded-full animate-ping opacity-75" />
                  </motion.div>
                )}
                <motion.div
                  className="w-16 h-16 md:w-24 md:h-24 shrink-0 bg-primary/10 text-primary rounded-3xl flex items-center justify-center transition-all duration-300 group-hover:bg-primary group-hover:text-white"
                  whileHover={{ rotate: [0, -10, 10, 0] }}
                >
                  <Music size={32} className="md:w-[48px] md:h-[48px]" />
                </motion.div>
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-black uppercase tracking-tighter text-primary">
                  Canciones
                </h2>
              </div>
            </a>
          </motion.div>

        </div>
      </div>
    </div>
  );
}