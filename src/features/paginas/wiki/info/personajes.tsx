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
      renderCard={(p, onClick) => (
        <GalleryItem
          key={p.id}
          src={p.img_url}
          color={p.color_hex}
          onClick={onClick}
        >
          <h3 className={typography.cardTitle}>{p.nombre}</h3>
        </GalleryItem>
      )}
    />
  );
}