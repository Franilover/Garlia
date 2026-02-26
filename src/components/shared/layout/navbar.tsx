"use client";
import React, { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import { supabase } from "@/lib/api/client/supabase";
import { useDarkMode } from "@/hooks/features/useDarkMode";
import {
  LogOut, Plus, Camera, Sparkles,
  CircleUser, Flower2, Sword,
  Utensils, CheckSquare, Dumbbell,
  PenTool, Moon, Sun
} from "lucide-react";

const Navbar = () => {
  const currentPath = usePathname();
  const { user, perfil } = useAuth() as { user: any; perfil: any };
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { isDark, toggle } = useDarkMode();

  const esFranilover = perfil?.username?.toLowerCase() === "franilover";
  const puedeSubir = perfil?.rol === "admin" || perfil?.rol === "autor";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    window.location.href = "/";
  };

  const closeAll = () => setUserMenuOpen(false);

  const isWiki = currentPath?.startsWith("/wiki") && currentPath !== "/wiki/personal";
  const isPersonal = currentPath?.startsWith("/personal") &&
    !currentPath.includes("/paginas/cocina") &&
    !currentPath.includes("/paginas/tareas") &&
    !currentPath.includes("/paginas/ejercicios") &&
    !currentPath.includes("/paginas/ensayos");

  // Botón del toggle reutilizable
  const DarkToggleBtn = () => (
    <motion.button
      onClick={toggle}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.9 }}
      aria-label={isDark ? "Modo claro" : "Modo oscuro"}
      className="p-2 rounded-xl text-primary/40 hover:text-primary hover:bg-primary/5 transition-all"
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.span key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
            <Sun size={16} />
          </motion.span>
        ) : (
          <motion.span key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
            <Moon size={16} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );

  // --- CONTENIDO MÓVIL ---
  const navContentMobile = useMemo(() => (
    <div className="flex w-full items-center justify-evenly h-full">
      <Link href="/personal" onClick={closeAll} className="flex flex-col items-center gap-1">
        <Camera size={22} className={isPersonal ? "text-primary" : "text-primary/30"} />
        <span className={cn("text-[7px] font-black uppercase tracking-widest", isPersonal ? "text-primary" : "text-primary/20")}>
          Personal
        </span>
      </Link>

      <button
        onClick={() => user ? setUserMenuOpen(!userMenuOpen) : window.location.href = "/auth/login"}
        className={cn(
          "p-3 rounded-full transition-all duration-300 shadow-lg",
          userMenuOpen ? "bg-white-custom text-primary-dark scale-110" : "bg-primary text-white shadow-primary/30"
        )}
      >
        <Flower2 size={24} strokeWidth={2.5} />
      </button>

      <Link href="/wiki" onClick={closeAll} className="flex flex-col items-center gap-1">
        <Sparkles size={22} className={isWiki ? "text-primary" : "text-primary/30"} />
        <span className={cn("text-[7px] font-black uppercase tracking-widest", isWiki ? "text-primary" : "text-primary/20")}>
          Wiki
        </span>
      </Link>
    </div>
  ), [isPersonal, isWiki, user, userMenuOpen]);

  return (
    <>
      {/* ── PC NAVBAR ── */}
      <header className="hidden md:block fixed top-0 left-0 w-full z-[100] bg-bg-main/80 backdrop-blur-md border-b border-primary/10">
        <div className="max-w-7xl mx-auto h-20 flex items-center justify-between px-8">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-black italic tracking-tighter text-primary flex items-center gap-2">
              <Flower2 size={20} />
              <span>FRANI<span className="text-primary opacity-40">LOVER</span></span>
            </Link>
          </div>

          <nav className="flex items-center gap-1 bg-primary/5 p-1 rounded-2xl border border-primary/10">
            <Link
              href="/personal"
              className={cn(
                "px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl",
                isPersonal ? "bg-white-custom text-primary dark:text-primary-dark shadow-sm" : "text-primary/40 hover:text-primary"
              )}
            >
              Personal
            </Link>
            <Link
              href="/wiki"
              className={cn(
                "px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl",
                isWiki ? "bg-white-custom text-primary dark:text-primary-dark shadow-sm" : "text-primary/40 hover:text-primary"
              )}
            >
              Wiki
            </Link>

            {esFranilover && (
              <div className="flex gap-1 ml-2 pl-2 border-l border-primary/10">
                <Link href="/personal/paginas/cocina" className={cn("p-2 rounded-xl transition-all", currentPath?.includes("/cocina") ? "bg-primary text-white" : "text-primary/30 hover:text-primary")}>
                  <Utensils size={16} />
                </Link>
                <Link href="/personal/paginas/tareas" className={cn("p-2 rounded-xl transition-all", currentPath?.includes("/tareas") ? "bg-primary text-white" : "text-primary/30 hover:text-primary")}>
                  <CheckSquare size={16} />
                </Link>
                <Link href="/personal/paginas/ejercicios" className={cn("p-2 rounded-xl transition-all", currentPath?.includes("/ejercicios") ? "bg-primary text-white" : "text-primary/30 hover:text-primary")}>
                  <Dumbbell size={16} />
                </Link>
                <Link href="/personal/paginas/ensayos" className={cn("p-2 rounded-xl transition-all", currentPath?.includes("/ensayos") ? "bg-primary text-white" : "text-primary/30 hover:text-primary")}>
                  <PenTool size={16} />
                </Link>
              </div>
            )}
          </nav>

          <div className="flex items-center gap-3">
            {/* Toggle modo oscuro — PC */}
            <DarkToggleBtn />

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-full border border-primary/10 hover:bg-primary/10 transition-all"
                >
                  <span className="text-[10px] font-black uppercase text-primary/60 tracking-widest">
                    {perfil?.username}
                  </span>
                  <CircleUser className={cn("transition-colors", userMenuOpen ? "text-primary" : "text-primary/40")} size={24} />
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full right-0 mt-3 w-48 bg-white-custom border border-primary/10 rounded-2xl shadow-xl p-2 z-[1001]"
                    >
                      <Link href="/wiki/personal" onClick={closeAll} className="flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase text-primary/60 hover:bg-primary/5 rounded-xl transition-all">
                        <Sword size={14} /> Mi Personaje
                      </Link>
                      {puedeSubir && (
                        <Link href="/upload" onClick={closeAll} className="flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase text-primary bg-primary/5 rounded-xl transition-all mb-1">
                          <Plus size={14} /> Subir Contenido
                        </Link>
                      )}
                      <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-[10px] font-black uppercase text-red-400 hover:bg-red-50 rounded-xl transition-all border-t border-primary/5">
                        <LogOut size={14} /> Salir
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link href="/auth/login" className="text-[10px] font-black uppercase text-primary/60 hover:text-primary">
                Entrar
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── MÓVIL ── */}
      <div className="md:hidden fixed bottom-0 left-0 w-full z-[1000]">
        <nav className="bg-bg-main/95 backdrop-blur-xl border-t border-primary/20 shadow-2xl h-16 flex items-center w-full">
          {navContentMobile}
        </nav>

        <AnimatePresence>
          {userMenuOpen && user && (
            <motion.div
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 15 }}
              className="absolute bottom-16 left-4 right-4 bg-white-custom border border-primary/10 rounded-[40px] p-4 shadow-2xl flex flex-col gap-2 z-[1001]"
            >
              <div className="text-center mb-2">
                <p className="text-[9px] font-black text-primary/20 uppercase tracking-widest">
                  Hola, {perfil?.username}
                </p>
              </div>

              <Link href="/wiki/personal" onClick={closeAll} className="w-full p-4 bg-primary/5 text-primary rounded-[25px] font-black uppercase text-[10px] flex items-center justify-center gap-3">
                <Sword size={18} /> Mi Personaje
              </Link>

              {puedeSubir && (
                <Link href="/upload" onClick={closeAll} className="w-full p-4 bg-primary text-white rounded-[25px] font-black uppercase text-[10px] flex items-center justify-center gap-3">
                  <Plus size={18} /> Subir Contenido
                </Link>
              )}

              {esFranilover && (
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/personal/paginas/cocina" onClick={closeAll} className="p-4 border border-primary/10 text-primary rounded-[25px] flex items-center justify-center">
                    <Utensils size={18} />
                  </Link>
                  <Link href="/personal/paginas/tareas" onClick={closeAll} className="p-4 border border-primary/10 text-primary rounded-[25px] flex items-center justify-center">
                    <CheckSquare size={18} />
                  </Link>
                  <Link href="/personal/paginas/ejercicios" onClick={closeAll} className="p-4 border border-primary/10 text-primary rounded-[25px] flex items-center justify-center">
                    <Dumbbell size={18} />
                  </Link>
                  <Link href="/personal/paginas/ensayos" onClick={closeAll} className="p-4 border border-primary/10 text-primary rounded-[25px] flex items-center justify-center">
                    <PenTool size={18} />
                  </Link>
                </div>
              )}

              {/* Toggle modo oscuro — menú móvil */}
              <button
                onClick={toggle}
                className="w-full p-4 border border-primary/10 text-primary rounded-[25px] font-black uppercase text-[10px] flex items-center justify-center gap-3 transition-all hover:bg-primary/5"
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
                {isDark ? "Modo Claro" : "Modo Oscuro"}
              </button>

              <button onClick={handleLogout} className="w-full p-4 bg-red-50 text-red-400 rounded-[25px] font-black uppercase text-[10px] flex items-center justify-center gap-3 mt-2">
                Cerrar Sesión <LogOut size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {userMenuOpen && (
        <div className="fixed inset-0 z-[999] bg-primary/5 backdrop-blur-[2px]" onClick={closeAll} />
      )}
    </>
  );
};

export default Navbar;