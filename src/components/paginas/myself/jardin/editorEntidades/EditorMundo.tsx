"use client";

import React, { useState, useRef, useEffect } from "react";
import { Globe, Eye, Edit3, Columns } from "lucide-react";
import { MUNDO_SECTIONS, type MundoSectionKey } from "./types";
import { type SaveStatus } from "./types";
import { SaveIndicator } from "./UIComponents";

// ── Markdown renderer minimalista ──────────────────────────────────────────
function renderMarkdown(raw: string): string {
  let html = raw
    // Escape HTML básico
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bloques de código (``` ... ```)
  html = html.replace(/```([\s\S]*?)```/g, (_, code) => {
    const escaped = code.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    return `<pre><code>${escaped.trim()}</code></pre>`;
  });

  // Tablas GFM
  html = html.replace(/(?:^|\n)((?:\|[^\n]+\|\n)+)/g, (_, tableBlock) => {
    const rows = tableBlock.trim().split("\n").filter((r: string) => r.trim());
    if (rows.length < 2) return tableBlock;
    const isSeparator = (r: string) => /^\|[-| :]+\|$/.test(r.trim());
    let headerRow = rows[0];
    let bodyRows = rows.slice(1).filter((r: string) => !isSeparator(r));
    const parseCells = (row: string) =>
      row.split("|").slice(1, -1).map((c: string) => c.trim());
    const headers = parseCells(headerRow)
      .map((c: string) => `<th>${c}</th>`)
      .join("");
    const body = bodyRows
      .map((r: string) => `<tr>${parseCells(r).map((c: string) => `<td>${c}</td>`).join("")}</tr>`)
      .join("");
    return `\n<table><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table>\n`;
  });

  // Línea horizontal ---
  html = html.replace(/^---$/gm, "<hr/>");

  // Encabezados
  html = html.replace(/^######\s(.+)$/gm, "<h6>$1</h6>");
  html = html.replace(/^#####\s(.+)$/gm, "<h5>$1</h5>");
  html = html.replace(/^####\s(.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^###\s(.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^##\s(.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^#\s(.+)$/gm, "<h1>$1</h1>");

  // Negrita e itálica
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Código inline
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Listas sin orden
  html = html.replace(/((?:^- .+\n?)+)/gm, (block) => {
    const items = block.trim().split("\n").map((l: string) => `<li>${l.replace(/^- /, "")}</li>`).join("");
    return `<ul>${items}</ul>`;
  });

  // Párrafos (líneas vacías como separador)
  html = html
    .split(/\n{2,}/)
    .map((block: string) => {
      if (/^<(h[1-6]|ul|ol|li|pre|table|hr|blockquote)/.test(block.trim())) return block;
      const inner = block.trim().replace(/\n/g, "<br/>");
      return inner ? `<p>${inner}</p>` : "";
    })
    .join("\n");

  return html;
}

// ── Placeholders ───────────────────────────────────────────────────────────
const SECTION_PLACEHOLDERS: Record<MundoSectionKey, string> = {
  magia:     "Sistema de magia, reglas, fuentes de poder, limitaciones…\n\nPuedes usar **Markdown**: tablas, encabezados, listas, bloques de código, etc.",
  geografia: "Continentes, mares, climas, fronteras del mundo…",
  historia:  "Grandes eras, eventos fundacionales, cronología del mundo…",
};

// ── Modos de vista ─────────────────────────────────────────────────────────
type ViewMode = "edit" | "preview" | "split";

// ── Componente principal ───────────────────────────────────────────────────
export function EditorMundo({
  activeSection,
  textos,
  onTextoChange,
  onSave,
}: {
  activeSection: MundoSectionKey;
  textos: Record<MundoSectionKey, string>;
  onTextoChange: (section: MundoSectionKey, value: string) => void;
  onSave: (section: MundoSectionKey) => Promise<void>;
}) {
  const [status, setStatus]     = useState<SaveStatus>("idle");
  const [mode, setMode]         = useState<ViewMode>("split");
  const textareaRef             = useRef<HTMLTextAreaElement>(null);

  const current     = MUNDO_SECTIONS.find(s => s.key === activeSection)!;
  const SectionIcon = current.Icon;
  const text        = textos[activeSection];

  const handleSave = async () => {
    setStatus("saving");
    try {
      await onSave(activeSection);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (e) {
      console.error("[EditorMundo] Error al guardar:", e);
      setStatus("error");
    }
  };

  // Atajos de teclado útiles en el textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = textareaRef.current;
    if (!ta) return;

    // Tab → 2 espacios
    if (e.key === "Tab") {
      e.preventDefault();
      const { selectionStart: s, selectionEnd: end } = ta;
      const newVal = text.slice(0, s) + "  " + text.slice(end);
      onTextoChange(activeSection, newVal);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 2; });
    }

    // Ctrl/Cmd + B → **negrita**
    if ((e.ctrlKey || e.metaKey) && e.key === "b") {
      e.preventDefault();
      wrapSelection(ta, "**", "**");
    }

    // Ctrl/Cmd + I → *itálica*
    if ((e.ctrlKey || e.metaKey) && e.key === "i") {
      e.preventDefault();
      wrapSelection(ta, "*", "*");
    }
  };

  const wrapSelection = (ta: HTMLTextAreaElement, before: string, after: string) => {
    const { selectionStart: s, selectionEnd: e } = ta;
    const selected = text.slice(s, e) || "texto";
    const newVal   = text.slice(0, s) + before + selected + after + text.slice(e);
    onTextoChange(activeSection, newVal);
    requestAnimationFrame(() => {
      ta.selectionStart = s + before.length;
      ta.selectionEnd   = s + before.length + selected.length;
      ta.focus();
    });
  };

  const insertSnippet = (snippet: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const newVal = text.slice(0, s) + snippet + text.slice(e);
    onTextoChange(activeSection, newVal);
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = s + snippet.length;
      ta.focus();
    });
  };

  const sharedTextareaClass =
    "flex-1 w-full bg-input-bg text-input-text border border-primary/15 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/40 placeholder:text-primary/20 resize-none transition-colors font-mono leading-relaxed";

  const previewHtml = renderMarkdown(text);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-6 gap-4">

      {/* ── Cabecera ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary/8 border border-primary/15">
            <SectionIcon size={18} className="text-primary/60" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-primary">{current.label}</h2>
            <p className="text-[10px] text-primary/35">Worldbuilding · {current.label}</p>
          </div>
        </div>

        {/* Toggle de modo */}
        <div className="flex items-center gap-1 bg-primary/5 border border-primary/10 rounded-xl p-1">
          {(["edit", "split", "preview"] as ViewMode[]).map((m) => {
            const Icon  = m === "edit" ? Edit3 : m === "preview" ? Eye : Columns;
            const label = m === "edit" ? "Editar" : m === "preview" ? "Vista" : "Dividir";
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                title={label}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  mode === m
                    ? "bg-primary text-btn-text shadow-sm"
                    : "text-primary/40 hover:text-primary/70"
                }`}
              >
                <Icon size={11} /> {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Barra de herramientas Markdown ── */}
      {mode !== "preview" && (
        <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 bg-primary/5 border border-primary/10 rounded-xl">
          {[
            { label: "H1", snippet: "\n# Título\n" },
            { label: "H2", snippet: "\n## Subtítulo\n" },
            { label: "H3", snippet: "\n### Sección\n" },
          ].map(({ label, snippet }) => (
            <button key={label} onClick={() => insertSnippet(snippet)}
              className="px-2 py-1 rounded-lg text-[10px] font-black text-primary/50 hover:bg-primary/10 hover:text-primary transition-all">
              {label}
            </button>
          ))}
          <span className="w-px h-4 bg-primary/15 mx-1" />
          <button onClick={() => { const ta = textareaRef.current; if (ta) wrapSelection(ta, "**", "**"); }}
            className="px-2 py-1 rounded-lg text-[10px] font-black text-primary/50 hover:bg-primary/10 hover:text-primary transition-all" title="Negrita (Ctrl+B)">
            <strong>B</strong>
          </button>
          <button onClick={() => { const ta = textareaRef.current; if (ta) wrapSelection(ta, "*", "*"); }}
            className="px-2 py-1 rounded-lg text-[10px] italic text-primary/50 hover:bg-primary/10 hover:text-primary transition-all" title="Itálica (Ctrl+I)">
            I
          </button>
          <button onClick={() => { const ta = textareaRef.current; if (ta) wrapSelection(ta, "`", "`"); }}
            className="px-2 py-1 rounded-lg text-[10px] font-mono text-primary/50 hover:bg-primary/10 hover:text-primary transition-all" title="Código inline">
            {"</>"}
          </button>
          <span className="w-px h-4 bg-primary/15 mx-1" />
          <button onClick={() => insertSnippet("\n- elemento\n- elemento\n- elemento\n")}
            className="px-2 py-1 rounded-lg text-[10px] text-primary/50 hover:bg-primary/10 hover:text-primary transition-all">
            Lista
          </button>
          <button onClick={() => insertSnippet("\n---\n")}
            className="px-2 py-1 rounded-lg text-[10px] text-primary/50 hover:bg-primary/10 hover:text-primary transition-all">
            ─ ─ ─
          </button>
          <button onClick={() => insertSnippet("\n| Col 1 | Col 2 | Col 3 |\n|---|---|---|\n| dato | dato | dato |\n| dato | dato | dato |\n")}
            className="px-2 py-1 rounded-lg text-[10px] text-primary/50 hover:bg-primary/10 hover:text-primary transition-all">
            Tabla
          </button>
          <button onClick={() => insertSnippet("\n```\ncódigo aquí\n```\n")}
            className="px-2 py-1 rounded-lg text-[10px] text-primary/50 hover:bg-primary/10 hover:text-primary transition-all">
            Bloque
          </button>
        </div>
      )}

      {/* ── Área de edición / vista previa ── */}
      <div className={`flex gap-4 flex-1 min-h-[400px] ${mode === "split" ? "flex-row" : "flex-col"}`}>

        {/* Editor */}
        {(mode === "edit" || mode === "split") && (
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => onTextoChange(activeSection, e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={SECTION_PLACEHOLDERS[activeSection]}
            className={sharedTextareaClass + (mode === "split" ? " min-h-[400px]" : " min-h-[400px]")}
          />
        )}

        {/* Vista previa */}
        {(mode === "preview" || mode === "split") && (
          <div
            className="flex-1 min-h-[400px] bg-input-bg border border-primary/15 rounded-xl px-5 py-4 overflow-y-auto prose-mundo"
            dangerouslySetInnerHTML={{ __html: previewHtml || `<p class="placeholder">La vista previa aparece aquí…</p>` }}
          />
        )}
      </div>

      {/* ── Pie: guardar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[10px] text-primary/25 font-mono">
          Markdown activo · <strong>Ctrl+B</strong> negrita · <strong>Ctrl+I</strong> itálica · <strong>Tab</strong> indentación
        </p>
        <div className="flex items-center gap-3">
          <SaveIndicator status={status} />
          <button
            onClick={handleSave}
            disabled={status === "saving"}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
          >
            <Globe size={11} /> Guardar {current.label}
          </button>
        </div>
      </div>

      {/* ── Estilos de la vista previa ── */}
      <style>{`
        .prose-mundo h1 { font-size: 1.4rem; font-weight: 900; margin: 1rem 0 .4rem; letter-spacing: .15em; text-transform: uppercase; color: var(--color-primary, #7c6af7); border-bottom: 2px solid color-mix(in srgb, var(--color-primary, #7c6af7) 20%, transparent); padding-bottom: .3rem; }
        .prose-mundo h2 { font-size: 1.1rem; font-weight: 800; margin: .9rem 0 .35rem; letter-spacing: .1em; text-transform: uppercase; color: color-mix(in srgb, var(--color-primary, #7c6af7) 80%, white); }
        .prose-mundo h3 { font-size: .9rem; font-weight: 700; margin: .7rem 0 .25rem; color: color-mix(in srgb, var(--color-primary, #7c6af7) 60%, white); }
        .prose-mundo p  { margin: .45rem 0; font-size: .85rem; line-height: 1.65; color: var(--color-input-text, #d1c9ff); }
        .prose-mundo strong { font-weight: 800; color: var(--color-primary, #7c6af7); }
        .prose-mundo em     { font-style: italic; opacity: .85; }
        .prose-mundo hr { border: none; border-top: 1px solid color-mix(in srgb, var(--color-primary, #7c6af7) 20%, transparent); margin: .9rem 0; }
        .prose-mundo ul { list-style: none; padding-left: 1rem; margin: .4rem 0; }
        .prose-mundo ul li { position: relative; padding-left: .8rem; font-size: .82rem; margin: .2rem 0; color: var(--color-input-text, #d1c9ff); }
        .prose-mundo ul li::before { content: "◈"; position: absolute; left: -.2rem; font-size: .6rem; color: var(--color-primary, #7c6af7); top: .2rem; }
        .prose-mundo table { width: 100%; border-collapse: collapse; font-size: .78rem; margin: .6rem 0; }
        .prose-mundo th { background: color-mix(in srgb, var(--color-primary, #7c6af7) 15%, transparent); color: var(--color-primary, #7c6af7); font-weight: 800; text-transform: uppercase; letter-spacing: .08em; padding: .4rem .7rem; border: 1px solid color-mix(in srgb, var(--color-primary, #7c6af7) 20%, transparent); text-align: left; }
        .prose-mundo td { padding: .35rem .7rem; border: 1px solid color-mix(in srgb, var(--color-primary, #7c6af7) 12%, transparent); color: var(--color-input-text, #d1c9ff); }
        .prose-mundo tr:nth-child(even) td { background: color-mix(in srgb, var(--color-primary, #7c6af7) 5%, transparent); }
        .prose-mundo pre { background: color-mix(in srgb, var(--color-primary, #7c6af7) 8%, transparent); border: 1px solid color-mix(in srgb, var(--color-primary, #7c6af7) 15%, transparent); border-radius: .6rem; padding: .7rem 1rem; margin: .5rem 0; overflow-x: auto; }
        .prose-mundo code { font-family: 'Fira Code', 'Courier New', monospace; font-size: .78rem; color: color-mix(in srgb, var(--color-primary, #7c6af7) 90%, white); }
        .prose-mundo pre code { color: color-mix(in srgb, var(--color-primary, #7c6af7) 70%, white); line-height: 1.6; }
        .prose-mundo .placeholder { color: color-mix(in srgb, var(--color-primary, #7c6af7) 25%, transparent); font-style: italic; }
      `}</style>
    </div>
  );
}