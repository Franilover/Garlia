"use client";

/**
 * LaboratorioOrisSection.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Slice "Oris" del grupo Lab (Worldbuilder) — "¿cuánto Eterium necesito
 * para usar este Oris?". Elegís un Oris y una intensidad (25/50/75/100%);
 * la demanda mostrada es la que ya calculó v_oris_demanda_eterium_v1
 * (E_req = (N_IUM + N_uniones) × intensidad). Opcionalmente elegís un
 * organismo real (v_estado_eterium_organismos_v1) para ver si su Eterium
 * libre actual alcanza.
 *
 * Mismas primitivas visuales locales que LaboratorioPropiedadesSection
 * (StatusPill, LoadingRow, EmptyRow) — no se comparten porque
 * VisualizadorPage/este archivo no las exportan desde un sitio común.
 */

import React, { useMemo } from "react";

import { useLaboratorioOris } from "./useLaboratorioOris";
import type { OrisDemandaEterium } from "./laboratorioOris.types";

function StatusPill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "warning";
}) {
  const cls =
    tone === "success"
      ? "border-emerald-500/20 text-emerald-500"
      : tone === "warning"
        ? "border-red-500/20 text-red-400"
        : "border-primary/10 text-primary/50";
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${cls}`}>
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

const NIVELES: { pct: 25 | 50 | 75 | 100; label: string }[] = [
  { pct: 25, label: "25%" },
  { pct: 50, label: "50%" },
  { pct: 75, label: "75%" },
  { pct: 100, label: "100%" },
];

export function LaboratorioOrisSection() {
  const {
    loading,
    error,
    orisList,
    orisSelId,
    setOrisSelId,
    orisSel,
    organismos,
    organismoSelId,
    setOrganismoSelId,
    intensidadPct,
    setIntensidadPct,
    simulacion,
  } = useLaboratorioOris();

  const orisPorId = useMemo(() => {
    const mapa = new Map<string, OrisDemandaEterium>();
    for (const o of orisList) mapa.set(o.orisId, o);
    return mapa;
  }, [orisList]);

  if (loading) return <LoadingRow>Cargando Oris y estado de Eterium…</LoadingRow>;

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs font-bold text-red-400">
        {error}
      </div>
    );
  }

  if (orisList.length === 0) {
    return <EmptyRow>No hay Oris con demanda de Eterium calculada todavía en v_oris_demanda_eterium_v1.</EmptyRow>;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Selector de Oris */}
      <select
        value={orisSelId ?? ""}
        onChange={(e) => setOrisSelId(e.target.value || null)}
        className="w-full max-w-sm rounded-lg border border-primary/15 bg-transparent px-3.5 py-2.5 text-xs font-black text-primary/85 outline-none transition-colors hover:border-primary/30 focus:border-primary/40"
      >
        {orisList.map((o) => (
          <option key={o.orisId} value={o.orisId} className="bg-[var(--bg-main)] text-primary">
            {o.orden}. {o.nombre} — {o.dominio}
          </option>
        ))}
      </select>

      {orisSel ? (
        <div className="rounded-xl border border-primary/10 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-black text-primary/85">{orisSel.nombre}</p>
            <StatusPill>{orisSel.dominio}</StatusPill>
          </div>
          <p className="mt-1.5 text-[11px] leading-5 text-primary/50">{orisSel.formula}</p>
          <p className="mt-1 text-[10px] leading-4 text-primary/35">{orisSel.tarea}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-md bg-primary/5 px-2 py-1 text-[10px] font-bold text-primary/50">
              {orisSel.nIums} IUMs
            </span>
            <span className="rounded-md bg-primary/5 px-2 py-1 text-[10px] font-bold text-primary/50">
              {orisSel.nUniones} uniones
            </span>
            <span className="rounded-md bg-primary/5 px-2 py-1 text-[10px] font-bold text-primary/50">
              {orisSel.unidadesOrganizacion} unidades de organización
            </span>
          </div>
        </div>
      ) : null}

      {/* Intensidad */}
      <div>
        <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-primary/35">Intensidad de uso</p>
        <div className="inline-flex rounded-lg border border-primary/15 p-1">
          {NIVELES.map((n) => (
            <button
              key={n.pct}
              type="button"
              onClick={() => setIntensidadPct(n.pct)}
              className={`rounded-md px-3.5 py-1.5 text-xs font-black transition-colors ${
                intensidadPct === n.pct ? "bg-primary/10 text-primary/90" : "text-primary/40 hover:text-primary/60"
              }`}
            >
              {n.label}
            </button>
          ))}
        </div>
      </div>

      {/* Selector de organismo (opcional) */}
      <div>
        <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-primary/35">
          Organismo a probar (opcional)
        </p>
        <select
          value={organismoSelId ?? ""}
          onChange={(e) => setOrganismoSelId(e.target.value || null)}
          className="w-full max-w-sm rounded-lg border border-primary/15 bg-transparent px-3.5 py-2.5 text-xs font-black text-primary/85 outline-none transition-colors hover:border-primary/30 focus:border-primary/40"
        >
          <option value="" className="bg-[var(--bg-main)] text-primary">
            — sin organismo, solo ver demanda —
          </option>
          {organismos.map((o) => (
            <option key={o.organismoId} value={o.organismoId} className="bg-[var(--bg-main)] text-primary">
              {o.organismo}
              {o.clado ? ` · ${o.clado}` : ""}
              {!o.puedeCanalizarEterium ? " (no canaliza Eterium)" : ""}
            </option>
          ))}
        </select>
        {organismos.length === 0 ? (
          <p className="mt-2 text-[10px] text-primary/35">
            No hay organismos en v_estado_eterium_organismos_v1 todavía.
          </p>
        ) : null}
      </div>

      {/* Resultado de la simulación */}
      {simulacion ? (
        <div className="rounded-xl border border-primary/10 p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-black text-primary/85">
              Demanda a {simulacion.intensidadPct}%
            </p>
            <StatusPill>
              {simulacion.demandaEterium.toFixed(2)} {simulacion.oris.unidadEterium}
            </StatusPill>
          </div>
          <p className="mt-1.5 text-[10px] text-primary/35">{simulacion.oris.formulaDemanda}</p>

          {simulacion.organismo ? (
            <div className="mt-4 flex flex-col gap-2 border-t border-primary/10 pt-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold text-primary/60">
                  Eterium libre de {simulacion.organismo.organismo}
                </p>
                <span className="text-xs font-black text-primary/85">
                  {simulacion.organismo.cantidadSLibre !== null
                    ? `${simulacion.organismo.cantidadSLibre.toFixed(2)} ${simulacion.oris.unidadEterium}`
                    : "sin dato"}
                </span>
              </div>

              {!simulacion.organismo.puedeCanalizarEterium ? (
                <StatusPill tone="warning">Este organismo no puede canalizar Eterium</StatusPill>
              ) : simulacion.factible === true ? (
                <StatusPill tone="success">Alcanza — puede activar el Oris a esta intensidad</StatusPill>
              ) : simulacion.factible === false ? (
                <StatusPill tone="warning">
                  No alcanza — faltan {simulacion.faltante?.toFixed(2)} {simulacion.oris.unidadEterium}
                </StatusPill>
              ) : (
                <StatusPill>Sin dato de Eterium libre para comparar</StatusPill>
              )}

              <div className="mt-1 flex flex-wrap gap-1.5">
                {simulacion.organismo.estadoConcentracion ? (
                  <span className="rounded-md bg-primary/5 px-2 py-1 text-[10px] font-bold text-primary/50">
                    concentración: {simulacion.organismo.estadoConcentracion}
                  </span>
                ) : null}
                {simulacion.organismo.coherencia !== null ? (
                  <span className="rounded-md bg-primary/5 px-2 py-1 text-[10px] font-bold text-primary/50">
                    coherencia: {simulacion.organismo.coherencia.toFixed(2)}
                  </span>
                ) : null}
                {simulacion.organismo.estadoFlujo ? (
                  <span className="rounded-md bg-primary/5 px-2 py-1 text-[10px] font-bold text-primary/50">
                    flujo: {simulacion.organismo.estadoFlujo}
                  </span>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-[10px] text-primary/35">
              Elegí un organismo arriba para comparar contra su Eterium libre actual.
            </p>
          )}
        </div>
      ) : null}

      {/* Comparativa rápida: todos los Oris a la intensidad elegida */}
      <details>
        <summary className="cursor-pointer text-[10px] font-black uppercase tracking-widest text-primary/35">
          Comparar demanda de todos los Oris a {intensidadPct}%
        </summary>
        <div className="mt-3 flex flex-col gap-1.5">
          {orisList.map((o) => {
            const valor =
              intensidadPct === 25
                ? o.demanda25
                : intensidadPct === 50
                  ? o.demanda50
                  : intensidadPct === 75
                    ? o.demanda75
                    : o.demanda100;
            return (
              <button
                key={o.orisId}
                type="button"
                onClick={() => setOrisSelId(o.orisId)}
                className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
                  orisPorId.get(o.orisId)?.orisId === orisSelId
                    ? "border-primary/25 bg-primary/5"
                    : "border-primary/10 hover:border-primary/20"
                }`}
              >
                <span className="truncate text-[11px] font-bold text-primary/70">{o.nombre}</span>
                <span className="shrink-0 text-[11px] font-black text-primary/85">
                  {valor.toFixed(2)} {o.unidadEterium}
                </span>
              </button>
            );
          })}
        </div>
      </details>
    </div>
  );
}

export default LaboratorioOrisSection;
