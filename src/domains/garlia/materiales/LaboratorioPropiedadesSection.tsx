"use client";

/**
 * LaboratorioPropiedadesSection.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * VIS-17 "Laboratorio", slice "Buscador por propiedad" — sección del grupo
 * "Lab" del Visualizador.
 *
 * Flujo: el usuario elige entre buscar en Compuestos o en Materiales, arma
 * uno o más requisitos ("dureza mínima 0.6", "conductividad reactiva entre
 * 0.2 y 0.5"...) tomando las propiedades de un catálogo oficial que viene
 * de Supabase, y pide "Buscar". El resultado es el ranking real que
 * devuelve el motor (sugerir_compuestos_por_propiedades /
 * sugerir_materiales_por_propiedades_v3), no una aproximación calculada acá.
 *
 * Mismo lenguaje visual que el resto del Visualizador (StatusPill,
 * LoadingRow, EmptyRow, tarjetas con borde primary/10) — redefinidos acá
 * localmente porque VisualizadorPage.tsx no los exporta, mismo patrón que
 * ya usa MapaUniversalSection.tsx.
 */

import React, { useMemo } from "react";

import { useLaboratorioPropiedades } from "./useLaboratorioPropiedades";
import type { EntidadLab, SugerenciaPropiedadLab } from "./laboratorioPropiedades.types";

// ─── Primitivas visuales locales (mismas clases que el resto del Visualizador) ─

function StatusPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-primary/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary/50">
      {children}
    </span>
  );
}

function LoadingRow({ children = "Cargando datos reales desde Supabase…" }: { children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-primary/10 p-5 text-xs font-bold text-primary/35">
      <span className="h-2 w-2 animate-pulse rounded-full bg-primary/40" />
      {children}
    </div>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-primary/15 p-5 text-xs leading-5 text-primary/40">
      {children}
    </div>
  );
}

// ─── Sub-componentes ────────────────────────────────────────────────────────

function ToggleEntidad({
  entidad,
  onChange,
}: {
  entidad: EntidadLab;
  onChange: (e: EntidadLab) => void;
}) {
  const opciones: { key: EntidadLab; label: string }[] = [
    { key: "material", label: "Materiales" },
    { key: "compuesto", label: "Compuestos" },
  ];
  return (
    <div className="inline-flex rounded-lg border border-primary/15 p-1">
      {opciones.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`rounded-md px-3.5 py-1.5 text-xs font-black transition-colors ${
            entidad === o.key
              ? "bg-primary/10 text-primary/90"
              : "text-primary/40 hover:text-primary/60"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Una fila de requisito: nombre de la propiedad + inputs de mínimo/máximo
 *  + botón de quitar. `rango` viene del catálogo oficial (propiedades_derivadas)
 *  y solo se usa como placeholder/hint — no se clampea el input contra él
 *  porque Supabase es quien valida en última instancia. */
function FilaRequisito({
  clave,
  nombre,
  rangoMin,
  rangoMax,
  min,
  max,
  onCambiar,
  onQuitar,
}: {
  clave: string;
  nombre: string;
  rangoMin: number | null;
  rangoMax: number | null;
  min: number | null;
  max: number | null;
  onCambiar: (cambios: { min?: number | null; max?: number | null }) => void;
  onQuitar: () => void;
}) {
  const parse = (v: string): number | null => (v.trim() === "" ? null : Number(v));

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/10 px-4 py-3">
      <div className="min-w-[9rem] flex-1">
        <p className="text-xs font-black text-primary/80">{nombre}</p>
        <p className="text-[10px] text-primary/35">
          {clave}
          {rangoMin !== null || rangoMax !== null
            ? ` · rango típico ${rangoMin ?? "…"}–${rangoMax ?? "…"}`
            : ""}
        </p>
      </div>
      <label className="flex items-center gap-1.5 text-[10px] font-bold text-primary/45">
        mín.
        <input
          type="number"
          step="0.01"
          value={min ?? ""}
          onChange={(e) => onCambiar({ min: parse(e.target.value) })}
          placeholder={rangoMin !== null ? String(rangoMin) : "—"}
          className="w-20 rounded-md border border-primary/15 bg-transparent px-2 py-1 text-xs font-black text-primary/85 outline-none focus:border-primary/40"
        />
      </label>
      <label className="flex items-center gap-1.5 text-[10px] font-bold text-primary/45">
        máx.
        <input
          type="number"
          step="0.01"
          value={max ?? ""}
          onChange={(e) => onCambiar({ max: parse(e.target.value) })}
          placeholder={rangoMax !== null ? String(rangoMax) : "—"}
          className="w-20 rounded-md border border-primary/15 bg-transparent px-2 py-1 text-xs font-black text-primary/85 outline-none focus:border-primary/40"
        />
      </label>
      <button
        type="button"
        onClick={onQuitar}
        className="rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wider text-primary/35 transition-colors hover:text-red-400"
      >
        Quitar
      </button>
    </div>
  );
}

function TarjetaResultado({ fila, posicion }: { fila: SugerenciaPropiedadLab; posicion: number }) {
  const pct = Math.round(fila.puntuacion * 100);
  return (
    <div className="rounded-xl border border-primary/10 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-black text-primary/60">
            {posicion}
          </span>
          <p className="text-xs font-black text-primary/85">{fila.nombre}</p>
        </div>
        <StatusPill>{pct}% match</StatusPill>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary/10">
        <div
          className="h-full rounded-full bg-accent/60"
          style={{ width: `${pct}%` }}
        />
      </div>

      {fila.coincidencias.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {fila.coincidencias.map((c) => (
            <span
              key={c.propiedad}
              className={`rounded-md px-2 py-1 text-[10px] font-bold ${
                c.cumple
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-red-500/10 text-red-400"
              }`}
              title={`${c.propiedad}: ${c.valor ?? "sin dato"}`}
            >
              {c.propiedad} · {c.valor !== null ? c.valor.toFixed(3) : "—"}
            </span>
          ))}
        </div>
      ) : null}

      <details className="mt-3">
        <summary className="cursor-pointer text-[10px] font-black uppercase tracking-widest text-primary/35">
          Todas las propiedades ({Object.keys(fila.propiedades).length})
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {Object.entries(fila.propiedades).map(([clave, valor]) => (
            <div
              key={clave}
              className="flex flex-col gap-0.5 rounded-md border border-primary/10 bg-primary/5 px-2 py-1.5"
            >
              <span className="truncate text-[9px] font-black uppercase tracking-widest text-primary/35">
                {clave}
              </span>
              <span className="text-micro font-black text-primary/70">
                {typeof valor === "number" ? Number(valor.toFixed(4)) : String(valor)}
              </span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

// ─── Sección principal ──────────────────────────────────────────────────────

export function LaboratorioPropiedadesSection() {
  const {
    catalogo,
    loadingCatalogo,
    requisitos,
    agregarRequisito,
    quitarRequisito,
    actualizarRequisito,
    requisitosValidos,
    entidad,
    setEntidad,
    resultados,
    loadingResultados,
    error,
    buscado,
    buscar,
  } = useLaboratorioPropiedades();

  const catalogoPorClave = useMemo(() => {
    const mapa = new Map<string, { nombre: string; rango_min: number | null; rango_max: number | null }>();
    for (const p of catalogo) mapa.set(p.clave, p);
    return mapa;
  }, [catalogo]);

  const clavesDisponibles = useMemo(
    () => catalogo.filter((p) => !requisitos.some((r) => r.clave === p.clave)),
    [catalogo, requisitos],
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-black text-primary/80">
          Laboratorio · Buscador por propiedad <span className="font-medium text-primary/35">· VIS-17</span>
        </p>
        <p className="mt-1.5 text-[11px] leading-5 text-primary/45">
          Elegí qué propiedad(es) física(s) o reactiva(s) te interesan y un umbral —
          el motor busca en el catálogo real de Compuestos o Materiales cuáles las
          cumplen mejor. El ranking y los valores son los que ya calculó Supabase,
          no una estimación del visualizador.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ToggleEntidad entidad={entidad} onChange={setEntidad} />
        {loadingCatalogo ? (
          <span className="text-[10px] font-bold text-primary/35">Cargando catálogo de propiedades…</span>
        ) : null}
      </div>

      {/* Selector para agregar un requisito nuevo */}
      {!loadingCatalogo && clavesDisponibles.length > 0 ? (
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) agregarRequisito(e.target.value);
          }}
          className="w-full max-w-sm rounded-lg border border-primary/15 bg-transparent px-3.5 py-2.5 text-xs font-black text-primary/85 outline-none transition-colors hover:border-primary/30 focus:border-primary/40"
        >
          <option value="" disabled>
            + Agregar propiedad objetivo…
          </option>
          {clavesDisponibles.map((p) => (
            <option key={p.id} value={p.clave} className="bg-[var(--bg-main)] text-primary">
              {p.nombre}
            </option>
          ))}
        </select>
      ) : null}

      {!loadingCatalogo && catalogo.length === 0 ? (
        <EmptyRow>
          No hay propiedades marcadas como oficiales todavía en propiedades_catalogo_v3 —
          nada que ofrecer en el selector hasta que existan.
        </EmptyRow>
      ) : null}

      {/* Requisitos armados */}
      {requisitos.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {requisitos.map((r) => {
            const info = catalogoPorClave.get(r.clave);
            return (
              <FilaRequisito
                key={r.clave}
                clave={r.clave}
                nombre={info?.nombre ?? r.clave}
                rangoMin={info?.rango_min ?? null}
                rangoMax={info?.rango_max ?? null}
                min={r.min}
                max={r.max}
                onCambiar={(cambios) => actualizarRequisito(r.clave, cambios)}
                onQuitar={() => quitarRequisito(r.clave)}
              />
            );
          })}
        </div>
      ) : !loadingCatalogo ? (
        <EmptyRow>Todavía no agregaste ninguna propiedad objetivo.</EmptyRow>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={buscar}
          disabled={loadingResultados || requisitosValidos.length === 0}
          className="rounded-lg bg-accent px-5 py-2.5 text-xs font-black text-[var(--bg-main)] transition-opacity disabled:opacity-30"
        >
          {loadingResultados ? "Buscando…" : "Buscar combinaciones"}
        </button>
        {requisitosValidos.length === 0 && requisitos.length > 0 ? (
          <span className="text-[10px] font-bold text-primary/35">
            Poné al menos un mínimo o máximo en alguna propiedad para poder buscar.
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs font-bold text-red-400">
          {error}
        </div>
      ) : null}

      {loadingResultados ? <LoadingRow>Consultando el motor…</LoadingRow> : null}

      {!loadingResultados && buscado && !error ? (
        resultados.length > 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary/35">
              {resultados.length} resultado{resultados.length === 1 ? "" : "s"} — ordenado por
              coincidencia
            </p>
            {resultados.map((fila, i) => (
              <TarjetaResultado key={fila.id} fila={fila} posicion={i + 1} />
            ))}
          </div>
        ) : (
          <EmptyRow>
            Ningún {entidad === "material" ? "material" : "compuesto"} del catálogo cumple estos
            requisitos todavía. Probá bajar el mínimo o quitar alguna propiedad.
          </EmptyRow>
        )
      ) : null}
    </div>
  );
}

export default LaboratorioPropiedadesSection;
