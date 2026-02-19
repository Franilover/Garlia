"use client";
import { useState, useMemo } from 'react';

export function useFiltrosGenericos(data: any[], config: { campos: string[] }) {
  const [filtros, setFiltros] = useState<Record<string, string>>(
    Object.fromEntries(config.campos.map(campo => [campo, 'todos']))
  );

  const opciones = useMemo(() => {
    const result: Record<string, string[]> = {};
    config.campos.forEach(campo => {
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

  const itemsFiltrados = useMemo(() => {
    return data.filter(item => {
      return config.campos.every(campo => {
        const filtroActivo = filtros[campo];
        if (!filtroActivo || filtroActivo === 'todos') return true;

        // FILTRO ESPECIAL: Soporta img_url (Personajes) e imagen_url (Criaturas/Items)
        if (campo === 'conFoto') {
          if (filtroActivo === 'solo_con_foto') {
            const url = item.img_url || item.imagen_url;
            return !!url && url !== "";
          }
          return true;
        }

        const valorItem = typeof item[campo] === 'string' ? item[campo].trim() : item[campo];
        return valorItem === filtroActivo;
      });
    });
  }, [data, filtros, config.campos]);

  const actualizarFiltro = (campo: string, valor: string) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  };

  const resetearFiltros = () => {
    setFiltros(Object.fromEntries(config.campos.map(campo => [campo, 'todos'])));
  };

  return { filtros, opciones, itemsFiltrados, actualizarFiltro, resetearFiltros };
}