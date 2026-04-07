"use client";

import React from "react";

/**
 * TOKENS DE DISEÑO
 * Centralizamos las clases de Tailwind aquí usando nombres cortos (xs, sm, md...).
 * Si cambias un valor aquí, se actualiza en TODA la aplicación.
 */
export const TEXT_VARIANTS = {
  // Tamaños base rápidos
  xs: "text-[9px] font-black uppercase tracking-[0.2em]",
  sm: "text-[11px] font-bold tracking-tight",
  md: "text-sm font-medium",
  lg: "text-lg font-serif italic",
  xl: "text-3xl font-black italic tracking-tighter",
  
  // Roles de la interfaz (puedes seguir usando nombres cortos si prefieres)
  lbl: "text-[9px] font-black text-primary/40 uppercase tracking-widest block",
  cap: "text-[10px] font-black uppercase tracking-[0.3em] italic text-primary/30",
  btn: "text-[10px] font-black uppercase tracking-widest",
  err: "text-[9px] text-red-500 font-bold uppercase tracking-tight",
};

/**
 * Propiedades del componente Text
 */
interface TextProps {
  /** El estilo visual corto: xs, sm, md, lg, xl, lbl, cap, etc. */
  variant?: keyof typeof TEXT_VARIANTS;
  className?: string;
  children: React.ReactNode;
  /** El tag HTML real (p, h1, span...) */
  as?: "span" | "p" | "h1" | "h2" | "h3" | "h4" | "label" | "div";
}

/**
 * COMPONENTE: Text
 * Úsalo para cualquier texto. Es rápido de escribir: <Text variant="xs">Hola</Text>
 */
export function Text({ 
  variant = "md", 
  className = "", 
  children, 
  as: Tag = "p" 
}: TextProps) {
  return (
    <Tag className={`${TEXT_VARIANTS[variant]} ${className}`}>
      {children}
    </Tag>
  );
}

/**
 * COMPONENTE: FieldWrapper
 * Mantiene tus formularios ordenados usando los nuevos nombres cortos.
 */
interface FieldWrapperProps {
  label?: string;
  error?: string;
  children: React.ReactNode;
}

export function FieldWrapper({ label, error, children }: FieldWrapperProps) {
  return (
    <div className="space-y-1.5 w-full text-left">
      {label && (
        <Text as="label" variant="lbl">
          {label}
        </Text>
      )}
      
      {children}
      
      {error && (
        <Text variant="err" className="mt-1">
          {error}
        </Text>
      )}
    </div>
  );
}