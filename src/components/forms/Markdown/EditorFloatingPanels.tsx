"use client";

/**
 * EditorFloatingPanels.tsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Paneles flotantes del MarkdownEditor. Todos son componentes presentacionales:
 * reciben su estado y callbacks como props, no tienen lógica de detección propia.
 *
 * Componentes exportados:
 *   CommandMenu       — menú "add…" de snippets
 *   WikilinkMenu      — autocompletado de [[wikilinks]]
 *   FindReplacePanel  — panel buscar y reemplazar
 *   TableEditorPanel  — editor visual de tablas flotante
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp, Replace, X, Search } from "lucide-react";
import type { CommandItem, WikiEntity } from "./commandItems";

// ── Shared token ─────────────────────────────────────────────────────────────
const PRIMARY = "var(--color-primary, #7c6af7)";
const mono = { fontFamily: "var(--font-mono)" } as const;

// ── Category config ───────────────────────────────────────────────────────────
type Category = "todo" | "snippet" | "imagen" | "personaje" | "dialogo" | "formato";

const CATEGORIES: { id: Category; label: string; emoji: string; keywords: string[] }[] = [
  { id: "todo",      label: "Todo",      emoji: "✦",  keywords: [] },
  { id: "snippet",   label: "Snippet",   emoji: "⚡",  keywords: ["drop","choice","use","section","sound","cita","parrafo","párrafo","snip"] },
  { id: "imagen",    label: "Imagen",    emoji: "🖼️", keywords: ["imagen","img","foto","imag"] },
  { id: "personaje", label: "Personaje", emoji: "⚔️", keywords: ["personaj","criatur","item","ítem","enti","drop","use"] },
  { id: "dialogo",   label: "Diálogo",   emoji: "💬", keywords: ["dial","guion","acot","comi","linea","línea","punt","endash"] },
  { id: "formato",   label: "Formato",   emoji: "¶",  keywords: ["parr","párr","salto","cita","quote","tabla","head","bold","italic"] },
];

function inferCategory(item: CommandItem): Category {
  const kws = item.keywords ?? [];
  const id   = item.id ?? "";
  const all  = [...kws, id].map(s => s.toLowerCase());

  if (all.some(k => ["img","imagen","foto","imag"].includes(k)))                         return "imagen";
  if (all.some(k => ["dial","guion","acot","comi","linea","línea","punt","endash"].some(d => k.includes(d)))) return "dialogo";
  if (all.some(k => ["parr","párr","salto","cita","quote"].some(d => k.includes(d))))   return "formato";
  if (all.some(k => ["personaj","criatur","enti"].some(d => k.includes(d))))            return "personaje";
  if (id.startsWith("snip") || all.some(k => ["drop","choice","use","section","sound"].includes(k))) return "snippet";
  return "formato";
}

// ────────────────────────────────────────────────────────────────────────────
// CommandMenu
// ────────────────────────────────────────────────────────────────────────────
interface CommandMenuProps {
  menuRef: React.RefObject<HTMLDivElement>;
  pos: { top: number; left: number };
  query: string;
  selectedIdx: number;
  items: CommandItem[];
  onSelect: (item: CommandItem) => void;
  onHover: (idx: number) => void;
}

export function CommandMenu({
  menuRef, pos, query, selectedIdx, items, onSelect, onHover,
}: CommandMenuProps) {
  const [localQuery, setLocalQuery]     = useState(query);
  const [activeCategory, setCategory]  = useState<Category>("todo");
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync externa query → local (cuando el usuario escribe en el textarea)
  useEffect(() => { setLocalQuery(query); }, [query]);
  // Focus automático al abrir
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 30); }, []);

  const filtered = useMemo(() => {
    const q = localQuery.toLowerCase().trim();
    return items.filter(item => {
      // filtro de categoría
      if (activeCategory !== "todo") {
        const cat = inferCategory(item);
        if (cat !== activeCategory) return false;
      }
      // filtro de texto
      if (!q) return true;
      const haystack = [item.label, item.description, ...(item.keywords ?? [])].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [items, localQuery, activeCategory]);

  // Conteo por categoría para los chips
  const counts = useMemo(() => {
    const map: Record<Category, number> = { todo: items.length, snippet: 0, imagen: 0, personaje: 0, dialogo: 0, formato: 0 };
    items.forEach(item => { map[inferCategory(item)]++; });
    return map;
  }, [items]);

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: pos.top,
        left: Math.max(8, pos.left),
        zIndex: 9999,
        width: 300,
        background: "var(--bg-menu, #1a1730)",
        border: `1px solid color-mix(in srgb, ${PRIMARY} 22%, transparent)`,
        borderRadius: 12,
        boxShadow: `0 12px 40px color-mix(in srgb, ${PRIMARY} 18%, black)`,
        overflow: "hidden",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* ── Buscador ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 12px",
          borderBottom: `1px solid color-mix(in srgb, var(--foreground) 6%, transparent)`,
        }}
      >
        <Search size={13} style={{ color: `color-mix(in srgb, ${PRIMARY} 55%, transparent)`, flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="text"
          value={localQuery}
          onChange={e => setLocalQuery(e.target.value)}
          placeholder="Buscar…"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: 13,
            fontWeight: 500,
            color: "color-mix(in srgb, var(--foreground) 85%, transparent)",
            caretColor: PRIMARY,
          }}
        />
        {localQuery && (
          <button
            type="button"
            onClick={() => setLocalQuery("")}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", color: `color-mix(in srgb, var(--foreground) 30%, transparent)` }}
          >
            <X size={11} />
          </button>
        )}
        <span style={{ fontSize: 8, ...mono, color: `color-mix(in srgb, ${PRIMARY} 30%, transparent)`, flexShrink: 0 }}>
          ↑↓ Tab
        </span>
      </div>

      {/* ── Items ── */}
      <div style={{ maxHeight: 260, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "18px 12px", fontSize: 11, color: `color-mix(in srgb, var(--foreground) 28%, transparent)`, textAlign: "center", ...mono }}>
            Sin resultados{localQuery ? ` para "${localQuery}"` : ""}
          </div>
        ) : (
          filtered.map((item, idx) => {
            const active = idx === selectedIdx;
            const cat    = inferCategory(item);
            const catCfg = CATEGORIES.find(c => c.id === cat)!;
            return (
              <button
                key={item.id}
                type="button"
                onMouseEnter={() => onHover(idx)}
                onClick={() => onSelect(item)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  background: active ? `color-mix(in srgb, ${PRIMARY} 11%, transparent)` : "transparent",
                  border: "none",
                  borderLeft: active ? `2px solid ${PRIMARY}` : "2px solid transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.1s",
                }}
              >
                {/* Icono */}
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: active
                      ? `color-mix(in srgb, ${PRIMARY} 18%, transparent)`
                      : `color-mix(in srgb, var(--foreground) 5%, transparent)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 15,
                    flexShrink: 0,
                    transition: "background 0.1s",
                  }}
                >
                  {item.icon}
                </div>

                {/* Texto */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: active
                      ? "color-mix(in srgb, var(--foreground) 92%, transparent)"
                      : "color-mix(in srgb, var(--foreground) 65%, transparent)",
                    marginBottom: 2,
                    transition: "color 0.1s",
                  }}>
                    {item.label}
                  </div>
                  <div style={{
                    fontSize: 10,
                    color: `color-mix(in srgb, var(--foreground) 30%, transparent)`,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {item.description}
                  </div>
                </div>

                {/* Tag de tipo */}
                <span style={{
                  flexShrink: 0,
                  fontSize: 8,
                  fontWeight: 900,
                  ...mono,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "2px 6px",
                  borderRadius: 20,
                  background: `color-mix(in srgb, ${PRIMARY} 9%, transparent)`,
                  color: `color-mix(in srgb, ${PRIMARY} 55%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${PRIMARY} 14%, transparent)`,
                }}>
                  {catCfg.emoji} {catCfg.label}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* ── Chips de categoría ── */}
      <div style={{
        display: "flex",
        gap: 4,
        padding: "7px 10px",
        borderTop: `1px solid color-mix(in srgb, var(--foreground) 6%, transparent)`,
        overflowX: "auto",
        scrollbarWidth: "none",
      }}>
        {CATEGORIES.filter(c => c.id === "todo" || counts[c.id] > 0).map(cat => {
          const active = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 8px",
                borderRadius: 20,
                border: active
                  ? `1px solid color-mix(in srgb, ${PRIMARY} 45%, transparent)`
                  : `1px solid color-mix(in srgb, var(--foreground) 10%, transparent)`,
                background: active
                  ? `color-mix(in srgb, ${PRIMARY} 14%, transparent)`
                  : "transparent",
                cursor: "pointer",
                fontSize: 9,
                fontWeight: 800,
                ...mono,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: active
                  ? PRIMARY
                  : `color-mix(in srgb, var(--foreground) 38%, transparent)`,
                transition: "all 0.12s",
              }}
            >
              <span style={{ fontSize: 10 }}>{cat.emoji}</span>
              {cat.label}
              {cat.id !== "todo" && (
                <span style={{
                  fontSize: 8,
                  opacity: 0.6,
                  background: active ? `color-mix(in srgb, ${PRIMARY} 20%, transparent)` : `color-mix(in srgb, var(--foreground) 8%, transparent)`,
                  borderRadius: 10,
                  padding: "0 4px",
                }}>
                  {counts[cat.id]}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// WikilinkMenu
// ────────────────────────────────────────────────────────────────────────────
interface WikilinkMenuProps {
  menuRef: React.RefObject<HTMLDivElement>;
  pos: { top: number; left: number };
  query: string;
  selectedIdx: number;
  entities: WikiEntity[];
  onSelect: (entity: WikiEntity) => void;
  onHover: (idx: number) => void;
}

export function WikilinkMenu({
  menuRef, pos, query, selectedIdx, entities, onSelect, onHover,
}: WikilinkMenuProps) {
  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: pos.top,
        left: Math.max(8, pos.left),
        zIndex: 9999,
        width: 264,
        background: "var(--bg-main, var(--bg-menu, #1a1730))",
        border: `1px solid color-mix(in srgb, ${PRIMARY} 15%, transparent)`,
        borderRadius: 16,
        boxShadow: `0 12px 40px color-mix(in srgb, ${PRIMARY} 22%, transparent)`,
        overflow: "hidden",
        backdropFilter: "blur(12px)",
        animation: "wikiPopIn 140ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        transformOrigin: "top left",
      }}
    >
      <style>{`
        @keyframes wikiPopIn {
          from { opacity: 0; transform: scale(0.92) translateY(-4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          padding: "8px 12px 7px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          borderBottom: `1px solid color-mix(in srgb, ${PRIMARY} 8%, transparent)`,
          background: `color-mix(in srgb, ${PRIMARY} 4%, transparent)`,
        }}
      >
        <span
          style={{
            fontSize: 9,
            ...mono,
            fontWeight: 900,
            letterSpacing: "0.05em",
            color: `color-mix(in srgb, ${PRIMARY} 50%, transparent)`,
            background: `color-mix(in srgb, ${PRIMARY} 10%, transparent)`,
            padding: "1px 5px",
            borderRadius: 4,
          }}
        >
          [[
        </span>
        {query ? (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              ...mono,
              color: PRIMARY,
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {query}
          </span>
        ) : (
          <span
            style={{
              fontSize: 9,
              fontWeight: 900,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: `color-mix(in srgb, ${PRIMARY} 35%, transparent)`,
              flex: 1,
            }}
          >
            Entidades
          </span>
        )}
        <span style={{ fontSize: 8, ...mono, color: `color-mix(in srgb, ${PRIMARY} 30%, transparent)` }}>
          ↑↓ Tab
        </span>
      </div>

      {/* Entity list */}
      <div style={{ maxHeight: 240, overflowY: "auto", padding: "6px" }}>
        {entities.length === 0 ? (
          <div
            style={{
              padding: "16px 12px",
              fontSize: 10,
              textAlign: "center",
              ...mono,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: `color-mix(in srgb, ${PRIMARY} 25%, transparent)`,
            }}
          >
            Sin coincidencias
          </div>
        ) : (
          entities.map((entity, idx) => {
            const active = idx === selectedIdx;
            const initial = entity.name.trim()[0]?.toUpperCase() ?? "?";
            return (
              <button
                key={entity.name}
                type="button"
                onMouseEnter={() => onHover(idx)}
                onClick={() => onSelect(entity)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "6px 8px",
                  background: active
                    ? `color-mix(in srgb, ${PRIMARY} 12%, transparent)`
                    : "transparent",
                  border: active
                    ? `1px solid color-mix(in srgb, ${PRIMARY} 20%, transparent)`
                    : "1px solid transparent",
                  borderRadius: 12,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.1s, border-color 0.1s",
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: active
                      ? `color-mix(in srgb, ${PRIMARY} 20%, transparent)`
                      : `color-mix(in srgb, ${PRIMARY} 7%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${PRIMARY} ${active ? 25 : 10}%, transparent)`,
                    fontSize: 11,
                    fontWeight: 900,
                    ...mono,
                    color: active
                      ? PRIMARY
                      : `color-mix(in srgb, ${PRIMARY} 40%, transparent)`,
                    transition: "background 0.1s, color 0.1s",
                  }}
                >
                  {initial}
                </div>
                {/* Name */}
                <span
                  style={{
                    flex: 1,
                    fontSize: 11,
                    fontWeight: 700,
                    color: active
                      ? "color-mix(in srgb, var(--foreground) 90%, transparent)"
                      : "color-mix(in srgb, var(--foreground) 60%, transparent)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    transition: "color 0.1s",
                  }}
                >
                  {entity.name}
                </span>
                {/* Type tag */}
                <span
                  style={{
                    flexShrink: 0,
                    fontSize: 7,
                    fontWeight: 900,
                    ...mono,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    padding: "2px 5px",
                    borderRadius: 5,
                    background: `color-mix(in srgb, ${PRIMARY} 8%, transparent)`,
                    color: `color-mix(in srgb, ${PRIMARY} 40%, transparent)`,
                  }}
                >
                  {entity.type}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// FindReplacePanel
// ────────────────────────────────────────────────────────────────────────────
interface FindReplacePanelProps {
  findInputRef: React.RefObject<HTMLInputElement>;
  find: string;
  replace: string;
  caseSensitive: boolean;
  currentMatch: number;
  totalMatches: number;
  onFindChange: (v: string) => void;
  onReplaceChange: (v: string) => void;
  onCaseSensitiveChange: (v: boolean) => void;
  onFindNext: () => void;
  onFindPrev: () => void;
  onReplaceOne: () => void;
  onReplaceAll: () => void;
  onClose: () => void;
  onFindKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function FindReplacePanel({
  findInputRef, find, replace, caseSensitive,
  currentMatch, totalMatches,
  onFindChange, onReplaceChange, onCaseSensitiveChange,
  onFindNext, onFindPrev, onReplaceOne, onReplaceAll,
  onClose, onFindKeyDown,
}: FindReplacePanelProps) {
  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "color-mix(in srgb, var(--foreground) 5%, transparent)",
    border: "1px solid color-mix(in srgb, var(--foreground) 12%, transparent)",
    borderRadius: 5,
    padding: "4px 8px",
    fontSize: 12,
    color: "color-mix(in srgb, var(--foreground) 80%, transparent)",
    outline: "none",
    ...mono,
    boxSizing: "border-box",
  };

  const navBtn: React.CSSProperties = {
    background: "none",
    border: "1px solid color-mix(in srgb, var(--foreground) 12%, transparent)",
    borderRadius: 4,
    cursor: "pointer",
    color: "color-mix(in srgb, var(--foreground) 50%, transparent)",
    padding: "3px 5px",
    display: "flex",
  };

  const actionBtn = (accent = false): React.CSSProperties => ({
    background: accent
      ? `color-mix(in srgb, ${PRIMARY} 15%, transparent)`
      : "transparent",
    border: `1px solid color-mix(in srgb, ${accent ? PRIMARY : "var(--foreground)"} ${accent ? 30 : 12}%, transparent)`,
    borderRadius: 4,
    cursor: "pointer",
    color: accent
      ? PRIMARY
      : "color-mix(in srgb, var(--foreground) 40%, transparent)",
    padding: "3px 7px",
    fontSize: 10,
    ...mono,
    fontWeight: 700,
    whiteSpace: "nowrap",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        zIndex: 300,
        width: 320,
        background: "var(--bg-menu, #1a1730)",
        border: `1px solid color-mix(in srgb, ${PRIMARY} 25%, transparent)`,
        borderRadius: 8,
        boxShadow: `0 8px 32px color-mix(in srgb, ${PRIMARY} 15%, black)`,
        overflow: "hidden",
        backdropFilter: "blur(8px)",
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            fontSize: 10,
            ...mono,
            color: `color-mix(in srgb, ${PRIMARY} 70%, transparent)`,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          Buscar y reemplazar
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "color-mix(in srgb, var(--foreground) 35%, transparent)",
            padding: 2,
            display: "flex",
          }}
        >
          <X size={12} />
        </button>
      </div>

      {/* Find row */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <input
            ref={findInputRef}
            type="text"
            value={find}
            onChange={e => onFindChange(e.target.value)}
            onKeyDown={onFindKeyDown}
            placeholder="Buscar…"
            style={inputStyle}
          />
          {find && (
            <span
              style={{
                position: "absolute",
                right: 6,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 10,
                color: "color-mix(in srgb, var(--foreground) 30%, transparent)",
                ...mono,
                pointerEvents: "none",
              }}
            >
              {totalMatches > 0 ? `${currentMatch + 1}/${totalMatches}` : "0/0"}
            </span>
          )}
        </div>
        <button type="button" onClick={onFindPrev} title="Anterior (Shift+Enter)" style={navBtn}>
          <ChevronUp size={12} />
        </button>
        <button type="button" onClick={onFindNext} title="Siguiente (Enter)" style={navBtn}>
          <ChevronDown size={12} />
        </button>
      </div>

      {/* Replace row */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          type="text"
          value={replace}
          onChange={e => onReplaceChange(e.target.value)}
          onKeyDown={e => { if (e.key === "Escape") onClose(); }}
          placeholder="Reemplazar con…"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button type="button" onClick={onReplaceOne} title="Reemplazar este" style={actionBtn(true)}>
          <Replace size={11} />
        </button>
        <button type="button" onClick={onReplaceAll} title="Reemplazar todos" style={actionBtn(true)}>
          All
        </button>
      </div>

      {/* Options */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            cursor: "pointer",
            fontSize: 10,
            color: "color-mix(in srgb, var(--foreground) 45%, transparent)",
            ...mono,
          }}
        >
          <input
            type="checkbox"
            checked={caseSensitive}
            onChange={e => onCaseSensitiveChange(e.target.checked)}
            style={{ accentColor: PRIMARY, width: 11, height: 11 }}
          />
          Aa (mayúsculas)
        </label>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TableEditorPanel
// ────────────────────────────────────────────────────────────────────────────
interface TableEditorPanelProps {
  anchorEl: { top: number; left: number };
  rows: string[][];
  onCellChange: (ri: number, ci: number, value: string) => void;
  onAddRow: () => void;
  onAddCol: () => void;
  onDeleteRow: (ri: number) => void;
  onDeleteLastRow: () => void;
  onDeleteLastCol: () => void;
  onClose: () => void;
}

export function TableEditorPanel({
  anchorEl, rows,
  onCellChange, onAddRow, onAddCol,
  onDeleteRow, onDeleteLastRow, onDeleteLastCol,
  onClose,
}: TableEditorPanelProps) {
  const top = Math.min(
    anchorEl.top - window.scrollY + 8,
    window.innerHeight - 360,
  );
  const left = Math.max(8, Math.min(anchorEl.left, window.innerWidth - 540));

  const smallBtn = (label: React.ReactNode, onClick: () => void, title?: string): React.CSSProperties => ({});

  return (
    <div
      style={{
        position: "fixed",
        top,
        left,
        zIndex: 10000,
        width: 520,
        background: "var(--bg-menu, #1a1730)",
        border: `1px solid color-mix(in srgb, ${PRIMARY} 35%, transparent)`,
        borderRadius: 10,
        boxShadow: `0 12px 40px color-mix(in srgb, ${PRIMARY} 20%, black)`,
        backdropFilter: "blur(10px)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "7px 12px",
          borderBottom: "1px solid color-mix(in srgb, var(--foreground) 8%, transparent)",
        }}
      >
        <span
          style={{
            fontSize: 10,
            ...mono,
            color: `color-mix(in srgb, ${PRIMARY} 70%, transparent)`,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          Editor de tabla
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { label: "+col", title: "Añadir columna", onClick: onAddCol },
            { label: "+fila", title: "Añadir fila",    onClick: onAddRow },
          ].map(({ label, title, onClick }) => (
            <button
              key={label}
              type="button"
              title={title}
              onClick={onClick}
              style={{
                fontSize: 10,
                ...mono,
                background: `color-mix(in srgb, ${PRIMARY} 12%, transparent)`,
                border: `1px solid color-mix(in srgb, ${PRIMARY} 25%, transparent)`,
                borderRadius: 4,
                color: PRIMARY,
                padding: "2px 7px",
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "color-mix(in srgb, var(--foreground) 35%, transparent)",
              padding: 2,
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div style={{ padding: "10px", overflowX: "auto", maxHeight: 300, overflowY: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ padding: 2 }}>
                    <input
                      type="text"
                      value={cell}
                      onChange={e => onCellChange(ri, ci, e.target.value)}
                      style={{
                        width: "100%",
                        minWidth: 80,
                        background: ri === 0
                          ? `color-mix(in srgb, ${PRIMARY} 10%, transparent)`
                          : "color-mix(in srgb, var(--foreground) 4%, transparent)",
                        border: `1px solid color-mix(in srgb, var(--foreground) ${ri === 0 ? 15 : 8}%, transparent)`,
                        borderRadius: 4,
                        padding: "4px 7px",
                        fontSize: 12,
                        fontFamily: ri === 0 ? "var(--font-mono)" : "inherit",
                        fontWeight: ri === 0 ? 700 : 400,
                        color: "color-mix(in srgb, var(--foreground) 85%, transparent)",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                      onFocus={e => {
                        e.target.style.borderColor = `color-mix(in srgb, ${PRIMARY} 60%, transparent)`;
                      }}
                      onBlur={e => { e.target.style.borderColor = ""; }}
                    />
                  </td>
                ))}
                <td style={{ padding: "2px 0 2px 4px" }}>
                  <button
                    type="button"
                    title={ri === 0 ? "Fila de encabezado (no eliminable)" : "Eliminar fila"}
                    disabled={ri === 0}
                    onClick={() => onDeleteRow(ri)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: ri === 0 ? "default" : "pointer",
                      opacity: ri === 0 ? 0.15 : 0.4,
                      color: "var(--foreground)",
                      padding: "2px 3px",
                      fontSize: 12,
                      lineHeight: 1,
                      borderRadius: 3,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <X size={11} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          padding: "6px 12px",
          borderTop: "1px solid color-mix(in srgb, var(--foreground) 6%, transparent)",
          gap: 6,
        }}
      >
        {[
          { label: "−col",  title: "Eliminar última columna", onClick: onDeleteLastCol },
          { label: "−fila", title: "Eliminar última fila",    onClick: onDeleteLastRow },
        ].map(({ label, title, onClick }) => (
          <button
            key={label}
            type="button"
            title={title}
            onClick={onClick}
            style={{
              fontSize: 10,
              ...mono,
              background: "transparent",
              border: "1px solid color-mix(in srgb, var(--foreground) 12%, transparent)",
              borderRadius: 4,
              color: "color-mix(in srgb, var(--foreground) 40%, transparent)",
              padding: "2px 7px",
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}