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
  
  // NUEVO: Estado para capturar las relaciones desde el componente hijo
  const [editRelaciones, setEditRelaciones] = useState([]);

  const prevIdRef = useRef(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setIsAdmin(true);
    };
    checkUser();
  }, []);

  const fetchVariantes = async (id) => {
    if (!id) return;
    const { data: vars, error } = await supabase
      .from('criatura_variantes')
      .select('*')
      .eq('criatura_id', id);
    if (!error && data?.id === id) setVariantes(vars || []);
  };

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
        setVariantes([]); 
        if (!data.img_url) fetchVariantes(data.id);
        prevIdRef.current = data.id;
      }
    }
  }, [data, editMode]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const tablaPrincipal = data.img_url ? 'personajes' : 'criaturas';

      if (varianteActiva) {
        // --- GUARDAR EN VARIANTE ---
        await supabase
          .from('criatura_variantes')
          .update({ descripcion_variante: editDescripcion })
          .eq('id', varianteActiva.id);
        
        setVariantes(prev => prev.map(v => 
          v.id === varianteActiva.id ? {...v, descripcion_variante: editDescripcion} : v
        ));
      } else {
        // --- GUARDAR EN PERSONAJE/CRIATURA PRINCIPAL ---
        const cancionesArray = editCanciones
          .split(',')
          .map(link => link.trim())
          .filter(link => link !== "" && link.includes('/'));

        const updates = {
          nombre: editNombre,
          [data.sobre ? 'sobre' : 'descripcion']: editDescripcion,
          canciones: cancionesArray 
        };

        const { error, data: updatedDB } = await supabase
          .from(tablaPrincipal)
          .update(updates)
          .eq('id', data.id)
          .select()
          .single();

        if (error) throw error;

        // --- GUARDAR RELACIONES (Lógica de Upsert) ---
        if (editRelaciones.length > 0) {
          for (const rel of editRelaciones) {
            if (rel.id) {
              // Si ya tiene ID, actualizamos
              await supabase
                .from('relaciones')
                .update({ sus: rel.sus, son: rel.son })
                .eq('id', rel.id);
            } else {
              // Si no tiene ID, es nueva
              await supabase
                .from('relaciones')
                .insert({ 
                  personaje: data.nombre, 
                  sus: rel.sus, 
                  son: rel.son 
                });
            }
          }
        }

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
    isAdmin, editMode, setEditMode, saving, handleSave,
    variantes, varianteActiva, setVarianteActiva,
    editNombre, setEditNombre, editDescripcion, setEditDescripcion,
    editCanciones, setEditCanciones,
    setEditRelaciones // Lo exportamos para que DetalleMaestro pueda usarlo
  };
}