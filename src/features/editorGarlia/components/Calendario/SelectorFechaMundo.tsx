"use client";

/**
 * SelectorFechaMundo.tsx
 * ────────────────────────
 * Selector compacto de fecha del calendario del mundo: muestra la fecha
 * legible y al hacer click abre un editor inline (año/estación/día) en
 * un portal. Extraído de EditorLineaTiempo.tsx — es un componente de UI
 * reutilizable (lo usan formularios de Personaje, Capítulos, etc.), no
 * algo exclusivo de la pantalla de línea de tiempo.
 *
 * Incluye FechaMundoEditor como componente privado (solo lo usa este
 * selector, no se exporta).
 *
 * Ruta destino:
 *   src/features/editorGarlia/components/Calendario/SelectorFechaMundo.tsx
 */

import { Check, ChevronDown, ChevronUp, Loader2, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  Estacion,
  CalendarioConfig,
  EraMundo,
  diaAbsolutoAFecha,
  fechaADiaAbsoluto,
  formatFechaCorta,
  eraEnAnio,
} from "@/lib/utils/calendario";

import { useCalendario } from "../../hooks/calendario/useCalendario";

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
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar al click fuera (incluye el dropdown en portal)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Calcular posición del dropdown al abrir y al hacer scroll/resize
  useEffect(() => {
    if (!open) return;
    const update = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const dropdownWidth = Math.max(r.width, 260);
      // Evitar que se salga por la derecha
      let left = r.left;
      if (left + dropdownWidth > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - dropdownWidth - 8);
      }
      // Si no hay espacio abajo, abrir hacia arriba
      const spaceBelow = window.innerHeight - r.bottom;
      const estimatedHeight = 420;
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

  const fechaRaw =
    cal && value != null
      ? diaAbsolutoAFecha(value, cal.estaciones, cal.config)
      : null;
  // Si el día absoluto cae fuera de cualquier estación definida (datos viejos
  // o calendario incompleto), diaAbsolutoAFecha puede devolver `estacion`
  // como undefined. En ese caso tratamos la fecha como inválida para no
  // romper formatFechaCorta / formatFechaMundo.
  const fecha = fechaRaw && fechaRaw.estacion ? fechaRaw : null;

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        ref={triggerRef}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left transition-all"
        style={{
          background: open
            ? "color-mix(in srgb, var(--primary) 5%, transparent)"
            : "transparent",
          borderColor: open
            ? "color-mix(in srgb, var(--primary) 22%, transparent)"
            : "color-mix(in srgb, var(--primary) 12%, transparent)",
        }}
        type="button"
        onClick={() => setOpen((v) => !v)}
      >
        {loading ? (
          <Loader2 className="animate-spin text-primary/30" size={9} />
        ) : fecha ? (
          <div className="flex-1 min-w-0">
            <span className="text-[9px] font-bold text-primary truncate block">
              {formatFechaCorta(fecha)}
            </span>
          </div>
        ) : (
          <span className="flex-1 text-[9px] text-primary/30 italic">
            {placeholder}
          </span>
        )}
        <ChevronDown
          className="shrink-0 text-primary/25 transition-transform"
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
            className="fixed z-[9999] rounded-xl border shadow-lg overflow-hidden"
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width,
              maxHeight: "min(420px, calc(100vh - 16px))",
              overflowY: "auto",
              background: "var(--bg-main)",
              borderColor:
                "color-mix(in srgb, var(--primary) 12%, transparent)",
            }}
          >
            <FechaMundoEditor
              config={cal.config}
              eras={cal.eras}
              estaciones={cal.estaciones}
              value={value}
              onChange={(dia) => {
                onChange(dia);
                setOpen(false);
              }}
              onClear={
                value != null
                  ? () => {
                      onChange(null);
                      setOpen(false);
                    }
                  : undefined
              }
            />
          </div>,
          document.body,
        )}
    </div>
  );
}

// ─── FechaMundoEditor ─────────────────────────────────────────────────────────
// Editor inline: selecciona año, estación y día. Privado — solo lo usa
// SelectorFechaMundo, por eso no se exporta.
function FechaMundoEditor({
  value,
  estaciones,
  config,
  eras,
  onChange,
  onClear,
}: {
  value: number | null;
  estaciones: Estacion[];
  config: CalendarioConfig;
  eras: EraMundo[];
  onChange: (dia: number) => void;
  onClear?: () => void;
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

  const semana = Math.floor((diaEnEst - 1) / config.dias_por_semana) + 1;
  const diaEnSemana = ((diaEnEst - 1) % config.dias_por_semana) + 1;
  const totalSemanas = Math.ceil(estSel.duracion_dias / config.dias_por_semana);

  const handleConfirm = () => {
    const dia = fechaADiaAbsoluto(
      {
        anio,
        estacion_orden: estOrden,
        dia_en_estacion: Math.max(1, Math.min(diaEnEst, estSel.duracion_dias)),
      },
      estaciones,
      config,
    );
    onChange(dia);
  };

  return (
    <div className="p-3 space-y-3">
      {/* Año */}
      <div className="space-y-1">
        <label className="text-[8px] font-black uppercase tracking-[0.18em] text-primary/35">
          Año
        </label>
        <div className="flex items-center gap-1.5">
          <button
            className="flex items-center justify-center w-6 h-6 rounded-lg border transition-all"
            style={{
              borderColor:
                "color-mix(in srgb, var(--primary) 12%, transparent)",
              color: "var(--primary)",
            }}
            type="button"
            onClick={() => {
              const v = anio - 1;
              setAnio(v);
              setAnioStr(String(v));
            }}
          >
            <ChevronDown size={10} />
          </button>
          <input
            className="flex-1 text-center rounded-lg border px-2 py-1 text-[11px] font-black outline-none transition-all"
            style={{
              background: "transparent",
              borderColor:
                "color-mix(in srgb, var(--primary) 14%, transparent)",
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
            className="flex items-center justify-center w-6 h-6 rounded-lg border transition-all"
            style={{
              borderColor:
                "color-mix(in srgb, var(--primary) 12%, transparent)",
              color: "var(--primary)",
            }}
            type="button"
            onClick={() => {
              const v = anio + 1;
              setAnio(v);
              setAnioStr(String(v));
            }}
          >
            <ChevronUp size={10} />
          </button>
        </div>
      </div>

      {/* Estación */}
      <div className="space-y-1">
        <label className="text-[8px] font-black uppercase tracking-[0.18em] text-primary/35">
          Estación
        </label>
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
        >
          {gruposEstacion.map((grupo) => {
            const activo = grupo.partes.some((p) => p.orden === estOrden);
            const totalDias = grupo.partes.reduce(
              (s, p) => s + p.duracion_dias,
              0,
            );
            return (
              <button
                key={grupo.nombre}
                className="px-2 py-1.5 rounded-lg border text-center transition-all"
                style={{
                  background: activo
                    ? "color-mix(in srgb, var(--accent) 15%, transparent)"
                    : "transparent",
                  borderColor: activo
                    ? "color-mix(in srgb, var(--accent) 35%, transparent)"
                    : "color-mix(in srgb, var(--primary) 10%, transparent)",
                  color: activo
                    ? "var(--accent)"
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
                <div className="text-[8px] font-black uppercase tracking-wide">
                  {grupo.nombre}
                </div>
                <div className="text-[7px] opacity-60">{totalDias}d</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Semana / día */}
      <div className="space-y-1">
        <label className="text-[8px] font-black uppercase tracking-[0.18em] text-primary/35">
          Semana {semana} de {totalSemanas} · Día {diaEnSemana} de{" "}
          {config.dias_por_semana}
        </label>

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
                    ? "color-mix(in srgb, var(--accent) 30%, transparent)"
                    : "color-mix(in srgb, var(--primary) 10%, transparent)",
                }}
              >
                {/* Etiqueta de la parte (solo si hay más de una) */}
                {grupoActual.partes.length > 1 && (
                  <div
                    className="text-center py-0.5 text-[7px] font-black uppercase tracking-widest"
                    style={{
                      background: esActiva
                        ? "color-mix(in srgb, var(--accent) 10%, transparent)"
                        : "color-mix(in srgb, var(--primary) 4%, transparent)",
                      color: esActiva
                        ? "var(--accent)"
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
                    borderColor:
                      "color-mix(in srgb, var(--primary) 8%, transparent)",
                    background:
                      "color-mix(in srgb, var(--primary) 3%, transparent)",
                  }}
                >
                  {Array.from({ length: config.dias_por_semana }, (_, i) => (
                    <div
                      key={i}
                      className="text-center py-1 text-[7px] font-black uppercase tracking-widest text-primary/25"
                    >
                      D{i + 1}
                    </div>
                  ))}
                </div>

                {/* Días */}
                <div
                  className="grid p-1 gap-0.5"
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
                        className="rounded text-center py-0.5 text-[8px] font-bold transition-all"
                        style={{
                          background: selected
                            ? "var(--accent)"
                            : "transparent",
                          color: selected
                            ? "white"
                            : "color-mix(in srgb, var(--primary) 50%, transparent)",
                          fontWeight: selected ? "900" : undefined,
                        }}
                        type="button"
                        onClick={() => {
                          setEstOrden(parte.orden);
                          setDiaEnEst(dia);
                          setDiaEnEstStr(String(dia));
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

        {/* Input directo */}
        <div className="flex items-center gap-1 pt-0.5">
          <span className="text-[8px] text-primary/30">Día directo:</span>
          <input
            className="w-16 rounded-lg border px-2 py-0.5 text-[9px] font-black text-center outline-none"
            max={estSel.duracion_dias}
            min={1}
            style={{
              background: "transparent",
              borderColor:
                "color-mix(in srgb, var(--primary) 14%, transparent)",
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
          <span className="text-[8px] text-primary/25">
            / {estSel.duracion_dias}
          </span>
        </div>
      </div>

      {/* Resumen */}
      <div
        className="rounded-lg px-2.5 py-2 text-[8px] font-bold"
        style={{
          background: "color-mix(in srgb, var(--primary) 4%, transparent)",
          color: "color-mix(in srgb, var(--primary) 50%, transparent)",
        }}
      >
        Año {anio} ·{" "}
        {grupoActual.partes.length > 1
          ? `${grupoActual.nombre} ${grupoActual.partes.findIndex((p) => p.orden === estOrden) + 1}`
          : estSel.nombre}{" "}
        · Semana {semana} · Día {diaEnSemana}
      </div>

      {/* Acciones */}
      <div className="flex gap-1.5">
        {onClear && (
          <button
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-widest transition-all"
            style={{
              borderColor:
                "color-mix(in srgb, var(--primary) 12%, transparent)",
              color: "color-mix(in srgb, var(--primary) 35%, transparent)",
            }}
            type="button"
            onClick={onClear}
          >
            <X size={8} /> Limpiar
          </button>
        )}
        <button
          className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all"
          style={{ background: "var(--accent)", color: "white" }}
          type="button"
          onClick={handleConfirm}
        >
          <Check size={9} /> Confirmar
        </button>
      </div>
    </div>
  );
}
