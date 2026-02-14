"use client";
import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils"; 
import { useAuth } from "@/components/features/control/authContext"; 
import { supabase } from "@/lib/api/supabase";
import { useScrollVisibility } from "@/hooks/useScrollVisibility";
import { 
  LogOut, Plus, Camera, Sparkles, 
  CircleUser, Flower2, Sword,
  Utensils, CheckSquare 
} from "lucide-react";

const Navbar = () => {
  const currentPath = usePathname();
  const { user, perfil } = useAuth() as { user: any; perfil: any };
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { isVisible } = useScrollVisibility(50);

  useEffect(() => {
    if (!isVisible) {
      setUserMenuOpen(false);
    }
  }, [isVisible]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    window.location.href = "/"; 
  };

  const puedeSubir = perfil?.rol === "admin" || perfil?.rol === "autor";
  const esFranilover = perfil?.username === "Franilover";

  const closeAll = () => { 
    setUserMenuOpen(false); 
  };

  const isInSection = (path: string) => currentPath?.startsWith(path);

  // --- CONTENIDO MÓVIL: 3 OPCIONES ---
  const navContentMobile = useMemo(() => (
    <div className="flex w-full items-center justify-between px-8 h-full">
      
      {/* 1. PERSONAL (IZQUIERDA) */}
      <Link href="/personal" onClick={closeAll} className="flex flex-col items-center gap-1">
        <Camera size={22} className={isInSection("/personal") && !isInSection("/personal/cocina") && !isInSection("/personal/tareas") ? "text-primary" : "text-primary/30"} />
        <span className={cn("text-[7px] font-black uppercase tracking-widest", isInSection("/personal") && !isInSection("/personal/cocina") ? "text-primary" : "text-primary/20")}>
          "Personal"
        </span>
      </Link>

      {/* 2. LA FLOR (CENTRO) - ABRE EL MENÚ DE CUENTA */}
      <button 
        onClick={() => user ? setUserMenuOpen(!userMenuOpen) : window.location.href="/auth/login"} 
        className={cn(
          "p-3 rounded-full transition-all duration-300 shadow-lg",
          userMenuOpen ? "bg-white text-primary scale-110" : "bg-primary text-white shadow-primary/30"
        )}
      >
        <Flower2 size={24} strokeWidth={2.5} />
      </button>

      {/* 3. WIKI (DERECHA) */}
      <Link href="/wiki" onClick={closeAll} className="flex flex-col items-center gap-1">
        <Sparkles size={22} className={isInSection("/wiki") && currentPath !== "/wiki/personal" ? "text-primary" : "text-primary/30"} />
        <span className={cn("text-[7px] font-black uppercase tracking-widest", isInSection("/wiki") && currentPath !== "/wiki/personal" ? "text-primary" : "text-primary/20")}>
          "Wiki"
        </span>
      </Link>
      
    </div>
  ), [currentPath, user, userMenuOpen]);

  return (
    <>
      {/* --- PC NAVBAR (Sin cambios significativos para mantener consistencia) --- */}
      <header className="hidden md:block sticky top-0 w-full z-1000 bg-bg-main/80 backdrop-blur-md border-b border-primary/10">
        <div className="max-w-7xl mx-auto h-20 flex items-center justify-between px-8">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-black italic tracking-tighter text-primary flex items-center gap-2">
              <Flower2 size={20} /> <span>FRANI<span className="text-primary opacity-40">LOVER</span></span>
            </Link>
          </div>

          <nav className="flex items-center gap-1 bg-primary/5 p-1 rounded-2xl border border-primary/10">
            <Link 
              href="/personal" 
              className={cn("px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl", 
              isInSection("/personal") && !isInSection("/personal/cocina") ? "bg-white text-primary shadow-sm" : "text-primary/40 hover:text-primary")}
            >
              Personal
            </Link>
            <Link 
              href="/wiki" 
              className={cn("px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl", 
              isInSection("/wiki") && currentPath !== "/wiki/personal" ? "bg-white text-primary shadow-sm" : "text-primary/40 hover:text-primary")}
            >
              Wiki
            </Link>

            {esFranilover && (
              <div className="flex gap-1 ml-2 pl-2 border-l border-primary/10">
                <Link href="/personal/cocina" className={cn("p-2 rounded-xl transition-all", isInSection("/personal/cocina") ? "bg-primary text-white" : "text-primary/30 hover:text-primary")}>
                  <Utensils size={16} />
                </Link>
                <Link href="/personal/tareas" className={cn("p-2 rounded-xl transition-all", isInSection("/personal/tareas") ? "bg-primary text-white" : "text-primary/30 hover:text-primary")}>
                  <CheckSquare size={16} />
                </Link>
              </div>
            )}
          </nav>
          
          <div className="flex items-center gap-4">
            {puedeSubir && (
               <Link href="/upload" className="p-2 bg-primary/5 text-primary rounded-xl hover:bg-primary hover:text-white transition-all">
                <Plus size={20} />
               </Link>
            )}
            {user ? (
              <div className="relative">
                <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2">
                  <CircleUser className={cn("transition-colors", userMenuOpen ? "text-primary" : "text-primary/40")} size={28} />
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full right-0 mt-3 w-48 bg-white border border-primary/10 rounded-2xl shadow-xl p-2 z-1001"
                    >
                      <Link href="/wiki/personal" onClick={closeAll} className="flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase text-primary/60 hover:bg-primary/5 rounded-xl transition-all">
                        <Sword size={14} /> "Mi Personaje"
                      </Link>
                      <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-[10px] font-black uppercase text-red-400 hover:bg-red-50 rounded-xl transition-all border-t border-primary/5">
                        <LogOut size={14} /> "Salir"
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : <Link href="/auth/login" className="text-[10px] font-black uppercase text-primary/60 hover:text-primary">"Entrar"</Link>}
          </div>
        </div>
      </header>

      {/* --- MÓVIL --- */}
      <motion.div 
        className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100vw-48px)] z-1000"
        initial={false}
        animate={{ y: isVisible ? 0 : 120, opacity: isVisible ? 1 : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <nav className="bg-bg-main/95 backdrop-blur-xl border border-primary/20 shadow-2xl h-18 rounded-[40px] flex items-center overflow-hidden w-full">
          {navContentMobile}
        </nav>

        <AnimatePresence>
          {userMenuOpen && user && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 15 }}
              className="absolute bottom-24 left-0 w-full bg-white border border-primary/10 rounded-[40px] p-4 shadow-2xl flex flex-col gap-2 z-1001">
              
              <div className="text-center mb-2">
                <p className="text-[9px] font-black text-primary/20 uppercase tracking-widest">"Menú de Usuario"</p>
              </div>

              <Link href="/wiki/personal" onClick={closeAll} className="w-full p-4 bg-primary/5 text-primary rounded-[25px] font-black uppercase text-[10px] flex items-center justify-center gap-3">
                <Sword size={18}/> Mi Personaje
              </Link>

              {puedeSubir && (
                <Link href="/upload" onClick={closeAll} className="w-full p-4 bg-primary text-white rounded-[25px] font-black uppercase text-[10px] flex items-center justify-center gap-3">
                  <Plus size={18}/> "Subir Contenido"
                </Link>
              )}

              {esFranilover && (
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/personal/cocina" onClick={closeAll} className="p-4 border border-primary/10 text-primary rounded-[25px] font-black uppercase text-[10px] flex items-center justify-center gap-3">
                    <Utensils size={16}/> "Cocina"
                  </Link>
                  <Link href="/personal/tareas" onClick={closeAll} className="p-4 border border-primary/10 text-primary rounded-[25px] font-black uppercase text-[10px] flex items-center justify-center gap-3">
                    <CheckSquare size={16}/> "Agenda"
                  </Link>
                </div>
              )}

              <button onClick={handleLogout} className="w-full p-4 bg-red-50 text-red-400 rounded-[25px] font-black uppercase text-[10px] flex items-center justify-center gap-3 mt-2">
                "Cerrar Sesión" <LogOut size={16}/>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {userMenuOpen && (
        <div className="fixed inset-0 z-999 bg-primary/5 backdrop-blur-[2px]" onClick={closeAll} />
      )}
    </>
  );
};

export default Navbar;