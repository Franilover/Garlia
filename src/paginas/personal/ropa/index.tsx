"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trash2, Save, Layers, X,
  CheckCircle2, Loader2, Shirt, ZoomIn, Plus, Image as ImageIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import SimpleImagePicker from "@/shared/forms/SimpleImagePicker";

// --- TIPOS ---
type Categoria = "Superior" | "Inferior" | "Calzado" | "Accesorios";

interface Prenda {
  id: string;
  nombre: string;
  categoria: Categoria;
  imagen_url: string; 
}

const CATEGORIAS: Categoria[] = ["Superior", "Inferior", "Calzado", "Accesorios"];

export default function ArmarioCanvasPage() {
  const { 
    data: prendas = [], 
    loading: loadingRopa,
    addRow: addPrenda,
    refetch: refetchPrendas,
  } = useSupabaseData<Prenda>("ropa", {
    order: { campo: "created_at", asc: false }
  });

  const { 
    data: outfitsGuardados = [], 
    loading: loadingOutfits,
    addRow, 
    deleteRow,
    refetch: refetchOutfits 
  } = useSupabaseData("ropa_outfits", {
    order: { campo: "created_at", asc: false }
  });

  // --- outfit builder ---
  const [selectedPrendas, setSelectedPrendas] = useState<Prenda[]>([]);
  const [nombreOutfit, setNombreOutfit]       = useState("");
  const [isSaving, setIsSaving]               = useState(false);

  // --- lightbox ---
  const [lightboxPrenda, setLightboxPrenda] = useState<Prenda | null>(null);

  // --- nueva prenda ---
  const [showNuevaPrenda, setShowNuevaPrenda] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [nuevaPrenda, setNuevaPrenda] = useState<{
    nombre: string; categoria: Categoria; imagen_url: string;
  }>({ nombre: "", categoria: "Superior", imagen_url: "" });
  const [isSavingPrenda, setIsSavingPrenda] = useState(false);

  // --- handlers ---
  const togglePrendaEnCanvas = (prenda: Prenda) => {
    setSelectedPrendas(prev =>
      prev.find(p => p.id === prenda.id)
        ? prev.filter(p => p.id !== prenda.id)
        : [...prev, prenda]
    );
  };

  const guardarOutfit = async () => {
    if (selectedPrendas.length === 0 || !nombreOutfit) return;
    setIsSaving(true);
    const { error } = await addRow({ nombre: nombreOutfit, prendas: selectedPrendas });
    if (!error) { setSelectedPrendas([]); setNombreOutfit(""); await refetchOutfits(); }
    setIsSaving(false);
  };

  const guardarNuevaPrenda = async () => {
    if (!nuevaPrenda.nombre || !nuevaPrenda.imagen_url) return;
    setIsSavingPrenda(true);
    const { error } = await addPrenda({
      nombre: nuevaPrenda.nombre,
      categoria: nuevaPrenda.categoria,
      imagen_url: nuevaPrenda.imagen_url,
    });
    if (!error) {
      setNuevaPrenda({ nombre: "", categoria: "Superior", imagen_url: "" });
      setShowNuevaPrenda(false);
      await refetchPrendas();
    }
    setIsSavingPrenda(false);
  };

  if (loadingRopa || loadingOutfits) return (
    <div className="h-screen flex items-center justify-center bg-bg-main">
      <Loader2 className="animate-spin text-primary/20" size={40} />
    </div>
  );

  return (
    <div className="flex flex-row min-h-screen bg-bg-main">

      {/* ═══════════════════════════════════════
          MODAL: NUEVA PRENDA
      ═══════════════════════════════════════ */}
      <AnimatePresence>
        {showNuevaPrenda && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setShowNuevaPrenda(false); setShowImagePicker(false); }}
            className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="modal-surface relative shadow-2xl w-full max-w-md overflow-hidden"
              style={{ borderRadius: "var(--radius-card)" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-primary/10">
                <div className="flex items-center gap-2">
                  <Plus size={16} className="text-primary" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-on-surface">Nueva Prenda</h3>
                </div>
                <button
                  onClick={() => { setShowNuevaPrenda(false); setShowImagePicker(false); }}
                  className="p-1.5 text-muted-on-surface hover:text-on-surface transition-colors"
                  style={{ borderRadius: "9999px" }}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 flex flex-col gap-4">

                {/* --- IMAGE PICKER o preview --- */}
                {!showImagePicker ? (
                  <button
                    onClick={() => setShowImagePicker(true)}
                    className={cn(
                      "relative w-full aspect-video border-2 border-dashed transition-all overflow-hidden group",
                      nuevaPrenda.imagen_url ? "border-primary/20" : "border-primary/10 hover:border-primary/30"
                    )}
                    style={{ borderRadius: "var(--radius-card)" }}
                  >
                    {nuevaPrenda.imagen_url ? (
                      <>
                        <img
                          src={nuevaPrenda.imagen_url}
                          className="w-full h-full object-cover"
                          alt="preview"
                        />
                        {/* overlay para cambiar */}
                        <div className="absolute inset-0 bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <ImageIcon size={16} className="text-white" />
                          <span className="text-[10px] font-black uppercase text-white tracking-widest">Cambiar foto</span>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-primary/5">
                        <ImageIcon size={28} className="text-primary/20" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-on-surface">
                          Elegir foto
                        </span>
                      </div>
                    )}
                  </button>
                ) : (
                  /* SimpleImagePicker embebido */
                  <div
                    className="border border-primary/10 overflow-hidden"
                    style={{ borderRadius: "var(--radius-card)" }}
                  >
                    <div className="flex items-center justify-between px-4 pt-4 pb-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-on-surface">
                        Selecciona una foto
                      </p>
                      <button
                        onClick={() => setShowImagePicker(false)}
                        className="text-muted-on-surface hover:text-on-surface transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="px-4 pb-4">
                      <SimpleImagePicker
                        onSelect={(url) => {
                          setNuevaPrenda(prev => ({ ...prev, imagen_url: url }));
                          setShowImagePicker(false);
                        }}
                        onClose={() => setShowImagePicker(false)}
                      />
                    </div>
                  </div>
                )}

                {/* Solo muestra los campos si el picker no está abierto */}
                {!showImagePicker && (
                  <>
                    {/* Nombre */}
                    <input
                      type="text"
                      placeholder="NOMBRE DE LA PRENDA..."
                      value={nuevaPrenda.nombre}
                      onChange={(e) => setNuevaPrenda(prev => ({ ...prev, nombre: e.target.value.toUpperCase() }))}
                      className="input-brand text-[10px] font-black"
                    />

                    {/* Categoría */}
                    <div className="grid grid-cols-4 gap-2">
                      {CATEGORIAS.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setNuevaPrenda(prev => ({ ...prev, categoria: cat }))}
                          className={cn(
                            "py-2 px-1 text-[8px] font-black uppercase tracking-widest transition-all border",
                            nuevaPrenda.categoria === cat
                              ? "bg-primary text-btn-text border-primary"
                              : "bg-primary/5 text-muted-on-surface border-primary/10 hover:border-primary/30"
                          )}
                          style={{ borderRadius: "var(--radius-btn)" }}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {/* Guardar */}
                    <button
                      onClick={guardarNuevaPrenda}
                      disabled={!nuevaPrenda.nombre || !nuevaPrenda.imagen_url || isSavingPrenda}
                      className="btn-brand w-full text-[10px] uppercase tracking-widest"
                    >
                      {isSavingPrenda
                        ? <Loader2 className="animate-spin" size={16} />
                        : <Save size={16} />
                      }
                      Guardar Prenda
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════
          LIGHTBOX VER PRENDA
      ═══════════════════════════════════════ */}
      <AnimatePresence>
        {lightboxPrenda && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxPrenda(null)}
            className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="modal-surface relative overflow-hidden shadow-2xl max-w-sm w-full"
              style={{ borderRadius: "var(--radius-card)" }}
            >
              <button
                onClick={() => setLightboxPrenda(null)}
                className="absolute top-4 right-4 z-10 modal-surface p-2 shadow-md text-muted-on-surface hover:text-on-surface transition-colors"
                style={{ borderRadius: "9999px" }}
              >
                <X size={16} />
              </button>

              <div className="aspect-3/4 w-full bg-primary/5 flex items-center justify-center overflow-hidden">
                {lightboxPrenda.imagen_url ? (
                  <img src={lightboxPrenda.imagen_url} alt={lightboxPrenda.nombre} className="w-full h-full object-cover" />
                ) : (
                  <Shirt className="text-primary/20" size={64} />
                )}
              </div>

              <div className="p-5 border-t border-primary/10">
                <p className="text-xs font-black uppercase text-on-surface tracking-tight">{lightboxPrenda.nombre}</p>
                <p className="text-[9px] font-bold text-muted-on-surface uppercase tracking-widest mt-1">{lightboxPrenda.categoria}</p>
                <button
                  onClick={() => { togglePrendaEnCanvas(lightboxPrenda); setLightboxPrenda(null); }}
                  className={cn(
                    "btn-brand mt-4 w-full py-3 text-[10px] tracking-widest",
                    selectedPrendas.find(p => p.id === lightboxPrenda.id) && "opacity-50"
                  )}
                >
                  {selectedPrendas.find(p => p.id === lightboxPrenda.id) ? "Quitar del Look" : "Añadir al Look"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════
          PANEL IZQUIERDO: MINIATURAS
      ═══════════════════════════════════════ */}
      <nav
        className="w-20 md:w-56 shrink-0 border-r border-primary/20 flex flex-col overflow-y-auto"
        style={{ background: "var(--bg-menu)" }}
      >
        {/* Header con botón añadir */}
        <div
          className="p-3 border-b border-white/10 sticky top-0 z-10 flex items-center justify-between gap-2"
          style={{ background: "var(--bg-menu)" }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Shirt size={12} className="text-white/30 shrink-0" />
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40 hidden md:block truncate">
              Prendas
            </p>
          </div>
          <button
            onClick={() => setShowNuevaPrenda(true)}
            className="shrink-0 bg-primary/20 hover:bg-primary/30 text-white p-1.5 transition-all"
            style={{ borderRadius: "var(--radius-btn)" }}
            title="Añadir prenda"
          >
            <Plus size={12} />
          </button>
        </div>

        <div className="flex flex-col gap-1 p-2">
          {prendas.map((prenda: Prenda) => {
            const estaSeleccionada = !!selectedPrendas.find(p => p.id === prenda.id);
            return (
              <motion.button
                key={prenda.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => setLightboxPrenda(prenda)}
                className={cn(
                  "flex items-center gap-3 p-2 text-left group transition-all",
                  estaSeleccionada ? "bg-primary/20" : "hover:bg-white/5"
                )}
                style={{ borderRadius: "var(--radius-btn)" }}
              >
                <div
                  className={cn(
                    "relative w-10 h-10 overflow-hidden shrink-0 border-2 transition-all",
                    estaSeleccionada ? "border-primary" : "border-white/10"
                  )}
                  style={{ borderRadius: "var(--radius-btn)" }}
                >
                  {prenda.imagen_url ? (
                    <img src={prenda.imagen_url} alt={prenda.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10">
                      <Shirt size={16} className="text-white/20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ZoomIn size={12} className="text-white" />
                  </div>
                  {estaSeleccionada && (
                    <div className="absolute top-0.5 right-0.5 bg-primary rounded-full p-0.5">
                      <CheckCircle2 size={8} className="text-btn-text" />
                    </div>
                  )}
                </div>
                <div className="hidden md:block min-w-0">
                  <p className="text-[9px] font-black uppercase text-white/80 truncate leading-tight">{prenda.nombre}</p>
                  <p className="text-[7px] font-bold text-white/30 uppercase tracking-widest">{prenda.categoria}</p>
                </div>
              </motion.button>
            );
          })}

          {/* Botón añadir al final de la lista (visible solo en md+) */}
          <button
            onClick={() => setShowNuevaPrenda(true)}
            className="hidden md:flex items-center gap-3 p-2 mt-1 border border-dashed border-white/10 hover:border-white/20 text-white/20 hover:text-white/40 transition-all"
            style={{ borderRadius: "var(--radius-btn)" }}
          >
            <div className="w-10 h-10 flex items-center justify-center shrink-0">
              <Plus size={16} />
            </div>
            <p className="text-[9px] font-black uppercase tracking-widest">Añadir prenda</p>
          </button>
        </div>
      </nav>

      {/* ═══════════════════════════════════════
          GALERÍA CENTRAL
      ═══════════════════════════════════════ */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <header className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-primary italic">
              Armario <span className="text-primary/10 italic">Real</span>
            </h1>
            <p className="text-muted-on-surface text-[10px] font-black uppercase tracking-widest mt-2">
              Prendas disponibles: {prendas.length}
            </p>
          </div>
          <button
            onClick={() => setShowNuevaPrenda(true)}
            className="btn-brand flex items-center gap-2 text-[10px] uppercase tracking-widest"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Nueva Prenda</span>
          </button>
        </header>

        {prendas.length === 0 ? (
          <button
            onClick={() => setShowNuevaPrenda(true)}
            className="w-full flex flex-col items-center justify-center p-20 border-2 border-dashed border-primary/10 hover:border-primary/20 transition-all"
            style={{ borderRadius: "var(--radius-card)" }}
          >
            <Plus className="text-primary/20 mb-4" size={48} />
            <p className="text-[10px] font-black uppercase text-muted-on-surface">Añade tu primera prenda</p>
          </button>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {prendas.map((prenda: Prenda) => {
              const estaSeleccionada = selectedPrendas.find(p => p.id === prenda.id);
              return (
                <motion.button
                  key={prenda.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setLightboxPrenda(prenda)}
                  className={cn(
                    "card-main relative aspect-3/4 border-2 overflow-hidden group p-0",
                    estaSeleccionada
                      ? "border-primary shadow-xl"
                      : "border-primary/10 hover:border-primary/30"
                  )}
                >
                  <div className="absolute inset-0 flex items-center justify-center bg-primary/5">
                    {prenda.imagen_url ? (
                      <img
                        src={prenda.imagen_url}
                        alt={prenda.nombre}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <Shirt className="text-primary/10" size={32} />
                    )}
                  </div>
                  <div className="absolute inset-0 bg-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="modal-surface p-3 rounded-full shadow-lg">
                      <ZoomIn size={18} className="text-primary" />
                    </div>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-foreground/80 to-transparent">
                    <p className="text-[9px] font-black text-white uppercase truncate">{prenda.nombre}</p>
                    <p className="text-[7px] font-bold text-white/40 uppercase tracking-widest">{prenda.categoria}</p>
                  </div>
                  {estaSeleccionada && (
                    <div className="absolute top-3 right-3 bg-primary text-btn-text p-1.5 rounded-full shadow-lg">
                      <CheckCircle2 size={12} />
                    </div>
                  )}
                </motion.button>
              );
            })}

            {/* Tarjeta "añadir" al final de la grid */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowNuevaPrenda(true)}
              className="relative aspect-3/4 border-2 border-dashed border-primary/10 hover:border-primary/30 transition-all flex flex-col items-center justify-center gap-3 text-muted-on-surface hover:text-primary"
              style={{ borderRadius: "var(--radius-card)" }}
            >
              <Plus size={24} className="opacity-30" />
              <p className="text-[9px] font-black uppercase tracking-widest opacity-30">Añadir</p>
            </motion.button>
          </div>
        )}
      </main>

      {/* ═══════════════════════════════════════
          PANEL DERECHO: CONSTRUCTOR
      ═══════════════════════════════════════ */}
      <aside
        className="w-full md:w-72 shrink-0 border-l border-primary/10 p-6 md:p-8 flex flex-col gap-6 sticky top-0 h-screen overflow-y-auto shadow-2xl"
        style={{ background: "var(--white-custom)" }}
      >
        <div className="flex items-center gap-2 border-b border-primary/10 pb-4">
          <Layers size={18} className="text-primary" />
          <h2 className="text-xs font-black uppercase tracking-widest text-on-surface">Constructor</h2>
        </div>

        <div
          className="grow flex flex-col gap-3 min-h-40 p-4 bg-primary/5 border-2 border-dashed border-primary/10"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          <AnimatePresence mode="popLayout">
            {selectedPrendas.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center opacity-20 py-10 px-4">
                <p className="text-[9px] font-black uppercase leading-relaxed tracking-widest text-on-surface">
                  Selecciona ropa para crear el conjunto
                </p>
              </div>
            ) : (
              selectedPrendas.map((p) => (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-3 panel-surface p-2 shadow-sm border border-primary/10"
                  style={{ borderRadius: "var(--radius-btn)" }}
                >
                  <div className="w-12 h-12 overflow-hidden shrink-0 bg-primary/5" style={{ borderRadius: "var(--radius-btn)" }}>
                    <img src={p.imagen_url} className="w-full h-full object-cover" />
                  </div>
                  <span className="grow text-[9px] font-black uppercase text-on-surface truncate">{p.nombre}</span>
                  <button onClick={() => togglePrendaEnCanvas(p)} className="p-2 text-muted-on-surface hover:text-red-500 transition-colors">
                    <X size={14} />
                  </button>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {selectedPrendas.length > 0 && (
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="NOMBRE DEL LOOK..."
              value={nombreOutfit}
              onChange={(e) => setNombreOutfit(e.target.value.toUpperCase())}
              className="input-brand text-[10px] font-black"
            />
            <button
              onClick={guardarOutfit}
              disabled={!nombreOutfit || isSaving}
              className="btn-brand w-full text-[10px] uppercase tracking-widest"
            >
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Guardar Look
            </button>
          </div>
        )}

        <div className="mt-4 border-t border-primary/10 pt-6">
          <h3 className="text-[8px] font-black text-muted-on-surface uppercase tracking-[0.3em] mb-4">
            Colección Guardada
          </h3>
          <div className="space-y-3">
            {outfitsGuardados.map((o: any) => (
              <div key={o.id} className="card-main group p-4 border border-primary/10 hover:border-primary/30 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[9px] font-black uppercase text-on-surface">{o.nombre}</p>
                  <button onClick={() => deleteRow(o.id)} className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-all">
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="flex -space-x-2">
                  {Array.isArray(o.prendas) && o.prendas.map((pr: any, i: number) => (
                    <div key={i} className="w-8 h-8 border-2 border-bg-main overflow-hidden bg-primary/10 shadow-sm rounded-full">
                      <img src={pr.imagen_url} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}