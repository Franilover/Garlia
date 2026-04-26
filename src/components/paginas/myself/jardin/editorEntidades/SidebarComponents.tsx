"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Loader2, Eye, EyeOff, Plus, Search, X, SlidersHorizontal,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { TAB_CONFIG, MUNDO_SECTIONS, type TabKey, type MundoSectionKey } from "./types";

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export type AllItems = {
  personajes: any[];
  criaturas:  any[];
  items:      any[];
  reinos:     any[];
  hechizos:   any[];   // ← nuevo
  dones:      any[];   // ← nuevo
};

type SearchResult = {
  item: any;
  tab: Exclude<TabKey, "mundo">;
};

// ─── EntidadCard ──────────────────────────────────────────────────────────────
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
    tab === "reinos"     ? (item.oculto ? "Oculto" : "") :
    // hechizos y dones muestran el campo "quien"
    tab === "hechizos"   ? item.quien :
    tab === "dones"      ? item.quien : "";

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
            : <TabIcon size={13} className="text-primary/30" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[11px] font-bold truncate transition-colors ${
            selected ? "text-primary" : "text-primary/70 group-hover:text-primary/90"
          }`}>{item.nombre}</p>
          {subtitle && <p className="text-[9px] text-primary/35 truncate mt-0.5">{subtitle}</p>}
        </div>
        <span
          className="shrink-0 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md"
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

// ─── AddMenu ──────────────────────────────────────────────────────────────────
function AddMenu({ onAdd }: { onAdd: (tab: Exclude<TabKey, "mundo">) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const tabs = Object.entries(TAB_CONFIG) as [Exclude<TabKey, "mundo">, typeof TAB_CONFIG[Exclude<TabKey, "mundo">]][];

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        title="Añadir entidad"
        className="w-8 h-8 rounded-xl flex items-center justify-center transition-all border"
        style={open ? {
          background: "color-mix(in srgb, var(--primary) 12%, transparent)",
          color: "var(--primary)",
          borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)",
        } : {
          borderStyle: "dashed",
          borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)",
          color: "color-mix(in srgb, var(--primary) 30%, transparent)",
        }}
      >
        <Plus size={13} style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)", transition: "transform 180ms ease" }} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 z-50 rounded-2xl overflow-hidden"
          style={{
            background: "var(--bg-main)",
            border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
            boxShadow: "0 12px 32px color-mix(in srgb, var(--primary) 20%, transparent)",
            minWidth: "160px",
            animation: "popIn 120ms cubic-bezier(0.34, 1.56, 0.64, 1)",
            transformOrigin: "top right",
          }}
        >
          <div
            className="px-3 py-2 border-b"
            style={{
              background: "color-mix(in srgb, var(--primary) 3%, transparent)",
              borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
            }}
          >
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-primary/30">Nueva entrada</p>
          </div>
          <div className="p-1.5 space-y-0.5">
            {tabs.map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => { onAdd(key); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all group"
                style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 8%, transparent)";
                  (e.currentTarget as HTMLElement).style.color = "var(--primary)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--primary) 55%, transparent)";
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
        </div>
      )}

      <style>{`
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.88); }
          to   { opacity: 1; transform: scale(1); }
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
  onToggleOculto?: (id: string, oculto: boolean) => void;
}) {
  const [query,   setQuery]   = useState("");
  const [open,    setOpen]    = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef  = useRef<HTMLDivElement>(null);

  const isMundo = activeTab === "mundo";

  const selectedItem = useMemo(() => {
    if (isMundo || !selectedId) return null;
    if (activeTab === "hechizos" || activeTab === "dones") return null; // su propio estado interno
    const tab = activeTab as Exclude<TabKey, "mundo" | "hechizos" | "dones">;
    return allItems[tab]?.find((i: any) => i.id === selectedId) ?? null;
  }, [allItems, selectedId, activeTab, isMundo]);

  const totalCount = useMemo(() =>
    Object.values(allItems).reduce((a, arr) => a + arr.length, 0),
  [allItems]);

  // Búsqueda global en todas las categorías (incluyendo hechizos y dones)
  const globalResults = useMemo((): SearchResult[] => {
    const q = normalize(query.trim());
    if (!q) return [];
    const tabs: Exclude<TabKey, "mundo">[] = ["personajes", "criaturas", "items", "reinos", "hechizos", "dones"];
    return tabs.flatMap(tab =>
      (allItems[tab] ?? [])
        .filter((i: any) => normalize(i.nombre ?? "").includes(q))
        .map(item => ({ item, tab }))
    );
  }, [allItems, query]);

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

  useEffect(() => {
    if (!open) return;
    const onMouse = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { close(); inputRef.current?.blur(); }
      if (e.key === "Enter" && globalResults.length > 0) {
        handleSelect(globalResults[0].item, globalResults[0].tab);
      }
    };
    document.addEventListener("mousedown", onMouse);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onMouse); document.removeEventListener("keydown", onKey); };
  }, [open, globalResults, close, handleSelect]);

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

  // Placeholder contextual: muestra tab activo de hechizos/dones si corresponde
  const activeTabLabel =
    activeTab === "hechizos" ? "Hechizos" :
    activeTab === "dones"    ? "Dones"    : null;

  const placeholder = focused
    ? "Buscar personajes, criaturas, items, reinos, hechizos, dones, mundo…"
    : activeMundoLabel
      ?? activeTabLabel
      ?? selectedItem?.nombre
      ?? (loadingAll ? "Cargando…" : `${totalCount} entidades`);

  const totalResults = globalResults.length + mundoResults.length;

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
          ) : !focused && activeTabLabel ? (
            (() => {
              const cfg = TAB_CONFIG[activeTab as Exclude<TabKey, "mundo">];
              return <cfg.Icon size={11} className="shrink-0 text-primary/40" />;
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

        {/* Botón añadir */}
        <AddMenu onAdd={(tab) => { onAdd(tab); close(); }} />

        {/* Dropdown */}
        {open && focused && (
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
                  : query.trim()
                    ? `${totalResults} resultado${totalResults !== 1 ? "s" : ""}`
                    : `${totalCount} entidades · Mundo`}
              </span>
              {isOffline && <span className="text-[8px] font-black uppercase tracking-widest text-orange-400">Offline</span>}
            </div>

            <div className="max-h-72 overflow-y-auto p-2 space-y-0.5">
              {loadingAll ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={16} className="animate-spin text-primary/20" />
                </div>
              ) : query.trim() ? (
                totalResults > 0 ? (
                  <>
                    {globalResults.map(({ item, tab }) => (
                      <EntidadCard
                        key={`${tab}-${item.id}`}
                        item={item} tab={tab}
                        selected={selectedId === item.id && activeTab === tab}
                        onClick={() => handleSelect(item, tab)}
                        onToggleOculto={tab === "reinos" ? onToggleOculto : undefined}
                      />
                    ))}
                    {mundoResults.length > 0 && (
                      <>
                        {globalResults.length > 0 && (
                          <div className="px-2 pt-2 pb-1">
                            <p className="text-[8px] font-black uppercase tracking-widest text-primary/25">Mundo</p>
                          </div>
                        )}
                        {mundoResults.map(section => (
                          <MundoSectionCard
                            key={section.key}
                            section={section}
                            selected={isMundo && activeMundoSection === section.key}
                            onClick={() => handleMundoSection(section.key as MundoSectionKey)}
                          />
                        ))}
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
                  {Object.entries(allItems)
                    .flatMap(([tab, items]) =>
                      items.map(item => ({ item, tab: tab as Exclude<TabKey, "mundo"> }))
                    )
                    .slice(0, 27)
                    .map(({ item, tab }) => (
                      <EntidadCard
                        key={`${tab}-${item.id}`}
                        item={item} tab={tab}
                        selected={selectedId === item.id && activeTab === tab}
                        onClick={() => handleSelect(item, tab)}
                        onToggleOculto={tab === "reinos" ? onToggleOculto : undefined}
                      />
                    ))}
                  <div className="px-2 pt-2 pb-1">
                    <p className="text-[8px] font-black uppercase tracking-widest text-primary/25">Mundo</p>
                  </div>
                  {MUNDO_SECTIONS.map(section => (
                    <MundoSectionCard
                      key={section.key}
                      section={section}
                      selected={isMundo && activeMundoSection === section.key}
                      onClick={() => handleMundoSection(section.key as MundoSectionKey)}
                    />
                  ))}
                </>
              )}
            </div>

            <div className="p-2 border-t" style={{ borderColor: "color-mix(in srgb, var(--primary) 6%, transparent)" }}>
              <p className="text-[8px] font-black uppercase tracking-widest text-primary/20 px-2 pb-1.5">Añadir nueva</p>
              <div className="grid grid-cols-2 gap-1">
                {(Object.entries(TAB_CONFIG) as [Exclude<TabKey, "mundo">, typeof TAB_CONFIG[Exclude<TabKey, "mundo">]][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => { onAdd(key); close(); }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-dashed border-primary/15 text-primary/35 hover:text-primary hover:border-primary/35 hover:bg-primary/4"
                  >
                    <cfg.Icon size={9} /> {cfg.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}