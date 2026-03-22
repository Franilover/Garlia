
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