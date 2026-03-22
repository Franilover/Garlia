import { useState, useCallback } from 'react';
import { useIsAdmin } from '@/hooks/auth/useIsAdmin';

interface UseAdminItemOptions<T> {
  plantilla: T;
}

export function useAdminItem<T extends Record<string, any>>(
  setDatos: (fn: (prev: T[]) => T[]) => void,
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

  
  const handleDeleted = useCallback((id: any) => {
    setDatos(prev => prev.filter(c => c.id !== id));
    setSelected(null);
    setIsCreating(false);
  }, [setDatos]);

  return { selected, isCreating, isAdmin, handleUpdate, handleSelect, handleAddNew, handleClose, handleDeleted };
}