"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { MotionDiv } from "@/components/ui/Motion";
import { useCommandPalette } from "./useCommandPalette";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { useGlobalSearch } from "@/lib/api/queries/search";
import {
  Compass, BookText, Music, Star, Palette,
  PenTool, Moon, Sun, Cat, Flower2, CircleUser,
  Search, ArrowRight, User, Crown, Swords, Building2,
  Loader2, WifiOff,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  avatar?: string | null;
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

  const [search, setSearch] = useState("");
  const { data, isFetching } = useGlobalSearch(search);
  const fromCache = data?.fromCache ?? false;

  // Ctrl+Ñ abre/cierra — capture:true para ir antes que cualquier otro listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "ñ") {
        e.preventDefault();
        e.stopPropagation();
        console.log("[palette] Ctrl+Ñ detectado, toggling open");
        setOpen((prev: boolean) => {
          console.log("[palette] prev:", prev, "→ next:", !prev);
          return !prev;
        });
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [setOpen]);

  // Debug: log whenever open changes
  useEffect(() => {
    console.log("[palette] open =", open);
  }, [open]);

  // Reset search on close
  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const go = useCallback(
    (href: string) => {
      router.push(href);
      setOpen(false);
    },
    [router, setOpen]
  );

  // ── Static command definitions ─────────────────────────────────────────────

  const navItems: CommandItem[] = [
    { id: "mapa",     label: "Mapa de Garlia", description: "Explora el mundo",      icon: Compass,   keywords: ["mapa", "mundo", "garlia", "explorar"], action: () => go("/garlia/mapa"),     group: "Navegar" },
    { id: "libros",   label: "Libros",         description: "Biblioteca de historias", icon: BookText,  keywords: ["libros", "historias", "leer"],         action: () => go("/garlia/libros"),   group: "Navegar" },
    { id: "canciones",label: "Canciones",      description: "Música del universo",    icon: Music,     keywords: ["canciones", "música", "melodías"],      action: () => go("/garlia/canciones"),group: "Navegar" },
    { id: "sobre-mi", label: "Sobre Mí",                                              icon: Star,      keywords: ["sobre mi", "personal", "perfil"],       action: () => go("/personal/sobre-mi"),group: "Navegar" },
    { id: "galeria",  label: "Galería",                                               icon: Palette,   keywords: ["galería", "arte", "imágenes"],          action: () => go("/personal/galeria"),group: "Navegar" },
  ];

  const userItems: CommandItem[] = user
    ? [{ id: "mi-personaje", label: "Mi personaje", icon: CircleUser, keywords: ["mi personaje", "perfil"], action: () => go("/garlia/personal"), group: "Cuenta" }]
    : [{ id: "login", label: "Iniciar sesión", icon: CircleUser, keywords: ["login", "entrar"], action: () => go("/auth/login"), group: "Cuenta" }];

  const adminItems: CommandItem[] = isAdmin
    ? [
        { id: "escritorio",    label: "Escritorio",      description: "Panel de administración", icon: PenTool, keywords: ["escritorio", "admin", "editor"], action: () => go("/myself/escritorio"), group: "Admin" },
        { id: "garlia-editor", label: "Editor de Garlia",                                        icon: Cat,     keywords: ["editor", "garlia", "myself"],    action: () => go("/myself/garlia"),     group: "Admin" },
      ]
    : [];

  const themeItems: CommandItem[] = [
    { id: "toggle-dark", label: isDark ? "Modo claro" : "Modo oscuro", icon: isDark ? Sun : Moon, keywords: ["oscuro", "claro", "tema", "dark", "light"], action: () => { toggleDark(); setOpen(false); }, group: "Ajustes" },
  ];

  const staticItems: CommandItem[] = [...navItems, ...userItems, ...adminItems, ...themeItems];

  // ── Dynamic search results → CommandItems ──────────────────────────────────

  const dynamicItems: CommandItem[] = search.trim().length >= 2 ? [
    ...(data?.personajes ?? []).map(p => ({
      id: `p-${p.id}`, label: p.nombre, description: p.especie ?? "Personaje",
      icon: User, avatar: p.img_url,
      action: () => go(`/garlia/personajes/${p.id}`), group: "Personajes",
    })),
    ...(data?.libros ?? []).map(l => ({
      id: `l-${l.id}`, label: l.titulo, description: l.estado ?? "Libro",
      icon: BookText, avatar: l.portada_url,
      action: () => go(`/garlia/libros/${l.id}`), group: "Libros",
    })),
    ...(data?.canciones ?? []).map(c => ({
      id: `c-${c.id}`, label: c.titulo, description: c.cantante ?? "Canción",
      icon: Music, avatar: c.portada_url,
      action: () => go(`/garlia/canciones/${c.id}`), group: "Canciones",
    })),
    ...(data?.reinos ?? []).map(r => ({
      id: `r-${r.id}`, label: r.nombre, description: "Reino",
      icon: Crown, avatar: r.logo_url,
      action: () => go(`/garlia/reinos/${r.id}`), group: "Reinos",
    })),
    ...(data?.criaturas ?? []).map(c => ({
      id: `cr-${c.id}`, label: c.nombre, description: "Criatura",
      icon: Swords, avatar: c.imagen_url,
      action: () => go(`/garlia/criaturas/${c.id}`), group: "Criaturas",
    })),
    ...(data?.ciudades ?? []).map(c => ({
      id: `ci-${c.id}`, label: c.nombre, description: "Ciudad",
      icon: Building2, avatar: c.imagen_url,
      action: () => go(`/garlia/ciudades/${c.id}`), group: "Ciudades",
    })),
  ] : [];

  const showDynamic = search.trim().length >= 2;
  const hasDynamicResults = dynamicItems.length > 0;

  // Group static items
  const staticGroups = staticItems.reduce<Record<string, CommandItem[]>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  // Group dynamic items
  const dynamicGroups = dynamicItems.reduce<Record<string, CommandItem[]>>((acc, item) => {
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
            className="fixed left-1/2 top-[18%] z-[9001] w-full max-w-[500px] -translate-x-1/2"
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
              // Desactivamos el filtro interno de cmdk cuando hay resultados dinámicos
              // para que lo manejemos nosotros via useGlobalSearch
              filter={showDynamic ? () => 1 : undefined}
              loop
            >
              {/* Search input */}
              <div
                className="flex items-center gap-3 px-4"
                style={{ borderBottom: "var(--border-width) solid color-mix(in srgb, var(--primary) 10%, transparent)", height: "48px" }}
              >
                {isFetching
                  ? <Loader2 size={14} className="animate-spin shrink-0" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }} />
                  : <Search size={14} style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)", flexShrink: 0 }} />
                }
                <Command.Input
                  autoFocus
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Buscar personajes, libros, canciones…"
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: "var(--primary)", caretColor: "var(--primary)" }}
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
                style={{ maxHeight: "360px", overflowY: "auto", padding: "6px" }}
              >
                <Command.Empty
                  className="flex flex-col items-center gap-2 py-10 text-center"
                  style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
                >
                  <Flower2 size={20} />
                  <span className="text-xs font-medium">Nada por aquí…</span>
                </Command.Empty>

                {/* Resultados dinámicos (búsqueda activa) */}
                {showDynamic && hasDynamicResults && Object.entries(dynamicGroups).map(([groupName, items]) => (
                  <Command.Group key={groupName}>
                    <div
                      className="text-[8px] font-black uppercase tracking-widest px-3 pt-3 pb-1"
                      style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
                    >
                      {groupName}
                    </div>
                    {items.map(item => <CommandItemRow key={item.id} item={item} />)}
                  </Command.Group>
                ))}

                {/* Comandos estáticos (siempre visibles o cuando no hay búsqueda activa) */}
                {!showDynamic && Object.entries(staticGroups).map(([groupName, items]) => (
                  <Command.Group key={groupName}>
                    <div
                      className="text-[8px] font-black uppercase tracking-widest px-3 pt-3 pb-1"
                      style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
                    >
                      {groupName}
                    </div>
                    {items.map(item => <CommandItemRow key={item.id} item={item} />)}
                  </Command.Group>
                ))}

                {/* Sin resultados dinámicos pero con búsqueda activa */}
                {showDynamic && !hasDynamicResults && !isFetching && (
                  <div className="flex flex-col items-center gap-2 py-10" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
                    <Flower2 size={20} />
                    <span className="text-xs font-medium">Sin resultados para &ldquo;{search}&rdquo;</span>
                  </div>
                )}
              </Command.List>

              {/* Footer */}
              <div
                className="flex items-center gap-3 px-4 py-2"
                style={{
                  borderTop: "var(--border-width) solid color-mix(in srgb, var(--primary) 8%, transparent)",
                  color: "color-mix(in srgb, var(--primary) 28%, transparent)",
                }}
              >
                <span className="text-[9px] font-black uppercase tracking-widest">↑↓ navegar</span>
                <span className="text-[9px] font-black uppercase tracking-widest">↵ abrir</span>
                {showDynamic && (
                  <span
                    className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest ml-auto"
                    style={{ color: fromCache ? "color-mix(in srgb, var(--primary) 40%, transparent)" : "color-mix(in srgb, var(--primary) 28%, transparent)" }}
                  >
                    <WifiOff size={9} className={fromCache ? "opacity-100" : "opacity-0"} />
                    {fromCache ? "cache local" : "en línea"}
                  </span>
                )}
                {!showDynamic && (
                  <span className="text-[9px] font-black uppercase tracking-widest ml-auto" style={{ color: "color-mix(in srgb, var(--primary) 28%, transparent)" }}>
                    ctrl+ñ
                  </span>
                )}
              </div>
            </Command>
          </MotionDiv>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Single item row ───────────────────────────────────────────────────────────

function CommandItemRow({ item }: { item: CommandItem }) {
  const Icon = item.icon;

  return (
    <Command.Item
      value={`${item.id} ${item.label} ${item.keywords?.join(" ") ?? ""}`}
      onSelect={item.action}
      className="group flex items-center gap-3 px-3 py-2 rounded-[var(--radius-btn)] cursor-pointer transition-all duration-100 outline-none"
      style={{ color: "color-mix(in srgb, var(--primary) 70%, transparent)" }}
    >
      {/* Avatar o ícono */}
      {item.avatar ? (
        <img
          src={item.avatar}
          alt={item.label}
          className="shrink-0 object-cover"
          style={{ width: 26, height: 26, borderRadius: "var(--radius-btn)" }}
        />
      ) : (
        <span
          className="shrink-0 flex items-center justify-center rounded-[var(--radius-btn)]"
          style={{ width: 26, height: 26, background: "color-mix(in srgb, var(--primary) 8%, transparent)", color: "var(--primary)" }}
        >
          <Icon size={13} strokeWidth={2} />
        </span>
      )}

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