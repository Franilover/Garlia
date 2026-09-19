/**
 * InterpretacionHumanaPanel.tsx
 *
 * Presentación común del modo Escritor para Elemento, Compuesto, Material y
 * Objeto. No conoce fórmulas ni umbrales: consume directamente el resultado
 * del intérprete humano canónico de Supabase.
 */

"use client";

import React, { useMemo } from "react";

import {
  useInterpretacionHumana,
  type EntidadHumanaTipo,
} from "./interpretacionHumana";

function nombreGrupo(grupo: string | null): string | null {
  if (!grupo) return null;
  return grupo
    .replaceAll("_", " ")
    .replace(/^./, (c) => c.toUpperCase());
}

export function InterpretacionHumanaPanel({
  entidadTipo,
  entidadId,
}: {
  entidadTipo: EntidadHumanaTipo;
  entidadId: string;
}) {
  const { filas, loading, error } = useInterpretacionHumana(entidadTipo, entidadId);

  const grupos = useMemo(() => {
    const visibles = filas.filter(
      (fila) =>
        fila.valor_mostrable &&
        fila.interpretacion_humana?.nivel &&
        fila.interpretacion_humana.significado,
    );

    const result: { clave: string; nombre: string | null; filas: typeof visibles }[] = [];

    for (const fila of visibles) {
      const clave = fila.grupo_presentacion ?? "_sin_grupo";
      const ultimo = result[result.length - 1];
      if (ultimo?.clave === clave) {
        ultimo.filas.push(fila);
      } else {
        result.push({
          clave,
          nombre: nombreGrupo(fila.grupo_presentacion),
          filas: [fila],
        });
      }
    }

    return result;
  }, [filas]);

  if (loading) {
    return <p className="text-micro text-primary/30 italic py-1">Interpretando propiedades…</p>;
  }

  if (error) {
    return (
      <p className="text-micro text-primary/35 italic py-1" title={error}>
        No se pudo cargar la interpretación humana.
      </p>
    );
  }

  if (grupos.length === 0) {
    return <p className="text-micro text-primary/30 italic py-1">Sin propiedades humanas disponibles.</p>;
  }

  return (
    <div className="flex flex-col gap-2.5 min-w-0 p-2">
      {grupos.map((grupo, index) => (
        <section key={grupo.clave} className="flex flex-col gap-1.5 min-w-0">
          {grupo.nombre && (
            <span className="text-[9px] font-black uppercase tracking-[0.12em] text-primary/35 px-2">
              {grupo.nombre}
            </span>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 min-w-0">
            {grupo.filas.map((fila) => {
              const humano = fila.interpretacion_humana;
              if (!humano?.nivel || !humano.significado) return null;

              return (
                <div
                  key={fila.propiedad_id}
                  title={humano.significado}
                  className="flex flex-col gap-0.5 min-w-0 px-2 py-1.5 rounded-lg border border-accent/20 bg-accent/[0.06]"
                >
                  <div className="flex items-center justify-between gap-1 min-w-0">
                    <span className="text-micro font-bold text-accent/60 truncate">
                      {fila.propiedad_nombre}
                    </span>
                    <span className="text-micro font-black text-accent capitalize shrink-0 truncate max-w-[8rem] text-right">
                      {humano.nivel}
                    </span>
                  </div>
                  <span className="text-[10px] leading-snug text-primary/50">
                    {humano.significado}
                  </span>
                </div>
              );
            })}
          </div>
          {index < grupos.length - 1 && <div className="border-t border-primary/10" />}
        </section>
      ))}
    </div>
  );
}

export default InterpretacionHumanaPanel;
