"use client";

import { useEffect, useRef } from "react";
import { db, type OfflineOperation } from "@/lib/api/client/db";
import { supabase } from "@/lib/api/client/supabase";

// ─── CONFIGURACIÓN DE TABLAS ──────────────────────────────────────────────────
// Para agregar una tabla nueva en el futuro: solo añade una entrada aquí.

const SYNC_TABLES: Record<string, {
  supabaseTable: string;
  excludeFields?: string[];  // campos solo locales que no van a Supabase
}> = {
  notas: {
    supabaseTable: "ensayos",
    excludeFields: ["status"],
  },
  tareas: {
    supabaseTable: "tareas",
    excludeFields: ["status"],
  },
  eventos: {
    supabaseTable: "eventos",
    excludeFields: ["status", "deleted"],
  },
  rutinas: {
    supabaseTable: "rutinas",
    excludeFields: ["status", "deleted"],
  },
  ejercicios_rutina: {
    supabaseTable: "ejercicios_rutina",
    excludeFields: ["status", "deleted"],
  },
};

const MAX_RETRIES = 3;

function cleanPayload(payload: any, exclude: string[] = []): any {
  const clean = { ...payload };
  for (const field of exclude) delete clean[field];
  return clean;
}

// ─── HOOK PRINCIPAL ───────────────────────────────────────────────────────────
export function useOfflineSync() {
  const isSyncing = useRef(false);

  const syncAll = async () => {
    if (!navigator.onLine || isSyncing.current) return;
    isSyncing.current = true;

    try {
      const queue: OfflineOperation[] = await db.offline_queue
        .orderBy("timestamp")
        .toArray();

      if (queue.length === 0) return;

      console.log(`[Sync] ${queue.length} operaciones pendientes...`);

      for (const op of queue) {
        const config = SYNC_TABLES[op.table];
        if (!config) {
          // Tabla desconocida — descartar para no bloquear la cola
          await db.offline_queue.delete(op.id!);
          continue;
        }

        try {
          let error: any = null;

          if (op.operation === "delete") {
            ({ error } = await supabase
              .from(config.supabaseTable)
              .delete()
              .eq("id", op.recordId));

          } else if (op.operation === "upsert") {
            const data = cleanPayload(op.payload, config.excludeFields);
            ({ error } = await supabase
              .from(config.supabaseTable)
              .upsert(data));

          } else if (op.operation === "update") {
            const data = cleanPayload(op.payload, config.excludeFields);
            ({ error } = await supabase
              .from(config.supabaseTable)
              .update(data)
              .eq("id", op.recordId));
          }

          if (error) throw error;

          await db.offline_queue.delete(op.id!);
          await markSynced(op.table, op.recordId);

          console.log(`[Sync] ✓ ${op.table}/${op.recordId} (${op.operation})`);

        } catch (err: any) {
          console.error(`[Sync] ✗ ${op.table}/${op.recordId}:`, err?.message ?? err);

          const retries = (op.retries ?? 0) + 1;
          if (retries >= MAX_RETRIES) {
            console.warn(`[Sync] Descartando ${op.table}/${op.recordId} tras ${MAX_RETRIES} intentos`);
            await db.offline_queue.delete(op.id!);
          } else {
            await db.offline_queue.update(op.id!, { retries });
          }
        }
      }

      console.log("[Sync] Completado.");
    } catch (err) {
      console.error("[Sync] Error crítico:", err);
    } finally {
      isSyncing.current = false;
    }
  };

  useEffect(() => {
    syncAll();
    window.addEventListener("online", syncAll);
    return () => window.removeEventListener("online", syncAll);
  }, []);
}

// ─── MARCA SYNCED EN CACHÉ LOCAL ─────────────────────────────────────────────
async function markSynced(table: string, id: string) {
  try {
    switch (table) {
      case "notas":             await db.notas.update(id, { status: "synced" }); break;
      case "tareas":            await db.tareas.update(id, { status: "synced" }); break;
      case "eventos":           await db.eventos.update(id, { status: "synced" }); break;
      case "rutinas":           await db.rutinas.update(id, { status: "synced" }); break;
      case "ejercicios_rutina": await db.ejercicios_rutina.update(id, { status: "synced" }); break;
    }
  } catch {
    // El registro puede haber sido eliminado localmente — no es crítico
  }
}

// ─── HELPERS PÚBLICOS ─────────────────────────────────────────────────────────

/**
 * Encola una operación offline. Úsalo desde cualquier hook o componente.
 *
 * @example — agregar tarea offline:
 *   await enqueueOperation("tareas", "upsert", tarea.id, tarea);
 *
 * @example — eliminar evento offline:
 *   await enqueueOperation("eventos", "delete", evento.id);
 *
 * @example — actualizar campo de rutina:
 *   await enqueueOperation("rutinas", "update", rutina.id, { nombre: "Nueva" });
 */
export async function enqueueOperation(
  table: string,
  operation: OfflineOperation["operation"],
  recordId: string,
  payload?: any
) {
  await db.offline_queue.add({
    table,
    operation,
    recordId,
    payload: payload ?? {},
    timestamp: Date.now(),
    retries: 0,
  });
}

/**
 * Cuántas operaciones hay pendientes de sincronizar.
 * Útil para mostrar un badge en la UI ("3 cambios sin guardar").
 */
export async function getPendingCount(): Promise<number> {
  return await db.offline_queue.count();
}