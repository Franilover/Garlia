"use client";

/**
 * useCriaturaOrganismosStore (Zustand)
 * ───────────────────────────────────────────────────────────────────────────
 * Cache en memoria, compartida entre componentes, de los Organismos
 * vinculados a cada Criatura — alimentada por useCriaturaOrganismos.ts.
 * Mismo espíritu que useOrganismoBiologiaStore.ts (elementos/), pero
 * indexado por criaturaId en vez de organismoId.
 *
 * NO persiste: la fuente offline real es Dexie (db.criatura_organismos);
 * esto solo evita un segundo round-trip si dos componentes montan el hook
 * para la misma criatura al mismo tiempo (ej. al reabrir EditorCriatura
 * rápido después de guardar).
 */

import { create } from "zustand";

import type { CriaturaOrganismo, Organismo } from "@/domains/garlia/elementos/types";

interface OrganismosEntry {
  vinculos: CriaturaOrganismo[];
  organismos: Record<string, Organismo>;
}

interface CriaturaOrganismosState {
  porCriatura: Record<string, OrganismosEntry>;
  setOrganismos: (
    criaturaId: string,
    vinculos: CriaturaOrganismo[],
    organismos: Record<string, Organismo>,
  ) => void;
  invalidar: (criaturaId: string) => void;
}

export const useCriaturaOrganismosStore = create<CriaturaOrganismosState>()((set) => ({
  porCriatura: {},

  setOrganismos: (criaturaId, vinculos, organismos) =>
    set((state) => ({
      porCriatura: { ...state.porCriatura, [criaturaId]: { vinculos, organismos } },
    })),

  invalidar: (criaturaId) =>
    set((state) => {
      const { [criaturaId]: _drop, ...resto } = state.porCriatura;
      return { porCriatura: resto };
    }),
}));
