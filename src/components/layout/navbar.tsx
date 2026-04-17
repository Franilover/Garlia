"use client";
import { MotionDiv, MotionMain, MotionH1, MotionH2, MotionButton, MotionLi, MotionSpan, MotionP, MotionSection, MotionArticle, MotionImg } from "@/components/ui/Motion";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/api/client/supabase";
import { useTheme, ThemeSelector, ACCENT_OPTIONS } from "@/providers/ThemeProvider";
import {
  LogOut, CircleUser, Flower2,
  Utensils, PenTool, Moon, Sun, Star, Palette, Shirt, Sword,
  BookOpen, Compass, BookText, Music, UserCircle2, Camera,
  ChevronRight, Calendar, FileText, Dumbbell, ShoppingCart,
  UtensilsCrossed, Carrot, Cat, House,
} from "lucide-react";

// ─── Sublinks ────────────────────────────────────────────────────────────────
const wikiSubLinks = [
  { href: "/wiki/personal",  label: "Mi Personaje", icon: UserCircle2 },
  { href: "/wiki/mapa",      label: "Mapa",         icon: Compass     },
  { href: "/wiki/libros",    label: "Libros",       icon: BookText    },
  { href: "/wiki/canciones", label: "Canciones",    icon: Music       },
];
const personalSubLinks = [
  { href: "/personal/sobre-mi", label: "Sobre Mí", icon: Star    },
  { href: "/personal/galeria",  label: "Galeria",  icon: Palette },
];
const jardinSubLinks = [
  { href: "/myself/jardin?panel=capitulos", label: "Capítulos", icon: BookOpen  },
  { href: "/myself/jardin?panel=letras",    label: "Letras",    icon: Music     },
  { href: "/myself/jardin?panel=entidades", label: "Entidades", icon: Cat       },
];
const escritorioSubLinks = [
  { href: "/myself/escritorio?panel=agenda",  label: "Agenda",  icon: Calendar     },
  { href: "/myself/escritorio?panel=ensayos", label: "Ensayos", icon: FileText     },
  { href: "/myself/escritorio?panel=ropa",    label: "Ropa",    icon: ShoppingCart },
];
const saludSubLinks = [
  { href: "/myself/salud?panel=recetas",      label: "Recetas",      icon: UtensilsCrossed },
  { href: "/myself/salud?panel=ingredientes", label: "Ingredientes", icon: Carrot          },
  { href: "/myself/salud?panel=ejercicios",   label: "Ejercicios",   icon: Dumbbell        },
  { href: "/myself/salud?panel=compras",      label: "Compras",      icon: ShoppingCart    },
];

// Grupo anidado: escritorio + salud bajo un mismo item "Personal"
const personalMyselfGroups = [
  { href: "/myself/escritorio", label: "Escritorio", icon: PenTool,  subLinks: escritorioSubLinks },
  { href: "/myself/salud",      label: "Salud",      icon: Utensils, subLinks: saludSubLinks      },
];

// ─── Estilos compartidos ─────────────────────────────────────────────────────
const navItemBase = {
  height: "44px",
  borderRadius: "var(--radius-btn)",
  paddingLeft: "10px",
} as const;

const submenuSurface = {
  background: "var(--white-custom)",
  border: "var(--border-width) solid color-mix(in srgb, var(--primary) 15%, transparent)",
  borderRadius: "var(--radius-card)",
  boxShadow: "var(--shadow-card)",
} as const;

const flyoutVariants = {
  hidden:  { opacity: 0, x: -8, scale: 0.97 },
  visible: { opacity: 1, x: 0,  scale: 1    },
  exit:    { opacity: 0, x: -8, scale: 0.97 },
};

// ─── SideSubItem ─────────────────────────────────────────────────────────────
function SideSubItem({
  href, label, icon: Icon, active, onClick,
}: {
  href: string; label: string; icon: React.ElementType;
  active: boolean; onClick: () => void;
}) {
  return (
    <Link
      href={href} onClick={onClick}
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
        (e.currentTarget as HTMLElement).style.background = active ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent";
        (e.currentTarget as HTMLElement).style.color = active ? "var(--primary)" : "color-mix(in srgb, var(--primary) 60%, transparent)";
      }}
    >
      <Icon size={13} strokeWidth={active ? 2.5 : 2} />
      {label}
    </Link>
  );
}

// ─── SideNavItem — sidebar desktop con flyout al hover ────────────────────────
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

  useEffect(() => { setOpen(false); }, [currentPath]);

  return (
    <div
      className="relative"
      onMouseEnter={() => hasSublinks && setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        href={href} onClick={onClose}
        className="flex items-center gap-3 transition-all duration-200 overflow-hidden"
        style={{
          ...navItemBase,
          background: active ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent",
          color: active ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)",
          paddingRight: sidebarExpanded ? "12px" : "10px",
        }}
        onMouseEnter={(e) => {
          if (!active) (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 6%, transparent)";
          (e.currentTarget as HTMLElement).style.color = "var(--primary)";
        }}
        onMouseLeave={(e) => {
          if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
          (e.currentTarget as HTMLElement).style.color = active ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)";
        }}
      >
        {active && !sidebarExpanded && (
          <span className="absolute left-[3px]" style={{ width: "3px", height: "20px", borderRadius: "0 2px 2px 0", background: "var(--primary)" }} />
        )}
        <span className="shrink-0 flex items-center justify-center" style={{ width: "28px" }}>
          <Icon size={18} fill={active && fillActive ? "currentColor" : "none"} strokeWidth={active ? 2.5 : 2} />
        </span>
        <AnimatePresence>
          {sidebarExpanded && (
            <MotionSpan initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.16 }}
              className="flex-1 text-[11px] font-black uppercase tracking-widest whitespace-nowrap">
              {label}
            </MotionSpan>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {sidebarExpanded && hasSublinks && (
            <MotionSpan initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
              <ChevronRight size={12} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)", flexShrink: 0 }} />
            </MotionSpan>
          )}
        </AnimatePresence>
      </Link>

      {/* Flyout lateral */}
      <AnimatePresence>
        {open && hasSublinks && (
          <MotionDiv
            variants={flyoutVariants} initial="hidden" animate="visible" exit="exit"
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-0 left-full ml-2 z-[1010] p-2 w-44"
            style={submenuSurface}
          >
            <p className="text-[8px] font-black uppercase tracking-widest px-2 pb-1.5"
              style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
              {label}
            </p>
            {subLinks!.map(({ href: sub, label: subLabel, icon: SubIcon }) => (
              <SideSubItem
                key={sub} href={sub} label={subLabel} icon={SubIcon}
                active={!!currentPath?.includes(sub.split("?")[0])}
                onClick={() => { setOpen(false); onClose(); }}
              />
            ))}
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── MobileNavItem — label navega, flecha abre submenú ───────────────────────
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

  const btnStyle = (isActive: boolean, menuOpen: boolean): React.CSSProperties => ({
    borderRadius: "var(--radius-btn)",
    background: (isActive || menuOpen) ? "var(--primary)" : "transparent",
    color: (isActive || menuOpen) ? "var(--btn-text)" : "color-mix(in srgb, var(--primary) 40%, transparent)",
    touchAction: "manipulation",
  });

  // Sin sublinks → icono simple
  if (!hasSublinks) {
    return (
      <Link href={href} onClick={onClose}
        className="flex items-center justify-center transition-all"
        style={{ ...btnStyle(active, false), width: 36, height: 36 }}
      >
        <Icon size={16} fill={active && fillActive ? "currentColor" : "none"} strokeWidth={active ? 2.5 : 2} />
      </Link>
    );
  }

  // Con sublinks → icono que abre desplegable al tocar
  return (
    <div className="relative flex items-stretch">
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(); }}
        className="flex items-center justify-center transition-all"
        style={{ ...btnStyle(active, isOpen), width: 36, height: 36 }}
      >
        <Icon size={16} fill={active && fillActive ? "currentColor" : "none"} strokeWidth={active ? 2.5 : 2} />
      </button>

      {/* Panel hacia arriba */}
      <AnimatePresence>
        {isOpen && (
          <MotionDiv
            initial={{ opacity: 0, y: 8, scale: 0.97, x: "-50%" }}
            animate={{ opacity: 1, y: 0, scale: 1,    x: "-50%" }}
            exit={{ opacity: 0, y: 8, scale: 0.97,    x: "-50%" }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-full mb-2 left-1/2 z-[2000] p-2 w-44 origin-bottom"
            style={submenuSurface}
          >
            <p className="text-[8px] font-black uppercase tracking-widest px-2 pb-1.5"
              style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
              {label}
            </p>
            {subLinks!.map(({ href: sub, label: subLabel, icon: SubIcon }) => (
              <Link
                key={sub} href={sub}
                onClick={() => setTimeout(() => onClose(), 150)}
                className="flex items-center gap-2.5 px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all"
                style={{
                  borderRadius: "var(--radius-btn)",
                  background: currentPath?.includes(sub.split("?")[0])
                    ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent",
                  color: currentPath?.includes(sub.split("?")[0])
                    ? "var(--primary)" : "color-mix(in srgb, var(--primary) 60%, transparent)",
                }}
              >
                <SubIcon size={13} />
                {subLabel}
              </Link>
            ))}
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── SideNavItemNested — flyout con grupos que tienen sus propios sublinks ────
function SideNavItemNested({
  label, icon: Icon, active, groups, sidebarExpanded, onClose,
}: {
  label: string; icon: React.ElementType; active: boolean;
  groups: { href: string; label: string; icon: React.ElementType; subLinks: { href: string; label: string; icon: React.ElementType }[] }[];
  sidebarExpanded: boolean; onClose: () => void;
}) {
  const currentPath = usePathname();
  const [open, setOpen] = useState(false);
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);

  useEffect(() => { setOpen(false); setHoveredGroup(null); }, [currentPath]);

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => { setOpen(false); setHoveredGroup(null); }}
    >
      {/* Botón principal — no navega, solo abre el flyout */}
      <div
        className="flex items-center gap-3 transition-all duration-200 overflow-hidden cursor-default"
        style={{
          ...navItemBase,
          background: active ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent",
          color: active ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)",
          paddingRight: sidebarExpanded ? "12px" : "10px",
        }}
      >
        {active && !sidebarExpanded && (
          <span className="absolute left-[3px]" style={{ width: "3px", height: "20px", borderRadius: "0 2px 2px 0", background: "var(--primary)" }} />
        )}
        <span className="shrink-0 flex items-center justify-center" style={{ width: "28px" }}>
          <Icon size={18} strokeWidth={active ? 2.5 : 2} />
        </span>
        <AnimatePresence>
          {sidebarExpanded && (
            <MotionSpan initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.16 }}
              className="flex-1 text-[11px] font-black uppercase tracking-widest whitespace-nowrap">
              {label}
            </MotionSpan>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {sidebarExpanded && (
            <MotionSpan initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
              <ChevronRight size={12} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
            </MotionSpan>
          )}
        </AnimatePresence>
      </div>

      {/* Flyout nivel 1 — lista de grupos */}
      <AnimatePresence>
        {open && (
          <MotionDiv
            variants={flyoutVariants} initial="hidden" animate="visible" exit="exit"
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-0 left-full ml-2 z-[1010] p-2 w-44"
            style={submenuSurface}
          >
            <p className="text-[8px] font-black uppercase tracking-widest px-2 pb-1.5"
              style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
              {label}
            </p>
            {groups.map((group) => {
              const groupActive = !!currentPath?.startsWith(group.href);
              return (
                <div
                  key={group.href}
                  className="relative"
                  onMouseEnter={() => setHoveredGroup(group.href)}
                  onMouseLeave={() => setHoveredGroup(null)}
                >
                  <Link
                    href={group.href}
                    onClick={() => { setOpen(false); setHoveredGroup(null); onClose(); }}
                    className="flex items-center gap-3 px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all justify-between"
                    style={{
                      borderRadius: "var(--radius-btn)",
                      background: groupActive || hoveredGroup === group.href
                        ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent",
                      color: groupActive || hoveredGroup === group.href
                        ? "var(--primary)" : "color-mix(in srgb, var(--primary) 60%, transparent)",
                    }}
                  >
                    <span className="flex items-center gap-3">
                      <group.icon size={13} strokeWidth={groupActive ? 2.5 : 2} />
                      {group.label}
                    </span>
                    <ChevronRight size={10} style={{ opacity: 0.4 }} />
                  </Link>

                  {/* Flyout nivel 2 — sublinks del grupo */}
                  <AnimatePresence>
                    {hoveredGroup === group.href && (
                      <MotionDiv
                        variants={flyoutVariants} initial="hidden" animate="visible" exit="exit"
                        transition={{ duration: 0.12 }}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-0 left-full ml-2 z-[1020] p-2 w-44"
                        style={submenuSurface}
                      >
                        <p className="text-[8px] font-black uppercase tracking-widest px-2 pb-1.5"
                          style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                          {group.label}
                        </p>
                        {group.subLinks.map(({ href: sub, label: subLabel, icon: SubIcon }) => (
                          <SideSubItem
                            key={sub} href={sub} label={subLabel} icon={SubIcon}
                            active={!!currentPath?.includes(sub.split("?")[0])}
                            onClick={() => { setOpen(false); setHoveredGroup(null); onClose(); }}
                          />
                        ))}
                      </MotionDiv>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── MobileNavItemNested — dos niveles en móvil ───────────────────────────────
function MobileNavItemNested({
  label, icon: Icon, active, groups, isOpen, onToggle, onClose,
}: {
  label: string; icon: React.ElementType; active: boolean;
  groups: { href: string; label: string; icon: React.ElementType; subLinks: { href: string; label: string; icon: React.ElementType }[] }[];
  isOpen: boolean; onToggle: () => void; onClose: () => void;
}) {
  const currentPath = usePathname();
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const btnStyle = (isActive: boolean, menuOpen: boolean): React.CSSProperties => ({
    borderRadius: "var(--radius-btn)",
    background: (isActive || menuOpen) ? "var(--primary)" : "transparent",
    color: (isActive || menuOpen) ? "var(--btn-text)" : "color-mix(in srgb, var(--primary) 40%, transparent)",
    touchAction: "manipulation",
  });

  return (
    <div className="relative flex items-stretch">
      {/* Icono — abre el panel al tocar */}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(); setOpenGroup(null); }}
        className="flex items-center justify-center transition-all"
        style={{ ...btnStyle(active, isOpen), width: 36, height: 36 }}
      >
        <Icon size={16} strokeWidth={active ? 2.5 : 2} />
      </button>

      {/* Panel nivel 1 — grupos */}
      <AnimatePresence>
        {isOpen && (
          <MotionDiv
            initial={{ opacity: 0, y: 8, scale: 0.97, x: "-50%" }}
            animate={{ opacity: 1, y: 0, scale: 1,    x: "-50%" }}
            exit={{ opacity: 0, y: 8, scale: 0.97,    x: "-50%" }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-full mb-2 left-1/2 z-[2000] p-2 w-48 origin-bottom"
            style={submenuSurface}
          >
            <p className="text-[8px] font-black uppercase tracking-widest px-2 pb-1.5"
              style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
              {label}
            </p>
            {groups.map((group) => {
              const groupActive = !!currentPath?.startsWith(group.href);
              const groupOpen = openGroup === group.href;
              return (
                <div key={group.href}>
                  <div className="flex items-stretch">
                    <Link
                      href={group.href}
                      onClick={() => { setTimeout(onClose, 150); }}
                      className="flex-1 flex items-center gap-2.5 px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all"
                      style={{
                        borderRadius: groupOpen ? `var(--radius-btn) 0 0 var(--radius-btn)` : "var(--radius-btn)",
                        background: groupActive || groupOpen ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent",
                        color: groupActive || groupOpen ? "var(--primary)" : "color-mix(in srgb, var(--primary) 60%, transparent)",
                      }}
                    >
                      <group.icon size={13} />
                      {group.label}
                    </Link>
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenGroup(groupOpen ? null : group.href); }}
                      className="px-2 transition-all"
                      style={{
                        borderRadius: `0 var(--radius-btn) var(--radius-btn) 0`,
                        background: groupOpen ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent",
                        color: groupOpen ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)",
                      }}
                    >
                      <ChevronRight size={10} style={{ transform: groupOpen ? "rotate(-90deg)" : "rotate(90deg)", transition: "transform 0.2s" }} />
                    </button>
                  </div>

                  {/* Nivel 2 inline */}
                  <AnimatePresence>
                    {groupOpen && (
                      <MotionDiv
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden pl-3 mb-1"
                      >
                        {group.subLinks.map(({ href: sub, label: subLabel, icon: SubIcon }) => (
                          <Link
                            key={sub} href={sub}
                            onClick={() => setTimeout(onClose, 150)}
                            className="flex items-center gap-2.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all"
                            style={{
                              borderRadius: "var(--radius-btn)",
                              background: currentPath?.includes(sub.split("?")[0]) ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent",
                              color: currentPath?.includes(sub.split("?")[0]) ? "var(--primary)" : "color-mix(in srgb, var(--primary) 50%, transparent)",
                            }}
                          >
                            <SubIcon size={12} />
                            {subLabel}
                          </Link>
                        ))}
                      </MotionDiv>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
const Navbar = () => {
  const currentPath = usePathname();
  const { user, perfil } = useAuth() as { user: any; perfil: any };
  const [themeMenuOpen,   setThemeMenuOpen]   = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarVisible,  setSidebarVisible]  = useState(false);
  const [mobileOpenMenu,  setMobileOpenMenu]  = useState<string | null>(null);
  const { dark, toggleDark, accent, setAccent } = useTheme();
  const isDark = dark === "dark";
  const toggle = toggleDark;

  const esFranilover = perfil?.username?.toLowerCase() === "franilover";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    window.location.href = "/";
  };

  const closeAll = () => {
    setThemeMenuOpen(false);
    setMobileOpenMenu(null);
    setSidebarExpanded(false);
    setSidebarVisible(false);
  };

  useEffect(() => { closeAll(); }, [currentPath]); // eslint-disable-line

  const isJardin     = currentPath?.startsWith("/myself/jardin")      ?? false;
  const isSalud      = currentPath?.startsWith("/myself/salud")       ?? false;
  const isEscritorio = currentPath?.startsWith("/myself/escritorio")  ?? false;
  const isWiki       = currentPath?.startsWith("/wiki")               ?? false;
  const isPersonal   = currentPath?.startsWith("/personal")           ?? false;

  // Links directos 
  const personalLinks = [
    { href: "/personal/sobre-mi", label: "Sobre Mí", icon: Star,    active: currentPath?.startsWith("/personal/sobre-mi") ?? false, fillActive: true  },
    { href: "/personal/galeria",  label: "Galería",  icon: Palette, active: currentPath?.startsWith("/personal/galeria")  ?? false, fillActive: false },
  ];
  
  // Icono "Mi Personaje" removido de acá
  const wikiLinks = [
    { href: "/wiki/mapa",      label: "Mapa",         icon: Compass,     active: currentPath?.startsWith("/wiki/mapa")      ?? false, fillActive: false },
    { href: "/wiki/libros",    label: "Libros",       icon: BookText,    active: currentPath?.startsWith("/wiki/libros")    ?? false, fillActive: false },
    { href: "/wiki/canciones", label: "Canciones",    icon: Music,       active: currentPath?.startsWith("/wiki/canciones") ?? false, fillActive: false },
  ];

  // Links de menú — para uso móvil de franilover
  const mainLinks = [
    { href: "/personal", label: "Personal", icon: Star,    active: isPersonal, fillActive: true  },
    { href: "/wiki",     label: "Jardín",   icon: Flower2, active: isWiki,     fillActive: false },
  ];

  // Links de Franilover (myself/admin)
  const franiLinks = [
    { href: "/myself/jardin", label: "Arte", icon: Cat, active: isJardin },
  ];

  return (
    <>
      {/* ── SIDEBAR DESKTOP ─────────────────────────────────────────────── */}

      {/* Sidebar siempre fija — botón flotante y overlay eliminados */}

      <aside
        className="hidden md:flex fixed left-0 top-0 h-full z-[100] flex-col"
        style={{
          width: "68px",
          background: "color-mix(in srgb, var(--bg-main) 92%, transparent)",
          borderRight: "var(--border-width) solid color-mix(in srgb, var(--primary) 12%, transparent)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center justify-center shrink-0 mx-auto"
          style={{ width: "44px", height: "68px", color: "var(--primary)" }}
        >
          <Flower2 size={22} />
        </div>

        <div style={{ height: "var(--border-width)", background: "color-mix(in srgb, var(--primary) 12%, transparent)", margin: "0 12px" }} />

        {/* Nav — todos los iconos visibles directamente en escritorio */}
        <nav className="flex flex-col gap-1 px-2 pt-3 flex-1">
          {personalLinks.map(({ href, label, icon, active, fillActive }) => (
            <SideNavItem key={href} href={href} label={label} icon={icon}
              active={active} fillActive={fillActive}
              sidebarExpanded={false} onClose={closeAll} />
          ))}
          <div style={{ height: "var(--border-width)", background: "color-mix(in srgb, var(--primary) 12%, transparent)", margin: "6px 4px" }} />
          {wikiLinks.map(({ href, label, icon, active, fillActive }) => (
            <SideNavItem key={href} href={href} label={label} icon={icon}
              active={active} fillActive={fillActive}
              sidebarExpanded={false} onClose={closeAll} />
          ))}
        
          {/* Si es franilover se añaden los extras sin agrupar en submenus */}
          {esFranilover && (
            <>
              <div style={{ height: "var(--border-width)", background: "color-mix(in srgb, var(--primary) 12%, transparent)", margin: "6px 4px" }} />
              <SideNavItem href="/myself/escritorio" label="Escritorio" icon={PenTool}
                active={isEscritorio} fillActive={false}
                sidebarExpanded={false} onClose={closeAll} />
              <SideNavItem href="/myself/salud" label="Salud" icon={Utensils}
                active={isSalud} fillActive={false}
                sidebarExpanded={false} onClose={closeAll} />
              {franiLinks.map(({ href, label, icon, active }) => (
                <SideNavItem key={href} href={href} label={label} icon={icon}
                  active={active} fillActive={false}
                  sidebarExpanded={false} onClose={closeAll} />
              ))}
            </>
          )}
        </nav>

        {/* Controles inferiores */}
        <div className="flex flex-col gap-1 px-2 pb-4 shrink-0">
          <div style={{ height: "var(--border-width)", background: "color-mix(in srgb, var(--primary) 12%, transparent)", margin: "4px 4px 8px" }} />

          {/* Tema */}
          <div className="relative">
            <button
              onClick={() => setThemeMenuOpen(!themeMenuOpen)}
              className="flex items-center gap-3 transition-all duration-200 overflow-hidden w-full"
              style={{ ...navItemBase, background: themeMenuOpen ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent", color: themeMenuOpen ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)" }}
              onMouseEnter={(e) => { if (!themeMenuOpen) (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 6%, transparent)"; (e.currentTarget as HTMLElement).style.color = "var(--primary)"; }}
              onMouseLeave={(e) => { if (!themeMenuOpen) (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = themeMenuOpen ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)"; }}
            >
              <span className="shrink-0 flex items-center justify-center" style={{ width: "28px" }}><Palette size={16} /></span>
            </button>

            <AnimatePresence>
              {themeMenuOpen && (
                <MotionDiv initial={{ opacity: 0, x: -8, scale: 0.97 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -8, scale: 0.97 }} transition={{ duration: 0.15 }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-full ml-2 w-56 z-[1001] overflow-hidden"
                  style={{ ...submenuSurface, bottom: "0", top: "auto" }}>
                  {/* Toggle dark/light */}
                  <button
                    onClick={toggle}
                    className="flex items-center gap-2.5 w-full px-4 py-3 transition-all"
                    style={{ color: "color-mix(in srgb, var(--primary) 60%, transparent)", borderBottom: "var(--border-width) solid color-mix(in srgb, var(--primary) 8%, transparent)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 5%, transparent)"; (e.currentTarget as HTMLElement).style.color = "var(--primary)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--primary) 60%, transparent)"; }}
                  >
                    {isDark ? <Sun size={13} /> : <Moon size={13} />}
                    <span className="text-[10px] font-black uppercase tracking-widest">{isDark ? "Modo claro" : "Modo oscuro"}</span>
                  </button>
                  <ThemeSelector />
                </MotionDiv>
              )}
            </AnimatePresence>
          </div>

          {/* Usuario y Salir Directos (Sin Submenu) */}
          {user ? (
            <div className="flex flex-col gap-1">
              <Link href="/wiki/personal" title="Mi Personaje"
                onClick={closeAll}
                className="flex items-center gap-3 transition-all duration-200 overflow-hidden w-full"
                style={{ ...navItemBase, color: currentPath === "/wiki/personal" ? "var(--primary)" : "color-mix(in srgb, var(--primary) 50%, transparent)", background: currentPath === "/wiki/personal" ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 6%, transparent)"; (e.currentTarget as HTMLElement).style.color = "var(--primary)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = currentPath === "/wiki/personal" ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent"; (e.currentTarget as HTMLElement).style.color = currentPath === "/wiki/personal" ? "var(--primary)" : "color-mix(in srgb, var(--primary) 50%, transparent)"; }}
              >
                <span className="shrink-0 flex items-center justify-center" style={{ width: "28px" }}><CircleUser size={18} /></span>
              </Link>
              
              <button onClick={handleLogout} title="Salir"
                className="flex items-center gap-3 transition-all duration-200 overflow-hidden w-full"
                style={{ ...navItemBase, color: "oklch(0.6 0.2 25)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.97 0.01 25)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <span className="shrink-0 flex items-center justify-center" style={{ width: "28px" }}><LogOut size={16} /></span>
              </button>
            </div>
          ) : (
            <Link href="/auth/login"
              className="flex items-center gap-3 transition-all duration-200 overflow-hidden"
              style={{ ...navItemBase, color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 6%, transparent)"; (e.currentTarget as HTMLElement).style.color = "var(--primary)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--primary) 50%, transparent)"; }}
            >
              <span className="shrink-0 flex items-center justify-center" style={{ width: "28px" }}><CircleUser size={18} /></span>
            </Link>
          )}
        </div>
      </aside>

      {/* ── BOTTOM NAV MÓVIL ─────────────────────────────────────────────── */}
      <div className="md:hidden fixed bottom-0 left-0 w-full z-[1000]">

        <AnimatePresence>
          {themeMenuOpen && (
            <>
              <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90]" onClick={closeAll} />
              <MotionDiv
                initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-full left-4 mb-2 w-56 overflow-hidden z-[2000]"
                style={submenuSurface}>
                <ThemeSelector />
              </MotionDiv>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {mobileOpenMenu && (
            <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90]" onClick={closeAll} />
          )}
        </AnimatePresence>

        {/* Barra móvil */}
        <div className="flex items-center justify-between w-full px-4 relative z-[100]"
          style={{
            height: "56px",
            background: "color-mix(in srgb, var(--bg-main) 90%, transparent)",
            backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
            borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
          }}
        >
          {/* Controles izquierda (Tema) */}
          <div className="flex items-center z-[101]">
            <MotionButton whileTap={{ scale: 0.88 }}
              onClick={() => { setThemeMenuOpen(!themeMenuOpen); setMobileOpenMenu(null); }}
              className="flex items-center justify-center transition-all"
              style={{ width: 34, height: 34, borderRadius: "var(--radius-btn)", background: themeMenuOpen ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent", color: themeMenuOpen ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)" }}
            >
              <Palette size={16} />
            </MotionButton>
          </div>

          {/* Nav principal — centrado absolutamente para no empujar los controles */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 z-[101]"
            style={{
              background: "color-mix(in srgb, var(--primary) 5%, transparent)",
              borderRadius: "var(--radius-card)",
              border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
            }}
          >
            {esFranilover ? (
              /* ── Franilover: menús compactos + admin ── */
              <>
                {mainLinks.map(({ href, label, icon, active, fillActive }) => (
                  <MobileNavItem
                    key={href} href={href} label={label} icon={icon}
                    active={active} fillActive={fillActive}
                    isOpen={mobileOpenMenu === href}
                    onToggle={() => setMobileOpenMenu(mobileOpenMenu === href ? null : href)}
                    onClose={closeAll}
                  />
                ))}
                <div style={{ width: "var(--border-width)", alignSelf: "stretch", background: "color-mix(in srgb, var(--primary) 12%, transparent)", margin: "4px 2px" }} />
                {personalMyselfGroups.map(({ href, icon: GroupIcon }) => {
                  const isActive = currentPath?.startsWith(href) ?? false;
                  return (
                    <Link
                      key={href} href={href} onClick={closeAll}
                      className="flex items-center justify-center transition-all"
                      style={{
                        borderRadius: "var(--radius-btn)",
                        background: isActive ? "var(--primary)" : "transparent",
                        color: isActive ? "var(--btn-text)" : "color-mix(in srgb, var(--primary) 40%, transparent)",
                        width: 36, height: 36,
                        touchAction: "manipulation",
                      }}
                    >
                      <GroupIcon size={16} strokeWidth={isActive ? 2.5 : 2} />
                    </Link>
                  );
                })}
                {franiLinks.map(({ href, label, icon, active }) => (
                  <MobileNavItem
                    key={href} href={href} label={label} icon={icon}
                    active={active} fillActive={false}
                    isOpen={mobileOpenMenu === href}
                    onToggle={() => setMobileOpenMenu(mobileOpenMenu === href ? null : href)}
                    onClose={closeAll}
                  />
                ))}
              </>
            ) : (
              /* ── Usuarios normales: links directos ── */
              <>
                {personalLinks.map(({ href, label, icon, active, fillActive }) => (
                  <MobileNavItem
                    key={href} href={href} label={label} icon={icon}
                    active={active} fillActive={fillActive}
                    isOpen={mobileOpenMenu === href}
                    onToggle={() => setMobileOpenMenu(mobileOpenMenu === href ? null : href)}
                    onClose={closeAll}
                  />
                ))}
                <div style={{ width: "var(--border-width)", alignSelf: "stretch", background: "color-mix(in srgb, var(--primary) 12%, transparent)", margin: "4px 2px" }} />
                {wikiLinks.map(({ href, label, icon, active, fillActive }) => (
                  <MobileNavItem
                    key={href} href={href} label={label} icon={icon}
                    active={active} fillActive={fillActive}
                    isOpen={mobileOpenMenu === href}
                    onToggle={() => setMobileOpenMenu(mobileOpenMenu === href ? null : href)}
                    onClose={closeAll}
                  />
                ))}
              </>
            )}
          </div>

          {/* Controles derecha (Usuario y Salir) */}
          <div className="flex items-center gap-1 z-[101]">
            {user ? (
              <>
                <Link href="/wiki/personal" onClick={closeAll}
                  className="flex items-center justify-center transition-all"
                  style={{ width: 34, height: 34, borderRadius: "var(--radius-btn)", background: currentPath === "/wiki/personal" ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent", color: currentPath === "/wiki/personal" ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)" }}
                >
                  <CircleUser size={16} />
                </Link>
                <button onClick={handleLogout}
                  className="flex items-center justify-center transition-all"
                  style={{ width: 34, height: 34, borderRadius: "var(--radius-btn)", color: "oklch(0.6 0.2 25)" }}
                >
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <Link href="/auth/login"
                className="flex items-center justify-center transition-all"
                style={{ width: 34, height: 34, borderRadius: "var(--radius-btn)", color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
              >
                <CircleUser size={16} />
              </Link>
            )}
          </div>
        </div>
      </div>

      {themeMenuOpen && (
        <div className="fixed inset-0 z-[90]"
          style={{ background: "color-mix(in srgb, var(--foreground) 5%, transparent)" }}
          onClick={closeAll} />
      )}
    </>
  );
};

export default Navbar;