"use client";
import { AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CircleUser,
  Flower2,
  PenTool,
  Moon,
  Sun,
  Star,
  Palette,
  Compass,
  BookText,
  BookOpen,
  Music,
  ChevronRight,
  Cat,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState, useEffect } from "react";

import { useCommandPalette } from "@/components/command";
import { MotionDiv } from "@/components/ui/Motion";
import { useMundoNavigation } from "@/features/editorGarlia/hooks/mundo/useMundoNavigationStore";
import { useMobileAsidePanel } from "@/hooks/ui/useMobileAsidePanel";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme, ThemeSelector } from "@/providers/ThemeProvider";

// ── Shared types ─────────────────────────────────────────────────────────────

interface NavLinkDef {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  fillActive?: boolean;
}

// ── Shared constants ──────────────────────────────────────────────────────────

const navItemBase = {
  height: "36px",
  borderRadius: "var(--radius-btn)",
  paddingLeft: "8px",
} as const;

const submenuSurface = {
  background: "var(--white-custom)",
  border:
    "var(--border-width) solid color-mix(in srgb, var(--primary) 15%, transparent)",
  borderRadius: "var(--radius-card)",
  boxShadow: "var(--shadow-card)",
} as const;

const flyoutVariants = {
  hidden: { opacity: 0, x: -8, scale: 0.97 },
  visible: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: -8, scale: 0.97 },
};

const OUTLINE_THEMES = new Set(["pixel", "slate", "sepia"]);

// ── Shared style helpers ──────────────────────────────────────────────────────

function hoverIn(e: React.MouseEvent, active: boolean) {
  const el = e.currentTarget as HTMLElement;
  if (!active)
    el.style.background = "color-mix(in srgb, var(--primary) 6%, transparent)";
  el.style.color = "var(--primary)";
}

function hoverOut(e: React.MouseEvent, active: boolean) {
  const el = e.currentTarget as HTMLElement;
  if (!active) el.style.background = "transparent";
  el.style.color = active
    ? "var(--primary)"
    : "color-mix(in srgb, var(--primary) 40%, transparent)";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function NavDivider({ margin = "6px 4px" }: { margin?: string }) {
  return (
    <div
      style={{
        height: "var(--border-width)",
        background: "color-mix(in srgb, var(--primary) 12%, transparent)",
        margin,
      }}
    />
  );
}

function NavVerticalDivider() {
  return (
    <div
      style={{
        width: "var(--border-width)",
        alignSelf: "stretch",
        background: "color-mix(in srgb, var(--primary) 12%, transparent)",
        margin: "4px 2px",
      }}
    />
  );
}

function SubItemLabel({
  active,
  icon: Icon,
  label,
}: {
  active: boolean;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <>
      <Icon size={13} strokeWidth={active ? 2.5 : 2} />
      {label}
    </>
  );
}

function SideSubItem({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      className="flex items-center gap-3 px-3 py-2 text-micro font-black uppercase tracking-widest transition-all"
      href={href}
      style={{
        borderRadius: "var(--radius-btn)",
        background: active
          ? "color-mix(in srgb, var(--primary) 8%, transparent)"
          : "transparent",
        color: active
          ? "var(--primary)"
          : "color-mix(in srgb, var(--primary) 60%, transparent)",
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.background =
          "color-mix(in srgb, var(--primary) 6%, transparent)";
        el.style.color = "var(--primary)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = active
          ? "color-mix(in srgb, var(--primary) 8%, transparent)"
          : "transparent";
        el.style.color = active
          ? "var(--primary)"
          : "color-mix(in srgb, var(--primary) 60%, transparent)";
      }}
    >
      <SubItemLabel active={active} icon={Icon} label={label} />
    </Link>
  );
}

function SideNavItem({
  href,
  label,
  icon: Icon,
  active,
  fillActive = false,
  subLinks,
  onClose,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  fillActive?: boolean;
  subLinks?: NavLinkDef[];
  onClose: () => void;
}) {
  const currentPath = usePathname();
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const hasSublinks = !!subLinks?.length;
  const useOutline = OUTLINE_THEMES.has(theme);

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
        className="flex items-center gap-3 transition-all duration-200 overflow-hidden"
        href={href}
        style={{
          ...navItemBase,
          paddingRight: "8px",
          background: active
            ? "color-mix(in srgb, var(--primary) 10%, transparent)"
            : "transparent",
          color: active
            ? "var(--primary)"
            : "color-mix(in srgb, var(--primary) 40%, transparent)",
          border:
            useOutline && active
              ? "var(--border-width) solid var(--primary)"
              : "var(--border-width) solid transparent",
        }}
        onClick={onClose}
        onMouseEnter={(e) => hoverIn(e, active)}
        onMouseLeave={(e) => hoverOut(e, active)}
      >
        {active && !useOutline && (
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
        <span
          className="shrink-0 flex items-center justify-center"
          style={{ width: "22px" }}
        >
          <Icon
            fill={active && fillActive ? "currentColor" : "none"}
            size={15}
            strokeWidth={active ? 2.5 : 2}
          />
        </span>
        {hasSublinks && (
          <ChevronRight
            size={12}
            style={{
              color: "color-mix(in srgb, var(--primary) 30%, transparent)",
              flexShrink: 0,
            }}
          />
        )}
      </Link>

      <AnimatePresence>
        {open && hasSublinks && (
          <MotionDiv
            animate="visible"
            className="absolute top-0 left-full ml-2 z-[1010] p-2 w-44"
            exit="exit"
            initial="hidden"
            style={submenuSurface}
            transition={{ duration: 0.15 }}
            variants={flyoutVariants}
            onClick={(e) => e.stopPropagation()}
          >
            <p
              className="text-micro font-black uppercase tracking-widest px-2 pb-1.5"
              style={{
                color: "color-mix(in srgb, var(--primary) 30%, transparent)",
              }}
            >
              {label}
            </p>
            {subLinks!.map(({ href: sub, label: subLabel, icon: SubIcon }) => (
              <SideSubItem
                key={sub}
                active={!!currentPath?.includes(sub.split("?")[0])}
                href={sub}
                icon={SubIcon}
                label={subLabel}
                onClick={() => {
                  setOpen(false);
                  onClose();
                }}
              />
            ))}
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}

function MobileSubItem({
  href,
  label,
  icon: Icon,
  active,
  onClose,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClose: () => void;
}) {
  return (
    <Link
      className="flex items-center gap-2.5 px-3 py-2 text-micro font-black uppercase tracking-widest transition-all"
      href={href}
      style={{
        borderRadius: "var(--radius-btn)",
        background: active
          ? "color-mix(in srgb, var(--primary) 8%, transparent)"
          : "transparent",
        color: active
          ? "var(--primary)"
          : "color-mix(in srgb, var(--primary) 60%, transparent)",
      }}
      onClick={() => setTimeout(onClose, 150)}
    >
      <SubItemLabel active={active} icon={Icon} label={label} />
    </Link>
  );
}

function MobileNavItem({
  href,
  label,
  icon: Icon,
  active,
  fillActive = false,
  subLinks,
  isOpen,
  onToggle,
  onClose,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  fillActive?: boolean;
  subLinks?: NavLinkDef[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const currentPath = usePathname();
  const { theme } = useTheme();
  const hasSublinks = !!subLinks?.length;
  const useOutline = OUTLINE_THEMES.has(theme);

  const btnStyle = (
    isActive: boolean,
    menuOpen: boolean,
  ): React.CSSProperties => {
    const base = {
      borderRadius: "var(--radius-btn)",
      touchAction: "manipulation" as const,
    };
    if (useOutline) {
      return {
        ...base,
        border: isActive
          ? "var(--border-width) solid var(--primary)"
          : "var(--border-width) solid transparent",
        background: menuOpen
          ? "color-mix(in srgb, var(--primary) 10%, transparent)"
          : "transparent",
        color:
          isActive || menuOpen
            ? "var(--primary)"
            : "color-mix(in srgb, var(--primary) 40%, transparent)",
      };
    }
    return {
      ...base,
      background: isActive || menuOpen ? "var(--primary)" : "transparent",
      color:
        isActive || menuOpen
          ? "var(--btn-text)"
          : "color-mix(in srgb, var(--primary) 40%, transparent)",
    };
  };

  if (!hasSublinks) {
    return (
      <Link
        className="flex items-center justify-center transition-all"
        href={href}
        style={{ ...btnStyle(active, false), width: 36, height: 36 }}
        onClick={onClose}
      >
        <Icon
          fill={active && fillActive ? "currentColor" : "none"}
          size={16}
          strokeWidth={active ? 2.5 : 2}
        />
      </Link>
    );
  }

  return (
    <div className="relative flex items-stretch">
      <button
        className="flex items-center justify-center transition-all"
        style={{ ...btnStyle(active, isOpen), width: 36, height: 36 }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }}
      >
        <Icon
          fill={active && fillActive ? "currentColor" : "none"}
          size={16}
          strokeWidth={active ? 2.5 : 2}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <MotionDiv
            animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
            className="absolute bottom-full mb-2 left-1/2 z-[2000] p-2 w-44 origin-bottom"
            exit={{ opacity: 0, y: 8, scale: 0.97, x: "-50%" }}
            initial={{ opacity: 0, y: 8, scale: 0.97, x: "-50%" }}
            style={submenuSurface}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
          >
            <p
              className="text-micro font-black uppercase tracking-widest px-2 pb-1.5"
              style={{
                color: "color-mix(in srgb, var(--primary) 30%, transparent)",
              }}
            >
              {label}
            </p>
            {subLinks!.map(({ href: sub, label: subLabel, icon: SubIcon }) => (
              <MobileSubItem
                key={sub}
                active={!!currentPath?.includes(sub.split("?")[0])}
                href={sub}
                icon={SubIcon}
                label={subLabel}
                onClose={onClose}
              />
            ))}
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const Navbar = () => {
  const currentPath = usePathname();
  const { user, isAdmin } = useAuth() as { user: any; isAdmin: boolean };
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [mobileOpenMenu, setMobileOpenMenu] = useState<string | null>(null);
  const { dark, toggleDark, theme } = useTheme();
  const useOutline = OUTLINE_THEMES.has(theme);
  const isDark = dark === "dark";
  const { setOpen: openPalette } = useCommandPalette();

  // ── Botón de panel lateral (mobile) ───────────────────────────────────────
  // Antes cada editor con aside propio (personajes, criaturas, reinos...)
  // dibujaba su propio botón "sm:hidden" en su header para abrir el drawer.
  // Ahora ese botón vive una sola vez, acá, y solo aparece si hay un editor
  // registrado con panel lateral montado (ver useRegisterMobileAside).
  const asideAvailable = useMobileAsidePanel((s) => s.available);
  const asideOpen = useMobileAsidePanel((s) => s.open);
  const toggleAside = useMobileAsidePanel((s) => s.toggle);

  const closeAll = () => {
    setThemeMenuOpen(false);
    setMobileOpenMenu(null);
  };

  useEffect(() => {
    closeAll();
  }, [currentPath]);

  // ── Route flags ─────────────────────────────────────────────────────────────

  const isEscritorio = currentPath?.startsWith("/myself/escritorio") ?? false;
  const isGarliaeditor = currentPath?.startsWith("/myself/garlia") ?? false;
  const isGarlia = currentPath?.startsWith("/garlia") ?? false;
  const isPersonal = currentPath?.startsWith("/personal") ?? false;
  const personalIsActive = currentPath === "/garlia/personal";

  // ── Botón de volver del editor de mundo ──────────────────────────────────
  // Vive en la navbar (no flotando sobre el contenido) porque el editor de
  // mundo (/myself/garlia) no tiene su propio header superior. Contextual:
  //   - sin sección activa → no se muestra (ya estás en el menú de 12).
  //   - con sección activa, sin entidad seleccionada → vuelve al menú.
  //   - con entidad seleccionada (lista oculta) → vuelve a la lista.
  const mundoSection = useMundoNavigation((s) => s.section);
  const mundoSelectedId = useMundoNavigation((s) => s.selectedId);
  const mundoGoToMenu = useMundoNavigation((s) => s.goToMenu);
  const mundoClearSelection = useMundoNavigation((s) => s.clearSelection);
  const showMundoBack = isGarliaeditor && mundoSection !== null;
  const mundoBackAction = mundoSelectedId ? mundoClearSelection : mundoGoToMenu;
  const mundoBackLabel = mundoSelectedId ? "Volver a la lista" : "Volver a secciones";

  // ── Link definitions ─────────────────────────────────────────────────────────

  const personalLinks: NavLinkDef[] = [
    {
      href: "/personal/sobre-mi",
      label: "Sobre Mí",
      icon: Star,
      active: currentPath?.startsWith("/personal/sobre-mi") ?? false,
      fillActive: true,
    },
    {
      href: "/personal/galeria",
      label: "Galería",
      icon: Palette,
      active: currentPath?.startsWith("/personal/galeria") ?? false,
      fillActive: false,
    },
  ];

  const garliaLinks: NavLinkDef[] = [
    {
      href: user ? "/garlia/personal" : "/auth/login",
      label: "Cuenta",
      icon: CircleUser,
      active: personalIsActive,
    },
    {
      href: "/garlia/mapa",
      label: "Mapa",
      icon: Compass,
      active: currentPath?.startsWith("/garlia/mapa") ?? false,
    },
    {
      href: "/garlia/aventura",
      label: "Aventura",
      icon: BookOpen,
      active: currentPath?.startsWith("/garlia/aventura") ?? false,
    },
    {
      href: "/garlia/libros",
      label: "Libros",
      icon: BookText,
      active: currentPath?.startsWith("/garlia/libros") ?? false,
    },
    {
      href: "/garlia/canciones",
      label: "Canciones",
      icon: Music,
      active: currentPath?.startsWith("/garlia/canciones") ?? false,
    },
  ];

  const mainLinks: NavLinkDef[] = [
    {
      href: "/personal",
      label: "Personal",
      icon: Star,
      active: isPersonal,
      fillActive: true,
    },
    {
      href: "/garlia",
      label: "Jardín",
      icon: Flower2,
      active: isGarlia,
      fillActive: false,
    },
  ];

  const franiLinks: NavLinkDef[] = [
    {
      href: "/myself/garlia",
      label: "Arte",
      icon: Cat,
      active: isGarliaeditor,
    },
  ];

  // ── Shared mobile toggle handler ─────────────────────────────────────────────

  const mobileToggle = (href: string) =>
    setMobileOpenMenu(mobileOpenMenu === href ? null : href);

  return (
    <>
      {/* ── SIDEBAR DESKTOP ──────────────────────────────────────── */}
      <aside
        className="hidden md:flex fixed left-0 top-0 h-full z-[100] flex-col"
        style={{
          width: "52px",
          background: "color-mix(in srgb, var(--bg-main) 92%, transparent)",
          borderRight:
            "var(--border-width) solid color-mix(in srgb, var(--primary) 12%, transparent)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {showMundoBack && (
          <button
            type="button"
            onClick={mundoBackAction}
            className="flex items-center justify-center transition-all shrink-0 mx-auto"
            style={{
              width: "36px",
              height: "40px",
              borderRadius: "var(--radius-btn)",
              color: "color-mix(in srgb, var(--primary) 40%, transparent)",
              background: "transparent",
            }}
            title={mundoBackLabel}
            aria-label={mundoBackLabel}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "color-mix(in srgb, var(--primary) 6%, transparent)";
              (e.currentTarget as HTMLElement).style.color = "var(--primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color =
                "color-mix(in srgb, var(--primary) 40%, transparent)";
            }}
          >
            {mundoSelectedId ? <ArrowLeft size={15} /> : <X size={15} />}
          </button>
        )}
        {showMundoBack && <NavDivider margin="6px 12px" />}
        <div className="relative shrink-0 mx-auto">
          <button
            className="flex items-center justify-center transition-all"
            style={{
              width: "36px",
              height: "52px",
              color: "var(--primary)",
              background: themeMenuOpen
                ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                : "transparent",
            }}
            title="Cambiar tema"
            onClick={() => setThemeMenuOpen(!themeMenuOpen)}
          >
            <Flower2 size={18} />
          </button>

          <AnimatePresence>
            {themeMenuOpen && (
              <>
                <MotionDiv
                  animate={{ opacity: 1 }}
                  className="fixed inset-0 z-[1000]"
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0 }}
                  onClick={closeAll}
                />
                <MotionDiv
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  className="absolute left-full top-0 ml-2 w-56 z-[1001] overflow-hidden"
                  exit={{ opacity: 0, x: -8, scale: 0.97 }}
                  initial={{ opacity: 0, x: -8, scale: 0.97 }}
                  style={submenuSurface}
                  transition={{ duration: 0.15 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="flex items-center gap-2.5 w-full px-4 py-3 transition-all"
                    style={{
                      color:
                        "color-mix(in srgb, var(--primary) 60%, transparent)",
                      borderBottom:
                        "var(--border-width) solid color-mix(in srgb, var(--primary) 8%, transparent)",
                    }}
                    onClick={toggleDark}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "color-mix(in srgb, var(--primary) 5%, transparent)";
                      (e.currentTarget as HTMLElement).style.color =
                        "var(--primary)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "transparent";
                      (e.currentTarget as HTMLElement).style.color =
                        "color-mix(in srgb, var(--primary) 60%, transparent)";
                    }}
                  >
                    {isDark ? <Sun size={13} /> : <Moon size={13} />}
                    <span className="text-micro font-black uppercase tracking-widest">
                      {isDark ? "Modo claro" : "Modo oscuro"}
                    </span>
                  </button>
                  <ThemeSelector />
                </MotionDiv>
              </>
            )}
          </AnimatePresence>
        </div>

        <NavDivider margin="0 12px" />

        <nav className="flex flex-col gap-1 px-2 pt-3 flex-1">
          {personalLinks.map(({ href, label, icon, active, fillActive }) => (
            <SideNavItem
              key={href}
              active={active}
              fillActive={fillActive}
              href={href}
              icon={icon}
              label={label}
              onClose={closeAll}
            />
          ))}
          <NavDivider />
          {garliaLinks.map(({ href, label, icon, active, fillActive }) => (
            <SideNavItem
              key={href}
              active={active}
              fillActive={fillActive}
              href={href}
              icon={icon}
              label={label}
              onClose={closeAll}
            />
          ))}
          {isAdmin && (
            <>
              <NavDivider />
              <SideNavItem
                active={isEscritorio}
                href="/myself/escritorio"
                icon={PenTool}
                label="Escritorio"
                onClose={closeAll}
              />
              {franiLinks.map(({ href, label, icon, active }) => (
                <SideNavItem
                  key={href}
                  active={active}
                  href={href}
                  icon={icon}
                  label={label}
                  onClose={closeAll}
                />
              ))}
            </>
          )}
        </nav>
      </aside>

      {/* ── MOBILE NAVBAR ────────────────────────────────────────── */}
      <div className="md:hidden fixed bottom-0 left-0 w-full z-[1000]">
        <AnimatePresence>
          {themeMenuOpen && (
            <>
              <MotionDiv
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-[90]"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                onClick={closeAll}
              />
              <MotionDiv
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="absolute bottom-full left-4 mb-2 w-56 overflow-hidden z-[2000]"
                exit={{ opacity: 0, y: 12, scale: 0.97 }}
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                style={submenuSurface}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                onClick={(e) => e.stopPropagation()}
              >
                <ThemeSelector />
              </MotionDiv>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {mobileOpenMenu && (
            <MotionDiv
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-[90]"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={closeAll}
            />
          )}
        </AnimatePresence>

        <div
          className="flex items-center justify-between w-full px-4 relative z-[100]"
          style={{
            height: "56px",
            background: "color-mix(in srgb, var(--bg-main) 90%, transparent)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop:
              "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
          }}
        >
          {/* Theme toggle */}
          <div className="flex items-center gap-1 z-[101]">
            {showMundoBack && (
              <button
                type="button"
                onClick={mundoBackAction}
                className="flex items-center justify-center transition-all"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "var(--radius-btn)",
                  background: "transparent",
                  color: "color-mix(in srgb, var(--primary) 40%, transparent)",
                }}
                title={mundoBackLabel}
                aria-label={mundoBackLabel}
              >
                {mundoSelectedId ? <ArrowLeft size={16} /> : <X size={16} />}
              </button>
            )}
            <button
              className="flex items-center justify-center transition-all"
              style={{
                width: 34,
                height: 34,
                borderRadius: "var(--radius-btn)",
                background: themeMenuOpen
                  ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                  : "transparent",
                color: themeMenuOpen
                  ? "var(--primary)"
                  : "color-mix(in srgb, var(--primary) 40%, transparent)",
              }}
              onClick={() => {
                setThemeMenuOpen(!themeMenuOpen);
                setMobileOpenMenu(null);
              }}
            >
              <Palette size={16} />
            </button>
          </div>

          {/* Center nav items */}
          <div
            className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 z-[101]"
            style={{
              background: "color-mix(in srgb, var(--primary) 5%, transparent)",
              borderRadius: "var(--radius-card)",
              border:
                "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
            }}
          >
            {isAdmin ? (
              <>
                {mainLinks.map(({ href, label, icon, active, fillActive }) => (
                  <MobileNavItem
                    key={href}
                    active={active}
                    fillActive={fillActive}
                    href={href}
                    icon={icon}
                    isOpen={mobileOpenMenu === href}
                    label={label}
                    onClose={closeAll}
                    onToggle={() => mobileToggle(href)}
                  />
                ))}
                <NavVerticalDivider />
                <Link
                  className="flex items-center justify-center transition-all"
                  href="/myself/escritorio"
                  style={{
                    borderRadius: "var(--radius-btn)",
                    border:
                      useOutline && isEscritorio
                        ? "var(--border-width) solid var(--primary)"
                        : "var(--border-width) solid transparent",
                    background:
                      !useOutline && isEscritorio
                        ? "var(--primary)"
                        : "transparent",
                    color: isEscritorio
                      ? "var(--primary)"
                      : "color-mix(in srgb, var(--primary) 40%, transparent)",
                    width: 36,
                    height: 36,
                    touchAction: "manipulation",
                  }}
                  onClick={closeAll}
                >
                  <PenTool size={16} strokeWidth={isEscritorio ? 2.5 : 2} />
                </Link>
                {franiLinks.map(({ href, label, icon, active }) => (
                  <MobileNavItem
                    key={href}
                    active={active}
                    href={href}
                    icon={icon}
                    isOpen={mobileOpenMenu === href}
                    label={label}
                    onClose={closeAll}
                    onToggle={() => mobileToggle(href)}
                  />
                ))}
              </>
            ) : (
              <>
                {personalLinks.map(
                  ({ href, label, icon, active, fillActive }) => (
                    <MobileNavItem
                      key={href}
                      active={active}
                      fillActive={fillActive}
                      href={href}
                      icon={icon}
                      isOpen={mobileOpenMenu === href}
                      label={label}
                      onClose={closeAll}
                      onToggle={() => mobileToggle(href)}
                    />
                  ),
                )}
                <NavVerticalDivider />
                {garliaLinks.map(
                  ({ href, label, icon, active, fillActive }) => (
                    <MobileNavItem
                      key={href}
                      active={active}
                      fillActive={fillActive}
                      href={href}
                      icon={icon}
                      isOpen={mobileOpenMenu === href}
                      label={label}
                      onClose={closeAll}
                      onToggle={() => mobileToggle(href)}
                    />
                  ),
                )}
              </>
            )}
          </div>

          {/* Search + panel lateral del editor activo (si expone uno) */}
          <div className="flex items-center gap-1 z-[101]">
            {asideAvailable && (
              <button
                className="flex items-center justify-center transition-all"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "var(--radius-btn)",
                  background: asideOpen
                    ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                    : "transparent",
                  color: asideOpen
                    ? "var(--primary)"
                    : "color-mix(in srgb, var(--primary) 40%, transparent)",
                }}
                title="Entidades"
                aria-label="Entidades"
                onClick={() => {
                  toggleAside();
                  closeAll();
                }}
              >
                <SlidersHorizontal size={16} />
              </button>
            )}
            <button
              className="flex items-center justify-center transition-all"
              style={{
                width: 34,
                height: 34,
                borderRadius: "var(--radius-btn)",
                color: "color-mix(in srgb, var(--primary) 40%, transparent)",
              }}
              onClick={() => {
                openPalette(true);
                closeAll();
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "color-mix(in srgb, var(--primary) 10%, transparent)";
                (e.currentTarget as HTMLElement).style.color = "var(--primary)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "transparent";
                (e.currentTarget as HTMLElement).style.color =
                  "color-mix(in srgb, var(--primary) 40%, transparent)";
              }}
            >
              <Search size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
