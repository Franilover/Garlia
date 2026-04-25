"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Plus, Loader2, Globe, WifiOff } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { ModalBase } from "@/components/templates/EstudioTemplates";
import {
  TAB_CONFIG, MUNDO_SECTIONS,
  type TabKey, type MundoSectionKey, type Personaje, type Criatura, type Item, type Reino,
} from "./editorEntidades/types";
import { useMundoSecciones } from "./editorEntidades/hooks";
import { GlobalSearchBar, type AllItems } from "./editorEntidades/SidebarComponents";
import { EditorPersonaje } from "./editorEntidades/EditorPersonaje";
import { EditorCriatura }  from "./editorEntidades/EditorCriatura";
import { EditorItem }      from "./editorEntidades/EditorItem";
import { EditorReino }     from "./editorEntidades/EditorReino";
import { EditorMundo }     from "./editorEntidades/EditorMundo";

// ─── Hook: carga todas las categorías en paralelo ─────────────────────────────
function useAllEntidades() {
  const [allItems,   setAllItems]   = useState<AllItems>({ personajes: [], criaturas: [], items: [], reinos: [] });
  const [loadingAll, setLoadingAll] = useState(true);
  const [isOffline,  setIsOffline]  = useState(false);

  const load = useCallback(async () => {
    if (!navigator.onLine) { setIsOffline(true); setLoadingAll(false); return; }
    setIsOffline(false);
    setLoadingAll(true);
    try {
      const [p, c, i, r] = await Promise.all([
        supabase.from("personajes").select("*").order("nombre"),
        supabase.from("criaturas") .select("*").order("nombre"),
        supabase.from("items")     .select("*").order("nombre"),
        supabase.from("reinos")    .select("*").order("nombre"),
      ]);
      setAllItems({
        personajes: (p.data ?? []) as Personaje[],
        criaturas:  (c.data ?? []) as Criatura[],
        items:      (i.data ?? []) as Item[],
        reinos:     (r.data ?? []) as Reino[],
      });
    } catch { setIsOffline(true); }
    setLoadingAll(false);
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
  tab: Exclude<TabKey, "mundo">; onCreated: (item: any) => void; onClose: () => void;
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

function readSession(): { tab: TabKey; selectedId: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { tab: "personajes", selectedId: null };
    const parsed = JSON.parse(raw);
    const validTabs: TabKey[] = [...Object.keys(TAB_CONFIG) as Exclude<TabKey, "mundo">[], "mundo"];
    const tab = validTabs.includes(parsed.tab) ? parsed.tab as TabKey : "personajes";
    return { tab, selectedId: parsed.selectedId ?? null };
  } catch {
    return { tab: "personajes", selectedId: null };
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function EditorEntidades() {
  const session = useRef(readSession());

  const [tab,          setTab]          = useState<TabKey>(session.current.tab);
  const [selectedId,   setSelectedId]   = useState<string | null>(session.current.selectedId);
  const [showNueva,    setShowNueva]    = useState<Exclude<TabKey, "mundo"> | null>(null);
  const [mundoSection, setMundoSection] = useState<MundoSectionKey>("magia");

  const { textos: mundoTextos, setTextos: setMundoTextos, save: saveMundo } = useMundoSecciones();
  const { allItems, setAllItems, loadingAll, isOffline } = useAllEntidades();

  // Persistir sesión
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ tab, selectedId })); } catch {}
  }, [tab, selectedId]);

  // Item seleccionado
  const selected = useMemo(() => {
    if (tab === "mundo") return null;
    return allItems[tab as Exclude<TabKey, "mundo">].find(i => i.id === selectedId) ?? null;
  }, [allItems, selectedId, tab]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSelect = useCallback((item: any, itemTab: Exclude<TabKey, "mundo">) => {
    setTab(itemTab);
    setSelectedId(item.id);
  }, []);

  const handleMundo = useCallback(() => {
    setTab("mundo");
    setSelectedId(null);
  }, []);

  const handleCreated = (item: any, chosenTab?: Exclude<TabKey, "mundo">) => {
    const t = chosenTab ?? tab as Exclude<TabKey, "mundo">;
    setAllItems(prev => ({ ...prev, [t]: [item, ...prev[t]] }));
    setSelectedId(item.id);
  };

  const handleSaved = (item: any) => {
    const t = tab as Exclude<TabKey, "mundo">;
    setAllItems(prev => ({ ...prev, [t]: prev[t].map(i => i.id === item.id ? item : i) }));
  };

  const handleDeleted = (id: string) => {
    const t = tab as Exclude<TabKey, "mundo">;
    setAllItems(prev => ({ ...prev, [t]: prev[t].filter(i => i.id !== id) }));
    setSelectedId(null);
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
        className="flex flex-col w-full h-full min-h-0 overflow-hidden"
        style={{ background: "var(--bg-main)" }}
      >
        {/* ── Buscador global + botón Mundo ───────────────────────────────── */}
        <GlobalSearchBar
          allItems={allItems}
          loadingAll={loadingAll}
          isOffline={isOffline}
          activeTab={tab}
          selectedId={selectedId}
          onSelect={handleSelect}
          onAdd={(chosenTab) => { setTab(chosenTab); setShowNueva(chosenTab); }}
          onMundo={handleMundo}
          onToggleOculto={handleToggleOcultoReino}
          activeSection={mundoSection}
          onSectionChange={setMundoSection}
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
          {isMundo ? (
            <EditorMundo
              activeSection={mundoSection}
              textos={mundoTextos}
              onTextoChange={(section, value) => setMundoTextos(t => ({ ...t, [section]: value }))}
              onSave={(section) => saveMundo(section, mundoTextos[section])}
            />
          ) : selected ? (
            <>
              {tab === "personajes" && <EditorPersonaje key={selected.id} item={selected as Personaje} onSaved={handleSaved} onDeleted={handleDeleted} />}
              {tab === "criaturas"  && <EditorCriatura  key={selected.id} item={selected as Criatura}  onSaved={handleSaved} onDeleted={handleDeleted} />}
              {tab === "items"      && <EditorItem       key={selected.id} item={selected as Item}      onSaved={handleSaved} onDeleted={handleDeleted} />}
              {tab === "reinos"     && <EditorReino      key={selected.id} item={selected as Reino}     onSaved={handleSaved} onDeleted={handleDeleted} />}
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