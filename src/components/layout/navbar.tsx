"use client";
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
  border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
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
            <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.16 }}
              className="flex-1 text-[11px] font-black uppercase tracking-widest whitespace-nowrap">
              {label}
            </motion.span>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {sidebarExpanded && hasSublinks && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
              <ChevronRight size={12} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)", flexShrink: 0 }} />
            </motion.span>
          )}
        </AnimatePresence>
      </Link>

      {/* Flyout lateral */}
      <AnimatePresence>
        {open && hasSublinks && (
          <motion.div
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
          </motion.div>
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

  // Sin sublinks → link simple
  if (!hasSublinks) {
    return (
      <Link href={href} onClick={onClose}
        className="flex items-center gap-1.5 px-[14px] py-[6px] transition-all"
        style={btnStyle(active, false)}
      >
        <Icon size={14} fill={active && fillActive ? "currentColor" : "none"} strokeWidth={active ? 2.5 : 2} />
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </Link>
    );
  }

  // Con sublinks → label navega directamente + flecha abre desplegable
  return (
    <div className="relative flex items-stretch">

      {/* Label — navega a la raíz */}
      <Link
        href={href} onClick={onClose}
        className="flex items-center gap-1.5 py-[6px] transition-all"
        style={{
          ...btnStyle(active, isOpen),
          borderRadius: `var(--radius-btn) 0 0 var(--radius-btn)`,
          paddingLeft: "12px",
          paddingRight: "8px",
        }}
      >
        <Icon size={14} fill={active && fillActive ? "currentColor" : "none"} strokeWidth={active ? 2.5 : 2} />
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </Link>

      {/* Separador */}
      <div style={{
        width: "1px",
        background: (active || isOpen)
          ? "color-mix(in srgb, var(--btn-text) 25%, transparent)"
          : "color-mix(in srgb, var(--primary) 15%, transparent)",
        alignSelf: "stretch",
        margin: "4px 0",
      }} />

      {/* Flecha — abre desplegable */}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(); }}
        className="flex items-center justify-center py-[6px] transition-all"
        style={{
          ...btnStyle(active, isOpen),
          borderRadius: `0 var(--radius-btn) var(--radius-btn) 0`,
          paddingLeft: "6px",
          paddingRight: "8px",
          minWidth: "26px",
        }}
      >
        <ChevronRight
          size={10}
          style={{
            transform: isOpen ? "rotate(-90deg)" : "rotate(90deg)",
            transition: "transform 0.2s ease",
            opacity: 0.8,
          }}
        />
      </button>

      {/* Panel hacia arriba */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
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
          </motion.div>
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
            <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.16 }}
              className="flex-1 text-[11px] font-black uppercase tracking-widest whitespace-nowrap">
              {label}
            </motion.span>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {sidebarExpanded && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
              <ChevronRight size={12} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Flyout nivel 1 — lista de grupos */}
      <AnimatePresence>
        {open && (
          <motion.div
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
                      <motion.div
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
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </motion.div>
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
      {/* Label — no navega */}
      <div
        className="flex items-center gap-1.5 py-[6px] transition-all cursor-default"
        style={{
          ...btnStyle(active, isOpen),
          borderRadius: `var(--radius-btn) 0 0 var(--radius-btn)`,
          paddingLeft: "12px",
          paddingRight: "8px",
        }}
      >
        <Icon size={14} strokeWidth={active ? 2.5 : 2} />
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </div>

      {/* Separador */}
      <div style={{
        width: "1px",
        background: (active || isOpen)
          ? "color-mix(in srgb, var(--btn-text) 25%, transparent)"
          : "color-mix(in srgb, var(--primary) 15%, transparent)",
        alignSelf: "stretch",
        margin: "4px 0",
      }} />

      {/* Flecha */}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(); setOpenGroup(null); }}
        className="flex items-center justify-center py-[6px] transition-all"
        style={{
          ...btnStyle(active, isOpen),
          borderRadius: `0 var(--radius-btn) var(--radius-btn) 0`,
          paddingLeft: "6px",
          paddingRight: "8px",
          minWidth: "26px",
        }}
      >
        <ChevronRight size={10} style={{ transform: isOpen ? "rotate(-90deg)" : "rotate(90deg)", transition: "transform 0.2s ease", opacity: 0.8 }} />
      </button>

      {/* Panel nivel 1 — grupos */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
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
                      <motion.div
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
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
const Navbar = () => {
  const currentPath = usePathname();
  const { user, perfil } = useAuth() as { user: any; perfil: any };
  const [userMenuOpen,    setUserMenuOpen]    = useState(false);
  const [themeMenuOpen,   setThemeMenuOpen]   = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
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
    setUserMenuOpen(false);
    setThemeMenuOpen(false);
    setMobileOpenMenu(null);
    setSidebarExpanded(false);
  };

  useEffect(() => { closeAll(); }, [currentPath]); // eslint-disable-line

  const isWiki       = currentPath?.startsWith("/wiki")              ?? false;
  const isPersonal   = currentPath?.startsWith("/personal")          ?? false;
  const isJardin = currentPath?.startsWith("/myself/jardin") ?? false;
  const isSalud      = currentPath?.startsWith("/myself/salud")      ?? false;;
  const isEscritorio      = currentPath?.startsWith("/myself/escritorio")      ?? false;;
    
    
  // Links del nav público
  const mainLinks = [
    { href: "/personal", label: "Personal", icon: Star,   active: isPersonal, fillActive: true,  subLinks: personalSubLinks },
    { href: "/wiki",     label: "Jardin",     icon: Flower2, active: isWiki,     fillActive: false, subLinks: wikiSubLinks     },
  ];

  // Links de Franilover
  const franiLinks = [
    { href: "/myself/jardin", label: "Arte", icon: Cat, active: isJardin, subLinks: jardinSubLinks },
  ];

  return (
    <>
      {/* ── SIDEBAR DESKTOP ─────────────────────────────────────────────── */}
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
        <Link href="/" onClick={closeAll}
          className="flex items-center gap-3 px-4 shrink-0 overflow-hidden"
          style={{ height: "68px", color: "var(--primary)" }}
        >
          <span className="shrink-0 flex items-center justify-center" style={{ width: "36px" }}>
            <Flower2 size={22} />
          </span>
          <AnimatePresence>
            {sidebarExpanded && (
              <motion.span initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.18 }}
                className="text-base font-black italic tracking-tighter whitespace-nowrap">
                FRANI<span style={{ opacity: 0.35 }}>LOVER</span>
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        <div style={{ height: "1px", background: "color-mix(in srgb, var(--primary) 6%, transparent)", margin: "0 12px" }} />

        {/* Nav — todos usan SideNavItem con flyout */}
        <nav className="flex flex-col gap-1 px-2 pt-3 flex-1">
          {mainLinks.map(({ href, label, icon, active, fillActive, subLinks }) => (
            <SideNavItem key={href} href={href} label={label} icon={icon}
              active={active} fillActive={fillActive} subLinks={subLinks}
              sidebarExpanded={sidebarExpanded} onClose={closeAll} />
          ))}

          {esFranilover && (
            <>
              <div style={{ height: "1px", background: "color-mix(in srgb, var(--primary) 6%, transparent)", margin: "6px 4px" }} />
              <SideNavItemNested
                label="Personal"
                icon={House}
                active={isSalud || isEscritorio}
                groups={personalMyselfGroups}
                sidebarExpanded={sidebarExpanded}
                onClose={closeAll}
              />
              {franiLinks.map(({ href, label, icon, active, subLinks }) => (
                <SideNavItem key={href} href={href} label={label} icon={icon}
                  active={active} fillActive={false} subLinks={subLinks}
                  sidebarExpanded={sidebarExpanded} onClose={closeAll} />
              ))}
            </>
          )}
        </nav>

        {/* Controles inferiores */}
        <div className="flex flex-col gap-1 px-2 pb-4 shrink-0">
          <div style={{ height: "1px", background: "color-mix(in srgb, var(--primary) 6%, transparent)", margin: "4px 4px 8px" }} />

          {/* Tema */}
          <div className="relative">
            <button
              onClick={() => { setThemeMenuOpen(!themeMenuOpen); setUserMenuOpen(false); }}
              className="flex items-center gap-3 transition-all duration-200 overflow-hidden w-full"
              style={{ ...navItemBase, background: themeMenuOpen ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent", color: themeMenuOpen ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)" }}
              onMouseEnter={(e) => { if (!themeMenuOpen) (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 6%, transparent)"; (e.currentTarget as HTMLElement).style.color = "var(--primary)"; }}
              onMouseLeave={(e) => { if (!themeMenuOpen) (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = themeMenuOpen ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)"; }}
            >
              <span className="shrink-0 flex items-center justify-center" style={{ width: "28px" }}><Palette size={16} /></span>
              <AnimatePresence>
                {sidebarExpanded && (
                  <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.16 }}
                    className="text-[11px] font-black uppercase tracking-widest whitespace-nowrap">Tema</motion.span>
                )}
              </AnimatePresence>
            </button>

            <AnimatePresence>
              {themeMenuOpen && (
                <motion.div initial={{ opacity: 0, x: -8, scale: 0.97 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -8, scale: 0.97 }} transition={{ duration: 0.15 }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-full ml-2 w-56 z-[1001] overflow-hidden"
                  style={{ ...submenuSurface, bottom: "0", top: "auto" }}>
                  {/* Toggle dark/light */}
                  <button
                    onClick={toggle}
                    className="flex items-center gap-2.5 w-full px-4 py-3 transition-all"
                    style={{ color: "color-mix(in srgb, var(--primary) 60%, transparent)", borderBottom: "1px solid color-mix(in srgb, var(--primary) 6%, transparent)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 5%, transparent)"; (e.currentTarget as HTMLElement).style.color = "var(--primary)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--primary) 60%, transparent)"; }}
                  >
                    {isDark ? <Sun size={13} /> : <Moon size={13} />}
                    <span className="text-[10px] font-black uppercase tracking-widest">{isDark ? "Modo claro" : "Modo oscuro"}</span>
                  </button>
                  <ThemeSelector />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Usuario */}
          {user ? (
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setUserMenuOpen(!userMenuOpen); setThemeMenuOpen(false); }}
                className="flex items-center gap-3 transition-all duration-200 overflow-hidden w-full"
                style={{ ...navItemBase, background: userMenuOpen ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent", color: userMenuOpen ? "var(--primary)" : "color-mix(in srgb, var(--primary) 50%, transparent)" }}
                onMouseEnter={(e) => { if (!userMenuOpen) (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 6%, transparent)"; (e.currentTarget as HTMLElement).style.color = "var(--primary)"; }}
                onMouseLeave={(e) => { if (!userMenuOpen) (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = userMenuOpen ? "var(--primary)" : "color-mix(in srgb, var(--primary) 50%, transparent)"; }}
              >
                <span className="shrink-0 flex items-center justify-center" style={{ width: "28px" }}><CircleUser size={18} /></span>
                <AnimatePresence>
                  {sidebarExpanded && (
                    <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.16 }}
                      className="text-[11px] font-black uppercase tracking-widest whitespace-nowrap truncate max-w-[110px]">
                      {perfil?.username}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div initial={{ opacity: 0, x: -8, scale: 0.97 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -8, scale: 0.97 }} transition={{ duration: 0.15 }}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute left-full ml-2 w-48 p-2 z-[1001]"
                    style={{ ...submenuSurface, bottom: "0" }}>
                    <Link href="/wiki/personal" onClick={closeAll}
                      className="flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase transition-all"
                      style={{ color: "color-mix(in srgb, var(--primary) 60%, transparent)", borderRadius: "var(--radius-btn)" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 5%, transparent)"; (e.currentTarget as HTMLElement).style.color = "var(--primary)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--primary) 60%, transparent)"; }}
                    >
                      <Sword size={14} /> Mi Personaje
                    </Link>
                    <div style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 5%, transparent)", margin: "4px 0" }} />
                    <button onClick={handleLogout}
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
            <Link href="/auth/login"
              className="flex items-center gap-3 transition-all duration-200 overflow-hidden"
              style={{ ...navItemBase, color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 6%, transparent)"; (e.currentTarget as HTMLElement).style.color = "var(--primary)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--primary) 50%, transparent)"; }}
            >
              <span className="shrink-0 flex items-center justify-center" style={{ width: "28px" }}><CircleUser size={18} /></span>
              <AnimatePresence>
                {sidebarExpanded && (
                  <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.16 }}
                    className="text-[11px] font-black uppercase tracking-widest whitespace-nowrap">Entrar</motion.span>
                )}
              </AnimatePresence>
            </Link>
          )}
        </div>
      </aside>

      {/* ── BOTTOM NAV MÓVIL ─────────────────────────────────────────────── */}
      <div className="md:hidden fixed bottom-0 left-0 w-full z-[1000]">

        <AnimatePresence>
          {themeMenuOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90]" onClick={closeAll} />
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-full right-4 mb-2 w-56 overflow-hidden z-[2000]"
                style={submenuSurface}>
                <ThemeSelector />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {mobileOpenMenu && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90]" onClick={closeAll} />
          )}
        </AnimatePresence>

        {/* Barra */}
        <div className="flex items-center px-4 relative z-[100]"
          style={{
            height: "56px",
            background: "color-mix(in srgb, var(--bg-main) 90%, transparent)",
            backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
            borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
          }}
        >
          <div className="flex-1" />

          {/* Nav principal */}
          <div className="flex items-center gap-1 p-1"
            style={{
              background: "color-mix(in srgb, var(--primary) 5%, transparent)",
              borderRadius: "var(--radius-card)",
              border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
            }}
          >
            {mainLinks.map(({ href, label, icon, active, fillActive, subLinks }) => (
              <MobileNavItem
                key={href} href={href} label={label} icon={icon}
                active={active} fillActive={fillActive} subLinks={subLinks}
                isOpen={mobileOpenMenu === href}
                onToggle={() => setMobileOpenMenu(mobileOpenMenu === href ? null : href)}
                onClose={closeAll}
              />
            ))}
            {esFranilover && (
              <>
                <MobileNavItemNested
                  label="Personal"
                  icon={House}
                  active={isSalud || isEscritorio}
                  groups={personalMyselfGroups}
                  isOpen={mobileOpenMenu === "__personal__"}
                  onToggle={() => setMobileOpenMenu(mobileOpenMenu === "__personal__" ? null : "__personal__")}
                  onClose={closeAll}
                />
                {franiLinks.map(({ href, label, icon, active, subLinks }) => (
                  <MobileNavItem
                    key={href} href={href} label={label} icon={icon}
                    active={active} fillActive={false} subLinks={subLinks}
                    isOpen={mobileOpenMenu === href}
                    onToggle={() => setMobileOpenMenu(mobileOpenMenu === href ? null : href)}
                    onClose={closeAll}
                  />
                ))}
              </>
            )}
          </div>

          {/* Controles derecha */}
          <div className="flex-1 flex items-center justify-end gap-1">
            <motion.button whileTap={{ scale: 0.88 }}
              onClick={() => { setThemeMenuOpen(!themeMenuOpen); setUserMenuOpen(false); setMobileOpenMenu(null); }}
              className="flex items-center justify-center transition-all"
              style={{ width: 34, height: 34, borderRadius: "var(--radius-btn)", background: themeMenuOpen ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent", color: themeMenuOpen ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)" }}
            >
              <Palette size={16} />
            </motion.button>

            <div className="relative">
              <motion.button whileTap={{ scale: 0.88 }}
                onClick={() => user
                  ? (setUserMenuOpen(!userMenuOpen), setThemeMenuOpen(false), setMobileOpenMenu(null))
                  : (window.location.href = "/auth/login")}
                className="flex items-center justify-center transition-all"
                style={{ width: 34, height: 34, borderRadius: "var(--radius-btn)", background: userMenuOpen ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent", color: userMenuOpen ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)" }}
              >
                <CircleUser size={16} />
              </motion.button>

              <AnimatePresence>
                {userMenuOpen && user && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-full right-0 mb-2 overflow-hidden z-[2000]"
                    style={{ width: 180, ...submenuSurface }}
                  >
                    <div className="px-4 py-3" style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 6%, transparent)" }}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary truncate">{perfil?.username}</p>
                    </div>
                    <Link href="/wiki/personal" onClick={() => setTimeout(closeAll, 150)}
                      className="flex items-center gap-2.5 px-4 py-3 transition-all"
                      style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)", borderBottom: "1px solid color-mix(in srgb, var(--primary) 6%, transparent)" }}
                    >
                      <CircleUser size={13} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Mi perfil</span>
                    </Link>
                    {esFranilover && (
                      <div className="p-2" style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 6%, transparent)" }}>
                        <p className="text-[8px] font-black uppercase tracking-widest px-2 pb-1.5"
                          style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>Franilover</p>

                        {/* Personal — grupos anidados inline */}
                        <div className="px-2 py-1.5">
                          <p className="text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 mb-1"
                            style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
                            <House size={11} /> Personal
                          </p>
                          {personalMyselfGroups.map(group => (
                            <div key={group.href} className="mb-1">
                              <Link href={group.href} onClick={() => setTimeout(closeAll, 150)}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-btn)] transition-all text-[10px] font-black uppercase tracking-widest"
                                style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}
                              >
                                <group.icon size={12} /> {group.label}
                              </Link>
                              <div className="pl-4 space-y-0.5">
                                {group.subLinks.map(({ href: sub, label: subLabel, icon: SubIcon }) => (
                                  <Link key={sub} href={sub} onClick={() => setTimeout(closeAll, 150)}
                                    className="flex items-center gap-2 px-2 py-1 rounded-[var(--radius-btn)] transition-all text-[9px] font-black uppercase tracking-widest"
                                    style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
                                  >
                                    <SubIcon size={11} /> {subLabel}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        {franiLinks.map(({ href, icon: Icon, label, active }) => (
                          <Link key={href} href={href} onClick={() => setTimeout(closeAll, 150)}
                            className="flex items-center gap-2.5 px-2 py-2 rounded-[var(--radius-btn)] transition-all"
                            style={{ background: active ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent", color: active ? "var(--primary)" : "color-mix(in srgb, var(--primary) 50%, transparent)" }}
                          >
                            <Icon size={13} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                    <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-3 transition-all" style={{ color: "oklch(0.55 0.18 25)" }}>
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
        <div className="fixed inset-0 z-[90]"
          style={{ background: "color-mix(in srgb, var(--foreground) 5%, transparent)" }}
          onClick={closeAll} />
      )}
    </>
  );
};

export default Navbar;