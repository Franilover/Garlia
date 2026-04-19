"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Plus, Loader2, Globe } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { normalize } from "@/components/templates/EstudioTemplates";
import EstudioLayout from "@/components/layout/EstudioLayout";
import {
  TAB_CONFIG, MUNDO_SECTIONS,
  type TabKey, type MundoSectionKey, type Personaje, type Criatura, type Item, type Reino,
} from "./editorEntidades/types";
import { useEntidades, useMundoSecciones } from "./editorEntidades/hooks";
import { EntidadCard, TabNav } from "./editorEntidades/SidebarComponents";
import { EditorPersonaje } from "./editorEntidades/EditorPersonaje";
import { EditorCriatura }  from "./editorEntidades/EditorCriatura";
import { EditorItem }      from "./editorEntidades/EditorItem";
import { EditorReino }     from "./editorEntidades/EditorReino";
import { EditorMundo }     from "./editorEntidades/EditorMundo";

// ─── ModalNueva ───────────────────────────────────────────────────────────────

function ModalNueva({ tab, onCreated, onClose }: {
  tab: TabKey; onCreated: (item: any) => void; onClose: () => void;
}) {
  const [nombre,  setNombre]  = useState("");
  const [loading, setLoading] = useState(false);

  const create = async () => {
    if (!nombre.trim() || tab === "mundo") return;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white-custom text-foreground border border-primary/15 rounded-2xl p-6 w-80 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary/50">
          Nueva entrada · {tab === "mundo" ? "Mundo" : TAB_CONFIG[tab].label}
        </h3>
        <input
          autoFocus value={nombre}
          onChange={e => setNombre(e.target.value)}
          onKeyDown={e => e.key === "Enter" && create()}
          placeholder="Nombre…"
          className="w-full bg-input-bg text-input-text border border-primary/15 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:border-primary/40 transition-colors"
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
      </div>
    </div>
  );
}

// ─── Sesión persistida ────────────────────────────────────────────────────────

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

// ─── Componente principal ─────────────────────────────────────────────────────

export default function EditorEntidades() {
  const session = useRef(readSession());

  const [tab,         setTab]         = useState<TabKey>(session.current.tab);
  const [busqueda,    setBusqueda]    = useState("");
  const [selectedId,  setSelectedId]  = useState<string | null>(session.current.selectedId);
  const [sidebarOpen, setSidebarOpen] = useState(!session.current.selectedId);
  const [showNueva,   setShowNueva]   = useState(false);
  const [mundoSection, setMundoSection] = useState<MundoSectionKey>("magia");
  const { textos: mundoTextos, setTextos: setMundoTextos, save: saveMundo } = useMundoSecciones();

  const { items, setItems, loading, isOffline, refetch } = useEntidades<any>(tab);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ tab, selectedId })); } catch {}
  }, [tab, selectedId]);

  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return; }
    setSelectedId(null);
    setBusqueda("");
  }, [tab]);

  const filtrados = useMemo(() => {
    if (!busqueda) return items;
    const term = normalize(busqueda);
    return items.filter(i => {
      const nom = normalize(i.nombre);
      return nom.startsWith(term) || nom.split(/\s+/).some((w: string) => w.startsWith(term));
    });
  }, [items, busqueda]);

  const selected = useMemo(() => items.find(i => i.id === selectedId) ?? null, [items, selectedId]);

  const handleCreated = (item: any) => { setItems(prev => [item, ...prev]); setSelectedId(item.id); };
  const handleSaved   = (item: any) => setItems(prev => prev.map(i => i.id === item.id ? item : i));
  const handleDeleted = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    setSelectedId(null);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ tab, selectedId: null })); } catch {}
  };
  const handleSelect = (id: string) => { setSelectedId(id); setSidebarOpen(false); };

  const handleToggleOcultoReino = useCallback((id: string, oculto: boolean) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, oculto } : i));
  }, [setItems]);

  // ── Ícono y título según tab ──────────────────────────────────────────────
  const isMundo = tab === "mundo";
  const Icon    = isMundo ? Globe : TAB_CONFIG[tab].Icon;
  const label   = isMundo ? "Mundo" : TAB_CONFIG[tab].label;

  // ── Header extra de sidebar ───────────────────────────────────────────────
  const headerExtra = (
    <>
      <TabNav tab={tab} onTabChange={setTab} mundoSection={mundoSection} onMundoSectionChange={setMundoSection} />
      {!isMundo && (
        <button onClick={() => setShowNueva(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-primary/20 text-[10px] font-black uppercase text-primary/35 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all tracking-widest">
          <Plus size={12} /> Nueva entrada
        </button>
      )}
    </>
  );

  // ── Contenido del sidebar ─────────────────────────────────────────────────
  const sidebarContent = isMundo ? null : (
    <div className="space-y-0.5">
      {loading ? (
        <div className="flex items-center justify-center py-12 text-primary/30"><Loader2 className="animate-spin" size={24} /></div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-10 text-primary/25"><p className="text-xs font-black uppercase tracking-widest">Sin resultados</p></div>
      ) : filtrados.map(item => (
        <EntidadCard
          key={item.id} item={item} tab={tab}
          selected={selectedId === item.id}
          onClick={() => handleSelect(item.id)}
          onToggleOculto={tab === "reinos" ? handleToggleOcultoReino : undefined}
        />
      ))}
    </div>
  );

  return (
    <>
      <EstudioLayout
        titulo={label}
        icono={<Icon size={12} />}
        colapsadoLabel={label}
        onRefetch={refetch}
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        busquedaPlaceholder={isMundo ? "Buscar en el mundo…" : `Buscar ${label.toLowerCase()}…`}
        headerExtra={headerExtra}
        sidebarContent={sidebarContent}
        isOffline={isOffline}
        footerLeft={isMundo ? "Worldbuilding" : `${items.length} entradas`}
        footerRight={isMundo ? "" : `${filtrados.length} mostradas`}
        sidebarOpen={sidebarOpen}
        onSidebarOpenChange={setSidebarOpen}
      >
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
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-foreground/20">
              <Icon size={52} strokeWidth={1} />
              <p className="text-xs font-black uppercase tracking-[0.3em]">Editor de {label}</p>
              <p className="text-[10px] tracking-widest">Selecciona una entrada o crea una nueva</p>
            </div>
          )}
        </div>
      </EstudioLayout>

      {showNueva && !isMundo && (
        <ModalNueva tab={tab} onCreated={handleCreated} onClose={() => setShowNueva(false)} />
      )}
    </>
  );
}