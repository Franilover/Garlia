import React from "react";
import { MotionDiv } from '@/components/ui/Motion';
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export type VistaOpcion = 1 | 2 | 3 | 4 | 5 | 7;
export type ModoCalendario = "mes" | "semana";

export interface Evento {
  id: string;
  titulo: string;
  tipo: string;
  fecha?: string;
  esCapitulo?: boolean;
}

export const DIAS_SEMANA_CORTO = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const DIAS_SEMANA_LETRA = ["D", "L", "M", "X", "J", "V", "S"];
export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
export const VISTAS: { valor: VistaOpcion; label: string; short: string }[] = [
  { valor: 1, label: "Día",      short: "1D" },
  { valor: 2, label: "2 Días",   short: "2D" },
  { valor: 3, label: "3 Días",   short: "3D" },
  { valor: 4, label: "4 Días",   short: "4D" },
  { valor: 5, label: "Semana L", short: "5D" },
  { valor: 7, label: "Semana",   short: "7D" },
];

export const COLORES_EVENTO: Record<string, string> = {
  "Plan":              "bg-primary/10 text-primary border-primary/15",
  "Lanzamiento Libro": "bg-amber-50 text-amber-700 border-amber-200",
  "Reunión":           "bg-blue-50 text-blue-700 border-blue-200",
  "Personal":          "bg-emerald-50 text-emerald-700 border-emerald-200",
  "default":           "bg-primary/8 text-primary/70 border-primary/10",
};

export const TIPOS_EVENTO = ["Plan", "Reunión", "Personal"] as const;

// Componente compartido entre VistaMes y VistaSemanal
export const EventoBadge = ({ item, compact = false }: { item: Evento; compact?: boolean }) => {
  const color = COLORES_EVENTO[item.tipo] ?? COLORES_EVENTO["default"];
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-[var(--radius-btn)] border px-2 py-1 flex items-center gap-1.5 cursor-default select-none",
        color,
        compact ? "text-[9px]" : "text-[10px]"
      )}
    >
      {item.esCapitulo && <BookOpen size={9} className="shrink-0" />}
      <span className="font-black uppercase tracking-tight truncate">{item.titulo}</span>
    </MotionDiv>
  );
};

export const addDays = (date: Date, n: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

export const isSameDay = (a: Date, b: Date) =>
  a.getUTCFullYear() === b.getUTCFullYear() &&
  a.getUTCMonth() === b.getUTCMonth() &&
  a.getUTCDate() === b.getUTCDate();

export const toUTCDate = (str: string) => {
  const d = new Date(str);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};