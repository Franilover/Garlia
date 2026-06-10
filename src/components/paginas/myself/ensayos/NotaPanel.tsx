"use client";
import React, { useState, useMemo } from "react";
import { Tag, Hash, AtSign, FileText, ChevronRight, X, Plus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

// ── Tipos ──────────────────────────────────────────────────────────────────────
type NotaPanelTab = "indice" | "tags" | "menciones";

export interface TocEntry {
  level: number;
  text: string;
  id: string;
}

export interface NotaPanelProps {
  ensayo: any;
  ensayos: any[];
  tocEntries: TocEntry[];
  onUpdateField: (id: string, field: string, value: any) => void;
  onNavigateToPage: (name: string) => void;
  onTagClick?: (t: string) => void;
}

// ── Tab button ─────────────────────────────────────────────────────────────────
function TabBtn({
  id,
  label,
  icon: Icon,
  active,
  count,
  onClick,
  mono,
}: {
  id: NotaPanelTab;
  label: string;
  icon: React.ElementType;
  active: boolean;
  count?: number;
  onClick: () => void;
  mono: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "5px 10px",
        borderRadius: 5,
        border: "none",
        background: active
          ? "color-mix(in srgb, var(--foreground) 6%, transparent)"
          : "transparent",
        color: active
          ? "color-mix(in srgb, var(--foreground) 65%, transparent)"
          : "color-mix(in srgb, var(--foreground) 28%, transparent)",
        cursor: "pointer",
        transition: "all 0.12s",
        ...mono,
        fontSize: 8,
        textTransform: "lowercase",
        letterSpacing: "0.04em",
        flexShrink: 0,
        whiteSpace: "nowrap",
      }}
    >
      <Icon
        size={8}
        strokeWidth={active ? 2.2 : 1.8}
        style={{ flexShrink: 0 }}
      />
      {label}
      {count !== undefined && count > 0 && (
        <span style={{
          ...mono,
          fontSize: 7,
          padding: "0px 5px",
          borderRadius: 99,
          background: active
            ? "color-mix(in srgb, var(--accent) 14%, transparent)"
            : "color-mix(in srgb, var(--foreground) 8%, transparent)",
          color: active
            ? "color-mix(in srgb, var(--accent) 80%, transparent)"
            : "color-mix(in srgb, var(--foreground) 35%, transparent)",
          transition: "all 0.12s",
        }}>
          {count}
        </span>
      )}
    </button>
  );
}

// ── Sección Índice ─────────────────────────────────────────────────────────────
function SeccionIndice({
  entries,
  mono,
}: {
  entries: TocEntry[];
  mono: React.CSSProperties;
}) {
  if (entries.length === 0) {
    return (
      <div style={{
        padding: "20px 16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
      }}>
        <FileText
          size={18}
          style={{ color: "color-mix(in srgb, var(--foreground) 12%, transparent)" }}
          strokeWidth={1.2}
        />
        <span style={{
          ...mono,
          fontSize: 9,
          color: "color-mix(in srgb, var(--foreground) 22%, transparent)",
          fontStyle: "italic",
          textAlign: "center",
          lineHeight: 1.5,
        }}>
          sin encabezados todavía
        </span>
      </div>
    );
  }

  return (
    <nav style={{ display: "flex", flexDirection: "column", gap: 0, padding: "4px 0" }}>
      {entries.map((entry, i) => (
        <a
          key={i}
          href={`#${entry.id}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            paddingLeft: `${8 + (entry.level - 1) * 10}px`,
            paddingRight: 8,
            paddingTop: 4,
            paddingBottom: 4,
            fontSize: entry.level === 1 ? 11 : entry.level === 2 ? 10 : 9,
            fontFamily: entry.level === 1 ? "var(--font-serif)" : "var(--font-mono)",
            fontStyle: entry.level === 1 ? "italic" : "normal",
            fontWeight: entry.level <= 2 ? 500 : 400,
            color: entry.level === 1
              ? "color-mix(in srgb, var(--foreground) 72%, transparent)"
              : entry.level === 2
              ? "color-mix(in srgb, var(--foreground) 50%, transparent)"
              : "color-mix(in srgb, var(--foreground) 32%, transparent)",
            textDecoration: "none",
            borderRadius: 3,
            transition: "all 0.1s",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            marginLeft: 4,
            marginRight: 4,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background =
              "color-mix(in srgb, var(--foreground) 5%, transparent)";
            (e.currentTarget as HTMLElement).style.color =
              "color-mix(in srgb, var(--foreground) 80%, transparent)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = entry.level === 1
              ? "color-mix(in srgb, var(--foreground) 72%, transparent)"
              : entry.level === 2
              ? "color-mix(in srgb, var(--foreground) 50%, transparent)"
              : "color-mix(in srgb, var(--foreground) 32%, transparent)";
          }}
        >
          {entry.level > 1 && (
            <ChevronRight
              size={7}
              strokeWidth={1.6}
              style={{
                flexShrink: 0,
                opacity: 0.4,
                marginLeft: `${(entry.level - 2) * 4}px`,
              }}
            />
          )}
          {entry.text}
        </a>
      ))}
    </nav>
  );
}

// ── Sección Tags ───────────────────────────────────────────────────────────────
function SeccionTags({
  ensayo,
  ensayos,
  onUpdateField,
  onTagClick,
  mono,
}: {
  ensayo: any;
  ensayos: any[];
  onUpdateField: (id: string, field: string, value: any) => void;
  onTagClick?: (t: string) => void;
  mono: React.CSSProperties;
}) {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);

  const tags: string[] = ensayo.tags ?? [];

  const allTags = useMemo(() => {
    const set = new Set<string>();
    ensayos.forEach((e: any) => e.tags?.forEach((t: string) => set.add(t)));
    tags.forEach(t => set.delete(t));
    return Array.from(set).sort();
  }, [ensayos, tags]);

  const suggestions = useMemo(() => {
    if (!input.trim()) return [];
    const q = input.trim().toLowerCase();
    return allTags.filter(t => t.toLowerCase().includes(q)).slice(0, 6);
  }, [input, allTags]);

  const addTag = (t: string) => {
    const val = t.trim().toLowerCase();
    if (val && !tags.includes(val)) {
      onUpdateField(ensayo.id, "tags", [...tags, val]);
    }
    setInput("");
  };

  const removeTag = (t: string) => {
    onUpdateField(ensayo.id, "tags", tags.filter(x => x !== t));
  };

  return (
    <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {tags.length === 0 && !focused && (
          <span style={{
            ...mono,
            fontSize: 9,
            color: "color-mix(in srgb, var(--foreground) 22%, transparent)",
            fontStyle: "italic",
          }}>
            sin etiquetas
          </span>
        )}
        {tags.map(t => (
          <span
            key={t}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0,
              ...mono,
              fontSize: 9,
              borderRadius: 3,
              background: "color-mix(in srgb, var(--accent) 9%, transparent)",
              border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => onTagClick?.(t)}
              style={{
                background: "none",
                border: "none",
                cursor: onTagClick ? "pointer" : "default",
                padding: "2px 4px 2px 7px",
                color: "color-mix(in srgb, var(--accent) 75%, transparent)",
                ...mono,
                fontSize: 9,
                transition: "color 0.1s, background 0.1s",
              }}
              onMouseEnter={e => {
                if (!onTagClick) return;
                (e.currentTarget as HTMLElement).style.background =
                  "color-mix(in srgb, var(--accent) 16%, transparent)";
                (e.currentTarget as HTMLElement).style.color = "var(--accent)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "none";
                (e.currentTarget as HTMLElement).style.color =
                  "color-mix(in srgb, var(--accent) 75%, transparent)";
              }}
            >
              #{t}
            </button>
            <button
              onClick={() => removeTag(t)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "2px 5px 2px 2px",
                color: "color-mix(in srgb, var(--accent) 35%, transparent)",
                fontSize: 10,
                lineHeight: 1,
                display: "flex",
                alignItems: "center",
                transition: "color 0.1s",
              }}
              onMouseEnter={e =>
                (e.currentTarget as HTMLElement).style.color =
                  "color-mix(in srgb, var(--accent) 75%, transparent)"
              }
              onMouseLeave={e =>
                (e.currentTarget as HTMLElement).style.color =
                  "color-mix(in srgb, var(--accent) 35%, transparent)"
              }
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {/* Input nuevo tag */}
      <div style={{ position: "relative" }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 8px",
          borderRadius: 5,
          border: `1px ${focused ? "solid" : "dashed"} ${
            focused
              ? "color-mix(in srgb, var(--foreground) 16%, transparent)"
              : "color-mix(in srgb, var(--foreground) 10%, transparent)"
          }`,
          background: focused
            ? "color-mix(in srgb, var(--foreground) 3%, transparent)"
            : "transparent",
          transition: "all 0.1s",
        }}>
          <Plus
            size={8}
            style={{ color: "color-mix(in srgb, var(--foreground) 22%, transparent)", flexShrink: 0 }}
          />
          <input
            type="text"
            value={input}
            placeholder="añadir etiqueta..."
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                if (input.trim()) addTag(input);
              }
              if (e.key === "Escape") {
                setInput("");
                setFocused(false);
              }
            }}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              ...mono,
              fontSize: 9,
              color: "color-mix(in srgb, var(--foreground) 65%, transparent)",
            }}
          />
        </div>

        <AnimatePresence>
          {focused && suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.1 }}
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                background: "var(--bg-menu)",
                border: "1px solid color-mix(in srgb, var(--foreground) 10%, transparent)",
                borderRadius: 5,
                padding: 3,
                display: "flex",
                flexDirection: "column",
                gap: 1,
                zIndex: 50,
                boxShadow: "0 4px 16px color-mix(in srgb, var(--bg-main) 50%, transparent)",
              }}
            >
              {suggestions.map(t => (
                <button
                  key={t}
                  onMouseDown={() => addTag(t)}
                  style={{
                    ...mono,
                    fontSize: 9,
                    color: "color-mix(in srgb, var(--foreground) 60%, transparent)",
                    background: "transparent",
                    border: "none",
                    borderRadius: 3,
                    padding: "3px 8px",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background =
                      "color-mix(in srgb, var(--accent) 10%, transparent)";
                    (e.currentTarget as HTMLElement).style.color =
                      "color-mix(in srgb, var(--accent) 85%, transparent)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color =
                      "color-mix(in srgb, var(--foreground) 60%, transparent)";
                  }}
                >
                  #{t}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Sección Menciones ──────────────────────────────────────────────────────────
function SeccionMenciones({
  ensayo,
  ensayos,
  onNavigateToPage,
  mono,
}: {
  ensayo: any;
  ensayos: any[];
  onNavigateToPage: (name: string) => void;
  mono: React.CSSProperties;
}) {
  const backlinks = useMemo(() => {
    const titulo = ensayo.titulo?.trim().toLowerCase();
    if (!titulo) return [];
    return ensayos.filter((e: any) => {
      if (e.id === ensayo.id) return false;
      const contenido = (e.contenido || "").toLowerCase();
      const viaWikilink = contenido.includes(`[[${titulo}]]`);
      const viaTag = e.tags?.some((t: string) => t.toLowerCase() === titulo);
      return viaWikilink || viaTag;
    });
  }, [ensayos, ensayo.id, ensayo.titulo]);

  if (backlinks.length === 0) {
    return (
      <div style={{
        padding: "20px 16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
      }}>
        <AtSign
          size={18}
          style={{ color: "color-mix(in srgb, var(--foreground) 12%, transparent)" }}
          strokeWidth={1.2}
        />
        <span style={{
          ...mono,
          fontSize: 9,
          color: "color-mix(in srgb, var(--foreground) 22%, transparent)",
          fontStyle: "italic",
          textAlign: "center",
          lineHeight: 1.5,
        }}>
          ninguna nota menciona esta página
        </span>
      </div>
    );
  }

  return (
    <div style={{ padding: "6px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
      {backlinks.map((b: any) => {
        const titulo = ensayo.titulo?.trim().toLowerCase() ?? "";
        const contenido = (b.contenido || "").toLowerCase();
        const viaWikilink = contenido.includes(`[[${titulo}]]`);
        const viaTag = b.tags?.some((t: string) => t.toLowerCase() === titulo);
        return (
          <button
            key={b.id}
            onClick={() => onNavigateToPage(b.titulo)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: "1px solid color-mix(in srgb, var(--primary) 14%, transparent)",
              borderRadius: 5,
              cursor: "pointer",
              padding: "5px 9px 5px 7px",
              transition: "all 0.1s",
              textAlign: "left",
              width: "100%",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "color-mix(in srgb, var(--accent) 38%, transparent)";
              (e.currentTarget as HTMLElement).style.background =
                "color-mix(in srgb, var(--accent) 7%, transparent)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "color-mix(in srgb, var(--primary) 14%, transparent)";
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            <span style={{
              ...mono,
              fontSize: 8,
              color: "color-mix(in srgb, var(--accent) 60%, transparent)",
              flexShrink: 0,
            }}>
              {viaWikilink && viaTag ? "[[]]#" : viaWikilink ? "[[]]" : "#"}
            </span>
            <span style={{
              fontSize: 11,
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              color: "color-mix(in srgb, var(--foreground) 72%, transparent)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {b.titulo || "sin título"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export function NotaPanel({
  ensayo,
  ensayos,
  tocEntries,
  onUpdateField,
  onNavigateToPage,
  onTagClick,
}: NotaPanelProps) {
  const [tab, setTab] = useState<NotaPanelTab>("indice");

  const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };

  const tags: string[] = ensayo.tags ?? [];

  const backlinksCount = useMemo(() => {
    const titulo = ensayo.titulo?.trim().toLowerCase();
    if (!titulo) return 0;
    return ensayos.filter((e: any) => {
      if (e.id === ensayo.id) return false;
      const contenido = (e.contenido || "").toLowerCase();
      return (
        contenido.includes(`[[${titulo}]]`) ||
        e.tags?.some((t: string) => t.toLowerCase() === titulo)
      );
    }).length;
  }, [ensayos, ensayo.id, ensayo.titulo]);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      overflow: "hidden",
    }}>
      {/* ── Header con tabs ── */}
      <div style={{
        padding: "10px 8px 0",
        borderBottom: "1px solid color-mix(in srgb, var(--foreground) 6%, transparent)",
        display: "flex",
        gap: 2,
        flexShrink: 0,
        flexWrap: "wrap",
      }}>
        <TabBtn
          id="indice"
          label="índice"
          icon={Hash}
          active={tab === "indice"}
          count={tocEntries.length}
          onClick={() => setTab("indice")}
          mono={mono}
        />
        <TabBtn
          id="tags"
          label="etiquetas"
          icon={Tag}
          active={tab === "tags"}
          count={tags.length}
          onClick={() => setTab("tags")}
          mono={mono}
        />
        <TabBtn
          id="menciones"
          label="menciones"
          icon={AtSign}
          active={tab === "menciones"}
          count={backlinksCount}
          onClick={() => setTab("menciones")}
          mono={mono}
        />
      </div>

      {/* ── Contenido de la pestaña activa ── */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        scrollbarWidth: "none",
        paddingBottom: 12,
      }}>
        <AnimatePresence mode="wait">
          {tab === "indice" && (
            <motion.div
              key="indice"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
            >
              <SeccionIndice entries={tocEntries} mono={mono} />
            </motion.div>
          )}
          {tab === "tags" && (
            <motion.div
              key="tags"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
            >
              <SeccionTags
                ensayo={ensayo}
                ensayos={ensayos}
                onUpdateField={onUpdateField}
                onTagClick={onTagClick}
                mono={mono}
              />
            </motion.div>
          )}
          {tab === "menciones" && (
            <motion.div
              key="menciones"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
            >
              <SeccionMenciones
                ensayo={ensayo}
                ensayos={ensayos}
                onNavigateToPage={onNavigateToPage}
                mono={mono}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default NotaPanel;
