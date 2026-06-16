"use client";

import React, { useEffect, useCallback } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { MotionDiv } from "@/components/ui/Motion";
import { useCommandPalette } from "./useCommandPalette";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import {
  Compass, BookText, Music, Star, Palette,
  PenTool, Moon, Sun, Cat, Flower2, CircleUser,
  Search, ArrowRight,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  keywords?: string[];
  action: () => void;
  group: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlobalCommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const router = useRouter();
  const { user, isAdmin } = useAuth() as { user: any; isAdmin: boolean };
  const { dark, toggleDark } = useTheme();
  const isDark = dark === "dark";

  // Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, setOpen]);

  const go = useCallback(
    (href: string) => {
      router.push(href);
      setOpen(false);
    },
    [router, setOpen]
  );

  // ── Command definitions ────────────────────────────────────────────────────

  const navItems: CommandItem[] = [
    {
      id: "mapa",
      label: "Mapa de Garlia",
      description: "Explora el mundo",
      icon: Compass,
      keywords: ["mapa", "mundo", "garlia", "explorar"],
      action: () => go("/garlia/mapa"),
      group: "Navegar",
    },
    {
      id: "libros",
      label: "Libros",
      description: "Biblioteca de historias",
      icon: BookText,
      keywords: ["libros", "historias", "leer", "capítulos"],
      action: () => go("/garlia/libros"),
      group: "Navegar",
    },
    {
      id: "canciones",
      label: "Canciones",
      description: "Música del universo",
      icon: Music,
      keywords: ["canciones", "música", "melodías"],
      action: () => go("/garlia/canciones"),
      group: "Navegar",
    },
    {
      id: "sobre-mi",
      label: "Sobre Mí",
      icon: Star,
      keywords: ["sobre mi", "personal", "perfil"],
      action: () => go("/personal/sobre-mi"),
      group: "Navegar",
    },
    {
      id: "galeria",
      label: "Galería",
      icon: Palette,
      keywords: ["galería", "arte", "imágenes", "ilustraciones"],
      action: () => go("/personal/galeria"),
      group: "Navegar",
    },
  ];

  const userItems: CommandItem[] = user
    ? [
        {
          id: "mi-personaje",
          label: "Mi personaje",
          icon: CircleUser,
          keywords: ["mi personaje", "perfil", "personal"],
          action: () => go("/garlia/personal"),
          group: "Cuenta",
        },
      ]
    : [
        {
          id: "login",
          label: "Iniciar sesión",
          icon: CircleUser,
          keywords: ["login", "entrar", "acceder"],
          action: () => go("/auth/login"),
          group: "Cuenta",
        },
      ];

  const adminItems: CommandItem[] = isAdmin
    ? [
        {
          id: "escritorio",
          label: "Escritorio",
          description: "Panel de administración",
          icon: PenTool,
          keywords: ["escritorio", "admin", "editor"],
          action: () => go("/myself/escritorio"),
          group: "Admin",
        },
        {
          id: "garlia-editor",
          label: "Editor de Garlia",
          icon: Cat,
          keywords: ["editor", "arte", "garlia", "myself"],
          action: () => go("/myself/garlia"),
          group: "Admin",
        },
      ]
    : [];

  const themeItems: CommandItem[] = [
    {
      id: "toggle-dark",
      label: isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro",
      icon: isDark ? Sun : Moon,
      keywords: ["oscuro", "claro", "tema", "dark", "light", "modo"],
      action: () => { toggleDark(); setOpen(false); },
      group: "Ajustes",
    },
  ];

  const allItems: CommandItem[] = [
    ...navItems,
    ...userItems,
    ...adminItems,
    ...themeItems,
  ];

  // Group items for rendering
  const groups = allItems.reduce<Record<string, CommandItem[]>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <MotionDiv
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9000]"
            style={{ background: "color-mix(in srgb, var(--bg-main) 60%, transparent)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
            onClick={() => setOpen(false)}
          />

          {/* Palette */}
          <MotionDiv
            key="palette"
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ type: "spring", stiffness: 500, damping: 36 }}
            className="fixed left-1/2 top-[20%] z-[9001] w-full max-w-[480px] -translate-x-1/2"
            style={{ padding: "0 16px" }}
          >
            <Command
              className="overflow-hidden"
              style={{
                background: "var(--white-custom)",
                border: "var(--border-width) solid color-mix(in srgb, var(--primary) 15%, transparent)",
                borderRadius: "var(--radius-card)",
                boxShadow: "var(--shadow-card)",
              }}
              loop
            >
              {/* Search input */}
              <div
                className="flex items-center gap-3 px-4"
                style={{ borderBottom: "var(--border-width) solid color-mix(in srgb, var(--primary) 10%, transparent)", height: "48px" }}
              >
                <Search size={14} style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)", flexShrink: 0 }} />
                <Command.Input
                  autoFocus
                  placeholder="Buscar en Garlia…"
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{
                    color: "var(--primary)",
                    caretColor: "var(--primary)",
                  }}
                />
                <kbd
                  className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded hidden sm:flex items-center"
                  style={{
                    background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                    color: "color-mix(in srgb, var(--primary) 40%, transparent)",
                    border: "var(--border-width) solid color-mix(in srgb, var(--primary) 12%, transparent)",
                  }}
                >
                  esc
                </kbd>
              </div>

              {/* Results */}
              <Command.List
                className="custom-scrollbar"
                style={{ maxHeight: "320px", overflowY: "auto", padding: "6px" }}
              >
                <Command.Empty
                  className="flex flex-col items-center gap-2 py-10 text-center"
                  style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
                >
                  <Flower2 size={20} />
                  <span className="text-xs font-medium">Nada por aquí…</span>
                </Command.Empty>

                {Object.entries(groups).map(([groupName, items]) => (
                  <Command.Group key={groupName} heading={groupName}>
                    <div
                      className="text-[8px] font-black uppercase tracking-widest px-3 pt-3 pb-1"
                      style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
                    >
                      {groupName}
                    </div>

                    {items.map((item) => (
                      <CommandItemRow key={item.id} item={item} />
                    ))}
                  </Command.Group>
                ))}
              </Command.List>

              {/* Footer hint */}
              <div
                className="flex items-center gap-3 px-4 py-2"
                style={{
                  borderTop: "var(--border-width) solid color-mix(in srgb, var(--primary) 8%, transparent)",
                  color: "color-mix(in srgb, var(--primary) 28%, transparent)",
                }}
              >
                <span className="text-[9px] font-black uppercase tracking-widest">↑↓ navegar</span>
                <span className="text-[9px] font-black uppercase tracking-widest">↵ abrir</span>
                <span className="text-[9px] font-black uppercase tracking-widest ml-auto">ctrl+k cerrar</span>
              </div>
            </Command>
          </MotionDiv>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Single item row ────────────────────────────────────────────────────────────

function CommandItemRow({ item }: { item: CommandItem }) {
  const Icon = item.icon;

  return (
    <Command.Item
      key={item.id}
      value={`${item.label} ${item.keywords?.join(" ") ?? ""}`}
      onSelect={item.action}
      className="group flex items-center gap-3 px-3 py-2 rounded-[var(--radius-btn)] cursor-pointer transition-all duration-100 outline-none"
      style={
        {
          color: "color-mix(in srgb, var(--primary) 70%, transparent)",
          "--cmdk-selected-bg": "color-mix(in srgb, var(--primary) 7%, transparent)",
        } as React.CSSProperties
      }
    >
      <span
        className="shrink-0 flex items-center justify-center rounded-[var(--radius-btn)]"
        style={{
          width: "26px",
          height: "26px",
          background: "color-mix(in srgb, var(--primary) 8%, transparent)",
          color: "var(--primary)",
        }}
      >
        <Icon size={13} strokeWidth={2} />
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate" style={{ color: "var(--primary)" }}>
          {item.label}
        </p>
        {item.description && (
          <p className="text-[10px] truncate" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
            {item.description}
          </p>
        )}
      </div>

      <ArrowRight
        size={12}
        className="shrink-0 opacity-0 group-data-[selected=true]:opacity-100 transition-opacity"
        style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
      />
    </Command.Item>
  );
}