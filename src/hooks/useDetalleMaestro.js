"use client";
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/api/supabase';

export function useDetalleMaestro(data, onUpdate) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [variantes, setVariantes] = useState([]);
  const [varianteActiva, setVarianteActiva] = useState(null);
  
  const [editNombre, setEditNombre] = useState("");
  const [editDescripcion, setEditDescripcion] = useState("");
  const [editCanciones, setEditCanciones] = useState(""); 
  const [editRelaciones, setEditRelaciones] = useState([]);

  const prevIdRef = useRef(null);

  // Verificar admin
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setIsAdmin(true);
    };
    checkUser();
  }, []);

  // Cargar variantes de la base de datos
  const fetchVariantes = async (id) => {
    if (!id) return;
    const { data: vars, error } = await supabase
      .from('criatura_variantes')
      .select('*')
      .eq('criatura_id', id);
    if (!error) setVariantes(vars || []);
  };

  // Sincronizar datos cuando cambia el personaje/criatura seleccionado
  useEffect(() => {
    if (data) {
      const esNuevoItem = prevIdRef.current !== data.id;

      if (esNuevoItem || editMode) {
        setEditNombre(data.nombre || "");
        setEditDescripcion(data.sobre || data.descripcion || "");
        
        const cancionesArray = data.canciones || [];
        setEditCanciones(Array.isArray(cancionesArray) ? cancionesArray.join(", ") : "");
      }

      if (esNuevoItem) {
        setEditMode(false);
        setVarianteActiva(null);
        setVariantes(data.variantes || []); // Si vienen en la query inicial, las usamos
        
        // Si no vienen variantes, las buscamos
        if (!data.variantes || data.variantes.length === 0) {
          fetchVariantes(data.id);
        }
        prevIdRef.current = data.id;
      }
    }
  }, [data, editMode]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const esCriatura = !data.hasOwnProperty('canciones') || 'puntos_vida' in data;
      const tablaPrincipal = !esCriatura ? 'personajes' : 'criaturas';

      // 1. --- GUARDAR DATOS PRINCIPALES ---
      const cancionesArray = editCanciones
        .split(',')
        .map(link => link.trim())
        .filter(link => link !== "");

      const updates = {
        nombre: editNombre,
        [data.sobre ? 'sobre' : 'descripcion']: editDescripcion,
        ...(!esCriatura && { canciones: cancionesArray }) // Solo guardar canciones si es personaje
      };

      const { error: mainError, data: updatedDB } = await supabase
        .from(tablaPrincipal)
        .update(updates)
        .eq('id', data.id)
        .select()
        .single();

      if (mainError) throw mainError;

      // 2. --- GUARDAR VARIANTES (Si es Criatura) ---
      if (esCriatura && variantes.length > 0) {
        // Upsert: Si tiene ID actualiza, si no tiene inserta.
        const { error: varError } = await supabase
          .from('criatura_variantes')
          .upsert(
            variantes.map(v => ({
              ...v,
              criatura_id: data.id // Aseguramos el vínculo
            })),
            { onConflict: 'id' } // Basado en la PK 'id'
          );
        
        if (varError) throw varError;
        // Refrescamos variantes locales tras el guardado
        await fetchVariantes(data.id);
      }

      // 3. --- GUARDAR RELACIONES (Si es Personaje) ---
      if (!esCriatura && editRelaciones.length > 0) {
        // Tu lógica actual de relaciones se mantiene igual aquí
        // ... (insert/update de relaciones)
      }

      if (onUpdate) onUpdate(updatedDB || { ...data, ...updates });
      setEditMode(false);
      alert("¡Guardado correctamente!");

    } catch (err) {
      console.error(err);
      alert("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return {
    isAdmin, editMode, setEditMode, saving, handleSave,
    variantes, setVariantes, // Exportamos setVariantes para poder añadir/quitar desde el JSX
    varianteActiva, setVarianteActiva,
    editNombre, setEditNombre, editDescripcion, setEditDescripcion,
    editCanciones, setEditCanciones,
    setEditRelaciones
  };
}