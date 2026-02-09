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
  const [editCanciones, setEditCanciones] = useState([]); 
  const [editRelaciones, setEditRelaciones] = useState([]);

  const prevIdRef = useRef(null);

  // 1. --- VERIFICACIÓN DE PERMISOS ---
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setIsAdmin(true);
    };
    checkUser();
  }, []);

  // 2. --- CARGA DETALLADA DE VARIANTES ---
  const fetchVariantes = async (id) => {
    if (!id) return;
    try {
      const { data: vars, error } = await supabase
        .from('criatura_variantes')
        .select('*')
        .eq('criatura_id', id)
        .order('id', { ascending: true });
        
      if (!error) setVariantes(vars || []);
    } catch (err) {
      console.error("Error fetching variantes:", err);
    }
  };

  // 3. --- SINCRONIZACIÓN DE ESTADOS (MAESTRO-DETALLE) ---
  useEffect(() => {
    if (data) {
      const esNuevoItem = prevIdRef.current !== data.id;

      // Sincronizar campos de edición si cambiamos de item o entramos en editMode
      if (esNuevoItem || editMode) {
        setEditNombre(data.nombre || "");
        setEditDescripcion(data.sobre || data.descripcion || "");
        
        // Normalización de canciones (Extraer IDs si vienen como objetos de Supabase)
        const cancionesData = data.canciones || [];
        const idsIniciales = Array.isArray(cancionesData) 
          ? cancionesData.map(c => typeof c === 'object' ? c.id : c) 
          : [];
        setEditCanciones(idsIniciales);
        
        // Sincronizar relaciones si existen
        setEditRelaciones(data.relaciones || []);
      }

      // Resetear estados visuales al cambiar de personaje/criatura
      if (esNuevoItem) {
        setEditMode(false);
        setVarianteActiva(null);
        
        // Si el fetch inicial no trajo las variantes, las buscamos manualmente
        if (!data.variantes || data.variantes.length === 0) {
          fetchVariantes(data.id);
        } else {
          setVariantes(data.variantes);
        }
        prevIdRef.current = data.id;
      }
    }
  }, [data, editMode]);

  // 4. --- LÓGICA DE GUARDADO MAESTRA ---
  const handleSave = async () => {
    if (!editNombre.trim()) {
      alert("El nombre no puede estar vacío");
      return;
    }

    setSaving(true);
    try {
      // Detección de tabla destino
      const esCriatura = !data.hasOwnProperty('canciones') || 'puntos_vida' in data;
      const tablaPrincipal = !esCriatura ? 'personajes' : 'criaturas';

      // A. ACTUALIZAR ENTIDAD PRINCIPAL
      const updates = {
        nombre: editNombre,
        [data.sobre ? 'sobre' : 'descripcion']: editDescripcion
      };

      const { error: mainError } = await supabase
        .from(tablaPrincipal)
        .update(updates)
        .eq('id', data.id);

      if (mainError) throw mainError;

      // B. ACTUALIZAR CANCIONES (Solo Personajes)
      if (!esCriatura) {
        // Primero "limpiamos" el nombre antiguo de todas las canciones vinculadas
        await supabase
          .from('canciones')
          .update({ personaje: null })
          .eq('personaje', data.nombre);

        // Luego vinculamos las nuevas por su ID
        if (editCanciones.length > 0) {
          const { error: musicError } = await supabase
            .from('canciones')
            .update({ personaje: editNombre })
            .in('id', editCanciones);
          
          if (musicError) throw musicError;
        }
      }

      // C. ACTUALIZAR VARIANTES (Solo Criaturas)
      if (esCriatura) {
        // Upsert maneja creación de nuevas y actualización de existentes
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

      // D. ACTUALIZAR RELACIONES (Lógica delegada)
      if (!esCriatura && editRelaciones.length > 0) {
        // Aquí podrías añadir lógica adicional de sincronización si fuera necesario
      }

      // 5. --- FINALIZACIÓN ---
      if (onUpdate) await onUpdate(); // Avisar al padre para refrescar datos
      
      setEditMode(false);
      // Feedback visual opcional: podrías usar un toast aquí
      console.log("Sincronización completa con Supabase");

    } catch (err) {
      console.error("Error crítico en handleSave:", err);
      alert("Error al sincronizar con el Archivo: " + err.message);
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
    setVariantes,
    varianteActiva, 
    setVarianteActiva,
    editNombre, 
    setEditNombre, 
    editDescripcion, 
    setEditDescripcion,
    editCanciones, 
    setEditCanciones,
    editRelaciones,
    setEditRelaciones
  };
}