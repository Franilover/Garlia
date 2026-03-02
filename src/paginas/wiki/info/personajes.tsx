"use client";
import EntidadPageBase from "@/shared/templates/GaleriaBase";
import { GalleryItem } from "@/shared/layout/gallery";
import { typography } from '@/lib/config/design-system';

export default function PersonajesGrid() {
  return (
    <EntidadPageBase
      tabla="personajes"
      titulo="Personajes"
      configFiltros={['reino', 'especie', 'conFoto']}
      mostrarMusica={true}
      plantillaNueva={{
        nombre: "",
        reino: "",
        especie: "",
        descripcion: "",
        img_url: "",
        color_hex: "#ffffff",
        historia: ""
      }}
      getCustomTags={(p) => [p?.reino, p?.especie]} 
      renderCard={(p, onClick) => {
        // 1. Usamos la URL limpia para no romper el optimizador de Next.js (Error 400)
        const baseUrl = p?.img_url || "";
        
        // 2. Detectamos si estamos online
        const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

        return (
          <GalleryItem
            key={`${p.id}-${baseUrl}-${isOnline ? Date.now() : 'static'}`}
            src={baseUrl}
            color={p.color_hex}
            onClick={onClick}
          >
            <h3 className={typography.cardTitle}>{p.nombre}</h3>
          </GalleryItem>
        );
      }}
    />
  );
}