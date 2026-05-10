"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Loader2, PenTool } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/ui/useToast";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { db } from "@/lib/api/client/db";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";

import Sidebar from "@/components/paginas/myself/vida/escritorio/ensayos/sidebar";
import Editor from "@/components/paginas/myself/vida/escritorio/ensayos/editor";
import { EmptyState } from "@/components/paginas/myself/vida/escritorio/ensayos/emptyState";
import NewNoteModal from "@/components/paginas/myself/vida/escritorio/ensayos/newNoteModal";
import EstudioLayout from "@/components/layout/EstudioLayout";
import { GrafoEnsayos } from "@/components/paginas/myself/vida/escritorio/ensayos/GrafoEnsayos";

export interface ZoteroSource {
  title: string;
  author: string;
  year: string;
  citekey?: string;
  journal?: string;
  url?: string;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

function setSaveIndicator(el: HTMLElement | null, status: SaveStatus) {
  if (!el) return;
  if (status === "idle") { el.style.opacity = "0"; return; }
  el.style.opacity = "1";
  el.textContent =
    status === "saving" ? "guardando…" :
    status === "saved"  ? "✓ guardado" : "error";
  el.style.color =
    status === "saving" ? "color-mix(in srgb, var(--foreground) 20%, transparent)" :
    status === "saved"  ? "color-mix(in srgb, var(--accent) 70%, transparent)" :
                          "color-mix(in srgb, var(--primary) 70%, transparent)";
}

const LS_ACTIVE       = "ensayos-active-id";
const DEXIE_ZOTERO_KEY = "zotero_file_handle";

async function saveZoteroHandle(handle: FileSystemFileHandle) {
  try {
    if (!db) return;
    await (db as any).reproductor_handles.put({ key: DEXIE_ZOTERO_KEY, handle });
  } catch {}
}

async function loadZoteroHandle(): Promise<FileSystemFileHandle | null> {
  try {
    if (!db) return null;
    const row = await (db as any).reproductor_handles.get(DEXIE_ZOTERO_KEY);
    return row?.handle ?? null;
  } catch { return null; }
}

function parseZoteroJson(json: any[]): ZoteroSource[] {
  return json.map((item: any) => ({
    title:   item.title || "",
    author:  item.author
      ? (Array.isArray(item.author)
          ? item.author.map((a: any) => a.family || a.literal || "").filter(Boolean).join(", ")
          : item.author)
      : (item.creators?.[0]?.lastName || ""),
    year:    item.issued?.["date-parts"]?.[0]?.[0]?.toString()
          || item.date?.substring(0, 4) || "",
    citekey: item.id || item["citation-key"] || "",
    journal: item["container-title"] || item.publisher || "",
    url:     item.URL || item.url || "",
  }));
}

async function readZoteroFile(handle: FileSystemFileHandle): Promise<ZoteroSource[]> {
  const file = await handle.getFile();
  const text = await file.text();
  const json  = JSON.parse(text);
  const items = Array.isArray(json) ? json : (json.items || json.references || []);
  return parseZoteroJson(items);
}

export default function Ensayos() {
  const { user } = useAuth() as { user: any };
  const { toasts, toast, dismiss } = useToast();
  const { confirm, ConfirmModal }  = useConfirm();

  const [editMode,          setEditMode]          = useState(true);
  const [sidebarOpen,       setSidebarOpen]       = useState(false);
  const [showNewNoteModal,  setShowNewNoteModal]  = useState(false);

  const [sources,           setSources]           = useState<ZoteroSource[]>([]);
  const [zoteroConnected,   setZoteroConnected]   = useState(false);
  const [tagActivo,         setTagActivo]         = useState<string | null>(null);

  // For pre-filling the new note modal title (used when creating tag-pages)
  const [pendingNoteTitle,  setPendingNoteTitle]  = useState<string | null>(null);

  const {
    data:     ensayos,
    setData:  setEnsayos,
    loading,
    isOffline,
    addRow,
    updateRow,
    deleteRow,
  } = useSupabaseData("ensayos", { order: { campo: "updated_at", asc: false } });

  const handleTagClick = useCallback((tag: string | null) => setTagActivo(tag), []);

  const [ensayoActivoId, setEnsayoActivoId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(LS_ACTIVE);
  });

  const [searchTerm, setSearchTerm] = useState("");

  const pendingUpdatesRef  = useRef<Record<string, Record<string, any>>>({});
  const saveTimerRef       = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const saveIndicatorRef   = useRef<HTMLSpanElement | null>(null);

  // ─── Zotero ────────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      const handle = await loadZoteroHandle();

      if (!handle) {
        const cached = localStorage.getItem("fran-zotero-cache");
        if (cached) {
          try { setSources(JSON.parse(cached)); } catch {}
        }
        return;
      }

      try {
        const h    = handle as any;
        const perm = await h.queryPermission({ mode: "read" });
        const granted = perm === "granted"
          ? "granted"
          : await h.requestPermission({ mode: "read" });

        if (granted !== "granted") return;

        const parsed = await readZoteroFile(handle);
        setSources(parsed);
        setZoteroConnected(true);
        localStorage.setItem("fran-zotero-cache", JSON.stringify(parsed));
      } catch {
        const cached = localStorage.getItem("fran-zotero-cache");
        if (cached) {
          try { setSources(JSON.parse(cached)); } catch {}
        }
      }
    })();
  }, []);

  const connectZotero = useCallback(async () => {
    if (!("showOpenFilePicker" in window)) {
      const input = document.createElement("input");
      input.type   = "file";
      input.accept = ".json";
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        try {
          const text  = await file.text();
          const json  = JSON.parse(text);
          const items = Array.isArray(json) ? json : (json.items || json.references || []);
          const parsed = parseZoteroJson(items);
          setSources(parsed);
          setZoteroConnected(true);
          localStorage.setItem("fran-zotero-cache", JSON.stringify(parsed));
        } catch { toast.error("Error al leer el archivo Zotero"); }
      };
      input.click();
      return;
    }

    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types:    [{ description: "Zotero JSON", accept: { "application/json": [".json"] } }],
        multiple: false,
      });
      await saveZoteroHandle(handle);
      const parsed = await readZoteroFile(handle);
      setSources(parsed);
      setZoteroConnected(true);
      localStorage.setItem("fran-zotero-cache", JSON.stringify(parsed));
    } catch (e: any) {
      if (e.name !== "AbortError") console.error(e);
    }
  }, []);

  const refreshZotero = useCallback(async () => {
    const handle = await loadZoteroHandle();
    if (!handle) { connectZotero(); return; }
    try {
      const h       = handle as any;
      const perm    = await h.queryPermission({ mode: "read" });
      const granted = perm === "granted"
        ? "granted"
        : await h.requestPermission({ mode: "read" });
      if (granted !== "granted") return;
      const parsed = await readZoteroFile(handle);
      setSources(parsed);
      localStorage.setItem("fran-zotero-cache", JSON.stringify(parsed));
    } catch { connectZotero(); }
  }, [connectZotero]);

  // ─── Tag-as-page navigation ────────────────────────────────────────────────

  /**
   * Silently create a tag-page (no modal). Returns the new note id.
   */
  const autoCreateTagPage = useCallback(async (tag: string): Promise<string | null> => {
    if (!user) return null;
    const now = new Date().toISOString();
    // Build initial content listing linked notes
    const linkedNotes = ensayos
      .filter((e: any) => e.tags?.includes(tag) && e.titulo)
      .map((e: any) => `- [[${e.titulo}]]`)
      .join("\n");

    const contenido = `# ${tag}\n\nNotas con esta etiqueta:\n\n${linkedNotes || "_ninguna aún_"}`;

    const payload = {
      titulo:     tag,
      user_id:    user.id,
      contenido,
      tags:       [tag],
      updated_at: now,
    };

    const { data, error } = await addRow(payload);
    if (!error && data) {
      setEnsayos((prev: any[]) => {
        if (prev.find((e: any) => e.id === data.id)) return prev;
        return [data, ...prev];
      });
      return data.id;
    }
    return null;
  }, [user, ensayos, addRow, setEnsayos]);

  /**
   * Navigate to the note whose title matches `name` (case-insensitive).
   * If it's a tag navigation and no note exists, auto-create the page silently.
   * If it's a wikilink and no note exists, open NewNoteModal pre-filled.
   */
  const navigateToPage = useCallback(async (name: string, isTag = false) => {
    const normalized = name.trim().toLowerCase();
    const found = ensayos.find(
      (e: any) => e.titulo?.toLowerCase() === normalized
    );
    if (found) {
      setEnsayoActivo(found.id);
      setSidebarOpen(false);
    } else if (isTag) {
      // Auto-create tag page silently
      const newId = await autoCreateTagPage(name.trim());
      if (newId) {
        setEnsayoActivo(newId);
        setSidebarOpen(false);
      }
    } else {
      // Wikilink: pre-fill modal
      setPendingNoteTitle(name.trim());
      setShowNewNoteModal(true);
    }
  }, [ensayos, autoCreateTagPage]);

  /**
   * Auto-create pages for any tags that don't have one yet.
   */
  const autoCreateMissingTagPages = useCallback(async (tags: string[]) => {
    for (const tag of tags) {
      const exists = ensayos.some((e: any) => e.titulo?.toLowerCase() === tag.toLowerCase());
      if (!exists) {
        await autoCreateTagPage(tag);
      }
    }
  }, [ensayos, autoCreateTagPage]);

  /**
   * Click a tag chip → navigate to the note-page for that tag (auto-creates if missing).
   */
  const handleTagNavigate = useCallback((tag: string) => {
    navigateToPage(tag, true);
  }, [navigateToPage]);

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const setEnsayoActivo = useCallback((id: string | null) => {
    setEnsayoActivoId(id);
    if (id) localStorage.setItem(LS_ACTIVE, id);
    else     localStorage.removeItem(LS_ACTIVE);
  }, []);

  useEffect(() => {
    const handleResize = () => { if (window.innerWidth >= 1024) setSidebarOpen(false); };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const todosLosTags = useMemo(() => {
    const set = new Set<string>();
    ensayos.forEach((e: any) => e.tags?.forEach((t: string) => set.add(t)));
    return Array.from(set).sort();
  }, [ensayos]);

  // Lista de entidades para el autocompletado [[wikilink]] del editor:
  // títulos de ensayos + todas las tags, cada una con su tipo dinámico
  const allWikilinkNames = useMemo(() => {
    const seen = new Set<string>();
    const result: { name: string; type: string }[] = [];

    // Tags primero (cada ensayo puede tener varias)
    todosLosTags.forEach(tag => {
      if (!seen.has(tag)) {
        seen.add(tag);
        result.push({ name: tag, type: "tag" });
      }
    });

    // Títulos de ensayos — el tipo es la primera tag del ensayo, o "nota" si no tiene
    ensayos.forEach((e: any) => {
      const titulo = e.titulo?.trim();
      if (!titulo || seen.has(titulo)) return;
      seen.add(titulo);
      const tipo = e.tags?.[0] ?? "nota";
      result.push({ name: titulo, type: tipo });
    });

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [ensayos, todosLosTags]);

  const ensayosFiltrados = useMemo(() => {
    return ensayos.filter((e: any) => {
      const cumpleTag      = tagActivo ? e.tags?.includes(tagActivo) : true;
      const q              = searchTerm.toLowerCase();
      const cumpleBusqueda = e.titulo?.toLowerCase().includes(q) || e.contenido?.toLowerCase().includes(q);
      return cumpleTag && cumpleBusqueda;
    });
  }, [ensayos, tagActivo, searchTerm]);

  // ─── Guardado ──────────────────────────────────────────────────────────────

  const scheduleSave = useCallback((id: string, updates: Record<string, any>) => {
    pendingUpdatesRef.current[id] = {
      ...(pendingUpdatesRef.current[id] || {}),
      ...updates,
    };

    if (saveTimerRef.current[id]) clearTimeout(saveTimerRef.current[id]);

    saveTimerRef.current[id] = setTimeout(async () => {
      const batch = { ...(pendingUpdatesRef.current[id] || {}) };
      delete pendingUpdatesRef.current[id];

      setSaveIndicator(saveIndicatorRef.current, "saving");

      const now     = new Date().toISOString();
      const payload = { ...batch, updated_at: now };

      setEnsayos((prev: any[]) =>
        prev.map((e: any) => e.id === id ? { ...e, ...payload } : e)
      );

      try {
        const { error } = await updateRow(id, payload);
        if (error) throw error;
        setSaveIndicator(saveIndicatorRef.current, "saved");
        setTimeout(() => setSaveIndicator(saveIndicatorRef.current, "idle"), 2000);
      } catch {
        setSaveIndicator(saveIndicatorRef.current, "error");
      }
    }, 1500);
  }, [updateRow, setEnsayos]);

  const actualizarLocal = useCallback((id: string, field: string, value: any) => {
    scheduleSave(id, { [field]: value });
    // Auto-create pages for any new tags
    if (field === "tags" && Array.isArray(value)) {
      autoCreateMissingTagPages(value);
    }
  }, [scheduleSave, autoCreateMissingTagPages]);

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  const crearEnsayo = async (titulo: string) => {
    if (!titulo.trim() || !user) return;
    const now = new Date().toISOString();

    const payload = {
      titulo:     titulo.trim(),
      user_id:    user.id,
      contenido:  "",
      tags:       tagActivo ? [tagActivo] : [],
      updated_at: now,
    };

    const { data, error } = await addRow(payload);
    if (!error && data) {
      setEnsayos((prev: any[]) => {
        if (prev.find((e: any) => e.id === data.id)) return prev;
        return [data, ...prev];
      });
      setEnsayoActivo(data.id);
      setEditMode(true);
      setShowNewNoteModal(false);
      setSidebarOpen(false);
      setPendingNoteTitle(null);
    }
  };

  const eliminarEnsayo = async (id: string) => {
    const ok = await confirm({ message: "¿Eliminar esta nota?", danger: true, confirmLabel: "Eliminar" });
    if (!ok) return;

    if (saveTimerRef.current[id]) {
      clearTimeout(saveTimerRef.current[id]);
      delete saveTimerRef.current[id];
    }
    delete pendingUpdatesRef.current[id];

    await deleteRow(id);
    setEnsayos((prev: any[]) => prev.filter((e: any) => e.id !== id));
    if (ensayoActivoId === id) setEnsayoActivo(null);
  };

  const handleEnsayoClick = (id: string) => {
    setEnsayoActivo(id);
    setSidebarOpen(false);
  };

  // Usado por el grafo: cambia la nota activa sin cerrar el panel del grafo
  const handleEnsayoClickSinCerrar = useCallback((id: string) => {
    setEnsayoActivo(id);
  }, [setEnsayoActivo]);

  const ensayoActivo = ensayos.find((e: any) => e.id === ensayoActivoId) ?? null;

  // ─── Keep tag-pages content in sync ───────────────────────────────────────
  // When ensayos change, refresh all tag-pages (notes whose title matches a tag)
  // so they always list the current notes with that tag.
  useEffect(() => {
    if (!ensayos.length) return;
    const allTags = new Set<string>();
    ensayos.forEach((e: any) => e.tags?.forEach((t: string) => allTags.add(t)));

    allTags.forEach(tag => {
      const tagPage = ensayos.find((e: any) => e.titulo?.toLowerCase() === tag.toLowerCase());
      if (!tagPage) return;
      const linkedNotes = ensayos
        .filter((e: any) => e.id !== tagPage.id && e.tags?.includes(tag) && e.titulo)
        .map((e: any) => `- [[${e.titulo}]]`)
        .join("\n");
      const newContent = `# ${tag}\n\nNotas con esta etiqueta:\n\n${linkedNotes || "_ninguna aún_"}`;
      // Only update if content has changed to avoid infinite loops
      if (tagPage.contenido !== newContent) {
        scheduleSave(tagPage.id, { contenido: newContent });
        setEnsayos((prev: any[]) =>
          prev.map((e: any) => e.id === tagPage.id ? { ...e, contenido: newContent } : e)
        );
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ensayos.map((e: any) => `${e.id}:${e.tags?.join(",")}`).join("|")]);



  const sidebarProps = {
    ensayos, ensayosFiltrados, todosLosTags, tagActivo, ensayoActivoId,
    searchTerm, sources, zoteroConnected,
    onTagClick:        handleTagClick,
    onTagNavigate:     handleTagNavigate,
    onEnsayoClick:     handleEnsayoClick,
    onCrearEnsayo:     () => setShowNewNoteModal(true),
    onEliminarEnsayo:  eliminarEnsayo,
    onSearchChange:    setSearchTerm,
    onConnectZotero:   connectZotero,
    onRefreshZotero:   refreshZotero,
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        .ensayos-root {
          --sidebar-bg:   var(--bg-menu);
          --sidebar-text: color-mix(in srgb, var(--foreground) 60%, transparent);
          --editor-bg:    var(--bg-main);
          --editor-text:  var(--foreground);
        }
      `}</style>

      <div className="ensayos-root h-full">
        <EstudioLayout
          titulo=" Notas "
          icono={<PenTool size={12} />}
          colapsadoLabel="notas"
          sidebarOpen={sidebarOpen}
          onSidebarOpenChange={setSidebarOpen}
          isOffline={isOffline}
          footerLeft={`${ensayos.length} notas`}
          sidebarContent={<Sidebar {...sidebarProps} embedded />}
        >
          {/* Barra de estado de guardado */}
          <div
            className="shrink-0 z-10 px-6 py-1.5 flex items-center justify-between"
            style={{
              borderBottom: "1px solid color-mix(in srgb, var(--foreground) 4%, transparent)",
              background:   "color-mix(in srgb, var(--bg-menu) 20%, transparent)",
              minHeight:    28,
            }}
          >
            {ensayoActivo ? (
              <GrafoEnsayos
                ensayo={ensayoActivo}
                ensayos={ensayos}
                onSelectEnsayo={handleEnsayoClickSinCerrar}
              />
            ) : <div />}
            <span
              ref={saveIndicatorRef}
              style={{
                fontSize:       9,
                fontFamily:     "var(--font-mono)",
                opacity:        0,
                transition:     "opacity 0.3s",
                letterSpacing:  "0.1em",
                textTransform:  "uppercase",
              }}
            />
          </div>

          {/* Contenido principal */}
          <main
            className="relative flex-1 overflow-y-auto min-h-0"
            style={{ background: "var(--editor-bg, var(--bg-main))" }}
          >
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col gap-3 items-center">
                  <Loader2
                    size={16}
                    style={{
                      color:     "color-mix(in srgb, var(--foreground) 20%, transparent)",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  <span
                    style={{
                      fontSize:      10,
                      fontFamily:    "var(--font-mono)",
                      color:         "color-mix(in srgb, var(--foreground) 15%, transparent)",
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                    }}
                  >
                    cargando...
                  </span>
                </div>
              </div>
            ) : (
              <AnimatePresence>
                {ensayoActivo ? (
                  <Editor
                    ensayo={ensayoActivo}
                    ensayos={ensayos}
                    sources={sources}
                    editMode={editMode}
                    onToggleEditMode={() => setEditMode(p => !p)}
                    onSelectEnsayo={handleEnsayoClickSinCerrar}
                    onUpdateField={actualizarLocal}
                    onNavigateToPage={(name) => navigateToPage(name, false)}
                    entities={allWikilinkNames}
                  />
                ) : (
                  <EmptyState key="empty" onCrearEnsayo={() => setShowNewNoteModal(true)} />
                )}
              </AnimatePresence>
            )}
          </main>
        </EstudioLayout>
      </div>

      <AnimatePresence>
        {showNewNoteModal && (
          <NewNoteModal
            initialTitle={pendingNoteTitle ?? undefined}
            onConfirm={crearEnsayo}
            onClose={() => {
              setShowNewNoteModal(false);
              setPendingNoteTitle(null);
            }}
          />
        )}
      </AnimatePresence>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <ConfirmModal />
    </>
  );
}