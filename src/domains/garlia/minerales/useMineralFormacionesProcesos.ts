"use client";

/**
 * useMineralFormacionesProcesos.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Hook para CRUD de Procesos de un mineral. Mismo molde que
 * usePlantaOrganosProcesos.ts (ver ese archivo para el razonamiento
 * completo sobre el patrón de vínculo N:N).
 *
 * NOTA: la parte de Formaciones (catálogo "formaciones", vínculo N:N vía
 * estructura_componentes, fórmula vía Granos/Vetas) fue removida junto con
 * toda la lógica de Granos/Vetas/Formación del proyecto — decisión
 * explícita del usuario. Este hook ahora solo maneja Procesos
 * (mineral_reacciones), que es independiente y no se toca.
 *
 * - Sin `orden`/reordenarProcesos: a diferencia del ciclo de vida de una
 *   planta, los procesos geológicos de un mineral no tienen una secuencia
 *   narrativa única (puede oxidarse sin metamorfizar, o al revés), así que
 *   no hay drag-and-drop ni columna `orden` que persistir.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/infra/supabase/supabase";
import { db } from "@/infra/supabase/db";

import type { MineralProceso, MineralProcesoInput } from "./types";

// ── Cache-first para mineral_reacciones (Fase 8): mismo patrón que
// useSistemaOrganos.ts — Dexie filtrado por mineral_id, luego revalidar.
async function leerProcesosDeDexie(mineralId: string): Promise<MineralProceso[]> {
  try {
    if (!db) return [];
    const rows = await db.mineral_reacciones
      .where("mineral_id")
      .equals(mineralId)
      .toArray();
    return rows as unknown as MineralProceso[];
  } catch {
    return [];
  }
}

async function guardarProcesosEnDexie(procesos: MineralProceso[]) {
  try {
    if (!db || procesos.length === 0) return;
    await db.mineral_reacciones.bulkPut(procesos as any[]);
  } catch (e) {
    console.warn("[useMineralFormacionesProcesos] no se pudo guardar procesos en Dexie:", e);
  }
}

export function useMineralFormacionesProcesos(mineralId: string) {
  const [procesos, setProcesos] = useState<MineralProceso[]>([]);
  const [loadingProcesos, setLoadingProcesos] = useState(true);

  // ── Cargar procesos (mineral_reacciones) — Fase 8: cache-first vía Dexie ─
  const loadProcesos = useCallback(async () => {
    // Paso 1: pintar de inmediato con lo que ya haya en Dexie.
    const procesosLocales = await leerProcesosDeDexie(mineralId);
    if (procesosLocales.length > 0) {
      setProcesos(procesosLocales);
      setLoadingProcesos(false);
    } else {
      setLoadingProcesos(true);
    }

    // Paso 2: revalidar contra Supabase en segundo plano.
    const { data: procesoData, error: procesoError } = await supabase
      .from("mineral_reacciones")
      .select("*")
      .eq("mineral_id", mineralId)
      .order("created_at", { ascending: true });

    if (!procesoError && procesoData) {
      setProcesos(procesoData as MineralProceso[]);
      void guardarProcesosEnDexie(procesoData as MineralProceso[]);
    } else if (procesosLocales.length === 0) {
      setProcesos([]);
    }
    setLoadingProcesos(false);
  }, [mineralId]);

  useEffect(() => {
    if (mineralId) void loadProcesos();
  }, [mineralId, loadProcesos]);

  // ── CRUD de procesos: solo un evento geológico (descripcion) — el
  // consume/produce vive en la Reacción vinculada 1:1 (ver
  // useEntidadVinculoReaccion, instanciado por proceso desde la UI). Tabla
  // real "mineral_reacciones" (no "mineral_procesos"), sin columna `orden`
  // — los eventos geológicos no tienen secuencia narrativa única. ────────
  const crearProceso = useCallback(async () => {
    const { data, error } = await supabase
      .from("mineral_reacciones")
      .insert([{ mineral_id: mineralId, descripcion: null, reaccion_id: null }])
      .select()
      .single();

    if (error || !data) return null;
    setProcesos((prev) => [...prev, data as MineralProceso]);
    void guardarProcesosEnDexie([data as MineralProceso]);
    return data as MineralProceso;
  }, [mineralId]);

  const actualizarProceso = useCallback(
    async (id: string, updates: MineralProcesoInput) => {
      setProcesos((prev) => {
        const next = prev.map((p) => (p.id === id ? { ...p, ...updates } : p));
        const actualizado = next.find((p) => p.id === id);
        if (actualizado) void guardarProcesosEnDexie([actualizado]);
        return next;
      });
      const { error } = await supabase.from("mineral_reacciones").update(updates).eq("id", id);
      if (error) void loadProcesos();
    },
    [loadProcesos],
  );

  const eliminarProceso = useCallback(async (id: string) => {
    setProcesos((prev) => prev.filter((p) => p.id !== id));
    try {
      if (db) await db.mineral_reacciones.delete(id);
    } catch {}
    await supabase.from("mineral_reacciones").delete().eq("id", id);
  }, []);

  return {
    procesos,
    loading: loadingProcesos,
    crearProceso,
    actualizarProceso,
    eliminarProceso,
    load: loadProcesos,
  };
}
