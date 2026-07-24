/**
 * navegacionTauri.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Contexto (ver src-tauri/src/static_rewrite.rs y static_protocol.rs):
 *
 * El sitio usa `output: "export"`, así que las rutas dinámicas
 * (/garlia/libros/[id], /garlia/canciones/[id], /personal/mensajes/[id], etc.)
 * solo existen como el build estático `.../placeholder`. En la web,
 * vercel.json reescribe la URL pedida hacia `placeholder` sin tocar la URL
 * visible, y el componente cliente lee el id/slug real de `window.location`.
 *
 * Tauri replica ese mismo rewrite, pero SOLO se dispara cuando el WebView le
 * pide un archivo al protocolo `garlia://` — es decir, en una carga de
 * documento real (primera carga, F5, o `window.location.href = ...`).
 *
 * El problema: `next/link` y `router.push`/`router.replace` navegan
 * client-side (SPA) vía `history.pushState`, sin volver a pedir el archivo
 * al protocolo. Como en el build estático no existe una ruta real para cada
 * id, el router de Next no encuentra nada y termina redirigiendo a inicio.
 *
 * La solución es forzar navegación de documento completo hacia estas rutas
 * dinámicas, pero SOLO dentro de Tauri — en la web normal, Next Router debe
 * seguir andando igual que siempre (ahí sí existe el rewrite real de
 * vercel.json, y SPA es más rápido).
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function estaEnTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

/**
 * Navega a una ruta dinámica ([id]/[slug]/etc). Dentro de Tauri, fuerza una
 * carga de documento completo (`window.location.href`) para que pase por el
 * protocolo `garlia://` y el rewrite de Rust. En web, delega en el router de
 * Next pasado por parámetro (para no romper la navegación SPA normal).
 *
 * Uso típico con next/navigation:
 *   const router = useRouter();
 *   navegarRutaDinamica(ruta, () => router.push(ruta));
 *
 * O con next/link, interceptando el click:
 *   <Link href={href} onClick={(e) => {
 *     if (estaEnTauri()) { e.preventDefault(); navegarRutaDinamica(href); }
 *   }}>
 */
export function navegarRutaDinamica(ruta: string, fallbackSpa?: () => void): void {
  if (estaEnTauri()) {
    window.location.href = ruta;
    return;
  }
  if (fallbackSpa) {
    fallbackSpa();
  } else {
    window.location.href = ruta;
  }
}
