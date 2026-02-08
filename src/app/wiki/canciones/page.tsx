"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Music, ChevronRight, Plus, Edit3, X, User, Eye, EyeOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/api/supabase';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { SmartImage } from '@/components/shared/display/SmartImage';

const Canciones = () => {
  const { data: canciones, loading, setData: setCanciones } = useSupabaseData('canciones', {
    order: { campo: 'created_at', asc: false }
  });

  const [isAdmin, setIsAdmin] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [listaPersonajes, setListaPersonajes] = useState([]);
  
  const [selectedCancion, setSelectedCancion] = useState(null);
  const [editTitulo, setEditTitulo] = useState("");
  const [editPersonaje, setEditPersonaje] = useState("");
  const [editEstado, setEditEstado] = useState("BORRADOR");
  const [editVisible, setEditVisible] = useState(false);
  
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [nuevoPersonaje, setNuevoPersonaje] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setIsAdmin(true);
    });

    const fetchPersonajes = async () => {
      const { data } = await supabase
        .from('personajes')
        .select('nombre, canciones')
        .order('nombre', { ascending: true });
      if (data) setListaPersonajes(data);
    };
    fetchPersonajes();
  }, []);

  const cancionesAMostrar = isAdmin 
    ? canciones 
    : canciones.filter(c => c.visible === true);

  const openEditModal = (e, cancion) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedCancion(cancion);
    setEditTitulo(cancion.titulo);
    setEditPersonaje(cancion.personaje || "");
    setEditEstado(cancion.estado || "BORRADOR");
    setEditVisible(cancion.visible || false);
    setShowEditModal(true);
  };

  const handleUpdateCancion = async (e) => {
    e.preventDefault();
    if (!editTitulo.trim() || isUpdating) return;
    setIsUpdating(true);

    const linkWiki = `/wiki/canciones/${selectedCancion.id}`;

    const { error: updateError } = await supabase
      .from('canciones')
      .update({ 
        titulo: editTitulo.toUpperCase(),
        personaje: editPersonaje,
        estado: editEstado,
        visible: editVisible 
      })
      .eq('id', selectedCancion.id);

    if (!updateError) {
      if (selectedCancion.personaje && selectedCancion.personaje !== editPersonaje) {
        const pAnterior = listaPersonajes.find(p => p.nombre === selectedCancion.personaje);
        if (pAnterior) {
          const nuevosLinks = (pAnterior.canciones || []).filter(l => l !== linkWiki);
          await supabase.from('personajes').update({ canciones: nuevosLinks }).eq('nombre', pAnterior.nombre);
        }
      }

      if (editPersonaje) {
        const personajeElegido = listaPersonajes.find(p => p.nombre === editPersonaje);
        if (personajeElegido) {
          const cancionesActuales = personajeElegido.canciones || [];
          if (!cancionesActuales.includes(linkWiki)) {
            await supabase
              .from('personajes')
              .update({ canciones: [...cancionesActuales, linkWiki] })
              .eq('nombre', editPersonaje);
          }
        }
      }

      setCanciones(prev => prev.map(c => 
        c.id === selectedCancion.id 
          ? { ...c, titulo: editTitulo.toUpperCase(), personaje: editPersonaje, estado: editEstado, visible: editVisible } 
          : c
      ));
      setShowEditModal(false);
    }
    setIsUpdating(false);
  };

  const handleAddCancion = async (e) => {
    e.preventDefault();
    if (!nuevoTitulo.trim() || isUpdating) return;
    setIsUpdating(true);

    const { data, error } = await supabase.from('canciones').insert([{ 
      titulo: nuevoTitulo.toUpperCase(),
      personaje: nuevoPersonaje || null,
      estado: "BORRADOR",
      portada_url: "/placeholder-cover.jpg",
      visible: false 
    }]).select();

    if (!error && data?.[0]) {
      const nuevaCancion = data[0];
      if (nuevoPersonaje) {
        const p = listaPersonajes.find(per => per.nombre === nuevoPersonaje);
        if (p) {
          const linkWiki = `/wiki/canciones/${nuevaCancion.id}`;
          await supabase
            .from('personajes')
            .update({ canciones: [...(p.canciones || []), linkWiki] })
            .eq('nombre', nuevoPersonaje);
        }
      }

      setCanciones(prev => [nuevaCancion, ...prev]);
      setShowAddModal(false);
      setNuevoTitulo("");
      setNuevoPersonaje("");
    }
    setIsUpdating(false);
  };

  const getEstadoColor = (estado) => {
    switch(estado) {
      case 'TERMINADA': return 'bg-[#6B5E70]/10 text-[#6B5E70] border-[#6B5E70]/20';
      case 'EN PROCESO': return 'bg-[#FDFCFD] text-[#6B5E70]/80 border-[#6B5E70]/10';
      default: return 'bg-[#F4F4F5] text-[#6B5E70]/60 border-[#E4E4E7]';
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#FDFCFD]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-[#6B5E70]" size={32} />
        <div className="text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.3em]">Abriendo Partituras...</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFCFD] pb-20">
      
      {/* MODAL: EDITAR CANCIÓN */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEditModal(false)} className="absolute inset-0 bg-[#6B5E70]/20 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative z-10 border border-[#6B5E70]/10">
              <button onClick={() => setShowEditModal(false)} className="absolute top-8 right-8 text-[#6B5E70]/20 hover:text-[#6B5E70]"><X size={20} /></button>
              <h3 className="text-center text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.3em] mb-8 italic">Modificar Canción</h3>
              <form onSubmit={handleUpdateCancion} className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-[#6B5E70]/5 rounded-2xl border border-[#6B5E70]/10">
                  <div className="flex items-center gap-3">
                    {editVisible ? <Eye size={18} className="text-[#6B5E70]"/> : <EyeOff size={18} className="text-slate-400"/>}
                    <span className="text-[10px] font-black text-[#6B5E70] uppercase tracking-wider italic">Pública</span>
                  </div>
                  <button type="button" onClick={() => setEditVisible(!editVisible)} className={`w-12 h-6 rounded-full transition-colors relative ${editVisible ? 'bg-[#6B5E70]' : 'bg-slate-300'}`}>
                    <motion.div animate={{ x: editVisible ? 24 : 4 }} className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                  </button>
                </div>
                <div>
                  <label className="text-[9px] font-black text-[#6B5E70]/40 uppercase ml-2 italic">Título</label>
                  <input type="text" value={editTitulo} onChange={(e) => setEditTitulo(e.target.value)} className="w-full bg-[#FDFCFD] border-b-2 border-[#6B5E70]/10 py-4 text-center text-sm font-black text-[#6B5E70] outline-none focus:border-[#6B5E70] uppercase" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-[#6B5E70]/40 uppercase ml-2 italic">Personaje</label>
                  <select value={editPersonaje} onChange={(e) => setEditPersonaje(e.target.value)} className="w-full bg-[#FDFCFD] border-b-2 border-[#6B5E70]/10 py-4 text-center text-sm font-medium text-[#6B5E70] outline-none focus:border-[#6B5E70] appearance-none cursor-pointer">
                    <option value="">SIN PERSONAJE</option>
                    {listaPersonajes.map(p => <option key={p.nombre} value={p.nombre}>{p.nombre.toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-[#6B5E70]/40 uppercase ml-2 italic">Estado</label>
                  <select value={editEstado} onChange={(e) => setEditEstado(e.target.value)} className="w-full bg-[#FDFCFD] border-b-2 border-[#6B5E70]/10 py-4 text-center text-sm font-black text-[#6B5E70] outline-none focus:border-[#6B5E70] uppercase">
                    <option value="BORRADOR">BORRADOR</option>
                    <option value="EN PROCESO">EN PROCESO</option>
                    <option value="TERMINADA">TERMINADA</option>
                  </select>
                </div>
                <button type="submit" disabled={isUpdating} className="w-full bg-[#6B5E70] text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg flex justify-center items-center gap-2">
                  {isUpdating ? <Loader2 className="animate-spin" size={14}/> : "Actualizar Canción"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: NUEVA CANCIÓN */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-[#6B5E70]/20 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative z-10 border border-[#6B5E70]/10">
              <button onClick={() => setShowAddModal(false)} className="absolute top-8 right-8 text-[#6B5E70]/20 hover:text-[#6B5E70]"><X size={20} /></button>
              <h3 className="text-center text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.3em] mb-8 italic">Nueva Canción</h3>
              <form onSubmit={handleAddCancion} className="space-y-6">
                <input type="text" placeholder="TÍTULO..." value={nuevoTitulo} onChange={(e) => setNuevoTitulo(e.target.value)} className="w-full bg-[#FDFCFD] border-b-2 border-[#6B5E70]/10 py-4 text-center text-sm font-black text-[#6B5E70] outline-none focus:border-[#6B5E70] uppercase" />
                <select value={nuevoPersonaje} onChange={(e) => setNuevoPersonaje(e.target.value)} className="w-full bg-[#FDFCFD] border-b-2 border-[#6B5E70]/10 py-4 text-center text-sm font-medium text-[#6B5E70] outline-none focus:border-[#6B5E70]">
                  <option value="">SIN PERSONAJE</option>
                  {listaPersonajes.map(p => <option key={p.nombre} value={p.nombre}>{p.nombre.toUpperCase()}</option>)}
                </select>
                <button type="submit" disabled={isUpdating} className="w-full bg-[#6B5E70] text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg">
                  {isUpdating ? "Creando..." : "Crear Canción"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto pt-16 px-6 mb-12 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-[#6B5E70] italic tracking-tighter flex items-center gap-3 uppercase">
            <Music size={32} /> Soliloquios
          </h1>
          <p className="text-[#6B5E70]/50 text-xs font-bold uppercase tracking-widest mt-2 italic">Partituras de Nadiria</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowAddModal(true)} className="bg-[#6B5E70] text-white p-4 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all z-50">
            <Plus size={24} />
          </button>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
        {cancionesAMostrar.map((cancion) => (
          <div key={cancion.id} className="relative group">
            {isAdmin && (
              <div className="absolute top-4 right-4 z-[50] flex gap-2">
                {!cancion.visible && (
                  <div className="bg-[#6B5E70] text-white p-2 px-3 rounded-full text-[8px] font-black uppercase flex items-center gap-1.5 shadow-xl">
                    <EyeOff size={12} /> Oculto
                  </div>
                )}
                <button onClick={(e) => openEditModal(e, cancion)} className="bg-white text-[#6B5E70] p-3 rounded-full shadow-2xl border border-[#6B5E70]/10 hover:scale-110 transition-all">
                  <Edit3 size={16} />
                </button>
              </div>
            )}

            <Link href={`/wiki/canciones/${cancion.id}`}>
              <motion.div whileHover={{ y: -10 }} className="cursor-pointer">
                <div className={`relative aspect-square rounded-[3rem] overflow-hidden shadow-xl border border-[#6B5E70]/10 bg-gradient-to-br from-[#6B5E70]/5 to-[#6B5E70]/20 ${!cancion.visible && isAdmin ? 'grayscale-[0.4] opacity-80' : ''}`}>
                  <SmartImage src={cancion.portada_url || "/placeholder-cover.jpg"} alt={cancion.titulo} className="w-full h-full object-cover" />
                  <div className={`absolute top-6 left-6 z-20 backdrop-blur-md px-4 py-1.5 rounded-full border ${getEstadoColor(cancion.estado)}`}>
                    <span className="text-[9px] font-black uppercase tracking-widest">{cancion.estado}</span>
                  </div>
                  {cancion.personaje && (
                    <div className="absolute bottom-6 right-6 z-20 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#6B5E70]/10 flex items-center gap-1.5">
                      <User size={10} className="text-[#6B5E70]" />
                      <span className="text-[9px] font-bold text-[#6B5E70] italic">{cancion.personaje}</span>
                    </div>
                  )}
                </div>

                <div className="mt-6 px-2 text-center sm:text-left">
                  <h2 className="text-[#6B5E70] font-black uppercase text-base group-hover:text-[#9A89A0] transition-colors leading-tight tracking-tight italic">
                    {cancion.titulo}
                  </h2>
                  <div className="flex items-center gap-4 mt-4 text-[#6B5E70]/30 font-bold text-[9px] uppercase tracking-widest justify-center sm:justify-start">
                    <span className="flex items-center gap-1.5"><Music size={12} /> Letra</span>
                    <span className="flex items-center gap-1.5"><ChevronRight size={12} /> Abrir</span>
                  </div>
                </div>
              </motion.div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Canciones;