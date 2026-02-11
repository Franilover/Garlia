"use client";

import React, { useState, useEffect, useReducer, useCallback } from "react";
import Link from "next/link";
import { Music, ChevronRight, Plus, Edit3, X, User, Eye, EyeOff, Loader2, Save } from "lucide-react";
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
    "TERMINADA": "bg-gradient-to-r from-emerald-500/20 to-emerald-400/10 text-emerald-700 border-emerald-300/30",
    "EN PROCESO": "bg-gradient-to-r from-amber-500/20 to-amber-400/10 text-amber-700 border-amber-300/30",
    "BORRADOR": "bg-gradient-to-r from-slate-500/20 to-slate-400/10 text-slate-600 border-slate-300/30"
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
  editTitulo: "",
  editPersonaje: "",
  editEstado: "BORRADOR",
  editVisible: false,
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
  <div className="relative group h-full">
    {isAdmin && (
      <div className="absolute top-4 right-4 z-[50] flex gap-2">
        {!cancion.visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-[#6B5E70] to-[#8B7A90] text-white p-2 px-3 rounded-full text-[8px] font-black uppercase flex items-center gap-1.5 shadow-xl backdrop-blur-sm"
          >
            <EyeOff size={12} /> Oculto
          </motion.div>
        )}
        <motion.button
          whileHover={{ scale: 1.15, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => onEdit(e, cancion)}
          className="bg-white/95 text-[#6B5E70] p-3 rounded-full shadow-2xl border-2 border-[#6B5E70]/20 hover:shadow-[0_0_20px_rgba(107,94,112,0.3)] transition-all backdrop-blur-sm"
        >
          <Edit3 size={16} />
        </motion.button>
      </div>
    )}

    <Link href={`/wiki/canciones/${cancion.id}`}>
      <motion.div
        whileHover={{ y: -12 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="cursor-pointer h-full flex flex-col"
      >
        <div className="relative aspect-square rounded-[2.5rem] overflow-hidden shadow-2xl border border-[#6B5E70]/10 bg-gradient-to-br from-[#6B5E70]/10 to-[#6B5E70]/5 group-hover:shadow-[0_20px_40px_rgba(107,94,112,0.15)] transition-all">
          <SmartImage
            src={cancion.portada_url || "/placeholder-cover.jpg"}
            alt={cancion.titulo}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-[#6B5E70]/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`absolute top-6 left-6 z-20 backdrop-blur-md px-4 py-2 rounded-full border font-black text-[9px] uppercase tracking-widest shadow-lg ${getEstadoColor(
              cancion.estado
            )}`}
          >
            {cancion.estado}
          </motion.div>

          {cancion.personaje && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-6 right-6 z-20 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full border border-[#6B5E70]/20 flex items-center gap-2 shadow-lg group-hover:shadow-xl transition-shadow"
            >
              <User size={11} className="text-[#6B5E70]" />
              <span className="text-[9px] font-black text-[#6B5E70] uppercase italic">
                {cancion.personaje}
              </span>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileHover={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100"
          >
            <div className="bg-white/90 p-4 rounded-full shadow-xl backdrop-blur-sm">
              <ChevronRight size={28} className="text-[#6B5E70]" />
            </div>
          </motion.div>
        </div>

        <div className="mt-6 flex-1 flex flex-col px-2 text-center sm:text-left">
          <h2 className="text-[#6B5E70] font-black uppercase text-base group-hover:text-[#9A89A0] transition-colors leading-tight tracking-tight italic line-clamp-2">
            {cancion.titulo}
          </h2>

          <div className="flex items-center gap-3 mt-auto pt-4 text-[#6B5E70]/40 font-bold text-[8px] uppercase tracking-widest justify-center sm:justify-start">
            <motion.span
              whileHover={{ x: 2 }}
              className="flex items-center gap-1.5 group-hover:text-[#6B5E70] transition-colors"
            >
              <Music size={10} /> Letra
            </motion.span>
            <span className="text-[#6B5E70]/20">•</span>
            <motion.span
              whileHover={{ x: 2 }}
              className="flex items-center gap-1.5 group-hover:text-[#6B5E70] transition-colors"
            >
              <ChevronRight size={10} /> Abrir
            </motion.span>
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
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#6B5E70]/20 backdrop-blur-sm"
        />
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 border border-[#6B5E70]/10 overflow-hidden"
        >
          <div className="h-1 bg-gradient-to-r from-[#6B5E70]/0 via-[#6B5E70] to-[#6B5E70]/0" />

          <motion.button
            whileHover={{ rotate: 90, scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="absolute top-6 right-6 text-[#6B5E70]/30 hover:text-[#6B5E70] transition-colors z-20"
          >
            <X size={22} />
          </motion.button>

          <div className="p-8 sm:p-10">
            <motion.h3
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center text-[#6B5E70] font-black uppercase text-[11px] tracking-[0.4em] mb-8 italic"
            >
              ✏️ Modificar Canción
            </motion.h3>

            <form onSubmit={onSubmit} className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-[#6B5E70]/5 to-[#6B5E70]/10 rounded-2xl border border-[#6B5E70]/10 hover:border-[#6B5E70]/20 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#6B5E70]/10 rounded-lg">
                    {formState.editVisible ? (
                      <Eye size={18} className="text-[#6B5E70]" />
                    ) : (
                      <EyeOff size={18} className="text-[#6B5E70]/50" />
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-[#6B5E70] uppercase tracking-wider italic block">
                      Pública
                    </span>
                    <span className="text-[8px] text-[#6B5E70]/40 italic">
                      {formState.editVisible ? "Visible" : "Oculta"}
                    </span>
                  </div>
                </div>
                <motion.button
                  type="button"
                  onClick={() =>
                    onFormChange({
                      type: "SET_EDIT_FORM",
                      payload: { editVisible: !formState.editVisible }
                    })
                  }
                  className={`w-14 h-7 rounded-full transition-all relative flex items-center ${
                    formState.editVisible
                      ? "bg-gradient-to-r from-[#6B5E70] to-[#8B7A90]"
                      : "bg-[#E0E0E0]"
                  }`}
                >
                  <motion.div
                    animate={{ x: formState.editVisible ? 28 : 4 }}
                    className="w-5 h-5 bg-white rounded-full shadow-md"
                  />
                </motion.button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
              >
                <label className="text-[9px] font-black text-[#6B5E70]/50 uppercase ml-2 italic tracking-wider block mb-2">
                  📝 Título
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
                  className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 py-3 px-4 text-center text-sm font-black text-[#6B5E70] outline-none focus:border-[#6B5E70] focus:ring-2 focus:ring-[#6B5E70]/20 rounded-xl uppercase transition-all"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <label className="text-[9px] font-black text-[#6B5E70]/50 uppercase ml-2 italic tracking-wider block mb-2">
                  👤 Personaje
                </label>
                <select
                  value={formState.editPersonaje}
                  onChange={(e) =>
                    onFormChange({
                      type: "SET_EDIT_FORM",
                      payload: { editPersonaje: e.target.value }
                    })
                  }
                  className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 py-3 px-4 text-center text-sm font-medium text-[#6B5E70] outline-none focus:border-[#6B5E70] focus:ring-2 focus:ring-[#6B5E70]/20 rounded-xl appearance-none cursor-pointer transition-all"
                >
                  <option value="">SIN PERSONAJE</option>
                  {listaPersonajes.map((p) => (
                    <option key={p.nombre} value={p.nombre}>
                      {p.nombre.toUpperCase()}
                    </option>
                  ))}
                </select>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <label className="text-[9px] font-black text-[#6B5E70]/50 uppercase ml-2 italic tracking-wider block mb-2">
                  🎯 Estado
                </label>
                <select
                  value={formState.editEstado}
                  onChange={(e) =>
                    onFormChange({
                      type: "SET_EDIT_FORM",
                      payload: { editEstado: e.target.value }
                    })
                  }
                  className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 py-3 px-4 text-center text-sm font-black text-[#6B5E70] outline-none focus:border-[#6B5E70] focus:ring-2 focus:ring-[#6B5E70]/20 rounded-xl uppercase appearance-none cursor-pointer transition-all"
                >
                  {ESTADOS.map((est) => (
                    <option key={est} value={est}>
                      {est}
                    </option>
                  ))}
                </select>
              </motion.div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isProcessing || !formState.editTitulo.trim()}
                className="w-full bg-gradient-to-r from-[#6B5E70] to-[#8B7A90] text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2 mt-8"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Actualizar Canción
                  </>
                )}
              </motion.button>
            </form>
          </div>
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
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#6B5E70]/20 backdrop-blur-sm"
        />
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 border border-[#6B5E70]/10 overflow-hidden"
        >
          <div className="h-1 bg-gradient-to-r from-[#6B5E70]/0 via-[#6B5E70] to-[#6B5E70]/0" />

          <motion.button
            whileHover={{ rotate: 90, scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="absolute top-6 right-6 text-[#6B5E70]/30 hover:text-[#6B5E70] transition-colors z-20"
          >
            <X size={22} />
          </motion.button>

          <div className="p-8 sm:p-10">
            <motion.h3
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center text-[#6B5E70] font-black uppercase text-[11px] tracking-[0.4em] mb-8 italic"
            >
              ➕ Nueva Canción
            </motion.h3>

            <form onSubmit={onSubmit} className="space-y-6">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <label className="text-[9px] font-black text-[#6B5E70]/50 uppercase ml-2 italic tracking-wider block mb-2">
                  📝 Título
                </label>
                <input
                  type="text"
                  placeholder="Nombre de la canción..."
                  value={formState.nuevoTitulo}
                  onChange={(e) =>
                    onFormChange({
                      type: "SET_ADD_FORM",
                      payload: { nuevoTitulo: e.target.value }
                    })
                  }
                  className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 py-3 px-4 text-center text-sm font-black text-[#6B5E70] outline-none focus:border-[#6B5E70] focus:ring-2 focus:ring-[#6B5E70]/20 rounded-xl uppercase transition-all"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
              >
                <label className="text-[9px] font-black text-[#6B5E70]/50 uppercase ml-2 italic tracking-wider block mb-2">
                  👤 Personaje (Opcional)
                </label>
                <select
                  value={formState.nuevoPersonaje}
                  onChange={(e) =>
                    onFormChange({
                      type: "SET_ADD_FORM",
                      payload: { nuevoPersonaje: e.target.value }
                    })
                  }
                  className="w-full bg-[#FDFCFD] border-2 border-[#6B5E70]/10 py-3 px-4 text-center text-sm font-medium text-[#6B5E70] outline-none focus:border-[#6B5E70] focus:ring-2 focus:ring-[#6B5E70]/20 rounded-xl appearance-none cursor-pointer transition-all"
                >
                  <option value="">SIN PERSONAJE</option>
                  {listaPersonajes.map((p) => (
                    <option key={p.nombre} value={p.nombre}>
                      {p.nombre.toUpperCase()}
                    </option>
                  ))}
                </select>
              </motion.div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isProcessing || !formState.nuevoTitulo.trim()}
                className="w-full bg-gradient-to-r from-[#6B5E70] to-[#8B7A90] text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2 mt-8"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Creando...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Crear Canción
                  </>
                )}
              </motion.button>
            </form>
          </div>
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
      const { data, error } = await supabase
        .from("canciones")
        .update({
          titulo: nuevoTituloUpper,
          personaje: formState.editPersonaje || null,
          estado: formState.editEstado,
          visible: formState.editVisible
        })
        .eq("id", modalState.selectedCancion.id)
        .select(); // IMPORTANTE: Pedir los datos actualizados

      if (error) throw error;

      if (data && data.length > 0) {
        // ACTUALIZACIÓN DE ESTADO CORRECTA:
        setCanciones((prev) => {
          const index = prev.findIndex(c => c.id === modalState.selectedCancion.id);
          if (index === -1) return prev;
          const newCanciones = [...prev];
          newCanciones[index] = data[0];
          return newCanciones;
        });
      }

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

      if (data && data.length > 0) {
        // ACTUALIZACIÓN DE ESTADO CORRECTA:
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

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto pt-16 px-6 mb-16 flex justify-between items-end gap-8"
      >
        <div className="flex-1">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-4 mb-4"
          >
            <div className="p-3 bg-gradient-to-br from-[#6B5E70]/10 to-[#6B5E70]/5 rounded-2xl">
              <Music size={32} className="text-[#6B5E70]" />
            </div>
            <div>
              <h1 className="text-5xl font-black text-[#6B5E70] italic tracking-tighter leading-[0.9] uppercase">
                Soliloquios
              </h1>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="h-1.5 w-32 bg-gradient-to-r from-[#6B5E70] to-[#6B5E70]/20 rounded-full origin-left"
          />
        </div>

        {isAdmin && (
          <motion.button
            whileHover={{ scale: 1.12, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            onClick={() => dispatchModal({ type: "OPEN_ADD" })}
            className="group relative p-4 rounded-full shadow-2xl z-50 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#6B5E70] to-[#8B7A90]" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
            <Plus
              size={28}
              className="text-white relative z-10 group-hover:rotate-90 transition-transform duration-300"
            />
          </motion.button>
        )}
      </motion.div>

      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
        {cancionesAMostrar.map((cancion, index) => (
          <motion.div
            key={cancion.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <CancionCard
              cancion={cancion}
              isAdmin={isAdmin}
              onEdit={openEditModal}
              getEstadoColor={getEstadoColor}
            />
          </motion.div>
        ))}
      </div>

      {cancionesAMostrar.length === 0 && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-24"
        >
          <Music size={48} className="mx-auto text-[#6B5E70]/20 mb-4" />
          <p className="text-[#6B5E70]/40 font-black uppercase text-sm tracking-widest">
            No hay canciones disponibles
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default Canciones;