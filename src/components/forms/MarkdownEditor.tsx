"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Eye, Edit3, Columns, Search, Replace, X, ChevronUp, ChevronDown } from "lucide-react";
import { parseContenido, parseSections } from "@/components/paginas/garlia/libros/leer/type";
import { RenderSegmentos }               from "@/components/paginas/garlia/libros/leer/segmentos/ContenidoInteractivo";

// ── Slug helper for heading IDs ─────────────────────────────────────────────
function slugify(text: string): string {
  const slug = text.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/[\s]+/g, "-");
  return slug || "header-" + Math.random().toString(36).substr(2, 5); // Evita strings vacíos
}

// ── Callout config ───────────────────────────────────────────────────────────
const CALLOUT_MAP: Record<string, { cls: string; icon: string; label: string }> = {
  NOTE:    { cls: "callout-note",    icon: "📝", label: "Note" },
  TIP:     { cls: "callout-tip",     icon: "💡", label: "Tip" },
  WARNING: { cls: "callout-warning", icon: "⚠️",  label: "Warning" },
  DANGER:  { cls: "callout-danger",  icon: "🔴", label: "Danger" },
  ERROR:   { cls: "callout-danger",  icon: "❌", label: "Error" },
  SUCCESS: { cls: "callout-success", icon: "✅", label: "Success" },
  INFO:    { cls: "callout-info",    icon: "ℹ️",  label: "Info" },
};

// ── Renderer ─────────────────────────────────────────────────────────────────
export function renderMarkdown(raw: string): string {
  // ── helpers inline (aplicados a texto suelto, no a bloques HTML) ─────────
  const applyInline = (text: string): string => {
    text = text.replace(/!\[([^\]]*)\]\(([^)]*)\)/g, '<img src="$2" alt="$1" />');
    text = text.replace(/\[([^\]]+)\]\(([^)]*)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    text = text.replace(/\[\[([^\]|#]+?)(?:\|([^\]]+))?\]\]/g, (_, target, alias) => {
      const label = alias?.trim() || target.trim();
      const safeTarget = target.trim().replace(/"/g, '&quot;');
      return `<a class="wikilink" data-wikilink="${safeTarget}" href="javascript:void(0)" title="Ir a: ${safeTarget}">${label}</a>`;
    });
    text = text.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
    text = text.replace(/\*\*(.+?)\*\*/g,     "<strong>$1</strong>");
    text = text.replace(/\*(.+?)\*/g,          "<em>$1</em>");
    text = text.replace(/`([^`]+)`/g,           "<code>$1</code>");
    text = text.replace(/~~(.+?)~~/g,           "<del>$1</del>");
    text = text.replace(/==(.+?)==/g,           '<mark class="md-mark">$1</mark>');
    text = text.replace(/\^([^\^\n]+?)\^/g,     "<sup>$1</sup>");
    text = text.replace(/(?<!~)~([^~\n]+?)~(?!~)/g, "<sub>$1</sub>");
    text = text.replace(/\$\$([^$]+?)\$\$/g, (_, expr) =>
      `<span class="math-block" data-expr="${expr.trim().replace(/"/g,'&quot;')}"></span>`);
    text = text.replace(/\$([^$\n]+?)\$/g, (_, expr) =>
      `<span class="math-inline" data-expr="${expr.trim().replace(/"/g,'&quot;')}"></span>`);
    return text;
  };

  // ── Heading helpers ───────────────────────────────────────────────────────
  const headingCounter: Record<string, number> = {};
  const tocEntries: { level: number; text: string; id: string }[] = [];
  const makeHeading = (level: number, rawText: string): string => {
  if (!rawText.trim()) return `<h${level}>${"#".repeat(level)} </h${level}>`;
    const text = applyInline(rawText.trim());
    const base = slugify(rawText.trim());
    headingCounter[base] = (headingCounter[base] || 0) + 1;
    const id = headingCounter[base] > 1 ? `${base}-${headingCounter[base]}` : base;
    if (level <= 4) tocEntries.push({ level, text: rawText.trim(), id });
    return `<h${level} id="${id}">${text}<a class="heading-anchor" href="#${id}" aria-label="Enlace a sección" tabindex="-1">#</a></h${level}>`;
    
  };

  // ── Tabla helper ──────────────────────────────────────────────────────────
  const renderTable = (lines: string[]): string => {
    const isSep = (r: string) => /^\|[-| :]+\|$/.test(r.trim());
    const parse = (row: string) => row.split("|").slice(1, -1).map((c: string) => applyInline(c.trim()));
    const headers = parse(lines[0]).map(c => `<th>${c}</th>`).join("");
    const body = lines.slice(1).filter(r => !isSep(r))
      .map(r => `<tr>${parse(r).map(c => `<td>${c}</td>`).join("")}</tr>`).join("");
    return `<table><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table>`;
  };

  // ── Callout helper ────────────────────────────────────────────────────────
  const renderCallout = (lines: string[]): string => {
    const inner = lines.map(l => l.replace(/^>\s?/, ""));
    const firstLine = inner[0] || "";
    const calloutMatch = firstLine.match(/^\[!(NOTE|TIP|WARNING|DANGER|ERROR|SUCCESS|INFO)\]\s*(.*)?$/i);
    if (calloutMatch) {
      const key = calloutMatch[1].toUpperCase();
      const cfg = CALLOUT_MAP[key];
      const titleExtra = calloutMatch[2] ? calloutMatch[2] : cfg.label;
      const body = inner.slice(1).map(applyInline).join("<br/>");
      return `<div class="callout ${cfg.cls}"><div class="callout-title"><span class="callout-title-icon">${cfg.icon}</span>${titleExtra}</div>${body ? `<div class="callout-body">${body}</div>` : ""}</div>`;
    }
    return `<blockquote>${inner.map(applyInline).join("<br/>")}</blockquote>`;
  };

  // ── List item helper ──────────────────────────────────────────────────────
  const renderListItem = (content: string): string => {
    const taskMatch = content.match(/^\[([ xX])\] (.*)/);
    if (taskMatch) {
      const checked = taskMatch[1].trim().toLowerCase() === 'x' ? 'checked' : '';
      return `<li class="task-list-item"><input type="checkbox" class="task-list-checkbox" disabled ${checked} /><span>${applyInline(taskMatch[2])}</span></li>`;
    }
    return `<li>${applyInline(content)}</li>`;
  };

  // ── TOC placeholder ───────────────────────────────────────────────────────
  const hasTOC = /\[\[toc\]\]/i.test(raw);

  // ── Line-by-line block parser ─────────────────────────────────────────────
  const lines = raw.split("\n");
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith(":::links")) {
      const customTitle = line.trim().replace(":::links", "").trim() || "ENLACES";
      const linkLines: string[] = [];
      i++; 
      while (i < lines.length && !lines[i].trim().startsWith(":::")) {
        if (lines[i].trim() !== "") linkLines.push(lines[i].trim());
        i++;
      }
      i++; 
      const linksHtml = linkLines.map(link => {
        const href = link.startsWith('http') ? link : `https://${link}`;
        return `<li><a href="${href}" target="_blank" rel="noopener noreferrer">${link}</a></li>`;
      }).join('');

      output.push(`
        <div class="callout link-list-block">
          <div class="callout-title"><span class="callout-title-icon"></span> ${customTitle}</div>
          <div class="callout-body"><ul>${linksHtml}</ul></div>
        </div>`);
      continue;
    }

    // blank line → skip
    if (line.trim() === "") { i++; continue; }

    // fenced code block ```
    if (line.trimStart().startsWith("```")) {
      const fence = line.trimStart().match(/^(`+)/)?.[1] ?? "```";
      const lang = line.trimStart().slice(fence.length).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith(fence)) {
        codeLines.push(lines[i]
          .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
        i++;
      }
      i++; // consume closing fence
      const langAttr = lang ? ` class="language-${lang}"` : "";
      output.push(`<pre><code${langAttr}>${codeLines.join("\n")}</code></pre>`);
      continue;
    }

    // [[TOC]]
    if (/^\[\[toc\]\]\s*$/i.test(line.trim())) {
      output.push("\x00TOC\x00");
      i++; continue;
    }

    // hr ---
    if (/^---+$/.test(line.trim())) {
      output.push("<hr/>");
      i++; continue;
    }

    // headings #
const hMatch = line.match(/^(#{1,6})(?:\s+(.*))?$/);
if (hMatch) {
  const level = hMatch[1].length;
  const content = hMatch[2] || ""; // Si es solo "# ", el contenido es ""
  output.push(makeHeading(level, content));
  i++; 
  continue; // Muy importante para saltar a la siguiente línea
}
    // table |
    if (line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length >= 2) {
        output.push(renderTable(tableLines));
      } else {
        output.push(`<p>${applyInline(tableLines[0])}</p>`);
      }
      continue;
    }

    // blockquote / callout >
    if (line.trimStart().startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith(">")) {
        quoteLines.push(lines[i].trimStart().slice(1));
        i++;
      }
      output.push(renderCallout(quoteLines));
      continue;
    }

    // ordered list 1.
    if (/^[ \t]*\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[ \t]*\d+\.\s/.test(lines[i])) {
        items.push(renderListItem(lines[i].replace(/^[ \t]*\d+\.\s/, "")));
        i++;
      }
      output.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    // unordered list -
    if (/^[ \t]*-\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[ \t]*-\s/.test(lines[i])) {
        items.push(renderListItem(lines[i].replace(/^[ \t]*-\s/, "")));
        i++;
      }
      output.push(`<ul>${items.join("")}</ul>`);
      continue;
    }




    // ── BLOQUE DE LINKS PERSONALIZADO ───────────────────────────────────────
    if (line.trim().startsWith(":::links")) {
      // Capturamos el nombre: si pones ":::links Mis Webs", el nombre será "Mis Webs"
      // Si no pones nada, por defecto dirá "ENLACES"
      const customTitle = line.trim().replace(":::links", "").trim() || "ENLACES";
      
      const linkLines: string[] = [];
      i++; 
      while (i < lines.length && !lines[i].trim().startsWith(":::")) {
        if (lines[i].trim() !== "") linkLines.push(lines[i].trim());
        i++;
      }
      i++; 
      
      const linksHtml = linkLines.map(link => {
        const href = link.startsWith('http') ? link : `https://${link}`;
        return `<li><a href="${href}" target="_blank" rel="noopener noreferrer">${link}</a></li>`;
      }).join('');

      output.push(`
        <div class="callout link-list-block">
          <div class="callout-title"><span class="callout-title-icon"></span> ${customTitle}</div>
          <div class="callout-body"><ul>${linksHtml}</ul></div>
        </div>`);
      continue;
    }

    // paragraph — collect consecutive non-blank, non-block lines
const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].trimStart().startsWith("```") &&
      !lines[i].trim().startsWith(":::links") &&
      !/^\[\[toc\]\]\s*$/i.test(lines[i].trim()) &&
      !/^---+$/.test(lines[i].trim()) &&
      !/^(#{1,6})(\s|$)/.test(lines[i]) && // Coincide con el Heading
      !lines[i].trim().startsWith("|") &&
      !lines[i].trimStart().startsWith(">") &&
      !/^[ \t]*\d+\.\s/.test(lines[i]) &&
      !/^[ \t]*-\s/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }

    if (paraLines.length > 0) {
      output.push(`<p>${applyInline(paraLines.join("<br/>"))}</p>`);
    } else {
      if (i < lines.length && output.length === output.length) { 
      }
    }
  }

  // ── Inject TOC ────────────────────────────────────────────────────────────
  let html = output.join("\n");
  if (hasTOC) {
    let tocHtml: string;
    if (tocEntries.length > 0) {
      tocHtml = `<nav class="toc"><div class="toc-title">Índice</div><ol>`;
      let prevLevel = tocEntries[0].level;
      tocEntries.forEach(entry => {
        if (entry.level > prevLevel) tocHtml += "<ol>";
        else if (entry.level < prevLevel) tocHtml += "</ol>";
        tocHtml += `<li><a href="#${entry.id}">${entry.text}</a></li>`;
        prevLevel = entry.level;
      });
      tocHtml += `</ol></nav>`;
    } else {
      tocHtml = `<nav class="toc toc-empty"></nav>`;
    }
    html = html.replace(/\x00TOC\x00/g, tocHtml);
  }

  return html;
}

// ── Renderizar fórmulas KaTeX en el DOM ──────────────────────────────────────
export function renderMathInElement(el: HTMLElement | null) {
  if (!el) return;
  // Cargamos KaTeX dinámicamente solo si hay math
  const mathEls = el.querySelectorAll<HTMLElement>(".math-inline, .math-block");
  if (!mathEls.length) return;

  const render = (katex: any) => {
    mathEls.forEach(span => {
      const expr = span.getAttribute("data-expr") || "";
      const displayMode = span.classList.contains("math-block");
      try {
        span.innerHTML = katex.renderToString(expr, {
          displayMode,
          throwOnError: false,
          output: "html",
        });
        span.removeAttribute("data-expr");
      } catch {
        span.textContent = expr;
      }
    });
  };

  if ((window as any).katex) {
    render((window as any).katex);
  } else {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js";
    script.onload = () => render((window as any).katex);
    document.head.appendChild(script);
  }
}

// ── Estilos de vista previa ──────────────────────────────────────────────────
export const PROSE_STYLES = `
  .prose-mundo h1 { font-size:1.2rem;font-weight:800;margin:.8rem 0 .3rem;letter-spacing:.02em;color:color-mix(in srgb,var(--color-primary,#7c6af7) 90%,white);padding-bottom:.2rem;border-bottom:1px solid color-mix(in srgb,var(--color-primary,#7c6af7) 18%,transparent) }
  .prose-mundo h2 { font-size:.95rem;font-weight:800;margin:.7rem 0 .25rem;letter-spacing:.03em;color:color-mix(in srgb,var(--color-primary,#7c6af7) 80%,white) }
  .prose-mundo h3 { font-size:.82rem;font-weight:700;margin:.55rem 0 .2rem;letter-spacing:.02em;color:color-mix(in srgb,var(--color-primary,#7c6af7) 65%,white) }
  .prose-mundo h4 { font-size:.76rem;font-weight:700;margin:.5rem 0 .15rem;color:color-mix(in srgb,var(--color-primary,#7c6af7) 55%,white) }
  .prose-mundo h5 { font-size:.72rem;font-weight:600;margin:.45rem 0 .12rem;color:color-mix(in srgb,var(--color-primary,#7c6af7) 45%,white) }
  .prose-mundo h6 { font-size:.68rem;font-weight:600;margin:.4rem 0 .1rem;text-transform:uppercase;letter-spacing:.08em;color:color-mix(in srgb,var(--color-primary,#7c6af7) 38%,white) }
  .prose-mundo p  { margin:.3rem 0;font-size:.75rem;line-height:1.6;color:var(--color-input-text,#d1c9ff) }
  .prose-mundo strong { font-weight:800;color:var(--color-primary,#7c6af7) }
  .prose-mundo em     { font-style:italic;opacity:.85 }
  .prose-mundo hr { border:none;border-top:1px solid color-mix(in srgb,var(--color-primary,#7c6af7) 20%,transparent);margin:.9rem 0 }
  .prose-mundo a { color:var(--color-primary,#7c6af7);text-decoration:underline;text-underline-offset:3px;transition:opacity 0.2s; }
  .prose-mundo a:hover { opacity:0.8; }
  .prose-mundo img { max-width:100%;height:auto;border-radius:0.5rem;margin:0.5rem 0;border:1px solid color-mix(in srgb,var(--color-primary,#7c6af7) 15%,transparent); }
  .prose-mundo ul { list-style:none;padding-left:1rem;margin:.3rem 0 }
  .prose-mundo ul li { position:relative;padding-left:.8rem;font-size:.72rem;margin:.15rem 0;color:var(--color-input-text,#d1c9ff) }
  .prose-mundo ul li::before { content: "⋆"; position: absolute; left: -1.4rem; font-size: 1.6rem; color: var(--color-primary, #7c6af7); top: -0.2rem; line-height: 1; }
  .prose-mundo ul li::before { content: "⋆"; position: absolute; left: -0.1rem; font-size: 1.6rem; color: var(--color-primary, #7c6af7); top: -0.3rem; line-height: 1; }
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
  .prose-mundo ol { list-style:none;padding-left:1.2rem;margin:.3rem 0;counter-reset:ol-counter }
  .prose-mundo ol li { position:relative;padding-left:.8rem;font-size:.72rem;margin:.15rem 0;color:var(--color-input-text,#d1c9ff);counter-increment:ol-counter }
  .prose-mundo ol li::before { content:counter(ol-counter)".";position:absolute;left:-1rem;font-size:.65rem;font-weight:800;color:var(--color-primary,#7c6af7);font-family:var(--font-mono) }
  .prose-mundo blockquote { border-left:3px solid var(--color-primary,#7c6af7);margin:.45rem 0;padding:.3rem .6rem .3rem .8rem;background:color-mix(in srgb,var(--color-primary,#7c6af7) 6%,transparent);border-radius:0 .4rem .4rem 0;font-style:italic;color:color-mix(in srgb,var(--color-input-text,#d1c9ff) 80%,transparent);font-size:.72rem;line-height:1.55 }
  .prose-mundo mark.md-mark { background:color-mix(in srgb,#f7d76a 25%,transparent);color:color-mix(in srgb,#f7d76a 90%,white);border-radius:2px;padding:0 2px }
  .prose-mundo sup { font-size:.65em;vertical-align:super;color:color-mix(in srgb,var(--color-primary,#7c6af7) 80%,white);font-weight:700 }
  .prose-mundo sub { font-size:.65em;vertical-align:sub;color:color-mix(in srgb,var(--color-primary,#7c6af7) 70%,white) }
  .prose-mundo del { text-decoration:line-through;opacity:.5 }
  .prose-mundo .math-inline,.prose-mundo .math-block { color:color-mix(in srgb,var(--color-primary,#7c6af7) 85%,white) }
  .prose-mundo .math-block { display:block;text-align:center;margin:.8rem 0;font-size:1.05em }
  .katex { font-size:1em !important }
  /* ── Callouts ─────────────────────────────────────────────────────────────── */
  .prose-mundo .callout { border-radius:.5rem;padding:.6rem 1rem;margin:.6rem 0;border-left:4px solid;display:flex;flex-direction:column;gap:.2rem;font-size:.83rem;line-height:1.6 }
  .prose-mundo .callout-title { display:flex;align-items:center;gap:.4rem;font-weight:800;font-size:.78rem;letter-spacing:.08em;text-transform:uppercase }
  .prose-mundo .callout-title-icon { font-size:1rem;line-height:1 }
  .prose-mundo .callout-body { color:inherit;opacity:.9 }

  .prose-mundo .callout-note    { background:var(--callout-note-bg);    border-color:var(--callout-note-border);    color:var(--callout-note-text) }
  .prose-mundo .callout-note    .callout-title { color:var(--callout-note-title) }
  .prose-mundo .callout-tip     { background:var(--callout-tip-bg);     border-color:var(--callout-tip-border);     color:var(--callout-tip-text) }
  .prose-mundo .callout-tip     .callout-title { color:var(--callout-tip-title) }
  .prose-mundo .callout-warning { background:var(--callout-warning-bg); border-color:var(--callout-warning-border); color:var(--callout-warning-text) }
  .prose-mundo .callout-warning .callout-title { color:var(--callout-warning-title) }
  .prose-mundo .callout-danger  { background:var(--callout-danger-bg);  border-color:var(--callout-danger-border);  color:var(--callout-danger-text) }
  .prose-mundo .callout-danger  .callout-title { color:var(--callout-danger-title) }
  .prose-mundo .callout-success { background:var(--callout-success-bg); border-color:var(--callout-success-border); color:var(--callout-success-text) }
  .prose-mundo .callout-success .callout-title { color:var(--callout-success-title) }
  .prose-mundo .callout-info    { background:var(--callout-info-bg);    border-color:var(--callout-info-border);    color:var(--callout-info-text) }
  .prose-mundo .callout-info    .callout-title { color:var(--callout-info-title) }
  /* ── TOC ─────────────────────────────────────────────────────────────────── */
  .prose-mundo .toc { background:color-mix(in srgb,var(--color-primary,#7c6af7) 6%,transparent);border:1px solid color-mix(in srgb,var(--color-primary,#7c6af7) 18%,transparent);border-radius:.5rem;padding:.6rem 1rem;margin:.6rem 0;font-size:.78rem }
  .prose-mundo .toc-title { font-weight:800;font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;color:var(--color-primary,#7c6af7);margin-bottom:.35rem;display:flex;align-items:center;gap:.35rem }
  .prose-mundo .toc ol { padding-left:1rem;margin:.15rem 0;counter-reset:none;list-style:decimal }
  .prose-mundo .toc ol li { padding-left:0;font-size:.76rem;margin:.12rem 0;color:color-mix(in srgb,var(--color-input-text,#d1c9ff) 80%,transparent) }
  .prose-mundo .toc ol li::before { display:none }
  .prose-mundo .toc ol ol { padding-left:1.2rem;list-style:lower-alpha }
  .prose-mundo .toc a { color:color-mix(in srgb,var(--color-primary,#7c6af7) 75%,white);text-decoration:none;transition:color .15s }
  .prose-mundo .toc a:hover { color:var(--color-primary,#7c6af7) }
  .prose-mundo h1[id],
  .prose-mundo h2[id],
  .prose-mundo h3[id],
  .prose-mundo h4[id] { scroll-margin-top:1rem }
  /* ── Heading anchors ────────────────────────────────────────────────────── */
  .prose-mundo h1, .prose-mundo h2, .prose-mundo h3,
  .prose-mundo h4, .prose-mundo h5, .prose-mundo h6 { position:relative; }
  .prose-mundo .heading-anchor { opacity:0; margin-left:.4rem; font-size:.7em; font-weight:400; color:color-mix(in srgb,var(--color-primary,#7c6af7) 50%,transparent); text-decoration:none; vertical-align:middle; transition:opacity 0.15s; user-select:none; }
  .prose-mundo h1:hover .heading-anchor,
  .prose-mundo h2:hover .heading-anchor,
  .prose-mundo h3:hover .heading-anchor,
  .prose-mundo h4:hover .heading-anchor { opacity:1; }
  .prose-mundo .heading-anchor:hover { color:var(--color-primary,#7c6af7); }
  /* ── Table editor hint ──────────────────────────────────────────────────── */
  .prose-mundo table { cursor:pointer; transition:outline 0.12s; }
  .prose-mundo table:hover { outline:2px solid color-mix(in srgb,var(--color-primary,#7c6af7) 40%,transparent); border-radius:4px; }
  /* ── Wikilinks ──────────────────────────────────────────────────────────── */
  .prose-mundo a.wikilink { color:var(--accent,#7c6af7);text-decoration:none;border-bottom:1px dashed color-mix(in srgb,var(--accent,#7c6af7) 50%,transparent);padding-bottom:1px;cursor:pointer;transition:all 0.15s }
  .prose-mundo a.wikilink:hover { border-bottom-style:solid;background:color-mix(in srgb,var(--accent,#7c6af7) 8%,transparent);border-radius:2px }
  .prose-mundo .link-list-block { 
    background: color-mix(in srgb, var(--color-primary, #7c6af7) 8%, transparent); 
    border-color: color-mix(in srgb, var(--color-primary, #7c6af7) 30%, transparent); 
  }
  .prose-mundo .link-list-block ul { list-style: none; padding: 0; margin: 0.3rem 0 0 0; }
  .prose-mundo .link-list-block li { margin: 0.3rem 0; padding-left: 1.2rem; position: relative; }
  .prose-mundo .link-list-block li::before { 
    content: "›"; position: absolute; left: 0.2rem; font-size: 1.2rem; 
    line-height: 0.8; color: var(--color-primary, #7c6af7); font-weight: bold; 
  }
  .prose-mundo .link-list-block a { 
    font-weight: 600; word-break: break-all; text-decoration: none; 
    color: color-mix(in srgb, var(--color-input-text, #d1c9ff) 90%, white); 
  }
  .prose-mundo .link-list-block a:hover { 
    color: var(--color-primary, #7c6af7); text-decoration: underline;
`;

// ── Command menu items ────────────────────────────────────────────────────────
export interface CommandItem {
  id: string;
  label: string;
  description: string;
  keywords: string[];   // palabras que activan el match
  icon: string;
  snippet?: string;
  action?: () => void;
  cursorOffset?: number; // posición del cursor después de insertar (desde el final)
}

const COMMAND_ITEMS: CommandItem[] = [
  {
    id: "codeblock",
    label: "Bloque de código",
    description: "Inserta un bloque ```código```",
    keywords: ["cod", "code", "bloc", "bloque", "pre"],
    icon: "</>",
    snippet: "\n```\n\n```\n",
    cursorOffset: 5, // coloca cursor dentro del bloque
  },
  {
    id: "heading1",
    label: "Título H1",
    description: "# Encabezado grande",
    keywords: ["h1", "tit", "titulo", "título", "head"],
    icon: "H1",
    snippet: "\n# ",
  },
  {
    id: "heading2",
    label: "Título H2",
    description: "## Encabezado mediano",
    keywords: ["h2", "tit", "titulo", "título", "head"],
    icon: "H2",
    snippet: "\n## ",
  },
  {
    id: "heading3",
    label: "Título H3",
    description: "### Encabezado pequeño",
    keywords: ["h3", "tit", "titulo", "título", "head"],
    icon: "H3",
    snippet: "\n### ",
  },
  {
    id: "table",
    label: "Tabla",
    description: "Inserta una tabla markdown",
    keywords: ["tab", "table", "tabla", "grid"],
    icon: "⊞",
    snippet: "\n| Col 1 | Col 2 | Col 3 |\n|---|---|---|\n| dato | dato | dato |\n",
  },
  {
    id: "list",
    label: "Lista",
    description: "Lista con viñetas",
    keywords: ["lis", "list", "lista", "ul", "vif"],
    icon: "≡",
    snippet: "\n- elemento 1\n- elemento 2\n- elemento 3\n",
  },
  {
    id: "tasklist",
    label: "Lista de tareas",
    description: "Lista con checkboxes",
    keywords: ["tas", "task", "tarea", "check", "todo"],
    icon: "✓",
    snippet: "\n- [ ] Tarea 1\n- [ ] Tarea 2\n- [x] Completada\n",
  },
  {
    id: "link",
    label: "Enlace",
    description: "[texto](url)",
    keywords: ["lin", "link", "enl", "enlace", "url", "href"],
    icon: "🔗",
    snippet: "[texto](url)",
    cursorOffset: 4,
  },
  {
    id: "image",
    label: "Imagen",
    description: "![alt](url)",
    keywords: ["img", "image", "imagen", "foto", "pic"],
    icon: "🖼",
    snippet: "![alt](url)",
    cursorOffset: 4,
  },
  {
    id: "bold",
    label: "Negrita",
    description: "**texto en negrita**",
    keywords: ["bol", "bold", "neg", "negrita", "fuerte"],
    icon: "B",
    snippet: "**texto**",
    cursorOffset: 6,
  },
  {
    id: "italic",
    label: "Cursiva",
    description: "*texto en cursiva*",
    keywords: ["ita", "italic", "cur", "cursiva", "itálica"],
    icon: "I",
    snippet: "*texto*",
    cursorOffset: 6,
  },
  {
    id: "hr",
    label: "Separador",
    description: "Línea horizontal ---",
    keywords: ["hr", "sep", "separa", "div", "lin", "linea"],
    icon: "—",
    snippet: "\n---\n",
  },
  {
    id: "quote",
    label: "Blockquote",
    description: "> cita o nota destacada",
    keywords: ["quo", "quote", "cit", "cita", "blq", "block"],
    icon: "❝",
    snippet: "\n> ",
  },
  {
    id: "orderedlist",
    label: "Lista numerada",
    description: "1. 2. 3. lista ordenada",
    keywords: ["num", "ol", "ord", "numer", "lista", "1"],
    icon: "1.",
    snippet: "\n1. elemento 1\n2. elemento 2\n3. elemento 3\n",
  },
  {
    id: "highlight",
    label: "Resaltado",
    description: "==texto resaltado==",
    keywords: ["res", "mark", "high", "resal", "color", "amarillo"],
    icon: "▐",
    snippet: "==texto==",
    cursorOffset: 6,
  },
  {
    id: "superscript",
    label: "Superíndice",
    description: "texto^superíndice^",
    keywords: ["sup", "super", "exp", "potencia", "arriba"],
    icon: "Xⁿ",
    snippet: "^texto^",
    cursorOffset: 5,
  },
  {
    id: "subscript",
    label: "Subíndice",
    description: "texto~subíndice~",
    keywords: ["sub", "indice", "abajo", "quim"],
    icon: "Xₙ",
    snippet: "~texto~",
    cursorOffset: 5,
  },
  {
    id: "math-inline",
    label: "Math inline",
    description: "$fórmula$ en línea",
    keywords: ["mat", "math", "form", "ecua", "latex", "kat"],
    icon: "∑",
    snippet: "$x^2$",
    cursorOffset: 3,
  },
  {
    id: "math-block",
    label: "Math bloque",
    description: "$$fórmula centrada$$",
    keywords: ["mat", "math", "form", "ecua", "latex", "bloque"],
    icon: "∫",
    snippet: "\n$$\n\n$$\n",
    cursorOffset: 5,
  },
  // ── Callouts ─────────────────────────────────────────────────────────────
  {
    id: "callout-note",
    label: "Callout Note",
    description: "> [!NOTE] azul informativo",
    keywords: ["cal", "callout", "note", "nota", "info"],
    icon: "📝",
    snippet: "\n> [!NOTE]\n> Escribe tu nota aquí.\n",
    cursorOffset: 1,
  },
  {
    id: "callout-tip",
    label: "Callout Tip",
    description: "> [!TIP] verde consejo",
    keywords: ["cal", "callout", "tip", "consejo", "verde"],
    icon: "💡",
    snippet: "\n> [!TIP]\n> Escribe un consejo aquí.\n",
    cursorOffset: 1,
  },
  {
    id: "callout-warning",
    label: "Callout Warning",
    description: "> [!WARNING] amarillo advertencia",
    keywords: ["cal", "callout", "warn", "warning", "adver", "amarillo"],
    icon: "⚠️",
    snippet: "\n> [!WARNING]\n> Escribe una advertencia aquí.\n",
    cursorOffset: 1,
  },
  {
    id: "callout-danger",
    label: "Callout Danger",
    description: "> [!DANGER] rojo peligro",
    keywords: ["cal", "callout", "danger", "error", "peli", "rojo"],
    icon: "🔴",
    snippet: "\n> [!DANGER]\n> Escribe un error o peligro aquí.\n",
    cursorOffset: 1,
  },
  {
    id: "callout-success",
    label: "Callout Success",
    description: "> [!SUCCESS] verde éxito",
    keywords: ["cal", "callout", "success", "exito", "éxito", "ok"],
    icon: "✅",
    snippet: "\n> [!SUCCESS]\n> Operación completada con éxito.\n",
    cursorOffset: 1,
  },
  {
    id: "callout-info",
    label: "Callout Info",
    description: "> [!INFO] violeta información",
    keywords: ["cal", "callout", "info", "purple", "violeta"],
    icon: "ℹ️",
    snippet: "\n> [!INFO]\n> Información adicional aquí.\n",
    cursorOffset: 1,
  },
  // ── TOC ──────────────────────────────────────────────────────────────────
  {
    id: "toc",
    label: "Tabla de contenidos",
    description: "[[TOC]] generada automáticamente",
    keywords: ["toc", "tabla", "contenidos", "indice", "índice", "nav"],
    icon: "📋",
    snippet: "\n[[TOC]]\n",
  },
  // ── Plantillas ────────────────────────────────────────────────────────────
  {
    id: "template-article",
    label: "Plantilla: Artículo",
    description: "Estructura básica de artículo",
    keywords: ["tem", "template", "plan", "plantilla", "art", "articulo"],
    icon: "📄",
    snippet: "\n# Título del artículo\n\n[[TOC]]\n\n## Introducción\n\nEscribe aquí la introducción.\n\n## Desarrollo\n\nEscribe aquí el contenido principal.\n\n## Conclusión\n\nEscribe aquí las conclusiones.\n",
  },
  {
    id: "template-readme",
    label: "Plantilla: README",
    description: "README para proyecto",
    keywords: ["tem", "template", "plan", "readme", "repo", "git", "proyec"],
    icon: "📦",
    snippet: "\n# Nombre del Proyecto\n\n> [!INFO]\n> Descripción breve del proyecto.\n\n## Instalación\n\n```\nnpm install\n```\n\n## Uso\n\n```\nnpm start\n```\n\n## Contribuir\n\n1. Fork del repo\n2. Crea tu rama (`git checkout -b feature/algo`)\n3. Commit tus cambios\n4. Abre un Pull Request\n",
  },
  {
    id: "template-meeting",
    label: "Plantilla: Reunión",
    description: "Acta de reunión",
    keywords: ["tem", "template", "plan", "reunion", "reunión", "acta", "meet"],
    icon: "🗓",
    snippet: "\n# Reunión — {{fecha}}\n\n**Asistentes:** Nombre1, Nombre2\n\n## Agenda\n\n1. Punto 1\n2. Punto 2\n\n## Notas\n\n- Discusión sobre...\n\n## Acciones\n\n- [ ] Tarea 1 — responsable\n- [ ] Tarea 2 — responsable\n\n## Próxima reunión\n\nFecha: \n",
  },
  {
    id: "template-report",
    label: "Plantilla: Reporte",
    description: "Reporte técnico / ejecutivo",
    keywords: ["tem", "template", "plan", "repo", "report", "reporte", "ejecut"],
    icon: "📊",
    snippet: "\n# Reporte: {{título}}\n\n> [!NOTE]\n> Resumen ejecutivo del reporte.\n\n[[TOC]]\n\n## Contexto\n\nDescripción del contexto o problema.\n\n## Análisis\n\n| Métrica | Valor | Objetivo |\n|---|---|---|\n| KPI 1 | - | - |\n| KPI 2 | - | - |\n\n## Conclusiones\n\n> [!SUCCESS]\n> Escribe aquí los resultados positivos.\n\n## Próximos pasos\n\n- [ ] Acción 1\n- [ ] Acción 2\n",
  },


  {
    id: "link-list",
    label: "Lista de Enlaces",
    description: "Bloque de links con título personalizado",
    keywords: ["link", "lista", "url", "enlace", "web"],
    icon: "",
    snippet: "",
  },
];

// ── Tipos ────────────────────────────────────────────────────────────────────
type ViewMode = "edit" | "preview" | "split";

export type SnippetAction =
  | { type: "choice";    target: string }
  | { type: "section";   id: string; label?: string }
  | { type: "use";       word: string; itemId: string; targetOk: string; targetFail?: string }
  | { type: "drop";      raw: string }
  | { type: "sound";     raw: string }
  | { type: "img";       url: string; caption?: string }
  | { type: "float";     word: string; url: string; caption?: string }
  | { type: "wikilink";  target: string };

// ── MarkdownPreviewWithSnippets ──────────────────────────────────────────────
// Combina markdown estático con los componentes React reales del lector.
// Separa el texto en bloques de markdown puro vs líneas que contienen snippets.
// El markdown puro va a dangerouslySetInnerHTML. Las líneas con snippets se
// parsean con parseContenido → RenderSegmentos (componentes reales con lógica).
// Los segmentos "text" dentro de líneas mixtas también pasan por renderMarkdown
// para preservar bold/italic/etc.

/** Texto inline dentro de un bloque mixto — aplica markdown sin envolver en <p> */
function SnipInlineText({ text }: { text: string }) {
  const html = renderMarkdown(text.trim());
  if (!html.trim()) return null;
  // Quitar <p>...</p> envolvente si sólo hay uno, para que quede inline
  const unwrapped = html.replace(/^<p>([\s\S]*)<\/p>$/, "$1");
  return <span dangerouslySetInnerHTML={{ __html: unwrapped }} />;
}

function MarkdownPreviewWithSnippets({
  value,
  placeholder,
  onSnippetAction,
  pvRef,
  style,
  onTableClick,
}: {
  value: string;
  placeholder?: string;
  onSnippetAction?: (action: SnippetAction) => void;
  pvRef: React.RefObject<HTMLDivElement>;
  style: React.CSSProperties;
  onTableClick?: (table: HTMLTableElement) => void;
}) {
  // Pre-calcular sectionMap para resolver si un target es sección local
  const sectionMap = React.useMemo(
    () => parseSections(parseContenido(value)),
    [value]
  );

  const handleNavigate = useCallback((target: string) => {
    if (!onSnippetAction) return;
    onSnippetAction(
      sectionMap[target] !== undefined
        ? { type: "section", id: target }
        : { type: "choice",  target }
    );
  }, [onSnippetAction, sectionMap]);

  // Click handler para wikilinks renderizados en HTML estático
  // Usamos un listener nativo con capture:true para que e.preventDefault()
  // cancele la navegación del <a href="#"> ANTES de que el browser actúe.
  const handleContainerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const a = (e.target as HTMLElement).closest("a[data-wikilink]");
    if (!a) return;
    e.preventDefault();
    const target = a.getAttribute("data-wikilink");
    if (target && onSnippetAction) {
      onSnippetAction({ type: "wikilink", target });
    }
  }, [onSnippetAction]);

  // Click nativo para tablas (necesita acceso al elemento DOM real)
  useEffect(() => {
    const el = pvRef.current;
    if (!el || !onTableClick) return;
    const handler = (e: MouseEvent) => {
      // Ignore heading anchor clicks
      if ((e.target as HTMLElement).closest("a.heading-anchor")) return;
      const table = (e.target as HTMLElement).closest("table");
      if (table) {
        e.preventDefault();
        onTableClick(table as HTMLTableElement);
      }
    };
    el.addEventListener("click", handler);
    return () => el.removeEventListener("click", handler);
  }, [pvRef, onTableClick]);

  // Listener nativo en capture para interceptar ANTES de que el browser navegue al #
  useEffect(() => {
    const el = pvRef.current;
    if (!el || !onSnippetAction) return;
    const handler = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a[data-wikilink]");
      if (!a) return;
      e.preventDefault();
      e.stopPropagation();
      const target = a.getAttribute("data-wikilink");
      if (target) onSnippetAction({ type: "wikilink", target });
    };
    el.addEventListener("click", handler, { capture: true });
    return () => el.removeEventListener("click", handler, { capture: true });
  }, [onSnippetAction]);

  // Separar el raw text en bloques: md puro vs líneas que tienen snippets
  const blocks = React.useMemo(() => {
    const SNIPPET_LINE_RE = /\[\[\w+\|[\s\S]*?\]\]/;
    const result: Array<{ kind: "md"; text: string } | { kind: "segs"; text: string }> = [];
    let mdAccum = "";
    for (const line of value.split("\n")) {
      if (SNIPPET_LINE_RE.test(line)) {
        if (mdAccum) { result.push({ kind: "md", text: mdAccum }); mdAccum = ""; }
        result.push({ kind: "segs", text: line });
      } else {
        mdAccum += (mdAccum ? "\n" : "") + line;
      }
    }
    if (mdAccum) result.push({ kind: "md", text: mdAccum });
    return result;
  }, [value]);

  if (!value.trim()) {
    return (
      <div ref={pvRef} className="prose-mundo" style={style}>
        <p className="placeholder">{placeholder ?? "Vista previa…"}</p>
      </div>
    );
  }

  return (
    <div ref={pvRef} className="prose-mundo" style={style} onClick={handleContainerClick}>
      {blocks.map((block, i) => {
        if (block.kind === "md") {
          return (
            <div key={i} dangerouslySetInnerHTML={{ __html: renderMarkdown(block.text) }} />
          );
        }

        // Línea mixta: parseContenido la divide en segmentos (text + snippets).
        // Renderizamos cada segmento manualmente para que los "text" pasen por
        // renderMarkdown (bold, italic, etc.) en lugar de quedar como texto plano.
        const segs = parseContenido(block.text);

        return (
          <div key={i} className="my-2 leading-loose">
            {segs.map((seg, j) => {
              if (seg.type === "text")   return <SnipInlineText key={j} text={seg.value} />;
              // Para el resto usamos RenderSegmentos con un solo segmento
              return (
                <RenderSegmentos key={j} segs={[seg]} onNavigate={handleNavigate} />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Wikilink entity type ────────────────────────────────────────────────────
export type WikiEntity = { name: string; type: string };

/** Normalize string[] | WikiEntity[] → WikiEntity[] */
function toWikiEntities(entities: (string | WikiEntity)[]): WikiEntity[] {
  return entities.map(e => typeof e === "string" ? { name: e, type: "nota" } : e);
}

interface MarkdownEditorProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  toolbar?: boolean;
  defaultMode?: ViewMode;
  /** Modo controlado externamente. Si se pasa, sobreescribe el estado interno. */
  mode?: ViewMode;
  extraCommands?: CommandItem[];
  /** Ref opcional: se le asigna una función insertAtCursor(text) para uso externo */
  insertRef?: React.MutableRefObject<((text: string) => void) | null>;
  /** Callback cuando el usuario interactúa con un snippet en el preview */
  onSnippetAction?: (action: SnippetAction) => void;
  /** Lista de entidades disponibles para autocompletado de [[wikilinks]] */
  entities?: (string | WikiEntity)[];
  /** Si true, el textarea crece con el contenido (ignora rows). Default: false */
  autoResize?: boolean;
  /** Altura máxima del textarea en modo autoResize antes de activar scroll (ej: "60vh", "400px"). Sin límite por defecto. */
  maxHeight?: string;
  /**
   * Overlay opcional que se renderiza ENCIMA del textarea (position:absolute, pointer-events:none).
   * Recibe el valor actual del texto para que pueda calcular contadores por línea, etc.
   * Se monta dentro del div position:relative que envuelve el <textarea>, por lo que
   * las coordenadas top/right/etc. son relativas a ese contenedor.
   */
  renderOverlay?: (value: string) => React.ReactNode;
  /**
   * Título de sección opcional.
   * - En modo edición: se muestra como línea de encabezado `# título` no editable
   *   encima del textarea (decorativo, no forma parte del value).
   * - En modo preview: se renderiza como `# título` encima del contenido markdown.
   */
  sectionTitle?: string;
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
  mode: modeProp,
  extraCommands = [],
  insertRef,
  onSnippetAction,
  entities = [],
  autoResize = false,
  maxHeight,
  renderOverlay,
  sectionTitle,
}: MarkdownEditorProps) {
  const [modeInternal, setMode] = useState<ViewMode>(modeProp ?? defaultMode);
  const mode = modeProp ?? modeInternal;
  const taRef = useRef<HTMLTextAreaElement>(null);
  const pvRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Find & Replace state
  const [findReplace, setFindReplace] = useState<{
    open: boolean;
    find: string;
    replace: string;
    caseSensitive: boolean;
    currentMatch: number;
    totalMatches: number;
  }>({
    open: false,
    find: "",
    replace: "",
    caseSensitive: false,
    currentMatch: 0,
    totalMatches: 0,
  });
  const findInputRef = useRef<HTMLInputElement>(null);

  // Command menu state
  const [cmdMenu, setCmdMenu] = useState<{
    open: boolean;
    query: string;           // texto escrito después de "add"
    triggerStart: number;    // posición donde empezó "add" en el textarea
    selectedIdx: number;
    menuPos: { top: number; left: number };
  }>({
    open: false,
    query: "",
    triggerStart: 0,
    selectedIdx: 0,
    menuPos: { top: 0, left: 0 },
  });

  const monoStyle: React.CSSProperties = { fontFamily: "var(--font-mono)" };

  // ── Wikilink autocomplete state ──────────────────────────────────────────
  const [wikiMenu, setWikiMenu] = useState<{
    open: boolean;
    query: string;
    triggerStart: number;
    selectedIdx: number;
    menuPos: { top: number; left: number };
  }>({
    open: false,
    query: "",
    triggerStart: 0,
    selectedIdx: 0,
    menuPos: { top: 0, left: 0 },
  });
  const wikiMenuRef = useRef<HTMLDivElement>(null);

  // ── Table editor state ────────────────────────────────────────────────────
  const [tableEditor, setTableEditor] = useState<{
    open: boolean;
    anchorEl: { top: number; left: number } | null;
    /** position in value where the table markdown starts */
    tableStart: number;
    /** position in value where the table markdown ends */
    tableEnd: number;
    rows: string[][];
  }>({ open: false, anchorEl: null, tableStart: 0, tableEnd: 0, rows: [] });

  // Filtered entity list for wikilink menu
  const normalizedEntities = toWikiEntities(entities);
  const filteredEntities = wikiMenu.query.length === 0
    ? normalizedEntities
    : normalizedEntities.filter(e => e.name.toLowerCase().includes(wikiMenu.query.toLowerCase()));

  // ── Auto-resize textarea ──────────────────────────────────────────────────
  useEffect(() => {
    const ta = taRef.current;
    if (!ta || !autoResize) return;
    ta.style.height = "auto";
    if (maxHeight) {
      // Respetar maxHeight: crecer hasta el límite y luego scrollear
      const maxPx = parseFloat(getComputedStyle(ta).maxHeight);
      const clampedH = isNaN(maxPx)
        ? ta.scrollHeight
        : Math.min(ta.scrollHeight, maxPx);
      ta.style.height = clampedH + "px";
    } else {
      ta.style.height = ta.scrollHeight + "px";
    }
  }, [value, autoResize, maxHeight]);

  // Close wikilink menu on outside click
  useEffect(() => {
    if (!wikiMenu.open) return;
    const handler = (e: MouseEvent) => {
      if (wikiMenuRef.current && !wikiMenuRef.current.contains(e.target as Node)) {
        setWikiMenu(m => ({ ...m, open: false }));
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [wikiMenu.open]);

  // En móvil, forzamos "edit" y ocultamos el botón split
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const check = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
      if (e.matches && mode === "split") setMode("edit");
    };
    check(mq);
    mq.addEventListener("change", check);
    return () => mq.removeEventListener("change", check);
  }, [mode]);

  const minH = `${rows * 1.6}rem`;

  // ── Filtrar items del menú ──────────────────────────────────────────────
  const allCommands = [...extraCommands, ...COMMAND_ITEMS];
  const filteredItems = cmdMenu.query.length === 0
    ? allCommands
    : allCommands.filter(item =>
        item.keywords.some(k => k.startsWith(cmdMenu.query.toLowerCase())) ||
        item.label.toLowerCase().includes(cmdMenu.query.toLowerCase())
      );

  // ── Calcular posición del caret en coordenadas de pantalla (para position:fixed) ──
  const getCaretCoords = useCallback((ta: HTMLTextAreaElement, pos: number) => {
    const taRect = ta.getBoundingClientRect();
    const style = window.getComputedStyle(ta);

    // Mirror div que replica exactamente el textarea
    const mirror = document.createElement("div");
    const props = [
      "fontFamily", "fontSize", "fontWeight", "lineHeight",
      "letterSpacing", "wordSpacing", "paddingTop", "paddingRight",
      "paddingBottom", "paddingLeft", "borderTopWidth", "borderRightWidth",
      "borderBottomWidth", "borderLeftWidth", "boxSizing",
      "overflowWrap", "wordBreak",
    ] as const;
    props.forEach(p => { (mirror.style as any)[p] = style[p]; });
    mirror.style.position = "fixed";
    mirror.style.visibility = "hidden";
    mirror.style.pointerEvents = "none";
    mirror.style.top = taRect.top + "px";
    mirror.style.left = taRect.left + "px";
    mirror.style.width = taRect.width + "px";
    mirror.style.height = taRect.height + "px";
    mirror.style.whiteSpace = "pre-wrap";
    mirror.style.overflow = "auto";
    mirror.style.zIndex = "-1";

    // Texto antes del caret
    const textBefore = ta.value.slice(0, pos);
    mirror.textContent = textBefore;

    const span = document.createElement("span");
    span.textContent = "​"; // zero-width space
    mirror.appendChild(span);
    document.body.appendChild(mirror);

    // Aplicar el mismo scroll que tiene el textarea ANTES de medir
    mirror.scrollTop = ta.scrollTop;
    mirror.scrollLeft = ta.scrollLeft;
    const spanRect = span.getBoundingClientRect();
    document.body.removeChild(mirror);

    const lineHeight = parseFloat(style.lineHeight) || 20;

    // Clamp vertical: si el span quedó fuera del área visible del textarea, usar el borde del textarea
    const clampedTop = Math.max(taRect.top, Math.min(spanRect.top, taRect.bottom - lineHeight));

    return {
      top: clampedTop + lineHeight + 2,
      left: Math.max(taRect.left + 8, Math.min(spanRect.left, taRect.right - 264)),
    };
  }, []);

  // ── Insertar snippet del comando seleccionado ──────────────────────────
  const applyCommand = useCallback((item: CommandItem) => {
    const ta = taRef.current;
    if (!ta) return;

    // Siempre cerrar el menú y limpiar el "add..." del texto
    const before = value.slice(0, cmdMenu.triggerStart);
    const after = value.slice(ta.selectionStart);
    const triggerStart = cmdMenu.triggerStart;
    setCmdMenu(m => ({ ...m, open: false, query: "" }));

    // Si tiene action (modal interactivo): limpiar el trigger y ejecutar
    if (item.action) {
      onChange(before + after);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = triggerStart;
        ta.focus();
        item.action!();
      });
      return;
    }

    // Si tiene snippet: insertar directamente
    if (item.snippet) {
      const newVal = before + item.snippet + after;
      onChange(newVal);
      requestAnimationFrame(() => {
        const insertPos = triggerStart + item.snippet!.length;
        const cursorPos = item.cursorOffset ? insertPos - item.cursorOffset : insertPos;
        ta.selectionStart = ta.selectionEnd = cursorPos;
        ta.focus();
      });
    }
  }, [value, onChange, cmdMenu.triggerStart]);

  // ── Detectar "add" mientras se escribe ─────────────────────────────────
  const detectCommand = useCallback((newValue: string, cursorPos: number) => {
    const textBefore = newValue.slice(0, cursorPos);
    // Buscar "add" precedido de inicio de línea o espacio
    const match = textBefore.match(/(^|[\n\s])add(\S*)$/);

    if (match) {
      const triggerStart = cursorPos - match[0].length + match[1].length;
      const query = match[2]; // lo que viene después de "add"
      const ta = taRef.current;
      if (!ta) return;

      const coords = getCaretCoords(ta, triggerStart);

      // coords ya son absolutas en pantalla (fixed), calcular si mostrar arriba o abajo
      const menuHeight = 320;
      const spaceBelow = window.innerHeight - coords.top;
      const showAbove = spaceBelow < menuHeight + 40;

      setCmdMenu({
        open: true,
        query,
        triggerStart,
        selectedIdx: 0,
        menuPos: {
          top: showAbove ? coords.top - menuHeight - (parseFloat(window.getComputedStyle(ta).lineHeight) || 20) - 4 : coords.top,
          left: coords.left,
        },
      });
    } else {
      setCmdMenu(m => m.open ? { ...m, open: false, query: "" } : m);
    }
  }, [getCaretCoords]);

  // ── Find & Replace ────────────────────────────────────────────────────
  const countMatches = useCallback((text: string, query: string, caseSensitive: boolean) => {
    if (!query) return 0;
    const flags = caseSensitive ? "g" : "gi";
    try { return (text.match(new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags)) || []).length; }
    catch { return 0; }
  }, []);

  const findAndHighlight = useCallback((dir: 1 | -1 = 1) => {
    const ta = taRef.current;
    if (!ta || !findReplace.find) return;
    const flags = findReplace.caseSensitive ? "g" : "gi";
    const regex = new RegExp(findReplace.find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
    const matches: number[] = [];
    let m;
    while ((m = regex.exec(value)) !== null) matches.push(m.index);
    if (!matches.length) return;
    const next = (findReplace.currentMatch + dir + matches.length) % matches.length;
    const idx = matches[next];
    ta.focus();
    ta.setSelectionRange(idx, idx + findReplace.find.length);
    setFindReplace(s => ({ ...s, currentMatch: next, totalMatches: matches.length }));
  }, [findReplace, value]);

  const replaceOne = useCallback(() => {
    const ta = taRef.current;
    if (!ta || !findReplace.find) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    if (s !== e && value.slice(s, e).toLowerCase() === findReplace.find.toLowerCase()) {
      const newVal = value.slice(0, s) + findReplace.replace + value.slice(e);
      onChange(newVal);
      requestAnimationFrame(() => findAndHighlight(1));
    } else {
      findAndHighlight(1);
    }
  }, [findReplace, value, onChange, findAndHighlight]);

  const replaceAll = useCallback(() => {
    if (!findReplace.find) return;
    const flags = findReplace.caseSensitive ? "g" : "gi";
    const regex = new RegExp(findReplace.find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
    const newVal = value.replace(regex, findReplace.replace);
    onChange(newVal);
    setFindReplace(s => ({ ...s, currentMatch: 0, totalMatches: 0 }));
  }, [findReplace, value, onChange]);

  // Update match count when query changes
  useEffect(() => {
    const total = countMatches(value, findReplace.find, findReplace.caseSensitive);
    setFindReplace(s => ({ ...s, totalMatches: total, currentMatch: Math.min(s.currentMatch, Math.max(0, total - 1)) }));
  }, [findReplace.find, findReplace.caseSensitive, value, countMatches]);

  // Open find panel with Ctrl+F / Cmd+F
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setFindReplace(s => ({ ...s, open: true }));
        setTimeout(() => findInputRef.current?.focus(), 50);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // ── Table editor helpers ──────────────────────────────────────────────────
  /** Parse a markdown table block into a 2D array (header row first) */
  const parseTableMd = (md: string): string[][] => {
    const lines = md.trim().split("\n").filter(l => l.trim());
    const parse = (row: string) => row.split("|").slice(1, -1).map(c => c.trim());
    const isSep = (r: string) => /^\|[-| :]+\|$/.test(r.trim());
    return lines.filter(l => !isSep(l)).map(parse);
  };

  /** Serialize a 2D array back to markdown table */
  const serializeTableMd = (rows: string[][]): string => {
    if (!rows.length) return "";
    const cols = Math.max(...rows.map(r => r.length));
    const padded = rows.map(r => [...r, ...Array(cols - r.length).fill("")]);
    const widths = Array.from({ length: cols }, (_, ci) =>
      Math.max(3, ...padded.map(r => (r[ci] || "").length))
    );
    const formatRow = (r: string[]) =>
      "| " + r.map((c, ci) => c.padEnd(widths[ci])).join(" | ") + " |";
    const sep = "| " + widths.map(w => "-".repeat(w)).join(" | ") + " |";
    return [formatRow(padded[0]), sep, ...padded.slice(1).map(formatRow)].join("\n");
  };

  /** Find the table under the preview click and open the table editor */
  const openTableEditor = useCallback((tableEl: HTMLTableElement) => {
    // Find the markdown source of this table by scanning for | blocks
    const tableRegex = /(?:^|\n)((?:\|[^\n]+\|\n?)+)/g;
    let m: RegExpExecArray | null;
    let best: { start: number; end: number; rows: string[][] } | null = null;
    // Walk all tables in value, pick the one whose parse matches columns
    const colCount = tableEl.querySelectorAll("thead th").length;
    while ((m = tableRegex.exec(value)) !== null) {
      const block = m[1];
      const rows = parseTableMd(block);
      if (rows[0]?.length === colCount) {
        const start = m.index + (m[0].length - block.length);
        best = { start, end: m.index + m[0].length, rows };
      }
    }
    if (!best) return;
    const rect = tableEl.getBoundingClientRect();
    setTableEditor({
      open: true,
      anchorEl: { top: rect.top + window.scrollY, left: rect.left },
      tableStart: best.start,
      tableEnd: best.end,
      rows: best.rows,
    });
  }, [value]);

  /** Write table edits back to value */
  const commitTableEdit = useCallback((newRows: string[][]) => {
    const newMd = serializeTableMd(newRows);
    const newVal = value.slice(0, tableEditor.tableStart) + newMd + value.slice(tableEditor.tableEnd);
    onChange(newVal);
    setTableEditor(te => ({ ...te, rows: newRows, tableEnd: tableEditor.tableStart + newMd.length }));
  }, [value, onChange, tableEditor.tableStart, tableEditor.tableEnd]);

  // ── handleChange ──────────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    onChange(newVal);
    const cursor = e.target.selectionStart;
    detectCommand(newVal, cursor);
    detectWikilink(newVal, cursor);
  };

  // ── Detect [[wikilink typing ──────────────────────────────────────────
  const detectWikilink = useCallback((newValue: string, cursorPos: number) => {
    const textBefore = newValue.slice(0, cursorPos);
    // Match [[ seguido de texto sin [[ ni ]] (el cursor está dentro del wikilink)
    const match = textBefore.match(/\[\[([^\[\]]*)$/);
    if (match) {
      const query = match[1];
      const triggerStart = cursorPos - match[0].length;
      const ta = taRef.current;
      if (!ta) return;
      const coords = getCaretCoords(ta, triggerStart);
      const menuHeight = 260;
      const spaceBelow = window.innerHeight - coords.top;
      const showAbove = spaceBelow < menuHeight + 40;
      setWikiMenu({
        open: true,
        query,
        triggerStart,
        selectedIdx: 0,
        menuPos: {
          top: showAbove
            ? coords.top - menuHeight - (parseFloat(window.getComputedStyle(ta).lineHeight) || 20) - 4
            : coords.top,
          left: coords.left,
        },
      });
    } else {
      setWikiMenu(m => m.open ? { ...m, open: false } : m);
    }
  }, [getCaretCoords]);

  // ── Apply selected entity as wikilink ─────────────────────────────────
  const applyWikilink = useCallback((entity: WikiEntity) => {
    const ta = taRef.current;
    if (!ta) return;
    const cursor = ta.selectionStart;
    // Si justo después del cursor hay ]], consumirlos también para no duplicar
    const afterCursor = value.slice(cursor);
    const hasClosing = afterCursor.startsWith("]]");
    const endPos = cursor + (hasClosing ? 2 : 0);
    const before = value.slice(0, wikiMenu.triggerStart);
    const after = value.slice(endPos);
    const inserted = `[[${entity.name}]]`;
    const newVal = before + inserted + after;
    onChange(newVal);
    setWikiMenu(m => ({ ...m, open: false }));
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = wikiMenu.triggerStart + inserted.length;
      ta.focus();
    });
  }, [value, onChange, wikiMenu.triggerStart]);

  // ── wrapSelection / insertSnippet ──────────────────────────────────────
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

  // Exponer insertSnippet al padre si proveen un insertRef
  React.useEffect(() => {
    if (insertRef) insertRef.current = insertSnippet;
  });

  // ── handleKeyDown ─────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = taRef.current;
    if (!ta) return;

    // ── Wikilink menu: navegar y seleccionar ───
    if (wikiMenu.open) {
      if (e.key === "Escape") {
        e.preventDefault();
        setWikiMenu(m => ({ ...m, open: false }));
        return;
      }
      if (filteredEntities.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setWikiMenu(m => ({ ...m, selectedIdx: (m.selectedIdx + 1) % filteredEntities.length }));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setWikiMenu(m => ({ ...m, selectedIdx: (m.selectedIdx - 1 + filteredEntities.length) % filteredEntities.length }));
          return;
        }
        if (e.key === "Tab" || e.key === "Enter") {
          e.preventDefault();
          applyWikilink(filteredEntities[wikiMenu.selectedIdx]);
          return;
        }
      }
    }

    // ── Menú abierto: navegar y seleccionar ───
    if (cmdMenu.open && filteredItems.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setCmdMenu(m => ({ ...m, selectedIdx: (m.selectedIdx + 1) % filteredItems.length }));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setCmdMenu(m => ({ ...m, selectedIdx: (m.selectedIdx - 1 + filteredItems.length) % filteredItems.length }));
        return;
      }
      if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        applyCommand(filteredItems[cmdMenu.selectedIdx]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setCmdMenu(m => ({ ...m, open: false }));
        return;
      }
    }

    // ── Tab normal: indent ───
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

    const autoClosePairs: Record<string, string> = { '(': ')', '{': '}' };

    // ── Manejo especial de [ para soportar [[wikilinks]] ──────────────────
    // IMPORTANTE: usar ta.value (DOM real) en vez de value (estado React),
    // porque en keyDown el estado React aún no refleja el carácter anterior.
    if (e.key === '[') {
      e.preventDefault();
      const { selectionStart: s, selectionEnd: e2 } = ta;
      const currentVal = ta.value;          // valor real del DOM en este momento
      const charBefore = currentVal[s - 1];
      const charAfter  = currentVal[s];
      const hasSelection = s !== e2;

      if (!hasSelection && charBefore === '[' && charAfter === ']') {
        // Estamos en [|] — segundo [: convertir a [[|]]
        const newVal = currentVal.slice(0, s) + '[]]' + currentVal.slice(s + 1);
        onChange(newVal);
        requestAnimationFrame(() => {
          const cursorPos = s + 1;
          ta.selectionStart = ta.selectionEnd = cursorPos;
          ta.focus();
          detectWikilink(newVal, cursorPos);
        });
      } else if (!hasSelection && charBefore === '[') {
        // Segundo [ sin ] autocerrado: insertar []]
        const newVal = currentVal.slice(0, s) + '[]]' + currentVal.slice(s);
        onChange(newVal);
        requestAnimationFrame(() => {
          const cursorPos = s + 1;
          ta.selectionStart = ta.selectionEnd = cursorPos;
          ta.focus();
          detectWikilink(newVal, cursorPos);
        });
      } else {
        // Primer [ o hay selección: autocerrado normal
        const sel = hasSelection ? currentVal.slice(s, e2) : '';
        const newVal = currentVal.slice(0, s) + '[' + sel + ']' + currentVal.slice(e2);
        onChange(newVal);
        requestAnimationFrame(() => {
          ta.selectionStart = s + 1;
          ta.selectionEnd   = s + 1 + sel.length;
          ta.focus();
          // No abrir wiki menu en el primer [ — esperar al segundo
        });
      }
      return;
    }

    if (autoClosePairs[e.key]) {
      e.preventDefault();
      wrapSelection(e.key, autoClosePairs[e.key]);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "b") { e.preventDefault(); wrapSelection("**", "**"); }
    if ((e.ctrlKey || e.metaKey) && e.key === "i") { e.preventDefault(); wrapSelection("*", "*"); }
  };

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    if (mode !== "split" || !pvRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight > clientHeight) {
      const ratio = scrollTop / (scrollHeight - clientHeight);
      pvRef.current.scrollTop = ratio * (pvRef.current.scrollHeight - pvRef.current.clientHeight);
    }
  };

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    if (!cmdMenu.open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setCmdMenu(m => ({ ...m, open: false }));
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [cmdMenu.open]);

  const html = renderMarkdown(value);

  // Renderizar KaTeX cada vez que cambia el preview
  useEffect(() => {
    renderMathInElement(pvRef.current);
  }, [html]);

  const textareaCls =
    "flex-1 w-full bg-transparent outline-none border-none resize-none text-sm font-mono leading-relaxed placeholder:opacity-30";

  const textareaStyle: React.CSSProperties = {
    minHeight: minH,
    // Con maxHeight: scrollear cuando desborda. Sin maxHeight y autoResize: "hidden" (crece libre).
    overflowY: maxHeight ? "auto" : (autoResize ? "hidden" : "auto"),
    ...(maxHeight ? { maxHeight } : {}),
    color: "color-mix(in srgb, var(--foreground) 80%, transparent)",
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    lineHeight: 1.6,
    padding: "6px 12px 12px",
  };

  const previewStyle: React.CSSProperties = {
    minHeight: minH,
    overflowY: mode === "split" ? "auto" : "visible",
    padding: "16px 20px",
    flex: mode === "split" ? 1 : "none" as any,
  };

  return (
    <div className={`flex flex-col w-full ${className}`}>
      <style>{PROSE_STYLES}</style>

      {/* ── Contenedor principal ── */}
      <div
        style={{
          border: toolbar ? "1px solid color-mix(in srgb, var(--foreground) 8%, transparent)" : "none",
          borderRadius: toolbar ? 8 : 0,
          display: "flex",
          flexDirection: "column",
          background: toolbar ? "color-mix(in srgb, var(--bg-menu) 40%, transparent)" : "transparent",
          position: "relative",
        }}
      >
        {/* ── Toolbar de vista ── */}
        {toolbar && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 4,
            padding: "5px 8px",
            borderBottom: "1px solid color-mix(in srgb, var(--foreground) 6%, transparent)",
            flexShrink: 0,
          }}
        >
          {/* Find button */}
          <button
            type="button"
            title="Buscar y reemplazar (Ctrl+F)"
            onClick={() => {
              setFindReplace(s => ({ ...s, open: !s.open }));
              setTimeout(() => findInputRef.current?.focus(), 50);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 26,
              height: 22,
              background: findReplace.open
                ? "color-mix(in srgb, var(--color-primary,#7c6af7) 20%, transparent)"
                : "transparent",
              color: findReplace.open
                ? "var(--color-primary,#7c6af7)"
                : "color-mix(in srgb, var(--foreground) 30%, transparent)",
              border: "1px solid color-mix(in srgb, var(--foreground) 10%, transparent)",
              borderRadius: 5,
              cursor: "pointer",
            }}
          >
            <Search size={10} />
          </button>

          {/* Mode toggles — solo Editar y Vista */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "color-mix(in srgb, var(--foreground) 4%, transparent)",
              border: "1px solid color-mix(in srgb, var(--foreground) 8%, transparent)",
              borderRadius: 5,
              overflow: "hidden",
            }}
          >
          {(["edit", "split", "preview"] as ViewMode[]).filter(m => !(isMobile && m === "split")).map((m) => {
            const Icon = m === "edit" ? Edit3 : m === "split" ? Columns : Eye;
            const isActive = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                title={m === "edit" ? "Editar" : m === "split" ? "Split" : "Vista previa"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 26,
                  height: 22,
                  background: isActive
                    ? "color-mix(in srgb, var(--foreground) 10%, transparent)"
                    : "transparent",
                  color: isActive
                    ? "color-mix(in srgb, var(--foreground) 70%, transparent)"
                    : "color-mix(in srgb, var(--foreground) 22%, transparent)",
                  border: "none",
                  cursor: "pointer",
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

        {/* ── Panel Buscar y Reemplazar ── */}
        {findReplace.open && (
          <div
            style={{
              position: "absolute",
              top: 40,
              right: 8,
              zIndex: 300,
              width: 320,
              background: "var(--bg-menu, #1a1730)",
              border: "1px solid color-mix(in srgb, var(--color-primary, #7c6af7) 25%, transparent)",
              borderRadius: 8,
              boxShadow: "0 8px 32px color-mix(in srgb, var(--color-primary, #7c6af7) 15%, black)",
              overflow: "hidden",
              backdropFilter: "blur(8px)",
              padding: "10px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "color-mix(in srgb, var(--color-primary, #7c6af7) 70%, transparent)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Buscar y reemplazar
              </span>
              <button
                type="button"
                onClick={() => setFindReplace(s => ({ ...s, open: false }))}
                style={{ background: "none", border: "none", cursor: "pointer", color: "color-mix(in srgb, var(--foreground) 35%, transparent)", padding: 2, display: "flex" }}
              >
                <X size={12} />
              </button>
            </div>

            {/* Find row */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ flex: 1, position: "relative" }}>
                <input
                  ref={findInputRef}
                  type="text"
                  value={findReplace.find}
                  onChange={e => setFindReplace(s => ({ ...s, find: e.target.value, currentMatch: 0 }))}
                  onKeyDown={e => {
                    if (e.key === "Enter") { e.shiftKey ? findAndHighlight(-1) : findAndHighlight(1); }
                    if (e.key === "Escape") setFindReplace(s => ({ ...s, open: false }));
                  }}
                  placeholder="Buscar…"
                  style={{
                    width: "100%",
                    background: "color-mix(in srgb, var(--foreground) 5%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--foreground) 12%, transparent)",
                    borderRadius: 5,
                    padding: "4px 8px",
                    fontSize: 12,
                    color: "color-mix(in srgb, var(--foreground) 80%, transparent)",
                    outline: "none",
                    fontFamily: "var(--font-mono)",
                    boxSizing: "border-box",
                  }}
                />
                {findReplace.find && (
                  <span style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "color-mix(in srgb, var(--foreground) 30%, transparent)", fontFamily: "var(--font-mono)", pointerEvents: "none" }}>
                    {findReplace.totalMatches > 0 ? `${findReplace.currentMatch + 1}/${findReplace.totalMatches}` : "0/0"}
                  </span>
                )}
              </div>
              <button type="button" onClick={() => findAndHighlight(-1)} title="Anterior (Shift+Enter)" style={{ background: "none", border: "1px solid color-mix(in srgb, var(--foreground) 12%, transparent)", borderRadius: 4, cursor: "pointer", color: "color-mix(in srgb, var(--foreground) 50%, transparent)", padding: "3px 5px", display: "flex" }}>
                <ChevronUp size={12} />
              </button>
              <button type="button" onClick={() => findAndHighlight(1)} title="Siguiente (Enter)" style={{ background: "none", border: "1px solid color-mix(in srgb, var(--foreground) 12%, transparent)", borderRadius: 4, cursor: "pointer", color: "color-mix(in srgb, var(--foreground) 50%, transparent)", padding: "3px 5px", display: "flex" }}>
                <ChevronDown size={12} />
              </button>
            </div>

            {/* Replace row */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="text"
                value={findReplace.replace}
                onChange={e => setFindReplace(s => ({ ...s, replace: e.target.value }))}
                onKeyDown={e => { if (e.key === "Escape") setFindReplace(s => ({ ...s, open: false })); }}
                placeholder="Reemplazar con…"
                style={{
                  flex: 1,
                  background: "color-mix(in srgb, var(--foreground) 5%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--foreground) 12%, transparent)",
                  borderRadius: 5,
                  padding: "4px 8px",
                  fontSize: 12,
                  color: "color-mix(in srgb, var(--foreground) 80%, transparent)",
                  outline: "none",
                  fontFamily: "var(--font-mono)",
                }}
              />
              <button
                type="button"
                onClick={replaceOne}
                title="Reemplazar este"
                style={{ background: "color-mix(in srgb, var(--color-primary,#7c6af7) 15%, transparent)", border: "1px solid color-mix(in srgb, var(--color-primary,#7c6af7) 30%, transparent)", borderRadius: 4, cursor: "pointer", color: "var(--color-primary,#7c6af7)", padding: "3px 7px", fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700 }}
              >
                <Replace size={11} />
              </button>
              <button
                type="button"
                onClick={replaceAll}
                title="Reemplazar todos"
                style={{ background: "color-mix(in srgb, var(--color-primary,#7c6af7) 15%, transparent)", border: "1px solid color-mix(in srgb, var(--color-primary,#7c6af7) 30%, transparent)", borderRadius: 4, cursor: "pointer", color: "var(--color-primary,#7c6af7)", padding: "3px 7px", fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700, whiteSpace: "nowrap" }}
              >
                All
              </button>
            </div>

            {/* Options */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 10, color: "color-mix(in srgb, var(--foreground) 45%, transparent)", fontFamily: "var(--font-mono)" }}>
                <input
                  type="checkbox"
                  checked={findReplace.caseSensitive}
                  onChange={e => setFindReplace(s => ({ ...s, caseSensitive: e.target.checked, currentMatch: 0 }))}
                  style={{ accentColor: "var(--color-primary,#7c6af7)", width: 11, height: 11 }}
                />
                Aa (mayúsculas)
              </label>
            </div>
          </div>
        )}

        {/* ── Área de contenido ── */}
        <div
          style={{
            display: "flex",
            flexDirection: mode === "split" ? "row" : "column",
            position: "relative",
          }}
        >
          {/* Textarea de edición */}
          {(mode === "edit" || mode === "split") && (
            <div 
              onScroll={handleScroll} 
              style={{ 
                flex: mode === "split" ? 1 : "none",
                position: "relative", 
                display: "flex", 
                flexDirection: "column",
                // Necesario para que maxHeight del textarea sea respetado en modo edit
                ...(maxHeight && mode === "edit" ? { maxHeight, overflow: "hidden" } : {}),
              }}
            >
              {/* ── Encabezado de sección decorativo (modo edición) ── */}
              {sectionTitle && (
                <div
                  aria-hidden
                  style={{
                    padding: "12px 20px 0",
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    lineHeight: "1.625",
                    color: "color-mix(in srgb, var(--color-primary,#7c6af7) 55%, transparent)",
                    letterSpacing: "0.04em",
                    userSelect: "none",
                    pointerEvents: "none",
                    flexShrink: 0,
                  }}
                >
                  <span style={{ opacity: 0.5, marginRight: 6 }}>#</span>
                  {sectionTitle}
                </div>
              )}
              <textarea
                ref={taRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={textareaCls}
                style={textareaStyle}

              />

              {/* ── Overlay externo (ej: contadores de sílabas) ── */}
              {renderOverlay && (
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    pointerEvents: "none",
                    overflow: "hidden",
                  }}
                >
                  {renderOverlay(value)}
                </div>
              )}

              {/* ── Menú flotante de comandos ── */}
              {cmdMenu.open && (
                <div
                  ref={menuRef}
                  style={{
                    position: "fixed",
                    top: cmdMenu.menuPos.top,
                    left: Math.max(8, cmdMenu.menuPos.left),
                    zIndex: 9999,
                    width: 256,
                    background: "var(--bg-menu, #1a1730)",
                    border: "1px solid color-mix(in srgb, var(--color-primary, #7c6af7) 25%, transparent)",
                    borderRadius: 8,
                    boxShadow: "0 8px 32px color-mix(in srgb, var(--color-primary, #7c6af7) 15%, black)",
                    overflow: "hidden",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  {/* Header del menú */}
                  <div
                    style={{
                      padding: "6px 10px 4px",
                      fontSize: 9,
                      fontFamily: "var(--font-mono)",
                      color: "color-mix(in srgb, var(--color-primary, #7c6af7) 60%, transparent)",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      borderBottom: "1px solid color-mix(in srgb, var(--foreground) 6%, transparent)",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span style={{ opacity: 0.5 }}>add</span>
                    {cmdMenu.query && (
                      <span style={{
                        background: "color-mix(in srgb, var(--color-primary, #7c6af7) 15%, transparent)",
                        color: "var(--color-primary, #7c6af7)",
                        padding: "0 5px",
                        borderRadius: 3,
                        fontWeight: 700,
                      }}>
                        {cmdMenu.query}
                      </span>
                    )}
                    <span style={{ marginLeft: "auto", opacity: 0.4 }}>
                      ↑↓ navegar · Tab insertar
                    </span>
                  </div>

                  {/* Lista de items */}
                  <div style={{ maxHeight: 280, overflowY: "auto" }}>
                    {filteredItems.length === 0 ? (
                      <div
                        style={{
                          padding: "14px 12px",
                          fontSize: 11,
                          color: "color-mix(in srgb, var(--foreground) 30%, transparent)",
                          textAlign: "center",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        Sin resultados para "{cmdMenu.query}"
                      </div>
                    ) : (
                      filteredItems.map((item, idx) => {
                        const isSelected = idx === cmdMenu.selectedIdx;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onMouseEnter={() => setCmdMenu(m => ({ ...m, selectedIdx: idx }))}
                            onClick={() => applyCommand(item)}
                            style={{
                              width: "100%",
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              padding: "7px 12px",
                              background: isSelected
                                ? "color-mix(in srgb, var(--color-primary, #7c6af7) 12%, transparent)"
                                : "transparent",
                              border: "none",
                              cursor: "pointer",
                              textAlign: "left",
                              transition: "background 0.1s",
                              borderLeft: isSelected
                                ? "2px solid var(--color-primary, #7c6af7)"
                                : "2px solid transparent",
                            }}
                          >
                            {/* Icono */}
                            <div
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 5,
                                background: isSelected
                                  ? "color-mix(in srgb, var(--color-primary, #7c6af7) 20%, transparent)"
                                  : "color-mix(in srgb, var(--foreground) 6%, transparent)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 11,
                                fontWeight: 800,
                                color: isSelected
                                  ? "var(--color-primary, #7c6af7)"
                                  : "color-mix(in srgb, var(--foreground) 45%, transparent)",
                                flexShrink: 0,
                                fontFamily: "var(--font-mono)",
                                transition: "background 0.1s, color 0.1s",
                              }}
                            >
                              {item.icon}
                            </div>
                            {/* Texto */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: isSelected
                                    ? "color-mix(in srgb, var(--foreground) 90%, transparent)"
                                    : "color-mix(in srgb, var(--foreground) 60%, transparent)",
                                  marginBottom: 1,
                                  transition: "color 0.1s",
                                }}
                              >
                                {item.label}
                              </div>
                              <div
                                style={{
                                  fontSize: 10,
                                  color: "color-mix(in srgb, var(--foreground) 30%, transparent)",
                                  fontFamily: "var(--font-mono)",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {item.description}
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

              {/* ── Wikilink autocomplete menu ── */}
              {wikiMenu.open && normalizedEntities.length > 0 && (
                <div
                  ref={wikiMenuRef}
                  style={{
                    position: "fixed",
                    top: wikiMenu.menuPos.top,
                    left: Math.max(8, wikiMenu.menuPos.left),
                    zIndex: 9999,
                    width: 264,
                    background: "var(--bg-main, var(--bg-menu, #1a1730))",
                    border: "1px solid color-mix(in srgb, var(--color-primary, #7c6af7) 15%, transparent)",
                    borderRadius: 16,
                    boxShadow: "0 12px 40px color-mix(in srgb, var(--color-primary, #7c6af7) 22%, transparent)",
                    overflow: "hidden",
                    backdropFilter: "blur(12px)",
                    animation: "wikiPopIn 140ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                    transformOrigin: "top left",
                  }}
                >
                  <style>{`
                    @keyframes wikiPopIn {
                      from { opacity: 0; transform: scale(0.92) translateY(-4px); }
                      to   { opacity: 1; transform: scale(1) translateY(0); }
                    }
                  `}</style>

                  {/* Header */}
                  <div style={{
                    padding: "8px 12px 7px",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    borderBottom: "1px solid color-mix(in srgb, var(--color-primary, #7c6af7) 8%, transparent)",
                    background: "color-mix(in srgb, var(--color-primary, #7c6af7) 4%, transparent)",
                  }}>
                    <span style={{
                      fontSize: 9,
                      fontFamily: "var(--font-mono)",
                      fontWeight: 900,
                      letterSpacing: "0.05em",
                      color: "color-mix(in srgb, var(--color-primary, #7c6af7) 50%, transparent)",
                      background: "color-mix(in srgb, var(--color-primary, #7c6af7) 10%, transparent)",
                      padding: "1px 5px",
                      borderRadius: 4,
                    }}>[[</span>
                    {wikiMenu.query ? (
                      <span style={{
                        fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)",
                        color: "var(--color-primary, #7c6af7)", flex: 1, minWidth: 0,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{wikiMenu.query}</span>
                    ) : (
                      <span style={{
                        fontSize: 9, fontWeight: 900, letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        color: "color-mix(in srgb, var(--color-primary, #7c6af7) 35%, transparent)",
                        flex: 1,
                      }}>Entidades</span>
                    )}
                    <span style={{
                      fontSize: 8, fontFamily: "var(--font-mono)",
                      color: "color-mix(in srgb, var(--color-primary, #7c6af7) 30%, transparent)",
                    }}>↑↓ Tab</span>
                  </div>

                  {/* Entity list */}
                  <div style={{ maxHeight: 240, overflowY: "auto", padding: "6px" }}>
                    {filteredEntities.length === 0 ? (
                      <div style={{
                        padding: "16px 12px", fontSize: 10, textAlign: "center",
                        fontFamily: "var(--font-mono)", fontWeight: 700,
                        letterSpacing: "0.1em", textTransform: "uppercase",
                        color: "color-mix(in srgb, var(--color-primary, #7c6af7) 25%, transparent)",
                      }}>
                        Sin coincidencias
                      </div>
                    ) : (
                      filteredEntities.map((entity, idx) => {
                        const isSelected = idx === wikiMenu.selectedIdx;
                        const initial = entity.name.trim()[0]?.toUpperCase() ?? "?";
                        return (
                          <button
                            key={entity.name}
                            type="button"
                            onMouseEnter={() => setWikiMenu(m => ({ ...m, selectedIdx: idx }))}
                            onClick={() => applyWikilink(entity)}
                            style={{
                              width: "100%", display: "flex", alignItems: "center", gap: 9,
                              padding: "6px 8px",
                              background: isSelected
                                ? "color-mix(in srgb, var(--color-primary, #7c6af7) 12%, transparent)"
                                : "transparent",
                              border: isSelected
                                ? "1px solid color-mix(in srgb, var(--color-primary, #7c6af7) 20%, transparent)"
                                : "1px solid transparent",
                              borderRadius: 12, cursor: "pointer", textAlign: "left",
                              transition: "background 0.1s, border-color 0.1s",
                            }}
                          >
                            {/* Avatar con inicial */}
                            <div style={{
                              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              background: isSelected
                                ? "color-mix(in srgb, var(--color-primary, #7c6af7) 20%, transparent)"
                                : "color-mix(in srgb, var(--color-primary, #7c6af7) 7%, transparent)",
                              border: `1px solid color-mix(in srgb, var(--color-primary, #7c6af7) ${isSelected ? 25 : 10}%, transparent)`,
                              fontSize: 11, fontWeight: 900, fontFamily: "var(--font-mono)",
                              color: isSelected
                                ? "var(--color-primary, #7c6af7)"
                                : "color-mix(in srgb, var(--color-primary, #7c6af7) 40%, transparent)",
                              transition: "background 0.1s, color 0.1s",
                            }}>
                              {initial}
                            </div>
                            {/* Nombre */}
                            <span style={{
                              flex: 1, fontSize: 11, fontWeight: 700,
                              color: isSelected
                                ? "color-mix(in srgb, var(--foreground) 90%, transparent)"
                                : "color-mix(in srgb, var(--foreground) 60%, transparent)",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              transition: "color 0.1s",
                            }}>{entity.name}</span>
                            {/* Tag */}
                            <span style={{
                              flexShrink: 0, fontSize: 7, fontWeight: 900,
                              fontFamily: "var(--font-mono)", letterSpacing: "0.1em",
                              textTransform: "uppercase", padding: "2px 5px", borderRadius: 5,
                              background: "color-mix(in srgb, var(--color-primary, #7c6af7) 8%, transparent)",
                              color: "color-mix(in srgb, var(--color-primary, #7c6af7) 40%, transparent)",
                            }}>{entity.type}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
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
            <MarkdownPreviewWithSnippets
              value={sectionTitle ? `# ${sectionTitle}\n\n${value}` : value}
              placeholder={placeholder}
              onSnippetAction={onSnippetAction}
              pvRef={pvRef}
              style={previewStyle}
              onTableClick={openTableEditor}
            />
          )}
        </div>
      </div>

      {/* ── Floating table editor ── */}
      {tableEditor.open && tableEditor.anchorEl && (
        <div
          style={{
            position: "fixed",
            top: Math.min(tableEditor.anchorEl.top - window.scrollY + 8, window.innerHeight - 360),
            left: Math.max(8, Math.min(tableEditor.anchorEl.left, window.innerWidth - 540)),
            zIndex: 10000,
            width: 520,
            background: "var(--bg-menu, #1a1730)",
            border: "1px solid color-mix(in srgb, var(--color-primary, #7c6af7) 35%, transparent)",
            borderRadius: 10,
            boxShadow: "0 12px 40px color-mix(in srgb, var(--color-primary, #7c6af7) 20%, black)",
            backdropFilter: "blur(10px)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "7px 12px",
            borderBottom: "1px solid color-mix(in srgb, var(--foreground) 8%, transparent)",
          }}>
            <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "color-mix(in srgb, var(--color-primary,#7c6af7) 70%, transparent)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Editor de tabla
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              {/* Add column */}
              <button type="button" title="Añadir columna" onClick={() => {
                const newRows = tableEditor.rows.map(r => [...r, ""]);
                commitTableEdit(newRows);
              }} style={{ fontSize: 10, fontFamily: "var(--font-mono)", background: "color-mix(in srgb, var(--color-primary,#7c6af7) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--color-primary,#7c6af7) 25%, transparent)", borderRadius: 4, color: "var(--color-primary,#7c6af7)", padding: "2px 7px", cursor: "pointer" }}>
                +col
              </button>
              {/* Add row */}
              <button type="button" title="Añadir fila" onClick={() => {
                const cols = tableEditor.rows[0]?.length ?? 1;
                const newRows = [...tableEditor.rows, Array(cols).fill("")];
                commitTableEdit(newRows);
              }} style={{ fontSize: 10, fontFamily: "var(--font-mono)", background: "color-mix(in srgb, var(--color-primary,#7c6af7) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--color-primary,#7c6af7) 25%, transparent)", borderRadius: 4, color: "var(--color-primary,#7c6af7)", padding: "2px 7px", cursor: "pointer" }}>
                +fila
              </button>
              {/* Close */}
              <button type="button" onClick={() => setTableEditor(te => ({ ...te, open: false }))} style={{ background: "none", border: "none", cursor: "pointer", color: "color-mix(in srgb, var(--foreground) 35%, transparent)", padding: 2, display: "flex", alignItems: "center" }}>
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Table grid */}
          <div style={{ padding: "10px", overflowX: "auto", maxHeight: 300, overflowY: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <tbody>
                {tableEditor.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} style={{ padding: 2 }}>
                        <input
                          type="text"
                          value={cell}
                          onChange={e => {
                            const newRows = tableEditor.rows.map((r, rr) =>
                              r.map((c, cc) => rr === ri && cc === ci ? e.target.value : c)
                            );
                            commitTableEdit(newRows);
                          }}
                          style={{
                            width: "100%",
                            minWidth: 80,
                            background: ri === 0
                              ? "color-mix(in srgb, var(--color-primary,#7c6af7) 10%, transparent)"
                              : "color-mix(in srgb, var(--foreground) 4%, transparent)",
                            border: `1px solid color-mix(in srgb, var(--foreground) ${ri === 0 ? 15 : 8}%, transparent)`,
                            borderRadius: 4,
                            padding: "4px 7px",
                            fontSize: 12,
                            fontFamily: ri === 0 ? "var(--font-mono)" : "inherit",
                            fontWeight: ri === 0 ? 700 : 400,
                            color: "color-mix(in srgb, var(--foreground) 85%, transparent)",
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                          onFocus={e => { e.target.style.borderColor = "color-mix(in srgb, var(--color-primary,#7c6af7) 60%, transparent)"; }}
                          onBlur={e => { e.target.style.borderColor = ""; }}
                        />
                      </td>
                    ))}
                    {/* Delete row button */}
                    <td style={{ padding: "2px 0 2px 4px" }}>
                      <button
                        type="button"
                        title={ri === 0 ? "Fila de encabezado (no eliminable)" : "Eliminar fila"}
                        disabled={ri === 0}
                        onClick={() => {
                          if (ri === 0) return;
                          commitTableEdit(tableEditor.rows.filter((_, r) => r !== ri));
                        }}
                        style={{ background: "none", border: "none", cursor: ri === 0 ? "default" : "pointer", opacity: ri === 0 ? 0.15 : 0.4, color: "var(--foreground)", padding: "2px 3px", fontSize: 12, lineHeight: 1, borderRadius: 3, display: "flex", alignItems: "center" }}
                      >
                        <X size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer: delete column */}
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "6px 12px", borderTop: "1px solid color-mix(in srgb, var(--foreground) 6%, transparent)", gap: 6 }}>
            <button type="button" title="Eliminar última columna" onClick={() => {
              if ((tableEditor.rows[0]?.length ?? 0) <= 1) return;
              commitTableEdit(tableEditor.rows.map(r => r.slice(0, -1)));
            }} style={{ fontSize: 10, fontFamily: "var(--font-mono)", background: "transparent", border: "1px solid color-mix(in srgb, var(--foreground) 12%, transparent)", borderRadius: 4, color: "color-mix(in srgb, var(--foreground) 40%, transparent)", padding: "2px 7px", cursor: "pointer" }}>
              {"−"}col
            </button>
            <button type="button" title="Eliminar última fila" onClick={() => {
              if (tableEditor.rows.length <= 1) return;
              commitTableEdit(tableEditor.rows.slice(0, -1));
            }} style={{ fontSize: 10, fontFamily: "var(--font-mono)", background: "transparent", border: "1px solid color-mix(in srgb, var(--foreground) 12%, transparent)", borderRadius: 4, color: "color-mix(in srgb, var(--foreground) 40%, transparent)", padding: "2px 7px", cursor: "pointer" }}>
              {"−"}fila
            </button>
          </div>
        </div>
      )}
    </div>
  );
}