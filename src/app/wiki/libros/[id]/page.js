"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/api/supabase';
import { ChevronLeft, Play, ListOrdered, Plus, Trash2, X, Edit3, Save, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LibroDetalle() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  
  const [libro, setLibro] = useState(null);
  const [capitulos, setCapitulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Modales
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditCapModal, setShowEditCapModal] = useState(false);
  
  // Estados de inputs
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [nuevaFecha, setNuevaFecha] = useState(new Date().toISOString().split('T')[0]); // Fecha actual por defecto
  const [selectedCap, setSelectedCap] = useState(null);
  const [editCapTitle, setEditCapTitle] = useState("");
  const [editCapFecha, setEditCapFecha] = useState("");
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    const fetchDatosLibro = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (session) setIsAdmin(true);

        const { data: libroData, error: libroError } = await supabase.from('libros').select('*').eq('id', id);
        if (libroError || !libroData?.length) throw new Error("Archivo no encontrado.");
        setLibro(libroData[0]);

        // Seleccionamos también la nueva columna fecha_publicacion
        const { data: capsData } = await supabase.from('capitulos')
          .select('id, titulo_capitulo, orden, fecha_publicacion')
          .eq('libro_id', id)
          .order('orden', { ascending: true });
        setCapitulos(capsData || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDatosLibro();
  }, [id]);

  // CREAR CAPÍTULO
  const handleCrearCapitulo = async (e) => {
    e.preventDefault();
    if (!nuevoTitulo.trim() || procesando) return;
    setProcesando(true);
    const { error } = await supabase.from('capitulos').insert([{ 
      libro_id: id, 
      titulo_capitulo: nuevoTitulo.toUpperCase(), 
      orden: capitulos.length + 1, 
      contenido: "Nueva crónica...",
      fecha_publicacion: nuevaFecha // Guardamos la fecha
    }]);
    if (!error) window.location.reload();
    setProcesando(false);
  };

  // EDITAR CAPÍTULO
  const handleUpdateCapitulo = async (e) => {
    e.preventDefault();
    if (!editCapTitle.trim() || procesando) return;
    setProcesando(true);
    const { error } = await supabase.from('capitulos').update({ 
        titulo_capitulo: editCapTitle.toUpperCase(),
        fecha_publicacion: editCapFecha 
    }).eq('id', selectedCap.id);
    if (!error) window.location.reload();
    setProcesando(false);
  };

  // BORRAR CAPÍTULO
  const deleteCapitulo = async () => {
    if (!confirm("¿Deseas eliminar permanentemente este capítulo?")) return;
    setProcesando(true);
    const { error } = await supabase.from('capitulos').delete().eq('id', selectedCap.id);
    if (!error) window.location.reload();
    setProcesando(false);
  };

  const openEditCap = (e, cap) => {
    e.stopPropagation();
    setSelectedCap(cap);
    setEditCapTitle(cap.titulo_capitulo);
    setEditCapFecha(cap.fecha_publicacion || "");
    setShowEditCapModal(true);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#FDFCFD] text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.3em]">"Consultando archivos..."</div>;

  return (
    <div className="min-h-screen bg-[#FDFCFD] pb-20 relative">
      
      {/* MODAL: NUEVO CAPÍTULO */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-[#6B5E70]/20 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl relative z-10 border border-[#6B5E70]/10 text-center">
              <button onClick={() => setShowAddModal(false)} className="absolute top-8 right-8 text-[#6B5E70]/20 hover:text-[#6B5E70]"><X size={20} /></button>
              <h3 className="text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.3em] mb-8">"Nuevo Capítulo"</h3>
              <form onSubmit={handleCrearCapitulo} className="space-y-6">
                <input autoFocus type="text" placeholder="TÍTULO..." value={nuevoTitulo} onChange={(e) => setNuevoTitulo(e.target.value)} className="w-full bg-[#FDFCFD] border-b-2 border-[#6B5E70]/10 py-4 text-center text-sm font-black text-[#6B5E70] outline-none focus:border-[#6B5E70] uppercase" />
                <div className="text-left">
                    <label className="text-[9px] font-black text-[#6B5E70]/40 uppercase ml-2">Fecha de estreno</label>
                    <input type="date" value={nuevaFecha} onChange={(e) => setNuevaFecha(e.target.value)} className="w-full bg-[#FDFCFD] border-b-2 border-[#6B5E70]/10 py-3 text-center text-sm font-black text-[#6B5E70] outline-none" />
                </div>
                <button type="submit" className="w-full bg-[#6B5E70] text-white py-4 rounded-2xl font-black uppercase text-[10px]">{procesando ? "Sellando..." : "Revelar"}</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDITAR / BORRAR CAPÍTULO */}
      <AnimatePresence>
        {showEditCapModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEditCapModal(false)} className="absolute inset-0 bg-[#6B5E70]/20 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl relative z-10 border border-[#6B5E70]/10">
              <button onClick={() => setShowEditCapModal(false)} className="absolute top-8 right-8 text-[#6B5E70]/20 hover:text-[#6B5E70]"><X size={20} /></button>
              <div className="text-center mb-8">
                <h3 className="text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.3em]">"Gestionar Capítulo"</h3>
              </div>
              <form onSubmit={handleUpdateCapitulo} className="space-y-6">
                <input autoFocus type="text" value={editCapTitle} onChange={(e) => setEditCapTitle(e.target.value)} className="w-full bg-[#FDFCFD] border-b-2 border-[#6B5E70]/10 py-4 text-center text-sm font-black text-[#6B5E70] outline-none focus:border-[#6B5E70] uppercase" />
                <input type="date" value={editCapFecha} onChange={(e) => setEditCapFecha(e.target.value)} className="w-full bg-[#FDFCFD] border-b-2 border-[#6B5E70]/10 py-3 text-center text-sm font-black text-[#6B5E70] outline-none" />
                
                <div className="grid grid-cols-2 gap-3">
                  <button type="submit" className="bg-[#6B5E70] text-white py-4 rounded-2xl font-black uppercase text-[9px] flex items-center justify-center gap-2">
                    <Save size={14} /> Guardar
                  </button>
                  <button type="button" onClick={deleteCapitulo} className="bg-red-50 text-red-400 py-4 rounded-2xl font-black uppercase text-[9px] flex items-center justify-center gap-2 border border-red-100">
                    <Trash2 size={14} /> Borrar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <button onClick={() => router.push('/libros')} className="p-8 text-[#6B5E70]/40 hover:text-[#6B5E70] flex items-center gap-2 font-black text-[10px] uppercase group">
        <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> "Volver"
      </button>

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[320px_1fr] gap-16 mt-4">
        <aside>
          <div className="aspect-[3/4] rounded-[2.5rem] overflow-hidden shadow-2xl border border-[#6B5E70]/10 bg-white">
            <img src={libro?.portada_url || "/placeholder-cover.jpg"} alt={libro?.titulo} className="w-full h-full object-cover" />
          </div>
          
          {/* COMPONENTE: PRÓXIMO CAPÍTULO */}
          {libro?.fecha_proximo_capitulo && (
            <div className="mt-8 p-6 bg-[#6B5E70]/5 rounded-[2rem] border border-[#6B5E70]/10">
               <h4 className="text-[#6B5E70] font-black uppercase text-[9px] tracking-[0.2em] mb-2 flex items-center gap-2">
                 <Calendar size={12} /> Próximo Capitulo
               </h4>
               <p className="text-[#6B5E70] font-bold text-sm">
                 {new Date(libro.fecha_proximo_capitulo).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
               </p>
            </div>
          )}
        </aside>

        <main>
          <div className="mb-12">
            <h1 className="text-5xl font-black text-[#6B5E70] italic tracking-tighter leading-[0.9] mb-6 uppercase">{libro?.titulo}</h1>
            <p className="text-[#6B5E70]/70 leading-relaxed text-lg font-medium italic">"{libro?.sinopsis}"</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between mb-8 border-b border-[#6B5E70]/10 pb-4">
              <h3 className="text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-2"><ListOrdered size={16} /> Índice</h3>
              {isAdmin && (
                <button onClick={() => setShowAddModal(true)} className="bg-[#6B5E70] text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform"><Plus size={18} /></button>
              )}
            </div>
            
            <div className="grid gap-3">
              {capitulos.map((cap) => (
                <div key={cap.id} className="relative group">
                  <button 
                    onClick={() => router.push(`/libros/${id}/leer/${cap.id}`)}
                    className="w-full flex items-center justify-between p-6 bg-white border border-[#6B5E70]/5 rounded-3xl hover:border-[#6B5E70]/20 transition-all text-left"
                  >
                    <div className="flex flex-col gap-1">
                        <span className="text-[#6B5E70] font-black uppercase text-[12px]">{cap.orden}. {cap.titulo_capitulo}</span>
                        {/* FECHA DE PUBLICACIÓN DEL CAPÍTULO */}
                        <span className="text-[#6B5E70]/40 font-bold text-[9px] uppercase tracking-wider">
                           Publicado el {new Date(cap.fecha_publicacion).toLocaleDateString('es-ES')}
                        </span>
                    </div>
                    
                    {isAdmin ? (
                      <div 
                        onClick={(e) => openEditCap(e, cap)}
                        className="bg-[#6B5E70]/5 p-2 rounded-xl text-[#6B5E70] hover:bg-[#6B5E70] hover:text-white transition-colors"
                      >
                        <Edit3 size={16} />
                      </div>
                    ) : (
                      <Play size={14} fill="currentColor" className="text-[#6B5E70]" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}