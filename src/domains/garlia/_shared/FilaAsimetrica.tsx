"use client";

/**
 * FilaAsimetrica.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Fila de 2 o 3 bloques (Compuestos/Estructuras/Materiales,
 * Reacciones/Procesos/Fenómenos, Física·minerales/Biología) que decide su
 * propio layout según cuántos ítems tiene cada uno:
 *
 * - Si los bloques tienen una cantidad de ítems comparable, se reparten en
 *   columnas iguales (mitad y mitad con 2 bloques, tercios con 3).
 * - Si uno de los bloques tiene MUCHOS más ítems que el resto, ese bloque
 *   pasa a ocupar 2/3 del ancho:
 *   - Con 3 bloques, los otros dos se apilan verticalmente en el 1/3
 *     restante (evita el hueco vacío enorme que quedaba al lado de un
 *     bloque con pocos ítems, ej. Compuestos con ~90 vs Estructuras con
 *     ~35 y Materiales con ~24).
 *   - Con 2 bloques, el otro simplemente ocupa el 1/3 restante (no hay
 *     nada más para apilar).
 *
 * "Muchos más" = al menos 1.5x la suma de los demás (umbral simple y
 * legible, no una fórmula de proporciones). Cuando hay empate entre dos
 * candidatos a "grande", se prioriza el primero (izquierda) para mantener
 * el orden visual estable en vez de saltar entre layouts al cambiar un
 * ítem cerca del umbral.
 *
 * Con 4 bloques (ej. Compuestos/Estructuras/Materiales/Geometrías) no se
 * aplica la lógica de "bloque dominante" — directamente 2 columnas × 2
 * filas, simétrico. Es el caso más simple y evita reglas de dominancia
 * poco legibles con 4 ítems (¿qué pasa si dos son grandes a la vez?).
 */

import React from "react";

import {
  CabeceraSeccionConMenu,
  type ItemEditable,
} from "./CabeceraSeccionConMenu";

interface Bloque {
  key: string;
  titulo: string;
  total: number;
  contenido: React.ReactNode;
  /** Ítems del catálogo de este bloque, para el modal "Editar" del título
   *  (click en título → Añadir/Editar). Si se omite (junto con los
   *  callbacks de abajo), el título queda como antes: solo texto, sin
   *  menú clicable — ver CabeceraSeccionConMenu.tsx. */
  items?: ItemEditable[];
  onAñadir?: () => void | Promise<void>;
  onRenombrar?: (id: string, nuevoNombre: string) => void | Promise<void>;
  onEliminar?: (id: string) => void | Promise<void>;
  añadiendo?: boolean;
}

const UMBRAL_DOMINANCIA = 1.5;

function elegirBloqueGrande(bloques: Bloque[]): number | null {
  // 4 bloques → siempre 2×2 simétrico, nunca "bloque dominante".
  if (bloques.length !== 2 && bloques.length !== 3) return null;
  for (let i = 0; i < bloques.length; i++) {
    const resto = bloques.reduce((suma, b, j) => (j === i ? suma : suma + b.total), 0);
    if (bloques[i].total >= UMBRAL_DOMINANCIA * Math.max(resto, 1)) {
      return i;
    }
  }
  return null;
}

export function FilaAsimetrica({ bloques }: { bloques: Bloque[] }) {
  const idxGrande = elegirBloqueGrande(bloques);
  const columnas = bloques.length;

  if (columnas === 4) {
    // 2 columnas × 2 filas, apilado a 1 columna en mobile. Sin bloque
    // dominante: cada celda ocupa su cuadrante tal cual.
    return (
      <div className="grid grid-cols-1 md:grid-cols-2">
        {bloques.map((bloque) => (
          <div key={bloque.key} className="min-w-0">
            <CabeceraSeccionConMenu
              titulo={bloque.titulo}
              items={bloque.items}
              onAñadir={bloque.onAñadir}
              onRenombrar={bloque.onRenombrar}
              onEliminar={bloque.onEliminar}
              añadiendo={bloque.añadiendo}
            />
            {bloque.contenido}
          </div>
        ))}
      </div>
    );
  }

  if (idxGrande === null) {
    // Reparto simétrico — columnas iguales (mitad y mitad con 2 bloques,
    // tercios con 3), apiladas en mobile. Clase explícita (no interpolada)
    // porque Tailwind purga clases armadas por template string en runtime.
    const colsClase = columnas === 2 ? "md:grid-cols-2" : "md:grid-cols-3";
    return (
      <div className={`grid grid-cols-1 ${colsClase}`}>
        {bloques.map((bloque) => (
          <div key={bloque.key} className="min-w-0">
            <CabeceraSeccionConMenu
              titulo={bloque.titulo}
              items={bloque.items}
              onAñadir={bloque.onAñadir}
              onRenombrar={bloque.onRenombrar}
              onEliminar={bloque.onEliminar}
              añadiendo={bloque.añadiendo}
            />
            {bloque.contenido}
          </div>
        ))}
      </div>
    );
  }

  const grande = bloques[idxGrande];
  const chicos = bloques.filter((_, i) => i !== idxGrande);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3">
      <div className="min-w-0 md:col-span-2">
        <CabeceraSeccionConMenu
          titulo={grande.titulo}
          items={grande.items}
          onAñadir={grande.onAñadir}
          onRenombrar={grande.onRenombrar}
          onEliminar={grande.onEliminar}
          añadiendo={grande.añadiendo}
        />
        {grande.contenido}
      </div>
      <div className="min-w-0 flex flex-col">
        {chicos.map((bloque) => (
          <div key={bloque.key}>
            <CabeceraSeccionConMenu
              titulo={bloque.titulo}
              items={bloque.items}
              onAñadir={bloque.onAñadir}
              onRenombrar={bloque.onRenombrar}
              onEliminar={bloque.onEliminar}
              añadiendo={bloque.añadiendo}
            />
            {bloque.contenido}
          </div>
        ))}
      </div>
    </div>
  );
}
