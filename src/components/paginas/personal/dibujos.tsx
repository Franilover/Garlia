"use client";

import React, { useState } from "react";
import EntidadPageBase from "@/components/templates/GaleriaBase";
import { GalleryItem } from "@/components/layout/gallery";
import { LightboxProvider, LightboxVisual, useLightbox } from "@/components/modal/lightbox";
import { supabase } from "@/lib/api/client/supabase";
import { X, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import SimpleImagePicker from "@/components/forms/SimpleImagePicker";

const CATEGORIAS_DIBUJO = ["fanart", "original", "bocetos"];

interface AddDrawingModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function AddDrawingModal({ open, onClose, onSuccess }: AddDrawingModalProps) {
  const [step, setStep] = useState<"pick" | "meta">("pick");
  const [url, setUrl] = useState("");
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState(CATEGORIAS_DIBUJO[0]);
  const [loading, setLoading] = useState(false);

  const handleImageSelect = (selectedUrl: string) => {
    setUrl(selectedUrl);
    setStep("meta");
  };

  const handleSave = async () => {
    if (!titulo.trim()) return alert("Ponle un título al menos");
    setLoading(true);
    try {
      const { error } = await supabase
        .from("dibujos")
        .insert([{
          titulo,
          url_imagen: url,
          categoria,
          creado_en: new Date().toISOString()
        }]);
      if (error) throw error;
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-bg-card border border-primary/10 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-primary/5 flex justify-between items-center bg-primary/5">
          <h2 className="text-xs font-black uppercase tracking-widest text-primary">Añadir a la Galería</h2>
          <button onClick={onClose} className="p-2 hover:bg-primary/10 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-8">
          {step === "pick" ? (
            <div className="space-y-6">
              <p className="text-[11px] text-primary/40 uppercase font-bold tracking-tighter text-center">Paso 1: Selecciona la obra</p>
              <SimpleImagePicker onSelect={handleImageSelect} onClose={onClose} />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-primary/10 bg-black/20">
                <img src={url} alt="Preview" className="w-full h-full object-contain" />
              </div>
              <div className="space-y-4">
                <input
                  autoFocus
                  type="text"
                  placeholder="Título del dibujo..."
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="w-full bg-primary/5 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <div className="flex flex-wrap gap-2">
                  {CATEGORIAS_DIBUJO.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoria(cat)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        categoria === cat
                          ? "bg-primary text-white shadow-lg shadow-primary/20"
                          : "bg-primary/5 text-primary/40 hover:bg-primary/10"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="w-full bg-primary text-white font-black uppercase tracking-[0.2em] text-[11px] py-5 rounded-2xl shadow-xl hover:bg-primary/80 disabled:opacity-50 transition-all flex justify-center items-center gap-3"
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : "Publicar Obra"}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function DrawingsContent() {
  const { openLightbox } = useLightbox();

  return (
    <main className="min-h-screen bg-bg-main pb-20">
      <EntidadPageBase
        tabla="dibujos"
        titulo="Galería"
        configFiltros={["categoria"]}
        plantillaNueva={{}}
        permitirOrden={true}
        renderModal={(_selected, isCreating, onClose) => (
          <AddDrawingModal
            open={isCreating}
            onClose={onClose}
            onSuccess={() => window.location.reload()}
          />
        )}
        renderCard={(item, _onClick, _vistaFila, index, allItems) => (
          <GalleryItem
            key={item.id}
            src={item.url_imagen}
            alt={item.titulo}
            onClick={() => {
              const lbData = allItems.map((d: any) => ({
                src: d.url_imagen,
                alt: d.titulo,
                id: d.id,
              }));
              openLightbox(index, lbData, "dibujos");
            }}
          />
        )}
      />
      <LightboxVisual />
    </main>
  );
}

export default function Drawings() {
  return (
    <LightboxProvider>
      <DrawingsContent />
    </LightboxProvider>
  );
}