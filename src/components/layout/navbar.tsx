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
  Utensils, PenTool, Moon, Sun, Star, User, Palette, Shirt, Music2, BookOpen,
} from "lucide-react";

const Navbar = () => {
  const currentPath = usePathname();
  const { user, perfil } = useAuth() as { user: any; perfil: any };
  const [userMenuOpen, setUserMenuOpen]   = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const { isDark, toggle } = useDarkMode();

  const esFranilover = perfil?.username?.toLowerCase() === "franilover";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    window.location.href = "/";
  };

  const closeAll = () => {
    setUserMenuOpen(false);
    setThemeMenuOpen(false);
  };

  const isWiki     = currentPath?.startsWith("/wiki") ?? false;
  const isPersonal = currentPath?.startsWith("/personal") ?? false;

  // ── Links principales ────────────────────────────────────────────────────────
  const mainLinks = [
    {
      href: "/personal",
      label: "Personal",
      icon: Star,
      active: isPersonal,
      fillActive: true,
    },
    {
      href: "/wiki",
      label: "Wiki",
      icon: Flower2,
      active: isWiki,
      fillActive: false,
    },
  ];

  // ── Links de franilover ───────────────────────────────────────────────────────
  const franiLinks = [
    { href: "/myself/salud",      label: "Salud",      icon: Utensils, key: "/salud"       },
    { href: "/myself/escritorio", label: "Escritorio", icon: PenTool,  key: "/escritorio"  },
    { href: "/myself/ropa",       label: "Ropa",       icon: Shirt,    key: "/ropa"        },
  ];

  // ── MOBILE bottom nav ────────────────────────────────────────────────────────
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
      {/* ══════════════════════════════════════════════════════════════
          SIDEBAR — desktop
      ══════════════════════════════════════════════════════════════ */}
      <aside
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => { setSidebarExpanded(false); closeAll(); }}
        className="hidden md:flex fixed left-0 top-0 h-full z-[100] flex-col transition-all duration-300 ease-in-out"
        style={{
          width: sidebarExpanded ? "220px" : "68px",
          background: "color-mix(in srgb, var(--bg-main) 92%, transparent)",
          borderRight: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          onClick={closeAll}
          className="flex items-center gap-3 px-4 shrink-0 overflow-hidden"
          style={{
            height: "68px",
            color: "var(--primary)",
          }}
        >
          <span className="shrink-0 flex items-center justify-center" style={{ width: "36px" }}>
            <Flower2 size={22} />
          </span>
          <AnimatePresence>
            {sidebarExpanded && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                className="text-base font-black italic tracking-tighter whitespace-nowrap"
              >
                FRANI<span style={{ opacity: 0.35 }}>LOVER</span>
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        {/* Divider */}
        <div style={{ height: "1px", background: "color-mix(in srgb, var(--primary) 6%, transparent)", margin: "0 12px" }} />

        {/* Main nav links */}
        <nav className="flex flex-col gap-1 px-2 pt-3 flex-1">
          {mainLinks.map(({ href, label, icon: Icon, active, fillActive }) => (
            <Link
              key={href}
              href={href}
              onClick={closeAll}
              className="flex items-center gap-3 transition-all duration-200 overflow-hidden"
              style={{
                height: "44px",
                borderRadius: "var(--radius-btn)",
                background: active
                  ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                  : "transparent",
                color: active
                  ? "var(--primary)"
                  : "color-mix(in srgb, var(--primary) 40%, transparent)",
                paddingLeft: "10px",
                paddingRight: sidebarExpanded ? "12px" : "10px",
              }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 6%, transparent)";
                (e.currentTarget as HTMLElement).style.color = "var(--primary)";
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.color = active
                  ? "var(--primary)"
                  : "color-mix(in srgb, var(--primary) 40%, transparent)";
              }}
            >
              <span className="shrink-0 flex items-center justify-center" style={{ width: "28px" }}>
                <Icon
                  size={18}
                  fill={active && fillActive ? "currentColor" : "none"}
                  strokeWidth={active ? 2.5 : 2}
                />
              </span>
              <AnimatePresence>
                {sidebarExpanded && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.16 }}
                    className="text-[11px] font-black uppercase tracking-widest whitespace-nowrap"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
              {/* Active indicator dot (collapsed) */}
              {active && !sidebarExpanded && (
                <span
                  className="absolute left-[3px]"
                  style={{
                    width: "3px",
                    height: "20px",
                    borderRadius: "0 2px 2px 0",
                    background: "var(--primary)",
                  }}
                />
              )}
            </Link>
          ))}

          {/* Franilover links */}
          {esFranilover && (
            <>
              <div style={{ height: "1px", background: "color-mix(in srgb, var(--primary) 6%, transparent)", margin: "6px 4px" }} />
              {franiLinks.map(({ href, label, icon: Icon, key }) => {
                const active = !!currentPath?.includes(key);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={closeAll}
                    className="flex items-center gap-3 transition-all duration-200 overflow-hidden"
                    style={{
                      height: "44px",
                      borderRadius: "var(--radius-btn)",
                      background: active
                        ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                        : "transparent",
                      color: active
                        ? "var(--primary)"
                        : "color-mix(in srgb, var(--primary) 40%, transparent)",
                      paddingLeft: "10px",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 6%, transparent)";
                      (e.currentTarget as HTMLElement).style.color = "var(--primary)";
                    }}
                    onMouseLeave={(e) => {
                      if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
                      (e.currentTarget as HTMLElement).style.color = active
                        ? "var(--primary)"
                        : "color-mix(in srgb, var(--primary) 40%, transparent)";
                    }}
                  >
                    <span className="shrink-0 flex items-center justify-center" style={{ width: "28px" }}>
                      <Icon size={16} strokeWidth={active ? 2.5 : 2} />
                    </span>
                    <AnimatePresence>
                      {sidebarExpanded && (
                        <motion.span
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -6 }}
                          transition={{ duration: 0.16 }}
                          className="text-[11px] font-black uppercase tracking-widest whitespace-nowrap"
                        >
                          {label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Bottom controls */}
        <div className="flex flex-col gap-1 px-2 pb-4 shrink-0">
          <div style={{ height: "1px", background: "color-mix(in srgb, var(--primary) 6%, transparent)", margin: "4px 4px 8px" }} />

          {/* Dark mode */}
          <button
            onClick={toggle}
            className="flex items-center gap-3 transition-all duration-200 overflow-hidden"
            style={{
              height: "44px",
              borderRadius: "var(--radius-btn)",
              color: "color-mix(in srgb, var(--primary) 40%, transparent)",
              paddingLeft: "10px",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 6%, transparent)";
              (e.currentTarget as HTMLElement).style.color = "var(--primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--primary) 40%, transparent)";
            }}
          >
            <span className="shrink-0 flex items-center justify-center" style={{ width: "28px" }}>
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
            </span>
            <AnimatePresence>
              {sidebarExpanded && (
                <motion.span
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.16 }}
                  className="text-[11px] font-black uppercase tracking-widest whitespace-nowrap"
                >
                  {isDark ? "Modo claro" : "Modo oscuro"}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {/* Theme picker */}
          <div className="relative">
            <button
              onClick={() => { setThemeMenuOpen(!themeMenuOpen); setUserMenuOpen(false); }}
              className="flex items-center gap-3 transition-all duration-200 overflow-hidden w-full"
              style={{
                height: "44px",
                borderRadius: "var(--radius-btn)",
                background: themeMenuOpen ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent",
                color: themeMenuOpen ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)",
                paddingLeft: "10px",
              }}
              onMouseEnter={(e) => {
                if (!themeMenuOpen) (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 6%, transparent)";
                (e.currentTarget as HTMLElement).style.color = "var(--primary)";
              }}
              onMouseLeave={(e) => {
                if (!themeMenuOpen) (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.color = themeMenuOpen ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)";
              }}
            >
              <span className="shrink-0 flex items-center justify-center" style={{ width: "28px" }}>
                <Palette size={16} />
              </span>
              <AnimatePresence>
                {sidebarExpanded && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.16 }}
                    className="text-[11px] font-black uppercase tracking-widest whitespace-nowrap"
                  >
                    Tema
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
            <AnimatePresence>
              {themeMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -8, scale: 0.97 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -8, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  onClick={e => e.stopPropagation()}
                  className="absolute bottom-full left-full ml-2 mb-0 w-56 z-[1001] overflow-hidden"
                  style={{
                    background: "var(--white-custom)",
                    border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                    borderRadius: "var(--radius-card)",
                    boxShadow: "var(--shadow-card)",
                    bottom: "0",
                    top: "auto",
                  }}
                >
                  <ThemeSelector />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User */}
          {user ? (
            <div className="relative">
              <button
                onClick={e => { e.stopPropagation(); setUserMenuOpen(!userMenuOpen); setThemeMenuOpen(false); }}
                className="flex items-center gap-3 transition-all duration-200 overflow-hidden w-full"
                style={{
                  height: "44px",
                  borderRadius: "var(--radius-btn)",
                  background: userMenuOpen ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent",
                  color: userMenuOpen ? "var(--primary)" : "color-mix(in srgb, var(--primary) 50%, transparent)",
                  paddingLeft: "10px",
                }}
                onMouseEnter={(e) => {
                  if (!userMenuOpen) (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 6%, transparent)";
                  (e.currentTarget as HTMLElement).style.color = "var(--primary)";
                }}
                onMouseLeave={(e) => {
                  if (!userMenuOpen) (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = userMenuOpen ? "var(--primary)" : "color-mix(in srgb, var(--primary) 50%, transparent)";
                }}
              >
                <span className="shrink-0 flex items-center justify-center" style={{ width: "28px" }}>
                  <CircleUser size={18} />
                </span>
                <AnimatePresence>
                  {sidebarExpanded && (
                    <motion.span
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      transition={{ duration: 0.16 }}
                      className="text-[11px] font-black uppercase tracking-widest whitespace-nowrap truncate max-w-[110px]"
                    >
                      {perfil?.username}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, x: -8, scale: 0.97 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -8, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    onClick={e => e.stopPropagation()}
                    className="absolute left-full ml-2 w-48 p-2 z-[1001]"
                    style={{
                      bottom: "0",
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
                        (e.currentTarget as HTMLElement).style.color = "var(--primary)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                        (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--primary) 60%, transparent)";
                      }}
                    >
                      <Sword size={14} /> Mi Personaje
                    </Link>
                    <div style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 5%, transparent)", margin: "4px 0" }} />
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
              className="flex items-center gap-3 transition-all duration-200 overflow-hidden"
              style={{
                height: "44px",
                borderRadius: "var(--radius-btn)",
                color: "color-mix(in srgb, var(--primary) 50%, transparent)",
                paddingLeft: "10px",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 6%, transparent)";
                (e.currentTarget as HTMLElement).style.color = "var(--primary)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--primary) 50%, transparent)";
              }}
            >
              <span className="shrink-0 flex items-center justify-center" style={{ width: "28px" }}>
                <CircleUser size={18} />
              </span>
              <AnimatePresence>
                {sidebarExpanded && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.16 }}
                    className="text-[11px] font-black uppercase tracking-widest whitespace-nowrap"
                  >
                    Entrar
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          )}
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════
          MÓVIL — bottom bar (igual que antes)
      ══════════════════════════════════════════════════════════════ */}
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
                <div className="grid grid-cols-4 gap-2">
                  <Link
                    href="/myself/salud"
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
                    href="/myself/escritorio"
                    onClick={closeAll}
                    className="p-4 flex items-center justify-center transition-all"
                    style={{
                      border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                      color: currentPath?.includes("/escritorio") ? "var(--btn-text)" : "var(--primary)",
                      background: currentPath?.includes("/escritorio") ? "var(--primary)" : "transparent",
                      borderRadius: "var(--radius-card)",
                    }}
                  >
                    <PenTool size={18} />
                  </Link>
                  <Link
                    href="/myself/ropa"
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