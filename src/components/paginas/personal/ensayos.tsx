"use client";
import React, { useState, useEffect } from "react";
import { BookOpen, Files, PenTool, Hash, Save, ExternalLink, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

// Definimos la interfaz para las referencias de Zotero
interface ZoteroSource {
  title: string;
  author: string;
  year: string;
}

export default function EnsayosView() {
  const [sources, setSources] = useState<ZoteroSource[]>([]);
  const [essayContent, setEssayContent] = useState("");
  const [essayTitle, setEssayTitle] = useState("");

  const sectionTag = "text-[10px] font-bold uppercase tracking-[0.4em] flex items-center gap-3 mb-8 opacity-40 text-primary";

  // Cargar datos de Zotero desde un JSON local (Better BibTeX)
  const handleZoteroUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        // Mapeo compatible con Better CSL-JSON
        const formatted = json.map((item: any) => ({
          title: item.title || "Sin título",
          author: item.author?.[0]?.family || item.author?.[0]?.name || "Anónimo",
          year: item.issued?.["date-parts"]?.[0]?.[0] || "s.f."
        }));
        setSources(formatted);
      } catch (err) {
        alert("Error al procesar el archivo local de Zotero. Asegúrate de que sea un JSON válido.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="w-full bg-bg-main min-h-screen text-primary selection:bg-primary/10">
      {/* Navegación interna del componente */}
      <nav className="max-w-6xl mx-auto px-6 pt-8 flex justify-between items-center">
        <button 
          onClick={() => window.history.back()} 
          className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold opacity-40 hover:opacity-100 transition-opacity"
        >
          <ChevronLeft size={14} /> Volver
        </button>
        <div className="flex items-center gap-4">
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-20">Espacio de Trabajo: Franilover</span>
          <div className="h-2 w-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pb-32 pt-16 md:pt-24 font-sans">
        
        {/* Encabezado con Estética Atelier */}
        <header className="mb-24 flex flex-col md:flex-row justify-between items-end gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter uppercase leading-none">
              Laboratorio <span className="font-serif font-light text-primary/60">Textual</span>
            </h1>
            <div className="h-1.5 w-20 bg-primary mt-8 opacity-20 rounded-full" />
          </motion.div>
          
          <div className="flex gap-4">
            <button 
              onClick={() => console.log("Guardando ensayo:", { essayTitle, essayContent })}
              className="px-8 py-4 bg-white border border-primary/10 rounded-full text-[10px] uppercase tracking-widest font-bold hover:bg-primary hover:text-white transition-all shadow-sm flex items-center gap-2 group"
            >
              <Save size={14} className="group-hover:scale-110 transition-transform" /> Guardar en MySpace
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          
          {/* Panel de Investigación Lateral */}
          <aside className="lg:col-span-4 space-y-12">
            
            {/* Sección de Carpetas (Referencia a tus archivos movidos) */}
            <section>
              <h3 className={sectionTag}>
                <Files size={14} /> Directorios Locales
              </h3>
              <div className="space-y-3">
                {["Investigaciones 2026", "Garden of Sins - Ref", "Ensayos Terminados"].map((folder) => (
                  <div key={folder} className="p-5 bg-white/40 border border-primary/5 rounded-[1.5rem] flex items-center justify-between group cursor-pointer hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <span className="text-sm font-medium italic opacity-70 group-hover:opacity-100">{folder}</span>
                    <Hash size={12} className="opacity-10 group-hover:opacity-40" />
                  </div>
                ))}
              </div>
            </section>

            {/* Integración con Zotero Local */}
            <section>
              <h3 className={sectionTag}>
                <BookOpen size={14} /> Fuentes Zotero
              </h3>
              <div className="bg-white p-8 rounded-[2.5rem] border border-primary/5 shadow-sm overflow-hidden relative">
                <label className="block w-full border-2 border-dashed border-primary/10 rounded-2xl p-6 text-center cursor-pointer hover:border-primary/40 transition-all mb-6 group">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 group-hover:opacity-100 italic">Vincular Better BibTeX JSON</span>
                  <input type="file" className="hidden" onChange={handleZoteroUpload} accept=".json" />
                </label>

                <div className="space-y-6 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                  {sources.length > 0 ? sources.map((src, i) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      key={i} 
                      className="text-sm border-b border-primary/5 pb-4 last:border-0 hover:bg-bg-main/30 transition-colors p-2 rounded-lg"
                    >
                      <p className="font-bold leading-tight mb-1">{src.title}</p>
                      <p className="text-[9px] uppercase tracking-wider opacity-40 italic font-mono">{src.author} • {src.year}</p>
                    </motion.div>
                  )) : (
                    <div className="py-10 text-center italic opacity-30 text-xs px-4">
                      "Carga tu base de datos de Zotero local para gestionar referencias sin ocupar espacio en la nube."
                    </div>
                  )}
                </div>
              </div>
            </section>
          </aside>

          {/* Área Principal de Escritura */}
          <section className="lg:col-span-8">
            <h3 className={sectionTag}>
              <PenTool size={14} /> Escritura Activa
            </h3>
            <div className="bg-white p-10 md:p-20 shadow-[0_20px_50px_rgba(0,0,0,0.02)] rounded-[3.5rem] min-h-[800px] border border-primary/5 relative">
              
              <input 
                type="text" 
                placeholder="Título del Ensayo..." 
                value={essayTitle}
                onChange={(e) => setEssayTitle(e.target.value)}
                className="w-full text-4xl md:text-6xl font-serif italic mb-12 outline-none bg-transparent placeholder:opacity-10 text-primary border-b border-primary/5 pb-6"
              />
              
              <textarea 
                className="w-full h-[550px] text-xl leading-relaxed font-light outline-none resize-none bg-transparent placeholder:opacity-10 custom-scrollbar"
                placeholder="Empieza tu investigación aquí, Franilover..."
                value={essayContent}
                onChange={(e) => setEssayContent(e.target.value)}
              />
              
              <footer className="mt-16 pt-8 border-t border-primary/5 flex flex-wrap justify-between items-center gap-4 text-[9px] font-black uppercase tracking-[0.3em] opacity-30">
                <div className="flex gap-8">
                  <span className="flex items-center gap-2">Palabras: <b className="text-[11px] opacity-100">{essayContent.split(/\s+/).filter(Boolean).length}</b></span>
                  <span className="flex items-center gap-2">Lectura: <b className="text-[11px] opacity-100">{Math.ceil(essayContent.split(/\s+/).filter(Boolean).length / 200)} min</b></span>
                </div>
                <div className="flex items-center gap-2 bg-primary/5 px-4 py-2 rounded-full">
                  <ExternalLink size={10} />
                  Solo Franilover tiene acceso
                </div>
              </footer>
            </div>
          </section>

        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(var(--primary-rgb), 0.1);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}