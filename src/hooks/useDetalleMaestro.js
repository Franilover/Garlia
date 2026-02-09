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
  // Ahora editCanciones guarda un ARRAY de IDs numéricos, no un string
  const [editCanciones, setEditCanciones] = useState([]); 
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

  // Cargar variantes
  const fetchVariantes = async (id) => {
    if (!id) return;
    const { data: vars, error } = await supabase
      .from('criatura_variantes')
      .select('*')
      .eq('criatura_id', id);
    if (!error) setVariantes(vars || []);
  };

  // Sincronizar datos
  useEffect(() => {
    if (data) {
      const esNuevoItem = prevIdRef.current !== data.id;

      if (esNuevoItem || editMode) {
        setEditNombre(data.nombre || "");
        setEditDescripcion(data.sobre || data.descripcion || "");
        
        // CORRECCIÓN: Si data.canciones es un array de objetos, extraemos solo los IDs
        const cancionesData = data.canciones || [];
        const idsIniciales = Array.isArray(cancionesData) 
          ? cancionesData.map(c => typeof c === 'object' ? c.id : c) 
          : [];
        setEditCanciones(idsIniciales);
      }

      if (esNuevoItem) {
        setEditMode(false);
        setVarianteActiva(null);
        setVariantes(data.variantes || []);
        
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

      // 1. --- ACTUALIZAR PERSONAJE / CRIATURA ---
      const updates = {
        nombre: editNombre,
        [data.sobre ? 'sobre' : 'descripcion']: editDescripcion
        // IMPORTANTE: Ya no enviamos la columna "canciones" aquí porque fue borrada
      };

      const { error: mainError } = await supabase
        .from(tablaPrincipal)
        .update(updates)
        .eq('id', data.id);

      if (mainError) throw mainError;

      // 2. --- LÓGICA DE CANCIONES (Solo si es personaje) ---
      if (!esCriatura) {
        // A. Desvincular canciones antiguas que apuntaban a este personaje
        await supabase
          .from('canciones')
          .update({ personaje: null })
          .eq('personaje', data.nombre);

        // B. Vincular las nuevas canciones seleccionadas por ID
        if (editCanciones.length > 0) {
          const { error: musicError } = await supabase
            .from('canciones')
            .update({ personaje: editNombre })
            .in('id', editCanciones);
          
          if (musicError) throw musicError;
        }
      }

      // 3. --- GUARDAR VARIANTES (Si es Criatura) ---
      if (esCriatura && variantes.length > 0) {
        const { error: varError } = await supabase
          .from('criatura_variantes')
          .upsert(
            variantes.map(v => ({
              ...v,
              criatura_id: data.id 
            })),
            { onConflict: 'id' }
          );
        
        if (varError) throw varError;
        await fetchVariantes(data.id);
      }

      // 4. --- GUARDAR RELACIONES ---
      if (!esCriatura && editRelaciones.length > 0) {
        // Tu lógica de relaciones se mantiene aquí
      }

      if (onUpdate) onUpdate(); // Refrescar la vista
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
    variantes, setVariantes,
    varianteActiva, setVarianteActiva,
    editNombre, setEditNombre, editDescripcion, setEditDescripcion,
    editCanciones, setEditCanciones,
    setEditRelaciones
  };
}