"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/api/client/supabase";
import { useIsAdmin } from "@/hooks/auth/useIsAdmin";

export interface Relacion {
  id?: string;
  sus: string;
  son: string[];
  personaje: string;
}

export interface Variante {
  id?: number;
  tipo: string;
  descripcion?: string;
  descripcion_variante?: string;
  imagen_url?: string;
  criatura_id?: number;
}

export function useDetalleMaestro(
  data: any,
  tabla: string,                      // ← NUEVO: tabla explícita
  onUpdate?: (record: any) => void    // ← CAMBIO: recibe el registro guardado
) {
  const isAdmin = useIsAdmin();
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const [variantes, setVariantes] = useState<Variante[]>([]);
  const [varianteActiva, setVarianteActiva] = useState<Variante | null>(null);

  // Campos editables genéricos — se sincronizan desde `data`
  const [editFields, setEditFields] = useState<Record<string, any>>({});
  const [editCanciones, setEditCanciones] = useState<number[]>([]);
  const [editRelaciones, setEditRelaciones] = useState<Relacion[]>([]);

  const prevIdRef = useRef<number | string | null>(null);

  // ─── Helpers de lectura ────────────────────────────────────────────────────
  // El campo de texto largo varía según tabla
  const campoTexto = tabla === "personajes" ? "sobre" : "descripcion";

  // Nombre de display legible para el editNombre (alias de comodidad)
  const editNombre: string = editFields["nombre"] ?? "";
  const setEditNombre = (v: string) =>
    setEditFields((prev) => ({ ...prev, nombre: v }));

  const editDescripcion: string = editFields[campoTexto] ?? "";
  const setEditDescripcion = (v: string) =>
    setEditFields((prev) => ({ ...prev, [campoTexto]: v }));

  // ─── Sync desde data ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!data) return;
    if (prevIdRef.current === data.id) return;

    // Copia todos los campos del objeto data al estado editable
    setEditFields({ ...data });

    setEditRelaciones(data.relaciones || []);
    setVarianteActiva(null);

    const cancionesData = data.canciones || [];
    const idsIniciales = Array.isArray(cancionesData)
      ? cancionesData
          .map((c: any) => (typeof c === "object" ? c.id : c))
          .filter(Boolean)
      : [];
    setEditCanciones(idsIniciales);

    // Variantes solo para criaturas
    if (tabla === "criaturas" && data.id) {
      fetchVariantes(data.id);
    } else {
      setVariantes(data.variantes || []);
    }

    prevIdRef.current = data.id;
  }, [data, tabla]);

  const fetchVariantes = async (id: any) => {
    try {
      const { data: vars, error } = await supabase
        .from("criatura_variantes")
        .select("*")
        .eq("criatura_id", id);
      if (error) throw error;
      setVariantes(vars || []);
    } catch (err) {
      console.error("Error fetching variantes:", err);
    }
  };

  // ─── Guardar ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!editNombre.trim()) {
      alert("El nombre es obligatorio.");
      return false;
    }

    setSaving(true);
    try {
      // Construimos el payload con TODOS los campos editables
      // más los cambios de nombre y descripción.
      const payload: Record<string, any> = {
        ...editFields,
        nombre: editNombre,
        [campoTexto]: editDescripcion,
      };

      // Eliminamos campos que Supabase no acepta en insert/update
      delete payload.id;
      delete payload.canciones;   // relación separada
      delete payload.relaciones;  // relación separada
      delete payload.variantes;   // relación separada

      // Eliminamos el campo de texto que NO corresponde a esta tabla
      if (tabla === "personajes") {
        delete payload.descripcion;
      } else {
        delete payload.sobre;
      }

      let finalId = data?.id;

      if (!finalId) {
        // ── CREAR ──────────────────────────────────────────────────────────
        const { data: newRecord, error: insError } = await supabase
          .from(tabla)
          .insert([payload])
          .select()
          .single();
        if (insError) throw insError;
        finalId = newRecord.id;

        // Guardar variantes para criaturas recién creadas
        if (tabla === "criaturas" && variantes.length > 0) {
          const { error: varError } = await supabase
            .from("criatura_variantes")
            .insert(variantes.map((v) => ({ ...v, id: undefined, criatura_id: finalId })));
          if (varError) throw varError;
        }

        // Devolvemos el registro completo al caller
        if (onUpdate) onUpdate({ ...newRecord });
      } else {
        // ── ACTUALIZAR ─────────────────────────────────────────────────────
        const { data: updRecord, error: updError } = await supabase
          .from(tabla)
          .update(payload)
          .eq("id", finalId)
          .select()
          .single();
        if (updError) throw updError;

        // Upsert variantes para criaturas
        if (tabla === "criaturas" && variantes.length > 0) {
          const { error: varError } = await supabase
            .from("criatura_variantes")
            .upsert(
              variantes.map((v) => ({ ...v, criatura_id: finalId })),
              { onConflict: "id" }
            );
          if (varError) throw varError;
        }

        if (onUpdate) onUpdate({ ...updRecord });
      }

      setEditMode(false);
      return true;
    } catch (err: any) {
      console.error("Error al guardar:", err);
      alert("Error: " + err.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    isAdmin,
    editMode, setEditMode,
    saving,
    handleSave,
    variantes, setVariantes,
    varianteActiva, setVarianteActiva,
    editFields, setEditFields,        // acceso genérico a todos los campos
    editNombre, setEditNombre,        // alias de comodidad
    editDescripcion, setEditDescripcion,
    editCanciones, setEditCanciones,
    editRelaciones, setEditRelaciones,
  };
}