"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/api/supabase";

// 1. EXPORTAMOS LAS INTERFACES para que el componente las pueda importar
export interface Relacion {
  id?: string;
  sus: string;
  son: string[];
  personaje: string;
}

export interface Variante {
  id?: number;
  tipo: string;
  descripcion?: string;          // Opcional
  descripcion_variante?: string; // FIX: Agregado para coincidir con la base de datos
  imagen_url?: string;           // FIX: Agregado para las imágenes de cepas
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

  // 1. --- VERIFICACIÓN DE PERMISOS ---
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setIsAdmin(true);
    };
    checkUser();
  }, []);

  // 2. --- CARGA DETALLADA DE VARIANTES ---
  const fetchVariantes = async (id: any) => {
    if (!id) return;
    try {
      const idNumerico = Number(id);
      if (isNaN(idNumerico)) return;

      const { data: vars, error } = await supabase
        .from("criatura_variantes")
        .select("*")
        .eq("criatura_id", idNumerico)
        .order("id", { ascending: true });
        
      if (!error) setVariantes(vars || []);
    } catch (err) {
      console.error("Error fetching variantes:", err);
    }
  };

  // 3. --- SINCRONIZACIÓN DE ESTADOS ---
  useEffect(() => {
    if (!data || !data.id) {
      prevIdRef.current = null;
      return;
    }

    const esNuevoItem = prevIdRef.current !== data.id;

    if (esNuevoItem || editMode) {
      setEditNombre(data.nombre || "");
      setEditDescripcion(data.sobre || data.descripcion || "");
      
      const cancionesData = data.canciones || [];
      const idsIniciales = Array.isArray(cancionesData) 
        ? cancionesData
            .map(c => {
              if (typeof c === "object" && c !== null) return Number(c.id);
              if (typeof c === "number") return c;
              if (typeof c === "string" && !isNaN(Number(c))) return parseInt(c);
              return null;
            })
            .filter((id): id is number => id !== null)
        : [];
        
      setEditCanciones(idsIniciales);
      setEditRelaciones(data.relaciones || []);
    }

    if (esNuevoItem) {
      setEditMode(false);
      setVarianteActiva(null);
      // Solo buscamos variantes si es una criatura (no tiene el campo 'sobre')
      if (!data.sobre && (!data.variantes || data.variantes.length === 0)) {
        fetchVariantes(data.id);
      } else {
        setVariantes(data.variantes || []);
      }
      prevIdRef.current = data.id;
    }
  }, [data, editMode]);

  // 4. --- LÓGICA DE GUARDADO MAESTRA ---
  const handleSave = async () => {
    if (!data?.id) return;
    
    const targetId = Number(data.id);
    if (isNaN(targetId)) {
      alert("Error: ID de entidad no válido");
      return;
    }

    if (!editNombre.trim()) {
      alert("El nombre no puede estar vacío");
      return;
    }

    setSaving(true);
    try {
      const esPersonaje = "sobre" in data; 
      const tablaPrincipal = esPersonaje ? "personajes" : "criaturas";
      const columnaTexto = esPersonaje ? "sobre" : "descripcion";

      // A. ACTUALIZAR ENTIDAD PRINCIPAL
      const { error: mainError } = await supabase
        .from(tablaPrincipal)
        .update({
          nombre: editNombre,
          [columnaTexto]: editDescripcion
        })
        .eq("id", targetId);

      if (mainError) throw mainError;

      // B. ACTUALIZAR CANCIONES (Solo Personajes)
      if (esPersonaje) {
        await supabase
          .from("canciones")
          .update({ personaje: null })
          .eq("personaje", data.nombre);

        if (editCanciones.length > 0) {
          const { error: musicError } = await supabase
            .from("canciones")
            .update({ personaje: editNombre })
            .in("id", editCanciones);
          
          if (musicError) throw musicError;
        }
      }

      // C. ACTUALIZAR VARIANTES (Solo Criaturas)
      if (!esPersonaje && variantes.length > 0) {
        const { error: varError } = await supabase
          .from("criatura_variantes")
          .upsert(
            variantes.map(v => ({
              ...v,
              criatura_id: targetId 
            })),
            { onConflict: "id" }
          );
        
        if (varError) throw varError;
      }

      setEditMode(false);
      setSaving(false);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (onUpdate) {
        await onUpdate(); 
      }
      
      setTimeout(() => {
        alert("Sincronización con el Archivo exitosa.");
      }, 150);

    } catch (err: any) {
      console.error("Error crítico en handleSave:", err);
      alert("Error de esquema: " + err.message);
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