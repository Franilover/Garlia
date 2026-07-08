"use client";

import {
  Bug,
  ChevronLeft,
  FileText,
  Layers,
  Loader2,
  Map,
  MapPin,
  Music,
  Network,
  Package,
  ScrollText,
  Sparkles,
  Star,
  UserCircle2,
  Users,
} from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  MarkdownEditor,
  type WikiEntity,
} from "@/components/forms/Markdown/MarkdownEditor";
import { ModalNuevaCancion } from "@/features/editorGarlia/components/canciones/modals/ModalNuevaCancion";
import type { Cancion } from "@/features/editorGarlia/hooks/canciones/types";
import { EntidadOverlay } from "@/features/editorGarlia/components/shared/EntidadOverlay";
import EstudioCapitulos from "@/features/editorGarlia/views/EditorCapitulos";
import EditorMisiones from "@/features/editorGarlia/views/editorMisiones";
import AdminDescubrimientos from "@/features/editorGarlia/views/editorRelaciones";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { useSectionHotkeys } from "@/hooks/useSectionHotkeys";
import { db } from "@/lib/api/client/db";
import { supabase } from "@/lib/api/client/supabase";

import { useGrupos, GRUPO_TIPO_CONFIG, type Grupo } from "./EditorGrupo";
import { EditorMapa } from "./EditorMapa";
import { SaveIndicator } from "@/features/editorGarlia/components/shared/UIComponents";
import { useWikilink } from "@/features/editorGarlia/components/shared/WikilinkContext";
import { useNotas } from "../hooks/notas/useNotas";
import {
  type Ciudad,
  type MundoSectionKey,
  type Nota,
  type Personaje,
  type Reino,
  type SaveStatus,
} from "../hooks/types";
import { PanelHistoriaMundo } from "../views/EditorLineaTiempo";

// ─── Dexie helpers ────────────────────────────────────────────────────────────
async function dexieReadAll<T>(tabla: string): Promise<T[]> {
  try {
    if (!db) return [];
    const t = (db as any)[tabla];
    if (!t) return [];
    return ((await t.toArray()) as any[]).filter((r: any) => !r.deleted) as T[];
  } catch {
    return [];
  }
}
async function _dexieWriteAll(tabla: string, rows: any[]): Promise<void> {
  try {
    if (!db) return;
    const t = (db as any)[tabla];
    if (!t) return;
    if (rows.length > 0) await t.bulkPut(rows);
    const remoteIds = new Set(rows.map((r: any) => r.id));
    const local: any[] = await t.toArray();
    const toDelete = local
      .map((r: any) => r.id)
      .filter((id: string) => !remoteIds.has(id));
    if (toDelete.length > 0) await t.bulkDelete(toDelete);
  } catch {}
}

// ─── Tipos locales de entidades mínimas ──────────────────────────────────────
type CriaturaMin = {
  id: string;
  nombre: string;
  imagen_url?: string;
  habitat?: string;
};
type ObjetoMin = {
  id: string;
  nombre: string;
  imagen_url?: string;
  categoria?: string;
};
type CiudadMin = {
  id: string;
  nombre: string;
  imagen_url?: string;
  tipo?: string;
  reino_id?: string;
};
type EntidadMagicaMin = { id: string; nombre: string };
type RunaMin = { id: string; nombre: string; imagen_url?: string | null };

// ─── NOTA DE MIGRACIÓN ────────────────────────────────────────────────────────
// useEntityList (genérico casero) + sus wrappers useReinos/useCriaturas/
// useObjetos/useCiudades/usePersonajesList fueron eliminados. Ese mismo patrón
// (Dexie primero → Supabase si no hay datos frescos → realtime) ya existe,
// mejor implementado, en useSupabaseData (src/hooks/data/useSupabaseData.ts):
// agrega realtime vía postgres_changes, reconexión con backoff, polling de
// respaldo, y CRUD con cola offline (addRow/updateRow/deleteRow). Las 6 tablas
// que faltaban (reinos, hechizos, dones, runas, grupos_mundo, ciudades) se
// agregaron a DEXIE_TABLES/OFFLINE_WRITABLE ahí, y a SYNC_TABLES en
// useOfflineSync.tsx (paso obligatorio: sin esa entrada, las mutaciones
// offline de esas tablas se descartan en silencio al volver la conexión).
// PanelListas ahora llama useSupabaseData("reinos"), etc. directamente.

// ─── Hook: grupos del mundo (filtrable por tipo) ──────────────────────────────
type GrupoTodo = {
  id: string;
  nombre: string;
  tipo: string;
  miembro_ids: string[];
};
// (GrupoTodo used in useGruposTodos return type)

function useGruposMundo(filtroTipo?: string) {
  const [grupos, setGrupos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const isMounted = useRef(true);

  const fetchRemote = useCallback(
    async (ctrl: AbortController) => {
      try {
        let query = supabase
          .from("grupos_mundo")
          .select(
            "id, nombre, tipo, miembro_ids, descripcion, created_at, updated_at",
          )
          .order("nombre");
        if (filtroTipo) query = (query as any).eq("tipo", filtroTipo);
        const { data } = await (query as any).abortSignal(ctrl.signal);
        if (ctrl.signal.aborted || !isMounted.current) return;
        const result = (data ?? []).map((r: any) => ({
          id: r.id,
          nombre: r.nombre,
          tipo: r.tipo ?? "",
          miembro_ids: r.miembro_ids ?? [],
        }));
        setGrupos(result);
        setLoading(false);
        // Persistir en Dexie para uso offline
        try {
          if (db && (db as any).grupos_mundo && data?.length) {
            await (db as any).grupos_mundo.bulkPut(data);
          }
        } catch {}
      } catch (e: any) {
        if (ctrl.signal.aborted || e?.name === "AbortError") return;
        if (isMounted.current) setLoading(false);
      }
    },
    [filtroTipo],
  );

  useEffect(() => {
    isMounted.current = true;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const run = async () => {
      try {
        if (db && (db as any).grupos_mundo) {
          const all = (await (db as any).grupos_mundo.toArray()) as any[];
          if (ctrl.signal.aborted || !isMounted.current) return;
          const local = all
            .filter(
              (g: any) => !g.deleted && (!filtroTipo || g.tipo === filtroTipo),
            )
            .map((g: any) => ({
              id: g.id,
              nombre: g.nombre,
              tipo: g.tipo ?? "",
              miembro_ids: g.miembro_ids ?? [],
            }));
          if (local.length) {
            setGrupos(local);
            setLoading(false);
          }
        }
        if (!navigator.onLine) {
          setLoading(false);
          return;
        }
        await fetchRemote(ctrl);
      } catch (e: any) {
        if (ctrl.signal.aborted || e?.name === "AbortError") return;
        if (isMounted.current) setLoading(false);
      }
    };

    void run();

    // Recargar al recuperar conexión
    const handleOnline = () => {
      if (!isMounted.current) return;
      const freshCtrl = new AbortController();
      abortRef.current = freshCtrl;
      void fetchRemote(freshCtrl);
    };
    window.addEventListener("online", handleOnline);

    return () => {
      isMounted.current = false;
      ctrl.abort();
      window.removeEventListener("online", handleOnline);
    };
  }, [filtroTipo, fetchRemote]);

  return { grupos, loading };
}

function useGruposTodos() {
  const { grupos, loading } = useGruposMundo();
  return { grupos: grupos as GrupoTodo[], loading };
}

// ─── Detección de viewport "computadora" (mismo breakpoint que sm: de Tailwind) ──
// Se usa para que el colapso de SeccionEntidades sea por fila solo en pantallas
// de escritorio; en mobile cada sección sigue siendo individual.
function useIsDesktop(breakpointPx = 640) {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(min-width: ${breakpointPx}px)`);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpointPx]);
  return isDesktop;
}

// ─── Colapso compartido por fila ─────────────────────────────────────────────
// Igual que el colapso individual de SeccionEntidades, pero pensado para que
// varias secciones de una misma fila compartan un único estado (y una única
// clave de localStorage), de modo que abrir/cerrar una abra/cierre todas.
function useRowCollapse(storageKey: string, defaultCollapsed: boolean) {
  const lsKey = `garlia-section-collapsed-${storageKey}`;
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(lsKey);
      if (stored !== null) return stored === "true";
    } catch {}
    return defaultCollapsed;
  });

  const persist = useCallback(
    (value: boolean) => {
      try {
        localStorage.setItem(lsKey, String(value));
      } catch {}
    },
    [lsKey],
  );

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      persist(next);
      return next;
    });
  }, [persist]);

  const expand = useCallback(() => {
    setCollapsed((prev) => {
      if (!prev) return prev;
      persist(false);
      return false;
    });
  }, [persist]);

  return { collapsed, toggle, expand };
}

// Handle expuesto por PanelColapsable y SeccionEntidades — permite expandir
// la sección (si estaba colapsada) y obtener su nodo DOM para hacer scroll
// con los atajos Alt+N.
type SeccionHandleRef = {
  expand: () => void;
  getElement: () => HTMLDivElement | null;
};

// ─── Barra colapsable para paneles grandes (Mapa, Relaciones, Misiones) ──────
// Misma idea visual que el header de SeccionEntidades (título + chevron que
// rota), pero pensada para envolver un panel completo en vez de una grilla de
// chips. El estado se persiste en localStorage igual que useRowCollapse.
const PanelColapsable = React.forwardRef<
  SeccionHandleRef,
  {
    icon: React.ElementType;
    label: string;
    storageKey: string;
    defaultCollapsed?: boolean;
    children: React.ReactNode;
  }
>(function PanelColapsable(
  { icon: Icon, label, storageKey, defaultCollapsed = false, children },
  ref,
) {
  const { collapsed, toggle, expand } = useRowCollapse(
    storageKey,
    defaultCollapsed,
  );
  const rootRef = useRef<HTMLDivElement>(null);

  React.useImperativeHandle(ref, () => ({
    expand,
    getElement: () => rootRef.current,
  }));

  return (
    <div ref={rootRef} className="flex-1 flex flex-col min-h-0">
      <button
        className="flex items-center gap-1.5 px-3 py-2 w-full group cursor-pointer select-none shrink-0"
        type="button"
        onClick={toggle}
      >
        <Icon
          aria-hidden="true"
          className="text-primary/30 shrink-0"
          size={12}
        />
        <span
          className="text-micro font-black uppercase tracking-[0.25em] flex-1 text-left"
          style={{
            color: "color-mix(in srgb, var(--primary) 30%, transparent)",
          }}
        >
          {label}
        </span>
        <ChevronLeft
          className="text-primary/20 group-hover:text-primary/40 transition-all shrink-0"
          size={10}
          style={{
            transform: collapsed ? "rotate(-90deg)" : "rotate(-270deg)",
            transition: "transform 0.2s ease",
          }}
        />
      </button>
      {!collapsed && (
        <div className="flex-1 flex flex-col min-h-0">{children}</div>
      )}
    </div>
  );
});

// ─── Tipos de labels externalizados ──────────────────────────────────────────
export type SectionLabels = {
  historia?: string;
  capitulos?: string;
  entidades?: string;
};

export type EntityLabels = {
  reinos?: string;
  criaturas?: string;
  personajes?: string;
  objetos?: string;
  ciudades?: string;
  hechizos?: string;
  dones?: string;
  runas?: string;
  notas?: string;
  grupos?: string;
  canciones?: string;
};

const DEFAULT_SECTION_LABELS: Required<SectionLabels> = {
  historia: "Historia",
  capitulos: "Capítulos",
  entidades: "Entidades",
};

const DEFAULT_ENTITY_LABELS: Required<EntityLabels> = {
  reinos: "Reinos",
  criaturas: "Criaturas",
  personajes: "Personajes",
  objetos: "Objetos",
  ciudades: "Ciudades",
  hechizos: "Hechizos",
  dones: "Dones",
  runas: "Runas",
  notas: "Notas",
  grupos: "Grupos",
  canciones: "Canciones",
};

// ─── EditorMundo unificado ────────────────────────────────────────────────────
export function EditorMundo({
  textos,
  onTextoChange,
  onSave,
  initialItemId,
  openItem,
  onOverlayChange,
  onItemCreated,
  sectionLabels,
  entityLabels,
}: {
  textos: Record<MundoSectionKey, string>;
  onTextoChange: (section: MundoSectionKey, value: string) => void;
  onSave: (section: MundoSectionKey) => Promise<void>;
  initialItemId?: string;
  openItem?: { tabla: string; id: string; key?: number } | null;
  onOverlayChange?: (hasOverlay: boolean, clearFn: () => void) => void;
  onItemCreated?: { tabla: string; item: any } | null;
  sectionLabels?: SectionLabels;
  entityLabels?: EntityLabels;
}) {
  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      <PanelListas
        entityLabels={entityLabels}
        initialItemId={initialItemId}
        openItem={openItem}
        sectionLabels={sectionLabels}
        textos={textos}
        onItemCreated={onItemCreated}
        onOverlayChange={onOverlayChange}
        onSave={onSave}
        onTextoChange={onTextoChange}
      />
    </div>
  );
}

// ─── Constante de localStorage ────────────────────────────────────────────────
const LS_ITEM_KEY = "garlia-panel-item";
const LS_SCROLL_KEY = "garlia-scroll-pos";

// ─── PanelListas: scroll vertical único ───────────────────────────────────────
function PanelListas({
  initialItemId: _initialItemId,
  openItem,
  textos,
  onTextoChange,
  onSave,
  onOverlayChange,
  onItemCreated,
  sectionLabels: sectionLabelsProp,
  entityLabels: entityLabelsProp,
}: {
  initialItemId?: string;
  openItem?: { tabla: string; id: string; key?: number } | null;
  textos?: Record<MundoSectionKey, string>;
  onTextoChange?: (section: MundoSectionKey, value: string) => void;
  onSave?: (section: MundoSectionKey) => Promise<void>;
  onOverlayChange?: (hasOverlay: boolean, clearFn: () => void) => void;
  onItemCreated?: { tabla: string; item: any } | null;
  sectionLabels?: SectionLabels;
  entityLabels?: EntityLabels;
}) {
  // ── Labels resueltos (prop > default) ────────────────────────────────────
  const _sl = { ...DEFAULT_SECTION_LABELS, ...sectionLabelsProp };
  const el = { ...DEFAULT_ENTITY_LABELS, ...entityLabelsProp };

  // ── Datos — todos cargan al montar ───────────────────────────────────────
  // Migrado de useEntityList casero a useSupabaseData: mismo patrón
  // Dexie→Supabase pero con realtime, reconexión, y CRUD offline incluidos.
  const {
    data: reinos,
    setData: setReinos,
    loading: loadingReinos,
  } = useSupabaseData<Reino>("reinos", {
    select: "*",
    order: { campo: "nombre" },
  });
  const {
    data: criaturas,
    setData: setCriaturas,
    loading: loadingCriaturas,
  } = useSupabaseData<CriaturaMin>("criaturas", {
    select: "id, nombre, imagen_url, habitat",
    order: { campo: "nombre" },
  });
  const {
    data: objetos,
    setData: setObjetos,
    loading: loadingObjetos,
  } = useSupabaseData<ObjetoMin>("items", {
    select: "id, nombre, imagen_url, categoria",
    order: { campo: "nombre" },
  });
  const {
    data: ciudades,
    setData: setCiudades,
    loading: loadingCiudades,
  } = useSupabaseData<CiudadMin>("ciudades", {
    select: "id, nombre, imagen_url, tipo, reino_id",
    order: { campo: "nombre" },
  });
  const {
    data: personajes,
    setData: setPersonajes,
    loading: loadingPersonajes,
  } = useSupabaseData<Personaje>("personajes", {
    select: "id, nombre, img_url, especie, sobre, reino",
    order: { campo: "nombre" },
  });
  const {
    data: hechizos,
    setData: setHechizos,
    loading: loadingHechizos,
  } = useSupabaseData<EntidadMagicaMin>("hechizos", {
    select: "id, nombre",
    order: { campo: "nombre" },
  });
  const {
    data: dones,
    setData: setDones,
    loading: loadingDones,
  } = useSupabaseData<EntidadMagicaMin>("dones", {
    select: "id, nombre",
    order: { campo: "nombre" },
  });
  const {
    data: runas,
    setData: setRunas,
    loading: loadingRunas,
  } = useSupabaseData<RunaMin>("runas", {
    select: "id, nombre, imagen_url",
    order: { campo: "nombre" },
  });
  // Canciones: carga paginada directa desde Supabase (evita el límite de 1000 filas)
  // Dexie se usa solo como caché de lectura rápida; nunca se borran filas locales
  // que no lleguen en el fetch (bulkPut en lugar de dexieWriteAll).
  const [canciones, setCanciones] = useState<Cancion[]>([]);
  const [loadingCanciones, setLoadingCanciones] = useState(true);
  useEffect(() => {
    let cancelled = false;
    const cargarCanciones = async () => {
      // 1. Dexie primero — respuesta instantánea aunque haya 100+ canciones
      try {
        const local = await dexieReadAll<Cancion>("canciones");
        if (local.length && !cancelled) {
          setCanciones(local);
          setLoadingCanciones(false);
        }
      } catch {}

      if (!navigator.onLine || cancelled) {
        setLoadingCanciones(false);
        return;
      }

      // 2. Supabase con paginación completa (PAGE_SIZE páginas hasta agotar)
      try {
        const PAGE_SIZE = 1000;
        let page = 0;
        const todas: Cancion[] = [];
        while (true) {
          const { data, error } = await supabase
            .from("canciones")
            .select(
              "id, titulo, cantante, compositor, idioma, estado, portada_url, links, visible, created_at, updated_at, personaje_id",
            )
            .order("titulo")
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
          if (cancelled) return;
          if (error || !data) break;
          todas.push(...(data as unknown as Cancion[]));
          if (data.length < PAGE_SIZE) break; // última página
          page++;
        }
        if (!cancelled && todas.length) {
          setCanciones(todas);
          setLoadingCanciones(false);
          // Persistir en Dexie sin borrar filas que no llegaron (bulkPut conserva todo)
          try {
            if (db && (db as any).canciones)
              await (db as any).canciones.bulkPut(todas);
          } catch {}
        } else if (!cancelled) {
          setLoadingCanciones(false);
        }
      } catch {
        if (!cancelled) setLoadingCanciones(false);
      }
    };

    void cargarCanciones();
    const handleOnline = () => {
      if (!cancelled) void cargarCanciones();
    };
    window.addEventListener("online", handleOnline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
    };
  }, []);
  const {
    grupos,
    loaded: loadedGrupos,
    actualizarGrupo,
    eliminarGrupo,
  } = useGrupos();
  const {
    notas,
    loading: loadingNotas,
    crear: crearNota,
    actualizar: actualizarNota,
    eliminar: eliminarNota,
  } = useNotas();

  // ── Estado de selección (overlay) ────────────────────────────────────────
  const [selectedReino, setSelectedReino] = useState<Reino | null>(null);
  const [selectedCriatura, setSelectedCriatura] = useState<{
    id: string;
    nombre: string;
    imagen_url?: string;
    habitat?: string;
  } | null>(null);
  const [selectedObjeto, setSelectedObjeto] = useState<{
    id: string;
    nombre: string;
    imagen_url?: string;
    categoria?: string;
  } | null>(null);
  const [selectedCiudad, setSelectedCiudad] = useState<Ciudad | null>(null);
  const [selectedPersonaje, setSelectedPersonaje] = useState<Personaje | null>(
    null,
  );
  const [selectedHechizo, setSelectedHechizo] =
    useState<EntidadMagicaMin | null>(null);
  const [selectedDon, setSelectedDon] = useState<EntidadMagicaMin | null>(null);
  const [selectedRuna, setSelectedRuna] = useState<RunaMin | null>(null);
  const [selectedNota, setSelectedNota] = useState<Nota | null>(null);
  const [selectedGrupo, setSelectedGrupo] = useState<Grupo | null>(null);
  const [selectedCancion, setSelectedCancion] = useState<Cancion | null>(null);
  const [showModalCancion, setShowModalCancion] = useState(false);

  // ── Reino resaltado desde el mapa (flash en la lista, sin panel lateral) ──
  const [highlightedReinoId, setHighlightedReinoId] = useState<string | null>(
    null,
  );
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reinosSeccionRef = useRef<SeccionHandleRef>(null);
  const personajesSeccionRef = useRef<SeccionHandleRef>(null);
  const criaturasSeccionRef = useRef<SeccionHandleRef>(null);
  const objetosSeccionRef = useRef<SeccionHandleRef>(null);
  const ciudadesSeccionRef = useRef<SeccionHandleRef>(null);
  const donesSeccionRef = useRef<SeccionHandleRef>(null);
  const hechizosSeccionRef = useRef<SeccionHandleRef>(null);
  const runasSeccionRef = useRef<SeccionHandleRef>(null);
  const gruposSeccionRef = useRef<SeccionHandleRef>(null);
  const notasSeccionRef = useRef<SeccionHandleRef>(null);
  const cancionesSeccionRef = useRef<SeccionHandleRef>(null);
  const mapaRef = useRef<HTMLDivElement>(null);
  const mapaSeccionRef = useRef<SeccionHandleRef>(null);
  const relacionesMisionesRef = useRef<HTMLDivElement>(null);
  const relacionesSeccionRef = useRef<SeccionHandleRef>(null);
  const misionesSeccionRef = useRef<SeccionHandleRef>(null);
  const reinosChipRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  // Refs que se actualizan cada render para evitar closures stale
  const selectReinoRef = useRef<((r: Reino) => void) | null>(null);
  const reinosRef = useRef<Reino[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  // ── Alto real de cada "página" de sección ───────────────────────────────
  // IMPORTANTE: NO medimos scrollRef.clientHeight con ResizeObserver sobre
  // sí mismo. Ese enfoque anterior generaba un bucle de realimentación:
  // medíamos un contenedor cuyo tamaño nosotros mismos estábamos causando
  // (si algo arriba en el layout no está clipeado al viewport, el
  // contenedor puede inflarse con su propio contenido, el observer
  // dispara de nuevo, se vuelve a medir más grande, etc. — y cada
  // recálculo reactivaba el scroll-snap, empujándote de vuelta arriba).
  //
  // En cambio anclamos contra `window.innerHeight`, que es una constante
  // del navegador que el contenido nunca puede alterar. Calculamos
  // "alto disponible = innerHeight - posición fija del contenedor desde
  // arriba", usando getBoundingClientRect().top, que tampoco depende de
  // cuánto contenido haya adentro.
  const [pageHeight, setPageHeight] = useState<number | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      const top = el.getBoundingClientRect().top;
      const available = Math.max(window.innerHeight - top, 0);
      setPageHeight((prev) => (prev === available ? prev : available));
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);
  const pageHeightStyle = pageHeight
    ? { height: pageHeight, maxHeight: pageHeight, minHeight: pageHeight }
    : { height: "100%", maxHeight: "100%" };
  const entidadesRef = useRef<HTMLDivElement>(null);
  const lineaTiempoRef = useRef<HTMLDivElement>(null);

  const scrollToEntidades = useCallback(() => {
    const doScroll = () => {
      const el = entidadesRef.current;
      if (!el) return;
      const container = scrollRef.current;
      if (container) {
        const elRect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const offset =
          elRect.top - containerRect.top + container.scrollTop - 80; // pequeño margen superior
        container.scrollTo({ top: Math.max(offset, 0), behavior: "smooth" });
      } else {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    // El contenido de arriba (capítulos, listas, etc.) puede seguir cargando
    // y empujando el layout después del primer scroll, dejando la ficha
    // desalineada ("se abre arriba"). Reintentamos varias veces durante
    // una ventana corta para reajustar la posición a medida que el layout
    // se estabiliza.
    const attempts = [0, 120, 300, 550, 850, 1200];
    attempts.forEach((delay) => {
      setTimeout(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(doScroll);
        });
      }, delay);
    });
  }, []);

  const flashReino = useCallback((id: string) => {
    // 1. Expande la sección si estaba colapsada
    reinosSeccionRef.current?.expand();

    // 2. Resaltar el chip visualmente
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    setHighlightedReinoId(id);
    highlightTimerRef.current = setTimeout(
      () => setHighlightedReinoId(null),
      2500,
    );

    // 3. Abrir el editor del reino en el siguiente tick
    //    (para que React procese primero la expansión de la sección)
    setTimeout(() => {
      const reino = reinosRef.current.find((r) => r.id === id);
      if (reino) selectReinoRef.current?.(reino);
    }, 0);

    // 4. Scroll al chip dentro del contenedor scrollable, tras dos frames
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const chipEl = reinosChipRefs.current[id];
        if (!chipEl) return;
        const container = scrollRef.current;
        if (container) {
          const chipRect = chipEl.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const offset =
            chipRect.top -
            containerRect.top +
            container.scrollTop -
            containerRect.height / 2 +
            chipRect.height / 2;
          container.scrollTo({ top: offset, behavior: "smooth" });
        } else {
          chipEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    });
  }, []);

  // ── Scroll position ───────────────────────────────────────────────────────
  const scrollSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const capitulosRef = useRef<HTMLDivElement>(null);

  // ── Atajos de sección (Ctrl+Alt+N) ────────────────────────────────────────
  // Los 5 bloques grandes de la vista "mundo":
  //   Ctrl+Alt+1 → Línea de tiempo
  //   Ctrl+Alt+2 → Capítulos
  //   Ctrl+Alt+3 → Entidades (personajes, criaturas, reinos, dones, etc.)
  //   Ctrl+Alt+4 → Mapa
  //   Ctrl+Alt+5 → Relaciones / Misiones
  useSectionHotkeys([
    // OJO: "1" solo existe si la sección de Historia/línea de tiempo está
    // realmente montada (ver el `{textos && onTextoChange && onSave && (...)}`
    // más abajo). Si la registrábamos siempre, apretar "1" cuando esa
    // sección no se renderiza no hacía nada (el ref.current quedaba en
    // null para siempre) — por eso a veces "el 1 no cambiaba de lugar".
    ...(textos && onTextoChange && onSave
      ? [
          {
            key: "1",
            ref: lineaTiempoRef,
            getScrollContainer: () => scrollRef.current,
          },
        ]
      : []),
    {
      key: "2",
      ref: capitulosRef,
      getScrollContainer: () => scrollRef.current,
    },
    {
      key: "3",
      ref: entidadesRef,
      getScrollContainer: () => scrollRef.current,
    },
    {
      key: "4",
      ref: mapaRef,
      onActivate: () => mapaSeccionRef.current?.expand(),
      getScrollContainer: () => scrollRef.current,
    },
    {
      key: "5",
      ref: relacionesMisionesRef,
      onActivate: () => {
        relacionesSeccionRef.current?.expand();
        misionesSeccionRef.current?.expand();
      },
      getScrollContainer: () => scrollRef.current,
    },
  ]);

  // ── Scroll: solo nativo, cambio de sección solo por teclado ────────────────
  // Antes había un sistema de "snap manual" que interceptaba la rueda del
  // mouse para saltar de sección apenas detectaba (mal, en algunos casos)
  // que habías llegado al borde de una sección. Eso generaba saltos no
  // pedidos (ej. terminar "de la nada" en el Mapa) cada vez que la
  // detección de borde se equivocaba. Lo sacamos entero: cada sección
  // ahora scrollea con el comportamiento normal del navegador, sin
  // ningún JS interceptando la rueda ni forzando `scrollIntoView`. El
  // único modo de saltar de una sección a otra deliberadamente es con los
  // atajos de teclado 1-5 (ver `useSectionHotkeys` más arriba).

  // Esperamos a que `pageHeight` ya esté medido (no null) antes de
  // restaurar: si lo hacíamos apenas montaba el componente, el contenedor
  // podía tener todavía un tamaño transitorio, y el scrollTop guardado no
  // correspondía a los tamaños reales de las secciones — eso generaba
  // saltos que se confundían con el bug de altura. Con este guard, la
  // restauración solo corre una vez que el layout ya se estabilizó.
  const restoredScrollRef = useRef(false);
  useEffect(() => {
    if (restoredScrollRef.current) return;
    if (pageHeight == null) return;
    const saved = (() => {
      try {
        return parseFloat(localStorage.getItem(LS_SCROLL_KEY) ?? "");
      } catch {
        return NaN;
      }
    })();
    if (!isNaN(saved) && scrollRef.current) {
      scrollRef.current.scrollTop = saved;
    }
    restoredScrollRef.current = true;
  }, [pageHeight]);

  const handleScroll = useCallback(() => {
    if (scrollSaveTimer.current) clearTimeout(scrollSaveTimer.current);
    scrollSaveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(
          LS_SCROLL_KEY,
          String(scrollRef.current?.scrollTop ?? 0),
        );
      } catch {}
    }, 200);
  }, []);

  // ── Persistencia del item abierto ─────────────────────────────────────────
  const persistOpenItem = useCallback((tabla: string, id: string) => {
    try {
      localStorage.setItem(LS_ITEM_KEY, JSON.stringify({ tabla, id }));
    } catch {}
  }, []);
  const clearPersistedItem = useCallback(() => {
    try {
      localStorage.removeItem(LS_ITEM_KEY);
    } catch {}
  }, []);

  // ── Wrappers que persisten el item ────────────────────────────────────────
  const selectReino = useCallback(
    (r: Reino | null) => {
      setSelectedReino(r);
      if (r) {
        persistOpenItem("reinos", r.id);
      } else {
        clearPersistedItem();
      }
    },
    [persistOpenItem, clearPersistedItem],
  );
  // Mantener refs sincronizados para que flashReino pueda usarlos sin closure stale
  reinosRef.current = reinos;
  selectReinoRef.current = selectReino;
  const selectCriatura = useCallback(
    (c: any | null) => {
      setSelectedCriatura(c);
      if (c) {
        persistOpenItem("criaturas", c.id);
      } else {
        clearPersistedItem();
      }
    },
    [persistOpenItem, clearPersistedItem],
  );
  const selectObjeto = useCallback(
    (o: any | null) => {
      setSelectedObjeto(o);
      if (o) {
        persistOpenItem("items", o.id);
      } else {
        clearPersistedItem();
      }
    },
    [persistOpenItem, clearPersistedItem],
  );
  const selectCiudad = useCallback(
    (l: Ciudad | null) => {
      setSelectedCiudad(l);
      if (l) {
        persistOpenItem("ciudades", l.id);
      } else {
        clearPersistedItem();
      }
    },
    [persistOpenItem, clearPersistedItem],
  );
  const selectPersonaje = useCallback(
    (p: Personaje | null) => {
      setSelectedPersonaje(p);
      if (p) {
        persistOpenItem("personajes", p.id);
      } else {
        clearPersistedItem();
      }
    },
    [persistOpenItem, clearPersistedItem],
  );
  const selectHechizo = useCallback(
    (h: EntidadMagicaMin | null) => {
      setSelectedHechizo(h);
      if (h) {
        persistOpenItem("hechizos", h.id);
      } else {
        clearPersistedItem();
      }
    },
    [persistOpenItem, clearPersistedItem],
  );
  const selectDon = useCallback(
    (d: EntidadMagicaMin | null) => {
      setSelectedDon(d);
      if (d) {
        persistOpenItem("dones", d.id);
      } else {
        clearPersistedItem();
      }
    },
    [persistOpenItem, clearPersistedItem],
  );
  const selectRuna = useCallback(
    (r: RunaMin | null) => {
      setSelectedRuna(r);
      if (r) {
        persistOpenItem("runas", r.id);
      } else {
        clearPersistedItem();
      }
    },
    [persistOpenItem, clearPersistedItem],
  );
  const selectGrupo = useCallback(
    (g: Grupo | null) => {
      setSelectedGrupo(g);
      if (g) {
        persistOpenItem("grupos_mundo", g.id);
      } else {
        clearPersistedItem();
      }
    },
    [persistOpenItem, clearPersistedItem],
  );
  const selectCancion = useCallback(
    (c: Cancion | null) => {
      setSelectedCancion(c);
      if (c) {
        persistOpenItem("canciones", c.id);
      } else {
        clearPersistedItem();
      }
    },
    [persistOpenItem, clearPersistedItem],
  );
  // ── Overlay activo ────────────────────────────────────────────────────────
  const overlay:
    | "reino"
    | "criatura"
    | "objeto"
    | "personaje"
    | "hechizo"
    | "don"
    | "runa"
    | "nota"
    | "ciudad"
    | "grupo"
    | "cancion"
    | null = selectedReino
    ? "reino"
    : selectedCriatura
      ? "criatura"
      : selectedObjeto
        ? "objeto"
        : selectedCiudad
          ? "ciudad"
          : selectedPersonaje
            ? "personaje"
            : selectedHechizo
              ? "hechizo"
              : selectedDon
                ? "don"
                : selectedRuna
                  ? "runa"
                  : selectedNota
                    ? "nota"
                    : selectedGrupo
                      ? "grupo"
                      : selectedCancion
                        ? "cancion"
                        : null;

  const clearAllOverlays = useCallback(() => {
    setSelectedReino(null);
    setSelectedCriatura(null);
    setSelectedObjeto(null);
    setSelectedPersonaje(null);
    setSelectedHechizo(null);
    setSelectedDon(null);
    setSelectedRuna(null);
    setSelectedNota(null);
    setSelectedCiudad(null);
    setSelectedGrupo(null);
    setSelectedCancion(null);
    clearPersistedItem();
  }, [clearPersistedItem]);

  useEffect(() => {
    onOverlayChange?.(!!overlay, clearAllOverlays);
  }, [overlay, clearAllOverlays, onOverlayChange]);

  // ── WikiEntity list ────────────────────────────────────────────────────────
  const allEntityNames = useMemo(
    (): WikiEntity[] => [
      ...personajes.map((e) => ({ name: e.nombre, type: "personaje" })),
      ...criaturas.map((e) => ({ name: e.nombre, type: "criatura" })),
      ...objetos.map((e) => ({ name: e.nombre, type: "ítem" })),
      ...reinos.map((e) => ({ name: e.nombre, type: "reino" })),
      ...ciudades.map((e) => ({ name: e.nombre, type: "ciudad" })),
      ...hechizos.map((e) => ({ name: e.nombre, type: "hechizo" })),
      ...dones.map((e) => ({ name: e.nombre, type: "don" })),
      ...runas.map((e) => ({ name: e.nombre, type: "runa" })),
    ],
    [personajes, criaturas, objetos, reinos, ciudades, hechizos, dones, runas],
  );

  // ── Restaurar item al montar ───────────────────────────────────────────────
  // Estrategia: Dexie primero (instantáneo) → Supabase si no hay datos locales
  useEffect(() => {
    void (async () => {
      try {
        const raw = localStorage.getItem(LS_ITEM_KEY);
        if (!raw) return;
        const { tabla, id } = JSON.parse(raw) as { tabla: string; id: string };

        // 1. Intentar desde Dexie primero (sin latencia de red)
        let data: any = null;
        try {
          if (db) {
            const tablaLocal =
              tabla === "grupos_mundo" ? "grupos_mundo" : tabla;
            data = (await (db as any)[tablaLocal]?.get(id)) ?? null;
            if (data?.deleted) data = null;
          }
        } catch {}

        // 2. Si no está en Dexie, buscar en Supabase
        if (!data && navigator.onLine) {
          const { data: remote } = await supabase
            .from(tabla === "items" ? "items" : tabla)
            .select("*")
            .eq("id", id)
            .single();
          data = remote ?? null;
        }

        if (!data) return;
        if (tabla === "personajes") setSelectedPersonaje(data);
        else if (tabla === "criaturas") setSelectedCriatura(data);
        else if (tabla === "items") setSelectedObjeto(data);
        else if (tabla === "reinos") setSelectedReino(data);
        else if (tabla === "hechizos") setSelectedHechizo(data);
        else if (tabla === "dones") setSelectedDon(data);
        else if (tabla === "runas") setSelectedRuna(data);
        else if (tabla === "ciudades") setSelectedCiudad(data as Ciudad);
        else if (tabla === "grupos_mundo")
          setSelectedGrupo({
            ...data,
            miembro_ids: data.miembro_ids ?? [],
          } as Grupo);
        else if (tabla === "canciones") setSelectedCancion(data as Cancion);
      } catch {}
    })();
  }, []);

  // ── Abrir item desde buscador global (openItem prop) ─────────────────────
  const lastOpenItemRef = useRef<string | null>(null);
  useEffect(() => {
    if (!openItem) return;
    const refKey = `${openItem.tabla}:${openItem.id}:${openItem.key || 0}`;
    const { tabla, id } = openItem;
    let found: any = null;

    if (tabla === "personajes") found = personajes.find((x) => x.id === id);
    else if (tabla === "criaturas") found = criaturas.find((x) => x.id === id);
    else if (tabla === "items") found = objetos.find((x) => x.id === id);
    else if (tabla === "reinos") found = reinos.find((x) => x.id === id);
    else if (tabla === "ciudades") found = ciudades.find((x) => x.id === id);
    else if (tabla === "hechizos") found = hechizos.find((x) => x.id === id);
    else if (tabla === "dones") found = dones.find((x) => x.id === id);
    else if (tabla === "runas") found = runas.find((x) => x.id === id);
    else if (tabla === "canciones") found = canciones.find((x) => x.id === id);
    else if (tabla === "grupos_mundo") found = grupos.find((x) => x.id === id);
    else if (tabla === "notas") found = notas.find((x) => x.id === id);

    if (!found || lastOpenItemRef.current === refKey) return;
    lastOpenItemRef.current = refKey;

    // Limpiar cualquier overlay anterior — si no, el overlay activo (que tiene
    // prioridad fija: reino > criatura > objeto > ... > personaje > ...) puede
    // tapar la nueva selección y parecer que "no deja cambiar" de entidad.
    clearAllOverlays();

    if (tabla === "personajes") setSelectedPersonaje(found);
    else if (tabla === "criaturas") setSelectedCriatura(found);
    else if (tabla === "items") setSelectedObjeto(found);
    else if (tabla === "reinos") setSelectedReino(found);
    else if (tabla === "ciudades") setSelectedCiudad(found);
    else if (tabla === "hechizos") setSelectedHechizo(found);
    else if (tabla === "dones") setSelectedDon(found);
    else if (tabla === "runas") setSelectedRuna(found);
    else if (tabla === "canciones") setSelectedCancion(found);
    else if (tabla === "grupos_mundo") selectGrupo(found);
    else if (tabla === "notas") setSelectedNota(found);

    // Enfocar visualmente el bloque de entidades donde se abrió la ficha,
    // tras dos frames para dar tiempo a que React renderice el overlay.
    scrollToEntidades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    openItem,
    personajes.length,
    criaturas.length,
    objetos.length,
    reinos.length,
    ciudades.length,
    hechizos.length,
    dones.length,
    runas.length,
    canciones.length,
    grupos.length,
    notas.length,
    clearAllOverlays,
    scrollToEntidades,
  ]);

  // ── onItemCreated ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!onItemCreated) return;
    const { tabla, item } = onItemCreated;
    if (tabla === "personajes")
      setPersonajes((p) =>
        p.some((x) => x.id === item.id) ? p : [item, ...p],
      );
    else if (tabla === "criaturas")
      setCriaturas((p) => (p.some((x) => x.id === item.id) ? p : [item, ...p]));
    else if (tabla === "items")
      setObjetos((p) => (p.some((x) => x.id === item.id) ? p : [item, ...p]));
    else if (tabla === "reinos")
      setReinos((p) => (p.some((x) => x.id === item.id) ? p : [item, ...p]));
    else if (tabla === "ciudades")
      setCiudades((p) => (p.some((x) => x.id === item.id) ? p : [item, ...p]));
    else if (tabla === "hechizos")
      setHechizos((p) => (p.some((x) => x.id === item.id) ? p : [item, ...p]));
    else if (tabla === "dones")
      setDones((p) => (p.some((x) => x.id === item.id) ? p : [item, ...p]));
    else if (tabla === "runas")
      setRunas((p) => (p.some((x) => x.id === item.id) ? p : [item, ...p]));

    if (tabla === "personajes") setSelectedPersonaje(item);
    else if (tabla === "criaturas") setSelectedCriatura(item);
    else if (tabla === "items") setSelectedObjeto(item);
    else if (tabla === "reinos") setSelectedReino(item);
    else if (tabla === "ciudades") setSelectedCiudad(item);
    else if (tabla === "hechizos") setSelectedHechizo(item);
    else if (tabla === "dones") setSelectedDon(item);
    else if (tabla === "runas") setSelectedRuna(item);
    else if (tabla === "canciones") setSelectedCancion(item);

    scrollToEntidades();
    // Setters from useState are stable; only re-run when onItemCreated changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onItemCreated, scrollToEntidades]);

  // ── nuevo-ciudad / nueva-nota actions ─────────────────────────────────────
  useEffect(() => {
    const check = () => {
      const action = localStorage.getItem("estudio-listas-action");
      if (action !== "nuevo-ciudad") return;
      localStorage.removeItem("estudio-listas-action");
      void (async () => {
        try {
          const { data, error } = await supabase
            .from("ciudades")
            .insert([{ nombre: "Nuevo ciudad" }])
            .select("*")
            .single();
          if (error || !data) return;
          setCiudades((prev) => [data as CiudadMin, ...prev]);
          setSelectedCiudad(data as Ciudad);
        } catch {}
      })();
    };
    check();
    window.addEventListener("estudio-listas-action", check);
    return () => window.removeEventListener("estudio-listas-action", check);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const check = () => {
      const action = localStorage.getItem("estudio-notas-action");
      if (action !== "nueva-nota") return;
      localStorage.removeItem("estudio-notas-action");
      void crearNota("Nueva nota").then((nueva) => {
        if (nueva) setSelectedNota(nueva);
      });
    };
    check();
    window.addEventListener("estudio-notas-action", check);
    return () => window.removeEventListener("estudio-notas-action", check);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const check = () => {
      const action = localStorage.getItem("estudio-letras-action");
      if (action !== "nueva-cancion") return;
      localStorage.removeItem("estudio-letras-action");
      setShowModalCancion(true);
    };
    check();
    window.addEventListener("estudio-letras-action", check);
    return () => window.removeEventListener("estudio-letras-action", check);
  }, []);

  // ── Navegar a la sección Capítulos desde el sidebar ──────────────────────
  useEffect(() => {
    const goToCapitulos = () => {
      // Si hay un overlay abierto (ej: EditorPersonaje), cerrarlo primero
      clearAllOverlays();
      // Pequeño delay para que el DOM se actualice antes de scrollear
      setTimeout(() => {
        capitulosRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 80);
    };
    window.addEventListener("estudio-caps-action", goToCapitulos);
    return () =>
      window.removeEventListener("estudio-caps-action", goToCapitulos);
  }, [clearAllOverlays]);

  // ── Helper: chip genérico ─────────────────────────────────────────────────
  const Chip = React.forwardRef<
    HTMLButtonElement,
    {
      onClick: () => void;
      imgUrl?: string | null;
      icon: React.ElementType;
      nombre: string;
      accentBg?: string;
      accentBorder?: string;
      accentText?: string;
      fullWidth?: boolean;
      noMaxW?: boolean;
      highlighted?: boolean;
    }
  >(function Chip(
    {
      onClick,
      imgUrl,
      icon: Icon,
      nombre,
      accentBg,
      accentBorder,
      accentText,
      fullWidth,
      noMaxW,
      highlighted,
    },
    ref,
  ) {
    // No basta con que imgUrl exista: la URL puede estar rota, vencida o
    // apuntar a un archivo borrado del storage. Si la carga falla, caemos
    // al ícono en vez de dejar un <img> roto o un hueco en blanco.
    const [imgError, setImgError] = useState(false);
    useEffect(() => {
      setImgError(false);
    }, [imgUrl]);

    const hasImg = !!imgUrl && !imgError;
    const highlightStyle: React.CSSProperties = highlighted
      ? {
          boxShadow: "0 0 0 2px var(--accent)",
          borderColor: "var(--accent)",
          transition: "box-shadow 0.15s ease, border-color 0.15s ease",
        }
      : {};
    if (hasImg) {
      return (
        <button
          ref={ref}
          className={`relative rounded-xl border overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98]${fullWidth ? " w-full" : ""}`}
          style={{
            background:
              accentBg ?? "color-mix(in srgb, var(--primary) 4%, transparent)",
            borderColor:
              accentBorder ??
              "color-mix(in srgb, var(--primary) 12%, transparent)",
            aspectRatio: "1/1",
            width: "100%",
            ...highlightStyle,
          }}
          title={nombre}
          type="button"
          onClick={onClick}
        >
          <img
            alt={nombre}
            className="w-full h-full object-cover"
            src={imgUrl}
            onError={() => setImgError(true)}
          />
        </button>
      );
    }
    return (
      <button
        ref={ref}
        className={`flex items-center justify-center text-center rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98]${fullWidth ? " w-full" : ""} px-3 py-1.5`}
        style={{
          background:
            accentBg ?? "color-mix(in srgb, var(--primary) 4%, transparent)",
          borderColor:
            accentBorder ??
            "color-mix(in srgb, var(--primary) 12%, transparent)",
          ...highlightStyle,
        }}
        type="button"
        onClick={onClick}
      >
        <span
          className={`text-micro font-bold text-center truncate${fullWidth || noMaxW ? "" : " max-w-[120px] sm:max-w-[90px]"}`}
          style={{
            color:
              accentText ??
              "color-mix(in srgb, var(--primary) 70%, transparent)",
          }}
        >
          {nombre}
        </span>
      </button>
    );
  });

  // ── Colapso por fila (solo en computadora) ───────────────────────────────
  // En mobile cada SeccionEntidades sigue colapsándose de forma individual;
  // en desktop, las secciones agrupadas en una misma fila comparten estado:
  // abrir o cerrar cualquiera de ellas abre/cierra toda la fila.
  const isDesktop = useIsDesktop();
  const filaPersonajes = useRowCollapse(
    "fila-personajes-criaturas-reinos",
    false,
  );
  const filaObjetos = useRowCollapse("fila-objetos-ciudades", true);
  const filaDones = useRowCollapse("fila-dones-hechizos-runas", true);
  const filaGrupos = useRowCollapse("fila-grupos-notas", true);

  // ── Helper: sección de entidades ─────────────────────────────────────────
  // Ref imperativa: permite que el padre llame a expand() y obtener el nodo DOM

  const SeccionEntidades = React.forwardRef<
    SeccionHandleRef,
    {
      icon: React.ElementType;
      label: string;
      count: number;
      loading: boolean;
      children: React.ReactNode;
      cols?: 1 | 3;
      minColWidth?: string;
      defaultCollapsed?: boolean;
      storageKey?: string;
      // Modo controlado: cuando se proveen, el colapso lo maneja el padre
      // (usado para que varias secciones de una fila compartan un solo estado
      // en computadora). Si se omiten, la sección se comporta de forma
      // individual e independiente, como antes.
      collapsed?: boolean;
      onToggle?: () => void;
      onExpand?: () => void;
      // Modo grid horizontal: exclusivo de Personajes. Solo tiene efecto
      // real en desktop (fila horizontal); en mobile se ignora y cae al
      // comportamiento dinámico normal.
      horizontalGrid?: boolean;
    }
  >(function SeccionEntidades(
    {
      label,
      count,
      loading,
      children,
      cols: _cols = 3,
      minColWidth: minColWidthProp,
      defaultCollapsed = false,
      horizontalGrid = false,
      storageKey,
      collapsed: collapsedProp,
      onToggle: onToggleProp,
      onExpand,
    },
    ref,
  ) {
    const lsKey = storageKey ? `garlia-section-collapsed-${storageKey}` : null;
    const [collapsedState, setCollapsedState] = useState<boolean>(() => {
      if (lsKey) {
        try {
          const stored = localStorage.getItem(lsKey);
          if (stored !== null) return stored === "true";
        } catch {}
      }
      return defaultCollapsed;
    });

    const isControlled = collapsedProp !== undefined;
    const collapsed = isControlled ? collapsedProp : collapsedState;

    const toggle = () => {
      if (isControlled) {
        onToggleProp?.();
        return;
      }
      setCollapsedState((prev) => {
        const next = !prev;
        if (lsKey) {
          try {
            localStorage.setItem(lsKey, String(next));
          } catch {}
        }
        return next;
      });
    };

    const rootRef = useRef<HTMLDivElement>(null);

    // ── Diseño dinámico según cantidad de items ─────────────────────────────
    // En vez de un tamaño de celda fijo para toda sección sin importar cuántos
    // ítems tenga, ajustamos el tamaño de celda a la cantidad real. Con muy
    // pocos ítems (1-2) el grid deja de tener sentido y se muestra como lista
    // vertical de una columna, aprovechando mejor el espacio en vez de dejar
    // una celda diminuta suelta en una esquina.
    const useListLayout = count > 0 && count <= 2 && !horizontalGrid;
    const dynamicMinColWidth = (() => {
      if (count <= 4) return "84px"; // pocos ítems → celdas grandes, tipo tarjeta
      if (count <= 12) return "60px"; // cantidad media → grid compacto (tamaño previo)
      return "48px"; // muchos ítems → celdas chicas, más columnas
    })();
    const minColWidth = minColWidthProp ?? dynamicMinColWidth;

    // Grid horizontal: solo Personajes lo pide, y solo tiene efecto real en
    // desktop (fila horizontal). En mobile, aunque se pida, no aplica porque
    // ahí las secciones se apilan verticalmente y el grid dinámico normal
    // ya se comporta bien.
    const useHorizontalGrid = horizontalGrid && isDesktop;

    // Exponer expand() y el nodo DOM al padre vía ref
    React.useImperativeHandle(ref, () => ({
      expand: () => {
        if (isControlled) {
          onExpand?.();
          return;
        }
        setCollapsedState((prev) => {
          if (prev) {
            if (lsKey) {
              try {
                localStorage.setItem(lsKey, "false");
              } catch {}
            }
            return false;
          }
          return prev;
        });
      },
      getElement: () => rootRef.current,
    }));

    return (
      <div ref={rootRef} className="pb-1">
        <button
          className="flex items-center gap-1.5 mb-2 w-full group cursor-pointer select-none"
          type="button"
          onClick={toggle}
        >
          <span
            className="text-micro font-black uppercase tracking-[0.25em] flex-1 text-center"
            style={{
              color: "color-mix(in srgb, var(--primary) 30%, transparent)",
            }}
          >
            {label} · {count}
          </span>
          <ChevronLeft
            className="text-primary/20 group-hover:text-primary/40 transition-all shrink-0"
            size={10}
            style={{
              transform: collapsed ? "rotate(-90deg)" : "rotate(-270deg)",
              transition: "transform 0.2s ease",
            }}
          />
        </button>
        {!collapsed &&
          (loading ? (
            <div className="flex justify-center py-3">
              <Loader2 className="animate-spin text-primary/20" size={14} />
            </div>
          ) : count === 0 ? (
            <p className="text-micro text-primary/20 italic px-1 pb-2">
              Sin {label.toLowerCase()} aún
            </p>
          ) : useListLayout ? (
            // Muy pocos ítems: lista vertical de una columna en vez de un
            // grid con celdas sueltas ocupando espacio de forma desigual.
            <div className="flex flex-col gap-1.5">{children}</div>
          ) : useHorizontalGrid ? (
            // Modo grid horizontal (solo Personajes, solo desktop): fila que
            // scrollea horizontalmente en vez de envolver hacia abajo, para
            // secciones con fila propia ancha.
            <div
              className="grid grid-flow-col auto-cols-[minmax(60px,1fr)] gap-1.5 overflow-x-auto pb-1"
              style={{ gridTemplateRows: "repeat(2, minmax(0, 1fr))" }}
            >
              {children}
            </div>
          ) : (
            <div
              className="grid gap-1.5"
              style={{
                gridTemplateColumns: `repeat(auto-fill, minmax(${minColWidth}, 1fr))`,
              }}
            >
              {children}
            </div>
          ))}
      </div>
    );
  });

  const div = "border-t my-2" as const;
  const divStyle = {
    borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* ── Editor overlay (now rendered inline inside the scroll, see ENTIDADES section) ── */}
      {/* ── Scroll vertical ─────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto min-h-0 scroll-smooth"
        onScroll={handleScroll}
      >
        {/* HISTORIA */}
        {textos && onTextoChange && onSave && (
          <div
            ref={lineaTiempoRef}
            className="border-b flex flex-col min-h-0 overflow-y-auto"
            style={{
              borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
              ...pageHeightStyle,
            }}
          >
            <div className="flex-1 min-h-0 flex flex-col">
              <PanelHistoriaMundo
                texto={textos.historia}
                onChange={(v) => onTextoChange("historia", v)}
                onSave={() => onSave("historia")}
                onSelectCancion={async (id) => {
                  // Buscar la canción en la lista local primero
                  const local = canciones.find((c) => c.id === id);
                  const abrir = (c: Cancion) => {
                    // OJO: "cancion" es el último caso en la cadena de
                    // precedencia que decide qué overlay mostrar (ver
                    // `overlay` más arriba: reino > criatura > objeto >
                    // ciudad > personaje > hechizo > don > runa > nota >
                    // grupo > cancion). Si quedaba CUALQUIER otro overlay
                    // seleccionado en memoria de antes, `selectCancion`
                    // actualizaba el estado pero el panel de canción nunca
                    // se mostraba — quedaba tapado por el overlay viejo.
                    // Por eso limpiamos todo primero, igual que hace
                    // `onSelectCapitulo` acá abajo.
                    clearAllOverlays();
                    selectCancion(c);
                    // Este bloque vive dentro de "Entidades", no dentro de
                    // su propia sección — hay que scrollear ahí para que
                    // se vea, tal cual capítulos scrollea a `capitulosRef`.
                    setTimeout(() => {
                      entidadesRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }, 80);
                  };
                  if (local) {
                    abrir(local);
                    return;
                  }
                  // Si no está en memoria, buscarlo en Supabase
                  try {
                    const { data } = await supabase
                      .from("canciones")
                      .select(
                        "id, titulo, cantante, compositor, idioma, estado, portada_url, links, visible, created_at, updated_at, personaje_id",
                      )
                      .eq("id", id)
                      .single();
                    if (data) abrir(data as unknown as Cancion);
                  } catch {}
                }}
                onSelectCapitulo={(capituloId, libroId) => {
                  // Escribir las claves que EditorCapitulosPanel ya sabe leer
                  try {
                    localStorage.setItem("estudio-caps-last-cap", capituloId);
                    localStorage.setItem("estudio-caps-last-libro", libroId);
                  } catch {}
                  // Cerrar cualquier overlay abierto y scrollear a la sección
                  clearAllOverlays();
                  setTimeout(() => {
                    capitulosRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                    // Disparar el evento que EditorCapitulosPanel escucha
                    window.dispatchEvent(
                      new CustomEvent("estudio-caps-action"),
                    );
                  }, 80);
                }}
                onSelectPersonaje={async (id) => {
                  // Buscar el personaje en la lista local primero
                  const local = personajes.find((p) => p.id === id);
                  const abrir = (p: Personaje) => {
                    // Mismo problema que en canciones: limpiar overlays
                    // viejos antes de abrir el nuevo, y scrollear a
                    // "Entidades" (donde vive este overlay) — antes esto
                    // solo cambiaba el estado sin mover la pantalla, así
                    // que si no estabas ya mirando esa sección, parecía
                    // que "no pasaba nada".
                    clearAllOverlays();
                    selectPersonaje(p);
                    setTimeout(() => {
                      entidadesRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }, 80);
                  };
                  if (local) {
                    abrir(local);
                    return;
                  }
                  // Si no está en memoria, buscarlo en Supabase
                  try {
                    const { data } = await supabase
                      .from("personajes")
                      .select("id, nombre, img_url, especie, sobre, reino")
                      .eq("id", id)
                      .single();
                    if (data) abrir(data as Personaje);
                  } catch {}
                }}
              />
            </div>
          </div>
        )}

        {/* CAPÍTULOS */}
        {/*
          EstudioCapitulos ya maneja su propio scroll interno (overflow-hidden
          en su raíz + overflow-y-auto en sus paneles internos), así que en
          condiciones normales nunca desborda este wrapper. Mantenemos
          overflow-y-auto acá (no overflow-hidden) porque el snap manual por
          wheel (más abajo) lee scrollTop/scrollHeight de este mismo nodo
          para decidir cuándo saltar a la sección siguiente — si lo
          cambiamos a overflow-hidden, ese cálculo siempre da "en el borde"
          y el snap avanza en el primer tick de wheel sin dejar interactuar
          con el contenido interno.
        */}
        <div
          ref={capitulosRef}
          className="flex flex-col min-h-0 overflow-y-auto"
          style={pageHeightStyle}
        >
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <EstudioCapitulos />
          </div>
        </div>

        {/* ENTIDADES */}
        <div
          ref={entidadesRef}
          className="border-b border-t flex flex-col min-h-0 overflow-y-auto"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
            position: "relative",
            ...pageHeightStyle,
          }}
        >
          {/* ── Overlay inline: reemplaza solo el bloque de entidades ── */}
          <EntidadOverlay
            actions={{
              clearAllOverlays,
              selectReino,
              selectCiudad,
              selectGrupo,
              selectCancion,
              setSelectedReino,
              setSelectedCriatura,
              setSelectedObjeto,
              setSelectedCiudad,
              setSelectedPersonaje,
              setSelectedHechizo,
              setSelectedDon,
              setSelectedRuna,
              setSelectedNota,
              setSelectedGrupo,
              eliminarNota,
              actualizarNota,
              eliminarGrupo,
              actualizarGrupo,
            }}
            data={{
              reinos,
              criaturas,
              objetos,
              ciudades,
              personajes,
              grupos,
              canciones,
            }}
            entities={allEntityNames}
            overlay={overlay}
            selected={{
              reino: selectedReino,
              criatura: selectedCriatura,
              objeto: selectedObjeto,
              ciudad: selectedCiudad,
              personaje: selectedPersonaje,
              hechizo: selectedHechizo,
              don: selectedDon,
              runa: selectedRuna,
              nota: selectedNota,
              grupo: selectedGrupo,
              cancion: selectedCancion,
            }}
            setters={{
              setReinos,
              setCriaturas,
              setObjetos,
              setCiudades,
              setPersonajes,
              setHechizos,
              setDones,
              setRunas,
            }}
          />

          {/* ── Listas visibles cuando no hay overlay ── */}
          {!overlay && (
            <div className="px-3 sm:px-3 pt-3 pb-4">
              {/* ── Fila 1: Personajes (50%) · Criaturas (25%) · Reinos (25%) ── */}
              <div
                className="sm:grid sm:gap-x-4"
                style={{ gridTemplateColumns: "2fr 1fr 1fr" }}
              >
                <SeccionEntidades
                  ref={personajesSeccionRef}
                  collapsed={isDesktop ? filaPersonajes.collapsed : undefined}
                  count={personajes.length}
                  defaultCollapsed={false}
                  horizontalGrid
                  icon={Users}
                  label={el.personajes}
                  loading={loadingPersonajes}
                  storageKey="personajes"
                  onToggle={isDesktop ? filaPersonajes.toggle : undefined}
                >
                  {[...personajes]
                    .sort(
                      (a, b) =>
                        (!!b.img_url ? 1 : 0) - (!!a.img_url ? 1 : 0) ||
                        a.nombre.localeCompare(b.nombre),
                    )
                    .map((p) => (
                      <Chip
                        key={p.id}
                        icon={UserCircle2}
                        imgUrl={p.img_url}
                        nombre={p.nombre}
                        onClick={() => selectPersonaje(p)}
                      />
                    ))}
                </SeccionEntidades>
                <div className={`${div} sm:hidden`} style={divStyle} />

                <SeccionEntidades
                  ref={criaturasSeccionRef}
                  collapsed={isDesktop ? filaPersonajes.collapsed : undefined}
                  count={criaturas.length}
                  defaultCollapsed={false}
                  icon={Bug}
                  label={el.criaturas}
                  loading={loadingCriaturas}
                  storageKey="criaturas"
                  onToggle={isDesktop ? filaPersonajes.toggle : undefined}
                >
                  {[...criaturas]
                    .sort(
                      (a, b) =>
                        (!!b.imagen_url ? 1 : 0) - (!!a.imagen_url ? 1 : 0) ||
                        a.nombre.localeCompare(b.nombre),
                    )
                    .map((c) => (
                      <Chip
                        key={c.id}
                        icon={Bug}
                        imgUrl={c.imagen_url}
                        nombre={c.nombre}
                        onClick={() => selectCriatura(c)}
                      />
                    ))}
                </SeccionEntidades>
                <div className={`${div} sm:hidden`} style={divStyle} />

                <SeccionEntidades
                  ref={reinosSeccionRef}
                  collapsed={isDesktop ? filaPersonajes.collapsed : undefined}
                  count={reinos.length}
                  defaultCollapsed={false}
                  icon={Map}
                  label={el.reinos}
                  loading={loadingReinos}
                  storageKey="reinos"
                  onExpand={isDesktop ? filaPersonajes.expand : undefined}
                  onToggle={isDesktop ? filaPersonajes.toggle : undefined}
                >
                  {[...reinos]
                    .sort(
                      (a, b) =>
                        (!!b.mapa_url ? 1 : 0) - (!!a.mapa_url ? 1 : 0) ||
                        a.nombre.localeCompare(b.nombre),
                    )
                    .map((r) => (
                      <Chip
                        key={r.id}
                        ref={(el) => {
                          reinosChipRefs.current[r.id] = el;
                        }}
                        highlighted={highlightedReinoId === r.id}
                        icon={Map}
                        imgUrl={r.mapa_url}
                        nombre={r.nombre}
                        onClick={() => selectReino(r)}
                      />
                    ))}
                </SeccionEntidades>
              </div>
              <div className={div} style={divStyle} />

              {/* ── Fila 2: Objetos · Ciudades (colapsados por defecto) ── */}
              <div className="sm:grid sm:grid-cols-2 sm:gap-x-4">
                <SeccionEntidades
                  ref={objetosSeccionRef}
                  collapsed={isDesktop ? filaObjetos.collapsed : undefined}
                  count={objetos.length}
                  defaultCollapsed={true}
                  icon={Package}
                  label="Objetos"
                  loading={loadingObjetos}
                  storageKey="objetos"
                  onExpand={isDesktop ? filaObjetos.expand : undefined}
                  onToggle={isDesktop ? filaObjetos.toggle : undefined}
                >
                  {[...objetos]
                    .sort(
                      (a, b) =>
                        (!!b.imagen_url ? 1 : 0) - (!!a.imagen_url ? 1 : 0) ||
                        a.nombre.localeCompare(b.nombre),
                    )
                    .map((o) => (
                      <Chip
                        key={o.id}
                        icon={Package}
                        imgUrl={o.imagen_url}
                        nombre={o.nombre}
                        onClick={() => selectObjeto(o)}
                      />
                    ))}
                </SeccionEntidades>
                <div className={`${div} sm:hidden`} style={divStyle} />

                <SeccionEntidades
                  ref={ciudadesSeccionRef}
                  collapsed={isDesktop ? filaObjetos.collapsed : undefined}
                  count={ciudades.length}
                  defaultCollapsed={true}
                  icon={MapPin}
                  label={el.ciudades}
                  loading={loadingCiudades}
                  storageKey="ciudades"
                  onExpand={isDesktop ? filaObjetos.expand : undefined}
                  onToggle={isDesktop ? filaObjetos.toggle : undefined}
                >
                  {[...ciudades]
                    .sort(
                      (a, b) =>
                        (!!b.imagen_url ? 1 : 0) - (!!a.imagen_url ? 1 : 0) ||
                        a.nombre.localeCompare(b.nombre),
                    )
                    .map((l) => (
                      <Chip
                        key={l.id}
                        icon={MapPin}
                        imgUrl={l.imagen_url}
                        nombre={l.nombre}
                        onClick={async () => {
                          try {
                            const { data } = await supabase
                              .from("ciudades")
                              .select("*")
                              .eq("id", l.id)
                              .single();
                            if (data) {
                              selectCiudad(data as Ciudad);
                              return;
                            }
                          } catch {}
                          selectCiudad(l as Ciudad);
                        }}
                      />
                    ))}
                </SeccionEntidades>
              </div>
              <div className={div} style={divStyle} />

              {/* ── Fila 3: Sección Mágica — Dones · Hechizos · Runas (colapsados) ── */}
              <div className="sm:grid sm:grid-cols-3 sm:gap-x-4">
                <SeccionEntidades
                  ref={donesSeccionRef}
                  collapsed={isDesktop ? filaDones.collapsed : undefined}
                  count={dones.length}
                  defaultCollapsed={true}
                  icon={Star}
                  label={el.dones}
                  loading={loadingDones}
                  storageKey="dones"
                  onExpand={isDesktop ? filaDones.expand : undefined}
                  onToggle={isDesktop ? filaDones.toggle : undefined}
                >
                  {dones.map((d) => (
                    <Chip
                      key={d.id}
                      accentBg="color-mix(in srgb, var(--accent) 4%, transparent)"
                      accentBorder="color-mix(in srgb, var(--accent) 13%, transparent)"
                      accentText="color-mix(in srgb, var(--accent) 75%, var(--primary))"
                      icon={Star}
                      nombre={d.nombre}
                      onClick={() => selectDon(d)}
                    />
                  ))}
                </SeccionEntidades>
                <div className={`${div} sm:hidden`} style={divStyle} />

                <SeccionEntidades
                  ref={hechizosSeccionRef}
                  collapsed={isDesktop ? filaDones.collapsed : undefined}
                  count={hechizos.length}
                  defaultCollapsed={true}
                  icon={Sparkles}
                  label={el.hechizos}
                  loading={loadingHechizos}
                  storageKey="hechizos"
                  onExpand={isDesktop ? filaDones.expand : undefined}
                  onToggle={isDesktop ? filaDones.toggle : undefined}
                >
                  {hechizos.map((h) => (
                    <Chip
                      key={h.id}
                      accentBg="color-mix(in srgb, var(--accent) 5%, transparent)"
                      accentBorder="color-mix(in srgb, var(--accent) 15%, transparent)"
                      accentText="color-mix(in srgb, var(--accent) 80%, var(--primary))"
                      icon={Sparkles}
                      nombre={h.nombre}
                      onClick={() => selectHechizo(h)}
                    />
                  ))}
                </SeccionEntidades>
                <div className={`${div} sm:hidden`} style={divStyle} />

                <SeccionEntidades
                  ref={runasSeccionRef}
                  collapsed={isDesktop ? filaDones.collapsed : undefined}
                  count={runas.length}
                  defaultCollapsed={true}
                  icon={ScrollText}
                  label={el.runas}
                  loading={loadingRunas}
                  storageKey="runas"
                  onExpand={isDesktop ? filaDones.expand : undefined}
                  onToggle={isDesktop ? filaDones.toggle : undefined}
                >
                  {[...runas]
                    .sort(
                      (a, b) =>
                        (!!b.imagen_url ? 1 : 0) - (!!a.imagen_url ? 1 : 0) ||
                        a.nombre.localeCompare(b.nombre),
                    )
                    .map((r) => (
                      <Chip
                        key={r.id}
                        icon={ScrollText}
                        imgUrl={r.imagen_url}
                        nombre={r.nombre}
                        onClick={() => selectRuna(r)}
                      />
                    ))}
                </SeccionEntidades>
              </div>
              <div className={div} style={divStyle} />

              {/* ── Fila 4: Grupos · Notas (colapsados) ── */}
              <div
                className="sm:grid sm:gap-x-4"
                style={{ gridTemplateColumns: "3fr 1fr" }}
              >
                <SeccionEntidades
                  ref={gruposSeccionRef}
                  collapsed={isDesktop ? filaGrupos.collapsed : undefined}
                  count={grupos.length}
                  defaultCollapsed={true}
                  icon={Layers}
                  label={el.grupos}
                  loading={!loadedGrupos}
                  minColWidth="calc(25% - 0.28125rem)"
                  storageKey="grupos"
                  onExpand={isDesktop ? filaGrupos.expand : undefined}
                  onToggle={isDesktop ? filaGrupos.toggle : undefined}
                >
                  {(() => {
                    const porTipo = grupos.reduce(
                      (acc, g) => {
                        const t = g.tipo || "otro";
                        if (!acc[t]) acc[t] = [];
                        acc[t].push(g);
                        return acc;
                      },
                      {} as Record<string, typeof grupos>,
                    );
                    const entradasOrdenadas = Object.entries(porTipo).sort(
                      ([, a], [, b]) => b.length - a.length,
                    );
                    return entradasOrdenadas.map(([tipo, lista]) => {
                      // Sub-agrupar por subtipo dentro de cada tipo. Los
                      // grupos sin subtipo quedan bajo la clave "" y se
                      // muestran al final, después de los subtipos con
                      // nombre, ordenados de mayor a menor cantidad.
                      const porSubtipo = lista.reduce(
                        (acc, g) => {
                          const s = g.subtipo?.trim() || "";
                          if (!acc[s]) acc[s] = [];
                          acc[s].push(g);
                          return acc;
                        },
                        {} as Record<string, typeof lista>,
                      );
                      const subtiposOrdenados = Object.entries(porSubtipo).sort(
                        ([sa, a], [sb, b]) => {
                          if (sa === "" && sb !== "") return 1;
                          if (sb === "" && sa !== "") return -1;
                          return b.length - a.length;
                        },
                      );

                      return (
                        <div key={tipo} className="flex flex-col gap-1">
                          <span
                            className="block w-full text-micro font-black uppercase tracking-[0.2em] px-1 text-center"
                            style={{
                              color:
                                "color-mix(in srgb, var(--primary) 25%, transparent)",
                            }}
                          >
                            {tipo}
                          </span>
                          <div
                            className="grid gap-2"
                            style={{ gridTemplateColumns: "1fr 1fr" }}
                          >
                            {subtiposOrdenados.map(([subtipo, subLista]) => (
                              <div
                                key={subtipo || "__sin_subtipo__"}
                                className="flex flex-col gap-1"
                              >
                                {subtipo && (
                                  <span
                                    className="block w-full text-micro font-bold uppercase tracking-[0.15em] px-1 text-center"
                                    style={{
                                      color:
                                        "color-mix(in srgb, var(--primary) 18%, transparent)",
                                    }}
                                  >
                                    {subtipo}
                                  </span>
                                )}
                                <div
                                  className="grid gap-1.5"
                                  style={{
                                    gridTemplateColumns:
                                      "repeat(auto-fill, minmax(50px, 1fr))",
                                  }}
                                >
                                  {subLista.map((g) => {
                                    const cfg =
                                      GRUPO_TIPO_CONFIG[
                                        g.tipo as keyof typeof GRUPO_TIPO_CONFIG
                                      ];
                                    return (
                                      <button
                                        key={g.id}
                                        className="flex items-center justify-center text-center px-3 py-1.5 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98]"
                                        style={{
                                          background: `color-mix(in srgb, ${cfg?.color ?? "var(--primary)"} 4%, transparent)`,
                                          borderColor: `color-mix(in srgb, ${cfg?.color ?? "var(--primary)"} 12%, transparent)`,
                                        }}
                                        type="button"
                                        onClick={async () => {
                                          const full = grupos.find(
                                            (x) => x.id === g.id,
                                          );
                                          if (full) {
                                            selectGrupo(full);
                                            return;
                                          }
                                          const { data } = await supabase
                                            .from("grupos_mundo")
                                            .select("*")
                                            .eq("id", g.id)
                                            .single();
                                          if (data)
                                            selectGrupo({
                                              ...data,
                                              miembro_ids:
                                                data.miembro_ids ?? [],
                                            } as Grupo);
                                        }}
                                      >
                                        <span className="text-micro font-bold text-center text-primary/70 truncate">
                                          {g.nombre}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </SeccionEntidades>
                <div className={`${div} sm:hidden`} style={divStyle} />

                <SeccionEntidades
                  ref={notasSeccionRef}
                  collapsed={isDesktop ? filaGrupos.collapsed : undefined}
                  count={notas.length}
                  defaultCollapsed={true}
                  icon={FileText}
                  label={el.notas}
                  loading={loadingNotas}
                  storageKey="notas"
                  onExpand={isDesktop ? filaGrupos.expand : undefined}
                  onToggle={isDesktop ? filaGrupos.toggle : undefined}
                >
                  {notas.map((n) => (
                    <button
                      key={n.id}
                      className="flex items-center justify-center text-center px-3 py-1.5 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98]"
                      style={{
                        background:
                          "color-mix(in srgb, var(--primary) 4%, transparent)",
                        borderColor:
                          "color-mix(in srgb, var(--primary) 12%, transparent)",
                      }}
                      type="button"
                      onClick={() => setSelectedNota(n)}
                    >
                      <span className="text-micro font-bold text-center text-primary/70 truncate">
                        {n.titulo || (
                          <span className="italic text-primary/30">
                            Sin título
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </SeccionEntidades>
              </div>
              <div className={div} style={divStyle} />

              {/* ── Fila 5: Canciones (colapsado, ancho completo) ── */}
              <SeccionEntidades
                ref={cancionesSeccionRef}
                cols={1}
                count={canciones.length}
                defaultCollapsed={true}
                icon={Music}
                label={el.canciones}
                loading={loadingCanciones}
                minColWidth="160px"
                storageKey="canciones"
              >
                {canciones.map((c) => (
                  <Chip
                    key={c.id}
                    noMaxW
                    icon={Music}
                    nombre={c.titulo}
                    onClick={() => selectCancion(c as unknown as Cancion)}
                  />
                ))}
              </SeccionEntidades>
            </div>
          )}
        </div>

        {/* MAPA */}
        <div
          ref={mapaRef}
          className="border-b flex flex-col shrink-0 min-h-0 overflow-y-auto"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
            position: "relative",
            ...pageHeightStyle,
          }}
        >
          <div className="flex-1 flex flex-col min-h-0">
            <PanelColapsable
              ref={mapaSeccionRef}
              icon={Map}
              label="Mapa"
              storageKey="panel-mapa"
            >
              {/* Mapa — ocupa todo el ancho; al click en un reino sube a la lista */}
              <div className="flex-1 flex flex-col min-h-0">
                <EditorMapa onSelectReino={(id) => flashReino(id)} />
              </div>
            </PanelColapsable>
          </div>
        </div>

        {/* RELACIONES · MISIONES — lado a lado en computadora (≥1024px) */}
        <div
          ref={relacionesMisionesRef}
          className="lg:grid lg:grid-cols-2 flex flex-col lg:flex-none min-h-0 overflow-hidden"
          style={pageHeightStyle}
        >
          <div
            className="border-b lg:border-b-0 lg:border-r flex-1 flex flex-col min-h-0 overflow-y-auto"
            style={{
              borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
            }}
          >
            <PanelColapsable
              ref={relacionesSeccionRef}
              icon={Network}
              label="Relaciones"
              storageKey="panel-relaciones"
            >
              <div className="flex-1 flex flex-col min-h-0">
                <AdminDescubrimientos />
              </div>
            </PanelColapsable>
          </div>

          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
            <PanelColapsable
              ref={misionesSeccionRef}
              icon={ScrollText}
              label="Misiones"
              storageKey="panel-misiones"
            >
              <div className="flex-1 flex flex-col min-h-0">
                <EditorMisiones />
              </div>
            </PanelColapsable>
          </div>
        </div>
      </div>

      {/* Modal nueva canción */}
      {showModalCancion && (
        <ModalNuevaCancion
          onClose={() => setShowModalCancion(false)}
          onCreated={(c: Cancion) => {
            setShowModalCancion(false);
            selectCancion(c as unknown as Cancion);
          }}
        />
      )}
    </div>
  );
}

// ─── Panel de texto genérico (reemplaza PanelMagia y el texto de los demás) ──
function PanelTexto({
  texto,
  onChange,
  onSave,
  placeholder,
}: {
  texto: string;
  onChange: (v: string) => void;
  onSave: () => Promise<void>;
  placeholder: string;
}) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { onSnippetAction } = useWikilink();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSave = useCallback(async () => {
    setStatus("saving");
    try {
      await onSave();
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  }, [onSave]);

  // Autosave: 1.5s tras dejar de escribir
  const handleChange = (v: string) => {
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void doSave();
    }, 1500);
  };

  // Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
          debounceRef.current = null;
        }
        void doSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [doSave]);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5">
        <MarkdownEditor
          toolbar
          defaultMode="edit"
          placeholder={placeholder}
          rows={22}
          value={texto}
          onChange={handleChange}
          onSnippetAction={onSnippetAction}
        />
      </div>
      <div
        className="shrink-0 flex items-center justify-end gap-2 px-3 py-1.5 border-t"
        style={{
          borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
        }}
      >
        <SaveIndicator status={status} />
      </div>
    </div>
  );
}
