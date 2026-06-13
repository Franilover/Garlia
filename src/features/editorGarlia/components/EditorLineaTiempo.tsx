"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp, Loader2, Check, X, Clock } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase"; 
import {
  Estacion, CalendarioConfig, EraMundo, FechaMundo,
  diaAbsolutoAFecha, fechaADiaAbsoluto, formatFechaMundo, formatFechaCorta,
  diasPorAnio, eraEnAnio,
} from "@/lib/utils/calendario";

// ─── Hook: cargar calendario desde Supabase una sola vez ──────────────────────
type CalCache = { estaciones: Estacion[]; config: CalendarioConfig; eras: EraMundo[] };
let _cache: CalCache | null = null;

const LS_KEY = "garlia-calendario-cache-v2";

function leerCacheLocal(): CalCache | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CalCache;
  } catch { return null; }
}

function guardarCacheLocal(data: CalCache) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
}

export function useCalendario() {
  const [data, setData] = useState<CalCache | null>(_cache ?? leerCacheLocal());
  const [loading, setLoading] = useState(!_cache && !data);

  useEffect(() => {
    // Si ya tenemos algo (memoria o localStorage), no bloqueamos la UI —
    // refrescamos en background de todas formas.
    if (_cache) { setData(_cache); setLoading(false); }
    else if (data) { setLoading(false); }

    if (!navigator.onLine) { setLoading(false); return; }

    Promise.all([
      supabase.from("calendario_estaciones").select("*").order("orden"),
      supabase.from("calendario_config").select("*").single(),
      (supabase as any).from("eras_mundo").select("*").order("anio_inicio"),
    ]).then(([{ data: est }, { data: cfg }, { data: eras }]) => {
      const fresh: CalCache = {
        estaciones: (est ?? []) as Estacion[],
        config: (cfg ?? { dias_por_semana: 5, horas_por_dia: 25, anio_inicio: 0 }) as CalendarioConfig,
        eras: (eras ?? []) as EraMundo[],
      };
      _cache = fresh;
      guardarCacheLocal(fresh);
      setData(fresh);
      setLoading(false);
    }).catch(() => {
      // Sin red o error: si ya teníamos datos locales, seguimos con esos.
      setLoading(false);
    });
  }, []);

  return { cal: data, loading };
}

// ─── SelectorFechaMundo ───────────────────────────────────────────────────────
// Selector compacto: muestra la fecha legible y al hacer click abre el editor.
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
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

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

  const dropdownRef = useRef<HTMLDivElement>(null);

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
      const top = spaceBelow < estimatedHeight && r.top > estimatedHeight
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

  const fechaRaw = cal && value != null ? diaAbsolutoAFecha(value, cal.estaciones, cal.config) : null;
  // Si el día absoluto cae fuera de cualquier estación definida (datos viejos
  // o calendario incompleto), diaAbsolutoAFecha puede devolver `estacion`
  // como undefined. En ese caso tratamos la fecha como inválida para no
  // romper formatFechaCorta / formatFechaMundo.
  const fecha = fechaRaw && fechaRaw.estacion ? fechaRaw : null;
  const era = fecha && cal ? eraEnAnio(fecha.anio, cal.eras) : null;

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left transition-all"
        style={{
          background: open ? "color-mix(in srgb, var(--primary) 5%, transparent)" : "transparent",
          borderColor: open
            ? "color-mix(in srgb, var(--primary) 22%, transparent)"
            : "color-mix(in srgb, var(--primary) 12%, transparent)",
        }}
      >
        {loading ? (
          <Loader2 size={9} className="animate-spin text-primary/30" />
        ) : fecha ? (
          <div className="flex-1 min-w-0">
            {era && (
              <div className="flex items-center gap-1 mb-0.5">
                <div className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: era.color ?? "var(--accent)" }} />
                <span className="text-[7px] font-black uppercase tracking-widest truncate"
                  style={{ color: era.color ?? "var(--accent)" }}>
                  {era.nombre}
                </span>
              </div>
            )}
            <span className="text-[9px] font-bold text-primary truncate block">
              {formatFechaCorta(fecha)}
            </span>
          </div>
        ) : (
          <span className="flex-1 text-[9px] text-primary/30 italic">{placeholder}</span>
        )}
        <ChevronDown size={9} className="shrink-0 text-primary/25 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : undefined }} />
      </button>

      {/* Dropdown — renderizado en portal para no quedar cortado por contenedores con overflow */}
      {open && cal && pos && typeof document !== "undefined" && createPortal(
        <div ref={dropdownRef} className="fixed z-[1000] rounded-xl border shadow-lg overflow-hidden"
          style={{
            top: pos.top,
            left: pos.left,
            width: pos.width,
            maxHeight: "min(420px, calc(100vh - 16px))",
            overflowY: "auto",
            background: "var(--bg-main)",
            borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
          }}>
          <FechaMundoEditor
            value={value}
            estaciones={cal.estaciones}
            config={cal.config}
            eras={cal.eras}
            onChange={(dia) => { onChange(dia); setOpen(false); }}
            onClear={value != null ? () => { onChange(null); setOpen(false); } : undefined}
          />
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── FechaMundoEditor ─────────────────────────────────────────────────────────
// Editor inline: selecciona año, estación y día.

function FechaMundoEditor({
  value, estaciones, config, eras, onChange, onClear,
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
      const base = tieneSufijo ? est.nombre.replace(/\s*\d+$/, "") : `${est.nombre}__${est.id}`;
      const arr = porNombreBase.get(base) ?? [];
      arr.push(est);
      porNombreBase.set(base, arr);
    }
    // Mantener el orden de aparición original
    const vistos = new Set<string>();
    for (const est of estOrdenadas) {
      const tieneSufijo = /\d+$/.test(est.nombre);
      const base = tieneSufijo ? est.nombre.replace(/\s*\d+$/, "") : `${est.nombre}__${est.id}`;
      if (vistos.has(base)) continue;
      vistos.add(base);
      const partes = porNombreBase.get(base)!;
      gruposEstacion.push({ nombre: tieneSufijo ? base : est.nombre, partes });
    }
  }

  const grupoDeEstacion = (orden: number) => gruposEstacion.find(g => g.partes.some(p => p.orden === orden));

  // Estado inicial desde value
  const inicial = value != null
    ? diaAbsolutoAFecha(value, estaciones, config)
    : null;

  const [anio,          setAnio]         = useState(inicial?.anio ?? config.anio_inicio);
  const [anioStr,       setAnioStr]      = useState(String(inicial?.anio ?? config.anio_inicio));
  const [estOrden,      setEstOrden]     = useState(inicial?.estacion?.orden ?? estOrdenadas[0]?.orden ?? 1);
  const [diaEnEst,      setDiaEnEst]     = useState(inicial?.dia_en_estacion ?? 1);
  const [diaEnEstStr,   setDiaEnEstStr]  = useState(String(inicial?.dia_en_estacion ?? 1));

  const estSel = estOrdenadas.find(e => e.orden === estOrden) ?? estOrdenadas[0];
  const grupoActual = grupoDeEstacion(estOrden) ?? gruposEstacion[0];
  const eraActual = eraEnAnio(anio, eras);

  const semana = Math.floor((diaEnEst - 1) / config.dias_por_semana) + 1;
  const diaEnSemana = ((diaEnEst - 1) % config.dias_por_semana) + 1;
  const totalSemanas = Math.ceil(estSel.duracion_dias / config.dias_por_semana);

  const handleConfirm = () => {
    const dia = fechaADiaAbsoluto(
      { anio, estacion_orden: estOrden, dia_en_estacion: Math.max(1, Math.min(diaEnEst, estSel.duracion_dias)) },
      estaciones, config,
    );
    onChange(dia);
  };

  return (
    <div className="p-3 space-y-3">
      {/* Era badge */}
      {eraActual && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
          style={{ background: `${eraActual.color ?? "var(--accent)"}18` }}>
          <div className="w-2 h-2 rounded-full shrink-0"
            style={{ background: eraActual.color ?? "var(--accent)" }} />
          <span className="text-[8px] font-black uppercase tracking-widest"
            style={{ color: eraActual.color ?? "var(--accent)" }}>
            {eraActual.nombre}
          </span>
          {eraActual.anio_fin != null && (
            <span className="text-[7px] text-primary/30 ml-auto">
              {eraActual.anio_inicio} – {eraActual.anio_fin}
            </span>
          )}
        </div>
      )}

      {/* Año */}
      <div className="space-y-1">
        <label className="text-[8px] font-black uppercase tracking-[0.18em] text-primary/35">Año</label>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => { const v = anio - 1; setAnio(v); setAnioStr(String(v)); }}
            className="flex items-center justify-center w-6 h-6 rounded-lg border transition-all"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}>
            <ChevronDown size={10} />
          </button>
          <input
            type="number"
            value={anioStr}
            onChange={e => {
              setAnioStr(e.target.value);
              const n = parseInt(e.target.value, 10);
              if (!isNaN(n)) setAnio(n);
            }}
            className="flex-1 text-center rounded-lg border px-2 py-1 text-[11px] font-black outline-none transition-all"
            style={{
              background: "transparent",
              borderColor: "color-mix(in srgb, var(--primary) 14%, transparent)",
              color: "var(--primary)",
            }}
          />
          <button type="button" onClick={() => { const v = anio + 1; setAnio(v); setAnioStr(String(v)); }}
            className="flex items-center justify-center w-6 h-6 rounded-lg border transition-all"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}>
            <ChevronUp size={10} />
          </button>
        </div>
      </div>

      {/* Estación */}
      <div className="space-y-1">
        <label className="text-[8px] font-black uppercase tracking-[0.18em] text-primary/35">Estación</label>
        <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {gruposEstacion.map(grupo => {
            const activo = grupo.partes.some(p => p.orden === estOrden);
            const totalDias = grupo.partes.reduce((s, p) => s + p.duracion_dias, 0);
            return (
              <button
                key={grupo.nombre}
                type="button"
                onClick={() => {
                  const primera = grupo.partes[0];
                  setEstOrden(primera.orden);
                  setDiaEnEst(1);
                  setDiaEnEstStr("1");
                }}
                className="px-2 py-1.5 rounded-lg border text-center transition-all"
                style={{
                  background: activo
                    ? "color-mix(in srgb, var(--accent) 15%, transparent)"
                    : "transparent",
                  borderColor: activo
                    ? "color-mix(in srgb, var(--accent) 35%, transparent)"
                    : "color-mix(in srgb, var(--primary) 10%, transparent)",
                  color: activo ? "var(--accent)" : "color-mix(in srgb, var(--primary) 45%, transparent)",
                }}
              >
                <div className="text-[8px] font-black uppercase tracking-wide">{grupo.nombre}</div>
                <div className="text-[7px] opacity-60">{totalDias}d</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Semana / día */}
      <div className="space-y-1">
        <label className="text-[8px] font-black uppercase tracking-[0.18em] text-primary/35">
          Semana {semana} de {totalSemanas} · Día {diaEnSemana} de {config.dias_por_semana}
        </label>

        {/* Grid(s) de días — uno por cada parte del grupo (ej. Florial 1 / Florial 2) */}
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${grupoActual.partes.length}, 1fr)` }}>
          {grupoActual.partes.map((parte, idx) => {
            const esActiva = parte.orden === estOrden;
            return (
              <div key={parte.id} className="rounded-lg border overflow-hidden"
                style={{
                  borderColor: esActiva
                    ? "color-mix(in srgb, var(--accent) 30%, transparent)"
                    : "color-mix(in srgb, var(--primary) 10%, transparent)",
                }}>
                {/* Etiqueta de la parte (solo si hay más de una) */}
                {grupoActual.partes.length > 1 && (
                  <div className="text-center py-0.5 text-[7px] font-black uppercase tracking-widest"
                    style={{
                      background: esActiva
                        ? "color-mix(in srgb, var(--accent) 10%, transparent)"
                        : "color-mix(in srgb, var(--primary) 4%, transparent)",
                      color: esActiva ? "var(--accent)" : "color-mix(in srgb, var(--primary) 35%, transparent)",
                    }}>
                    {grupoActual.nombre} {idx + 1}
                  </div>
                )}
                {/* Cabecera de días de semana */}
                <div className="grid border-b"
                  style={{
                    gridTemplateColumns: `repeat(${config.dias_por_semana}, 1fr)`,
                    borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
                    background: "color-mix(in srgb, var(--primary) 3%, transparent)",
                  }}>
                  {Array.from({ length: config.dias_por_semana }, (_, i) => (
                    <div key={i} className="text-center py-1 text-[7px] font-black uppercase tracking-widest text-primary/25">
                      D{i + 1}
                    </div>
                  ))}
                </div>

                {/* Días */}
                <div className="grid p-1 gap-0.5"
                  style={{ gridTemplateColumns: `repeat(${config.dias_por_semana}, 1fr)` }}>
                  {Array.from({ length: parte.duracion_dias }, (_, i) => {
                    const dia = i + 1;
                    const selected = esActiva && dia === diaEnEst;
                    return (
                      <button
                        key={dia}
                        type="button"
                        onClick={() => { setEstOrden(parte.orden); setDiaEnEst(dia); setDiaEnEstStr(String(dia)); }}
                        className="rounded text-center py-0.5 text-[8px] font-bold transition-all"
                        style={{
                          background: selected
                            ? "var(--accent)"
                            : "transparent",
                          color: selected ? "white" : "color-mix(in srgb, var(--primary) 50%, transparent)",
                          fontWeight: selected ? "900" : undefined,
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
            type="number"
            min={1}
            max={estSel.duracion_dias}
            value={diaEnEstStr}
            onChange={e => {
              setDiaEnEstStr(e.target.value);
              const n = parseInt(e.target.value, 10);
              if (!isNaN(n) && n >= 1 && n <= estSel.duracion_dias) setDiaEnEst(n);
            }}
            className="w-16 rounded-lg border px-2 py-0.5 text-[9px] font-black text-center outline-none"
            style={{
              background: "transparent",
              borderColor: "color-mix(in srgb, var(--primary) 14%, transparent)",
              color: "var(--primary)",
            }}
          />
          <span className="text-[8px] text-primary/25">/ {estSel.duracion_dias}</span>
        </div>
      </div>

      {/* Resumen */}
      <div className="rounded-lg px-2.5 py-2 text-[8px] font-bold"
        style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}>
        Año {anio} · {grupoActual.partes.length > 1
          ? `${grupoActual.nombre} ${grupoActual.partes.findIndex(p => p.orden === estOrden) + 1}`
          : estSel.nombre} · Semana {semana} · Día {diaEnSemana}
      </div>

      {/* Acciones */}
      <div className="flex gap-1.5">
        {onClear && (
          <button type="button" onClick={onClear}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-widest transition-all"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
            <X size={8} /> Limpiar
          </button>
        )}
        <button type="button" onClick={handleConfirm}
          className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all"
          style={{ background: "var(--accent)", color: "white" }}>
          <Check size={9} /> Confirmar
        </button>
      </div>
    </div>
  );
}

// ─── FechaMundoBadge ──────────────────────────────────────────────────────────
// Muestra una fecha compacta como badge (solo lectura).
export function FechaMundoBadge({ diaAbsoluto }: { diaAbsoluto: number }) {
  const { cal, loading } = useCalendario();
  if (loading || !cal) return <Loader2 size={8} className="animate-spin text-primary/20" />;
  const fecha = diaAbsolutoAFecha(diaAbsoluto, cal.estaciones, cal.config);
  // Si el día absoluto no cae dentro de ninguna estación definida, evitamos
  // crashear formatFechaCorta y mostramos un placeholder en su lugar.
  if (!fecha.estacion) {
    return <span className="text-[9px] text-primary/30 italic">Fecha inválida</span>;
  }
  const era = eraEnAnio(fecha.anio, cal.eras);
  return (
    <span className="inline-flex items-center gap-1.5">
      {era && (
        <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0"
          style={{ background: era.color ?? "var(--accent)" }} />
      )}
      <span className="text-[9px] font-bold" style={{ color: "var(--primary)" }}>
        {formatFechaCorta(fecha)}
      </span>
    </span>
  );
}