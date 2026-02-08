import { useState, useMemo } from 'react';

export function useFiltrosGenericos(items, configuracion) {
  // 1. Inicializamos siempre en minúsculas para evitar errores de comparación
  const [filtros, setFiltros] = useState(() => {
    if (configuracion.inicial) return configuracion.inicial;
    return Object.fromEntries(configuracion.campos.map(c => [c, 'Todos']));
  });

  // 2. Generar opciones únicas basadas en los items reales
  const opciones = useMemo(() => {
    const resultado = {};
    configuracion.campos.forEach(campo => {
      // Obtenemos valores, filtramos nulos y aplanamos si es un array (como los tags)
      const valores = items
        .flatMap(item => item[campo]) 
        .filter(Boolean);
      
      // Guardamos con la primera letra mayúscula para la estética de los botones
      const unicos = [...new Set(valores)].sort();
      resultado[campo] = ['Todos', ...unicos];
    });
    return resultado;
  }, [items, configuracion.campos]);

  // 3. Filtrar items (Insensible a mayúsculas y soporte para arrays)
  const itemsFiltrados = useMemo(() => {
    return items.filter(item => {
      return Object.entries(filtros).every(([campo, valorFiltro]) => {
        // Si el filtro es 'todos', pasa siempre
        if (valorFiltro.toLowerCase() === 'todos') return true;

        const valorItem = item[campo];

        // Si el campo del item es un array (como tags)
        if (Array.isArray(valorItem)) {
          return valorItem.some(v => v.toLowerCase() === valorFiltro.toLowerCase());
        }

        // Si es un string normal
        return valorItem?.toLowerCase() === valorFiltro.toLowerCase();
      });
    });
  }, [items, filtros]);

  const actualizarFiltro = (campo, valor) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  };

  const resetearFiltros = () => {
    setFiltros(Object.fromEntries(configuracion.campos.map(c => [c, 'Todos'])));
  };

  return {
    filtros,
    opciones,
    itemsFiltrados,
    actualizarFiltro,
    resetearFiltros
  };
}