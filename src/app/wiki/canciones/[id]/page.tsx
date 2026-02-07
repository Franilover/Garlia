"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/api/supabase';
import { 
  ChevronLeft, 
  Plus, 
  Trash2, 
  X, 
  Edit3, 
  Save, 
  User, 
  Sparkles, 
  List, 
  Music,
  EyeOff,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SmartImage } from '@/components/shared/display/SmartImage';

export default function CancionDetalle() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  
  // ESTADOS PRINCIPALES
  const [cancion, setCancion] = useState(null);
  const [secciones, setSecciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [errorAcceso, setErrorAcceso] = useState(false);

  // ESTADOS DE MODALES Y EDICIÓN
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditSecModal, setShowEditSecModal] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaLetra, setNuevaLetra] = useState("");
  const [selectedSec, setSelectedSec] = useState(null);
  const [editSecNombre, setEditSecNombre] = useState("");
  const [editSecLetra, setEditSecLetra] = useState("");
  const [procesando, setProcesando] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      
      // 1. Verificar sesión
      const { data: { session } } = await supabase.auth.getSession();
      const adminStatus = !!session;
      setIsAdmin(adminStatus);

      // 2. Cargar datos de la canción
      const { data: cancionData, error: errorC } = await supabase
        .from('canciones')
        .select('*')
        .eq('id', id)
        .single();
      
      if (errorC || !cancionData) {
        setErrorAcceso(true);
        return;
      }

      // LÓGICA DE PRIVACIDAD
      if (!cancionData.visible && !adminStatus) {
        setErrorAcceso(true);
        setLoading(false);
        return;
      }

      setCancion(cancionData);

      // 3. Cargar secciones
      const { data: seccionesData } = await supabase
        .from('secciones_cancion')
        .select('*')
        .eq('cancion_id', id)
        .order('orden', { ascending: true });
      
      setSecciones(seccionesData || []);
    } catch (err) {
      console.error("Error en la carga:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // FUNCIONES DE GESTIÓN (CORREGIDAS)
  const handleCrearSeccion = async (e) => {
    e.preventDefault();
    if (!nuevoNombre.trim() || !nuevaLetra.trim() || procesando) return;
    setProcesando(true);
    
    // Objeto de inserción explícito
    const datosNuevos = {
      cancion_id: id,
      nombre_seccion: nuevoNombre.toUpperCase(),
      letra: nuevaLetra,
      orden: secciones.length + 1
    };

    const { error } = await supabase
      .from('secciones_cancion')
      .insert([datosNuevos]);

    if (error) {
      console.error("Error de Supabase (400):", error.message, error.details);
      alert("No se pudo guardar la letra. Revisa si la columna 'orden' existe en Supabase.");
    } else {
      setShowAddModal(false);
      setNuevoNombre("");
      setNuevaLetra("");
      fetchData();
    }
    setProcesando(false);
  };

  const handleUpdateSeccion = async (e) => {
    e.preventDefault();
    if (!editSecNombre.trim() || !editSecLetra.trim() || procesando) return;
    setProcesando(true);
    
    const { error } = await supabase
      .from('secciones_cancion')
      .update({ 
        nombre_seccion: editSecNombre.toUpperCase(),
        letra: editSecLetra 
      })
      .eq('id', selectedSec.id);

    if (error) {
      console.error("Error al actualizar:", error.message);
    } else {
      setShowEditSecModal(false);
      fetchData();
    }
    setProcesando(false);
  };

  const deleteSeccion = async () => {
    if (!confirm("¿Deseas eliminar permanentemente esta sección?")) return;
    setProcesando(true);
    const { error } = await supabase.from('secciones_cancion').delete().eq('id', selectedSec.id);
    if (!error) {
      setShowEditSecModal(false);
      fetchData();
    }
    setProcesando(false);
  };

  const openEditSec = (seccion) => {
    setSelectedSec(seccion);
    setEditSecNombre(seccion.nombre_seccion);
    setEditSecLetra(seccion.letra);
    setShowEditSecModal(true);
  };

  const getEstadoColor = (estado) => {
    switch(estado) {
      case 'TERMINADA': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'EN PROCESO': return 'bg-amber-50 text-amber-600 border-amber-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#FDFCFD]">
      <div className="text-center">
        <div className="animate-spin mb-4 text-[#6B5E70]/20 flex justify-center">
          <Music size={32} />
        </div>
        <div className="animate-pulse text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.3em]">
          Afining instruments...
        </div>
      </div>
    </div>
  );

  if (errorAcceso) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#FDFCFD] px-6 text-center">
      <div className="bg-red-50 p-8 rounded-[3rem] border border-red-100 max-w-sm">
        <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
        <h2 className="text-[#6B5E70] font-black uppercase text-sm tracking-widest mb-2">Acceso Restringido</h2>
        <p className="text-[#6B5E70]/60 text-xs leading-relaxed mb-6 font-medium">
          Esta canción aún no ha sido publicada o no tienes permisos para verla.
        </p>
        <button 
          onClick={() => router.push('/wiki/canciones')}
          className="bg-[#6B5E70] text-white px-8 py-3 rounded-full font-black uppercase text-[10px] shadow-lg hover:scale-105 transition-transform"
        >
          Volver al Cancionero
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFCFD] pb-20 relative">
      
      {/* MODAL: NUEVA SECCIÓN */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-[#6B5E70]/20 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl relative z-10 border border-[#6B5E70]/10">
              <button onClick={() => setShowAddModal(false)} className="absolute top-8 right-8 text-[#6B5E70]/20 hover:text-[#6B5E70]"><X size={20} /></button>
              <h3 className="text-center text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.3em] mb-8">Nueva Sección</h3>
              <form onSubmit={handleCrearSeccion} className="space-y-6">
                <div>
                  <label className="text-[9px] font-black text-[#6B5E70]/40 uppercase ml-2">Nombre de la sección</label>
                  <input autoFocus type="text" placeholder="ESTROFA, CORO, PUENTE..." value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} className="w-full bg-[#FDFCFD] border-b-2 border-[#6B5E70]/10 py-4 text-center text-sm font-black text-[#6B5E70] outline-none focus:border-[#6B5E70] uppercase" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-[#6B5E70]/40 uppercase ml-2">Letra</label>
                  <textarea placeholder="Escribe aquí los versos..." value={nuevaLetra} onChange={(e) => setNuevaLetra(e.target.value)} rows={8} className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 rounded-2xl p-4 text-sm text-[#6B5E70] outline-none focus:border-[#6B5E70] resize-none font-medium leading-relaxed" />
                </div>
                <button type="submit" className="w-full bg-[#6B5E70] text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-[#6B5E70]/20">
                  {procesando ? "Guardando..." : "Agregar Sección"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDITAR SECCIÓN */}
      <AnimatePresence>
        {showEditSecModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEditSecModal(false)} className="absolute inset-0 bg-[#6B5E70]/20 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl relative z-10 border border-[#6B5E70]/10">
              <button onClick={() => setShowEditSecModal(false)} className="absolute top-8 right-8 text-[#6B5E70]/20 hover:text-[#6B5E70]"><X size={20} /></button>
              <h3 className="text-center text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.3em] mb-8">Modificar Sección</h3>
              <form onSubmit={handleUpdateSeccion} className="space-y-6">
                <div>
                  <label className="text-[9px] font-black text-[#6B5E70]/40 uppercase ml-2">Nombre</label>
                  <input type="text" value={editSecNombre} onChange={(e) => setEditSecNombre(e.target.value)} className="w-full bg-[#FDFCFD] border-b-2 border-[#6B5E70]/10 py-4 text-center text-sm font-black text-[#6B5E70] outline-none focus:border-[#6B5E70] uppercase" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-[#6B5E70]/40 uppercase ml-2">Letra</label>
                  <textarea value={editSecLetra} onChange={(e) => setEditSecLetra(e.target.value)} rows={8} className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 rounded-2xl p-4 text-sm text-[#6B5E70] outline-none focus:border-[#6B5E70] resize-none font-medium leading-relaxed" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button type="submit" className="bg-[#6B5E70] text-white py-4 rounded-2xl font-black uppercase text-[9px] flex items-center justify-center gap-2 shadow-lg shadow-[#6B5E70]/20"><Save size={14} /> Guardar</button>
                  <button type="button" onClick={deleteSeccion} className="bg-red-50 text-red-400 py-4 rounded-2xl font-black uppercase text-[9px] flex items-center justify-center gap-2 border border-red-100 hover:bg-red-100 transition-colors"><Trash2 size={14} /> Borrar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <button onClick={() => router.push('/wiki/canciones')} className="p-8 text-[#6B5E70]/40 hover:text-[#6B5E70] flex items-center gap-2 font-black text-[10px] uppercase group transition-colors">
        <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Volver al Cancionero
      </button>

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[280px_1fr] gap-16 mt-4">
        <aside className="space-y-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="aspect-square rounded-[2.5rem] overflow-hidden shadow-2xl border border-[#6B5E70]/10 bg-gradient-to-br from-[#6B5E70]/5 to-[#6B5E70]/20">
            <SmartImage src={cancion?.portada_url || "/placeholder-cover.jpg"} alt={cancion?.titulo} className="w-full h-full object-cover" />
          </motion.div>

          {isAdmin && !cancion?.visible && (
            <div className="p-4 bg-slate-800 text-white rounded-[1.5rem] flex items-center justify-center gap-3 shadow-xl">
              <EyeOff size={16} />
              <span className="font-black uppercase text-[9px] tracking-widest">Oculto al público</span>
            </div>
          )}

          {cancion?.estado && (
            <div className={`p-4 rounded-[2rem] border text-center ${getEstadoColor(cancion.estado)}`}>
              <h4 className="font-black uppercase text-[9px] tracking-[0.2em]">{cancion.estado}</h4>
            </div>
          )}

          {cancion?.personaje && (
            <div className="p-6 bg-[#6B5E70]/5 rounded-[2rem] border border-[#6B5E70]/10">
              <h4 className="text-[#6B5E70] font-black uppercase text-[9px] tracking-[0.2em] mb-2 flex items-center gap-2"><User size={12} /> Personaje</h4>
              <p className="text-[#6B5E70] font-bold text-sm">{cancion.personaje}</p>
            </div>
          )}

          {cancion?.inspiracion && (
            <div className="p-6 bg-[#6B5E70]/5 rounded-[2rem] border border-[#6B5E70]/10">
              <h4 className="text-[#6B5E70] font-black uppercase text-[9px] tracking-[0.2em] mb-2 flex items-center gap-2"><Sparkles size={12} /> Inspiración</h4>
              <p className="text-[#6B5E70]/70 text-sm leading-relaxed italic font-medium">&quot;{cancion.inspiracion}&quot;</p>
            </div>
          )}
        </aside>

        <main>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
            <h1 className="text-5xl font-black text-[#6B5E70] italic tracking-tighter leading-[0.9] mb-4 uppercase">{cancion?.titulo}</h1>
            <div className="h-1 w-20 bg-[#6B5E70]/10 rounded-full" />
          </motion.div>

          <div className="space-y-6">
            <div className="flex items-center justify-between mb-8 border-b border-[#6B5E70]/10 pb-4">
              <h3 className="text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-2"><List size={16} /> Letra y Estructura</h3>
              {isAdmin && (
                <button onClick={() => setShowAddModal(true)} className="bg-[#6B5E70] text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform active:scale-90"><Plus size={18} /></button>
              )}
            </div>

            <div className="space-y-8">
              {secciones.map((seccion, index) => (
                <motion.div key={seccion.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="relative group">
                  <div className="bg-white border border-[#6B5E70]/5 rounded-3xl p-8 hover:border-[#6B5E70]/20 transition-all hover:shadow-xl hover:shadow-[#6B5E70]/5">
                    <div className="flex items-center justify-between mb-6">
                      <span className="bg-[#6B5E70]/5 text-[#6B5E70] px-3 py-1 rounded-lg font-black text-[9px] tracking-widest uppercase">{seccion.nombre_seccion}</span>
                      {isAdmin && (
                        <button onClick={() => openEditSec(seccion)} className="bg-[#6B5E70]/5 p-2 rounded-xl text-[#6B5E70] hover:bg-[#6B5E70] hover:text-white transition-colors opacity-0 group-hover:opacity-100"><Edit3 size={14} /></button>
                      )}
                    </div>
                    <div className="text-[#6B5E70] text-base md:text-lg leading-loose font-medium whitespace-pre-wrap font-serif italic">{seccion.letra}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {secciones.length === 0 && (
              <div className="text-center py-20 bg-[#6B5E70]/5 rounded-[3rem] border-2 border-dashed border-[#6B5E70]/10">
                <Music size={48} className="mx-auto text-[#6B5E70]/20 mb-4" />
                <p className="text-[#6B5E70]/40 font-bold uppercase text-sm tracking-widest mb-6">El lienzo está en blanco</p>
                {isAdmin && (
                  <button onClick={() => setShowAddModal(true)} className="bg-[#6B5E70] text-white px-8 py-3 rounded-full font-black uppercase text-[10px] shadow-lg hover:scale-105 transition-transform">Escribir primer verso</button>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}