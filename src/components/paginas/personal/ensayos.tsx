"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  BookOpen, Files, PenTool, Hash, Save, 
  ChevronLeft, FileText, 
  Plus, Trash2, UploadCloud, Loader2, Tag, Search,
  Eye, Edit3
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/api/queries/client/supabase";
import { useAuth } from "@/components/providers/AuthProvider";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ZoteroSource {
  title: string;
  author: string;
  year: string;
}

export default function LaboratorioObsidian() {
  const { user } = useAuth() as { user: any };
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(true);
  
  const [ensayos, setEnsayos] = useState<any[]>([]);
  const [sources, setSources] = useState<ZoteroSource[]>([]);
  const [tagActivo, setTagActivo] = useState<string | null>(null);
  const [ensayoActivoId, setEnsayoActivoId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // --- CARGA DE DATOS ---
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
    const savedSources = localStorage.getItem("fran-zotero-cache");
    if (savedSources) setSources(JSON.parse(savedSources));
  }, [fetchData]);

  // --- SHORTCUTS (VIM STYLE) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        setEditMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- LOGICA DE TAGS ---
  const todosLosTags = useMemo(() => {
    const tags = new Set<string>();
    ensayos.forEach(e => {
      if (e.tags && Array.isArray(e.tags)) {
        e.tags.forEach((t: string) => tags.add(t));
      }
    });
    return Array.from(tags).sort();
  }, [ensayos]);

  const ensayosFiltrados = useMemo(() => {
    return ensayos.filter(e => {
      const cumpleTag = tagActivo ? e.tags?.includes(tagActivo) : true;
      const cumpleBusqueda = e.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             e.contenido.toLowerCase().includes(searchTerm.toLowerCase());
      return cumpleTag && cumpleBusqueda;
    });
  }, [ensayos, tagActivo, searchTerm]);

  // --- GESTION DE NOTAS ---
  const crearEnsayo = async () => {
    const titulo = prompt("Título del nuevo pensamiento:");
    if (!titulo || !user) return;
    const { data } = await supabase
      .from("ensayos")
      .insert([{ 
        titulo, 
        user_id: user.id, 
        contenido: "", 
        tags: tagActivo ? [tagActivo] : [] 
      }])
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
    setEnsayos(ensayos.filter(e => e.id !== id));
    if (ensayoActivoId === id) setEnsayoActivoId(null);
  };

  const guardarEnsayo = async (id: string, titulo: string, contenido: string, tags: string[]) => {
    await supabase
      .from("ensayos")
      .update({ titulo, contenido, tags, updated_at: new Date() })
      .eq("id", id);
  };

  useEffect(() => {
    const active = ensayos.find(e => e.id === ensayoActivoId);
    if (!active) return;
    const timeout = setTimeout(() => {
      guardarEnsayo(active.id, active.titulo, active.contenido, active.tags || []);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [ensayos, ensayoActivoId]);

  const actualizarLocal = (id: string, field: string, value: any) => {
    setEnsayos(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const handleZoteroUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const formatted = json.map((item: any) => ({
          title: item.title || "Sin título",
          author: item.author?.[0]?.family || "Anónimo",
          year: item.issued?.["date-parts"]?.[0]?.[0] || "s.f."
        }));
        setSources(formatted);
        localStorage.setItem("fran-zotero-cache", JSON.stringify(formatted));
      } catch (err) { alert("Error en JSON"); }
    };
    reader.readAsText(file);
  };

  if (!mounted || loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-bg-main text-primary">
      <Loader2 className="animate-spin opacity-20" size={40} />
    </div>
  );

  const ensayoActivo = ensayos.find(e => e.id === ensayoActivoId);

  return (
    <div className="w-full bg-bg-main min-h-screen text-primary selection:bg-primary/10">
      <nav className="max-w-6xl mx-auto px-6 pt-8 flex justify-between items-center">
        <button onClick={() => window.history.back()} className="flex items-center gap-2 text-[10px] font-black uppercase opacity-40 hover:opacity-100 transition-all">
          <ChevronLeft size={14} /> Grafos
        </button>
        <span className="text-[10px] uppercase tracking-[0.3em] font-black opacity-10">Knowledge Base V2</span>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pb-32 pt-16 font-sans">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          
          {/* SIDEBAR */}
          <aside className="lg:col-span-4 space-y-12">
            <section className="relative">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20" size={14} />
               <input 
                type="text"
                placeholder="BUSCAR..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-primary/5 rounded-full py-3 pl-12 pr-4 text-[10px] font-black uppercase outline-none focus:border-accent"
               />
            </section>

            <section className="space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 flex items-center gap-3">
                <Hash size={14} /> Etiquetas
              </h3>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setTagActivo(null)} className={`px-4 py-2 rounded-full text-[9px] font-black uppercase ${!tagActivo ? 'bg-primary text-white' : 'bg-primary/5 opacity-40'}`}>Todos</button>
                {todosLosTags.map(tag => (
                  <button key={tag} onClick={() => setTagActivo(tag === tagActivo ? null : tag)} className={`px-4 py-2 rounded-full text-[9px] font-black uppercase ${tagActivo === tag ? 'bg-accent text-white' : 'bg-primary/5 opacity-40'}`}>#{tag}</button>
                ))}
              </div>

              <div className="pt-6 border-t border-primary/5">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 flex items-center gap-3"><FileText size={14} /> Notas</h3>
                  <button onClick={crearEnsayo} className="p-2 bg-primary text-white rounded-full hover:scale-110 transition-all"><Plus size={14} /></button>
                </div>
                <div className="space-y-2">
                  {ensayosFiltrados.map(ens => (
                    <div key={ens.id} onClick={() => setEnsayoActivoId(ens.id)} className={`group p-4 rounded-2xl cursor-pointer border ${ensayoActivoId === ens.id ? "bg-white border-accent shadow-lg" : "bg-transparent border-transparent hover:bg-white/50"}`}>
                      <div className="flex justify-between items-start">
                        <span className={`text-xs font-bold uppercase ${ensayoActivoId === ens.id ? "text-accent" : "opacity-60"}`}>{ens.titulo || "Sin título"}</span>
                        <button onClick={(e) => { e.stopPropagation(); eliminarEnsayo(ens.id); }} className="opacity-0 group-hover:opacity-40 hover:text-red-500"><Trash2 size={10} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="pt-8 border-t border-primary/5">
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 flex items-center gap-3 mb-6"><BookOpen size={14} /> Bibliografía</h3>
              <div className="bg-white/50 p-6 rounded-[2.5rem] border border-primary/5">
                <label className="block w-full border-2 border-dashed border-primary/10 rounded-2xl p-6 text-center cursor-pointer hover:border-accent">
                  <UploadCloud size={20} className="mx-auto mb-2 opacity-20" />
                  <span className="text-[9px] font-black uppercase opacity-40">Sync Zotero</span>
                  <input type="file" className="hidden" onChange={handleZoteroUpload} accept=".json" />
                </label>
                <div className="space-y-4 max-h-[200px] overflow-y-auto mt-4 custom-scrollbar">
                  {sources.map((src, i) => (
                    <div key={i} className="text-[10px] border-b border-primary/5 pb-3 opacity-60">
                      <p className="font-bold">{src.title}</p>
                      <p className="opacity-40 font-mono">{src.author} • {src.year}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </aside>

          {/* EDITOR / VIEWER */}
          <section className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {ensayoActivo ? (
                <motion.div key={ensayoActivo.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="bg-white p-10 md:p-20 shadow-xl rounded-[4rem] min-h-[850px] border border-primary/5 relative">
                    
                    <button 
                      onClick={() => setEditMode(!editMode)}
                      className="absolute top-10 right-10 p-4 bg-primary/5 rounded-full hover:bg-accent hover:text-white transition-all z-10"
                    >
                      {editMode ? <Eye size={18} /> : <Edit3 size={18} />}
                    </button>

                    <div className="flex items-center gap-3 mb-8">
                      <Tag size={14} className="opacity-20" />
                      <input 
                        type="text"
                        value={ensayoActivo.tags?.join(", ") || ""}
                        onChange={(e) => {
                          const newTags = e.target.value.split(",").map(t => t.trim().toLowerCase()).filter(t => t !== "");
                          actualizarLocal(ensayoActivo.id, "tags", newTags);
                        }}
                        className="text-[10px] font-black uppercase tracking-widest outline-none bg-transparent w-full opacity-40"
                        placeholder="TAGS..."
                      />
                    </div>

                    <input 
                      type="text" 
                      value={ensayoActivo.titulo}
                      onChange={(e) => actualizarLocal(ensayoActivo.id, "titulo", e.target.value)}
                      className="w-full text-4xl md:text-6xl font-serif italic mb-12 outline-none bg-transparent border-b border-primary/5 pb-8 focus:border-accent"
                    />
                    
                    <div className="min-h-[600px]">
                      {editMode ? (
                        <textarea 
                          value={ensayoActivo.contenido}
                          onChange={(e) => actualizarLocal(ensayoActivo.id, "contenido", e.target.value)}
                          className="w-full h-[600px] text-xl leading-[1.8] font-light outline-none resize-none bg-transparent custom-scrollbar"
                          placeholder="Escribe en Markdown..."
                        />
                      ) : (
                        <div className="custom-markdown">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {ensayoActivo.contenido || "*Empieza a escribir...*"}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>

                    <footer className="mt-16 pt-8 border-t border-primary/5 flex justify-between items-center text-[9px] font-black uppercase opacity-30">
                      <span>{ensayoActivo.contenido?.length || 0} caracteres</span>
                      <div className="flex items-center gap-2"><Save size={12}/> {new Date(ensayoActivo.updated_at).toLocaleTimeString()}</div>
                    </footer>
                  </div>
                </motion.div>
              ) : (
                <div className="h-[850px] flex flex-col items-center justify-center text-center border-2 border-dashed border-primary/10 rounded-[5rem] opacity-10">
                  <PenTool size={60} className="mb-6 rotate-12" />
                  <p className="text-sm font-serif italic tracking-[0.3em]">"Selecciona una idea para expandirla."</p>
                </div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        
        .custom-markdown h1 { font-size: 3rem; font-family: serif; font-style: italic; margin-bottom: 2rem; color: #1a1a1a; }
        .custom-markdown h2 { font-size: 2rem; font-weight: 700; margin-top: 2.5rem; margin-bottom: 1rem; }
        .custom-markdown p { font-size: 1.2rem; line-height: 1.8; margin-bottom: 1.5rem; color: #333; }
        .custom-markdown strong { font-weight: 800; color: var(--accent); }
        .custom-markdown ul { list-style: disc; padding-left: 1.5rem; margin-bottom: 1.5rem; }
        .custom-markdown li { margin-bottom: 0.5rem; }
        .custom-markdown blockquote { border-left: 4px solid #eee; padding-left: 1.5rem; font-style: italic; margin: 2rem 0; color: #666; }
        .custom-markdown code { background: #f5f5f5; padding: 0.2rem 0.4rem; border-radius: 4px; font-family: monospace; }
      `}</style>
    </div>
  );
}