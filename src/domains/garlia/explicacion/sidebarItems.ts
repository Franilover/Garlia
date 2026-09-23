/**
 * sidebarItems.ts — domains/garlia/explicacion
 * ───────────────────────────────────────────────────────────────────────────
 * Lista de la barra lateral derecha de /garlia/universo/explicacion.
 *
 * "Polaridades", "TASI" y "Partículas" son sub-anclas al MISMO bloque de
 * contenido (id "polaridades" — sigue siendo una sola sección en el body,
 * como EtapaPolaridades.tsx ya la construye), por eso comparten el mismo
 * `href`. El resto de las etapas todavía sin construir (Compuestos en
 * adelante) se listan atenuadas y sin click, como referencia de lo que
 * viene — pero ya NO se renderiza ningún bloque "Próximamente" para ellas
 * en el body (ver ExplicacionPage.tsx).
 */

export interface SidebarItem {
  id: string;
  label: string;
  /** Ancla real a la que salta (comparten la misma en Polaridades/TASI/Partículas). */
  href: string;
  disponible: boolean;
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "polaridades", label: "Polaridades", href: "#polaridades", disponible: true },
  { id: "tasi", label: "TASI", href: "#polaridades", disponible: true },
  { id: "particulas", label: "Partículas", href: "#polaridades", disponible: true },
  { id: "elementos", label: "Elementos", href: "#elementos", disponible: true },
  { id: "compuestos", label: "Compuestos", href: "#compuestos", disponible: true },
  { id: "estructuras", label: "Estructuras", href: "#estructuras", disponible: false },
  { id: "materiales", label: "Materiales", href: "#materiales", disponible: false },
  { id: "objetos", label: "Objetos", href: "#objetos", disponible: false },
];
