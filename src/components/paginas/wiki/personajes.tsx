"use client";
import EntidadPageBase from "@/components/shared/templates/EntidadPageBase";
import { GalleryItem } from "@/components/shared/display/gallery";
import { cn } from "@/lib/utils";
import { typography } from '@/lib/config/design-system';
import { useState } from "react";

export default function PersonajesGrid() {
  // Estado local para controlar el filtro de fotos si EntidadPageBase no lo maneja internamente
  const [soloConFoto, setSoloConFoto] = useState(false);

  return (
    <EntidadPageBase
      tabla="personajes"
      titulo="Personajes"
      configFiltros={['reino', 'especie']} 
      mostrarMusica={true}
      // Función para extraer los tags que irán al modal
      getCustomTags={(p) => [p?.reino, p?.especie]} 
      renderCard={(p, onClick) => {
        // Lógica de filtrado manual dentro del renderizado
        if (soloConFoto && (!p.img_url || p.img_url === "")) {
          return null;
        }

        return (
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
        );
      }}
    />
  );
}