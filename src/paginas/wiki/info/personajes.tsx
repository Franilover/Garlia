"use client";
import EntidadPageBase from "@/shared/templates/GaleriaBase";
import { GalleryItem } from "@/shared/layout/gallery";
import { typography } from '@/lib/config/design-system';

export default function PersonajesGrid() {
  // Generamos un sello de tiempo una sola vez al cargar el componente
  // Esto asegura que cada sesión de 'Franilover' vea lo más reciente de GitHub
  const sessionHash = typeof window !== 'undefined' ? Date.now() : '2026';

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
        // 1. Limpiamos posibles espacios en blanco de la URL de GitHub
        const cleanUrl = p.img_url?.trim();
        
        // 2. Construimos la URL con el parámetro de sesión
        // Si la URL ya tiene un '?', usamos '&', si no, usamos '?'
        const finalSrc = cleanUrl 
          ? `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}cache=${sessionHash}`
          : "";

        return (
          <GalleryItem
            // CLAVE: Usamos el ID y la URL como key. 
            // Si la URL cambia en la base de datos, React destruye el item viejo y crea uno nuevo.
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