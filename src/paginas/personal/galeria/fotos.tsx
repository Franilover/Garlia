"use client";

import React, { useState } from "react";
import EntidadPageBase from "@/shared/templates/GaleriaBase";
import { GalleryItem } from "@/shared/layout/gallery";
import { LightboxProvider, LightboxVisual, useLightbox } from "@/shared/modal/lightbox";
import { supabase } from "@/lib/api/client/supabase";
import { X, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import SimpleImagePicker from "@/shared/forms/SimpleImagePicker";

interface AddFotoModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function AddFotoModal({ open, onClose, onSuccess }: AddFotoModalProps) {
  const [step, setStep] = useState<"pick" | "meta">("pick");
  const [url, setUrl] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);

  const handleImageSelect = (selectedUrl: string) => {
    setUrl(selectedUrl);
    setStep("meta");
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("diario_fotos")
        .insert([{ url_imagen: url, fecha }]);
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
          <h2 className="text-xs font-black uppercase tracking-widest text-primary">Añadir al Diario</h2>
          <button onClick={onClose} className="p-2 hover:bg-primary/10 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-8">
          {step === "pick" ? (
            <div className="space-y-6">
              <p className="text-[11px] text-primary/40 uppercase font-bold tracking-tighter text-center">Selecciona la foto</p>
              <SimpleImagePicker onSelect={handleImageSelect} onClose={onClose} />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-primary/10 bg-black/20">
                <img src={url} alt="Preview" className="w-full h-full object-contain" />
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[9px] font-black text-primary/40 uppercase ml-2 italic">Fecha</label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full bg-primary/5 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="w-full bg-primary text-white font-black uppercase tracking-[0.2em] text-[11px] py-5 rounded-2xl shadow-xl hover:bg-primary/80 disabled:opacity-50 transition-all flex justify-center items-center gap-3"
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : "Guardar Foto"}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function DiarioContent() {
  const { openLightbox } = useLightbox();

  return (
    <main className="min-h-screen bg-bg-main py-10 px-4 md:px-8">
      <EntidadPageBase
        tabla="diario_fotos"
        titulo="Diario"
        configFiltros={["categoria"]}
        plantillaNueva={{}}
        renderModal={(_selected, isCreating, onClose) => (
          <AddFotoModal
            open={isCreating}
            onClose={onClose}
            onSuccess={() => window.location.reload()}
          />
        )}
        renderCard={(item, _onClick, _vistaFila, index, allItems) => (
          <GalleryItem
            key={item.id}
            src={item.url_imagen}
            onClick={() => {
              const lbData = allItems.map((e: any) => ({
                src: e.url_imagen,
                alt: e.fecha || "Foto de diario",
                id: e.id,
              }));
              openLightbox(index, lbData, "diario_fotos");
            }}
          />
        )}
      />
      <LightboxVisual />
    </main>
  );
}

export default function Diario() {
  return (
    <LightboxProvider>
      <DiarioContent />
    </LightboxProvider>
  );
}