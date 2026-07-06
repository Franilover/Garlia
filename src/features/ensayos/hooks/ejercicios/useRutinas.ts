"use client";
import { useCallback, useEffect, useState } from "react";

import {
  rutinasQueries,
  ejerciciosQueries,
} from "@/lib/api/queries/personal/ejercicios";

export interface Ejercicio {
  id: string;
  nombre: string;
  series: number;
  reps: string;
  descanso: number;
  musculo: string;
  notas?: string;
  orden?: number;
}

export interface Rutina {
  id: string;
  nombre: string;
  descripcion: string;
  tag: string;
  ejercicios: Ejercicio[];
}

/** Carga y CRUD de las rutinas de ejercicio (tablas `rutinas` + `ejercicios`). */
export function useRutinas() {
  const [rutinas, setRutinas] = useState<Rutina[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const fetchRutinas = useCallback(async () => {
    setCargando(true);
    try {
      const { supabase } = await import("@/lib/api/client/supabase");
      const { data, error } = await supabase
        .from("rutinas")
        .select("*, ejercicios(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRutinas(
        (data ?? []).map((r: any) => ({
          ...r,
          ejercicios: (r.ejercicios ?? []).sort(
            (a: any, b: any) => (a.orden ?? 0) - (b.orden ?? 0),
          ),
        })),
      );
    } catch (err) {
      console.error("[useRutinas] fetch:", err);
      setRutinas([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void fetchRutinas();
  }, [fetchRutinas]);

  const crearRutina = useCallback(async (
    datos: { nombre: string; descripcion: string; tag: string },
    ejercicios: Omit<Ejercicio, "id">[],
  ) => {
    if (!datos.nombre.trim() || ejercicios.length === 0) return false;
    setGuardando(true);
    try {
      const rutinaCreada = await rutinasQueries.add(datos);
      await ejerciciosQueries.reemplazar(
        rutinaCreada.id,
        ejercicios.map((e, i) => ({ ...e, orden: i })),
      );
      await fetchRutinas();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    } finally {
      setGuardando(false);
    }
  }, [fetchRutinas]);

  const eliminarRutina = useCallback(async (id: string) => {
    try {
      await rutinasQueries.delete(id);
      await fetchRutinas();
    } catch (err) {
      console.error(err);
    }
  }, [fetchRutinas]);

  return { rutinas, cargando, guardando, refetch: fetchRutinas, crearRutina, eliminarRutina };
}
