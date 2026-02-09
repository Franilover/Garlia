"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/api/supabase";

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
        .from("criatura_variantes")
        .select("*")
        .eq("criatura_id", id)
        .order("id", { ascending: true });
        
      if (!error) setVariantes(vars || []);
    } catch (err) {
      console.error("Error fetching variantes:", err);
    }
  };

  // 3. --- SINCRONIZACIÓN DE ESTADOS (ULTRA-PROTEGIDA) ---
  useEffect(() => {
    // Si data es null o undefined, reseteamos las referencias y salimos
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
              if (typeof c === "object" && c !== null) return c.id;
              if (typeof c === "number") return c;
              if (typeof c === "string" && !isNaN(c)) return parseInt(c);
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
  }, [data, editMode]);

  // 4. --- LÓGICA DE GUARDADO MAESTRA ---
  const handleSave = async () => {
    // Verificación de existencia de data para evitar el crash al intentar leer .id
    if (!data?.id) return;
    
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
        .eq("id", data.id);

      if (mainError) throw mainError;

      // B. ACTUALIZAR CANCIONES (Solo Personajes)
      if (esPersonaje) {
        // Limpiamos referencias previas con el nombre original almacenado
        await supabase
          .from("canciones")
          .update({ personaje: null })
          .eq("personaje", data.nombre);

        // Vincular las nuevas canciones al nuevo nombre
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
              criatura_id: data.id 
            })),
            { onConflict: "id" }
          );
        
        if (varError) throw varError;
      }

      // --- PASOS DE SALIDA CRÍTICOS ---
      setEditMode(false);
      
      if (onUpdate) {
        await onUpdate(); 
      }
      
      // El timeout permite que React termine de procesar el renderizado
      // antes de que el alert bloquee la pantalla.
      setTimeout(() => {
        alert("Sincronización con el Archivo exitosa.");
      }, 150);

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