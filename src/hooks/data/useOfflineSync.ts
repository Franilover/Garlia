"use client";

import { useEffect } from "react";
import { db } from "@/lib/api/client/db";
import { supabase } from "@/lib/api/client/supabase";

/**
 * Definimos la interfaz de la nota para que TypeScript 
 * sepa qué campos tiene el objeto que viene de Dexie.
 */
interface Nota {
  id: string | number;
  contenido: string;
  updated_at: string;
  status: 'pending' | 'synced';
}

export function useOfflineSync() {
  useEffect(() => {
    const syncData = async () => {
      
      if (!navigator.onLine) return;

      console.log("Iniciando sincronización con Supabase...");

      try {
        /** * Forzamos el tipo (casting) para que TypeScript no lance el error 2339.
         * Le decimos que 'db' tiene una tabla llamada 'notas'.
         */
        const notasTable = (db as any).notas;

        if (!notasTable) {
          console.warn("La tabla 'notas' no está definida en Dexie.");
          return;
        }

        const pending: Nota[] = await notasTable
          .where("status")
          .equals("pending")
          .toArray();
        
        for (const nota of pending) {
          const { error } = await supabase
            .from("personal") 
            .upsert({ 
              id: nota.id, 
              contenido: nota.contenido, 
              updated_at: nota.updated_at 
            });

          if (!error) {
            
            await notasTable.update(nota.id, { status: "synced" });
            console.log(`Nota ${nota.id} sincronizada con éxito.`);
          } else {
            console.error("Error al subir a Supabase:", error.message);
          }
        }
      } catch (err) {
        console.error("Error crítico en useOfflineSync:", err);
      }
    };

    
    window.addEventListener("online", syncData);
    
    
    syncData();

    return () => window.removeEventListener("online", syncData);
  }, []);
}