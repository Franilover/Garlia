// hooks/useFiltros.ts
import { useState, useMemo } from 'react';

// ============================================
// HOOK GENÉRICO PARA FILTROS (EXPORTADO)
// ============================================
export function useFiltrosGenericos(data: any[], config: { campos: string[] }) {
  const [filtros, setFiltros] = useState<Record<string, string>>(
    Object.fromEntries(config.campos.map(campo => [campo, 'todos']))
  );

  // Generar opciones únicas por campo
  const opciones = useMemo(() => {
    const result: Record<string, string[]> = {};
    
    config.campos.forEach(campo => {
      const valoresUnicos = Array.from(
        new Set(data.map(item => item[campo]).filter(Boolean))
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
        return item[campo] === filtroActivo;
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

// ============================================
// HOOK SIMPLE PARA FILTROS (SI LO USAS)
// ============================================
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