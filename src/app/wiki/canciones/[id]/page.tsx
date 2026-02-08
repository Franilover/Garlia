"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/api/supabase';
import { 
  ChevronLeft, Plus, Trash2, X, Edit3, Save, User, List, Music, 
  EyeOff, AlertCircle, Loader2, ChevronDown, Link2, ExternalLink 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SmartImage } from '@/components/shared/display/SmartImage';

export default function CancionDetalle() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  
  const [cancion, setCancion] = useState(null);
  const [secciones, setSecciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [errorAcceso, setErrorAcceso] = useState(false);

  // Estados Modales
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditSecModal, setShowEditSecModal] = useState(false);
  const [showLinksModal, setShowLinksModal] = useState(false);
  
  // Estados Edición Secciones
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaLetra, setNuevaLetra] = useState("");
  const [selectedSec, setSelectedSec] = useState(null);
  const [editSecNombre, setEditSecNombre] = useState("");
  const [editSecLetra, setEditSecLetra] = useState("");
  
  // Estados Links
  const [nuevoLinkTitulo, setNuevoLinkTitulo] = useState("");
  const [nuevoLinkUrl, setNuevoLinkUrl] = useState("");
  
  const [procesando, setProcesando] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const adminStatus = !!session;
      setIsAdmin(adminStatus);

      const { data: cancionData, error: errorC } = await supabase
        .from('canciones')
        .select('*')
        .eq('id', id)
        .single();
      
      if (errorC || !cancionData) {
        setErrorAcceso(true);
        return;
      }

      if (!cancionData.visible && !adminStatus) {
        setErrorAcceso(true);
        return;
      }

      setCancion(cancionData);

      const { data: seccionesData, error: errorS } = await supabase
        .from('secciones_cancion')
        .select('*')
        .eq('cancion_id', id)
        .order('orden', { ascending: true });
      
      if (errorS) throw errorS;
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

  // --- LÓGICA DE LINKS ---
  const handleAddLink = async (e) => {
    e.preventDefault();
    if (!nuevoLinkTitulo.trim() || !nuevoLinkUrl.trim() || procesando) return;
    setProcesando(true);

    const nuevosLinks = [...(cancion.links || []), { titulo: nuevoLinkTitulo, url: nuevoLinkUrl }];

    try {
      const { error } = await supabase
        .from('canciones')
        .update({ links: nuevosLinks })
        .eq('id', id);

      if (error) throw error;
      setCancion(prev => ({ ...prev, links: nuevosLinks }));
      setNuevoLinkTitulo("");
      setNuevoLinkUrl("");
    } catch (error) {
      alert("Error al añadir link: " + error.message);
    } finally {
      setProcesando(false);
    }
  };

  const removeLink = async (index) => {
    const filtrados = cancion.links.filter((_, i) => i !== index);
    try {
      const { error } = await supabase
        .from('canciones')
        .update({ links: filtrados })
        .eq('id', id);
      if (error) throw error;
      setCancion(prev => ({ ...prev, links: filtrados }));
    } catch (error) {
      alert("Error al borrar link");
    }
  };

  // --- RESTO DE FUNCIONES (ESTADO, SECCIONES) ---
  const handleUpdateEstado = async (nuevoEstado) => {
    try {
      setCancion(prev => ({ ...prev, estado: nuevoEstado }));
      const { error } = await supabase.from('canciones').update({ estado: nuevoEstado }).eq('id', id);
      if (error) throw error;
    } catch (error) {
      fetchData();
    }
  };

  const handleCrearSeccion = async (e) => {
    e.preventDefault();
    if (!nuevoNombre.trim() || !nuevaLetra.trim() || procesando) return;
    setProcesando(true);
    try {
      const { data, error } = await supabase.from('secciones_cancion').insert([{
        cancion_id: id,
        nombre_seccion: nuevoNombre.toUpperCase(),
        letra: nuevaLetra,
        orden: secciones.length + 1
      }]).select();
      if (error) throw error;
      setSecciones(prev => [...prev, data[0]]);
      setShowAddModal(false);
      setNuevoNombre("");
      setNuevaLetra("");
    } catch (error) {
      alert("Error al guardar");
    } finally { setProcesando(false); }
  };

  const handleUpdateSeccion = async (e) => {
    e.preventDefault();
    if (!editSecNombre.trim() || !editSecLetra.trim() || procesando) return;
    setProcesando(true);
    try {
      const { error } = await supabase.from('secciones_cancion').update({ 
        nombre_seccion: editSecNombre.toUpperCase(),
        letra: editSecLetra 
      }).eq('id', selectedSec.id);
      if (error) throw error;
      setSecciones(prev => prev.map(s => s.id === selectedSec.id ? { ...s, nombre_seccion: editSecNombre.toUpperCase(), letra: editSecLetra } : s));
      setShowEditSecModal(false);
    } catch (error) { alert("Error al actualizar"); } finally { setProcesando(false); }
  };

  const deleteSeccion = async () => {
    if (!confirm("¿Borrar sección?")) return;
    try {
      await supabase.from('secciones_cancion').delete().eq('id', selectedSec.id);
      setSecciones(prev => prev.filter(s => s.id !== selectedSec.id));
      setShowEditSecModal(false);
    } catch (error) { alert("Error"); }
  };

  const openEditSec = (seccion) => {
    setSelectedSec(seccion);
    setEditSecNombre(seccion.nombre_seccion);
    setEditSecLetra(seccion.letra);
    setShowEditSecModal(true);
  };

  const getEstadoColor = (estado) => {
    switch(estado) {
      case 'TERMINADA': return 'bg-[#6B5E70]/10 text-[#6B5E70] border-[#6B5E70]/20';
      case 'EN PROCESO': return 'bg-[#FDFCFD] text-[#6B5E70]/80 border-[#6B5E70]/10';
      default: return 'bg-[#F4F4F5] text-[#6B5E70]/60 border-[#E4E4E7]';
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#FDFCFD] text-[#6B5E70] uppercase text-[10px] tracking-widest italic font-black">Afining instruments...</div>;

  return (
    <div className="min-h-screen bg-[#FDFCFD] pb-20 relative">
      
      {/* MODAL: GESTIÓN DE LINKS */}
      <AnimatePresence>
        {showLinksModal && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLinksModal(false)} className="absolute inset-0 bg-[#6B5E70]/20 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative z-10 border border-[#6B5E70]/10">
              <button onClick={() => setShowLinksModal(false)} className="absolute top-8 right-8 text-[#6B5E70]/20 hover:text-[#6B5E70]"><X size={20} /></button>
              <h3 className="text-center text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.3em] mb-8 italic">Gestionar Enlaces</h3>
              
              <form onSubmit={handleAddLink} className="space-y-4 mb-8">
                <input type="text" placeholder="TÍTULO (EJ: COVER YOUTUBE)" value={nuevoLinkTitulo} onChange={(e) => setNuevoLinkTitulo(e.target.value)} className="w-full bg-[#FDFCFD] border-b border-[#6B5E70]/10 py-3 text-sm font-bold text-[#6B5E70] outline-none focus:border-[#6B5E70] uppercase" />
                <input type="url" placeholder="URL DEL ENLACE..." value={nuevoLinkUrl} onChange={(e) => setNuevoLinkUrl(e.target.value)} className="w-full bg-[#FDFCFD] border-b border-[#6B5E70]/10 py-3 text-sm font-medium text-[#6B5E70] outline-none focus:border-[#6B5E70]" />
                <button type="submit" className="w-full bg-[#6B5E70] text-white py-3 rounded-xl font-black uppercase text-[9px] shadow-md hover:bg-[#5A4D5F]">Añadir Link</button>
              </form>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {cancion?.links?.map((link, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-[#6B5E70]/5 rounded-xl border border-[#6B5E70]/10">
                    <span className="text-[10px] font-black text-[#6B5E70] truncate uppercase italic">{link.titulo}</span>
                    <button onClick={() => removeLink(i)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14}/></button>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: NUEVA SECCIÓN */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-[#6B5E70]/20 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl relative z-10 border border-[#6B5E70]/10">
              <button onClick={() => setShowAddModal(false)} className="absolute top-8 right-8 text-[#6B5E70]/20 hover:text-[#6B5E70]"><X size={20} /></button>
              <h3 className="text-center text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.3em] mb-8 italic">Nueva Sección</h3>
              <form onSubmit={handleCrearSeccion} className="space-y-6">
                <input autoFocus type="text" placeholder="ESTROFA, CORO, PUENTE..." value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} className="w-full bg-[#FDFCFD] border-b-2 border-[#6B5E70]/10 py-4 text-center text-sm font-black text-[#6B5E70] outline-none focus:border-[#6B5E70] uppercase" />
                <textarea placeholder="Escribe aquí los versos..." value={nuevaLetra} onChange={(e) => setNuevaLetra(e.target.value)} rows={8} className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 rounded-2xl p-4 text-sm text-[#6B5E70] outline-none focus:border-[#6B5E70] resize-none font-medium leading-relaxed italic" />
                <button type="submit" disabled={procesando} className="w-full bg-[#6B5E70] text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg">
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
              <h3 className="text-center text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.3em] mb-8 italic">Modificar Sección</h3>
              <form onSubmit={handleUpdateSeccion} className="space-y-6">
                <input type="text" value={editSecNombre} onChange={(e) => setEditSecNombre(e.target.value)} className="w-full bg-[#FDFCFD] border-b-2 border-[#6B5E70]/10 py-4 text-center text-sm font-black text-[#6B5E70] outline-none focus:border-[#6B5E70] uppercase" />
                <textarea value={editSecLetra} onChange={(e) => setEditSecLetra(e.target.value)} rows={8} className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 rounded-2xl p-4 text-sm text-[#6B5E70] outline-none focus:border-[#6B5E70] resize-none font-medium leading-relaxed italic" />
                <div className="grid grid-cols-2 gap-3">
                  <button type="submit" disabled={procesando} className="bg-[#6B5E70] text-white py-4 rounded-2xl font-black uppercase text-[9px] flex items-center justify-center gap-2 shadow-lg"><Save size={14} /> Guardar</button>
                  <button type="button" onClick={deleteSeccion} className="bg-red-50 text-red-400 py-4 rounded-2xl font-black uppercase text-[9px] flex items-center justify-center gap-2 border border-red-100"><Trash2 size={14} /> Borrar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <button onClick={() => router.push('/wiki/canciones')} className="p-8 text-[#6B5E70]/40 hover:text-[#6B5E70] flex items-center gap-2 font-black text-[10px] uppercase group transition-colors italic">
        <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Volver al Cancionero
      </button>

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[280px_1fr] gap-16 mt-4">
        <aside className="space-y-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="aspect-square rounded-[2.5rem] overflow-hidden shadow-2xl border border-[#6B5E70]/10">
            <SmartImage src={cancion?.portada_url || "/placeholder-cover.jpg"} alt={cancion?.titulo} className="w-full h-full object-cover" />
          </motion.div>

          {isAdmin && !cancion?.visible && (
            <div className="p-4 bg-[#604b68] text-white rounded-[1.5rem] flex items-center justify-center gap-3 shadow-xl">
              <EyeOff size={16} />
              <span className="font-black uppercase text-[9px] tracking-widest italic">Oculto</span>
            </div>
          )}

          {/* ESTADO EDITABLE */}
          {cancion?.estado && (
            <div className={`relative p-4 rounded-[2rem] border text-center ${getEstadoColor(cancion.estado)} shadow-sm transition-all`}>
              {isAdmin ? (
                <div className="flex items-center justify-center gap-2">
                  <select 
                    value={cancion.estado} 
                    onChange={(e) => handleUpdateEstado(e.target.value)}
                    className="bg-transparent font-black uppercase text-[9px] tracking-[0.2em] outline-none cursor-pointer appearance-none text-center w-full"
                  >
                    <option value="BORRADOR">BORRADOR</option>
                    <option value="EN PROCESO">EN PROCESO</option>
                    <option value="TERMINADA">TERMINADA</option>
                  </select>
                  <ChevronDown size={10} className="absolute right-6 opacity-40" />
                </div>
              ) : (
                <h4 className="font-black uppercase text-[9px] tracking-[0.2em]">{cancion.estado}</h4>
              )}
            </div>
          )}

          {cancion?.personaje && (
            <div className="p-6 bg-[#6B5E70]/5 rounded-[2rem] border border-[#6B5E70]/10">
              <h4 className="text-[#6B5E70] font-black uppercase text-[9px] tracking-[0.2em] mb-2 flex items-center gap-2 italic"><User size={12} /> Personaje</h4>
              <p className="text-[#6B5E70] font-bold text-sm italic">{cancion.personaje}</p>
            </div>
          )}

          {/* SECCIÓN DE LINKS VISUAL */}
          <div className="p-6 bg-[#6B5E70]/5 rounded-[2rem] border border-[#6B5E70]/10">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[#6B5E70] font-black uppercase text-[9px] tracking-[0.2em] flex items-center gap-2 italic"><Link2 size={12} /> Enlaces</h4>
              {isAdmin && (
                <button onClick={() => setShowLinksModal(true)} className="text-[#6B5E70]/40 hover:text-[#6B5E70] transition-colors"><Plus size={14}/></button>
              )}
            </div>
            <div className="space-y-2">
              {cancion?.links && cancion.links.length > 0 ? (
                cancion.links.map((link, idx) => (
                  <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#6B5E70]/10 hover:border-[#6B5E70] transition-all group">
                    <span className="text-[10px] font-bold text-[#6B5E70] uppercase italic truncate mr-2">{link.titulo}</span>
                    <ExternalLink size={10} className="text-[#6B5E70]/30 group-hover:text-[#6B5E70]" />
                  </a>
                ))
              ) : (
                <p className="text-[#6B5E70]/30 text-[9px] font-bold uppercase italic text-center py-2">Sin referencias</p>
              )}
            </div>
          </div>
        </aside>

        <main>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
            <h1 className="text-6xl font-black text-[#6B5E70] italic tracking-tighter leading-[0.85] mb-6 uppercase">{cancion?.titulo}</h1>
            <div className="h-1.5 w-24 bg-[#6B5E70]/10 rounded-full" />
          </motion.div>

          <div className="space-y-6">
            <div className="flex items-center justify-between mb-8 border-b border-[#6B5E70]/10 pb-4">
              <h3 className="text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-2 italic"><List size={16} /> Letra</h3>
              {isAdmin && (
                <button onClick={() => setShowAddModal(true)} className="bg-[#6B5E70] text-white p-2 rounded-full shadow-lg hover:scale-110 active:scale-90 transition-transform"><Plus size={18} /></button>
              )}
            </div>

            <div className="space-y-12">
              {secciones.map((seccion, index) => (
                <motion.div key={seccion.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="relative group">
                  <div className="bg-white border border-[#6B5E70]/5 rounded-[2.5rem] p-10 hover:border-[#6B5E70]/20 transition-all hover:shadow-2xl hover:shadow-[#6B5E70]/5">
                    <div className="flex items-center justify-between mb-8">
                      <span className="bg-[#F1F5F9] text-[#6B5E70]/60 px-4 py-1.5 rounded-full font-black text-[9px] tracking-widest uppercase italic">{seccion.nombre_seccion}</span>
                      {isAdmin && (
                        <button onClick={() => openEditSec(seccion)} className="bg-[#6B5E70]/5 p-2 rounded-xl text-[#6B5E70] hover:bg-[#6B5E70] hover:text-white transition-colors opacity-0 group-hover:opacity-100"><Edit3 size={14} /></button>
                      )}
                    </div>
                    <div className="text-[#6B5E70] text-xl md:text-2xl leading-[1.8] font-medium whitespace-pre-wrap italic font-serif opacity-90">
                      {seccion.letra}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {secciones.length === 0 && (
              <div className="text-center py-24 bg-[#6B5E70]/5 rounded-[3rem] border-2 border-dashed border-[#6B5E70]/10">
                <Music size={48} className="mx-auto text-[#6B5E70]/20 mb-4" />
                <p className="text-[#6B5E70]/40 font-bold uppercase text-sm tracking-widest mb-6 italic">El lienzo está en blanco</p>
                {isAdmin && (
                  <button onClick={() => setShowAddModal(true)} className="bg-[#6B5E70] text-white px-8 py-3 rounded-full font-black uppercase text-[10px] shadow-lg">Escribir primer verso</button>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}