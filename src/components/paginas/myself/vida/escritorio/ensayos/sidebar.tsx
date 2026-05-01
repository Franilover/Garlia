"use client";
import React, { useState } from "react";
import { Hash, FileText, Plus, Trash2, BookOpen, Search, RefreshCw, Link, CheckCircle2, ChevronRight, Folder } from "lucide-react";
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

  return (
    <aside
      className={`flex flex-col h-full overflow-hidden ${embedded ? "" : "border-r"}`}
      style={{
        background: "var(--sidebar-bg, #0f0f0f)",
        color: "var(--sidebar-text, #a0a0a0)",
        borderColor: "rgba(255,255,255,0.06)",
        fontFamily: "var(--font-mono)",
      }}
    >
      {/* ── Search bar ── */}
      <div
        className="relative shrink-0 px-3 pt-3 pb-2"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <Search
          size={11}
          className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "rgba(255,255,255,0.2)", marginTop: 4 }}
        />
        <input
          type="text"
          placeholder="/ buscar..."
          value={searchTerm}
          onChange={e => onSearchChange(e.target.value)}
          className="w-full outline-none"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 6,
            padding: "6px 10px 6px 28px",
            fontSize: 11,
            color: "rgba(255,255,255,0.6)",
            fontFamily: "var(--font-mono)",
          }}
        />
      </div>

      {/* ── Tags ── */}
      <div
        className="shrink-0 px-3 py-2"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-1.5 mb-2">
          <Hash size={9} style={{ color: "rgba(255,255,255,0.2)" }} />
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
            etiquetas
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
              borderColor: !tagActivo ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.1)",
              background: !tagActivo ? "rgba(255,255,255,0.08)" : "transparent",
              color: !tagActivo ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)",
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
                  borderColor: isActive ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.1)",
                  background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                  color: isActive ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)",
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
      </div>

      {/* ── Notes list ── */}
      <div className="flex-1 flex flex-col min-h-0">
        <div
          className="shrink-0 px-3 py-2 flex items-center justify-between"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-1.5">
            <FileText size={9} style={{ color: "rgba(255,255,255,0.2)" }} />
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
              notas · {ensayosFiltrados.length}
            </span>
          </div>
          <button
            onClick={onCrearEnsayo}
            title="Nueva nota (N)"
            style={{
              width: 20,
              height: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 4,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "transparent",
              color: "rgba(255,255,255,0.4)",
              cursor: "pointer",
            }}
          >
            <Plus size={11} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <AnimatePresence>
            {ensayosFiltrados.map(ens => {
              const isActive = ensayoActivoId === ens.id;
              const isHovered = hoveredId === ens.id;
              return (
                <motion.div
                  key={ens.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="group relative"
                  onClick={() => onEnsayoClick(ens.id)}
                  onMouseEnter={() => setHoveredId(ens.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    padding: "7px 12px",
                    cursor: "pointer",
                    background: isActive
                      ? "rgba(255,255,255,0.07)"
                      : isHovered
                      ? "rgba(255,255,255,0.03)"
                      : "transparent",
                    borderLeft: `2px solid ${isActive ? "rgba(255,255,255,0.5)" : "transparent"}`,
                    transition: "all 0.1s",
                  }}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <div
                      style={{
                        position: "absolute",
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: 2,
                        background: "rgba(255,255,255,0.15)",
                      }}
                    />
                  )}

                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p
                        style={{
                          fontSize: 12,
                          color: isActive ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)",
                          fontFamily: "var(--font-mono)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          letterSpacing: "0.01em",
                          fontWeight: isActive ? 500 : 400,
                        }}
                      >
                        {ens.titulo || "sin título"}
                      </p>
                      {ens.tags?.length > 0 && (
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          {ens.tags.slice(0, 3).map((tag: string) => (
                            <span
                              key={tag}
                              style={{
                                fontSize: 9,
                                color: "rgba(255,255,255,0.2)",
                                fontFamily: "var(--font-mono)",
                              }}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); onEliminarEnsayo(ens.id); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      style={{
                        color: "rgba(255,80,80,0.6)",
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
      </div>

      {/* ── Zotero ── */}
      <div
        className="shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <button
          onClick={() => setZoteroExpanded(p => !p)}
          className="w-full flex items-center justify-between px-3 py-2"
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          <div className="flex items-center gap-1.5">
            <BookOpen size={9} style={{ color: "rgba(255,255,255,0.2)" }} />
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
              zotero
            </span>
            {sources.length > 0 && (
              <span
                style={{
                  fontSize: 9,
                  padding: "0 5px",
                  borderRadius: 3,
                  background: "rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.3)",
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
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.2)", padding: 2 }}
              >
                <RefreshCw size={9} />
              </button>
            )}
            <ChevronRight
              size={10}
              style={{
                color: "rgba(255,255,255,0.2)",
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
                      background: "rgba(50,200,100,0.08)",
                      border: "1px solid rgba(50,200,100,0.15)",
                      borderRadius: 5,
                    }}
                  >
                    <CheckCircle2 size={9} style={{ color: "rgba(50,200,100,0.8)", flexShrink: 0 }} />
                    <span style={{ fontSize: 9, color: "rgba(50,200,100,0.8)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      conectado · auto-sync
                    </span>
                    <button
                      onClick={onConnectZotero}
                      style={{ marginLeft: "auto", fontSize: 9, color: "rgba(255,255,255,0.2)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-mono)" }}
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
                      background: "rgba(255,255,255,0.03)",
                      border: "1px dashed rgba(255,255,255,0.1)",
                      borderRadius: 5,
                      color: "rgba(255,255,255,0.3)",
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
                          background: "rgba(255,255,255,0.02)",
                        }}
                      >
                        <p
                          style={{
                            fontSize: 10,
                            color: "rgba(255,255,255,0.45)",
                            fontFamily: "var(--font-mono)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {src.title}
                        </p>
                        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-mono)" }}>
                          {src.author}{src.year ? ` · ${src.year}` : ""}{src.citekey ? ` · @${src.citekey}` : ""}
                        </p>
                      </div>
                    ))}
                    {sources.length > 8 && (
                      <p style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", textAlign: "center", padding: "4px 0", fontFamily: "var(--font-mono)" }}>
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

      {/* ── Keyboard hint ── */}
      <div
        className="shrink-0 px-3 py-2 flex items-center gap-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
      >
        {[["N", "nueva"], ["⌘E", "modo"], ["Esc", "cerrar"]].map(([key, label]) => (
          <div key={key} className="flex items-center gap-1">
            <kbd
              style={{
                fontSize: 8,
                padding: "1px 4px",
                borderRadius: 3,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.3)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {key}
            </kbd>
            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.15)", fontFamily: "var(--font-mono)" }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}