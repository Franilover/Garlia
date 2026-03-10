"use client";
import React, { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/app/providers/AuthProvider";
import { supabase } from "@/lib/api/client/supabase";
import { useDarkMode } from "@/hooks/features/useDarkMode";
import { ThemeSelector } from "@/app/providers/ThemeProvider";
import {
  LogOut, CircleUser, Flower2, Sword,
  Utensils, PenTool, Moon, Sun, Star, User, Palette, Shirt,
} from "lucide-react";

const Navbar = () => {
  const currentPath = usePathname();
  const { user, perfil } = useAuth() as { user: any; perfil: any };
  const [userMenuOpen, setUserMenuOpen]   = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const { isDark, toggle } = useDarkMode();

  const esFranilover = perfil?.username?.toLowerCase() === "franilover";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    window.location.href = "/";
  };

  const closeAll = () => { setUserMenuOpen(false); setThemeMenuOpen(false); };

  const isWiki     = currentPath?.startsWith("/wiki") && currentPath !== "/wiki/personal";
  const isPersonal = currentPath?.startsWith("/personal") &&
    !currentPath.includes("/paginas/salud") &&
    !currentPath.includes("/paginas/tareas") &&
    !currentPath.includes("/paginas/ejercicios") &&
    !currentPath.includes("/paginas/ensayos");

  const DarkToggleBtn = () => (
    <motion.button
      onClick={toggle}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.9 }}
      aria-label={isDark ? "Modo claro" : "Modo oscuro"}
      className="p-2 transition-all"
      style={{
        borderRadius: "var(--radius-btn)",
        color: "color-mix(in srgb, var(--primary) 40%, transparent)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 5%, transparent)";
        (e.currentTarget as HTMLElement).style.color = "var(--primary)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
        (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--primary) 40%, transparent)";
      }}
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

  const navContentMobile = useMemo(() => (
    <div className="flex w-full items-center justify-evenly h-full">
      <Link href="/personal" onClick={closeAll} className="flex flex-col items-center justify-center w-16 h-16">
        <Star
          size={26}
          className="transition-all duration-300"
          style={{
            color: isPersonal
              ? "var(--primary)"
              : "color-mix(in srgb, var(--primary) 30%, transparent)",
            transform: isPersonal ? "scale(1.1)" : "scale(1)",
          }}
          fill={isPersonal ? "currentColor" : "none"}
        />
      </Link>

      <button
        onClick={() => user ? setUserMenuOpen(!userMenuOpen) : (window.location.href = "/auth/login")}
        className="p-3 transition-all duration-300 shadow-lg"
        style={{
          borderRadius: "9999px",
          background: userMenuOpen ? "var(--white-custom)" : "var(--primary)",
          color: userMenuOpen ? "var(--primary)" : "var(--btn-text)",
          transform: userMenuOpen ? "scale(1.1)" : "scale(1)",
        }}
      >
        <User size={24} strokeWidth={2.5} />
      </button>

      <Link href="/wiki" onClick={closeAll} className="flex flex-col items-center justify-center w-16 h-16">
        <Flower2
          size={26}
          className="transition-all duration-300"
          style={{
            color: isWiki
              ? "var(--primary)"
              : "color-mix(in srgb, var(--primary) 30%, transparent)",
            transform: isWiki ? "scale(1.1)" : "scale(1)",
          }}
        />
      </Link>
    </div>
  ), [isPersonal, isWiki, user, userMenuOpen]);

  return (
    <>
      {/* ── PC NAVBAR ── */}
      <header
        className="hidden md:block fixed top-0 left-0 w-full z-[100] backdrop-blur-md"
        style={{
          background: "color-mix(in srgb, var(--bg-main) 80%, transparent)",
          borderBottom: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
        }}
      >
        <div className="max-w-7xl mx-auto h-20 flex items-center justify-between px-8">
          {/* Logo */}
          <Link
            href="/"
            className="text-xl font-black italic tracking-tighter flex items-center gap-2"
            style={{ color: "var(--primary)" }}
          >
            <Flower2 size={20} />
            <span>
              FRANI
              <span style={{ color: "var(--primary)", opacity: 0.4 }}>LOVER</span>
            </span>
          </Link>

          {/* Nav pills */}
          <nav
            className="flex items-center gap-1 p-1"
            style={{
              background: "color-mix(in srgb, var(--primary) 5%, transparent)",
              border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
              borderRadius: "var(--radius-card)",
            }}
          >
            <Link
              href="/personal"
              className="px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all"
              style={{
                borderRadius: "var(--radius-btn)",
                background: isPersonal ? "var(--white-custom)" : "transparent",
                color: isPersonal
                  ? "var(--primary)"
                  : "color-mix(in srgb, var(--primary) 40%, transparent)",
                boxShadow: isPersonal ? "var(--shadow-card)" : "none",
              }}
            >
              Personal
            </Link>
            <Link
              href="/wiki"
              className="px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all"
              style={{
                borderRadius: "var(--radius-btn)",
                background: isWiki ? "var(--white-custom)" : "transparent",
                color: isWiki
                  ? "var(--primary)"
                  : "color-mix(in srgb, var(--primary) 40%, transparent)",
                boxShadow: isWiki ? "var(--shadow-card)" : "none",
              }}
            >
              Wiki
            </Link>
            {esFranilover && (
              <div
                className="flex gap-1 ml-2 pl-2"
                style={{ borderLeft: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)" }}
              >
                <Link
                  href="/personal/salud"
                  className="p-2 transition-all"
                  style={{
                    borderRadius: "var(--radius-btn)",
                    background: currentPath?.includes("/salud") ? "var(--primary)" : "transparent",
                    color: currentPath?.includes("/salud")
                      ? "var(--btn-text)"
                      : "color-mix(in srgb, var(--primary) 30%, transparent)",
                  }}
                >
                  <Utensils size={16} />
                </Link>
                <Link
                  href="/personal/escritorio"
                  className="p-2 transition-all"
                  style={{
                    borderRadius: "var(--radius-btn)",
                    background: currentPath?.includes("/ensayos") ? "var(--primary)" : "transparent",
                    color: currentPath?.includes("/ensayos")
                      ? "var(--btn-text)"
                      : "color-mix(in srgb, var(--primary) 30%, transparent)",
                  }}
                >
                  <PenTool size={16} />
                </Link>
                <Link
                  href="/personal/ropa"
                  className="p-2 transition-all"
                  style={{
                    borderRadius: "var(--radius-btn)",
                    background: currentPath?.includes("/ropa") ? "var(--primary)" : "transparent",
                    color: currentPath?.includes("/ropa")
                      ? "var(--btn-text)"
                      : "color-mix(in srgb, var(--primary) 30%, transparent)",
                  }}
                >
                  <Shirt size={16} />
                </Link>
              </div>
            )}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-3">
            <DarkToggleBtn />

            {/* Botón tema desktop */}
            <div className="relative">
              <motion.button
                onClick={() => { setThemeMenuOpen(!themeMenuOpen); setUserMenuOpen(false); }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 transition-all"
                style={{
                  borderRadius: "var(--radius-btn)",
                  background: themeMenuOpen
                    ? "var(--primary)"
                    : "transparent",
                  color: themeMenuOpen
                    ? "var(--btn-text)"
                    : "color-mix(in srgb, var(--primary) 40%, transparent)",
                }}
              >
                <Palette size={16} />
              </motion.button>
              <AnimatePresence>
                {themeMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    onClick={e => e.stopPropagation()}
                    className="absolute top-full right-0 mt-3 w-56 z-[1001] overflow-hidden"
                    style={{
                      background: "var(--white-custom)",
                      border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                      borderRadius: "var(--radius-card)",
                      boxShadow: "var(--shadow-card)",
                    }}
                  >
                    <ThemeSelector />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User button */}
            {user ? (
              <div className="relative">
                <button
                  onClick={e => { e.stopPropagation(); setUserMenuOpen(!userMenuOpen); setThemeMenuOpen(false); }}
                  className="flex items-center gap-2 px-4 py-2 transition-all"
                  style={{
                    background: "color-mix(in srgb, var(--primary) 5%, transparent)",
                    borderRadius: "9999px",
                    border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 10%, transparent)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 5%, transparent)";
                  }}
                >
                  <span
                    className="text-[10px] font-black uppercase tracking-widest"
                    style={{ color: "color-mix(in srgb, var(--primary) 60%, transparent)" }}
                  >
                    {perfil?.username}
                  </span>
                  <CircleUser
                    size={24}
                    style={{
                      color: userMenuOpen
                        ? "var(--primary)"
                        : "color-mix(in srgb, var(--primary) 40%, transparent)",
                      transition: "color 0.2s",
                    }}
                  />
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      onClick={e => e.stopPropagation()}
                      className="absolute top-full right-0 mt-3 w-48 p-2 z-[1001]"
                      style={{
                        background: "var(--white-custom)",
                        border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                        borderRadius: "var(--radius-card)",
                        boxShadow: "var(--shadow-card)",
                      }}
                    >
                      <Link
                        href="/wiki/personal"
                        onClick={closeAll}
                        className="flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase transition-all"
                        style={{
                          color: "color-mix(in srgb, var(--primary) 60%, transparent)",
                          borderRadius: "var(--radius-btn)",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 5%, transparent)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "transparent";
                        }}
                      >
                        <Sword size={14} /> Mi Personaje
                      </Link>
                      <div
                        className="my-1"
                        style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 5%, transparent)" }}
                      />
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-3 text-[10px] font-black uppercase transition-all"
                        style={{
                          color: "oklch(0.6 0.2 25)",
                          borderRadius: "var(--radius-btn)",
                          background: "transparent",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "oklch(0.97 0.01 25)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "transparent";
                        }}
                      >
                        <LogOut size={14} /> Salir
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="text-[10px] font-black uppercase transition-colors"
                style={{ color: "color-mix(in srgb, var(--primary) 60%, transparent)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "var(--primary)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--primary) 60%, transparent)";
                }}
              >
                Entrar
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── MÓVIL ── */}
      <div className="md:hidden fixed bottom-0 left-0 w-full z-[1000]">
        <nav
          className="backdrop-blur-xl h-16 flex items-center w-full"
          style={{
            background: "color-mix(in srgb, var(--bg-main) 95%, transparent)",
            borderTop: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
            boxShadow: "0 -8px 32px color-mix(in srgb, var(--primary) 8%, transparent)",
          }}
        >
          {navContentMobile}
        </nav>

        <AnimatePresence>
          {userMenuOpen && user && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              onClick={e => e.stopPropagation()}
              className="absolute bottom-16 left-4 right-4 p-5 flex flex-col gap-3 z-[1001]"
              style={{
                background: "var(--white-custom)",
                border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                borderRadius: "var(--radius-card)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              {/* dark + user + logout */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggle}
                  className="w-11 h-11 flex items-center justify-center transition-all shrink-0"
                  style={{
                    borderRadius: "var(--radius-btn)",
                    border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                    color: "var(--primary)",
                    background: "transparent",
                  }}
                >
                  {isDark ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <Link
                  href="/wiki/personal"
                  onClick={closeAll}
                  className="flex-1 p-3 font-black uppercase text-[10px] flex items-center justify-center gap-2 transition-all"
                  style={{
                    background: "color-mix(in srgb, var(--primary) 5%, transparent)",
                    color: "var(--primary)",
                    borderRadius: "var(--radius-btn)",
                  }}
                >
                  <Sword size={16} /> {perfil?.username}
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-11 h-11 flex items-center justify-center transition-all shrink-0"
                  style={{
                    borderRadius: "var(--radius-btn)",
                    background: "oklch(0.97 0.01 25)",
                    color: "oklch(0.6 0.2 25)",
                  }}
                >
                  <LogOut size={18} />
                </button>
              </div>

              {/* Selector de tema */}
              <div
                className="overflow-hidden"
                style={{
                  border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
                  borderRadius: "var(--radius-card)",
                }}
              >
                <ThemeSelector />
              </div>

              {esFranilover && (
                <div className="grid grid-cols-3 gap-2">
                  <Link
                    href="/personal/salud"
                    onClick={closeAll}
                    className="p-4 flex items-center justify-center transition-all"
                    style={{
                      border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                      color: currentPath?.includes("/salud") ? "var(--btn-text)" : "var(--primary)",
                      background: currentPath?.includes("/salud") ? "var(--primary)" : "transparent",
                      borderRadius: "var(--radius-card)",
                    }}
                  >
                    <Utensils size={18} />
                  </Link>
                  <Link
                    href="/personal/escritorio"
                    onClick={closeAll}
                    className="p-4 flex items-center justify-center transition-all"
                    style={{
                      border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                      color: currentPath?.includes("/ensayos") ? "var(--btn-text)" : "var(--primary)",
                      background: currentPath?.includes("/ensayos") ? "var(--primary)" : "transparent",
                      borderRadius: "var(--radius-card)",
                    }}
                  >
                    <PenTool size={18} />
                  </Link>
                  <Link
                    href="/personal/ropa"
                    onClick={closeAll}
                    className="p-4 flex items-center justify-center transition-all"
                    style={{
                      border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                      color: currentPath?.includes("/ropa") ? "var(--btn-text)" : "var(--primary)",
                      background: currentPath?.includes("/ropa") ? "var(--primary)" : "transparent",
                      borderRadius: "var(--radius-card)",
                    }}
                  >
                    <Shirt size={18} />
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {(userMenuOpen || themeMenuOpen) && (
        <div
          className="fixed inset-0 z-[90]"
          style={{ background: "color-mix(in srgb, var(--foreground) 5%, transparent)" }}
          onClick={closeAll}
        />
      )}
    </>
  );
};

export default Navbar;