"use client";
import React, { useState, useEffect, useCallback } from "react";
import { 
  BookOpen, Files, PenTool, Hash, Save, 
  ChevronLeft, Folder, FileText, 
  ArrowLeft, Plus, Trash2, FolderPlus, UploadCloud, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/api/client/supabase";
import { useAuth } from "@/components/providers/AuthProvider";

interface ZoteroSource {
  title: string;
  author: string;
  year: string;
}

export default function LaboratorioSupabase() {
  const { user } = useAuth() as { user: any };
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Estados de Datos
  const [categorias, setCategorias] = useState<any[]>([]);
  const [ensayos, setEnsayos] = useState<any[]>([]);
  const [sources, setSources] = useState<ZoteroSource[]>([]);
  
  // Navegación
  const [catActivaId, setCatActivaId] = useState<string | null>(null);
  const [ensayoActivoId, setEnsayoActivoId] = useState<string | null>(null);

  // --- CARGA DE DATOS ---
  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    
    const { data: cats } = await supabase.from("categorias").select("*").order("inserted_at");
    const { data: ens } = await supabase.from("ensayos").select("*").order("updated_at");
    
    if (cats) setCategorias(cats);
    if (ens) setEnsayos(ens);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    setMounted(true);
    fetchData();
    const savedSources = localStorage.getItem("fran-zotero-cache");
    if (savedSources) setSources(JSON.parse(savedSources));
  }, [fetchData]);

  // --- GESTIÓN DE CATEGORÍAS ---
  const crearCategoria = async () => {
    const nombre = prompt("Nueva categoría:");
    if (!nombre || !user) return;

    const { data, error } = await supabase
      .from("categorias")
      .insert([{ nombre, user_id: user.id }])
      .select();

    if (data) setCategorias([...categorias, data[0]]);
  };

  const eliminarCategoria = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("¿Borrar categoría y todos sus ensayos?")) return;
    await supabase.from("categorias").delete().eq("id", id);
    setCategorias(categorias.filter(c => c.id !== id));
    if (catActivaId === id) setCatActivaId(null);
  };

  // --- GESTIÓN DE ENSAYOS ---
  const crearEnsayo = async (catId: string) => {
    const titulo = prompt("Título del ensayo:");
    if (!titulo || !user) return;

    const { data } = await supabase
      .from("ensayos")
      .insert([{ titulo, categoria_id: catId, user_id: user.id, contenido: "" }])
      .select();

    if (data) {
      setEnsayos([...ensayos, data[0]]);
      setEnsayoActivoId(data[0].id);
    }
  };

  const guardarEnsayo = async (id: string, titulo: string, contenido: string) => {
    await supabase
      .from("ensayos")
      .update({ titulo, contenido, updated_at: new Date() })
      .eq("id", id);
  };

  // Debounce para no saturar Supabase al escribir
  useEffect(() => {
    const active = ensayos.find(e => e.id === ensayoActivoId);
    if (!active) return;

    const timeout = setTimeout(() => {
      guardarEnsayo(active.id, active.titulo, active.contenido);
    }, 1000);

    return () => clearTimeout(timeout);
  }, [ensayos, ensayoActivoId]);

  const actualizarLocal = (id: string, field: string, value: string) => {
    setEnsayos(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  // --- ZOTERO ---
  const handleZoteroUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const json = JSON.parse(event.target?.result as string);
      const formatted = json.map((item: any) => ({
        title: item.title || "Sin título",
        author: item.author?.[0]?.family || "Anónimo",
        year: item.issued?.["date-parts"]?.[0]?.[0] || "s.f."
      }));
      setSources(formatted);
      localStorage.setItem("fran-zotero-cache", JSON.stringify(formatted));
    };
    reader.readAsText(file);
  };

  if (!mounted || loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-bg-main text-primary">
      <Loader2 className="animate-spin opacity-20" size={40} />
    </div>
  );

  const catActiva = categorias.find(c => c.id === catActivaId);
  const ensayoActivo = ensayos.find(e => e.id === ensayoActivoId);

  return (
    <div className="w-full bg-bg-main min-h-screen text-primary selection:bg-primary/10">
      <nav className="max-w-6xl mx-auto px-6 pt-8 flex justify-between items-center">
        <button onClick={() => window.history.back()} className="flex items-center gap-2 text-[10px] font-black uppercase opacity-40 hover:opacity-100 transition-all">
          <ChevronLeft size={14} /> Volver
        </button>
        <span className="text-[10px] uppercase tracking-[0.3em] font-black opacity-10">Cloud Sync Active</span>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pb-32 pt-16 font-sans">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          
          <aside className="lg:col-span-4 space-y-12">
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 flex items-center gap-3">
                  <Files size={14} /> Biblioteca Nube
                </h3>
                <button onClick={crearCategoria} className="p-2 bg-primary text-white rounded-full shadow-lg hover:scale-110 transition-all">
                  <Plus size={14} />
                </button>
              </div>

              <AnimatePresence mode="wait">
                {!catActivaId ? (
                  <motion.div key="cat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    {categorias.map(cat => (
                      <div key={cat.id} onClick={() => setCatActivaId(cat.id)} className="group p-6 bg-white border border-primary/5 rounded-[2rem] flex items-center justify-between cursor-pointer hover:shadow-xl transition-all">
                        <div className="flex items-center gap-4">
                          <Folder size={18} className="text-accent opacity-40 group-hover:opacity-100" />
                          <span className="text-sm font-serif italic font-bold">{cat.nombre}</span>
                        </div>
                        <button onClick={(e) => eliminarCategoria(e, cat.id)} className="opacity-0 group-hover:opacity-40 hover:text-red-500">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div key="ens" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
                    <button onClick={() => {setCatActivaId(null); setEnsayoActivoId(null);}} className="flex items-center gap-2 text-[10px] font-black uppercase opacity-40 hover:opacity-100 mb-4 transition-all">
                      <ArrowLeft size={12} /> Atrás
                    </button>
                    <div className="flex items-center justify-between px-2 mb-4">
                      <p className="text-[10px] font-black uppercase text-accent italic">{catActiva?.nombre}</p>
                      <button onClick={() => crearEnsayo(catActivaId)} className="text-[9px] font-black uppercase bg-primary/5 px-3 py-1 rounded-full hover:bg-primary hover:text-white">
                        + Ensayo
                      </button>
                    </div>
                    {ensayos.filter(e => e.categoria_id === catActivaId).map(ens => (
                      <button key={ens.id} onClick={() => setEnsayoActivoId(ens.id)} className={`w-full p-5 rounded-[1.5rem] flex items-center justify-between transition-all ${ensayoActivoId === ens.id ? "bg-primary text-white shadow-xl" : "bg-white/60 hover:bg-white border border-primary/5"}`}>
                        <span className="text-xs font-bold uppercase">{ens.titulo}</span>
                        <FileText size={12} className="opacity-20" />
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            <section className="pt-8 border-t border-primary/5">
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 flex items-center gap-3 mb-6">
                <BookOpen size={14} /> Fuentes Zotero
              </h3>
              <div className="bg-white/50 p-6 rounded-[2.5rem] border border-primary/5">
                <label className="block w-full border-2 border-dashed border-primary/10 rounded-2xl p-6 text-center cursor-pointer hover:border-accent transition-all group mb-4">
                  <UploadCloud size={20} className="mx-auto mb-2 opacity-20 group-hover:text-accent" />
                  <span className="text-[9px] font-black uppercase opacity-40">Importar JSON</span>
                  <input type="file" className="hidden" onChange={handleZoteroUpload} accept=".json" />
                </label>
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {sources.map((src, i) => (
                    <div key={i} className="text-[10px] border-b border-primary/5 pb-3 last:border-0 opacity-60 hover:opacity-100">
                      <p className="font-bold leading-tight">{src.title}</p>
                      <p className="opacity-40 mt-1 font-mono uppercase">{src.author} • {src.year}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </aside>

          <section className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {ensayoActivo ? (
                <motion.div key={ensayoActivo.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="bg-white p-10 md:p-20 shadow-[0_40px_100px_rgba(0,0,0,0.04)] rounded-[4rem] min-h-[850px] border border-primary/5 relative">
                    <input 
                      type="text" 
                      value={ensayoActivo.titulo}
                      onChange={(e) => actualizarLocal(ensayoActivo.id, "titulo", e.target.value)}
                      className="w-full text-4xl md:text-6xl font-serif italic mb-12 outline-none bg-transparent text-primary border-b border-primary/5 pb-8 focus:border-accent transition-all"
                    />
                    <textarea 
                      value={ensayoActivo.contenido}
                      onChange={(e) => actualizarLocal(ensayoActivo.id, "contenido", e.target.value)}
                      className="w-full h-[600px] text-xl leading-[1.8] font-light outline-none resize-none bg-transparent custom-scrollbar"
                      placeholder="Escribe, Franilover..."
                    />
                    <footer className="mt-16 pt-8 border-t border-primary/5 flex justify-between items-center text-[9px] font-black uppercase tracking-[0.4em] opacity-30">
                      <span>{ensayoActivo.contenido?.split(/\s+/).filter(Boolean).length || 0} palabras</span>
                      <div className="flex items-center gap-2"><Save size={12}/> Auto-sync on</div>
                    </footer>
                  </div>
                </motion.div>
              ) : (
                <div className="h-[850px] flex flex-col items-center justify-center text-center border-2 border-dashed border-primary/10 rounded-[5rem] opacity-10">
                  <PenTool size={60} strokeWidth={1} className="mb-6 rotate-12" />
                  <p className="text-sm font-serif italic tracking-[0.3em]">"Selecciona un ensayo para comenzar."</p>
                </div>
              )}
            </AnimatePresence>
          </section>

        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(var(--primary-rgb), 0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
}