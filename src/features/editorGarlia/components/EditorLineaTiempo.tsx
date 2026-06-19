"use client";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  X,
  Cake,
  SlidersHorizontal,
  Globe,
} from "lucide-react";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

import { supabase } from "@/lib/api/client/supabase";
import {
  Estacion,
  CalendarioConfig,
  EraMundo,
  diaAbsolutoAFecha,
  fechaADiaAbsoluto,
  formatFechaCorta,
  eraEnAnio,
} from "@/lib/utils/calendario";

// ─── Hook: cargar calendario — Dexie → memoria → Supabase ────────────────────
// Orden de prioridad:
//   1. Memoria del módulo (_cache)  — 0 ms, persiste durante la sesión SPA
//   2. Dexie (IndexedDB)            — ~2 ms, persiste entre recargas, offline-ready
//   3. localStorage                 — fallback legacy
//   4. Supabase                     — solo si no hay datos locales o TTL expiró
type CalCache = {
  estaciones: Estacion[];
  config: CalendarioConfig;
  eras: EraMundo[];
};
let _cache: CalCache | null = null;

const LS_KEY = "garlia-calendario-cache-v2";
// TTL para el fetch de fondo — no bloquea la UI, solo refresca en silencio
const CAL_REFRESH_TTL = 10 * 60_000; // 10 min
let _lastFetch = 0;

function leerCacheLocal(): CalCache | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CalCache;
  } catch {
    return null;
  }
}

function guardarCacheLocal(data: CalCache) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {}
}

async function leerDexie(): Promise<CalCache | null> {
  try {
    const { db } = await import("@/lib/api/client/db");
    if (!db) return null;
    const [estaciones, configs, eras] = await Promise.all([
      (db as any).calendario_estaciones?.orderBy("orden").toArray() ?? [],
      (db as any).calendario_config?.toArray() ?? [],
      (db as any).eras_mundo?.orderBy("anio_inicio").toArray() ?? [],
    ]);
    if (!estaciones?.length) return null;
    return {
      estaciones: estaciones as Estacion[],
      config: (configs?.[0] ?? {
        dias_por_semana: 5,
        horas_por_dia: 25,
        anio_inicio: 0,
      }) as CalendarioConfig,
      eras: (eras ?? []) as EraMundo[],
    };
  } catch {
    return null;
  }
}

async function guardarDexie(data: CalCache): Promise<void> {
  try {
    const { db } = await import("@/lib/api/client/db");
    if (!db) return;
    await Promise.all([
      (db as any).calendario_estaciones?.bulkPut(data.estaciones),
      (db as any).calendario_config?.put({ id: "singleton", ...data.config }),
      (db as any).eras_mundo?.bulkPut(data.eras),
    ]);
  } catch {}
}

async function fetchSupabase(): Promise<CalCache | null> {
  try {
    const [{ data: est }, { data: cfg }, { data: eras }] = await Promise.all([
      supabase.from("calendario_estaciones").select("*").order("orden"),
      supabase.from("calendario_config").select("*").single(),
      (supabase as any).from("eras_mundo").select("*").order("anio_inicio"),
    ]);
    if (!est?.length) return null;
    return {
      estaciones: est as Estacion[],
      config: (cfg ?? {
        dias_por_semana: 5,
        horas_por_dia: 25,
        anio_inicio: 0,
      }) as CalendarioConfig,
      eras: (eras ?? []) as EraMundo[],
    };
  } catch {
    return null;
  }
}

export function useCalendario() {
  // Arrancar con memoria para evitar cualquier flash de loading
  const [data, setData] = useState<CalCache | null>(_cache);
  const [loading, setLoading] = useState(_cache === null);

  useEffect(() => {
    if (_cache) {
      setData(_cache);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const cargar = async () => {
      // 1. Dexie — rápido, offline-ready, persiste entre recargas
      const dexie = await leerDexie();
      if (dexie) {
        _cache = dexie;
        if (!cancelled) {
          setData(dexie);
          setLoading(false);
        }
      }

      // 2. localStorage como fallback si Dexie está vacío
      if (!_cache) {
        const ls = leerCacheLocal();
        if (ls) {
          _cache = ls;
          if (!cancelled) {
            setData(ls);
            setLoading(false);
          }
        }
      }

      // 3. Sin datos locales → mostrar loading hasta Supabase
      if (!_cache && !cancelled) setLoading(true);

      // 4. Supabase — fetch solo si no hay datos o TTL expiró
      if (!navigator.onLine) {
        if (!cancelled) setLoading(false);
        return;
      }
      const necesitaRefresh =
        !_cache || Date.now() - _lastFetch > CAL_REFRESH_TTL;
      if (!necesitaRefresh) {
        if (!cancelled) setLoading(false);
        return;
      }

      const fresh = await fetchSupabase();
      if (!fresh || cancelled) {
        if (!cancelled) setLoading(false);
        return;
      }

      _cache = fresh;
      _lastFetch = Date.now();
      guardarCacheLocal(fresh);
      void guardarDexie(fresh); // fire-and-forget, no bloquea
      if (!cancelled) {
        setData(fresh);
        setLoading(false);
      }
    };

    void cargar();
    return () => {
      cancelled = true;
    };
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
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

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
  const era = fecha && cal ? eraEnAnio(fecha.anio, cal.eras) : null;

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
            {era && (
              <div className="flex items-center gap-1 mb-0.5">
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: era.color ?? "var(--accent)" }}
                />
                <span
                  className="text-[7px] font-black uppercase tracking-widest truncate"
                  style={{ color: era.color ?? "var(--accent)" }}
                >
                  {era.nombre}
                </span>
              </div>
            )}
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
// Editor inline: selecciona año, estación y día.

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
  const eraActual = eraEnAnio(anio, eras);

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
      {/* Era badge */}
      {eraActual && (
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
          style={{ background: `${eraActual.color ?? "var(--accent)"}18` }}
        >
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: eraActual.color ?? "var(--accent)" }}
          />
          <span
            className="text-[8px] font-black uppercase tracking-widest"
            style={{ color: eraActual.color ?? "var(--accent)" }}
          >
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

// ─── Tipos y hook: personajes con fecha de nacimiento ────────────────────────
type PersonajeCumple = {
  id: string;
  nombre: string;
  img_url: string | null;
  reino: string | null;
  fecha_nacimiento: number; // día absoluto
};

function usePersonajesCumpleanos(): {
  personajes: PersonajeCumple[];
  loading: boolean;
} {
  const [personajes, setPersonajes] = useState<PersonajeCumple[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Dexie primero (stale-while-revalidate)
      try {
        const { db } = await import("@/lib/api/client/db");
        if (db) {
          const todos: any[] = (await (db as any).personajes?.toArray()) ?? [];
          const conFecha = todos.filter(
            (p: any) => p.fecha_nacimiento != null && !p.deleted,
          );
          if (conFecha.length) {
            setPersonajes(
              conFecha.map((p: any) => ({
                id: p.id,
                nombre: p.nombre ?? "Sin nombre",
                img_url: p.img_url ?? null,
                reino: p.reino ?? null,
                fecha_nacimiento: p.fecha_nacimiento,
              })),
            );
            setLoading(false);
            if (!navigator.onLine) return;
          }
        }
      } catch {}

      if (!navigator.onLine) {
        setLoading(false);
        return;
      }

      // 2. Supabase
      const { data } = await supabase
        .from("personajes")
        .select("id, nombre, img_url, reino, fecha_nacimiento")
        .not("fecha_nacimiento", "is", null)
        .order("fecha_nacimiento");
      setPersonajes(
        (data ?? []).map((p: any) => ({
          id: p.id,
          nombre: p.nombre ?? "Sin nombre",
          img_url: p.img_url ?? null,
          reino: p.reino ?? null,
          fecha_nacimiento: p.fecha_nacimiento,
        })),
      );
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { personajes, loading };
}

// ─── Hook: lista de reinos disponibles ───────────────────────────────────────
function useReinosDisponibles(personajes: PersonajeCumple[]): string[] {
  return React.useMemo(() => {
    const set = new Set<string>();
    for (const p of personajes) {
      if (p.reino) set.add(p.reino);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [personajes]);
}

// ─── Panel de filtros ─────────────────────────────────────────────────────────
function PanelFiltrosCumpleanos({
  reinos,
  reinosActivos,
  mostrarCumpleanos,
  onToggleReino,
  onToggleCumpleanos,
  onClose,
}: {
  reinos: string[];
  reinosActivos: Set<string>;
  mostrarCumpleanos: boolean;
  onToggleReino: (reino: string) => void;
  onToggleCumpleanos: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="rounded-xl border shadow-xl p-3 space-y-3"
      style={{
        minWidth: 220,
        background: "var(--bg-main)",
        borderColor: "color-mix(in srgb, var(--primary) 14%, transparent)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/50 flex items-center gap-1.5">
          <SlidersHorizontal size={9} /> Filtros
        </span>
        <button
          className="p-1 rounded-lg text-primary/30 hover:text-primary transition-all"
          onClick={onClose}
        >
          <X size={11} />
        </button>
      </div>

      {/* Toggle cumpleaños */}
      <div>
        <span className="text-[8px] font-black uppercase tracking-widest text-primary/35 mb-1.5 block">
          Mostrar
        </span>
        <button
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-all"
          style={{
            background: mostrarCumpleanos
              ? "color-mix(in srgb, var(--accent) 10%, transparent)"
              : "transparent",
            borderColor: mostrarCumpleanos
              ? "color-mix(in srgb, var(--accent) 30%, transparent)"
              : "color-mix(in srgb, var(--primary) 12%, transparent)",
            color: mostrarCumpleanos
              ? "var(--accent)"
              : "color-mix(in srgb, var(--primary) 40%, transparent)",
          }}
          type="button"
          onClick={onToggleCumpleanos}
        >
          <Cake size={10} />
          <span className="text-[9px] font-black uppercase tracking-widest flex-1">
            Cumpleaños
          </span>
          <div
            className="w-7 h-3.5 rounded-full transition-all relative shrink-0"
            style={{
              background: mostrarCumpleanos
                ? "var(--accent)"
                : "color-mix(in srgb, var(--primary) 20%, transparent)",
            }}
          >
            <div
              className="absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all"
              style={{ left: mostrarCumpleanos ? "calc(100% - 12px)" : "2px" }}
            />
          </div>
        </button>
      </div>

      {/* Filtro por reinos */}
      {reinos.length > 0 && (
        <div>
          <span className="text-[8px] font-black uppercase tracking-widest text-primary/35 mb-1.5 block flex items-center gap-1">
            <Globe size={8} /> Reino
          </span>
          <div className="space-y-1">
            {/* Botón "Todos" */}
            <button
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all text-left"
              style={{
                background:
                  reinosActivos.size === 0
                    ? "color-mix(in srgb, var(--primary) 8%, transparent)"
                    : "transparent",
                borderColor:
                  reinosActivos.size === 0
                    ? "color-mix(in srgb, var(--primary) 25%, transparent)"
                    : "color-mix(in srgb, var(--primary) 10%, transparent)",
                color:
                  reinosActivos.size === 0
                    ? "var(--primary)"
                    : "color-mix(in srgb, var(--primary) 40%, transparent)",
              }}
              type="button"
              onClick={() => {
                // Limpiar todos
                for (const r of Array.from(reinosActivos)) onToggleReino(r);
              }}
            >
              Todos los reinos
            </button>
            {reinos.map((reino) => {
              const activo = reinosActivos.has(reino);
              return (
                <button
                  key={reino}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all text-left"
                  style={{
                    background: activo
                      ? "color-mix(in srgb, var(--accent) 10%, transparent)"
                      : "transparent",
                    borderColor: activo
                      ? "color-mix(in srgb, var(--accent) 30%, transparent)"
                      : "color-mix(in srgb, var(--primary) 10%, transparent)",
                    color: activo
                      ? "var(--accent)"
                      : "color-mix(in srgb, var(--primary) 40%, transparent)",
                  }}
                  type="button"
                  onClick={() => onToggleReino(reino)}
                >
                  {activo && <Check size={8} />}
                  {reino}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CumpleanosMarker: una entrada de cumpleaños en la línea de tiempo ────────
function CumpleanosMarker({
  personaje,
  cal,
}: {
  personaje: PersonajeCumple;
  cal: { estaciones: Estacion[]; config: CalendarioConfig; eras: EraMundo[] };
}) {
  const fecha = diaAbsolutoAFecha(
    personaje.fecha_nacimiento,
    cal.estaciones,
    cal.config,
  );
  const era = eraEnAnio(fecha.anio, cal.eras);

  if (!fecha.estacion) return null;

  return (
    <div className="flex items-center gap-2.5 py-1.5 px-1 group">
      {/* Avatar */}
      <div
        className="shrink-0 w-6 h-6 rounded-full border overflow-hidden flex items-center justify-center"
        style={{
          borderColor: era
            ? `${era.color ?? "var(--accent)"}55`
            : "color-mix(in srgb, var(--primary) 15%, transparent)",
          background: "color-mix(in srgb, var(--primary) 5%, transparent)",
        }}
      >
        {personaje.img_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={personaje.nombre}
            className="w-full h-full object-cover"
            src={personaje.img_url}
          />
        ) : (
          <Cake size={10} style={{ color: era?.color ?? "var(--accent)" }} />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black uppercase italic text-primary truncate">
          {personaje.nombre}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <FechaMundoBadge diaAbsoluto={personaje.fecha_nacimiento} />
          {personaje.reino && (
            <span className="text-[8px] text-primary/30 truncate">
              · {personaje.reino}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── BloqueLineaTiempoCumpleanos ──────────────────────────────────────────────
// Bloque exportable que muestra personajes con fecha de nacimiento + filtros.
export function BloqueLineaTiempoCumpleanos({
  onSelectPersonaje,
}: {
  onSelectPersonaje?: (id: string) => void;
}) {
  const { personajes, loading } = usePersonajesCumpleanos();
  const { cal, loading: calLoad } = useCalendario();
  const reinos = useReinosDisponibles(personajes);

  const [mostrarCumpleanos, setMostrarCumpleanos] = useState(true);
  const [reinosActivos, setReinosActivos] = useState<Set<string>>(new Set());
  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const filtroRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [filtroPos, setFiltroPos] = useState<{
    top: number;
    right: number;
  } | null>(null);

  // Cerrar panel al click fuera
  useEffect(() => {
    if (!filtrosOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (filtroRef.current?.contains(t)) return;
      if (btnRef.current?.contains(t)) return;
      setFiltrosOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [filtrosOpen]);

  // Posición del panel flotante
  useEffect(() => {
    if (!filtrosOpen) return;
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    setFiltroPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
  }, [filtrosOpen]);

  const toggleReino = (reino: string) => {
    setReinosActivos((prev) => {
      const next = new Set(prev);
      if (next.has(reino)) next.delete(reino);
      else next.add(reino);
      return next;
    });
  };

  // Filtrar personajes
  const personajesFiltrados = React.useMemo(() => {
    return personajes.filter((p) => {
      if (reinosActivos.size > 0 && !reinosActivos.has(p.reino ?? ""))
        return false;
      return true;
    });
  }, [personajes, reinosActivos]);

  // Ordenar por día del año (estación + día dentro de estación), ignorando el año de nacimiento
  // para que aparezcan en orden cronológico dentro del año
  const personajesOrdenados = React.useMemo(() => {
    if (!cal) return personajesFiltrados;
    return [...personajesFiltrados].sort((a, b) => {
      const fa = diaAbsolutoAFecha(
        a.fecha_nacimiento,
        cal.estaciones,
        cal.config,
      );
      const fb = diaAbsolutoAFecha(
        b.fecha_nacimiento,
        cal.estaciones,
        cal.config,
      );
      const diaAnioA = (fa.estacion?.orden ?? 0) * 10000 + fa.dia_en_estacion;
      const diaAnioB = (fb.estacion?.orden ?? 0) * 10000 + fb.dia_en_estacion;
      return diaAnioA - diaAnioB;
    });
  }, [personajesFiltrados, cal]);

  const hayFiltrosActivos = reinosActivos.size > 0 || !mostrarCumpleanos;

  return (
    <div className="rounded-xl overflow-visible border border-primary/10">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/[0.06] bg-primary/[0.03]">
        <Cake className="text-primary/40" size={10} />
        <span className="flex-1 text-[9px] font-black uppercase tracking-widest text-primary/40">
          Cumpleaños
        </span>
        {/* Indicador de filtros activos */}
        {hayFiltrosActivos && (
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: "var(--accent)" }}
          />
        )}
        {/* Botón filtros */}
        <button
          ref={btnRef}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border transition-all"
          style={{
            borderColor: hayFiltrosActivos
              ? "color-mix(in srgb, var(--accent) 30%, transparent)"
              : "color-mix(in srgb, var(--primary) 12%, transparent)",
            background: hayFiltrosActivos
              ? "color-mix(in srgb, var(--accent) 8%, transparent)"
              : "transparent",
            color: hayFiltrosActivos
              ? "var(--accent)"
              : "color-mix(in srgb, var(--primary) 40%, transparent)",
          }}
          type="button"
          onClick={() => setFiltrosOpen((v) => !v)}
        >
          <SlidersHorizontal size={8} /> Filtros
        </button>
      </div>

      {/* Panel flotante de filtros */}
      {filtrosOpen &&
        filtroPos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={filtroRef}
            className="fixed z-[9999]"
            style={{ top: filtroPos.top, right: filtroPos.right }}
          >
            <PanelFiltrosCumpleanos
              mostrarCumpleanos={mostrarCumpleanos}
              reinosActivos={reinosActivos}
              reinos={reinos}
              onClose={() => setFiltrosOpen(false)}
              onToggleCumpleanos={() => setMostrarCumpleanos((v) => !v)}
              onToggleReino={toggleReino}
            />
          </div>,
          document.body,
        )}

      {/* Contenido */}
      {!mostrarCumpleanos ? (
        <p className="text-[9px] text-primary/25 font-black uppercase tracking-widest text-center py-4 italic">
          Cumpleaños ocultos
        </p>
      ) : loading || calLoad ? (
        <div className="flex justify-center py-4">
          <Loader2 className="animate-spin text-primary/20" size={14} />
        </div>
      ) : personajesOrdenados.length === 0 ? (
        <p className="text-[9px] text-primary/25 font-black uppercase tracking-widest text-center py-4 italic">
          {reinosActivos.size > 0
            ? "Sin resultados para este filtro"
            : "Sin fechas de nacimiento registradas"}
        </p>
      ) : cal ? (
        <div
          className="divide-y"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 6%, transparent)",
          }}
        >
          {personajesOrdenados.map((p) => (
            <div
              key={p.id}
              className={`px-2 transition-colors ${onSelectPersonaje ? "cursor-pointer hover:bg-primary/[0.03] active:bg-primary/[0.06]" : ""}`}
              onClick={() => onSelectPersonaje?.(p.id)}
            >
              <CumpleanosMarker cal={cal} personaje={p} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ─── FechaMundoBadge ──────────────────────────────────────────────────────────
// Muestra una fecha compacta como badge (solo lectura).
export function FechaMundoBadge({ diaAbsoluto }: { diaAbsoluto: number }) {
  const { cal, loading } = useCalendario();
  if (loading || !cal)
    return <Loader2 className="animate-spin text-primary/20" size={8} />;
  const fecha = diaAbsolutoAFecha(diaAbsoluto, cal.estaciones, cal.config);
  // Si el día absoluto no cae dentro de ninguna estación definida, evitamos
  // crashear formatFechaCorta y mostramos un placeholder en su lugar.
  if (!fecha.estacion) {
    return (
      <span className="text-[9px] text-primary/30 italic">Fecha inválida</span>
    );
  }
  const era = eraEnAnio(fecha.anio, cal.eras);
  return (
    <span className="inline-flex items-center gap-1.5">
      {era && (
        <span
          className="w-1.5 h-1.5 rounded-full inline-block shrink-0"
          style={{ background: era.color ?? "var(--accent)" }}
        />
      )}
      <span
        className="text-[9px] font-bold"
        style={{ color: "var(--primary)" }}
      >
        {formatFechaCorta(fecha)}
      </span>
    </span>
  );
}
