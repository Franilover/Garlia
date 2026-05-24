
import React, { useState } from "react";
import { MarkdownEditor } from "./MarkdownEditor";
import { MarkdownPreview } from "./MarkdownPreview";

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
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const hasContent = value?.trim().length > 0;
  const showPreview = tab === "preview" && (!hidePreviewIfEmpty || hasContent);

  return (
    <div className={`flex flex-col ${className}`} style={{ gap: 0 }}>
      {/* ── Header: label + tabs ── */}
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
        {/* Tabs edit / preview */}
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
              onClick={() => setTab(t)}
              style={{
                padding: "2px 8px",
                fontSize: "0.6rem",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                border: "none",
                cursor: "pointer",
                background: tab === t
                  ? "color-mix(in srgb, var(--foreground) 10%, transparent)"
                  : "transparent",
                color: tab === t
                  ? "color-mix(in srgb, var(--foreground) 70%, transparent)"
                  : "color-mix(in srgb, var(--foreground) 25%, transparent)",
                transition: "background 0.1s, color 0.1s",
              }}
            >
              {t === "edit" ? "editar" : "vista"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenido ── */}
      <div style={{
        border: "1px solid color-mix(in srgb, var(--foreground) 8%, transparent)",
        borderRadius: 6,
        overflow: "hidden",
        background: "color-mix(in srgb, var(--bg-menu, #1a1730) 40%, transparent)",
      }}>
        {tab === "edit" ? (
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
    </div>
  );
}