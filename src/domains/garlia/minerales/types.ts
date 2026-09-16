/**
 * types.ts (Minerales)
 * ───────────────────────────────────────────────────────────────────────────
 * Entidad plana (mismo molde que Flora/Item/Ecosistema): nombre, imagen,
 * descripción, notas.
 *
 * NOTA: la sección de Formaciones (partes del mineral con fórmula propia
 * vía Veta/Grano/Compuesto) fue removida junto con toda la lógica de
 * Granos/Vetas/Formación del proyecto — decisión explícita del usuario.
 *
 * - Procesos: eventos geológicos de formación/transformación
 *   (cristalización, oxidación, metamorfismo…) con consume/produce —
 *   mismo shape que PlantaProceso, pero SIN orden/secuencia: a diferencia
 *   del ciclo de vida de una planta, los procesos geológicos de un mineral
 *   no tienen un orden narrativo único (puede oxidarse sin metamorfizar,
 *   o al revés), así que no hay drag-and-drop ni columna `orden`.
 */

export interface Mineral {
  id: string;
  nombre: string;
  imagen_url: string | null;
  descripcion: string;
  notas: string;
  orden: number;
  created_at: string;
  updated_at: string;
}

/**
 * Evento geológico de formación/transformación de un mineral (ej.
 * "Cristalización", "Oxidación"). Ya NO tiene consume/produce propios ni
 * nombre — es un contenedor que vincula 1:1 una Reacción del catálogo
 * global de Química vía reaccion_id, mismo patrón que PlantaProceso en
 * Flora. La Reacción vinculada trae su propio nombre, consume/produce y
 * balance.
 */
export interface MineralProceso {
  id: string;
  mineral_id: string;
  /** Reacción vinculada del catálogo global — 1:1, null si aún no se eligió. */
  reaccion_id: string | null;
  descripcion: string | null;
  created_at: string;
}

export type MineralInput = Partial<
  Pick<Mineral, "nombre" | "imagen_url" | "descripcion" | "notas" | "orden">
>;

export type MineralProcesoInput = Partial<Pick<MineralProceso, "reaccion_id" | "descripcion">>;
