"use client";

import React, { useState, useEffect, useReducer, useCallback } from "react";
import Link from "next/link";
import { Music, ChevronRight, Plus, Edit3, X, User, Eye, EyeOff, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/api/supabase";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { SmartImage } from "@/components/shared/display/SmartImage";

// ============================================================================
// CONSTANTES
// ============================================================================

const ESTADOS = ["BORRADOR", "EN PROCESO", "TERMINADA"];

const getEstadoColor = (estado) => {
  const colores = {
    "TERMINADA": "bg-[#6B5E70]/10 text-[#6B5E70] border-[#6B5E70]/20",
    "EN PROCESO": "bg-[#FDFCFD] text-[#6B5E70]/80 border-[#6B5E70]/10",
    "BORRADOR": "bg-[#F4F4F5] text-[#6B5E70]/60 border-[#E4E4E7]"
  };
  return colores[estado] || colores["BORRADOR"];
};

// ============================================================================
// REDUCERS
// ============================================================================

const initialModalState = {
  showEditModal: false,
  showAddModal: false,
  isProcessing: false,
  selectedCancion: null
};

const modalReducer = (state, action) => {
  switch(action.type) {
    case "OPEN_EDIT": return { ...state, showEditModal: true, selectedCancion: action.payload };
    case "CLOSE_EDIT": return { ...state, showEditModal: false, selectedCancion: null };
    case "OPEN_ADD": return { ...state, showAddModal: true };
    case "CLOSE_ADD": return { ...state, showAddModal: false };
    case "SET_PROCESSING": return { ...state, isProcessing: action.payload };
    default: return state;
  }
};

const initialFormState = {
  // Editar
  editTitulo: "",
  editPersonaje: "",
  editEstado: "BORRADOR",
  editVisible: false,
  // Crear
  nuevoTitulo: "",
  nuevoPersonaje: ""
};

const formReducer = (state, action) => {
  switch(action.type) {
    case "SET_EDIT_FORM": return { ...state, ...action.payload };
    case "SET_ADD_FORM": return { ...state, ...action.payload };
    case "RESET_EDIT": return { ...state, editTitulo: "", editPersonaje: "", editEstado: "BORRADOR", editVisible: false };
    case "RESET_ADD": return { ...state, nuevoTitulo: "", nuevoPersonaje: "" };
    default: return state;
  }
};

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

const CancionCard = ({ cancion, isAdmin, onEdit, getEstadoColor }) => (
  <div className="relative group">
    {isAdmin && (
      <div className="absolute top-4 right-4 z-[50] flex gap-2">
        {!cancion.visible && (
          <div className="bg-[#6B5E70] text-white p-2 px-3 rounded-full text-[8px] font-black uppercase flex items-center gap-1.5 shadow-xl">
            <EyeOff size={12} /> Oculto
          </div>
        )}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => onEdit(e, cancion)}
          className="bg-white text-[#6B5E70] p-3 rounded-full shadow-2xl border border-[#6B5E70]/10 hover:scale-110 transition-all"
        >
          <Edit3 size={16} />
        </motion.button>
      </div>
    )}

    <Link href={`/wiki/canciones/${cancion.id}`}>
      <motion.div whileHover={{ y: -10 }} className="cursor-pointer">
        <div
          className={`relative aspect-square rounded-[3rem] overflow-hidden shadow-xl border border-[#6B5E70]/10 bg-gradient-to-br from-[#6B5E70]/5 to-[#6B5E70]/20 ${
            !cancion.visible && isAdmin ? "grayscale-[0.4] opacity-80" : ""
          }`}
        >
          <SmartImage
            src={cancion.portada_url || "/placeholder-cover.jpg"}
            alt={cancion.titulo}
            className="w-full h-full object-cover"
          />
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
            <span className="flex items-center gap-1.5">
              <Music size={12} /> Letra
            </span>
            <span className="flex items-center gap-1.5">
              <ChevronRight size={12} /> Abrir
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  </div>
);

// ============================================================================
// MODAL DE EDICIÓN
// ============================================================================

const EditModal = ({
  isOpen,
  isProcessing,
  formState,
  listaPersonajes,
  onClose,
  onSubmit,
  onFormChange
}) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#6B5E70]/20 backdrop-blur-sm"
        />
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative z-10 border border-[#6B5E70]/10"
        >
          <motion.button
            whileHover={{ rotate: 90 }}
            onClick={onClose}
            className="absolute top-8 right-8 text-[#6B5E70]/20 hover:text-[#6B5E70] transition-colors"
          >
            <X size={20} />
          </motion.button>

          <h3 className="text-center text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.3em] mb-8 italic">
            ✏️ Modificar Canción
          </h3>

          <form onSubmit={onSubmit} className="space-y-6">
            {/* Toggle Visibilidad */}
            <div className="flex items-center justify-between p-4 bg-[#6B5E70]/5 rounded-2xl border border-[#6B5E70]/10">
              <div className="flex items-center gap-3">
                {formState.editVisible ? (
                  <Eye size={18} className="text-[#6B5E70]" />
                ) : (
                  <EyeOff size={18} className="text-slate-400" />
                )}
                <span className="text-[10px] font-black text-[#6B5E70] uppercase tracking-wider italic">
                  Pública
                </span>
              </div>
              <motion.button
                type="button"
                onClick={() =>
                  onFormChange({
                    type: "SET_EDIT_FORM",
                    payload: { editVisible: !formState.editVisible }
                  })
                }
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  formState.editVisible ? "bg-[#6B5E70]" : "bg-slate-300"
                }`}
              >
                <motion.div
                  animate={{ x: formState.editVisible ? 24 : 4 }}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                />
              </motion.button>
            </div>

            {/* Título */}
            <div>
              <label className="text-[9px] font-black text-[#6B5E70]/40 uppercase ml-2 italic">
                Título
              </label>
              <input
                type="text"
                value={formState.editTitulo}
                onChange={(e) =>
                  onFormChange({
                    type: "SET_EDIT_FORM",
                    payload: { editTitulo: e.target.value }
                  })
                }
                className="w-full bg-[#FDFCFD] border-b-2 border-[#6B5E70]/10 py-4 text-center text-sm font-black text-[#6B5E70] outline-none focus:border-[#6B5E70] uppercase"
              />
            </div>

            {/* Personaje */}
            <div>
              <label className="text-[9px] font-black text-[#6B5E70]/40 uppercase ml-2 italic">
                Personaje
              </label>
              <select
                value={formState.editPersonaje}
                onChange={(e) =>
                  onFormChange({
                    type: "SET_EDIT_FORM",
                    payload: { editPersonaje: e.target.value }
                  })
                }
                className="w-full bg-[#FDFCFD] border-b-2 border-[#6B5E70]/10 py-4 text-center text-sm font-medium text-[#6B5E70] outline-none focus:border-[#6B5E70] appearance-none cursor-pointer"
              >
                <option value="">SIN PERSONAJE</option>
                {listaPersonajes.map((p) => (
                  <option key={p.nombre} value={p.nombre}>
                    {p.nombre.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Estado */}
            <div>
              <label className="text-[9px] font-black text-[#6B5E70]/40 uppercase ml-2 italic">
                Estado
              </label>
              <select
                value={formState.editEstado}
                onChange={(e) =>
                  onFormChange({
                    type: "SET_EDIT_FORM",
                    payload: { editEstado: e.target.value }
                  })
                }
                className="w-full bg-[#FDFCFD] border-b-2 border-[#6B5E70]/10 py-4 text-center text-sm font-black text-[#6B5E70] outline-none focus:border-[#6B5E70] uppercase"
              >
                {ESTADOS.map((est) => (
                  <option key={est} value={est}>
                    {est}
                  </option>
                ))}
              </select>
            </div>

            {/* Botón Submit */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isProcessing || !formState.editTitulo.trim()}
              className="w-full bg-[#6B5E70] text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg hover:bg-[#5A4D5F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex justify-center items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" size={14} />
                  Guardando...
                </>
              ) : (
                "Actualizar Canción"
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

// ============================================================================
// MODAL DE CREAR
// ============================================================================

const AddModal = ({
  isOpen,
  isProcessing,
  formState,
  listaPersonajes,
  onClose,
  onSubmit,
  onFormChange
}) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#6B5E70]/20 backdrop-blur-sm"
        />
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative z-10 border border-[#6B5E70]/10"
        >
          <motion.button
            whileHover={{ rotate: 90 }}
            onClick={onClose}
            className="absolute top-8 right-8 text-[#6B5E70]/20 hover:text-[#6B5E70] transition-colors"
          >
            <X size={20} />
          </motion.button>

          <h3 className="text-center text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.3em] mb-8 italic">
            ➕ Nueva Canción
          </h3>

          <form onSubmit={onSubmit} className="space-y-6">
            <input
              type="text"
              placeholder="TÍTULO..."
              value={formState.nuevoTitulo}
              onChange={(e) =>
                onFormChange({
                  type: "SET_ADD_FORM",
                  payload: { nuevoTitulo: e.target.value }
                })
              }
              className="w-full bg-[#FDFCFD] border-b-2 border-[#6B5E70]/10 py-4 text-center text-sm font-black text-[#6B5E70] outline-none focus:border-[#6B5E70] uppercase"
            />
            <select
              value={formState.nuevoPersonaje}
              onChange={(e) =>
                onFormChange({
                  type: "SET_ADD_FORM",
                  payload: { nuevoPersonaje: e.target.value }
                })
              }
              className="w-full bg-[#FDFCFD] border-b-2 border-[#6B5E70]/10 py-4 text-center text-sm font-medium text-[#6B5E70] outline-none focus:border-[#6B5E70] appearance-none cursor-pointer"
            >
              <option value="">SIN PERSONAJE</option>
              {listaPersonajes.map((p) => (
                <option key={p.nombre} value={p.nombre}>
                  {p.nombre.toUpperCase()}
                </option>
              ))}
            </select>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isProcessing || !formState.nuevoTitulo.trim()}
              className="w-full bg-[#6B5E70] text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg hover:bg-[#5A4D5F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex justify-center items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" size={14} />
                  Creando...
                </>
              ) : (
                "Crear Canción"
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const Canciones = () => {
  const { data: canciones = [], loading, setData: setCanciones } = useSupabaseData("canciones", {
    order: { campo: "created_at", asc: false }
  });

  const [isAdmin, setIsAdmin] = useState(false);
  const [listaPersonajes, setListaPersonajes] = useState([]);

  const [modalState, dispatchModal] = useReducer(modalReducer, initialModalState);
  const [formState, dispatchForm] = useReducer(formReducer, initialFormState);

  // ========================================================================
  // INICIALIZACIÓN
  // ========================================================================

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setIsAdmin(true);
    });

    const fetchPersonajes = async () => {
      const { data, error } = await supabase
        .from("personajes")
        .select("nombre")
        .order("nombre", { ascending: true });

      if (!error && data) {
        setListaPersonajes(data);
      }
    };
    fetchPersonajes();
  }, []);

  // ========================================================================
  // FUNCIONES
  // ========================================================================

  const openEditModal = useCallback((e, cancion) => {
    e.preventDefault();
    e.stopPropagation();
    dispatchForm({
      type: "SET_EDIT_FORM",
      payload: {
        editTitulo: cancion.titulo,
        editPersonaje: cancion.personaje || "",
        editEstado: cancion.estado || "BORRADOR",
        editVisible: cancion.visible || false
      }
    });
    dispatchModal({ type: "OPEN_EDIT", payload: cancion });
  }, []);

  const handleUpdateCancion = async (e) => {
    e.preventDefault();
    if (!formState.editTitulo.trim() || modalState.isProcessing) return;

    dispatchModal({ type: "SET_PROCESSING", payload: true });

    try {
      const nuevoTituloUpper = formState.editTitulo.toUpperCase();
      const { error } = await supabase
        .from("canciones")
        .update({
          titulo: nuevoTituloUpper,
          personaje: formState.editPersonaje || null,
          estado: formState.editEstado,
          visible: formState.editVisible
        })
        .eq("id", modalState.selectedCancion.id);

      if (error) throw error;

      setCanciones((prev) =>
        prev.map((c) =>
          c.id === modalState.selectedCancion.id
            ? {
                ...c,
                titulo: nuevoTituloUpper,
                personaje: formState.editPersonaje,
                estado: formState.editEstado,
                visible: formState.editVisible
              }
            : c
        )
      );

      dispatchModal({ type: "CLOSE_EDIT" });
      dispatchForm({ type: "RESET_EDIT" });
    } catch (error) {
      console.error("Error al actualizar:", error);
      alert("No se pudo actualizar la canción");
    } finally {
      dispatchModal({ type: "SET_PROCESSING", payload: false });
    }
  };

  const handleAddCancion = async (e) => {
    e.preventDefault();
    if (!formState.nuevoTitulo.trim() || modalState.isProcessing) return;

    dispatchModal({ type: "SET_PROCESSING", payload: true });

    try {
      const { data, error } = await supabase
        .from("canciones")
        .insert([
          {
            titulo: formState.nuevoTitulo.toUpperCase(),
            personaje: formState.nuevoPersonaje || null,
            estado: "BORRADOR",
            portada_url: "/placeholder-cover.jpg",
            visible: false
          }
        ])
        .select();

      if (error) throw error;

      if (data?.length > 0) {
        setCanciones((prev) => [data[0], ...prev]);
        dispatchModal({ type: "CLOSE_ADD" });
        dispatchForm({ type: "RESET_ADD" });
      }
    } catch (error) {
      console.error("Error al crear:", error);
      alert("Error al crear la canción");
    } finally {
      dispatchModal({ type: "SET_PROCESSING", payload: false });
    }
  };

  const cancionesAMostrar = isAdmin
    ? canciones
    : canciones.filter((c) => c.visible === true);

  // ========================================================================
  // RENDER
  // ========================================================================

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#FDFCFD]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-[#6B5E70]" size={32} />
          <div className="text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.3em]">
            Abriendo Partituras...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFD] pb-20">
      {/* MODALES */}
      <EditModal
        isOpen={modalState.showEditModal}
        isProcessing={modalState.isProcessing}
        formState={formState}
        listaPersonajes={listaPersonajes}
        onClose={() => {
          dispatchModal({ type: "CLOSE_EDIT" });
          dispatchForm({ type: "RESET_EDIT" });
        }}
        onSubmit={handleUpdateCancion}
        onFormChange={dispatchForm}
      />

      <AddModal
        isOpen={modalState.showAddModal}
        isProcessing={modalState.isProcessing}
        formState={formState}
        listaPersonajes={listaPersonajes}
        onClose={() => {
          dispatchModal({ type: "CLOSE_ADD" });
          dispatchForm({ type: "RESET_ADD" });
        }}
        onSubmit={handleAddCancion}
        onFormChange={dispatchForm}
      />

      {/* HEADER */}
      <div className="max-w-6xl mx-auto pt-16 px-6 mb-12 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-[#6B5E70] italic tracking-tighter flex items-center gap-3 uppercase">
            <Music size={32} /> Soliloquios
          </h1>
          <p className="text-[#6B5E70]/50 text-xs font-bold uppercase tracking-widest mt-2 italic">
            Partituras de Nadiria
          </p>
        </div>
        {isAdmin && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => dispatchModal({ type: "OPEN_ADD" })}
            className="bg-[#6B5E70] text-white p-4 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all z-50"
          >
            <Plus size={24} />
          </motion.button>
        )}
      </div>

      {/* GRID DE CANCIONES */}
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
        {cancionesAMostrar.map((cancion) => (
          <CancionCard
            key={cancion.id}
            cancion={cancion}
            isAdmin={isAdmin}
            onEdit={openEditModal}
            getEstadoColor={getEstadoColor}
          />
        ))}
      </div>
    </div>
  );
};

export default Canciones;