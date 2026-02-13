import { useEffect } from "react";
import { db } from "../lib/db";
import { supabase } from "../lib/supabase"; // Tu cliente de Supabase

export function useOfflineSync() {
  useEffect(() => {
    const syncData = async () => {
      if (!navigator.onLine) return;

      const pending = await db.notas.where("status").equals("pending").toArray();
      
      for (const nota of pending) {
        const { error } = await supabase
          .from("tu_tabla_de_notas")
          .upsert({ 
            id: nota.id, 
            contenido: nota.contenido, 
            updated_at: nota.updated_at 
          });

        if (!error) {
          await db.notas.update(nota.id, { status: "synced" });
        }
      }
    };

    window.addEventListener("online", syncData);
    return () => window.removeEventListener("online", syncData);
  }, []);
}