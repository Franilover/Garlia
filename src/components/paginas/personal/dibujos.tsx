import React, { useState } from "react";
import EntidadPageBase from "@/components/templates/GaleriaBase";
import { GalleryItem } from "@/components/layout/gallery";
import { LightboxProvider, LightboxVisual, useLightbox } from "@/components/modal/lightbox";
import { supabase } from "@/lib/api/client/supabase";
import SimpleImagePicker from "@/components/forms/SimpleImagePicker";
import { Btn, Badge, Modal, InputLine } from "@/components/ui";
import { useToast } from "@/hooks/ui/useToast";
import { ToastContainer } from "@/components/ui/ToastContainer";

const CATEGORIAS_DIBUJO = ["fanart", "original", "bocetos"];

interface AddDrawingModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function AddDrawingModal({ open, onClose, onSuccess }: AddDrawingModalProps) {
  const [step, setStep]           = useState<"pick" | "meta">("pick");
  const [url, setUrl]             = useState("");
  const [titulo, setTitulo]       = useState("");
  const [categoria, setCategoria] = useState(CATEGORIAS_DIBUJO[0]);
  const [loading, setLoading]     = useState(false);
  const { toasts, toast, dismiss } = useToast();

  const handleImageSelect = (selectedUrl: string) => { setUrl(selectedUrl); setStep("meta"); };

  const handleSave = async () => {
    if (!titulo.trim()) { toast.warning("Ponle un título al menos"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.from("dibujos").insert([{
        titulo, url_imagen: url, categoria, creado_en: new Date().toISOString()
      }]);
      if (error) throw error;
      onSuccess();
      onClose();
    } catch { toast.error("Error al guardar"); }
    finally { setLoading(false); }
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title="Añadir a la Galería" subtitle="Paso 1: Selecciona la obra" maxWidth="max-w-lg">
      {step === "pick" ? (
        <SimpleImagePicker onSelect={handleImageSelect} onClose={onClose} />
      ) : (
        <div className="space-y-6">
          <div className="aspect-[4/3] rounded-[var(--radius-btn)] overflow-hidden border border-primary/10 bg-black/20">
            <img src={url} alt="Preview" className="w-full h-full object-contain" />
          </div>
          <div className="space-y-4">
            <InputLine
              autoFocus
              placeholder="Título del dibujo..."
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {CATEGORIAS_DIBUJO.map(cat => (
                <Badge key={cat} active={categoria === cat} onClick={() => setCategoria(cat)}>
                  {cat}
                </Badge>
              ))}
            </div>
            <Btn onClick={handleSave} loading={loading} fullWidth size="lg">
              Publicar Obra
            </Btn>
          </div>
        </div>
      )}
    </Modal>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
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
          <AddDrawingModal open={isCreating} onClose={onClose} onSuccess={() => window.location.reload()} />
        )}
        renderCard={(item, _onClick, _vistaFila, index, allItems) => (
          <GalleryItem
            key={item.id}
            src={item.url_imagen}
            alt={item.titulo}
            onClick={() => {
              const lbData = allItems.map((d: any) => ({ src: d.url_imagen, alt: d.titulo, id: d.id }));
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