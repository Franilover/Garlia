"use client";
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/api/supabase';

/**
 * Hook personalizado para gestionar la lógica de DetalleMaestro
 * @param {Object} data - Datos del personaje o criatura actual
 * @param {Function} onUpdate - Callback para actualizar el estado en el componente padre
 */
export function useDetalleMaestro(data, onUpdate) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Estados para Variantes (Solo criaturas)
  const [variantes, setVariantes] = useState([]);
  const [varianteActiva, setVarianteActiva] = useState(null);
  
  // Estados de los campos editables
  const [editNombre, setEditNombre] = useState("");
  const [editDescripcion, setEditDescripcion] = useState("");

  // Referencia para detectar cambios de ID y limpiar estados
  const prevIdRef = useRef(null);

  // 1. Verificar si hay una sesión activa para mostrar botones de edición
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setIsAdmin(true);
    };
    checkUser();
  }, []);

  // 2. Cargar variantes desde la tabla 'criatura_variantes'
  const fetchVariantes = async (id) => {
    if (!id) return;
    const { data: vars, error } = await supabase
      .from('criatura_variantes')
      .select('*')
      .eq('criatura_id', id);
    
    if (!error && data?.id === id) {
      setVariantes(vars || []);
    }
  };

  // 3. Sincronización Maestra: Se dispara cuando 'data' cambia (al abrir otro cromo)
  useEffect(() => {
    if (data) {
      const esNuevoItem = prevIdRef.current !== data.id;

      if (esNuevoItem) {
        // Reset total al cambiar de personaje/criatura
        setEditNombre(data.nombre || "");
        setEditDescripcion(data.sobre || data.descripcion || "");
        setEditMode(false);
        setVarianteActiva(null);
        setVariantes([]); 
        
        // Si no tiene img_url, asumimos que es una criatura y buscamos variantes
        if (!data.img_url) {
          fetchVariantes(data.id);
        }
        prevIdRef.current = data.id;
      } else {
        // Si es el mismo item pero salimos del modo edición, refrescamos valores
        if (!editMode) {
          setEditNombre(data.nombre || "");
          setEditDescripcion(data.sobre || data.descripcion || "");
        }
      }
    } else {
      prevIdRef.current = null;
    }
  }, [data, editMode]);

  // 4. Cambiar descripción al alternar entre Variante y Original (fuera de modo edición)
  useEffect(() => {
    if (editMode || !data) return;
    if (varianteActiva) {
      setEditDescripcion(varianteActiva.descripcion_variante || "");
    } else {
      setEditDescripcion(data.sobre || data.descripcion || "");
    }
  }, [varianteActiva, editMode, data]);

  // 5. Función para guardar cambios en Supabase
  const handleSave = async () => {
    setSaving(true);
    try {
      const tablaPrincipal = data.img_url ? 'personajes' : 'criaturas';

      if (varianteActiva) {
        // Caso A: Estamos editando una variante
        const { error } = await supabase
          .from('criatura_variantes')
          .update({ descripcion_variante: editDescripcion })
          .eq('id', varianteActiva.id);
        
        if (error) throw error;
        
        // Actualizar estado local de variantes
        setVariantes(prev => prev.map(v => 
          v.id === varianteActiva.id ? {...v, descripcion_variante: editDescripcion} : v
        ));
      } else {
        // Caso B: Estamos editando el personaje/criatura original
        const updates = {
          nombre: editNombre,
          [data.sobre ? 'sobre' : 'descripcion']: editDescripcion
        };

        const { error, data: updatedDB } = await supabase
          .from(tablaPrincipal)
          .update(updates)
          .eq('id', data.id)
          .select()
          .single();

        if (error) throw error;
        
        // Notificar al componente padre para que actualice la lista general
        if (onUpdate && typeof onUpdate === 'function') {
          onUpdate(updatedDB || { ...data, ...updates });
        }
      }
      setEditMode(false);
    } catch (err) {
      console.error("Error detallado:", err);
      alert("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Retornamos todo lo que DetalleMaestro.jsx necesita usar
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
    setEditDescripcion
  };
}