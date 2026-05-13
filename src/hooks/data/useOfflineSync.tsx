"use client";

import { useEffect, useRef } from "react";
import { db } from "@/lib/api/client/db";
import { supabase } from "@/lib/api/client/supabase";

const SYNC_TABLES: Record<string, {
  supabaseTable: string;
  excludeFields?: string[];
}> = {
  notas:              { supabaseTable: "notas",              excludeFields: ["status", "deleted"] },
  ensayos:            { supabaseTable: "ensayos",            excludeFields: ["status", "deleted"] },
  secciones_cancion:  { supabaseTable: "secciones_cancion",  excludeFields: ["status", "deleted"] },
  capitulos:          { supabaseTable: "capitulos",          excludeFields: ["status", "deleted"] },
  tareas:             { supabaseTable: "tareas",             excludeFields: ["status", "deleted"] },
  eventos:            { supabaseTable: "eventos",            excludeFields: ["status", "deleted"] },
  rutinas:            { supabaseTable: "rutinas",            excludeFields: ["status", "deleted"] },
  ejercicios_rutina:  { supabaseTable: "ejercicios_rutina",  excludeFields: ["status", "deleted"] },
  recetas:            { supabaseTable: "recetas",            excludeFields: ["status", "deleted"] },
  ingredientes:       { supabaseTable: "ingredientes",       excludeFields: ["status", "deleted"] },
  compras:            { supabaseTable: "compras",            excludeFields: ["status", "deleted"] },
  ropa:               { supabaseTable: "ropa",               excludeFields: ["status", "deleted"] },
  ropa_outfits:       { supabaseTable: "ropa_outfits",       excludeFields: ["status", "deleted"] },
  diario_fotos:       { supabaseTable: "diario_fotos",       excludeFields: ["status", "deleted"] },
  dibujos:            { supabaseTable: "dibujos",            excludeFields: ["status", "deleted"] },
  personajes:         { supabaseTable: "personajes",         excludeFields: ["status", "deleted"] },
  criaturas:          { supabaseTable: "criaturas",          excludeFields: ["status", "deleted"] },
  criatura_variantes: { supabaseTable: "criatura_variantes", excludeFields: ["status", "deleted"] },
  items:              { supabaseTable: "items",              excludeFields: ["status", "deleted"] },
  reinos:             { supabaseTable: "reinos",             excludeFields: ["status", "deleted"] },
  relaciones:         { supabaseTable: "relaciones",         excludeFields: ["status", "deleted"] },
};

const MAX_RETRIES    = 3;
const SYNC_DEBOUNCE_MS = 500;

// ─── Callbacks globales ───────────────────────────────────────────────────────
type SyncDoneCallback = () => void;
const syncDoneCallbacks = new Set<SyncDoneCallback>();

export function onSyncDone(cb: SyncDoneCallback): () => void {
  syncDoneCallbacks.add(cb);
  return () => syncDoneCallbacks.delete(cb);
}

function notifySyncDone() {
  for (const cb of syncDoneCallbacks) {
    try { cb(); } catch {}
  }
}

// ─── Verificación real de conectividad ───────────────────────────────────────
export async function isReallyOnline(): Promise<boolean> {
  if (!navigator.onLine) return false;
  return new Promise<boolean>((resolve) => {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => { controller.abort(); resolve(false); }, 4_000);

    fetch("https://supabase.com/favicon.ico", {
      method: "HEAD",
      mode:   "no-cors",
      cache:  "no-store",
      signal: controller.signal,
    })
      .then(() => { clearTimeout(timeoutId); resolve(true); })
      .catch((e) => {
        clearTimeout(timeoutId);
        resolve(!(e?.name === "AbortError" || e instanceof TypeError));
      });
  });
}

function cleanPayload(payload: any, exclude: string[] = []): any {
  const clean = { ...payload };
  for (const field of exclude) delete clean[field];
  return clean;
}

export async function dexiePut(table: string, data: any): Promise<void> {
  try { if (db) await (db as any)[table]?.put(data); }
  catch (e) { console.warn(`[Dexie] put failed on '${table}':`, e); }
}

export async function dexieUpdate(table: string, id: string | number, data: any): Promise<void> {
  try { if (db) await (db as any)[table]?.update(id, data); }
  catch (e) { console.warn(`[Dexie] update failed on '${table}':`, e); }
}

export async function dexieDelete(table: string, id: string | number): Promise<void> {
  try { if (db) await (db as any)[table]?.delete(id); }
  catch (e) { console.warn(`[Dexie] delete failed on '${table}':`, e); }
}

// ─── Estado global del sync (singleton) ──────────────────────────────────────
let globalSyncPromise: Promise<void> | null = null;
let lastSyncTime   = 0;
// FIX #1: flag para coordinar el re-run sin crear un sync paralelo.
// El problema era: finally ponía globalSyncPromise=null, y si el setTimeout
// del re-run ya había ejecutado (microtask timing), entraba un segundo sync
// mientras el primero todavía estaba en su finally. Con el flag, el re-run
// solo ocurre después del finally, de forma controlada.
let pendingRerun = false;

export async function runSync(): Promise<void> {
  if (globalSyncPromise) return globalSyncPromise;

  const now = Date.now();
  if (now - lastSyncTime < SYNC_DEBOUNCE_MS) return;

  const online = await isReallyOnline();
  if (!online) return;

  lastSyncTime = Date.now();

  globalSyncPromise = (async () => {
    try {
      const queue = await db.offline_queue.orderBy("timestamp").toArray();

      // FIX #2: notificar siempre al terminar, incluso con cola vacía.
      // Sin esto, al reconectar sin ops pendientes, los hooks nunca reciben
      // la señal de revalidación y los datos quedan stale indefinidamente.
      if (queue.length === 0) {
        notifySyncDone();
        return;
      }

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
            ({ error } = await supabase.from(config.supabaseTable).delete().eq("id", op.recordId));
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

      notifySyncDone();

      // Si se encolaron ops nuevas durante este loop, marcamos para re-run
      const remaining = await db.offline_queue.count();
      if (remaining > 0) pendingRerun = true;

    } finally {
      // FIX #1 (cont.): primero null, luego re-run. El orden importa:
      // si pusieramos el setTimeout antes del null, runSync() encontraría
      // globalSyncPromise todavía seteado y descartaría el re-run.
      globalSyncPromise = null;

      if (pendingRerun) {
        pendingRerun = false;
        // Esperamos debounce+100ms para asegurar que pasamos el guard de lastSyncTime
        setTimeout(() => runSync(), SYNC_DEBOUNCE_MS + 100);
      }
    }
  })();

  return globalSyncPromise;
}

export function useOfflineSync() {
  const debounceRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  // FIX #3: ref estable para el event listener.
  // Si triggerSync fuera una función definida en el cuerpo del hook y se pasara
  // directamente a addEventListener/removeEventListener, podría haber mismatch
  // de referencias. El wrapper estable garantiza que add/remove usan la misma fn.
  const triggerSyncRef = useRef<() => void>(() => {});

  useEffect(() => {
    triggerSyncRef.current = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => { runSync(); }, 500);
    };

    const handleOnline = () => triggerSyncRef.current();

    runSync();
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { syncAll: runSync };
}

// FIX #4: enqueueOperation con try/catch explícito.
// Antes si Dexie fallaba (quota, db bloqueada), el error se tragaba silenciosamente
// y la operación quedaba perdida: en Dexie sin el nuevo dato, en la queue sin
// la op, pero el estado React ya se había actualizado. Ahora propagamos el error
// para que el caller pueda rollback o mostrar feedback al usuario.
export async function enqueueOperation(
  table: string,
  operation: "upsert" | "update" | "delete",
  recordId: string,
  payload?: any,
): Promise<void> {
  try {
    await db.offline_queue.add({
      table,
      operation,
      recordId,
      payload:   payload ?? {},
      timestamp: Date.now(),
      retries:   0,
    });
    console.log(`[Queue] Encolado: ${operation} en ${table}/${recordId}`);
  } catch (e) {
    console.error(`[Queue] Error al encolar ${operation} en ${table}/${recordId}:`, e);
    throw e;
  }
}

export async function getPendingCount(): Promise<number> {
  return await db.offline_queue.count();
}