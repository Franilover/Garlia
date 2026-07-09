"use client";

/**
 * SelectorFechaMundo.tsx
 * ────────────────────────
 * Selector de fecha del calendario del mundo: muestra la fecha legible y
 * al hacer click abre un editor inline (año/estación/día) en un portal.
 *
 * Rediseño (v2): mismo contrato de props y misma lógica de conversión de
 * fechas que antes — lo que cambia es la presentación:
 *   - Trigger con ícono de calendario y estado hover/focus más claro.
 *   - El panel abre con una animación breve de fade + scale (mount state).
 *   - Cabecera FIJA (sticky) con la fecha resultante en grande, en vivo,
 *     mientras se edita — así siempre se ve el resultado sin scrollear.
 *   - Selector de año como "stepper" con feedback visual más fuerte.
 *   - Estaciones como tarjetas con un acento de color por estación
 *     (derivado de forma determinística de su nombre) para ubicarse de
 *     un vistazo.
 *   - Grilla de días con botones circulares, mejor contraste de
 *     seleccionado/hoy-de-la-estación y accesos rápidos (+7/-7, primer/
 *     último día de la estación).
 *   - Pie FIJO (sticky) con Limpiar / Confirmar, siempre visible.
 *
 * Incluye FechaMundoEditor como componente privado (solo lo usa este
 * selector, no se exporta).
 *
 * Ruta: src/features/editorGarlia/components/calendario/SelectorFechaMundo.tsx
 */

import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useCalendario } from "@/features/editorGarlia/hooks/calendario/useCalendario";
import type {
  Estacion,
  CalendarioConfig,
  EraMundo,
} from "@/lib/utils/calendario";
import {
  diaAbsolutoAFecha,
  fechaADiaAbsoluto,
  formatFechaCorta,
} from "@/lib/utils/calendario";

// ─── Acento de color por estación ──────────────────────────────────────────────
// Determinístico a partir del nombre base (sin importar el orden), para que
// cada estación tenga siempre el mismo color entre renders/pantallas.
const ACENTOS_ESTACION = [
  "#f59e0b", // ámbar
  "#22c55e", // verde
  "#3b82f6", // azul
  "#ec4899", // rosa
  "#a855f7", // violeta
  "#14b8a6", // teal
  "#ef4444", // rojo
  "#84cc16", // lima
];

function acentoParaNombre(nombre: string): string {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) {
    hash = (hash * 31 + nombre.charCodeAt(i)) >>> 0;
  }
  return ACENTOS_ESTACION[hash % ACENTOS_ESTACION.length];
}

// value: día absoluto | null
// onChange: devuelve el nuevo día absoluto
export function SelectorFechaMundo({
  value,
  onChange,
  placeholder = "Sin fecha asignada",
}: {
  value: number | null;
  onChange: (diaAbsoluto: number | null) => void;
  placeholder?: string;
}) {
  const { cal, loading } = useCalendario();
  const [open, setOpen] = useState(false);
  // Estado separado para animar la salida: el portal sigue montado un
  // instante más mientras la transición de opacidad/escala se completa.
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const closeAnimado = () => {
    setVisible(false);
    window.setTimeout(() => setOpen(false), 120);
  };

  // Cerrar al click fuera (incluye el dropdown en portal)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      if (open) closeAnimado();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Calcular posición del dropdown al abrir y al hacer scroll/resize
  useEffect(() => {
    if (!open) return;
    const update = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const dropdownWidth = Math.max(r.width, 280);
      // Evitar que se salga por la derecha
      let left = r.left;
      if (left + dropdownWidth > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - dropdownWidth - 8);
      }
      // Si no hay espacio abajo, abrir hacia arriba
      const spaceBelow = window.innerHeight - r.bottom;
      const estimatedHeight = 460;
      const top =
        spaceBelow < estimatedHeight && r.top > estimatedHeight
          ? r.top - estimatedHeight - 4
          : r.bottom + 4;
      setPos({ top, left, width: dropdownWidth });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  // Disparar la animación de entrada en el frame siguiente al montar.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  const fechaRaw =
    cal && value != null
      ? diaAbsolutoAFecha(value, cal.estaciones, cal.config)
      : null;
  // Si el día absoluto cae fuera de cualquier estación definida (datos viejos
  // o calendario incompleto), diaAbsolutoAFecha puede devolver `estacion`
  // como undefined. En ese caso tratamos la fecha como inválida para no
  // romper formatFechaCorta / formatFechaMundo.
  const fecha = fechaRaw && fechaRaw.estacion ? fechaRaw : null;
  const acentoActual = fecha ? acentoParaNombre(fecha.estacion.nombre) : null;

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        ref={triggerRef}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left transition-all"
        style={{
          background: open
            ? "color-mix(in srgb, var(--primary) 6%, transparent)"
            : "color-mix(in srgb, var(--primary) 2%, transparent)",
          borderColor: open
            ? "color-mix(in srgb, var(--accent) 35%, transparent)"
            : "color-mix(in srgb, var(--primary) 12%, transparent)",
          boxShadow: open
            ? "0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent)"
            : "none",
        }}
        type="button"
        onClick={() => (open ? closeAnimado() : setOpen(true))}
      >
        <CalendarDays
          className="shrink-0"
          size={11}
          style={{
            color: fecha
              ? (acentoActual as string)
              : "color-mix(in srgb, var(--primary) 30%, transparent)",
          }}
        />
        {loading ? (
          <Loader2 className="animate-spin text-primary/30" size={9} />
        ) : fecha ? (
          <div className="flex-1 min-w-0">
            <span className="text-micro font-bold text-primary truncate block">
              {formatFechaCorta(fecha)}
            </span>
          </div>
        ) : (
          <span className="flex-1 text-micro text-primary/30 italic">
            {placeholder}
          </span>
        )}
        <ChevronDown
          className="shrink-0 text-primary/25 transition-transform duration-150"
          size={9}
          style={{ transform: open ? "rotate(180deg)" : undefined }}
        />
      </button>

      {/* Dropdown — renderizado en portal para no quedar cortado por contenedores con overflow */}
      {open &&
        cal &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] rounded-2xl border shadow-xl overflow-hidden flex flex-col transition-all duration-150 ease-out"
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width,
              maxHeight: "min(460px, calc(100vh - 16px))",
              background: "var(--bg-main)",
              borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
              opacity: visible ? 1 : 0,
              transform: visible
                ? "translateY(0) scale(1)"
                : "translateY(-4px) scale(0.98)",
            }}
          >
            <FechaMundoEditor
              config={cal.config}
              eras={cal.eras}
              estaciones={cal.estaciones}
              value={value}
              onChange={(dia) => {
                onChange(dia);
                closeAnimado();
              }}
              onClear={
                value != null
                  ? () => {
                      onChange(null);
                      closeAnimado();
                    }
                  : undefined
              }
              onRequestClose={closeAnimado}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}

// ─── FechaMundoEditor ─────────────────────────────────────────────────────────
// Editor: selecciona año, estación y día. Cabecera y pie sticky para que el
// resultado y las acciones nunca queden fuera de vista. Privado — solo lo
// usa SelectorFechaMundo, por eso no se exporta.
function FechaMundoEditor({
  value,
  estaciones,
  config,
  eras: _eras,
  onChange,
  onClear,
  onRequestClose,
}: {
  value: number | null;
  estaciones: Estacion[];
  config: CalendarioConfig;
  eras: EraMundo[];
  onChange: (dia: number) => void;
  onClear?: () => void;
  onRequestClose: () => void;
}) {
  const estOrdenadas = [...estaciones].sort((a, b) => a.orden - b.orden);

  // ─── Agrupar estaciones por nombre base ──────────────────────────────────
  // "Florial1" / "Florial2" → grupo "Florial" con 2 partes (mostradas como
  // dos calendarios lado a lado). Los nombres SIN sufijo numérico (ej.
  // "Sivial") quedan cada uno en su propio grupo, aunque se repitan —
  // representan estaciones distintas del calendario (una a mitad de año,
  // otra al final), no dos mitades de la misma.
  type GrupoEstacion = { nombre: string; partes: Estacion[] };
  const gruposEstacion: GrupoEstacion[] = [];
  {
    const porNombreBase = new Map<string, Estacion[]>();
    for (const est of estOrdenadas) {
      const tieneSufijo = /\d+$/.test(est.nombre);
      // Clave única: si no tiene sufijo numérico, cada estación es su propio
      // grupo (usamos su id para no fusionar duplicados de nombre).
      const base = tieneSufijo
        ? est.nombre.replace(/\s*\d+$/, "")
        : `${est.nombre}__${est.id}`;
      const arr = porNombreBase.get(base) ?? [];
      arr.push(est);
      porNombreBase.set(base, arr);
    }
    // Mantener el orden de aparición original
    const vistos = new Set<string>();
    for (const est of estOrdenadas) {
      const tieneSufijo = /\d+$/.test(est.nombre);
      const base = tieneSufijo
        ? est.nombre.replace(/\s*\d+$/, "")
        : `${est.nombre}__${est.id}`;
      if (vistos.has(base)) continue;
      vistos.add(base);
      const partes = porNombreBase.get(base)!;
      gruposEstacion.push({ nombre: tieneSufijo ? base : est.nombre, partes });
    }
  }

  const grupoDeEstacion = (orden: number) =>
    gruposEstacion.find((g) => g.partes.some((p) => p.orden === orden));

  // Estado inicial desde value
  const inicial =
    value != null ? diaAbsolutoAFecha(value, estaciones, config) : null;

  const [anio, setAnio] = useState(inicial?.anio ?? config.anio_inicio);
  const [anioStr, setAnioStr] = useState(
    String(inicial?.anio ?? config.anio_inicio),
  );
  const [estOrden, setEstOrden] = useState(
    inicial?.estacion?.orden ?? estOrdenadas[0]?.orden ?? 1,
  );
  const [diaEnEst, setDiaEnEst] = useState(inicial?.dia_en_estacion ?? 1);
  const [diaEnEstStr, setDiaEnEstStr] = useState(
    String(inicial?.dia_en_estacion ?? 1),
  );

  const estSel =
    estOrdenadas.find((e) => e.orden === estOrden) ?? estOrdenadas[0];
  const grupoActual = grupoDeEstacion(estOrden) ?? gruposEstacion[0];
  const acentoSel = acentoParaNombre(grupoActual?.nombre ?? estSel.nombre);

  const semana = Math.floor((diaEnEst - 1) / config.dias_por_semana) + 1;
  const diaEnSemana = ((diaEnEst - 1) % config.dias_por_semana) + 1;
  const totalSemanas = Math.ceil(estSel.duracion_dias / config.dias_por_semana);

  // Vista previa en vivo del resultado, según el estado actual del editor
  // (no hace falta confirmar para verla — se actualiza con cada click).
  const diaClamp = Math.max(1, Math.min(diaEnEst, estSel.duracion_dias));
  const previewFecha = diaAbsolutoAFecha(
    fechaADiaAbsoluto(
      { anio, estacion_orden: estOrden, dia_en_estacion: diaClamp },
      estaciones,
      config,
    ),
    estaciones,
    config,
  );

  const handleConfirm = () => {
    const dia = fechaADiaAbsoluto(
      {
        anio,
        estacion_orden: estOrden,
        dia_en_estacion: diaClamp,
      },
      estaciones,
      config,
    );
    onChange(dia);
  };

  const irADia = (dia: number) => {
    const clamped = Math.max(1, Math.min(dia, estSel.duracion_dias));
    setDiaEnEst(clamped);
    setDiaEnEstStr(String(clamped));
  };

  return (
    <div className="flex flex-col min-h-0">
      {/* Cabecera fija: vista previa en vivo del resultado */}
      <div
        className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b"
        style={{
          borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
          background: `color-mix(in srgb, ${acentoSel} 7%, var(--bg-main))`,
        }}
      >
        <span
          className="shrink-0 w-2 h-2 rounded-full"
          style={{ background: acentoSel }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-micro font-black text-primary truncate">
            {formatFechaCorta(previewFecha)}
          </p>
          <p className="text-micro text-primary/35">
            Semana {semana} de {totalSemanas} · Día {diaEnSemana} de{" "}
            {config.dias_por_semana}
          </p>
        </div>
        <button
          className="shrink-0 flex items-center justify-center w-5 h-5 rounded-md text-primary/30 hover:text-primary transition-colors"
          type="button"
          onClick={onRequestClose}
        >
          <X size={12} />
        </button>
      </div>

      {/* Contenido scrolleable */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3.5">
        {/* Año */}
        <div className="space-y-1">
          <label className="text-micro font-black uppercase tracking-[0.18em] text-primary/35">
            Año
          </label>
          <div className="flex items-center gap-1.5">
            <button
              className="flex items-center justify-center w-7 h-7 rounded-lg border transition-all active:scale-95"
              style={{
                borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
                color: "var(--primary)",
              }}
              type="button"
              onClick={() => {
                const v = anio - 1;
                setAnio(v);
                setAnioStr(String(v));
              }}
            >
              <ChevronLeft size={12} />
            </button>
            <input
              className="flex-1 text-center rounded-lg border px-2 py-1.5 text-sm font-black outline-none transition-all"
              style={{
                background: "color-mix(in srgb, var(--primary) 2%, transparent)",
                borderColor: "color-mix(in srgb, var(--primary) 14%, transparent)",
                color: "var(--primary)",
              }}
              type="number"
              value={anioStr}
              onChange={(e) => {
                setAnioStr(e.target.value);
                const n = parseInt(e.target.value, 10);
                if (!isNaN(n)) setAnio(n);
              }}
            />
            <button
              className="flex items-center justify-center w-7 h-7 rounded-lg border transition-all active:scale-95"
              style={{
                borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
                color: "var(--primary)",
              }}
              type="button"
              onClick={() => {
                const v = anio + 1;
                setAnio(v);
                setAnioStr(String(v));
              }}
            >
              <ChevronRight size={12} />
            </button>
          </div>
        </div>

        {/* Estación */}
        <div className="space-y-1">
          <label className="text-micro font-black uppercase tracking-[0.18em] text-primary/35">
            Estación
          </label>
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
          >
            {gruposEstacion.map((grupo) => {
              const activo = grupo.partes.some((p) => p.orden === estOrden);
              const totalDias = grupo.partes.reduce(
                (s, p) => s + p.duracion_dias,
                0,
              );
              const acento = acentoParaNombre(grupo.nombre);
              return (
                <button
                  key={grupo.nombre}
                  className="relative px-2 py-1.5 rounded-lg border text-center transition-all overflow-hidden active:scale-95"
                  style={{
                    background: activo
                      ? `color-mix(in srgb, ${acento} 14%, transparent)`
                      : "color-mix(in srgb, var(--primary) 2%, transparent)",
                    borderColor: activo
                      ? `color-mix(in srgb, ${acento} 45%, transparent)`
                      : "color-mix(in srgb, var(--primary) 10%, transparent)",
                    color: activo
                      ? acento
                      : "color-mix(in srgb, var(--primary) 45%, transparent)",
                  }}
                  type="button"
                  onClick={() => {
                    const primera = grupo.partes[0];
                    setEstOrden(primera.orden);
                    setDiaEnEst(1);
                    setDiaEnEstStr("1");
                  }}
                >
                  <span
                    className="absolute left-0 top-0 bottom-0 w-0.5"
                    style={{ background: activo ? acento : "transparent" }}
                  />
                  <div className="text-micro font-black uppercase tracking-wide">
                    {grupo.nombre}
                  </div>
                  <div className="text-micro opacity-60">{totalDias}d</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Semana / día */}
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <label className="text-micro font-black uppercase tracking-[0.18em] text-primary/35">
              Día
            </label>
            <div className="flex items-center gap-1">
              <button
                className="text-micro font-bold px-1.5 py-0.5 rounded transition-colors"
                style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
                type="button"
                onClick={() => irADia(1)}
              >
                Primero
              </button>
              <span className="text-primary/15">·</span>
              <button
                className="text-micro font-bold px-1.5 py-0.5 rounded transition-colors"
                style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
                type="button"
                onClick={() => irADia(estSel.duracion_dias)}
              >
                Último
              </button>
            </div>
          </div>

          {/* Grid(s) de días — uno por cada parte del grupo (ej. Florial 1 / Florial 2) */}
          <div
            className="grid gap-1.5"
            style={{
              gridTemplateColumns: `repeat(${grupoActual.partes.length}, 1fr)`,
            }}
          >
            {grupoActual.partes.map((parte, idx) => {
              const esActiva = parte.orden === estOrden;
              return (
                <div
                  key={parte.id}
                  className="rounded-lg border overflow-hidden"
                  style={{
                    borderColor: esActiva
                      ? `color-mix(in srgb, ${acentoSel} 35%, transparent)`
                      : "color-mix(in srgb, var(--primary) 10%, transparent)",
                  }}
                >
                  {/* Etiqueta de la parte (solo si hay más de una) */}
                  {grupoActual.partes.length > 1 && (
                    <div
                      className="text-center py-0.5 text-micro font-black uppercase tracking-widest"
                      style={{
                        background: esActiva
                          ? `color-mix(in srgb, ${acentoSel} 10%, transparent)`
                          : "color-mix(in srgb, var(--primary) 4%, transparent)",
                        color: esActiva
                          ? acentoSel
                          : "color-mix(in srgb, var(--primary) 35%, transparent)",
                      }}
                    >
                      {grupoActual.nombre} {idx + 1}
                    </div>
                  )}
                  {/* Cabecera de días de semana */}
                  <div
                    className="grid border-b"
                    style={{
                      gridTemplateColumns: `repeat(${config.dias_por_semana}, 1fr)`,
                      borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
                      background: "color-mix(in srgb, var(--primary) 3%, transparent)",
                    }}
                  >
                    {Array.from({ length: config.dias_por_semana }, (_, i) => (
                      <div
                        key={i}
                        className="text-center py-1 text-micro font-black uppercase tracking-widest text-primary/25"
                      >
                        D{i + 1}
                      </div>
                    ))}
                  </div>

                  {/* Días */}
                  <div
                    className="grid p-1.5 gap-1"
                    style={{
                      gridTemplateColumns: `repeat(${config.dias_por_semana}, 1fr)`,
                    }}
                  >
                    {Array.from({ length: parte.duracion_dias }, (_, i) => {
                      const dia = i + 1;
                      const selected = esActiva && dia === diaEnEst;
                      return (
                        <button
                          key={dia}
                          className="aspect-square rounded-full flex items-center justify-center text-micro font-bold transition-all active:scale-90"
                          style={{
                            background: selected
                              ? acentoSel
                              : "transparent",
                            color: selected
                              ? "white"
                              : "color-mix(in srgb, var(--primary) 50%, transparent)",
                            fontWeight: selected ? 900 : undefined,
                            boxShadow: selected
                              ? `0 0 0 3px color-mix(in srgb, ${acentoSel} 20%, transparent)`
                              : undefined,
                          }}
                          type="button"
                          onClick={() => {
                            setEstOrden(parte.orden);
                            setDiaEnEst(dia);
                            setDiaEnEstStr(String(dia));
                          }}
                          onMouseEnter={(e) => {
                            if (!selected)
                              (e.currentTarget as HTMLButtonElement).style.background =
                                "color-mix(in srgb, var(--primary) 6%, transparent)";
                          }}
                          onMouseLeave={(e) => {
                            if (!selected)
                              (e.currentTarget as HTMLButtonElement).style.background =
                                "transparent";
                          }}
                        >
                          {dia}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input directo + pasos rápidos ±7 */}
          <div className="flex items-center gap-1 pt-0.5">
            <button
              className="text-micro font-bold px-1.5 py-0.5 rounded transition-colors"
              style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
              type="button"
              onClick={() => irADia(diaEnEst - 7)}
            >
              −7
            </button>
            <input
              className="w-14 rounded-lg border px-2 py-0.5 text-micro font-black text-center outline-none"
              max={estSel.duracion_dias}
              min={1}
              style={{
                background: "transparent",
                borderColor: "color-mix(in srgb, var(--primary) 14%, transparent)",
                color: "var(--primary)",
              }}
              type="number"
              value={diaEnEstStr}
              onChange={(e) => {
                setDiaEnEstStr(e.target.value);
                const n = parseInt(e.target.value, 10);
                if (!isNaN(n) && n >= 1 && n <= estSel.duracion_dias)
                  setDiaEnEst(n);
              }}
            />
            <span className="text-micro text-primary/25">/ {estSel.duracion_dias}</span>
            <button
              className="text-micro font-bold px-1.5 py-0.5 rounded transition-colors"
              style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
              type="button"
              onClick={() => irADia(diaEnEst + 7)}
            >
              +7
            </button>
          </div>
        </div>
      </div>

      {/* Pie fijo: acciones */}
      <div
        className="shrink-0 flex gap-1.5 p-2.5 border-t"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)" }}
      >
        {onClear && (
          <button
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-micro font-black uppercase tracking-widest transition-all active:scale-95"
            style={{
              borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
              color: "color-mix(in srgb, var(--primary) 35%, transparent)",
            }}
            type="button"
            onClick={onClear}
          >
            <X size={8} /> Limpiar
          </button>
        )}
        <button
          className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-micro font-black uppercase tracking-widest transition-all active:scale-95"
          style={{ background: acentoSel, color: "white" }}
          type="button"
          onClick={handleConfirm}
        >
          <Check size={9} /> Confirmar
        </button>
      </div>
    </div>
  );
}
