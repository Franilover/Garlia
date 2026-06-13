"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, ChevronUp, Loader2, Check, X, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase"; // ajusta al path de tu proyecto
import {
  Estacion, CalendarioConfig, EraMundo, FechaMundo,
  diaAbsolutoAFecha, fechaADiaAbsoluto, formatFechaMundo, formatFechaCorta,
  diasPorAnio, eraEnAnio,
} from "@/lib/utils/calendario";

// ─── Hook: cargar calendario desde Supabase una sola vez ──────────────────────
let _cache: { estaciones: Estacion[]; config: CalendarioConfig; eras: EraMundo[] } | null = null;

export function useCalendario() {
  const [data, setData] = useState<typeof _cache>(null);
  const [loading, setLoading] = useState(!_cache);

  useEffect(() => {
    if (_cache) { setData(_cache); return; }
    Promise.all([
      supabase.from("calendario_estaciones").select("*").order("orden"),
      supabase.from("calendario_config").select("*").single(),
      (supabase as any).from("eras_mundo").select("*").order("anio_inicio"),
    ]).then(([{ data: est }, { data: cfg }, { data: eras }]) => {
      _cache = {
        estaciones: (est ?? []) as Estacion[],
        config: (cfg ?? { dias_por_semana: 5, horas_por_dia: 25, anio_inicio: 0 }) as CalendarioConfig,
        eras: (eras ?? []) as EraMundo[],
      };
      setData(_cache);
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

  // Cerrar al click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fecha = cal && value != null ? diaAbsolutoAFecha(value, cal.estaciones, cal.config) : null;
  const era = fecha && cal ? eraEnAnio(fecha.anio, cal.eras) : null;

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
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

      {/* Dropdown */}
      {open && cal && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl border shadow-lg overflow-hidden"
          style={{
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
        </div>
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

  // Estado inicial desde value
  const inicial = value != null
    ? diaAbsolutoAFecha(value, estaciones, config)
    : null;

  const [anio,          setAnio]         = useState(inicial?.anio ?? config.anio_inicio);
  const [anioStr,       setAnioStr]      = useState(String(inicial?.anio ?? config.anio_inicio));
  const [estOrden,      setEstOrden]     = useState(inicial?.estacion.orden ?? 1);
  const [diaEnEst,      setDiaEnEst]     = useState(inicial?.dia_en_estacion ?? 1);
  const [diaEnEstStr,   setDiaEnEstStr]  = useState(String(inicial?.dia_en_estacion ?? 1));

  const estSel = estOrdenadas.find(e => e.orden === estOrden) ?? estOrdenadas[0];
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
          {estOrdenadas.map(est => (
            <button
              key={est.id}
              type="button"
              onClick={() => { setEstOrden(est.orden); setDiaEnEst(1); setDiaEnEstStr("1"); }}
              className="px-2 py-1.5 rounded-lg border text-center transition-all"
              style={{
                background: estOrden === est.orden
                  ? "color-mix(in srgb, var(--accent) 15%, transparent)"
                  : "transparent",
                borderColor: estOrden === est.orden
                  ? "color-mix(in srgb, var(--accent) 35%, transparent)"
                  : "color-mix(in srgb, var(--primary) 10%, transparent)",
                color: estOrden === est.orden ? "var(--accent)" : "color-mix(in srgb, var(--primary) 45%, transparent)",
              }}
            >
              <div className="text-[8px] font-black uppercase tracking-wide">{est.nombre}</div>
              <div className="text-[7px] opacity-60">{est.duracion_dias}d</div>
            </button>
          ))}
        </div>
      </div>

      {/* Semana / día */}
      <div className="space-y-1">
        <label className="text-[8px] font-black uppercase tracking-[0.18em] text-primary/35">
          Semana {semana} de {totalSemanas} · Día {diaEnSemana} de {config.dias_por_semana}
        </label>

        {/* Grid de días de la estación */}
        <div className="rounded-lg border overflow-hidden"
          style={{ borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
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
            {Array.from({ length: estSel.duracion_dias }, (_, i) => {
              const dia = i + 1;
              const selected = dia === diaEnEst;
              return (
                <button
                  key={dia}
                  type="button"
                  onClick={() => { setDiaEnEst(dia); setDiaEnEstStr(String(dia)); }}
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
        Año {anio} · {estSel.nombre} · Semana {semana} · Día {diaEnSemana}
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