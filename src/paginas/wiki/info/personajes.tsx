"use client";
import EntidadPageBase from "@/shared/templates/GaleriaBase";
import { GalleryItem } from "@/shared/layout/gallery";
import { typography } from '@/lib/config/design-system';

// Timestamp fijo por sesión: se genera UNA vez cuando se carga la página.
// Fuerza al browser a ignorar la caché de imágenes al entrar, pero no
// provoca re-renders ni desmontajes innecesarios.
const SESSION_TS = Date.now();

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
        const baseUrl = p?.img_url || "";

        // Añadimos ?v=SESSION_TS a la URL de la imagen para romper la caché
        // del browser sin afectar al optimizador de Next.js (la key ya no usa Date.now())
        const srcConCacheBust = baseUrl
          ? `${baseUrl}?v=${SESSION_TS}`
          : "";

        return (
          <GalleryItem
            key={p.id}              // ← Key estable: solo el ID
            src={srcConCacheBust}   // ← La imagen sí lleva el bust
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