"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Loader2, Eye, EyeOff, Plus, Search, X, SlidersHorizontal, Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { TAB_CONFIG, MUNDO_SECTIONS, type TabKey, type MundoSectionKey } from "./types";

// Subtabs internos del módulo Magia
type MundoSubTab = "magia" | "hechizos" | "dones" | "runas";
const MUNDO_SUBTABS: { key: MundoSubTab; label: string; aliases: string[] }[] = [
  { key: "magia",    label: "Magia",    aliases: ["magia", "magic"] },
  { key: "hechizos", label: "Hechizos", aliases: ["hechizo", "hechizos", "spell", "spells"] },
  { key: "dones",    label: "Dones",    aliases: ["don", "dones", "gift", "gifts"] },
  { key: "runas",    label: "Runas",    aliases: ["runa", "runas", "rune", "runes"] },
];

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export type AllItems = {
  personajes: any[];
  criaturas:  any[];
  items:      any[];
  reinos:     any[];
};

type SearchResult = {
  item: any;
  tab: Exclude<TabKey, "mundo">;
};

type TabNavResult = {
  tab: Exclude<TabKey, "mundo">;
};

type MundoSubTabResult = {
  section: MundoSectionKey;
  subTab: MundoSubTab;
  label: string;
};

// ─── EntidadCard ──────────────────────────────────────────────────────────────
// Compact card for grid/column layout
function EntidadCard({
  item, tab, selected, onClick, onToggleOculto,
}: {
  item: any; tab: Exclude<TabKey, "mundo">; selected: boolean; onClick: () => void;
  onToggleOculto?: (id: string, oculto: boolean) => void;
}) {
  const img = tab === "personajes" ? item.img_url : item.imagen_url;
  const TabIcon = TAB_CONFIG[tab].Icon;
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
    <button
      onClick={onClick}
      className="group relative w-full text-left transition-all duration-150"
    >
      <div
        className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all duration-150 ${
          selected
            ? "bg-primary/12 border border-primary/20"
            : "border border-transparent hover:bg-primary/6 hover:border-primary/10"
        }`}
      >
        {/* Avatar */}
        <div
          className="shrink-0 w-7 h-7 rounded-lg overflow-hidden border flex items-center justify-center"
          style={{
            background: img ? "transparent" : "color-mix(in srgb, var(--primary) 7%, transparent)",
            borderColor: selected
              ? "color-mix(in srgb, var(--primary) 25%, transparent)"
              : "color-mix(in srgb, var(--primary) 10%, transparent)",
          }}
        >
          {img
            ? <img src={img} alt={item.nombre} className="w-full h-full object-cover" />
            : <TabIcon size={13} className="text-primary/30" />}
        </div>

        {/* Name + subtitle */}
        <div className="w-full min-w-0 text-center">
          <p className={`text-[10px] font-bold truncate transition-colors leading-tight ${
            selected ? "text-primary" : "text-primary/70 group-hover:text-primary/90"
          }`}>{item.nombre}</p>
          {subtitle && (
            <p className="text-[8px] text-primary/35 truncate mt-0.5 leading-tight">{subtitle}</p>
          )}
        </div>

        {/* Tag + toggle */}
        <div className="flex items-center gap-1">
          <span
            className="text-[7px] font-black uppercase tracking-widest px-1 py-0.5 rounded-md"
            style={{
              background: "color-mix(in srgb, var(--primary) 8%, transparent)",
              color: "color-mix(in srgb, var(--primary) 40%, transparent)",
            }}
          >
            {TAB_CONFIG[tab].label.slice(0, 3)}
          </span>
          {tab === "reinos" && onToggleOculto && (
            <button
              onClick={handleToggle}
              className={`w-4 h-4 rounded-md flex items-center justify-center transition-all border ${
                item.oculto
                  ? "text-orange-400 bg-orange-400/10 border-orange-400/20"
                  : "text-primary/20 bg-transparent border-transparent group-hover:text-primary/30 group-hover:bg-primary/5 group-hover:border-primary/10"
              } ${toggling ? "opacity-40 pointer-events-none" : ""}`}
            >
              {toggling ? <Loader2 size={8} className="animate-spin" /> : item.oculto ? <EyeOff size={8} /> : <Eye size={8} />}
            </button>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── MundoSectionCard ─────────────────────────────────────────────────────────
function MundoSectionCard({
  section, selected, onClick,
}: {
  section: typeof MUNDO_SECTIONS[number]; selected: boolean; onClick: () => void;
}) {
  const { label, Icon } = section;
  return (
    <button onClick={onClick} className="group relative w-full text-left transition-all duration-150">
      <div className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150 ${
        selected
          ? "bg-primary/12 border border-primary/20"
          : "border border-transparent hover:bg-primary/6 hover:border-primary/10"
      }`}>
        <div
          className="shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center"
          style={{
            background: "color-mix(in srgb, var(--primary) 7%, transparent)",
            borderColor: selected
              ? "color-mix(in srgb, var(--primary) 25%, transparent)"
              : "color-mix(in srgb, var(--primary) 10%, transparent)",
          }}
        >
          <Icon size={13} className="text-primary/40" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[11px] font-bold truncate transition-colors ${
            selected ? "text-primary" : "text-primary/70 group-hover:text-primary/90"
          }`}>{label}</p>
          <p className="text-[9px] text-primary/30 truncate mt-0.5">Worldbuilding</p>
        </div>
        <span
          className="shrink-0 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md"
          style={{
            background: "color-mix(in srgb, var(--primary) 8%, transparent)",
            color: "color-mix(in srgb, var(--primary) 40%, transparent)",
          }}
        >
          Mun
        </span>
      </div>
    </button>
  );
}

// ─── AddCommandMenu ───────────────────────────────────────────────────────────
// Floating menu triggered when user types "add" and presses Enter
function AddCommandMenu({
  open,
  anchorRef,
  onAdd,
  onClose,
}: {
  open: boolean;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  onAdd: (tab: Exclude<TabKey, "mundo">) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const tabs = Object.entries(TAB_CONFIG) as [Exclude<TabKey, "mundo">, typeof TAB_CONFIG[Exclude<TabKey, "mundo">]][];

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) onClose();
    };
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", k);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="absolute left-3 right-3 top-full mt-1.5 z-50 rounded-2xl overflow-hidden"
      style={{
        background: "var(--bg-main)",
        border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
        boxShadow: "0 12px 40px color-mix(in srgb, var(--primary) 22%, transparent)",
        animation: "popIn 140ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        transformOrigin: "top center",
      }}
    >
      <div
        className="px-3 py-2 flex items-center gap-2 border-b"
        style={{
          background: "color-mix(in srgb, var(--primary) 4%, transparent)",
          borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
        }}
      >
        <Sparkles size={10} className="text-primary/30" />
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/30">Añadir nueva entrada</p>
      </div>
      <div className="p-2 grid grid-cols-2 gap-1">
        {tabs.map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => { onAdd(key); onClose(); }}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all group border border-dashed"
            style={{
              borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
              color: "color-mix(in srgb, var(--primary) 45%, transparent)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 8%, transparent)";
              (e.currentTarget as HTMLElement).style.color = "var(--primary)";
              (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--primary) 35%, transparent)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--primary) 45%, transparent)";
              (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--primary) 15%, transparent)";
            }}
          >
            <span
              className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
            >
              <cfg.Icon size={11} />
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest">{cfg.label}</span>
            <Plus size={8} className="ml-auto opacity-40" />
          </button>
        ))}
      </div>
      <style>{`
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.92) translateY(-4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─── GlobalSearchBar ──────────────────────────────────────────────────────────
export function GlobalSearchBar({
  allItems,
  loadingAll,
  isOffline,
  activeTab,
  selectedId,
  activeMundoSection,
  onSelect,
  onAdd,
  onSelectMundoSection,
  onSelectMundoSubTab,
  onToggleOculto,
}: {
  allItems: AllItems;
  loadingAll: boolean;
  isOffline: boolean;
  activeTab: TabKey;
  selectedId: string | null;
  activeMundoSection: MundoSectionKey | null;
  onSelect: (item: any, tab: Exclude<TabKey, "mundo">) => void;
  onAdd: (tab: Exclude<TabKey, "mundo">) => void;
  onSelectMundoSection: (s: MundoSectionKey) => void;
  onSelectMundoSubTab?: (section: MundoSectionKey, subTab: string) => void;
  onToggleOculto?: (id: string, oculto: boolean) => void;
}) {
  const [query,       setQuery]       = useState("");
  const [open,        setOpen]        = useState(false);
  const [focused,     setFocused]     = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef  = useRef<HTMLDivElement>(null);

  // Detect "add" command
  const isAddCommand = normalize(query.trim()) === "add";

  const isMundo = activeTab === "mundo";

  const selectedItem = useMemo(() => {
    if (isMundo || !selectedId) return null;
    const tab = activeTab as Exclude<TabKey, "mundo">;
    return allItems[tab]?.find((i: any) => i.id === selectedId) ?? null;
  }, [allItems, selectedId, activeTab, isMundo]);

  const totalCount = useMemo(() =>
    Object.values(allItems).reduce((a, arr) => a + arr.length, 0),
  [allItems]);

  // Búsqueda global en todas las categorías
  const globalResults = useMemo((): SearchResult[] => {
    const q = normalize(query.trim());
    if (!q) return [];
    const tabs: Exclude<TabKey, "mundo">[] = ["personajes", "criaturas", "items", "reinos"];
    return tabs.flatMap(tab =>
      (allItems[tab] ?? [])
        .filter((i: any) => normalize(i.nombre ?? "").includes(q))
        .map(item => ({ item, tab }))
    );
  }, [allItems, query]);

  // Navegación directa a tabs principales (e.g. "reinos", "personajes")
  const tabNavResults = useMemo((): TabNavResult[] => {
    const q = normalize(query.trim());
    if (!q) return [];
    const tabs = Object.entries(TAB_CONFIG) as [Exclude<TabKey, "mundo">, typeof TAB_CONFIG[Exclude<TabKey, "mundo">]][];
    return tabs
      .filter(([key, cfg]) =>
        normalize(cfg.label).includes(q) || normalize(key).includes(q)
      )
      .map(([tab]) => ({ tab }));
  }, [query]);

  // Navegación a subtabs del Mundo/Magia (hechizos, dones, runas, magia)
  const mundoSubTabResults = useMemo((): MundoSubTabResult[] => {
    const q = normalize(query.trim());
    if (!q) return [];
    return MUNDO_SUBTABS
      .filter(st => st.aliases.some(a => normalize(a).includes(q) || q.includes(normalize(a))))
      .map(st => ({ section: "magia" as MundoSectionKey, subTab: st.key, label: st.label }));
  }, [query]);

  const mundoResults = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return [...MUNDO_SECTIONS];
    return [...MUNDO_SECTIONS].filter(s =>
      normalize(s.label).includes(q) || normalize(s.key).includes(q)
    );
  }, [query]);

  const close = useCallback(() => {
    setOpen(false);
    setFocused(false);
    setQuery("");
    setAddMenuOpen(false);
  }, []);

  const handleSelect = useCallback((item: any, tab: Exclude<TabKey, "mundo">) => {
    onSelect(item, tab);
    close();
    inputRef.current?.blur();
  }, [onSelect, close]);

  const handleMundoSection = useCallback((key: MundoSectionKey) => {
    onSelectMundoSection(key);
    close();
    inputRef.current?.blur();
  }, [onSelectMundoSection, close]);

  const handleTabNav = useCallback((tab: Exclude<TabKey, "mundo">) => {
    // Navigate to the tab by selecting no specific item — parent handles tab switch
    onSelect(allItems[tab]?.[0] ?? null, tab);
    close();
    inputRef.current?.blur();
  }, [onSelect, allItems, close]);

  const handleMundoSubTab = useCallback((section: MundoSectionKey, subTab: string) => {
    onSelectMundoSection(section);
    onSelectMundoSubTab?.(section, subTab);
    close();
    inputRef.current?.blur();
  }, [onSelectMundoSection, onSelectMundoSubTab, close]);

  useEffect(() => {
    if (!open) return;
    const onMouse = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { close(); inputRef.current?.blur(); }
      if (e.key === "Enter") {
        if (isAddCommand) {
          e.preventDefault();
          setOpen(false);
          setAddMenuOpen(true);
          return;
        }
        if (globalResults.length > 0) {
          handleSelect(globalResults[0].item, globalResults[0].tab);
        } else if (mundoSubTabResults.length > 0) {
          handleMundoSubTab(mundoSubTabResults[0].section, mundoSubTabResults[0].subTab);
        } else if (tabNavResults.length > 0) {
          handleTabNav(tabNavResults[0].tab);
        } else if (mundoResults.length > 0 && query.trim()) {
          handleMundoSection(mundoResults[0].key as MundoSectionKey);
        }
      }
    };
    document.addEventListener("mousedown", onMouse);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onMouse); document.removeEventListener("keydown", onKey); };
  }, [open, globalResults, close, handleSelect, isAddCommand]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); inputRef.current?.focus(); }
    };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, []);

  const activeMundoLabel = isMundo && activeMundoSection
    ? MUNDO_SECTIONS.find(s => s.key === activeMundoSection)?.label
    : null;

  const placeholder = focused
    ? "Buscar personajes, criaturas, items, reinos, magia…"
    : activeMundoLabel
      ?? selectedItem?.nombre
      ?? (loadingAll ? "Cargando…" : `${totalCount} entidades`);

  const totalResults = globalResults.length + mundoResults.length + tabNavResults.length + mundoSubTabResults.length;

  return (
    <div
      className="shrink-0 flex flex-col border-b"
      style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
    >
      <div ref={wrapRef} className="flex items-center gap-2 px-3 py-2 relative">

        {/* Input */}
        <div
          className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all border"
          style={focused ? {
            background: "color-mix(in srgb, var(--primary) 6%, transparent)",
            borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)",
          } : {
            background: "color-mix(in srgb, var(--primary) 4%, transparent)",
            borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
          }}
        >
          {/* Icono contextual */}
          {!focused && activeMundoLabel ? (
            (() => {
              const sec = MUNDO_SECTIONS.find(s => s.key === activeMundoSection);
              return sec
                ? <sec.Icon size={11} className="shrink-0 text-primary/40" />
                : <Search size={11} className="shrink-0 text-primary/30" />;
            })()
          ) : selectedItem && !focused ? (
            <div className="shrink-0 w-5 h-5 rounded-md overflow-hidden border border-primary/15 bg-primary/8 flex items-center justify-center">
              {(selectedItem.img_url || selectedItem.imagen_url)
                ? <img src={selectedItem.img_url || selectedItem.imagen_url} alt={selectedItem.nombre} className="w-full h-full object-cover" />
                : (() => {
                    const Icon = TAB_CONFIG[activeTab as Exclude<TabKey, "mundo">].Icon;
                    return <Icon size={9} className="text-primary/40" />;
                  })()}
            </div>
          ) : (
            <Search size={11} className="shrink-0 text-primary/30" />
          )}

          <input
            ref={inputRef}
            value={focused ? query : ""}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => { setFocused(true); setOpen(true); setQuery(""); }}
            placeholder={placeholder}
            className="flex-1 min-w-0 bg-transparent text-[12px] font-medium text-primary outline-none placeholder:text-primary/40"
          />

          {focused && query
            ? <button onClick={() => setQuery("")} className="shrink-0 text-primary/25 hover:text-primary transition-colors"><X size={10} /></button>
            : !focused
              ? <kbd className="shrink-0 hidden sm:flex items-center px-1 py-0.5 rounded text-[8px] font-black text-primary/20 border border-primary/10 font-mono">⌘K</kbd>
              : null}
        </div>

        {/* Botón añadir — eliminado, ahora se activa con "add" + Enter */}

        {/* AddCommandMenu — aparece cuando el usuario escribe "add" y presiona Enter */}
        <AddCommandMenu
          open={addMenuOpen}
          anchorRef={wrapRef}
          onAdd={(tab) => { onAdd(tab); close(); }}
          onClose={() => { setAddMenuOpen(false); setQuery(""); setFocused(false); inputRef.current?.blur(); }}
        />

        {/* Dropdown de búsqueda */}
        {open && focused && !addMenuOpen && (
          <div
            className="absolute left-3 right-3 top-full mt-1.5 z-50 rounded-2xl overflow-hidden"
            style={{
              background: "var(--bg-main)",
              border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
              boxShadow: "0 12px 40px color-mix(in srgb, var(--primary) 18%, transparent)",
            }}
          >
            <div
              className="px-3 py-1.5 flex items-center justify-between border-b"
              style={{ background: "color-mix(in srgb, var(--primary) 3%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 6%, transparent)" }}
            >
              <span className="text-[9px] font-black uppercase tracking-widest text-primary/25">
                {loadingAll
                  ? "Cargando…"
                  : isAddCommand
                    ? "Presiona Enter para añadir"
                    : query.trim()
                      ? `${totalResults} resultado${totalResults !== 1 ? "s" : ""}`
                      : `${totalCount} entidades · Mundo`}
              </span>
              {isOffline && <span className="text-[8px] font-black uppercase tracking-widest text-orange-400">Offline</span>}
            </div>

            <div className="max-h-80 overflow-y-auto p-2">
              {loadingAll ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={16} className="animate-spin text-primary/20" />
                </div>
              ) : isAddCommand ? (
                /* "add" command hint */
                <div className="flex flex-col items-center gap-2 py-6 text-primary/25">
                  <Sparkles size={18} />
                  <p className="text-[9px] font-black uppercase tracking-widest">Presiona Enter para abrir el menú de añadir</p>
                </div>
              ) : query.trim() ? (
                totalResults > 0 ? (
                  <>
                    {/* Tab navigation results */}
                    {tabNavResults.length > 0 && (
                      <>
                        <div className="px-2 pt-2 pb-1">
                          <p className="text-[8px] font-black uppercase tracking-widest text-primary/25">Ir a sección</p>
                        </div>
                        <div className="space-y-0.5 mb-1">
                          {tabNavResults.map(({ tab }) => {
                            const cfg = TAB_CONFIG[tab];
                            const TabIcon = cfg.Icon;
                            return (
                              <button
                                key={tab}
                                onMouseDown={() => handleTabNav(tab)}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150 border ${
                                  activeTab === tab
                                    ? "bg-primary/12 border-primary/20"
                                    : "border-transparent hover:bg-primary/6 hover:border-primary/10"
                                }`}
                              >
                                <div className="shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center"
                                  style={{
                                    background: "color-mix(in srgb, var(--primary) 7%, transparent)",
                                    borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
                                  }}>
                                  <TabIcon size={12} className="text-primary/40" />
                                </div>
                                <span className="flex-1 text-[11px] font-bold text-primary/70">{cfg.label}</span>
                                <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md"
                                  style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)", color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
                                  Tab
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {/* Mundo subtab results (hechizos, dones, runas) */}
                    {mundoSubTabResults.length > 0 && (
                      <>
                        <div className="px-2 pt-2 pb-1">
                          <p className="text-[8px] font-black uppercase tracking-widest text-primary/25">Magia</p>
                        </div>
                        <div className="space-y-0.5 mb-1">
                          {mundoSubTabResults.map(({ section, subTab, label }) => (
                            <button
                              key={subTab}
                              onMouseDown={() => handleMundoSubTab(section, subTab)}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150 border border-transparent hover:bg-primary/6 hover:border-primary/10"
                            >
                              <div className="shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center"
                                style={{
                                  background: "color-mix(in srgb, var(--accent) 8%, transparent)",
                                  borderColor: "color-mix(in srgb, var(--accent) 15%, transparent)",
                                }}>
                                <Sparkles size={12} style={{ color: "var(--accent)" }} className="opacity-60" />
                              </div>
                              <span className="flex-1 text-[11px] font-bold text-primary/70">{label}</span>
                              <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md"
                                style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "color-mix(in srgb, var(--accent) 60%, transparent)" }}>
                                Mundo
                              </span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Search results — grid de 3 columnas */}
                    {globalResults.length > 0 && (
                      <div className="grid grid-cols-6 gap-1">
                        {globalResults.map(({ item, tab }) => (
                          <EntidadCard
                            key={`${tab}-${item.id}`}
                            item={item} tab={tab}
                            selected={selectedId === item.id && activeTab === tab}
                            onClick={() => handleSelect(item, tab)}
                            onToggleOculto={tab === "reinos" ? onToggleOculto : undefined}
                          />
                        ))}
                      </div>
                    )}
                    {mundoResults.length > 0 && (
                      <>
                        <div className="px-2 pt-3 pb-1">
                          <p className="text-[8px] font-black uppercase tracking-widest text-primary/25">Mundo</p>
                        </div>
                        <div className="space-y-0.5">
                          {mundoResults.map(section => (
                            <MundoSectionCard
                              key={section.key}
                              section={section}
                              selected={isMundo && activeMundoSection === section.key}
                              onClick={() => handleMundoSection(section.key as MundoSectionKey)}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-8 text-primary/20">
                    <SlidersHorizontal size={16} />
                    <p className="text-[9px] font-black uppercase tracking-widest">Sin coincidencias</p>
                  </div>
                )
              ) : (
                <>
                  <div className="grid grid-cols-6 gap-1">
                    {Object.entries(allItems)
                      .flatMap(([tab, items]) =>
                        items.map(item => ({ item, tab: tab as Exclude<TabKey, "mundo"> }))
                      )
                      .slice(0, 30)
                      .map(({ item, tab }) => (
                        <EntidadCard
                          key={`${tab}-${item.id}`}
                          item={item} tab={tab}
                          selected={selectedId === item.id && activeTab === tab}
                          onClick={() => handleSelect(item, tab)}
                          onToggleOculto={tab === "reinos" ? onToggleOculto : undefined}
                        />
                      ))}
                  </div>
                  <div className="px-2 pt-3 pb-1">
                    <p className="text-[8px] font-black uppercase tracking-widest text-primary/25">Mundo</p>
                  </div>
                  <div className="space-y-0.5">
                    {MUNDO_SECTIONS.map(section => (
                      <MundoSectionCard
                        key={section.key}
                        section={section}
                        selected={isMundo && activeMundoSection === section.key}
                        onClick={() => handleMundoSection(section.key as MundoSectionKey)}
                      />
                    ))}
                  </div>
                  {/* Add hint at the bottom */}
                  <div className="mt-2 px-2 py-1.5 rounded-xl border border-dashed flex items-center gap-2"
                    style={{ borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
                    <Sparkles size={9} className="text-primary/20 shrink-0" />
                    <p className="text-[8px] font-black uppercase tracking-widest text-primary/20">
                      Escribe <span className="text-primary/40">add</span> + Enter para añadir nueva entrada
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}