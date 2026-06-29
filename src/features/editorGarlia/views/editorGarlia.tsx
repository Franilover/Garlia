"use client";

import { Globe, WifiOff } from "lucide-react";
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";

import { WikilinkProvider } from "@/features/editorGarlia/components/WikilinkContext";
import { db } from "@/lib/api/client/db";
import { supabase } from "@/lib/api/client/supabase";

import { EditorGrupoStandalone } from "./EditorGrupo";
import { EditorHechizos } from "./EditorHechizos";
import { EditorMundo } from "./EditorMundo";
import { useMundoSecciones } from "../hooks/hooks";

import {
  ModalAcontecimiento,
  ModalNuevoGrupo,
  type AllItems,
  type MagicAddKey,
} from "../components/EditorModals";
import {
  TAB_CONFIG,
  type TabKey,
  type MundoSectionKey,
  type Hechizo,
  type Don,
  type Runa,
  type Nota,
  type Personaje,
  type Criatura,
  type Item,
  type Reino,
} from "../hooks/types";

// ─── Helpers Dexie locales ────────────────────────────────────────────────────
async function dexieReadAll<T>(tabla: string): Promise<T[]> {
  try {
    if (!db) return [];
    const table = (db as any)[tabla];
    if (!table) return [];
    const rows = (await table.toArray()) as any[];
    return rows.filter((r: any) => !r.deleted) as T[];
  } catch {
    return [];
  }
}

async function dexieWriteAll(tabla: string, rows: any[]): Promise<void> {
  try {
    if (!db) return;
    const table = (db as any)[tabla];
    if (!table) return;
    // Actualizar/insertar filas nuevas
    if (rows.length > 0) await table.bulkPut(rows);
    // Eliminar filas locales que ya no existen en remoto
    const remoteIds = new Set(rows.map((r: any) => r.id));
    const allLocal: any[] = await table.toArray();
    const toDelete = allLocal
      .map((r: any) => r.id)
      .filter((id: string) => !remoteIds.has(id));
    if (toDelete.length > 0) await table.bulkDelete(toDelete);
  } catch (e) {
    console.warn(`[Dexie editorEntidades] write failed on '${tabla}':`, e);
  }
}

async function dexieWriteOne(tabla: string, row: any): Promise<void> {
  try {
    if (!db) return;
    const table = (db as any)[tabla];
    if (!table) return;
    await table.put(row);
  } catch (e) {
    console.warn(`[Dexie editorEntidades] put failed on '${tabla}':`, e);
  }
}

async function dexieDeleteOne(tabla: string, id: string): Promise<void> {
  try {
    if (!db) return;
    const table = (db as any)[tabla];
    if (!table) return;
    await table.delete(id);
  } catch (e) {
    console.warn(`[Dexie editorEntidades] delete failed on '${tabla}':`, e);
  }
}

// ─── Hook: carga todas las categorías en paralelo ─────────────────────────────
function useAllEntidades() {
  const [allItems, setAllItems] = useState<AllItems>({
    personajes: [],
    criaturas: [],
    items: [],
    reinos: [],
    hechizos: [],
    dones: [],
    runas: [],
    notas: [],
    grupos: [],
    capitulos: [],
    letras: [],
  });
  const [loadingAll, setLoadingAll] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async () => {
    // 1. Leer de Dexie primero para respuesta inmediata
    const [localP, localC, localI, localR, localH, localD, localRu, , localG] =
      await Promise.all([
        dexieReadAll<Personaje>("personajes"),
        dexieReadAll<Criatura>("criaturas"),
        dexieReadAll<Item>("items"),
        dexieReadAll<Reino>("reinos"),
        dexieReadAll<Hechizo>("hechizos"),
        dexieReadAll<Don>("dones"),
        dexieReadAll<Runa>("runas"),
        dexieReadAll<any>("notas"),
        dexieReadAll<any>("grupos_mundo"),
      ]);

    const hasLocal =
      localP.length > 0 ||
      localC.length > 0 ||
      localI.length > 0 ||
      localR.length > 0;

    if (hasLocal) {
      setAllItems((prev) => ({
        ...prev,
        personajes: localP,
        criaturas: localC,
        items: localI,
        reinos: localR,
        hechizos: localH,
        dones: localD,
        runas: localRu,
        notas: [],
        grupos: localG,
      }));
      setLoadingAll(false); // mostrar datos locales de inmediato, sin bloquear UI
    }

    // 2. Si offline, quedarse con los datos locales
    if (!navigator.onLine) {
      setIsOffline(true);
      if (!hasLocal) setLoadingAll(false);
      return;
    }

    setIsOffline(false);
    // Solo mostrar loader si no tenemos datos locales para mostrar
    if (!hasLocal) setLoadingAll(true);

    // 3. Fetch remoto y sincronizar Dexie
    try {
      const [p, c, i, r, h, d, ru, n, g] = await Promise.all([
        supabase.from("personajes").select("*").order("nombre"),
        supabase.from("criaturas").select("*").order("nombre"),
        supabase.from("items").select("*").order("nombre"),
        supabase.from("reinos").select("*").order("nombre"),
        supabase
          .from("hechizos")
          .select("id, nombre, explicacion")
          .order("nombre"),
        supabase
          .from("dones")
          .select("id, nombre, explicacion")
          .order("nombre"),
        supabase
          .from("runas")
          .select("id, nombre, explicacion")
          .order("nombre"),
        supabase.from("notas").select("*"),
        supabase
          .from("grupos_mundo")
          .select("id, nombre, tipo, miembro_ids")
          .order("nombre"),
      ]);
      const remote = {
        personajes: (p.data ?? []) as Personaje[],
        criaturas: (c.data ?? []) as Criatura[],
        items: (i.data ?? []) as Item[],
        reinos: (r.data ?? []) as Reino[],
        hechizos: (h.data ?? []) as Hechizo[],
        dones: (d.data ?? []) as Don[],
        runas: (ru.data ?? []) as Runa[],
        notas: (n.data ?? []) as Nota[],
        grupos: (g.data ?? []).map((x: any) => ({
          ...x,
          miembro_ids: x.miembro_ids ?? [],
        })),
        capitulos: [],
        letras: [],
      };
      setAllItems(remote);

      // Persistir en Dexie para próxima carga offline
      await Promise.all([
        dexieWriteAll("personajes", remote.personajes),
        dexieWriteAll("criaturas", remote.criaturas),
        dexieWriteAll("items", remote.items),
        dexieWriteAll("reinos", remote.reinos),
        dexieWriteAll("hechizos", remote.hechizos),
        dexieWriteAll("dones", remote.dones),
        dexieWriteAll("runas", remote.runas),
      ]);
    } catch {
      setIsOffline(true);
    } finally {
      setLoadingAll(false);
    }
  }, []);

  useEffect(() => {
    load();
    const h = () => {
      setIsOffline(false);
      load();
    };
    window.addEventListener("online", h);
    return () => window.removeEventListener("online", h);
  }, [load]);

  return { allItems, setAllItems, loadingAll, isOffline };
}

// ─── createAndOpen: insert directo sin modal ─────────────────────────────────
// Crea la fila en Supabase con nombre placeholder y abre el editor de inmediato.
async function createAndOpen(
  tab: Exclude<TabKey, "mundo">,
  onCreated: (item: any, tab: Exclude<TabKey, "mundo">) => void,
) {
  const placeholders: Partial<Record<Exclude<TabKey, "mundo">, string>> = {
    personajes: "Nuevo personaje",
    criaturas: "Nueva criatura",
    items: "Nuevo objeto",
    reinos: "Nuevo reino",
  };
  const nombre = placeholders[tab] ?? "Nueva entrada";
  try {
    const { data, error } = await supabase
      .from(TAB_CONFIG[tab].tabla)
      .insert([{ nombre }])
      .select()
      .single();
    if (error) throw error;
    onCreated(data, tab);
  } catch (e) {
    console.error("[createAndOpen] error:", e);
  }
}

// ─── Persistencia de sesión ───────────────────────────────────────────────────
const STORAGE_KEY = "editorEntidades:session";

function readSession(): {
  tab: TabKey;
  selectedId: string | null;
  mundoSection: MundoSectionKey;
} {
  try {
    const hasPersistentItem = !!localStorage.getItem("garlia-panel-item");
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { tab: "mundo", selectedId: null, mundoSection: "geografia" };
    }
    const parsed = JSON.parse(raw);
    const validTabs: TabKey[] = [
      ...(Object.keys(TAB_CONFIG) as Exclude<TabKey, "mundo">[]),
      "mundo",
      "capitulos" as any,
      "letras" as any,
    ];
    const entityOnlyTabs = ["personajes", "criaturas", "items", "reinos"];
    const rawTab = validTabs.includes(parsed.tab)
      ? (parsed.tab as TabKey)
      : "mundo";
    const tab = hasPersistentItem
      ? "mundo"
      : entityOnlyTabs.includes(rawTab as string)
        ? "mundo"
        : rawTab;
    return {
      tab,
      selectedId: parsed.selectedId ?? null,
      mundoSection: "geografia",
    };
  } catch {
    return { tab: "mundo", selectedId: null, mundoSection: "geografia" };
  }
}

// ─── Tabla de Supabase para tabs que ahora abren dentro del EditorMundo ────────
const MUNDO_TABLAS: Record<string, string> = {
  personajes: "personajes",
  criaturas: "criaturas",
  items: "items",
  reinos: "reinos",
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function EditorEntidades() {
  const session = useRef(readSession());

  const [tab, setTab] = useState<TabKey>(session.current.tab);
  const [selectedId, setSelectedId] = useState<string | null>(
    session.current.selectedId,
  );
  const [showAcontecimiento, setShowAcontecimiento] = useState(false);
  const [showNuevoGrupo, setShowNuevoGrupo] = useState(false);
  const [mundoSection, setMundoSection] = useState<MundoSectionKey>(
    session.current.mundoSection,
  );
  const [requestedItemId, setRequestedItemId] = useState<string | undefined>(
    undefined,
  );
  const [requestedGrupoId, setRequestedGrupoId] = useState<string | null>(null);
  const [openItem, setOpenItem] = useState<{
    tabla: string;
    id: string;
    key?: number;
  } | null>(null);
  const openItemKeyRef = useRef(0);
  const [onItemCreated, setOnItemCreated] = useState<{
    tabla: string;
    item: any;
  } | null>(null);

  useEffect(() => {
    const handleOpenEntity = (e: Event) => {
      const evt = e as CustomEvent<{ tabla: string; id: string }>;

      // 1. Cambiamos a la pestaña de mundo
      setTab("mundo");

      // 2. IMPORTANTE: Ponemos una sección neutral para que el PanelListas se monte
      setMundoSection("geografia");

      // 3. Ejecutamos la apertura
      setOpenItem({
        tabla: evt.detail.tabla,
        id: evt.detail.id,
        key: ++openItemKeyRef.current,
      });
    };

    window.addEventListener("garlia-open-entity", handleOpenEntity);
    return () =>
      window.removeEventListener("garlia-open-entity", handleOpenEntity);
  }, []);

  // Listener: paleta de comandos → crear entidad nueva (personajes, criaturas, items, reinos)
  useEffect(() => {
    const handleCreate = (e: Event) => {
      const evt = e as CustomEvent<{ tab: string }>;
      createAndOpen(evt.detail.tab as Exclude<TabKey, "mundo">, handleCreated);
    };
    window.addEventListener("garlia-create-entity", handleCreate);
    return () =>
      window.removeEventListener("garlia-create-entity", handleCreate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listener: paleta de comandos → onAddMagic (hechizos, notas, acontecimiento, etc.)
  useEffect(() => {
    const handleAddMagicEvent = (e: Event) => {
      const evt = e as CustomEvent<{ key: string }>;
      const key = evt.detail.key as any;
      if (key === "acontecimiento") {
        setShowAcontecimiento(true);
      } else if (key === "grupos") {
        setShowNuevoGrupo(true);
      } else if (key === "notas") {
        localStorage.setItem("estudio-notas-action", "nueva-nota");
        setTab("mundo");
        setMundoSection("geografia");
        setTimeout(
          () => window.dispatchEvent(new Event("estudio-notas-action")),
          0,
        );
      } else if (key === "libro") {
        localStorage.setItem("estudio-caps-action", "nuevo-libro");
        setTab("mundo");
        setMundoSection("geografia");
        setTimeout(
          () => window.dispatchEvent(new Event("estudio-caps-action")),
          0,
        );
      } else if (key === "capitulo") {
        localStorage.setItem("estudio-caps-action", "nuevo-cap");
        setTab("mundo");
        setMundoSection("geografia");
        setTimeout(
          () => window.dispatchEvent(new Event("estudio-caps-action")),
          0,
        );
      } else if (key === "cancion") {
        localStorage.setItem("estudio-letras-action", "nueva-cancion");
        setTab("mundo");
        setMundoSection("geografia");
        setTimeout(
          () => window.dispatchEvent(new Event("estudio-letras-action")),
          0,
        );
      } else if (key === "ciudad") {
        localStorage.setItem("estudio-listas-action", "nueva-ciudad");
        setTab("mundo");
        setMundoSection("geografia");
        setTimeout(
          () => window.dispatchEvent(new Event("estudio-listas-action")),
          0,
        );
      } else {
        // hechizos, dones, runas → abrir editor standalone
        setTab(key);
        setSelectedId(null);
      }
    };
    window.addEventListener("garlia-add-magic", handleAddMagicEvent);
    return () =>
      window.removeEventListener("garlia-add-magic", handleAddMagicEvent);
  }, []);

  // Auto-limpiar onItemCreated después de que PanelListas lo consuma
  useEffect(() => {
    if (!onItemCreated) return;
    const t = setTimeout(() => setOnItemCreated(null), 100);
    return () => clearTimeout(t);
  }, [onItemCreated]);

  const [hasOverlay, setHasOverlay] = useState(false);
  const overlayCloseFnRef = useRef<(() => void) | null>(null);

  const {
    textos: mundoTextos,
    setTextos: setMundoTextos,
    save: saveMundo,
  } = useMundoSecciones();
  const { allItems, setAllItems, loadingAll, isOffline } = useAllEntidades();

  // Lista de entidades con tipo para el autocompletado [[wikilink]]
  const allEntityNames = useMemo(
    () => [
      ...allItems.personajes
        .filter((e) => e.nombre)
        .map((e) => ({
          name: e.nombre,
          type: "personaje",
        })),
      ...allItems.criaturas
        .filter((e) => e.nombre)
        .map((e) => ({ name: e.nombre, type: "criatura" })),
      ...allItems.items
        .filter((e) => e.nombre)
        .map((e) => ({ name: e.nombre, type: "ítem" })),
      ...allItems.reinos
        .filter((e) => e.nombre)
        .map((e) => ({ name: e.nombre, type: "reino" })),
      ...allItems.hechizos
        .filter((e) => e.nombre)
        .map((e) => ({ name: e.nombre, type: "hechizo" })),
      ...allItems.dones
        .filter((e) => e.nombre)
        .map((e) => ({ name: e.nombre, type: "don" })),
      ...allItems.runas
        .filter((e) => e.nombre)
        .map((e) => ({ name: e.nombre, type: "runa" })),
    ],
    [allItems],
  );

  // Persistir sesión
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ tab, selectedId, mundoSection }),
      );
    } catch {}
  }, [tab, selectedId, mundoSection]);

  const selected = useMemo(() => {
    if (
      tab === "mundo" ||
      tab === "grupos" ||
      (tab as string) === "capitulos" ||
      (tab as string) === "letras"
    )
      return null;
    const list = allItems[tab as Exclude<TabKey, "mundo" | "grupos">];
    if (!list) return null;
    return list.find((i: any) => i.id === selectedId) ?? null;
  }, [allItems, selectedId, tab]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSelect = useCallback(
    (item: any, itemTab: Exclude<TabKey, "mundo">) => {
      const tabla = MUNDO_TABLAS[itemTab];
      if (tabla) {
        // Si ya estamos en mundo, limpiamos openItem primero para forzar re-trigger
        setOpenItem(null);
        setTab("mundo");
        setSelectedId(item.id);
        setMundoSection("geografia");
        setRequestedGrupoId(null);
        // Usar setTimeout para que el null se procese antes del nuevo valor
        setTimeout(() => {
          setOpenItem({ tabla, id: item.id, key: ++openItemKeyRef.current });
        }, 0);
      } else {
        // hechizos / dones / runas → siguen con editor standalone
        setTab(itemTab);
        setSelectedId(item.id);
        setRequestedGrupoId(null);
      }
    },
    [],
  );

  const handleWikilinkNavigate = useCallback(
    (target: string) => {
      const norm = (s: string | null | undefined) =>
        (s ?? "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
      const t = norm(target);
      const collections: { tab: Exclude<TabKey, "mundo">; items: any[] }[] = [
        { tab: "personajes", items: allItems.personajes },
        { tab: "criaturas", items: allItems.criaturas },
        { tab: "items", items: allItems.items },
        { tab: "reinos", items: allItems.reinos },
      ];
      for (const { tab, items } of collections) {
        const found =
          items.find((i) => norm(i.nombre) === t) ??
          items.find((i) => norm(i.nombre).startsWith(t)) ??
          items.find((i) => norm(i.nombre).includes(t));
        if (found) {
          handleSelect(found, tab);
          return;
        }
      }

      // Buscar en hechizos, dones, runas → abrir su editor directamente como tab
      const magicCollections: { tabKey: string; items: any[] }[] = [
        { tabKey: "hechizos", items: allItems.hechizos },
        { tabKey: "dones", items: allItems.dones },
        { tabKey: "runas", items: allItems.runas },
      ];
      for (const { tabKey, items } of magicCollections) {
        const found =
          items.find((i) => norm(i.nombre) === t) ??
          items.find((i) => norm(i.nombre).startsWith(t)) ??
          items.find((i) => norm(i.nombre).includes(t));
        if (found) {
          setTab(tabKey as any);
          setSelectedId(found.id);
          return;
        }
      }
    },
    [allItems, handleSelect],
  );

  const handleCreated = (item: any, chosenTab?: Exclude<TabKey, "mundo">) => {
    const t = chosenTab ?? (tab as Exclude<TabKey, "mundo">);
    setAllItems((prev) => ({
      ...prev,
      [t]: [item, ...prev[t as keyof typeof prev]],
    }));
    void dexieWriteOne(TAB_CONFIG[t].tabla, item);

    // Mismo routing que handleSelect: reinos/personajes/criaturas/items viven dentro
    // de EditorMundo; hechizos/dones/runas tienen editor standalone.
    const tabla = MUNDO_TABLAS[t];
    if (tabla) {
      setTab("mundo");
      setSelectedId(item.id);
      setMundoSection("geografia");
      setOpenItem({ tabla, id: item.id, key: ++openItemKeyRef.current });
      setOnItemCreated({ tabla, item });
      setRequestedGrupoId(null);
    } else {
      setTab(t);
      setSelectedId(item.id);
    }
  };

  const handleSaved = (item: any) => {
    if (
      tab === "grupos" ||
      tab === "mundo" ||
      (tab as string) === "capitulos" ||
      (tab as string) === "letras"
    )
      return;
    const t = tab as Exclude<TabKey, "mundo" | "grupos">;
    setAllItems((prev) => ({
      ...prev,
      [t]: (prev[t as keyof typeof prev] as any[]).map((i) =>
        i.id === item.id ? item : i,
      ),
    }));
    void dexieWriteOne(TAB_CONFIG[t].tabla, item);
  };

  const handleAddMagic = useCallback(
    (key: MagicAddKey, item?: any) => {
      if (key === "notas") {
        localStorage.setItem("estudio-notas-action", "nueva-nota");
        window.dispatchEvent(new Event("estudio-notas-action"));
        setTab("mundo");
        setMundoSection("geografia");
        return;
      }
      if ((key === "hechizos" || key === "dones" || key === "runas") && item) {
        setAllItems((prev) => ({
          ...prev,
          [key]: [item, ...(prev[key as keyof typeof prev] as any[])],
        }));
        void dexieWriteOne(key, item);
        setTab("mundo");
        setMundoSection("geografia");
        setOpenItem({ tabla: key, id: item.id, key: ++openItemKeyRef.current });
        setOnItemCreated({ tabla: key, item });
        setSelectedId(item.id);
      }
    },
    [setAllItems],
  );

  const handleDeleted = (id: string) => {
    if (
      tab === "grupos" ||
      tab === "mundo" ||
      (tab as string) === "capitulos" ||
      (tab as string) === "letras"
    )
      return;
    const t = tab as Exclude<TabKey, "mundo" | "grupos">;
    setAllItems((prev) => ({
      ...prev,
      [t]: (prev[t as keyof typeof prev] as any[]).filter((i) => i.id !== id),
    }));
    setSelectedId(null);
    void dexieDeleteOne(TAB_CONFIG[t].tabla, id);
  };

  const handleToggleOcultoReino = useCallback(
    (id: string, oculto: boolean) => {
      setAllItems((prev) => ({
        ...prev,
        reinos: prev.reinos.map((i) => (i.id === id ? { ...i, oculto } : i)),
      }));
    },
    [setAllItems],
  );

  const isMundo = tab === "mundo";
  const isMagicTab = tab === "hechizos" || tab === "dones" || tab === "runas";
  const isGruposTab = tab === "grupos";

  return (
    <>
      <div
        className="flex flex-col w-full overflow-hidden h-full"
        style={{ background: "var(--bg-main)" }}
      >
        {/* ── Indicador offline ────────────────────────────────────────────── */}
        {isOffline && (
          <div
            className="shrink-0 flex items-center justify-center gap-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-orange-400"
            style={{
              background:
                "color-mix(in srgb, oklch(0.7 0.15 55) 8%, transparent)",
            }}
          >
            <WifiOff size={10} /> Sin conexión · algunos datos pueden estar
            desactualizados
          </div>
        )}

        {/* ── Editor ──────────────────────────────────────────────────────── */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          <WikilinkProvider onWikilink={handleWikilinkNavigate}>
            {isMundo ? (
              <EditorMundo
                initialItemId={requestedItemId}
                openItem={openItem}
                textos={mundoTextos}
                onItemCreated={onItemCreated}
                onOverlayChange={(active, clearFn) => {
                  setHasOverlay(active);
                  overlayCloseFnRef.current = clearFn;
                }}
                onSave={(section) => saveMundo(section, mundoTextos[section])}
                onTextoChange={(section, value) =>
                  setMundoTextos((t) => ({ ...t, [section]: value }))
                }
              />
            ) : isGruposTab ? (
              <EditorGrupoStandalone
                key="grupos"
                initialSelectedId={requestedGrupoId}
                onClickMiembro={(id, tabla) => {
                  const tablaMap: Record<string, Exclude<TabKey, "mundo">> = {
                    personajes: "personajes",
                    criaturas: "criaturas",
                    items: "items",
                    hechizos: "hechizos",
                    dones: "dones",
                    runas: "runas",
                  };
                  const targetTab = tablaMap[tabla];
                  if (!targetTab) return;
                  if (["hechizos", "dones", "runas"].includes(targetTab)) {
                    setTab(targetTab as any);
                    setSelectedId(id);
                  } else {
                    const found = allItems[
                      targetTab as keyof typeof allItems
                    ]?.find((x: any) => x.id === id);
                    if (found)
                      handleSelect(
                        found,
                        targetTab as Exclude<TabKey, "mundo">,
                      );
                  }
                }}
              />
            ) : isMagicTab ? (
              <EditorHechizos
                key={tab}
                initialSelectedId={selectedId ?? undefined}
                modo={tab as "hechizos" | "dones" | "runas"}
                onSelectedIdChange={(id) => setSelectedId(id)}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-primary/15 select-none">
                <Globe size={48} strokeWidth={1} />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/25">
                  Worldbuilding
                </p>
                <p className="text-[10px] text-primary/20 tracking-widest">
                  {loadingAll ? "Cargando…" : "Buscá cualquier entidad arriba"}
                </p>
              </div>
            )}
          </WikilinkProvider>
        </div>
      </div>

      {/* Modal acontecimiento */}
      {showAcontecimiento && (
        <ModalAcontecimiento
          onClose={() => setShowAcontecimiento(false)}
          onSaved={() => {
            setTab("mundo");
            setMundoSection("historia");
          }}
        />
      )}

      {/* Modal nuevo grupo */}
      {showNuevoGrupo && (
        <ModalNuevoGrupo
          onClose={() => setShowNuevoGrupo(false)}
          onCreated={(grupo) => {
            setShowNuevoGrupo(false);
            setTab("grupos");
            setSelectedId(grupo?.id ?? null);
          }}
        />
      )}
    </>
  );
}
