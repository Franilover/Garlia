"use client";

/**
 * useMezclasAfinidadCatalogo.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Catálogo liviano para "¿con qué otra planta se complementa esta?"
 * (AfinidadEntreEntidadesPanel): trae de una sola vez, para toda la Flora,
 * la mezcla agregada de Compuestos de sus Órganos (todos juntos por
 * entidad — no uno por uno), lista para pasar a ordenarPorAfinidadDeMezclas.
 *
 * "Agregada" acá significa: se concatenan los componentes de TODOS los
 * Órganos de una Flora en una sola mezcla — es la composición material
 * completa de la entidad, mismo criterio que ya usa ComposicionQuimicaPanel
 * por Órgano individual, pero a nivel de la entidad entera.
 *
 * FIX (ago-2026): el lado de Flora/Órganos consultaba `grupos_compuestos`
 * y `organo.componentes` — ninguna de las dos existe en Supabase (la tabla
 * `grupos_compuestos` fue eliminada, y Órgano dejó de tener columna
 * `componentes` propia, ver elementos/types.ts). Las queries fallaban
 * silenciosamente y el panel de Flora quedaba siempre vacío. Reescrito
 * para reconstruir la mezcla real desde la cadena viva:
 *   planta_organos → Organo → organo_tejidos → Tejido ─┬─ tejido_celulas → Celula → celula_compuestos → Compuesto
 *                                                       └─ tejido_compuestos ─────────────────────────→ Compuesto
 *
 * FASE 7: el vínculo Planta→Órgano se lee ahora de estructura_componentes
 * (padre_tipo='planta', hijo_tipo='organo') en vez de la tabla dedicada
 * planta_organos (sigue existiendo sin usarse, limpieza en Fase 8).
 *
 * NOTA (limpieza Grano/Veta/Formación): el "lado Mineral" (Mineral →
 * Formación → formacion_vetas → Veta → estructura_componentes
 * veta→grano→compuesto) fue removido junto con toda la lógica de
 * Granos/Vetas/Formación del proyecto — decisión explícita del usuario.
 * Este catálogo ahora solo cubre Flora; AfinidadEntreEntidadesPanel ya
 * refleja esto (EntidadConMezcla["tipo"] es solo "flora").
 */

import { useEffect, useState } from "react";

import { supabase } from "@/infra/supabase/supabase";

import type { ComponenteCompuestoEnMezcla } from "@/domains/garlia/elementos/afinidad";

export interface EntidadConMezcla {
  id: string;
  nombre: string;
  tipo: "flora";
  mezcla: ComponenteCompuestoEnMezcla[];
}

/** Fila de estructura_componentes ya reducida a padre_id/hijo_id — sirve
 *  para planta→organo. */
interface FilaVinculo {
  padre_id: string;
  hijo_id: string;
}

export function useMezclasAfinidadCatalogo() {
  const [entidades, setEntidades] = useState<EntidadConMezcla[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      setLoading(true);

      const [{ data: floras }, { data: vinculosOrganoRaw }] = await Promise.all([
        supabase.from("organismos").select("id, nombre").eq("tipo_organismo", "vegetal"),
        supabase
          .from("estructura_componentes")
          .select("padre_id, hijo_id")
          .eq("padre_tipo", "planta")
          .eq("hijo_tipo", "organo"),
      ]);

      if (cancelado) return;

      // ── Lado Flora: reconstruir la mezcla real desde la cadena viva ────
      const vinculosOrgano = ((vinculosOrganoRaw ?? []) as FilaVinculo[]).map((v) => ({
        planta_id: v.padre_id,
        organo_id: v.hijo_id,
      }));
      const organoIds = vinculosOrgano.map((v) => v.organo_id).filter((id): id is string => !!id);

      const mezclaFlora = new Map<string, ComponenteCompuestoEnMezcla[]>();

      if (organoIds.length > 0) {
        const { data: organoTejidos } = await supabase
          .from("organo_tejidos")
          .select("organo_id, tejido_id")
          .in("organo_id", organoIds);

        const tejidoIds = [...new Set((organoTejidos ?? []).map((v) => v.tejido_id as string))];

        if (tejidoIds.length > 0) {
          const [{ data: tejidoCelulas }, { data: tejidoCompuestos }] = await Promise.all([
            supabase.from("tejido_celulas").select("tejido_id, celula_id").in("tejido_id", tejidoIds),
            supabase.from("tejido_compuestos").select("tejido_id, compuesto_id").in("tejido_id", tejidoIds),
          ]);

          const celulaIds = [
            ...new Set((tejidoCelulas ?? []).map((v) => v.celula_id as string)),
          ];
          const celulaCompuestos =
            celulaIds.length > 0
              ? (
                  await supabase
                    .from("celula_compuestos")
                    .select("celula_id, compuesto_id")
                    .in("celula_id", celulaIds)
                ).data
              : [];

          // compuesto_id por tejido: directo (tejido_compuestos) + indirecto
          // (tejido_celulas → celula_compuestos).
          const compuestosPorTejido = new Map<string, string[]>();
          for (const tc of tejidoCompuestos ?? []) {
            const acc = compuestosPorTejido.get(tc.tejido_id as string) ?? [];
            acc.push(tc.compuesto_id as string);
            compuestosPorTejido.set(tc.tejido_id as string, acc);
          }
          const compuestosPorCelula = new Map<string, string[]>();
          for (const cc of celulaCompuestos ?? []) {
            const acc = compuestosPorCelula.get(cc.celula_id as string) ?? [];
            acc.push(cc.compuesto_id as string);
            compuestosPorCelula.set(cc.celula_id as string, acc);
          }
          for (const tc of tejidoCelulas ?? []) {
            const viaCelula = compuestosPorCelula.get(tc.celula_id as string) ?? [];
            const acc = compuestosPorTejido.get(tc.tejido_id as string) ?? [];
            compuestosPorTejido.set(tc.tejido_id as string, [...acc, ...viaCelula]);
          }

          // organo_id → lista de compuesto_id (agregando todos sus tejidos)
          const compuestosPorOrgano = new Map<string, string[]>();
          for (const ot of organoTejidos ?? []) {
            const compuestosDelTejido = compuestosPorTejido.get(ot.tejido_id as string) ?? [];
            const acc = compuestosPorOrgano.get(ot.organo_id as string) ?? [];
            compuestosPorOrgano.set(ot.organo_id as string, [...acc, ...compuestosDelTejido]);
          }

          // planta_id → mezcla agregada de todos sus Órganos. No hay
          // cantidad numérica real en esta cadena (proporcion es texto
          // libre) — cada aparición de un Compuesto cuenta como cantidad 1,
          // aproximación razonable para el cálculo de afinidad.
          for (const v of vinculosOrgano) {
            const compuestoIds = compuestosPorOrgano.get(v.organo_id) ?? [];
            if (!v.planta_id || compuestoIds.length === 0) continue;
            const acumulada = mezclaFlora.get(v.planta_id) ?? [];
            const nuevos: ComponenteCompuestoEnMezcla[] = compuestoIds.map((compuesto_id) => ({
              compuesto_id,
              cantidad: 1,
            }));
            mezclaFlora.set(v.planta_id, [...acumulada, ...nuevos]);
          }
        }
      }

      const resultado: EntidadConMezcla[] = ((floras ?? []) as { id: string; nombre: string }[])
        .map((f) => ({ id: f.id, nombre: f.nombre, tipo: "flora" as const, mezcla: mezclaFlora.get(f.id) ?? [] }))
        .filter((e) => e.mezcla.length > 0);

      setEntidades(resultado);
      setLoading(false);
    }

    void cargar();
    return () => {
      cancelado = true;
    };
  }, []);

  return { entidades, loading };
}
