"use client";

/**
 * useGameNavigation (Zustand)
 * ───────────────────────────────────────────────────────────────────────────
 * Mismo patrón que useEscritorioNavigation: controla qué sección de
 * /myself/game está activa, para que el navbar pueda cambiarla sin
 * navegar de página.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type GameSectionKey =
  | "personajes"
  | "biomas"
  | "items"
  | "ecologia"
  | "misiones"
  | "factores"
  | "modificadores"
  | "garumis";

interface GameNavState {
  section: GameSectionKey;
  selectSection: (section: GameSectionKey) => void;
}

export const useGameNavigation = create<GameNavState>()(
  persist(
    (set) => ({
      section: "personajes",
      selectSection: (section) => set({ section }),
    }),
    {
      name: "game:nav:v1",
    },
  ),
);
