import { useState, useMemo } from 'react';

export function useFiltrosGenericos(items, configuracion) {
  // configuracion = { campos: ['categoria', 'tipo'], inicial: {...} }
  const [filtros, setFiltros] = useState(
    configuracion.inicial || 
    Object.fromEntries(configuracion.campos.map(c => [c, 'todos']))
  );

  // Generar opciones únicas automáticamente
  const opciones = useMemo(() => {
    const resultado = {};
    configuracion.campos.forEach(campo => {
      const valores = items.map(item => item[campo]).filter(Boolean);
      resultado[campo] = ['todos', ...new Set(valores)].sort();
    });
    return resultado;
  }, [items, configuracion.campos]);

  // Filtrar items
  const itemsFiltrados = useMemo(() => {
    return items.filter(item => {
      return Object.entries(filtros).every(([campo, valor]) => {
        if (valor === 'todos') return true;
        return item[campo] === valor;
      });
    });
  }, [items, filtros]);

  const actualizarFiltro = (campo, valor) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  };

  const resetearFiltros = () => {
    setFiltros(Object.fromEntries(configuracion.campos.map(c => [c, 'todos'])));
  };

  return {
    filtros,
    opciones,
    itemsFiltrados,
    actualizarFiltro,
    resetearFiltros
  };
}