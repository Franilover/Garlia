"use client";
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export const useRecursos = (tabla) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRecursos = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from(tabla)
        .select('*')
        .order('nombre', { ascending: true });

      if (fetchError) throw fetchError;
      setItems(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tabla]);

  useEffect(() => {
    fetchRecursos();
  }, [fetchRecursos]);

  // Esta función es la que pasaremos al onUpdate del DetalleMaestro
  const updateLocalItem = useCallback((updatedItem) => {
    setItems(currentItems => 
      currentItems.map(item => item.id === updatedItem.id ? updatedItem : item)
    );
  }, []);

  return { items, loading, error, refresh: fetchRecursos, updateLocalItem };
};