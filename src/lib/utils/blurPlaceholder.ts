/**
 * blurPlaceholder.ts
 * ──────────────────
 * Genera un base64 tiny (blurDataURL) a partir de una URL de imagen
 * de Supabase Storage usando plaiceholder + sharp.
 *
 * Instalar: npm install plaiceholder sharp
 *
 * ⚠️  SOLO USAR DESDE:
 *   - Server Components (app/(public)/garlia/libros/[slug]/page.tsx, etc.)
 *   - Route Handlers (app/api/...)
 *   - generateStaticParams / generateMetadata
 *
 * No importar desde Client Components — esto corre en Node, no en el browser.
 *
 * Ejemplo de uso en un Server Component:
 *
 *   import { getBlurDataUrl } from "@/lib/utils/blurPlaceholder";
 *   import { SmartImage } from "@/ui/SmartImage";
 *
 *   export default async function LibroPage({ params }) {
 *     const libro = await fetchLibro(params.slug);
 *     const blurDataUrl = libro.portada_url
 *       ? await getBlurDataUrl(libro.portada_url)
 *       : undefined;
 *
 *     return (
 *       <SmartImage
 *         src={libro.portada_url}
 *         blurDataUrl={blurDataUrl ?? undefined}
 *         className="w-full aspect-[2/3] rounded-lg"
 *       />
 *     );
 *   }
 */

import { getPlaiceholder } from "plaiceholder";

/**
 * Descarga la imagen de `src` y genera un base64 de ~10px que SmartImage
 * usa como blur placeholder mientras carga la imagen real.
 *
 * Retorna `null` si la imagen no se puede descargar o procesar — SmartImage
 * cae de vuelta al skeleton animado en ese caso.
 *
 * @param src  URL pública de la imagen (Supabase Storage, CDN, etc.)
 * @param size Resolución del tiny blur (default 10 — más que suficiente)
 */
export async function getBlurDataUrl(
  src: string,
  size = 10,
): Promise<string | null> {
  try {
    const res = await fetch(src, {
      // next: { revalidate: 86400 } para cachear 24hs si usás fetch caching de Next.js
    });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const { base64 } = await getPlaiceholder(buffer, { size });
    return base64;
  } catch (err) {
    // No lanzar — el componente simplemente mostrará el skeleton genérico.
    if (process.env.NODE_ENV === "development") {
      console.warn("[blurPlaceholder] No se pudo generar blur para:", src, err);
    }
    return null;
  }
}

/**
 * Versión batch: genera blur para múltiples URLs en paralelo.
 * Útil en listados (portadas de libros, fotos de personajes) para
 * no hacer las requests en serie.
 *
 * Ejemplo:
 *   const blurs = await getBlurDataUrls(libros.map(l => l.portada_url));
 *   // blurs[i] corresponde a libros[i].portada_url, puede ser null
 */
export async function getBlurDataUrls(
  urls: (string | null | undefined)[],
  size = 10,
): Promise<(string | null)[]> {
  return Promise.all(
    urls.map((url) => (url ? getBlurDataUrl(url, size) : Promise.resolve(null))),
  );
}
