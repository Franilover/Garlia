"use client";
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// 1. Creamos el contexto con un valor inicial nulo
const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  const [cache, setCache] = useState({
    personajes: null,
    criaturas: null,
    items: null
  });

  // 2. Persistencia: Recuperar datos del navegador al cargar (Solo en el cliente)
  useEffect(() => {
    try {
      const savedCache = localStorage.getItem('fran_nexus_cache');
      if (savedCache) {
        setCache(JSON.parse(savedCache));
      }
    } catch (e) {
      console.warn("No se pudo cargar la caché de localStorage");
    }
  }, []);

  // 3. Función para actualizar y persistir
  const updateCache = useCallback((tabla, data) => {
    setCache(prev => {
      const newCache = { ...prev, [tabla]: data };
      // Guardamos en localStorage para que sobreviva a F5
      if (typeof window !== 'undefined') {
        localStorage.setItem('fran_nexus_cache', JSON.stringify(newCache));
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

// 4. Hook con protección contra "undefined" (Evita el error del build)
export const useDataCache = () => {
  const context = useContext(DataContext);
  
  // Si el componente está fuera del Provider o en fase de build/prerender:
  if (!context) {
    return { 
      cache: { personajes: null, criaturas: null, items: null }, 
      updateCache: () => {} 
    };
  }
  
  return context;
};