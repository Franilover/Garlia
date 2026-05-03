"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Eye, Edit3, Columns } from "lucide-react";

// ── Renderer ────────────────────────────────────────────────────────────────
export function renderMarkdown(raw: string): string {
  // ── Proteger bloques de código primero ──────────────────────────────────
  const codeBlocks: string[] = [];
  let html = raw.replace(/```([\s\S]*?)```/g, (_, code) => {
    const escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre><code>${escaped.trim()}</code></pre>`);
    return `\x00CODE${idx}\x00`;
  });

  // ── Proteger math en bloque $$...$$  ────────────────────────────────────
  const mathBlocks: string[] = [];
  html = html.replace(/\$\$([\s\S]+?)\$\$/g, (_, expr) => {
    const idx = mathBlocks.length;
    mathBlocks.push(`<span class="math-block" data-expr="${expr.trim().replace(/"/g,'&quot;')}"></span>`);
    return `\x00MATH${idx}\x00`;
  });

  // ── Escapar HTML en el resto ─────────────────────────────────────────────
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // ── Tablas ───────────────────────────────────────────────────────────────
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

  // ── Blockquotes (soporta anidados y multilínea) ───────────────────────────
  html = html.replace(/((?:^&gt;.*(?:\n|$))+)/gm, (block) => {
    const inner = block
      .split("\n")
      .filter(l => l.trim())
      .map(l => l.replace(/^&gt;\s?/, ""))
      .join("\n");
    return `<blockquote>${inner}</blockquote>`;
  });

  // ── Imágenes y enlaces ───────────────────────────────────────────────────
  html = html.replace(/!\[([^\]]*)\]\((.*?)\)/g, '<img src="$2" alt="$1" />');
  html = html.replace(/\[([^\]]+)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // ── Encabezados ──────────────────────────────────────────────────────────
  html = html.replace(/^---$/gm, "<hr/>");
  html = html.replace(/^######\s(.+)$/gm, "<h6>$1</h6>");
  html = html.replace(/^#####\s(.+)$/gm,  "<h5>$1</h5>");
  html = html.replace(/^####\s(.+)$/gm,   "<h4>$1</h4>");
  html = html.replace(/^###\s(.+)$/gm,    "<h3>$1</h3>");
  html = html.replace(/^##\s(.+)$/gm,     "<h2>$1</h2>");
  html = html.replace(/^#\s(.+)$/gm,      "<h1>$1</h1>");

  // ── Tipografía inline ────────────────────────────────────────────────────
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g,     "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g,         "<em>$1</em>");
  html = html.replace(/`([^`]+)`/g,          "<code>$1</code>");

  // ── Tachado ~~texto~~ ────────────────────────────────────────────────────
  html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");

  // ── Resaltado ==texto== ──────────────────────────────────────────────────
  html = html.replace(/==(.+?)==/g, '<mark class="md-mark">$1</mark>');

  // ── Superíndice ^texto^ ──────────────────────────────────────────────────
  html = html.replace(/\^([^\^\n]+?)\^/g, "<sup>$1</sup>");

  // ── Subíndice ~texto~ (solo si no es ~~ tachado) ─────────────────────────
  html = html.replace(/(?<!~)~([^~\n]+?)~(?!~)/g, "<sub>$1</sub>");

  // ── Math inline $expr$ ───────────────────────────────────────────────────
  html = html.replace(/\$([^$\n]+?)\$/g, (_, expr) => {
    return `<span class="math-inline" data-expr="${expr.trim().replace(/"/g,'&quot;')}"></span>`;
  });

  // ── Listas numeradas ─────────────────────────────────────────────────────
  html = html.replace(/((?:^[ \t]*\d+\.\s.+\n?)+)/gm, (block) => {
    const items = block.trim().split("\n")
      .map((l: string) => `<li>${l.replace(/^[ \t]*\d+\.\s/, "")}</li>`)
      .join("");
    return `<ol>${items}</ol>`;
  });

  // ── Listas con viñetas ───────────────────────────────────────────────────
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

  // ── Párrafos ─────────────────────────────────────────────────────────────
  html = html.split(/\n{2,}/).map((block: string) => {
    if (/^<(h[1-6]|ul|ol|li|pre|table|hr|blockquote|\x00)/.test(block.trim())) return block;
    const inner = block.trim().replace(/\n/g, "<br/>");
    return inner ? `<p>${inner}</p>` : "";
  }).join("\n");

  // ── Restaurar bloques protegidos ─────────────────────────────────────────
  html = html.replace(/\x00CODE(\d+)\x00/g, (_, i) => codeBlocks[+i]);
  html = html.replace(/\x00MATH(\d+)\x00/g, (_, i) => mathBlocks[+i]);

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
  .prose-mundo ol { list-style:none;padding-left:1.2rem;margin:.4rem 0;counter-reset:ol-counter }
  .prose-mundo ol li { position:relative;padding-left:.8rem;font-size:.82rem;margin:.2rem 0;color:var(--color-input-text,#d1c9ff);counter-increment:ol-counter }
  .prose-mundo ol li::before { content:counter(ol-counter)".";position:absolute;left:-1rem;font-size:.7rem;font-weight:800;color:var(--color-primary,#7c6af7);font-family:var(--font-mono) }
  .prose-mundo blockquote { border-left:3px solid var(--color-primary,#7c6af7);margin:.6rem 0;padding:.4rem .8rem .4rem 1rem;background:color-mix(in srgb,var(--color-primary,#7c6af7) 6%,transparent);border-radius:0 .4rem .4rem 0;font-style:italic;color:color-mix(in srgb,var(--color-input-text,#d1c9ff) 80%,transparent);font-size:.83rem;line-height:1.6 }
  .prose-mundo mark.md-mark { background:color-mix(in srgb,#f7d76a 25%,transparent);color:color-mix(in srgb,#f7d76a 90%,white);border-radius:2px;padding:0 2px }
  .prose-mundo sup { font-size:.65em;vertical-align:super;color:color-mix(in srgb,var(--color-primary,#7c6af7) 80%,white);font-weight:700 }
  .prose-mundo sub { font-size:.65em;vertical-align:sub;color:color-mix(in srgb,var(--color-primary,#7c6af7) 70%,white) }
  .prose-mundo del { text-decoration:line-through;opacity:.5 }
  .prose-mundo .math-inline,.prose-mundo .math-block { color:color-mix(in srgb,var(--color-primary,#7c6af7) 85%,white) }
  .prose-mundo .math-block { display:block;text-align:center;margin:.8rem 0;font-size:1.05em }
  .katex { font-size:1em !important }
`;

// ── Command menu items ────────────────────────────────────────────────────────
interface CommandItem {
  id: string;
  label: string;
  description: string;
  keywords: string[];   // palabras que activan el match
  icon: string;
  snippet: string;
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
];

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
  defaultMode = "split",
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<ViewMode>(defaultMode);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const pvRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // En móvil, forzamos "edit"
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

  // ── Filtrar items del menú ──────────────────────────────────────────────
  const filteredItems = cmdMenu.query.length === 0
    ? COMMAND_ITEMS
    : COMMAND_ITEMS.filter(item =>
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
    mirror.style.overflow = "hidden";
    mirror.style.zIndex = "-1";

    // Texto antes del caret, compensando el scroll del textarea
    const textBefore = ta.value.slice(0, pos);
    mirror.textContent = textBefore;

    const span = document.createElement("span");
    span.textContent = "​"; // zero-width space
    mirror.appendChild(span);
    document.body.appendChild(mirror);

    // Scroll compensation: el mirror no scrollea, lo simulamos con translateY
    mirror.scrollTop = ta.scrollTop;
    const spanRect = span.getBoundingClientRect();
    document.body.removeChild(mirror);

    // Compensar el scroll del textarea manualmente
    const lineHeight = parseFloat(style.lineHeight) || 20;
    const adjustedTop = spanRect.top - ta.scrollTop + (ta.scrollTop > 0 ? 0 : 0);

    return {
      top: adjustedTop + lineHeight + 2,
      left: Math.max(taRect.left + 8, Math.min(spanRect.left, taRect.right - 264)),
    };
  }, []);

  // ── Insertar snippet del comando seleccionado ──────────────────────────
  const applyCommand = useCallback((item: CommandItem) => {
    const ta = taRef.current;
    if (!ta) return;

    // Eliminar "add" + query del texto
    const before = value.slice(0, cmdMenu.triggerStart);
    const after = value.slice(ta.selectionStart);
    const newVal = before + item.snippet + after;
    onChange(newVal);

    setCmdMenu(m => ({ ...m, open: false, query: "" }));

    requestAnimationFrame(() => {
      const insertPos = cmdMenu.triggerStart + item.snippet.length;
      const cursorPos = item.cursorOffset
        ? insertPos - item.cursorOffset
        : insertPos;
      ta.selectionStart = ta.selectionEnd = cursorPos;
      ta.focus();
    });
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

  // ── handleChange ──────────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    onChange(newVal);
    detectCommand(newVal, e.target.selectionStart);
  };

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

  // ── handleKeyDown ─────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = taRef.current;
    if (!ta) return;

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

      {/* ── Contenedor principal ── */}
      <div
        style={{
          border: "1px solid color-mix(in srgb, var(--foreground) 8%, transparent)",
          borderRadius: 8,
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          background: "color-mix(in srgb, var(--bg-menu) 40%, transparent)",
          position: "relative",
        }}
      >
        {/* ── Toggle flotante de vista (esquina superior derecha) ── */}
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            background: "color-mix(in srgb, var(--bg-menu, #1a1730) 85%, transparent)",
            border: "1px solid color-mix(in srgb, var(--foreground) 10%, transparent)",
            borderRadius: 6,
            overflow: "hidden",
            backdropFilter: "blur(6px)",
            boxShadow: "0 2px 8px color-mix(in srgb, black 20%, transparent)",
          }}
        >
          {(["edit", "split", "preview"] as ViewMode[]).map((m) => {
            const Icon = m === "edit" ? Edit3 : m === "preview" ? Eye : Columns;
            const isActive = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                title={m}
                className={m === "split" ? "hidden sm:flex" : "flex"}
                style={{
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

        {/* ── Área de contenido ── */}
        <div
          style={{
            display: "flex",
            flex: 1,
            minHeight: 0,
            flexDirection: mode === "split" ? "row" : "column",
            position: "relative",
          }}
        >
          {/* Textarea de edición */}
          {(mode === "edit" || mode === "split") && (
            <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column" }}>
              <textarea
                ref={taRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onScroll={handleScroll}
                placeholder={placeholder}
                className={textareaCls}
                style={textareaStyle}
              />

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