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
import { TagPanel } from "@/components/paginas/myself/vida/escritorio/ensayos/tagPanel";
import EstudioLayout from "@/components/layout/EstudioLayout";

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
    status === "saved" ? "✓ guardado" : "error";
  el.style.color =
    status === "saving" ? "rgba(255,255,255,0.2)" :
    status === "saved" ? "rgba(50,200,100,0.7)" : "rgba(255,80,80,0.7)";
}

const LS_ACTIVE = "ensayos-active-id";
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
    title: item.title || "",
    author: item.author
      ? (Array.isArray(item.author)
          ? item.author.map((a: any) => a.family || a.literal || "").filter(Boolean).join(", ")
          : item.author)
      : (item.creators?.[0]?.lastName || ""),
    year: item.issued?.["date-parts"]?.[0]?.[0]?.toString()
       || item.date?.substring(0, 4) || "",
    citekey: item.id || item["citation-key"] || "",
    journal: item["container-title"] || item.publisher || "",
    url: item.URL || item.url || "",
  }));
}

async function readZoteroFile(handle: FileSystemFileHandle): Promise<ZoteroSource[]> {
  const file = await handle.getFile();
  const text = await file.text();
  const json = JSON.parse(text);
  const items = Array.isArray(json) ? json : (json.items || json.references || []);
  return parseZoteroJson(items);
}

export default function Ensayos() {
  const { user } = useAuth() as { user: any };
  const { toasts, toast, dismiss } = useToast();
  const { confirm, ConfirmModal } = useConfirm();

  const [editMode, setEditMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);

  const [sources, setSources] = useState<ZoteroSource[]>([]);
  const [zoteroConnected, setZoteroConnected] = useState(false);
  const [tagActivo, setTagActivo] = useState<string | null>(null);
  const [tagPanel, setTagPanel] = useState<string | null>(null);

  const {
    data: ensayos,
    setData: setEnsayos,
    loading,
    isOffline,
    addRow,
    updateRow,
    deleteRow,
  } = useSupabaseData("ensayos", { order: { campo: "updated_at", asc: false } });

  const handleTagClick = useCallback((tag: string | null) => setTagActivo(tag), []);
  const handleTagPanelClose = useCallback(() => setTagPanel(null), []);

  const [ensayoActivoId, setEnsayoActivoId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(LS_ACTIVE);
  });

  const [searchTerm, setSearchTerm] = useState("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveIndicatorRef = useRef<HTMLSpanElement | null>(null);

  // Load Zotero on mount
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
        const h = handle as any;
        const perm = await h.queryPermission({ mode: "read" });
        const granted = perm === "granted" ? "granted" : await h.requestPermission({ mode: "read" });
        if (granted !== "granted") return;
        const parsed = await readZoteroFile(handle);
        setSources(parsed);
        setZoteroConnected(true);
        localStorage.setItem("fran-zotero-cache", JSON.stringify(parsed));
      } catch (e) {
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
      input.type = "file";
      input.accept = ".json";
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          const json = JSON.parse(text);
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
        types: [{ description: "Zotero JSON", accept: { "application/json": [".json"] } }],
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
      const h = handle as any;
      const perm = await h.queryPermission({ mode: "read" });
      const granted = perm === "granted" ? "granted" : await h.requestPermission({ mode: "read" });
      if (granted !== "granted") return;
      const parsed = await readZoteroFile(handle);
      setSources(parsed);
      localStorage.setItem("fran-zotero-cache", JSON.stringify(parsed));
    } catch { connectZotero(); }
  }, [connectZotero]);

  const setEnsayoActivo = useCallback((id: string | null) => {
    setEnsayoActivoId(id);
    if (id) localStorage.setItem(LS_ACTIVE, id);
    else localStorage.removeItem(LS_ACTIVE);
  }, []);

  useEffect(() => {
    const handleResize = () => { if (window.innerWidth >= 1024) setSidebarOpen(false); };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "e") { e.preventDefault(); setEditMode(p => !p); }
      if (e.key === "n" && !e.ctrlKey && !e.metaKey && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        setShowNewNoteModal(true);
      }
      if (e.key === "Escape") {
        if (tagPanel) { setTagPanel(null); return; }
        setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [tagPanel]);

  const todosLosTags = useMemo(() => {
    const tags = new Set<string>();
    ensayos.forEach((e: any) => e.tags?.forEach((t: string) => tags.add(t)));
    return Array.from(tags).sort();
  }, [ensayos]);

  const ensayosFiltrados = useMemo(() => {
    return ensayos.filter((e: any) => {
      const cumpleTag = tagActivo ? e.tags?.includes(tagActivo) : true;
      const q = searchTerm.toLowerCase();
      const cumpleBusqueda = e.titulo?.toLowerCase().includes(q) || e.contenido?.toLowerCase().includes(q);
      return cumpleTag && cumpleBusqueda;
    });
  }, [ensayos, tagActivo, searchTerm]);

  const pendingUpdatesRef = useRef<Record<string, any>>({});

  const scheduleSave = useCallback((id: string, updates: Record<string, any>) => {
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      const batch = { ...pendingUpdatesRef.current };
      pendingUpdatesRef.current = {};
      setSaveIndicator(saveIndicatorRef.current, "saving");

      const now = new Date().toISOString();
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
  }, [scheduleSave]);

  const crearEnsayo = async (titulo: string) => {
    if (!titulo.trim() || !user) return;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newEnsayo = {
      id,
      titulo: titulo.trim(),
      user_id: user.id,
      contenido: "",
      tags: tagActivo ? [tagActivo] : [],
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await addRow(newEnsayo);
    if (!error) {
      const created = data ?? newEnsayo;
      setEnsayos((prev: any[]) => {
        if (prev.find((e: any) => e.id === created.id)) return prev;
        return [created, ...prev];
      });
      setEnsayoActivo(created.id);
      setEditMode(true);
      setShowNewNoteModal(false);
      setSidebarOpen(false);
    }
  };

  const eliminarEnsayo = async (id: string) => {
    const ok = await confirm({ message: "¿Eliminar esta nota?", danger: true, confirmLabel: "Eliminar" });
    if (!ok) return;
    await deleteRow(id);
    setEnsayos((prev: any[]) => prev.filter((e: any) => e.id !== id));
    if (ensayoActivoId === id) setEnsayoActivo(null);
  };

  const handleEnsayoClick = (id: string) => {
    setEnsayoActivo(id);
    setSidebarOpen(false);
  };

  const ensayoActivo = ensayos.find((e: any) => e.id === ensayoActivoId) ?? null;

  const sidebarProps = {
    ensayos, ensayosFiltrados, todosLosTags, tagActivo, ensayoActivoId,
    searchTerm, sources, zoteroConnected,
    onTagClick: handleTagClick,
    onEnsayoClick: handleEnsayoClick,
    onCrearEnsayo: () => setShowNewNoteModal(true),
    onEliminarEnsayo: eliminarEnsayo,
    onSearchChange: setSearchTerm,
    onConnectZotero: connectZotero,
    onRefreshZotero: refreshZotero,
  };

  return (
    <>
      {/*
        CSS variables injected into the layout.
        These override the light theme defaults for this page only.
        Remove / adapt if your EstudioLayout already handles dark mode.
      */}
      <style>{`
        .ensayos-root {
          --sidebar-bg: #0c0c0c;
          --sidebar-text: #888;
          --editor-bg: #0f0f0f;
          --editor-text: rgba(255,255,255,0.8);
        }
      `}</style>

      <div className="ensayos-root h-full">
        <EstudioLayout
          titulo="knowledge base"
          icono={<PenTool size={12} />}
          colapsadoLabel="notas"
          sidebarOpen={sidebarOpen}
          onSidebarOpenChange={setSidebarOpen}
          isOffline={isOffline}
          footerLeft={`${ensayos.length} notas`}
          sidebarContent={<Sidebar {...sidebarProps} embedded />}
        >
          {/* Save indicator bar */}
          <div
            className="shrink-0 z-10 px-6 py-1.5 flex items-center justify-end"
            style={{
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              background: "rgba(0,0,0,0.2)",
              minHeight: 28,
            }}
          >
            <span
              ref={saveIndicatorRef}
              style={{
                fontSize: 9,
                fontFamily: "var(--font-mono)",
                opacity: 0,
                transition: "opacity 0.3s",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            />
          </div>

          {/* Main content */}
          <main
            className="relative flex-1 overflow-y-auto min-h-0"
            style={{ background: "#0f0f0f" }}
          >
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col gap-3 items-center">
                  <Loader2 size={16} style={{ color: "rgba(255,255,255,0.2)", animation: "spin 1s linear infinite" }} />
                  <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "rgba(255,255,255,0.15)", textTransform: "uppercase", letterSpacing: "0.15em" }}>
                    cargando...
                  </span>
                </div>
              </div>
            ) : (
              <AnimatePresence>
                {ensayoActivo ? (
                  <Editor
                    key={ensayoActivo.id}
                    ensayo={ensayoActivo}
                    ensayos={ensayos}
                    sources={sources}
                    editMode={editMode}
                    onToggleEditMode={() => setEditMode(p => !p)}
                    onUpdateField={actualizarLocal}
                    onSelectEnsayo={handleEnsayoClick}
                  />
                ) : (
                  <EmptyState key="empty" onCrearEnsayo={() => setShowNewNoteModal(true)} />
                )}
              </AnimatePresence>
            )}

            <TagPanel
              tag={tagPanel}
              ensayos={ensayos}
              onClose={handleTagPanelClose}
              onSelectEnsayo={handleEnsayoClick}
              onTagClick={t => setTagPanel(t)}
            />
          </main>
        </EstudioLayout>
      </div>

      <AnimatePresence>
        {showNewNoteModal && (
          <NewNoteModal onConfirm={crearEnsayo} onClose={() => setShowNewNoteModal(false)} />
        )}
      </AnimatePresence>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <ConfirmModal />
    </>
  );
}