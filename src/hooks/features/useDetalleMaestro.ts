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
  tabla: string,                      
  onUpdate?: (record: any) => void    
) {
  const isAdmin = useIsAdmin();
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const [variantes, setVariantes] = useState<Variante[]>([]);
  const [varianteActiva, setVarianteActiva] = useState<Variante | null>(null);

  
  const [editFields, setEditFields] = useState<Record<string, any>>({});
  const [editCanciones, setEditCanciones] = useState<number[]>([]);
  const [editRelaciones, setEditRelaciones] = useState<Relacion[]>([]);

  const prevIdRef = useRef<number | string | null>(null);

  
  
  const campoTexto = tabla === "personajes" ? "sobre" : "descripcion";

  
  const editNombre: string = editFields["nombre"] ?? "";
  const setEditNombre = (v: string) =>
    setEditFields((prev) => ({ ...prev, nombre: v }));

  const editDescripcion: string = editFields[campoTexto] ?? "";
  const setEditDescripcion = (v: string) =>
    setEditFields((prev) => ({ ...prev, [campoTexto]: v }));

  
  useEffect(() => {
    if (!data) return;
    if (prevIdRef.current === data.id) return;

    
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

  
  const handleSave = async () => {
    if (!editNombre.trim()) {
      alert("El nombre es obligatorio.");
      return false;
    }

    setSaving(true);
    try {
      
      
      const payload: Record<string, any> = {
        ...editFields,
        nombre: editNombre,
        [campoTexto]: editDescripcion,
      };

      
      delete payload.id;
      delete payload.canciones;   
      delete payload.relaciones;  
      delete payload.variantes;   

      
      if (tabla === "personajes") {
        delete payload.descripcion;
      } else {
        delete payload.sobre;
      }

      let finalId = data?.id;

      if (!finalId) {
        
        const { data: newRecord, error: insError } = await supabase
          .from(tabla)
          .insert([payload])
          .select()
          .single();
        if (insError) throw insError;
        finalId = newRecord.id;

        
        if (tabla === "criaturas" && variantes.length > 0) {
          const { error: varError } = await supabase
            .from("criatura_variantes")
            .insert(variantes.map((v) => ({ ...v, id: undefined, criatura_id: finalId })));
          if (varError) throw varError;
        }

        
        if (onUpdate) onUpdate({ ...newRecord });
      } else {
        
        const { data: updRecord, error: updError } = await supabase
          .from(tabla)
          .update(payload)
          .eq("id", finalId)
          .select()
          .single();
        if (updError) throw updError;

        
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

  
  const handleDelete = async (onDeleted?: () => void) => {
    if (!data?.id) return;
    const confirmar = window.confirm(`¿Borrar "${editNombre}" de forma permanente? Esta acción no se puede deshacer.`);
    if (!confirmar) return;

    setSaving(true);
    try {
      
      if (tabla === "criaturas") {
        await supabase.from("criatura_variantes").delete().eq("criatura_id", data.id);
      }

      const { error } = await supabase.from(tabla).delete().eq("id", data.id);
      if (error) throw error;

      if (onDeleted) onDeleted();
    } catch (err: any) {
      console.error("Error al borrar:", err);
      alert("Error al borrar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return {
    isAdmin,
    editMode, setEditMode,
    saving,
    handleSave,
    handleDelete,
    variantes, setVariantes,
    varianteActiva, setVarianteActiva,
    editFields, setEditFields,
    editNombre, setEditNombre,
    editDescripcion, setEditDescripcion,
    editCanciones, setEditCanciones,
    editRelaciones, setEditRelaciones,
  };
}