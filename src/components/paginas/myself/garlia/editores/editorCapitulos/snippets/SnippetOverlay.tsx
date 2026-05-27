"use client";
/**
 * SnippetOverlay
 *
 * Renderiza chips visuales encima del textarea del MarkdownEditor para cada
 * snippet [[...]] encontrado en el texto. Usa un div espejo (mirror) con las
 * mismas medidas y fuente que el textarea para calcular coordenadas exactas.
 *
 * USO en page.tsx — dentro de PanelEditor, pasar como renderOverlay al MarkdownEditor:
 *
 *   import { makeSnippetOverlay } from "./SnippetOverlay";
 *
 *   // dentro del componente:
 *   const snippetOverlay = useMemo(
 *     () => makeSnippetOverlay({
 *       taRef: textareaRef,
 *       onDelete: (token) => ...,
 *       onEdit:   (raw, replace) => { ... abre modal ... }
 *     }),
 *     [textareaRef, ...]
 *   );
 *
 *   <MarkdownEditor
 *     ...
 *     renderOverlay={snippetOverlay}
 *   />
 *
 * IMPORTANTE: El wrapper del overlay en MarkdownEditor tiene pointerEvents:none,
 * pero los chips internos setean pointerEvents:all para ser clicables.
 */

import React, {
  useRef, useState, useEffect, useCallback, useMemo,
} from "react";

// ─── Tipos de snippet ─────────────────────────────────────────────────────────

type SnippetKind =
  | "drop" | "img" | "float" | "choice" | "use" | "gate"
  | "section" | "sound" | "cita";

interface SnippetToken {
  raw: string;
  kind: SnippetKind;
  parts: string[];
  index: number; // posición en el string original
}

// ─── Config visual por tipo ───────────────────────────────────────────────────

interface KindDef {
  label: string;
  icon: string;          // emoji o símbolo
  bg: string;
  border: string;
  text: string;
  dot: string;
  summary: (parts: string[]) => string;
}

const KIND_DEFS: Record<string, KindDef> = {
  drop:    { label: "Drop",    icon: "⚔",  bg: "rgba(127,119,221,.12)", border: "rgba(127,119,221,.35)", text: "#7f77dd", dot: "#7f77dd", summary: p => p[4] ?? p[1] ?? "" },
  img:     { label: "Img",     icon: "🖼",  bg: "rgba(29,158,117,.12)",  border: "rgba(29,158,117,.35)",  text: "#1d9e75", dot: "#1d9e75", summary: p => p[2] ?? p[1] ?? "" },
  float:   { label: "Float",   icon: "🖼",  bg: "rgba(15,110,86,.12)",   border: "rgba(15,110,86,.35)",   text: "#0f6e56", dot: "#0f6e56", summary: p => p[1] ?? "" },
  choice:  { label: "Choice",  icon: "🔀", bg: "rgba(55,138,221,.12)",  border: "rgba(55,138,221,.35)",  text: "#378add", dot: "#378add", summary: p => p[1] ?? "" },
  use:     { label: "Use",     icon: "👆", bg: "rgba(226,75,74,.12)",   border: "rgba(226,75,74,.35)",   text: "#e24b4a", dot: "#e24b4a", summary: p => p[1] ?? "" },
  gate:    { label: "Gate",    icon: "🚪", bg: "rgba(186,117,23,.12)",  border: "rgba(186,117,23,.35)",  text: "#ba7517", dot: "#ba7517", summary: p => p[1] ?? "" },
  section: { label: "Sección", icon: "›",  bg: "rgba(83,74,183,.12)",   border: "rgba(83,74,183,.35)",   text: "#534ab7", dot: "#534ab7", summary: p => p[2] ?? p[1] ?? "" },
  sound:   { label: "Sonido",  icon: "♪",  bg: "rgba(212,83,126,.12)",  border: "rgba(212,83,126,.35)",  text: "#d4537e", dot: "#d4537e", summary: p => p[1] ?? "" },
  cita:    { label: "Cita",    icon: "«»", bg: "rgba(186,117,23,.10)",  border: "rgba(186,117,23,.3)",   text: "#ba7517", dot: "#ba7517", summary: p => { const t = p.slice(1).join("|"); return t.length > 22 ? t.slice(0,22)+"…" : t; } },
};

const FALLBACK_DEF: KindDef = {
  label: "Snippet", icon: "◆", bg: "rgba(128,128,128,.1)", border: "rgba(128,128,128,.3)",
  text: "#888", dot: "#888", summary: p => p.slice(1).join("|").slice(0, 20),
};

// ─── Parser ───────────────────────────────────────────────────────────────────

/** Extrae todos los tokens [[...]] con su posición en el string */
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

// ─── Chip positioner ─────────────────────────────────────────────────────────
/**
 * Crea un div espejo del textarea para medir la posición exacta de cada token.
 * Devuelve las coordenadas { top, left } relativas al padre del textarea.
 */
function measureTokenPositions(
  ta: HTMLTextAreaElement,
  tokens: SnippetToken[],
): Array<{ top: number; left: number; width: number; height: number }> {
  const cs = window.getComputedStyle(ta);

  // Crear mirror
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
    // Texto antes del token
    const before = raw.slice(0, token.index);
    mirror.innerHTML =
      escapeHtml(before) +
      `<span id="tok-start">\u200b</span>` +
      escapeHtml(token.raw) +
      `<span id="tok-end">\u200b</span>`;

    const spanStart = mirror.querySelector("#tok-start") as HTMLElement;
    const spanEnd   = mirror.querySelector("#tok-end")   as HTMLElement;

    if (!spanStart || !spanEnd) { results.push({ top: 0, left: 0, width: 0, height: 0 }); continue; }

    // Ajustar scroll del mirror al del textarea
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

  // Chip ocupa el mismo espacio que el texto crudo pero visualmente lo tapa
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "absolute",
        top: pos.top,
        left: pos.left,
        height: pos.height || 20,
        // El chip tiene su propio ancho natural (fit-content), no el del texto raw
        width: "fit-content",
        maxWidth: 260,
        pointerEvents: "all",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "0 7px 0 5px",
        borderRadius: 999,
        background: def.bg,
        border: `1px solid ${def.border}`,
        color: def.text,
        fontSize: 10,
        fontWeight: 700,
        fontFamily: "var(--font-sans, system-ui)",
        whiteSpace: "nowrap",
        overflow: "hidden",
        cursor: "default",
        userSelect: "none",
        transition: "box-shadow .12s",
        boxShadow: hovered ? `0 2px 8px ${def.border}` : "none",
        zIndex: 2,
      }}
    >
      {/* Dot */}
      <span style={{
        width: 5, height: 5, borderRadius: "50%",
        background: def.dot, flexShrink: 0,
      }} />

      {/* Kind label */}
      <span style={{ opacity: .65, fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em" }}>
        {def.label}
      </span>

      {/* Summary */}
      {summary && (
        <span style={{ maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis" }}>
          {summary}
        </span>
      )}

      {/* Botones — sólo en hover */}
      {hovered && (
        <>
          {onEdit && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onEdit(token.raw, (next) => onReplace(token, next)); }}
              title="Editar"
              style={{
                marginLeft: 3,
                background: "none", border: "none", padding: "1px 2px",
                cursor: "pointer", color: "inherit", opacity: .7,
                fontSize: 10, lineHeight: 1, borderRadius: 3,
                display: "inline-flex", alignItems: "center",
              }}
            >
              ✎
            </button>
          )}
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onDelete(token); }}
            title="Eliminar"
            style={{
              marginLeft: onEdit ? 0 : 3,
              background: "none", border: "none", padding: "1px 2px",
              cursor: "pointer", color: "inherit", opacity: .7,
              fontSize: 11, lineHeight: 1, borderRadius: 3,
              display: "inline-flex", alignItems: "center",
            }}
          >
            ×
          </button>
        </>
      )}
    </div>
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

  // Medir al montar, al cambiar valor, y al hacer scroll/resize
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
  /**
   * Llamado cuando el usuario hace clic en el ícono de editar de un chip.
   * Recibe el raw string actual y un callback replace(next) para reemplazarlo.
   * Aquí podés abrir el modal correspondiente (ModalDrop, ModalChoice, etc.)
   */
  onEdit?: (raw: string, replace: (next: string) => void) => void;
}

/**
 * Devuelve una función compatible con la prop `renderOverlay` de MarkdownEditor.
 * Llamar con useMemo para evitar recrear en cada render.
 *
 * Ejemplo:
 *   const overlay = useMemo(
 *     () => makeSnippetOverlay({ taRef: textareaRef, onChange, onEdit: handleEditSnippet }),
 *     [textareaRef, onChange, handleEditSnippet]
 *   );
 *   <MarkdownEditor renderOverlay={overlay} ... />
 */
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