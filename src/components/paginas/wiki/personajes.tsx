"use client";
import EntidadPageBase from "@/components/shared/templates/EntidadPageBase";
import { GalleryItem } from "@/components/shared/display/gallery";
import { cn } from "@/lib/utils";
import { typography } from '@/lib/config/design-system';

export default function PersonajesGrid() {
  return (
    <EntidadPageBase
      tabla="personajes"
      titulo="Personajes"
      // Añadimos 'conFoto' aquí para que aparezca el botón global
      configFiltros={['reino', 'especie', 'conFoto']}
      mostrarMusica={true}
      // Función para extraer los tags que irán al modal
      getCustomTags={(p) => [p?.reino, p?.especie]} 
      renderCard={(p, onClick) => (
        <GalleryItem
          key={p.id}
          src={p.img_url}
          color={p.color_hex}
          onClick={onClick}
        >
          <p className={cn(typography.tag, "mb-1")}>
            {p.reino} • {p.especie}
          </p>
          <h3 className={typography.cardTitle}>{p.nombre}</h3>
        </GalleryItem>
      )}
    />
  );
}