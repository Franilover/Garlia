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
import {
  crearCompuestoDesdeElementos,
  crearMaterialDesdeCompuestos,
  sugerirNombreCombinacion,
} from "./laboratorioPropiedadesService";
import { useRankingParesCompuestos } from "./useRankingParesCompuestos";
import { useRankingParesElementos } from "./useRankingParesElementos";
import { useSimuladorCompuesto } from "./useSimuladorCompuesto";
import { useSimuladorMaterial } from "./useSimuladorMaterial";
import type {
  EntidadLab,
  ParCompuestosSugerido,
  ParElementosSugerido,
  ResultadoCreacionCompuestoLab,
  ResultadoCreacionMaterialLab,
  SugerenciaPropiedadLab,
} from "./laboratorioPropiedades.types";

type ModoLab = "ranking" | "buscarExistente" | "simular";
type NivelSimulacion = "elementoACompuesto" | "compuestoAMaterial";
type NivelRanking = "elementosACompuesto" | "compuestosAMaterial";

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

/**
 * Botón "Crear compuesto"/"Crear material" que cuelga de una combinación ya
 * calculada (fila de ranking o resultado de simulación).
 *
 * Flujo en 2 pasos, nunca crea sin que el usuario vea y pueda editar el
 * nombre primero:
 *   1) click en "Crear…" → pide un nombre sugerido vía
 *      fn_generar_nombre_material_v1 (fragmentos fonéticos + sufijo,
 *      mismo patrón que el resto del catálogo) y lo muestra en un input
 *      editable, con botón "Confirmar".
 *   2) "Confirmar" → llama a la RPC de escritura real
 *      (fn_worldbuilder_crear_compuesto / fn_worldbuilder_crear_material)
 *      con el nombre que haya quedado en el input.
 *
 * No repite la creación si ya se creó (evita duplicados por doble click) —
 * para combinar de nuevo hay que armar otra combinación.
 */
function BotonCrearDesdeCombinacion<T extends ResultadoCreacionCompuestoLab | ResultadoCreacionMaterialLab>({
  etiqueta,
  etiquetaCreando,
  nombresBase,
  categoria,
  onSugerirNombre,
  onCrear,
  onVerEnCatalogo,
}: {
  etiqueta: string;
  etiquetaCreando: string;
  nombresBase: string[];
  categoria?: string;
  onSugerirNombre: (nombresBase: string[], categoria?: string) => Promise<string>;
  onCrear: (nombre: string) => Promise<T>;
  onVerEnCatalogo?: (resultado: T) => void;
}) {
  const [estado, setEstado] = useState<"idle" | "sugiriendo" | "editando" | "creando" | "creado" | "error">("idle");
  const [nombre, setNombre] = useState("");
  const [resultado, setResultado] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleIniciar = async () => {
    setEstado("sugiriendo");
    setError(null);
    try {
      const sugerido = await onSugerirNombre(nombresBase, categoria);
      setNombre(sugerido);
      setEstado("editando");
    } catch (e) {
      console.error("[BotonCrearDesdeCombinacion] error sugiriendo nombre:", e);
      // Sin nombre sugerido igual se puede seguir: el usuario escribe uno a mano.
      setNombre("");
      setEstado("editando");
    }
  };

  const handleConfirmar = async () => {
    if (!nombre.trim()) {
      setError("Ponele un nombre antes de crear.");
      return;
    }
    setEstado("creando");
    setError(null);
    try {
      const r = await onCrear(nombre.trim());
      setResultado(r);
      setEstado("creado");
    } catch (e) {
      console.error("[BotonCrearDesdeCombinacion] error creando:", e);
      setError(e instanceof Error ? e.message : "No se pudo crear. Probá de nuevo.");
      setEstado("editando");
    }
  };

  if (estado === "creado" && resultado) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400/80">Creado</span>
        <span className="text-xs font-black text-primary/85">{resultado.nombre}</span>
        {onVerEnCatalogo ? (
          <button
            type="button"
            onClick={() => onVerEnCatalogo(resultado)}
            className="text-[10px] font-black uppercase tracking-wider text-accent/80 transition-colors hover:text-accent"
          >
            Ver en catálogo →
          </button>
        ) : null}
      </div>
    );
  }

  if (estado === "editando" || estado === "creando") {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            disabled={estado === "creando"}
            placeholder="Nombre…"
            className="w-full max-w-[220px] rounded-lg border border-primary/15 bg-transparent px-3 py-2 text-xs font-black text-primary/85 outline-none transition-colors hover:border-primary/30 focus:border-primary/40 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={estado === "creando"}
            className="rounded-lg bg-accent px-3.5 py-2 text-[11px] font-black text-[var(--bg-main)] transition-opacity disabled:opacity-40"
          >
            {estado === "creando" ? etiquetaCreando : "Confirmar"}
          </button>
        </div>
        {error ? <span className="text-[10px] font-bold text-red-400">{error}</span> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={handleIniciar}
        disabled={estado === "sugiriendo"}
        className="w-fit rounded-lg border border-accent/30 bg-accent/10 px-3.5 py-2 text-[11px] font-black text-accent transition-colors hover:bg-accent/20 disabled:opacity-40"
      >
        {estado === "sugiriendo" ? "Pensando un nombre…" : etiqueta}
      </button>
    </div>
  );
}

function TarjetaParElemento({ par, posicion, propiedad }: { par: ParElementosSugerido; posicion: number; propiedad: string }) {
  return (
    <div className="rounded-xl border border-primary/10 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-black text-primary/60">
            {posicion}
          </span>
          <p className="text-xs font-black text-primary/85">
            {par.elementoANombre} <span className="font-medium text-primary/35">+</span> {par.elementoBNombre}
          </p>
        </div>
        <StatusPill>{par.valor.toFixed(3)}</StatusPill>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary/10">
        <div
          className="h-full rounded-full bg-accent/60"
          style={{ width: `${Math.max(0, Math.min(1, par.valor)) * 100}%` }}
        />
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-[10px] font-black uppercase tracking-widest text-primary/35">
          Compuesto resultante completo
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {Object.entries(par.propiedades).map(([clave, valor]) => (
            <div
              key={clave}
              className={`flex flex-col gap-0.5 rounded-md border px-2 py-1.5 ${
                clave === propiedad
                  ? "border-accent/30 bg-accent/10"
                  : "border-primary/10 bg-primary/5"
              }`}
            >
              <span className="truncate text-[9px] font-black uppercase tracking-widest text-primary/35">
                {clave}
              </span>
              <span className="text-micro font-black text-primary/70">
                {typeof valor === "number" ? valor.toFixed(4) : String(valor)}
              </span>
            </div>
          ))}
        </div>
      </details>

      <div className="mt-3">
        <BotonCrearDesdeCombinacion
          etiqueta="Crear este compuesto"
          etiquetaCreando="Creando compuesto…"
          nombresBase={[par.elementoANombre, par.elementoBNombre]}
          onSugerirNombre={sugerirNombreCombinacion}
          onCrear={(nombre) => crearCompuestoDesdeElementos(nombre, [par.elementoAId, par.elementoBId])}
        />
      </div>
    </div>
  );
}

function TarjetaParCompuesto({ par, posicion, propiedad }: { par: ParCompuestosSugerido; posicion: number; propiedad: string }) {
  return (
    <div className="rounded-xl border border-primary/10 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-black text-primary/60">
            {posicion}
          </span>
          <p className="text-xs font-black text-primary/85">
            {par.compuestoANombre} <span className="font-medium text-primary/35">+</span> {par.compuestoBNombre}
          </p>
        </div>
        <StatusPill>{par.valor.toFixed(3)}</StatusPill>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary/10">
        <div
          className="h-full rounded-full bg-accent/60"
          style={{ width: `${Math.max(0, Math.min(1, par.valor)) * 100}%` }}
        />
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-[10px] font-black uppercase tracking-widest text-primary/35">
          Material resultante completo
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {Object.entries(par.propiedades).map(([clave, valor]) => (
            <div
              key={clave}
              className={`flex flex-col gap-0.5 rounded-md border px-2 py-1.5 ${
                clave === propiedad
                  ? "border-accent/30 bg-accent/10"
                  : "border-primary/10 bg-primary/5"
              }`}
            >
              <span className="truncate text-[9px] font-black uppercase tracking-widest text-primary/35">
                {clave}
              </span>
              <span className="text-micro font-black text-primary/70">
                {typeof valor === "number" ? valor.toFixed(4) : String(valor)}
              </span>
            </div>
          ))}
        </div>
      </details>

      <div className="mt-3">
        <BotonCrearDesdeCombinacion
          etiqueta="Crear este material"
          etiquetaCreando="Creando material…"
          nombresBase={[par.compuestoANombre, par.compuestoBNombre]}
          onSugerirNombre={sugerirNombreCombinacion}
          onCrear={(nombre) => crearMaterialDesdeCompuestos(nombre, [par.compuestoAId, par.compuestoBId])}
        />
      </div>
    </div>
  );
}

function RankingParesCompuestosPanel() {
  const { propiedades, propiedad, setPropiedad, resultados, loading, error, buscado, buscar } =
    useRankingParesCompuestos();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={propiedad}
          onChange={(e) => setPropiedad(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-primary/15 bg-transparent px-3.5 py-2.5 text-xs font-black text-primary/85 outline-none transition-colors hover:border-primary/30 focus:border-primary/40"
        >
          {propiedades.map((p) => (
            <option key={p.clave} value={p.clave} className="bg-[var(--bg-main)] text-primary">
              {p.nombre}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={buscar}
          disabled={loading}
          className="rounded-lg bg-accent px-5 py-2.5 text-xs font-black text-[var(--bg-main)] transition-opacity disabled:opacity-30"
        >
          {loading ? "Calculando…" : "Ver top 20"}
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs font-bold text-red-400">
          {error}
        </div>
      ) : null}

      {loading ? <LoadingRow>Evaluando todas las combinaciones posibles…</LoadingRow> : null}

      {!loading && buscado && !error ? (
        resultados.length > 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary/35">
              Top {resultados.length} — ordenado por {propiedades.find((p) => p.clave === propiedad)?.nombre ?? propiedad}
            </p>
            {resultados.map((par, i) => (
              <TarjetaParCompuesto
                key={`${par.compuestoAId}-${par.compuestoBId}`}
                par={par}
                posicion={i + 1}
                propiedad={propiedad}
              />
            ))}
          </div>
        ) : (
          <EmptyRow>No se encontró ninguna combinación calculable para esta propiedad todavía.</EmptyRow>
        )
      ) : null}
    </div>
  );
}

function RankingParesElementosPanel() {
  const { propiedades, propiedad, setPropiedad, resultados, loading, error, buscado, buscar } =
    useRankingParesElementos();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={propiedad}
          onChange={(e) => setPropiedad(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-primary/15 bg-transparent px-3.5 py-2.5 text-xs font-black text-primary/85 outline-none transition-colors hover:border-primary/30 focus:border-primary/40"
        >
          {propiedades.map((p) => (
            <option key={p.clave} value={p.clave} className="bg-[var(--bg-main)] text-primary">
              {p.nombre}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={buscar}
          disabled={loading}
          className="rounded-lg bg-accent px-5 py-2.5 text-xs font-black text-[var(--bg-main)] transition-opacity disabled:opacity-30"
        >
          {loading ? "Calculando…" : "Ver top 20"}
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs font-bold text-red-400">
          {error}
        </div>
      ) : null}

      {loading ? <LoadingRow>Evaluando todas las combinaciones posibles…</LoadingRow> : null}

      {!loading && buscado && !error ? (
        resultados.length > 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary/35">
              Top {resultados.length} — ordenado por {propiedades.find((p) => p.clave === propiedad)?.nombre ?? propiedad}
            </p>
            {resultados.map((par, i) => (
              <TarjetaParElemento
                key={`${par.elementoAId}-${par.elementoBId}`}
                par={par}
                posicion={i + 1}
                propiedad={propiedad}
              />
            ))}
          </div>
        ) : (
          <EmptyRow>No se encontró ninguna combinación calculable para esta propiedad todavía.</EmptyRow>
        )
      ) : null}
    </div>
  );
}

/** Etiquetas legibles para las claves que devuelve la RPC de simulación —
 *  mismo criterio de respaldo visual que GridPropiedadesCalculadas.tsx,
 *  duplicado acá porque esa constante no está exportada y el set de claves
 *  de esta RPC es chico y fijo (compuesto simulado, no genérico). */
const ETIQUETAS_SIMULACION: Record<string, string> = {
  masa: "Masa",
  carga: "Carga",
  volumen: "Volumen",
  volumen_real: "Volumen",
  densidad: "Densidad",
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

          <div className="mt-4">
            <BotonCrearDesdeCombinacion
              etiqueta="Crear este compuesto"
              etiquetaCreando="Creando compuesto…"
              nombresBase={(resultado.elementos ?? []).map((e) => e.nombre)}
              onSugerirNombre={sugerirNombreCombinacion}
              onCrear={(nombre) =>
                crearCompuestoDesdeElementos(nombre, (resultado.elementos ?? []).map((e) => e.id))
              }
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SimuladorMaterialPanel() {
  const {
    disponibles,
    seleccionados,
    agregarCompuesto,
    quitarCompuesto,
    limpiar,
    simular,
    resultado,
    loadingCompuestos,
    loadingSimulacion,
    error,
  } = useSimuladorMaterial();

  return (
    <div className="flex flex-col gap-6">
      {loadingCompuestos ? (
        <LoadingRow>Cargando catálogo de compuestos…</LoadingRow>
      ) : (
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) agregarCompuesto(e.target.value);
          }}
          className="w-full max-w-sm rounded-lg border border-primary/15 bg-transparent px-3.5 py-2.5 text-xs font-black text-primary/85 outline-none transition-colors hover:border-primary/30 focus:border-primary/40"
        >
          <option value="" disabled>
            + Agregar compuesto a la combinación…
          </option>
          {disponibles.map((c) => (
            <option key={c.id} value={c.id} className="bg-[var(--bg-main)] text-primary">
              {c.nombre}
            </option>
          ))}
        </select>
      )}

      {seleccionados.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {seleccionados.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-2 rounded-full border border-primary/15 py-1.5 pl-3.5 pr-2 text-xs font-black text-primary/80"
            >
              {c.nombre}
              <button
                type="button"
                onClick={() => quitarCompuesto(c.id)}
                className="rounded-full px-1.5 py-0.5 text-[10px] font-black text-primary/35 transition-colors hover:text-red-400"
                aria-label={`Quitar ${c.nombre}`}
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
        <EmptyRow>Todavía no elegiste ningún compuesto.</EmptyRow>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={simular}
          disabled={loadingSimulacion || seleccionados.length < 2}
          className="rounded-lg bg-accent px-5 py-2.5 text-xs font-black text-[var(--bg-main)] transition-opacity disabled:opacity-30"
        >
          {loadingSimulacion ? "Simulando…" : "Simular material"}
        </button>
        {seleccionados.length === 1 ? (
          <span className="text-[10px] font-bold text-primary/35">Elegí al menos un compuesto más.</span>
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
            Material simulado a partir de {resultado.compuestos?.map((c) => c.nombre).join(" + ")}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {(
              [
                "masa",
                "carga",
                "volumen",
                "densidad",
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

          {resultado.fuente_fisica ? (
            <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-primary/35">
              fuente_fisica: {resultado.fuente_fisica}
            </p>
          ) : null}
          {resultado.nota ? (
            <p className="mt-1.5 text-[10px] leading-4 text-primary/35">{resultado.nota}</p>
          ) : null}

          <div className="mt-4">
            <BotonCrearDesdeCombinacion
              etiqueta="Crear este material"
              etiquetaCreando="Creando material…"
              nombresBase={(resultado.compuestos ?? []).map((c) => c.nombre)}
              onSugerirNombre={sugerirNombreCombinacion}
              onCrear={(nombre) =>
                crearMaterialDesdeCompuestos(nombre, (resultado.compuestos ?? []).map((c) => c.id))
              }
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── Sección principal ──────────────────────────────────────────────────────

export function LaboratorioPropiedadesSection() {
  const [modo, setModo] = useState<ModoLab>("ranking");
  const [nivel, setNivel] = useState<NivelSimulacion>("elementoACompuesto");
  const [nivelRanking, setNivelRanking] = useState<NivelRanking>("elementosACompuesto");
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
    <div className="inline-flex flex-wrap rounded-lg border border-primary/15 p-1">
      {(
        [
          { key: "ranking" as const, label: "¿Qué combino para conseguir X?" },
          { key: "simular" as const, label: "Simular combinación" },
          { key: "buscarExistente" as const, label: "Buscar en el catálogo" },
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

  if (modo === "ranking") {
    return (
      <div className="flex flex-col gap-6">
        {toggleModo}

        <div className="inline-flex w-fit rounded-lg border border-primary/10 p-1">
          {(
            [
              { key: "elementosACompuesto" as const, label: "Elementos → Compuesto" },
              { key: "compuestosAMaterial" as const, label: "Compuestos → Material" },
            ]
          ).map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => setNivelRanking(o.key)}
              className={`rounded-md px-3 py-1.5 text-[11px] font-black transition-colors ${
                nivelRanking === o.key ? "bg-primary/10 text-primary/80" : "text-primary/35 hover:text-primary/55"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {nivelRanking === "elementosACompuesto" ? (
          <RankingParesElementosPanel />
        ) : (
          <RankingParesCompuestosPanel />
        )}
      </div>
    );
  }

  if (modo === "simular") {
    return (
      <div className="flex flex-col gap-6">
        {toggleModo}

        <div className="inline-flex w-fit rounded-lg border border-primary/10 p-1">
          {(
            [
              { key: "elementoACompuesto" as const, label: "Elemento → Compuesto" },
              { key: "compuestoAMaterial" as const, label: "Compuesto → Material" },
            ]
          ).map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => setNivel(o.key)}
              className={`rounded-md px-3 py-1.5 text-[11px] font-black transition-colors ${
                nivel === o.key ? "bg-primary/10 text-primary/80" : "text-primary/35 hover:text-primary/55"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {nivel === "elementoACompuesto" ? <SimuladorCompuestoPanel /> : <SimuladorMaterialPanel />}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {toggleModo}

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
