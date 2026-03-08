"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ChevronLeft, Loader2, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/lib/api/client/supabase";
import { useAuth } from "@/app/providers/AuthProvider";

import Sidebar from "./components/Sidebar";
import Editor from "./components/Editor";
import EmptyState from "./components/EmptyState";
import NewNoteModal from "./components/NewNoteModal";

interface ZoteroSource {
  title: string;
  author: string;
  year: string;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function Ensayos() {
  const { user } = useAuth() as { user: any };
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);

  const [ensayos, setEnsayos] = useState<any[]>([]);
  const [sources, setSources] = useState<ZoteroSource[]>([]);
  const [tagActivo, setTagActivo] = useState<string | null>(null);
  const handleTagClick = useCallback((tag: string | null) => setTagActivo(tag), []);
  const [ensayoActivoId, setEnsayoActivoId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  // Autosave: debounce timer ref
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: ens } = await supabase
      .from("ensayos")
      .select("*")
      .order("updated_at", { ascending: false });
    if (ens) setEnsayos(ens);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    setMounted(true);
    fetchData();
    const saved = localStorage.getItem("fran-zotero-cache");
    if (saved) setSources(JSON.parse(saved));
  }, [fetchData]);

  // Close sidebar on desktop resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Keyboard shortcut: Ctrl+E toggle edit mode
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "e") {
        e.preventDefault();
        setEditMode((p) => !p);
      }
      // Escape closes sidebar on mobile
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const todosLosTags = useMemo(() => {
    const tags = new Set<string>();
    ensayos.forEach((e) => e.tags?.forEach((t: string) => tags.add(t)));
    return Array.from(tags).sort();
  }, [ensayos]);

  const ensayosFiltrados = useMemo(() => {
    return ensayos.filter((e) => {
      const cumpleTag = tagActivo ? e.tags?.includes(tagActivo) : true;
      const q = searchTerm.toLowerCase();
      const cumpleBusqueda =
        e.titulo?.toLowerCase().includes(q) || e.contenido?.toLowerCase().includes(q);
      return cumpleTag && cumpleBusqueda;
    });
  }, [ensayos, tagActivo, searchTerm]);

  // Autosave to Supabase with debounce
  const scheduleSave = useCallback((id: string, updates: Record<string, any>) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("saving");

    saveTimerRef.current = setTimeout(async () => {
      try {
        await supabase
          .from("ensayos")
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq("id", id);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch {
        setSaveStatus("error");
      }
    }, 1500);
  }, []);

  const actualizarLocal = useCallback(
    (id: string, field: string, value: any) => {
      setEnsayos((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, [field]: value, updated_at: new Date().toISOString() } : e
        )
      );
      scheduleSave(id, { [field]: value });
    },
    [scheduleSave]
  );

  const crearEnsayo = async (titulo: string) => {
    if (!titulo.trim() || !user) return;
    const { data } = await supabase
      .from("ensayos")
      .insert([
        {
          titulo: titulo.trim(),
          user_id: user.id,
          contenido: "",
          tags: tagActivo ? [tagActivo] : [],
        },
      ])
      .select();
    if (data) {
      setEnsayos((prev) => [data[0], ...prev]);
      setEnsayoActivoId(data[0].id);
      setEditMode(true);
      setShowNewNoteModal(false);
      setSidebarOpen(false); // close sidebar on mobile after selecting
    }
  };

  const eliminarEnsayo = async (id: string) => {
    if (!confirm("¿Eliminar esta nota?")) return;
    await supabase.from("ensayos").delete().eq("id", id);
    setEnsayos((prev) => prev.filter((e) => e.id !== id));
    if (ensayoActivoId === id) setEnsayoActivoId(null);
  };

  const handleEnsayoClick = (id: string) => {
    setEnsayoActivoId(id);
    setSidebarOpen(false); // auto-close sidebar on mobile when selecting a note
  };

  const handleZoteroUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        const parsed: ZoteroSource[] = json.map((item: any) => ({
          title: item.title || "",
          author: item.author || item.creators?.[0]?.lastName || "",
          year: item.date?.substring(0, 4) || "",
        }));
        setSources(parsed);
        localStorage.setItem("fran-zotero-cache", JSON.stringify(parsed));
      } catch {
        alert("Error al leer el archivo Zotero");
      }
    };
    reader.readAsText(file);
  };

  if (!mounted || loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-bg-main">
        <Loader2 className="animate-spin text-primary/20" size={36} />
      </div>
    );
  }

  const ensayoActivo = ensayos.find((e) => e.id === ensayoActivoId);

  return (
    <div className="min-h-screen bg-bg-main text-primary selection:bg-accent/20">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-primary/10 backdrop-blur-md px-4 md:px-6 py-3 flex items-center justify-between max-w-screen-2xl mx-auto bg-bg-main/80">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 hover:text-primary transition-colors"
        >
          <ChevronLeft size={13} /> Grafos
        </button>

        <span className="font-mono text-[9px] uppercase tracking-[0.35em] text-primary/20 hidden sm:block">
          Knowledge Base
        </span>

        <div className="flex items-center gap-3">
          {/* Save status indicator */}
          <AnimatePresence mode="wait">
            {saveStatus !== "idle" && (
              <motion.span
                key={saveStatus}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="font-mono text-[9px] uppercase tracking-widest"
                style={{
                  color:
                    saveStatus === "saving"
                      ? "color-mix(in srgb, var(--primary) 30%, transparent)"
                      : saveStatus === "saved"
                      ? "oklch(0.6 0.15 145)"
                      : "oklch(0.6 0.2 25)",
                }}
              >
                {saveStatus === "saving" ? "Guardando…" : saveStatus === "saved" ? "✓ Guardado" : "Error"}
              </motion.span>
            )}
          </AnimatePresence>

          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setSidebarOpen((p) => !p)}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-md transition-colors"
            style={{
              background: sidebarOpen
                ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                : "transparent",
              color: "var(--primary)",
            }}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
          <div className="w-4 hidden lg:block" />
        </div>
      </nav>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 lg:hidden"
              style={{ background: "rgba(0,0,0,0.4)" }}
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed top-0 left-0 z-40 h-full w-75 lg:hidden"
              style={{ background: "var(--bg-menu, var(--bg-main))" }}
            >
              <div className="h-full pt-14">
                <Sidebar
                  ensayos={ensayos}
                  ensayosFiltrados={ensayosFiltrados}
                  todosLosTags={todosLosTags}
                  tagActivo={tagActivo}
                  ensayoActivoId={ensayoActivoId}
                  searchTerm={searchTerm}
                  sources={sources}
                  onTagClick={handleTagClick}
                  onEnsayoClick={handleEnsayoClick}
                  onCrearEnsayo={() => setShowNewNoteModal(true)}
                  onEliminarEnsayo={eliminarEnsayo}
                  onSearchChange={setSearchTerm}
                  onZoteroUpload={handleZoteroUpload}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] max-w-screen-2xl mx-auto min-h-[calc(100vh-57px)]">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <Sidebar
            ensayos={ensayos}
            ensayosFiltrados={ensayosFiltrados}
            todosLosTags={todosLosTags}
            tagActivo={tagActivo}
            ensayoActivoId={ensayoActivoId}
            searchTerm={searchTerm}
            sources={sources}
            onTagClick={handleTagClick}
            onEnsayoClick={handleEnsayoClick}
            onCrearEnsayo={() => setShowNewNoteModal(true)}
            onEliminarEnsayo={eliminarEnsayo}
            onSearchChange={setSearchTerm}
            onZoteroUpload={handleZoteroUpload}
          />
        </div>

        <main className="p-4 md:p-8 lg:p-12">
          <AnimatePresence mode="wait">
            {ensayoActivo ? (
              <Editor
                key={ensayoActivo.id}
                ensayo={ensayoActivo}
                editMode={editMode}
                onToggleEditMode={() => setEditMode((p) => !p)}
                onUpdateField={actualizarLocal}
              />
            ) : (
              <EmptyState key="empty" onCrearEnsayo={() => setShowNewNoteModal(true)} />
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* New Note Modal */}
      <AnimatePresence>
        {showNewNoteModal && (
          <NewNoteModal
            onConfirm={crearEnsayo}
            onClose={() => setShowNewNoteModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}