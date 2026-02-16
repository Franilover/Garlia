"use client";
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  const [cache, setCache] = useState({
    personajes: null,
    criaturas: null,
    items: null
  });

  // Persistencia: Recuperar datos del navegador al cargar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedCache = localStorage.getItem('fran_nexus_cache');
        if (savedCache) {
          setCache(JSON.parse(savedCache));
        }
      } catch (e) {
        console.warn("No se pudo cargar la caché de localStorage");
      }
    }
  }, []);

  // Función para actualizar y persistir
  const updateCache = useCallback((tabla, data) => {
    setCache(prev => {
      const newCache = { ...prev, [tabla]: data };
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

export const useDataCache = () => {
  const context = useContext(DataContext);
  
  if (!context) {
    return { 
      cache: { personajes: null, criaturas: null, items: null }, 
      updateCache: () => {} 
    };
  }
  
  return context;
};