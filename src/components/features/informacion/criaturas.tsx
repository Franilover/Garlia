"use client";
import EntidadPageBase from "@/components/templates/GaleriaBase";
import { GalleryItem } from "@/components/layout/gallery";
import { cn } from "@/lib/utils";
import { typography } from '@/lib/config/design-system';

export default function CriaturasGrid() {
  return (
    <EntidadPageBase
      tabla="criaturas"
      titulo="Bestiario"
      
      configFiltros={['habitat', 'pensamiento', 'alma', 'conFoto']}
      
      getCustomTags={(c) => [
        c?.habitat,
        c?.alma ? `Alma ${c.alma}` : null
      ].filter(Boolean)}
      
      plantillaNueva={{
        nombre: "",
        descripcion: "",
        habitat: "",
        alma: "",
        pensamiento: "",
        imagen_url: ""
      }}
      renderCard={(c, onClick) => (
        <GalleryItem 
          key={c.id} 
          src={c.imagen_url} 
          onClick={onClick}
        >
          <h3 className={typography.cardTitle}>{c.nombre}</h3>
        </GalleryItem>
      )}
    />
  );
}