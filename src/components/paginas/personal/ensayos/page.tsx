"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/api/client/supabase";
import { useAuth } from "@/components/providers/AuthProvider";

import Sidebar from "./components/Sidebar";
import Editor from "./components/Editor";
import EmptyState from "./components/EmptyState";

interface ZoteroSource {
  title: string;
  author: string;
  year: string;
}

export default function Ensayos() {
  const { user } = useAuth() as { user: any };
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(true);

  const [ensayos, setEnsayos] = useState<any[]>([]);
  const [sources, setSources] = useState<ZoteroSource[]>([]);
  const [tagActivo, setTagActivo] = useState<string | null>(null);
  const [ensayoActivoId, setEnsayoActivoId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // --- DATA ---
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

  // Shortcut Ctrl/Cmd+E: toggle edit/preview
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "e") {
        e.preventDefault();
        setEditMode((p) => !p);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // --- TAGS ---
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

  // --- CRUD ---
  const crearEnsayo = async () => {
    const titulo = prompt("Título del nuevo pensamiento:");
    if (!titulo || !user) return;
    const { data } = await supabase
      .from("ensayos")
      .insert([{ titulo, user_id: user.id, contenido: "", tags: tagActivo ? [tagActivo] : [] }])
      .select();
    if (data) {
      setEnsayos([data[0], ...ensayos]);
      setEnsayoActivoId(data[0].id);
      setEditMode(true);
    }
  };

  const eliminarEnsayo = async (id: string) => {
    if (!confirm("¿Eliminar esta nota?")) return;
    await supabase.from("ensayos").delete().eq("id", id);
    setEnsayos(ensayos.filter((e) => e.id !== id));
    if (ensayoActivoId === id) setEnsayoActivoId(null);
  };

  const guardarEnsayo = useCallback(
    async (id: string, titulo: string, contenido: string, tags: string[]) => {
      await supabase
        .from("ensayos")
        .update({ titulo, contenido, tags, updated_at: new Date() })
        .eq("id", id);
    },
    []
  );

  // Autosave debounce 1s
  useEffect(() => {
    const active = ensayos.find((e) => e.id === ensayoActivoId);
    if (!active) return;
    const t = setTimeout(
      () => guardarEnsayo(active.id, active.titulo, active.contenido, active.tags || []),
      1000
    );
    return () => clearTimeout(t);
  }, [ensayos, ensayoActivoId, guardarEnsayo]);

  const actualizarLocal = (id: string, field: string, value: any) =>
    setEnsayos((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));

  const handleZoteroUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        const formatted = json.map((item: any) => ({
          title: item.title || "Sin título",
          author: item.author?.[0]?.family || "Anónimo",
          year: item.issued?.["date-parts"]?.[0]?.[0] || "s.f.",
        }));
        setSources(formatted);
        localStorage.setItem("fran-zotero-cache", JSON.stringify(formatted));
      } catch {
        alert("Error al leer el JSON de Zotero");
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
    <div className="min-h-screen bg-bg-main text-primary selection:bg-accent/20"
         style={{ background: "linear-gradient(135deg, #ede6f0 0%, #e8e0ed 100%)" }}>

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-primary/10
                      backdrop-blur-md px-6 py-4
                      flex items-center justify-between max-w-screen-2xl mx-auto"
           style={{ background: "rgba(237, 230, 240, 0.85)" }}>
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase
                     tracking-[0.2em] text-primary/40 hover:text-primary transition-colors"
        >
          <ChevronLeft size={13} /> Grafos
        </button>
        <span className="font-mono text-[9px] uppercase tracking-[0.35em] text-primary/20">
          Knowledge Base
        </span>
        <div className="w-20" />
      </nav>

      {/* Body: sidebar + main */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] max-w-screen-2xl mx-auto
                      min-h-[calc(100vh-57px)]">

        <Sidebar
          ensayos={ensayos}
          ensayosFiltrados={ensayosFiltrados}
          todosLosTags={todosLosTags}
          tagActivo={tagActivo}
          ensayoActivoId={ensayoActivoId}
          searchTerm={searchTerm}
          sources={sources}
          onTagClick={setTagActivo}
          onEnsayoClick={setEnsayoActivoId}
          onCrearEnsayo={crearEnsayo}
          onEliminarEnsayo={eliminarEnsayo}
          onSearchChange={setSearchTerm}
          onZoteroUpload={handleZoteroUpload}
        />

        <main className="p-8 lg:p-12">
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
              <EmptyState key="empty" />
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Markdown prose styles — uses your CSS vars */}
      <style jsx global>{`
        .sidebar-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: ui-monospace, monospace;
          font-size: 9px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--primary);
          opacity: 0.35;
        }

        .note-row {
          padding: 10px 12px;
          border-radius: 14px;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.15s ease;
        }
        .note-row:hover { background: rgba(103, 85, 109, 0.06); }
        .note-row--active {
          background-color: rgba(240, 235, 244, 0.6);
          border-color: rgba(103, 85, 109, 0.25);
          box-shadow: 0 2px 12px rgba(103, 85, 109, 0.12);
        }

        /* tag-chip styles moved to inline styles in Sidebar.tsx */

        /* Markdown preview */
        .prose-fran h1 {
          font-family: Georgia, serif;
          font-size: 2.4rem;
          font-style: italic;
          color: var(--primary);
          margin-bottom: 1.2rem;
          line-height: 1.2;
        }
        .prose-fran h2 {
          font-family: Georgia, serif;
          font-size: 1.6rem;
          font-style: italic;
          color: var(--primary);
          margin-top: 2rem;
          margin-bottom: 0.7rem;
        }
        .prose-fran h3 {
          font-size: 0.85rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(103, 85, 109, 0.6);
          margin-top: 1.8rem;
          margin-bottom: 0.4rem;
        }
        .prose-fran p {
          font-size: 16px;
          line-height: 1.85;
          font-weight: 300;
          color: var(--primary);
          margin-bottom: 1.2rem;
          opacity: 0.85;
        }
        .prose-fran strong {
          font-weight: 700;
          color: var(--accent);
          opacity: 1;
        }
        .prose-fran em {
          font-style: italic;
          color: var(--primary);
          opacity: 0.7;
        }
        .prose-fran ul, .prose-fran ol {
          padding-left: 1.6rem;
          margin-bottom: 1.2rem;
        }
        .prose-fran li {
          font-size: 15px;
          line-height: 1.75;
          font-weight: 300;
          color: var(--primary);
          opacity: 0.8;
          margin-bottom: 0.3rem;
        }
        .prose-fran blockquote {
          border-left: 3px solid var(--accent);
          padding: 12px 20px;
          margin: 1.8rem 0;
          background: rgba(190, 151, 209, 0.08);
          border-radius: 0 12px 12px 0;
        }
        .prose-fran blockquote p {
          font-style: italic;
          opacity: 0.7;
          margin-bottom: 0;
        }
        .prose-fran code {
          font-family: ui-monospace, monospace;
          font-size: 12px;
          background: rgba(103, 85, 109, 0.08);
          border: 1px solid rgba(103, 85, 109, 0.12);
          padding: 2px 6px;
          border-radius: 5px;
          color: var(--accent);
        }
        .prose-fran pre {
          background: var(--primary);
          color: var(--white-custom);
          padding: 18px 22px;
          border-radius: 16px;
          margin: 1.4rem 0;
          overflow-x: auto;
        }
        .prose-fran pre code {
          background: none;
          border: none;
          padding: 0;
          color: inherit;
          font-size: 13px;
        }
        .prose-fran a {
          color: var(--accent);
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .prose-fran hr {
          border: none;
          border-top: 1px solid rgba(103, 85, 109, 0.12);
          margin: 2rem 0;
        }

        /* Nav background — tinted pastel instead of raw bg-main */
        nav.top-nav-tinted {
          background: rgba(237, 230, 240, 0.85);
        }

        /* Subtle tag-chip border using bg-menu color */
        .tag-chip {
          border-color: rgba(103, 85, 109, 0.2);
        }
      `}</style>
    </div>
  );
}