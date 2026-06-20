"use client";
import {
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Crown,
  Filter,
  Layers,
  Loader2,
  Music,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { onSyncDone } from "@/hooks/data/useOfflineSync";
import { db } from "@/lib/api/client/db";
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

import { type Reino, type SaveStatus } from "./types";
import { SaveIndicator } from "./UIComponents";

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

// ════════════════════════════════════════════════════════════════════════════
// ─── Historia del mundo / Línea de tiempo (movido desde EditorMundo.tsx) ────
// Incluye: tarjetas de evento (capítulos, canciones, cumpleaños, eventos sueltos),
// modales de creación de evento y de gestión de eras, el hook de reinos con
// historia completa, y el panel PanelHistoriaMundo que orquesta todo.
// ════════════════════════════════════════════════════════════════════════════

type TimelineEvent = {
  id: string;
  year: string;
  title: string;
  description: string;
  dia_absoluto?: number;
  reinoId?: string | null;
  reinoNombre?: string | null;
};

type MundoTimelineEvent = TimelineEvent & {
  source: "mundo" | "reino" | "capitulo" | "cancion" | "cumpleanos";
  reinoNombre?: string;
  reinoId?: string;
  yearNum: number; // dia_absoluto — para ordenar
  dia_absoluto?: number; // el valor real del calendario
  capData?: CapTimeline;
  cancionData?: {
    id: string;
    titulo: string;
    cantante?: string | null;
    reinoNombre?: string | null;
    dia_absoluto?: number;
  };
  cumpleanosData?: {
    id: string;
    nombre: string;
    img_url: string | null;
    reino: string | null;
    fecha_nacimiento: number;
  };
};

// (Eliminados: parseYear, decodeTimeline, encodeTimeline, newEvent — sistema antiguo)

// ── Tarjeta de capítulo en la línea de tiempo ────────────────────────────────
function CapituloEventoRow({
  cap,
  reinos = [],
  onNavigate,
  onDiaChange,
}: {
  cap: CapTimeline;
  reinos?: { id: string; nombre: string }[];
  onNavigate: () => void;
  onDiaChange?: (id: string, dia: number) => void;
}) {
  const [saving, setSaving] = useState(false);

  const commitDia = async (dia: number | null) => {
    if (dia == null) return;
    setSaving(true);
    await supabase
      .from("capitulos")
      .update({ dia_absoluto: dia } as any)
      .eq("id", cap.id);
    onDiaChange?.(cap.id, dia);
    setSaving(false);
  };

  const reinosDelCap = (cap.reinos_ids ?? [])
    .map((id) => reinos.find((r) => r.id === id)?.nombre)
    .filter(Boolean) as string[];

  const diaActual = cap.dia_absoluto ?? null;

  return (
    <div className="group/card" style={{ width: 220 }}>
      <div
        className="mx-1.5 rounded-xl transition-all"
        style={{
          border:
            "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
          background: "color-mix(in srgb, var(--primary) 2%, transparent)",
        }}
      >
        <div className="flex flex-col gap-1.5 p-2">
          {/* Libro */}
          {cap.libroTitulo && (
            <span
              className="text-[7px] font-black uppercase tracking-widest truncate"
              style={{
                color: "color-mix(in srgb, var(--primary) 30%, transparent)",
              }}
            >
              {cap.libroTitulo}
            </span>
          )}

          {/* Selector de fecha */}
          <div className="relative">
            {saving && (
              <Loader2
                className="animate-spin absolute right-2 top-2 z-10 text-primary/30"
                size={8}
              />
            )}
            <SelectorFechaMundo
              placeholder="Sin fecha…"
              value={diaActual}
              onChange={commitDia}
            />
          </div>

          {/* Título navegable */}
          <button
            className="flex items-center gap-1 px-1.5 py-1 rounded-lg border w-full text-left transition-all"
            style={{
              background: "color-mix(in srgb, var(--primary) 4%, transparent)",
              borderColor:
                "color-mix(in srgb, var(--primary) 10%, transparent)",
            }}
            title={`Abrir: ${cap.titulo_capitulo}`}
            type="button"
            onClick={onNavigate}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background =
                "color-mix(in srgb, var(--primary) 9%, transparent)";
              el.style.borderColor =
                "color-mix(in srgb, var(--primary) 22%, transparent)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background =
                "color-mix(in srgb, var(--primary) 4%, transparent)";
              el.style.borderColor =
                "color-mix(in srgb, var(--primary) 10%, transparent)";
            }}
          >
            <BookOpen
              size={8}
              style={{
                color: "color-mix(in srgb, var(--primary) 40%, transparent)",
                flexShrink: 0,
              }}
            />
            <span
              className="text-[8px] font-bold truncate"
              style={{
                color: "color-mix(in srgb, var(--primary) 65%, transparent)",
              }}
            >
              {cap.titulo_capitulo}
            </span>
          </button>

          {/* Reinos */}
          {reinosDelCap.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {reinosDelCap.map((nombre) => (
                <span
                  key={nombre}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest"
                  style={{
                    background:
                      "color-mix(in srgb, var(--primary) 8%, transparent)",
                    color:
                      "color-mix(in srgb, var(--primary) 50%, transparent)",
                    border:
                      "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                  }}
                >
                  <Crown size={6} /> {nombre}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tarjeta horizontal de canción en la línea de tiempo ─────────────────────
function CancionMundoRow({
  cancion,
  onDiaChange,
}: {
  cancion: {
    id: string;
    titulo: string;
    cantante?: string | null;
    reinoNombre?: string | null;
    dia_absoluto?: number;
  };
  onDiaChange?: (id: string, dia: number) => void;
}) {
  const [saving, setSaving] = useState(false);

  const commitDia = async (dia: number | null) => {
    if (dia == null) return;
    setSaving(true);
    await supabase
      .from("canciones")
      .update({ dia_absoluto: dia } as any)
      .eq("id", cancion.id);
    onDiaChange?.(cancion.id, dia);
    setSaving(false);
  };

  const navigate = () => {
    window.dispatchEvent(
      new CustomEvent("garlia-open-entity", {
        detail: { tabla: "canciones", id: cancion.id },
      }),
    );
  };
  return (
    <div className="group/card" style={{ width: 220 }}>
      <div
        className="mx-1.5 rounded-xl transition-all"
        style={{
          border:
            "1px solid color-mix(in srgb, var(--accent) 14%, transparent)",
          background: "color-mix(in srgb, var(--accent) 2%, transparent)",
        }}
      >
        <div className="flex flex-col gap-1.5 p-2">
          {/* Reino */}
          {cancion.reinoNombre && (
            <span
              className="text-[7px] font-black uppercase tracking-widest truncate"
              style={{
                color: "color-mix(in srgb, var(--accent) 35%, transparent)",
              }}
            >
              {cancion.reinoNombre}
            </span>
          )}
          {/* Selector de fecha */}
          <div className="relative">
            {saving && (
              <Loader2
                className="animate-spin absolute right-2 top-2 z-10 text-accent/40"
                size={8}
              />
            )}
            <SelectorFechaMundo
              placeholder="Sin fecha…"
              value={cancion.dia_absoluto ?? null}
              onChange={commitDia}
            />
          </div>
          {/* Título */}
          <button
            className="flex items-center gap-1 px-1.5 py-1 rounded-lg border w-full text-left transition-all"
            style={{
              background: "color-mix(in srgb, var(--accent) 4%, transparent)",
              borderColor: "color-mix(in srgb, var(--accent) 10%, transparent)",
            }}
            title={`Abrir: ${cancion.titulo}`}
            type="button"
            onClick={navigate}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background =
                "color-mix(in srgb, var(--accent) 9%, transparent)";
              el.style.borderColor =
                "color-mix(in srgb, var(--accent) 22%, transparent)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background =
                "color-mix(in srgb, var(--accent) 4%, transparent)";
              el.style.borderColor =
                "color-mix(in srgb, var(--accent) 10%, transparent)";
            }}
          >
            <Music
              size={8}
              style={{
                color: "color-mix(in srgb, var(--accent) 40%, transparent)",
                flexShrink: 0,
              }}
            />
            <span
              className="text-[8px] font-bold truncate"
              style={{
                color: "color-mix(in srgb, var(--accent) 65%, var(--primary))",
              }}
            >
              {cancion.titulo}
            </span>
          </button>
          {cancion.cantante && (
            <span
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest truncate self-start"
              style={{
                background: "color-mix(in srgb, var(--accent) 8%, transparent)",
                color: "color-mix(in srgb, var(--accent) 50%, transparent)",
                border:
                  "1px solid color-mix(in srgb, var(--accent) 12%, transparent)",
                maxWidth: "100%",
              }}
            >
              <Music size={6} /> {cancion.cantante}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tarjeta de cumpleaños en la línea de tiempo ──────────────────────────────
function CumpleanosTimelineRow({
  data,
  onNavigate,
}: {
  data: NonNullable<MundoTimelineEvent["cumpleanosData"]>;
  onNavigate?: () => void;
}) {
  return (
    <div className="group/card" style={{ width: 220 }}>
      <div
        className="mx-1.5 rounded-xl transition-all"
        style={{
          border:
            "1px solid color-mix(in srgb, var(--accent) 22%, transparent)",
          background: "color-mix(in srgb, var(--accent) 4%, transparent)",
        }}
      >
        <div className="flex items-center gap-2 p-2">
          {/* Avatar */}
          <div
            className="shrink-0 w-7 h-7 rounded-full border overflow-hidden flex items-center justify-center"
            style={{
              borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)",
              background: "color-mix(in srgb, var(--accent) 8%, transparent)",
            }}
          >
            {data.img_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={data.nombre}
                className="w-full h-full object-cover"
                src={data.img_url}
              />
            ) : (
              <svg
                fill="none"
                height="12"
                stroke="var(--accent)"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                width="12"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <button
              className="w-full text-left flex items-center gap-1 rounded transition-opacity hover:opacity-70"
              type="button"
              onClick={onNavigate}
            >
              <span
                className="text-[9px] font-black uppercase italic truncate"
                style={{ color: "var(--accent)" }}
              >
                {data.nombre}
              </span>
            </button>
            {data.reino && (
              <span
                className="flex items-center gap-0.5 text-[7px] font-black uppercase tracking-widest truncate mt-0.5"
                style={{
                  color: "color-mix(in srgb, var(--accent) 50%, transparent)",
                }}
              >
                <Crown size={6} /> {data.reino}
              </span>
            )}
          </div>

          {/* Icono torta */}
          <svg
            className="shrink-0 opacity-40"
            fill="none"
            height="11"
            stroke="var(--accent)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width="11"
          >
            <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" />
            <path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2 1 2 1" />
            <path d="M2 21h20" />
            <path d="M7 8v2" />
            <path d="M12 8v2" />
            <path d="M17 8v2" />
            <path d="M7 4h.01" />
            <path d="M12 4h.01" />
            <path d="M17 4h.01" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function EventoMundoRow({
  evt,
  onDiaChange,
  onFieldChange,
  onDelete,
  showDescripciones = true,
}: {
  evt: MundoTimelineEvent;
  onDiaChange?: (id: string, dia: number) => void;
  onFieldChange?: (
    id: string,
    field: "titulo" | "descripcion",
    value: string,
  ) => void;
  onDelete?: (id: string) => void;
  showDescripciones?: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [titulo, setTitulo] = useState(evt.title);
  const [descripcion, setDescripcion] = useState(evt.description);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTitulo(evt.title);
  }, [evt.title]);
  useEffect(() => {
    setDescripcion(evt.description);
  }, [evt.description]);

  const commitDia = async (dia: number | null) => {
    if (dia == null) return;
    setSaving(true);
    await onDiaChange?.(evt.id, dia);
    setSaving(false);
  };

  const scheduleSave = (field: "titulo" | "descripcion", value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onFieldChange?.(evt.id, field, value);
    }, 800);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete?.(evt.id);
    setDeleting(false);
  };

  return (
    <div className="group/card" style={{ width: 220 }}>
      <div
        className="mx-1.5 rounded-xl p-2 flex flex-col gap-1.5 transition-all"
        style={{
          border:
            "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
          background: "color-mix(in srgb, var(--primary) 2.5%, transparent)",
        }}
      >
        {/* Selector de fecha — solo en modo expandido */}
        {showDescripciones && (
          <div className="relative">
            {saving && (
              <Loader2
                className="animate-spin absolute right-2 top-2 z-10 text-primary/30"
                size={8}
              />
            )}
            <SelectorFechaMundo
              placeholder="Sin fecha…"
              value={evt.dia_absoluto ?? null}
              onChange={commitDia}
            />
          </div>
        )}

        {/* Título + botón eliminar */}
        <div className="flex items-center gap-1">
          <input
            className="flex-1 min-w-0 px-1 bg-transparent outline-none rounded transition-all"
            placeholder="Título del evento…"
            style={{
              color: "var(--primary)",
              fontSize: showDescripciones ? "10px" : "13px",
              fontWeight: showDescripciones ? 700 : 900,
            }}
            value={titulo}
            onBlur={(e) => onFieldChange?.(evt.id, "titulo", e.target.value)}
            onChange={(e) => {
              setTitulo(e.target.value);
              scheduleSave("titulo", e.target.value);
            }}
          />
          {!confirmDel ? (
            <button
              className="shrink-0 opacity-0 group-hover/card:opacity-100 transition-opacity p-1 rounded-md"
              style={{
                color: "color-mix(in srgb, var(--primary) 25%, transparent)",
              }}
              title="Eliminar evento"
              type="button"
              onClick={() => setConfirmDel(true)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = "#ef4444";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color =
                  "color-mix(in srgb, var(--primary) 25%, transparent)";
              }}
            >
              <Trash2 size={9} />
            </button>
          ) : (
            <div className="shrink-0 flex items-center gap-1">
              <button
                className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest transition-all"
                disabled={deleting}
                style={{ background: "#ef444420", color: "#ef4444" }}
                type="button"
                onClick={handleDelete}
              >
                {deleting ? (
                  <Loader2 className="animate-spin" size={7} />
                ) : (
                  "Sí"
                )}
              </button>
              <button
                className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest"
                style={{
                  color: "color-mix(in srgb, var(--primary) 35%, transparent)",
                }}
                type="button"
                onClick={() => setConfirmDel(false)}
              >
                No
              </button>
            </div>
          )}
        </div>

        {/* Reino — siempre visible */}
        {evt.reinoNombre && (
          <span
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest truncate self-start"
            style={{
              background: "color-mix(in srgb, var(--primary) 8%, transparent)",
              color: "color-mix(in srgb, var(--primary) 50%, transparent)",
              border:
                "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
              maxWidth: "150px",
            }}
          >
            <Crown size={6} /> {evt.reinoNombre}
          </span>
        )}

        {/* Descripción — solo en modo expandido */}
        {showDescripciones && (
          <textarea
            className="px-1 text-[11px] leading-relaxed bg-transparent outline-none w-full rounded resize-y"
            placeholder="Descripción…"
            rows={6}
            style={{
              color: "color-mix(in srgb, var(--primary) 70%, transparent)",
              minHeight: "90px",
            }}
            value={descripcion}
            onBlur={(e) =>
              onFieldChange?.(evt.id, "descripcion", e.target.value)
            }
            onChange={(e) => {
              setDescripcion(e.target.value);
              scheduleSave("descripcion", e.target.value);
            }}
          />
        )}
      </div>
    </div>
  );
}

// ── Modal: crear nuevo evento de línea de tiempo (mundo o reino) ─────────────
function ModalNuevoEvento({
  reinos,
  onClose,
  onCrear,
  creando,
}: {
  reinos: { id: string; nombre: string }[];
  onClose: () => void;
  onCrear: (datos: {
    titulo: string;
    reinoId: string | null;
    dia_absoluto: number;
  }) => void;
  creando: boolean;
}) {
  const [titulo, setTitulo] = useState("");
  const [reinoId, setReinoId] = useState<string | null>(null);
  const [diaAbsoluto, setDiaAbsoluto] = useState<number | null>(null);

  const puedeCrear = titulo.trim().length > 0 && diaAbsoluto != null;

  return (
    <>
      {/* Backdrop separado — no bloquea el portal del selector de fecha */}
      <div
        className="fixed inset-0 z-[1100]"
        style={{ background: "color-mix(in srgb, black 45%, transparent)" }}
        onMouseDown={onClose}
      />
      <div className="fixed inset-0 z-[1101] flex items-center justify-center p-3 pointer-events-none">
        <div
          className="w-full max-w-sm rounded-2xl border shadow-lg p-4 space-y-3 pointer-events-auto"
          style={{
            background: "var(--bg-main)",
            borderColor: "color-mix(in srgb, var(--primary) 14%, transparent)",
          }}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-[10px] font-black uppercase tracking-[0.2em]"
              style={{ color: "var(--primary)" }}
            >
              Nuevo evento
            </span>
            <button
              className="flex items-center justify-center w-6 h-6 rounded-lg border transition-all"
              style={{
                borderColor:
                  "color-mix(in srgb, var(--primary) 12%, transparent)",
                color: "color-mix(in srgb, var(--primary) 40%, transparent)",
              }}
              type="button"
              onClick={onClose}
            >
              <X size={10} />
            </button>
          </div>

          {/* Título */}
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase tracking-[0.18em] text-primary/35">
              Título
            </label>
            <input
              autoFocus
              className="w-full rounded-lg border px-2.5 py-1.5 text-[11px] font-bold outline-none transition-all"
              placeholder="Título del evento…"
              style={{
                background: "transparent",
                borderColor:
                  "color-mix(in srgb, var(--primary) 14%, transparent)",
                color: "var(--primary)",
              }}
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>

          {/* Selector de reino */}
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase tracking-[0.18em] text-primary/35">
              Reino
            </label>
            <div className="flex flex-wrap gap-1">
              <button
                className="px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all"
                style={
                  reinoId === null
                    ? {
                        background:
                          "color-mix(in srgb, var(--accent) 15%, transparent)",
                        borderColor:
                          "color-mix(in srgb, var(--accent) 35%, transparent)",
                        color: "var(--accent)",
                      }
                    : {
                        borderColor:
                          "color-mix(in srgb, var(--primary) 10%, transparent)",
                        color:
                          "color-mix(in srgb, var(--primary) 45%, transparent)",
                      }
                }
                type="button"
                onClick={() => setReinoId(null)}
              >
                Mundo (sin reino)
              </button>
              {reinos.map((r) => (
                <button
                  key={r.id}
                  className="px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all"
                  style={
                    reinoId === r.id
                      ? {
                          background:
                            "color-mix(in srgb, var(--accent) 15%, transparent)",
                          borderColor:
                            "color-mix(in srgb, var(--accent) 35%, transparent)",
                          color: "var(--accent)",
                        }
                      : {
                          borderColor:
                            "color-mix(in srgb, var(--primary) 10%, transparent)",
                          color:
                            "color-mix(in srgb, var(--primary) 45%, transparent)",
                        }
                  }
                  type="button"
                  onClick={() => setReinoId(r.id)}
                >
                  {r.nombre}
                </button>
              ))}
            </div>
          </div>

          {/* Selector de fecha */}
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase tracking-[0.18em] text-primary/35">
              Fecha
            </label>
            <SelectorFechaMundo
              placeholder="Elegir fecha…"
              value={diaAbsoluto}
              onChange={setDiaAbsoluto}
            />
          </div>

          {/* Acciones */}
          <div className="flex gap-1.5 pt-1">
            <button
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-widest transition-all"
              style={{
                borderColor:
                  "color-mix(in srgb, var(--primary) 12%, transparent)",
                color: "color-mix(in srgb, var(--primary) 35%, transparent)",
              }}
              type="button"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all"
              disabled={!puedeCrear || creando}
              style={{
                background: puedeCrear
                  ? "var(--accent)"
                  : "color-mix(in srgb, var(--primary) 12%, transparent)",
                color: puedeCrear
                  ? "white"
                  : "color-mix(in srgb, var(--primary) 35%, transparent)",
                cursor: puedeCrear ? "pointer" : "default",
              }}
              type="button"
              onClick={() => {
                if (puedeCrear)
                  onCrear({
                    titulo: titulo.trim(),
                    reinoId,
                    dia_absoluto: diaAbsoluto!,
                  });
              }}
            >
              {creando ? (
                <Loader2 className="animate-spin" size={9} />
              ) : (
                <Check size={9} />
              )}{" "}
              Crear
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Tarjeta horizontal de evento (mundo O reino) — solo visualización ────────
// ─── Tipo para capítulos con posición en línea de tiempo ─────────────────────
type CapTimeline = {
  id: string;
  libro_id: string;
  titulo_capitulo: string;
  orden_linea_tiempo?: number; // legacy — opcional, se mantiene por compatibilidad
  dia_absoluto?: number; // nuevo campo del calendario
  libroTitulo?: string;
  reinos_ids?: string[];
};

// ── Carga reinos con historia completa (query dedicada, no el hook genérico) ──
let _reinosLastFetch = 0;
const REINOS_TTL_MS = 60_000; // 1 minuto

function useReinosConHistoria() {
  const [reinos, setReinos] = useState<Reino[]>([]);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  const cargar = useCallback(async (force = false) => {
    if (!isMounted.current) return;
    if (!force) setLoading(true);

    // 1. Dexie primero — respuesta inmediata aunque estemos offline
    try {
      const local: any[] = db
        ? ((await (db as any).reinos?.toArray()) ?? [])
        : [];
      const filtered = local.filter((r: any) => !r.deleted);
      if (filtered.length && isMounted.current) {
        setReinos(filtered as Reino[]);
        setLoading(false);
      }
    } catch {}

    // 2. Supabase — solo si hay conexión real
    if (!navigator.onLine || !isMounted.current) {
      setLoading(false);
      return;
    }

    // Si no es un force-reload y el fetch fue reciente, nos quedamos con Dexie
    if (!force && Date.now() - _reinosLastFetch < REINOS_TTL_MS) {
      return;
    }

    try {
      const { data } = await supabase
        .from("reinos")
        .select("*") // necesitamos historia completa
        .order("nombre");
      if (!isMounted.current) return;
      if (data?.length) {
        setReinos(data as Reino[]);
        _reinosLastFetch = Date.now();
        // Persistir en Dexie con historia incluida
        try {
          if (db) await (db as any).reinos?.bulkPut(data);
        } catch {}
      }
    } catch {}

    if (isMounted.current) setLoading(false);
  }, []);

  useEffect(() => {
    isMounted.current = true;
    cargar();

    // Recargar al recuperar conexión
    const handleOnline = () => {
      cargar(true);
    };
    window.addEventListener("online", handleOnline);

    // Recargar cuando el sync offline termina de subir cambios
    const unsubSync = onSyncDone(() => {
      if (isMounted.current) cargar(true);
    });

    return () => {
      isMounted.current = false;
      window.removeEventListener("online", handleOnline);
      unsubSync();
    };
  }, [cargar]);

  return { reinos, setReinos, loading, recargar: () => cargar(true) };
}

// ─── Eras: helpers y modal CRUD ──────────────────────────────────────────────
const COLORES_ERA_PRESET = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#f97316",
  "#ef4444",
  "#84cc16",
  "#64748b",
];
// Invalida el caché del calendario (memoria + localStorage) para forzar un
// refetch real en el próximo useCalendario(). Antes vivía en EditorMundo.tsx
// con su propia copia hardcodeada de la clave de localStorage y nunca tocaba
// el `_cache` en memoria, así que una era recién creada podía no aparecer
// hasta refrescar la página entera dentro de la misma sesión.
function invalidarCacheEras() {
  _cache = null;
  _lastFetch = 0;
  try {
    localStorage.removeItem(LS_KEY);
  } catch {}
}

type EraFormData = {
  nombre: string;
  descripcion: string;
  anio_inicio: string;
  anio_fin: string;
  color: string;
};
const ERA_FORM_VACIO: EraFormData = {
  nombre: "",
  descripcion: "",
  anio_inicio: "0",
  anio_fin: "",
  color: COLORES_ERA_PRESET[0],
};

function ModalEra({
  era,
  onClose,
  onSaved,
  onDeleted,
}: {
  era: any | null;
  onClose: () => void;
  onSaved: (era: any) => void;
  onDeleted?: (id: string) => void;
}) {
  const [form, setForm] = useState<EraFormData>(
    era
      ? {
          nombre: era.nombre ?? "",
          descripcion: era.descripcion ?? "",
          anio_inicio: String(era.anio_inicio ?? 0),
          anio_fin: era.anio_fin != null ? String(era.anio_fin) : "",
          color: era.color ?? COLORES_ERA_PRESET[0],
        }
      : ERA_FORM_VACIO,
  );
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const upd = (p: Partial<EraFormData>) => setForm((f) => ({ ...f, ...p }));

  const guardar = async () => {
    if (!form.nombre.trim()) return;
    setSaving(true);
    setError(null);
    const payload: any = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      anio_inicio: parseInt(form.anio_inicio, 10) || 0,
      anio_fin:
        form.anio_fin.trim() !== "" ? parseInt(form.anio_fin, 10) : null,
      color: form.color,
    };
    try {
      if (era?.id) {
        const { data, error: err } = await (supabase as any)
          .from("eras_mundo")
          .update(payload)
          .eq("id", era.id)
          .select()
          .single();
        if (err) throw err;
        invalidarCacheEras();
        onSaved(data);
      } else {
        const { data, error: err } = await (supabase as any)
          .from("eras_mundo")
          .insert(payload)
          .select()
          .single();
        if (err) throw err;
        invalidarCacheEras();
        onSaved(data);
      }
    } catch (e: any) {
      setError(e?.message ?? "Error al guardar");
      setSaving(false);
    }
  };

  const borrar = async () => {
    if (!era?.id) return;
    setSaving(true);
    setError(null);
    try {
      const { error: err } = await (supabase as any)
        .from("eras_mundo")
        .delete()
        .eq("id", era.id);
      if (err) throw err;
      invalidarCacheEras();
      onDeleted?.(era.id);
    } catch (e: any) {
      setError(e?.message ?? "Error al borrar");
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center p-4"
      style={{ background: "color-mix(in srgb, black 55%, transparent)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border shadow-2xl p-4 space-y-3"
        style={{
          background: "var(--bg-main)",
          borderColor: "color-mix(in srgb, var(--primary) 14%, transparent)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <span
              className="text-[11px] font-black uppercase tracking-[0.2em]"
              style={{ color: "var(--primary)" }}
            >
              {era ? "Editar era" : "Nueva era"}
            </span>
            {era && (
              <div className="flex items-center gap-1 mt-0.5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: era.color ?? "var(--accent)" }}
                />
                <span
                  className="text-[9px] font-bold"
                  style={{ color: era.color ?? "var(--accent)" }}
                >
                  {era.nombre}
                </span>
              </div>
            )}
          </div>
          <button
            className="flex items-center justify-center w-6 h-6 rounded-lg border"
            style={{
              borderColor:
                "color-mix(in srgb, var(--primary) 12%, transparent)",
              color: "color-mix(in srgb, var(--primary) 40%, transparent)",
            }}
            type="button"
            onClick={onClose}
          >
            <X size={10} />
          </button>
        </div>

        {error && (
          <div
            className="px-3 py-2 rounded-lg text-[9px] font-bold"
            style={{
              background: "#ef444415",
              color: "#ef4444",
              border: "1px solid #ef444428",
            }}
          >
            {error}
          </div>
        )}

        {/* Nombre */}
        <div className="space-y-1">
          <label className="text-[8px] font-black uppercase tracking-[0.18em] text-primary/35">
            Nombre
          </label>
          <input
            autoFocus
            className="w-full rounded-lg border px-2.5 py-1.5 text-[11px] font-bold outline-none"
            placeholder="ej. Prehistoria, Edad de Hierro…"
            style={{
              background: "transparent",
              borderColor:
                "color-mix(in srgb, var(--primary) 14%, transparent)",
              color: "var(--primary)",
            }}
            type="text"
            value={form.nombre}
            onChange={(e) => upd({ nombre: e.target.value })}
          />
        </div>

        {/* Descripción */}
        <div className="space-y-1">
          <label className="text-[8px] font-black uppercase tracking-[0.18em] text-primary/35">
            Descripción (opcional)
          </label>
          <textarea
            className="w-full rounded-lg border px-2.5 py-1.5 text-[10px] outline-none resize-none"
            placeholder="Breve descripción…"
            rows={2}
            style={{
              background: "transparent",
              borderColor:
                "color-mix(in srgb, var(--primary) 14%, transparent)",
              color: "var(--primary)",
            }}
            value={form.descripcion}
            onChange={(e) => upd({ descripcion: e.target.value })}
          />
        </div>

        {/* Años */}
        <div className="grid grid-cols-2 gap-2">
          {(["anio_inicio", "anio_fin"] as const).map((k, i) => (
            <div key={k} className="space-y-1">
              <label className="text-[8px] font-black uppercase tracking-[0.18em] text-primary/35">
                {i === 0 ? "Año inicio" : "Año fin (vacío = sin fin)"}
              </label>
              <input
                className="w-full rounded-lg border px-2.5 py-1.5 text-[11px] font-bold outline-none text-center"
                placeholder={i === 0 ? "0" : "—"}
                style={{
                  background: "transparent",
                  borderColor:
                    "color-mix(in srgb, var(--primary) 14%, transparent)",
                  color: "var(--primary)",
                }}
                type="number"
                value={form[k]}
                onChange={(e) => upd({ [k]: e.target.value })}
              />
            </div>
          ))}
        </div>

        {/* Color */}
        <div className="space-y-1.5">
          <label className="text-[8px] font-black uppercase tracking-[0.18em] text-primary/35">
            Color
          </label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {COLORES_ERA_PRESET.map((c) => (
              <button
                key={c}
                className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                style={{
                  background: c,
                  outline: form.color === c ? `2px solid ${c}` : "none",
                  outlineOffset: 2,
                }}
                type="button"
                onClick={() => upd({ color: c })}
              />
            ))}
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                className="w-5 h-5 cursor-pointer border-0 p-0 rounded"
                style={{ background: "transparent" }}
                type="color"
                value={form.color}
                onChange={(e) => upd({ color: e.target.value })}
              />
              <span className="text-[8px] text-primary/40 font-bold">Otro</span>
            </label>
          </div>
          {/* Preview badge */}
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg w-fit"
            style={{ background: `${form.color}18` }}
          >
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: form.color }}
            />
            <span
              className="text-[8px] font-black uppercase tracking-widest"
              style={{ color: form.color }}
            >
              {form.nombre || "Nombre de la era"}
            </span>
            {form.anio_fin && (
              <span className="text-[7px] text-primary/30 ml-1">
                {form.anio_inicio} – {form.anio_fin}
              </span>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-1.5 pt-1">
          {era && !confirmDel && (
            <button
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-widest"
              disabled={saving}
              style={{ borderColor: "#ef444425", color: "#ef4444aa" }}
              type="button"
              onClick={() => setConfirmDel(true)}
            >
              <Trash2 size={9} /> Borrar
            </button>
          )}
          {confirmDel && (
            <>
              <button
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest"
                disabled={saving}
                style={{ background: "#ef444420", color: "#ef4444" }}
                type="button"
                onClick={borrar}
              >
                {saving ? (
                  <Loader2 className="animate-spin" size={9} />
                ) : (
                  <Check size={9} />
                )}{" "}
                Confirmar
              </button>
              <button
                className="px-2.5 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-widest"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--primary) 12%, transparent)",
                  color: "color-mix(in srgb, var(--primary) 40%, transparent)",
                }}
                type="button"
                onClick={() => setConfirmDel(false)}
              >
                Cancelar
              </button>
            </>
          )}
          {!confirmDel && (
            <>
              <button
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-widest"
                disabled={saving}
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--primary) 12%, transparent)",
                  color: "color-mix(in srgb, var(--primary) 40%, transparent)",
                }}
                type="button"
                onClick={onClose}
              >
                <X size={9} /> Cancelar
              </button>
              <button
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest disabled:opacity-40"
                disabled={saving || !form.nombre.trim()}
                style={{ background: "var(--accent)", color: "white" }}
                type="button"
                onClick={guardar}
              >
                {saving ? (
                  <Loader2 className="animate-spin" size={9} />
                ) : (
                  <Check size={9} />
                )}
                {era ? "Guardar cambios" : "Crear era"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Modal: gestión completa de todas las eras ────────────────────────────────
function ModalGestionEras({
  eras,
  onClose,
  onEditEra,
  onNewEra,
}: {
  eras: any[];
  onClose: () => void;
  onEditEra: (era: any) => void;
  onNewEra: () => void;
}) {
  const erasOrdenadas = [...eras].sort(
    (a, b) => (a.anio_inicio ?? 0) - (b.anio_inicio ?? 0),
  );

  return (
    <div
      className="fixed inset-0 z-[1150] flex items-center justify-center p-4"
      style={{ background: "color-mix(in srgb, black 55%, transparent)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border shadow-2xl flex flex-col"
        style={{
          background: "var(--bg-main)",
          borderColor: "color-mix(in srgb, var(--primary) 14%, transparent)",
          maxHeight: "80vh",
        }}
      >
        {/* Header */}
        <div
          className="shrink-0 flex items-center justify-between px-4 py-3 border-b"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
          }}
        >
          <div>
            <span
              className="text-[11px] font-black uppercase tracking-[0.2em]"
              style={{ color: "var(--primary)" }}
            >
              Todas las eras
            </span>
            <div className="text-[8px] text-primary/35 mt-0.5">
              {erasOrdenadas.length} era{erasOrdenadas.length !== 1 ? "s" : ""}{" "}
              definida{erasOrdenadas.length !== 1 ? "s" : ""}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all"
              style={{ background: "var(--accent)", color: "white" }}
              type="button"
              onClick={onNewEra}
            >
              <Plus size={9} /> Nueva era
            </button>
            <button
              className="flex items-center justify-center w-6 h-6 rounded-lg border transition-all"
              style={{
                borderColor:
                  "color-mix(in srgb, var(--primary) 12%, transparent)",
                color: "color-mix(in srgb, var(--primary) 40%, transparent)",
              }}
              type="button"
              onClick={onClose}
            >
              <X size={10} />
            </button>
          </div>
        </div>

        {/* Lista de eras */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {erasOrdenadas.length === 0 ? (
            <div className="text-center py-8">
              <Clock
                className="mx-auto mb-2 opacity-20"
                size={20}
                style={{ color: "var(--primary)" }}
              />
              <p className="text-[9px] text-primary/30 font-bold uppercase tracking-widest">
                No hay eras definidas
              </p>
              <button
                className="mt-3 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all"
                style={{ background: "var(--accent)", color: "white" }}
                type="button"
                onClick={onNewEra}
              >
                Crear la primera era
              </button>
            </div>
          ) : (
            erasOrdenadas.map((era) => (
              <button
                key={era.id}
                className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl border text-left transition-all group"
                style={{
                  background: era.color
                    ? `${era.color}08`
                    : "color-mix(in srgb, var(--primary) 2%, transparent)",
                  borderColor: era.color
                    ? `${era.color}25`
                    : "color-mix(in srgb, var(--primary) 10%, transparent)",
                }}
                type="button"
                onClick={() => onEditEra(era)}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.background = era.color
                    ? `${era.color}15`
                    : "color-mix(in srgb, var(--primary) 5%, transparent)";
                  el.style.borderColor = era.color
                    ? `${era.color}40`
                    : "color-mix(in srgb, var(--primary) 20%, transparent)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.background = era.color
                    ? `${era.color}08`
                    : "color-mix(in srgb, var(--primary) 2%, transparent)";
                  el.style.borderColor = era.color
                    ? `${era.color}25`
                    : "color-mix(in srgb, var(--primary) 10%, transparent)";
                }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
                  style={{ background: era.color ?? "var(--accent)" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] font-black truncate"
                      style={{ color: era.color ?? "var(--primary)" }}
                    >
                      {era.nombre}
                    </span>
                    <span
                      className="text-[7px] font-bold shrink-0"
                      style={{
                        color:
                          "color-mix(in srgb, var(--primary) 35%, transparent)",
                      }}
                    >
                      {era.anio_inicio != null &&
                        (era.anio_fin != null
                          ? `Año ${era.anio_inicio} – ${era.anio_fin}`
                          : `Desde año ${era.anio_inicio}`)}
                    </span>
                  </div>
                  {era.descripcion && (
                    <p
                      className="text-[8px] leading-relaxed mt-0.5 line-clamp-2"
                      style={{
                        color:
                          "color-mix(in srgb, var(--primary) 50%, transparent)",
                      }}
                    >
                      {era.descripcion}
                    </p>
                  )}
                </div>
                <span
                  className="text-[7px] font-black uppercase tracking-widest shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    color:
                      era.color ??
                      "color-mix(in srgb, var(--primary) 35%, transparent)",
                  }}
                >
                  Editar
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Botón toggle de "mostrar/ocultar tipo" (capítulos, canciones, eventos,
// cumpleaños) en la cabecera de la línea de tiempo ────────────────────────────
function ToggleTipoBtn({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="relative flex items-center justify-center transition-all"
      style={{
        width: 22,
        height: 22,
        borderRadius: "var(--radius-btn)",
        border: `1px solid ${
          active
            ? "color-mix(in srgb, var(--accent) 30%, transparent)"
            : "color-mix(in srgb, var(--primary) 10%, transparent)"
        }`,
        background: active
          ? "color-mix(in srgb, var(--accent) 10%, transparent)"
          : "transparent",
        color: active
          ? "var(--accent)"
          : "color-mix(in srgb, var(--primary) 28%, transparent)",
      }}
      title={
        active
          ? `Ocultar ${label.toLowerCase()}`
          : `Mostrar ${label.toLowerCase()}`
      }
      type="button"
      onClick={onClick}
    >
      {icon}
      <span
        style={{
          position: "absolute",
          bottom: 2,
          right: 2,
          width: 3,
          height: 3,
          borderRadius: "50%",
          background: active
            ? "var(--accent)"
            : "color-mix(in srgb, var(--primary) 18%, transparent)",
          transition: "background 0.15s",
        }}
      />
    </button>
  );
}

// ── Panel principal — vista y edición unificadas, ambas pistas editables ──────
export function PanelHistoriaMundo({
  texto,
  onChange,
  onSave,
  initialFilterReino,
  onSelectPersonaje,
}: {
  texto: string;
  onChange: (v: string) => void;
  onSave: () => Promise<void>;
  initialFilterReino?: string | null;
  onSelectPersonaje?: (id: string) => void;
}) {
  // Sistema antiguo de eventos "mundo"/"reino" (basado en columna historia JSON) eliminado.

  const {
    reinos,
    setReinos,
    loading: loadingReinos,
    recargar,
  } = useReinosConHistoria();

  // ── Capítulos con posición en línea de tiempo ─────────────────────────────
  const [capsTimeline, setCapsTimeline] = useState<CapTimeline[]>([]);
  // Mapa de todos los capítulos con reinos_ids (para los botones de filtro,
  // independientemente de si tienen orden_linea_tiempo)
  const [capsReinosIds, setCapsReinosIds] = useState<Record<string, string[]>>(
    {},
  );

  // ── Canciones con posición en línea de tiempo ─────────────────────────────
  const [cancionesTimeline, setCancionesTimeline] = useState<
    {
      id: string;
      titulo: string;
      cantante?: string | null;
      reinoId?: string | null;
      reinoNombre?: string | null;
      dia_absoluto?: number;
      orden_linea_tiempo?: number;
    }[]
  >([]);

  // ── Eventos de mundo/reino (tabla eventos_mundo, sistema nuevo) ───────────
  const [eventosMundo, setEventosMundo] = useState<
    {
      id: string;
      titulo: string;
      descripcion: string;
      dia_absoluto: number;
      reinoId?: string | null;
      reinoNombre?: string | null;
      source: string;
    }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    const cargarEventosMundo = async () => {
      // 1. Dexie primero
      try {
        if (db && (db as any).eventos_mundo) {
          const local: any[] = await (db as any).eventos_mundo.toArray();
          if (local.length && !cancelled) {
            const reinoMap: Record<string, string> = {};
            try {
              if (db && (db as any).reinos) {
                const rs: any[] = await (db as any).reinos.toArray();
                rs.forEach((r: any) => {
                  reinoMap[r.id] = r.nombre;
                });
              }
            } catch {}
            setEventosMundo(
              local.map((e: any) => ({
                id: e.id,
                titulo: e.titulo ?? "Sin título",
                descripcion: e.descripcion ?? "",
                dia_absoluto: e.dia_absoluto,
                reinoId: e.reino_id ?? null,
                reinoNombre: e.reino_id ? (reinoMap[e.reino_id] ?? null) : null,
                source: e.source ?? "mundo",
              })),
            );
          }
        }
      } catch {}
      if (!navigator.onLine || cancelled) return;
      // 2. Remoto
      try {
        const { data } = await supabase
          .from("eventos_mundo")
          .select(
            "id, titulo, descripcion, dia_absoluto, reino_id, source, reinos!reino_id(nombre)",
          );
        if (!data || cancelled) return;
        setEventosMundo(
          data.map((e: any) => {
            const reino = Array.isArray(e.reinos) ? e.reinos[0] : e.reinos;
            return {
              id: e.id,
              titulo: e.titulo ?? "Sin título",
              descripcion: e.descripcion ?? "",
              dia_absoluto: e.dia_absoluto,
              reinoId: e.reino_id ?? null,
              reinoNombre: reino?.nombre ?? null,
              source: e.source ?? "mundo",
            };
          }),
        );
        const flat = data.map((e: any) => ({ ...e, reinos: undefined }));
        try {
          if (db && (db as any).eventos_mundo)
            await (db as any).eventos_mundo.bulkPut(flat);
        } catch {}
      } catch {}
    };
    cargarEventosMundo();
    const handleOnline = () => {
      if (!cancelled) cargarEventosMundo();
    };
    window.addEventListener("online", handleOnline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const cargarCanciones = async () => {
      // 1. Dexie primero
      try {
        if (db && (db as any).canciones) {
          const local: any[] = await (db as any).canciones.toArray();
          const conDia = local.filter(
            (c) => c.dia_absoluto != null && !c.deleted,
          );
          if (conDia.length && !cancelled) {
            const reinoMap: Record<string, string> = {};
            try {
              if (db && (db as any).reinos) {
                const rs: any[] = await (db as any).reinos.toArray();
                rs.forEach((r: any) => {
                  reinoMap[r.id] = r.nombre;
                });
              }
            } catch {}
            setCancionesTimeline(
              conDia.map((c) => ({
                id: c.id,
                titulo: c.titulo ?? "Sin título",
                cantante: c.cantante ?? null,
                reinoId: c.reino_id ?? null,
                reinoNombre: c.reino_id ? (reinoMap[c.reino_id] ?? null) : null,
                dia_absoluto: c.dia_absoluto,
              })),
            );
          }
        }
      } catch {}
      if (!navigator.onLine || cancelled) return;
      // 2. Remoto
      try {
        const { data } = await supabase
          .from("canciones")
          .select(
            "id, titulo, cantante, dia_absoluto, reino_id, reinos!reino_id(nombre)",
          )
          .not("dia_absoluto", "is", null);
        if (!data?.length || cancelled) return;
        setCancionesTimeline(
          data.map((c: any) => {
            const reino = Array.isArray(c.reinos) ? c.reinos[0] : c.reinos;
            return {
              id: c.id,
              titulo: c.titulo ?? "Sin título",
              cantante: c.cantante ?? null,
              reinoId: c.reino_id ?? null,
              reinoNombre: reino?.nombre ?? null,
              dia_absoluto: c.dia_absoluto ?? undefined,
              orden_linea_tiempo: c.orden_linea_tiempo ?? undefined,
            };
          }),
        );
        const flat = data.map((c: any) => ({ ...c, reinos: undefined }));
        if (db && (db as any).canciones)
          await (db as any).canciones.bulkPut(flat);
      } catch {}
    };
    cargarCanciones();
    const handleOnline = () => {
      if (!cancelled) cargarCanciones();
    };
    window.addEventListener("online", handleOnline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const cargarCaps = async () => {
      // 1. Leer de Dexie primero — respuesta instantánea sin red
      try {
        if (db) {
          const [localCaps, localLibros]: [any[], any[]] = await Promise.all([
            (db as any).capitulos?.toArray() ?? [],
            (db as any).libros?.toArray() ?? [],
          ]);
          const libroMapLocal: Record<string, string> = {};
          localLibros.forEach((l: any) => {
            libroMapLocal[l.id] = l.titulo ?? "";
          });

          const conDia = localCaps.filter((c: any) => c.dia_absoluto != null);
          if (conDia.length && !cancelled) {
            setCapsTimeline(
              conDia.map((c: any) => ({
                id: c.id,
                libro_id: c.libro_id,
                titulo_capitulo: c.titulo_capitulo,
                dia_absoluto: c.dia_absoluto,
                libroTitulo: libroMapLocal[c.libro_id] ?? "",
                reinos_ids: c.reinos_ids ?? [],
              })),
            );
          }

          const mapLocal: Record<string, string[]> = {};
          localCaps.forEach((c: any) => {
            if (c.reinos_ids?.length) mapLocal[c.id] = c.reinos_ids;
          });
          if (Object.keys(mapLocal).length && !cancelled)
            setCapsReinosIds(mapLocal);
        }
      } catch {}

      // 2. Fetch remoto en paralelo si hay conexión
      if (!navigator.onLine || cancelled) return;

      try {
        // Lanzar ambas queries al mismo tiempo en lugar de secuencialmente
        const [capsRes, capsReinosRes] = await Promise.all([
          supabase
            .from("capitulos")
            .select(
              "id, libro_id, titulo_capitulo, dia_absoluto, orden_linea_tiempo, reinos_ids",
            )
            .not("dia_absoluto", "is", null),
          supabase
            .from("capitulos")
            .select("id, reinos_ids")
            .not("reinos_ids", "is", null),
        ]);
        if (cancelled) return;

        // Actualizar mapa de reinos_ids para los filtros
        const capsConReinos = capsReinosRes.data ?? [];
        if (capsConReinos.length) {
          const map: Record<string, string[]> = {};
          for (const c of capsConReinos as any[]) {
            if (c.reinos_ids?.length) map[c.id] = c.reinos_ids;
          }
          if (!cancelled) setCapsReinosIds(map);
        }

        // Actualizar pista de línea de tiempo
        const capsData = capsRes.data ?? [];
        if (capsData.length) {
          // Resolver títulos de libros desde Dexie primero, solo pedir los que faltan
          const libroIds = [
            ...new Set(
              (capsData as any[]).map((c: any) => c.libro_id).filter(Boolean),
            ),
          ];
          const libroMap: Record<string, string> = {};
          try {
            if (db && libroIds.length) {
              const localLibros: any[] =
                (await (db as any).libros?.toArray()) ?? [];
              localLibros.forEach((l: any) => {
                libroMap[l.id] = l.titulo ?? "";
              });
            }
          } catch {}

          const missingIds = libroIds.filter((id) => !libroMap[id]);
          if (missingIds.length) {
            try {
              const { data: libros } = await supabase
                .from("libros")
                .select("id, titulo")
                .in("id", missingIds);
              if (!cancelled) {
                (libros ?? []).forEach((l: any) => {
                  libroMap[l.id] = l.titulo ?? "";
                });
                // Persistir libros nuevos en Dexie
                if (db && libros?.length)
                  await (db as any).libros?.bulkPut(libros).catch(() => {});
              }
            } catch {}
          }

          if (!cancelled) {
            setCapsTimeline(
              (capsData as any[]).map((c) => ({
                id: c.id,
                libro_id: c.libro_id,
                titulo_capitulo: c.titulo_capitulo,
                orden_linea_tiempo: c.orden_linea_tiempo,
                dia_absoluto: c.dia_absoluto,
                libroTitulo: libroMap[c.libro_id] ?? "",
                reinos_ids: c.reinos_ids ?? [],
              })),
            );
            // Persistir capítulos en Dexie para la próxima carga offline
            try {
              if (db)
                await (db as any).capitulos?.bulkPut(capsData).catch(() => {});
            } catch {}
          }
        }
      } catch {}
    };

    cargarCaps();

    // Recargar al volver online
    const handleOnline = () => {
      if (!cancelled) cargarCaps();
    };
    window.addEventListener("online", handleOnline);

    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  // (Eliminado: inicialización de reinoEvents desde reino.historia)

  // (Eliminados: handleMundoChange, updateReinoEvent, removeReinoEvent, saveReinoHistory)

  // ── Personajes con fecha de nacimiento (cumpleaños) ──────────────────────
  const [personajesCumple, setPersonajesCumple] = useState<
    {
      id: string;
      nombre: string;
      img_url: string | null;
      reino: string | null;
      fecha_nacimiento: number;
    }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    const cargar = async () => {
      // 1. Dexie
      try {
        if (db && (db as any).personajes) {
          const local: any[] = await (db as any).personajes.toArray();
          const conFecha = local.filter(
            (p: any) => p.fecha_nacimiento != null && !p.deleted,
          );
          if (conFecha.length && !cancelled) {
            setPersonajesCumple(
              conFecha.map((p: any) => ({
                id: p.id,
                nombre: p.nombre ?? "Sin nombre",
                img_url: p.img_url ?? null,
                reino: p.reino ?? null,
                fecha_nacimiento: p.fecha_nacimiento,
              })),
            );
          }
        }
      } catch {}
      if (!navigator.onLine || cancelled) return;
      // 2. Supabase
      try {
        const { data } = await supabase
          .from("personajes")
          .select("id, nombre, img_url, reino, fecha_nacimiento")
          .not("fecha_nacimiento", "is", null);
        if (!data || cancelled) return;
        setPersonajesCumple(
          data.map((p: any) => ({
            id: p.id,
            nombre: p.nombre ?? "Sin nombre",
            img_url: p.img_url ?? null,
            reino: p.reino ?? null,
            fecha_nacimiento: p.fecha_nacimiento,
          })),
        );
      } catch {}
    };
    cargar();
    const handleOnline = () => {
      if (!cancelled) cargar();
    };
    window.addEventListener("online", handleOnline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const { cal } = useCalendario();
  const [filterReino, setFilterReino] = useState<string | null>(
    initialFilterReino ?? null,
  );
  const [showCapitulos, setShowCapitulos] = useState(true);
  const [showCanciones, setShowCanciones] = useState(true);
  const [showEventos, setShowEventos] = useState(true);
  const [showCumpleanos, setShowCumpleanos] = useState(true);
  const [showDescripciones, setShowDescripciones] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [diaOverrides, setDiaOverrides] = useState<Record<string, number>>({});
  const [showNuevoEvento, setShowNuevoEvento] = useState(false);
  const [creandoEvento, setCreandoEvento] = useState(false);
  const [erasLocal, setErasLocal] = useState<any[]>([]);
  const [eraModal, setEraModal] = useState<null | "new" | any>(null);
  const [showGestionEras, setShowGestionEras] = useState(false);

  // Sincronizar erasLocal con cal.eras cuando el hook carga
  useEffect(() => {
    if (cal?.eras?.length) setErasLocal(cal.eras);
  }, [cal?.eras]);

  const handleCrearEvento = useCallback(
    async (datos: {
      titulo: string;
      reinoId: string | null;
      dia_absoluto: number;
    }) => {
      setCreandoEvento(true);
      try {
        const reinoNombre = datos.reinoId
          ? (reinos.find((r) => r.id === datos.reinoId)?.nombre ?? null)
          : null;
        const { data, error } = await supabase
          .from("eventos_mundo")
          .insert([
            {
              titulo: datos.titulo || "Sin título",
              descripcion: "",
              dia_absoluto: datos.dia_absoluto,
              reino_id: datos.reinoId,
              source: datos.reinoId ? "reino" : "mundo",
            },
          ] as any)
          .select("id, titulo, descripcion, dia_absoluto, reino_id, source")
          .single();
        if (error || !data) return;
        const nuevo = {
          id: (data as any).id,
          titulo: (data as any).titulo ?? "Sin título",
          descripcion: (data as any).descripcion ?? "",
          dia_absoluto: (data as any).dia_absoluto,
          reinoId: (data as any).reino_id ?? null,
          reinoNombre,
          source: (data as any).source ?? "mundo",
        };
        setEventosMundo((prev) => [...prev, nuevo]);
        try {
          if (db && (db as any).eventos_mundo) {
            await (db as any).eventos_mundo.put({ ...data });
          }
        } catch {}
        setShowNuevoEvento(false);
      } finally {
        setCreandoEvento(false);
      }
    },
    [reinos],
  );

  const handleDiaChange = (id: string, dia: number) => {
    setDiaOverrides((prev) => ({ ...prev, [id]: dia }));
  };

  const handleEventoMundoDiaChange = useCallback(
    async (id: string, dia: number) => {
      setEventosMundo((prev) =>
        prev.map((e) => (e.id === id ? { ...e, dia_absoluto: dia } : e)),
      );
      try {
        await supabase
          .from("eventos_mundo")
          .update({ dia_absoluto: dia } as any)
          .eq("id", id);
      } catch {}
      try {
        if (db && (db as any).eventos_mundo) {
          const existing = await (db as any).eventos_mundo.get(id);
          await (db as any).eventos_mundo.put({
            ...(existing ?? { id }),
            dia_absoluto: dia,
          });
        }
      } catch {}
    },
    [],
  );

  const handleEventoMundoFieldChange = useCallback(
    async (id: string, field: "titulo" | "descripcion", value: string) => {
      setEventosMundo((prev) =>
        prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
      );
      try {
        await supabase
          .from("eventos_mundo")
          .update({ [field]: value } as any)
          .eq("id", id);
      } catch {}
      try {
        if (db && (db as any).eventos_mundo) {
          const existing = await (db as any).eventos_mundo.get(id);
          await (db as any).eventos_mundo.put({
            ...(existing ?? { id }),
            [field]: value,
          });
        }
      } catch {}
    },
    [],
  );
  const handleEventoMundoDelete = useCallback(async (id: string) => {
    setEventosMundo((prev) => prev.filter((e) => e.id !== id));
    try {
      await supabase.from("eventos_mundo").delete().eq("id", id);
    } catch {}
    try {
      if (db && (db as any).eventos_mundo)
        await (db as any).eventos_mundo.delete(id);
    } catch {}
  }, []);

  const debounceHistRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSave = useCallback(async () => {
    setSaveStatus("saving");
    try {
      await onSave();
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
    }
  }, [onSave]);

  // Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (debounceHistRef.current) {
          clearTimeout(debounceHistRef.current);
          debounceHistRef.current = null;
        }
        void handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  // (Eliminados: add, update, remove, handleSaveReinoEvent — eventos "mundo"/"reino")

  const allEvents = useMemo<MundoTimelineEvent[]>(() => {
    const list: MundoTimelineEvent[] = [];
    // Sistema antiguo (mundoEvents / reinoEvents basados en "historia" JSON) eliminado.
    // Solo se usa el sistema nuevo: capítulos y canciones con dia_absoluto.
    // Capítulos — solo los que tienen dia_absoluto
    if (showCapitulos) {
      for (const cap of capsTimeline) {
        if (filterReino && !(cap.reinos_ids ?? []).includes(filterReino))
          continue;
        const dia = diaOverrides[cap.id] ?? cap.dia_absoluto;
        if (dia == null) continue; // sin fecha del calendario → no aparece
        list.push({
          id: `cap:${cap.id}`,
          year: String(dia),
          title: cap.titulo_capitulo,
          description: "",
          source: "capitulo",
          yearNum: dia,
          dia_absoluto: dia,
          capData: cap,
        });
      }
    }
    // Eventos de mundo/reino — tabla eventos_mundo (sistema nuevo)
    if (showEventos) {
      for (const e of eventosMundo) {
        if (filterReino && e.reinoId !== filterReino) continue;
        const dia = e.dia_absoluto;
        if (dia == null) continue;
        list.push({
          id: e.id,
          year: String(dia),
          title: e.titulo,
          description: e.descripcion,
          source: e.reinoId ? "reino" : "mundo",
          reinoId: e.reinoId ?? undefined,
          reinoNombre: e.reinoNombre ?? undefined,
          yearNum: dia,
          dia_absoluto: dia,
        });
      }
    }
    // Canciones — solo las que tienen dia_absoluto
    if (showCanciones) {
      for (const c of cancionesTimeline) {
        if (filterReino && c.reinoId !== filterReino) continue;
        const dia = diaOverrides[c.id] ?? c.dia_absoluto;
        if (dia == null) continue; // sin fecha del calendario → no aparece
        list.push({
          id: `cancion:${c.id}`,
          year: String(dia),
          title: c.titulo,
          description: "",
          source: "cancion",
          yearNum: dia,
          dia_absoluto: dia,
          cancionData: {
            id: c.id,
            titulo: c.titulo,
            cantante: c.cantante,
            reinoNombre: c.reinoNombre ?? null,
            dia_absoluto: dia,
          },
        });
      }
    }
    // Cumpleaños — personajes con fecha_nacimiento
    if (showCumpleanos) {
      for (const p of personajesCumple) {
        if (
          filterReino &&
          p.reino !== reinos.find((r) => r.id === filterReino)?.nombre
        )
          continue;
        const dia = p.fecha_nacimiento;
        list.push({
          id: `cumple:${p.id}`,
          year: String(dia),
          title: p.nombre,
          description: "",
          source: "cumpleanos",
          yearNum: dia,
          dia_absoluto: dia,
          cumpleanosData: p,
        });
      }
    }
    return list.sort((a, b) => {
      const diff = a.yearNum - b.yearNum;
      if (diff !== 0) return diff;
      const order: Record<string, number> = {
        mundo: 0,
        reino: 1,
        cancion: 2,
        capitulo: 3,
        cumpleanos: 4,
      };
      return (order[a.source] ?? 1) - (order[b.source] ?? 1);
    });
  }, [
    filterReino,
    capsTimeline,
    cancionesTimeline,
    eventosMundo,
    diaOverrides,
    showCapitulos,
    showCanciones,
    showEventos,
    showCumpleanos,
    personajesCumple,
    reinos,
  ]);

  const reinosConEventos = useMemo(
    () =>
      reinos.filter((r) => {
        // Sistema nuevo: reinos con capítulos, eventos o canciones asociados
        // (antes solo se consideraban capítulos, así que un reino con eventos
        // o canciones pero sin capítulos nunca aparecía como filtro).
        const tieneCaps = Object.values(capsReinosIds).some((ids) =>
          ids.includes(r.id),
        );
        const tieneEventos = eventosMundo.some((e) => e.reinoId === r.id);
        const tieneCanciones = cancionesTimeline.some(
          (c) => c.reinoId === r.id,
        );
        return tieneCaps || tieneEventos || tieneCanciones;
      }),
    [reinos, capsReinosIds, eventosMundo, cancionesTimeline],
  );

  // (Eliminados: selectedEvt, handleUpdateSelected — panel de edición de eventos "mundo"/"reino")

  return (
    <div className="flex flex-col">
      {/* ── Cabecera ──────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center gap-2 px-3 py-2 border-b flex-wrap"
        style={{
          borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
        }}
      >
        {/* Filtro por reino */}
        {reinosConEventos.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <Filter
              size={8}
              style={{
                color: "color-mix(in srgb, var(--primary) 28%, transparent)",
              }}
            />
            <button
              className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border transition-all"
              style={
                filterReino === null
                  ? {
                      background:
                        "color-mix(in srgb, var(--primary) 10%, transparent)",
                      borderColor:
                        "color-mix(in srgb, var(--primary) 22%, transparent)",
                      color: "var(--primary)",
                    }
                  : {
                      borderColor:
                        "color-mix(in srgb, var(--primary) 10%, transparent)",
                      color:
                        "color-mix(in srgb, var(--primary) 28%, transparent)",
                    }
              }
              type="button"
              onClick={() => setFilterReino(null)}
            >
              Todos
            </button>
            {reinosConEventos.map((r) => (
              <button
                key={r.id}
                className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border transition-all"
                style={
                  filterReino === r.id
                    ? {
                        background:
                          "color-mix(in srgb, var(--primary) 10%, transparent)",
                        borderColor:
                          "color-mix(in srgb, var(--primary) 22%, transparent)",
                        color: "var(--primary)",
                      }
                    : {
                        borderColor:
                          "color-mix(in srgb, var(--primary) 10%, transparent)",
                        color:
                          "color-mix(in srgb, var(--primary) 28%, transparent)",
                      }
                }
                type="button"
                onClick={() =>
                  setFilterReino((prev) => (prev === r.id ? null : r.id))
                }
              >
                {r.nombre}
              </button>
            ))}
          </div>
        )}

        {/* Filtro por tipo */}
        <div className="flex items-center gap-1 flex-wrap">
          <Filter
            size={8}
            style={{
              color: "color-mix(in srgb, var(--primary) 28%, transparent)",
            }}
          />
          <ToggleTipoBtn
            active={showCapitulos}
            icon={<BookOpen size={9} />}
            label="Capítulos"
            onClick={() => setShowCapitulos((v) => !v)}
          />
          <ToggleTipoBtn
            active={showCanciones}
            icon={<Music size={9} />}
            label="Canciones"
            onClick={() => setShowCanciones((v) => !v)}
          />
          <ToggleTipoBtn
            active={showEventos}
            icon={<CalendarDays size={9} />}
            label="Eventos"
            onClick={() => setShowEventos((v) => !v)}
          />
          <ToggleTipoBtn
            active={showCumpleanos}
            icon={
              <svg
                fill="none"
                height="9"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                width="9"
              >
                <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" />
                <path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2 1 2 1" />
                <path d="M2 21h20" />
                <path d="M7 8v2" />
                <path d="M12 8v2" />
                <path d="M17 8v2" />
                <path d="M7 4h.01" />
                <path d="M12 4h.01" />
                <path d="M17 4h.01" />
              </svg>
            }
            label="Cumpleaños"
            onClick={() => setShowCumpleanos((v) => !v)}
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <SaveIndicator status={saveStatus} />
          {/* Toggle descripciones */}
          <button
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all"
            style={{
              borderColor: !showDescripciones
                ? "color-mix(in srgb, var(--primary) 22%, transparent)"
                : "color-mix(in srgb, var(--primary) 12%, transparent)",
              background: !showDescripciones
                ? "color-mix(in srgb, var(--primary) 8%, transparent)"
                : "transparent",
              color: !showDescripciones
                ? "var(--primary)"
                : "color-mix(in srgb, var(--primary) 35%, transparent)",
            }}
            title={
              showDescripciones
                ? "Modo compacto (solo títulos)"
                : "Mostrar descripciones"
            }
            type="button"
            onClick={() => setShowDescripciones((v) => !v)}
          >
            <Layers size={9} />
            {showDescripciones ? "Compactar" : "Expandir"}
          </button>
          {/* Botón gestionar eras */}
          <button
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all"
            style={{
              borderColor:
                "color-mix(in srgb, var(--primary) 18%, transparent)",
              color: "color-mix(in srgb, var(--primary) 50%, transparent)",
            }}
            title="Ver y editar todas las eras"
            type="button"
            onClick={() => setShowGestionEras(true)}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background =
                "color-mix(in srgb, var(--primary) 5%, transparent)";
              el.style.color = "var(--primary)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "transparent";
              el.style.color =
                "color-mix(in srgb, var(--primary) 50%, transparent)";
            }}
          >
            <Clock size={9} /> Eras
          </button>
          {/* Botón nueva era */}
          <button
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all"
            style={{
              borderColor:
                "color-mix(in srgb, var(--primary) 18%, transparent)",
              color: "color-mix(in srgb, var(--primary) 50%, transparent)",
            }}
            title="Crear nueva era"
            type="button"
            onClick={() => setEraModal("new")}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background =
                "color-mix(in srgb, var(--primary) 5%, transparent)";
              el.style.color = "var(--primary)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "transparent";
              el.style.color =
                "color-mix(in srgb, var(--primary) 50%, transparent)";
            }}
          >
            <Plus size={9} /> Era
          </button>
          <button
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all"
            style={{
              borderColor: "color-mix(in srgb, var(--accent) 25%, transparent)",
              color: "var(--accent)",
            }}
            title="Añadir evento"
            type="button"
            onClick={() => setShowNuevoEvento(true)}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background =
                "color-mix(in srgb, var(--accent) 8%, transparent)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "transparent";
            }}
          >
            <Plus size={9} /> Evento
          </button>
          <button
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all"
            style={{
              borderColor:
                "color-mix(in srgb, var(--primary) 12%, transparent)",
              color: "color-mix(in srgb, var(--primary) 35%, transparent)",
            }}
            title="Recargar línea de tiempo"
            type="button"
            onClick={() => {
              recargar();
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.color = "var(--primary)";
              el.style.borderColor =
                "color-mix(in srgb, var(--primary) 28%, transparent)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.color =
                "color-mix(in srgb, var(--primary) 35%, transparent)";
              el.style.borderColor =
                "color-mix(in srgb, var(--primary) 12%, transparent)";
            }}
          >
            {loadingReinos ? (
              <Loader2 className="animate-spin" size={9} />
            ) : (
              <svg
                fill="none"
                height="9"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
                width="9"
              >
                <path d="M21 2v6h-6" />
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M3 22v-6h6" />
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Modal: nuevo evento */}
      {showNuevoEvento && (
        <ModalNuevoEvento
          creando={creandoEvento}
          reinos={reinos}
          onClose={() => setShowNuevoEvento(false)}
          onCrear={handleCrearEvento}
        />
      )}

      {/* Modal: gestionar todas las eras */}
      {showGestionEras && (
        <ModalGestionEras
          eras={erasLocal.length > 0 ? erasLocal : (cal?.eras ?? [])}
          onClose={() => setShowGestionEras(false)}
          onEditEra={(era) => {
            setShowGestionEras(false);
            setEraModal(era);
          }}
          onNewEra={() => {
            setShowGestionEras(false);
            setEraModal("new");
          }}
        />
      )}

      {/* Modal: crear/editar era */}
      {eraModal && (
        <ModalEra
          era={eraModal === "new" ? null : eraModal}
          onClose={() => setEraModal(null)}
          onDeleted={(id) => {
            setErasLocal((prev) => prev.filter((e: any) => e.id !== id));
            setEraModal(null);
          }}
          onSaved={(eraGuardada) => {
            setErasLocal((prev) => {
              const idx = prev.findIndex((e: any) => e.id === eraGuardada.id);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = eraGuardada;
                return next;
              }
              return [...prev, eraGuardada].sort(
                (a: any, b: any) => a.anio_inicio - b.anio_inicio,
              );
            });
            setEraModal(null);
          }}
        />
      )}

      {/* ── Pista única: acontecimientos + capítulos en un solo scroll ──────── */}
      <div className="px-3 py-3">
        {loadingReinos ? (
          <div className="flex justify-center py-4">
            <Loader2 className="animate-spin text-primary/20" size={14} />
          </div>
        ) : (
          <div
            className="overflow-x-auto pb-1"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor:
                "color-mix(in srgb, var(--primary) 15%, transparent) transparent",
            }}
          >
            <div
              className="relative flex items-start"
              style={{
                minWidth: "max-content",
                paddingLeft: 8,
                paddingRight: 8,
              }}
            >
              {/* ── Franjas de eras del mundo (clickeables para editar) ── */}
              {allEvents.length > 0 &&
                (() => {
                  const erasMostrar =
                    erasLocal.length > 0 ? erasLocal : (cal?.eras ?? []);
                  if (!erasMostrar.length) return null;
                  const CARD_W = 232;
                  const SEP_W = 64;

                  // Días totales por año según el calendario real (suma de días de estaciones).
                  // Fallback 365 si el calendario todavía no cargó.
                  const diasAnio =
                    cal?.estaciones?.reduce(
                      (s: number, e: any) => s + (e.duracion_dias ?? 0),
                      0,
                    ) || 365;

                  // Precalcular posición X de cada tarjeta (incluyendo separadores)
                  const cardPositions: number[] = [];
                  let xCursor = 0;
                  let lastAnioSep: number | null = null;
                  for (const evt of allEvents) {
                    const anioEvt =
                      evt.dia_absoluto != null
                        ? Math.floor(evt.dia_absoluto / diasAnio)
                        : null;
                    if (anioEvt !== null && anioEvt !== lastAnioSep) {
                      xCursor += SEP_W;
                      lastAnioSep = anioEvt;
                    }
                    cardPositions.push(xCursor);
                    xCursor += CARD_W;
                  }

                  return erasMostrar.map((era: any) => {
                    // Convertir año → día absoluto usando el calendario real
                    const eraStartDia = era.anio_inicio * diasAnio;
                    const eraEndDia =
                      era.anio_fin != null
                        ? (era.anio_fin + 1) * diasAnio - 1
                        : Infinity;

                    // Posicionar por índice de tarjeta, no por proporción de fecha.
                    // Así la franja cubre exactamente las tarjetas que caen en la era,
                    // sin importar cómo estén distribuidas en el tiempo.
                    const firstIdx = allEvents.findIndex(
                      (e) => (e.dia_absoluto ?? e.yearNum) >= eraStartDia,
                    );
                    if (firstIdx === -1) return null;
                    if (
                      (allEvents[firstIdx].dia_absoluto ??
                        allEvents[firstIdx].yearNum) > eraEndDia
                    )
                      return null;

                    let lastIdx = firstIdx;
                    for (let i = firstIdx + 1; i < allEvents.length; i++) {
                      if (
                        (allEvents[i].dia_absoluto ?? allEvents[i].yearNum) <=
                        eraEndDia
                      )
                        lastIdx = i;
                      else break;
                    }

                    const PAD = 8; // paddingLeft del contenedor

                    // Si el primer evento de esta era también es el primero de un año
                    // nuevo, su separador de año (SEP_W px) cae justo antes de él y
                    // debe quedar dentro de la franja de la era.
                    const firstEvtAnio =
                      allEvents[firstIdx].dia_absoluto != null
                        ? Math.floor(
                            allEvents[firstIdx].dia_absoluto / diasAnio,
                          )
                        : null;
                    const prevDiaAbs =
                      firstIdx > 0
                        ? allEvents[firstIdx - 1].dia_absoluto
                        : undefined;
                    const prevEvtAnio =
                      prevDiaAbs != null
                        ? Math.floor(prevDiaAbs / diasAnio)
                        : null;
                    const hasPrecedingSep =
                      firstEvtAnio !== null && firstEvtAnio !== prevEvtAnio;
                    const eraLeft =
                      cardPositions[firstIdx] -
                      (hasPrecedingSep ? SEP_W : 0) +
                      PAD;

                    const left = eraLeft;
                    const width =
                      cardPositions[lastIdx] +
                      CARD_W -
                      cardPositions[firstIdx] +
                      (hasPrecedingSep ? SEP_W : 0);
                    return (
                      <div
                        key={era.id}
                        className="absolute top-0 bottom-0 group/era transition-all pointer-events-none"
                        style={{
                          left,
                          width,
                          background: era.color
                            ? `${era.color}0e`
                            : "transparent",
                          borderLeft: era.color
                            ? `2px solid ${era.color}45`
                            : "none",
                        }}
                        title={`Editar era: ${era.nombre}`}
                      >
                        {/* Línea superior de color — clickeable para editar */}
                        <div
                          className="absolute top-0 left-0 right-0 h-0.5 opacity-50"
                          style={{ background: era.color ?? "var(--accent)" }}
                        />
                        {/* Etiqueta con icono de edición al hover (única zona clickeable) */}
                        <div
                          className="absolute top-1.5 left-2 flex items-center gap-1 px-1 py-0.5 -mx-1 -my-0.5 rounded cursor-pointer pointer-events-auto transition-colors hover:opacity-90"
                          style={{ background: "transparent" }}
                          onClick={() => setEraModal(era)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = era.color
                              ? `${era.color}1a`
                              : "color-mix(in srgb, var(--primary) 8%, transparent)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <span
                            className="text-[7px] font-black uppercase tracking-widest whitespace-nowrap transition-opacity opacity-50 group-hover/era:opacity-90"
                            style={{ color: era.color ?? "var(--primary)" }}
                          >
                            {era.nombre}
                          </span>
                          <svg
                            className="opacity-0 group-hover/era:opacity-60 transition-opacity shrink-0"
                            fill="none"
                            height="7"
                            stroke={era.color ?? "var(--primary)"}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.5"
                            viewBox="0 0 24 24"
                            width="7"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </div>
                      </div>
                    );
                  });
                })()}

              {(() => {
                // Calcular días por año del calendario (fallback 365)
                const diasAnioLocal =
                  cal?.estaciones?.reduce(
                    (s: number, e: any) => s + (e.duracion_dias ?? 0),
                    0,
                  ) || 365;

                const items: React.ReactNode[] = [];
                let lastAnio: number | null = null;
                let globalIdx = 0; // índice real para la línea (incluye separadores)

                allEvents.forEach((evt, idx) => {
                  const isCapitulo = evt.source === "capitulo";
                  const isCancion = evt.source === "cancion";
                  const isCumpleanos = evt.source === "cumpleanos";
                  const isEventoMundo =
                    evt.source === "mundo" || evt.source === "reino";
                  const totalLen = allEvents.length;

                  const anioEvt =
                    evt.dia_absoluto != null
                      ? Math.floor(evt.dia_absoluto / diasAnioLocal)
                      : null;

                  // ── Separador de año ────────────────────────────────────
                  if (anioEvt !== null && anioEvt !== lastAnio) {
                    const eraDesteAnio = (cal?.eras ?? []).find(
                      (era: any) =>
                        era.anio_inicio <= anioEvt &&
                        (era.anio_fin == null || era.anio_fin >= anioEvt),
                    );
                    const sepIdx = globalIdx;
                    items.push(
                      <div
                        key={`sep-${anioEvt}`}
                        className="flex flex-col shrink-0 items-center"
                        style={{ width: 64 }}
                      >
                        {/* Espacio reservado para la barra de eras (top-0) */}
                        <div style={{ height: 20 }} />
                        {/* Línea horizontal con tick vertical */}
                        <div
                          className="flex items-center w-full"
                          style={{ height: 26 }}
                        >
                          <div
                            className="flex-1 h-px"
                            style={{
                              background:
                                sepIdx === 0
                                  ? "transparent"
                                  : "color-mix(in srgb, var(--primary) 10%, transparent)",
                            }}
                          />
                          {/* Tick vertical */}
                          <div
                            className="shrink-0 w-px"
                            style={{
                              height: 14,
                              background: eraDesteAnio?.color
                                ? `${eraDesteAnio.color}70`
                                : "color-mix(in srgb, var(--primary) 20%, transparent)",
                            }}
                          />
                          <div
                            className="flex-1 h-px"
                            style={{
                              background:
                                "color-mix(in srgb, var(--primary) 10%, transparent)",
                            }}
                          />
                        </div>
                        {/* Etiqueta del año — debajo del tick, nunca encima de la barra de eras */}
                        <div
                          className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest whitespace-nowrap -mt-1"
                          style={{
                            background: eraDesteAnio?.color
                              ? `${eraDesteAnio.color}18`
                              : "color-mix(in srgb, var(--primary) 7%, transparent)",
                            color:
                              eraDesteAnio?.color ??
                              "color-mix(in srgb, var(--primary) 45%, transparent)",
                            border: `1px solid ${
                              eraDesteAnio?.color
                                ? `${eraDesteAnio.color}30`
                                : "color-mix(in srgb, var(--primary) 12%, transparent)"
                            }`,
                          }}
                        >
                          Año {anioEvt}
                        </div>
                      </div>,
                    );
                    lastAnio = anioEvt;
                    globalIdx++;
                  }

                  // ── Tarjeta del evento ───────────────────────────────────
                  items.push(
                    <div
                      key={evt.id}
                      className="flex flex-col shrink-0"
                      style={{ width: 232 }}
                    >
                      {/* Espacio reservado para la barra de eras (top-0) */}
                      <div style={{ height: 20 }} />
                      {/* Nodo en la línea */}
                      <div className="flex items-center" style={{ height: 26 }}>
                        <div
                          className="flex-1 h-px"
                          style={{
                            background:
                              globalIdx === 0
                                ? "transparent"
                                : "color-mix(in srgb, var(--primary) 10%, transparent)",
                          }}
                        />
                        <div
                          className="shrink-0 rounded-full transition-all"
                          style={
                            isCapitulo
                              ? {
                                  width: 8,
                                  height: 8,
                                  background:
                                    "color-mix(in srgb, var(--accent) 70%, var(--primary))",
                                  boxShadow:
                                    "0 0 0 2px color-mix(in srgb, var(--accent) 15%, transparent)",
                                }
                              : isCancion
                                ? {
                                    width: 8,
                                    height: 8,
                                    background: "var(--accent)",
                                    boxShadow:
                                      "0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent)",
                                  }
                                : isCumpleanos
                                  ? {
                                      width: 8,
                                      height: 8,
                                      background: "var(--accent)",
                                      boxShadow:
                                        "0 0 0 2px color-mix(in srgb, var(--accent) 22%, transparent)",
                                    }
                                  : {
                                      width: 10,
                                      height: 10,
                                      background: "var(--primary)",
                                      boxShadow:
                                        "0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent)",
                                    }
                          }
                        />
                        <div
                          className="flex-1 h-px"
                          style={{
                            background:
                              idx === totalLen - 1
                                ? "transparent"
                                : "color-mix(in srgb, var(--primary) 10%, transparent)",
                          }}
                        />
                      </div>
                      {/* Tarjeta */}
                      {isCancion && evt.cancionData ? (
                        <CancionMundoRow
                          cancion={evt.cancionData}
                          onDiaChange={handleDiaChange}
                        />
                      ) : isCapitulo && evt.capData ? (
                        <CapituloEventoRow
                          cap={evt.capData}
                          reinos={reinos}
                          onDiaChange={handleDiaChange}
                          onNavigate={() => {
                            localStorage.setItem(
                              "estudio-caps-last-cap",
                              evt.capData!.id,
                            );
                            localStorage.setItem(
                              "estudio-caps-last-libro",
                              evt.capData!.libro_id,
                            );
                            window.dispatchEvent(
                              new Event("estudio-caps-action"),
                            );
                          }}
                        />
                      ) : isCumpleanos && evt.cumpleanosData ? (
                        <CumpleanosTimelineRow
                          data={evt.cumpleanosData}
                          onNavigate={() =>
                            onSelectPersonaje?.(evt.cumpleanosData!.id)
                          }
                        />
                      ) : isEventoMundo ? (
                        <EventoMundoRow
                          evt={evt}
                          showDescripciones={showDescripciones}
                          onDiaChange={handleEventoMundoDiaChange}
                          onDelete={handleEventoMundoDelete}
                          onFieldChange={handleEventoMundoFieldChange}
                        />
                      ) : null}
                    </div>,
                  );
                  globalIdx++;
                });

                return items;
              })()}

              {/* Estado vacío */}
              {allEvents.length === 0 && filterReino && (
                <p className="text-[9px] text-primary/20 italic px-4 py-2 self-center">
                  Sin eventos para este reino.
                </p>
              )}
              {allEvents.length === 0 && !filterReino && (
                <p className="text-[9px] text-primary/20 italic px-2 py-2 self-center">
                  Sin capítulos o canciones con fecha asignada.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
