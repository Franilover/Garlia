"use client";
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/api/supabase';

/**
 * Hook actualizado para gestionar Edición de Nombre, Descripción, Canciones y Relaciones.
 */
export function useDetalleMaestro(data, onUpdate) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [variantes, setVariantes] = useState([]);
  const [varianteActiva, setVarianteActiva] = useState(null);
  
  // Estados de los campos editables
  const [editNombre, setEditNombre] = useState("");
  const [editDescripcion, setEditDescripcion] = useState("");
  const [editCanciones, setEditCanciones] = useState(""); // Estado para el string de URLs

  const prevIdRef = useRef(null);

  // 1. Verificar sesión
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setIsAdmin(true);
    };
    checkUser();
  }, []);

  // 2. Cargar variantes
  const fetchVariantes = async (id) => {
    if (!id) return;
    const { data: vars, error } = await supabase
      .from('criatura_variantes')
      .select('*')
      .eq('criatura_id', id);
    if (!error && data?.id === id) setVariantes(vars || []);
  };

  // 3. Sincronización al cambiar de Cromo
  useEffect(() => {
    if (data) {
      const esNuevoItem = prevIdRef.current !== data.id;

      if (esNuevoItem || !editMode) {
        setEditNombre(data.nombre || "");
        setEditDescripcion(data.sobre || data.descripcion || "");
        
        // Convertimos el array de canciones ["url1", "url2"] a un string "url1, url2"
        const cancionesString = Array.isArray(data.canciones) 
          ? data.canciones.join(", ") 
          : "";
        setEditCanciones(cancionesString);

        if (esNuevoItem) {
          setEditMode(false);
          setVarianteActiva(null);
          setVariantes([]); 
          if (!data.img_url) fetchVariantes(data.id);
          prevIdRef.current = data.id;
        }
      }
    }
  }, [data, editMode]);

  // 4. Guardar cambios
  const handleSave = async () => {
    setSaving(true);
    try {
      const tablaPrincipal = data.img_url ? 'personajes' : 'criaturas';

      if (varianteActiva) {
        // Editar variante
        await supabase
          .from('criatura_variantes')
          .update({ descripcion_variante: editDescripcion })
          .eq('id', varianteActiva.id);
        
        setVariantes(prev => prev.map(v => 
          v.id === varianteActiva.id ? {...v, descripcion_variante: editDescripcion} : v
        ));
      } else {
        // Editar Personaje/Criatura (incluyendo canciones)
        // Convertimos el string de vuelta a un Array limpio
        const cancionesArray = editCanciones
          .split(',')
          .map(link => link.trim())
          .filter(link => link !== "");

        const updates = {
          nombre: editNombre,
          [data.sobre ? 'sobre' : 'descripcion']: editDescripcion,
          canciones: cancionesArray // Actualizamos el array en Supabase
        };

        const { error, data: updatedDB } = await supabase
          .from(tablaPrincipal)
          .update(updates)
          .eq('id', data.id)
          .select()
          .single();

        if (error) throw error;
        if (onUpdate) onUpdate(updatedDB || { ...data, ...updates });
      }
      setEditMode(false);
    } catch (err) {
      alert("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return {
    isAdmin,
    editMode,
    setEditMode,
    saving,
    handleSave,
    variantes,
    varianteActiva,
    setVarianteActiva,
    editNombre,
    setEditNombre,
    editDescripcion,
    setEditDescripcion,
    editCanciones, // Retornamos el nuevo estado
    setEditCanciones
  };
}