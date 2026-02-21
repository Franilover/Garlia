"use client";
import React, { useState, useEffect } from "react";
import { BookOpen, Files, PenTool, Hash, Save, ExternalLink, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";

interface ZoteroSource {
  title: string;
  author: string;
  year: string;
}

export default function EnsayosView() {
  const [sources, setSources] = useState<ZoteroSource[]>([]);
  const [essayContent, setEssayContent] = useState("");
  const [essayTitle, setEssayTitle] = useState("");
  // Estado para saber qué ensayo estamos editando
  const [activeEnsayo, setActiveEnsayo] = useState("Investigaciones 2026");
  const [mounted, setMounted] = useState(false);

  // Lista de directorios/ensayos
  const directorios = ["Investigaciones 2026", "Garden of Sins - Ref", "Ensayos Terminados"];

  // 1. Marcar como montado para evitar errores de LocalStorage en SSR
  useEffect(() => {
    setMounted(true);
  }, []);

  // 2. Cargar contenido cuando cambia el ensayo activo
  useEffect(() => {
    if (!mounted) return;
    
    const savedTitle = localStorage.getItem(`ensayo-title-${activeEnsayo}`);
    const savedContent = localStorage.getItem(`ensayo-content-${activeEnsayo}`);
    
    setEssayTitle(savedTitle || "");
    setEssayContent(savedContent || "");
  }, [activeEnsayo, mounted]);

  // 3. Autoguardado automático al escribir
  useEffect(() => {
    if (!mounted) return;
    
    const timeoutId = setTimeout(() => {
      localStorage.setItem(`ensayo-title-${activeEnsayo}`, essayTitle);
      localStorage.setItem(`ensayo-content-${activeEnsayo}`, essayContent);
    }, 500); // Pequeño debounce para rendimiento

    return () => clearTimeout(timeoutId);
  }, [essayTitle, essayContent, activeEnsayo, mounted]);

  const sectionTag = "text-[10px] font-bold uppercase tracking-[0.4em] flex items-center gap-3 mb-8 opacity-40 text-primary";

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
        alert("Error al procesar el archivo local de Zotero.");
      }
    };
    reader.readAsText(file);
  };

  if (!mounted) return <div className="min-h-screen bg-bg-main" />;

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
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-20 italic">"Acceso Exclusivo: Franilover"</span>
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pb-32 pt-16 md:pt-24 font-sans">
        <header className="mb-24 flex flex-col md:flex-row justify-between items-end gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter uppercase leading-none">
              Laboratorio <span className="font-serif font-light text-primary/60">Textual</span>
            </h1>
            <div className="h-1.5 w-20 bg-primary mt-8 opacity-20 rounded-full" />
          </motion.div>
          
          <button 
            onClick={() => alert("Copia de seguridad guardada localmente.")}
            className="px-8 py-4 bg-white border border-primary/10 rounded-full text-[10px] uppercase tracking-widest font-bold hover:bg-primary hover:text-white transition-all shadow-sm flex items-center gap-2 group"
          >
            <Save size={14} /> Forzar Guardado
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <aside className="lg:col-span-4 space-y-12">
            <section>
              <h3 className={sectionTag}><Files size={14} /> Directorios Locales</h3>
              <div className="space-y-3">
                {directorios.map((folder) => (
                  <button 
                    key={folder} 
                    onClick={() => setActiveEnsayo(folder)}
                    className={`w-full p-5 border rounded-[1.5rem] flex items-center justify-between group transition-all duration-300 ${
                      activeEnsayo === folder 
                      ? "bg-primary text-white border-primary shadow-lg scale-[1.02]" 
                      : "bg-white/40 border-primary/5 hover:bg-white text-primary"
                    }`}
                  >
                    <span className={`text-sm font-medium italic ${activeEnsayo === folder ? "opacity-100" : "opacity-70 group-hover:opacity-100"}`}>
                      {folder}
                    </span>
                    <Hash size={12} className={activeEnsayo === folder ? "opacity-100" : "opacity-10 group-hover:opacity-40"} />
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3 className={sectionTag}><BookOpen size={14} /> Fuentes Zotero</h3>
              <div className="bg-white p-8 rounded-[2.5rem] border border-primary/5 shadow-sm overflow-hidden">
                <label className="block w-full border-2 border-dashed border-primary/10 rounded-2xl p-6 text-center cursor-pointer hover:border-primary/40 transition-all mb-6 group">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 group-hover:opacity-100 italic">Importar JSON de Zotero</span>
                  <input type="file" className="hidden" onChange={handleZoteroUpload} accept=".json" />
                </label>
                <div className="space-y-6 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                  {sources.length > 0 ? sources.map((src, i) => (
                    <div key={i} className="text-sm border-b border-primary/5 pb-4 last:border-0">
                      <p className="font-bold leading-tight">{src.title}</p>
                      <p className="text-[9px] uppercase tracking-wider opacity-40 italic font-mono">{src.author} • {src.year}</p>
                    </div>
                  )) : <div className="py-10 text-center italic opacity-30 text-xs px-4">"Carga bibliográfica vacía."</div>}
                </div>
              </div>
            </section>
          </aside>

          <section className="lg:col-span-8">
            <h3 className={sectionTag}><PenTool size={14} /> Editando: {activeEnsayo}</h3>
            <div className="bg-white p-10 md:p-20 shadow-2xl rounded-[3.5rem] min-h-[800px] border border-primary/5 relative">
              <input 
                type="text" 
                placeholder="Título del Ensayo..." 
                value={essayTitle}
                onChange={(e) => setEssayTitle(e.target.value)}
                className="w-full text-4xl md:text-6xl font-serif italic mb-12 outline-none bg-transparent placeholder:opacity-10 text-primary border-b border-primary/5 pb-6"
              />
              <textarea 
                className="w-full h-[550px] text-xl leading-relaxed font-light outline-none resize-none bg-transparent placeholder:opacity-10 custom-scrollbar"
                placeholder="Escribe, Franilover..."
                value={essayContent}
                onChange={(e) => setEssayContent(e.target.value)}
              />
              <footer className="mt-16 pt-8 border-t border-primary/5 flex flex-wrap justify-between items-center gap-4 text-[9px] font-black uppercase tracking-[0.3em] opacity-30">
                <div className="flex gap-8">
                  <span>Palabras: {essayContent.split(/\s+/).filter(Boolean).length}</span>
                </div>
                <div className="flex items-center gap-2 bg-primary/5 px-4 py-2 rounded-full uppercase tracking-tighter">
                  <ExternalLink size={10} /> Solo visible para Franilover
                </div>
              </footer>
            </div>
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