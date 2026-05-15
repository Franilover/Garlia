"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Loader2, Eye, EyeOff, Plus, Search, X, SlidersHorizontal, Sparkles,
  Wand2, ScrollText, FileText, Zap, Clock, Globe, Check,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";
import { TAB_CONFIG, MUNDO_SECTIONS, type TabKey, type MundoSectionKey } from "./types";

// ─── Dexie helpers ────────────────────────────────────────────────────────────
async function dexiePut(tabla: string, row: any): Promise<void> {
  try { if (db) await (db as any)[tabla]?.put(row); } catch {}
}
async function dexieDel(tabla: string, id: string): Promise<void> {
  try { if (db) await (db as any)[tabla]?.delete(id); } catch {}
}
async function dexieReadAll<T>(tabla: string): Promise<T[]> {
  try {
    if (!db) return [];
    const t = (db as any)[tabla];
    if (!t) return [];
    return ((await t.toArray()) as any[]).filter((r: any) => !r.deleted) as T[];
  } catch { return []; }
}
async function dexieWriteAll(tabla: string, rows: any[]): Promise<void> {
  try {
    if (!db) return;
    const t = (db as any)[tabla];
    if (!t) return;
    if (rows.length > 0) await t.bulkPut(rows);
    const remoteIds = new Set(rows.map((r: any) => r.id));
    const local: any[] = await t.toArray();
    const toDelete = local.map((r: any) => r.id).filter((id: string) => !remoteIds.has(id));
    if (toDelete.length > 0) await t.bulkDelete(toDelete);
  } catch {}
}



// Subtabs internos del módulo Magia
type MundoSubTab = "magia" | "hechizos" | "dones" | "runas";
const MUNDO_SUBTABS: { key: MundoSubTab; label: string; aliases: string[]; section: MundoSectionKey }[] = [
  { key: "magia",    label: "Magia",    section: "magia",    aliases: ["magia", "magic", "sistema de magia"] },
  { key: "hechizos", label: "Hechizos", section: "magia",    aliases: ["hechizo", "hechizos", "spell", "spells"] },
  { key: "dones",    label: "Dones",    section: "magia",    aliases: ["don", "dones", "gift", "gifts"] },
  { key: "runas",    label: "Runas",    section: "magia",    aliases: ["runa", "runas", "rune", "runes"] },
];

// Todas las tabs del módulo Mundo navegables desde el buscador
// section se usa para setear mundoSection; subTab es el tab unificado dentro de EditorMundo
const MUNDO_NAV: { section: MundoSectionKey; label: string; subTab: string; aliases: string[] }[] = [
  { section: "geografia", label: "Mundo",      subTab: "mundo",    aliases: ["mundo", "world", "geografia", "geografía"] },
  { section: "historia",  label: "Historia",   subTab: "historia", aliases: ["historia", "history", "lore"] },
  { section: "geografia", label: "Listas",     subTab: "listas",   aliases: ["lista", "listas", "entidades"] },
  { section: "geografia", label: "Reinos",     subTab: "listas",   aliases: ["reino", "reinos", "mapa", "mapas"] },
  { section: "geografia", label: "Criaturas",  subTab: "listas",   aliases: ["criatura", "criaturas", "bestia", "bestias", "monstruo"] },
  { section: "geografia", label: "Objetos",    subTab: "listas",   aliases: ["objeto", "objetos", "arma", "reliquia"] },
  { section: "historia",  label: "Personajes", subTab: "listas",   aliases: ["personaje", "personajes", "character", "characters"] },
  { section: "magia",     label: "Magia",      subTab: "magia",    aliases: ["magia", "magic", "sistema"] },
  { section: "magia",     label: "Hechizos",   subTab: "hechizos", aliases: ["hechizo", "hechizos", "spell", "spells"] },
  { section: "magia",     label: "Dones",      subTab: "dones",    aliases: ["don", "dones", "gift", "gifts"] },
  { section: "magia",     label: "Runas",      subTab: "runas",    aliases: ["runa", "runas", "rune", "runes"] },
];

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export type AllItems = {
  personajes: any[];
  criaturas:  any[];
  items:      any[];
  reinos:     any[];
  hechizos:   any[];
  dones:      any[];
  runas:      any[];
  notas:      any[]; 
};

type SearchResult = {
  item: any;
  tab: Exclude<TabKey, "mundo">;
};

type MagicResult = {
  item: any;
  subTab: "hechizos" | "dones" | "runas";
  label: string;
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
      void dexiePut("reinos", { ...item, oculto: nuevoOculto });
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

export type MagicAddKey = "hechizos" | "dones" | "runas" | "notas" | "acontecimiento";

// Colores individuales por tipo — todos con la misma lógica color-mix
const ADD_ITEM_COLOR: Record<string, string> = {
  personajes:      "var(--primary)",
  criaturas:       "var(--primary)",
  items:           "var(--primary)",
  reinos:          "var(--primary)",
  hechizos:        "oklch(0.65 0.18 290)",
  dones:           "oklch(0.72 0.16 55)",
  runas:           "oklch(0.62 0.17 195)",
  notas:           "var(--primary)",
  acontecimiento:  "var(--primary)",
};

// Todas las entradas del menú en orden unificado
type AddEntry =
  | { kind: "tab";   key: Exclude<TabKey, "mundo">; label: string; Icon: React.ElementType }
  | { kind: "magic"; key: MagicAddKey;               label: string; Icon: React.ElementType };

function AddCommandMenu({
  open,
  anchorRef,
  onAdd,
  onAddMagic,
  onClose,
}: {
  open: boolean;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  onAdd: (tab: Exclude<TabKey, "mundo">) => void;
  onAddMagic?: (key: MagicAddKey) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Entidades principales
  const tabEntries: AddEntry[] = (
    Object.entries(TAB_CONFIG) as [Exclude<TabKey, "mundo">, typeof TAB_CONFIG[Exclude<TabKey, "mundo">]][]
  ).map(([key, cfg]) => ({ kind: "tab", key, label: cfg.label, Icon: cfg.Icon }));

  // Magia + notas — sin duplicar hechizos/dones/runas que ya están en tabEntries
  const magicEntries: AddEntry[] = [
    { kind: "magic", key: "hechizos",       label: "Hechizo",       Icon: Wand2    },
    { kind: "magic", key: "dones",          label: "Don",           Icon: Sparkles },
    { kind: "magic", key: "runas",          label: "Runa",          Icon: Zap      },
    { kind: "magic", key: "notas",          label: "Nota",          Icon: FileText },
    { kind: "magic", key: "acontecimiento", label: "Acontecimiento",Icon: Clock    },
  ];

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

  const renderEntry = (entry: AddEntry) => {
    const color = ADD_ITEM_COLOR[entry.key] ?? "var(--primary)";
    const handleClick = () => {
      if (entry.kind === "tab") onAdd(entry.key as Exclude<TabKey, "mundo">);
      else onAddMagic?.(entry.key as MagicAddKey);
      onClose();
    };
    return (
      <button
        key={entry.key}
        onClick={handleClick}
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all border border-dashed"
        style={{
          borderColor: `color-mix(in srgb, ${color} 18%, transparent)`,
          color: `color-mix(in srgb, ${color} 50%, transparent)`,
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.background = `color-mix(in srgb, ${color} 9%, transparent)`;
          el.style.color = color;
          el.style.borderColor = `color-mix(in srgb, ${color} 38%, transparent)`;
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.background = "transparent";
          el.style.color = `color-mix(in srgb, ${color} 50%, transparent)`;
          el.style.borderColor = `color-mix(in srgb, ${color} 18%, transparent)`;
        }}
      >
        <span
          className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ background: `color-mix(in srgb, ${color} 11%, transparent)` }}
        >
          <entry.Icon size={11} />
        </span>
        <span className="flex-1 text-[10px] font-black uppercase tracking-widest">{entry.label}</span>
        <Plus size={8} className="opacity-35" />
      </button>
    );
  };

  return (
    <div
      ref={ref}
      className="absolute left-3 right-3 top-full mt-1.5 z-50 rounded-2xl overflow-hidden"
      style={{
        background: "var(--bg-main)",
        border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
        boxShadow: "0 12px 40px color-mix(in srgb, var(--primary) 18%, transparent)",
        animation: "popIn 140ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        transformOrigin: "top center",
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 flex items-center gap-2 border-b"
        style={{
          background: "color-mix(in srgb, var(--primary) 3%, transparent)",
          borderColor: "color-mix(in srgb, var(--primary) 7%, transparent)",
        }}
      >
        <Plus size={10} className="text-primary/30" />
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/30">Añadir nueva entrada</p>
      </div>

      <div className="p-2 space-y-3">
        {/* Entidades — 2 columnas */}
        <div className="grid grid-cols-2 gap-1">
          {tabEntries.map(renderEntry)}
        </div>

        {/* Separador */}
        <div
          className="flex items-center gap-2 px-1"
          style={{ color: "color-mix(in srgb, var(--primary) 20%, transparent)" }}
        >
          <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
          <span className="text-[7px] font-black uppercase tracking-[0.3em]">Magia &amp; Notas</span>
          <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
        </div>

        {/* Magia + notas — 1 columna */}
        <div className="grid grid-cols-1 gap-1">
          {magicEntries.map(renderEntry)}
        </div>
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

// ─── ModalAcontecimiento ──────────────────────────────────────────────────────
type ReinoMin = { id: string; nombre: string };

export function ModalAcontecimiento({ onClose, onSaved }: {
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [scope, setScope]       = useState<"global" | "reino">("global");
  const [reinos, setReinos]     = useState<ReinoMin[]>([]);
  const [reinoId, setReinoId]   = useState<string>("");
  const [loadingR, setLoadingR] = useState(true);
  const [year, setYear]         = useState("");
  const [title, setTitle]       = useState("");
  const [desc, setDesc]         = useState("");
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Load reinos
  useEffect(() => {
    (async () => {
      try {
        const local = await dexieReadAll<ReinoMin>("reinos");
        if (local.length) { setReinos(local); setLoadingR(false); }
        if (!navigator.onLine) { if (!local.length) setLoadingR(false); return; }
        const { data } = await supabase.from("reinos").select("id, nombre").order("nombre");
        setReinos((data ?? []) as ReinoMin[]);
      } finally { setLoadingR(false); }
    })();
  }, []);

  const canSave = title.trim() && (scope === "global" || reinoId);

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      const newEvt = { id: crypto.randomUUID(), year: year.trim(), title: title.trim(), description: desc.trim() };

      if (scope === "global") {
        // La historia del mundo vive en mundo_secciones, fila key="historia", campo contenido (JSON)
        const { data: secRow } = await supabase
          .from("mundo_secciones")
          .select("contenido")
          .eq("key", "historia")
          .single();
        let events: any[] = [];
        try { events = JSON.parse(secRow?.contenido ?? "[]"); } catch {}
        if (!Array.isArray(events)) events = [];
        events.push(newEvt);
        const { error: err } = await supabase
          .from("mundo_secciones")
          .update({ contenido: JSON.stringify(events), updated_at: new Date().toISOString() })
          .eq("key", "historia");
        if (err) throw err;
      } else {
        // Historia del reino: tabla reinos, campo historia (JSON)
        const { data: reinoRow } = await supabase.from("reinos").select("id, historia").eq("id", reinoId).single();
        if (!reinoRow) throw new Error("No se encontró el reino");
        let events: any[] = [];
        try { events = JSON.parse((reinoRow as any).historia ?? "[]"); } catch {}
        if (!Array.isArray(events)) events = [];
        events.push(newEvt);
        const { error: err } = await supabase.from("reinos").update({ historia: JSON.stringify(events) }).eq("id", reinoId);
        if (err) throw err;
      }

      setSaved(true);
      onSaved?.();
      setTimeout(onClose, 900);
    } catch (e: any) {
      setError(e?.message ?? "Error al guardar");
    } finally { setSaving(false); }
  };

  // Close on Escape
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);

  const INPUT = "w-full px-3 py-2 rounded-xl text-xs font-medium text-primary bg-transparent border transition-all outline-none placeholder:text-primary/25 focus:border-primary/40 focus:bg-primary/3";
  const borderNorm = "border-primary/15";

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ background: "color-mix(in srgb, var(--primary) 30%, transparent)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: "var(--bg-main)",
          border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
          animation: "popIn 160ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b"
          style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)", background: "color-mix(in srgb, var(--primary) 3%, transparent)" }}>
          <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border"
            style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 18%, transparent)" }}>
            <Clock size={12} className="text-primary/50" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40">Añadir acontecimiento</p>
          </div>
          <button onClick={onClose} className="text-primary/25 hover:text-primary transition-colors"><X size={15} /></button>
        </div>

        <div className="p-4 space-y-3">
          {/* Scope toggle */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">Ámbito</label>
            <div className="flex gap-1.5">
              {(["global", "reino"] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setScope(s)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all"
                  style={scope === s ? {
                    background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                    borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)",
                    color: "var(--primary)",
                  } : {
                    borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
                    color: "color-mix(in srgb, var(--primary) 35%, transparent)",
                  }}
                >
                  {s === "global" ? <Globe size={10} /> : <ScrollText size={10} />}
                  {s === "global" ? "Global" : "Un reino"}
                </button>
              ))}
            </div>
          </div>

          {/* Reino selector */}
          {scope === "reino" && (
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">Reino</label>
              {loadingR ? (
                <div className="flex items-center gap-2 px-3 py-2">
                  <Loader2 size={11} className="animate-spin text-primary/20" />
                  <span className="text-[10px] text-primary/30">Cargando reinos…</span>
                </div>
              ) : (
                <select
                  value={reinoId}
                  onChange={e => setReinoId(e.target.value)}
                  className={`${INPUT} ${borderNorm} cursor-pointer`}
                  style={{ appearance: "none" }}
                >
                  <option value="">Seleccionar reino…</option>
                  {reinos.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </select>
              )}
            </div>
          )}

          {/* Año/era */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">Año / Era <span className="text-primary/20 normal-case tracking-normal font-medium">(opcional)</span></label>
            <input
              value={year}
              onChange={e => setYear(e.target.value)}
              placeholder="Año 342, Era del Fuego, Antes del Caos…"
              className={`${INPUT} ${borderNorm}`}
            />
          </div>

          {/* Título */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">Título</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="La Gran Batalla, Fundación del Imperio…"
              className={`${INPUT} ${borderNorm}`}
              onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
            />
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">Qué ocurrió <span className="text-primary/20 normal-case tracking-normal font-medium">(opcional)</span></label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Describe el acontecimiento, sus causas y consecuencias…"
              rows={3}
              className={`${INPUT} ${borderNorm} resize-none`}
            />
          </div>

          {error && (
            <p className="text-[10px] text-red-400 font-medium px-1">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t"
          style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)", background: "color-mix(in srgb, var(--primary) 2%, transparent)" }}>
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary/40 hover:text-primary hover:bg-primary/6 transition-all border border-transparent hover:border-primary/10">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
            style={{
              background: saved ? "color-mix(in srgb, #22c55e 80%, transparent)" : "var(--primary)",
              color: "var(--btn-text, white)",
            }}
          >
            {saving ? <Loader2 size={10} className="animate-spin" /> : saved ? <Check size={10} /> : <Clock size={10} />}
            {saved ? "Guardado" : saving ? "Guardando…" : "Añadir"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ModalMagicNombre ─────────────────────────────────────────────────────────
// Modal para crear Hechizo, Don o Runa pidiendo el nombre directamente

type MagicNombreKey = "hechizos" | "dones" | "runas";

const MAGIC_NOMBRE_CONFIG: Record<MagicNombreKey, {
  tabla: string; label: string; labelSing: string;
  Icon: React.ElementType; color: string; placeholder: string;
}> = {
  hechizos: {
    tabla: "hechizos", label: "Hechizos", labelSing: "Hechizo",
    Icon: Wand2, color: "oklch(0.65 0.18 290)",
    placeholder: "Nombre del hechizo…",
  },
  dones: {
    tabla: "dones", label: "Dones", labelSing: "Don",
    Icon: Sparkles, color: "oklch(0.7 0.16 55)",
    placeholder: "Nombre del don…",
  },
  runas: {
    tabla: "runas", label: "Runas", labelSing: "Runa",
    Icon: Zap, color: "oklch(0.68 0.16 195)",
    placeholder: "Nombre de la runa…",
  },
};

export function ModalMagicNombre({
  tipo,
  onClose,
  onCreated,
}: {
  tipo: MagicNombreKey;
  onClose: () => void;
  onCreated?: (item: any) => void;
}) {
  const cfg = MAGIC_NOMBRE_CONFIG[tipo];
  const [nombre,  setNombre]  = useState("");
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);

  const canSave = nombre.trim().length > 0;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from(cfg.tabla)
        .insert([{ nombre: nombre.trim() }])
        .select("id, nombre, explicacion")
        .single();
      if (err) throw err;
      setSaved(true);
      onCreated?.(data);
      setTimeout(onClose, 700);
    } catch (e: any) {
      setError(e?.message ?? "Error al crear");
    } finally {
      setSaving(false);
    }
  };

  const INPUT = "w-full px-3 py-2 rounded-xl text-xs font-medium text-primary bg-transparent border transition-all outline-none placeholder:text-primary/25 focus:border-primary/40 focus:bg-primary/3";

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ background: "color-mix(in srgb, var(--primary) 30%, transparent)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: "var(--bg-main)",
          border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
          animation: "popIn 160ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-3 border-b"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
            background: "color-mix(in srgb, var(--primary) 3%, transparent)",
          }}
        >
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border"
            style={{
              background: `color-mix(in srgb, ${cfg.color} 12%, transparent)`,
              borderColor: `color-mix(in srgb, ${cfg.color} 25%, transparent)`,
            }}
          >
            <cfg.Icon size={12} style={{ color: cfg.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40">
              Nuevo {cfg.labelSing}
            </p>
          </div>
          <button onClick={onClose} className="text-primary/25 hover:text-primary transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">
              Nombre
            </label>
            <input
              ref={inputRef}
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder={cfg.placeholder}
              className={`${INPUT} border-primary/15`}
              onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
            />
          </div>

          {error && (
            <p className="text-[10px] text-red-400 font-medium px-1">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2 px-4 py-3 border-t"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
            background: "color-mix(in srgb, var(--primary) 2%, transparent)",
          }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary/40 hover:text-primary hover:bg-primary/6 transition-all border border-transparent hover:border-primary/10"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
            style={{
              background: saved
                ? "color-mix(in srgb, #22c55e 80%, transparent)"
                : `color-mix(in srgb, ${cfg.color} 85%, transparent)`,
              color: "var(--btn-text, white)",
            }}
          >
            {saving ? <Loader2 size={10} className="animate-spin" /> : saved ? <Check size={10} /> : <cfg.Icon size={10} />}
            {saved ? "Creado" : saving ? "Creando…" : `Crear ${cfg.labelSing}`}
          </button>
        </div>
      </div>
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
  onAddMagic,
  onNavigateTab,
  onSelectMundoSection,
  onSelectMundoSubTab,
  onSelectMagic,
  onToggleOculto,
  onSelectNota,
  
}: {
  allItems: AllItems;
  loadingAll: boolean;
  isOffline: boolean;
  activeTab: TabKey;
  selectedId: string | null;
  activeMundoSection: MundoSectionKey | null;
  onSelect: (item: any, tab: Exclude<TabKey, "mundo">) => void;
  onAdd: (tab: Exclude<TabKey, "mundo">) => void;
  onAddMagic?: (key: MagicAddKey) => void;
  onNavigateTab?: (tab: Exclude<TabKey, "mundo">) => void;
  onSelectMundoSection: (s: MundoSectionKey) => void;
  onSelectMundoSubTab?: (section: MundoSectionKey, subTab: string) => void;
  onSelectMagic?: (subTab: "hechizos" | "dones" | "runas", item: any) => void;
  onToggleOculto?: (id: string, oculto: boolean) => void;
  onSelectNota?: (nota: any) => void;
}) {
  const [query,           setQuery]           = useState("");
  const [open,            setOpen]            = useState(false);
  const [focused,         setFocused]         = useState(false);
  const [addMenuOpen,     setAddMenuOpen]     = useState(false);
  const [magicNombreModal, setMagicNombreModal] = useState<"hechizos" | "dones" | "runas" | null>(null);
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



type NotaResult = { item: any };

const notaResults = useMemo((): NotaResult[] => {
  const q = normalize(query.trim());
  if (!q) return [];
  return (allItems.notas ?? [])
    .filter((n: any) =>
      normalize(n.titulo ?? "").includes(q) ||
      normalize(n.contenido ?? "").includes(q) ||
      normalize(n.etiquetas ?? "").includes(q)
    )
    .map(item => ({ item }));
}, [allItems, query]);

  const magicResults = useMemo((): MagicResult[] => {
    const q = normalize(query.trim());
    if (!q) return [];
    const magic: { key: "hechizos" | "dones" | "runas"; label: string }[] = [
      { key: "hechizos", label: "Hechizo" },
      { key: "dones",    label: "Don"     },
      { key: "runas",    label: "Runa"    },
    ];
    return magic.flatMap(({ key, label }) =>
      (allItems[key] ?? [])
        .filter((i: any) => normalize(i.nombre ?? "").includes(q))
        .map(item => ({ item, subTab: key, label }))
    );
  }, [allItems, query]);
  
  

  // Navegación directa a tabs principales — excluye los que viven en Mundo
  const tabNavResults = useMemo((): TabNavResult[] => {
    const q = normalize(query.trim());
    if (!q) return [];
    const tabs = Object.entries(TAB_CONFIG) as [Exclude<TabKey, "mundo">, typeof TAB_CONFIG[Exclude<TabKey, "mundo">]][];
    return tabs
      .filter(([key, cfg]) =>
        key !== "reinos" && key !== "criaturas" && key !== "personajes" &&
        (normalize(cfg.label).includes(q) || normalize(key).includes(q))
      )
      .map(([tab]) => ({ tab }));
  }, [query]);

  // Navegación a subtabs del Mundo — todo pasa por MUNDO_NAV (incluye magia, historia, geografía)
  const mundoSubTabResults = useMemo((): MundoSubTabResult[] => {
    const q = normalize(query.trim());
    if (!q) return [];
    return MUNDO_NAV
      .filter(n => n.aliases.some(a => normalize(a).includes(q) || q.includes(normalize(a))))
      .map(n => ({ section: n.section as MundoSectionKey, subTab: n.subTab as MundoSubTab, label: n.label }));
  }, [query]);

  // mundoNavResults ya no se usa por separado — todo está en mundoSubTabResults
  const mundoNavResults = useMemo(() => [] as typeof MUNDO_NAV, []);
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
  

  const handleSelectNota = useCallback((nota: any) => {
    onSelectNota?.(nota);
    close();
    inputRef.current?.blur();
  }, [onSelectNota, close]);

  const handleMundoSection = useCallback((key: MundoSectionKey) => {
    onSelectMundoSection(key);
    close();
    inputRef.current?.blur();
  }, [onSelectMundoSection, close]);

  const handleTabNav = useCallback((tab: Exclude<TabKey, "mundo">) => {
    onNavigateTab?.(tab);
    close();
    inputRef.current?.blur();
  }, [onNavigateTab, close]);

  const handleMundoSubTab = useCallback((section: MundoSectionKey, subTab: string) => {
    onSelectMundoSection(section);
    onSelectMundoSubTab?.(section, subTab);
    close();
    inputRef.current?.blur();
  }, [onSelectMundoSection, onSelectMundoSubTab, close]);

  const handleMagic = useCallback((subTab: "hechizos" | "dones" | "runas", item: any) => {
    // 1. Navegar a la sección magia y al subtab correcto, pasando el id del item
    onSelectMundoSection("magia");
    onSelectMundoSubTab?.("magia", subTab);
    // 2. Notificar al editor para que abra el item directamente
    onSelectMagic?.(subTab, item);
    close();
    inputRef.current?.blur();
  }, [onSelectMagic, onSelectMundoSection, onSelectMundoSubTab, close]);

  // Intercept magic add: hechizos/dones/runas → ask for name first
  const handleAddMagicWithModal = useCallback((key: MagicAddKey) => {
    if (key === "hechizos" || key === "dones" || key === "runas") {
      close();
      setMagicNombreModal(key);
    } else if (key === "notas") {
      close();
      onAddMagic?.("notas");   // el padre maneja la creación
    } else {
      onAddMagic?.(key);
    }
  }, [onAddMagic, close]);

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
        } else if (mundoNavResults.length > 0) {
          const first = mundoNavResults[0];
          if (first.subTab) handleMundoSubTab(first.section, first.subTab);
          else handleMundoSection(first.section);
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

  const totalResults = globalResults.length + mundoResults.length + tabNavResults.length + mundoSubTabResults.length + mundoNavResults.length + magicResults.length;

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
          onAddMagic={handleAddMagicWithModal}
          onClose={() => { setAddMenuOpen(false); setQuery(""); setFocused(false); inputRef.current?.blur(); }}
        />

        {/* Modal nombre para Hechizo / Don / Runa */}
        {magicNombreModal && (
          <ModalMagicNombre
            tipo={magicNombreModal}
            onClose={() => setMagicNombreModal(null)}
            onCreated={(item) => {
              // Navegar a la sección de magia y seleccionar el item recién creado
              onAddMagic?.(magicNombreModal);
              onSelectMagic?.(magicNombreModal, item);
              setMagicNombreModal(null);
            }}
          />
        )}

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

                    {/* Mundo section navigation (Reinos → Geografía, Historia) */}
                    {mundoNavResults.length > 0 && (
                      <>
                        <div className="px-2 pt-2 pb-1">
                          <p className="text-[8px] font-black uppercase tracking-widest text-primary/25">Mundo</p>
                        </div>
                        <div className="space-y-0.5 mb-1">
                          {mundoNavResults.map(({ section, label, subTab }) => {
                            const sec = MUNDO_SECTIONS.find(s => s.key === section);
                            const SecIcon = sec?.Icon;
                            return (
                              <button
                                key={section + label}
                                onMouseDown={() => {
                                  if (subTab) {
                                    handleMundoSubTab(section, subTab);
                                  } else {
                                    handleMundoSection(section);
                                  }
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150 border ${
                                  isMundo && activeMundoSection === section
                                    ? "bg-primary/12 border-primary/20"
                                    : "border-transparent hover:bg-primary/6 hover:border-primary/10"
                                }`}
                              >
                                <div className="shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center"
                                  style={{
                                    background: "color-mix(in srgb, var(--primary) 7%, transparent)",
                                    borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
                                  }}>
                                  {SecIcon && <SecIcon size={12} className="text-primary/40" />}
                                </div>
                                <span className="flex-1 text-[11px] font-bold text-primary/70">{label}</span>
                                <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md"
                                  style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)", color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
                                  Mundo
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
                          <p className="text-[8px] font-black uppercase tracking-widest text-primary/25">Mundo</p>
                        </div>
                        <div className="space-y-0.5 mb-1">
                          {mundoSubTabResults.map(({ section, subTab, label }) => {
                            const sec = MUNDO_SECTIONS.find(s => s.key === section);
                            const SecIcon = sec?.Icon;
                            const isMagiaTab = ["magia", "hechizos", "dones", "runas"].includes(subTab);
                            return (
                              <button
                                key={section + subTab}
                                onMouseDown={() => handleMundoSubTab(section, subTab)}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150 border ${
                                  isMundo && activeMundoSection === section
                                    ? "bg-primary/12 border-primary/20"
                                    : "border-transparent hover:bg-primary/6 hover:border-primary/10"
                                }`}
                              >
                                <div className="shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center"
                                  style={{
                                    background: isMagiaTab
                                      ? "color-mix(in srgb, var(--accent) 8%, transparent)"
                                      : "color-mix(in srgb, var(--primary) 7%, transparent)",
                                    borderColor: isMagiaTab
                                      ? "color-mix(in srgb, var(--accent) 15%, transparent)"
                                      : "color-mix(in srgb, var(--primary) 12%, transparent)",
                                  }}>
                                  {SecIcon && <SecIcon size={12} style={{ color: isMagiaTab ? "var(--accent)" : "var(--primary)", opacity: 0.5 }} />}
                                </div>
                                <span className="flex-1 text-[11px] font-bold text-primary/70">{label}</span>
                                <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md"
                                  style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)", color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
                                  Mundo
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {/* Search results — grid de 3 columnas */}
                    {globalResults.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
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
                    {magicResults.length > 0 && (
                      <>
                        <div className="px-2 pt-3 pb-1">
                          <p className="text-[8px] font-black uppercase tracking-widest text-primary/25">Magia</p>
                        </div>
                        <div className="space-y-0.5 mb-1">
                          {magicResults.map(({ item, subTab, label }) => (
                            <button
                              key={`${subTab}-${item.id}`}
                              onMouseDown={() => handleMagic(subTab, item)}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150 border border-transparent hover:bg-primary/6 hover:border-primary/10"
                            >
                              <div
                                className="shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center"
                                style={{
                                  background: "color-mix(in srgb, var(--accent) 8%, transparent)",
                                  borderColor: "color-mix(in srgb, var(--accent) 15%, transparent)",
                                }}
                              >
                                <span style={{ fontSize: 11 }}>
                                  <span style={{ fontSize: 9, fontWeight: 900, fontFamily: "var(--font-mono)", color: "color-mix(in srgb, var(--accent) 60%, transparent)" }}>
                                    {subTab === "hechizos" ? "HZ" : subTab === "dones" ? "DN" : "RN"}
                                  </span>
                                </span>
                              </div>
                              <span className="flex-1 text-[11px] font-bold text-primary/70 truncate">{item.nombre}</span>
                              <span
                                className="shrink-0 text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md"
                                style={{ background: "color-mix(in srgb, var(--accent) 8%, transparent)", color: "color-mix(in srgb, var(--accent) 50%, transparent)" }}
                              >
                                {label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                    {notaResults.length > 0 && (
                      <>
                        <div className="px-2 pt-3 pb-1">
                          <p className="text-[8px] font-black uppercase tracking-widest text-primary/25">Notas</p>
                        </div>
                        <div className="space-y-0.5 mb-1">
                          {notaResults.map(({ item }) => (
                            <button
                              key={item.id}
                              onMouseDown={() => handleSelectNota(item)}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150 border border-transparent hover:bg-primary/6 hover:border-primary/10"
                            >
                              <div
                                className="shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center"
                                style={{
                                  background: "color-mix(in srgb, var(--primary) 7%, transparent)",
                                  borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
                                }}
                              >
                                <FileText size={12} className="text-primary/35" />
                              </div>
                              <span className="flex-1 text-[11px] font-bold text-primary/70 truncate">{item.titulo}</span>
                              <span
                                className="shrink-0 text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md"
                                style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)", color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
                              >
                                Nota
                              </span>
                            </button>
                          ))}
                        </div>
                      </>
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
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
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
                    {MUNDO_NAV.map(nav => {
                      const sec = MUNDO_SECTIONS.find(s => s.key === nav.section);
                      const NavIcon = sec?.Icon;
                      const isMagiaTab = ["magia", "hechizos", "dones", "runas"].includes(nav.subTab);
                      const isActive = isMundo && activeMundoSection === nav.section;
                      return (
                        <button
                          key={nav.section + nav.subTab}
                          onMouseDown={() => handleMundoSubTab(nav.section as MundoSectionKey, nav.subTab)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150 border ${
                            isActive ? "bg-primary/12 border-primary/20" : "border-transparent hover:bg-primary/6 hover:border-primary/10"
                          }`}
                        >
                          <div
                            className="shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center"
                            style={{
                              background: isMagiaTab
                                ? "color-mix(in srgb, var(--accent) 8%, transparent)"
                                : "color-mix(in srgb, var(--primary) 7%, transparent)",
                              borderColor: isMagiaTab
                                ? "color-mix(in srgb, var(--accent) 15%, transparent)"
                                : "color-mix(in srgb, var(--primary) 12%, transparent)",
                            }}
                          >
                            {NavIcon && <NavIcon size={12} style={{ color: isMagiaTab ? "var(--accent)" : "var(--primary)", opacity: 0.4 }} />}
                          </div>
                          <span className={`flex-1 text-[11px] font-bold truncate transition-colors ${isActive ? "text-primary" : "text-primary/70 hover:text-primary/90"}`}>
                            {nav.label}
                          </span>
                          <span
                            className="shrink-0 text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md"
                            style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)", color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
                          >
                            Mun
                          </span>
                        </button>
                      );
                    })}
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