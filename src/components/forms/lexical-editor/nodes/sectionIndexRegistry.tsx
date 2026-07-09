"use client";
/**
 * sectionIndexRegistry.tsx
 * ─────────────────────────
 * Índice en vivo de todas las SectionNode presentes en el documento,
 * mantenido por SectionSyncPlugin. Choice/Use lo consumen vía
 * useSectionTarget(id) para saber si su destino existe y cuál es su label
 * actual — sin tener que re-parsear el árbol Lexical desde cada chip.
 *
 * Mismo patrón que snippetEditHandler: un registro global mutable +
 * un pequeño pub/sub, porque DecoratorNode no recibe props de React ni
 * puede usar useLexicalComposerContext (no está dentro del composer tree).
 */
import { useEffect, useState } from "react";

import type { SectionIndexEntry } from "./sharedTypes";

type Listener = () => void;

class SectionIndexStore {
  private byId: Map<string, SectionIndexEntry> = new Map();
  private listeners: Set<Listener> = new Set();

  /** Llamado por SectionSyncPlugin en cada update del editor. */
  setIndex(entries: SectionIndexEntry[]): void {
    this.byId = new Map(entries.map((e) => [e.id, e]));
    this.listeners.forEach((l) => l());
  }

  get(id: string): SectionIndexEntry | undefined {
    return id ? this.byId.get(id) : undefined;
  }

  getAll(): SectionIndexEntry[] {
    return Array.from(this.byId.values());
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

/** Una instancia por RichEditor montado alcanza — en la práctica solo hay
 *  un editor de capítulo activo a la vez en pantalla. */
export const sectionIndexStore = new SectionIndexStore();

export interface SectionTargetInfo {
  id: string;
  exists: boolean;
  label?: string;
}

/** Hook que usan los chips de Choice/Use para saber en vivo si su target
 *  sigue existiendo y cuál es su label actual. Se re-renderiza solo cuando
 *  el índice cambia (no en cada keystroke ajeno). */
export function useSectionTarget(targetId: string): SectionTargetInfo {
  const [, forceTick] = useState(0);

  useEffect(() => {
    return sectionIndexStore.subscribe(() => forceTick((t) => t + 1));
  }, []);

  const entry = sectionIndexStore.get(targetId);
  return {
    id: targetId,
    exists: !!entry,
    label: entry?.label,
  };
}

/** Hook que usan los pickers (FormChoice/FormUse) para listar destinos
 *  disponibles en tiempo real, igual criterio que useSectionTarget. */
export function useAllSections(): SectionIndexEntry[] {
  const [, forceTick] = useState(0);

  useEffect(() => {
    return sectionIndexStore.subscribe(() => forceTick((t) => t + 1));
  }, []);

  return sectionIndexStore.getAll();
}
