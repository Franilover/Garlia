"use client";

import { Command } from "cmdk";
import { AnimatePresence } from "framer-motion";
import {
  Compass,
  BookText,
  Music,
  Star,
  Palette,
  PenTool,
  Moon,
  Sun,
  Cat,
  Flower2,
  CircleUser,
  Search,
  User,
  Crown,
  Swords,
  Building2,
  Loader2,
  WifiOff,
  BookOpen,
  Wand2,
  Zap,
  FileText,
  Clock,
  Layers,
  MapPin,
  ScrollText,
  Users,
  Package,
  Dumbbell,
  UtensilsCrossed,
  Shirt,
  Library,
  Sparkles,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import React, { useEffect, useState, useCallback, useRef } from "react";

import { MotionDiv } from "@/components/ui/Motion";
import { supabase } from "@/lib/api/client/supabase";
import { useGlobalSearch } from "@/lib/api/queries/search";
import { toSlug } from "@/lib/utils/slugify";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";

import { useAppPanels } from "./useAppPanels";
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
  libro_titulo?: string; // viene del join con libros
  libro_portada?: string; // viene del join con libros
}

interface LibroPublico {
  id: string;
  titulo: string;
  portada_url?: string | null;
  visibilidad?: string;
  sinopsis?: string | null;
  estado?: string;
}

// Lo que el usuario tiene desbloqueado en su página personal (/garlia/personal)
// o en el mapa (/garlia/mapa)
interface DescubrimientoPersonal {
  entidad_id: string;
  tipo: "personaje" | "criatura" | "item" | "reino" | "ciudad";
  nombre?: string | null;
  imagen_url?: string | null;
  reino_id?: string | null; // solo para ciudades — necesario para abrir su reino primero
}

/** Búsqueda pública en Supabase — libros, canciones y capítulos visibles. */
function usePublicSearch(query: string) {
  const [canciones, setCanciones] = useState<CancionPublica[]>([]);
  const [capitulos, setCapitulos] = useState<CapituloPublico[]>([]);
  const [libros, setLibros] = useState<LibroPublico[]>([]);
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
            .select(
              "id, titulo_capitulo, orden, libro_id, libros!libro_id(titulo, portada_url)",
            )
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
        const capsAplanados: CapituloPublico[] = (
          (capRes.data ?? []) as any[]
        ).map((c) => {
          const libro = Array.isArray(c.libros) ? c.libros[0] : c.libros;
          return {
            id: c.id,
            titulo_capitulo: c.titulo_capitulo,
            orden: c.orden,
            libro_id: c.libro_id,
            libro_titulo: libro?.titulo ?? undefined,
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

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return { canciones, capitulos, libros, isFetching };
}

/**
 * Carga inicial de contenido público — libros y canciones visibles sin query.
 * Se ejecuta una vez al montar y sirve para el panel "Descubrir".
 */
function usePublicBrowse() {
  const [libros, setLibros] = useState<LibroPublico[]>([]);
  const [canciones, setCanciones] = useState<CancionPublica[]>([]);
  const [loaded, setLoaded] = useState(false);

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
    return () => {
      cancelled = true;
    };
  }, []);

  return { libros, canciones, loaded };
}

/**
 * Búsqueda sobre lo que el usuario tiene desbloqueado — personajes, criaturas,
 * items, reinos y ciudades propios. Disponible para TODOS los usuarios
 * logueados, admin o no, ya que es información de su propia cuenta.
 *
 * Usa las mismas tablas puente que syncEngine.loadDescubrimientos /
 * mapaGarlia (descubrimientos_items / _criaturas / _personajes / _reinos,
 * más ciudades_desbloqueadas que usa user_id en vez de perfil_id).
 */
function useUnlockedSearch(query: string, userId: string | null) {
  const [resultados, setResultados] = useState<DescubrimientoPersonal[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (!userId || q.length < 2) {
      setResultados([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsFetching(true);
      try {
        const [itemsRes, criaturasRes, personajesRes, reinosRes, ciudadesRes] =
          await Promise.all([
            supabase
              .from("descubrimientos_items")
              .select("items!inner(id, nombre, imagen_url)")
              .eq("perfil_id", userId)
              .ilike("items.nombre", `%${q}%`)
              .limit(8),
            supabase
              .from("descubrimientos_criaturas")
              .select("criaturas!inner(id, nombre, imagen_url)")
              .eq("perfil_id", userId)
              .ilike("criaturas.nombre", `%${q}%`)
              .limit(8),
            supabase
              .from("descubrimientos_personajes")
              .select("personajes!inner(id, nombre, img_url)")
              .eq("perfil_id", userId)
              .ilike("personajes.nombre", `%${q}%`)
              .limit(8),
            supabase
              .from("descubrimientos_reinos")
              .select("reinos!inner(id, nombre, logo_url)")
              .eq("perfil_id", userId)
              .ilike("reinos.nombre", `%${q}%`)
              .limit(8),
            supabase
              .from("ciudades_desbloqueadas")
              .select("ciudades!inner(id, nombre, imagen_url, reino_id)")
              .eq("user_id", userId)
              .ilike("ciudades.nombre", `%${q}%`)
              .limit(8),
          ]);

        const merged: DescubrimientoPersonal[] = [
          ...((itemsRes.data ?? []) as any[])
            .filter((r) => r.items)
            .map((r) => ({
              entidad_id: r.items.id,
              tipo: "item" as const,
              nombre: r.items.nombre,
              imagen_url: r.items.imagen_url,
            })),
          ...((criaturasRes.data ?? []) as any[])
            .filter((r) => r.criaturas)
            .map((r) => ({
              entidad_id: r.criaturas.id,
              tipo: "criatura" as const,
              nombre: r.criaturas.nombre,
              imagen_url: r.criaturas.imagen_url,
            })),
          ...((personajesRes.data ?? []) as any[])
            .filter((r) => r.personajes)
            .map((r) => ({
              entidad_id: r.personajes.id,
              tipo: "personaje" as const,
              nombre: r.personajes.nombre,
              imagen_url: r.personajes.img_url,
            })),
          ...((reinosRes.data ?? []) as any[])
            .filter((r) => r.reinos)
            .map((r) => ({
              entidad_id: r.reinos.id,
              tipo: "reino" as const,
              nombre: r.reinos.nombre,
              imagen_url: r.reinos.logo_url,
            })),
          ...((ciudadesRes.data ?? []) as any[])
            .filter((r) => r.ciudades)
            .map((r) => ({
              entidad_id: r.ciudades.id,
              tipo: "ciudad" as const,
              nombre: r.ciudades.nombre,
              imagen_url: r.ciudades.imagen_url,
              reino_id: r.ciudades.reino_id,
            })),
        ];

        setResultados(merged);
      } catch {
        setResultados([]);
      } finally {
        setIsFetching(false);
      }
    }, 280);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, userId]);

  return { resultados, isFetching };
}

export function GlobalCommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const { abrirApp } = useAppPanels();
  const router = useRouter();
  const { user, isAdmin } = useAuth() as { user: any; isAdmin: boolean };
  const { dark, toggleDark } = useTheme();
  const isDark = dark === "dark";

  const [search, setSearch] = useState("");

  // ── Modo prefijo — "per ab" busca "ab" solo en Personajes ─────────────────
  const PREFIX_MAP: Record<string, string> = {
    per: "Personajes",
    cri: "Criaturas",
    ite: "Items",
    rei: "Reinos",
    ciu: "Ciudades",
    can: "Canciones",
    cap: "Capítulos",
    lib: "Libros",
    ens: "Ensayos",
    don: "Dones",
    hec: "Hechizos",
    run: "Runas",
  };
  // Grupos admin que mapean al mismo tipo
  const PREFIX_ADMIN_GROUPS: Record<string, string[]> = {
    can: ["Canciones", "Canciones (editor)"],
    cap: ["Capítulos", "Capítulos (editor)"],
    lib: ["Libros"],
    per: ["Personajes", "Mis personajes"],
    cri: ["Criaturas", "Mis criaturas"],
    ite: ["Items", "Mis items"],
    rei: ["Reinos", "Mis reinos"],
    ciu: ["Ciudades", "Mis ciudades"],
  };

  const searchLower = search.trimStart().toLowerCase();
  const prefixMatch = Object.keys(PREFIX_MAP).find(
    (p) => searchLower.startsWith(p + " ") || searchLower === p,
  );
  const activePrefix = prefixMatch ?? null; // "per"
  const activeGroup = activePrefix ? PREFIX_MAP[activePrefix] : null; // "Personajes"
  // Query real que se manda a Supabase (lo que va después del prefijo)
  // Si solo hay prefijo sin texto aún, mandamos "%%" para que ilike traiga todo
  const prefixQuery = activePrefix
    ? search.trim().slice(activePrefix.length).trimStart()
    : search;
  // Lo que realmente viaja a los hooks — mínimo "%%" cuando hay prefijo solo,
  // y con prefijo activo bajamos el umbral a 1 char (per a ya busca)
  const hookQuery =
    activePrefix && prefixQuery.length === 0
      ? "%%"
      : activePrefix && prefixQuery.length === 1
        ? `%${prefixQuery}%`
        : prefixQuery;

  const { data, isFetching: isFetchingAdmin } = useGlobalSearch(hookQuery);
  const fromCache = data?.fromCache ?? false;

  // Búsqueda pública — activa para TODOS los usuarios (admin y no-admin)
  const {
    canciones: cancionesPublicas,
    capitulos: capitulosPublicos,
    libros: librosPublicos,
    isFetching: isFetchingPublic,
  } = usePublicSearch(hookQuery);

  // Búsqueda sobre lo desbloqueado por el propio usuario (personajes, criaturas, items)
  // — disponible para TODOS los usuarios logueados, admin o no.
  const { resultados: unlockedResultados, isFetching: isFetchingUnlocked } =
    useUnlockedSearch(hookQuery, user?.id ?? null);

  // Browse público — carga inicial sin query para el panel "Descubrir"
  const {
    libros: browseLibros,
    canciones: browseCanciones,
    loaded: browseLoaded,
  } = usePublicBrowse();

  const isFetching = isFetchingAdmin || isFetchingPublic || isFetchingUnlocked;

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
    [router, setOpen],
  );

  // Abre una app del dashboard (ejercicios, ingredientes, recetas, ropa, libros) —
  // navega al escritorio si hace falta y luego actualiza el store compartido
  const goApp = useCallback(
    (id: Parameters<typeof abrirApp>[0]) => {
      setOpen(false);
      if (pathname === "/myself/escritorio") {
        abrirApp(id);
      } else {
        router.push("/myself/escritorio");
        setTimeout(() => abrirApp(id), 400);
      }
    },
    [router, setOpen, pathname, abrirApp],
  );

  // Abre una entidad en el EditorGarlia — si ya estamos ahí despacha directo
  // por evento; si no, navega y deja la solicitud en un "buzón" persistente
  // (sessionStorage) que EditorGarlia consume apenas monta. Esto evita perder
  // la apertura cuando la navegación/hidratación tarda más de lo esperado
  // (el setTimeout fijo era una carrera: si el listener aún no existía,
  // el CustomEvent se perdía para siempre).
  const goEntity = useCallback(
    (tabla: string, id: string) => {
      setOpen(false);
      const dispatch = () =>
        window.dispatchEvent(
          new CustomEvent("garlia-open-entity", { detail: { tabla, id } }),
        );
      if (pathname === "/myself/garlia") {
        dispatch();
      } else {
        try {
          sessionStorage.setItem(
            "garlia-pending-open-entity",
            JSON.stringify({ tabla, id, ts: Date.now() }),
          );
        } catch {}
        router.push("/myself/garlia");
        // Disparo adicional por si ya estaba montado (misma pestaña, SPA nav).
        // Si EditorGarlia ya consumió el buzón, no repetimos el dispatch.
        setTimeout(() => {
          let alreadyHandled = false;
          try {
            alreadyHandled = !sessionStorage.getItem(
              "garlia-pending-open-entity",
            );
          } catch {}
          if (!alreadyHandled) dispatch();
        }, 400);
      }
    },
    [router, setOpen, pathname],
  );

  // Abre una canción en el EditorGarlia
  const goCancion = useCallback(
    (id: string) => {
      setOpen(false);
      const dispatch = () => {
        localStorage.setItem("estudio-letras-last-id", id);
        window.dispatchEvent(
          new CustomEvent("garlia-open-entity", {
            detail: { tabla: "canciones", id },
          }),
        );
        window.dispatchEvent(new Event("estudio-letras-action"));
      };
      if (pathname === "/myself/garlia") {
        dispatch();
      } else {
        try {
          sessionStorage.setItem(
            "garlia-pending-open-entity",
            JSON.stringify({ tabla: "canciones", id, ts: Date.now() }),
          );
        } catch {}
        localStorage.setItem("estudio-letras-last-id", id);
        router.push("/myself/garlia");
        setTimeout(() => {
          let alreadyHandled = false;
          try {
            alreadyHandled = !sessionStorage.getItem(
              "garlia-pending-open-entity",
            );
          } catch {}
          if (!alreadyHandled) dispatch();
        }, 400);
      }
    },
    [router, setOpen, pathname],
  );

  // Abre un capítulo específico en el EditorGarlia
  const goCapitulo = useCallback(
    (capId: string, libroId: string) => {
      setOpen(false);
      const dispatch = () => {
        localStorage.setItem("estudio-caps-last-cap", capId);
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
    [router, setOpen, pathname],
  );

  // Abre un ensayo específico en /myself/ensayos
  const goEnsayo = useCallback(
    (id: string) => {
      setOpen(false);
      localStorage.setItem("ensayos-active-id", id);
      localStorage.removeItem("ensayos-at-home");
      if (pathname === "/myself/escritorio") {
        window.dispatchEvent(
          new CustomEvent("ensayos-open", { detail: { id } }),
        );
      } else {
        router.push("/myself/escritorio");
      }
    },
    [router, setOpen, pathname],
  );

  // Navega al editor y dispara createAndOpen para entidades principales
  const goEditorAndCreate = useCallback(
    (tab: string) => {
      const dispatch = () =>
        window.dispatchEvent(
          new CustomEvent("garlia-create-entity", { detail: { tab } }),
        );
      if (pathname === "/myself/garlia") {
        dispatch();
      } else {
        router.push("/myself/garlia");
        setTimeout(dispatch, 400);
      }
    },
    [router, pathname],
  );

  // Navega al editor y dispara onAddMagic para el resto (hechizos, notas, etc.)
  const goEditorAndDispatch = useCallback(
    (key: string) => {
      const dispatch = () =>
        window.dispatchEvent(
          new CustomEvent("garlia-add-magic", { detail: { key } }),
        );
      if (pathname === "/myself/garlia") {
        dispatch();
      } else {
        router.push("/myself/garlia");
        setTimeout(dispatch, 400);
      }
    },
    [router, pathname],
  );

  // Abre el modal de detalle de un personaje/criatura/item/reino/ciudad YA
  // DESBLOQUEADO — mismo patrón de "buzón" que goEntity: si la página destino
  // ya está montada despachamos directo, si no dejamos la solicitud en
  // sessionStorage para que la consuma apenas monte.
  // Personajes/criaturas/items abren en /garlia/personal.
  // Reinos/ciudades abren en /garlia/mapa.
  const goUnlockedEntity = useCallback(
    (
      tipo: "personaje" | "criatura" | "item" | "reino" | "ciudad",
      entidadId: string,
      reinoId?: string | null,
    ) => {
      setOpen(false);
      const esMapa = tipo === "reino" || tipo === "ciudad";
      const destino = esMapa ? "/garlia/mapa" : "/garlia/personal";
      const eventName = esMapa ? "mapa-open-entity" : "personal-open-entity";
      const storageKey = esMapa
        ? "mapa-pending-open-entity"
        : "personal-pending-open-entity";
      const detail = esMapa
        ? { tipo, entidad_id: entidadId, reino_id: reinoId ?? null }
        : { tipo, entidad_id: entidadId };

      const dispatch = () =>
        window.dispatchEvent(new CustomEvent(eventName, { detail }));

      if (pathname === destino) {
        dispatch();
      } else {
        try {
          sessionStorage.setItem(
            storageKey,
            JSON.stringify({ ...detail, ts: Date.now() }),
          );
        } catch {}
        router.push(destino);
        // Para el mapa NO hacemos el dispatch de respaldo por timeout — el
        // propio mapaGarlia.tsx consume el buzón apenas "reinos" carga,
        // evitando el parpadeo de aplicar la selección dos veces (una vez
        // por el timeout ciego y otra por el efecto que ve "reinos" listo).
        if (!esMapa) {
          setTimeout(() => {
            let alreadyHandled = false;
            try {
              alreadyHandled = !sessionStorage.getItem(storageKey);
            } catch {}
            if (!alreadyHandled) dispatch();
          }, 400);
        }
      }
    },
    [router, setOpen, pathname],
  );

  // ── Static command definitions ─────────────────────────────────────────────

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
      keywords: ["libros", "historias", "leer"],
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
      keywords: ["galería", "arte", "imágenes"],
      action: () => go("/personal/galeria"),
      group: "Navegar",
    },
  ];

  const appItems: CommandItem[] = isAdmin
    ? [
        {
          id: "app-ejercicios",
          label: "Ejercicios",
          icon: Dumbbell,
          keywords: ["ejercicios", "gym", "entrenar", "fitness"],
          action: () => goApp("ejercicios"),
          group: "Apps",
        },
        {
          id: "app-ingredientes",
          label: "Ingredientes",
          icon: Package,
          keywords: ["ingredientes", "despensa", "cocina"],
          action: () => goApp("ingredientes"),
          group: "Apps",
        },
        {
          id: "app-recetas",
          label: "Recetas",
          icon: UtensilsCrossed,
          keywords: ["recetas", "cocina", "comida"],
          action: () => goApp("recetas"),
          group: "Apps",
        },
        {
          id: "app-ropa",
          label: "Ropa",
          icon: Shirt,
          keywords: ["ropa", "armario", "outfit"],
          action: () => goApp("ropa"),
          group: "Apps",
        },
        {
          id: "app-biblioteca",
          label: "Biblioteca",
          description: "Tus libros",
          icon: Library,
          keywords: ["biblioteca", "libros", "leer"],
          action: () => goApp("libros"),
          group: "Apps",
        },
      ]
    : [];

  const userItems: CommandItem[] = user
    ? [
        {
          id: "mi-personaje",
          label: "Mi personaje",
          icon: CircleUser,
          keywords: ["mi personaje", "perfil"],
          action: () => go("/garlia/personal"),
          group: "Cuenta",
        },
      ]
    : [
        {
          id: "login",
          label: "Iniciar sesión",
          icon: CircleUser,
          keywords: ["login", "entrar"],
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
          keywords: ["editor", "garlia", "myself"],
          action: () => go("/myself/garlia"),
          group: "Admin",
        },
        {
          id: "abrir-crear",
          label: "Añadir",
          description: "Crear personaje, libro, capítulo…",
          icon: Sparkles,
          keywords: ["add", "crear", "nuevo", "nueva", "añadir"],
          action: () => setSearch("add"),
          group: "Admin",
        },
      ]
    : [];

  const themeItems: CommandItem[] = [
    {
      id: "toggle-dark",
      label: isDark ? "Modo claro" : "Modo oscuro",
      icon: isDark ? Sun : Moon,
      keywords: ["oscuro", "claro", "tema", "dark", "light"],
      action: () => {
        toggleDark();
        setOpen(false);
      },
      group: "Ajustes",
    },
  ];

  // Comandos de creación — solo admin
  const createItems: CommandItem[] = isAdmin
    ? [
        {
          id: "add-personaje",
          label: "Nuevo personaje",
          icon: Users,
          keywords: ["add", "crear", "nuevo", "personaje"],
          action: () => {
            setOpen(false);
            goEditorAndCreate("personajes");
          },
          group: "Crear",
        },
        {
          id: "add-criatura",
          label: "Nueva criatura",
          icon: Swords,
          keywords: ["add", "crear", "nueva", "criatura"],
          action: () => {
            setOpen(false);
            goEditorAndCreate("criaturas");
          },
          group: "Crear",
        },
        {
          id: "add-reino",
          label: "Nuevo reino",
          icon: Crown,
          keywords: ["add", "crear", "nuevo", "reino"],
          action: () => {
            setOpen(false);
            goEditorAndCreate("reinos");
          },
          group: "Crear",
        },
        {
          id: "add-objeto",
          label: "Nuevo objeto",
          icon: Package,
          keywords: ["add", "crear", "nuevo", "objeto", "item"],
          action: () => {
            setOpen(false);
            goEditorAndCreate("items");
          },
          group: "Crear",
        },
        {
          id: "add-ciudad",
          label: "Nueva ciudad",
          icon: MapPin,
          keywords: ["add", "crear", "nueva", "ciudad"],
          action: () => {
            setOpen(false);
            goEditorAndDispatch("ciudad");
          },
          group: "Crear",
        },
        {
          id: "add-hechizo",
          label: "Nuevo hechizo",
          icon: Wand2,
          keywords: ["add", "crear", "nuevo", "hechizo"],
          action: () => {
            setOpen(false);
            goEditorAndDispatch("hechizos");
          },
          group: "Crear",
        },
        {
          id: "add-don",
          label: "Nuevo don",
          icon: Zap,
          keywords: ["add", "crear", "nuevo", "don"],
          action: () => {
            setOpen(false);
            goEditorAndDispatch("dones");
          },
          group: "Crear",
        },
        {
          id: "add-runa",
          label: "Nueva runa",
          icon: ScrollText,
          keywords: ["add", "crear", "nueva", "runa"],
          action: () => {
            setOpen(false);
            goEditorAndDispatch("runas");
          },
          group: "Crear",
        },
        {
          id: "add-nota",
          label: "Nueva nota",
          icon: FileText,
          keywords: ["add", "crear", "nueva", "nota"],
          action: () => {
            setOpen(false);
            goEditorAndDispatch("notas");
          },
          group: "Crear",
        },
        {
          id: "add-acontecimiento",
          label: "Nuevo acontecimiento",
          icon: Clock,
          keywords: ["add", "crear", "nuevo", "acontecimiento"],
          action: () => {
            setOpen(false);
            goEditorAndDispatch("acontecimiento");
          },
          group: "Crear",
        },
        {
          id: "add-grupo",
          label: "Nuevo grupo",
          icon: Layers,
          keywords: ["add", "crear", "nuevo", "grupo"],
          action: () => {
            setOpen(false);
            goEditorAndDispatch("grupos");
          },
          group: "Crear",
        },
        {
          id: "add-libro",
          label: "Nuevo libro",
          icon: BookOpen,
          keywords: ["add", "crear", "nuevo", "libro"],
          action: () => {
            setOpen(false);
            goEditorAndDispatch("libro");
          },
          group: "Crear",
        },
        {
          id: "add-capitulo",
          label: "Nuevo capítulo",
          icon: BookText,
          keywords: ["add", "crear", "nuevo", "capitulo"],
          action: () => {
            setOpen(false);
            goEditorAndDispatch("capitulo");
          },
          group: "Crear",
        },
        {
          id: "add-cancion",
          label: "Nueva canción",
          icon: Music,
          keywords: ["add", "crear", "nueva", "cancion"],
          action: () => {
            setOpen(false);
            goEditorAndDispatch("cancion");
          },
          group: "Crear",
        },
        {
          id: "add-ensayo",
          label: "Nuevo ensayo",
          icon: FileText,
          keywords: ["add", "crear", "nuevo", "ensayo", "nota"],
          action: () => {
            setOpen(false);
            const dispatch = () =>
              window.dispatchEvent(new Event("ensayos-new-nota"));
            if (pathname === "/myself/escritorio") {
              dispatch();
            } else {
              router.push("/myself/escritorio");
              setTimeout(dispatch, 400);
            }
          },
          group: "Crear",
        },
        {
          id: "add-ensayo-libro",
          label: "Nuevo libro (ensayo)",
          icon: BookOpen,
          keywords: ["add", "crear", "nuevo", "libro", "ensayo"],
          action: () => {
            setOpen(false);
            const dispatch = () =>
              window.dispatchEvent(new Event("ensayos-new-libro"));
            if (pathname === "/myself/escritorio") {
              dispatch();
            } else {
              router.push("/myself/escritorio");
              setTimeout(dispatch, 400);
            }
          },
          group: "Crear",
        },
      ]
    : [];

  const staticItems: CommandItem[] = [
    ...navItems,
    ...appItems,
    ...userItems,
    ...adminItems,
    ...themeItems,
  ];

  // ── Detectar modo "Crear" — al escribir add/crear/nuevo ───────────────────
  const CREATE_TRIGGERS = ["add", "crear", "nuevo", "nueva"];
  const showCreateGrid =
    isAdmin &&
    CREATE_TRIGGERS.some(
      (t) =>
        search.trim().toLowerCase() === t ||
        search
          .trim()
          .toLowerCase()
          .startsWith(t + " "),
    );

  const GRID_COLS = 3;
  const [gridIndex, setGridIndex] = useState(0);

  // ref estable para los items activos en el grid (create o prefix)
  const createItemsRef = useRef<CommandItem[]>([]);
  createItemsRef.current = createItems;

  const prefixItemsRef = useRef<CommandItem[]>([]);

  const dynamicActive = search.trim().length >= 2 || activePrefix !== null;
  const showDynamic = dynamicActive && !showCreateGrid;

  // ── Pantalla inicial (sin búsqueda) — también se muestra en columnas ──────
  const showDefaultGrid = !showDynamic && !showCreateGrid;
  const defaultGridItemsRef = useRef<CommandItem[]>([]);

  const inGridMode = showCreateGrid || !!activePrefix || showDefaultGrid;

  // Ref siempre al día con qué lista corresponde al modo grid ACTUAL.
  // Evita que el handler de teclado (creado en el efecto de abajo) quede
  // con un closure viejo de `activePrefix`/`showCreateGrid` cuando el modo
  // cambia sin que `inGridMode` cambie de valor (p.ej. prefix -> default,
  // que en ambos casos deja inGridMode en `true`).
  const activeGridItemsRef = useRef<CommandItem[]>([]);
  activeGridItemsRef.current = showCreateGrid
    ? createItemsRef.current
    : activePrefix
      ? prefixItemsRef.current
      : defaultGridItemsRef.current;

  // Reset index al entrar en cualquier modo grid
  useEffect(() => {
    if (inGridMode) setGridIndex(0);
  }, [inGridMode]);

  // Navegación con flechas — activa en todos los modos grid
  useEffect(() => {
    if (!inGridMode) return;
    const handler = (e: KeyboardEvent) => {
      if (
        !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter"].includes(
          e.key,
        )
      )
        return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const items = activeGridItemsRef.current;
      setGridIndex((prev) => {
        const total = items.length;
        if (!total) return prev;
        if (e.key === "ArrowRight") return (prev + 1) % total;
        if (e.key === "ArrowLeft") return (prev - 1 + total) % total;
        if (e.key === "ArrowDown") return Math.min(prev + GRID_COLS, total - 1);
        if (e.key === "ArrowUp") return Math.max(prev - GRID_COLS, 0);
        if (e.key === "Enter") {
          items[prev]?.action();
          return prev;
        }
        return prev;
      });
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inGridMode, showCreateGrid]);

  // Scroll automático al item seleccionado en el grid
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!inGridMode) return;
    const el = listRef.current?.querySelector(
      `[data-grid-index="${gridIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [gridIndex, inGridMode]);

  // Resultados públicos — visibles para usuarios NO-admin cuando hay búsqueda activa.
  // Libros, canciones y capítulos navegan a sus rutas públicas (/garlia/...).
  const publicDynamicItems: CommandItem[] = dynamicActive
    ? [
        ...librosPublicos.map((l) => ({
          id: `l-pub-${l.id}`,
          label: l.titulo,
          description: l.sinopsis
            ? l.sinopsis.slice(0, 60) + (l.sinopsis.length > 60 ? "…" : "")
            : (l.estado ?? "Libro"),
          icon: BookText,
          avatar: l.portada_url ?? null,
          action: () => go(`/garlia/libros/${toSlug(l.titulo)}`),
          group: "Libros",
        })),
        ...cancionesPublicas.map((c) => ({
          id: `c-pub-${c.id}`,
          label: c.titulo,
          description: c.cantante ?? "Canción",
          icon: Music,
          avatar: c.portada_url ?? null,
          action: () => go(`/garlia/canciones/${toSlug(c.titulo)}`),
          group: "Canciones",
        })),
        ...capitulosPublicos.map((c) => {
          const libroSlug = toSlug(c.libro_titulo ?? "");
          const destino = libroSlug
            ? `/garlia/libros/${libroSlug}/leer/${c.orden}`
            : `/garlia/libros`;
          return {
            id: `cap-pub-${c.id}`,
            label: c.titulo_capitulo,
            description: c.libro_titulo
              ? `Cap. ${c.orden} · ${c.libro_titulo}`
              : `Capítulo ${c.orden}`,
            icon: BookOpen,
            avatar: c.libro_portada ?? null,
            action: () => go(destino),
            group: "Capítulos",
          };
        }),
        // Personajes, criaturas, items, reinos y ciudades que el propio
        // usuario tiene desbloqueados — visible para cualquier usuario
        // logueado, no solo admins.
        ...unlockedResultados.map((d) => {
          const iconMap = {
            personaje: User,
            criatura: Swords,
            item: Package,
            reino: Crown,
            ciudad: Building2,
          } as const;
          const groupMap = {
            personaje: "Mis personajes",
            criatura: "Mis criaturas",
            item: "Mis items",
            reino: "Mis reinos",
            ciudad: "Mis ciudades",
          } as const;
          return {
            id: `unlocked-${d.tipo}-${d.entidad_id}`,
            label: d.nombre ?? "Sin nombre",
            description: "Desbloqueado",
            icon: iconMap[d.tipo] ?? Sparkles,
            avatar: d.imagen_url ?? null,
            action: () => goUnlockedEntity(d.tipo, d.entidad_id, d.reino_id),
            group: groupMap[d.tipo] ?? "Mis descubrimientos",
          };
        }),
      ]
    : [];

  // Resultados de admin — solo para administradores, abren en EditorGarlia
  const adminDynamicItems: CommandItem[] =
    dynamicActive && isAdmin
      ? [
          ...(data?.personajes ?? []).map((p) => ({
            id: `p-${p.id}`,
            label: p.nombre,
            description: p.especie ?? "Personaje",
            icon: User,
            avatar: p.img_url,
            action: () => goEntity("personajes", p.id),
            group: "Personajes",
          })),
          ...(data?.libros ?? []).map((l) => ({
            id: `l-${l.id}`,
            label: l.titulo,
            description: l.estado ?? "Libro",
            icon: BookText,
            avatar: l.portada_url,
            action: () => goEntity("libros", l.id),
            group: "Libros",
          })),
          // Para admin, las canciones abren en el editor (no en la ruta pública)
          ...(data?.canciones ?? []).map((c) => ({
            id: `c-${c.id}`,
            label: c.titulo,
            description: c.cantante ?? "Canción",
            icon: Music,
            avatar: c.portada_url,
            action: () => goCancion(c.id),
            group: "Canciones (editor)",
          })),
          // Para admin, los capítulos abren en el editor
          ...(data?.capitulos ?? []).map((c) => ({
            id: `cap-${c.id}`,
            label: c.titulo_capitulo ?? `Capítulo ${c.orden}`,
            description: `Cap. ${c.orden}`,
            icon: BookOpen,
            avatar: null,
            action: () => goCapitulo(c.id, c.libro_id ?? ""),
            group: "Capítulos (editor)",
          })),
          ...(data?.reinos ?? []).map((r) => ({
            id: `r-${r.id}`,
            label: r.nombre,
            description: "Reino",
            icon: Crown,
            avatar: r.logo_url,
            action: () => goEntity("reinos", r.id),
            group: "Reinos",
          })),
          ...(data?.criaturas ?? []).map((c) => ({
            id: `cr-${c.id}`,
            label: c.nombre,
            description: "Criatura",
            icon: Swords,
            avatar: c.imagen_url,
            action: () => goEntity("criaturas", c.id),
            group: "Criaturas",
          })),
          ...(data?.ciudades ?? []).map((c) => ({
            id: `ci-${c.id}`,
            label: c.nombre,
            description: "Ciudad",
            icon: Building2,
            avatar: c.imagen_url,
            action: () => goEntity("ciudades", c.id),
            group: "Ciudades",
          })),
          ...(data?.ensayos ?? []).map((e) => {
            const tags: string[] = Array.isArray(e.tags) ? e.tags : [];
            const esLibro = tags.includes("libro");
            const esTag = tags.includes("tag");
            const badge = esLibro ? "libro" : esTag ? "tag" : "nota";
            const otherTags = tags
              .filter((t) => t !== "libro" && t !== "tag")
              .slice(0, 2)
              .map((t) => `#${t}`)
              .join(" ");
            return {
              id: `ens-${e.id}`,
              label: e.titulo ?? "Sin título",
              description: [badge, otherTags].filter(Boolean).join(" · "),
              icon: FileText,
              avatar: null,
              action: () => goEnsayo(e.id),
              group: "Ensayos",
            };
          }),
        ]
      : [];

  // Unir: admin ve sus items de editor + los públicos del lector (para poder navegar como usuario)
  // No-admin solo ve los públicos del lector.
  const allDynamicItems: CommandItem[] = isAdmin
    ? [...adminDynamicItems, ...publicDynamicItems]
    : [...publicDynamicItems];

  // Si hay prefijo activo, filtrar solo el grupo correspondiente
  const dynamicItems: CommandItem[] = activeGroup
    ? allDynamicItems.filter((item) => {
        const allowed = PREFIX_ADMIN_GROUPS[activePrefix!] ?? [activeGroup];
        return allowed.includes(item.group);
      })
    : allDynamicItems;

  const hasDynamicResults = dynamicItems.length > 0;

  // Elementos de descubrimiento público — se muestran cuando no hay búsqueda activa
  const browseItems: CommandItem[] =
    !showDynamic && browseLoaded
      ? [
          ...browseLibros.map((l) => ({
            id: `browse-l-${l.id}`,
            label: l.titulo,
            description: l.sinopsis
              ? l.sinopsis.slice(0, 60) + (l.sinopsis.length > 60 ? "…" : "")
              : (l.estado ?? "Libro"),
            icon: BookText,
            avatar: l.portada_url ?? null,
            keywords: ["libro", "leer", l.titulo],
            action: () => go(`/garlia/libros/${toSlug(l.titulo)}`),
            group: "Descubrir · Libros",
          })),
          ...browseCanciones.map((c) => ({
            id: `browse-c-${c.id}`,
            label: c.titulo,
            description: c.cantante ?? "Canción",
            icon: Music,
            avatar: c.portada_url ?? null,
            keywords: ["cancion", "música", c.titulo],
            action: () => go(`/garlia/canciones/${toSlug(c.titulo)}`),
            group: "Descubrir · Canciones",
          })),
        ]
      : [];

  // Group static items
  const staticGroups = staticItems.reduce<Record<string, CommandItem[]>>(
    (acc, item) => {
      (acc[item.group] ??= []).push(item);
      return acc;
    },
    {},
  );

  // Lista plana (estáticos + descubrir) que usa el grid de la pantalla inicial
  const defaultFlatItems = [...staticItems, ...browseItems];
  defaultGridItemsRef.current = defaultFlatItems;

  // Group dynamic items
  const dynamicGroups = dynamicItems.reduce<Record<string, CommandItem[]>>(
    (acc, item) => {
      (acc[item.group] ??= []).push(item);
      return acc;
    },
    {},
  );

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
            style={{
              background: "color-mix(in srgb, var(--bg-main) 60%, transparent)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}
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
                border:
                  "var(--border-width) solid color-mix(in srgb, var(--primary) 15%, transparent)",
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
                style={{
                  borderBottom:
                    "var(--border-width) solid color-mix(in srgb, var(--primary) 10%, transparent)",
                  height: "48px",
                }}
              >
                {isFetching ? (
                  <Loader2
                    className="animate-spin shrink-0"
                    size={14}
                    style={{
                      color:
                        "color-mix(in srgb, var(--primary) 35%, transparent)",
                    }}
                  />
                ) : (
                  <Search
                    size={14}
                    style={{
                      color:
                        "color-mix(in srgb, var(--primary) 35%, transparent)",
                      flexShrink: 0,
                    }}
                  />
                )}
                {/* Badge de prefijo activo */}
                {activeGroup && (
                  <span
                    className="shrink-0 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
                    style={{
                      background:
                        "color-mix(in srgb, var(--primary) 12%, transparent)",
                      color: "var(--primary)",
                      border:
                        "var(--border-width) solid color-mix(in srgb, var(--primary) 20%, transparent)",
                    }}
                  >
                    {activeGroup}
                  </span>
                )}
                <Command.Input
                  autoFocus
                  className="flex-1 bg-transparent outline-none text-sm"
                  placeholder="Buscar personajes, libros, canciones…"
                  style={{
                    color: "var(--primary)",
                    caretColor: "var(--primary)",
                  }}
                  value={search}
                  onValueChange={setSearch}
                />
                <kbd
                  className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded hidden sm:flex items-center"
                  style={{
                    background:
                      "color-mix(in srgb, var(--primary) 8%, transparent)",
                    color:
                      "color-mix(in srgb, var(--primary) 40%, transparent)",
                    border:
                      "var(--border-width) solid color-mix(in srgb, var(--primary) 12%, transparent)",
                  }}
                >
                  esc
                </kbd>
              </div>

              {/* Results */}
              <Command.List
                ref={listRef}
                className="custom-scrollbar"
                style={{
                  maxHeight: "360px",
                  overflowY: "auto",
                  padding: "6px",
                }}
              >
                {/* Grid de creación — al escribir "add / crear / nuevo" */}
                {showCreateGrid && (
                  <Command.Group>
                    <div
                      className="text-[8px] font-black uppercase tracking-widest px-3 pt-3 pb-2"
                      style={{
                        color:
                          "color-mix(in srgb, var(--primary) 30%, transparent)",
                      }}
                    >
                      Crear nuevo
                    </div>
                    <div
                      className="grid gap-1.5 px-1 pb-2"
                      style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
                    >
                      {createItems.map((item, i) => (
                        <CommandGridItem
                          key={item.id}
                          item={item}
                          index={i}
                          isSelected={i === gridIndex}
                          onHover={() => setGridIndex(i)}
                        />
                      ))}
                    </div>
                  </Command.Group>
                )}

                {/* Resultados dinámicos — siempre en grid */}
                {showDynamic &&
                  hasDynamicResults &&
                  (() => {
                    const flatItems = activePrefix
                      ? Object.values(dynamicGroups).flat()
                      : Object.values(dynamicGroups).flat();
                    prefixItemsRef.current = flatItems;
                    const groupLabel = activeGroup ?? "Resultados";
                    return activePrefix ? (
                      <Command.Group>
                        <div
                          className="text-[8px] font-black uppercase tracking-widest px-3 pt-3 pb-2"
                          style={{
                            color:
                              "color-mix(in srgb, var(--primary) 30%, transparent)",
                          }}
                        >
                          {groupLabel}
                        </div>
                        <div
                          className="grid gap-1.5 px-1 pb-2"
                          style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
                        >
                          {flatItems.map((item, i) => (
                            <CommandGridItem
                              key={item.id}
                              item={item}
                              index={i}
                              isSelected={i === gridIndex}
                              onHover={() => setGridIndex(i)}
                            />
                          ))}
                        </div>
                      </Command.Group>
                    ) : (
                      Object.entries(dynamicGroups).map(
                        ([groupName, items]) => {
                          prefixItemsRef.current =
                            Object.values(dynamicGroups).flat();
                          return (
                            <Command.Group key={groupName}>
                              <div
                                className="text-[8px] font-black uppercase tracking-widest px-3 pt-3 pb-2"
                                style={{
                                  color:
                                    "color-mix(in srgb, var(--primary) 30%, transparent)",
                                }}
                              >
                                {groupName}
                              </div>
                              <div
                                className="grid gap-1.5 px-1 pb-2"
                                style={{
                                  gridTemplateColumns: "repeat(3, 1fr)",
                                }}
                              >
                                {items.map((item, i) => {
                                  const globalIndex = flatItems.indexOf(item);
                                  return (
                                    <CommandGridItem
                                      key={item.id}
                                      item={item}
                                      index={globalIndex}
                                      isSelected={globalIndex === gridIndex}
                                      onHover={() => setGridIndex(globalIndex)}
                                    />
                                  );
                                })}
                              </div>
                            </Command.Group>
                          );
                        },
                      )
                    );
                  })()}

                {/* Comandos estáticos — pantalla inicial en columnas (como "Crear") */}
                {!showDynamic &&
                  Object.entries(staticGroups).map(([groupName, items]) => (
                    <Command.Group key={groupName}>
                      <div
                        className="text-[8px] font-black uppercase tracking-widest px-3 pt-3 pb-2"
                        style={{
                          color:
                            "color-mix(in srgb, var(--primary) 30%, transparent)",
                        }}
                      >
                        {groupName}
                      </div>
                      <div
                        className="grid gap-1.5 px-1 pb-2"
                        style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
                      >
                        {items.map((item) => {
                          const globalIndex = defaultFlatItems.indexOf(item);
                          return (
                            <CommandGridItem
                              key={item.id}
                              item={item}
                              index={globalIndex}
                              isSelected={globalIndex === gridIndex}
                              onHover={() => setGridIndex(globalIndex)}
                            />
                          );
                        })}
                      </div>
                    </Command.Group>
                  ))}

                {/* Descubrir — libros y canciones públicas cuando no hay búsqueda activa */}
                {!showDynamic && browseLoaded && browseItems.length > 0 && (
                  <>
                    {["Descubrir · Libros", "Descubrir · Canciones"].map(
                      (groupName) => {
                        const items = browseItems.filter(
                          (i) => i.group === groupName,
                        );
                        if (!items.length) return null;
                        return (
                          <Command.Group key={groupName}>
                            <div
                              className="text-[8px] font-black uppercase tracking-widest px-3 pt-3 pb-2"
                              style={{
                                color:
                                  "color-mix(in srgb, var(--primary) 30%, transparent)",
                              }}
                            >
                              {groupName}
                            </div>
                            <div
                              className="grid gap-1.5 px-1 pb-2"
                              style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
                            >
                              {items.map((item) => {
                                const globalIndex =
                                  defaultFlatItems.indexOf(item);
                                return (
                                  <CommandGridItem
                                    key={item.id}
                                    item={item}
                                    index={globalIndex}
                                    isSelected={globalIndex === gridIndex}
                                    onHover={() => setGridIndex(globalIndex)}
                                  />
                                );
                              })}
                            </div>
                          </Command.Group>
                        );
                      },
                    )}
                  </>
                )}

                {/* Sin resultados dinámicos pero con búsqueda activa */}
                {showDynamic && !hasDynamicResults && !isFetching && (
                  <div
                    className="flex flex-col items-center gap-2 py-10"
                    style={{
                      color:
                        "color-mix(in srgb, var(--primary) 35%, transparent)",
                    }}
                  >
                    <Flower2 size={20} />
                    {activePrefix && prefixQuery.length === 0 ? (
                      <span className="text-xs font-medium">
                        Cargando {activeGroup}…
                      </span>
                    ) : (
                      <span className="text-xs font-medium">
                        Sin resultados para &ldquo;{prefixQuery || search}
                        &rdquo;
                      </span>
                    )}
                  </div>
                )}
              </Command.List>

              {/* Footer */}
              <div
                className="flex items-center gap-3 px-4 py-2"
                style={{
                  borderTop:
                    "var(--border-width) solid color-mix(in srgb, var(--primary) 8%, transparent)",
                  color: "color-mix(in srgb, var(--primary) 28%, transparent)",
                }}
              >
                <span className="text-[9px] font-black uppercase tracking-widest">
                  ↑↓ navegar
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest">
                  ↵ abrir
                </span>
                {inGridMode && (
                  <span
                    className="text-[9px] font-black uppercase tracking-widest"
                    style={{
                      color:
                        "color-mix(in srgb, var(--primary) 28%, transparent)",
                    }}
                  >
                    ← → ↑ ↓ mover
                  </span>
                )}
                {showDynamic && (
                  <span
                    className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest ml-auto"
                    style={{
                      color: fromCache
                        ? "color-mix(in srgb, var(--primary) 40%, transparent)"
                        : "color-mix(in srgb, var(--primary) 28%, transparent)",
                    }}
                  >
                    <WifiOff
                      className={fromCache ? "opacity-100" : "opacity-0"}
                      size={9}
                    />
                    {fromCache ? "cache local" : "en línea"}
                  </span>
                )}
                {!showDynamic && !showCreateGrid && (
                  <span
                    className="text-[9px] font-black uppercase tracking-widest ml-auto"
                    style={{
                      color:
                        "color-mix(in srgb, var(--primary) 28%, transparent)",
                    }}
                  >
                    per · cri · lib · can…
                  </span>
                )}
                {!showDynamic && !showCreateGrid && (
                  <span
                    className="text-[9px] font-black uppercase tracking-widest"
                    style={{
                      color:
                        "color-mix(in srgb, var(--primary) 28%, transparent)",
                    }}
                  >
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

// ── Grid item (panel Crear) ───────────────────────────────────────────────────

function CommandGridItem({
  item,
  index,
  isSelected,
  onHover,
}: {
  item: CommandItem;
  index: number;
  isSelected: boolean;
  onHover: () => void;
}) {
  const Icon = item.icon;
  const hasAvatar = !!item.avatar;

  return (
    <Command.Item
      data-grid-index={index}
      className="group flex flex-col items-center justify-center gap-2 cursor-pointer outline-none transition-all duration-100 min-w-0 w-full"
      style={{
        padding: "12px 8px",
        borderRadius: "var(--radius-btn)",
        border: `var(--border-width) solid ${isSelected ? "color-mix(in srgb, var(--primary) 25%, transparent)" : "color-mix(in srgb, var(--primary) 10%, transparent)"}`,
        background: isSelected
          ? "color-mix(in srgb, var(--primary) 6%, transparent)"
          : "transparent",
      }}
      value={`${item.id} ${item.label} ${item.keywords?.join(" ") ?? ""}`}
      onSelect={item.action}
      onMouseEnter={onHover}
    >
      {/* Imagen o icono */}
      {hasAvatar ? (
        <img
          alt={item.label}
          src={item.avatar!}
          className="shrink-0 object-cover"
          style={{
            width: 44,
            height: 44,
            borderRadius: "var(--radius-btn)",
            border: isSelected
              ? "2px solid color-mix(in srgb, var(--primary) 30%, transparent)"
              : "2px solid color-mix(in srgb, var(--primary) 10%, transparent)",
          }}
        />
      ) : (
        <span
          className="flex items-center justify-center shrink-0 transition-colors duration-100"
          style={{
            width: 44,
            height: 44,
            borderRadius: "var(--radius-btn)",
            background: isSelected
              ? "color-mix(in srgb, var(--primary) 12%, transparent)"
              : "color-mix(in srgb, var(--primary) 7%, transparent)",
            color: "var(--primary)",
          }}
        >
          <Icon size={18} strokeWidth={1.75} />
        </span>
      )}

      <p
        className="text-[10px] font-semibold text-center leading-tight w-full truncate px-1"
        style={{ color: "var(--primary)" }}
      >
        {item.label.replace(/^(Nuevo|Nueva|New)\s+/i, "")}
      </p>

      {item.description && (
        <p
          className="text-[9px] text-center leading-tight w-full truncate px-1 -mt-1"
          style={{
            color: "color-mix(in srgb, var(--primary) 40%, transparent)",
          }}
        >
          {item.description}
        </p>
      )}
    </Command.Item>
  );
}
