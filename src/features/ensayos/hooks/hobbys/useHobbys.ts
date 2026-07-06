"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface Hobby {
  id: string;
  nombre: string;
  icon: string;
  color: number;
  freq_dia: number;
  freq_sem: number;
  nota?: string;
  orden: number;
}

export interface Registro {
  id: string;
  hobby_id: string;
  semana: string;
  dias: boolean[];
}

async function getSupabase() {
  const { supabase } = await import("@/lib/api/client/supabase");
  return supabase;
}

const hobbysQueries = {
  async getAll(): Promise<Hobby[]> {
    const sb = await getSupabase();
    const { data, error } = await sb.from("hobbys").select("*").order("orden", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
  async add(hobby: Omit<Hobby, "id">): Promise<Hobby> {
    const sb = await getSupabase();
    const { data: { user } } = await sb.auth.getUser();
    const { data, error } = await sb.from("hobbys").insert({ ...hobby, user_id: user?.id }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, datos: Partial<Omit<Hobby, "id">>): Promise<Hobby> {
    const sb = await getSupabase();
    const { data, error } = await sb.from("hobbys").update(datos).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  async delete(id: string): Promise<void> {
    const sb = await getSupabase();
    const { error } = await sb.from("hobbys").delete().eq("id", id);
    if (error) throw error;
  },
};

const registrosQueries = {
  async getBySemana(semana: string): Promise<Registro[]> {
    const sb = await getSupabase();
    const { data, error } = await sb.from("hobbys_registros").select("*").eq("semana", semana);
    if (error) throw error;
    return data ?? [];
  },
  async upsert(hobbyId: string, semana: string, dias: boolean[]): Promise<void> {
    const sb = await getSupabase();
    const { data: { user } } = await sb.auth.getUser();
    const { error } = await sb.from("hobbys_registros").upsert(
      { hobby_id: hobbyId, semana, dias, user_id: user?.id },
      { onConflict: "hobby_id,semana" }
    );
    if (error) throw error;
  },
};

export function getSemanaKey(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
  );
  return `${now.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function getTodayIdx(): number {
  return (new Date().getDay() + 6) % 7;
}

/** Carga y CRUD de hobbys + sus registros semanales (tablas `hobbys`, `hobbys_registros`). */
export function useHobbys() {
  const [hobbys, setHobbys]       = useState<Hobby[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [cargando, setCargando]   = useState(true);
  const [guardando, setGuardando] = useState(false);

  const semana = useMemo(() => getSemanaKey(), []);
  const today  = getTodayIdx();

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [h, r] = await Promise.all([hobbysQueries.getAll(), registrosQueries.getBySemana(semana)]);
      setHobbys(h);
      setRegistros(r);
    } catch (err) {
      console.error("[useHobbys] cargar:", err);
    } finally {
      setCargando(false);
    }
  }, [semana]);

  useEffect(() => { void cargar(); }, [cargar]);

  const crearHobby = useCallback(async (datos: Omit<Hobby, "id">) => {
    setGuardando(true);
    try {
      const nuevo = await hobbysQueries.add(datos);
      setHobbys(prev => [...prev, nuevo]);
      return true;
    } catch (err) {
      console.error("[useHobbys] crear:", err);
      return false;
    } finally {
      setGuardando(false);
    }
  }, []);

  const editarHobby = useCallback(async (id: string, datos: Partial<Omit<Hobby, "id">>) => {
    try {
      const updated = await hobbysQueries.update(id, datos);
      setHobbys(prev => prev.map(h => h.id === id ? updated : h));
    } catch (err) {
      console.error("[useHobbys] editar:", err);
      void cargar();
    }
  }, [cargar]);

  const eliminarHobby = useCallback(async (id: string) => {
    setHobbys(prev => prev.filter(h => h.id !== id));
    try {
      await hobbysQueries.delete(id);
    } catch (err) {
      console.error("[useHobbys] eliminar:", err);
      void cargar();
    }
  }, [cargar]);

  const toggleDia = useCallback(async (hobbyId: string, diaIdx: number) => {
    setRegistros(prev => {
      const existing = prev.find(r => r.hobby_id === hobbyId && r.semana === semana);
      if (existing) {
        return prev.map(r =>
          r.hobby_id === hobbyId && r.semana === semana
            ? { ...r, dias: r.dias.map((v, i) => (i === diaIdx ? !v : v)) }
            : r
        );
      }
      const diasNuevos = Array(7).fill(false) as boolean[];
      diasNuevos[diaIdx] = true;
      return [...prev, { id: "tmp", hobby_id: hobbyId, semana, dias: diasNuevos }];
    });

    try {
      const current = registros.find(r => r.hobby_id === hobbyId && r.semana === semana);
      const diasActuales = current?.dias ?? Array(7).fill(false);
      const nuevosDias = diasActuales.map((v, i) => (i === diaIdx ? !v : v));
      await registrosQueries.upsert(hobbyId, semana, nuevosDias);
    } catch (err) {
      console.error("[useHobbys] toggle día:", err);
      void cargar();
    }
  }, [registros, semana, cargar]);

  return {
    hobbys, registros, cargando, guardando, semana, today,
    crearHobby, editarHobby, eliminarHobby, toggleDia,
  };
}
