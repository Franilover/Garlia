/**
 * etapas.ts — domains/garlia/explicacion
 * ───────────────────────────────────────────────────────────────────────────
 * Fuente única de la lista de tramos del recorrido "Cómo surge cada cosa".
 * `disponible: true` = tiene su propio componente EtapaXxx.tsx con gráficos
 * reales; `false` = todavía se muestra como placeholder "Próximamente" en
 * ExplicacionPage. Se va pasando de false a true a medida que se construye
 * cada tramo siguiente.
 */

export interface EtapaInfo {
  id: string;
  titulo: string;
  resumen: string;
  disponible: boolean;
}

export const ETAPAS: EtapaInfo[] = [
  {
    id: "polaridades",
    titulo: "Polaridades",
    resumen: "Los dos polos, + y −, de donde nace todo lo demás.",
    disponible: true,
  },
  {
    id: "tasi",
    titulo: "TASI",
    resumen: "Los polos se combinan en las 4 letras T/A/S/I.",
    disponible: true,
  },
  {
    id: "particulas",
    titulo: "Partículas",
    resumen: "3 letras TASI juntas arman una Partícula.",
    disponible: true,
  },
  {
    id: "elementos",
    titulo: "Elementos",
    resumen: "Las Partículas se organizan en 3 capas y nace un Elemento.",
    disponible: true,
  },
  {
    id: "compuestos",
    titulo: "Compuestos",
    resumen: "Dos o más Elementos se combinan.",
    disponible: true,
  },
  {
    id: "estructuras",
    titulo: "Estructuras",
    resumen: "Los Compuestos se ordenan en una forma estable.",
    disponible: true,
  },
  {
    id: "materiales",
    titulo: "Materiales",
    resumen: "Una Estructura con propiedades físicas propias.",
    disponible: true,
  },
  {
    id: "objetos",
    titulo: "Objetos",
    resumen: "Los Materiales se convierten en cosas del mundo.",
    disponible: true,
  },
  {
    id: "biologia",
    titulo: "Células → Criaturas",
    resumen: "El mismo camino, pero hacia lo vivo.",
    disponible: false,
  },
  {
    id: "iums-oris",
    titulo: "Iums → Oris",
    resumen: "Las Partículas también arman las fuerzas cósmicas.",
    disponible: false,
  },
];
