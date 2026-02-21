"use client";
import React, { useState, useEffect } from "react";
import { 
  BookOpen, Files, PenTool, Hash, Save, 
  ExternalLink, ChevronLeft, Folder, FileText, 
  ArrowLeft, Plus, Trash2, FolderPlus, Edit3,
  UploadCloud // Icono para Zotero
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ZoteroSource {
  title: string;
  author: string;
  year: string;
}

interface Ensayo {
  id: string;
  titulo: string;
  contenido: string;
}

interface Categoria {
  id: string;
  nombre: string;
  ensayos: Ensayo[];
}

export default function LaboratorioCompleto() {
  const [mounted, setMounted] = useState(false);
  const [biblioteca, setBiblioteca] = useState<Categoria[]>([]);
  const [catActivaId, setCatActivaId] = useState<string | null>(null);
  const [ensayoActivoId, setEnsayoActivoId] = useState<string | null>(null);
  const [sources, setSources] = useState<ZoteroSource[]>([]);

  // 1. Cargar datos al iniciar
  useEffect(() => {
    const savedData = localStorage.getItem("fran-biblioteca-pro");
    const savedSources = localStorage.getItem("fran-zotero-cache");
    if (savedData) setBiblioteca(JSON.parse(savedData));
    if (savedSources) setSources(JSON.parse(savedSources));
    setMounted(true);
  }, []);

  // 2. Persistencia
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("fran-biblioteca-pro", JSON.stringify(biblioteca));
      localStorage.setItem("fran-zotero-cache", JSON.stringify(sources));
    }
  }, [biblioteca, sources, mounted]);

  // --- GESTIÓN DE ZOTERO ---
  const handleZoteroUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const formatted = json.map((item: any) => ({
          title: item.title || "Sin título",
          author: item.author?.[0]?.family || item.author?.[0]?.name || "Anónimo",
          year: item.issued?.["date-parts"]?.[0]?.[0] || "s.f."
        }));
        setSources(formatted);
      } catch (err) {
        alert("Error al procesar el JSON de Zotero.");
      }
    };
    reader.readAsText(file);
  };

  // --- GESTIÓN DE CONTENIDO ---
  const crearCategoria = () => {
    const nombre = prompt("Nombre de la nueva categoría:");
    if (!nombre) return;
    setBiblioteca([...biblioteca, { id: Date.now().toString(), nombre, ensayos: [] }]);
  };

  const crearEnsayo = (catId: string) => {
    const titulo = prompt("Título del nuevo ensayo:");
    if (!titulo) return;
    const nuevoEnsayo = { id: `ens-${Date.now()}`, titulo, contenido: "" };
    setBiblioteca(prev => prev.map(cat => 
      cat.id === catId ? { ...cat, ensayos: [...cat.ensayos, nuevoEnsayo] } : cat
    ));
    setEnsayoActivoId(nuevoEnsayo.id);
  };

  const eliminarCategoria = (e: React.MouseEvent, catId: string) => {
    e.stopPropagation();
    if (confirm("¿Eliminar categoría?")) setBiblioteca(prev => prev.filter(c => c.id !== catId));
  };

  const actualizarContenido = (nuevoTexto: string) => {
    setBiblioteca(prev => prev.map(cat => ({
      ...cat,
      ensayos: cat.ensayos.map(ens => ens.id === ensayoActivoId ? { ...ens, contenido: nuevoTexto } : ens)
    })));
  };

  const actualizarTitulo = (nuevoTitulo: string) => {
    setBiblioteca(prev => prev.map(cat => ({
      ...cat,
      ensayos: cat.ensayos.map(ens => ens.id === ensayoActivoId ? { ...ens, titulo: nuevoTitulo } : ens)
    })));
  };

  if (!mounted) return null;

  const catActiva = biblioteca.find(c => c.id === catActivaId);
  const ensayoActivo = catActiva?.ensayos.find(e => e.id === ensayoActivoId);

  return (
    <div className="w-full bg-bg-main min-h-screen text-primary selection:bg-primary/10">
      <nav className="max-w-6xl mx-auto px-6 pt-8 flex justify-between items-center">
        <button onClick={() => window.history.back()} className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-black opacity-40 hover:opacity-100 transition-all">
          <ChevronLeft size={14} /> Volver
        </button>
        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
      </nav>

      <main className="max-w-7xl mx-auto px-6 pb-32 pt-16 font-sans">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          
          {/* COLUMNA IZQUIERDA: GESTOR + ZOTERO */}
          <aside className="lg:col-span-4 space-y-12">
            
            {/* SECCIÓN 1: BIBLIOTECA DINÁMICA */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 flex items-center gap-3">
                  <Files size={14} /> Biblioteca
                </h3>
                <button onClick={crearCategoria} className="p-2 bg-primary text-white rounded-full hover:rotate-90 transition-all shadow-lg">
                  <Plus size={14} />
                </button>
              </div>

              <AnimatePresence mode="wait">
                {!catActivaId ? (
                  <motion.div key="cat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    {biblioteca.map(cat => (
                      <div key={cat.id} onClick={() => setCatActivaId(cat.id)} className="group p-6 bg-white border border-primary/5 rounded-[2rem] flex items-center justify-between cursor-pointer hover:shadow-xl transition-all duration-500">
                        <div className="flex items-center gap-4">
                          <Folder size={18} className="text-accent opacity-40 group-hover:opacity-100" />
                          <span className="text-sm font-serif italic font-bold">{cat.nombre}</span>
                        </div>
                        <button onClick={(e) => eliminarCategoria(e, cat.id)} className="opacity-0 group-hover:opacity-40 hover:text-red-500 transition-all">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div key="ens" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
                    <button onClick={() => {setCatActivaId(null); setEnsayoActivoId(null);}} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 mb-4 transition-all">
                      <ArrowLeft size={12} /> Volver
                    </button>
                    <div className="flex items-center justify-between px-2 mb-4">
                      <p className="text-[10px] font-black uppercase text-accent tracking-tighter italic">{catActiva?.nombre}</p>
                      <button onClick={() => crearEnsayo(catActivaId)} className="text-[9px] font-black uppercase bg-primary/5 px-3 py-1 rounded-full hover:bg-primary hover:text-white transition-all">
                        + Ensayo
                      </button>
                    </div>
                    {catActiva?.ensayos.map(ens => (
                      <button key={ens.id} onClick={() => setEnsayoActivoId(ens.id)} className={`w-full p-5 rounded-[1.5rem] flex items-center justify-between transition-all ${ensayoActivoId === ens.id ? "bg-primary text-white shadow-xl" : "bg-white/60 hover:bg-white border border-primary/5"}`}>
                        <span className="text-xs font-bold uppercase tracking-tight">{ens.titulo}</span>
                        <FileText size={12} className="opacity-20" />
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* SECCIÓN 2: ZOTERO (VINCULADO) */}
            <section className="pt-8 border-t border-primary/5">
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 flex items-center gap-3 mb-6">
                <BookOpen size={14} /> Fuentes Zotero
              </h3>
              <div className="bg-white/50 p-6 rounded-[2.5rem] border border-primary/5 shadow-sm">
                <label className="block w-full border-2 border-dashed border-primary/10 rounded-2xl p-6 text-center cursor-pointer hover:border-accent transition-all group mb-6">
                  <UploadCloud size={20} className="mx-auto mb-2 opacity-20 group-hover:text-accent transition-all" />
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Importar Bibliografía</span>
                  <input type="file" className="hidden" onChange={handleZoteroUpload} accept=".json" />
                </label>
                
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {sources.length > 0 ? sources.map((src, i) => (
                    <div key={i} className="text-xs border-b border-primary/5 pb-3 last:border-0 group">
                      <p className="font-bold leading-tight opacity-70 group-hover:opacity-100 transition-opacity">{src.title}</p>
                      <p className="text-[8px] uppercase tracking-tighter opacity-30 mt-1 font-mono">{src.author} • {src.year}</p>
                    </div>
                  )) : (
                    <p className="text-[9px] italic opacity-20 text-center py-4">"No hay fuentes cargadas."</p>
                  )}
                </div>
              </div>
            </section>
          </aside>

          {/* COLUMNA DERECHA: EDITOR */}
          <section className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {ensayoActivo ? (
                <motion.div key={ensayoActivo.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="bg-white p-10 md:p-20 shadow-[0_40px_100px_rgba(0,0,0,0.04)] rounded-[4rem] min-h-[850px] border border-primary/5 relative">
                    <input 
                      type="text" 
                      value={ensayoActivo.titulo}
                      onChange={(e) => actualizarTitulo(e.target.value)}
                      className="w-full text-4xl md:text-6xl font-serif italic mb-12 outline-none bg-transparent text-primary border-b border-primary/5 pb-8 focus:border-accent transition-all"
                    />
                    <textarea 
                      value={ensayoActivo.contenido}
                      onChange={(e) => actualizarContenido(e.target.value)}
                      className="w-full h-[600px] text-xl leading-[1.8] font-light outline-none resize-none bg-transparent custom-scrollbar"
                      placeholder="Escribe, Franilover..."
                    />
                    <footer className="mt-16 pt-8 border-t border-primary/5 flex justify-between items-center text-[9px] font-black uppercase tracking-[0.4em] opacity-30">
                      <span>{ensayoActivo.contenido.split(/\s+/).filter(Boolean).length} palabras</span>
                      <span className="flex items-center gap-2"><Hash size={12}/> {catActiva?.nombre}</span>
                    </footer>
                  </div>
                </motion.div>
              ) : (
                <div className="h-[850px] flex flex-col items-center justify-center text-center border-2 border-dashed border-primary/10 rounded-[5rem] opacity-10">
                  <PenTool size={60} strokeWidth={1} className="mb-6 rotate-12" />
                  <p className="text-sm font-serif italic tracking-[0.3em]">"Selecciona una categoría o crea un nuevo borrador."</p>
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