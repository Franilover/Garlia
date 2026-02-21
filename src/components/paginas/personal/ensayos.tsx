"use client";
import React, { useState, useEffect } from "react";
import { 
  BookOpen, Files, PenTool, Hash, Save, 
  ExternalLink, ChevronLeft, Folder, FileText, 
  ArrowLeft, Plus, Trash2, FolderPlus, Edit3
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

export default function LaboratorioDinamico() {
  const [mounted, setMounted] = useState(false);
  const [biblioteca, setBiblioteca] = useState<Categoria[]>([]);
  const [catActivaId, setCatActivaId] = useState<string | null>(null);
  const [ensayoActivoId, setEnsayoActivoId] = useState<string | null>(null);

  // 1. Cargar Biblioteca Completa al Iniciar
  useEffect(() => {
    const savedData = localStorage.getItem("fran-biblioteca-pro");
    if (savedData) {
      setBiblioteca(JSON.parse(savedData));
    }
    setMounted(true);
  }, []);

  // 2. Persistencia Total (Cada vez que cambia algo, se guarda)
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("fran-biblioteca-pro", JSON.stringify(biblioteca));
    }
  }, [biblioteca, mounted]);

  // --- FUNCIONES DE GESTIÓN ---

  const crearCategoria = () => {
    const nombre = prompt("Nombre de la nueva categoría (ej: Psicología):");
    if (!nombre) return;
    const nuevaCat: Categoria = {
      id: Date.now().toString(),
      nombre,
      ensayos: []
    };
    setBiblioteca([...biblioteca, nuevaCat]);
  };

  const crearEnsayo = (catId: string) => {
    const titulo = prompt("Título del nuevo ensayo:");
    if (!titulo) return;
    const nuevoEnsayo: Ensayo = {
      id: `ens-${Date.now()}`,
      titulo,
      contenido: ""
    };
    setBiblioteca(prev => prev.map(cat => 
      cat.id === catId ? { ...cat, ensayos: [...cat.ensayos, nuevoEnsayo] } : cat
    ));
    setEnsayoActivoId(nuevoEnsayo.id);
  };

  const eliminarCategoria = (e: React.MouseEvent, catId: string) => {
    e.stopPropagation();
    if (confirm("¿Eliminar categoría y todos sus ensayos?")) {
      setBiblioteca(prev => prev.filter(c => c.id !== catId));
      if (catActivaId === catId) setCatActivaId(null);
    }
  };

  const actualizarContenido = (nuevoTexto: string) => {
    setBiblioteca(prev => prev.map(cat => ({
      ...cat,
      ensayos: cat.ensayos.map(ens => 
        ens.id === ensayoActivoId ? { ...ens, contenido: nuevoTexto } : ens
      )
    })));
  };

  const actualizarTitulo = (nuevoTitulo: string) => {
    setBiblioteca(prev => prev.map(cat => ({
      ...cat,
      ensayos: cat.ensayos.map(ens => 
        ens.id === ensayoActivoId ? { ...ens, titulo: nuevoTitulo } : ens
      )
    })));
  };

  if (!mounted) return null;

  // Helpers para encontrar datos activos
  const catActiva = biblioteca.find(c => c.id === catActivaId);
  const ensayoActivo = catActiva?.ensayos.find(e => e.id === ensayoActivoId);

  return (
    <div className="w-full bg-bg-main min-h-screen text-primary selection:bg-primary/10">
      <nav className="max-w-6xl mx-auto px-6 pt-8 flex justify-between items-center">
        <button onClick={() => window.history.back()} className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-black opacity-40 hover:opacity-100 transition-all">
          <ChevronLeft size={14} /> Volver al Atelier
        </button>
        <div className="flex items-center gap-4">
          <span className="text-[10px] uppercase tracking-[0.3em] font-black opacity-20 italic">"Gabinete de Escritura Dinámica"</span>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pb-32 pt-16 font-sans">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          
          {/* ASIDE: GESTOR DE ARCHIVOS */}
          <aside className="lg:col-span-4 space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 flex items-center gap-3">
                <Files size={14} /> Biblioteca Personal
              </h3>
              <button onClick={crearCategoria} className="p-2 bg-primary text-white rounded-full hover:scale-110 transition-transform shadow-lg">
                <FolderPlus size={14} />
              </button>
            </div>

            <div className="space-y-4">
              <AnimatePresence mode="wait">
                {!catActivaId ? (
                  /* VISTA: CATEGORÍAS */
                  <motion.div key="list-cat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    {biblioteca.length === 0 && (
                      <p className="text-[10px] italic opacity-30 text-center py-10 border-2 border-dashed border-primary/5 rounded-[2rem]">"No hay categorías creadas."</p>
                    )}
                    {biblioteca.map(cat => (
                      <div key={cat.id} onClick={() => setCatActivaId(cat.id)} className="group relative w-full p-6 bg-white border border-primary/5 rounded-[2rem] flex items-center justify-between cursor-pointer hover:shadow-2xl hover:border-accent/20 transition-all duration-500">
                        <div className="flex items-center gap-4">
                          <Folder size={18} className="text-accent opacity-40 group-hover:opacity-100" />
                          <span className="text-sm font-serif italic font-bold">{cat.nombre}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] font-black opacity-20">{cat.ensayos.length}</span>
                          <button onClick={(e) => eliminarCategoria(e, cat.id)} className="opacity-0 group-hover:opacity-40 hover:text-red-500 transition-all">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                ) : (
                  /* VISTA: ENSAYOS */
                  <motion.div key="list-ens" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
                    <button onClick={() => {setCatActivaId(null); setEnsayoActivoId(null);}} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 mb-6 transition-all">
                      <ArrowLeft size={12} /> Volver a Carpetas
                    </button>
                    
                    <div className="flex items-center justify-between px-2 mb-4">
                      <p className="text-[10px] font-black uppercase text-accent tracking-tighter italic">Carpeta: {catActiva?.nombre}</p>
                      <button onClick={() => crearEnsayo(catActivaId)} className="flex items-center gap-2 text-[9px] font-black uppercase bg-primary/5 px-3 py-1 rounded-full hover:bg-primary hover:text-white transition-all">
                        <Plus size={10} /> Nuevo Ensayo
                      </button>
                    </div>

                    {catActiva?.ensayos.map(ens => (
                      <button key={ens.id} onClick={() => setEnsayoActivoId(ens.id)} className={`w-full p-5 rounded-[1.5rem] flex items-center justify-between transition-all duration-300 ${ensayoActivoId === ens.id ? "bg-primary text-white shadow-xl translate-x-2" : "bg-white/60 hover:bg-white border border-primary/5"}`}>
                        <div className="flex items-center gap-3">
                          <FileText size={14} className={ensayoActivoId === ens.id ? "opacity-100" : "opacity-20"} />
                          <span className="text-xs font-bold uppercase tracking-tight">{ens.titulo}</span>
                        </div>
                        <Edit3 size={10} className="opacity-20" />
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </aside>

          {/* EDITOR ÁREA */}
          <section className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {ensayoActivo ? (
                <motion.div key={ensayoActivo.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div className="flex justify-between items-center px-4">
                    <div className="flex items-center gap-4">
                      <div className="h-2 w-2 bg-accent rounded-full animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-40 italic">
                        Editando en {catActiva?.nombre}
                      </span>
                    </div>
                    <div className="flex gap-4">
                       <button className="flex items-center gap-2 text-[9px] font-black uppercase opacity-20 hover:opacity-100 transition-all">
                         <Save size={12} /> Guardado local
                       </button>
                    </div>
                  </div>

                  <div className="bg-white p-10 md:p-20 shadow-[0_30px_100px_rgba(0,0,0,0.05)] rounded-[4rem] min-h-[850px] border border-primary/5">
                    <input 
                      type="text" 
                      value={ensayoActivo.titulo}
                      onChange={(e) => actualizarTitulo(e.target.value)}
                      className="w-full text-4xl md:text-6xl font-serif italic mb-12 outline-none bg-transparent text-primary border-b border-primary/5 pb-8 focus:border-accent transition-colors"
                      placeholder="Título sin nombre..."
                    />
                    <textarea 
                      value={ensayoActivo.contenido}
                      onChange={(e) => actualizarContenido(e.target.value)}
                      className="w-full h-[600px] text-xl leading-[1.8] font-light outline-none resize-none bg-transparent placeholder:opacity-10 custom-scrollbar"
                      placeholder="Empieza a escribir, Franilover..."
                    />
                    <footer className="mt-16 pt-8 border-t border-primary/5 flex justify-between items-center text-[10px] font-black uppercase tracking-[0.4em] opacity-30">
                      <span>{ensayoActivo.contenido.split(/\s+/).filter(Boolean).length} palabras</span>
                      <span className="flex items-center gap-2"><ExternalLink size={12}/> Archivo Privado</span>
                    </footer>
                  </div>
                </motion.div>
              ) : (
                <div className="h-[850px] flex flex-col items-center justify-center text-center border-2 border-dashed border-primary/10 rounded-[5rem] opacity-20">
                  <PenTool size={60} strokeWidth={1} className="mb-6" />
                  <p className="text-sm font-serif italic tracking-[0.2em]">"Selecciona o crea un ensayo para iniciar el laboratorio."</p>
                </div>
              )}
            </AnimatePresence>
          </section>

        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(var(--primary-rgb), 0.05); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(var(--primary-rgb), 0.2); }
      `}</style>
    </div>
  );
}