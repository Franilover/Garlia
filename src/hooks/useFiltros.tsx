// hooks/useFiltros.ts
import { useState, useMemo } from "react";

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