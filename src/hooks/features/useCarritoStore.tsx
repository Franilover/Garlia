"use client";
import React, { createContext, useContext, useCallback, useMemo } from "react";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { comprasQueries, CompraRow, NuevaCompra } from "@/lib/api/queries/personal/cocina/carrito";
import { Ingrediente } from "@/lib/types/personal/ingrediente";

export type { CompraRow };

export interface CarritoItem extends CompraRow {
  ingrediente?: Ingrediente;
  nombre:        string;
  kcal:          number;
  proteinas:     number;
  carbohidratos: number;
  grasas:        number;
}

interface CarritoCtx {
  items:      CarritoItem[];
  loading:    boolean;
  totalItems: number;
  isInCart:   (ingredienteId: string) => boolean;
  addItem:    (ingrediente: Ingrediente, opts?: { cantidad?: string; precio?: number; origenReceta?: string }) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  clearAll:   () => Promise<void>;
  refetch:    () => void;
}

const CarritoContext = createContext<CarritoCtx | null>(null);

interface CarritoProviderProps {
  children:     React.ReactNode;
  ingredientes: Ingrediente[];
}

export function CarritoProvider({ children, ingredientes }: CarritoProviderProps) {
  const { data: compras, loading, addRow, deleteRow, refetch } =
    useSupabaseData<CompraRow>("compras");

  const items = useMemo<CarritoItem[]>(() =>
    compras.map(compra => {
      const ing = ingredientes.find(i => i.id === compra.ingrediente_id);
      return {
        ...compra,
        ingrediente:   ing,
        nombre:        ing?.nombre        ?? "Desconocido",
        kcal:          ing?.kcal          ?? 0,
        proteinas:     ing?.proteinas     ?? 0,
        carbohidratos: ing?.carbohidratos ?? 0,
        grasas:        ing?.grasas        ?? 0,
      };
    }),
  [compras, ingredientes]);

  const isInCart = useCallback((ingredienteId: string) =>
    compras.some(c => c.ingrediente_id === ingredienteId),
  [compras]);

  const addItem = useCallback(async (
    ingrediente: Ingrediente,
    opts: { cantidad?: string; precio?: number; origenReceta?: string } = {}
  ) => {
    if (compras.some(c => c.ingrediente_id === ingrediente.id)) return;
    const nueva: NuevaCompra = {
      ingrediente_id:    ingrediente.id,
      precio_pagado:     opts.precio ?? (ingrediente as any).precio_porcion ?? null,
      cantidad_comprada: opts.cantidad ?? ingrediente.porcion_texto ?? null,
      lugar_compra:      opts.origenReceta ?? null,
      user_id:           null,
    };
    await addRow(nueva);
  }, [compras, addRow]);

  const removeItem = useCallback(async (id: string) => {
    const byRow = compras.find(c => c.id === id);
    if (byRow) { await deleteRow(byRow.id); return; }
    const byIng = compras.find(c => c.ingrediente_id === id);
    if (byIng) await deleteRow(byIng.id);
  }, [compras, deleteRow]);

  const clearAll = useCallback(async () => {
    await comprasQueries.deleteAll();
    refetch();
  }, [refetch]);

  return (
    <CarritoContext.Provider value={{
      items,
      loading,
      totalItems: items.length,
      isInCart,
      addItem,
      removeItem,
      clearAll,
      refetch,
    }}>
      {children}
    </CarritoContext.Provider>
  );
}

export function useCarrito() {
  const ctx = useContext(CarritoContext);
  if (!ctx) throw new Error("useCarrito debe usarse dentro de <CarritoProvider>");
  return ctx;
}