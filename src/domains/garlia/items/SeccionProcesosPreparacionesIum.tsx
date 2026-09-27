"use client";

/**
 * SeccionProcesosPreparacionesIum.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * "Procesos y preparaciones IUM" — reemplaza cualquier flujo de selección
 * libre de IUMs por:
 *
 *   Procesos que facilita → Configuración IUM existente → Preparación
 *   → Almacenamiento en el objeto
 *
 * El usuario nunca arma IUMs, enlaces ni topología a mano: solo elige un
 * proceso vinculado, una configuración existente para ese proceso, y
 * completa nombre/calidad/modo de activación. oris_id sale siempre de la
 * configuración elegida.
 */

import React, { useState } from "react";

import { useProcesosPreparacionesIum } from "./useProcesosPreparacionesIum";
import type {
  AlmacenamientoIumObjeto,
  ConfiguracionDeProceso,
  PreparacionIumObjeto,
  ProcesoDelObjeto,
  RolProceso,
} from "./procesosPreparacionesIum.types";

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
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${cls}`}>
      {children}
    </span>
  );
}

function LoadingRow({ children = "Cargando desde Supabase…" }: { children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-primary/10 p-4 text-xs font-bold text-primary/35">
      <span className="h-2 w-2 animate-pulse rounded-full bg-primary/40" />
      {children}
    </div>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-primary/15 p-4 text-[11px] leading-5 text-primary/40">
      {children}
    </div>
  );
}

function toneDeEstado(estado: string): "default" | "success" | "warning" | "danger" {
  if (estado === "estable" || estado === "activada" || estado === "canonica") return "success";
  if (estado === "inestable" || estado === "critica" || estado === "borrador") return "warning";
  if (estado === "disuelta" || estado === "consumida" || estado === "inactivo") return "danger";
  return "default";
}

const ROL_LABEL: Record<RolProceso, string> = {
  principal: "Principal",
  compatible: "Compatible",
  secundario: "Secundario",
};

const ROLES: RolProceso[] = ["principal", "compatible", "secundario"];

// ── 1-2. Procesos que facilita + agregar proceso ─────────────────────────

function TarjetaProceso({
  proceso,
  seleccionado,
  onVerConfiguraciones,
}: {
  proceso: ProcesoDelObjeto;
  seleccionado: boolean;
  onVerConfiguraciones: () => void;
}) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border p-3.5 transition-colors ${
        seleccionado ? "border-primary/30 bg-primary/5" : "border-primary/10"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-black text-primary/85">{proceso.procesoNombre}</p>
        <StatusPill>{ROL_LABEL[proceso.rol]}</StatusPill>
      </div>
      {proceso.procesoDescripcion ? (
        <p className="text-[11px] leading-5 text-primary/50">{proceso.procesoDescripcion}</p>
      ) : null}
      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="text-[10px] font-bold text-primary/35">
          {proceso.configuracionesDisponibles}{" "}
          {proceso.configuracionesDisponibles === 1 ? "configuración disponible" : "configuraciones disponibles"}
        </span>
        <button
          type="button"
          onClick={onVerConfiguraciones}
          disabled={proceso.configuracionesDisponibles === 0}
          className="rounded-lg border border-primary/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary/60 transition-colors hover:border-primary/30 hover:text-primary/85 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {seleccionado ? "Ocultar" : "Ver configuraciones"}
        </button>
      </div>
    </div>
  );
}

function FormularioAgregarProceso({
  hook,
  onAgregado,
  onCancelar,
}: {
  hook: ReturnType<typeof useProcesosPreparacionesIum>;
  onAgregado: () => void;
  onCancelar: () => void;
}) {
  const { catalogoProcesos, loadingCatalogoProcesos, agregarProceso } = hook;
  const [procesoId, setProcesoId] = useState("");
  const [rol, setRol] = useState<RolProceso>("compatible");
  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAgregar = async () => {
    if (!procesoId) return;
    setEnviando(true);
    setErrorMsg(null);
    try {
      await agregarProceso({ procesoId, rol });
      onAgregado();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-primary/15 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-primary/40">Agregar proceso</p>

      <div>
        <label className="mb-1 block text-[9px] font-black uppercase tracking-widest text-primary/35">
          Proceso
        </label>
        {loadingCatalogoProcesos ? (
          <LoadingRow>Cargando procesos disponibles…</LoadingRow>
        ) : (
          <select
            value={procesoId}
            onChange={(e) => setProcesoId(e.target.value)}
            className="w-full rounded-lg border border-primary/15 bg-transparent px-3 py-2 text-xs font-bold text-primary/85 outline-none focus:border-primary/40"
          >
            <option value="" className="bg-[var(--bg-main)]">
              — seleccionar proceso —
            </option>
            {catalogoProcesos.map((p) => (
              <option key={p.id} value={p.id} className="bg-[var(--bg-main)]">
                {p.nombre}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label className="mb-1 block text-[9px] font-black uppercase tracking-widest text-primary/35">
          Rol
        </label>
        <div className="flex gap-1.5">
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRol(r)}
              className={`rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
                rol === r
                  ? "border-primary/40 bg-primary/10 text-primary/85"
                  : "border-primary/15 text-primary/40 hover:border-primary/25"
              }`}
            >
              {ROL_LABEL[r]}
            </button>
          ))}
        </div>
      </div>

      {errorMsg ? (
        <div className="rounded-lg border border-red-500/20 p-2.5 text-[11px] font-bold text-red-400">
          {errorMsg}
        </div>
      ) : null}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleAgregar}
          disabled={!procesoId || enviando}
          className="rounded-lg bg-primary/10 px-3.5 py-2 text-[10px] font-black uppercase tracking-widest text-primary/85 transition-colors hover:bg-primary/15 disabled:opacity-40"
        >
          {enviando ? "Agregando…" : "Agregar proceso"}
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

// ── 3-4. Configuraciones del proceso + preparar ──────────────────────────

function TarjetaConfiguracion({
  configuracion,
  onSeleccionar,
}: {
  configuracion: ConfiguracionDeProceso;
  onSeleccionar: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-primary/10 p-3.5">
      <p className="text-xs font-black text-primary/85">{configuracion.configuracionNombre}</p>
      {configuracion.configuracionDescripcion ? (
        <p className="text-[11px] leading-5 text-primary/50">{configuracion.configuracionDescripcion}</p>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-md bg-primary/5 px-2 py-1 text-[10px] font-bold text-primary/50">
          Oris: {configuracion.orisNombre ?? "—"}
        </span>
        {configuracion.topologiaId ? (
          <span className="rounded-md bg-primary/5 px-2 py-1 text-[10px] font-bold text-primary/50">
            Topología: {configuracion.topologiaId}
          </span>
        ) : null}
        <span className="rounded-md bg-primary/5 px-2 py-1 text-[10px] font-bold text-primary/50">
          {configuracion.iumCount} IUMs
        </span>
        <span className="rounded-md bg-primary/5 px-2 py-1 text-[10px] font-bold text-primary/50">
          {configuracion.enlaceCount} enlaces
        </span>
        <span className="rounded-md bg-primary/5 px-2 py-1 text-[10px] font-bold text-primary/50">
          {configuracion.configuracionVersion}
        </span>
        <StatusPill tone={toneDeEstado(configuracion.configuracionEstado)}>
          {configuracion.configuracionEstado}
        </StatusPill>
      </div>
      <button
        type="button"
        onClick={onSeleccionar}
        className="mt-1 self-start rounded-lg border border-primary/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary/60 transition-colors hover:border-primary/30 hover:text-primary/85"
      >
        Seleccionar configuración
      </button>
    </div>
  );
}

/** Formulario final: nombre, calidad, modo de activación y almacenamiento
 *  del objeto. La estructura interna (IUMs/enlaces/topología/Oris) ya está
 *  fijada por la configuración elegida y no se edita acá. */
function FormularioPrepararConfiguracion({
  configuracion,
  hook,
  onPreparada,
  onCancelar,
}: {
  configuracion: ConfiguracionDeProceso;
  hook: ReturnType<typeof useProcesosPreparacionesIum>;
  onPreparada: () => void;
  onCancelar: () => void;
}) {
  const { almacenamientos, soportesObjeto, loadingSoportes, cargarSoportesObjeto, crearAlmacenamiento, crearPreparacion } =
    hook;

  const [almacenamientoId, setAlmacenamientoId] = useState<string | null>(
    almacenamientos[0]?.id ?? null,
  );
  const [creandoAlmacenamiento, setCreandoAlmacenamiento] = useState(almacenamientos.length === 0);
  const [soporteTipoId, setSoporteTipoId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [calidad, setCalidad] = useState(0.5);
  const [modoActivacion, setModoActivacion] = useState<"reutilizable" | "consumible">("reutilizable");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null);

  const handleCrearAlmacenamientoYContinuar = async () => {
    if (!soporteTipoId) return;
    setEnviando(true);
    setResultado(null);
    try {
      const r = await crearAlmacenamiento({ soporteTipoId });
      if (r.estado === "creado" && r.almacenamiento_id) {
        setAlmacenamientoId(r.almacenamiento_id as string);
        setCreandoAlmacenamiento(false);
      } else {
        setResultado({ ok: false, mensaje: r.razon ? `Rechazado: ${r.razon}` : `Rechazado (${r.estado}).` });
      }
    } catch (e) {
      setResultado({ ok: false, mensaje: e instanceof Error ? e.message : String(e) });
    } finally {
      setEnviando(false);
    }
  };

  const handlePreparar = async () => {
    if (!almacenamientoId || nombre.trim().length === 0) return;
    setEnviando(true);
    setResultado(null);
    try {
      const r = await crearPreparacion({
        almacenamientoId,
        configuracion,
        nombre: nombre.trim(),
        calidadPreparacion: calidad,
        modoActivacion,
      });
      if (r.estado === "preparada") {
        setResultado({ ok: true, mensaje: "Preparación creada correctamente." });
        onPreparada();
      } else {
        setResultado({ ok: false, mensaje: r.mensaje ?? r.razon ?? `Rechazada (${r.estado}).` });
      }
    } catch (e) {
      setResultado({ ok: false, mensaje: e instanceof Error ? e.message : String(e) });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/[0.03] p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-primary/40">
        Preparar “{configuracion.configuracionNombre}”
      </p>

      {/* Revisión de lo que ya viene fijado por la configuración */}
      <div className="flex flex-wrap gap-1.5">
        <StatusPill>Proceso: {configuracion.procesoNombre}</StatusPill>
        <StatusPill>Oris: {configuracion.orisNombre ?? "—"}</StatusPill>
        <StatusPill>{configuracion.iumCount} IUMs</StatusPill>
        <StatusPill>{configuracion.enlaceCount} enlaces</StatusPill>
        {configuracion.topologiaId ? <StatusPill>Topología: {configuracion.topologiaId}</StatusPill> : null}
      </div>

      {/* Almacenamiento del objeto */}
      <div>
        <label className="mb-1 block text-[9px] font-black uppercase tracking-widest text-primary/35">
          Almacenamiento del objeto
        </label>
        {creandoAlmacenamiento ? (
          <div className="flex flex-col gap-2 rounded-lg border border-primary/10 p-3">
            <p className="text-[10px] text-primary/40">
              Este objeto todavía no tiene almacenamiento IUM — se crea antes de preparar.
            </p>
            {loadingSoportes ? (
              <LoadingRow>Cargando soportes…</LoadingRow>
            ) : soportesObjeto.length === 0 ? (
              <button
                type="button"
                onClick={cargarSoportesObjeto}
                className="self-start rounded-lg border border-primary/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary/60"
              >
                Cargar soportes disponibles
              </button>
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
            <button
              type="button"
              onClick={handleCrearAlmacenamientoYContinuar}
              disabled={!soporteTipoId || enviando}
              className="self-start rounded-lg bg-primary/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary/85 disabled:opacity-40"
            >
              Crear almacenamiento
            </button>
          </div>
        ) : (
          <select
            value={almacenamientoId ?? ""}
            onChange={(e) => setAlmacenamientoId(e.target.value || null)}
            className="w-full rounded-lg border border-primary/15 bg-transparent px-3 py-2 text-xs font-bold text-primary/85 outline-none focus:border-primary/40"
          >
            {almacenamientos.map((a) => (
              <option key={a.id} value={a.id} className="bg-[var(--bg-main)]">
                {a.nombre} ({a.soporteNombre ?? a.soporteCodigo})
              </option>
            ))}
          </select>
        )}
      </div>

      {!creandoAlmacenamiento && almacenamientoId ? (
        <>
          <div>
            <label className="mb-1 block text-[9px] font-black uppercase tracking-widest text-primary/35">
              Nombre de la preparación
            </label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Espada Ígnea"
              className="w-full rounded-lg border border-primary/15 bg-transparent px-3 py-2 text-xs font-bold text-primary/85 outline-none focus:border-primary/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[9px] font-black uppercase tracking-widest text-primary/35">
                Calidad ({calidad.toFixed(2)})
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
            resultado.ok ? "border-emerald-500/20 text-emerald-500" : "border-red-500/20 text-red-400"
          }`}
        >
          {resultado.mensaje}
        </div>
      ) : null}

      <div className="flex items-center gap-2 border-t border-primary/10 pt-3">
        {!creandoAlmacenamiento ? (
          <button
            type="button"
            onClick={handlePreparar}
            disabled={!almacenamientoId || nombre.trim().length === 0 || enviando}
            className="rounded-lg bg-primary/10 px-3.5 py-2 text-[10px] font-black uppercase tracking-widest text-primary/85 transition-colors hover:bg-primary/15 disabled:opacity-40"
          >
            {enviando ? "Preparando…" : "Preparar"}
          </button>
        ) : null}
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

// ── 7-8. Preparaciones existentes + detalle ──────────────────────────────

function DetallePreparacion({
  preparacion,
  onReevaluar,
}: {
  preparacion: PreparacionIumObjeto;
  onReevaluar: () => void;
}) {
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
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-lg bg-primary/5 p-2.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-primary/35">Proceso</p>
          <p className="mt-0.5 text-xs font-bold text-primary/80">{preparacion.procesoNombre ?? "—"}</p>
        </div>
        <div className="rounded-lg bg-primary/5 p-2.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-primary/35">Oris</p>
          <p className="mt-0.5 text-xs font-bold text-primary/80">{preparacion.orisNombre ?? preparacion.orisId}</p>
        </div>
        <div className="rounded-lg bg-primary/5 p-2.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-primary/35">Configuración</p>
          <p className="mt-0.5 text-xs font-bold text-primary/80">{preparacion.configuracionNombre ?? "—"}</p>
        </div>
      </div>

      {preparacion.topologiaId ? (
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-primary/35">Topología</span>
          <StatusPill>{preparacion.topologiaId}</StatusPill>
        </div>
      ) : null}

      <div>
        <p className="mb-1.5 text-[9px] font-black uppercase tracking-widest text-primary/35">
          IUMs ({preparacion.iumCount})
        </p>
        {preparacion.iums.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {preparacion.iums.map((ium) => (
              <div
                key={ium.componenteId}
                className="flex flex-wrap items-center gap-1.5 rounded-lg border border-primary/10 px-2.5 py-1.5"
              >
                <span className="text-[11px] font-black text-primary/80">{ium.iumId}</span>
                <span className="text-[10px] text-primary/40">pos. {ium.posicion}</span>
                {ium.rol ? <StatusPill>{ium.rol}</StatusPill> : null}
                {ium.participacion ? <span className="text-[10px] text-primary/40">{ium.participacion}</span> : null}
                <span className="text-[10px] text-primary/30">orden {ium.orden}</span>
                {ium.salidaFuncionalId ? (
                  <span className="text-[10px] text-primary/30">salida: {ium.salidaFuncionalId}</span>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <EmptyRow>Sin snapshot de IUMs para esta preparación.</EmptyRow>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-[9px] font-black uppercase tracking-widest text-primary/35">
          Enlaces ({preparacion.unionCount})
        </p>
        {preparacion.uniones.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {preparacion.uniones.map((u, i) => (
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
          <EmptyRow>Sin enlaces registrados en el snapshot.</EmptyRow>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg bg-primary/5 p-2.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-primary/35">Calidad</p>
          <p className="mt-0.5 text-xs font-black text-primary/85">{preparacion.calidadPreparacion.toFixed(2)}</p>
        </div>
        <div className="rounded-lg bg-primary/5 p-2.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-primary/35">Coherencia actual</p>
          <p className="mt-0.5 text-xs font-black text-primary/85">{preparacion.coherenciaActual.toFixed(3)}</p>
        </div>
        <div className="rounded-lg bg-primary/5 p-2.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-primary/35">Tasa de disolución</p>
          <p className="mt-0.5 text-xs font-black text-primary/85">{preparacion.tasaDisolucionH.toFixed(4)} /h</p>
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
      </div>

      <p className="text-[10px] leading-4 text-primary/30">
        Activar (evaluar contra un Oris/orden real) pertenece al runtime de Supabase y requiere una
        orden de Eterium existente; no se ejecuta lógica de activación en React.
      </p>
    </div>
  );
}

function TarjetaPreparacion({
  preparacion,
  abierta,
  onToggle,
  onReevaluar,
}: {
  preparacion: PreparacionIumObjeto;
  abierta: boolean;
  onToggle: () => void;
  onReevaluar: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
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
            {preparacion.iumCount} IUM · {preparacion.unionCount} enlaces
          </span>
          <span className="rounded-md bg-primary/5 px-2 py-1 text-[10px] font-bold text-primary/50">
            Coherencia {(preparacion.coherenciaActual * 100).toFixed(0)}%
          </span>
        </div>
      </button>
      {abierta ? <DetallePreparacion preparacion={preparacion} onReevaluar={onReevaluar} /> : null}
    </div>
  );
}

function FormularioCrearAlmacenamiento({
  hook,
  onCreado,
  onCancelar,
}: {
  hook: ReturnType<typeof useProcesosPreparacionesIum>;
  onCreado: () => void;
  onCancelar: () => void;
}) {
  const { soportesObjeto, loadingSoportes, errorSoportes, crearAlmacenamiento } = hook;
  const [soporteTipoId, setSoporteTipoId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null);

  const handleCrear = async () => {
    if (!soporteTipoId) return;
    setEnviando(true);
    setResultado(null);
    try {
      const r = await crearAlmacenamiento({ soporteTipoId, nombre: nombre.trim() || undefined });
      if (r.estado === "creado") {
        setResultado({ ok: true, mensaje: "Almacenamiento IUM creado correctamente." });
        onCreado();
      } else {
        setResultado({ ok: false, mensaje: r.razon ? `Rechazado: ${r.razon}` : `Rechazado (${r.estado}).` });
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
        ) : errorSoportes ? (
          <div className="rounded-lg border border-red-500/20 p-2.5 text-[11px] font-bold text-red-400">
            {errorSoportes}
          </div>
        ) : soportesObjeto.length === 0 ? (
          <EmptyRow>No hay ningún soporte activo de tipo &apos;objeto&apos; disponible.</EmptyRow>
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

// ── Sección principal ─────────────────────────────────────────────────

export function SeccionProcesosPreparacionesIum({ itemId }: { itemId: string }) {
  const hook = useProcesosPreparacionesIum(itemId);
  const { loading, error, procesos, procesoSeleccionado, setProcesoSeleccionado, configuraciones, loadingConfiguraciones, almacenamientos, reevaluarPreparacion } = hook;

  const [agregandoProceso, setAgregandoProceso] = useState(false);
  const [configuracionSel, setConfiguracionSel] = useState<ConfiguracionDeProceso | null>(null);
  const [abiertaId, setAbiertaId] = useState<string | null>(null);
  const [creandoAlmacenamiento, setCreandoAlmacenamiento] = useState(false);

  const todasLasPreparaciones = almacenamientos.flatMap((a) => a.preparaciones);

  if (loading) return <LoadingRow>Cargando procesos y preparaciones del objeto…</LoadingRow>;

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs font-bold text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Procesos que facilita ── */}
      <div className="flex flex-col gap-2.5">
        <p className="text-[10px] font-black uppercase tracking-widest text-primary/40">Procesos que facilita</p>

        {procesos.length === 0 ? (
          <EmptyRow>Este objeto no tiene ningún proceso vinculado todavía.</EmptyRow>
        ) : (
          procesos.map((p) => (
            <div key={p.itemProcesoId} className="flex flex-col gap-2">
              <TarjetaProceso
                proceso={p}
                seleccionado={procesoSeleccionado?.itemProcesoId === p.itemProcesoId}
                onVerConfiguraciones={() => {
                  setConfiguracionSel(null);
                  setProcesoSeleccionado((cur) =>
                    cur?.itemProcesoId === p.itemProcesoId ? null : p,
                  );
                }}
              />
              {procesoSeleccionado?.itemProcesoId === p.itemProcesoId ? (
                <div className="flex flex-col gap-2 pl-3">
                  {loadingConfiguraciones ? (
                    <LoadingRow>Cargando configuraciones…</LoadingRow>
                  ) : configuraciones.length === 0 ? (
                    <EmptyRow>No hay configuraciones IUM registradas para este proceso.</EmptyRow>
                  ) : (
                    configuraciones.map((c) => (
                      <TarjetaConfiguracion
                        key={c.configuracionId}
                        configuracion={c}
                        onSeleccionar={() => setConfiguracionSel(c)}
                      />
                    ))
                  )}
                  {configuracionSel && configuraciones.some((c) => c.configuracionId === configuracionSel.configuracionId) ? (
                    <FormularioPrepararConfiguracion
                      configuracion={configuracionSel}
                      hook={hook}
                      onPreparada={() => {
                        setConfiguracionSel(null);
                        setProcesoSeleccionado(null);
                      }}
                      onCancelar={() => setConfiguracionSel(null)}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          ))
        )}

        {agregandoProceso ? (
          <FormularioAgregarProceso
            hook={hook}
            onAgregado={() => setAgregandoProceso(false)}
            onCancelar={() => setAgregandoProceso(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setAgregandoProceso(true);
              hook.cargarCatalogoProcesos();
            }}
            className="self-start rounded-lg border border-dashed border-primary/20 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-primary/40 transition-colors hover:border-primary/35 hover:text-primary/60"
          >
            + Agregar proceso
          </button>
        )}
      </div>

      {/* ── Preparaciones IUM existentes ── */}
      <div className="flex flex-col gap-2.5 border-t border-primary/10 pt-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-primary/40">IUMs preparados</p>

        {almacenamientos.length === 0 ? (
          <EmptyRow>
            Este objeto no tiene almacenamiento IUM todavía. Se crea automáticamente al preparar la
            primera configuración desde un proceso, o podés crearlo directamente acá abajo.
          </EmptyRow>
        ) : todasLasPreparaciones.length === 0 ? (
          <EmptyRow>Este objeto tiene almacenamiento IUM pero ninguna preparación todavía.</EmptyRow>
        ) : (
          todasLasPreparaciones.map((p) => (
            <TarjetaPreparacion
              key={p.id}
              preparacion={p}
              abierta={abiertaId === p.id}
              onToggle={() => setAbiertaId((cur) => (cur === p.id ? null : p.id))}
              onReevaluar={() => reevaluarPreparacion(p.id)}
            />
          ))
        )}

        {/* Un objeto puede tener más de un almacenamiento IUM (sin unicidad
            en almacenamientos_ium_v1 sobre ubicacion_id) — disponible
            siempre, no solo cuando la lista está vacía. */}
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
            {almacenamientos.length === 0 ? "+ Crear almacenamiento IUM" : "+ Crear otro almacenamiento IUM"}
          </button>
        )}
      </div>
    </div>
  );
}

export default SeccionProcesosPreparacionesIum;
