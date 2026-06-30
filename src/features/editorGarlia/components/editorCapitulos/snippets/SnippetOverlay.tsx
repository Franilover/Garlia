"use client";
/**
 * SnippetOverlay.tsx
 * ──────────────────
 * Renderiza chips visuales sobre el textarea. Sin cambios de lógica —
 * solo reemplaza la copia local de KIND_DEFS por la de snippetDefs.ts.
 */
import React, { useState, useEffect, useCallback, useMemo } from "react";

import { KIND_DEFS, KIND_FALLBACK } from "./snippetDefs";
import type { SnippetKind } from "./snippetDefs";

interface SnippetToken {
  raw: string;
  kind: SnippetKind;
  parts: string[];
  index: number;
}

// ─── Parser ───────────────────────────────────────────────────────────────────

function parseTokens(raw: string): SnippetToken[] {
  const RE = /\[\[[\s\S]*?\]\]/g;
  const tokens: SnippetToken[] = [];
  let m: RegExpExecArray | null;
  while ((m = RE.exec(raw)) !== null) {
    const inner = m[0].slice(2, -2);
    const parts = inner.split("|");
    tokens.push({
      raw: m[0],
      kind: parts[0].trim() as SnippetKind,
      parts,
      index: m.index,
    });
  }
  return tokens;
}

// ─── Medición de posiciones ───────────────────────────────────────────────────

function measureTokenPositions(
  ta: HTMLTextAreaElement,
  tokens: SnippetToken[],
): Array<{ top: number; left: number; width: number; height: number }> {
  const cs = window.getComputedStyle(ta);
  const copyProps = [
    "fontFamily",
    "fontSize",
    "fontWeight",
    "lineHeight",
    "letterSpacing",
    "wordSpacing",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "boxSizing",
    "overflowWrap",
    "wordBreak",
    "whiteSpace",
  ] as const;

  const mirror = document.createElement("div");
  copyProps.forEach((p) => {
    (mirror.style as any)[p] = cs[p];
  });
  Object.assign(mirror.style, {
    position: "absolute",
    top: "0",
    left: "0",
    visibility: "hidden",
    pointerEvents: "none",
    zIndex: "-1",
    width: ta.clientWidth + "px",
    whiteSpace: "pre-wrap",
    overflow: "hidden",
  });
  ta.parentElement!.appendChild(mirror);

  const raw = ta.value;
  const results: Array<{
    top: number;
    left: number;
    width: number;
    height: number;
  }> = [];

  for (const token of tokens) {
    const before = raw.slice(0, token.index);
    mirror.innerHTML =
      escapeHtml(before) +
      `<span id="ts">\u200b</span>` +
      escapeHtml(token.raw) +
      `<span id="te">\u200b</span>`;
    mirror.scrollTop = ta.scrollTop;
    mirror.scrollLeft = ta.scrollLeft;

    const spanS = mirror.querySelector("#ts") as HTMLElement;
    const spanE = mirror.querySelector("#te") as HTMLElement;
    if (!spanS || !spanE) {
      results.push({ top: 0, left: 0, width: 0, height: 0 });
      continue;
    }

    const mRect = mirror.getBoundingClientRect();
    const sRect = spanS.getBoundingClientRect();
    const eRect = spanE.getBoundingClientRect();
    results.push({
      top: sRect.top - mRect.top,
      left: sRect.left - mRect.left,
      width: Math.max(0, eRect.left - sRect.left),
      height: parseFloat(cs.lineHeight) || 18,
    });
  }

  ta.parentElement!.removeChild(mirror);
  return results;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

function SnippetChip({
  token,
  pos,
  onDelete,
  onEdit,
  onReplace,
}: {
  token: SnippetToken;
  pos: { top: number; left: number; width: number; height: number };
  onDelete: (t: SnippetToken) => void;
  onEdit?: (raw: string, replace: (next: string) => void) => void;
  onReplace: (t: SnippetToken, next: string) => void;
}) {
  const def = KIND_DEFS[token.kind] ?? KIND_FALLBACK;
  const summary = def.summary(token.raw);
  const [hovered, setHovered] = useState(false);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onEdit?.(token.raw, (next) => onReplace(token, next));
    },
    [onEdit, onReplace, token],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(token);
    },
    [onDelete, token],
  );

  const bgHov = def.bg.replace(
    /[\d.]+\)$/,
    (m) => String(Math.min(parseFloat(m) * 2.2, 0.35)) + ")",
  );

  return (
    <div
      style={{
        position: "absolute",
        top: pos.top,
        left: pos.left,
        height: pos.height || 20,
        width: "fit-content",
        maxWidth: 240,
      }}
    >
      {/* Fondo que tapa el raw text. Al ser inset:0 dentro de un wrapper
          fit-content, siempre coincide exactamente con el tamaño real del
          chip — sin medir nada ni depender de un frame extra de timing. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          // Si el chip terminara siendo más angosto que el raw text
          // original (texto corto + summary largo truncado), igual
          // garantizamos cubrir como mínimo el ancho medido del raw.
          minWidth: pos.width || 4,
          background: "var(--editor-bg, var(--bg-menu, var(--background)))",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      <div
        style={{
          position: "relative",
          height: "100%",
          width: "fit-content",
          maxWidth: 240,
          pointerEvents: "all",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "0 6px 0 5px",
          borderRadius: 999,
          background: hovered
            ? "color-mix(in srgb, var(--color-primary, var(--primary)) 18%, transparent)"
            : "color-mix(in srgb, var(--color-primary, var(--primary)) 9%, transparent)",
          border:
            "1px solid color-mix(in srgb, var(--color-primary, var(--primary)) 28%, transparent)",
          color: "var(--color-primary, var(--primary))",
          fontSize: 10,
          fontWeight: 700,
          fontFamily: "var(--font-sans,system-ui)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          cursor: onEdit ? "pointer" : "default",
          userSelect: "none",
          transition: "background .12s, box-shadow .12s",
          boxShadow: hovered
            ? "0 2px 10px color-mix(in srgb, var(--color-primary, var(--primary)) 30%, transparent)"
            : "none",
          zIndex: 2,
        }}
        title={onEdit ? `Editar ${def.label}` : def.label}
        onClick={onEdit ? handleClick : undefined}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <span
          style={{
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: "var(--color-primary, var(--primary))",
            opacity: 0.7,
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 9, lineHeight: 1, flexShrink: 0 }}>
          {def.icon}
        </span>
        <span
          style={{
            opacity: 0.7,
            fontSize: 9,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: ".07em",
          }}
        >
          {def.label}
        </span>
        {summary && (
          <span
            style={{
              maxWidth: 120,
              overflow: "hidden",
              textOverflow: "ellipsis",
              opacity: 0.9,
            }}
          >
            {summary}
          </span>
        )}
        {hovered && (
          <button
            style={{
              marginLeft: 3,
              background: "none",
              border: "none",
              padding: "1px 2px",
              cursor: "pointer",
              color: "inherit",
              opacity: 0.65,
              fontSize: 12,
              lineHeight: 1,
              borderRadius: 3,
              display: "inline-flex",
              alignItems: "center",
              flexShrink: 0,
            }}
            title="Eliminar"
            type="button"
            onClick={handleDelete}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Overlay interno ─────────────────────────────────────────────────────────

function SnippetOverlayInner({
  value,
  taRef,
  onChange,
  onEdit,
}: {
  value: string;
  taRef: React.RefObject<HTMLTextAreaElement | null>;
  onChange: (next: string) => void;
  onEdit?: (raw: string, replace: (next: string) => void) => void;
}) {
  const [positions, setPositions] = useState<
    Array<{ top: number; left: number; width: number; height: number }>
  >([]);
  const tokens = useMemo(() => parseTokens(value), [value]);

  const measure = useCallback(() => {
    const ta = taRef.current;
    if (!ta || tokens.length === 0) {
      setPositions([]);
      return;
    }
    try {
      setPositions(measureTokenPositions(ta, tokens));
    } catch {
      setPositions([]);
    }
  }, [taRef, tokens]);

  useEffect(() => {
    measure();
  }, [measure]);
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(ta);
    return () => {
      ta.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [taRef, measure]);

  const handleDelete = useCallback(
    (t: SnippetToken) => {
      onChange(value.slice(0, t.index) + value.slice(t.index + t.raw.length));
    },
    [value, onChange],
  );

  const handleReplace = useCallback(
    (t: SnippetToken, next: string) => {
      onChange(
        value.slice(0, t.index) + next + value.slice(t.index + t.raw.length),
      );
    },
    [value, onChange],
  );

  if (tokens.length === 0 || positions.length === 0) return null;

  return (
    <>
      {tokens.map((token, i) => {
        const pos = positions[i];
        if (!pos) return null;
        return (
          <SnippetChip
            key={`${token.raw}-${token.index}`}
            pos={pos}
            token={token}
            onDelete={handleDelete}
            onEdit={onEdit}
            onReplace={handleReplace}
          />
        );
      })}
    </>
  );
}

// ─── API pública ──────────────────────────────────────────────────────────────

export function makeSnippetOverlay({
  taRef,
  onChange,
  onEdit,
}: {
  taRef: React.RefObject<HTMLTextAreaElement | null>;
  onChange: (next: string) => void;
  onEdit?: (raw: string, replace: (next: string) => void) => void;
}): (value: string) => React.ReactNode {
  return (value: string) => (
    <SnippetOverlayInner
      taRef={taRef}
      value={value}
      onChange={onChange}
      onEdit={onEdit}
    />
  );
}
