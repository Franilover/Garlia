"use client";

/**
 * usePanelFlotante (Zustand)
 * ───────────────────────────────────────────────────────────────────────────
 * Estado global único para el panel flotante de "vista rápida" de
 * Personaje/Criatura/Reino/Item/Flora/Mineral/Ciudad/Bioma/Ecosistema/Hábitat. Reemplaza el sistema anterior de click del medio +
 * FullscreenEntityPanel (pantalla completa) y los estados locales
 * personajeAbierto/criaturaAbierta/reinoAbierto duplicados en
 * GeografiaJerarquica y CriaturasJerarquica.
 *
 * Cualquier botón que abra un personaje o criatura en toda la app debe
 * llamar a abrir(kind, id) con click izquierdo normal. El panel siempre se
 * muestra centrado en pantalla (nunca a pantalla completa, nunca anclado a
 * un trigger) — ver PanelFlotanteGlobal.tsx, montado una única vez en
 * EditorMundoRoot.
 *
 * Reemplaza en vez de apilar: abrir() con una entidad nueva mientras el
 * panel ya está abierto simplemente cambia el contenido, no abre un
 * segundo panel encima.
 *
 * Uso:
 *   const abrir = usePanelFlotante((s) => s.abrir);
 *   <EntityCard ... onClick={() => abrir("personaje", p.id)} />
 */

import { create } from "zustand";

export type PanelFlotanteKind =
  | "personaje"
  | "criatura"
  | "reino"
  | "item"
  | "flora"
  | "mineral"
  | "ciudad"
  // Jerarquía ecológica (Bioma → Ecosistema → Hábitat): antes cada una se
  // abría con un PopoverFlotante local anclado; ahora comparten el mismo
  // panel flotante global que el resto de las entidades.
  | "bioma"
  | "ecosistema"
  | "habitat";

interface PanelFlotanteState {
  entidad: { kind: PanelFlotanteKind; id: string } | null;
  abrir: (kind: PanelFlotanteKind, id: string) => void;
  cerrar: () => void;
  /**
   * Contador de "las presencias de algún hábitat cambiaron". El panel de un
   * hábitat lo incrementa tras añadir/quitar un habitante; la vista que es
   * dueña del mapa ecológico (EntidadesPage → useMapaEcologico) lo observa y
   * se refresca, así los chips del fondo no quedan desactualizados. Es un
   * contador y no un callback para no acoplar el panel global a ninguna
   * vista concreta.
   */
  mapaEcologicoVersion: number;
  invalidarMapaEcologico: () => void;
}

export const usePanelFlotante = create<PanelFlotanteState>()((set) => ({
  entidad: null,
  abrir: (kind, id) => set({ entidad: { kind, id } }),
  cerrar: () => set({ entidad: null }),
  mapaEcologicoVersion: 0,
  invalidarMapaEcologico: () =>
    set((st) => ({ mapaEcologicoVersion: st.mapaEcologicoVersion + 1 })),
}));
