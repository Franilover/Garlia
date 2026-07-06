"use client";

/**
 * useMundoNavigation (Zustand)
 * ───────────────────────────────────────────────────────────────────────────
 * Reemplaza el Context+reducer anterior. Misma responsabilidad, menos
 * ceremonia: sin Provider que envolver, sin useContext, sin useMemo para
 * evitar renders de más — Zustand ya hace selección granular por selector.
 *
 * Requisito: `npm install zustand` (verificado con zustand@5.0.14 + TS strict,
 * sin errores).
 *
 * Uso en componentes — IMPORTANTE: seleccioná solo lo que necesitás, para no
 * re-renderizar en cada cambio de cualquier campo del store:
 *
 *   const section = useMundoNavigation((s) => s.section);
 *   const openEntity = useMundoNavigation((s) => s.openEntity);
 *
 * en vez de:
 *
 *   const { section, openEntity } = useMundoNavigation(); // ❌ re-renderiza siempre
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SectionKey =
  | "personajes"
  | "criaturas"
  | "items"
  | "reinos"
  | "ciudades"
  | "grupos"
  | "magia" // hechizos / dones / runas, sub-navegado con magiaTipo
  | "capitulos"
  | "letras"
  | "notas"
  | "mapa"
  | "linea-tiempo";

export type MagiaTipo = "hechizos" | "dones" | "runas";

interface MundoNavState {
  section: SectionKey;
  selectedId: string | null;
  /** Sub-tipo cuando section === "magia" */
  magiaTipo: MagiaTipo;
  /** Incrementa en cada "apertura puntual" de entidad, útil como React key para forzar remount sin setTimeout */
  navKey: number;

  selectSection: (section: SectionKey) => void;
  openEntity: (section: SectionKey, id: string, magiaTipo?: MagiaTipo) => void;
  selectMagiaTipo: (tipo: MagiaTipo) => void;
  clearSelection: () => void;
}

export const useMundoNavigation = create<MundoNavState>()(
  persist(
    (set) => ({
      section: "personajes",
      selectedId: null,
      magiaTipo: "hechizos",
      navKey: 0,

      selectSection: (section) => set({ section, selectedId: null }),

      openEntity: (section, id, magiaTipo) =>
        set((state) => ({
          section,
          selectedId: id,
          magiaTipo: magiaTipo ?? state.magiaTipo,
          navKey: state.navKey + 1,
        })),

      selectMagiaTipo: (magiaTipo) => set({ magiaTipo, selectedId: null }),

      clearSelection: () => set({ selectedId: null }),
    }),
    {
      // Única clave de persistencia — reemplaza los 3 mecanismos previos
      // (editorEntidades:session, garlia-panel-item, garlia-pending-open-entity).
      name: "mundo:nav:v2",
      // No persistimos navKey: al recargar la página no queremos forzar
      // remounts fantasma con un contador viejo.
      partialize: (state) => ({
        section: state.section,
        selectedId: state.selectedId,
        magiaTipo: state.magiaTipo,
      }),
    },
  ),
);
