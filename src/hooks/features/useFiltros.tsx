"use client";
import { useState, useMemo } from 'react';

export function useFiltrosGenericos(data: any[], config: { campos: string[] }) {
  // Inicializamos el estado de los filtros con 'todos' para cada campo
  const [filtros, setFiltros] = useState<Record<string, string>>(
    Object.fromEntries(config.campos.map(campo => [campo, 'todos']))
  );

  // Generar opciones únicas por campo (reino, especie, etc.)
  const opciones = useMemo(() => {
    const result: Record<string, string[]> = {};
    
    config.campos.forEach(campo => {
      // Si el campo es 'conFoto', no generamos opciones desde la data de Supabase
      if (campo === 'conFoto') {
        result[campo] = []; 
        return;
      }

      const valoresUnicos = Array.from(
        new Set(
          data
            .map(item => {
              const val = item[campo];
              return typeof val === 'string' ? val.trim() : val;
            })
            .filter(valor => valor !== null && valor !== undefined && valor !== '')
        )
      ).sort();
      
      result[campo] = valoresUnicos as string[];
    });
    
    return result;
  }, [data, config.campos]);

  // Lógica principal de filtrado
  const itemsFiltrados = useMemo(() => {
    return data.filter(item => {
      return config.campos.every(campo => {
        const filtroActivo = filtros[campo];
        
        // Si el filtro está en 'todos', no filtramos por este campo
        if (!filtroActivo || filtroActivo === 'todos') return true;

        // FILTRO ESPECIAL: Solo mostrar con imagen
        if (campo === 'conFoto') {
          return filtroActivo === 'solo_con_foto' 
            ? (!!item.img_url && item.img_url !== "") 
            : true;
        }

        // FILTRO NORMAL: Columnas de base de datos
        const valorItem = typeof item[campo] === 'string' ? item[campo].trim() : item[campo];
        return valorItem === filtroActivo;
      });
    });
  }, [data, filtros, config.campos]);

  const actualizarFiltro = (campo: string, valor: string) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const resetearFiltros = () => {
    setFiltros(Object.fromEntries(config.campos.map(campo => [campo, 'todos'])));
  };

  return {
    filtros,
    opciones,
    itemsFiltrados,
    actualizarFiltro,
    resetearFiltros
  };
}