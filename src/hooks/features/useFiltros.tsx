// hooks/useFiltros.ts
import { useState, useMemo } from 'react';

export function useFiltrosGenericos(data: any[], config: { campos: string[] }) {
  const [filtros, setFiltros] = useState<Record<string, string>>(
    Object.fromEntries(config.campos.map(campo => [campo, 'todos']))
  );

  // Generar opciones únicas por campo (SIN DUPLICADOS)
  const opciones = useMemo(() => {
    const result: Record<string, string[]> = {};
    
    config.campos.forEach(campo => {
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
      
      result[campo] = valoresUnicos;
    });
    
    return result;
  }, [data, config.campos]);

  // Filtrar items
  const itemsFiltrados = useMemo(() => {
    return data.filter(item => {
      return config.campos.every(campo => {
        const filtroActivo = filtros[campo];
        if (!filtroActivo || filtroActivo === 'todos') return true;
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

// Hook simple (si lo usas en otro lugar)
interface UseFiltrosOptions<T> {
  data: T[];
  filterFn: (item: T, filtro: string) => boolean;
}

export function useFiltros<T>({ data, filterFn }: UseFiltrosOptions<T>) {
  const [filtro, setFiltro] = useState<string>("todos");

  const datosFiltrados = useMemo(() => {
    if (filtro === "todos") return data;
    return data.filter(item => filterFn(item, filtro));
  }, [data, filtro, filterFn]);

  return {
    filtro,
    setFiltro,
    datosFiltrados
  };
}