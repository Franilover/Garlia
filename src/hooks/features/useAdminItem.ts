// /hooks/features/useAdminItem.ts
import { useState, useCallback } from 'react';
import { useIsAdmin } from '@/hooks/auth/useIsAdmin';

interface UseAdminItemOptions<T> {
  plantilla: T;
}

export function useAdminItem<T extends { id?: string }>(
  setDatos: (fn: (prev: T[]) => T[]) => void,  // 👈 solo 2 parámetros
  { plantilla }: UseAdminItemOptions<T>
) {
  const isAdmin = useIsAdmin();
  const [selected, setSelected] = useState<T | null>(null);
  const [isCreating, setIsCreating] = useState(false);

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

  return { selected, isCreating, isAdmin, handleUpdate, handleSelect, handleAddNew, handleClose };
}