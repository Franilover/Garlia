"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/api/client/supabase";
import { useDataCache } from "@/components/providers/DataProvider";

// Importaciones de queries
import { personajesQueries } from "@/lib/api/queries/wiki/personajes";
import { criaturasQueries } from "@/lib/api/queries/wiki/criaturas";
import { itemsQueries } from "@/lib/api/queries/wiki/items"; 
import { librosQueries } from "@/lib/api/queries/wiki/libros";
import { recetasQueries } from "@/lib/api/queries/personal/cocina/recetas";
import { tareasQueries } from "@/lib/api/queries/personal/tareas";
import { eventosQueries } from "@/lib/api/queries/personal/eventos";
import { ingredientesQueries } from "@/lib/api/queries/personal/cocina/ingredientes";
import { ropaQueries } from "@/lib/api/queries/personal/ropa";
import { cancionesQueries } from "@/lib/api/queries/wiki/canciones"; 

const QUERIES_MAP: Record<string, any> = {
  "personajes": personajesQueries,
  "criaturas": criaturasQueries, 
  "items": itemsQueries,
  "libros": librosQueries,
  "recetas": recetasQueries,
  "tareas": tareasQueries,
  "eventos": eventosQueries,
  "ingredientes": ingredientesQueries,
  "ropa": ropaQueries,          
  "ropa_outfits": ropaQueries,
  "canciones": cancionesQueries 
};

interface UseSupabaseOptions {
  select?: string;
  order?: { campo: string; asc?: boolean; };
  isAdmin?: boolean; 
  [key: string]: any;
}

export function useSupabaseData<T = any>(tabla: string, opciones: UseSupabaseOptions = {}) {
  const { cache, updateCache } = useDataCache();
  
  // Inicializamos con caché para carga instantánea
  const [data, setData] = useState<T[]>(cache[tabla] || []);
  const [loading, setLoading] = useState(!cache[tabla]); 
  const [error, setError] = useState<string | null>(null);
  
  const isMounted = useRef(true);
  const retryCount = useRef(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Memorizamos las opciones para evitar re-renders infinitos
  const optionsString = JSON.stringify(opciones);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!isMounted.current) return;
    
    // Mostramos loading solo si no hay datos o si se pide explícitamente
    if (data.length === 0 || forceRefresh) {
      setLoading(true);
    }
    setError(null);
    
    try {
      const opt = JSON.parse(optionsString);
      let res: any;
      
      if (QUERIES_MAP[tabla]) {
        // ✅ LÓGICA ESPECIAL PARA CANCIONES: Maneja array directo e isAdmin
        if (tabla === "canciones") {
          res = await QUERIES_MAP[tabla].getAll({ isAdmin: opt.isAdmin });
        } else {
          res = await QUERIES_MAP[tabla].getAll({ ...opt, tabla });
        }
      } else {
        // Fallback genérico de Supabase
        let query = supabase.from(tabla).select(opt.select || "*");
        if (opt.order) {
          query = query.order(opt.order.campo, { ascending: opt.order.asc ?? true });
        }
        res = await query;
      }

      // ✅ NORMALIZACIÓN: Acepta tanto [data] como {data, error}
      const finalData = Array.isArray(res) ? res : (res?.data || []);
      const errorFetch = res?.error || null;

      if (errorFetch) throw errorFetch;

      if (isMounted.current) {
        setData(finalData as T[]);
        updateCache(tabla, finalData);
        retryCount.current = 0;
      }
    } catch (err: any) {
      // ✅ RESILIENCIA: Reintento automático en errores de red
      const isNetworkError = err.message?.includes("fetch") || err.message?.includes("NetworkError");
      if (isNetworkError && retryCount.current < 3) {
        retryCount.current++;
        console.warn(`Reintento ${retryCount.current} para ${tabla}...`);
        setTimeout(() => fetchData(true), 1000 * retryCount.current);
        return;
      }
      if (isMounted.current) setError(err.message);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [tabla, updateCache, optionsString]);

  // --- MÉTODOS CRUD ---
  const addRow = useCallback(async (newData: any) => {
    try {
      const res = QUERIES_MAP[tabla]?.create 
        ? await QUERIES_MAP[tabla].create(newData)
        : await supabase.from(tabla).insert([newData]).select().single();
      return { data: res?.data || res, error: res?.error || null };
    } catch (err: any) { return { data: null, error: err.message }; }
  }, [tabla]);

  const updateRow = useCallback(async (id: string | number, updates: any) => {
    try {
      const res = QUERIES_MAP[tabla]?.update
        ? await QUERIES_MAP[tabla].update(id, updates)
        : await supabase.from(tabla).update(updates).eq("id", id).select().single();
      return { data: res?.data || res, error: res?.error || null };
    } catch (err: any) { return { data: null, error: err.message }; }
  }, [tabla]);

  const deleteRow = useCallback(async (id: string | number) => {
    try {
      const res = QUERIES_MAP[tabla]?.delete
        ? await QUERIES_MAP[tabla].delete(id)
        : await supabase.from(tabla).delete().eq("id", id);
      return { error: res?.error || null };
    } catch (err: any) { return { error: err.message }; }
  }, [tabla]);

  // --- REALTIME Y POLLING ---
  useEffect(() => {
    isMounted.current = true;
    fetchData(); // Carga inicial

    const channel = supabase.channel(`rt-${tabla}-${Math.random().toString(36).slice(2, 7)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: tabla }, () => fetchData(true))
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" && !pollingIntervalRef.current) {
          // Si el realtime falla, activamos polling cada 20s
          pollingIntervalRef.current = setInterval(() => fetchData(true), 20000);
        }
      });

    return () => {
      isMounted.current = false;
      supabase.removeChannel(channel);
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [tabla, fetchData]);

  // ✅ RETORNO COMPLETO (Incluye refetch y mutate para compatibilidad)
  return { 
    data: data || [], 
    setData, 
    loading, 
    error, 
    refetch: () => fetchData(true),
    mutate: () => fetchData(true), 
    addRow, 
    updateRow, 
    deleteRow 
  };
}