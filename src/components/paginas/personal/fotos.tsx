"use client";

import React, { useState } from "react";
import EntidadPageBase from "@/components/templates/GaleriaBase";
import { GalleryItem } from "@/components/layout/gallery";
import { LightboxProvider, LightboxVisual, useLightbox } from "@/components/modal/lightbox";
import { supabase } from "@/lib/api/client/supabase";
import SimpleImagePicker from "@/components/forms/SimpleImagePicker";
import { Btn, Modal, InputLine } from "@/components/ui";
import { useToast } from "@/hooks/ui/useToast";
import { ToastContainer } from "@/components/ui/ToastContainer";

interface AddFotoModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function AddFotoModal({ open, onClose, onSuccess }: AddFotoModalProps) {
  const [step, setStep]   = useState<"pick" | "meta">("pick");
  const [url, setUrl]     = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const { toasts, toast, dismiss } = useToast();

  const handleImageSelect = (selectedUrl: string) => { setUrl(selectedUrl); setStep("meta"); };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from("diario_fotos").insert([{ url_imagen: url, fecha }]);
      if (error) throw error;
      onSuccess();
      onClose();
    } catch { toast.error("Error al guardar"); }
    finally { setLoading(false); }
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title="Añadir al Diario" maxWidth="max-w-lg">
      {step === "pick" ? (
        <div className="space-y-4">
          <p className="text-[11px] text-primary/40 uppercase font-bold tracking-tighter text-center">Selecciona la foto</p>
          <SimpleImagePicker onSelect={handleImageSelect} onClose={onClose} />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="aspect-[4/3] rounded-[var(--radius-btn)] overflow-hidden border border-primary/10 bg-black/20">
            <img src={url} alt="Preview" className="w-full h-full object-contain" />
          </div>
          <div className="space-y-4">
            <InputLine
              label="Fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
            <Btn onClick={handleSave} loading={loading} fullWidth size="lg">
              Guardar Foto
            </Btn>
          </div>
        </div>
      )}
    </Modal>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
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
        permitirOrden={true}
        renderModal={(_selected, isCreating, onClose) => (
          <AddFotoModal open={isCreating} onClose={onClose} onSuccess={() => window.location.reload()} />
        )}
        renderCard={(item, _onClick, _vistaFila, index, allItems) => (
          <GalleryItem
            key={item.id}
            src={item.url_imagen}
            onClick={() => {
              const lbData = allItems.map((e: any) => ({ src: e.url_imagen, alt: e.fecha || "Foto de diario", id: e.id }));
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