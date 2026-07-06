"use client";

/**
 * EntityCard
 * ───────────────────────────────────────────────────────────────────────────
 * Tarjeta usada en las páginas combinadas en grid (Entidades, Magia,
 * Organización, Geografía). Muestra imagen (o ícono de fallback) + nombre.
 * Sin buscador ni lista — el grid entero es la interfaz de selección.
 */

import React from "react";

interface Props {
  nombre: string;
  imageUrl?: string | null;
  Icon: React.ElementType;
  onClick: () => void;
  subtitle?: string | null;
}

export function EntityCard({ nombre, imageUrl, Icon, onClick, subtitle }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center gap-1.5 p-2 rounded-xl transition-colors hover:bg-primary/5 text-center"
    >
      <div className="w-full aspect-square rounded-xl overflow-hidden bg-primary/5 border border-primary/10 flex items-center justify-center group-hover:border-primary/25 transition-colors">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={nombre} className="w-full h-full object-cover" />
        ) : (
          <Icon size={22} className="text-primary/20" strokeWidth={1.5} />
        )}
      </div>
      <span className="text-xs font-semibold text-primary/80 truncate w-full leading-tight">
        {nombre}
      </span>
      {subtitle && (
        <span className="text-micro text-primary/35 truncate w-full leading-tight">
          {subtitle}
        </span>
      )}
    </button>
  );
}
