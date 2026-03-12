"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { db } from "@/lib/api/client/db";

// Clave usada en Dexie para el caché general (tabla notas u otras sin tabla propia)
// No confundir con reproductor_handles — ese es solo para el reproductor.
const CACHE_KEY = "app_data_cache";

interface DataContextValue {
  cache: Record<string, any>;
  updateCache: (tabla: string, data: any) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [cache, setCache] = useState<Record<string, any>>({});

  // Al montar, intenta recuperar desde Dexie primero, luego localStorage como fallback
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadCache = async () => {
      // Intento 1: Dexie (más capacidad, más robusto)
      try {
        if (db) {
          const stored = await (db as any).table?.("app_cache")?.get(CACHE_KEY);
          if (stored?.data) {
            setCache(stored.data);
            return;
          }
        }
      } catch {
        // Dexie no tiene tabla app_cache (versiones anteriores), usar localStorage
      }

      // Intento 2: localStorage como fallback
      try {
        const saved = localStorage.getItem("fran_nexus_cache");
        if (saved) setCache(JSON.parse(saved));
      } catch {
        console.warn("[DataProvider] No se pudo cargar la caché");
      }
    };

    loadCache();
  }, []);

  const updateCache = useCallback((tabla: string, data: any) => {
    setCache(prev => {
      const newCache = { ...prev, [tabla]: data };

      // Persistir en localStorage (siempre funciona como respaldo)
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("fran_nexus_cache", JSON.stringify(newCache));
        } catch {
          // localStorage lleno — no es crítico, solo el caché en memoria funciona igual
        }
      }

      return newCache;
    });
  }, []);

  return (
    <DataContext.Provider value={{ cache, updateCache }}>
      {children}
    </DataContext.Provider>
  );
};

export const useDataCache = (): DataContextValue => {
  const context = useContext(DataContext);
  if (!context) {
    return {
      cache: {},
      updateCache: () => {},
    };
  }
  return context;
};