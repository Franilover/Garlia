"use client";

/**
 * useOrganismoBiologiaStore (Zustand)
 * ───────────────────────────────────────────────────────────────────────────
 * Cache en memoria, compartida entre componentes, de los Sistemas y Órganos
 * directos resueltos para cada Organismo — alimentada por
 * useOrganismoSistemas.ts / useOrganismoOrganos.ts.
 *
 * Por qué existe: el mismo Organismo puede pedirse desde dos lugares a la
 * vez (ej. la fila 2 inline de EditorCriatura y, si se abre,
 * OrganismoPanelFlotante para ese mismo organismo). Sin este store, cada
 * instancia del hook hace su propio round-trip a Supabase (aunque Dexie ya
 * amortigua el primer pintado, sigue siendo un fetch de red duplicado y un
 * segundo parpadeo de loading). Con el store, la segunda instancia adopta
 * de inmediato lo que la primera ya resolvió.
 *
 * NO persiste (no usa `persist`): la fuente de verdad offline real es
 * Dexie (ver db.organismo_sistemas / db.organismo_organos); esto es solo
 * el estado en memoria de React para la sesión actual, mismo espíritu que
 * useLectorEntidadesStore.ts.
 *
 * Cada hook sigue siendo dueño de su propio ciclo de carga/mutación
 * (Supabase + Dexie) — este store solo espeja el resultado para que otras
 * instancias lo lean sin refetchear.
 */

import { create } from "zustand";

import type { Organo, OrganismoOrgano, OrganismoSistema, Sistema } from "@/domains/garlia/elementos/types";

interface SistemasEntry {
  vinculos: OrganismoSistema[];
  sistemas: Record<string, Sistema>;
}

interface OrganosEntry {
  vinculos: OrganismoOrgano[];
  organos: Record<string, Organo>;
}

interface OrganismoBiologiaState {
  sistemasPorOrganismo: Record<string, SistemasEntry>;
  organosPorOrganismo: Record<string, OrganosEntry>;

  setSistemas: (organismoId: string, vinculos: OrganismoSistema[], sistemas: Record<string, Sistema>) => void;
  setOrganos: (organismoId: string, vinculos: OrganismoOrgano[], organos: Record<string, Organo>) => void;

  /** Limpia la entrada de un Organismo puntual (ej. si se desvincula del todo). */
  invalidar: (organismoId: string) => void;
}

export const useOrganismoBiologiaStore = create<OrganismoBiologiaState>()((set) => ({
  sistemasPorOrganismo: {},
  organosPorOrganismo: {},

  setSistemas: (organismoId, vinculos, sistemas) =>
    set((state) => ({
      sistemasPorOrganismo: {
        ...state.sistemasPorOrganismo,
        [organismoId]: { vinculos, sistemas },
      },
    })),

  setOrganos: (organismoId, vinculos, organos) =>
    set((state) => ({
      organosPorOrganismo: {
        ...state.organosPorOrganismo,
        [organismoId]: { vinculos, organos },
      },
    })),

  invalidar: (organismoId) =>
    set((state) => {
      const { [organismoId]: _s, ...restoSistemas } = state.sistemasPorOrganismo;
      const { [organismoId]: _o, ...restoOrganos } = state.organosPorOrganismo;
      return { sistemasPorOrganismo: restoSistemas, organosPorOrganismo: restoOrganos };
    }),
}));
