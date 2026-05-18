"use client";
import React from "react";
import { MotionDiv } from "@/components/ui/Motion";
import { Star, Hash, FileText, ArrowRight } from "lucide-react";

interface HomeDashboardProps {
  ensayos: any[];
  todosLosTags: string[];
  onNavigate: (titulo: string) => void;
  onTagClick: (tag: string) => void;
}

export function HomeDashboard({ ensayos, todosLosTags, onNavigate, onTagClick }: HomeDashboardProps) {
  const monoStyle: React.CSSProperties = { fontFamily: "var(--font-mono)" };
  
  // Filtramos notas que podrías marcar como favoritas (ej. las que tengan el tag 'favorito')
  const favoritos = ensayos.filter(e => e.tags?.includes("favorito")).slice(0, 5);
  // Últimas notas editadas
  const recientes = [...ensayos].sort((a, b) => 
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  ).slice(0, 3);

  return (
    <MotionDiv 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto py-12 px-8"
    >
      <header className="mb-12">
        <h1 className="text-3xl font-serif italic mb-2">Escritorio</h1>
        <p style={{ ...monoStyle }} className="text-[10px] uppercase tracking-widest text-primary/30">
          Índice general de pensamiento
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* SECCIÓN: FAVORITOS */}
        <section>
          <div className="flex items-center gap-2 mb-4 text-primary/40">
            <Star size={14} />
            <h2 style={monoStyle} className="text-[11px] uppercase font-bold tracking-tighter">Notas Maestras</h2>
          </div>
          <div className="flex flex-col gap-3">
            {favoritos.length > 0 ? favoritos.map(f => (
              <button 
                key={f.id}
                onClick={() => onNavigate(f.titulo)}
                className="text-left group flex items-center justify-between p-2 border-b border-transparent hover:border-primary/10 transition-all"
              >
                <span className="text-sm border-b border-primary/20 group-hover:border-primary/60 transition-all">
                  [[{f.titulo}]]
                </span>
                <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )) : (
              <p className="text-xs italic text-primary/20">Usa el tag #favorito para pinear notas aquí.</p>
            )}
          </div>
        </section>

        {/* SECCIÓN: ÍNDICE DE TAGS */}
        <section>
          <div className="flex items-center gap-2 mb-4 text-primary/40">
            <Hash size={14} />
            <h2 style={monoStyle} className="text-[11px] uppercase font-bold tracking-tighter">Taxonomía / Tags</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {todosLosTags.map(tag => (
              <button
                key={tag}
                onClick={() => onTagClick(tag)}
                className="text-[10px] px-2 py-1 bg-primary/5 hover:bg-primary/10 border border-primary/10 rounded-md transition-colors"
                style={monoStyle}
              >
                #{tag}
              </button>
            ))}
          </div>
        </section>

        {/* SECCIÓN: RECIENTES */}
        <section className="md:col-span-2">
          <div className="flex items-center gap-2 mb-4 text-primary/40">
            <FileText size={14} />
            <h2 style={monoStyle} className="text-[11px] uppercase font-bold tracking-tighter">Actividad Reciente</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {recientes.map(r => (
              <div 
                key={r.id} 
                onClick={() => onNavigate(r.titulo)}
                className="cursor-pointer p-4 border border-primary/5 bg-primary/[0.02] hover:bg-primary/[0.05] rounded-lg transition-all"
              >
                <h3 className="text-xs font-bold mb-1 truncate">{r.titulo}</h3>
                <span style={monoStyle} className="text-[9px] text-primary/30">
                  {new Date(r.updated_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </MotionDiv>
  );
} 