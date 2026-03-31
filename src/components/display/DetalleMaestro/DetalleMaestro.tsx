"use client";
import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Edit3, Save, Plus, CheckCircle2, Trash2, Camera,
} from "lucide-react";
import { useDetalleMaestro, type Variante } from "@/hooks/features/useDetalleMaestro";
import { useToast } from "@/hooks/ui/useToast";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { SeccionMusica, SelectorMusicaAdmin } from "./SeccionMusica";
import { SelectorVariantes } from "./SelectorVariantes";
import SimpleImagePicker from "@/components/forms/SimpleImagePicker";

interface DetalleMaestroProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  tabla: string;
  tags?: string[];
  onUpdate?: (record: any) => void;
  onDelete?: () => void;               
  isNew?: boolean;
  mostrarMusica?: boolean;
}

export default function DetalleMaestro({
  isOpen, onClose, data, tabla, tags = [], onUpdate, onDelete, isNew = false, mostrarMusica = true,
}: DetalleMaestroProps) {
  const [internalData, setInternalData] = useState(data);

  useEffect(() => {
    if (isNew) {
      const campoTexto = tabla === "personajes" ? "sobre" : "descripcion";
      setInternalData({ nombre: "", [campoTexto]: "", id: null });
    } else {
      setInternalData(data);
    }
  }, [data, isNew, tabla]);

  if (!isOpen) return null;

  return (
    <ProjectDetalleContenido
      data={internalData}
      tabla={tabla}
      onClose={onClose}
      tags={tags}
      onUpdate={onUpdate}
      onDelete={onDelete}
      isNew={isNew}
      mostrarMusica={mostrarMusica}
    />
  );
}

function ProjectDetalleContenido({ data, tabla, onClose, tags, onUpdate, onDelete, isNew, mostrarMusica }: any) {
  const { toasts, toast, dismiss } = useToast();
  const { confirm, ConfirmModal } = useConfirm();

  const {
    isAdmin, editMode, setEditMode, saving, handleSave, handleDelete,
    variantes, setVariantes,
    varianteActiva, setVarianteActiva,
    editFields, setEditFields,
    editNombre, setEditNombre,
    editDescripcion, setEditDescripcion,
    editCanciones, setEditCanciones,
  } = useDetalleMaestro(data, tabla, {
    onUpdate,
    showError: toast.error,
    requestConfirm: (msg) => confirm({ message: msg, danger: true }),
  });

  const [showSuccess, setShowSuccess] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  
  const campoImagen = tabla === "personajes" ? "img_url" : "imagen_url";

  const handlePickImage = (url: string) => {
    setEditFields((prev: any) => ({ ...prev, [campoImagen]: url }));
    setShowPicker(false);
  };

  const esPersonaje = useMemo(
    () => tabla === "personajes",
    [tabla]
  );

  const especie = data?.especie || "Humano";
  const alma = data?.alma || "Desconocida";

  useEffect(() => {
    if (isNew) setEditMode(true);
  }, [isNew, setEditMode]);

  const agregarVariante = () => {
    const nueva = {
      id: String(Date.now()),   // id temporal, Supabase asigna el real al guardar
      tipo: "Nueva Variante",
      descripcion_variante: "",
      imagen_url: "",
      criatura_id: data?.id ? String(data.id) : "",
    } as Variante;
    setVariantes([...variantes, nueva]);
  };

  const eliminarVariante = (index: number) => {
    const nuevas = variantes.filter((_, i) => i !== index);
    setVariantes(nuevas);
    if (varianteActiva === variantes[index]) setVarianteActiva(null);
  };

  const actualizarVariante = (index: number, campo: keyof Variante, valor: string) => {
    const nuevas = [...variantes];
    nuevas[index] = { ...nuevas[index], [campo]: valor };
    setVariantes(nuevas);
  };

  const onConfirmSave = async () => {
    const ok = await handleSave();
    if (ok) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        if (isNew) onClose();
      }, 2000);
    }
  };

  const imagenVisual =
    varianteActiva?.imagen_url ||
    (editMode ? editFields?.[campoImagen] : null) ||
    data?.img_url ||
    data?.imagen_url ||
    "/placeholder.png";

  return (
    <>
    <div className="w-full max-w-[96%] xl:max-w-screen-2xl mx-auto relative pt-10 px-4 pb-32 space-y-8">
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-10 left-1/2 -translate-x-1/2 z-3000 bg-accent text-primary px-10 py-5 shadow-lg flex items-center gap-3 font-bold border border-primary/20" style={{borderRadius:"var(--radius-card)"}}
          >
            <CheckCircle2 size={24} /> Registro Sincronizado
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white-custom rounded-[var(--radius-card)] overflow-hidden shadow-2xl border border-primary/10 relative">
        <button
          onClick={onClose}
          className="absolute top-8 right-8 z-50 p-4 bg-bg-main text-primary hover:bg-accent transition-all border border-primary/10" style={{borderRadius:"var(--radius-btn)"}}
        >
          <X size={28} />
        </button>

        <div className="flex flex-col lg:flex-row items-stretch">
          {}
          <div className="w-full lg:w-112.5 xl:w-125 shrink-0 bg-bg-main p-12 lg:p-16 flex items-center justify-center border-b lg:border-b-0 lg:border-r border-primary/10">
            <div className="relative w-full aspect-square max-w-sm">
              <div
                className={`w-full h-full rounded-full overflow-hidden border-12 border-white-custom shadow-xl bg-white-custom ${editMode ? "cursor-pointer group" : ""}`}
                onClick={() => editMode && setShowPicker(true)}
              >
                <img
                  src={imagenVisual}
                  className="w-full h-full object-cover transition-all"
                  alt="Visualización"
                  loading="eager"
                  fetchPriority="high"
                />
                {editMode && (
                  <div className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={32} className="text-white mb-2" />
                    <span className="text-white text-[10px] font-black uppercase tracking-widest">
                      Cambiar foto
                    </span>
                  </div>
                )}
              </div>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-primary text-white-custom px-8 py-3 rounded-[var(--radius-btn)] text-sm font-black uppercase tracking-widest shadow-md whitespace-nowrap min-w-45 text-center">
                {esPersonaje ? especie : alma}
              </div>
            </div>
          </div>

          {}
          <AnimatePresence>
            {showPicker && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={(e) => e.target === e.currentTarget && setShowPicker(false)}
              >
                <motion.div
                  initial={{ scale: 0.92, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.92, opacity: 0 }}
                  className="bg-white-custom border border-primary/10 w-full max-w-lg overflow-hidden shadow-2xl p-6" style={{borderRadius:"var(--radius-card)"}}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xs font-black uppercase tracking-widest text-primary">
                      Elegir imagen
                    </h2>
                    <button
                      onClick={() => setShowPicker(false)}
                      className="p-2 hover:bg-primary/10 transition-colors" style={{borderRadius:"var(--radius-btn)"}}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <SimpleImagePicker
                    onSelect={handlePickImage}
                    onClose={() => setShowPicker(false)}
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {}
          <div className="flex-1 p-8 lg:p-16 bg-white-custom/30 overflow-hidden flex flex-col justify-center">
            {editMode ? (
              <div className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest ml-4">
                    Nombre
                  </label>
                  <input
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    className="input-brand text-3xl! lg:text-4xl! p-5! bg-white-custom/50! w-full"
                    placeholder="Nombre..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest ml-4">
                    Descripción
                  </label>
                  <textarea
                    value={editDescripcion}
                    onChange={(e) => setEditDescripcion(e.target.value)}
                    className="input-brand text-lg! leading-relaxed! p-6! min-h-60 resize-none bg-white-custom/50! w-full"
                    placeholder="Escribe la historia..."
                  />
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 w-full max-w-full">
                <h2 className="text-4xl lg:text-6xl font-black text-primary leading-[1.1] mb-6 tracking-tighter uppercase italic break-words">
                  {varianteActiva ? varianteActiva.tipo : editNombre}
                </h2>
                <div className="w-16 h-1.5 bg-accent mb-8 rounded-full" />

                {!esPersonaje && variantes && variantes.length > 0 && (
                  <div className="mb-8">
                    <SelectorVariantes
                      variantes={variantes}
                      varianteActiva={varianteActiva}
                      onSeleccionar={setVarianteActiva}
                    />
                  </div>
                )}

                <p className="text-primary/80 text-lg lg:text-xl leading-relaxed font-medium break-words">
                  {varianteActiva
                    ? varianteActiva.descripcion_variante || "Sin registros descriptivos."
                    : editDescripcion}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {}
      {editMode && tabla === "criaturas" && (
        <div className="bg-white-custom rounded-[var(--radius-card)] p-12 shadow-2xl border border-primary/10">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter">
              Variantes del Registro
            </h3>
            <button onClick={agregarVariante} className="btn-brand bg-accent! text-primary!">
              <Plus size={20} /> Nueva Variante
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {variantes.map((v, idx) => (
              <div
                key={v.id || idx}
                className="p-6 bg-bg-main rounded-[var(--radius-btn)] border border-primary/5 space-y-4"
              >
                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <input
                      placeholder="Tipo (Ej: Fuego)"
                      className="input-brand p-3! text-sm!"
                      value={v.tipo}
                      onChange={(e) => actualizarVariante(idx, "tipo", e.target.value)}
                    />
                    <input
                      placeholder="URL Imagen"
                      className="input-brand p-3! text-xs!"
                      value={v.imagen_url}
                      onChange={(e) => actualizarVariante(idx, "imagen_url", e.target.value)}
                    />
                  </div>
                  <button
                    onClick={() => eliminarVariante(idx)}
                    className="p-2 text-red-400 hover:scale-110 transition-transform"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
                <textarea
                  placeholder="Descripción específica..."
                  className="input-brand p-4! text-sm! min-h-25 resize-none"
                  value={v.descripcion_variante}
                  onChange={(e) => actualizarVariante(idx, "descripcion_variante", e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {}
      {(esPersonaje || editMode) && mostrarMusica && (
        <div className="bg-white-custom rounded-[var(--radius-card)] p-12 lg:p-20 shadow-2xl border border-primary/10">
          <div className="w-full">
            {editMode ? (
              <SelectorMusicaAdmin
                idsSeleccionados={editCanciones}
                onChange={setEditCanciones}
              />
            ) : (
              <SeccionMusica listaLinks={data?.canciones || []} />
            )}
          </div>
        </div>
      )}

      {}
      {isAdmin && !isNew && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 z-1100 flex items-center gap-4 backdrop-blur-md p-4 border border-primary/20 shadow-2xl" style={{background:"var(--white-custom)",borderRadius:"var(--radius-card)"}}
        >
          {}
          {editMode && (
            <button
              onClick={() => handleDelete(() => { if (onDelete) onDelete(); onClose(); })}
              disabled={saving}
              className="btn-brand bg-red-50! text-red-400! hover:bg-red-100! px-6!"
              title="Borrar permanentemente"
            >
              <Trash2 size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest">Borrar</span>
            </button>
          )}

          <button
            onClick={() => setEditMode(!editMode)}
            className={`btn-brand px-6! ${editMode ? "bg-accent! text-primary!" : ""}`}
          >
            {editMode ? <X size={20} /> : <Edit3 size={20} />}
            <span className="text-[10px] font-black uppercase tracking-widest">
              {editMode ? "Cerrar" : "Editar"}
            </span>
          </button>

          {editMode && (
            <button
              onClick={onConfirmSave}
              disabled={saving}
              className="btn-brand bg-primary! text-white-custom! px-10!"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={20} />
              )}
              <span className="text-[10px] font-black uppercase tracking-widest">Sincronizar</span>
            </button>
          )}
        </motion.div>
      )}
    </div>

    <ToastContainer toasts={toasts} onDismiss={dismiss} />
    <ConfirmModal />
    </>
  );
}