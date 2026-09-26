import type { CriaturaFull } from '@/lib/types/queries';
import { criaturaFullQuery } from '@/lib/types/queries';

export const criaturasQueries = {
  getAll: async (opciones: { campo?: string; asc?: boolean } = {}): Promise<CriaturaFull[]> => {
    const { data, error } = await criaturaFullQuery()
      .order(opciones.campo || 'nombre', { ascending: opciones.asc ?? true });
    if (error) throw error;
    return data;
  },

  getById: async (id: string): Promise<CriaturaFull | null> => {
    const { data, error } = await criaturaFullQuery().eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  }
};