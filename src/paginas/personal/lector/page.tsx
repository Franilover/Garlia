"use client";
import React, { useState, useEffect, useCallback, useRef, useReducer } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Maximize2, Minimize2, Moon, Sun, BookMarked, X,
  Upload, Keyboard, RotateCcw, List, Search
} from "lucide-react";

// ── TYPES ────────────────────────────────────────────────────────────────────
interface Bookmark {
  page: number;
  label: string;
  createdAt: number;
}

interface ReaderState {
  page: number;
  totalPages: number;
  zoom: number;
  fullscreen: boolean;
  nightMode: boolean;
  showBookmarks: boolean;
  showShortcuts: boolean;
  showTOC: boolean;
  bookmarks: Bookmark[];
  toc: { title: string; page: number; level: number }[];
  searchQuery: string;
  searchOpen: boolean;
}

type Action =
  | { type: "SET_PAGE"; page: number }
  | { type: "SET_TOTAL"; total: number }
  | { type: "SET_ZOOM"; zoom: number }
  | { type: "TOGGLE_FULLSCREEN" }
  | { type: "TOGGLE_NIGHT" }
  | { type: "TOGGLE_BOOKMARKS" }
  | { type: "TOGGLE_SHORTCUTS" }
  | { type: "TOGGLE_TOC" }
  | { type: "TOGGLE_SEARCH" }
  | { type: "SET_SEARCH"; query: string }
  | { type: "ADD_BOOKMARK"; page: number }
  | { type: "REMOVE_BOOKMARK"; page: number }
  | { type: "SET_TOC"; toc: ReaderState["toc"] }
  | { type: "RESET" };

function reducer(state: ReaderState, action: Action): ReaderState {
  switch (action.type) {
    case "SET_PAGE":     return { ...state, page: Math.max(1, Math.min(action.page, state.totalPages || 1)) };
    case "SET_TOTAL":    return { ...state, totalPages: action.total };
    case "SET_ZOOM":     return { ...state, zoom: Math.max(0.5, Math.min(3, action.zoom)) };
    case "TOGGLE_FULLSCREEN": return { ...state, fullscreen: !state.fullscreen, showBookmarks: false, showTOC: false };
    case "TOGGLE_NIGHT": return { ...state, nightMode: !state.nightMode };
    case "TOGGLE_BOOKMARKS": return { ...state, showBookmarks: !state.showBookmarks, showTOC: false };
    case "TOGGLE_TOC":   return { ...state, showTOC: !state.showTOC, showBookmarks: false };
    case "TOGGLE_SHORTCUTS": return { ...state, showShortcuts: !state.showShortcuts };
    case "TOGGLE_SEARCH": return { ...state, searchOpen: !state.searchOpen, searchQuery: "" };
    case "SET_SEARCH":   return { ...state, searchQuery: action.query };
    case "ADD_BOOKMARK":
      if (state.bookmarks.find(b => b.page === action.page)) return state;
      return { ...state, bookmarks: [...state.bookmarks, { page: action.page, label: `Página ${action.page}`, createdAt: Date.now() }] };
    case "REMOVE_BOOKMARK":
      return { ...state, bookmarks: state.bookmarks.filter(b => b.page !== action.page) };
    case "SET_TOC":      return { ...state, toc: action.toc };
    case "RESET":        return { ...initialState };
    default:             return state;
  }
}

const initialState: ReaderState = {
  page: 1, totalPages: 0, zoom: 1, fullscreen: false,
  nightMode: false, showBookmarks: false, showShortcuts: false,
  showTOC: false, bookmarks: [], toc: [], searchQuery: "", searchOpen: false,
};

// ── SHORTCUT LIST ─────────────────────────────────────────────────────────────
const SHORTCUTS = [
  { key: "←  /  A", desc: "Página anterior" },
  { key: "→  /  D", desc: "Página siguiente" },
  { key: "Inicio / Fin", desc: "Primera / Última página" },
  { key: "+ / -", desc: "Aumentar / Reducir zoom" },
  { key: "0", desc: "Zoom al 100%" },
  { key: "F", desc: "Pantalla completa" },
  { key: "N", desc: "Modo noche" },
  { key: "B", desc: "Marcar página" },
  { key: "Esc", desc: "Cerrar / Salir" },
];

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function LectorPDF() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [rendering, setRendering] = useState(false);
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);

  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const fileRef    = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTask = useRef<any>(null);

  // Touch state
  const touchState = useRef({ startX: 0, startY: 0, startDist: 0, isPinching: false });

  // ── Load pdf.js from CDN ───────────────────────────────────────────────────
  useEffect(() => {
    if ((window as any).pdfjsLib) { setPdfjsLoaded(true); return; }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      setPdfjsLoaded(true);
    };
    document.head.appendChild(script);
  }, []);

  // ── Load PDF file ──────────────────────────────────────────────────────────
  const loadPDF = useCallback(async (file: File) => {
    if (!pdfjsLoaded) return;
    const pdfjsLib = (window as any).pdfjsLib;
    const arrayBuffer = await file.arrayBuffer();
    const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    setPdfDoc(doc);
    dispatch({ type: "SET_TOTAL", total: doc.numPages });
    dispatch({ type: "SET_PAGE", page: 1 });

    // Extract TOC
    try {
      const outline = await doc.getOutline();
      if (outline) {
        const toc: ReaderState["toc"] = [];
        const processOutline = (items: any[], level = 0) => {
          items.forEach(item => {
            toc.push({ title: item.title, page: 0, level });
            if (item.items?.length) processOutline(item.items, level + 1);
          });
        };
        processOutline(outline);
        dispatch({ type: "SET_TOC", toc });
      }
    } catch {}
  }, [pdfjsLoaded]);

  // ── Render page ────────────────────────────────────────────────────────────
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;
    if (renderTask.current) { renderTask.current.cancel(); renderTask.current = null; }

    setRendering(true);
    try {
      const page = await pdfDoc.getPage(state.page);
      const viewport = page.getViewport({ scale: state.zoom * (window.devicePixelRatio || 1) });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.height = viewport.height;
      canvas.width  = viewport.width;
      canvas.style.width  = `${viewport.width  / (window.devicePixelRatio || 1)}px`;
      canvas.style.height = `${viewport.height / (window.devicePixelRatio || 1)}px`;

      renderTask.current = page.render({ canvasContext: ctx, viewport });
      await renderTask.current.promise;
    } catch (e: any) {
      if (e?.name !== "RenderingCancelledException") console.error(e);
    } finally {
      setRendering(false);
      renderTask.current = null;
    }
  }, [pdfDoc, state.page, state.zoom]);

  useEffect(() => { renderPage(); }, [renderPage]);

  // ── File drop / pick ───────────────────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    if (!file?.name.endsWith(".pdf")) return;
    setPdfFile(file);
    loadPDF(file);
  }, [loadPDF]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pdfDoc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      switch (e.key) {
        case "ArrowLeft":  case "a": dispatch({ type: "SET_PAGE", page: state.page - 1 }); break;
        case "ArrowRight": case "d": dispatch({ type: "SET_PAGE", page: state.page + 1 }); break;
        case "Home":  dispatch({ type: "SET_PAGE", page: 1 }); break;
        case "End":   dispatch({ type: "SET_PAGE", page: state.totalPages }); break;
        case "+":     dispatch({ type: "SET_ZOOM", zoom: state.zoom + 0.2 }); break;
        case "-":     dispatch({ type: "SET_ZOOM", zoom: state.zoom - 0.2 }); break;
        case "0":     dispatch({ type: "SET_ZOOM", zoom: 1 }); break;
        case "f": case "F": dispatch({ type: "TOGGLE_FULLSCREEN" }); break;
        case "n": case "N": dispatch({ type: "TOGGLE_NIGHT" }); break;
        case "b": case "B": dispatch({ type: "ADD_BOOKMARK", page: state.page }); break;
        case "Escape":
          if (state.fullscreen) dispatch({ type: "TOGGLE_FULLSCREEN" });
          else if (state.showShortcuts) dispatch({ type: "TOGGLE_SHORTCUTS" });
          else if (state.showBookmarks) dispatch({ type: "TOGGLE_BOOKMARKS" });
          else if (state.showTOC) dispatch({ type: "TOGGLE_TOC" });
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pdfDoc, state]);

  // ── Touch gestures ─────────────────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchState.current = { ...touchState.current, startX: e.touches[0].clientX, startY: e.touches[0].clientY, isPinching: false };
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchState.current = { ...touchState.current, startDist: dist, isPinching: true };
    }
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchState.current.isPinching) return;
    const dx = e.changedTouches[0].clientX - touchState.current.startX;
    const dy = e.changedTouches[0].clientY - touchState.current.startY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) dispatch({ type: "SET_PAGE", page: state.page + 1 });
      else         dispatch({ type: "SET_PAGE", page: state.page - 1 });
    }
  }, [state.page]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2 || !touchState.current.isPinching) return;
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    const delta = (dist - touchState.current.startDist) / 200;
    touchState.current.startDist = dist;
    dispatch({ type: "SET_ZOOM", zoom: state.zoom + delta });
  }, [state.zoom]);

  const isBookmarked = state.bookmarks.some(b => b.page === state.page);
  const progress = state.totalPages ? (state.page / state.totalPages) * 100 : 0;

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div
      className={`flex flex-col w-full transition-colors duration-300 ${
        state.fullscreen ? "fixed inset-0 z-[2000]" : "min-h-[calc(100dvh-80px)]"
      } ${state.nightMode ? "bg-[#1a1208]" : "bg-bg-main"}`}
    >
      {/* ── HEADER ── */}
      <header
        className="shrink-0 flex items-center gap-3 px-4 py-3 border-b"
        style={{
          background: state.nightMode ? "#0d0a04" : "var(--bg-menu)",
          borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
        }}
      >
        <BookOpen size={16} style={{ color: "var(--menu-text)", opacity: 0.6 }} />
        <span className="text-[10px] font-black uppercase tracking-widest truncate flex-1"
          style={{ color: "var(--menu-text)", opacity: 0.7 }}>
          {pdfFile ? pdfFile.name : "Lector de Libros"}
        </span>

        {pdfDoc && (
          <>
            {/* Page input */}
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={state.page}
                min={1}
                max={state.totalPages}
                onChange={e => dispatch({ type: "SET_PAGE", page: parseInt(e.target.value) || 1 })}
                className="w-12 text-center text-[11px] font-black bg-transparent border outline-none py-0.5"
                style={{
                  color: "var(--menu-text)",
                  borderColor: "color-mix(in srgb, var(--menu-text) 20%, transparent)",
                  borderRadius: "var(--radius-btn)",
                }}
              />
              <span className="text-[9px] font-bold" style={{ color: "var(--menu-text)", opacity: 0.4 }}>
                / {state.totalPages}
              </span>
            </div>

            {/* Zoom */}
            <div className="hidden sm:flex items-center gap-1">
              <button onClick={() => dispatch({ type: "SET_ZOOM", zoom: state.zoom - 0.2 })}
                className="p-1.5 transition-all hover:opacity-80" style={{ color: "var(--menu-text)" }}>
                <ZoomOut size={13} />
              </button>
              <span className="text-[9px] font-black w-9 text-center" style={{ color: "var(--menu-text)", opacity: 0.6 }}>
                {Math.round(state.zoom * 100)}%
              </span>
              <button onClick={() => dispatch({ type: "SET_ZOOM", zoom: state.zoom + 0.2 })}
                className="p-1.5 transition-all hover:opacity-80" style={{ color: "var(--menu-text)" }}>
                <ZoomIn size={13} />
              </button>
            </div>

            {/* Tools */}
            {[
              { icon: state.showTOC ? <X size={13}/> : <List size={13}/>, action: () => dispatch({ type: "TOGGLE_TOC" }), active: state.showTOC, title: "Índice" },
              { icon: <BookMarked size={13}/>, action: () => dispatch({ type: "ADD_BOOKMARK", page: state.page }), active: isBookmarked, title: "Marcar" },
              { icon: state.nightMode ? <Sun size={13}/> : <Moon size={13}/>, action: () => dispatch({ type: "TOGGLE_NIGHT" }), active: state.nightMode, title: "Noche" },
              { icon: state.fullscreen ? <Minimize2 size={13}/> : <Maximize2 size={13}/>, action: () => dispatch({ type: "TOGGLE_FULLSCREEN" }), active: state.fullscreen, title: "Pantalla completa" },
              { icon: <Keyboard size={13}/>, action: () => dispatch({ type: "TOGGLE_SHORTCUTS" }), active: false, title: "Atajos" },
            ].map((btn, i) => (
              <button key={i} onClick={btn.action} title={btn.title}
                className="p-1.5 transition-all hover:opacity-100"
                style={{
                  color: btn.active ? "var(--accent)" : "var(--menu-text)",
                  opacity: btn.active ? 1 : 0.5,
                  borderRadius: "var(--radius-btn)",
                  background: btn.active ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "transparent",
                }}>
                {btn.icon}
              </button>
            ))}

            {/* Open new file */}
            <button onClick={() => fileRef.current?.click()}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all"
              style={{
                background: "color-mix(in srgb, var(--menu-text) 10%, transparent)",
                color: "var(--menu-text)",
                borderRadius: "var(--radius-btn)",
              }}>
              <Upload size={11} /> Abrir
            </button>
          </>
        )}
      </header>

      {/* ── PROGRESS BAR ── */}
      {pdfDoc && (
        <div className="h-[2px] shrink-0" style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
          <motion.div
            className="h-full"
            style={{ background: "var(--accent)" }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </div>
      )}

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* TOC sidebar */}
        <AnimatePresence>
          {state.showTOC && state.toc.length > 0 && (
            <motion.aside
              initial={{ x: -300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -300, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-64 shrink-0 overflow-y-auto border-r"
              style={{
                background: state.nightMode ? "#110d06" : "var(--white-custom)",
                borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
              }}
            >
              <div className="p-4">
                <p className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: "var(--primary)", opacity: 0.5 }}>Índice</p>
                {state.toc.map((item, i) => (
                  <button key={i}
                    className="w-full text-left py-1.5 px-2 text-[11px] font-medium transition-all hover:opacity-100 block truncate"
                    style={{
                      paddingLeft: `${8 + item.level * 12}px`,
                      color: "var(--foreground)",
                      opacity: 0.7,
                      borderRadius: "var(--radius-btn)",
                    }}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main content */}
        <div className="flex-1 overflow-auto relative" ref={containerRef}>
          {!pdfDoc ? (
            /* ── DROP ZONE ── */
            <div
              className="flex flex-col items-center justify-center h-full min-h-96 cursor-pointer group"
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
            >
              <motion.div
                whileHover={{ scale: 1.03 }}
                className="flex flex-col items-center gap-6 p-16 border-2 border-dashed transition-all"
                style={{
                  borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)",
                  borderRadius: "var(--radius-card)",
                  background: "color-mix(in srgb, var(--primary) 3%, transparent)",
                }}
              >
                <div className="relative">
                  <div className="w-24 h-28 flex items-center justify-center"
                    style={{
                      background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                      borderRadius: "var(--radius-card)",
                      border: "2px solid color-mix(in srgb, var(--primary) 15%, transparent)",
                    }}>
                    <BookOpen size={40} style={{ color: "var(--primary)", opacity: 0.4 }} />
                  </div>
                  <motion.div
                    animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="absolute -top-3 -right-3 w-8 h-8 flex items-center justify-center"
                    style={{
                      background: "var(--accent)",
                      borderRadius: "var(--radius-btn)",
                      boxShadow: "0 4px 12px color-mix(in srgb, var(--accent) 40%, transparent)",
                    }}>
                    <Upload size={14} style={{ color: "var(--btn-text)" }} />
                  </motion.div>
                </div>
                <div className="text-center space-y-2">
                  <p className="text-xl font-black uppercase tracking-tighter" style={{ color: "var(--primary)" }}>
                    Abrir un libro
                  </p>
                  <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--primary)", opacity: 0.4 }}>
                    Arrastra un PDF o haz click aquí
                  </p>
                </div>
                <div className="flex gap-6 text-[9px] font-black uppercase tracking-widest" style={{ color: "var(--primary)", opacity: 0.3 }}>
                  <span>← → Páginas</span>
                  <span>+ − Zoom</span>
                  <span>Pellizco táctil</span>
                </div>
              </motion.div>
            </div>
          ) : (
            /* ── PDF CANVAS ── */
            <div
              className="flex flex-col items-center py-6 px-4"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
              onTouchMove={onTouchMove}
            >
              <div className="relative">
                {rendering && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center"
                    style={{ background: "color-mix(in srgb, var(--bg-main) 80%, transparent)" }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                      <RotateCcw size={20} style={{ color: "var(--primary)", opacity: 0.4 }} />
                    </motion.div>
                  </div>
                )}
                <canvas
                  ref={canvasRef}
                  className="block shadow-2xl"
                  style={{
                    borderRadius: "var(--radius-btn)",
                    filter: state.nightMode ? "invert(1) hue-rotate(180deg)" : "none",
                    transition: "filter 0.3s ease",
                    maxWidth: "100%",
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Bookmarks panel */}
        <AnimatePresence>
          {state.showBookmarks && (
            <motion.aside
              initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 300, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-56 shrink-0 overflow-y-auto border-l"
              style={{
                background: state.nightMode ? "#110d06" : "var(--white-custom)",
                borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
              }}
            >
              <div className="p-4">
                <p className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: "var(--primary)", opacity: 0.5 }}>Marcadores</p>
                {state.bookmarks.length === 0 ? (
                  <p className="text-[10px] italic" style={{ color: "var(--primary)", opacity: 0.3 }}>Sin marcadores aún. Presiona B para marcar.</p>
                ) : (
                  state.bookmarks.sort((a, b) => a.page - b.page).map(bm => (
                    <div key={bm.page} className="flex items-center gap-2 mb-1.5">
                      <button
                        onClick={() => dispatch({ type: "SET_PAGE", page: bm.page })}
                        className="flex-1 text-left py-2 px-3 text-[10px] font-black transition-all"
                        style={{
                          color: "var(--primary)",
                          background: "color-mix(in srgb, var(--primary) 5%, transparent)",
                          borderRadius: "var(--radius-btn)",
                        }}
                      >
                        Pág. {bm.page}
                      </button>
                      <button onClick={() => dispatch({ type: "REMOVE_BOOKMARK", page: bm.page })}
                        className="p-1 transition-all hover:opacity-100"
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
      {pdfDoc && (
        <nav className="shrink-0 flex items-center justify-between px-4 py-3 border-t gap-3"
          style={{
            background: state.nightMode ? "#0d0a04" : "var(--bg-menu)",
            borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
          }}>

          <button
            onClick={() => dispatch({ type: "SET_PAGE", page: state.page - 1 })}
            disabled={state.page <= 1}
            className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-25"
            style={{
              color: "var(--menu-text)",
              background: "color-mix(in srgb, var(--menu-text) 8%, transparent)",
              borderRadius: "var(--radius-btn)",
            }}>
            <ChevronLeft size={14} /> Anterior
          </button>

          {/* Bookmarks button (mobile) */}
          <button
            onClick={() => dispatch({ type: "TOGGLE_BOOKMARKS" })}
            className="p-2 transition-all"
            style={{
              color: state.showBookmarks ? "var(--accent)" : "var(--menu-text)",
              opacity: state.showBookmarks ? 1 : 0.5,
              borderRadius: "var(--radius-btn)",
              background: state.showBookmarks ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "transparent",
            }}>
            <BookMarked size={14} />
          </button>

          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "var(--menu-text)", opacity: 0.5 }}>
            {state.page} / {state.totalPages}
          </span>

          {/* Zoom mobile */}
          <button onClick={() => dispatch({ type: "SET_ZOOM", zoom: state.zoom === 1 ? 1.5 : 1 })}
            className="sm:hidden p-2 transition-all"
            style={{ color: "var(--menu-text)", opacity: 0.5, borderRadius: "var(--radius-btn)" }}>
            <ZoomIn size={14} />
          </button>

          <button
            onClick={() => dispatch({ type: "SET_PAGE", page: state.page + 1 })}
            disabled={state.page >= state.totalPages}
            className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-25"
            style={{
              color: "var(--menu-text)",
              background: "color-mix(in srgb, var(--menu-text) 8%, transparent)",
              borderRadius: "var(--radius-btn)",
            }}>
            Siguiente <ChevronRight size={14} />
          </button>
        </nav>
      )}

      {/* ── SHORTCUTS MODAL ── */}
      <AnimatePresence>
        {state.showShortcuts && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3000] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
            onClick={() => dispatch({ type: "TOGGLE_SHORTCUTS" })}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm p-6"
              style={{
                background: "var(--white-custom)",
                borderRadius: "var(--radius-card)",
                border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
              }}
            >
              <div className="flex items-center justify-between mb-5">
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--primary)", opacity: 0.5 }}>Atajos de teclado</p>
                <button onClick={() => dispatch({ type: "TOGGLE_SHORTCUTS" })}
                  style={{ color: "var(--primary)", opacity: 0.4, borderRadius: "var(--radius-btn)" }} className="p-1">
                  <X size={14} />
                </button>
              </div>
              <div className="space-y-2">
                {SHORTCUTS.map(s => (
                  <div key={s.key} className="flex items-center justify-between gap-4">
                    <code className="text-[10px] font-black px-2 py-0.5"
                      style={{
                        background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                        color: "var(--primary)",
                        borderRadius: "var(--radius-btn)",
                        border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
                      }}>
                      {s.key}
                    </code>
                    <span className="text-[11px] font-medium flex-1 text-right" style={{ color: "var(--foreground)", opacity: 0.7 }}>{s.desc}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 pt-4 border-t" style={{ borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
                <p className="text-[9px] font-black uppercase tracking-widest text-center" style={{ color: "var(--primary)", opacity: 0.3 }}>
                  Gestos táctiles: deslizar ← → para páginas · pellizcar para zoom
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
    </div>
  );
}