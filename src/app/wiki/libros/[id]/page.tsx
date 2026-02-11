"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/api/supabase";
import { 
  ChevronLeft, Play, ListOrdered, Plus, Trash2, X, Edit3, Save, Calendar, Loader2 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SmartImage } from "@/components/shared/display/SmartImage";
import { useSupabaseData } from "@/hooks/useSupabaseData"; 
import { cn } from "@/lib/utils";

// --- INTERFACES ---
interface Capitulo {
  id: string;
  titulo_capitulo: string;
  orden: number;
  fecha_publicacion: string;
  libro_id: string;
}

interface Libro {
  id: string;
  titulo: string;
  sinopsis: string;
  portada_url: string;
  fecha_proximo_capitulo?: string;
}

export default function LibroDetalle() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  
  const [libro, setLibro] = useState<Libro | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [loadingLibro, setLoadingLibro] = useState(true);

  // --- MODALES ---
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditCapModal, setShowEditCapModal] = useState(false);
  
  // --- FORMULARIOS ---
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [nuevaFecha, setNuevaFecha] = useState(new Date().toISOString().split('T')[0]); 
  const [selectedCap, setSelectedCap] = useState<Capitulo | null>(null);
  const [editCapTitle, setEditCapTitle] = useState("");
  const [editCapFecha, setEditCapFecha] = useState("");

  // 1. CARGA DE DATOS (PARALELIZADA)
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const [authRes, libroRes] = await Promise.all([
          supabase.auth.getSession(),
          supabase.from("libros").select("*").eq("id", id).single()
        ]);

        setIsAdmin(!!authRes.data.session);
        if (libroRes.data) setLibro(libroRes.data);
      } catch (err) {
        console.error("Error al cargar detalle:", err);
      } finally {
        setLoadingLibro(false);
      }
    };
    fetchData();
  }, [id]);

  // 2. CARGA DE CAPÍTULOS CON HOOK
  const { 
    data: capitulosRaw, 
    loading: loadingCaps, 
    refetch: refetchCaps 
  } = useSupabaseData("capitulos", {
    select: "*",
    order: { campo: "orden", asc: true }
  });

  const capitulos = useMemo(() => {
    const hoy = new Date().toISOString().split('T')[0];
    const raw = (capitulosRaw as Capitulo[]) || [];
    return raw
      .filter(cap => cap.libro_id === id)
      .filter(cap => isAdmin || cap.fecha_publicacion <= hoy);
  }, [capitulosRaw, id, isAdmin]);

  // --- ACCIONES ---
  const handleCrearCapitulo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoTitulo.trim() || procesando) return;
    
    setProcesando(true);
    const { error } = await supabase.from("capitulos").insert([{ 
      libro_id: id, 
      titulo_capitulo: nuevoTitulo.toUpperCase(), 
      orden: capitulos.length + 1, 
      contenido: "Nueva crónica...",
      fecha_publicacion: nuevaFecha 
    }]);

    if (!error) {
      setNuevoTitulo("");
      setShowAddModal(false);
      refetchCaps();
    } else {
      alert("Error al crear el capítulo");
    }
    setProcesando(false);
  };

  const handleUpdateCapitulo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCapTitle.trim() || !selectedCap || procesando) return;
    
    setProcesando(true);
    const { error } = await supabase.from("capitulos").update({ 
        titulo_capitulo: editCapTitle.toUpperCase(),
        fecha_publicacion: editCapFecha 
    }).eq("id", selectedCap.id);

    if (!error) {
      setShowEditCapModal(false);
      refetchCaps();
    } else {
      alert("Error al actualizar");
    }
    setProcesando(false);
  };

  const deleteCapitulo = async () => {
    if (!selectedCap || !confirm("¿Eliminar permanentemente este capítulo?")) return;
    
    setProcesando(true);
    const { error } = await supabase.from("capitulos").delete().eq("id", selectedCap.id);
    if (!error) {
      setShowEditCapModal(false);
      refetchCaps();
    } else {
      alert("No se pudo eliminar");
    }
    setProcesando(false);
  };

  return (
    <div className="min-h-screen bg-[#FDFCFD] pb-20 relative">
      <AnimatePresence>
        {/* MODAL: AÑADIR */}
        {showAddModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !procesando && setShowAddModal(false)} className="absolute inset-0 bg-[#6B5E70]/20 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl relative z-10 border border-[#6B5E70]/10 text-center">
              <button onClick={() => setShowAddModal(false)} className="absolute top-8 right-8 text-[#6B5E70]/20 hover:text-[#6B5E70]"><X size={20} /></button>
              <h3 className="text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.3em] mb-8 italic">Nuevo Capítulo</h3>
              <form onSubmit={handleCrearCapitulo} className="space-y-6">
                <input autoFocus type="text" placeholder="TÍTULO..." value={nuevoTitulo} onChange={(e) => setNuevoTitulo(e.target.value)} className="w-full bg-[#FDFCFD] border-b-2 border-[#6B5E70]/10 py-4 text-center text-sm font-black text-[#6B5E70] outline-none focus:border-[#6B5E70] uppercase" />
                <div className="text-left">
                    <label className="text-[9px] font-black text-[#6B5E70]/40 uppercase ml-2 italic">Fecha de estreno</label>
                    <input type="date" value={nuevaFecha} onChange={(e) => setNuevaFecha(e.target.value)} className="w-full bg-[#FDFCFD] border-b-2 border-[#6B5E70]/10 py-3 text-center text-sm font-black text-[#6B5E70] outline-none" />
                </div>
                <button type="submit" disabled={procesando} className="w-full bg-[#6B5E70] text-white py-4 rounded-2xl font-black uppercase text-[10px] active:scale-95 transition-transform">
                  {procesando ? "Sellando..." : "Revelar"}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* MODAL: EDITAR */}
        {showEditCapModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !procesando && setShowEditCapModal(false)} className="absolute inset-0 bg-[#6B5E70]/20 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl relative z-10 border border-[#6B5E70]/10">
              <button onClick={() => setShowEditCapModal(false)} className="absolute top-8 right-8 text-[#6B5E70]/20 hover:text-[#6B5E70]"><X size={20} /></button>
              <div className="text-center mb-8">
                <h3 className="text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.3em] italic">Gestionar Capítulo</h3>
              </div>
              <form onSubmit={handleUpdateCapitulo} className="space-y-6">
                <input autoFocus type="text" value={editCapTitle} onChange={(e) => setEditCapTitle(e.target.value)} className="w-full bg-[#FDFCFD] border-b-2 border-[#6B5E70]/10 py-4 text-center text-sm font-black text-[#6B5E70] outline-none focus:border-[#6B5E70] uppercase" />
                <input type="date" value={editCapFecha} onChange={(e) => setEditCapFecha(e.target.value)} className="w-full bg-[#FDFCFD] border-b-2 border-[#6B5E70]/10 py-3 text-center text-sm font-black text-[#6B5E70] outline-none" />
                <div className="grid grid-cols-2 gap-3">
                  <button type="submit" disabled={procesando} className="bg-[#6B5E70] text-white py-4 rounded-2xl font-black uppercase text-[9px] flex items-center justify-center gap-2 active:scale-95 transition-transform">
                    <Save size={14} /> Guardar
                  </button>
                  <button type="button" onClick={deleteCapitulo} disabled={procesando} className="bg-red-50 text-red-400 py-4 rounded-2xl font-black uppercase text-[9px] flex items-center justify-center gap-2 border border-red-100 active:scale-95 transition-transform">
                    <Trash2 size={14} /> Borrar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <button onClick={() => router.push("/wiki/libros")} className="p-8 text-[#6B5E70]/40 hover:text-[#6B5E70] flex items-center gap-2 font-black text-[10px] uppercase group italic">
        <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Volver
      </button>

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[320px_1fr] gap-16 mt-4">
        <aside>
          <div className="aspect-[3/4] rounded-[2.5rem] overflow-hidden shadow-2xl border border-[#6B5E70]/10 bg-white relative">
            {loadingLibro ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <Loader2 className="animate-spin text-[#6B5E70]/20" />
              </div>
            ) : (
              <SmartImage src={libro?.portada_url || "/placeholder-cover.jpg"} alt={libro?.titulo || "Libro"} className="w-full h-full" />
            )}
          </div>
          {!loadingLibro && libro?.fecha_proximo_capitulo && (
            <div className="mt-8 p-6 bg-[#6B5E70]/5 rounded-[2rem] border border-[#6B5E70]/10">
               <h4 className="text-[#6B5E70] font-black uppercase text-[9px] tracking-[0.2em] mb-2 flex items-center gap-2 italic"><Calendar size={12} /> Próximo Capítulo</h4>
               <p className="text-[#6B5E70] font-bold text-sm">{new Date(libro.fecha_proximo_capitulo).toLocaleDateString("es-ES", { day: "numeric", month: "long" })}</p>
            </div>
          )}
        </aside>

        <main>
          <div className="mb-12">
            {loadingLibro ? (
              <div className="space-y-4">
                <div className="h-12 w-3/4 bg-[#6B5E70]/5 animate-pulse rounded-xl" />
                <div className="h-20 w-full bg-[#6B5E70]/5 animate-pulse rounded-xl" />
              </div>
            ) : (
              <>
                <h1 className="text-5xl font-black text-[#6B5E70] italic tracking-tighter leading-[0.9] mb-6 uppercase">{libro?.titulo}</h1>
                <p className="text-[#6B5E70]/70 leading-relaxed text-lg font-medium italic">&quot;{libro?.sinopsis}&quot;</p>
              </>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between mb-8 border-b border-[#6B5E70]/10 pb-4">
              <h3 className="text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-2 italic"><ListOrdered size={16} /> Índice</h3>
              {isAdmin && (
                <button onClick={() => setShowAddModal(true)} className="bg-[#6B5E70] text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform"><Plus size={18} /></button>
              )}
            </div>
            
            <div className="grid gap-3">
              {loadingCaps ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="w-full h-24 bg-[#6B5E70]/5 animate-pulse rounded-3xl" />
                ))
              ) : (
                capitulos.map((cap) => (
                  <button 
                    key={cap.id}
                    onClick={() => router.push(`/wiki/libros/${id}/leer/${cap.id}`)}
                    className="w-full flex items-center justify-between p-6 bg-white border border-[#6B5E70]/5 rounded-3xl hover:border-[#6B5E70]/20 transition-all text-left group"
                  >
                    <div className="flex flex-col gap-1">
                        <span className="text-[#6B5E70] font-black uppercase text-[12px] group-hover:translate-x-1 transition-transform">{cap.orden}. {cap.titulo_capitulo}</span>
                        <span className="text-[#6B5E70]/40 font-bold text-[9px] uppercase tracking-wider italic">
                            {new Date(cap.fecha_publicacion) > new Date() ? "Programado: " : "Publicado: "} 
                            {new Date(cap.fecha_publicacion).toLocaleDateString("es-ES")}
                        </span>
                    </div>
                    {isAdmin ? (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCap(cap);
                          setEditCapTitle(cap.titulo_capitulo);
                          setEditCapFecha(cap.fecha_publicacion || "");
                          setShowEditCapModal(true);
                        }} 
                        className="bg-[#6B5E70]/5 p-2 rounded-xl text-[#6B5E70] hover:bg-[#6B5E70] hover:text-white transition-colors"
                      >
                        <Edit3 size={16} />
                      </div>
                    ) : <Play size={14} fill="currentColor" className="text-[#6B5E70]" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}