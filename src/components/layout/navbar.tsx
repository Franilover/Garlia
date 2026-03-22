"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/app/providers/AuthProvider";
import { supabase } from "@/lib/api/client/supabase";
import { useDarkMode } from "@/hooks/features/useDarkMode";
import { ThemeSelector } from "@/app/providers/ThemeProvider";
import {
  LogOut, CircleUser, Flower2,
  Utensils, PenTool, Moon, Sun, Star, Palette, Shirt, Sword
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

  const mainLinks = [
    { href: "/personal", label: "Personal", icon: Star,    active: isPersonal, fillActive: true  },
    { href: "/wiki",     label: "Wiki",      icon: Flower2, active: isWiki,     fillActive: false },
  ];

  const franiLinks = [
    { href: "/myself/salud",      label: "Salud",      icon: Utensils, key: "/salud"      },
    { href: "/myself/escritorio", label: "Escritorio", icon: PenTool,  key: "/escritorio" },
    { href: "/myself/ropa",       label: "Ropa",       icon: Shirt,    key: "/ropa"       },
  ];

  return (
    <>
      {}
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
        {}
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

        {}
        <div style={{ height: "1px", background: "color-mix(in srgb, var(--primary) 6%, transparent)", margin: "0 12px" }} />

        {}
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
              {}
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

          {}
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

        {}
        <div className="flex flex-col gap-1 px-2 pb-4 shrink-0">
          <div style={{ height: "1px", background: "color-mix(in srgb, var(--primary) 6%, transparent)", margin: "4px 4px 8px" }} />

          {}
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

          {}
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

          {}
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

      {}
      <div className="md:hidden fixed bottom-0 left-0 w-full z-[1000]">

        {}
        <AnimatePresence>
          {themeMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[90]"
                onClick={closeAll}
              />
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                onClick={e => e.stopPropagation()}
                className="absolute bottom-full right-4 mb-2 w-56 overflow-hidden z-[1001]"
                style={{
                  background: "var(--white-custom)",
                  border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                  borderRadius: "var(--radius-card)",
                  boxShadow: "0 8px 32px color-mix(in srgb, var(--primary) 15%, transparent)",
                }}
              >
                <ThemeSelector />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {}
        <div
          className="flex items-center px-4"
          style={{
            height: "56px",
            background: "color-mix(in srgb, var(--bg-main) 90%, transparent)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
          }}
        >
          {}
          <div className="flex-1" />

          {}
          <div
            className="flex items-center gap-1 p-1"
            style={{
              background: "color-mix(in srgb, var(--primary) 5%, transparent)",
              borderRadius: "var(--radius-card)",
              border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
            }}
          >
            {mainLinks.map(({ href, label, icon: Icon, active, fillActive }) => (
              <Link
                key={href}
                href={href}
                onClick={closeAll}
                className="flex items-center gap-1.5 transition-all"
                style={{
                  padding: "6px 14px",
                  borderRadius: "var(--radius-btn)",
                  background: active ? "var(--primary)" : "transparent",
                  color: active ? "var(--btn-text)" : "color-mix(in srgb, var(--primary) 40%, transparent)",
                }}
              >
                <Icon size={14} fill={active && fillActive ? "currentColor" : "none"} strokeWidth={active ? 2.5 : 2} />
                <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
              </Link>
            ))}
          </div>

          {}
          <div className="flex-1 flex items-center justify-end gap-1">

            {}
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => { setThemeMenuOpen(!themeMenuOpen); setUserMenuOpen(false); }}
              className="flex items-center justify-center transition-all"
              style={{
                width: 34, height: 34,
                borderRadius: "var(--radius-btn)",
                background: themeMenuOpen ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent",
                color: themeMenuOpen ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)",
              }}
            >
              <Palette size={16} />
            </motion.button>

            {}
            <div className="relative">
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => user
                  ? (setUserMenuOpen(!userMenuOpen), setThemeMenuOpen(false))
                  : (window.location.href = "/auth/login")
                }
                className="flex items-center justify-center transition-all"
                style={{
                  width: 34, height: 34,
                  borderRadius: "var(--radius-btn)",
                  background: userMenuOpen ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent",
                  color: userMenuOpen ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)",
                }}
              >
                <CircleUser size={16} />
              </motion.button>

              {}
              <AnimatePresence>
                {userMenuOpen && user && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    onClick={e => e.stopPropagation()}
                    className="absolute bottom-full right-0 mb-2 overflow-hidden z-[1001]"
                    style={{
                      width: 180,
                      background: "var(--white-custom)",
                      border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                      borderRadius: "var(--radius-card)",
                      boxShadow: "0 8px 32px color-mix(in srgb, var(--primary) 15%, transparent)",
                    }}
                  >
                    {}
                    <div className="px-4 py-3" style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 6%, transparent)" }}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary truncate">{perfil?.username}</p>
                    </div>

                    {}
                    <Link
                      href="/wiki/personal"
                      onClick={closeAll}
                      className="flex items-center gap-2.5 px-4 py-3 transition-all"
                      style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)", borderBottom: "1px solid color-mix(in srgb, var(--primary) 6%, transparent)" }}
                    >
                      <CircleUser size={13} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Mi perfil</span>
                    </Link>

                    {}
                    {esFranilover && (
                      <div className="p-2" style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 6%, transparent)" }}>
                        <p className="text-[8px] font-black uppercase tracking-widest px-2 pb-1.5" style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>Franilover</p>
                        {franiLinks.map(({ href, icon: Icon, label, key }) => {
                          const active = !!currentPath?.includes(key);
                          return (
                            <Link
                              key={href}
                              href={href}
                              onClick={closeAll}
                              className="flex items-center gap-2.5 px-2 py-2 rounded-[var(--radius-btn)] transition-all"
                              style={{
                                background: active ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent",
                                color: active ? "var(--primary)" : "color-mix(in srgb, var(--primary) 50%, transparent)",
                              }}
                            >
                              <Icon size={13} />
                              <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}

                    {}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-3 transition-all"
                      style={{ color: "oklch(0.55 0.18 25)" }}
                    >
                      <LogOut size={13} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Salir</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </div>
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