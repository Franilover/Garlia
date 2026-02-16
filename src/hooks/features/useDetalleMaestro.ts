"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/api/client/supabase";

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

export function useDetalleMaestro(data: any, onUpdate?: () => Promise<void>) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [variantes, setVariantes] = useState<Variante[]>([]);
  const [varianteActiva, setVarianteActiva] = useState<Variante | null>(null);
  
  const [editNombre, setEditNombre] = useState("");
  const [editDescripcion, setEditDescripcion] = useState("");
  const [editCanciones, setEditCanciones] = useState<number[]>([]); 
  const [editRelaciones, setEditRelaciones] = useState<Relacion[]>([]);

  const prevIdRef = useRef<number | string | null>(null);

  // Verificación de Admin
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setIsAdmin(true);
    };
    checkUser();
  }, []);

  // Sincronización de estados (Carga inicial)
  useEffect(() => {
    if (!data) return;

    // Si es un ID nuevo o estamos reseteando
    if (prevIdRef.current !== data.id) {
      setEditNombre(data.nombre || "");
      setEditDescripcion(data.sobre || data.descripcion || "");
      setEditRelaciones(data.relaciones || []);
      
      // Procesar canciones
      const cancionesData = data.canciones || [];
      const idsIniciales = Array.isArray(cancionesData) 
        ? cancionesData.map(c => (typeof c === "object" ? c.id : c)).filter(Boolean)
        : [];
      setEditCanciones(idsIniciales);

      // Cargar Variantes
      if (data.id && !data.sobre) {
        fetchVariantes(data.id);
      } else {
        setVariantes(data.variantes || []);
      }
      
      prevIdRef.current = data.id;
    }
  }, [data]);

  const fetchVariantes = async (id: any) => {
    const { data: vars } = await supabase
      .from("criatura_variantes")
      .select("*")
      .eq("criatura_id", id);
    if (vars) setVariantes(vars);
  };

  // --- LÓGICA DE GUARDADO MEJORADA ---
  const handleSave = async () => {
    // 1. Validaciones básicas
    if (!editNombre.trim()) {
      alert("El nombre es obligatorio.");
      return;
    }

    setSaving(true);
    try {
      const esPersonaje = data && ("sobre" in data || data.isPersonaje); 
      const tabla = esPersonaje ? "personajes" : "criaturas";
      const campoTexto = esPersonaje ? "sobre" : "descripcion";
      
      let finalId = data?.id;

      // 2. OPERACIÓN PRINCIPAL (Insert o Update)
      const payload = {
        nombre: editNombre,
        [campoTexto]: editDescripcion
      };

      if (!finalId) {
        // ES NUEVO: INSERT
        const { data: newRecord, error: insError } = await supabase
          .from(tabla)
          .insert([payload])
          .select()
          .single();
        
        if (insError) throw insError;
        finalId = newRecord.id;
      } else {
        // EXISTE: UPDATE
        const { error: updError } = await supabase
          .from(tabla)
          .update(payload)
          .eq("id", finalId);
        
        if (updError) throw updError;
      }

      // 3. ACTUALIZAR CANCIONES (Solo si es personaje)
      if (esPersonaje) {
        // Desvincular antiguas
        await supabase.from("canciones").update({ personaje: null }).eq("personaje", data?.nombre || editNombre);
        // Vincular nuevas
        if (editCanciones.length > 0) {
          await supabase.from("canciones").update({ personaje: editNombre }).in("id", editCanciones);
        }
      }

      // 4. ACTUALIZAR VARIANTES (Solo si es criatura)
      if (!esPersonaje && variantes.length > 0) {
        const { error: varError } = await supabase
          .from("criatura_variantes")
          .upsert(
            variantes.map(v => ({
              ...v,
              criatura_id: finalId 
            })),
            { onConflict: "id" }
          );
        if (varError) throw varError;
      }

      setEditMode(false);
      if (onUpdate) await onUpdate();
      
      return true; // Éxito

    } catch (err: any) {
      console.error("Error al guardar:", err);
      alert("Error: " + err.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    isAdmin, editMode, setEditMode, saving, handleSave,
    variantes, setVariantes,
    varianteActiva, setVarianteActiva,
    editNombre, setEditNombre, editDescripcion, setEditDescripcion,
    editCanciones, setEditCanciones,
    editRelaciones, setEditRelaciones, 
  };
}