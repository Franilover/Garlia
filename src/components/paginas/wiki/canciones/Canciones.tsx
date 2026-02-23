"use client";

import React, { useState, useEffect, useReducer, useCallback } from "react";
import Link from "next/link";
import { Music, ChevronRight, Plus, Edit3, X, User, Eye, EyeOff, Loader2, Save, Trash2, Globe, Mic2, PenTool, LayoutGrid, AlignJustify, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/api/client/supabase";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { SmartImage } from "@/components/shared/display/SmartImage";
import { useFiltrosGenericos } from "@/hooks/features/useFiltros";
import FiltrosMaestros from "@/components/shared/forms/Filtros";

// ============================================================================
// CONSTANTES
// ============================================================================

const ESTADOS = ["BORRADOR", "EN PROCESO", "TERMINADA"];
const IDIOMAS_DISPONIBLES = ["Español", "Inglés", "Japonés"];

const TEMAS_DISPONIBLES = [
  "Relaciones",     // Cubre amor, desamor, amistad, traición y familia.
  "Identidad",      // Cubre quién soy, salud mental, ego y crecimiento.
  "Realidad",       // Cubre crítica social, calle, dinero y política.
  "Nostalgia",      // Cubre el pasado, recuerdos y lo que se perdió.
  "Deseo",          // Cubre pasión, ambición, sexo y anhelos.
  "Existencialismo",// Cubre la vida, la muerte, el tiempo y la soledad.
  "Conflicto",      // Cubre guerra, peleas, lucha interna y rabia.
  "Escapismo",      // Cubre viajes, fiesta, drogas, sueños y libertad.
  "Superación",     // Cubre éxito, resiliencia y nuevos comienzos.
  "Misticismo",     // Cubre destino, espiritualidad, fe y lo abstracto.
  "Naturaleza",     // Cubre el entorno, paisajes y la conexión con el mundo.
  "Cotidianidad"    // Cubre el día a día, la rutina y momentos simples.
];

const EMOCIONES_DISPONIBLES = [
  "Enérgica",      // Canciones de fiesta, deporte, motivación o ritmos altos.
  "Melancólica",   // Tristeza, pero con esa belleza de los recuerdos o la lluvia.
  "Relajada",      // Chill, lo-fi, playa, momentos de calma.
  "Agresiva",      // Rock pesado, rap crudo, rabia, distorsión.
  "Optimista",     // Alegría pura, felicidad, buen rollo, luz.
  "Íntima",        // Acústicos, voz susurrada, cercanía, vulnerabilidad.
  "Atmosférica",   // Espacial, envolvente, sintetizadores, para dejarse llevar.
  "Misteriosa",    // Oscura, intriga, tensión, nocturna.
  "Épica",         // Grandes orquestas, himnos de estadio, triunfal.
  "Ansiosa",       // Ritmos frenéticos, tensión, estrés, urgencia.
  "Cálida",        // Orgánica, instrumentos de madera, amor tranquilo, hogar.
  "Fría"           // Minimalista, electrónica seca, desapego, soledad urbana.
];

const FILTROS_CONFIG = { campos: ["cantante", "compositor", "idioma", "tema", "emocion"] };

const getEstadoColor = (estado: string) => {
  const colores: Record<string, string> = {
    "TERMINADA": "bg-gradient-to-r from-emerald-500/20 to-emerald-400/10 text-emerald-700 border-emerald-300/30",
    "EN PROCESO": "bg-gradient-to-r from-amber-500/20 to-amber-400/10 text-amber-700 border-amber-300/30",
    "BORRADOR": "bg-gradient-to-r from-slate-500/20 to-slate-400/10 text-slate-600 border-slate-300/30"
  };
  return colores[estado] || colores["BORRADOR"];
};

// ============================================================================
// REDUCERS PARA ESTADO COMPLEJO
// ============================================================================

const initialModalState = {
  showEditModal: false,
  showAddModal: false,
  isProcessing: false,
  selectedCancion: null
};

function modalReducer(state: any, action: any) {
  switch (action.type) {
    case "OPEN_EDIT": return { ...state, showEditModal: true, selectedCancion: action.payload };
    case "CLOSE_EDIT": return { ...state, showEditModal: false, selectedCancion: null };
    case "OPEN_ADD": return { ...state, showAddModal: true };
    case "CLOSE_ADD": return { ...state, showAddModal: false };
    case "SET_PROCESSING": return { ...state, isProcessing: action.payload };
    default: return state;
  }
}

const initialFormState = {
  editTitulo: "",
  editPersonaje: "",
  editEstado: "BORRADOR",
  editVisible: false,
  editPortada: "",
  editCantante: "",
  editCompositor: "",
  editIdioma: "Español",
  editTema: "",
  editEmocion: "",
  nuevoTitulo: "",
  nuevoPersonaje: "",
  nuevoEstado: "BORRADOR",
  nuevoCantante: "",
  nuevoCompositor: "",
  nuevoIdioma: "Español",
  nuevoTema: "",
  nuevoEmocion: ""
};

function formReducer(state: any, action: any) {
  switch (action.type) {
    case "SET_EDIT_FORM": return { ...state, ...action.payload };
    case "SET_ADD_FORM": return { ...state, ...action.payload };
    case "RESET_ADD": return {
      ...state,
      nuevoTitulo: "",
      nuevoPersonaje: "",
      nuevoEstado: "BORRADOR",
      nuevoCantante: "",
      nuevoCompositor: "",
      nuevoIdioma: "Español",
      nuevoTema: "",
      nuevoEmocion: ""
    };
    default: return state;
  }
}

// ============================================================================
// COMPONENTES HIJOS
// ============================================================================

const CancionCard = ({ cancion, isAdmin, onEdit, vistaFila }: any) => {
  if (vistaFila) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="group relative flex items-center justify-between gap-4 bg-white/50 hover:bg-white/80 backdrop-blur-sm border border-[#6B5E70]/10 hover:border-[#6B5E70]/20 rounded-2xl px-6 py-4 transition-all duration-300"
      >
        <Link href={`/wiki/paginas/canciones/${cancion.id}`} className="flex-1 min-w-0">
          <h2 className="text-[#6B5E70] font-black uppercase text-sm group-hover:text-[#9A89A0] transition-colors tracking-tighter italic truncate">
            {cancion.titulo}
          </h2>
        </Link>
        {isAdmin && (
          <div className="flex items-center gap-2 shrink-0">
            {!cancion.visible && (
              <div className="bg-gradient-to-r from-[#6B5E70] to-[#8B7A90] text-white p-1.5 px-2.5 rounded-full text-[8px] font-black uppercase flex items-center gap-1 shadow">
                <EyeOff size={10} />
                Oculto
              </div>
            )}
            <motion.button
              whileHover={{ scale: 1.15, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => onEdit(e, cancion)}
              className="bg-white text-[#6B5E70] p-2 rounded-full shadow border-2 border-[#6B5E70]/20 hover:shadow-[0_0_12px_rgba(107,94,112,0.25)] transition-all"
            >
              <Edit3 size={14} />
            </motion.button>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <div className="relative group h-full">
      {isAdmin && (
        <div className="absolute top-4 right-4 z-[50] flex gap-2">
          {!cancion.visible && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-r from-[#6B5E70] to-[#8B7A90] text-white p-2 px-3 rounded-full text-[8px] font-black uppercase flex items-center gap-1.5 shadow-xl backdrop-blur-sm border border-white/20"
            >
              <EyeOff size={12} />
              Oculto
            </motion.div>
          )}
          <motion.button
            whileHover={{ scale: 1.15, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => onEdit(e, cancion)}
            className="bg-white/95 text-[#6B5E70] p-3 rounded-full shadow-2xl border-2 border-[#6B5E70]/20 hover:shadow-[0_0_20px_rgba(107,94,112,0.3)] transition-all backdrop-blur-sm group/btn"
          >
            <Edit3 size={16} className="group-hover/btn:scale-110 transition-transform" />
          </motion.button>
        </div>
      )}

      <Link href={`/wiki/paginas/canciones/${cancion.id}`}>
        <motion.div
          whileHover={{ y: -12 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="cursor-pointer h-full flex flex-col"
        >
          <div className="relative aspect-square rounded-[2.5rem] overflow-hidden shadow-2xl border border-[#6B5E70]/10 bg-gradient-to-br from-[#6B5E70]/10 to-[#6B5E70]/5 group-hover:shadow-[0_20px_40px_rgba(107,94,112,0.15)] transition-all duration-500">
            <SmartImage
              src={cancion.portada_url || "/placeholder-cover.jpg"}
              alt={cancion.titulo}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-[#6B5E70]/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <motion.div
              className={`absolute top-6 left-6 z-20 backdrop-blur-md px-4 py-2 rounded-full border font-black text-[9px] uppercase tracking-widest shadow-lg ${getEstadoColor(cancion.estado)}`}
            >
              {cancion.estado}
            </motion.div>

            {cancion.personaje && (
              <div className="absolute bottom-6 right-6 z-20 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full border border-[#6B5E70]/20 flex items-center gap-2 shadow-lg">
                <User size={11} className="text-[#6B5E70]" />
                <span className="text-[9px] font-black text-[#6B5E70] uppercase italic tracking-tighter">
                  {cancion.personaje}
                </span>
              </div>
            )}

            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100">
              <div className="bg-white/90 p-5 rounded-full shadow-2xl backdrop-blur-sm border-2 border-[#6B5E70]/10">
                <ChevronRight size={32} className="text-[#6B5E70] ml-1" />
              </div>
            </div>
          </div>

          <div className="mt-6 flex-1 flex flex-col px-2">
            <h2 className="text-[#6B5E70] font-black uppercase text-lg group-hover:text-[#9A89A0] transition-colors leading-tight tracking-tighter italic line-clamp-2">
              {cancion.titulo}
            </h2>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-[#6B5E70]/40 font-bold text-[8px] uppercase tracking-[0.2em]">
              <span className="flex items-center gap-2 group-hover:text-[#6B5E70] transition-colors">
                <Mic2 size={10} />
                {cancion.cantante || "N/A"}
              </span>
              <span className="flex items-center gap-2 group-hover:text-[#6B5E70] transition-colors">
                <PenTool size={10} />
                {cancion.compositor || "N/A"}
              </span>
              <span className="flex items-center gap-2 group-hover:text-[#6B5E70] transition-colors">
                <Globe size={10} />
                {cancion.idioma || "Español"}
              </span>
            </div>
          </div>
        </motion.div>
      </Link>
    </div>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const Canciones = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAdmin(!!session);
      setSessionLoaded(true);
    });
  }, []);

  const { data: canciones = [], loading: loadingCanciones, setData: setCanciones } = useSupabaseData("canciones", {
    order: { campo: "created_at", asc: false },
    isAdmin: sessionLoaded ? isAdmin : false,
  });

  const { data: listaPersonajes = [] } = useSupabaseData("personajes", {
    order: { campo: "nombre", asc: true }
  });

  const [modalState, dispatchModal] = useReducer(modalReducer, initialModalState);
  const [formState, dispatchForm] = useReducer(formReducer, initialFormState);
  const [vistaGrid, setVistaGrid] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  // ✅ Hook de filtros genérico
  const {
    filtros,
    opciones,
    itemsFiltrados: cancionesFiltradas,
    actualizarFiltro,
    resetearFiltros
  } = useFiltrosGenericos(canciones, FILTROS_CONFIG);

  // ✅ Filtro adicional por búsqueda de título
  const cancionesFinales = cancionesFiltradas.filter((c: any) =>
    c.titulo.toLowerCase().includes(busqueda.toLowerCase())
  );

  const hayFiltrosActivos = Object.values(filtros).some(v => v !== "todos") || busqueda !== "";

  const openEditModal = useCallback((e: any, cancion: any) => {
    e.preventDefault();
    e.stopPropagation();
    dispatchForm({
      type: "SET_EDIT_FORM",
      payload: {
        editTitulo: cancion.titulo,
        editPersonaje: cancion.personaje || "",
        editEstado: cancion.estado || "BORRADOR",
        editVisible: cancion.visible || false,
        editPortada: cancion.portada_url || "",
        editCantante: cancion.cantante || "",
        editCompositor: cancion.compositor || "",
        editIdioma: cancion.idioma || "Español",
        editTema: cancion.tema || "",
        editEmocion: cancion.emocion || ""
      }
    });
    dispatchModal({ type: "OPEN_EDIT", payload: cancion });
  }, []);

  const handleUpdateCancion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.editTitulo.trim() || modalState.isProcessing) return;
    dispatchModal({ type: "SET_PROCESSING", payload: true });
    let success = false;

    try {
      const { data, error } = await supabase
        .from("canciones")
        .update({
          titulo: formState.editTitulo.toUpperCase(),
          personaje: formState.editPersonaje || null,
          estado: formState.editEstado,
          visible: formState.editVisible,
          portada_url: formState.editPortada,
          cantante: formState.editCantante,
          compositor: formState.editCompositor,
          idioma: formState.editIdioma,
          tema: formState.editTema || null,
          emocion: formState.editEmocion || null
        })
        .eq("id", modalState.selectedCancion.id)
        .select();

      if (error) throw error;
      if (data) {
        setCanciones((prev: any[]) => prev.map(c => c.id === data[0].id ? data[0] : c));
        success = true;
      }
    } catch (err) {
      console.error(err);
    } finally {
      dispatchModal({ type: "SET_PROCESSING", payload: false });
      if (success) {
        dispatchModal({ type: "CLOSE_EDIT" });
      }
    }
  };

  const handleAddCancion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.nuevoTitulo.trim() || modalState.isProcessing) return;
    dispatchModal({ type: "SET_PROCESSING", payload: true });
    let success = false;

    try {
      const { data, error } = await supabase
        .from("canciones")
        .insert([{
          titulo: formState.nuevoTitulo.toUpperCase(),
          personaje: formState.nuevoPersonaje || null,
          estado: formState.nuevoEstado,
          visible: false,
          portada_url: "/placeholder-cover.jpg",
          cantante: formState.nuevoCantante,
          compositor: formState.nuevoCompositor,
          idioma: formState.nuevoIdioma,
          tema: formState.nuevoTema || null,
          emocion: formState.nuevoEmocion || null
        }])
        .select();

      if (error) throw error;
      if (data) {
        setCanciones((prev: any[]) => [data[0], ...prev]);
        success = true;
      }
    } catch (err) {
      console.error(err);
    } finally {
      dispatchModal({ type: "SET_PROCESSING", payload: false });
      if (success) {
        dispatchModal({ type: "CLOSE_ADD" });
        dispatchForm({ type: "RESET_ADD" });
      }
    }
  };

  const handleDeleteCancion = async (id: number) => {
    if (!confirm("¿Seguro que quieres borrar este soliloquio?")) return;
    const { error } = await supabase.from("canciones").delete().eq("id", id);
    if (!error) {
      setCanciones((prev: any[]) => prev.filter(c => c.id !== id));
      dispatchModal({ type: "CLOSE_EDIT" });
    }
  };

  if (!sessionLoaded || loadingCanciones) return (
    <div className="h-screen flex items-center justify-center bg-[#FDFCFD]">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
        <Loader2 className="text-[#6B5E70]/20" size={40} />
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFCFD] pb-32 selection:bg-[#6B5E70]/10 selection:text-[#6B5E70]">

      {/* MODAL EDITAR */}
      <AnimatePresence>
        {modalState.showEditModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => dispatchModal({ type: "CLOSE_EDIT" })}
              className="absolute inset-0 bg-[#6B5E70]/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 sm:p-12 overflow-y-auto">
                <div className="flex justify-between items-center mb-10">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#6B5E70] rounded-2xl text-white shadow-lg shadow-[#6B5E70]/20">
                      <Edit3 size={20} />
                    </div>
                    <h3 className="text-[#6B5E70] font-black uppercase text-[12px] tracking-[0.4em] italic">Ajustes del Soliloquio</h3>
                  </div>
                  <button onClick={() => dispatchModal({ type: "CLOSE_EDIT" })} className="p-2 hover:bg-[#6B5E70]/5 rounded-full transition-colors text-[#6B5E70]/40 hover:text-[#6B5E70]">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleUpdateCancion} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-[#6B5E70]/40 ml-4 tracking-widest">Título</label>
                      <input
                        className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 py-4 px-6 rounded-[1.5rem] text-sm font-black text-[#6B5E70] uppercase outline-none focus:border-[#6B5E70]/30 transition-all"
                        value={formState.editTitulo}
                        onChange={(e) => dispatchForm({ type: "SET_EDIT_FORM", payload: { editTitulo: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-[#6B5E70]/40 ml-4 tracking-widest">Personaje</label>
                      <select
                        className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 py-4 px-6 rounded-[1.5rem] text-sm font-black text-[#6B5E70] uppercase outline-none appearance-none"
                        value={formState.editPersonaje}
                        onChange={(e) => dispatchForm({ type: "SET_EDIT_FORM", payload: { editPersonaje: e.target.value } })}
                      >
                        <option value="">Ninguno</option>
                        {listaPersonajes.map((p: any) => <option key={p.nombre} value={p.nombre}>{p.nombre}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-[#6B5E70]/40 ml-4 tracking-widest">Cantante</label>
                      <input
                        className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 py-4 px-6 rounded-[1.5rem] text-sm font-black text-[#6B5E70] uppercase outline-none"
                        value={formState.editCantante}
                        onChange={(e) => dispatchForm({ type: "SET_EDIT_FORM", payload: { editCantante: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-[#6B5E70]/40 ml-4 tracking-widest">Compositor</label>
                      <input
                        className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 py-4 px-6 rounded-[1.5rem] text-sm font-black text-[#6B5E70] uppercase outline-none"
                        value={formState.editCompositor}
                        onChange={(e) => dispatchForm({ type: "SET_EDIT_FORM", payload: { editCompositor: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-[#6B5E70]/40 ml-4 tracking-widest">Idioma</label>
                      <select
                        className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 py-4 px-6 rounded-[1.5rem] text-sm font-black text-[#6B5E70] uppercase outline-none appearance-none"
                        value={formState.editIdioma}
                        onChange={(e) => dispatchForm({ type: "SET_EDIT_FORM", payload: { editIdioma: e.target.value } })}
                      >
                        {IDIOMAS_DISPONIBLES.map(idioma => <option key={idioma} value={idioma}>{idioma}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-[#6B5E70]/40 ml-4 tracking-widest">Tema / Motivo</label>
                      <select
                        className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 py-4 px-6 rounded-[1.5rem] text-sm font-black text-[#6B5E70] uppercase outline-none appearance-none"
                        value={formState.editTema}
                        onChange={(e) => dispatchForm({ type: "SET_EDIT_FORM", payload: { editTema: e.target.value } })}
                      >
                        <option value="">Sin tema</option>
                        {TEMAS_DISPONIBLES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-[#6B5E70]/40 ml-4 tracking-widest">Emoción / Temple</label>
                      <select
                        className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 py-4 px-6 rounded-[1.5rem] text-sm font-black text-[#6B5E70] uppercase outline-none appearance-none"
                        value={formState.editEmocion}
                        onChange={(e) => dispatchForm({ type: "SET_EDIT_FORM", payload: { editEmocion: e.target.value } })}
                      >
                        <option value="">Sin emoción</option>
                        {EMOCIONES_DISPONIBLES.map(em => <option key={em} value={em}>{em}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-[#6B5E70]/40 ml-4 tracking-widest">Estado</label>
                      <div className="flex gap-2 p-1 bg-[#FDFCFD] border-2 border-[#6B5E70]/10 rounded-[1.5rem]">
                        {ESTADOS.map(est => (
                          <button
                            key={est} type="button"
                            onClick={() => dispatchForm({ type: "SET_EDIT_FORM", payload: { editEstado: est } })}
                            className={`flex-1 py-3 rounded-xl text-[9px] font-black transition-all ${formState.editEstado === est ? 'bg-[#6B5E70] text-white shadow-lg' : 'text-[#6B5E70]/40 hover:bg-[#6B5E70]/5'}`}
                          >
                            {est}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-[#6B5E70]/40 ml-4 tracking-widest">Visibilidad</label>
                      <button
                        type="button"
                        onClick={() => dispatchForm({ type: "SET_EDIT_FORM", payload: { editVisible: !formState.editVisible } })}
                        className={`w-full flex items-center justify-between py-4 px-6 rounded-[1.5rem] border-2 transition-all ${formState.editVisible ? 'border-emerald-500/30 bg-emerald-50/50 text-emerald-700' : 'border-slate-500/30 bg-slate-50/50 text-slate-700'}`}
                      >
                        <span className="text-[10px] font-black uppercase tracking-widest">{formState.editVisible ? 'Público' : 'Privado'}</span>
                        {formState.editVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 pt-6">
                    <button
                      type="submit" disabled={modalState.isProcessing}
                      className="flex-[2] bg-[#6B5E70] text-white py-5 rounded-[1.5rem] font-black uppercase text-[10px] tracking-[0.3em] shadow-xl shadow-[#6B5E70]/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {modalState.isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                      {modalState.isProcessing ? "Guardando..." : "Guardar Cambios"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCancion(modalState.selectedCancion.id)}
                      disabled={modalState.isProcessing}
                      className="flex-1 bg-red-50 text-red-500 py-5 rounded-[1.5rem] font-black uppercase text-[10px] tracking-[0.3em] hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={18} />
                      Borrar
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL AÑADIR */}
      <AnimatePresence>
        {modalState.showAddModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => dispatchModal({ type: "CLOSE_ADD" })} className="absolute inset-0 bg-[#6B5E70]/40 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh]">
              <h3 className="text-[#6B5E70] font-black uppercase text-[12px] tracking-[0.4em] text-center mb-10 italic underline underline-offset-8">Nuevo Registro</h3>
              <form onSubmit={handleAddCancion} className="space-y-6">
                <input
                  placeholder="TÍTULO DEL SOLILOQUIO"
                  className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 py-5 px-8 rounded-[1.5rem] text-xs font-black text-[#6B5E70] uppercase outline-none focus:border-[#6B5E70]/30"
                  value={formState.nuevoTitulo}
                  onChange={(e) => dispatchForm({ type: "SET_ADD_FORM", payload: { nuevoTitulo: e.target.value } })}
                />
                <select
                  className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 py-5 px-8 rounded-[1.5rem] text-xs font-black text-[#6B5E70] uppercase outline-none"
                  value={formState.nuevoPersonaje}
                  onChange={(e) => dispatchForm({ type: "SET_ADD_FORM", payload: { nuevoPersonaje: e.target.value } })}
                >
                  <option value="">Seleccionar Personaje</option>
                  {listaPersonajes.map((p: any) => <option key={p.nombre} value={p.nombre}>{p.nombre}</option>)}
                </select>

                <input
                  placeholder="CANTANTE"
                  className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 py-5 px-8 rounded-[1.5rem] text-xs font-black text-[#6B5E70] uppercase outline-none"
                  value={formState.nuevoCantante}
                  onChange={(e) => dispatchForm({ type: "SET_ADD_FORM", payload: { nuevoCantante: e.target.value } })}
                />

                <input
                  placeholder="COMPOSITOR"
                  className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 py-5 px-8 rounded-[1.5rem] text-xs font-black text-[#6B5E70] uppercase outline-none"
                  value={formState.nuevoCompositor}
                  onChange={(e) => dispatchForm({ type: "SET_ADD_FORM", payload: { nuevoCompositor: e.target.value } })}
                />

                <div className="space-y-2 px-2">
                  <label className="text-[9px] font-black uppercase text-[#6B5E70]/40 tracking-widest">Idioma</label>
                  <select
                    className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 py-5 px-8 rounded-[1.5rem] text-xs font-black text-[#6B5E70] uppercase outline-none appearance-none"
                    value={formState.nuevoIdioma}
                    onChange={(e) => dispatchForm({ type: "SET_ADD_FORM", payload: { nuevoIdioma: e.target.value } })}
                  >
                    {IDIOMAS_DISPONIBLES.map(idioma => <option key={idioma} value={idioma}>{idioma}</option>)}
                  </select>
                </div>

                <div className="space-y-2 px-2">
                  <label className="text-[9px] font-black uppercase text-[#6B5E70]/40 tracking-widest">Tema / Motivo</label>
                  <select
                    className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 py-5 px-8 rounded-[1.5rem] text-xs font-black text-[#6B5E70] uppercase outline-none appearance-none"
                    value={formState.nuevoTema}
                    onChange={(e) => dispatchForm({ type: "SET_ADD_FORM", payload: { nuevoTema: e.target.value } })}
                  >
                    <option value="">Sin tema</option>
                    {TEMAS_DISPONIBLES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="space-y-2 px-2">
                  <label className="text-[9px] font-black uppercase text-[#6B5E70]/40 tracking-widest">Emoción / Temple</label>
                  <select
                    className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 py-5 px-8 rounded-[1.5rem] text-xs font-black text-[#6B5E70] uppercase outline-none appearance-none"
                    value={formState.nuevoEmocion}
                    onChange={(e) => dispatchForm({ type: "SET_ADD_FORM", payload: { nuevoEmocion: e.target.value } })}
                  >
                    <option value="">Sin emoción</option>
                    {EMOCIONES_DISPONIBLES.map(em => <option key={em} value={em}>{em}</option>)}
                  </select>
                </div>

                <button type="submit" disabled={modalState.isProcessing} className="w-full bg-[#6B5E70] text-white py-5 rounded-[1.5rem] font-black uppercase text-[10px] tracking-[0.3em] shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3">
                  {modalState.isProcessing ? <><Loader2 className="animate-spin" size={16} />Registrando...</> : "Crear Soliloquio"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="max-w-6xl mx-auto pt-24 px-6 mb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
            <h1 className="text-4xl md:text-5xl font-black text-[#6B5E70] italic uppercase tracking-tighter leading-none mb-4">
              Solilo<span className="text-[#6B5E70]/20">quios</span>
            </h1>
            <div className="flex items-center gap-4">
              <div className="h-2 w-24 bg-[#6B5E70] rounded-full" />
              <span className="text-[10px] font-black text-[#6B5E70]/40 uppercase tracking-[0.4em]">Covers</span>
            </div>
          </motion.div>
          {isAdmin && (
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => dispatchModal({ type: "OPEN_ADD" })}
              className="bg-[#6B5E70] text-white px-10 py-5 rounded-full shadow-2xl shadow-[#6B5E70]/30 flex items-center gap-4 font-black uppercase text-[10px] tracking-[0.2em]"
            >
              <Plus size={20} /> Añadir Canción
            </motion.button>
          )}
        </div>
      </header>

      {/* SECCIÓN DE FILTROS */}
      <section className="max-w-6xl mx-auto px-6 mb-16">
        <div className="bg-white/50 backdrop-blur-sm border border-[#6B5E70]/10 p-6 rounded-[2.5rem] flex flex-col gap-4">

          {/* BARRA DE BÚSQUEDA */}
          <div className="relative">
            <Search
              size={16}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-[#6B5E70]/30 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Buscar por título..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 py-4 pl-12 pr-12 rounded-[1.5rem] text-sm font-black text-[#6B5E70] uppercase outline-none focus:border-[#6B5E70]/30 transition-all placeholder:text-[#6B5E70]/20 placeholder:normal-case placeholder:font-normal"
            />
            <AnimatePresence>
              {busqueda && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => setBusqueda("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B5E70]/30 hover:text-[#6B5E70] transition-colors p-1"
                >
                  <X size={16} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <FiltrosMaestros
            config={opciones}
            filtrosActivos={filtros}
            onChange={actualizarFiltro}
          />

          <div className="flex items-center justify-between">
            {hayFiltrosActivos ? (
              <button
                onClick={() => { resetearFiltros(); setBusqueda(""); }}
                className="text-[#6B5E70]/40 hover:text-red-500 transition-colors text-[9px] font-black uppercase tracking-widest flex items-center gap-2 px-4"
              >
                <X size={14} /> Limpiar filtros
              </button>
            ) : (
              <span />
            )}

            {/* TOGGLE DE VISTA */}
            <div className="flex items-center gap-1 bg-white border-2 border-[#6B5E70]/5 rounded-full p-1">
              <button
                onClick={() => setVistaGrid(true)}
                className={`p-2 rounded-full transition-all ${vistaGrid ? "bg-[#6B5E70] text-white shadow-md" : "text-[#6B5E70]/40 hover:text-[#6B5E70]"}`}
                title="Vista cuadrícula"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={() => setVistaGrid(false)}
                className={`p-2 rounded-full transition-all ${!vistaGrid ? "bg-[#6B5E70] text-white shadow-md" : "text-[#6B5E70]/40 hover:text-[#6B5E70]"}`}
                title="Vista fila"
              >
                <AlignJustify size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-6">
        <div className={`grid gap-4 ${vistaGrid ? "grid-cols-2 gap-12" : "grid-cols-1"}`}>
          {cancionesFinales.map((cancion: any) => (
            <CancionCard key={cancion.id} cancion={cancion} isAdmin={isAdmin} onEdit={openEditModal} vistaFila={!vistaGrid} />
          ))}
        </div>

        {cancionesFinales.length === 0 && (
          <div className="text-center py-20">
            <Music size={48} className="mx-auto text-[#6B5E70]/20 mb-4" />
            <p className="text-[#6B5E70]/20 font-black uppercase tracking-[0.5em] text-xs">No se encontraron soliloquios</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Canciones;