"use client";

import React, { useState, useEffect, useReducer, useCallback, useMemo } from "react";
import Link from "next/link";
import { 
  Music, ChevronRight, Plus, Edit3, X, User, Eye, EyeOff, 
  Loader2, Save, Trash2, Globe, Mic2, PenTool, 
  LayoutGrid, AlignJustify, Search, Youtube, Link2, ExternalLink, 
  AlertCircle, Camera 
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
const IDIOMAS_DISPONIBLES = ["Español", "Inglés", "Japonés"];

// Ajustamos la config para que coincida con lo que espera tu componente FiltrosMaestros
const FILTROS_CONFIG = { 
  cantante: [], // Se llenarán dinámicamente o puedes poner fijos
  compositor: [], 
  idioma: IDIOMAS_DISPONIBLES 
};

const getEstadoColor = (estado: string) => {
  const colores: Record<string, string> = {
    "TERMINADA": "bg-linear-to-r from-emerald-500/20 to-emerald-400/10 text-emerald-700 border-emerald-300/30 shadow-[0_4px_12px_rgba(16,185,129,0.1)]",
    "EN PROCESO": "bg-linear-to-r from-amber-500/20 to-amber-400/10 text-amber-700 border-amber-300/30 shadow-[0_4px_12px_rgba(245,158,11,0.1)]",
    "BORRADOR": "bg-linear-to-r from-slate-500/10 to-slate-400/5 text-slate-500 border-slate-200"
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
          src={cancion.portada_url} 
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
              >
                <Edit3 size={16} />
              </button>
              <button 
                onClick={() => onDelete(cancion.id)}
                className="p-3 rounded-2xl hover:bg-red-50 text-red-600 transition-all hover:scale-110 active:scale-90"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="flex items-center gap-4 opacity-20 group-hover:opacity-100 transition-all">
               {cancion.links?.youtube && <Youtube size={14} className="text-red-500" />}
               <span className="text-[8px] font-black uppercase tracking-widest">{new Date(cancion.created_at).getFullYear()}</span>
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
    case "SET_FIELD": return { ...state, [action.field]: action.value };
    case "SET_LINK": return { ...state, links: { ...state.links, [action.field]: action.value } };
    case "RESET": return {
      titulo: "", personaje: "", cantante: "", compositor: "",
      idioma: "Español", estado: "BORRADOR", portada_url: "",
      links: { youtube: "", spotify: "" }, visible: true
    };
    case "EDIT": return { ...action.payload, links: action.payload.links || { youtube: "", spotify: "" } };
    default: return state;
  }
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function CancionesPage() {
  const { data: canciones, setData: setCanciones, loading } = useSupabaseData("canciones");
  const [isAdmin, setIsAdmin] = useState(false);
  
  // UI States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [vistaGrid, setVistaGrid] = useState(true);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [query, setQuery] = useState(""); 

  // Hook de filtros genéricos
  const { 
    filtros, 
    actualizarFiltro, 
    resetearFiltros, 
    itemsFiltrados 
  } = useFiltrosGenericos(canciones, { campos: Object.keys(FILTROS_CONFIG) });

  // Generamos opciones dinámicas basadas en los datos para el componente FiltrosMaestros
  const configDinamica = useMemo(() => {
    return {
      cantante: Array.from(new Set(canciones.map((c: any) => c.cantante).filter(Boolean))) as string[],
      compositor: Array.from(new Set(canciones.map((c: any) => c.compositor).filter(Boolean))) as string[],
      idioma: IDIOMAS_DISPONIBLES
    };
  }, [canciones]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAdmin(!!session);
    };
    checkUser();
  }, []);

  const cancionesFinales = useMemo(() => {
    let filtradas = itemsFiltrados;
    if (query) {
      const lowQuery = query.toLowerCase();
      filtradas = filtradas.filter((c: any) => 
        c.titulo?.toLowerCase().includes(lowQuery) || 
        c.personaje?.toLowerCase().includes(lowQuery)
      );
    }
    return filtradas;
  }, [itemsFiltrados, query]);

  const [form, dispatchForm] = useReducer(formReducer, {
    titulo: "", personaje: "", cantante: "", compositor: "",
    idioma: "Español", estado: "BORRADOR", portada_url: "",
    links: { youtube: "", spotify: "" }, visible: true
  });

  // --- HANDLERS ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    try {
      setIsSaving(true);
      setErrorLocal(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Acceso denegado.");
      const payload = { ...form, user_id: user.id, updated_at: new Date().toISOString() };
      if (editId) {
        const { error } = await supabase.from("canciones").update(payload).eq("id", editId);
        if (error) throw error;
        setCanciones(canciones.map((c: any) => c.id === editId ? { ...c, ...payload } : c));
      } else {
        const nuevoId = crypto.randomUUID();
        const { error } = await supabase.from("canciones").insert([{ ...payload, id: nuevoId }]);
        if (error) throw error;
        setCanciones([{ ...payload, id: nuevoId, created_at: new Date().toISOString() }, ...canciones]);
      }
      setIsModalOpen(false);
      dispatchForm({ type: "RESET" });
      setEditId(null);
    } catch (err: any) {
      setErrorLocal(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Deseas eliminar esta composición?")) return;
    await supabase.from("canciones").delete().eq("id", id);
    setCanciones(canciones.filter((c: any) => c.id !== id));
  };

  const openEditModal = (cancion: any) => {
    setEditId(cancion.id);
    dispatchForm({ type: "EDIT", payload: cancion });
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#FDFCFD] pb-40 selection:bg-[#6B5E70]/10">
      <header className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-linear-to-l from-[#6B5E70]/5 to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-20">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
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
                whileHover={{ scale: 1.05, y: -5 }} whileTap={{ scale: 0.95 }}
                onClick={() => { setEditId(null); dispatchForm({ type: "RESET" }); setIsModalOpen(true); }}
                className="bg-[#6B5E70] text-white px-10 py-5 rounded-full font-black uppercase text-[10px] tracking-[0.4em] shadow-[0_20px_40px_rgba(107,94,112,0.2)] flex items-center gap-4 group"
              >
                <Plus size={18} className="group-hover:rotate-180 transition-transform duration-700" />
                Registrar Composición
              </motion.button>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-3 rounded-[3rem] shadow-[0_10px_40px_-10px_rgba(107,94,112,0.08)] border border-[#6B5E70]/5">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-8 top-1/2 -translate-y-1/2 opacity-20 text-[#6B5E70]" size={20} />
                <input
                  type="text"
                  placeholder="Explorar por título..."
                  className="w-full bg-transparent py-6 pl-20 pr-8 outline-none text-sm font-medium text-[#6B5E70] placeholder:opacity-20 placeholder:italic"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3 pr-4">
                <button 
                  onClick={() => setMostrarFiltros(!mostrarFiltros)}
                  className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${mostrarFiltros ? "bg-[#6B5E70]/10 text-[#6B5E70]" : "hover:bg-[#6B5E70]/5 opacity-40"}`}
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

            <AnimatePresence>
              {mostrarFiltros && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="bg-white/50 backdrop-blur-sm rounded-[2.5rem] p-8 border border-[#6B5E70]/5">
                    {/* AQUI ESTA LA CORRECCIÓN CLAVE: */}
                    <FiltrosMaestros
                      config={configDinamica}
                      filtrosActivos={filtros}
                      onChange={(grupo, valor) => actualizarFiltro(grupo, valor)}
                    />
                    {Object.keys(filtros).length > 0 && (
                      <button 
                        onClick={resetearFiltros}
                        className="mt-6 mx-auto block text-[9px] font-black uppercase tracking-[0.2em] text-[#6B5E70] opacity-40 hover:opacity-100 transition-all"
                      >
                        Limpiar todos los filtros
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-60 opacity-20">
            <Loader2 className="animate-spin mb-6 text-[#6B5E70]" size={48} />
            <p className="font-black uppercase tracking-[0.8em] text-[10px]">Cargando...</p>
          </div>
        ) : (
          <motion.div layout className={`grid gap-12 ${vistaGrid ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}>
            <AnimatePresence mode="popLayout">
              {cancionesFinales.map((cancion: any) => (
                <CancionCard key={cancion.id} cancion={cancion} isAdmin={isAdmin} onEdit={openEditModal} onDelete={handleDelete} vistaFila={!vistaGrid} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4 md:p-12">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !isSaving && setIsModalOpen(false)} className="absolute inset-0 bg-[#6B5E70]/30 backdrop-blur-2xl" />
            <motion.div initial={{ scale: 0.9, y: 100, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.9, y: 100, opacity: 0 }} className="relative w-full max-w-6xl bg-white rounded-4xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[85vh] md:h-[80vh]">
              <div className="w-full md:w-[38%] bg-[#FDFCFD] p-12 flex flex-col border-r border-[#6B5E70]/5">
                <div className="w-full aspect-3/4 rounded-[3.5rem] bg-white shadow-inner mb-12 overflow-hidden">
                  {form.portada_url ? <img src={form.portada_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center opacity-5"><Music size={80} /></div>}
                </div>
                <input placeholder="URL Portada" className="w-full bg-white px-8 py-5 rounded-2xl border border-[#6B5E70]/10 outline-none text-[11px]" value={form.portada_url} onChange={(e) => dispatchForm({ type: "SET_FIELD", field: "portada_url", value: e.target.value })} />
              </div>
              <div className="flex-1 p-12 md:p-20 overflow-y-auto custom-scrollbar bg-white">
                <div className="flex justify-between items-center mb-16">
                  <h2 className="text-4xl font-black italic uppercase tracking-tighter text-[#6B5E70]">{editId ? "Editar" : "Nuevo"}</h2>
                  <button onClick={() => setIsModalOpen(false)} className="p-5 rounded-full hover:bg-red-50 text-red-400 transition-all"><X size={24} /></button>
                </div>
                <form onSubmit={handleSave} className="space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <input required placeholder="Título" className="w-full bg-[#6B5E70]/5 px-10 py-6 rounded-full outline-none font-serif italic text-2xl" value={form.titulo} onChange={(e) => dispatchForm({ type: "SET_FIELD", field: "titulo", value: e.target.value })} />
                    <input required placeholder="Personaje" className="w-full bg-[#6B5E70]/5 px-10 py-6 rounded-full outline-none font-bold" value={form.personaje} onChange={(e) => dispatchForm({ type: "SET_FIELD", field: "personaje", value: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <input placeholder="Cantante" className="w-full bg-[#6B5E70]/5 px-8 py-5 rounded-full outline-none" value={form.cantante} onChange={(e) => dispatchForm({ type: "SET_FIELD", field: "cantante", value: e.target.value })} />
                    <select className="w-full bg-[#6B5E70]/5 px-8 py-5 rounded-full outline-none text-[10px] font-black uppercase" value={form.estado} onChange={(e) => dispatchForm({ type: "SET_FIELD", field: "estado", value: e.target.value })}>
                      {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                    <button type="button" onClick={() => dispatchForm({ type: "SET_FIELD", field: "visible", value: !form.visible })} className={`py-5 rounded-full text-[10px] font-black uppercase transition-all ${form.visible ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"}`}>
                      {form.visible ? "Público" : "Privado"}
                    </button>
                  </div>
                  <button disabled={isSaving} className="w-full bg-[#6B5E70] text-white py-8 rounded-full font-black uppercase tracking-[0.5em] text-[11px] shadow-2xl flex items-center justify-center gap-6">
                    {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    {isSaving ? "Guardando..." : "Sincronizar"}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(107, 94, 112, 0.15); border-radius: 20px; }
      `}</style>
    </div>
  );
}