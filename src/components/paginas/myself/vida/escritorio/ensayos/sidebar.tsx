"use client";
import React, { useState, useMemo } from "react";
import { Hash, Trash2, BookOpen, RefreshCw, Link, CheckCircle2, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { ZoteroSource } from "@/components/paginas/myself/vida/escritorio/ensayos/page";

interface SidebarProps {
  ensayos: any[];
  ensayosFiltrados: any[];
  todosLosTags: string[];
  tagActivo: string | null;
  ensayoActivoId: string | null;
  searchTerm: string;
  sources: ZoteroSource[];
  zoteroConnected: boolean;
  onTagClick: (tag: string | null) => void;
  onEnsayoClick: (id: string) => void;
  onCrearEnsayo: () => void;
  onEliminarEnsayo: (id: string) => void;
  onSearchChange: (value: string) => void;
  onConnectZotero: () => void;
  onRefreshZotero: () => void;
  embedded?: boolean;
}

export default function Sidebar({
  ensayos,
  ensayosFiltrados,
  todosLosTags,
  tagActivo,
  ensayoActivoId,
  searchTerm,
  sources,
  zoteroConnected,
  onTagClick,
  onEnsayoClick,
  onCrearEnsayo,
  onEliminarEnsayo,
  onSearchChange,
  onConnectZotero,
  onRefreshZotero,
  embedded = false,
}: SidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [zoteroExpanded, setZoteroExpanded] = useState(false);
  const relatedTags = useMemo(() => {
    if (!tagActivo) return [];
    const ensayosConTag = ensayos.filter(e => e.tags?.includes(tagActivo));
    const counts = new Map<string, number>();
    ensayosConTag.forEach(e => {
      e.tags?.forEach((t: string) => {
        if (t !== tagActivo) counts.set(t, (counts.get(t) || 0) + 1);
      });
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [ensayos, tagActivo]);

  return (
    <aside
      className={`flex flex-col h-full overflow-hidden ${embedded ? "" : "border-r"}`}
      style={{
        background: "var(--sidebar-bg, var(--bg-menu))",
        color: "var(--sidebar-text, color-mix(in srgb, var(--foreground) 60%, transparent))",
        borderColor: "color-mix(in srgb, var(--foreground) 6%, transparent)",
        fontFamily: "var(--font-mono)",
      }}
    >
      {/* ── Tags ── */}
      <div
        className="shrink-0 px-3 py-2"
        style={{ borderBottom: "1px solid color-mix(in srgb, var(--foreground) 6%, transparent)" }}
      >
        <div className="flex items-center gap-1.5 mb-2">
          <Hash size={9} style={{ color: "color-mix(in srgb, var(--foreground) 20%, transparent)" }} />
          <span style={{ fontSize: 9, color: "color-mix(in srgb, var(--foreground) 20%, transparent)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
            etiquetas · páginas
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => onTagClick(null)}
            style={{
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 4,
              border: "1px solid",
              borderColor: !tagActivo ? "color-mix(in srgb, var(--foreground) 35%, transparent)" : "color-mix(in srgb, var(--foreground) 10%, transparent)",
              background: !tagActivo ? "color-mix(in srgb, var(--foreground) 8%, transparent)" : "transparent",
              color: !tagActivo ? "color-mix(in srgb, var(--foreground) 90%, transparent)" : "color-mix(in srgb, var(--foreground) 30%, transparent)",
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              transition: "all 0.1s",
            }}
          >
            all
          </button>
          {todosLosTags.map(tag => {
            const isActive = tagActivo === tag;
            return (
              <button
                key={tag}
                onClick={() => onTagClick(isActive ? null : tag)}
                style={{
                  fontSize: 10,
                  padding: "2px 8px",
                  borderRadius: 4,
                  border: "1px solid",
                  borderColor: isActive
                    ? "color-mix(in srgb, var(--foreground) 35%, transparent)"
                    : "color-mix(in srgb, var(--foreground) 10%, transparent)",
                  background: isActive
                    ? "color-mix(in srgb, var(--foreground) 8%, transparent)"
                    : "transparent",
                  color: isActive
                    ? "color-mix(in srgb, var(--foreground) 90%, transparent)"
                    : "color-mix(in srgb, var(--foreground) 30%, transparent)",
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                  transition: "all 0.1s",
                }}
              >
                #{tag}
              </button>
            );
          })}
        </div>

        {/* ── Related tags (shown when a tag is active) ── */}
        <AnimatePresence>
          {tagActivo && relatedTags.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              style={{ overflow: "hidden" }}
            >
              <div className="flex items-center gap-1.5 mt-3 mb-1.5">
                <span style={{ fontSize: 9, color: "color-mix(in srgb, var(--foreground) 15%, transparent)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  relacionados
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {relatedTags.map(([t, count]) => (
                  <button
                    key={t}
                    onClick={() => onTagClick(t)}
                    style={{
                      fontSize: 10,
                      padding: "2px 8px",
                      borderRadius: 4,
                      border: "1px solid color-mix(in srgb, var(--foreground) 8%, transparent)",
                      background: "transparent",
                      color: "color-mix(in srgb, var(--foreground) 25%, transparent)",
                      cursor: "pointer",
                      fontFamily: "var(--font-mono)",
                      transition: "all 0.1s",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    #{t}
                    <span style={{ fontSize: 8, opacity: 0.6 }}>{count}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Notes list ── */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        <AnimatePresence>
          {ensayosFiltrados.map(ens => {
            const isActive = ens.id === ensayoActivoId;
            return (
              <motion.div
                key={ens.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="relative group px-3 py-2.5"
                style={{
                  borderBottom: "1px solid color-mix(in srgb, var(--foreground) 4%, transparent)",
                  background: isActive
                    ? "color-mix(in srgb, var(--foreground) 5%, transparent)"
                    : hoveredId === ens.id
                    ? "color-mix(in srgb, var(--foreground) 2%, transparent)"
                    : "transparent",
                  borderLeft: `2px solid ${isActive ? "color-mix(in srgb, var(--foreground) 25%, transparent)" : "transparent"}`,
                  cursor: "pointer",
                  transition: "background 0.1s",
                }}
                onClick={() => onEnsayoClick(ens.id)}
                onMouseEnter={() => setHoveredId(ens.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <p
                  style={{
                    fontSize: 12,
                    color: isActive
                      ? "color-mix(in srgb, var(--foreground) 80%, transparent)"
                      : "color-mix(in srgb, var(--foreground) 50%, transparent)",
                    fontFamily: "var(--font-serif, serif)",
                    fontStyle: "italic",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    marginBottom: 2,
                  }}
                >
                  {ens.titulo || "Sin título"}
                </p>
                <p style={{ fontSize: 9, color: "color-mix(in srgb, var(--foreground) 20%, transparent)", fontFamily: "var(--font-mono)" }}>
                  {new Date(ens.updated_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                </p>
                <div
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={e => { e.stopPropagation(); onEliminarEnsayo(ens.id); }}
                  style={{ cursor: "pointer", padding: 4 }}
                >
                  <button
                    style={{
                      color: "color-mix(in srgb, var(--accent) 60%, transparent)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 2,
                    }}
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ── Zotero ── */}
      <div
        className="shrink-0"
        style={{ borderTop: "1px solid color-mix(in srgb, var(--foreground) 6%, transparent)" }}
      >
        <button
          onClick={() => setZoteroExpanded(p => !p)}
          className="w-full flex items-center justify-between px-3 py-2"
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          <div className="flex items-center gap-1.5">
            <BookOpen size={9} style={{ color: "color-mix(in srgb, var(--foreground) 20%, transparent)" }} />
            <span style={{ fontSize: 9, color: "color-mix(in srgb, var(--foreground) 20%, transparent)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
              zotero
            </span>
            {sources.length > 0 && (
              <span
                style={{
                  fontSize: 9,
                  padding: "0 5px",
                  borderRadius: 3,
                  background: "color-mix(in srgb, var(--foreground) 8%, transparent)",
                  color: "color-mix(in srgb, var(--foreground) 30%, transparent)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {sources.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {zoteroConnected && (
              <button
                onClick={e => { e.stopPropagation(); onRefreshZotero(); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "color-mix(in srgb, var(--foreground) 20%, transparent)", padding: 2 }}
              >
                <RefreshCw size={9} />
              </button>
            )}
            <ChevronRight
              size={10}
              style={{
                color: "color-mix(in srgb, var(--foreground) 20%, transparent)",
                transform: zoteroExpanded ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.15s",
              }}
            />
          </div>
        </button>

        <AnimatePresence>
          {zoteroExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: "hidden" }}
            >
              <div className="px-3 pb-3 flex flex-col gap-2">
                {zoteroConnected ? (
                  <div
                    className="flex items-center gap-2 px-2 py-1.5"
                    style={{
                      background: "color-mix(in srgb, var(--accent) 8%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--accent) 15%, transparent)",
                      borderRadius: 5,
                    }}
                  >
                    <CheckCircle2 size={9} style={{ color: "color-mix(in srgb, var(--accent) 80%, transparent)", flexShrink: 0 }} />
                    <span style={{ fontSize: 9, color: "color-mix(in srgb, var(--accent) 80%, transparent)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      conectado · auto-sync
                    </span>
                    <button
                      onClick={onConnectZotero}
                      style={{ marginLeft: "auto", fontSize: 9, color: "color-mix(in srgb, var(--foreground) 20%, transparent)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-mono)" }}
                    >
                      cambiar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={onConnectZotero}
                    className="flex items-center gap-2 w-full"
                    style={{
                      fontSize: 10,
                      padding: "8px 10px",
                      background: "color-mix(in srgb, var(--foreground) 3%, transparent)",
                      border: "1px dashed color-mix(in srgb, var(--foreground) 10%, transparent)",
                      borderRadius: 5,
                      color: "color-mix(in srgb, var(--foreground) 30%, transparent)",
                      cursor: "pointer",
                      fontFamily: "var(--font-mono)",
                      justifyContent: "center",
                    }}
                  >
                    <Link size={10} />
                    conectar archivo zotero
                  </button>
                )}

                {sources.length > 0 && (
                  <div
                    className="flex flex-col gap-0.5 max-h-28 overflow-y-auto"
                    style={{ scrollbarWidth: "none" }}
                  >
                    {sources.slice(0, 8).map((src, i) => (
                      <div
                        key={i}
                        style={{
                          padding: "4px 6px",
                          borderRadius: 4,
                          background: "color-mix(in srgb, var(--foreground) 2%, transparent)",
                        }}
                      >
                        <p
                          style={{
                            fontSize: 10,
                            color: "color-mix(in srgb, var(--foreground) 45%, transparent)",
                            fontFamily: "var(--font-mono)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {src.title}
                        </p>
                        <p style={{ fontSize: 9, color: "color-mix(in srgb, var(--foreground) 20%, transparent)", fontFamily: "var(--font-mono)" }}>
                          {src.author}{src.year ? ` · ${src.year}` : ""}{src.citekey ? ` · @${src.citekey}` : ""}
                        </p>
                      </div>
                    ))}
                    {sources.length > 8 && (
                      <p style={{ fontSize: 9, color: "color-mix(in srgb, var(--foreground) 15%, transparent)", textAlign: "center", padding: "4px 0", fontFamily: "var(--font-mono)" }}>
                        +{sources.length - 8} más
                      </p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </aside>
  );
}