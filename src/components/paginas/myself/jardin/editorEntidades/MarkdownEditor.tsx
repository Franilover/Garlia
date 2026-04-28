"use client";

import React, { useState, useRef, useEffect } from "react";
import { Eye, Edit3, Columns, Wand2, X as XIcon } from "lucide-react";

// ── Renderer ────────────────────────────────────────────────────────────────
export function renderMarkdown(raw: string): string {
  let html = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html.replace(/```([\s\S]*?)```/g, (_, code) => {
    const escaped = code.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    return `<pre><code>${escaped.trim()}</code></pre>`;
  });

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
  html = html.replace(/((?:^- .+\n?)+)/gm, (block) => {
    const items = block.trim().split("\n")
      .map((l: string) => `<li>${l.replace(/^- /, "")}</li>`).join("");
    return `<ul>${items}</ul>`;
  });
  html = html.split(/\n{2,}/).map((block: string) => {
    if (/^<(h[1-6]|ul|ol|li|pre|table|hr|blockquote)/.test(block.trim())) return block;
    const inner = block.trim().replace(/\n/g, "<br/>");
    return inner ? `<p>${inner}</p>` : "";
  }).join("\n");

  return html;
}

// ── Estilos de vista previa (inyectados una vez) ─────────────────────────────
export const PROSE_STYLES = `
  .prose-mundo h1 { font-size:1.4rem;font-weight:900;margin:1rem 0 .4rem;letter-spacing:.15em;text-transform:uppercase;color:var(--color-primary,#7c6af7);border-bottom:2px solid color-mix(in srgb,var(--color-primary,#7c6af7) 20%,transparent);padding-bottom:.3rem }
  .prose-mundo h2 { font-size:1.1rem;font-weight:800;margin:.9rem 0 .35rem;letter-spacing:.1em;text-transform:uppercase;color:color-mix(in srgb,var(--color-primary,#7c6af7) 80%,white) }
  .prose-mundo h3 { font-size:.9rem;font-weight:700;margin:.7rem 0 .25rem;color:color-mix(in srgb,var(--color-primary,#7c6af7) 60%,white) }
  .prose-mundo p  { margin:.45rem 0;font-size:.85rem;line-height:1.65;color:var(--color-input-text,#d1c9ff) }
  .prose-mundo strong { font-weight:800;color:var(--color-primary,#7c6af7) }
  .prose-mundo em     { font-style:italic;opacity:.85 }
  .prose-mundo hr { border:none;border-top:1px solid color-mix(in srgb,var(--color-primary,#7c6af7) 20%,transparent);margin:.9rem 0 }
  .prose-mundo ul { list-style:none;padding-left:1rem;margin:.4rem 0 }
  .prose-mundo ul li { position:relative;padding-left:.8rem;font-size:.82rem;margin:.2rem 0;color:var(--color-input-text,#d1c9ff) }
  .prose-mundo ul li::before { content:"◈";position:absolute;left:-.2rem;font-size:.6rem;color:var(--color-primary,#7c6af7);top:.2rem }
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
  /** Si true muestra barra de herramientas y toggle de modo */
  toolbar?: boolean;
  /** Modo inicial */
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
    const sel = value.slice(s, e) || "texto";
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
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "b") { e.preventDefault(); wrapSelection("**", "**"); }
    if ((e.ctrlKey || e.metaKey) && e.key === "i") { e.preventDefault(); wrapSelection("*", "*"); }
  };

  const baseCls =
    "flex-1 w-full bg-input-bg text-input-text border border-primary/15 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/40 placeholder:text-primary/20 resize-none transition-colors font-mono leading-relaxed";

  const html = renderMarkdown(value);

  return (
    <div className={`flex flex-col flex-1 min-h-0 gap-2 ${className}`}>
      <style>{PROSE_STYLES}</style>

      {/* Toolbar */}
      {toolbar && (
        <div className="flex items-center gap-2">

          {/* Botón accesos rápidos — solo mobile */}
          <div className="relative sm:hidden shrink-0">
            <button
              type="button"
              onClick={() => setToolbarOpen(o => !o)}
              title="Accesos rápidos"
              className={`flex items-center justify-center w-8 h-8 rounded-xl border transition-all ${
                toolbarOpen
                  ? "bg-primary text-btn-text border-primary/40"
                  : "bg-primary/5 border-primary/10 text-primary/50 hover:text-primary hover:bg-primary/10"
              }`}
            >
              {toolbarOpen ? <XIcon size={13} /> : <Wand2 size={13} />}
            </button>

            {/* Dropdown de herramientas en mobile */}
            {toolbarOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-white-custom border border-primary/15 rounded-xl shadow-xl p-2 flex flex-col gap-0.5 min-w-[130px]">
                {[
                  { label: "H1", action: () => insertSnippet("\n# Título\n") },
                  { label: "H2", action: () => insertSnippet("\n## Subtítulo\n") },
                  { label: "H3", action: () => insertSnippet("\n### Sección\n") },
                  { label: "Negrita", action: () => wrapSelection("**", "**") },
                  { label: "Itálica", action: () => wrapSelection("*", "*") },
                  { label: "Código", action: () => wrapSelection("`", "`") },
                  { label: "Lista", action: () => insertSnippet("\n- elemento\n- elemento\n") },
                  { label: "Separador", action: () => insertSnippet("\n---\n") },
                  { label: "Tabla", action: () => insertSnippet("\n| Col 1 | Col 2 |\n|---|---|\n| dato | dato |\n") },
                  { label: "Bloque", action: () => insertSnippet("\n```\ncódigo\n```\n") },
                ].map(({ label, action }) => (
                  <button key={label} type="button"
                    onClick={() => { action(); setToolbarOpen(false); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-[11px] font-bold text-primary/70 hover:bg-primary/8 hover:text-primary transition-all">
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Herramientas completas — solo desktop */}
          <div className="hidden sm:flex flex-wrap items-center gap-1 px-2 py-1 bg-primary/5 border border-primary/10 rounded-xl flex-1">
            {[
              { label: "H1", snippet: "\n# Título\n" },
              { label: "H2", snippet: "\n## Subtítulo\n" },
              { label: "H3", snippet: "\n### Sección\n" },
            ].map(({ label, snippet }) => (
              <button key={label} type="button" onClick={() => insertSnippet(snippet)}
                className="px-2 py-1 rounded-lg text-[10px] font-black text-primary/50 hover:bg-primary/10 hover:text-primary transition-all">
                {label}
              </button>
            ))}
            <span className="w-px h-4 bg-primary/15 mx-0.5" />
            <button type="button" onClick={() => wrapSelection("**", "**")} title="Negrita (Ctrl+B)"
              className="px-2 py-1 rounded-lg text-[10px] font-black text-primary/50 hover:bg-primary/10 hover:text-primary transition-all">
              <strong>B</strong>
            </button>
            <button type="button" onClick={() => wrapSelection("*", "*")} title="Itálica (Ctrl+I)"
              className="px-2 py-1 rounded-lg text-[10px] italic text-primary/50 hover:bg-primary/10 hover:text-primary transition-all">
              I
            </button>
            <button type="button" onClick={() => wrapSelection("`", "`")} title="Código inline"
              className="px-2 py-1 rounded-lg text-[10px] font-mono text-primary/50 hover:bg-primary/10 hover:text-primary transition-all">
              {"</>"}
            </button>
            <span className="w-px h-4 bg-primary/15 mx-0.5" />
            <button type="button" onClick={() => insertSnippet("\n- elemento\n- elemento\n")}
              className="px-2 py-1 rounded-lg text-[10px] text-primary/50 hover:bg-primary/10 hover:text-primary transition-all">
              Lista
            </button>
            <button type="button" onClick={() => insertSnippet("\n---\n")}
              className="px-2 py-1 rounded-lg text-[10px] text-primary/50 hover:bg-primary/10 hover:text-primary transition-all">
              ─ ─
            </button>
            <button type="button"
              onClick={() => insertSnippet("\n| Col 1 | Col 2 | Col 3 |\n|---|---|---|\n| dato | dato | dato |\n")}
              className="px-2 py-1 rounded-lg text-[10px] text-primary/50 hover:bg-primary/10 hover:text-primary transition-all">
              Tabla
            </button>
            <button type="button" onClick={() => insertSnippet("\n```\ncódigo\n```\n")}
              className="px-2 py-1 rounded-lg text-[10px] text-primary/50 hover:bg-primary/10 hover:text-primary transition-all">
              Bloque
            </button>
          </div>

          {/* Modo vista — siempre visible */}
          <div className="flex items-center gap-0.5 bg-primary/5 border border-primary/10 rounded-xl p-1 shrink-0 ml-auto">
            {(["edit", "split", "preview"] as ViewMode[]).map((m) => {
              const Icon  = m === "edit" ? Edit3 : m === "preview" ? Eye : Columns;
              const title = m === "edit" ? "Editar" : m === "preview" ? "Vista" : "Dividir";
              const hideMobile = m === "split" ? "hidden sm:flex" : "flex";
              return (
                <button key={m} type="button" onClick={() => setMode(m)} title={title}
                  className={`${hideMobile} items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    mode === m ? "bg-primary text-btn-text shadow-sm" : "text-primary/40 hover:text-primary/70"
                  }`}>
                  <Icon size={11} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Área */}
      <div className={`flex gap-3 flex-1 min-h-0 ${mode === "split" ? "flex-row" : "flex-col"}`}>
        {(mode === "edit" || mode === "split") && (
          <textarea
            ref={taRef}
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={baseCls}
            style={{ minHeight: minH, overflowY: "auto" }}
          />
        )}
        {(mode === "preview" || mode === "split") && (
          <div
            className="flex-1 bg-input-bg border border-primary/15 rounded-xl px-5 py-4 overflow-y-auto prose-mundo"
            style={{ minHeight: minH }}
            dangerouslySetInnerHTML={{
              __html: html || `<p class="placeholder">${placeholder ?? "Vista previa…"}</p>`,
            }}
          />
        )}
      </div>

      {toolbar && (
        <p className="text-[10px] text-primary/25 font-mono">
          Markdown · <strong>Ctrl+B</strong> negrita · <strong>Ctrl+I</strong> itálica · <strong>Tab</strong> indentar
        </p>
      )}
    </div>
  );
}