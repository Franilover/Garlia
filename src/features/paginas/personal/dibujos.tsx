"use client";

import React, { useState, useEffect } from "react";
import EntidadPageBase from "@/shared/templates/EntidadPageBase";
import { GalleryItem } from "@/shared/display/gallery";
import { LightboxProvider, LightboxVisual, useLightbox } from "@/shared/modal/lightbox";
import { supabase } from "@/lib/api/client/supabase";
import Newsletter from "@/shared/features/newsletter";
import { Plus, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ImagePicker, InsertResult } from "@/shared/ui/ImagePicker";

// ─── MODAL PARA AÑADIR DIBUJO ────────────────────────────────────────────────

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

  // Función que recibe la imagen seleccionada del ImagePicker
  const handleImageSelect = (result: string | InsertResult) => {
    const finalUrl = typeof result === 'string' ? result : result.url;
    setUrl(finalUrl);
    setStep("meta");
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("dibujos")
        .insert([{ 
          titulo, 
          url_imagen: url, 
          categoria,
          autor: "Franilover" // Según tus instrucciones
        }]);
      if (error) throw error;
      
      onSuccess();
      handleClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep("pick");
    setTitulo("");
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        className="bg-white rounded-4xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="p-6 flex justify-between items-center border-b border-primary/5 shrink-0">
          <h3 className="font-black uppercase text-xs tracking-widest text-primary">"Nuevo Dibujo"</h3>
          <button onClick={handleClose} className="p-2 hover:bg-primary/5 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {step === "pick" ? (
            <div className="h-[600px]">
              {/* Tu ImagePicker es un explorador completo, lo mostramos aquí */}
              <ImagePicker 
                open={true} 
                onClose={handleClose} 
                onInsert={handleImageSelect} 
              />
            </div>
          ) : (
            <div className="p-8 space-y-6 max-w-md mx-auto">
              <div className="aspect-square rounded-2xl overflow-hidden border-4 border-primary/5 bg-bg-main">
                <img src={url} alt="Preview" className="w-full h-full object-contain" />
              </div>
              
              <input 
                value={titulo} 
                onChange={e => setTitulo(e.target.value)} 
                placeholder="Título del dibujo..."
                className="w-full bg-primary/5 border-none rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:ring-2 ring-primary/20"
              />

              <div className="flex gap-2">
                {CATEGORIAS_DIBUJO.map(c => (
                  <button 
                    key={c} 
                    onClick={() => setCategoria(c)}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      categoria === c ? 'bg-primary text-white' : 'bg-primary/5 text-primary/40'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <button 
                onClick={handleSave} 
                disabled={loading || !titulo}
                className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : "Publicar"}
              </button>
              
              <button 
                onClick={() => setStep("pick")}
                className="w-full text-[10px] font-black uppercase tracking-widest text-primary/30 hover:text-primary transition-colors"
              >
                Cambiar imagen
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────

function DrawingsContent() {
  const { openLightbox } = useLightbox();
  const [isAdmin, setIsAdmin] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setIsAdmin(!!data.session));
  }, []);

  return (
    <main className="min-h-screen bg-bg-main pb-20">
      <EntidadPageBase
        tabla="dibujos"
        titulo="Galería"
        configFiltros={["categoria"]}
        renderCard={(item, _, index, allItems) => (
          <GalleryItem
            key={item.id}
            src={item.url_imagen}
            alt={item.titulo}
            onClick={() => {
              const lbData = allItems!.map((d: any) => ({
                src: d.url_imagen,
                alt: d.titulo,
                id: d.id,
              }));
              openLightbox(index!, lbData, "dibujos");
            }}
          />
        )}
      />

      <div className="mt-32">
        <Newsletter />
      </div>

      <LightboxVisual />

      <AnimatePresence>
        {isAdmin && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setAddOpen(true)}
            className="fixed bottom-8 right-6 z-50 flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-primary text-white shadow-2xl hover:bg-primary/80 transition-all"
          >
            <Plus size={18} />
            <span className="text-[11px] font-black uppercase tracking-widest">Añadir dibujo</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AddDrawingModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => window.location.reload()}
      />
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