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

import React, { useMemo, useState } from "react";

import { useLaboratorioPropiedades } from "./useLaboratorioPropiedades";
import { useSimuladorCompuesto } from "./useSimuladorCompuesto";
import type { EntidadLab, SugerenciaPropiedadLab } from "./laboratorioPropiedades.types";

type ModoLab = "buscar" | "simular";

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

/** Etiquetas legibles para las claves que devuelve la RPC de simulación —
 *  mismo criterio que ETIQUETAS_METRICA en GridPropiedadesCalculadas.tsx,
 *  duplicado acá porque esa constante no está exportada y el set de claves
 *  de esta RPC es chico y fijo (compuesto simulado, no genérico). */
const ETIQUETAS_SIMULACION: Record<string, string> = {
  masa: "Masa",
  carga: "Carga",
  volumen_real: "Volumen",
  densidad_real: "Densidad",
  estabilidad: "Estabilidad",
  rigidez: "Rigidez",
  flexibilidad: "Flexibilidad",
  dureza: "Dureza",
  conductividad: "Conductividad",
  transparencia: "Transparencia",
  interaccion: "Interacción",
};

/** Estas son índices [0,1] con barra de proporción — el resto (masa,
 *  carga, volumen, densidad) son magnitudes abiertas, mismo criterio que
 *  propiedadesCalculadasGenerico en GridPropiedadesCalculadas.tsx. */
const CLAVES_INDICE = new Set([
  "estabilidad",
  "rigidez",
  "flexibilidad",
  "dureza",
  "conductividad",
  "transparencia",
  "interaccion",
]);

function SimuladorCompuestoPanel() {
  const {
    disponibles,
    seleccionados,
    agregarElemento,
    quitarElemento,
    limpiar,
    simular,
    resultado,
    loadingElementos,
    loadingSimulacion,
    error,
  } = useSimuladorCompuesto();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-black text-primary/80">
          Laboratorio · Simulador de combinaciones <span className="font-medium text-primary/35">· VIS-17</span>
        </p>
        <p className="mt-1.5 text-[11px] leading-5 text-primary/45">
          Elegí 2 o más Elementos y mirá qué Compuesto resultaría de combinarlos en
          partes iguales — la misma fórmula que usa el motor para un Compuesto real,
          aplicada a una combinación que todavía no existe en el catálogo. No se crea
          ni se guarda nada.
        </p>
      </div>

      {loadingElementos ? (
        <LoadingRow>Cargando catálogo de elementos…</LoadingRow>
      ) : (
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) agregarElemento(e.target.value);
          }}
          className="w-full max-w-sm rounded-lg border border-primary/15 bg-transparent px-3.5 py-2.5 text-xs font-black text-primary/85 outline-none transition-colors hover:border-primary/30 focus:border-primary/40"
        >
          <option value="" disabled>
            + Agregar elemento a la combinación…
          </option>
          {disponibles.map((el) => (
            <option key={el.id} value={el.id} className="bg-[var(--bg-main)] text-primary">
              {el.nombre}
            </option>
          ))}
        </select>
      )}

      {seleccionados.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {seleccionados.map((el) => (
            <span
              key={el.id}
              className="inline-flex items-center gap-2 rounded-full border border-primary/15 py-1.5 pl-3.5 pr-2 text-xs font-black text-primary/80"
            >
              {el.nombre}
              <button
                type="button"
                onClick={() => quitarElemento(el.id)}
                className="rounded-full px-1.5 py-0.5 text-[10px] font-black text-primary/35 transition-colors hover:text-red-400"
                aria-label={`Quitar ${el.nombre}`}
              >
                ✕
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={limpiar}
            className="text-[10px] font-black uppercase tracking-wider text-primary/35 transition-colors hover:text-primary/60"
          >
            Limpiar todo
          </button>
        </div>
      ) : (
        <EmptyRow>Todavía no elegiste ningún elemento.</EmptyRow>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={simular}
          disabled={loadingSimulacion || seleccionados.length < 2}
          className="rounded-lg bg-accent px-5 py-2.5 text-xs font-black text-[var(--bg-main)] transition-opacity disabled:opacity-30"
        >
          {loadingSimulacion ? "Simulando…" : "Simular compuesto"}
        </button>
        {seleccionados.length === 1 ? (
          <span className="text-[10px] font-bold text-primary/35">Elegí al menos un elemento más.</span>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs font-bold text-red-400">
          {error}
        </div>
      ) : null}

      {resultado ? (
        <div className="rounded-xl border border-primary/10 p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary/35">
            Compuesto simulado a partir de {resultado.elementos?.map((e) => e.nombre).join(" + ")}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {(
              [
                "masa",
                "carga",
                "volumen_real",
                "densidad_real",
                "estabilidad",
                "rigidez",
                "flexibilidad",
                "dureza",
                "conductividad",
                "transparencia",
                "interaccion",
              ] as const
            ).map((clave) => {
              const valor = resultado[clave];
              if (valor === null || valor === undefined) return null;
              const esIndice = CLAVES_INDICE.has(clave);
              return (
                <div
                  key={clave}
                  className="flex flex-col gap-1 rounded-md border border-primary/10 bg-primary/5 px-2.5 py-2"
                >
                  <span className="truncate text-[9px] font-black uppercase tracking-widest text-primary/35">
                    {ETIQUETAS_SIMULACION[clave] ?? clave}
                  </span>
                  <span className="text-micro font-black text-primary/80">
                    {Number(valor).toFixed(esIndice ? 3 : 4)}
                  </span>
                  {esIndice ? (
                    <div className="h-1 overflow-hidden rounded-full bg-primary/10">
                      <div
                        className="h-full rounded-full bg-accent/50"
                        style={{ width: `${Math.max(0, Math.min(1, Number(valor))) * 100}%` }}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {resultado.nota ? (
            <p className="mt-3 text-[10px] leading-4 text-primary/35">{resultado.nota}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ─── Sección principal ──────────────────────────────────────────────────────

export function LaboratorioPropiedadesSection() {
  const [modo, setModo] = useState<ModoLab>("simular");
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

  const toggleModo = (
    <div className="inline-flex rounded-lg border border-primary/15 p-1">
      {(
        [
          { key: "simular" as const, label: "Simular combinación" },
          { key: "buscar" as const, label: "Buscar por propiedad" },
        ]
      ).map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => setModo(o.key)}
          className={`rounded-md px-3.5 py-1.5 text-xs font-black transition-colors ${
            modo === o.key ? "bg-primary/10 text-primary/90" : "text-primary/40 hover:text-primary/60"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );

  if (modo === "simular") {
    return (
      <div className="flex flex-col gap-6">
        {toggleModo}
        <SimuladorCompuestoPanel />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {toggleModo}

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
