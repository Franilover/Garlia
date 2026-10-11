"use client";

/**
 * SistemaSolarSection
 * ───────────────────────────────────────────────────────────────────────────
 * Dos modos de visualización del sistema solar de Garlia:
 *
 *  MODO 2D — fila horizontal legible, escala logarítmica para separar planetas
 *             internos. Pan + zoom via <g transform>. Click abre panel.
 *
 *  MODO 3D SIMULADO — órbitas elípticas inclinadas alrededor de la estrella,
 *             animadas en el tiempo. Cada planeta gira según su periodo orbital.
 *             La inclinación y ángulo de inicio vienen de cuerpo_celeste_visual_v1.
 *
 * Config visual (escala, inclinación, ángulo) → tabla cuerpo_celeste_visual_v1
 * Física (semieje_mayor_orbital en metros, radio_km, temperatura) → valores_fisicos
 * Magnitudes → magnitudes_fisicas
 */

import React, {
  useEffect, useMemo, useRef, useState, useCallback,
} from "react";
import {
  Loader2, ZoomIn, ZoomOut, RotateCcw, Globe, Orbit,
} from "lucide-react";

import { supabase } from "@/infra/supabase/supabase";
import { usePanelFlotante } from "@/domains/garlia/_shared/usePanelFlotanteStore";

// ── Tipos ──────────────────────────────────────────────────────────────────

type CuerpoCeleste = {
  id: string;
  nombre: string;
  tipo_cuerpo: string | null;
  cuerpo_principal_id: string | null;
  descripcion: string | null;
  canon: boolean | null;
};

type VisualConfig = {
  cuerpo_celeste_id: string;
  escala_visual: number;
  inclinacion_grados: number;
  angulo_inicio_grados: number;
};

type CuerpoConFisica = CuerpoCeleste & {
  distancia_au: number | null;
  radio_km: number | null;
  temperatura_k: number | null;
  periodo_orbital_dias: number | null;
  // visual
  escala_visual: number;
  inclinacion_grados: number;
  angulo_inicio_grados: number;
};

// ── Colores ────────────────────────────────────────────────────────────────

function colorDeCuerpo(c: CuerpoConFisica): string {
  const tipo = c.tipo_cuerpo ?? "";
  const nombre = c.nombre.toLowerCase();
  if (tipo === "estrella") return "#FFD580";
  if (nombre === "vérun" || nombre === "verun") return "#E8856A";
  if (nombre === "arath") return "#D4A96A";
  if (nombre === "garlia") return "#6AAED4";
  if (nombre === "wanocua") return "#5BBFCF";
  if (nombre === "korvath") return "#C4A46A";
  if (nombre === "kethvar") return "#A8C4D8";
  if (nombre === "nelveth") return "#8AAFC4";
  if (tipo === "planeta") return "#9BAFC4";
  if (tipo === "satelite") return "#A8A8A8";
  if (tipo === "otro") return "#7A6A5A";
  return "#888888";
}

// ── Escalas de radio ───────────────────────────────────────────────────────

const MIN_R = 4;
const MAX_R = 20;
const STAR_R = 28;
const MOON_R = 3;

function escalarRadio(
  radioKm: number | null,
  tipo: string | null,
  allRadios: number[],
): number {
  if (tipo === "estrella") return STAR_R;
  if (tipo === "satelite") return MOON_R;
  if (!radioKm || allRadios.length === 0) return MIN_R + 1;
  const min = Math.min(...allRadios);
  const max = Math.max(...allRadios);
  if (max === min) return (MIN_R + MAX_R) / 2;
  return MIN_R + ((radioKm - min) / (max - min)) * (MAX_R - MIN_R);
}

// ── Componente ─────────────────────────────────────────────────────────────

type Modo = "2d" | "3d";

export function SistemaSolarSection() {
  const [cuerpos, setCuerpos] = useState<CuerpoConFisica[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [modo, setModo] = useState<Modo>("2d");
  const [tiempo, setTiempo] = useState(0); // días simulados para modo 3D
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const rafRef = useRef<number | null>(null);

  const abrirPanel = usePanelFlotante((s) => s.abrir);

  // ── Carga ──────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLoading(true);

      const { data: rawCuerpos, error: e1 } = await supabase
        .from("cuerpos_celestes_v1")
        .select("id, nombre, tipo_cuerpo, cuerpo_principal_id, descripcion, canon");
      if (e1 || !rawCuerpos || cancelado) { setLoading(false); return; }

      const ids = rawCuerpos.map((c: any) => c.id);

      const [{ data: rawValores }, { data: magnitudes }, { data: rawVisual }] = await Promise.all([
        supabase
          .from("valores_fisicos")
          .select("entidad_tipo, entidad_id, magnitud_id, valor, unidad_id")
          .eq("entidad_tipo", "cuerpo_celeste")
          .in("entidad_id", ids),
        supabase
          .from("magnitudes_fisicas")
          .select("id, clave, nombre"),
        supabase
          .from("cuerpo_celeste_visual_v1")
          .select("cuerpo_celeste_id, escala_visual, inclinacion_grados, angulo_inicio_grados")
          .in("cuerpo_celeste_id", ids),
      ]);

      if (cancelado) return;

      // magMap: id → clave
      const magMap: Record<string, string> = {};
      for (const m of magnitudes ?? []) {
        magMap[m.id] = m.clave ?? m.nombre?.toLowerCase().replace(/\s+/g, "_") ?? "";
      }

      // visualMap: id → config
      const visualMap: Record<string, VisualConfig> = {};
      for (const v of rawVisual ?? []) {
        visualMap[v.cuerpo_celeste_id] = v as VisualConfig;
      }

      // valoresPorEntidad
      const AU_M = 149_597_870_700;
      const valoresPorEntidad: Record<string, Record<string, number>> = {};
      for (const v of rawValores ?? []) {
        if (!valoresPorEntidad[v.entidad_id]) valoresPorEntidad[v.entidad_id] = {};
        const clave = magMap[v.magnitud_id] ?? v.magnitud_id;
        valoresPorEntidad[v.entidad_id][clave] = Number(v.valor);
      }

      const combinados: CuerpoConFisica[] = rawCuerpos.map((c: any) => {
        const vals = valoresPorEntidad[c.id] ?? {};
        const vis = visualMap[c.id];

        const semieje_m = vals["semieje_mayor_orbital"] ?? null;
        const distancia_au = semieje_m != null ? semieje_m / AU_M : null;
        const radio_km =
          vals["radio_km"] ?? vals["radio"] ?? vals["radio_ecuatorial_km"] ??
          (vals["longitud"] != null ? vals["longitud"] / 1000 : null) ?? null;
        const temperatura_k = vals["temperatura"] ?? vals["temperatura_superficie_k"] ?? null;
        const periodo_orbital_dias = vals["periodo_orbital"] != null
          ? vals["periodo_orbital"] / 86400  // si está en segundos
          : null;

        return {
          ...c,
          distancia_au,
          radio_km,
          temperatura_k,
          periodo_orbital_dias,
          escala_visual: vis?.escala_visual ?? 1.0,
          inclinacion_grados: vis?.inclinacion_grados ?? 0.0,
          angulo_inicio_grados: vis?.angulo_inicio_grados ?? 0.0,
        } as CuerpoConFisica;
      });

      setCuerpos(combinados);
      setLoading(false);
    })();
    return () => { cancelado = true; };
  }, []);

  // ── Animación 3D ──────────────────────────────────────────────────────

  useEffect(() => {
    if (modo !== "3d") {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000; // segundos reales
      last = now;
      // 1 segundo real = 2 días simulados (velocidad cómoda para ver orbitar)
      setTiempo((t) => t + dt * 2);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [modo]);

  // ── Derivados ─────────────────────────────────────────────────────────

  const planetas = useMemo(
    () => cuerpos
      .filter((c) => c.tipo_cuerpo === "planeta" || c.tipo_cuerpo === "estrella")
      .sort((a, b) => (a.distancia_au ?? 0) - (b.distancia_au ?? 0)),
    [cuerpos],
  );
  const satelites = useMemo(
    () => cuerpos.filter((c) => c.tipo_cuerpo === "satelite"),
    [cuerpos],
  );
  const cinturones = useMemo(
    () => cuerpos.filter((c) => c.tipo_cuerpo === "otro"),
    [cuerpos],
  );
  const allRadios = useMemo(
    () => planetas.filter((c) => c.tipo_cuerpo === "planeta")
      .map((c) => c.radio_km ?? 0).filter(Boolean),
    [planetas],
  );
  const estrella = useMemo(() => planetas.find((c) => c.tipo_cuerpo === "estrella"), [planetas]);
  const soloPlanetas = useMemo(() => planetas.filter((c) => c.tipo_cuerpo === "planeta"), [planetas]);

  // Distancias visuales en 2D: escala logarítmica aplicada a la distancia AU * escala_visual
  // Normalizado al espacio disponible
  const distanciasLog = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of soloPlanetas) {
      if (p.distancia_au == null) continue;
      // log(1 + AU * escala_visual) — garantiza que 0 AU → 0
      map[p.id] = Math.log1p(p.distancia_au * p.escala_visual);
    }
    return map;
  }, [soloPlanetas]);

  const maxDistLog = useMemo(
    () => Math.max(...Object.values(distanciasLog), 1),
    [distanciasLog],
  );

  // Dimensiones SVG fijas
  const SVG_W = 1200;
  const SVG_H = 480;
  const CENTER_X = SVG_W / 2;
  const CENTER_Y = SVG_H / 2;

  // ── Posiciones 2D ─────────────────────────────────────────────────────

  function xPlaneta2D(p: CuerpoConFisica): number {
    const logD = distanciasLog[p.id] ?? 0;
    return CENTER_X + (logD / maxDistLog) * (SVG_W / 2 - 70);
  }

  function xEstrella2D(): number {
    return CENTER_X - (SVG_W / 2 - 70) * 0.04;
  }

  // ── Posiciones 3D simulado ─────────────────────────────────────────────

  function pos3D(p: CuerpoConFisica): { x: number; y: number; z: number } {
    if (p.distancia_au == null) return { x: CENTER_X, y: CENTER_Y, z: 0 };
    // radio orbital visual (log) — igual que 2D para consistencia
    const logD = distanciasLog[p.id] ?? 0;
    const r = (logD / maxDistLog) * (SVG_W / 2 - 70);

    const inc = (p.inclinacion_grados * Math.PI) / 180;
    // velocidad angular: si hay periodo_orbital_dias usarlo, sino proporcional a sqrt(1/AU³) (Kepler)
    const periodo = p.periodo_orbital_dias
      ?? 365.25 * Math.pow(p.distancia_au, 1.5);
    const angulo =
      ((p.angulo_inicio_grados * Math.PI) / 180) +
      (tiempo / periodo) * 2 * Math.PI;

    // Posición en el plano orbital
    const xOrb = r * Math.cos(angulo);
    const yOrb = r * Math.sin(angulo);

    // Proyección con inclinación (rotación en X)
    const x3 = CENTER_X + xOrb;
    const y3 = CENTER_Y + yOrb * Math.cos(inc);
    const z3 = yOrb * Math.sin(inc); // usado para tamaño/opacidad

    return { x: x3, y: y3, z: z3 };
  }

  // ── Interacción ────────────────────────────────────────────────────────

  const hovered = hoveredId ? cuerpos.find((c) => c.id === hoveredId) : null;

  function onMouseDown(e: React.MouseEvent) {
    if ((e.target as SVGElement).closest("[data-cuerpo]")) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragging || !dragStart.current) return;
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.x),
      y: dragStart.current.oy + (e.clientY - dragStart.current.y),
    });
  }
  function onMouseUp() { setDragging(false); dragStart.current = null; }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    setZoom((z) => Math.min(4, Math.max(0.5, z + (e.deltaY > 0 ? -0.1 : 0.1))));
  }

  function resetView() { setZoom(1); setOffset({ x: 0, y: 0 }); }

  const transform = `translate(${CENTER_X + offset.x}, ${CENTER_Y + offset.y}) scale(${zoom}) translate(${-CENTER_X}, ${-CENTER_Y})`;

  // ── Render guards ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary/30" size={24} />
      </div>
    );
  }
  if (planetas.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-primary/30 text-sm">
        No hay cuerpos celestes en Supabase aún.
      </div>
    );
  }

  // ── SVG helpers compartidos ────────────────────────────────────────────

  function renderEstrella(sx: number, sy: number) {
    if (!estrella) return null;
    const r = STAR_R;
    const isHov = hoveredId === estrella.id;
    return (
      <g
        key={estrella.id}
        data-cuerpo="true"
        style={{ cursor: "pointer" }}
        onMouseEnter={() => setHoveredId(estrella.id)}
        onMouseLeave={() => setHoveredId(null)}
        onClick={() => abrirPanel("planeta", estrella.id)}
      >
        <circle cx={sx} cy={sy} r={r * 2.4} fill="#FFD58008" />
        <circle cx={sx} cy={sy} r={r * 1.6} fill="#FFD58014" />
        <circle
          cx={sx} cy={sy}
          r={isHov ? r * 1.12 : r}
          fill={colorDeCuerpo(estrella)}
          filter="url(#glow-star)"
          style={{ transition: "r 0.2s" }}
        />
        <text
          x={sx} y={sy + r + 14}
          textAnchor="middle" fontSize={9}
          fill="color-mix(in srgb, var(--primary) 45%, transparent)"
          fontWeight="900" fontFamily="inherit" letterSpacing="0.05em"
        >
          {estrella.nombre.split(" ")[0]}
        </text>
      </g>
    );
  }

  function renderPlaneta(
    planeta: CuerpoConFisica,
    px: number, py: number,
    extraScale = 1,
  ) {
    const r = escalarRadio(planeta.radio_km, planeta.tipo_cuerpo, allRadios) * extraScale;
    const isHov = hoveredId === planeta.id;
    const color = colorDeCuerpo(planeta);
    return (
      <g
        key={planeta.id}
        data-cuerpo="true"
        style={{ cursor: "pointer" }}
        onMouseEnter={() => setHoveredId(planeta.id)}
        onMouseLeave={() => setHoveredId(null)}
        onClick={() => abrirPanel("planeta", planeta.id)}
      >
        {isHov && (
          <circle cx={px} cy={py} r={r * 2.8} fill={`${color}12`} />
        )}
        <circle
          cx={px} cy={py}
          r={isHov ? r * 1.12 : r}
          fill={color}
          filter={isHov ? "url(#glow-planet)" : undefined}
          style={{ transition: "r 0.15s" }}
        />
        <text
          x={px} y={py + r + (isHov ? 16 : 13)}
          textAnchor="middle"
          fontSize={isHov ? 10 : 9}
          fill={
            isHov
              ? "color-mix(in srgb, var(--primary) 72%, transparent)"
              : "color-mix(in srgb, var(--primary) 38%, transparent)"
          }
          fontWeight="900" fontFamily="inherit" letterSpacing="0.04em"
          style={{ transition: "font-size 0.15s, fill 0.15s" }}
        >
          {planeta.nombre}
        </text>
        {isHov && (
          <text
            x={px} y={py + r + 28}
            textAnchor="middle" fontSize={8}
            fill="color-mix(in srgb, var(--primary) 30%, transparent)"
            fontWeight="600" fontFamily="var(--font-mono, monospace)"
          >
            {planeta.distancia_au?.toFixed(2)} AU
          </text>
        )}
      </g>
    );
  }

  // ── MODO 2D ────────────────────────────────────────────────────────────

  function render2D() {
    const sx = xEstrella2D();

    return (
      <g transform={transform}>
        {/* Línea eclíptica */}
        <line
          x1={sx - 20} y1={CENTER_Y}
          x2={xPlaneta2D(soloPlanetas[soloPlanetas.length - 1] ?? soloPlanetas[0]) + 70}
          y2={CENTER_Y}
          stroke="color-mix(in srgb, var(--primary) 5%, transparent)"
          strokeWidth={1} strokeDasharray="4 8"
        />

        {/* Ticks de AU debajo */}
        {[0.5, 1, 2, 5, 10, 20].map((au) => {
          const logD = Math.log1p(au);
          if (logD > maxDistLog) return null;
          const x = CENTER_X + (logD / maxDistLog) * (SVG_W / 2 - 70);
          return (
            <g key={au}>
              <line
                x1={x} y1={CENTER_Y + 2}
                x2={x} y2={CENTER_Y + 8}
                stroke="color-mix(in srgb, var(--primary) 14%, transparent)"
                strokeWidth={1}
              />
              <text
                x={x} y={CENTER_Y + 18}
                textAnchor="middle" fontSize={7}
                fill="color-mix(in srgb, var(--primary) 20%, transparent)"
                fontFamily="var(--font-mono, monospace)"
              >
                {au} AU
              </text>
            </g>
          );
        })}

        {/* Órbitas (líneas verticales delgadas hacia la eclíptica) */}
        {soloPlanetas.map((p) => {
          const px = xPlaneta2D(p);
          const r = escalarRadio(p.radio_km, p.tipo_cuerpo, allRadios);
          const orbitInc = (soloPlanetas.indexOf(p) % 3 - 1) * 10;
          const py = CENTER_Y + orbitInc;
          return (
            <line
              key={`tick-${p.id}`}
              x1={px} y1={CENTER_Y}
              x2={px} y2={py + r + 2}
              stroke={
                hoveredId === p.id
                  ? "color-mix(in srgb, var(--primary) 22%, transparent)"
                  : "color-mix(in srgb, var(--primary) 8%, transparent)"
              }
              strokeWidth={hoveredId === p.id ? 1.2 : 0.7}
              strokeDasharray="3 4"
              style={{ transition: "stroke 0.2s" }}
            />
          );
        })}

        {/* Estrella */}
        {renderEstrella(sx, CENTER_Y)}

        {/* Planetas */}
        {soloPlanetas.map((p, i) => {
          const px = xPlaneta2D(p);
          const orbitInc = (i % 3 - 1) * 10;
          return renderPlaneta(p, px, CENTER_Y + orbitInc);
        })}

        {/* Satélites */}
        {satelites.map((s, si) => {
          const padre = cuerpos.find((c) => c.id === s.cuerpo_principal_id);
          if (!padre || padre.tipo_cuerpo === "estrella") return null;
          const px = xPlaneta2D(padre as CuerpoConFisica);
          const padreIdx = soloPlanetas.indexOf(padre as CuerpoConFisica);
          const py = CENTER_Y + (padreIdx % 3 - 1) * 10;
          const angle = (si * 137.5 * Math.PI) / 180;
          const orbitR = escalarRadio(padre.radio_km, padre.tipo_cuerpo, allRadios) + 14;
          const lx = px + Math.cos(angle) * orbitR;
          const ly = py + Math.sin(angle) * orbitR * 0.5;
          const isHov = hoveredId === s.id;
          return (
            <g
              key={s.id} data-cuerpo="true"
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHoveredId(s.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => abrirPanel("planeta", s.id)}
            >
              <circle
                cx={lx} cy={ly}
                r={isHov ? MOON_R + 1.5 : MOON_R}
                fill={colorDeCuerpo(s)} opacity={isHov ? 1 : 0.65}
                style={{ transition: "r 0.15s" }}
              />
              {isHov && (
                <text
                  x={lx} y={ly - MOON_R - 4}
                  textAnchor="middle" fontSize={7}
                  fill="color-mix(in srgb, var(--primary) 60%, transparent)"
                  fontWeight="700" fontFamily="inherit"
                >
                  {s.nombre}
                </text>
              )}
            </g>
          );
        })}
      </g>
    );
  }

  // ── MODO 3D SIMULADO ───────────────────────────────────────────────────

  function render3D() {
    const sx = CENTER_X;
    const sy = CENTER_Y;

    // Ordenar planetas por z para pintar los más lejanos primero (painter's algorithm)
    const planetasConPos = soloPlanetas
      .filter((p) => p.distancia_au != null)
      .map((p) => ({ p, pos: pos3D(p) }))
      .sort((a, b) => a.pos.z - b.pos.z); // z negativo = "detrás"

    return (
      <g transform={transform}>
        {/* Plano del disco del sistema solar (elipse grande de fondo) */}
        <ellipse
          cx={sx} cy={sy}
          rx={(SVG_W / 2 - 60) * 0.98}
          ry={(SVG_W / 2 - 60) * 0.98 * 0.18}
          fill="none"
          stroke="color-mix(in srgb, var(--primary) 4%, transparent)"
          strokeWidth={1}
        />

        {/* Órbitas elípticas inclinadas */}
        {soloPlanetas.map((p) => {
          if (!p.distancia_au) return null;
          const logD = distanciasLog[p.id] ?? 0;
          const r = (logD / maxDistLog) * (SVG_W / 2 - 70);
          const inc = (p.inclinacion_grados * Math.PI) / 180;
          // Proyección de la elipse con inclinación
          const ry = r * Math.cos(inc) * 0.25;
          const isHov = hoveredId === p.id;
          return (
            <ellipse
              key={`orbit3d-${p.id}`}
              cx={sx} cy={sy}
              rx={r} ry={Math.max(ry, 4)}
              fill="none"
              stroke={
                isHov
                  ? "color-mix(in srgb, var(--primary) 22%, transparent)"
                  : "color-mix(in srgb, var(--primary) 8%, transparent)"
              }
              strokeWidth={isHov ? 1.2 : 0.7}
              strokeDasharray={isHov ? "none" : "4 6"}
              style={{ transition: "stroke 0.2s" }}
            />
          );
        })}

        {/* Estrella */}
        {renderEstrella(sx, sy)}

        {/* Planetas ordenados por z */}
        {planetasConPos.map(({ p, pos }) => {
          // Escala sutil por profundidad: planetas detrás ligeramente más pequeños
          const depthScale = 0.85 + 0.15 * ((pos.z + SVG_W / 2) / SVG_W);
          return renderPlaneta(p, pos.x, pos.y, depthScale);
        })}
      </g>
    );
  }

  // ── Layout ─────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden" style={{ background: "var(--bg-main)" }}>

      {/* Barra superior */}
      <div
        className="shrink-0 flex items-center justify-between px-6 py-3 border-b"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
      >
        <div className="flex items-center gap-2">
          <Globe size={13} className="text-primary/40" />
          <p className="text-micro font-black uppercase tracking-[0.18em] text-primary/40">
            Sistema Solar
          </p>
          <span className="text-micro text-primary/20 ml-2">
            {soloPlanetas.length} planeta{soloPlanetas.length !== 1 ? "s" : ""}
            {satelites.length > 0 && ` · ${satelites.length} satélite${satelites.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        <div className="flex items-center gap-2">

          {/* Selector de modo */}
          <div
            className="flex items-center gap-0.5 p-0.5 rounded-lg"
            style={{
              background: "color-mix(in srgb, var(--primary) 6%, transparent)",
              border: "var(--border-width) solid color-mix(in srgb, var(--primary) 10%, transparent)",
            }}
          >
            <button
              onClick={() => setModo("2d")}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-micro font-black uppercase tracking-widest transition-all"
              style={{
                background: modo === "2d" ? "color-mix(in srgb, var(--primary) 14%, transparent)" : "transparent",
                color: modo === "2d" ? "var(--primary)" : "color-mix(in srgb, var(--primary) 35%, transparent)",
              }}
            >
              <Globe size={11} />
              2D
            </button>
            <button
              onClick={() => { setModo("3d"); resetView(); }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-micro font-black uppercase tracking-widest transition-all"
              style={{
                background: modo === "3d" ? "color-mix(in srgb, var(--primary) 14%, transparent)" : "transparent",
                color: modo === "3d" ? "var(--primary)" : "color-mix(in srgb, var(--primary) 35%, transparent)",
              }}
            >
              <Orbit size={11} />
              3D
            </button>
          </div>

          <div className="w-px h-4 bg-primary/10" />

          {/* Zoom */}
          <button
            onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-primary/40 hover:text-primary hover:bg-primary/8 transition-colors"
            title="Acercar"
          >
            <ZoomIn size={13} />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-primary/40 hover:text-primary hover:bg-primary/8 transition-colors"
            title="Alejar"
          >
            <ZoomOut size={13} />
          </button>
          <button
            onClick={resetView}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-primary/40 hover:text-primary hover:bg-primary/8 transition-colors"
            title="Resetear vista"
          >
            <RotateCcw size={12} />
          </button>
          <span className="text-micro text-primary/20 w-8 text-center">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>

      {/* SVG */}
      <div
        className="flex-1 overflow-hidden relative"
        style={{ cursor: dragging ? "grabbing" : "grab" }}
        onWheel={onWheel}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full h-full select-none"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <defs>
            <filter id="glow-star" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-planet" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <radialGradient id="space-bg" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="color-mix(in srgb, var(--primary) 4%, var(--bg-main))" />
              <stop offset="100%" stopColor="var(--bg-main)" />
            </radialGradient>
          </defs>

          {/* Fondo fijo */}
          <rect x={0} y={0} width={SVG_W} height={SVG_H} fill="url(#space-bg)" />

          {/* Estrellas decorativas fijas */}
          {[
            [120,80],[340,40],[580,120],[760,60],[920,100],[1080,45],
            [200,380],[450,420],[700,390],[950,440],[1100,380],
            [60,200],[280,260],[510,180],[730,300],[1000,220],
          ].map(([sx,sy],i) => (
            <circle key={i} cx={sx} cy={sy}
              r={i % 2 === 0 ? 1 : 0.6}
              fill="color-mix(in srgb, var(--primary) 18%, transparent)"
            />
          ))}

          {modo === "2d" ? render2D() : render3D()}
        </svg>

        {/* Tooltip */}
        {hovered && hovered.descripcion && (
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none px-4 py-2.5 rounded-xl max-w-sm text-center"
            style={{
              background: "color-mix(in srgb, var(--bg-main) 95%, transparent)",
              border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <p className="text-micro font-black uppercase tracking-[0.12em] text-primary/40 mb-1">
              {hovered.nombre}
            </p>
            <p className="text-xs text-primary/55 font-light leading-relaxed line-clamp-2">
              {hovered.descripcion}
            </p>
          </div>
        )}

        {/* Hint */}
        {!hoveredId && (
          <p className="absolute top-3 right-4 text-micro text-primary/12 pointer-events-none">
            {modo === "3d" ? "Órbitas animadas · " : ""}Arrastrá · scroll zoom · click para detalles
          </p>
        )}
      </div>
    </div>
  );
}
