"use client";

import { useEffect, useRef } from "react";
import { db } from "@/lib/api/client/db";
import { supabase } from "@/lib/api/client/supabase";

const SYNC_TABLES: Record<string, {
  supabaseTable: string;
  excludeFields?: string[];
}> = {
  notas:             { supabaseTable: "ensayos",           excludeFields: ["status", "deleted"] },
  tareas:            { supabaseTable: "tareas",             excludeFields: ["status", "deleted"] },
  eventos:           { supabaseTable: "eventos",            excludeFields: ["status", "deleted"] },
  rutinas:           { supabaseTable: "rutinas",            excludeFields: ["status", "deleted"] },
  ejercicios_rutina: { supabaseTable: "ejercicios_rutina",  excludeFields: ["status", "deleted"] },
};

const MAX_RETRIES = 3;

function cleanPayload(payload: any, exclude: string[] = []): any {
  const clean = { ...payload };
  for (const field of exclude) delete clean[field];
  return clean;
}

export function useOfflineSync() {
  const isSyncing = useRef(false);

  const syncAll = async () => {
    if (!navigator.onLine || isSyncing.current) return;
    isSyncing.current = true;

    try {
      const queue = await db.offline_queue.orderBy("timestamp").toArray();
      if (queue.length === 0) return;

      console.log(`[Sync] Procesando ${queue.length} operaciones pendientes...`);

      for (const op of queue) {
        const config = SYNC_TABLES[op.table];
        if (!config) {
          // Tabla no registrada en sync — descartar
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

            // Eliminar también de Dexie al confirmar sync
            if (!error) {
              try { await (db as any)[op.table]?.delete(op.recordId); } catch {}
            }

          } else if (op.operation === "upsert") {
            ({ error } = await supabase
              .from(config.supabaseTable)
              .upsert(cleanPayload(op.payload, config.excludeFields)));

          } else if (op.operation === "update") {
            ({ error } = await supabase
              .from(config.supabaseTable)
              .update(cleanPayload(op.payload, config.excludeFields))
              .eq("id", op.recordId));
          }

          if (error) throw error;

          // Marcar como synced en Dexie
          try {
            const table = (db as any)[op.table];
            if (table && op.operation !== "delete") {
              await table.update(op.recordId, { status: "synced" });
            }
          } catch {}

          await db.offline_queue.delete(op.id!);
          console.log(`[Sync] ✓ ${op.table}/${op.recordId}`);

        } catch (err: any) {
          const retries = (op.retries ?? 0) + 1;
          if (retries >= MAX_RETRIES) {
            console.warn(`[Sync] ✗ Descartando ${op.table}/${op.recordId} tras ${MAX_RETRIES} intentos`);
            await db.offline_queue.delete(op.id!);
          } else {
            await db.offline_queue.update(op.id!, { retries });
          }
        }
      }
    } finally {
      isSyncing.current = false;
    }
  };

  useEffect(() => {
    // Intentar sync al montar (por si había cosas pendientes de sesiones anteriores)
    syncAll();
    window.addEventListener("online", syncAll);
    return () => window.removeEventListener("online", syncAll);
  }, []);

  return { syncAll };
}

/**
 * Encola una operación para sincronizar cuando haya conexión.
 * Se llama automáticamente desde useSupabaseData cuando se detecta que no hay red.
 * @example
 * await enqueueOperation("tareas", "upsert", tarea.id, tarea);
 * await enqueueOperation("eventos", "delete", evento.id);
 */
export async function enqueueOperation(
  table: string,
  operation: "upsert" | "update" | "delete",
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
  console.log(`[Queue] Encolado: ${operation} en ${table}/${recordId}`);
}

/** Cuántas operaciones hay pendientes — útil para mostrar badge en la UI */
export async function getPendingCount(): Promise<number> {
  return await db.offline_queue.count();
}