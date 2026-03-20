"use client";
import React, { useMemo } from "react";
import { X, Hash, FileText, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TagGraph } from "./TagGraph";

interface TagPanelProps {
  tag: string | null;
  ensayos: any[];
  onClose: () => void;
  onSelectEnsayo: (id: string) => void;
  onTagClick: (tag: string) => void;
}

export function TagPanel({ tag, ensayos, onClose, onSelectEnsayo, onTagClick }: TagPanelProps) {
  const ensayosConTag = useMemo(
    () => ensayos.filter(e => e.tags?.includes(tag)),
    [ensayos, tag]
  );

  const relatedTags = useMemo(() => {
    const counts = new Map<string, number>();
    ensayosConTag.forEach(e => {
      e.tags?.forEach((t: string) => {
        if (t !== tag) counts.set(t, (counts.get(t) || 0) + 1);
      });
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [ensayosConTag, tag]);

  return (
    <AnimatePresence>
      {tag && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10"
            style={{ background: "rgba(0,0,0,0.15)", backdropFilter: "blur(1px)" }}
            onClick={onClose}
          />

          <motion.div
            key="panel"
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="absolute top-0 right-0 h-full z-20 flex flex-col overflow-hidden"
            style={{
              width: "min(480px, 90%)",
              background: "var(--white-custom)",
              borderLeft: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
              boxShadow: "-8px 0 32px color-mix(in srgb, var(--primary) 8%, transparent)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 shrink-0"
              style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}
            >
              <div className="flex items-center gap-2">
                <Hash size={13} style={{ color: "var(--accent)" }} />
                <span className="font-mono text-[11px] uppercase tracking-[0.25em]"
                  style={{ color: "var(--primary)" }}
                >
                  {tag}
                </span>
                <span
                  className="font-mono text-[9px] px-2 py-0.5"
                  style={{
                    background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                    color: "var(--accent)",
                    borderRadius: "var(--radius-btn)",
                    border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
                  }}
                >
                  {ensayosConTag.length}
                </span>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center transition-all"
                style={{
                  color: "color-mix(in srgb, var(--primary) 35%, transparent)",
                  borderRadius: "50%",
                  border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.color = "var(--primary)";
                  (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 6%, transparent)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--primary) 35%, transparent)";
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                <X size={13} />
              </button>
            </div>

            {/* Contenido scrolleable */}
            <div
              className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5"
              style={{ scrollbarWidth: "thin", scrollbarColor: "color-mix(in srgb, var(--primary) 10%, transparent) transparent" }}
            >
              {/* Grafo */}
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.25em] mb-3"
                  style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
                >
                  Grafo de conexiones
                </p>
                <div style={{
                  background: "color-mix(in srgb, var(--primary) 2%, var(--bg-main))",
                  border: "1px solid color-mix(in srgb, var(--primary) 6%, transparent)",
                  borderRadius: "var(--radius-card)",
                  overflow: "hidden",
                }}>
                  <TagGraph ensayos={ensayos} tagActivo={tag} onTagClick={onTagClick} />
                </div>
              </div>

              {/* Tags relacionados */}
              {relatedTags.length > 0 && (
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.25em] mb-2.5"
                    style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
                  >
                    Tags relacionados
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {relatedTags.map(([t, count]) => (
                      <button
                        key={t}
                        onClick={() => onTagClick(t)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wide transition-all"
                        style={{
                          background: "color-mix(in srgb, var(--primary) 5%, transparent)",
                          color: "color-mix(in srgb, var(--primary) 50%, transparent)",
                          border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
                          borderRadius: "var(--radius-btn)",
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--accent) 10%, transparent)";
                          (e.currentTarget as HTMLElement).style.color = "var(--accent)";
                          (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--accent) 30%, transparent)";
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 5%, transparent)";
                          (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--primary) 50%, transparent)";
                          (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--primary) 8%, transparent)";
                        }}
                      >
                        #{t}
                        <span style={{
                          background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                          borderRadius: "9999px",
                          padding: "0 5px",
                          fontSize: "8px",
                        }}>
                          {count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Lista de ensayos */}
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.25em] mb-2.5"
                  style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
                >
                  <FileText size={9} className="inline mr-1.5" />
                  {ensayosConTag.length} nota{ensayosConTag.length !== 1 ? "s" : ""}
                </p>
                <div className="flex flex-col gap-2">
                  {ensayosConTag.map((ens, i) => (
                    <motion.button
                      key={ens.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => { onSelectEnsayo(ens.id); onClose(); }}
                      className="group text-left px-4 py-3 transition-all"
                      style={{
                        background: "color-mix(in srgb, var(--primary) 3%, transparent)",
                        border: "1px solid color-mix(in srgb, var(--primary) 7%, transparent)",
                        borderRadius: "var(--radius-btn)",
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--accent) 35%, transparent)";
                        (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--accent) 5%, transparent)";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--primary) 7%, transparent)";
                        (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 3%, transparent)";
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-serif italic text-[13px] truncate"
                          style={{ color: "color-mix(in srgb, var(--primary) 80%, transparent)" }}
                        >
                          {ens.titulo || "Sin título"}
                        </p>
                        <ArrowRight size={12} className="shrink-0 transition-transform group-hover:translate-x-0.5"
                          style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}
                        />
                      </div>
                      {ens.tags?.filter((t: string) => t !== tag).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {ens.tags.filter((t: string) => t !== tag).map((t: string) => (
                            <span key={t} className="font-mono text-[8px] uppercase"
                              style={{ color: "var(--accent)", opacity: 0.7 }}
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="font-mono text-[8px] mt-1.5"
                        style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}
                      >
                        {new Date(ens.updated_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default TagPanel;