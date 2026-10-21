"use client";

/**
 * SeccionIumsPreparados.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Sección "IUMs preparados" dentro del Editor de Objetos (EditorItem.tsx).
 *
 * Objeto
 * └── IUMs preparados
 *     └── Preparación
 *         ├── Configuración IUM
 *         ├── IUMs
 *         ├── Enlaces
 *         ├── Topología
 *         ├── Oris
 *         └── Proceso
 *
 * Todo lo que se muestra viene de Supabase (useIumsPreparados.ts /
 * iumsPreparadosService.ts). No se crean checks simples ni listas locales:
 * cada estado (sin almacenamiento / almacenamiento vacío / con
 * preparaciones) refleja exactamente lo que la BD devolvió.
 *
 * Mismas primitivas visuales que LaboratorioOrisSection.tsx (StatusPill,
 * LoadingRow, EmptyRow) — reimplementadas acá porque tampoco se exportan
 * desde un sitio común.
 */

import React, { useState } from "react";

import { useIumsPreparados } from "./useIumsPreparados";
import type { PreparacionIum } from "./iumsPreparados.types";

function StatusPill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const cls =
    tone === "success"
      ? "border-emerald-500/20 text-emerald-500"
      : tone === "warning"
        ? "border-amber-500/25 text-amber-500"
        : tone === "danger"
          ? "border-red-500/20 text-red-400"
          : "border-primary/10 text-primary/50";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${cls}`}
    >
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

function toneDeEstado(estado: string): "default" | "success" | "warning" | "danger" {
  if (estado === "estable" || estado === "activada") return "success";
  if (estado === "inestable" || estado === "critica") return "warning";
  if (estado === "disuelta" || estado === "consumida") return "danger";
  return "default";
}

/** Detalle guiado de una preparación concreta — toda la información sale
 *  de configuracion_snapshot (grabado al crear la preparación) y de las
 *  columnas propias de preparaciones_ium_v1, nunca reconstruida desde
 *  oris_iums. */
function DetallePreparacion({
  preparacion,
  onReevaluar,
}: {
  preparacion: PreparacionIum;
  onReevaluar: () => void;
}) {
  const snap = preparacion.configuracionSnapshot;
  const [reevaluando, setReevaluando] = useState(false);

  const handleReevaluar = async () => {
    setReevaluando(true);
    try {
      await onReevaluar();
    } finally {
      setReevaluando(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-primary/10 p-4">
      {/* Proceso / Oris / Configuración */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-lg bg-primary/5 p-2.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-primary/35">Proceso</p>
          <p className="mt-0.5 text-xs font-bold text-primary/80">
            {preparacion.procesoNombre ?? "— sin resolver —"}
          </p>
        </div>
        <div className="rounded-lg bg-primary/5 p-2.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-primary/35">Oris</p>
          <p className="mt-0.5 text-xs font-bold text-primary/80">
            {preparacion.orisNombre ?? preparacion.orisId}
          </p>
        </div>
        <div className="rounded-lg bg-primary/5 p-2.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-primary/35">Configuración</p>
          <p className="mt-0.5 text-xs font-bold text-primary/80">
            {snap?.configuracionNombre ?? (preparacion.configuracionId ? preparacion.configuracionId : "— sin configuración —")}
          </p>
        </div>
      </div>

      {/* Topología */}
      {snap?.topologiaId ? (
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-primary/35">Topología</span>
          <StatusPill>{snap.topologiaId}</StatusPill>
        </div>
      ) : null}

      {/* IUMs */}
      <div>
        <p className="mb-1.5 text-[9px] font-black uppercase tracking-widest text-primary/35">
          IUMs ({preparacion.iumCount})
        </p>
        {snap && snap.iums.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {snap.iums.map((ium) => (
              <div
                key={ium.componenteId}
                className="flex flex-wrap items-center gap-1.5 rounded-lg border border-primary/10 px-2.5 py-1.5"
              >
                <span className="text-[11px] font-black text-primary/80">{ium.iumId}</span>
                <span className="text-[10px] text-primary/40">pos. {ium.posicion}</span>
                {ium.rol ? <StatusPill>{ium.rol}</StatusPill> : null}
                {ium.participacion ? (
                  <span className="text-[10px] text-primary/40">{ium.participacion}</span>
                ) : null}
                <span className="text-[10px] text-primary/30">orden {ium.orden}</span>
                {ium.salidaFuncionalId ? (
                  <span className="text-[10px] text-primary/30">salida: {ium.salidaFuncionalId}</span>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <EmptyRow>
            No hay snapshot de IUMs para esta preparación — no se reconstruye desde oris_iums.
          </EmptyRow>
        )}
      </div>

      {/* Enlaces */}
      <div>
        <p className="mb-1.5 text-[9px] font-black uppercase tracking-widest text-primary/35">
          Enlaces ({preparacion.unionCount})
        </p>
        {snap && snap.uniones.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {snap.uniones.map((u, i) => (
              <div
                key={`${u.origenComponenteId}-${u.destinoComponenteId}-${i}`}
                className="flex flex-wrap items-center gap-1.5 rounded-lg border border-primary/10 px-2.5 py-1.5 text-[10px] text-primary/60"
              >
                <span className="font-bold text-primary/80">{u.origenComponenteId}</span>
                <span>→</span>
                <span className="font-bold text-primary/80">{u.destinoComponenteId}</span>
                <StatusPill>{u.tipoUnion}</StatusPill>
                {u.descripcion ? <span className="text-primary/40">{u.descripcion}</span> : null}
              </div>
            ))}
          </div>
        ) : (
          <EmptyRow>Sin enlaces registrados en el snapshot de esta preparación.</EmptyRow>
        )}
      </div>

      {/* Coherencia y estado */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg bg-primary/5 p-2.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-primary/35">Coherencia actual</p>
          <p className="mt-0.5 text-xs font-black text-primary/85">
            {preparacion.coherenciaActual.toFixed(3)}
          </p>
        </div>
        <div className="rounded-lg bg-primary/5 p-2.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-primary/35">Coherencia inicial</p>
          <p className="mt-0.5 text-xs font-black text-primary/85">
            {preparacion.coherenciaInicial.toFixed(3)}
          </p>
        </div>
        <div className="rounded-lg bg-primary/5 p-2.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-primary/35">Tasa de disolución</p>
          <p className="mt-0.5 text-xs font-black text-primary/85">
            {preparacion.tasaDisolucionH.toFixed(4)} /h
          </p>
        </div>
        <div className="rounded-lg bg-primary/5 p-2.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-primary/35">Estado</p>
          <div className="mt-0.5">
            <StatusPill tone={toneDeEstado(preparacion.estado)}>{preparacion.estado}</StatusPill>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-primary/10 pt-3">
        <button
          type="button"
          onClick={handleReevaluar}
          disabled={reevaluando}
          className="rounded-lg border border-primary/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary/60 transition-colors hover:border-primary/30 hover:text-primary/85 disabled:opacity-40"
        >
          {reevaluando ? "Reevaluando…" : "Reevaluar coherencia"}
        </button>
        <span className="text-[10px] text-primary/35">
          Última evaluación: {new Date(preparacion.ultimaEvaluacionAt).toLocaleString()}
        </span>
        {preparacion.ultimaActivacionAt ? (
          <span className="text-[10px] text-primary/35">
            · última activación: {new Date(preparacion.ultimaActivacionAt).toLocaleString()}
          </span>
        ) : (
          <span className="text-[10px] text-primary/30">· sin activaciones</span>
        )}
      </div>

      <p className="text-[10px] leading-4 text-primary/30">
        La activación (evaluar si puede dispararse contra un Oris/orden) pertenece al runtime de
        Supabase (<code>activar_preparacion_ium_v1</code>) y requiere una orden de Eterium existente;
        no se ejecuta lógica de activación en React.
      </p>
    </div>
  );
}

function FilaResumenPreparacion({
  preparacion,
  abierta,
  onToggle,
}: {
  preparacion: PreparacionIum;
  abierta: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex w-full flex-col gap-1.5 rounded-lg border px-3.5 py-3 text-left transition-colors ${
        abierta ? "border-primary/25 bg-primary/5" : "border-primary/10 hover:border-primary/20"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-black text-primary/85">{preparacion.nombre}</p>
        <StatusPill tone={toneDeEstado(preparacion.estado)}>{preparacion.estado}</StatusPill>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-md bg-primary/5 px-2 py-1 text-[10px] font-bold text-primary/50">
          {preparacion.procesoNombre ?? "proceso sin resolver"}
        </span>
        <span className="rounded-md bg-primary/5 px-2 py-1 text-[10px] font-bold text-primary/50">
          Oris: {preparacion.orisNombre ?? preparacion.orisId}
        </span>
        <span className="rounded-md bg-primary/5 px-2 py-1 text-[10px] font-bold text-primary/50">
          {preparacion.iumCount} IUMs · {preparacion.unionCount} enlaces
        </span>
        <span className="rounded-md bg-primary/5 px-2 py-1 text-[10px] font-bold text-primary/50">
          coherencia {preparacion.coherenciaActual.toFixed(2)}
        </span>
        <span className="rounded-md bg-primary/5 px-2 py-1 text-[10px] font-bold text-primary/50">
          {preparacion.modoActivacion}
        </span>
      </div>
    </button>
  );
}

/** Formulario guiado de "Añadir preparación": Oris → Configuración
 *  compatible (v_proceso_configuracion_ium_v1) → nombre/calidad/modo. Sin
 *  campos de texto libre donde exista una opción canónica; no crea
 *  IUM 1 + IUM 2 + IUM 3 como lista arbitraria, siempre selecciona una
 *  Configuración IUM completa. */
function FormularioAgregarPreparacion({
  almacenamientoId,
  hook,
  onCreada,
  onCancelar,
}: {
  almacenamientoId: string;
  hook: ReturnType<typeof useIumsPreparados>;
  onCreada: () => void;
  onCancelar: () => void;
}) {
  const { orisCatalogo, orisSelId, setOrisSelId, configuracionesDisponibles, loadingConfiguraciones, crearPreparacion } =
    hook;

  const [configuracionId, setConfiguracionId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [calidad, setCalidad] = useState(0.5);
  const [modoActivacion, setModoActivacion] = useState<"reutilizable" | "consumible">("reutilizable");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null);

  const configuracionSel = configuracionesDisponibles.find((c) => c.configuracionId === configuracionId) ?? null;

  const puedeEnviar = !!orisSelId && !!configuracionId && nombre.trim().length > 0 && !enviando;

  const handleCrear = async () => {
    if (!configuracionId) return;
    setEnviando(true);
    setResultado(null);
    try {
      const r = await crearPreparacion({
        personajeId: null,
        almacenamientoId,
        configuracionId,
        nombre: nombre.trim(),
        calidadPreparacion: calidad,
        modoActivacion,
      });
      if (r.estado === "preparada") {
        setResultado({ ok: true, mensaje: "Preparación creada correctamente." });
        onCreada();
      } else {
        setResultado({
          ok: false,
          mensaje: r.mensaje ?? r.razon ?? `Rechazada por Supabase (estado: ${r.estado}).`,
        });
      }
    } catch (e) {
      setResultado({ ok: false, mensaje: e instanceof Error ? e.message : String(e) });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-primary/15 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-primary/40">Añadir preparación</p>

      {/* 1. Oris */}
      <div>
        <label className="mb-1 block text-[9px] font-black uppercase tracking-widest text-primary/35">
          Oris
        </label>
        <select
          value={orisSelId ?? ""}
          onChange={(e) => {
            setOrisSelId(e.target.value || null);
            setConfiguracionId(null);
          }}
          className="w-full rounded-lg border border-primary/15 bg-transparent px-3 py-2 text-xs font-bold text-primary/85 outline-none focus:border-primary/40"
        >
          <option value="" className="bg-[var(--bg-main)]">
            — seleccionar Oris —
          </option>
          {orisCatalogo.map((o) => (
            <option key={o.id} value={o.id} className="bg-[var(--bg-main)]">
              {o.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* 2. Configuración IUM compatible */}
      {orisSelId ? (
        <div>
          <label className="mb-1 block text-[9px] font-black uppercase tracking-widest text-primary/35">
            Configuración IUM (proceso · topología)
          </label>
          {loadingConfiguraciones ? (
            <LoadingRow>Buscando configuraciones compatibles…</LoadingRow>
          ) : configuracionesDisponibles.length === 0 ? (
            <EmptyRow>
              No hay ninguna Configuración IUM cuyo Oris principal sea este Oris en
              v_proceso_configuracion_ium_v1. No se puede crear una preparación sin una configuración
              existente y compatible.
            </EmptyRow>
          ) : (
            <select
              value={configuracionId ?? ""}
              onChange={(e) => setConfiguracionId(e.target.value || null)}
              className="w-full rounded-lg border border-primary/15 bg-transparent px-3 py-2 text-xs font-bold text-primary/85 outline-none focus:border-primary/40"
            >
              <option value="" className="bg-[var(--bg-main)]">
                — seleccionar configuración —
              </option>
              {configuracionesDisponibles.map((c) => (
                <option key={c.configuracionId} value={c.configuracionId} className="bg-[var(--bg-main)]">
                  {c.proceso} · {c.configuracion} ({c.nIums} IUMs, {c.nUniones} enlaces)
                </option>
              ))}
            </select>
          )}
        </div>
      ) : null}

      {configuracionSel ? (
        <div className="rounded-lg bg-primary/5 p-3 text-[11px] leading-5 text-primary/60">
          <p className="font-bold text-primary/80">{configuracionSel.configuracion}</p>
          {configuracionSel.descripcion ? <p className="mt-1">{configuracionSel.descripcion}</p> : null}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <StatusPill>{configuracionSel.topologia ?? configuracionSel.topologiaId ?? "sin topología"}</StatusPill>
            <StatusPill>{configuracionSel.estado}</StatusPill>
            {configuracionSel.orisCompatibles ? (
              <span className="text-[10px] text-primary/40">Oris: {configuracionSel.orisCompatibles}</span>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* 3. Nombre / calidad / modo */}
      {configuracionId ? (
        <>
          <div>
            <label className="mb-1 block text-[9px] font-black uppercase tracking-widest text-primary/35">
              Nombre de la preparación
            </label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Combustión activa — Espada Ígnea"
              className="w-full rounded-lg border border-primary/15 bg-transparent px-3 py-2 text-xs font-bold text-primary/85 outline-none focus:border-primary/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[9px] font-black uppercase tracking-widest text-primary/35">
                Calidad de preparación ({calidad.toFixed(2)})
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={calidad}
                onChange={(e) => setCalidad(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-[9px] font-black uppercase tracking-widest text-primary/35">
                Modo de activación
              </label>
              <select
                value={modoActivacion}
                onChange={(e) => setModoActivacion(e.target.value as "reutilizable" | "consumible")}
                className="w-full rounded-lg border border-primary/15 bg-transparent px-3 py-2 text-xs font-bold text-primary/85 outline-none focus:border-primary/40"
              >
                <option value="reutilizable" className="bg-[var(--bg-main)]">
                  Reutilizable
                </option>
                <option value="consumible" className="bg-[var(--bg-main)]">
                  Consumible
                </option>
              </select>
            </div>
          </div>
        </>
      ) : null}

      {resultado ? (
        <div
          className={`rounded-lg border p-2.5 text-[11px] font-bold ${
            resultado.ok
              ? "border-emerald-500/20 text-emerald-500"
              : "border-red-500/20 text-red-400"
          }`}
        >
          {resultado.mensaje}
        </div>
      ) : null}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleCrear}
          disabled={!puedeEnviar}
          className="rounded-lg bg-primary/10 px-3.5 py-2 text-[10px] font-black uppercase tracking-widest text-primary/85 transition-colors hover:bg-primary/15 disabled:opacity-40"
        >
          {enviando ? "Creando…" : "Crear preparación"}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest text-primary/40 hover:text-primary/60"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

/** Formulario guiado de "Crear almacenamiento IUM": solo permite elegir
 *  entre los soportes reales de tipo 'objeto' (soportes_almacenamiento_ium_v1),
 *  nunca un valor inventado. La creación usa exclusivamente
 *  crear_almacenamiento_ium_objeto_v1, que ya valida que el objeto exista. */
function FormularioCrearAlmacenamiento({
  hook,
  onCreado,
  onCancelar,
}: {
  hook: ReturnType<typeof useIumsPreparados>;
  onCreado: () => void;
  onCancelar: () => void;
}) {
  const { soportesObjeto, loadingSoportes, crearAlmacenamiento } = hook;
  const [soporteTipoId, setSoporteTipoId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null);

  const handleCrear = async () => {
    if (!soporteTipoId) return;
    setEnviando(true);
    setResultado(null);
    try {
      const r = await crearAlmacenamiento({
        soporteTipoId,
        nombre: nombre.trim() || undefined,
      });
      if (r.estado === "creado") {
        setResultado({ ok: true, mensaje: "Almacenamiento IUM creado correctamente." });
        onCreado();
      } else {
        setResultado({
          ok: false,
          mensaje: r.razon ? `Rechazado por Supabase: ${r.razon}` : `Rechazado (estado: ${r.estado}).`,
        });
      }
    } catch (e) {
      setResultado({ ok: false, mensaje: e instanceof Error ? e.message : String(e) });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-primary/15 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-primary/40">
        Crear almacenamiento IUM
      </p>

      <div>
        <label className="mb-1 block text-[9px] font-black uppercase tracking-widest text-primary/35">
          Soporte de almacenamiento
        </label>
        {loadingSoportes ? (
          <LoadingRow>Cargando soportes disponibles…</LoadingRow>
        ) : soportesObjeto.length === 0 ? (
          <EmptyRow>
            No hay ningún soporte activo de tipo &apos;objeto&apos; en
            soportes_almacenamiento_ium_v1. No se puede crear un almacenamiento sin uno.
          </EmptyRow>
        ) : (
          <select
            value={soporteTipoId ?? ""}
            onChange={(e) => setSoporteTipoId(e.target.value || null)}
            className="w-full rounded-lg border border-primary/15 bg-transparent px-3 py-2 text-xs font-bold text-primary/85 outline-none focus:border-primary/40"
          >
            <option value="" className="bg-[var(--bg-main)]">
              — seleccionar soporte —
            </option>
            {soportesObjeto.map((s) => (
              <option key={s.id} value={s.id} className="bg-[var(--bg-main)]">
                {s.nombre} (capacidad {s.capacidadOrden.toFixed(0)})
              </option>
            ))}
          </select>
        )}
      </div>

      {soporteTipoId ? (
        <div>
          <label className="mb-1 block text-[9px] font-black uppercase tracking-widest text-primary/35">
            Nombre (opcional)
          </label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Núcleo interno de la espada"
            className="w-full rounded-lg border border-primary/15 bg-transparent px-3 py-2 text-xs font-bold text-primary/85 outline-none focus:border-primary/40"
          />
        </div>
      ) : null}

      {resultado ? (
        <div
          className={`rounded-lg border p-2.5 text-[11px] font-bold ${
            resultado.ok ? "border-emerald-500/20 text-emerald-500" : "border-red-500/20 text-red-400"
          }`}
        >
          {resultado.mensaje}
        </div>
      ) : null}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleCrear}
          disabled={!soporteTipoId || enviando}
          className="rounded-lg bg-primary/10 px-3.5 py-2 text-[10px] font-black uppercase tracking-widest text-primary/85 transition-colors hover:bg-primary/15 disabled:opacity-40"
        >
          {enviando ? "Creando…" : "Crear almacenamiento"}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest text-primary/40 hover:text-primary/60"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function SeccionIumsPreparados({ itemId }: { itemId: string }) {
  const hook = useIumsPreparados(itemId);
  const {
    loading,
    error,
    almacenamientos,
    preparacionesPorAlmacenamiento,
    todasLasPreparaciones,
    reevaluarPreparacion,
    recargar,
  } = hook;

  const [abiertaId, setAbiertaId] = useState<string | null>(null);
  const [agregandoEnAlmacenamiento, setAgregandoEnAlmacenamiento] = useState<string | null>(null);
  const [creandoAlmacenamiento, setCreandoAlmacenamiento] = useState(false);

  if (loading) return <LoadingRow>Cargando almacenamientos y preparaciones del objeto…</LoadingRow>;

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs font-bold text-red-400">
        {error}
      </div>
    );
  }

  // Estado 1: el objeto no tiene ningún almacenamiento IUM. Se ofrece
  // crear uno acá mismo (crear_almacenamiento_ium_objeto_v1), en vez de
  // dejar un callejón sin salida.
  if (almacenamientos.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <EmptyRow>
          Este objeto no tiene almacenamiento IUM (<code>almacenamientos_ium_v1</code> con
          <code> ubicacion_tipo=&apos;objeto&apos;</code> y <code>ubicacion_id</code> igual a este objeto). No
          puede tener preparaciones IUM hasta que se cree uno.
        </EmptyRow>
        {creandoAlmacenamiento ? (
          <FormularioCrearAlmacenamiento
            hook={hook}
            onCreado={() => setCreandoAlmacenamiento(false)}
            onCancelar={() => setCreandoAlmacenamiento(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setCreandoAlmacenamiento(true);
              hook.cargarSoportesObjeto();
            }}
            className="self-start rounded-lg border border-dashed border-primary/20 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-primary/40 transition-colors hover:border-primary/35 hover:text-primary/60"
          >
            + Crear almacenamiento IUM
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {almacenamientos.map((almacenamiento) => {
        const preparaciones = preparacionesPorAlmacenamiento[almacenamiento.id] ?? [];
        const capacidad =
          almacenamiento.capacidadOrdenOverride ?? almacenamiento.soporte?.capacidadOrden ?? null;
        const usado = preparaciones.reduce((acc, p) => acc + (p.unidadesOrganizacion ?? 0), 0);

        return (
          <div key={almacenamiento.id} className="rounded-xl border border-primary/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-black text-primary/85">{almacenamiento.nombre}</p>
                <p className="mt-0.5 text-[10px] text-primary/40">
                  Soporte: {almacenamiento.soporte?.nombre ?? "— sin resolver —"}
                  {capacidad !== null ? ` · capacidad ${usado.toFixed(0)}/${capacidad.toFixed(0)}` : ""}
                </p>
              </div>
              <StatusPill tone={almacenamiento.estado === "activo" ? "success" : "default"}>
                {almacenamiento.estado}
              </StatusPill>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {/* Estado 2: almacenamiento vacío. */}
              {preparaciones.length === 0 ? (
                <EmptyRow>
                  Este almacenamiento no tiene ninguna preparación IUM todavía.
                </EmptyRow>
              ) : (
                preparaciones.map((p) => (
                  <div key={p.id} className="flex flex-col gap-2">
                    <FilaResumenPreparacion
                      preparacion={p}
                      abierta={abiertaId === p.id}
                      onToggle={() => setAbiertaId((cur) => (cur === p.id ? null : p.id))}
                    />
                    {abiertaId === p.id ? (
                      <DetallePreparacion
                        preparacion={p}
                        onReevaluar={() => reevaluarPreparacion(p.id, almacenamiento.id)}
                      />
                    ) : null}
                  </div>
                ))
              )}
            </div>

            <div className="mt-3">
              {agregandoEnAlmacenamiento === almacenamiento.id ? (
                <FormularioAgregarPreparacion
                  almacenamientoId={almacenamiento.id}
                  hook={hook}
                  onCreada={() => setAgregandoEnAlmacenamiento(null)}
                  onCancelar={() => setAgregandoEnAlmacenamiento(null)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setAgregandoEnAlmacenamiento(almacenamiento.id)}
                  className="rounded-lg border border-dashed border-primary/20 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-primary/40 transition-colors hover:border-primary/35 hover:text-primary/60"
                >
                  + Añadir preparación
                </button>
              )}
            </div>
          </div>
        );
      })}

      {todasLasPreparaciones.length === 0 ? null : (
        <button
          type="button"
          onClick={() => recargar()}
          className="self-start text-[10px] font-bold text-primary/35 hover:text-primary/55"
        >
          Recargar desde Supabase
        </button>
      )}
    </div>
  );
}

export default SeccionIumsPreparados;
