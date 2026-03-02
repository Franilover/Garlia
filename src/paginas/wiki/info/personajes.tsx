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
        // 1. Creamos una versión única basada en una propiedad que cambie
        // Si no tienes updated_at, usamos el nombre o la descripción para detectar cambios
        const hash = p.img_url ? Buffer.from(p.img_url).toString('base64').substring(0, 5) : 'v1';
        
        // 2. Forzamos la URL de GitHub a saltarse la caché de Dexie y del Navegador
        const finalSrc = p.img_url 
          ? `${p.img_url}?v=${new Date().getTime()}` 
          : "";

        return (
          <GalleryItem
            // CLAVE: Al cambiar la key con la URL, React destruye el elemento viejo de la caché
            key={`${p.id}-${p.img_url}`}
            src={finalSrc}
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