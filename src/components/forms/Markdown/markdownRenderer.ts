/**
 * markdownRenderer.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Funciones puras de renderizado y constantes compartidas.
 * Sin dependencias de React ni del DOM (salvo renderMathInElement).
 *
 * Exports:
 *   slugify            — genera IDs de headings
 *   renderMarkdown     — convierte markdown a HTML string
 *   renderMathInElement — inyecta KaTeX en nodos ya montados en el DOM
 *   PROSE_STYLES       — bloque CSS para la clase .prose-mundo
 *   CALLOUT_MAP        — mapa de tipos de callout
 */

// ── Slug helper for heading IDs ──────────────────────────────────────────────
export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s]+/g, "-");
  return slug || "header-" + Math.random().toString(36).substr(2, 5);
}

// ── Callout config ───────────────────────────────────────────────────────────
export const CALLOUT_MAP: Record<
  string,
  { cls: string; icon: string; label: string }
> = {
  NOTE: { cls: "callout-note", icon: "📝", label: "Note" },
  TIP: { cls: "callout-tip", icon: "💡", label: "Tip" },
  WARNING: { cls: "callout-warning", icon: "⚠️", label: "Warning" },
  DANGER: { cls: "callout-danger", icon: "🔴", label: "Danger" },
  ERROR: { cls: "callout-danger", icon: "❌", label: "Error" },
  SUCCESS: { cls: "callout-success", icon: "✅", label: "Success" },
  INFO: { cls: "callout-info", icon: "ℹ️", label: "Info" },
};

// ── Renderer ─────────────────────────────────────────────────────────────────
export function renderMarkdown(raw: string, isLibro = false): string {
  // ── helpers inline ────────────────────────────────────────────────────────
  const applyInline = (text: string): string => {
    text = text.replace(
      /!\[([^\]]*)\]\(([^)]*)\)/g,
      '<img src="$2" alt="$1" />',
    );
    text = text.replace(
      /\[([^\]]+)\]\(([^)]*)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    );
    text = text.replace(
      /\[\[([^\]|#]+?)(?:\|([^\]]+))?\]\]/g,
      (_, target, alias) => {
        const label = alias?.trim() || target.trim();
        const safeTarget = target.trim().replace(/"/g, "&quot;");
        return `<a class="wikilink" data-wikilink="${safeTarget}" href="javascript:void(0)" title="Ir a: ${safeTarget}">${label}</a>`;
      },
    );
    text = text.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
    text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/\*(.+?)\*/g, "<em>$1</em>");
    text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
    text = text.replace(/~~(.+?)~~/g, "<del>$1</del>");
    text = text.replace(/==(.+?)==/g, '<mark class="md-mark">$1</mark>');
    text = text.replace(/\^([^\^\n]+?)\^/g, "<sup>$1</sup>");
    text = text.replace(/(?<!~)~([^~\n]+?)~(?!~)/g, "<sub>$1</sub>");
    if (isLibro) {
      text = text.replace(
        /\[p[aá]gina:\s*(\d+)\]/gi,
        (_, n) =>
          `<span class="libro-page-tag" data-page="${n}">p.&nbsp;${n}</span>`,
      );
    }
    text = text.replace(
      /\$\$([^$]+?)\$\$/g,
      (_, expr) =>
        `<span class="math-block" data-expr="${expr.trim().replace(/"/g, "&quot;")}"></span>`,
    );
    text = text.replace(
      /\$([^$\n]+?)\$/g,
      (_, expr) =>
        `<span class="math-inline" data-expr="${expr.trim().replace(/"/g, "&quot;")}"></span>`,
    );
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
    const id =
      headingCounter[base] > 1 ? `${base}-${headingCounter[base]}` : base;
    if (level <= 4) tocEntries.push({ level, text: rawText.trim(), id });
    return `<h${level} id="${id}">${text}<a class="heading-anchor" href="#${id}" aria-label="Enlace a sección" tabindex="-1">#</a></h${level}>`;
  };

  // ── Tabla helper ──────────────────────────────────────────────────────────
  const renderTable = (lines: string[]): string => {
    const isSep = (r: string) => /^\|[-| :]+\|$/.test(r.trim());
    const parse = (row: string) =>
      row
        .split("|")
        .slice(1, -1)
        .map((c: string) => applyInline(c.trim()));
    const headers = parse(lines[0])
      .map((c) => `<th>${c}</th>`)
      .join("");
    const body = lines
      .slice(1)
      .filter((r) => !isSep(r))
      .map(
        (r) =>
          `<tr>${parse(r)
            .map((c) => `<td>${c}</td>`)
            .join("")}</tr>`,
      )
      .join("");
    return `<table><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table>`;
  };

  // ── Callout helper ────────────────────────────────────────────────────────
  const renderCallout = (lines: string[]): string => {
    const inner = lines.map((l) => l.replace(/^>\s?/, ""));
    const firstLine = inner[0] || "";
    const calloutMatch = firstLine.match(
      /^\[!(NOTE|TIP|WARNING|DANGER|ERROR|SUCCESS|INFO)\]\s*(.*)?$/i,
    );
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
      const checked =
        taskMatch[1].trim().toLowerCase() === "x" ? "checked" : "";
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

    // :::links block
    if (line.trim().startsWith(":::links")) {
      const customTitle =
        line.trim().replace(":::links", "").trim() || "ENLACES";
      const linkLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(":::")) {
        if (lines[i].trim() !== "") linkLines.push(lines[i].trim());
        i++;
      }
      i++;
      const linksHtml = linkLines
        .map((link) => {
          const href = link.startsWith("http") ? link : `https://${link}`;
          return `<li><a href="${href}" target="_blank" rel="noopener noreferrer">${link}</a></li>`;
        })
        .join("");
      output.push(`
        <div class="callout link-list-block">
          <div class="callout-title"><span class="callout-title-icon"></span> ${customTitle}</div>
          <div class="callout-body"><ul>${linksHtml}</ul></div>
        </div>`);
      continue;
    }

    // blank line → separador de párrafo (preservar espaciado)
    if (line.trim() === "") {
      output.push(
        '<p class="spacer" style="margin:0;line-height:1.65;min-height:1em"> </p>',
      );
      i++;
      continue;
    }

    // fenced code block ```
    if (line.trimStart().startsWith("```")) {
      const fence = line.trimStart().match(/^(`+)/)?.[1] ?? "```";
      const lang = line.trimStart().slice(fence.length).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith(fence)) {
        codeLines.push(
          lines[i]
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;"),
        );
        i++;
      }
      i++;
      const langAttr = lang ? ` class="language-${lang}"` : "";
      output.push(`<pre><code${langAttr}>${codeLines.join("\n")}</code></pre>`);
      continue;
    }

    // [[TOC]]
    if (/^\[\[toc\]\]\s*$/i.test(line.trim())) {
      output.push("\x00TOC\x00");
      i++;
      continue;
    }

    // hr ---
    if (/^---+$/.test(line.trim())) {
      output.push("<hr/>");
      i++;
      continue;
    }

    // headings #
    const hMatch = line.match(/^(#{1,6})(?:\s+(.*))?$/);
    if (hMatch) {
      const level = hMatch[1].length;
      const content = hMatch[2] || "";
      output.push(makeHeading(level, content));
      i++;
      continue;
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

    // paragraph
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].trimStart().startsWith("```") &&
      !lines[i].trim().startsWith(":::links") &&
      !/^\[\[toc\]\]\s*$/i.test(lines[i].trim()) &&
      !/^---+$/.test(lines[i].trim()) &&
      !/^(#{1,6})(\s|$)/.test(lines[i]) &&
      !lines[i].trim().startsWith("|") &&
      !lines[i].trimStart().startsWith(">") &&
      !/^[ \t]*\d+\.\s/.test(lines[i]) &&
      !/^[ \t]*-\s/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      // Cada línea del bloque: si termina en "  " es hard break, si no, espacio normal
      const joined = paraLines
        .map((l, idx) => {
          if (idx === paraLines.length - 1) return applyInline(l);
          return l.endsWith("  ")
            ? applyInline(l.trimEnd()) + "<br/>"
            : applyInline(l) + " ";
        })
        .join("");
      output.push(`<p>${joined}</p>`);
    }
  }

  // ── Inject TOC ────────────────────────────────────────────────────────────
  let html = output.join("\n");
  if (hasTOC) {
    let tocHtml: string;
    if (tocEntries.length > 0) {
      tocHtml = `<nav class="toc"><div class="toc-title">Índice</div><ol>`;
      let prevLevel = tocEntries[0].level;
      tocEntries.forEach((entry) => {
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
  const mathEls = el.querySelectorAll<HTMLElement>(".math-inline, .math-block");
  if (!mathEls.length) return;

  const render = (katex: any) => {
    mathEls.forEach((span) => {
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
    link.href =
      "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js";
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
  .prose-mundo p  { font-size:.82rem;margin:.3rem 0;line-height:1.65;color:color-mix(in srgb,var(--color-input-text,#d1c9ff) 85%,transparent) }
  .prose-mundo p.placeholder { color:color-mix(in srgb,var(--foreground) 20%,transparent);font-style:italic }
  .prose-mundo ul,
  .prose-mundo ol { padding-left:1.2rem;margin:.3rem 0;font-size:.82rem;color:color-mix(in srgb,var(--color-input-text,#d1c9ff) 80%,transparent) }
  .prose-mundo li { margin:.12rem 0;line-height:1.55 }
  .prose-mundo ul li::marker { color:color-mix(in srgb,var(--color-primary,#7c6af7) 50%,transparent) }
  .prose-mundo ol { list-style:decimal }
  .prose-mundo ol li::marker { color:color-mix(in srgb,var(--color-primary,#7c6af7) 50%,transparent);font-variant-numeric:tabular-nums }
  .prose-mundo .task-list-item { list-style:none;padding-left:0;margin-left:-1.2rem;display:flex;align-items:flex-start;gap:.4rem }
  .prose-mundo .task-list-checkbox { margin-top:.25rem;accent-color:var(--color-primary,#7c6af7);flex-shrink:0 }
  .prose-mundo a { color:var(--color-primary,#7c6af7);text-decoration:underline;text-underline-offset:2px }
  .prose-mundo a:hover { opacity:.8 }
  .prose-mundo strong { font-weight:800;color:color-mix(in srgb,var(--foreground) 90%,transparent) }
  .prose-mundo em { font-style:italic;color:color-mix(in srgb,var(--color-input-text,#d1c9ff) 90%,transparent) }
  .prose-mundo code { font-family:var(--font-mono);font-size:.78rem;background:color-mix(in srgb,var(--color-primary,#7c6af7) 10%,transparent);padding:.1em .35em;border-radius:3px;color:color-mix(in srgb,var(--color-primary,#7c6af7) 85%,white) }
  .prose-mundo pre { background:color-mix(in srgb,var(--foreground) 4%,transparent);border:1px solid color-mix(in srgb,var(--foreground) 8%,transparent);border-radius:.5rem;padding:.7rem 1rem;overflow-x:auto;margin:.45rem 0 }
  .prose-mundo pre code { background:none;padding:0;font-size:.78rem;color:color-mix(in srgb,var(--foreground) 80%,transparent) }
  .prose-mundo blockquote { border-left:2px solid color-mix(in srgb,var(--color-primary,#7c6af7) 40%,transparent);margin:.4rem 0;padding:.3rem .8rem;color:color-mix(in srgb,var(--foreground) 55%,transparent);font-style:italic;font-size:.8rem }
  .prose-mundo hr { border:none;border-top:1px solid color-mix(in srgb,var(--foreground) 10%,transparent);margin:.6rem 0 }
  .prose-mundo del { text-decoration:line-through;opacity:.55 }
  .prose-mundo mark.md-mark { background:color-mix(in srgb,#f6c90e 25%,transparent);color:inherit;border-radius:2px;padding:0 .2em }
  .prose-mundo sup,
  .prose-mundo sub { font-size:.7em;line-height:1 }
  .prose-mundo img { max-width:100%;border-radius:4px;margin:.3rem 0 }
  .prose-mundo table { width:100%;border-collapse:collapse;font-size:.78rem;margin:.45rem 0 }
  .prose-mundo th { padding:.3rem .6rem;background:color-mix(in srgb,var(--color-primary,#7c6af7) 10%,transparent);color:color-mix(in srgb,var(--color-primary,#7c6af7) 80%,white);font-weight:700;text-align:left;border-bottom:1px solid color-mix(in srgb,var(--color-primary,#7c6af7) 20%,transparent) }
  .prose-mundo td { padding:.3rem .6rem;border-bottom:1px solid color-mix(in srgb,var(--foreground) 6%,transparent);color:color-mix(in srgb,var(--foreground) 70%,transparent) }
  .prose-mundo tr:last-child td { border-bottom:none }
  .prose-mundo .callout { border-left:3px solid;border-radius:.4rem;padding:.5rem .8rem;margin:.45rem 0;font-size:.8rem }
  .prose-mundo .callout-title { display:flex;align-items:center;gap:.35rem;font-weight:800;font-size:.75rem;letter-spacing:.04em;text-transform:uppercase;margin-bottom:.25rem }
  .prose-mundo .callout-title-icon { font-size:.9rem;line-height:1 }
  .prose-mundo .callout-body { font-size:.78rem;line-height:1.55 }
  /* ── Callout theme vars ── */
  :root {
    --callout-note-bg:color-mix(in srgb,#3b82f6 8%,transparent);--callout-note-border:#3b82f6;--callout-note-text:color-mix(in srgb,#93c5fd 80%,transparent);--callout-note-title:#60a5fa;
    --callout-tip-bg:color-mix(in srgb,#22c55e 8%,transparent);--callout-tip-border:#22c55e;--callout-tip-text:color-mix(in srgb,#86efac 80%,transparent);--callout-tip-title:#4ade80;
    --callout-warning-bg:color-mix(in srgb,#f59e0b 8%,transparent);--callout-warning-border:#f59e0b;--callout-warning-text:color-mix(in srgb,#fcd34d 80%,transparent);--callout-warning-title:#fbbf24;
    --callout-danger-bg:color-mix(in srgb,#ef4444 8%,transparent);--callout-danger-border:#ef4444;--callout-danger-text:color-mix(in srgb,#fca5a5 80%,transparent);--callout-danger-title:#f87171;
    --callout-success-bg:color-mix(in srgb,#10b981 8%,transparent);--callout-success-border:#10b981;--callout-success-text:color-mix(in srgb,#6ee7b7 80%,transparent);--callout-success-title:#34d399;
    --callout-info-bg:color-mix(in srgb,#8b5cf6 8%,transparent);--callout-info-border:#8b5cf6;--callout-info-text:color-mix(in srgb,#c4b5fd 80%,transparent);--callout-info-title:#a78bfa;
  }
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
  .prose-mundo .toc-title { font-weight:800;font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;color:var(--color-primary,#7c6af7);margin-bottom:.35rem }
  .prose-mundo .toc ol { padding-left:1rem;margin:.15rem 0;counter-reset:none;list-style:decimal }
  .prose-mundo .toc ol li { padding-left:0;font-size:.76rem;margin:.12rem 0;color:color-mix(in srgb,var(--color-input-text,#d1c9ff) 80%,transparent) }
  .prose-mundo .toc ol li::before { display:none }
  .prose-mundo .toc ol ol { padding-left:1.2rem;list-style:lower-alpha }
  .prose-mundo .toc a { color:color-mix(in srgb,var(--color-primary,#7c6af7) 75%,white);text-decoration:none;transition:color .15s }
  .prose-mundo .toc a:hover { color:var(--color-primary,#7c6af7) }
  .prose-mundo h1[id], .prose-mundo h2[id],
  .prose-mundo h3[id], .prose-mundo h4[id] { scroll-margin-top:1rem }
  /* ── Heading anchors ────────────────────────────────────────────────────── */
  .prose-mundo h1,.prose-mundo h2,.prose-mundo h3,
  .prose-mundo h4,.prose-mundo h5,.prose-mundo h6 { position:relative }
  .prose-mundo .heading-anchor { opacity:0;margin-left:.4rem;font-size:.7em;font-weight:400;color:color-mix(in srgb,var(--color-primary,#7c6af7) 50%,transparent);text-decoration:none;vertical-align:middle;transition:opacity 0.15s;user-select:none }
  .prose-mundo h1:hover .heading-anchor,
  .prose-mundo h2:hover .heading-anchor,
  .prose-mundo h3:hover .heading-anchor,
  .prose-mundo h4:hover .heading-anchor { opacity:1 }
  .prose-mundo .heading-anchor:hover { color:var(--color-primary,#7c6af7) }
  /* ── Table editor hint ──────────────────────────────────────────────────── */
  .prose-mundo table { cursor:pointer;transition:outline 0.12s }
  .prose-mundo table:hover { outline:2px solid color-mix(in srgb,var(--color-primary,#7c6af7) 40%,transparent);border-radius:4px }
  /* ── Wikilinks ──────────────────────────────────────────────────────────── */
  .prose-mundo a.wikilink { color:var(--accent,#7c6af7);text-decoration:none;border-bottom:1px dashed color-mix(in srgb,var(--accent,#7c6af7) 50%,transparent);padding-bottom:1px;cursor:pointer;transition:all 0.15s }
  .prose-mundo a.wikilink:hover { border-bottom-style:solid;background:color-mix(in srgb,var(--accent,#7c6af7) 8%,transparent);border-radius:2px }
  /* ── Links block ────────────────────────────────────────────────────────── */
  .prose-mundo .link-list-block { background:color-mix(in srgb,var(--color-primary,#7c6af7) 8%,transparent);border-color:color-mix(in srgb,var(--color-primary,#7c6af7) 30%,transparent) }
  .prose-mundo .link-list-block ul { list-style:none;padding:0;margin:.3rem 0 0 0 }
  .prose-mundo .link-list-block li { margin:.3rem 0;padding-left:1.2rem;position:relative }
  .prose-mundo .link-list-block li::before { content:"›";position:absolute;left:.2rem;font-size:1.2rem;line-height:0.8;color:var(--color-primary,#7c6af7);font-weight:bold }
  .prose-mundo .link-list-block a { font-weight:600;word-break:break-all;text-decoration:none;color:color-mix(in srgb,var(--color-input-text,#d1c9ff) 90%,white) }
  .prose-mundo .link-list-block a:hover { color:var(--color-primary,#7c6af7);text-decoration:underline }
  /* ── Página tag (modo libro) ─────────────────────────────────────────────── */
  .prose-mundo .libro-page-tag { display:inline-flex;align-items:center;font-family:var(--font-mono,monospace);font-size:.68em;font-weight:600;letter-spacing:.06em;padding:1px 6px;border-radius:3px;background:color-mix(in srgb,var(--foreground,#fff) 6%,transparent);border:1px solid color-mix(in srgb,var(--foreground,#fff) 14%,transparent);color:color-mix(in srgb,var(--foreground,#fff) 40%,transparent);vertical-align:middle;margin-left:.3em;user-select:none;transition:background 0.12s,color 0.12s;cursor:default;white-space:nowrap }
  .prose-mundo .libro-page-tag:hover { background:color-mix(in srgb,var(--foreground,#fff) 10%,transparent);color:color-mix(in srgb,var(--foreground,#fff) 65%,transparent) }
`;
