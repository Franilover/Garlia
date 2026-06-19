"use client";

/**
 * MarkdownEditor.tsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Editor markdown con toolbar, vista previa sincronizada, autocompletado de
 * [[wikilinks]], menú de comandos "add…", buscar/reemplazar y editor visual
 * de tablas.
 *
 * Re-exporta los símbolos públicos que otros módulos importan directamente:
 *   renderMarkdown, renderMathInElement, PROSE_STYLES  (del renderer)
 *   SnippetAction, WikiEntity, CommandItem, ViewMode    (de commandItems)
 */

import { Edit3, Eye } from "lucide-react";
import React, {
  useState, useRef, useEffect, useCallback,
} from "react";

// ── Módulos internos ──────────────────────────────────────────────────────────
import {
  renderMarkdown,
  renderMathInElement,
  PROSE_STYLES,
} from "./markdownRenderer";
import {
  COMMAND_ITEMS,
  toWikiEntities,
  type CommandItem,
  type SnippetAction,
  type ViewMode,
  type WikiEntity,
} from "./commandItems";
import {
  CommandMenu,
  WikilinkMenu,
  FindReplacePanel,
  TableEditorPanel,
} from "./EditorFloatingPanels";

// ── Re-exports para compatibilidad con importaciones existentes ───────────────
export { renderMarkdown, renderMathInElement, PROSE_STYLES };
export type { CommandItem, SnippetAction, ViewMode, WikiEntity };

// ── Snippets / leer ───────────────────────────────────────────────────────────
import {
  parseContenido,
  parseSections,
} from "@/features/editorGarlia/components/editorCapitulos/snippets/type";
import { RenderSegmentos } from "@/features/garlia/components/ContenidoInteractivo";

// ────────────────────────────────────────────────────────────────────────────
// MarkdownPreviewWithSnippets (interno, combina markdown + snippets React)
// ────────────────────────────────────────────────────────────────────────────

function SnipInlineText({ text }: { text: string }) {
  const html = renderMarkdown(text.trim());
  if (!html.trim()) return null;
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
  isLibro = false,
}: {
  value: string;
  placeholder?: string;
  onSnippetAction?: (action: SnippetAction) => void;
  pvRef: React.RefObject<HTMLDivElement>;
  style: React.CSSProperties;
  onTableClick?: (table: HTMLTableElement) => void;
  isLibro?: boolean;
}) {
  const sectionMap = React.useMemo(
    () => parseSections(parseContenido(value)),
    [value],
  );

  const handleNavigate = useCallback(
    (target: string) => {
      if (!onSnippetAction) return;
      onSnippetAction(
        sectionMap[target] !== undefined
          ? { type: "section", id: target }
          : { type: "choice", target },
      );
    },
    [onSnippetAction, sectionMap],
  );

  const handleContainerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const a = (e.target as HTMLElement).closest("a[data-wikilink]");
      if (a) {
        e.preventDefault();
        e.stopPropagation();
        const target = a.getAttribute("data-wikilink");
        if (target) handleNavigate(target);
        return;
      }
      const table = (e.target as HTMLElement).closest("table");
      if (table && onTableClick) {
        e.preventDefault();
        onTableClick(table as HTMLTableElement);
      }
    },
    [handleNavigate, onTableClick],
  );

  const blocks = React.useMemo(() => {
    const gateMap = new Map<string, string>();
    let gateCounter = 0;
    const withPlaceholders = value.replace(
      /\[\[gate\|[^\|]+\|[\s\S]+?\]\]/g,
      match => {
        const ph = `\x00GATEPREVIEW_${gateCounter++}\x00`;
        gateMap.set(ph, match);
        return ph;
      },
    );

    const SNIPPET_LINE_RE = /\[\[\w+\|[\s\S]*?\]\]|\x00GATEPREVIEW_\d+\x00/;
    const result: Array<{ kind: "md"; text: string } | { kind: "segs"; text: string }> = [];
    let mdAccum = "";

    for (const line of withPlaceholders.split("\n")) {
      if (SNIPPET_LINE_RE.test(line)) {
        if (mdAccum) { result.push({ kind: "md", text: mdAccum }); mdAccum = ""; }
        const restored = line.replace(/\x00GATEPREVIEW_\d+\x00/g, ph => gateMap.get(ph) ?? ph);
        result.push({ kind: "segs", text: restored });
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
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(block.text, isLibro) }} key={i} />
          );
        }
        const segs = parseContenido(block.text);
        return (
          <div key={i} className="my-2 leading-loose">
            {segs.map((seg, j) => {
              if (seg.type === "text") return <SnipInlineText key={j} text={seg.value} />;
              return <RenderSegmentos key={j} segs={[seg]} onNavigate={handleNavigate} />;
            })}
          </div>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// MarkdownEditor props
// ────────────────────────────────────────────────────────────────────────────
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
  /** Si true, oculta los COMMAND_ITEMS internos y muestra solo extraCommands */
  hideBuiltinCommands?: boolean;
  /** Ref opcional: se le asigna insertAtCursor(text) para uso externo */
  insertRef?: React.MutableRefObject<((text: string) => void) | null>;
  /** Ref externo que recibe el HTMLTextAreaElement interno */
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  onSnippetAction?: (action: SnippetAction) => void;
  entities?: (string | WikiEntity)[];
  autoResize?: boolean;
  maxHeight?: string;
  renderOverlay?: (value: string, taEl: HTMLTextAreaElement | null) => React.ReactNode;
  sectionTitle?: string;
  isLibro?: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// MarkdownEditor
// ────────────────────────────────────────────────────────────────────────────
export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  rows = 6,
  className = "",
  toolbar = true,
  defaultMode = "preview",
  mode: modeProp,
  extraCommands = [],
  hideBuiltinCommands = false,
  insertRef,
  textareaRef,
  onSnippetAction,
  entities = [],
  autoResize = false,
  maxHeight,
  renderOverlay,
  sectionTitle,
  isLibro = false,
}: MarkdownEditorProps) {
  // ── Mode state ────────────────────────────────────────────────────────────
  const [modeInternal, setModeInternal] = useState<ViewMode>(modeProp ?? defaultMode);
  const mode = modeProp ?? modeInternal;
  const setMode = useCallback((m: ViewMode) => setModeInternal(m), []);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const taRef    = useRef<HTMLTextAreaElement>(null);
  const pvRef    = useRef<HTMLDivElement>(null);
  const menuRef  = useRef<HTMLDivElement>(null);
  const wikiMenuRef = useRef<HTMLDivElement>(null);
  const findInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [taEl, setTaEl] = useState<HTMLTextAreaElement | null>(null);

  // Sync external textareaRef
  useEffect(() => {
    if (!textareaRef) return;
    (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = taRef.current;
  });

  // ── Responsive width ──────────────────────────────────────────────────────
  const SPLIT_MIN_WIDTH = 700;
  const [containerWidth, setContainerWidth] = useState<number>(9999);
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 9999,
  );
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const isMobile = windowWidth < SPLIT_MIN_WIDTH;

  const userChangedModeRef = useRef(false);
  const wrappedSetMode = useCallback(
    (m: ViewMode) => { userChangedModeRef.current = true; setMode(m); },
    [setMode],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width ?? el.offsetWidth;
      setContainerWidth(w);
      if (w < SPLIT_MIN_WIDTH && mode === "split") {
        setMode("preview");
        userChangedModeRef.current = false;
      }
    });
    ro.observe(el);
    const initialWidth = el.offsetWidth;
    setContainerWidth(initialWidth);
    if (initialWidth >= SPLIT_MIN_WIDTH && !modeProp && !userChangedModeRef.current) {
      setMode("preview");
    }
    return () => ro.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-resize textarea ──────────────────────────────────────────────────
  useEffect(() => {
    const ta = taRef.current;
    if (!ta || !autoResize) return;
    ta.style.height = "auto";
    if (maxHeight) {
      const maxPx = parseFloat(getComputedStyle(ta).maxHeight);
      ta.style.height = (isNaN(maxPx) ? ta.scrollHeight : Math.min(ta.scrollHeight, maxPx)) + "px";
    } else {
      ta.style.height = ta.scrollHeight + "px";
    }
  }, [value, autoResize, maxHeight]);

  // ── Find & Replace state ──────────────────────────────────────────────────
  const [findReplace, setFindReplace] = useState({
    open: false, find: "", replace: "",
    caseSensitive: false, currentMatch: 0, totalMatches: 0,
  });

  const countMatches = useCallback((text: string, query: string, cs: boolean) => {
    if (!query) return 0;
    try { return (text.match(new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), cs ? "g" : "gi")) || []).length; }
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
    ta.focus();
    ta.setSelectionRange(matches[next], matches[next] + findReplace.find.length);
    setFindReplace(s => ({ ...s, currentMatch: next, totalMatches: matches.length }));
  }, [findReplace, value]);

  const replaceOne = useCallback(() => {
    const ta = taRef.current;
    if (!ta || !findReplace.find) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    if (s !== e && value.slice(s, e).toLowerCase() === findReplace.find.toLowerCase()) {
      onChange(value.slice(0, s) + findReplace.replace + value.slice(e));
      requestAnimationFrame(() => findAndHighlight(1));
    } else { findAndHighlight(1); }
  }, [findReplace, value, onChange, findAndHighlight]);

  const replaceAll = useCallback(() => {
    if (!findReplace.find) return;
    const flags = findReplace.caseSensitive ? "g" : "gi";
    const regex = new RegExp(findReplace.find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
    onChange(value.replace(regex, findReplace.replace));
    setFindReplace(s => ({ ...s, currentMatch: 0, totalMatches: 0 }));
  }, [findReplace, value, onChange]);

  useEffect(() => {
    const total = countMatches(value, findReplace.find, findReplace.caseSensitive);
    setFindReplace(s => ({ ...s, totalMatches: total, currentMatch: Math.min(s.currentMatch, Math.max(0, total - 1)) }));
  }, [findReplace.find, findReplace.caseSensitive, value, countMatches]);

  // Open with Ctrl+F
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

  // Ctrl+E — toggle edit mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "e") {
        e.preventDefault();
        if (modeProp) return;
        setModeInternal(prev => {
          if (prev === "preview") return containerWidth >= SPLIT_MIN_WIDTH ? "split" : "edit";
          return "preview";
        });
        userChangedModeRef.current = true;
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
   
  }, [containerWidth, modeProp]);

  // ── Command menu state ────────────────────────────────────────────────────
  const [cmdMenu, setCmdMenu] = useState({
    open: false, query: "", triggerStart: 0, selectedIdx: 0,
    menuPos: { top: 0, left: 0 },
  });

  // ── Wikilink menu state ───────────────────────────────────────────────────
  const [wikiMenu, setWikiMenu] = useState({
    open: false, query: "", triggerStart: 0, selectedIdx: 0,
    menuPos: { top: 0, left: 0 },
  });

  // ── Spell check ───────────────────────────────────────────────────────────
  const [spellCheck] = useState({ enabled: true, lang: "es" });

  // ── Table editor state ────────────────────────────────────────────────────
  const [tableEditor, setTableEditor] = useState<{
    open: boolean;
    anchorEl: { top: number; left: number } | null;
    tableStart: number;
    tableEnd: number;
    rows: string[][];
  }>({ open: false, anchorEl: null, tableStart: 0, tableEnd: 0, rows: [] });

  // ── Derived data ──────────────────────────────────────────────────────────
  const normalizedEntities = toWikiEntities(entities);
  const filteredEntities = wikiMenu.query.length === 0
    ? normalizedEntities
    : normalizedEntities.filter(e => e.name.toLowerCase().includes(wikiMenu.query.toLowerCase()));

  const allCommands = hideBuiltinCommands ? extraCommands : [...extraCommands, ...COMMAND_ITEMS];
  const filteredItems = cmdMenu.query.length === 0
    ? allCommands
    : allCommands.filter(item =>
        item.keywords.some(k => k.startsWith(cmdMenu.query.toLowerCase())) ||
        item.label.toLowerCase().includes(cmdMenu.query.toLowerCase()),
      );

  const minH = `${rows * 1.6}rem`;

  // ── Caret coords (for floating menus) ────────────────────────────────────
  const getCaretCoords = useCallback((ta: HTMLTextAreaElement, pos: number) => {
    const taRect = ta.getBoundingClientRect();
    const style = window.getComputedStyle(ta);
    const props = [
      "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing",
      "wordSpacing", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
      "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
      "boxSizing", "overflowWrap", "wordBreak",
    ] as const;
    const mirror = document.createElement("div");
    props.forEach(p => { (mirror.style as any)[p] = style[p]; });
    Object.assign(mirror.style, {
      position: "fixed", visibility: "hidden", pointerEvents: "none",
      top: taRect.top + "px", left: taRect.left + "px",
      width: taRect.width + "px", height: taRect.height + "px",
      whiteSpace: "pre-wrap", overflow: "auto", zIndex: "-1",
    });
    mirror.textContent = ta.value.slice(0, pos);
    const span = document.createElement("span");
    span.textContent = "​";
    mirror.appendChild(span);
    document.body.appendChild(mirror);
    mirror.scrollTop = ta.scrollTop;
    mirror.scrollLeft = ta.scrollLeft;
    const spanRect = span.getBoundingClientRect();
    document.body.removeChild(mirror);
    const lineHeight = parseFloat(style.lineHeight) || 20;
    const clampedTop = Math.max(taRect.top, Math.min(spanRect.top, taRect.bottom - lineHeight));
    return {
      top: clampedTop + lineHeight + 2,
      left: Math.max(taRect.left + 8, Math.min(spanRect.left, taRect.right - 264)),
    };
  }, []);

  // ── Detect "add" command ──────────────────────────────────────────────────
  const detectCommand = useCallback((newValue: string, cursorPos: number) => {
    const textBefore = newValue.slice(0, cursorPos);
    const match = textBefore.match(/(^|[\n\s])add(\S*)$/);
    if (match) {
      const triggerStart = cursorPos - match[0].length + match[1].length;
      const ta = taRef.current;
      if (!ta) return;
      const coords = getCaretCoords(ta, triggerStart);
      const menuHeight = 320;
      const showAbove = window.innerHeight - coords.top < menuHeight + 40;
      setCmdMenu({
        open: true, query: match[2], triggerStart, selectedIdx: 0,
        menuPos: {
          top: showAbove
            ? coords.top - menuHeight - (parseFloat(window.getComputedStyle(ta).lineHeight) || 20) - 4
            : coords.top,
          left: coords.left,
        },
      });
    } else {
      setCmdMenu(m => m.open ? { ...m, open: false, query: "" } : m);
    }
  }, [getCaretCoords]);

  // ── Detect [[wikilink ────────────────────────────────────────────────────
  const detectWikilink = useCallback((newValue: string, cursorPos: number) => {
    const textBefore = newValue.slice(0, cursorPos);
    const match = textBefore.match(/\[\[([^\[\]]*)$/);
    if (match) {
      const ta = taRef.current;
      if (!ta) return;
      const triggerStart = cursorPos - match[0].length;
      const coords = getCaretCoords(ta, triggerStart);
      const menuHeight = 260;
      const showAbove = window.innerHeight - coords.top < menuHeight + 40;
      setWikiMenu({
        open: true, query: match[1], triggerStart, selectedIdx: 0,
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

  // ── Apply command ────────────────────────────────────────────────────────
  const applyCommand = useCallback((item: CommandItem) => {
    const ta = taRef.current;
    if (!ta) return;
    const before = value.slice(0, cmdMenu.triggerStart);
    const after = value.slice(ta.selectionStart);
    const triggerStart = cmdMenu.triggerStart;
    setCmdMenu(m => ({ ...m, open: false, query: "" }));
    if (item.action) {
      onChange(before + after);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = triggerStart;
        ta.focus();
        item.action!();
      });
      return;
    }
    if (item.snippet) {
      onChange(before + item.snippet + after);
      requestAnimationFrame(() => {
        const insertPos = triggerStart + item.snippet!.length;
        ta.selectionStart = ta.selectionEnd = item.cursorOffset ? insertPos - item.cursorOffset : insertPos;
        ta.focus();
      });
    }
  }, [value, onChange, cmdMenu.triggerStart]);

  // ── Apply wikilink ────────────────────────────────────────────────────────
  const applyWikilink = useCallback((entity: WikiEntity) => {
    const ta = taRef.current;
    if (!ta) return;
    const cursor = ta.selectionStart;
    const hasClosing = value.slice(cursor).startsWith("]]");
    const endPos = cursor + (hasClosing ? 2 : 0);
    const inserted = `[[${entity.name}]]`;
    onChange(value.slice(0, wikiMenu.triggerStart) + inserted + value.slice(endPos));
    setWikiMenu(m => ({ ...m, open: false }));
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = wikiMenu.triggerStart + inserted.length;
      ta.focus();
    });
  }, [value, onChange, wikiMenu.triggerStart]);

  // ── Text editing helpers ──────────────────────────────────────────────────
  const wrapSelection = (before: string, after: string) => {
    const ta = taRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const sel = value.slice(s, e) || (after === "" ? "" : "texto");
    onChange(value.slice(0, s) + before + sel + after + value.slice(e));
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

  React.useEffect(() => { if (insertRef) insertRef.current = insertSnippet; });

  // ── Table helpers ────────────────────────────────────────────────────────
  const parseTableMd = (md: string): string[][] => {
    const lines = md.trim().split("\n").filter(l => l.trim());
    const parse = (row: string) => row.split("|").slice(1, -1).map(c => c.trim());
    const isSep = (r: string) => /^\|[-| :]+\|$/.test(r.trim());
    return lines.filter(l => !isSep(l)).map(parse);
  };

  const serializeTableMd = (rows: string[][]): string => {
    if (!rows.length) return "";
    const cols = Math.max(...rows.map(r => r.length));
    const padded = rows.map(r => [...r, ...Array(cols - r.length).fill("")]);
    const widths = Array.from({ length: cols }, (_, ci) =>
      Math.max(3, ...padded.map(r => (r[ci] || "").length)),
    );
    const formatRow = (r: string[]) => "| " + r.map((c, ci) => c.padEnd(widths[ci])).join(" | ") + " |";
    const sep = "| " + widths.map(w => "-".repeat(w)).join(" | ") + " |";
    return [formatRow(padded[0]), sep, ...padded.slice(1).map(formatRow)].join("\n");
  };

  const openTableEditor = useCallback((tableEl: HTMLTableElement) => {
    const colCount = tableEl.querySelectorAll("thead th").length;
    const tableRegex = /(?:^|\n)((?:\|[^\n]+\|\n?)+)/g;
    let m: RegExpExecArray | null;
    let best: { start: number; end: number; rows: string[][] } | null = null;
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
    setTableEditor({ open: true, anchorEl: { top: rect.top + window.scrollY, left: rect.left }, tableStart: best.start, tableEnd: best.end, rows: best.rows });
  }, [value]);

  const commitTableEdit = useCallback((newRows: string[][]) => {
    const newMd = serializeTableMd(newRows);
    onChange(value.slice(0, tableEditor.tableStart) + newMd + value.slice(tableEditor.tableEnd));
    setTableEditor(te => ({ ...te, rows: newRows, tableEnd: tableEditor.tableStart + newMd.length }));
  }, [value, onChange, tableEditor.tableStart, tableEditor.tableEnd]);

  // ── Close menus on outside click ──────────────────────────────────────────
  useEffect(() => {
    if (!cmdMenu.open) return;
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setCmdMenu(m => ({ ...m, open: false }));
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [cmdMenu.open]);

  useEffect(() => {
    if (!wikiMenu.open) return;
    const h = (e: MouseEvent) => {
      if (wikiMenuRef.current && !wikiMenuRef.current.contains(e.target as Node))
        setWikiMenu(m => ({ ...m, open: false }));
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [wikiMenu.open]);

  // ── Render KaTeX ──────────────────────────────────────────────────────────
  const html = renderMarkdown(value, isLibro);
  useEffect(() => { renderMathInElement(pvRef.current); }, [html]);

  // ── handleChange ──────────────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    onChange(newVal);
    const cursor = e.target.selectionStart;
    detectCommand(newVal, cursor);
    detectWikilink(newVal, cursor);
  };

  // ── handleKeyDown ─────────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = taRef.current;
    if (!ta) return;

    // Wikilink menu navigation
    if (wikiMenu.open) {
      if (e.key === "Escape") { e.preventDefault(); setWikiMenu(m => ({ ...m, open: false })); return; }
      if (filteredEntities.length > 0) {
        if (e.key === "ArrowDown") { e.preventDefault(); setWikiMenu(m => ({ ...m, selectedIdx: (m.selectedIdx + 1) % filteredEntities.length })); return; }
        if (e.key === "ArrowUp")   { e.preventDefault(); setWikiMenu(m => ({ ...m, selectedIdx: (m.selectedIdx - 1 + filteredEntities.length) % filteredEntities.length })); return; }
        if (e.key === "Tab" || e.key === "Enter") { e.preventDefault(); applyWikilink(filteredEntities[wikiMenu.selectedIdx]); return; }
      }
    }

    // Command menu navigation
    if (cmdMenu.open && filteredItems.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setCmdMenu(m => ({ ...m, selectedIdx: (m.selectedIdx + 1) % filteredItems.length })); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); setCmdMenu(m => ({ ...m, selectedIdx: (m.selectedIdx - 1 + filteredItems.length) % filteredItems.length })); return; }
      if (e.key === "Tab" || e.key === "Enter") { e.preventDefault(); applyCommand(filteredItems[cmdMenu.selectedIdx]); return; }
      if (e.key === "Escape") { e.preventDefault(); setCmdMenu(m => ({ ...m, open: false })); return; }
    }

    // Tab indent
    if (e.key === "Tab") {
      e.preventDefault();
      const { selectionStart: s, selectionEnd: end } = ta;
      onChange(value.slice(0, s) + "  " + value.slice(end));
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 2; });
      return;
    }

    // Enter — continue list items
    if (e.key === "Enter") {
      const { selectionStart: s } = ta;
      const lines = value.slice(0, s).split("\n");
      const currentLine = lines[lines.length - 1];
      const listMatch = currentLine.match(/^(\s*-\s(?:\[[ xX\s]\]\s)?)(.*)/);
      if (listMatch) {
        if (listMatch[2].trim() === "") {
          e.preventDefault();
          const newVal = value.slice(0, s - listMatch[1].length) + value.slice(s);
          onChange(newVal);
          requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s - listMatch[1].length; });
        } else {
          e.preventDefault();
          insertSnippet(`\n${listMatch[1].replace(/\[[xX]\]/, "[ ]")}`);
        }
        return;
      }
    }

    // [[ handling for wikilinks
    if (e.key === "[") {
      e.preventDefault();
      const { selectionStart: s, selectionEnd: e2 } = ta;
      const currentVal = ta.value;
      const charBefore = currentVal[s - 1];
      const charAfter  = currentVal[s];
      const hasSel = s !== e2;
      if (!hasSel && charBefore === "[" && charAfter === "]") {
        const newVal = currentVal.slice(0, s) + "[]]" + currentVal.slice(s + 1);
        onChange(newVal);
        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 1; ta.focus(); detectWikilink(newVal, s + 1); });
      } else if (!hasSel && charBefore === "[") {
        const newVal = currentVal.slice(0, s) + "[]]" + currentVal.slice(s);
        onChange(newVal);
        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 1; ta.focus(); detectWikilink(newVal, s + 1); });
      } else {
        const sel = hasSel ? currentVal.slice(s, e2) : "";
        const newVal = currentVal.slice(0, s) + "[" + sel + "]" + currentVal.slice(e2);
        onChange(newVal);
        requestAnimationFrame(() => { ta.selectionStart = s + 1; ta.selectionEnd = s + 1 + sel.length; ta.focus(); });
      }
      return;
    }

    // Auto-close pairs
    const autoClosePairs: Record<string, string> = { "(": ")", "{": "}" };
    if (autoClosePairs[e.key]) { e.preventDefault(); wrapSelection(e.key, autoClosePairs[e.key]); return; }

    // Bold / italic shortcuts
    if ((e.ctrlKey || e.metaKey) && e.key === "b") { e.preventDefault(); wrapSelection("**", "**"); }
    if ((e.ctrlKey || e.metaKey) && e.key === "i") { e.preventDefault(); wrapSelection("*", "*"); }
  };

  // ── handleScroll (sync split preview) ────────────────────────────────────
  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    if (mode !== "split" || !pvRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight > clientHeight) {
      const ratio = scrollTop / (scrollHeight - clientHeight);
      pvRef.current.scrollTop = ratio * (pvRef.current.scrollHeight - pvRef.current.clientHeight);
    }
  };

  // ── Styles ────────────────────────────────────────────────────────────────
  const textareaCls =
    "flex-1 w-full bg-transparent outline-none border-none resize-none text-sm font-mono leading-relaxed placeholder:opacity-30";
  const textareaStyle: React.CSSProperties = {
    minHeight: minH,
    overflowY: maxHeight ? "auto" : autoResize ? "hidden" : "auto",
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
    flex: mode === "split" ? 1 : ("none" as any),
  };

  // ────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className={`flex flex-col w-full ${className}`}>
      <style>{PROSE_STYLES}</style>

      <div
        ref={containerRef}
        style={{
          border: toolbar ? "1px solid color-mix(in srgb, var(--foreground) 8%, transparent)" : "none",
          borderRadius: toolbar ? 8 : 0,
          display: "flex",
          flexDirection: "column",
          background: toolbar ? "color-mix(in srgb, var(--bg-menu) 40%, transparent)" : "transparent",
          position: "relative",
        }}
      >
        {/* ── Mobile toolbar ── */}
        {toolbar && isMobile && (
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
              {(["edit", "preview"] as ViewMode[]).map(m => {
                const Icon = m === "edit" ? Edit3 : Eye;
                const isActive = mode === m;
                return (
                  <button
                    key={m}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      width: 26, height: 22,
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
                    title={m === "edit" ? "Editar" : "Vista previa"}
                    type="button"
                    onClick={() => wrappedSetMode(m)}
                  >
                    <Icon size={10} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Find & Replace panel ── */}
        {findReplace.open && (
          <FindReplacePanel
            caseSensitive={findReplace.caseSensitive}
            currentMatch={findReplace.currentMatch}
            find={findReplace.find}
            findInputRef={findInputRef}
            replace={findReplace.replace}
            totalMatches={findReplace.totalMatches}
            onCaseSensitiveChange={v => setFindReplace(s => ({ ...s, caseSensitive: v, currentMatch: 0 }))}
            onClose={() => setFindReplace(s => ({ ...s, open: false }))}
            onFindChange={v => setFindReplace(s => ({ ...s, find: v, currentMatch: 0 }))}
            onFindKeyDown={e => {
              if (e.key === "Enter") { e.shiftKey ? findAndHighlight(-1) : findAndHighlight(1); }
              if (e.key === "Escape") setFindReplace(s => ({ ...s, open: false }));
            }}
            onFindNext={() => findAndHighlight(1)}
            onFindPrev={() => findAndHighlight(-1)}
            onReplaceAll={replaceAll}
            onReplaceChange={v => setFindReplace(s => ({ ...s, replace: v }))}
            onReplaceOne={replaceOne}
          />
        )}

        {/* ── Content area ── */}
        <div
          style={{
            display: "flex",
            flexDirection: mode === "split" ? "row" : "column",
            position: "relative",
          }}
        >
          {/* Textarea */}
          {(mode === "edit" || mode === "split") && (
            <div
              style={{
                flex: mode === "split" ? 1 : "none",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                ...(maxHeight && mode === "edit" ? { maxHeight, overflow: "hidden" } : {}),
              }}
              onScroll={handleScroll}
            >
              {/* Section title decoration */}
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
                ref={node => {
                  (taRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
                  if (textareaRef)
                    (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
                  if (node !== taEl) setTaEl(node);
                }}
                className={textareaCls}
                lang={spellCheck.enabled ? spellCheck.lang : undefined}
                placeholder={placeholder}
                spellCheck={spellCheck.enabled}
                style={textareaStyle}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
              />

              {/* External overlay */}
              {renderOverlay && (
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none", overflow: "visible" }}>
                  {renderOverlay(value, taEl)}
                </div>
              )}

              {/* Command menu */}
              {cmdMenu.open && (
                <CommandMenu
                  items={filteredItems}
                  menuRef={menuRef}
                  pos={cmdMenu.menuPos}
                  query={cmdMenu.query}
                  selectedIdx={cmdMenu.selectedIdx}
                  onHover={idx => setCmdMenu(m => ({ ...m, selectedIdx: idx }))}
                  onSelect={applyCommand}
                />
              )}
            </div>
          )}

          {/* Wikilink menu */}
          {wikiMenu.open && normalizedEntities.length > 0 && (
            <WikilinkMenu
              entities={filteredEntities}
              menuRef={wikiMenuRef}
              pos={wikiMenu.menuPos}
              query={wikiMenu.query}
              selectedIdx={wikiMenu.selectedIdx}
              onHover={idx => setWikiMenu(m => ({ ...m, selectedIdx: idx }))}
              onSelect={applyWikilink}
            />
          )}

          {/* Split divider */}
          {mode === "split" && (
            <div style={{ width: 1, background: "color-mix(in srgb, var(--foreground) 7%, transparent)", flexShrink: 0 }} />
          )}

          {/* Preview */}
          {(mode === "preview" || mode === "split") && (
            <MarkdownPreviewWithSnippets
              isLibro={isLibro}
              placeholder={placeholder}
              pvRef={pvRef}
              style={previewStyle}
              value={sectionTitle ? `# ${sectionTitle}\n\n${value}` : value}
              onSnippetAction={onSnippetAction}
              onTableClick={openTableEditor}
            />
          )}
        </div>
      </div>

      {/* Table editor */}
      {tableEditor.open && tableEditor.anchorEl && (
        <TableEditorPanel
          anchorEl={tableEditor.anchorEl}
          rows={tableEditor.rows}
          onAddCol={() => commitTableEdit(tableEditor.rows.map(r => [...r, ""]))}
          onAddRow={() => {
            const cols = tableEditor.rows[0]?.length ?? 1;
            commitTableEdit([...tableEditor.rows, Array(cols).fill("")]);
          }}
          onCellChange={(ri, ci, v) => {
            commitTableEdit(tableEditor.rows.map((r, rr) =>
              r.map((c, cc) => rr === ri && cc === ci ? v : c),
            ));
          }}
          onClose={() => setTableEditor(te => ({ ...te, open: false }))}
          onDeleteLastCol={() => {
            if ((tableEditor.rows[0]?.length ?? 0) > 1)
              commitTableEdit(tableEditor.rows.map(r => r.slice(0, -1)));
          }}
          onDeleteLastRow={() => {
            if (tableEditor.rows.length > 1) commitTableEdit(tableEditor.rows.slice(0, -1));
          }}
          onDeleteRow={ri => { if (ri > 0) commitTableEdit(tableEditor.rows.filter((_, r) => r !== ri)); }}
        />
      )}
    </div>
  );
}