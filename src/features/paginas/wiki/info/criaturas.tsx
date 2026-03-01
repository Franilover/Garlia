"use client";
import EntidadPageBase from "@/shared/templates/EntidadPageBase";
import { GalleryItem } from "@/shared/layout/gallery";
import { cn } from "@/lib/utils";
import { typography } from '@/lib/config/design-system';

export default function CriaturasGrid() {
  return (
    <EntidadPageBase
      tabla="criaturas"
      titulo="Bestiario"
      // Añadimos 'conFoto' al final de la lista
      configFiltros={['habitat', 'pensamiento', 'alma', 'conFoto']}
      // Etiquetas dinámicas para el modal
      getCustomTags={(c) => [
        c?.habitat,
        c?.alma ? `Alma ${c.alma}` : null
      ].filter(Boolean)}
      // Pasamos la estructura para cuando crees una nueva criatura
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