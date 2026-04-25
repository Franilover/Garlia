"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Loader2, Eye, EyeOff, Plus, Globe, Search, X,
  ChevronDown, SlidersHorizontal, Command,
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
    <button
      onClick={onClick}
      className="group relative w-full text-left transition-all duration-150"
    >
      <div
        className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150 ${
          selected
            ? "bg-primary/12 border border-primary/20"
            : "border border-transparent hover:bg-primary/6 hover:border-primary/10"
        }`}
      >
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
          }`}>
            {item.nombre}
          </p>
          {subtitle && (
            <p className="text-[9px] text-primary/35 truncate mt-0.5">{subtitle}</p>
          )}
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
            {toggling
              ? <Loader2 size={9} className="animate-spin" />
              : item.oculto ? <EyeOff size={9} /> : <Eye size={9} />
            }
          </button>
        )}
      </div>
    </button>
  );
}

// ─── CommandBar principal ──────────────────────────────────────────────────────
// Reemplaza el sidebar: una barra compacta horizontal en el top del editor
// con búsqueda tipo spotlight que despliega resultados flotantes.

export function CommandBar({
  tab, items, loading, isOffline, selectedId,
  onSelect, onAdd, onToggleOculto,
  activeSection, onSectionChange,
}: {
  tab: TabKey;
  items: any[];
  loading: boolean;
  isOffline: boolean;
  selectedId: string | null;
  onSelect: (item: any) => void;
  onAdd: () => void;
  onToggleOculto?: (id: string, oculto: boolean) => void;
  activeSection?: MundoSectionKey;
  onSectionChange?: (s: MundoSectionKey) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const label = tab === "mundo" ? "Mundo" : TAB_CONFIG[tab as Exclude<TabKey, "mundo">].label;
  const TabIcon = tab === "mundo" ? Globe : TAB_CONFIG[tab as Exclude<TabKey, "mundo">].Icon;

  const selectedItem = items.find(i => i.id === selectedId);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = normalize(query);
    return items.filter(i => normalize(i.nombre ?? "").includes(q));
  }, [items, query]);

  // Cerrar con Escape o click afuera
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.closest("[data-commandbar]")?.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery("");
      }
    };
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); setQuery(""); }
    };
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", k);
    return () => {
      document.removeEventListener("mousedown", h);
      document.removeEventListener("keydown", k);
    };
  }, [open]);

  // Atajo de teclado global Cmd/Ctrl+K
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(o => !o);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, []);

  const handleSelect = (item: any) => {
    onSelect(item);
    setOpen(false);
    setQuery("");
  };

  // ── Mundo: renderizar secciones directamente en la barra ──────────────────
  if (tab === "mundo") {
    return (
      <div
        className="shrink-0 flex items-center gap-1 px-3 py-2 border-b overflow-x-auto"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
      >
        <Globe size={12} className="text-primary/30 shrink-0 mr-1" />
        {MUNDO_SECTIONS.map(({ key, label: sLabel, Icon }) => (
          <button
            key={key}
            onClick={() => onSectionChange?.(key as MundoSectionKey)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
            style={activeSection === key ? {
              background: "color-mix(in srgb, var(--primary) 12%, transparent)",
              color: "var(--primary)",
              border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
            } : {
              color: "color-mix(in srgb, var(--primary) 35%, transparent)",
              border: "1px solid transparent",
            }}
          >
            <Icon size={10} />
            <span>{sLabel}</span>
          </button>
        ))}
      </div>
    );
  }

  // ── Entidades: barra con spotlight ────────────────────────────────────────
  return (
    <div
      className="shrink-0 flex items-center gap-2 px-3 py-2 border-b relative"
      style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
      data-commandbar
    >
      {/* Botón de selección actual (muestra el item seleccionado o placeholder) */}
      <button
        onClick={() => { setOpen(o => !o); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl text-left transition-all border"
        style={open ? {
          background: "color-mix(in srgb, var(--primary) 7%, transparent)",
          borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)",
        } : {
          background: "color-mix(in srgb, var(--primary) 4%, transparent)",
          borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
        }}
      >
        {/* Thumb del item seleccionado */}
        {selectedItem ? (
          <>
            <div className="shrink-0 w-5 h-5 rounded-md overflow-hidden border border-primary/15 bg-primary/8 flex items-center justify-center">
              {(selectedItem.img_url || selectedItem.imagen_url)
                ? <img src={selectedItem.img_url || selectedItem.imagen_url} alt={selectedItem.nombre} className="w-full h-full object-cover" />
                : <TabIcon size={9} className="text-primary/40" />
              }
            </div>
            <span className="flex-1 text-[11px] font-bold text-primary truncate">{selectedItem.nombre}</span>
          </>
        ) : (
          <>
            <TabIcon size={11} className="text-primary/30 shrink-0" />
            <span className="flex-1 text-[11px] font-medium text-primary/30">
              {loading ? "Cargando…" : `${items.length} ${label.toLowerCase()}`}
            </span>
          </>
        )}
        <Search size={10} className="shrink-0 text-primary/25" />
        <kbd className="shrink-0 hidden sm:flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-black text-primary/20 border border-primary/10 font-mono">
          ⌘K
        </kbd>
      </button>

      {/* Botón añadir */}
      <button
        onClick={onAdd}
        title={`Añadir ${label.slice(0, -1)}`}
        className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all border border-dashed border-primary/20 text-primary/30 hover:text-primary hover:border-primary/40 hover:bg-primary/5"
      >
        <Plus size={13} />
      </button>

      {/* Panel flotante tipo spotlight */}
      {open && (
        <div
          ref={panelRef}
          className="absolute left-3 right-3 top-full mt-1.5 z-50 rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background: "var(--bg-main)",
            border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
            boxShadow: "0 16px 48px color-mix(in srgb, var(--primary) 20%, transparent), 0 4px 16px color-mix(in srgb, var(--primary) 10%, transparent)",
          }}
        >
          {/* Search input dentro del panel */}
          <div
            className="flex items-center gap-2 px-3 py-2.5 border-b"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
          >
            <Search size={12} className="text-primary/35 shrink-0" />
            <input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={`Buscar ${label.toLowerCase()}…`}
              className="flex-1 bg-transparent text-[12px] font-medium text-primary outline-none placeholder:text-primary/25"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-primary/25 hover:text-primary transition-colors">
                <X size={10} />
              </button>
            )}
            {isOffline && (
              <span className="text-[8px] font-black uppercase tracking-widest text-orange-400">Offline</span>
            )}
          </div>

          {/* Stats */}
          <div
            className="px-3 py-1.5 flex items-center justify-between"
            style={{ background: "color-mix(in srgb, var(--primary) 2%, transparent)" }}
          >
            <span className="text-[9px] font-black uppercase tracking-widest text-primary/25">
              {loading ? "Cargando…" : `${filtered.length} resultado${filtered.length !== 1 ? "s" : ""}`}
            </span>
            {!loading && items.length > 0 && query && (
              <button
                onClick={() => setQuery("")}
                className="text-[9px] font-black uppercase tracking-widest text-primary/30 hover:text-primary transition-colors"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="max-h-72 overflow-y-auto p-2 space-y-0.5">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={16} className="animate-spin text-primary/20" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-primary/20">
                <SlidersHorizontal size={16} />
                <p className="text-[9px] font-black uppercase tracking-widest">
                  {query ? "Sin coincidencias" : `Sin ${label.toLowerCase()} aún`}
                </p>
              </div>
            ) : (
              filtered.map(item => (
                <EntidadCard
                  key={item.id}
                  item={item}
                  tab={tab}
                  selected={selectedId === item.id}
                  onClick={() => handleSelect(item)}
                  onToggleOculto={onToggleOculto}
                />
              ))
            )}
          </div>

          {/* Footer añadir */}
          <div
            className="p-2 border-t"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 6%, transparent)" }}
          >
            <button
              onClick={() => { onAdd(); setOpen(false); setQuery(""); }}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-dashed border-primary/15 text-primary/35 hover:text-primary hover:border-primary/35 hover:bg-primary/4"
            >
              <Plus size={10} /> Añadir {label.slice(0, -1) || label}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── NavBar de tabs (reemplaza el tab switcher principal si era sidebar-driven) ─
// Se mantiene como componente auxiliar para el padre
export function TabNav({
  tab, onChange,
}: {
  tab: TabKey;
  onChange: (t: TabKey) => void;
}) {
  const allTabs: { key: TabKey; label: string; Icon: React.ElementType }[] = [
    ...Object.entries(TAB_CONFIG).map(([key, cfg]) => ({ key: key as TabKey, label: cfg.label, Icon: cfg.Icon })),
    { key: "mundo" as TabKey, label: "Mundo", Icon: Globe },
  ];

  return (
    <div
      className="shrink-0 flex items-center gap-0.5 px-2 py-2 border-b overflow-x-auto"
      style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
    >
      {allTabs.map(({ key, label, Icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
          style={tab === key ? {
            background: "color-mix(in srgb, var(--primary) 10%, transparent)",
            color: "var(--primary)",
            border: "1px solid color-mix(in srgb, var(--primary) 18%, transparent)",
          } : {
            color: "color-mix(in srgb, var(--primary) 35%, transparent)",
            border: "1px solid transparent",
          }}
        >
          <Icon size={10} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}