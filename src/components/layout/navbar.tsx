"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/api/client/supabase";
import { useDarkMode } from "@/hooks/features/useDarkMode";
import { ThemeSelector } from "@/providers/ThemeProvider";
import {
  LogOut, CircleUser, Flower2,
  Utensils, PenTool, Moon, Sun, Star, Palette, Shirt, Sword,
  BookOpen, Compass, BookText, Music, UserCircle2, Camera,
  ChevronRight,
} from "lucide-react";

// ─── Sub-páginas de Wiki ───────────────────────────────────────────────────────
const wikiSubLinks = [
  { href: "/wiki/personal",   label: "Mi Personaje", icon: UserCircle2 },
  { href: "/wiki/mapa",       label: "Mapa",         icon: Compass     },
  { href: "/wiki/libros",     label: "Libros",       icon: BookText    },
  { href: "/wiki/canciones",  label: "Canciones",    icon: Music       },
];

// ─── Sub-páginas de Personal ───────────────────────────────────────────────────
const personalSubLinks = [
  { href: "/personal/sobre-mi", label: "Sobre Mí", icon: Star    },
  { href: "/personal/dibujos",  label: "Dibujos",  icon: Palette },
  { href: "/personal/fotos",    label: "Fotos",    icon: Camera  },
];

// ─── Estilos inline reutilizables ─────────────────────────────────────────────
const navItemBase = {
  height: "44px",
  borderRadius: "var(--radius-btn)",
  paddingLeft: "10px",
} as const;

const submenuSurface = {
  background: "var(--white-custom)",
  border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
  borderRadius: "var(--radius-card)",
  boxShadow: "var(--shadow-card)",
} as const;

// ─── Variantes de animación del submenú lateral (desktop) ─────────────────────
const flyoutVariants = {
  hidden: { opacity: 0, x: -8, scale: 0.97 },
  visible: { opacity: 1, x: 0, scale: 1 },
  exit:    { opacity: 0, x: -8, scale: 0.97 },
};

// ─── Componente de ítem de submenú lateral ─────────────────────────────────────
function SideSubItem({
  href, label, icon: Icon, active, onClick,
}: {
  href: string; label: string; icon: React.ElementType; active: boolean; onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all"
      style={{
        borderRadius: "var(--radius-btn)",
        background: active ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent",
        color: active ? "var(--primary)" : "color-mix(in srgb, var(--primary) 60%, transparent)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 6%, transparent)";
        (e.currentTarget as HTMLElement).style.color = "var(--primary)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = active
          ? "color-mix(in srgb, var(--primary) 8%, transparent)"
          : "transparent";
        (e.currentTarget as HTMLElement).style.color = active
          ? "var(--primary)"
          : "color-mix(in srgb, var(--primary) 60%, transparent)";
      }}
    >
      <Icon size={13} strokeWidth={active ? 2.5 : 2} />
      {label}
    </Link>
  );
}

// ─── Componente de ítem principal del sidebar con flyout ──────────────────────
function SideNavItem({
  href, label, icon: Icon, active, fillActive,
  subLinks, sidebarExpanded, onClose,
}: {
  href: string; label: string; icon: React.ElementType;
  active: boolean; fillActive?: boolean;
  subLinks?: { href: string; label: string; icon: React.ElementType }[];
  sidebarExpanded: boolean; onClose: () => void;
}) {
  const currentPath = usePathname();
  const [open, setOpen] = useState(false);
  const hasSublinks = !!subLinks?.length;

  // NUEVO: Cerrar el submenú si la ruta cambia
  useEffect(() => {
    setOpen(false);
  }, [currentPath]);

  return (
    <div
      className="relative"
      onMouseEnter={() => hasSublinks && setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        href={href}
        onClick={onClose}
        className="flex items-center gap-3 transition-all duration-200 overflow-hidden"
        style={{
          ...navItemBase,
          background: active
            ? "color-mix(in srgb, var(--primary) 10%, transparent)"
            : "transparent",
          color: active
            ? "var(--primary)"
            : "color-mix(in srgb, var(--primary) 40%, transparent)",
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
        {/* Indicador activo (collapsed) */}
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
              className="flex-1 text-[11px] font-black uppercase tracking-widest whitespace-nowrap"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Chevron (solo expanded + sublinks) */}
        <AnimatePresence>
          {sidebarExpanded && hasSublinks && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
            >
              <ChevronRight
                size={12}
                style={{
                  color: "color-mix(in srgb, var(--primary) 30%, transparent)",
                  flexShrink: 0,
                }}
              />
            </motion.span>
          )}
        </AnimatePresence>
      </Link>

      {/* Flyout lateral */}
      <AnimatePresence>
        {open && hasSublinks && (
          <motion.div
            variants={flyoutVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-0 left-full ml-2 z-[1010] p-2 w-44"
            style={submenuSurface}
          >
            {/* Label de sección */}
            <p
              className="text-[8px] font-black uppercase tracking-widest px-2 pb-1.5"
              style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
            >
              {label}
            </p>
            {subLinks!.map(({ href: sub, label: subLabel, icon: SubIcon }) => (
              <SideSubItem
                key={sub}
                href={sub}
                label={subLabel}
                icon={SubIcon}
                active={!!currentPath?.startsWith(sub)}
                onClick={() => { setOpen(false); onClose(); }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Ítem del bottom nav móvil con desplegable hacia arriba ───────────────────
function MobileNavItem({
  href, label, icon: Icon, active, fillActive,
  subLinks, isOpen, onToggle, onClose,
}: {
  href: string; label: string; icon: React.ElementType;
  active: boolean; fillActive?: boolean;
  subLinks?: { href: string; label: string; icon: React.ElementType }[];
  isOpen: boolean; onToggle: () => void; onClose: () => void;
}) {
  const currentPath = usePathname();
  const hasSublinks = !!subLinks?.length;

  const itemStyle = {
    padding: "6px 14px",
    borderRadius: "var(--radius-btn)",
    background: active ? "var(--primary)" : "transparent",
    color: active ? "var(--btn-text)" : "color-mix(in srgb, var(--primary) 40%, transparent)",
    touchAction: "manipulation" as const, 
  };

  if (!hasSublinks) {
    return (
      <Link href={href} onClick={onClose} className="flex items-center gap-1.5 transition-all" style={itemStyle}>
        <Icon size={14} fill={active && fillActive ? "currentColor" : "none"} strokeWidth={active ? 2.5 : 2} />
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }}
        className="flex items-center gap-1.5 transition-all"
        style={{
          ...itemStyle,
          background: (active || isOpen) ? "var(--primary)" : "transparent",
          color: (active || isOpen)
            ? "var(--btn-text)"
            : "color-mix(in srgb, var(--primary) 40%, transparent)",
        }}
      >
        <Icon size={14} fill={active && fillActive ? "currentColor" : "none"} strokeWidth={active ? 2.5 : 2} />
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
        <ChevronRight
          size={10}
          style={{
            transform: isOpen ? "rotate(-90deg)" : "rotate(90deg)",
            transition: "transform 0.2s ease",
            opacity: 0.6,
          }}
        />
      </button>

      {/* Panel hacia arriba */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-full mb-2 right-0 z-[2000] p-2 w-44"
            style={submenuSurface}
          >
            <p
              className="text-[8px] font-black uppercase tracking-widest px-2 pb-1.5"
              style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
            >
              {label}
            </p>
            {subLinks!.map(({ href: sub, label: subLabel, icon: SubIcon }) => (
              <Link
                key={sub}
                href={sub}
                onClick={() => { setTimeout(() => onClose(), 150); }}
                className="flex items-center gap-2.5 px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all"
                style={{
                  borderRadius: "var(--radius-btn)",
                  background: currentPath?.startsWith(sub)
                    ? "color-mix(in srgb, var(--primary) 8%, transparent)"
                    : "transparent",
                  color: currentPath?.startsWith(sub)
                    ? "var(--primary)"
                    : "color-mix(in srgb, var(--primary) 60%, transparent)",
                }}
              >
                <SubIcon size={13} />
                {subLabel}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Navbar principal ──────────────────────────────────────────────────────────
const Navbar = () => {
  const currentPath = usePathname();
  const { user, perfil } = useAuth() as { user: any; perfil: any };
  const [userMenuOpen, setUserMenuOpen]     = useState(false);
  const [themeMenuOpen, setThemeMenuOpen]   = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mobileOpenMenu, setMobileOpenMenu] = useState<string | null>(null);
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
    setMobileOpenMenu(null);
    setSidebarExpanded(false); // NUEVO: Fozar colapso del sidebar en escritorio
  };

  // NUEVO: Asegurarse de que cualquier navegación cierre los menús automáticamente
  useEffect(() => {
    closeAll();
  }, [currentPath]);

  const isWiki     = currentPath?.startsWith("/wiki") ?? false;
  const isPersonal = currentPath?.startsWith("/personal") ?? false;

  const mainLinks = [
    {
      href: "/personal", label: "Personal", icon: Star,
      active: isPersonal, fillActive: true,
      subLinks: personalSubLinks,
    },
    {
      href: "/wiki", label: "Wiki", icon: Flower2,
      active: isWiki, fillActive: false,
      subLinks: wikiSubLinks,
    },
  ];

  const franiLinks = [
    { href: "/wiki/enciclopedia", label: "Información", icon: BookOpen, key: "/enciclopedia" },
    { href: "/myself/salud",      label: "Salud",        icon: Utensils, key: "/salud"        },
    { href: "/myself/escritorio", label: "Escritorio",   icon: PenTool,  key: "/escritorio"   },
    { href: "/myself/ropa",       label: "Ropa",         icon: Shirt,    key: "/ropa"         },
  ];

  return (
    <>
      {/* ══════════════════════════════════════════
          SIDEBAR DESKTOP
      ══════════════════════════════════════════ */}
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
          style={{ height: "68px", color: "var(--primary)" }}
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

        <div style={{ height: "1px", background: "color-mix(in srgb, var(--primary) 6%, transparent)", margin: "0 12px" }} />

        {/* Links principales con flyout */}
        <nav className="flex flex-col gap-1 px-2 pt-3 flex-1">
          {mainLinks.map(({ href, label, icon, active, fillActive, subLinks }) => (
            <SideNavItem
              key={href}
              href={href}
              label={label}
              icon={icon}
              active={active}
              fillActive={fillActive}
              subLinks={subLinks}
              sidebarExpanded={sidebarExpanded}
              onClose={closeAll}
            />
          ))}

          {/* Links de Franilover */}
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
                      ...navItemBase,
                      background: active ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent",
                      color: active ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)",
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

        {/* Controles inferiores */}
        <div className="flex flex-col gap-1 px-2 pb-4 shrink-0">
          <div style={{ height: "1px", background: "color-mix(in srgb, var(--primary) 6%, transparent)", margin: "4px 4px 8px" }} />

          {/* Dark mode toggle */}
          <button
            onClick={toggle}
            className="flex items-center gap-3 transition-all duration-200 overflow-hidden"
            style={{ ...navItemBase, color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
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
                ...navItemBase,
                background: themeMenuOpen ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent",
                color: themeMenuOpen ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)",
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
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-full ml-2 w-56 z-[1001] overflow-hidden"
                  style={{ ...submenuSurface, bottom: "0", top: "auto" }}
                >
                  <ThemeSelector />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User menu */}
          {user ? (
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setUserMenuOpen(!userMenuOpen); setThemeMenuOpen(false); }}
                className="flex items-center gap-3 transition-all duration-200 overflow-hidden w-full"
                style={{
                  ...navItemBase,
                  background: userMenuOpen ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent",
                  color: userMenuOpen ? "var(--primary)" : "color-mix(in srgb, var(--primary) 50%, transparent)",
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
                    onClick={(e) => e.stopPropagation()}
                    className="absolute left-full ml-2 w-48 p-2 z-[1001]"
                    style={{ ...submenuSurface, bottom: "0" }}
                  >
                    <Link
                      href="/wiki/personal"
                      onClick={closeAll}
                      className="flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase transition-all"
                      style={{ color: "color-mix(in srgb, var(--primary) 60%, transparent)", borderRadius: "var(--radius-btn)" }}
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
                      style={{ color: "oklch(0.6 0.2 25)", borderRadius: "var(--radius-btn)", background: "transparent" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.97 0.01 25)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
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
              style={{ ...navItemBase, color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}
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

      {/* ══════════════════════════════════════════
          BOTTOM NAV MÓVIL
      ══════════════════════════════════════════ */}
      <div className="md:hidden fixed bottom-0 left-0 w-full z-[1000]">

        {/* Theme panel */}
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
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-full right-4 mb-2 w-56 overflow-hidden z-[2000]"
                style={submenuSurface}
              >
                <ThemeSelector />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Overlay para cerrar submenús móviles */}
        <AnimatePresence>
          {mobileOpenMenu && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[90]"
              onClick={closeAll}
            />
          )}
        </AnimatePresence>

        {/* Bottom bar container elevado */}
        <div
          className="flex items-center px-4 relative z-[100]"
          style={{
            height: "56px",
            background: "color-mix(in srgb, var(--bg-main) 90%, transparent)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
          }}
        >
          <div className="flex-1" />

          {/* Navegación principal con dropdowns */}
          <div
            className="flex items-center gap-1 p-1"
            style={{
              background: "color-mix(in srgb, var(--primary) 5%, transparent)",
              borderRadius: "var(--radius-card)",
              border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
            }}
          >
            {mainLinks.map(({ href, label, icon, active, fillActive, subLinks }) => (
              <MobileNavItem
                key={href}
                href={href}
                label={label}
                icon={icon}
                active={active}
                fillActive={fillActive}
                subLinks={subLinks}
                isOpen={mobileOpenMenu === href}
                onToggle={() => setMobileOpenMenu(mobileOpenMenu === href ? null : href)}
                onClose={closeAll}
              />
            ))}
          </div>

          {/* Controles derecha */}
          <div className="flex-1 flex items-center justify-end gap-1">

            {/* Theme button */}
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => { setThemeMenuOpen(!themeMenuOpen); setUserMenuOpen(false); setMobileOpenMenu(null); }}
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

            {/* User button */}
            <div className="relative">
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => user
                  ? (setUserMenuOpen(!userMenuOpen), setThemeMenuOpen(false), setMobileOpenMenu(null))
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

              <AnimatePresence>
                {userMenuOpen && user && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-full right-0 mb-2 overflow-hidden z-[2000]"
                    style={{ width: 180, ...submenuSurface }}
                  >
                    <div className="px-4 py-3" style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 6%, transparent)" }}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary truncate">{perfil?.username}</p>
                    </div>

                    <Link
                      href="/wiki/personal"
                      onClick={() => setTimeout(closeAll, 150)}
                      className="flex items-center gap-2.5 px-4 py-3 transition-all"
                      style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)", borderBottom: "1px solid color-mix(in srgb, var(--primary) 6%, transparent)" }}
                    >
                      <CircleUser size={13} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Mi perfil</span>
                    </Link>

                    {esFranilover && (
                      <div className="p-2" style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 6%, transparent)" }}>
                        <p className="text-[8px] font-black uppercase tracking-widest px-2 pb-1.5" style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>Franilover</p>
                        {franiLinks.map(({ href, icon: Icon, label, key }) => {
                          const active = !!currentPath?.includes(key);
                          return (
                            <Link
                              key={href}
                              href={href}
                              onClick={() => setTimeout(closeAll, 150)}
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