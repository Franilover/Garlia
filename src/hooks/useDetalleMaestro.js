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

  // 3. --- SINCRONIZACIÓN DE ESTADOS (OPTIMIZADO PARA RUTAS INTERNAS) ---
  useEffect(() => {
    if (data) {
      const esNuevoItem = prevIdRef.current !== data.id;

      if (esNuevoItem || editMode) {
        setEditNombre(data.nombre || "");
        setEditDescripcion(data.sobre || data.descripcion || "");
        
        // Extraemos solo los IDs para que el SelectorMusicaAdmin pueda marcarlos
        const cancionesData = data.canciones || [];
        const idsIniciales = Array.isArray(cancionesData) 
          ? cancionesData
              .map(c => {
                if (typeof c === 'object' && c !== null) return c.id;
                if (typeof c === 'number') return c;
                if (typeof c === 'string' && !isNaN(c)) return parseInt(c);
                return null;
              })
              .filter(id => id !== null)
          : [];
          
        setEditCanciones(idsIniciales);
        setEditRelaciones(data.relaciones || []);
      }

      if (esNuevoItem) {
        setEditMode(false);
        setVarianteActiva(null);
        if (!data.sobre && (!data.variantes || data.variantes.length === 0)) {
          fetchVariantes(data.id);
        } else {
          setVariantes(data.variantes || []);
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
      const esPersonaje = 'sobre' in data; 
      const tablaPrincipal = esPersonaje ? 'personajes' : 'criaturas';
      const columnaTexto = esPersonaje ? 'sobre' : 'descripcion';

      // A. ACTUALIZAR ENTIDAD PRINCIPAL
      const { error: mainError } = await supabase
        .from(tablaPrincipal)
        .update({
          nombre: editNombre,
          [columnaTexto]: editDescripcion
        })
        .eq('id', data.id);

      if (mainError) throw mainError;

      // B. ACTUALIZAR CANCIONES (Solo Personajes)
      if (esPersonaje) {
        // 1. Desvincular canciones antiguas (por nombre viejo y nuevo para seguridad)
        await supabase
          .from('canciones')
          .update({ personaje: null })
          .or(`personaje.eq."${data.nombre}",personaje.eq."${editNombre}"`);

        // 2. Vincular las nuevas canciones seleccionadas al nombre actual
        if (editCanciones.length > 0) {
          const { error: musicError } = await supabase
            .from('canciones')
            .update({ personaje: editNombre })
            .in('id', editCanciones);
          
          if (musicError) throw musicError;
        }
      }

      // C. ACTUALIZAR VARIANTES (Solo Criaturas)
      if (!esPersonaje && variantes.length > 0) {
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

      if (onUpdate) await onUpdate(); 
      setEditMode(false);
      alert("Sincronización con el Archivo exitosa.");

    } catch (err) {
      console.error("Error crítico en handleSave:", err);
      alert("Error de esquema: " + err.message);
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
    editRelaciones, setEditRelaciones
  };
}