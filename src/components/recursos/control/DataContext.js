// context/DataContext.js
"use client";
import { createContext, useContext, useState, useCallback } from 'react';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [cache, setCache] = useState({
    personajes: null,
    criaturas: null,
    items: null
  });

  const updateCache = useCallback((tabla, data) => {
    setCache(prev => ({ ...prev, [tabla]: data }));
  }, []);

  return (
    <DataContext.Provider value={{ cache, updateCache }}>
      {children}
    </DataContext.Provider>
  );
};

export const useDataCache = () => useContext(DataContext);