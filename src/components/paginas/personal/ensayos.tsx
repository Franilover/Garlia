"use client";
import React, { useState, useEffect } from "react";
import { 
  BookOpen, Files, PenTool, Hash, Save, 
  ExternalLink, ChevronLeft, Folder, FileText, ArrowLeft 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ZoteroSource {
  title: string;
  author: string;
  year: string;
}

// Estructura de datos para organizar tu biblioteca
const BIBLIOTECA_INICIAL = {
  "Psicología": ["Análisis del Comportamiento", "Teoría del Vínculo", "Somatización en el Arte"],
  "Política": ["Geopolítica 2026", "Sistemas de Control", "El Jardín Digital"],
  "Economía": ["Valor Simbólico", "Economía de la Atención"],
  "Filosofía": ["Estética del Vacío", "Fenomenología de la Luz"]
};

export default function EnsayosView() {
  const [mounted, setMounted] = useState(false);
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
  const [ensayoActivo, setEnsayoActivo] = useState<string | null>(null);
  
  // Estados del editor
  const [essayContent, setEssayContent] = useState("");
  const [essayTitle, setEssayTitle] = useState("");
  const [sources, setSources] = useState<ZoteroSource[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Cargar ensayo específico del LocalStorage
  useEffect(() => {
    if (mounted && ensayoActivo) {
      const savedTitle = localStorage.getItem(`ensayo-titulo-${ensayoActivo}`);
      const savedContent = localStorage.getItem(`ensayo-contenido-${ensayoActivo}`);
      setEssayTitle(savedTitle || ensayoActivo);
      setEssayContent(savedContent || "");
    }
  }, [ensayoActivo, mounted]);

  // Autoguardado
  useEffect(() => {
    if (mounted && ensayoActivo) {
      localStorage.setItem(`ensayo-titulo-${ensayoActivo}`, essayTitle);
      localStorage.setItem(`ensayo-contenido-${ensayoActivo}`, essayContent);
    }
  }, [essayTitle, essayContent, ensayoActivo, mounted]);

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
      } catch (err) {
        alert("Error al procesar Zotero.");
      }
    };
    reader.readAsText(file);
  };

  if (!mounted) return null;

  const sectionTag = "text-[10px] font-bold uppercase tracking-[0.4em] flex items-center gap-3 mb-8 opacity-40 text-primary";

  return (
    <div className="w-full bg-bg-main min-h-screen text-primary selection:bg-primary/10">
      <nav className="max-w-6xl mx-auto px-6 pt-8 flex justify-between items-center">
        <button 
          onClick={() => window.history.back()} 
          className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold opacity-40 hover:opacity-100 transition-opacity"
        >
          <ChevronLeft size={14} /> Volver
        </button>
        <div className="flex items-center gap-4">
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-20 italic">"Gabinete de Trabajo: Franilover"</span>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pb-32 pt-16 font-sans">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          
          {/* PANEL IZQUIERDO: NAVEGADOR DE CATEGORÍAS Y ENSAYOS */}
          <aside className="lg:col-span-4 space-y-12">
            <section>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] flex items-center gap-3 opacity-40 text-primary">
                  <Files size={14} /> Biblioteca
                </h3>
                {categoriaActiva && (
                  <button 
                    onClick={() => {setCategoriaActiva(null); setEnsayoActivo(null);}}
                    className="text-[9px] uppercase tracking-widest font-bold opacity-60 hover:text-accent flex items-center gap-1"
                  >
                    <ArrowLeft size={10} /> Categorías
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <AnimatePresence mode="wait">
                  {!categoriaActiva ? (
                    // VISTA DE CATEGORÍAS
                    <motion.div 
                      key="categorias"
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                      className="space-y-3"
                    >
                      {Object.keys(BIBLIOTECA_INICIAL).map((cat) => (
                        <button 
                          key={cat} 
                          onClick={() => setCategoriaActiva(cat)}
                          className="w-full p-6 bg-white/40 border border-primary/5 rounded-[1.8rem] flex items-center justify-between group hover:bg-white hover:shadow-xl transition-all duration-500"
                        >
                          <div className="flex items-center gap-4">
                            <Folder size={16} className="opacity-20 group-hover:text-accent transition-colors" />
                            <span className="text-sm font-medium italic opacity-70">{cat}</span>
                          </div>
                          <span className="text-[10px] opacity-20 font-bold">{(BIBLIOTECA_INICIAL as any)[cat].length}</span>
                        </button>
                      ))}
                    </motion.div>
                  ) : (
                    // VISTA DE ENSAYOS DENTRO DE CATEGORÍA
                    <motion.div 
                      key="ensayos"
                      initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                      className="space-y-3"
                    >
                      <div className="px-2 mb-4">
                        <p className="text-[10px] font-black uppercase text-accent tracking-tighter">Carpeta: {categoriaActiva}</p>
                      </div>
                      {(BIBLIOTECA_INICIAL as any)[categoriaActiva].map((ens) => (
                        <button 
                          key={ens} 
                          onClick={() => setEnsayoActivo(ens)}
                          className={`w-full p-5 rounded-[1.5rem] flex items-center justify-between transition-all duration-300 ${
                            ensayoActivo === ens 
                            ? "bg-primary text-white shadow-lg" 
                            : "bg-white/60 border border-primary/5 hover:bg-white"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <FileText size={14} className={ensayoActivo === ens ? "opacity-100" : "opacity-20"} />
                            <span className="text-xs font-medium">{ens}</span>
                          </div>
                          <Hash size={10} className="opacity-20" />
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </section>

            {/* ZOTERO PERMANECE ABAJO */}
            <section className="pt-8 border-t border-primary/5">
              <h3 className={sectionTag}><BookOpen size={14} /> Fuentes Zotero</h3>
              <div className="bg-white/50 p-6 rounded-[2rem] border border-primary/5 shadow-sm">
                <label className="block w-full border-2 border-dashed border-primary/10 rounded-xl p-4 text-center cursor-pointer hover:border-accent transition-all">
                  <span className="text-[9px] font-bold uppercase tracking-widest opacity-40 italic">Vincular Better BibTeX</span>
                  <input type="file" className="hidden" onChange={handleZoteroUpload} accept=".json" />
                </label>
              </div>
            </section>
          </aside>

          {/* ÁREA DE EDICIÓN CONDICIONAL */}
          <section className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {ensayoActivo ? (
                <motion.div 
                  key="editor-activo"
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="space-y-8"
                >
                  <div className="flex items-center justify-between">
                    <h3 className={sectionTag}><PenTool size={14} /> Escritura Activa</h3>
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-20">Guardado Automático</span>
                  </div>

                  <div className="bg-white p-10 md:p-20 shadow-2xl rounded-[3.5rem] min-h-[800px] border border-primary/5 relative">
                    <input 
                      type="text" 
                      value={essayTitle}
                      onChange={(e) => setEssayTitle(e.target.value)}
                      className="w-full text-4xl md:text-5xl font-serif italic mb-12 outline-none bg-transparent text-primary border-b border-primary/5 pb-6"
                    />
                    <textarea 
                      className="w-full h-[550px] text-xl leading-relaxed font-light outline-none resize-none bg-transparent custom-scrollbar"
                      placeholder="Empieza tu investigación..."
                      value={essayContent}
                      onChange={(e) => setEssayContent(e.target.value)}
                    />
                    <footer className="mt-16 pt-8 border-t border-primary/5 flex justify-between items-center text-[9px] font-black uppercase tracking-[0.3em] opacity-30">
                      <span>Palabras: {essayContent.split(/\s+/).filter(Boolean).length}</span>
                      <div className="flex items-center gap-2">
                        <ExternalLink size={10} /> {categoriaActiva} / {ensayoActivo}
                      </div>
                    </footer>
                  </div>
                </motion.div>
              ) : (
                // PANTALLA VACÍA (PLACEHOLDER)
                <motion.div 
                  key="empty-state"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="h-full min-h-[600px] flex flex-col items-center justify-center text-center opacity-20 border-2 border-dashed border-primary/10 rounded-[4rem]"
                >
                  <PenTool size={48} className="mb-6 stroke-[1px]" />
                  <p className="text-sm font-serif italic tracking-widest">
                    "Selecciona un ensayo de tu biblioteca para comenzar la sesión."
                  </p>
                </motion.div>
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