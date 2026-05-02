"use client";

import React, { useState, useRef, useEffect } from "react";
import { Eye, Edit3, Columns, Wand2, X as XIcon } from "lucide-react";

// ── Renderer ────────────────────────────────────────────────────────────────
export function renderMarkdown(raw: string): string {
  let html = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bloques de código
  html = html.replace(/```([\s\S]*?)```/g, (_, code) => {
    const escaped = code.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    return `<pre><code>${escaped.trim()}</code></pre>`;
  });

  // Tablas
  html = html.replace(/(?:^|\n)((?:\|[^\n]+\|\n)+)/g, (_, tableBlock) => {
    const rows = tableBlock.trim().split("\n").filter((r: string) => r.trim());
    if (rows.length < 2) return tableBlock;
    const isSep = (r: string) => /^\|[-| :]+\|$/.test(r.trim());
    const parse = (row: string) => row.split("|").slice(1, -1).map((c: string) => c.trim());
    const headers = parse(rows[0]).map((c: string) => `<th>${c}</th>`).join("");
    const body = rows.slice(1).filter((r: string) => !isSep(r))
      .map((r: string) => `<tr>${parse(r).map((c: string) => `<td>${c}</td>`).join("")}</tr>`).join("");
    return `\n<table><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table>\n`;
  });

  // Imágenes (debe ir antes que los enlaces)
  html = html.replace(/!\[([^\]]*)\]\((.*?)\)/g, '<img src="$2" alt="$1" />');

  // Enlaces
  html = html.replace(/\[([^\]]+)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Tipografía y Encabezados
  html = html.replace(/^---$/gm, "<hr/>");
  html = html.replace(/^######\s(.+)$/gm, "<h6>$1</h6>");
  html = html.replace(/^#####\s(.+)$/gm,  "<h5>$1</h5>");
  html = html.replace(/^####\s(.+)$/gm,   "<h4>$1</h4>");
  html = html.replace(/^###\s(.+)$/gm,    "<h3>$1</h3>");
  html = html.replace(/^##\s(.+)$/gm,     "<h2>$1</h2>");
  html = html.replace(/^#\s(.+)$/gm,      "<h1>$1</h1>");
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g,     "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g,         "<em>$1</em>");
  html = html.replace(/`([^`]+)`/g,         "<code>$1</code>");

  // Listas
  html = html.replace(/((?:^[ \t]*- .+\n?)+)/gm, (block) => {
    const items = block.trim().split("\n")
      .map((l: string) => {
        let content = l.replace(/^[ \t]*- /, "");
        const taskMatch = content.match(/^\[([ xX\s])\] (.*)/);
        if (taskMatch) {
          const checked = taskMatch[1].trim().toLowerCase() === 'x' ? 'checked' : '';
          return `<li class="task-list-item"><input type="checkbox" class="task-list-checkbox" disabled ${checked} /><span>${taskMatch[2]}</span></li>`;
        }
        return `<li>${content}</li>`;
      }).join("");
    return `<ul>${items}</ul>`;
  });

  // Párrafos
  html = html.split(/\n{2,}/).map((block: string) => {
    if (/^<(h[1-6]|ul|ol|li|pre|table|hr|blockquote)/.test(block.trim())) return block;
    const inner = block.trim().replace(/\n/g, "<br/>");
    return inner ? `<p>${inner}</p>` : "";
  }).join("\n");

  return html;
}

// ── Estilos de vista previa ──────────────────────────────────────────────────
export const PROSE_STYLES = `
  .prose-mundo h1 { font-size:1.4rem;font-weight:900;margin:1rem 0 .4rem;letter-spacing:.15em;text-transform:uppercase;color:var(--color-primary,#7c6af7);border-bottom:2px solid color-mix(in srgb,var(--color-primary,#7c6af7) 20%,transparent);padding-bottom:.3rem }
  .prose-mundo h2 { font-size:1.1rem;font-weight:800;margin:.9rem 0 .35rem;letter-spacing:.1em;text-transform:uppercase;color:color-mix(in srgb,var(--color-primary,#7c6af7) 80%,white) }
  .prose-mundo h3 { font-size:.9rem;font-weight:700;margin:.7rem 0 .25rem;color:color-mix(in srgb,var(--color-primary,#7c6af7) 60%,white) }
  .prose-mundo p  { margin:.45rem 0;font-size:.85rem;line-height:1.65;color:var(--color-input-text,#d1c9ff) }
  .prose-mundo strong { font-weight:800;color:var(--color-primary,#7c6af7) }
  .prose-mundo em     { font-style:italic;opacity:.85 }
  .prose-mundo hr { border:none;border-top:1px solid color-mix(in srgb,var(--color-primary,#7c6af7) 20%,transparent);margin:.9rem 0 }
  .prose-mundo a { color:var(--color-primary,#7c6af7);text-decoration:underline;text-underline-offset:3px;transition:opacity 0.2s; }
  .prose-mundo a:hover { opacity:0.8; }
  .prose-mundo img { max-width:100%;height:auto;border-radius:0.5rem;margin:0.5rem 0;border:1px solid color-mix(in srgb,var(--color-primary,#7c6af7) 15%,transparent); }
  .prose-mundo ul { list-style:none;padding-left:1rem;margin:.4rem 0 }
  .prose-mundo ul li { position:relative;padding-left:.8rem;font-size:.82rem;margin:.2rem 0;color:var(--color-input-text,#d1c9ff) }
  .prose-mundo ul li::before { content:"◈";position:absolute;left:-.2rem;font-size:.6rem;color:var(--color-primary,#7c6af7);top:.2rem }
  .prose-mundo .task-list-item { display:flex;align-items:flex-start;gap:0.4rem;padding-left:0; }
  .prose-mundo .task-list-item::before { display:none; }
  .prose-mundo .task-list-checkbox { margin-top:0.25rem;accent-color:var(--color-primary,#7c6af7);width:0.85rem;height:0.85rem;cursor:not-allowed; }
  .prose-mundo table { width:100%;border-collapse:collapse;font-size:.78rem;margin:.6rem 0 }
  .prose-mundo th { background:color-mix(in srgb,var(--color-primary,#7c6af7) 15%,transparent);color:var(--color-primary,#7c6af7);font-weight:800;text-transform:uppercase;letter-spacing:.08em;padding:.4rem .7rem;border:1px solid color-mix(in srgb,var(--color-primary,#7c6af7) 20%,transparent);text-align:left }
  .prose-mundo td { padding:.35rem .7rem;border:1px solid color-mix(in srgb,var(--color-primary,#7c6af7) 12%,transparent);color:var(--color-input-text,#d1c9ff) }
  .prose-mundo tr:nth-child(even) td { background:color-mix(in srgb,var(--color-primary,#7c6af7) 5%,transparent) }
  .prose-mundo pre { background:color-mix(in srgb,var(--color-primary,#7c6af7) 8%,transparent);border:1px solid color-mix(in srgb,var(--color-primary,#7c6af7) 15%,transparent);border-radius:.6rem;padding:.7rem 1rem;margin:.5rem 0;overflow-x:auto }
  .prose-mundo code { font-family:'Fira Code','Courier New',monospace;font-size:.78rem;color:color-mix(in srgb,var(--color-primary,#7c6af7) 90%,white) }
  .prose-mundo pre code { color:color-mix(in srgb,var(--color-primary,#7c6af7) 70%,white);line-height:1.6 }
  .prose-mundo .placeholder { color:color-mix(in srgb,var(--color-primary,#7c6af7) 25%,transparent);font-style:italic }
`;

// ── Tipos ────────────────────────────────────────────────────────────────────
type ViewMode = "edit" | "preview" | "split";

interface MarkdownEditorProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  toolbar?: boolean;
  defaultMode?: ViewMode;
}

// ── Componente ────────────────────────────────────────────────────────────────
export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  rows = 6,
  className = "",
  toolbar = true,
  defaultMode = "split",
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<ViewMode>(defaultMode);
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const pvRef = useRef<HTMLDivElement>(null);

  const monoStyle: React.CSSProperties = { fontFamily: "var(--font-mono)" };

  // En móvil, si el modo es "split" lo forzamos a "edit"
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const check = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches && mode === "split") setMode("edit");
    };
    check(mq);
    mq.addEventListener("change", check);
    return () => mq.removeEventListener("change", check);
  }, [mode]);

  const minH = `${rows * 1.6}rem`;

  const wrapSelection = (before: string, after: string) => {
    const ta = taRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const sel = value.slice(s, e) || (after === "" ? "" : "texto");
    const next = value.slice(0, s) + before + sel + after + value.slice(e);
    onChange(next);
    requestAnimationFrame(() => {
      ta.selectionStart = s + before.length;
      ta.selectionEnd   = s + before.length + sel.length;
      ta.focus();
    });
  };

  const insertSnippet = (snippet: string) => {
    const ta = taRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    onChange(value.slice(0, s) + snippet + value.slice(e));
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = s + snippet.length;
      ta.focus();
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = taRef.current;
    if (!ta) return;

    if (e.key === "Tab") {
      e.preventDefault();
      const { selectionStart: s, selectionEnd: end } = ta;
      const next = value.slice(0, s) + "  " + value.slice(end);
      onChange(next);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 2; });
      return;
    }

    if (e.key === "Enter") {
      const { selectionStart: s } = ta;
      const lines = value.slice(0, s).split('\n');
      const currentLine = lines[lines.length - 1];
      const listMatch = currentLine.match(/^(\s*-\s(?:\[[ xX\s]\]\s)?)(.*)/);
      if (listMatch) {
        if (listMatch[2].trim() === '') {
          e.preventDefault();
          const newVal = value.slice(0, s - listMatch[1].length) + value.slice(s);
          onChange(newVal);
          requestAnimationFrame(() => {
            ta.selectionStart = ta.selectionEnd = s - listMatch[1].length;
          });
        } else {
          e.preventDefault();
          const prefix = listMatch[1].replace(/\[[xX]\]/, '[ ]');
          insertSnippet(`\n${prefix}`);
        }
        return;
      }
    }

    const autoClosePairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
    if (autoClosePairs[e.key]) {
      e.preventDefault();
      wrapSelection(e.key, autoClosePairs[e.key]);
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === "b") { e.preventDefault(); wrapSelection("**", "**"); }
    if ((e.ctrlKey || e.metaKey) && e.key === "i") { e.preventDefault(); wrapSelection("*", "*"); }
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (mode !== "split" || !pvRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight > clientHeight) {
      const ratio = scrollTop / (scrollHeight - clientHeight);
      pvRef.current.scrollTop = ratio * (pvRef.current.scrollHeight - pvRef.current.clientHeight);
    }
  };

  const html = renderMarkdown(value);

  // Estilos base de textarea — sin bordes propios, hereda del contenedor
  const textareaCls =
    "flex-1 w-full bg-transparent outline-none border-none resize-none text-sm font-mono leading-relaxed placeholder:opacity-30";

  const textareaStyle: React.CSSProperties = {
    minHeight: minH,
    overflowY: "auto",
    color: "color-mix(in srgb, var(--foreground) 80%, transparent)",
    fontFamily: "var(--font-mono)",
    fontSize: 13,
    padding: "16px 20px",
  };

  const previewStyle: React.CSSProperties = {
    minHeight: minH,
    overflowY: "auto",
    padding: "16px 20px",
    flex: 1,
  };

  return (
    <div className={`flex flex-col flex-1 min-h-0 ${className}`}>
      <style>{PROSE_STYLES}</style>

      {/* ── Bloque único contenedor ── */}
      <div
        style={{
          border: "1px solid color-mix(in srgb, var(--foreground) 8%, transparent)",
          borderRadius: 8,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          background: "color-mix(in srgb, var(--bg-menu) 40%, transparent)",
        }}
      >
        {/* ── Barra superior: herramientas + toggle de modo ── */}
        {toolbar && (
          <div
            style={{
              borderBottom: "1px solid color-mix(in srgb, var(--foreground) 7%, transparent)",
              background: "color-mix(in srgb, var(--foreground) 2%, transparent)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0 10px",
              minHeight: 34,
              flexShrink: 0,
            }}
          >
            {/* Botón accesos rápidos — solo mobile */}
            <div className="relative sm:hidden shrink-0">
              <button
                type="button"
                onClick={() => setToolbarOpen(o => !o)}
                title="Accesos rápidos"
                style={{
                  width: 28,
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 5,
                  border: "1px solid color-mix(in srgb, var(--foreground) 10%, transparent)",
                  background: toolbarOpen
                    ? "color-mix(in srgb, var(--foreground) 10%, transparent)"
                    : "transparent",
                  color: "color-mix(in srgb, var(--foreground) 35%, transparent)",
                  cursor: "pointer",
                }}
              >
                {toolbarOpen ? <XIcon size={12} /> : <Wand2 size={12} />}
              </button>

              {toolbarOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    zIndex: 50,
                    background: "var(--bg-menu)",
                    border: "1px solid color-mix(in srgb, var(--foreground) 10%, transparent)",
                    borderRadius: 6,
                    padding: "4px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    minWidth: 120,
                  }}
                >
                  {[,
                    { label: "Código", action: () => wrapSelection("`", "`") },
                    { label: "Enlace", action: () => wrapSelection("[", "](url)") },
                    { label: "Lista", action: () => insertSnippet("\n- elemento\n- elemento\n") },
                    { label: "Tareas", action: () => insertSnippet("\n- [ ] Pendiente\n- [x] Hecho\n") },
                    { label: "Separador", action: () => insertSnippet("\n---\n") },
                    { label: "Tabla", action: () => insertSnippet("\n| Col 1 | Col 2 |\n|---|---|\n| dato | dato |\n") },
                    { label: "Bloque", action: () => insertSnippet("\n```\ncódigo\n```\n") },
                  ].map(({ label, action }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => { action(); setToolbarOpen(false); }}
                      style={{
                        textAlign: "left",
                        padding: "6px 10px",
                        borderRadius: 4,
                        border: "none",
                        background: "transparent",
                        fontSize: 11,
                        color: "color-mix(in srgb, var(--foreground) 50%, transparent)",
                        cursor: "pointer",
                        ...monoStyle,
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Herramientas completas — solo desktop */}
            <div
              className="hidden sm:flex"
              style={{
                alignItems: "center",
                gap: 2,
                flex: 1,
                flexWrap: "wrap" as const,
              }}
            >
              {[
                { label: "</>", action: () => wrapSelection("`", "`"), title: "Código inline" },
                { label: "Link", action: () => wrapSelection("[", "](url)"), title: "Añadir enlace" },
                { label: "Img", action: () => wrapSelection("![alt](", ")"), title: "Añadir Imagen" },
              ].map(({ label, action, title }, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={action}
                  title={title}
                  style={{
                    padding: "2px 7px",
                    borderRadius: 4,
                    border: "none",
                    background: "transparent",
                    fontSize: 10,
                    color: "color-mix(in srgb, var(--foreground) 30%, transparent)",
                    cursor: "pointer",
                    ...monoStyle,
                    transition: "color 0.1s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = "color-mix(in srgb, var(--foreground) 65%, transparent)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "color-mix(in srgb, var(--foreground) 30%, transparent)")}
                >
                  {label}
                </button>
              ))}

              {/* Separador */}
              <div style={{ width: 1, height: 14, background: "color-mix(in srgb, var(--foreground) 8%, transparent)", margin: "0 2px" }} />

              {[
                { label: "Lista", action: () => insertSnippet("\n- elemento\n- elemento\n") },
                { label: "Tareas", action: () => insertSnippet("\n- [ ] Pendiente\n- [x] Hecho\n") },
                { label: "─ ─", action: () => insertSnippet("\n---\n") },
                { label: "Tabla", action: () => insertSnippet("\n| Col 1 | Col 2 | Col 3 |\n|---|---|---|\n| dato | dato | dato |\n") },
                { label: "Bloque", action: () => insertSnippet("\n```\ncódigo\n```\n") },
              ].map(({ label, action }, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={action}
                  style={{
                    padding: "2px 7px",
                    borderRadius: 4,
                    border: "none",
                    background: "transparent",
                    fontSize: 10,
                    color: "color-mix(in srgb, var(--foreground) 30%, transparent)",
                    cursor: "pointer",
                    ...monoStyle,
                    transition: "color 0.1s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = "color-mix(in srgb, var(--foreground) 65%, transparent)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "color-mix(in srgb, var(--foreground) 30%, transparent)")}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ── Toggle edit/split/preview — estilo ensayos ── */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                border: "1px solid color-mix(in srgb, var(--foreground) 10%, transparent)",
                borderRadius: 5,
                overflow: "hidden",
                marginLeft: "auto",
                flexShrink: 0,
              }}
            >
              {(["edit", "split", "preview"] as ViewMode[]).map((m) => {
                const Icon = m === "edit" ? Edit3 : m === "preview" ? Eye : Columns;
                const label = m === "edit" ? "edit" : m === "preview" ? "preview" : "split";
                const isActive = mode === m;
                // Ocultar split en mobile
                const hideSplit = m === "split" ? { display: "none" } : {};
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    title={label}
                    className={m === "split" ? "hidden sm:flex" : "flex"}
                    style={{
                      alignItems: "center",
                      gap: 4,
                      fontSize: 9,
                      padding: "3px 8px",
                      background: isActive
                        ? "color-mix(in srgb, var(--foreground) 10%, transparent)"
                        : "transparent",
                      color: isActive
                        ? "color-mix(in srgb, var(--foreground) 70%, transparent)"
                        : "color-mix(in srgb, var(--foreground) 25%, transparent)",
                      border: "none",
                      cursor: "pointer",
                      ...monoStyle,
                      transition: "background 0.1s, color 0.1s",
                    }}
                  >
                    <Icon size={10} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Área de contenido ── */}
        <div
          style={{
            display: "flex",
            flex: 1,
            minHeight: 0,
            flexDirection: mode === "split" ? "row" : "column",
          }}
        >
          {/* Textarea de edición */}
          {(mode === "edit" || mode === "split") && (
            <textarea
              ref={taRef}
              value={value}
              onChange={e => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onScroll={handleScroll}
              placeholder={placeholder}
              className={textareaCls}
              style={textareaStyle}
            />
          )}

          {/* Separador vertical en modo split */}
          {mode === "split" && (
            <div
              style={{
                width: 1,
                background: "color-mix(in srgb, var(--foreground) 7%, transparent)",
                flexShrink: 0,
              }}
            />
          )}

          {/* Vista previa */}
          {(mode === "preview" || mode === "split") && (
            <div
              ref={pvRef}
              className="prose-mundo"
              style={previewStyle}
              dangerouslySetInnerHTML={{
                __html: html || `<p class="placeholder">${placeholder ?? "Vista previa…"}</p>`,
              }}
            />
          )}
        </div>


      </div>
    </div>
  );
}