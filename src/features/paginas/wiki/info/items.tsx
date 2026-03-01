"use client";
import EntidadPageBase from "@/shared/templates/GaleriaBase";
import { GalleryItem } from "@/shared/layout/gallery";
import { cn } from "@/lib/utils";
import { typography } from '@/lib/config/design-system';

export default function Inventario() {
  return (
    <EntidadPageBase
      tabla="items"
      titulo="Almacén de Objetos"
      // Añadimos 'conFoto' para activar el botón de la cámara
      configFiltros={['categoria', 'conFoto']}
      // Etiquetas para el modal: Categoría y Rareza
      getCustomTags={(item) => [
        item?.categoria,
        item?.rareza
      ].filter(Boolean)}
      renderCard={(item, onClick) => (
        <GalleryItem 
          key={item.id} 
          src={item.imagen_url} 
          contain={true} 
          onClick={onClick}
        >
          <h3 className={typography.cardTitle}>
            {item.nombre}
          </h3>
        </GalleryItem>
      )}
    />
  );
}