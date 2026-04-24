"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Loader2, Eye, EyeOff, Plus, Globe, Search, X,
  ChevronRight, ChevronDown, SlidersHorizontal,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { TAB_CONFIG, MUNDO_SECTIONS, type TabKey, type MundoSectionKey } from "./types";

// ─── helpers ────────────────────────────────────────────────────────────────
function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ─── EntidadCard ─────────────────────────────────────────────────────────────
// Visual card for each entity in the grid / list
export function EntidadCard({
  item, tab, selected, onClick, onToggleOculto,
}: {
  item: any; tab: TabKey; selected: boolean; onClick: () => void;
  onToggleOculto?: (id: string, oculto: boolean) => void;
}) {
  const img      = tab === "personajes" ? item.img_url : item.imagen_url;
  const TabIcon  = TAB_CONFIG[tab as Exclude<TabKey, "mundo">].Icon;
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
      className="group relative w-full text-left transition-all duration-200"
    >
      {/* Selection indicator */}
      {selected && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full"
          style={{ background: "var(--primary)" }}
        />
      )}

      <div
        className={`flex items-center gap-3 px-3 py-2.5 mx-1 rounded-xl transition-all duration-150 ${
          selected
            ? "bg-primary/12 border border-primary/25"
            : "border border-transparent hover:bg-primary/6 hover:border-primary/12"
        }`}
      >
        {/* Avatar / Icon */}
        <div
          className="shrink-0 w-9 h-9 rounded-lg overflow-hidden border flex items-center justify-center transition-all"
          style={{
            background: img ? "transparent" : "color-mix(in srgb, var(--primary) 7%, transparent)",
            borderColor: selected
              ? "color-mix(in srgb, var(--primary) 30%, transparent)"
              : "color-mix(in srgb, var(--primary) 10%, transparent)",
          }}
        >
          {img
            ? <img src={img} alt={item.nombre} className="w-full h-full object-cover" />
            : <TabIcon size={15} className="text-primary/30" />
          }
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-[11px] font-bold truncate transition-colors ${
              selected ? "text-primary" : "text-primary/70 group-hover:text-primary/90"
            }`}
          >
            {item.nombre}
          </p>
          {subtitle && (
            <p className="text-[9px] text-primary/35 truncate mt-0.5 font-medium">{subtitle}</p>
          )}
        </div>

        {/* Oculto toggle for reinos */}
        {tab === "reinos" && onToggleOculto && (
          <button
            onClick={handleToggle}
            className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-all border ${
              item.oculto
                ? "text-orange-400 bg-orange-400/10 border-orange-400/20"
                : "text-primary/20 bg-transparent border-transparent group-hover:text-primary/40 group-hover:bg-primary/6 group-hover:border-primary/10"
            } ${toggling ? "opacity-40 pointer-events-none" : ""}`}
          >
            {toggling
              ? <Loader2 size={10} className="animate-spin" />
              : item.oculto ? <EyeOff size={10} /> : <Eye size={10} />
            }
          </button>
        )}

        {/* Selected chevron */}
        {selected && (
          <ChevronRight size={11} className="shrink-0 text-primary/40" />
        )}
      </div>
    </button>
  );
}

// ─── TabNav ───────────────────────────────────────────────────────────────────
// Horizontal icon-only tab strip + mundo sub-sections
export function TabNav({
  tab, mundoSection, onTabChange, onMundoSectionChange,
}: {
  tab: TabKey;
  mundoSection: MundoSectionKey;
  onTabChange: (t: TabKey) => void;
  onMundoSectionChange: (s: MundoSectionKey) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      {/* Tab strip */}
      <div
        className="flex gap-0.5 p-1 rounded-xl"
        style={{
          background: "color-mix(in srgb, var(--primary) 5%, transparent)",
          border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
        }}
      >
        {(Object.keys(TAB_CONFIG) as Exclude<TabKey, "mundo">[]).map(k => {
          const { Icon: TabIcon, label } = TAB_CONFIG[k];
          const active = tab === k;
          return (
            <button
              key={k}
              onClick={() => onTabChange(k)}
              title={label}
              className="flex-1 flex items-center justify-center py-2 rounded-lg transition-all duration-150"
              style={active ? {
                background: "var(--primary)",
                color: "var(--btn-text)",
                boxShadow: "0 2px 8px color-mix(in srgb, var(--primary) 25%, transparent)",
              } : {
                color: "color-mix(in srgb, var(--primary) 30%, transparent)",
              }}
            >
              <TabIcon size={13} strokeWidth={active ? 2.5 : 2} />
            </button>
          );
        })}
        {/* Mundo tab */}
        <button
          onClick={() => onTabChange("mundo")}
          title="Mundo"
          className="flex-1 flex items-center justify-center py-2 rounded-lg transition-all duration-150"
          style={tab === "mundo" ? {
            background: "var(--primary)",
            color: "var(--btn-text)",
            boxShadow: "0 2px 8px color-mix(in srgb, var(--primary) 25%, transparent)",
          } : {
            color: "color-mix(in srgb, var(--primary) 30%, transparent)",
          }}
        >
          <Globe size={13} strokeWidth={tab === "mundo" ? 2.5 : 2} />
        </button>
      </div>

      {/* Mundo sub-sections */}
      {tab === "mundo" && (
        <div className="flex flex-col gap-0.5">
          {MUNDO_SECTIONS.map(s => {
            const SectionIcon = s.Icon;
            const active = mundoSection === s.key;
            return (
              <button
                key={s.key}
                onClick={() => onMundoSectionChange(s.key)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all duration-150 text-[11px] font-bold"
                style={active ? {
                  background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                  color: "var(--primary)",
                  border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
                } : {
                  color: "color-mix(in srgb, var(--primary) 40%, transparent)",
                  border: "1px solid transparent",
                }}
              >
                <SectionIcon size={13} />
                {s.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── EntityListPanel ─────────────────────────────────────────────────────────
// The main redesigned component: replaces the old left sidebar.
// Layout: tabs at top → search bar → scrollable list → add button at bottom.
// On desktop: fixed-width left column inside the editor layout.
// On mobile:  hidden by default, opens as a bottom-drawer via a floating trigger.

interface EntityListPanelProps {
  tab: TabKey;
  mundoSection: MundoSectionKey;
  onTabChange: (t: TabKey) => void;
  onMundoSectionChange: (s: MundoSectionKey) => void;
  items: any[];
  selectedId: string | null;
  loading: boolean;
  isOffline: boolean;
  onSelect: (item: any) => void;
  onAdd: () => void;
  onToggleOculto?: (id: string, oculto: boolean) => void;
}

export function EntityListPanel({
  tab, mundoSection, onTabChange, onMundoSectionChange,
  items, selectedId, loading, isOffline, onSelect, onAdd, onToggleOculto,
}: EntityListPanelProps) {
  const [query,       setQuery]       = useState("");
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Reset search when tab changes
  useEffect(() => { setQuery(""); }, [tab]);

  // Close drawer when an item is selected
  const handleSelect = (item: any) => {
    onSelect(item);
    setDrawerOpen(false);
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = normalize(query);
    return items.filter(i => normalize(i.nombre).includes(q));
  }, [items, query]);

  const label = tab === "mundo"
    ? "Mundo"
    : TAB_CONFIG[tab as Exclude<TabKey, "mundo">].label;

  // ── Shared inner content ──────────────────────────────────────────────────
  const InnerContent = ({ compact = false }: { compact?: boolean }) => (
    <div className={`flex flex-col min-h-0 ${compact ? "h-full" : "flex-1"}`}>

      {/* Tabs */}
      <div className="shrink-0 px-3 pt-3 pb-2">
        <TabNav
          tab={tab}
          mundoSection={mundoSection}
          onTabChange={t => { onTabChange(t); }}
          onMundoSectionChange={onMundoSectionChange}
        />
      </div>

      {/* Search — only for entity tabs */}
      {tab !== "mundo" && (
        <div className="shrink-0 px-3 pb-2">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
            style={{
              background: "color-mix(in srgb, var(--primary) 5%, transparent)",
              border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
            }}
          >
            <Search size={11} className="shrink-0 text-primary/30" />
            <input
              ref={searchRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={`Buscar ${label.toLowerCase()}…`}
              className="flex-1 bg-transparent text-[11px] font-medium text-primary outline-none placeholder:text-primary/25"
            />
            {query && (
              <button onClick={() => setQuery("")} className="shrink-0 text-primary/25 hover:text-primary transition-colors">
                <X size={11} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Divider */}
      <div
        className="shrink-0 mx-3 mb-2"
        style={{ height: "1px", background: "color-mix(in srgb, var(--primary) 6%, transparent)" }}
      />

      {/* Stats row */}
      {tab !== "mundo" && (
        <div className="shrink-0 flex items-center justify-between px-4 pb-1.5">
          <span className="text-[9px] font-black uppercase tracking-widest text-primary/30">
            {loading ? "Cargando…" : `${filtered.length} ${filtered.length === 1 ? "resultado" : "resultados"}`}
          </span>
          {isOffline && (
            <span className="text-[9px] font-black uppercase tracking-widest text-orange-400">Sin conexión</span>
          )}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto min-h-0 py-1 space-y-0.5">
        {tab === "mundo" ? (
          // Mundo has no list; handled by sections above
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-primary/20">
            <Globe size={24} />
            <p className="text-[9px] font-black uppercase tracking-widest">Edita el mundo</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={18} className="animate-spin text-primary/20" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-primary/20">
            <SlidersHorizontal size={18} />
            <p className="text-[9px] font-black uppercase tracking-widest text-center px-4">
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

      {/* Add button */}
      {tab !== "mundo" && (
        <div className="shrink-0 p-3 pt-2">
          <button
            onClick={() => { onAdd(); setDrawerOpen(false); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-150 border"
            style={{
              color: "color-mix(in srgb, var(--primary) 50%, transparent)",
              borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
              borderStyle: "dashed",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = "var(--primary)";
              (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--primary) 40%, transparent)";
              (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 5%, transparent)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--primary) 50%, transparent)";
              (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--primary) 15%, transparent)";
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            <Plus size={11} /> Añadir {label.slice(0, -1) || label}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* ── Desktop: left column ─────────────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col w-56 shrink-0 border-r min-h-0 overflow-hidden"
        style={{
          borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
          background: "color-mix(in srgb, var(--primary) 2%, transparent)",
        }}
      >
        <InnerContent />
      </aside>

      {/* ── Mobile: floating trigger + bottom drawer ──────────────────────── */}
      <div className="md:hidden">
        {/* Trigger button — sits above the main content, doesn't overlap navbar */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="fixed bottom-[72px] right-4 z-30 flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-2xl shadow-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
          style={{
            background: "color-mix(in srgb, var(--white-custom) 95%, transparent)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
            color: "var(--primary)",
            boxShadow: "0 8px 24px color-mix(in srgb, var(--primary) 15%, transparent)",
          }}
        >
          {tab !== "mundo" && (() => {
            const { Icon } = TAB_CONFIG[tab as Exclude<TabKey, "mundo">];
            return <Icon size={13} />;
          })()}
          {tab === "mundo" && <Globe size={13} />}
          {label}
          {tab !== "mundo" && !loading && items.length > 0 && (
            <span
              className="px-1.5 py-0.5 rounded-full text-[9px] font-black"
              style={{
                background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                color: "var(--primary)",
              }}
            >
              {items.length}
            </span>
          )}
          <ChevronDown size={11} className="text-primary/40" />
        </button>

        {/* Backdrop */}
        {drawerOpen && (
          <div
            className="fixed inset-0 z-40"
            style={{ background: "color-mix(in srgb, var(--foreground) 40%, transparent)", backdropFilter: "blur(2px)" }}
            onClick={() => setDrawerOpen(false)}
          />
        )}

        {/* Bottom drawer */}
        <div
          className="fixed left-0 right-0 bottom-0 z-50 flex flex-col rounded-t-3xl overflow-hidden transition-transform duration-300"
          style={{
            height: "82dvh",
            background: "var(--bg-main)",
            border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
            borderBottom: "none",
            boxShadow: "0 -16px 48px color-mix(in srgb, var(--primary) 12%, transparent)",
            transform: drawerOpen ? "translateY(0)" : "translateY(100%)",
          }}
        >
          {/* Drag handle */}
          <div className="shrink-0 flex items-center justify-center pt-3 pb-1">
            <div
              className="w-10 h-1 rounded-full"
              style={{ background: "color-mix(in srgb, var(--primary) 20%, transparent)" }}
            />
          </div>
          {/* Header */}
          <div
            className="shrink-0 flex items-center justify-between px-4 pb-2"
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-primary/50">
              {label}
            </span>
            <button
              onClick={() => setDrawerOpen(false)}
              className="w-7 h-7 rounded-xl flex items-center justify-center text-primary/30 hover:text-primary transition-colors"
              style={{ background: "color-mix(in srgb, var(--primary) 6%, transparent)" }}
            >
              <X size={14} />
            </button>
          </div>

          <InnerContent compact />
        </div>
      </div>
    </>
  );
}