"use client";

import { useEffect, useRef } from "react";
import { db } from "@/lib/api/client/db";
import { supabase } from "@/lib/api/client/supabase";

const SYNC_TABLES: Record<string, {
  supabaseTable: string;
  excludeFields?: string[];
}> = {
  // Escritura creativa
  notas:             { supabaseTable: "ensayos",           excludeFields: ["status", "deleted"] },
  secciones_cancion: { supabaseTable: "secciones_cancion", excludeFields: ["status", "deleted"] },
  capitulos:         { supabaseTable: "capitulos",         excludeFields: ["status", "deleted"] },
  // Agenda
  tareas:            { supabaseTable: "tareas",            excludeFields: ["status", "deleted"] },
  eventos:           { supabaseTable: "eventos",           excludeFields: ["status", "deleted"] },
  // Ejercicio
  rutinas:           { supabaseTable: "rutinas",           excludeFields: ["status", "deleted"] },
  ejercicios_rutina: { supabaseTable: "ejercicios_rutina", excludeFields: ["status", "deleted"] },
  // Cocina
  recetas:           { supabaseTable: "recetas",           excludeFields: ["status", "deleted"] },
  ingredientes:      { supabaseTable: "ingredientes",      excludeFields: ["status", "deleted"] },
  compras:           { supabaseTable: "compras",           excludeFields: ["status", "deleted"] },
  // Ropa
  ropa:              { supabaseTable: "ropa",              excludeFields: ["status", "deleted"] },
  ropa_outfits:      { supabaseTable: "ropa_outfits",      excludeFields: ["status", "deleted"] },
  // Galería / multimedia
  // Nota: diario_fotos y dibujos tienen id numérico (++id).
  // Solo se sincronizan updates y deletes — los creates requieren conexión.
  diario_fotos:      { supabaseTable: "diario_fotos",      excludeFields: ["status", "deleted"] },
  dibujos:           { supabaseTable: "dibujos",           excludeFields: ["status", "deleted"] },
  // Wiki (updates/deletes offline; creates requieren conexión)
  personajes:        { supabaseTable: "personajes",        excludeFields: ["status", "deleted"] },
  criaturas:         { supabaseTable: "criaturas",         excludeFields: ["status", "deleted"] },
  criatura_variantes:{ supabaseTable: "criatura_variantes",excludeFields: ["status", "deleted"] },
  items:             { supabaseTable: "items",             excludeFields: ["status", "deleted"] },
  reinos:            { supabaseTable: "reinos",            excludeFields: ["status", "deleted"] },
  relaciones:        { supabaseTable: "relaciones",        excludeFields: ["status", "deleted"] },
};

const MAX_RETRIES = 3;

function cleanPayload(payload: any, exclude: string[] = []): any {
  const clean = { ...payload };
  for (const field of exclude) delete clean[field];
  return clean;
}

// ─── Helpers de Dexie exportados ─────────────────────────────────────────────
// Uso: import { dexiePut, dexieUpdate, dexieDelete } from "@/hooks/data/useOfflineSync"

export async function dexiePut(table: string, data: any): Promise<void> {
  try {
    if (!db) return;
    await (db as any)[table]?.put(data);
  } catch (e) {
    console.warn(`[Dexie] put failed on '${table}':`, e);
  }
}

export async function dexieUpdate(table: string, id: string | number, data: any): Promise<void> {
  try {
    if (!db) return;
    await (db as any)[table]?.update(id, data);
  } catch (e) {
    console.warn(`[Dexie] update failed on '${table}':`, e);
  }
}

export async function dexieDelete(table: string, id: string | number): Promise<void> {
  try {
    if (!db) return;
    await (db as any)[table]?.delete(id);
  } catch (e) {
    console.warn(`[Dexie] delete failed on '${table}':`, e);
  }
}

// ─── Sync engine ─────────────────────────────────────────────────────────────

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
    syncAll();
    window.addEventListener("online", syncAll);
    return () => window.removeEventListener("online", syncAll);
  }, []);

  return { syncAll };
}

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

export async function getPendingCount(): Promise<number> {
  return await db.offline_queue.count();
}