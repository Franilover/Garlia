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
      configFiltros={['categoria', 'conFoto']}
      getCustomTags={(item) => [
        item?.categoria,
        item?.rareza
      ].filter(Boolean)}
      plantillaNueva={{
        nombre: "",
        descripcion: "",
        categoria: "",
        rareza: "",
        imagen_url: ""
      }}
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