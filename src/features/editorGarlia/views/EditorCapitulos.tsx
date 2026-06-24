"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ChevronDown,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
  Check,
  Eye,
  Minimize2,
  Hash,
  Calendar,
  BookMarked,
  Pencil,
  Lock,
  SlidersHorizontal,
  Globe,
  Timer,
  PanelRight,
  AlignLeft,
} from "lucide-react";
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";

import {
  MarkdownEditor,
  renderMarkdown,
  renderMathInElement,
  PROSE_STYLES,
} from "@/components/forms/Markdown/MarkdownEditor";
import type {
  CommandItem as MdCommandItem,
  SnippetAction,
} from "@/components/forms/Markdown/MarkdownEditor";
import {
  BannerOffline,
  ModalBase,
  SaveIndicator,
  CampoInput,
  BotonSubmit,
} from "@/components/layout/EstudioTemplates";
import { ComboSelector, type ComboItem } from "@/components/ui/ComboSelector";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { MotionDiv } from "@/components/ui/Motion";
import {
  EstadisticasEscritura,
  LibroCard,
  LibroColumna,
  VisibilidadCapPicker,
  SelectorVisibilidad,
  SelectorNarrador,
  SelectorReino,
  SelectorPersonajesCapitulo,
  NarradorPill,
  SelectorImagenPortada,
  PanelPersonajesCapitulo,
} from "@/features/editorGarlia/components/editorCapitulos/components";
import {
  useCapitulos,
  useCapituloEditor,
  useReinos,
} from "@/features/editorGarlia/components/editorCapitulos/hooks/hooks";
import { SnippetCommandPalette } from "@/features/editorGarlia/components/editorCapitulos/snippets/SnippetCommandPalette";
import { makeSnippetOverlay } from "@/features/editorGarlia/components/editorCapitulos/snippets/SnippetOverlay";
import {
  Libro,
  Capitulo,
  SaveStatus,
  VISIBILIDAD_CONFIG,
  toDateInput,
  capUpdateContenido,
  capUpdateMeta,
  capCreate,
  capDelete,
  libroUpdateMeta,
  libroDelete,
} from "@/features/editorGarlia/components/editorCapitulos/types";
import { isReallyOnline } from "@/hooks/data/useOfflineSync";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import {
  useLastOpenedId,
  useDraftRestore,
  DraftRestoreBanner,
} from "@/hooks/useEditorShared";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";

// ─── Dialog commands ──────────────────────────────────────────────────────────

const DIALOG_COMMANDS: MdCommandItem[] = [
  {
    id: "dial-guion",
    label: "Guión de diálogo",
    description: "— (inicia línea de diálogo)",
    keywords: ["dial", "guion", "—", "add"],
    icon: "—",
    snippet: "— ",
  },
  {
    id: "dial-acotac",
    label: "Acotación entre guiones",
    description: "— … — (acotación narrativa)",
    keywords: ["acot", "dial", "—", "add"],
    icon: "—…—",
    snippet: "— … —",
  },
  {
    id: "dial-comillas",
    label: "Comillas angulares «»",
    description: "«texto» (estilo literario)",
    keywords: ["comi", "angul", "«»", "add"],
    icon: "«»",
    snippet: "«»",
    cursorOffset: 1,
  },
  {
    id: "dial-linea",
    label: "Línea de diálogo completa",
    description: "— (línea entera lista para escribir)",
    keywords: ["linea", "línea", "dial", "add"],
    icon: "—…",
    snippet: "— ",
  },
  {
    id: "dial-puntos",
    label: "Puntos suspensivos",
    description: "… (suspensivos tipográficos)",
    keywords: ["punt", "susp", "…", "add"],
    icon: "…",
    snippet: "…",
  },
  {
    id: "dial-endash",
    label: "Guión corto (en-dash)",
    description: "– (en-dash tipográfico)",
    keywords: ["endash", "corto", "–", "add"],
    icon: "–",
    snippet: "–",
  },
];

// ─── MarkdownPreviewPane ──────────────────────────────────────────────────────

const MarkdownPreviewPane = ({ contenido }: { contenido: string }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const html = React.useMemo(() => renderMarkdown(contenido), [contenido]);
  React.useEffect(() => {
    renderMathInElement(ref.current);
  }, [html]);
  return (
    <div
      dangerouslySetInnerHTML={{ __html: html }}
      ref={ref}
      className="prose-mundo lector-texto"
    />
  );
};

// ─── PanelEditor ──────────────────────────────────────────────────────────────

const PanelEditor = ({
  capId,
  libroId,
  onCapitulosChange,
  focusMode,
  onToggleFocus,
  onVolver,
}: {
  capId: string;
  libroId: string;
  onCapitulosChange: () => void;
  focusMode: boolean;
  onToggleFocus: () => void;
  onVolver: () => void;
}) => {
  const { cap, setCap, loading, isOffline, reload } = useCapituloEditor(capId);

  // ─── Derived state para contenido ────────────────────────────────────────────
  // Usar useEffect para inicializar contenido provoca un flash inevitable:
  // React pinta el editor vacío, ejecuta el effect, y pinta de nuevo con texto.
  // Con derived state dentro del render, React descarta el render intermedio
  // y pinta directamente con el valor correcto — cero frame vacío.
  //
  // Guardamos el capId que usamos para inicializar los campos de metadata;
  // cuando cambia de capítulo reseteamos todo sincrónicamente.
  const [initializedCapId, setInitializedCapId] = useState<string | null>(null);
  const [contenido, setContenido] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [editingFecha, setEditingFecha] = useState(false);
  const [fecha, setFecha] = useState("");
  const [capVisibilidad, setCapVisibilidad] = useState<
    "publico" | "programado" | "oculto"
  >("oculto");
  const [savingMeta, setSavingMeta] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [personajesIds, setPersonajesIds] = useState<string[]>([]);
  const [criaturasIds, setCriaturasIds] = useState<string[]>([]);
  const [itemsIds, setItemsIds] = useState<string[]>([]);
  const [listaSnippetCaps, setListaSnippetCaps] = useState<
    { id: string; orden: number; titulo_capitulo: string }[]
  >([]);
  const listaSecciones = useMemo(() => {
    const matches = [
      ...contenido.matchAll(/\[\[section\|([^\|\]]+)(?:\|([^\]]+))?\]\]/g),
    ];
    return matches.map((m) => ({
      id: m[1].trim(),
      label: (m[2] ?? m[1]).trim(),
    }));
  }, [contenido]);
  const [palette, setPalette] = useState<{
    anchorRect: { top: number; left: number };
    initialRaw?: string;
  } | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const timer = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const caretMirrorRef = useRef<HTMLDivElement>(null);
  const mdInsertRef = useRef<((text: string) => void) | null>(null);
  const pendingReplaceRef = useRef<((next: string) => void) | null>(null);
  const pendingSnippetRawRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
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

  // Inicialización sincrónica al montar o cambiar de capítulo.
  // Al llamar setState durante el render (con guard), React re-renderiza
  // inmediatamente antes de pintar — sin frame intermedio vacío.
  if (cap && cap.id !== initializedCapId) {
    setInitializedCapId(cap.id);
    setContenido(cap.contenido || "");
    setTitulo(cap.titulo_capitulo || "");
    setFecha(toDateInput(cap.fecha_publicacion));
    setCapVisibilidad(cap.visibilidad ?? "oculto");
    setPersonajesIds(cap.personajes_ids ?? []);
    setCriaturasIds((cap as any).criaturas_ids ?? []);
    setItemsIds((cap as any).items_ids ?? []);
    setSaveStatus((cap as any).status === "pending" ? "pending" : "idle");
  }

  // Cuando el hook refresca cap con datos remotos (mismo id, Supabase llega
  // después de Dexie), actualizar contenido solo si no hay un pending local.
  // Se sigue usando useEffect aquí porque NO es inicialización: el editor ya
  // está visible con datos correctos y solo estamos aplicando un refresh.
  useEffect(() => {
    if (!cap || cap.id !== initializedCapId) return;
    if ((cap as any).status === "pending") return; // no pisar borrador local
    setContenido(cap.contenido || "");
    setTitulo(cap.titulo_capitulo || "");
    setCapVisibilidad(cap.visibilidad ?? "oculto");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cap]);

  useEffect(() => {
    if (!libroId) return;
    supabase
      .from("capitulos")
      .select("id, orden, titulo_capitulo")
      .eq("libro_id", libroId)
      .order("orden")
      .then(({ data }) => {
        setListaSnippetCaps(
          (data ?? []) as {
            id: string;
            orden: number;
            titulo_capitulo: string;
          }[],
        );
      });
  }, [libroId]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, [contenido]);

  const centerCursor = useCallback(() => {
    const ta = textareaRef.current;
    const container = scrollRef.current;
    const mirror = caretMirrorRef.current;
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
        .replace(/\n/g, "<br>") + '<span id="caret-pos">\u200b</span>';

    const caretSpan = mirror.querySelector("#caret-pos") as HTMLElement | null;
    if (!caretSpan) return;

    const mirrorRect = mirror.getBoundingClientRect();
    const caretRect = caretSpan.getBoundingClientRect();
    const caretTop = caretRect.top - mirrorRect.top;
    const targetScroll = ta.offsetTop + caretTop - container.clientHeight / 2;
    container.scrollTo({ top: Math.max(0, targetScroll), behavior: "smooth" });
  }, []);

  // FIX 1: optimistic update del estado React con objeto completo antes del
  // fetch. capUpdateContenido (types.ts) maneja internamente Dexie + enqueue,
  // por lo que no se construyen objetos Capitulo parciales aquí.
  const doSave = useCallback(
    async (val: string) => {
      clearTimeout(timer.current);
      if (!isMountedRef.current) return;
      setSaveStatus("saving");
      draft.save(val);

      // Optimistic update con objeto completo del estado (sin ir a Dexie)
      setCap((prev) =>
        prev ? { ...prev, contenido: val, status: "pending" } : prev,
      );

      try {
        // capUpdateContenido se encarga de:
        //   - isReallyOnline()
        //   - dexieCapWrite con objeto completo (lee existing de Dexie)
        //   - enqueueOperation si está offline o falla
        //   - marcar "synced" si el servidor confirma
        await capUpdateContenido(capId, val);
        if (!isMountedRef.current) return;
        setCap((prev) =>
          prev ? { ...prev, contenido: val, status: "synced" } : prev,
        );
        draft.clear();
        const stillOnline = await isReallyOnline();
        setSaveStatus(stillOnline ? "saved" : "pending");
        if (stillOnline)
          setTimeout(() => {
            if (isMountedRef.current) setSaveStatus("idle");
          }, 2500);
      } catch {
        if (!isMountedRef.current) return;
        // capUpdateContenido ya dejó el pending en Dexie + encolado para sync
        setSaveStatus("pending");
        setTimeout(() => {
          if (isMountedRef.current)
            setSaveStatus((s) => (s === "pending" ? "idle" : s));
        }, 5000);
      }
    },
    [capId, setCap, draft],
  );

  const onChange = useCallback(
    (val: string) => {
      setContenido(val);
      draft.save(val);
      setSaveStatus("saving");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => doSave(val), 2000);
      const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
      if (!isTouchDevice) requestAnimationFrame(() => centerCursor());
    },
    [doSave, draft, centerCursor],
  );

  const handleSnippetAction = useCallback(
    (action: SnippetAction) => {
      switch (action.type) {
        case "choice": {
          const cap = listaSnippetCaps.find((c) => c.id === action.target);
          if (cap) {
            window.dispatchEvent(
              new CustomEvent("snippet:navigate-cap", {
                detail: { capId: action.target },
              }),
            );
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
            setTimeout(
              () => el.classList.remove("snip-section--highlight"),
              1200,
            );
          }
          break;
        }
        default:
          break;
      }
    },
    [listaSnippetCaps],
  );

  const openPalette = useCallback((initialRaw?: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      setPalette({ anchorRect: { top: 200, left: 300 }, initialRaw });
      return;
    }
    const rect = ta.getBoundingClientRect();
    const cs = getComputedStyle(ta);
    const lh = parseFloat(cs.lineHeight) || 20;
    const lines = ta.value.slice(0, ta.selectionStart ?? 0).split("\n").length;
    const top = rect.top + Math.min(lines * lh, ta.clientHeight - 20);
    const left = rect.left + 40;
    setPalette({ anchorRect: { top, left }, initialRaw });
  }, []);

  const snippetCommands: MdCommandItem[] = useMemo(
    () => [
      {
        id: "snip-drop",
        label: "Drop (entidad)",
        description: "Inserta personaje, criatura o ítem interactivo",
        keywords: ["drop", "enti", "personaj", "criatur", "item", "add"],
        icon: "⚔️",
        action: () => openPalette("[[drop||]]"),
      },
      {
        id: "snip-imagen",
        label: "Imagen",
        description: "Inserta imagen inline o flotante",
        keywords: ["img", "imagen", "foto", "imag", "add"],
        icon: "🖼️",
        action: () => openPalette("[[imagen||]]"),
      },
      {
        id: "snip-choice",
        label: "Choice (decisión)",
        description: "Botón de decisión",
        keywords: ["choi", "choice", "decis", "boton", "botón", "add"],
        icon: "🔀",
        action: () => openPalette("[[choice||]]"),
      },
      {
        id: "snip-use",
        label: "Use Ítem",
        description: "Interacción con ítem del inventario",
        keywords: ["use", "item", "ítem", "inven", "add"],
        icon: "🖱️",
        action: () => openPalette("[[use||]]"),
      },
      {
        id: "snip-section",
        label: "Sección",
        description: "Marca de sección para choices",
        keywords: ["secc", "section", "ancora", "add"],
        icon: "📌",
        action: () => openPalette("[[section||]]"),
      },
      {
        id: "snip-sound",
        label: "Sonido",
        description: "Inserta un efecto de sonido o música",
        keywords: ["son", "sound", "music", "audio", "add"],
        icon: "🎵",
        action: () => openPalette("[[sound||]]"),
      },
      {
        id: "snip-cita",
        label: "Cita",
        description: "[[cita|Texto — Fuente]]",
        keywords: ["cita", "quote", "add"],
        icon: "«»",
        snippet: "[[cita|Texto de la cita — Fuente]]",
      },
      {
        id: "snip-parrafo",
        label: "Párrafo",
        description: "Salto de párrafo doble",
        keywords: ["parr", "párr", "salto", "add"],
        icon: "¶",
        snippet: " ",
      },
    ],
    [openPalette],
  );

  const extraCommands: MdCommandItem[] = useMemo(
    () => [...snippetCommands, ...DIALOG_COMMANDS],
    [snippetCommands],
  );

  // ── Snippet overlay — chips visuales sobre el textarea ──
  const snippetOverlay = useMemo(
    () =>
      makeSnippetOverlay({
        taRef: textareaRef,
        onChange,
        onEdit: (raw, replace) => {
          pendingReplaceRef.current = replace;
          pendingSnippetRawRef.current = raw;
          openPalette(raw);
        },
      }),

    [textareaRef, onChange, openPalette],
  );

  const insertOrReplace = useCallback((s: string) => {
    if (pendingReplaceRef.current) {
      pendingReplaceRef.current(s);
      pendingReplaceRef.current = null;
      pendingSnippetRawRef.current = null;
    } else {
      mdInsertRef.current?.(s);
    }
  }, []);

  const handleSaveTitle = async () => {
    if (!titulo.trim()) return;
    setSavingMeta(true);
    try {
      await capUpdateMeta(capId, {
        titulo_capitulo: titulo.trim().toUpperCase(),
      });
      setCap((prev) =>
        prev ? { ...prev, titulo_capitulo: titulo.trim().toUpperCase() } : prev,
      );
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
      setCap((prev) => (prev ? { ...prev, fecha_publicacion: fecha } : prev));
      onCapitulosChange();
    } catch {}
    setEditingFecha(false);
    setSavingMeta(false);
  };

  const handleDelete = async () => {
    const ok = await confirm({
      message: `¿Eliminar permanentemente "${cap?.titulo_capitulo}"?`,
      danger: true,
      confirmLabel: "Eliminar",
    });
    if (!ok) return;
    try {
      await capDelete(capId);
      onCapitulosChange();
    } catch {}
  };

  if (loading)
    return (
      <div className="flex-1 flex items-center justify-center text-primary/30">
        <Loader2 className="animate-spin" size={28} />
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
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-bg-main"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
            />
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center justify-between px-6 py-3 bg-white-custom/80 backdrop-blur-md border-b border-primary/10 shrink-0">
                <div className="flex items-center gap-3">
                  <Eye className="text-primary/40" size={14} />
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
                    className="text-[9px] font-bold text-primary/25 uppercase tracking-widest hover:text-primary/50 transition-colors flex items-center gap-1"
                    href={`/garliaia/libros/${libroId}/leer/${capId}`}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Abrir página pública ↗
                  </a>
                  <button
                    className="p-1.5 rounded-lg hover:bg-primary/8 text-primary/30 hover:text-primary transition-all"
                    onClick={() => setPreviewOpen(false)}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <style>{PROSE_STYLES}</style>
                <div className="max-w-2xl mx-auto px-8 py-12">
                  <h1 className="text-3xl font-black uppercase italic tracking-tight text-primary mb-8 leading-tight">
                    {cap?.titulo_capitulo}
                  </h1>
                  {contenido ? (
                    <MarkdownPreviewPane contenido={contenido} />
                  ) : (
                    <span className="text-primary/25 italic text-sm">
                      Sin contenido aún…
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <DraftRestoreBanner
        draft={draft}
        label="Hay un borrador local de este capítulo"
        onRestore={(v) => {
          setContenido(v);
          draft.dismiss();
        }}
      />
      {isOffline && (
        <BannerOffline
          color="blue"
          mensaje="Sin conexión — los cambios se guardan localmente"
        />
      )}

      {saveStatus === "pending" && !isOffline && (
        <div
          className="shrink-0 flex items-center gap-2 px-4 sm:px-8 py-2 bg-[color-mix(in_srgb,var(--callout-info-border)_8%,transparent)] border-b border-[color-mix(in_srgb,var(--callout-info-border)_15%,transparent)] text-[9px] font-black uppercase tracking-widest text-[var(--callout-info-title)]"
          style={{ opacity: 0.7 }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--callout-info-border)]" />
          Cambios pendientes de sincronizar
        </div>
      )}

      {!focusMode && (
        <div className="shrink-0 px-4 sm:px-8 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-primary/8 space-y-3">
          {/* Botón volver */}
          <div className="flex items-center">
            <button
              className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-primary/30 hover:text-primary transition-colors group"
              onClick={onVolver}
            >
              <ChevronRight
                className="rotate-180 transition-transform group-hover:-translate-x-0.5"
                size={10}
              />
              Biblioteca
            </button>
          </div>

          {/* Título editable */}
          <div className="flex items-start gap-2">
            {editingTitle ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  autoFocus
                  className="flex-1 bg-transparent text-lg sm:text-2xl font-black uppercase italic tracking-tight text-primary outline-none border-b-2 border-primary/30 focus:border-primary pb-1"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitle();
                    if (e.key === "Escape") {
                      setEditingTitle(false);
                      setTitulo(cap.titulo_capitulo);
                    }
                  }}
                />
                <button
                  className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all disabled:opacity-40"
                  disabled={savingMeta}
                  onClick={handleSaveTitle}
                >
                  {savingMeta ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <Check size={14} />
                  )}
                </button>
                <button
                  className="p-2 rounded-lg hover:bg-primary/5 text-primary/30 hover:text-primary transition-all"
                  onClick={() => {
                    setEditingTitle(false);
                    setTitulo(cap.titulo_capitulo);
                  }}
                >
                  <X size={14} />
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
                <button
                  className="shrink-0 p-1.5 rounded-lg hover:bg-primary/8 text-primary/25 hover:text-primary transition-all mt-0.5"
                  onClick={() => setEditingTitle(true)}
                >
                  <Pencil size={12} />
                </button>
              </div>
            )}

            {/* Acciones: guardar + eliminar */}
            <div className="flex items-center gap-1 shrink-0">
              <SaveIndicator status={saveStatus} />
              <button
                className="p-2 rounded-lg hover:bg-primary/8 text-primary/30 hover:text-primary transition-all disabled:opacity-30"
                disabled={saveStatus === "saving"}
                title="Guardar (Ctrl+S)"
                onClick={() => doSave(contenido)}
              >
                <Save size={14} />
              </button>
              <button
                className="p-2 rounded-lg hover:bg-red-500/10 text-primary/20 hover:text-red-400 transition-all"
                title="Eliminar capítulo"
                onClick={handleDelete}
              >
                <Trash2 size={13} />
              </button>
              <button
                className="lg:hidden p-2 rounded-lg hover:bg-primary/8 text-primary/30 hover:text-primary transition-all"
                title="Metadatos"
                onClick={() => setMobileSidebarOpen(true)}
              >
                <SlidersHorizontal size={13} />
              </button>
            </div>
          </div>

          {/* Meta row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-[9px] font-black uppercase text-primary/30 tracking-widest flex-wrap min-w-0 overflow-x-auto">
              <span className="flex items-center gap-1 shrink-0">
                <Hash size={9} /> {cap.orden}
              </span>

              {cap.narrador_id && <NarradorPill narradorId={cap.narrador_id} />}

              {capVisibilidad === "programado" &&
                (editingFecha ? (
                  <span className="flex items-center gap-1.5">
                    <Calendar size={9} />
                    <input
                      autoFocus
                      className="bg-primary/5 border border-primary/20 rounded-lg px-2 py-0.5 text-[9px] font-bold text-primary outline-none focus:border-primary/40 transition-colors"
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveFecha();
                        if (e.key === "Escape") {
                          setEditingFecha(false);
                          setFecha(toDateInput(cap.fecha_publicacion));
                        }
                      }}
                    />
                    <button
                      className="p-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-all disabled:opacity-40"
                      disabled={savingMeta}
                      onClick={handleSaveFecha}
                    >
                      {savingMeta ? (
                        <Loader2 className="animate-spin" size={10} />
                      ) : (
                        <Check size={10} />
                      )}
                    </button>
                    <button
                      className="p-1 rounded hover:bg-primary/5 text-primary/30 hover:text-primary transition-all"
                      onClick={() => {
                        setEditingFecha(false);
                        setFecha(toDateInput(cap.fecha_publicacion));
                      }}
                    >
                      <X size={10} />
                    </button>
                  </span>
                ) : (
                  <button
                    className="flex items-center gap-1 hover:text-primary transition-colors group/fecha"
                    title="Editar fecha"
                    onClick={() => setEditingFecha(true)}
                  >
                    <Calendar size={9} />
                    <span className="hidden sm:inline">
                      {fecha
                        ? new Date(fecha) > new Date()
                          ? `Prog. · ${new Date(fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`
                          : new Date(fecha).toLocaleDateString("es-ES", {
                              day: "numeric",
                              month: "short",
                            })
                        : "Sin fecha"}
                    </span>
                    <span className="sm:hidden">
                      {fecha
                        ? new Date(fecha).toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "short",
                          })
                        : "Fecha"}
                    </span>
                    <Pencil
                      className="opacity-0 group-hover/fecha:opacity-60 transition-opacity ml-0.5"
                      size={8}
                    />
                  </button>
                ))}

              <VisibilidadCapPicker
                capId={capId}
                current={capVisibilidad}
                onChanged={(v) => {
                  setCapVisibilidad(v);
                  setCap((prev) => (prev ? { ...prev, visibilidad: v } : prev));
                  if (v !== "programado") {
                    setFecha("");
                    capUpdateMeta(capId, { fecha_publicacion: null as any });
                  }
                }}
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <EstadisticasEscritura compact={true} texto={contenido} />
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
            <EstadisticasEscritura compact={true} texto={contenido} />
            <SaveIndicator status={saveStatus} />
            <button
              className="p-1.5 rounded-lg hover:bg-primary/8 text-primary/25 hover:text-primary transition-all"
              onClick={onToggleFocus}
            >
              <Minimize2 size={13} />
            </button>
          </div>
        </div>
      )}

      {!focusMode && (
        <div className="shrink-0 px-4 sm:px-8 py-1.5 border-b border-primary/5">
          <span className="text-[8px] font-black uppercase tracking-widest text-primary/20">
            Escribe{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-primary/8 text-primary/40 font-mono not-italic">
              add
            </kbd>{" "}
            para insertar elementos · Ctrl+S guarda
          </span>
        </div>
      )}

      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div
          ref={scrollRef}
          className={`flex-1 overflow-y-auto relative ${focusMode ? "px-5 sm:px-16 py-8 sm:py-12" : "px-4 sm:px-8 py-4 sm:py-6"}`}
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div ref={caretMirrorRef} aria-hidden="true" />
          <div className={focusMode ? "max-w-3xl mx-auto w-full" : ""}>
            <MarkdownEditor
              defaultMode={focusMode ? "edit" : "split"}
              extraCommands={extraCommands}
              insertRef={mdInsertRef}
              placeholder="Empieza a escribir…"
              renderOverlay={snippetOverlay}
              rows={focusMode ? 30 : 20}
              textareaRef={textareaRef as React.RefObject<HTMLTextAreaElement>}
              value={contenido}
              onChange={onChange}
              onSnippetAction={handleSnippetAction}
            />
          </div>
        </div>

        {!focusMode && (
          <PanelPersonajesCapitulo
            capId={capId}
            criaturas_ids={criaturasIds}
            items_ids={itemsIds}
            mobileOpen={mobileSidebarOpen}
            value={personajesIds}
            onChange={setPersonajesIds}
            onCriaturasChange={setCriaturasIds}
            onItemsChange={setItemsIds}
            onMobileClose={() => setMobileSidebarOpen(false)}
          />
        )}
      </div>

      {!focusMode && (
        <div className="shrink-0 px-3 sm:px-8 py-2 sm:py-2.5 border-t border-primary/5 flex items-center justify-between">
          <EstadisticasEscritura texto={contenido} />
        </div>
      )}

      <ConfirmModal />

      {palette && (
        <SnippetCommandPalette
          anchorRect={palette.anchorRect}
          initialRaw={palette.initialRaw}
          listaCapitulos={listaSnippetCaps}
          listaSecciones={listaSecciones}
          onClose={() => {
            setPalette(null);
            pendingReplaceRef.current = null;
            pendingSnippetRawRef.current = null;
          }}
          onInsert={(raw) => {
            insertOrReplace(raw);
            setPalette(null);
            pendingReplaceRef.current = null;
            pendingSnippetRawRef.current = null;
          }}
        />
      )}
    </div>
  );
};

// ─── Modales ──────────────────────────────────────────────────────────────────

const ModalNuevoLibro = ({
  onCreated,
  onClose,
}: {
  onCreated: (titulo: string) => Promise<void>;
  onClose: () => void;
}) => {
  const [titulo, setTitulo] = useState("");
  const [saving, setSaving] = useState(false);
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
          <BookMarked size={12} /> Nuevo Libro
        </h3>
        <button
          className="text-primary/30 hover:text-primary transition-colors"
          onClick={onClose}
        >
          <X size={16} />
        </button>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <CampoInput
          autoFocus
          label="Título"
          placeholder="TÍTULO DEL LIBRO…"
          value={titulo}
          onChange={setTitulo}
        />
        {errorMsg && (
          <p className="text-[10px] text-red-400 font-black uppercase tracking-widest">
            {errorMsg}
          </p>
        )}
        <div className="pt-1">
          <BotonSubmit
            disabled={!titulo.trim()}
            labelLoading={
              <>
                <Loader2 className="animate-spin" size={13} />
                Creando…
              </>
            }
            labelNormal={
              <>
                <Plus size={13} />
                Crear Libro
              </>
            }
            loading={saving}
          />
        </div>
      </form>
    </ModalBase>
  );
};

// ─── Hook: cargar grupos de tipo "libros" para el ComboSelector ───────────────
function useGruposLibros() {
  const [items, setItems] = useState<ComboItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("grupos_mundo")
      .select("id, nombre, subtipo")
      .eq("tipo", "libros")
      .order("nombre")
      .then(({ data }) => {
        if (cancelled) return;
        setItems(
          (data ?? []).map((g) => ({
            id: g.id,
            label: g.nombre,
            sublabel: g.subtipo ?? undefined,
          })),
        );
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { items, loading };
}

const ModalNuevoCapitulo = ({
  libroId,
  ordenSiguiente,
  onCreated,
  onClose,
}: {
  libroId: string;
  ordenSiguiente: number;
  onCreated: (cap: Capitulo) => void;
  onClose: () => void;
}) => {
  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState("");
  const [visibilidad, setVisibilidad] = useState<
    "publico" | "programado" | "oculto"
  >("oculto");
  const [personajesIds, setPersonajesIds] = useState<string[]>([]);
  const [narradorId, setNarradorId] = useState<string | null>(null);
  const [reinoId, setReinoId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    setSaving(true);
    try {
      const nuevo = await capCreate(
        libroId,
        titulo,
        ordenSiguiente,
        visibilidad,
        fecha || undefined,
        narradorId,
      );
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
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 italic">
          Nuevo Capítulo
        </h3>
        <button
          className="text-primary/30 hover:text-primary"
          onClick={onClose}
        >
          <X size={16} />
        </button>
      </div>
      <form
        className="space-y-4 max-h-[72vh] overflow-y-auto pr-1"
        onSubmit={handleSubmit}
      >
        <CampoInput
          autoFocus
          label="Título"
          placeholder="NOMBRE DEL CAPÍTULO…"
          value={titulo}
          onChange={setTitulo}
        />
        <SelectorVisibilidad
          fechaPublicacion={fecha}
          label="Visibilidad del Capítulo"
          value={visibilidad}
          onChange={(v) => {
            setVisibilidad(v);
            if (v !== "programado") setFecha("");
          }}
          onFechaChange={setFecha}
        />
        <SelectorNarrador value={narradorId} onChange={setNarradorId} />
        <SelectorReino
          value={reinoId ? [reinoId] : []}
          onChange={(ids) => setReinoId(ids[0] ?? null)}
        />
        <SelectorPersonajesCapitulo
          value={personajesIds}
          onChange={setPersonajesIds}
        />
        <BotonSubmit
          disabled={!titulo.trim()}
          labelLoading={
            <>
              <Loader2 className="animate-spin" size={13} />
              Creando…
            </>
          }
          labelNormal={
            <>
              <Plus size={13} />
              Crear Capítulo
            </>
          }
          loading={saving}
        />
      </form>
    </ModalBase>
  );
};

// ─── BibliotecaPortadas ───────────────────────────────────────────────────────
// Panel inicial: grid de portadas de libros. Click → abre sidebar de caps.

function BibliotecaPortadas({
  libros,
  loading,
  selectedLibroId,
  onSelectLibro,
  onNuevoLibro,
  onEditLibro,
  onDeleteLibro,
}: {
  libros: Libro[];
  loading: boolean;
  selectedLibroId: string | null;
  onSelectLibro: (id: string) => void;
  onNuevoLibro: () => void;
  onEditLibro: (l: Libro) => void;
  onDeleteLibro: (id: string) => void;
}) {
  const VISIBILIDAD_ICON: Record<string, React.ReactNode> = {
    publico: <Globe size={9} />,
    programado: <Timer size={9} />,
    oculto: <Lock size={9} />,
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div
        className="shrink-0 flex items-center justify-between px-6 py-3 border-b"
        style={{
          borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
        }}
      >
        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/40 italic flex items-center gap-1.5">
          <BookMarked size={11} /> Biblioteca
        </span>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-btn)] bg-primary/8 hover:bg-primary/15 text-primary/50 hover:text-primary text-[9px] font-black uppercase tracking-widest transition-all"
          onClick={onNuevoLibro}
        >
          <Plus size={10} /> Nuevo Libro
        </button>
      </div>

      {/* Grid de portadas */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-primary/20">
            <Loader2 className="animate-spin" size={20} />
          </div>
        ) : libros.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-primary/20">
            <BookMarked size={28} />
            <p className="text-[9px] font-black uppercase tracking-widest">
              Sin libros · crea el primero
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {libros.map((libro) => (
              <div
                key={libro.id}
                className="group relative flex flex-col gap-2 cursor-pointer"
                onClick={() => onSelectLibro(libro.id)}
              >
                {/* Portada */}
                <div
                  className="relative aspect-[2/3] rounded-lg overflow-hidden border transition-all"
                  style={{
                    borderColor:
                      selectedLibroId === libro.id
                        ? "var(--primary)"
                        : "color-mix(in srgb, var(--primary) 10%, transparent)",
                    boxShadow:
                      selectedLibroId === libro.id
                        ? "0 0 0 2px var(--primary)"
                        : "none",
                  }}
                >
                  {libro.portada_url ? (
                    <img
                      alt={libro.titulo}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      src={libro.portada_url}
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{
                        background:
                          "color-mix(in srgb, var(--primary) 6%, transparent)",
                      }}
                    >
                      <BookMarked size={24} className="text-primary/15" />
                    </div>
                  )}

                  {/* Overlay acciones */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end gap-1 p-1.5">
                    <button
                      className="p-1.5 rounded bg-white/10 hover:bg-white/25 text-white transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditLibro(libro);
                      }}
                    >
                      <Pencil size={10} />
                    </button>
                    <button
                      className="p-1.5 rounded bg-white/10 hover:bg-red-500/60 text-white transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteLibro(libro.id);
                      }}
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>

                  {/* Badge visibilidad */}
                  <div
                    className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wide backdrop-blur-sm"
                    style={{
                      background:
                        "color-mix(in srgb, var(--bg-main) 70%, transparent)",
                      color:
                        "color-mix(in srgb, var(--primary) 55%, transparent)",
                    }}
                  >
                    {VISIBILIDAD_ICON[libro.visibilidad ?? "oculto"]}
                  </div>

                  {/* Badge TW */}
                  {(libro as any).trigger_warnings?.length > 0 && (
                    <div
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded flex items-center justify-center text-[10px] backdrop-blur-sm"
                      style={{
                        background:
                          "color-mix(in srgb, var(--bg-main) 70%, transparent)",
                      }}
                      title="Tiene Trigger Warnings"
                    >
                      ⚠️
                    </div>
                  )}
                </div>

                {/* Título */}
                <p
                  className="text-[9px] font-black uppercase tracking-wide leading-tight text-center px-0.5 truncate"
                  style={{
                    color:
                      "color-mix(in srgb, var(--primary) 65%, transparent)",
                  }}
                >
                  {libro.titulo}
                </p>

                {/* Estado */}
                {libro.estado && (
                  <p className="text-[7px] font-black uppercase tracking-widest text-center text-primary/25 -mt-1">
                    {libro.estado}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── BarraLibro ───────────────────────────────────────────────────────────────
// Barra superior + panel de configuración expandible del libro.
// Reemplaza ModalEditarLibro: todo editable inline.

// ─── useCiudades (local) ─────────────────────────────────────────────────────
function useCiudades() {
  const [ciudades, setCiudades] = useState<
    { id: string; nombre: string; reino_id?: string | null }[]
  >([]);
  useEffect(() => {
    (async () => {
      try {
        const table = (db as any)["ciudades"];
        if (table) {
          const local = await table.orderBy("nombre").toArray();
          if (local.length > 0) {
            setCiudades(local);
            return;
          }
        }
      } catch {}
      if (!navigator.onLine) return;
      try {
        const { data } = await supabase
          .from("ciudades")
          .select("id, nombre, reino_id")
          .order("nombre");
        if (data) {
          setCiudades(data as any[]);
          try {
            const t = (db as any)["ciudades"];
            if (t) await t.bulkPut(data);
          } catch {}
        }
      } catch {}
    })();
  }, []);
  return { ciudades };
}

// ─── BarraLibro constants ─────────────────────────────────────────────────────
const ESTADOS_LIBRO = ["BORRADOR", "EN PROCESO", "FINALIZADO", "PAUSADO"];
const TW_PREDEFINIDOS_BARRA = [
  "Suicidio",
  "Trastornos Alimenticios",
  "Violencia",
  "Abuso Sexual",
  "Autolesiones",
  "Abuso de Sustancias",
  "Muerte",
  "Trauma",
];

function BarraLibro({
  libro,
  capitulos,
  sidebarOpen,
  onVolver,
  onLibroChange,
  onToggleSidebar,
  onNuevoCap,
}: {
  libro: Libro | undefined;
  capitulos: Capitulo[];
  sidebarOpen: boolean;
  onVolver: () => void;
  onLibroChange: (l: Libro) => void;
  onToggleSidebar: () => void;
  onNuevoCap: () => void;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [dropVis, setDropVis] = useState(false);
  const [dropEstado, setDropEstado] = useState(false);
  const [dropPortada, setDropPortada] = useState(false);
  const [dropGrupo, setDropGrupo] = useState(false);
  const [dropTW, setDropTW] = useState(false);
  const dropVisRef = useRef<HTMLDivElement>(null);
  const dropEstRef = useRef<HTMLDivElement>(null);
  const dropPortadaRef = useRef<HTMLDivElement>(null);
  const dropGrupoRef = useRef<HTMLDivElement>(null);
  const dropTWRef = useRef<HTMLDivElement>(null);

  const closeAll = (except?: string) => {
    if (except !== "vis") setDropVis(false);
    if (except !== "estado") setDropEstado(false);
    if (except !== "portada") setDropPortada(false);
    if (except !== "grupo") setDropGrupo(false);
    if (except !== "tw") setDropTW(false);
  };

  // ── Estado local sincronizado con el libro ────────────────────────────────
  const [titulo, setTitulo] = useState(libro?.titulo ?? "");
  const [sinopsis, setSinopsis] = useState(libro?.sinopsis ?? "");
  const [portada, setPortada] = useState(libro?.portada_url ?? "");
  const [estado, setEstado] = useState(libro?.estado ?? "BORRADOR");
  const [visibilidad, setVisibilidad] = useState<
    "publico" | "programado" | "oculto"
  >(libro?.visibilidad ?? "oculto");
  const [fechaLibro, setFechaLibro] = useState(libro?.fecha_publicacion ?? "");
  const [grupoId, setGrupoId] = useState<string | null>(
    libro?.categoria ?? null,
  );
  const [tws, setTws] = useState<string[]>(
    (libro as any)?.trigger_warnings ?? [],
  );
  const [twCustom, setTwCustom] = useState("");
  const [twAdding, setTwAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editTitulo, setEditTitulo] = useState(false);
  const titRef = useRef<HTMLInputElement>(null);

  const { items: gruposItems, loading: loadingGrupos } = useGruposLibros();
  const { reinos } = useReinos();
  const { ciudades } = useCiudades();

  // Reinos y ciudades únicos de todos los capítulos del libro
  const reinosIdsUnicos = Array.from(
    new Set(capitulos.flatMap((c) => (c as any).reinos_ids ?? [])),
  ) as string[];
  const ciudadesIdsUnicas = Array.from(
    new Set(capitulos.flatMap((c) => (c as any).ciudades_ids ?? [])),
  ) as string[];
  const reinosDelLibro = reinos.filter((r: any) =>
    reinosIdsUnicos.includes(r.id),
  );
  const ciudadesDelLibro = ciudades.filter((c: any) =>
    ciudadesIdsUnicas.includes(c.id),
  );

  // Re-sync cuando cambia el libro activo
  useEffect(() => {
    if (!libro) return;
    setTitulo(libro.titulo ?? "");
    setSinopsis(libro.sinopsis ?? "");
    setPortada(libro.portada_url ?? "");
    setEstado(libro.estado ?? "BORRADOR");
    setVisibilidad(libro.visibilidad ?? "oculto");
    setFechaLibro(libro.fecha_publicacion ?? "");
    setGrupoId(libro.categoria ?? null);
    setTws((libro as any).trigger_warnings ?? []);
  }, [libro?.id]);

  useEffect(() => {
    if (editTitulo) titRef.current?.focus();
  }, [editTitulo]);

  // Cerrar dropdowns al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropVisRef.current && !dropVisRef.current.contains(e.target as Node))
        setDropVis(false);
      if (dropEstRef.current && !dropEstRef.current.contains(e.target as Node))
        setDropEstado(false);
      if (
        dropPortadaRef.current &&
        !dropPortadaRef.current.contains(e.target as Node)
      )
        setDropPortada(false);
      if (
        dropGrupoRef.current &&
        !dropGrupoRef.current.contains(e.target as Node)
      )
        setDropGrupo(false);
      if (dropTWRef.current && !dropTWRef.current.contains(e.target as Node))
        setDropTW(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const save = async (fields: Partial<Libro>) => {
    if (!libro) return;
    setSaving(true);
    try {
      await libroUpdateMeta(libro.id, fields as any);
      onLibroChange({ ...libro, ...fields } as Libro);
    } catch {}
    setSaving(false);
  };

  const saveTitulo = () => {
    const t = titulo.trim().toUpperCase();
    if (t && t !== libro?.titulo) save({ titulo: t });
    setEditTitulo(false);
  };

  const selectVis = (v: "publico" | "programado" | "oculto") => {
    setVisibilidad(v);
    save({ visibilidad: v });
    setDropVis(false);
  };

  const selectEstado = (e: string) => {
    setEstado(e);
    save({ estado: e });
    setDropEstado(false);
  };

  const toggleTw = (tw: string) => {
    const next = tws.includes(tw) ? tws.filter((x) => x !== tw) : [...tws, tw];
    setTws(next);
    save({ trigger_warnings: next } as any);
  };

  const addCustomTw = () => {
    const v = twCustom.trim();
    if (v && !tws.includes(v)) {
      const next = [...tws, v];
      setTws(next);
      save({ trigger_warnings: next } as any);
    }
    setTwCustom("");
    setTwAdding(false);
  };

  const VISIBILIDAD_LABEL: Record<string, string> = {
    publico: "Público",
    programado: "Programado",
    oculto: "Borrador",
  };
  const VISIBILIDAD_ICON: Record<string, React.ReactNode> = {
    publico: <Globe size={9} />,
    programado: <Timer size={9} />,
    oculto: <Lock size={9} />,
  };
  const vis = visibilidad;

  const sep = (
    <div
      className="w-px h-3 shrink-0"
      style={{
        background: "color-mix(in srgb, var(--primary) 10%, transparent)",
      }}
    />
  );

  return (
    <div
      className="shrink-0 flex flex-col"
      style={{
        borderBottom:
          "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
      }}
    >
      {/* ── Fila principal ── */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{
          borderBottom:
            reinosDelLibro.length > 0 || ciudadesDelLibro.length > 0
              ? "1px solid color-mix(in srgb, var(--primary) 6%, transparent)"
              : "none",
          background: "color-mix(in srgb, var(--primary) 2%, var(--bg-main))",
        }}
      >
        {/* Volver */}
        <button
          className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-primary/30 hover:text-primary transition-colors shrink-0 group"
          onClick={onVolver}
        >
          <ChevronRight
            className="rotate-180 group-hover:-translate-x-0.5 transition-transform"
            size={9}
          />
          Biblioteca
        </button>

        {sep}

        {/* Portada — click abre selector */}
        <div ref={dropPortadaRef} className="relative shrink-0">
          <button
            className="w-6 h-8 rounded overflow-hidden border border-primary/10 hover:border-primary/40 transition-all group flex items-center justify-center"
            style={{
              background: "color-mix(in srgb, var(--primary) 5%, transparent)",
            }}
            title="Cambiar portada"
            onClick={() => {
              setDropPortada((o) => !o);
              closeAll("portada");
            }}
          >
            {portada ? (
              <img
                alt=""
                className="w-full h-full object-cover"
                src={portada}
              />
            ) : (
              <BookMarked
                size={9}
                className="text-primary/20 group-hover:text-primary/50 transition-colors"
              />
            )}
          </button>
          {dropPortada && (
            <div
              className="absolute left-0 top-full mt-1 z-50 rounded-lg border shadow-xl p-3"
              style={{
                background: "var(--bg-main)",
                borderColor:
                  "color-mix(in srgb, var(--primary) 12%, transparent)",
                width: 240,
              }}
            >
              <SelectorImagenPortada
                value={portada}
                onChange={(v) => {
                  setPortada(v);
                  save({ portada_url: v });
                  setDropPortada(false);
                }}
              />
            </div>
          )}
        </div>

        {/* Título editable inline */}
        {editTitulo ? (
          <input
            ref={titRef}
            className="flex-1 min-w-0 bg-transparent outline-none border-b text-[10px] font-black uppercase italic tracking-tight text-primary"
            style={{
              borderColor:
                "color-mix(in srgb, var(--primary) 30%, transparent)",
            }}
            value={titulo}
            onBlur={saveTitulo}
            onChange={(e) => setTitulo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveTitulo();
              if (e.key === "Escape") {
                setTitulo(libro?.titulo ?? "");
                setEditTitulo(false);
              }
            }}
          />
        ) : (
          <button
            className="flex-1 min-w-0 text-left text-[10px] font-black uppercase italic tracking-tight text-primary/70 hover:text-primary truncate transition-colors"
            title="Click para editar título"
            onClick={() => setEditTitulo(true)}
          >
            {titulo || "…"}
          </button>
        )}

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Visibilidad dropdown */}
          <div ref={dropVisRef} className="relative">
            <button
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wide border transition-all"
              style={{
                borderColor:
                  vis === "publico"
                    ? "color-mix(in srgb, var(--callout-success-border) 40%, transparent)"
                    : "color-mix(in srgb, var(--primary) 15%, transparent)",
                color:
                  vis === "publico"
                    ? "var(--callout-success-title)"
                    : "color-mix(in srgb, var(--primary) 40%, transparent)",
                background:
                  vis === "publico"
                    ? "color-mix(in srgb, var(--callout-success-border) 8%, transparent)"
                    : "transparent",
              }}
              onClick={() => {
                setDropVis((o) => !o);
                closeAll("vis");
              }}
            >
              {VISIBILIDAD_ICON[vis]}
              {VISIBILIDAD_LABEL[vis]}
              <ChevronDown size={7} style={{ opacity: 0.5, marginLeft: 1 }} />
            </button>
            {dropVis && (
              <div
                className="absolute left-0 top-full mt-1 z-50 rounded-lg border shadow-xl overflow-hidden"
                style={{
                  background: "var(--bg-main)",
                  borderColor:
                    "color-mix(in srgb, var(--primary) 12%, transparent)",
                  minWidth: 130,
                }}
              >
                {(["publico", "programado", "oculto"] as const).map((v) => (
                  <button
                    key={v}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[9px] font-black uppercase tracking-wide text-left hover:bg-primary/6 transition-all"
                    style={{
                      color:
                        visibilidad === v
                          ? "var(--primary)"
                          : "color-mix(in srgb, var(--primary) 45%, transparent)",
                    }}
                    onClick={() => selectVis(v)}
                  >
                    {VISIBILIDAD_ICON[v]}
                    {VISIBILIDAD_LABEL[v]}
                    {visibilidad === v && (
                      <Check
                        size={8}
                        className="ml-auto"
                        style={{ color: "var(--primary)" }}
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Estado dropdown */}
          <div ref={dropEstRef} className="relative">
            <button
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wide border transition-all hover:border-primary/25 hover:text-primary/60"
              style={{
                borderColor:
                  "color-mix(in srgb, var(--primary) 12%, transparent)",
                color: "color-mix(in srgb, var(--primary) 35%, transparent)",
              }}
              onClick={() => {
                setDropEstado((o) => !o);
                closeAll("estado");
              }}
            >
              {estado}
              <ChevronDown size={7} style={{ opacity: 0.5, marginLeft: 1 }} />
            </button>
            {dropEstado && (
              <div
                className="absolute left-0 top-full mt-1 z-50 rounded-lg border shadow-xl overflow-hidden"
                style={{
                  background: "var(--bg-main)",
                  borderColor:
                    "color-mix(in srgb, var(--primary) 12%, transparent)",
                  minWidth: 130,
                }}
              >
                {ESTADOS_LIBRO.map((est) => (
                  <button
                    key={est}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[9px] font-black uppercase tracking-wide text-left hover:bg-primary/6 transition-all"
                    style={{
                      color:
                        estado === est
                          ? "var(--primary)"
                          : "color-mix(in srgb, var(--primary) 45%, transparent)",
                    }}
                    onClick={() => selectEstado(est)}
                  >
                    {est}
                    {estado === est && (
                      <Check
                        size={8}
                        className="ml-auto"
                        style={{ color: "var(--primary)" }}
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Grupo dropdown */}
          <div ref={dropGrupoRef} className="relative">
            <button
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wide border transition-all hover:border-primary/25 hover:text-primary/60"
              style={{
                borderColor:
                  "color-mix(in srgb, var(--primary) 12%, transparent)",
                color: "color-mix(in srgb, var(--primary) 35%, transparent)",
              }}
              onClick={() => {
                setDropGrupo((o) => !o);
                closeAll("grupo");
              }}
            >
              <BookMarked size={8} />
              {gruposItems.find((g) => g.id === grupoId)?.label ?? "Sin grupo"}
              <ChevronDown size={7} style={{ opacity: 0.5, marginLeft: 1 }} />
            </button>
            {dropGrupo && (
              <div
                className="absolute left-0 top-full mt-1 z-50 rounded-lg border shadow-xl overflow-hidden"
                style={{
                  background: "var(--bg-main)",
                  borderColor:
                    "color-mix(in srgb, var(--primary) 12%, transparent)",
                  minWidth: 150,
                }}
              >
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-[9px] font-black uppercase tracking-wide text-left hover:bg-primary/6 transition-all"
                  style={{
                    color: !grupoId
                      ? "var(--primary)"
                      : "color-mix(in srgb, var(--primary) 45%, transparent)",
                  }}
                  onClick={() => {
                    setGrupoId(null);
                    save({ categoria: null });
                    setDropGrupo(false);
                  }}
                >
                  Sin grupo{" "}
                  {!grupoId && (
                    <Check
                      size={8}
                      className="ml-auto"
                      style={{ color: "var(--primary)" }}
                    />
                  )}
                </button>
                {gruposItems.map((g: any) => (
                  <button
                    key={g.id}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[9px] font-black uppercase tracking-wide text-left hover:bg-primary/6 transition-all"
                    style={{
                      color:
                        grupoId === g.id
                          ? "var(--primary)"
                          : "color-mix(in srgb, var(--primary) 45%, transparent)",
                    }}
                    onClick={() => {
                      setGrupoId(g.id);
                      save({ categoria: g.id });
                      setDropGrupo(false);
                    }}
                  >
                    {g.label}
                    {grupoId === g.id && (
                      <Check
                        size={8}
                        className="ml-auto"
                        style={{ color: "var(--primary)" }}
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* TW — siempre visible, opaco si no tiene */}
          <div ref={dropTWRef} className="relative">
            <button
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] border transition-all"
              style={{
                opacity: tws.length > 0 ? 1 : 0.3,
                borderColor:
                  tws.length > 0
                    ? "color-mix(in srgb, var(--callout-warning-border) 40%, transparent)"
                    : "color-mix(in srgb, var(--primary) 15%, transparent)",
                background:
                  tws.length > 0
                    ? "color-mix(in srgb, var(--callout-warning-border) 8%, transparent)"
                    : "transparent",
              }}
              title="Trigger Warnings"
              onClick={() => {
                setDropTW((o) => !o);
                closeAll("tw");
              }}
            >
              ⚠️
            </button>
            {dropTW && (
              <div
                className="absolute right-0 top-full mt-1 z-50 rounded-lg border shadow-xl p-2"
                style={{
                  background: "var(--bg-main)",
                  borderColor:
                    "color-mix(in srgb, var(--primary) 12%, transparent)",
                  minWidth: 190,
                }}
              >
                <div className="flex flex-col gap-0.5 mb-1">
                  {TW_PREDEFINIDOS_BARRA.map((tw) => {
                    const on = tws.includes(tw);
                    return (
                      <button
                        key={tw}
                        className="flex items-center gap-2 w-full text-left px-2 py-1 rounded transition-all"
                        style={{
                          background: on
                            ? "color-mix(in srgb, var(--callout-warning-border) 10%, transparent)"
                            : "transparent",
                        }}
                        onClick={() => toggleTw(tw)}
                      >
                        <div
                          className="shrink-0 flex items-center justify-center rounded"
                          style={{
                            width: 11,
                            height: 11,
                            border: `1px solid ${on ? "var(--callout-warning-border)" : "color-mix(in srgb, var(--primary) 20%, transparent)"}`,
                            background: on
                              ? "var(--callout-warning-border)"
                              : "transparent",
                          }}
                        >
                          {on && (
                            <Check
                              size={7}
                              style={{ color: "var(--bg-main)" }}
                            />
                          )}
                        </div>
                        <span
                          className="text-[9px] font-bold"
                          style={{
                            color: on
                              ? "var(--callout-warning-title)"
                              : "color-mix(in srgb, var(--primary) 45%, transparent)",
                          }}
                        >
                          {tw}
                        </span>
                      </button>
                    );
                  })}
                  {tws
                    .filter((tw) => !TW_PREDEFINIDOS_BARRA.includes(tw))
                    .map((tw) => (
                      <button
                        key={tw}
                        className="flex items-center gap-2 w-full text-left px-2 py-1 rounded"
                        style={{
                          background:
                            "color-mix(in srgb, var(--callout-warning-border) 10%, transparent)",
                        }}
                        onClick={() => toggleTw(tw)}
                      >
                        <div
                          className="shrink-0 flex items-center justify-center rounded"
                          style={{
                            width: 11,
                            height: 11,
                            border: "1px solid var(--callout-warning-border)",
                            background: "var(--callout-warning-border)",
                          }}
                        >
                          <Check size={7} style={{ color: "var(--bg-main)" }} />
                        </div>
                        <span
                          className="text-[9px] font-bold flex-1 truncate"
                          style={{ color: "var(--callout-warning-title)" }}
                        >
                          {tw}
                        </span>
                        <X size={8} className="text-primary/30" />
                      </button>
                    ))}
                </div>
                {twAdding ? (
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      className="flex-1 min-w-0 rounded px-2 py-1 text-[9px] font-bold outline-none border text-primary bg-transparent"
                      placeholder="Ej: Acoso…"
                      style={{
                        borderColor:
                          "color-mix(in srgb, var(--primary) 20%, transparent)",
                      }}
                      value={twCustom}
                      onChange={(e) => setTwCustom(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addCustomTw();
                        if (e.key === "Escape") {
                          setTwCustom("");
                          setTwAdding(false);
                        }
                      }}
                    />
                    <button
                      className="p-1 rounded bg-primary/10 text-primary"
                      onClick={addCustomTw}
                    >
                      <Check size={9} />
                    </button>
                    <button
                      className="p-1 rounded text-primary/30"
                      onClick={() => {
                        setTwCustom("");
                        setTwAdding(false);
                      }}
                    >
                      <X size={9} />
                    </button>
                  </div>
                ) : (
                  <button
                    className="w-full flex items-center justify-center gap-1 py-1 rounded border border-dashed text-[8px] font-black uppercase tracking-widest text-primary/25 hover:text-primary hover:border-primary/25 transition-all"
                    style={{
                      borderColor:
                        "color-mix(in srgb, var(--primary) 12%, transparent)",
                    }}
                    onClick={() => setTwAdding(true)}
                  >
                    <Plus size={8} /> Añadir
                  </button>
                )}
              </div>
            )}
          </div>

          {saving && (
            <Loader2 className="animate-spin text-primary/30" size={10} />
          )}

          {sep}

          {/* Sinopsis toggle */}
          <button
            className="p-1.5 rounded hover:bg-primary/8 transition-all"
            style={{
              color: panelOpen
                ? "var(--primary)"
                : "color-mix(in srgb, var(--primary) 30%, transparent)",
            }}
            title="Sinopsis"
            onClick={() => setPanelOpen((o) => !o)}
          >
            <AlignLeft size={11} />
          </button>

          {/* Nuevo cap */}
          <button
            className="flex items-center gap-1 px-2 py-1 rounded-[var(--radius-btn)] bg-primary/8 hover:bg-primary/15 text-primary/50 hover:text-primary text-[8px] font-black uppercase tracking-widest transition-all"
            onClick={onNuevoCap}
          >
            <Plus size={9} /> Cap
          </button>

          {sep}

          {/* Toggle sidebar caps */}
          <button
            className="p-1.5 rounded hover:bg-primary/8 transition-all"
            style={{
              color: sidebarOpen
                ? "var(--primary)"
                : "color-mix(in srgb, var(--primary) 30%, transparent)",
            }}
            title={
              sidebarOpen
                ? "Cerrar panel de capítulos"
                : "Abrir panel de capítulos"
            }
            onClick={onToggleSidebar}
          >
            <PanelRight size={12} />
          </button>
        </div>
      </div>

      {/* ── Fila de pills: Reinos y Ciudades ── */}
      {(reinosDelLibro.length > 0 || ciudadesDelLibro.length > 0) && (
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 overflow-x-auto"
          style={{
            borderBottom:
              "1px solid color-mix(in srgb, var(--primary) 6%, transparent)",
            background: "color-mix(in srgb, var(--primary) 1%, var(--bg-main))",
          }}
        >
          {reinosDelLibro.map((r: any) => (
            <span
              key={r.id}
              className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wide border"
              style={{
                borderColor:
                  "color-mix(in srgb, var(--primary) 12%, transparent)",
                color: "color-mix(in srgb, var(--primary) 45%, transparent)",
                background:
                  "color-mix(in srgb, var(--primary) 3%, transparent)",
              }}
            >
              🏰 {r.nombre}
            </span>
          ))}
          {reinosDelLibro.length > 0 && ciudadesDelLibro.length > 0 && (
            <div
              className="w-px h-3 shrink-0"
              style={{
                background:
                  "color-mix(in srgb, var(--primary) 10%, transparent)",
              }}
            />
          )}
          {ciudadesDelLibro.map((c: any) => (
            <span
              key={c.id}
              className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wide border"
              style={{
                borderColor:
                  "color-mix(in srgb, var(--primary) 10%, transparent)",
                color: "color-mix(in srgb, var(--primary) 35%, transparent)",
                background:
                  "color-mix(in srgb, var(--primary) 2%, transparent)",
              }}
            >
              🏛 {c.nombre}
            </span>
          ))}
        </div>
      )}

      {/* ── Panel sinopsis expandible ── */}
      {panelOpen && (
        <div
          className="px-4 py-3 border-b"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
            background:
              "color-mix(in srgb, var(--primary) 1.5%, var(--bg-main))",
          }}
        >
          <label className="text-[8px] font-black uppercase tracking-widest text-primary/35 block mb-1.5">
            Sinopsis
          </label>
          <textarea
            className="w-full bg-transparent border rounded px-2 py-1.5 text-[11px] text-primary outline-none focus:border-primary/30 resize-none transition-colors"
            placeholder="Descripción del libro…"
            rows={3}
            style={{
              borderColor:
                "color-mix(in srgb, var(--primary) 15%, transparent)",
            }}
            value={sinopsis}
            onBlur={() => save({ sinopsis: sinopsis.trim() })}
            onChange={(e) => setSinopsis(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}

// ─── SidebarCapitulos ─────────────────────────────────────────────────────────
// Barra vertical derecha con la lista de capítulos del libro activo.

function SidebarCapitulos({
  capitulos,
  selectedCapId,
  libroId,
  open,
  onSelectCap,
  onDeleteCap,
  onNuevoCap,
  onToggleSidebar,
}: {
  capitulos: Capitulo[];
  selectedCapId: string | null;
  libroId: string;
  open: boolean;
  onSelectCap: (capId: string) => void;
  onDeleteCap: (id: string, libroId: string) => void;
  onNuevoCap: () => void;
  onToggleSidebar: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="shrink-0 flex flex-col border-r overflow-hidden"
      style={{
        width: "clamp(180px, 18vw, 240px)",
        borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
        background: "color-mix(in srgb, var(--primary) 1.5%, var(--bg-main))",
      }}
    >
      {/* Header sidebar */}
      <div
        className="shrink-0 flex items-center gap-1.5 px-3 py-2 border-b"
        style={{
          borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
        }}
      >
        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary/35 flex-1">
          Capítulos · {capitulos.length}
        </span>
        <button
          className="p-1 rounded hover:bg-primary/8 text-primary/30 hover:text-primary transition-all"
          title="Nuevo capítulo"
          onClick={onNuevoCap}
        >
          <Plus size={10} />
        </button>
        <button
          className="p-1 rounded hover:bg-primary/8 text-primary/30 hover:text-primary transition-all"
          title="Cerrar panel"
          onClick={onToggleSidebar}
        >
          <X size={10} />
        </button>
      </div>

      {/* Lista de caps — sin scroll fijo, se expande */}
      <div className="flex-1 overflow-y-auto py-1">
        {capitulos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-primary/20">
            <BookMarked size={16} />
            <p className="text-[7px] font-black uppercase tracking-widest text-center px-2">
              Sin capítulos
            </p>
          </div>
        ) : (
          capitulos.map((cap) => {
            const activo = cap.id === selectedCapId;
            return (
              <div
                key={cap.id}
                className="group relative flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer transition-all"
                style={{
                  background: activo
                    ? "color-mix(in srgb, var(--primary) 8%, transparent)"
                    : "transparent",
                  borderLeft: activo
                    ? "2px solid var(--primary)"
                    : "2px solid transparent",
                }}
                onClick={() => onSelectCap(cap.id)}
              >
                {/* Número de orden */}
                <span
                  className="shrink-0 text-[7px] font-black tabular-nums"
                  style={{
                    color: activo
                      ? "var(--primary)"
                      : "color-mix(in srgb, var(--primary) 25%, transparent)",
                    width: 16,
                    textAlign: "right",
                  }}
                >
                  {cap.orden}
                </span>

                {/* Título */}
                <span
                  className="flex-1 min-w-0 text-[9px] font-bold uppercase tracking-wide leading-tight truncate"
                  style={{
                    color: activo
                      ? "var(--primary)"
                      : "color-mix(in srgb, var(--primary) 55%, transparent)",
                  }}
                >
                  {cap.titulo_capitulo}
                </span>

                {/* Visibilidad dot */}
                <div
                  className="shrink-0 w-1.5 h-1.5 rounded-full"
                  style={{
                    background:
                      cap.visibilidad === "publico"
                        ? "var(--callout-success-border)"
                        : cap.visibilidad === "programado"
                          ? "var(--callout-warning-border)"
                          : "color-mix(in srgb, var(--primary) 15%, transparent)",
                  }}
                />

                {/* Acciones hover */}
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-bg-main border border-primary/10 rounded px-0.5 py-0.5 shadow-sm">
                  <button
                    className="p-0.5 rounded hover:bg-red-500/10 text-primary/25 hover:text-red-400 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteCap(cap.id, libroId);
                    }}
                  >
                    <Trash2 size={9} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── EditorCapitulosPanel ─────────────────────────────────────────────────────

export function EditorCapitulosPanel() {
  const {
    data: libros,
    setData: setLibros,
    loading: loadingLibros,
    addRow: addLibro,
  } = useSupabaseData<Libro>("libros", {
    isAdmin: true,
    order: { campo: "created_at", asc: false },
  });

  const [lastCapId, setLastCapId] = useLastOpenedId("estudio-caps-last-cap");
  const [lastLibroId, setLastLibroId] = useLastOpenedId(
    "estudio-caps-last-libro",
  );

  const [selectedLibroId, _setSelectedLibroId] = useState<string | null>(
    lastLibroId,
  );
  const [selectedCapId, _setSelectedCapId] = useState<string | null>(lastCapId);

  const setSelectedLibroId = (id: string | null) => {
    _setSelectedLibroId(id);
    setLastLibroId(id);
  };
  const setSelectedCapId = (id: string | null) => {
    _setSelectedCapId(id);
    setLastCapId(id);
  };

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [showNuevoCap, setShowNuevoCap] = useState(false);
  const [showNuevoLibro, setShowNuevoLibro] = useState(false);
  const [capRefreshKey, setCapRefreshKey] = useState(0);
  const handleLibroEditado = (libro: Libro) => {
    setLibros((prev: Libro[]) =>
      prev.map((l) => (l.id === libro.id ? libro : l)),
    );
  };

  // Vista: "biblioteca" | "editor"
  // Si hay cap seleccionado → editor; si hay libro pero no cap → biblioteca con sidebar abierto
  const [vistaLibroId, setVistaLibroId] = useState<string | null>(lastLibroId);

  const {
    capitulos,
    setCapitulos,
    reload: reloadCaps,
  } = useCapitulos(selectedLibroId);

  useEffect(() => {
    const check = () => {
      const action = localStorage.getItem("estudio-caps-action");
      const capId = localStorage.getItem("estudio-caps-last-cap");
      const libroId = localStorage.getItem("estudio-caps-last-libro");
      if (capId && libroId) {
        setSelectedLibroId(libroId);
        setSelectedCapId(capId);
        setVistaLibroId(libroId);
        setFocusMode(false);
        setSidebarOpen(true);
      }
      if (!action) return;
      localStorage.removeItem("estudio-caps-action");
      if (action === "nuevo-libro")
        setTimeout(() => setShowNuevoLibro(true), 120);
      if (action === "nuevo-cap") setTimeout(() => setShowNuevoCap(true), 120);
    };
    check();
    window.addEventListener("estudio-caps-action", check);
    return () => window.removeEventListener("estudio-caps-action", check);
  }, []);

  const handleSelectLibro = async (libroId: string) => {
    setSelectedLibroId(libroId);
    setVistaLibroId(libroId);
    setSidebarOpen(true);

    // Si ya hay un cap guardado para este libro, ir directo
    const savedCapId = lastCapId;
    const savedLibroId = lastLibroId;
    if (savedCapId && savedLibroId === libroId) {
      setSelectedCapId(savedCapId);
      return;
    }

    // Si no, cargar caps y abrir el primero
    try {
      const { data } = await supabase
        .from("capitulos")
        .select("id, orden")
        .eq("libro_id", libroId)
        .order("orden", { ascending: true })
        .limit(1)
        .single();
      if (data) {
        setSelectedCapId(data.id);
        setLastCapId(data.id);
      }
    } catch {}
  };

  const handleSelectCap = (libroId: string, capId: string) => {
    setSelectedLibroId(libroId);
    setVistaLibroId(libroId);
    setSelectedCapId(capId);
    setFocusMode(false);
    setSidebarOpen(true);
  };

  const handleCapCreada = (cap: Capitulo) => {
    setCapitulos((prev) => [...prev, cap]);
    setSelectedCapId(cap.id);
    setCapRefreshKey((k) => k + 1);
  };

  const handleLibroCreado = async (titulo: string) => {
    const { data, error } = await addLibro({
      titulo: titulo.trim().toUpperCase(),
      estado: "BORRADOR",
      visibilidad: "oculto",
    });
    if (error || !data) throw new Error(error ?? "Error al crear libro");
    setSelectedLibroId(data.id);
    setVistaLibroId(data.id);
    setShowNuevoLibro(false);
  };

  const handleCapEliminada = async (id: string, libroId: string) => {
    try {
      await capDelete(id);
      setCapitulos((prev) => prev.filter((c) => c.id !== id));
      if (selectedCapId === id) setSelectedCapId(null);
      setCapRefreshKey((k) => k + 1);
    } catch {}
  };

  const handleLibroEliminado = async (libroId: string) => {
    try {
      await libroDelete(libroId);
      setLibros((prev) => prev.filter((l) => l.id !== libroId));
      if (selectedLibroId === libroId) {
        setSelectedLibroId(null);
        setSelectedCapId(null);
        setVistaLibroId(null);
      }
      setCapRefreshKey((k) => k + 1);
    } catch {}
  };

  const libroActivo = libros.find((l) => l.id === vistaLibroId);
  const enEditor = !!selectedCapId && !!selectedLibroId;
  const enBiblioteca = !enEditor;

  return (
    <>
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* ── Barra superior del libro (solo en editor) ── */}
        {enEditor && (
          <BarraLibro
            libro={libroActivo}
            capitulos={capitulos}
            sidebarOpen={sidebarOpen}
            onLibroChange={handleLibroEditado}
            onNuevoCap={() => setShowNuevoCap(true)}
            onToggleSidebar={() => setSidebarOpen((o) => !o)}
            onVolver={() => {
              setSelectedCapId(null);
              setVistaLibroId(selectedLibroId);
            }}
          />
        )}

        {/* ── Contenido principal ── */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* Biblioteca */}
          {enBiblioteca && (
            <BibliotecaPortadas
              libros={libros}
              loading={loadingLibros}
              selectedLibroId={vistaLibroId}
              onDeleteLibro={handleLibroEliminado}
              onEditLibro={() => {}}
              onNuevoLibro={() => setShowNuevoLibro(true)}
              onSelectLibro={handleSelectLibro}
            />
          )}

          {/* Sidebar caps (izquierda del editor) */}
          {enEditor && (
            <SidebarCapitulos
              capitulos={capitulos}
              libroId={selectedLibroId!}
              open={sidebarOpen}
              selectedCapId={selectedCapId}
              onDeleteCap={handleCapEliminada}
              onNuevoCap={() => setShowNuevoCap(true)}
              onSelectCap={(capId) => handleSelectCap(selectedLibroId!, capId)}
              onToggleSidebar={() => setSidebarOpen((o) => !o)}
            />
          )}

          {/* Editor */}
          {enEditor && selectedCapId && selectedLibroId && (
            <div className="flex-1 min-h-0 flex overflow-hidden">
              <PanelEditor
                key={selectedCapId}
                capId={selectedCapId}
                focusMode={focusMode}
                libroId={selectedLibroId}
                onCapitulosChange={() => setCapRefreshKey((k) => k + 1)}
                onToggleFocus={() => setFocusMode((m) => !m)}
                onVolver={() => {
                  setSelectedCapId(null);
                  setVistaLibroId(selectedLibroId);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {showNuevoLibro && (
        <ModalNuevoLibro
          onClose={() => setShowNuevoLibro(false)}
          onCreated={handleLibroCreado}
        />
      )}
      {showNuevoCap && selectedLibroId && (
        <ModalNuevoCapitulo
          libroId={selectedLibroId}
          ordenSiguiente={capitulos.length + 1}
          onClose={() => setShowNuevoCap(false)}
          onCreated={handleCapCreada}
        />
      )}
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
