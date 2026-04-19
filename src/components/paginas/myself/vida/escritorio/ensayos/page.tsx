"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Loader2, Menu, X, PenTool } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/ui/useToast";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { db } from "@/lib/api/client/db";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";

import Sidebar from "@/components/paginas/myself/vida/escritorio/ensayos/sidebar";
import Editor from "@/components/paginas/myself/vida/escritorio/ensayos/editor";
import EmptyState from "@/components/paginas/myself/vida/escritorio/ensayos/emptyState";
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

// Mutates the DOM directly — no setState, no re-render
function setSaveIndicator(el: HTMLElement | null, status: SaveStatus) {
  if (!el) return;
  if (status === "idle") { el.style.opacity = "0"; return; }
  el.style.opacity = "1";
  el.textContent = status === "saving" ? "Guardando…" : status === "saved" ? "✓ Guardado" : "Error al guardar";
  el.style.color = status === "saving"
    ? "color-mix(in srgb, var(--primary) 30%, transparent)"
    : status === "saved" ? "oklch(0.6 0.15 145)" : "oklch(0.6 0.2 25)";
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
    title:   item.title || "",
    author:  item.author
      ? (Array.isArray(item.author)
          ? item.author.map((a: any) => a.family || a.literal || "").filter(Boolean).join(", ")
          : item.author)
      : (item.creators?.[0]?.lastName || ""),
    year:    item.issued?.["date-parts"]?.[0]?.[0]?.toString()
          || item.date?.substring(0, 4)
          || "",
    citekey: item.id || item["citation-key"] || "",
    journal: item["container-title"] || item.publisher || "",
    url:     item.URL || item.url || "",
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
  const router = useRouter();
  const { toasts, toast, dismiss } = useToast();
  const { confirm, ConfirmModal } = useConfirm();

  const [editMode, setEditMode]         = useState(true);
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);

  const [sources, setSources]           = useState<ZoteroSource[]>([]);
  const [zoteroConnected, setZoteroConnected] = useState(false);
  const [tagActivo, setTagActivo]       = useState<string | null>(null);
  const [tagPanel, setTagPanel]         = useState<string | null>(null);

  // ── useSupabaseData para ensayos ─────────────────────────────────────────
  // La tabla Dexie se llama "notas" pero en Supabase es "ensayos".
  // useSupabaseData lo resuelve automáticamente vía QUERIES_MAP si existe;
  // si no, agrega una entrada en QUERIES_MAP o usa el select directo.
  // Aquí usamos la tabla "notas" (Dexie) pero apuntando a "ensayos" en Supabase
  // a través del hook con el nombre supabase real. Para no romper QUERIES_MAP
  // existente, pasamos directamente "ensayos" — el hook usará supabase.from("ensayos").
  const {
    data: ensayos,
    setData: setEnsayos,
    loading,
    isOffline,
    addRow,
    updateRow,
    deleteRow,
  } = useSupabaseData("ensayos", { order: { campo: "updated_at", asc: false } });

  const handleTagClick      = useCallback((tag: string | null) => setTagActivo(tag), []);
  const handleTagPanelOpen  = useCallback((tag: string) => setTagPanel(tag), []);
  const handleTagPanelClose = useCallback(() => setTagPanel(null), []);

  const [ensayoActivoId, setEnsayoActivoId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(LS_ACTIVE);
  });

  const [searchTerm, setSearchTerm] = useState("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveIndicatorRef = useRef<HTMLSpanElement | null>(null);

  // ── Zotero ───────────────────────────────────────────────────────────────
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
        console.warn("[Zotero] No se pudo leer el archivo:", e);
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

  const pendingSaveRef = useRef(false);
  // Accumulate all pending field changes so a single call saves everything
  const pendingUpdatesRef = useRef<Record<string, any>>({});

  const scheduleSave = useCallback((id: string, updates: Record<string, any>) => {
    // Merge into pending batch — never triggers a re-render
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    pendingSaveRef.current = true;

    saveTimerRef.current = setTimeout(async () => {
      pendingSaveRef.current = false;
      const batch = { ...pendingUpdatesRef.current };
      pendingUpdatesRef.current = {};
      setSaveIndicator(saveIndicatorRef.current, "saving");

      const now = new Date().toISOString();
      const payload = { ...batch, updated_at: now };

      // Actualizar estado local inmediatamente — offline-first
      setEnsayos((prev: any[]) =>
        prev.map((e: any) => e.id === id ? { ...e, ...payload } : e)
      );

      try {
        // updateRow: online → Supabase + Dexie; offline → Dexie + cola
        const { error } = await updateRow(id, payload);
        if (error) throw error;
        setSaveIndicator(saveIndicatorRef.current, "saved");
        setTimeout(() => setSaveIndicator(saveIndicatorRef.current, "idle"), 2000);
      } catch {
        setSaveIndicator(saveIndicatorRef.current, "error");
      }
    }, 1500);
  }, [updateRow, setEnsayos]);

  // actualizarLocal no longer calls setEnsayos on keystrokes — zero re-renders
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

    // addRow guarda en Dexie y encola si es offline
    const { data, error } = await addRow(newEnsayo);
    if (!error) {
      // Si vino de Supabase, usar ese objeto; si fue offline, usar el local
      const created = data ?? newEnsayo;
      setEnsayos((prev: any[]) => {
        // evitar duplicado si addRow ya hizo optimistic update
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

    // deleteRow maneja offline: marca deleted en Dexie y encola
    await deleteRow(id);
    // setEnsayos ya se actualiza dentro de deleteRow (optimistic), pero por
    // si acaso también lo filtramos aquí para mayor seguridad
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
      <EstudioLayout
        titulo="Knowledge Base"
        icono={<PenTool size={12}/>}
        colapsadoLabel="Notas"
        sidebarOpen={sidebarOpen}
        onSidebarOpenChange={setSidebarOpen}
        isOffline={isOffline}
        footerLeft={`${ensayos.length} notas`}
        sidebarContent={<Sidebar {...sidebarProps} embedded />}
      >
        {/* Barra de estado de guardado — DOM-only, zero re-renders */}
        <div className="shrink-0 z-10 border-b border-primary/10 backdrop-blur-md px-4 md:px-6 py-2.5 flex items-center justify-center bg-bg-main/80">
          <span
            ref={saveIndicatorRef}
            className="font-mono text-[9px] uppercase tracking-widest transition-opacity duration-300"
            style={{ opacity: 0 }}
          />
        </div>

        {/* Área principal */}
        <main className="relative flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex flex-col gap-4 animate-pulse">
              <div className="h-10 rounded-xl w-1/3" style={{ background: "color-mix(in srgb, var(--primary) 6%, transparent)" }} />
              <div className="h-px w-full" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
              <div className="h-4 rounded w-2/3" style={{ background: "color-mix(in srgb, var(--primary) 5%, transparent)" }} />
              <div className="h-4 rounded w-1/2" style={{ background: "color-mix(in srgb, var(--primary) 5%, transparent)" }} />
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