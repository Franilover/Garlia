"use client";
/**
 * SnippetOverlay
 *
 * Renderiza chips visuales sobre el textarea. Cada token [[...]] queda
 * tapado por una máscara del color de fondo + un chip compacto encima.
 * Click en el chip → abre el modal de edición directamente.
 * Hover → aparece botón × para eliminar.
 */

import React, {
  useRef, useState, useEffect, useCallback, useMemo,
} from "react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type SnippetKind =
  | "drop" | "img" | "float" | "choice" | "use" | "gate"
  | "section" | "sound" | "cita";

interface SnippetToken {
  raw: string;
  kind: SnippetKind;
  parts: string[];
  index: number;
}

// ─── Config visual por tipo ───────────────────────────────────────────────────

interface KindDef {
  label: string;
  icon: string;
  bg: string;
  border: string;
  text: string;
  dot: string;
  summary: (parts: string[]) => string;
}

const KIND_DEFS: Record<string, KindDef> = {
  drop:    { label: "Drop",    icon: "⚔",  bg: "rgba(127,119,221,.15)", border: "rgba(127,119,221,.45)", text: "#a09af0", dot: "#7f77dd", summary: p => p[4] ?? p[1] ?? "" },
  img:     { label: "Img",     icon: "🖼",  bg: "rgba(29,158,117,.15)",  border: "rgba(29,158,117,.45)",  text: "#2dc896", dot: "#1d9e75", summary: p => p[2] ?? p[1] ?? "" },
  float:   { label: "Float",   icon: "🖼",  bg: "rgba(15,110,86,.15)",   border: "rgba(15,110,86,.45)",   text: "#14a87e", dot: "#0f6e56", summary: p => p[1] ?? "" },
  choice:  { label: "Choice",  icon: "🔀", bg: "rgba(55,138,221,.15)",  border: "rgba(55,138,221,.45)",  text: "#5aabf5", dot: "#378add", summary: p => p[1] ?? "" },
  use:     { label: "Use",     icon: "👆", bg: "rgba(226,75,74,.15)",   border: "rgba(226,75,74,.45)",   text: "#f07574", dot: "#e24b4a", summary: p => p[1] ?? "" },
  gate:    { label: "Gate",    icon: "🚪", bg: "rgba(186,117,23,.15)",  border: "rgba(186,117,23,.45)",  text: "#e09a2a", dot: "#ba7517", summary: p => p[1] ?? "" },
  section: { label: "Sección", icon: "›",  bg: "rgba(83,74,183,.15)",   border: "rgba(83,74,183,.45)",   text: "#8b83e8", dot: "#534ab7", summary: p => p[2] ?? p[1] ?? "" },
  sound:   { label: "Sonido",  icon: "♪",  bg: "rgba(212,83,126,.15)",  border: "rgba(212,83,126,.45)",  text: "#e87aaa", dot: "#d4537e", summary: p => p[1] ?? "" },
  cita:    { label: "Cita",    icon: "«»", bg: "rgba(186,117,23,.10)",  border: "rgba(186,117,23,.3)",   text: "#e09a2a", dot: "#ba7517", summary: p => { const t = p.slice(1).join("|"); return t.length > 22 ? t.slice(0,22)+"…" : t; } },
};

const FALLBACK_DEF: KindDef = {
  label: "Snippet", icon: "◆", bg: "rgba(128,128,128,.12)", border: "rgba(128,128,128,.35)",
  text: "#aaa", dot: "#888", summary: p => p.slice(1).join("|").slice(0, 20),
};

// ─── Parser ───────────────────────────────────────────────────────────────────

function parseTokens(raw: string): SnippetToken[] {
  const RE = /\[\[[\s\S]*?\]\]/g;
  const tokens: SnippetToken[] = [];
  let m: RegExpExecArray | null;
  while ((m = RE.exec(raw)) !== null) {
    const inner = m[0].slice(2, -2);
    const parts = inner.split("|");
    const kind = parts[0].trim() as SnippetKind;
    tokens.push({ raw: m[0], kind, parts, index: m.index });
  }
  return tokens;
}

// ─── Medición de posiciones ───────────────────────────────────────────────────

function measureTokenPositions(
  ta: HTMLTextAreaElement,
  tokens: SnippetToken[],
): Array<{ top: number; left: number; width: number; height: number }> {
  const cs = window.getComputedStyle(ta);

  const mirror = document.createElement("div");
  const copyProps = [
    "fontFamily", "fontSize", "fontWeight", "lineHeight",
    "letterSpacing", "wordSpacing",
    "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
    "boxSizing", "overflowWrap", "wordBreak", "whiteSpace",
  ] as const;
  copyProps.forEach(p => { (mirror.style as any)[p] = cs[p]; });
  mirror.style.position = "absolute";
  mirror.style.top = "0";
  mirror.style.left = "0";
  mirror.style.visibility = "hidden";
  mirror.style.pointerEvents = "none";
  mirror.style.zIndex = "-1";
  mirror.style.width = ta.clientWidth + "px";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.overflow = "hidden";

  ta.parentElement!.appendChild(mirror);

  const results: Array<{ top: number; left: number; width: number; height: number }> = [];
  const raw = ta.value;

  for (const token of tokens) {
    const before = raw.slice(0, token.index);
    mirror.innerHTML =
      escapeHtml(before) +
      `<span id="tok-start">\u200b</span>` +
      escapeHtml(token.raw) +
      `<span id="tok-end">\u200b</span>`;

    const spanStart = mirror.querySelector("#tok-start") as HTMLElement;
    const spanEnd   = mirror.querySelector("#tok-end")   as HTMLElement;

    if (!spanStart || !spanEnd) { results.push({ top: 0, left: 0, width: 0, height: 0 }); continue; }

    mirror.scrollTop  = ta.scrollTop;
    mirror.scrollLeft = ta.scrollLeft;

    const mRect  = mirror.getBoundingClientRect();
    const sRect  = spanStart.getBoundingClientRect();
    const eRect  = spanEnd.getBoundingClientRect();

    const top    = sRect.top  - mRect.top;
    const left   = sRect.left - mRect.left;
    const width  = Math.max(0, eRect.left - sRect.left);
    const lh     = parseFloat(cs.lineHeight) || 18;
    const height = lh;

    results.push({ top, left, width, height });
  }

  ta.parentElement!.removeChild(mirror);
  return results;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

interface ChipProps {
  token: SnippetToken;
  pos: { top: number; left: number; width: number; height: number };
  onDelete: (token: SnippetToken) => void;
  onEdit?: (raw: string, replace: (next: string) => void) => void;
  onReplace: (token: SnippetToken, next: string) => void;
}

function SnippetChip({ token, pos, onDelete, onEdit, onReplace }: ChipProps) {
  const def = KIND_DEFS[token.kind] ?? FALLBACK_DEF;
  const summary = def.summary(token.parts);
  const [hovered, setHovered] = useState(false);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(token.raw, (next) => onReplace(token, next));
    }
  }, [onEdit, onReplace, token]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(token);
  }, [onDelete, token]);

  return (
    <>
      {/* ── Máscara: tapa el texto raw del textarea ── */}
      <div
        style={{
          position: "absolute",
          top: pos.top,
          left: pos.left,
          width: pos.width || 4,
          height: pos.height || 20,
          // Usa el mismo color de fondo que el textarea
          background: "var(--bg-menu, #1a1730)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* ── Chip visual ── */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onEdit ? handleClick : undefined}
        style={{
          position: "absolute",
          top: pos.top + 1,
          left: pos.left,
          height: (pos.height || 20) - 2,
          width: "fit-content",
          maxWidth: 240,
          pointerEvents: "all",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "0 6px 0 5px",
          borderRadius: 999,
          background: hovered
            ? def.bg.replace(/[\d.]+\)$/, m => String(Math.min(parseFloat(m) * 2.2, 0.35)) + ")")
            : def.bg,
          border: `1px solid ${def.border}`,
          color: def.text,
          fontSize: 10,
          fontWeight: 700,
          fontFamily: "var(--font-sans, system-ui)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          cursor: onEdit ? "pointer" : "default",
          userSelect: "none",
          transition: "background .12s, box-shadow .12s",
          boxShadow: hovered ? `0 2px 10px ${def.border}` : "none",
          zIndex: 2,
        }}
        title={onEdit ? `Editar ${def.label}` : def.label}
      >
        {/* Dot */}
        <span style={{
          width: 5, height: 5, borderRadius: "50%",
          background: def.dot, flexShrink: 0,
        }} />

        {/* Icon */}
        <span style={{ fontSize: 9, lineHeight: 1, flexShrink: 0 }}>
          {def.icon}
        </span>

        {/* Kind label */}
        <span style={{ opacity: .7, fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".07em" }}>
          {def.label}
        </span>

        {/* Summary */}
        {summary && (
          <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", opacity: .9 }}>
            {summary}
          </span>
        )}

        {/* Botón × — solo en hover */}
        {hovered && (
          <button
            type="button"
            onClick={handleDelete}
            title="Eliminar"
            style={{
              marginLeft: 3,
              background: "none", border: "none", padding: "1px 2px",
              cursor: "pointer", color: "inherit", opacity: .65,
              fontSize: 12, lineHeight: 1, borderRadius: 3,
              display: "inline-flex", alignItems: "center",
              flexShrink: 0,
            }}
          >
            ×
          </button>
        )}
      </div>
    </>
  );
}

// ─── Overlay interno ─────────────────────────────────────────────────────────

interface SnippetOverlayInnerProps {
  value: string;
  taRef: React.RefObject<HTMLTextAreaElement>;
  onChange: (next: string) => void;
  onEdit?: (raw: string, replace: (next: string) => void) => void;
}

function SnippetOverlayInner({ value, taRef, onChange, onEdit }: SnippetOverlayInnerProps) {
  const [positions, setPositions] = useState<
    Array<{ top: number; left: number; width: number; height: number }>
  >([]);
  const tokens = useMemo(() => parseTokens(value), [value]);

  const measure = useCallback(() => {
    const ta = taRef.current;
    if (!ta || tokens.length === 0) { setPositions([]); return; }
    try {
      const pos = measureTokenPositions(ta, tokens);
      setPositions(pos);
    } catch {
      setPositions([]);
    }
  }, [taRef, tokens]);

  useEffect(() => { measure(); }, [measure]);

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

  const handleDelete = useCallback((token: SnippetToken) => {
    onChange(
      value.slice(0, token.index) +
      value.slice(token.index + token.raw.length)
    );
  }, [value, onChange]);

  const handleReplace = useCallback((token: SnippetToken, next: string) => {
    onChange(
      value.slice(0, token.index) +
      next +
      value.slice(token.index + token.raw.length)
    );
  }, [value, onChange]);

  if (tokens.length === 0 || positions.length === 0) return null;

  return (
    <>
      {tokens.map((token, i) => {
        const pos = positions[i];
        if (!pos) return null;
        return (
          <SnippetChip
            key={`${token.raw}-${token.index}`}
            token={token}
            pos={pos}
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

interface MakeSnippetOverlayOptions {
  taRef: React.RefObject<HTMLTextAreaElement>;
  onChange: (next: string) => void;
  onEdit?: (raw: string, replace: (next: string) => void) => void;
}

export function makeSnippetOverlay({
  taRef,
  onChange,
  onEdit,
}: MakeSnippetOverlayOptions): (value: string) => React.ReactNode {
  return (value: string) => (
    <SnippetOverlayInner
      value={value}
      taRef={taRef}
      onChange={onChange}
      onEdit={onEdit}
    />
  );
}