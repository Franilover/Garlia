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
  const [idiomaLectura, setIdiomaLectura] = useState('es'); // es, en, jp, romaji

  // Estados Modales
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditSecModal, setShowEditSecModal] = useState(false);
  const [showLinksModal, setShowLinksModal] = useState(false);
  
  // Estados Edición/Creación Secciones (Multidioma)
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaLetraEs, setNuevaLetraEs] = useState("");
  const [nuevaLetraEn, setNuevaLetraEn] = useState("");
  const [nuevaLetraJp, setNuevaLetraJp] = useState("");
  const [nuevaLetraRomaji, setNuevaLetraRomaji] = useState("");

  const [selectedSec, setSelectedSec] = useState(null);
  const [editSecNombre, setEditSecNombre] = useState("");
  const [editSecEs, setEditSecEs] = useState("");
  const [editSecEn, setEditSecEn] = useState("");
  const [editSecJp, setEditSecJp] = useState("");
  const [editSecRomaji, setEditSecRomaji] = useState("");
  
  const [procesando, setProcesando] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      setIsAdmin(!!session);

      const { data: cancionData, error: errorC } = await supabase
        .from('canciones')
        .select('*')
        .eq('id', id)
        .single();
      
      if (errorC || !cancionData) return router.push('/wiki/canciones');
      setCancion(cancionData);

      const { data: seccionesData, error: errorS } = await supabase
        .from('secciones_cancion')
        .select('*')
        .eq('cancion_id', id)
        .order('orden', { ascending: true });
      
      setSecciones(seccionesData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- LÓGICA DE SECCIONES ---
  const handleCrearSeccion = async (e) => {
    e.preventDefault();
    if (!nuevoNombre.trim() || !nuevaLetraEs.trim() || procesando) return;
    setProcesando(true);
    try {
      const { data, error } = await supabase.from('secciones_cancion').insert([{
        cancion_id: id,
        nombre_seccion: nuevoNombre.toUpperCase(),
        letra_es: nuevaLetraEs,
        letra_en: nuevaLetraEn,
        letra_jp: nuevaLetraJp,
        letra_romaji: nuevaLetraRomaji,
        orden: secciones.length + 1
      }]).select();
      if (error) throw error;
      setSecciones(prev => [...prev, data[0]]);
      setShowAddModal(false);
      resetCamposNueva();
    } catch (error) { alert("Error al guardar"); } finally { setProcesando(false); }
  };

  const handleUpdateSeccion = async (e) => {
    e.preventDefault();
    setProcesando(true);
    try {
      const { error } = await supabase.from('secciones_cancion').update({ 
        nombre_seccion: editSecNombre.toUpperCase(),
        letra_es: editSecEs,
        letra_en: editSecEn,
        letra_jp: editSecJp,
        letra_romaji: editSecRomaji
      }).eq('id', selectedSec.id);
      if (error) throw error;
      setSecciones(prev => prev.map(s => s.id === selectedSec.id ? { 
        ...s, 
        nombre_seccion: editSecNombre, 
        letra_es: editSecEs, letra_en: editSecEn, letra_jp: editSecJp, letra_romaji: editSecRomaji 
      } : s));
      setShowEditSecModal(false);
    } catch (error) { alert("Error al actualizar"); } finally { setProcesando(false); }
  };

  const resetCamposNueva = () => {
    setNuevoNombre(""); setNuevaLetraEs(""); setNuevaLetraEn(""); setNuevaLetraJp(""); setNuevaLetraRomaji("");
  };

  const openEditSec = (seccion) => {
    setSelectedSec(seccion);
    setEditSecNombre(seccion.nombre_seccion);
    setEditSecEs(seccion.letra_es || "");
    setEditSecEn(seccion.letra_en || "");
    setEditSecJp(seccion.letra_jp || "");
    setEditSecRomaji(seccion.letra_romaji || "");
    setShowEditSecModal(true);
  };

  // --- HELPERS VISUALES ---
  const getEstadoColor = (estado) => {
    if (estado === 'TERMINADA') return 'bg-[#6B5E70]/10 text-[#6B5E70] border-[#6B5E70]/20';
    if (estado === 'EN PROCESO') return 'bg-[#FDFCFD] text-[#6B5E70]/80 border-[#6B5E70]/10';
    return 'bg-[#F4F4F5] text-[#6B5E70]/60 border-[#E4E4E7]';
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#FDFCFD] text-[#6B5E70] uppercase text-[10px] tracking-widest italic font-black">Cargando...</div>;

  return (
    <div className="min-h-screen bg-[#FDFCFD] pb-20 relative">
      
      {/* MODAL: NUEVA SECCIÓN MULTIDIOMA */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-[#6B5E70]/20 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl relative z-10 border border-[#6B5E70]/10 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <button onClick={() => setShowAddModal(false)} className="absolute top-8 right-8 text-[#6B5E70]/20 hover:text-[#6B5E70]"><X size={20} /></button>
              <h3 className="text-center text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.3em] mb-8 italic">Nueva Sección Multilingüe</h3>
              <form onSubmit={handleCrearSeccion} className="space-y-6">
                <input autoFocus placeholder="NOMBRE SECCIÓN (EJ: CORO)" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} className="w-full bg-[#FDFCFD] border-b-2 border-[#6B5E70]/10 py-4 text-center text-sm font-black text-[#6B5E70] outline-none focus:border-[#6B5E70] uppercase" />
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-[#6B5E70]/40 uppercase ml-2">Español</label>
                    <textarea value={nuevaLetraEs} onChange={(e) => setNuevaLetraEs(e.target.value)} rows={4} className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 rounded-2xl p-4 text-xs text-[#6B5E70] outline-none focus:border-[#6B5E70] resize-none italic" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-[#6B5E70]/40 uppercase ml-2">Inglés</label>
                    <textarea value={nuevaLetraEn} onChange={(e) => setNuevaLetraEn(e.target.value)} rows={4} className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 rounded-2xl p-4 text-xs text-[#6B5E70] outline-none focus:border-[#6B5E70] resize-none italic" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-[#6B5E70]/40 uppercase ml-2">Japonés</label>
                    <textarea value={nuevaLetraJp} onChange={(e) => setNuevaLetraJp(e.target.value)} rows={4} className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 rounded-2xl p-4 text-xs text-[#6B5E70] outline-none focus:border-[#6B5E70] resize-none italic" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-[#6B5E70]/40 uppercase ml-2">Romaji</label>
                    <textarea value={nuevaLetraRomaji} onChange={(e) => setNuevaLetraRomaji(e.target.value)} rows={4} className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 rounded-2xl p-4 text-xs text-[#6B5E70] outline-none focus:border-[#6B5E70] resize-none italic" />
                  </div>
                </div>

                <button type="submit" disabled={procesando} className="w-full bg-[#6B5E70] text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg hover:bg-[#5A4D5F] transition-colors">
                  {procesando ? "Guardando..." : "Agregar Sección"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- REPETIR ESTRUCTURA SIMILAR PARA EL MODAL DE EDICIÓN --- */}

      <button onClick={() => router.push('/wiki/canciones')} className="p-8 text-[#6B5E70]/40 hover:text-[#6B5E70] flex items-center gap-2 font-black text-[10px] uppercase group transition-colors italic">
        <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Volver al Cancionero
      </button>

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[280px_1fr] gap-16 mt-4">
        <aside className="space-y-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="aspect-square rounded-[2.5rem] overflow-hidden shadow-2xl border border-[#6B5E70]/10">
            <SmartImage src={cancion?.portada_url || "/placeholder-cover.jpg"} alt={cancion?.titulo} className="w-full h-full object-cover" />
          </motion.div>

          {/* ESTADO */}
          <div className={`p-4 rounded-[2rem] border text-center ${getEstadoColor(cancion?.estado)} shadow-sm`}>
            <h4 className="font-black uppercase text-[9px] tracking-[0.2em]">{cancion?.estado}</h4>
          </div>

          {/* SELECTOR DE IDIOMA (KARAOKE MODE) */}
          <div className="p-6 bg-[#6B5E70] rounded-[2.5rem] shadow-xl shadow-[#6B5E70]/20">
            <h4 className="text-white/40 font-black uppercase text-[8px] tracking-[0.2em] mb-4 text-center italic">Idioma de lectura</h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'es', label: 'ES' },
                { id: 'en', label: 'EN' },
                { id: 'jp', label: 'JP' },
                { id: 'romaji', label: 'RO' }
              ].map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => setIdiomaLectura(lang.id)}
                  className={`py-2 rounded-xl font-black text-[9px] transition-all ${
                    idiomaLectura === lang.id 
                    ? 'bg-white text-[#6B5E70] scale-105 shadow-md' 
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
            <h1 className="text-6xl font-black text-[#6B5E70] italic tracking-tighter leading-[0.85] mb-6 uppercase">{cancion?.titulo}</h1>
            <div className="h-1.5 w-24 bg-[#6B5E70]/10 rounded-full" />
          </motion.div>

          <div className="space-y-12">
            {secciones.map((seccion, index) => (
              <motion.div key={seccion.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="relative group">
                <div className="bg-white border border-[#6B5E70]/5 rounded-[2.5rem] p-10 hover:border-[#6B5E70]/20 transition-all">
                  <div className="flex items-center justify-between mb-8">
                    <span className="bg-[#F1F5F9] text-[#6B5E70]/60 px-4 py-1.5 rounded-full font-black text-[9px] tracking-widest uppercase italic">{seccion.nombre_seccion}</span>
                    {isAdmin && (
                      <button onClick={() => openEditSec(seccion)} className="bg-[#6B5E70]/5 p-2 rounded-xl text-[#6B5E70] opacity-0 group-hover:opacity-100 transition-all"><Edit3 size={14} /></button>
                    )}
                  </div>
                  
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={idiomaLectura}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="text-[#6B5E70] text-xl md:text-2xl leading-[1.8] font-medium whitespace-pre-wrap italic font-serif opacity-90"
                    >
                      {idiomaLectura === 'es' && seccion.letra_es}
                      {idiomaLectura === 'en' && (seccion.letra_en || "Lyrics not available")}
                      {idiomaLectura === 'jp' && (seccion.letra_jp || "歌詞がありません")}
                      {idiomaLectura === 'romaji' && (seccion.letra_romaji || "No romaji lyrics")}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}