import { useState, useEffect } from "react";
import { supabase } from "@/lib/api/client/supabase";

export type EntidadTipo = "personaje" | "criatura" | "item";

export function useEntidades(tipo: EntidadTipo) {
  const tabla = tipo === "personaje" ? "personajes" : tipo === "criatura" ? "criaturas" : "items";
  const [items,   setItems]   = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    supabase.from(tabla).select("id, nombre").order("nombre").then(({ data }) => {
      setItems((data ?? []) as { id: string; nombre: string }[]);
      setLoading(false);
    });
  }, [tabla]);

  return { items, loading };
}