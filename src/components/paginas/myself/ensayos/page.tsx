"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ChevronLeft, Loader2, Menu, X, PenTool } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/lib/api/client/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { db } from "@/lib/api/client/db";

import Sidebar from "./components/Sidebar";
import Editor from "./components/Editor";
import EmptyState from "./components/EmptyState";
import NewNoteModal from "./components/NewNoteModal";
import { TagPanel } from "./components/TagPanel";
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
  const [loading, setLoading]           = useState(false);
  const [editMode, setEditMode]         = useState(true);
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);

  const [ensayos, setEnsayos]   = useState<any[]>([]);
  const [sources, setSources]   = useState<ZoteroSource[]>([]);
  const [zoteroConnected, setZoteroConnected] = useState(false);
  const [tagActivo, setTagActivo] = useState<string | null>(null);
  const [tagPanel, setTagPanel]   = useState<string | null>(null);

  const handleTagClick      = useCallback((tag: string | null) => setTagActivo(tag), []);
  const handleTagPanelOpen  = useCallback((tag: string) => setTagPanel(tag), []);
  const handleTagPanelClose = useCallback(() => setTagPanel(null), []);

  const [ensayoActivoId, setEnsayoActivoId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(LS_ACTIVE);
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  
  const fetchData = useCallback(async () => {
    if (!user) return;
    setEnsayos((prev) => { if (prev.length === 0) setLoading(true); return prev; });
    const { data: ens } = await supabase
      .from("ensayos")
      .select("*")
      .order("updated_at", { ascending: false });
    if (ens) setEnsayos(ens);
    setLoading(false);
  }, [user]);

  
  useEffect(() => {
    fetchData();

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
  }, [fetchData]);

  
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
        } catch { alert("Error al leer el archivo Zotero"); }
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
    ensayos.forEach(e => e.tags?.forEach((t: string) => tags.add(t)));
    return Array.from(tags).sort();
  }, [ensayos]);

  const ensayosFiltrados = useMemo(() => {
    return ensayos.filter(e => {
      const cumpleTag = tagActivo ? e.tags?.includes(tagActivo) : true;
      const q = searchTerm.toLowerCase();
      const cumpleBusqueda = e.titulo?.toLowerCase().includes(q) || e.contenido?.toLowerCase().includes(q);
      return cumpleTag && cumpleBusqueda;
    });
  }, [ensayos, tagActivo, searchTerm]);

  const scheduleSave = useCallback((id: string, updates: Record<string, any>) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("saving");
    saveTimerRef.current = setTimeout(async () => {
      try {
        await supabase.from("ensayos").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch { setSaveStatus("error"); }
    }, 1500);
  }, []);

  const actualizarLocal = useCallback((id: string, field: string, value: any) => {
    setEnsayos(prev => prev.map(e =>
      e.id === id ? { ...e, [field]: value, updated_at: new Date().toISOString() } : e
    ));
    scheduleSave(id, { [field]: value });
  }, [scheduleSave]);

  const crearEnsayo = async (titulo: string) => {
    if (!titulo.trim() || !user) return;
    const { data } = await supabase.from("ensayos").insert([{
      titulo: titulo.trim(), user_id: user.id, contenido: "",
      tags: tagActivo ? [tagActivo] : [],
    }]).select();
    if (data) {
      setEnsayos(prev => [data[0], ...prev]);
      setEnsayoActivo(data[0].id);
      setEditMode(true);
      setShowNewNoteModal(false);
      setSidebarOpen(false);
    }
  };

  const eliminarEnsayo = async (id: string) => {
    if (!confirm("¿Eliminar esta nota?")) return;
    await supabase.from("ensayos").delete().eq("id", id);
    setEnsayos(prev => prev.filter(e => e.id !== id));
    if (ensayoActivoId === id) setEnsayoActivo(null);
  };

  const handleEnsayoClick = (id: string) => {
    setEnsayoActivo(id);
    setSidebarOpen(false);
  };

  const ensayoActivo = ensayos.find(e => e.id === ensayoActivoId) ?? null;

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
        isOffline={false}
        footerLeft={`${ensayos.length} notas`}
        sidebarContent={<Sidebar {...sidebarProps} embedded />}
      >
        {}
        <div className="shrink-0 z-10 border-b border-primary/10 backdrop-blur-md px-4 md:px-6 py-2.5 flex items-center justify-between bg-bg-main/80">
          <button onClick={() => window.history.back()}
            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 hover:text-primary transition-colors"
          >
            <ChevronLeft size={13} /> Grafos
          </button>
          <AnimatePresence mode="wait">
            {saveStatus !== "idle" && (
              <motion.span key={saveStatus} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="font-mono text-[9px] uppercase tracking-widest"
                style={{ color: saveStatus === "saving" ? "color-mix(in srgb, var(--primary) 30%, transparent)" : saveStatus === "saved" ? "oklch(0.6 0.15 145)" : "oklch(0.6 0.2 25)" }}
              >
                {saveStatus === "saving" ? "Guardando…" : saveStatus === "saved" ? "✓ Guardado" : "Error"}
              </motion.span>
            )}
          </AnimatePresence>
          <span className="font-mono text-[9px] uppercase tracking-[0.35em] text-primary/20">
            Knowledge Base
          </span>
        </div>

        {}
        <main className="relative flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex flex-col gap-4 animate-pulse">
              <div className="h-10 rounded-xl w-1/3" style={{ background: "color-mix(in srgb, var(--primary) 6%, transparent)" }} />
              <div className="h-px w-full" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
              <div className="h-4 rounded w-2/3" style={{ background: "color-mix(in srgb, var(--primary) 5%, transparent)" }} />
              <div className="h-4 rounded w-1/2" style={{ background: "color-mix(in srgb, var(--primary) 5%, transparent)" }} />
            </div>
          ) : (
            <AnimatePresence mode="wait">
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
    </>
  );
}