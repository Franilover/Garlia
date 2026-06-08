"use client";
import { MotionDiv } from '@/components/ui/Motion';

import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from "react";
import {
  ChevronRight, Loader2, Plus, Save,
  Trash2, X, Check, Eye,
  Minimize2, Clock, Hash,
  Calendar, BookMarked, Pencil, Lock, Timer, SlidersHorizontal,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/api/client/supabase";
import {
  useLastOpenedId, useDraftRestore, DraftRestoreBanner,
} from "@/hooks/useEditorShared";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { isReallyOnline } from "@/hooks/data/useOfflineSync";
import EstudioLayout from "@/components/layout/EstudioLayout";
import { BannerOffline, ModalBase, SaveIndicator, CampoInput, BotonSubmit } from "@/components/templates/EstudioTemplates";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { makeSnippetOverlay } from "./snippets/SnippetOverlay";
import { SnippetCommandPalette } from "./snippets/SnippetCommandPalette";
import { MarkdownEditor, renderMarkdown, renderMathInElement, PROSE_STYLES } from "@/components/forms/Markdown/MarkdownEditor";
import type { CommandItem as MdCommandItem, SnippetAction } from "@/components/forms/Markdown/MarkdownEditor";

import {
  Libro, Capitulo, SaveStatus, TABLA_CAPS, VISIBILIDAD_CONFIG,
  wordCount, toDateInput,
  capUpdateContenido, capUpdateMeta, capCreate, capDelete,
  libroUpdateMeta, libroDelete,
} from "./types";
import { useCapitulos, useCapituloEditor } from "./hooks";
import {
  EstadisticasEscritura, CapituloItem, LibroItem, LibroCard, LibroColumna,
  VisibilidadCapPicker, SelectorVisibilidad, SelectorNarrador, SelectorReino,
  SelectorPersonajesCapitulo, NarradorPill, SelectorImagenPortada, DialogSnippets,
  PanelPersonajesCapitulo,
} from "./components";

// ─── Dialog commands ──────────────────────────────────────────────────────────

const DIALOG_COMMANDS: MdCommandItem[] = [
  { id: "dial-guion",    label: "Guión de diálogo",          description: "— (inicia línea de diálogo)",           keywords: ["dial", "guion", "—", "add"],   icon: "—",   snippet: "— " },
  { id: "dial-acotac",  label: "Acotación entre guiones",   description: "— … — (acotación narrativa)",           keywords: ["acot", "dial", "—", "add"],   icon: "—…—", snippet: "— … —" },
  { id: "dial-comillas", label: "Comillas angulares «»",     description: "«texto» (estilo literario)",            keywords: ["comi", "angul", "«»", "add"],  icon: "«»",  snippet: "«»", cursorOffset: 1 },
  { id: "dial-linea",   label: "Línea de diálogo completa", description: "— (línea entera lista para escribir)",  keywords: ["linea", "línea", "dial", "add"], icon: "—…",  snippet: "— " },
  { id: "dial-puntos",  label: "Puntos suspensivos",        description: "… (suspensivos tipográficos)",          keywords: ["punt", "susp", "…", "add"],    icon: "…",   snippet: "…" },
  { id: "dial-endash",  label: "Guión corto (en-dash)",     description: "– (en-dash tipográfico)",               keywords: ["endash", "corto", "–", "add"], icon: "–",   snippet: "–" },
];

// ─── MarkdownPreviewPane ──────────────────────────────────────────────────────

const MarkdownPreviewPane = ({ contenido }: { contenido: string }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const html = React.useMemo(() => renderMarkdown(contenido), [contenido]);
  React.useEffect(() => { renderMathInElement(ref.current); }, [html]);
  return (
    <div
      ref={ref}
      className="prose-mundo lector-texto"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

// ─── PanelEditor ──────────────────────────────────────────────────────────────

const PanelEditor = ({
  capId, libroId, onCapitulosChange, focusMode, onToggleFocus, onVolver,
}: {
  capId: string;
  libroId: string;
  onCapitulosChange: () => void;
  focusMode: boolean;
  onToggleFocus: () => void;
  onVolver: () => void;
}) => {
  const { cap, setCap, loading, isOffline, reload } = useCapituloEditor(capId);
  const [contenido,        setContenido]        = useState("");
  const [saveStatus,       setSaveStatus]       = useState<SaveStatus>("idle");
  const [editingTitle,     setEditingTitle]     = useState(false);
  const [titulo,           setTitulo]           = useState("");
  const [editingFecha,     setEditingFecha]     = useState(false);
  const [fecha,            setFecha]            = useState("");
  const [capVisibilidad,   setCapVisibilidad]   = useState<"publico" | "programado" | "oculto">("oculto");
  const [savingMeta,       setSavingMeta]       = useState(false);
  const [previewOpen,      setPreviewOpen]      = useState(false);
  const [personajesIds,    setPersonajesIds]    = useState<string[]>([]);
  const [criaturasIds,     setCriaturasIds]     = useState<string[]>([]);
  const [itemsIds,         setItemsIds]         = useState<string[]>([]);
  const [listaSnippetCaps, setListaSnippetCaps] = useState<{id:string;orden:number;titulo_capitulo:string}[]>([]);
  const listaSecciones = useMemo(() => {
    const matches = [...contenido.matchAll(/\[\[section\|([^\|\]]+)(?:\|([^\]]+))?\]\]/g)];
    return matches.map(m => ({ id: m[1].trim(), label: (m[2] ?? m[1]).trim() }));
  }, [contenido]);
  const [palette, setPalette] = useState<{ anchorRect: { top: number; left: number }; initialRaw?: string } | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const timer          = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef      = useRef<HTMLDivElement>(null);
  const caretMirrorRef = useRef<HTMLDivElement>(null);
  const mdInsertRef          = useRef<((text: string) => void) | null>(null);
  const pendingReplaceRef    = useRef<((next: string) => void) | null>(null);
  const pendingSnippetRawRef = useRef<string | null>(null);
  const isMountedRef   = useRef(true);
  const { confirm, ConfirmModal } = useConfirm();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearTimeout(timer.current);
    };
  }, []);

  const draft = useDraftRestore({
    key: `cap-draft-${capId}`,
    serverValue: cap?.contenido || "",
    enabled: !!capId && !loading,
  });

  // Inicialización completa al abrir un capítulo distinto
  useEffect(() => {
    if (!cap) return;
    setContenido(cap.contenido || "");
    setTitulo(cap.titulo_capitulo || "");
    setFecha(toDateInput(cap.fecha_publicacion));
    setCapVisibilidad(cap.visibilidad ?? "oculto");
    setPersonajesIds(cap.personajes_ids ?? []);
    setCriaturasIds((cap as any).criaturas_ids ?? []);
    setItemsIds((cap as any).items_ids ?? []);
    if (cap.status === "pending") setSaveStatus("pending");
    else setSaveStatus("idle");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cap?.id]);

  // Cuando el hook actualiza cap con datos remotos (Dexie → Supabase),
  // el id no cambia pero el contenido puede llegar vacío en la primera pasada
  // y luego lleno en la segunda. Actualizamos solo si:
  //   1. El contenido local actual está vacío (carga inicial sin datos locales)
  //   2. O el cap no tiene pending (no hay ediciones sin guardar)
  useEffect(() => {
    if (!cap) return;
    const remoteContenido = cap.contenido || "";
    setContenido(prev => {
      if (prev === "") return remoteContenido;           // todavía vacío → aplicar
      if (cap.status !== "pending") return remoteContenido; // sin cambios locales → aplicar
      return prev;                                       // hay pending → no pisar
    });
    // Metadata siempre se puede actualizar sin riesgo
    setTitulo(cap.titulo_capitulo || "");
    setCapVisibilidad(cap.visibilidad ?? "oculto");
  }, [cap]);

  useEffect(() => {
    if (!libroId) return;
    supabase.from("capitulos").select("id, orden, titulo_capitulo")
      .eq("libro_id", libroId).order("orden").then(({ data }) => {
        setListaSnippetCaps((data ?? []) as {id:string;orden:number;titulo_capitulo:string}[]);
      });
  }, [libroId]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, [contenido]);

  const centerCursor = useCallback(() => {
    const ta        = textareaRef.current;
    const container = scrollRef.current;
    const mirror    = caretMirrorRef.current;
    if (!ta || !container || !mirror) return;

    const cs = getComputedStyle(ta);
    mirror.style.cssText = `
      position: absolute; visibility: hidden; pointer-events: none;
      white-space: pre-wrap; word-wrap: break-word; overflow-wrap: break-word;
      width: ${ta.clientWidth}px; font: ${cs.font}; line-height: ${cs.lineHeight};
      padding: ${cs.padding}; border: ${cs.border}; box-sizing: ${cs.boxSizing};
      top: 0; left: 0;
    `;

    const textBefore = ta.value.slice(0, ta.selectionStart ?? ta.value.length);
    mirror.innerHTML =
      textBefore
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/\n/g, "<br>") +
      '<span id="caret-pos">\u200b</span>';

    const caretSpan = mirror.querySelector("#caret-pos") as HTMLElement | null;
    if (!caretSpan) return;

    const mirrorRect  = mirror.getBoundingClientRect();
    const caretRect   = caretSpan.getBoundingClientRect();
    const caretTop    = caretRect.top - mirrorRect.top;
    const targetScroll = ta.offsetTop + caretTop - container.clientHeight / 2;
    container.scrollTo({ top: Math.max(0, targetScroll), behavior: "smooth" });
  }, []);

  // FIX 1: optimistic update del estado React con objeto completo antes del
  // fetch. capUpdateContenido (types.ts) maneja internamente Dexie + enqueue,
  // por lo que no se construyen objetos Capitulo parciales aquí.
  const doSave = useCallback(async (val: string) => {
    clearTimeout(timer.current);
    if (!isMountedRef.current) return;
    setSaveStatus("saving");
    draft.save(val);

    // Optimistic update con objeto completo del estado (sin ir a Dexie)
    setCap(prev => prev ? { ...prev, contenido: val, status: "pending" } : prev);

    try {
      // capUpdateContenido se encarga de:
      //   - isReallyOnline()
      //   - dexieCapWrite con objeto completo (lee existing de Dexie)
      //   - enqueueOperation si está offline o falla
      //   - marcar "synced" si el servidor confirma
      await capUpdateContenido(capId, val);
      if (!isMountedRef.current) return;
      setCap(prev => prev ? { ...prev, contenido: val, status: "synced" } : prev);
      draft.clear();
      const stillOnline = await isReallyOnline();
      setSaveStatus(stillOnline ? "saved" : "pending");
      if (stillOnline) setTimeout(() => {
        if (isMountedRef.current) setSaveStatus("idle");
      }, 2500);
    } catch {
      if (!isMountedRef.current) return;
      // capUpdateContenido ya dejó el pending en Dexie + encolado para sync
      setSaveStatus("pending");
      setTimeout(() => {
        if (isMountedRef.current) setSaveStatus(s => s === "pending" ? "idle" : s);
      }, 5000);
    }
  }, [capId, setCap, draft]);

  const onChange = useCallback((val: string) => {
    setContenido(val);
    draft.save(val);
    setSaveStatus("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => doSave(val), 2000);
    const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
    if (!isTouchDevice) requestAnimationFrame(() => centerCursor());
  }, [doSave, draft, centerCursor]);

  const handleSnippetAction = useCallback((action: SnippetAction) => {
    switch (action.type) {
      case "choice": {
        const cap = listaSnippetCaps.find(c => c.id === action.target);
        if (cap) {
          window.dispatchEvent(new CustomEvent("snippet:navigate-cap", { detail: { capId: action.target } }));
        } else {
          const el = document.getElementById(`section-${action.target}`);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        break;
      }
      case "section": {
        const el = document.getElementById(`section-${action.id}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("snip-section--highlight");
          setTimeout(() => el.classList.remove("snip-section--highlight"), 1200);
        }
        break;
      }
      default: break;
    }
  }, [listaSnippetCaps]);

  const openPalette = useCallback((initialRaw?: string) => {
    const ta = textareaRef.current;
    if (!ta) { setPalette({ anchorRect: { top: 200, left: 300 }, initialRaw }); return; }
    const rect = ta.getBoundingClientRect();
    const cs   = getComputedStyle(ta);
    const lh   = parseFloat(cs.lineHeight) || 20;
    const lines = ta.value.slice(0, ta.selectionStart ?? 0).split("\n").length;
    const top  = rect.top + Math.min(lines * lh, ta.clientHeight - 20);
    const left = rect.left + 40;
    setPalette({ anchorRect: { top, left }, initialRaw });
  }, []);

  const snippetCommands: MdCommandItem[] = useMemo(() => [
    { id: "snip-drop",    label: "Drop (entidad)",    description: "Inserta personaje, criatura o ítem interactivo", keywords: ["drop","enti","personaj","criatur","item","add"], icon: "⚔️",  action: () => openPalette() },
    { id: "snip-imagen",  label: "Imagen",            description: "Inserta imagen inline o flotante",               keywords: ["img","imagen","foto","imag","add"],             icon: "🖼️",  action: () => openPalette() },
    { id: "snip-choice",  label: "Choice (decisión)", description: "Botón de decisión",                              keywords: ["choi","choice","decis","boton","botón","add"],  icon: "🔀",  action: () => openPalette() },
    { id: "snip-use",     label: "Use Ítem",          description: "Interacción con ítem del inventario",            keywords: ["use","item","ítem","inven","add"],               icon: "🖱️",  action: () => openPalette() },
    { id: "snip-section", label: "Sección",           description: "Marca de sección para choices",                  keywords: ["secc","section","ancora","add"],                icon: "📌",  action: () => openPalette() },
    { id: "snip-sound",   label: "Sonido",            description: "Inserta un efecto de sonido o música",           keywords: ["son","sound","music","audio","add"],            icon: "🎵",  action: () => openPalette() },
    { id: "snip-cita",    label: "Cita",              description: "[[cita|Texto — Fuente]]",                        keywords: ["cita","quote","add"],                           icon: "«»",  snippet: "[[cita|Texto de la cita — Fuente]]" },
    { id: "snip-parrafo", label: "Párrafo",           description: "Salto de párrafo doble",                         keywords: ["parr","párr","salto","add"],                    icon: "¶",   snippet: " " },
  ], [openPalette]);

  const extraCommands: MdCommandItem[] = useMemo(
    () => [...snippetCommands, ...DIALOG_COMMANDS],
    [snippetCommands],
  );

  // ── Snippet overlay — chips visuales sobre el textarea ──
  const snippetOverlay = useMemo(
    () => makeSnippetOverlay({
      taRef: textareaRef,
      onChange,
      onEdit: (raw, replace) => {
        pendingReplaceRef.current    = replace;
        pendingSnippetRawRef.current = raw;
        openPalette(raw);
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [textareaRef, onChange, openPalette],
  );

  const insertOrReplace = useCallback((s: string) => {
    if (pendingReplaceRef.current) {
      pendingReplaceRef.current(s);
      pendingReplaceRef.current    = null;
      pendingSnippetRawRef.current = null;
    } else {
      mdInsertRef.current?.(s);
    }
  }, []);

  const handleSaveTitle = async () => {
    if (!titulo.trim()) return;
    setSavingMeta(true);
    try {
      await capUpdateMeta(capId, { titulo_capitulo: titulo.trim().toUpperCase() });
      setCap(prev => prev ? { ...prev, titulo_capitulo: titulo.trim().toUpperCase() } : prev);
      onCapitulosChange();
    } catch {}
    setEditingTitle(false);
    setSavingMeta(false);
  };

  const handleSaveFecha = async () => {
    if (!fecha) return;
    setSavingMeta(true);
    try {
      await capUpdateMeta(capId, { fecha_publicacion: fecha });
      setCap(prev => prev ? { ...prev, fecha_publicacion: fecha } : prev);
      onCapitulosChange();
    } catch {}
    setEditingFecha(false);
    setSavingMeta(false);
  };

  const handleDelete = async () => {
    const ok = await confirm({
      message: `¿Eliminar permanentemente "${cap?.titulo_capitulo}"?`,
      danger: true, confirmLabel: "Eliminar",
    });
    if (!ok) return;
    try {
      await capDelete(capId);
      onCapitulosChange();
    } catch {}
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center text-primary/30">
      <Loader2 className="animate-spin" size={28}/>
    </div>
  );
  if (!cap) return null;

  return (
    <div className="flex-1 flex flex-col min-h-0">

      {/* ── Vista previa fullscreen ── */}
      <AnimatePresence>
        {previewOpen && (
          <div className="fixed inset-0 z-[200] flex flex-col">
            <MotionDiv
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-bg-main"
            />
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center justify-between px-6 py-3 bg-white-custom/80 backdrop-blur-md border-b border-primary/10 shrink-0">
                <div className="flex items-center gap-3">
                  <Eye size={14} className="text-primary/40" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary/50 italic">
                    Vista previa — {cap?.titulo_capitulo}
                  </span>
                  {cap?.visibilidad !== "publico" && (
                    <span className="flex items-center gap-1 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-[color-mix(in_srgb,var(--callout-warning-border)_30%,transparent)] bg-[color-mix(in_srgb,var(--callout-warning-border)_10%,transparent)] text-[var(--callout-warning-title)] tracking-wide">
                      <Lock size={8} />
                      {VISIBILIDAD_CONFIG[cap?.visibilidad ?? "oculto"]?.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/garliaia/libros/${libroId}/leer/${capId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[9px] font-bold text-primary/25 uppercase tracking-widest hover:text-primary/50 transition-colors flex items-center gap-1"
                  >
                    Abrir página pública ↗
                  </a>
                  <button onClick={() => setPreviewOpen(false)} className="p-1.5 rounded-lg hover:bg-primary/8 text-primary/30 hover:text-primary transition-all">
                    <X size={16}/>
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <style>{PROSE_STYLES}</style>
                <div className="max-w-2xl mx-auto px-8 py-12">
                  <h1 className="text-3xl font-black uppercase italic tracking-tight text-primary mb-8 leading-tight">
                    {cap?.titulo_capitulo}
                  </h1>
                  {contenido
                    ? <MarkdownPreviewPane contenido={contenido} />
                    : <span className="text-primary/25 italic text-sm">Sin contenido aún…</span>
                  }
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <DraftRestoreBanner
        draft={draft}
        onRestore={(v) => { setContenido(v); draft.dismiss(); }}
        label="Hay un borrador local de este capítulo"
      />
      {isOffline && <BannerOffline color="blue" mensaje="Sin conexión — los cambios se guardan localmente" />}

      {saveStatus === "pending" && !isOffline && (
        <div className="shrink-0 flex items-center gap-2 px-4 sm:px-8 py-2 bg-[color-mix(in_srgb,var(--callout-info-border)_8%,transparent)] border-b border-[color-mix(in_srgb,var(--callout-info-border)_15%,transparent)] text-[9px] font-black uppercase tracking-widest text-[var(--callout-info-title)]" style={{ opacity: 0.7 }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--callout-info-border)]"/>
          Cambios pendientes de sincronizar
        </div>
      )}

      {!focusMode && (
        <div className="shrink-0 px-4 sm:px-8 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-primary/8 space-y-3">

          {/* Botón volver */}
          <div className="flex items-center">
            <button
              onClick={onVolver}
              className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-primary/30 hover:text-primary transition-colors group"
            >
              <ChevronRight size={10} className="rotate-180 transition-transform group-hover:-translate-x-0.5" />
              Biblioteca
            </button>
          </div>

          {/* Título editable */}
          <div className="flex items-start gap-2">
            {editingTitle ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  autoFocus
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") handleSaveTitle();
                    if (e.key === "Escape") { setEditingTitle(false); setTitulo(cap.titulo_capitulo); }
                  }}
                  className="flex-1 bg-transparent text-lg sm:text-2xl font-black uppercase italic tracking-tight text-primary outline-none border-b-2 border-primary/30 focus:border-primary pb-1"
                />
                <button onClick={handleSaveTitle} disabled={savingMeta} className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all disabled:opacity-40">
                  {savingMeta ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>}
                </button>
                <button onClick={() => { setEditingTitle(false); setTitulo(cap.titulo_capitulo); }} className="p-2 rounded-lg hover:bg-primary/5 text-primary/30 hover:text-primary transition-all">
                  <X size={14}/>
                </button>
              </div>
            ) : (
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <h1
                  className="flex-1 text-lg sm:text-2xl font-black uppercase italic tracking-tight text-primary leading-tight cursor-pointer hover:text-primary/70 transition-colors"
                  onClick={() => setEditingTitle(true)}
                >
                  {cap.titulo_capitulo}
                </h1>
                <button onClick={() => setEditingTitle(true)} className="shrink-0 p-1.5 rounded-lg hover:bg-primary/8 text-primary/25 hover:text-primary transition-all mt-0.5">
                  <Pencil size={12}/>
                </button>
              </div>
            )}

            {/* Acciones: guardar + eliminar */}
            <div className="flex items-center gap-1 shrink-0">
              <SaveIndicator status={saveStatus}/>
              <button onClick={() => doSave(contenido)} disabled={saveStatus === "saving"}
                className="p-2 rounded-lg hover:bg-primary/8 text-primary/30 hover:text-primary transition-all disabled:opacity-30" title="Guardar (Ctrl+S)">
                <Save size={14}/>
              </button>
              <button onClick={handleDelete} className="p-2 rounded-lg hover:bg-red-500/10 text-primary/20 hover:text-red-400 transition-all" title="Eliminar capítulo">
                <Trash2 size={13}/>
              </button>
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-primary/8 text-primary/30 hover:text-primary transition-all"
                title="Metadatos"
              >
                <SlidersHorizontal size={13}/>
              </button>
            </div>
          </div>

          {/* Meta row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-[9px] font-black uppercase text-primary/30 tracking-widest flex-wrap min-w-0 overflow-x-auto">
              <span className="flex items-center gap-1 shrink-0">
                <Hash size={9}/> {cap.orden}
              </span>

              {cap.narrador_id && (
                <NarradorPill narradorId={cap.narrador_id} />
              )}

              {capVisibilidad === "programado" && (
                editingFecha ? (
                  <span className="flex items-center gap-1.5">
                    <Calendar size={9}/>
                    <input autoFocus type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") handleSaveFecha();
                        if (e.key === "Escape") { setEditingFecha(false); setFecha(toDateInput(cap.fecha_publicacion)); }
                      }}
                      className="bg-primary/5 border border-primary/20 rounded-lg px-2 py-0.5 text-[9px] font-bold text-primary outline-none focus:border-primary/40 transition-colors"
                    />
                    <button onClick={handleSaveFecha} disabled={savingMeta} className="p-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-all disabled:opacity-40">
                      {savingMeta ? <Loader2 size={10} className="animate-spin"/> : <Check size={10}/>}
                    </button>
                    <button onClick={() => { setEditingFecha(false); setFecha(toDateInput(cap.fecha_publicacion)); }} className="p-1 rounded hover:bg-primary/5 text-primary/30 hover:text-primary transition-all">
                      <X size={10}/>
                    </button>
                  </span>
                ) : (
                  <button onClick={() => setEditingFecha(true)} className="flex items-center gap-1 hover:text-primary transition-colors group/fecha" title="Editar fecha">
                    <Calendar size={9}/>
                    <span className="hidden sm:inline">
                      {fecha
                        ? new Date(fecha) > new Date()
                          ? `Prog. · ${new Date(fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`
                          : new Date(fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short" })
                        : "Sin fecha"
                      }
                    </span>
                    <span className="sm:hidden">
                      {fecha ? new Date(fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "Fecha"}
                    </span>
                    <Pencil size={8} className="opacity-0 group-hover/fecha:opacity-60 transition-opacity ml-0.5"/>
                  </button>
                )
              )}

              <VisibilidadCapPicker
                capId={capId}
                current={capVisibilidad}
                onChanged={(v) => {
                  setCapVisibilidad(v);
                  setCap(prev => prev ? { ...prev, visibilidad: v } : prev);
                  if (v !== "programado") {
                    setFecha("");
                    capUpdateMeta(capId, { fecha_publicacion: null as any });
                  }
                }}
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <EstadisticasEscritura texto={contenido} compact={true}/>
            </div>
          </div>
        </div>
      )}

      {focusMode && (
        <div className="shrink-0 flex items-center justify-between px-3 sm:px-8 py-2 sm:py-3 border-b border-primary/5">
          <span className="text-xs font-black uppercase italic tracking-tight text-primary/40 truncate max-w-[180px] sm:max-w-xs">
            {cap.titulo_capitulo}
          </span>
          <div className="flex items-center gap-2 sm:gap-3">
            <EstadisticasEscritura texto={contenido} compact={true}/>
            <SaveIndicator status={saveStatus}/>
            <button onClick={onToggleFocus} className="p-1.5 rounded-lg hover:bg-primary/8 text-primary/25 hover:text-primary transition-all">
              <Minimize2 size={13}/>
            </button>
          </div>
        </div>
      )}

      {!focusMode && (
        <div className="shrink-0 px-4 sm:px-8 py-1.5 border-b border-primary/5">
          <span className="text-[8px] font-black uppercase tracking-widest text-primary/20">
            Escribe <kbd className="px-1.5 py-0.5 rounded bg-primary/8 text-primary/40 font-mono not-italic">add</kbd> para insertar elementos · Ctrl+S guarda
          </span>
        </div>
      )}

      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div ref={scrollRef} className={`flex-1 overflow-y-auto relative ${focusMode ? "px-5 sm:px-16 py-8 sm:py-12" : "px-4 sm:px-8 py-4 sm:py-6"}`} style={{ WebkitOverflowScrolling: "touch" }}>
          <div ref={caretMirrorRef} aria-hidden="true" />
          <div className={focusMode ? "max-w-3xl mx-auto w-full" : ""}>
            <MarkdownEditor
              value={contenido}
              onChange={onChange}
              textareaRef={textareaRef}
              renderOverlay={snippetOverlay}
              placeholder="Empieza a escribir…"
              defaultMode={focusMode ? "edit" : "split"}
              rows={focusMode ? 30 : 20}
              extraCommands={extraCommands}
              insertRef={mdInsertRef}
              onSnippetAction={handleSnippetAction}
            />
          </div>
        </div>

        {!focusMode && (
          <PanelPersonajesCapitulo
            capId={capId}
            value={personajesIds}
            onChange={setPersonajesIds}
            criaturas_ids={criaturasIds}
            onCriaturasChange={setCriaturasIds}
            items_ids={itemsIds}
            onItemsChange={setItemsIds}
            mobileOpen={mobileSidebarOpen}
            onMobileClose={() => setMobileSidebarOpen(false)}
          />
        )}
      </div>

      {!focusMode && (
        <div className="shrink-0 px-3 sm:px-8 py-2 sm:py-2.5 border-t border-primary/5 flex items-center justify-between">
          <EstadisticasEscritura texto={contenido}/>
        </div>
      )}

      <ConfirmModal />

      {palette && (
        <SnippetCommandPalette
          anchorRect={palette.anchorRect}
          initialRaw={palette.initialRaw}
          listaCapitulos={listaSnippetCaps}
          listaSecciones={listaSecciones}
          onInsert={(raw) => {
            insertOrReplace(raw);
            setPalette(null);
            pendingReplaceRef.current    = null;
            pendingSnippetRawRef.current = null;
          }}
          onClose={() => {
            setPalette(null);
            pendingReplaceRef.current    = null;
            pendingSnippetRawRef.current = null;
          }}
        />
      )}
      
    </div>
  );
};

// ─── Modales ──────────────────────────────────────────────────────────────────

const ModalNuevoLibro = ({
  onCreated, onClose,
}: {
  onCreated: (titulo: string) => Promise<void>;
  onClose: () => void;
}) => {
  const [titulo,   setTitulo]   = useState("");
  const [saving,   setSaving]   = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    setSaving(true);
    setErrorMsg("");
    try {
      await onCreated(titulo);
      onClose();
    } catch {
      setErrorMsg("No se pudo crear el libro. Inténtalo de nuevo.");
    }
    setSaving(false);
  };

  return (
    <ModalBase onClose={onClose}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 italic flex items-center gap-2">
          <BookMarked size={12}/> Nuevo Libro
        </h3>
        <button onClick={onClose} className="text-primary/30 hover:text-primary transition-colors"><X size={16}/></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <CampoInput label="Título" value={titulo} onChange={setTitulo} placeholder="TÍTULO DEL LIBRO…" autoFocus />
        {errorMsg && <p className="text-[10px] text-red-400 font-black uppercase tracking-widest">{errorMsg}</p>}
        <div className="pt-1">
          <BotonSubmit
            loading={saving}
            disabled={!titulo.trim()}
            labelLoading={<><Loader2 size={13} className="animate-spin"/>Creando…</>}
            labelNormal={<><Plus size={13}/>Crear Libro</>}
          />
        </div>
      </form>
    </ModalBase>
  );
};

const ModalEditarLibro = ({
  libro, onSaved, onClose,
}: {
  libro: Libro;
  onSaved: (l: Libro) => void;
  onClose: () => void;
}) => {
  const [titulo,      setTitulo]      = useState(libro.titulo);
  const [sinopsis,    setSinopsis]    = useState(libro.sinopsis ?? "");
  const [portada,     setPortada]     = useState(libro.portada_url ?? "");
  const [estado,      setEstado]      = useState(libro.estado ?? "BORRADOR");
  const [visibilidad, setVisibilidad] = useState<"publico" | "programado" | "oculto">(libro.visibilidad ?? "oculto");
  const [fechaLibro,  setFechaLibro]  = useState(libro.fecha_publicacion ?? "");
  const [reinoId,     setReinoId]     = useState<string | null>(libro.reino_id ?? null);
  const [categoria,   setCategoria]   = useState(libro.categoria ?? "");
  const [saving,      setSaving]      = useState(false);

  const ESTADOS    = ["BORRADOR", "EN PROCESO", "FINALIZADO", "PAUSADO"];
  const CATEGORIAS = ["Libro", "Extra"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    setSaving(true);
    try {
      const fields: Partial<Libro> = {
        titulo: titulo.trim().toUpperCase(),
        sinopsis: sinopsis.trim(),
        portada_url: portada.trim(),
        estado,
        visibilidad,
        reino_id: reinoId,
        categoria: categoria.trim() || null,
        fecha_publicacion: visibilidad === "programado" ? (fechaLibro || null) : null,
      };
      await libroUpdateMeta(libro.id, fields);
      onSaved({ ...libro, ...fields });
      onClose();
    } catch {}
    setSaving(false);
  };

  return (
    <ModalBase onClose={onClose}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 italic flex items-center gap-2">
          <BookMarked size={12}/> Editar Libro
        </h3>
        <button onClick={onClose} className="text-primary/30 hover:text-primary transition-colors"><X size={16}/></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <CampoInput label="Título" value={titulo} onChange={setTitulo} placeholder="TÍTULO DEL LIBRO…" autoFocus />
        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase tracking-widest text-primary/40">Sinopsis</label>
          <textarea
            value={sinopsis}
            onChange={e => setSinopsis(e.target.value)}
            rows={4}
            placeholder="Descripción del libro…"
            className="w-full bg-bg-main border border-primary/15 rounded-[var(--radius-btn)] px-3 py-2.5 text-[12px] text-primary outline-none focus:border-primary/30 resize-none transition-colors"
          />
        </div>
        <SelectorImagenPortada value={portada} onChange={setPortada} />
        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase tracking-widest text-primary/40">Estado</label>
          <div className="flex gap-1.5 flex-wrap">
            {ESTADOS.map(est => (
              <button key={est} type="button" onClick={() => setEstado(est)}
                className={`px-3 py-1.5 rounded-[var(--radius-btn)] text-[9px] font-black uppercase tracking-wide border transition-all ${
                  estado === est
                    ? "bg-primary text-btn-text border-primary shadow-sm"
                    : "border-primary/15 text-primary/40 hover:border-primary/30 hover:text-primary/70"
                }`}>
                {est}
              </button>
            ))}
          </div>
        </div>
        <SelectorVisibilidad
          value={visibilidad}
          onChange={setVisibilidad}
          fechaPublicacion={fechaLibro}
          onFechaChange={setFechaLibro}
          label="Visibilidad del Libro"
        />
        <SelectorReino
  value={reinoId ? [reinoId] : []}
  onChange={(ids) => setReinoId(ids[0] ?? null)}
/>
        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase tracking-widest text-primary/40">Categoría</label>
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIAS.map(cat => (
              <button key={cat} type="button" onClick={() => setCategoria(categoria === cat ? "" : cat)}
                className={`px-3 py-1.5 rounded-[var(--radius-btn)] text-[9px] font-black uppercase tracking-wide border transition-all ${
                  categoria === cat
                    ? "bg-primary text-btn-text border-primary shadow-sm"
                    : "border-primary/15 text-primary/40 hover:border-primary/30 hover:text-primary/70"
                }`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="pt-2">
          <BotonSubmit
            loading={saving}
            disabled={!titulo.trim()}
            labelLoading={<><Loader2 size={13} className="animate-spin"/>Guardando…</>}
            labelNormal={<><Check size={13}/>Guardar Cambios</>}
          />
        </div>
      </form>
    </ModalBase>
  );
};

const ModalEditarCapitulo = ({
  cap, onSaved, onClose,
}: {
  cap: Capitulo;
  onSaved: (c: Capitulo) => void;
  onClose: () => void;
}) => {
  const [titulo,        setTitulo]        = useState(cap.titulo_capitulo);
  const [orden,         setOrden]         = useState(String(cap.orden));
  const [fecha,         setFecha]         = useState(toDateInput(cap.fecha_publicacion));
  const [visibilidad,   setVisibilidad]   = useState<"publico" | "programado" | "oculto">(cap.visibilidad ?? "oculto");
  const [personajesIds, setPersonajesIds] = useState<string[]>(cap.personajes_ids ?? []);
  const [narradorId,    setNarradorId]    = useState<string | null>(cap.narrador_id ?? null);
  const [reinoId,       setReinoId]       = useState<string | null>(cap.reino_id ?? null);
  const [saving,        setSaving]        = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    setSaving(true);
    try {
      const fields: Partial<Capitulo> = {
        titulo_capitulo: titulo.trim().toUpperCase(),
        orden: parseInt(orden) || cap.orden,
        fecha_publicacion: visibilidad === "programado" ? fecha : null as any,
        visibilidad,
        personajes_ids: personajesIds,
        narrador_id: narradorId,
        reino_id: reinoId,
      };
      await capUpdateMeta(cap.id, fields);
      onSaved({ ...cap, ...fields });
      onClose();
    } catch {}
    setSaving(false);
  };

  return (
    <ModalBase onClose={onClose}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 italic flex items-center gap-2">
          <Pencil size={12}/> Editar Capítulo
        </h3>
        <button onClick={onClose} className="text-primary/30 hover:text-primary transition-colors"><X size={16}/></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
        <CampoInput label="Título" value={titulo} onChange={setTitulo} placeholder="NOMBRE DEL CAPÍTULO…" autoFocus />
        <CampoInput label="Orden" value={orden} onChange={setOrden} type="number" placeholder="1" />
        <SelectorVisibilidad
          value={visibilidad}
          onChange={(v) => { setVisibilidad(v); if (v !== "programado") setFecha(""); }}
          fechaPublicacion={fecha}
          onFechaChange={setFecha}
          label="Visibilidad del Capítulo"
        />
        <SelectorNarrador value={narradorId} onChange={setNarradorId} />
        <SelectorReino
  value={reinoId ? [reinoId] : []}
  onChange={(ids) => setReinoId(ids[0] ?? null)}
/>
        <SelectorPersonajesCapitulo value={personajesIds} onChange={setPersonajesIds} />
        <BotonSubmit
          loading={saving}
          disabled={!titulo.trim()}
          labelLoading={<><Loader2 size={13} className="animate-spin"/>Guardando…</>}
          labelNormal={<><Check size={13}/>Guardar Cambios</>}
        />
      </form>
    </ModalBase>
  );
};

const ModalNuevoCapitulo = ({
  libroId, ordenSiguiente, onCreated, onClose,
}: {
  libroId: string;
  ordenSiguiente: number;
  onCreated: (cap: Capitulo) => void;
  onClose: () => void;
}) => {
  const [titulo,        setTitulo]        = useState("");
  const [fecha,         setFecha]         = useState("");
  const [visibilidad,   setVisibilidad]   = useState<"publico" | "programado" | "oculto">("oculto");
  const [personajesIds, setPersonajesIds] = useState<string[]>([]);
  const [narradorId,    setNarradorId]    = useState<string | null>(null);
  const [reinoId,       setReinoId]       = useState<string | null>(null);
  const [saving,        setSaving]        = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    setSaving(true);
    try {
      const nuevo = await capCreate(libroId, titulo, ordenSiguiente, visibilidad, fecha || undefined, narradorId);
      const extraFields: Partial<Capitulo> = {};
      if (personajesIds.length > 0) extraFields.personajes_ids = personajesIds;
      if (reinoId) extraFields.reino_id = reinoId;
      if (Object.keys(extraFields).length > 0) {
        await capUpdateMeta(nuevo.id, extraFields);
        Object.assign(nuevo, extraFields);
      }
      onCreated(nuevo);
      onClose();
    } catch {}
    setSaving(false);
  };

  return (
    <ModalBase onClose={onClose}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 italic">Nuevo Capítulo</h3>
        <button onClick={onClose} className="text-primary/30 hover:text-primary"><X size={16}/></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
        <CampoInput label="Título" value={titulo} onChange={setTitulo} placeholder="NOMBRE DEL CAPÍTULO…" autoFocus />
        <SelectorVisibilidad
          value={visibilidad}
          onChange={(v) => { setVisibilidad(v); if (v !== "programado") setFecha(""); }}
          fechaPublicacion={fecha}
          onFechaChange={setFecha}
          label="Visibilidad del Capítulo"
        />
        <SelectorNarrador value={narradorId} onChange={setNarradorId} />
        <SelectorReino
  value={reinoId ? [reinoId] : []}
  onChange={(ids) => setReinoId(ids[0] ?? null)}
/>
        <SelectorPersonajesCapitulo value={personajesIds} onChange={setPersonajesIds} />
        <BotonSubmit
          loading={saving}
          disabled={!titulo.trim()}
          labelLoading={<><Loader2 size={13} className="animate-spin"/>Creando…</>}
          labelNormal={<><Plus size={13}/>Crear Capítulo</>}
        />
      </form>
    </ModalBase>
  );
};

// ─── EditorCapitulosPanel ─────────────────────────────────────────────────────

export function EditorCapitulosPanel() {
  const {
    data:      libros,
    setData:   setLibros,
    loading:   loadingLibros,
    addRow:    addLibro,
  } = useSupabaseData<Libro>("libros", {
    isAdmin: true,
    order: { campo: "created_at", asc: false },
  });

  const [lastCapId,   setLastCapId]   = useLastOpenedId("estudio-caps-last-cap");
  const [lastLibroId, setLastLibroId] = useLastOpenedId("estudio-caps-last-libro");

  const [selectedLibroId, _setSelectedLibroId] = useState<string | null>(lastLibroId);
  const [selectedCapId,   _setSelectedCapId]   = useState<string | null>(lastCapId);

  const setSelectedLibroId = (id: string | null) => { _setSelectedLibroId(id); setLastLibroId(id); };
  const setSelectedCapId   = (id: string | null) => { _setSelectedCapId(id);   setLastCapId(id); };

  const [sidebarOpen,    setSidebarOpen]    = useState(true);
  const [focusMode,      setFocusMode]      = useState(false);
  const [showNuevoCap,   setShowNuevoCap]   = useState(false);
  const [showNuevoLibro, setShowNuevoLibro] = useState(false);
  const [editandoCap,    setEditandoCap]    = useState<Capitulo | null>(null);
  const [capRefreshKey,  setCapRefreshKey]  = useState(0);
  const [editandoLibro,  setEditandoLibro]  = useState<Libro | null>(null);

  const { capitulos, setCapitulos, reload: reloadCaps } = useCapitulos(selectedLibroId);

  useEffect(() => {
    const check = () => {
      const action = localStorage.getItem("estudio-caps-action");
      // Intentar abrir un capítulo concreto aunque no haya action string
      // (puede venir de onNavigateToCapitulo en editorGarlia que solo guarda ids)
      const capId   = localStorage.getItem("estudio-caps-last-cap");
      const libroId = localStorage.getItem("estudio-caps-last-libro");
      if (capId && libroId) {
        setSelectedLibroId(libroId);
        setSelectedCapId(capId);
        setFocusMode(false);
        setSidebarOpen(false);
      }
      if (!action) return;
      localStorage.removeItem("estudio-caps-action");
      if (action === "nuevo-libro") setTimeout(() => setShowNuevoLibro(true), 120);
      if (action === "nuevo-cap")   setTimeout(() => setShowNuevoCap(true), 120);
    };
    check();
    window.addEventListener("estudio-caps-action", check);
    return () => window.removeEventListener("estudio-caps-action", check);
  }, []);

  const handleSelectCap = (libroId: string, capId: string) => {
    setSelectedLibroId(libroId);
    setSelectedCapId(capId);
    setFocusMode(false);
    setSidebarOpen(false);
  };

  // FIX 5: capCreate (types.ts) ya persistió el cap en Dexie con status
  // "synced" o "pending". Aquí solo actualizamos el estado React.
  const handleCapCreada = (cap: Capitulo) => {
    setCapitulos(prev => [...prev, cap]);
    setSelectedCapId(cap.id);
    setCapRefreshKey(k => k + 1);
  };

  const handleCapEditada = (cap: Capitulo) => {
    setCapitulos(prev => prev.map(c => c.id === cap.id ? cap : c));
    setCapRefreshKey(k => k + 1);
    setEditandoCap(null);
  };

  const handleLibroEditado = (libro: Libro) => {
    setLibros(prev => prev.map(l => l.id === libro.id ? libro : l));
    setEditandoLibro(null);
  };

  const handleLibroCreado = async (titulo: string) => {
    const { data, error } = await addLibro({
      titulo: titulo.trim().toUpperCase(),
      estado: "BORRADOR",
      visibilidad: "oculto",
    });
    if (error || !data) throw new Error(error ?? "Error al crear libro");
    setSelectedLibroId(data.id);
    setShowNuevoLibro(false);
  };

  // FIX 5: capDelete (types.ts) ya eliminó de Dexie (o marcó deleted: true
  // si offline + encoló para sync). Aquí solo actualizamos el estado React.
  const handleCapEliminada = async (id: string, libroId: string) => {
    try {
      await capDelete(id);
      setCapitulos(prev => prev.filter(c => c.id !== id));
      if (selectedCapId === id) setSelectedCapId(null);
      setCapRefreshKey(k => k + 1);
    } catch {}
  };

  const handleLibroEliminado = async (libroId: string) => {
    try {
      await libroDelete(libroId);
      setLibros(prev => prev.filter(l => l.id !== libroId));
      if (selectedLibroId === libroId) {
        setSelectedLibroId(null);
        setSelectedCapId(null);
      }
      setCapRefreshKey(k => k + 1);
    } catch {}
  };

  const bibliotecaAbierta = !selectedCapId;

  return (
    <>
      <div className="flex flex-col flex-1 min-h-0">

        {/* ── Biblioteca ── */}
        <AnimatePresence initial={false}>
          {bibliotecaAbierta && (
            <motion.div
              key="biblioteca"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="overflow-hidden border-b shrink-0"
              style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
            >
              {/* Mobile: grid 2 columnas */}
              <div className="sm:hidden overflow-y-auto p-2" style={{ height: selectedCapId ? "380px" : "420px" }}>
                <div className="grid grid-cols-2 gap-2">
                  {loadingLibros ? (
                    <div className="col-span-2 flex items-center justify-center py-8 text-primary/25">
                      <Loader2 size={16} className="animate-spin" />
                    </div>
                  ) : libros.length === 0 ? (
                    <div className="col-span-2 flex items-center justify-center py-8 text-primary/20">
                      <p className="text-[8px] font-black uppercase tracking-widest">Sin resultados · escribe «add» para crear</p>
                    </div>
                  ) : libros.map(libro => (
                    <LibroCard
                      key={libro.id + capRefreshKey}
                      libro={libro}
                      selectedCapId={selectedCapId}
                      onSelectCap={handleSelectCap}
                      onEditCap={setEditandoCap}
                      onDeleteCap={handleCapEliminada}
                      onEditLibro={setEditandoLibro}
                      onDeleteLibro={handleLibroEliminado}
                      onNuevoCap={(libroId) => { setSelectedLibroId(libroId); setShowNuevoCap(true); }}
                    />
                  ))}
                </div>
              </div>

              {/* Desktop: scroll horizontal */}
              <div className="hidden sm:flex overflow-x-auto" style={{ maxHeight: selectedCapId ? "360px" : "480px" }}>
                {loadingLibros ? (
                  <div className="flex items-center justify-center px-12 py-8 text-primary/25">
                    <Loader2 size={18} className="animate-spin" />
                  </div>
                ) : libros.length === 0 ? (
                  <div className="flex items-center justify-center px-12 py-8 text-primary/20">
                    <p className="text-[9px] font-black uppercase tracking-widest">Sin resultados</p>
                  </div>
                ) : libros.map(libro => (
                  <LibroColumna
                    key={libro.id + capRefreshKey}
                    libro={libro}
                    selectedCapId={selectedCapId}
                    onSelectCap={handleSelectCap}
                    onEditCap={setEditandoCap}
                    onDeleteCap={handleCapEliminada}
                    onEditLibro={setEditandoLibro}
                    onDeleteLibro={handleLibroEliminado}
                    onNuevoCap={(libroId) => { setSelectedLibroId(libroId); setShowNuevoCap(true); }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Editor ── */}
        {selectedCapId && selectedLibroId ? (
          <div className="flex-1 min-h-0 flex flex-col">
            <PanelEditor
              key={selectedCapId}
              capId={selectedCapId}
              libroId={selectedLibroId}
              onCapitulosChange={() => setCapRefreshKey(k => k + 1)}
              focusMode={focusMode}
              onToggleFocus={() => setFocusMode(m => !m)}
              onVolver={() => { setSelectedCapId(null); setSidebarOpen(false); }}
            />
          </div>
        ) : null}
      </div>

      {showNuevoLibro && <ModalNuevoLibro onCreated={handleLibroCreado} onClose={() => setShowNuevoLibro(false)} />}
      {showNuevoCap && selectedLibroId && <ModalNuevoCapitulo libroId={selectedLibroId} ordenSiguiente={capitulos.length + 1} onCreated={handleCapCreada} onClose={() => setShowNuevoCap(false)} />}
      {editandoLibro && <ModalEditarLibro libro={editandoLibro} onSaved={handleLibroEditado} onClose={() => setEditandoLibro(null)} />}
      {editandoCap && <ModalEditarCapitulo cap={editandoCap} onSaved={handleCapEditada} onClose={() => setEditandoCap(null)} />}
    </>
  );
}

export default function EstudioCapitulos() {
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-bg-main">
      <EditorCapitulosPanel />
    </div>
  );
}