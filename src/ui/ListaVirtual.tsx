"use client";
/**
 * ListaVirtual.tsx
 * ────────────────
 * Wrapper genérico sobre @tanstack/react-virtual.
 * Solo renderiza al DOM los ítems visibles en pantalla — el resto no existe.
 *
 * Instalar: npm install @tanstack/react-virtual
 *
 * Uso:
 *   <ListaVirtual
 *     items={criaturas}
 *     estimatedSize={80}
 *     renderItem={(c) => <CriaturaCard key={c.id} criatura={c} />}
 *   />
 *
 * Para grillas (varias columnas):
 *   <ListaVirtual
 *     items={criaturas}
 *     estimatedSize={200}
 *     renderItem={(c) => <CriaturaCard key={c.id} criatura={c} />}
 *     className="grid grid-cols-2 md:grid-cols-3 gap-3"
 *   />
 */
import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useRef } from "react";

interface ListaVirtualProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  /**
   * Altura estimada de cada ítem en px. No tiene que ser exacta —
   * react-virtual la ajusta dinámicamente después del primer render.
   * Valores típicos: 64 (fila compacta), 80 (fila normal), 120 (card).
   */
  estimatedSize?: number;
  /**
   * Ítems extra renderizados arriba/abajo del viewport para scroll suave.
   * Default: 5. Subir a 10 si notás parpadeo en scroll rápido.
   */
  overscan?: number;
  /** Clases del contenedor scrollable (overflow-auto h-full ya incluido) */
  className?: string;
  /** Clases del wrapper interior que establece la altura total virtual */
  innerClassName?: string;
}

export function ListaVirtual<T>({
  items,
  renderItem,
  estimatedSize = 72,
  overscan = 5,
  className = "",
  innerClassName = "",
}: ListaVirtualProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtual = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedSize,
    overscan,
  });

  if (items.length === 0) return null;

  return (
    <div
      ref={parentRef}
      className={`overflow-auto h-full ${className}`}
    >
      {/* Este div tiene la altura "real" total — fuerza el scrollbar correcto */}
      <div
        className={innerClassName}
        style={{ height: `${virtual.getTotalSize()}px`, position: "relative" }}
      >
        {virtual.getVirtualItems().map((vItem) => (
          <div
            key={vItem.key}
            data-index={vItem.index}
            style={{
              position: "absolute",
              top: 0,
              transform: `translateY(${vItem.start}px)`,
              width: "100%",
            }}
          >
            {renderItem(items[vItem.index], vItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
