"use client";
import React, {
  useState, useEffect, useCallback, useRef, useReducer, useMemo
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Maximize2, Minimize2, Moon, Sun, BookMarked, X,
  Upload, Keyboard, RotateCcw, List, EyeOff, Eye,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & STATE
// ─────────────────────────────────────────────────────────────────────────────
interface Bookmark { page: number; createdAt: number }

// Modos de lectura — filtros CSS que se aplican al canvas
export type ReadMode = "normal" | "night" | "sepia" | "dim" | "theme";

export const READ_MODES: { id: ReadMode; label: string; emoji: string; filter: string; bg: string }[] = [
  {
    id: "normal",
    label: "Normal",
    emoji: "☀️",
    filter: "none",
    bg: "var(--bg-main)",
  },
  {
    id: "sepia",
    label: "Sepia",
    emoji: "📜",
    filter: "sepia(0.7) brightness(0.97) contrast(0.92)",
    bg: "#f5f0e4",
  },
  {
    id: "dim",
    label: "Suave",
    emoji: "🌤",
    filter: "brightness(0.82) contrast(0.88) saturate(0.8)",
    bg: "color-mix(in srgb, var(--bg-main) 85%, var(--primary) 15%)",
  },
  {
    id: "theme",
    label: "Tema",
    emoji: "🎨",
    // Tinte del color primario del tema — sutil
    filter: "brightness(0.9) contrast(0.95) hue-rotate(var(--reader-hue, 0deg)) saturate(0.7)",
    bg: "color-mix(in srgb, var(--bg-main) 70%, var(--accent) 30%)",
  },
  {
    id: "night",
    label: "Noche",
    emoji: "🌙",
    filter: "invert(1) hue-rotate(180deg) brightness(0.85)",
    bg: "#111008",
  },
];

interface RS {
  totalPages: number;
  zoom: number;
  visiblePage: number;
  fullscreen: boolean;
  readMode: ReadMode;
  immersive: boolean;
  showBookmarks: boolean;
  showShortcuts: boolean;
  showModes: boolean;
  showTOC: boolean;
  bookmarks: Bookmark[];
  toc: { title: string; level: number }[];
}

type A =
  | { type: "SET_TOTAL"; total: number }
  | { type: "SET_ZOOM"; zoom: number }
  | { type: "SET_VISIBLE_PAGE"; page: number }
  | { type: "TOGGLE_FULLSCREEN" }
  | { type: "SET_READ_MODE"; mode: ReadMode }
  | { type: "TOGGLE_BOOKMARKS" }
  | { type: "TOGGLE_SHORTCUTS" }
  | { type: "TOGGLE_TOC" }
  | { type: "TOGGLE_MODES" }
  | { type: "TOGGLE_IMMERSIVE" }
  | { type: "ADD_BOOKMARK"; page: number }
  | { type: "REMOVE_BOOKMARK"; page: number }
  | { type: "SET_TOC"; toc: RS["toc"] }
  | { type: "RESET" };

const init: RS = {
  totalPages: 0, zoom: 1.4, visiblePage: 1,
  fullscreen: false, readMode: "normal", immersive: false,
  showBookmarks: false, showShortcuts: false, showModes: false, showTOC: false,
  bookmarks: [], toc: [],
};

function reducer(s: RS, a: A): RS {
  switch (a.type) {
    case "SET_TOTAL":         return { ...s, totalPages: a.total };
    case "SET_ZOOM":          return { ...s, zoom: Math.max(0.5, Math.min(4, a.zoom)) };
    case "SET_VISIBLE_PAGE":  return { ...s, visiblePage: a.page };
    case "TOGGLE_IMMERSIVE":  return { ...s, immersive: !s.immersive, showBookmarks: false, showTOC: false, showModes: false };
    case "TOGGLE_FULLSCREEN": return { ...s, fullscreen: !s.fullscreen, showBookmarks: false, showTOC: false };
    case "SET_READ_MODE":     return { ...s, readMode: a.mode, showModes: false };
    case "TOGGLE_BOOKMARKS":  return { ...s, showBookmarks: !s.showBookmarks, showTOC: false, showModes: false };
    case "TOGGLE_SHORTCUTS":  return { ...s, showShortcuts: !s.showShortcuts };
    case "TOGGLE_TOC":        return { ...s, showTOC: !s.showTOC, showBookmarks: false, showModes: false };
    case "TOGGLE_MODES":      return { ...s, showModes: !s.showModes, showBookmarks: false, showTOC: false };
    case "ADD_BOOKMARK":
      if (s.bookmarks.find(b => b.page === a.page)) return s;
      return { ...s, bookmarks: [...s.bookmarks, { page: a.page, createdAt: Date.now() }] };
    case "REMOVE_BOOKMARK":   return { ...s, bookmarks: s.bookmarks.filter(b => b.page !== a.page) };
    case "SET_TOC":           return { ...s, toc: a.toc };
    case "RESET":             return { ...init };
    default:                  return s;
  }
}

const SHORTCUTS = [
  { key: "I",                 desc: "Modo inmersivo (ocultar UI)" },
  { key: "M",                 desc: "Ciclar modo de lectura" },
  { key: "↓ / → / D",        desc: "Bajar 85% de pantalla" },
  { key: "↑ / ← / A",        desc: "Subir 85% de pantalla" },
  { key: "Espacio",           desc: "Bajar pantalla completa" },
  { key: "Shift + Espacio",   desc: "Subir pantalla completa" },
  { key: "Inicio / Fin",      desc: "Primera / Última página" },
  { key: "+ / -",             desc: "Zoom más / menos" },
  { key: "0",                 desc: "Resetear zoom (140%)" },
  { key: "F",                 desc: "Pantalla completa" },
  { key: "B",                 desc: "Marcar página actual" },
  { key: "Esc",               desc: "Cerrar paneles" },
];

// ─────────────────────────────────────────────────────────────────────────────
// PAGE CANVAS (individual, memoized)
// ─────────────────────────────────────────────────────────────────────────────
const PageCanvas = React.memo(function PageCanvas({
  pdfDoc, pageNum, zoom, readMode, onVisible,
}: {
  pdfDoc: any; pageNum: number; zoom: number; readMode: ReadMode;
  onVisible: (page: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const taskRef   = useRef<any>(null);
  const [rendered, setRendered] = useState(false);

  // Report visibility to parent
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) onVisible(pageNum); },
      { threshold: 0.25 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [pageNum, onVisible]);

  // Render canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let cancelled = false;

    const render = async () => {
      if (taskRef.current) { taskRef.current.cancel(); taskRef.current = null; }
      setRendered(false);
      try {
        const page     = await pdfDoc.getPage(pageNum);
        const dpr      = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: zoom * dpr });
        const canvas   = canvasRef.current!;
        const ctx      = canvas.getContext("2d")!;
        canvas.width        = viewport.width;
        canvas.height       = viewport.height;
        canvas.style.width  = `${viewport.width  / dpr}px`;
        canvas.style.height = `${viewport.height / dpr}px`;
        if (cancelled) return;
        taskRef.current = page.render({ canvasContext: ctx, viewport });
        await taskRef.current.promise;
        if (!cancelled) setRendered(true);
      } catch (e: any) {
        if (e?.name !== "RenderingCancelledException") console.error(e);
      }
    };
    render();
    return () => { cancelled = true; taskRef.current?.cancel(); };
  }, [pdfDoc, pageNum, zoom]);

  return (
    <div ref={wrapRef} id={`pdf-page-${pageNum}`}
      className="relative flex justify-center" style={{ marginBottom: "12px" }}>
      {!rendered && (
        <div className="flex items-center justify-center"
          style={{
            width: "100%", height: "600px",
            background: "color-mix(in srgb, var(--primary) 4%, transparent)",
            borderRadius: "var(--radius-btn)",
          }}>
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}>
            <RotateCcw size={18} style={{ color: "var(--primary)", opacity: 0.3 }} />
          </motion.div>
        </div>
      )}
      <canvas ref={canvasRef} style={{
        display: rendered ? "block" : "none",
        borderRadius: "var(--radius-btn)",
        boxShadow: "0 4px 32px rgba(0,0,0,0.18)",
        filter: READ_MODES.find(m => m.id === readMode)?.filter ?? "none",
        transition: "filter 0.4s ease",
        maxWidth: "100%",
      }} />
      <div className="absolute bottom-3 right-3 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 pointer-events-none"
        style={{
          background: "color-mix(in srgb, var(--foreground) 55%, transparent)",
          color: "var(--bg-main)",
          borderRadius: "var(--radius-btn)",
          opacity: 0.45,
        }}>
        {pageNum}
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function LectorPDF() {
  const [s, dispatch]    = useReducer(reducer, init);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDoc,  setPdfDoc]  = useState<any>(null);
  const [pdfjsReady, setPdfjsReady] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);
  const touch     = useRef({ x: 0, y: 0, dist: 0, pinching: false });

  // ── Load pdf.js from CDN ───────────────────────────────────────────────────
  useEffect(() => {
    if ((window as any).pdfjsLib) { setPdfjsReady(true); return; }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      setPdfjsReady(true);
    };
    document.head.appendChild(script);
  }, []);

  // ── Load PDF ───────────────────────────────────────────────────────────────
  const loadPDF = useCallback(async (file: File) => {
    if (!pdfjsReady) return;
    const buf = await file.arrayBuffer();
    const doc = await (window as any).pdfjsLib.getDocument({ data: buf }).promise;
    setPdfDoc(doc);
    dispatch({ type: "SET_TOTAL", total: doc.numPages });
    try {
      const outline = await doc.getOutline();
      if (outline) {
        const toc: RS["toc"] = [];
        const walk = (items: any[], level = 0) =>
          items.forEach(i => { toc.push({ title: i.title, level }); if (i.items?.length) walk(i.items, level + 1); });
        walk(outline);
        dispatch({ type: "SET_TOC", toc });
      }
    } catch {}
    setTimeout(() => scrollRef.current?.scrollTo({ top: 0 }), 50);
  }, [pdfjsReady]);

  const handleFile = useCallback((file: File) => {
    if (!file?.name.toLowerCase().endsWith(".pdf")) return;
    setPdfFile(file);
    loadPDF(file);
  }, [loadPDF]);

  // ── Scroll helpers ─────────────────────────────────────────────────────────
  // KEY FEATURE: scroll by fraction of viewport height, smooth
  const scrollBy = useCallback((fraction: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ top: el.clientHeight * fraction, behavior: "smooth" });
  }, []);

  const scrollToPage = useCallback((page: number) => {
    document.getElementById(`pdf-page-${page}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleVisible = useCallback((page: number) => {
    dispatch({ type: "SET_VISIBLE_PAGE", page });
  }, []);

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pdfDoc) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      switch (e.key) {
        case "ArrowDown":  case "ArrowRight": case "d":
          e.preventDefault(); scrollBy(0.85); break;
        case "ArrowUp":    case "ArrowLeft":  case "a":
          e.preventDefault(); scrollBy(-0.85); break;
        case " ":
          e.preventDefault(); scrollBy(e.shiftKey ? -1 : 1); break;
        case "Home":  scrollToPage(1);            break;
        case "End":   scrollToPage(s.totalPages); break;
        case "+": case "=": dispatch({ type: "SET_ZOOM", zoom: s.zoom + 0.2 }); break;
        case "-":           dispatch({ type: "SET_ZOOM", zoom: s.zoom - 0.2 }); break;
        case "0":           dispatch({ type: "SET_ZOOM", zoom: 1.4 }); break;
        case "i": case "I": dispatch({ type: "TOGGLE_IMMERSIVE" }); break;
        case "m": case "M": {
          const modes = READ_MODES.map(m => m.id);
          const next = modes[(modes.indexOf(s.readMode) + 1) % modes.length];
          dispatch({ type: "SET_READ_MODE", mode: next });
          break;
        }
        case "f": case "F": dispatch({ type: "TOGGLE_FULLSCREEN" }); break;
        case "b": case "B": dispatch({ type: "ADD_BOOKMARK", page: s.visiblePage }); break;
        case "Escape":
          if (s.immersive)       dispatch({ type: "TOGGLE_IMMERSIVE" });
          else if (s.fullscreen)      dispatch({ type: "TOGGLE_FULLSCREEN" });
          else if (s.showShortcuts) dispatch({ type: "TOGGLE_SHORTCUTS" });
          else if (s.showBookmarks) dispatch({ type: "TOGGLE_BOOKMARKS" });
          else if (s.showTOC)       dispatch({ type: "TOGGLE_TOC" });
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pdfDoc, s, scrollBy, scrollToPage]);

  // ── Touch ─────────────────────────────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touch.current = { ...touch.current, x: e.touches[0].clientX, y: e.touches[0].clientY, pinching: false };
    } else {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      touch.current = { ...touch.current, dist: d, pinching: true };
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 2 || !touch.current.pinching) return;
    const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    dispatch({ type: "SET_ZOOM", zoom: s.zoom + (d - touch.current.dist) / 250 });
    touch.current.dist = d;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touch.current.pinching) return;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    if (Math.abs(dy) > 40) scrollBy(dy > 0 ? -0.85 : 0.85);
  };

  const isBookmarked = s.bookmarks.some(b => b.page === s.visiblePage);
  const progress     = s.totalPages ? (s.visiblePage / s.totalPages) * 100 : 0;
  const pages        = useMemo(() => Array.from({ length: s.totalPages }, (_, i) => i + 1), [s.totalPages]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={`flex flex-col w-full transition-colors duration-300 ${
        s.fullscreen ? "fixed inset-0 z-[2000]" : "h-[calc(100dvh-64px)] md:h-[calc(100dvh-80px)]"
      } ${s.readMode === "night" ? "bg-[#111008]" : "bg-bg-main"}`}
    >

      {/* ── HEADER ── */}
      <AnimatePresence initial={false}>
        {!s.immersive && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="shrink-0"
          >
            <header className="flex items-center gap-2 px-4 py-2.5 border-b z-10"
              style={{
                background: s.readMode === "night" ? "#080604" : "var(--bg-menu)",
                borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
              }}>
              <BookOpen size={14} style={{ color: "var(--menu-text)", opacity: 0.5 }} className="shrink-0" />
              <span className="text-[9px] font-black uppercase tracking-widest truncate flex-1 min-w-0"
                style={{ color: "var(--menu-text)", opacity: 0.6 }}>
                {pdfFile ? pdfFile.name : "Lector PDF"}
              </span>

              {pdfDoc && (
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[9px] font-black tabular-nums px-2"
                    style={{ color: "var(--menu-text)", opacity: 0.4 }}>
                    {s.visiblePage} / {s.totalPages}
                  </span>

                  {/* Zoom — desktop */}
                  <div className="hidden sm:flex items-center gap-0.5">
                    <button onClick={() => dispatch({ type: "SET_ZOOM", zoom: s.zoom - 0.2 })}
                      className="p-1.5 transition-opacity hover:opacity-100"
                      style={{ color: "var(--menu-text)", opacity: 0.5 }}>
                      <ZoomOut size={12} />
                    </button>
                    <button onClick={() => dispatch({ type: "SET_ZOOM", zoom: 1.4 })}
                      className="text-[9px] font-black w-9 text-center transition-opacity hover:opacity-100"
                      style={{ color: "var(--menu-text)", opacity: 0.5 }}>
                      {Math.round(s.zoom * 100)}%
                    </button>
                    <button onClick={() => dispatch({ type: "SET_ZOOM", zoom: s.zoom + 0.2 })}
                      className="p-1.5 transition-opacity hover:opacity-100"
                      style={{ color: "var(--menu-text)", opacity: 0.5 }}>
                      <ZoomIn size={12} />
                    </button>
                  </div>

                  {/* Icon buttons */}
                  {[
                    { icon: <List size={12}/>,     fn: () => dispatch({ type: "TOGGLE_TOC" }),       active: s.showTOC,       show: s.toc.length > 0, title: "Índice" },
                    { icon: <BookMarked size={12}/>, fn: () => dispatch({ type: "ADD_BOOKMARK", page: s.visiblePage }), active: isBookmarked, show: true, title: "Marcar" },
                    { icon: <span style={{ fontSize: 13 }}>{READ_MODES.find(m => m.id === s.readMode)?.emoji}</span>, fn: () => dispatch({ type: "TOGGLE_MODES" }), active: s.showModes || s.readMode !== "normal", show: true, title: "Modo de lectura (M)" },
                    { icon: s.fullscreen ? <Minimize2 size={12}/> : <Maximize2 size={12}/>, fn: () => dispatch({ type: "TOGGLE_FULLSCREEN" }), active: s.fullscreen, show: true, title: "Fullscreen" },
                    { icon: <EyeOff size={12}/>, fn: () => dispatch({ type: "TOGGLE_IMMERSIVE" }), active: false, show: true, title: "Modo inmersivo (I)" },
                    { icon: <Keyboard size={12}/>, fn: () => dispatch({ type: "TOGGLE_SHORTCUTS" }), active: false, show: true, title: "Atajos" },
                  ].filter(b => b.show).map((btn, i) => (
                    <button key={i} onClick={btn.fn} title={btn.title}
                      className="p-1.5 transition-all"
                      style={{
                        color:      btn.active ? "var(--accent)" : "var(--menu-text)",
                        opacity:    btn.active ? 1 : 0.5,
                        borderRadius: "var(--radius-btn)",
                        background: btn.active ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "transparent",
                      }}>
                      {btn.icon}
                    </button>
                  ))}

                  <button onClick={() => fileRef.current?.click()}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest ml-1"
                    style={{
                      background: "color-mix(in srgb, var(--menu-text) 10%, transparent)",
                      color: "var(--menu-text)",
                      borderRadius: "var(--radius-btn)",
                    }}>
                    <Upload size={10} /> Abrir
                  </button>
                </div>
              )}
            </header>

            {/* ── PROGRESS BAR ── */}
            {pdfDoc && (
              <div className="h-[2px]" style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
                <motion.div className="h-full" style={{ background: "var(--accent)" }}
                  animate={{ width: `${progress}%` }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── IMMERSIVE: floating restore button ── */}
      <AnimatePresence>
        {s.immersive && pdfDoc && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 400, damping: 30 }}
            className="fixed top-4 right-4 z-[1500] flex items-center gap-2"
          >
            {/* Page indicator pill */}
            <div className="px-3 py-1.5 text-[9px] font-black tabular-nums"
              style={{
                background: "color-mix(in srgb, var(--foreground) 12%, transparent)",
                color: "var(--foreground)",
                opacity: 0.5,
                borderRadius: "var(--radius-btn)",
                backdropFilter: "blur(8px)",
              }}>
              {s.visiblePage} / {s.totalPages}
            </div>
            {/* Eye button to exit */}
            <button
              onClick={() => dispatch({ type: "TOGGLE_IMMERSIVE" })}
              title="Salir del modo inmersivo (I / Esc)"
              className="p-2 transition-all"
              style={{
                background: "color-mix(in srgb, var(--foreground) 10%, transparent)",
                color: "var(--foreground)",
                opacity: 0.4,
                borderRadius: "var(--radius-btn)",
                backdropFilter: "blur(8px)",
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "0.4")}
            >
              <Eye size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* ── MODE PICKER — floating dropdown ── */}
        <AnimatePresence>
          {s.showModes && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute top-2 right-2 z-[100] p-3 flex flex-col gap-1.5"
              style={{
                background: "var(--white-custom)",
                borderRadius: "var(--radius-card)",
                border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                boxShadow: "var(--shadow-card)",
                minWidth: "160px",
              }}
            >
              <p className="text-[8px] font-black uppercase tracking-widest mb-1 px-1"
                style={{ color: "var(--primary)", opacity: 0.4 }}>Modo de lectura</p>
              {READ_MODES.map(mode => (
                <button
                  key={mode.id}
                  onClick={() => dispatch({ type: "SET_READ_MODE", mode: mode.id })}
                  className="flex items-center gap-2.5 px-3 py-2 text-left transition-all"
                  style={{
                    borderRadius: "var(--radius-btn)",
                    background: s.readMode === mode.id
                      ? "color-mix(in srgb, var(--primary) 12%, transparent)"
                      : "transparent",
                    border: s.readMode === mode.id
                      ? "1px solid color-mix(in srgb, var(--primary) 20%, transparent)"
                      : "1px solid transparent",
                  }}
                >
                  <span style={{ fontSize: 16 }}>{mode.emoji}</span>
                  <div>
                    <p className="text-[10px] font-black" style={{
                      color: s.readMode === mode.id ? "var(--primary)" : "var(--foreground)",
                    }}>
                      {mode.label}
                    </p>
                    {/* Mini preview strip */}
                    <div className="w-16 h-1.5 mt-0.5 rounded-full overflow-hidden"
                      style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                      <div className="h-full w-full" style={{
                        background: mode.id === "night" ? "#222"
                          : mode.id === "sepia" ? "#d4a96a"
                          : mode.id === "dim" ? "color-mix(in srgb, var(--primary) 30%, transparent)"
                          : mode.id === "theme" ? "color-mix(in srgb, var(--accent) 50%, transparent)"
                          : "var(--bg-main)",
                        filter: mode.filter !== "none" ? mode.filter : undefined,
                      }} />
                    </div>
                  </div>
                  {s.readMode === mode.id && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: "var(--primary)" }} />
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* TOC sidebar */}
        <AnimatePresence>
          {s.showTOC && s.toc.length > 0 && (
            <motion.aside
              initial={{ x: -260, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -260, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="w-60 shrink-0 overflow-y-auto border-r"
              style={{
                background: s.readMode === "night" ? "#0d0a04" : "var(--white-custom)",
                borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
              }}>
              <div className="p-4">
                <p className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: "var(--primary)", opacity: 0.4 }}>Índice</p>
                {s.toc.map((item, i) => (
                  <button key={i}
                    className="w-full text-left py-1.5 truncate text-[11px] font-medium transition-opacity hover:opacity-100 block"
                    style={{ paddingLeft: `${8 + item.level * 14}px`, color: "var(--foreground)", opacity: 0.65, borderRadius: "var(--radius-btn)" }}>
                    {item.title}
                  </button>
                ))}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* MAIN SCROLL */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {!pdfDoc ? (
            /* ── DROP ZONE ── */
            <div className="flex-1 flex items-center justify-center p-8 cursor-pointer"
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}>
              <motion.div whileHover={{ scale: 1.02 }}
                className="flex flex-col items-center gap-6 p-14 border-2 border-dashed w-full max-w-md"
                style={{
                  borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)",
                  borderRadius: "var(--radius-card)",
                  background: "color-mix(in srgb, var(--primary) 3%, transparent)",
                }}>
                <div className="relative">
                  <div className="w-20 h-24 flex items-center justify-center"
                    style={{
                      background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                      borderRadius: "var(--radius-card)",
                      border: "2px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                    }}>
                    <BookOpen size={36} style={{ color: "var(--primary)", opacity: 0.35 }} />
                  </div>
                  <motion.div
                    animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="absolute -top-2 -right-2 w-7 h-7 flex items-center justify-center"
                    style={{
                      background: "var(--accent)",
                      borderRadius: "var(--radius-btn)",
                      boxShadow: "0 4px 12px color-mix(in srgb, var(--accent) 40%, transparent)",
                    }}>
                    <Upload size={13} style={{ color: "var(--btn-text)" }} />
                  </motion.div>
                </div>
                <div className="text-center space-y-1.5">
                  <p className="text-lg font-black uppercase tracking-tighter" style={{ color: "var(--primary)" }}>
                    Abrir un libro
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--primary)", opacity: 0.35 }}>
                    Arrastra un PDF o haz click aquí
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 w-full pt-2">
                  {[["↓↑ / →←", "Scroll"], ["+ −", "Zoom"], ["Pellizco", "Táctil"]].map(([k, v]) => (
                    <div key={k} className="text-center py-2 px-1"
                      style={{ background: "color-mix(in srgb, var(--primary) 5%, transparent)", borderRadius: "var(--radius-btn)" }}>
                      <p className="text-[11px] font-black" style={{ color: "var(--primary)" }}>{k}</p>
                      <p className="text-[8px] font-bold uppercase tracking-widest mt-0.5" style={{ color: "var(--primary)", opacity: 0.4 }}>{v}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : (
            /* ── CONTINUOUS SCROLL ── */
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto overflow-x-auto py-6 px-4"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              style={{
                background: READ_MODES.find(m => m.id === s.readMode)?.bg,
                transition: "background 0.4s ease",
              }}
            >
              <div className="flex flex-col items-center" style={{ minWidth: "fit-content" }}>
                {pages.map(n => (
                  <PageCanvas
                    key={n}
                    pdfDoc={pdfDoc}
                    pageNum={n}
                    zoom={s.zoom}
                    readMode={s.readMode}
                    onVisible={handleVisible}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bookmarks panel */}
        <AnimatePresence>
          {s.showBookmarks && (
            <motion.aside
              initial={{ x: 240, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 240, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="w-52 shrink-0 overflow-y-auto border-l"
              style={{
                background: s.readMode === "night" ? "#0d0a04" : "var(--white-custom)",
                borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
              }}>
              <div className="p-4">
                <p className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: "var(--primary)", opacity: 0.4 }}>Marcadores</p>
                {s.bookmarks.length === 0 ? (
                  <p className="text-[10px] italic leading-relaxed" style={{ color: "var(--primary)", opacity: 0.3 }}>
                    Sin marcadores. Presiona B para marcar la página actual.
                  </p>
                ) : (
                  [...s.bookmarks].sort((a, b) => a.page - b.page).map(bm => (
                    <div key={bm.page} className="flex items-center gap-1.5 mb-1.5">
                      <button onClick={() => scrollToPage(bm.page)}
                        className="flex-1 text-left py-2 px-3 text-[10px] font-black transition-all"
                        style={{
                          color: "var(--primary)",
                          background: "color-mix(in srgb, var(--primary) 6%, transparent)",
                          borderRadius: "var(--radius-btn)",
                        }}>
                        Pág. {bm.page}
                      </button>
                      <button onClick={() => dispatch({ type: "REMOVE_BOOKMARK", page: bm.page })}
                        className="p-1 transition-opacity hover:opacity-100"
                        style={{ color: "var(--primary)", opacity: 0.3, borderRadius: "var(--radius-btn)" }}>
                        <X size={10} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* ── BOTTOM NAV ── */}
      <AnimatePresence initial={false}>
        {pdfDoc && !s.immersive && (
          <motion.nav
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="shrink-0 flex items-center gap-3 px-4 py-2.5 border-t"
            style={{
              background: s.readMode === "night" ? "#080604" : "var(--bg-menu)",
              borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
            }}>

            <button onClick={() => scrollBy(-0.85)}
              className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all"
              style={{
                color: "var(--menu-text)",
                background: "color-mix(in srgb, var(--menu-text) 8%, transparent)",
                borderRadius: "var(--radius-btn)",
              }}>
              <ChevronLeft size={13} />
              <span className="hidden sm:inline">Subir</span>
            </button>

            <button onClick={() => dispatch({ type: "TOGGLE_BOOKMARKS" })}
              className="p-2 transition-all"
              style={{
                color:      s.showBookmarks ? "var(--accent)" : "var(--menu-text)",
                opacity:    s.showBookmarks ? 1 : 0.45,
                borderRadius: "var(--radius-btn)",
                background: s.showBookmarks ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "transparent",
              }}>
              <BookMarked size={13} />
            </button>

            {/* Zoom — mobile */}
            <div className="flex sm:hidden items-center gap-1 flex-1 justify-center">
              <button onClick={() => dispatch({ type: "SET_ZOOM", zoom: s.zoom - 0.2 })}
                className="p-1.5" style={{ color: "var(--menu-text)", opacity: 0.5 }}><ZoomOut size={13} /></button>
              <button onClick={() => dispatch({ type: "SET_ZOOM", zoom: 1.4 })}
                className="text-[9px] font-black w-10 text-center" style={{ color: "var(--menu-text)", opacity: 0.5 }}>
                {Math.round(s.zoom * 100)}%
              </button>
              <button onClick={() => dispatch({ type: "SET_ZOOM", zoom: s.zoom + 0.2 })}
                className="p-1.5" style={{ color: "var(--menu-text)", opacity: 0.5 }}><ZoomIn size={13} /></button>
            </div>

            <span className="hidden sm:block text-[9px] font-black tabular-nums flex-1 text-center"
              style={{ color: "var(--menu-text)", opacity: 0.4 }}>
              Pág. {s.visiblePage} / {s.totalPages}
            </span>

            {/* Jump to page */}
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-[8px] font-bold uppercase" style={{ color: "var(--menu-text)", opacity: 0.35 }}>Ir a</span>
              <input
                type="number" min={1} max={s.totalPages} placeholder={String(s.visiblePage)}
                className="w-12 text-center text-[10px] font-black bg-transparent border outline-none py-0.5"
                style={{
                  color: "var(--menu-text)",
                  borderColor: "color-mix(in srgb, var(--menu-text) 20%, transparent)",
                  borderRadius: "var(--radius-btn)",
                }}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    const n = parseInt((e.target as HTMLInputElement).value);
                    if (n >= 1 && n <= s.totalPages) scrollToPage(n);
                    (e.target as HTMLInputElement).value = "";
                  }
                }}
              />
            </div>

            <button onClick={() => fileRef.current?.click()}
              className="sm:hidden p-2" style={{ color: "var(--menu-text)", opacity: 0.5, borderRadius: "var(--radius-btn)" }}>
              <Upload size={13} />
            </button>

            <button onClick={() => scrollBy(0.85)}
              className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all"
              style={{
                color: "var(--menu-text)",
                background: "color-mix(in srgb, var(--menu-text) 8%, transparent)",
                borderRadius: "var(--radius-btn)",
              }}>
              <span className="hidden sm:inline">Bajar</span>
              <ChevronRight size={13} />
            </button>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* ── SHORTCUTS MODAL ── */}
      <AnimatePresence>
        {s.showShortcuts && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3000] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}
            onClick={() => dispatch({ type: "TOGGLE_SHORTCUTS" })}>
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm p-6"
              style={{
                background: "var(--white-custom)",
                borderRadius: "var(--radius-card)",
                border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                boxShadow: "var(--shadow-card)",
              }}>
              <div className="flex items-center justify-between mb-5">
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--primary)", opacity: 0.45 }}>
                  Atajos de teclado
                </p>
                <button onClick={() => dispatch({ type: "TOGGLE_SHORTCUTS" })}
                  className="p-1" style={{ color: "var(--primary)", opacity: 0.35, borderRadius: "var(--radius-btn)" }}>
                  <X size={13} />
                </button>
              </div>
              <div className="space-y-2">
                {SHORTCUTS.map(sc => (
                  <div key={sc.key} className="flex items-center justify-between gap-3">
                    <code className="text-[9px] font-black px-2 py-0.5 shrink-0"
                      style={{
                        background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                        color: "var(--primary)",
                        borderRadius: "var(--radius-btn)",
                        border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
                      }}>
                      {sc.key}
                    </code>
                    <span className="text-[11px] font-medium text-right" style={{ color: "var(--foreground)", opacity: 0.65 }}>
                      {sc.desc}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t text-center"
                style={{ borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
                <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: "var(--primary)", opacity: 0.28 }}>
                  Táctil: deslizar vertical · pellizcar para zoom
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <input ref={fileRef} type="file" accept="application/pdf" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
    </div>
  );
}