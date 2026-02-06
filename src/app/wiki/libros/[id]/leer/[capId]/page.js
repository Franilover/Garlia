"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/api/supabase';
import { ChevronLeft, ChevronRight, List, AlertCircle, Save, Edit3, X, BookOpen } from 'lucide-react';
import { cn } from "@/lib/utils"; 

export default function Lector() {
  const { id, capId } = useParams(); 
  const router = useRouter();
  
  const [capitulo, setCapitulo] = useState(null);
  const [listaCapitulos, setListaCapitulos] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados de edición (Similares a LibroDetalle)
  const [isAdmin, setIsAdmin] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [nuevoContenido, setNuevoContenido] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchDatos = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setIsAdmin(true);

        const { data: capData } = await supabase
          .from('capitulos')
          .select('*, libros ( titulo )')
          .eq('id', capId)
          .maybeSingle();

        if (!capData) {
          setError("Capítulo no encontrado");
          return;
        }
        setCapitulo(capData);
        setNuevoContenido(capData.contenido || ""); 

        const { data: todosCaps } = await supabase
          .from('capitulos')
          .select('id, orden')
          .eq('libro_id', id)
          .order('orden', { ascending: true });

        setListaCapitulos(todosCaps || []);
      } catch (err) {
        setError("Error al cargar la crónica");
      } finally {
        setLoading(false);
      }
    };

    if (capId && id) fetchDatos();
  }, [capId, id]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('capitulos')
      .update({ contenido: nuevoContenido })
      .eq('id', capId);

    if (error) {
      alert("Error: " + error.message);
    } else {
      setCapitulo({ ...capitulo, contenido: nuevoContenido });
      setEditMode(false);
    }
    setSaving(false);
  };

  const indiceActual = listaCapitulos.findIndex(c => c.id === capId);
  const anteriorCap = listaCapitulos[indiceActual - 1];
  const siguienteCap = listaCapitulos[indiceActual + 1];

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#FDFCFD]">
      <div className="animate-pulse text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.3em]">
        "Abriendo pergamino..."
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFCFD] text-[#2C262E] pb-24">
      
      {/* Botones Flotantes de Admin (Estilo similar al Plus de LibroDetalle) */}
      {isAdmin && (
        <div className="fixed bottom-10 right-6 z-[100] flex flex-col gap-3">
          {editMode ? (
            <>
              <button onClick={() => { setEditMode(false); setNuevoContenido(capitulo.contenido); }}
                className="bg-red-500 text-white p-4 rounded-full shadow-xl active:scale-95 transition-all">
                <X size={24} />
              </button>
              <button onClick={handleSave} disabled={saving}
                className="bg-green-500 text-white p-4 rounded-full shadow-xl active:scale-95 transition-all flex items-center gap-2">
                <Save size={24} />
                <span className="font-black text-[10px] uppercase pr-1">{saving ? "..." : "Guardar"}</span>
              </button>
            </>
          ) : (
            <button onClick={() => setEditMode(true)}
              className="bg-[#6B5E70] text-white p-5 rounded-full shadow-2xl active:scale-95 transition-all border-4 border-white">
              <Edit3 size={24} />
            </button>
          )}
        </div>
      )}

      {/* Navbar Superior (Limpio como el de Detalle) */}
      <nav className="sticky top-0 z-[50] bg-[#FDFCFD]/80 backdrop-blur-md border-b border-[#6B5E70]/5 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={() => router.push(`/libros/${id}`)} className="text-[#6B5E70]/40 hover:text-[#6B5E70]">
            <ChevronLeft size={24} />
          </button>
          <div className="text-center">
            <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#6B5E70]/40 mb-1 leading-none">
              {capitulo.libros?.titulo}
            </h2>
            <p className="text-[11px] font-bold text-[#6B5E70] uppercase">
              Capítulo {capitulo.orden}
            </p>
          </div>
          <button onClick={() => router.push(`/libros/${id}`)} className="text-[#6B5E70]/40 hover:text-[#6B5E70]">
            <List size={24} />
          </button>
        </div>
      </nav>

      <article className="max-w-2xl mx-auto px-6 py-12 md:py-20">
        <header className="mb-12 text-center">
          <span className="text-[#6B5E70]/20 font-serif italic text-4xl block mb-2">§ {capitulo.orden}</span>
          <h1 className="text-3xl md:text-4xl font-black text-[#6B5E70] tracking-tighter uppercase italic leading-none">
            {capitulo.titulo_capitulo}
          </h1>
        </header>

        <div className="min-h-[50vh]">
          {editMode ? (
            <textarea
              value={nuevoContenido}
              onChange={(e) => setNuevoContenido(e.target.value)}
              className="w-full min-h-[60vh] p-6 bg-white border border-[#6B5E70]/10 rounded-[2rem] font-serif text-lg leading-relaxed text-[#2C262E] focus:outline-none focus:border-[#6B5E70]/30 shadow-inner"
              placeholder="Escribe aquí el contenido..."
              autoFocus
            />
          ) : (
            <div className="text-lg md:text-xl leading-[2] text-[#2C262E]/80 font-serif whitespace-pre-line first-letter:text-6xl first-letter:font-black first-letter:text-[#6B5E70] first-letter:mr-3 first-letter:float-left first-letter:mt-2">
              {capitulo.contenido}
            </div>
          )}
        </div>

        {!editMode && (
          <footer className="mt-20 pt-10 border-t border-[#6B5E70]/10 flex flex-col items-center gap-8">
            <button onClick={() => router.push(`/libros/${id}`)}
              className="flex items-center gap-2 text-[#6B5E70]/40 hover:text-[#6B5E70] font-black text-[10px] uppercase tracking-widest transition-all">
              <List size={16} /> "Volver al Índice"
            </button>
            
            <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
              <button 
                onClick={() => anteriorCap && router.push(`/libros/${id}/leer/${anteriorCap.id}`)}
                disabled={!anteriorCap}
                className={cn(
                  "p-5 rounded-2xl border font-black uppercase text-[10px] flex items-center justify-center gap-2 transition-all",
                  !anteriorCap ? "opacity-20 cursor-not-allowed" : "border-[#6B5E70]/10 text-[#6B5E70]/60 active:scale-95"
                )}
              >
                <ChevronLeft size={14} /> "Anterior"
              </button>

              <button 
                onClick={() => siguienteCap ? router.push(`/libros/${id}/leer/${siguienteCap.id}`) : router.push(`/libros/${id}`)}
                className="p-5 rounded-2xl bg-[#6B5E70] text-white font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
              >
                {siguienteCap ? "Siguiente" : "Finalizar"} <ChevronRight size={14} />
              </button>
            </div>
          </footer>
        )}
      </article>
    </div>
  );
}