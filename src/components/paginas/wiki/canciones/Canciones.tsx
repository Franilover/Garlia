"use client";

import React, { useState, useEffect, useReducer, useCallback, useMemo } from "react";
import Link from "next/link";
import { 
  Music, 
  ChevronRight, 
  Plus, 
  Edit3, 
  X, 
  User, 
  Eye, 
  EyeOff, 
  Loader2, 
  Save, 
  Trash2, 
  Globe, 
  Mic2, 
  PenTool, 
  LayoutGrid, 
  AlignJustify, 
  Search, 
  Youtube, 
  Link2, 
  ExternalLink, 
  AlertCircle,
  Headphones
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/api/client/supabase";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { SmartImage } from "@/components/shared/display/SmartImage";
import { useFiltrosGenericos } from "@/hooks/features/useFiltros";
import FiltrosMaestros from "@/components/shared/forms/Filtros";

// ============================================================================
// CONSTANTES Y CONFIGURACIÓN
// ============================================================================

const ESTADOS = ["BORRADOR", "EN PROCESO", "TERMINADA"];
const IDIOMAS_DISPONIBLES = ["Español", "Inglés", "Japonés", "Instrumental", "Otro"];
const FILTROS_CONFIG = { campos: ["cantante", "compositor", "idioma"] };

const getEstadoColor = (estado: string) => {
  const colores: Record<string, string> = {
    "TERMINADA": "bg-emerald-500/10 text-emerald-700 border-emerald-300/30 shadow-[0_4px_12px_rgba(16,185,129,0.1)]",
    "EN PROCESO": "bg-amber-500/10 text-amber-700 border-amber-300/30 shadow-[0_4px_12px_rgba(245,158,11,0.1)]",
    "BORRADOR": "bg-slate-500/10 text-slate-500 border-slate-200"
  };
  return colores[estado] || colores["BORRADOR"];
};

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

const CancionCard = ({ cancion, isAdmin, onEdit, onDelete, vistaFila }: any) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-white group rounded-[3rem] border border-[#6B5E70]/5 overflow-hidden hover:shadow-[0_40px_80px_-15px_rgba(107,94,112,0.12)] transition-all duration-700 ${
        vistaFila ? "flex items-center p-6 gap-8" : "flex flex-col"
      }`}
    >
      <div className={`relative overflow-hidden shrink-0 ${vistaFila ? "w-40 h-40" : "aspect-4/5"} rounded-[2.5rem] shadow-2xl`}>
        <SmartImage 
          src={cancion.portada_url || "/placeholder-cover.jpg"} 
          alt={cancion.titulo} 
          className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 group-hover:scale-110 transition-all duration-1000 ease-out"
        />
        <div className="absolute top-6 left-6 flex flex-col gap-2">
          <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-[0.2em] border backdrop-blur-md transition-all ${getEstadoColor(cancion.estado)}`}>
            {cancion.estado}
          </span>
        </div>
        {!cancion.visible && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
            <EyeOff size={24} className="text-white opacity-60" />
          </div>
        )}
      </div>

      <div className={`flex flex-col flex-1 ${vistaFila ? "py-2" : "p-10"}`}>
        <div className="flex justify-between items-start gap-4 mb-6">
          <div className="space-y-1">
            <h3 className="text-3xl font-serif italic font-light text-[#6B5E70] leading-tight group-hover:text-black transition-colors duration-500">
              {cancion.titulo}
            </h3>
            <div className="flex items-center gap-3 opacity-30 group-hover:opacity-60 transition-opacity">
              <User size={12} className="text-[#6B5E70]" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">{cancion.personaje}</span>
            </div>
          </div>
          
          <Link href={`/wiki/canciones/${cancion.id}`}>
            <motion.div 
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="p-4 rounded-full bg-[#6B5E70]/5 text-[#6B5E70] group-hover:bg-[#6B5E70] group-hover:text-white transition-all shadow-sm"
            >
              <ChevronRight size={20} />
            </motion.div>
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {cancion.cantante && (
            <div className="flex items-center gap-2 px-4 py-2 bg-[#6B5E70]/5 rounded-full border border-[#6B5E70]/5 group-hover:border-[#6B5E70]/10 transition-colors">
              <Mic2 size={10} className="text-[#6B5E70] opacity-40" />
              <span className="text-[9px] font-bold uppercase opacity-60 tracking-tighter">{cancion.cantante}</span>
            </div>
          )}
          {cancion.compositor && (
            <div className="flex items-center gap-2 px-4 py-2 bg-[#6B5E70]/5 rounded-full border border-[#6B5E70]/5 group-hover:border-[#6B5E70]/10 transition-colors">
              <Headphones size={10} className="text-[#6B5E70] opacity-40" />
              <span className="text-[9px] font-bold uppercase opacity-60 tracking-tighter">{cancion.compositor}</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100">
            <Globe size={10} className="opacity-30" />
            <span className="text-[9px] font-bold uppercase opacity-40">{cancion.idioma}</span>
          </div>
        </div>

        {isAdmin && (
          <div className="mt-auto pt-6 border-t border-[#6B5E70]/5 flex items-center justify-between">
            <div className="flex gap-1">
              <button 
                onClick={() => onEdit(cancion)}
                className="p-3 rounded-2xl hover:bg-amber-50 text-amber-600 transition-all hover:scale-110 active:scale-90"
                title="Editar Canción"
              >
                <Edit3 size={16} />
              </button>
              <button 
                onClick={() => onDelete(cancion.id)}
                className="p-3 rounded-2xl hover:bg-red-50 text-red-600 transition-all hover:scale-110 active:scale-90"
                title="Eliminar Canción"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="flex items-center gap-4 opacity-20 group-hover:opacity-100 transition-all">
               {cancion.links?.youtube && <Youtube size={14} className="text-red-500" />}
               {cancion.links?.spotify && <Music size={14} className="text-green-500" />}
               <span className="text-[8px] font-black uppercase tracking-widest">
                 {new Date(cancion.created_at).getFullYear()}
               </span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ============================================================================
// REDUCER DE FORMULARIO
// ============================================================================

const formReducer = (state: any, action: any) => {
  switch (action.type) {
    case "SET_FIELD": 
      return { ...state, [action.field]: action.value };
    case "SET_LINK": 
      return { ...state, links: { ...state.links, [action.field]: action.value } };
    case "RESET": 
      return {
        titulo: "", 
        personaje: "", 
        cantante: "", 
        compositor: "",
        idioma: "Español", 
        estado: "BORRADOR", 
        portada_url: "",
        links: { youtube: "", spotify: "" }, 
        visible: true
      };
    case "EDIT": 
      return { 
        ...action.payload, 
        links: action.payload.links || { youtube: "", spotify: "" } 
      };
    default: 
      return state;
  }
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function CancionesPage() {
  const { data: canciones, setData: setCanciones, loading, error: dbError } = useSupabaseData("canciones");
  const [isAdmin, setIsAdmin] = useState(false);
  
  // UI States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [vistaGrid, setVistaGrid] = useState(true);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [query, setQuery] = useState(""); 

  // Configuración dinámica de opciones para el Filtro Maestro
  const configFiltros = useMemo(() => {
    return {
      cantante: Array.from(new Set(canciones.map((c: any) => c.cantante).filter(Boolean))) as string[],
      compositor: Array.from(new Set(canciones.map((c: any) => c.compositor).filter(Boolean))) as string[],
      idioma: IDIOMAS_DISPONIBLES
    };
  }, [canciones]);

  // Hook de filtros genéricos con la configuración original
  const { 
    filtros, 
    actualizarFiltro, 
    resetearFiltros, 
    itemsFiltrados 
  } = useFiltrosGenericos(canciones, FILTROS_CONFIG);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAdmin(!!session);
    };
    checkUser();
  }, []);

  // Lógica de búsqueda combinada con los filtros del hook
  const cancionesFinales = useMemo(() => {
    let filtradas = itemsFiltrados;
    if (query) {
      const lowQuery = query.toLowerCase();
      filtradas = filtradas.filter((c: any) => 
        c.titulo?.toLowerCase().includes(lowQuery) || 
        c.personaje?.toLowerCase().includes(lowQuery) ||
        c.cantante?.toLowerCase().includes(lowQuery) ||
        c.compositor?.toLowerCase().includes(lowQuery)
      );
    }
    return filtradas;
  }, [itemsFiltrados, query]);

  const [form, dispatchForm] = useReducer(formReducer, {
    titulo: "", 
    personaje: "", 
    cantante: "", 
    compositor: "",
    idioma: "Español", 
    estado: "BORRADOR", 
    portada_url: "",
    links: { youtube: "", spotify: "" }, 
    visible: true
  });

  // --- HANDLERS ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    try {
      setIsSaving(true);
      setErrorLocal(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Solo Franilover tiene acceso para modificar los archivos.");

      const payload = {
        ...form,
        user_id: user.id,
        updated_at: new Date().toISOString()
      };

      if (editId) {
        // Actualizar registro existente
        const { error } = await supabase.from("canciones").update(payload).eq("id", editId);
        if (error) throw error;
        
        // Optimistic UI Update
        setCanciones(canciones.map((c: any) => c.id === editId ? { ...c, ...payload } : c));
      } else {
        // Insertar nuevo registro con ID generado en cliente para prevenir bugs de red
        const nuevoId = crypto.randomUUID();
        const { error } = await supabase.from("canciones").insert([{ ...payload, id: nuevoId }]);
        if (error) throw error;
        
        // Optimistic UI Update
        setCanciones([{ ...payload, id: nuevoId, created_at: new Date().toISOString() }, ...canciones]);
      }

      setIsModalOpen(false);
      dispatchForm({ type: "RESET" });
      setEditId(null);
    } catch (err: any) {
      console.error("Error al sincronizar:", err);
      setErrorLocal(err.message || "Error desconocido al intentar sincronizar.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Deseas eliminar permanentemente esta obra del Atelier? No podrás recuperarla.")) return;
    try {
      const { error } = await supabase.from("canciones").delete().eq("id", id);
      if (error) throw error;
      
      // Optimistic UI Update
      setCanciones(canciones.filter((c: any) => c.id !== id));
    } catch (err: any) {
      alert("Error al borrar registro: " + err.message);
    }
  };

  const openEditModal = (cancion: any) => {
    setEditId(cancion.id);
    dispatchForm({ type: "EDIT", payload: cancion });
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#FDFCFD] pb-40 selection:bg-[#6B5E70]/10">
      
      {/* ================= HEADER PRINCIPAL ================= */}
      <header className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-linear-to-l from-[#6B5E70]/5 to-transparent pointer-events-none" />
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-20">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}>
              <div className="flex items-center gap-4 mb-6 opacity-40">
                <div className="h-px w-12 bg-[#6B5E70]" />
                <span className="text-[10px] font-black uppercase tracking-[0.5em]">Laboratorio Musical</span>
              </div>
              <h1 className="text-7xl md:text-9xl font-black italic tracking-tighter uppercase leading-[0.75] text-[#6B5E70]">
                Música <br />
                <span className="font-serif font-light opacity-60 text-5xl md:text-7xl lowercase tracking-normal">fran.atelier</span>
              </h1>
            </motion.div>

            {isAdmin && (
              <motion.button
                whileHover={{ scale: 1.05, y: -5 }} 
                whileTap={{ scale: 0.95 }}
                onClick={() => { setEditId(null); dispatchForm({ type: "RESET" }); setIsModalOpen(true); }}
                className="bg-[#6B5E70] text-white px-10 py-5 rounded-full font-black uppercase text-[10px] tracking-[0.4em] shadow-[0_20px_40px_rgba(107,94,112,0.2)] flex items-center gap-4 group transition-all"
              >
                <Plus size={18} className="group-hover:rotate-180 transition-transform duration-700" />
                Registrar Composición
              </motion.button>
            )}
          </div>

          {/* ================= BARRA DE BÚSQUEDA Y FILTROS ================= */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-3 rounded-[3rem] shadow-[0_10px_40px_-10px_rgba(107,94,112,0.08)] border border-[#6B5E70]/5">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-8 top-1/2 -translate-y-1/2 opacity-20 text-[#6B5E70]" size={20} />
                <input
                  type="text"
                  placeholder="Explorar por título, personaje o autor..."
                  className="w-full bg-transparent py-6 pl-20 pr-8 outline-none text-sm font-medium text-[#6B5E70] placeholder:opacity-20 placeholder:italic"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              
              <div className="flex items-center gap-3 pr-4">
                <button 
                  onClick={() => setMostrarFiltros(!mostrarFiltros)}
                  className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                    mostrarFiltros ? "bg-[#6B5E70]/10 text-[#6B5E70]" : "hover:bg-[#6B5E70]/5 opacity-40"
                  }`}
                >
                  Filtros {Object.keys(filtros).length > 0 && `(${Object.keys(filtros).length})`}
                </button>
                <div className="h-8 w-px bg-[#6B5E70]/10 mx-2" />
                <div className="flex bg-[#6B5E70]/5 p-1.5 rounded-full">
                  <button onClick={() => setVistaGrid(true)} className={`p-3 rounded-full transition-all ${vistaGrid ? "bg-white text-[#6B5E70] shadow-md" : "text-[#6B5E70]/30 hover:text-[#6B5E70]"}`}>
                    <LayoutGrid size={16} />
                  </button>
                  <button onClick={() => setVistaGrid(false)} className={`p-3 rounded-full transition-all ${!vistaGrid ? "bg-white text-[#6B5E70] shadow-md" : "text-[#6B5E70]/30 hover:text-[#6B5E70]"}`}>
                    <AlignJustify size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* AREA DESPLEGABLE DE FILTROS */}
            <AnimatePresence>
              {mostrarFiltros && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} 
                  animate={{ height: "auto", opacity: 1 }} 
                  exit={{ height: 0, opacity: 0 }} 
                  className="overflow-hidden"
                >
                  <div className="bg-white/50 backdrop-blur-sm rounded-[2.5rem] p-8 border border-[#6B5E70]/5 relative">
                    <FiltrosMaestros
                      config={configFiltros}
                      filtrosActivos={filtros}
                      onChange={actualizarFiltro}
                    />
                    {Object.keys(filtros).length > 0 && (
                      <div className="mt-8 flex justify-center">
                        <button 
                          onClick={resetearFiltros} 
                          className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6B5E70] opacity-40 hover:opacity-100 transition-all border-b border-transparent hover:border-[#6B5E70] pb-1"
                        >
                          Limpiar Todos los Filtros
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* ================= ÁREA DE RESULTADOS (MAIN) ================= */}
      <main className="max-w-6xl mx-auto px-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-60 opacity-20">
            <Loader2 className="animate-spin mb-6 text-[#6B5E70]" size={48} />
            <p className="font-black uppercase tracking-[0.8em] text-[10px]">Sincronizando Archivo...</p>
          </div>
        ) : (
          <motion.div 
            layout 
            className={`grid gap-12 ${vistaGrid ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}
          >
            <AnimatePresence mode="popLayout">
              {cancionesFinales.map((cancion: any) => (
                <CancionCard 
                  key={cancion.id} 
                  cancion={cancion} 
                  isAdmin={isAdmin} 
                  onEdit={openEditModal} 
                  onDelete={handleDelete} 
                  vistaFila={!vistaGrid} 
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ESTADO VACÍO */}
        {cancionesFinales.length === 0 && !loading && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-40 border-2 border-dashed border-[#6B5E70]/10 rounded-[4rem]"
          >
            <Music size={60} className="mx-auto text-[#6B5E70]/10 mb-8" />
            <p className="text-xl font-serif italic opacity-30 text-[#6B5E70]">"El silencio reina en esta parte del archivo..."</p>
            {(query || Object.keys(filtros).length > 0) && (
              <button 
                onClick={() => { setQuery(""); resetearFiltros(); }} 
                className="mt-8 text-[10px] font-black uppercase tracking-widest text-[#6B5E70] opacity-50 hover:opacity-100 transition-all"
              >
                Limpiar Búsqueda
              </button>
            )}
          </motion.div>
        )}
      </main>

      {/* ================= MODAL DEL ATELIER ================= */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4 md:p-12">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => !isSaving && setIsModalOpen(false)} 
              className="absolute inset-0 bg-[#6B5E70]/30 backdrop-blur-2xl" 
            />
            
            <motion.div 
              initial={{ scale: 0.9, y: 100, opacity: 0 }} 
              animate={{ scale: 1, y: 0, opacity: 1 }} 
              exit={{ scale: 0.9, y: 100, opacity: 0 }} 
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-6xl bg-white rounded-4xl shadow-[0_60px_150px_-20px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col md:flex-row h-[85vh] md:h-[80vh]"
            >
              
              {/* === LADO IZQUIERDO: PREVIEW Y PORTADA === */}
              <div className="w-full md:w-[38%] bg-[#FDFCFD] p-12 md:p-16 flex flex-col border-r border-[#6B5E70]/5">
                <div className="flex items-center gap-4 mb-12 opacity-30">
                  <PenTool size={16} />
                  <span className="text-[10px] font-black uppercase tracking-[0.4em]">Estética Visual</span>
                </div>
                
                <div className="w-full aspect-3/4 rounded-[3.5rem] bg-white shadow-[inset_0_4px_20px_rgba(0,0,0,0.03)] mb-12 overflow-hidden relative group">
                  {form.portada_url ? (
                    <img src={form.portada_url} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="Preview" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center opacity-[0.05]">
                      <Music size={80} strokeWidth={1} />
                      <p className="text-[11px] font-black uppercase mt-6 tracking-[0.5em]">Sin Portada</p>
                    </div>
                  )}
                  <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-[3.5rem]" />
                </div>
                
                <div className="space-y-4">
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40 ml-4">Enlace de Imagen (URL)</label>
                  <input 
                    type="text" 
                    placeholder="https://ejemplo.com/portada.jpg"
                    className="w-full bg-white px-8 py-5 rounded-2xl text-[11px] font-medium border border-[#6B5E70]/10 outline-none focus:ring-4 ring-[#6B5E70]/5 transition-all" 
                    value={form.portada_url} 
                    onChange={(e) => dispatchForm({ type: "SET_FIELD", field: "portada_url", value: e.target.value })} 
                  />
                  <p className="text-[8px] italic opacity-30 px-4 leading-relaxed">
                    Tip: Usa imágenes de alta resolución en formato vertical para mantener la estética.
                  </p>
                </div>
              </div>

              {/* === LADO DERECHO: FORMULARIO PRINCIPAL === */}
              <div className="flex-1 p-12 md:p-20 overflow-y-auto custom-scrollbar bg-white">
                <div className="flex justify-between items-center mb-16">
                  <div>
                    <h2 className="text-4xl font-black italic uppercase tracking-tighter text-[#6B5E70]">
                      {editId ? "Modificar Obra" : "Nuevo Registro"}
                    </h2>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-30 mt-2">
                      Expediente Musical: {editId ? editId.slice(0,8) : 'Auto-generado'}
                    </p>
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(false)} 
                    className="p-5 rounded-full hover:bg-red-50 text-red-400 transition-all hover:rotate-90"
                  >
                    <X size={24} />
                  </button>
                </div>

                {errorLocal && (
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-12 p-8 bg-red-50 border border-red-100 rounded-[2.5rem] text-red-600 flex items-center gap-5">
                    <AlertCircle size={20} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{errorLocal}</span>
                  </motion.div>
                )}

                <form onSubmit={handleSave} className="space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 ml-8">Título de la Composición</label>
                      <input 
                        required 
                        placeholder="Ej: The World's Continuation"
                        className="w-full bg-[#6B5E70]/5 px-10 py-6 rounded-full outline-none focus:bg-white focus:ring-8 ring-[#6B5E70]/5 transition-all font-serif italic text-2xl text-[#6B5E70]" 
                        value={form.titulo} 
                        onChange={(e) => dispatchForm({ type: "SET_FIELD", field: "titulo", value: e.target.value })} 
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 ml-8">Personaje Asociado</label>
                      <input 
                        required 
                        placeholder="Ej: Uta"
                        className="w-full bg-[#6B5E70]/5 px-10 py-6 rounded-full outline-none focus:bg-white focus:ring-8 ring-[#6B5E70]/5 transition-all font-bold text-sm tracking-tight" 
                        value={form.personaje} 
                        onChange={(e) => dispatchForm({ type: "SET_FIELD", field: "personaje", value: e.target.value })} 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 ml-8">Cantante / Voz</label>
                      <input 
                        placeholder="Ej: Ado"
                        className="w-full bg-[#6B5E70]/5 px-10 py-5 rounded-full outline-none text-[11px] font-bold focus:bg-white focus:ring-4 ring-[#6B5E70]/5 transition-all" 
                        value={form.cantante} 
                        onChange={(e) => dispatchForm({ type: "SET_FIELD", field: "cantante", value: e.target.value })} 
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 ml-8">Compositor</label>
                      <input 
                        placeholder="Ej: Motohiro Hata"
                        className="w-full bg-[#6B5E70]/5 px-10 py-5 rounded-full outline-none text-[11px] font-bold focus:bg-white focus:ring-4 ring-[#6B5E70]/5 transition-all" 
                        value={form.compositor} 
                        onChange={(e) => dispatchForm({ type: "SET_FIELD", field: "compositor", value: e.target.value })} 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 ml-8">Idioma Principal</label>
                      <select 
                        className="w-full bg-[#6B5E70]/5 px-8 py-5 rounded-full outline-none text-[10px] font-black uppercase tracking-widest appearance-none cursor-pointer hover:bg-[#6B5E70]/10 transition-colors" 
                        value={form.idioma} 
                        onChange={(e) => dispatchForm({ type: "SET_FIELD", field: "idioma", value: e.target.value })}
                      >
                        {IDIOMAS_DISPONIBLES.map(i => <option key={i} value={i}>{i}</option>)}
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 ml-8">Estado Actual</label>
                      <select 
                        className="w-full bg-[#6B5E70]/5 px-8 py-5 rounded-full outline-none text-[10px] font-black uppercase tracking-widest appearance-none cursor-pointer hover:bg-[#6B5E70]/10 transition-colors" 
                        value={form.estado} 
                        onChange={(e) => dispatchForm({ type: "SET_FIELD", field: "estado", value: e.target.value })}
                      >
                        {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 ml-8">Privacidad</label>
                      <button 
                        type="button" 
                        onClick={() => dispatchForm({ type: "SET_FIELD", field: "visible", value: !form.visible })} 
                        className={`w-full py-5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                          form.visible ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {form.visible ? "Entrada Pública" : "Solo Interno"}
                      </button>
                    </div>
                  </div>

                  <div className="pt-12 border-t border-[#6B5E70]/10">
                    <div className="flex items-center gap-4 mb-8 opacity-30">
                      <Link2 size={16} />
                      <span className="text-[10px] font-black uppercase tracking-[0.4em]">Plataformas de Escucha</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="relative">
                        <Youtube className="absolute left-6 top-1/2 -translate-y-1/2 text-red-500 opacity-50" size={16} />
                        <input 
                          placeholder="ID o URL de YouTube..." 
                          className="w-full bg-[#6B5E70]/5 pl-16 pr-8 py-5 rounded-full outline-none text-[11px] focus:bg-white focus:ring-4 ring-[#6B5E70]/5 transition-all" 
                          value={form.links.youtube || ""} 
                          onChange={(e) => dispatchForm({ type: "SET_LINK", field: "youtube", value: e.target.value })} 
                        />
                      </div>
                      <div className="relative">
                        <Music className="absolute left-6 top-1/2 -translate-y-1/2 text-green-500 opacity-50" size={16} />
                        <input 
                          placeholder="Link de Spotify..." 
                          className="w-full bg-[#6B5E70]/5 pl-16 pr-8 py-5 rounded-full outline-none text-[11px] focus:bg-white focus:ring-4 ring-[#6B5E70]/5 transition-all" 
                          value={form.links.spotify || ""} 
                          onChange={(e) => dispatchForm({ type: "SET_LINK", field: "spotify", value: e.target.value })} 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-12">
                    <button 
                      disabled={isSaving} 
                      className="w-full bg-[#6B5E70] text-white py-8 rounded-full font-black uppercase tracking-[0.5em] text-[11px] shadow-[0_30px_60px_-10px_rgba(107,94,112,0.3)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-6"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="animate-spin" size={20} />
                          <span>Sincronizando con el Atelier...</span>
                        </>
                      ) : (
                        <>
                          <Save size={20} />
                          <span>Guardar Composición</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(107, 94, 112, 0.15); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(107, 94, 112, 0.3); }
      `}</style>
    </div>
  );
}