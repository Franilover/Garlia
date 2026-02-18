import { useState, useCallback, useEffect } from 'react';
import { supabase } from "@/lib/api/client/supabase";

interface UseAdminItemOptions<T> {
  plantilla: T; // objeto vacío con los campos por defecto
}

export function useAdminItem<T extends { id?: string }>(
  datos: T[],
  setDatos: (fn: (prev: T[]) => T[]) => void,
  { plantilla }: UseAdminItemOptions<T>
) {
  const [selected, setSelected] = useState<T | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAdmin(!!data.session);
    });
  }, []);

  const handleUpdate = useCallback((newData: T) => {
    if (isCreating) {
      setDatos(prev => [newData, ...prev]);
      setIsCreating(false);
    } else {
      setDatos(prev => prev.map(c => c.id === newData.id ? newData : c));
    }
    setSelected(newData);
  }, [isCreating, setDatos]);

  const handleSelect = useCallback((item: T) => {
    setIsCreating(false);
    setSelected(item);
  }, []);

  const handleAddNew = useCallback(() => {
    setIsCreating(true);
    setSelected(plantilla as T);
  }, [plantilla]);

  const handleClose = useCallback(() => {
    setSelected(null);
    setIsCreating(false);
  }, []);

  return {
    selected,
    isCreating,
    isAdmin,
    handleUpdate,
    handleSelect,
    handleAddNew,
    handleClose,
  };
}