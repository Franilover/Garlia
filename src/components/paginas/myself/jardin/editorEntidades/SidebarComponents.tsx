"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Loader2, Eye, EyeOff, Plus, Globe, Search, X, SlidersHorizontal, Zap,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { TAB_CONFIG, MUNDO_SECTIONS, type TabKey, type MundoSectionKey } from "./types";

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ─── EntidadCard ───────────────────────────────────────────────────────────────
export function EntidadCard({
  item, tab, selected, onClick, onToggleOculto,
}: {
  item: any; tab: TabKey; selected: boolean; onClick: () => void;
  onToggleOculto?: (id: string, oculto: boolean) => void;
}) {
  const img = tab === "personajes" ? item.img_url : item.imagen_url;
  const TabIcon = TAB_CONFIG[tab as Exclude<TabKey, "mundo">].Icon;
  const [toggling, setToggling] = useState(false);

  const subtitle =
    tab === "personajes" ? [item.especie, item.reino].filter(Boolean).join(" · ") :
    tab === "criaturas"  ? item.habitat :
    tab === "items"      ? item.categoria :
    tab === "reinos"     ? (item.oculto ? "Oculto" : "") : "";

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onToggleOculto || toggling) return;
    setToggling(true);
    const nuevoOculto = !item.oculto;
    try {
      await supabase.from("reinos").update({ oculto: nuevoOculto }).eq("id", item.id);
      onToggleOculto(item.id, nuevoOculto);
    } finally { setToggling(false); }
  };

  return (
    <button onClick={onClick} className="group relative w-full text-left transition-all duration-150">
      <div className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150 ${
        selected
          ? "bg-primary/12 border border-primary/20"
          : "border border-transparent hover:bg-primary/6 hover:border-primary/10"
      }`}>
        <div
          className="shrink-0 w-8 h-8 rounded-lg overflow-hidden border flex items-center justify-center"
          style={{
            background: img ? "transparent" : "color-mix(in srgb, var(--primary) 7%, transparent)",
            borderColor: selected
              ? "color-mix(in srgb, var(--primary) 25%, transparent)"
              : "color-mix(in srgb, var(--primary) 10%, transparent)",
          }}
        >
          {img
            ? <img src={img} alt={item.nombre} className="w-full h-full object-cover" />
            : <TabIcon size={13} className="text-primary/30" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[11px] font-bold truncate transition-colors ${
            selected ? "text-primary" : "text-primary/70 group-hover:text-primary/90"
          }`}>{item.nombre}</p>
          {subtitle && <p className="text-[9px] text-primary/35 truncate mt-0.5">{subtitle}</p>}
        </div>
        {tab === "reinos" && onToggleOculto && (
          <button
            onClick={handleToggle}
            className={`shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-all border ${
              item.oculto
                ? "text-orange-400 bg-orange-400/10 border-orange-400/20"
                : "text-primary/20 bg-transparent border-transparent group-hover:text-primary/30 group-hover:bg-primary/5 group-hover:border-primary/10"
            } ${toggling ? "opacity-40 pointer-events-none" : ""}`}
          >
            {toggling ? <Loader2 size={9} className="animate-spin" /> : item.oculto ? <EyeOff size={9} /> : <Eye size={9} />}
          </button>
        )}
      </div>
    </button>
  );
}

// ─── Tipos para búsqueda global ───────────────────────────────────────────────
type AllItems = {
  personajes: any[];
  criaturas:  any[];
  items:      any[];
  reinos:     any[];
};

type SearchResult = {
  item: any;
  tab: Exclude<TabKey, "mundo">;
};

// ─── GlobalSearchBar ──────────────────────────────────────────────────────────
// Buscador único que filtra en TODAS las categorías simultáneamente.
// Muestra resultados agrupados por categoría, al seleccionar cambia el tab y abre el editor.
export function GlobalSearchBar({
  allItems,
  loadingAll,
  isOffline,
  activeTab,
  selectedId,
  onSelect,
  onAdd,
  onToggleOculto,
  // Para el modo "mundo": tab section pills
  activeSection,
  onSectionChange,
}: {
  allItems: AllItems;
  loadingAll: boolean;
  isOffline: boolean;
  activeTab: TabKey;
  selectedId: string | null;
  onSelect: (item: any, tab: Exclude<TabKey, "mundo">) => void;
  onAdd: () => void;
  onToggleOculto?: (id: string, oculto: boolean) => void;
  activeSection?: MundoSectionKey;
  onSectionChange?: (s: MundoSectionKey) => void;
}) {
  const [query,   setQuery]   = useState("");
  const [open,    setOpen]    = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef  = useRef<HTMLDivElement>(null);

  const isMundo = activeTab === "mundo";

  // Item seleccionado actualmente (en cualquier categoría)
  const selectedItem = useMemo(() => {
    if (isMundo || !selectedId) return null;
    const tab = activeTab as Exclude<TabKey, "mundo">;
    return allItems[tab]?.find((i: any) => i.id === selectedId) ?? null;
  }, [allItems, selectedId, activeTab, isMundo]);

  // Total de items en el tab activo
  const activeItems = useMemo(() => {
    if (isMundo) return [];
    return allItems[activeTab as Exclude<TabKey, "mundo">] ?? [];
  }, [allItems, activeTab, isMundo]);

  // Resultados de búsqueda global agrupados
  const globalResults = useMemo((): Record<Exclude<TabKey, "mundo">, SearchResult[]> => {
    if (!query.trim()) {
      // Sin query: muestra solo el tab activo
      return {
        personajes: [],
        criaturas:  [],
        items:      [],
        reinos:     [],
      };
    }
    const q = normalize(query);
    const tabs: Exclude<TabKey, "mundo">[] = ["personajes", "criaturas", "items", "reinos"];
    const result: Record<Exclude<TabKey, "mundo">, SearchResult[]> = {
      personajes: [], criaturas: [], items: [], reinos: [],
    };
    tabs.forEach(tab => {
      result[tab] = (allItems[tab] ?? [])
        .filter((i: any) => normalize(i.nombre ?? "").includes(q))
        .map(item => ({ item, tab }));
    });
    return result;
  }, [allItems, query]);

  // Si no hay query, muestra el tab activo filtrado localmente
  const activeFiltered = useMemo(() => {
    if (query.trim()) return [];
    const q = normalize(query);
    return activeItems.filter((i: any) => normalize(i.nombre ?? "").includes(q));
  }, [activeItems, query]);

  const hasGlobalResults = query.trim() && Object.values(globalResults).some(g => g.length > 0);
  const totalGlobalCount = Object.values(globalResults).reduce((a, g) => a + g.length, 0);

  const close = useCallback(() => {
    setOpen(false);
    setFocused(false);
    setQuery("");
  }, []);

  const handleSelect = useCallback((item: any, tab: Exclude<TabKey, "mundo">) => {
    onSelect(item, tab);
    close();
    inputRef.current?.blur();
  }, [onSelect, close]);

  useEffect(() => {
    if (!open) return;
    const onMouse = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { close(); inputRef.current?.blur(); }
    };
    document.addEventListener("mousedown", onMouse);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onMouse); document.removeEventListener("keydown", onKey); };
  }, [open, close]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); inputRef.current?.focus(); }
    };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, []);

  // ── Mundo: solo section pills ────────────────────────────────────────────────
  if (isMundo) {
    return (
      <div className="shrink-0 flex items-center gap-1 px-3 py-2 border-b overflow-x-auto"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
        <Globe size={12} className="text-primary/30 shrink-0 mr-1" />
        {MUNDO_SECTIONS.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => onSectionChange?.(key as MundoSectionKey)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
            style={activeSection === key ? {
              background: "color-mix(in srgb, var(--primary) 12%, transparent)",
              color: "var(--primary)", border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
            } : { color: "color-mix(in srgb, var(--primary) 35%, transparent)", border: "1px solid transparent" }}
          >
            <Icon size={10} /><span>{label}</span>
          </button>
        ))}
      </div>
    );
  }

  const activeLabel = TAB_CONFIG[activeTab as Exclude<TabKey, "mundo">].label;

  return (
    <div ref={wrapRef} className="shrink-0 flex items-center gap-2 px-3 py-2 border-b relative"
      style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>

      {/* Input unificado */}
      <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all border"
        style={focused ? {
          background: "color-mix(in srgb, var(--primary) 6%, transparent)",
          borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)",
        } : {
          background: "color-mix(in srgb, var(--primary) 4%, transparent)",
          borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
        }}
      >
        {/* Icono: thumbnail si hay seleccionado y no está enfocado, si no buscar */}
        {selectedItem && !focused ? (
          <div className="shrink-0 w-5 h-5 rounded-md overflow-hidden border border-primary/15 bg-primary/8 flex items-center justify-center">
            {(selectedItem.img_url || selectedItem.imagen_url)
              ? <img src={selectedItem.img_url || selectedItem.imagen_url} alt={selectedItem.nombre} className="w-full h-full object-cover" />
              : (() => { const Icon = TAB_CONFIG[activeTab as Exclude<TabKey, "mundo">].Icon; return <Icon size={9} className="text-primary/40" />; })()}
          </div>
        ) : focused && query ? (
          <Zap size={11} className="shrink-0 text-primary/40" />
        ) : (
          <Search size={11} className="shrink-0 text-primary/30" />
        )}

        <input
          ref={inputRef}
          value={focused ? query : ""}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setFocused(true); setOpen(true); setQuery(""); }}
          placeholder={
            focused
              ? query
                ? `${totalGlobalCount} resultados en todo…`
                : "Buscar en todo el worldbuilding…"
              : selectedItem?.nombre ?? (loadingAll ? "Cargando…" : `${activeItems.length} ${activeLabel.toLowerCase()}`)
          }
          className="flex-1 min-w-0 bg-transparent text-[12px] font-medium text-primary outline-none placeholder:text-primary/40"
        />

        {focused && query
          ? <button onClick={() => setQuery("")} className="shrink-0 text-primary/25 hover:text-primary transition-colors"><X size={10} /></button>
          : !focused
            ? <kbd className="shrink-0 hidden sm:flex items-center px-1 py-0.5 rounded text-[8px] font-black text-primary/20 border border-primary/10 font-mono">⌘K</kbd>
            : null
        }
      </div>

      {/* Botón añadir */}
      <button onClick={onAdd} title={`Añadir ${activeLabel.slice(0, -1)}`}
        className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all border border-dashed border-primary/20 text-primary/30 hover:text-primary hover:border-primary/40 hover:bg-primary/5">
        <Plus size={13} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-3 right-3 top-full mt-1.5 z-50 rounded-2xl overflow-hidden"
          style={{
            background: "var(--bg-main)",
            border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
            boxShadow: "0 12px 40px color-mix(in srgb, var(--primary) 18%, transparent)",
          }}>

          {/* Header del dropdown */}
          <div className="px-3 py-1.5 flex items-center justify-between border-b"
            style={{ background: "color-mix(in srgb, var(--primary) 3%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 6%, transparent)" }}>
            <span className="text-[9px] font-black uppercase tracking-widest text-primary/25">
              {loadingAll
                ? "Cargando…"
                : query.trim()
                  ? `${totalGlobalCount} resultado${totalGlobalCount !== 1 ? "s" : ""} en todo`
                  : `${activeItems.length} ${activeLabel.toLowerCase()}`}
            </span>
            {isOffline && <span className="text-[8px] font-black uppercase tracking-widest text-orange-400">Offline</span>}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {loadingAll ? (
              <div className="flex items-center justify-center py-8"><Loader2 size={16} className="animate-spin text-primary/20" /></div>

            ) : query.trim() ? (
              /* BÚSQUEDA GLOBAL: resultados agrupados por categoría */
              hasGlobalResults ? (
                <div className="p-2 space-y-1">
                  {(Object.entries(globalResults) as [Exclude<TabKey, "mundo">, SearchResult[]][])
                    .filter(([, results]) => results.length > 0)
                    .map(([tab, results]) => {
                      const cfg = TAB_CONFIG[tab];
                      const isActive = tab === activeTab;
                      return (
                        <div key={tab}>
                          {/* Separador de categoría */}
                          <div className="flex items-center gap-2 px-2 py-1.5">
                            <cfg.Icon size={9} className="text-primary/30" />
                            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/30">{cfg.label}</span>
                            <span className="text-[8px] font-black text-primary/20 bg-primary/8 px-1 py-0.5 rounded-full">{results.length}</span>
                            {isActive && (
                              <span className="text-[8px] font-black uppercase tracking-widest text-primary/20">· activo</span>
                            )}
                          </div>
                          {/* Items de la categoría */}
                          <div className="space-y-0.5 pl-1">
                            {results.map(({ item, tab: itemTab }) => (
                              <EntidadCard
                                key={item.id}
                                item={item}
                                tab={itemTab}
                                selected={selectedId === item.id && activeTab === itemTab}
                                onClick={() => handleSelect(item, itemTab)}
                                onToggleOculto={itemTab === "reinos" ? onToggleOculto : undefined}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-8 text-primary/20">
                  <SlidersHorizontal size={16} />
                  <p className="text-[9px] font-black uppercase tracking-widest">Sin coincidencias en ninguna categoría</p>
                </div>
              )

            ) : (
              /* SIN QUERY: muestra tab activo */
              <div className="p-2 space-y-0.5">
                {activeFiltered.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-primary/20">
                    <SlidersHorizontal size={16} />
                    <p className="text-[9px] font-black uppercase tracking-widest">Sin {activeLabel.toLowerCase()} aún</p>
                  </div>
                ) : (
                  activeFiltered.map(item => (
                    <EntidadCard
                      key={item.id}
                      item={item}
                      tab={activeTab as Exclude<TabKey, "mundo">}
                      selected={selectedId === item.id}
                      onClick={() => handleSelect(item, activeTab as Exclude<TabKey, "mundo">)}
                      onToggleOculto={activeTab === "reinos" ? onToggleOculto : undefined}
                    />
                  ))
                )}
              </div>
            )}
          </div>

          {/* Footer: añadir */}
          <div className="p-2 border-t" style={{ borderColor: "color-mix(in srgb, var(--primary) 6%, transparent)" }}>
            <button onClick={() => { onAdd(); close(); }}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-dashed border-primary/15 text-primary/35 hover:text-primary hover:border-primary/35 hover:bg-primary/4">
              <Plus size={10} /> Añadir {activeLabel.slice(0, -1) || activeLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CommandBar — wrapper de compatibilidad (por si se usa en otros lados) ────
// Mantiene la firma anterior para no romper nada.
export function CommandBar({
  tab, items, loading, isOffline, selectedId,
  onSelect, onAdd, onToggleOculto,
  activeSection, onSectionChange,
}: {
  tab: TabKey; items: any[]; loading: boolean; isOffline: boolean;
  selectedId: string | null; onSelect: (item: any) => void; onAdd: () => void;
  onToggleOculto?: (id: string, oculto: boolean) => void;
  activeSection?: MundoSectionKey; onSectionChange?: (s: MundoSectionKey) => void;
}) {
  const allItems: AllItems = {
    personajes: tab === "personajes" ? items : [],
    criaturas:  tab === "criaturas"  ? items : [],
    items:      tab === "items"      ? items : [],
    reinos:     tab === "reinos"     ? items : [],
  };

  return (
    <GlobalSearchBar
      allItems={allItems}
      loadingAll={loading}
      isOffline={isOffline}
      activeTab={tab}
      selectedId={selectedId}
      onSelect={(item) => onSelect(item)}
      onAdd={onAdd}
      onToggleOculto={onToggleOculto}
      activeSection={activeSection}
      onSectionChange={onSectionChange}
    />
  );
}

// ─── TabNav ───────────────────────────────────────────────────────────────────
export function TabNav({
  tab, onChange, onTabChange,
}: {
  tab: TabKey;
  onChange?: (t: TabKey) => void;
  onTabChange?: (t: TabKey) => void;
  mundoSection?: string;
  onMundoSectionChange?: (s: any) => void;
}) {
  const handleChange = (t: TabKey) => { onChange?.(t); onTabChange?.(t); };

  const allTabs: { key: TabKey; label: string; Icon: React.ElementType }[] = [
    ...Object.entries(TAB_CONFIG).map(([key, cfg]) => ({ key: key as TabKey, label: cfg.label, Icon: cfg.Icon })),
    { key: "mundo" as TabKey, label: "Mundo", Icon: Globe },
  ];

  return (
    <div className="shrink-0 flex items-center gap-0.5 px-2 py-2 border-b overflow-x-auto"
      style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
      {allTabs.map(({ key, label, Icon }) => (
        <button key={key} onClick={() => handleChange(key)}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
          style={tab === key ? {
            background: "color-mix(in srgb, var(--primary) 10%, transparent)",
            color: "var(--primary)", border: "1px solid color-mix(in srgb, var(--primary) 18%, transparent)",
          } : { color: "color-mix(in srgb, var(--primary) 35%, transparent)", border: "1px solid transparent" }}
        >
          <Icon size={10} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}