import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

// Inicializa Supabase (asegúrate de usar tus variables de entorno)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;  

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://franilover.vercel.app'; 

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Traer slugs de libros y canciones desde Supabase
  const { data: libros } = await supabase.from('libros').select('id, titulo'); // O la columna que uses para las rutas
  const { data: canciones } = await supabase.from('canciones').select('id, titulo');

  const rutasLibros = (libros || []).map((libro) => ({
    url: `${baseUrl}/garlia/libros/${libro.id}`, 
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const rutasCanciones = (canciones || []).map((cancion) => ({
    url: `${baseUrl}/garlia/canciones/${cancion.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // 2. Rutas estáticas fijas de tu aplicación
  const rutasEstaticas = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1.0 },
    { url: `${baseUrl}/garlia/personal`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/garlia/mapa`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.9 },
    { url: `${baseUrl}/garlia/libros`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${baseUrl}/garlia/canciones`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.9 },
  ];

  return [...rutasEstaticas, ...rutasLibros, ...rutasCanciones];
}