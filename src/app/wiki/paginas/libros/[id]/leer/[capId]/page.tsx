"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/api/supabase";
import { ChevronLeft, ChevronRight, List, Save, Edit3, X } from "lucide-react";
import { cn } from "@/lib/utils"; 
import { motion, AnimatePresence } from "framer-motion";
import { librosQueries, Capitulo } from "@/lib/api/queries/libros";

export default function Lector() {
  const params = useParams();
  const id = params?.id as string;
  const capId = params?.capId as string;
  const router = useRouter();
  
  // --- ESTADOS ---
  const [capitulo, setCapitulo] = useState<Capitulo | null>(null);
  const [listaCapitulos, setListaCapitulos] = useState<{ id: string; orden: number }[]>([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [nuevoContenido, setNuevoContenido] = useState("");
  const [saving, setSaving] = useState(false);

  // Referencia para evitar ejecuciones duplicadas en React Strict Mode
  const isInitialMount = useRef(true);

  // --- CARGA DE DATOS OPTIMIZADA ---
  useEffect(() => {
    const fetchDatos = async () => {
      if (!capId || !id) return;

      try {
        // Solo mostramos el loader completo en la primera carga
        if (isInitialMount.current) setLoading(true);
        setError(null);

        // OPTIMIZACIÓN: Ejecutamos la sesión y la query en paralelo para ahorrar tiempo de ida y vuelta (RTT)
        const [sessionRes, queryRes] = await Promise.all([
          supabase.auth.getSession(),
          librosQueries.getCapituloParaLectura(capId, id, true) // Pedimos como admin inicialmente para no esperar al auth
        ]);

        const esAdmin = !!sessionRes.data.session;
        setIsAdmin(esAdmin);

        if (queryRes.error || !queryRes.data) {
          setError(queryRes.error || "No se pudo cargar el capítulo");
        } else {
          setCapitulo(queryRes.data.capitulo);
          setListaCapitulos(queryRes.data.listaCapitulos);
          setNuevoContenido(queryRes.data.capitulo.contenido || ""); 
        }
      } catch (err) {
        console.error("Error crítico en Lector:", err);
        setError("Error al abrir el pergamino");
      } finally {
        setLoading(false);
        isInitialMount.current = false;
      }
    };

    fetchDatos();
  }, [capId, id]);

  // --- ACCIONES DE ADMIN (OPTIMISTAS) ---
  const handleSave = async () => {
    if (!capitulo || !capId) return;
    
    // Guardamos el estado previo por si falla el servidor
    const contenidoPrevio = capitulo.contenido;
    
    // 1. Actualización inmediata de la UI (Feedback instantáneo)
    setCapitulo({ ...capitulo, contenido: nuevoContenido });
    setEditMode(false);
    setSaving(true);

    try {
      const { error: saveError } = await librosQueries.updateContenido(capId, nuevoContenido);
      if (saveError) throw saveError;
    } catch (err: any) {
      // 2. Rollback si falla: regresamos al estado anterior
      setCapitulo({ ...capitulo, contenido: contenidoPrevio });
      setNuevoContenido(contenidoPrevio);
      setEditMode(true);
      alert("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // --- LÓGICA DE NAVEGACIÓN ---
  const indiceActual = listaCapitulos.findIndex(c => c.id === capId);
  const anteriorCap = listaCapitulos[indiceActual - 1];
  const siguienteCap = listaCapitulos[indiceActual + 1];

  // --- RENDERS DE CARGA Y ERROR ---
  if (loading && !capitulo) return (
    <div className="h-screen flex items-center justify-center bg-[#FDFCFD]">
      <div className="animate-pulse text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.3em]">
        Abriendo pergamino...
      </div>
    </div>
  );

  if (error || !capitulo) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#FDFCFD] text-[#6B5E70] p-6 text-center">
      <h2 className="font-black uppercase text-xl mb-4 italic tracking-tighter">
        {error || "Capítulo no encontrado"}
      </h2>
      <button 
        onClick={() => router.push(`/wiki/libros/${id}`)} 
        className="text-[10px] font-black uppercase border-b-2 border-[#6B5E70] pb-1"
      >
        Volver al índice
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFCFD] text-[#2C262E] pb-24">
      
      {/* PANEL DE ADMIN FLOTANTE */}
      {isAdmin && (
        <div className="fixed bottom-10 right-6 z-[100] flex flex-col gap-3">
          <AnimatePresence>
            {editMode ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                className="flex flex-col gap-3"
              >
                <button 
                  onClick={() => { setEditMode(false); setNuevoContenido(capitulo.contenido); }}
                  className="bg-white text-red-500 p-4 rounded-full shadow-xl border border-red-100 active:scale-95 transition-all"
                >
                  <X size={24} />
                </button>
                <button 
                  onClick={handleSave} 
                  disabled={saving}
                  className="bg-[#6B5E70] text-white p-4 rounded-full shadow-xl active:scale-95 transition-all flex items-center gap-2"
                >
                  <Save size={24} />
                  <span className="font-black text-[10px] uppercase pr-1">{saving ? "..." : "Guardar"}</span>
                </button>
              </motion.div>
            ) : (
              <button 
                onClick={() => setEditMode(true)}
                className="bg-white text-[#6B5E70] p-5 rounded-full shadow-2xl active:scale-95 transition-all border border-[#6B5E70]/10"
              >
                <Edit3 size={24} />
              </button>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* NAVBAR SUPERIOR */}
      <nav className="sticky top-0 z-[50] bg-[#FDFCFD]/80 backdrop-blur-md border-b border-[#6B5E70]/5 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={() => router.push(`/wiki/libros/${id}`)} className="text-[#6B5E70]/40 hover:text-[#6B5E70] transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div className="text-center">
            <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#6B5E70]/40 mb-1 leading-none">
              {capitulo.libros?.titulo}
            </h2>
            <p className="text-[11px] font-bold text-[#6B5E70] uppercase">Capítulo {capitulo.orden}</p>
          </div>
          <button onClick={() => router.push(`/wiki/libros/${id}`)} className="text-[#6B5E70]/40 hover:text-[#6B5E70]">
            <List size={24} />
          </button>
        </div>
      </nav>

      {/* CONTENIDO DEL CAPÍTULO */}
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
              className="w-full min-h-[60vh] p-8 bg-white border border-[#6B5E70]/10 rounded-[2.5rem] font-serif text-lg leading-relaxed text-[#2C262E] focus:outline-none focus:border-[#6B5E70]/30 shadow-inner resize-none"
              autoFocus
            />
          ) : (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-lg md:text-xl leading-[2.2] text-[#2C262E]/90 font-serif whitespace-pre-line first-letter:text-7xl first-letter:font-black first-letter:text-[#6B5E70] first-letter:mr-4 first-letter:float-left first-letter:mt-3"
            >
              {capitulo.contenido}
            </motion.div>
          )}
        </div>

        {/* NAVEGACIÓN INFERIOR */}
        {!editMode && (
          <footer className="mt-20 pt-10 border-t border-[#6B5E70]/10 flex flex-col items-center gap-8">
            <button onClick={() => router.push(`/wiki/libros/${id}`)} className="flex items-center gap-2 text-[#6B5E70]/40 hover:text-[#6B5E70] font-black text-[10px] uppercase tracking-widest transition-all">
              <List size={16} /> Volver al Índice
            </button>
            <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
              <button 
                onClick={() => anteriorCap && router.push(`/wiki/libros/${id}/leer/${anteriorCap.id}`)}
                disabled={!anteriorCap}
                className={cn("p-5 rounded-2xl border font-black uppercase text-[10px] flex items-center justify-center gap-2 transition-all", !anteriorCap ? "opacity-20 cursor-not-allowed" : "border-[#6B5E70]/10 text-[#6B5E70]/60 hover:bg-[#6B5E70]/5 active:scale-95")}
              >
                <ChevronLeft size={14} /> Anterior
              </button>
              <button 
                onClick={() => siguienteCap ? router.push(`/wiki/libros/${id}/leer/${siguienteCap.id}`) : router.push(`/wiki/libros/${id}`)}
                className="p-5 rounded-2xl bg-[#6B5E70] text-white font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-lg hover:shadow-[#6B5E70]/30 active:scale-95 transition-all"
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