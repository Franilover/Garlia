"use client";

/**
 * SimuladorEterium.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * "Simulador de requerimiento de Eterium" — laboratorio de experimentación
 * con el canon real de Supabase, abierto como panel flotante desde el botón
 * junto al título "Oris" en TodasLasBasesView (fisica/FisicaPage.tsx).
 *
 * REGLA PRINCIPAL: SUPABASE MANDA.
 * Este componente NO implementa fórmulas físicas, listas canónicas, límites,
 * costos ni reglas mágicas propias. Se limita a:
 *   1. leer catálogos y contratos existentes en Supabase (vistas/RPCs),
 *   2. recoger las entradas del usuario (Oris → proceso → objetivo →
 *      magnitudes físicas → práctica),
 *   3. invocar el resolutor unificado de Supabase,
 *   4. mostrar el resultado y su trazabilidad tal cual vienen del backend.
 *
 * Si un contrato canónico (vista o función) todavía no existe en esta base
 * de Supabase, el panel lo muestra como "no resoluble" con el nombre exacto
 * del contrato que falta — nunca calcula nada localmente ni inventa un
 * valor de reemplazo. Ver sección "Estado de los datos" del spec original.
 *
 * Contratos que este panel espera encontrar en Supabase (todos opcionales
 * en tiempo de ejecución: su ausencia no rompe la página, solo bloquea el
 * paso que depende de ellos):
 *   - v_oris_demanda_eterium_v2              (vista)
 *   - oris_procesos                          (tabla relacional)
 *   - v_magnitudes_requeridas_oris_canonicas_v1 (vista)
 *   - v_procesos_demanda_eterium_fisica_runtime_v1 (vista)
 *   - resolver_demanda_eterium_fisica_v1     (función/RPC)
 *   - calcular_requerimiento_eterium_proceso_v1 (función/RPC)
 *   - oris_iums                              (tabla relacional, ya usada
 *     en el resto de fisica/ vía useOrisConIums)
 */

import { AlertTriangle, ChevronDown, ChevronRight, FlaskConical, Loader2, RefreshCw } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

import { supabase } from "@/infra/supabase/supabase";

import type { Oris } from "./types";

// ─── Utilidades de error / estado "no resoluble" ───────────────────────────

/** Un paso del simulador que depende de un contrato de Supabase puntual.
 *  `bloqueado` trae el motivo exacto (contrato faltante, columna faltante,
 *  error de Postgres, etc.) tal cual lo reporta Supabase — nunca un mensaje
 *  inventado que disfrace el problema real. */
type EstadoContrato<T> =
  | { estado: "cargando" }
  | { estado: "ok"; datos: T }
  | { estado: "bloqueado"; contrato: string; motivo: string };

/** PostgREST/PostgreSQL reporta 42883 (función no existe) y PGRST202/PGRST205
 *  (recurso no encontrado en el schema cache) cuando el contrato canónico
 *  todavía no fue creado en esta base — son exactamente los casos que el
 *  spec pide mostrar como "no resoluble" en vez de fallback silencioso. */
function esContratoInexistente(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const codigo = error.code ?? "";
  const msg = (error.message ?? "").toLowerCase();
  return (
    codigo === "42883" ||
    codigo === "PGRST202" ||
    codigo === "PGRST205" ||
    codigo === "42P01" ||
    msg.includes("does not exist") ||
    msg.includes("could not find")
  );
}

function ContratoFaltante({ contrato, motivo }: { contrato: string; motivo: string }) {
  return (
    <div
      className="flex items-start gap-2 rounded-lg border px-3 py-2.5"
      style={{
        borderColor: "color-mix(in srgb, #f59e0b 30%, transparent)",
        background: "color-mix(in srgb, #f59e0b 6%, transparent)",
      }}
    >
      <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-500" />
      <div className="min-w-0 flex flex-col gap-0.5">
        <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
          No resoluble: falta el contrato de Supabase
        </p>
        <p className="text-micro font-mono text-primary/60 truncate">{contrato}</p>
        <p className="text-micro text-primary/40 leading-relaxed">{motivo}</p>
      </div>
    </div>
  );
}

// ─── Paso 1: Oris (fuente: v_oris_demanda_eterium_v2) ──────────────────────

interface FilaOrisDemanda {
  oris_id: string;
  nombre: string;
  dominio: string | null;
  formula: string | null;
  n_ium: number | null;
  n_uniones: number | null;
  e_organizacion: number | null;
  procesos_disponibles?: string[] | null;
  [key: string]: unknown;
}

function useOrisDemandaEterium() {
  const [estado, setEstado] = useState<EstadoContrato<FilaOrisDemanda[]>>({ estado: "cargando" });

  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data, error } = await supabase
        .from("v_oris_demanda_eterium_v2")
        .select("*")
        .order("nombre", { ascending: true });
      if (!vivo) return;
      if (error) {
        setEstado(
          esContratoInexistente(error)
            ? {
                estado: "bloqueado",
                contrato: "v_oris_demanda_eterium_v2",
                motivo: error.message,
              }
            : { estado: "bloqueado", contrato: "v_oris_demanda_eterium_v2", motivo: error.message },
        );
        return;
      }
      setEstado({ estado: "ok", datos: (data ?? []) as FilaOrisDemanda[] });
    })();
    return () => {
      vivo = false;
    };
  }, []);

  return estado;
}

// ─── Paso 2: procesos vinculados a un Oris (fuente: oris_procesos) ─────────

interface FilaOrisProceso {
  proceso_id: string;
  proceso_nombre: string;
  activo?: boolean | null;
  [key: string]: unknown;
}

function useProcesosDeOris(orisId: string | null) {
  const [estado, setEstado] = useState<EstadoContrato<FilaOrisProceso[]>>({ estado: "cargando" });

  useEffect(() => {
    if (!orisId) {
      setEstado({ estado: "ok", datos: [] });
      return;
    }
    let vivo = true;
    setEstado({ estado: "cargando" });
    (async () => {
      // Relación real oris_procesos → procesos, filtrando activos. Se pide
      // el join embebido de PostgREST; si "procesos" no expone esas
      // columnas (nombre/activo) el error de esquema cae en el mismo
      // camino de "contrato faltante" — no se hardcodea el join alternativo.
      const { data, error } = await supabase
        .from("oris_procesos")
        .select("proceso_id, activo, procesos(id, nombre)")
        .eq("oris_id", orisId);
      if (!vivo) return;
      if (error) {
        setEstado({ estado: "bloqueado", contrato: "oris_procesos", motivo: error.message });
        return;
      }
      const filas = (data ?? [])
        .filter((f: any) => f.activo !== false)
        .map((f: any) => ({
          proceso_id: f.proceso_id,
          proceso_nombre: f.procesos?.nombre ?? f.proceso_id,
          activo: f.activo,
        }));
      setEstado({ estado: "ok", datos: filas });
    })();
    return () => {
      vivo = false;
    };
  }, [orisId]);

  return estado;
}

// ─── Paso 3: magnitudes requeridas por proceso ─────────────────────────────

interface FilaMagnitudRequerida {
  proceso_id: string;
  magnitud_clave: string;
  magnitud_label: string;
  unidad?: string | null;
  requerido?: boolean | null;
  [key: string]: unknown;
}

function useMagnitudesRequeridas(procesoId: string | null) {
  const [estado, setEstado] = useState<EstadoContrato<FilaMagnitudRequerida[]>>({ estado: "cargando" });

  useEffect(() => {
    if (!procesoId) {
      setEstado({ estado: "ok", datos: [] });
      return;
    }
    let vivo = true;
    setEstado({ estado: "cargando" });
    (async () => {
      const { data, error } = await supabase
        .from("v_magnitudes_requeridas_oris_canonicas_v1")
        .select("*")
        .eq("proceso_id", procesoId);
      if (!vivo) return;
      if (error) {
        setEstado({
          estado: "bloqueado",
          contrato: "v_magnitudes_requeridas_oris_canonicas_v1",
          motivo: error.message,
        });
        return;
      }
      setEstado({ estado: "ok", datos: (data ?? []) as FilaMagnitudRequerida[] });
    })();
    return () => {
      vivo = false;
    };
  }, [procesoId]);

  return estado;
}

// ─── Paso 4: calibración física del proceso ────────────────────────────────

interface FilaCalibracionProceso {
  proceso_id: string;
  calibrado: boolean;
  [key: string]: unknown;
}

function useCalibracionProceso(procesoId: string | null) {
  const [estado, setEstado] = useState<EstadoContrato<FilaCalibracionProceso | null>>({ estado: "cargando" });

  useEffect(() => {
    if (!procesoId) {
      setEstado({ estado: "ok", datos: null });
      return;
    }
    let vivo = true;
    setEstado({ estado: "cargando" });
    (async () => {
      const { data, error } = await supabase
        .from("v_procesos_demanda_eterium_fisica_runtime_v1")
        .select("*")
        .eq("proceso_id", procesoId)
        .maybeSingle();
      if (!vivo) return;
      if (error) {
        setEstado({
          estado: "bloqueado",
          contrato: "v_procesos_demanda_eterium_fisica_runtime_v1",
          motivo: error.message,
        });
        return;
      }
      setEstado({ estado: "ok", datos: (data as FilaCalibracionProceso) ?? null });
    })();
    return () => {
      vivo = false;
    };
  }, [procesoId]);

  return estado;
}

// ─── Resultado del resolutor unificado ─────────────────────────────────────

interface ResultadoRequerimiento {
  e_organizacion: number;
  e_fisico: number;
  e_temporal: number;
  e_estable: number;
  practica?: number | null;
  eficiencia?: number | null;
  e_liberado?: number | null;
  e_perdido?: number | null;
  demanda_fisica_j?: number | null;
  traza?: unknown;
  [key: string]: unknown;
}

async function resolverRequerimientoEterium(params: {
  orisId: string;
  procesoId: string;
  objetivoTipo: string;
  objetivoId: string | null;
  magnitudes: Record<string, number>;
  practica: number | null;
}): Promise<{ ok: true; datos: ResultadoRequerimiento } | { ok: false; contrato: string; motivo: string }> {
  const { data, error } = await supabase.rpc("calcular_requerimiento_eterium_proceso_v1", {
    p_oris_id: params.orisId,
    p_proceso_id: params.procesoId,
    p_objetivo_tipo: params.objetivoTipo,
    p_objetivo_id: params.objetivoId,
    p_magnitudes: params.magnitudes,
    p_practica: params.practica,
  });
  if (error) {
    return {
      ok: false,
      contrato: "calcular_requerimiento_eterium_proceso_v1",
      motivo: error.message,
    };
  }
  // El resolutor puede devolver una fila única o un array de una fila según
  // cómo esté declarada la función en Supabase — se admite cualquiera de
  // las dos formas sin adivinar la forma "correcta".
  const fila = Array.isArray(data) ? data[0] : data;
  if (!fila) {
    return {
      ok: false,
      contrato: "calcular_requerimiento_eterium_proceso_v1",
      motivo: "El resolutor no devolvió ninguna fila para estos parámetros.",
    };
  }
  return { ok: true, datos: fila as ResultadoRequerimiento };
}

// ─── Objetivo (material / organismo / objeto / otro) ───────────────────────

const TIPOS_OBJETIVO: { key: string; label: string; tabla: string }[] = [
  { key: "material", label: "Material", tabla: "materiales" },
  { key: "organismo", label: "Organismo", tabla: "criaturas" },
  { key: "objeto", label: "Objeto", tabla: "items" },
];

interface FilaObjetivo {
  id: string;
  nombre: string;
  [key: string]: unknown;
}

function useOpcionesObjetivo(tipo: string | null) {
  const [estado, setEstado] = useState<EstadoContrato<FilaObjetivo[]>>({ estado: "ok", datos: [] });

  useEffect(() => {
    const cfg = TIPOS_OBJETIVO.find((t) => t.key === tipo);
    if (!cfg) {
      setEstado({ estado: "ok", datos: [] });
      return;
    }
    let vivo = true;
    setEstado({ estado: "cargando" });
    (async () => {
      const { data, error } = await supabase.from(cfg.tabla).select("id, nombre").order("nombre");
      if (!vivo) return;
      if (error) {
        setEstado({ estado: "bloqueado", contrato: cfg.tabla, motivo: error.message });
        return;
      }
      setEstado({ estado: "ok", datos: (data ?? []) as FilaObjetivo[] });
    })();
    return () => {
      vivo = false;
    };
  }, [tipo]);

  return estado;
}

// ─── UI: campos primitivos ──────────────────────────────────────────────────

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-micro uppercase tracking-wide text-primary/35">{label}</label>
      {children}
    </div>
  );
}

const inputClase =
  "bg-transparent rounded-md px-2 py-1.5 text-sm text-primary outline-none border border-primary/15 focus:border-primary/40 transition-colors placeholder:text-primary/25 w-full";

function FilaResultado({ label, valor, destacado }: { label: string; valor: string; destacado?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className={destacado ? "font-black text-primary" : "text-primary/55"}>{label}</span>
      <span className={destacado ? "font-black text-primary" : "font-mono text-primary/70"}>{valor}</span>
    </div>
  );
}

function formatUEt(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${n.toLocaleString("es-CL", { maximumFractionDigits: 3 })} uEt`;
}

function formatPct(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${(n * (n <= 1 ? 100 : 1)).toLocaleString("es-CL", { maximumFractionDigits: 3 })} %`;
}

// ─── Panel principal ────────────────────────────────────────────────────────

interface Props {
  /** Oris preseleccionado si el simulador se abrió desde una tarjeta de Oris
   *  puntual (en vez del botón genérico del título de la sección). */
  orisInicial?: Oris | null;
}

export function SimuladorEterium({ orisInicial }: Props) {
  const orisDemanda = useOrisDemandaEterium();

  const [orisId, setOrisId] = useState<string | null>(orisInicial?.id ?? null);
  const [procesoId, setProcesoId] = useState<string | null>(null);
  const [objetivoTipo, setObjetivoTipo] = useState<string | null>(null);
  const [objetivoId, setObjetivoId] = useState<string | null>(null);
  const [magnitudes, setMagnitudes] = useState<Record<string, string>>({});
  const [practica, setPractica] = useState<string>("");

  const [resultado, setResultado] = useState<
    | { estado: "idle" }
    | { estado: "calculando" }
    | { estado: "ok"; datos: ResultadoRequerimiento }
    | { estado: "bloqueado"; contrato: string; motivo: string }
  >({ estado: "idle" });

  const [trazaAbierta, setTrazaAbierta] = useState(false);

  const procesos = useProcesosDeOris(orisId);
  const magnitudesReq = useMagnitudesRequeridas(procesoId);
  const calibracion = useCalibracionProceso(procesoId);
  const opcionesObjetivo = useOpcionesObjetivo(objetivoTipo);

  // Reset en cascada: cambiar el Oris invalida proceso/objetivo/magnitudes;
  // cambiar el proceso invalida objetivo/magnitudes — nunca se arrastra un
  // estado de un paso anterior que ya no aplica al nuevo contexto.
  useEffect(() => {
    setProcesoId(null);
    setObjetivoTipo(null);
    setObjetivoId(null);
    setMagnitudes({});
    setResultado({ estado: "idle" });
  }, [orisId]);

  useEffect(() => {
    setObjetivoTipo(null);
    setObjetivoId(null);
    setMagnitudes({});
    setResultado({ estado: "idle" });
  }, [procesoId]);

  const orisSeleccionado = useMemo(
    () => (orisDemanda.estado === "ok" ? orisDemanda.datos.find((o) => o.oris_id === orisId) ?? null : null),
    [orisDemanda, orisId],
  );

  const magnitudesListas =
    magnitudesReq.estado === "ok" &&
    magnitudesReq.datos.length > 0 &&
    magnitudesReq.datos.every((m) => {
      const v = magnitudes[m.magnitud_clave];
      return v !== undefined && v !== "" && !Number.isNaN(Number(v));
    });

  const puedeCalcular =
    !!orisId &&
    !!procesoId &&
    magnitudesReq.estado === "ok" &&
    magnitudesReq.datos.length > 0 &&
    magnitudesListas;

  async function handleCalcular() {
    if (!orisId || !procesoId) return;
    setResultado({ estado: "calculando" });
    const magnitudesNum = Object.fromEntries(
      Object.entries(magnitudes).map(([k, v]) => [k, Number(v)]),
    );
    const practicaNum = practica.trim() === "" ? null : Number(practica);
    const res = await resolverRequerimientoEterium({
      orisId,
      procesoId,
      objetivoTipo: objetivoTipo ?? "",
      objetivoId,
      magnitudes: magnitudesNum,
      practica: practicaNum,
    });
    if (!res.ok) {
      setResultado({ estado: "bloqueado", contrato: res.contrato, motivo: res.motivo });
      return;
    }
    setResultado({ estado: "ok", datos: res.datos });
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-y-auto p-3 gap-4">
      <div className="flex items-start gap-2">
        <div
          className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border"
          style={{
            background: "color-mix(in srgb, var(--primary) 8%, transparent)",
            borderColor: "color-mix(in srgb, var(--primary) 18%, transparent)",
          }}
        >
          <FlaskConical className="text-primary/50" size={13} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black text-primary">Laboratorio de Eterium</p>
          <p className="text-micro text-primary/45 leading-relaxed">
            Intención → Oris → proceso → magnitudes físicas → coste físico → coste de
            organización → coste temporal → Eterium estable → Eterium liberado según práctica.
            Todo se resuelve contra el canon actual de Supabase; nada se calcula acá.
          </p>
        </div>
      </div>

      {/* Paso 1: Oris */}
      <div className="flex flex-col gap-1.5">
        <span className="text-micro font-black uppercase tracking-widest text-primary/40">
          1 · Oris
        </span>
        {orisDemanda.estado === "cargando" ? (
          <div className="flex items-center gap-1.5 text-micro text-primary/40">
            <Loader2 size={11} className="animate-spin" /> Cargando v_oris_demanda_eterium_v2…
          </div>
        ) : orisDemanda.estado === "bloqueado" ? (
          <ContratoFaltante contrato={orisDemanda.contrato} motivo={orisDemanda.motivo} />
        ) : (
          <select
            value={orisId ?? ""}
            onChange={(e) => setOrisId(e.target.value || null)}
            className={inputClase}
          >
            <option value="">Seleccionar Oris…</option>
            {orisDemanda.datos.map((o) => (
              <option key={o.oris_id} value={o.oris_id}>
                {o.formula ? `${o.formula} — ` : ""}
                {o.nombre}
              </option>
            ))}
          </select>
        )}

        {orisSeleccionado && (
          <div className="flex flex-wrap gap-3 text-micro text-primary/50 pt-1">
            {orisSeleccionado.dominio && <span>Dominio: {orisSeleccionado.dominio}</span>}
            {orisSeleccionado.n_ium != null && orisSeleccionado.n_uniones != null && (
              <span>
                E_organización = {orisSeleccionado.n_ium} IUM + {orisSeleccionado.n_uniones} uniones
              </span>
            )}
            {orisSeleccionado.e_organizacion != null && (
              <span className="font-bold text-primary/70">
                = {formatUEt(orisSeleccionado.e_organizacion)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Paso 2: Proceso */}
      {orisId && (
        <div className="flex flex-col gap-1.5">
          <span className="text-micro font-black uppercase tracking-widest text-primary/40">
            2 · Proceso
          </span>
          {procesos.estado === "cargando" ? (
            <div className="flex items-center gap-1.5 text-micro text-primary/40">
              <Loader2 size={11} className="animate-spin" /> Cargando oris_procesos…
            </div>
          ) : procesos.estado === "bloqueado" ? (
            <ContratoFaltante contrato={procesos.contrato} motivo={procesos.motivo} />
          ) : procesos.datos.length === 0 ? (
            <p className="text-micro text-primary/35 italic">
              Este Oris no tiene procesos activos vinculados en oris_procesos.
            </p>
          ) : (
            <select
              value={procesoId ?? ""}
              onChange={(e) => setProcesoId(e.target.value || null)}
              className={inputClase}
            >
              <option value="">Seleccionar proceso…</option>
              {procesos.datos.map((p) => (
                <option key={p.proceso_id} value={p.proceso_id}>
                  {p.proceso_nombre}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Paso 3: Objetivo */}
      {procesoId && (
        <div className="flex flex-col gap-1.5">
          <span className="text-micro font-black uppercase tracking-widest text-primary/40">
            3 · Objetivo
          </span>
          <div className="flex flex-wrap gap-1.5">
            {TIPOS_OBJETIVO.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setObjetivoTipo(t.key);
                  setObjetivoId(null);
                }}
                className={`px-2.5 py-1 rounded-md text-micro font-bold border transition-all cursor-pointer ${
                  objetivoTipo === t.key
                    ? "bg-primary text-btn-text border-primary"
                    : "border-primary/15 text-primary/50 hover:border-primary/35"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {objetivoTipo &&
            (opcionesObjetivo.estado === "cargando" ? (
              <div className="flex items-center gap-1.5 text-micro text-primary/40">
                <Loader2 size={11} className="animate-spin" /> Cargando opciones…
              </div>
            ) : opcionesObjetivo.estado === "bloqueado" ? (
              <ContratoFaltante contrato={opcionesObjetivo.contrato} motivo={opcionesObjetivo.motivo} />
            ) : (
              <select
                value={objetivoId ?? ""}
                onChange={(e) => setObjetivoId(e.target.value || null)}
                className={inputClase}
              >
                <option value="">Seleccionar {objetivoTipo}…</option>
                {opcionesObjetivo.datos.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nombre}
                  </option>
                ))}
              </select>
            ))}
        </div>
      )}

      {/* Paso 4: Magnitudes físicas — construidas dinámicamente desde
          v_magnitudes_requeridas_oris_canonicas_v1, sin campos hardcodeados. */}
      {procesoId && (
        <div className="flex flex-col gap-1.5">
          <span className="text-micro font-black uppercase tracking-widest text-primary/40">
            4 · Magnitudes físicas
          </span>
          {magnitudesReq.estado === "cargando" ? (
            <div className="flex items-center gap-1.5 text-micro text-primary/40">
              <Loader2 size={11} className="animate-spin" /> Cargando magnitudes requeridas…
            </div>
          ) : magnitudesReq.estado === "bloqueado" ? (
            <ContratoFaltante contrato={magnitudesReq.contrato} motivo={magnitudesReq.motivo} />
          ) : magnitudesReq.datos.length === 0 ? (
            <p className="text-micro text-amber-500 font-semibold">
              Datos físicos insuficientes para resolver este proceso: no hay magnitudes
              canónicas registradas para él.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {magnitudesReq.datos.map((m) => (
                <Campo
                  key={m.magnitud_clave}
                  label={m.unidad ? `${m.magnitud_label} (${m.unidad})` : m.magnitud_label}
                >
                  <input
                    type="number"
                    value={magnitudes[m.magnitud_clave] ?? ""}
                    onChange={(e) =>
                      setMagnitudes((prev) => ({ ...prev, [m.magnitud_clave]: e.target.value }))
                    }
                    placeholder="—"
                    className={inputClase}
                  />
                </Campo>
              ))}
            </div>
          )}

          {calibracion.estado === "bloqueado" ? (
            <ContratoFaltante contrato={calibracion.contrato} motivo={calibracion.motivo} />
          ) : calibracion.estado === "ok" && calibracion.datos && calibracion.datos.calibrado === false ? (
            <p className="text-micro text-amber-500 font-semibold">
              Proceso físicamente resuelto, pero sin calibración de coste Eterium.
            </p>
          ) : null}
        </div>
      )}

      {/* Práctica del ejecutor (opcional) */}
      {procesoId && (
        <div className="flex flex-col gap-1.5">
          <span className="text-micro font-black uppercase tracking-widest text-primary/40">
            5 · Práctica del ejecutor (opcional)
          </span>
          <Campo label="Práctica (0 a 1 — control y estabilización, no potencia)">
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={practica}
              onChange={(e) => setPractica(e.target.value)}
              placeholder="ej. 0.5"
              className={inputClase}
            />
          </Campo>
        </div>
      )}

      {/* Calcular */}
      {procesoId && (
        <button
          type="button"
          disabled={!puedeCalcular || resultado.estado === "calculando"}
          onClick={handleCalcular}
          className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-wide bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        >
          {resultado.estado === "calculando" ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <RefreshCw size={11} />
          )}
          Calcular
        </button>
      )}

      {!puedeCalcular && procesoId && magnitudesReq.estado === "ok" && magnitudesReq.datos.length > 0 && (
        <p className="text-micro text-primary/35 italic -mt-2">
          Completá todas las magnitudes físicas para poder calcular.
        </p>
      )}

      {/* Resultado */}
      {resultado.estado === "bloqueado" && (
        <ContratoFaltante contrato={resultado.contrato} motivo={resultado.motivo} />
      )}

      {resultado.estado === "ok" && (
        <div className="flex flex-col gap-3 rounded-xl border border-primary/12 p-3">
          <p className="text-micro font-black uppercase tracking-widest text-primary/40">
            Eterium estable requerido
          </p>
          <div className="flex flex-col gap-1">
            <FilaResultado label="Organización del Oris" valor={formatUEt(resultado.datos.e_organizacion)} />
            <FilaResultado label="Coste físico" valor={formatUEt(resultado.datos.e_fisico)} />
            <FilaResultado label="Coste temporal" valor={formatUEt(resultado.datos.e_temporal)} />
            <div className="h-px bg-primary/10 my-0.5" />
            <FilaResultado
              label="Eterium estable requerido"
              valor={formatUEt(resultado.datos.e_estable)}
              destacado
            />
          </div>

          {resultado.datos.eficiencia != null && (
            <>
              <div className="h-px bg-primary/10" />
              <div className="flex flex-col gap-1">
                <FilaResultado label="Práctica" valor={String(resultado.datos.practica ?? "—")} />
                <FilaResultado label="Eficiencia" valor={formatPct(resultado.datos.eficiencia)} />
                <FilaResultado
                  label="Eterium que debe liberar"
                  valor={formatUEt(resultado.datos.e_liberado)}
                  destacado
                />
                <FilaResultado label="Eterium inestable perdido" valor={formatUEt(resultado.datos.e_perdido)} />
              </div>
            </>
          )}

          {/* Panel de trazabilidad — expandible, solo con lo que el
              resolutor efectivamente devolvió en `traza` (o los propios
              campos del resultado si no hay columna traza dedicada). */}
          <button
            type="button"
            onClick={() => setTrazaAbierta((v) => !v)}
            className="flex items-center gap-1 text-micro font-bold text-primary/50 hover:text-primary/80 transition-colors cursor-pointer self-start"
          >
            {trazaAbierta ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            Ver razonamiento canónico
          </button>
          {trazaAbierta && (
            <pre className="text-micro font-mono text-primary/55 whitespace-pre-wrap break-words bg-primary/[0.03] rounded-md p-2 border border-primary/8">
              {JSON.stringify(resultado.datos.traza ?? resultado.datos, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
