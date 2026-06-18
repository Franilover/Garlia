import { MetadataRoute } from "next";
import { supabase } from "@/lib/api/client/supabase";
import { toSlug } from "@/lib/utils/slugify";

const BASE_URL = "https://franilover.vercel.app";

interface LibroQuery {
  id: string;
  titulo: string;
  created_at: string | null;
}

interface CapituloQuery {
  orden: number;
  fecha_publicacion: string | null;
  libros: {
    titulo: string;
  } | null;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 1. Rutas Estáticas Principales y Categorías del Sistema
  const rutasEstaticas: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/garlia`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/personal`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  try {
    // 2. Obtener los libros desde Supabase para generar URLs con slugs reales
    const { data: librosData, error: librosError } = await supabase
      .from("libros")
      .select("id, titulo, created_at")
      .order("created_at", { ascending: false });

    if (librosError) {
      console.error("Error cargando libros para el sitemap:", librosError);
      return rutasEstaticas;
    }

    const libros = (librosData as unknown as LibroQuery[]) || [];

    const rutasLibros: MetadataRoute.Sitemap = libros.map((libro) => ({
      url: `${BASE_URL}/garlia/libros/${toSlug(libro.titulo)}`,
      lastModified: libro.created_at ? new Date(libro.created_at) : new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    // 3. Obtener los capítulos realizando un JOIN para traer el título del libro y estructurar el lector
    const { data: capitulosData, error: capsError } = await supabase
      .from("capitulos")
      .select("orden, fecha_publicacion, libros ( titulo )");

    if (capsError) {
      console.error("Error cargando capítulos para el sitemap:", capsError);
      return [...rutasEstaticas, ...rutasLibros];
    }

    const capitulos = (capitulosData as unknown as CapituloQuery[]) || [];

    const rutasCapitulos: MetadataRoute.Sitemap = capitulos
      .filter((cap) => cap.libros !== null && typeof cap.libros === "object" && "titulo" in cap.libros)
      .map((cap) => {
        const libroAsociado = cap.libros as { titulo: string };
        const slugLibro = toSlug(libroAsociado.titulo);
        return {
          url: `${BASE_URL}/garlia/libros/${slugLibro}/leer/${cap.orden}`,
          lastModified: cap.fecha_publicacion ? new Date(cap.fecha_publicacion) : new Date(),
          changeFrequency: "daily",
          priority: 0.7,
        };
      });

    // 4. Retornar la unificación de todas las rutas recopiladas
    return [...rutasEstaticas, ...rutasLibros, ...rutasCapitulos];
  } catch (error) {
    console.error("Error crítico e inesperado generando sitemap.ts:", error);
    return rutasEstaticas;
  }
}