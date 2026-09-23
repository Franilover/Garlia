/**
 * sidebarItems.ts — domains/garlia/explicacion
 * ───────────────────────────────────────────────────────────────────────────
 * Lista de la barra lateral derecha de /garlia/universo/explicacion.
 *
 * Desde el rediseño de bloques numerados (ver ExplicacionPage.tsx),
 * Polaridades, TASI y Partículas son 3 tramos independientes, cada uno
 * con su propia sección/ancla (antes vivían juntos dentro de un solo
 * bloque "polaridades"). El resto de las etapas todavía sin construir
 * (Objetos en adelante) se listan atenuadas y sin click, como referencia
 * de lo que viene — pero ya NO se renderiza ningún bloque "Próximamente"
 * para ellas en el body (ver ExplicacionPage.tsx).
 */

export interface SidebarItem {
  id: string;
  label: string;
  href: string;
  disponible: boolean;
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "polaridades", label: "Polaridades", href: "#polaridades", disponible: true },
  { id: "tasi", label: "TASI", href: "#tasi", disponible: true },
  { id: "particulas", label: "Partículas", href: "#particulas", disponible: true },
  { id: "elementos", label: "Elementos", href: "#elementos", disponible: true },
  { id: "compuestos", label: "Compuestos", href: "#compuestos", disponible: true },
  { id: "estructuras", label: "Estructuras", href: "#estructuras", disponible: true },
  { id: "materiales", label: "Materiales", href: "#materiales", disponible: true },
  { id: "objetos", label: "Objetos", href: "#objetos", disponible: false },
];
