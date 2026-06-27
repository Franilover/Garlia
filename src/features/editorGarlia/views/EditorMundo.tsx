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
  Package,
  ScrollText,
  Sparkles,
  Star,
  UserCircle2,
  Users,
  X,
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
import { PanelEditor } from "@/features/editorGarlia/components/editorLetras/components/editor/PanelEditor";
import { ModalNuevaCancion } from "@/features/editorGarlia/components/editorLetras/components/modals/ModalNuevaCancion";
import type { Cancion } from "@/features/editorGarlia/components/editorLetras/types";
import EstudioCapitulos from "@/features/editorGarlia/views/EditorCapitulos";
import AdminDescubrimientos from "@/features/editorGarlia/views/editorRelaciones";
import EditorMisiones from "@/features/editorGarlia/components/editorMisiones";
import { db } from "@/lib/api/client/db";
import { supabase } from "@/lib/api/client/supabase";

import { EditorCiudad, type Ciudad } from "./EditorCiudad";
import { EditorCriatura } from "./EditorCriatura";
import {
  EditorGrupo,
  GRUPO_TIPO_CONFIG,
  useGrupos,
  type Grupo,
} from "./EditorGrupo";
import { EditorHechizos } from "./EditorHechizos";
import { EditorItem } from "./EditorItem";
import { EditorNota } from "./EditorNota";
import { EditorPersonaje } from "./EditorPersonaje";
import { EditorMapa } from "./EditorMapa";
import { EditorReino } from "./EditorReino";
import { PanelHistoriaMundo } from "../components/EditorLineaTiempo";
import {
  type MundoSectionKey,
  type Nota,
  type Personaje,
  type Reino,
  type SaveStatus,
} from "../components/types";
import { SaveIndicator } from "../components/UIComponents";
import { useNotas } from "../components/useNotas";
import { useWikilink } from "../components/WikilinkContext";

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
async function dexieWriteAll(tabla: string, rows: any[]): Promise<void> {
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
type VarianteMin = { id: string; tipo: string };
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

// ─── Caché de timestamps de última sincronización remota ─────────────────────
// Evita re-fetchear Supabase en cada mount cuando Dexie ya tiene datos frescos.
const _entityLastFetch: Record<string, number> = {};
const ENTITY_TTL_MS = 60_000; // 1 minuto

// ─── Hook genérico de carga: local (Dexie) → remoto (Supabase) ───────────────
// Reemplaza useReinos, useCriaturas, useObjetos, useCiudades, usePersonajesList,
// useEntidadesMagicas y useRunas, que eran idénticos salvo la tabla y el select.
function useEntityList<T>(
  tablaLocal: string,
  buildQuery: () => any,
  mapResult: (row: any) => T = (r) => r as T,
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const isMounted = useRef(true);

  const fetchRemote = useCallback(
    async (ctrl: AbortController) => {
      try {
        const { data } = await buildQuery().abortSignal(ctrl.signal);
        if (ctrl.signal.aborted || !isMounted.current) return;
        const result = (data ?? []).map(mapResult) as T[];
        setItems(result);
        setLoading(false);
        _entityLastFetch[tablaLocal] = Date.now();
        // Solo escribe en Dexie si hay datos para no borrar la caché con array vacío
        if (result.length) await dexieWriteAll(tablaLocal, result);
      } catch (e: any) {
        if (ctrl.signal.aborted || e?.name === "AbortError") return;
        if (isMounted.current) setLoading(false);
      }
      // tablaLocal is stable; buildQuery/mapResult are inline — intentional
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [tablaLocal],
  );

  useEffect(() => {
    isMounted.current = true;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const run = async () => {
      try {
        const local = await dexieReadAll<T>(tablaLocal);
        if (ctrl.signal.aborted || !isMounted.current) return;
        if (local.length) {
          setItems(local);
          setLoading(false);
        }
        if (!navigator.onLine) {
          if (!local.length) setLoading(false);
          return;
        }

        // Si tenemos datos locales y el fetch fue reciente, no volvemos a pedir
        const lastFetch = _entityLastFetch[tablaLocal] ?? 0;
        const isFresh =
          local.length > 0 && Date.now() - lastFetch < ENTITY_TTL_MS;
        if (isFresh) return;

        await fetchRemote(ctrl);
      } catch (e: any) {
        if (ctrl.signal.aborted || e?.name === "AbortError") return;
        if (isMounted.current) setLoading(false);
      }
    };

    run();

    // Al recuperar conexión siempre forzamos fetch remoto (ignora TTL)
    const handleOnline = () => {
      if (!isMounted.current) return;
      const freshCtrl = new AbortController();
      abortRef.current = freshCtrl;
      fetchRemote(freshCtrl);
    };
    window.addEventListener("online", handleOnline);

    return () => {
      isMounted.current = false;
      ctrl.abort();
      window.removeEventListener("online", handleOnline);
    };
  }, [tablaLocal, fetchRemote]);

  return { items, setItems, loading };
}

// Wrappers tipados que conservan los nombres originales usados en PanelListas
function useReinos() {
  const { items, setItems, loading } = useEntityList<Reino>("reinos", () =>
    supabase.from("reinos").select("*").order("nombre"),
  );
  return { reinos: items, setReinos: setItems, loading };
}

function useCriaturas() {
  const { items, setItems, loading } = useEntityList<CriaturaMin>(
    "criaturas",
    () =>
      supabase
        .from("criaturas")
        .select("id, nombre, imagen_url, habitat")
        .order("nombre"),
  );
  return { criaturas: items, setCriaturas: setItems, loading };
}

function useObjetos() {
  const { items, setItems, loading } = useEntityList<ObjetoMin>("items", () =>
    supabase
      .from("items")
      .select("id, nombre, imagen_url, categoria")
      .order("nombre"),
  );
  return { objetos: items, setObjetos: setItems, loading };
}

function useCiudades() {
  const { items, setItems, loading } = useEntityList<CiudadMin>(
    "ciudades",
    () =>
      supabase
        .from("ciudades")
        .select("id, nombre, imagen_url, tipo, reino_id")
        .order("nombre"),
  );
  return { ciudades: items, setCiudades: setItems, loading };
}

function usePersonajesList() {
  const { items, setItems, loading } = useEntityList<Personaje>(
    "personajes",
    () =>
      supabase
        .from("personajes")
        .select("id, nombre, img_url, especie, sobre, reino")
        .order("nombre"),
  );
  return { personajes: items, setPersonajes: setItems, loading };
}

function useCriaturaVariantes(criaturaId: string | null) {
  const [variantes, setVariantes] = useState<VarianteMin[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const isMounted = useRef(true);

  const fetchRemote = useCallback(async (ctrl: AbortController, id: string) => {
    try {
      const { data } = await (
        supabase
          .from("criatura_variantes")
          .select("id, tipo")
          .eq("criatura_id", id)
          .order("tipo") as any
      ).abortSignal(ctrl.signal);
      if (ctrl.signal.aborted || !isMounted.current) return;
      const result = (data ?? []) as VarianteMin[];
      setVariantes(result);
      setLoading(false);
      try {
        if (db && result.length)
          await (db as any).criatura_variantes?.bulkPut(result);
      } catch {}
    } catch (e: any) {
      if (ctrl.signal.aborted || e?.name === "AbortError") return;
      if (isMounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    if (!criaturaId) {
      setVariantes([]);
      return;
    }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const run = async () => {
      setLoading(true);
      try {
        if (db) {
          const local: any[] =
            (await (db as any).criatura_variantes
              ?.where("criatura_id")
              .equals(criaturaId)
              .toArray()) ?? [];
          if (ctrl.signal.aborted || !isMounted.current) return;
          if (local.length) {
            setVariantes(local);
            setLoading(false);
            if (!navigator.onLine) return;
          }
        }
        if (!navigator.onLine) {
          setLoading(false);
          return;
        }
        await fetchRemote(ctrl, criaturaId);
      } catch (e: any) {
        if (ctrl.signal.aborted || e?.name === "AbortError") return;
        if (isMounted.current) setLoading(false);
      }
    };

    run();

    const handleOnline = () => {
      if (!isMounted.current) return;
      const freshCtrl = new AbortController();
      abortRef.current = freshCtrl;
      fetchRemote(freshCtrl, criaturaId);
    };
    window.addEventListener("online", handleOnline);

    return () => {
      isMounted.current = false;
      ctrl.abort();
      window.removeEventListener("online", handleOnline);
    };
  }, [criaturaId, fetchRemote]);

  return { variantes, loading };
}

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

    run();

    // Recargar al recuperar conexión
    const handleOnline = () => {
      if (!isMounted.current) return;
      const freshCtrl = new AbortController();
      abortRef.current = freshCtrl;
      fetchRemote(freshCtrl);
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
  initialItemId,
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
  const sl = { ...DEFAULT_SECTION_LABELS, ...sectionLabelsProp };
  const el = { ...DEFAULT_ENTITY_LABELS, ...entityLabelsProp };

  // ── Datos — todos cargan al montar ───────────────────────────────────────
  const { reinos, setReinos, loading: loadingReinos } = useReinos();
  const { criaturas, setCriaturas, loading: loadingCriaturas } = useCriaturas();
  const { objetos, setObjetos, loading: loadingObjetos } = useObjetos();
  const { ciudades, setCiudades, loading: loadingCiudades } = useCiudades();
  const {
    personajes,
    setPersonajes,
    loading: loadingPersonajes,
  } = usePersonajesList();
  const {
    items: hechizos,
    setItems: setHechizos,
    loading: loadingHechizos,
  } = useEntityList<EntidadMagicaMin>("hechizos", () =>
    supabase.from("hechizos").select("id, nombre").order("nombre"),
  );
  const {
    items: dones,
    setItems: setDones,
    loading: loadingDones,
  } = useEntityList<EntidadMagicaMin>("dones", () =>
    supabase.from("dones").select("id, nombre").order("nombre"),
  );
  const {
    items: runas,
    setItems: setRunas,
    loading: loadingRunas,
  } = useEntityList<RunaMin>("runas", () =>
    supabase.from("runas").select("id, nombre, imagen_url").order("nombre"),
  );
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

    cargarCanciones();
    const handleOnline = () => {
      if (!cancelled) cargarCanciones();
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
  const reinosSeccionRef = useRef<{ expand: () => void } | null>(null);
  const reinosChipRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  // Refs que se actualizan cada render para evitar closures stale
  const selectReinoRef = useRef<((r: Reino) => void) | null>(null);
  const reinosRef = useRef<Reino[]>([]);

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const capitulosRef = useRef<HTMLDivElement>(null);

  // Restaurar posición de scroll al montar
  useEffect(() => {
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
  }, []);

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
      r ? persistOpenItem("reinos", r.id) : clearPersistedItem();
    },
    [persistOpenItem, clearPersistedItem],
  );
  // Mantener refs sincronizados para que flashReino pueda usarlos sin closure stale
  reinosRef.current = reinos;
  selectReinoRef.current = selectReino;
  const selectCriatura = useCallback(
    (c: any | null) => {
      setSelectedCriatura(c);
      c ? persistOpenItem("criaturas", c.id) : clearPersistedItem();
    },
    [persistOpenItem, clearPersistedItem],
  );
  const selectObjeto = useCallback(
    (o: any | null) => {
      setSelectedObjeto(o);
      o ? persistOpenItem("items", o.id) : clearPersistedItem();
    },
    [persistOpenItem, clearPersistedItem],
  );
  const selectCiudad = useCallback(
    (l: Ciudad | null) => {
      setSelectedCiudad(l);
      l ? persistOpenItem("ciudades", l.id) : clearPersistedItem();
    },
    [persistOpenItem, clearPersistedItem],
  );
  const selectPersonaje = useCallback(
    (p: Personaje | null) => {
      setSelectedPersonaje(p);
      p ? persistOpenItem("personajes", p.id) : clearPersistedItem();
    },
    [persistOpenItem, clearPersistedItem],
  );
  const selectHechizo = useCallback(
    (h: EntidadMagicaMin | null) => {
      setSelectedHechizo(h);
      h ? persistOpenItem("hechizos", h.id) : clearPersistedItem();
    },
    [persistOpenItem, clearPersistedItem],
  );
  const selectDon = useCallback(
    (d: EntidadMagicaMin | null) => {
      setSelectedDon(d);
      d ? persistOpenItem("dones", d.id) : clearPersistedItem();
    },
    [persistOpenItem, clearPersistedItem],
  );
  const selectRuna = useCallback(
    (r: RunaMin | null) => {
      setSelectedRuna(r);
      r ? persistOpenItem("runas", r.id) : clearPersistedItem();
    },
    [persistOpenItem, clearPersistedItem],
  );
  const selectGrupo = useCallback(
    (g: Grupo | null) => {
      setSelectedGrupo(g);
      g ? persistOpenItem("grupos_mundo", g.id) : clearPersistedItem();
    },
    [persistOpenItem, clearPersistedItem],
  );
  const selectCancion = useCallback(
    (c: Cancion | null) => {
      setSelectedCancion(c);
      c ? persistOpenItem("canciones", c.id) : clearPersistedItem();
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
    // Setters from useState are stable; only re-run when onItemCreated changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onItemCreated]);

  // ── nuevo-ciudad / nueva-nota actions ─────────────────────────────────────
  useEffect(() => {
    const check = () => {
      const action = localStorage.getItem("estudio-listas-action");
      if (action !== "nuevo-ciudad") return;
      localStorage.removeItem("estudio-listas-action");
      (async () => {
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
      crearNota("Nueva nota").then((nueva) => {
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
    const hasImg = !!imgUrl;
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
          className={`text-[11px] font-bold text-center truncate${fullWidth || noMaxW ? "" : " max-w-[120px] sm:max-w-[90px]"}`}
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
  // Ref imperativa: permite que el padre llame a expand() sobre la sección
  type SeccionHandle = { expand: () => void };

  const SeccionEntidades = React.forwardRef<
    SeccionHandle,
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
    }
  >(function SeccionEntidades(
    {
      label,
      count,
      loading,
      children,
      cols = 3,
      minColWidth = "60px",
      defaultCollapsed = false,
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

    // Exponer expand() al padre vía ref
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
    }));

    return (
      <div className="pb-1">
        <button
          type="button"
          className="flex items-center gap-1.5 mb-2 w-full group cursor-pointer select-none"
          onClick={toggle}
        >
          <span
            className="text-[10px] font-black uppercase tracking-[0.25em] flex-1 text-center"
            style={{
              color: "color-mix(in srgb, var(--primary) 30%, transparent)",
            }}
          >
            {label} · {count}
          </span>
          <ChevronLeft
            size={10}
            className="text-primary/20 group-hover:text-primary/40 transition-all shrink-0"
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
            <p className="text-[9px] text-primary/20 italic px-1 pb-2">
              Sin {label.toLowerCase()} aún
            </p>
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
        className="flex-1 overflow-y-auto min-h-0"
        onScroll={handleScroll}
      >
        {/* HISTORIA */}
        {textos && onTextoChange && onSave && (
          <div
            className="border-b"
            style={{
              borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
            }}
          >
            <PanelHistoriaMundo
              texto={textos.historia}
              onChange={(v) => onTextoChange("historia", v)}
              onSave={() => onSave("historia")}
              onSelectPersonaje={async (id) => {
                // Buscar el personaje en la lista local primero
                const local = personajes.find((p) => p.id === id);
                if (local) {
                  selectPersonaje(local);
                  return;
                }
                // Si no está en memoria, buscarlo en Supabase
                try {
                  const { data } = await supabase
                    .from("personajes")
                    .select("id, nombre, img_url, especie, sobre, reino")
                    .eq("id", id)
                    .single();
                  if (data) selectPersonaje(data as Personaje);
                } catch {}
              }}
              onSelectCancion={async (id) => {
                // Buscar la canción en la lista local primero
                const local = canciones.find((c) => c.id === id);
                if (local) {
                  selectCancion(local);
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
                  if (data) selectCancion(data as unknown as Cancion);
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
                  window.dispatchEvent(new CustomEvent("estudio-caps-action"));
                }, 80);
              }}
            />
          </div>
        )}

        {/* CAPÍTULOS */}
        <div ref={capitulosRef} style={{ minHeight: "60vh" }}>
          <div className="flex flex-col min-h-0" style={{ minHeight: "58vh" }}>
            <EstudioCapitulos />
          </div>
        </div>

        {/* ENTIDADES */}
        <div
          className="border-b border-t mt-3"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
            position: "relative",
          }}
        >
          {/* ── Overlay inline: reemplaza solo el bloque de entidades ── */}
          {overlay && (
            <div
              className="flex flex-col min-h-0"
              style={{ background: "var(--bg-main)", minHeight: 400 }}
            >
              {/* Botón volver al menú */}
              <div
                className="shrink-0 flex items-center px-3"
                style={{
                  height: 40,
                  borderBottom:
                    "var(--border-width) solid color-mix(in srgb, var(--primary) 8%, transparent)",
                }}
              >
                <button
                  className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 hover:text-primary/70 transition-colors"
                  onClick={clearAllOverlays}
                  type="button"
                >
                  <ChevronLeft size={12} />
                  Volver
                </button>
              </div>

              {/* Contenido del editor activo */}
              <div
                className="flex-1 flex flex-col min-h-0 overflow-hidden"
                style={{ minHeight: 360 }}
              >
                {overlay === "reino" && selectedReino && (
                  <EditorReino
                    key={selectedReino.id}
                    entities={allEntityNames}
                    item={selectedReino}
                    onDeleted={(id) => {
                      setReinos((p) => p.filter((r) => r.id !== id));
                      setSelectedReino(null);
                    }}
                    onSaved={(u) => {
                      setReinos((p) => p.map((r) => (r.id === u.id ? u : r)));
                      setSelectedReino(u);
                    }}
                    onSelectCiudad={async (id: string) => {
                      const local = ciudades.find((x) => x.id === id);
                      clearAllOverlays();
                      if (local) {
                        setSelectedCiudad(local as Ciudad);
                        return;
                      }
                      const { data } = await supabase
                        .from("ciudades")
                        .select("*")
                        .eq("id", id)
                        .single();
                      if (data) setSelectedCiudad(data as Ciudad);
                    }}
                    onSelectCriatura={(id) => {
                      const c = criaturas.find((x) => x.id === id);
                      if (!c) return;
                      clearAllOverlays();
                      setSelectedCriatura(c);
                    }}
                    onSelectItem={(id) => {
                      const o = objetos.find((x) => x.id === id);
                      if (!o) return;
                      clearAllOverlays();
                      setSelectedObjeto(o);
                    }}
                    onSelectPersonaje={(p) => {
                      const found = personajes.find(
                        (x) => x.id === p?.id || x.nombre === p?.nombre,
                      );
                      if (!found) return;
                      clearAllOverlays();
                      setSelectedPersonaje(found);
                    }}
                  />
                )}
                {overlay === "criatura" && selectedCriatura && (
                  <EditorCriatura
                    key={selectedCriatura.id}
                    entities={allEntityNames}
                    item={selectedCriatura as any}
                    onDeleted={(id) => {
                      setCriaturas((p) => p.filter((c) => c.id !== id));
                      setSelectedCriatura(null);
                    }}
                    onNavigateCiudad={async (id) => {
                      const local = ciudades.find((x) => x.id === id);
                      clearAllOverlays();
                      if (local) {
                        selectCiudad(local);
                        return;
                      }
                      const { data } = await supabase
                        .from("ciudades")
                        .select("*")
                        .eq("id", id)
                        .single();
                      if (data) selectCiudad(data as Ciudad);
                    }}
                    onNavigateReino={async (id) => {
                      const local = reinos.find((x) => x.id === id);
                      clearAllOverlays();
                      if (local) {
                        selectReino(local);
                        return;
                      }
                      const { data } = await supabase
                        .from("reinos")
                        .select("*")
                        .eq("id", id)
                        .single();
                      if (data) selectReino(data as Reino);
                    }}
                    onSaved={(u) => {
                      setCriaturas((p) =>
                        p.map((c) => (c.id === u.id ? { ...c, ...u } : c)),
                      );
                      setSelectedCriatura({ ...selectedCriatura, ...u });
                    }}
                    onSelectGrupo={async (id) => {
                      const local = grupos.find((x) => x.id === id);
                      clearAllOverlays();
                      if (local) {
                        selectGrupo(local);
                        return;
                      }
                      const { data } = await supabase
                        .from("grupos_mundo")
                        .select("*")
                        .eq("id", id)
                        .single();
                      if (data)
                        selectGrupo({
                          ...data,
                          miembro_ids: data.miembro_ids ?? [],
                        } as Grupo);
                    }}
                    onSelectItem={(id) => {
                      const o = objetos.find((x) => x.id === id);
                      if (!o) return;
                      clearAllOverlays();
                      setSelectedObjeto(o);
                    }}
                    onSelectPersonaje={(id) => {
                      const p = personajes.find((x) => x.id === id);
                      if (!p) return;
                      clearAllOverlays();
                      setSelectedPersonaje(p);
                    }}
                  />
                )}
                {overlay === "objeto" && selectedObjeto && (
                  <EditorItem
                    key={selectedObjeto.id}
                    entities={allEntityNames}
                    item={selectedObjeto as any}
                    onDeleted={(id) => {
                      setObjetos((p) => p.filter((o) => o.id !== id));
                      setSelectedObjeto(null);
                    }}
                    onNavigateCiudad={async (id) => {
                      const local = ciudades.find((x) => x.id === id);
                      clearAllOverlays();
                      if (local) {
                        selectCiudad(local);
                        return;
                      }
                      const { data } = await supabase
                        .from("ciudades")
                        .select("*")
                        .eq("id", id)
                        .single();
                      if (data) selectCiudad(data as Ciudad);
                    }}
                    onNavigateReino={async (id) => {
                      const local = reinos.find((x) => x.id === id);
                      clearAllOverlays();
                      if (local) {
                        selectReino(local);
                        return;
                      }
                      const { data } = await supabase
                        .from("reinos")
                        .select("*")
                        .eq("id", id)
                        .single();
                      if (data) selectReino(data as Reino);
                    }}
                    onSaved={(u) => {
                      setObjetos((p) =>
                        p.map((o) => (o.id === u.id ? { ...o, ...u } : o)),
                      );
                      setSelectedObjeto({ ...selectedObjeto, ...u });
                    }}
                    onSelectCriatura={(id) => {
                      const c = criaturas.find((x) => x.id === id);
                      if (!c) return;
                      clearAllOverlays();
                      setSelectedCriatura(c);
                    }}
                  />
                )}
                {overlay === "ciudad" && selectedCiudad && (
                  <EditorCiudad
                    key={selectedCiudad.id}
                    entities={allEntityNames}
                    item={selectedCiudad as Ciudad}
                    onDeleted={(id) => {
                      setCiudades((p) => p.filter((l) => l.id !== id));
                      setSelectedCiudad(null);
                    }}
                    onNavigateReino={(id) => {
                      const r = reinos.find((x) => x.id === id);
                      if (!r) return;
                      clearAllOverlays();
                      setSelectedReino(r);
                    }}
                    onSaved={(u) => {
                      const uMin: CiudadMin = {
                        id: u.id,
                        nombre: u.nombre,
                        imagen_url: u.imagen_url ?? undefined,
                        tipo: u.tipo ?? undefined,
                        reino_id: u.reino_id ?? undefined,
                      };
                      setCiudades((p) =>
                        p.map((l) => (l.id === u.id ? { ...l, ...uMin } : l)),
                      );
                      setSelectedCiudad({ ...selectedCiudad, ...u });
                    }}
                    onSelectCriatura={(id) => {
                      const c = criaturas.find((x) => x.id === id);
                      if (!c) return;
                      clearAllOverlays();
                      setSelectedCriatura(c);
                    }}
                    onSelectItem={(id) => {
                      const o = objetos.find((x) => x.id === id);
                      if (!o) return;
                      clearAllOverlays();
                      setSelectedObjeto(o);
                    }}
                    onSelectPersonaje={(id) => {
                      const p = personajes.find((x) => x.id === id);
                      if (!p) return;
                      clearAllOverlays();
                      setSelectedPersonaje(p);
                    }}
                  />
                )}
                {overlay === "personaje" && selectedPersonaje && (
                  <EditorPersonaje
                    key={selectedPersonaje.id}
                    entities={allEntityNames}
                    item={selectedPersonaje}
                    onDeleted={(id) => {
                      setPersonajes((p) => p.filter((x) => x.id !== id));
                      setSelectedPersonaje(null);
                    }}
                    onNavigate={(tab, nombre) => {
                      if (tab === "criaturas") {
                        const c = criaturas.find(
                          (x) =>
                            x.nombre.toLowerCase() === nombre.toLowerCase(),
                        );
                        if (!c) return;
                        clearAllOverlays();
                        setSelectedCriatura(c);
                      } else if (tab === "reinos") {
                        const r = reinos.find(
                          (x) =>
                            x.nombre.toLowerCase() === nombre.toLowerCase(),
                        );
                        if (!r) return;
                        clearAllOverlays();
                        setSelectedReino(r);
                      }
                    }}
                    onOpenGrupo={async (id) => {
                      const local = grupos.find((x) => x.id === id);
                      clearAllOverlays();
                      if (local) {
                        selectGrupo(local);
                        return;
                      }
                      const { data } = await supabase
                        .from("grupos_mundo")
                        .select("*")
                        .eq("id", id)
                        .single();
                      if (data)
                        selectGrupo({
                          ...data,
                          miembro_ids: data.miembro_ids ?? [],
                        } as Grupo);
                    }}
                    onSaved={(u) => {
                      setPersonajes((p) =>
                        p.map((x) => (x.id === u.id ? u : x)),
                      );
                      setSelectedPersonaje(u);
                    }}
                    onSelectCancion={async (id) => {
                      const local = canciones.find((x) => x.id === id);
                      clearAllOverlays();
                      if (local) {
                        selectCancion(local as unknown as Cancion);
                        return;
                      }
                      const { data } = await supabase
                        .from("canciones")
                        .select("*")
                        .eq("id", id)
                        .single();
                      if (data) selectCancion(data as unknown as Cancion);
                    }}
                    onSelectPersonaje={(id) => {
                      const p = personajes.find((x) => x.id === id);
                      if (!p) return;
                      clearAllOverlays();
                      setSelectedPersonaje(p);
                    }}
                  />
                )}
                {overlay === "hechizo" && selectedHechizo && (
                  <EditorHechizos
                    initialSelectedId={selectedHechizo.id}
                    modo="hechizos"
                    onItemDeleted={(id) => {
                      setHechizos((p) => p.filter((h) => h.id !== id));
                      setSelectedHechizo(null);
                    }}
                    onItemSaved={(updated) =>
                      setHechizos((p) =>
                        p.map((h) =>
                          h.id === updated.id
                            ? { id: updated.id, nombre: updated.nombre }
                            : h,
                        ),
                      )
                    }
                    onSelectedIdChange={(id) => {
                      if (!id) setSelectedHechizo(null);
                    }}
                  />
                )}
                {overlay === "don" && selectedDon && (
                  <EditorHechizos
                    initialSelectedId={selectedDon.id}
                    modo="dones"
                    onItemDeleted={(id) => {
                      setDones((p) => p.filter((d) => d.id !== id));
                      setSelectedDon(null);
                    }}
                    onItemSaved={(updated) =>
                      setDones((p) =>
                        p.map((d) =>
                          d.id === updated.id
                            ? { id: updated.id, nombre: updated.nombre }
                            : d,
                        ),
                      )
                    }
                    onSelectedIdChange={(id) => {
                      if (!id) setSelectedDon(null);
                    }}
                  />
                )}
                {overlay === "runa" && selectedRuna && (
                  <EditorHechizos
                    initialSelectedId={selectedRuna.id}
                    modo="runas"
                    onItemDeleted={(id) => {
                      setRunas((p) => p.filter((r) => r.id !== id));
                      setSelectedRuna(null);
                    }}
                    onItemSaved={(updated) =>
                      setRunas((p) =>
                        p.map((r) =>
                          r.id === updated.id
                            ? {
                                id: updated.id,
                                nombre: updated.nombre,
                                imagen_url: (updated as any).imagen_url,
                              }
                            : r,
                        ),
                      )
                    }
                    onSelectedIdChange={(id) => {
                      if (!id) setSelectedRuna(null);
                    }}
                  />
                )}
                {overlay === "nota" && selectedNota && (
                  <EditorNota
                    key={selectedNota.id}
                    nota={selectedNota}
                    onDeleted={(id) => {
                      eliminarNota(id);
                      setSelectedNota(null);
                    }}
                    onSaved={async (updated) => {
                      await actualizarNota(updated);
                      setSelectedNota(updated);
                    }}
                  />
                )}
                {overlay === "grupo" && selectedGrupo && (
                  <EditorGrupo
                    key={selectedGrupo.id}
                    grupo={selectedGrupo}
                    onClickMiembro={(id, tabla) => {
                      if (tabla === "personajes") {
                        const p = personajes.find((x) => x.id === id);
                        if (!p) return;
                        clearAllOverlays();
                        setSelectedPersonaje(p);
                      } else if (tabla === "criaturas") {
                        const c = criaturas.find((x) => x.id === id);
                        if (!c) return;
                        clearAllOverlays();
                        setSelectedCriatura(c);
                      } else if (tabla === "items") {
                        const o = objetos.find((x) => x.id === id);
                        if (!o) return;
                        clearAllOverlays();
                        setSelectedObjeto(o);
                      } else if (tabla === "reinos") {
                        const r = reinos.find((x) => x.id === id);
                        if (!r) return;
                        clearAllOverlays();
                        setSelectedReino(r);
                      }
                    }}
                    onDeleted={async (id) => {
                      await eliminarGrupo(id);
                      setSelectedGrupo(null);
                    }}
                    onSaved={async (updated) => {
                      await actualizarGrupo(updated);
                      setSelectedGrupo(updated);
                    }}
                  />
                )}
                {overlay === "cancion" && selectedCancion && (
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <PanelEditor
                      key={selectedCancion.id}
                      cancionId={selectedCancion.id}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Listas visibles cuando no hay overlay ── */}
          {!overlay && (
            <div className="px-3 sm:px-3 pt-3 pb-4">
              {/* ── Fila 1: Personajes (50%) · Criaturas (25%) · Reinos (25%) ── */}
              <div
                className="sm:grid sm:gap-x-4"
                style={{ gridTemplateColumns: "2fr 1fr 1fr" }}
              >
                <SeccionEntidades
                  count={personajes.length}
                  icon={Users}
                  label={el.personajes}
                  loading={loadingPersonajes}
                  defaultCollapsed={false}
                  storageKey="personajes"
                  collapsed={isDesktop ? filaPersonajes.collapsed : undefined}
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
                  count={criaturas.length}
                  icon={Bug}
                  label={el.criaturas}
                  loading={loadingCriaturas}
                  defaultCollapsed={false}
                  storageKey="criaturas"
                  collapsed={isDesktop ? filaPersonajes.collapsed : undefined}
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
                  count={reinos.length}
                  icon={Map}
                  label={el.reinos}
                  loading={loadingReinos}
                  defaultCollapsed={false}
                  storageKey="reinos"
                  collapsed={isDesktop ? filaPersonajes.collapsed : undefined}
                  onToggle={isDesktop ? filaPersonajes.toggle : undefined}
                  onExpand={isDesktop ? filaPersonajes.expand : undefined}
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
                        icon={Map}
                        imgUrl={r.mapa_url}
                        nombre={r.nombre}
                        highlighted={highlightedReinoId === r.id}
                        onClick={() => selectReino(r)}
                      />
                    ))}
                </SeccionEntidades>
              </div>
              <div className={div} style={divStyle} />

              {/* ── Fila 2: Objetos · Ciudades (colapsados por defecto) ── */}
              <div className="sm:grid sm:grid-cols-2 sm:gap-x-4">
                <SeccionEntidades
                  count={objetos.length}
                  icon={Package}
                  label="Objetos"
                  loading={loadingObjetos}
                  defaultCollapsed={true}
                  storageKey="objetos"
                  collapsed={isDesktop ? filaObjetos.collapsed : undefined}
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
                  count={ciudades.length}
                  icon={MapPin}
                  label={el.ciudades}
                  loading={loadingCiudades}
                  defaultCollapsed={true}
                  storageKey="ciudades"
                  collapsed={isDesktop ? filaObjetos.collapsed : undefined}
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
                  count={dones.length}
                  icon={Star}
                  label={el.dones}
                  loading={loadingDones}
                  defaultCollapsed={true}
                  storageKey="dones"
                  collapsed={isDesktop ? filaDones.collapsed : undefined}
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
                  count={hechizos.length}
                  icon={Sparkles}
                  label={el.hechizos}
                  loading={loadingHechizos}
                  defaultCollapsed={true}
                  storageKey="hechizos"
                  collapsed={isDesktop ? filaDones.collapsed : undefined}
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
                  count={runas.length}
                  icon={ScrollText}
                  label={el.runas}
                  loading={loadingRunas}
                  defaultCollapsed={true}
                  storageKey="runas"
                  collapsed={isDesktop ? filaDones.collapsed : undefined}
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
                  count={grupos.length}
                  icon={Layers}
                  label={el.grupos}
                  loading={!loadedGrupos}
                  minColWidth="calc(50% - 0.1875rem)"
                  defaultCollapsed={true}
                  storageKey="grupos"
                  collapsed={isDesktop ? filaGrupos.collapsed : undefined}
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
                            className="block w-full text-[9px] font-black uppercase tracking-[0.2em] px-1 text-center"
                            style={{
                              color:
                                "color-mix(in srgb, var(--primary) 25%, transparent)",
                            }}
                          >
                            {tipo}
                          </span>
                          <div className="flex flex-col gap-2">
                            {subtiposOrdenados.map(([subtipo, subLista]) => (
                              <div
                                key={subtipo || "__sin_subtipo__"}
                                className="flex flex-col gap-1"
                              >
                                {subtipo && (
                                  <span
                                    className="block w-full text-[8px] font-bold uppercase tracking-[0.15em] px-1 text-center"
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
                                      "repeat(auto-fill, minmax(60px, 1fr))",
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
                                        <span className="text-[11px] font-bold text-center text-primary/70 truncate">
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
                  count={notas.length}
                  icon={FileText}
                  label={el.notas}
                  loading={loadingNotas}
                  defaultCollapsed={true}
                  storageKey="notas"
                  collapsed={isDesktop ? filaGrupos.collapsed : undefined}
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
                      <span className="text-[11px] font-bold text-center text-primary/70 truncate">
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
                cols={1}
                count={canciones.length}
                icon={Music}
                label={el.canciones}
                loading={loadingCanciones}
                minColWidth="160px"
                defaultCollapsed={true}
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
          className="border-b"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
            minHeight: "70vh",
            position: "relative",
          }}
        >
          {/* Mapa — ocupa todo el ancho; al click en un reino sube a la lista */}
          <div className="flex flex-col min-h-0" style={{ minHeight: "68vh" }}>
            <EditorMapa onSelectReino={(id) => flashReino(id)} />
          </div>
        </div>

        {/* RELACIONES · MISIONES — lado a lado en computadora (≥1024px) */}
        <div className="lg:grid lg:grid-cols-2">
          <div
            className="border-b lg:border-b-0 lg:border-r"
            style={{
              borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
              minHeight: "60vh",
            }}
          >
            <div
              className="flex flex-col min-h-0"
              style={{ minHeight: "58vh" }}
            >
              <AdminDescubrimientos />
            </div>
          </div>

          <div style={{ minHeight: "60vh" }}>
            <div
              className="flex flex-col min-h-0"
              style={{ minHeight: "58vh" }}
            >
              <EditorMisiones />
            </div>
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
