"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Plus, Loader2, Globe, WifiOff } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";
import { ModalBase } from "@/components/templates/EstudioTemplates";
import {
  TAB_CONFIG, MUNDO_SECTIONS,
  type TabKey, type MundoSectionKey,
  type Personaje, type Criatura, type Item, type Reino,
  type Hechizo, type Don, type Runa,
} from "./editorEntidades/types";
import { useMundoSecciones } from "./editorEntidades/hooks";
import { GlobalSearchBar, type AllItems } from "./editorEntidades/SidebarComponents";
import { EditorPersonaje } from "./editorEntidades/EditorPersonaje";
import { EditorCriatura }  from "./editorEntidades/EditorCriatura";
import { EditorItem }      from "./editorEntidades/EditorItem";
import { EditorReino }     from "./editorEntidades/EditorReino";
import { EditorMundo }     from "./editorEntidades/EditorMundo";
import { WikilinkProvider } from "@/components/forms/WikilinkContext";

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
    const toDelete = allLocal.map((r: any) => r.id).filter((id: string) => !remoteIds.has(id));
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
    personajes: [], criaturas: [], items: [], reinos: [],
    hechizos: [], dones: [], runas: [],
  });
  const [loadingAll, setLoadingAll] = useState(true);
  const [isOffline,  setIsOffline]  = useState(false);

  const load = useCallback(async () => {
    // 1. Leer de Dexie primero para respuesta inmediata
    const [localP, localC, localI, localR] = await Promise.all([
      dexieReadAll<Personaje>("personajes"),
      dexieReadAll<Criatura>("criaturas"),
      dexieReadAll<Item>("items"),
      dexieReadAll<Reino>("reinos"),
    ]);

    const hasLocal =
      localP.length > 0 || localC.length > 0 ||
      localI.length > 0 || localR.length > 0;

    if (hasLocal) {
      setAllItems(prev => ({
        ...prev,
        personajes: localP,
        criaturas:  localC,
        items:      localI,
        reinos:     localR,
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
      const [p, c, i, r, h, d, ru] = await Promise.all([
        supabase.from("personajes").select("*").order("nombre"),
        supabase.from("criaturas") .select("*").order("nombre"),
        supabase.from("items")     .select("*").order("nombre"),
        supabase.from("reinos")    .select("*").order("nombre"),
        supabase.from("hechizos")  .select("id, nombre, explicacion").order("nombre"),
        supabase.from("dones")     .select("id, nombre, explicacion").order("nombre"),
        supabase.from("runas")     .select("id, nombre, explicacion").order("nombre"),
      ]);
      const remote = {
        personajes: (p.data ?? []) as Personaje[],
        criaturas:  (c.data ?? []) as Criatura[],
        items:      (i.data ?? []) as Item[],
        reinos:     (r.data ?? []) as Reino[],
        hechizos:   (h.data ?? []) as Hechizo[],
        dones:      (d.data ?? []) as Don[],
        runas:      (ru.data ?? []) as Runa[],
      };
      setAllItems(remote);

      // Persistir en Dexie para próxima carga offline
      await Promise.all([
        dexieWriteAll("personajes", remote.personajes),
        dexieWriteAll("criaturas",  remote.criaturas),
        dexieWriteAll("items",      remote.items),
        dexieWriteAll("reinos",     remote.reinos),
      ]);
    } catch {
      setIsOffline(true);
    } finally {
      setLoadingAll(false);
    }
  }, []);

  useEffect(() => {
    load();
    const h = () => { setIsOffline(false); load(); };
    window.addEventListener("online", h);
    return () => window.removeEventListener("online", h);
  }, [load]);

  return { allItems, setAllItems, loadingAll, isOffline };
}

// ─── Modal nueva entrada ──────────────────────────────────────────────────────
function ModalNueva({ tab, onCreated, onClose }: {
  tab: Exclude<TabKey, "mundo">;
  onCreated: (item: any) => void;
  onClose: () => void;
}) {
  const [nombre,  setNombre]  = useState("");
  const [loading, setLoading] = useState(false);

  const create = async () => {
    if (!nombre.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(TAB_CONFIG[tab].tabla).insert([{ nombre: nombre.trim() }]).select().single();
      if (error) throw error;
      onCreated(data);
      onClose();
    } catch { setLoading(false); }
  };

  return (
    <ModalBase onClose={onClose}>
      <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary/50 mb-4">
        Nueva entrada · {TAB_CONFIG[tab].label}
      </h3>
      <input
        autoFocus value={nombre}
        onChange={e => setNombre(e.target.value)}
        onKeyDown={e => e.key === "Enter" && create()}
        placeholder="Nombre…"
        className="w-full bg-input-bg text-input-text border border-primary/15 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:border-primary/40 transition-colors mb-4"
      />
      <div className="flex gap-2">
        <button onClick={onClose}
          className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-primary/10 text-primary/30 hover:text-primary hover:border-primary/20 transition-all">
          Cancelar
        </button>
        <button onClick={create} disabled={loading || !nombre.trim()}
          className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all disabled:opacity-40 flex items-center justify-center gap-1.5">
          {loading ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Crear
        </button>
      </div>
    </ModalBase>
  );
}

// ─── Persistencia de sesión ───────────────────────────────────────────────────
const STORAGE_KEY = "editorEntidades:session";

const VALID_MUNDO_SECTIONS: MundoSectionKey[] = ["geografia", "historia", "magia"];
const VALID_MUNDO_TABS = ["mundo", "historia", "listas", "magia", "hechizos", "dones", "runas"];

function readSession(): {
  tab: TabKey;
  selectedId: string | null;
  mundoSection: MundoSectionKey;
  mundoTab: string | undefined;
} {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { tab: "personajes", selectedId: null, mundoSection: "geografia", mundoTab: undefined };
    const parsed = JSON.parse(raw);
    const validTabs: TabKey[] = [...Object.keys(TAB_CONFIG) as Exclude<TabKey, "mundo">[], "mundo"];
    const tab = validTabs.includes(parsed.tab) ? parsed.tab as TabKey : "personajes";
    const mundoSection = VALID_MUNDO_SECTIONS.includes(parsed.mundoSection)
      ? parsed.mundoSection as MundoSectionKey
      : "geografia";
    const mundoTab = VALID_MUNDO_TABS.includes(parsed.mundoTab)
      ? parsed.mundoTab as string
      : undefined;
    return { tab, selectedId: parsed.selectedId ?? null, mundoSection, mundoTab };
  } catch {
    return { tab: "personajes", selectedId: null, mundoSection: "geografia", mundoTab: undefined };
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function EditorEntidades() {
  const session = useRef(readSession());

  const [tab,          setTab]          = useState<TabKey>(session.current.tab);
  const [selectedId,   setSelectedId]   = useState<string | null>(session.current.selectedId);
  const [showNueva,    setShowNueva]    = useState<Exclude<TabKey, "mundo"> | null>(null);
  const [mundoSection, setMundoSection] = useState<MundoSectionKey>(session.current.mundoSection);
  const [requestedSubTab, setRequestedSubTab] = useState<string | undefined>(session.current.mundoTab);
  const [requestedItemId, setRequestedItemId] = useState<string | undefined>(undefined);

  const { textos: mundoTextos, setTextos: setMundoTextos, save: saveMundo } = useMundoSecciones();
  const { allItems, setAllItems, loadingAll, isOffline } = useAllEntidades();

  // Lista de entidades con tipo para el autocompletado [[wikilink]]
  const allEntityNames = useMemo(() => [
    ...allItems.personajes.map(e => ({ name: e.nombre, type: "personaje" })),
    ...allItems.criaturas .map(e => ({ name: e.nombre, type: "criatura"  })),
    ...allItems.items     .map(e => ({ name: e.nombre, type: "ítem"      })),
    ...allItems.reinos    .map(e => ({ name: e.nombre, type: "reino"     })),
    ...allItems.hechizos  .map(e => ({ name: e.nombre, type: "hechizo"   })),
    ...allItems.dones     .map(e => ({ name: e.nombre, type: "don"       })),
    ...allItems.runas     .map(e => ({ name: e.nombre, type: "runa"      })),
  ], [allItems]);

  // Persistir sesión
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        tab,
        selectedId,
        mundoSection,
        mundoTab: requestedSubTab,
      }));
    } catch {}
  }, [tab, selectedId, mundoSection, requestedSubTab]);

  const selected = useMemo(() => {
    if (tab === "mundo") return null;
    return allItems[tab as Exclude<TabKey, "mundo">].find(i => i.id === selectedId) ?? null;
  }, [allItems, selectedId, tab]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSelect = useCallback((item: any, itemTab: Exclude<TabKey, "mundo">) => {
    setTab(itemTab);
    setSelectedId(item.id);
  }, []);

  const handleWikilinkNavigate = useCallback((target: string) => {
    const norm = (s: string) =>
      s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const t = norm(target);
    const collections: { tab: Exclude<TabKey, "mundo">; items: any[] }[] = [
      { tab: "personajes", items: allItems.personajes },
      { tab: "criaturas",  items: allItems.criaturas  },
      { tab: "items",      items: allItems.items      },
      { tab: "reinos",     items: allItems.reinos     },
    ];
    for (const { tab, items } of collections) {
      const found =
        items.find(i => norm(i.nombre) === t) ??
        items.find(i => norm(i.nombre).startsWith(t)) ??
        items.find(i => norm(i.nombre).includes(t));
      if (found) {
        handleSelect(found, tab);
        return;
      }
    }
    // Buscar en hechizos, dones, runas → navegar a EditorMundo sección magia
    const magicCollections: { subTab: string; items: any[] }[] = [
      { subTab: "hechizos", items: allItems.hechizos },
      { subTab: "dones",    items: allItems.dones    },
      { subTab: "runas",    items: allItems.runas    },
    ];
    for (const { subTab, items } of magicCollections) {
      const found =
        items.find(i => norm(i.nombre) === t) ??
        items.find(i => norm(i.nombre).startsWith(t)) ??
        items.find(i => norm(i.nombre).includes(t));
      if (found) {
        setTab("mundo");
        setSelectedId(null);
        setMundoSection("magia");
        setRequestedSubTab(subTab);
        setRequestedItemId(found.id);
        return;
      }
    }
  }, [allItems, handleSelect]);

  const handleCreated = (item: any, chosenTab?: Exclude<TabKey, "mundo">) => {
    const t = chosenTab ?? tab as Exclude<TabKey, "mundo">;
    setAllItems(prev => ({ ...prev, [t]: [item, ...prev[t as keyof typeof prev]] }));
    setSelectedId(item.id);
    void dexieWriteOne(TAB_CONFIG[t].tabla, item);
  };

  const handleSaved = (item: any) => {
    const t = tab as Exclude<TabKey, "mundo">;
    setAllItems(prev => ({ ...prev, [t]: (prev[t as keyof typeof prev] as any[]).map(i => i.id === item.id ? item : i) }));
    void dexieWriteOne(TAB_CONFIG[t].tabla, item);
  };

  const handleDeleted = (id: string) => {
    const t = tab as Exclude<TabKey, "mundo">;
    setAllItems(prev => ({ ...prev, [t]: (prev[t as keyof typeof prev] as any[]).filter(i => i.id !== id) }));
    setSelectedId(null);
    void dexieDeleteOne(TAB_CONFIG[t].tabla, id);
  };

  const handleToggleOcultoReino = useCallback((id: string, oculto: boolean) => {
    setAllItems(prev => ({
      ...prev,
      reinos: prev.reinos.map(i => i.id === id ? { ...i, oculto } : i),
    }));
  }, [setAllItems]);

  const isMundo = tab === "mundo";

  return (
    <>
      <div
        className="flex flex-col w-full overflow-hidden h-full"
        style={{ background: "var(--bg-main)" }}
      >
        {/* ── Buscador global ──────────────────────────────────────────────── */}
        <GlobalSearchBar
          allItems={allItems}
          loadingAll={loadingAll}
          isOffline={isOffline}
          activeTab={tab}
          selectedId={selectedId}
          activeMundoSection={tab === "mundo" ? mundoSection : null}
          onSelect={handleSelect}
          onAdd={(chosenTab) => {
            setTab(chosenTab);
            setShowNueva(chosenTab as Exclude<TabKey, "mundo">);
          }}
          onNavigateTab={(chosenTab) => {
            setTab(chosenTab);
            const first = allItems[chosenTab]?.[0];
            setSelectedId(first?.id ?? null);
          }}
          onSelectMundoSection={(section) => {
            setTab("mundo");
            setSelectedId(null);
            setMundoSection(section);
          }}
          onSelectMundoSubTab={(section, subTab) => {
            setTab("mundo");
            setSelectedId(null);
            setMundoSection(section);
            setRequestedSubTab(subTab);
          }}
          onSelectMagic={(subTab, item) => {
            setTab("mundo");
            setSelectedId(null);
            setMundoSection("magia");
            setRequestedSubTab(subTab);
            setRequestedItemId(item.id);
          }}
          onToggleOculto={handleToggleOcultoReino}
        />

        {/* ── Indicador offline ────────────────────────────────────────────── */}
        {isOffline && (
          <div
            className="shrink-0 flex items-center justify-center gap-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-orange-400"
            style={{ background: "color-mix(in srgb, oklch(0.7 0.15 55) 8%, transparent)" }}
          >
            <WifiOff size={10} /> Sin conexión · algunos datos pueden estar desactualizados
          </div>
        )}

        {/* ── Editor ──────────────────────────────────────────────────────── */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          <WikilinkProvider onWikilink={handleWikilinkNavigate}>
          {isMundo ? (
            <EditorMundo
              activeSection={mundoSection}
              textos={mundoTextos}
              onTextoChange={(section, value) => setMundoTextos(t => ({ ...t, [section]: value }))}
              onSave={(section) => saveMundo(section, mundoTextos[section])}
              initialMundoTab={requestedSubTab}
              initialItemId={requestedItemId}
              onTabChange={(section, mundoTab) => {
                setMundoSection(section);
                setRequestedSubTab(mundoTab);
                setRequestedItemId(undefined);
              }}
            />
          ) : selected ? (
            <>
              {tab === "personajes" && <EditorPersonaje key={selected.id} item={selected as Personaje} onSaved={handleSaved} onDeleted={handleDeleted} entities={allEntityNames} />}
              {tab === "criaturas"  && <EditorCriatura  key={selected.id} item={selected as Criatura}  onSaved={handleSaved} onDeleted={handleDeleted} entities={allEntityNames} />}
              {tab === "items"      && <EditorItem       key={selected.id} item={selected as Item}      onSaved={handleSaved} onDeleted={handleDeleted} entities={allEntityNames} />}
              {tab === "reinos"     && <EditorReino      key={selected.id} item={selected as Reino}     onSaved={handleSaved} onDeleted={handleDeleted} entities={allEntityNames} />}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-primary/15 select-none">
              <Globe size={48} strokeWidth={1} />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/25">Worldbuilding</p>
              <p className="text-[10px] text-primary/20 tracking-widest">
                {loadingAll ? "Cargando…" : "Buscá cualquier entidad arriba"}
              </p>
            </div>
          )}
          </WikilinkProvider>
        </div>
      </div>

      {/* Modal nueva entrada */}
      {showNueva && !isMundo && (
        <ModalNueva
          tab={showNueva}
          onCreated={(item) => handleCreated(item, showNueva)}
          onClose={() => setShowNueva(null)}
        />
      )}
    </>
  );
}