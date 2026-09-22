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
    titulo: "Polaridades → TASI → Partículas",
    resumen: "De + y − a las 27 Partículas que arman todo lo demás.",
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
    disponible: false,
  },
  {
    id: "estructuras",
    titulo: "Estructuras",
    resumen: "Los Compuestos se ordenan en una forma estable.",
    disponible: false,
  },
  {
    id: "materiales",
    titulo: "Materiales",
    resumen: "Una Estructura con propiedades físicas propias.",
    disponible: false,
  },
  {
    id: "objetos",
    titulo: "Objetos",
    resumen: "Los Materiales se convierten en cosas del mundo.",
    disponible: false,
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
