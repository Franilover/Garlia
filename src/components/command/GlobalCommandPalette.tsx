"use client";

import { Command } from "cmdk";
import { AnimatePresence } from "framer-motion";
import {
  Compass, BookText, Music, Star, Palette,
  PenTool, Moon, Sun, Cat, Flower2, CircleUser,
  Search, ArrowRight, User, Crown, Swords, Building2,
  Loader2, WifiOff, BookOpen, Wand2, Zap,
  FileText, Clock, Layers, MapPin, ScrollText, Users, Package,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import React, { useEffect, useState, useCallback, useRef } from "react";

import { MotionDiv } from "@/components/ui/Motion";
import { supabase } from "@/lib/api/client/supabase";
import { useGlobalSearch } from "@/lib/api/queries/search";
import { toSlug } from "@/lib/utils/slugify";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";

import { useCommandPalette } from "./useCommandPalette";


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

// Tipos para resultados públicos
interface CancionPublica {
  id: string;
  titulo: string;
  cantante?: string | null;
  portada_url?: string | null;
  visible?: boolean;
}

interface CapituloPublico {
  id: string;
  titulo_capitulo: string;
  orden: number;
  libro_id: string;
  libro_titulo?: string;    // viene del join con libros
  libro_portada?: string;   // viene del join con libros
}

interface LibroPublico {
  id: string;
  titulo: string;
  portada_url?: string | null;
  visibilidad?: string;
  sinopsis?: string | null;
  estado?: string;
}

/** Búsqueda pública en Supabase — libros, canciones y capítulos visibles. */
function usePublicSearch(query: string) {
  const [canciones,  setCanciones]  = useState<CancionPublica[]>([]);
  const [capitulos,  setCapitulos]  = useState<CapituloPublico[]>([]);
  const [libros,     setLibros]     = useState<LibroPublico[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setCanciones([]);
      setCapitulos([]);
      setLibros([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsFetching(true);
      try {
        const [canRes, capRes, libRes] = await Promise.all([
          supabase
            .from("canciones")
            .select("id, titulo, cantante, portada_url, visible")
            .eq("visible", true)
            .ilike("titulo", `%${q}%`)
            .limit(6),
          supabase
            .from("capitulos")
            .select("id, titulo_capitulo, orden, libro_id, libros!libro_id(titulo, portada_url)")
            .eq("visibilidad", "publico")
            .not("titulo_capitulo", "like", "[Ruta]%")
            .ilike("titulo_capitulo", `%${q}%`)
            .limit(8),
          supabase
            .from("libros")
            .select("id, titulo, portada_url, visibilidad, sinopsis, estado")
            .eq("visibilidad", "publico")
            .ilike("titulo", `%${q}%`)
            .limit(5),
        ]);

        setCanciones((canRes.data ?? []) as CancionPublica[]);
        setLibros((libRes.data ?? []) as LibroPublico[]);

        // Aplanar el join con libros
        const capsAplanados: CapituloPublico[] = ((capRes.data ?? []) as any[]).map((c) => {
          const libro = Array.isArray(c.libros) ? c.libros[0] : c.libros;
          return {
            id: c.id,
            titulo_capitulo: c.titulo_capitulo,
            orden: c.orden,
            libro_id: c.libro_id,
            libro_titulo:  libro?.titulo    ?? undefined,
            libro_portada: libro?.portada_url ?? undefined,
          };
        });
        setCapitulos(capsAplanados);
      } catch {
        // Si falla la búsqueda pública, simplemente no mostrar resultados
        setCanciones([]);
        setCapitulos([]);
        setLibros([]);
      } finally {
        setIsFetching(false);
      }
    }, 280);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  return { canciones, capitulos, libros, isFetching };
}

/**
 * Carga inicial de contenido público — libros y canciones visibles sin query.
 * Se ejecuta una vez al montar y sirve para el panel "Descubrir".
 */
function usePublicBrowse() {
  const [libros,     setLibros]     = useState<LibroPublico[]>([]);
  const [canciones,  setCanciones]  = useState<CancionPublica[]>([]);
  const [loaded,     setLoaded]     = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [libRes, canRes] = await Promise.all([
          supabase
            .from("libros")
            .select("id, titulo, portada_url, visibilidad, sinopsis, estado")
            .eq("visibilidad", "publico")
            .order("titulo", { ascending: true })
            .limit(8),
          supabase
            .from("canciones")
            .select("id, titulo, cantante, portada_url, visible")
            .eq("visible", true)
            .order("titulo", { ascending: true })
            .limit(8),
        ]);
        if (cancelled) return;
        setLibros((libRes.data ?? []) as LibroPublico[]);
        setCanciones((canRes.data ?? []) as CancionPublica[]);
      } catch {
        // fallar silenciosamente
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { libros, canciones, loaded };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlobalCommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const router = useRouter();
  const { user, isAdmin } = useAuth() as { user: any; isAdmin: boolean };
  const { dark, toggleDark } = useTheme();
  const isDark = dark === "dark";

  const [search, setSearch] = useState("");
  const { data, isFetching: isFetchingAdmin } = useGlobalSearch(search);
  const fromCache = data?.fromCache ?? false;

  // Búsqueda pública — activa para TODOS los usuarios (admin y no-admin)
  const {
    canciones: cancionesPublicas,
    capitulos: capitulosPublicos,
    libros:    librosPublicos,
    isFetching: isFetchingPublic,
  } = usePublicSearch(search);

  // Browse público — carga inicial sin query para el panel "Descubrir"
  const {
    libros:    browseLibros,
    canciones: browseCanciones,
    loaded:    browseLoaded,
  } = usePublicBrowse();

  const isFetching = isFetchingAdmin || isFetchingPublic;

  // Ctrl+Ñ abre/cierra — capture:true para ir antes que cualquier otro listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "ñ") {
        if (e.repeat) return; // ignorar key repeat
        e.preventDefault();
        e.stopPropagation();
        setOpen((prev: boolean) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [setOpen]);

  // Reset search on close
  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const pathname = usePathname();

  const go = useCallback(
    (href: string) => {
      router.push(href);
      setOpen(false);
    },
    [router, setOpen]
  );

  // Abre una entidad en el EditorGarlia — si ya estamos ahí despacha directo,
  // si no navega primero y despacha después del mount
  const goEntity = useCallback(
    (tabla: string, id: string) => {
      setOpen(false);
      const dispatch = () =>
        window.dispatchEvent(
          new CustomEvent("garlia-open-entity", { detail: { tabla, id } })
        );
      if (pathname === "/myself/garlia") {
        dispatch();
      } else {
        router.push("/myself/garlia");
        // Esperar a que EditorGarlia monte y registre el listener
        setTimeout(dispatch, 400);
      }
    },
    [router, setOpen, pathname]
  );

  // Abre una canción en el EditorGarlia
  const goCancion = useCallback(
    (id: string) => {
      setOpen(false);
      const dispatch = () => {
        localStorage.setItem("estudio-letras-last-id", id);
        window.dispatchEvent(new CustomEvent("garlia-open-entity", { detail: { tabla: "canciones", id } }));
        window.dispatchEvent(new Event("estudio-letras-action"));
      };
      if (pathname === "/myself/garlia") {
        dispatch();
      } else {
        router.push("/myself/garlia");
        setTimeout(dispatch, 400);
      }
    },
    [router, setOpen, pathname]
  );

  // Abre un capítulo específico en el EditorGarlia
  const goCapitulo = useCallback(
    (capId: string, libroId: string) => {
      setOpen(false);
      const dispatch = () => {
        localStorage.setItem("estudio-caps-last-cap",   capId);
        localStorage.setItem("estudio-caps-last-libro", libroId);
        window.dispatchEvent(new Event("estudio-caps-action"));
      };
      if (pathname === "/myself/garlia") {
        dispatch();
      } else {
        router.push("/myself/garlia");
        setTimeout(dispatch, 400);
      }
    },
    [router, setOpen, pathname]
  );

  // Abre un ensayo específico en /myself/ensayos
  const goEnsayo = useCallback(
    (id: string) => {
      setOpen(false);
      localStorage.setItem("ensayos-active-id", id);
      localStorage.removeItem("ensayos-at-home");
      if (pathname === "/myself/escritorio") {
        window.dispatchEvent(new CustomEvent("ensayos-open", { detail: { id } }));
      } else {
        router.push("/myself/escritorio");
      }
    },
    [router, setOpen, pathname]
  );

  // Navega al editor y dispara createAndOpen para entidades principales
  const goEditorAndCreate = useCallback(
    (tab: string) => {
      const dispatch = () =>
        window.dispatchEvent(new CustomEvent("garlia-create-entity", { detail: { tab } }));
      if (pathname === "/myself/garlia") {
        dispatch();
      } else {
        router.push("/myself/garlia");
        setTimeout(dispatch, 400);
      }
    },
    [router, pathname]
  );

  // Navega al editor y dispara onAddMagic para el resto (hechizos, notas, etc.)
  const goEditorAndDispatch = useCallback(
    (key: string) => {
      const dispatch = () =>
        window.dispatchEvent(new CustomEvent("garlia-add-magic", { detail: { key } }));
      if (pathname === "/myself/garlia") {
        dispatch();
      } else {
        router.push("/myself/garlia");
        setTimeout(dispatch, 400);
      }
    },
    [router, pathname]
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

  // Comandos de creación — solo admin
  const createItems: CommandItem[] = isAdmin ? [
    { id: "add-personaje",      label: "Nuevo personaje",      icon: Users,      keywords: ["add", "crear", "nuevo", "personaje"],      action: () => { setOpen(false); goEditorAndCreate("personajes"); },     group: "Crear" },
    { id: "add-criatura",       label: "Nueva criatura",       icon: Swords,     keywords: ["add", "crear", "nueva", "criatura"],       action: () => { setOpen(false); goEditorAndCreate("criaturas"); },      group: "Crear" },
    { id: "add-reino",          label: "Nuevo reino",          icon: Crown,      keywords: ["add", "crear", "nuevo", "reino"],          action: () => { setOpen(false); goEditorAndCreate("reinos"); },         group: "Crear" },
    { id: "add-objeto",         label: "Nuevo objeto",         icon: Package,    keywords: ["add", "crear", "nuevo", "objeto", "item"], action: () => { setOpen(false); goEditorAndCreate("items"); },          group: "Crear" },
    { id: "add-ciudad",         label: "Nueva ciudad",         icon: MapPin,     keywords: ["add", "crear", "nueva", "ciudad"],         action: () => { setOpen(false); goEditorAndDispatch("ciudad"); },       group: "Crear" },
    { id: "add-hechizo",        label: "Nuevo hechizo",        icon: Wand2,      keywords: ["add", "crear", "nuevo", "hechizo"],        action: () => { setOpen(false); goEditorAndDispatch("hechizos"); },     group: "Crear" },
    { id: "add-don",            label: "Nuevo don",            icon: Zap,        keywords: ["add", "crear", "nuevo", "don"],            action: () => { setOpen(false); goEditorAndDispatch("dones"); },        group: "Crear" },
    { id: "add-runa",           label: "Nueva runa",           icon: ScrollText, keywords: ["add", "crear", "nueva", "runa"],           action: () => { setOpen(false); goEditorAndDispatch("runas"); },        group: "Crear" },
    { id: "add-nota",           label: "Nueva nota",           icon: FileText,   keywords: ["add", "crear", "nueva", "nota"],           action: () => { setOpen(false); goEditorAndDispatch("notas"); },        group: "Crear" },
    { id: "add-acontecimiento", label: "Nuevo acontecimiento", icon: Clock,      keywords: ["add", "crear", "nuevo", "acontecimiento"], action: () => { setOpen(false); goEditorAndDispatch("acontecimiento"); }, group: "Crear" },
    { id: "add-grupo",          label: "Nuevo grupo",          icon: Layers,     keywords: ["add", "crear", "nuevo", "grupo"],          action: () => { setOpen(false); goEditorAndDispatch("grupos"); },       group: "Crear" },
    { id: "add-libro",          label: "Nuevo libro",          icon: BookOpen,   keywords: ["add", "crear", "nuevo", "libro"],          action: () => { setOpen(false); goEditorAndDispatch("libro"); },        group: "Crear" },
    { id: "add-capitulo",       label: "Nuevo capítulo",       icon: BookText,   keywords: ["add", "crear", "nuevo", "capitulo"],       action: () => { setOpen(false); goEditorAndDispatch("capitulo"); },     group: "Crear" },
    { id: "add-cancion",        label: "Nueva canción",        icon: Music,      keywords: ["add", "crear", "nueva", "cancion"],        action: () => { setOpen(false); goEditorAndDispatch("cancion"); },      group: "Crear" },
    { id: "add-ensayo",         label: "Nuevo ensayo",         icon: FileText,   keywords: ["add", "crear", "nuevo", "ensayo", "nota"],  action: () => { setOpen(false); if (pathname === "/myself/escritorio") { window.dispatchEvent(new CustomEvent("ensayos-create", { detail: { tipo: "ensayo" } })); } else { router.push("/myself/escritorio?crear=ensayo"); } }, group: "Crear" },
    { id: "add-ensayo-libro",   label: "Nuevo libro (ensayo)", icon: BookOpen,   keywords: ["add", "crear", "nuevo", "libro", "ensayo"], action: () => { setOpen(false); if (pathname === "/myself/escritorio") { window.dispatchEvent(new CustomEvent("ensayos-create", { detail: { tipo: "libro"  } })); } else { router.push("/myself/escritorio?crear=libro");  } }, group: "Crear" },
  ] : [];

  const staticItems: CommandItem[] = [...navItems, ...userItems, ...adminItems, ...themeItems, ...createItems];

  // ── Dynamic search results → CommandItems ──────────────────────────────────

  // Resultados públicos — visibles para usuarios NO-admin cuando hay búsqueda activa.
  // Libros, canciones y capítulos navegan a sus rutas públicas (/garlia/...).
  const publicDynamicItems: CommandItem[] = search.trim().length >= 2 ? [
    ...librosPublicos.map(l => ({
      id: `l-pub-${l.id}`,
      label: l.titulo,
      description: l.sinopsis ? l.sinopsis.slice(0, 60) + (l.sinopsis.length > 60 ? "…" : "") : (l.estado ?? "Libro"),
      icon: BookText,
      avatar: l.portada_url ?? null,
      action: () => go(`/garlia/libros/${toSlug(l.titulo)}`),
      group: "Libros",
    })),
    ...cancionesPublicas.map(c => ({
      id: `c-pub-${c.id}`,
      label: c.titulo,
      description: c.cantante ?? "Canción",
      icon: Music,
      avatar: c.portada_url ?? null,
      action: () => go(`/garlia/canciones/${toSlug(c.titulo)}`),
      group: "Canciones",
    })),
    ...capitulosPublicos.map(c => {
      const libroSlug = toSlug(c.libro_titulo ?? "");
      const destino = libroSlug
        ? `/garlia/libros/${libroSlug}/leer/${c.orden}`
        : `/garlia/libros`;
      return {
        id: `cap-pub-${c.id}`,
        label: c.titulo_capitulo,
        description: c.libro_titulo ? `Cap. ${c.orden} · ${c.libro_titulo}` : `Capítulo ${c.orden}`,
        icon: BookOpen,
        avatar: c.libro_portada ?? null,
        action: () => go(destino),
        group: "Capítulos",
      };
    }),
  ] : [];

  // Resultados de admin — solo para administradores, abren en EditorGarlia
  const adminDynamicItems: CommandItem[] = (search.trim().length >= 2 && isAdmin) ? [
    ...(data?.personajes ?? []).map(p => ({
      id: `p-${p.id}`, label: p.nombre, description: p.especie ?? "Personaje",
      icon: User, avatar: p.img_url,
      action: () => goEntity("personajes", p.id), group: "Personajes",
    })),
    ...(data?.libros ?? []).map(l => ({
      id: `l-${l.id}`, label: l.titulo, description: l.estado ?? "Libro",
      icon: BookText, avatar: l.portada_url,
      action: () => goEntity("libros", l.id), group: "Libros",
    })),
    // Para admin, las canciones abren en el editor (no en la ruta pública)
    ...(data?.canciones ?? []).map(c => ({
      id: `c-${c.id}`, label: c.titulo, description: c.cantante ?? "Canción",
      icon: Music, avatar: c.portada_url,
      action: () => goCancion(c.id), group: "Canciones (editor)",
    })),
    // Para admin, los capítulos abren en el editor
    ...(data?.capitulos ?? []).map(c => ({
      id: `cap-${c.id}`, label: c.titulo_capitulo ?? `Capítulo ${c.orden}`, description: `Cap. ${c.orden}`,
      icon: BookOpen, avatar: null,
      action: () => goCapitulo(c.id, c.libro_id ?? ""), group: "Capítulos (editor)",
    })),
    ...(data?.reinos ?? []).map(r => ({
      id: `r-${r.id}`, label: r.nombre, description: "Reino",
      icon: Crown, avatar: r.logo_url,
      action: () => goEntity("reinos", r.id), group: "Reinos",
    })),
    ...(data?.criaturas ?? []).map(c => ({
      id: `cr-${c.id}`, label: c.nombre, description: "Criatura",
      icon: Swords, avatar: c.imagen_url,
      action: () => goEntity("criaturas", c.id), group: "Criaturas",
    })),
    ...(data?.ciudades ?? []).map(c => ({
      id: `ci-${c.id}`, label: c.nombre, description: "Ciudad",
      icon: Building2, avatar: c.imagen_url,
      action: () => goEntity("ciudades", c.id), group: "Ciudades",
    })),
    ...(data?.ensayos ?? []).map(e => {
      const tags: string[] = Array.isArray(e.tags) ? e.tags : [];
      const esLibro = tags.includes("libro");
      const esTag   = tags.includes("tag");
      const badge   = esLibro ? "libro" : esTag ? "tag" : "nota";
      const otherTags = tags.filter(t => t !== "libro" && t !== "tag").slice(0, 2).map(t => `#${t}`).join(" ");
      return {
        id: `ens-${e.id}`, label: e.titulo ?? "Sin título",
        description: [badge, otherTags].filter(Boolean).join(" · "),
        icon: FileText, avatar: null,
        action: () => goEnsayo(e.id), group: "Ensayos",
      };
    }),
  ] : [];

  // Unir: admin ve sus items de editor + los públicos del lector (para poder navegar como usuario)
  // No-admin solo ve los públicos del lector.
  const dynamicItems: CommandItem[] = isAdmin
    ? [...adminDynamicItems, ...publicDynamicItems]
    : [...publicDynamicItems];

  const showDynamic = search.trim().length >= 2;
  const hasDynamicResults = dynamicItems.length > 0;

  // Elementos de descubrimiento público — se muestran cuando no hay búsqueda activa
  const browseItems: CommandItem[] = (!showDynamic && browseLoaded) ? [
    ...browseLibros.map(l => ({
      id: `browse-l-${l.id}`,
      label: l.titulo,
      description: l.sinopsis ? l.sinopsis.slice(0, 60) + (l.sinopsis.length > 60 ? "…" : "") : (l.estado ?? "Libro"),
      icon: BookText,
      avatar: l.portada_url ?? null,
      keywords: ["libro", "leer", l.titulo],
      action: () => go(`/garlia/libros/${toSlug(l.titulo)}`),
      group: "Descubrir · Libros",
    })),
    ...browseCanciones.map(c => ({
      id: `browse-c-${c.id}`,
      label: c.titulo,
      description: c.cantante ?? "Canción",
      icon: Music,
      avatar: c.portada_url ?? null,
      keywords: ["cancion", "música", c.titulo],
      action: () => go(`/garlia/canciones/${toSlug(c.titulo)}`),
      group: "Descubrir · Canciones",
    })),
  ] : [];

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
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[9000]"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            style={{ background: "color-mix(in srgb, var(--bg-main) 60%, transparent)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
            transition={{ duration: 0.15 }}
            onClick={() => setOpen(false)}
          />

          {/* Palette */}
          <MotionDiv
            key="palette"
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="fixed left-1/2 top-[18%] z-[9001] w-full max-w-[500px] -translate-x-1/2"
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            style={{ padding: "0 16px" }}
            transition={{ type: "spring", stiffness: 500, damping: 36 }}
          >
            <Command
              loop
              style={{
                background: "var(--white-custom)",
                border: "var(--border-width) solid color-mix(in srgb, var(--primary) 15%, transparent)",
                borderRadius: "var(--radius-card)",
                boxShadow: "var(--shadow-card)",
              }}
              // Desactivamos el filtro interno de cmdk cuando hay resultados dinámicos
              // para que lo manejemos nosotros via useGlobalSearch
              className="overflow-hidden"
              filter={showDynamic ? () => 1 : undefined}
            >
              {/* Search input */}
              <div
                className="flex items-center gap-3 px-4"
                style={{ borderBottom: "var(--border-width) solid color-mix(in srgb, var(--primary) 10%, transparent)", height: "48px" }}
              >
                {isFetching
                  ? <Loader2 className="animate-spin shrink-0" size={14} style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }} />
                  : <Search size={14} style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)", flexShrink: 0 }} />
                }
                <Command.Input
                  autoFocus
                  className="flex-1 bg-transparent outline-none text-sm"
                  placeholder="Buscar personajes, libros, canciones…"
                  style={{ color: "var(--primary)", caretColor: "var(--primary)" }}
                  value={search}
                  onValueChange={setSearch}
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

                {/* Descubrir — libros y canciones públicas cuando no hay búsqueda activa */}
                {!showDynamic && browseLoaded && browseItems.length > 0 && (
                  <>
                    {["Descubrir · Libros", "Descubrir · Canciones"].map(groupName => {
                      const items = browseItems.filter(i => i.group === groupName);
                      if (!items.length) return null;
                      return (
                        <Command.Group key={groupName}>
                          <div
                            className="text-[8px] font-black uppercase tracking-widest px-3 pt-3 pb-1"
                            style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
                          >
                            {groupName}
                          </div>
                          {items.map(item => <CommandItemRow key={item.id} item={item} />)}
                        </Command.Group>
                      );
                    })}
                  </>
                )}

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
                    <WifiOff className={fromCache ? "opacity-100" : "opacity-0"} size={9} />
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
      className="group flex items-center gap-3 px-3 py-2 rounded-[var(--radius-btn)] cursor-pointer transition-all duration-100 outline-none"
      style={{ color: "color-mix(in srgb, var(--primary) 70%, transparent)" }}
      value={`${item.id} ${item.label} ${item.keywords?.join(" ") ?? ""}`}
      onSelect={item.action}
    >
      {/* Avatar o ícono */}
      {item.avatar ? (
        <img
          alt={item.label}
          className="shrink-0 object-cover"
          src={item.avatar}
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
        className="shrink-0 opacity-0 group-data-[selected=true]:opacity-100 transition-opacity"
        size={12}
        style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
      />
    </Command.Item>
  );
}