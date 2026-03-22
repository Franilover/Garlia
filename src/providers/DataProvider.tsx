"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { db } from "@/lib/api/client/db";

const CACHE_KEY = "app_data_cache";

interface DataContextValue {
  cache: Record<string, any>;
  updateCache: (tabla: string, data: any) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [cache, setCache] = useState<Record<string, any>>({});

  
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadCache = async () => {
      
      try {
        if (db) {
          const stored = await (db as any).table?.("app_cache")?.get(CACHE_KEY);
          if (stored?.data) {
            setCache(stored.data);
            return;
          }
        }
      } catch {
        
      }

      
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

      
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("fran_nexus_cache", JSON.stringify(newCache));
        } catch {
          
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