"use client";
import EntidadPageBase from "@/components/shared/templates/EntidadPageBase";
import { GalleryItem } from "@/components/shared/display/gallery";
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
          <p className={cn(typography.tag, "mb-1 opacity-60")}>
            {item.categoria}
          </p>
          <h3 className={typography.cardTitle}>
            {item.nombre}
          </h3>
        </GalleryItem>
      )}
    />
  );
}