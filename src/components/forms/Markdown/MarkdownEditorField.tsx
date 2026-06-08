"use client";

/**
 * MarkdownEditorField
 * ──────────────────────────────────────────────────────────────────────────────
 * Wrapper compacto para EditorPersonaje, EditorCriatura, EditorReino, etc.
 *
 * Comportamiento responsive basado en el ancho del propio contenedor:
 *   ≥ 480px  → usa MarkdownEditor con toolbar (split por defecto,
 *               botones: lápiz | split | ojo)
 *   < 480px  → tabs manuales "editar / vista" encima del área,
 *               sin columnas divididas
 */

import React, { useState, useRef, useEffect } from "react";
import { MarkdownEditor } from "./MarkdownEditor";
import { MarkdownPreview } from "./MarkdownPreview";

const SPLIT_MIN_WIDTH = 480;

export interface MarkdownEditorFieldProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  label?: string;
  previewMinHeight?: string;
  hidePreviewIfEmpty?: boolean;
  entities?: string[];
}

export function MarkdownEditorField({
  value,
  onChange,
  placeholder,
  rows = 5,
  className = "",
  label,
  previewMinHeight = "2rem",
  hidePreviewIfEmpty = true,
  entities = [],
}: MarkdownEditorFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isWide, setIsWide] = useState(true); // optimista: asumimos ancho
  const [narrowTab, setNarrowTab] = useState<"edit" | "preview">("edit");

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width ?? el.offsetWidth;
      setIsWide(w >= SPLIT_MIN_WIDTH);
    });
    ro.observe(el);
    setIsWide(el.offsetWidth >= SPLIT_MIN_WIDTH);
    return () => ro.disconnect();
  }, []);

  const hasContent = value?.trim().length > 0;
  const showPreview = narrowTab === "preview" && (!hidePreviewIfEmpty || hasContent);

  return (
    <div ref={containerRef} className={`flex flex-col ${className}`} style={{ gap: 0 }}>

      {/* ── Header: label + tabs (solo en modo estrecho) ── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "0.2rem",
      }}>
        {label && (
          <span style={{
            fontSize: "0.65rem",
            fontWeight: 800,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "color-mix(in srgb, var(--foreground) 40%, transparent)",
          }}>
            {label}
          </span>
        )}

        {/* Tabs manuales solo cuando es estrecho */}
        {!isWide && (
          <div style={{
            display: "flex",
            alignItems: "center",
            background: "color-mix(in srgb, var(--foreground) 4%, transparent)",
            border: "1px solid color-mix(in srgb, var(--foreground) 8%, transparent)",
            borderRadius: 4,
            overflow: "hidden",
            marginLeft: "auto",
            flexShrink: 0,
          }}>
            {(["edit", "preview"] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setNarrowTab(t)}
                style={{
                  padding: "2px 8px",
                  fontSize: "0.6rem",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  border: "none",
                  cursor: "pointer",
                  background: narrowTab === t
                    ? "color-mix(in srgb, var(--foreground) 10%, transparent)"
                    : "transparent",
                  color: narrowTab === t
                    ? "color-mix(in srgb, var(--foreground) 70%, transparent)"
                    : "color-mix(in srgb, var(--foreground) 25%, transparent)",
                  transition: "background 0.1s, color 0.1s",
                }}
              >
                {t === "edit" ? "editar" : "vista"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Contenido ── */}
      {isWide ? (
        /* Ancho suficiente: MarkdownEditor con toolbar nativo (split por defecto) */
        <MarkdownEditor
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          defaultMode="split"
          toolbar
          entities={entities}
        />
      ) : (
        /* Estrecho: tabs manuales, sin split */
        <div style={{
          border: "1px solid color-mix(in srgb, var(--foreground) 8%, transparent)",
          borderRadius: 6,
          overflow: "hidden",
          background: "color-mix(in srgb, var(--bg-menu, #1a1730) 40%, transparent)",
        }}>
          {narrowTab === "edit" ? (
            <MarkdownEditor
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              rows={rows}
              defaultMode="edit"
              toolbar={false}
              entities={entities}
            />
          ) : (
            <div style={{ padding: "6px 10px", minHeight: previewMinHeight }}>
              <MarkdownPreview
                value={value}
                placeholder={placeholder}
                minHeight={previewMinHeight}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}