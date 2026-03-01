"use client";

import EntidadPageBase from "@/shared/templates/EntidadPageBase";
import { GalleryItem } from "@/shared/display/gallery";
import { LightboxProvider, LightboxVisual, useLightbox } from "@/shared/modal/lightbox";
import { CATEGORIAS } from '@/lib/config/constants';

function DiarioContent() {
  const { openLightbox } = useLightbox();

  return (
    <main className="min-h-screen bg-bg-main py-10 px-4 md:px-8">
      <EntidadPageBase
        tabla="diario_fotos"
        titulo="Diario"
        configFiltros={['categoria']}
        renderCard={(item, _, index, allItems) => (
          <GalleryItem 
            key={item.id} 
            src={item.url_imagen} 
            onClick={() => {
              // Generamos la lista para el lightbox desde los items filtrados actuales
              const lbData = allItems!.map(e => ({ 
                src: e.url_imagen, 
                alt: e.fecha || "Foto de diario",
                id: e.id 
              }));
              openLightbox(index!, lbData, 'diario_fotos');
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