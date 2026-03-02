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
        // 1. Extraemos la URL base (priorizando img_url como en DetalleMaestro)
        const rawUrl = p?.img_url || p?.imagen_url;
        
        // 2. Si no hay URL, usamos un placeholder o string vacío para no romper el componente
        if (!rawUrl) {
          return (
            <GalleryItem key={p.id} src="" color={p.color_hex} onClick={onClick}>
              <h3 className={typography.cardTitle}>{p.nombre}</h3>
            </GalleryItem>
          );
        }

        // 3. Limpiamos y añadimos el parámetro de tiempo de forma segura
        // Usamos un número fijo o Date.now() para forzar la carga de GitHub
        const cleanUrl = rawUrl.trim();
        const separator = cleanUrl.includes('?') ? '&' : '?';
        const finalSrc = `${cleanUrl}${separator}v=${Date.now()}`;

        return (
          <GalleryItem
            // Usamos una key que cambie si cambia la URL para forzar el refresco de React
            key={`${p.id}-${cleanUrl}`}
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