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
      .catch(() => {
        // BUG A FIX: cualquier error en el fetch significa sin conexión.
        // Antes se resolvía true para errores distintos de AbortError/TypeError
        // (ej. DOMException por CORS), causando sync en falso con error de red.
        clearTimeout(timeoutId);
        resolve(false);
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

  // NEW-1: reservar el slot ANTES del await para evitar la race condition
  // donde dos llamadas simultáneas pasan el guard de globalSyncPromise=null
  // antes de que la primera asigne la promesa. El check de online va dentro.
  lastSyncTime = Date.now();

  globalSyncPromise = (async () => {
    const online = await isReallyOnline();
    if (!online) return;
    try {
      const queue = await db.offline_queue.orderBy("timestamp").toArray();

      // FIX #2: notificar siempre al terminar, incluso con cola vacía.
      // Sin esto, al reconectar sin ops pendientes, los hooks nunca reciben
      // la señal de revalidación y los datos quedan stale indefinidamente.
      if (queue.length === 0) {
        // BUG B FIX: resetear pendingRerun aquí también para evitar re-runs
        // infinitos cuando la cola ya estaba vacía desde el inicio.
        pendingRerun = false;
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
            const payload = cleanPayload(op.payload, config.excludeFields);
            // NEW-3: guardia — no upsert con payload vacío (perdería datos en el servidor)
            if (!payload || Object.keys(payload).length === 0) {
              console.warn(`[Sync] ⚠ Payload vacío para upsert en ${op.table}/${op.recordId}, descartando`);
              await db.offline_queue.delete(op.id!);
              continue;
            }
            ({ error } = await supabase.from(config.supabaseTable).upsert(payload));
          } else if (op.operation === "update") {
            const payload = cleanPayload(op.payload, config.excludeFields);
            if (!payload || Object.keys(payload).length === 0) {
              console.warn(`[Sync] ⚠ Payload vacío para update en ${op.table}/${op.recordId}, descartando`);
              await db.offline_queue.delete(op.id!);
              continue;
            }
            ({ error } = await supabase
              .from(config.supabaseTable)
              .update(payload)
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
          // NEW-4: distinguir errores permanentes (4xx de Supabase) de transitorios (red).
          // Un 409 de constraint o un 400 de validación nunca se va a resolver reintentando;
          // descartarlo inmediatamente en vez de consumir MAX_RETRIES y bloquear la cola.
          const statusCode = err?.code ? parseInt(err.code, 10) : null;
          const isPermanentError = (
            (statusCode !== null && statusCode >= 400 && statusCode < 500) ||
            err?.message?.includes("violates") ||
            err?.message?.includes("duplicate") ||
            err?.message?.includes("invalid input")
          );
          const retries = (op.retries ?? 0) + 1;
          if (isPermanentError || retries >= MAX_RETRIES) {
            const reason = isPermanentError ? "error permanente" : `${MAX_RETRIES} intentos`;
            console.warn(`[Sync] ✗ Descartando ${op.table}/${op.recordId} por ${reason}:`, err?.message);
            await db.offline_queue.delete(op.id!);
          } else {
            await db.offline_queue.update(op.id!, { retries });
          }
        }
      }

      // NEW-5: notificar aunque hayan quedado ops con errores — los hooks
      // deben revalidar igualmente para mostrar el estado actualizado.
      // El remaining check determina si hay que re-intentar pronto.
      const remaining = await db.offline_queue.count();
      if (remaining > 0) pendingRerun = true;
      notifySyncDone();

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

  const syncPromise = globalSyncPromise;
  return syncPromise ?? Promise.resolve();
}

export function useOfflineSync() {
  const debounceRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  // FIX #3: ref estable para el event listener.
  // Si triggerSync fuera una función definida en el cuerpo del hook y se pasara
  // directamente a addEventListener/removeEventListener, podría haber mismatch
  // de referencias. El wrapper estable garantiza que add/remove usan la misma fn.
  const triggerSyncRef = useRef<() => void>(() => {});

  useEffect(() => {
    // BUG D FIX: el setTimeout de 500ms aquí era redundante con SYNC_DEBOUNCE_MS
    // dentro de runSync, causando ~1000ms de delay total en eventos online.
    // El debounce del hook se elimina; runSync ya tiene su propio guard.
    triggerSyncRef.current = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => { runSync(); }, 100);
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
    // BUG C FIX: intentar sync inmediatamente después de encolar.
    // Antes la op quedaba en la queue hasta el próximo evento online/mount,
    // aunque el usuario estuviera conectado en ese momento.
    runSync().catch(() => {});
  } catch (e) {
    console.error(`[Queue] Error al encolar ${operation} en ${table}/${recordId}:`, e);
    throw e;
  }
}

export async function getPendingCount(): Promise<number> {
  try {
    return await db.offline_queue.count();
  } catch {
    return 0;
  }
}