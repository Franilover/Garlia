"use client";
import EntidadPageBase from "@/shared/templates/GaleriaBase";
import { GalleryItem } from "@/shared/layout/gallery";
import { typography } from '@/lib/config/design-system';

export default function PersonajesGrid() {
  // Generamos un identificador único al cargar el componente
  // Esto asegura que al entrar a la página, siempre intente traer lo último de GitHub
  const versionId = Date.now();

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
        const finalSrc = p.img_url 
          ? `${p.img_url}${p.img_url.includes('?') ? '&' : '?'}v=${versionId}`
          : "";

        return (
          <GalleryItem
            key={p.id}
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